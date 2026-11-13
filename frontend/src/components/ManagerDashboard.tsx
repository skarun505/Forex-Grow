import React, { useState, useEffect } from 'react';
import { useTrading } from '../context/TradingContext';
import { formatCurrency } from '../utils/currency';
import { apiUrl } from '../utils/api';
import {
  UserAccount,
  Transaction,
  Trade,
  AuditLog,
  CurrencyCode,
  VipLevel,
  DepositPaymentSettings,
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
  RefreshCw,
  LogOut,
  Lock,
  Unlock,
  Eye,
  FileText,
  UserPlus,
  Sparkles,
  Key,
  X,
  Phone,
  Building2,
  Smartphone,
  Edit3,
  Save
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

  const [activeTab, setActiveTab] = useState<'CASHIER' | 'TRADERS' | 'TRADES' | 'AUDIT'>('CASHIER');
  const [overview, setOverview] = useState<ManagerOverview | null>(null);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [liveTrades, setLiveTrades] = useState<Trade[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Search & Filter States
  const [txnSearch, setTxnSearch] = useState('');
  const [txnFilter, setTxnFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'DEPOSIT' | 'WITHDRAWAL'>('PENDING');
  const [userSearch, setUserSearch] = useState('');
  const [copiedUtr, setCopiedUtr] = useState<string | null>(null);
  const [selectedProofImg, setSelectedProofImg] = useState<string | null>(null);

  // Client Creation States
  const [isCreateClientModalOpen, setIsCreateClientModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientPassword, setNewClientPassword] = useState('Trader@2026');
  const [newClientCurrency, setNewClientCurrency] = useState<CurrencyCode>('INR');
  const [newClientDemoBal, setNewClientDemoBal] = useState('10000');
  const [newClientRealBal, setNewClientRealBal] = useState('0');
  const [newClientVip, setNewClientVip] = useState<VipLevel>('STANDARD');
  const [newClientKyc, setNewClientKyc] = useState(false);
  const [createdClientSlip, setCreatedClientSlip] = useState<any | null>(null);
  const [isCreatingClient, setIsCreatingClient] = useState(false);
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
    name: 'Sarah Connor',
    email: 'manager@forexgrow.com',
    role: 'MANAGER' as const,
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

  const fetchManagerData = async () => {
    setIsLoading(true);
    try {
      const [ovRes, uRes, txRes, trRes, logRes, psRes] = await Promise.all([
        fetch(apiUrl('/api/manager/overview')).then((r) => r.json()),
        fetch(apiUrl('/api/manager/users')).then((r) => r.json()),
        fetch(apiUrl('/api/manager/transactions')).then((r) => r.json()),
        fetch(apiUrl('/api/manager/trades')).then((r) => r.json()),
        fetch(apiUrl('/api/manager/audit-logs')).then((r) => r.json()),
        fetch(apiUrl('/api/payment/settings')).then((r) => r.json()).catch(() => null),
      ]);

      setOverview(ovRes);
      setUsers(uRes);
      setTransactions(txRes);
      setLiveTrades(trRes);
      setAuditLogs(logRes);
      if (psRes?.settings) {
        setPaymentSettings(psRes.settings);
      }
    } catch (e) {
      console.error('Failed to fetch manager data', e);
    } finally {
      setIsLoading(false);
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
    if (!confirm('Reset this trader demo balance back to $10,000?')) return;
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

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$';
    let res = '';
    for (let i = 0; i < 9; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewClientPassword(`Fg@${res}`);
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateClientError(null);
    if (!newClientName.trim() || !newClientEmail.trim()) {
      setCreateClientError('Full Name and Email address are required.');
      return;
    }

    setIsCreatingClient(true);
    try {
      const res = await fetch(apiUrl('/api/manager/users/create'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newClientName.trim(),
          email: newClientEmail.trim(),
          phone: newClientPhone.trim() || undefined,
          password: newClientPassword.trim(),
          currency: newClientCurrency,
          demoBalance: Number(newClientDemoBal) || 10000,
          realBalance: Number(newClientRealBal) || 0,
          vipLevel: newClientVip,
          isKycVerified: newClientKyc,
          actorId: managerProfile.id,
          actorName: managerProfile.name,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setCreateClientError(data.error || 'Failed to create client account');
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

      fetchManagerData();
    } catch (err) {
      setCreateClientError('Failed to connect to backend server');
    } finally {
      setIsCreatingClient(false);
    }
  };

  const copyCredentialsSlip = () => {
    if (!createdClientSlip) return;
    const text = `🌟 FOREX GROW TRADING ACCOUNT CREDENTIALS 🌟
-----------------------------------------
Client Name: ${createdClientSlip.name}
Login (Email): ${createdClientSlip.email}
Login (Mobile): ${createdClientSlip.phone}
Password: ${createdClientSlip.password}
Account Currency: ${createdClientSlip.currency}
Demo Balance: $${createdClientSlip.demoBalance.toLocaleString()}
Live Real Balance: $${createdClientSlip.realBalance.toLocaleString()}
Terminal URL: ${createdClientSlip.url}
-----------------------------------------
Issued by Forex Grow Desk Operations. Direct login supported with Email or Mobile Number.`;
    navigator.clipboard.writeText(text);
    setSlipCopied(true);
    setTimeout(() => setSlipCopied(false), 2500);
  };

  // Filtered lists
  const filteredTransactions = transactions.filter((tx) => {
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

  const filteredUsers = users.filter((u) => {
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
    <div className={`min-h-screen flex flex-col font-sans select-none transition-colors duration-200 ${
      isLight ? 'bg-slate-50 text-slate-800' : 'bg-[#0f121d] text-gray-100'
    }`}>
      {/* Top Header */}
      <header className={`h-16 border-b px-4 sm:px-6 flex items-center justify-between z-30 transition-colors ${
        isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#151926] border-[#252c40]'
      }`}>
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-500 flex items-center justify-center font-black text-white shadow-lg shadow-sky-500/20 text-sm">
            MGR
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className={`text-base font-black tracking-wide ${isLight ? 'text-slate-900' : 'text-white'}`}>
                FOREX GROW
              </h1>
              <span className="text-[10px] font-black uppercase bg-sky-500/15 text-sky-400 px-2 py-0.5 rounded-full border border-sky-500/30">
                Operations Manager Desk
              </span>
            </div>
            <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
              Cashier settlements, KYC verification & live trading desk
            </p>
          </div>
        </div>

        {/* Right Info & Actions */}
        <div className="flex items-center space-x-3">
          {/* Manager ID pill */}
          <div className={`hidden md:flex items-center space-x-2 border px-3 py-1.5 rounded-xl text-xs font-semibold ${
            isLight ? 'bg-slate-100 border-slate-200 text-slate-700' : 'bg-[#1b2132] border-[#29324a] text-gray-300'
          }`}>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{managerProfile.name}</span>
            <span className="text-[10px] font-bold text-sky-400">({managerProfile.role})</span>
          </div>

          <button
            onClick={fetchManagerData}
            title="Refresh Manager Data"
            className={`p-2 rounded-xl border transition ${
              isLight ? 'hover:bg-slate-100 border-slate-200 text-slate-600' : 'hover:bg-[#20273c] border-[#29324a] text-gray-300'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-sky-400' : ''}`} />
          </button>

          <button
            onClick={() => {
              localStorage.removeItem('quotex_manager_user');
              window.history.pushState({}, '', '/manager');
              window.dispatchEvent(new PopStateEvent('popstate'));
            }}
            title="Log Out of Manager Desk"
            className="flex items-center space-x-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-xl text-xs font-bold transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Overview Stat Banner */}
      <div className={`border-b p-4 sm:px-6 grid grid-cols-2 sm:grid-cols-4 gap-3 ${
        isLight ? 'bg-white border-slate-200' : 'bg-[#131622] border-[#222838]'
      }`}>
        <div className={`p-3.5 rounded-2xl border ${
          overview?.pendingDeposits && overview.pendingDeposits > 0
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            : isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#181c2b] border-[#252c40]'
        }`}>
          <div className="flex items-center justify-between text-xs font-bold">
            <span>Pending Deposits</span>
            <ArrowDownCircle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black mt-1 mono-num">
            {overview?.pendingDeposits || 0}
          </div>
          <div className="text-[10px] opacity-80 mt-0.5">Need UTR / proof verification</div>
        </div>

        <div className={`p-3.5 rounded-2xl border ${
          overview?.pendingWithdrawals && overview.pendingWithdrawals > 0
            ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            : isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#181c2b] border-[#252c40]'
        }`}>
          <div className="flex items-center justify-between text-xs font-bold">
            <span>Pending Payouts</span>
            <ArrowUpCircle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black mt-1 mono-num">
            {overview?.pendingWithdrawals || 0}
          </div>
          <div className="text-[10px] opacity-80 mt-0.5">Awaiting payout clearance</div>
        </div>

        <div className={`p-3.5 rounded-2xl border ${
          isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-[#181c2b] border-[#252c40] text-gray-200'
        }`}>
          <div className="flex items-center justify-between text-xs font-bold text-gray-400">
            <span>Active Traders</span>
            <Users className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-black mt-1 mono-num text-sky-400">
            {overview?.totalActiveUsers || 0}
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">Platform registered accounts</div>
        </div>

        <div className={`p-3.5 rounded-2xl border ${
          isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-[#181c2b] border-[#252c40] text-gray-200'
        }`}>
          <div className="flex items-center justify-between text-xs font-bold text-gray-400">
            <span>KYC Verified Traders</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black mt-1 mono-num text-emerald-400">
            {overview?.verifiedUsersCount || 0}
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">Identity approved</div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className={`border-b px-4 sm:px-6 flex space-x-2 sm:space-x-6 overflow-x-auto ${
        isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#131724] border-[#222838]'
      }`}>
        <button
          onClick={() => setActiveTab('CASHIER')}
          className={`py-3 px-1 text-xs font-black uppercase tracking-wider flex items-center space-x-2 border-b-2 transition ${
            activeTab === 'CASHIER'
              ? 'border-sky-500 text-sky-400'
              : isLight ? 'border-transparent text-slate-500 hover:text-slate-800' : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Cashier Queue</span>
          {pendingCount > 0 && (
            <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded-full animate-pulse">
              {pendingCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('TRADERS')}
          className={`py-3 px-1 text-xs font-black uppercase tracking-wider flex items-center space-x-2 border-b-2 transition ${
            activeTab === 'TRADERS'
              ? 'border-sky-500 text-sky-400'
              : isLight ? 'border-transparent text-slate-500 hover:text-slate-800' : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Traders & KYC</span>
        </button>

        <button
          onClick={() => setActiveTab('TRADES')}
          className={`py-3 px-1 text-xs font-black uppercase tracking-wider flex items-center space-x-2 border-b-2 transition ${
            activeTab === 'TRADES'
              ? 'border-sky-500 text-sky-400'
              : isLight ? 'border-transparent text-slate-500 hover:text-slate-800' : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Live Trades Desk</span>
          <span className="text-[9px] bg-emerald-500/15 text-emerald-400 px-1 rounded uppercase">Live</span>
        </button>

        <button
          onClick={() => setActiveTab('AUDIT')}
          className={`py-3 px-1 text-xs font-black uppercase tracking-wider flex items-center space-x-2 border-b-2 transition ${
            activeTab === 'AUDIT'
              ? 'border-sky-500 text-sky-400'
              : isLight ? 'border-transparent text-slate-500 hover:text-slate-800' : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Audit Log</span>
        </button>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
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
                        {tx.proofImage && (
                          <button
                            onClick={() => setSelectedProofImg(tx.proofImage!)}
                            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-sky-500/30 bg-sky-500/10 text-sky-400 text-xs font-bold hover:bg-sky-500/20 transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Proof Image</span>
                          </button>
                        )}

                        {/* Amount */}
                        <div className="text-right">
                          <div className={`text-lg font-black mono-num ${
                            isDeposit ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                            {isDeposit ? '+' : '-'}${tx.amount.toFixed(2)}
                          </div>
                          <div className="text-[10px] text-gray-400 font-mono">
                            {formatCurrency(tx.amount, tx.currency)}
                          </div>
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
              </div>
            </div>

            {/* Traders Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
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
                            <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-500 border border-amber-500/30">
                              {u.vipLevel}
                            </span>
                            {u.role && u.role !== 'TRADER' && (
                              <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30">
                                {u.role}
                              </span>
                            )}
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
                        <div>
                          <span className="text-[10px] text-gray-400 block">Live Real Balance</span>
                          <span className="font-black text-sm mono-num text-emerald-400">
                            {formatCurrency(u.realBalance, u.currency)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-400 block">Demo Balance</span>
                          <span className="font-bold text-xs mono-num text-gray-300">
                            {formatCurrency(u.demoBalance, u.currency)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Manager Operations */}
                    <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
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
                        title="Reset Demo to $10,000"
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
                  </div>
                );
              })}
            </div>
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
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono">
                    {liveTrades.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-gray-500">
                          No active trades on the floor right now.
                        </td>
                      </tr>
                    ) : (
                      liveTrades.map((t) => {
                        const isUp = t.direction === 'UP';
                        const isWon = t.status === 'WON';
                        const isOpen = t.status === 'OPEN';

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
                              ${t.amount.toFixed(2)}
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
                                <span className="text-gray-400">In Play...</span>
                              ) : isWon ? (
                                <span className="text-emerald-400">+${(t.profit || 0).toFixed(2)}</span>
                              ) : (
                                <span className="text-rose-400">-${t.amount.toFixed(2)}</span>
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
              {auditLogs.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-xs">
                  No operations recorded yet. Actions taken on the cashier and trader desks will appear here.
                </div>
              ) : (
                auditLogs.map((log) => (
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
      </main>

      {/* Proof Image Fullscreen Modal */}
      {selectedProofImg && (
        <div
          onClick={() => setSelectedProofImg(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`max-w-xl w-full rounded-3xl p-4 border flex flex-col space-y-3 ${
              isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#161a29] border-[#252c40] text-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider">Payment Proof Verification</span>
              <button
                onClick={() => setSelectedProofImg(null)}
                className="p-1 hover:text-white text-gray-400"
              >
                ✕
              </button>
            </div>
            <div className="max-h-[70vh] overflow-hidden rounded-2xl border border-white/10 flex items-center justify-center bg-black">
              <img src={selectedProofImg} alt="Proof Screenshot" className="max-w-full max-h-[65vh] object-contain" />
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setSelectedProofImg(null)}
                className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs rounded-xl"
              >
                Close Proof
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
                    <h3 className="text-lg font-black text-emerald-400">Client Account Issued!</h3>
                    <p className="text-xs text-gray-400">Share these trading credentials with the client</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-black/40 border border-emerald-500/30 space-y-2.5 font-mono text-xs">
                  <div className="flex justify-between border-b border-white/10 pb-2 font-sans font-bold">
                    <span className="text-gray-400">Client Name:</span>
                    <span className="text-white">{createdClientSlip.name}</span>
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
                    <span className="text-white">${createdClientSlip.demoBalance.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/10 pb-2">
                    <span className="text-gray-400 font-sans">Live Real Balance:</span>
                    <span className="text-emerald-400">${createdClientSlip.realBalance.toLocaleString()}</span>
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
            ) : (
              /* Create Client Form */
              <form onSubmit={handleCreateClient} className="space-y-4">
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
                        placeholder="+91 98765 43210"
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
                        onChange={(e) => setNewClientRealBal(e.target.value)}
                        className={`w-full px-2.5 py-2 rounded-xl text-xs font-mono border focus:outline-none ${
                          isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-[#0f131d] border-[#252c40] text-emerald-400'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="text-[11px] font-bold block mb-1 text-gray-300">VIP Tier</label>
                      <select
                        value={newClientVip}
                        onChange={(e) => setNewClientVip(e.target.value as VipLevel)}
                        className={`w-full px-2 py-2 rounded-xl text-xs font-bold border focus:outline-none ${
                          isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-[#0f131d] border-[#252c40] text-white'
                        }`}
                      >
                        <option value="STANDARD">STANDARD</option>
                        <option value="PRO">PRO</option>
                        <option value="VIP">VIP</option>
                      </select>
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
                    disabled={isCreatingClient}
                    className="w-full py-3.5 rounded-2xl bg-[#00c679] hover:bg-[#00e089] disabled:opacity-50 text-slate-950 font-black text-xs flex items-center justify-center space-x-2 shadow-xl shadow-emerald-500/20 active:scale-95 transition"
                  >
                    {isCreatingClient ? (
                      <span>Creating Client Account...</span>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Issue Client Account & Get Credentials</span>
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

      {/* Floating Manager Toast Notification */}
      {managerNotification && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#181c2b]/95 border border-sky-500/40 text-sky-400 text-xs font-black px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-md animate-bounce flex items-center space-x-2">
          <span>{managerNotification}</span>
        </div>
      )}
    </div>
  );
};
