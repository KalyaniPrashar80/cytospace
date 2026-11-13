import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import type { HotspotId } from "../content";
import { PAL } from "../palette";
import { mulberry32 } from "../rng";
import { live } from "../store";
import { makeBackdropMaterial } from "./shaders";
import { frac, smooth, spanBetween } from "./helpers";

export const LENS_ORIGIN = new THREE.Vector3(0, 600, 0);
/** Size of each close-up so the camera can frame it on any screen shape. */
export const LENS_FRAMES: Record<HotspotId, { w: number; h: number; cy: number }> = {
  kinesin: { w: 4.6, h: 3.6, cy: 0.95 },
  ribosome: { w: 5.0, h: 3.8, cy: 0.45 },
  atp: { w: 4.4, h: 3.8, cy: 0.35 },
  receptor: { w: 4.0, h: 5.6, cy: -0.5 },
};

function Tag({ position, children }: { position: [number, number, number]; children: ReactNode }) {
  const group = useRef<THREE.Group>(null);
  const span = useRef<HTMLSpanElement>(null);
  useFrame(() => {
    let o: THREE.Object3D | null = group.current;
    let vis = true;
    while (o) {
      if (!o.visible) {
        vis = false;
        break;
      }
      o = o.parent;
    }
    if (span.current) span.current.style.display = vis && !live.transitioning ? "inline-block" : "none";
  });
  return (
    <group ref={group} position={position}>
      <Html center zIndexRange={[5, 0]} style={{ pointerEvents: "none" }}>
        <span ref={span} className="glass hidden whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-medium text-foreground">
          {children}
        </span>
      </Html>
    </group>
  );
}

function useActive(id: HotspotId) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (ref.current) ref.current.visible = live.displayed === id;
  });
  return ref;
}

const glossy = (color: string, emissive = 0.08) => (
  <meshPhysicalMaterial color={color} roughness={0.28} clearcoat={1} clearcoatRoughness={0.2} emissive={color} emissiveIntensity={emissive} />
);

/* ---------------- Kinesin walking a microtubule ---------------- */

const STEP = 0.48; // visual step length (6 tubulin rings)
const RING = 0.08;

function Kinesin() {
  const root = useActive("kinesin");
  const RINGS = 140;
  const PF = 13;
  const track = useRef<THREE.Group>(null);
  const tubulin = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const m = tubulin.current;
    if (!m) return;
    const o = new THREE.Object3D();
    const a = new THREE.Color(PAL.lavender);
    const b = new THREE.Color(PAL.lavenderSoft);
    let i = 0;
    for (let r = 0; r < RINGS; r++) {
      for (let p = 0; p < PF; p++) {
        const ang = (p / PF) * Math.PI * 2 + r * 0.06;
        o.position.set((r - RINGS / 2) * RING, Math.cos(ang) * 0.27, Math.sin(ang) * 0.27);
        o.scale.setScalar(1);
        o.updateMatrix();
        m.setMatrixAt(i, o.matrix);
        m.setColorAt(i, r % 2 ? a : b);
        i++;
      }
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, []);

  const footA = useRef<THREE.Mesh>(null);
  const footB = useRef<THREE.Mesh>(null);
  const legA = useRef<THREE.Mesh>(null);
  const legB = useRef<THREE.Mesh>(null);
  const stalk = useRef<THREE.Mesh>(null);
  const cargo = useRef<THREE.Group>(null);
  const atp = useRef<THREE.Mesh>(null);
  const v = useMemo(() => ({ a: new THREE.Vector3(), b: new THREE.Vector3(), hip: new THREE.Vector3(), top: new THREE.Vector3() }), []);

  useFrame(() => {
    if (!root.current?.visible) return;
    const s = live.time * 0.9;
    const n = Math.floor(s);
    const f = smooth(0.22, 0.85, frac(s));
    const base = n * STEP;
    const moving = base + 2 * STEP * f;
    const still = base + STEP;
    const center = (moving + still) / 2;
    const lift = Math.sin(Math.PI * f) * 0.42;
    const mA = n % 2 === 0;
    const xa = (mA ? moving : still) - center;
    const xb = (mA ? still : moving) - center;
    const ya = 0.4 + (mA ? lift : 0);
    const yb = 0.4 + (mA ? 0 : lift);
    footA.current?.position.set(xa, ya, mA ? 0.06 : -0.06);
    footB.current?.position.set(xb, yb, mA ? -0.06 : 0.06);
    if (track.current) track.current.position.x = -(((center % (RING * 2)) + RING * 2) % (RING * 2));
    const sway = Math.sin(s * Math.PI * 2) * 0.05;
    v.hip.set(sway, 1.05, 0);
    v.a.set(xa, ya + 0.1, 0);
    v.b.set(xb, yb + 0.1, 0);
    if (legA.current) spanBetween(legA.current, v.a, v.hip);
    if (legB.current) spanBetween(legB.current, v.b, v.hip);
    v.top.set(-0.12 + sway * 2, 1.95, 0);
    if (stalk.current) spanBetween(stalk.current, v.hip, v.top);
    if (cargo.current) {
      cargo.current.position.set(-0.25 + sway * 3, 2.45 + Math.sin(s * Math.PI * 2 + 1) * 0.03, 0);
      cargo.current.rotation.z = sway;
    }
    // one ATP flies in to the planted foot at the start of each step
    const u = frac(s);
    if (atp.current) {
      const k = smooth(0, 0.22, u);
      const tx = mA ? xb : xa;
      atp.current.position.set(THREE.MathUtils.lerp(1.8, tx, k), THREE.MathUtils.lerp(1.5, 0.55, k), 0.25);
      atp.current.scale.setScalar(u < 0.24 ? 1 : Math.max(0, 1 - (u - 0.24) * 8));
    }
  });

  return (
    <group ref={root}>
      <group ref={track}>
        <instancedMesh ref={tubulin} args={[undefined, undefined, RINGS * PF]}>
          <sphereGeometry args={[0.052, 10, 8]} />
          <meshStandardMaterial roughness={0.45} />
        </instancedMesh>
      </group>
      <mesh ref={footA}>
        <sphereGeometry args={[0.17, 24, 16]} />
        {glossy(PAL.pink, 0.15)}
      </mesh>
      <mesh ref={footB}>
        <sphereGeometry args={[0.17, 24, 16]} />
        {glossy(PAL.pinkSoft, 0.15)}
      </mesh>
      <mesh ref={legA}>
        <cylinderGeometry args={[0.04, 0.04, 1, 8]} />
        {glossy(PAL.pink)}
      </mesh>
      <mesh ref={legB}>
        <cylinderGeometry args={[0.04, 0.04, 1, 8]} />
        {glossy(PAL.pinkSoft)}
      </mesh>
      <mesh ref={stalk}>
        <cylinderGeometry args={[0.035, 0.035, 1, 8]} />
        {glossy(PAL.mauveSoft)}
      </mesh>
      <group ref={cargo}>
        <mesh>
          <sphereGeometry args={[0.55, 40, 28]} />
          <meshPhysicalMaterial color={PAL.mint} roughness={0.1} clearcoat={1} transparent opacity={0.6} depthWrite={false} />
        </mesh>
        {[[0.15, 0.1, 0.1], [-0.18, -0.05, 0.12], [0.02, -0.2, -0.1], [-0.05, 0.22, -0.12]].map((p, i) => (
          <mesh key={i} position={p as [number, number, number]}>
            <icosahedronGeometry args={[0.1, 1]} />
            {glossy(i % 2 ? PAL.lavender : PAL.pink)}
          </mesh>
        ))}
      </group>
      <mesh ref={atp}>
        <sphereGeometry args={[0.09, 16, 12]} />
        <meshStandardMaterial color={PAL.white} emissive={PAL.pink} emissiveIntensity={1.2} />
      </mesh>
      <Tag position={[0, -0.6, 0]}>← 8 nm per step →</Tag>
      <Tag position={[-1.2, 2.9, 0]}>cargo</Tag>
      <Tag position={[1.9, 1.85, 0]}>ATP</Tag>
    </group>
  );
}

/* ---------------- Ribosome translating mRNA ---------------- */

const NT = 0.12;
const N_BEADS = 72;
const CHAIN_MAX = 24;

function Ribosome() {
  const root = useActive("ribosome");
  const rna = useRef<THREE.InstancedMesh>(null);
  const chain = useRef<THREE.InstancedMesh>(null);
  const trna = useRef<THREE.Group>(null);
  const baseCols = useMemo(() => [PAL.pink, PAL.mint, PAL.lavenderDeep, PAL.peach].map((c) => new THREE.Color(c)), []);
  const aaCols = useMemo(() => [PAL.pink, PAL.mintDeep, PAL.lavenderDeep, PAL.peach, PAL.pinkSoft].map((c) => new THREE.Color(c)), []);
  const seq = useMemo(() => {
    const r = mulberry32(3);
    return Array.from({ length: N_BEADS }, () => Math.floor(r() * 4));
  }, []);
  const o = useMemo(() => new THREE.Object3D(), []);
  const span = N_BEADS * NT;

  useFrame(() => {
    if (!root.current?.visible || !rna.current || !chain.current) return;
    const t = live.time;
    const off = t * 0.32;
    for (let i = 0; i < N_BEADS; i++) {
      let x = i * NT - (off % span);
      if (x < -span / 2) x += span;
      const k = Math.floor((off - (off % span)) / span);
      const fade = smooth(span / 2, span / 2 - 0.8, Math.abs(x));
      o.position.set(x, -0.62 + Math.sin(x * 1.6 + t) * 0.06 * smooth(0.6, 1.4, Math.abs(x)), 0.05);
      o.scale.setScalar(0.001 + fade);
      o.updateMatrix();
      rna.current.setMatrixAt(i, o.matrix);
      rna.current.setColorAt(i, baseCols[seq[(i + k * 7) % N_BEADS]!]!);
    }
    rna.current.instanceMatrix.needsUpdate = true;
    if (rna.current.instanceColor) rna.current.instanceColor.needsUpdate = true;

    const codon = off / (NT * 3);
    const read = Math.floor(codon);
    const len = (read % CHAIN_MAX) + 1;
    const ph = frac(codon);
    for (let k = 0; k < CHAIN_MAX; k++) {
      if (k >= len) {
        o.scale.setScalar(0.0001);
      } else {
        const sPos = (k + ph) * 0.19;
        const ang = sPos * 2.1 + t * 0.4;
        const rr = Math.min(0.45, sPos * 0.22);
        o.position.set(0.55 + Math.cos(ang) * rr + sPos * 0.12, 0.95 + sPos * 0.42, Math.sin(ang) * rr);
        o.position.y += Math.sin(t * 2 + k) * 0.03;
        o.scale.setScalar(k === 0 ? 0.6 + ph * 0.4 : 1);
      }
      o.updateMatrix();
      chain.current.setMatrixAt(k, o.matrix);
      chain.current.setColorAt(k, aaCols[(read - k + 1000) % aaCols.length]!);
    }
    chain.current.instanceMatrix.needsUpdate = true;
    if (chain.current.instanceColor) chain.current.instanceColor.needsUpdate = true;

    if (trna.current) {
      const e = smooth(0, 0.7, ph);
      trna.current.position.set(THREE.MathUtils.lerp(-2.0, -0.05, e), THREE.MathUtils.lerp(1.9, 0.05, e), THREE.MathUtils.lerp(0.9, 0.45, e));
      trna.current.rotation.z = (1 - e) * 0.8;
      trna.current.scale.setScalar(ph > 0.85 ? Math.max(0.001, 1 - (ph - 0.85) * 6.6) : 1);
    }
  });

  return (
    <group ref={root}>
      <instancedMesh ref={rna} args={[undefined, undefined, N_BEADS]}>
        <sphereGeometry args={[0.06, 12, 8]} />
        <meshStandardMaterial roughness={0.4} />
      </instancedMesh>
      <mesh position={[0, -0.78, 0]} scale={[1.05, 0.42, 0.78]}>
        <sphereGeometry args={[1, 40, 28]} />
        {glossy(PAL.lavender)}
      </mesh>
      <mesh position={[0, 0.18, -0.05]} scale={[1.25, 0.78, 0.95]}>
        <sphereGeometry args={[1, 40, 28]} />
        {glossy(PAL.pinkSoft)}
      </mesh>
      <instancedMesh ref={chain} args={[undefined, undefined, CHAIN_MAX]}>
        <icosahedronGeometry args={[0.1, 1]} />
        <meshPhysicalMaterial roughness={0.25} clearcoat={1} />
      </instancedMesh>
      <group ref={trna}>
        <mesh>
          <capsuleGeometry args={[0.07, 0.4, 4, 10]} />
          {glossy(PAL.mint)}
        </mesh>
        <mesh position={[0.16, 0.24, 0]} rotation={[0, 0, Math.PI / 2]}>
          <capsuleGeometry args={[0.07, 0.25, 4, 10]} />
          {glossy(PAL.mint)}
        </mesh>
        <mesh position={[0.3, 0.26, 0]}>
          <icosahedronGeometry args={[0.1, 1]} />
          {glossy(PAL.peach)}
        </mesh>
      </group>
      <Tag position={[-2.0, -1.05, 0]}>mRNA</Tag>
      <Tag position={[1.6, 2.6, 0]}>protein chain</Tag>
      <Tag position={[-1.9, 2.2, 0]}>tRNA</Tag>
    </group>
  );
}

/* ---------------- Shared lipid bilayer ---------------- */

function Bilayer({ hole = 0.7, w = 6, d = 3.2 }: { hole?: number; w?: number; d?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const pts = useMemo(() => {
    const arr: [number, number, number][] = [];
    for (const y of [0.32, -0.32])
      for (let x = -w / 2; x <= w / 2; x += 0.2)
        for (let z = -d / 2; z <= d / 2; z += 0.2) {
          const ox = x + (Math.round(z * 5) % 2 ? 0.1 : 0);
          if (Math.hypot(ox, z) < hole) continue;
          arr.push([ox, y, z]);
        }
    return arr;
  }, [hole, w, d]);
  useEffect(() => {
    const m = new THREE.Matrix4();
    pts.forEach((p, i) => ref.current?.setMatrixAt(i, m.makeTranslation(p[0], p[1], p[2])));
    if (ref.current) ref.current.instanceMatrix.needsUpdate = true;
  }, [pts]);
  return (
    <group>
      <instancedMesh ref={ref} args={[undefined, undefined, pts.length]}>
        <sphereGeometry args={[0.095, 10, 8]} />
        <meshStandardMaterial color={PAL.pinkSoft} roughness={0.5} />
      </instancedMesh>
      <mesh>
        <boxGeometry args={[w + 0.1, 0.5, d + 0.1]} />
        <meshStandardMaterial color={PAL.peach} transparent opacity={0.45} depthWrite={false} />
      </mesh>
    </group>
  );
}

/* ---------------- ATP synthase motor ---------------- */

function AtpSynthase() {
  const root = useActive("atp");
  const rotor = useRef<THREE.Group>(null);
  const protons = useRef<(THREE.Mesh | null)[]>([]);
  const atps = useRef<(THREE.Mesh | null)[]>([]);
  const head = useRef<THREE.Group>(null);
  const stator = useMemo(
    () =>
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([new THREE.Vector3(1.0, -0.2, 0), new THREE.Vector3(1.05, 0.8, 0), new THREE.Vector3(0.85, 1.7, 0), new THREE.Vector3(0.45, 2.05, 0)]),
        40,
        0.06,
        8,
      ),
    [],
  );
  const pData = useMemo(() => {
    const r = mulberry32(8);
    return Array.from({ length: 12 }, (_, i) => ({ off: i / 12, x: (r() - 0.5) * 2.6, z: (r() - 0.5) * 1.6, ang: r() * 6.28 }));
  }, []);
  useFrame(() => {
    if (!root.current?.visible) return;
    const t = live.time;
    const angle = t * 2.4;
    if (rotor.current) rotor.current.rotation.y = angle;
    if (head.current) head.current.rotation.z = Math.sin(t * 2.4) * 0.015;
    pData.forEach((p, i) => {
      const m = protons.current[i];
      if (!m) return;
      const u = frac(t * 0.28 + p.off);
      const a = p.ang + angle;
      if (u < 0.4) {
        const k = smooth(0, 0.4, u);
        m.position.set(THREE.MathUtils.lerp(p.x, Math.cos(a) * 0.5, k), THREE.MathUtils.lerp(-1.5, -0.3, k), THREE.MathUtils.lerp(p.z, Math.sin(a) * 0.5, k));
      } else if (u < 0.7) {
        const k = (u - 0.4) / 0.3;
        m.position.set(Math.cos(a) * 0.62, THREE.MathUtils.lerp(-0.3, 0.3, k), Math.sin(a) * 0.62);
      } else {
        const k = smooth(0.7, 1, u);
        m.position.set(Math.cos(a) * THREE.MathUtils.lerp(0.62, 1.6, k), THREE.MathUtils.lerp(0.3, 0.9, k), Math.sin(a) * THREE.MathUtils.lerp(0.62, 1.2, k));
      }
      m.scale.setScalar(Math.min(1, Math.sin(Math.PI * u) * 3));
    });
    atps.current.forEach((m, i) => {
      if (!m) return;
      const u = frac(t * 0.38 + i / 3);
      const a = (i / 3) * Math.PI * 2 + 0.5;
      const r = 0.75 + u * 1.3;
      m.position.set(Math.cos(a) * r, 1.6 + u * 0.9, Math.sin(a) * r * 0.6 + 0.4);
      m.scale.setScalar(Math.sin(Math.PI * u));
    });
  });
  return (
    <group ref={root}>
      <Bilayer hole={0.75} />
      <group ref={rotor}>
        {Array.from({ length: 10 }, (_, i) => {
          const a = (i / 10) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * 0.5, 0, Math.sin(a) * 0.5]}>
              <capsuleGeometry args={[0.11, 0.55, 4, 12]} />
              {glossy(i === 0 ? PAL.pink : PAL.mint, i === 0 ? 0.3 : 0.08)}
            </mesh>
          );
        })}
        <mesh position={[0, 0.85, 0]}>
          <cylinderGeometry args={[0.11, 0.11, 1.4, 14]} />
          {glossy(PAL.pink, 0.2)}
        </mesh>
        <mesh position={[0.14, 0.55, 0]}>
          <sphereGeometry args={[0.16, 16, 12]} />
          {glossy(PAL.pink, 0.2)}
        </mesh>
      </group>
      <group ref={head} position={[0, 1.75, 0]}>
        {Array.from({ length: 6 }, (_, i) => {
          const a = (i / 6) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * 0.42, 0, Math.sin(a) * 0.42]}>
              <sphereGeometry args={[0.36, 28, 20]} />
              {glossy(i % 2 ? PAL.lavender : PAL.mint)}
            </mesh>
          );
        })}
        <mesh position={[0, 0.35, 0]}>
          <sphereGeometry args={[0.2, 20, 14]} />
          {glossy(PAL.lavenderDeep)}
        </mesh>
      </group>
      <mesh geometry={stator}>{glossy(PAL.mauveSoft)}</mesh>
      {pData.map((_, i) => (
        <mesh key={i} ref={(el) => {
            protons.current[i] = el;
          }}>
          <sphereGeometry args={[0.06, 10, 8]} />
          <meshStandardMaterial color={PAL.white} emissive={PAL.pink} emissiveIntensity={1.1} />
        </mesh>
      ))}
      {[0, 1, 2].map((i) => (
        <mesh key={i} ref={(el) => {
            atps.current[i] = el;
          }}>
          <icosahedronGeometry args={[0.13, 1]} />
          <meshStandardMaterial color={PAL.white} emissive={PAL.peach} emissiveIntensity={1} />
        </mesh>
      ))}
      <Tag position={[-1.5, 0, 1.6]}>spinning rotor</Tag>
      <Tag position={[0, 2.6, 0]}>ATP out</Tag>
      <Tag position={[-1.7, -1.4, 0]}>protons in</Tag>
    </group>
  );
}

/* ---------------- Receptor + signal to the nucleus ---------------- */

function Receptor() {
  const root = useActive("receptor");
  const signal = useRef<THREE.Mesh>(null);
  const helixMats = useRef<(THREE.MeshPhysicalMaterial | null)[]>([]);
  const pulses = useRef<(THREE.Mesh | null)[]>([]);
  const nucleusMat = useRef<THREE.MeshPhysicalMaterial>(null);
  const path = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, -0.6, 0),
        new THREE.Vector3(0.45, -1.4, 0.2),
        new THREE.Vector3(-0.25, -2.2, 0.1),
        new THREE.Vector3(0.35, -3.0, 0),
      ]),
    [],
  );
  const dots = useMemo(() => Array.from({ length: 28 }, (_, i) => path.getPointAt(i / 27)), [path]);
  const p = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    if (!root.current?.visible) return;
    const c = frac(live.time / 5.2);
    if (signal.current) {
      const k = smooth(0, 0.3, c);
      signal.current.position.set(THREE.MathUtils.lerp(-1.4, 0, k) + Math.sin(c * 30) * 0.08 * (1 - k), THREE.MathUtils.lerp(2.6, 0.95, k), THREE.MathUtils.lerp(0.4, 0, k));
      signal.current.rotation.set(c * 8, c * 6, 0);
      signal.current.scale.setScalar(c > 0.86 ? Math.max(0.001, 1 - (c - 0.86) * 7) : 1);
    }
    const docked = c > 0.3 && c < 0.88 ? 1 : 0;
    const flash = docked * (0.5 + 0.5 * Math.sin(live.time * 6));
    helixMats.current.forEach((m) => m && (m.emissiveIntensity = 0.1 + flash * 0.6));
    let arrival = 0;
    pulses.current.forEach((m, i) => {
      if (!m) return;
      const u = (c - (0.33 + i * 0.09)) / 0.3;
      if (u < 0 || u > 1) {
        m.scale.setScalar(0.0001);
        return;
      }
      path.getPointAt(u, p);
      m.position.copy(p);
      m.scale.setScalar(0.6 + Math.sin(Math.PI * u) * 0.8);
      if (u > 0.85) arrival = Math.max(arrival, (u - 0.85) / 0.15);
    });
    if (nucleusMat.current) nucleusMat.current.emissiveIntensity = 0.25 + arrival * 0.8;
  });
  return (
    <group ref={root}>
      <Bilayer hole={0.5} w={5} />
      {Array.from({ length: 7 }, (_, i) => {
        const a = (i / 7) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.3, 0.05, Math.sin(a) * 0.3]} rotation={[Math.sin(a) * 0.15, 0, Math.cos(a) * 0.15]}>
            <capsuleGeometry args={[0.11, 0.95, 4, 12]} />
            <meshPhysicalMaterial ref={(el) => {
            helixMats.current[i] = el;
          }} color={PAL.lavender} emissive={PAL.pink} emissiveIntensity={0.1} roughness={0.3} clearcoat={1} />
          </mesh>
        );
      })}
      <mesh ref={signal}>
        <icosahedronGeometry args={[0.2, 0]} />
        <meshStandardMaterial color={PAL.pink} emissive={PAL.pink} emissiveIntensity={0.8} flatShading />
      </mesh>
      {dots.map((d, i) => (
        <mesh key={i} position={d}>
          <sphereGeometry args={[0.025, 6, 4]} />
          <meshBasicMaterial color={PAL.mauveSoft} />
        </mesh>
      ))}
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} ref={(el) => {
            pulses.current[i] = el;
          }}>
          <sphereGeometry args={[0.11, 16, 12]} />
          <meshStandardMaterial color={PAL.white} emissive={PAL.pink} emissiveIntensity={1.4} />
        </mesh>
      ))}
      <mesh position={[0.4, -5.6, -0.6]}>
        <sphereGeometry args={[2.5, 48, 32]} />
        <meshPhysicalMaterial ref={nucleusMat} color={PAL.lavender} emissive={PAL.lavender} emissiveIntensity={0.25} roughness={0.3} clearcoat={1} />
      </mesh>
      <Tag position={[-1.5, 2.95, 0]}>signal</Tag>
      <Tag position={[1.55, 0.95, 0]}>receptor</Tag>
      <Tag position={[-1.3, -0.75, 1.0]}>outside ↑ · inside ↓</Tag>
      <Tag position={[1.5, -2.6, 0]}>to the nucleus</Tag>
    </group>
  );
}

function Bokeh() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const data = useMemo(() => {
    const r = mulberry32(44);
    return Array.from({ length: 60 }, () => ({ x: (r() - 0.5) * 22, y: (r() - 0.5) * 16, z: -4 - r() * 10, s: 0.05 + r() * 0.16, ph: r() * 10 }));
  }, []);
  const o = useMemo(() => new THREE.Object3D(), []);
  useFrame(() => {
    const m = ref.current;
    if (!m || live.displayed === null) return;
    const t = live.time;
    data.forEach((d, i) => {
      o.position.set(d.x + Math.sin(t * 0.3 + d.ph) * 0.4, d.y + Math.cos(t * 0.25 + d.ph) * 0.4, d.z);
      o.scale.setScalar(d.s);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, 60]}>
      <sphereGeometry args={[1, 10, 8]} />
      <meshBasicMaterial color={PAL.pinkSoft} transparent opacity={0.45} depthWrite={false} />
    </instancedMesh>
  );
}

export function Lens() {
  const group = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  const backdrop = useMemo(() => makeBackdropMaterial(), []);
  useEffect(() => {
    live.lensSpin = spin.current;
    return () => {
      live.lensSpin = null;
    };
  }, []);
  useFrame(() => {
    if (group.current) group.current.visible = live.displayed !== null;
  });
  return (
    <group ref={group} position={LENS_ORIGIN} visible={false}>
      <mesh material={backdrop} renderOrder={-1}>
        <sphereGeometry args={[40, 32, 24]} />
      </mesh>
      <Bokeh />
      <group ref={spin}>
        <Kinesin />
        <Ribosome />
        <AtpSynthase />
        <Receptor />
      </group>
    </group>
  );
}
