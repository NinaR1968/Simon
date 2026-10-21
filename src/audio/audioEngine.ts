import type { ColorId } from '../game/colors';

// Classic Simon pitches; each color has its own tone.
export const TONE_FREQUENCIES: Record<ColorId, number> = {
  green: 415,
  red: 310,
  yellow: 252,
  blue: 209,
};

const ATTACK_S = 0.01;
const RELEASE_S = 0.02;
const VOLUME = 0.25;

let context: AudioContext | null = null;
const activeStops = new Set<() => void>();

type AudioContextCtor = typeof AudioContext;

function getContextCtor(): AudioContextCtor | undefined {
  const w = window as unknown as { AudioContext?: AudioContextCtor; webkitAudioContext?: AudioContextCtor };
  return w.AudioContext ?? w.webkitAudioContext;
}

// Must be called from a user gesture ("התחל משחק"); resolves false when audio cannot run.
export async function unlockAudio(): Promise<boolean> {
  try {
    if (!context) {
      const Ctor = getContextCtor();
      if (!Ctor) return false;
      context = new Ctor();
    }
    if (context.state !== 'running') {
      await context.resume();
    }
    return context.state === 'running';
  } catch {
    return false;
  }
}

// Starts a tone with a short envelope (avoids clicks); returns an idempotent stop function.
function startOscillator(
  frequency: number,
  type: OscillatorType,
  startAt = 0,
  duration?: number,
): () => void {
  if (!context) return () => {};
  const ctx = context;
  const t0 = ctx.currentTime + startAt;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(VOLUME, t0 + ATTACK_S);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t0);

  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    activeStops.delete(stop);
    const now = Math.max(ctx.currentTime, t0);
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(0, now + RELEASE_S);
    osc.stop(now + RELEASE_S + 0.01);
  };
  activeStops.add(stop);

  if (duration !== undefined) {
    const end = t0 + duration;
    gain.gain.setValueAtTime(VOLUME, end - RELEASE_S);
    gain.gain.linearRampToValueAtTime(0, end);
    osc.stop(end + 0.01);
    osc.onended = () => {
      stopped = true;
      activeStops.delete(stop);
    };
  }
  return stop;
}

export function startTone(color: ColorId): () => void {
  return startOscillator(TONE_FREQUENCIES[color], 'triangle');
}

// Rising arpeggio C5-E5-G5-C6.
export function playWin(): void {
  [523, 659, 784, 1047].forEach((f, i) => startOscillator(f, 'triangle', i * 0.15, i === 3 ? 0.4 : 0.15));
}

// Two descending low buzzes.
export function playLose(): void {
  startOscillator(196, 'sawtooth', 0, 0.3);
  startOscillator(130, 'sawtooth', 0.3, 0.5);
}

export function stopAll(): void {
  [...activeStops].forEach((stop) => stop());
}
