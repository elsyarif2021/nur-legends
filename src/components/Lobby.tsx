import React, { useState } from 'react';
import {
  BookOpen,
  Compass,
  History,
  Maximize2,
  Minimize2,
  Settings,
  Sparkles,
  Swords,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { HEROES, HERO_LIST } from '../data/heroes';
import { soundEngine } from '../services/sound';
import { getXpForNextLevel } from '../services/storage';
import { GameMode, HeroId, PlayerProgress, PlayerSettings } from '../types/game';
import { CornerFiligree, SkillIcon, StarEmblem } from './GeometricOrnament';
import { HeroAvatar } from './HeroAvatar';
import {
  HeroCollectionModal,
  HistoryModal,
  MissionsModal,
  QuizModal,
  SettingsModal,
} from './LobbyModals';

interface LobbyProps {
  progress: PlayerProgress;
  onStartMatch: (mode: GameMode) => void;
  onSelectHero: (heroId: HeroId) => void;
  onClaimMission: (missionId: string) => void;
  onAnswerQuiz: (questionId: string, isCorrect: boolean) => void;
  onUpdateSettings: (patch: Partial<PlayerSettings>) => void;
  onResetProgress: () => void;
}

type ModalTab = 'heroes' | 'missions' | 'quiz' | 'history' | 'settings' | null;

const PALACE_BG = '/src/assets/images/palace_lobby_bg_1795510715124.jpg';

export const Lobby: React.FC<LobbyProps> = ({
  progress,
  onStartMatch,
  onSelectHero,
  onClaimMission,
  onAnswerQuiz,
  onUpdateSettings,
  onResetProgress,
}) => {
  const [activeModal, setActiveModal] = useState<ModalTab>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const selectedHero = HEROES[progress.selectedHeroId];
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
      className="relative w-full h-full overflow-hidden flex flex-col justify-between bg-gradient-to-br from-[#0b2338] via-[#071524] to-[#050d17]"
      onPointerDown={() => soundEngine.unlock()}
    >
      {/* Animated Fantasy Palace Backdrop */}
      <img
        src={PALACE_BG}
        alt="Istana Cahaya Nur Legends"
        referrerPolicy="no-referrer"
        className="absolute inset-0 w-full h-full object-cover opacity-55 scale-105 transition-transform duration-[12000ms]"
      />
      {/* Measured atmospheric scrim for high readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#06111e]/90 via-[#071628]/55 to-[#06111e]/85" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#050d17] via-transparent to-[#050d17]/75" />

      {/* Ornamental geometric corners */}
      <CornerFiligree className="absolute top-3 left-3 w-8 h-8 pointer-events-none opacity-80" />
      <CornerFiligree className="absolute top-3 right-3 w-8 h-8 rotate-90 pointer-events-none opacity-80" />

      {/* TOP STATUS BAR */}
      <header className="relative z-10 flex items-center justify-between gap-4 px-4 sm:px-7 py-3.5 border-b border-[#d4af37]/20">
        {/* Player Avatar, Level & XP */}
        <div className="flex items-center gap-3 min-w-0">
          <HeroAvatar heroId={progress.selectedHeroId} size="sm" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-base font-bold text-[#fdfbf7] truncate">
                {progress.playerName}
              </span>
              <span className="text-xs font-mono-num font-bold text-[#fbbf24]">
                Lv.{progress.level}
              </span>
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
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="px-3 py-1.5 rounded-lg bg-[#0b192b]/90 border border-[#d4af37]/40 text-xs sm:text-sm font-mono-num font-bold text-[#fbbf24]">
            {progress.gold} Emas
          </div>

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
      <main className="relative z-10 flex-1 grid grid-cols-1 md:grid-cols-12 items-center px-4 sm:px-8 py-3 gap-4 overflow-y-auto md:overflow-hidden">
        {/* Left Navigation Menu */}
        <nav className="md:col-span-3 flex md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-1 md:pb-0">
          <button
            type="button"
            onClick={() => openModal('heroes')}
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#0b1b2e]/90 hover:bg-[#122a46] border border-[#d4af37]/35 text-left transition-colors whitespace-nowrap shrink-0"
          >
            <Users className="w-5 h-5 text-[#fbbf24]" />
            <div>
              <div className="text-sm font-bold text-white">Koleksi Pahlawan</div>
              <div className="text-[11px] text-slate-400 hidden sm:block">{HERO_LIST.length} Penjaga Cahaya</div>
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
        </nav>

        {/* Center Hero Pedestal Showcase */}
        <section className="md:col-span-5 flex flex-col items-center justify-center text-center">
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
        <aside className="md:col-span-4 flex flex-col gap-3">
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

          {/* Primary Play CTAs */}
          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => {
                soundEngine.unlock();
                soundEngine.playSkill(true);
                onStartMatch('5v5');
              }}
              className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#f59e0b] to-[#d97706] hover:brightness-110 text-[#07111e] font-display font-extrabold text-base sm:text-lg tracking-wide shadow-xl flex items-center justify-center gap-2.5 transition-transform active:scale-[0.98]"
            >
              <Swords className="w-5 h-5" />
              MULAI PERTANDINGAN 5 vs 5
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.unlock();
                soundEngine.playClick();
                onStartMatch('training');
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-[#0d283d]/90 hover:bg-[#133854] border border-[#14b8a6]/50 text-[#a7f3d0] font-bold text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <Compass className="w-4 h-4" />
              Mode Latihan (1 vs 1 + Minion)
            </button>
          </div>
        </aside>
      </main>

      {/* Subtle Control & Value Footer */}
      <footer className="relative z-10 px-4 sm:px-8 py-2 border-t border-[#d4af37]/15 flex items-center justify-between text-[11px] text-slate-400">
        <span>Amanah · Sabar · Kejujuran · Persaudaraan</span>
        <span className="hidden sm:inline">
          Laptop/PC: Stick Virtual (Mouse) / WASD · Spasi Serang · Q E R F Skill · B Pulang | Sentuh: Joystick & Tombol
        </span>
      </footer>

      {/* ACTIVE MODALS */}
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

      {activeModal === 'settings' && (
        <SettingsModal
          settings={progress.settings}
          onUpdateSettings={onUpdateSettings}
          onResetProgress={onResetProgress}
          onClose={() => setActiveModal(null)}
        />
      )}
    </div>
  );
};
