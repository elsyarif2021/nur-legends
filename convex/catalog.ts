import { mutationGeneric, queryGeneric } from 'convex/server';
import {
  SEED_HEROES,
  SEED_QUICK_CHATS,
  SEED_QUIZ_QUESTIONS,
  SEED_SHOP_ITEMS,
} from './seedData';

export const getCatalog = queryGeneric({
  args: {},
  handler: async (ctx) => {
    const heroDocs = await ctx.db.query('heroes').collect();
    const itemDocs = await ctx.db.query('shopItems').collect();
    const quizDocs = await ctx.db.query('quizQuestions').collect();
    const chatDocs = await ctx.db.query('quickChats').collect();

    const heroes =
      heroDocs.length > 0
        ? heroDocs
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((doc) => ({
              id: doc.heroId,
              name: doc.name,
              title: doc.title,
              role: doc.role,
              roleLabelId: doc.roleLabelId,
              moralValue: doc.moralValue,
              lore: doc.lore,
              primaryColor: doc.primaryColor,
              secondaryColor: doc.secondaryColor,
              accentHex: doc.accentHex,
              trimHex: doc.trimHex,
              stats: doc.stats,
              skills: doc.skills,
            }))
        : SEED_HEROES;

    const shopItems =
      itemDocs.length > 0
        ? itemDocs
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((doc) => ({
              id: doc.itemId,
              name: doc.name,
              category: doc.category,
              cost: doc.cost,
              description: doc.description,
              bonusAd: doc.bonusAd,
              bonusMagic: doc.bonusMagic,
              bonusHp: doc.bonusHp,
              bonusMana: doc.bonusMana,
              bonusDef: doc.bonusDef,
              bonusSpeed: doc.bonusSpeed,
              bonusAttackSpeedPct: doc.bonusAttackSpeedPct,
              bonusCdrPct: doc.bonusCdrPct,
            }))
        : SEED_SHOP_ITEMS;

    const quizQuestions =
      quizDocs.length > 0
        ? quizDocs
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((doc) => ({
              id: doc.questionId,
              category: doc.category,
              valueTag: doc.valueTag,
              question: doc.question,
              options: doc.options,
              correctIndex: doc.correctIndex,
              explanation: doc.explanation,
            }))
        : SEED_QUIZ_QUESTIONS;

    const quickChats =
      chatDocs.length > 0
        ? chatDocs
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((doc) => ({
              id: doc.chatId,
              label: doc.label,
              valueTag: doc.valueTag,
              icon: doc.icon,
              tone: doc.tone,
              hotkey: doc.hotkey,
            }))
        : SEED_QUICK_CHATS;

    return {
      heroes,
      shopItems,
      quizQuestions,
      quickChats,
      seededInDb:
        heroDocs.length > 0 &&
        itemDocs.length > 0 &&
        quizDocs.length > 0 &&
        chatDocs.length > 0,
    };
  },
});

export const seedCatalog = mutationGeneric({
  args: {},
  handler: async (ctx) => {
    let insertedHeroes = 0;
    let insertedItems = 0;
    let insertedQuizzes = 0;
    let insertedChats = 0;

    for (let i = 0; i < SEED_HEROES.length; i++) {
      const h = SEED_HEROES[i];
      const existing = await ctx.db
        .query('heroes')
        .withIndex('by_hero_id', (q) => q.eq('heroId', h.id))
        .unique();
      if (!existing) {
        await ctx.db.insert('heroes', {
          heroId: h.id,
          sortOrder: i,
          name: h.name,
          title: h.title,
          role: h.role,
          roleLabelId: h.roleLabelId,
          moralValue: h.moralValue,
          lore: h.lore,
          primaryColor: h.primaryColor,
          secondaryColor: h.secondaryColor,
          accentHex: h.accentHex,
          trimHex: h.trimHex,
          stats: h.stats,
          skills: h.skills,
        });
        insertedHeroes++;
      }
    }

    for (let i = 0; i < SEED_SHOP_ITEMS.length; i++) {
      const item = SEED_SHOP_ITEMS[i];
      const existing = await ctx.db
        .query('shopItems')
        .withIndex('by_item_id', (q) => q.eq('itemId', item.id))
        .unique();
      if (!existing) {
        await ctx.db.insert('shopItems', {
          itemId: item.id,
          sortOrder: i,
          name: item.name,
          category: item.category,
          cost: item.cost,
          description: item.description,
          bonusAd: item.bonusAd,
          bonusMagic: item.bonusMagic,
          bonusHp: item.bonusHp,
          bonusMana: item.bonusMana,
          bonusDef: item.bonusDef,
          bonusSpeed: item.bonusSpeed,
          bonusAttackSpeedPct: item.bonusAttackSpeedPct,
          bonusCdrPct: item.bonusCdrPct,
        });
        insertedItems++;
      }
    }

    for (let i = 0; i < SEED_QUIZ_QUESTIONS.length; i++) {
      const q = SEED_QUIZ_QUESTIONS[i];
      const existing = await ctx.db
        .query('quizQuestions')
        .withIndex('by_question_id', (idx) => idx.eq('questionId', q.id))
        .unique();
      if (!existing) {
        await ctx.db.insert('quizQuestions', {
          questionId: q.id,
          sortOrder: i,
          category: q.category,
          valueTag: q.valueTag,
          question: q.question,
          options: [...q.options],
          correctIndex: q.correctIndex,
          explanation: q.explanation,
        });
        insertedQuizzes++;
      }
    }

    for (let i = 0; i < SEED_QUICK_CHATS.length; i++) {
      const chat = SEED_QUICK_CHATS[i];
      const existing = await ctx.db
        .query('quickChats')
        .withIndex('by_chat_id', (idx) => idx.eq('chatId', chat.id))
        .unique();
      if (!existing) {
        await ctx.db.insert('quickChats', {
          chatId: chat.id,
          sortOrder: i,
          label: chat.label,
          valueTag: chat.valueTag,
          icon: chat.icon,
          tone: chat.tone,
          hotkey: chat.hotkey,
        });
        insertedChats++;
      }
    }

    return {
      ok: true,
      inserted: {
        heroes: insertedHeroes,
        shopItems: insertedItems,
        quizQuestions: insertedQuizzes,
        quickChats: insertedChats,
      },
    };
  },
});

export const getLeaderboard = queryGeneric({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query('leaderboardEntries').collect();
    return rows
      .sort((a, b) => {
        if (b.level !== a.level) return b.level - a.level;
        if (b.xp !== a.xp) return b.xp - a.xp;
        return b.wins - a.wins;
      })
      .slice(0, 25)
      .map((r) => ({
        playerName: r.playerName,
        heroId: r.heroId,
        level: r.level,
        xp: r.xp,
        wins: r.wins,
        matches: r.matches,
        updatedAt: r.updatedAt,
      }));
  },
});
