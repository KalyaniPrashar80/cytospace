import { useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import { introCameraZ, type HotspotId } from "../content";
import { PAL } from "../palette";
import { live, useCyto } from "../store";
import { Cell } from "./Cell";
import { LENS_FRAMES, LENS_ORIGIN, Lens } from "./Lens";
import { damp, smooth } from "./helpers";
import { cn } from "@/lib/utils";

const OUT_SECONDS = 0.8;
const IN_SECONDS = 0.9;

type Pose = { pos: THREE.Vector3; look: THREE.Vector3; fov: number };

function lensPose(id: HotspotId, aspect: number, out: Pose) {
  const f = LENS_FRAMES[id];
  const portrait = aspect < 0.8;
  const fov = portrait ? 52 : 44;
  const T = Math.tan(THREE.MathUtils.degToRad(fov / 2));
  out.fov = fov;
  if (portrait) {
    const fh = 0.5;
    const dist = Math.max(f.h / (2 * T * fh), f.w / (2 * T * aspect)) * 1.08;
    const shiftY = 0.24 * 2 * T * dist;
    out.look.set(0, f.cy - shiftY, 0).add(LENS_ORIGIN);
    out.pos.set(0, f.cy - shiftY + dist * 0.1, dist).add(LENS_ORIGIN);
  } else {
    const fw = 0.6;
    const dist = Math.max(f.h / (2 * T), f.w / (2 * T * aspect * fw)) * 1.12;
    const shiftX = ((1 - fw) / 2) * 2 * T * dist * aspect;
    out.look.set(shiftX, f.cy, 0).add(LENS_ORIGIN);
    out.pos.set(shiftX, f.cy + dist * 0.1, dist).add(LENS_ORIGIN);
  }
}

function cellPose(aspect: number, p: number, out: Pose) {
  const portrait = aspect < 0.8;
  out.fov = portrait ? 64 : 50;
  const z = introCameraZ(p, portrait ? 9.3 : 9.0);
  const wob = Math.min(1, Math.max(0, (p - 0.6) / 0.4));
  out.pos.set(Math.sin(p * 4) * 0.6 * wob * (1 - p) * 4, 0.25 * wob, z);
  out.look.set(0, 0, 0);
}

function Stepper() {
  const { camera, size, scene } = useThree();
  const cam = camera as THREE.PerspectiveCamera;
  const T = useRef({ phase: "none" as "none" | "out" | "in", t: 0, from: new THREE.Vector3(), push: new THREE.Vector3(), lookFrom: new THREE.Vector3() });
  const rest = useRef<Pose>({ pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 50 });
  const look = useRef(new THREE.Vector3());
  const fog = useRef(new THREE.FogExp2(PAL.blush, 0));
  const tmp = useRef(new THREE.Vector3());
  const readyFrames = useRef(0);

  useEffect(() => {
    scene.fog = fog.current;
    scene.background = new THREE.Color(PAL.blush);
  }, [scene]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const s = useCyto.getState();
    live.time += dt * s.speed;

    // --- scroll progress, smoothed for a cinematic glide ---
    const doc = document.documentElement;
    const max = doc.scrollHeight - window.innerHeight;
    live.raw = s.phase === "explore" ? 1 : max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    live.smooth = damp(live.smooth, live.raw, 2.6, dt);
    if (Math.abs(live.smooth - live.raw) < 0.0005) live.smooth = live.raw;
    if (live.raw < 0.9) live.lockArmed = true;
    if (s.phase === "intro" && live.lockArmed && live.raw > 0.995 && live.smooth > 0.985) {
      live.lockArmed = false;
      s.setPhase("explore");
    }
    live.flat = damp(live.flat, s.view === "textbook" ? 1 : 0, 3.2, dt);

    // --- drag inertia + idle drift ---
    const target = live.displayed === null ? live.cellGroup : live.lensSpin;
    if (!live.dragging) {
      live.velX *= Math.exp(-dt * 3.5);
      live.velY *= Math.exp(-dt * 3.5);
      live.idle += dt;
    }
    if (target) {
      if (!live.dragging) {
        target.rotation.y += live.velX;
        target.rotation.x += live.velY;
      }
      if (live.displayed === null) {
        target.rotation.y += dt * 0.035 * s.speed * (live.idle > 2 ? 1 : 0);
        target.rotation.x = THREE.MathUtils.clamp(target.rotation.x, -1, 1);
      } else {
        if (live.idle > 2.5) {
          target.rotation.y = damp(target.rotation.y, Math.sin(live.time * 0.25) * 0.35, 0.8, dt);
          target.rotation.x = damp(target.rotation.x, 0, 0.8, dt);
        }
        target.rotation.x = THREE.MathUtils.clamp(target.rotation.x, -0.45, 0.45);
        target.rotation.y = THREE.MathUtils.clamp(target.rotation.y, -1.1, 1.1);
      }
    }

    // --- view transitions: push in, iris to blush, swap, settle ---
    const aspect = size.width / Math.max(1, size.height);
    const desired: HotspotId | null = s.view === "textbook" ? null : s.focus;
    const tr = T.current;
    if (tr.phase === "none" && desired !== live.displayed) {
      tr.phase = "out";
      tr.t = 0;
      tr.from.copy(cam.position);
      tr.lookFrom.copy(look.current);
      if (live.displayed === null && desired) {
        const l = live.hotspotLocal[desired];
        if (l && live.cellGroup) live.cellGroup.localToWorld(tr.push.set(l[0], l[1], l[2]));
      } else if (live.displayed && desired) {
        tr.push.copy(rest.current.look);
      } else {
        tr.push.copy(cam.position).sub(rest.current.look).multiplyScalar(1.8).add(rest.current.look);
      }
    }
    live.transitioning = tr.phase !== "none";

    if (live.displayed === null) cellPose(aspect, live.smooth, rest.current);
    else lensPose(live.displayed, aspect, rest.current);

    let iris = 0;
    if (tr.phase === "out") {
      tr.t += dt / OUT_SECONDS;
      const e = smooth(0, 1, tr.t);
      cam.position.lerpVectors(tr.from, tr.push, e * e * 0.82);
      look.current.lerpVectors(tr.lookFrom, tr.push, Math.min(1, e * 1.6));
      cam.fov = damp(cam.fov, rest.current.fov * 0.8, 3, dt);
      iris = smooth(0.35, 1, tr.t);
      if (tr.t >= 1) {
        live.displayed = desired;
        tr.phase = "in";
        tr.t = 0;
        if (desired === null) cellPose(aspect, live.smooth, rest.current);
        else lensPose(desired, aspect, rest.current);
        tmp.current.subVectors(rest.current.pos, rest.current.look);
        cam.position.copy(rest.current.look).addScaledVector(tmp.current, desired === null ? 0.55 : 1.7);
        look.current.copy(rest.current.look);
        cam.fov = rest.current.fov;
        live.velX = live.velY = 0;
        if (live.lensSpin && desired) live.lensSpin.rotation.set(0, -0.5, 0);
        iris = 1;
      }
    } else if (tr.phase === "in") {
      tr.t += dt / IN_SECONDS;
      iris = 1 - smooth(0, 0.85, tr.t);
      cam.position.lerp(rest.current.pos, 1 - Math.exp(-dt * 4.5));
      look.current.lerp(rest.current.look, 1 - Math.exp(-dt * 6));
      cam.fov = damp(cam.fov, rest.current.fov, 4, dt);
      if (tr.t >= 1) tr.phase = "none";
    } else if (live.displayed === null) {
      cam.position.copy(rest.current.pos);
      look.current.copy(rest.current.look);
      cam.fov = rest.current.fov;
    } else {
      cam.position.lerp(rest.current.pos, 1 - Math.exp(-dt * 3));
      look.current.lerp(rest.current.look, 1 - Math.exp(-dt * 4));
      cam.fov = damp(cam.fov, rest.current.fov, 3, dt);
    }
    cam.lookAt(look.current);
    const far = live.displayed === null ? Math.max(80, cam.position.length() + 40) : 120;
    if (cam.far !== far) cam.far = far;
    cam.near = 0.05;
    cam.updateProjectionMatrix();

    // --- atmosphere ---
    const camR = live.displayed === null ? cam.position.length() : 99;
    fog.current.density = live.displayed === null ? 0.05 * (1 - smooth(9.5, 16, camR)) : 0;
    if (live.irisEl) live.irisEl.style.opacity = iris.toFixed(3);
    if (live.flashEl) {
      const fl = live.displayed === null ? Math.exp(-(((camR - 10.4) / 1.5) ** 2)) : 0;
      live.flashEl.style.opacity = (fl * 0.9).toFixed(3);
    }

    if (readyFrames.current < 3 && ++readyFrames.current === 3 && live.wrapperEl) {
      live.wrapperEl.dataset.sceneReady = "true";
    }
  });
  return null;
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.55} />
      <hemisphereLight args={[PAL.white, PAL.lavender, 0.7]} />
      <directionalLight position={[6, 9, 8]} intensity={1.3} color={PAL.white} />
      <directionalLight position={[-8, -4, -6]} intensity={0.45} color={PAL.pinkSoft} />
      <Environment resolution={64} frames={1}>
        <Lightformer intensity={1.6} position={[0, 6, 2]} scale={[10, 10, 1]} color={PAL.white} />
        <Lightformer intensity={0.9} color={PAL.pinkSoft} position={[-6, 1, -1]} rotation-y={Math.PI / 2} scale={[20, 2, 1]} />
        <Lightformer intensity={0.8} color={PAL.mint} position={[6, -1, 1]} rotation-y={-Math.PI / 2} scale={[20, 2, 1]} />
      </Environment>
    </>
  );
}

export default function Experience() {
  const wrap = useRef<HTMLDivElement>(null);
  const phase = useCyto((s) => s.phase);
  const view = useCyto((s) => s.view);
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  const canDrag = phase === "explore" && view === "reality";

  useEffect(() => {
    live.wrapperEl = wrap.current;
  }, []);

  return (
    <div
      ref={wrap}
      className={cn(
        "fixed inset-0 transition-[opacity,transform] duration-1000 ease-out",
        view === "textbook" ? "scale-[0.92] opacity-20" : "scale-100 opacity-100",
        canDrag ? "cursor-grab active:cursor-grabbing" : "",
      )}
      style={{ touchAction: canDrag ? "none" : "pan-y" }}
      onPointerDown={(e) => {
        if (!canDrag) return;
        drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
        live.dragging = true;
        live.idle = 0;
        live.velX = live.velY = 0;
        (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d || d.id !== e.pointerId) return;
        const dx = e.clientX - d.x;
        const dy = e.clientY - d.y;
        d.x = e.clientX;
        d.y = e.clientY;
        const k = 0.006;
        const target = live.displayed === null ? live.cellGroup : live.lensSpin;
        if (target) {
          target.rotation.y += dx * k;
          target.rotation.x += dy * k;
        }
        live.velX = dx * k;
        live.velY = dy * k;
      }}
      onPointerUp={(e) => {
        if (drag.current?.id === e.pointerId) drag.current = null;
        live.dragging = false;
        live.idle = 0;
      }}
      onPointerCancel={() => {
        drag.current = null;
        live.dragging = false;
      }}
    >
      <Canvas
        flat
        dpr={[1, 1.75]}
        camera={{ fov: 50, near: 0.05, far: 4000, position: [0, 0, 1500] }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <Stepper />
        <Lights />
        <Cell />
        <Lens />
      </Canvas>
    </div>
  );
}
