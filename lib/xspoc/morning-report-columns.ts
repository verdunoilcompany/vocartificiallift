import type { MorningReportRow } from "@/types/xspoc";

/**
 * Column layout of the XSPOC "EFD_Morning_Report" grid. Shared by the page, the CSV export
 * and the server, so the screen and the file always match. No server-only imports here.
 */

export type ColumnKind =
  "text" | "int" | "dec1" | "dec2" | "dec3" | "datetime" | "date";
/** How a cell is highlighted, mirroring XSPOC. */
export type Tone = "shutdown" | "idle" | "alarm" | "notice" | null;

export interface MorningColumn {
  key: keyof MorningReportRow;
  header: string;
  kind: ColumnKind;
  /** Cell highlight rule, if any. */
  tone?: (row: MorningReportRow) => Tone;
  /** Narrow numeric columns get centered. */
  align?: "left" | "center";
}

/** Blank alarm fields read "OK" in XSPOC. */
export const okIfBlank = (v: string | null) =>
  v && v.trim() ? v.trim() : "OK";

export function runStatusTone(status: string | null): Tone {
  const s = (status ?? "").trim().toLowerCase();
  if (s.startsWith("running")) return null;
  if (s.startsWith("shutdown")) return "shutdown";
  return "idle";
}

const notOk = (v: string | null, tone: Tone): Tone =>
  okIfBlank(v).toUpperCase() === "OK" ? null : tone;

export const MORNING_COLUMNS: MorningColumn[] = [
  { key: "area", header: "Area", kind: "text", align: "left" },
  { key: "well", header: "Well", kind: "text", align: "left" },
  { key: "lastGoodScan", header: "Last Good Scan", kind: "datetime" },
  {
    key: "runStatus",
    header: "Run Status",
    kind: "text",
    tone: (r) => runStatusTone(r.runStatus),
  },
  { key: "runTime", header: "Run time", kind: "int" },
  { key: "runTimeYesterday", header: "% RTY", kind: "int" },
  { key: "idleTime", header: "Idle Time min", kind: "int" },
  { key: "avgSpm", header: "Avg SPM", kind: "dec2" },
  { key: "avgPumpFillage", header: "Avg Pump Fillage", kind: "dec1" },
  { key: "maxPumpFillage", header: "Max Pump Fillage", kind: "dec1" },
  { key: "minPumpFillage", header: "Min Pump Fillage", kind: "dec1" },
  { key: "cycles", header: "Cycles", kind: "int" },
  { key: "gearBoxLoadPct", header: "Gear Box Load Pct", kind: "int" },
  {
    key: "alarms",
    header: "Alarms",
    kind: "text",
    tone: (r) => notOk(r.alarms, "alarm"),
  },
  {
    key: "hostAlarms",
    header: "Host Alarms",
    kind: "text",
    tone: (r) => notOk(r.hostAlarms, "notice"),
  },
  {
    key: "comms",
    header: "Comms",
    kind: "text",
    tone: (r) => notOk(r.comms, "alarm"),
  },
  { key: "avgCsgPressure", header: "Avg CSG Pressure", kind: "int" },
  { key: "avgTbgPressure", header: "Avg TBG Pressure", kind: "int" },
  { key: "lastTestDate", header: "Last Test Date", kind: "date" },
  { key: "oilTest", header: "Oil Test", kind: "dec1" },
  { key: "waterTest", header: "Water Test", kind: "dec1" },
  { key: "gasTest", header: "Gas Test", kind: "dec1" },
  { key: "firmwareVersion", header: "Firmware Version", kind: "dec3" },
  { key: "portId", header: "Port ID", kind: "int" },
  { key: "comment", header: "Comment", kind: "text", align: "left" },
];

/** "2026-11-16 06:29:34" → "11/16/26 06:29:34" (datetime) or "11/16/26" (date), as XSPOC shows it. */
function shortDate(v: string, withTime: boolean): string {
  const [d, t] = v.split(" ");
  const [y, m, day] = d.split("-");
  if (!y || !m || !day) return v;
  return withTime && t
    ? `${m}/${day}/${y.slice(2)} ${t}`
    : `${m}/${day}/${y.slice(2)}`;
}

/** The text shown in a cell (also what goes into the CSV). */
export function formatCell(row: MorningReportRow, col: MorningColumn): string {
  const v = row[col.key];
  if (col.key === "alarms" || col.key === "hostAlarms")
    return okIfBlank(v as string | null);
  if (v === null || v === undefined || v === "") return "";
  switch (col.kind) {
    case "int":
      return String(Math.round(v as number));
    case "dec1":
      return round(v as number, 1);
    case "dec2":
      return round(v as number, 2);
    case "dec3":
      return (v as number).toFixed(3);
    case "datetime":
      return shortDate(String(v), true);
    case "date":
      return shortDate(String(v), false);
    default:
      return String(v).trim();
  }
}

/** Up to `d` decimals, without trailing zeros (82.4 not 82.40). */
function round(v: number, d: number): string {
  return String(Math.round(v * 10 ** d) / 10 ** d);
}

function csvEscape(s: string): string {
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV text (with a BOM so Excel opens it as UTF-8) of the given rows, in screen format. */
export function toCsv(rows: MorningReportRow[]): string {
  const lines = [MORNING_COLUMNS.map((c) => csvEscape(c.header)).join(",")];
  for (const r of rows)
    lines.push(
      MORNING_COLUMNS.map((c) => csvEscape(formatCell(r, c))).join(","),
    );
  return "﻿" + lines.join("\r\n") + "\r\n";
}

/** "Morning_Report_AT1-Central_2026-11-16_0600.csv" */
export function csvFileName(
  area: string | null,
  when: Date,
  label = "Morning_Report",
): string {
  const p = (n: number) => String(n).padStart(2, "0");
  const stamp = `${when.getFullYear()}-${p(when.getMonth() + 1)}-${p(when.getDate())}_${p(when.getHours())}${p(when.getMinutes())}`;
  const scope = (area ?? "All-Areas").replace(/[^\w-]+/g, "-");
  return `${label}_${scope}_${stamp}.csv`;
}
