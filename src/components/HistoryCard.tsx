import type { GameResult } from '../history/historyStorage';

const dateFormat = new Intl.DateTimeFormat('he-IL', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

// Outcome is stated in text; color only reinforces it (DESIGN §1.2).
export default function HistoryCard({ result }: { result: GameResult }) {
  const won = result.outcome === 'win';
  return (
    <li className="history-card">
      <div className="history-main">
        <p className="history-rounds">
          שלבים שהושלמו: <bdi>{result.completedRounds}</bdi>
        </p>
        <p className={`history-outcome history-outcome--${result.outcome}`}>
          תוצאה: {won ? 'ניצחון' : 'הפסד'}
        </p>
      </div>
      <time className="history-date" dateTime={result.finishedAt}>
        <bdi>{dateFormat.format(new Date(result.finishedAt))}</bdi>
      </time>
    </li>
  );
}
