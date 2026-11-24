'use node';

import crypto from 'node:crypto';
import { actionGeneric, anyApi, FunctionReference } from 'convex/server';
import { v } from 'convex/values';

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface AccountDoc {
  _id: string;
  name: string;
  email: string;
  passwordHash: string;
  salt: string;
  createdAt: number;
  updatedAt: number;
  progress?: unknown;
}

const fnGetByEmail = anyApi.accountsDb.getAccountByEmail as unknown as FunctionReference<
  'query',
  'internal',
  { email: string },
  AccountDoc | null
>;
const fnCreateAccount = anyApi.accountsDb.createAccount as unknown as FunctionReference<
  'mutation',
  'internal',
  {
    name: string;
    email: string;
    passwordHash: string;
    salt: string;
    progress?: unknown;
  },
  {
    conflict: boolean;
    accountId: string | null;
    progress: unknown;
    createdAt: number;
  }
>;
const fnUpdateAccountName = anyApi.accountsDb.updateAccountName as unknown as FunctionReference<
  'mutation',
  'internal',
  { accountId: string; name: string },
  unknown
>;
const fnUpdateAccountProgress = anyApi.accountsDb.updateAccountProgress as unknown as FunctionReference<
  'mutation',
  'internal',
  { accountId: string; progress: unknown },
  { id: string; name: string; email: string; createdAt: number } | null
>;
const fnCreateSession = anyApi.accountsDb.createSession as unknown as FunctionReference<
  'mutation',
  'internal',
  { accountId: string; tokenHash: string; expiresAt: number },
  null
>;
const fnGetSessionWithAccount = anyApi.accountsDb.getSessionWithAccount as unknown as FunctionReference<
  'query',
  'internal',
  { tokenHash: string; now: number },
  { sessionId: string; account: AccountDoc } | null
>;
const fnRevokeSession = anyApi.accountsDb.revokeSession as unknown as FunctionReference<
  'mutation',
  'internal',
  { tokenHash: string },
  { ok: boolean }
>;

function sanitizeName(raw: string, fallback = ''): string {
  const cleaned = raw.replace(/[\u0000-\u001F\u007F<>]/g, '').trim();
  return cleaned ? cleaned.slice(0, 24) : fallback;
}

function isValidEmail(email: string): boolean {
  return email.length <= 120 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  const actualBuf = Buffer.from(hashPassword(password, salt), 'hex');
  const expectedBuf = Buffer.from(expectedHash, 'hex');
  if (actualBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(actualBuf, expectedBuf);
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export const register = actionGeneric({
  args: {
    name: v.string(),
    email: v.string(),
    password: v.string(),
    progress: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const cleanName = sanitizeName(args.name);
    const cleanEmail = args.email.trim().toLowerCase();

    if (cleanName.length < 2) {
      return { ok: false as const, error: 'Nama minimal 2 karakter.' };
    }
    if (!isValidEmail(cleanEmail)) {
      return { ok: false as const, error: 'Format alamat email tidak valid.' };
    }
    if (args.password.length < 6 || args.password.length > 128) {
      return { ok: false as const, error: 'Password minimal 6 karakter.' };
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashPassword(args.password, salt);

    const created = await ctx.runMutation(fnCreateAccount, {
      name: cleanName,
      email: cleanEmail,
      passwordHash,
      salt,
      progress: args.progress,
    });

    if (created.conflict || !created.accountId) {
      return {
        ok: false as const,
        error: 'Email ini sudah terdaftar. Silakan masuk dengan password Anda.',
      };
    }

    const token = crypto.randomBytes(32).toString('hex');
    await ctx.runMutation(fnCreateSession, {
      accountId: created.accountId,
      tokenHash: hashToken(token),
      expiresAt: Date.now() + SESSION_TTL_MS,
    });

    return {
      ok: true as const,
      token,
      user: {
        id: String(created.accountId),
        name: cleanName,
        email: cleanEmail,
        createdAt: created.createdAt,
      },
      progress: created.progress ?? null,
    };
  },
});

export const login = actionGeneric({
  args: {
    email: v.string(),
    password: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const cleanEmail = args.email.trim().toLowerCase();
    if (!isValidEmail(cleanEmail) || args.password.length < 1 || args.password.length > 128) {
      return { ok: false as const, error: 'Masukkan email dan password yang valid.' };
    }

    const account = await ctx.runQuery(fnGetByEmail, { email: cleanEmail });
    if (!account || !verifyPassword(args.password, account.salt, account.passwordHash)) {
      return { ok: false as const, error: 'Email atau password tidak sesuai.' };
    }

    let finalName = account.name;
    let finalProgress: unknown = account.progress ?? null;
    const optionalName = args.name ? sanitizeName(args.name) : '';
    if (optionalName.length >= 2 && optionalName !== account.name) {
      finalName = optionalName;
      finalProgress = await ctx.runMutation(fnUpdateAccountName, {
        accountId: account._id,
        name: optionalName,
      });
    }

    const token = crypto.randomBytes(32).toString('hex');
    await ctx.runMutation(fnCreateSession, {
      accountId: account._id,
      tokenHash: hashToken(token),
      expiresAt: Date.now() + SESSION_TTL_MS,
    });

    return {
      ok: true as const,
      token,
      user: {
        id: String(account._id),
        name: finalName,
        email: account.email,
        createdAt: account.createdAt,
      },
      progress: finalProgress,
    };
  },
});

export const getMe = actionGeneric({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    if (!args.token || args.token.length < 16) {
      return { ok: false as const, error: 'Sesi tidak valid.' };
    }
    const found = await ctx.runQuery(fnGetSessionWithAccount, {
      tokenHash: hashToken(args.token),
      now: Date.now(),
    });
    if (!found) {
      return { ok: false as const, error: 'Sesi tidak valid atau telah berakhir.' };
    }
    return {
      ok: true as const,
      user: {
        id: String(found.account._id),
        name: found.account.name,
        email: found.account.email,
        createdAt: found.account.createdAt,
      },
      progress: found.account.progress ?? null,
    };
  },
});

export const syncProgress = actionGeneric({
  args: {
    token: v.string(),
    progress: v.any(),
  },
  handler: async (ctx, args) => {
    if (!args.token || args.token.length < 16) {
      return { ok: false as const, error: 'Sesi tidak valid.' };
    }
    const found = await ctx.runQuery(fnGetSessionWithAccount, {
      tokenHash: hashToken(args.token),
      now: Date.now(),
    });
    if (!found) {
      return { ok: false as const, error: 'Sesi tidak valid atau telah berakhir.' };
    }

    const updatedUser = await ctx.runMutation(fnUpdateAccountProgress, {
      accountId: found.account._id,
      progress: args.progress,
    });
    if (!updatedUser) {
      return { ok: false as const, error: 'Data kemajuan tidak valid.' };
    }

    return {
      ok: true as const,
      user: updatedUser,
    };
  },
});

export const logout = actionGeneric({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    if (!args.token || args.token.length < 16) {
      return { ok: true as const };
    }
    await ctx.runMutation(fnRevokeSession, {
      tokenHash: hashToken(args.token),
    });
    return { ok: true as const };
  },
});
