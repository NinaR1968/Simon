# תוכנית – Milestone 1: בסיס אפליקציה ושני מסכים מעוצבים

> מקורות: `MILESTONES.md` (Milestone 1), `PRD.md` §3–4.1, `DESIGN.md` §1–2, `ARCHITECTURE.md` §1, §2.1–2.2, §2.4, §2.9, ADR-1, ADR-2, ADR-8.
> באבן דרך זו **אין לוגיקת משחק**: הלוח והכפתור מוצגים בלבד. אין אודיו, קונפטי, היסטוריה אמיתית או PWA.

## 1. מטרה
פרויקט React + TypeScript + Vite שרץ מקומית, עם שני מסכים (בית / אודות) בעיצוב הכהה של ה-Mockups, ניווט פנימי ללא טעינת דף, RTL ועברית, ובדיקה אוטומטית בסיסית.

## 2. הקמת הפרויקט

### 2.1 תלויות (רק מה שנחוץ עכשיו)
- **dependencies:** `react`, `react-dom`, `@fontsource/heebo`
- **devDependencies:** `vite`, `@vitejs/plugin-react`, `typescript`, `@types/react`, `@types/react-dom`, `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`
- **לא מתקינים עכשיו:** `canvas-confetti` (M2), `vite-plugin-pwa` / `@vite-pwa/assets-generator` (M5). אין ESLint/Prettier – לא נדרשים ב-spec.
- גרסת Node מקומית: 24 (LTS). נעילת גרסאות דרך `package-lock.json`.

### 2.2 סקריפטים ב-`package.json`
| סקריפט | פקודה |
|---|---|
| `dev` | `vite` |
| `build` | `tsc -b && vite build` |
| `preview` | `vite preview` |
| `typecheck` | `tsc -b --noEmit` (או `tsc -p tsconfig.app.json --noEmit`) |
| `test` | `vitest run` |

### 2.3 קבצי תצורה
- `vite.config.ts` – plugin React, **`base: '/Simon/'`** (ADR-8, כבר מעכשיו כדי שהכתובת המקומית תהיה `http://localhost:5173/Simon/` לאורך כל הפרויקט), בלוק `test` של Vitest: `environment: 'jsdom'`, `setupFiles: './src/test/setup.ts'`, `globals: true`.
- `tsconfig.json` / `tsconfig.app.json` / `tsconfig.node.json` – לפי תבנית Vite React-TS, `strict: true`, types של `vitest/globals` ו-`@testing-library/jest-dom`.
- `index.html` – `<html lang="he" dir="rtl">`, `<title>סיימון</title>`, `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`, `<meta name="theme-color" content="#0A1628">`.
- `.gitignore` – כבר מכסה `node_modules/` ו-`dist/`; אין צורך בשינוי.
- אין צורך ב-`.env` / `.env.example` – לאפליקציה אין הגדרות או מפתחות.

## 3. מבנה קבצים

```text
index.html
vite.config.ts
tsconfig.json, tsconfig.app.json, tsconfig.node.json
package.json, package-lock.json
src/
  main.tsx                 # imports Heebo weights + global CSS, renders <App/>
  App.tsx                  # holds current screen ('home' | 'about'), renders screen + NavBar
  App.test.tsx             # render + navigation tests
  vite-env.d.ts
  game/
    colors.ts              # color ids, Hebrew labels, grid positions (ADR-1)
  components/
    SimonBoard.tsx         # round 2x2 board of 4 <button>s + decorative center disc
    NavBar.tsx             # bottom tabs "בית" / "אודות"
    PrimaryButton.tsx      # blue full-width rounded button
  screens/
    HomeScreen.tsx         # title, stage text, board, status area, "התחל משחק"
    AboutScreen.tsx        # title, "על המשחק" card, history heading + empty state
  styles/
    tokens.css             # CSS variables: colors, spacing, radii, font sizes
    global.css             # reset, body, RTL, layout, no horizontal scroll
    board.css              # board geometry & quadrant styles
  test/
    setup.ts               # @testing-library/jest-dom
```
(שמות קבצי CSS יכולים להיות מאוחדים אם יוצא פשוט יותר – המטרה היא קוד ברור, לא מספר קבצים.)

## 4. פירוט רכיבים

### 4.1 `App.tsx` – App Shell וניווט
- `useState<'home' | 'about'>('home')`. **אין Router** ואין שינוי URL (ARCHITECTURE §2.1, §2.9).
- מבנה: `<div class="app">` → `<main>` עם המסך הפעיל → `<NavBar>` קבוע בתחתית.
- ב-M2 ה-Hook של המשחק (`useGame`) יישב כאן, לכן מבנה ה-Shell נשאר פשוט ומאפשר זאת.

### 4.2 `NavBar.tsx`
- `<nav aria-label="ניווט ראשי">` עם שני `<button>`: **"בית"**, **"אודות"**; האפשרות הפעילה מסומנת `aria-current="page"` ובמראה מודגש (טקסט לבן ומודגש + רקע/קו מובחן), השנייה Soft Gray מעומעם.
- עיצוב לפי ה-Mockups: פס כהה (`Surface`) עם קו מתאר `Border`, פינות מעוגלות, מפריד אנכי דק בין שתי האפשרויות. סדר ב-RTL: "בית" מימין, "אודות" משמאל (כמו ב-Mockups).
- ללא אייקונים (ה-Mockups בלי אייקונים; DESIGN §2.3 – אייקונים אופציונליים ומשניים). פשוט יותר.

### 4.3 `game/colors.ts`
```ts
export type ColorId = 'green' | 'red' | 'yellow' | 'blue';
// order + grid areas follow DESIGN §1.1 (Mockups layout)
export const COLORS: { id: ColorId; label: string; area: string }[] = [
  { id: 'green',  label: 'ירוק',  area: 'top-left' },
  { id: 'red',    label: 'אדום',  area: 'top-right' },
  { id: 'yellow', label: 'צהוב',  area: 'bottom-left' },
  { id: 'blue',   label: 'כחול',  area: 'bottom-right' },
];
```

### 4.4 `SimonBoard.tsx` (לפי ADR-1)
- מיכל עגול (`aspect-ratio: 1`, `border-radius: 50%`), רקע Charcoal `#0F0F0F`, מסגרת `Border`, צל רך.
- בפנים CSS Grid 2×2 עם `direction: ltr` (הסידור המרחבי לא מתהפך ב-RTL) ו-`gap` עבה (פסי הפרדה כהים).
- כל רבע: `<button>` עם `aria-label` בעברית (שם הצבע), `grid-area` מפורש, ופינה חיצונית מעוגלת ברדיוס מלא (רבע עיגול). **ללא טקסט גלוי על הלוח.**
- דיסק מרכזי כהה במיקום absolute, `pointer-events: none`, ריק מטקסט.
- רוחב: `min(80vw, 340px)` בערך – גדול אך מותיר מקום לכותרת, טקסט, כפתור ופס ניווט במסך טלפון.
- ב-M1 הכפתורים לא עושים דבר (props `disabled`/ללא handler). מוסיפים כבר עכשיו CSS נגד בחירת טקסט ו-Double-tap zoom: `user-select: none`, `-webkit-tap-highlight-color: transparent`, `touch-action: manipulation`.
- הלוח מוצג במצב "מואר" רגיל (צבעים מלאים, כמו במצב "התחלה" ב-Mockups). מצבי Glow/עמעום יתווספו ב-M2/M3; אפשר להכין CSS Variables לכך אבל לא חובה.

### 4.5 `HomeScreen.tsx`
מלמעלה למטה (DESIGN §1.1):
1. כותרת מותג **"סיימון"** – H1 32px Bold, ממורכזת, קו מפריד דק (`Border`) מתחתיה כמו ב-Mockups.
2. חיווי שלב **"שלב 1 מתוך 10"** – H3 20px Semibold. המספרים בבידוד כיווניות (`<bdi>` או מבנה טקסט פשוט) כדי שיוצגו נכון.
3. `SimonBoard`.
4. אזור סטטוס (שורת טקסט, ריקה במצב התחלה – שומרת מקום יציב לטקסטים של M2).
5. `PrimaryButton` **"התחל משחק"** – ב-M1 ללא פעולה.

### 4.6 `AboutScreen.tsx`
1. כותרת **"אודות"** (H1, כמו ב-Wireframes; ה-Wireframes קובעים מבנה ותוכן).
2. כרטיס **"על המשחק"** (Surface + Border, פינות מעוגלות): תיאור קצר והוראות, לדוגמה:
   - "סיימון הוא משחק זיכרון של צבעים וצלילים."
   - "צפו ברצף הצבעים שהמשחק מציג."
   - "הקישו על הצבעים באותו הסדר."
   - "בכל שלב נוסף צבע אחד – נסו להגיע עד שלב 10!"
   - "טעות אחת מסיימת את המשחק."
3. כותרת **"10 המשחקים האחרונים"** (H2).
4. חיווי ריק: **"עדיין אין משחקים שמורים"** (Caption/Body, Soft Gray). ב-M1 תמיד ריק; כפתור "מחק היסטוריה" **לא מוצג** (מוצג רק כשיש רשומות – M4).
5. התוכן גולל אנכית אם צריך; פס הניווט נשאר קבוע.

### 4.7 `PrimaryButton.tsx`
כפתור כחול מלא `#00A3FF`, רוחב רחב (~80% / עד 320px), פינות מעוגלות מלאות (pill), טקסט לבן 16px Semibold, צל רך כחלחל. מצב `:active` מעט כהה/מוקטן. מצב disabled מעומעם (מוכן לשימוש עתידי).

## 5. עיצוב (Style tokens) – `tokens.css`
```css
:root {
  --green: #00D26A; --red: #FF3B30; --yellow: #FFD600; --blue: #00A3FF;
  --charcoal: #0F0F0F; --soft-gray: #E5E5E5; --white: #FFFFFF;
  --bg: #0A1628; --surface: #12213A; --border: #1E3556;
  --space-8: 8px; --space-12: 12px; --space-16: 16px; --space-24: 24px;
  --font: 'Heebo', Arial, sans-serif;
  --fs-h1: 32px; --fs-h2: 24px; --fs-h3: 20px; --fs-body: 16px; --fs-caption: 14px;
}
```
- `main.tsx` מייבא רק את המשקלים שבשימוש: `@fontsource/heebo/400.css`, `600.css`, `700.css` (ARCHITECTURE §2.7).
- `global.css`: `box-sizing: border-box`, `margin: 0`, רקע `--bg`, טקסט `--white`/`--soft-gray`, `font-family: var(--font)`, `overflow-x: hidden`, גובה מלא (`min-height: 100dvh`), עמודה אנכית: תוכן גמיש + ניווט בתחתית, `padding` עם `env(safe-area-inset-*)` לטלפונים עם Notch.
- רקע: אפשר להוסיף את הקשת הדקורטיבית העדינה מה-Mockups (קו `Border` דק מאחורי הכותרת) רק אם פשוט ב-CSS (`radial-gradient`/pseudo-element); אחרת לוותר – זה קישוט בלבד.
- Mobile-First: עיצוב לרוחב 360–430px; במסכים רחבים יותר התוכן ממורכז ברוחב מקסימלי (~480px). אין התאמה ייעודית ל-Desktop.

## 6. בדיקות אוטומטיות – `src/App.test.tsx`
1. **Render בית:** מופיעים "סיימון", "שלב 1 מתוך 10", כפתור "התחל משחק", וארבעה כפתורי לוח עם השמות "ירוק", "אדום", "צהוב", "כחול".
2. **סדר הלוח:** ארבעת הכפתורים מופיעים בסדר ירוק → אדום → צהוב → כחול (תואם למיקומים למעלה-שמאל, למעלה-ימין, למטה-שמאל, למטה-ימין).
3. **ניווט:** לחיצה על "אודות" מציגה "על המשחק" ו"עדיין אין משחקים שמורים", ולא מציגה כפתור "מחק היסטוריה"; לחיצה על "בית" מחזירה את הלוח. `aria-current` מתעדכן.
4. **אין מסך שלישי:** בפס הניווט בדיוק שני כפתורים.

## 7. בדיקה עצמית לפני סימון 🟡
- `npm run typecheck`, `npm run test`, `npm run build` – כולם עוברים.
- `npm run dev` והצצה בדפדפן המובנה באמולציית טלפון (375×812): השוואה ל-Mockups (צבעים, סידור הלוח, כותרת, כפתור, פס ניווט), מעבר בין המסכים בלי רענון (בדיקה שה-URL לא משתנה), אין גלילה אופקית (`document.documentElement.scrollWidth <= innerWidth`), כל הטקסט בעברית ומיושר לימין.
- סגירת שרת הפיתוח בסיום.

## 8. עדכוני מסמכים בסיום הבנייה
- `MILESTONES.md`: 🟡 ליד כותרת Milestone 1.
- `CLAUDE.md` → **פקודות הרצה**: הרצה `npm run dev -- --host` (כתובת `http://localhost:5173/Simon/`), בדיקות `npm run test`.
- `README.md` → סעיף **הרצה**: `npm install`, `npm run dev`, `npm run test`, `npm run build`.
- אין commit / push (לפי CLAUDE.md).

## 9. מחוץ לתחום של M1
לוגיקת משחק, Reducer, אודיו, הארות/Glow פעילים, קונפטי, השהיה, `localStorage`, Dialog מחיקה, PWA/Manifest/Service Worker, אייקונים, GitHub Actions.

## 10. הערות על סתירות שנפתרו לפי כללי CLAUDE.md
- **סידור הצבעים:** Mockups (ירוק/אדום למעלה, צהוב/כחול למטה) – לפי החלטה מפורשת ב-DESIGN §1.1.
- **טקסט על הלוח / בדיסק המרכזי:** אין – DESIGN §2.6.
- **"התחל" / "שלב 0"** בתמונות → **"התחל משחק"** / **"שלב 1 מתוך 10"** – DESIGN §2.6.
- **כותרת מסך אודות:** ב-Mockups "סיימון", ב-Wireframes ו-DESIGN §1.2 "אודות" → **"אודות"**.
- **חיווי השלב:** ב-Style Guide מוצג כ-Badge כהה עם נקודה כחולה, ב-Mockups כטקסט פשוט → טקסט H3 פשוט כמו ב-Mockups (המראה הסופי).
