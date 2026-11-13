import { describe, expect, it } from "vitest";
import {
  getDailyRows,
  getDataset,
  getSetpoints,
  getTrend,
} from "@/lib/lift/sample";
import { addDays } from "@/lib/lift/dates";
import { trendQuery } from "@/app/components/lift/trend-query";

const NOW = Date.parse("2026-11-12T15:00:00Z");

describe("lift sample data", () => {
  const ds = getDataset(NOW);

  it("runs up to yesterday and is deterministic", () => {
    expect(ds.days.at(-1)).toBe("2026-11-11");
    expect(getDataset(NOW).wells).toEqual(ds.wells);
    expect(ds.wells.length).toBeGreaterThan(20);
  });

  it("returns one daily row per well", () => {
    const rows = getDailyRows("2026-11-11", ds);
    expect(rows).toHaveLength(ds.wells.length);
    expect(getDailyRows("1999-01-01", ds)).toEqual([]);
  });

  it("aggregates trends over the chosen wells", () => {
    const start = addDays("2026-11-11", -9);
    const all = getTrend([], start, "2026-11-11", ds);
    const one = getTrend([ds.wells[0].name], start, "2026-11-11", ds);
    expect(all).toHaveLength(10);
    expect(one[9].oil).toBeLessThanOrEqual(all[9].oil);
    const counted = Object.values(all[0].aspm).reduce((a, b) => a + b, 0);
    expect(counted).toBe(ds.wells.length);
  });

  it("keeps setpoint history consistent (old values = previous new values)", () => {
    const all = getSetpoints(ds.days[0], ds.days.at(-1)!, ds).filter(
      (s) => s.kind === "SPM",
    );
    for (let i = 1; i < all.length; i++) {
      if (all[i].well !== all[i - 1].well) continue;
      expect(all[i].oldMin).toBe(all[i - 1].min);
      expect(all[i].oldMax).toBe(all[i - 1].max);
    }
  });
});

describe("trendQuery", () => {
  const w = (name: string) => ({ name }) as never;
  it("prefers selected wells, then filtered, else all", () => {
    expect(
      trendQuery("2026-01-01", "2026-02-01", [w("A")], true, new Set(["B, C"])),
    ).toContain("wells=B%2C+C");
    expect(
      trendQuery("2026-01-01", "2026-02-01", [w("A"), w("D")], true, new Set()),
    ).toContain("wells=A%7CD");
    expect(
      trendQuery("2026-01-01", "2026-02-01", [w("A")], false, new Set()),
    ).toMatch(/wells=$/);
  });
});
