function sanitizeHttpBase(raw: string | undefined): string {
  if (!raw) return '';
  try {
    const parsed = new URL(raw.trim());
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return '';
    return parsed.origin;
  } catch {
    return '';
  }
}

function sanitizeWsUrl(raw: string | undefined): string {
  if (!raw) return '';
  try {
    const parsed = new URL(raw.trim());
    if (parsed.protocol !== 'wss:' && parsed.protocol !== 'ws:') return '';
    const cleanPath = parsed.pathname && parsed.pathname !== '/' ? parsed.pathname : '/ws';
    return `${parsed.origin}${cleanPath}`;
  } catch {
    return '';
  }
}

const viteEnv =
  typeof import.meta !== 'undefined' && import.meta.env
    ? (import.meta.env as Record<string, unknown>)
    : undefined;
const API_BASE = sanitizeHttpBase(viteEnv?.VITE_API_URL as string | undefined);
const WS_OVERRIDE = sanitizeWsUrl(viteEnv?.VITE_WS_URL as string | undefined);

export function getApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return API_BASE ? `${API_BASE}${normalizedPath}` : normalizedPath;
}

export function getWebSocketUrl(): string {
  if (WS_OVERRIDE) return WS_OVERRIDE;
  if (API_BASE) {
    const wsBase = API_BASE.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:');
    return `${wsBase}/ws`;
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
}

export function hasExternalBackendConfigured(): boolean {
  return Boolean(API_BASE || WS_OVERRIDE);
}
