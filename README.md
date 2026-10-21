# סיימון (Simon)

משחק זיכרון בעברית לטלפון נייד: המשחק מציג רצף של צבעים וצלילים, והשחקן משחזר אותו. בכל שלב נוסף צבע אחד, עד 10 שלבים. טעות אחת מסיימת את המשחק.

- אתר Mobile-First בעברית (RTL), ניתן להתקנה כאפליקציה (PWA) ופועל גם ללא אינטרנט לאחר טעינה ראשונה.
- היסטוריית 10 המשחקים האחרונים נשמרת בטלפון בלבד; אין הרשמה ואין שרת.

## מסמכי הפרויקט
- [`spec/PRD.md`](spec/PRD.md) – אפיון המוצר
- [`spec/ARCHITECTURE.md`](spec/ARCHITECTURE.md) – ארכיטקטורה וטכנולוגיות
- [`spec/DESIGN.md`](spec/DESIGN.md) – מסכים ועיצוב
- [`spec/MILESTONES.md`](spec/MILESTONES.md) – תוכנית הבנייה

## הרצה
נדרש Node.js (גרסת LTS).

```bash
npm install
npm run dev        # http://localhost:5173/Simon/
npm run test       # בדיקות אוטומטיות
npm run typecheck  # בדיקת TypeScript
npm run build      # בנייה לתיקיית dist/
```
