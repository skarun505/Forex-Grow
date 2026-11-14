import React from 'react';
import { useTrading } from '../context/TradingContext';
import { formatCurrency } from '../utils/currency';
import { ArrowUp, ArrowDown, CheckCircle, XCircle, X } from 'lucide-react';

export const TradeResultModal: React.FC = () => {
  const { lastSettledResult, closeSettledResult, account, assets } = useTrading();

  if (!lastSettledResult) return null;

  const won = lastSettledResult.status === 'WON';
  const tie = lastSettledResult.status === 'TIE';
  const asset = assets.find((a) => a.id === lastSettledResult.assetId);
  const dec = asset?.decimalPlaces ?? 4;

  return (
    <div
      onClick={closeSettledResult}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-[#1a1f2e] border border-[#2e354b] rounded-3xl shadow-2xl p-6 flex flex-col items-center text-center relative overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        <button
          onClick={closeSettledResult}
          className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-white rounded-lg transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Glow Header */}
        <div
          className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${
            won
              ? 'bg-emerald-500/20 text-trade-green shadow-xl shadow-emerald-500/30'
              : tie
              ? 'bg-amber-500/20 text-amber-400 shadow-xl shadow-amber-500/30'
              : 'bg-rose-500/20 text-trade-red shadow-xl shadow-rose-500/30'
          }`}
        >
          {won ? (
            <CheckCircle className="w-10 h-10" />
          ) : tie ? (
            <span className="text-2xl font-bold">⚖️</span>
          ) : (
            <XCircle className="w-10 h-10" />
          )}
        </div>

        <h3 className="text-xl font-black text-white tracking-wide">
          {won ? 'TRADE WON!' : tie ? 'TRADE TIED' : 'TRADE EXPIRED'}
        </h3>
        <p className="text-xs text-gray-400 mt-1">
          {won
            ? 'Option closed in the money'
            : tie
            ? 'Exit price matched strike price'
            : 'Option closed out of the money'}
        </p>

        {/* Net Profit Big Banner */}
        <div className="my-5 w-full bg-[#121620] border border-[#2e354b] rounded-2xl p-4">
          <div className="text-xs text-gray-400 uppercase font-semibold">Net Result</div>
          <div
            className={`text-3xl font-black mono-num mt-1 ${
              won ? 'text-trade-green' : tie ? 'text-gray-300' : 'text-trade-red'
            }`}
          >
            {won
              ? `+${formatCurrency(lastSettledResult.profit ?? 0, account.currency)}`
              : tie
              ? formatCurrency(0, account.currency)
              : `-${formatCurrency(lastSettledResult.amount, account.currency)}`}
          </div>
          <div className="text-[11px] text-gray-400 font-semibold mt-1">
            {won ? `ROI: +${lastSettledResult.payout}%` : ''}
          </div>
        </div>

        {/* Trade Details Breakdown */}
        <div className="w-full space-y-2 text-xs border-t border-[#2e354b]/50 pt-3 text-left">
          <div className="flex justify-between">
            <span className="text-gray-400">Asset:</span>
            <span className="font-bold text-white">{lastSettledResult.assetId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Option:</span>
            <span
              className={`font-bold flex items-center space-x-1 ${
                lastSettledResult.direction === 'UP' ? 'text-trade-green' : 'text-trade-red'
              }`}
            >
              {lastSettledResult.direction === 'UP' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
              <span>
                {lastSettledResult.direction} ({formatCurrency(lastSettledResult.amount, account.currency)})
              </span>
            </span>
          </div>
          <div className="flex justify-between font-mono">
            <span className="text-gray-400">Strike / Entry:</span>
            <span className="text-gray-200">{lastSettledResult.entryPrice.toFixed(dec)}</span>
          </div>
          <div className="flex justify-between font-mono">
            <span className="text-gray-400">Exit Price:</span>
            <span className="text-gray-200">{lastSettledResult.exitPrice !== undefined ? lastSettledResult.exitPrice.toFixed(dec) : '-'}</span>
          </div>
        </div>

        <button
          onClick={closeSettledResult}
          className="w-full mt-5 bg-gradient-to-r from-trade-green to-emerald-500 hover:from-trade-greenHover hover:to-emerald-400 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition active:scale-95"
        >
          Continue Trading
        </button>
      </div>
    </div>
  );
};
