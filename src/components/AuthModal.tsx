import React, { useState } from 'react';
import { Eye, EyeOff, Lock, LogIn, Mail, ShieldCheck, User, UserPlus, X } from 'lucide-react';
import { authClient } from '../services/authClient';
import { soundEngine } from '../services/sound';
import { AuthUser, PlayerProgress } from '../types/game';
import { StarEmblem } from './GeometricOrnament';

interface AuthModalProps {
  currentProgress: PlayerProgress;
  allowDismiss?: boolean;
  onAuthenticated: (user: AuthUser, serverProgress: PlayerProgress | null) => void;
  onContinueGuest?: () => void;
}

type AuthTab = 'register' | 'login';

export const AuthModal: React.FC<AuthModalProps> = ({
  currentProgress,
  allowDismiss = true,
  onAuthenticated,
  onContinueGuest,
}) => {
  const [tab, setTab] = useState<AuthTab>('register');
  const [name, setName] = useState(() =>
    currentProgress.playerName === 'Penjaga Cahaya' ? '' : currentProgress.playerName
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (tab === 'register') {
      if (cleanName.length < 2) {
        setErrorMsg('Masukkan nama lengkap atau nama panggilan (minimal 2 karakter).');
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanEmail)) {
        setErrorMsg('Masukkan alamat email yang valid (contoh: nama@email.com).');
        return;
      }
      if (password.length < 6) {
        setErrorMsg('Password harus memiliki minimal 6 karakter.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Konfirmasi password tidak cocok.');
        return;
      }

      setLoading(true);
      try {
        const res = await authClient.register({
          name: cleanName,
          email: cleanEmail,
          password,
          progress: { ...currentProgress, playerName: cleanName },
        });
        soundEngine.playSkill(true);
        onAuthenticated(res.user, res.progress);
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Gagal membuat akun.');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Login tab
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanEmail)) {
      setErrorMsg('Masukkan alamat email yang valid.');
      return;
    }
    if (password.length < 1) {
      setErrorMsg('Masukkan password akun Anda.');
      return;
    }

    setLoading(true);
    try {
      const res = await authClient.login({
        name: cleanName.length >= 2 ? cleanName : undefined,
        email: cleanEmail,
        password,
      });
      soundEngine.playSkill(true);
      onAuthenticated(res.user, res.progress);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal masuk ke akun.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="ornate-panel w-full max-w-md rounded-2xl p-5 sm:p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-[#d4af37]/25 pb-3">
          <div className="flex items-center gap-2.5">
            <StarEmblem className="w-8 h-8 shrink-0" />
            <div>
              <h2 className="font-display text-lg sm:text-xl font-extrabold text-[#fbbf24]">
                Akun Penjaga Cahaya
              </h2>
              <p className="text-xs text-slate-300">
                Masuk atau buat akun dengan nama, email, &amp; password
              </p>
            </div>
          </div>

          {allowDismiss && onContinueGuest && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onContinueGuest();
              }}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
              aria-label="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-950/80 border border-slate-800">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setTab('register');
              setErrorMsg(null);
            }}
            className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
              tab === 'register'
                ? 'bg-gradient-to-r from-[#d4af37] to-[#d97706] text-[#07111e]'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Buat Akun Baru
          </button>
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setTab('login');
              setErrorMsg(null);
            }}
            className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
              tab === 'login'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            Masuk Akun
          </button>
        </div>

        {errorMsg && (
          <div className="px-3.5 py-2 rounded-xl bg-rose-950/75 border border-rose-500/50 text-xs text-rose-200">
            {errorMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
          {/* Nama */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-200">
              {tab === 'register' ? 'Nama Lengkap / Panggilan' : 'Nama Pemain (Opsional)'}
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                maxLength={24}
                required={tab === 'register'}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={tab === 'register' ? 'Masukkan nama Anda' : 'Kosongkan untuk pakai nama tersimpan'}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950/90 border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#d4af37]"
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-200">Alamat Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                maxLength={120}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contoh: penjaga@email.com"
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950/90 border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#d4af37]"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-200">
              {tab === 'register' ? 'Buat Password (minimal 6 karakter)' : 'Password'}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                maxLength={128}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={tab === 'register' ? 'Buat password yang kuat' : 'Masukkan password Anda'}
                className="w-full pl-9 pr-10 py-2 rounded-xl bg-slate-950/90 border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#d4af37]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="p-1 text-slate-400 hover:text-slate-200 absolute right-2.5 top-1/2 -translate-y-1/2"
                aria-label={showPassword ? 'Sembunyikan Password' : 'Lihat Password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password on Register */}
          {tab === 'register' && (
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-200">
                Ulangi Password
              </label>
              <div className="relative">
                <ShieldCheck className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  maxLength={128}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ketik ulang password"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950/90 border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#d4af37]"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#f59e0b] to-[#d97706] hover:brightness-110 disabled:opacity-60 text-[#07111e] font-display font-extrabold text-sm tracking-wide shadow-lg transition-transform active:scale-[0.99]"
          >
            {loading
              ? 'Memproses...'
              : tab === 'register'
              ? 'Buat Akun & Masuk ke Arena'
              : 'Masuk ke Arena'}
          </button>
        </form>

        {allowDismiss && onContinueGuest && (
          <div className="pt-1 border-t border-[#d4af37]/15 text-center">
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onContinueGuest();
              }}
              className="text-xs text-slate-400 hover:text-teal-300 underline"
            >
              Lanjut sebagai Tamu (Simpan Lokal)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
