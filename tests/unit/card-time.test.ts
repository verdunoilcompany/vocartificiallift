import { describe, expect, it } from "vitest";
import {
  cardTimeKey,
  inDateRange,
  sortByTime,
  timeSpan,
} from "@/lib/dynocard/card-time";

describe("cardTimeKey", () => {
  it("reads the common date formats", () => {
    expect(cardTimeKey("2025-05-15 10:40")).toBe("2025-05-15T10:40");
    expect(cardTimeKey("2025-05-15T08:46:30.000Z")).toBe("2025-05-15T08:46");
    expect(cardTimeKey("2025-05-15")).toBe("2025-05-15T00:00");
    expect(cardTimeKey("5/15/2025 10:40 PM")).toBe("2025-05-15T22:40");
    expect(cardTimeKey("5/15/2025 12:05 AM")).toBe("2025-05-15T00:05");
    expect(cardTimeKey("5/15/2025")).toBe("2025-05-15T00:00");
  });

  it("returns null for blanks and junk", () => {
    expect(cardTimeKey("")).toBeNull();
    expect(cardTimeKey(null)).toBeNull();
    expect(cardTimeKey("not a date")).toBeNull();
  });
});

describe("inDateRange (whole days)", () => {
  it("includes every time on the from and to days", () => {
    const r = { from: "2025-05-14", to: "2025-05-15" };
    expect(inDateRange("2025-05-14 00:00", r)).toBe(true);
    expect(inDateRange("2025-05-15 23:59", r)).toBe(true);
    expect(inDateRange("2025-05-13 23:59", r)).toBe(false);
    expect(inDateRange("2025-05-16 00:00", r)).toBe(false);
    expect(
      inDateRange("5/15/2025 10:40 PM", {
        from: "2025-05-15",
        to: "2025-05-15",
      }),
    ).toBe(true);
  });

  it("is open-ended", () => {
    expect(
      inDateRange("2025-05-15 08:46", { from: null, to: "2025-05-15" }),
    ).toBe(true);
    expect(
      inDateRange("2025-05-15 08:46", { from: "2025-05-16", to: null }),
    ).toBe(false);
  });

  it("keeps undated cards only when no range is set", () => {
    expect(inDateRange("", { from: null, to: null })).toBe(true);
    expect(inDateRange("", { from: "2025-01-01", to: null })).toBe(false);
  });
});

describe("timeSpan", () => {
  it("finds the earliest and latest card day", () => {
    expect(timeSpan(["2025-05-15 10:40", "", "2025-05-12 08:46"])).toEqual({
      min: "2025-05-12",
      max: "2025-05-15",
    });
    expect(timeSpan([""])).toBeNull();
  });
});

describe("sortByTime", () => {
  const cards = [
    { id: "a", date: "2025-05-15 10:40" },
    { id: "b", date: "" },
    { id: "c", date: "2025-05-15 08:46" },
    { id: "d", date: "5/15/2025 10:41 AM" },
    { id: "e", date: "2025-05-15 08:46" },
  ];
  const ids = (dir: "file" | "asc" | "desc") =>
    sortByTime(cards, dir, (c) => c.date)
      .map((c) => c.id)
      .join("");

  it("sorts by date and time, undated last, ties in file order", () => {
    expect(ids("asc")).toBe("ceadb");
    expect(ids("desc")).toBe("daceb");
    expect(ids("file")).toBe("abcde");
  });
});
