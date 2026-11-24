/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { BattleArena } from './components/BattleArena';
import { Lobby } from './components/Lobby';
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
  GameMode,
  HeroId,
  MatchResultSummary,
  PlayerProgress,
  PlayerSettings,
  ScreenView,
} from './types/game';

export default function App() {
  const [progress, setProgress] = useState<PlayerProgress>(() => loadPlayerProgress());
  const [screen, setScreen] = useState<ScreenView>('LOBBY');
  const [activeMode, setActiveMode] = useState<GameMode>('5v5');

  useEffect(() => {
    soundEngine.configure(
      progress.settings.volume,
      progress.settings.muted,
      progress.settings.ambientEnabled
    );
  }, [progress.settings]);

  const handleSelectHero = (heroId: HeroId) => {
    setProgress((prev) => {
      const next = { ...prev, selectedHeroId: heroId };
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
    setActiveMode(mode);
    setScreen('BATTLE');
  };

  return (
    <div className="w-screen h-screen overflow-hidden bg-[#07111e] text-[#fdfbf7]">
      {screen === 'LOBBY' ? (
        <Lobby
          progress={progress}
          onStartMatch={handleStartMatch}
          onSelectHero={handleSelectHero}
          onClaimMission={handleClaimMission}
          onAnswerQuiz={handleAnswerQuiz}
          onUpdateSettings={handleUpdateSettings}
          onResetProgress={handleResetProgress}
        />
      ) : (
        <BattleArena
          heroId={progress.selectedHeroId}
          mode={activeMode}
          settings={progress.settings}
          showTutorialInitially={
            !progress.tutorialCompleted && progress.settings.showTutorialOnStart
          }
          onUpdateSettings={handleUpdateSettings}
          onDismissTutorial={handleDismissTutorial}
          onMatchFinished={handleMatchFinished}
          onExitToLobby={() => setScreen('LOBBY')}
        />
      )}
    </div>
  );
}
