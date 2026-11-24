import { ConvexHttpClient } from 'convex/browser';
import { ConvexReactClient } from 'convex/react';

function readValidConvexUrl(): string | null {
  const raw =
    typeof import.meta !== 'undefined' && import.meta.env
      ? (import.meta.env.VITE_CONVEX_URL as string | undefined)
      : undefined;
  if (!raw || !raw.trim()) return null;
  try {
    const parsed = new URL(raw.trim());
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
    return parsed.toString().replace(/\/+$/, '');
  } catch {
    return null;
  }
}

let httpClientInstance: ConvexHttpClient | null = null;
let reactClientInstance: ConvexReactClient | null = null;

export function getConvexUrl(): string | null {
  return readValidConvexUrl();
}

export function isConvexConfigured(): boolean {
  return Boolean(readValidConvexUrl());
}

export function getConvexHttpClient(): ConvexHttpClient | null {
  const url = readValidConvexUrl();
  if (!url) return null;
  if (!httpClientInstance) {
    httpClientInstance = new ConvexHttpClient(url);
  }
  return httpClientInstance;
}

export function getConvexReactClient(): ConvexReactClient | null {
  const url = readValidConvexUrl();
  if (!url) return null;
  if (!reactClientInstance) {
    reactClientInstance = new ConvexReactClient(url);
  }
  return reactClientInstance;
}
