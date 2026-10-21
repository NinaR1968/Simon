import { useCallback, useState } from 'react';
import HistoryCard from '../components/HistoryCard';
import ConfirmDialog from '../components/ConfirmDialog';
import type { History } from '../history/useHistory';

type Props = { history: History };

export default function AboutScreen({ history }: Props) {
  const [confirming, setConfirming] = useState(false);
  const { results, loadError, deleteError, clear, resetDeleteError } = history;

  const openConfirm = () => {
    resetDeleteError();
    setConfirming(true);
  };
  const cancel = useCallback(() => setConfirming(false), []);
  const confirmDelete = () => {
    clear();
    setConfirming(false);
  };

  return (
    <section className="screen about">
      <header className="screen-header">
        <h1 className="brand">אודות</h1>
      </header>

      <article className="card">
        <h2 className="card-title">על המשחק</h2>
        <p>סיימון הוא משחק זיכרון של צבעים וצלילים.</p>
        <ul className="instructions">
          <li>צפו ברצף הצבעים שהמשחק מציג.</li>
          <li>הקישו על הצבעים באותו הסדר.</li>
          <li>בכל שלב נוסף צבע אחד – נסו להגיע עד שלב 10!</li>
          <li>טעות אחת מסיימת את המשחק.</li>
        </ul>
      </article>

      <h2 className="section-title">10 המשחקים האחרונים</h2>

      {loadError && (
        <p className="error-message" role="alert">
          לא ניתן לטעון את היסטוריית המשחקים במכשיר זה. המשחק עצמו ממשיך לעבוד.
        </p>
      )}

      {results.length === 0 ? (
        <p className="empty-state">עדיין אין משחקים שמורים</p>
      ) : (
        <>
          <ol className="history-list">
            {results.map((result) => (
              <HistoryCard key={result.id} result={result} />
            ))}
          </ol>
          {deleteError && (
            <p className="error-message" role="alert">
              מחיקת ההיסטוריה נכשלה. נסו שוב.
            </p>
          )}
          <button type="button" className="secondary-button" onClick={openConfirm}>
            מחק היסטוריה
          </button>
        </>
      )}

      {confirming && <ConfirmDialog onCancel={cancel} onConfirm={confirmDelete} />}
    </section>
  );
}
