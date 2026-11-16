/**
 * Age of an XSPOC "Last Good Scan". The value is wall-clock time as stored in XSPOC
 * ("YYYY-MM-DD HH:mm:ss", no timezone), so it's read as local time on the viewer's machine,
 * which is the same Central time XSPOC uses for Verdun users.
 */

/** Hours since the scan, or null when there's no scan time. */
export function scanAgeHours(
  lastGoodScan: string | null,
  nowMs: number,
): number | null {
  if (!lastGoodScan) return null;
  const t = new Date(lastGoodScan.replace(" ", "T")).getTime();
  if (Number.isNaN(t)) return null;
  return Math.max(0, (nowMs - t) / 3_600_000);
}

/**
 * True when the well hasn't reported for at least `minHours`. A well with no scan time at all
 * counts as not updated. `minHours` of 0 means "all wells".
 */
export function isStale(
  lastGoodScan: string | null,
  minHours: number,
  nowMs: number,
): boolean {
  if (minHours <= 0) return true;
  const age = scanAgeHours(lastGoodScan, nowMs);
  return age === null || age >= minHours;
}

/** "45 min", "7 h", "3 d 4 h" — short text for how long ago the scan was. */
export function ageText(hours: number | null): string {
  if (hours === null) return "Never";
  if (hours < 1) return `${Math.max(0, Math.floor(hours * 60))} min`;
  if (hours < 24) return `${Math.floor(hours)} h`;
  const d = Math.floor(hours / 24);
  const h = Math.floor(hours - d * 24);
  return h ? `${d} d ${h} h` : `${d} d`;
}

/** An age bucket for the "Last scan" filter: min ≤ age < max (hours). `max` null = no upper limit. */
export interface ScanAgeRange {
  id: string;
  label: string;
  /** Null means "all wells" (no filtering). */
  min: number | null;
  max: number | null;
}

/** "Last scan" filter choices. The first is the default. */
export const SCAN_AGE_RANGES: ScanAgeRange[] = [
  { id: "6+", label: "6 hours or more", min: 6, max: null },
  { id: "all", label: "All wells", min: null, max: null },
];

/**
 * True when the last scan's age is in the range (lower edge included, upper edge excluded).
 * Wells with no scan time count as the oldest, so they fall in any open-ended range.
 */
export function inScanAgeRange(
  lastGoodScan: string | null,
  range: ScanAgeRange,
  nowMs: number,
): boolean {
  if (range.min === null) return true;
  const age = scanAgeHours(lastGoodScan, nowMs);
  if (age === null) return range.max === null;
  return age >= range.min && (range.max === null || age < range.max);
}
