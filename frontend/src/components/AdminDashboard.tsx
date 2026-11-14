import React, { useState, useEffect } from 'react';
import { useTrading } from '../context/TradingContext';
import { formatCurrency } from '../utils/currency';
import { apiUrl } from '../utils/api';
import {
  AdminOverview,
  UserAccount,
  Transaction,
  PromoCoupon,
  Trade,
  DepositPaymentSettings,
  RiskSettings,
} from '../types';
import {
  Users,
  CreditCard,
  Tag,
  Sliders,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  ShieldAlert,
  Search,
  Plus,
  RefreshCw,
  Power,
  Trash2,
  Clock,
  Sun,
  Moon,
  UserPlus,
  Eye,
  Image as ImageIcon,
  Check,
  Copy,
  LogOut,
  X,
  Building2,
  Smartphone,
  Edit3,
  Save,
  ShieldCheck,
  Zap,
} from 'lucide-react';

interface AdminDashboardProps {
  onClose?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = () => {
  const { assets, theme, toggleTheme } = useTrading();
  const isLight = theme === 'light';
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'USERS' | 'PAYMENTS' | 'RISK' | 'COUPONS' | 'MARKETS'>('OVERVIEW');
  const [riskSettings, setRiskSettings] = useState<RiskSettings>({
    enabled: true,
    targetWinRate: 20,
    mode: 'QUOTEX_OTC',
    microPipSniping: true,
    applyToRealOnly: false,
  });
  const [isSavingRisk, setIsSavingRisk] = useState(false);
  const [riskSaveSuccess, setRiskSaveSuccess] = useState(false);

  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [coupons, setCoupons] = useState<PromoCoupon[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [previewProofUrl, setPreviewProofUrl] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // New Trader Account Creation State
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('Trader@2026');
  const [createdSlip, setCreatedSlip] = useState<any | null>(null);
  const [newUserCurrency, setNewUserCurrency] = useState<string>('INR');
  const [newUserAccountType, setNewUserAccountType] = useState<'DEMO' | 'REAL'>('DEMO');
  const [newUserDemoBal, setNewUserDemoBal] = useState<number>(10000);
  const [newUserRealBal, setNewUserRealBal] = useState<number>(0);
  const [newUserVip, setNewUserVip] = useState<'STANDARD' | 'PRO' | 'VIP'>('STANDARD');
  const [newUserKyc, setNewUserKyc] = useState<boolean>(true);
  const [newUserStatus, setNewUserStatus] = useState<'ACTIVE' | 'FROZEN'>('ACTIVE');

  // User Balance Adjustment Modal State
  const [selectedUserForBalance, setSelectedUserForBalance] = useState<UserAccount | null>(null);
  const [balanceAction, setBalanceAction] = useState<'ADD' | 'REMOVE'>('ADD');
  const [balanceAccountType, setBalanceAccountType] = useState<'DEMO' | 'REAL'>('REAL');
  const [adjustAmount, setAdjustAmount] = useState<number>(1000);
  const [adjustReason, setAdjustReason] = useState<string>('Admin VIP Bonus');
  const [adjustInputCurrency, setAdjustInputCurrency] = useState<'INR' | 'USD'>('INR');
  const [targetAccountCurrency, setTargetAccountCurrency] = useState<'INR' | 'USD'>('INR');

  // User Edit Modal State
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<UserAccount | null>(null);

  // Trade History Modal State
  const [selectedUserForTrades, setSelectedUserForTrades] = useState<UserAccount | null>(null);
  const [userTrades, setUserTrades] = useState<{ activeTrades: Trade[]; tradeHistory: Trade[] } | null>(null);
  const [tradesLoading, setTradesLoading] = useState(false);

  // New Coupon Modal State
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newBonusPct, setNewBonusPct] = useState<number>(50);
  const [newMaxBonus, setNewMaxBonus] = useState<number>(500);
  const [newMinDeposit, setNewMinDeposit] = useState<number>(25);
  const [newMaxUsage, setNewMaxUsage] = useState<number>(500);

  // Dynamic Payment Settings State
  const [paymentSettings, setPaymentSettings] = useState<DepositPaymentSettings | null>(null);
  const [isEditPaymentModalOpen, setIsEditPaymentModalOpen] = useState(false);
  const [isSavingPaymentSettings, setIsSavingPaymentSettings] = useState(false);
  const [editBankName, setEditBankName] = useState('');
  const [editAccountHolderName, setEditAccountHolderName] = useState('');
  const [editAccountNumber, setEditAccountNumber] = useState('');
  const [editIfscCode, setEditIfscCode] = useState('');
  const [editAccountType, setEditAccountType] = useState('Current Account');
  const [editBranchName, setEditBranchName] = useState('');
  const [editUpiId, setEditUpiId] = useState('');
  const [editUpiName, setEditUpiName] = useState('');
  const [editInstructions, setEditInstructions] = useState('');
  const [adminNotification, setAdminNotification] = useState<string | null>(null);

  const showAdminToast = (msg: string) => {
    setAdminNotification(msg);
    setTimeout(() => setAdminNotification(null), 3500);
  };

  const openEditPaymentModal = () => {
    if (paymentSettings) {
      setEditBankName(paymentSettings.bankName || '');
      setEditAccountHolderName(paymentSettings.accountHolderName || '');
      setEditAccountNumber(paymentSettings.accountNumber || '');
      setEditIfscCode(paymentSettings.ifscCode || '');
      setEditAccountType(paymentSettings.accountType || 'Current Account');
      setEditBranchName(paymentSettings.branchName || '');
      setEditUpiId(paymentSettings.upiId || '');
      setEditUpiName(paymentSettings.upiName || '');
      setEditInstructions(paymentSettings.instructions || '');
    }
    setIsEditPaymentModalOpen(true);
  };

  const handleSavePaymentSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPaymentSettings(true);
    try {
      const res = await fetch(apiUrl('/api/admin/payment/settings'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankName: editBankName.trim(),
          accountHolderName: editAccountHolderName.trim(),
          accountNumber: editAccountNumber.trim(),
          ifscCode: editIfscCode.trim().toUpperCase(),
          accountType: editAccountType.trim(),
          branchName: editBranchName.trim(),
          upiId: editUpiId.trim(),
          upiName: editUpiName.trim(),
          instructions: editInstructions.trim(),
          actorName: 'Super Administrator',
          actorId: 'usr_admin_001',
        }),
      });
      const data = await res.json();
      if (data?.settings) {
        setPaymentSettings(data.settings);
        setIsEditPaymentModalOpen(false);
        showAdminToast('✅ Bank Account & UPI Details updated live for all clients!');
      }
    } catch (err) {
      console.error('Failed to save payment settings:', err);
    } finally {
      setIsSavingPaymentSettings(false);
    }
  };

  // Payout Adjustments State
  const [payoutEdits, setPayoutEdits] = useState<Record<string, number>>({});

  // Search Filters
  const [userSearch, setUserSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');

  const fetchAdminData = async () => {
    setIsLoading(true);
    try {
      const [ovRes, uRes, txRes, cpnRes, psRes, riskRes] = await Promise.all([
        fetch(apiUrl('/api/admin/overview')).then((r) => r.json()),
        fetch(apiUrl('/api/admin/users')).then((r) => r.json()),
        fetch(apiUrl('/api/admin/transactions')).then((r) => r.json()),
        fetch(apiUrl('/api/admin/coupons')).then((r) => r.json()),
        fetch(apiUrl('/api/payment/settings')).then((r) => r.json()).catch(() => null),
        fetch(apiUrl('/api/admin/risk/settings')).then((r) => r.json()).catch(() => null),
      ]);
      setOverview(ovRes);
      setUsers(uRes);
      setTransactions(txRes);
      setCoupons(cpnRes);
      if (psRes?.settings) {
        setPaymentSettings(psRes.settings);
      }
      if (riskRes?.settings) {
        setRiskSettings(riskRes.settings);
      }

      const payoutsMap: Record<string, number> = {};
      assets.forEach((a) => {
        payoutsMap[a.id] = a.payout;
      });
      setPayoutEdits(payoutsMap);
    } catch (e) {
      console.error('Failed to fetch admin data', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveRiskSettings = async (updates: Partial<RiskSettings>) => {
    setIsSavingRisk(true);
    try {
      const merged = { ...riskSettings, ...updates };
      const res = await fetch(apiUrl('/api/admin/risk/settings'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...merged, actorName: 'Super Administrator' }),
      });
      const data = await res.json();
      if (data?.settings) {
        setRiskSettings(data.settings);
        setRiskSaveSuccess(true);
        showAdminToast(`✅ Quotex Risk Engine saved! Win-rate set to ${data.settings.targetWinRate}% (${Math.round(data.settings.targetWinRate/10)} wins / ${10 - Math.round(data.settings.targetWinRate/10)} losses)`);
        setTimeout(() => setRiskSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Failed to save risk settings:', err);
    } finally {
      setIsSavingRisk(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
    const interval = setInterval(fetchAdminData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Handle Balance Adjustment & Currency Change
  const handleAdjustBalance = async () => {
    if (!selectedUserForBalance) return;
    try {
      const res = await fetch(apiUrl(`/api/admin/users/${selectedUserForBalance.id}/adjust-balance`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountType: balanceAccountType,
          action: balanceAction,
          amount: adjustAmount,
          inputCurrency: adjustInputCurrency,
          currency: targetAccountCurrency,
          reason: adjustReason,
        }),
      });
      if (res.ok) {
        setSelectedUserForBalance(null);
        fetchAdminData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Handle User Edit
  const handleUpdateUser = async (updates: Partial<UserAccount>) => {
    if (!selectedUserForEdit) return;
    try {
      const res = await fetch(apiUrl(`/api/admin/users/${selectedUserForEdit.id}/update`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        setSelectedUserForEdit(null);
        fetchAdminData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Handle View Trades for a User
  const handleViewUserTrades = async (user: UserAccount) => {
    setSelectedUserForTrades(user);
    setTradesLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/admin/users/${user.id}/trades`));
      const data = await res.json();
      setUserTrades(data);
    } catch (e) {
      console.error(e);
      setUserTrades(null);
    } finally {
      setTradesLoading(false);
    }
  };

  // Handle Delete Single Trade
  const handleDeleteTrade = async (tradeId: string) => {
    if (!confirm('Delete this trade record? This cannot be undone.')) return;
    try {
      const res = await fetch(apiUrl(`/api/admin/trades/${tradeId}`), { method: 'DELETE' });
      if (res.ok && selectedUserForTrades) {
        await handleViewUserTrades(selectedUserForTrades);
        fetchAdminData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Handle Clear All Trade History for a User
  const handleClearUserHistory = async () => {
    if (!selectedUserForTrades) return;
    if (!confirm(`Clear ALL trade history for ${selectedUserForTrades.name}? This cannot be undone.`)) return;
    try {
      const res = await fetch(apiUrl(`/api/admin/users/${selectedUserForTrades.id}/trades`), { method: 'DELETE' });
      if (res.ok) {
        await handleViewUserTrades(selectedUserForTrades);
        fetchAdminData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Handle Payment Approval
  const handleApprovePayment = async (txId: string) => {
    try {
      const res = await fetch(apiUrl(`/api/admin/transactions/${txId}/approve`), {
        method: 'POST',
      });
      if (res.ok) fetchAdminData();
    } catch (e) {
      console.error(e);
    }
  };

  // Handle Payment Rejection
  const handleRejectPayment = async (txId: string) => {
    const reason = prompt('Enter rejection reason for audit log:', 'Fraud prevention flag / Invalid destination');
    if (reason === null) return;
    try {
      const res = await fetch(apiUrl(`/api/admin/transactions/${txId}/reject`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (res.ok) fetchAdminData();
    } catch (e) {
      console.error(e);
    }
  };

  // Handle Create Coupon
  const handleCreateCoupon = async () => {
    if (!newCouponCode) return;
    try {
      const res = await fetch(apiUrl('/api/admin/coupons'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newCouponCode,
          bonusPercentage: newBonusPct,
          maxBonusUSD: newMaxBonus,
          minDepositUSD: newMinDeposit,
          maxUsage: newMaxUsage,
        }),
      });
      if (res.ok) {
        setIsCouponModalOpen(false);
        setNewCouponCode('');
        fetchAdminData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Handle Toggle Coupon
  const handleToggleCoupon = async (id: string) => {
    try {
      await fetch(apiUrl(`/api/admin/coupons/${id}/toggle`), { method: 'POST' });
      fetchAdminData();
    } catch (e) {
      console.error(e);
    }
  };

  // Handle Delete Coupon
  const handleDeleteCoupon = async (id: string) => {
    if (!confirm('Are you sure you want to delete this coupon?')) return;
    try {
      await fetch(apiUrl(`/api/admin/coupons/${id}`), { method: 'DELETE' });
      fetchAdminData();
    } catch (e) {
      console.error(e);
    }
  };

  // Handle Payout Save
  const handleSavePayout = async (assetId: string) => {
    const val = payoutEdits[assetId];
    if (!val) return;
    try {
      await fetch(apiUrl(`/api/admin/assets/${assetId}/payout`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payout: val }),
      });
      alert(`Payout for ${assetId} updated to +${val}% across all live clients!`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) {
      alert('Name and Email are required');
      return;
    }
    try {
      const res = await fetch(apiUrl('/api/admin/users/create'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newUserName.trim(),
          email: newUserEmail.trim(),
          phone: newUserPhone.trim() || undefined,
          password: newUserPassword.trim() || 'Trader@2026',
          currency: newUserCurrency,
          activeAccountType: newUserAccountType,
          demoBalance: Number(newUserDemoBal),
          realBalance: Number(newUserRealBal),
          vipLevel: newUserVip,
          isKycVerified: newUserKyc,
          status: newUserStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to create user');
        return;
      }
      setCreatedSlip({
        name: data.user.name,
        id: data.user.id,
        email: data.user.email,
        phone: data.user.phone || 'N/A',
        password: newUserPassword.trim() || 'Trader@2026',
        currency: data.user.currency,
        demoBalance: data.user.demoBalance,
        realBalance: data.user.realBalance,
        url: window.location.origin,
      });
      fetchAdminData();
    } catch (err) {
      console.error(err);
      alert('Failed to connect to backend server');
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.id.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredTransactions = transactions.filter(
    (t) => paymentFilter === 'ALL' || t.status === paymentFilter
  );

  return (
    <div className={`fixed inset-0 z-50 flex flex-col overflow-hidden select-none font-sans transition-colors duration-200 ${
      isLight ? 'bg-[#f4f6f9] text-slate-800' : 'bg-[#0e121b] text-gray-100'
    }`}>
      {/* Top Admin Navigation Bar */}
      <header className={`h-16 border-b px-6 flex items-center justify-between transition-colors ${
        isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#161a26] border-[#262c3e] text-white'
      }`}>
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-black font-black shadow-lg shadow-amber-500/20">
            <ShieldAlert className="w-5 h-5 text-black" />
          </div>
          <div>
            <div className={`text-sm font-black tracking-wide flex items-center space-x-2 ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}>
              <span>FOREX GROW BROKER ADMIN CENTER</span>
              <span className="text-[9px] font-black uppercase bg-amber-500/20 text-amber-500 px-1.5 py-0.2 rounded border border-amber-500/30">
                ROOT ACCESS
              </span>
            </div>
            <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
              Forex Grow Master Backoffice, User Management & Payout Controller
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Theme Toggle in Admin */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className={`p-2 rounded-xl transition ${
              isLight ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100' : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-sky-500" />
            )}
          </button>

          <button
            onClick={fetchAdminData}
            title="Refresh Data"
            className={`p-2 rounded-xl transition ${
              isLight ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100' : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-500' : ''}`} />
          </button>
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>System Active</span>
          </div>

          <button
            onClick={() => {
              localStorage.removeItem('quotex_admin_user');
              window.history.pushState({}, '', '/admin');
              window.dispatchEvent(new PopStateEvent('popstate'));
            }}
            title="Log Out of Admin Portal"
            className="flex items-center space-x-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-xl text-xs font-bold transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Admin KPI Top Highlights */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 p-6 pb-2">
          <div className={`border rounded-2xl p-4 shadow-sm transition-colors ${
            isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#161a26] border-[#262c3e] text-white'
          }`}>
            <div className={`text-[11px] font-semibold uppercase ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>Total Traders</div>
            <div className={`text-2xl font-black mono-num mt-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>{overview.totalUsers}</div>
            <div className="text-[10px] text-emerald-500 font-bold mt-0.5">
              {overview.activeTradersCount} Active Accounts
            </div>
          </div>

          <div className={`border rounded-2xl p-4 shadow-sm transition-colors ${
            isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#161a26] border-[#262c3e] text-white'
          }`}>
            <div className={`text-[11px] font-semibold uppercase ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>Platform Volume</div>
            <div className={`text-2xl font-black mono-num mt-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
              ${overview.totalVolumeUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className={`text-[10px] mt-0.5 ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>Real order flow</div>
          </div>

          <div className={`border rounded-2xl p-4 shadow-sm transition-colors ${
            isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#161a26] border-[#262c3e] text-white'
          }`}>
            <div className={`text-[11px] font-semibold uppercase ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>Total Deposits</div>
            <div className="text-2xl font-black text-emerald-500 mono-num mt-1">
              ${overview.totalDepositsUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className={`text-[10px] mt-0.5 ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>UPI & Fiat Pool</div>
          </div>

          <div className={`border rounded-2xl p-4 shadow-sm transition-colors ${
            isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#161a26] border-[#262c3e] text-white'
          }`}>
            <div className={`text-[11px] font-semibold uppercase ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>Total Withdrawals</div>
            <div className="text-2xl font-black text-rose-500 mono-num mt-1">
              ${overview.totalWithdrawalsUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className={`text-[10px] mt-0.5 ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>Released to clients</div>
          </div>

          <div className={`border rounded-2xl p-4 shadow-sm transition-colors ${
            isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#161a26] border-[#262c3e] text-white'
          }`}>
            <div className={`text-[11px] font-semibold uppercase ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>House Net P&L</div>
            <div className="text-2xl font-black text-amber-500 mono-num mt-1">
              +${overview.houseNetProfitUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-emerald-500 font-bold mt-0.5">Profitable Spread</div>
          </div>

          <div className={`border rounded-2xl p-4 shadow-sm transition-colors ${
            isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#161a26] border-[#262c3e] text-white'
          }`}>
            <div className={`text-[11px] font-semibold uppercase ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>Pending Cashier</div>
            <div className={`text-2xl font-black mono-num mt-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
              {overview.pendingTransactionsCount}
            </div>
            <div className="text-[10px] text-amber-500 font-bold mt-0.5">Requires Approval</div>
          </div>
        </div>
      )}

      {/* Admin Tabs */}
      <div className={`flex space-x-2 px-6 pt-3 border-b ${
        isLight ? 'border-slate-200' : 'border-[#262c3e]'
      }`}>
        {[
          { id: 'OVERVIEW', label: 'Platform Summary', icon: TrendingUp },
          { id: 'USERS', label: 'Traders & Balances', icon: Users, badge: users.length },
          { id: 'PAYMENTS', label: 'Payout Requests & Deposits', icon: CreditCard, badge: overview?.pendingTransactionsCount },
          { id: 'RISK', label: 'Quotex Risk Engine', icon: ShieldCheck, badge: riskSettings?.enabled ? `${riskSettings.targetWinRate}%` : 'OFF' },
          { id: 'COUPONS', label: 'Special Promo Coupons', icon: Tag, badge: coupons.length },
          { id: 'MARKETS', label: 'Asset Payout Customizer', icon: Sliders, badge: assets.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition border-b-2 ${
                isActive
                  ? `border-emerald-500 text-emerald-500 ${isLight ? 'bg-white' : 'bg-[#161a26]'}`
                  : (isLight ? 'border-transparent text-slate-500 hover:text-slate-900' : 'border-transparent text-gray-400 hover:text-white')
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge !== '' && tab.badge !== 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  isActive
                    ? 'bg-emerald-500 text-black'
                    : (isLight ? 'bg-slate-200 text-slate-700' : 'bg-[#222838] text-gray-300')
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* ================= TAB 1: OVERVIEW ================= */}
        {activeTab === 'OVERVIEW' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Quick Actions Panel */}
              <div className={`border rounded-3xl p-6 space-y-4 transition-colors ${
                isLight ? 'bg-white border-slate-200 text-slate-800 shadow-sm' : 'bg-[#161a26] border-[#262c3e] text-white'
              }`}>
                <h3 className={`text-base font-bold flex items-center space-x-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  <ShieldAlert className="w-5 h-5 text-emerald-500" />
                  <span>Admin Quick Control Operations</span>
                </h3>
                <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                  Instant administrative functions affecting user accounts and platform liquidity.
                </p>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={() => setActiveTab('USERS')}
                    className={`p-4 border rounded-2xl text-left transition ${
                      isLight
                        ? 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                        : 'bg-[#1f2537] hover:bg-[#262d42] border-[#2e354b]'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-500 flex items-center justify-center mb-2">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <div className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Adjust User Balances</div>
                    <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>Add or debit Demo / Real funds</div>
                  </button>

                  <button
                    onClick={() => setActiveTab('PAYMENTS')}
                    className={`p-4 border rounded-2xl text-left transition ${
                      isLight
                        ? 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                        : 'bg-[#1f2537] hover:bg-[#262d42] border-[#2e354b]'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-500 flex items-center justify-center mb-2">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Approve Cashier Payouts</div>
                    <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>{overview?.pendingTransactionsCount} pending requests</div>
                  </button>

                  <button
                    onClick={() => setActiveTab('COUPONS')}
                    className={`p-4 border rounded-2xl text-left transition ${
                      isLight
                        ? 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                        : 'bg-[#1f2537] hover:bg-[#262d42] border-[#2e354b]'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-500 flex items-center justify-center mb-2">
                      <Tag className="w-5 h-5" />
                    </div>
                    <div className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Create Special Promo</div>
                    <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>Add deposit bonus codes</div>
                  </button>

                  <button
                    onClick={() => setActiveTab('MARKETS')}
                    className={`p-4 border rounded-2xl text-left transition ${
                      isLight
                        ? 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                        : 'bg-[#1f2537] hover:bg-[#262d42] border-[#2e354b]'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-500 flex items-center justify-center mb-2">
                      <Sliders className="w-5 h-5" />
                    </div>
                    <div className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Modify Payout Percentages</div>
                    <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>Tweak house margins on assets</div>
                  </button>
                </div>
              </div>

              {/* Recent Pending Transactions preview */}
              <div className={`border rounded-3xl p-6 flex flex-col justify-between transition-colors ${
                isLight ? 'bg-white border-slate-200 text-slate-800 shadow-sm' : 'bg-[#161a26] border-[#262c3e] text-white'
              }`}>
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className={`text-base font-bold flex items-center space-x-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      <Clock className="w-5 h-5 text-amber-500" />
                      <span>Pending Cashier Verification</span>
                    </h3>
                    <button
                      onClick={() => setActiveTab('PAYMENTS')}
                      className="text-xs text-emerald-500 font-bold hover:underline"
                    >
                      View All
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {transactions
                      .filter((t) => t.status === 'PENDING')
                      .slice(0, 3)
                      .map((tx) => (
                        <div
                          key={tx.id}
                          className={`p-3 border rounded-2xl flex items-center justify-between transition-colors ${
                            isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#121620] border-[#262c3e]'
                          }`}
                        >
                          <div className="space-y-0.5">
                            <div className="text-xs font-bold flex items-center space-x-1.5">
                              <span className={isLight ? 'text-slate-900' : 'text-white'}>{tx.userName}</span>
                              <span className={`text-[10px] px-1.5 rounded font-black ${
                                tx.type === 'DEPOSIT' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'
                              }`}>
                                {tx.type}
                              </span>
                              {tx.utrNumber && (
                                <span className="text-[10px] bg-sky-500/15 text-sky-500 border border-sky-500/30 px-1 rounded font-mono">
                                  UTR: {tx.utrNumber}
                                </span>
                              )}
                            </div>
                            <div className={`text-[11px] font-mono flex items-center space-x-2 ${
                              isLight ? 'text-slate-500' : 'text-gray-400'
                            }`}>
                              <span>{formatCurrency(tx.amount, (tx.currency as any) || 'USD')} • {tx.method}</span>
                              {tx.proofImage && (
                                <button
                                  onClick={() => setPreviewProofUrl(tx.proofImage || null)}
                                  className="text-xs text-sky-500 hover:text-sky-600 underline font-semibold flex items-center space-x-0.5"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>View Slip</span>
                                </button>
                              )}
                            </div>
                            {tx.bankDetails && (
                              <div className="text-[10px] font-mono text-amber-500">
                                {tx.bankDetails.upiId ? (
                                  <span>UPI: {tx.bankDetails.upiId}</span>
                                ) : (
                                  <span>{tx.bankDetails.bankName} - A/C: {tx.bankDetails.accountNumber} ({tx.bankDetails.ifscCode})</span>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleApprovePayment(tx.id)}
                              className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition shadow-sm"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleRejectPayment(tx.id)}
                              className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-500 rounded-lg text-xs font-bold transition"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    {transactions.filter((t) => t.status === 'PENDING').length === 0 && (
                      <div className={`text-xs text-center py-8 ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>
                        No pending transactions requiring manual review!
                      </div>
                    )}
                  </div>
                </div>

                <div className={`pt-4 border-t text-xs flex items-center justify-between ${
                  isLight ? 'border-slate-200 text-slate-500' : 'border-[#262c3e] text-gray-400'
                }`}>
                  <span>Audit Log: Encrypted & Immutable</span>
                  <span className="text-emerald-500 font-bold">100% Operational</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: TRADERS & USER MANAGEMENT ================= */}
        {activeTab === 'USERS' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className={`flex items-center border rounded-2xl px-3.5 py-2 w-72 transition-colors ${
                isLight ? 'bg-white border-slate-200' : 'bg-[#161a26] border-[#262c3e]'
              }`}>
                <Search className={`w-4 h-4 mr-2 ${isLight ? 'text-slate-400' : 'text-gray-400'}`} />
                <input
                  type="text"
                  placeholder="Search user name or ID..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className={`bg-transparent text-xs focus:outline-none w-full ${
                    isLight ? 'text-slate-900 placeholder-slate-400' : 'text-white placeholder-gray-500'
                  }`}
                />
              </div>

              <div className="flex items-center space-x-4">
                <div className={`text-xs font-semibold hidden sm:block ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                  Showing {filteredUsers.length} Registered Accounts
                </div>
                {/* Admin Create Account Button */}
                <button
                  onClick={() => setIsCreateUserModalOpen(true)}
                  className="flex items-center space-x-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 transition transform active:scale-95"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Create Account</span>
                </button>
              </div>
            </div>

            {/* Users Table */}
            <div className={`border rounded-3xl overflow-hidden shadow-xl transition-colors ${
              isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#161a26] border-[#262c3e]'
            }`}>
              <table className="w-full text-left text-xs">
                <thead className={`border-b uppercase font-semibold ${
                  isLight ? 'bg-slate-100 border-slate-200 text-slate-600' : 'bg-[#121620] border-[#262c3e] text-gray-400'
                }`}>
                  <tr>
                    <th className="py-3.5 px-4">Trader Details</th>
                    <th className="py-3.5 px-3">VIP Tier</th>
                    <th className="py-3.5 px-3">KYC Status</th>
                    <th className="py-3.5 px-3">Demo Balance</th>
                    <th className="py-3.5 px-3">Real Live Balance</th>
                    <th className="py-3.5 px-3">Total Trades</th>
                    <th className="py-3.5 px-3">Status</th>
                    <th className="py-3.5 px-4 text-right">Admin Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isLight ? 'divide-slate-100' : 'divide-[#262c3e]/60'}`}>
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className={`transition ${isLight ? 'hover:bg-slate-50' : 'hover:bg-[#1f2537]/50'}`}>
                      <td className="py-3.5 px-4">
                        <div className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{u.name}</div>
                        <div className={`text-[11px] font-mono ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>{u.email}</div>
                        <div className={`text-[10px] font-mono ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>{u.id}</div>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                          u.vipLevel === 'VIP'
                            ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                            : u.vipLevel === 'PRO'
                            ? 'bg-purple-500/20 text-purple-500 border border-purple-500/30'
                            : (isLight ? 'bg-slate-200 text-slate-700' : 'bg-[#222838] text-gray-300')
                        }`}>
                          {u.vipLevel}
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        {u.isKycVerified ? (
                          <span className="text-emerald-500 font-bold flex items-center space-x-1">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Verified</span>
                          </span>
                        ) : (
                          <span className="text-amber-500 font-bold flex items-center space-x-1">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>Pending</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 font-bold text-emerald-500 mono-num">
                        {formatCurrency(u.demoBalance, (u.currency as any) || 'USD')}
                      </td>
                      <td className={`py-3.5 px-3 font-black mono-num ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        {formatCurrency(u.realBalance, (u.currency as any) || 'USD')}
                      </td>
                      <td className={`py-3.5 px-3 font-bold mono-num ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>{u.totalTrades}</td>
                      <td className="py-3.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          u.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'
                        }`}>
                          {u.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button
                          onClick={() => {
                            setSelectedUserForBalance(u);
                            setAdjustInputCurrency('INR');
                            setTargetAccountCurrency(u.currency === 'USD' ? 'USD' : 'INR');
                            setAdjustAmount(1000);
                            setBalanceAction('ADD');
                            setBalanceAccountType('REAL');
                            setAdjustReason('Admin VIP Bonus');
                          }}
                          className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-500 rounded-lg text-xs font-bold transition"
                        >
                          +/- Funds
                        </button>
                        <button
                          onClick={() => setSelectedUserForEdit(u)}
                          className="px-2.5 py-1 bg-sky-500/20 hover:bg-sky-500/30 text-sky-500 rounded-lg text-xs font-bold transition"
                        >
                          Edit Level
                        </button>
                        <button
                          onClick={() => handleViewUserTrades(u)}
                          className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 rounded-lg text-xs font-bold transition"
                        >
                          Trades
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= TAB 3: PAYMENTS & CASHIER ================= */}
        {activeTab === 'PAYMENTS' && (
          <div className="space-y-4">
            {/* Active Bank & UPI Account Settings Card */}
            <div className={`p-4 sm:p-5 rounded-3xl border transition shadow-lg ${
              isLight ? 'bg-white border-slate-200' : 'bg-[#161a26] border-[#262c3e]'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-sky-500/20">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className={`text-sm font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        Active Client Deposit Receiving Accounts
                      </h3>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        ● LIVE ON CASHIER
                      </span>
                    </div>
                    <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                      Dynamic Bank Account & UPI ID displayed to all traders in Cashier Deposit.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={openEditPaymentModal}
                  className="px-4 py-2 bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center space-x-1.5 self-start sm:self-auto"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Bank & UPI Details</span>
                </button>
              </div>

              {paymentSettings && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-xs">
                  <div className={`p-2.5 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#121620] border-[#262c3e]'}`}>
                    <span className="text-[10px] font-bold text-gray-400 block uppercase">Bank Name</span>
                    <span className={`font-black mt-0.5 block truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      {paymentSettings.bankName}
                    </span>
                  </div>
                  <div className={`p-2.5 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#121620] border-[#262c3e]'}`}>
                    <span className="text-[10px] font-bold text-gray-400 block uppercase">Account Number</span>
                    <span className="font-mono font-black text-emerald-400 mt-0.5 block truncate">
                      {paymentSettings.accountNumber}
                    </span>
                  </div>
                  <div className={`p-2.5 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#121620] border-[#262c3e]'}`}>
                    <span className="text-[10px] font-bold text-gray-400 block uppercase">IFSC Code</span>
                    <span className="font-mono font-black text-sky-400 mt-0.5 block truncate">
                      {paymentSettings.ifscCode}
                    </span>
                  </div>
                  <div className={`p-2.5 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#121620] border-[#262c3e]'}`}>
                    <span className="text-[10px] font-bold text-gray-400 block uppercase">Official UPI ID</span>
                    <span className="font-mono font-bold text-amber-400 mt-0.5 block truncate">
                      {paymentSettings.upiId}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex space-x-2">
                {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setPaymentFilter(filter)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                      paymentFilter === filter
                        ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/40 font-black'
                        : (isLight
                            ? 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 shadow-sm'
                            : 'bg-[#161a26] border-[#262c3e] text-gray-400 hover:text-white')
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
              <div className={`text-xs font-semibold ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                Showing {filteredTransactions.length} Transactions
              </div>
            </div>

            <div className={`border rounded-3xl overflow-hidden shadow-xl transition-colors ${
              isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#161a26] border-[#262c3e]'
            }`}>
              <table className="w-full text-left text-xs">
                <thead className={`border-b uppercase font-semibold ${
                  isLight ? 'bg-slate-100 border-slate-200 text-slate-600' : 'bg-[#121620] border-[#262c3e] text-gray-400'
                }`}>
                  <tr>
                    <th className="py-3.5 px-4">Tx ID</th>
                    <th className="py-3.5 px-3">Trader</th>
                    <th className="py-3.5 px-3">Type</th>
                    <th className="py-3.5 px-3">Amount</th>
                    <th className="py-3.5 px-3">Method & Destination</th>
                    <th className="py-3.5 px-3">Verification (UTR / Slip)</th>
                    <th className="py-3.5 px-3">Status</th>
                    <th className="py-3.5 px-3">Timestamp</th>
                    <th className="py-3.5 px-4 text-right">Decision</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isLight ? 'divide-slate-100' : 'divide-[#262c3e]/60'}`}>
                  {filteredTransactions.map((tx) => (
                    <tr key={tx.id} className={`transition ${isLight ? 'hover:bg-slate-50' : 'hover:bg-[#1f2537]/50'}`}>
                      <td className={`py-3.5 px-4 font-mono font-bold ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>{tx.id}</td>
                      <td className={`py-3.5 px-3 font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>{tx.userName}</td>
                      <td className="py-3.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                          tx.type === 'DEPOSIT' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'
                        }`}>
                          {tx.type}
                        </span>
                      </td>
                      <td className={`py-3.5 px-3 font-black mono-num ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        <div>{formatCurrency(tx.amount, (tx.currency as any) || 'USD')}</div>
                        {tx.amountUSD && tx.currency !== 'USD' && (
                          <div className="text-[10px] text-gray-400 font-mono font-normal">
                            ≈ ${tx.amountUSD.toFixed(2)} USD
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-3">
                        <div className={`font-semibold ${isLight ? 'text-slate-800' : 'text-gray-200'}`}>{tx.method}</div>
                        {tx.bankDetails && (
                          <div className="text-[11px] font-mono mt-0.5 space-y-0.5">
                            {tx.bankDetails.upiId ? (
                              <div className="flex items-center space-x-1.5 text-sky-500">
                                <span>UPI: {tx.bankDetails.upiId}</span>
                                <button
                                  onClick={() => handleCopy(tx.bankDetails?.upiId || '', `upi-${tx.id}`)}
                                  className="text-gray-400 hover:text-white"
                                  title="Copy UPI"
                                >
                                  {copiedId === `upi-${tx.id}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                </button>
                              </div>
                            ) : (
                              <div className={isLight ? 'text-slate-600' : 'text-gray-300'}>
                                <div><span className="font-bold">A/C:</span> {tx.bankDetails.accountNumber}</div>
                                <div><span className="font-bold">IFSC:</span> {tx.bankDetails.ifscCode} • {tx.bankDetails.bankName}</div>
                                <div><span className="font-bold">Name:</span> {tx.bankDetails.holderName}</div>
                              </div>
                            )}
                          </div>
                        )}
                        {tx.address && <div className="text-[10px] text-gray-400 font-mono truncate max-w-[150px]">{tx.address}</div>}
                        {tx.promoCode && <div className="text-[10px] text-amber-500 font-mono font-bold">Promo: {tx.promoCode}</div>}
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="space-y-1">
                          {tx.utrNumber ? (
                            <div className="flex items-center space-x-1">
                              <span className="font-mono text-[11px] font-bold bg-sky-500/10 text-sky-500 border border-sky-500/30 px-1.5 py-0.5 rounded">
                                UTR: {tx.utrNumber}
                              </span>
                              <button
                                onClick={() => handleCopy(tx.utrNumber || '', `utr-${tx.id}`)}
                                className="p-1 text-gray-400 hover:text-sky-500 transition"
                                title="Copy UTR"
                              >
                                {copiedId === `utr-${tx.id}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                              </button>
                            </div>
                          ) : null}

                          {tx.proofImage ? (
                            <button
                              onClick={() => setPreviewProofUrl(tx.proofImage || null)}
                              className="flex items-center space-x-1 text-xs font-bold text-emerald-500 hover:text-emerald-600 bg-emerald-500/10 border border-emerald-500/30 px-2 py-1 rounded-lg transition"
                            >
                              <ImageIcon className="w-3.5 h-3.5" />
                              <span>View Slip</span>
                            </button>
                          ) : null}

                          {!tx.utrNumber && !tx.proofImage && (
                            <span className="text-gray-400 text-[11px]">-</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          tx.status === 'APPROVED'
                            ? 'bg-emerald-500/20 text-emerald-500'
                            : tx.status === 'PENDING'
                            ? 'bg-amber-500/20 text-amber-500'
                            : 'bg-rose-500/20 text-rose-500'
                        }`}>
                          {tx.status}
                        </span>
                      </td>
                      <td className={`py-3.5 px-3 text-[11px] ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                        {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        {tx.status === 'PENDING' ? (
                          <>
                            <button
                              onClick={() => handleApprovePayment(tx.id)}
                              className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition shadow-sm"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleRejectPayment(tx.id)}
                              className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-500 rounded-lg text-xs font-bold transition"
                            >
                              Reject
                            </button>
                          </>
                        ) : (
                          <span className={`text-[11px] ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>Resolved</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= TAB 4: SPECIAL PROMO COUPONS ================= */}
        {activeTab === 'COUPONS' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Active Special Bonus Codes</h3>
                <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>Manage promotional codes that boost client deposits</p>
              </div>
              <button
                onClick={() => setIsCouponModalOpen(true)}
                className="flex items-center space-x-2 bg-gradient-to-r from-trade-green to-emerald-500 hover:from-trade-greenHover hover:to-emerald-400 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-lg transition"
              >
                <Plus className="w-4 h-4" />
                <span>Create Special Coupon</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {coupons.map((cpn) => (
                <div
                  key={cpn.id}
                  className={`border rounded-3xl p-5 space-y-3 transition ${
                    isLight ? 'bg-white shadow-sm' : 'bg-[#161a26]'
                  } ${
                    cpn.isActive
                      ? (isLight ? 'border-slate-200' : 'border-[#262c3e] shadow-md')
                      : 'border-rose-500/30 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-black text-amber-500 font-mono tracking-wider bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-xl">
                      {cpn.code}
                    </span>
                    <button
                      onClick={() => handleToggleCoupon(cpn.id)}
                      className={`p-1.5 rounded-lg text-xs font-bold transition ${
                        cpn.isActive
                          ? 'text-emerald-500 hover:bg-emerald-500/10'
                          : (isLight ? 'text-slate-400 hover:bg-slate-100' : 'text-gray-500 hover:bg-white/5')
                      }`}
                    >
                      <Power className="w-4 h-4" />
                    </button>
                  </div>

                  <div className={`space-y-1.5 text-xs ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>
                    <div className="flex justify-between">
                      <span className={isLight ? 'text-slate-500' : 'text-gray-400'}>Bonus Percentage:</span>
                      <span className="font-black text-emerald-500">+{cpn.bonusPercentage}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={isLight ? 'text-slate-500' : 'text-gray-400'}>Max Bonus Cap:</span>
                      <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>${cpn.maxBonusUSD}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={isLight ? 'text-slate-500' : 'text-gray-400'}>Min Deposit Required:</span>
                      <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>${cpn.minDepositUSD}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={isLight ? 'text-slate-500' : 'text-gray-400'}>Total Redeemed:</span>
                      <span className={`font-bold ${isLight ? 'text-slate-800' : 'text-gray-200'}`}>
                        {cpn.usageCount} / {cpn.maxUsage}
                      </span>
                    </div>
                  </div>

                  <div className={`pt-2 border-t flex items-center justify-between ${
                    isLight ? 'border-slate-100' : 'border-[#262c3e]'
                  }`}>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      cpn.isActive ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'
                    }`}>
                      {cpn.isActive ? 'Active' : 'Disabled'}
                    </span>
                    <button
                      onClick={() => handleDeleteCoupon(cpn.id)}
                      className={`p-1 rounded transition ${
                        isLight ? 'text-slate-400 hover:text-rose-500' : 'text-gray-500 hover:text-rose-400'
                      }`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= TAB 4: QUOTEX RISK & WIN-RATE ENGINE ================= */}
        {activeTab === 'RISK' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Header Banner */}
            <div className={`p-6 rounded-3xl border shadow-sm transition-colors relative overflow-hidden ${
              isLight ? 'bg-gradient-to-r from-emerald-50 via-teal-50 to-white border-emerald-200' : 'bg-gradient-to-r from-[#141d28] via-[#101924] to-[#121620] border-emerald-500/20'
            }`}>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2">
                    <span className="bg-emerald-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Quotex Risk Engine
                    </span>
                    <span className="text-xs font-semibold text-emerald-500 flex items-center space-x-1">
                      <Zap className="w-3.5 h-3.5" />
                      <span>Micro-Pip Expiry Sniping Active</span>
                    </span>
                  </div>
                  <h2 className={`text-xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    House Edge & Win-Rate Algorithm Controller
                  </h2>
                  <p className={`text-xs max-w-2xl ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>
                    Directly controls the platform house probability. On Quotex OTC pairs, retail traders win approximately <span className="font-bold text-emerald-400">2 out of 10 trades (20% win-rate)</span> and lose 8 out of 10 trades. In the final 1.5–2.2 seconds before expiry, subtle 1–2 micro-pip price adjustments guarantee authentic chart candles and exact win-rate quotas without disruption.
                  </p>
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => handleSaveRiskSettings({ enabled: !riskSettings.enabled })}
                    className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 transition shadow-md ${
                      riskSettings.enabled
                        ? 'bg-rose-500 hover:bg-rose-400 text-white'
                        : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                    }`}
                  >
                    <Power className="w-4 h-4" />
                    <span>{riskSettings.enabled ? 'Pause Risk Engine' : 'Activate Risk Engine'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Main Interactive Controls Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Cols: Target Win-Rate & Sliders */}
              <div className={`lg:col-span-2 border rounded-3xl p-6 shadow-sm space-y-6 ${
                isLight ? 'bg-white border-slate-200' : 'bg-[#161a26] border-[#262c3e]'
              }`}>
                {/* Target Win Rate Meter */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className={`text-sm font-black uppercase tracking-wider ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        Target Trader Win Rate
                      </h3>
                      <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                        Percentage of trades won by retail traders across rolling 10-trade windows
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-black mono-num text-emerald-400">
                        {riskSettings.targetWinRate}%
                      </div>
                      <div className={`text-[10px] font-bold ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                        ~{Math.round(riskSettings.targetWinRate / 10)} Wins / {10 - Math.round(riskSettings.targetWinRate / 10)} Losses out of 10
                      </div>
                    </div>
                  </div>

                  {/* Range Slider */}
                  <div className="space-y-2">
                    <input
                      type="range"
                      min={5}
                      max={90}
                      step={1}
                      value={riskSettings.targetWinRate}
                      onChange={(e) => setRiskSettings({ ...riskSettings, targetWinRate: Number(e.target.value) })}
                      className="w-full h-2.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                    <div className="flex justify-between text-[10px] text-gray-500 font-bold px-1">
                      <span>5% (95% House Edge)</span>
                      <span className="text-emerald-400 font-extrabold">20% (Quotex Standard)</span>
                      <span>50% (50/50 Fair)</span>
                      <span>90% (Trader Boost)</span>
                    </div>
                  </div>

                  {/* Preset Quick Chips */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                    {[
                      { rate: 10, label: '10% (1 Win / 9 Loss)', desc: 'Heavy House Edge' },
                      { rate: 20, label: '20% (Quotex OTC)', desc: '2 Wins / 8 Loss (Recommended)' },
                      { rate: 35, label: '35% (3.5 Wins / 6.5 Loss)', desc: 'Moderate Retention' },
                      { rate: 50, label: '50% (5 Wins / 5 Loss)', desc: 'Fair Neutral Market' },
                    ].map((preset) => (
                      <button
                        key={preset.rate}
                        onClick={() => setRiskSettings({ ...riskSettings, targetWinRate: preset.rate })}
                        className={`p-3 rounded-2xl border text-left transition ${
                          riskSettings.targetWinRate === preset.rate
                            ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                            : (isLight ? 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100' : 'border-[#262c3e] bg-[#121620] text-gray-300 hover:border-gray-500')
                        }`}
                      >
                        <div className="text-xs font-black">{preset.label}</div>
                        <div className={`text-[10px] mt-0.5 ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>{preset.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Algorithmic Mode Selection */}
                <div className="space-y-3 pt-4 border-t border-[#262c3e]">
                  <h3 className={`text-xs font-black uppercase tracking-wider ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    Execution Strategy Mode
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      {
                        mode: 'QUOTEX_OTC' as const,
                        title: 'Quotex OTC Algorithm',
                        badge: 'Recommended',
                        desc: 'Dynamic retail win-rate cap at target rate (~20%). In the final 1.5–2.2 seconds before expiry, uses subtle micro-pip sniping across entry price if trade needs to settle as loss.',
                      },
                      {
                        mode: 'STRICT' as const,
                        title: 'Strict Probability Cap',
                        badge: 'Guaranteed',
                        desc: 'Hard limits win-rate strictly to target rate on rolling 10-trade slices. Settle price is strictly enforced to ensure exact 2 wins out of 10 trades.',
                      },
                      {
                        mode: 'BALANCED' as const,
                        title: 'Balanced Variance',
                        badge: 'Soft Edge',
                        desc: 'Applies probabilistic weighting towards the target win-rate while letting occasional natural streaks occur organically.',
                      },
                      {
                        mode: 'ORGANIC' as const,
                        title: 'Organic 50/50 Market',
                        badge: 'Neutral',
                        desc: 'Disables house edge manipulation. Pure Brownian random walk and unfiltered Binance live feeds decide all trade outcomes.',
                      },
                    ].map((item) => (
                      <div
                        key={item.mode}
                        onClick={() => setRiskSettings({ ...riskSettings, mode: item.mode })}
                        className={`p-4 rounded-2xl border cursor-pointer transition ${
                          riskSettings.mode === item.mode
                            ? 'border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500'
                            : (isLight ? 'border-slate-200 bg-slate-50 hover:bg-slate-100' : 'border-[#262c3e] bg-[#121620] hover:border-gray-600')
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-xs font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>
                            {item.title}
                          </span>
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                            {item.badge}
                          </span>
                        </div>
                        <p className={`text-[11px] leading-relaxed ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>
                          {item.desc}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sub-Toggles: Micro-pip sniping and Demo vs Real */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[#262c3e]">
                  {/* Micro-pip sniping */}
                  <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#121620] border-[#262c3e]'
                  }`}>
                    <div>
                      <div className={`text-xs font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        Micro-Pip Expiry Sniping
                      </div>
                      <p className={`text-[10px] mt-0.5 ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                        Nudge price 1–2 pips in final 2s across entry price
                      </p>
                    </div>
                    <button
                      onClick={() => setRiskSettings({ ...riskSettings, microPipSniping: !riskSettings.microPipSniping })}
                      className={`w-12 h-6 rounded-full transition-colors p-1 flex items-center ${
                        riskSettings.microPipSniping ? 'bg-emerald-500 justify-end' : 'bg-slate-700 justify-start'
                      }`}
                    >
                      <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                    </button>
                  </div>

                  {/* Apply to Real only */}
                  <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#121620] border-[#262c3e]'
                  }`}>
                    <div>
                      <div className={`text-xs font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        Target Scope
                      </div>
                      <p className={`text-[10px] mt-0.5 ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                        {riskSettings.applyToRealOnly ? 'Real Live Accounts Only' : 'Both Demo & Real (Matches Quotex)'}
                      </p>
                    </div>
                    <button
                      onClick={() => setRiskSettings({ ...riskSettings, applyToRealOnly: !riskSettings.applyToRealOnly })}
                      className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition ${
                        riskSettings.applyToRealOnly
                          ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                          : 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                      }`}
                    >
                      {riskSettings.applyToRealOnly ? 'Real Only' : 'Demo + Real'}
                    </button>
                  </div>
                </div>

                {/* Save Changes Button */}
                <div className="pt-2 flex items-center justify-end space-x-3">
                  {riskSaveSuccess && (
                    <span className="text-xs font-bold text-emerald-400 flex items-center space-x-1 animate-in fade-in">
                      <Check className="w-4 h-4" />
                      <span>Changes Saved Live!</span>
                    </span>
                  )}
                  <button
                    onClick={() => handleSaveRiskSettings(riskSettings)}
                    disabled={isSavingRisk}
                    className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition flex items-center space-x-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSavingRisk ? 'Saving Algorithm...' : 'Save & Deploy Risk Settings'}</span>
                  </button>
                </div>
              </div>

              {/* Right Col: Mathematical Breakdown & Quotex OTC Explanation */}
              <div className="space-y-6">
                <div className={`border rounded-3xl p-6 shadow-sm space-y-4 ${
                  isLight ? 'bg-white border-slate-200' : 'bg-[#161a26] border-[#262c3e]'
                }`}>
                  <h3 className={`text-xs font-black uppercase tracking-wider ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    Quotex House Probability Model
                  </h3>
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between py-2 border-b border-white/5">
                      <span className="text-gray-400">Retail Target Win-Rate:</span>
                      <span className="font-mono font-bold text-emerald-400">{riskSettings.targetWinRate}%</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-white/5">
                      <span className="text-gray-400">Platform House Edge:</span>
                      <span className="font-mono font-bold text-amber-400">{100 - riskSettings.targetWinRate}%</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-white/5">
                      <span className="text-gray-400">Wins per 10 Trades:</span>
                      <span className="font-mono font-bold text-white">~{Math.round(riskSettings.targetWinRate / 10)} Wins</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-white/5">
                      <span className="text-gray-400">Losses per 10 Trades:</span>
                      <span className="font-mono font-bold text-rose-400">~{10 - Math.round(riskSettings.targetWinRate / 10)} Losses</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-white/5">
                      <span className="text-gray-400">Expiry Micro-Sniping:</span>
                      <span className={`font-mono font-bold ${riskSettings.microPipSniping ? 'text-emerald-400' : 'text-gray-500'}`}>
                        {riskSettings.microPipSniping ? 'Active (1-2 pips)' : 'Disabled'}
                      </span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-gray-400">Sniping Timing:</span>
                      <span className="font-mono font-bold text-sky-400">T - 2.2s to T - 0s</span>
                    </div>
                  </div>
                </div>

                <div className={`border rounded-3xl p-6 shadow-sm space-y-3 ${
                  isLight ? 'bg-emerald-50/50 border-emerald-200' : 'bg-emerald-950/20 border-emerald-500/20'
                }`}>
                  <div className="flex items-center space-x-2 text-emerald-400">
                    <ShieldCheck className="w-5 h-5" />
                    <span className="text-xs font-black uppercase">How it operates</span>
                  </div>
                  <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>
                    1. When a trade is placed, the engine samples the trader's rolling 10-trade history.<br /><br />
                    2. If win-rate is currently at or above 20%, the system targets a loss. If the trade is already losing organically, zero adjustments are made.<br /><br />
                    3. If the trade is winning in the final 2 seconds, the OTC price is gently nudged by 1–2 micro-pips across the entry boundary, producing authentic candle wicks.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 5: MARKETS & PAYOUTS ================= */}
        {activeTab === 'MARKETS' && (
          <div className="space-y-4">
            <div>
              <h3 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Live Market Payout Margins</h3>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                Adjust the payout percentage for any market. Changes immediately take effect on all client charts!
              </p>
            </div>

            <div className={`border rounded-3xl p-5 shadow-xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 transition-colors ${
              isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#161a26] border-[#262c3e]'
            }`}>
              {assets.map((asset) => (
                <div
                  key={asset.id}
                  className={`border rounded-2xl p-4 flex flex-col justify-between transition-colors ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#121620] border-[#262c3e]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className={`font-bold text-xs ${isLight ? 'text-slate-900' : 'text-white'}`}>{asset.name}</span>
                      <span className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded ${
                        isLight ? 'bg-slate-200 text-slate-700' : 'bg-[#222838] text-gray-400'
                      }`}>
                        {asset.category}
                      </span>
                    </div>
                    <div className={`text-[11px] font-mono mt-0.5 ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                      Current Price: {asset.currentPrice.toFixed(asset.decimalPlaces)}
                    </div>
                  </div>

                  <div className={`mt-4 pt-3 border-t flex items-center space-x-2 ${
                    isLight ? 'border-slate-200' : 'border-[#262c3e]'
                  }`}>
                    <span className={`text-xs font-bold ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>Payout:</span>
                    <input
                      type="number"
                      min={10}
                      max={99}
                      value={payoutEdits[asset.id] ?? asset.payout}
                      onChange={(e) =>
                        setPayoutEdits({ ...payoutEdits, [asset.id]: Number(e.target.value) })
                      }
                      className={`w-16 border rounded-lg px-2 py-1 text-xs font-black text-center focus:outline-none ${
                        isLight ? 'bg-white border-slate-300 text-emerald-600' : 'bg-[#1f2537] border-[#2e354b] text-emerald-400'
                      }`}
                    />
                    <span className="text-xs font-black text-emerald-500">%</span>
                    <button
                      onClick={() => handleSavePayout(asset.id)}
                      className="flex-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-500 text-xs font-bold py-1 px-2.5 rounded-lg transition"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ================= MODAL: ADJUST USER BALANCE ================= */}
      {selectedUserForBalance && (() => {
        const USD_INR_RATE = 95.0;
        const enteredAmt = Math.max(0, Number(adjustAmount) || 0);

        // Auto-calculated amount that will reflect on the trader's account
        let previewAmount = enteredAmt;
        if (adjustInputCurrency === 'USD' && targetAccountCurrency === 'INR') {
          previewAmount = Number((enteredAmt * USD_INR_RATE).toFixed(2));
        } else if (adjustInputCurrency === 'INR' && targetAccountCurrency === 'USD') {
          previewAmount = Number((enteredAmt / USD_INR_RATE).toFixed(2));
        }

        const crossEquivalent = adjustInputCurrency === 'INR'
          ? `$${(enteredAmt / USD_INR_RATE).toFixed(2)} USD`
          : `₹${(enteredAmt * USD_INR_RATE).toLocaleString('en-IN', { maximumFractionDigits: 2 })} INR`;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className={`w-full max-w-md border rounded-3xl p-6 shadow-2xl space-y-4 transition-colors max-h-[92vh] overflow-y-auto ${
              isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#1a1f2e] border-[#2e354b] text-white'
            }`}>
              <div className="flex items-center justify-between pb-2 border-b border-gray-500/20">
                <div>
                  <h3 className={`text-base font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>Adjust Trader Balance</h3>
                  <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                    Account: <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{selectedUserForBalance.name}</span> ({selectedUserForBalance.id})
                  </p>
                </div>
                <button
                  onClick={() => setSelectedUserForBalance(null)}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-500/20 text-gray-400 hover:text-white transition"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3.5">
                {/* 1. Target Balance Selector */}
                <div>
                  <label className={`text-xs font-bold block mb-1.5 ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>Target Account</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setBalanceAccountType('REAL')}
                      className={`py-2 px-3 text-xs font-bold rounded-xl border text-left transition ${
                        balanceAccountType === 'REAL'
                          ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400 shadow-sm'
                          : (isLight ? 'border-slate-200 bg-slate-50 text-slate-600' : 'border-[#2e354b] text-gray-400')
                      }`}
                    >
                      <div className="text-[10px] uppercase font-bold text-gray-400">Live Real</div>
                      <div className="text-sm font-black mono-num">
                        {formatCurrency(selectedUserForBalance.realBalance, (selectedUserForBalance.currency as any) || 'INR')}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBalanceAccountType('DEMO')}
                      className={`py-2 px-3 text-xs font-bold rounded-xl border text-left transition ${
                        balanceAccountType === 'DEMO'
                          ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400 shadow-sm'
                          : (isLight ? 'border-slate-200 bg-slate-50 text-slate-600' : 'border-[#2e354b] text-gray-400')
                      }`}
                    >
                      <div className="text-[10px] uppercase font-bold text-gray-400">Demo Practice</div>
                      <div className="text-sm font-black mono-num">
                        {formatCurrency(selectedUserForBalance.demoBalance, (selectedUserForBalance.currency as any) || 'INR')}
                      </div>
                    </button>
                  </div>
                </div>

                {/* 2. Action: Credit vs Debit */}
                <div>
                  <label className={`text-xs font-bold block mb-1.5 ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>Action</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setBalanceAction('ADD')}
                      className={`py-2 text-xs font-black rounded-xl border transition ${
                        balanceAction === 'ADD'
                          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400 shadow-sm'
                          : (isLight ? 'border-slate-200 bg-slate-50 text-slate-600' : 'border-[#2e354b] text-gray-400')
                      }`}
                    >
                      + Credit Funds
                    </button>
                    <button
                      type="button"
                      onClick={() => setBalanceAction('REMOVE')}
                      className={`py-2 text-xs font-black rounded-xl border transition ${
                        balanceAction === 'REMOVE'
                          ? 'border-rose-500 bg-rose-500/20 text-rose-400 shadow-sm'
                          : (isLight ? 'border-slate-200 bg-slate-50 text-slate-600' : 'border-[#2e354b] text-gray-400')
                      }`}
                    >
                      - Debit Funds
                    </button>
                  </div>
                </div>

                {/* 3. Account Currency (Strictly INR or USD, default INR) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className={`text-xs font-bold ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>
                      Trader Account Currency
                    </label>
                    <span className="text-[10px] font-bold text-emerald-400">Default: INR</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTargetAccountCurrency('INR')}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                        targetAccountCurrency === 'INR'
                          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500'
                          : (isLight ? 'border-slate-300 bg-slate-50 text-slate-700' : 'border-[#2e354b] bg-[#121620] text-gray-400')
                      }`}
                    >
                      <span className="text-sm">🇮🇳</span>
                      <span>INR (₹ - Indian Rupee)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTargetAccountCurrency('USD')}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                        targetAccountCurrency === 'USD'
                          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500'
                          : (isLight ? 'border-slate-300 bg-slate-50 text-slate-700' : 'border-[#2e354b] bg-[#121620] text-gray-400')
                      }`}
                    >
                      <span className="text-sm">🇺🇸</span>
                      <span>USD ($ - US Dollar)</span>
                    </button>
                  </div>
                </div>

                {/* 4. Fund Adjustment Input Currency (INR vs USD) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className={`text-xs font-bold ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>
                      Choose Deposit / Input Currency
                    </label>
                    <span className="text-[10px] text-gray-400">Auto-converts to trader currency</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-black/30 border border-gray-700/50">
                    <button
                      type="button"
                      onClick={() => {
                        if (adjustInputCurrency !== 'INR') {
                          setAdjustInputCurrency('INR');
                          setAdjustAmount(adjustAmount >= 10 ? Math.round(adjustAmount * USD_INR_RATE) : 1000);
                        }
                      }}
                      className={`py-2 rounded-xl text-xs font-black transition flex items-center justify-center space-x-1.5 ${
                        adjustInputCurrency === 'INR'
                          ? 'bg-emerald-500 text-white shadow-lg'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <span>🇮🇳</span>
                      <span>INR (₹) - Default</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (adjustInputCurrency !== 'USD') {
                          setAdjustInputCurrency('USD');
                          setAdjustAmount(adjustAmount >= 95 ? Math.round(adjustAmount / USD_INR_RATE) : 10);
                        }
                      }}
                      className={`py-2 rounded-xl text-xs font-black transition flex items-center justify-center space-x-1.5 ${
                        adjustInputCurrency === 'USD'
                          ? 'bg-emerald-500 text-white shadow-lg'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <span>🇺🇸</span>
                      <span>USD ($)</span>
                    </button>
                  </div>
                </div>

                {/* 5. Amount Input & Quick Chips */}
                <div>
                  <label className={`text-xs font-bold block mb-1.5 ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>
                    Amount in {adjustInputCurrency === 'INR' ? 'INR (₹)' : 'USD ($)'}
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-base">
                      {adjustInputCurrency === 'INR' ? '₹' : '$'}
                    </span>
                    <input
                      type="number"
                      value={adjustAmount}
                      onChange={(e) => setAdjustAmount(Math.max(1, Number(e.target.value)))}
                      className={`w-full border rounded-2xl pl-9 pr-4 py-2.5 text-base font-black focus:outline-none transition ${
                        isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#121620] border-[#2e354b] text-white'
                      }`}
                    />
                  </div>

                  {/* Quick Chips */}
                  <div className="grid grid-cols-5 gap-1.5 mt-2">
                    {adjustInputCurrency === 'INR' ? (
                      [500, 1000, 2500, 5000, 10000].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setAdjustAmount(val)}
                          className={`py-1 text-[11px] font-bold rounded-lg border transition ${
                            adjustAmount === val
                              ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                              : (isLight ? 'border-slate-200 bg-slate-100 text-slate-600' : 'border-[#2e354b] bg-[#121620] text-gray-400 hover:text-white')
                          }`}
                        >
                          +{val >= 1000 ? `${val / 1000}k` : val}
                        </button>
                      ))
                    ) : (
                      [10, 25, 50, 100, 250].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setAdjustAmount(val)}
                          className={`py-1 text-[11px] font-bold rounded-lg border transition ${
                            adjustAmount === val
                              ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                              : (isLight ? 'border-slate-200 bg-slate-100 text-slate-600' : 'border-[#2e354b] bg-[#121620] text-gray-400 hover:text-white')
                          }`}
                        >
                          +${val}
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* 6. Live Cross-Currency Calculation & Reflection Card */}
                <div className="p-3.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400 font-medium">Input Value:</span>
                    <span className="font-bold text-white font-mono">
                      {adjustInputCurrency === 'INR' ? `₹${enteredAmt.toLocaleString()}` : `$${enteredAmt.toLocaleString()}`} {adjustInputCurrency}
                      <span className="text-gray-400 font-normal ml-1">≈ {crossEquivalent}</span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-emerald-500/20">
                    <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                      <span>👉</span> Will reflect on trader account:
                    </span>
                    <span className="font-black text-sm font-mono text-emerald-300">
                      {balanceAction === 'ADD' ? '+' : '-'}
                      {targetAccountCurrency === 'INR' ? '₹' : '$'}
                      {previewAmount.toLocaleString()} {targetAccountCurrency}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-gray-400 pt-0.5">
                    <span>Forex Grow Exchange Peg:</span>
                    <span className="font-bold text-gray-300 font-mono">1 USD = ₹95.00 INR (Nov 2026 Rate)</span>
                  </div>
                </div>

                {/* 7. Audit Reason */}
                <div>
                  <label className={`text-xs font-bold block mb-1 ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>Audit Reason</label>
                  <input
                    type="text"
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    placeholder="e.g. Deposit manual top-up, VIP reward"
                    className={`w-full border rounded-xl px-4 py-2 text-xs focus:outline-none transition ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400' : 'bg-[#121620] border-[#2e354b] text-white'
                    }`}
                  />
                </div>
              </div>

              {/* 8. Action Buttons */}
              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedUserForBalance(null)}
                  className={`flex-1 font-bold py-2.5 rounded-xl text-xs transition border ${
                    isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200' : 'bg-[#222838] hover:bg-[#2c3347] text-gray-300 border-[#2e354b]'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAdjustBalance}
                  className="flex-1 bg-gradient-to-r from-trade-green to-emerald-500 text-white font-black py-2.5 rounded-xl text-xs shadow-lg hover:brightness-110 active:scale-95 transition"
                >
                  Confirm {balanceAction === 'ADD' ? 'Credit' : 'Debit'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ================= MODAL: EDIT USER LEVEL & KYC ================= */}
      {selectedUserForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className={`w-full max-w-md border rounded-3xl p-6 shadow-2xl space-y-4 transition-colors ${
            isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#1a1f2e] border-[#2e354b] text-white'
          }`}>
            <h3 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Edit Trader Profile & Tier</h3>
            <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>{selectedUserForEdit.name} ({selectedUserForEdit.id})</p>

            <div className="space-y-3">
              <div>
                <label className={`text-xs font-bold block mb-1 ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>VIP Tier Level</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['STANDARD', 'PRO', 'VIP'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => handleUpdateUser({ vipLevel: lvl })}
                      className={`py-2 text-xs font-black rounded-xl border transition ${
                        selectedUserForEdit.vipLevel === lvl
                          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-500'
                          : (isLight ? 'border-slate-200 bg-slate-50 text-slate-600' : 'border-[#2e354b] text-gray-400')
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={`text-xs font-bold block mb-1 ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>KYC Verification</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleUpdateUser({ isKycVerified: true })}
                    className={`py-2 text-xs font-bold rounded-xl border transition ${
                      selectedUserForEdit.isKycVerified
                        ? 'border-emerald-500 bg-emerald-500/20 text-emerald-500'
                        : (isLight ? 'border-slate-200 bg-slate-50 text-slate-600' : 'border-[#2e354b] text-gray-400')
                    }`}
                  >
                    Verified
                  </button>
                  <button
                    onClick={() => handleUpdateUser({ isKycVerified: false })}
                    className={`py-2 text-xs font-bold rounded-xl border transition ${
                      !selectedUserForEdit.isKycVerified
                        ? 'border-rose-500 bg-rose-500/20 text-rose-500'
                        : (isLight ? 'border-slate-200 bg-slate-50 text-slate-600' : 'border-[#2e354b] text-gray-400')
                    }`}
                  >
                    Unverified
                  </button>
                </div>
              </div>

              <div>
                <label className={`text-xs font-bold block mb-1 ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>Account Status</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleUpdateUser({ status: 'ACTIVE' })}
                    className={`py-2 text-xs font-bold rounded-xl border transition ${
                      selectedUserForEdit.status === 'ACTIVE'
                        ? 'border-emerald-500 bg-emerald-500/20 text-emerald-500'
                        : (isLight ? 'border-slate-200 bg-slate-50 text-slate-600' : 'border-[#2e354b] text-gray-400')
                    }`}
                  >
                    Active
                  </button>
                  <button
                    onClick={() => handleUpdateUser({ status: 'FROZEN' })}
                    className={`py-2 text-xs font-bold rounded-xl border transition ${
                      selectedUserForEdit.status === 'FROZEN'
                        ? 'border-rose-500 bg-rose-500/20 text-rose-500'
                        : (isLight ? 'border-slate-200 bg-slate-50 text-slate-600' : 'border-[#2e354b] text-gray-400')
                    }`}
                  >
                    Suspended / Frozen
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-3">
              <button
                onClick={() => setSelectedUserForEdit(null)}
                className={`w-full font-bold py-2.5 rounded-xl text-xs transition border ${
                  isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200' : 'bg-[#222838] hover:bg-[#2c3347] text-white border-[#2e354b]'
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: CREATE SPECIAL COUPON ================= */}
      {isCouponModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className={`w-full max-w-md border rounded-3xl p-6 shadow-2xl space-y-4 transition-colors ${
            isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#1a1f2e] border-[#2e354b] text-white'
          }`}>
            <h3 className={`text-base font-bold flex items-center space-x-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
              <Tag className="w-5 h-5 text-emerald-500" />
              <span>Create Special Promo Coupon</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className={`text-xs font-bold block mb-1 ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>
                  Coupon Code (e.g. VIP2026)
                </label>
                <input
                  type="text"
                  value={newCouponCode}
                  onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
                  placeholder="CODE NAME"
                  className={`w-full border rounded-xl px-4 py-2 text-sm font-mono font-bold uppercase focus:outline-none ${
                    isLight ? 'bg-slate-50 border-slate-300 text-amber-600' : 'bg-[#121620] border-[#2e354b] text-amber-400'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={`text-xs font-bold block mb-1 ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>Bonus %</label>
                  <input
                    type="number"
                    value={newBonusPct}
                    onChange={(e) => setNewBonusPct(Number(e.target.value))}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-black focus:outline-none ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#121620] border-[#2e354b] text-white'
                    }`}
                  />
                </div>
                <div>
                  <label className={`text-xs font-bold block mb-1 ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>Max Bonus ($)</label>
                  <input
                    type="number"
                    value={newMaxBonus}
                    onChange={(e) => setNewMaxBonus(Number(e.target.value))}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-black focus:outline-none ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#121620] border-[#2e354b] text-white'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={`text-xs font-bold block mb-1 ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>Min Deposit ($)</label>
                  <input
                    type="number"
                    value={newMinDeposit}
                    onChange={(e) => setNewMinDeposit(Number(e.target.value))}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-black focus:outline-none ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#121620] border-[#2e354b] text-white'
                    }`}
                  />
                </div>
                <div>
                  <label className={`text-xs font-bold block mb-1 ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>Max Usages</label>
                  <input
                    type="number"
                    value={newMaxUsage}
                    onChange={(e) => setNewMaxUsage(Number(e.target.value))}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-black focus:outline-none ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#121620] border-[#2e354b] text-white'
                    }`}
                  />
                </div>
              </div>
            </div>

            <div className="flex space-x-2 pt-3">
              <button
                onClick={() => setIsCouponModalOpen(false)}
                className={`flex-1 font-bold py-2.5 rounded-xl text-xs transition border ${
                  isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200' : 'bg-[#222838] hover:bg-[#2c3347] text-gray-300 border-[#2e354b]'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCoupon}
                className="flex-1 bg-gradient-to-r from-trade-green to-emerald-500 text-white font-black py-2.5 rounded-xl text-xs shadow-lg transition"
              >
                Publish Coupon
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADMIN CREATE USER ACCOUNT ================= */}
      {isCreateUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className={`w-full max-w-lg border rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto transition-colors ${
            isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#1a1f2e] border-[#2e354b] text-white'
          }`}>
            <div className={`flex items-center space-x-3 pb-3 border-b ${
              isLight ? 'border-slate-200' : 'border-[#2e354b]'
            }`}>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-lg">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Create New Trader Account</h3>
                <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>Restricted Admin Portal - Issue accounts directly</p>
              </div>
            </div>

            {createdSlip ? (
              <div className="space-y-4 py-2">
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-mono space-y-2">
                  <div className="font-sans font-bold text-emerald-400 text-sm">✅ Trader Account Created & Activated!</div>
                  <div><strong>Name:</strong> {createdSlip.name}</div>
                  <div><strong>Email:</strong> {createdSlip.email}</div>
                  <div><strong>Phone:</strong> {createdSlip.phone}</div>
                  <div><strong>Password:</strong> {createdSlip.password}</div>
                  <div><strong>Currency:</strong> {createdSlip.currency}</div>
                  <div><strong>Demo:</strong> ${createdSlip.demoBalance.toLocaleString()}</div>
                  <div><strong>Real:</strong> ${createdSlip.realBalance.toLocaleString()}</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const text = `🌟 FOREX GROW TRADING CREDENTIALS 🌟\nName: ${createdSlip.name}\nEmail: ${createdSlip.email}\nPhone: ${createdSlip.phone}\nPassword: ${createdSlip.password}\nCurrency: ${createdSlip.currency}\nTerminal: ${createdSlip.url}`;
                    navigator.clipboard.writeText(text);
                    alert('Credentials copied to clipboard!');
                  }}
                  className="w-full py-3 bg-[#00c679] hover:bg-[#00e089] text-slate-950 font-black rounded-xl text-xs flex items-center justify-center space-x-1"
                >
                  <Copy className="w-4 h-4" />
                  <span>📋 Copy Credentials for Client</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCreatedSlip(null);
                    setIsCreateUserModalOpen(false);
                  }}
                  className="w-full py-2 bg-white/10 text-xs font-bold rounded-xl"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`text-xs font-bold block mb-1 ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-bold focus:outline-none ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#121620] border-[#2e354b] text-white'
                    }`}
                  />
                </div>
                <div>
                  <label className={`text-xs font-bold block mb-1 ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="trader@forexgrow.com"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-bold focus:outline-none ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#121620] border-[#2e354b] text-white'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`text-xs font-bold block mb-1 ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>Phone Number (Login Enabled)</label>
                  <input
                    type="text"
                    placeholder="e.g. +91 98765 43210"
                    value={newUserPhone}
                    onChange={(e) => setNewUserPhone(e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-bold focus:outline-none ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#121620] border-[#2e354b] text-white'
                    }`}
                  />
                </div>
                <div>
                  <label className={`text-xs font-bold block mb-1 ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>Initial Password *</label>
                  <input
                    type="text"
                    required
                    placeholder="Trader@2026"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#121620] border-[#2e354b] text-amber-400'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-xs font-bold block mb-1 ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>Account Currency</label>
                  <select
                    value={newUserCurrency}
                    onChange={(e) => setNewUserCurrency(e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-bold focus:outline-none ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#121620] border-[#2e354b] text-white'
                    }`}
                  >
                    <option value="INR">🇮🇳 INR (₹ - Indian Rupee) - Default</option>
                    <option value="USD">🇺🇸 USD ($ - US Dollar)</option>
                    <option value="EUR">🇪🇺 EUR (€ - Euro)</option>
                    <option value="GBP">🇬🇧 GBP (£ - British Pound)</option>
                    <option value="BRL">🇧🇷 BRL (R$ - Brazilian Real)</option>
                    <option value="AED">🇦🇪 AED (AED - UAE Dirham)</option>
                  </select>
                </div>
                <div>
                  <label className={`text-xs font-bold block mb-1 ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>VIP Tier</label>
                  <select
                    value={newUserVip}
                    onChange={(e) => setNewUserVip(e.target.value as any)}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-bold focus:outline-none ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#121620] border-[#2e354b] text-white'
                    }`}
                  >
                    <option value="STANDARD">STANDARD</option>
                    <option value="PRO">PRO (+2% payout)</option>
                    <option value="VIP">VIP (+4% payout)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-xs font-bold block mb-1 ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>Initial Demo Balance ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={newUserDemoBal}
                    onChange={(e) => setNewUserDemoBal(Number(e.target.value))}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-bold focus:outline-none ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#121620] border-[#2e354b] text-white'
                    }`}
                  />
                </div>
                <div>
                  <label className={`text-xs font-bold block mb-1 ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>Initial Real Balance ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={newUserRealBal}
                    onChange={(e) => setNewUserRealBal(Number(e.target.value))}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-bold focus:outline-none ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#121620] border-[#2e354b] text-white'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-xs font-bold block mb-1 ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>Active Balance Mode</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewUserAccountType('DEMO')}
                      className={`py-2 text-xs font-bold rounded-xl border transition ${
                        newUserAccountType === 'DEMO'
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500'
                          : (isLight ? 'border-slate-200 bg-slate-50 text-slate-600' : 'border-[#2e354b] text-gray-400')
                      }`}
                    >
                      Demo
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewUserAccountType('REAL')}
                      className={`py-2 text-xs font-bold rounded-xl border transition ${
                        newUserAccountType === 'REAL'
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500'
                          : (isLight ? 'border-slate-200 bg-slate-50 text-slate-600' : 'border-[#2e354b] text-gray-400')
                      }`}
                    >
                      Live Real
                    </button>
                  </div>
                </div>

                <div>
                  <label className={`text-xs font-bold block mb-1 ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>KYC Verification</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewUserKyc(true)}
                      className={`py-2 text-xs font-bold rounded-xl border transition ${
                        newUserKyc
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500'
                          : (isLight ? 'border-slate-200 bg-slate-50 text-slate-600' : 'border-[#2e354b] text-gray-400')
                      }`}
                    >
                      Verified
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewUserKyc(false)}
                      className={`py-2 text-xs font-bold rounded-xl border transition ${
                        !newUserKyc
                          ? 'border-amber-500 bg-amber-500/10 text-amber-500'
                          : (isLight ? 'border-slate-200 bg-slate-50 text-slate-600' : 'border-[#2e354b] text-gray-400')
                      }`}
                    >
                      Pending
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className={`text-xs font-bold block mb-1 ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>Account Status</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewUserStatus('ACTIVE')}
                    className={`py-2 text-xs font-bold rounded-xl border transition ${
                      newUserStatus === 'ACTIVE'
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500'
                        : (isLight ? 'border-slate-200 bg-slate-50 text-slate-600' : 'border-[#2e354b] text-gray-400')
                    }`}
                  >
                    Active
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewUserStatus('FROZEN')}
                    className={`py-2 text-xs font-bold rounded-xl border transition ${
                      newUserStatus === 'FROZEN'
                        ? 'border-rose-500 bg-rose-500/10 text-rose-500'
                        : (isLight ? 'border-slate-200 bg-slate-50 text-slate-600' : 'border-[#2e354b] text-gray-400')
                    }`}
                  >
                    Frozen / Suspended
                  </button>
                </div>
              </div>

              <div className="flex space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateUserModalOpen(false)}
                  className={`flex-1 font-bold py-2.5 rounded-xl text-xs transition border ${
                    isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200' : 'bg-[#222838] hover:bg-[#2c3347] text-gray-300 border-[#2e354b]'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black py-2.5 rounded-xl text-xs shadow-lg transition"
                >
                  Create Trader Account
                </button>
              </div>
            </form>
            )}
          </div>
        </div>
      )}

      {/* ================= MODAL: USER TRADE HISTORY MANAGEMENT ================= */}
      {selectedUserForTrades && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className={`w-full max-w-3xl border rounded-3xl shadow-2xl flex flex-col max-h-[85vh] transition-colors ${
            isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#1a1f2e] border-[#2e354b] text-white'
          }`}>
            {/* Modal Header */}
            <div className={`flex items-center justify-between px-6 py-4 border-b ${
              isLight ? 'border-slate-200' : 'border-[#2e354b]'
            }`}>
              <div>
                <h3 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Trade History — {selectedUserForTrades.name}
                </h3>
                <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                  {selectedUserForTrades.id} · {selectedUserForTrades.email}
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleClearUserHistory}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 rounded-xl text-xs font-bold transition border border-rose-500/30"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear All History</span>
                </button>
                <button
                  onClick={() => { setSelectedUserForTrades(null); setUserTrades(null); }}
                  className={`p-1.5 rounded-xl transition ${
                    isLight ? 'text-slate-400 hover:text-slate-800 hover:bg-slate-100' : 'text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {tradesLoading ? (
                <div className="text-center py-12 text-gray-400 text-sm">Loading trade records…</div>
              ) : !userTrades ? (
                <div className="text-center py-12 text-rose-400 text-sm">Failed to load trades.</div>
              ) : (
                <>
                  {/* Active Trades */}
                  <div>
                    <h4 className={`text-xs font-black uppercase mb-3 ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                      Active Open Trades ({userTrades.activeTrades.length})
                    </h4>
                    {userTrades.activeTrades.length === 0 ? (
                      <p className={`text-xs ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>No active trades.</p>
                    ) : (
                      <div className="space-y-2">
                        {userTrades.activeTrades.map((t) => (
                          <div key={t.id} className={`flex items-center justify-between p-3 border rounded-2xl ${
                            isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#121620] border-[#262c3e]'
                          }`}>
                            <div className="space-y-0.5">
                              <div className="flex items-center space-x-2">
                                <span className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{t.assetId}</span>
                                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                                  t.direction === 'UP' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'
                                }`}>{t.direction}</span>
                                <span className="text-[10px] bg-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded font-bold">OPEN</span>
                                <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>{t.accountType}</span>
                              </div>
                              <div className={`text-[11px] font-mono ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                                Amount: {formatCurrency(t.amount, 'USD')} · Entry: {t.entryPrice} · Expires: {new Date(t.expiryTime).toLocaleTimeString()}
                              </div>
                            </div>
                            <button
                              onClick={() => handleDeleteTrade(t.id)}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                              title="Delete trade"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Trade History */}
                  <div>
                    <h4 className={`text-xs font-black uppercase mb-3 ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                      Settled Trade History ({userTrades.tradeHistory.length})
                    </h4>
                    {userTrades.tradeHistory.length === 0 ? (
                      <p className={`text-xs ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>No trade history records.</p>
                    ) : (
                      <div className="space-y-2">
                        {userTrades.tradeHistory.map((t) => (
                          <div key={t.id} className={`flex items-center justify-between p-3 border rounded-2xl ${
                            isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#121620] border-[#262c3e]'
                          }`}>
                            <div className="space-y-0.5">
                              <div className="flex items-center space-x-2">
                                <span className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{t.assetId}</span>
                                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                                  t.direction === 'UP' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'
                                }`}>{t.direction}</span>
                                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                                  t.status === 'WON'
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : t.status === 'LOST'
                                    ? 'bg-rose-500/20 text-rose-400'
                                    : 'bg-gray-500/20 text-gray-400'
                                }`}>{t.status}</span>
                                <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>{t.accountType}</span>
                              </div>
                              <div className={`text-[11px] font-mono ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                                Amount: {formatCurrency(t.amount, (selectedUserForTrades?.currency as any) || 'INR')} · Entry: {t.entryPrice} · Exit: {t.exitPrice ?? '-'}
                                {t.profit !== undefined && (
                                  <span className={t.profit >= 0 ? ' text-emerald-500 font-bold' : ' text-rose-500 font-bold'}>
                                    {' '}· P&L: {t.profit >= 0 ? '+' : ''}{formatCurrency(t.profit, (selectedUserForTrades?.currency as any) || 'INR')}
                                  </span>
                                )}
                                {' '}· {new Date(t.openTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                            <button
                              onClick={() => handleDeleteTrade(t.id)}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                              title="Delete this trade record"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: PAYMENT SCREENSHOT PROOF PREVIEW ================= */}
      {previewProofUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className={`w-full max-w-xl border rounded-3xl p-5 shadow-2xl space-y-4 max-h-[90vh] flex flex-col transition-colors ${
            isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#1a1f2e] border-[#2e354b] text-white'
          }`}>
            <div className={`flex items-center justify-between pb-3 border-b ${
              isLight ? 'border-slate-200' : 'border-[#2e354b]'
            }`}>
              <div className="flex items-center space-x-2">
                <ImageIcon className="w-5 h-5 text-emerald-500" />
                <h3 className={`font-bold text-base ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Payment Screenshot Slip Verification
                </h3>
              </div>
              <button
                onClick={() => setPreviewProofUrl(null)}
                className={`p-1.5 rounded-xl transition ${
                  isLight ? 'text-slate-400 hover:text-slate-800 hover:bg-slate-100' : 'text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto rounded-2xl border border-dashed border-slate-300 dark:border-white/10 bg-slate-900/50 flex items-center justify-center p-2 min-h-[300px]">
              <img
                src={previewProofUrl}
                alt="Payment Slip Proof"
                className="max-h-[60vh] max-w-full object-contain rounded-xl shadow-lg"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className={`text-xs ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                Verify UTR and paid amount before approving
              </span>
              <button
                onClick={() => setPreviewProofUrl(null)}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md transition"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDIT RECEIVING BANK & UPI SETTINGS ================= */}
      {isEditPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in">
          <div className={`w-full max-w-xl border rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col transition-colors ${
            isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#1a1f2e] border-[#2e354b] text-white'
          }`}>
            <div className={`flex items-center justify-between pb-3 border-b ${
              isLight ? 'border-slate-200' : 'border-[#2e354b]'
            }`}>
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-500 flex items-center justify-center text-white shadow-md">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`font-black text-base ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    Edit Client Deposit Receiving Accounts
                  </h3>
                  <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                    Changes update live immediately in the Trader Cashier modal.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditPaymentModalOpen(false)}
                className={`p-1.5 rounded-xl transition ${
                  isLight ? 'text-slate-400 hover:text-slate-800 hover:bg-slate-100' : 'text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePaymentSettings} className="space-y-4 overflow-y-auto pr-1">
              {/* Bank Transfer Details Section */}
              <div className={`p-4 rounded-2xl border space-y-3 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#121620] border-[#262c3e]'
              }`}>
                <div className="flex items-center space-x-2 text-xs font-black uppercase text-sky-400">
                  <Building2 className="w-4 h-4" />
                  <span>1. Bank Account Details (IMPS / NEFT)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-400 mb-1">Bank Name *</label>
                    <input
                      type="text"
                      required
                      value={editBankName}
                      onChange={(e) => setEditBankName(e.target.value)}
                      placeholder="e.g. HDFC Bank, ICICI Bank"
                      className={`w-full p-2.5 rounded-xl border text-xs font-bold focus:outline-none ${
                        isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#182030] border-[#2e354b] text-white'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-400 mb-1">Beneficiary / Holder Name *</label>
                    <input
                      type="text"
                      required
                      value={editAccountHolderName}
                      onChange={(e) => setEditAccountHolderName(e.target.value)}
                      placeholder="e.g. Forex Grow Institutional Desk"
                      className={`w-full p-2.5 rounded-xl border text-xs font-bold focus:outline-none ${
                        isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#182030] border-[#2e354b] text-white'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-400 mb-1">Bank Account Number *</label>
                    <input
                      type="text"
                      required
                      value={editAccountNumber}
                      onChange={(e) => setEditAccountNumber(e.target.value.replace(/\s+/g, ''))}
                      placeholder="e.g. 50200084729104"
                      className={`w-full p-2.5 rounded-xl border text-xs font-mono font-bold focus:outline-none text-emerald-400 ${
                        isLight ? 'bg-white border-slate-300' : 'bg-[#182030] border-[#2e354b]'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-400 mb-1">IFSC Code *</label>
                    <input
                      type="text"
                      required
                      value={editIfscCode}
                      onChange={(e) => setEditIfscCode(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                      placeholder="e.g. HDFC0000240"
                      className={`w-full p-2.5 rounded-xl border text-xs font-mono font-bold uppercase focus:outline-none text-sky-400 ${
                        isLight ? 'bg-white border-slate-300' : 'bg-[#182030] border-[#2e354b]'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-400 mb-1">Account Type</label>
                    <input
                      type="text"
                      value={editAccountType}
                      onChange={(e) => setEditAccountType(e.target.value)}
                      placeholder="Current Account / Savings Account"
                      className={`w-full p-2.5 rounded-xl border text-xs font-bold focus:outline-none ${
                        isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#182030] border-[#2e354b] text-white'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-400 mb-1">Branch Name</label>
                    <input
                      type="text"
                      value={editBranchName}
                      onChange={(e) => setEditBranchName(e.target.value)}
                      placeholder="e.g. Nariman Point, Mumbai"
                      className={`w-full p-2.5 rounded-xl border text-xs font-bold focus:outline-none ${
                        isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#182030] border-[#2e354b] text-white'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* UPI Details Section */}
              <div className={`p-4 rounded-2xl border space-y-3 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#121620] border-[#262c3e]'
              }`}>
                <div className="flex items-center space-x-2 text-xs font-black uppercase text-emerald-400">
                  <Smartphone className="w-4 h-4" />
                  <span>2. Official UPI Receiving Details</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-400 mb-1">UPI ID (VPA) *</label>
                    <input
                      type="text"
                      required
                      value={editUpiId}
                      onChange={(e) => setEditUpiId(e.target.value.toLowerCase().trim())}
                      placeholder="e.g. forexgrow@icici"
                      className={`w-full p-2.5 rounded-xl border text-xs font-mono font-bold focus:outline-none text-amber-400 ${
                        isLight ? 'bg-white border-slate-300' : 'bg-[#182030] border-[#2e354b]'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-400 mb-1">UPI Payee Display Name</label>
                    <input
                      type="text"
                      value={editUpiName}
                      onChange={(e) => setEditUpiName(e.target.value)}
                      placeholder="e.g. Forex Grow Official Desk"
                      className={`w-full p-2.5 rounded-xl border text-xs font-bold focus:outline-none ${
                        isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#182030] border-[#2e354b] text-white'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Instructions Section */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 mb-1">Client Payment Instructions</label>
                <textarea
                  rows={2}
                  value={editInstructions}
                  onChange={(e) => setEditInstructions(e.target.value)}
                  placeholder="Instructions displayed to clients on payment page..."
                  className={`w-full p-2.5 rounded-xl border text-xs focus:outline-none ${
                    isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#182030] border-[#2e354b] text-white'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsEditPaymentModalOpen(false)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition ${
                    isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-white/5 hover:bg-white/10 text-gray-300'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingPaymentSettings}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition flex items-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingPaymentSettings ? 'Updating System...' : 'Save & Publish Live'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Admin Toast Notification */}
      {adminNotification && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1e2333]/95 border border-emerald-500/40 text-emerald-400 text-xs font-black px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-md animate-bounce flex items-center space-x-2">
          <span>{adminNotification}</span>
        </div>
      )}
    </div>
  );
};
