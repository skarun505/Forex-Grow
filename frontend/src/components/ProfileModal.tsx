import React, { useState } from 'react';
import { useTrading } from '../context/TradingContext';
import { CURRENCY_CONFIGS, formatCurrency } from '../utils/currency';
import { apiUrl } from '../utils/api';
import {
  X,
  ShieldCheck,
  RefreshCw,
  LogOut,
  Moon,
  Sun,
  Volume2,
  VolumeX,
  Copy,
  Check,
  ChevronRight,
} from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenKycModal: () => void;
  onOpenCashierModal: () => void;
  onOpenCurrencyModal: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  onOpenKycModal,
  onOpenCashierModal,
  onOpenCurrencyModal,
}) => {
  const {
    account,
    resetDemoBalance,
    theme,
    toggleTheme,
    isMuted,
    toggleMute,
  } = useTrading();

  const isLight = theme === 'light';
  const [copiedId, setCopiedId] = useState(false);
  const [isRefilling, setIsRefilling] = useState(false);

  if (!isOpen) return null;

  const handleCopyId = () => {
    navigator.clipboard.writeText(account.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleRefillDemo = () => {
    setIsRefilling(true);
    resetDemoBalance();
    setTimeout(() => setIsRefilling(false), 800);
  };

  const handleLogout = async () => {
    if (!confirm('Are you sure you want to log out of your trading terminal?')) return;
    try {
      const token = localStorage.getItem('forexgrow_auth_token');
      await fetch(apiUrl('/api/auth/logout'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, userId: account.id }),
      });
    } catch {}
    localStorage.removeItem('quotex_trader_user');
    localStorage.removeItem('quotex_current_user');
    localStorage.removeItem('forexgrow_auth_token');
    window.history.pushState({}, '', '/login');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const initials = account.name
    ? account.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'TR';

  const isKycApproved = account.isKycVerified || account.kycStatus === 'APPROVED';
  const isKycPending = account.kycStatus === 'PENDING';
  const curr = CURRENCY_CONFIGS[account.currency] || CURRENCY_CONFIGS.USD;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in select-none">
      <div className={`w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] transition-colors ${
        isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#151a26] border-[#293246] text-white'
      }`}>
        {/* Header */}
        <div className={`px-5 py-4 border-b flex items-center justify-between ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#1a2130] border-[#293246]'
        }`}>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 font-black flex items-center justify-center shadow-lg shadow-emerald-500/20 text-sm">
              {initials}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-black truncate max-w-[180px]">{account.name}</h3>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase">
                  {account.vipLevel || 'VIP'}
                </span>
              </div>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                Forex Grow Verified Institutional Trader
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition ${
              isLight ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-200' : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Account Identifiers */}
          <div className={`p-4 rounded-2xl border space-y-2.5 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#10141f] border-[#252c40]'
          }`}>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Account ID:</span>
              <button
                type="button"
                onClick={handleCopyId}
                className="font-mono font-bold flex items-center space-x-1.5 text-sky-400 hover:text-sky-300 transition"
              >
                <span>{account.id}</span>
                {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 opacity-70" />}
              </button>
            </div>

            {account.email && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Email:</span>
                <span className="font-medium truncate max-w-[200px]">{account.email}</span>
              </div>
            )}

            {account.phone && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Mobile:</span>
                <span className="font-mono font-medium">{account.phone}</span>
              </div>
            )}

            <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5">
              <span className="text-gray-400">Base Currency:</span>
              <button
                onClick={() => {
                  onClose();
                  onOpenCurrencyModal();
                }}
                className="flex items-center space-x-1.5 text-xs font-bold text-sky-400 hover:underline"
              >
                <span>{curr.flag} {curr.code} ({curr.symbol})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Aadhaar Identity KYC Section */}
          <div className={`p-4 rounded-2xl border ${
            isKycApproved
              ? 'bg-emerald-500/10 border-emerald-500/30'
              : isKycPending
              ? 'bg-amber-500/10 border-amber-500/30'
              : 'bg-rose-500/10 border-rose-500/30'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <ShieldCheck className={`w-4 h-4 ${
                  isKycApproved ? 'text-emerald-400' : isKycPending ? 'text-amber-400' : 'text-rose-400'
                }`} />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Aadhaar Identity KYC
                </span>
              </div>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                isKycApproved
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : isKycPending
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
              }`}>
                {isKycApproved ? 'VERIFIED' : isKycPending ? 'CONFIRMATION PENDING' : 'NOT VERIFIED'}
              </span>
            </div>

            {isKycApproved ? (
              <div>
                <p className="text-xs text-gray-300">
                  Your identity has been fully verified. Real account instant payouts and settlements are unlocked.
                </p>
                {account.aadhaarNumber && (
                  <div className="mt-2 text-xs font-mono font-bold text-emerald-400 bg-black/25 px-2.5 py-1 rounded-lg border border-emerald-500/20 inline-block">
                    Aadhaar: {account.aadhaarNumber}
                  </div>
                )}
              </div>
            ) : isKycPending ? (
              <div className="space-y-2">
                <p className="text-xs text-gray-300">
                  Your Aadhaar number and front/back documents have been submitted. Our compliance team is verifying your profile.
                </p>
                <div className="text-[11px] font-mono text-amber-400">
                  Aadhaar: {account.aadhaarNumber || 'Submitted on terminal'}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-gray-300">
                  Identity verification is required for full cashier withdrawals and higher limits.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenKycModal();
                  }}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs transition shadow-md flex items-center justify-center space-x-1.5"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Submit Aadhaar Verification (KYC)</span>
                </button>
              </div>
            )}
          </div>

          {/* Account Balances Card with Demo Refill */}
          <div className={`p-4 rounded-2xl border space-y-3 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#10141f] border-[#252c40]'
          }`}>
            <span className="text-xs font-black uppercase tracking-wider text-gray-400 block">
              Trading Balances
            </span>

            {/* Real Balance Row */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-black/25 border border-white/5">
              <div>
                <div className="text-xs font-bold text-gray-300">Live Real Account</div>
                <div className="text-base font-black text-emerald-400 mono-num mt-0.5">
                  {formatCurrency(account.realBalance, account.currency)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCashierModal();
                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition shadow"
              >
                + Deposit
              </button>
            </div>

            {/* Demo Balance Row with Refill Button */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-black/25 border border-white/5">
              <div>
                <div className="text-xs font-bold text-gray-300">Practice Demo Account</div>
                <div className="text-base font-black text-amber-400 mono-num mt-0.5">
                  {formatCurrency(account.demoBalance, account.currency)}
                </div>
              </div>
              <button
                type="button"
                onClick={handleRefillDemo}
                title="Refill practice demo balance back to default"
                className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-xs transition flex items-center space-x-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefilling ? 'animate-spin' : ''}`} />
                <span>Refill</span>
              </button>
            </div>
          </div>

          {/* App Preferences */}
          <div className={`p-4 rounded-2xl border space-y-2.5 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#10141f] border-[#252c40]'
          }`}>
            <span className="text-xs font-black uppercase tracking-wider text-gray-400 block mb-1">
              Terminal Settings
            </span>

            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-300">Terminal Theme</span>
              <button
                onClick={toggleTheme}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition ${
                  isLight ? 'bg-white border-slate-300 text-slate-700' : 'bg-white/5 border-white/10 text-white'
                }`}
              >
                {isLight ? <Sun className="w-3.5 h-3.5 text-amber-500" /> : <Moon className="w-3.5 h-3.5 text-sky-400" />}
                <span>{isLight ? 'Light' : 'Dark'}</span>
              </button>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-300">Audio Sound Effects</span>
              <button
                onClick={toggleMute}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition ${
                  isLight ? 'bg-white border-slate-300 text-slate-700' : 'bg-white/5 border-white/10 text-white'
                }`}
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5 text-gray-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
                <span>{isMuted ? 'Muted' : 'Sound ON'}</span>
              </button>
            </div>
          </div>

          {/* Logout Action */}
          <button
            type="button"
            onClick={handleLogout}
            className="w-full py-3 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 text-xs font-bold transition flex items-center justify-center space-x-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Log Out of Trading Terminal</span>
          </button>
        </div>
      </div>
    </div>
  );
};
