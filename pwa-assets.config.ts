import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// Generates the PWA icons and favicon from public/icon.svg (ADR-7).
// The SVG already contains the safe-zone margin and background, so no extra padding.
export default defineConfig({
  preset: {
    ...minimal2023Preset,
    transparent: { ...minimal2023Preset.transparent, padding: 0 },
    maskable: { ...minimal2023Preset.maskable, padding: 0, resizeOptions: { background: '#0A1628' } },
    apple: { ...minimal2023Preset.apple, padding: 0, resizeOptions: { background: '#0A1628' } },
  },
  images: ['public/icon.svg'],
});
