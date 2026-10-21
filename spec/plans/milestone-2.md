# תוכנית – Milestone 2: משחק מלא מקצה לקצה

> מקורות: `MILESTONES.md` (Milestone 2), `PRD.md` §3ב, §4.2, §4.4 (ספירת שלבים), §4ב, `DESIGN.md` §1.1 (מצבי תצוגה + טבלת "קצב הצגת הרצף"), §2.3–2.4, `ARCHITECTURE.md` §2.2–2.4, §2.5 (Game Session), ADR-1, ADR-2, ADR-3 (`presentationId`), ADR-5.
> **מחוץ לאבן דרך זו:** מצב `paused` / "המשך משחק" / `visibilitychange` (M3), היסטוריה ו-`localStorage` (M4), PWA (M5).

## 1. מטרה
משחק אמיתי: "התחל משחק" ← הצגת רצף (הארה + צליל) ← תור השחקן ← שלב הבא / הפסד / ניצחון ← הודעת סיום עם "אישור" ← חזרה למצב התחלה. קונפטי בניצחון בלבד.

## 2. תלויות
- **dependencies:** `canvas-confetti`
- **devDependencies:** `@types/canvas-confetti`
- אין תלויות נוספות (אודיו = Web Audio API מובנה).

## 3. מבנה קבצים

```text
src/
  game/
    colors.ts            # (exists) unchanged
    gameReducer.ts       # NEW – pure state machine (no audio, no timers, no random)
    gameReducer.test.ts  # NEW – unit tests of all transitions
    random.ts            # NEW – randomColor() using Math.random (mocked in tests, ADR-2)
    timing.ts            # NEW – pacing constants + abortable sleep(ms, signal)
    playSequence.ts      # NEW – Sequence Controller: lights + tones, cancellable
    playSequence.test.ts # NEW – exact pacing with fake timers
    useGame.ts           # NEW – hook held in App: reducer + effects + audio + timers
  audio/
    audioEngine.ts       # NEW – AudioContext unlock, color tones, win/lose motifs, stopAll
    audioEngine.test.ts  # NEW – four distinct frequencies
  components/
    SimonBoard.tsx       # CHANGE – props: lit color, dimmed, input enabled, onPress
    ResultOverlay.tsx    # NEW – win/lose dialog over the board + "אישור" + confetti
  screens/
    HomeScreen.tsx       # CHANGE – driven by game state from props
  App.tsx                # CHANGE – owns useGame; temporary cancel on navigating to About
  App.test.tsx           # CHANGE – full-flow integration tests
  styles/board.css       # CHANGE – dimmed / lit / glow states
  styles/global.css      # CHANGE – overlay, hint text, audio error text
```

## 4. מצב המשחק – `gameReducer.ts`

**State** (לפי ARCHITECTURE §2.5, בלי `paused` עדיין):

| שדה | משמעות |
|---|---|
| `status` | `'idle' \| 'presenting' \| 'awaitingInput' \| 'won' \| 'lost'` |
| `sequence` | `ColorId[]`, אורך = `round` |
| `round` | 1–10 (ב-`idle` = 1) |
| `inputIndex` | הלחיצה הבאה הצפויה |
| `completedRounds` | 0–10 |
| `gameId` | עולה בכל `start` (Guard לשמירה ב-M4) |
| `presentationId` | עולה בכל כניסה ל-`presenting`; סיום הצגה מיושן מתעלם (ADR-3) |
| `intro` | `'start' \| 'advance'` – איזו המתנה קודמת להצגה (ראה §6) |

**Actions** (הצבע האקראי מגיע מבחוץ – ADR-2):

| Action | מותר מ- | תוצאה |
|---|---|---|
| `start { firstColor }` | `idle` | `sequence=[firstColor]`, `round=1`, `completedRounds=0`, `gameId+1`, `presentationId+1`, `intro='start'`, `presenting` |
| `presentationDone { presentationId }` | `presenting` עם אותו id | `awaitingInput`, `inputIndex=0` |
| `press { color, nextColor }` | `awaitingInput` | שגוי → `lost`, `completedRounds=round-1`. נכון ולא אחרון → `inputIndex+1`. נכון ואחרון בשלב <10 → `completedRounds=round`, `round+1`, `sequence=[...sequence, nextColor]`, `inputIndex=0`, `presentationId+1`, `intro='advance'`, `presenting`. נכון ואחרון בשלב 10 → `won`, `completedRounds=10` |
| `dismiss` | `won` / `lost` | חזרה ל-`initialState`, תוך שמירת `gameId` ו-`presentationId` (ADR-5) |
| `cancel` | `presenting` / `awaitingInput` | כמו `dismiss` – **פתרון זמני של M2** למעבר ל"אודות" |

כל Action שלא מותר במצב הנוכחי מחזיר את אותו State (לחיצות ב-`presenting`, ב-`won`, שלב 11 וכו').

## 5. אודיו – `audioEngine.ts`
- `unlockAudio(): Promise<boolean>` – יוצר `AudioContext` בפעם הראשונה ו-`resume()`; נקרא **סינכרונית מתוך ה-click** של "התחל משחק". מחזיר `false` אם אין תמיכה / `resume` נכשל / המצב לא `running`.
- `startTone(color): () => void` – Oscillator (`triangle`) + `GainNode` עם Envelope קצר (attack/release ~10ms, למניעת קליקים); מחזיר פונקציית עצירה. תדרים (Simon הקלאסי): ירוק 415Hz, אדום 310Hz, צהוב 252Hz, כחול 209Hz.
- `playWin()` – ארפג'יו עולה קצר (C5-E5-G5-C6). `playLose()` – שני צלילים יורדים נמוכים (`sawtooth`). מוטיבים נבדלים.
- `stopAll()` – עוצר מיד כל צליל פעיל (רשימת צלילים פעילים בתוך המודול).
- **כשל אודיו:** אם `unlockAudio()` מחזיר `false` – המשחק **לא מתחיל**, נשארים ב-`idle`, ובאזור הסטטוס מוצג: **"לא ניתן להפעיל צליל. לחצו שוב על „התחל משחק"."** (נוסח מוצע – ARCHITECTURE §2.4 דורש הודעה קצרה בעברית בלי לקבוע נוסח). לחיצה נוספת מנסה שוב.

## 6. קצב ובקר הרצף – `timing.ts`, `playSequence.ts`
קבועים (DESIGN §1.1, זהים בכל השלבים):
`TONE_MS=600`, `GAP_MS=250`, `LEAD_IN_MS=1000`, `ROUND_HOLD_MS=1000`, `NEXT_ROUND_MS=1000`, `END_DELAY_MS=1000`, `PRESS_MIN_MS=300`.

- `sleep(ms, signal)` – Promise שנדחה מיד כש-`signal` מבוטל (ומנקה את ה-Timer).
- `playSequence(sequence, { signal, onLight })` – לכל צבע: `onLight(color)` + `startTone` ← `TONE_MS` ← כיבוי + עצירת צליל ← `GAP_MS` (בין צבעים בלבד). בביטול: כיבוי הארה ועצירת צליל מיידיים.
- **ציר הזמן ב-`useGame`** (Effect לפי `[status, presentationId]` כש-`presenting`; Cleanup = `abort()`):
  - `intro='start'`: `LEAD_IN_MS` ← הצגה ← `presentationDone`.
  - `intro='advance'`: חיווי השלב מציג עדיין את השלב שהושלם `ROUND_HOLD_MS` ← מוצג מספר השלב הבא ← `NEXT_ROUND_MS` ← הצגה ← `presentationDone`.
  - לשם כך `useGame` מחזיק `shownRound` (מספר השלב המוצג), שמתעדכן לפי ציר הזמן.
  - Strict Mode מריץ את ה-Effect פעמיים: הריצה הראשונה מבוטלת מיד, השנייה מתחילה מאפס – לא נשמע כפול.

## 7. הלוח ולחיצות השחקן – `SimonBoard.tsx`
- Props: `litColor: ColorId | null`, `dimmed: boolean` (בזמן `presenting`), `inputEnabled: boolean` (רק `awaitingInput`), `onPress(color)`.
- קלט ב-`pointerdown` (ADR-2): `onPress` ← צליל ו-Highlight מקומי לרבע. כיבוי: הארוך מבין `PRESS_MIN_MS` לשחרור האצבע (`pointerup`/`pointercancel` מאזינים ב-`window`, כי הרבע עלול להפוך ל-`disabled` לפני השחרור). Enter/Space במקלדת = לחיצה של `PRESS_MIN_MS`.
- רבעים `disabled` כש-`inputEnabled=false`, וגם ה-Reducer מתעלם – הגנה כפולה.
- CSS: `.board--dimmed .quadrant` – `filter: brightness(0.45) saturate(0.7)`; `.quadrant--lit` – בהירות מלאה + `box-shadow` Glow בצבע הרבע; ב-`idle`/`awaitingInput` צבעים מלאים (כמו ב-Mockups). `disabled` בלי מראה "אפור" נוסף – העמעום נקבע רק ע"י `dimmed`.

## 8. סיום משחק – `useGame` + `ResultOverlay.tsx`
- **לחיצה שגויה:** צליל הרבע שנלחץ מיד (כמו כל לחיצה) ← `lost` ← `END_DELAY_MS` ← `playLose()` + הצגת ההודעה (יחד).
- **השלמת שלב 10:** `won` ← `END_DELAY_MS` ← `playWin()` + הודעה + קונפטי.
- ה-Timer של `END_DELAY_MS` חי ב-`useGame` (ברמת `App`) ומחזיק `resultVisible`; Cleanup מבטל אותו.
- `ResultOverlay` – שכבה מעל הלוח (הלוח נשאר מזוהה ברקע), `role="dialog"`, `aria-modal`, כרטיס בצבע `Surface` עם גבול `Border`:
  - ניצחון: **"כל הכבוד! ניצחת!"**
  - הפסד: **"נפסלת!"** + **"השלמת <n> שלבים"** (n=1 ← **"השלמת שלב אחד"**; n=0 ← "השלמת 0 שלבים").
  - כפתור ראשי **"אישור"** ← `dismiss` ← מצב "לפני תחילת משחק" (שלב 1 מתוך 10, "התחל משחק"). "אישור" אינו Gesture אודיו (ADR-5).
- **קונפטי:** ב-`ResultOverlay`, Effect בהצגת ניצחון בלבד: `confetti({ disableForReducedMotion: true, ... })` בצבעי המשחק; Cleanup = `confetti.reset()`. מודול `canvas-confetti` עטוף כך שקל להחליף אותו ב-Mock בבדיקות.
- חיווי השלב בסיום נשאר על השלב האחרון שהיה פעיל.

## 9. מסך הבית – טקסטים לפי מצב (DESIGN §1.1)

| מצב | חיווי סטטוס (מעל הלוח) | אזור פעולה (מתחת ללוח) |
|---|---|---|
| `idle` | ריק (או הודעת כשל אודיו) | **"התחל משחק"** |
| `presenting` | **"המשחק מציג את הרצף"** | ללא כפתור |
| `awaitingInput` | **"התור שלך"** | הנחיה: **"הקש על הצבעים לפי הסדר"** |
| `won` / `lost` | – | ה-Overlay עם "אישור" (לפני שהוא מופיע: אזור ריק) |

## 10. מעבר ל"אודות" באמצע משחק – פתרון זמני
- ב-`App`: לפני מעבר ל-`about`, אם `status` הוא `presenting`/`awaitingInput` ← `game.cancel()`: `abort()` של הבקר, `stopAll()`, כיבוי הארה ← `dispatch({type:'cancel'})`. לא נרשמת תוצאה.
- משחק שכבר ב-`won`/`lost` אינו מבוטל; ההודעה מוצגת בחזרה לבית (תואם ARCHITECTURE §2.3 כלל 10).
- יוחלף ב-`pause` ב-Milestone 3 (ADR-3).

## 11. בדיקות אוטומטיות
- **`gameReducer.test.ts`:** אורך רצף 1/2/10 ושמירת הרישא (prefix) עם צבע אחד חדש בסוף, כולל חזרה על אותו צבע; לחיצה ב-`presenting` – ללא שינוי; הפסד בשלב 1 ← `completedRounds=0`; הפסד בשלב 5 ← 4; ניצחון אחרי שלב 10 ← 10; אין שלב 11 (לחיצה ב-`won` מתעלמת); `presentationDone` מיושן מתעלם; `dismiss` ← `idle` עם `gameId` שמור; `start` הבא ← רצף חדש ו-`gameId` חדש; `cancel`.
- **`playSequence.test.ts`** (Fake Timers): צבע ראשון נדלק ב-0, כבה ב-600, השני נדלק ב-850; קצב זהה בשלב 1 ובשלב 10; `abort` באמצע ← כיבוי + `stopAll` ואין קריאות נוספות.
- **`audioEngine.test.ts`:** ארבעה תדרים שונים זה מזה.
- **`App.test.tsx`** (Fake Timers, `fireEvent` סינכרוני, Mock ל-`audioEngine`, `random`, `canvas-confetti`):
  - התחלה ← "המשחק מציג את הרצף", רבעים `disabled`; אחרי ההצגה ← "התור שלך".
  - לחיצה נכונה ← "שלב 1" נשאר 1000ms ← "שלב 2 מתוך 10".
  - לחיצה שגויה בשלב 1 ← צליל הרבע מיד; אחרי 1000ms "נפסלת!", "השלמת 0 שלבים", `playLose` נקרא; קונפטי **לא** נקרא.
  - הפסד בשלב מתקדם ← מספר שלבים נכון.
  - משחק מלא של 10 שלבים ← "כל הכבוד! ניצחת!", `playWin` וקונפטי נקראו.
  - "אישור" ← "שלב 1 מתוך 10" + "התחל משחק"; משחק חדש משתמש ברצף חדש מ-`random`.
  - מעבר ל"אודות" באמצע הצגה/תור ← `stopAll` נקרא, `vi.getTimerCount() === 0`, ובחזרה מצב התחלה.
  - `unlockAudio` מחזיר `false` ← נשארים ב-`idle` עם הודעת הכשל.
- `npm run typecheck`, `npm run test`, `npm run build` עוברים.

## 12. בדיקה ידנית (בדפדפן, אמולציית מובייל + טלפון אם אפשר)
- ארבעה צלילים שונים והארה ברורה; קצב קבוע בשלבים 1 ו-5.
- לחיצה ארוכה ← הארה וצליל כל עוד האצבע לוחצת.
- הפסד: צליל הרבע מיד, ושנייה אחר כך צליל הפסד + הודעה; ניצחון (בדיקה ידנית מלאה של 10 שלבים) עם קונפטי.
- Refresh באמצע משחק ← מצב התחלה.
- מעבר ל"אודות" באמצע ← אין צליל/הארה ממשיכים.
- אין גלילה אופקית; ה-Overlay קריא בטלפון אנכי.
- **מגבלה:** בדיקת צליל בטלפון אמיתי תלויה במשתמש (iPhone במצב שקט לא ישמיע – ARCHITECTURE §1).

## 13. תיעוד
- ADR חדש ב-`ARCHITECTURE.md` (ADR-10): ציר הזמן של ההצגה (`intro` + `shownRound`) והחזקת Timer הסיום ב-`useGame` ברמת `App`.
- עדכון "פקודות הרצה" ב-`CLAUDE.md` רק אם משהו משתנה (לא צפוי).
- סימון 🟡 ליד Milestone 2 ב-`MILESTONES.md` בסיום הבנייה.

## 14. Definition of Done – מיפוי
| תנאי | איך נבדק |
|---|---|
| התחלה, אורכים 1/2/10, רישא נשמרת | reducer + App tests |
| צלילים שונים, הארה נבדלת, קצב קבוע | audioEngine + playSequence tests + ידני |
| חסימה ב-`presenting`, התקדמות, הפסד מיידי | reducer + App tests |
| הפסד שלב 1, הפסד מתקדם, ניצחון, אין שלב 11, רצף חדש אחרי "אישור" | reducer + App tests |
| טקסט + צליל סיום; קונפטי בניצחון בלבד | App tests (Mocks) + ידני |
| Refresh מאפס, אין אחסון מתמיד | אין שימוש ב-Storage (בדיקת קוד) + ידני |
| קצב לפי הטבלה; צליל שגוי מיד והפסד אחרי שנייה | playSequence + App tests |
| "אודות" באמצע – אין הארה/צליל/Timer | App test (`getTimerCount`) + ידני |
