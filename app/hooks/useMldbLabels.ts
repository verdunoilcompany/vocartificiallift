"use client";

import { useCardRangeFor } from "@/app/contexts/CardRangeContext";
import { useApi } from "@/app/hooks/useApi";
import { cardRangeError, type CardRange } from "@/lib/dynocard/card-range";
import type { PredictionCard } from "@/lib/dynocard/conditions";
import type { MldbLabelsResponse } from "@/types/dynocard";

export interface MldbLabels {
  /** Well, date and label per card for the range; null until loaded. */
  cards: PredictionCard[] | null;
  loading: boolean;
  error: string | null;
  /** Why the range can't be loaded (e.g. more than 14 days), or null. */
  rangeProblem: string | null;
  range: CardRange;
  setRange: (r: CardRange) => void;
  /** Longest range allowed (all wells: 14 days). */
  maxDays: number;
  fetchedAt: string | null;
  retry: () => void;
}

/**
 * MLDB predictions (no loads) for the shared date range: what the Daily Dashboard's condition
 * tiles and Pump Conditions by Well table count. Same cards the Classifier shows for that range.
 */
export function useMldbLabels(): MldbLabels {
  const { ready, range, setRange, maxDays } = useCardRangeFor(false);
  const rangeProblem = cardRangeError(range, false);
  const q = new URLSearchParams({ from: range.from, to: range.to });
  const api = useApi<MldbLabelsResponse>(
    ready && !rangeProblem ? `/api/mldb/predictions?${q.toString()}` : null,
  );
  return {
    cards: rangeProblem ? null : (api.data?.cards ?? null),
    loading: !rangeProblem && (!ready || api.isLoading || (!api.data && !api.error)),
    error: rangeProblem ? null : api.error,
    rangeProblem,
    range,
    setRange,
    maxDays,
    fetchedAt: api.data?.fetchedAt ?? null,
    retry: api.retry,
  };
}
