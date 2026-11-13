import "server-only";

import {
  ASPM_STATES,
  PUMP_CONDITIONS,
  type AspmState,
  type AutomationStatus,
  type CommStatus,
  type DailyRow,
  type OptimizationMode,
  type PumpCondition,
  type SetpointChange,
  type SetpointInitiator,
  type TrendPoint,
  type Well,
} from "@/types/lift";

/**
 * Deterministic sample data for the artificial-lift dashboards.
 * Same inputs always give the same numbers, so pages, tests and screenshots are stable.
 * Replace with SQL Server / Postgres queries (lib/mssql.ts, lib/postgres.ts) when a source is ready.
 */

const HISTORY_DAYS = 420;
const DAY_MS = 86_400_000;

const WELL_DEFS: [name: string, level2: string, level3: string][] = [
  ["Brown 05H", "Brown", "Route A"],
  ["Brown 15H", "Brown", "Route A"],
  ["Brown 6H", "Brown", "Route A"],
  ["Brown 7H", "Brown", "Route A"],
  ["Brown B 08H", "Brown", "Route B"],
  ["Brown B 13H", "Brown", "Route B"],
  ["Brown C 16H", "Brown", "Route B"],
  ["Brown D 20H", "Brown", "Route C"],
  ["Brown D 21H", "Brown", "Route C"],
  ["Cenizo 1H", "Cenizo", "Route D"],
  ["Cenizo 3H", "Cenizo", "Route D"],
  ["Cenizo 4H", "Cenizo", "Route D"],
  ["Cenizo B2", "Cenizo", "Route D"],
  ["Frio Tex 105", "Frio Tex", "Route E"],
  ["Frio Tex 106", "Frio Tex", "Route E"],
  ["Frio Tex 107H", "Frio Tex", "Route E"],
  ["Frio Tex 10H", "Frio Tex", "Route E"],
  ["Frost Bank 20H", "Frost Bank", "Route F"],
  ["Krawetz A Unit A1H", "Krawetz", "Route F"],
  ["MAK Martin SA 24H", "MAK Martin", "Route F"],
  ["Newman 18H", "Newman", "Route G"],
  ["St Reed 05H", "St Reed", "Route G"],
  ["St Reed 11H", "St Reed", "Route G"],
  ["St Reed 37H", "St Reed", "Route H"],
  ["St Reed 39H", "St Reed", "Route H"],
  ["St Reed 41H", "St Reed", "Route H"],
  ["Wareing 19H", "Wareing", "Route J"],
  ["Wareing 25H", "Wareing", "Route J"],
  ["Wareing 29H", "Wareing", "Route J"],
  ["Wareing 34H", "Wareing", "Route J"],
];

const PUMPING_UNITS = [
  "Lufkin C-456",
  "Lufkin C-640",
  "Rotaflex 1100",
  "Weatherford C-912",
];
const OPT_MODES: OptimizationMode[] = ["ASPM", "ASPM", "ASPM", "POC", "Timer"];
const AUTOMATION: AutomationStatus[] = ["Auto", "Auto", "Manual", "Off"];
const COMM: CommStatus[] = ["Online", "Online", "Online", "Offline", "Null"];
const POC_STATUS = ["Running", "Pumped Off", "Idle", "N/A"];

/** Hash of integers → [0, 1). Stateless, so any value can be recomputed on its own. */
function rand(...keys: number[]): number {
  let h = 0x9e3779b9;
  for (const k of keys) {
    h = Math.imul(h ^ (k | 0), 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
  }
  return (h >>> 0) / 4294967296;
}

const pick = <T>(arr: readonly T[], r: number): T =>
  arr[Math.floor(r * arr.length) % arr.length];
const round = (v: number, d = 2) => Math.round(v * 10 ** d) / 10 ** d;
const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

interface Dataset {
  wells: Well[];
  days: string[];
  /** rows[wellIndex][dayIndex] */
  rows: DailyRow[][];
  setpoints: SetpointChange[];
}

let cache: { key: string; data: Dataset } | null = null;

/** Data runs up to yesterday (UTC), like a daily production feed. */
export function getDataset(now = Date.now()): Dataset {
  const end = Math.floor(now / DAY_MS) * DAY_MS - DAY_MS;
  const key = isoDay(end);
  if (cache?.key === key) return cache.data;
  const data = build(end);
  cache = { key, data };
  return data;
}

function build(endMs: number): Dataset {
  const days = Array.from({ length: HISTORY_DAYS }, (_, i) =>
    isoDay(endMs - (HISTORY_DAYS - 1 - i) * DAY_MS),
  );
  const setpoints: SetpointChange[] = [];

  const wells: Well[] = [];
  const rows: DailyRow[][] = [];

  WELL_DEFS.forEach(([name, level2, level3], w) => {
    const optimizationMode = pick(OPT_MODES, rand(w, 1));
    const aspmStartIdx =
      optimizationMode === "ASPM"
        ? Math.floor(HISTORY_DAYS * (0.35 + 0.6 * rand(w, 2)))
        : null;
    const firstProdIdx = Math.floor(HISTORY_DAYS * 0.45 * rand(w, 3));
    const qi = 25 + 70 * rand(w, 4);
    const decline = 0.004 + 0.01 * rand(w, 5);
    const gor = 0.8 + 2.2 * rand(w, 6);
    const wor = 0.6 + 3 * rand(w, 7);
    let spmMin = round(1 + 2 * rand(w, 8), 1);
    let spmMax = round(spmMin + 0.8 + 1.5 * rand(w, 9), 1);
    let idle = Math.round(10 + 30 * rand(w, 10));
    let state: AspmState = "Unclassified";

    const wellRows: DailyRow[] = days.map((date, d) => {
      const producing = d >= firstProdIdx;
      const t = d - firstProdIdx;
      const noise = 0.75 + 0.5 * rand(w, d, 11);
      const oil = producing
        ? round(
            (qi / (1 + 1.2 * decline * t) ** (1 / 1.2)) *
              noise *
              (t < 25 ? 1.6 : 1),
            2,
          )
        : 0;
      const gas = round(oil * gor * (0.85 + 0.3 * rand(w, d, 12)), 2);
      const water = round(oil * wor * (0.85 + 0.3 * rand(w, d, 13)), 2);

      // ASPM classification is sticky: it changes on ~10% of days.
      if (aspmStartIdx === null || d < aspmStartIdx)
        state = d >= firstProdIdx ? "Undefined" : "Unclassified";
      else if (
        state === "Unclassified" ||
        state === "Undefined" ||
        rand(w, d, 14) < 0.1
      )
        state = pick(ASPM_STATES.slice(0, 4), rand(w, d, 15));

      // Setpoint changes for ASPM wells, with the previous values kept for the report.
      if (aspmStartIdx !== null && d >= aspmStartIdx && rand(w, d, 16) < 0.06) {
        const oldMin = spmMin;
        const oldMax = spmMax;
        // Overpumping slows the pump, underpumping speeds it up; stay inside 0.8–6 SPM.
        let dir =
          state === "Overpumping"
            ? -1
            : state === "Underpumping"
              ? 1
              : rand(w, d, 17) < 0.5
                ? -1
                : 1;
        if (spmMin <= 1) dir = 1;
        if (spmMax >= 5.5) dir = -1;
        spmMin = round(
          Math.min(
            5,
            Math.max(0.8, spmMin + dir * (0.1 + 0.4 * rand(w, d, 18))),
          ),
          1,
        );
        spmMax = round(
          Math.min(
            6,
            Math.max(spmMin + 0.5, spmMax + dir * (0.1 + 0.6 * rand(w, d, 19))),
          ),
          1,
        );
        const initiator: SetpointInitiator =
          rand(w, d, 20) < 0.55 ? "Field Change" : "Auto Accepted";
        if (spmMin !== oldMin || spmMax !== oldMax)
          setpoints.push({
            id: `${w}-${d}-spm`,
            well: name,
            level1: "South Texas",
            level2,
            level3,
            at: new Date(
              Date.parse(date) + Math.floor(rand(w, d, 21) * DAY_MS),
            ).toISOString(),
            initiator,
            kind: "SPM",
            idleTime: null,
            min: spmMin,
            max: spmMax,
            oldIdleTime: null,
            oldMin,
            oldMax,
          });
      }
      if (
        aspmStartIdx !== null &&
        d >= aspmStartIdx &&
        rand(w, d, 22) < 0.015
      ) {
        const oldIdle = idle;
        idle = Math.round(5 + 40 * rand(w, d, 23));
        if (idle !== oldIdle)
          setpoints.push({
            id: `${w}-${d}-idle`,
            well: name,
            level1: "South Texas",
            level2,
            level3,
            at: new Date(
              Date.parse(date) + Math.floor(rand(w, d, 24) * DAY_MS),
            ).toISOString(),
            initiator: "Field Change",
            kind: "Idle Time (min)",
            idleTime: idle,
            min: null,
            max: null,
            oldIdleTime: oldIdle,
            oldMin: null,
            oldMax: null,
          });
      }

      const avgSpm = producing
        ? round(spmMin + (spmMax - spmMin) * rand(w, d, 25), 2)
        : 0;
      const fillage = producing
        ? round(
            state === "Overpumping"
              ? 55 + 25 * rand(w, d, 26)
              : state === "Underpumping"
                ? 92 + 8 * rand(w, d, 26)
                : 78 + 18 * rand(w, d, 26),
            2,
          )
        : 0;
      const runTime = producing ? round(70 + 30 * rand(w, d, 27), 1) : 0;
      const cycles = producing
        ? Math.floor((state === "Overpumping" ? 12 : 3) * rand(w, d, 28) * 3)
        : 0;
      const dailyCardCount = producing
        ? 8 + Math.floor(20 * rand(w, d, 29))
        : 0;
      const strokes = round(avgSpm * 60 * 24 * (runTime / 100), 2);

      const conditions: Partial<Record<PumpCondition, number>> = {};
      if (producing) {
        for (let c = 0; c < PUMP_CONDITIONS.length; c++) {
          const cond = PUMP_CONDITIONS[c];
          const chance =
            cond === "Fluid Pound"
              ? state === "Overpumping"
                ? 0.6
                : 0.08
              : cond === "Gas Interference"
                ? state === "Gas Interference"
                  ? 0.7
                  : 0.05
                : 0.006;
          if (rand(w, d, 40 + c) < chance)
            conditions[cond] =
              1 +
              Math.floor(rand(w, d, 60 + c) * Math.max(1, dailyCardCount / 3));
        }
      }

      return {
        well: name,
        date,
        oil,
        gas,
        water,
        oilTarget: round(qi * 0.55, 2),
        gasTarget: round(qi * 0.55 * gor, 2),
        waterTarget: round(qi * 0.55 * wor, 2),
        cycles,
        automationStatus: pick(AUTOMATION, rand(w, 30)),
        classification: state,
        avgSpm,
        idleTime: idle,
        pocStatus:
          optimizationMode === "POC" ? pick(POC_STATUS, rand(w, d, 31)) : "N/A",
        commStatus: pick(COMM, rand(w, 32)),
        dailyCardCount,
        fillage,
        pocFillage: producing
          ? round(Math.max(0, fillage - 4 * rand(w, d, 33)), 2)
          : 0,
        runTime,
        pumpIntakePressure: producing
          ? round(20 + 180 * rand(w, d, 34) * (fillage / 100), 2)
          : 0,
        rodsInCompression: producing && rand(w, d, 35) < 0.05 ? 1 : 0,
        fluidAbovePump: producing
          ? Math.round(
              state === "Underpumping"
                ? 300 + 900 * rand(w, d, 36)
                : 400 * rand(w, d, 36),
            )
          : 0,
        estimatedTotalStrokes: strokes,
        setpointChanges: 0,
        fluidLoad: producing ? round(55 + 40 * rand(w, d, 37), 1) : 0,
        conditions,
      };
    });

    for (const sp of setpoints) {
      if (sp.well !== name) continue;
      const i = days.indexOf(sp.at.slice(0, 10));
      if (i >= 0) wellRows[i].setpointChanges += 1;
    }

    const last30 = wellRows.slice(-30).filter((r) => r.avgSpm > 0);
    const last = wellRows[wellRows.length - 1];
    wells.push({
      name,
      level1: "South Texas",
      level2,
      level3,
      pumpingUnit: pick(PUMPING_UNITS, rand(w, 50)),
      optimizationMode,
      automationStatus: last.automationStatus,
      commStatus: last.commStatus,
      aspmState: aspmStartIdx === null ? null : last.classification,
      aspmStartDate: aspmStartIdx === null ? null : days[aspmStartIdx],
      avgSpm: last30.length
        ? round(last30.reduce((s, r) => s + r.avgSpm, 0) / last30.length, 2)
        : 0,
    });
    rows.push(wellRows);
  });

  setpoints.sort(
    (a, b) => a.well.localeCompare(b.well) || a.at.localeCompare(b.at),
  );
  return { wells, days, rows, setpoints };
}

export function getDailyRows(date: string, ds = getDataset()): DailyRow[] {
  const i = ds.days.indexOf(date);
  if (i < 0) return [];
  return ds.rows.map((r) => r[i]);
}

/** Aggregates the given wells (all wells when empty) per day between start and end inclusive. */
export function getTrend(
  wellNames: string[],
  start: string,
  end: string,
  ds = getDataset(),
): TrendPoint[] {
  const idx = wellNames.length
    ? ds.wells.flatMap((w, i) => (wellNames.includes(w.name) ? [i] : []))
    : ds.wells.map((_, i) => i);
  const out: TrendPoint[] = [];
  ds.days.forEach((date, d) => {
    if (date < start || date > end) return;
    const day = idx.map((i) => ds.rows[i][d]);
    const live = day.filter((r) => r.avgSpm > 0);
    const n = live.length || 1;
    const sum = (f: (r: DailyRow) => number, rows = day) =>
      rows.reduce((s, r) => s + f(r), 0);
    const avg = (f: (r: DailyRow) => number) => round(sum(f, live) / n, 2);
    const aspm = Object.fromEntries(ASPM_STATES.map((s) => [s, 0])) as Record<
      AspmState,
      number
    >;
    for (const r of day) aspm[r.classification] += 1;
    const oil = round(
      sum((r) => r.oil),
      2,
    );
    const water = round(
      sum((r) => r.water),
      2,
    );
    const strokes = sum((r) => r.estimatedTotalStrokes);
    out.push({
      date,
      oil,
      gas: round(
        sum((r) => r.gas),
        2,
      ),
      water,
      liquid: round(oil + water, 2),
      uptime: avg((r) => r.runTime),
      pumpOffCycles: sum((r) => r.cycles),
      fillage: avg((r) => r.fillage),
      pocFillage: avg((r) => r.pocFillage),
      avgSpm: avg((r) => r.avgSpm),
      setpointChanges: sum((r) => r.setpointChanges),
      pumpIntakePressure: avg((r) => r.pumpIntakePressure),
      fluidAbovePump: avg((r) => r.fluidAbovePump),
      fluidLoad: avg((r) => r.fluidLoad),
      rodsInCompression: sum((r) => r.rodsInCompression),
      estimatedTotalStrokes: round(strokes, 0),
      bblPerStroke: strokes > 0 ? round((oil + water) / strokes, 4) : 0,
      wellCount: live.length,
      aspm,
    });
  });
  return out;
}

export function getSetpoints(
  start: string,
  end: string,
  ds = getDataset(),
): SetpointChange[] {
  return ds.setpoints.filter((s) => {
    const day = s.at.slice(0, 10);
    return day >= start && day <= end;
  });
}
