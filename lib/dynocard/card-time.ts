/**
 * Card dates arrive as free text from the predictions file ("2025-05-15 10:40",
 * "5/15/2025 10:40 AM", "2025-05-15T10:40:00", …). These helpers turn them into a sortable
 * local-time key "YYYY-MM-DDTHH:mm" — the same format an <input type="datetime-local"> uses —
 * so date filters compare plain strings with no timezone shifts.
 */

const pad = (n: number) => String(n).padStart(2, "0");
const key = (y: number, mo: number, d: number, h = 0, mi = 0) =>
  `${y}-${pad(mo)}-${pad(d)}T${pad(h)}:${pad(mi)}`;

export function cardTimeKey(raw: string | null | undefined): string | null {
  const s = (raw ?? "").trim();
  if (!s) return null;

  // 2025-05-15, 2025-05-15 10:40, 2025-05-15T10:40:30(.000)(Z)
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?/);
  if (m) return key(+m[1], +m[2], +m[3], +(m[4] ?? 0), +(m[5] ?? 0));

  // 5/15/2025, 5/15/2025 10:40, 5/15/2025 10:40:00 AM (US month/day order)
  m = s.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp][Mm])?)?/,
  );
  if (m) {
    let h = +(m[4] ?? 0);
    const ampm = m[6]?.toUpperCase();
    if (ampm === "PM" && h < 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
    return key(+m[3], +m[1], +m[2], h, +(m[5] ?? 0));
  }

  const t = new Date(s);
  if (Number.isNaN(t.getTime())) return null;
  return key(
    t.getFullYear(),
    t.getMonth() + 1,
    t.getDate(),
    t.getHours(),
    t.getMinutes(),
  );
}

export interface DateRange {
  /** Whole days, "YYYY-MM-DD" (as <input type="date"> gives), or null for open-ended. */
  from: string | null;
  to: string | null;
}

/** True when the card's day is inside the range (both ends inclusive, whole days). Undated cards fail any active range. */
export function inDateRange(
  raw: string | null | undefined,
  r: DateRange,
): boolean {
  if (!r.from && !r.to) return true;
  const day = cardTimeKey(raw)?.slice(0, 10);
  if (!day) return false;
  return (!r.from || day >= r.from) && (!r.to || day <= r.to);
}

/** Earliest and latest card days ("YYYY-MM-DD"), for the inputs' min/max and a hint. */
export function timeSpan(
  dates: (string | null | undefined)[],
): { min: string; max: string } | null {
  const keys = dates
    .map((d) => cardTimeKey(d)?.slice(0, 10) ?? null)
    .filter((k): k is string => k !== null)
    .sort();
  return keys.length ? { min: keys[0], max: keys[keys.length - 1] } : null;
}

export type TimeSort = "file" | "asc" | "desc";

/**
 * Orders items by their date-and-time stamp (to the minute): "asc" oldest first, "desc" newest
 * first, "file" keeps the original order. Undated items always go last; ties keep file order.
 */
export function sortByTime<T>(
  items: T[],
  dir: TimeSort,
  getDate: (item: T) => string | null | undefined,
): T[] {
  if (dir === "file") return items;
  const keyed = items.map((item, i) => ({
    item,
    i,
    k: cardTimeKey(getDate(item)),
  }));
  keyed.sort((a, b) => {
    if (a.k === b.k) return a.i - b.i;
    if (a.k === null) return 1;
    if (b.k === null) return -1;
    return dir === "asc" ? a.k.localeCompare(b.k) : b.k.localeCompare(a.k);
  });
  return keyed.map((x) => x.item);
}
