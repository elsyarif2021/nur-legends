import assert from 'node:assert/strict';
import { HEROES, HERO_LIST } from '../data/heroes';
import { SHOP_ITEMS } from '../data/items';
import { QUICK_CHATS, QUICK_CHAT_MAP } from '../data/quickChat';
import { QUIZ_QUESTIONS } from '../data/quiz';
import {
  ARENA_OBSTACLES,
  INITIAL_STRUCTURES,
  LANE_WAYPOINTS_BLUE,
  LANE_WAYPOINTS_RED,
  NEUTRAL_GUARDIANS,
  WORLD_SIZE,
} from '../game/ArenaConfig';
import { LocalBotTransport } from '../network/MatchTransport';
import {
  applyXpAndGold,
  createDefaultProgress,
  getXpForNextLevel,
  updateMissionsAfterMatch,
} from '../services/storage';

async function runTests() {
  // 1. Heroes integrity check
  assert.equal(HERO_LIST.length, 5, 'Should have exactly 5 playable heroes');
  for (const h of HERO_LIST) {
    assert.equal(h.skills.length, 4, `${h.name} should have 4 skills`);
    assert.ok(h.stats.maxHp > 0 && h.stats.maxMana > 0, `${h.name} stats valid`);
    assert.ok(HEROES[h.id].id === h.id, `HEROES map lookup matches ${h.id}`);
  }

  // 2. Arena & lane geometry check
  assert.equal(WORLD_SIZE, 2800);
  assert.equal(INITIAL_STRUCTURES.length, 14, '6 blue turrets + 6 red turrets + 2 cores');
  assert.equal(NEUTRAL_GUARDIANS.length, 2);
  assert.ok(ARENA_OBSTACLES.length >= 10);
  for (const lane of ['top', 'mid', 'bot'] as const) {
    assert.ok(LANE_WAYPOINTS_BLUE[lane].length >= 5);
    assert.ok(LANE_WAYPOINTS_RED[lane].length >= 5);
  }

  // 3. Shop items & Quick chat check
  assert.equal(SHOP_ITEMS.length, 8);
  assert.equal(QUICK_CHATS.length, 6);
  for (const qc of QUICK_CHATS) {
    assert.equal(QUICK_CHAT_MAP[qc.id].label, qc.label);
  }

  // 4. Quiz integrity check
  assert.ok(QUIZ_QUESTIONS.length >= 12);
  for (const q of QUIZ_QUESTIONS) {
    assert.equal(q.options.length, 4);
    assert.ok(q.correctIndex >= 0 && q.correctIndex < 4);
    assert.ok(q.explanation.length > 10);
  }

  // 5. Progression & Daily Missions math check
  let progress = createDefaultProgress();
  const neededLv1 = getXpForNextLevel(1);
  progress = applyXpAndGold(progress, 150, neededLv1 + 50);
  assert.equal(progress.level, 2, 'Should level up to Lv.2');
  assert.equal(progress.xp, 50, 'Leftover XP carried over');
  assert.equal(progress.gold, 650);

  progress = updateMissionsAfterMatch(progress, true, 2);
  const playM = progress.dailyMissions.find((m) => m.type === 'play_match')!;
  const winM = progress.dailyMissions.find((m) => m.type === 'win_match')!;
  const turretM = progress.dailyMissions.find((m) => m.type === 'turret_destroy')!;
  assert.equal(playM.progress, 1);
  assert.equal(winM.progress, 1);
  assert.equal(turretM.progress, 2);

  // 6. MatchTransport deterministic command queue check
  const transport = new LocalBotTransport();
  await transport.connect({
    mode: '5v5',
    localPlayerId: 'blue_0',
    heroId: 'amin',
    tickRateHz: 60,
  });
  transport.enqueueBridgeInput('blue_0', {
    moveX: 0.7,
    moveY: -0.7,
    triggerQueue: ['basic', 's1'],
    buyItemQueue: ['sepatu_pengembara'],
    quickChatQueue: ['terima_kasih'],
    paused: false,
  });
  const drained = transport.drainRemoteCommands();
  assert.equal(drained.length, 5);
  assert.equal(drained[0].type, 'MOVE');
  assert.equal(drained[1].type, 'ACTION');
  assert.equal(drained[3].type, 'BUY_ITEM');
  assert.equal(drained[4].type, 'QUICK_CHAT');
  assert.equal(transport.drainRemoteCommands().length, 0);
  transport.disconnect();

  console.log('ALL NUR LEGENDS SYSTEM TESTS PASSED');
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
