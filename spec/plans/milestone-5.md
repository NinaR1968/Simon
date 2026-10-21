# תוכנית – Milestone 5: PWA, Offline ופרסום ב-GitHub Pages

> מבוסס על `MILESTONES.md` (Milestone 5), `PRD.md` §4.5, `ARCHITECTURE.md` §2.7, §2.9 ו-ADR-6, ADR-7, ADR-8, ADR-9, ADR-11, ו-`DESIGN.md` §2.4 (App Icon). הקוד הקיים (Milestones 1–4) הוא מקור האמת.

## 1. מטרה
להפוך את המשחק השלם לאפליקציה שניתן להתקין (PWA), שעובדת Offline אחרי טעינה ראשונה, ושמתעדכנת בלי לקטוע משחק פעיל – ולפרסם אותה ב-GitHub Pages דרך ה-Workflow הקיים.

## 2. מצב קיים (לא משנים)
- `base: '/Simon/'` כבר ב-`vite.config.ts` (ADR-8).
- `.github/workflows/deploy.yml` כבר מריץ `npm ci` → typecheck → test → build → פריסת `dist/` (ADR-11). הוא לא צריך שינוי: ה-Manifest, ה-Service Worker והאייקונים נוצרים בתוך `npm run build` ונכנסים ל-`dist/` מעצמם.
- הגופן Heebo כבר ארוז מקומית (`@fontsource/heebo` 400/600/700); אין משאבים חיצוניים.
- ה-remote הוא `https://github.com/NinaR1968/Simon.git` → כתובת Production: `https://ninar1968.github.io/Simon/`.
- השהיה ב-`visibilitychange`/`pagehide` כבר קיימת (`src/game/useGame.ts`).

## 3. תלויות חדשות (devDependencies)
- `vite-plugin-pwa` (2.x, תומך Vite 8) – כולל Workbox `generateSW`; מוסיפים גם `workbox-window` (peer).
- `@vite-pwa/assets-generator` (2.x) – יצירת קובצי ה-PNG/ICO מה-SVG (ADR-7). משמש רק מקומית; ה-CI לא מריץ אותו.

## 4. מבנה קבצים
| קובץ | פעולה |
|---|---|
| `public/icon.svg` | **חדש** – אייקון מקור, נכתב ידנית |
| `pwa-assets.config.ts` | **חדש** – תצורת יצירת האייקונים |
| `public/pwa-64x64.png`, `pwa-192x192.png`, `pwa-512x512.png`, `maskable-icon-512x512.png`, `apple-touch-icon-180x180.png`, `favicon.ico` | **חדשים** – נוצרים מהסקריפט ונשמרים ב-Repository |
| `src/pwa/manifest.ts` | **חדש** – אובייקט ה-Manifest וקבוע הנתיב, משותף ל-`vite.config.ts` ולבדיקה |
| `src/pwa/manifest.test.ts` | **חדש** – בדיקת שדות ה-Manifest |
| `vite.config.ts` | שינוי – הוספת `VitePWA(...)` |
| `src/main.tsx` | שינוי – רישום Service Worker |
| `index.html` | שינוי – קישורי Favicon ו-Apple Touch Icon |
| `package.json` | שינוי – תלויות + סקריפט `generate-pwa-assets` |
| `tsconfig.json` | שינוי – `types` מקבל `vite-plugin-pwa/client`; `include` מקבל `pwa-assets.config.ts` |
| `spec/ARCHITECTURE.md` | ADR חדש רק אם תתקבל החלטה טכנית שלא מכוסה ב-ADR-6/7/8/9 |

## 5. אייקון האפליקציה – `public/icon.svg` (DESIGN §2.4, ADR-7)
- קנבס `512×512`, רקע מלא `#0A1628` (Background), ללא פינות מעוגלות (מערכת ההפעלה חותכת בעצמה).
- לוח עגול בקוטר ~78% מהקנבס (בתוך ה-Safe Zone של Maskable), ממורכז.
- ארבעה רבעים בסידור הלוח, עם פסי הפרדה כהים: ירוק `#00D26A` למעלה-שמאל, אדום `#FF3B30` למעלה-ימין, צהוב `#FFD600` למטה-שמאל, כחול `#00A3FF` למטה-ימין.
- דיסק מרכזי כהה (`#0A1628` עם מסגרת `#1E3556`), ללא טקסט.
- `pwa-assets.config.ts`: Preset `minimal2023Preset` (מייצר בדיוק את הגדלים בטבלה), צבע רקע ל-Maskable/Apple `#0A1628`, ו-padding 0 (ה-SVG כבר כולל את השוליים).
- סקריפט: `"generate-pwa-assets": "pwa-assets-generator"`. מריצים פעם אחת, בודקים את ה-PNG בעין, ושומרים ב-`public/`.

## 6. Manifest – `src/pwa/manifest.ts` (§2.7, ADR-9)
```ts
export const BASE = '/Simon/';
export const manifest = {
  id: '/Simon/app',        // never change (ADR-9)
  name: 'Simon',
  short_name: 'Simon',
  description: 'משחק הזיכרון סיימון – חזרו על רצף הצבעים והצלילים.',
  lang: 'he',
  dir: 'rtl',
  start_url: BASE,
  scope: BASE,
  display: 'standalone',
  orientation: 'portrait',
  background_color: '#0A1628',
  theme_color: '#0A1628',
  icons: [
    { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
    { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
    { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
    { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
};
```
- `vite.config.ts` משתמש ב-`BASE` גם עבור `base` (מקור אחד לנתיב, ADR-8).
- `orientation: 'portrait'` – המוצר מיועד לטלפון אנכי (DESIGN); אם יתברר שזה לא רצוי, מסירים.

## 7. Service Worker – `vite.config.ts` (§2.7, ADR-6)
```ts
VitePWA({
  strategies: 'generateSW',
  registerType: 'prompt',
  injectRegister: false,
  manifest,
  includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'icon.svg'],
  workbox: {
    globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
    navigateFallback: 'index.html',   // inside the /Simon/ scope only
    cleanupOutdatedCaches: true,
    // no skipWaiting / clientsClaim (ADR-6)
  },
  devOptions: { enabled: false },
})
```
- **Precache:** HTML, JS, CSS, האייקונים וקובצי `woff2` של Heebo. קובצי `woff` הישנים לא נכללים (כל דפדפן מודרני משתמש ב-`woff2`). הצלילים נוצרים בקוד (Web Audio), ולכן אין קובצי אודיו לשמור.
- אין Runtime Caching, Background Sync או Push (§2.7).
- ב-dev ה-Service Worker כבוי, כדי שלא יפריע לפיתוח ולבדיקות בטלפון ב-HTTP.

## 8. רישום – `src/main.tsx` (ADR-6)
```ts
import { registerSW } from 'virtual:pwa-register';
registerSW({ immediate: true });
```
- בלי `onNeedRefresh` ובלי קריאה ל-`updateSW()`: גרסה חדשה מותקנת ברקע ונכנסת לתוקף רק אחרי שכל חלונות האפליקציה נסגרים ונפתחים מחדש. לכן עדכון לעולם אינו מרענן או קוטע משחק, ואין חלונית "גרסה חדשה".

## 9. `index.html`
- `<link rel="icon" href="/Simon/favicon.ico" sizes="48x48">`, `<link rel="icon" href="/Simon/icon.svg" type="image/svg+xml">`, `<link rel="apple-touch-icon" href="/Simon/apple-touch-icon-180x180.png">`.
- `<meta name="theme-color">` כבר קיים. Vite מזריק את קישור ה-Manifest בעצמו (`vite-plugin-pwa`).

## 10. GitHub Pages
- לפני הפריסה: לוודא שה-Repository `NinaR1968/Simon` ציבורי (בדיקה ב-`https://github.com/NinaR1968/Simon` ללא התחברות, או דרך ה-API הציבורי). אם לא – לעצור ולהדריך את המשתמש לשנות (Settings → General → Danger Zone → Change visibility).
- Pages כבר מוגדר ל-Source: GitHub Actions (מ-Milestone 3); ה-Workflow לא משתנה.
- הפריסה עצמה מתבצעת רק כשהמשתמש מבקש "דחוף שינויים לגיטהאב". אחריה: לוודא שריצת Actions הצליחה ושהאתר החדש עולה עם `manifest.webmanifest` ו-`sw.js` (ללא 404).

## 11. בדיקות אוטומטיות
- **חדש – `src/pwa/manifest.test.ts`:** `name`/`short_name` = `Simon`; `id` = `/Simon/app`; `lang: 'he'`, `dir: 'rtl'`; `start_url` ו-`scope` = `/Simon/`; `display: 'standalone'`; קיימים אייקונים 192 ו-512 ואייקון `maskable`; כל קובץ אייקון שמופיע ב-Manifest קיים ב-`public/`.
- **Regression (קיימות, חייבות לעבור):** עשרת השלבים, כישלון ראשון (0 השלמות), קונפטי בניצחון בלבד, השהיה וחידוש, מגבלת עשר תוצאות, מחיקה מאושרת, כשל אחסון. אם חסרה בדיקה לאחד מהם – להוסיף.
- `npm run typecheck`, `npm run test`, `npm run build` עוברים.

## 12. בדיקה ידנית (Claude)
דרך `npm run build` + `npm run preview` (`http://localhost:4173/Simon/`; `localhost` מאפשר Service Worker):
1. האתר נטען (לא דף לבן), שני המסכים, משחק והיסטוריה עובדים.
2. `manifest.webmanifest`, `sw.js` והאייקונים נטענים בלי 404 תחת `/Simon/`.
3. ה-Service Worker פעיל (`navigator.serviceWorker.controller`), ו-`caches` מכיל את ה-JS, ה-CSS, ה-HTML, האייקונים וקובצי הגופן.
4. ב-`dist/sw.js` אין `skipWaiting` ואין `clientsClaim`.
5. Offline: עצירת שרת ה-preview ורענון הדף – האתר עדיין נפתח מה-Cache, אפשר לשחק, לנווט ולראות היסטוריה.
6. תצוגת Smartphone אנכית בעברית/RTL ללא גלילה אופקית.

**מה שאני לא יכול לבדוק בעצמי** (יסומן ככזה, לא כ"עבר"): התקנה בפועל בטלפון, צלילים בטלפון, Offline בטלפון אחרי התקנה, ועדכון גרסה על מכשיר אמיתי. אלה ייבדקו על ידי המשתמש באתר הפרוס ב-HTTPS, לפי הוראות צעד-אחר-צעד שאתן אחרי הדחיפה.

## 13. Definition of Done – מיפוי
| תנאי | איך נבדק |
|---|---|
| Workflow עובר ומפרסם אוטומטית אחרי Push | ריצת GitHub Actions אחרי הדחיפה (ה-Workflow הקיים) |
| האתר נטען ב-HTTPS תחת `/Simon/` ללא 404 | preview מקומי (§12.2) + האתר הפרוס אחרי הדחיפה |
| Manifest ו-Service Worker תקינים; אפשרות התקנה | בדיקת Manifest (§11) + §12.2–3; התקנה בפועל – המשתמש בטלפון |
| Offline אחרי Precache: פתיחה, משחק, צלילים, ניווט, היסטוריה | §12.5 מקומית; בטלפון – המשתמש |
| עדכון גרסה אינו מרענן משחק | ADR-6: אין `skipWaiting`/`clientsClaim`/`updateSW` (§12.4); על מכשיר – המשתמש |
| Regression + תצוגת Smartphone עברית/RTL | §11 + §12.6 |
