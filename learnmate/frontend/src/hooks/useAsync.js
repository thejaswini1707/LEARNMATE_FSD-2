import { useCallback, useEffect, useState } from "react";
import { subscribe } from "../services/storage";

/*
  Loads data with loading / error states and re-fetches whenever any of the
  `watch` storage keys change, so the UI updates the moment data changes.
  `fn` must be stable (wrap it in useCallback).
*/
export function useAsync(fn, watch = []) {
  const [state, setState] = useState({ data: null, error: null, done: false });
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  const watchKey = watch.join("|");

  useEffect(() => {
    let cancelled = false;
    fn()
      .then((data) => { if (!cancelled) setState({ data, error: null, done: true }); })
      .catch((error) => { if (!cancelled) setState((prev) => ({ data: prev.data, error, done: true })); });
    return () => { cancelled = true; };
  }, [fn, tick]);

  useEffect(() => {
    if (!watchKey) return undefined;
    return subscribe(watchKey.split("|"), reload);
  }, [watchKey, reload]);

  return { data: state.data, error: state.error, loading: !state.done, reload };
}
