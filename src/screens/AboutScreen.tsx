export default function AboutScreen() {
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
      <p className="empty-state">עדיין אין משחקים שמורים</p>
    </section>
  );
}
