export type HeroId = 'amin' | 'faris' | 'hakim' | 'zahra' | 'zaid';

export type HeroRole = 'Tank' | 'Marksman' | 'Mage' | 'Support' | 'Fighter';

export type GameMode = '5v5' | 'training';

export type GraphicsQuality = 'low' | 'medium' | 'high';

export type ScreenView = 'LOBBY' | 'BATTLE';

export interface SkillDef {
  id: string;
  keyLabel: string;
  name: string;
  description: string;
  cooldown: number;
  manaCost: number;
  range: number;
  iconType: 'shield' | 'barrier' | 'charge' | 'fortress' | 'arrow' | 'rapid' | 'wind' | 'rain' | 'orb' | 'circle' | 'crystal' | 'storm' | 'heal' | 'teamshield' | 'speed' | 'garden' | 'slash' | 'dash' | 'spin' | 'cyclone';
}

export interface HeroStats {
  maxHp: number;
  hpPerLevel: number;
  maxMana: number;
  manaPerLevel: number;
  attackDamage: number;
  adPerLevel: number;
  magicPower: number;
  defense: number;
  defPerLevel: number;
  moveSpeed: number;
  attackRange: number;
  attackInterval: number; // seconds between basic attacks
  isRanged: boolean;
}

export interface HeroDef {
  id: HeroId;
  name: string;
  title: string;
  role: HeroRole;
  roleLabelId: string;
  moralValue: string;
  lore: string;
  primaryColor: string;
  secondaryColor: string;
  accentHex: number;
  trimHex: number;
  stats: HeroStats;
  skills: [SkillDef, SkillDef, SkillDef, SkillDef]; // S1, S2, S3, Ultimate
}

export interface ShopItemDef {
  id: string;
  name: string;
  category: 'Serangan' | 'Sihir' | 'Pertahanan' | 'Mobilitas';
  cost: number;
  description: string;
  bonusAd?: number;
  bonusMagic?: number;
  bonusHp?: number;
  bonusMana?: number;
  bonusDef?: number;
  bonusSpeed?: number;
  bonusAttackSpeedPct?: number; // e.g. 0.15 = 15% faster
  bonusCdrPct?: number; // e.g. 0.1 = 10% cdr
}

export interface QuizQuestion {
  id: string;
  category: 'Akhlak Mulia' | 'Pengetahuan Islam' | 'Adab Sehari-hari';
  valueTag: string;
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
}

export interface DailyMission {
  id: string;
  title: string;
  description: string;
  type: 'play_match' | 'win_match' | 'quiz_answer' | 'turret_destroy' | 'help_ally';
  target: number;
  progress: number;
  rewardGold: number;
  rewardXp: number;
  claimed: boolean;
}

export interface BattleRecord {
  id: string;
  timestamp: number;
  heroId: HeroId;
  mode: GameMode;
  result: 'victory' | 'defeat';
  durationSec: number;
  kills: number;
  deaths: number;
  assists: number;
  goldEarned: number;
  xpEarned: number;
}

export interface PlayerSettings {
  volume: number;
  muted: boolean;
  ambientEnabled: boolean;
  quality: GraphicsQuality;
  showTutorialOnStart: boolean;
}

export interface PlayerProgress {
  playerName: string;
  level: number;
  xp: number;
  gold: number;
  selectedHeroId: HeroId;
  dailyMissions: DailyMission[];
  lastMissionDate: string;
  battleHistory: BattleRecord[];
  quizAnsweredIds: string[];
  quizCorrectCount: number;
  settings: PlayerSettings;
  tutorialCompleted: boolean;
}

export interface MinimapEntity {
  x: number; // normalized 0..1
  y: number; // normalized 0..1
  team: 'blue' | 'red' | 'neutral';
  kind: 'hero' | 'player' | 'turret' | 'core' | 'guardian';
}

export interface ScoreboardRow {
  id: string;
  name: string;
  heroId: HeroId;
  team: 'blue' | 'red';
  isHuman: boolean;
  level: number;
  kills: number;
  deaths: number;
  assists: number;
  gold: number;
  items: string[];
}

export interface CombatNotice {
  id: number;
  text: string;
  tone: 'gold' | 'blue' | 'red' | 'emerald';
}

export interface MatchResultSummary {
  winner: 'blue' | 'red';
  durationSec: number;
  blueKills: number;
  redKills: number;
  playerKills: number;
  playerDeaths: number;
  playerAssists: number;
  turretsDestroyedByPlayerTeam: number;
  mvpHeroId: HeroId;
  goldReward: number;
  xpReward: number;
}

export type QuickChatId =
  | 'terima_kasih'
  | 'sabar'
  | 'bagus'
  | 'bersatu'
  | 'bantu'
  | 'semangat';

export type QuickChatIcon = 'heart' | 'calm' | 'star' | 'handshake' | 'shield' | 'flame';

export interface QuickChatDef {
  id: QuickChatId;
  label: string;
  valueTag: string;
  icon: QuickChatIcon;
  tone: 'gold' | 'blue' | 'emerald';
  hotkey: string;
}

export interface QuickChatFeedItem {
  id: number;
  senderName: string;
  heroId: HeroId;
  team: 'blue' | 'red';
  chatId: QuickChatId;
  label: string;
  valueTag: string;
  tone: 'gold' | 'blue' | 'emerald';
}

export interface HudSnapshot {
  heroId: HeroId;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  shield: number;
  level: number;
  xp: number;
  maxXp: number;
  gold: number;
  kills: number;
  deaths: number;
  assists: number;
  items: string[];
  isDead: boolean;
  respawnTimer: number;
  recallProgress: number; // 0 to 1
  skillCooldowns: [number, number, number, number];
  skillMaxCooldowns: [number, number, number, number];
  recoveryCooldown: number;
  recoveryMaxCooldown: number;
  matchTimeSec: number;
  blueKills: number;
  redKills: number;
  blueTurretsLeft: number;
  redTurretsLeft: number;
  minimap: MinimapEntity[];
  cameraViewRect: { x: number; y: number; w: number; h: number };
  scoreboard: ScoreboardRow[];
  notices: CombatNotice[];
  chatFeed: QuickChatFeedItem[];
  matchResult: MatchResultSummary | null;
  targetInfo: {
    name: string;
    hp: number;
    maxHp: number;
    team: 'blue' | 'red' | 'neutral';
  } | null;
}

export interface BattleInputBridge {
  moveX: number;
  moveY: number;
  triggerQueue: Array<'basic' | 's1' | 's2' | 's3' | 'ult' | 'recall' | 'recovery'>;
  buyItemQueue: string[];
  quickChatQueue: QuickChatId[];
  paused: boolean;
}
