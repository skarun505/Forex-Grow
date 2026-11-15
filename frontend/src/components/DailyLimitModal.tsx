import React, { useState, useEffect } from 'react';
import { Shield, Check, X, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '../utils/currency';
import { CurrencyCode } from '../types';

interface DailyLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  currency: CurrencyCode;
  userId: string;
  onSaved?: (limit: number, enabled: boolean) => void;
}

export const DailyLimitModal: React.FC<DailyLimitModalProps> = ({
  isOpen,
  onClose,
  currency,
  userId,
  onSaved,
}) => {
  const isUsd = currency === 'USD';
  const presets = isUsd ? [20, 50, 100, 250, 500] : [2000, 5000, 10000, 25000, 50000];

  const [enabled, setEnabled] = useState<boolean>(false);
  const [amount, setAmount] = useState<number>(isUsd ? 50 : 5000);
  const [customInput, setCustomInput] = useState<string>('');
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && userId) {
      try {
        const storedEnabled = localStorage.getItem('forexgrow_daily_limit_enabled_' + userId) === 'true';
        const storedAmt = Number(localStorage.getItem('forexgrow_daily_limit_' + userId)) || (isUsd ? 50 : 5000);
        setEnabled(storedEnabled);
        setAmount(storedAmt);
        setCustomInput(storedAmt.toString());
        setSavedSuccess(false);
      } catch {
        setEnabled(false);
        setAmount(isUsd ? 50 : 5000);
      }
    }
  }, [isOpen, userId, isUsd]);

  if (!isOpen) return null;

  const handleSave = () => {
    const finalAmount = Number(customInput) > 0 ? Number(customInput) : amount;
    try {
      localStorage.setItem('forexgrow_daily_limit_enabled_' + userId, enabled ? 'true' : 'false');
      localStorage.setItem('forexgrow_daily_limit_' + userId, finalAmount.toString());
      if (onSaved) {
        onSaved(finalAmount, enabled);
      }
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 700);
    } catch (e) {
      console.error('Failed to save daily limit:', e);
    }
  };

  const handleDisable = () => {
    try {
      localStorage.setItem('forexgrow_daily_limit_enabled_' + userId, 'false');
      setEnabled(false);
      if (onSaved) {
        onSaved(amount, false);
      }
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 700);
    } catch (e) {
      console.error('Failed to disable daily limit:', e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-[#181e2b] border border-[#2b354c] rounded-2xl shadow-2xl p-6 text-white relative animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black tracking-wide">Daily Loss Protection Limit</h3>
            <p className="text-xs text-gray-400">Manage your capital risk ceiling to protect your account</p>
          </div>
        </div>

        {/* Enable / Disable Toggle Card */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#121622] border border-[#262f44] mb-5">
          <div className="flex items-center space-x-2.5">
            <div className={`w-2.5 h-2.5 rounded-full ${enabled ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
            <div>
              <div className="text-xs font-bold">{enabled ? 'Daily Limit Protection: ACTIVE' : 'Daily Limit Protection: OFF'}</div>
              <div className="text-[10px] text-gray-400">
                {enabled ? 'Trading halts automatically if daily loss is reached' : 'No ceiling enforced'}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setEnabled(!enabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              enabled ? 'bg-emerald-500' : 'bg-gray-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Amount Configuration */}
        <div className="space-y-3 mb-5">
          <label className="text-xs font-bold text-gray-300 block">
            Maximum Daily Loss Allowed ({currency})
          </label>

          {/* Quick Presets */}
          <div className="grid grid-cols-3 gap-2">
            {presets.map((p) => {
              const isSelected = Number(customInput) === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setAmount(p);
                    setCustomInput(p.toString());
                    if (!enabled) setEnabled(true);
                  }}
                  className={`py-2 px-2 rounded-xl text-xs font-black transition border ${
                    isSelected
                      ? 'bg-sky-500/25 border-sky-400 text-sky-300 shadow-sm'
                      : 'bg-[#121622] border-[#2b354c] text-gray-300 hover:border-gray-500 hover:text-white'
                  }`}
                >
                  {formatCurrency(p, currency)}
                </button>
              );
            })}
          </div>

          {/* Custom Input */}
          <div className="relative mt-2">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">
              {currency === 'INR' ? '₹' : '$'}
            </span>
            <input
              type="number"
              min="100"
              step="100"
              value={customInput}
              onChange={(e) => {
                setCustomInput(e.target.value);
                setAmount(Number(e.target.value) || 0);
                if (!enabled) setEnabled(true);
              }}
              placeholder={`Enter custom limit in ${currency}`}
              className="w-full bg-[#121622] border border-[#2b354c] focus:border-sky-400 rounded-xl py-2.5 pl-8 pr-4 text-sm font-bold text-white outline-none transition"
            />
          </div>
        </div>

        {/* Protection Note */}
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] leading-relaxed mb-5 flex items-start space-x-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>
            When enabled, if today's net losses on your Live account reach{' '}
            <strong className="text-white">{formatCurrency(Number(customInput) || amount, currency)}</strong>,
            placing new live trades will be blocked until the next trading day to preserve your capital.
          </span>
        </div>

        {/* Buttons */}
        <div className="flex items-center space-x-3">
          {enabled && (
            <button
              type="button"
              onClick={handleDisable}
              className="w-1/3 py-2.5 rounded-xl border border-rose-500/40 text-rose-400 hover:bg-rose-500/10 text-xs font-bold transition"
            >
              Disable
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={savedSuccess}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black transition flex items-center justify-center space-x-2 shadow-lg ${
              savedSuccess
                ? 'bg-emerald-500 text-white'
                : 'bg-gradient-to-r from-sky-500 to-emerald-500 hover:from-sky-400 hover:to-emerald-400 text-white shadow-sky-500/20'
            }`}
          >
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span>Limit Saved!</span>
              </>
            ) : (
              <span>Save Daily Limit</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
