"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { apiUrl } from "@/lib/api";
import type { PredictionCard } from "@/lib/dynocard/conditions";
import type { DynoCard } from "@/types/dynocard";

/**
 * The last predictions file uploaded on the Dynocard Classifier or Explorer, shared across
 * pages: the Daily Dashboard condition tiles use well/date/label per card, and the Classifier
 * and Explorer reopen the full cards (e.g. when a tile links to them). Saved in this browser so
 * it survives page changes and reloads. "Show sample cards" clears it.
 */
export interface UploadedPredictions {
  fileName: string;
  /** ISO time of the upload. */
  uploadedAt: string;
  cards: PredictionCard[];
}

interface Ctx {
  /** False until browser storage has been read; wait for it before choosing what to show. */
  ready: boolean;
  predictions: UploadedPredictions | null;
  /** Full uploaded cards (with loads), or null if none or too large to keep after a reload. */
  uploadedCards: DynoCard[] | null;
  setFromCards: (fileName: string, cards: DynoCard[]) => void;
  clear: () => void;
  /**
   * Bundled default for the dashboard tiles/table when nothing is uploaded
   * (test_predictions.csv). Loaded once, only when needed.
   */
  defaultPredictions: DefaultPredictions | null;
  defaultError: string | null;
}

export interface DefaultPredictions {
  fileName: string;
  cards: PredictionCard[];
}

const STORAGE_KEY = "voc-uploaded-predictions";
const CARDS_KEY = "voc-uploaded-cards";
const UploadedPredictionsContext = createContext<Ctx | undefined>(undefined);

function store(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked: still works for this visit, just not after a reload */
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
}

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function UploadedPredictionsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [ready, setReady] = useState(false);
  const [predictions, setPredictions] = useState<UploadedPredictions | null>(
    null,
  );
  const [uploadedCards, setUploadedCards] = useState<DynoCard[] | null>(null);
  const [defaultPredictions, setDefaultPredictions] =
    useState<DefaultPredictions | null>(null);
  const [defaultError, setDefaultError] = useState<string | null>(null);

  useEffect(() => {
    setPredictions(read<UploadedPredictions>(STORAGE_KEY));
    setUploadedCards(read<DynoCard[]>(CARDS_KEY));
    setReady(true);
  }, []);

  const setFromCards = useCallback((fileName: string, cards: DynoCard[]) => {
    const value: UploadedPredictions = {
      fileName,
      uploadedAt: new Date().toISOString(),
      cards: cards.map((c) => ({
        node: c.node,
        date: c.date || null,
        label: c.label,
      })),
    };
    setPredictions(value);
    setUploadedCards(cards);
    store(STORAGE_KEY, value);
    store(CARDS_KEY, cards);
  }, []);

  // Fetch the bundled default the first time it's needed (no upload in this browser).
  const needDefault = ready && !predictions && !defaultPredictions;
  useEffect(() => {
    if (!needDefault) return;
    let cancelled = false;
    fetch(apiUrl("/api/cards/default-predictions"))
      .then(async (res) => {
        if (!res.ok) throw new Error(`Request failed (${res.status}).`);
        return (await res.json()) as DefaultPredictions;
      })
      .then((d) => {
        if (!cancelled) setDefaultPredictions(d);
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setDefaultError(
            err instanceof Error
              ? err.message
              : "Could not load the default data.",
          );
      });
    return () => {
      cancelled = true;
    };
  }, [needDefault]);

  const clear = useCallback(() => {
    setPredictions(null);
    setUploadedCards(null);
    store(STORAGE_KEY, null);
    store(CARDS_KEY, null);
  }, []);

  const value = useMemo(
    () => ({
      ready,
      predictions,
      uploadedCards,
      setFromCards,
      clear,
      defaultPredictions,
      defaultError,
    }),
    [
      ready,
      predictions,
      uploadedCards,
      setFromCards,
      clear,
      defaultPredictions,
      defaultError,
    ],
  );
  return (
    <UploadedPredictionsContext.Provider value={value}>
      {children}
    </UploadedPredictionsContext.Provider>
  );
}

export function useUploadedPredictions(): Ctx {
  const ctx = useContext(UploadedPredictionsContext);
  if (!ctx)
    throw new Error(
      "useUploadedPredictions must be used inside UploadedPredictionsProvider",
    );
  return ctx;
}
