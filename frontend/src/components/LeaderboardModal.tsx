import React from 'react';
import { useTrading } from '../context/TradingContext';
import { formatCurrency } from '../utils/currency';
import { X, Trophy, TrendingUp, Users, ArrowUp, ArrowDown, Minus } from 'lucide-react';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ isOpen, onClose }) => {
  const { leaderboard, account, theme } = useTrading();

  if (!isOpen) return null;

  const isLight = theme === 'light';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in">
      <div className={`w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border transition-colors ${
        isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#1a1f2e] border-[#2e354b] text-gray-100'
      }`}>
        {/* Header */}
        <div className={`p-5 border-b flex items-center justify-between ${
          isLight ? 'border-slate-200 bg-slate-50' : 'border-[#2e354b] bg-[#161a26]'
        }`}>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-400 to-yellow-500 flex items-center justify-center shadow-lg shadow-yellow-500/20">
              <Trophy className="w-6 h-6 text-black" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Forex Grow Live Leaderboard
                </h2>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                  TOP 8 RANKING
                </span>
              </div>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                Selected from <strong>1,42,850+ Active Forex Grow Traders</strong> • Rotates Hourly
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

        {/* List of Traders */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {leaderboard.map((trader) => {
            const isTop3 = trader.rank <= 3;
            const rankBadgeColor =
              trader.rank === 1
                ? 'bg-amber-400 text-black font-black'
                : trader.rank === 2
                ? 'bg-slate-300 text-black font-black'
                : trader.rank === 3
                ? 'bg-amber-600 text-white font-black'
                : isLight ? 'bg-slate-200 text-slate-700 font-bold' : 'bg-[#222838] text-gray-400 font-bold';

            return (
              <div
                key={trader.name}
                className={`flex items-center justify-between p-3.5 rounded-2xl border transition ${
                  isTop3
                    ? isLight ? 'bg-amber-50/50 border-amber-200 shadow-sm' : 'bg-[#222838] border-trade-border/80 shadow-md'
                    : isLight ? 'bg-slate-50/80 border-slate-200/80 hover:bg-slate-100' : 'bg-[#121620]/60 border-transparent hover:bg-[#222838]'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs ${rankBadgeColor}`}>
                    #{trader.rank}
                  </div>
                  <span className="text-xl">{trader.avatar}</span>
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{trader.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                        isLight ? 'bg-slate-200 text-slate-600' : 'bg-[#121620] text-gray-400'
                      }`}>
                        {trader.country}
                      </span>
                      {trader.rankChange === 'UP' && (
                        <span className="text-[10px] text-emerald-500 font-bold flex items-center" title="Rank climbed up">
                          <ArrowUp className="w-3 h-3 stroke-[3]" />
                        </span>
                      )}
                      {trader.rankChange === 'DOWN' && (
                        <span className="text-[10px] text-rose-500 font-bold flex items-center" title="Rank dropped">
                          <ArrowDown className="w-3 h-3 stroke-[3]" />
                        </span>
                      )}
                      {trader.rankChange === 'SAME' && (
                        <span className="text-[10px] text-gray-500 flex items-center">
                          <Minus className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                    <div className={`text-[11px] flex items-center space-x-2 mt-0.5 ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                      <span className="text-emerald-500 font-semibold">{trader.winRate}% Win Rate</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-black mono-num text-emerald-500 flex items-center justify-end space-x-1">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>+{formatCurrency(trader.profit, account.currency)}</span>
                  </div>
                  <span className={`text-[10px] font-semibold uppercase ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>
                    Session Profit
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className={`p-4 border-t flex items-center justify-between text-xs ${
          isLight ? 'border-slate-200 bg-slate-50 text-slate-500' : 'border-[#2e354b] bg-[#121620]/60 text-gray-400'
        }`}>
          <span className="flex items-center space-x-1.5">
            <Users className="w-4 h-4 text-emerald-500" />
            <span>Live pool from 1,42,850+ traders • Rotates real-time</span>
          </span>
          <span className="text-emerald-500 font-bold">Your Rank: #48</span>
        </div>
      </div>
    </div>
  );
};

