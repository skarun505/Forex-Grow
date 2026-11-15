import React, { useState, useEffect, useRef } from 'react';
import { useTrading } from '../context/TradingContext';
import { CURRENCY_CONFIGS, formatCurrency } from '../utils/currency';
import { apiUrl } from '../utils/api';
import { ForexGrowLogo } from './ForexGrowLogo';
import { 
  ChevronDown, 
  RefreshCw, 
  Wallet, 
  PlusCircle, 
  Check, 
  Trophy, 
  Volume2, 
  VolumeX, 
  ShieldCheck, 
  Globe2, 
  Sun, 
  Moon, 
  User,
  LogOut
} from 'lucide-react';

interface HeaderProps {
  onOpenAssetModal: () => void;
  onOpenCashierModal: () => void;
  onOpenLeaderboardModal: () => void;
  onOpenCurrencyModal: () => void;
  onOpenKycModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenAssetModal,
  onOpenCashierModal,
  onOpenLeaderboardModal,
  onOpenCurrencyModal,
  onOpenKycModal,
}) => {
  const {
    account,
    selectedAsset,
    isConnected,
    switchAccount,
    resetDemoBalance,
    isMuted,
    toggleMute,
    theme,
    toggleTheme,
  } = useTrading();

  const isLight = theme === 'light';
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const accountDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setShowUserMenu(false);
      }
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(target)) {
        setShowAccountDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  const activeBalance = account.activeAccountType === 'DEMO' ? account.demoBalance : account.realBalance;
  const currencyConfig = CURRENCY_CONFIGS[account.currency] || CURRENCY_CONFIGS.USD;
  const initials = account.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  const handleLogout = async () => {
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

  const handleNavigateLogin = () => {
    window.history.pushState({}, '', '/login');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <header className={`h-14 sm:h-16 border-b px-3 sm:px-5 flex items-center justify-between z-30 select-none transition-colors ${
      isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#151a26] border-[#293246] text-white'
    }`}>
      {/* Brand & Asset Pill */}
      <div className="flex items-center space-x-2 sm:space-x-5">
        <div className="flex items-center space-x-2">
          <ForexGrowLogo
            size="sm"
            variant="trader"
            subtitle={isConnected ? 'Live Market' : 'Connecting...'}
          />
        </div>

        {/* Selected Asset Button */}
        {selectedAsset && (
          <button
            onClick={onOpenAssetModal}
            className={`flex items-center space-x-2 sm:space-x-3 transition border px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-2xl text-left group shadow-sm ${
              isLight 
                ? 'bg-slate-100 hover:bg-slate-200/80 border-slate-200 text-slate-800' 
                : 'bg-[#1c2333] hover:bg-[#252e42] border-[#293246] text-white'
            }`}
          >
            <div>
              <div className="text-xs font-bold group-hover:text-emerald-500 transition flex items-center space-x-1 truncate max-w-[90px] xs:max-w-[130px] sm:max-w-[160px]">
                <span className="truncate">{selectedAsset.name}</span>
                {selectedAsset.isRealFeed && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping flex-shrink-0" />
                )}
              </div>
              <div className={`text-[9px] sm:text-[10px] font-mono hidden sm:block ${
                isLight ? 'text-slate-500' : 'text-gray-400'
              }`}>
                {selectedAsset.category.toUpperCase()} {selectedAsset.isRealFeed ? '• LIVE FEED' : '• OTC'}
              </div>
            </div>
            <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 text-[11px] sm:text-xs font-extrabold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-xl">
              +{selectedAsset.payout}%
            </div>
            <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 group-hover:text-emerald-500 transition" />
          </button>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-1 sm:space-x-2.5">
        {/* 1-Tap Quick Switch Pill (Mobile & Desktop) */}
        <div className={`flex items-center p-0.5 rounded-xl border text-[10px] font-black shrink-0 ${
          isLight ? 'bg-slate-200 border-slate-300' : 'bg-[#10141f] border-[#293246]'
        }`}>
          <button
            type="button"
            onClick={() => switchAccount('REAL')}
            className={`px-2 sm:px-2.5 py-1 rounded-lg transition-all flex items-center space-x-1 ${
              account.activeAccountType === 'REAL'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-md'
                : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-gray-400 hover:text-white'
            }`}
            title="Switch to Live Real Account"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${account.activeAccountType === 'REAL' ? 'bg-slate-950 animate-pulse' : 'bg-emerald-500'}`} />
            <span>REAL</span>
          </button>
          <button
            type="button"
            onClick={() => switchAccount('DEMO')}
            className={`px-2 sm:px-2.5 py-1 rounded-lg transition-all flex items-center space-x-1 ${
              account.activeAccountType === 'DEMO'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-gray-400 hover:text-white'
            }`}
            title="Switch to Practice Demo Account"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${account.activeAccountType === 'DEMO' ? 'bg-slate-950' : 'bg-amber-500'}`} />
            <span>DEMO</span>
          </button>
        </div>

        {/* Account Balance Pill & Detailed Modal Trigger */}
        <div className="relative" ref={accountDropdownRef}>
          <button
            type="button"
            onClick={() => {
              setShowAccountDropdown(!showAccountDropdown);
              setShowUserMenu(false);
            }}
            className={`flex items-center space-x-1 sm:space-x-1.5 border px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl sm:rounded-2xl transition shadow-sm ${
              account.activeAccountType === 'REAL'
                ? isLight ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-emerald-950/30 border-emerald-500/40 text-emerald-400'
                : isLight ? 'bg-amber-50 border-amber-300 text-amber-800' : 'bg-amber-950/30 border-amber-500/40 text-amber-400'
            }`}
            title="Click to view detailed account balances & cashier options"
          >
            <Wallet className="w-3.5 h-3.5 shrink-0 hidden xs:block" />
            <span className="text-xs sm:text-sm font-black mono-num">
              {formatCurrency(activeBalance, account.currency)}
            </span>
            <ChevronDown className="w-3 h-3 opacity-70 shrink-0" />
          </button>

          {/* Account Details Dropdown */}
          {showAccountDropdown && (
            <div className={`absolute right-0 mt-2 w-72 max-w-[calc(100vw-1.5rem)] border rounded-2xl shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 ${
              isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#1a2130] border-[#293246] text-white'
            }`}>
              <div className={`pb-2.5 mb-2 border-b flex items-center justify-between ${
                isLight ? 'border-slate-200' : 'border-[#293246]'
              }`}>
                <span className="text-xs font-black uppercase tracking-wider text-gray-400">Select Trading Account</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  account.activeAccountType === 'REAL' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                }`}>
                  Current: {account.activeAccountType}
                </span>
              </div>

              {/* 1. Live Real Account Card */}
              <div
                onClick={() => {
                  switchAccount('REAL');
                  setShowAccountDropdown(false);
                }}
                className={`p-3 rounded-2xl border cursor-pointer transition mb-2 ${
                  account.activeAccountType === 'REAL'
                    ? 'border-emerald-500 bg-emerald-500/10 shadow-md'
                    : isLight ? 'border-slate-200 hover:bg-slate-50' : 'border-[#293246] hover:bg-white/5'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-black">Live Real Account</span>
                  </div>
                  {account.activeAccountType === 'REAL' && (
                    <span className="text-[10px] font-black text-emerald-400 flex items-center space-x-0.5">
                      <Check className="w-3.5 h-3.5" />
                      <span>ACTIVE</span>
                    </span>
                  )}
                </div>
                <div className="text-base sm:text-lg font-black mono-num text-emerald-400">
                  {formatCurrency(account.realBalance, account.currency)}
                </div>
                <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[10px] text-gray-400">Real Market Trading</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAccountDropdown(false);
                      onOpenCashierModal();
                    }}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[10px] transition shadow"
                  >
                    + Deposit
                  </button>
                </div>
              </div>

              {/* 2. Practice Demo Account Card */}
              <div
                onClick={() => {
                  switchAccount('DEMO');
                  setShowAccountDropdown(false);
                }}
                className={`p-3 rounded-2xl border cursor-pointer transition mb-2 ${
                  account.activeAccountType === 'DEMO'
                    ? 'border-amber-500 bg-amber-500/10 shadow-md'
                    : isLight ? 'border-slate-200 hover:bg-slate-50' : 'border-[#293246] hover:bg-white/5'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span className="text-xs font-black">Practice Demo Account</span>
                  </div>
                  {account.activeAccountType === 'DEMO' && (
                    <span className="text-[10px] font-black text-amber-400 flex items-center space-x-0.5">
                      <Check className="w-3.5 h-3.5" />
                      <span>ACTIVE</span>
                    </span>
                  )}
                </div>
                <div className="text-base sm:text-lg font-black mono-num text-amber-400">
                  {formatCurrency(account.demoBalance, account.currency)}
                </div>
                <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[10px] text-gray-400">Virtual Practice Funds</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      resetDemoBalance();
                    }}
                    title="Reset demo balance to initial funds"
                    className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-[10px] transition flex items-center space-x-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                </div>
              </div>

              {/* Currency & KYC quick info */}
              <div
                onClick={() => {
                  setShowAccountDropdown(false);
                  onOpenCurrencyModal();
                }}
                className={`pt-2 border-t p-1.5 text-xs flex items-center justify-between cursor-pointer rounded-xl hover:bg-white/5 ${
                  isLight ? 'border-slate-200 text-slate-600' : 'border-[#293246]/60 text-gray-400'
                }`}
              >
                <span className="flex items-center space-x-1.5">
                  <Globe2 className="w-3.5 h-3.5 text-sky-400" />
                  <span>Currency: {currencyConfig.name}</span>
                </span>
                <span className="font-bold">{currencyConfig.flag} {currencyConfig.code}</span>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Pill - Clean & Minimal */}
        <div className="relative" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowAccountDropdown(false);
            }}
            className={`flex items-center space-x-1 sm:space-x-2 border p-1 sm:px-2.5 sm:py-1.5 rounded-xl sm:rounded-2xl shadow-sm transition text-left ${
              isLight 
                ? 'bg-slate-100 hover:bg-slate-200/80 border-slate-200 text-slate-800' 
                : 'bg-[#1c2333] hover:bg-[#252e42] border-[#293246] text-white'
            }`}
            title="Trader Profile & Settings"
          >
            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-black text-xs text-slate-950 shadow-inner shrink-0">
              {initials || <User className="w-3.5 h-3.5" />}
            </div>
            <div className="hidden md:block text-left">
              <div className="text-xs font-bold flex items-center space-x-1.5 leading-tight">
                <span className="truncate max-w-[100px]">{account.name}</span>
                <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-500 border border-amber-500/30">
                  {account.vipLevel}
                </span>
              </div>
              <div className={`text-[10px] flex items-center space-x-1 font-semibold leading-tight ${
                account.kycStatus === 'APPROVED' ? 'text-emerald-500' : account.kycStatus === 'PENDING' ? 'text-amber-500' : 'text-gray-400'
              }`}>
                <ShieldCheck className="w-2.5 h-2.5" />
                <span>{account.kycStatus === 'APPROVED' ? 'Verified KYC' : account.kycStatus === 'PENDING' ? 'KYC In Review' : 'Verify Aadhaar'}</span>
              </div>
            </div>
            <ChevronDown className="w-3 h-3 text-gray-400 hidden sm:block" />
          </button>

          {/* User Profile Dropdown Menu (Strictly Trader Controls - ZERO Admin/Manager links) */}
          {showUserMenu && (
            <div className={`absolute right-0 top-full mt-2 w-64 max-w-[calc(100vw-1.5rem)] border rounded-2xl shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-100 ${
              isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#1a2130] border-[#293246] text-white'
            }`}>
              <div className={`p-2 border-b mb-2 ${isLight ? 'border-slate-200' : 'border-[#293246]'}`}>
                <div className="text-sm font-extrabold flex items-center justify-between">
                  <span>{account.name}</span>
                  <span className="text-[9px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 px-1.5 py-0.5 rounded font-bold">
                    {account.vipLevel}
                  </span>
                </div>
                <div className={`text-xs truncate mt-0.5 ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>{account.email}</div>
                <div className={`text-[10px] font-mono mt-1 ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>Trader ID: {account.id}</div>
              </div>

              <div className="space-y-1">
                {/* Aadhaar Identity KYC Modal Trigger */}
                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false);
                    onOpenKycModal?.();
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-between ${
                    isLight ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-white/10 text-gray-200'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className={`w-3.5 h-3.5 ${
                      account.kycStatus === 'APPROVED' ? 'text-emerald-500' : account.kycStatus === 'PENDING' ? 'text-amber-500' : 'text-sky-400'
                    }`} />
                    <span>Aadhaar Identity KYC</span>
                  </div>
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                    account.kycStatus === 'APPROVED'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : account.kycStatus === 'PENDING'
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-rose-500/20 text-rose-400'
                  }`}>
                    {account.kycStatus === 'APPROVED' ? 'VERIFIED' : account.kycStatus || 'UNVERIFIED'}
                  </span>
                </button>

                {/* Theme Switch */}
                <button
                  type="button"
                  onClick={toggleTheme}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-between md:hidden ${
                    isLight ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-white/10 text-gray-200'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-sky-400" />}
                    <span>Theme: {theme === 'dark' ? 'Dark' : 'Light'}</span>
                  </div>
                  <span className="text-[10px] text-gray-400 uppercase">Switch</span>
                </button>

                {/* Sound Effects */}
                <button
                  type="button"
                  onClick={toggleMute}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-between md:hidden ${
                    isLight ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-white/10 text-gray-200'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-500" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-500" />}
                    <span>Sound Effects</span>
                  </div>
                  <span className="text-[10px] font-bold text-gray-400">{isMuted ? 'MUTED' : 'ON'}</span>
                </button>

                {/* Switch Trader Account */}
                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false);
                    handleNavigateLogin();
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
                    isLight ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-white/10 text-gray-200'
                  }`}
                >
                  <User className="w-3.5 h-3.5 text-gray-400" />
                  <span>Switch Trader Account</span>
                </button>

                {/* Logout */}
                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false);
                    handleLogout();
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-500/10 transition flex items-center space-x-2"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-500" />
                  <span>Log Out of Terminal</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Currency Switcher Pill - Hidden on mobile */}
        <button
          onClick={onOpenCurrencyModal}
          title="Switch Account Currency"
          className={`hidden sm:flex items-center space-x-1 sm:space-x-1.5 border px-2 sm:px-2.5 py-1.5 rounded-2xl text-xs font-bold transition ${
            isLight 
              ? 'bg-slate-100 hover:bg-slate-200/80 border-slate-200 text-slate-800' 
              : 'bg-[#1c2333] hover:bg-[#252e42] border-[#293246] text-gray-200'
          }`}
        >
          <span className="text-sm">{currencyConfig.flag}</span>
          <span className="hidden sm:inline font-mono">{currencyConfig.code}</span>
          <ChevronDown className="w-3 h-3 text-gray-400" />
        </button>

        {/* Top Traders Button (desktop) */}
        <button
          onClick={onOpenLeaderboardModal}
          className={`hidden lg:flex items-center space-x-1.5 border px-3 py-2 rounded-2xl text-xs font-bold text-amber-500 transition ${
            isLight 
              ? 'bg-slate-100 hover:bg-slate-200/80 border-slate-200' 
              : 'bg-[#1c2333] hover:bg-[#252e42] border-[#293246]'
          }`}
        >
          <Trophy className="w-4 h-4 text-amber-500" />
          <span>Top</span>
        </button>

        {/* Dark / Light Theme Toggle (Desktop) */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className={`hidden md:flex p-2 sm:p-2.5 border rounded-2xl transition ${
            isLight 
              ? 'bg-slate-100 hover:bg-slate-200/80 border-slate-200 text-slate-600' 
              : 'bg-[#1c2333] hover:bg-[#252e42] border-[#293246] text-gray-400 hover:text-white'
          }`}
        >
          {theme === 'dark' ? (
            <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
          ) : (
            <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-500" />
          )}
        </button>

        {/* Audio Mute/Unmute (Desktop) */}
        <button
          onClick={toggleMute}
          title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
          className={`hidden md:flex p-2 sm:p-2.5 border rounded-2xl transition ${
            isLight 
              ? 'bg-slate-100 hover:bg-slate-200/80 border-slate-200 text-slate-600' 
              : 'bg-[#1c2333] hover:bg-[#252e42] border-[#293246] text-gray-400 hover:text-white'
          }`}
        >
          {isMuted ? <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-500" /> : <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500" />}
        </button>

        {/* Deposit Button (Desktop only; mobile uses dedicated glowing tab in MobileNavBar) */}
        <button
          onClick={onOpenCashierModal}
          className="hidden sm:flex items-center space-x-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs sm:text-sm px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl shadow-lg shadow-emerald-500/25 transition transform active:scale-95"
        >
          <PlusCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
          <span>Deposit</span>
        </button>
      </div>

    </header>
  );
};
