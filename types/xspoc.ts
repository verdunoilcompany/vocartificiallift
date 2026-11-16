/** Current state of one XSPOC well (tblNodeMaster + tblWellDetails). */
export interface WellStatusRow {
  well: string;
  /** Wall-clock time as stored in XSPOC, "YYYY-MM-DD HH:mm:ss", or null. */
  lastGoodScan: string | null;
  runStatus: string | null;
  /** Today's runtime %. */
  runTime: number | null;
  /** Yesterday's runtime %. */
  runTimeYesterday: number | null;
  /** Idle time in minutes. */
  idleTime: number | null;
}

export interface WellStatusResponse {
  rows: WellStatusRow[];
  /** When the server ran the query (ISO). */
  fetchedAt: string;
}

/** One well in the XSPOC morning report (AT1 West / East / Central). */
export interface MorningReportRow {
  area: string;
  well: string;
  lastGoodScan: string | null;
  runStatus: string | null;
  runTime: number | null;
  runTimeYesterday: number | null;
  idleTime: number | null;
  avgSpm: number | null;
  avgPumpFillage: number | null;
  maxPumpFillage: number | null;
  minPumpFillage: number | null;
  cycles: number | null;
  gearBoxLoadPct: number | null;
  alarms: string | null;
  hostAlarms: string | null;
  comms: string | null;
  avgCsgPressure: number | null;
  avgTbgPressure: number | null;
  lastTestDate: string | null;
  oilTest: number | null;
  waterTest: number | null;
  gasTest: number | null;
  firmwareVersion: number | null;
  portId: number | null;
  comment: string | null;
}

export interface MorningReportResponse {
  rows: MorningReportRow[];
  /** When the data was read from XSPOC (ISO). */
  fetchedAt: string;
}

/** A saved 6 AM copy of the morning report. */
export interface MorningSnapshotInfo {
  /** Local report date, "YYYY-MM-DD". */
  date: string;
  /** When it was actually captured (ISO). */
  capturedAt: string;
  /** True when the server wasn't running at 6:00 and captured it later that day. */
  late: boolean;
  rowCount: number;
}

export interface MorningSnapshot extends MorningSnapshotInfo {
  rows: MorningReportRow[];
}
