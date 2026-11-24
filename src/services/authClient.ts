import { convexApi } from '../config/convexApi';
import { getApiUrl } from '../config/endpoints';
import { AuthUser, PlayerProgress } from '../types/game';
import { getConvexHttpClient } from './convexClient';

export interface AuthSessionResult {
  user: AuthUser;
  progress: PlayerProgress | null;
}

async function parseJsonSafe<T>(res: Response): Promise<T | null> {
  const ct = res.headers.get('content-type') || '';
  if (!ct.toLowerCase().includes('application/json')) return null;
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

class AuthClient {
  // Held strictly in JS memory (never written to localStorage/sessionStorage)
  private token: string | null = null;
  private currentUser: AuthUser | null = null;

  public getUser(): AuthUser | null {
    return this.currentUser;
  }

  public isAuthenticated(): boolean {
    return Boolean(this.token && this.currentUser);
  }

  public async register(params: {
    name: string;
    email: string;
    password: string;
    progress?: PlayerProgress;
  }): Promise<AuthSessionResult> {
    const convex = getConvexHttpClient();
    if (convex) {
      const result = await convex.action(convexApi.authActions.register, {
        name: params.name,
        email: params.email,
        password: params.password,
        progress: params.progress,
      });
      if (!result.ok) {
        throw new Error(result.error || 'Gagal membuat akun di Convex.');
      }
      this.token = result.token;
      this.currentUser = result.user;
      return { user: result.user, progress: result.progress ?? null };
    }

    const res = await fetch(getApiUrl('/api/auth/register'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await parseJsonSafe<{
      token?: string;
      user?: AuthUser;
      progress?: PlayerProgress | null;
      error?: string;
    }>(res);
    if (!data) {
      throw new Error(
        'Database akun belum terhubung. Atur VITE_CONVEX_URL atau VITE_API_URL, atau lanjutkan sebagai Tamu.'
      );
    }
    if (!res.ok || !data.token || !data.user) {
      throw new Error(data.error || 'Gagal membuat akun.');
    }
    this.token = data.token;
    this.currentUser = data.user;
    return { user: data.user, progress: data.progress ?? null };
  }

  public async login(params: {
    name?: string;
    email: string;
    password: string;
  }): Promise<AuthSessionResult> {
    const convex = getConvexHttpClient();
    if (convex) {
      const result = await convex.action(convexApi.authActions.login, {
        email: params.email,
        password: params.password,
        name: params.name,
      });
      if (!result.ok) {
        throw new Error(result.error || 'Email atau password tidak sesuai.');
      }
      this.token = result.token;
      this.currentUser = result.user;
      return { user: result.user, progress: result.progress ?? null };
    }

    const res = await fetch(getApiUrl('/api/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await parseJsonSafe<{
      token?: string;
      user?: AuthUser;
      progress?: PlayerProgress | null;
      error?: string;
    }>(res);
    if (!data) {
      throw new Error(
        'Database akun belum terhubung. Atur VITE_CONVEX_URL atau VITE_API_URL, atau lanjutkan sebagai Tamu.'
      );
    }
    if (!res.ok || !data.token || !data.user) {
      throw new Error(data.error || 'Email atau password salah.');
    }
    this.token = data.token;
    this.currentUser = data.user;
    return { user: data.user, progress: data.progress ?? null };
  }

  public async syncProgress(progress: PlayerProgress): Promise<void> {
    if (!this.token) return;
    const convex = getConvexHttpClient();
    if (convex) {
      try {
        const result = await convex.action(convexApi.authActions.syncProgress, {
          token: this.token,
          progress,
        });
        if (result.ok) {
          this.currentUser = result.user;
        }
      } catch {
        // Ignore transient network errors when syncing background progress
      }
      return;
    }

    try {
      const res = await fetch(getApiUrl('/api/auth/progress'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({ progress }),
      });
      if (res.ok) {
        const data = await parseJsonSafe<{ user?: AuthUser }>(res);
        if (data?.user) this.currentUser = data.user;
      }
    } catch {
      // Ignore transient network errors when syncing background progress
    }
  }

  public async logout(): Promise<void> {
    const tok = this.token;
    this.token = null;
    this.currentUser = null;
    if (!tok) return;

    const convex = getConvexHttpClient();
    if (convex) {
      try {
        await convex.action(convexApi.authActions.logout, { token: tok });
      } catch {
        // Ignore network errors on logout
      }
      return;
    }

    try {
      await fetch(getApiUrl('/api/auth/logout'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${tok}` },
      });
    } catch {
      // Ignore network errors on logout
    }
  }
}

export const authClient = new AuthClient();
