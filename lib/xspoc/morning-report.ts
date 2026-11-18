import "server-only";
import { promises as fs } from "fs";
import path from "path";

import { dataDir } from "@/lib/data-dir";
import { mssqlQuery, sqlDateTimeToText } from "@/lib/mssql";
import type {
  MorningReportRow,
  MorningSnapshot,
  MorningSnapshotInfo,
} from "@/types/xspoc";

/**
 * XSPOC morning report (query supplied by the business, Nov 2026) and its daily 6 AM snapshots.
 * Read-only against XSPOC; no user input goes into the SQL.
 */
const MORNING_REPORT_SQL = `
SELECT
    gm.GroupName                   AS Area,
    n.NodeID                       AS Well,
    n.LastGoodScanTime             AS [Last Good Scan],
    n.RunStatus                    AS [Run Status],
    n.TodayRuntimePct              AS [Run time],
    n.YestRuntimePct               AS [% RTY],
    w.IdleTime                     AS [Idle Time min],
    s.AverageSPMPrevious24Hours    AS [Avg SPM],
    f.AVGPumpFillage               AS [Avg Pump Fillage],
    mm.YestMAXPumpFillage          AS [Max Pump Fillage],
    mm.YestMinPumpFillage          AS [Min Pump Fillage],
    w.Cycles                       AS [Cycles],
    x.GearBoxLoadPct               AS [Gear Box Load Pct],
    n.HighPriAlarm                 AS [Alarms],
    n.HostAlarm                    AS [Host Alarms],
    n.CommStatus                   AS [Comms],
    p.AvgCSGPressure               AS [Avg CSG Pressure],
    p.AvgTBGPressure               AS [Avg TBG Pressure],
    t.TestDate                     AS [Last Test Date],
    t.OilRate                      AS [Oil Test],
    t.WaterRate                    AS [Water Test],
    t.GasRate                      AS [Gas Test],
    n.FirmwareVersion              AS [Firmware Version],
    n.PortID                       AS [Port ID],
    n.Comment                      AS [Comment]
FROM [XSPOC].[dbo].[tblGroupMembershipCache] gm
JOIN      [XSPOC].[dbo].[tblNodeMaster]           n  ON n.NodeID  = gm.NodeID
LEFT JOIN [XSPOC].[dbo].[tblWellDetails]          w  ON w.NodeID  = n.NodeID
LEFT JOIN [XSPOC].[dbo].[vwAVGSPM]                s  ON s.NodeID  = n.NodeID
LEFT JOIN [XSPOC].[dbo].[vwAVGPumpFillage]        f  ON f.NodeID  = n.NodeID
LEFT JOIN [XSPOC].[dbo].[vwYestMaxMinPumpFillage] mm ON mm.NodeID = n.NodeID
LEFT JOIN [XSPOC].[dbo].[vwAVGPressures]          p  ON p.NodeID  = n.NodeID
LEFT JOIN [XSPOC].[dbo].[tblXDiagResultsLast]     x  ON x.NodeID  = n.NodeID
OUTER APPLY (                                   -- latest well test per well
    SELECT TOP (1) wt.TestDate, wt.OilRate, wt.WaterRate, wt.GasRate
    FROM [XSPOC].[dbo].[tblWellTests] wt
    WHERE wt.NodeID = n.NodeID
    ORDER BY wt.TestDate DESC
) t
WHERE gm.GroupName IN ('AT1 West', 'AT1 East', 'AT1 Central')
ORDER BY gm.GroupName, n.NodeID;
`;

type Raw = Record<string, unknown>;

const num = (v: unknown): number | null =>
  v === null || v === undefined || v === "" || Number.isNaN(Number(v))
    ? null
    : Number(v);
const text = (v: unknown): string | null =>
  v === null || v === undefined ? null : String(v).trim() || null;
const when = (v: unknown): string | null =>
  v instanceof Date ? sqlDateTimeToText(v) : null;

export async function getMorningReport(): Promise<MorningReportRow[]> {
  const rows = await mssqlQuery<Raw>(MORNING_REPORT_SQL);
  return rows.map((r) => ({
    area: text(r["Area"]) ?? "",
    well: text(r["Well"]) ?? "",
    lastGoodScan: when(r["Last Good Scan"]),
    runStatus: text(r["Run Status"]),
    runTime: num(r["Run time"]),
    runTimeYesterday: num(r["% RTY"]),
    idleTime: num(r["Idle Time min"]),
    avgSpm: num(r["Avg SPM"]),
    avgPumpFillage: num(r["Avg Pump Fillage"]),
    maxPumpFillage: num(r["Max Pump Fillage"]),
    minPumpFillage: num(r["Min Pump Fillage"]),
    cycles: num(r["Cycles"]),
    gearBoxLoadPct: num(r["Gear Box Load Pct"]),
    alarms: text(r["Alarms"]),
    hostAlarms: text(r["Host Alarms"]),
    comms: text(r["Comms"]),
    avgCsgPressure: num(r["Avg CSG Pressure"]),
    avgTbgPressure: num(r["Avg TBG Pressure"]),
    lastTestDate: when(r["Last Test Date"]),
    oilTest: num(r["Oil Test"]),
    waterTest: num(r["Water Test"]),
    gasTest: num(r["Gas Test"]),
    firmwareVersion: num(r["Firmware Version"]),
    portId: num(r["Port ID"]),
    comment: text(r["Comment"]),
  }));
}

// ---------------------------------------------------------------------------------------------
// 6 AM snapshots: one JSON file per day in db/morning-reports (or MORNING_REPORT_DIR).
// Times are the server's local time.
// ---------------------------------------------------------------------------------------------

export const SNAPSHOT_HOUR = 6;
/** Captures after this many minutes past 6:00 are flagged "late". */
const LATE_AFTER_MIN = 15;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const snapshotDir = () =>
  process.env.MORNING_REPORT_DIR
    ? path.resolve(process.cwd(), process.env.MORNING_REPORT_DIR)
    : path.join(dataDir(), "morning-reports");

export function localDateKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const fileFor = (date: string) => path.join(snapshotDir(), `${date}.json`);

export async function listSnapshots(): Promise<MorningSnapshotInfo[]> {
  let names: string[] = [];
  try {
    names = await fs.readdir(snapshotDir());
  } catch {
    return [];
  }
  const out: MorningSnapshotInfo[] = [];
  for (const name of names) {
    const date = name.replace(/\.json$/, "");
    if (!DATE_RE.test(date)) continue;
    try {
      const s = JSON.parse(
        await fs.readFile(fileFor(date), "utf8"),
      ) as MorningSnapshot;
      out.push({
        date: s.date,
        capturedAt: s.capturedAt,
        late: s.late,
        rowCount: s.rowCount,
      });
    } catch {
      /* skip unreadable files */
    }
  }
  return out.sort((a, b) => b.date.localeCompare(a.date));
}

export async function readSnapshot(
  date: string,
): Promise<MorningSnapshot | null> {
  if (!DATE_RE.test(date)) return null;
  try {
    return JSON.parse(
      await fs.readFile(fileFor(date), "utf8"),
    ) as MorningSnapshot;
  } catch {
    return null;
  }
}

let capturing: Promise<MorningSnapshot | null> | null = null;

/**
 * Saves today's snapshot if it's 6:00 or later and none exists yet. Safe to call often
 * (scheduler, page loads); concurrent calls share one capture.
 */
export function ensureTodaySnapshot(
  now = new Date(),
): Promise<MorningSnapshot | null> {
  if (now.getHours() < SNAPSHOT_HOUR) return Promise.resolve(null);
  if (capturing) return capturing;
  capturing = (async () => {
    const date = localDateKey(now);
    const existing = await readSnapshot(date);
    if (existing) return existing;
    const rows = await getMorningReport();
    const capturedAt = new Date();
    const six = new Date(capturedAt);
    six.setHours(SNAPSHOT_HOUR, 0, 0, 0);
    const snap: MorningSnapshot = {
      date,
      capturedAt: capturedAt.toISOString(),
      late: capturedAt.getTime() - six.getTime() > LATE_AFTER_MIN * 60_000,
      rowCount: rows.length,
      rows,
    };
    await fs.mkdir(snapshotDir(), { recursive: true });
    // Write then rename so a half-written file is never read.
    const tmp = `${fileFor(date)}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(snap));
    await fs.rename(tmp, fileFor(date));
    console.log(
      `Morning report snapshot saved for ${date} (${rows.length} wells${snap.late ? ", late" : ""}).`,
    );
    return snap;
  })().finally(() => {
    capturing = null;
  });
  return capturing;
}

let timer: NodeJS.Timeout | null = null;
let watchdog: NodeJS.Timeout | null = null;
/** How often to re-check for a missed or failed capture (sleep, network down, DB busy). */
const RETRY_MS = 5 * 60_000;

/**
 * Captures at 6:00 local time every day while the server is running. Called once at startup.
 * A timer fires just after 6:00; a 5-minute watchdog also retries whenever today's copy is
 * still missing after 6:00, so a failed attempt (e.g. network not up yet after the machine
 * wakes) or a missed 6:00 (machine asleep) is caught up within minutes instead of the next day.
 */
export function startMorningSnapshotScheduler() {
  if (timer || watchdog) return;
  let lastError = "";
  const run = () =>
    ensureTodaySnapshot()
      .then(() => {
        lastError = "";
      })
      .catch((err: unknown) => {
        // Log each distinct failure once, not every 5 minutes.
        const msg = err instanceof Error ? err.message : String(err);
        if (msg !== lastError)
          console.error(
            "Morning report snapshot failed (will retry every 5 min):",
            err,
          );
        lastError = msg;
      });
  const scheduleNext = () => {
    const now = new Date();
    const next = new Date(now);
    next.setHours(SNAPSHOT_HOUR, 0, 5, 0); // a few seconds after 6:00
    if (next <= now) next.setDate(next.getDate() + 1);
    timer = setTimeout(() => {
      void run().finally(scheduleNext);
    }, next.getTime() - now.getTime());
    timer.unref?.();
  };
  void run(); // catch up if the server started after 6:00 today
  scheduleNext();
  watchdog = setInterval(() => void run(), RETRY_MS);
  watchdog.unref?.();
}
