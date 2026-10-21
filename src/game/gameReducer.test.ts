import { gameReducer, initialGameState, type GameState } from './gameReducer';
import type { ColorId } from './colors';

const started = (first: ColorId = 'green') => gameReducer(initialGameState, { type: 'start', firstColor: first });

const ready = (state: GameState) =>
  gameReducer(state, { type: 'presentationDone', presentationId: state.presentationId });

// Replays the current sequence correctly, appending `next` when the round completes.
function completeRound(state: GameState, next: ColorId): GameState {
  let s = ready(state);
  for (const color of s.sequence) s = gameReducer(s, { type: 'press', color, nextColor: next });
  return s;
}

describe('gameReducer', () => {
  it('starts with a single-color sequence in round 1', () => {
    const s = started('red');
    expect(s).toMatchObject({ status: 'presenting', sequence: ['red'], round: 1, completedRounds: 0, intro: 'start' });
    expect(s.gameId).toBe(1);
  });

  it('grows the sequence by one color per round, keeping the previous one as prefix', () => {
    let s = started('red');
    s = completeRound(s, 'red'); // repeated color is allowed
    expect(s.round).toBe(2);
    expect(s.sequence).toEqual(['red', 'red']);
    expect(s).toMatchObject({ status: 'presenting', intro: 'advance', completedRounds: 1 });

    const nexts: ColorId[] = ['blue', 'yellow', 'green', 'blue', 'red', 'green', 'yellow', 'blue'];
    for (const next of nexts) {
      const before = s.sequence;
      s = completeRound(s, next);
      expect(s.sequence.slice(0, before.length)).toEqual(before);
      expect(s.sequence).toHaveLength(before.length + 1);
    }
    expect(s.round).toBe(10);
    expect(s.sequence).toHaveLength(10);
  });

  it('ignores presses while presenting', () => {
    const s = started('green');
    expect(gameReducer(s, { type: 'press', color: 'green', nextColor: 'red' })).toBe(s);
    expect(gameReducer(s, { type: 'press', color: 'blue', nextColor: 'red' })).toBe(s);
  });

  it('ignores a stale presentationDone', () => {
    const s = started();
    expect(gameReducer(s, { type: 'presentationDone', presentationId: s.presentationId - 1 })).toBe(s);
  });

  it('advances input on a correct press without changing round', () => {
    let s = completeRound(started('green'), 'red');
    s = ready(s);
    s = gameReducer(s, { type: 'press', color: 'green', nextColor: 'blue' });
    expect(s).toMatchObject({ status: 'awaitingInput', inputIndex: 1, round: 2 });
  });

  it('loses with 0 completed rounds on a wrong press in round 1', () => {
    const s = gameReducer(ready(started('green')), { type: 'press', color: 'blue', nextColor: 'red' });
    expect(s).toMatchObject({ status: 'lost', completedRounds: 0, round: 1 });
  });

  it('loses with round-1 completed rounds on a later round', () => {
    let s = started('green');
    for (let i = 0; i < 4; i++) s = completeRound(s, 'green');
    expect(s.round).toBe(5);
    s = ready(s);
    s = gameReducer(s, { type: 'press', color: 'green', nextColor: 'red' });
    s = gameReducer(s, { type: 'press', color: 'red', nextColor: 'red' });
    expect(s).toMatchObject({ status: 'lost', completedRounds: 4, round: 5 });
  });

  it('wins after completing round 10, with no round 11', () => {
    let s = started('yellow');
    for (let i = 0; i < 9; i++) s = completeRound(s, 'yellow');
    s = completeRound(s, 'yellow');
    expect(s).toMatchObject({ status: 'won', completedRounds: 10, round: 10 });
    expect(s.sequence).toHaveLength(10);
    expect(gameReducer(s, { type: 'press', color: 'yellow', nextColor: 'yellow' })).toBe(s);
  });

  it('dismiss returns to idle and the next start gets a new game and sequence', () => {
    const lost = gameReducer(ready(started('green')), { type: 'press', color: 'red', nextColor: 'red' });
    const idle = gameReducer(lost, { type: 'dismiss' });
    expect(idle).toMatchObject({ status: 'idle', sequence: [], round: 1, completedRounds: 0, gameId: lost.gameId });

    const next = gameReducer(idle, { type: 'start', firstColor: 'blue' });
    expect(next.sequence).toEqual(['blue']);
    expect(next.gameId).toBe(lost.gameId + 1);
    expect(next.presentationId).toBeGreaterThan(lost.presentationId);
  });

  it('dismiss does nothing during an active game; start does nothing after start', () => {
    const s = started();
    expect(gameReducer(s, { type: 'dismiss' })).toBe(s);
    expect(gameReducer(s, { type: 'start', firstColor: 'red' })).toBe(s);
  });

  it('cancel resets an active game but not a finished one', () => {
    const s = ready(started());
    expect(gameReducer(s, { type: 'cancel' })).toMatchObject({ status: 'idle', round: 1 });
    const lost = gameReducer(s, { type: 'press', color: 'red', nextColor: 'red' });
    expect(gameReducer(lost, { type: 'cancel' })).toBe(lost);
  });
});
