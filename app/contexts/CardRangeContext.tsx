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

import {
  clampRange,
  defaultCardRange,
  isDay,
  maxDaysFor,
  rangeDays,
  type CardRange,
} from "@/lib/dynocard/card-range";

/**
 * The MLDB date range shared by the Dynocard Classifier, Dynocard Explorer and the Daily
 * Dashboard's condition tiles and per-well table, so all three always show the same cards.
 * Kept in this browser (localStorage), so every page and every open tab uses the same dates;
 * changing them anywhere updates the rest. First visit: yesterday–today.
 */
interface Ctx {
  /** False until the saved range has been read; wait for it before fetching. */
  ready: boolean;
  range: CardRange;
  setRange: (r: CardRange) => void;
}

const KEY = "voc-card-range";
const CardRangeContext = createContext<Ctx | undefined>(undefined);

export function CardRangeProvider({ children }: { children: ReactNode }) {
  const [range, setRangeState] = useState<CardRange>(() => defaultCardRange());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const load = () => {
      try {
        const saved = JSON.parse(localStorage.getItem(KEY) ?? "null") as
          | Partial<CardRange>
          | null;
        if (saved && isDay(saved.from) && isDay(saved.to)) {
          const { from, to } = saved;
          // Keep the same object when nothing changed, so pages don't reload for nothing.
          setRangeState((r) =>
            r.from === from && r.to === to ? r : { from, to },
          );
        }
      } catch {
        /* storage blocked: keep the current range */
      }
    };
    load();
    setReady(true);
    // Dates changed in another tab: follow them.
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY || e.key === null) load();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setRange = useCallback((r: CardRange) => {
    setRangeState(r);
    try {
      localStorage.setItem(KEY, JSON.stringify(r));
    } catch {
      /* storage blocked: still works until the page is reloaded */
    }
  }, []);

  const value = useMemo(
    () => ({ ready, range, setRange }),
    [ready, range, setRange],
  );
  return (
    <CardRangeContext.Provider value={value}>
      {children}
    </CardRangeContext.Provider>
  );
}

export function useCardRange(): Ctx {
  const ctx = useContext(CardRangeContext);
  if (!ctx) throw new Error("useCardRange must be used inside CardRangeProvider");
  return ctx;
}

/**
 * The shared range fitted to the current limit: 14 days for all wells, 365 for one well.
 * A longer saved range (e.g. one well's year, then back to all wells) is cut to the last
 * `maxDays` days right away, so nothing invalid is ever fetched.
 */
export function useCardRangeFor(oneWell: boolean) {
  const { ready, range: saved, setRange } = useCardRange();
  const maxDays = maxDaysFor(oneWell);
  const tooLong = rangeDays(saved) > maxDays || saved.from > saved.to;
  const range = useMemo(
    () => (tooLong ? clampRange(saved, maxDays) : saved),
    [saved, maxDays, tooLong],
  );
  useEffect(() => {
    if (tooLong) setRange(range);
  }, [tooLong, range, setRange]);
  return { ready, range, setRange, maxDays };
}
