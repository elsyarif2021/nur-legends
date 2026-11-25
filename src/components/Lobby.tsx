import palaceBackdrop from '../assets/images/palace_lobby_bg_1795510715124.webp';
import { AdminDashboard } from './AdminDashboard';
import { authClient } from '../services/authClient';
import { BOT_DIFFICULTIES } from '../game/BotDifficulty';
import type { BotDifficulty } from '../types/game';
import { ARENA_THEMES, type ArenaId } from '../game/ArenaThemes';
import React, { useState } from 'react';
import {
  BookOpen,
  Compass,
  Globe,
  History,
  LogIn,
  LogOut,
  Maximize2,
  Minimize2,
  Settings,
  Sparkles,
  Swords,
  Trophy,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useGameCatalog } from '../services/gameCatalog';
import { soundEngine } from '../services/sound';
import { getXpForNextLevel } from '../services/storage';
import {
  AuthUser,
  GameMode,
  HeroId,
  OnlineRoomState,
  PlayerProgress,
  PlayerSettings,
} from '../types/game';
import { CornerFiligree, SkillIcon, StarEmblem } from './GeometricOrnament';
import { HeroAvatar } from './HeroAvatar';
import { GameGuide } from './GameGuide';
import {
  HeroCollectionModal,
  HistoryModal,
  LeaderboardModal,
  MissionsModal,
  QuizModal,
  SettingsModal,
} from './LobbyModals';
import { OnlineLobbyModal } from './OnlineLobbyModal';

interface LobbyProps {
  progress: PlayerProgress;
  authUser: AuthUser | null;
  initialRoomCode?: string | null;
  difficulty: BotDifficulty;
  onSelectDifficulty: (value: BotDifficulty) => void;
  arenaId: ArenaId;
  onSelectArena: (id: ArenaId) => void;
  onClaimLoginReward: () => void;
  onStartMatch: (mode: GameMode) => void;
  onStartOnlineMatch: (room: OnlineRoomState, localPlayerId: string) => void;
  onChangePlayerName: (name: string) => void;
  onSelectHero: (heroId: HeroId) => void;
  onClaimMission: (missionId: string) => void;
  onAnswerQuiz: (questionId: string, isCorrect: boolean) => void;
  onUpdateSettings: (patch: Partial<PlayerSettings>) => void;
  onResetProgress: () => void;
  onOpenAuth: () => void;
  onLogout: () => void;
  onClearInitialRoomCode?: () => void;
}

type ModalTab =
  | 'guide'
  | 'heroes'
  | 'missions'
  | 'quiz'
  | 'history'
  | 'leaderboard'
  | 'settings'
  | 'online'
  | null;


export const Lobby: React.FC<LobbyProps> = ({
  progress,
  authUser,
  initialRoomCode,
  difficulty,
  onSelectDifficulty,
  arenaId,
  onSelectArena,
  onClaimLoginReward,
  onStartMatch,
  onStartOnlineMatch,
  onChangePlayerName,
  onSelectHero,
  onClaimMission,
  onAnswerQuiz,
  onUpdateSettings,
  onResetProgress,
  onOpenAuth,
  onLogout,
  onClearInitialRoomCode,
}) => {
  const [activeModal, setActiveModal] = useState<ModalTab>(() =>
    initialRoomCode ? 'online' : null
  );
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [adminAllowed,setAdminAllowed]=useState(false);
  const [adminOpen,setAdminOpen]=useState(false);
  React.useEffect(()=>{const controller=new AbortController();setAdminAllowed(false);setAdminOpen(false);if(authUser)void authClient.getAdminOverview(controller.signal).then(d=>{if(!controller.signal.aborted)setAdminAllowed(!!d);}).catch(()=>{});return()=>controller.abort();},[authUser?.id]);

  const { heroes, heroList } = useGameCatalog();
  const selectedHero = heroes[progress.selectedHeroId] || heroList[0];
  const nextXp = getXpForNextLevel(progress.level);
  const unclaimedMissions = progress.dailyMissions.filter(
    (m) => m.progress >= m.target && !m.claimed
  ).length;

  const toggleFullscreen = async () => {
    soundEngine.playClick();
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {
      // Fullscreen may be restricted inside sandboxed iframe; ignore gracefully
    }
  };

  const openModal = (tab: ModalTab) => {
    soundEngine.unlock();
    soundEngine.playClick();
    setActiveModal(tab);
  };

  return (
    <div
      className="nur-lobby relative w-full h-full overflow-hidden flex flex-col justify-between bg-gradient-to-br from-[#0b2338] via-[#071524] to-[#050d17]"
      onPointerDown={() => soundEngine.unlock()}
    >
      {/* Palace backdrop and decorative lighting */}
      <img
        src={palaceBackdrop}
        alt=""
        referrerPolicy="no-referrer"
        className="nur-lobby-backdrop absolute inset-0 w-full h-full object-cover opacity-55"
      />
      <div className="nur-lobby-aurora" aria-hidden="true" />
      <div className="nur-lobby-geometry" aria-hidden="true" />
      <div className="nur-lobby-vignette" aria-hidden="true" />

      {/* Ornamental geometric corners */}
      <CornerFiligree className="absolute top-3 left-3 w-8 h-8 pointer-events-none opacity-80" />
      <CornerFiligree className="absolute top-3 right-3 w-8 h-8 rotate-90 pointer-events-none opacity-80" />

      {/* TOP STATUS BAR */}
      <header className="nur-lobby-header relative z-10 flex items-center justify-between gap-4 px-4 sm:px-7 py-3.5 border-b border-[#d4af37]/20">
        {/* Player Avatar, Level & XP */}
        <div className="flex items-center gap-3 min-w-0">
          <HeroAvatar heroId={progress.selectedHeroId} size="sm" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-base font-bold text-[#fdfbf7] truncate">
                {progress.playerName || 'Penjaga Cahaya'}
              </span>
              <span className="text-xs font-mono-num font-bold text-[#fbbf24]">
                Lv.{progress.level}
              </span>
              {authUser && (
                <span className="hidden md:inline text-[11px] text-emerald-300 truncate max-w-[160px]">
                  · {authUser.email}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="w-24 sm:w-32 h-1.5 rounded-full bg-slate-900 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-300"
                  style={{ width: `${Math.min(100, (progress.xp / nextXp) * 100)}%` }}
                />
              </div>
              <span className="text-[11px] font-mono-num text-slate-300">
                {progress.xp}/{nextXp} XP
              </span>
            </div>
          </div>
        </div>

        {/* Center Title Lockup */}
        <div className="hidden lg:flex items-center gap-2.5">
          <StarEmblem className="w-7 h-7" />
          <div className="text-center">
            <h1 className="font-display text-xl font-extrabold tracking-wide text-[#fbbf24] gold-glow leading-none">
              NUR LEGENDS
            </h1>
            <div className="text-[10px] tracking-[0.22em] text-teal-200 uppercase mt-0.5">
              Guardians of Light
            </div>
          </div>
          <StarEmblem className="w-7 h-7" />
        </div>

        {/* Right Utility & Gold Counter */}
        <div className="nur-lobby-actions flex items-center gap-2 sm:gap-2.5 shrink-0">
          <div className="px-3 py-1.5 rounded-lg bg-[#0b192b]/90 border border-[#d4af37]/40 text-xs sm:text-sm font-mono-num font-bold text-[#fbbf24]">
            {progress.gold} Emas
          </div>

          {adminAllowed && <button type="button" onClick={()=>setAdminOpen(true)} className="min-h-11 rounded-lg border border-amber-500/50 bg-slate-900 px-3 text-xs font-bold text-amber-200">Super Admin</button>}
          {authUser ? (
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onLogout();
              }}
              className="min-h-11 shrink-0 px-2.5 sm:px-3 py-2 rounded-lg bg-rose-950/90 border border-rose-400/70 text-rose-100 hover:bg-rose-900 active:bg-rose-800 text-xs font-bold flex items-center gap-1.5 touch-manipulation"
              aria-label="Logout — keluar dari akun"
              title={`Keluar Akun (${authUser.email})`}
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onOpenAuth();
              }}
              className="px-2.5 py-2 rounded-lg bg-emerald-600/25 border border-emerald-400/60 text-emerald-200 hover:bg-emerald-600/40 text-xs font-bold flex items-center gap-1.5"
              title="Masuk atau Buat Akun"
            >
              <LogIn className="w-4 h-4" />
              <span className="hidden sm:inline">Masuk / Akun</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onUpdateSettings({ muted: !progress.settings.muted })}
            className="p-2 rounded-lg bg-[#0b192b]/90 border border-[#d4af37]/30 text-slate-200 hover:border-[#d4af37]"
            title={progress.settings.muted ? 'Bunyikan Audio' : 'Bisukan Audio'}
          >
            {progress.settings.muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 rounded-lg bg-[#0b192b]/90 border border-[#d4af37]/30 text-slate-200 hover:border-[#d4af37]"
            title="Layar Penuh"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => openModal('settings')}
            className="p-2 rounded-lg bg-[#0b192b]/90 border border-[#d4af37]/30 text-slate-200 hover:border-[#d4af37]"
            title="Pengaturan"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* MAIN LOBBY CONTENT (16:9 Landscape Stage) */}
      <main className="nur-lobby-main relative z-10 min-h-0 flex-1 grid grid-cols-1 lg:grid-cols-12 items-start px-4 sm:px-8 py-3 gap-4 overflow-y-auto">
        {/* Left Navigation Menu */}
        <nav aria-label="Menu lobi" className="relative z-10 min-h-14 lg:col-span-3 flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0">
          <button
            type="button"
            onClick={() => openModal('guide')}
            className="flex shrink-0 items-center gap-3 whitespace-nowrap rounded-xl border border-amber-400/50 px-4 py-3 text-left"
          >
            <Compass aria-hidden="true" className="size-5 text-amber-300" />
            <span className="text-sm font-bold text-white">Panduan Game</span>
          </button>
          <button
            type="button"
            onClick={() => openModal('heroes')}
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#0b1b2e]/90 hover:bg-[#122a46] border border-[#d4af37]/35 text-left transition-colors whitespace-nowrap shrink-0"
          >
            <Users className="w-5 h-5 text-[#fbbf24]" />
            <div>
              <div className="text-sm font-bold text-white">Koleksi Pahlawan</div>
              <div className="text-[11px] text-slate-400 hidden sm:block">{heroList.length} Penjaga Cahaya</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => openModal('missions')}
            className="relative flex items-center gap-3 px-4 py-3 rounded-xl bg-[#0b1b2e]/90 hover:bg-[#122a46] border border-[#d4af37]/35 text-left transition-colors whitespace-nowrap shrink-0"
          >
            <Sparkles className="w-5 h-5 text-emerald-400" />
            <div>
              <div className="text-sm font-bold text-white">Misi Harian</div>
              <div className="text-[11px] text-slate-400 hidden sm:block">Hadiah Emas & XP</div>
            </div>
            {unclaimedMissions > 0 && (
              <span className="ml-auto font-mono-num text-xs font-bold text-[#fbbf24]">
                {unclaimedMissions} Siap
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => openModal('quiz')}
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#0b1b2e]/90 hover:bg-[#122a46] border border-[#14b8a6]/45 text-left transition-colors whitespace-nowrap shrink-0"
          >
            <BookOpen className="w-5 h-5 text-teal-300" />
            <div>
              <div className="text-sm font-bold text-white">Kuis Islami</div>
              <div className="text-[11px] text-slate-400 hidden sm:block">Akhlak & Pengetahuan</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => openModal('history')}
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#0b1b2e]/90 hover:bg-[#122a46] border border-[#d4af37]/35 text-left transition-colors whitespace-nowrap shrink-0"
          >
            <History className="w-5 h-5 text-sky-300" />
            <div>
              <div className="text-sm font-bold text-white">Riwayat Pertempuran</div>
              <div className="text-[11px] text-slate-400 hidden sm:block">
                {progress.battleHistory.length} Pertandingan
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => openModal('leaderboard')}
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#0b1b2e]/90 hover:bg-[#122a46] border border-[#d4af37]/35 text-left transition-colors whitespace-nowrap shrink-0"
          >
            <Trophy className="w-5 h-5 text-amber-300" />
            <div>
              <div className="text-sm font-bold text-white">Papan Peringkat</div>
              <div className="text-[11px] text-slate-400 hidden sm:block">
                Ranking Global
              </div>
            </div>
          </button>
        </nav>

        {/* Center Hero Pedestal Showcase */}
        <section className="lg:col-span-5 flex flex-col items-center justify-center text-center">
          <div className="relative flex items-center justify-center">
            {/* Radiant Geometric Pedestal */}
            <div className="absolute w-56 h-56 rounded-full bg-radial from-[#14b8a6]/25 via-[#d4af37]/10 to-transparent animate-aura pointer-events-none" />
            <div className="animate-float-slow">
              <HeroAvatar heroId={selectedHero.id} size="xl" />
            </div>
          </div>

          <div className="mt-3 space-y-1">
            <div className="text-xs font-semibold text-teal-300">
              {selectedHero.roleLabelId} · Nilai: {selectedHero.moralValue}
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-[#fdfbf7] gold-glow">
              {selectedHero.name} — {selectedHero.title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
              {selectedHero.lore}
            </p>
          </div>
        </section>

        {/* Right Panel: Selected Hero Skills + Primary Play Actions */}
        <aside className="lg:col-span-4 flex flex-col gap-3">
          <div className="ornate-panel rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-[#fbbf24]">
              <span>Kemampuan Pahlawan</span>
              <button
                type="button"
                onClick={() => openModal('heroes')}
                className="text-teal-300 hover:text-teal-200 underline"
              >
                Ganti Pahlawan
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {selectedHero.skills.map((sk, idx) => (
                <div
                  key={sk.id}
                  className="p-2 rounded-lg bg-slate-900/75 border border-slate-800 flex items-center gap-2"
                >
                  <div className="w-8 h-8 rounded bg-[#0c2136] border border-[#14b8a6]/40 flex items-center justify-center text-[#5eead4] shrink-0">
                    <SkillIcon type={sk.iconType} className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold text-white truncate">{sk.name}</div>
                    <div className="text-[10px] text-slate-400">
                      {idx === 3 ? 'Ultimate (F)' : `Skill ${idx + 1} (${sk.keyLabel})`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Arena selector for local matches */}
          <div className="rounded-xl border border-amber-500/40 bg-[#07111e]/90 p-2">
            <label htmlFor="arena-select" className="block text-xs font-bold text-amber-200 mb-1">Arena Pertempuran</label>
            <select id="arena-select" value={arenaId} onChange={e => onSelectArena(e.target.value as ArenaId)} className="w-full min-h-10 rounded-lg bg-slate-900 text-white border border-slate-600 px-2 text-sm">
              {(Object.keys(ARENA_THEMES) as ArenaId[]).map(id => <option key={id} value={id}>{ARENA_THEMES[id].name}</option>)}
            </select>
            <p className="mt-1 text-[11px] text-slate-300">{ARENA_THEMES[arenaId].description} · 5v5 / Latihan</p>
            <p className="text-[10px] text-slate-400">Online: Oasis of Light</p>
          </div>
          <label className="block text-xs text-amber-200">Kesulitan Bot
            <select value={difficulty} onChange={e => onSelectDifficulty(e.target.value as BotDifficulty)} className="block w-full min-h-10 rounded-lg border border-slate-600 bg-slate-900 text-white px-2">
              {(Object.keys(BOT_DIFFICULTIES) as BotDifficulty[]).map(id => <option key={id} value={id}>{BOT_DIFFICULTIES[id].label}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => { soundEngine.unlock(); onStartMatch('duel'); }} className="min-h-11 rounded-xl bg-slate-800 border border-amber-500/50 text-amber-200 font-bold text-xs">Duel 1v1</button>
            <button type="button" onClick={() => { soundEngine.unlock(); onStartMatch('3v3'); }} className="min-h-11 rounded-xl bg-slate-800 border border-amber-500/50 text-amber-200 font-bold text-xs">Battle 3v3</button>
          </div>
          <details className="rounded-xl border border-amber-500/40 bg-slate-950/80 p-2 text-xs text-slate-200">
            <summary className="cursor-pointer font-bold text-amber-200">Mastery, Medali & Hadiah Harian</summary>
            <p className="mt-2">Mastery {selectedHero.name}: {progress.heroMastery?.[selectedHero.id] ?? 0} XP</p>
            <p>Medali: {progress.battleHistory.some(m => m.result === 'victory') ? 'Kemenangan Pertama' : 'Belum diperoleh'}</p>
            <p>{progress.quizCorrectCount >= 3 ? 'Medali Pencari Ilmu' : 'Pencari Ilmu: jawab 3 kuis benar'}</p>
            <button type="button" disabled={progress.lastLoginRewardDate === new Date().toISOString().slice(0,10)} onClick={onClaimLoginReward} className="mt-2 w-full min-h-10 rounded bg-emerald-700 disabled:bg-slate-700 font-bold">{progress.lastLoginRewardDate === new Date().toISOString().slice(0,10) ? 'Hadiah sudah diklaim' : 'Klaim 100 Emas + 50 XP'}</button>
            <p className="mt-1 text-slate-400">Progres kasual, bukan ranked. Reset hadiah pukul 00:00 UTC.</p>
          </details>
          {/* Primary Play CTAs */}
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                soundEngine.unlock();
                soundEngine.playSkill(true);
                onStartMatch('5v5');
              }}
              className="w-full py-3 px-5 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#f59e0b] to-[#d97706] hover:brightness-110 text-[#07111e] font-display font-extrabold text-base sm:text-lg tracking-wide shadow-xl flex items-center justify-center gap-2.5 transition-transform active:scale-[0.98]"
            >
              <Swords className="w-5 h-5" />
              MULAI PERTANDINGAN 5 vs 5
            </button>

            <button
              type="button"
              onClick={() => openModal('online')}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-[0.99]"
            >
              <Globe className="w-4 h-4" />
              Main Online Dunia (Kamera &amp; Mikrofon)
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.unlock();
                soundEngine.playClick();
                onStartMatch('training');
              }}
              className="w-full py-2 px-4 rounded-xl bg-[#0d283d]/90 hover:bg-[#133854] border border-[#14b8a6]/50 text-[#a7f3d0] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <Compass className="w-4 h-4" />
              Mode Latihan (1 vs 1 + Minion)
            </button>
          </div>
        </aside>
      </main>

      {/* Subtle Control & Value Footer */}
      <footer className="nur-lobby-footer relative z-10 px-4 sm:px-8 py-2 border-t border-[#d4af37]/15 flex items-center justify-between text-[11px] text-slate-400">
        <span>Amanah · Sabar · Kejujuran · Persaudaraan</span>
        <span className="hidden sm:inline">
          Laptop/PC: Stick Virtual (Mouse) / WASD · Spasi Serang · Q E R F Skill · B Pulang | Sentuh: Joystick & Tombol
        </span>
      </footer>

      {adminOpen && adminAllowed && authUser && <AdminDashboard onClose={()=>setAdminOpen(false)}/>}
      {/* ACTIVE MODALS */}
      {activeModal === 'guide' && (
        <GameGuide
          selectedHeroId={progress.selectedHeroId}
          onSelectHero={onSelectHero}
          onClose={() => setActiveModal(null)}
          onPlay={mode => {
            if (mode === 'online') {
              openModal('online');
            } else {
              setActiveModal(null);
              onStartMatch(mode);
            }
          }}
        />
      )}
      {activeModal === 'heroes' && (
        <HeroCollectionModal
          selectedHeroId={progress.selectedHeroId}
          onSelectHero={onSelectHero}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'missions' && (
        <MissionsModal
          missions={progress.dailyMissions}
          onClaimMission={onClaimMission}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'quiz' && (
        <QuizModal
          progress={progress}
          onAnswerQuestion={onAnswerQuiz}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'history' && (
        <HistoryModal
          history={progress.battleHistory}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'leaderboard' && (
        <LeaderboardModal onClose={() => setActiveModal(null)} />
      )}

      {activeModal === 'settings' && (
        <SettingsModal
          settings={progress.settings}
          onUpdateSettings={onUpdateSettings}
          onResetProgress={onResetProgress}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'online' && (
        <OnlineLobbyModal
          playerName={progress.playerName}
          selectedHeroId={progress.selectedHeroId}
          initialRoomCode={initialRoomCode}
          onChangePlayerName={onChangePlayerName}
          onSelectHero={onSelectHero}
          onMatchStart={(startedRoom, localPlayerId) => {
            setActiveModal(null);
            onClearInitialRoomCode?.();
            onStartOnlineMatch(startedRoom, localPlayerId);
          }}
          onClose={() => {
            setActiveModal(null);
            onClearInitialRoomCode?.();
          }}
        />
      )}
    </div>
  );
};
