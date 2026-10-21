// Pure history repository over localStorage; every storage access is guarded (ADR-4).

export type Outcome = 'win' | 'loss';

export type GameResult = {
  id: string;
  finishedAt: string; // ISO 8601
  completedRounds: number; // 0–10
  outcome: Outcome;
};

type HistoryData = {
  schemaVersion: 1;
  results: GameResult[];
};

export const HISTORY_KEY = 'simon.history.v1';
export const MAX_RESULTS = 10;

export type StorageResult = { ok: boolean; results: GameResult[] };

function isValidResult(value: unknown): value is GameResult {
  if (typeof value !== 'object' || value === null) return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.id === 'string' &&
    r.id.length > 0 &&
    typeof r.finishedAt === 'string' &&
    !Number.isNaN(Date.parse(r.finishedAt)) &&
    Number.isInteger(r.completedRounds) &&
    (r.completedRounds as number) >= 0 &&
    (r.completedRounds as number) <= 10 &&
    (r.outcome === 'win' || r.outcome === 'loss')
  );
}

// Newest first, at most MAX_RESULTS.
function normalize(results: GameResult[]): GameResult[] {
  return [...results]
    .sort((a, b) => Date.parse(b.finishedAt) - Date.parse(a.finishedAt))
    .slice(0, MAX_RESULTS);
}

// Missing key is an empty history; unreadable or malformed data is reported as a failure.
export function readHistory(): StorageResult {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw === null) return { ok: true, results: [] };
    const data = JSON.parse(raw) as Partial<HistoryData> | null;
    if (!data || data.schemaVersion !== 1 || !Array.isArray(data.results)) {
      return { ok: false, results: [] };
    }
    return { ok: true, results: normalize(data.results.filter(isValidResult)) };
  } catch {
    return { ok: false, results: [] };
  }
}

// Always returns the new list so the current page can show it, even if the write failed.
export function addResult(current: GameResult[], result: GameResult): StorageResult {
  const results = [result, ...current].slice(0, MAX_RESULTS);
  try {
    const data: HistoryData = { schemaVersion: 1, results };
    localStorage.setItem(HISTORY_KEY, JSON.stringify(data));
    return { ok: true, results };
  } catch {
    return { ok: false, results };
  }
}

export function clearHistory(): boolean {
  try {
    localStorage.removeItem(HISTORY_KEY);
    return true;
  } catch {
    return false;
  }
}

// Not crypto.randomUUID: it is unavailable on plain-HTTP LAN addresses (ADR-4).
export function createResult(outcome: Outcome, completedRounds: number, now = new Date()): GameResult {
  return {
    id: `${now.getTime()}-${Math.random().toString(36).slice(2, 10)}`,
    finishedAt: now.toISOString(),
    completedRounds,
    outcome,
  };
}
