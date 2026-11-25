/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
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
  Moon
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

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  date: string; // YYYY-MM-DD
  description: string;
}

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

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('dompetku_theme') as 'dark' | 'light') || 'dark';
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('dompetku_transactions');
    return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions'>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-11'); // YYYY-MM

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Form states
  const [formType, setFormType] = useState<'income' | 'expense'>('expense');
  const [formAmount, setFormAmount] = useState('');
  const [formCategory, setFormCategory] = useState('Makanan');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formDescription, setFormDescription] = useState('');

  // Save theme
  useEffect(() => {
    localStorage.setItem('dompetku_theme', theme);
  }, [theme]);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('dompetku_transactions', JSON.stringify(transactions));
  }, [transactions]);

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
    setFormType(type);
    setFormAmount('');
    setFormCategory(type === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]);
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormDescription('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (t: Transaction) => {
    setEditingTransaction(t);
    setFormType(t.type);
    setFormAmount(t.amount.toString());
    setFormCategory(t.category);
    setFormDate(t.date);
    setFormDescription(t.description);
    setIsModalOpen(true);
  };

  const handleSaveTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(formAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      alert('Masukkan nominal jumlah yang valid!');
      return;
    }

    if (editingTransaction) {
      setTransactions(transactions.map(t => t.id === editingTransaction.id ? {
        ...t,
        type: formType,
        amount: numAmount,
        category: formCategory,
        date: formDate,
        description: formDescription || (formType === 'income' ? 'Pemasukan' : 'Pengeluaran')
      } : t));
    } else {
      const newTrx: Transaction = {
        id: Date.now().toString(),
        type: formType,
        amount: numAmount,
        category: formCategory,
        date: formDate,
        description: formDescription || (formType === 'income' ? 'Pemasukan' : 'Pengeluaran')
      };
      setTransactions([newTrx, ...transactions]);
    }
    setIsModalOpen(false);
  };

  const handleDeleteTransaction = (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus transaksi ini?')) {
      setTransactions(transactions.filter(t => t.id !== id));
    }
  };

  const handleResetData = () => {
    if (confirm('Reset data ke contoh awal? Semua perubahan kustom Anda akan diganti.')) {
      setTransactions(INITIAL_TRANSACTIONS);
      localStorage.removeItem('dompetku_transactions');
    }
  };

  const handleExportPDF = () => {
    window.print();
  };

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen transition-colors duration-500 font-sans pb-20 selection:bg-emerald-500 selection:text-slate-950 print:bg-white print:text-black ${
      isDark ? 'bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-slate-100' : 'bg-gradient-to-br from-slate-50 via-indigo-50/50 to-slate-100 text-slate-900'
    }`}>
      {/* Background Animated Glows */}
      {isDark && (
        <>
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
          <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDelay: '2s' }}></div>
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
            <div>
              <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 bg-clip-text text-transparent">
                DompetKu
              </h1>
              <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Pengelola Keuangan & Anggaran Pintar</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Theme Toggle Button */}
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
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
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all shadow-md ${
                isDark ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
              title="Cetak atau Simpan PDF Laporan"
            >
              <Download className="w-4 h-4 text-emerald-500" />
              <span className="hidden sm:inline">Ekspor PDF</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1, rotate: 180 }}
              whileTap={{ scale: 0.9 }}
              transition={{ duration: 0.4 }}
              onClick={handleResetData}
              className={`p-2.5 rounded-xl border shadow-md ${
                isDark ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200' : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
              title="Reset Data Contoh"
            >
              <RefreshCw className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      </motion.header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 relative z-10">
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
                onClick={() => setActiveTab(tab.id as any)}
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
            isDark ? 'bg-slate-800/40 border-slate-700/60' : 'bg-white/80 border-slate-200/80 shadow-slate-200/50'
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

        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="space-y-8"
          >
            {/* Summary Cards (3 Core Cards) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <motion.div
                whileHover={{ y: -6, scale: 1.01, transition: { type: 'spring', stiffness: 300 } }}
                className={`border rounded-3xl p-6 shadow-2xl relative overflow-hidden group transition-colors ${
                  isDark ? 'bg-gradient-to-br from-slate-800/90 via-slate-900/95 to-slate-900 border-slate-700/80' : 'bg-gradient-to-br from-white via-slate-50 to-slate-100 border-slate-200 shadow-slate-200/50'
                }`}
              >
                <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/25 transition-all"></div>
                <div className="flex items-center justify-between mb-4">
                  <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Total Saldo</span>
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

              <motion.div
                whileHover={{ y: -6, scale: 1.01, transition: { type: 'spring', stiffness: 300 } }}
                className={`border rounded-3xl p-6 shadow-2xl relative overflow-hidden group transition-colors ${
                  isDark ? 'bg-gradient-to-br from-slate-800/90 via-slate-900/95 to-slate-900 border-slate-700/80' : 'bg-gradient-to-br from-white via-slate-50 to-slate-100 border-slate-200 shadow-slate-200/50'
                }`}
              >
                <div className="absolute top-0 right-0 w-36 h-36 bg-teal-500/10 rounded-full blur-2xl group-hover:bg-teal-500/25 transition-all"></div>
                <div className="flex items-center justify-between mb-4">
                  <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Total Pemasukan</span>
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

              <motion.div
                whileHover={{ y: -6, scale: 1.01, transition: { type: 'spring', stiffness: 300 } }}
                className={`border rounded-3xl p-6 shadow-2xl relative overflow-hidden group transition-colors ${
                  isDark ? 'bg-gradient-to-br from-slate-800/90 via-slate-900/95 to-slate-900 border-slate-700/80' : 'bg-gradient-to-br from-white via-slate-50 to-slate-100 border-slate-200 shadow-slate-200/50'
                }`}
              >
                <div className="absolute top-0 right-0 w-36 h-36 bg-rose-500/10 rounded-full blur-2xl group-hover:bg-rose-500/25 transition-all"></div>
                <div className="flex items-center justify-between mb-4">
                  <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Total Pengeluaran</span>
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
              {/* Monthly Cashflow Bar Chart - Empty state if no data */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className={`backdrop-blur-xl border rounded-3xl p-6 shadow-2xl flex flex-col justify-between transition-colors ${
                  isDark ? 'bg-slate-800/60 border-slate-700/80' : 'bg-white/80 border-slate-200 shadow-slate-200/50'
                }`}
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Arus Kas Bulanan</h3>
                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Perbandingan pemasukan dan pengeluaran per bulan</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-500">
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
                          formatter={(value: any) => [formatIDR(Number(value)), '']}
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
                  isDark ? 'bg-slate-800/60 border-slate-700/80' : 'bg-white/80 border-slate-200 shadow-slate-200/50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Distribusi Pengeluaran</h3>
                      <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Berdasarkan kategori</p>
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
                            formatter={(value: any) => [formatIDR(Number(value)), 'Jumlah']}
                          />
                        </RechartsPie>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
                <div className="mt-4 max-h-32 overflow-y-auto space-y-1 pr-1">
                  {categoryChartData.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></span>
                        <span className={`font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{item.name}</span>
                      </div>
                      <span className={`font-bold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{formatIDR(item.value)}</span>
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
                isDark ? 'bg-slate-800/60 border-slate-700/80' : 'bg-white/80 border-slate-200 shadow-slate-200/50'
              }`}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Transaksi Terbaru</h3>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Aktivitas keuangan terakhir Anda</p>
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
                    whileHover={{ scale: 1.005, backgroundColor: isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(241, 245, 249, 0.8)' }}
                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                      isDark ? 'bg-slate-900/60 border-slate-700/50' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold shadow-md ${
                          t.type === 'income'
                            ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-500 border border-rose-500/30'
                        }`}
                      >
                        {t.type === 'income' ? <ArrowDownLeft className="w-6 h-6" /> : <ArrowUpRight className="w-6 h-6" />}
                      </div>
                      <div>
                        <h4 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.description}</h4>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                            isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-white text-slate-700 border-slate-200'
                          }`}>
                            {t.category}
                          </span>
                          <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>• {t.date}</span>
                        </div>
                      </div>
                    </div>
                    <div className={`text-base font-extrabold ${t.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
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
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="space-y-6"
          >
            {/* Search & Filter Controls */}
            <div className={`backdrop-blur-xl border rounded-3xl p-6 shadow-2xl flex flex-col md:flex-row gap-4 items-center justify-between transition-colors ${
              isDark ? 'bg-slate-800/60 border-slate-700/80' : 'bg-white/80 border-slate-200 shadow-slate-200/50'
            }`}>
              <div className="relative w-full md:w-96">
                <Search className={`absolute left-4 top-3.5 w-4 h-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
                <input
                  type="text"
                  placeholder="Cari transaksi atau kategori..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full border rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-emerald-500 ${
                    isDark ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <select
                  value={filterType}
                  onChange={(e: any) => setFilterType(e.target.value)}
                  className={`border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 ${
                    isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="all">Semua Jenis</option>
                  <option value="income">Pemasukan</option>
                  <option value="expense">Pengeluaran</option>
                </select>
              </div>
            </div>

            {/* Transactions List */}
            <div className={`backdrop-blur-xl border rounded-3xl p-6 shadow-2xl transition-colors ${
              isDark ? 'bg-slate-800/60 border-slate-700/80' : 'bg-white/80 border-slate-200 shadow-slate-200/50'
            }`}>
              <div className="flex items-center justify-between mb-6">
                <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Daftar Seluruh Transaksi ({filteredTransactions.length})</h3>
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

              <div className="space-y-3">
                {filteredTransactions.map((t, idx) => (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: idx * 0.03 }}
                    whileHover={{ scale: 1.005, backgroundColor: isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(241, 245, 249, 0.8)' }}
                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all group ${
                      isDark ? 'bg-slate-900/60 border-slate-700/50' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold shadow-md ${
                          t.type === 'income'
                            ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-500 border border-rose-500/30'
                        }`}
                      >
                        {t.type === 'income' ? <ArrowDownLeft className="w-6 h-6" /> : <ArrowUpRight className="w-6 h-6" />}
                      </div>
                      <div>
                        <h4 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.description}</h4>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                            isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-white text-slate-700 border-slate-200'
                          }`}>
                            {t.category}
                          </span>
                          <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>• {t.date}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className={`text-base font-extrabold ${t.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {t.type === 'income' ? '+' : '-'}{formatIDR(t.amount)}
                      </div>
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                          onClick={() => handleDeleteTransaction(t.id)}
                          className="p-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-500 border border-rose-500/30"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </motion.button>
                      </div>
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

                <div>
                  <label className={`block text-xs font-bold mb-1.5 uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Nominal (Rp)</label>
                  <input
                    type="number"
                    required
                    placeholder="Contoh: 150000"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className={`w-full border rounded-xl px-4 py-3 text-base font-bold focus:outline-none focus:border-emerald-500 ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-bold mb-1.5 uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Kategori</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  >
                    {(formType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`block text-xs font-bold mb-1.5 uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Tanggal</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-bold mb-1.5 uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Keterangan / Detail</label>
                  <input
                    type="text"
                    placeholder="Misal: Beli makan siang, bayar listrik..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
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
    </div>
  );
}
