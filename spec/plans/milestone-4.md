# תוכנית – Milestone 4: היסטוריית משחקים ומחיקה מאושרת

> מקורות: `MILESTONES.md` (Milestone 4, כולל כללי Build ופרסום – ADR-11); `PRD.md` §3ב ("סיום משחק" סעיף 4, "צפייה בהיסטוריה ומחיקתה"), §4.4, §4ב (מקרי קצה: Refresh, היסטוריה ריקה, מגבלה, ביטול מחיקה, אחסון חסום); `DESIGN.md` §1.2, §1.3, §2 (History Cards, Dialog, Secondary/Destructive Button); `ARCHITECTURE.md` §2.3 כלל 4 ו-9, §2.5 ("Game Result – Local Storage"), §2.6 ("אודות"), §2.8 (אבטחה), ADR-4, ADR-5; `wireframes.png`, `mockups.png` (מסכי "אודות" ו"אודות – אישור מחיקה").
> **מחוץ לאבן דרך זו:** PWA, Manifest, Service Worker, אייקונים ו-Offline (M5).

## 1. מטרה
כל משחק שהסתיים (ניצחון או הפסד) נשמר **פעם אחת** ב-`localStorage`. מסך "אודות" מציג עד עשרה כרטיסי תוצאות מהחדש לישן, חיווי ריק כשאין תוצאות, וכפתור **"מחק היסטוריה"** שפותח חלונית אישור. כשל אחסון מוצג בהודעה בעברית ואינו חוסם משחק.

## 2. תלויות
אין תלויות חדשות.

## 3. מבנה קבצים

```text
src/
  history/
    historyStorage.ts       # NEW – pure module: read/validate/add/clear 'simon.history.v1' (ADR-4)
    historyStorage.test.ts  # NEW – unit tests without React
    useHistory.ts           # NEW – React hook: list + error states, record() / clear()
  components/
    HistoryCard.tsx         # NEW – one result card (date+time, completed rounds, outcome text)
    ConfirmDialog.tsx       # NEW – scrim + light dialog card with "ביטול" / "מחק"
    ResultOverlay.tsx       # CHANGE – optional save-error line under the result text
  screens/
    AboutScreen.tsx         # CHANGE – history list / empty state / delete button / dialog / errors
  App.tsx                   # CHANGE – owns useHistory; effect records a finished game once per gameId
  App.test.tsx              # CHANGE – integration tests for history, delete, storage failure, Strict Mode
  styles/global.css         # CHANGE – history cards, secondary/destructive buttons, dialog, error message
```

אין שינוי ב-`gameReducer.ts`, `useGame.ts`, `playSequence.ts`, `audioEngine.ts` (ה-Reducer לא נוגע באחסון – ARCHITECTURE §2.3 כלל 4).

## 4. `historyStorage.ts` – Repository טהור (ARCHITECTURE §2.5, ADR-4)

```ts
export type Outcome = 'win' | 'loss';
export type GameResult = { id: string; finishedAt: string; completedRounds: number; outcome: Outcome };
type HistoryData = { schemaVersion: 1; results: GameResult[] };

export const HISTORY_KEY = 'simon.history.v1';
export const MAX_RESULTS = 10;

export type ReadResult = { ok: true; results: GameResult[] } | { ok: false; results: GameResult[] };
export function readHistory(): ReadResult;
export function addResult(current: GameResult[], result: GameResult): { ok: boolean; results: GameResult[] };
export function clearHistory(): boolean;
export function createResult(outcome: Outcome, completedRounds: number, now?: Date): GameResult;
```

- **קריאה:** `localStorage.getItem` בתוך `try/catch`. מפתח חסר → `{ ok: true, results: [] }`. JSON פגום / `schemaVersion` שגוי / חריגה בגישה → `{ ok: false, results: [] }`.
- **Validation:** כל רשומה נבדקת: `id` מחרוזת לא ריקה; `finishedAt` מחרוזת שמתפרשת לתאריך תקין; `completedRounds` מספר שלם 0–10; `outcome` הוא `'win'`/`'loss'`. רשומות לא תקינות מסוננות; התוצאה ממוינת מהחדש לישן לפי `finishedAt` וחתוכה ל-10.
- **הוספה:** `[result, ...current].slice(0, MAX_RESULTS)` → `setItem(JSON.stringify({ schemaVersion: 1, results }))` בתוך `try/catch`. מחזיר תמיד את הרשימה החדשה (כדי שהתוצאה תוצג בזיכרון באותה טעינה), ו-`ok: false` אם הכתיבה נכשלה. כך גם אחרי קריאה כושלת, השמירה הבאה כותבת רשימה תקינה חדשה (ADR-4).
- **מחיקה:** `removeItem(HISTORY_KEY)` בתוך `try/catch`; מחזיר `true`/`false`. אין "הצלחה מדומה".
- **`createResult`:** `finishedAt = now.toISOString()`; `id = \`${now.getTime()}-${Math.random().toString(36).slice(2, 10)}\`` (לא `crypto.randomUUID` – ADR-4); `outcome` מתורגם מ-`won`→`'win'`, `lost`→`'loss'` במקום הקריאה.
- אין שמירה של מצב המשחק, ואין נתונים אישיים (ARCHITECTURE §2.5, §2.8).

## 5. `useHistory.ts`

מוחזק ב-`App` (כמו `useGame`), כדי שמסך "אודות" יציג מיד תוצאה חדשה ללא קריאה חוזרת.

```ts
const [results, setResults] = useState(() => readHistory());        // lazy initial read, once
const [loadError, setLoadError] = useState(!initial.ok);
const [saveError, setSaveError] = useState(false);
const [deleteError, setDeleteError] = useState(false);

record(outcome, completedRounds)   // addResult → setResults; saveError = !ok
clear(): boolean                    // clearHistory → on success setResults([]) + loadError=false; else deleteError=true, list stays
```
- `saveError` מתאפס בכל `record` חדש; `deleteError` מתאפס בפתיחת חלונית המחיקה הבאה / מחיקה מוצלחת.

## 6. רישום תוצאה פעם אחת – `App.tsx` (ADR-4, ADR-5)

```ts
const recordedGameId = useRef(0);
useEffect(() => {
  const { status, gameId, completedRounds } = game.state;
  if (status !== 'won' && status !== 'lost') return;
  if (recordedGameId.current === gameId) return;   // Strict Mode double effect / re-render guard
  recordedGameId.current = gameId;
  history.record(status === 'won' ? 'win' : 'loss', completedRounds);
}, [game.state.status, game.state.gameId]);
```
- הרישום קורה **בכניסה** ל-`won`/`lost` – לפני ההמתנה של `END_DELAY_MS` להודעה – כך שמעבר מהיר ל"אודות" כבר מציג את התוצאה.
- "אישור" (`dismiss`) לא משפיע על ההיסטוריה. השהיה, Refresh או יציאה באמצע משחק לא מגיעים ל-`won`/`lost` ולכן לא נרשמים.
- `ResultOverlay` מקבל `saveError={history.saveError}`.

## 7. מסך "אודות" – `AboutScreen.tsx` (DESIGN §1.2, §1.3)

Props: `history` (results, loadError, deleteError, clear).

- כרטיס **"על המשחק"** – ללא שינוי.
- כותרת **"10 המשחקים האחרונים"**.
- `loadError` → הודעה: **"לא ניתן לטעון את היסטוריית המשחקים במכשיר זה. המשחק עצמו ממשיך לעבוד."**
- אין רשומות → החיווי הקיים **"עדיין אין משחקים שמורים"**; כפתור המחיקה **לא מוצג**.
- יש רשומות → רשימה (`<ol>`) של `HistoryCard`, ומתחתיה כפתור משני **"מחק היסטוריה"** (בהתאם ל-Mockup: מסגרת כחולה עדינה על רקע Surface).
- `deleteError` → הודעה: **"מחיקת ההיסטוריה נכשלה. נסו שוב."**; הרשימה נשארת על המסך (ADR-4).
- הגלילה היא גלילה רגילה של העמוד; פס הניווט נשאר `sticky` בתחתית (קיים).

### 7.1 `HistoryCard.tsx` (לפי ה-Wireframe וה-Mockup)
- צד ימין (התחלת השורה ב-RTL): **"שלבים שהושלמו: N"** ומתחתיו **"תוצאה: ניצחון"** / **"תוצאה: הפסד"**.
  - ב-Wireframe מופיע "שלב: N"; DESIGN §1.2 ו-PRD §4.4 מגדירים שזה **מספר השלבים שהושלמו**, ולכן הניסוח המפורש (כדי ש-0 בהפסד בשלב 1 לא ייקרא כ"שלב 0").
  - צבע עדין לתוצאה (ירוק לניצחון, אדום לבהיר להפסד) – בנוסף לטקסט, לא במקומו.
- צד שמאל: תאריך ושעה, בגודל Caption ובצבע `--muted`, בפורמט `Intl.DateTimeFormat('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })` לפי זמן המכשיר; עטוף ב-`<time dateTime={finishedAt}>` ו-`<bdi>`.
- כרטיס כהה (`--surface`), גבול `--border`, פינות `--radius-card`.

### 7.2 `ConfirmDialog.tsx`
- Scrim כהה (`position: fixed; inset: 0`) מעל כל המסך, וכרטיס **בהיר** במרכז (לפי ה-Mockup), `role="alertdialog"`, `aria-modal="true"`, `aria-labelledby` / `aria-describedby`.
- כותרת: **"למחוק את ההיסטוריה?"**; הסבר: **"כל תוצאות המשחקים יימחקו."**
- כפתורים: **"ביטול"** (אפור בהיר, משני) ו-**"מחק"** (אדום `--red`). סדר: "ביטול" ראשון ב-DOM → בצד ימין ב-RTL, "מחק" משמאל – לפי ה-Wireframe (שגובר על מבנה; ב-Mockup הסדר הפוך).
- פוקוס התחלתי על **"ביטול"** (בחירה בטוחה); `Escape` = ביטול. זו שכבה בתוך מסך "אודות", לא מסך שלישי.
- "ביטול" → סגירה ללא שינוי. "מחק" → `history.clear()` → סגירה; בהצלחה מוצג החיווי הריק, בכשל – הודעת הכשל והרשימה נשארת.

## 8. `ResultOverlay.tsx`
- Prop חדש אופציונלי `saveError?: boolean`. כשהוא `true` מוצגת שורה קטנה מתחת לתוצאה: **"לא ניתן היה לשמור את התוצאה בהיסטוריה."** (`role="status"`). אין שינוי אחר.

## 9. עיצוב – `global.css`
- `.history-list`, `.history-card` (Flex, `justify-content: space-between`, Surface + Border + Radius), `.history-outcome--win/--loss`, `.history-date`.
- `.secondary-button` (מסגרת `--blue` עדינה, רקע Surface, טקסט לבן, Pill, גובה ≥ 48px).
- `.dialog-scrim`, `.dialog-card` (רקע `--white`, טקסט כהה `--charcoal`), `.dialog-actions`, `.dialog-button--cancel` (`--soft-gray`), `.dialog-button--delete` (`--red`, טקסט לבן).
- `.error-message` (טקסט בגוון אדום-בהיר על Surface, Caption/Body, ממורכז).
- ללא גלילה אופקית ב-Viewport של Smartphone אנכי (360–430px).

## 10. מקרי קצה – איך כל אחד מכוסה
| מקרה | מנגנון |
|---|---|
| Strict Mode מריץ Effect פעמיים | `recordedGameId` ref – אותו `gameId` לא נרשם שוב |
| מעבר ל"אודות" בשנייה שבין סיום להודעה | הרישום כבר קרה בכניסה ל-`won`/`lost`; ההודעה מוצגת בחזרה (M3) |
| השהיה / Refresh / יציאה באמצע משחק | לא מגיעים ל-`won`/`lost` → אין רישום |
| משחק 11 | `slice(0, 10)` מסיר את הישן ביותר |
| JSON פגום / רשומה לא תקינה | סינון; קובץ פגום לגמרי → `loadError`, והשמירה הבאה כותבת רשימה חדשה ותקינה |
| `localStorage` חסום (getItem/setItem/removeItem זורקים) | `try/catch` → הודעות בעברית; המשחק ממשיך כרגיל; התוצאה עדיין מוצגת לזמן הטעינה הנוכחית |
| מחיקה נכשלה | הודעת כשל, הרשימה נשארת – לא "הצלחה מדומה" |
| תוכן מה-Storage | מוצג כטקסט React בלבד, ללא `dangerouslySetInnerHTML` (ARCHITECTURE §2.8) |

## 11. בדיקות אוטומטיות

**`historyStorage.test.ts`** (jsdom `localStorage`, מתנקה ב-`beforeEach`):
1. קריאה ממפתח חסר → רשימה ריקה, `ok: true`.
2. `addResult` שומר בפורמט `{ schemaVersion: 1, results }` תחת `simon.history.v1`, החדש ראשון.
3. 11 הוספות → 10 רשומות, הישנה ביותר הוסרה, סדר חדש→ישן.
4. JSON פגום / `schemaVersion` שגוי → `ok: false`; הוספה אחרי זה כותבת רשימה תקינה.
5. סינון רשומות לא תקינות (outcome לא מוכר, `completedRounds` 11 או שבור, תאריך לא תקין).
6. `clearHistory` מסיר את המפתח ומחזיר `true`.
7. כשל: `vi.spyOn(Storage.prototype, 'getItem' | 'setItem' | 'removeItem')` זורק → `ok: false` / `false`, ללא חריגה.
8. `createResult`: `finishedAt` ISO, `id` ייחודי בין שתי קריאות, ערכים נכונים.

**`App.test.tsx`** (fake timers + אודיו ו-random מדומים, כמו היום; `localStorage.clear()` ב-`beforeEach`):
1. הפסד בשלב 1 → בדיוק רשומה אחת: `completedRounds: 0`, `outcome: 'loss'`; ב"אודות" כרטיס עם "שלבים שהושלמו: 0" ו-"תוצאה: הפסד".
2. ניצחון (10 שלבים) → רשומה אחת `10`/`'win'` ו-"תוצאה: ניצחון".
3. "אישור" ומעבר מסכים אחרי הסיום לא מוסיפים רשומה.
4. השהיה באמצע משחק + מעבר מסכים → אין רשומה.
5. **Strict Mode:** רינדור בתוך `<StrictMode>` → הפסד → בדיוק רשומה אחת.
6. רשומות קיימות ב-`localStorage` לפני רינדור (מדמה Refresh) → מוצגות בסדר חדש→ישן; Unmount ורינדור מחדש → עדיין מוצגות.
7. 11 משחקים (או 10 רשומות שמורות + משחק אחד) → 10 כרטיסים, הישן הוסר.
8. היסטוריה ריקה → חיווי ריק, אין "מחק היסטוריה".
9. "מחק היסטוריה" → Dialog; "ביטול" → הרשימה ו-`localStorage` ללא שינוי; "מחק" → חיווי ריק, המפתח נמחק, הכפתור נעלם.
10. `setItem` זורק → המשחק מסתיים כרגיל, ההודעה "לא ניתן היה לשמור..." מופיעה בחלונית הסיום, ו"התחל משחק" עובד אחרי "אישור".
11. `getItem` זורק → הודעת אי-זמינות ב"אודות"; משחק מתחיל ונגמר כרגיל.
12. `removeItem` זורק → הודעת "מחיקת ההיסטוריה נכשלה", הרשימה נשארת.
13. עדכון בדיקת הניווט הקיימת (חיווי ריק + אין כפתור מחיקה) – נשארת עוברת.

הפקודות: `npm run test`, `npm run typecheck`, `npm run build` – כולן חייבות לעבור.

## 12. בדיקה ידנית (Claude, בדפדפן עם אמולציית מובייל)
- הפסד ← "אודות": כרטיס עם תאריך ושעה נוכחיים, "שלבים שהושלמו", "תוצאה: הפסד".
- Refresh ← ההיסטוריה נשארת. רענון באמצע משחק לא מוסיף רשומה.
- יצירת 11 רשומות (משחקים קצרים או הזרקה ב-DevTools) ← 10 כרטיסים, גלילה תקינה, ללא גלילה אופקית, פס ניווט נגיש.
- "מחק היסטוריה" ← "ביטול" ← ללא שינוי; ← "מחק" ← חיווי ריק.
- דימוי כשל אחסון (החלפת `localStorage.setItem` בזורק דרך הקונסול) ← הודעה בעברית, המשחק ממשיך.
- **Build ו-Preview (ADR-11):** `npm run build` ואז `npm run preview` ← `http://localhost:4173/Simon/` נטען (לא דף לבן), משחק + היסטוריה עובדים. סוגרים את ה-Preview בסיום.
- הבדיקה ב-GitHub Actions וב-GitHub Pages מתבצעת **רק אחרי** שהמשתמש מבקש דחיפה; עד אז הסעיף הזה ב-DoD מסומן "ממתין לדחיפה".

## 13. תיעוד
- `MILESTONES.md`: סימון 🟡 ליד Milestone 4 בסיום הבנייה.
- ADR-4 כבר מתאר את המבנה; ADR חדש רק אם הבנייה תסטה ממנו.
- `outcome` נשמר כ-`'win'`/`'loss'` לפי מודל הנתונים ב-ARCHITECTURE §2.5 (שגובר על נושאי נתונים); ב-MILESTONES מופיע `won`/`lost` – אלה שמות מצבי המשחק, והמיפוי נעשה ברישום.

## 14. Definition of Done – מיפוי
| תנאי | איך נבדק |
|---|---|
| ניצחון/הפסד מוסיפים בדיוק רשומה אחת עם זמן, שלבים שהושלמו ו"ניצחון"/"הפסד" | App tests 1, 2, 5; ידני |
| מעבר מסכים, השהיה, Refresh או יציאה באמצע לא מוסיפים רשומה | App tests 3, 4; ידני (Refresh) |
| אחרי 11 משחקים – לכל היותר 10, חדש→ישן, נשמרות אחרי Refresh | Storage test 3; App tests 6, 7; ידני |
| "ביטול" לא משנה; "מחק" מרוקן ומחזיר חיווי ריק | App test 9; ידני |
| כשל אחסון לא מונע משחק, הודעה בעברית בכשל שמירה/מחיקה | Storage test 7; App tests 10–12; ידני |
| בדיקות אוטומטיות להיסטוריה, מגבלת עשר, מחיקה, כשל ושמירה כפולה | `historyStorage.test.ts` + App tests |
| Build מצליח, Preview נטען ועובד כולל היסטוריה; אחרי דחיפה – Actions ו-Pages | ידני (Preview); Actions/Pages – אחרי דחיפה באישור המשתמש |
