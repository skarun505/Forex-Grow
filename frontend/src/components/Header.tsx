import React, { useState, useEffect, useRef } from 'react';
import { useTrading } from '../context/TradingContext';
import { CURRENCY_CONFIGS, formatCurrency } from '../utils/currency';
import { apiUrl } from '../utils/api';
import { ForexGrowLogo } from './ForexGrowLogo';
import { 
  ChevronDown, 
  RefreshCw, 
  PlusCircle, 
  Trophy, 
  Volume2, 
  VolumeX, 
  ShieldCheck, 
  Sun, 
  Moon, 
  User,
  LogOut,
  Send,
  Eye,
  EyeOff
} from 'lucide-react';

interface HeaderProps {
  onOpenAssetModal: () => void;
  onOpenCashierModal: () => void;
  onOpenLeaderboardModal: () => void;
  onOpenCurrencyModal: () => void;
  onOpenKycModal?: () => void;
  onOpenProfileModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenAssetModal,
  onOpenCashierModal,
  onOpenLeaderboardModal,
  onOpenCurrencyModal,
  onOpenKycModal,
  onOpenProfileModal,
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
  const [isBalanceHidden, setIsBalanceHidden] = useState(false);
  const [isRefillingDemo, setIsRefillingDemo] = useState(false);
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
            className={`hidden sm:flex items-center space-x-2 sm:space-x-3 transition border px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-2xl text-left group shadow-sm ${
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
      <div className="flex items-center space-x-1.5 sm:space-x-2.5">
        {/* Quotex-Style Live / Demo Dropdown Trigger */}
        <div className="relative" ref={accountDropdownRef}>
          <button
            type="button"
            onClick={() => {
              setShowAccountDropdown(!showAccountDropdown);
              setShowUserMenu(false);
            }}
            className={`flex items-center space-x-1.5 sm:space-x-2 border px-2.5 sm:px-3 py-1.5 rounded-xl sm:rounded-2xl transition shadow-sm ${
              account.activeAccountType === 'REAL'
                ? isLight
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                  : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400 hover:bg-emerald-900/40'
                : isLight
                ? 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100'
                : 'bg-amber-950/40 border-amber-500/40 text-amber-400 hover:bg-amber-900/40'
            }`}
            title="Click to switch between Live and Demo account, or refill demo funds"
          >
            <Send className={`w-3.5 h-3.5 rotate-[-30deg] shrink-0 ${
              account.activeAccountType === 'REAL' ? 'text-emerald-400' : 'text-amber-400'
            }`} />
            <span className="text-[10px] sm:text-[11px] font-black tracking-wider uppercase">
              {account.activeAccountType === 'REAL' ? 'LIVE' : 'DEMO'}
            </span>
            <span className="text-xs sm:text-sm font-black mono-num">
              {isBalanceHidden ? '••••••' : formatCurrency(activeBalance, account.currency)}
            </span>
            <ChevronDown className={`w-3 h-3 opacity-70 transition-transform ${showAccountDropdown ? 'rotate-180' : ''}`} />
          </button>

          {/* Quotex-Style Account Dropdown Card */}
          {showAccountDropdown && (
            <div className={`absolute right-0 mt-2 w-80 max-w-[calc(100vw-1.5rem)] border rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 ${
              isLight ? 'bg-white border-slate-200 text-slate-800 shadow-slate-300/60' : 'bg-[#151924] border-[#273044] text-white'
            }`}>
              {/* Top Banner Card: Standard / VIP profit badge + Eye toggle */}
              <div className={`flex items-center justify-between p-2.5 rounded-xl border mb-3.5 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#1c2233] border-white/5'
              }`}>
                <div className="flex items-center space-x-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Send className="w-3.5 h-3.5 rotate-[-30deg]" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 leading-none">
                      {account.vipLevel === 'VIP' ? 'VIP STATUS:' : 'STANDARD:'}
                    </div>
                    <div className="text-xs font-black text-emerald-400 mt-0.5">
                      {account.vipLevel === 'VIP' ? '+2% profit' : '+0% profit'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsBalanceHidden(!isBalanceHidden)}
                  title={isBalanceHidden ? 'Show balance' : 'Hide balance'}
                  className={`p-1.5 rounded-lg border transition ${
                    isLight ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100' : 'bg-black/30 border-white/5 text-gray-400 hover:text-white'
                  }`}
                >
                  {isBalanceHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Trader Identity Block */}
              <div className="mb-3">
                <div className="text-sm font-black truncate">
                  {account.email || account.phone || account.name}
                </div>
                <div className="text-xs text-gray-400 font-mono mt-0.5">
                  ID: {account.id?.replace(/^usr_/, '') || '96128920'}
                </div>
                <div className="flex items-center space-x-2 text-xs text-gray-300 mt-1.5">
                  <span className="text-gray-400">Currency:</span>
                  <span className="font-bold font-mono text-white">{account.currency}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAccountDropdown(false);
                      onOpenCurrencyModal();
                    }}
                    className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-sky-500/15 hover:bg-sky-500/25 text-sky-400 border border-sky-500/30 transition uppercase"
                  >
                    CHANGE
                  </button>
                </div>
              </div>

              {/* Horizontal Divider */}
              <div className={`border-t my-3 ${isLight ? 'border-slate-200' : 'border-white/10'}`} />

              {/* Account Choice 1: Live Account */}
              <div
                onClick={() => {
                  switchAccount('REAL');
                  setShowAccountDropdown(false);
                }}
                className={`flex items-start space-x-3 p-3 rounded-xl cursor-pointer border transition mb-2 ${
                  account.activeAccountType === 'REAL'
                    ? 'border-emerald-500/50 bg-emerald-500/10'
                    : isLight ? 'border-slate-200 hover:bg-slate-50' : 'border-white/5 hover:bg-white/5'
                }`}
              >
                <div className="mt-0.5">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    account.activeAccountType === 'REAL' ? 'border-emerald-400 bg-emerald-500/20' : 'border-gray-500'
                  }`}>
                    {account.activeAccountType === 'REAL' && (
                      <div className="w-2 h-2 rounded-full bg-emerald-400" />
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="text-xs font-bold">Live Account</div>
                  <div className="text-base font-black mono-num text-emerald-400 mt-0.5">
                    {isBalanceHidden ? '••••••' : formatCurrency(account.realBalance, account.currency)}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-1">
                    The daily limit is not set
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAccountDropdown(false);
                      onOpenCashierModal();
                    }}
                    className="text-[10px] font-extrabold text-sky-400 hover:underline uppercase mt-0.5 block"
                  >
                    SET LIMIT
                  </button>
                </div>
              </div>

              {/* Account Choice 2: Demo Account with Refill Option */}
              <div
                onClick={() => {
                  switchAccount('DEMO');
                  setShowAccountDropdown(false);
                }}
                className={`flex items-start space-x-3 p-3 rounded-xl cursor-pointer border transition ${
                  account.activeAccountType === 'DEMO'
                    ? 'border-amber-500/50 bg-amber-500/10'
                    : isLight ? 'border-slate-200 hover:bg-slate-50' : 'border-white/5 hover:bg-white/5'
                }`}
              >
                <div className="mt-0.5">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    account.activeAccountType === 'DEMO' ? 'border-amber-400 bg-amber-500/20' : 'border-gray-500'
                  }`}>
                    {account.activeAccountType === 'DEMO' && (
                      <div className="w-2 h-2 rounded-full bg-amber-400" />
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">Demo Account</span>
                    <span className="text-[10px] text-gray-400">Practice</span>
                  </div>
                  <div className="flex items-center space-x-2.5 mt-0.5">
                    <span className="text-base font-black mono-num text-amber-400">
                      {isBalanceHidden ? '••••••' : formatCurrency(account.demoBalance, account.currency)}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsRefillingDemo(true);
                        resetDemoBalance();
                        setTimeout(() => setIsRefillingDemo(false), 800);
                      }}
                      title="Refill practice demo balance back to default if washed out"
                      className="p-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition active:scale-95"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRefillingDemo ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Pill - Clean & Minimal */}
        <div className="relative" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => {
              if (onOpenProfileModal) {
                onOpenProfileModal();
              } else {
                setShowUserMenu(!showUserMenu);
              }
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
