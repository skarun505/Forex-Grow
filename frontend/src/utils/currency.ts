import { CurrencyCode, CurrencyConfig } from '../types';

export const CURRENCY_CONFIGS: Record<CurrencyCode, CurrencyConfig> = {
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', rateAgainstUSD: 1.0, flag: '🇺🇸' },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', rateAgainstUSD: 0.92, flag: '🇪🇺' },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', rateAgainstUSD: 0.77, flag: '🇬🇧' },
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee', rateAgainstUSD: 84.50, flag: '🇮🇳' },
  BRL: { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', rateAgainstUSD: 5.75, flag: '🇧🇷' },
  IDR: { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah', rateAgainstUSD: 15800, flag: '🇮🇩' },
  JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen', rateAgainstUSD: 153.50, flag: '🇯🇵' },
  NGN: { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', rateAgainstUSD: 1650, flag: '🇳🇬' },
  TRY: { code: 'TRY', symbol: '₺', name: 'Turkish Lira', rateAgainstUSD: 34.20, flag: '🇹🇷' },
  AED: { code: 'AED', symbol: 'AED', name: 'UAE Dirham', rateAgainstUSD: 3.67, flag: '🇦🇪' },
  CAD: { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', rateAgainstUSD: 1.39, flag: '🇨🇦' },
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', rateAgainstUSD: 1.52, flag: '🇦🇺' },
};

export function convertFromUSD(amountUSD: number, code: CurrencyCode): number {
  const config = CURRENCY_CONFIGS[code] || CURRENCY_CONFIGS.USD;
  return amountUSD * config.rateAgainstUSD;
}

export function convertToUSD(amountInLocal: number, code: CurrencyCode): number {
  const config = CURRENCY_CONFIGS[code] || CURRENCY_CONFIGS.USD;
  return amountInLocal / config.rateAgainstUSD;
}

export function formatCurrency(amountUSD: number, code: CurrencyCode): string {
  const config = CURRENCY_CONFIGS[code] || CURRENCY_CONFIGS.USD;
  const localVal = convertFromUSD(amountUSD, code);

  const decimals = ['JPY', 'IDR', 'NGN'].includes(code) ? 0 : 2;

  const formatted = localVal.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return `${config.symbol} ${formatted}`;
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

