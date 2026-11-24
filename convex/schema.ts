import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

const skillValidator = v.object({
  id: v.string(),
  keyLabel: v.string(),
  name: v.string(),
  description: v.string(),
  cooldown: v.number(),
  manaCost: v.number(),
  range: v.number(),
  iconType: v.string(),
});

const heroStatsValidator = v.object({
  maxHp: v.number(),
  hpPerLevel: v.number(),
  maxMana: v.number(),
  manaPerLevel: v.number(),
  attackDamage: v.number(),
  adPerLevel: v.number(),
  magicPower: v.number(),
  defense: v.number(),
  defPerLevel: v.number(),
  moveSpeed: v.number(),
  attackRange: v.number(),
  attackInterval: v.number(),
  isRanged: v.boolean(),
});

export default defineSchema({
  heroes: defineTable({
    heroId: v.string(),
    sortOrder: v.number(),
    name: v.string(),
    title: v.string(),
    role: v.string(),
    roleLabelId: v.string(),
    moralValue: v.string(),
    lore: v.string(),
    primaryColor: v.string(),
    secondaryColor: v.string(),
    accentHex: v.number(),
    trimHex: v.number(),
    stats: heroStatsValidator,
    skills: v.array(skillValidator),
  }).index('by_hero_id', ['heroId']),

  shopItems: defineTable({
    itemId: v.string(),
    sortOrder: v.number(),
    name: v.string(),
    category: v.string(),
    cost: v.number(),
    description: v.string(),
    bonusAd: v.optional(v.number()),
    bonusMagic: v.optional(v.number()),
    bonusHp: v.optional(v.number()),
    bonusMana: v.optional(v.number()),
    bonusDef: v.optional(v.number()),
    bonusSpeed: v.optional(v.number()),
    bonusAttackSpeedPct: v.optional(v.number()),
    bonusCdrPct: v.optional(v.number()),
  }).index('by_item_id', ['itemId']),

  quizQuestions: defineTable({
    questionId: v.string(),
    sortOrder: v.number(),
    category: v.string(),
    valueTag: v.string(),
    question: v.string(),
    options: v.array(v.string()),
    correctIndex: v.number(),
    explanation: v.string(),
  }).index('by_question_id', ['questionId']),

  quickChats: defineTable({
    chatId: v.string(),
    sortOrder: v.number(),
    label: v.string(),
    valueTag: v.string(),
    icon: v.string(),
    tone: v.string(),
    hotkey: v.string(),
  }).index('by_chat_id', ['chatId']),

  accounts: defineTable({
    name: v.string(),
    email: v.string(),
    passwordHash: v.string(),
    salt: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    progress: v.optional(v.any()),
  }).index('by_email', ['email']),

  sessions: defineTable({
    accountId: v.id('accounts'),
    tokenHash: v.string(),
    expiresAt: v.number(),
    revoked: v.boolean(),
  })
    .index('by_token_hash', ['tokenHash'])
    .index('by_account_id', ['accountId']),

  leaderboardEntries: defineTable({
    accountId: v.id('accounts'),
    playerName: v.string(),
    heroId: v.string(),
    level: v.number(),
    xp: v.number(),
    wins: v.number(),
    matches: v.number(),
    updatedAt: v.number(),
  }).index('by_account_id', ['accountId']),
});
