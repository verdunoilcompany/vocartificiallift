/**
 * The date range of MLDB dynocards shown on the Classifier, Explorer and Daily Dashboard.
 * Whole days, "YYYY-MM-DD", both ends inclusive, compared with the card's wall-clock
 * CardCreatedDate. About 1,400 cards a day come in across all wells, so ranges over all wells
 * are capped; one well's cards (~12 a day) can span much longer.
 */
export interface CardRange {
  from: string;
  to: string;
}

/** Longest range (days, inclusive) when loading every well. */
export const MAX_DAYS_ALL_WELLS = 14;
/** Longest range (days, inclusive) when loading a single well. */
export const MAX_DAYS_ONE_WELL = 365;

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const pad = (n: number) => String(n).padStart(2, "0");

/** Local calendar day of `d` as "YYYY-MM-DD". */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Default range: yesterday through today. */
export function defaultCardRange(now = new Date()): CardRange {
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  return { from: dayKey(y), to: dayKey(now) };
}

export function isDay(s: unknown): s is string {
  if (typeof s !== "string" || !DAY_RE.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

/** Number of days in the range, both ends included (0 or less if reversed). */
export function rangeDays(r: CardRange): number {
  const ms = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((ms(r.to) - ms(r.from)) / 86_400_000) + 1;
}

/** Why a range can't be loaded, or null when it's fine. */
export function cardRangeError(
  r: Partial<CardRange>,
  oneWell: boolean,
): string | null {
  if (!isDay(r.from) || !isDay(r.to)) return "Pick a From and a To date.";
  const days = rangeDays(r as CardRange);
  if (days < 1) return "The From date must be on or before the To date.";
  const max = oneWell ? MAX_DAYS_ONE_WELL : MAX_DAYS_ALL_WELLS;
  if (days > max) {
    return oneWell
      ? "You can select up to 1 year for a single well."
      : `You can select up to ${MAX_DAYS_ALL_WELLS} days for all wells.`;
  }
  return null;
}

/** Longest range allowed: 14 days for all wells, 365 for one well. */
export const maxDaysFor = (oneWell: boolean) =>
  oneWell ? MAX_DAYS_ONE_WELL : MAX_DAYS_ALL_WELLS;

/** `day` moved by `n` days ("YYYY-MM-DD"). */
export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

/**
 * Fits a range into `maxDays` (and puts From before To) by moving the end that wasn't just
 * changed: `keep` is the end the user picked, which stays as chosen.
 */
export function clampRange(
  r: CardRange,
  maxDays: number,
  keep: "from" | "to" = "to",
): CardRange {
  if (keep === "from") {
    const to = r.to < r.from ? r.from : r.to;
    const last = addDays(r.from, maxDays - 1);
    return { from: r.from, to: to > last ? last : to };
  }
  const from = r.from > r.to ? r.to : r.from;
  const first = addDays(r.to, -(maxDays - 1));
  return { from: from < first ? first : from, to: r.to };
}

/** "11/22/2026" from "2026-11-22". */
export function usDay(s: string): string {
  const [y, m, d] = s.split("-");
  return `${m}/${d}/${y}`;
}
