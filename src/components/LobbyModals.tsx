import React, { useEffect, useState } from 'react';
import {
  Check,
  CheckCircle2,
  History,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trophy,
  X,
} from 'lucide-react';
import {
  fetchLeaderboard,
  HEROES,
  HERO_LIST,
  QUIZ_QUESTIONS,
} from '../services/gameCatalog';
import { soundEngine } from '../services/sound';
import {
  BattleRecord,
  DailyMission,
  GRAPHICS_QUALITY_OPTIONS,
  GraphicsQuality,
  HeroId,
  LeaderboardEntry,
  PlayerProgress,
  PlayerSettings,
} from '../types/game';
import { SkillIcon, StarEmblem } from './GeometricOrnament';
import { HeroAvatar } from './HeroAvatar';

// 1. HERO COLLECTION MODAL
export const HeroCollectionModal: React.FC<{
  selectedHeroId: HeroId;
  onSelectHero: (id: HeroId) => void;
  onClose: () => void;
}> = ({ selectedHeroId, onSelectHero, onClose }) => {
  const [inspectId, setInspectId] = useState<HeroId>(selectedHeroId);
  const hero = HEROES[inspectId];

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-3 sm:p-6">
      <div className="ornate-panel w-full max-w-4xl rounded-2xl p-4 sm:p-6 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-[#d4af37]/25 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <StarEmblem className="w-7 h-7" />
            <h2 className="font-display text-lg sm:text-xl font-bold text-[#fbbf24]">
              Koleksi Pahlawan Cahaya
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onClose();
            }}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 overflow-y-auto custom-scroll pr-1">
          {/* Hero List */}
          <div className="md:col-span-4 flex flex-col gap-2">
            {HERO_LIST.map((h) => {
              const isInspect = h.id === inspectId;
              const isEquipped = h.id === selectedHeroId;
              return (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setInspectId(h.id);
                  }}
                  className={`flex items-center gap-3 p-2.5 rounded-xl border text-left transition-colors ${
                    isInspect
                      ? 'bg-[#102944] border-[#d4af37]'
                      : 'bg-slate-900/70 border-slate-800 hover:border-slate-600'
                  }`}
                >
                  <HeroAvatar heroId={h.id} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-sm font-bold text-white truncate">{h.name}</span>
                      {isEquipped && (
                        <span className="text-[10px] font-bold text-emerald-400">Dipilih</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 truncate">{h.roleLabelId}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Hero Details */}
          <div className="md:col-span-8 bg-slate-900/65 rounded-xl border border-slate-800 p-4 space-y-4">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
              <HeroAvatar heroId={hero.id} size="lg" />
              <div className="flex-1 text-center sm:text-left">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs text-[#fbbf24]">
                  <span>{hero.roleLabelId}</span>
                  <span>·</span>
                  <span>Nilai: {hero.moralValue}</span>
                </div>
                <h3 className="font-display text-2xl font-bold text-white mt-0.5">
                  {hero.name} — {hero.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 mt-1.5 leading-relaxed">
                  {hero.lore}
                </p>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
              <div>
                <div className="text-slate-400">HP Dasar</div>
                <div className="font-mono-num font-bold text-emerald-400 text-sm">{hero.stats.maxHp}</div>
              </div>
              <div>
                <div className="text-slate-400">Mana</div>
                <div className="font-mono-num font-bold text-sky-400 text-sm">{hero.stats.maxMana}</div>
              </div>
              <div>
                <div className="text-slate-400">Serangan</div>
                <div className="font-mono-num font-bold text-amber-300 text-sm">
                  {Math.max(hero.stats.attackDamage, hero.stats.magicPower)}
                </div>
              </div>
              <div>
                <div className="text-slate-400">Pertahanan</div>
                <div className="font-mono-num font-bold text-slate-200 text-sm">{hero.stats.defense}</div>
              </div>
            </div>

            {/* Skills */}
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-[#d4af37]">
                Daftar Kemampuan
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {hero.skills.map((sk, idx) => (
                  <div
                    key={sk.id}
                    className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 flex items-start gap-2.5"
                  >
                    <div className="w-9 h-9 rounded-lg bg-[#0d2238] border border-[#14b8a6]/50 flex items-center justify-center text-[#5eead4] shrink-0">
                      <SkillIcon type={sk.iconType} className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white">{sk.name}</span>
                        <span className="text-[10px] font-mono-num text-[#fbbf24]">
                          {idx === 3 ? 'ULT' : `S${idx + 1}`}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                        {sk.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onSelectHero(hero.id);
                  onClose();
                }}
                className="px-5 py-2.5 rounded-xl bg-[#d4af37] hover:bg-[#eab308] text-[#07111e] font-bold text-sm flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                {selectedHeroId === hero.id ? 'Pahlawan Aktif' : `Pilih ${hero.name}`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// 2. ISLAMIC EDUCATIONAL QUIZ MODAL
export const QuizModal: React.FC<{
  progress: PlayerProgress;
  onAnswerQuestion: (questionId: string, isCorrect: boolean) => void;
  onClose: () => void;
}> = ({ progress, onAnswerQuestion, onClose }) => {
  const [index, setIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [reviewMode, setReviewMode] = useState(false);

  const q = QUIZ_QUESTIONS[index];
  const alreadyAnswered = progress.quizAnsweredIds.includes(q.id);
  const hasAnsweredNow = selectedOption !== null;
  const isCorrect = selectedOption === q.correctIndex;

  const handleChoose = (optIdx: number) => {
    if (hasAnsweredNow) return;
    setSelectedOption(optIdx);
    const correct = optIdx === q.correctIndex;
    if (correct) soundEngine.playHeal();
    else soundEngine.playClick();
    onAnswerQuestion(q.id, correct);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-3 sm:p-6">
      <div className="ornate-panel w-full max-w-2xl rounded-2xl p-5 sm:p-6 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-[#d4af37]/25 pb-3 mb-4">
          <div>
            <h2 className="font-display text-lg sm:text-xl font-bold text-[#fbbf24]">
              Kuis Akhlak & Pengetahuan Islam
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Terjawab Benar: <span className="font-mono-num font-bold text-emerald-400">{progress.quizCorrectCount}</span> / {QUIZ_QUESTIONS.length} · Hadiah terpisah dari kekuatan tempur
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setReviewMode((v) => !v);
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-amber-200"
            >
              {reviewMode ? 'Kembali ke Kuis' : 'Ulas Semua'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {reviewMode ? (
          <div className="space-y-3 overflow-y-auto custom-scroll pr-1">
            {QUIZ_QUESTIONS.map((item, idx) => (
              <div key={item.id} className="p-3.5 rounded-xl bg-slate-900/75 border border-slate-800">
                <div className="flex items-center justify-between text-xs text-[#fbbf24] mb-1">
                  <span>
                    {idx + 1}. {item.category} · {item.valueTag}
                  </span>
                  {progress.quizAnsweredIds.includes(item.id) && (
                    <span className="text-emerald-400 font-semibold">Sudah Dijawab</span>
                  )}
                </div>
                <div className="text-sm font-semibold text-white">{item.question}</div>
                <div className="text-xs text-emerald-300 mt-1.5">
                  Jawaban Benar: {item.options[item.correctIndex]}
                </div>
                <p className="text-xs text-slate-300 mt-1">{item.explanation}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4 overflow-y-auto custom-scroll pr-1">
            <div className="flex items-center justify-between text-xs text-teal-300">
              <span>
                {q.category} · Nilai: {q.valueTag}
              </span>
              <span className="font-mono-num">
                Soal {index + 1} / {QUIZ_QUESTIONS.length}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-sm sm:text-base font-semibold text-[#fdfbf7] leading-relaxed">
              {q.question}
            </div>

            <div className="space-y-2">
              {q.options.map((opt, oIdx) => {
                let btnStyle = 'bg-slate-900/70 border-slate-700 hover:border-[#d4af37]/60 text-slate-200';
                if (hasAnsweredNow) {
                  if (oIdx === q.correctIndex) {
                    btnStyle = 'bg-emerald-950/75 border-emerald-400 text-emerald-200';
                  } else if (oIdx === selectedOption) {
                    btnStyle = 'bg-rose-950/75 border-rose-400 text-rose-200';
                  } else {
                    btnStyle = 'bg-slate-900/40 border-slate-800 text-slate-500';
                  }
                }
                return (
                  <button
                    key={oIdx}
                    type="button"
                    disabled={hasAnsweredNow}
                    onClick={() => handleChoose(oIdx)}
                    className={`w-full p-3 rounded-xl border text-left text-xs sm:text-sm font-medium transition-colors ${btnStyle}`}
                  >
                    <span className="font-mono-num font-bold mr-2 text-[#d4af37]">
                      {String.fromCharCode(65 + oIdx)}.
                    </span>
                    {opt}
                  </button>
                );
              })}
            </div>

            {hasAnsweredNow && (
              <div
                className={`p-3.5 rounded-xl border text-xs sm:text-sm ${
                  isCorrect
                    ? 'bg-emerald-950/50 border-emerald-500/60 text-emerald-100'
                    : 'bg-amber-950/50 border-amber-500/60 text-amber-100'
                }`}
              >
                <div className="font-bold mb-1">
                  {isCorrect
                    ? alreadyAnswered
                      ? 'MasyaAllah, Benar!'
                      : 'MasyaAllah, Benar! (+30 Emas & +25 XP Profil)'
                    : 'Jawaban kurang tepat, mari pelajari penjelasannya:'}
                </div>
                <p className="text-slate-200">{q.explanation}</p>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setSelectedOption(null);
                  setIndex((i) => (i - 1 + QUIZ_QUESTIONS.length) % QUIZ_QUESTIONS.length);
                }}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200"
              >
                Sebelumnya
              </button>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setSelectedOption(null);
                  setIndex((i) => (i + 1) % QUIZ_QUESTIONS.length);
                }}
                className="px-4 py-2 rounded-lg bg-[#d4af37] hover:bg-[#eab308] text-[#07111e] text-xs font-bold"
              >
                Soal Berikutnya
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// 3. DAILY MISSIONS MODAL
export const MissionsModal: React.FC<{
  missions: DailyMission[];
  onClaimMission: (missionId: string) => void;
  onClose: () => void;
}> = ({ missions, onClaimMission, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
      <div className="ornate-panel w-full max-w-xl rounded-2xl p-5 sm:p-6 max-h-[88vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-[#d4af37]/25 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#fbbf24]" />
            <h2 className="font-display text-lg sm:text-xl font-bold text-[#fbbf24]">Misi Harian</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 overflow-y-auto custom-scroll pr-1">
          {missions.map((m) => {
            const done = m.progress >= m.target;
            return (
              <div
                key={m.id}
                className="p-3.5 rounded-xl bg-slate-900/75 border border-slate-800 flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-white">{m.title}</div>
                  <p className="text-xs text-slate-300 mt-0.5">{m.description}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="w-32 h-2 rounded-full bg-slate-950 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500"
                        style={{ width: `${Math.min(100, (m.progress / m.target) * 100)}%` }}
                      />
                    </div>
                    <span className="font-mono-num text-xs text-slate-300">
                      {m.progress}/{m.target}
                    </span>
                    <span className="text-xs text-[#fbbf24] font-semibold">
                      +{m.rewardGold} Emas · +{m.rewardXp} XP
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!done || m.claimed}
                  onClick={() => {
                    soundEngine.playLevelUp();
                    onClaimMission(m.id);
                  }}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold shrink-0 flex items-center gap-1 ${
                    m.claimed
                      ? 'bg-emerald-950/60 text-emerald-400 cursor-default'
                      : done
                      ? 'bg-[#d4af37] hover:bg-[#eab308] text-[#07111e]'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {m.claimed ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> Diklaim
                    </>
                  ) : done ? (
                    'Ambil Hadiah'
                  ) : (
                    'Proses'
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// 4. BATTLE HISTORY MODAL
export const HistoryModal: React.FC<{
  history: BattleRecord[];
  onClose: () => void;
}> = ({ history, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
      <div className="ornate-panel w-full max-w-xl rounded-2xl p-5 sm:p-6 max-h-[88vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-[#d4af37]/25 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-[#fbbf24]" />
            <h2 className="font-display text-lg sm:text-xl font-bold text-[#fbbf24]">
              Riwayat Pertempuran
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {history.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-400">
            Belum ada riwayat pertempuran. Ayo mulai pertandingan pertama Anda!
          </div>
        ) : (
          <div className="space-y-2.5 overflow-y-auto custom-scroll pr-1">
            {history.map((rec) => {
              const h = HEROES[rec.heroId];
              const m = Math.floor(rec.durationSec / 60);
              const s = rec.durationSec % 60;
              return (
                <div
                  key={rec.id}
                  className="p-3 rounded-xl bg-slate-900/75 border border-slate-800 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <HeroAvatar heroId={rec.heroId} size="sm" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-bold ${
                            rec.result === 'victory' ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {rec.result === 'victory' ? 'MENANG' : 'KALAH'}
                        </span>
                        <span className="text-xs text-slate-400">·</span>
                        <span className="text-xs font-semibold text-white">{h.name}</span>
                        <span className="text-[11px] text-slate-400">
                          ({rec.mode === 'online' ? 'Online Dunia' : rec.mode === '5v5' ? '5v5' : 'Latihan'})
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono-num mt-0.5">
                        K/D/A {rec.kills}/{rec.deaths}/{rec.assists} · Durasi {m}m {s}d
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-xs font-mono-num text-[#fbbf24]">
                    +{rec.goldEarned} Emas
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// 5. SETTINGS MODAL
export const SettingsModal: React.FC<{
  settings: PlayerSettings;
  onUpdateSettings: (patch: Partial<PlayerSettings>) => void;
  onResetProgress: () => void;
  onClose: () => void;
}> = ({ settings, onUpdateSettings, onResetProgress, onClose }) => {
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
      <div className="ornate-panel w-full max-w-md rounded-2xl p-5 sm:p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-[#d4af37]/25 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#fbbf24]" />
            <h2 className="font-display text-lg font-bold text-[#fbbf24]">Pengaturan Gim</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-200">Volume Efek & Musik</span>
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

          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-slate-200">Bisukan Semua Suara</span>
            <input
              type="checkbox"
              checked={settings.muted}
              onChange={(e) => onUpdateSettings({ muted: e.target.checked })}
              className="w-4 h-4 accent-[#d4af37]"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-slate-200">Suara Alam Taman Istana</span>
            <input
              type="checkbox"
              checked={settings.ambientEnabled}
              onChange={(e) => onUpdateSettings({ ambientEnabled: e.target.checked })}
              className="w-4 h-4 accent-[#d4af37]"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-slate-200">Tampilkan Panduan Awal</span>
            <input
              type="checkbox"
              checked={settings.showTutorialOnStart}
              onChange={(e) => onUpdateSettings({ showTutorialOnStart: e.target.checked })}
              className="w-4 h-4 accent-[#d4af37]"
            />
          </label>

          <div className="flex items-center justify-between">
            <span className="text-slate-200">Kualitas Grafis</span>
            <div className="flex flex-wrap justify-end gap-1">
              {(Object.keys(GRAPHICS_QUALITY_OPTIONS) as GraphicsQuality[]).map((q) => (
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
                  {GRAPHICS_QUALITY_OPTIONS[q]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
          {!confirmReset ? (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Kemajuan
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onResetProgress();
                  setConfirmReset(false);
                  onClose();
                }}
                className="px-2.5 py-1 rounded bg-rose-600 text-white text-xs font-bold"
              >
                Ya, Reset
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 text-xs"
              >
                Batal
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#d4af37] text-[#07111e] text-xs font-bold"
          >
            Simpan & Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

// 6. GLOBAL LEADERBOARD MODAL (Convex)
export const LeaderboardModal: React.FC<{
  onClose: () => void;
}> = ({ onClose }) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchLeaderboard()
      .then((rows) => {
        if (active) setEntries(rows);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
      <div className="ornate-panel w-full max-w-xl rounded-2xl p-5 sm:p-6 max-h-[88vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-[#d4af37]/25 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[#fbbf24]" />
            <h2 className="font-display text-lg sm:text-xl font-bold text-[#fbbf24]">
              Papan Peringkat Penjaga Cahaya
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="py-10 text-center text-sm text-slate-300">
            Memuat peringkat dari database...
          </div>
        ) : entries.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-400">
            Belum ada data peringkat tersimpan. Buat akun atau masuk lalu selesaikan pertandingan untuk masuk ke papan peringkat!
          </div>
        ) : (
          <div className="space-y-2 overflow-y-auto custom-scroll pr-1">
            {entries.map((entry, idx) => {
              const hero = HEROES[entry.heroId] || HEROES.amin;
              return (
                <div
                  key={`${entry.playerName}_${idx}`}
                  className="p-3 rounded-xl bg-slate-900/75 border border-slate-800 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono-num text-xs font-extrabold shrink-0 ${
                        idx === 0
                          ? 'bg-amber-400 text-[#07111e]'
                          : idx === 1
                          ? 'bg-slate-300 text-[#07111e]'
                          : idx === 2
                          ? 'bg-amber-700 text-white'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      #{idx + 1}
                    </span>
                    <HeroAvatar heroId={hero.id} size="sm" />
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-white truncate">
                        {entry.playerName}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {hero.name} · {entry.wins} Menang / {entry.matches} Laga
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono-num text-xs font-bold text-[#fbbf24]">
                      Lv.{entry.level}
                    </div>
                    <div className="font-mono-num text-[11px] text-emerald-300">
                      {entry.xp} XP
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

