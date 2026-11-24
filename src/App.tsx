/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { AuthModal } from './components/AuthModal';
import { BattleArena } from './components/BattleArena';
import { Lobby } from './components/Lobby';
import { onlineClient } from './network/OnlineRoomClient';
import { webrtcManager } from './network/WebRTCManager';
import { authClient } from './services/authClient';
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

export default function App() {
  const [progress, setProgress] = useState<PlayerProgress>(() => loadPlayerProgress());
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
    void authClient.logout();
    setAuthUser(null);
    setAuthModalOpen(true);
  };

  return (
    <div className="w-screen h-screen overflow-hidden bg-[#07111e] text-[#fdfbf7]">
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
          {authModalOpen && (
            <AuthModal
              currentProgress={progress}
              allowDismiss
              onAuthenticated={handleAuthenticated}
              onContinueGuest={() => setAuthModalOpen(false)}
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
