"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/api";

interface State<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
}

/**
 * Small data-fetching hook: loads once, exposes `reload`, and normalises errors.
 * Keeps every component's loading/error handling consistent.
 */
export function useApiResource<T>(
  loader: () => Promise<T>,
  dependencies: unknown[] = [],
): State<T> & { reload: () => void; setData: (value: T) => void } {
  const [state, setState] = useState<State<T>>({ data: null, loading: true, error: null });
  const [nonce, setNonce] = useState(0);

  // The loader is intentionally not a dependency: callers pass inline closures.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const memoLoader = useCallback(loader, dependencies);

  useEffect(() => {
    let active = true;
    setState((current) => ({ ...current, loading: true, error: null }));
    memoLoader()
      .then((data) => {
        if (active) setState({ data, loading: false, error: null });
      })
      .catch((error: unknown) => {
        if (!active) return;
        const apiError =
          error instanceof ApiError
            ? error
            : new ApiError(0, null, (error as Error)?.message ?? "Unexpected error.");
        setState({ data: null, loading: false, error: apiError });
      });
    return () => {
      active = false;
    };
  }, [memoLoader, nonce]);

  return {
    ...state,
    reload: () => setNonce((value) => value + 1),
    setData: (value: T) => setState({ data: value, loading: false, error: null }),
  };
}
