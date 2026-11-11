import React from 'react';
import { useTrading } from '../context/TradingContext';
import { CURRENCY_CONFIGS } from '../utils/currency';
import { CandlestickChart, Clock, Sparkles, Trophy, Wallet } from 'lucide-react';

interface MobileNavBarProps {
  onOpenAssetModal: () => void;
  onOpenCashierModal: () => void;
  onOpenLeaderboardModal: () => void;
  onOpenCurrencyModal: () => void;
  onToggleTradesDrawer: () => void;
  isTradesDrawerOpen: boolean;
}

export const MobileNavBar: React.FC<MobileNavBarProps> = ({
  onOpenAssetModal,
  onOpenCashierModal,
  onOpenLeaderboardModal,
  onOpenCurrencyModal,
  onToggleTradesDrawer,
  isTradesDrawerOpen,
}) => {
  const { activeTrades, account, theme } = useTrading();
  const isLight = theme === 'light';
  const curr = CURRENCY_CONFIGS[account.currency] || CURRENCY_CONFIGS.USD;
  const activeCount = activeTrades.filter(
    (t) => !t.accountType || t.accountType === account.activeAccountType
  ).length;

  return (
    <nav className={`lg:hidden h-14 border-t flex items-center justify-around px-1 z-30 select-none transition-colors duration-200 safe-bottom ${
      isLight ? 'bg-white border-slate-200 text-slate-600 shadow-lg' : 'bg-[#141824] border-[#2e354b] text-gray-400'
    }`}>
      {/* Trade / Chart Tab */}
      <button
        onClick={() => {
          if (isTradesDrawerOpen) onToggleTradesDrawer();
        }}
        className={`flex flex-col items-center justify-center flex-1 py-1 transition ${
          !isTradesDrawerOpen ? 'text-trade-green font-bold scale-105' : (isLight ? 'text-slate-500 hover:text-slate-800' : 'text-gray-400 hover:text-gray-200')
        }`}
      >
        <CandlestickChart className="w-4 h-4" />
        <span className="text-[10px] mt-0.5 font-bold">Chart</span>
      </button>

      {/* Markets Tab */}
      <button
        onClick={onOpenAssetModal}
        className={`flex flex-col items-center justify-center flex-1 py-1 transition ${
          isLight ? 'text-slate-500 hover:text-slate-800' : 'text-gray-400 hover:text-gray-200'
        }`}
      >
        <Sparkles className="w-4 h-4 text-emerald-400" />
        <span className="text-[10px] mt-0.5">Markets</span>
      </button>

      {/* Orders Tab with active badge */}
      <button
        onClick={onToggleTradesDrawer}
        className={`flex flex-col items-center justify-center flex-1 py-1 transition relative ${
          isTradesDrawerOpen ? 'text-trade-green font-bold scale-105' : (isLight ? 'text-slate-500 hover:text-slate-800' : 'text-gray-400 hover:text-gray-200')
        }`}
      >
        <Clock className="w-4 h-4" />
        {activeCount > 0 && (
          <span className="absolute top-0 right-2 min-w-4 h-4 px-1 bg-emerald-500 text-slate-950 text-[9px] font-black rounded-full flex items-center justify-center animate-pulse">
            {activeCount}
          </span>
        )}
        <span className="text-[10px] mt-0.5">Trades</span>
      </button>

      {/* Currency Switcher */}
      <button
        onClick={onOpenCurrencyModal}
        className={`flex flex-col items-center justify-center flex-1 py-1 transition ${
          isLight ? 'text-slate-500 hover:text-slate-800' : 'text-gray-400 hover:text-gray-200'
        }`}
      >
        <span className="text-sm leading-none">{curr.flag}</span>
        <span className="text-[9px] mt-0.5 font-mono font-bold">{curr.code}</span>
      </button>

      {/* Leaderboard Tab */}
      <button
        onClick={onOpenLeaderboardModal}
        className={`flex flex-col items-center justify-center flex-1 py-1 transition ${
          isLight ? 'text-slate-500 hover:text-slate-800' : 'text-gray-400 hover:text-gray-200'
        }`}
      >
        <Trophy className="w-4 h-4 text-amber-500" />
        <span className="text-[10px] mt-0.5">Rank</span>
      </button>

      {/* Cashier / Wallet Tab - Glowing Deposit Button */}
      <button
        onClick={onOpenCashierModal}
        className="flex flex-col items-center justify-center flex-1 py-1 text-emerald-400 font-black transition group"
      >
        <div className="w-6 h-6 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shadow-md shadow-emerald-500/20 group-hover:scale-110 transition">
          <Wallet className="w-3.5 h-3.5 text-emerald-400" />
        </div>
        <span className="text-[9px] mt-0.5 tracking-wider uppercase">Deposit</span>
      </button>
    </nav>
  );
};
