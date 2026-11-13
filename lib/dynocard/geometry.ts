import { LOAD_BINS } from "@/types/dynocard";

/**
 * Normalized plunger position (0 = bottom of stroke, 1 = top) for each of the 50 bins.
 *
 * The card is sampled at 100 points going up then the same 100 coming down, and every
 * 4 consecutive samples are averaged into one bin. That gives L0–L24 on the upstroke
 * and L25–L49 on the downstroke.
 */
export const BIN_POSITIONS: readonly number[] = (() => {
  const up = Array.from({ length: 100 }, (_, i) => i / 99);
  const path = up.concat(up.slice().reverse());
  const out: number[] = [];
  for (let i = 0; i < LOAD_BINS; i++) {
    out.push((path[4 * i] + path[4 * i + 1] + path[4 * i + 2] + path[4 * i + 3]) / 4);
  }
  return out;
})();

/** Closed loop of [position, load] points (last point repeats the first). */
export function closedLoop(loads: readonly number[]): [number, number][] {
  const pts = loads.map((y, i) => [BIN_POSITIONS[i], y] as [number, number]);
  pts.push([BIN_POSITIONS[0], loads[0]]);
  return pts;
}
