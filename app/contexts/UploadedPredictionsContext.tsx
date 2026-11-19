"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { apiUrl } from "@/lib/api";
import { idbDelete, idbGet, idbSet } from "@/lib/browser-db";
import type { PredictionCard } from "@/lib/dynocard/conditions";
import type { DynoCard } from "@/types/dynocard";

/**
 * The last predictions file uploaded on the Dynocard Classifier or Explorer, shared across
 * pages: the Daily Dashboard tiles/table use well/date/label per card, and the Classifier and
 * Explorer reopen the full cards (e.g. when a tile links to them), so all three always show the
 * same file. Kept only in this browser (IndexedDB, which holds large files such as 10,000
 * cards; nothing is stored on the server). Other open tabs follow along. "Show sample cards"
 * or "Use default data" clears it.
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
  /** Full uploaded cards (with loads), or null if none or they couldn't be kept. */
  uploadedCards: DynoCard[] | null;
  setFromCards: (fileName: string, cards: DynoCard[]) => void;
  clear: () => void;
  /**
   * Default for the dashboard tiles/table when nothing is uploaded: the same 25 sample cards
   * the Classifier shows. Loaded once, only when needed.
   */
  defaultPredictions: DefaultPredictions | null;
  defaultError: string | null;
}

export interface DefaultPredictions {
  fileName: string;
  cards: PredictionCard[];
}

/** IndexedDB record: the whole upload, cards included. */
interface StoredUpload {
  fileName: string;
  uploadedAt: string;
  cards: DynoCard[];
}

const IDB_KEY = "uploaded-predictions";
/** Small localStorage marker (the upload time) so other tabs notice uploads and clears. */
const MARKER_KEY = "voc-uploaded-marker";
/** Older versions kept the upload in localStorage (too small for large files); removed on load. */
const LEGACY_PREDICTIONS_KEY = "voc-uploaded-predictions";
const LEGACY_CARDS_KEY = "voc-uploaded-cards";

const UploadedPredictionsContext = createContext<Ctx | undefined>(undefined);

function lsSet(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* storage full or blocked: still works for this visit */
  }
}

const slim = (cards: DynoCard[]): PredictionCard[] =>
  cards.map((c) => ({ node: c.node, date: c.date || null, label: c.label }));

/**
 * Reads the saved upload from IndexedDB. Only a complete upload (full cards) counts, so the
 * Dashboard, Classifier and Explorer can never disagree. Leftovers from older versions, which
 * kept only the tile summary in localStorage, are deleted.
 */
async function loadSaved(): Promise<{
  predictions: UploadedPredictions | null;
  cards: DynoCard[] | null;
}> {
  lsSet(LEGACY_PREDICTIONS_KEY, null);
  lsSet(LEGACY_CARDS_KEY, null);
  const stored = await idbGet<StoredUpload>(IDB_KEY);
  if (stored && Array.isArray(stored.cards) && stored.cards.length > 0) {
    return {
      predictions: {
        fileName: stored.fileName,
        uploadedAt: stored.uploadedAt,
        cards: slim(stored.cards),
      },
      cards: stored.cards,
    };
  }
  return { predictions: null, cards: null };
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
  // Bumped by every change made here, so a slower read can't overwrite a newer upload/clear.
  const version = useRef(0);

  const reload = useCallback(async () => {
    const mine = ++version.current;
    const saved = await loadSaved();
    if (mine !== version.current) return;
    setPredictions(saved.predictions);
    setUploadedCards(saved.cards);
    setReady(true);
  }, []);

  useEffect(() => {
    void reload();
    // Another tab uploaded or cleared a file: follow it.
    const onStorage = (e: StorageEvent) => {
      if (e.key === MARKER_KEY || e.key === null) void reload();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [reload]);

  const setFromCards = useCallback((fileName: string, cards: DynoCard[]) => {
    version.current++;
    const uploadedAt = new Date().toISOString();
    const value: UploadedPredictions = {
      fileName,
      uploadedAt,
      cards: slim(cards),
    };
    setPredictions(value);
    setUploadedCards(cards);
    setReady(true);
    void idbSet(IDB_KEY, { fileName, uploadedAt, cards } satisfies StoredUpload)
      // If IndexedDB is unavailable the upload still works on every page for this visit;
      // after a reload all pages go back to the samples together.
      .then((ok) => {
        if (ok) lsSet(MARKER_KEY, uploadedAt);
      });
  }, []);

  // Fetch the sample cards the first time they're needed (no upload in this browser).
  const needDefault = ready && !predictions && !defaultPredictions;
  useEffect(() => {
    if (!needDefault) return;
    let cancelled = false;
    fetch(apiUrl("/api/cards"))
      .then(async (res) => {
        if (!res.ok) throw new Error(`Request failed (${res.status}).`);
        const body = (await res.json()) as { cards: DynoCard[] };
        return {
          fileName: "sample cards",
          cards: slim(body.cards),
        } satisfies DefaultPredictions;
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
    version.current++;
    setPredictions(null);
    setUploadedCards(null);
    lsSet(LEGACY_PREDICTIONS_KEY, null);
    lsSet(LEGACY_CARDS_KEY, null);
    void idbDelete(IDB_KEY).then(() => lsSet(MARKER_KEY, null));
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
