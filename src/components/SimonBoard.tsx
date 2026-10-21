import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { COLORS, type ColorId } from '../game/colors';
import { PRESS_MIN_MS } from '../game/timing';
import { startTone } from '../audio/audioEngine';

type Props = {
  litColor?: ColorId | null;
  dimmed?: boolean;
  inputEnabled?: boolean;
  paused?: boolean;
  onPress?: (color: ColorId) => void;
};

type ActivePress = { color: ColorId; startedAt: number; stopTone: () => void };

// Round board: 2x2 grid of quadrant buttons with a decorative center disc (ADR-1).
// Player presses react on pointerdown and last max(PRESS_MIN_MS, finger hold) (ADR-2).
export default function SimonBoard({
  litColor = null,
  dimmed = false,
  inputEnabled = false,
  paused = false,
  onPress,
}: Props) {
  const [pressed, setPressed] = useState<ColorId | null>(null);
  const activeRef = useRef<ActivePress | null>(null);
  const releaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const endPress = () => {
    if (releaseTimerRef.current) clearTimeout(releaseTimerRef.current);
    releaseTimerRef.current = null;
    activeRef.current?.stopTone();
    activeRef.current = null;
    setPressed(null);
  };

  const release = () => {
    const active = activeRef.current;
    if (!active || releaseTimerRef.current) return;
    const remaining = Math.max(0, PRESS_MIN_MS - (performance.now() - active.startedAt));
    releaseTimerRef.current = setTimeout(endPress, remaining);
  };

  const beginPress = (color: ColorId) => {
    if (!inputEnabled) return;
    endPress();
    activeRef.current = { color, startedAt: performance.now(), stopTone: startTone(color) };
    setPressed(color);
    onPress?.(color);
  };

  // The finger may be lifted after the quadrant became disabled, so listen on window.
  useEffect(() => {
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    return () => {
      window.removeEventListener('pointerup', release);
      window.removeEventListener('pointercancel', release);
    };
  });

  // Stop any press feedback when the board unmounts (e.g. navigating to About).
  useEffect(() => endPress, []);

  // Hiding the app mid-press pauses the game; drop the held highlight right away.
  useEffect(() => {
    if (paused) endPress();
  }, [paused]);

  const handlePointerDown = (color: ColorId) => (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button > 0) return; // primary button / touch only
    event.preventDefault();
    beginPress(color);
  };

  const handleKeyDown = (color: ColorId) => (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.repeat || (event.key !== 'Enter' && event.key !== ' ')) return;
    event.preventDefault();
    beginPress(color);
    release();
  };

  return (
    <div className={`board${dimmed ? ' board--dimmed' : ''}`}>
      <div className="board-grid">
        {COLORS.map((color) => {
          const lit = litColor === color.id || pressed === color.id;
          return (
            <button
              key={color.id}
              type="button"
              className={`quadrant quadrant-${color.id} quadrant-${color.area}${lit ? ' quadrant--lit' : ''}`}
              aria-label={color.label}
              disabled={!inputEnabled}
              onPointerDown={handlePointerDown(color.id)}
              onKeyDown={handleKeyDown(color.id)}
              onContextMenu={(event) => event.preventDefault()}
            />
          );
        })}
      </div>
      <div className="board-center" aria-hidden="true" />
    </div>
  );
}
