import { describe, expect, it } from "vitest";
import {
  SCAN_AGE_RANGES,
  ageText,
  inScanAgeRange,
  isStale,
  scanAgeHours,
} from "@/lib/xspoc/scan-age";

const now = new Date(2026, 10, 16, 15, 0, 0).getTime(); // 3:00 PM local

describe("scan age", () => {
  it("measures hours since the last good scan (local wall-clock)", () => {
    expect(scanAgeHours("2026-11-16 09:00:00", now)).toBe(6);
    expect(scanAgeHours(null, now)).toBeNull();
    expect(scanAgeHours("not a date", now)).toBeNull();
  });

  it("treats exactly 6 hours as 6 or more", () => {
    expect(isStale("2026-11-16 09:00:00", 6, now)).toBe(true);
    expect(isStale("2026-11-16 09:00:01", 6, now)).toBe(false);
    expect(isStale(null, 6, now)).toBe(true);
    expect(isStale("2026-11-16 14:59:00", 0, now)).toBe(true);
  });

  it("formats ages briefly", () => {
    expect(ageText(0.5)).toBe("30 min");
    expect(ageText(7.9)).toBe("7 h");
    expect(ageText(24 * 3 + 4.2)).toBe("3 d 4 h");
    expect(ageText(48)).toBe("2 d");
    expect(ageText(null)).toBe("Never");
  });
});

describe("Last scan filter", () => {
  const r = (id: string) => SCAN_AGE_RANGES.find((x) => x.id === id)!;
  const at = (h: number) => {
    const d = new Date(now - h * 3_600_000);
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  };

  it("has two choices: 6 hours or more (default) and All wells", () => {
    expect(SCAN_AGE_RANGES.map((x) => x.label)).toEqual([
      "6 hours or more",
      "All wells",
    ]);
  });

  it("6 hours or more hides anything under 6 hours", () => {
    expect(inScanAgeRange(at(5.9), r("6+"), now)).toBe(false);
    expect(inScanAgeRange(at(6), r("6+"), now)).toBe(true);
    expect(inScanAgeRange(at(500), r("6+"), now)).toBe(true);
    expect(inScanAgeRange(null, r("6+"), now)).toBe(true);
  });

  it("All wells keeps everything", () => {
    expect(inScanAgeRange(at(1), r("all"), now)).toBe(true);
    expect(inScanAgeRange(null, r("all"), now)).toBe(true);
  });
});
