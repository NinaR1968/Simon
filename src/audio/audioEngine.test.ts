import { TONE_FREQUENCIES, unlockAudio } from './audioEngine';

describe('audioEngine', () => {
  it('gives each of the four colors a different tone', () => {
    const freqs = Object.values(TONE_FREQUENCIES);
    expect(freqs).toHaveLength(4);
    expect(new Set(freqs).size).toBe(4);
  });

  it('reports failure when Web Audio is unavailable', async () => {
    expect(await unlockAudio()).toBe(false);
  });
});
