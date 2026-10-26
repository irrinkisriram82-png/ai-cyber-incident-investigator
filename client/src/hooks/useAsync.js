import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Run an async loader on mount (and whenever `deps` change) and track loading / error / data.
 * Returns { data, error, loading, reload, setData }.
 * Stale responses are ignored, so a slow earlier request can never overwrite a newer one.
 */
export function useAsync(loader, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const runId = useRef(0);

  const run = useCallback(() => {
    const id = ++runId.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    Promise.resolve()
      .then(loader)
      .then(
        (data) => id === runId.current && setState({ data, error: null, loading: false }),
        (error) => id === runId.current && setState({ data: null, error, loading: false }),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    run();
    return () => {
      runId.current += 1; // invalidate in-flight request on unmount / dep change
    };
  }, [run]);

  const setData = useCallback((updater) => {
    setState((s) => ({ ...s, data: typeof updater === 'function' ? updater(s.data) : updater }));
  }, []);

  return { ...state, reload: run, setData };
}
