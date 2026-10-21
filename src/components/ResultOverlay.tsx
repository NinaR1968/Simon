import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import PrimaryButton from './PrimaryButton';

type Props = {
  outcome: 'won' | 'lost';
  completedRounds: number;
  onConfirm: () => void;
  saveError?: boolean;
};

const CONFETTI_COLORS = ['#00D26A', '#FF3B30', '#FFD600', '#00A3FF'];

function completedText(n: number) {
  return n === 1 ? 'השלמת שלב אחד' : `השלמת ${n} שלבים`;
}

// End-of-game message over the board; confetti on a win only.
export default function ResultOverlay({ outcome, completedRounds, onConfirm, saveError = false }: Props) {
  const won = outcome === 'won';

  useEffect(() => {
    if (!won) return;
    void confetti({
      particleCount: 160,
      spread: 100,
      startVelocity: 40,
      origin: { y: 0.45 },
      colors: CONFETTI_COLORS,
      disableForReducedMotion: true,
    });
    return () => {
      confetti.reset();
    };
  }, [won]);

  return (
    <div className="result-overlay" role="dialog" aria-modal="true" aria-labelledby="result-title">
      <div className={`result-card result-card--${outcome}`}>
        <h2 id="result-title" className="result-title">
          {won ? 'כל הכבוד! ניצחת!' : 'נפסלת!'}
        </h2>
        {!won && <p className="result-detail">{completedText(completedRounds)}</p>}
        {saveError && (
          <p className="error-message" role="status">
            לא ניתן היה לשמור את התוצאה בהיסטוריה.
          </p>
        )}
        <PrimaryButton onClick={onConfirm} autoFocus>
          אישור
        </PrimaryButton>
      </div>
    </div>
  );
}
