"use client";

import { useCallback, useEffect, useState } from "react";
import { apiUrl } from "@/lib/api";

export interface ApiState<T> {
  data: T | null;
  error: string | null;
  isLoading: boolean;
  retry: () => void;
}

/**
 * GETs an API path (without basePath) and returns its JSON. Pass `null` to skip the request.
 * A newer path aborts the older request, so stale responses never overwrite fresh ones.
 */
export function useApi<T>(path: string | null): ApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(path !== null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (path === null) {
      setData(null);
      setError(null);
      setIsLoading(false);
      return;
    }
    const ctrl = new AbortController();
    setIsLoading(true);
    setError(null);
    fetch(apiUrl(path), { signal: ctrl.signal, cache: "no-store" })
      .then(async (res) => {
        const body = (await res.json().catch(() => null)) as
          (T & { error?: string }) | null;
        if (!res.ok || !body)
          throw new Error(body?.error ?? `Request failed (${res.status}).`);
        setData(body);
      })
      .catch((err: unknown) => {
        if (ctrl.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Request failed.");
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setIsLoading(false);
      });
    return () => ctrl.abort();
  }, [path, attempt]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);
  return { data, error, isLoading, retry };
}
