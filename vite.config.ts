/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { BASE, manifest } from './src/pwa/manifest.ts';

// The site is served from https://<user>.github.io/Simon/ (ADR-8)
export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    // Installable PWA with a precached app shell (ARCHITECTURE §2.7).
    // No skipWaiting/clientsClaim: a new version waits until all app windows close (ADR-6).
    VitePWA({
      strategies: 'generateSW',
      registerType: 'prompt',
      injectRegister: false,
      manifest,
      // Icons are already precached by globPatterns
      includeManifestIcons: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: false },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
});
