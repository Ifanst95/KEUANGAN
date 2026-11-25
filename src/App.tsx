/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Calendar,
  Search,
  Trash2,
  Edit2,
  PieChart as PieChartIcon,
  BarChart3,
  ArrowUpRight,
  ArrowDownLeft,
  FileText,
  AlertCircle,
  Download,
  RefreshCw,
  X,
  ChevronRight,
  Sun,
  Moon,
  LogOut,
  User as UserIcon,
  Check,
  Type,
  RotateCcw,
  Cloud,
  Users,
  Shield
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart as RechartsPie,
  Pie,
  Cell,
  CartesianGrid
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import type { User } from 'firebase/auth';
import LoginView from './components/LoginView';
import UserManagementModal from './components/UserManagementModal';
import {
  subscribeAuthState,
  signInWithGoogle,
  signOutFirebase,
  subscribeToTransactions,
  createTransactionInFirestore,
  updateTransactionInFirestore,
  deleteTransactionInFirestore,
  seedOrResetTransactionsInFirestore,
  subscribeToPreferences,
  savePreferencesInFirestore
} from './firebase';

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  date: string; // YYYY-MM-DD
  description: string;
}

export interface SiteTexts {
  appTitle: string;
  appDescription: string;
  cashflowTitle: string;
  cashflowDescription: string;
  expenseDistTitle: string;
  expenseDistDescription: string;
  recentTitle: string;
  recentDescription: string;
  allTrxTitle: string;
}

const DEFAULT_SITE_TEXTS: SiteTexts = {
  appTitle: 'DompetKu',
  appDescription: 'Pengelola Keuangan & Anggaran Pintar',
  cashflowTitle: 'Arus Kas Bulanan',
  cashflowDescription: 'Perbandingan pemasukan dan pengeluaran per bulan',
  expenseDistTitle: 'Distribusi Pengeluaran',
  expenseDistDescription: 'Berdasarkan kategori',
  recentTitle: 'Transaksi Terbaru',
  recentDescription: 'Aktivitas keuangan terakhir Anda',
  allTrxTitle: 'Daftar Seluruh Transaksi',
};

const INITIAL_TRANSACTIONS: Transaction[] = [
  { id: '1', type: 'income', amount: 12500000, category: 'Gaji', date: '2026-11-01', description: 'Gaji Bulanan Utama' },
  { id: '2', type: 'income', amount: 2500000, category: 'Freelance', date: '2026-11-05', description: 'Proyek Desain Web Klien' },
  { id: '3', type: 'expense', amount: 1500000, category: 'Makanan', date: '2026-11-02', description: 'Belanja bulanan supermarket & makan luar' },
  { id: '4', type: 'expense', amount: 450000, category: 'Transportasi', date: '2026-11-04', description: 'Isi bensin & ojek online' },
  { id: '5', type: 'expense', amount: 3500000, category: 'Tagihan', date: '2026-11-10', description: 'Bayar cicilan kos / sewa & listrik' },
  { id: '6', type: 'expense', amount: 800000, category: 'Hiburan', date: '2026-11-12', description: 'Nonton bioskop & makan bersama teman' },
  { id: '7', type: 'expense', amount: 600000, category: 'Belanja', date: '2026-11-15', description: 'Beli baju baru & perlengkapan kerja' },
  { id: '8', type: 'income', amount: 1200000, category: 'Investasi', date: '2026-11-18', description: 'Dividen saham bulanan' },
];

const INCOME_CATEGORIES = ['Gaji', 'Bonus', 'Freelance', 'Investasi', 'Penjualan', 'Lainnya'];
const EXPENSE_CATEGORIES = ['Makanan', 'Transportasi', 'Tagihan', 'Hiburan', 'Belanja', 'Kesehatan', 'Pendidikan', 'Lainnya'];

const CATEGORY_COLORS: Record<string, string> = {
  Makanan: '#f97316',
  Transportasi: '#3b82f6',
  Tagihan: '#ef4444',
  Hiburan: '#8b5cf6',
  Belanja: '#ec4899',
  Kesehatan: '#10b981',
  Pendidikan: '#06b6d4',
  Lainnya: '#64748b',
  Gaji: '#22c55e',
  Bonus: '#14b8a6',
  Freelance: '#6366f1',
  Investasi: '#84cc16',
  Penjualan: '#eab308'
};

const CATEGORY_DOT_CLASSES: Record<string, string> = {
  Makanan: 'bg-orange-500',
  Transportasi: 'bg-blue-500',
  Tagihan: 'bg-red-500',
  Hiburan: 'bg-violet-500',
  Belanja: 'bg-pink-500',
  Kesehatan: 'bg-emerald-500',
  Pendidikan: 'bg-cyan-500',
  Lainnya: 'bg-slate-500',
  Gaji: 'bg-green-500',
  Bonus: 'bg-teal-500',
  Freelance: 'bg-indigo-500',
  Investasi: 'bg-lime-500',
  Penjualan: 'bg-yellow-500'
};

const CATEGORY_BADGE_DARK: Record<string, string> = {
  Makanan: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  Transportasi: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  Tagihan: 'bg-red-500/15 text-red-300 border-red-500/30',
  Hiburan: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  Belanja: 'bg-pink-500/15 text-pink-300 border-pink-500/30',
  Kesehatan: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  Pendidikan: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  Lainnya: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  Gaji: 'bg-green-500/15 text-green-300 border-green-500/30',
  Bonus: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
  Freelance: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
  Investasi: 'bg-lime-500/15 text-lime-300 border-lime-500/30',
  Penjualan: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30'
};

const CATEGORY_BADGE_LIGHT: Record<string, string> = {
  Makanan: 'bg-orange-50 text-orange-700 border-orange-200',
  Transportasi: 'bg-blue-50 text-blue-700 border-blue-200',
  Tagihan: 'bg-red-50 text-red-700 border-red-200',
  Hiburan: 'bg-violet-50 text-violet-700 border-violet-200',
  Belanja: 'bg-pink-50 text-pink-700 border-pink-200',
  Kesehatan: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Pendidikan: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  Lainnya: 'bg-slate-100 text-slate-700 border-slate-200',
  Gaji: 'bg-green-50 text-green-700 border-green-200',
  Bonus: 'bg-teal-50 text-teal-700 border-teal-200',
  Freelance: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  Investasi: 'bg-lime-50 text-lime-700 border-lime-200',
  Penjualan: 'bg-yellow-50 text-yellow-700 border-yellow-200'
};

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('dompetku_theme') as 'dark' | 'light') || 'dark';
  });

  // In-memory auth session state (never stored in localStorage/sessionStorage)
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [authUser, setAuthUser] = useState<string | null>(null);
  const [authDisplayName, setAuthDisplayName] = useState<string | null>(null);
  const [authRole, setAuthRole] = useState<'admin' | 'user'>('user');
  const [authConfigured, setAuthConfigured] = useState<boolean>(true);
  const [hasAdditionalUsers, setHasAdditionalUsers] = useState<boolean>(false);
  const [authDefaultUsername, setAuthDefaultUsername] = useState<string>('ifan');
  const [authChecking, setAuthChecking] = useState<boolean>(true);

  // Firebase Auth & Cloud Sync state
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [firebaseAuthReady, setFirebaseAuthReady] = useState<boolean>(false);
  const [cloudSyncActive, setCloudSyncActive] = useState<boolean>(false);
  const [cloudSyncLoading, setCloudSyncLoading] = useState<boolean>(false);
  const [cloudSyncError, setCloudSyncError] = useState<string | null>(null);
  const [firestoreFatalError, setFirestoreFatalError] = useState<Error | null>(null);

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('dompetku_transactions');
    return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
  });

  const [siteTexts, setSiteTexts] = useState<SiteTexts>(() => {
    try {
      const saved = localStorage.getItem('dompetku_site_texts');
      if (saved) {
        return { ...DEFAULT_SITE_TEXTS, ...JSON.parse(saved) };
      }
    } catch {
      // Fallback to default if corrupted
    }
    return DEFAULT_SITE_TEXTS;
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions'>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-11'); // YYYY-MM

  // Modal & inline confirmation states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState<boolean>(false);

  // Edit title & description modal states
  const [isTextModalOpen, setIsTextModalOpen] = useState(false);
  const [draftSiteTexts, setDraftSiteTexts] = useState<SiteTexts>(siteTexts);

  // User management modal state (Admin only)
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);

  // Form states
  const [formType, setFormType] = useState<'income' | 'expense'>('expense');
  const [formAmount, setFormAmount] = useState('');
  const [formCategory, setFormCategory] = useState('Makanan');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formDescription, setFormDescription] = useState('');

  // Refs to hold latest values without re-subscribing Firestore listeners
  const transactionsRef = useRef<Transaction[]>(transactions);
  transactionsRef.current = transactions;
  const siteTextsRef = useRef<SiteTexts>(siteTexts);
  siteTextsRef.current = siteTexts;
  const themeRef = useRef<'dark' | 'light'>(theme);
  themeRef.current = theme;
  const hasInitializedCloudTrxRef = useRef<boolean>(false);
  const hasInitializedCloudPrefRef = useRef<boolean>(false);

  const isCloudConnected = Boolean(firebaseUser && firebaseUser.emailVerified);
  const isGoogleAdmin = Boolean(
    isCloudConnected && firebaseUser?.email?.toLowerCase() === 'lastwizard.sand@gmail.com'
  );
  const isAdmin = (Boolean(authToken) && authRole === 'admin') || isGoogleAdmin;

  const getTrxStorageKey = (username: string | null) => {
    if (!username || username.toLowerCase() === authDefaultUsername.toLowerCase()) {
      return 'dompetku_transactions';
    }
    return `dompetku_transactions_${username.toLowerCase()}`;
  };

  const getTextsStorageKey = (username: string | null) => {
    if (!username || username.toLowerCase() === authDefaultUsername.toLowerCase()) {
      return 'dompetku_site_texts';
    }
    return `dompetku_site_texts_${username.toLowerCase()}`;
  };

  // Save theme locally
  useEffect(() => {
    localStorage.setItem('dompetku_theme', theme);
  }, [theme]);

  // Save site texts & sync document title
  useEffect(() => {
    if (authUser || isCloudConnected) {
      localStorage.setItem(getTextsStorageKey(authUser), JSON.stringify(siteTexts));
    }
    document.title = `${siteTexts.appTitle} - ${siteTexts.appDescription}`;
  }, [siteTexts, authUser, isCloudConnected]);

  // Save to localStorage as local cache
  useEffect(() => {
    if (authUser || isCloudConnected) {
      localStorage.setItem(getTrxStorageKey(authUser), JSON.stringify(transactions));
    }
  }, [transactions, authUser, isCloudConnected]);

  // Subscribe to Firebase Auth state
  useEffect(() => {
    const unsubscribe = subscribeAuthState((user) => {
      setFirebaseUser(user);
      setFirebaseAuthReady(true);
      if (!user) {
        hasInitializedCloudTrxRef.current = false;
        hasInitializedCloudPrefRef.current = false;
        setCloudSyncActive(false);
      } else {
        setCloudSyncError(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to real-time Firestore transactions & preferences when Google-authenticated
  useEffect(() => {
    if (!firebaseAuthReady || !firebaseUser || !firebaseUser.emailVerified) {
      setCloudSyncActive(false);
      return;
    }

    const uid = firebaseUser.uid;
    setCloudSyncActive(true);

    const unsubTransactions = subscribeToTransactions(
      uid,
      (items) => {
        if (items.length === 0 && !hasInitializedCloudTrxRef.current) {
          hasInitializedCloudTrxRef.current = true;
          seedOrResetTransactionsInFirestore(uid, transactionsRef.current, false).catch((err) => {
            setFirestoreFatalError(err instanceof Error ? err : new Error(String(err)));
          });
          return;
        }
        hasInitializedCloudTrxRef.current = true;
        setTransactions(items);
      },
      (err) => {
        setFirestoreFatalError(err);
      }
    );

    const unsubPreferences = subscribeToPreferences(
      uid,
      (prefs) => {
        if (!prefs && !hasInitializedCloudPrefRef.current) {
          hasInitializedCloudPrefRef.current = true;
          savePreferencesInFirestore(uid, {
            ...siteTextsRef.current,
            theme: themeRef.current,
          }).catch((err) => {
            setFirestoreFatalError(err instanceof Error ? err : new Error(String(err)));
          });
          return;
        }
        if (prefs) {
          hasInitializedCloudPrefRef.current = true;
          setSiteTexts({
            appTitle: prefs.appTitle,
            appDescription: prefs.appDescription,
            cashflowTitle: prefs.cashflowTitle,
            cashflowDescription: prefs.cashflowDescription,
            expenseDistTitle: prefs.expenseDistTitle,
            expenseDistDescription: prefs.expenseDistDescription,
            recentTitle: prefs.recentTitle,
            recentDescription: prefs.recentDescription,
            allTrxTitle: prefs.allTrxTitle,
          });
          setTheme(prefs.theme);
        }
      },
      (err) => {
        setFirestoreFatalError(err);
      }
    );

    return () => {
      unsubTransactions();
      unsubPreferences();
      setCloudSyncActive(false);
    };
  }, [firebaseAuthReady, firebaseUser]);

  const refreshAuthStatus = async () => {
    try {
      const res = await fetch('/api/auth/status');
      if (res.ok) {
        const data = await res.json();
        setAuthConfigured(Boolean(data?.configured));
        setHasAdditionalUsers(Boolean(data?.hasAdditionalUsers));
        if (typeof data?.defaultUsername === 'string' && data.defaultUsername) {
          setAuthDefaultUsername(data.defaultUsername);
        }
      }
    } catch {
      // Keep defaults if offline
    }
  };

  // Check server auth configuration status on load
  useEffect(() => {
    let active = true;
    const checkStatus = async () => {
      try {
        const res = await fetch('/api/auth/status');
        if (res.ok) {
          const data = await res.json();
          if (active) {
            setAuthConfigured(Boolean(data?.configured));
            setHasAdditionalUsers(Boolean(data?.hasAdditionalUsers));
            if (typeof data?.defaultUsername === 'string' && data.defaultUsername) {
              setAuthDefaultUsername(data.defaultUsername);
            }
          }
        }
      } catch {
        // Keep defaults if offline
      } finally {
        if (active) setAuthChecking(false);
      }
    };
    checkStatus();
    return () => {
      active = false;
    };
  }, []);

  const syncUserWorkspaceToServer = async (
    nextTransactions: Transaction[],
    nextTexts: SiteTexts,
    nextTheme: 'dark' | 'light',
    tokenOverride?: string
  ) => {
    const activeToken = tokenOverride ?? authToken;
    if (!activeToken || isCloudConnected) return;
    try {
      const res = await fetch('/api/user-data', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeToken}`,
        },
        body: JSON.stringify({
          transactions: nextTransactions,
          siteTexts: nextTexts,
          theme: nextTheme,
        }),
      });
      if (res.status === 401 || res.status === 403) {
        setAuthToken(null);
        setAuthUser(null);
        setAuthDisplayName(null);
        setAuthRole('user');
      }
    } catch {
      // Offline fallback uses localStorage cache
    }
  };

  const handleAuthenticated = async (
    token: string,
    username: string,
    role: 'admin' | 'user',
    displayName?: string
  ) => {
    setAuthToken(token);
    setAuthUser(username);
    setAuthRole(role);
    setAuthDisplayName(displayName || username);
    if (username.toLowerCase() === authDefaultUsername.toLowerCase()) {
      setAuthConfigured(true);
    }

    const isPrimary = username.toLowerCase() === authDefaultUsername.toLowerCase();
    const trxKey = getTrxStorageKey(username);
    const textsKey = getTextsStorageKey(username);

    let localTrx: Transaction[] = isPrimary ? INITIAL_TRANSACTIONS : [];
    try {
      const savedTrx = localStorage.getItem(trxKey);
      if (savedTrx) {
        localTrx = JSON.parse(savedTrx);
      }
    } catch {
      // Fallback
    }

    let localTexts: SiteTexts = DEFAULT_SITE_TEXTS;
    try {
      const savedTexts = localStorage.getItem(textsKey);
      if (savedTexts) {
        localTexts = { ...DEFAULT_SITE_TEXTS, ...JSON.parse(savedTexts) };
      }
    } catch {
      // Fallback
    }

    setTransactions(localTrx);
    setSiteTexts(localTexts);

    // Fetch per-user server workspace (isolated per username)
    try {
      const res = await fetch('/api/user-data', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        if (json?.data) {
          if (Array.isArray(json.data.transactions)) {
            setTransactions(json.data.transactions);
          }
          if (json.data.siteTexts) {
            setSiteTexts({ ...DEFAULT_SITE_TEXTS, ...json.data.siteTexts });
          }
          if (json.data.theme === 'light' || json.data.theme === 'dark') {
            setTheme(json.data.theme);
          }
        } else {
          await syncUserWorkspaceToServer(localTrx, localTexts, themeRef.current, token);
        }
      }
    } catch {
      // Ignore network errors
    }
  };

  const getAdminAuthHeader = async (): Promise<string | null> => {
    if (authToken && authRole === 'admin') {
      return `Bearer ${authToken}`;
    }
    if (isGoogleAdmin && firebaseUser) {
      const idToken = await firebaseUser.getIdToken();
      return `Firebase ${idToken}`;
    }
    return null;
  };

  const handleEnableCloudSync = async () => {
    setCloudSyncError(null);
    setCloudSyncLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('popup-closed-by-user')) {
        setCloudSyncError('Login Google dibatalkan.');
      } else {
        setCloudSyncError('Gagal menghubungkan akun Google untuk sinkronisasi cloud.');
      }
    } finally {
      setCloudSyncLoading(false);
    }
  };

  const handleLogout = async () => {
    const tokenToRevoke = authToken;
    setAuthToken(null);
    setAuthUser(null);
    setAuthDisplayName(null);
    setAuthRole('user');
    setIsUserModalOpen(false);
    setCloudSyncError(null);
    if (tokenToRevoke) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${tokenToRevoke}` },
        });
      } catch {
        // Ignore network errors during logout cleanup
      }
    }
    if (firebaseUser) {
      try {
        await signOutFirebase();
      } catch {
        // Ignore sign-out errors
      }
    }
    await refreshAuthStatus();
  };

  // Filtered transactions for selected month and search/filters
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchMonth = selectedMonth === 'all' || t.date.startsWith(selectedMonth);
      const matchType = filterType === 'all' || t.type === filterType;
      const matchCategory = filterCategory === 'all' || t.category === filterCategory;
      const matchSearch =
        t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.category.toLowerCase().includes(searchQuery.toLowerCase());

      return matchMonth && matchType && matchCategory && matchSearch;
    });
  }, [transactions, selectedMonth, filterType, filterCategory, searchQuery]);

  // Available categories for filter dropdown
  const availableCategories = useMemo(() => {
    return Array.from(new Set([...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES]));
  }, []);

  // Statistics calculation for selected month
  const stats = useMemo(() => {
    const monthTransactions = transactions.filter(t => selectedMonth === 'all' || t.date.startsWith(selectedMonth));
    const totalIncome = monthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = monthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const balance = totalIncome - totalExpense;

    return { totalIncome, totalExpense, balance };
  }, [transactions, selectedMonth]);

  // Category breakdown for pie chart
  const categoryChartData = useMemo(() => {
    const monthTransactions = transactions.filter(
      t => t.type === 'expense' && (selectedMonth === 'all' || t.date.startsWith(selectedMonth))
    );
    const map: Record<string, number> = {};
    monthTransactions.forEach(t => {
      map[t.category] = (map[t.category] || 0) + t.amount;
    });
    return Object.keys(map).map(cat => ({
      name: cat,
      value: map[cat],
      color: CATEGORY_COLORS[cat] || '#64748b'
    }));
  }, [transactions, selectedMonth]);

  // Monthly trend data for bar chart
  const monthlyTrendData = useMemo(() => {
    const monthsMap: Record<string, { month: string; income: number; expense: number }> = {};

    transactions.forEach(t => {
      const m = t.date.substring(0, 7); // YYYY-MM
      if (!monthsMap[m]) {
        const [yr, mo] = m.split('-');
        const dateObj = new Date(parseInt(yr), parseInt(mo) - 1, 1);
        const monthLabel = dateObj.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
        monthsMap[m] = { month: monthLabel, income: 0, expense: 0 };
      }
      if (t.type === 'income') {
        monthsMap[m].income += t.amount;
      } else {
        monthsMap[m].expense += t.amount;
      }
    });

    return Object.keys(monthsMap)
      .sort()
      .map(k => monthsMap[k]);
  }, [transactions]);

  // Handlers for Add / Edit modal
  const handleOpenAddModal = (type: 'income' | 'expense') => {
    setEditingTransaction(null);
    setFormError(null);
    setFormType(type);
    setFormAmount('');
    setFormCategory(type === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]);
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormDescription('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (t: Transaction) => {
    setEditingTransaction(t);
    setFormError(null);
    setFormType(t.type);
    setFormAmount(t.amount.toString());
    setFormCategory(t.category);
    setFormDate(t.date);
    setFormDescription(t.description);
    setIsModalOpen(true);
  };

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(formAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError('Masukkan nominal jumlah yang valid lebih dari 0.');
      return;
    }

    const resolvedDescription = formDescription || (formType === 'income' ? 'Pemasukan' : 'Pengeluaran');

    if (editingTransaction) {
      const updatedTrx: Transaction = {
        ...editingTransaction,
        type: formType,
        amount: numAmount,
        category: formCategory,
        date: formDate,
        description: resolvedDescription,
      };
      if (isCloudConnected && firebaseUser) {
        try {
          await updateTransactionInFirestore(firebaseUser.uid, updatedTrx);
        } catch (err) {
          setFirestoreFatalError(err instanceof Error ? err : new Error(String(err)));
          return;
        }
      } else {
        const nextTrxList = transactions.map(t => t.id === editingTransaction.id ? updatedTrx : t);
        setTransactions(nextTrxList);
        syncUserWorkspaceToServer(nextTrxList, siteTexts, theme);
      }
    } else {
      const newTrx: Transaction = {
        id: Date.now().toString(),
        type: formType,
        amount: numAmount,
        category: formCategory,
        date: formDate,
        description: resolvedDescription,
      };
      if (isCloudConnected && firebaseUser) {
        try {
          await createTransactionInFirestore(firebaseUser.uid, newTrx);
        } catch (err) {
          setFirestoreFatalError(err instanceof Error ? err : new Error(String(err)));
          return;
        }
      } else {
        const nextTrxList = [newTrx, ...transactions];
        setTransactions(nextTrxList);
        syncUserWorkspaceToServer(nextTrxList, siteTexts, theme);
      }
    }
    setFormError(null);
    setIsModalOpen(false);
  };

  const handleDeleteTransaction = async (id: string) => {
    if (isCloudConnected && firebaseUser) {
      try {
        await deleteTransactionInFirestore(firebaseUser.uid, id);
      } catch (err) {
        setFirestoreFatalError(err instanceof Error ? err : new Error(String(err)));
        return;
      }
    } else {
      const nextTrxList = transactions.filter(t => t.id !== id);
      setTransactions(nextTrxList);
      syncUserWorkspaceToServer(nextTrxList, siteTexts, theme);
    }
    setConfirmDeleteId(null);
  };

  const handleResetData = async () => {
    if (isCloudConnected && firebaseUser) {
      try {
        await seedOrResetTransactionsInFirestore(firebaseUser.uid, INITIAL_TRANSACTIONS, true);
      } catch (err) {
        setFirestoreFatalError(err instanceof Error ? err : new Error(String(err)));
        return;
      }
    } else {
      setTransactions(INITIAL_TRANSACTIONS);
      localStorage.removeItem(getTrxStorageKey(authUser));
      syncUserWorkspaceToServer(INITIAL_TRANSACTIONS, siteTexts, theme);
    }
    setConfirmReset(false);
  };

  const handleExportPDF = () => {
    window.print();
  };

  const handleOpenTextModal = () => {
    setDraftSiteTexts(siteTexts);
    setIsTextModalOpen(true);
  };

  const handleSaveSiteTexts = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextTexts: SiteTexts = {
      appTitle: draftSiteTexts.appTitle.trim() || DEFAULT_SITE_TEXTS.appTitle,
      appDescription: draftSiteTexts.appDescription.trim() || DEFAULT_SITE_TEXTS.appDescription,
      cashflowTitle: draftSiteTexts.cashflowTitle.trim() || DEFAULT_SITE_TEXTS.cashflowTitle,
      cashflowDescription: draftSiteTexts.cashflowDescription.trim() || DEFAULT_SITE_TEXTS.cashflowDescription,
      expenseDistTitle: draftSiteTexts.expenseDistTitle.trim() || DEFAULT_SITE_TEXTS.expenseDistTitle,
      expenseDistDescription: draftSiteTexts.expenseDistDescription.trim() || DEFAULT_SITE_TEXTS.expenseDistDescription,
      recentTitle: draftSiteTexts.recentTitle.trim() || DEFAULT_SITE_TEXTS.recentTitle,
      recentDescription: draftSiteTexts.recentDescription.trim() || DEFAULT_SITE_TEXTS.recentDescription,
      allTrxTitle: draftSiteTexts.allTrxTitle.trim() || DEFAULT_SITE_TEXTS.allTrxTitle,
    };
    setSiteTexts(nextTexts);
    setIsTextModalOpen(false);
    if (isCloudConnected && firebaseUser) {
      try {
        await savePreferencesInFirestore(firebaseUser.uid, { ...nextTexts, theme });
      } catch (err) {
        setFirestoreFatalError(err instanceof Error ? err : new Error(String(err)));
      }
    } else {
      syncUserWorkspaceToServer(transactions, nextTexts, theme);
    }
  };

  const handleResetSiteTexts = async () => {
    setDraftSiteTexts(DEFAULT_SITE_TEXTS);
    setSiteTexts(DEFAULT_SITE_TEXTS);
    localStorage.removeItem(getTextsStorageKey(authUser));
    if (isCloudConnected && firebaseUser) {
      try {
        await savePreferencesInFirestore(firebaseUser.uid, { ...DEFAULT_SITE_TEXTS, theme });
      } catch (err) {
        setFirestoreFatalError(err instanceof Error ? err : new Error(String(err)));
      }
    } else {
      syncUserWorkspaceToServer(transactions, DEFAULT_SITE_TEXTS, theme);
    }
  };

  const handleToggleTheme = () => {
    const nextTheme: 'dark' | 'light' = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    if (isCloudConnected && firebaseUser) {
      savePreferencesInFirestore(firebaseUser.uid, { ...siteTexts, theme: nextTheme }).catch((err) => {
        setFirestoreFatalError(err instanceof Error ? err : new Error(String(err)));
      });
    } else {
      syncUserWorkspaceToServer(transactions, siteTexts, nextTheme);
    }
  };

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const isDark = theme === 'dark';

  const getCategoryBadgeClass = (category: string) => {
    if (isDark) {
      return CATEGORY_BADGE_DARK[category] || CATEGORY_BADGE_DARK.Lainnya;
    }
    return CATEGORY_BADGE_LIGHT[category] || CATEGORY_BADGE_LIGHT.Lainnya;
  };

  if (firestoreFatalError) {
    throw firestoreFatalError;
  }

  if (authChecking || !firebaseAuthReady) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${
          isDark
            ? 'bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-slate-200'
            : 'bg-gradient-to-br from-slate-50 via-indigo-50/50 to-slate-100 text-slate-800'
        }`}
      >
        <div className="flex flex-col items-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-400 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/30 animate-pulse">
            <Wallet className="w-6 h-6 text-slate-950 stroke-[2.5]" />
          </div>
          <span className="text-xs font-semibold tracking-wide opacity-75">Memeriksa sesi...</span>
        </div>
      </div>
    );
  }

  const isAuthenticated = Boolean((authToken && authUser) || isCloudConnected);
  if (!isAuthenticated) {
    return (
      <LoginView
        isDark={isDark}
        onToggleTheme={handleToggleTheme}
        configured={authConfigured}
        hasAdditionalUsers={hasAdditionalUsers}
        defaultUsername={authDefaultUsername}
        appTitle={siteTexts.appTitle}
        appDescription={siteTexts.appDescription}
        onAuthenticated={handleAuthenticated}
      />
    );
  }

  const displayUser = firebaseUser?.displayName || firebaseUser?.email || authDisplayName || authUser || 'ifan';

  return (
    <div className={`min-h-screen transition-colors duration-500 font-sans pb-20 selection:bg-emerald-500 selection:text-slate-950 print:bg-white print:text-black ${
      isDark ? 'bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-slate-100' : 'bg-gradient-to-br from-slate-50 via-indigo-50/50 to-slate-100 text-slate-900'
    }`}>
      {/* Background Animated Glows */}
      {isDark && (
        <>
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
          <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none animate-pulse [animation-delay:2s]"></div>
        </>
      )}

      {/* Top Navbar */}
      <motion.header
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className={`sticky top-0 z-40 backdrop-blur-2xl border-b shadow-2xl print:hidden transition-colors duration-300 ${
          isDark ? 'bg-slate-900/80 border-slate-800/80' : 'bg-white/80 border-slate-200'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <motion.div
              whileHover={{ rotate: 15, scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-400 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/40 cursor-pointer"
            >
              <Wallet className="w-6 h-6 text-slate-950 stroke-[2.5]" />
            </motion.div>
            <div className="flex items-center space-x-2.5">
              <div>
                <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 bg-clip-text text-transparent">
                  {siteTexts.appTitle}
                </h1>
                <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{siteTexts.appDescription}</p>
              </div>
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                onClick={handleOpenTextModal}
                className={`p-2 rounded-xl border transition-colors ${
                  isDark
                    ? 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-emerald-400 hover:border-emerald-500/40'
                    : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-emerald-600 hover:border-emerald-300'
                }`}
                title="Edit Judul & Deskripsi"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </motion.button>
            </div>
          </div>

          <div className="flex items-center space-x-2.5 sm:space-x-3">
            {/* Cloud Sync Status / Connect Button */}
            {isCloudConnected && cloudSyncActive ? (
              <div
                className={`hidden md:flex items-center space-x-1.5 px-3 py-2 rounded-xl border text-xs font-bold ${
                  isDark
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                }`}
                title={`Sinkronisasi otomatis aktif (${firebaseUser?.email || 'Cloud'})`}
              >
                <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                <span>Tersinkronisasi</span>
              </div>
            ) : (
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={handleEnableCloudSync}
                disabled={cloudSyncLoading}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl border text-xs font-bold shadow-sm transition-colors disabled:opacity-60 ${
                  isDark
                    ? 'bg-sky-500/15 border-sky-500/30 text-sky-200 hover:bg-sky-500/25'
                    : 'bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100'
                }`}
                title="Hubungkan akun Google untuk sinkronisasi otomatis antar perangkat"
              >
                <Cloud className="w-3.5 h-3.5 text-sky-400" />
                <span className="hidden sm:inline">
                  {cloudSyncLoading ? 'Menghubungkan...' : 'Aktifkan Cloud Sync'}
                </span>
              </motion.button>
            )}

            {/* Admin User Management Button */}
            {isAdmin && (
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setIsUserModalOpen(true)}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl border text-xs font-bold shadow-sm transition-colors ${
                  isDark
                    ? 'bg-violet-500/15 border-violet-500/30 text-violet-200 hover:bg-violet-500/25'
                    : 'bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100'
                }`}
                title="Buat user baru & atur akses user"
              >
                <Users className="w-3.5 h-3.5 text-violet-400" />
                <span className="hidden sm:inline">Kelola User</span>
              </motion.button>
            )}

            {/* Active User Badge */}
            <div
              className={`hidden sm:flex items-center space-x-2 px-3 py-2 rounded-xl border text-xs font-bold max-w-[210px] ${
                isDark
                  ? 'bg-indigo-500/10 border-indigo-500/25 text-indigo-200'
                  : 'bg-indigo-50 border-indigo-200 text-indigo-700'
              }`}
              title={`${displayUser} (${isAdmin ? 'Admin' : 'User'})`}
            >
              {isAdmin ? (
                <Shield className="w-3.5 h-3.5 text-violet-400 shrink-0" />
              ) : (
                <UserIcon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              )}
              <span className="truncate">{displayUser}</span>
              <span
                className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                  isAdmin
                    ? 'bg-violet-500/20 text-violet-300'
                    : isDark
                      ? 'bg-sky-500/20 text-sky-300'
                      : 'bg-sky-100 text-sky-700'
                }`}
              >
                {isAdmin ? 'Admin' : 'User'}
              </span>
            </div>

            {/* Theme Toggle Button */}
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={handleToggleTheme}
              className={`p-2.5 rounded-xl border shadow-md transition-colors ${
                isDark ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700' : 'bg-white border-slate-200 text-indigo-600 hover:bg-slate-100'
              }`}
              title={isDark ? 'Ubah ke Tema Terang' : 'Ubah ke Tema Gelap'}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleExportPDF}
              className={`flex items-center space-x-2 px-3.5 sm:px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all shadow-md ${
                isDark ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
              title="Cetak atau Simpan PDF Laporan"
            >
              <Download className="w-4 h-4 text-emerald-500" />
              <span className="hidden sm:inline">Ekspor PDF</span>
            </motion.button>

            {confirmReset ? (
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={handleResetData}
                  className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold shadow-md"
                >
                  Ya, Reset
                </button>
                <button
                  onClick={() => setConfirmReset(false)}
                  className={`px-2.5 py-2 rounded-xl border text-xs font-bold ${
                    isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  Batal
                </button>
              </div>
            ) : (
              <motion.button
                whileHover={{ scale: 1.1, rotate: 180 }}
                whileTap={{ scale: 0.9 }}
                transition={{ duration: 0.4 }}
                onClick={() => setConfirmReset(true)}
                className={`p-2.5 rounded-xl border shadow-md ${
                  isDark ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200' : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
                }`}
                title="Reset Data Contoh"
              >
                <RefreshCw className="w-4 h-4" />
              </motion.button>
            )}

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleLogout}
              className={`flex items-center space-x-1.5 px-3 py-2.5 rounded-xl border text-xs font-bold shadow-md transition-colors ${
                isDark
                  ? 'bg-rose-500/15 border-rose-500/30 text-rose-300 hover:bg-rose-500/25'
                  : 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100'
              }`}
              title="Keluar dari akun"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Keluar</span>
            </motion.button>
          </div>
        </div>
      </motion.header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 relative z-10">
        {cloudSyncError && (
          <div
            className={`mb-6 rounded-2xl border px-4 py-3 text-xs flex items-center justify-between space-x-3 print:hidden ${
              isDark
                ? 'bg-rose-500/15 border-rose-500/35 text-rose-200'
                : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}
          >
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{cloudSyncError}</span>
            </div>
            <button
              type="button"
              onClick={() => setCloudSyncError(null)}
              className="p-1 rounded-lg hover:bg-rose-500/20"
              aria-label="Tutup pesan"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        {/* Navigation Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex space-x-3 overflow-x-auto pb-4 mb-8 print:hidden"
        >
          {[
            { id: 'dashboard', label: 'Dashboard & Grafik', icon: BarChart3 },
            { id: 'transactions', label: 'Pemasukan & Pengeluaran', icon: FileText }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'dashboard' | 'transactions')}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className={`relative flex items-center space-x-2.5 px-6 py-3 rounded-2xl font-bold text-sm transition-all whitespace-nowrap shadow-lg ${
                  isActive
                    ? 'text-slate-950 font-black'
                    : isDark ? 'bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/60' : 'bg-white/80 hover:bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTabGlow"
                    className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-2xl shadow-lg shadow-emerald-500/30 -z-10"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : ''}`} />
                <span>{tab.label}</span>
              </motion.button>
            );
          })}
        </motion.div>

        {/* Month Filter Bar */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className={`backdrop-blur-xl border rounded-3xl p-5 mb-8 flex flex-wrap items-center justify-between gap-4 shadow-2xl transition-colors ${
            isDark
              ? 'bg-gradient-to-r from-slate-800/60 via-emerald-950/20 to-indigo-950/30 border-emerald-500/20'
              : 'bg-gradient-to-r from-white via-emerald-50/40 to-indigo-50/40 border-emerald-200/70 shadow-slate-200/50'
          }`}
        >
          <div className="flex items-center space-x-3">
            <motion.div
              whileHover={{ rotate: 10 }}
              className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-500 shadow-inner"
            >
              <Calendar className="w-5 h-5" />
            </motion.div>
            <div>
              <span className={`block text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Periode Laporan</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className={`bg-transparent font-bold text-base focus:outline-none cursor-pointer ${isDark ? 'text-white' : 'text-slate-900'}`}
              >
                <option value="all" className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>Semua Waktu (Seluruh Riwayat)</option>
                <option value="2026-11" className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>November 2026</option>
                <option value="2026-10" className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>Oktober 2026</option>
                <option value="2026-09" className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>September 2026</option>
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleOpenAddModal('income')}
              className="flex items-center space-x-2 px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm transition-all shadow-lg shadow-emerald-500/30 print:hidden"
            >
              <ArrowDownLeft className="w-4 h-4 stroke-[3]" />
              <span>+ Pemasukan</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleOpenAddModal('expense')}
              className="flex items-center space-x-2 px-5 py-3 rounded-2xl bg-rose-500 hover:bg-rose-400 text-white font-extrabold text-sm transition-all shadow-lg shadow-rose-500/30 print:hidden"
            >
              <ArrowUpRight className="w-4 h-4 stroke-[3]" />
              <span>+ Pengeluaran</span>
            </motion.button>
          </div>
        </motion.div>

        <AnimatePresence mode="wait" initial={false}>
          {/* DASHBOARD TAB */}
          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, x: -24, y: 8 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, x: -24, y: -4 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-8"
            >
            {/* Summary Cards (3 Core Cards with subtle coloring per column) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Column 1: Total Saldo */}
              <motion.div
                whileHover={{ y: -6, scale: 1.01, transition: { type: 'spring', stiffness: 300 } }}
                className={`border rounded-3xl p-6 shadow-2xl relative overflow-hidden group transition-colors ${
                  isDark
                    ? 'bg-gradient-to-br from-emerald-950/45 via-slate-900/95 to-indigo-950/40 border-emerald-500/25'
                    : 'bg-gradient-to-br from-emerald-50/80 via-white to-indigo-50/50 border-emerald-200/80 shadow-emerald-100/50'
                }`}
              >
                <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/25 transition-all"></div>
                <div className="flex items-center justify-between mb-4">
                  <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-emerald-300/80' : 'text-emerald-700'}`}>Total Saldo</span>
                  <motion.div
                    whileHover={{ rotate: 15 }}
                    className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-500 shadow-inner"
                  >
                    <Wallet className="w-6 h-6" />
                  </motion.div>
                </div>
                <div className={`text-3xl sm:text-4xl font-black tracking-tight mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {formatIDR(stats.balance)}
                </div>
                <div className="text-xs text-emerald-500 font-semibold flex items-center space-x-1">
                  <span>Kas bersih aktif saat ini</span>
                </div>
              </motion.div>

              {/* Column 2: Total Pemasukan */}
              <motion.div
                whileHover={{ y: -6, scale: 1.01, transition: { type: 'spring', stiffness: 300 } }}
                className={`border rounded-3xl p-6 shadow-2xl relative overflow-hidden group transition-colors ${
                  isDark
                    ? 'bg-gradient-to-br from-teal-950/45 via-slate-900/95 to-cyan-950/35 border-teal-500/25'
                    : 'bg-gradient-to-br from-teal-50/80 via-white to-cyan-50/60 border-teal-200/80 shadow-teal-100/50'
                }`}
              >
                <div className="absolute top-0 right-0 w-36 h-36 bg-teal-500/10 rounded-full blur-2xl group-hover:bg-teal-500/25 transition-all"></div>
                <div className="flex items-center justify-between mb-4">
                  <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-teal-300/80' : 'text-teal-700'}`}>Total Pemasukan</span>
                  <motion.div
                    whileHover={{ rotate: 15 }}
                    className="w-12 h-12 rounded-2xl bg-teal-500/20 flex items-center justify-center text-teal-500 shadow-inner"
                  >
                    <TrendingUp className="w-6 h-6" />
                  </motion.div>
                </div>
                <div className="text-3xl sm:text-4xl font-black text-teal-500 tracking-tight mb-2">
                  {formatIDR(stats.totalIncome)}
                </div>
                <div className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Periode terpilih
                </div>
              </motion.div>

              {/* Column 3: Total Pengeluaran */}
              <motion.div
                whileHover={{ y: -6, scale: 1.01, transition: { type: 'spring', stiffness: 300 } }}
                className={`border rounded-3xl p-6 shadow-2xl relative overflow-hidden group transition-colors ${
                  isDark
                    ? 'bg-gradient-to-br from-rose-950/45 via-slate-900/95 to-amber-950/25 border-rose-500/25'
                    : 'bg-gradient-to-br from-rose-50/80 via-white to-orange-50/50 border-rose-200/80 shadow-rose-100/50'
                }`}
              >
                <div className="absolute top-0 right-0 w-36 h-36 bg-rose-500/10 rounded-full blur-2xl group-hover:bg-rose-500/25 transition-all"></div>
                <div className="flex items-center justify-between mb-4">
                  <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-rose-300/80' : 'text-rose-700'}`}>Total Pengeluaran</span>
                  <motion.div
                    whileHover={{ rotate: 15 }}
                    className="w-12 h-12 rounded-2xl bg-rose-500/20 flex items-center justify-center text-rose-500 shadow-inner"
                  >
                    <TrendingDown className="w-6 h-6" />
                  </motion.div>
                </div>
                <div className="text-3xl sm:text-4xl font-black text-rose-500 tracking-tight mb-2">
                  {formatIDR(stats.totalExpense)}
                </div>
                <div className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Periode terpilih
                </div>
              </motion.div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Monthly Cashflow Bar Chart */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className={`lg:col-span-2 backdrop-blur-xl border rounded-3xl p-6 shadow-2xl flex flex-col justify-between transition-colors ${
                  isDark
                    ? 'bg-gradient-to-br from-slate-800/70 via-indigo-950/35 to-sky-950/25 border-indigo-500/25'
                    : 'bg-gradient-to-br from-white via-indigo-50/45 to-sky-50/45 border-indigo-200/75 shadow-slate-200/50'
                }`}
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-start space-x-2">
                    <div>
                      <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{siteTexts.cashflowTitle}</h3>
                      <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{siteTexts.cashflowDescription}</p>
                    </div>
                    <button
                      onClick={handleOpenTextModal}
                      className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-slate-500 hover:text-indigo-300 hover:bg-indigo-500/10' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
                      title="Edit Judul & Deskripsi"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                </div>

                {monthlyTrendData.length === 0 || monthlyTrendData.every(d => d.income === 0 && d.expense === 0) ? (
                  <div className="h-80 flex flex-col items-center justify-center text-slate-400 text-sm space-y-3">
                    <div className={`w-16 h-16 rounded-3xl flex items-center justify-center ${isDark ? 'bg-slate-800/80 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                      <BarChart3 className="w-8 h-8 opacity-50" />
                    </div>
                    <p className="font-semibold">Belum ada data pemasukan & pengeluaran untuk ditampilkan</p>
                  </div>
                ) : (
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#cbd5e1'} opacity={0.5} />
                        <XAxis dataKey="month" stroke={isDark ? '#94a3b8' : '#64748b'} fontSize={12} />
                        <YAxis stroke={isDark ? '#94a3b8' : '#64748b'} fontSize={12} tickFormatter={(val) => `Rp ${val / 1000000}jt`} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: isDark ? '#0f172a' : '#ffffff',
                            borderColor: isDark ? '#334155' : '#e2e8f0',
                            borderRadius: '1rem',
                            color: isDark ? '#fff' : '#0f172a'
                          }}
                          formatter={(value: unknown) => [formatIDR(Number(value)), '']}
                        />
                        <Legend />
                        <Bar dataKey="income" name="Pemasukan" fill="#10b981" radius={[8, 8, 0, 0]} />
                        <Bar dataKey="expense" name="Pengeluaran" fill="#f43f5e" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </motion.div>

              {/* Expense Category Pie Chart */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className={`backdrop-blur-xl border rounded-3xl p-6 shadow-2xl flex flex-col justify-between transition-colors ${
                  isDark
                    ? 'bg-gradient-to-br from-slate-800/70 via-rose-950/30 to-violet-950/25 border-rose-500/25'
                    : 'bg-gradient-to-br from-white via-rose-50/45 to-violet-50/40 border-rose-200/75 shadow-slate-200/50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-start space-x-2">
                      <div>
                        <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{siteTexts.expenseDistTitle}</h3>
                        <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{siteTexts.expenseDistDescription}</p>
                      </div>
                      <button
                        onClick={handleOpenTextModal}
                        className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-slate-500 hover:text-rose-300 hover:bg-rose-500/10' : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'}`}
                        title="Edit Judul & Deskripsi"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center text-rose-500">
                      <PieChartIcon className="w-5 h-5" />
                    </div>
                  </div>
                  {categoryChartData.length === 0 ? (
                    <div className="h-60 flex flex-col items-center justify-center text-slate-400 text-sm">
                      <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
                      <span>Belum ada data pengeluaran</span>
                    </div>
                  ) : (
                    <div className="h-60 w-full flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPie>
                          <Pie
                            data={categoryChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {categoryChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: isDark ? '#0f172a' : '#ffffff',
                              borderColor: isDark ? '#334155' : '#e2e8f0',
                              borderRadius: '1rem',
                              color: isDark ? '#fff' : '#0f172a'
                            }}
                            formatter={(value: unknown) => [formatIDR(Number(value)), 'Jumlah']}
                          />
                        </RechartsPie>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
                <div className="mt-4 max-h-36 overflow-y-auto space-y-1.5 pr-1">
                  {categoryChartData.map((item, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center justify-between text-xs px-2.5 py-1.5 rounded-xl border ${
                        isDark ? 'bg-slate-900/50 border-slate-700/50' : 'bg-white/70 border-slate-200/70'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${CATEGORY_DOT_CLASSES[item.name] || 'bg-slate-500'}`}></span>
                        <span className={`font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{item.name}</span>
                      </div>
                      <span className={`font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{formatIDR(item.value)}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Recent Transactions Quick View */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className={`backdrop-blur-xl border rounded-3xl p-6 shadow-2xl transition-colors ${
                isDark
                  ? 'bg-gradient-to-br from-slate-800/65 via-slate-900/80 to-emerald-950/20 border-slate-700/80'
                  : 'bg-gradient-to-br from-white via-slate-50/60 to-emerald-50/30 border-slate-200 shadow-slate-200/50'
              }`}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-start space-x-2">
                  <div>
                    <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{siteTexts.recentTitle}</h3>
                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{siteTexts.recentDescription}</p>
                  </div>
                  <button
                    onClick={handleOpenTextModal}
                    className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-slate-500 hover:text-emerald-300 hover:bg-emerald-500/10' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'}`}
                    title="Edit Judul & Deskripsi"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <motion.button
                  whileHover={{ x: 3 }}
                  onClick={() => setActiveTab('transactions')}
                  className="text-xs font-bold text-emerald-500 hover:text-emerald-400 flex items-center space-x-1"
                >
                  <span>Lihat Semua</span>
                  <ChevronRight className="w-4 h-4" />
                </motion.button>
              </div>

              <div className="space-y-3">
                {filteredTransactions.slice(0, 5).map((t, idx) => (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: idx * 0.05 }}
                    whileHover={{ scale: 1.005 }}
                    className={`grid grid-cols-1 sm:grid-cols-12 items-center gap-3 p-4 rounded-2xl border transition-all ${
                      t.type === 'income'
                        ? isDark
                          ? 'bg-emerald-500/[0.06] hover:bg-emerald-500/[0.11] border-emerald-500/20'
                          : 'bg-emerald-50/60 hover:bg-emerald-50 border-emerald-200/75'
                        : isDark
                          ? 'bg-rose-500/[0.06] hover:bg-rose-500/[0.11] border-rose-500/20'
                          : 'bg-rose-50/60 hover:bg-rose-50 border-rose-200/75'
                    }`}
                  >
                    <div className="sm:col-span-6 flex items-center space-x-4">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold shadow-md shrink-0 ${
                          t.type === 'income'
                            ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-500 border border-rose-500/30'
                        }`}
                      >
                        {t.type === 'income' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                      </div>
                      <div className="min-w-0 flex items-center space-x-2">
                        <h4 className={`text-sm font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.description}</h4>
                        <button
                          onClick={() => handleOpenEditModal(t)}
                          className={`p-1 rounded-lg transition-colors shrink-0 ${
                            isDark ? 'text-slate-500 hover:text-emerald-400 hover:bg-slate-800' : 'text-slate-400 hover:text-emerald-600 hover:bg-white'
                          }`}
                          title="Edit deskripsi / transaksi"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <span className={`text-xs sm:hidden ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t.date}</span>
                      </div>
                    </div>

                    <div className="sm:col-span-2 flex items-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getCategoryBadgeClass(t.category)}`}>
                        {t.category}
                      </span>
                    </div>

                    <div className="hidden sm:flex sm:col-span-2 items-center">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${
                          isDark
                            ? 'bg-sky-500/10 text-sky-300 border-sky-500/20'
                            : 'bg-sky-50 text-sky-700 border-sky-200'
                        }`}
                      >
                        {t.date}
                      </span>
                    </div>

                    <div
                      className={`sm:col-span-2 sm:text-right text-base font-extrabold px-3 py-1.5 rounded-xl border ${
                        t.type === 'income'
                          ? isDark
                            ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                            : 'bg-emerald-100/70 border-emerald-200 text-emerald-700'
                          : isDark
                            ? 'bg-rose-500/10 border-rose-500/25 text-rose-400'
                            : 'bg-rose-100/70 border-rose-200 text-rose-700'
                      }`}
                    >
                      {t.type === 'income' ? '+' : '-'}{formatIDR(t.amount)}
                    </div>
                  </motion.div>
                ))}
                {filteredTransactions.length === 0 && (
                  <div className={`text-center py-12 text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    Tidak ada transaksi dalam periode ini.
                  </div>
                )}
              </div>
            </motion.div>
            </motion.div>
          )}

          {/* TRANSACTIONS TAB */}
          {activeTab === 'transactions' && (
            <motion.div
              key="transactions"
              initial={{ opacity: 0, x: 24, y: 8 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, x: 24, y: -4 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-6"
            >
            {/* Search & Filter Controls */}
            <div
              className={`backdrop-blur-xl border rounded-3xl p-6 shadow-2xl grid grid-cols-1 md:grid-cols-12 gap-4 items-center transition-colors ${
                isDark
                  ? 'bg-gradient-to-r from-slate-800/70 via-indigo-950/30 to-teal-950/25 border-indigo-500/25'
                  : 'bg-gradient-to-r from-white via-indigo-50/40 to-teal-50/40 border-indigo-200/75 shadow-slate-200/50'
              }`}
            >
              <div className="relative md:col-span-6">
                <Search className={`absolute left-4 top-3.5 w-4 h-4 ${isDark ? 'text-indigo-400' : 'text-indigo-500'}`} />
                <input
                  type="text"
                  placeholder="Cari transaksi atau kategori..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full border rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-emerald-500 ${
                    isDark
                      ? 'bg-indigo-950/35 border-indigo-500/25 text-white placeholder-slate-400'
                      : 'bg-indigo-50/50 border-indigo-200 text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>

              <div className="md:col-span-3">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as 'all' | 'income' | 'expense')}
                  className={`w-full border rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-emerald-500 ${
                    isDark
                      ? 'bg-emerald-950/30 border-emerald-500/25 text-slate-200'
                      : 'bg-emerald-50/50 border-emerald-200 text-slate-800'
                  }`}
                >
                  <option value="all" className={isDark ? 'bg-slate-900' : 'bg-white'}>Semua Jenis</option>
                  <option value="income" className={isDark ? 'bg-slate-900' : 'bg-white'}>Pemasukan</option>
                  <option value="expense" className={isDark ? 'bg-slate-900' : 'bg-white'}>Pengeluaran</option>
                </select>
              </div>

              <div className="md:col-span-3">
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className={`w-full border rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-emerald-500 ${
                    isDark
                      ? 'bg-violet-950/30 border-violet-500/25 text-slate-200'
                      : 'bg-violet-50/50 border-violet-200 text-slate-800'
                  }`}
                >
                  <option value="all" className={isDark ? 'bg-slate-900' : 'bg-white'}>Semua Kategori</option>
                  {availableCategories.map((cat) => (
                    <option key={cat} value={cat} className={isDark ? 'bg-slate-900' : 'bg-white'}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Transactions List */}
            <div
              className={`backdrop-blur-xl border rounded-3xl p-6 shadow-2xl transition-colors ${
                isDark
                  ? 'bg-gradient-to-br from-slate-800/65 via-slate-900/80 to-indigo-950/25 border-slate-700/80'
                  : 'bg-gradient-to-br from-white via-slate-50/60 to-indigo-50/30 border-slate-200 shadow-slate-200/50'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <div className="flex items-center space-x-2">
                  <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{siteTexts.allTrxTitle} ({filteredTransactions.length})</h3>
                  <button
                    onClick={handleOpenTextModal}
                    className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-slate-500 hover:text-indigo-300 hover:bg-indigo-500/10' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
                    title="Edit Judul Daftar"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex space-x-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleOpenAddModal('income')}
                    className="px-3.5 py-2 rounded-xl bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 text-xs font-bold hover:bg-emerald-500/30"
                  >
                    + Pemasukan
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleOpenAddModal('expense')}
                    className="px-3.5 py-2 rounded-xl bg-rose-500/20 text-rose-500 border border-rose-500/30 text-xs font-bold hover:bg-rose-500/30"
                  >
                    + Pengeluaran
                  </motion.button>
                </div>
              </div>

              {/* Subtle Colored Table Column Headers */}
              <div className="hidden md:grid md:grid-cols-12 gap-3 px-4 pb-3 mb-3 text-[11px] font-bold uppercase tracking-wider">
                <div className={`md:col-span-5 px-3 py-1.5 rounded-lg border ${isDark ? 'bg-slate-800/70 border-slate-700/60 text-slate-300' : 'bg-slate-100/80 border-slate-200 text-slate-600'}`}>
                  Keterangan
                </div>
                <div className={`md:col-span-2 px-3 py-1.5 rounded-lg border ${isDark ? 'bg-violet-500/10 border-violet-500/20 text-violet-300' : 'bg-violet-50 border-violet-200 text-violet-700'}`}>
                  Kategori
                </div>
                <div className={`md:col-span-2 px-3 py-1.5 rounded-lg border ${isDark ? 'bg-sky-500/10 border-sky-500/20 text-sky-300' : 'bg-sky-50 border-sky-200 text-sky-700'}`}>
                  Tanggal
                </div>
                <div className={`md:col-span-2 px-3 py-1.5 rounded-lg border text-right ${isDark ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                  Nominal
                </div>
                <div className={`md:col-span-1 px-2 py-1.5 rounded-lg border text-center ${isDark ? 'bg-amber-500/10 border-amber-500/20 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                  Aksi
                </div>
              </div>

              <div className="space-y-3">
                {filteredTransactions.map((t, idx) => (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: idx * 0.03 }}
                    whileHover={{ scale: 1.005 }}
                    className={`grid grid-cols-1 md:grid-cols-12 items-center gap-3 p-4 rounded-2xl border transition-all group ${
                      t.type === 'income'
                        ? isDark
                          ? 'bg-emerald-500/[0.06] hover:bg-emerald-500/[0.11] border-emerald-500/20'
                          : 'bg-emerald-50/55 hover:bg-emerald-50 border-emerald-200/75'
                        : isDark
                          ? 'bg-rose-500/[0.06] hover:bg-rose-500/[0.11] border-rose-500/20'
                          : 'bg-rose-50/55 hover:bg-rose-50 border-rose-200/75'
                    }`}
                  >
                    <div className="md:col-span-5 flex items-center space-x-3.5 min-w-0">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold shadow-md shrink-0 ${
                          t.type === 'income'
                            ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-500 border border-rose-500/30'
                        }`}
                      >
                        {t.type === 'income' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                      </div>
                      <h4 className={`text-sm font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.description}</h4>
                    </div>

                    <div className="md:col-span-2 flex items-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getCategoryBadgeClass(t.category)}`}>
                        {t.category}
                      </span>
                    </div>

                    <div className="md:col-span-2 flex items-center">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${
                          isDark
                            ? 'bg-sky-500/10 text-sky-300 border-sky-500/20'
                            : 'bg-sky-50 text-sky-700 border-sky-200'
                        }`}
                      >
                        {t.date}
                      </span>
                    </div>

                    <div
                      className={`md:col-span-2 md:text-right text-sm sm:text-base font-extrabold px-3 py-1.5 rounded-xl border ${
                        t.type === 'income'
                          ? isDark
                            ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                            : 'bg-emerald-100/70 border-emerald-200 text-emerald-700'
                          : isDark
                            ? 'bg-rose-500/10 border-rose-500/25 text-rose-400'
                            : 'bg-rose-100/70 border-rose-200 text-rose-700'
                      }`}
                    >
                      {t.type === 'income' ? '+' : '-'}{formatIDR(t.amount)}
                    </div>

                    <div className="md:col-span-1 flex items-center justify-end md:justify-center space-x-1">
                      {confirmDeleteId === t.id ? (
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleDeleteTransaction(t.id)}
                            className="p-1.5 rounded-lg bg-rose-500 text-white hover:bg-rose-400"
                            title="Konfirmasi Hapus"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className={`p-1.5 rounded-lg border ${isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600'}`}
                            title="Batal"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1 md:opacity-80 group-hover:opacity-100 transition-opacity">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleOpenEditModal(t)}
                            className={`p-2 rounded-xl border ${isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'}`}
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setConfirmDeleteId(t.id)}
                            className="p-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-500 border border-rose-500/30"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </motion.button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
                {filteredTransactions.length === 0 && (
                  <div className={`text-center py-16 text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    Tidak ada transaksi yang cocok dengan filter pencarian.
                  </div>
                )}
              </div>
            </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* TRANSACTION MODAL (Add / Edit) */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className={`border rounded-3xl w-full max-w-lg p-6 shadow-2xl transition-colors ${
                isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-xl'
              }`}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {editingTransaction ? 'Edit Transaksi' : formType === 'income' ? 'Tambah Pemasukan Baru' : 'Tambah Pengeluaran Baru'}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className={`p-2 rounded-xl border ${isDark ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white' : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'}`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {formError && (
                <div
                  className={`mb-4 rounded-xl border p-3 text-xs flex items-center space-x-2 ${
                    isDark ? 'bg-rose-500/15 border-rose-500/35 text-rose-200' : 'bg-rose-50 border-rose-200 text-rose-700'
                  }`}
                >
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSaveTransaction} className="space-y-4">
                <div className={`flex space-x-2 p-1 rounded-2xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
                  <button
                    type="button"
                    onClick={() => {
                      setFormType('expense');
                      setFormCategory(EXPENSE_CATEGORIES[0]);
                    }}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      formType === 'expense' ? 'bg-rose-500 text-white shadow-md' : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Pengeluaran
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormType('income');
                      setFormCategory(INCOME_CATEGORIES[0]);
                    }}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      formType === 'income' ? 'bg-emerald-500 text-slate-950 shadow-md font-black' : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Pemasukan
                  </button>
                </div>

                <div
                  className={`rounded-2xl border p-3 ${
                    formType === 'income'
                      ? isDark
                        ? 'bg-emerald-950/30 border-emerald-500/25'
                        : 'bg-emerald-50/60 border-emerald-200'
                      : isDark
                        ? 'bg-rose-950/30 border-rose-500/25'
                        : 'bg-rose-50/60 border-rose-200'
                  }`}
                >
                  <label className={`block text-xs font-bold mb-1.5 uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Nominal (Rp)</label>
                  <input
                    type="number"
                    required
                    placeholder="Contoh: 150000"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className={`w-full bg-transparent text-base font-bold focus:outline-none ${
                      isDark ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>

                <div
                  className={`rounded-2xl border p-3 ${
                    isDark ? 'bg-indigo-950/30 border-indigo-500/25' : 'bg-indigo-50/60 border-indigo-200'
                  }`}
                >
                  <label className={`block text-xs font-bold mb-1.5 uppercase tracking-wider ${isDark ? 'text-indigo-300' : 'text-indigo-700'}`}>Kategori</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className={`w-full bg-transparent text-sm font-semibold focus:outline-none ${
                      isDark ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    {(formType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(cat => (
                      <option key={cat} value={cat} className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div
                  className={`rounded-2xl border p-3 ${
                    isDark ? 'bg-sky-950/30 border-sky-500/25' : 'bg-sky-50/60 border-sky-200'
                  }`}
                >
                  <label className={`block text-xs font-bold mb-1.5 uppercase tracking-wider ${isDark ? 'text-sky-300' : 'text-sky-700'}`}>Tanggal</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className={`w-full bg-transparent text-sm font-semibold focus:outline-none ${
                      isDark ? 'text-white' : 'text-slate-900'
                    }`}
                  />
                </div>

                <div
                  className={`rounded-2xl border p-3 ${
                    isDark ? 'bg-amber-950/20 border-amber-500/25' : 'bg-amber-50/50 border-amber-200'
                  }`}
                >
                  <label className={`block text-xs font-bold mb-1.5 uppercase tracking-wider ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>Keterangan / Detail</label>
                  <input
                    type="text"
                    placeholder="Misal: Beli makan siang, bayar listrik..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className={`w-full bg-transparent text-sm font-medium focus:outline-none ${
                      isDark ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>

                <div className="pt-4 flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className={`flex-1 py-3 rounded-xl border font-bold text-sm transition-all ${
                      isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Batal
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all shadow-lg ${
                      formType === 'income' ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-emerald-500/20 font-black' : 'bg-rose-500 text-white hover:bg-rose-400 shadow-rose-500/20'
                    }`}
                  >
                    {editingTransaction ? 'Simpan Perubahan' : 'Tambah Transaksi'}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT TITLE & DESCRIPTION MODAL */}
      <AnimatePresence>
        {isTextModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className={`border rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl transition-colors ${
                isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-xl'
              }`}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                    <Type className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Edit Judul &amp; Deskripsi</h3>
                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Sesuaikan judul dan keterangan di seluruh halaman</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsTextModalOpen(false)}
                  className={`p-2 rounded-xl border ${isDark ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white' : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'}`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveSiteTexts} className="space-y-4">
                {/* Brand Title & Description Column */}
                <div className={`rounded-2xl border p-4 space-y-3 ${isDark ? 'bg-emerald-950/25 border-emerald-500/25' : 'bg-emerald-50/55 border-emerald-200'}`}>
                  <span className={`block text-xs font-extrabold uppercase tracking-wider ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>
                    Header &amp; Identitas Aplikasi
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={`block text-[11px] font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Judul Utama</label>
                      <input
                        type="text"
                        required
                        value={draftSiteTexts.appTitle}
                        onChange={(e) => setDraftSiteTexts({ ...draftSiteTexts, appTitle: e.target.value })}
                        className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-bold focus:outline-none focus:border-emerald-500 ${
                          isDark ? 'bg-slate-950/70 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                        }`}
                      />
                    </div>
                    <div>
                      <label className={`block text-[11px] font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Deskripsi Utama</label>
                      <input
                        type="text"
                        required
                        value={draftSiteTexts.appDescription}
                        onChange={(e) => setDraftSiteTexts({ ...draftSiteTexts, appDescription: e.target.value })}
                        className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:border-emerald-500 ${
                          isDark ? 'bg-slate-950/70 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Cashflow Chart Column */}
                <div className={`rounded-2xl border p-4 space-y-3 ${isDark ? 'bg-indigo-950/25 border-indigo-500/25' : 'bg-indigo-50/55 border-indigo-200'}`}>
                  <span className={`block text-xs font-extrabold uppercase tracking-wider ${isDark ? 'text-indigo-300' : 'text-indigo-700'}`}>
                    Bagian Grafik Arus Kas
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={`block text-[11px] font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Judul Grafik</label>
                      <input
                        type="text"
                        required
                        value={draftSiteTexts.cashflowTitle}
                        onChange={(e) => setDraftSiteTexts({ ...draftSiteTexts, cashflowTitle: e.target.value })}
                        className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-bold focus:outline-none focus:border-indigo-500 ${
                          isDark ? 'bg-slate-950/70 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                        }`}
                      />
                    </div>
                    <div>
                      <label className={`block text-[11px] font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Deskripsi Grafik</label>
                      <input
                        type="text"
                        required
                        value={draftSiteTexts.cashflowDescription}
                        onChange={(e) => setDraftSiteTexts({ ...draftSiteTexts, cashflowDescription: e.target.value })}
                        className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:border-indigo-500 ${
                          isDark ? 'bg-slate-950/70 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Expense Distribution Chart Column */}
                <div className={`rounded-2xl border p-4 space-y-3 ${isDark ? 'bg-rose-950/25 border-rose-500/25' : 'bg-rose-50/55 border-rose-200'}`}>
                  <span className={`block text-xs font-extrabold uppercase tracking-wider ${isDark ? 'text-rose-300' : 'text-rose-700'}`}>
                    Bagian Distribusi Pengeluaran
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={`block text-[11px] font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Judul Bagian</label>
                      <input
                        type="text"
                        required
                        value={draftSiteTexts.expenseDistTitle}
                        onChange={(e) => setDraftSiteTexts({ ...draftSiteTexts, expenseDistTitle: e.target.value })}
                        className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-bold focus:outline-none focus:border-rose-500 ${
                          isDark ? 'bg-slate-950/70 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                        }`}
                      />
                    </div>
                    <div>
                      <label className={`block text-[11px] font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Deskripsi Bagian</label>
                      <input
                        type="text"
                        required
                        value={draftSiteTexts.expenseDistDescription}
                        onChange={(e) => setDraftSiteTexts({ ...draftSiteTexts, expenseDistDescription: e.target.value })}
                        className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:border-rose-500 ${
                          isDark ? 'bg-slate-950/70 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Transactions Section Titles Column */}
                <div className={`rounded-2xl border p-4 space-y-3 ${isDark ? 'bg-amber-950/20 border-amber-500/25' : 'bg-amber-50/55 border-amber-200'}`}>
                  <span className={`block text-xs font-extrabold uppercase tracking-wider ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                    Bagian Daftar Transaksi
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className={`block text-[11px] font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Judul Transaksi Terbaru</label>
                      <input
                        type="text"
                        required
                        value={draftSiteTexts.recentTitle}
                        onChange={(e) => setDraftSiteTexts({ ...draftSiteTexts, recentTitle: e.target.value })}
                        className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-bold focus:outline-none focus:border-amber-500 ${
                          isDark ? 'bg-slate-950/70 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                        }`}
                      />
                    </div>
                    <div>
                      <label className={`block text-[11px] font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Deskripsi Transaksi Terbaru</label>
                      <input
                        type="text"
                        required
                        value={draftSiteTexts.recentDescription}
                        onChange={(e) => setDraftSiteTexts({ ...draftSiteTexts, recentDescription: e.target.value })}
                        className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:border-amber-500 ${
                          isDark ? 'bg-slate-950/70 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                        }`}
                      />
                    </div>
                    <div>
                      <label className={`block text-[11px] font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Judul Seluruh Transaksi</label>
                      <input
                        type="text"
                        required
                        value={draftSiteTexts.allTrxTitle}
                        onChange={(e) => setDraftSiteTexts({ ...draftSiteTexts, allTrxTitle: e.target.value })}
                        className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-bold focus:outline-none focus:border-amber-500 ${
                          isDark ? 'bg-slate-950/70 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-3 flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={handleResetSiteTexts}
                    className={`flex items-center space-x-1.5 px-4 py-2.5 rounded-xl border text-xs font-bold transition-colors ${
                      isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Default</span>
                  </button>
                  <div className="flex space-x-2.5">
                    <button
                      type="button"
                      onClick={() => setIsTextModalOpen(false)}
                      className={`px-5 py-2.5 rounded-xl border font-bold text-sm transition-all ${
                        isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      Batal
                    </button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/25"
                    >
                      Simpan Perubahan
                    </motion.button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* USER MANAGEMENT MODAL (Admin Only) */}
      {isAdmin && (
        <UserManagementModal
          isOpen={isUserModalOpen}
          onClose={() => {
            setIsUserModalOpen(false);
            refreshAuthStatus();
          }}
          isDark={isDark}
          currentUsername={authUser || firebaseUser?.email || ''}
          getAuthHeader={getAdminAuthHeader}
        />
      )}
    </div>
  );
}
