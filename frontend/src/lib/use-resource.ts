"use client";

import { useEffect, useState } from "react";

export function useResource<T>(
  load: (signal: AbortSignal) => Promise<T>,
  keys: string,
) {
  const [state, setState] = useState<{
    data?: T;
    error?: string;
    key?: string;
  }>({});
  const [version, setVersion] = useState(0);
  const key = `${keys}:${version}`;
  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setState({ data, key });
      },
      (error: unknown) => {
        if (!controller.signal.aborted)
          setState({
            error:
              error instanceof Error ? error.message : "No se pudieron cargar los datos.",
            key,
          });
      },
    );
    return () => controller.abort();
    // The explicit resource key defines when the request changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return {
    data: state.key === key ? state.data : undefined,
    error: state.key === key ? state.error : undefined,
    reload: () => setVersion((v) => v + 1),
  };
}
