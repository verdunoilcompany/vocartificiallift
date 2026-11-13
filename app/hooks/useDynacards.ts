"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { apiUrl } from "@/lib/api";
import type { ApiError, CardSource, CardsResponse, DynaCard, ModelReference } from "@/types/dynacard";

export type LoadState = "loading" | "ready" | "error";

async function readJson<T>(res: Response): Promise<T> {
  const body = (await res.json().catch(() => null)) as T | ApiError | null;
  if (!res.ok || body == null) {
    const message = body && "error" in (body as ApiError) ? (body as ApiError).error : `Request failed (${res.status}).`;
    throw new Error(message);
  }
  return body as T;
}

/** Loads the sample cards + model reference, and handles CSV/XLSX uploads. */
export function useDynacards() {
  const [cards, setCards] = useState<DynaCard[]>([]);
  const [model, setModel] = useState<ModelReference | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<{ kind: CardSource; fileName?: string }>({ kind: "sample" });
  const [uploading, setUploading] = useState(false);
  // Each card request gets a sequence number when it starts. A successful response replaces
  // the cards only if nothing newer has already been applied, so a slow sample load can't
  // overwrite a file uploaded in the meantime, while a failed upload leaves things as they were.
  const seq = useRef(0);
  const applied = useRef(0);
  const claim = useCallback((n: number) => {
    if (n <= applied.current) return false;
    applied.current = n;
    return true;
  }, []);

  const loadSample = useCallback(async () => {
    const mine = ++seq.current;
    setState("loading");
    setError(null);
    try {
      const [cardsRes, modelRes] = await Promise.all([fetch(apiUrl("/api/cards")), fetch(apiUrl("/api/model"))]);
      const data = await readJson<CardsResponse>(cardsRes);
      const ref = await readJson<ModelReference>(modelRes);
      setModel(ref);
      if (claim(mine)) {
        setCards(data.cards);
        setSource({ kind: "sample" });
      }
      setState("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the cards.");
      setState("error");
    }
  }, [claim]);

  const showSample = useCallback(async () => {
    const mine = ++seq.current;
    try {
      const data = await readJson<CardsResponse>(await fetch(apiUrl("/api/cards")));
      if (!claim(mine)) return;
      setCards(data.cards);
      setSource({ kind: "sample" });
      toast.success(`Showing ${data.cards.length} sample cards.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load the sample cards.");
    }
  }, [claim]);

  const upload = useCallback(async (file: File) => {
    const mine = ++seq.current;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const data = await readJson<CardsResponse>(
        await fetch(apiUrl("/api/cards/upload"), { method: "POST", body: form }),
      );
      if (!claim(mine)) return false;
      setCards(data.cards);
      setSource({ kind: "upload", fileName: data.fileName ?? file.name });
      const flagged = data.cards.filter((c) => c.note).length;
      toast.success(`Loaded ${data.cards.length} cards from ${file.name}.`, {
        description: flagged ? `${flagged} flagged for review.` : undefined,
      });
      return true;
    } catch (err) {
      toast.error("Could not load the file.", {
        description: err instanceof Error ? err.message : undefined,
      });
      return false;
    } finally {
      setUploading(false);
    }
  }, [claim]);

  useEffect(() => {
    void loadSample();
  }, [loadSample]);

  return { cards, model, state, error, source, uploading, upload, showSample, retry: loadSample };
}
