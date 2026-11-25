import React, { useState, useEffect } from 'react';
import { Wallet, Lock, User, Eye, EyeOff, Sun, Moon, ShieldCheck, AlertCircle, LogIn, Cloud } from 'lucide-react';
import { motion } from 'motion/react';
import { signInWithGoogle } from '../firebase';

interface LoginViewProps {
  isDark: boolean;
  onToggleTheme: () => void;
  configured: boolean;
  hasAdditionalUsers?: boolean;
  defaultUsername: string;
  appTitle?: string;
  appDescription?: string;
  onAuthenticated: (token: string, username: string, role: 'admin' | 'user', displayName?: string) => void;
}

export default function LoginView({
  isDark,
  onToggleTheme,
  configured,
  hasAdditionalUsers = false,
  defaultUsername,
  appTitle = 'DompetKu',
  appDescription = 'Pengelola Keuangan & Anggaran Pintar',
  onAuthenticated,
}: LoginViewProps) {
  const [useUserLoginMode, setUseUserLoginMode] = useState(configured || hasAdditionalUsers);
  const [username, setUsername] = useState(configured ? (defaultUsername || 'ifan') : (hasAdditionalUsers ? '' : (defaultUsername || 'ifan')));
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (configured || hasAdditionalUsers) {
      setUseUserLoginMode(true);
    }
  }, [configured, hasAdditionalUsers]);

  const isSetupMode = !configured && !useUserLoginMode;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedUser = username.trim();
    if (!trimmedUser || !password) {
      setError('Username dan password wajib diisi.');
      return;
    }

    if (isSetupMode && password !== confirmPassword) {
      setError('Konfirmasi password tidak cocok.');
      return;
    }

    setIsSubmitting(true);
    try {
      const endpoint = isSetupMode ? '/api/auth/setup' : '/api/auth/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: trimmedUser, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Gagal melakukan autentikasi.');
        return;
      }

      if (typeof data?.token === 'string' && typeof data?.username === 'string') {
        const role: 'admin' | 'user' = data?.role === 'admin' ? 'admin' : 'user';
        const displayName = typeof data?.displayName === 'string' ? data.displayName : data.username;
        onAuthenticated(data.token, data.username, role, displayName);
      } else {
        setError('Respons server tidak valid.');
      }
    } catch {
      setError('Tidak dapat terhubung ke server. Coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('popup-closed-by-user')) {
        setError('Login Google dibatalkan.');
      } else {
        setError('Gagal masuk dengan Google. Pastikan pop-up diizinkan.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={`min-h-screen flex flex-col justify-center items-center px-4 py-10 relative overflow-hidden transition-colors duration-500 ${
        isDark
          ? 'bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-slate-100'
          : 'bg-gradient-to-br from-slate-50 via-indigo-50/50 to-slate-100 text-slate-900'
      }`}
    >
      {isDark && (
        <>
          <div className="absolute top-10 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
          <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none animate-pulse [animation-delay:1.5s]" />
        </>
      )}

      {/* Theme Toggle */}
      <div className="absolute top-6 right-6 z-20">
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          type="button"
          onClick={onToggleTheme}
          className={`p-2.5 rounded-xl border shadow-md transition-colors ${
            isDark
              ? 'bg-slate-800/90 border-slate-700 text-amber-400 hover:bg-slate-700'
              : 'bg-white border-slate-200 text-indigo-600 hover:bg-slate-100'
          }`}
          title={isDark ? 'Ubah ke Tema Terang' : 'Ubah ke Tema Gelap'}
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </motion.button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 26 }}
        className={`relative z-10 w-full max-w-md rounded-3xl border p-8 shadow-2xl backdrop-blur-2xl ${
          isDark
            ? 'bg-gradient-to-br from-slate-900/95 via-indigo-950/40 to-slate-900/95 border-slate-700/80'
            : 'bg-gradient-to-br from-white via-emerald-50/30 to-indigo-50/40 border-slate-200/90 shadow-slate-200/60'
        }`}
      >
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-7">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-400 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/35 mb-4">
            <Wallet className="w-7 h-7 text-slate-950 stroke-[2.5]" />
          </div>
          <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 bg-clip-text text-transparent">
            {appTitle}
          </h1>
          <p className={`text-xs font-medium mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {!isSetupMode
              ? `${appDescription} — Masuk untuk melanjutkan`
              : 'Aktivasi akun awal sebelum menggunakan aplikasi'}
          </p>
        </div>

        {!configured && hasAdditionalUsers && (
          <div
            className={`mb-4 flex space-x-1.5 p-1 rounded-xl border ${
              isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-100 border-slate-200'
            }`}
          >
            <button
              type="button"
              onClick={() => {
                setUseUserLoginMode(true);
                setError(null);
              }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                useUserLoginMode
                  ? 'bg-emerald-500 text-slate-950'
                  : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Login User
            </button>
            <button
              type="button"
              onClick={() => {
                setUseUserLoginMode(false);
                setUsername(defaultUsername || 'ifan');
                setError(null);
              }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                !useUserLoginMode
                  ? 'bg-amber-500 text-slate-950'
                  : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Aktivasi Admin ({defaultUsername || 'ifan'})
            </button>
          </div>
        )}

        {isSetupMode && (
          <div
            className={`mb-5 rounded-2xl border p-3.5 text-xs flex items-start space-x-2.5 ${
              isDark
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <span>
              Atur password awal untuk akun <strong className="font-bold">{username || 'ifan'}</strong>. Anda juga dapat menyetel <code className="font-mono font-semibold">APP_LOGIN_PASSWORD</code> di Settings &rarr; Secrets.
            </span>
          </div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-5 rounded-2xl border p-3.5 text-xs flex items-center space-x-2.5 ${
              isDark
                ? 'bg-rose-500/15 border-rose-500/35 text-rose-200'
                : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}
          >
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username Column */}
          <div
            className={`rounded-2xl border p-3.5 transition-colors ${
              isDark
                ? 'bg-indigo-950/35 border-indigo-500/25 focus-within:border-emerald-500/60'
                : 'bg-indigo-50/60 border-indigo-200/80 focus-within:border-emerald-500'
            }`}
          >
            <label
              htmlFor="login-username"
              className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${
                isDark ? 'text-indigo-300' : 'text-indigo-700'
              }`}
            >
              Username
            </label>
            <div className="relative flex items-center">
              <User className={`w-4 h-4 mr-2.5 shrink-0 ${isDark ? 'text-indigo-400' : 'text-indigo-500'}`} />
              <input
                id="login-username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username"
                className={`w-full bg-transparent text-sm font-semibold focus:outline-none ${
                  isDark ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'
                }`}
              />
            </div>
          </div>

          {/* Password Column */}
          <div
            className={`rounded-2xl border p-3.5 transition-colors ${
              isDark
                ? 'bg-emerald-950/25 border-emerald-500/25 focus-within:border-emerald-500/60'
                : 'bg-emerald-50/60 border-emerald-200/80 focus-within:border-emerald-500'
            }`}
          >
            <label
              htmlFor="login-password"
              className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${
                isDark ? 'text-emerald-300' : 'text-emerald-700'
              }`}
            >
              Password
            </label>
            <div className="relative flex items-center">
              <Lock className={`w-4 h-4 mr-2.5 shrink-0 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={!isSetupMode ? 'current-password' : 'new-password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password"
                className={`w-full bg-transparent text-sm font-semibold focus:outline-none pr-8 ${
                  isDark ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className={`absolute right-0 p-1 rounded-lg transition-colors ${
                  isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
                }`}
                aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {isSetupMode && (
            <div
              className={`rounded-2xl border p-3.5 transition-colors ${
                isDark
                  ? 'bg-teal-950/25 border-teal-500/25 focus-within:border-emerald-500/60'
                  : 'bg-teal-50/60 border-teal-200/80 focus-within:border-emerald-500'
              }`}
            >
              <label
                htmlFor="login-confirm-password"
                className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${
                  isDark ? 'text-teal-300' : 'text-teal-700'
                }`}
              >
                Konfirmasi Password
              </label>
              <div className="relative flex items-center">
                <Lock className={`w-4 h-4 mr-2.5 shrink-0 ${isDark ? 'text-teal-400' : 'text-teal-600'}`} />
                <input
                  id="login-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi password"
                  className={`w-full bg-transparent text-sm font-semibold focus:outline-none ${
                    isDark ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>
            </div>
          )}

          <motion.button
            whileHover={{ scale: 1.015 }}
            whileTap={{ scale: 0.985 }}
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/30 transition-all flex items-center justify-center space-x-2 disabled:opacity-60 cursor-pointer"
          >
            <LogIn className="w-4 h-4 stroke-[2.5]" />
            <span>
              {isSubmitting
                ? 'Memproses...'
                : !isSetupMode
                  ? 'Masuk ke DompetKu'
                  : 'Simpan & Masuk'}
            </span>
          </motion.button>
        </form>

        <div className="my-5 flex items-center space-x-3">
          <div className={`h-px flex-1 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
          <span className={`text-[11px] font-semibold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            atau sinkronisasi cloud
          </span>
          <div className={`h-px flex-1 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
        </div>

        <motion.button
          whileHover={{ scale: 1.015 }}
          whileTap={{ scale: 0.985 }}
          type="button"
          disabled={isSubmitting}
          onClick={handleGoogleLogin}
          className={`w-full py-3 rounded-2xl border font-bold text-sm transition-all flex items-center justify-center space-x-2.5 disabled:opacity-60 cursor-pointer ${
            isDark
              ? 'bg-sky-500/10 border-sky-500/30 text-sky-200 hover:bg-sky-500/20'
              : 'bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100'
          }`}
        >
          <Cloud className="w-4 h-4 text-sky-500" />
          <span>Masuk dengan Google (Sinkron Antar Perangkat)</span>
        </motion.button>
      </motion.div>
    </div>
  );
}
