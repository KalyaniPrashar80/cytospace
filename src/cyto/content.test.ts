import { describe, expect, it } from "vitest";
import {
  HOTSPOTS,
  MEMBRANE_RADIUS,
  SPEED_MAX,
  SPEED_MIN,
  TOUR_ORDER,
  clampSpeed,
  introCameraZ,
  nextHotspot,
} from "./content";

describe("CYTO SPACE rules", () => {
  it("the tour plays through every hotspot exactly once", () => {
    expect([...TOUR_ORDER].sort()).toEqual(Object.keys(HOTSPOTS).sort());
    expect(new Set(TOUR_ORDER).size).toBe(4);
  });

  it("speed of life can slow down and speed up, within bounds", () => {
    expect(SPEED_MIN).toBeLessThan(1);
    expect(SPEED_MAX).toBeGreaterThan(1);
    expect(clampSpeed(99)).toBe(SPEED_MAX);
    expect(clampSpeed(-1)).toBe(SPEED_MIN);
  });

  it("intro starts as a far-away dot and ends inside the membrane", () => {
    expect(introCameraZ(0, 9)).toBeGreaterThan(1000);
    expect(introCameraZ(1, 9)).toBeLessThan(MEMBRANE_RADIUS);
  });

  it("card navigation wraps around", () => {
    expect(nextHotspot("receptor", 1)).toBe("kinesin");
    expect(nextHotspot("kinesin", -1)).toBe("receptor");
  });
});
