import { useCallback, useRef, useState } from 'react';
import { addResult, clearHistory, createResult, readHistory, type Outcome } from './historyStorage';

// Held in App so About shows a new result immediately (ADR-4).
export function useHistory() {
  const [initial] = useState(readHistory);
  const [results, setResults] = useState(initial.results);
  const [loadError, setLoadError] = useState(!initial.ok);
  const [saveError, setSaveError] = useState(false);
  const [deleteError, setDeleteError] = useState(false);
  // Storage writes stay outside state updaters, which Strict Mode may run twice.
  const resultsRef = useRef(results);

  const record = useCallback((outcome: Outcome, completedRounds: number) => {
    const saved = addResult(resultsRef.current, createResult(outcome, completedRounds));
    resultsRef.current = saved.results;
    setResults(saved.results);
    setSaveError(!saved.ok);
  }, []);

  // On failure the list stays on screen; a failed delete never looks like a success.
  const clear = useCallback(() => {
    const ok = clearHistory();
    setDeleteError(!ok);
    if (ok) {
      resultsRef.current = [];
      setResults([]);
      setLoadError(false);
    }
    return ok;
  }, []);

  const resetDeleteError = useCallback(() => setDeleteError(false), []);

  return { results, loadError, saveError, deleteError, record, clear, resetDeleteError };
}

export type History = ReturnType<typeof useHistory>;
