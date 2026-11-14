import React, { useState, useEffect } from 'react';
import { useTrading } from '../context/TradingContext';
import { formatCurrency } from '../utils/currency';
import { ArrowUp, ArrowDown, CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react';

interface TradesDrawerProps {
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const TradesDrawer: React.FC<TradesDrawerProps> = ({ isMobileOpen, onCloseMobile }) => {
  const { activeTrades, tradeHistory, currentPrice, account, assets, selectedAsset, theme } = useTrading();
  const [activeTab, setActiveTab] = useState<'OPEN' | 'CLOSED'>('OPEN');
  const [now, setNow] = useState(Date.now());
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isLight = theme === 'light';

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(timer);
  }, []);

  const [filterMode, setFilterMode] = useState<'PAIR' | 'ALL'>('PAIR');

  // Match asset IDs flexibly (e.g. 'EURUSD_OTC' vs 'EUR/USD (OTC)' vs 'EURUSD')
  const isMatchingAsset = (tradeAssetId?: string, currentAssetId?: string) => {
    if (!tradeAssetId || !currentAssetId) return false;
    if (tradeAssetId === currentAssetId) return true;
    const cleanTrade = tradeAssetId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const cleanCurrent = currentAssetId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    return cleanTrade === cleanCurrent || cleanTrade.includes(cleanCurrent) || cleanCurrent.includes(cleanTrade);
  };

  // Filter trades so only the active account (DEMO or REAL) history and active trades show
  const accountActiveTrades = activeTrades.filter(
    (t) => !t.accountType || t.accountType === account.activeAccountType
  );
  const accountTradeHistory = tradeHistory.filter(
    (t) => !t.accountType || t.accountType === account.activeAccountType
  );

  // Pair-wise filtering: when in PAIR mode, only show trades matching the selected chart pair
  const filteredActiveTrades = filterMode === 'PAIR' && selectedAsset
    ? accountActiveTrades.filter((t) => isMatchingAsset(t.assetId, selectedAsset.id))
    : accountActiveTrades;

  const filteredTradeHistory = filterMode === 'PAIR' && selectedAsset
    ? accountTradeHistory.filter((t) => isMatchingAsset(t.assetId, selectedAsset.id))
    : accountTradeHistory;

  return (
    <div
      className={`border-t flex flex-col select-none transition-all duration-300 ${
        isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#181c27] border-[#2e354b] text-white'
      } ${
        isMobileOpen
          ? `fixed inset-x-0 bottom-14 z-40 h-[70vh] shadow-2xl rounded-t-3xl border-t-2 border-emerald-500/40 animate-in slide-in-from-bottom duration-200 ${isLight ? 'bg-white' : 'bg-[#181c27]'}`
          : `hidden lg:flex ${isCollapsed ? 'h-10' : 'h-52'}`
      }`}
    >
      {/* Drawer Header Tabs */}
      <div className={`flex items-center justify-between px-4 sm:px-6 pt-2.5 pb-2 border-b ${
        isLight ? 'border-slate-200' : 'border-[#2e354b]/50'
      }`}>
        <div className="flex items-center space-x-3 sm:space-x-5">
          <button
            onClick={() => setActiveTab('OPEN')}
            className={`pb-1 text-xs font-bold uppercase tracking-wider flex items-center space-x-2 border-b-2 transition ${
              activeTab === 'OPEN'
                ? 'border-trade-green text-trade-green'
                : (isLight ? 'border-transparent text-slate-500 hover:text-slate-800' : 'border-transparent text-gray-400 hover:text-gray-200')
            }`}
          >
            <span>Active Trades</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${
              isLight ? 'bg-slate-100 text-slate-700' : 'bg-[#222838] text-gray-300'
            }`}>
              {filteredActiveTrades.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('CLOSED')}
            className={`pb-1 text-xs font-bold uppercase tracking-wider flex items-center space-x-2 border-b-2 transition ${
              activeTab === 'CLOSED'
                ? 'border-trade-green text-trade-green'
                : (isLight ? 'border-transparent text-slate-500 hover:text-slate-800' : 'border-transparent text-gray-400 hover:text-gray-200')
            }`}
          >
            <span>
              History ({filterMode === 'PAIR' && selectedAsset ? selectedAsset.name : 'All Pairs'} · {account.currency})
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${
              isLight ? 'bg-slate-100 text-slate-700' : 'bg-[#222838] text-gray-300'
            }`}>
              {filteredTradeHistory.length}
            </span>
          </button>

          {/* Pair-wise vs All Pairs Filter Toggle */}
          <div className="hidden sm:flex items-center p-0.5 rounded-xl border border-gray-700/40 bg-black/30 space-x-1">
            <button
              onClick={() => setFilterMode('PAIR')}
              className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black transition flex items-center space-x-1 ${
                filterMode === 'PAIR'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
              title={`Show only trades for ${selectedAsset?.name || 'this pair'}`}
            >
              <span>{selectedAsset?.name || 'This Pair'}</span>
            </button>
            <button
              onClick={() => setFilterMode('ALL')}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-black transition ${
                filterMode === 'ALL'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="Show trades across all assets"
            >
              <span>All Pairs</span>
            </button>
          </div>
        </div>

        {/* Desktop Collapse / Mobile Close Button */}
        <div className="flex items-center space-x-2">
          {isMobileOpen ? (
            <button
              onClick={onCloseMobile}
              className="p-1 text-xs font-bold text-emerald-500 hover:text-emerald-600"
            >
              Done
            </button>
          ) : (
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={`p-1 rounded-lg transition ${
                isLight ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-100' : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {isCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Content (if not collapsed) */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-3">
          {activeTab === 'OPEN' ? (
            filteredActiveTrades.length === 0 ? (
              <div className={`h-full flex flex-col items-center justify-center text-xs py-6 ${
                isLight ? 'text-slate-400' : 'text-gray-500'
              }`}>
                <Clock className="w-6 h-6 mb-2 opacity-40" />
                <span>No active open trades in {account.activeAccountType === 'DEMO' ? 'Demo Practice' : 'Live Real'} account.</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredActiveTrades.map((trade) => {
                  const remainingMs = Math.max(0, trade.expiryTime - now);
                  const remainingSec = Math.ceil(remainingMs / 1000);
                  const tradeAsset = assets.find((a) => a.id === trade.assetId);
                  const livePrice = tradeAsset?.currentPrice ?? (trade.assetId === selectedAsset?.id ? currentPrice : trade.entryPrice);
                  const dec = tradeAsset?.decimalPlaces ?? 4;
                  const isCurrentWinning =
                    trade.direction === 'UP'
                      ? livePrice > trade.entryPrice
                      : livePrice < trade.entryPrice;

                  return (
                    <div
                      key={trade.id}
                      className={`border rounded-2xl p-3 flex items-center justify-between shadow-sm transition-colors ${
                        isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#121620] border-[#2e354b]'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                            trade.direction === 'UP' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'
                          }`}
                        >
                          {trade.direction === 'UP' ? (
                            <ArrowUp className="w-5 h-5 stroke-[2.5]" />
                          ) : (
                            <ArrowDown className="w-5 h-5 stroke-[2.5]" />
                          )}
                        </div>
                        <div>
                          <div className={`text-xs font-bold flex items-center space-x-1.5 ${
                            isLight ? 'text-slate-800' : 'text-white'
                          }`}>
                            <span>{trade.assetId}</span>
                            <span className={`text-[10px] font-mono ${
                              isLight ? 'text-slate-500' : 'text-gray-400'
                            }`}>
                              {formatCurrency(trade.amount, account.currency)}
                            </span>
                          </div>
                          <div className={`text-[11px] font-mono ${
                            isLight ? 'text-slate-500' : 'text-gray-400'
                          }`}>
                            Entry: <span className={isLight ? 'text-slate-800' : 'text-gray-200'}>{trade.entryPrice.toFixed(dec)}</span>
                            <span className="mx-1.5 opacity-40">•</span>
                            Now: <span className={isCurrentWinning ? 'text-trade-green font-bold' : 'text-trade-red font-bold'}>{livePrice.toFixed(dec)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-black mono-num text-amber-500">
                          {remainingSec}s
                        </div>
                        <div
                          className={`text-[11px] font-bold mono-num ${
                            isCurrentWinning ? 'text-trade-green' : 'text-trade-red'
                          }`}
                        >
                          {isCurrentWinning
                            ? `+${formatCurrency(trade.amount * (trade.payout / 100), account.currency)}`
                            : formatCurrency(0, account.currency)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : filteredTradeHistory.length === 0 ? (
            <div className={`h-full flex flex-col items-center justify-center text-xs py-6 space-y-1.5 ${
              isLight ? 'text-slate-400' : 'text-gray-500'
            }`}>
              <span>
                {filterMode === 'PAIR' && selectedAsset
                  ? `No closed trades for ${selectedAsset.name} in ${account.activeAccountType === 'DEMO' ? 'Demo' : 'Live Real'}.`
                  : `No closed trades in ${account.activeAccountType === 'DEMO' ? 'Demo Practice' : 'Live Real'} account yet.`}
              </span>
              {filterMode === 'PAIR' && accountTradeHistory.length > 0 && (
                <button
                  onClick={() => setFilterMode('ALL')}
                  className="text-emerald-400 font-bold hover:underline text-[11px]"
                >
                  View all {accountTradeHistory.length} trades across all pairs →
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTradeHistory.map((trade) => {
                const won = trade.status === 'WON';
                const tie = trade.status === 'TIE';
                const tradeAsset = assets.find((a) => a.id === trade.assetId);
                const dec = tradeAsset?.decimalPlaces ?? 4;
                const activeCurrency = account.currency || trade.currency || 'INR';
                const tradeTime = new Date(trade.openTime || (trade as any).entryTime || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                return (
                  <div
                    key={trade.id}
                    className={`border rounded-xl px-4 py-2.5 flex items-center justify-between text-xs transition-colors ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#121620] border-[#2e354b]'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      {won ? (
                        <CheckCircle2 className="w-4 h-4 text-trade-green shrink-0" />
                      ) : tie ? (
                        <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-trade-red shrink-0" />
                      )}
                      <span className={`font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>{trade.assetId}</span>
                      <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                        trade.direction === 'UP' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'
                      }`}>
                        {trade.direction} {formatCurrency(trade.amount, activeCurrency)}
                      </span>
                      <span className={`font-mono hidden sm:inline ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                        {trade.entryPrice.toFixed(dec)} → {trade.exitPrice !== undefined ? trade.exitPrice.toFixed(dec) : '-'}
                        <span className="mx-1.5 opacity-40">•</span>
                        <span>{tradeTime}</span>
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-bold mono-num">
                        {won ? (
                          <span className="text-trade-green font-black">
                            +{formatCurrency(trade.profit ?? 0, activeCurrency)}
                          </span>
                        ) : tie ? (
                          <span className={isLight ? 'text-slate-500' : 'text-gray-400 font-bold'}>{formatCurrency(0, activeCurrency)} (Tie)</span>
                        ) : (
                          <span className="text-trade-red font-black">
                            -{formatCurrency(trade.amount, activeCurrency)}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] font-mono text-gray-500">
                        {activeCurrency}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
