import type { HotspotId } from "./content";

/** Small floating captions inside each close-up. Positions are in the close-up's own space. */
export const LENS_TAGS: { id: string; spot: HotspotId; text: string; pos: [number, number, number] }[] = [
  { id: "tag:k1", spot: "kinesin", text: "← 8 nm per step →", pos: [0, -0.6, 0] },
  { id: "tag:k2", spot: "kinesin", text: "cargo", pos: [-1.2, 2.9, 0] },
  { id: "tag:k3", spot: "kinesin", text: "ATP", pos: [1.9, 1.85, 0] },
  { id: "tag:r1", spot: "ribosome", text: "mRNA", pos: [-2.0, -1.05, 0] },
  { id: "tag:r2", spot: "ribosome", text: "protein chain", pos: [1.6, 2.6, 0] },
  { id: "tag:r3", spot: "ribosome", text: "tRNA", pos: [-1.9, 2.2, 0] },
  { id: "tag:a1", spot: "atp", text: "spinning rotor", pos: [-1.5, 0, 1.6] },
  { id: "tag:a2", spot: "atp", text: "ATP out", pos: [0, 2.6, 0] },
  { id: "tag:a3", spot: "atp", text: "protons in", pos: [-1.7, -1.4, 0] },
  { id: "tag:s1", spot: "receptor", text: "signal", pos: [-1.5, 2.95, 0] },
  { id: "tag:s2", spot: "receptor", text: "receptor", pos: [1.55, 0.95, 0] },
  { id: "tag:s3", spot: "receptor", text: "outside ↑ · inside ↓", pos: [-1.3, -0.75, 1.0] },
  { id: "tag:s4", spot: "receptor", text: "to the nucleus", pos: [1.5, -2.6, 0] },
];
