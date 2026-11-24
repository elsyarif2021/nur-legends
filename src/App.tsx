/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { InstallGame } from './components/InstallGame';
import { AuthModal } from './components/AuthModal';
import { BattleArena } from './components/BattleArena';
import { Lobby } from './components/Lobby';
import { onlineClient } from './network/OnlineRoomClient';
import { webrtcManager } from './network/WebRTCManager';
import { authClient } from './services/authClient';
import { hydrateCatalogFromConvex } from './services/gameCatalog';
import { soundEngine } from './services/sound';
import {
  applyXpAndGold,
  createDefaultProgress,
  loadPlayerProgress,
  recordBattleResult,
  savePlayerProgress,
  updateSettings,
} from './services/storage';
import {
  AuthUser,
  GameMode,
  HeroId,
  MatchResultSummary,
  OnlineRoomState,
  PlayerProgress,
  PlayerSettings,
  ScreenView,
} from './types/game';

function getInitialInviteRoomCode(): string | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('room')?.trim().toUpperCase();
    if (code && /^[A-Z0-9]{4,10}$/.test(code)) {
      return code;
    }
  } catch {
    // ignore URL parse failure
  }
  return null;
}


const NARRATOR_GUIDE = 'Assalamualaikum, Penjaga Cahaya! Selamat datang di Nur Legends. Pilih pahlawanmu di lobi. Jika baru bermain, mulailah dengan mode latihan. Gunakan joystick atau tombol arah untuk bergerak, dan tombol serangan serta skill untuk bertarung. Lindungi menara timmu dan hancurkan Inti Cahaya lawan. Bermainlah dengan sabar, sportif, dan saling membantu.';

function speakGuide(message: string, volume: number): void {
  if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(message);
    speech.lang = 'id-ID';
    speech.rate = 0.92;
    speech.volume = Math.max(0, Math.min(1, volume));
    const voice = window.speechSynthesis.getVoices().find(v => v.lang.toLowerCase().startsWith('id'));
    if (voice) speech.voice = voice;
    window.speechSynthesis.speak(speech);
  } catch { /* Text guide remains available. */ }
}

function stopGuide(): void {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

export default function App() {
  const [progress, setProgress] = useState<PlayerProgress>(() => loadPlayerProgress());
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideEnabled, setGuideEnabled] = useState(true);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(
    () => !getInitialInviteRoomCode()
  );
  const [screen, setScreen] = useState<ScreenView>('LOBBY');
  const [activeMode, setActiveMode] = useState<GameMode>('5v5');
  const [initialRoomCode, setInitialRoomCode] = useState<string | null>(() =>
    getInitialInviteRoomCode()
  );
  const [onlineRoom, setOnlineRoom] = useState<OnlineRoomState | null>(null);
  const [onlinePlayerId, setOnlinePlayerId] = useState<string | null>(null);

  useEffect(() => {
    void hydrateCatalogFromConvex();
  }, []);

  useEffect(() => {
    soundEngine.configure(
      progress.settings.volume,
      progress.settings.muted,
      progress.settings.ambientEnabled
    );
  }, [progress.settings]);

  useEffect(() => {
    if (!authUser) return;
    const timer = window.setTimeout(() => {
      void authClient.syncProgress(progress);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [authUser, progress]);

  useEffect(() => {
    if (progress.settings.muted || !guideEnabled || screen === 'BATTLE') stopGuide();
  }, [progress.settings.muted, guideEnabled, screen]);

  useEffect(() => () => stopGuide(), []);

  const openGuide = (settings = progress.settings) => {
    setGuideOpen(true);
    if (guideEnabled && !settings.muted) speakGuide(NARRATOR_GUIDE, settings.volume);
  };

  const handleSelectHero = (heroId: HeroId) => {
    setProgress((prev) => {
      const next = { ...prev, selectedHeroId: heroId };
      savePlayerProgress(next);
      return next;
    });
  };

  const handleChangePlayerName = (name: string) => {
    const clean = name.slice(0, 20);
    setProgress((prev) => {
      const next = { ...prev, playerName: clean };
      savePlayerProgress(next);
      return next;
    });
  };

  const handleUpdateSettings = (patch: Partial<PlayerSettings>) => {
    setProgress((prev) => updateSettings(prev, patch));
  };

  const handleClaimMission = (missionId: string) => {
    setProgress((prev) => {
      const target = prev.dailyMissions.find((m) => m.id === missionId);
      if (!target || target.claimed || target.progress < target.target) return prev;

      const updatedMissions = prev.dailyMissions.map((m) =>
        m.id === missionId ? { ...m, claimed: true } : m
      );
      const withReward = applyXpAndGold(
        { ...prev, dailyMissions: updatedMissions },
        target.rewardGold,
        target.rewardXp
      );
      savePlayerProgress(withReward);
      return withReward;
    });
  };

  const handleAnswerQuiz = (questionId: string, isCorrect: boolean) => {
    if (!isCorrect) return;
    setProgress((prev) => {
      const firstTime = !prev.quizAnsweredIds.includes(questionId);
      const updatedIds = firstTime
        ? [...prev.quizAnsweredIds, questionId]
        : prev.quizAnsweredIds;

      const updatedMissions = prev.dailyMissions.map((m) =>
        m.type === 'quiz_answer' && !m.claimed
          ? { ...m, progress: Math.min(m.target, m.progress + 1) }
          : m
      );

      let next: PlayerProgress = {
        ...prev,
        quizAnsweredIds: updatedIds,
        quizCorrectCount: firstTime ? prev.quizCorrectCount + 1 : prev.quizCorrectCount,
        dailyMissions: updatedMissions,
      };
      if (firstTime) {
        next = applyXpAndGold(next, 30, 25);
      }
      savePlayerProgress(next);
      return next;
    });
  };

  const handleResetProgress = () => {
    const def = createDefaultProgress();
    savePlayerProgress(def);
    setProgress(def);
  };

  const handleDismissTutorial = () => {
    setProgress((prev) => {
      const next = {
        ...prev,
        tutorialCompleted: true,
        settings: { ...prev.settings, showTutorialOnStart: false },
      };
      savePlayerProgress(next);
      return next;
    });
  };

  const handleMatchFinished = (summary: MatchResultSummary) => {
    setProgress((prev) =>
      recordBattleResult(prev, {
        heroId: prev.selectedHeroId,
        mode: activeMode,
        winner: summary.winner,
        playerTeam: summary.playerTeam,
        durationSec: summary.durationSec,
        kills: summary.playerKills,
        deaths: summary.playerDeaths,
        assists: summary.playerAssists,
        turretsDestroyed: summary.turretsDestroyedByPlayerTeam,
        goldEarned: summary.goldReward,
        xpEarned: summary.xpReward,
      })
    );
  };

  const handleStartMatch = (mode: GameMode) => {
    setOnlineRoom(null);
    setOnlinePlayerId(null);
    setActiveMode(mode);
    setScreen('BATTLE');
  };

  const handleStartOnlineMatch = (room: OnlineRoomState, localPlayerId: string) => {
    const myMember = room.players.find((p) => p.id === localPlayerId);
    if (myMember && myMember.heroId !== progress.selectedHeroId) {
      handleSelectHero(myMember.heroId);
    }
    setOnlineRoom(room);
    setOnlinePlayerId(localPlayerId);
    setActiveMode('online');
    setScreen('BATTLE');
  };

  const handleExitToLobby = () => {
    if (activeMode === 'online') {
      onlineClient.leaveRoom();
      webrtcManager.stopLocalMedia();
      setOnlineRoom(null);
      setOnlinePlayerId(null);
    }
    setScreen('LOBBY');
  };

  const handleClearInitialRoomCode = () => {
    setInitialRoomCode(null);
    try {
      if (window.location.search.includes('room=')) {
        const url = new URL(window.location.href);
        url.searchParams.delete('room');
        window.history.replaceState({}, '', url.pathname + url.search);
      }
    } catch {
      // ignore history update error
    }
  };

  const handleAuthenticated = (
    user: AuthUser,
    serverProgress: PlayerProgress | null
  ) => {
    setAuthUser(user);
    setAuthModalOpen(false);
    openGuide(serverProgress?.settings ?? progress.settings);
    if (serverProgress) {
      const def = createDefaultProgress();
      const merged: PlayerProgress = {
        ...def,
        ...serverProgress,
        playerName: user.name,
        settings: {
          ...def.settings,
          ...(serverProgress.settings || {}),
        },
        dailyMissions:
          Array.isArray(serverProgress.dailyMissions) &&
          serverProgress.dailyMissions.length > 0
            ? serverProgress.dailyMissions
            : def.dailyMissions,
        battleHistory: Array.isArray(serverProgress.battleHistory)
          ? serverProgress.battleHistory
          : [],
        quizAnsweredIds: Array.isArray(serverProgress.quizAnsweredIds)
          ? serverProgress.quizAnsweredIds
          : [],
      };
      savePlayerProgress(merged);
      setProgress(merged);
    } else {
      setProgress((prev) => {
        const next = { ...prev, playerName: user.name };
        savePlayerProgress(next);
        return next;
      });
    }
  };

  const handleLogout = () => {
    stopGuide();
    setGuideOpen(false);
    void authClient.logout();
    setAuthUser(null);
    setAuthModalOpen(true);
  };

  return (
    <div className="w-screen h-screen overflow-hidden bg-[#07111e] text-[#fdfbf7]">
      <button
        type="button"
        onClick={() => {
          const message = screen === 'BATTLE'
            ? 'Muat ulang game? Pertandingan yang sedang berlangsung dapat terputus dan Anda mungkin perlu login kembali.'
            : 'Muat ulang NUR LEGENDS? Anda mungkin perlu login kembali.';
          if (window.confirm(message)) window.location.reload();
        }}
        aria-label="Refresh game jika hang"
        title="Refresh game jika hang"
        className="fixed z-[100] left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full border border-amber-400/70 bg-slate-950/95 px-3 min-h-11 text-xs font-bold text-amber-200 shadow-lg touch-manipulation"
        style={{ bottom: 'max(8px, env(safe-area-inset-bottom))' }}
      >
        <span aria-hidden="true" className="text-lg leading-none">↻</span> Refresh
      </button>

      {screen === 'LOBBY' ? (
        <>
          <Lobby
            progress={progress}
            authUser={authUser}
            initialRoomCode={initialRoomCode}
            onStartMatch={handleStartMatch}
            onStartOnlineMatch={handleStartOnlineMatch}
            onChangePlayerName={handleChangePlayerName}
            onSelectHero={handleSelectHero}
            onClaimMission={handleClaimMission}
            onAnswerQuiz={handleAnswerQuiz}
            onUpdateSettings={handleUpdateSettings}
            onResetProgress={handleResetProgress}
            onOpenAuth={() => setAuthModalOpen(true)}
            onLogout={handleLogout}
            onClearInitialRoomCode={handleClearInitialRoomCode}
          />
          {(
            <div className={`fixed bottom-3 right-3 z-40 flex flex-wrap justify-end gap-2 ${authModalOpen ? 'hidden' : ''}`}>
              <InstallGame />
              <button type="button" className="rounded-full bg-slate-900 border border-amber-400/60 px-3 py-2 text-xs text-amber-200 shadow-lg" onClick={() => openGuide()}>Panduan Narator</button>
            </div>
          )}
          {guideOpen && !authModalOpen && (
            <div role="dialog" aria-modal="true" aria-labelledby="guide-title" className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4">
              <div className="w-full max-w-md rounded-2xl border border-amber-500/60 bg-slate-950 p-5 shadow-xl">
                <h2 id="guide-title" className="text-lg font-bold text-amber-300">Narator Penjaga Cahaya</h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-200">{NARRATOR_GUIDE}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" disabled={!guideEnabled || progress.settings.muted} className="rounded bg-amber-400 px-3 py-2 text-sm font-bold text-slate-950 disabled:opacity-50" onClick={() => speakGuide(NARRATOR_GUIDE, progress.settings.volume)}>Putar suara</button>
                  <button type="button" className="rounded bg-slate-800 px-3 py-2 text-sm" onClick={() => { stopGuide(); setGuideEnabled(!guideEnabled); }}>{guideEnabled ? 'Nonaktifkan narator' : 'Aktifkan narator'}</button>
                  <button type="button" className="rounded bg-emerald-700 px-3 py-2 text-sm" onClick={() => { stopGuide(); setGuideOpen(false); }}>Lanjut bermain</button>
                </div>
              </div>
            </div>
          )}
          {authModalOpen && (
            <AuthModal
              currentProgress={progress}
              allowDismiss
              onAuthenticated={handleAuthenticated}
              onContinueGuest={() => { setAuthModalOpen(false); openGuide(); }}
            />
          )}
        </>
      ) : (
        <BattleArena
          heroId={progress.selectedHeroId}
          mode={activeMode}
          onlineRoom={onlineRoom}
          onlinePlayerId={onlinePlayerId}
          settings={progress.settings}
          showTutorialInitially={
            !progress.tutorialCompleted && progress.settings.showTutorialOnStart
          }
          onUpdateSettings={handleUpdateSettings}
          onDismissTutorial={handleDismissTutorial}
          onMatchFinished={handleMatchFinished}
          onExitToLobby={handleExitToLobby}
        />
      )}
    </div>
  );
}
