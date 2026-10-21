import SimonBoard from '../components/SimonBoard';
import PrimaryButton from '../components/PrimaryButton';

export default function HomeScreen() {
  return (
    <section className="screen home">
      <header className="screen-header">
        <h1 className="brand">סיימון</h1>
      </header>
      <p className="stage">
        שלב <bdi>1</bdi> מתוך <bdi>10</bdi>
      </p>
      <p className="status" aria-live="polite" />
      <SimonBoard />
      <div className="action-area">
        <PrimaryButton>התחל משחק</PrimaryButton>
      </div>
    </section>
  );
}
