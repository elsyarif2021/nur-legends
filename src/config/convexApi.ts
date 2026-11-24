import { makeFunctionReference } from 'convex/server';
import type {
  AuthUser,
  HeroDef,
  LeaderboardEntry,
  PlayerProgress,
  QuickChatDef,
  QuizQuestion,
  ShopItemDef,
} from '../types/game';

export interface CatalogResponse {
  heroes: HeroDef[];
  shopItems: ShopItemDef[];
  quizQuestions: QuizQuestion[];
  quickChats: QuickChatDef[];
  seededInDb: boolean;
}

export type AuthActionResult =
  | {
      ok: true;
      token: string;
      user: AuthUser;
      progress: PlayerProgress | null;
    }
  | {
      ok: false;
      error: string;
    };

export type SyncProgressActionResult =
  | {
      ok: true;
      user: AuthUser;
    }
  | {
      ok: false;
      error: string;
    };

export const convexApi = {
  catalog: {
    getCatalog: makeFunctionReference<'query', Record<string, never>, CatalogResponse>(
      'catalog:getCatalog'
    ),
    seedCatalog: makeFunctionReference<
      'mutation',
      Record<string, never>,
      { ok: boolean }
    >('catalog:seedCatalog'),
    getLeaderboard: makeFunctionReference<
      'query',
      Record<string, never>,
      LeaderboardEntry[]
    >('catalog:getLeaderboard'),
  },
  authActions: {
    register: makeFunctionReference<
      'action',
      { name: string; email: string; password: string; progress?: PlayerProgress },
      AuthActionResult
    >('authActions:register'),
    login: makeFunctionReference<
      'action',
      { email: string; password: string; name?: string },
      AuthActionResult
    >('authActions:login'),
    getMe: makeFunctionReference<
      'action',
      { token: string },
      { ok: true; user: AuthUser; progress: PlayerProgress | null } | { ok: false; error: string }
    >('authActions:getMe'),
    syncProgress: makeFunctionReference<
      'action',
      { token: string; progress: PlayerProgress },
      SyncProgressActionResult
    >('authActions:syncProgress'),
    logout: makeFunctionReference<'action', { token: string }, { ok: boolean }>(
      'authActions:logout'
    ),
  },
};
