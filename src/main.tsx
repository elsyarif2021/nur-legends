import { ConvexProvider } from 'convex/react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { OpeningIntro } from './components/OpeningIntro';
import './index.css';
import { getConvexReactClient } from './services/convexClient';

const convex = getConvexReactClient();
const rootEl = document.getElementById('root')!;

createRoot(rootEl).render(
  <>
    {convex ? (
      <ConvexProvider client={convex}>
        <App />
      </ConvexProvider>
    ) : (
      <App />
    )}
    <OpeningIntro />
  </>
);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => console.warn('PWA registration failed', err));
  }, { once: true });
}
