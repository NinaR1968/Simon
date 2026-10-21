import { playSequence } from './playSequence';
import { startTone } from '../audio/audioEngine';
import type { ColorId } from './colors';

vi.mock('../audio/audioEngine', () => ({ startTone: vi.fn() }));

const stopTone = vi.fn();

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(startTone).mockReset().mockReturnValue(stopTone);
  stopTone.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

// Records [time, light] for each onLight call.
function run(sequence: ColorId[], signal = new AbortController().signal) {
  const log: [number, ColorId | null][] = [];
  const t0 = Date.now();
  const done = playSequence(sequence, { signal, onLight: (c) => log.push([Date.now() - t0, c]) });
  return { log, done };
}

describe('playSequence', () => {
  it('lights each color for 600ms with 250ms gaps', async () => {
    const { log, done } = run(['green', 'red', 'green']);
    await vi.runAllTimersAsync();
    await done;
    expect(log).toEqual([
      [0, 'green'],
      [600, null],
      [850, 'red'],
      [1450, null],
      [1700, 'green'],
      [2300, null],
    ]);
    expect(vi.mocked(startTone).mock.calls.map((c) => c[0])).toEqual(['green', 'red', 'green']);
    expect(stopTone).toHaveBeenCalledTimes(3);
  });

  it('keeps the same pace for a 10-color sequence', async () => {
    const seq: ColorId[] = ['blue', 'blue', 'red', 'yellow', 'green', 'red', 'blue', 'green', 'yellow', 'red'];
    const { log, done } = run(seq);
    await vi.runAllTimersAsync();
    await done;
    const onTimes = log.filter(([, c]) => c !== null).map(([t]) => t);
    expect(onTimes).toEqual(seq.map((_, i) => i * 850));
  });

  it('turns off light and tone immediately when aborted', async () => {
    const controller = new AbortController();
    const { log, done } = run(['green', 'red'], controller.signal);
    const settled = done.catch(() => 'aborted');
    await vi.advanceTimersByTimeAsync(300);
    controller.abort();
    expect(await settled).toBe('aborted');
    expect(log).toEqual([
      [0, 'green'],
      [300, null],
    ]);
    expect(stopTone).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(5000);
    expect(startTone).toHaveBeenCalledTimes(1);
  });
});
