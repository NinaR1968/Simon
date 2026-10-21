import type { ColorId } from './colors';
import { startTone } from '../audio/audioEngine';
import { GAP_MS, TONE_MS, sleep } from './timing';

type Options = {
  signal: AbortSignal;
  onLight: (color: ColorId | null) => void;
};

// Sequence Controller: lights and sounds each color in turn; on abort turns everything off at once.
export async function playSequence(sequence: ColorId[], { signal, onLight }: Options): Promise<void> {
  for (let i = 0; i < sequence.length; i++) {
    if (i > 0) await sleep(GAP_MS, signal);
    const stopTone = startTone(sequence[i]);
    onLight(sequence[i]);
    try {
      await sleep(TONE_MS, signal);
    } finally {
      stopTone();
      onLight(null);
    }
  }
}
