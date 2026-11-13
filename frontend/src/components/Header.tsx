import React, { useState, useEffect, useRef } from 'react';
import { useTrading } from '../context/TradingContext';
import { CURRENCY_CONFIGS, formatCurrency } from '../utils/currency';
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
}

export const Header: React.FC<HeaderProps> = ({
  onOpenAssetModal,
  onOpenCashierModal,
  onOpenLeaderboardModal,
  onOpenCurrencyModal,
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

  const handleLogout = () => {
    localStorage.removeItem('quotex_current_user');
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
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-slate-950 font-black text-xs sm:text-sm">
            FG
          </div>
          <div className="hidden xs:block">
            <div className={`font-black text-sm sm:text-base tracking-wide flex items-center space-x-1.5 ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}>
              <span>FOREX GROW</span>
              <span className="text-[8px] sm:text-[9px] font-black uppercase bg-emerald-500/15 text-emerald-500 px-1 rounded border border-emerald-500/30">
                PRO
              </span>
            </div>
            <div className="hidden sm:flex items-center space-x-1.5 text-[10px] text-gray-400">
              <span className={`inline-block w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              <span className={isLight ? 'text-slate-500' : 'text-gray-400'}>{isConnected ? 'Live Market' : 'Connecting...'}</span>
            </div>
          </div>
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
              <div className="text-xs font-bold group-hover:text-emerald-500 transition flex items-center space-x-1 truncate max-w-[110px] sm:max-w-[160px]">
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
      <div className="flex items-center space-x-1.5 sm:space-x-3">
        {/* User Profile Pill - Interactive with Dropdown Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowAccountDropdown(false);
            }}
            className={`flex items-center space-x-2 border px-2.5 py-1.5 rounded-2xl shadow-sm transition text-left ${
              isLight 
                ? 'bg-slate-100 hover:bg-slate-200/80 border-slate-200 text-slate-800' 
                : 'bg-[#1c2333] hover:bg-[#252e42] border-[#293246] text-white'
            }`}
          >
            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-black text-xs text-slate-950 shadow-inner">
              {initials || <User className="w-3.5 h-3.5" />}
            </div>
            <div className="hidden md:block text-left">
              <div className="text-xs font-bold flex items-center space-x-1.5 leading-tight">
                <span className="truncate max-w-[100px]">{account.name}</span>
                <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-500 border border-amber-500/30">
                  {account.vipLevel}
                </span>
              </div>
              <div className="text-[10px] text-emerald-500 flex items-center space-x-1 font-semibold leading-tight">
                <ShieldCheck className="w-2.5 h-2.5" />
                <span>{account.isKycVerified ? 'Verified' : 'Trader'}</span>
              </div>
            </div>
            <ChevronDown className="w-3 h-3 text-gray-400 hidden sm:block" />
          </button>

          {/* User Profile Dropdown Menu (NO ADMIN BUTTON - ONLY /admin URL) */}
          {showUserMenu && (
            <div className={`absolute right-0 top-full mt-2 w-64 border rounded-2xl shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-100 ${
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
                <div className={`text-[10px] font-mono mt-1 ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>ID: {account.id}</div>
              </div>

              <div className="space-y-1">
                {(account.role === 'MANAGER' || account.role === 'ADMIN') && (
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      window.history.pushState({}, '', '/manager');
                      window.dispatchEvent(new PopStateEvent('popstate'));
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-sky-400 hover:bg-sky-500/10 transition flex items-center space-x-2"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
                    <span>Open Manager Desk</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    toggleTheme();
                  }}
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

                <button
                  onClick={() => {
                    toggleMute();
                  }}
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

                <button
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

                <button
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

        {/* Currency Switcher Pill - Hidden on mobile since MobileNavBar has Currency tab */}
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

        {/* Dark / Light Theme Toggle */}
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

        {/* Audio Mute/Unmute */}
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

        {/* Account Switcher - Full button on desktop, compact pill with balance on mobile */}
        <div className="relative" ref={accountDropdownRef}>
          <button
            onClick={() => setShowAccountDropdown(!showAccountDropdown)}
            className={`flex items-center space-x-1 sm:space-x-2 transition border px-2 sm:px-3.5 py-1.5 sm:py-2 rounded-2xl text-left ${
              isLight 
                ? 'bg-slate-100 hover:bg-slate-200/80 border-slate-200 text-slate-800' 
                : 'bg-[#1c2333] hover:bg-[#252e42] border-[#293246] text-white'
            }`}
          >
            <Wallet className="w-3.5 h-3.5 text-gray-400 hidden xs:block" />
            <div>
              <div className="text-[7.5px] sm:text-[9px] uppercase font-bold tracking-wider text-gray-400 flex items-center space-x-1">
                <span>{account.activeAccountType === 'DEMO' ? 'Demo' : 'Live'}</span>
              </div>
              <div className={`text-[11px] sm:text-sm font-black mono-num leading-tight ${
                account.activeAccountType === 'DEMO' ? 'text-emerald-500' : isLight ? 'text-slate-900' : 'text-white'
              }`}>
                {formatCurrency(activeBalance, account.currency)}
              </div>
            </div>
            <ChevronDown className="w-3 h-3 text-gray-400 ml-0.5" />
          </button>

          {/* Account Dropdown */}
          {showAccountDropdown && (
            <div className={`absolute right-0 mt-2 w-72 border rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 ${
              isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#1a2130] border-[#293246] text-white'
            }`}>
              {/* User Profile Info Inside Dropdown */}
              <div className={`p-3 border-b flex items-center space-x-2.5 ${isLight ? 'border-slate-200' : 'border-[#293246]/60'}`}>
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-black text-sm text-slate-950 shadow-md">
                  {initials || <User className="w-4 h-4" />}
                </div>
                <div className="overflow-hidden flex-1">
                  <div className="text-xs font-bold flex items-center space-x-1.5">
                    <span className="truncate">{account.name}</span>
                    <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-500 border border-amber-500/30">
                      {account.vipLevel}
                    </span>
                  </div>
                  <div className={`text-[11px] truncate ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>{account.email}</div>
                </div>
              </div>

              <div className={`text-[10px] font-semibold px-3 py-1.5 flex justify-between items-center ${
                isLight ? 'text-slate-500' : 'text-gray-400'
              }`}>
                <span>Switch Trading Balance</span>
                <span className="text-[10px] text-emerald-500 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded flex items-center space-x-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>KYC Verified</span>
                </span>
              </div>

              {/* Demo Account */}
              <div
                onClick={() => {
                  switchAccount('DEMO');
                  setShowAccountDropdown(false);
                }}
                className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition mt-1.5 ${
                  account.activeAccountType === 'DEMO' 
                    ? isLight ? 'bg-emerald-50 border border-emerald-300' : 'bg-[#242d40] border border-emerald-500/30' 
                    : isLight ? 'hover:bg-slate-100' : 'hover:bg-[#22293a]'
                }`}
              >
                <div>
                  <div className="text-xs font-bold flex items-center space-x-1.5">
                    <span>Demo Account ($10,000)</span>
                    {account.activeAccountType === 'DEMO' && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                  </div>
                  <div className="text-sm font-black mono-num text-emerald-500">
                    {formatCurrency(account.demoBalance, account.currency)}
                  </div>
                </div>
                <button
                  title={`Reset Demo to ${formatCurrency(10000, account.currency)}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    resetDemoBalance();
                  }}
                  className={`p-1.5 rounded-lg transition ${
                    isLight ? 'text-slate-500 hover:bg-slate-200' : 'text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {/* Real Account */}
              <div
                onClick={() => {
                  switchAccount('REAL');
                  setShowAccountDropdown(false);
                }}
                className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition mt-1.5 ${
                  account.activeAccountType === 'REAL' 
                    ? isLight ? 'bg-emerald-50 border border-emerald-300' : 'bg-[#242d40] border border-emerald-500/30' 
                    : isLight ? 'hover:bg-slate-100' : 'hover:bg-[#22293a]'
                }`}
              >
                <div>
                  <div className="text-xs font-bold flex items-center space-x-1.5">
                    <span>Live Real Account</span>
                    {account.activeAccountType === 'REAL' && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                  </div>
                  <div className={`text-sm font-black mono-num ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    {formatCurrency(account.realBalance, account.currency)}
                  </div>
                </div>
              </div>

              {/* Quick Currency Switch Trigger */}
              <div
                onClick={() => {
                  setShowAccountDropdown(false);
                  onOpenCurrencyModal();
                }}
                className={`mt-2 pt-2 border-t p-2 text-xs flex items-center justify-between cursor-pointer ${
                  isLight ? 'border-slate-200 text-slate-600 hover:text-slate-900' : 'border-[#293246]/60 text-gray-400 hover:text-white'
                }`}
              >
                <span className="flex items-center space-x-1.5">
                  <Globe2 className="w-3.5 h-3.5 text-sky-500" />
                  <span>Currency: {currencyConfig.name}</span>
                </span>
                <span className="font-bold">{currencyConfig.flag} {currencyConfig.code}</span>
              </div>
            </div>
          )}
        </div>

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
