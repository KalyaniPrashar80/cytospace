import { create } from "zustand";
import type { Camera, Group, Object3D } from "three";
import { SPEED_DEFAULT, clampSpeed, type HotspotId } from "./content";

export type View = "reality" | "textbook";
export type Phase = "intro" | "explore";

interface CytoState {
  phase: Phase;
  view: View;
  focus: HotspotId | null;
  speed: number;
  touring: boolean;
  tourStep: number;
  setPhase: (p: Phase) => void;
  setView: (v: View) => void;
  setFocus: (f: HotspotId | null) => void;
  setSpeed: (s: number) => void;
  startTour: () => void;
  stopTour: () => void;
  setTourStep: (n: number) => void;
}

export const useCyto = create<CytoState>((set) => ({
  phase: "intro",
  view: "reality",
  focus: null,
  speed: SPEED_DEFAULT,
  touring: false,
  tourStep: 0,
  setPhase: (phase) => set({ phase }),
  setView: (view) => set(view === "textbook" ? { view, focus: null, touring: false } : { view }),
  setFocus: (focus) => set({ focus }),
  setSpeed: (s) => set({ speed: clampSpeed(s) }),
  startTour: () => set({ touring: true, tourStep: 0, view: "reality" }),
  stopTour: () => set({ touring: false }),
  setTourStep: (tourStep) => set({ tourStep }),
}));

/** Per-frame mutable state. Never put this in React state. */
export const live = {
  time: 0,
  smooth: 0,
  raw: 0,
  lockArmed: true,
  flat: 0,
  displayed: null as HotspotId | null,
  transitioning: false,
  dragging: false,
  velX: 0,
  velY: 0,
  idle: 10,
  cellGroup: null as Group | null,
  lensSpin: null as Group | null,
  hotspotLocal: {} as Partial<Record<HotspotId, [number, number, number]>>,
  irisEl: null as HTMLDivElement | null,
  flashEl: null as HTMLDivElement | null,
  wrapperEl: null as HTMLDivElement | null,
  /** 3D anchor objects and the DOM labels pinned to them (projected each frame). */
  anchors: {} as Record<string, Object3D>,
  labelEls: {} as Record<string, HTMLElement | null>,
  camera: null as Camera | null,
};

export function skipIntro() {
  if (typeof window === "undefined") return;
  window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
}

export function replayIntro() {
  useCyto.setState({ phase: "intro", focus: null, touring: false, view: "reality" });
  requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
}
