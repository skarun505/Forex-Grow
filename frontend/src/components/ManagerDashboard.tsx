import React, { useState, useEffect, useRef } from 'react';
import { useTrading } from '../context/TradingContext';
import { apiUrl } from '../utils/api';
import { ForexGrowLogo } from './ForexGrowLogo';
import {
  UserAccount,
  Transaction,
  Trade,
  AuditLog,
  CurrencyCode,
  VipLevel,
  DepositPaymentSettings,
  RiskSettings,
  PromoCoupon,
} from '../types';
import {
  ShieldCheck,
  CreditCard,
  Users,
  Activity,
  Search,
  CheckCircle2,
  Copy,
  Check,
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowDownLeft,
  Wallet,
  RefreshCw,
  LogOut,
  Lock,
  Unlock,
  Eye,
  FileText,
  UserPlus,
  Mail,
  Sparkles,
  Key,
  X,
  Phone,
  Building2,
  Smartphone,
  Edit3,
  Save,
  TrendingUp,
  Zap,
  Power,
  Sliders,
  Tag,
  Plus,
  Trash2,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface ManagerOverview {
  pendingDeposits: number;
  pendingWithdrawals: number;
  totalActiveUsers: number;
  verifiedUsersCount: number;
  totalApprovedDepositsUSD: number;
  totalPendingAmountUSD: number;
}

interface ManagerDashboardProps {
  onClose?: () => void;
}

export const ManagerDashboard: React.FC<ManagerDashboardProps> = () => {
  const { theme } = useTrading();
  const isLight = theme === 'light';

  const [activeTab, setActiveTab] = useState<'CASHIER' | 'TRADERS' | 'TRADES' | 'RISK' | 'COUPONS' | 'AUDIT'>('CASHIER');
  const [riskSettings, setRiskSettings] = useState<RiskSettings>({
    enabled: true,
    targetWinRate: 20,
    mode: 'QUOTEX_OTC',
    microPipSniping: true,
    applyToRealOnly: true,
  });
  const [isRiskDirty, setIsRiskDirty] = useState(false);
  const isRiskDirtyRef = useRef(false);
  const [isSavingRisk, setIsSavingRisk] = useState(false);
  const [riskSaveSuccess, setRiskSaveSuccess] = useState(false);
  const [overview, setOverview] = useState<ManagerOverview | null>(null);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [liveTrades, setLiveTrades] = useState<Trade[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [coupons, setCoupons] = useState<PromoCoupon[]>([]);
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newBonusPct, setNewBonusPct] = useState(10);
  const [couponCurrency, setCouponCurrency] = useState<'INR' | 'USD'>('INR');
  const [newMaxBonus, setNewMaxBonus] = useState(5000);
  const [newMinDeposit, setNewMinDeposit] = useState(1000);
  const [newMaxUsage, setNewMaxUsage] = useState(500);

  // Individual Risk Engine State
  const [selectedTraderForRisk, setSelectedTraderForRisk] = useState<UserAccount | null>(null);
  const [individualRiskEnabled, setIndividualRiskEnabled] = useState(false);
  const [individualWinRate, setIndividualWinRate] = useState(20);
  const [individualMode, setIndividualMode] = useState<'QUOTEX_OTC' | 'STRICT' | 'BALANCED' | 'ORGANIC'>('QUOTEX_OTC');
  const [individualSniping, setIndividualSniping] = useState(true);
  const [isSavingIndividualRisk, setIsSavingIndividualRisk] = useState(false);

  // Aadhaar KYC Review State
  const [selectedTraderForKyc, setSelectedTraderForKyc] = useState<UserAccount | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  // Search & Filter States
  const [txnSearch, setTxnSearch] = useState('');
  const [txnFilter, setTxnFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'DEPOSIT' | 'WITHDRAWAL'>('PENDING');
  const [userSearch, setUserSearch] = useState('');
  const [traderViewMode, setTraderViewMode] = useState<'CARDS' | 'TABLE'>('CARDS');
  const [copiedUtr, setCopiedUtr] = useState<string | null>(null);
  const [selectedProofImg, setSelectedProofImg] = useState<string | null>(null);
  const [selectedProofTx, setSelectedProofTx] = useState<Transaction | null>(null);
  const [managerProofImgError, setManagerProofImgError] = useState(false);

  const openManagerProofModal = (tx: Transaction) => {
    setSelectedProofTx(tx);
    setSelectedProofImg(tx.proofImage || null);
    setManagerProofImgError(false);
  };

  // Global Manager Display Currency: Primary is strictly INR, next only USD
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
      const token =
        sessionStorage.getItem('forexgrow_manager_tab_token') ||
        localStorage.getItem('forexgrow_manager_token') ||
        localStorage.getItem('forexgrow_auth_token');
      await fetch(apiUrl('/api/auth/logout'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
    } catch {}
    localStorage.removeItem('quotex_manager_user');
    localStorage.removeItem('forexgrow_manager_token');
    sessionStorage.removeItem('forexgrow_manager_tab_token');
    window.history.pushState({}, '', '/manager');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  // Client Creation States
  const [isCreateClientModalOpen, setIsCreateClientModalOpen] = useState(false);
  const [createClientStep, setCreateClientStep] = useState<'FORM' | 'OTP'>('FORM');
  const [clientOtpCode, setClientOtpCode] = useState('');
  const [clientDebugOtp, setClientDebugOtp] = useState<string | null>(null);
  const [isSendingClientOtp, setIsSendingClientOtp] = useState(false);
  const [isVerifyingClientOtp, setIsVerifyingClientOtp] = useState(false);
  const [clientOtpError, setClientOtpError] = useState<string | null>(null);
  const [newClientName, setNewClientName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientPassword, setNewClientPassword] = useState('Trader@2026');
  const [newClientCurrency, setNewClientCurrency] = useState<CurrencyCode>('INR');
  const [newClientDemoBal, setNewClientDemoBal] = useState('700000');
  const [newClientRealBal, setNewClientRealBal] = useState('0');
  const [newClientVip, setNewClientVip] = useState<VipLevel>('STANDARD');
  const [newClientKyc, setNewClientKyc] = useState(false);
  const [createdClientSlip, setCreatedClientSlip] = useState<any | null>(null);
  const [createClientError, setCreateClientError] = useState<string | null>(null);
  const [slipCopied, setSlipCopied] = useState(false);

  // Dynamic Bank and UPI Settings State
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
  const [managerNotification, setManagerNotification] = useState<string | null>(null);

  // User Balance Adjustment Modal State (Easiest Direct Balance Edit)
  const [selectedUserForBalance, setSelectedUserForBalance] = useState<UserAccount | null>(null);
  const [directRealBalance, setDirectRealBalance] = useState<number>(0);
  const [directDemoBalance, setDirectDemoBalance] = useState<number>(700000);
  const [directCurrency, setDirectCurrency] = useState<'INR' | 'USD'>('INR');
  const [directAccountType, setDirectAccountType] = useState<'DEMO' | 'REAL'>('REAL');
  const [isSavingBalance, setIsSavingBalance] = useState<boolean>(false);

  // Manager Password Reset Modal State
  const [selectedUserForPasswordReset, setSelectedUserForPasswordReset] = useState<UserAccount | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState<string>('');
  const [isResettingPassword, setIsResettingPassword] = useState<boolean>(false);
  const [resetPasswordSuccess, setResetPasswordSuccess] = useState<string | null>(null);

  // Selected User for Viewing & Deleting Individual Trades
  const [selectedUserForTrades, setSelectedUserForTrades] = useState<UserAccount | null>(null);
  const [userTrades, setUserTrades] = useState<{ activeTrades: Trade[]; tradeHistory: Trade[] } | null>(null);
  const [tradesLoading, setTradesLoading] = useState(false);



  const showManagerToast = (msg: string) => {
    setManagerNotification(msg);
    setTimeout(() => setManagerNotification(null), 3500);
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

  // Current logged in manager profile
  const managerProfile = {
    id: 'usr_manager_ops_01',
    name: 'Raksha',
    email: 'raksha@forexgrow.com',
    role: 'MANAGER' as const,
  };

  const openDirectBalanceModal = (u: UserAccount) => {
    setSelectedUserForBalance(u);
    setDirectRealBalance(u.realBalance ?? 0);
    setDirectDemoBalance(u.demoBalance ?? 700000);
    setDirectCurrency((u.currency as 'INR' | 'USD') || 'INR');
    setDirectAccountType(u.activeAccountType || 'REAL');
  };

  const handleSaveDirectBalances = async () => {
    if (!selectedUserForBalance) return;
    setIsSavingBalance(true);
    try {
      const res = await fetch(apiUrl(`/api/manager/users/${selectedUserForBalance.id}/set-balances`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          realBalance: Number(directRealBalance),
          demoBalance: Number(directDemoBalance),
          currency: directCurrency,
          activeAccountType: directAccountType,
          actorName: managerProfile.name,
        }),
      });
      if (res.ok) {
        showManagerToast(`✅ Balances for ${selectedUserForBalance.name} updated!`);
        setSelectedUserForBalance(null);
        fetchManagerData();
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


  const handleSavePaymentSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPaymentSettings(true);
    try {
      const res = await fetch(apiUrl('/api/manager/payment/settings'), {
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
          actorName: managerProfile.name,
          actorId: managerProfile.id,
        }),
      });
      const data = await res.json();
      if (data?.settings) {
        setPaymentSettings(data.settings);
        setIsEditPaymentModalOpen(false);
        showManagerToast('✅ Receiving Bank & UPI details updated live for all clients!');
      }
    } catch (err) {
      console.error('Failed to save payment settings:', err);
    } finally {
      setIsSavingPaymentSettings(false);
    }
  };

  const getManagerHeaders = () => {
    const token =
      sessionStorage.getItem('forexgrow_manager_tab_token') ||
      localStorage.getItem('forexgrow_manager_token') ||
      sessionStorage.getItem('forexgrow_tab_token') ||
      localStorage.getItem('forexgrow_auth_token') ||
      '';
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  };

  const fetchManagerData = async () => {
    setIsLoading(true);
    try {
      const headers = getManagerHeaders();
      const [ovRes, uRes, txRes, trRes, logRes, psRes, riskRes, cpnRes] = await Promise.all([
        fetch(apiUrl('/api/manager/overview'), { headers }).then((r) => r.json()).catch(() => null),
        fetch(apiUrl('/api/manager/users'), { headers }).then((r) => r.json()).catch(() => []),
        fetch(apiUrl('/api/manager/transactions'), { headers }).then((r) => r.json()).catch(() => []),
        fetch(apiUrl('/api/manager/trades'), { headers }).then((r) => r.json()).catch(() => []),
        fetch(apiUrl('/api/manager/audit-logs'), { headers }).then((r) => r.json()).catch(() => []),
        fetch(apiUrl('/api/payment/settings'), { headers }).then((r) => r.json()).catch(() => null),
        fetch(apiUrl('/api/manager/risk/settings'), { headers }).then((r) => r.json()).catch(() => null),
        fetch(apiUrl('/api/manager/coupons'), { headers }).then((r) => r.json()).catch(() => []),
      ]);

      if (uRes?.code === 'FORBIDDEN_ROOT' || uRes?.code === 'FORBIDDEN_MANAGER' || (uRes && !Array.isArray(uRes) && uRes.error)) {
        localStorage.removeItem('quotex_manager_user');
        localStorage.removeItem('forexgrow_manager_token');
        sessionStorage.removeItem('forexgrow_manager_tab_token');
        window.history.pushState({}, '', '/manager');
        window.dispatchEvent(new PopStateEvent('popstate'));
        return;
      }

      setOverview(ovRes && !ovRes.error ? ovRes : null);
      setUsers(Array.isArray(uRes) ? uRes : []);
      setTransactions(Array.isArray(txRes) ? txRes : []);
      setLiveTrades(Array.isArray(trRes) ? trRes : []);
      setAuditLogs(Array.isArray(logRes) ? logRes : []);
      if (psRes?.settings) {
        setPaymentSettings(psRes.settings);
      }
      if (riskRes?.settings && !isRiskDirtyRef.current) {
        setRiskSettings(riskRes.settings);
      }
      if (Array.isArray(cpnRes)) {
        setCoupons(cpnRes);
      }
    } catch (e) {
      console.error('Failed to fetch manager data', e);
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
      const res = await fetch(apiUrl('/api/manager/risk/settings'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...merged, actorName: managerProfile.name || 'Operations Desk' }),
      });
      const data = await res.json();
      if (data?.settings) {
        setRiskSettings(data.settings);
        setIsRiskDirty(false);
        isRiskDirtyRef.current = false;
        setRiskSaveSuccess(true);
        showManagerToast(`✅ Quotex Risk Engine saved! Win-rate set to ${data.settings.targetWinRate}% (${Math.round(data.settings.targetWinRate / 10)} wins / ${10 - Math.round(data.settings.targetWinRate / 10)} losses)`);
        setTimeout(() => setRiskSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Failed to save risk settings:', err);
    } finally {
      setIsSavingRisk(false);
    }
  };

    // Coupon Handlers
  const handleCreateCoupon = async () => {
    if (!newCouponCode.trim()) return;
    try {
      const isINR = couponCurrency === 'INR';
      const minUSD = isINR ? Number((newMinDeposit / 95).toFixed(2)) : newMinDeposit;
      const maxBonusUSD = isINR ? Number((newMaxBonus / 95).toFixed(2)) : newMaxBonus;
      const minINR = isINR ? newMinDeposit : Math.round(newMinDeposit * 95);
      const maxBonusINR = isINR ? newMaxBonus : Math.round(newMaxBonus * 95);

      const res = await fetch(apiUrl('/api/manager/coupons'), {
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
        showManagerToast('✅ Promo coupon created successfully!');
        fetchManagerData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleCoupon = async (id: string, currentActive: boolean) => {
    try {
      await fetch(apiUrl(`/api/manager/coupons/${id}/toggle`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentActive }),
      });
      fetchManagerData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!confirm('Are you sure you want to delete this promo coupon?')) return;
    try {
      await fetch(apiUrl(`/api/manager/coupons/${id}`), { method: 'DELETE' });
      fetchManagerData();
    } catch (e) {
      console.error(e);
    }
  };

  // Handle View Trades for a User
  const handleViewUserTrades = async (user: UserAccount) => {
    setSelectedUserForTrades(user);
    setTradesLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/manager/users/${user.id}/trades`), {
        headers: getManagerHeaders(),
      });
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
      const res = await fetch(apiUrl(`/api/manager/trades/${tradeId}`), {
        method: 'DELETE',
        headers: getManagerHeaders(),
      });
      if (res.ok) {
        showManagerToast('Trade record deleted successfully');
        if (selectedUserForTrades) {
          await handleViewUserTrades(selectedUserForTrades);
        }
        fetchManagerData();
      }
    } catch (e) {
      console.error(e);
    }
  };



  // Individual Risk Handlers
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
      const res = await fetch(apiUrl(`/api/manager/users/${selectedTraderForRisk.id}/risk`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: individualRiskEnabled,
          targetWinRate: individualWinRate,
          mode: individualMode,
          microPipSniping: individualSniping,
          actorName: managerProfile.name,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showManagerToast(`✅ Risk updated for ${selectedTraderForRisk.name}! (${individualRiskEnabled ? `${individualWinRate}% Custom` : 'Global Engine Default'})`);
        setSelectedTraderForRisk(null);
        fetchManagerData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingIndividualRisk(false);
    }
  };

  // Aadhaar KYC Handlers
  const handleReviewKyc = async (isApproved: boolean) => {
    if (!selectedTraderForKyc) return;
    let reason: string | undefined;
    if (!isApproved) {
      const input = prompt('Enter rejection reason for Aadhaar document review:', 'Document photo blurry / Aadhaar number mismatch');
      if (input === null) return;
      reason = input;
    }
    try {
      const res = await fetch(apiUrl(`/api/manager/users/${selectedTraderForKyc.id}/kyc/review`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isApproved,
          reason,
          actorName: managerProfile.name,
        }),
      });
      if (res.ok) {
        showManagerToast(isApproved ? `✅ Aadhaar verified for ${selectedTraderForKyc.name}!` : `❌ KYC rejected for ${selectedTraderForKyc.name}`);
        setSelectedTraderForKyc(null);
        fetchManagerData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchManagerData();
    const interval = setInterval(fetchManagerData, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUtr(id);
    setTimeout(() => setCopiedUtr(null), 2000);
  };

  // Cashier Actions
  const handleApproveTransaction = async (txId: string) => {
    if (!confirm('Approve this transaction and credit the trader account?')) return;
    try {
      const res = await fetch(apiUrl(`/api/manager/transactions/${txId}/approve`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actorId: managerProfile.id,
          actorName: managerProfile.name,
        }),
      });
      if (res.ok) {
        confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
        fetchManagerData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRejectTransaction = async (txId: string) => {
    const reason = prompt('Enter rejection reason for audit log:', 'Invalid UTR / Transaction proof mismatched');
    if (reason === null) return;
    try {
      const res = await fetch(apiUrl(`/api/manager/transactions/${txId}/reject`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason,
          actorId: managerProfile.id,
          actorName: managerProfile.name,
        }),
      });
      if (res.ok) fetchManagerData();
    } catch (e) {
      console.error(e);
    }
  };

  // Trader Management Actions
  const handleToggleKyc = async (userId: string, currentStatus: boolean) => {
    try {
      const res = await fetch(apiUrl(`/api/manager/users/${userId}/kyc`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isVerified: !currentStatus,
          actorId: managerProfile.id,
          actorName: managerProfile.name,
        }),
      });
      if (res.ok) fetchManagerData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: 'ACTIVE' | 'FROZEN') => {
    const newStatus = currentStatus === 'ACTIVE' ? 'FROZEN' : 'ACTIVE';
    if (!confirm(`Are you sure you want to ${newStatus === 'FROZEN' ? 'FREEZE' : 'UNFREEZE'} this account?`)) return;
    try {
      const res = await fetch(apiUrl(`/api/manager/users/${userId}/status`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          actorId: managerProfile.id,
          actorName: managerProfile.name,
        }),
      });
      if (res.ok) fetchManagerData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleResetDemo = async (userId: string) => {
    if (!confirm('Reset this trader demo balance back to ₹7,00,000?')) return;
    try {
      const res = await fetch(apiUrl(`/api/manager/users/${userId}/reset-demo`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actorId: managerProfile.id,
          actorName: managerProfile.name,
        }),
      });
      if (res.ok) fetchManagerData();
    } catch (e) {
      console.error(e);
    }
  };

  // Handle Manager User Password Reset
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForPasswordReset || !resetPasswordValue.trim()) return;
    setIsResettingPassword(true);
    setResetPasswordSuccess(null);
    try {
      const res = await fetch(apiUrl(`/api/manager/users/${selectedUserForPasswordReset.id}/reset-password`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newPassword: resetPasswordValue.trim(),
          actorName: managerProfile.name,
          actorId: managerProfile.id,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || 'Failed to reset password');
        return;
      }
      setResetPasswordSuccess(`Password successfully changed to: ${resetPasswordValue.trim()}`);
      fetchManagerData();
    } catch (err) {
      alert('Network error while resetting password');
    } finally {
      setIsResettingPassword(false);
    }
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$';
    let res = '';
    for (let i = 0; i < 9; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewClientPassword(`Fg@${res}`);
  };

  const handleSendClientOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateClientError(null);
    if (!newClientName.trim() || !newClientEmail.trim()) {
      setCreateClientError('Full Name and Email address are required.');
      return;
    }
    if (!newClientEmail.includes('@')) {
      setCreateClientError('Please enter a valid email address.');
      return;
    }

    setIsSendingClientOtp(true);
    try {
      const res = await fetch(apiUrl('/api/auth/send-register-otp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newClientName.trim(),
          email: newClientEmail.trim(),
          phone: newClientPhone.trim() || undefined,
          password: newClientPassword.trim(),
          currency: newClientCurrency,
          demoBalance: Number(newClientDemoBal) || 700000,
          realBalance: Number(newClientRealBal) || 0,
          vipLevel: newClientVip,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setCreateClientError(data.error || 'Failed to dispatch verification email');
        return;
      }

      setCreateClientStep('OTP');
      setClientOtpCode('');
      if (data.debugOtp) {
        setClientDebugOtp(data.debugOtp);
      }
    } catch (err) {
      setCreateClientError('Failed to connect to backend server');
    } finally {
      setIsSendingClientOtp(false);
    }
  };

  const handleVerifyClientOtpAndCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setClientOtpError(null);
    if (!clientOtpCode.trim() || clientOtpCode.trim().length < 6) {
      setClientOtpError('Please enter the complete 6-digit OTP code');
      return;
    }

    setIsVerifyingClientOtp(true);
    try {
      const res = await fetch(apiUrl('/api/auth/verify-register-otp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newClientEmail.trim(),
          otp: clientOtpCode.trim(),
          demoBalance: Number(newClientDemoBal) || 700000,
          realBalance: Number(newClientRealBal) || 0,
          vipLevel: newClientVip,
          isKycVerified: newClientKyc,
          actor: {
            id: managerProfile.id,
            name: managerProfile.name,
            role: 'MANAGER',
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.user) {
        setClientOtpError(data.error || 'Invalid or expired verification code');
        return;
      }

      confetti({ particleCount: 75, spread: 70, origin: { y: 0.6 } });
      setCreatedClientSlip({
        name: data.user.name,
        id: data.user.id,
        email: data.user.email,
        phone: data.user.phone || 'N/A',
        password: newClientPassword.trim(),
        currency: data.user.currency,
        demoBalance: data.user.demoBalance,
        realBalance: data.user.realBalance,
        url: window.location.origin,
      });

      setCreateClientStep('FORM');
      fetchManagerData();
    } catch (err) {
      setClientOtpError('Network error while verifying OTP');
    } finally {
      setIsVerifyingClientOtp(false);
    }
  };

  const copyCredentialsSlip = () => {
    if (!createdClientSlip) return;
    const text = `🌟 FOREX GROW TRADING ACCOUNT CREDENTIALS 🌟
-----------------------------------------
Client Name: ${createdClientSlip.name}
Login ID: ${createdClientSlip.id}
Login (Email): ${createdClientSlip.email}
Login (Mobile): ${createdClientSlip.phone}
Password: ${createdClientSlip.password}
Account Currency: ${createdClientSlip.currency}
Demo Balance: ${createdClientSlip.currency === 'USD' ? '$' : '₹'}${createdClientSlip.demoBalance.toLocaleString()}
Live Real Balance: ${createdClientSlip.currency === 'USD' ? '$' : '₹'}${createdClientSlip.realBalance.toLocaleString()}
Terminal URL: ${createdClientSlip.url}
-----------------------------------------
Issued by Forex Grow Desk Operations. Direct login supported with Login ID, Email, or Mobile Number.`;
    navigator.clipboard.writeText(text);
    setSlipCopied(true);
    setTimeout(() => setSlipCopied(false), 2500);
  };

  const safeUsers = Array.isArray(users) ? users : [];
  const safeTransactions = Array.isArray(transactions) ? transactions : [];
  const safeLiveTrades = Array.isArray(liveTrades) ? liveTrades : [];
  const safeAuditLogs = Array.isArray(auditLogs) ? auditLogs : [];
  const safeCoupons = Array.isArray(coupons) ? coupons : [];

  // Filtered lists
  const filteredTransactions = safeTransactions.filter((tx) => {
    const matchesFilter =
      txnFilter === 'ALL' ||
      (txnFilter === 'PENDING' && tx.status === 'PENDING') ||
      (txnFilter === 'APPROVED' && tx.status === 'APPROVED') ||
      (txnFilter === 'REJECTED' && tx.status === 'REJECTED') ||
      (txnFilter === 'DEPOSIT' && tx.type === 'DEPOSIT') ||
      (txnFilter === 'WITHDRAWAL' && tx.type === 'WITHDRAWAL');

    const q = txnSearch.trim().toLowerCase();
    const matchesQuery =
      !q ||
      tx.userName.toLowerCase().includes(q) ||
      tx.id.toLowerCase().includes(q) ||
      (tx.utrNumber && tx.utrNumber.toLowerCase().includes(q)) ||
      (tx.method && tx.method.toLowerCase().includes(q));

    return matchesFilter && matchesQuery;
  });

  const filteredUsers = safeUsers.filter((u) => {
    if (u.role && u.role !== 'TRADER') return false;
    const q = userSearch.trim().toLowerCase();
    return (
      !q ||
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.id.toLowerCase().includes(q)
    );
  });

  const pendingCount = (overview?.pendingDeposits || 0) + (overview?.pendingWithdrawals || 0);

  return (
    <div className={`fixed inset-0 z-40 flex flex-col overflow-hidden font-sans select-none transition-colors duration-200 ${
      isLight ? 'bg-slate-50 text-slate-800' : 'bg-[#0f121d] text-gray-100'
    }`}>
      {/* Top Header */}
      <header className={`border-b transition-colors px-3 sm:px-6 py-2.5 sm:py-0 min-h-[56px] sm:h-16 flex flex-col sm:flex-row justify-between sm:items-center gap-2 z-30 ${
        isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#151926] border-[#252c40]'
      }`}>
        {/* Top Row: Brand & Mobile Quick Action Icons */}
        <div className="flex items-center justify-between w-full sm:w-auto">
          <ForexGrowLogo
            size="sm"
            variant="manager"
            badgeText="OPERATIONS"
            subtitle="Cashier settlements, KYC verification & live trading desk"
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
                  displayCurrency === 'INR' ? 'bg-sky-500 text-black font-black shadow-sm' : 'text-gray-400'
                }`}
                title="Primary Currency INR"
              >
                ₹ INR
              </button>
              <button
                onClick={() => setDisplayCurrency('USD')}
                className={`px-1.5 py-0.5 rounded transition ${
                  displayCurrency === 'USD' ? 'bg-sky-500 text-black font-black shadow-sm' : 'text-gray-400'
                }`}
                title="Secondary Currency USD"
              >
                $ USD
              </button>
            </div>

            <button
              onClick={fetchManagerData}
              className={`p-1.5 rounded-lg border transition ${
                isLight ? 'hover:bg-slate-100 border-slate-200 text-slate-600' : 'hover:bg-[#20273c] border-[#29324a] text-gray-300'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-sky-400' : ''}`} />
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

        {/* Right Info & Actions */}
        <div className="flex items-center justify-between sm:justify-end space-x-2 sm:space-x-3 w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-t-0 border-[#252c40]/30">
          {/* Desktop Currency Switcher Pill: INR is Default */}
          <div className={`hidden sm:flex items-center p-1 rounded-xl border text-xs font-black ${
            isLight ? 'bg-slate-100 border-slate-300' : 'bg-[#121622] border-[#283248]'
          }`}>
            <span className="text-[10px] text-gray-400 px-2 uppercase font-bold">Currency:</span>
            <button
              onClick={() => setDisplayCurrency('INR')}
              className={`px-2.5 py-1 rounded-lg transition font-mono ${
                displayCurrency === 'INR' ? 'bg-sky-500 text-black shadow-sm font-black' : 'text-gray-400 hover:text-white'
              }`}
            >
              ₹ INR (Primary)
            </button>
            <button
              onClick={() => setDisplayCurrency('USD')}
              className={`px-2.5 py-1 rounded-lg transition font-mono ${
                displayCurrency === 'USD' ? 'bg-sky-500 text-black shadow-sm font-black' : 'text-gray-400 hover:text-white'
              }`}
            >
              $ USD
            </button>
          </div>

          {/* Manager ID pill */}
          <div className={`hidden md:flex items-center space-x-2 border px-3 py-1.5 rounded-xl text-xs font-semibold ${
            isLight ? 'bg-slate-100 border-slate-200 text-slate-700' : 'bg-[#1b2132] border-[#29324a] text-gray-300'
          }`}>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{managerProfile.name}</span>
            <span className="text-[10px] font-bold text-sky-400">({managerProfile.role})</span>
          </div>

          <button
            onClick={() => window.open('/', '_blank')}
            title="Open Live Trading Floor in New Tab"
            className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 border border-emerald-500/30 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition shadow-sm"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Live Floor</span>
          </button>

          <button
            onClick={fetchManagerData}
            title="Refresh Manager Data"
            className={`hidden sm:block p-2 rounded-xl border transition ${
              isLight ? 'hover:bg-slate-100 border-slate-200 text-slate-600' : 'hover:bg-[#20273c] border-[#29324a] text-gray-300'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-sky-400' : ''}`} />
          </button>

          <button
            onClick={handleLogout}
            title="Log Out of Manager Desk"
            className="hidden sm:flex items-center space-x-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-xl text-xs font-bold transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Unified Touch-Scrollable Workspace Container */}
      <div className="flex-1 overflow-y-auto min-h-0 flex flex-col overscroll-y-contain touch-pan-y" style={{ WebkitOverflowScrolling: 'touch' }}>
        {/* Overview Stat Banner - Responsive INR Primary View */}
        <div className={`border-b p-3 sm:px-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 shrink-0 ${
          isLight ? 'bg-white border-slate-200' : 'bg-[#131622] border-[#222838]'
        }`}>
        {/* Card 1: Pending Deposits */}
        <div className={`p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border ${
          overview?.pendingDeposits && overview.pendingDeposits > 0
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            : isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#181c2b] border-[#252c40]'
        }`}>
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-[10px] sm:text-xs">Pending Deposits</span>
            <ArrowDownCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          </div>
          <div className="text-lg sm:text-2xl font-black mt-1 mono-num">
            {overview?.pendingDeposits || 0}
          </div>
          <div className="text-[9px] sm:text-[10px] opacity-80 mt-0.5 truncate">Need verification</div>
        </div>

        {/* Card 2: Pending Payouts */}
        <div className={`p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border ${
          overview?.pendingWithdrawals && overview.pendingWithdrawals > 0
            ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            : isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#181c2b] border-[#252c40]'
        }`}>
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-[10px] sm:text-xs">Pending Payouts</span>
            <ArrowUpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          </div>
          <div className="text-lg sm:text-2xl font-black mt-1 mono-num">
            {overview?.pendingWithdrawals || 0}
          </div>
          <div className="text-[9px] sm:text-[10px] opacity-80 mt-0.5 truncate">Awaiting clearance</div>
        </div>

        {/* Card 3: Settled Inflow (INR Primary) */}
        <div className={`p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border ${
          isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-[#181c2b] border-[#252c40] text-gray-200'
        }`}>
          <div className="flex items-center justify-between text-xs font-bold text-gray-400">
            <span className="text-[10px] sm:text-xs">Approved Deposits</span>
            <ArrowDownLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />
          </div>
          <div className="text-base sm:text-2xl font-black mt-1 mono-num text-emerald-400 truncate">
            {formatMoney(overview?.totalApprovedDepositsUSD || 0).primary}
          </div>
          <div className="text-[9px] sm:text-[10px] text-gray-400 mt-0.5 truncate">
            {formatMoney(overview?.totalApprovedDepositsUSD || 0).secondary}
          </div>
        </div>

        {/* Card 4: Pending Volume */}
        <div className={`p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border ${
          isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-[#181c2b] border-[#252c40] text-gray-200'
        }`}>
          <div className="flex items-center justify-between text-xs font-bold text-gray-400">
            <span className="text-[10px] sm:text-xs">Pending Volume</span>
            <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0" />
          </div>
          <div className="text-base sm:text-2xl font-black mt-1 mono-num text-amber-400 truncate">
            {formatMoney(overview?.totalPendingAmountUSD || 0).primary}
          </div>
          <div className="text-[9px] sm:text-[10px] text-gray-400 mt-0.5 truncate">
            {formatMoney(overview?.totalPendingAmountUSD || 0).secondary}
          </div>
        </div>

        {/* Card 5: Active Traders */}
        <div className={`p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border ${
          isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-[#181c2b] border-[#252c40] text-gray-200'
        }`}>
          <div className="flex items-center justify-between text-xs font-bold text-gray-400">
            <span className="text-[10px] sm:text-xs">Active Traders</span>
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-400 shrink-0" />
          </div>
          <div className="text-lg sm:text-2xl font-black mt-1 mono-num text-sky-400">
            {overview?.totalActiveUsers || 0}
          </div>
          <div className="text-[9px] sm:text-[10px] text-gray-400 mt-0.5 truncate">Platform accounts</div>
        </div>

        {/* Card 6: KYC Verified Traders */}
        <div className={`p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border ${
          isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-[#181c2b] border-[#252c40] text-gray-200'
        }`}>
          <div className="flex items-center justify-between text-xs font-bold text-gray-400">
            <span className="text-[10px] sm:text-xs">KYC Verified</span>
            <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />
          </div>
          <div className="text-lg sm:text-2xl font-black mt-1 mono-num text-emerald-400">
            {overview?.verifiedUsersCount || 0}
          </div>
          <div className="text-[9px] sm:text-[10px] text-gray-400 mt-0.5 truncate">Identity approved</div>
        </div>
      </div>

      {/* Tabs Navigation - Mobile Horizontally Scrollable */}
      <div className={`border-b px-3 sm:px-6 flex space-x-1.5 sm:space-x-4 overflow-x-auto scrollbar-none flex-nowrap ${
        isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#131724] border-[#222838]'
      }`}>
        {[
          { id: 'CASHIER', shortLabel: `Cashier (${pendingCount})`, label: 'Cashier Queue', icon: CreditCard, badge: pendingCount },
          { id: 'TRADERS', shortLabel: `Traders (${safeUsers.filter(u => !u.role || u.role === 'TRADER').length})`, label: 'Traders & KYC', icon: Users, badge: safeUsers.filter(u => !u.role || u.role === 'TRADER').length },
          { id: 'TRADES', shortLabel: 'Trades', label: 'Live Trades Desk', icon: Activity },
          { id: 'RISK', shortLabel: 'Risk', label: 'Quotex Risk Engine', icon: ShieldCheck, badge: riskSettings.enabled ? `${riskSettings.targetWinRate}%` : 'OFF' },
          { id: 'COUPONS', shortLabel: `Promos (${safeCoupons.length})`, label: 'Special Promo Codes', icon: Tag, badge: safeCoupons.length },
          { id: 'AUDIT', shortLabel: 'Audit', label: 'Audit Log', icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2.5 sm:py-3 px-2 sm:px-3 text-[11px] sm:text-xs font-black uppercase tracking-wider flex items-center space-x-1.5 border-b-2 whitespace-nowrap flex-shrink-0 transition ${
                isActive
                  ? 'border-sky-500 text-sky-400'
                  : isLight ? 'border-transparent text-slate-500 hover:text-slate-800' : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="sm:hidden">{tab.shortLabel}</span>
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.badge !== undefined && tab.badge !== '' && tab.badge !== 0 && (
                <span className="hidden sm:inline-block bg-sky-500/20 text-sky-400 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-36">
        {/* ================= TAB 1: CASHIER QUEUE ================= */}
        {activeTab === 'CASHIER' && (
          <div className="space-y-4">
            {/* Active Receiving Bank & UPI Details Card */}
            <div className={`p-4 sm:p-5 rounded-2xl border transition shadow-lg ${
              isLight ? 'bg-white border-slate-200' : 'bg-[#181c2b] border-[#252c40]'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-400 to-emerald-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-sky-500/20">
                    <Building2 className="w-5 h-5 text-slate-950" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className={`text-sm font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        Active Client Deposit Receiving Accounts
                      </h3>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30">
                        ● LIVE ON CASHIER
                      </span>
                    </div>
                    <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                      Dynamic Bank Account & UPI ID displayed to all traders when making deposits.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={openEditPaymentModal}
                  className="px-4 py-2 bg-gradient-to-r from-sky-500 to-emerald-500 hover:from-sky-400 hover:to-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition flex items-center space-x-1.5 self-start sm:self-auto"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Bank & UPI Details</span>
                </button>
              </div>

              {paymentSettings && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-xs">
                  <div className={`p-2.5 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#141824] border-[#252c40]'}`}>
                    <span className="text-[10px] font-bold text-gray-400 block uppercase">Bank Name</span>
                    <span className={`font-black mt-0.5 block truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      {paymentSettings.bankName}
                    </span>
                  </div>
                  <div className={`p-2.5 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#141824] border-[#252c40]'}`}>
                    <span className="text-[10px] font-bold text-gray-400 block uppercase">Account Number</span>
                    <span className="font-mono font-black text-emerald-400 mt-0.5 block truncate">
                      {paymentSettings.accountNumber}
                    </span>
                  </div>
                  <div className={`p-2.5 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#141824] border-[#252c40]'}`}>
                    <span className="text-[10px] font-bold text-gray-400 block uppercase">IFSC Code</span>
                    <span className="font-mono font-black text-sky-400 mt-0.5 block truncate">
                      {paymentSettings.ifscCode}
                    </span>
                  </div>
                  <div className={`p-2.5 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#141824] border-[#252c40]'}`}>
                    <span className="text-[10px] font-bold text-gray-400 block uppercase">Official UPI ID</span>
                    <span className="font-mono font-bold text-amber-400 mt-0.5 block truncate">
                      {paymentSettings.upiId}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
                {(['PENDING', 'ALL', 'DEPOSIT', 'WITHDRAWAL', 'APPROVED', 'REJECTED'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setTxnFilter(f)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                      txnFilter === f
                        ? 'bg-sky-500/20 text-sky-400 border-sky-500/40 shadow-sm'
                        : isLight
                        ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                        : 'bg-[#181c2b] border-[#252c40] text-gray-400 hover:text-white'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              <div className="relative min-w-[260px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={txnSearch}
                  onChange={(e) => setTxnSearch(e.target.value)}
                  placeholder="Search user, UTR or Txn ID..."
                  className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs border focus:outline-none transition ${
                    isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#181c2b] border-[#252c40] text-white focus:border-sky-500'
                  }`}
                />
              </div>
            </div>

            {/* Transaction Cards List */}
            {filteredTransactions.length === 0 ? (
              <div className={`p-12 text-center rounded-2xl border ${
                isLight ? 'bg-white border-slate-200 text-slate-500' : 'bg-[#141824] border-[#252c40] text-gray-400'
              }`}>
                <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400 mb-2 opacity-80" />
                <div className="font-bold text-sm">No transactions match your filter</div>
                <div className="text-xs text-gray-500 mt-1">Pending deposits & withdrawals will appear here automatically.</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {filteredTransactions.map((tx) => {
                  const isDeposit = tx.type === 'DEPOSIT';
                  const isPending = tx.status === 'PENDING';

                  return (
                    <div
                      key={tx.id}
                      className={`p-4 rounded-2xl border transition flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                        isPending
                          ? (isLight ? 'bg-white border-amber-300 shadow-md' : 'bg-[#161a29] border-amber-500/40 shadow-lg')
                          : (isLight ? 'bg-white border-slate-200' : 'bg-[#141824] border-[#222838]')
                      }`}
                    >
                      {/* Left: User & Type Info */}
                      <div className="flex items-start space-x-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold ${
                          isDeposit ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
                        }`}>
                          {isDeposit ? <ArrowDownCircle className="w-5 h-5" /> : <ArrowUpCircle className="w-5 h-5" />}
                        </div>

                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-black text-sm">{tx.userName}</span>
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                              isDeposit ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
                            }`}>
                              {tx.type}
                            </span>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                              tx.status === 'APPROVED'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : tx.status === 'REJECTED'
                                ? 'bg-rose-500/20 text-rose-400'
                                : 'bg-amber-500/20 text-amber-400 animate-pulse'
                            }`}>
                              {tx.status}
                            </span>
                          </div>

                          <div className={`text-xs mt-1 ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                            Method: <span className="font-medium text-gray-200">{tx.method}</span>
                          </div>

                          {/* UTR Reference if available */}
                          {tx.utrNumber && (
                            <div className="flex items-center space-x-2 mt-1.5">
                              <span className="text-[11px] font-mono text-gray-400">UTR:</span>
                              <span className="text-[11px] font-mono font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                                {tx.utrNumber}
                              </span>
                              <button
                                onClick={() => handleCopy(tx.utrNumber!, tx.id)}
                                title="Copy UTR to Clipboard"
                                className="p-1 hover:text-white text-gray-400"
                              >
                                {copiedUtr === tx.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          )}

                          {tx.rejectReason && (
                            <div className="text-[11px] text-rose-400 mt-1 font-semibold">
                              ⚠️ Rejection Reason: {tx.rejectReason}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Amount & Actions */}
                      <div className="flex items-center justify-between md:justify-end space-x-4 border-t md:border-t-0 pt-3 md:pt-0">
                        {/* Attached Screenshot Button */}
                        {tx.proofImage && tx.proofImage !== 'proof_attached.png' ? (
                          <button
                            onClick={() => openManagerProofModal(tx)}
                            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-sky-500/30 bg-sky-500/10 text-sky-400 text-xs font-bold hover:bg-sky-500/20 transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Proof Slip</span>
                          </button>
                        ) : tx.utrNumber ? (
                          <button
                            onClick={() => openManagerProofModal(tx)}
                            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs font-bold hover:bg-amber-500/20 transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Verify UTR</span>
                          </button>
                        ) : null}

                        {/* Amount - Primary INR */}
                        <div className="text-right">
                          {(() => {
                            const amtFmt = formatTxnAmount(tx.amount, tx.currency);
                            return (
                              <>
                                <div className={`text-base sm:text-lg font-black mono-num ${
                                  isDeposit ? 'text-emerald-400' : 'text-rose-400'
                                }`}>
                                  {isDeposit ? '+' : '-'}{amtFmt.primary}
                                </div>
                                <div className="text-[10px] text-gray-400 font-mono">
                                  ({amtFmt.secondary})
                                </div>
                              </>
                            );
                          })()}
                        </div>

                        {/* Approve & Reject Buttons */}
                        {isPending ? (
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleApproveTransaction(tx.id)}
                              className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition active:scale-95 flex items-center space-x-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => handleRejectTransaction(tx.id)}
                              className="px-3 py-2 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 font-bold text-xs rounded-xl transition active:scale-95"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <div className="text-[11px] text-gray-500 font-mono">
                            Resolved
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 2: TRADERS & KYC ================= */}
        {activeTab === 'TRADERS' && (
          <div className="space-y-4">
            {/* Search Input & Create Client Action */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search trader by name, email, phone or ID..."
                  className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs border focus:outline-none transition ${
                    isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#181c2b] border-[#252c40] text-white focus:border-sky-500'
                  }`}
                />
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => {
                    setCreatedClientSlip(null);
                    setCreateClientError(null);
                    setNewClientName('');
                    setNewClientEmail('');
                    setNewClientPhone('');
                    generatePassword();
                    setIsCreateClientModalOpen(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-[#00c679] hover:bg-[#00e089] text-slate-950 font-black text-xs flex items-center space-x-1.5 shadow-lg shadow-emerald-500/20 active:scale-95 transition"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>➕ Create Client Account</span>
                </button>

                <div className="text-xs text-gray-400 hidden sm:block">
                  Total: <span className="font-bold text-white">{filteredUsers.length}</span>
                </div>

                {/* View Toggle */}
                <div className={`hidden sm:flex items-center p-0.5 rounded-xl border ${
                  isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#121622] border-[#22283a]'
                }`}>
                  <button
                    type="button"
                    onClick={() => setTraderViewMode('TABLE')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                      traderViewMode === 'TABLE'
                        ? 'bg-sky-500 text-slate-950 font-black shadow-sm'
                        : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Table
                  </button>
                  <button
                    type="button"
                    onClick={() => setTraderViewMode('CARDS')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                      traderViewMode === 'CARDS'
                        ? 'bg-sky-500 text-slate-950 font-black shadow-sm'
                        : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Cards
                  </button>
                </div>
              </div>
            </div>

            {/* Traders Grid (Cards View) */}
            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 ${traderViewMode === 'TABLE' ? 'sm:hidden' : ''}`}>
              {filteredUsers.map((u) => {
                const isFrozen = u.status === 'FROZEN';

                return (
                  <div
                    key={u.id}
                    className={`p-4 rounded-2xl border transition flex flex-col justify-between space-y-3 ${
                      isFrozen
                        ? 'bg-rose-950/20 border-rose-500/30'
                        : isLight ? 'bg-white border-slate-200' : 'bg-[#151926] border-[#252c40]'
                    }`}
                  >
                    <div>
                      {/* Name & Role Header */}
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-black text-sm flex items-center space-x-1.5">
                            <span>{u.name}</span>
                            {u.id === 'usr_quotex_vip_99' && (
                              <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30">
                                TEST SANDBOX
                              </span>
                            )}
                            <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-500 border border-amber-500/30">
                              {u.vipLevel}
                            </span>
                          </div>
                          <div className={`text-xs truncate ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                            {u.email}
                          </div>
                          {u.phone && (
                            <div className="text-[11px] text-emerald-400 font-mono mt-0.5 flex items-center space-x-1">
                              <Phone className="w-3 h-3 shrink-0" />
                              <span>{u.phone}</span>
                            </div>
                          )}
                          <div className="text-[10px] font-mono text-gray-500 mt-0.5">
                            ID: {u.id}
                          </div>
                        </div>

                        {/* Status Badges */}
                        <div className="flex flex-col items-end space-y-1">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center space-x-1 ${
                            u.isKycVerified ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
                          }`}>
                            <ShieldCheck className="w-3 h-3" />
                            <span>{u.isKycVerified ? 'Verified' : 'Pending KYC'}</span>
                          </span>

                          <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded ${
                            isFrozen ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'
                          }`}>
                            {u.status}
                          </span>
                        </div>
                      </div>

                      {/* Balances */}
                      <div className={`mt-3 p-2.5 rounded-xl border grid grid-cols-2 gap-2 text-xs ${
                        isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#10131f] border-[#20273a]'
                      }`}>
                        {(() => {
                          const realFmt = formatUserBal(u.realBalance, u.currency);
                          const demoFmt = formatUserBal(u.demoBalance, u.currency);
                          return (
                            <>
                              <div>
                                <span className="text-[10px] text-gray-400 block font-bold">Live Real Balance</span>
                                <div className="font-black text-sm mono-num text-emerald-400 mt-0.5">
                                  {realFmt.primary}
                                </div>
                                <div className="text-[9px] text-gray-500 font-mono">
                                  ({realFmt.secondary})
                                </div>
                              </div>
                              <div>
                                <span className="text-[10px] text-gray-400 block font-bold">Demo Practice</span>
                                <div className="font-bold text-xs mono-num text-amber-400 mt-0.5">
                                  {demoFmt.primary}
                                </div>
                                <div className="text-[9px] text-gray-500 font-mono">
                                  ({demoFmt.secondary})
                                </div>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Manager Operations */}
                    <div className="pt-2 border-t border-white/5 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        {/* KYC Toggle */}
                        <button
                          onClick={() => handleToggleKyc(u.id, u.isKycVerified)}
                          className={`flex-1 py-1.5 px-2 rounded-xl text-[11px] font-bold border transition ${
                            u.isKycVerified
                              ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30'
                              : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          }`}
                        >
                          {u.isKycVerified ? 'Revoke KYC' : 'Verify KYC'}
                        </button>

                        {/* Reset Demo */}
                        <button
                          onClick={() => handleResetDemo(u.id)}
                          title="Reset Demo to ₹7,00,000"
                          className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition ${
                            isLight ? 'hover:bg-slate-100 border-slate-200 text-slate-700' : 'hover:bg-white/10 border-white/10 text-gray-300'
                          }`}
                        >
                          Reset Demo
                        </button>

                        {/* Freeze/Unfreeze Account */}
                        <button
                          onClick={() => handleToggleUserStatus(u.id, u.status)}
                          className={`p-1.5 rounded-xl border transition ${
                            isFrozen
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                              : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30'
                          }`}
                          title={isFrozen ? 'Unfreeze Account' : 'Freeze Account'}
                        >
                          {isFrozen ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      {/* Review Aadhaar KYC Documents if pending */}
                      {u.kycStatus === 'PENDING' && (
                        <button
                          type="button"
                          onClick={() => setSelectedTraderForKyc(u)}
                          className="w-full py-1.5 px-3 rounded-xl text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition flex items-center justify-center space-x-1.5"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                          <span>Review Aadhaar Documents</span>
                        </button>
                      )}

                      {/* Direct Edit Funds & Individual Risk Buttons */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => openDirectBalanceModal(u)}
                          className="py-1.5 px-3 rounded-xl text-xs font-bold border border-emerald-500/30 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 transition flex items-center justify-center space-x-1.5 shadow-sm"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit Funds</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => openIndividualRiskModal(u)}
                          className={`py-1.5 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center space-x-1.5 shadow-sm ${
                            u.customRiskSettings?.enabled
                              ? 'border-amber-500/50 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                              : isLight
                              ? 'border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700'
                              : 'border-[#2d3850] bg-[#1a2132] hover:bg-[#222b40] text-gray-300'
                          }`}
                        >
                          <Sliders className="w-3.5 h-3.5" />
                          <span>
                            {u.customRiskSettings?.enabled
                              ? `Risk: ${u.customRiskSettings.targetWinRate}%`
                              : 'Individual Risk'}
                          </span>
                        </button>
                      </div>

                      {/* Trade History: View & Delete Particular Trades */}
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => handleViewUserTrades(u)}
                          className="w-full py-1.5 px-3 rounded-xl text-xs font-bold border border-sky-500/30 bg-sky-500/15 hover:bg-sky-500/25 text-sky-400 transition flex items-center justify-center space-x-1.5 shadow-sm"
                          title="View and delete particular trades for this trader"
                        >
                          <Activity className="w-3.5 h-3.5" />
                          <span>View & Delete Trades ({u.totalTrades || 0})</span>
                        </button>
                      </div>

                      {/* Password Reset Action (Only Admin can delete users; Managers can reset passwords) */}
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedUserForPasswordReset(u);
                            setResetPasswordValue('');
                            setResetPasswordSuccess(null);
                          }}
                          className="w-full py-1.5 px-3 rounded-xl text-xs font-bold border border-amber-500/30 bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 transition flex items-center justify-center space-x-1.5 shadow-sm"
                          title="Reset Trader Password"
                        >
                          <Key className="w-3.5 h-3.5" />
                          <span>Reset Password</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Traders Table (Shown in TABLE mode on sm+ screens) */}
            {traderViewMode === 'TABLE' && (
              <div className={`hidden sm:block border rounded-3xl overflow-x-auto shadow-xl transition-colors ${
                isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#161a26] border-[#262c3e]'
              }`}>
                <table className="w-full text-left text-xs min-w-[900px]">
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
                      <th className="py-3.5 px-4 text-right">Manager Actions</th>
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
                            {u.phone && <div className="text-[10px] text-emerald-400 font-mono">{u.phone}</div>}
                            <div className={`text-[10px] font-mono ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>{u.id}</div>
                          </td>
                          <td className="py-3.5 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-500/20 text-amber-500 border border-amber-500/30">
                              {u.vipLevel}
                            </span>
                          </td>
                          <td className="py-3.5 px-3">
                            {u.isKycVerified ? (
                              <span className="text-emerald-500 font-bold flex items-center space-x-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Verified</span>
                              </span>
                            ) : (
                              <span className="text-amber-500 font-bold flex items-center space-x-1">
                                <ShieldCheck className="w-3.5 h-3.5" />
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
                          <td className={`py-3.5 px-3 font-bold mono-num ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>
                            {u.totalTrades || 0}
                          </td>
                          <td className="py-3.5 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              u.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'
                            }`}>
                              {u.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                            {u.kycStatus === 'PENDING' && (
                              <button
                                onClick={() => setSelectedTraderForKyc(u)}
                                className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-black transition"
                              >
                                Review Aadhaar
                              </button>
                            )}
                            <button
                              onClick={() => openDirectBalanceModal(u)}
                              className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-xs font-bold transition"
                              title="Direct Balance Edit"
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
                            >
                              {u.customRiskSettings?.enabled ? `Risk: ${u.customRiskSettings.targetWinRate}%` : 'Risk'}
                            </button>
                            <button
                              onClick={() => handleViewUserTrades(u)}
                              className="px-2.5 py-1 bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 rounded-lg text-xs font-bold transition"
                              title="Inspect and delete particular trades"
                            >
                              Trades ({u.totalTrades || 0})
                            </button>
                            <button
                              onClick={() => {
                                setSelectedUserForPasswordReset(u);
                                setResetPasswordValue('');
                                setResetPasswordSuccess(null);
                              }}
                              className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg text-xs font-bold transition inline-flex items-center space-x-1"
                              title="Reset Trader Password"
                            >
                              <Key className="w-3 h-3" />
                              <span>Pass</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 3: LIVE TRADES MONITOR ================= */}
        {activeTab === 'TRADES' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-white flex items-center space-x-2">
                  <span>Live Trading Desk Stream</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                </h3>
                <p className="text-xs text-gray-400">
                  Read-only operational monitoring of open & settled contracts across all platform traders
                </p>
              </div>
              <div className="text-xs font-mono text-gray-400">
                Latest 100 contracts
              </div>
            </div>

            <div className={`rounded-2xl border overflow-hidden ${
              isLight ? 'bg-white border-slate-200' : 'bg-[#141824] border-[#222838]'
            }`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className={`border-b text-[10px] font-black uppercase tracking-wider ${
                      isLight ? 'bg-slate-100 border-slate-200 text-slate-600' : 'bg-[#181c2b] border-[#252c40] text-gray-400'
                    }`}>
                      <th className="py-3 px-4">Trader</th>
                      <th className="py-3 px-4">Asset</th>
                      <th className="py-3 px-4">Direction</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Entry</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Profit / Payout</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono">
                    {safeLiveTrades.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-gray-500">
                          No active trades on the floor right now.
                        </td>
                      </tr>
                    ) : (
                      safeLiveTrades.map((t) => {
                        const isUp = t.direction === 'UP';
                        const isWon = t.status === 'WON';
                        const isOpen = t.status === 'OPEN';
                        const tradeCurrency = (t as any).currency || 'INR';
                        const amtFmt = formatTxnAmount(t.amount, tradeCurrency);
                        const profitAmt = formatTxnAmount(Math.abs(t.profit || 0), tradeCurrency);

                        return (
                          <tr key={t.id} className="hover:bg-white/5 transition">
                            <td className="py-3 px-4 font-sans font-bold text-gray-200">
                              {t.userName || 'Trader'}
                            </td>
                            <td className="py-3 px-4 font-bold text-gray-300">
                              {t.assetId.toUpperCase()}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded font-black text-[10px] ${
                                isUp ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                              }`}>
                                {t.direction} ({isUp ? 'CALL' : 'PUT'})
                              </span>
                            </td>
                            <td className="py-3 px-4 font-bold">
                              <span className="font-mono text-xs font-black text-white">{amtFmt.primary}</span>
                              <span className="text-[10px] text-gray-400 block font-mono">({amtFmt.secondary})</span>
                            </td>
                            <td className="py-3 px-4 text-gray-400">
                              {t.entryPrice.toFixed(4)}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded font-black text-[10px] ${
                                isOpen
                                  ? 'bg-sky-500/20 text-sky-400 animate-pulse'
                                  : isWon
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : 'bg-rose-500/20 text-rose-400'
                              }`}>
                                {t.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-black">
                              {isOpen ? (
                                <span className="text-gray-400 font-mono text-xs">In Play...</span>
                              ) : isWon ? (
                                <div>
                                  <span className="text-emerald-400 font-mono text-xs font-black">+{profitAmt.primary}</span>
                                  <span className="text-[10px] text-emerald-500/70 block font-mono">(+{profitAmt.secondary})</span>
                                </div>
                              ) : (
                                <div>
                                  <span className="text-rose-400 font-mono text-xs font-black">-{amtFmt.primary}</span>
                                  <span className="text-[10px] text-rose-500/70 block font-mono">(-{amtFmt.secondary})</span>
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end space-x-1.5">
                                <button
                                  onClick={() => {
                                    const u = safeUsers.find((x) => x.id === t.userId);
                                    if (u) handleViewUserTrades(u);
                                  }}
                                  className="px-2 py-1 text-[11px] font-bold rounded-lg bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 transition"
                                  title="Inspect trader trades"
                                >
                                  History
                                </button>
                                <button
                                  onClick={() => handleDeleteTrade(t.id)}
                                  className="p-1 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                                  title="Delete this particular trade"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
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
        )}


        {/* ================= TAB 4: AUDIT LOG ================= */}
        {activeTab === 'AUDIT' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-black text-white">Manager Action Trail & Compliance Log</h3>
              <p className="text-xs text-gray-400">
                Transparent tamper-evident log of all operations performed by managers and admins
              </p>
            </div>

            <div className={`rounded-2xl border divide-y divide-white/5 ${
              isLight ? 'bg-white border-slate-200' : 'bg-[#141824] border-[#222838]'
            }`}>
              {safeAuditLogs.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-xs">
                  No operations recorded yet. Actions taken on the cashier and trader desks will appear here.
                </div>
              ) : (
                safeAuditLogs.map((log) => (
                  <div key={log.id} className="p-3.5 sm:px-4 flex items-start justify-between text-xs hover:bg-white/5 transition">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-black text-sky-400">{log.actorName}</span>
                        <span className="text-[9px] font-bold bg-sky-500/10 text-sky-400 px-1.5 py-0.2 rounded border border-sky-500/20">
                          {log.actorRole}
                        </span>
                        <span className="font-mono font-bold text-gray-200 bg-white/5 px-1.5 py-0.2 rounded">
                          {log.action}
                        </span>
                      </div>
                      <div className="text-gray-300">
                        Target: <span className="font-semibold text-white">{log.targetName || log.targetId || 'N/A'}</span>
                        {log.details && <span className="text-gray-400 ml-2">({log.details})</span>}
                      </div>
                    </div>

                    <div className="text-[10px] font-mono text-gray-500 shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ================= TAB: QUOTEX RISK & WIN-RATE ENGINE ================= */}
        {activeTab === 'RISK' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Header Banner */}
            <div className={`p-6 rounded-3xl border shadow-sm transition-colors relative overflow-hidden ${
              isLight ? 'bg-gradient-to-r from-sky-50 via-teal-50 to-white border-sky-200' : 'bg-gradient-to-r from-[#141d28] via-[#101924] to-[#121620] border-sky-500/20'
            }`}>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2">
                    <span className="bg-sky-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Quotex Risk Controller
                    </span>
                    <span className="text-xs font-semibold text-emerald-400 flex items-center space-x-1">
                      <Zap className="w-3.5 h-3.5" />
                      <span>Hairline Sniping Active (1-2 pips)</span>
                    </span>
                  </div>
                  <h2 className={`text-xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    Quotex OTC House Edge & Win-Rate Controller
                  </h2>
                  <p className={`text-xs max-w-2xl ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>
                    Operations Desk probability controller. Configured to match Quotex OTC market retention: retail traders win approximately <span className="font-bold text-sky-400">2 out of 10 trades (20% win-rate)</span> and lose 8 out of 10 trades.
                  </p>
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => handleSaveRiskSettings({ enabled: !riskSettings.enabled })}
                    className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 transition shadow-md ${
                      riskSettings.enabled
                        ? 'bg-rose-500 hover:bg-rose-400 text-white'
                        : 'bg-sky-500 hover:bg-sky-400 text-slate-950'
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
                      <div className="text-3xl font-black mono-num text-sky-400">
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
                      className="w-full h-2.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
                    />
                    <div className="flex justify-between text-[10px] text-gray-500 font-bold px-1">
                      <span>5% (95% House Edge)</span>
                      <span className="text-sky-400 font-extrabold">20% (Quotex Standard)</span>
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
                            ? 'border-sky-500 bg-sky-500/10 text-sky-400 ring-1 ring-sky-500'
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
                            ? 'border-sky-500 bg-sky-500/10 ring-1 ring-sky-500'
                            : (isLight ? 'border-slate-200 bg-slate-50 hover:bg-slate-100' : 'border-[#262c3e] bg-[#121620] hover:border-gray-600')
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-xs font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>
                            {item.title}
                          </span>
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400">
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
                        riskSettings.microPipSniping ? 'bg-sky-500 justify-end' : 'bg-slate-700 justify-start'
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
                          : 'bg-sky-500/20 border-sky-500 text-sky-400'
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
                    <span className="text-xs font-bold text-sky-400 flex items-center space-x-1 animate-in fade-in">
                      <Check className="w-4 h-4" />
                      <span>Changes Saved Live!</span>
                    </span>
                  )}
                  <button
                    onClick={() => handleSaveRiskSettings(riskSettings)}
                    disabled={isSavingRisk}
                    className={`px-6 py-3 font-black text-xs rounded-xl shadow-lg transition flex items-center space-x-2 ${
                      isRiskDirty
                        ? 'bg-gradient-to-r from-sky-400 to-emerald-400 text-slate-950 ring-2 ring-sky-400 shadow-sky-500/30 animate-pulse'
                        : 'bg-sky-500 hover:bg-sky-400 text-slate-950 shadow-sky-500/20'
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
                      <span className="font-mono font-bold text-sky-400">{riskSettings.targetWinRate}%</span>
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
                      <span className={`font-mono font-bold ${riskSettings.microPipSniping ? 'text-sky-400' : 'text-gray-500'}`}>
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
                  isLight ? 'bg-sky-50/50 border-sky-200' : 'bg-sky-950/20 border-sky-500/20'
                }`}>
                  <div className="flex items-center space-x-2 text-sky-400">
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
              {/* ================= TAB: SPECIAL PROMO CODES ================= */}
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
                      onClick={() => handleToggleCoupon(cpn.id, cpn.isActive)}
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
      </main>
      </div>

      {/* Proof Image & UTR Verification Modal */}
      {(selectedProofTx || selectedProofImg) && (
        <div
          onClick={() => { setSelectedProofImg(null); setSelectedProofTx(null); setManagerProofImgError(false); }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`max-w-xl w-full rounded-3xl p-5 border flex flex-col space-y-4 shadow-2xl ${
              isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#161a29] border-[#252c40] text-white'
            }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div>
                <span className="text-xs font-black uppercase tracking-wider block">Payment Slip & UTR Verification</span>
                {selectedProofTx && (
                  <p className="text-[11px] text-gray-400 font-medium">
                    {selectedProofTx.userName} · {selectedProofTx.paymentRail || 'UPI'}
                  </p>
                )}
              </div>
              <button
                onClick={() => { setSelectedProofImg(null); setSelectedProofTx(null); setManagerProofImgError(false); }}
                className="p-1 hover:text-white text-gray-400 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {selectedProofTx?.utrNumber && (
              <div className="flex items-center justify-between bg-sky-500/10 border border-sky-500/30 p-3 rounded-2xl">
                <div>
                  <span className="text-[9px] font-black uppercase text-sky-400 tracking-wider block">UTR Reference Number</span>
                  <span className="text-xs font-mono font-black text-sky-300 select-all">{selectedProofTx.utrNumber}</span>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(selectedProofTx.utrNumber || '');
                    setCopiedUtr(selectedProofTx.utrNumber || '');
                    setTimeout(() => setCopiedUtr(null), 2000);
                  }}
                  className="px-2.5 py-1 text-xs font-bold bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 rounded-lg transition"
                >
                  {copiedUtr === selectedProofTx.utrNumber ? 'Copied!' : 'Copy UTR'}
                </button>
              </div>
            )}

            <div className="max-h-[55vh] overflow-auto rounded-2xl border border-white/10 flex items-center justify-center bg-black/60 p-2 min-h-[200px]">
              {selectedProofImg && selectedProofImg !== 'proof_attached.png' && !managerProofImgError ? (
                <img
                  src={selectedProofImg}
                  alt="Proof Screenshot"
                  onError={() => setManagerProofImgError(true)}
                  className="max-w-full max-h-[50vh] object-contain rounded-xl shadow-lg"
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center space-y-2 max-w-sm">
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-lg">
                    ⚠️
                  </div>
                  <h4 className="text-sm font-bold text-white">No Screenshot Uploaded by Trader</h4>
                  <p className="text-xs text-gray-400">
                    The trader submitted this deposit using direct UTR reference. Verify the transaction in your bank statement.
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-white/5">
              <span className="text-[11px] text-gray-400 font-medium">Verify UTR before approving</span>
              <button
                onClick={() => { setSelectedProofImg(null); setSelectedProofTx(null); setManagerProofImgError(false); }}
                className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs rounded-xl transition"
              >
                Close Slip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Client Account Modal */}
      {isCreateClientModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className={`w-full max-w-lg rounded-3xl p-6 border shadow-2xl relative max-h-[90vh] overflow-y-auto ${
            isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#141926] border-[#252c40] text-white'
          }`}>
            <button
              onClick={() => {
                setIsCreateClientModalOpen(false);
                setCreatedClientSlip(null);
              }}
              className="absolute top-5 right-5 p-1 rounded-xl text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            {createdClientSlip ? (
              /* Success Slip Card */
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-emerald-400">Client Account Verified & Issued!</h3>
                    <p className="text-xs text-gray-400">Email verified • Share credentials with client</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-black/40 border border-emerald-500/30 space-y-2.5 font-mono text-xs">
                  <div className="text-[11px] text-sky-400 font-sans pb-1">
                    ✉️ Login ID, password & account specifications sent to {createdClientSlip.email}
                  </div>
                  <div className="flex justify-between border-b border-white/10 pb-2 font-sans font-bold">
                    <span className="text-gray-400">Client Name:</span>
                    <span className="text-white">{createdClientSlip.name}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/10 pb-2">
                    <span className="text-gray-400 font-sans">Login ID:</span>
                    <span className="text-sky-400 font-bold">{createdClientSlip.id}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/10 pb-2">
                    <span className="text-gray-400 font-sans">Email ID:</span>
                    <span className="text-emerald-400">{createdClientSlip.email}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/10 pb-2">
                    <span className="text-gray-400 font-sans">Phone Number:</span>
                    <span className="text-emerald-400">{createdClientSlip.phone}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/10 pb-2">
                    <span className="text-gray-400 font-sans">Password:</span>
                    <span className="text-amber-400 font-black">{createdClientSlip.password}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/10 pb-2">
                    <span className="text-gray-400 font-sans">Currency:</span>
                    <span className="text-white">{createdClientSlip.currency}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/10 pb-2">
                    <span className="text-gray-400 font-sans">Demo Balance:</span>
                    <span className="text-white">{createdClientSlip.currency === 'USD' ? '$' : '₹'}{createdClientSlip.demoBalance.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/10 pb-2">
                    <span className="text-gray-400 font-sans">Live Real Balance:</span>
                    <span className="text-emerald-400">{createdClientSlip.currency === 'USD' ? '$' : '₹'}{createdClientSlip.realBalance.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="text-gray-400 font-sans">Terminal URL:</span>
                    <span className="text-sky-400 truncate max-w-[220px]">{createdClientSlip.url}</span>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    onClick={copyCredentialsSlip}
                    className="w-full py-3.5 rounded-2xl bg-[#00c679] hover:bg-[#00e089] text-slate-950 font-black text-xs flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition"
                  >
                    {slipCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{slipCopied ? 'Credentials Copied to Clipboard!' : '📋 Copy Credentials for Client (WhatsApp/Telegram)'}</span>
                  </button>

                  <button
                    onClick={() => {
                      setCreatedClientSlip(null);
                      setCreateClientStep('FORM');
                      setNewClientName('');
                      setNewClientEmail('');
                      setNewClientPhone('');
                      generatePassword();
                    }}
                    className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold transition text-gray-300"
                  >
                    Create Another Client Account
                  </button>
                </div>
              </div>
            ) : createClientStep === 'OTP' ? (
              /* OTP Verification Step */
              <form onSubmit={handleVerifyClientOtpAndCreate} className="space-y-4 py-2">
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                    <Mail className="w-5 h-5" />
                  </div>
                  <h4 className="font-black text-sm text-white">Client Email Verification</h4>
                  <p className="text-xs text-gray-400">
                    A 6-digit security OTP was sent via Brevo Desk to:
                  </p>
                  <div className="font-mono font-bold text-amber-400 bg-black/40 px-3 py-1 rounded-lg inline-block text-xs border border-amber-500/30">
                    {newClientEmail}
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Ask the client for the 6-digit OTP code to verify their identity and issue this trading account.
                  </p>
                </div>

                {clientOtpError && (
                  <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-bold text-center">
                    {clientOtpError}
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold block mb-1 text-center text-gray-300">
                    Enter 6-Digit Email OTP *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    autoFocus
                    placeholder="• • • • • •"
                    value={clientOtpCode}
                    onChange={(e) => setClientOtpCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full tracking-[8px] text-center text-xl font-mono font-black py-3 rounded-xl border focus:outline-none bg-[#0f131d] border-[#252c40] text-emerald-400"
                  />
                  {clientDebugOtp && (
                    <button
                      type="button"
                      onClick={() => setClientOtpCode(clientDebugOtp)}
                      className="text-[11px] text-amber-400 hover:text-amber-300 font-mono underline block mx-auto mt-2"
                    >
                      ⚡ Auto-fill Security Code ({clientDebugOtp})
                    </button>
                  )}
                </div>

                <div className="flex space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCreateClientStep('FORM');
                      setClientOtpError(null);
                    }}
                    className="flex-1 font-bold py-2.5 rounded-xl text-xs transition border bg-[#222838] hover:bg-[#2c3347] text-gray-300 border-[#2e354b]"
                  >
                    ← Edit Details
                  </button>
                  <button
                    type="button"
                    onClick={handleSendClientOtp}
                    disabled={isSendingClientOtp}
                    className="px-3 font-bold py-2.5 rounded-xl text-xs transition border text-amber-400 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20"
                  >
                    {isSendingClientOtp ? 'Resending...' : 'Resend OTP'}
                  </button>
                  <button
                    type="submit"
                    disabled={isVerifyingClientOtp}
                    className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black py-2.5 rounded-xl text-xs shadow-lg transition disabled:opacity-50 flex items-center justify-center space-x-1"
                  >
                    {isVerifyingClientOtp ? <span>Verifying...</span> : <span>✓ Verify & Issue</span>}
                  </button>
                </div>
              </form>
            ) : (
              /* Create Client Form */
              <form onSubmit={handleSendClientOtp} className="space-y-4">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black">Issue Client Trading Account</h3>
                    <p className="text-xs text-gray-400">Generate credentials for clients without public registration</p>
                  </div>
                </div>

                {createClientError && (
                  <div className="bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs p-3 rounded-xl flex items-center space-x-2">
                    <X className="w-4 h-4 shrink-0" />
                    <span>{createClientError}</span>
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold block mb-1 text-gray-300">Client Full Name *</label>
                    <input
                      type="text"
                      required
                      value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                      placeholder="e.g. Ramesh Patel"
                      className={`w-full px-3.5 py-2.5 rounded-xl text-xs border focus:outline-none ${
                        isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-[#0f131d] border-[#252c40] text-white focus:border-emerald-500'
                      }`}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold block mb-1 text-gray-300">Email Address *</label>
                      <input
                        type="email"
                        required
                        value={newClientEmail}
                        onChange={(e) => setNewClientEmail(e.target.value)}
                        placeholder="client@gmail.com"
                        className={`w-full px-3.5 py-2.5 rounded-xl text-xs border focus:outline-none ${
                          isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-[#0f131d] border-[#252c40] text-white focus:border-emerald-500'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold block mb-1 text-gray-300">Phone Number (Login Enabled)</label>
                      <input
                        type="text"
                        value={newClientPhone}
                        onChange={(e) => setNewClientPhone(e.target.value)}
                        placeholder="+91 9180169771"
                        className={`w-full px-3.5 py-2.5 rounded-xl text-xs border focus:outline-none ${
                          isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-[#0f131d] border-[#252c40] text-white focus:border-emerald-500'
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-gray-300">Initial Password *</label>
                      <button
                        type="button"
                        onClick={generatePassword}
                        className="text-[10px] text-emerald-400 hover:underline flex items-center space-x-1"
                      >
                        <Key className="w-3 h-3" />
                        <span>Generate Random</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      value={newClientPassword}
                      onChange={(e) => setNewClientPassword(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold border focus:outline-none ${
                        isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-[#0f131d] border-[#252c40] text-amber-400 focus:border-emerald-500'
                      }`}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[11px] font-bold block mb-1 text-gray-300">Currency</label>
                      <select
                        value={newClientCurrency}
                        onChange={(e) => setNewClientCurrency(e.target.value as CurrencyCode)}
                        className={`w-full px-2 py-2 rounded-xl text-xs font-bold border focus:outline-none ${
                          isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-[#0f131d] border-[#252c40] text-white'
                        }`}
                      >
                        <option value="INR">🇮🇳 INR</option>
                        <option value="USD">🇺🇸 USD</option>
                        <option value="EUR">🇪🇺 EUR</option>
                        <option value="BRL">🇧🇷 BRL</option>
                        <option value="IDR">🇮🇩 IDR</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold block mb-1 text-gray-300">Demo Bal</label>
                      <input
                        type="number"
                        value={newClientDemoBal}
                        onChange={(e) => setNewClientDemoBal(e.target.value)}
                        className={`w-full px-2.5 py-2 rounded-xl text-xs font-mono border focus:outline-none ${
                          isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-[#0f131d] border-[#252c40] text-white'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold block mb-1 text-gray-300">Real Bal</label>
                      <input
                        type="number"
                        value={newClientRealBal}
                        onChange={(e) => {
                          const valStr = e.target.value;
                          setNewClientRealBal(valStr);
                          const num = Number(valStr) || 0;
                          const autoTier: VipLevel = num >= 500000 ? 'VIP' : num >= 100000 ? 'PRO' : 'STANDARD';
                          setNewClientVip(autoTier);
                        }}
                        className={`w-full px-2.5 py-2 rounded-xl text-xs font-mono border focus:outline-none ${
                          isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-[#0f131d] border-[#252c40] text-emerald-400'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-gray-300">VIP Tier</label>
                        <span className="text-[9px] text-amber-400 font-mono">Auto-Tiering</span>
                      </div>
                      <select
                        value={newClientVip}
                        onChange={(e) => setNewClientVip(e.target.value as VipLevel)}
                        className={`w-full px-2 py-2 rounded-xl text-xs font-bold border focus:outline-none ${
                          isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-[#0f131d] border-[#252c40] text-white'
                        }`}
                      >
                        <option value="STANDARD">STANDARD (&lt;1L)</option>
                        <option value="PRO">PRO (≥1L)</option>
                        <option value="VIP">VIP (≥5L)</option>
                      </select>
                      <span className="text-[9px] text-gray-400 block mt-0.5">
                        {newClientVip === 'VIP' ? '👑 VIP: +4% payout bonus' : newClientVip === 'PRO' ? '⚡ PRO: +2% payout bonus' : 'Standard payout rate'}
                      </span>
                    </div>

                    <div className="flex items-center pt-5 pl-2">
                      <label className="flex items-center space-x-2 text-xs font-bold text-gray-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newClientKyc}
                          onChange={(e) => setNewClientKyc(e.target.checked)}
                          className="w-4 h-4 rounded text-emerald-500 focus:ring-0"
                        />
                        <span>Pre-Verify KYC</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSendingClientOtp}
                    className="w-full py-3.5 rounded-2xl bg-[#00c679] hover:bg-[#00e089] disabled:opacity-50 text-slate-950 font-black text-xs flex items-center justify-center space-x-2 shadow-xl shadow-emerald-500/20 active:scale-95 transition"
                  >
                    {isSendingClientOtp ? (
                      <span>Sending Verification Email...</span>
                    ) : (
                      <>
                        <Mail className="w-4 h-4" />
                        <span>Send OTP & Verify Client Email</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ================= MODAL: EDIT RECEIVING BANK & UPI SETTINGS ================= */}
      {isEditPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in">
          <div className={`w-full max-w-xl border rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col transition-colors ${
            isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#181c2b] border-[#252c40] text-white'
          }`}>
            <div className={`flex items-center justify-between pb-3 border-b ${
              isLight ? 'border-slate-200' : 'border-[#252c40]'
            }`}>
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-400 to-emerald-400 flex items-center justify-center text-slate-950 font-black shadow-md">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`font-black text-base ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    Edit Receiving Accounts (Manager Desk)
                  </h3>
                  <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                    Updates the active receiving bank account and UPI ID displayed on client cashier deposits.
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
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#141824] border-[#252c40]'
              }`}>
                <div className="flex items-center space-x-2 text-xs font-black uppercase text-sky-400">
                  <Building2 className="w-4 h-4" />
                  <span>1. Bank Account Transfer Details</span>
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
                        isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#181c2b] border-[#252c40] text-white'
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
                        isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#181c2b] border-[#252c40] text-white'
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
                        isLight ? 'bg-white border-slate-300' : 'bg-[#181c2b] border-[#252c40]'
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
                        isLight ? 'bg-white border-slate-300' : 'bg-[#181c2b] border-[#252c40]'
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
                        isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#181c2b] border-[#252c40] text-white'
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
                        isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#181c2b] border-[#252c40] text-white'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* UPI Details Section */}
              <div className={`p-4 rounded-2xl border space-y-3 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#141824] border-[#252c40]'
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
                        isLight ? 'bg-white border-slate-300' : 'bg-[#181c2b] border-[#252c40]'
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
                        isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#181c2b] border-[#252c40] text-white'
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
                    isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#181c2b] border-[#252c40] text-white'
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
                  Trader: <span className="font-bold text-sky-400">{selectedUserForBalance.name}</span> ({selectedUserForBalance.id})
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
                        ? 'border-sky-500 bg-sky-500/20 text-sky-400 ring-1 ring-sky-500'
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
                        ? 'border-sky-500 bg-sky-500/20 text-sky-400 ring-1 ring-sky-500'
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
                  {[50000, 100000, 700000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setDirectDemoBalance(preset)}
                      className="px-2 py-1 text-[11px] font-bold rounded-lg border border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 transition"
                    >
                      Reset {preset >= 100000 ? `${preset / 100000} Lakh` : `${preset / 1000}k`}
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
                className="flex-1 bg-gradient-to-r from-sky-500 to-teal-500 text-slate-950 font-black py-2.5 rounded-xl text-xs shadow-lg hover:brightness-110 active:scale-95 transition disabled:opacity-50"
              >
                {isSavingBalance ? 'Saving...' : 'Save & Apply Funds Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: MANAGER RESET USER PASSWORD ================= */}
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
                  ⚠️ Resetting will immediately overwrite the trader's credentials. An automated security email will be sent to the trader's inbox.
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
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
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


      {/* ================= MODAL: MANAGER USER TRADE HISTORY & DELETE TRADES ================= */}
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
                      Active Open Trades ({(userTrades?.activeTrades || []).length})
                    </h4>
                    {(userTrades?.activeTrades || []).length === 0 ? (
                      <p className={`text-xs ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>No active trades.</p>
                    ) : (
                      <div className="space-y-2">
                        {(userTrades?.activeTrades || []).map((t) => (
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
                                Amount: {formatTxnAmount(t.amount, selectedUserForTrades.currency || 'INR').primary} · Entry: {t.entryPrice} · Expires: {new Date(t.expiryTime).toLocaleTimeString()}
                              </div>
                            </div>
                            <button
                              onClick={() => handleDeleteTrade(t.id)}
                              className="px-2.5 py-1 rounded-xl text-rose-400 hover:bg-rose-500/20 bg-rose-500/10 border border-rose-500/30 text-xs font-bold flex items-center space-x-1 transition shrink-0"
                              title="Delete this open trade"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Settled Trade History */}
                  <div>
                    <h4 className={`text-xs font-black uppercase mb-3 ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                      Settled Trade History ({(userTrades?.tradeHistory || []).length})
                    </h4>
                    {(userTrades?.tradeHistory || []).length === 0 ? (
                      <p className={`text-xs ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>No trade history records.</p>
                    ) : (
                      <div className="space-y-2">
                        {(userTrades?.tradeHistory || []).map((t) => (
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
                                Amount: {formatTxnAmount(t.amount, selectedUserForTrades.currency || 'INR').primary} · Entry: {t.entryPrice} · Exit: {t.exitPrice ?? '-'}
                                {t.profit !== undefined && (
                                  <span className={t.profit >= 0 ? ' text-emerald-500 font-bold' : ' text-rose-500 font-bold'}>
                                    {' '}· P&L: {t.profit >= 0 ? '+' : ''}{formatTxnAmount(Math.abs(t.profit), selectedUserForTrades.currency || 'INR').primary}
                                  </span>
                                )}
                                {' '}· {new Date(t.openTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                            <button
                              onClick={() => handleDeleteTrade(t.id)}
                              className="px-2.5 py-1 rounded-xl text-rose-400 hover:bg-rose-500/20 bg-rose-500/10 border border-rose-500/30 text-xs font-bold flex items-center space-x-1 transition shrink-0"
                              title="Delete this trade record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
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

      {/* Floating Manager Toast Notification */}
      {managerNotification && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#181c2b]/95 border border-sky-500/40 text-sky-400 text-xs font-black px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-md animate-bounce flex items-center space-x-2">
          <span>{managerNotification}</span>
        </div>
      )}
    </div>
  );
};
