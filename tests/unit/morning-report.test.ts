import { describe, expect, it } from "vitest";
import {
  MORNING_COLUMNS,
  REPORT_NAME_6AM,
  csvFileName,
  formatCell,
  runStatusTone,
  toCsv,
} from "@/lib/xspoc/morning-report-columns";
import type { MorningReportRow } from "@/types/xspoc";

const row: MorningReportRow = {
  area: "AT1 Central",
  well: "Frio Tex 105",
  lastGoodScan: "2026-11-16 06:29:34",
  runStatus: "Running - VFD",
  runTime: 65.98,
  runTimeYesterday: 74.93,
  idleTime: 16,
  avgSpm: 2.661,
  avgPumpFillage: 83.2,
  maxPumpFillage: 96.69999694824219,
  minPumpFillage: 56.9,
  cycles: 12,
  gearBoxLoadPct: 0,
  alarms: "Bad Real Time C",
  hostAlarms: null,
  comms: "SocketConnectFail",
  avgCsgPressure: 93,
  avgTbgPressure: 402,
  lastTestDate: "2026-11-14 00:00:00",
  oilTest: 21,
  waterTest: 0,
  gasTest: 0,
  firmwareVersion: 6.000105857849121,
  portId: 59,
  comment: 'Raised SPM, "check" later',
};
const col = (key: keyof MorningReportRow) =>
  MORNING_COLUMNS.find((c) => c.key === key)!;

describe("morning report formatting", () => {
  it("formats cells like XSPOC", () => {
    expect(formatCell(row, col("lastGoodScan"))).toBe("11/16/26 06:29:34");
    expect(formatCell(row, col("lastTestDate"))).toBe("11/14/26");
    expect(formatCell(row, col("runTime"))).toBe("66");
    expect(formatCell(row, col("avgSpm"))).toBe("2.66");
    expect(formatCell(row, col("maxPumpFillage"))).toBe("96.7");
    expect(formatCell(row, col("firmwareVersion"))).toBe("6.000");
    expect(formatCell(row, col("hostAlarms"))).toBe("OK");
    expect(formatCell({ ...row, alarms: "" }, col("alarms"))).toBe("OK");
    expect(formatCell({ ...row, avgSpm: null }, col("avgSpm"))).toBe("");
  });

  it("highlights statuses and alarms", () => {
    expect(runStatusTone("Shutdown, Logic 3")).toBe("shutdown");
    expect(runStatusTone("Running - VFD")).toBeNull();
    expect(runStatusTone("Idle, HOA in Off")).toBe("idle");
    expect(runStatusTone("45")).toBe("idle");
    expect(col("alarms").tone!(row)).toBe("alarm");
    expect(col("hostAlarms").tone!(row)).toBeNull();
    expect(
      col("hostAlarms").tone!({ ...row, hostAlarms: "Csg Pressure Clear" }),
    ).toBe("notice");
    expect(col("comms").tone!({ ...row, comms: "OK" })).toBeNull();
  });
});

describe("CSV export", () => {
  it("writes headers, escapes quotes/commas and starts with a BOM", () => {
    const csv = toCsv([row]);
    expect(csv.startsWith("﻿Area,Well,Last Good Scan,Run Status,")).toBe(true);
    expect(csv).toContain('"Raised SPM, ""check"" later"');
    expect(csv.trim().split("\r\n")).toHaveLength(2);
  });

  it("names the file after the area and time", () => {
    expect(csvFileName("AT1 Central", new Date(2026, 10, 16, 6, 0))).toBe(
      "Morning_Report_AT1-Central_2026-11-16_0600.csv",
    );
    expect(
      csvFileName(null, new Date(2026, 10, 16, 9, 5), REPORT_NAME_6AM),
    ).toBe("Morning_Report_6AM_All-Areas_2026-11-16_0905.csv");
  });
});
