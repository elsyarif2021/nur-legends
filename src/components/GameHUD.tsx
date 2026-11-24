import React, { useCallback, useEffect, useState } from 'react';
import {
  BookOpen,
  Gamepad2,
  MessageSquareHeart,
  Mic,
  MicOff,
  Pause,
  Play,
  RotateCcw,
  Settings,
  ShoppingBag,
  Trophy,
  Users,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { onlineClient } from '../network/OnlineRoomClient';
import { MediaSnapshot, webrtcManager } from '../network/WebRTCManager';
import { HEROES, QUICK_CHAT_MAP, QUICK_CHATS, SHOP_ITEMS } from '../services/gameCatalog';
import { soundEngine } from '../services/sound';
import {
  BattleInputBridge,
  GameMode,
  GraphicsQuality,
  HudSnapshot,
  OnlinePlayerInfo,
  OnlineRoomState,
  PlayerSettings,
  QuickChatId,
} from '../types/game';
import { HeroAvatar } from './HeroAvatar';
import { EmoteIcon, StarEmblem } from './GeometricOrnament';
import { MobileControls } from './MobileControls';
import { VoiceVideoStrip } from './VoiceVideoStrip';

interface GameHUDProps {
  hud: HudSnapshot;
  mode: GameMode;
  onlineRoom?: OnlineRoomState | null;
  onlinePlayerId?: string | null;
  settings: PlayerSettings;
  showTutorialInitially: boolean;
  inputBridge: React.MutableRefObject<BattleInputBridge>;
  onUpdateSettings: (patch: Partial<PlayerSettings>) => void;
  onDismissTutorial: () => void;
  onExitToLobby: () => void;
  onPlayAgain: () => void;
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  hud,
  mode,
  onlineRoom = null,
  onlinePlayerId = null,
  settings,
  showTutorialInitially,
  inputBridge,
  onUpdateSettings,
  onDismissTutorial,
  onExitToLobby,
  onPlayAgain,
}) => {
  const [shopOpen, setShopOpen] = useState(false);
  const [scoreboardOpen, setScoreboardOpen] = useState(false);
  const [quickChatOpen, setQuickChatOpen] = useState(false);
  const [chatCooldown, setChatCooldown] = useState(false);
  const [pauseOpen, setPauseOpen] = useState(false);
  const [virtualStickVisible, setVirtualStickVisible] = useState(true);
  const [tutorialOpen, setTutorialOpen] = useState(showTutorialInitially);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [videoCollapsed, setVideoCollapsed] = useState(false);
  const [media, setMedia] = useState<MediaSnapshot>(() => webrtcManager.getSnapshot());
  const [onlinePlayers, setOnlinePlayers] = useState<OnlinePlayerInfo[]>(
    () => onlineRoom?.players || []
  );

  useEffect(() => {
    if (mode !== 'online') return;
    webrtcManager.bindRoomSignaling();
    const unsubMedia = webrtcManager.subscribe((snap) => setMedia(snap));
    const unsubRoom = onlineClient.subscribe({
      onRoomState: (nextRoom) => {
        if (nextRoom) setOnlinePlayers(nextRoom.players);
      },
    });
    return () => {
      unsubMedia();
      unsubRoom();
    };
  }, [mode]);

  const heroDef = HEROES[hud.heroId];
  const canAffordSomething =
    hud.items.length < 6 &&
    SHOP_ITEMS.some((i) => !hud.items.includes(i.id) && hud.gold >= i.cost);

  const togglePause = (next: boolean) => {
    setPauseOpen(next);
    inputBridge.current.paused = next;
    soundEngine.playClick();
  };

  const handleSendQuickChat = useCallback(
    (chatId: QuickChatId) => {
      if (chatCooldown) return;
      inputBridge.current.quickChatQueue.push(chatId);
      setQuickChatOpen(false);
      setChatCooldown(true);
      setTimeout(() => setChatCooldown(false), 2200);
    },
    [chatCooldown, inputBridge]
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (hud.matchResult) return;
      if (e.key === 'Escape') {
        if (shopOpen) setShopOpen(false);
        else if (scoreboardOpen) setScoreboardOpen(false);
        else if (quickChatOpen) setQuickChatOpen(false);
        else {
          setPauseOpen((prev) => {
            const next = !prev;
            inputBridge.current.paused = next;
            return next;
          });
        }
      } else if (e.key.toLowerCase() === 't' && !pauseOpen && !shopOpen && !scoreboardOpen) {
        soundEngine.playClick();
        setQuickChatOpen((v) => !v);
      } else if (e.key.toLowerCase() === 'v' && !pauseOpen && !shopOpen && !scoreboardOpen) {
        soundEngine.playClick();
        setVirtualStickVisible((v) => !v);
      } else if (mode === 'online' && e.key.toLowerCase() === 'c' && !pauseOpen && !shopOpen && !scoreboardOpen) {
        void webrtcManager.toggleCamera();
      } else if (mode === 'online' && e.key.toLowerCase() === 'm' && !pauseOpen && !shopOpen && !scoreboardOpen) {
        void webrtcManager.toggleMicrophone();
      } else if (quickChatOpen && ['1', '2', '3', '4', '5', '6'].includes(e.key)) {
        const chosen = QUICK_CHATS[Number(e.key) - 1];
        if (chosen) handleSendQuickChat(chosen.id);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleSendQuickChat, hud.matchResult, inputBridge, mode, pauseOpen, quickChatOpen, scoreboardOpen, shopOpen]);

  const handleBuyItem = (itemId: string) => {
    inputBridge.current.buyItemQueue.push(itemId);
  };

  const tutorialSteps = [
    {
      title: '1. Kendali Pahlawan (HP, Laptop & PC)',
      body: 'Seret Stick Virtual di kiri bawah dengan mouse/trackpad atau sentuhan layar, atau gunakan tombol WASD / Panah keyboard untuk bergerak di 3 jalur.',
    },
    {
      title: '2. Menyerang & Gunakan Skill',
      body: 'Tekan tombol Serang (atau Spasi) untuk serangan dasar. Gunakan Q, E, R untuk Skill dan F untuk Ultimate saat energi Mana mencukupi.',
    },
    {
      title: '3. Hancurkan Menara & Inti Cahaya',
      body: 'Majulah bersama pasukan Minion Anda! Biarkan Minion menahan serangan Menara musuh, beli item di Toko Emas, dan hancurkan Inti Cahaya Merah untuk menang.',
    },
  ];

  return (
    <div className="pointer-events-none fixed inset-0 z-30 flex flex-col justify-between">
      {/* TOP BAR CLUSTER */}
      <div className="flex items-start justify-between p-2.5 sm:p-4 gap-2">
        {/* Top-Left: Live Minimap + Hero Mini Status + Quick-Chat Toast Feed */}
        <div className="flex flex-col items-start gap-2">
          <div className="pointer-events-auto flex items-start gap-2.5">
            {/* Live Minimap */}
            <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-lg bg-[#081523]/95 border-2 border-[#d4af37]/65 shadow-xl overflow-hidden shrink-0">
              {/* Minimap lanes & river vector */}
              <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full opacity-60">
                <polyline points="11,88 11,11 88,11" fill="none" stroke="#b89c6d" strokeWidth="4" />
                <polyline points="12,89 89,89 89,12" fill="none" stroke="#b89c6d" strokeWidth="4" />
                <line x1="12" y1="88" x2="88" y2="12" stroke="#b89c6d" strokeWidth="4.5" />
                <line x1="4" y1="4" x2="96" y2="96" stroke="#14b8a6" strokeWidth="4" strokeOpacity="0.8" />
              </svg>

              {/* Camera viewport frame */}
              <div
                className="absolute border border-white/40 pointer-events-none"
                style={{
                  left: `${Math.max(0, hud.cameraViewRect.x * 100)}%`,
                  top: `${Math.max(0, hud.cameraViewRect.y * 100)}%`,
                  width: `${Math.min(100, hud.cameraViewRect.w * 100)}%`,
                  height: `${Math.min(100, hud.cameraViewRect.h * 100)}%`,
                }}
              />

              {/* Minimap Entities */}
              {hud.minimap.map((ent, idx) => {
                const size =
                  ent.kind === 'core'
                    ? 'w-3 h-3'
                    : ent.kind === 'turret'
                    ? 'w-2 h-2'
                    : ent.kind === 'player'
                    ? 'w-3 h-3 ring-2 ring-white'
                    : 'w-2 h-2 rounded-full';
                const color =
                  ent.kind === 'player'
                    ? 'bg-[#fbbf24] rounded-full z-20'
                    : ent.kind === 'guardian'
                    ? 'bg-[#34d399] rotate-45'
                    : ent.team === 'blue'
                    ? 'bg-[#38bdf8] rounded-full'
                    : 'bg-[#f87171] rounded-full';

                return (
                  <div
                    key={idx}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 ${size} ${color}`}
                    style={{ left: `${ent.x * 100}%`, top: `${ent.y * 100}%` }}
                  />
                );
              })}
            </div>

            {/* Compact Player Vitals Card */}
            <div className="hidden md:flex flex-col gap-1.5 px-3 py-2 rounded-lg bg-[#081523]/92 border border-[#d4af37]/40 min-w-[215px]">
              <div className="flex items-center gap-2">
                <HeroAvatar heroId={hud.heroId} size="sm" />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-[#fdfbf7] truncate">{heroDef.name}</span>
                    <span className="text-[11px] font-mono-num text-[#fbbf24]">Lv.{hud.level}</span>
                  </div>
                  <div className="text-[11px] text-[#94a3b8] font-mono-num">
                    K/D/A {hud.kills}/{hud.deaths}/{hud.assists}
                  </div>
                </div>
              </div>

              {/* HP */}
              <div className="space-y-0.5">
                <div className="flex justify-between text-[10px] font-mono-num text-[#a7f3d0]">
                  <span>HP {hud.shield > 0 ? `(+${hud.shield})` : ''}</span>
                  <span>
                    {hud.hp}/{hud.maxHp}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-900 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-100"
                    style={{ width: `${Math.min(100, (hud.hp / hud.maxHp) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Mana */}
              <div className="space-y-0.5">
                <div className="flex justify-between text-[10px] font-mono-num text-[#93c5fd]">
                  <span>Mana</span>
                  <span>
                    {hud.mana}/{hud.maxMana}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-900 overflow-hidden">
                  <div
                    className="h-full bg-sky-400 transition-all duration-100"
                    style={{ width: `${Math.min(100, (hud.mana / hud.maxMana) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Non-blocking Team Quick-Chat Toast Feed */}
          {hud.chatFeed.length > 0 && (
            <div className="pointer-events-none flex flex-col gap-1 max-w-[210px] sm:max-w-[240px]">
              {hud.chatFeed.slice(0, 3).map((item) => {
                const chatDef = QUICK_CHAT_MAP[item.chatId];
                const toneClass =
                  item.tone === 'emerald'
                    ? 'border-emerald-400/55 text-emerald-200'
                    : item.tone === 'blue'
                    ? 'border-sky-400/55 text-sky-200'
                    : 'border-amber-400/55 text-amber-200';
                return (
                  <div
                    key={item.id}
                    className={`flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#081523]/90 border shadow-lg ${toneClass}`}
                  >
                    <EmoteIcon type={chatDef.icon} className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                    <div className="min-w-0 leading-tight">
                      <div className="text-[10px] text-slate-300 truncate">{item.senderName}</div>
                      <div className="text-[11px] sm:text-xs font-bold truncate">{item.label}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top-Center: Scoreboard Bar + Timer + Target Info + Combat Notices */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="pointer-events-auto flex items-center gap-3 px-3.5 py-1.5 rounded-lg bg-[#081523]/92 border border-[#d4af37]/45 shadow-lg">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-[#38bdf8]">Biru</span>
              <span className="font-mono-num text-base sm:text-lg font-bold text-[#38bdf8]">
                {hud.blueKills}
              </span>
            </div>
            <div className="px-2 py-0.5 rounded bg-[#0f2238] border border-[#d4af37]/30 font-mono-num text-xs sm:text-sm font-bold text-[#fdfbf7]">
              {formatTime(hud.matchTimeSec)}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono-num text-base sm:text-lg font-bold text-[#f87171]">
                {hud.redKills}
              </span>
              <span className="text-[11px] font-semibold text-[#f87171]">Merah</span>
            </div>
            <span className="hidden sm:inline text-slate-600">·</span>
            <span className="hidden sm:inline font-mono-num text-xs font-bold text-[#fbbf24]">
              {hud.gold} Emas
            </span>
          </div>

          {/* Target HP Bar */}
          {hud.targetInfo && (
            <div className="px-3 py-1 rounded bg-[#081523]/90 border border-slate-700/70 min-w-[180px]">
              <div className="flex justify-between text-[10px] font-semibold text-slate-200 mb-0.5">
                <span className="truncate max-w-[115px]">{hud.targetInfo.name}</span>
                <span className="font-mono-num">
                  {hud.targetInfo.hp}/{hud.targetInfo.maxHp}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-900 overflow-hidden">
                <div
                  className={`h-full ${
                    hud.targetInfo.team === 'red' ? 'bg-rose-500' : 'bg-amber-400'
                  }`}
                  style={{
                    width: `${Math.min(100, (hud.targetInfo.hp / hud.targetInfo.maxHp) * 100)}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Combat Notices */}
          <div className="flex flex-col items-center gap-1">
            {hud.notices.slice(0, 2).map((n) => (
              <div
                key={n.id}
                className={`px-3 py-0.5 rounded text-xs font-semibold shadow-md border ${
                  n.tone === 'blue'
                    ? 'bg-sky-950/90 border-sky-400/50 text-sky-200'
                    : n.tone === 'red'
                    ? 'bg-rose-950/90 border-rose-400/50 text-rose-200'
                    : n.tone === 'emerald'
                    ? 'bg-emerald-950/90 border-emerald-400/50 text-emerald-200'
                    : 'bg-amber-950/90 border-amber-400/50 text-amber-200'
                }`}
              >
                {n.text}
              </div>
            ))}
          </div>
        </div>

        {/* Top-Right: Camera/Mic (Online), Quick Chat, Shop, Scoreboard, Tutorial, Mute, Pause */}
        <div className="pointer-events-auto relative flex flex-col items-end gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2">
            {mode === 'online' && (
              <>
                <button
                  type="button"
                  onClick={() => void webrtcManager.toggleCamera()}
                  className={`p-2 rounded-lg border transition-colors ${
                    media.camOn
                      ? 'bg-sky-600/30 border-sky-400 text-sky-200'
                      : 'bg-[#081523]/92 border-[#d4af37]/40 text-slate-300 hover:bg-[#10233a]'
                  }`}
                  title={media.camOn ? 'Matikan Kamera (C)' : 'Nyalakan Kamera (C)'}
                  aria-label="Toggle Kamera"
                >
                  {media.camOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => void webrtcManager.toggleMicrophone()}
                  className={`p-2 rounded-lg border transition-colors ${
                    media.micOn
                      ? 'bg-emerald-600/30 border-emerald-400 text-emerald-200'
                      : 'bg-[#081523]/92 border-[#d4af37]/40 text-slate-300 hover:bg-[#10233a]'
                  }`}
                  title={media.micOn ? 'Matikan Mikrofon (M)' : 'Nyalakan Mikrofon (M)'}
                  aria-label="Toggle Mikrofon"
                >
                  {media.micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setQuickChatOpen((v) => !v);
                setShopOpen(false);
                setScoreboardOpen(false);
              }}
              className={`p-2 rounded-lg border transition-colors ${
                quickChatOpen
                  ? 'bg-emerald-600/30 border-emerald-400 text-emerald-200'
                  : 'bg-[#081523]/92 border-[#d4af37]/40 text-emerald-300 hover:bg-[#10233a]'
              }`}
              title="Pesan Cepat & Nilai Baik (T)"
              aria-label="Buka Pesan Cepat"
            >
              <MessageSquareHeart className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setShopOpen((v) => !v);
                setScoreboardOpen(false);
                setQuickChatOpen(false);
              }}
              className={`relative flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-xs font-bold transition-colors ${
                canAffordSomething
                  ? 'bg-amber-500/20 border-amber-400 text-amber-200 hover:bg-amber-500/30'
                  : 'bg-[#081523]/92 border-[#d4af37]/40 text-[#fdfbf7] hover:bg-[#10233a]'
              }`}
              title="Toko Item"
            >
              <ShoppingBag className="w-4 h-4 text-[#fbbf24]" />
              <span className="hidden sm:inline font-mono-num">{hud.gold}</span>
              {canAffordSomething && (
                <span className="w-2 h-2 rounded-full bg-amber-400" />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setScoreboardOpen((v) => !v);
                setShopOpen(false);
                setQuickChatOpen(false);
              }}
              className="p-2 rounded-lg bg-[#081523]/92 border border-[#d4af37]/40 text-slate-200 hover:bg-[#10233a]"
              title="Papan Skor"
            >
              <Users className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setVirtualStickVisible((v) => !v);
              }}
              className={`p-2 rounded-lg border transition-colors ${
                virtualStickVisible
                  ? 'bg-[#081523]/92 border-[#fbbf24]/55 text-[#fbbf24] hover:bg-[#10233a]'
                  : 'bg-[#081523]/92 border-slate-700 text-slate-400 hover:bg-[#10233a]'
              }`}
              title={virtualStickVisible ? 'Sembunyikan Stick Virtual (V)' : 'Tampilkan Stick Virtual (V)'}
              aria-label="Toggle Stick Virtual"
            >
              <Gamepad2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setTutorialStep(0);
                setTutorialOpen(true);
              }}
              className="p-2 rounded-lg bg-[#081523]/92 border border-[#d4af37]/40 text-slate-200 hover:bg-[#10233a]"
              title="Panduan Bermain"
            >
              <BookOpen className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => onUpdateSettings({ muted: !settings.muted })}
              className="p-2 rounded-lg bg-[#081523]/92 border border-[#d4af37]/40 text-slate-200 hover:bg-[#10233a]"
              title={settings.muted ? 'Bunyikan Suara' : 'Bisukan Suara'}
            >
              {settings.muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => togglePause(!pauseOpen)}
              className="p-2 rounded-lg bg-[#081523]/92 border border-[#d4af37]/40 text-slate-200 hover:bg-[#10233a]"
              title="Jeda (Esc)"
            >
              <Pause className="w-4 h-4" />
            </button>
          </div>

          {mode === 'online' && onlinePlayers.length > 0 && (
            <VoiceVideoStrip
              players={onlinePlayers}
              localPlayerId={onlinePlayerId}
              media={media}
              collapsed={videoCollapsed}
              onToggleCollapse={() => setVideoCollapsed((c) => !c)}
            />
          )}

          {/* QUICK CHAT & EMOTE POPOVER */}
          {quickChatOpen && (
            <div className="absolute right-0 top-12 w-72 sm:w-80 rounded-xl bg-[#081523]/96 border border-[#d4af37]/55 shadow-2xl p-3 z-50">
              <div className="flex items-center justify-between border-b border-[#d4af37]/20 pb-2 mb-2">
                <span className="text-xs font-bold text-[#fbbf24]">Pesan Cepat & Akhlak Baik</span>
                <span className="text-[10px] text-slate-400">
                  {chatCooldown ? 'Tunggu sebentar...' : 'Tekan 1-6'}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {QUICK_CHATS.map((qc) => (
                  <button
                    key={qc.id}
                    type="button"
                    disabled={chatCooldown}
                    onClick={() => handleSendQuickChat(qc.id)}
                    className="flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-lg bg-slate-900/80 hover:bg-[#112844] border border-slate-800 hover:border-[#d4af37]/50 text-left transition-colors disabled:opacity-50"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          qc.tone === 'emerald'
                            ? 'bg-emerald-950/80 text-emerald-300'
                            : qc.tone === 'blue'
                            ? 'bg-sky-950/80 text-sky-300'
                            : 'bg-amber-950/80 text-amber-300'
                        }`}
                      >
                        <EmoteIcon type={qc.icon} className="w-4 h-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">{qc.label}</div>
                        <div className="text-[10px] text-slate-400">{qc.valueTag}</div>
                      </div>
                    </div>
                    <span className="hidden sm:inline font-mono-num text-[10px] text-slate-400 px-1.5 py-0.5 rounded bg-slate-950">
                      {qc.hotkey}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CENTER OVERLAYS: Recall Progress / Respawn Countdown */}
      <div className="flex flex-col items-center justify-center gap-2 pointer-events-none">
        {hud.recallProgress > 0 && !hud.isDead && (
          <div className="px-4 py-2 rounded-lg bg-[#081523]/90 border border-sky-400/60 w-52">
            <div className="text-[11px] text-center font-semibold text-sky-200 mb-1">
              Kembali ke Markas...
            </div>
            <div className="h-2 rounded-full bg-slate-900 overflow-hidden">
              <div
                className="h-full bg-sky-400"
                style={{ width: `${hud.recallProgress * 100}%` }}
              />
            </div>
          </div>
        )}

        {hud.isDead && !hud.matchResult && (
          <div className="px-5 py-3 rounded-xl bg-[#081523]/92 border border-[#d4af37]/50 text-center shadow-2xl">
            <div className="text-xs text-slate-300">Pahlawan Sedang Memulihkan Cahaya</div>
            <div className="font-mono-num text-2xl font-bold text-[#fbbf24] mt-0.5">
              Bangkit dalam {hud.respawnTimer}d
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM BAR: Mobile compact vitals + desktop hint */}
      <div className="flex items-end justify-center pb-2 pointer-events-none">
        <div className="hidden lg:flex items-center gap-3 px-4 py-1.5 rounded-lg bg-[#081523]/85 border border-[#d4af37]/30 text-[11px] text-slate-300">
          <span>Stick Virtual / WASD Gerak</span>
          <span>·</span>
          <span>Spasi Serang</span>
          <span>·</span>
          <span>Q / E / R Skill</span>
          <span>·</span>
          <span>F Ultimate</span>
          <span>·</span>
          <span>B Pulang · G Pulih</span>
          <span>·</span>
          <span>T Chat · V Stick</span>
        </div>

        {/* Small screen HP/Mana bar */}
        <div className="md:hidden flex items-center gap-2 px-3 py-1 rounded-lg bg-[#081523]/90 border border-[#d4af37]/40 mb-1">
          <span className="font-mono-num text-[11px] font-bold text-[#fbbf24]">Lv.{hud.level}</span>
          <div className="w-20 h-2 rounded-full bg-slate-900 overflow-hidden">
            <div
              className="h-full bg-emerald-500"
              style={{ width: `${Math.min(100, (hud.hp / hud.maxHp) * 100)}%` }}
            />
          </div>
          <div className="w-16 h-2 rounded-full bg-slate-900 overflow-hidden">
            <div
              className="h-full bg-sky-400"
              style={{ width: `${Math.min(100, (hud.mana / hud.maxMana) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* TOUCH & PC/LAPTOP VIRTUAL STICK CONTROLS */}
      <MobileControls hud={hud} inputBridge={inputBridge} visible={virtualStickVisible && !shopOpen && !scoreboardOpen && !pauseOpen && !tutorialOpen && !hud.matchResult} />

      {/* ITEM SHOP MODAL */}
      {shopOpen && (
        <div className="pointer-events-auto fixed inset-0 z-40 bg-black/65 flex items-center justify-center p-4">
          <div className="ornate-panel w-full max-w-2xl rounded-2xl p-5 max-h-[88vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#d4af37]/25 pb-3 mb-3">
              <div>
                <h2 className="font-display text-lg font-bold text-[#fbbf24]">Toko Artefak Cahaya</h2>
                <p className="text-xs text-slate-300">
                  Emas Anda: <span className="font-mono-num font-bold text-[#fbbf24]">{hud.gold}</span> · Slot Item: {hud.items.length}/6
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShopOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white"
              >
                Tutup
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 overflow-y-auto custom-scroll pr-1">
              {SHOP_ITEMS.map((item) => {
                const owned = hud.items.includes(item.id);
                const canBuy = !owned && hud.items.length < 6 && hud.gold >= item.cost;
                return (
                  <div
                    key={item.id}
                    className={`p-3 rounded-xl border flex flex-col justify-between gap-2 ${
                      owned
                        ? 'bg-emerald-950/50 border-emerald-500/50'
                        : 'bg-slate-900/80 border-slate-700/70'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-[#fdfbf7]">{item.name}</span>
                        <span className="text-xs font-mono-num font-bold text-[#fbbf24]">
                          {item.cost} Emas
                        </span>
                      </div>
                      <div className="text-[11px] text-teal-300 mt-0.5">{item.category}</div>
                      <p className="text-xs text-slate-300 mt-1">{item.description}</p>
                    </div>
                    <button
                      type="button"
                      disabled={!canBuy}
                      onClick={() => handleBuyItem(item.id)}
                      className={`w-full py-1.5 rounded-lg text-xs font-bold transition-colors ${
                        owned
                          ? 'bg-emerald-700/40 text-emerald-200 cursor-default'
                          : canBuy
                          ? 'bg-[#d4af37] hover:bg-[#eab308] text-[#07111e]'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {owned ? 'Sudah Dimiliki' : canBuy ? 'Beli Artefak' : 'Emas Belum Cukup'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* LIVE SCOREBOARD MODAL */}
      {scoreboardOpen && (
        <div className="pointer-events-auto fixed inset-0 z-40 bg-black/65 flex items-center justify-center p-4">
          <div className="ornate-panel w-full max-w-2xl rounded-2xl p-5 max-h-[86vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#d4af37]/25 pb-3 mb-3">
              <h2 className="font-display text-lg font-bold text-[#fbbf24]">Papan Skor Pertandingan</h2>
              <button
                type="button"
                onClick={() => setScoreboardOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white"
              >
                Tutup
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-y-auto custom-scroll">
              {(['blue', 'red'] as const).map((team) => (
                <div key={team} className="space-y-2">
                  <div
                    className={`text-xs font-bold uppercase tracking-wider ${
                      team === 'blue' ? 'text-sky-400' : 'text-rose-400'
                    }`}
                  >
                    {team === 'blue' ? 'Tim Cahaya Biru' : 'Tim Penjaga Merah'}
                  </div>
                  {hud.scoreboard
                    .filter((r) => r.team === team)
                    .map((row) => (
                      <div
                        key={row.id}
                        className={`flex items-center justify-between p-2 rounded-lg border ${
                          row.isHuman
                            ? 'bg-amber-950/35 border-amber-400/50'
                            : 'bg-slate-900/75 border-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <HeroAvatar heroId={row.heroId} size="sm" />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white truncate">{row.name}</div>
                            <div className="text-[11px] text-slate-400 font-mono-num">
                              Lv.{row.level} · {row.gold} Emas
                            </div>
                          </div>
                        </div>
                        <div className="font-mono-num text-xs font-bold text-slate-200 shrink-0">
                          {row.kills}/{row.deaths}/{row.assists}
                        </div>
                      </div>
                    ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PAUSE MODAL */}
      {pauseOpen && !hud.matchResult && (
        <div className="pointer-events-auto fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="ornate-panel w-full max-w-md rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-[#fbbf24]" />
                <h2 className="font-display text-xl font-bold text-[#fbbf24]">Permainan Dijeda</h2>
              </div>
              <StarEmblem className="w-7 h-7" />
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-200">Volume Audio</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={settings.volume}
                  onChange={(e) => onUpdateSettings({ volume: parseFloat(e.target.value) })}
                  className="w-36 accent-[#d4af37]"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-200">Kualitas Grafis</span>
                <div className="flex gap-1">
                  {(['low', 'medium', 'high'] as GraphicsQuality[]).map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => onUpdateSettings({ quality: q })}
                      className={`px-2.5 py-1 rounded text-xs font-semibold ${
                        settings.quality === q
                          ? 'bg-[#d4af37] text-[#07111e]'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {q === 'low' ? 'Ringan' : q === 'medium' ? 'Sedang' : 'Tinggi'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => togglePause(false)}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4" /> Lanjutkan Pertandingan
              </button>
              <button
                type="button"
                onClick={() => {
                  togglePause(false);
                  onExitToLobby();
                }}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm"
              >
                Keluar ke Lobi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FIRST-TIME TUTORIAL OVERLAY */}
      {tutorialOpen && !hud.matchResult && (
        <div className="pointer-events-auto fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="ornate-panel w-full max-w-md rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2.5">
              <StarEmblem className="w-7 h-7" />
              <h2 className="font-display text-lg font-bold text-[#fbbf24]">
                {tutorialSteps[tutorialStep].title}
              </h2>
            </div>
            <p className="text-sm text-slate-200 leading-relaxed">
              {tutorialSteps[tutorialStep].body}
            </p>
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-400 font-mono-num">
                Langkah {tutorialStep + 1} / {tutorialSteps.length}
              </span>
              <div className="flex gap-2">
                {tutorialStep < tutorialSteps.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setTutorialStep((s) => s + 1);
                    }}
                    className="px-4 py-2 rounded-lg bg-[#d4af37] hover:bg-[#eab308] text-[#07111e] text-xs font-bold"
                  >
                    Lanjut
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setTutorialOpen(false);
                      onDismissTutorial();
                    }}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                  >
                    Siap Bertarung!
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VICTORY / DEFEAT SUMMARY MODAL */}
      {hud.matchResult && (() => {
        const playerTeam = hud.matchResult.playerTeam || 'blue';
        const playerWon = hud.matchResult.winner === playerTeam;
        return (
          <div className="pointer-events-auto fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <div className="ornate-panel w-full max-w-lg rounded-2xl p-6 text-center space-y-4">
              <div className="flex justify-center">
                <Trophy
                  className={`w-12 h-12 ${
                    playerWon ? 'text-[#fbbf24]' : 'text-slate-400'
                  }`}
                />
              </div>
              <div>
                <h2
                  className={`font-display text-2xl sm:text-3xl font-extrabold gold-glow ${
                    playerWon ? 'text-[#fbbf24]' : 'text-rose-300'
                  }`}
                >
                  {playerWon ? 'KEMENANGAN CAHAYA!' : 'PERTANDINGAN SELESAI'}
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 mt-1">
                  {playerWon
                    ? 'Kerja sama, amanah, dan kesabaran membawa tim Anda menuju kemenangan!'
                    : 'Jangan berkecil hati. Kesabaran dan evaluasi akan membawa kemenangan berikutnya.'}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2.5 text-center bg-slate-900/75 p-3 rounded-xl border border-slate-800">
                <div>
                  <div className="text-[11px] text-slate-400">Skor Tim</div>
                  <div className="font-mono-num text-base font-bold text-white">
                    {hud.matchResult.blueKills} - {hud.matchResult.redKills}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-400">K / D / A Anda</div>
                  <div className="font-mono-num text-base font-bold text-emerald-400">
                    {hud.matchResult.playerKills}/{hud.matchResult.playerDeaths}/{hud.matchResult.playerAssists}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-400">Durasi</div>
                  <div className="font-mono-num text-base font-bold text-amber-300">
                    {formatTime(hud.matchResult.durationSec)}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-4 text-xs font-semibold text-amber-200">
                <span>+{hud.matchResult.goldReward} Emas Kemajuan</span>
                <span>·</span>
                <span>+{hud.matchResult.xpReward} XP Akun</span>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onExitToLobby}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm"
                >
                  Kembali ke Lobi
                </button>
                {mode !== 'online' && (
                  <button
                    type="button"
                    onClick={onPlayAgain}
                    className="flex-1 py-2.5 rounded-xl bg-[#d4af37] hover:bg-[#eab308] text-[#07111e] font-bold text-sm flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="w-4 h-4" /> Main Lagi
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
