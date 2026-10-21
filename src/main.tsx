import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/heebo/400.css';
import '@fontsource/heebo/600.css';
import '@fontsource/heebo/700.css';
import './styles/tokens.css';
import './styles/global.css';
import './styles/board.css';
import { registerSW } from 'virtual:pwa-register';
import App from './App';

// Register the service worker without update prompts or forced reloads:
// a new version activates only after all app windows are closed (ADR-6).
registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
