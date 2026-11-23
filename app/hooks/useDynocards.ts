"use client";

import { useCardRangeFor } from "@/app/contexts/CardRangeContext";
import { useApi } from "@/app/hooks/useApi";
import { cardRangeError } from "@/lib/dynocard/card-range";
import type {
  DynoCard,
  MldbCardsResponse,
  ModelReference,
} from "@/types/dynocard";

/** "invalid": the date range can't be loaded (see `rangeProblem`); nothing is fetched. */
export type LoadState = "loading" | "ready" | "error" | "invalid";

const EMPTY: DynoCard[] = [];

/**
 * Dynocards from MLDB (dyno.Prediction) for the shared date range (CardRangeContext),
 * optionally one well, plus the model reference. Used by the Classifier and the Explorer.
 */
export function useDynocards(well: string | null) {
  const { ready, range, setRange, maxDays } = useCardRangeFor(Boolean(well));
  const rangeProblem = cardRangeError(range, Boolean(well));
  const query = new URLSearchParams({ from: range.from, to: range.to });
  if (well) query.set("well", well);

  const modelApi = useApi<ModelReference>("/api/model");
  const cardsApi = useApi<MldbCardsResponse>(
    ready && !rangeProblem ? `/api/mldb/cards?${query.toString()}` : null,
  );

  const error = modelApi.error ?? cardsApi.error;
  const state: LoadState = rangeProblem
    ? "invalid"
    : error
      ? "error"
      : !ready || modelApi.isLoading || cardsApi.isLoading || !cardsApi.data
        ? "loading"
        : "ready";

  return {
    cards: cardsApi.data?.cards ?? EMPTY,
    model: modelApi.data,
    state,
    error,
    rangeProblem,
    range,
    setRange,
    maxDays,
    fetchedAt: cardsApi.data?.fetchedAt ?? null,
    retry: () => {
      if (modelApi.error) modelApi.retry();
      cardsApi.retry();
    },
  };
}
