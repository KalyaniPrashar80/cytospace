import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { MEMBRANE_RADIUS, type HotspotId } from "../content";
import { PAL } from "../palette";
import { mulberry32 } from "../rng";
import { live } from "../store";
import { Anchor } from "./Anchor";
import { makeGlowMaterial, makeMembraneMaterial, makeParticleMaterial } from "./shaders";
import { randomInSphere } from "./helpers";

const NUCLEUS_R = 2.2;
const CENTROSOME = new THREE.Vector3(1.7, -2.6, 1.5);
const GOLGI_POS = new THREE.Vector3(-3.9, -1.3, 2.4);

/* ---------- procedural cell layout (seeded so it never changes) ---------- */

function buildMicrotubules(rng: () => number) {
  const curves: THREE.CatmullRomCurve3[] = [];
  const dirs = [new THREE.Vector3(0.55, 0.62, 0.7).normalize()];
  while (dirs.length < 18) dirs.push(randomInSphere(rng, 1, 1).normalize());
  for (const dir of dirs) {
    const end = dir.clone().multiplyScalar(8.9);
    const pts = [CENTROSOME.clone()];
    for (const f of [0.3, 0.6]) {
      const p = CENTROSOME.clone().lerp(end, f);
      p.add(randomInSphere(rng, 0, 0.6));
      if (p.length() < NUCLEUS_R + 1.1) p.setLength(NUCLEUS_R + 1.1);
      pts.push(p);
    }
    pts.push(end);
    curves.push(new THREE.CatmullRomCurve3(pts));
  }
  const geo = mergeGeometries(curves.map((c) => new THREE.TubeGeometry(c, 60, 0.035, 5, false)));
  return { curves, geo };
}

function erPoint(s: { r0: number; a: number; b: number; phi: number; w: number; ph: number }, u: number, v: number, out: THREE.Vector3) {
  const th = s.a + (s.b - s.a) * u;
  const phi = s.phi + (v - 0.5) * s.w;
  const r = s.r0 + 0.2 * Math.sin(u * 22 + s.ph) + 0.08 * Math.sin(v * 9 + u * 7 + s.ph);
  return out.set(Math.sin(phi) * Math.cos(th) * r, Math.cos(phi) * r, Math.sin(phi) * Math.sin(th) * r);
}

function buildER(rng: () => number) {
  const sheets: { r0: number; a: number; b: number; phi: number; w: number; ph: number }[] = [];
  for (let i = 0; i < 11; i++) {
    const a = -0.6 + rng() * 2.2;
    sheets.push({ r0: 2.7 + (i % 5) * 0.38, a, b: a + 1.4 + rng() * 1.2, phi: 0.9 + rng() * 1.4, w: 0.16 + rng() * 0.14, ph: rng() * 6 });
  }

  const v = new THREE.Vector3();
  const geos = sheets.map((s) => {
    const g = new THREE.PlaneGeometry(1, 1, 80, 12);
    const pos = g.attributes['position']!;
    for (let i = 0; i < pos.count; i++) {
      erPoint(s, pos.getX(i) + 0.5, pos.getY(i) + 0.5, v);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    return g;
  });
  const ribo: THREE.Vector3[] = [];
  sheets.forEach((s) => {
    for (let i = 0; i < 70; i++) {
      const p = erPoint(s, rng(), rng(), new THREE.Vector3());
      p.setLength(p.length() + (rng() > 0.5 ? 0.06 : -0.06));
      ribo.push(p);
    }
  });
  for (let i = 0; i < 220; i++) {
    const p = randomInSphere(rng, NUCLEUS_R + 0.5, 8.6);
    ribo.push(p);
  }
  const hotspot = erPoint(sheets[10]!, 0.5, 0.5, new THREE.Vector3());
  hotspot.setLength(hotspot.length() + 0.18);
  return { geo: mergeGeometries(geos), ribo, hotspot };
}

function bentPancake(len: number, width: number, thick: number, bend: number) {
  const g = new THREE.SphereGeometry(1, 40, 14);
  const p = g.attributes['position']!;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) * len;
    const y = p.getY(i) * width;
    const z = p.getZ(i) * thick - bend * x * x;
    p.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  return g;
}

function buildMitochondria(rng: () => number) {
  const out: { pos: THREE.Vector3; quat: THREE.Quaternion; phase: number; scale: number }[] = [];
  out.push({
    pos: new THREE.Vector3(3.6, -0.6, 4.0),
    quat: new THREE.Quaternion().setFromEuler(new THREE.Euler(0.3, 0.2, 1.2)),
    phase: 0,
    scale: 1.15,
  });
  let guard = 0;
  while (out.length < 8 && guard++ < 500) {
    const p = randomInSphere(rng, 4.4, 6.4);
    if (p.distanceTo(GOLGI_POS) < 2.4) continue;
    if (out.some((m) => m.pos.distanceTo(p) < 2.1)) continue;
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rng() * 6, rng() * 6, rng() * 6));
    out.push({ pos: p, quat: q, phase: rng() * 10, scale: 0.85 + rng() * 0.35 });
  }
  const cristaePts: THREE.Vector3[] = [];
  for (let k = 0; k <= 12; k++) cristaePts.push(new THREE.Vector3(k % 2 ? 0.26 : -0.26, -0.82 + k * 0.137, 0));
  const cristae = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cristaePts), 120, 0.055, 6, false);
  return { list: out, cristae };
}

/* ---------- components ---------- */

function Membrane() {
  const mat = useMemo(() => makeMembraneMaterial(), []);
  const halo = useMemo(() => makeGlowMaterial(PAL.pink, 0.35, 3.0), []);
  const camera = useThree((s) => s.camera);
  useFrame(() => {
    mat.uniforms['uTime']!.value = live.time;
    const d = camera.position.length();
    const far = THREE.MathUtils.smoothstep(d, 40, 260);
    mat.uniforms['uFar']!.value = far;
    halo.uniforms['uIntensity']!.value = 0.15 + far * 0.6;
  });
  return (
    <>
      <mesh material={mat} renderOrder={5}>
        <sphereGeometry args={[MEMBRANE_RADIUS, 96, 64]} />
      </mesh>
      <mesh material={halo} renderOrder={6}>
        <sphereGeometry args={[MEMBRANE_RADIUS * 1.25, 48, 32]} />
      </mesh>
    </>
  );
}

function Nucleus() {
  const glow = useMemo(() => makeGlowMaterial(PAL.lavender, 0.8, 1.6), []);
  const coreRef = useRef<THREE.MeshStandardMaterial>(null);
  const pores = useMemo(() => {
    const rng = mulberry32(7);
    const m = new THREE.Matrix4();
    const arr: THREE.Matrix4[] = [];
    for (let i = 0; i < 160; i++) {
      const p = randomInSphere(rng, 1, 1).setLength(NUCLEUS_R + 0.02);
      arr.push(m.clone().makeTranslation(p.x, p.y, p.z));
    }
    return arr;
  }, []);
  const poreRef = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    pores.forEach((m, i) => poreRef.current?.setMatrixAt(i, m));
    if (poreRef.current) poreRef.current.instanceMatrix.needsUpdate = true;
  }, [pores]);
  useFrame(() => {
    const b = 0.5 + 0.5 * Math.sin(live.time * 1.4);
    glow.uniforms['uIntensity']!.value = 0.6 + b * 0.45;
    if (coreRef.current) coreRef.current.emissiveIntensity = 0.55 + b * 0.35;
  });
  return (
    <group>
      <mesh position={[0.5, 0.35, 0.6]}>
        <sphereGeometry args={[0.75, 32, 24]} />
        <meshStandardMaterial color={PAL.lavenderDeep} emissive={PAL.pink} emissiveIntensity={0.35} roughness={0.5} />
      </mesh>
      <mesh renderOrder={2}>
        <sphereGeometry args={[NUCLEUS_R - 0.12, 48, 32]} />
        <meshStandardMaterial
          ref={coreRef}
          color={PAL.lavenderSoft}
          emissive={PAL.lavender}
          emissiveIntensity={0.4}
          transparent
          opacity={0.55}
          depthWrite={false}
        />
      </mesh>
      <mesh renderOrder={3}>
        <sphereGeometry args={[NUCLEUS_R, 64, 48]} />
        <meshPhysicalMaterial
          color={PAL.lavender}
          roughness={0.25}
          clearcoat={1}
          transparent
          opacity={0.5}
          depthWrite={false}
        />
      </mesh>
      <instancedMesh ref={poreRef} args={[undefined, undefined, pores.length]}>
        <sphereGeometry args={[0.055, 8, 6]} />
        <meshStandardMaterial color={PAL.white} emissive={PAL.lavender} emissiveIntensity={0.5} />
      </instancedMesh>
      <mesh material={glow} renderOrder={4}>
        <sphereGeometry args={[NUCLEUS_R * 1.45, 48, 32]} />
      </mesh>
    </group>
  );
}

function InstancedPoints({ points, radius, color, emissive = 0 }: { points: THREE.Vector3[]; radius: number; color: string; emissive?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const m = new THREE.Matrix4();
    points.forEach((p, i) => ref.current?.setMatrixAt(i, m.makeTranslation(p.x, p.y, p.z)));
    if (ref.current) ref.current.instanceMatrix.needsUpdate = true;
  }, [points]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, points.length]}>
      <sphereGeometry args={[radius, 8, 6]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={emissive} roughness={0.4} />
    </instancedMesh>
  );
}

function Golgi() {
  const geos = useMemo(
    () => [0, 1, 2, 3, 4, 5].map((i) => bentPancake(1.55 - i * 0.12, 0.62 - i * 0.03, 0.08, 0.22 + i * 0.03)),
    [],
  );
  const group = useRef<THREE.Group>(null);
  const vesicles = useMemo(() => {
    const rng = mulberry32(31);
    return Array.from({ length: 12 }, () => ({
      base: new THREE.Vector3((rng() - 0.5) * 3.6, (rng() - 0.5) * 1.6, rng() * 1.6 - 0.2),
      ph: rng() * 6,
      r: 0.07 + rng() * 0.08,
      pink: rng() > 0.5,
    }));
  }, []);
  const vRefs = useRef<(THREE.Mesh | null)[]>([]);
  useEffect(() => {
    group.current?.lookAt(0, 0, 0);
  }, []);
  useFrame(() => {
    const t = live.time;
    vesicles.forEach((v, i) => {
      const m = vRefs.current[i];
      if (!m) return;
      m.position.set(v.base.x + Math.sin(t * 0.6 + v.ph) * 0.15, v.base.y + Math.cos(t * 0.5 + v.ph) * 0.12, v.base.z);
    });
  });
  return (
    <group ref={group} position={GOLGI_POS}>
      {geos.map((g, i) => (
        <mesh key={i} geometry={g} position={[0, 0, i * 0.24]}>
          <meshPhysicalMaterial color={i % 2 ? PAL.mint : PAL.mintSoft} roughness={0.35} clearcoat={0.8} emissive={PAL.mint} emissiveIntensity={0.12} />
        </mesh>
      ))}
      {vesicles.map((v, i) => (
        <mesh key={i} ref={(el) => {
            vRefs.current[i] = el;
          }} position={v.base}>
          <sphereGeometry args={[v.r, 14, 10]} />
          <meshPhysicalMaterial color={v.pink ? PAL.pinkSoft : PAL.mint} roughness={0.2} clearcoat={1} />
        </mesh>
      ))}
    </group>
  );
}

function Mitochondria({ list, cristae }: ReturnType<typeof buildMitochondria>) {
  const refs = useRef<(THREE.Group | null)[]>([]);
  useFrame(() => {
    const t = live.time;
    list.forEach((m, i) => {
      const g = refs.current[i];
      if (!g || i === 0) return;
      g.position.set(m.pos.x + Math.sin(t * 0.3 + m.phase) * 0.18, m.pos.y + Math.cos(t * 0.25 + m.phase) * 0.15, m.pos.z);
      g.rotation.z = Math.sin(t * 0.2 + m.phase) * 0.15;
    });
  });
  return (
    <>
      {list.map((m, i) => (
        <group key={i} position={m.pos} quaternion={m.quat} scale={m.scale}>
          <group ref={(el) => {
            refs.current[i] = el;
          }}>
            <mesh geometry={cristae}>
              <meshStandardMaterial color={PAL.mintDeep} roughness={0.5} />
            </mesh>
            <mesh geometry={cristae} rotation={[0, Math.PI / 2, 0]}>
              <meshStandardMaterial color={PAL.mintDeep} roughness={0.5} />
            </mesh>
            <mesh renderOrder={1}>
              <capsuleGeometry args={[0.44, 1.3, 8, 20]} />
              <meshPhysicalMaterial color={PAL.mint} roughness={0.2} clearcoat={1} transparent opacity={0.55} depthWrite={false} emissive={PAL.mint} emissiveIntensity={0.15} />
            </mesh>
          </group>
        </group>
      ))}
    </>
  );
}

function Microtubules({ curves, geo }: ReturnType<typeof buildMicrotubules>) {
  const cargo = useMemo(() => {
    const rng = mulberry32(99);
    return Array.from({ length: 12 }, (_, i) => ({ c: curves[(i * 5) % curves.length], off: rng(), sp: 0.03 + rng() * 0.03 }));
  }, [curves]);
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const p = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    cargo.forEach((c, i) => {
      const m = refs.current[i];
      if (!m) return;
      const u = (live.time * c.sp + c.off) % 1;
      c.c!.getPointAt(0.08 + u * 0.88, p);
      m.position.copy(p);
      m.scale.setScalar(Math.sin(Math.PI * u) * 0.9 + 0.1);
    });
  });
  return (
    <>
      <mesh geometry={geo}>
        <meshStandardMaterial color={PAL.lavenderSoft} emissive={PAL.lavender} emissiveIntensity={0.45} roughness={0.4} />
      </mesh>
      <group position={CENTROSOME}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.12, 0.12, 0.45, 12]} />
          <meshStandardMaterial color={PAL.lavenderDeep} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.12, 0.12, 0.45, 12]} />
          <meshStandardMaterial color={PAL.lavenderDeep} />
        </mesh>
      </group>
      {cargo.map((_, i) => (
        <mesh key={i} ref={(el) => {
            refs.current[i] = el;
          }}>
          <sphereGeometry args={[0.16, 16, 12]} />
          <meshPhysicalMaterial color={PAL.pinkSoft} roughness={0.15} clearcoat={1} transparent opacity={0.85} />
        </mesh>
      ))}
    </>
  );
}

function Proteins() {
  const COUNT = 340;
  const data = useMemo(() => {
    const rng = mulberry32(5);
    const cols = [PAL.pink, PAL.lavender, PAL.mint, PAL.peach, PAL.white, PAL.pinkSoft];
    return Array.from({ length: COUNT }, () => ({
      base: randomInSphere(rng, NUCLEUS_R + 0.6, 8.8),
      s: 0.05 + rng() * 0.09,
      w: 0.03 + rng() * 0.05,
      ph: rng() * 20,
      col: new THREE.Color(cols[Math.floor(rng() * cols.length)]!),
    }));
  }, []);
  const ref = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    data.forEach((d, i) => ref.current?.setColorAt(i, d.col));
    if (ref.current?.instanceColor) ref.current.instanceColor.needsUpdate = true;
  }, [data]);
  const o = useMemo(() => new THREE.Object3D(), []);
  useFrame(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const t = live.time;
    for (let i = 0; i < COUNT; i++) {
      const d = data[i]!;
      const a = t * d.w;
      const c = Math.cos(a), s = Math.sin(a);
      o.position.set(
        d.base.x * c - d.base.z * s + Math.sin(t * 1.3 + d.ph) * 0.2,
        d.base.y + Math.sin(t * 1.1 + d.ph * 1.3) * 0.2,
        d.base.x * s + d.base.z * c + Math.sin(t * 0.9 + d.ph * 0.7) * 0.2,
      );
      o.rotation.set(t * 0.5 + d.ph, t * 0.3 + d.ph, 0);
      o.scale.setScalar(d.s);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, COUNT]}>
      <icosahedronGeometry args={[1, 1]} />
      <meshPhysicalMaterial roughness={0.3} clearcoat={0.6} />
    </instancedMesh>
  );
}

function Particles() {
  const COUNT = 3400;
  const { geo, mat } = useMemo(() => {
    const rng = mulberry32(11);
    const pos = new Float32Array(COUNT * 3);
    const seed = new Float32Array(COUNT * 4);
    const col = new Float32Array(COUNT * 3);
    const cols = [PAL.pink, PAL.lavenderDeep, PAL.mintDeep, PAL.mauveSoft, PAL.pinkSoft].map((c) => new THREE.Color(c));
    const v = new THREE.Vector3();
    for (let i = 0; i < COUNT; i++) {
      randomInSphere(rng, NUCLEUS_R + 0.3, 9.4, v);
      pos.set([v.x, v.y, v.z], i * 3);
      seed.set([rng(), rng(), rng(), rng()], i * 4);
      const c = cols[Math.floor(rng() * cols.length)]!;
      col.set([c.r, c.g, c.b], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 4));
    g.setAttribute("aColor", new THREE.BufferAttribute(col, 3));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 10);
    return { geo: g, mat: makeParticleMaterial(9.4) };
  }, []);
  const dpr = useThree((s) => s.viewport.dpr);
  useFrame(() => {
    mat.uniforms['uTime']!.value = live.time;
    mat.uniforms['uPixelRatio']!.value = dpr;
  });
  return <points geometry={geo} material={mat} renderOrder={7} />;
}

function MembraneReceptors({ hotspot }: { hotspot: THREE.Vector3 }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const rng = mulberry32(17);
    const o = new THREE.Object3D();
    const up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < 34; i++) {
      const d = i === 0 ? hotspot.clone().normalize() : randomInSphere(rng, 1, 1).normalize();
      o.position.copy(d).multiplyScalar(MEMBRANE_RADIUS - 0.12);
      o.quaternion.setFromUnitVectors(up, d);
      o.scale.setScalar(i === 0 ? 1.4 : 0.8 + rng() * 0.4);
      o.updateMatrix();
      ref.current?.setMatrixAt(i, o.matrix);
    }
    if (ref.current) ref.current.instanceMatrix.needsUpdate = true;
  }, [hotspot]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, 34]}>
      <capsuleGeometry args={[0.08, 0.28, 4, 8]} />
      <meshStandardMaterial color={PAL.lavenderDeep} emissive={PAL.lavender} emissiveIntensity={0.4} />
    </instancedMesh>
  );
}

export function Cell() {
  const built = useMemo(() => {
    const rng = mulberry32(2026);
    const mts = buildMicrotubules(rng);
    const er = buildER(rng);
    const mitos = buildMitochondria(rng);
    const receptor = new THREE.Vector3(-0.45, 0.35, -0.82).normalize().multiplyScalar(MEMBRANE_RADIUS - 0.15);
    const kinesin = mts.curves[0]!.getPointAt(0.55);
    const atp = mitos.list[0]!.pos.clone().add(new THREE.Vector3(0, 0, 0.55));
    return { mts, er, mitos, spots: { kinesin, ribosome: er.hotspot, atp, receptor } as Record<HotspotId, THREE.Vector3> };
  }, []);

  useEffect(() => {
    (Object.keys(built.spots) as HotspotId[]).forEach((k) => {
      const v = built.spots[k];
      live.hotspotLocal[k] = [v.x, v.y, v.z];
    });
  }, [built]);

  const flattener = useRef<THREE.Group>(null);
  const root = useRef<THREE.Group>(null);
  useEffect(() => {
    live.cellGroup = root.current;
    return () => {
      live.cellGroup = null;
    };
  }, []);

  useFrame(() => {
    const f = flattener.current;
    if (!f) return;
    f.visible = live.displayed === null;
    const flat = live.flat;
    f.scale.set(1 + flat * 0.05, 1 + flat * 0.05, 1 - flat * 0.94);
  });

  return (
    <group ref={flattener}>
      <group ref={root} rotation={[0.15, -0.5, 0]}>
        <Nucleus />
        <mesh geometry={built.er.geo}>
          <meshPhysicalMaterial color={PAL.pinkSoft} side={THREE.DoubleSide} roughness={0.35} clearcoat={0.7} emissive={PAL.pink} emissiveIntensity={0.1} transparent opacity={0.82} depthWrite={false} />
        </mesh>
        <InstancedPoints points={built.er.ribo} radius={0.045} color={PAL.pink} emissive={0.25} />
        <Golgi />
        <Mitochondria {...built.mitos} />
        <Microtubules {...built.mts} />
        <MembraneReceptors hotspot={built.spots.receptor} />
        <Proteins />
        <Particles />
        <Membrane />
        {(Object.keys(built.spots) as HotspotId[]).map((id) => (
          <Anchor key={id} id={`spot:${id}`} position={built.spots[id]} />
        ))}
      </group>
    </group>
  );
}
