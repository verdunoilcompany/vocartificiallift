/** Shared types for the artificial-lift dashboards (Daily, Trends, Setpoints, Review). */

export const ASPM_STATES = [
  "Dialed In",
  "Overpumping",
  "Underpumping",
  "Gas Interference",
  "Undefined",
  "Unclassified",
] as const;
export type AspmState = (typeof ASPM_STATES)[number];

export const PUMP_CONDITIONS = [
  "Bad Data",
  "Card Distortion",
  "Deep Rod Part",
  "Delayed Travelling Valve",
  "Hole in Barrel",
  "Hole in Tubing",
  "Plunger Undertravel",
  "Stuck Pump",
  "SV Stuck Pump",
  "Tagging",
  "Worn Pump",
  "Fluid Pound",
  "Gas Interference",
] as const;
export type PumpCondition = (typeof PUMP_CONDITIONS)[number];

/** Conditions that are a warning (yellow) rather than a failure (red) when present. */
export const WARNING_CONDITIONS: readonly PumpCondition[] = [
  "Fluid Pound",
  "Gas Interference",
];

export type OptimizationMode = "ASPM" | "POC" | "Timer";
export type AutomationStatus = "Auto" | "Manual" | "Off";
export type CommStatus = "Online" | "Offline" | "Null";
export type ProductionStream = "oil" | "gas" | "water";

export interface Well {
  name: string;
  level1: string;
  level2: string;
  level3: string;
  pumpingUnit: string;
  optimizationMode: OptimizationMode;
  automationStatus: AutomationStatus;
  commStatus: CommStatus;
  aspmState: AspmState | null;
  /** ISO date ASPM was enabled, or null if never. */
  aspmStartDate: string | null;
  avgSpm: number;
}

/** One well-day. Volumes are bbl/d (oil, water) and Mcf/d (gas); pressure psi; depth ft. */
export interface DailyRow {
  well: string;
  date: string;
  oil: number;
  gas: number;
  water: number;
  oilTarget: number;
  gasTarget: number;
  waterTarget: number;
  cycles: number;
  automationStatus: AutomationStatus;
  classification: AspmState;
  avgSpm: number;
  idleTime: number;
  pocStatus: string;
  commStatus: CommStatus;
  dailyCardCount: number;
  fillage: number;
  pocFillage: number;
  runTime: number;
  pumpIntakePressure: number;
  rodsInCompression: number;
  fluidAbovePump: number;
  estimatedTotalStrokes: number;
  setpointChanges: number;
  fluidLoad: number;
  /** Cards classified with each pump condition today. */
  conditions: Partial<Record<PumpCondition, number>>;
}

/** Daily trend point, aggregated over the requested wells. */
export interface TrendPoint {
  date: string;
  oil: number;
  gas: number;
  water: number;
  liquid: number;
  uptime: number;
  pumpOffCycles: number;
  fillage: number;
  pocFillage: number;
  avgSpm: number;
  setpointChanges: number;
  pumpIntakePressure: number;
  fluidAbovePump: number;
  fluidLoad: number;
  rodsInCompression: number;
  estimatedTotalStrokes: number;
  bblPerStroke: number;
  wellCount: number;
  /** Wells in each ASPM classification that day. */
  aspm: Record<AspmState, number>;
}

export type SetpointInitiator =
  "Field Change" | "Auto Accepted" | "Auto Rejected";
export type SetpointKind = "SPM" | "Idle Time (min)";

export interface SetpointChange {
  id: string;
  well: string;
  level1: string;
  level2: string;
  level3: string;
  /** ISO timestamp. */
  at: string;
  initiator: SetpointInitiator;
  kind: SetpointKind;
  idleTime: number | null;
  min: number | null;
  max: number | null;
  oldIdleTime: number | null;
  oldMin: number | null;
  oldMax: number | null;
}

export interface WellsResponse {
  wells: Well[];
  /** Latest production date available (ISO). */
  latestDate: string;
}
