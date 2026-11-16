import { FULL_PUMP, NO_PREDICTION } from "@/lib/dynocard/labels";
import { PUMP_CONDITIONS, type PumpCondition } from "@/types/lift";

/**
 * Daily Dashboard pump-condition categories, worked out from classifier labels.
 * Mapping agreed with the business (Nov 2026). Three labels feed two categories each,
 * so one card can count in two tiles:
 *   Tubing Movement      → Card Distortion, Plunger Undertravel
 *   Worn Traveling Valve → Delayed Travelling Valve, Hole in Tubing
 *   Worn Barrel          → Hole in Barrel, Worn Pump
 * Bad Data counts every predicted card that isn't Full Pump.
 */
export const CONDITION_LABELS: Record<
  Exclude<PumpCondition, "Bad Data">,
  string[]
> = {
  "Card Distortion": ["Tubing Movement"],
  "Deep Rod Part": ["Stuck Piston"],
  "Delayed Travelling Valve": ["Worn Traveling Valve"],
  "Hole in Barrel": ["Worn Barrel"],
  "Hole in Tubing": ["Worn Traveling Valve"],
  "Plunger Undertravel": ["Tubing Movement"],
  "Stuck Pump": ["Sticking Pump"],
  "SV Stuck Pump": ["Worn Standing Valve"],
  Tagging: ["Pump Hitting Down"],
  "Worn Pump": ["Worn Barrel"],
  "Fluid Pound": ["Fluid Pound"],
  "Gas Interference": ["Gas Interference"],
};

/** The bits of an uploaded card the tiles need (kept small so it fits in browser storage). */
export interface PredictionCard {
  node: string;
  date: string | null;
  label: string;
}

export interface ConditionWell {
  well: string;
  /** Cards for this well in this category. */
  cards: number;
  /** Most recent card date for this well in this category, as given in the file. */
  lastDate: string | null;
  /** Model labels behind it (empty for sample data). */
  labels: string[];
}

export interface ConditionSummary {
  condition: PumpCondition;
  /** Wells with at least one card in this category, most cards first. */
  wells: ConditionWell[];
  cardCount: number;
  /** Share of all cards, 0–100, rounded. */
  pct: number;
}

const norm = (s: string) => s.trim().toLowerCase();
const isPredicted = (label: string) => {
  const l = norm(label);
  return l !== "" && l !== norm(NO_PREDICTION);
};

export function cardMatches(condition: PumpCondition, label: string): boolean {
  if (!isPredicted(label)) return false;
  if (condition === "Bad Data") return norm(label) !== norm(FULL_PUMP);
  return CONDITION_LABELS[condition].some((l) => norm(l) === norm(label));
}

/** Tiles from uploaded predictions: wells per category and % of predicted cards. */
export function summarizePredictions(
  cards: PredictionCard[],
): ConditionSummary[] {
  const predicted = cards.filter((c) => isPredicted(c.label));
  return PUMP_CONDITIONS.map((condition) => {
    const byWell = new Map<string, ConditionWell>();
    let cardCount = 0;
    for (const c of predicted) {
      if (!cardMatches(condition, c.label)) continue;
      cardCount += 1;
      const w = byWell.get(c.node) ?? {
        well: c.node,
        cards: 0,
        lastDate: null,
        labels: [],
      };
      w.cards += 1;
      if (c.date && (!w.lastDate || c.date > w.lastDate)) w.lastDate = c.date;
      if (!w.labels.includes(c.label.trim())) w.labels.push(c.label.trim());
      byWell.set(c.node, w);
    }
    return {
      condition,
      wells: sortWells([...byWell.values()]),
      cardCount,
      pct: predicted.length
        ? Math.round((cardCount / predicted.length) * 100)
        : 0,
    };
  });
}

export function sortWells(wells: ConditionWell[]): ConditionWell[] {
  return wells.sort(
    (a, b) =>
      b.cards - a.cards ||
      a.well.localeCompare(b.well, undefined, { numeric: true }),
  );
}

/** One well's row in the Daily Dashboard condition table. */
export interface WellConditionRow {
  well: string;
  /** All cards for the well in the file (including any without a prediction). */
  totalCards: number;
  /** Full Pump cards, or null when the source doesn't say (default dashboard data). */
  fullPump: number | null;
  /** Cards per condition. A two-category label counts in both columns. */
  counts: Record<PumpCondition, number>;
}

const emptyCounts = () =>
  Object.fromEntries(PUMP_CONDITIONS.map((c) => [c, 0])) as Record<
    PumpCondition,
    number
  >;

/** Per-well card counts for every condition, from uploaded predictions. */
export function summarizeByWell(cards: PredictionCard[]): WellConditionRow[] {
  const byWell = new Map<string, WellConditionRow>();
  for (const c of cards) {
    const row = byWell.get(c.node) ?? {
      well: c.node,
      totalCards: 0,
      fullPump: 0,
      counts: emptyCounts(),
    };
    row.totalCards += 1;
    if (norm(c.label) === norm(FULL_PUMP))
      row.fullPump = (row.fullPump ?? 0) + 1;
    for (const condition of PUMP_CONDITIONS)
      if (cardMatches(condition, c.label)) row.counts[condition] += 1;
    byWell.set(c.node, row);
  }
  return [...byWell.values()].sort((a, b) =>
    a.well.localeCompare(b.well, undefined, { numeric: true }),
  );
}
