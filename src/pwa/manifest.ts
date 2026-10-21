// Single source for the deploy path (ADR-8) and the web app manifest (ARCHITECTURE §2.7, ADR-9).
export const BASE = '/Simon/';

export const manifest = {
  // Stable app identity; must never change, or existing installs become a different app (ADR-9)
  id: '/Simon/app',
  name: 'Simon',
  short_name: 'Simon',
  description: 'משחק הזיכרון סיימון – חזרו על רצף הצבעים והצלילים.',
  lang: 'he',
  dir: 'rtl' as const,
  start_url: BASE,
  scope: BASE,
  display: 'standalone' as const,
  orientation: 'portrait' as const,
  background_color: '#0A1628',
  theme_color: '#0A1628',
  icons: [
    { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
    { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
    { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
    { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
};
