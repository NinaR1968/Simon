import {
  HISTORY_KEY,
  addResult,
  clearHistory,
  createResult,
  readHistory,
  type GameResult,
} from './historyStorage';

function result(minute: number, outcome: GameResult['outcome'] = 'loss', completedRounds = 3): GameResult {
  return createResult(outcome, completedRounds, new Date(2026, 9, 21, 12, minute));
}

const stored = () => JSON.parse(localStorage.getItem(HISTORY_KEY)!);

describe('historyStorage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reads an empty history when the key is missing', () => {
    expect(readHistory()).toEqual({ ok: true, results: [] });
  });

  it('adds results newest first under the versioned key', () => {
    const first = addResult([], result(1));
    const second = addResult(first.results, result(2, 'win', 10));
    expect(second.ok).toBe(true);
    expect(stored().schemaVersion).toBe(1);
    expect(stored().results.map((r: GameResult) => r.outcome)).toEqual(['win', 'loss']);
    expect(readHistory().results).toEqual(second.results);
  });

  it('keeps at most 10 results, dropping the oldest', () => {
    let list: GameResult[] = [];
    const all: GameResult[] = [];
    for (let i = 0; i < 11; i++) {
      const r = result(i);
      all.push(r);
      list = addResult(list, r).results;
    }
    const read = readHistory().results;
    expect(read).toHaveLength(10);
    expect(read[0].id).toBe(all[10].id);
    expect(read.map((r) => r.id)).not.toContain(all[0].id);
  });

  it('reports malformed data as a failure, and the next save writes a valid list', () => {
    localStorage.setItem(HISTORY_KEY, '{not json');
    expect(readHistory()).toEqual({ ok: false, results: [] });
    localStorage.setItem(HISTORY_KEY, JSON.stringify({ schemaVersion: 2, results: [] }));
    expect(readHistory().ok).toBe(false);

    const saved = addResult([], result(5));
    expect(saved.ok).toBe(true);
    expect(readHistory()).toEqual({ ok: true, results: saved.results });
  });

  it('filters out invalid records', () => {
    const good = result(1);
    localStorage.setItem(
      HISTORY_KEY,
      JSON.stringify({
        schemaVersion: 1,
        results: [
          good,
          { ...good, id: 'a', outcome: 'draw' },
          { ...good, id: 'b', completedRounds: 11 },
          { ...good, id: 'c', completedRounds: 2.5 },
          { ...good, id: 'd', finishedAt: 'yesterday' },
          null,
        ],
      }),
    );
    expect(readHistory()).toEqual({ ok: true, results: [good] });
  });

  it('clears the history', () => {
    addResult([], result(1));
    expect(clearHistory()).toBe(true);
    expect(localStorage.getItem(HISTORY_KEY)).toBeNull();
  });

  it('never throws when storage is unavailable', () => {
    const fail = () => {
      throw new Error('blocked');
    };
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(fail);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(fail);
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(fail);

    expect(readHistory()).toEqual({ ok: false, results: [] });
    const r = result(1);
    expect(addResult([], r)).toEqual({ ok: false, results: [r] });
    expect(clearHistory()).toBe(false);
  });

  it('creates results with an ISO time and unique ids', () => {
    const now = new Date(2026, 9, 21, 14, 32);
    const a = createResult('win', 10, now);
    const b = createResult('win', 10, now);
    expect(a.finishedAt).toBe(now.toISOString());
    expect(a).toMatchObject({ outcome: 'win', completedRounds: 10 });
    expect(a.id).not.toBe(b.id);
  });
});
