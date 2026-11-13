import { describe, expect, it } from "vitest";
import { BIN_POSITIONS, closedLoop } from "@/lib/dynacard/geometry";

const flat = Array.from({ length: 50 }, () => 0.5);

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
