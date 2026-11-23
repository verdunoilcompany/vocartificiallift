import { describe, expect, it } from "vitest";

import {
  addDays,
  cardRangeError,
  clampRange,
  defaultCardRange,
  isDay,
  rangeDays,
  usDay,
} from "@/lib/dynocard/card-range";

describe("card range", () => {
  it("defaults to yesterday through today", () => {
    expect(defaultCardRange(new Date(2026, 10, 23, 9, 30))).toEqual({
      from: "2026-11-22",
      to: "2026-11-23",
    });
    // Across a month boundary.
    expect(defaultCardRange(new Date(2026, 11, 1))).toEqual({
      from: "2026-11-30",
      to: "2026-12-01",
    });
  });

  it("validates days", () => {
    expect(isDay("2026-11-23")).toBe(true);
    expect(isDay("2026-02-30")).toBe(false);
    expect(isDay("11/23/2026")).toBe(false);
    expect(isDay(undefined)).toBe(false);
  });

  it("counts days inclusively", () => {
    expect(rangeDays({ from: "2026-11-23", to: "2026-11-23" })).toBe(1);
    expect(rangeDays({ from: "2026-11-10", to: "2026-11-23" })).toBe(14);
  });

  it("caps all wells at 14 days and one well at 365", () => {
    expect(cardRangeError({ from: "2026-11-10", to: "2026-11-23" }, false)).toBeNull();
    expect(cardRangeError({ from: "2026-11-09", to: "2026-11-23" }, false)).toMatch(/14 days/);
    expect(cardRangeError({ from: "2025-11-24", to: "2026-11-23" }, true)).toBeNull();
    expect(cardRangeError({ from: "2025-11-23", to: "2026-11-23" }, true)).toMatch(/1 year/);
    expect(cardRangeError({ from: "2026-11-23", to: "2026-11-22" }, false)).toMatch(/on or before/);
    expect(cardRangeError({ from: "", to: "2026-11-22" }, false)).toMatch(/Pick a From/);
  });

  it("clamps a range, keeping the end the user picked", () => {
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    // Too long for all wells: keep To, pull From in.
    expect(clampRange({ from: "2026-01-01", to: "2026-11-23" }, 14)).toEqual({ from: "2026-11-10", to: "2026-11-23" });
    // User moved From: keep it, pull To in.
    expect(clampRange({ from: "2026-11-01", to: "2026-11-23" }, 14, "from")).toEqual({ from: "2026-11-01", to: "2026-11-14" });
    // From after To: they meet.
    expect(clampRange({ from: "2026-11-25", to: "2026-11-23" }, 14, "from")).toEqual({ from: "2026-11-25", to: "2026-11-25" });
    expect(clampRange({ from: "2026-11-10", to: "2026-11-23" }, 14)).toEqual({ from: "2026-11-10", to: "2026-11-23" });
  });

  it("formats US dates", () => {
    expect(usDay("2026-11-03")).toBe("11/03/2026");
  });
});
