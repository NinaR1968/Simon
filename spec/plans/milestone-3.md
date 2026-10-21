# תוכנית – Milestone 3: השהיה וחידוש משחק

> מקורות: `MILESTONES.md` (Milestone 3), `PRD.md` §3ב ("מעבר למסך אודות והמשך משחק"), §4.3, §4ב (מקרי קצה של השהיה), הבהרות §6; `DESIGN.md` §1.1 (מצב "מושהה", טבלת "קצב הצגת הרצף"), §1.4; `ARCHITECTURE.md` §2.2 (Visibility Handler), §2.3 (כללים 3, 5–7, 9–10), §2.4, §2.6 ("השהיה וחזרה"), §2.10, ADR-3, ADR-10.
> **מחוץ לאבן דרך זו:** היסטוריה ו-`localStorage` (M4), PWA ופריסה (M5).

## 1. מטרה
במקום לבטל את המשחק במעבר ל"אודות" (הפתרון הזמני של M2) – להשהות אותו. השהיה קורית גם כשהאפליקציה מוסתרת (מעבר לאפליקציה אחרת, נעילת מסך). החזרה לבית מציגה **"המשחק מושהה"** וכפתור **"המשך משחק"**; רק לחיצה עליו מציגה מחדש את הרצף **המלא** של אותו שלב, ואז השחקן משחזר מההתחלה.

## 2. תלויות
אין תלויות חדשות.

## 3. מבנה קבצים

```text
src/
  game/
    gameReducer.ts       # CHANGE – add 'paused' status, 'pause' + 'resume' actions; remove 'cancel'
    gameReducer.test.ts  # CHANGE – pause/resume tests; drop cancel test
    useGame.ts           # CHANGE – pause() / resume(); visibilitychange + pagehide listeners
  components/
    SimonBoard.tsx       # CHANGE – end an in-progress player press when the game pauses
  screens/
    HomeScreen.tsx       # CHANGE – paused texts + "המשך משחק" button; dimmed board while paused
  App.tsx                # CHANGE – navigating to About calls game.pause() (not cancel)
  App.test.tsx           # CHANGE – replace the M2 "cancel" test with pause/resume integration tests
```

אין שינוי ב-`playSequence.ts`, `timing.ts`, `audioEngine.ts`, `ResultOverlay.tsx`, `AboutScreen.tsx`. אין CSS חדש: מצב מושהה משתמש ב-`board--dimmed` הקיים.

## 4. מצב המשחק – `gameReducer.ts` (לפי ADR-3)

- `GameStatus` מקבל ערך נוסף: `'paused'`.
- **מסירים** את ה-Action `cancel`. הפונקציה `reset` נשארת (בשימוש ב-`dismiss`).

| Action | מותר מ- | תוצאה |
|---|---|---|
| `pause` | `presenting`, `awaitingInput` | `status='paused'`, `inputIndex=0`, `presentationId+1` (סיום Playback מיושן יתעלם). `sequence`, `round`, `completedRounds`, `gameId` ללא שינוי |
| `resume` | `paused` | `status='presenting'`, `presentationId+1`, `intro='start'` (המתנת `1000ms` לפני הרצף, כמו אחרי "התחל משחק" – DESIGN §1.1), `inputIndex=0`; אותו `sequence` ואותו `round` |

- מכל מצב אחר `pause`/`resume` מחזירים את אותו אובייקט state (ללא שינוי). כך `won`/`lost`/`idle` לא מושפעים מהשהיה (ARCHITECTURE §2.3 כלל 10), וריבוי `resume` (שתי לחיצות מהירות) לא מתחיל הצגה כפולה.
- `press` כבר מותר רק מ-`awaitingInput` → לחיצות במצב `paused` מתעלמות מעצמן.
- **השהיה במעבר בין שלבים:** אחרי שחזור נכון הרצף כבר הוגדל ו-`round` כבר עלה (`presenting` עם `intro='advance'`). השהיה בזמן הזה היא השהיה של השלב הבא, ו-`resume` מציג את הרצף המלא שלו – בלי קוד מיוחד.

## 5. `useGame.ts`

### 5.1 `pause()`
```ts
const pause = useCallback(() => {
  if (!activeRef.current) return;      // idle / won / lost: do nothing
  stopAll();                           // cut any sounding tone immediately
  dispatch({ type: 'pause' });
}, []);
```
- `activeRef` = ref שמתעדכן בכל Render ל-`status === 'presenting' || status === 'awaitingInput'`, כדי ש-`pause` תהיה יציבה (useCallback בלי תלויות) ותתאים ל-Event listeners.
- ביטול ההארה וה-Timers של ההצגה קורה מעצמו: שינוי `status` מפעיל את ה-cleanup של ה-Effect הקיים (`controller.abort()` + `setLitColor(null)`) – אותו מנגנון של ADR-10.
- ה-Timer של הודעת הסיום (`won`/`lost`) **לא** נוגע – הוא ממשיך, וההודעה מוצגת כשהשחקן חוזר לבית.

### 5.2 `resume()`
```ts
const resume = useCallback(() => {
  // Called from the "המשך משחק" click so the AudioContext resumes inside the gesture.
  void unlockAudio().then((ok) => {
    setAudioError(!ok);
    if (ok) dispatch({ type: 'resume' });
  });
}, []);
```
בכשל אודיו – נשארים ב-`paused` עם הודעה (ARCHITECTURE §2.4, ADR-3), והכפתור נשאר לניסיון חוזר.

### 5.3 Visibility Handler
Effect אחד ב-`useGame` (רץ פעם אחת):
```ts
useEffect(() => {
  const onVisibility = () => { if (document.visibilityState === 'hidden') pause(); };
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', pause);
  return () => { /* remove both */ };
}, [pause]);
```
חזרה ל-`visible` לא עושה דבר (ללא Resume אוטומטי).

### 5.4 ערכים חדשים שה-Hook מחזיר
- `isPaused: state.status === 'paused'`
- `pause`, `resume` (במקום `cancel`, שנמחק)
- `displayRound`: במצב `paused` מוצג `state.round` (הנוסחה הקיימת כבר נותנת זאת, כי `holdingCompletedRound` דורש `presenting`).

## 6. הלוח – `SimonBoard.tsx`
בעיה: אם השחקן מחזיק אצבע על רבע ברגע שהאפליקציה מוסתרת, ה-Highlight של הלחיצה נשאר עד `pointerup` (הצליל עצמו נעצר ע"י `stopAll`).
- Prop חדש `paused?: boolean`. Effect: כש-`paused` הופך ל-`true` → `endPress()` (מכבה הארה + טיימר שחרור).
- לא קושרים זאת ל-`inputEnabled`, כי אחרי הלחיצה הנכונה האחרונה של שלב הקלט נחסם אבל משוב הלחיצה צריך להימשך `300ms` (DESIGN §1.1).
- מעבר ל"אודות" מסיר את הלוח מהמסך, וה-cleanup הקיים כבר מכבה את הלחיצה.

## 7. מסך הבית – `HomeScreen.tsx` (DESIGN §1.1, מצב "מושהה")

| מצב | חיווי סטטוס | כפתור | לוח |
|---|---|---|---|
| `paused` | **"המשחק מושהה"**; אם החידוש נכשל באודיו: **"לא ניתן להפעיל צליל. לחצו שוב על „המשך משחק"."** | **"המשך משחק"** (`PrimaryButton`, `onClick={game.resume}`) | מעומעם (`dimmed`), קלט חסום |

- חיווי השלב: **"שלב X מתוך 10"** של השלב הנוכחי (כולל מושהה).
- הכפתור **"המשך משחק"** מוצג **רק** ב-`paused`; **"התחל משחק"** רק ב-`idle` (ללא שינוי).
- `SimonBoard` מקבל `paused={state.status === 'paused'}` ו-`dimmed` גם במצב `paused`.

## 8. `App.tsx`
```ts
const navigate = (next: Screen) => {
  if (next === 'about') game.pause();   // no-op unless a game is active
  setScreen(next);
};
```
מוחקים את ההערה על הפתרון הזמני של M2.

## 9. מקרי קצה – איך כל אחד מכוסה
| מקרה (PRD §4ב / MILESTONES) | מנגנון |
|---|---|
| השהיה באמצע הצגה | `pause` → abort של ציר הזמן + `stopAll` + `setLitColor(null)` |
| השהיה באמצע שחזור (קלט חלקי) | `pause` מאפס `inputIndex`; `resume` מציג את כל הרצף מההתחלה |
| Callback מיושן אחרי השהיה | `presentationId+1` ב-`pause` → `presentationDone` ישן נדחה ב-Reducer; `sleep` מבוטל מנקה את ה-Timer |
| ריבוי לחיצות "המשך משחק" | `resume` מותר רק מ-`paused`; לחיצה שנייה לא עושה כלום |
| לחיצה על הלוח בזמן מושהה / הצגה | הלוח `disabled` + `press` מותר רק מ-`awaitingInput` |
| יציאה בשנייה שאחרי טעות / ניצחון | `pause` לא פועל מ-`won`/`lost`; ה-Timer של ההודעה ממשיך; ההודעה מוצגת בחזרה לבית |
| יציאה במעבר בין שלבים | הרצף והשלב כבר עודכנו → `resume` מציג את הרצף המלא של השלב הבא |
| הסתרה כשכבר מושהה / במסך "אודות" | `pause` מתעלם (לא פעיל) |
| Refresh | המצב בזיכרון בלבד → חוזר ל-`idle`; אין כתיבה לאחסון |

## 10. בדיקות אוטומטיות

**`gameReducer.test.ts`:**
- `pause` מ-`presenting` ומ-`awaitingInput` (אחרי קלט חלקי): `paused`, `inputIndex=0`, `presentationId` עלה, `sequence`/`round`/`completedRounds` זהים.
- `pause` מ-`idle`/`won`/`lost`/`paused` – מחזיר את אותו state.
- `presentationDone` עם ה-id הישן אחרי `pause` – מתעלם.
- `press` ב-`paused` – מתעלם.
- `resume` מ-`paused` → `presenting`, אותו רצף ושלב, `intro='start'`, `presentationId` חדש; `resume` שני (כבר `presenting`) – ללא שינוי; `resume` מ-`idle` – ללא שינוי.
- `pause` במעבר שלב (`presenting` + `intro='advance'`) → `resume` שומר את השלב החדש ואת הרצף המוגדל.
- מחיקת הבדיקה של `cancel`.

**`App.test.tsx`** (fake timers + אודיו מדומה, כמו היום) – מחליפים את בדיקת ה-cancel:
1. מעבר ל"אודות" באמצע הצגה: `stopAll` נקרא, `vi.getTimerCount() === 0`; חזרה ל"בית" → "המשחק מושהה", "המשך משחק", אין "התחל משחק", אין רבע מואר; אחרי `advance(5000)` אין `startTone` נוסף (אין Resume אוטומטי).
2. "המשך משחק" מציג מחדש את **כל** הרצף (רשימת `startTone` זהה לרצף), השלב לא השתנה, ולא נוסף צבע.
3. השהיה באמצע שחזור (אחרי לחיצה נכונה ראשונה בשלב 2) → חידוש → הרצף המלא מוצג שוב, ואז צריך להקיש מההתחלה (הקשה של הצבע השני בלבד = הפסד; הקשה מלאה = מעבר שלב).
4. `visibilitychange` ל-`hidden` (מדמים `document.visibilityState`) → מושהה; חזרה ל-`visible` → עדיין מושהה. אותו דבר ל-`pagehide`.
5. יציאה בשנייה שאחרי לחיצה שגויה → חזרה לבית → אחרי `1000ms` מופיעה הודעת "נפסלת!" (וגם אם חוזרים אחרי שהזמן עבר); אין "המשך משחק".
6. יציאה במעבר בין שלבים (מיד אחרי השלמת שלב 1) → חזרה → "שלב 2 מתוך 10" → חידוש מציג 2 צבעים.
7. כשל אודיו בחידוש: `unlockAudio` → `false` → נשאר מושהה עם הודעה, אין `startTone`; לחיצה חוזרת עם הצלחה – ממשיך.
8. "המשך משחק" נלחץ פעמיים מהר → הרצף מוצג פעם אחת בלבד.

הפקודות: `npm run test`, `npm run typecheck`, `npm run build` – כולן חייבות לעבור.

## 11. בדיקה ידנית (Claude, בדפדפן עם אמולציית מובייל)
- התחלת משחק → "אודות" באמצע הצגה → "בית": מושהה, לוח מעומעם, שקט, "המשך משחק".
- "המשך משחק" → המתנה שנייה → הרצף המלא, ואז תור השחקן.
- השהיה אחרי קלט חלקי, השהיה במעבר שלב, יציאה אחרי טעות – לפי §9.
- הסתרת לשונית (מעבר ללשונית אחרת) וחזרה – מושהה, ללא חידוש עצמי.
- רענון דף במצב מושהה → מצב התחלה.
- נעילת טלפון / מעבר לאפליקציה אחרת במכשיר אמיתי – נבדק ע"י המשתמש בשלב "הרץ כדי שאבדוק" (לא יוצג כעבר אם לא נבדק).

## 12. תיעוד
- `MILESTONES.md`: סימון 🟡 ליד Milestone 3 בסיום הבנייה.
- ADR-3 כבר מתאר את ההחלטה; אם ייבחר בבנייה פתרון שונה ממנו (למשל לגבי עצירת לחיצת השחקן) – ADR חדש ב-`ARCHITECTURE.md`.

## 13. Definition of Done – מיפוי
| תנאי | איך נבדק |
|---|---|
| מעבר ל"אודות" בזמן הצגה ובזמן שחזור משהה ועוצר מיד הארה וצליל | App tests 1, 3; ידני |
| חזרה לבית לא מפעילה את הרצף; "המשך משחק" רק במשחק מושהה | App test 1, 5; ידני |
| "המשך משחק" מציג את כל הרצף גם אחרי קלט חלקי; שלב ללא שינוי, אין צבע חדש | App tests 2, 3; Reducer tests |
| הסתרה וחזרה פועלות באותו כלל, בלי שינוי מ-Callback שבוטל | App test 4; Reducer (presentationDone מיושן); ידני (לשונית) + טלפון אצל המשתמש |
| השהיה אינה הפסד; Refresh מאפס | App tests 1–2 (אין הודעת סיום); ידני (Refresh) |
| יציאה אחרי טעות/ניצחון מציגה את הודעת הסיום; יציאה במעבר שלב מציגה בחידוש את הרצף של השלב הבא | App tests 5, 6 |
