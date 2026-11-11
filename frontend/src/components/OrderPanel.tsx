import React, { useState, useEffect } from 'react';
import { useTrading } from '../context/TradingContext';
import { CURRENCY_CONFIGS, formatCurrency, getQuickAmountChips } from '../utils/currency';
import { ArrowUp, ArrowDown, Clock, Plus, Minus } from 'lucide-react';

const DURATION_PRESETS = [
  { label: '5s', seconds: 5 },
  { label: '10s', seconds: 10 },
  { label: '15s', seconds: 15 },
  { label: '30s', seconds: 30 },
  { label: '1m', seconds: 60 },
  { label: '2m', seconds: 120 },
  { label: '5m', seconds: 300 },
];

export const OrderPanel: React.FC = () => {
  const { selectedAsset, placeTrade, account, theme } = useTrading();
  const [duration, setDuration] = useState<number>(30);
  const [amountUSD, setAmountUSD] = useState<number>(50);

  const isLight = theme === 'light';
  const curr = CURRENCY_CONFIGS[account.currency] || CURRENCY_CONFIGS.USD;
  const quickChips = getQuickAmountChips(account.currency);

  // Automatically adjust amount when currency switches
  useEffect(() => {
    const primaryChip = quickChips[0] || 50;
    setAmountUSD(primaryChip / curr.rateAgainstUSD);
  }, [account.currency]);

  const payout = selectedAsset?.payout ?? 85;
  const profitUSD = Number((amountUSD * (payout / 100)).toFixed(4));
  const totalReturnUSD = Number((amountUSD + profitUSD).toFixed(4));

  const currentBalance = account.activeAccountType === 'DEMO' ? account.demoBalance : account.realBalance;
  const isInsufficient = isNaN(amountUSD) || currentBalance < amountUSD || amountUSD <= 0;

  const getCurrencyStep = (code: string) => {
    switch (code) {
      case 'INR': return 100;
      case 'IDR': return 50000;
      case 'JPY': return 500;
      case 'NGN': return 5000;
      case 'BRL':
      case 'TRY':
      case 'AED': return 25;
      default: return 5;
    }
  };

  const handleAdjustAmount = (multiplier: number) => {
    const stepLocal = getCurrencyStep(account.currency);
    const validAmount = isNaN(amountUSD) || amountUSD <= 0 ? stepLocal / curr.rateAgainstUSD : amountUSD;
    const currentLocal = Math.round(validAmount * curr.rateAgainstUSD);
    const newLocal = Math.max(stepLocal, currentLocal + multiplier * stepLocal);
    setAmountUSD(newLocal / curr.rateAgainstUSD);
  };

  const handleSetQuickLocalAmount = (localAmount: number) => {
    if (localAmount > 0) {
      setAmountUSD(localAmount / curr.rateAgainstUSD);
    }
  };

  const handlePercentOfBalance = (percent: number) => {
    if (currentBalance <= 0) return;
    const calculatedUSD = (currentBalance * percent) / 100;
    const minUSD = getCurrencyStep(account.currency) / curr.rateAgainstUSD;
    setAmountUSD(Math.max(minUSD, calculatedUSD));
  };

  const handleTrade = (direction: 'UP' | 'DOWN') => {
    if (isInsufficient) return;
    const finalAmount = Math.max(0.1, Number(amountUSD.toFixed(4)));
    placeTrade(direction, finalAmount, duration);
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') {
        e.preventDefault();
        handleTrade('UP');
      } else if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') {
        e.preventDefault();
        handleTrade('DOWN');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [amountUSD, duration, isInsufficient, currentBalance]);

  return (
    <>
      {/* ================= DESKTOP ORDER PANEL (lg:flex) ================= */}
      <div className={`hidden lg:flex w-80 border-l p-5 flex-col justify-between select-none transition-colors duration-200 ${
        isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#181c27] border-[#2e354b] text-white'
      }`}>
        <div className="space-y-5">
          {/* Time Selector */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold mb-2">
              <span className={`flex items-center space-x-1.5 ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                <Clock className="w-3.5 h-3.5" />
                <span>Expiry Duration</span>
              </span>
              <span className={`font-bold ${isLight ? 'text-slate-800' : 'text-gray-200'}`}>{duration}s</span>
            </div>

            <div className={`grid grid-cols-5 gap-1.5 p-1.5 rounded-xl border transition-colors ${
              isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#121620] border-[#2e354b]'
            }`}>
              {DURATION_PRESETS.map((preset) => (
                <button
                  key={preset.seconds}
                  onClick={() => setDuration(preset.seconds)}
                  className={`py-2 rounded-lg text-xs font-bold transition ${
                    duration === preset.seconds
                      ? (isLight
                          ? 'bg-emerald-600 text-white shadow-md'
                          : 'bg-[#222838] text-emerald-400 shadow-md border border-emerald-500/30')
                      : (isLight ? 'text-slate-600 hover:text-slate-900' : 'text-gray-400 hover:text-gray-200')
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Investment Amount */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold mb-2">
              <span className={isLight ? 'text-slate-600' : 'text-gray-400'}>Investment ({curr.code})</span>
              <span className={`text-[11px] font-mono ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                ≈ {formatCurrency(amountUSD, account.currency)}
              </span>
            </div>

            <div className={`flex items-center border rounded-2xl px-3 py-2 transition-colors ${
              isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#121620] border-[#2e354b]'
            }`}>
              <button
                onClick={() => handleAdjustAmount(-1)}
                className={`p-2 rounded-xl transition ${
                  isLight ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200' : 'text-gray-400 hover:text-white hover:bg-[#222838]'
                }`}
              >
                <Minus className="w-4 h-4" />
              </button>
              <div className="flex-1 text-center">
                <span className={`text-sm font-bold mr-1 ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>{curr.symbol}</span>
                <input
                  type="number"
                  value={Math.round(amountUSD * curr.rateAgainstUSD)}
                  onChange={(e) => {
                    const localVal = Number(e.target.value);
                    if (localVal >= 0) {
                      setAmountUSD(localVal / curr.rateAgainstUSD);
                    }
                  }}
                  className={`w-28 bg-transparent text-center text-xl font-black mono-num focus:outline-none ${
                    isLight ? 'text-slate-900' : 'text-white'
                  }`}
                />
              </div>
              <button
                onClick={() => handleAdjustAmount(1)}
                className={`p-2 rounded-xl transition ${
                  isLight ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200' : 'text-gray-400 hover:text-white hover:bg-[#222838]'
                }`}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Amount Chips in Local Currency */}
            <div className="flex justify-between items-center gap-1.5 mt-2">
              {quickChips.map((chip) => {
                const currentLocal = Math.round(amountUSD * curr.rateAgainstUSD);
                const isActive = Math.abs(currentLocal - chip) < 1;
                return (
                  <button
                    key={chip}
                    onClick={() => handleSetQuickLocalAmount(chip)}
                    className={`flex-1 py-1.5 text-xs rounded-xl border font-bold transition truncate ${
                      isActive
                        ? (isLight ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400')
                        : (isLight ? 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200' : 'border-[#2e354b] bg-[#121620] text-gray-400 hover:text-white')
                    }`}
                  >
                    {curr.symbol}{chip >= 1000 ? `${(chip / 1000).toFixed(0)}k` : chip}
                  </button>
                );
              })}
            </div>

            {/* Balance % chips */}
            <div className="flex justify-between items-center gap-1.5 mt-2">
              {[10, 25, 50, 100].map((pct) => (
                <button
                  key={pct}
                  onClick={() => handlePercentOfBalance(pct)}
                  className={`flex-1 py-1 text-[11px] font-bold rounded-lg border transition ${
                    isLight
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                      : 'bg-[#222838]/60 hover:bg-[#222838] text-gray-400 hover:text-gray-200 border-[#2e354b]'
                  }`}
                >
                  {pct === 100 ? 'MAX' : `${pct}%`}
                </button>
              ))}
            </div>
          </div>

          {/* Payout & Projected Profit Card */}
          <div className={`border rounded-2xl p-4 shadow-inner transition-colors ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#121620] border-[#2e354b]'
          }`}>
            <div className={`flex justify-between items-center text-xs mb-1 ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
              <span>Payout Rate</span>
              <span className="font-extrabold text-emerald-500">+{payout}%</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className={`text-xs ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>Projected Return</span>
              <div className="text-right">
                <div className={`text-lg font-black mono-num ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {formatCurrency(totalReturnUSD, account.currency)}
                </div>
                <div className="text-xs font-bold text-emerald-500 mono-num">
                  (+{formatCurrency(profitUSD, account.currency)})
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-4">
          {isInsufficient && (
            <div className="text-xs text-center text-rose-500 font-bold bg-rose-500/10 py-1.5 rounded-xl border border-rose-500/20">
              Insufficient funds
            </div>
          )}

          {/* UP (CALL) */}
          <button
            disabled={isInsufficient}
            onClick={() => handleTrade('UP')}
            className="w-full bg-[#00c679] hover:bg-[#00e089] disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-4 px-6 rounded-2xl flex items-center justify-between shadow-xl shadow-emerald-500/25 transition transform active:scale-[0.98] group"
          >
            <div className="text-left">
              <div className="flex items-center space-x-2">
                <span className="text-2xl font-black tracking-wider leading-none">UP</span>
                <span className="text-[10px] font-bold bg-black/25 px-1.5 py-0.5 rounded text-white/90">
                  [W]
                </span>
              </div>
              <div className="text-[10px] font-bold opacity-80 uppercase tracking-widest mt-1">CALL OPTION</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition">
              <ArrowUp className="w-6 h-6 stroke-[3]" />
            </div>
          </button>

          {/* DOWN (PUT) */}
          <button
            disabled={isInsufficient}
            onClick={() => handleTrade('DOWN')}
            className="w-full bg-[#ff3d5a] hover:bg-[#ff546e] disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-4 px-6 rounded-2xl flex items-center justify-between shadow-xl shadow-rose-500/25 transition transform active:scale-[0.98] group"
          >
            <div className="text-left">
              <div className="flex items-center space-x-2">
                <span className="text-2xl font-black tracking-wider leading-none">DOWN</span>
                <span className="text-[10px] font-bold bg-black/25 px-1.5 py-0.5 rounded text-white/90">
                  [S]
                </span>
              </div>
              <div className="text-[10px] font-bold opacity-80 uppercase tracking-widest mt-1">PUT OPTION</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition">
              <ArrowDown className="w-6 h-6 stroke-[3]" />
            </div>
          </button>
        </div>
      </div>

      {/* ================= MOBILE BOTTOM ORDER CONTROLS (lg:hidden) ================= */}
      <div className={`lg:hidden w-full flex-shrink-0 border-t p-2 sm:p-2.5 space-y-2 select-none shadow-2xl z-20 transition-colors duration-200 ${
        isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#181c27] border-[#2e354b] text-white'
      }`}>
        {/* Quick Amount Chips on Mobile */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-0.5 scrollbar-none">
          {quickChips.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => handleSetQuickLocalAmount(chip)}
              className={`px-2 py-1 text-[10px] font-bold rounded-lg whitespace-nowrap transition border ${
                Math.round(amountUSD * curr.rateAgainstUSD) === chip
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 font-black'
                  : isLight
                  ? 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                  : 'bg-[#121620] text-gray-400 border-[#2e354b] hover:text-white'
              }`}
            >
              {curr.symbol}{chip >= 1000 ? `${(chip / 1000).toFixed(chip % 1000 === 0 ? 0 : 1)}k` : chip}
            </button>
          ))}
          <div className="flex space-x-1 pl-1 border-l border-white/10">
            {[25, 50, 100].map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => handlePercentOfBalance(pct)}
                className={`px-1.5 py-1 text-[9px] font-extrabold rounded-lg whitespace-nowrap transition border ${
                  isLight
                    ? 'bg-slate-200 text-slate-700 border-slate-300'
                    : 'bg-[#222838] text-gray-300 border-[#2e354b] hover:text-white'
                }`}
              >
                {pct === 100 ? 'MAX' : `${pct}%`}
              </button>
            ))}
          </div>
        </div>

        {/* Row 1: Duration Selector & Amount in compact row */}
        <div className="flex items-center space-x-2">
          {/* Duration Chips */}
          <div className={`flex items-center border rounded-xl p-0.5 sm:p-1 space-x-1 flex-shrink-0 ${
            isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#121620] border-[#2e354b]'
          }`}>
            {DURATION_PRESETS.slice(0, 5).map((p) => (
              <button
                key={p.seconds}
                onClick={() => setDuration(p.seconds)}
                className={`px-1.5 sm:px-2 py-1 text-[10px] sm:text-[11px] font-bold rounded-lg transition ${
                  duration === p.seconds
                    ? (isLight ? 'bg-emerald-600 text-white shadow-sm' : 'bg-[#222838] text-emerald-400 border border-emerald-500/30')
                    : (isLight ? 'text-slate-600' : 'text-gray-400')
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Amount Stepper */}
          <div className={`flex-1 flex items-center border rounded-xl px-2 py-1 justify-between ${
            isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#121620] border-[#2e354b]'
          }`}>
            <button
              onClick={() => handleAdjustAmount(-1)}
              className={`p-1 ${isLight ? 'text-slate-500 hover:text-slate-900' : 'text-gray-400 hover:text-white'}`}
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className={`text-xs font-black mono-num ${isLight ? 'text-slate-900' : 'text-white'}`}>
              {formatCurrency(amountUSD, account.currency)}
            </span>
            <button
              onClick={() => handleAdjustAmount(1)}
              className={`p-1 ${isLight ? 'text-slate-500 hover:text-slate-900' : 'text-gray-400 hover:text-white'}`}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Projected Profit Tag */}
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-[10px] font-bold px-2 py-1.5 rounded-xl text-center flex-shrink-0">
            +{payout}%
          </div>
        </div>

        {/* Warning if insufficient funds */}
        {isInsufficient && (
          <div className="text-[10px] text-center text-rose-500 font-bold bg-rose-500/10 py-1 rounded-lg border border-rose-500/20">
            ⚠️ Insufficient funds for trade amount ({formatCurrency(currentBalance, account.currency)} available)
          </div>
        )}

        {/* Row 2: Big Dual UP and DOWN Buttons side-by-side with Return Amount */}
        <div className="grid grid-cols-2 gap-2">
          <button
            disabled={isInsufficient}
            onClick={() => handleTrade('UP')}
            className="bg-[#00c679] hover:bg-[#00e089] disabled:opacity-50 text-white font-black py-2.5 sm:py-3 px-3 rounded-xl flex items-center justify-between shadow-lg shadow-emerald-500/20 active:scale-95 transition"
          >
            <div className="flex items-center space-x-1.5">
              <ArrowUp className="w-5 h-5 stroke-[3]" />
              <div className="text-left leading-tight">
                <span className="text-sm sm:text-base font-black tracking-wide block">UP</span>
                <span className="text-[9px] text-white/80 font-normal">CALL</span>
              </div>
            </div>
            <span className="text-[11px] font-mono font-bold bg-black/25 px-1.5 py-0.5 rounded">
              +{formatCurrency(profitUSD, account.currency)}
            </span>
          </button>

          <button
            disabled={isInsufficient}
            onClick={() => handleTrade('DOWN')}
            className="bg-[#ff3d5a] hover:bg-[#ff546e] disabled:opacity-50 text-white font-black py-2.5 sm:py-3 px-3 rounded-xl flex items-center justify-between shadow-lg shadow-rose-500/20 active:scale-95 transition"
          >
            <div className="flex items-center space-x-1.5">
              <ArrowDown className="w-5 h-5 stroke-[3]" />
              <div className="text-left leading-tight">
                <span className="text-sm sm:text-base font-black tracking-wide block">DOWN</span>
                <span className="text-[9px] text-white/80 font-normal">PUT</span>
              </div>
            </div>
            <span className="text-[11px] font-mono font-bold bg-black/25 px-1.5 py-0.5 rounded">
              +{formatCurrency(profitUSD, account.currency)}
            </span>
          </button>
        </div>
      </div>
    </>
  );
};
