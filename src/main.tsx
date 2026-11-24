import { ConvexProvider } from 'convex/react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { getConvexReactClient } from './services/convexClient';

const convex = getConvexReactClient();
const rootEl = document.getElementById('root')!;

createRoot(rootEl).render(
  convex ? (
    <ConvexProvider client={convex}>
      <App />
    </ConvexProvider>
  ) : (
    <App />
  )
);
