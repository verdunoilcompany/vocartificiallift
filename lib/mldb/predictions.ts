import "server-only";

import { mldbQuery } from "@/lib/mldb/connection";
import { sqlDateTimeToText } from "@/lib/mssql";
import type { CardRange } from "@/lib/dynocard/card-range";
import type { PredictionCard } from "@/lib/dynocard/conditions";
import { NO_PREDICTION } from "@/lib/dynocard/labels";
import { LOAD_BINS, type DynoCard } from "@/types/dynocard";

/** Dynocard predictions from MLDB.dyno.Prediction (one row per card; only ModelId 1 so far). */

const LOAD_COLS = Array.from({ length: LOAD_BINS }, (_, i) => `[L${i}]`).join(", ");

// CardCreatedDate is a wall-clock DATETIME: compare it with whole days, no timezone math.
// Dates are passed as text and cast in SQL so the driver can't shift them.
const RANGE_WHERE = `
  CardCreatedDate >= CAST(@from AS date)
  AND CardCreatedDate < DATEADD(day, 1, CAST(@to AS date))`;

interface CardRow {
  PredictionId: string | number;
  NodeID: string | null;
  CardCreatedDate: Date | null;
  PredictedLabel: string | null;
  [load: `L${number}`]: number | null;
}

const round4 = (n: number | null) =>
  n == null || !Number.isFinite(n) ? 0 : Math.round(n * 10_000) / 10_000;

/** Full cards (with the 50 loads) for the range, newest first; optionally one well. */
export async function getPredictionCards(
  range: CardRange,
  well?: string | null,
): Promise<DynoCard[]> {
  const rows = await mldbQuery<CardRow>(
    `SELECT PredictionId, NodeID, CardCreatedDate, PredictedLabel, ${LOAD_COLS}
     FROM [dyno].[Prediction]
     WHERE ${RANGE_WHERE}${well ? " AND NodeID = @well" : ""}
     ORDER BY CardCreatedDate DESC, PredictionId DESC`,
    { from: range.from, to: range.to, ...(well ? { well } : {}) },
  );
  return rows.map((r) => ({
    id: `p${r.PredictionId}`,
    row: String(r.PredictionId),
    node: (r.NodeID ?? "").trim(),
    date: sqlDateTimeToText(r.CardCreatedDate) ?? "",
    spm: null,
    fill: null,
    label: r.PredictedLabel?.trim() || NO_PREDICTION,
    L: Array.from({ length: LOAD_BINS }, (_, i) => round4(r[`L${i}`])),
  }));
}

/** Well, date and label only (no loads), for the Daily Dashboard tiles and table. */
export async function getPredictionLabels(
  range: CardRange,
): Promise<PredictionCard[]> {
  const rows = await mldbQuery<Omit<CardRow, "PredictionId">>(
    `SELECT NodeID, CardCreatedDate, PredictedLabel
     FROM [dyno].[Prediction]
     WHERE ${RANGE_WHERE}
     ORDER BY CardCreatedDate DESC, PredictionId DESC`,
    { from: range.from, to: range.to },
  );
  return rows.map((r) => ({
    node: (r.NodeID ?? "").trim(),
    date: sqlDateTimeToText(r.CardCreatedDate),
    label: r.PredictedLabel?.trim() || NO_PREDICTION,
  }));
}

export interface PredictionWell {
  well: string;
  cards: number;
  /** Latest card, "YYYY-MM-DD HH:mm:ss" wall-clock. */
  lastCard: string | null;
}

/** Every well that has cards, A–Z. */
export async function getPredictionWells(): Promise<PredictionWell[]> {
  const rows = await mldbQuery<{
    NodeID: string | null;
    n: number;
    lastCard: Date | null;
  }>(
    `SELECT NodeID, COUNT(*) AS n, MAX(CardCreatedDate) AS lastCard
     FROM [dyno].[Prediction]
     WHERE NodeID IS NOT NULL AND LTRIM(RTRIM(NodeID)) <> ''
     GROUP BY NodeID`,
  );
  return rows
    .map((r) => ({
      well: (r.NodeID ?? "").trim(),
      cards: r.n,
      lastCard: sqlDateTimeToText(r.lastCard),
    }))
    .sort((a, b) =>
      a.well.localeCompare(b.well, undefined, { numeric: true }),
    );
}
