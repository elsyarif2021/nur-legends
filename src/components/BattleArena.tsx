import React, { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { BattleScene, BattleSceneInitData } from '../game/BattleScene';
import { HEROES } from '../services/gameCatalog';
import {
  BattleInputBridge,
  GameMode,
  HeroId,
  HudSnapshot,
  MatchResultSummary,
  OnlineRoomState,
  PlayerSettings,
} from '../types/game';
import { GameHUD } from './GameHUD';

interface BattleArenaProps {
  narratorLanguage?: 'id-ID' | 'en-US';
  narratorEnabled?: boolean;
  heroId: HeroId;
  mode: GameMode;
  onlineRoom?: OnlineRoomState | null;
  onlinePlayerId?: string | null;
  settings: PlayerSettings;
  showTutorialInitially: boolean;
  onUpdateSettings: (patch: Partial<PlayerSettings>) => void;
  onDismissTutorial: () => void;
  onMatchFinished: (summary: MatchResultSummary) => void;
  onExitToLobby: () => void;
}

export const BattleArena: React.FC<BattleArenaProps> = ({
  narratorLanguage = 'id-ID',
  narratorEnabled = true,
  heroId,
  mode,
  onlineRoom = null,
  onlinePlayerId = null,
  settings,
  showTutorialInitially,
  onUpdateSettings,
  onDismissTutorial,
  onMatchFinished,
  onExitToLobby,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [matchKey, setMatchKey] = useState(0);
  const previousHud = useRef<HudSnapshot | null>(null);
  const lastSpeech = useRef(0);

  const inputBridge = useRef<BattleInputBridge>({
    moveX: 0,
    moveY: 0,
    triggerQueue: [],
    buyItemQueue: [],
    quickChatQueue: [],
    paused: false,
  });

  const heroDef = HEROES[heroId];

  const [hud, setHud] = useState<HudSnapshot>(() => ({
    heroId,
    hp: heroDef.stats.maxHp,
    maxHp: heroDef.stats.maxHp,
    mana: heroDef.stats.maxMana,
    maxMana: heroDef.stats.maxMana,
    shield: 0,
    level: 1,
    xp: 0,
    maxXp: 140,
    gold: mode === 'training' ? 900 : 350,
    kills: 0,
    deaths: 0,
    assists: 0,
    items: [],
    isDead: false,
    respawnTimer: 0,
    recallProgress: 0,
    skillCooldowns: [0, 0, 0, 0],
    skillMaxCooldowns: [
      heroDef.skills[0].cooldown,
      heroDef.skills[1].cooldown,
      heroDef.skills[2].cooldown,
      heroDef.skills[3].cooldown,
    ],
    recoveryCooldown: 0,
    recoveryMaxCooldown: 26,
    matchTimeSec: 0,
    blueKills: 0,
    redKills: 0,
    blueTurretsLeft: 6,
    redTurretsLeft: 6,
    minimap: [],
    cameraViewRect: { x: 0, y: 0.7, w: 0.3, h: 0.3 },
    scoreboard: [],
    notices: [],
    chatFeed: [],
    matchResult: null,
    targetInfo: null,
  }));

  useEffect(() => {
    const prev = previousHud.current;
    previousHud.current = hud;
    if (!narratorEnabled || settings.muted || !('speechSynthesis' in window)) return;
    let words: [string, string] | null = null;
    if (hud.matchResult && !prev?.matchResult) words = hud.matchResult.winner === (hud.matchResult.playerTeam ?? 'blue') ? ['Kemenangan!', 'Victory!'] : ['Kekalahan.', 'Defeat.'];
    else if (!prev) words = ['Selamat datang di arena!', 'Welcome to the battlefield!'];
    else if (hud.blueKills + hud.redKills > 0 && prev.blueKills + prev.redKills === 0) words = ['Eliminasi pertama!', 'First elimination!'];
    else if (hud.kills > prev.kills) words = ['Lawan berhasil dieliminasi!', 'Enemy eliminated!'];
    else if (hud.blueTurretsLeft + hud.redTurretsLeft < prev.blueTurretsLeft + prev.redTurretsLeft) words = ['Sebuah menara dihancurkan!', 'A tower has been destroyed!'];
    else if (hud.isDead && !prev.isDead) words = ['Bersiap untuk kembali ke arena.', 'Prepare to return to the battlefield.'];
    if (!words || (!hud.matchResult && Date.now() - lastSpeech.current < 2200)) return;
    lastSpeech.current = Date.now();
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(words[narratorLanguage === 'en-US' ? 1 : 0]);
    utterance.lang = narratorLanguage;
    utterance.volume = Math.min(1, Math.max(0, settings.volume));
    window.speechSynthesis.speak(utterance);
  }, [hud, narratorEnabled, narratorLanguage, settings.muted, settings.volume]);

  useEffect(() => { if (settings.muted || !narratorEnabled) window.speechSynthesis?.cancel(); }, [settings.muted, narratorEnabled]);
  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    previousHud.current = null;
    lastSpeech.current = 0;
    inputBridge.current = {
      moveX: 0,
      moveY: 0,
      triggerQueue: [],
      buyItemQueue: [],
      quickChatQueue: [],
      paused: false,
    };

    const sceneInit: BattleSceneInitData = {
      playerHeroId: heroId,
      mode,
      quality: settings.quality,
      inputBridge: inputBridge.current,
      onlineRoom,
      onlinePlayerId,
      onHudUpdate: (snapshot) => setHud(snapshot),
      onMatchEnd: (summary) => onMatchFinished(summary),
    };

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: el,
      width: el.clientWidth || window.innerWidth,
      height: el.clientHeight || window.innerHeight,
      backgroundColor: '#0b1e19',
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      fps: {
        target: settings.quality === 'low' ? 30 : 60,
        limit: settings.quality === 'low' ? 30 : 60,
        forceSetTimeOut: false,
      },
      callbacks: {
        postBoot: (bootedGame) => {
          bootedGame.scene.add('BattleScene', BattleScene, true, sceneInit);
        },
      },
    };

    const game = new Phaser.Game(config);
    gameRef.current = game;

    return () => {
      game.destroy(true);
      gameRef.current = null;
    };
    // Intentionally recreate Phaser game only when matchKey, heroId, or mode changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heroId, mode, matchKey]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#07111e] touch-none select-none">
      <div ref={containerRef} className="w-full h-full" />
      <GameHUD
        hud={hud}
        mode={mode}
        onlineRoom={onlineRoom}
        onlinePlayerId={onlinePlayerId}
        settings={settings}
        showTutorialInitially={showTutorialInitially}
        inputBridge={inputBridge}
        onUpdateSettings={onUpdateSettings}
        onDismissTutorial={onDismissTutorial}
        onExitToLobby={onExitToLobby}
        onPlayAgain={() => setMatchKey((k) => k + 1)}
      />
    </div>
  );
};
