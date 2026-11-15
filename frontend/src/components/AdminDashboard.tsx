import React, { useState, useEffect, useRef } from 'react';
import { useTrading } from '../context/TradingContext';
import { formatCurrency } from '../utils/currency';
import { apiUrl } from '../utils/api';
import { ForexGrowLogo } from './ForexGrowLogo';
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
  Mail,
  Key,
  Sparkles,
  CheckCircle2,
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
  BarChart3,
  Calendar,
  ArrowDownLeft,
  ArrowUpRight,
  Download,
  Filter,
  Wallet,
} from 'lucide-react';

interface AdminDashboardProps {
  onClose?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = () => {
  const { assets, theme, toggleTheme } = useTrading();
  const isLight = theme === 'light';
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'USERS' | 'CASHFLOW' | 'PAYMENTS' | 'RISK' | 'COUPONS' | 'MARKETS'>('OVERVIEW');
  const [riskSettings, setRiskSettings] = useState<RiskSettings>({
    enabled: true,
    targetWinRate: 20,
    mode: 'QUOTEX_OTC',
    microPipSniping: true,
    applyToRealOnly: false,
  });
  const [isRiskDirty, setIsRiskDirty] = useState(false);
  const isRiskDirtyRef = useRef(false);
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

  // Global Admin Display Currency: Primary is strictly INR, next only USD
  const [displayCurrency, setDisplayCurrency] = useState<'INR' | 'USD'>('INR');
  const INR_RATE = 95.0;

  const formatMoney = (amountUSD: number, showSecondary = true) => {
    const safeUSD = amountUSD || 0;
    const inrVal = safeUSD * INR_RATE;
    const inrStr = `₹${inrVal.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
    const usdStr = `$${safeUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (displayCurrency === 'INR') {
      return { primary: inrStr, secondary: showSecondary ? `${usdStr} USD` : undefined };
    } else {
      return { primary: usdStr, secondary: showSecondary ? `${inrStr} INR` : undefined };
    }
  };

  const formatTxnAmount = (amount: number, curr?: string) => {
    const c = (curr || 'INR').toUpperCase();
    const safeAmt = amount || 0;
    const inrVal = c === 'USD' ? safeAmt * INR_RATE : safeAmt;
    const usdVal = c === 'USD' ? safeAmt : safeAmt / INR_RATE;
    const inrStr = `₹${inrVal.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
    const usdStr = `$${usdVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (displayCurrency === 'INR') {
      return { primary: inrStr, secondary: usdStr };
    } else {
      return { primary: usdStr, secondary: inrStr };
    }
  };

  const formatUserBal = (amount: number, userCurr?: string) => {
    const c = (userCurr || 'INR').toUpperCase();
    const safeAmt = amount || 0;
    const inrVal = c === 'USD' ? safeAmt * INR_RATE : safeAmt;
    const usdVal = c === 'USD' ? safeAmt : safeAmt / INR_RATE;
    const inrStr = `₹${inrVal.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
    const usdStr = `$${usdVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (displayCurrency === 'INR') {
      return { primary: inrStr, secondary: usdStr };
    } else {
      return { primary: usdStr, secondary: inrStr };
    }
  };

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('forexgrow_auth_token');
      await fetch(apiUrl('/api/auth/logout'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
    } catch {}
    localStorage.removeItem('quotex_admin_user');
    localStorage.removeItem('forexgrow_auth_token');
    window.history.pushState({}, '', '/admin');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  // New Trader Account Creation State
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [createStep, setCreateStep] = useState<'FORM' | 'OTP'>('FORM');
  const [createOtpCode, setCreateOtpCode] = useState('');
  const [debugOtpCode, setDebugOtpCode] = useState<string | null>(null);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [createOtpError, setCreateOtpError] = useState<string | null>(null);
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

  // User Balance Adjustment Modal State (Easiest Direct Balance Edit)
  const [selectedUserForBalance, setSelectedUserForBalance] = useState<UserAccount | null>(null);
  const [directRealBalance, setDirectRealBalance] = useState<number>(0);
  const [directDemoBalance, setDirectDemoBalance] = useState<number>(10000);
  const [directCurrency, setDirectCurrency] = useState<'INR' | 'USD'>('INR');
  const [directAccountType, setDirectAccountType] = useState<'DEMO' | 'REAL'>('REAL');
  const [directNote, setDirectNote] = useState<string>('Admin VIP Balance Update');
  const [isSavingBalance, setIsSavingBalance] = useState<boolean>(false);

  // Cashflow & Custom Date Analytics State
  const padDate = (n: number) => (n < 10 ? '0' + n : String(n));
  const [cashflowFromDate, setCashflowFromDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${padDate(d.getMonth() + 1)}-01`;
  });
  const [cashflowToDate, setCashflowToDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${padDate(d.getMonth() + 1)}-${padDate(d.getDate())}`;
  });
  const [cashflowUserFilter, setCashflowUserFilter] = useState<string>('ALL');
  const [cashflowTypeFilter, setCashflowTypeFilter] = useState<'ALL' | 'DEPOSIT' | 'WITHDRAWAL'>('ALL');
  const [cashflowStatusFilter, setCashflowStatusFilter] = useState<'ALL' | 'APPROVED' | 'PENDING' | 'REJECTED'>('ALL');

  // User Edit Modal State
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<UserAccount | null>(null);

  // User Password Reset Modal State
  const [selectedUserForPasswordReset, setSelectedUserForPasswordReset] = useState<UserAccount | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState<string>('');
  const [isResettingPassword, setIsResettingPassword] = useState<boolean>(false);
  const [resetPasswordSuccess, setResetPasswordSuccess] = useState<string | null>(null);

  // Trade History Modal State
  const [selectedUserForTrades, setSelectedUserForTrades] = useState<UserAccount | null>(null);
  const [userTrades, setUserTrades] = useState<{ activeTrades: Trade[]; tradeHistory: Trade[] } | null>(null);
  const [tradesLoading, setTradesLoading] = useState(false);

  // New Coupon Modal State
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
    // Individual Risk Engine State
  const [selectedTraderForRisk, setSelectedTraderForRisk] = useState<UserAccount | null>(null);
  const [individualRiskEnabled, setIndividualRiskEnabled] = useState(false);
  const [individualWinRate, setIndividualWinRate] = useState(20);
  const [individualMode, setIndividualMode] = useState<'QUOTEX_OTC' | 'STRICT' | 'BALANCED' | 'ORGANIC'>('QUOTEX_OTC');
  const [individualSniping, setIndividualSniping] = useState(true);
  const [isSavingIndividualRisk, setIsSavingIndividualRisk] = useState(false);

  // Aadhaar KYC Review State
  const [selectedTraderForKyc, setSelectedTraderForKyc] = useState<UserAccount | null>(null);

  const openIndividualRiskModal = (u: UserAccount) => {
    setSelectedTraderForRisk(u);
    const custom = u.customRiskSettings;
    setIndividualRiskEnabled(Boolean(custom?.enabled));
    setIndividualWinRate(custom?.targetWinRate || 20);
    setIndividualMode(custom?.mode || 'QUOTEX_OTC');
    setIndividualSniping(custom?.microPipSniping !== false);
  };

  const handleSaveIndividualRisk = async () => {
    if (!selectedTraderForRisk) return;
    setIsSavingIndividualRisk(true);
    try {
      const res = await fetch(apiUrl(`/api/admin/users/${selectedTraderForRisk.id}/risk`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: individualRiskEnabled,
          targetWinRate: individualWinRate,
          mode: individualMode,
          microPipSniping: individualSniping,
          actorName: 'Administrator',
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`✅ Individual risk saved for ${selectedTraderForRisk.name}! (${individualRiskEnabled ? `${individualWinRate}% Custom` : 'Global Engine Default'})`);
        setSelectedTraderForRisk(null);
        fetchAdminData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingIndividualRisk(false);
    }
  };

  const handleReviewKyc = async (isApproved: boolean) => {
    if (!selectedTraderForKyc) return;
    let reason: string | undefined;
    if (!isApproved) {
      const input = prompt('Enter rejection reason for Aadhaar document review:', 'Document photo blurry / Aadhaar number mismatch');
      if (input === null) return;
      reason = input;
    }
    try {
      const res = await fetch(apiUrl(`/api/admin/users/${selectedTraderForKyc.id}/kyc/review`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isApproved,
          reason,
          actorName: 'Administrator',
        }),
      });
      if (res.ok) {
        alert(isApproved ? `✅ Aadhaar verified for ${selectedTraderForKyc.name}!` : `❌ KYC rejected for ${selectedTraderForKyc.name}`);
        setSelectedTraderForKyc(null);
        fetchAdminData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const [newCouponCode, setNewCouponCode] = useState('');
  const [newBonusPct, setNewBonusPct] = useState<number>(50);
  const [couponCurrency, setCouponCurrency] = useState<'INR' | 'USD'>('INR');
  const [newMaxBonus, setNewMaxBonus] = useState<number>(5000);
  const [newMinDeposit, setNewMinDeposit] = useState<number>(1000);
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
      if (riskRes?.settings && !isRiskDirtyRef.current) {
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

  const updateRiskSetting = (updates: Partial<RiskSettings>) => {
    setIsRiskDirty(true);
    isRiskDirtyRef.current = true;
    setRiskSettings((prev) => ({ ...prev, ...updates }));
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
        setIsRiskDirty(false);
        isRiskDirtyRef.current = false;
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

  // Handle Easiest Direct Balance Edit
  const openDirectBalanceModal = (u: UserAccount) => {
    setSelectedUserForBalance(u);
    setDirectRealBalance(u.realBalance ?? 0);
    setDirectDemoBalance(u.demoBalance ?? 10000);
    setDirectCurrency((u.currency as 'INR' | 'USD') || 'INR');
    setDirectAccountType(u.activeAccountType || 'REAL');
    setDirectNote('Admin Funds Adjustment');
  };

  const handleSaveDirectBalances = async () => {
    if (!selectedUserForBalance) return;
    setIsSavingBalance(true);
    try {
      const res = await fetch(apiUrl(`/api/admin/users/${selectedUserForBalance.id}/set-balances`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          realBalance: Number(directRealBalance),
          demoBalance: Number(directDemoBalance),
          currency: directCurrency,
          activeAccountType: directAccountType,
          actorName: 'Desk Administrator',
          note: directNote,
        }),
      });
      if (res.ok) {
        showAdminToast(`✅ Balances updated for ${selectedUserForBalance.name}!`);
        setSelectedUserForBalance(null);
        fetchAdminData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update balances');
      }
    } catch (e) {
      console.error(e);
      alert('Error updating balances');
    } finally {
      setIsSavingBalance(false);
    }
  };

  // Cashflow Date Presets Handler
  const applyDatePreset = (preset: 'TODAY' | 'YESTERDAY' | 'LAST7' | 'THIS_MONTH' | 'ALL_TIME') => {
    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const toYMD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (preset === 'TODAY') {
      const ymd = toYMD(today);
      setCashflowFromDate(ymd);
      setCashflowToDate(ymd);
    } else if (preset === 'YESTERDAY') {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      const ymd = toYMD(y);
      setCashflowFromDate(ymd);
      setCashflowToDate(ymd);
    } else if (preset === 'LAST7') {
      const past = new Date(today);
      past.setDate(past.getDate() - 7);
      setCashflowFromDate(toYMD(past));
      setCashflowToDate(toYMD(today));
    } else if (preset === 'THIS_MONTH') {
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      setCashflowFromDate(toYMD(first));
      setCashflowToDate(toYMD(today));
    } else if (preset === 'ALL_TIME') {
      setCashflowFromDate('');
      setCashflowToDate('');
    }
  };

  // Cashflow CSV Export
  const exportCashflowCSV = (filtered: Transaction[]) => {
    const headers = ['ID', 'Date', 'Time', 'Trader Name', 'User ID', 'Type', 'Amount', 'Currency', 'Amount USD', 'Method/Rail', 'Reference/UTR', 'Status'];
    const rows = filtered.map((t) => {
      const d = new Date(t.timestamp);
      const dateStr = d.toLocaleDateString('en-IN');
      const timeStr = d.toLocaleTimeString('en-IN');
      return [
        `"${t.id}"`,
        `"${dateStr}"`,
        `"${timeStr}"`,
        `"${(t.userName || '').replace(/"/g, '""')}"`,
        `"${t.userId}"`,
        `"${t.type}"`,
        t.amount,
        `"${t.currency}"`,
        t.amountUSD ?? (t.currency === 'INR' ? +(t.amount / 95).toFixed(2) : t.amount),
        `"${(t.method || t.paymentRail || 'N/A').replace(/"/g, '""')}"`,
        `"${(t.utrNumber || (t as any).reference || 'N/A').replace(/"/g, '""')}"`,
        `"${t.status}"`,
      ].join(',');
    });
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ForexGrow_Cashflow_${cashflowFromDate || 'start'}_to_${cashflowToDate || 'now'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  // Handle Admin User Password Reset
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForPasswordReset || !resetPasswordValue.trim()) return;
    setIsResettingPassword(true);
    setResetPasswordSuccess(null);
    try {
      const res = await fetch(apiUrl(`/api/admin/users/${selectedUserForPasswordReset.id}/reset-password`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: resetPasswordValue.trim(), actorName: 'Super Admin' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || 'Failed to reset password');
        return;
      }
      setResetPasswordSuccess(`Password successfully changed to: ${resetPasswordValue.trim()}`);
      fetchAdminData();
    } catch (err) {
      alert('Network error while resetting password');
    } finally {
      setIsResettingPassword(false);
    }
  };

  // Handle Admin Delete Trader Account
  const handleDeleteTrader = async (user: UserAccount) => {
    if (user.id === 'usr_quotex_vip_99') {
      alert('Alex Rivera is the protected permanent demo account and cannot be deleted.');
      return;
    }
    const confirmDelete = window.confirm(`Are you sure you want to permanently delete trader "${user.name}" (${user.email})? This action will remove all their trades, transactions and account history.`);
    if (!confirmDelete) return;

    try {
      const res = await fetch(apiUrl(`/api/admin/users/${user.id}`), {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || 'Failed to delete user');
        return;
      }
      alert(`Trader "${user.name}" has been permanently deleted.`);
      fetchAdminData();
    } catch (err) {
      alert('Network error while deleting trader');
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
      const isINR = couponCurrency === 'INR';
      const minUSD = isINR ? Number((newMinDeposit / 95).toFixed(2)) : newMinDeposit;
      const maxBonusUSD = isINR ? Number((newMaxBonus / 95).toFixed(2)) : newMaxBonus;
      const minINR = isINR ? newMinDeposit : Math.round(newMinDeposit * 95);
      const maxBonusINR = isINR ? newMaxBonus : Math.round(newMaxBonus * 95);

      const res = await fetch(apiUrl('/api/admin/coupons'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newCouponCode.trim().toUpperCase(),
          bonusPercentage: newBonusPct,
          currency: couponCurrency,
          minDepositUSD: minUSD,
          maxBonusUSD: maxBonusUSD,
          minDepositINR: minINR,
          maxBonusINR: maxBonusINR,
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

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateOtpError(null);
    if (!newUserName.trim() || !newUserEmail.trim()) {
      alert('Full Name and Email address are required');
      return;
    }
    if (!newUserEmail.includes('@')) {
      alert('Please enter a valid email address');
      return;
    }

    setIsSendingOtp(true);
    try {
      const res = await fetch(apiUrl('/api/auth/send-register-otp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newUserName.trim(),
          email: newUserEmail.trim(),
          phone: newUserPhone.trim() || undefined,
          password: newUserPassword.trim() || 'Trader@2026',
          currency: newUserCurrency,
          demoBalance: Number(newUserDemoBal),
          realBalance: Number(newUserRealBal),
          vipLevel: newUserVip,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || 'Failed to send OTP verification email');
        return;
      }
      setCreateStep('OTP');
      setCreateOtpCode('');
      if (data.debugOtp) {
        setDebugOtpCode(data.debugOtp);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to connect to backend server');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtpAndCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateOtpError(null);
    if (!createOtpCode.trim() || createOtpCode.trim().length < 6) {
      setCreateOtpError('Please enter the complete 6-digit OTP code');
      return;
    }

    setIsVerifyingOtp(true);
    try {
      const res = await fetch(apiUrl('/api/auth/verify-register-otp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newUserEmail.trim(),
          otp: createOtpCode.trim(),
          demoBalance: Number(newUserDemoBal),
          realBalance: Number(newUserRealBal),
          vipLevel: newUserVip,
          isKycVerified: newUserKyc,
          actor: { id: 'admin_root', name: 'Super Admin', role: 'ADMIN' },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.user) {
        setCreateOtpError(data.error || 'Invalid or expired OTP code');
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
      setCreateStep('FORM');
      fetchAdminData();
    } catch (err) {
      console.error(err);
      setCreateOtpError('Network error while verifying OTP');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.role === 'TRADER' &&
      (u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.id.toLowerCase().includes(userSearch.toLowerCase()))
  );

  const filteredTransactions = transactions.filter(
    (t) => paymentFilter === 'ALL' || t.status === paymentFilter
  );

  return (
    <div className={`fixed inset-0 z-50 flex flex-col overflow-hidden select-none font-sans transition-colors duration-200 ${
      isLight ? 'bg-[#f4f6f9] text-slate-800' : 'bg-[#0e121b] text-gray-100'
    }`}>
      {/* Top Admin Navigation Bar */}
      <header className={`border-b transition-colors px-3 sm:px-6 py-2.5 sm:py-0 min-h-[56px] sm:h-16 flex flex-col sm:flex-row justify-between sm:items-center gap-2 ${
        isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#161a26] border-[#262c3e] text-white'
      }`}>
        {/* Top Row: Brand & Mobile Quick Action Icons */}
        <div className="flex items-center justify-between w-full sm:w-auto">
          <ForexGrowLogo
            size="sm"
            variant="admin"
            badgeText="ROOT"
            subtitle="Master Backoffice, User Management & Payout Controller"
          />

          {/* Mobile Utility Icons */}
          <div className="flex items-center space-x-1 sm:hidden">
            {/* Currency Pill for Mobile */}
            <div className={`flex items-center p-0.5 rounded-lg border text-[10px] font-black ${
              isLight ? 'bg-slate-100 border-slate-300' : 'bg-[#121622] border-[#283248]'
            }`}>
              <button
                onClick={() => setDisplayCurrency('INR')}
                className={`px-1.5 py-0.5 rounded transition ${
                  displayCurrency === 'INR' ? 'bg-emerald-500 text-black font-black shadow-sm' : 'text-gray-400'
                }`}
                title="Primary Currency INR"
              >
                ₹ INR
              </button>
              <button
                onClick={() => setDisplayCurrency('USD')}
                className={`px-1.5 py-0.5 rounded transition ${
                  displayCurrency === 'USD' ? 'bg-emerald-500 text-black font-black shadow-sm' : 'text-gray-400'
                }`}
                title="Secondary Currency USD"
              >
                $ USD
              </button>
            </div>

            <button
              onClick={toggleTheme}
              className={`p-1.5 rounded-lg transition ${
                isLight ? 'text-slate-600 hover:bg-slate-100' : 'text-gray-400 hover:bg-white/5'
              }`}
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-sky-500" />}
            </button>

            <button
              onClick={fetchAdminData}
              className={`p-1.5 rounded-lg transition ${
                isLight ? 'text-slate-600 hover:bg-slate-100' : 'text-gray-400 hover:bg-white/5'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-500' : ''}`} />
            </button>

            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition"
              title="Logout"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right Desktop Controls / Mobile Secondary Bar */}
        <div className="flex items-center justify-between sm:justify-end space-x-2 sm:space-x-3 w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-t-0 border-[#262c3e]/30">
          {/* Desktop Currency Switcher Pill: INR is Default */}
          <div className={`hidden sm:flex items-center p-1 rounded-xl border text-xs font-black ${
            isLight ? 'bg-slate-100 border-slate-300' : 'bg-[#121622] border-[#283248]'
          }`}>
            <span className="text-[10px] text-gray-400 px-2 uppercase font-bold">Currency:</span>
            <button
              onClick={() => setDisplayCurrency('INR')}
              className={`px-2.5 py-1 rounded-lg transition font-mono ${
                displayCurrency === 'INR' ? 'bg-emerald-500 text-black shadow-sm font-black' : 'text-gray-400 hover:text-white'
              }`}
            >
              ₹ INR (Primary)
            </button>
            <button
              onClick={() => setDisplayCurrency('USD')}
              className={`px-2.5 py-1 rounded-lg transition font-mono ${
                displayCurrency === 'USD' ? 'bg-emerald-500 text-black shadow-sm font-black' : 'text-gray-400 hover:text-white'
              }`}
            >
              $ USD
            </button>
          </div>

          <button
            onClick={() => window.open('/', '_blank')}
            title="Open Live Trading Floor in New Tab"
            className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 border border-emerald-500/30 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition shadow-sm"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Live Floor</span>
          </button>

          <div className="hidden sm:flex bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs font-bold px-3 py-1.5 rounded-xl items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>System Active</span>
          </div>

          <div className="hidden sm:flex items-center space-x-2">
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className={`p-2 rounded-xl transition ${
                isLight ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100' : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-sky-500" />}
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

            <button
              onClick={handleLogout}
              title="Log Out of Admin Portal"
              className="flex items-center space-x-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-xl text-xs font-bold transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Unified Touch-Scrollable Workspace Container */}
      <div className="flex-1 overflow-y-auto min-h-0 flex flex-col overscroll-y-contain touch-pan-y" style={{ WebkitOverflowScrolling: 'touch' }}>
        {/* Admin KPI Top Highlights - Responsive INR Primary View */}
        {overview && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 p-3 sm:p-6 pb-2 shrink-0">
          {/* 1. Total Traders */}
          <div className={`border rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm transition-colors ${
            isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#161a26] border-[#262c3e] text-white'
          }`}>
            <div className={`text-[10px] sm:text-[11px] font-semibold uppercase ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>Total Traders</div>
            <div className={`text-lg sm:text-2xl font-black mono-num mt-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>{overview.totalUsers}</div>
            <div className="text-[9px] sm:text-[10px] text-emerald-500 font-bold mt-0.5 truncate">
              {overview.activeTradersCount} Active Accounts
            </div>
          </div>

          {/* 2. Platform Volume */}
          <div className={`border rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm transition-colors ${
            isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#161a26] border-[#262c3e] text-white'
          }`}>
            <div className={`text-[10px] sm:text-[11px] font-semibold uppercase ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>Platform Volume</div>
            <div className={`text-base sm:text-2xl font-black mono-num mt-1 truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
              {formatMoney(overview.totalVolumeUSD).primary}
            </div>
            <div className={`text-[9px] sm:text-[10px] mt-0.5 truncate ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
              {formatMoney(overview.totalVolumeUSD).secondary}
            </div>
          </div>

          {/* 3. Total Deposits */}
          <div className={`border rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm transition-colors ${
            isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#161a26] border-[#262c3e] text-white'
          }`}>
            <div className={`text-[10px] sm:text-[11px] font-semibold uppercase ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>Total Deposits</div>
            <div className="text-base sm:text-2xl font-black text-emerald-500 mono-num mt-1 truncate">
              {formatMoney(overview.totalDepositsUSD).primary}
            </div>
            <div className={`text-[9px] sm:text-[10px] mt-0.5 truncate ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
              {formatMoney(overview.totalDepositsUSD).secondary}
            </div>
          </div>

          {/* 4. Total Withdrawals */}
          <div className={`border rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm transition-colors ${
            isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#161a26] border-[#262c3e] text-white'
          }`}>
            <div className={`text-[10px] sm:text-[11px] font-semibold uppercase ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>Total Withdrawals</div>
            <div className="text-base sm:text-2xl font-black text-rose-500 mono-num mt-1 truncate">
              {formatMoney(overview.totalWithdrawalsUSD).primary}
            </div>
            <div className={`text-[9px] sm:text-[10px] mt-0.5 truncate ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
              {formatMoney(overview.totalWithdrawalsUSD).secondary}
            </div>
          </div>

          {/* 5. House Net P&L */}
          <div className={`border rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm transition-colors ${
            isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#161a26] border-[#262c3e] text-white'
          }`}>
            <div className={`text-[10px] sm:text-[11px] font-semibold uppercase ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>House Net P&L</div>
            <div className="text-base sm:text-2xl font-black text-amber-500 mono-num mt-1 truncate">
              {overview.houseNetProfitUSD >= 0 ? '+' : ''}{formatMoney(overview.houseNetProfitUSD).primary}
            </div>
            <div className="text-[9px] sm:text-[10px] text-emerald-500 font-bold mt-0.5 truncate">
              {formatMoney(overview.houseNetProfitUSD).secondary}
            </div>
          </div>

          {/* 6. Pending Cashier */}
          <div className={`border rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm transition-colors ${
            isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#161a26] border-[#262c3e] text-white'
          }`}>
            <div className={`text-[10px] sm:text-[11px] font-semibold uppercase ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>Pending Cashier</div>
            <div className={`text-lg sm:text-2xl font-black mono-num mt-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
              {overview.pendingTransactionsCount}
            </div>
            <div className="text-[9px] sm:text-[10px] text-amber-500 font-bold mt-0.5 truncate">Requires Approval</div>
          </div>
        </div>
      )}

        {/* Admin Tabs - Sticky under header when scrolling */}
        <div className={`sticky top-0 z-20 flex space-x-1.5 sm:space-x-2 px-3 sm:px-6 pt-2 sm:pt-3 border-b overflow-x-auto scrollbar-none flex-nowrap backdrop-blur-md shrink-0 ${
          isLight ? 'bg-white/95 border-slate-200' : 'bg-[#121620]/95 border-[#262c3e]'
        }`}>
        {[
          { id: 'OVERVIEW', shortLabel: 'Summary', label: 'Platform Summary', icon: TrendingUp },
          { id: 'USERS', shortLabel: `Traders (${users.filter(u => u.role === 'TRADER').length})`, label: 'Traders & Balances', icon: Users, badge: users.filter(u => u.role === 'TRADER').length },
          { id: 'CASHFLOW', shortLabel: 'Cashflow', label: 'Cashflow & Date Analytics', icon: BarChart3 },
          { id: 'PAYMENTS', shortLabel: `Cashier (${overview?.pendingTransactionsCount || 0})`, label: 'Payout Requests & Deposits', icon: CreditCard, badge: overview?.pendingTransactionsCount },
          { id: 'RISK', shortLabel: 'Risk Engine', label: 'Quotex Risk Engine', icon: ShieldCheck, badge: riskSettings?.enabled ? `${riskSettings.targetWinRate}%` : 'OFF' },
          { id: 'COUPONS', shortLabel: 'Coupons', label: 'Special Promo Coupons', icon: Tag, badge: coupons.length },
          { id: 'MARKETS', shortLabel: 'Payouts', label: 'Asset Payout Customizer', icon: Sliders, badge: assets.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-t-xl text-[11px] sm:text-xs font-bold transition border-b-2 whitespace-nowrap flex-shrink-0 ${
                isActive
                  ? `border-emerald-500 text-emerald-500 ${isLight ? 'bg-white' : 'bg-[#161a26]'}`
                  : (isLight ? 'border-transparent text-slate-500 hover:text-slate-900' : 'border-transparent text-gray-400 hover:text-white')
              }`}
            >
              <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="sm:hidden">{tab.shortLabel}</span>
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.badge !== undefined && tab.badge !== '' && tab.badge !== 0 && (
                <span className={`hidden sm:inline-block text-[10px] px-1.5 py-0.2 rounded-full font-black ${
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
      <div className="p-4 sm:p-6 pb-36">
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
                      .map((tx) => {
                        const amtFmt = formatTxnAmount(tx.amount, tx.currency);
                        return (
                          <div
                            key={tx.id}
                            className={`p-3.5 border rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                              isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#121620] border-[#262c3e]'
                            }`}
                          >
                            <div className="space-y-1 min-w-0">
                              <div className="text-xs font-bold flex flex-wrap items-center gap-1.5">
                                <span className={isLight ? 'text-slate-900' : 'text-white'}>{tx.userName}</span>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                                  tx.type === 'DEPOSIT' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                                }`}>
                                  {tx.type}
                                </span>
                                {tx.utrNumber && (
                                  <span className="text-[10px] bg-sky-500/15 text-sky-400 border border-sky-500/30 px-1.5 py-0.2 rounded font-mono">
                                    UTR: {tx.utrNumber}
                                  </span>
                                )}
                              </div>
                              <div className={`text-xs font-mono flex flex-wrap items-center gap-2 ${
                                isLight ? 'text-slate-600' : 'text-gray-300'
                              }`}>
                                <span className="font-black text-emerald-400">{amtFmt.primary}</span>
                                <span className="text-[10px] text-gray-400">({amtFmt.secondary})</span>
                                <span className="text-gray-400">• {tx.method}</span>
                                {tx.proofImage && (
                                  <button
                                    onClick={() => setPreviewProofUrl(tx.proofImage || null)}
                                    className="text-xs text-sky-400 hover:text-sky-300 underline font-semibold flex items-center space-x-0.5"
                                  >
                                    <Eye className="w-3 h-3" />
                                    <span>Proof Slip</span>
                                  </button>
                                )}
                              </div>
                              {tx.bankDetails && (
                                <div className="text-[10px] font-mono text-amber-400">
                                  {tx.bankDetails.upiId ? (
                                    <span>UPI: {tx.bankDetails.upiId}</span>
                                  ) : (
                                    <span>{tx.bankDetails.bankName} - A/C: {tx.bankDetails.accountNumber} ({tx.bankDetails.ifscCode})</span>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center space-x-2 pt-1 sm:pt-0 border-t sm:border-t-0 border-[#262c3e]/30">
                              <button
                                onClick={() => handleApprovePayment(tx.id)}
                                className="flex-1 sm:flex-none px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl text-xs font-black transition shadow-sm text-center"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleRejectPayment(tx.id)}
                                className="flex-1 sm:flex-none px-3.5 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold transition text-center"
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        );
                      })}
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

            {/* Mobile Responsive Trader Cards */}
            <div className="grid grid-cols-1 gap-3 lg:hidden">
              {filteredUsers.map((u) => {
                const realFmt = formatUserBal(u.realBalance, u.currency);
                const demoFmt = formatUserBal(u.demoBalance, u.currency);
                return (
                  <div
                    key={u.id}
                    className={`p-4 rounded-2xl border transition shadow-sm space-y-3 ${
                      isLight ? 'bg-white border-slate-200' : 'bg-[#161a26] border-[#262c3e]'
                    }`}
                  >
                    {/* Top: Name, VIP & Status */}
                    <div className="flex items-start justify-between">
                      <div>
                        <div className={`font-black text-sm flex items-center space-x-1.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                          <span>{u.name}</span>
                          {u.id === 'usr_quotex_vip_99' && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-sky-500/20 text-sky-400 border border-sky-500/30">
                              TEST SANDBOX
                            </span>
                          )}
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-black ${
                            u.vipLevel === 'VIP'
                              ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                              : u.vipLevel === 'PRO'
                              ? 'bg-purple-500/20 text-purple-500 border border-purple-500/30'
                              : 'bg-slate-500/20 text-gray-400'
                          }`}>
                            {u.vipLevel}
                          </span>
                        </div>
                        <div className={`text-[11px] font-mono mt-0.5 ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                          {u.email} {u.phone ? `• ${u.phone}` : ''}
                        </div>
                        <div className="text-[10px] font-mono text-gray-500">ID: {u.id}</div>
                      </div>
                      <div className="flex items-center space-x-1 shrink-0">
                        {u.isKycVerified ? (
                          <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-bold border border-emerald-500/20">
                            KYC ✓
                          </span>
                        ) : (
                          <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded font-bold border border-amber-500/20">
                            KYC ?
                          </span>
                        )}
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                          u.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                        }`}>
                          {u.status}
                        </span>
                      </div>
                    </div>

                    {/* Middle: Balances Grid (Primary INR) */}
                    <div className={`grid grid-cols-2 gap-2 p-2.5 rounded-xl border ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#121620] border-[#202738]'
                    }`}>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-gray-400 block">Real Live Balance</span>
                        <div className="text-base font-black text-emerald-400 mono-num mt-0.5">
                          {realFmt.primary}
                        </div>
                        <div className="text-[9px] text-gray-500 font-mono">
                          ({realFmt.secondary})
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-bold text-gray-400 block">Practice Demo</span>
                        <div className="text-base font-black text-amber-400 mono-num mt-0.5">
                          {demoFmt.primary}
                        </div>
                        <div className="text-[9px] text-gray-500 font-mono">
                          ({demoFmt.secondary})
                        </div>
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <button
                        onClick={() => openDirectBalanceModal(u)}
                        className="flex-1 min-w-[90px] py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs transition shadow-sm text-center flex items-center justify-center space-x-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Direct Edit</span>
                      </button>
                      <button
                        onClick={() => setSelectedUserForEdit(u)}
                        className="px-2.5 py-2 bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 rounded-xl text-xs font-bold transition text-center"
                      >
                        Level
                      </button>
                      <button
                        onClick={() => handleViewUserTrades(u)}
                        className="px-2.5 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 rounded-xl text-xs font-bold transition text-center"
                      >
                        Trades ({u.totalTrades})
                      </button>
                      <button
                        onClick={() => {
                          setSelectedUserForPasswordReset(u);
                          setResetPasswordValue('');
                          setResetPasswordSuccess(null);
                        }}
                        className="px-2.5 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-xl text-xs font-bold transition text-center flex items-center gap-1"
                        title="Reset Trader Password"
                      >
                        <Key className="w-3.5 h-3.5" />
                        <span>Pass</span>
                      </button>
                      {u.id !== 'usr_quotex_vip_99' && (
                        <button
                          onClick={() => handleDeleteTrader(u)}
                          className="px-2.5 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 rounded-xl text-xs font-bold transition text-center flex items-center gap-1"
                          title="Delete Trader Account"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Users Table */}
            <div className={`hidden lg:block border rounded-3xl overflow-x-auto shadow-xl transition-colors ${
              isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#161a26] border-[#262c3e]'
            }`}>
              <table className="w-full text-left text-xs min-w-[850px]">
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
                  {filteredUsers.map((u) => {
                    const realFmt = formatUserBal(u.realBalance, u.currency);
                    const demoFmt = formatUserBal(u.demoBalance, u.currency);
                    return (
                      <tr key={u.id} className={`transition ${isLight ? 'hover:bg-slate-50' : 'hover:bg-[#1f2537]/50'}`}>
                        <td className="py-3.5 px-4">
                          <div className={`font-bold flex items-center space-x-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                            <span>{u.name}</span>
                            {u.id === 'usr_quotex_vip_99' && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-sky-500/20 text-sky-400 border border-sky-500/30">
                                TEST SANDBOX
                              </span>
                            )}
                          </div>
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
                        <td className="py-3.5 px-3 font-bold text-amber-400 mono-num">
                          <div>{demoFmt.primary}</div>
                          <div className="text-[9px] text-gray-500 font-mono">({demoFmt.secondary})</div>
                        </td>
                        <td className="py-3.5 px-3 font-black text-emerald-400 mono-num">
                          <div>{realFmt.primary}</div>
                          <div className="text-[9px] text-gray-500 font-mono">({realFmt.secondary})</div>
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
                          {u.kycStatus === 'PENDING' && (
                            <button
                              onClick={() => setSelectedTraderForKyc(u)}
                              className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-black transition"
                            >
                              Review Aadhaar
                            </button>
                          )}
                          <button
                            onClick={() => openDirectBalanceModal(u)}
                            className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-xs font-bold transition flex-inline items-center gap-1"
                            title="Directly edit Real and Demo balances with 1-click presets"
                          >
                            Edit Funds
                          </button>
                          <button
                            onClick={() => openIndividualRiskModal(u)}
                            className={`px-2 py-1 rounded-lg text-xs font-bold transition ${
                              u.customRiskSettings?.enabled
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-gray-700/30 text-gray-300 hover:bg-gray-700/50'
                            }`}
                            title="Configure individual target win-rate & algorithm for this trader"
                          >
                            {u.customRiskSettings?.enabled ? `Risk: ${u.customRiskSettings.targetWinRate}%` : 'Individual Risk'}
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
                          <button
                            onClick={() => {
                              setSelectedUserForPasswordReset(u);
                              setResetPasswordValue('');
                              setResetPasswordSuccess(null);
                            }}
                            className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg text-xs font-bold transition inline-flex items-center gap-1"
                            title="Reset Trader Password"
                          >
                            <Key className="w-3 h-3" />
                            <span>Reset Pass</span>
                          </button>
                          {u.id !== 'usr_quotex_vip_99' && (
                            <button
                              onClick={() => handleDeleteTrader(u)}
                              className="px-2 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 rounded-lg text-xs font-bold transition inline-flex items-center gap-1"
                              title="Delete Trader Account"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Delete</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= TAB: CASHFLOW & CUSTOM DATE ANALYTICS DASHBOARD ================= */}
        {activeTab === 'CASHFLOW' && (() => {
          // 1. Filter Transactions by Custom Date Range, Trader, Type, and Status
          const filteredCashflow = transactions.filter((t) => {
            const d = new Date(t.timestamp);
            const txDate = `${d.getFullYear()}-${padDate(d.getMonth() + 1)}-${padDate(d.getDate())}`;
            if (cashflowFromDate && txDate < cashflowFromDate) return false;
            if (cashflowToDate && txDate > cashflowToDate) return false;
            if (cashflowUserFilter !== 'ALL' && t.userId !== cashflowUserFilter) return false;
            if (cashflowTypeFilter !== 'ALL' && t.type !== cashflowTypeFilter) return false;
            if (cashflowStatusFilter !== 'ALL' && t.status !== cashflowStatusFilter) return false;
            return true;
          });

          // 2. Compute Filtered Metrics
          const approvedDeposits = filteredCashflow.filter((t) => t.type === 'DEPOSIT' && t.status === 'APPROVED');
          const approvedWithdrawals = filteredCashflow.filter((t) => t.type === 'WITHDRAWAL' && t.status === 'APPROVED');
          const pendingTxns = filteredCashflow.filter((t) => t.status === 'PENDING');

          const totalDepositsINR = approvedDeposits.reduce((acc, t) => acc + (t.currency === 'INR' ? t.amount : t.amount * 95), 0);
          const totalDepositsUSD = approvedDeposits.reduce((acc, t) => acc + (t.currency === 'USD' ? t.amount : +(t.amount / 95).toFixed(2)), 0);

          const totalWithdrawalsINR = approvedWithdrawals.reduce((acc, t) => acc + (t.currency === 'INR' ? t.amount : t.amount * 95), 0);
          const totalWithdrawalsUSD = approvedWithdrawals.reduce((acc, t) => acc + (t.currency === 'USD' ? t.amount : +(t.amount / 95).toFixed(2)), 0);

          const netCashflowINR = totalDepositsINR - totalWithdrawalsINR;
          const netCashflowUSD = totalDepositsUSD - totalWithdrawalsUSD;

          // 3. User-Wise Aggregation
          const userWiseMap: Record<string, {
            userId: string;
            userName: string;
            currency: string;
            depositCount: number;
            depositSumINR: number;
            withdrawalCount: number;
            withdrawalSumINR: number;
            pendingCount: number;
          }> = {};

          filteredCashflow.forEach((t) => {
            if (!userWiseMap[t.userId]) {
              userWiseMap[t.userId] = {
                userId: t.userId,
                userName: t.userName || t.userId,
                currency: t.currency || 'INR',
                depositCount: 0,
                depositSumINR: 0,
                withdrawalCount: 0,
                withdrawalSumINR: 0,
                pendingCount: 0,
              };
            }
            const record = userWiseMap[t.userId];
            const inrVal = t.currency === 'INR' ? t.amount : t.amount * 95;
            if (t.type === 'DEPOSIT') {
              if (t.status === 'APPROVED') {
                record.depositCount += 1;
                record.depositSumINR += inrVal;
              }
            } else if (t.type === 'WITHDRAWAL') {
              if (t.status === 'APPROVED') {
                record.withdrawalCount += 1;
                record.withdrawalSumINR += inrVal;
              }
            }
            if (t.status === 'PENDING') {
              record.pendingCount += 1;
            }
          });

          const userWiseList = Object.values(userWiseMap).sort((a, b) => (b.depositSumINR - b.withdrawalSumINR) - (a.depositSumINR - a.withdrawalSumINR));

          return (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Header Title */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className={`text-base font-black flex items-center space-x-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    <BarChart3 className="w-5 h-5 text-emerald-500" />
                    <span>Custom Date Cashflow & User-Wise Ledger</span>
                  </h3>
                  <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                    Analyze real deposits, withdrawals, and net house revenue across any custom date range or per-trader
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => exportCashflowCSV(filteredCashflow)}
                    className="flex items-center space-x-1.5 px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold transition shadow-sm"
                  >
                    <Download className="w-4 h-4" />
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>

              {/* Filter Controls Card */}
              <div className={`p-4 sm:p-5 rounded-3xl border space-y-4 transition-colors ${
                isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#161a26] border-[#262c3e]'
              }`}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  {/* From Date */}
                  <div>
                    <label className={`text-xs font-bold block mb-1.5 flex items-center gap-1 ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>
                      <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                      <span>From Date</span>
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        value={cashflowFromDate}
                        onChange={(e) => setCashflowFromDate(e.target.value)}
                        className={`w-full border rounded-xl px-3 py-2 text-xs font-bold focus:outline-none transition ${
                          isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#121620] border-[#2e354b] text-white'
                        }`}
                      />
                    </div>
                  </div>

                  {/* To Date */}
                  <div>
                    <label className={`text-xs font-bold block mb-1.5 flex items-center gap-1 ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>
                      <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                      <span>To Date</span>
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        value={cashflowToDate}
                        onChange={(e) => setCashflowToDate(e.target.value)}
                        className={`w-full border rounded-xl px-3 py-2 text-xs font-bold focus:outline-none transition ${
                          isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#121620] border-[#2e354b] text-white'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Trader User Dropdown */}
                  <div>
                    <label className={`text-xs font-bold block mb-1.5 flex items-center gap-1 ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>
                      <Filter className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Filter Trader</span>
                    </label>
                    <select
                      value={cashflowUserFilter}
                      onChange={(e) => setCashflowUserFilter(e.target.value)}
                      className={`w-full border rounded-xl px-3 py-2 text-xs font-bold focus:outline-none transition ${
                        isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#121620] border-[#2e354b] text-white'
                      }`}
                    >
                      <option value="ALL">All Traders (Global House)</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.id})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Transaction Type */}
                  <div>
                    <label className={`text-xs font-bold block mb-1.5 ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>
                      Transaction Type
                    </label>
                    <select
                      value={cashflowTypeFilter}
                      onChange={(e) => setCashflowTypeFilter(e.target.value as any)}
                      className={`w-full border rounded-xl px-3 py-2 text-xs font-bold focus:outline-none transition ${
                        isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#121620] border-[#2e354b] text-white'
                      }`}
                    >
                      <option value="ALL">All (Deposits & Withdrawals)</option>
                      <option value="DEPOSIT">Deposits Only</option>
                      <option value="WITHDRAWAL">Withdrawals Only</option>
                    </select>
                  </div>

                  {/* Settlement Status */}
                  <div>
                    <label className={`text-xs font-bold block mb-1.5 ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>
                      Settlement Status
                    </label>
                    <select
                      value={cashflowStatusFilter}
                      onChange={(e) => setCashflowStatusFilter(e.target.value as any)}
                      className={`w-full border rounded-xl px-3 py-2 text-xs font-bold focus:outline-none transition ${
                        isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#121620] border-[#2e354b] text-white'
                      }`}
                    >
                      <option value="ALL">All Statuses</option>
                      <option value="APPROVED">Approved / Settled</option>
                      <option value="PENDING">Pending Action</option>
                      <option value="REJECTED">Rejected</option>
                    </select>
                  </div>
                </div>

                {/* Quick Date Presets */}
                <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-gray-500/10">
                  <span className={`text-[11px] font-bold mr-1 ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                    Quick Presets:
                  </span>
                  {[
                    { id: 'TODAY', label: 'Today' },
                    { id: 'YESTERDAY', label: 'Yesterday' },
                    { id: 'LAST7', label: 'Last 7 Days' },
                    { id: 'THIS_MONTH', label: 'This Month' },
                    { id: 'ALL_TIME', label: 'All Time' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => applyDatePreset(p.id as any)}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition ${
                        isLight
                          ? 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                          : 'border-[#2e354b] bg-[#121620] text-gray-300 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                  {cashflowUserFilter !== 'ALL' && (
                    <button
                      type="button"
                      onClick={() => setCashflowUserFilter('ALL')}
                      className="ml-auto px-2 py-1 text-[11px] font-bold rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 transition flex items-center gap-1"
                    >
                      <span>Showing: {users.find((u) => u.id === cashflowUserFilter)?.name || cashflowUserFilter}</span>
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* 4 Summary KPI Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Deposits Card */}
                <div className={`p-4 rounded-3xl border transition shadow-sm ${
                  isLight ? 'bg-white border-slate-200' : 'bg-[#161a26] border-[#262c3e]'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold uppercase ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                      Inflow Deposits
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                      <ArrowDownLeft className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-2 text-xl font-black text-emerald-400 mono-num">
                    ₹{totalDepositsINR.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </div>
                  <div className={`text-[11px] font-mono mt-0.5 ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                    ${totalDepositsUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD • {approvedDeposits.length} approved
                  </div>
                </div>

                {/* Total Withdrawals Card */}
                <div className={`p-4 rounded-3xl border transition shadow-sm ${
                  isLight ? 'bg-white border-slate-200' : 'bg-[#161a26] border-[#262c3e]'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold uppercase ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                      Outflow Payouts
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
                      <ArrowUpRight className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-2 text-xl font-black text-rose-400 mono-num">
                    ₹{totalWithdrawalsINR.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </div>
                  <div className={`text-[11px] font-mono mt-0.5 ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                    ${totalWithdrawalsUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD • {approvedWithdrawals.length} settled
                  </div>
                </div>

                {/* Net House Cashflow Card */}
                <div className={`p-4 rounded-3xl border transition shadow-sm ${
                  isLight ? 'bg-white border-slate-200' : 'bg-[#161a26] border-[#262c3e]'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold uppercase ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                      Net Retained House Capital
                    </span>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                      netCashflowINR >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                    }`}>
                      <Wallet className="w-4 h-4" />
                    </div>
                  </div>
                  <div className={`mt-2 text-xl font-black mono-num ${netCashflowINR >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {netCashflowINR >= 0 ? '+' : ''}₹{netCashflowINR.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </div>
                  <div className={`text-[11px] font-mono mt-0.5 ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                    {netCashflowUSD >= 0 ? '+' : ''}${netCashflowUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD Net Spread
                  </div>
                </div>

                {/* Pending Actions Card */}
                <div className={`p-4 rounded-3xl border transition shadow-sm ${
                  isLight ? 'bg-white border-slate-200' : 'bg-[#161a26] border-[#262c3e]'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold uppercase ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                      Pending Clearance
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                      <Clock className="w-4 h-4" />
                    </div>
                  </div>
                  <div className={`mt-2 text-xl font-black mono-num ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    {pendingTxns.length} Requests
                  </div>
                  <div className="text-[11px] text-amber-500 font-bold mt-0.5">
                    {pendingTxns.length > 0 ? 'Action required in Cashier' : 'All transactions cleared'}
                  </div>
                </div>
              </div>

              {/* User-Wise Cashflow Breakdown Section */}
              <div className={`p-4 sm:p-6 rounded-3xl border space-y-4 transition-colors ${
                isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#161a26] border-[#262c3e]'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className={`text-sm font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      User-Wise Deposit & Withdrawal Breakdown
                    </h4>
                    <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                      Calculated for selected date range ({cashflowFromDate || 'Start'} to {cashflowToDate || 'Today'})
                    </p>
                  </div>
                  <span className="text-xs text-gray-400 font-bold">
                    {userWiseList.length} Active {userWiseList.length === 1 ? 'Trader' : 'Traders'}
                  </span>
                </div>

                <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
                  <table className="w-full text-left text-xs min-w-[700px]">
                    <thead className={`border-b uppercase font-semibold ${
                      isLight ? 'bg-slate-100 border-slate-200 text-slate-600' : 'bg-[#121620] border-[#262c3e] text-gray-400'
                    }`}>
                      <tr>
                        <th className="py-3 px-4">Trader</th>
                        <th className="py-3 px-3">Base Currency</th>
                        <th className="py-3 px-3 text-right">Deposited</th>
                        <th className="py-3 px-3 text-right">Withdrawn</th>
                        <th className="py-3 px-3 text-right">Net Cashflow</th>
                        <th className="py-3 px-3 text-center">Pending</th>
                        <th className="py-3 px-4 text-right">Quick Filter</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isLight ? 'divide-slate-100' : 'divide-[#262c3e]/60'}`}>
                      {userWiseList.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-gray-400 text-xs">
                            No trader transactions found in this date range.
                          </td>
                        </tr>
                      ) : (
                        userWiseList.map((uw) => {
                          const net = uw.depositSumINR - uw.withdrawalSumINR;
                          return (
                            <tr key={uw.userId} className={`transition ${isLight ? 'hover:bg-slate-50' : 'hover:bg-[#1f2537]/50'}`}>
                              <td className="py-3 px-4">
                                <div className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{uw.userName}</div>
                                <div className="text-[10px] text-gray-400 font-mono">{uw.userId}</div>
                              </td>
                              <td className="py-3 px-3 font-bold">
                                {uw.currency === 'USD' ? '🇺🇸 USD ($)' : '🇮🇳 INR (₹)'}
                              </td>
                              <td className="py-3 px-3 text-right font-bold text-emerald-400 mono-num">
                                ₹{uw.depositSumINR.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                <div className="text-[10px] text-gray-400">{uw.depositCount} deposits</div>
                              </td>
                              <td className="py-3 px-3 text-right font-bold text-rose-400 mono-num">
                                ₹{uw.withdrawalSumINR.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                <div className="text-[10px] text-gray-400">{uw.withdrawalCount} payouts</div>
                              </td>
                              <td className={`py-3 px-3 text-right font-black mono-num ${net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {net >= 0 ? '+' : ''}₹{net.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                              </td>
                              <td className="py-3 px-3 text-center">
                                {uw.pendingCount > 0 ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                    {uw.pendingCount} Pending
                                  </span>
                                ) : (
                                  <span className="text-gray-500 text-[10px]">0</span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <button
                                  type="button"
                                  onClick={() => setCashflowUserFilter(uw.userId)}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition border ${
                                    cashflowUserFilter === uw.userId
                                      ? 'bg-emerald-500 text-black border-emerald-500'
                                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                                  }`}
                                >
                                  {cashflowUserFilter === uw.userId ? 'Selected' : 'Inspect Trader'}
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Filtered Detailed Transaction Ledger Table */}
              <div className={`p-4 sm:p-6 rounded-3xl border space-y-4 transition-colors ${
                isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#161a26] border-[#262c3e]'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className={`text-sm font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      Filtered Transaction Ledger
                    </h4>
                    <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                      Showing {filteredCashflow.length} transactions matching date & trader filter
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
                  <table className="w-full text-left text-xs min-w-[750px]">
                    <thead className={`border-b uppercase font-semibold ${
                      isLight ? 'bg-slate-100 border-slate-200 text-slate-600' : 'bg-[#121620] border-[#262c3e] text-gray-400'
                    }`}>
                      <tr>
                        <th className="py-3 px-4">Timestamp</th>
                        <th className="py-3 px-3">Trader</th>
                        <th className="py-3 px-3">Type</th>
                        <th className="py-3 px-3 text-right">Native Amount</th>
                        <th className="py-3 px-3 text-right">USD Equivalent</th>
                        <th className="py-3 px-3">Method / UTR</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isLight ? 'divide-slate-100' : 'divide-[#262c3e]/60'}`}>
                      {filteredCashflow.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-gray-400 text-xs">
                            No transactions matched the criteria. Try expanding the date range.
                          </td>
                        </tr>
                      ) : (
                        filteredCashflow.map((t) => {
                          const dateObj = new Date(t.timestamp);
                          const isDeposit = t.type === 'DEPOSIT';
                          return (
                            <tr key={t.id} className={`transition ${isLight ? 'hover:bg-slate-50' : 'hover:bg-[#1f2537]/50'}`}>
                              <td className="py-3 px-4">
                                <div className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                                  {dateObj.toLocaleDateString('en-IN')}
                                </div>
                                <div className="text-[10px] text-gray-400 font-mono">
                                  {dateObj.toLocaleTimeString('en-IN')}
                                </div>
                              </td>
                              <td className="py-3 px-3">
                                <div className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{t.userName}</div>
                                <div className="text-[10px] text-gray-400 font-mono">{t.userId}</div>
                              </td>
                              <td className="py-3 px-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                  isDeposit ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                }`}>
                                  {t.type}
                                </span>
                              </td>
                              <td className={`py-3 px-3 text-right font-black mono-num ${isDeposit ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {isDeposit ? '+' : '-'}{formatCurrency(t.amount, t.currency)}
                              </td>
                              <td className={`py-3 px-3 text-right font-mono text-[11px] ${isLight ? 'text-slate-600' : 'text-gray-300'}`}>
                                ${(t.amountUSD ?? (t.currency === 'INR' ? +(t.amount / 95).toFixed(2) : t.amount)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-3 px-3">
                                <div className="font-bold text-[11px] text-gray-200">{t.method || t.paymentRail || 'Bank / UPI'}</div>
                                <div className="text-[10px] text-gray-400 font-mono">{t.utrNumber || (t as any).reference || '—'}</div>
                              </td>
                              <td className="py-3 px-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  t.status === 'APPROVED'
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : t.status === 'PENDING'
                                    ? 'bg-amber-500/20 text-amber-400'
                                    : 'bg-rose-500/20 text-rose-400'
                                }`}>
                                  {t.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right">
                                {t.status === 'PENDING' ? (
                                  <div className="flex items-center justify-end space-x-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleApprovePayment(t.id)}
                                      className="px-2 py-1 bg-emerald-500 hover:bg-emerald-600 text-black font-bold rounded-lg text-[10px] transition"
                                    >
                                      Approve
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRejectPayment(t.id)}
                                      className="px-2 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 font-bold rounded-lg text-[10px] transition"
                                    >
                                      Reject
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-gray-500 font-bold">Resolved</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })()}

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

            {/* Mobile Responsive Cashier Cards */}
            <div className="grid grid-cols-1 gap-3 lg:hidden">
              {filteredTransactions.map((tx) => {
                const amtFmt = formatTxnAmount(tx.amount, tx.currency);
                return (
                  <div
                    key={tx.id}
                    className={`p-4 rounded-2xl border transition shadow-sm space-y-3 ${
                      tx.status === 'PENDING'
                        ? (isLight ? 'bg-amber-50/50 border-amber-300' : 'bg-[#181d2e] border-amber-500/30')
                        : (isLight ? 'bg-white border-slate-200' : 'bg-[#161a26] border-[#262c3e]')
                    }`}
                  >
                    {/* Header: User, Type, Status */}
                    <div className="flex items-start justify-between">
                      <div>
                        <div className={`font-black text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>
                          {tx.userName}
                        </div>
                        <div className="text-[10px] font-mono text-gray-500">ID: {tx.id}</div>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                          tx.type === 'DEPOSIT' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                        }`}>
                          {tx.type}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          tx.status === 'APPROVED'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : tx.status === 'PENDING'
                            ? 'bg-amber-500/20 text-amber-400 animate-pulse'
                            : 'bg-rose-500/20 text-rose-400'
                        }`}>
                          {tx.status}
                        </span>
                      </div>
                    </div>

                    {/* Amount & Method Banner */}
                    <div className={`p-3 rounded-xl border flex items-center justify-between ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#121620] border-[#222838]'
                    }`}>
                      <div>
                        <div className="text-base font-black text-emerald-400 mono-num">
                          {amtFmt.primary}
                        </div>
                        <div className="text-[10px] text-gray-400 font-mono">
                          ({amtFmt.secondary})
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-xs font-bold ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>
                          {tx.method}
                        </div>
                        <div className="text-[10px] text-gray-500">
                          {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>

                    {/* Verification info: UTR or Slip */}
                    {(tx.utrNumber || tx.proofImage || tx.bankDetails) && (
                      <div className="space-y-1.5 text-xs">
                        {tx.utrNumber && (
                          <div className="flex items-center justify-between p-2 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 font-mono">
                            <span>UTR: {tx.utrNumber}</span>
                            <button
                              onClick={() => handleCopy(tx.utrNumber || '', `utr-${tx.id}`)}
                              className="text-gray-400 hover:text-white"
                            >
                              {copiedId === `utr-${tx.id}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        )}
                        {tx.proofImage && (
                          <button
                            onClick={() => setPreviewProofUrl(tx.proofImage || null)}
                            className="w-full py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5"
                          >
                            <ImageIcon className="w-3.5 h-3.5" />
                            <span>View Payment Proof Slip</span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* Actions if PENDING */}
                    {tx.status === 'PENDING' && (
                      <div className="flex items-center space-x-2 pt-1">
                        <button
                          onClick={() => handleApprovePayment(tx.id)}
                          className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black transition shadow-sm text-center"
                        >
                          Approve Payout
                        </button>
                        <button
                          onClick={() => handleRejectPayment(tx.id)}
                          className="flex-1 py-2.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold transition text-center"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View */}
            <div className={`hidden lg:block border rounded-3xl overflow-x-auto shadow-xl transition-colors ${
              isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#161a26] border-[#262c3e]'
            }`}>
              <table className="w-full text-left text-xs min-w-[850px]">
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
                  {filteredTransactions.map((tx) => {
                    const amtFmt = formatTxnAmount(tx.amount, tx.currency);
                    return (
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
                        <td className={`py-3.5 px-3 font-black mono-num text-emerald-400`}>
                          <div>{amtFmt.primary}</div>
                          <div className="text-[10px] text-gray-400 font-mono font-normal">
                            ({amtFmt.secondary})
                          </div>
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
                    );
                  })}
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
                      <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        {displayCurrency === 'INR' 
                          ? `₹${(cpn.maxBonusINR || Math.round(cpn.maxBonusUSD * 95)).toLocaleString()}` 
                          : `$${cpn.maxBonusUSD}`}
                        <span className="text-[10px] text-gray-400 ml-1 font-normal">
                          ({displayCurrency === 'INR' ? `$${cpn.maxBonusUSD}` : `₹${(cpn.maxBonusINR || Math.round(cpn.maxBonusUSD * 95)).toLocaleString()}`})
                        </span>
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className={isLight ? 'text-slate-500' : 'text-gray-400'}>Min Deposit Required:</span>
                      <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        {displayCurrency === 'INR' 
                          ? `₹${(cpn.minDepositINR || Math.round(cpn.minDepositUSD * 95)).toLocaleString()}` 
                          : `$${cpn.minDepositUSD}`}
                        <span className="text-[10px] text-gray-400 ml-1 font-normal">
                          ({displayCurrency === 'INR' ? `$${cpn.minDepositUSD}` : `₹${(cpn.minDepositINR || Math.round(cpn.minDepositUSD * 95)).toLocaleString()}`})
                        </span>
                      </span>
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
                      onChange={(e) => updateRiskSetting({ targetWinRate: Number(e.target.value) })}
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
                        onClick={() => updateRiskSetting({ targetWinRate: preset.rate })}
                        className={`p-3 rounded-2xl border text-left transition ${
                          riskSettings.targetWinRate === preset.rate
                            ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500'
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
                        onClick={() => updateRiskSetting({ mode: item.mode })}
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
                      onClick={() => updateRiskSetting({ microPipSniping: !riskSettings.microPipSniping })}
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
                      onClick={() => updateRiskSetting({ applyToRealOnly: !riskSettings.applyToRealOnly })}
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
                  {isRiskDirty && (
                    <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-lg animate-pulse flex items-center space-x-1">
                      <span>⚠️ Unsaved changes ({riskSettings.targetWinRate}%)</span>
                    </span>
                  )}
                  {riskSaveSuccess && (
                    <span className="text-xs font-bold text-emerald-400 flex items-center space-x-1 animate-in fade-in">
                      <Check className="w-4 h-4" />
                      <span>Changes Saved Live!</span>
                    </span>
                  )}
                  <button
                    onClick={() => handleSaveRiskSettings(riskSettings)}
                    disabled={isSavingRisk}
                    className={`px-6 py-3 font-black text-xs rounded-xl shadow-lg transition flex items-center space-x-2 ${
                      isRiskDirty
                        ? 'bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 ring-2 ring-emerald-400 shadow-emerald-500/30 animate-pulse'
                        : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                    }`}
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSavingRisk ? 'Saving Algorithm...' : isRiskDirty ? 'Save & Deploy Changes Now' : 'Save & Deploy Risk Settings'}</span>
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

            </div>

      {/* ================= INDIVIDUAL RISK ENGINE MODAL (ADMIN) ================= */}
      {selectedTraderForRisk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden flex flex-col ${
            isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#141926] border-[#283248] text-white'
          }`}>
            <div className={`px-5 py-4 border-b flex items-center justify-between ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0f131e] border-[#222a3d]'
            }`}>
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black">Individual Risk Engine: {selectedTraderForRisk.name}</h3>
                  <p className="text-[11px] text-gray-400">Account #{selectedTraderForRisk.id} • Overrides global platform engine</p>
                </div>
              </div>
              <button onClick={() => setSelectedTraderForRisk(null)} className="p-1 rounded-xl text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs overflow-y-auto max-h-[80vh]">
              <div className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                individualRiskEnabled
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                  : 'bg-sky-500/10 border-sky-500/20 text-sky-300'
              }`}>
                <div>
                  <div className="font-black text-xs">
                    {individualRiskEnabled ? '⚡ INDIVIDUAL OVERRIDE ACTIVE' : '🌐 USING GLOBAL PLATFORM RISK'}
                  </div>
                  <div className="text-[11px] opacity-90 mt-0.5">
                    {individualRiskEnabled
                      ? `Target Win Rate: ${individualWinRate}% strictly for this account.`
                      : `Currently follows global settings (${riskSettings?.targetWinRate || 20}% win rate).`}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIndividualRiskEnabled(!individualRiskEnabled)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition ${
                    individualRiskEnabled ? 'bg-amber-500 text-black shadow-md' : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  {individualRiskEnabled ? 'Active' : 'Enable'}
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="font-bold text-gray-300">Target Win Rate: <span className="text-amber-400 font-mono text-sm">{individualWinRate}%</span></label>
                  <span className="text-[10px] text-gray-400">~{Math.round(individualWinRate / 10)} Wins / {10 - Math.round(individualWinRate / 10)} Losses</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="90"
                  step="5"
                  value={individualWinRate}
                  onChange={(e) => setIndividualWinRate(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                  <span>5% (Heavy House Edge)</span>
                  <span>20% (Quotex Standard)</span>
                  <span>50% (Fair 50/50)</span>
                  <span>90% (Trader Boost)</span>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {[10, 20, 35, 50].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => setIndividualWinRate(rate)}
                    className={`py-1.5 rounded-xl border text-xs font-bold transition ${
                      individualWinRate === rate
                        ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                        : 'border-[#283248] bg-[#0e121d] text-gray-400 hover:text-white'
                    }`}
                  >
                    {rate}%
                  </button>
                ))}
              </div>

              <div>
                <label className="font-bold text-gray-300 block mb-1.5">Execution Algorithm</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'QUOTEX_OTC', label: 'Quotex OTC', sub: 'Micro-pip sniping active' },
                    { id: 'STRICT', label: 'Strict Probability', sub: 'Hard statistical quota' },
                    { id: 'BALANCED', label: 'Balanced', sub: 'Smooth win distribution' },
                    { id: 'ORGANIC', label: 'Organic Fair', sub: 'Neutral market outcome' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setIndividualMode(m.id as any)}
                      className={`p-2.5 rounded-xl border text-left transition ${
                        individualMode === m.id
                          ? 'border-amber-500 bg-amber-500/15 text-amber-300'
                          : 'border-[#283248] bg-[#0e121d] text-gray-400 hover:text-white'
                      }`}
                    >
                      <div className="font-bold text-xs">{m.label}</div>
                      <div className="text-[10px] opacity-75">{m.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-black/25 border border-white/5 flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs">Hairline Expiry Sniping (1-2 pips)</div>
                  <div className="text-[10px] text-gray-400">Micro-adjusts price 1.5s before expiry to enforce target win rate</div>
                </div>
                <button
                  type="button"
                  onClick={() => setIndividualSniping(!individualSniping)}
                  className={`w-11 h-6 rounded-full transition-colors relative ${
                    individualSniping ? 'bg-amber-500' : 'bg-gray-700'
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                    individualSniping ? 'right-1' : 'left-1'
                  }`} />
                </button>
              </div>

              <div className="pt-2 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setSelectedTraderForRisk(null)}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSavingIndividualRisk}
                  onClick={handleSaveIndividualRisk}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs shadow-lg transition active:scale-95 flex items-center justify-center space-x-1.5"
                >
                  {isSavingIndividualRisk ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Individual Risk</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= KYC AADHAAR REVIEW MODAL (ADMIN) ================= */}
      {selectedTraderForKyc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
            isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#141926] border-[#283248] text-white'
          }`}>
            <div className={`px-5 py-4 border-b flex items-center justify-between ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0f131e] border-[#222a3d]'
            }`}>
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black">Aadhaar Document Review: {selectedTraderForKyc.name}</h3>
                  <p className="text-[11px] text-gray-400">Account #{selectedTraderForKyc.id} • Master Verification</p>
                </div>
              </div>
              <button onClick={() => setSelectedTraderForKyc(null)} className="p-1 rounded-xl text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs overflow-y-auto">
              <div className="p-3.5 rounded-2xl bg-black/25 border border-white/5 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Legal Name:</span>
                  <span className="font-bold text-white">{selectedTraderForKyc.kycData?.fullName || selectedTraderForKyc.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Aadhaar Number:</span>
                  <span className="font-mono font-bold text-amber-400">{selectedTraderForKyc.aadhaarNumber || selectedTraderForKyc.kycData?.aadhaarNumber || 'Not submitted'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Date of Birth:</span>
                  <span className="font-bold text-white">{selectedTraderForKyc.kycData?.dob || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Gender:</span>
                  <span className="font-bold text-white">{selectedTraderForKyc.kycData?.gender || 'N/A'}</span>
                </div>
              </div>

              {selectedTraderForKyc.kycData?.frontImage || selectedTraderForKyc.kycData?.backImage ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold block mb-1">Aadhaar Front</span>
                    <div className="w-full h-32 rounded-xl bg-black/40 border border-white/10 overflow-hidden flex items-center justify-center">
                      {selectedTraderForKyc.kycData?.frontImage ? (
                        <img src={selectedTraderForKyc.kycData.frontImage} alt="Front" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-gray-500 text-[10px]">No image attached</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] text-gray-400 font-bold block mb-1">Aadhaar Back</span>
                    <div className="w-full h-32 rounded-xl bg-black/40 border border-white/10 overflow-hidden flex items-center justify-center">
                      {selectedTraderForKyc.kycData?.backImage ? (
                        <img src={selectedTraderForKyc.kycData.backImage} alt="Back" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-gray-500 text-[10px]">No image attached</span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-emerald-400">Aadhaar Front & Back Documents Uploaded</div>
                    <div className="text-[10px] text-gray-400">Trader uploaded documents on device. Verify the 12-digit Aadhaar number above to approve KYC.</div>
                  </div>
                </div>
              )}

              <div className="pt-2 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => handleReviewKyc(false)}
                  className="flex-1 py-3 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition"
                >
                  Reject KYC
                </button>
                <button
                  type="button"
                  onClick={() => handleReviewKyc(true)}
                  className="flex-1 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg transition active:scale-95"
                >
                  Approve Aadhaar KYC
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: EASIEST DIRECT BALANCE EDITOR ================= */}
      {selectedUserForBalance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className={`w-full max-w-md border rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 transition-colors max-h-[92vh] overflow-y-auto ${
            isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#1a1f2e] border-[#2e354b] text-white'
          }`}>
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-500/20">
              <div>
                <h3 className={`text-base font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Direct Balance & Funds Editor
                </h3>
                <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                  Trader: <span className="font-bold text-emerald-400">{selectedUserForBalance.name}</span> ({selectedUserForBalance.id})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUserForBalance(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-500/20 text-gray-400 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Account Base Currency Selector */}
              <div>
                <label className={`text-xs font-bold block mb-1.5 ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>
                  Account Base Currency
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDirectCurrency('INR')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                      directCurrency === 'INR'
                        ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500'
                        : isLight ? 'border-slate-200 bg-slate-50 text-slate-600' : 'border-[#2e354b] bg-[#121620] text-gray-400'
                    }`}
                  >
                    <span>🇮🇳</span>
                    <span>INR (₹ - Indian Rupee)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirectCurrency('USD')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                      directCurrency === 'USD'
                        ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500'
                        : isLight ? 'border-slate-200 bg-slate-50 text-slate-600' : 'border-[#2e354b] bg-[#121620] text-gray-400'
                    }`}
                  >
                    <span>🇺🇸</span>
                    <span>USD ($ - US Dollar)</span>
                  </button>
                </div>
              </div>

              {/* Active Trading Account Mode */}
              <div>
                <label className={`text-xs font-bold block mb-1.5 ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>
                  Trader Default View Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDirectAccountType('REAL')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                      directAccountType === 'REAL'
                        ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                        : isLight ? 'border-slate-200 bg-slate-50 text-slate-600' : 'border-[#2e354b] bg-[#121620] text-gray-400'
                    }`}
                  >
                    🟢 Live Real Account
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirectAccountType('DEMO')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                      directAccountType === 'DEMO'
                        ? 'border-sky-500 bg-sky-500/20 text-sky-400'
                        : isLight ? 'border-slate-200 bg-slate-50 text-slate-600' : 'border-[#2e354b] bg-[#121620] text-gray-400'
                    }`}
                  >
                    🔵 Demo Practice Account
                  </button>
                </div>
              </div>

              {/* 1. Live Real Balance Input & Presets */}
              <div className="p-3.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-emerald-400 flex items-center space-x-1.5">
                    <span>💵</span>
                    <span>Live Real Account Balance</span>
                  </label>
                  <span className="text-[10px] text-gray-400 font-mono">
                    Current: {formatUserBal(selectedUserForBalance.realBalance, selectedUserForBalance.currency).primary}
                  </span>
                </div>

                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-emerald-400 text-sm">
                    {directCurrency === 'INR' ? '₹' : '$'}
                  </span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={directRealBalance}
                    onChange={(e) => setDirectRealBalance(Math.max(0, Number(e.target.value)))}
                    className={`w-full border rounded-xl pl-8 pr-3 py-2 text-base font-black focus:outline-none transition ${
                      isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#121620] border-[#2e354b] text-white'
                    }`}
                  />
                </div>

                {/* Real Quick Add Chips */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {directCurrency === 'INR' ? (
                    <>
                      {[500, 1000, 5000, 10000, 50000].map((add) => (
                        <button
                          key={add}
                          type="button"
                          onClick={() => setDirectRealBalance((prev) => +(Number(prev || 0) + add).toFixed(2))}
                          className="px-2 py-1 text-[11px] font-bold rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition"
                        >
                          +₹{add >= 1000 ? `${add / 1000}k` : add}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setDirectRealBalance(0)}
                        className="px-2 py-1 text-[11px] font-bold rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition ml-auto"
                      >
                        Set to 0
                      </button>
                    </>
                  ) : (
                    <>
                      {[10, 25, 50, 100, 500].map((add) => (
                        <button
                          key={add}
                          type="button"
                          onClick={() => setDirectRealBalance((prev) => +(Number(prev || 0) + add).toFixed(2))}
                          className="px-2 py-1 text-[11px] font-bold rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition"
                        >
                          +${add}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setDirectRealBalance(0)}
                        className="px-2 py-1 text-[11px] font-bold rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition ml-auto"
                      >
                        Set to 0
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* 2. Demo Balance Input & Presets */}
              <div className="p-3.5 rounded-2xl border border-sky-500/30 bg-sky-500/5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-sky-400 flex items-center space-x-1.5">
                    <span>🎯</span>
                    <span>Demo Practice Balance</span>
                  </label>
                  <span className="text-[10px] text-gray-400 font-mono">
                    Current: {formatUserBal(selectedUserForBalance.demoBalance, selectedUserForBalance.currency).primary}
                  </span>
                </div>

                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-sky-400 text-sm">
                    {directCurrency === 'INR' ? '₹' : '$'}
                  </span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={directDemoBalance}
                    onChange={(e) => setDirectDemoBalance(Math.max(0, Number(e.target.value)))}
                    className={`w-full border rounded-xl pl-8 pr-3 py-2 text-base font-black focus:outline-none transition ${
                      isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#121620] border-[#2e354b] text-white'
                    }`}
                  />
                </div>

                {/* Demo Quick Reset Chips */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[10000, 50000, 100000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setDirectDemoBalance(preset)}
                      className="px-2 py-1 text-[11px] font-bold rounded-lg border border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 transition"
                    >
                      Reset {preset >= 1000 ? `${preset / 1000}k` : preset}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setDirectDemoBalance(0)}
                    className="px-2 py-1 text-[11px] font-bold rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition ml-auto"
                  >
                    Set to 0
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex space-x-2 pt-2 border-t border-gray-500/20">
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
                disabled={isSavingBalance}
                onClick={handleSaveDirectBalances}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-black font-black py-2.5 rounded-xl text-xs shadow-lg hover:brightness-110 active:scale-95 transition disabled:opacity-50"
              >
                {isSavingBalance ? 'Saving...' : 'Save & Apply Funds Now'}
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* ================= MODAL: ADMIN RESET USER PASSWORD ================= */}
      {selectedUserForPasswordReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className={`w-full max-w-md border rounded-3xl p-6 shadow-2xl space-y-4 transition-colors ${
            isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#1a1f2e] border-[#2e354b] text-white'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-gray-700/40">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-base font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>Reset Trader Password</h3>
                  <p className="text-xs text-gray-400 font-mono">{selectedUserForPasswordReset.name} • {selectedUserForPasswordReset.email}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUserForPasswordReset(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {resetPasswordSuccess ? (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-3">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <p className="text-sm font-bold text-emerald-400">{resetPasswordSuccess}</p>
                <p className="text-xs text-gray-400">The trader's password has been updated and a security notice email has been dispatched to their inbox.</p>
                <button
                  onClick={() => setSelectedUserForPasswordReset(null)}
                  className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs transition"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className={`text-xs font-bold block mb-1.5 ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>
                    New Password for Trader
                  </label>
                  <input
                    type="text"
                    required
                    minLength={6}
                    value={resetPasswordValue}
                    onChange={(e) => setResetPasswordValue(e.target.value)}
                    placeholder="Enter new strong password (min 6 chars)..."
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono focus:outline-none focus:border-amber-500 ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#121620] border-[#2e354b] text-white'
                    }`}
                  />
                  <div className="flex items-center justify-between mt-2">
                    <button
                      type="button"
                      onClick={() => setResetPasswordValue('Tr@der$' + Math.floor(100000 + Math.random() * 900000))}
                      className="text-[11px] text-amber-400 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <Sparkles className="w-3 h-3" /> Generate Random Secure Password
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300/90 leading-relaxed">
                  ⚠️ Resetting will immediately invalidate any existing sessions and overwrite the login password. The trader will receive an automated email notice.
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedUserForPasswordReset(null)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition ${
                      isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200' : 'bg-[#222838] hover:bg-[#2c3347] text-white border-[#2e354b]'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isResettingPassword || !resetPasswordValue.trim()}
                    className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black rounded-xl text-xs transition flex items-center justify-center space-x-1"
                  >
                    {isResettingPassword ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Resetting...</span>
                      </>
                    ) : (
                      <>
                        <Key className="w-3.5 h-3.5" />
                        <span>Update Password</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
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
              {/* Currency Selector */}
              <div>
                <label className={`text-xs font-bold block mb-1.5 ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>
                  Input Currency Mode
                </label>
                <div className="flex rounded-xl bg-black/20 p-1 border border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      if (couponCurrency !== 'INR') {
                        setCouponCurrency('INR');
                        setNewMinDeposit((prev) => Math.round(prev * 95));
                        setNewMaxBonus((prev) => Math.round(prev * 95));
                      }
                    }}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-black transition flex items-center justify-center space-x-1.5 ${
                      couponCurrency === 'INR'
                        ? 'bg-emerald-500 text-slate-950 shadow-md'
                        : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <span>🇮🇳 ₹ INR (Primary)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (couponCurrency !== 'USD') {
                        setCouponCurrency('USD');
                        setNewMinDeposit((prev) => Math.max(1, Math.round(prev / 95)));
                        setNewMaxBonus((prev) => Math.max(1, Math.round(prev / 95)));
                      }
                    }}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-black transition flex items-center justify-center space-x-1.5 ${
                      couponCurrency === 'USD'
                        ? 'bg-emerald-500 text-slate-950 shadow-md'
                        : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <span>🇺🇸 $ USD</span>
                  </button>
                </div>
              </div>

              <div>
                <label className={`text-xs font-bold block mb-1 ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>
                  Coupon Code (e.g. GROW10K, VIP2026)
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
                  <div className="flex justify-between items-center mb-1">
                    <label className={`text-xs font-bold ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>
                      Max Bonus ({couponCurrency === 'INR' ? '₹' : '$'})
                    </label>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {couponCurrency === 'INR' 
                        ? `≈ $${(newMaxBonus / 95).toFixed(2)}` 
                        : `≈ ₹${Math.round(newMaxBonus * 95).toLocaleString()}`}
                    </span>
                  </div>
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
                  <div className="flex justify-between items-center mb-1">
                    <label className={`text-xs font-bold ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>
                      Min Deposit ({couponCurrency === 'INR' ? '₹' : '$'})
                    </label>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {couponCurrency === 'INR' 
                        ? `≈ $${(newMinDeposit / 95).toFixed(2)}` 
                        : `≈ ₹${Math.round(newMinDeposit * 95).toLocaleString()}`}
                    </span>
                  </div>
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
                  <div className="font-sans font-bold text-emerald-400 text-sm">✅ Trader Account Verified & Created!</div>
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
                    setCreateStep('FORM');
                    setIsCreateUserModalOpen(false);
                  }}
                  className="w-full py-2 bg-white/10 text-xs font-bold rounded-xl"
                >
                  Done
                </button>
              </div>
            ) : createStep === 'OTP' ? (
              <form onSubmit={handleVerifyOtpAndCreate} className="space-y-4 py-2">
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                    <Mail className="w-5 h-5" />
                  </div>
                  <h4 className={`font-black text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>Email Verification Required</h4>
                  <p className="text-xs text-gray-400">
                    A 6-digit security OTP has been dispatched to:
                  </p>
                  <div className="font-mono font-bold text-amber-400 bg-black/40 px-3 py-1 rounded-lg inline-block text-xs border border-amber-500/30">
                    {newUserEmail}
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Obtain the verification code from the client to authorize and activate their trading account.
                  </p>
                </div>

                {createOtpError && (
                  <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-bold text-center">
                    {createOtpError}
                  </div>
                )}

                <div>
                  <label className={`text-xs font-bold block mb-1 text-center ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>
                    Enter 6-Digit Email OTP *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    autoFocus
                    placeholder="• • • • • •"
                    value={createOtpCode}
                    onChange={(e) => setCreateOtpCode(e.target.value.replace(/\D/g, ''))}
                    className={`w-full tracking-[8px] text-center text-xl font-mono font-black py-3 rounded-xl border focus:outline-none ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#121620] border-[#2e354b] text-emerald-400'
                    }`}
                  />
                  {debugOtpCode && (
                    <button
                      type="button"
                      onClick={() => setCreateOtpCode(debugOtpCode)}
                      className="text-[11px] text-amber-400 hover:text-amber-300 font-mono underline block mx-auto mt-2"
                    >
                      ⚡ Auto-fill Security Code ({debugOtpCode})
                    </button>
                  )}
                </div>

                <div className="flex space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCreateStep('FORM');
                      setCreateOtpError(null);
                    }}
                    className={`flex-1 font-bold py-2.5 rounded-xl text-xs transition border ${
                      isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200' : 'bg-[#222838] hover:bg-[#2c3347] text-gray-300 border-[#2e354b]'
                    }`}
                  >
                    ← Edit Details
                  </button>
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={isSendingOtp}
                    className={`px-3 font-bold py-2.5 rounded-xl text-xs transition border text-amber-400 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20`}
                  >
                    {isSendingOtp ? 'Resending...' : 'Resend OTP'}
                  </button>
                  <button
                    type="submit"
                    disabled={isVerifyingOtp}
                    className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black py-2.5 rounded-xl text-xs shadow-lg transition disabled:opacity-50 flex items-center justify-center space-x-1"
                  >
                    {isVerifyingOtp ? <span>Verifying...</span> : <span>✓ Verify & Create</span>}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSendOtp} className="space-y-4">
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
                    placeholder="e.g. +91 9180169771"
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
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setNewUserRealBal(val);
                      const autoTier = val >= 500000 ? 'VIP' : val >= 100000 ? 'PRO' : 'STANDARD';
                      setNewUserVip(autoTier);
                    }}
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
                  disabled={isSendingOtp}
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black py-2.5 rounded-xl text-xs shadow-lg transition flex items-center justify-center space-x-1.5 disabled:opacity-50"
                >
                  {isSendingOtp ? (
                    <span>Sending Verification Email...</span>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      <span>Send OTP & Verify Email</span>
                    </>
                  )}
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
