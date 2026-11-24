import Phaser from 'phaser';
import { HEROES, HERO_LIST } from '../data/heroes';
import { SHOP_ITEMS } from '../data/items';
import { QUICK_CHAT_MAP } from '../data/quickChat';
import { LocalBotTransport } from '../network/MatchTransport';
import { soundEngine } from '../services/sound';
import {
  BattleInputBridge,
  CombatNotice,
  GameMode,
  GraphicsQuality,
  HeroDef,
  HeroId,
  HudSnapshot,
  MatchResultSummary,
  MinimapEntity,
  QuickChatFeedItem,
  QuickChatId,
  ScoreboardRow,
} from '../types/game';
import {
  ARENA_OBSTACLES,
  BLUE_FOUNTAIN,
  INITIAL_STRUCTURES,
  LANE_WAYPOINTS_BLUE,
  LANE_WAYPOINTS_RED,
  LaneId,
  NEUTRAL_GUARDIANS,
  RED_FOUNTAIN,
  Vec2,
  WORLD_SIZE,
} from './ArenaConfig';
import { generateAllGameTextures } from './TextureGenerator';

const GUARDIAN_RESPAWN_TIME = 55;

type Team = 'blue' | 'red';
type BotState = 'LANE' | 'COMBAT' | 'PUSH_TOWER' | 'RETREAT' | 'HEAL_BASE' | 'ASSIST';

interface FloatingTextItem {
  active: boolean;
  life: number;
  maxLife: number;
  vy: number;
  text: Phaser.GameObjects.Text;
}

interface LightParticleItem {
  active: boolean;
  life: number;
  maxLife: number;
  vx: number;
  vy: number;
  sprite: Phaser.GameObjects.Sprite;
}

interface HeroEntity {
  id: string;
  name: string;
  heroDef: HeroDef;
  team: Team;
  isHuman: boolean;
  lane: LaneId;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: number;
  radius: number;

  level: number;
  xp: number;
  maxXp: number;
  gold: number;
  items: string[];

  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  shield: number;
  shieldTimer: number;

  ad: number;
  magic: number;
  defense: number;
  moveSpeed: number;
  attackRange: number;
  attackInterval: number;
  cdrPct: number;

  attackCooldown: number;
  skillCooldowns: [number, number, number, number];
  recoveryCooldown: number;

  slowTimer: number;
  slowAmount: number;
  speedBuffTimer: number;
  speedBuffAmount: number;
  asBuffTimer: number;
  guardianBuffTimer: number;
  cycloneTimer: number;
  cycloneTick: number;

  isDead: boolean;
  respawnTimer: number;
  recallTimer: number; // > 0 when channeling recall

  kills: number;
  deaths: number;
  assists: number;
  lastDamagedByHeroId: string | null;
  lastDamagedTime: number;

  botState: BotState;
  botBuyTimer: number;
  waypointIdx: number;

  sprite: Phaser.GameObjects.Sprite;
  teamRing: Phaser.GameObjects.Arc;
  shieldRing: Phaser.GameObjects.Arc;
  guardianRing: Phaser.GameObjects.Arc;
  hpBarBg: Phaser.GameObjects.Rectangle;
  hpBarFill: Phaser.GameObjects.Rectangle;
  manaBarFill: Phaser.GameObjects.Rectangle;
  nameText: Phaser.GameObjects.Text;
  bubbleBg: Phaser.GameObjects.Rectangle;
  bubbleText: Phaser.GameObjects.Text;
  bubbleTimer: number;
}

interface MinionEntity {
  active: boolean;
  team: Team;
  lane: LaneId;
  isRanged: boolean;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  ad: number;
  defense: number;
  speed: number;
  attackRange: number;
  attackInterval: number;
  attackCooldown: number;
  waypointIdx: number;
  radius: number;
  sprite: Phaser.GameObjects.Sprite;
  hpBg: Phaser.GameObjects.Rectangle;
  hpFill: Phaser.GameObjects.Rectangle;
}

interface StructureEntity {
  id: string;
  name: string;
  team: Team;
  lane: LaneId | 'base';
  kind: 'turret' | 'core';
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  ad: number;
  attackRange: number;
  attackCooldown: number;
  aggroHeroId: string | null;
  aggroTimer: number;
  destroyed: boolean;
  radius: number;
  sprite: Phaser.GameObjects.Sprite;
  rangeRing: Phaser.GameObjects.Arc;
  hpBg: Phaser.GameObjects.Rectangle;
  hpFill: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
}

interface GuardianEntity {
  id: string;
  name: string;
  homeX: number;
  homeY: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  ad: number;
  goldReward: number;
  attackCooldown: number;
  alive: boolean;
  respawnTimer: number;
  radius: number;
  sprite: Phaser.GameObjects.Sprite;
  hpBg: Phaser.GameObjects.Rectangle;
  hpFill: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
}

interface Projectile {
  active: boolean;
  team: Team;
  ownerHeroId: string | null;
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  damage: number;
  isMagic: boolean;
  piercing: boolean;
  aoeRadius: number;
  life: number;
  targetType: 'any' | 'minion' | 'hero' | 'structure' | 'guardian';
  homingTargetId: string | null;
  hitIds: Set<string>;
  sprite: Phaser.GameObjects.Sprite;
}

interface AoEZone {
  team: Team;
  ownerHeroId: string;
  kind: 'damage_slow' | 'heal_slow' | 'storm' | 'rain';
  x: number;
  y: number;
  radius: number;
  duration: number;
  tickInterval: number;
  tickTimer: number;
  power: number;
  graphic: Phaser.GameObjects.Graphics;
}

export interface BattleSceneInitData {
  playerHeroId: HeroId;
  mode: GameMode;
  quality: GraphicsQuality;
  inputBridge: BattleInputBridge;
  onHudUpdate: (snapshot: HudSnapshot) => void;
  onMatchEnd: (summary: MatchResultSummary) => void;
}

export class BattleScene extends Phaser.Scene {
  private initData!: BattleSceneInitData;

  private heroes: HeroEntity[] = [];
  private playerHero!: HeroEntity;
  private minions: MinionEntity[] = [];
  private structures: StructureEntity[] = [];
  private guardians: GuardianEntity[] = [];
  private projectiles: Projectile[] = [];
  private aoeZones: AoEZone[] = [];
  private floatingTextPool: FloatingTextItem[] = [];
  private lightParticlePool: LightParticleItem[] = [];
  private transport = new LocalBotTransport();
  private lockedTarget: { kind: 'hero' | 'structure' | 'guardian'; id: string } | null = null;
  private targetReticle!: Phaser.GameObjects.Arc;

  private matchTimeSec = 0;
  private waveTimer = 2; // first wave spawns quickly at 2s
  private blueKills = 0;
  private redKills = 0;
  private hudEmitTimer = 0;
  private hitstopTimer = 0;
  private matchEnded = false;
  private notices: CombatNotice[] = [];
  private noticeCounter = 1;
  private chatFeed: Array<QuickChatFeedItem & { ttl: number }> = [];
  private chatCounter = 1;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: {
    w: Phaser.Input.Keyboard.Key;
    a: Phaser.Input.Keyboard.Key;
    s: Phaser.Input.Keyboard.Key;
    d: Phaser.Input.Keyboard.Key;
    space: Phaser.Input.Keyboard.Key;
    q: Phaser.Input.Keyboard.Key;
    e: Phaser.Input.Keyboard.Key;
    r: Phaser.Input.Keyboard.Key;
    f: Phaser.Input.Keyboard.Key;
    b: Phaser.Input.Keyboard.Key;
    g: Phaser.Input.Keyboard.Key;
  };

  private blurHandler = () => {
    if (!this.input || !this.input.keyboard) return;
    this.input.keyboard.resetKeys();
  };

  constructor() {
    super({ key: 'BattleScene' });
  }

  public init(data: BattleSceneInitData): void {
    this.initData = data;
    this.heroes = [];
    this.minions = [];
    this.structures = [];
    this.guardians = [];
    this.projectiles = [];
    this.aoeZones = [];
    this.floatingTextPool = [];
    this.lightParticlePool = [];
    this.lockedTarget = null;
    this.matchTimeSec = 0;
    this.waveTimer = 2;
    this.blueKills = 0;
    this.redKills = 0;
    this.hudEmitTimer = 0;
    this.hitstopTimer = 0;
    this.matchEnded = false;
    this.notices = [];
    this.chatFeed = [];
    void this.transport.connect({
      mode: data.mode,
      localPlayerId: 'blue_0',
      heroId: data.playerHeroId,
      tickRateHz: 60,
    });
  }

  public create(): void {
    generateAllGameTextures(this);
    this.physics?.world?.setBounds(0, 0, WORLD_SIZE, WORLD_SIZE);
    this.cameras.main.setBounds(0, 0, WORLD_SIZE, WORLD_SIZE);

    this.drawBattlefieldMap();
    this.createObstacles();
    this.createStructures();
    this.createGuardians();
    this.createProjectilePool(80);
    this.createMinionPool(60);
    this.createFxPools(30, 64);
    this.targetReticle = this.add
      .circle(0, 0, 36, 0xfbbf24, 0.08)
      .setStrokeStyle(2.5, 0xfbbf24, 0.95)
      .setVisible(false)
      .setDepth(11);
    this.spawnTeams();
    this.setupKeyboard();
    this.setupPointerTargetSelection();

    this.cameras.main.startFollow(this.playerHero.sprite, true, 0.14, 0.14);
    this.cameras.main.setZoom(this.scale.width < 760 ? 0.78 : 0.95);

    this.pushNotice('Pertempuran Dimulai! Lindungi Inti Cahaya!', 'gold');
    this.emitHudSnapshot(null);

    window.addEventListener('blur', this.blurHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('blur', this.blurHandler);
      this.transport.disconnect();
    });
  }

  private setupKeyboard(): void {
    if (!this.input.keyboard) return;
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = {
      w: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      a: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      s: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      d: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      space: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      q: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q),
      e: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E),
      r: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R),
      f: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F),
      b: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.B),
      g: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.G),
    };
  }

  private setupPointerTargetSelection(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.matchEnded || this.initData.inputBridge.paused) return;
      const wx = pointer.worldX;
      const wy = pointer.worldY;

      for (const h of this.heroes) {
        if (!h.isDead && h.team !== this.playerHero.team && Phaser.Math.Distance.Between(wx, wy, h.x, h.y) <= 44) {
          this.lockedTarget = { kind: 'hero', id: h.id };
          soundEngine.playClick();
          return;
        }
      }
      for (const g of this.guardians) {
        if (g.alive && Phaser.Math.Distance.Between(wx, wy, g.x, g.y) <= 50) {
          this.lockedTarget = { kind: 'guardian', id: g.id };
          soundEngine.playClick();
          return;
        }
      }
      for (const s of this.structures) {
        if (!s.destroyed && s.team !== this.playerHero.team && Phaser.Math.Distance.Between(wx, wy, s.x, s.y) <= s.radius + 16) {
          this.lockedTarget = { kind: 'structure', id: s.id };
          soundEngine.playClick();
          return;
        }
      }
    });
  }

  private createFxPools(textCount: number, particleCount: number): void {
    for (let i = 0; i < textCount; i++) {
      const text = this.add
        .text(-999, -999, '', {
          fontSize: '13px',
          fontFamily: 'JetBrains Mono',
          fontStyle: 'bold',
          color: '#ffffff',
          stroke: '#000000',
          strokeThickness: 3,
        })
        .setOrigin(0.5)
        .setVisible(false)
        .setDepth(30);
      this.floatingTextPool.push({ active: false, life: 0, maxLife: 0.75, vy: -36, text });
    }

    for (let i = 0; i < particleCount; i++) {
      const sprite = this.add
        .sprite(-999, -999, 'particle_light')
        .setVisible(false)
        .setDepth(16);
      this.lightParticlePool.push({ active: false, life: 0, maxLife: 0.5, vx: 0, vy: 0, sprite });
    }
  }

  private drawBattlefieldMap(): void {
    const bg = this.add.graphics();
    bg.setDepth(0);

    // Base rich desert-oasis grass & sandstone courtyard
    bg.fillStyle(0x13382e, 1);
    bg.fillRect(0, 0, WORLD_SIZE, WORLD_SIZE);

    // Subtle geometric courtyard grid
    bg.lineStyle(1, 0x1b4d3e, 0.45);
    for (let i = 0; i <= WORLD_SIZE; i += 140) {
      bg.lineBetween(i, 0, i, WORLD_SIZE);
      bg.lineBetween(0, i, WORLD_SIZE, i);
    }

    // Sandstone paved lanes (Top, Mid, Bot)
    bg.lineStyle(150, 0xb89c6d, 0.9);
    // Top lane
    bg.beginPath();
    bg.moveTo(300, 2400);
    bg.lineTo(300, 300);
    bg.lineTo(2400, 300);
    bg.strokePath();
    // Bot lane
    bg.beginPath();
    bg.moveTo(400, 2500);
    bg.lineTo(2500, 2500);
    bg.lineTo(2500, 400);
    bg.strokePath();
    // Mid lane
    bg.lineStyle(160, 0xb89c6d, 0.9);
    bg.lineBetween(340, 2460, 2460, 340);

    // Inner lane lighter marble runner
    bg.lineStyle(96, 0xd8c59e, 0.55);
    bg.beginPath();
    bg.moveTo(300, 2400);
    bg.lineTo(300, 300);
    bg.lineTo(2400, 300);
    bg.strokePath();
    bg.beginPath();
    bg.moveTo(400, 2500);
    bg.lineTo(2500, 2500);
    bg.lineTo(2500, 400);
    bg.strokePath();
    bg.lineBetween(340, 2460, 2460, 340);

    // Turquoise River diagonally from top-left to bottom-right
    bg.lineStyle(130, 0x0f766e, 0.92);
    bg.lineBetween(120, 120, 2680, 2680);
    bg.lineStyle(76, 0x14b8a6, 0.55);
    bg.lineBetween(120, 120, 2680, 2680);

    // Three ornate bridges over the river (Top-Left corner, Mid center, Bot-Right corner)
    const drawBridge = (cx: number, cy: number, angleDeg: number) => {
      const rect = this.add.rectangle(cx, cy, 210, 150, 0xe7dec8);
      rect.setStrokeStyle(5, 0xd4af37);
      rect.setRotation(Phaser.Math.DegToRad(angleDeg));
      rect.setDepth(1);
    };
    drawBridge(300, 300, 45);
    drawBridge(1400, 1400, -45);
    drawBridge(2500, 2500, 45);

    // Center Mid-Lane Islamic 8-pointed Star Medallion
    const med = this.add.graphics().setDepth(1);
    med.lineStyle(3, 0xd4af37, 0.7);
    med.strokeRect(1335, 1335, 130, 130);
    const rotRect = this.add.rectangle(1400, 1400, 130, 130);
    rotRect.setStrokeStyle(3, 0xd4af37, 0.7);
    rotRect.setRotation(Math.PI / 4);
    rotRect.setDepth(1);

    // Blue & Red Base Courtyards + Healing Fountains
    bg.fillStyle(0x0f2942, 0.95);
    bg.fillCircle(300, 2500, 310);
    bg.lineStyle(5, 0x38bdf8, 0.75);
    bg.strokeCircle(300, 2500, 310);

    bg.fillStyle(0x3b1219, 0.95);
    bg.fillCircle(2500, 300, 310);
    bg.lineStyle(5, 0xf87171, 0.75);
    bg.strokeCircle(2500, 300, 310);

    // Healing Fountains
    const blueF = this.add.circle(BLUE_FOUNTAIN.x, BLUE_FOUNTAIN.y, 95, 0x0ea5e9, 0.25).setDepth(1);
    blueF.setStrokeStyle(3, 0x6ee7b7, 0.85);
    this.add
      .text(BLUE_FOUNTAIN.x, BLUE_FOUNTAIN.y - 108, 'Mata Air Pemulih', {
        fontSize: '13px',
        fontFamily: 'Plus Jakarta Sans',
        color: '#a7f3d0',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(2);

    const redF = this.add.circle(RED_FOUNTAIN.x, RED_FOUNTAIN.y, 95, 0xef4444, 0.25).setDepth(1);
    redF.setStrokeStyle(3, 0xfca5a5, 0.85);

    // Outer Palace Wall Border
    bg.lineStyle(18, 0x927238, 1);
    bg.strokeRect(9, 9, WORLD_SIZE - 18, WORLD_SIZE - 18);
  }

  private createObstacles(): void {
    for (const obs of ARENA_OBSTACLES) {
      const texKey = obs.kind === 'garden' ? 'garden_tree' : 'palace_pillar';
      const spr = this.add.sprite(obs.x, obs.y, texKey);
      spr.setDisplaySize(obs.r * 2.1, obs.r * 2.1);
      spr.setDepth(8);
    }
  }

  private createStructures(): void {
    for (const def of INITIAL_STRUCTURES) {
      const tex =
        def.kind === 'core'
          ? def.team === 'blue'
            ? 'core_blue'
            : 'core_red'
          : def.team === 'blue'
          ? 'turret_blue'
          : 'turret_red';

      const rangeRing = this.add
        .circle(
          def.x,
          def.y,
          def.attackRange,
          def.team === 'blue' ? 0x38bdf8 : 0xf87171,
          0.03
        )
        .setStrokeStyle(1.5, def.team === 'blue' ? 0x38bdf8 : 0xf87171, 0.22)
        .setDepth(2);

      const sprite = this.add.sprite(def.x, def.y, tex).setDepth(7);
      if (def.kind === 'core') sprite.setDisplaySize(136, 136);
      else sprite.setDisplaySize(96, 96);

      const barW = def.kind === 'core' ? 110 : 76;
      const barY = def.y - (def.kind === 'core' ? 76 : 58);
      const hpBg = this.add.rectangle(def.x, barY, barW, 8, 0x090d16, 0.9).setDepth(20);
      const hpFill = this.add
        .rectangle(
          def.x - barW / 2,
          barY,
          barW,
          6,
          def.team === 'blue' ? 0x38bdf8 : 0xf87171
        )
        .setOrigin(0, 0.5)
        .setDepth(21);

      const label = this.add
        .text(def.x, barY - 12, def.kind === 'core' ? def.name : 'Menara', {
          fontSize: '11px',
          fontFamily: 'Plus Jakarta Sans',
          color: '#fdfbf7',
          stroke: '#000000',
          strokeThickness: 3,
        })
        .setOrigin(0.5)
        .setDepth(21);

      this.structures.push({
        id: def.id,
        name: def.name,
        team: def.team,
        lane: def.lane,
        kind: def.kind,
        x: def.x,
        y: def.y,
        hp: def.maxHp,
        maxHp: def.maxHp,
        ad: def.attackDamage,
        attackRange: def.attackRange,
        attackCooldown: 0,
        aggroHeroId: null,
        aggroTimer: 0,
        destroyed: false,
        radius: def.kind === 'core' ? 58 : 40,
        sprite,
        rangeRing,
        hpBg,
        hpFill,
        label,
      });
    }
  }

  private createGuardians(): void {
    for (const def of NEUTRAL_GUARDIANS) {
      const sprite = this.add.sprite(def.x, def.y, def.id).setDepth(7);
      sprite.setDisplaySize(86, 86);
      const hpBg = this.add.rectangle(def.x, def.y - 54, 72, 7, 0x090d16, 0.9).setDepth(20);
      const hpFill = this.add
        .rectangle(def.x - 36, def.y - 54, 72, 5, def.color)
        .setOrigin(0, 0.5)
        .setDepth(21);
      const label = this.add
        .text(def.x, def.y - 66, def.name, {
          fontSize: '11px',
          fontFamily: 'Plus Jakarta Sans',
          color: '#fde68a',
          stroke: '#000000',
          strokeThickness: 3,
        })
        .setOrigin(0.5)
        .setDepth(21);

      this.guardians.push({
        id: def.id,
        name: def.name,
        homeX: def.x,
        homeY: def.y,
        x: def.x,
        y: def.y,
        hp: def.maxHp,
        maxHp: def.maxHp,
        ad: def.attackDamage,
        goldReward: def.goldReward,
        attackCooldown: 0,
        alive: true,
        respawnTimer: 0,
        radius: 34,
        sprite,
        hpBg,
        hpFill,
        label,
      });
    }
  }

  private createProjectilePool(count: number): void {
    for (let i = 0; i < count; i++) {
      const sprite = this.add.sprite(-999, -999, 'proj_orb_blue').setVisible(false).setDepth(14);
      this.projectiles.push({
        active: false,
        team: 'blue',
        ownerHeroId: null,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        speed: 450,
        damage: 30,
        isMagic: false,
        piercing: false,
        aoeRadius: 0,
        life: 0,
        targetType: 'any',
        homingTargetId: null,
        hitIds: new Set<string>(),
        sprite,
      });
    }
  }

  private createMinionPool(count: number): void {
    for (let i = 0; i < count; i++) {
      const sprite = this.add.sprite(-999, -999, 'minion_blue_melee').setVisible(false).setDepth(6);
      const hpBg = this.add.rectangle(-999, -999, 34, 5, 0x090d16, 0.85).setVisible(false).setDepth(18);
      const hpFill = this.add
        .rectangle(-999, -999, 34, 3, 0x38bdf8)
        .setOrigin(0, 0.5)
        .setVisible(false)
        .setDepth(19);
      this.minions.push({
        active: false,
        team: 'blue',
        lane: 'mid',
        isRanged: false,
        x: 0,
        y: 0,
        hp: 0,
        maxHp: 1,
        ad: 15,
        defense: 5,
        speed: 135,
        attackRange: 56,
        attackInterval: 1.0,
        attackCooldown: 0,
        waypointIdx: 0,
        radius: 15,
        sprite,
        hpBg,
        hpFill,
      });
    }
  }

  private spawnTeams(): void {
    const chosenId = this.initData.playerHeroId;
    const otherHeroes = Phaser.Utils.Array.Shuffle(
      HERO_LIST.filter((h) => h.id !== chosenId)
    );

    const blueHeroDefs: HeroDef[] = [HEROES[chosenId], ...otherHeroes];
    const redHeroDefs: HeroDef[] = [
      HEROES.amin,
      HEROES.faris,
      HEROES.aina,
      HEROES.mumtaz,
      HEROES.zahra,
    ];

    const lanes: LaneId[] = ['mid', 'top', 'bot', 'bot', 'top'];
    const countPerTeam = this.initData.mode === 'training' ? 1 : 5;

    for (let i = 0; i < countPerTeam; i++) {
      const isHuman = i === 0;
      const hDef = blueHeroDefs[i];
      const spawnX = BLUE_FOUNTAIN.x + 80 + (i % 3) * 45;
      const spawnY = BLUE_FOUNTAIN.y - 80 - Math.floor(i / 3) * 45;
      const hero = this.createHeroEntity(
        `blue_${i}`,
        isHuman ? `${hDef.name} (Anda)` : `${hDef.name}`,
        hDef,
        'blue',
        isHuman,
        lanes[i],
        spawnX,
        spawnY
      );
      this.heroes.push(hero);
      if (isHuman) this.playerHero = hero;
    }

    for (let i = 0; i < countPerTeam; i++) {
      const hDef = redHeroDefs[i];
      const spawnX = RED_FOUNTAIN.x - 80 - (i % 3) * 45;
      const spawnY = RED_FOUNTAIN.y + 80 + Math.floor(i / 3) * 45;
      const hero = this.createHeroEntity(
        `red_${i}`,
        `${hDef.name}`,
        hDef,
        'red',
        false,
        lanes[i],
        spawnX,
        spawnY
      );
      this.heroes.push(hero);
    }
  }

  private createHeroEntity(
    id: string,
    name: string,
    heroDef: HeroDef,
    team: Team,
    isHuman: boolean,
    lane: LaneId,
    x: number,
    y: number
  ): HeroEntity {
    const ringColor = isHuman ? 0xfbbf24 : team === 'blue' ? 0x38bdf8 : 0xf87171;
    const teamRing = this.add.circle(x, y, 28, ringColor, 0.08).setStrokeStyle(2.5, ringColor, 0.85).setDepth(5);
    const shieldRing = this.add.circle(x, y, 34, 0xfef08a, 0.14).setStrokeStyle(2, 0xfef08a, 0.9).setVisible(false).setDepth(9);
    const guardianRing = this.add.circle(x, y, 38, 0x10b981, 0.08).setStrokeStyle(2, 0x34d399, 0.85).setVisible(false).setDepth(4);
    const sprite = this.add.sprite(x, y, `hero_${heroDef.id}`).setDepth(10);
    sprite.setDisplaySize(64, 64);

    const hpBg = this.add.rectangle(x, y - 42, 58, 9, 0x090d16, 0.92).setDepth(22);
    const hpBarFill = this.add
      .rectangle(x - 29, y - 43, 58, 5, isHuman ? 0x10b981 : team === 'blue' ? 0x38bdf8 : 0xef4444)
      .setOrigin(0, 0.5)
      .setDepth(23);
    const manaBarFill = this.add
      .rectangle(x - 29, y - 39, 58, 2.5, 0x60a5fa)
      .setOrigin(0, 0.5)
      .setDepth(23);
    const nameText = this.add
      .text(x, y - 54, `${name} Lv.1`, {
        fontSize: '11px',
        fontFamily: 'Plus Jakarta Sans',
        color: isHuman ? '#fde68a' : '#f1f5f9',
        fontStyle: isHuman ? 'bold' : 'normal',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(23);

    const bubbleBg = this.add
      .rectangle(x, y - 80, 130, 24, 0x071524, 0.92)
      .setStrokeStyle(1.5, 0xd4af37, 0.9)
      .setVisible(false)
      .setDepth(32);
    const bubbleText = this.add
      .text(x, y - 80, '', {
        fontSize: '11px',
        fontFamily: 'Plus Jakarta Sans',
        fontStyle: 'bold',
        color: '#fef3c7',
      })
      .setOrigin(0.5)
      .setVisible(false)
      .setDepth(33);

    const s = heroDef.stats;
    return {
      id,
      name,
      heroDef,
      team,
      isHuman,
      lane,
      x,
      y,
      vx: 0,
      vy: 0,
      facing: team === 'blue' ? -Math.PI / 4 : (Math.PI * 3) / 4,
      radius: 22,
      level: 1,
      xp: 0,
      maxXp: 140,
      gold: this.initData.mode === 'training' ? 900 : 350,
      items: [],
      hp: s.maxHp,
      maxHp: s.maxHp,
      mana: s.maxMana,
      maxMana: s.maxMana,
      shield: 0,
      shieldTimer: 0,
      ad: s.attackDamage,
      magic: s.magicPower,
      defense: s.defense,
      moveSpeed: s.moveSpeed,
      attackRange: s.attackRange,
      attackInterval: s.attackInterval,
      cdrPct: 0,
      attackCooldown: 0,
      skillCooldowns: [0, 0, 0, 0],
      recoveryCooldown: 0,
      slowTimer: 0,
      slowAmount: 0,
      speedBuffTimer: 0,
      speedBuffAmount: 0,
      asBuffTimer: 0,
      guardianBuffTimer: 0,
      cycloneTimer: 0,
      cycloneTick: 0,
      isDead: false,
      respawnTimer: 0,
      recallTimer: 0,
      kills: 0,
      deaths: 0,
      assists: 0,
      lastDamagedByHeroId: null,
      lastDamagedTime: 0,
      botState: 'LANE',
      botBuyTimer: 6,
      waypointIdx: 0,
      sprite,
      teamRing,
      shieldRing,
      guardianRing,
      hpBarBg: hpBg,
      hpBarFill,
      manaBarFill,
      nameText,
      bubbleBg,
      bubbleText,
      bubbleTimer: 0,
    };
  }

  public update(_time: number, rawDeltaMs: number): void {
    if (this.matchEnded) return;
    if (this.initData.inputBridge.paused) return;

    const dt = Math.min(rawDeltaMs / 1000, 0.05);

    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      return;
    }

    this.matchTimeSec += dt;

    // Enqueue local input bridge into scalable MatchTransport command stream
    this.transport.enqueueBridgeInput(this.playerHero.id, this.initData.inputBridge);
    const commands = this.transport.drainRemoteCommands();
    let transportMoveX = 0;
    let transportMoveY = 0;
    const transportActions: Array<'basic' | 's1' | 's2' | 's3' | 'ult' | 'recall' | 'recovery'> = [];
    for (const cmd of commands) {
      if (cmd.type === 'MOVE') {
        transportMoveX = cmd.vx;
        transportMoveY = cmd.vy;
      } else if (cmd.type === 'ACTION') {
        transportActions.push(cmd.action);
      } else if (cmd.type === 'BUY_ITEM') {
        this.tryBuyItem(this.playerHero, cmd.itemId);
      } else if (cmd.type === 'QUICK_CHAT') {
        this.triggerHeroQuickChat(this.playerHero, cmd.chatId, true);
      }
    }
    this.initData.inputBridge.moveX = transportMoveX;
    this.initData.inputBridge.moveY = transportMoveY;
    this.initData.inputBridge.triggerQueue.push(...transportActions);

    // Tick down chat feed TTL & hero speech bubbles
    for (let i = this.chatFeed.length - 1; i >= 0; i--) {
      this.chatFeed[i].ttl -= dt;
      if (this.chatFeed[i].ttl <= 0) {
        this.chatFeed.splice(i, 1);
      }
    }
    for (const h of this.heroes) {
      if (h.bubbleTimer > 0) {
        h.bubbleTimer -= dt;
        if (h.bubbleTimer <= 0) {
          h.bubbleBg.setVisible(false);
          h.bubbleText.setVisible(false);
        }
      }
    }

    // Spawn Minion Waves
    this.waveTimer -= dt;
    if (this.waveTimer <= 0) {
      this.waveTimer = 18;
      this.spawnMinionWaves();
    }

    // Update Heroes (Player + FSM Bots)
    for (const hero of this.heroes) {
      this.updateHero(hero, dt);
    }

    // Update Minions
    this.updateMinions(dt);

    // Update Structures
    this.updateStructures(dt);

    // Update Neutral Guardians
    this.updateGuardians(dt);

    // Update Projectiles
    this.updateProjectiles(dt);

    // Update AoE Zones
    this.updateAoEZones(dt);

    // Update Pooled FX (Floating Texts & Particles)
    this.updateFxPools(dt);

    // Sync Visuals
    this.syncEntityVisuals();

    // Emit HUD snapshot at ~12Hz
    this.hudEmitTimer -= dt;
    if (this.hudEmitTimer <= 0) {
      this.hudEmitTimer = 0.08;
      this.emitHudSnapshot(null);
    }
  }

  private spawnMinionWaves(): void {
    const lanes: LaneId[] = this.initData.mode === 'training' ? ['mid'] : ['top', 'mid', 'bot'];
    for (const lane of lanes) {
      for (const team of ['blue', 'red'] as Team[]) {
        const wps = team === 'blue' ? LANE_WAYPOINTS_BLUE[lane] : LANE_WAYPOINTS_RED[lane];
        const start = wps[0];
        // 2 melee + 1 ranged
        for (let m = 0; m < 3; m++) {
          const isRanged = m === 2;
          const offset = (m - 1) * 28;
          this.spawnMinion(team, lane, isRanged, start.x + offset, start.y - offset);
        }
      }
    }
  }

  private spawnMinion(team: Team, lane: LaneId, isRanged: boolean, x: number, y: number): void {
    const slot = this.minions.find((m) => !m.active);
    if (!slot) return;
    const scaleFactor = 1 + Math.floor(this.matchTimeSec / 60) * 0.12;
    slot.active = true;
    slot.team = team;
    slot.lane = lane;
    slot.isRanged = isRanged;
    slot.x = x;
    slot.y = y;
    slot.maxHp = Math.round((isRanged ? 190 : 270) * scaleFactor);
    slot.hp = slot.maxHp;
    slot.ad = Math.round((isRanged ? 22 : 17) * scaleFactor);
    slot.defense = isRanged ? 4 : 10;
    slot.speed = 135;
    slot.attackRange = isRanged ? 185 : 54;
    slot.attackInterval = isRanged ? 1.15 : 0.95;
    slot.attackCooldown = 0;
    slot.waypointIdx = 0;

    const tex =
      team === 'blue'
        ? isRanged
          ? 'minion_blue_ranged'
          : 'minion_blue_melee'
        : isRanged
        ? 'minion_red_ranged'
        : 'minion_red_melee';

    slot.sprite.setTexture(tex).setPosition(x, y).setVisible(true).setDisplaySize(36, 36);
    slot.hpBg.setPosition(x, y - 24).setVisible(true);
    slot.hpFill
      .setPosition(x - 17, y - 24)
      .setFillStyle(team === 'blue' ? 0x38bdf8 : 0xf87171)
      .setVisible(true);
  }

  private updateHero(hero: HeroEntity, dt: number): void {
    if (hero.isDead) {
      hero.respawnTimer -= dt;
      if (hero.respawnTimer <= 0) {
        this.respawnHero(hero);
      }
      return;
    }

    // Passive gold & regen
    hero.gold += dt * (this.initData.mode === 'training' ? 12 : 4.5);
    hero.mana = Math.min(hero.maxMana, hero.mana + (4.5 + hero.level * 0.4) * dt);
    hero.hp = Math.min(hero.maxHp, hero.hp + (2.5 + hero.level * 0.3) * dt);

    // Fountain healing check
    const fountain = hero.team === 'blue' ? BLUE_FOUNTAIN : RED_FOUNTAIN;
    if (Phaser.Math.Distance.Between(hero.x, hero.y, fountain.x, fountain.y) < 115) {
      hero.hp = Math.min(hero.maxHp, hero.hp + hero.maxHp * 0.16 * dt);
      hero.mana = Math.min(hero.maxMana, hero.mana + hero.maxMana * 0.22 * dt);
    }

    // Timers
    if (hero.attackCooldown > 0) hero.attackCooldown -= dt;
    for (let i = 0; i < 4; i++) {
      if (hero.skillCooldowns[i] > 0) hero.skillCooldowns[i] = Math.max(0, hero.skillCooldowns[i] - dt);
    }
    if (hero.recoveryCooldown > 0) hero.recoveryCooldown = Math.max(0, hero.recoveryCooldown - dt);
    if (hero.shieldTimer > 0) {
      hero.shieldTimer -= dt;
      if (hero.shieldTimer <= 0) hero.shield = 0;
    }
    if (hero.slowTimer > 0) hero.slowTimer -= dt;
    if (hero.speedBuffTimer > 0) hero.speedBuffTimer -= dt;
    if (hero.asBuffTimer > 0) hero.asBuffTimer -= dt;
    if (hero.guardianBuffTimer > 0) hero.guardianBuffTimer -= dt;

    // Zaid Ultimate Cyclone active spin
    if (hero.cycloneTimer > 0) {
      hero.cycloneTimer -= dt;
      hero.cycloneTick -= dt;
      if (hero.cycloneTick <= 0) {
        hero.cycloneTick = 0.4;
        this.spawnRingPulse(hero.x, hero.y, 175, 0x38bdf8, 0.35);
        this.damageEnemiesInRadius(hero, hero.x, hero.y, 175, 42 + hero.ad * 0.55, false);
      }
    }

    if (hero.isHuman) {
      this.controlHumanHero(hero, dt);
    } else {
      this.controlBotHero(hero, dt);
    }
  }

  private controlHumanHero(hero: HeroEntity, dt: number): void {
    const bridge = this.initData.inputBridge;
    let mx = bridge.moveX;
    let my = bridge.moveY;

    if (this.keys) {
      if (this.keys.a.isDown || this.cursors.left.isDown) mx -= 1;
      if (this.keys.d.isDown || this.cursors.right.isDown) mx += 1;
      if (this.keys.w.isDown || this.cursors.up.isDown) my -= 1;
      if (this.keys.s.isDown || this.cursors.down.isDown) my += 1;

      if (Phaser.Input.Keyboard.JustDown(this.keys.space)) bridge.triggerQueue.push('basic');
      if (Phaser.Input.Keyboard.JustDown(this.keys.q)) bridge.triggerQueue.push('s1');
      if (Phaser.Input.Keyboard.JustDown(this.keys.e)) bridge.triggerQueue.push('s2');
      if (Phaser.Input.Keyboard.JustDown(this.keys.r)) bridge.triggerQueue.push('s3');
      if (Phaser.Input.Keyboard.JustDown(this.keys.f)) bridge.triggerQueue.push('ult');
      if (Phaser.Input.Keyboard.JustDown(this.keys.b)) bridge.triggerQueue.push('recall');
      if (Phaser.Input.Keyboard.JustDown(this.keys.g)) bridge.triggerQueue.push('recovery');
    }

    const len = Math.hypot(mx, my);
    if (len > 0.08) {
      const nx = mx / Math.max(1, len);
      const ny = my / Math.max(1, len);
      this.moveHero(hero, nx, ny, dt);
      hero.recallTimer = 0; // cancel recall on movement
      soundEngine.playFootstep();
    } else {
      hero.vx = 0;
      hero.vy = 0;
    }

    // Channeling recall
    if (hero.recallTimer > 0) {
      hero.recallTimer -= dt;
      if (hero.recallTimer <= 0) {
        const f = hero.team === 'blue' ? BLUE_FOUNTAIN : RED_FOUNTAIN;
        hero.x = f.x + 40;
        hero.y = f.y - 40;
        this.spawnLightBurst(hero.x, hero.y, 0x38bdf8, 12);
        soundEngine.playHeal();
      }
    }

    // Trigger Actions
    while (bridge.triggerQueue.length > 0) {
      const act = bridge.triggerQueue.shift()!;
      if (act === 'basic') {
        this.performBasicAttack(hero);
      } else if (act === 's1') {
        this.castSkill(hero, 0);
      } else if (act === 's2') {
        this.castSkill(hero, 1);
      } else if (act === 's3') {
        this.castSkill(hero, 2);
      } else if (act === 'ult') {
        this.castSkill(hero, 3);
      } else if (act === 'recall') {
        if (hero.recallTimer <= 0) {
          hero.recallTimer = 3.2;
          this.spawnFloatingText(hero.x, hero.y - 48, 'Kembali ke Markas...', '#93c5fd');
        }
      } else if (act === 'recovery') {
        if (hero.recoveryCooldown <= 0) {
          hero.recoveryCooldown = 26;
          const healAmt = Math.round(hero.maxHp * 0.25);
          const manaAmt = Math.round(hero.maxMana * 0.18);
          this.healHero(hero, healAmt);
          hero.mana = Math.min(hero.maxMana, hero.mana + manaAmt);
          soundEngine.playHeal();
        }
      }
    }
  }

  private controlBotHero(hero: HeroEntity, dt: number): void {
    // Periodic item purchase
    hero.botBuyTimer -= dt;
    if (hero.botBuyTimer <= 0) {
      hero.botBuyTimer = 8;
      if (hero.items.length < 6) {
        const affordable = SHOP_ITEMS.filter(
          (item) => hero.gold >= item.cost && !hero.items.includes(item.id)
        );
        if (affordable.length > 0) {
          const pick = affordable[Math.floor(Math.random() * affordable.length)];
          this.tryBuyItem(hero, pick.id);
        }
      }
    }

    const fountain = hero.team === 'blue' ? BLUE_FOUNTAIN : RED_FOUNTAIN;
    const hpRatio = hero.hp / hero.maxHp;

    // State Transitions
    if (hpRatio < 0.26) {
      hero.botState = 'RETREAT';
    } else if (hero.botState === 'RETREAT' && hpRatio > 0.82) {
      hero.botState = 'LANE';
    }

    const enemyHeroes = this.heroes.filter(
      (h) => !h.isDead && h.team !== hero.team && Phaser.Math.Distance.Between(hero.x, hero.y, h.x, h.y) < 420
    );
    const enemyMinions = this.minions.filter(
      (m) => m.active && m.team !== hero.team && Phaser.Math.Distance.Between(hero.x, hero.y, m.x, m.y) < 360
    );
    const enemyStructures = this.structures.filter(
      (s) => !s.destroyed && s.team !== hero.team && Phaser.Math.Distance.Between(hero.x, hero.y, s.x, s.y) < 420
    );

    if (hero.botState === 'RETREAT') {
      const distToFountain = Phaser.Math.Distance.Between(hero.x, hero.y, fountain.x, fountain.y);
      if (distToFountain > 75) {
        this.steerTowards(hero, fountain.x, fountain.y, dt);
      } else {
        hero.botState = 'HEAL_BASE';
      }
      return;
    }

    if (hero.botState === 'HEAL_BASE') {
      if (hpRatio >= 0.88) {
        hero.botState = 'LANE';
      }
      return;
    }

    // Check if support/healer bot (Zahra or Putri Aina) has a wounded ally nearby
    if (hero.heroDef.id === 'zahra' || hero.heroDef.id === 'aina') {
      const woundedAlly = this.heroes.find(
        (h) =>
          !h.isDead &&
          h.team === hero.team &&
          h.hp / h.maxHp < 0.7 &&
          Phaser.Math.Distance.Between(hero.x, hero.y, h.x, h.y) < 280
      );
      if (woundedAlly) {
        if (hero.heroDef.id === 'zahra') {
          this.castSkill(hero, 0);
          this.castSkill(hero, 1);
        } else {
          this.castSkill(hero, 1);
        }
      }
    }

    // Priority 0: Assist nearby wounded ally under attack
    if (enemyHeroes.length === 0) {
      const allyInDanger = this.heroes.find(
        (h) =>
          !h.isDead &&
          h.team === hero.team &&
          h.id !== hero.id &&
          h.hp / h.maxHp < 0.65 &&
          this.matchTimeSec - h.lastDamagedTime < 3.5 &&
          Phaser.Math.Distance.Between(hero.x, hero.y, h.x, h.y) < 620
      );
      if (allyInDanger) {
        hero.botState = 'ASSIST';
        this.steerTowards(hero, allyInDanger.x, allyInDanger.y, dt);
        return;
      }
    }

    // Priority 1: Fight nearby enemy hero if safe (don't dive enemy turret without allied minions!)
    if (enemyHeroes.length > 0) {
      const targetHero = enemyHeroes[0];
      const nearEnemyTurret = enemyStructures.find(
        (s) => Phaser.Math.Distance.Between(targetHero.x, targetHero.y, s.x, s.y) < s.attackRange + 20
      );
      const alliedMinionsNearTurret = nearEnemyTurret
        ? this.minions.some(
            (m) =>
              m.active &&
              m.team === hero.team &&
              Phaser.Math.Distance.Between(m.x, m.y, nearEnemyTurret.x, nearEnemyTurret.y) < nearEnemyTurret.attackRange
          )
        : true;

      if (!nearEnemyTurret || alliedMinionsNearTurret) {
        const dist = Phaser.Math.Distance.Between(hero.x, hero.y, targetHero.x, targetHero.y);
        const desiredDist = Math.max(55, hero.attackRange * 0.85);

        if (dist > desiredDist) {
          this.steerTowards(hero, targetHero.x, targetHero.y, dt);
        } else {
          hero.facing = Phaser.Math.Angle.Between(hero.x, hero.y, targetHero.x, targetHero.y);
        }

        // Intelligent skill usage
        if (dist < 260) {
          if (hero.skillCooldowns[3] <= 0 && (targetHero.hp / targetHero.maxHp < 0.65 || enemyHeroes.length >= 2)) {
            this.castSkill(hero, 3);
          } else if (hero.skillCooldowns[0] <= 0) {
            this.castSkill(hero, 0);
          } else if (hero.skillCooldowns[2] <= 0) {
            this.castSkill(hero, 2);
          } else if (hero.skillCooldowns[1] <= 0) {
            this.castSkill(hero, 1);
          }
        }

        if (dist <= hero.attackRange + 20) {
          this.performBasicAttack(hero);
        }
        return;
      }
    }

    // Priority 2: Attack enemy minions
    if (enemyMinions.length > 0) {
      const targetM = enemyMinions[0];
      const dist = Phaser.Math.Distance.Between(hero.x, hero.y, targetM.x, targetM.y);
      if (dist > hero.attackRange * 0.85) {
        this.steerTowards(hero, targetM.x, targetM.y, dt);
      } else {
        hero.facing = Phaser.Math.Angle.Between(hero.x, hero.y, targetM.x, targetM.y);
        this.performBasicAttack(hero);
      }
      return;
    }

    // Priority 3: Push enemy turret if allied minions are tanking it
    if (enemyStructures.length > 0) {
      const struct = enemyStructures[0];
      const hasMinionShield = this.minions.some(
        (m) =>
          m.active &&
          m.team === hero.team &&
          Phaser.Math.Distance.Between(m.x, m.y, struct.x, struct.y) < struct.attackRange
      );
      const dist = Phaser.Math.Distance.Between(hero.x, hero.y, struct.x, struct.y);
      if (hasMinionShield) {
        if (dist > hero.attackRange + struct.radius * 0.6) {
          this.steerTowards(hero, struct.x, struct.y, dt);
        } else {
          hero.facing = Phaser.Math.Angle.Between(hero.x, hero.y, struct.x, struct.y);
          this.performBasicAttack(hero);
        }
        return;
      } else if (dist < struct.attackRange + 40) {
        // Step back out of turret range
        this.steerTowards(hero, fountain.x, fountain.y, dt);
        return;
      }
    }

    // Default: March along assigned lane waypoints
    const waypoints =
      hero.team === 'blue' ? LANE_WAYPOINTS_BLUE[hero.lane] : LANE_WAYPOINTS_RED[hero.lane];
    const wp = waypoints[Math.min(hero.waypointIdx, waypoints.length - 1)];
    const distWp = Phaser.Math.Distance.Between(hero.x, hero.y, wp.x, wp.y);
    if (distWp < 70 && hero.waypointIdx < waypoints.length - 1) {
      hero.waypointIdx += 1;
    }
    this.steerTowards(hero, wp.x, wp.y, dt);
  }

  private steerTowards(hero: HeroEntity, tx: number, ty: number, dt: number): void {
    let dx = tx - hero.x;
    let dy = ty - hero.y;
    const len = Math.hypot(dx, dy);
    if (len < 1) return;
    dx /= len;
    dy /= len;

    // Obstacle avoidance steering
    for (const obs of ARENA_OBSTACLES) {
      const ox = hero.x - obs.x;
      const oy = hero.y - obs.y;
      const dist = Math.hypot(ox, oy);
      const avoidDist = obs.r + hero.radius + 26;
      if (dist < avoidDist && dist > 0.1) {
        const push = (avoidDist - dist) / avoidDist;
        dx += (ox / dist) * push * 1.4;
        dy += (oy / dist) * push * 1.4;
      }
    }

    const nLen = Math.hypot(dx, dy) || 1;
    this.moveHero(hero, dx / nLen, dy / nLen, dt);
  }

  private moveHero(hero: HeroEntity, nx: number, ny: number, dt: number): void {
    let speed = hero.moveSpeed;
    if (hero.slowTimer > 0) speed *= 1 - hero.slowAmount;
    if (hero.speedBuffTimer > 0) speed *= 1 + hero.speedBuffAmount;
    if (hero.guardianBuffTimer > 0) speed *= 1.15;
    if (hero.cycloneTimer > 0) speed *= 1.22;

    hero.x += nx * speed * dt;
    hero.y += ny * speed * dt;
    hero.facing = Math.atan2(ny, nx);

    this.resolveCollisions(hero);
  }

  private resolveCollisions(entity: { x: number; y: number; radius: number }): void {
    entity.x = Phaser.Math.Clamp(entity.x, 36, WORLD_SIZE - 36);
    entity.y = Phaser.Math.Clamp(entity.y, 36, WORLD_SIZE - 36);

    for (const obs of ARENA_OBSTACLES) {
      const dx = entity.x - obs.x;
      const dy = entity.y - obs.y;
      const dist = Math.hypot(dx, dy);
      const minD = obs.r + entity.radius;
      if (dist < minD && dist > 0.01) {
        entity.x = obs.x + (dx / dist) * minD;
        entity.y = obs.y + (dy / dist) * minD;
      }
    }

    for (const st of this.structures) {
      if (st.destroyed) continue;
      const dx = entity.x - st.x;
      const dy = entity.y - st.y;
      const dist = Math.hypot(dx, dy);
      const minD = st.radius + entity.radius;
      if (dist < minD && dist > 0.01) {
        entity.x = st.x + (dx / dist) * minD;
        entity.y = st.y + (dy / dist) * minD;
      }
    }

    // Soft hero-to-hero separation so teamfights stay legible
    for (const other of this.heroes) {
      if (other.isDead || (other.x === entity.x && other.y === entity.y)) continue;
      const dx = entity.x - other.x;
      const dy = entity.y - other.y;
      const dist = Math.hypot(dx, dy);
      const minD = entity.radius + other.radius - 4;
      if (dist < minD && dist > 0.01) {
        const push = (minD - dist) * 0.5;
        entity.x += (dx / dist) * push;
        entity.y += (dy / dist) * push;
      }
    }
  }

  private findBestTarget(
    attacker: HeroEntity,
    range: number
  ):
    | { kind: 'hero'; obj: HeroEntity; dist: number }
    | { kind: 'minion'; obj: MinionEntity; dist: number }
    | { kind: 'structure'; obj: StructureEntity; dist: number }
    | { kind: 'guardian'; obj: GuardianEntity; dist: number }
    | null {
    // Honor player's explicit click/tap locked target when in range
    if (attacker.isHuman && this.lockedTarget) {
      if (this.lockedTarget.kind === 'hero') {
        const h = this.heroes.find((item) => item.id === this.lockedTarget!.id);
        if (h && !h.isDead) {
          const d = Phaser.Math.Distance.Between(attacker.x, attacker.y, h.x, h.y);
          if (d <= range + h.radius) return { kind: 'hero', obj: h, dist: d };
          if (d > range + 340) this.lockedTarget = null;
        } else {
          this.lockedTarget = null;
        }
      } else if (this.lockedTarget.kind === 'guardian') {
        const g = this.guardians.find((item) => item.id === this.lockedTarget!.id);
        if (g && g.alive) {
          const d = Phaser.Math.Distance.Between(attacker.x, attacker.y, g.x, g.y);
          if (d <= range + g.radius) return { kind: 'guardian', obj: g, dist: d };
          if (d > range + 340) this.lockedTarget = null;
        } else {
          this.lockedTarget = null;
        }
      } else if (this.lockedTarget.kind === 'structure') {
        const s = this.structures.find((item) => item.id === this.lockedTarget!.id);
        if (s && !s.destroyed) {
          const d = Phaser.Math.Distance.Between(attacker.x, attacker.y, s.x, s.y);
          if (d <= range + s.radius) return { kind: 'structure', obj: s, dist: d };
          if (d > range + 340) this.lockedTarget = null;
        } else {
          this.lockedTarget = null;
        }
      }
    }

    let bestHero: { kind: 'hero'; obj: HeroEntity; dist: number } | null = null;
    for (const h of this.heroes) {
      if (h.isDead || h.team === attacker.team) continue;
      const d = Phaser.Math.Distance.Between(attacker.x, attacker.y, h.x, h.y);
      if (d <= range + h.radius && (!bestHero || d < bestHero.dist)) {
        bestHero = { kind: 'hero', obj: h, dist: d };
      }
    }
    if (bestHero) return bestHero;

    let bestMinion: { kind: 'minion'; obj: MinionEntity; dist: number } | null = null;
    for (const m of this.minions) {
      if (!m.active || m.team === attacker.team) continue;
      const d = Phaser.Math.Distance.Between(attacker.x, attacker.y, m.x, m.y);
      if (d <= range + m.radius && (!bestMinion || d < bestMinion.dist)) {
        bestMinion = { kind: 'minion', obj: m, dist: d };
      }
    }
    if (bestMinion) return bestMinion;

    let bestGuardian: { kind: 'guardian'; obj: GuardianEntity; dist: number } | null = null;
    for (const g of this.guardians) {
      if (!g.alive) continue;
      const d = Phaser.Math.Distance.Between(attacker.x, attacker.y, g.x, g.y);
      if (d <= range + g.radius && (!bestGuardian || d < bestGuardian.dist)) {
        bestGuardian = { kind: 'guardian', obj: g, dist: d };
      }
    }
    if (bestGuardian) return bestGuardian;

    let bestStruct: { kind: 'structure'; obj: StructureEntity; dist: number } | null = null;
    for (const s of this.structures) {
      if (s.destroyed || s.team === attacker.team) continue;
      const d = Phaser.Math.Distance.Between(attacker.x, attacker.y, s.x, s.y);
      if (d <= range + s.radius && (!bestStruct || d < bestStruct.dist)) {
        bestStruct = { kind: 'structure', obj: s, dist: d };
      }
    }
    return bestStruct;
  }

  private performBasicAttack(hero: HeroEntity): void {
    if (hero.attackCooldown > 0 || hero.isDead) return;
    const asMult = hero.asBuffTimer > 0 ? 1.35 : 1;
    hero.attackCooldown = hero.attackInterval / asMult;

    const target = this.findBestTarget(hero, hero.attackRange + 24);
    if (target) {
      hero.facing = Phaser.Math.Angle.Between(hero.x, hero.y, target.obj.x, target.obj.y);
    }

    const dmg = hero.ad * (hero.guardianBuffTimer > 0 ? 1.15 : 1);
    if (hero.isHuman) soundEngine.playAttack(hero.heroDef.stats.isRanged);

    // Quick squash-and-stretch punch on sprite
    this.tweens.add({
      targets: hero.sprite,
      scaleX: 1.16,
      scaleY: 0.88,
      duration: 75,
      yoyo: true,
    });

    if (hero.heroDef.stats.isRanged) {
      const tex =
        hero.heroDef.id === 'faris'
          ? 'proj_arrow'
          : hero.heroDef.id === 'hakim'
          ? 'proj_orb_teal'
          : hero.heroDef.id === 'aina'
          ? 'proj_orb_blue'
          : 'proj_orb_gold';
      this.spawnProjectile({
        team: hero.team,
        ownerHeroId: hero.id,
        x: hero.x + Math.cos(hero.facing) * 20,
        y: hero.y + Math.sin(hero.facing) * 20,
        angle: hero.facing,
        speed: 560,
        damage: dmg,
        isMagic:
          hero.heroDef.id === 'hakim' ||
          hero.heroDef.id === 'zahra' ||
          hero.heroDef.id === 'aina',
        piercing: false,
        aoeRadius: 0,
        life: 0.65,
        tex,
      });
    } else {
      // Melee arc slash effect + direct hit
      this.spawnSlashArc(hero.x, hero.y, hero.facing, hero.attackRange + 15, hero.heroDef.accentHex);
      if (target) {
        if (target.kind === 'hero') this.damageHero(target.obj, dmg, false, hero);
        else if (target.kind === 'minion') this.damageMinion(target.obj, dmg, hero);
        else if (target.kind === 'structure') this.damageStructure(target.obj, dmg, hero);
        else if (target.kind === 'guardian') this.damageGuardian(target.obj, dmg, hero);
      }
    }
  }

  private castSkill(hero: HeroEntity, idx: 0 | 1 | 2 | 3): void {
    if (hero.isDead) return;
    if (hero.skillCooldowns[idx] > 0) return;
    const skill = hero.heroDef.skills[idx];
    if (hero.mana < skill.manaCost) {
      if (hero.isHuman) this.spawnFloatingText(hero.x, hero.y - 46, 'Mana Tidak Cukup!', '#93c5fd');
      return;
    }

    hero.mana -= skill.manaCost;
    hero.skillCooldowns[idx] = skill.cooldown * (1 - hero.cdrPct);
    hero.recallTimer = 0;

    if (hero.isHuman) {
      soundEngine.playSkill(idx === 3);
      if (idx === 3) {
        this.cameras.main.shake(140, 0.004);
      }
    }

    // Face nearest enemy if one is in skill range
    const nearest = this.findBestTarget(hero, skill.range);
    if (nearest) {
      hero.facing = Phaser.Math.Angle.Between(hero.x, hero.y, nearest.obj.x, nearest.obj.y);
    }

    const hid = hero.heroDef.id;
    const lvlScale = 1 + (hero.level - 1) * 0.1;

    // Implement each of the 5 heroes' 4 unique skills
    if (hid === 'amin') {
      if (idx === 0) {
        // Shield Bash
        const hx = hero.x + Math.cos(hero.facing) * 65;
        const hy = hero.y + Math.sin(hero.facing) * 65;
        this.spawnRingPulse(hx, hy, 110, 0xfbbf24, 0.45);
        this.damageEnemiesInRadius(hero, hx, hy, 110, (95 + hero.ad * 0.8) * lvlScale, false, 0.45, 2.0);
      } else if (idx === 1) {
        // Protective Barrier
        hero.shield = 210 + hero.level * 30;
        hero.shieldTimer = 4.2;
        hero.speedBuffAmount = 0.2;
        hero.speedBuffTimer = 2.5;
        this.spawnRingPulse(hero.x, hero.y, 70, 0x34d399, 0.5);
        if (hero.isHuman) soundEngine.playHeal();
      } else if (idx === 2) {
        // Guardian Charge
        const dashX = hero.x + Math.cos(hero.facing) * 165;
        const dashY = hero.y + Math.sin(hero.facing) * 165;
        hero.x = dashX;
        hero.y = dashY;
        this.resolveCollisions(hero);
        this.spawnRingPulse(hero.x, hero.y, 125, 0x10b981, 0.45);
        this.damageEnemiesInRadius(hero, hero.x, hero.y, 125, (115 + hero.ad * 0.9) * lvlScale, false, 0.3, 1.5);
      } else {
        // Fortress of Light (Ultimate)
        this.spawnRingPulse(hero.x, hero.y, 240, 0xfbbf24, 0.6);
        for (const ally of this.heroes) {
          if (!ally.isDead && ally.team === hero.team && Phaser.Math.Distance.Between(hero.x, hero.y, ally.x, ally.y) <= 240) {
            ally.shield = Math.max(ally.shield, 280 + hero.level * 40);
            ally.shieldTimer = 5.0;
          }
        }
        this.damageEnemiesInRadius(hero, hero.x, hero.y, 240, (165 + hero.ad * 1.1) * lvlScale, true, 0.45, 2.5);
      }
    } else if (hid === 'faris') {
      if (idx === 0) {
        // Energy Arrow (Piercing)
        this.spawnProjectile({
          team: hero.team,
          ownerHeroId: hero.id,
          x: hero.x,
          y: hero.y,
          angle: hero.facing,
          speed: 740,
          damage: (125 + hero.ad * 1.25) * lvlScale,
          isMagic: false,
          piercing: true,
          aoeRadius: 0,
          life: 0.7,
          tex: 'proj_arrow',
        });
      } else if (idx === 1) {
        // Rapid Shot (3-arrow spread + AS buff)
        hero.asBuffTimer = 3.5;
        for (const offset of [-0.22, 0, 0.22]) {
          this.spawnProjectile({
            team: hero.team,
            ownerHeroId: hero.id,
            x: hero.x,
            y: hero.y,
            angle: hero.facing + offset,
            speed: 620,
            damage: (68 + hero.ad * 0.75) * lvlScale,
            isMagic: false,
            piercing: false,
            aoeRadius: 0,
            life: 0.58,
            tex: 'proj_arrow',
          });
        }
      } else if (idx === 2) {
        // Wind Step
        hero.x += Math.cos(hero.facing) * 145;
        hero.y += Math.sin(hero.facing) * 145;
        this.resolveCollisions(hero);
        hero.speedBuffAmount = 0.35;
        hero.speedBuffTimer = 2.6;
        this.spawnLightBurst(hero.x, hero.y, 0xfbbf24, 10);
      } else {
        // Rain of Light (Ultimate)
        const tx = nearest ? nearest.obj.x : hero.x + Math.cos(hero.facing) * 230;
        const ty = nearest ? nearest.obj.y : hero.y + Math.sin(hero.facing) * 230;
        this.spawnAoEZone(hero, 'rain', tx, ty, 155, 2.5, 0.5, (68 + hero.ad * 0.6) * lvlScale, 0xf59e0b);
      }
    } else if (hid === 'hakim') {
      if (idx === 0) {
        // Light Orb (Explosive AoE)
        this.spawnProjectile({
          team: hero.team,
          ownerHeroId: hero.id,
          x: hero.x,
          y: hero.y,
          angle: hero.facing,
          speed: 520,
          damage: (115 + hero.magic * 1.15) * lvlScale,
          isMagic: true,
          piercing: false,
          aoeRadius: 95,
          life: 0.75,
          tex: 'proj_orb_teal',
        });
      } else if (idx === 1) {
        // Energy Circle
        const tx = nearest ? nearest.obj.x : hero.x + Math.cos(hero.facing) * 185;
        const ty = nearest ? nearest.obj.y : hero.y + Math.sin(hero.facing) * 185;
        this.spawnAoEZone(hero, 'damage_slow', tx, ty, 130, 3.0, 0.6, (50 + hero.magic * 0.55) * lvlScale, 0x14b8a6);
      } else if (idx === 2) {
        // Crystal Pulse (Knockback)
        this.spawnRingPulse(hero.x, hero.y, 175, 0x2dd4bf, 0.5);
        this.damageEnemiesInRadius(hero, hero.x, hero.y, 175, (95 + hero.magic * 0.85) * lvlScale, true, 0.35, 1.5, true);
      } else {
        // Radiant Storm (Ultimate)
        const tx = nearest ? nearest.obj.x : hero.x + Math.cos(hero.facing) * 200;
        const ty = nearest ? nearest.obj.y : hero.y + Math.sin(hero.facing) * 200;
        this.spawnAoEZone(hero, 'storm', tx, ty, 185, 3.2, 0.55, (82 + hero.magic * 0.78) * lvlScale, 0xfbbf24);
      }
    } else if (hid === 'zahra') {
      if (idx === 0) {
        // Healing Aura
        this.spawnRingPulse(hero.x, hero.y, 220, 0x34d399, 0.5);
        if (hero.isHuman) soundEngine.playHeal();
        const healAmt = Math.round((135 + hero.magic * 1.1) * lvlScale);
        for (const ally of this.heroes) {
          if (!ally.isDead && ally.team === hero.team && Phaser.Math.Distance.Between(hero.x, hero.y, ally.x, ally.y) <= 230) {
            this.healHero(ally, healAmt);
          }
        }
      } else if (idx === 1) {
        // Team Shield
        this.spawnRingPulse(hero.x, hero.y, 210, 0xfdfbf7, 0.5);
        for (const ally of this.heroes) {
          if (!ally.isDead && ally.team === hero.team && Phaser.Math.Distance.Between(hero.x, hero.y, ally.x, ally.y) <= 220) {
            ally.shield = Math.max(ally.shield, 180 + hero.magic * 0.9);
            ally.shieldTimer = 4.0;
          }
        }
        this.damageEnemiesInRadius(hero, hero.x, hero.y, 210, (80 + hero.magic * 0.65) * lvlScale, true);
      } else if (idx === 2) {
        // Speed Blessing
        this.spawnRingPulse(hero.x, hero.y, 240, 0x6ee7b7, 0.45);
        for (const ally of this.heroes) {
          if (!ally.isDead && ally.team === hero.team && Phaser.Math.Distance.Between(hero.x, hero.y, ally.x, ally.y) <= 250) {
            ally.speedBuffAmount = 0.35;
            ally.speedBuffTimer = 4.0;
            ally.asBuffTimer = 4.0;
          }
        }
      } else {
        // Garden of Renewal (Ultimate)
        this.spawnAoEZone(hero, 'heal_slow', hero.x, hero.y, 235, 4.0, 0.55, (72 + hero.magic * 0.6) * lvlScale, 0x10b981);
        if (hero.isHuman) soundEngine.playHeal();
      }
    } else if (hid === 'zaid') {
      if (idx === 0) {
        // Wind Slash
        this.spawnProjectile({
          team: hero.team,
          ownerHeroId: hero.id,
          x: hero.x,
          y: hero.y,
          angle: hero.facing,
          speed: 580,
          damage: (110 + hero.ad * 1.1) * lvlScale,
          isMagic: false,
          piercing: true,
          aoeRadius: 0,
          life: 0.48,
          tex: 'proj_orb_blue',
        });
      } else if (idx === 1) {
        // Quick Dash
        hero.x += Math.cos(hero.facing) * 180;
        hero.y += Math.sin(hero.facing) * 180;
        this.resolveCollisions(hero);
        this.spawnSlashArc(hero.x, hero.y, hero.facing, 110, 0x38bdf8);
        this.damageEnemiesInRadius(hero, hero.x, hero.y, 110, (95 + hero.ad * 0.95) * lvlScale, false);
      } else if (idx === 2) {
        // Spinning Strike
        this.spawnRingPulse(hero.x, hero.y, 150, 0x38bdf8, 0.45);
        this.damageEnemiesInRadius(hero, hero.x, hero.y, 150, (120 + hero.ad * 1.05) * lvlScale, false);
      } else {
        // Desert Cyclone (Ultimate)
        hero.cycloneTimer = 3.2;
        hero.cycloneTick = 0;
        hero.speedBuffAmount = 0.25;
        hero.speedBuffTimer = 3.2;
      }
    } else if (hid === 'mumtaz') {
      if (idx === 0) {
        // Sabetan Mahkota (Royal Crown Slash)
        const sx = hero.x + Math.cos(hero.facing) * 62;
        const sy = hero.y + Math.sin(hero.facing) * 62;
        this.spawnSlashArc(hero.x, hero.y, hero.facing, 130, 0xfbbf24);
        this.spawnRingPulse(sx, sy, 115, 0x6366f1, 0.42);
        this.damageEnemiesInRadius(hero, sx, sy, 115, (108 + hero.ad * 1.05) * lvlScale, false, 0.35, 1.8);
      } else if (idx === 1) {
        // Perisai Kehormatan (Shield + Attack Speed)
        hero.shield = Math.max(hero.shield, 220 + hero.level * 28);
        hero.shieldTimer = 3.8;
        hero.asBuffTimer = 3.5;
        this.spawnRingPulse(hero.x, hero.y, 85, 0xfbbf24, 0.5);
        if (hero.isHuman) soundEngine.playHeal();
      } else if (idx === 2) {
        // Lompatan Keadilan (Justice Leap Dash + Impact)
        hero.x += Math.cos(hero.facing) * 175;
        hero.y += Math.sin(hero.facing) * 175;
        this.resolveCollisions(hero);
        this.spawnRingPulse(hero.x, hero.y, 135, 0x818cf8, 0.45);
        this.damageEnemiesInRadius(hero, hero.x, hero.y, 135, (115 + hero.ad * 0.95) * lvlScale, false, 0.3, 1.4);
      } else {
        // Titah Cahaya Agung (Ultimate: AoE radiant pillars + ally shield)
        this.spawnRingPulse(hero.x, hero.y, 235, 0xfbbf24, 0.62);
        this.spawnLightBurst(hero.x, hero.y, 0x818cf8, 18);
        for (const ally of this.heroes) {
          if (!ally.isDead && ally.team === hero.team && Phaser.Math.Distance.Between(hero.x, hero.y, ally.x, ally.y) <= 235) {
            ally.shield = Math.max(ally.shield, 230 + hero.level * 32);
            ally.shieldTimer = 4.5;
          }
        }
        this.damageEnemiesInRadius(hero, hero.x, hero.y, 235, (175 + hero.ad * 1.15) * lvlScale, true, 0.4, 2.2);
      }
    } else if (hid === 'aina') {
      if (idx === 0) {
        // Sinar Bintang (Starlight Explosive Orb)
        this.spawnProjectile({
          team: hero.team,
          ownerHeroId: hero.id,
          x: hero.x,
          y: hero.y,
          angle: hero.facing,
          speed: 550,
          damage: (118 + hero.magic * 1.15) * lvlScale,
          isMagic: true,
          piercing: false,
          aoeRadius: 95,
          life: 0.72,
          tex: 'proj_orb_blue',
        });
      } else if (idx === 1) {
        // Embun Kedamaian (AoE Heal + Move Speed Buff)
        this.spawnRingPulse(hero.x, hero.y, 230, 0xe879f9, 0.5);
        if (hero.isHuman) soundEngine.playHeal();
        const healAmt = Math.round((130 + hero.magic * 1.05) * lvlScale);
        for (const ally of this.heroes) {
          if (!ally.isDead && ally.team === hero.team && Phaser.Math.Distance.Between(hero.x, hero.y, ally.x, ally.y) <= 240) {
            this.healHero(ally, healAmt);
            ally.speedBuffAmount = 0.25;
            ally.speedBuffTimer = 3.0;
          }
        }
      } else if (idx === 2) {
        // Cincin Rembulan (Moonlight Ring Damage + Slow)
        const tx = nearest ? nearest.obj.x : hero.x + Math.cos(hero.facing) * 185;
        const ty = nearest ? nearest.obj.y : hero.y + Math.sin(hero.facing) * 185;
        this.spawnAoEZone(hero, 'damage_slow', tx, ty, 135, 3.0, 0.6, (54 + hero.magic * 0.58) * lvlScale, 0xa855f7);
      } else {
        // Simfoni Fajar (Ultimate: Dawn Star Garden Heal + Enemy Damage/Slow)
        const tx = nearest ? nearest.obj.x : hero.x + Math.cos(hero.facing) * 140;
        const ty = nearest ? nearest.obj.y : hero.y + Math.sin(hero.facing) * 140;
        this.spawnAoEZone(hero, 'heal_slow', tx, ty, 220, 4.0, 0.55, (72 + hero.magic * 0.62) * lvlScale, 0xe879f9);
        if (hero.isHuman) soundEngine.playHeal();
      }
    }
  }

  private damageEnemiesInRadius(
    attacker: HeroEntity,
    cx: number,
    cy: number,
    radius: number,
    rawDmg: number,
    isMagic: boolean,
    slowAmount = 0,
    slowDur = 0,
    knockback = false
  ): void {
    for (const h of this.heroes) {
      if (h.isDead || h.team === attacker.team) continue;
      if (Phaser.Math.Distance.Between(cx, cy, h.x, h.y) <= radius + h.radius) {
        this.damageHero(h, rawDmg, isMagic, attacker);
        if (slowAmount > 0) {
          h.slowAmount = slowAmount;
          h.slowTimer = slowDur;
        }
        if (knockback) {
          const ang = Phaser.Math.Angle.Between(cx, cy, h.x, h.y);
          h.x += Math.cos(ang) * 55;
          h.y += Math.sin(ang) * 55;
          this.resolveCollisions(h);
        }
      }
    }
    for (const m of this.minions) {
      if (!m.active || m.team === attacker.team) continue;
      if (Phaser.Math.Distance.Between(cx, cy, m.x, m.y) <= radius + m.radius) {
        this.damageMinion(m, rawDmg, attacker);
      }
    }
    for (const g of this.guardians) {
      if (!g.alive) continue;
      if (Phaser.Math.Distance.Between(cx, cy, g.x, g.y) <= radius + g.radius) {
        this.damageGuardian(g, rawDmg, attacker);
      }
    }
  }

  private updateMinions(dt: number): void {
    for (const m of this.minions) {
      if (!m.active) continue;
      if (m.attackCooldown > 0) m.attackCooldown -= dt;

      // Find nearest enemy target in aggro range
      let targetPos: Vec2 | null = null;
      let targetKind: 'minion' | 'hero' | 'structure' | null = null;
      let targetObj: MinionEntity | HeroEntity | StructureEntity | null = null;
      let minDist = 260;

      for (const other of this.minions) {
        if (!other.active || other.team === m.team) continue;
        const d = Phaser.Math.Distance.Between(m.x, m.y, other.x, other.y);
        if (d < minDist) {
          minDist = d;
          targetPos = other;
          targetKind = 'minion';
          targetObj = other;
        }
      }

      if (!targetObj) {
        for (const s of this.structures) {
          if (s.destroyed || s.team === m.team) continue;
          const d = Phaser.Math.Distance.Between(m.x, m.y, s.x, s.y) - s.radius;
          if (d < 250) {
            minDist = d;
            targetPos = s;
            targetKind = 'structure';
            targetObj = s;
            break;
          }
        }
      }

      if (!targetObj) {
        for (const h of this.heroes) {
          if (h.isDead || h.team === m.team) continue;
          const d = Phaser.Math.Distance.Between(m.x, m.y, h.x, h.y);
          if (d < 210) {
            minDist = d;
            targetPos = h;
            targetKind = 'hero';
            targetObj = h;
            break;
          }
        }
      }

      if (targetObj && targetPos) {
        const effectiveDist =
          targetKind === 'structure'
            ? Phaser.Math.Distance.Between(m.x, m.y, targetPos.x, targetPos.y) - (targetObj as StructureEntity).radius
            : Phaser.Math.Distance.Between(m.x, m.y, targetPos.x, targetPos.y);

        if (effectiveDist <= m.attackRange) {
          if (m.attackCooldown <= 0) {
            m.attackCooldown = m.attackInterval;
            const ang = Phaser.Math.Angle.Between(m.x, m.y, targetPos.x, targetPos.y);
            m.sprite.setRotation(ang);
            if (m.isRanged) {
              this.spawnProjectile({
                team: m.team,
                ownerHeroId: null,
                x: m.x,
                y: m.y,
                angle: ang,
                speed: 380,
                damage: m.ad,
                isMagic: false,
                piercing: false,
                aoeRadius: 0,
                life: 0.65,
                tex: m.team === 'blue' ? 'proj_orb_blue' : 'proj_orb_red',
              });
            } else {
              if (targetKind === 'minion') this.damageMinion(targetObj as MinionEntity, m.ad, null);
              else if (targetKind === 'hero') this.damageHero(targetObj as HeroEntity, m.ad, false, null);
              else if (targetKind === 'structure') this.damageStructure(targetObj as StructureEntity, m.ad, null);
            }
          }
        } else {
          const ang = Phaser.Math.Angle.Between(m.x, m.y, targetPos.x, targetPos.y);
          m.x += Math.cos(ang) * m.speed * dt;
          m.y += Math.sin(ang) * m.speed * dt;
          m.sprite.setRotation(ang);
        }
      } else {
        // March along lane waypoints
        const wps = m.team === 'blue' ? LANE_WAYPOINTS_BLUE[m.lane] : LANE_WAYPOINTS_RED[m.lane];
        const wp = wps[Math.min(m.waypointIdx, wps.length - 1)];
        const dWp = Phaser.Math.Distance.Between(m.x, m.y, wp.x, wp.y);
        if (dWp < 45 && m.waypointIdx < wps.length - 1) {
          m.waypointIdx += 1;
        }
        const ang = Phaser.Math.Angle.Between(m.x, m.y, wp.x, wp.y);
        m.x += Math.cos(ang) * m.speed * dt;
        m.y += Math.sin(ang) * m.speed * dt;
        m.sprite.setRotation(ang);
      }
    }
  }

  private updateStructures(dt: number): void {
    for (const s of this.structures) {
      if (s.destroyed) continue;
      if (s.aggroTimer > 0) {
        s.aggroTimer -= dt;
        if (s.aggroTimer <= 0) s.aggroHeroId = null;
      }
      if (s.attackCooldown > 0) {
        s.attackCooldown -= dt;
        continue;
      }

      // MOBA Turret Aggro: protect allied heroes if an enemy hero attacks them inside turret range
      let target: { x: number; y: number } | null = null;
      if (s.aggroHeroId) {
        const aggroHero = this.heroes.find((h) => h.id === s.aggroHeroId);
        if (
          aggroHero &&
          !aggroHero.isDead &&
          Phaser.Math.Distance.Between(s.x, s.y, aggroHero.x, aggroHero.y) <= s.attackRange
        ) {
          target = aggroHero;
        } else {
          s.aggroHeroId = null;
        }
      }

      // Otherwise target enemy minions in range first, then nearest enemy hero
      if (!target) {
        for (const m of this.minions) {
          if (!m.active || m.team === s.team) continue;
          if (Phaser.Math.Distance.Between(s.x, s.y, m.x, m.y) <= s.attackRange) {
            target = m;
            break;
          }
        }
      }
      if (!target) {
        for (const h of this.heroes) {
          if (h.isDead || h.team === s.team) continue;
          if (Phaser.Math.Distance.Between(s.x, s.y, h.x, h.y) <= s.attackRange) {
            target = h;
            break;
          }
        }
      }

      if (target) {
        s.attackCooldown = s.kind === 'core' ? 0.95 : 1.15;
        const ang = Phaser.Math.Angle.Between(s.x, s.y, target.x, target.y);
        this.spawnProjectile({
          team: s.team,
          ownerHeroId: null,
          x: s.x,
          y: s.y,
          angle: ang,
          speed: 520,
          damage: s.ad,
          isMagic: true,
          piercing: false,
          aoeRadius: 0,
          life: 0.75,
          tex: s.team === 'blue' ? 'proj_orb_blue' : 'proj_orb_red',
        });
      }
    }
  }

  private updateGuardians(dt: number): void {
    for (const g of this.guardians) {
      if (!g.alive) {
        g.respawnTimer -= dt;
        if (g.respawnTimer <= 0) {
          g.alive = true;
          g.hp = g.maxHp;
          g.x = g.homeX;
          g.y = g.homeY;
          g.sprite.setVisible(true);
          g.hpBg.setVisible(true);
          g.hpFill.setVisible(true);
          g.label.setVisible(true);
        }
        continue;
      }

      if (g.attackCooldown > 0) g.attackCooldown -= dt;

      // Attack nearest hero within 170px if damaged or provoked
      if (g.hp < g.maxHp) {
        let targetHero: HeroEntity | null = null;
        let minD = 220;
        for (const h of this.heroes) {
          if (h.isDead) continue;
          const d = Phaser.Math.Distance.Between(g.x, g.y, h.x, h.y);
          if (d < minD) {
            minD = d;
            targetHero = h;
          }
        }
        if (targetHero && g.attackCooldown <= 0 && minD < 150) {
          g.attackCooldown = 1.25;
          this.damageHero(targetHero, g.ad, false, null);
        } else if (!targetHero && g.hp < g.maxHp) {
          g.hp = Math.min(g.maxHp, g.hp + 35 * dt);
        }
      }
    }
  }

  private spawnProjectile(opts: {
    team: Team;
    ownerHeroId: string | null;
    x: number;
    y: number;
    angle: number;
    speed: number;
    damage: number;
    isMagic: boolean;
    piercing: boolean;
    aoeRadius: number;
    life: number;
    tex: string;
  }): void {
    const p = this.projectiles.find((pr) => !pr.active);
    if (!p) return;
    p.active = true;
    p.team = opts.team;
    p.ownerHeroId = opts.ownerHeroId;
    p.x = opts.x;
    p.y = opts.y;
    p.vx = Math.cos(opts.angle) * opts.speed;
    p.vy = Math.sin(opts.angle) * opts.speed;
    p.speed = opts.speed;
    p.damage = opts.damage;
    p.isMagic = opts.isMagic;
    p.piercing = opts.piercing;
    p.aoeRadius = opts.aoeRadius;
    p.life = opts.life;
    p.hitIds.clear();

    p.sprite
      .setTexture(opts.tex)
      .setPosition(opts.x, opts.y)
      .setRotation(opts.angle)
      .setVisible(true);
  }

  private updateProjectiles(dt: number): void {
    for (const p of this.projectiles) {
      if (!p.active) continue;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      p.sprite.setPosition(p.x, p.y);

      if (p.life <= 0) {
        this.deactivateProjectile(p);
        continue;
      }

      const attacker = p.ownerHeroId
        ? this.heroes.find((h) => h.id === p.ownerHeroId) || null
        : null;

      let impacted = false;

      // Check Heroes
      for (const h of this.heroes) {
        if (h.isDead || h.team === p.team || p.hitIds.has(h.id)) continue;
        if (Phaser.Math.Distance.Between(p.x, p.y, h.x, h.y) <= h.radius + 12) {
          p.hitIds.add(h.id);
          if (p.aoeRadius > 0 && attacker) {
            this.spawnRingPulse(p.x, p.y, p.aoeRadius, 0x2dd4bf, 0.45);
            this.damageEnemiesInRadius(attacker, p.x, p.y, p.aoeRadius, p.damage, p.isMagic);
          } else {
            this.damageHero(h, p.damage, p.isMagic, attacker);
          }
          impacted = true;
          if (!p.piercing) break;
        }
      }

      // Check Minions
      if (!impacted || p.piercing) {
        for (let idx = 0; idx < this.minions.length; idx++) {
          const m = this.minions[idx];
          const mid = `m_${idx}`;
          if (!m.active || m.team === p.team || p.hitIds.has(mid)) continue;
          if (Phaser.Math.Distance.Between(p.x, p.y, m.x, m.y) <= m.radius + 11) {
            p.hitIds.add(mid);
            if (p.aoeRadius > 0 && attacker) {
              this.spawnRingPulse(p.x, p.y, p.aoeRadius, 0x2dd4bf, 0.45);
              this.damageEnemiesInRadius(attacker, p.x, p.y, p.aoeRadius, p.damage, p.isMagic);
            } else {
              this.damageMinion(m, p.damage, attacker);
            }
            impacted = true;
            if (!p.piercing) break;
          }
        }
      }

      // Check Neutral Guardians
      if (!impacted && attacker) {
        for (const g of this.guardians) {
          if (!g.alive || p.hitIds.has(g.id)) continue;
          if (Phaser.Math.Distance.Between(p.x, p.y, g.x, g.y) <= g.radius + 10) {
            p.hitIds.add(g.id);
            this.damageGuardian(g, p.damage, attacker);
            impacted = true;
            break;
          }
        }
      }

      // Check Structures
      if (!impacted) {
        for (const s of this.structures) {
          if (s.destroyed || s.team === p.team) continue;
          if (Phaser.Math.Distance.Between(p.x, p.y, s.x, s.y) <= s.radius + 10) {
            this.damageStructure(s, p.damage, attacker);
            impacted = true;
            break;
          }
        }
      }

      if (impacted && !p.piercing) {
        this.deactivateProjectile(p);
      }
    }
  }

  private deactivateProjectile(p: Projectile): void {
    p.active = false;
    p.sprite.setVisible(false);
  }

  private spawnAoEZone(
    owner: HeroEntity,
    kind: AoEZone['kind'],
    x: number,
    y: number,
    radius: number,
    duration: number,
    tickInterval: number,
    power: number,
    color: number
  ): void {
    const graphic = this.add.graphics().setDepth(4);
    graphic.fillStyle(color, 0.16);
    graphic.fillCircle(x, y, radius);
    graphic.lineStyle(3, color, 0.78);
    graphic.strokeCircle(x, y, radius);
    graphic.strokeRect(x - radius * 0.45, y - radius * 0.45, radius * 0.9, radius * 0.9);

    this.aoeZones.push({
      team: owner.team,
      ownerHeroId: owner.id,
      kind,
      x,
      y,
      radius,
      duration,
      tickInterval,
      tickTimer: 0.05,
      power,
      graphic,
    });
  }

  private updateAoEZones(dt: number): void {
    for (let i = this.aoeZones.length - 1; i >= 0; i--) {
      const z = this.aoeZones[i];
      z.duration -= dt;
      z.tickTimer -= dt;

      if (z.tickTimer <= 0) {
        z.tickTimer = z.tickInterval;
        const owner = this.heroes.find((h) => h.id === z.ownerHeroId) || null;
        if (z.kind === 'heal_slow') {
          for (const ally of this.heroes) {
            if (!ally.isDead && ally.team === z.team && Phaser.Math.Distance.Between(z.x, z.y, ally.x, ally.y) <= z.radius) {
              this.healHero(ally, z.power);
            }
          }
          if (owner) {
            this.damageEnemiesInRadius(owner, z.x, z.y, z.radius, z.power * 0.45, true, 0.35, 0.8);
          }
        } else if (owner) {
          this.damageEnemiesInRadius(
            owner,
            z.x,
            z.y,
            z.radius,
            z.power,
            z.kind !== 'rain',
            z.kind === 'damage_slow' ? 0.35 : 0.2,
            0.8
          );
        }
      }

      if (z.duration <= 0) {
        z.graphic.destroy();
        this.aoeZones.splice(i, 1);
      }
    }
  }

  private damageHero(
    target: HeroEntity,
    rawDmg: number,
    isMagic: boolean,
    attacker: HeroEntity | null
  ): void {
    if (target.isDead || this.matchEnded) return;
    target.recallTimer = 0; // taking damage interrupts recall

    const mitigation = 100 / (100 + target.defense * (isMagic ? 0.75 : 1));
    let finalDmg = Math.max(8, Math.round(rawDmg * mitigation));

    if (target.shield > 0) {
      const absorbed = Math.min(target.shield, finalDmg);
      target.shield -= absorbed;
      finalDmg -= absorbed;
    }

    target.hp -= finalDmg;
    if (attacker) {
      target.lastDamagedByHeroId = attacker.id;
      target.lastDamagedTime = this.matchTimeSec;

      // Trigger allied turret protection aggro if attacker is within turret range
      for (const s of this.structures) {
        if (
          !s.destroyed &&
          s.team === target.team &&
          Phaser.Math.Distance.Between(s.x, s.y, attacker.x, attacker.y) <= s.attackRange
        ) {
          s.aggroHeroId = attacker.id;
          s.aggroTimer = 3.5;
        }
      }
    }

    if (target.isHuman || attacker?.isHuman) {
      this.spawnFloatingText(target.x, target.y - 36, `-${finalDmg}`, isMagic ? '#5eead4' : '#fca5a5');
      if (attacker?.isHuman) soundEngine.playHit();
    }

    if (target.hp <= 0) {
      target.hp = 0;
      this.handleHeroDefeat(target, attacker);
    }
  }

  private handleHeroDefeat(victim: HeroEntity, killer: HeroEntity | null): void {
    victim.isDead = true;
    victim.deaths += 1;
    victim.respawnTimer = Math.min(20, 6 + victim.level * 1.4);
    victim.sprite.setVisible(false);
    victim.teamRing.setVisible(false);
    victim.shieldRing.setVisible(false);
    victim.guardianRing.setVisible(false);
    victim.hpBarBg.setVisible(false);
    victim.hpBarFill.setVisible(false);
    victim.manaBarFill.setVisible(false);
    victim.nameText.setVisible(false);
    victim.bubbleBg.setVisible(false);
    victim.bubbleText.setVisible(false);
    victim.bubbleTimer = 0;

    // Dissolve into peaceful light particles (zero violence/blood)
    this.spawnLightBurst(victim.x, victim.y, victim.team === 'blue' ? 0x38bdf8 : 0xfbbf24, 18);

    if (victim.team === 'blue') this.redKills += 1;
    else this.blueKills += 1;

    let effectiveKiller = killer;
    if (!effectiveKiller && victim.lastDamagedByHeroId && this.matchTimeSec - victim.lastDamagedTime < 8) {
      effectiveKiller = this.heroes.find((h) => h.id === victim.lastDamagedByHeroId) || null;
    }

    if (effectiveKiller) {
      effectiveKiller.kills += 1;
      effectiveKiller.gold += 200;
      this.grantHeroXp(effectiveKiller, 110);
      if (effectiveKiller.isHuman) {
        this.hitstopTimer = 0.04;
        this.cameras.main.shake(120, 0.004);
      }
      this.pushNotice(
        `${effectiveKiller.name} mengalahkan ${victim.name}!`,
        effectiveKiller.team === 'blue' ? 'blue' : 'red'
      );
      if (effectiveKiller.team === 'blue') {
        const cheerBot = this.heroes.find((h) => !h.isHuman && h.team === 'blue' && !h.isDead && h.id !== effectiveKiller.id);
        if (cheerBot) {
          this.time.delayedCall(600, () => {
            if (!this.matchEnded) this.triggerHeroQuickChat(cheerBot, 'bagus', false);
          });
        }
      } else if (victim.isHuman) {
        const comfortBot = this.heroes.find((h) => !h.isHuman && h.team === 'blue' && !h.isDead);
        if (comfortBot) {
          this.time.delayedCall(700, () => {
            if (!this.matchEnded) this.triggerHeroQuickChat(comfortBot, 'sabar', false);
          });
        }
      }
    } else {
      this.pushNotice(`${victim.name} kembali ke Cahaya.`, 'gold');
    }

    // Grant assists to nearby allies of killer
    for (const ally of this.heroes) {
      if (
        !ally.isDead &&
        ally.team !== victim.team &&
        ally.id !== effectiveKiller?.id &&
        Phaser.Math.Distance.Between(ally.x, ally.y, victim.x, victim.y) < 420
      ) {
        ally.assists += 1;
        ally.gold += 85;
        this.grantHeroXp(ally, 55);
      }
    }
  }

  private respawnHero(hero: HeroEntity): void {
    const f = hero.team === 'blue' ? BLUE_FOUNTAIN : RED_FOUNTAIN;
    hero.isDead = false;
    hero.x = f.x + (hero.team === 'blue' ? 50 : -50);
    hero.y = f.y + (hero.team === 'blue' ? -50 : 50);
    hero.hp = hero.maxHp;
    hero.mana = hero.maxMana;
    hero.shield = 0;
    hero.waypointIdx = 0;

    hero.sprite.setVisible(true);
    hero.teamRing.setVisible(true);
    hero.hpBarBg.setVisible(true);
    hero.hpBarFill.setVisible(true);
    hero.manaBarFill.setVisible(true);
    hero.nameText.setVisible(true);

    this.spawnLightBurst(hero.x, hero.y, 0x6ee7b7, 14);
  }

  private damageMinion(m: MinionEntity, rawDmg: number, attacker: HeroEntity | null): void {
    if (!m.active) return;
    const dmg = Math.max(5, Math.round(rawDmg * (100 / (100 + m.defense))));
    m.hp -= dmg;
    if (attacker?.isHuman) {
      this.spawnFloatingText(m.x, m.y - 24, `-${dmg}`, '#e2e8f0');
    }
    if (m.hp <= 0) {
      m.active = false;
      m.sprite.setVisible(false);
      m.hpBg.setVisible(false);
      m.hpFill.setVisible(false);
      this.spawnLightBurst(m.x, m.y, m.team === 'blue' ? 0x38bdf8 : 0xf87171, 6);

      if (attacker) {
        attacker.gold += 38;
        this.grantHeroXp(attacker, 40);
      } else {
        // Share nearby hero XP
        for (const h of this.heroes) {
          if (!h.isDead && h.team !== m.team && Phaser.Math.Distance.Between(h.x, h.y, m.x, m.y) < 350) {
            this.grantHeroXp(h, 24);
            h.gold += 14;
          }
        }
      }
    }
  }

  private damageGuardian(g: GuardianEntity, rawDmg: number, attacker: HeroEntity): void {
    if (!g.alive) return;
    const dmg = Math.max(8, Math.round(rawDmg * 0.85));
    g.hp -= dmg;
    if (attacker.isHuman) {
      this.spawnFloatingText(g.x, g.y - 36, `-${dmg}`, '#fde68a');
    }
    if (g.hp <= 0) {
      g.alive = false;
      g.respawnTimer = GUARDIAN_RESPAWN_TIME;
      g.sprite.setVisible(false);
      g.hpBg.setVisible(false);
      g.hpFill.setVisible(false);
      g.label.setVisible(false);
      this.spawnLightBurst(g.x, g.y, 0x10b981, 20);

      attacker.gold += g.goldReward;
      attacker.guardianBuffTimer = 25;
      this.grantHeroXp(attacker, 130);
      this.pushNotice(`${attacker.name} meraih Berkah ${g.name}!`, 'emerald');
    }
  }

  private damageStructure(s: StructureEntity, rawDmg: number, attacker: HeroEntity | null): void {
    if (s.destroyed || this.matchEnded) return;
    const dmg = Math.max(6, Math.round(rawDmg * 0.85));
    s.hp -= dmg;
    if (attacker?.isHuman) {
      this.spawnFloatingText(s.x, s.y - 48, `-${dmg}`, '#fcd34d');
      soundEngine.playHit();
    }
    if (s.hp <= 0) {
      s.hp = 0;
      s.destroyed = true;
      s.sprite.setVisible(false);
      s.rangeRing.setVisible(false);
      s.hpBg.setVisible(false);
      s.hpFill.setVisible(false);
      s.label.setVisible(false);

      this.spawnLightBurst(s.x, s.y, 0xfbbf24, 24);
      soundEngine.playTurretDestroy();
      this.cameras.main.shake(220, 0.006);

      // Team gold reward
      for (const h of this.heroes) {
        if (h.team !== s.team) {
          h.gold += 140;
          this.grantHeroXp(h, 90);
        }
      }

      this.pushNotice(`${s.name} telah dihancurkan!`, s.team === 'red' ? 'blue' : 'red');

      if (s.team === 'red' && s.kind === 'turret') {
        const allyBot = this.heroes.find((h) => !h.isHuman && h.team === 'blue' && !h.isDead);
        if (allyBot) {
          this.time.delayedCall(550, () => {
            if (!this.matchEnded) this.triggerHeroQuickChat(allyBot, 'semangat', false);
          });
        }
      }

      if (s.kind === 'core') {
        const winner: Team = s.team === 'red' ? 'blue' : 'red';
        this.finishMatch(winner);
      }
    }
  }

  private healHero(hero: HeroEntity, amount: number): void {
    if (hero.isDead) return;
    hero.hp = Math.min(hero.maxHp, hero.hp + amount);
    this.spawnFloatingText(hero.x, hero.y - 40, `+${amount}`, '#6ee7b7');
  }

  private grantHeroXp(hero: HeroEntity, amount: number): void {
    if (hero.level >= 15) return;
    hero.xp += amount;
    while (hero.xp >= hero.maxXp && hero.level < 15) {
      hero.xp -= hero.maxXp;
      hero.level += 1;
      hero.maxXp = Math.round(hero.maxXp * 1.25);

      const s = hero.heroDef.stats;
      hero.maxHp += s.hpPerLevel;
      hero.hp = Math.min(hero.maxHp, hero.hp + s.hpPerLevel);
      hero.maxMana += s.manaPerLevel;
      hero.mana = Math.min(hero.maxMana, hero.mana + s.manaPerLevel);
      hero.ad += s.adPerLevel;
      hero.defense += s.defPerLevel;

      this.spawnRingPulse(hero.x, hero.y, 85, 0xfbbf24, 0.55);
      if (hero.isHuman) {
        soundEngine.playLevelUp();
        this.spawnFloatingText(hero.x, hero.y - 58, `NAIK LEVEL ${hero.level}!`, '#fde68a');
      }
    }
  }

  private tryBuyItem(hero: HeroEntity, itemId: string): void {
    if (hero.items.length >= 6) return;
    const item = SHOP_ITEMS.find((i) => i.id === itemId);
    if (!item || hero.gold < item.cost || hero.items.includes(itemId)) return;

    hero.gold -= item.cost;
    hero.items.push(itemId);
    if (item.bonusAd) hero.ad += item.bonusAd;
    if (item.bonusMagic) hero.magic += item.bonusMagic;
    if (item.bonusHp) {
      hero.maxHp += item.bonusHp;
      hero.hp += item.bonusHp;
    }
    if (item.bonusMana) {
      hero.maxMana += item.bonusMana;
      hero.mana += item.bonusMana;
    }
    if (item.bonusDef) hero.defense += item.bonusDef;
    if (item.bonusSpeed) hero.moveSpeed += item.bonusSpeed;
    if (item.bonusAttackSpeedPct) hero.attackInterval *= 1 - item.bonusAttackSpeedPct;
    if (item.bonusCdrPct) hero.cdrPct = Math.min(0.4, hero.cdrPct + item.bonusCdrPct);

    if (hero.isHuman) {
      soundEngine.playClick();
      this.spawnFloatingText(hero.x, hero.y - 52, `Membeli ${item.name}`, '#fde68a');
    }
  }

  private finishMatch(winner: Team): void {
    if (this.matchEnded) return;
    this.matchEnded = true;

    if (winner === 'blue') soundEngine.playVictory();
    else soundEngine.playDefeat();

    const mvp = [...this.heroes].sort(
      (a, b) => b.kills * 3 + b.assists - b.deaths - (a.kills * 3 + a.assists - a.deaths)
    )[0];

    const redTurretsDestroyed = this.structures.filter(
      (s) => s.team === 'red' && s.kind === 'turret' && s.destroyed
    ).length;

    const summary: MatchResultSummary = {
      winner,
      durationSec: Math.round(this.matchTimeSec),
      blueKills: this.blueKills,
      redKills: this.redKills,
      playerKills: this.playerHero.kills,
      playerDeaths: this.playerHero.deaths,
      playerAssists: this.playerHero.assists,
      turretsDestroyedByPlayerTeam: redTurretsDestroyed,
      mvpHeroId: mvp ? mvp.heroDef.id : this.playerHero.heroDef.id,
      goldReward: winner === 'blue' ? 240 : 110,
      xpReward: winner === 'blue' ? 180 : 95,
    };

    this.emitHudSnapshot(summary);
    this.initData.onMatchEnd(summary);
  }

  private syncEntityVisuals(): void {
    for (const h of this.heroes) {
      if (h.isDead) continue;
      h.sprite.setPosition(h.x, h.y).setRotation(h.facing);
      h.teamRing.setPosition(h.x, h.y);
      h.shieldRing.setPosition(h.x, h.y).setVisible(h.shield > 0);
      h.guardianRing.setPosition(h.x, h.y).setVisible(h.guardianBuffTimer > 0);
      h.hpBarBg.setPosition(h.x, h.y - 42);
      h.hpBarFill.setPosition(h.x - 29, h.y - 43).setDisplaySize(58 * Math.max(0, h.hp / h.maxHp), 5);
      h.manaBarFill.setPosition(h.x - 29, h.y - 39).setDisplaySize(58 * Math.max(0, h.mana / h.maxMana), 2.5);
      h.nameText.setPosition(h.x, h.y - 54).setText(`${h.name} Lv.${h.level}`);
      if (h.bubbleTimer > 0) {
        h.bubbleBg.setPosition(h.x, h.y - 78);
        h.bubbleText.setPosition(h.x, h.y - 78);
      }
    }

    // Update target lock-on reticle visual
    if (this.lockedTarget) {
      let rx = 0;
      let ry = 0;
      let rad = 34;
      let valid = false;
      if (this.lockedTarget.kind === 'hero') {
        const h = this.heroes.find((item) => item.id === this.lockedTarget!.id);
        if (h && !h.isDead) {
          rx = h.x;
          ry = h.y;
          rad = h.radius + 14;
          valid = true;
        }
      } else if (this.lockedTarget.kind === 'guardian') {
        const g = this.guardians.find((item) => item.id === this.lockedTarget!.id);
        if (g && g.alive) {
          rx = g.x;
          ry = g.y;
          rad = g.radius + 14;
          valid = true;
        }
      } else if (this.lockedTarget.kind === 'structure') {
        const s = this.structures.find((item) => item.id === this.lockedTarget!.id);
        if (s && !s.destroyed) {
          rx = s.x;
          ry = s.y;
          rad = s.radius + 12;
          valid = true;
        }
      }
      if (valid) {
        this.targetReticle.setPosition(rx, ry).setRadius(rad).setVisible(true);
      } else {
        this.lockedTarget = null;
        this.targetReticle.setVisible(false);
      }
    } else {
      this.targetReticle.setVisible(false);
    }

    for (const m of this.minions) {
      if (!m.active) continue;
      m.sprite.setPosition(m.x, m.y);
      m.hpBg.setPosition(m.x, m.y - 24);
      m.hpFill.setPosition(m.x - 17, m.y - 24).setDisplaySize(34 * Math.max(0, m.hp / m.maxHp), 3);
    }

    for (const s of this.structures) {
      if (s.destroyed) continue;
      const barW = s.kind === 'core' ? 110 : 76;
      s.hpFill.setDisplaySize(barW * Math.max(0, s.hp / s.maxHp), 6);
    }

    for (const g of this.guardians) {
      if (!g.alive) continue;
      g.hpFill.setDisplaySize(72 * Math.max(0, g.hp / g.maxHp), 5);
    }
  }

  private updateFxPools(dt: number): void {
    for (const ft of this.floatingTextPool) {
      if (!ft.active) continue;
      ft.life -= dt;
      ft.text.y += ft.vy * dt;
      ft.text.setAlpha(Math.max(0, ft.life / ft.maxLife));
      if (ft.life <= 0) {
        ft.active = false;
        ft.text.setVisible(false);
      }
    }

    for (const lp of this.lightParticlePool) {
      if (!lp.active) continue;
      lp.life -= dt;
      lp.sprite.x += lp.vx * dt;
      lp.sprite.y += lp.vy * dt;
      const ratio = Math.max(0, lp.life / lp.maxLife);
      lp.sprite.setAlpha(ratio).setScale(0.4 + 0.6 * ratio);
      if (lp.life <= 0) {
        lp.active = false;
        lp.sprite.setVisible(false);
      }
    }
  }

  private spawnFloatingText(x: number, y: number, msg: string, color: string): void {
    if (this.initData.quality === 'low') return;
    const slot = this.floatingTextPool.find((ft) => !ft.active);
    if (!slot) return;
    slot.active = true;
    slot.life = 0.75;
    slot.maxLife = 0.75;
    slot.text.setText(msg).setColor(color).setPosition(x, y).setAlpha(1).setVisible(true);
  }

  private spawnRingPulse(x: number, y: number, maxR: number, color: number, durationSec: number): void {
    const circle = this.add.circle(x, y, 16, color, 0.2).setStrokeStyle(3, color, 0.9).setDepth(12);
    this.tweens.add({
      targets: circle,
      radius: maxR,
      alpha: 0,
      duration: durationSec * 1000,
      onUpdate: () => {
        circle.setStrokeStyle(3, color, circle.alpha);
      },
      onComplete: () => circle.destroy(),
    });
  }

  private spawnSlashArc(x: number, y: number, angle: number, radius: number, color: number): void {
    const g = this.add.graphics().setDepth(13);
    g.lineStyle(5, color, 0.9);
    g.beginPath();
    g.arc(x, y, radius * 0.65, angle - 0.85, angle + 0.85);
    g.strokePath();
    this.tweens.add({
      targets: g,
      alpha: 0,
      duration: 180,
      onComplete: () => g.destroy(),
    });
  }

  private spawnLightBurst(x: number, y: number, color: number, count: number): void {
    const actualCount = this.initData.quality === 'low' ? Math.ceil(count / 2) : count;
    for (let i = 0; i < actualCount; i++) {
      const slot = this.lightParticlePool.find((lp) => !lp.active);
      if (!slot) break;
      const ang = (Math.PI * 2 * i) / actualCount + Math.random() * 0.4;
      const speed = 55 + Math.random() * 85;
      slot.active = true;
      slot.life = 0.48;
      slot.maxLife = 0.48;
      slot.vx = Math.cos(ang) * speed;
      slot.vy = Math.sin(ang) * speed;
      slot.sprite
        .setPosition(x, y)
        .setTint(color)
        .setDisplaySize(14, 14)
        .setAlpha(1)
        .setVisible(true);
    }
  }

  private pushNotice(text: string, tone: CombatNotice['tone']): void {
    this.notices.unshift({ id: this.noticeCounter++, text, tone });
    if (this.notices.length > 3) this.notices.pop();
  }

  private triggerHeroQuickChat(hero: HeroEntity, chatId: QuickChatId, allowBotReply: boolean): void {
    const def = QUICK_CHAT_MAP[chatId];
    if (!def) return;

    if (hero.isHuman) {
      soundEngine.playHeal();
    }

    if (!hero.isDead) {
      const borderColor =
        def.tone === 'emerald' ? 0x34d399 : def.tone === 'blue' ? 0x38bdf8 : 0xfbbf24;
      hero.bubbleText.setText(def.label);
      const boxW = Math.max(106, hero.bubbleText.width + 20);
      hero.bubbleBg
        .setSize(boxW, 24)
        .setStrokeStyle(1.5, borderColor, 0.95)
        .setPosition(hero.x, hero.y - 78)
        .setVisible(true);
      hero.bubbleText.setPosition(hero.x, hero.y - 78).setVisible(true);
      hero.bubbleTimer = 2.8;
    }

    this.chatFeed.unshift({
      id: this.chatCounter++,
      senderName: hero.name,
      heroId: hero.heroDef.id,
      team: hero.team,
      chatId: def.id,
      label: def.label,
      valueTag: def.valueTag,
      tone: def.tone,
      ttl: 4.5,
    });
    if (this.chatFeed.length > 4) this.chatFeed.pop();

    // Allied bots occasionally respond warmly to player quick-chats
    if (allowBotReply && hero.isHuman) {
      const allies = this.heroes.filter((h) => !h.isHuman && h.team === hero.team && !h.isDead);
      if (allies.length > 0) {
        const responder = allies[Math.floor(Math.random() * allies.length)];
        const replyMap: Record<QuickChatId, QuickChatId> = {
          terima_kasih: 'semangat',
          sabar: 'bersatu',
          bagus: 'terima_kasih',
          bersatu: 'semangat',
          bantu: 'bersatu',
          semangat: 'bagus',
        };
        const replyId = replyMap[chatId];
        this.time.delayedCall(1100, () => {
          if (!this.matchEnded && !responder.isDead) {
            this.triggerHeroQuickChat(responder, replyId, false);
          }
        });
      }
    }
  }

  private emitHudSnapshot(matchResult: MatchResultSummary | null): void {
    const p = this.playerHero;
    const minimap: MinimapEntity[] = [];

    for (const s of this.structures) {
      if (s.destroyed) continue;
      minimap.push({
        x: s.x / WORLD_SIZE,
        y: s.y / WORLD_SIZE,
        team: s.team,
        kind: s.kind,
      });
    }
    for (const g of this.guardians) {
      if (!g.alive) continue;
      minimap.push({
        x: g.x / WORLD_SIZE,
        y: g.y / WORLD_SIZE,
        team: 'neutral',
        kind: 'guardian',
      });
    }
    for (const h of this.heroes) {
      if (h.isDead) continue;
      minimap.push({
        x: h.x / WORLD_SIZE,
        y: h.y / WORLD_SIZE,
        team: h.team,
        kind: h.isHuman ? 'player' : 'hero',
      });
    }

    const scoreboard: ScoreboardRow[] = this.heroes.map((h) => ({
      id: h.id,
      name: h.name,
      heroId: h.heroDef.id,
      team: h.team,
      isHuman: h.isHuman,
      level: h.level,
      kills: h.kills,
      deaths: h.deaths,
      assists: h.assists,
      gold: Math.floor(h.gold),
      items: h.items,
    }));

    const nearestTarget = this.findBestTarget(p, p.attackRange + 140);
    let targetInfo: HudSnapshot['targetInfo'] = null;
    if (nearestTarget) {
      if (nearestTarget.kind === 'hero') {
        targetInfo = {
          name: nearestTarget.obj.name,
          hp: Math.ceil(nearestTarget.obj.hp),
          maxHp: nearestTarget.obj.maxHp,
          team: nearestTarget.obj.team,
        };
      } else if (nearestTarget.kind === 'structure') {
        targetInfo = {
          name: nearestTarget.obj.name,
          hp: Math.ceil(nearestTarget.obj.hp),
          maxHp: nearestTarget.obj.maxHp,
          team: nearestTarget.obj.team,
        };
      } else if (nearestTarget.kind === 'guardian') {
        targetInfo = {
          name: nearestTarget.obj.name,
          hp: Math.ceil(nearestTarget.obj.hp),
          maxHp: nearestTarget.obj.maxHp,
          team: 'neutral',
        };
      }
    }

    const cam = this.cameras.main.worldView;
    const maxCds = p.heroDef.skills.map((sk) => sk.cooldown * (1 - p.cdrPct)) as [
      number,
      number,
      number,
      number,
    ];

    this.initData.onHudUpdate({
      heroId: p.heroDef.id,
      hp: Math.ceil(p.hp),
      maxHp: p.maxHp,
      mana: Math.floor(p.mana),
      maxMana: p.maxMana,
      shield: Math.floor(p.shield),
      level: p.level,
      xp: Math.floor(p.xp),
      maxXp: p.maxXp,
      gold: Math.floor(p.gold),
      kills: p.kills,
      deaths: p.deaths,
      assists: p.assists,
      items: [...p.items],
      isDead: p.isDead,
      respawnTimer: Math.max(0, Math.ceil(p.respawnTimer)),
      recallProgress: p.recallTimer > 0 ? Math.min(1, (3.2 - p.recallTimer) / 3.2) : 0,
      skillCooldowns: [...p.skillCooldowns] as [number, number, number, number],
      skillMaxCooldowns: maxCds,
      recoveryCooldown: p.recoveryCooldown,
      recoveryMaxCooldown: 26,
      matchTimeSec: Math.floor(this.matchTimeSec),
      blueKills: this.blueKills,
      redKills: this.redKills,
      blueTurretsLeft: this.structures.filter((s) => s.team === 'blue' && s.kind === 'turret' && !s.destroyed).length,
      redTurretsLeft: this.structures.filter((s) => s.team === 'red' && s.kind === 'turret' && !s.destroyed).length,
      minimap,
      cameraViewRect: {
        x: cam.x / WORLD_SIZE,
        y: cam.y / WORLD_SIZE,
        w: cam.width / WORLD_SIZE,
        h: cam.height / WORLD_SIZE,
      },
      scoreboard,
      notices: [...this.notices],
      chatFeed: this.chatFeed.map(({ ttl: _ttl, ...rest }) => rest),
      matchResult,
      targetInfo,
    });
  }
}
