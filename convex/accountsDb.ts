import { internalMutationGeneric, internalQueryGeneric } from 'convex/server';
import { v } from 'convex/values';

const VALID_HERO_IDS = new Set([
  'amin',
  'faris',
  'hakim',
  'zahra',
  'zaid',
  'mumtaz',
  'aina',
]);

function sanitizeText(raw: unknown, fallback: string, maxLen: number): string {
  if (typeof raw !== 'string') return fallback;
  const cleaned = raw.replace(/[\u0000-\u001F\u007F<>]/g, '').trim();
  if (!cleaned) return fallback;
  return cleaned.slice(0, maxLen);
}

function sanitizeHeroId(raw: unknown): string {
  if (typeof raw === 'string' && VALID_HERO_IDS.has(raw)) {
    return raw;
  }
  return 'amin';
}

export function sanitizeProgressObject(
  raw: unknown,
  fallbackName: string
): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const src = raw as Record<string, unknown>;
  const settingsSrc =
    src.settings && typeof src.settings === 'object' && !Array.isArray(src.settings)
      ? (src.settings as Record<string, unknown>)
      : {};

  const gold = Number(src.gold ?? 500);
  return {
    playerName: sanitizeText(src.playerName, fallbackName, 24),
    level: Math.max(1, Math.min(999, Math.floor(Number(src.level) || 1))),
    xp: Math.max(0, Math.min(1000000, Math.floor(Number(src.xp) || 0))),
    gold: Math.max(0, Math.min(10000000, Math.floor(Number.isFinite(gold) ? gold : 500))),
    selectedHeroId: sanitizeHeroId(src.selectedHeroId),
    dailyMissions: Array.isArray(src.dailyMissions) ? src.dailyMissions.slice(0, 12) : [],
    lastMissionDate:
      typeof src.lastMissionDate === 'string' ? src.lastMissionDate.slice(0, 20) : '',
    battleHistory: Array.isArray(src.battleHistory) ? src.battleHistory.slice(0, 20) : [],
    quizAnsweredIds: Array.isArray(src.quizAnsweredIds)
      ? src.quizAnsweredIds.slice(0, 100)
      : [],
    quizCorrectCount: Math.max(
      0,
      Math.min(1000, Math.floor(Number(src.quizCorrectCount) || 0))
    ),
    settings: {
      volume: Math.max(0, Math.min(1, Number(settingsSrc.volume ?? 0.65))),
      muted: Boolean(settingsSrc.muted),
      ambientEnabled: settingsSrc.ambientEnabled !== false,
      quality:
        settingsSrc.quality === 'auto' ||
        settingsSrc.quality === 'low' ||
        settingsSrc.quality === 'medium' ||
        settingsSrc.quality === 'high'
          ? settingsSrc.quality
          : 'auto',
      showTutorialOnStart: settingsSrc.showTutorialOnStart !== false,
    },
    tutorialCompleted: Boolean(src.tutorialCompleted),
    ...(typeof src.lastLoginRewardDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(src.lastLoginRewardDate)
      ? { lastLoginRewardDate: src.lastLoginRewardDate }
      : {}),
  };
}

function extractLeaderboardStats(
  progress: Record<string, unknown> | null | undefined,
  fallbackName: string
) {
  const history = Array.isArray(progress?.battleHistory)
    ? (progress.battleHistory as Array<Record<string, unknown>>)
    : [];
  let wins = 0;
  for (const h of history) {
    if (h && h.result === 'victory') wins += 1;
  }
  return {
    playerName: sanitizeText(progress?.playerName, fallbackName, 24),
    heroId: sanitizeHeroId(progress?.selectedHeroId),
    level: Math.max(1, Math.floor(Number(progress?.level) || 1)),
    xp: Math.max(0, Math.floor(Number(progress?.xp) || 0)),
    wins,
    matches: history.length,
  };
}

export const getAccountByEmail = internalQueryGeneric({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('accounts')
      .withIndex('by_email', (q) => q.eq('email', args.email))
      .unique();
  },
});

export const getAccountById = internalQueryGeneric({
  args: { accountId: v.id('accounts') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.accountId);
  },
});

export const createAccount = internalMutationGeneric({
  args: {
    name: v.string(),
    email: v.string(),
    passwordHash: v.string(),
    salt: v.string(),
    progress: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('accounts')
      .withIndex('by_email', (q) => q.eq('email', args.email))
      .unique();
    if (existing) {
      return { conflict: true as const, accountId: null, progress: null, createdAt: 0 };
    }

    const now = Date.now();
    const sanitized = sanitizeProgressObject(args.progress, args.name);
    const finalProgress = sanitized ? { ...sanitized, playerName: args.name } : null;

    const accountId = await ctx.db.insert('accounts', {
      name: args.name,
      email: args.email,
      passwordHash: args.passwordHash,
      salt: args.salt,
      createdAt: now,
      updatedAt: now,
      progress: finalProgress,
    });

    const lb = extractLeaderboardStats(finalProgress, args.name);
    await ctx.db.insert('leaderboardEntries', {
      accountId,
      ...lb,
      updatedAt: now,
    });

    return {
      conflict: false as const,
      accountId,
      progress: finalProgress,
      createdAt: now,
    };
  },
});

export const updateAccountName = internalMutationGeneric({
  args: {
    accountId: v.id('accounts'),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const account = await ctx.db.get(args.accountId);
    if (!account) return null;
    const now = Date.now();
    const updatedProgress =
      account.progress && typeof account.progress === 'object'
        ? { ...(account.progress as Record<string, unknown>), playerName: args.name }
        : account.progress;

    await ctx.db.patch(args.accountId, {
      name: args.name,
      updatedAt: now,
      progress: updatedProgress,
    });

    const lbEntry = await ctx.db
      .query('leaderboardEntries')
      .withIndex('by_account_id', (q) => q.eq('accountId', args.accountId))
      .unique();
    if (lbEntry) {
      await ctx.db.patch(lbEntry._id, {
        playerName: args.name,
        updatedAt: now,
      });
    }

    return updatedProgress ?? null;
  },
});

export const updateAccountProgress = internalMutationGeneric({
  args: {
    accountId: v.id('accounts'),
    progress: v.any(),
  },
  handler: async (ctx, args) => {
    const account = await ctx.db.get(args.accountId);
    if (!account) return null;

    const sanitized = sanitizeProgressObject(args.progress, account.name);
    if (!sanitized) return null;

    const nextName =
      typeof sanitized.playerName === 'string' && sanitized.playerName.length >= 2
        ? sanitized.playerName
        : account.name;
    const now = Date.now();

    await ctx.db.patch(args.accountId, {
      name: nextName,
      updatedAt: now,
      progress: sanitized,
    });

    const lb = extractLeaderboardStats(sanitized, nextName);
    const existingLb = await ctx.db
      .query('leaderboardEntries')
      .withIndex('by_account_id', (q) => q.eq('accountId', args.accountId))
      .unique();
    if (existingLb) {
      await ctx.db.patch(existingLb._id, {
        ...lb,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert('leaderboardEntries', {
        accountId: args.accountId,
        ...lb,
        updatedAt: now,
      });
    }

    return {
      id: String(account._id),
      name: nextName,
      email: account.email,
      createdAt: account.createdAt,
    };
  },
});

export const createSession = internalMutationGeneric({
  args: {
    accountId: v.id('accounts'),
    tokenHash: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('sessions', {
      accountId: args.accountId,
      tokenHash: args.tokenHash,
      expiresAt: args.expiresAt,
      revoked: false,
    });
  },
});

export const getSessionWithAccount = internalQueryGeneric({
  args: {
    tokenHash: v.string(),
    now: v.number(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query('sessions')
      .withIndex('by_token_hash', (q) => q.eq('tokenHash', args.tokenHash))
      .unique();
    if (!session || session.revoked || session.expiresAt <= args.now) {
      return null;
    }
    const account = await ctx.db.get(session.accountId);
    if (!account) return null;
    return {
      sessionId: session._id,
      account,
    };
  },
});

export const revokeSession = internalMutationGeneric({
  args: { tokenHash: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query('sessions')
      .withIndex('by_token_hash', (q) => q.eq('tokenHash', args.tokenHash))
      .unique();
    if (session && !session.revoked) {
      await ctx.db.patch(session._id, { revoked: true });
    }
    return { ok: true };
  },
});
