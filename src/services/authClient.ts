import { AuthUser, PlayerProgress } from '../types/game';

export interface AuthSessionResult {
  user: AuthUser;
  progress: PlayerProgress | null;
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
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = (await res.json()) as {
      token?: string;
      user?: AuthUser;
      progress?: PlayerProgress | null;
      error?: string;
    };
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
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = (await res.json()) as {
      token?: string;
      user?: AuthUser;
      progress?: PlayerProgress | null;
      error?: string;
    };
    if (!res.ok || !data.token || !data.user) {
      throw new Error(data.error || 'Email atau password salah.');
    }
    this.token = data.token;
    this.currentUser = data.user;
    return { user: data.user, progress: data.progress ?? null };
  }

  public async syncProgress(progress: PlayerProgress): Promise<void> {
    if (!this.token) return;
    try {
      const res = await fetch('/api/auth/progress', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({ progress }),
      });
      if (res.ok) {
        const data = (await res.json()) as { user?: AuthUser };
        if (data.user) this.currentUser = data.user;
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
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tok}` },
      });
    } catch {
      // Ignore network errors on logout
    }
  }
}

export const authClient = new AuthClient();
