import * as THREE from "three";

const UP = new THREE.Vector3(0, 1, 0);
const tmp = new THREE.Vector3();

/** Place a unit-height (y) cylinder/capsule mesh so it spans a -> b. */
export function spanBetween(obj: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3, thick = 1) {
  tmp.subVectors(b, a);
  const len = tmp.length();
  obj.position.copy(a).addScaledVector(tmp, 0.5);
  if (len > 1e-5) obj.quaternion.setFromUnitVectors(UP, tmp.divideScalar(len));
  obj.scale.set(thick, len, thick);
}

export const damp = (cur: number, target: number, rate: number, dt: number) =>
  cur + (target - cur) * (1 - Math.exp(-rate * dt));

export const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export const frac = (x: number) => x - Math.floor(x);

export function randomInSphere(rng: () => number, rMin: number, rMax: number, out = new THREE.Vector3()) {
  const u = rng() * 2 - 1;
  const th = rng() * Math.PI * 2;
  const s = Math.sqrt(1 - u * u);
  const r = Math.cbrt(rMin ** 3 + rng() * (rMax ** 3 - rMin ** 3));
  return out.set(s * Math.cos(th) * r, u * r, s * Math.sin(th) * r);
}
