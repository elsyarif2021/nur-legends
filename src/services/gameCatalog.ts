import { useEffect, useState } from 'react';
import {
  SEED_HEROES,
  SEED_QUICK_CHATS,
  SEED_QUIZ_QUESTIONS,
  SEED_SHOP_ITEMS,
} from '../../convex/seedData';
import { convexApi } from '../config/convexApi';
import { getApiUrl } from '../config/endpoints';
import type {
  HeroDef,
  HeroId,
  LeaderboardEntry,
  QuickChatDef,
  QuickChatId,
  QuizQuestion,
  ShopItemDef,
} from '../types/game';
import { getConvexHttpClient, isConvexConfigured } from './convexClient';

export const HEROES: Record<HeroId, HeroDef> = {} as Record<HeroId, HeroDef>;
export const HERO_LIST: HeroDef[] = [...SEED_HEROES];
export const SHOP_ITEMS: ShopItemDef[] = [...SEED_SHOP_ITEMS];
export const QUIZ_QUESTIONS: QuizQuestion[] = [...SEED_QUIZ_QUESTIONS];
export const QUICK_CHATS: QuickChatDef[] = [...SEED_QUICK_CHATS];
export const QUICK_CHAT_MAP: Record<QuickChatId, QuickChatDef> = {} as Record<
  QuickChatId,
  QuickChatDef
>;

function syncMaps(): void {
  for (const h of HERO_LIST) {
    HEROES[h.id] = h;
  }
  for (const qc of QUICK_CHATS) {
    QUICK_CHAT_MAP[qc.id] = qc;
  }
}

syncMaps();

type CatalogListener = () => void;
const listeners = new Set<CatalogListener>();
let catalogVersion = 0;
let catalogSource: 'convex' | 'local' = 'local';
let hydrationStarted = false;

function notifyCatalogListeners(): void {
  catalogVersion += 1;
  for (const fn of listeners) {
    fn();
  }
}

function applyCatalogPayload(data: {
  heroes?: HeroDef[];
  shopItems?: ShopItemDef[];
  quizQuestions?: QuizQuestion[];
  quickChats?: QuickChatDef[];
}): void {
  if (Array.isArray(data.heroes) && data.heroes.length > 0) {
    HERO_LIST.splice(0, HERO_LIST.length, ...data.heroes);
  }
  if (Array.isArray(data.shopItems) && data.shopItems.length > 0) {
    SHOP_ITEMS.splice(0, SHOP_ITEMS.length, ...data.shopItems);
  }
  if (Array.isArray(data.quizQuestions) && data.quizQuestions.length > 0) {
    QUIZ_QUESTIONS.splice(0, QUIZ_QUESTIONS.length, ...data.quizQuestions);
  }
  if (Array.isArray(data.quickChats) && data.quickChats.length > 0) {
    QUICK_CHATS.splice(0, QUICK_CHATS.length, ...data.quickChats);
  }
  syncMaps();
  notifyCatalogListeners();
}

export async function hydrateCatalogFromConvex(): Promise<void> {
  if (hydrationStarted) return;
  hydrationStarted = true;

  const client = getConvexHttpClient();
  if (!client) return;

  try {
    let data = await client.query(convexApi.catalog.getCatalog, {});
    if (!data.seededInDb) {
      await client.mutation(convexApi.catalog.seedCatalog, {});
      data = await client.query(convexApi.catalog.getCatalog, {});
    }
    applyCatalogPayload(data);
    catalogSource = 'convex';
    notifyCatalogListeners();
  } catch {
    // Keep canonical catalog active if Convex deployment is unreachable
  }
}

export function getCatalogSource(): 'convex' | 'local' {
  return catalogSource;
}

export function useGameCatalog() {
  const [, setVersion] = useState(catalogVersion);

  useEffect(() => {
    const onChange = () => setVersion(catalogVersion);
    listeners.add(onChange);
    void hydrateCatalogFromConvex();
    return () => {
      listeners.delete(onChange);
    };
  }, []);

  return {
    heroes: HEROES,
    heroList: HERO_LIST,
    shopItems: SHOP_ITEMS,
    quizQuestions: QUIZ_QUESTIONS,
    quickChats: QUICK_CHATS,
    quickChatMap: QUICK_CHAT_MAP,
    source: catalogSource,
    convexConfigured: isConvexConfigured(),
  };
}

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  const client = getConvexHttpClient();
  if (client) {
    try {
      return await client.query(convexApi.catalog.getLeaderboard, {});
    } catch {
      // Fall back to server endpoint if Convex query fails
    }
  }
  try {
    const res = await fetch(getApiUrl('/api/leaderboard'));
    const ct = res.headers.get('content-type') || '';
    if (!res.ok || !ct.toLowerCase().includes('application/json')) return [];
    const data = (await res.json()) as { entries?: LeaderboardEntry[] };
    return Array.isArray(data.entries) ? data.entries : [];
  } catch {
    return [];
  }
}
