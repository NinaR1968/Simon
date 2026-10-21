import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import type { ColorId } from './colors';
import { gameReducer, initialGameState } from './gameReducer';
import { randomColor } from './random';
import { playSequence } from './playSequence';
import { END_DELAY_MS, LEAD_IN_MS, NEXT_ROUND_MS, ROUND_HOLD_MS, sleep } from './timing';
import { playLose, playWin, stopAll, unlockAudio } from '../audio/audioEngine';

// Game state lives in App so switching screens does not unmount it (ADR-2).
export function useGame() {
  const [state, dispatch] = useReducer(gameReducer, initialGameState);
  const [litColor, setLitColor] = useState<ColorId | null>(null);
  // Last 'advance' presentation whose new round number was revealed; until then the stage
  // keeps showing the completed round (derived during render, so no frame shows it early).
  const [revealedId, setRevealedId] = useState(0);
  const [resultVisible, setResultVisible] = useState(false);
  const [audioError, setAudioError] = useState(false);
  // Read by the stable pause() used in event listeners.
  const activeRef = useRef(false);
  activeRef.current = state.status === 'presenting' || state.status === 'awaitingInput';

  // Presentation timeline; aborting it (status change, cancel, unmount) stops lights, tones and timers.
  useEffect(() => {
    if (state.status !== 'presenting') return;
    const controller = new AbortController();
    const { signal } = controller;
    const presentationId = state.presentationId;

    (async () => {
      if (state.intro === 'advance') {
        await sleep(ROUND_HOLD_MS, signal);
        setRevealedId(presentationId);
        await sleep(NEXT_ROUND_MS, signal);
      } else {
        await sleep(LEAD_IN_MS, signal);
      }
      await playSequence(state.sequence, { signal, onLight: setLitColor });
      dispatch({ type: 'presentationDone', presentationId });
    })().catch((error: unknown) => {
      if (!signal.aborted) throw error;
    });

    return () => {
      controller.abort();
      setLitColor(null);
    };
    // A new presentation always comes with a new presentationId.
  },[state.status, state.presentationId]);

  // The game is already over; only the result message and end sound wait END_DELAY_MS.
  useEffect(() => {
    if (state.status !== 'won' && state.status !== 'lost') return;
    const won = state.status === 'won';
    const timer = setTimeout(() => {
      if (won) playWin();
      else playLose();
      setResultVisible(true);
    }, END_DELAY_MS);
    return () => {
      clearTimeout(timer);
      setResultVisible(false);
    };
  }, [state.status, state.gameId]);

  const start = useCallback(() => {
    // unlockAudio runs synchronously up to resume(), so it stays inside the click gesture.
    void unlockAudio().then((ok) => {
      setAudioError(!ok);
      if (ok) dispatch({ type: 'start', firstColor: randomColor() });
    });
  }, []);

  const press = useCallback((color: ColorId) => {
    dispatch({ type: 'press', color, nextColor: randomColor() });
  }, []);

  const dismiss = useCallback(() => dispatch({ type: 'dismiss' }), []);

  // Only an active game pauses; a finished game keeps its pending result message (ARCHITECTURE §2.3 rule 10).
  const pause = useCallback(() => {
    if (!activeRef.current) return;
    activeRef.current = false;
    stopAll();
    dispatch({ type: 'pause' });
  }, []);

  const resume = useCallback(() => {
    // Called from the "המשך משחק" click so the AudioContext resumes inside the gesture.
    void unlockAudio().then((ok) => {
      setAudioError(!ok);
      if (ok) dispatch({ type: 'resume' });
    });
  }, []);

  // Visibility Handler: hiding the app pauses; becoming visible again never resumes by itself.
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') pause();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', pause);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', pause);
    };
  }, [pause]);

  const holdingCompletedRound =
    state.status === 'presenting' && state.intro === 'advance' && revealedId !== state.presentationId;

  return {
    state,
    litColor,
    displayRound: holdingCompletedRound ? state.round - 1 : state.round,
    resultVisible,
    audioError,
    start,
    press,
    dismiss,
    pause,
    resume,
  };
}

export type Game = ReturnType<typeof useGame>;
