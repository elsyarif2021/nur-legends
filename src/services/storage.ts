import {
  BattleRecord,
  DailyMission,
  GameMode,
  HeroId,
  PlayerProgress,
  PlayerSettings,
} from '../types/game';

const STORAGE_KEY = 'nur_legends_save_v1';

function getTodayString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
}

export function createDefaultMissions(): DailyMission[] {
  return [
    {
      id: 'm_play',
      title: 'Penjaga Amanah',
      description: 'Selesaikan 1 pertandingan di Mode 5v5 atau Latihan.',
      type: 'play_match',
      target: 1,
      progress: 0,
      rewardGold: 150,
      rewardXp: 120,
      claimed: false,
    },
    {
      id: 'm_win',
      title: 'Kemenangan Cahaya',
      description: 'Raih 1 kemenangan bersama tim Cahaya Biru.',
      type: 'win_match',
      target: 1,
      progress: 0,
      rewardGold: 250,
      rewardXp: 180,
      claimed: false,
    },
    {
      id: 'm_turret',
      title: 'Strategi Persaudaraan',
      description: 'Bantu tim menghancurkan 2 menara pertahanan lawan.',
      type: 'turret_destroy',
      target: 2,
      progress: 0,
      rewardGold: 200,
      rewardXp: 140,
      claimed: false,
    },
    {
      id: 'm_quiz',
      title: 'Pencari Ilmu',
      description: 'Jawab 3 pertanyaan dengan benar di Kuis Islami.',
      type: 'quiz_answer',
      target: 3,
      progress: 0,
      rewardGold: 180,
      rewardXp: 150,
      claimed: false,
    },
  ];
}

export function getXpForNextLevel(level: number): number {
  return 200 + (level - 1) * 120;
}

export function createDefaultProgress(): PlayerProgress {
  return {
    playerName: 'Penjaga Cahaya',
    level: 1,
    xp: 0,
    gold: 500,
    selectedHeroId: 'amin',
    dailyMissions: createDefaultMissions(),
    lastMissionDate: getTodayString(),
    battleHistory: [],
    quizAnsweredIds: [],
    quizCorrectCount: 0,
    settings: {
      volume: 0.65,
      muted: false,
      ambientEnabled: true,
      quality: 'high',
      showTutorialOnStart: true,
    },
    tutorialCompleted: false,
  };
}

export function loadPlayerProgress(): PlayerProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const def = createDefaultProgress();
      savePlayerProgress(def);
      return def;
    }
    const parsed = JSON.parse(raw) as Partial<PlayerProgress>;
    const def = createDefaultProgress();
    const today = getTodayString();

    const missions =
      parsed.lastMissionDate === today && Array.isArray(parsed.dailyMissions) && parsed.dailyMissions.length > 0
        ? parsed.dailyMissions
        : createDefaultMissions();

    return {
      ...def,
      ...parsed,
      settings: {
        ...def.settings,
        ...(parsed.settings || {}),
      },
      dailyMissions: missions,
      lastMissionDate: today,
      battleHistory: Array.isArray(parsed.battleHistory) ? parsed.battleHistory : [],
      quizAnsweredIds: Array.isArray(parsed.quizAnsweredIds) ? parsed.quizAnsweredIds : [],
    };
  } catch {
    return createDefaultProgress();
  }
}

export function savePlayerProgress(progress: PlayerProgress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function applyXpAndGold(
  progress: PlayerProgress,
  addGold: number,
  addXp: number
): PlayerProgress {
  let level = progress.level;
  let xp = progress.xp + addXp;
  while (xp >= getXpForNextLevel(level)) {
    xp -= getXpForNextLevel(level);
    level += 1;
  }
  return {
    ...progress,
    level,
    xp,
    gold: progress.gold + addGold,
  };
}

export function updateMissionsAfterMatch(
  progress: PlayerProgress,
  won: boolean,
  turretsDestroyed: number
): PlayerProgress {
  const updatedMissions = progress.dailyMissions.map((m) => {
    if (m.claimed) return m;
    if (m.type === 'play_match') {
      return { ...m, progress: Math.min(m.target, m.progress + 1) };
    }
    if (m.type === 'win_match' && won) {
      return { ...m, progress: Math.min(m.target, m.progress + 1) };
    }
    if (m.type === 'turret_destroy' && turretsDestroyed > 0) {
      return { ...m, progress: Math.min(m.target, m.progress + turretsDestroyed) };
    }
    return m;
  });
  return { ...progress, dailyMissions: updatedMissions };
}

export function recordBattleResult(
  progress: PlayerProgress,
  params: {
    heroId: HeroId;
    mode: GameMode;
    winner: 'blue' | 'red';
    durationSec: number;
    kills: number;
    deaths: number;
    assists: number;
    turretsDestroyed: number;
    goldEarned: number;
    xpEarned: number;
  }
): PlayerProgress {
  const won = params.winner === 'blue';
  const record: BattleRecord = {
    id: `match_${Date.now()}`,
    timestamp: Date.now(),
    heroId: params.heroId,
    mode: params.mode,
    result: won ? 'victory' : 'defeat',
    durationSec: params.durationSec,
    kills: params.kills,
    deaths: params.deaths,
    assists: params.assists,
    goldEarned: params.goldEarned,
    xpEarned: params.xpEarned,
  };

  let next = applyXpAndGold(progress, params.goldEarned, params.xpEarned);
  next = updateMissionsAfterMatch(next, won, params.turretsDestroyed);
  next = {
    ...next,
    battleHistory: [record, ...next.battleHistory].slice(0, 20),
  };
  savePlayerProgress(next);
  return next;
}

export function updateSettings(
  progress: PlayerProgress,
  patch: Partial<PlayerSettings>
): PlayerProgress {
  const next = {
    ...progress,
    settings: {
      ...progress.settings,
      ...patch,
    },
  };
  savePlayerProgress(next);
  return next;
}
