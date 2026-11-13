// Pure data + rules for CYTO SPACE. No React, no three.js.

export type HotspotId = "kinesin" | "ribosome" | "atp" | "receptor";

export interface HotspotInfo {
  id: HotspotId;
  title: string;
  tag: string;
  what: string;
  analogy: { term: string; is: string; detail: string };
  fact: string;
}

export const FACTS = {
  kinesin: "Kinesin takes 8 nm steps along a microtubule and uses one ATP per step.",
  proteins:
    "A simple yeast cell holds around 42 million protein molecules (Ho et al., 2018, Cell Systems).",
  atp: "ATP synthase physically spins to make ATP.",
} as const;

export const HOTSPOTS: Record<HotspotId, HotspotInfo> = {
  kinesin: {
    id: "kinesin",
    title: "Kinesin",
    tag: "Motor protein",
    what: "Kinesin walks along microtubule tracks on two feet, hauling bubbles of cargo to where the cell needs them.",
    analogy: {
      term: "Kinesin",
      is: "delivery driver",
      detail: "It picks up a package and drives it along fixed routes to the right address.",
    },
    fact: FACTS.kinesin,
  },
  ribosome: {
    id: "ribosome",
    title: "Ribosome",
    tag: "Protein builder",
    what: "A ribosome reads an mRNA strand and links amino acids, one by one, into a growing protein chain.",
    analogy: {
      term: "Ribosome",
      is: "compiler",
      detail: "It reads source code (mRNA) and outputs a working program (a protein).",
    },
    fact: FACTS.proteins,
  },
  atp: {
    id: "atp",
    title: "ATP synthase",
    tag: "Molecular motor",
    what: "ATP synthase lets a stream of protons turn its rotor, and every turn presses out ATP, the cell's energy currency.",
    analogy: {
      term: "ATP synthase",
      is: "generator",
      detail: "A flow turns the turbine, and out comes the power the whole system runs on.",
    },
    fact: FACTS.atp,
  },
  receptor: {
    id: "receptor",
    title: "Membrane receptor",
    tag: "Signal receiver",
    what: "A receptor catches a signal molecule outside the cell and relays the message inward, toward the nucleus.",
    analogy: {
      term: "Receptor",
      is: "API",
      detail:
        "Outside requests hit the endpoint, and the message is passed on to the nucleus, the cell's private repo.",
    },
    fact: FACTS.proteins,
  },
};

export const TOUR_ORDER: HotspotId[] = ["kinesin", "ribosome", "atp", "receptor"];
export const TOUR_STOP_SECONDS = 9;

export const SPEED_MIN = 0.1;
export const SPEED_MAX = 3;
export const SPEED_DEFAULT = 1;

export function clampSpeed(v: number): number {
  if (!Number.isFinite(v)) return SPEED_DEFAULT;
  return Math.min(SPEED_MAX, Math.max(SPEED_MIN, v));
}

export function nextHotspot(id: HotspotId, dir: 1 | -1): HotspotId {
  const i = TOUR_ORDER.indexOf(id);
  return TOUR_ORDER[(i + dir + TOUR_ORDER.length) % TOUR_ORDER.length];
}

// --- Intro camera: a tiny dot far away -> through the membrane -> inside ---
export const MEMBRANE_RADIUS = 10;
export const INTRO_START_Z = 1500;
const OUTSIDE_Z = 15;

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

/** Camera distance from the cell centre for a scroll progress p in [0, 1]. */
export function introCameraZ(p: number, insideZ: number): number {
  const t = clamp01(p);
  if (t < 0.68) {
    const e = easeInOut(t / 0.68);
    return Math.exp(Math.log(INTRO_START_Z) + (Math.log(OUTSIDE_Z) - Math.log(INTRO_START_Z)) * e);
  }
  const e = easeInOut((t - 0.68) / 0.32);
  return OUTSIDE_Z + (insideZ - OUTSIDE_Z) * e;
}
