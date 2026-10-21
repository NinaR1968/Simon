import type { ColorId } from './colors';

export const MAX_ROUNDS = 10;

export type GameStatus = 'idle' | 'presenting' | 'awaitingInput' | 'won' | 'lost';

// Which wait precedes a presentation: after "start" or after completing a round.
export type Intro = 'start' | 'advance';

export type GameState = {
  status: GameStatus;
  sequence: ColorId[];
  round: number;
  inputIndex: number;
  completedRounds: number;
  gameId: number;
  presentationId: number;
  intro: Intro;
};

// Random colors come from outside so the reducer stays pure (ADR-2).
export type GameAction =
  | { type: 'start'; firstColor: ColorId }
  | { type: 'presentationDone'; presentationId: number }
  | { type: 'press'; color: ColorId; nextColor: ColorId }
  | { type: 'dismiss' }
  | { type: 'cancel' };

export const initialGameState: GameState = {
  status: 'idle',
  sequence: [],
  round: 1,
  inputIndex: 0,
  completedRounds: 0,
  gameId: 0,
  presentationId: 0,
  intro: 'start',
};

// Back to "before game", keeping ids monotonic for guards (ADR-5).
function reset(state: GameState): GameState {
  return { ...initialGameState, gameId: state.gameId, presentationId: state.presentationId };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'start':
      if (state.status !== 'idle') return state;
      return {
        ...initialGameState,
        status: 'presenting',
        sequence: [action.firstColor],
        gameId: state.gameId + 1,
        presentationId: state.presentationId + 1,
        intro: 'start',
      };

    case 'presentationDone':
      if (state.status !== 'presenting' || action.presentationId !== state.presentationId) {
        return state;
      }
      return { ...state, status: 'awaitingInput', inputIndex: 0 };

    case 'press': {
      if (state.status !== 'awaitingInput') return state;
      if (action.color !== state.sequence[state.inputIndex]) {
        return { ...state, status: 'lost', completedRounds: state.round - 1 };
      }
      const nextIndex = state.inputIndex + 1;
      if (nextIndex < state.sequence.length) {
        return { ...state, inputIndex: nextIndex };
      }
      if (state.round >= MAX_ROUNDS) {
        return { ...state, status: 'won', completedRounds: MAX_ROUNDS, inputIndex: nextIndex };
      }
      return {
        ...state,
        status: 'presenting',
        sequence: [...state.sequence, action.nextColor],
        round: state.round + 1,
        completedRounds: state.round,
        inputIndex: 0,
        presentationId: state.presentationId + 1,
        intro: 'advance',
      };
    }

    case 'dismiss':
      if (state.status !== 'won' && state.status !== 'lost') return state;
      return reset(state);

    // Temporary Milestone 2 behavior when navigating to About mid-game; replaced by pause in M3.
    case 'cancel':
      if (state.status !== 'presenting' && state.status !== 'awaitingInput') return state;
      return reset(state);

    default:
      return state;
  }
}
