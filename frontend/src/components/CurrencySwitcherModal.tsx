import React from 'react';
import { useTrading } from '../context/TradingContext';
import { CURRENCY_CONFIGS } from '../utils/currency';
import { X, Globe2, Check } from 'lucide-react';
import { CurrencyCode } from '../types';

interface CurrencySwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CurrencySwitcherModal: React.FC<CurrencySwitcherModalProps> = ({ isOpen, onClose }) => {
  const { account, switchCurrency, theme } = useTrading();
  const isLight = theme === 'light';

  if (!isOpen) return null;

  const currencies = Object.values(CURRENCY_CONFIGS);

  const handleSelect = (code: CurrencyCode) => {
    switchCurrency(code);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
      <div className={`w-full max-w-lg border rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] transition-colors duration-200 ${
        isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#1a1f2e] border-[#2e354b] text-white'
      }`}>
        {/* Header */}
        <div className={`p-5 border-b flex items-center justify-between ${
          isLight ? 'border-slate-200' : 'border-[#2e354b]'
        }`}>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-400 to-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Globe2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Select Account Currency</h2>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>All balances & payouts will auto-convert seamlessly</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-xl transition ${
              isLight ? 'text-slate-400 hover:text-slate-800 hover:bg-slate-100' : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Currency Grid */}
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {currencies.map((curr) => {
            const isSelected = account.currency === curr.code;

            return (
              <div
                key={curr.code}
                onClick={() => handleSelect(curr.code)}
                className={`p-3.5 rounded-2xl cursor-pointer border flex items-center justify-between transition ${
                  isSelected
                    ? (isLight ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-sm' : 'bg-[#222838] border-trade-green shadow-lg shadow-emerald-500/10')
                    : (isLight
                        ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                        : 'bg-[#121620]/60 hover:bg-[#222838] border-[#2e354b] text-white')
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{curr.flag}</span>
                  <div>
                    <div className={`text-xs font-bold flex items-center space-x-1.5 ${
                      isLight ? 'text-slate-900' : 'text-white'
                    }`}>
                      <span>{curr.code}</span>
                      <span className={`text-[10px] font-mono ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>({curr.symbol})</span>
                    </div>
                    <div className={`text-[11px] truncate max-w-[130px] ${
                      isLight ? 'text-slate-500' : 'text-gray-400'
                    }`}>{curr.name}</div>
                  </div>
                </div>

                {isSelected ? (
                  <Check className="w-4 h-4 text-trade-green stroke-[3]" />
                ) : (
                  <span className={`text-[10px] font-mono ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>
                    1$ = {curr.rateAgainstUSD}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

