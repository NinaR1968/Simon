// Presentation pacing (DESIGN §1.1); identical in every round.
export const TONE_MS = 600;
export const GAP_MS = 250;
export const LEAD_IN_MS = 1000;
export const ROUND_HOLD_MS = 1000;
export const NEXT_ROUND_MS = 1000;
export const END_DELAY_MS = 1000;
export const PRESS_MIN_MS = 300;

// Resolves after `ms`, or rejects immediately (and clears the timer) when aborted.
export function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason);
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal.reason);
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal.addEventListener('abort', onAbort, { once: true });
  });
}
