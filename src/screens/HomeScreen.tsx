import SimonBoard from '../components/SimonBoard';
import PrimaryButton from '../components/PrimaryButton';
import ResultOverlay from '../components/ResultOverlay';
import { MAX_ROUNDS } from '../game/gameReducer';
import type { Game } from '../game/useGame';

type Props = { game: Game };

function statusText({ state, audioError }: Game): string {
  switch (state.status) {
    case 'idle':
      return audioError ? 'לא ניתן להפעיל צליל. לחצו שוב על „התחל משחק".' : '';
    case 'presenting':
      return 'המשחק מציג את הרצף';
    case 'awaitingInput':
      return 'התור שלך';
    default:
      return '';
  }
}

export default function HomeScreen({ game }: Props) {
  const { state } = game;
  const ended = state.status === 'won' || state.status === 'lost';

  return (
    <section className="screen home">
      <header className="screen-header">
        <h1 className="brand">סיימון</h1>
      </header>
      <p className="stage">
        שלב <bdi>{game.displayRound}</bdi> מתוך <bdi>{MAX_ROUNDS}</bdi>
      </p>
      <p className="status" aria-live="polite">
        {statusText(game)}
      </p>
      <div className="board-wrap">
        <SimonBoard
          litColor={game.litColor}
          dimmed={state.status === 'presenting'}
          inputEnabled={state.status === 'awaitingInput'}
          onPress={game.press}
        />
        {ended && game.resultVisible && (
          <ResultOverlay
            outcome={state.status as 'won' | 'lost'}
            completedRounds={state.completedRounds}
            onConfirm={game.dismiss}
          />
        )}
      </div>
      <div className="action-area">
        {state.status === 'idle' && <PrimaryButton onClick={game.start}>התחל משחק</PrimaryButton>}
        {state.status === 'awaitingInput' && <p className="hint">הקש על הצבעים לפי הסדר</p>}
      </div>
    </section>
  );
}
