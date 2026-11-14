import { CurrencyCode, CurrencyConfig } from '../types';

export const CURRENCY_CONFIGS: Record<CurrencyCode, CurrencyConfig> = {
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee', rateAgainstUSD: 95.0, flag: '🇮🇳' },
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', rateAgainstUSD: 1.0, flag: '🇺🇸' },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', rateAgainstUSD: 0.95, flag: '🇪🇺' },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', rateAgainstUSD: 0.80, flag: '🇬🇧' },
  BRL: { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', rateAgainstUSD: 6.10, flag: '🇧🇷' },
  IDR: { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah', rateAgainstUSD: 16500, flag: '🇮🇩' },
  JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen', rateAgainstUSD: 158.0, flag: '🇯🇵' },
  NGN: { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', rateAgainstUSD: 1750, flag: '🇳🇬' },
  TRY: { code: 'TRY', symbol: '₺', name: 'Turkish Lira', rateAgainstUSD: 36.50, flag: '🇹🇷' },
  AED: { code: 'AED', symbol: 'AED', name: 'UAE Dirham', rateAgainstUSD: 3.67, flag: '🇦🇪' },
  CAD: { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', rateAgainstUSD: 1.42, flag: '🇨🇦' },
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', rateAgainstUSD: 1.56, flag: '🇦🇺' },
};

export function convertFromUSD(amountUSD: number, code: CurrencyCode = 'INR'): number {
  const config = CURRENCY_CONFIGS[code] || CURRENCY_CONFIGS.INR;
  return amountUSD * config.rateAgainstUSD;
}

export function convertToUSD(amountInLocal: number, code: CurrencyCode = 'INR'): number {
  const config = CURRENCY_CONFIGS[code] || CURRENCY_CONFIGS.INR;
  return amountInLocal / config.rateAgainstUSD;
}

/**
 * Formats an amount that is ALREADY in the target currency (e.g. user live balances, demo balances, trade amounts).
 * Never multiplies by exchange rates! 10,000 INR remains ₹ 10,000.00.
 */
export function formatCurrency(amount: number, code: CurrencyCode = 'INR'): string {
  const config = CURRENCY_CONFIGS[code] || CURRENCY_CONFIGS.INR;
  const safeVal = isNaN(amount) ? 0 : amount;
  const decimals = ['JPY', 'IDR', 'NGN'].includes(code) ? 0 : 2;

  const locale = code === 'INR' ? 'en-IN' : 'en-US';
  const formatted = safeVal.toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return `${config.symbol} ${formatted}`;
}

/**
 * Formats an amount that is currently in USD by converting it into the target currency.
 */
export function formatUSDToCurrency(amountUSD: number, code: CurrencyCode = 'INR'): string {
  const localVal = convertFromUSD(amountUSD, code);
  return formatCurrency(localVal, code);
}

export function getQuickAmountChips(code: CurrencyCode): number[] {
  switch (code) {
    case 'INR':
      return [500, 1000, 2500, 5000, 10000];
    case 'IDR':
      return [100000, 250000, 500000, 1000000, 2500000];
    case 'JPY':
      return [1000, 5000, 10000, 25000, 50000];
    case 'NGN':
      return [10000, 25000, 50000, 100000, 250000];
    case 'BRL':
    case 'TRY':
      return [50, 100, 250, 500, 1000];
    default:
      return [10, 50, 100, 250, 500];
  }
}

