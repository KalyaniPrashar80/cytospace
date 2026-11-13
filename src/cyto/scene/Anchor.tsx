import { useEffect, useRef } from "react";
import type { Group } from "three";
import { live } from "../store";

/** An invisible point in 3D that a DOM label (same id) is pinned to. */
export function Anchor({ id, position }: { id: string; position: [number, number, number] | { x: number; y: number; z: number } }) {
  const ref = useRef<Group>(null);
  useEffect(() => {
    if (ref.current) live.anchors[id] = ref.current;
    return () => {
      delete live.anchors[id];
    };
  }, [id]);
  const p = Array.isArray(position) ? position : ([position.x, position.y, position.z] as [number, number, number]);
  return <group ref={ref} position={p} />;
}
