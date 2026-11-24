export const WORLD_SIZE = 2800;

export type LaneId = 'top' | 'mid' | 'bot';

export interface Vec2 {
  x: number;
  y: number;
}

export interface ObstacleDef {
  x: number;
  y: number;
  r: number;
  kind: 'garden' | 'pillar' | 'palace_wall';
}

export interface StructureDef {
  id: string;
  name: string;
  team: 'blue' | 'red';
  lane: LaneId | 'base';
  kind: 'turret' | 'core';
  x: number;
  y: number;
  maxHp: number;
  attackDamage: number;
  attackRange: number;
}

export interface GuardianDef {
  id: string;
  name: string;
  x: number;
  y: number;
  color: number;
  maxHp: number;
  attackDamage: number;
  goldReward: number;
}

export const BLUE_BASE: Vec2 = { x: 260, y: 2540 };
export const RED_BASE: Vec2 = { x: 2540, y: 260 };

export const BLUE_FOUNTAIN: Vec2 = { x: 200, y: 2600 };
export const RED_FOUNTAIN: Vec2 = { x: 2600, y: 200 };

// Waypoints from Blue Base -> Red Base
export const LANE_WAYPOINTS_BLUE: Record<LaneId, Vec2[]> = {
  top: [
    { x: 300, y: 2220 },
    { x: 300, y: 1400 },
    { x: 300, y: 520 },
    { x: 520, y: 300 },
    { x: 1400, y: 300 },
    { x: 2220, y: 300 },
    { x: 2490, y: 310 },
  ],
  mid: [
    { x: 520, y: 2280 },
    { x: 960, y: 1840 },
    { x: 1400, y: 1400 },
    { x: 1840, y: 960 },
    { x: 2280, y: 520 },
    { x: 2490, y: 310 },
  ],
  bot: [
    { x: 580, y: 2500 },
    { x: 1400, y: 2500 },
    { x: 2280, y: 2500 },
    { x: 2500, y: 2280 },
    { x: 2500, y: 1400 },
    { x: 2500, y: 580 },
    { x: 2490, y: 310 },
  ],
};

export const LANE_WAYPOINTS_RED: Record<LaneId, Vec2[]> = {
  top: [...LANE_WAYPOINTS_BLUE.top].slice(0, -1).reverse().concat([{ x: 310, y: 2490 }]),
  mid: [...LANE_WAYPOINTS_BLUE.mid].slice(0, -1).reverse().concat([{ x: 310, y: 2490 }]),
  bot: [...LANE_WAYPOINTS_BLUE.bot].slice(0, -1).reverse().concat([{ x: 310, y: 2490 }]),
};

export const INITIAL_STRUCTURES: StructureDef[] = [
  // Blue Core
  {
    id: 'blue_core',
    name: 'Inti Cahaya Biru',
    team: 'blue',
    lane: 'base',
    kind: 'core',
    x: 310,
    y: 2490,
    maxHp: 3200,
    attackDamage: 110,
    attackRange: 300,
  },
  // Blue Turrets (2 per lane)
  {
    id: 'blue_top_inner',
    name: 'Menara Dalam Atas (Biru)',
    team: 'blue',
    lane: 'top',
    kind: 'turret',
    x: 300,
    y: 1880,
    maxHp: 1500,
    attackDamage: 88,
    attackRange: 255,
  },
  {
    id: 'blue_top_outer',
    name: 'Menara Luar Atas (Biru)',
    team: 'blue',
    lane: 'top',
    kind: 'turret',
    x: 300,
    y: 1020,
    maxHp: 1300,
    attackDamage: 82,
    attackRange: 255,
  },
  {
    id: 'blue_mid_inner',
    name: 'Menara Dalam Tengah (Biru)',
    team: 'blue',
    lane: 'mid',
    kind: 'turret',
    x: 680,
    y: 2120,
    maxHp: 1500,
    attackDamage: 88,
    attackRange: 255,
  },
  {
    id: 'blue_mid_outer',
    name: 'Menara Luar Tengah (Biru)',
    team: 'blue',
    lane: 'mid',
    kind: 'turret',
    x: 1060,
    y: 1740,
    maxHp: 1300,
    attackDamage: 82,
    attackRange: 255,
  },
  {
    id: 'blue_bot_inner',
    name: 'Menara Dalam Bawah (Biru)',
    team: 'blue',
    lane: 'bot',
    kind: 'turret',
    x: 920,
    y: 2500,
    maxHp: 1500,
    attackDamage: 88,
    attackRange: 255,
  },
  {
    id: 'blue_bot_outer',
    name: 'Menara Luar Bawah (Biru)',
    team: 'blue',
    lane: 'bot',
    kind: 'turret',
    x: 1780,
    y: 2500,
    maxHp: 1300,
    attackDamage: 82,
    attackRange: 255,
  },

  // Red Core
  {
    id: 'red_core',
    name: 'Inti Cahaya Merah',
    team: 'red',
    lane: 'base',
    kind: 'core',
    x: 2490,
    y: 310,
    maxHp: 3200,
    attackDamage: 110,
    attackRange: 300,
  },
  // Red Turrets
  {
    id: 'red_top_inner',
    name: 'Menara Dalam Atas (Merah)',
    team: 'red',
    lane: 'top',
    kind: 'turret',
    x: 1880,
    y: 300,
    maxHp: 1500,
    attackDamage: 88,
    attackRange: 255,
  },
  {
    id: 'red_top_outer',
    name: 'Menara Luar Atas (Merah)',
    team: 'red',
    lane: 'top',
    kind: 'turret',
    x: 1020,
    y: 300,
    maxHp: 1300,
    attackDamage: 82,
    attackRange: 255,
  },
  {
    id: 'red_mid_inner',
    name: 'Menara Dalam Tengah (Merah)',
    team: 'red',
    lane: 'mid',
    kind: 'turret',
    x: 2120,
    y: 680,
    maxHp: 1500,
    attackDamage: 88,
    attackRange: 255,
  },
  {
    id: 'red_mid_outer',
    name: 'Menara Luar Tengah (Merah)',
    team: 'red',
    lane: 'mid',
    kind: 'turret',
    x: 1740,
    y: 1060,
    maxHp: 1300,
    attackDamage: 82,
    attackRange: 255,
  },
  {
    id: 'red_bot_inner',
    name: 'Menara Dalam Bawah (Merah)',
    team: 'red',
    lane: 'bot',
    kind: 'turret',
    x: 2500,
    y: 920,
    maxHp: 1500,
    attackDamage: 88,
    attackRange: 255,
  },
  {
    id: 'red_bot_outer',
    name: 'Menara Luar Bawah (Merah)',
    team: 'red',
    lane: 'bot',
    kind: 'turret',
    x: 2500,
    y: 1780,
    maxHp: 1300,
    attackDamage: 82,
    attackRange: 255,
  },
];

export const NEUTRAL_GUARDIANS: GuardianDef[] = [
  {
    id: 'guardian_emerald',
    name: 'Penjaga Kristal Zamrud',
    x: 840,
    y: 840,
    color: 0x10b981,
    maxHp: 1100,
    attackDamage: 48,
    goldReward: 220,
  },
  {
    id: 'guardian_gold',
    name: 'Penjaga Kristal Emas',
    x: 1960,
    y: 1960,
    color: 0xf59e0b,
    maxHp: 1100,
    attackDamage: 48,
    goldReward: 220,
  },
];

// Jungle gardens & palace colonnade obstacles that create tactical jungle corridors
export const ARENA_OBSTACLES: ObstacleDef[] = [
  // Top-left jungle gardens
  { x: 650, y: 650, r: 72, kind: 'garden' },
  { x: 640, y: 1220, r: 68, kind: 'garden' },
  { x: 1180, y: 660, r: 68, kind: 'garden' },
  { x: 930, y: 1180, r: 58, kind: 'pillar' },
  { x: 1180, y: 940, r: 58, kind: 'pillar' },

  // Bottom-right jungle gardens
  { x: 2150, y: 2150, r: 72, kind: 'garden' },
  { x: 2160, y: 1580, r: 68, kind: 'garden' },
  { x: 1620, y: 2140, r: 68, kind: 'garden' },
  { x: 1870, y: 1620, r: 58, kind: 'pillar' },
  { x: 1620, y: 1860, r: 58, kind: 'pillar' },

  // Blue jungle inner walls/gardens
  { x: 620, y: 1680, r: 64, kind: 'palace_wall' },
  { x: 1120, y: 2180, r: 64, kind: 'palace_wall' },

  // Red jungle inner walls/gardens
  { x: 2180, y: 1120, r: 64, kind: 'palace_wall' },
  { x: 1680, y: 620, r: 64, kind: 'palace_wall' },
];
