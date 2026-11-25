import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  User as UserIcon,
  X,
  Check,
  Trash2,
  KeyRound,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Power
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface ManagedUser {
  username: string;
  displayName: string;
  role: 'admin' | 'user';
  active: boolean;
  createdAt: string | null;
  createdBy: string;
  isPrimaryAdmin: boolean;
}

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  currentUsername: string;
  getAuthHeader: () => Promise<string | null>;
}

export default function UserManagementModal({
  isOpen,
  onClose,
  isDark,
  currentUsername,
  getAuthHeader,
}: UserManagementModalProps) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // New user form
  const [newUsername, setNewUsername] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'user' | 'admin'>('user');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Per-row inline actions
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<string | null>(null);
  const [resetPwdUser, setResetPwdUser] = useState<string | null>(null);
  const [resetPwdValue, setResetPwdValue] = useState('');

  const fetchUsers = useCallback(async () => {
    const authHeader = await getAuthHeader();
    if (!authHeader) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/users', {
        headers: { Authorization: authHeader },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Gagal memuat daftar user.');
        return;
      }
      if (Array.isArray(data?.users)) {
        setUsers(data.users);
      }
    } catch {
      setError('Tidak dapat terhubung ke server.');
    } finally {
      setLoading(false);
    }
  }, [getAuthHeader]);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccessMsg(null);
      setConfirmDeleteUser(null);
      setResetPwdUser(null);
      setResetPwdValue('');
      fetchUsers();
    }
  }, [isOpen, fetchUsers]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const trimmedUsername = newUsername.trim();
    if (!/^[a-zA-Z0-9._-]{2,32}$/.test(trimmedUsername)) {
      setError('Username harus 2-32 karakter (huruf, angka, titik, garis bawah, atau hubung).');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password minimal 6 karakter.');
      return;
    }

    const authHeader = await getAuthHeader();
    if (!authHeader) {
      setError('Sesi admin tidak valid.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify({
          username: trimmedUsername,
          displayName: newDisplayName.trim() || trimmedUsername,
          password: newPassword,
          role: newRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Gagal membuat user baru.');
        return;
      }
      setNewUsername('');
      setNewDisplayName('');
      setNewPassword('');
      setNewRole('user');
      setSuccessMsg(`User "${trimmedUsername}" berhasil dibuat dan siap digunakan untuk login.`);
      await fetchUsers();
    } catch {
      setError('Gagal terhubung ke server.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (user: ManagedUser) => {
    setError(null);
    setSuccessMsg(null);
    const authHeader = await getAuthHeader();
    if (!authHeader) return;

    try {
      const res = await fetch(`/api/users/${encodeURIComponent(user.username)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify({ active: !user.active }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Gagal memperbarui status user.');
        return;
      }
      setSuccessMsg(
        `Akses user "${user.username}" ${!user.active ? 'diaktifkan' : 'dinonaktifkan'}.`
      );
      await fetchUsers();
    } catch {
      setError('Gagal memperbarui status user.');
    }
  };

  const handleToggleRole = async (user: ManagedUser) => {
    setError(null);
    setSuccessMsg(null);
    const authHeader = await getAuthHeader();
    if (!authHeader) return;
    const nextRole: 'admin' | 'user' = user.role === 'admin' ? 'user' : 'admin';

    try {
      const res = await fetch(`/api/users/${encodeURIComponent(user.username)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify({ role: nextRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Gagal mengubah peran user.');
        return;
      }
      setSuccessMsg(`Peran "${user.username}" diubah menjadi ${nextRole === 'admin' ? 'Admin' : 'User'}.`);
      await fetchUsers();
    } catch {
      setError('Gagal mengubah peran user.');
    }
  };

  const handleResetPassword = async (username: string) => {
    setError(null);
    setSuccessMsg(null);
    if (resetPwdValue.length < 6) {
      setError('Password baru minimal 6 karakter.');
      return;
    }
    const authHeader = await getAuthHeader();
    if (!authHeader) return;

    try {
      const res = await fetch(`/api/users/${encodeURIComponent(username)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify({ password: resetPwdValue }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Gagal mereset password.');
        return;
      }
      setResetPwdUser(null);
      setResetPwdValue('');
      setSuccessMsg(`Password untuk "${username}" berhasil diperbarui.`);
    } catch {
      setError('Gagal mereset password.');
    }
  };

  const handleDeleteUser = async (username: string) => {
    setError(null);
    setSuccessMsg(null);
    const authHeader = await getAuthHeader();
    if (!authHeader) return;

    try {
      const res = await fetch(`/api/users/${encodeURIComponent(username)}`, {
        method: 'DELETE',
        headers: { Authorization: authHeader },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Gagal menghapus user.');
        return;
      }
      setConfirmDeleteUser(null);
      setSuccessMsg(`User "${username}" berhasil dihapus.`);
      await fetchUsers();
    } catch {
      setError('Gagal menghapus user.');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className={`border rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl transition-colors ${
              isDark
                ? 'bg-slate-900 border-slate-700 text-white'
                : 'bg-white border-slate-200 text-slate-900 shadow-xl'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Kelola User &amp; Akses
                  </h3>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Buat akun baru agar user lain dapat login dan mengelola keuangannya sendiri
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className={`p-2 rounded-xl border ${
                  isDark
                    ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                    : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div
                className={`mb-4 rounded-2xl border p-3 text-xs flex items-center space-x-2 ${
                  isDark
                    ? 'bg-rose-500/15 border-rose-500/35 text-rose-200'
                    : 'bg-rose-50 border-rose-200 text-rose-700'
                }`}
              >
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div
                className={`mb-4 rounded-2xl border p-3 text-xs flex items-center space-x-2 ${
                  isDark
                    ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-200'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Create New User Form */}
            <form
              onSubmit={handleCreateUser}
              className={`rounded-2xl border p-4 mb-6 space-y-4 ${
                isDark
                  ? 'bg-gradient-to-br from-emerald-950/30 via-slate-900/70 to-indigo-950/30 border-emerald-500/25'
                  : 'bg-gradient-to-br from-emerald-50/70 via-white to-indigo-50/50 border-emerald-200'
              }`}
            >
              <div className="flex items-center space-x-2">
                <UserPlus className="w-4 h-4 text-emerald-500" />
                <span
                  className={`text-xs font-extrabold uppercase tracking-wider ${
                    isDark ? 'text-emerald-300' : 'text-emerald-700'
                  }`}
                >
                  Buat User Baru
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  className={`rounded-xl border p-3 ${
                    isDark ? 'bg-indigo-950/30 border-indigo-500/25' : 'bg-indigo-50/50 border-indigo-200'
                  }`}
                >
                  <label
                    className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${
                      isDark ? 'text-indigo-300' : 'text-indigo-700'
                    }`}
                  >
                    Username Login
                  </label>
                  <input
                    type="text"
                    required
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="misal: budi"
                    className={`w-full bg-transparent text-sm font-semibold focus:outline-none ${
                      isDark ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>

                <div
                  className={`rounded-xl border p-3 ${
                    isDark ? 'bg-sky-950/30 border-sky-500/25' : 'bg-sky-50/50 border-sky-200'
                  }`}
                >
                  <label
                    className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${
                      isDark ? 'text-sky-300' : 'text-sky-700'
                    }`}
                  >
                    Nama Tampilan (Opsional)
                  </label>
                  <input
                    type="text"
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                    placeholder="misal: Budi Santoso"
                    className={`w-full bg-transparent text-sm font-semibold focus:outline-none ${
                      isDark ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>

                <div
                  className={`rounded-xl border p-3 ${
                    isDark ? 'bg-emerald-950/25 border-emerald-500/25' : 'bg-emerald-50/50 border-emerald-200'
                  }`}
                >
                  <label
                    className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${
                      isDark ? 'text-emerald-300' : 'text-emerald-700'
                    }`}
                  >
                    Password (Min. 6 Karakter)
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Masukkan password"
                      className={`w-full bg-transparent text-sm font-semibold focus:outline-none pr-7 ${
                        isDark ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((prev) => !prev)}
                      className={`absolute right-0 p-1 rounded-lg ${
                        isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
                      }`}
                      aria-label={showNewPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                    >
                      {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div
                  className={`rounded-xl border p-3 ${
                    isDark ? 'bg-violet-950/30 border-violet-500/25' : 'bg-violet-50/50 border-violet-200'
                  }`}
                >
                  <label
                    className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${
                      isDark ? 'text-violet-300' : 'text-violet-700'
                    }`}
                  >
                    Peran / Level Akses
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value === 'admin' ? 'admin' : 'user')}
                    className={`w-full bg-transparent text-sm font-semibold focus:outline-none cursor-pointer ${
                      isDark ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    <option value="user" className={isDark ? 'bg-slate-900' : 'bg-white'}>
                      User (Akses Keuangan Pribadi)
                    </option>
                    <option value="admin" className={isDark ? 'bg-slate-900' : 'bg-white'}>
                      Admin (Kelola User &amp; Akses)
                    </option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/25 disabled:opacity-60 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4 stroke-[2.5]" />
                  <span>{submitting ? 'Menyimpan...' : 'Tambah User Baru'}</span>
                </motion.button>
              </div>
            </form>

            {/* Existing Users List */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4
                  className={`text-xs font-extrabold uppercase tracking-wider ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  }`}
                >
                  Daftar Akun Terdaftar ({users.length})
                </h4>
              </div>

              {loading ? (
                <div className={`py-8 text-center text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Memuat daftar user...
                </div>
              ) : users.length === 0 ? (
                <div className={`py-8 text-center text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  Belum ada akun user terdaftar.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {users.map((u) => {
                    const isSelf = u.username.toLowerCase() === currentUsername.toLowerCase();
                    const canModify = !u.isPrimaryAdmin && !isSelf;

                    return (
                      <div
                        key={u.username}
                        className={`rounded-2xl border p-3.5 transition-colors ${
                          u.active
                            ? isDark
                              ? 'bg-slate-800/60 border-slate-700/80'
                              : 'bg-slate-50/80 border-slate-200'
                            : isDark
                              ? 'bg-rose-950/20 border-rose-500/25 opacity-80'
                              : 'bg-rose-50/50 border-rose-200 opacity-85'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center space-x-3 min-w-0">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                u.role === 'admin'
                                  ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                                  : 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                              }`}
                            >
                              {u.role === 'admin' ? (
                                <Shield className="w-4 h-4" />
                              ) : (
                                <UserIcon className="w-4 h-4" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center space-x-2">
                                <span
                                  className={`text-sm font-bold truncate ${
                                    isDark ? 'text-white' : 'text-slate-900'
                                  }`}
                                >
                                  {u.displayName}
                                </span>
                                {isSelf && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                    Anda
                                  </span>
                                )}
                              </div>
                              <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                @{u.username}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {/* Role Badge / Toggle */}
                            <button
                              type="button"
                              disabled={!canModify}
                              onClick={() => handleToggleRole(u)}
                              title={canModify ? 'Klik untuk ubah peran Admin/User' : 'Peran akun utama'}
                              className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors ${
                                u.role === 'admin'
                                  ? isDark
                                    ? 'bg-violet-500/15 border-violet-500/30 text-violet-300'
                                    : 'bg-violet-50 border-violet-200 text-violet-700'
                                  : isDark
                                    ? 'bg-sky-500/15 border-sky-500/30 text-sky-300'
                                    : 'bg-sky-50 border-sky-200 text-sky-700'
                              } ${canModify ? 'hover:opacity-80 cursor-pointer' : 'cursor-default'}`}
                            >
                              {u.role === 'admin' ? 'Admin' : 'User'}
                            </button>

                            {/* Active Status Badge */}
                            <span
                              className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                                u.active
                                  ? isDark
                                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                                    : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                  : isDark
                                    ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                                    : 'bg-rose-50 border-rose-200 text-rose-700'
                              }`}
                            >
                              {u.active ? 'Aktif' : 'Nonaktif'}
                            </span>

                            {/* Action Buttons for created users */}
                            {canModify && (
                              <div className="flex items-center space-x-1">
                                <button
                                  type="button"
                                  onClick={() => handleToggleActive(u)}
                                  className={`p-1.5 rounded-lg border transition-colors ${
                                    u.active
                                      ? isDark
                                        ? 'bg-amber-500/15 border-amber-500/30 text-amber-300 hover:bg-amber-500/25'
                                        : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                                      : isDark
                                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25'
                                        : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                                  }`}
                                  title={u.active ? 'Nonaktifkan Akses' : 'Aktifkan Akses'}
                                >
                                  <Power className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setResetPwdUser(resetPwdUser === u.username ? null : u.username);
                                    setResetPwdValue('');
                                  }}
                                  className={`p-1.5 rounded-lg border transition-colors ${
                                    isDark
                                      ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                                  }`}
                                  title="Ubah Password User"
                                >
                                  <KeyRound className="w-3.5 h-3.5" />
                                </button>

                                {confirmDeleteUser === u.username ? (
                                  <div className="flex items-center space-x-1">
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteUser(u.username)}
                                      className="p-1.5 rounded-lg bg-rose-500 text-white hover:bg-rose-400"
                                      title="Konfirmasi Hapus"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteUser(null)}
                                      className={`p-1.5 rounded-lg border ${
                                        isDark
                                          ? 'bg-slate-800 border-slate-700 text-slate-300'
                                          : 'bg-white border-slate-200 text-slate-600'
                                      }`}
                                      title="Batal"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteUser(u.username)}
                                    className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-500 border border-rose-500/30"
                                    title="Hapus User"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Inline Reset Password Bar */}
                        {resetPwdUser === u.username && (
                          <div className="mt-3 pt-3 border-t border-slate-700/30 flex flex-wrap items-center gap-2">
                            <input
                              type="password"
                              value={resetPwdValue}
                              onChange={(e) => setResetPwdValue(e.target.value)}
                              placeholder={`Password baru untuk ${u.username} (min. 6 karakter)`}
                              className={`flex-1 min-w-[200px] rounded-xl border px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-emerald-500 ${
                                isDark
                                  ? 'bg-slate-950/70 border-slate-700 text-white'
                                  : 'bg-white border-slate-200 text-slate-900'
                              }`}
                            />
                            <button
                              type="button"
                              onClick={() => handleResetPassword(u.username)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold"
                            >
                              Simpan Password
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setResetPwdUser(null);
                                setResetPwdValue('');
                              }}
                              className={`px-3 py-1.5 rounded-xl border text-xs font-bold ${
                                isDark
                                  ? 'bg-slate-800 border-slate-700 text-slate-300'
                                  : 'bg-white border-slate-200 text-slate-600'
                              }`}
                            >
                              Batal
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
