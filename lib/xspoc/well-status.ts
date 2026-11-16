import "server-only";

import { mssqlQuery, sqlDateTimeToText } from "@/lib/mssql";
import type { WellStatusRow } from "@/types/xspoc";

/**
 * Well run status from XSPOC (query supplied by the business, Nov 2026).
 * Read-only; no user input goes into the SQL.
 */
const WELL_STATUS_SQL = `
SELECT
    n.NodeID            AS Well,
    n.LastGoodScanTime  AS [Last Good Scan],
    n.RunStatus         AS [Run Status],
    n.TodayRuntimePct   AS [Run time],
    n.YestRuntimePct    AS [% RTY],
    w.IdleTime          AS [Idle Time min]
FROM [XSPOC].[dbo].[tblNodeMaster] n
LEFT JOIN [XSPOC].[dbo].[tblWellDetails] w
    ON w.NodeID = n.NodeID
WHERE n.Enabled = 1
  AND (
        n.NodeID LIKE 'Franklin%'
     OR n.NodeID LIKE 'Frio Tex%'
     OR n.NodeID LIKE 'Frost Bank%'
     OR n.NodeID LIKE 'Hayes%'
     OR n.NodeID LIKE 'Hornsby%'
     OR n.NodeID LIKE 'Ketchbaw%'
     OR n.NodeID LIKE 'Monteith%'
     OR n.NodeID LIKE 'Ralph Edwards%'
     OR n.NodeID LIKE 'RTH%'
     OR n.NodeID LIKE 'Saylee South%'
     OR n.NodeID LIKE 'Siegele%'
     OR n.NodeID LIKE 'Sunflower%'
     OR n.NodeID LIKE 'Thier%'
  )
ORDER BY n.NodeID;
`;

interface RawRow {
  Well: string;
  "Last Good Scan": Date | null;
  "Run Status": string | null;
  "Run time": number | null;
  "% RTY": number | null;
  "Idle Time min": number | null;
}

const num = (v: number | null | undefined) =>
  v === null || v === undefined || Number.isNaN(v) ? null : Number(v);

export async function getWellStatus(): Promise<WellStatusRow[]> {
  const rows = await mssqlQuery<RawRow>(WELL_STATUS_SQL);
  return rows.map((r) => ({
    well: String(r.Well ?? "").trim(),
    lastGoodScan: sqlDateTimeToText(r["Last Good Scan"]),
    runStatus: r["Run Status"]?.trim() || null,
    runTime: num(r["Run time"]),
    runTimeYesterday: num(r["% RTY"]),
    idleTime: num(r["Idle Time min"]),
  }));
}
