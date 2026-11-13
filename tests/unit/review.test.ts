import { describe, expect, it } from "vitest";
import { autoReviewNote } from "@/lib/dynacard/review";
import { BIN_POSITIONS, closedLoop } from "@/lib/dynacard/geometry";

const flat = Array.from({ length: 50 }, () => 0.5);

describe("autoReviewNote", () => {
  it("flags high fillage with a non-full label", () => {
    expect(autoReviewNote({ fill: 97, label: "Fluid Pound", L: flat })).toMatch(/Fillage is 97%/);
  });

  it("does not flag high fillage on full-ish labels", () => {
    expect(autoReviewNote({ fill: 99, label: "Worn Barrel", L: flat })).toBe("");
  });

  it("flags low fillage on Full Pump", () => {
    expect(autoReviewNote({ fill: 80, label: "Full Pump", L: flat })).toMatch(/low for a full pump/);
  });

  it("flags tubing movement with a sharp right side", () => {
    const L = [...flat];
    L[24] = 0.9;
    L[27] = 0.1;
    expect(autoReviewNote({ fill: 90, label: "Tubing Movement", L })).toMatch(/Only the left side/);
  });

  it("returns empty when fillage is unknown", () => {
    expect(autoReviewNote({ fill: null, label: "Gas Interference", L: flat })).toBe("");
  });
});

describe("geometry", () => {
  it("runs bottom→top on the upstroke and back down", () => {
    expect(BIN_POSITIONS).toHaveLength(50);
    expect(BIN_POSITIONS[0]).toBeCloseTo(0.0152, 3);
    expect(BIN_POSITIONS[24]).toBeCloseTo(0.9848, 3);
    expect(BIN_POSITIONS[25]).toBeCloseTo(0.9848, 3);
    expect(BIN_POSITIONS[49]).toBeCloseTo(0.0152, 3);
  });

  it("closes the loop", () => {
    const loop = closedLoop(flat);
    expect(loop).toHaveLength(51);
    expect(loop[50]).toEqual(loop[0]);
  });
});
