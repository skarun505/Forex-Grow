export type AssetCategory = 'crypto' | 'forex' | 'commodities' | 'indices';

export type CurrencyCode =
  | 'USD'
  | 'EUR'
  | 'GBP'
  | 'INR'
  | 'BRL'
  | 'IDR'
  | 'JPY'
  | 'NGN'
  | 'TRY'
  | 'AED'
  | 'CAD'
  | 'AUD';

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  name: string;
  rateAgainstUSD: number;
  flag: string;
}

export interface Asset {
  id: string;
  name: string;
  category: AssetCategory;
  payout: number;
  currentPrice: number;
  decimalPlaces: number;
  change24h?: number;
  isRealFeed?: boolean;
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface Tick {
  assetId: string;
  price: number;
  time: number;
}

export interface Sentiment {
  assetId: string;
  bullPercent: number;
  bearPercent: number;
}

export interface LeaderboardTrader {
  rank: number;
  name: string;
  country: string;
  profit: number;
  winRate: number;
  avatar: string;
}

export interface RiskSettings {
  enabled: boolean;
  targetWinRate: number; // e.g. 20 for 20% trader wins (2 out of 10)
  mode: 'QUOTEX_OTC' | 'STRICT' | 'BALANCED' | 'ORGANIC';
  microPipSniping: boolean;
  applyToRealOnly: boolean;
  updatedAt?: number;
  updatedBy?: string;
}

export type OrderDirection = 'UP' | 'DOWN';
export type TradeStatus = 'OPEN' | 'WON' | 'LOST' | 'TIE';

export interface Trade {
  id: string;
  userId?: string;
  userName?: string;
  assetId: string;
  direction: OrderDirection;
  amount: number;
  entryPrice: number;
  payout: number;
  openTime: number;
  duration: number;
  expiryTime: number;
  exitPrice?: number;
  profit?: number;
  status: TradeStatus;
  accountType?: 'DEMO' | 'REAL';
  targetOutcome?: 'WIN' | 'LOSS';
  snipedAtExpiry?: boolean;
}

export type VipLevel = 'STANDARD' | 'PRO' | 'VIP';
export type UserRole = 'ADMIN' | 'MANAGER' | 'TRADER';

export interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  targetId?: string;
  targetName?: string;
  details?: string;
  timestamp: number;
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  phone?: string;
  password?: string;
  role?: UserRole;
  demoBalance: number;
  realBalance: number;
  activeAccountType: 'DEMO' | 'REAL';
  currency: CurrencyCode;
  vipLevel: VipLevel;
  winRateOverride?: number; // Custom target win rate for this user (e.g. 20%)
  isKycVerified: boolean;
  status: 'ACTIVE' | 'FROZEN';
  totalTrades: number;
  totalDepositedUSD: number;
  createdAt?: number;
  createdBy?: string;
}

export interface DepositPaymentSettings {
  upiId: string;
  upiName: string;
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  accountType: string;
  branchName: string;
  instructions?: string;
  minDepositINR?: number;
  updatedAt?: number;
  updatedBy?: string;
}

export type TransactionType = 'DEPOSIT' | 'WITHDRAWAL';
export type TransactionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Transaction {
  id: string;
  userId: string;
  userName: string;
  type: TransactionType;
  amount: number;
  currency: CurrencyCode;
  method: string;
  paymentRail?: 'UPI' | 'BANK';
  address?: string;
  promoCode?: string;
  status: TransactionStatus;
  timestamp: number;
  rejectReason?: string;
  utrNumber?: string;
  proofImage?: string;
  bankDetails?: {
    accountHolder?: string;
    holderName?: string;
    accountNumber?: string;
    ifsc?: string;
    ifscCode?: string;
    bankName?: string;
    upiId?: string;
    accountType?: string;
    branchName?: string;
  };
}

export interface PromoCoupon {
  id: string;
  code: string;
  bonusPercentage: number; // e.g. 50 for 50%
  maxBonusUSD: number;
  minDepositUSD: number;
  usageCount: number;
  maxUsage: number;
  isActive: boolean;
  createdAt: number;
}

export interface AdminOverview {
  totalUsers: number;
  activeTradersCount: number;
  totalVolumeUSD: number;
  totalDepositsUSD: number;
  totalWithdrawalsUSD: number;
  houseNetProfitUSD: number;
  pendingTransactionsCount: number;
}

export type WSClientAction =
  | { type: 'SUBSCRIBE_ASSET'; assetId: string }
  | { type: 'UNSUBSCRIBE_ASSET'; assetId: string }
  | { type: 'PLACE_TRADE'; assetId: string; direction: OrderDirection; amount: number; duration: number }
  | { type: 'SWITCH_ACCOUNT'; accountType: 'DEMO' | 'REAL' }
  | { type: 'SWITCH_CURRENCY'; currency: CurrencyCode }
  | { type: 'RESET_DEMO_BALANCE' }
  | { type: 'DEPOSIT_FUNDS'; amount: number; promoCode?: string }
  | { type: 'WITHDRAW_FUNDS'; amount: number; address: string };

export type WSServerAction =
  | { type: 'INIT_STATE'; account: UserAccount; assets: Asset[]; activeTrades: Trade[]; tradeHistory: Trade[]; leaderboard: LeaderboardTrader[] }
  | { type: 'TICK'; tick: Tick }
  | { type: 'CANDLE_UPDATE'; assetId: string; candle: Candle }
  | { type: 'CANDLES_HISTORY'; assetId: string; candles: Candle[] }
  | { type: 'SENTIMENT_UPDATE'; sentiment: Sentiment }
  | { type: 'TRADE_OPENED'; trade: Trade; newBalance: number }
  | { type: 'TRADE_SETTLED'; trade: Trade; newBalance: number }
  | { type: 'BALANCE_UPDATE'; userId?: string; demoBalance: number; realBalance: number; activeAccountType?: 'DEMO' | 'REAL'; currency?: CurrencyCode }
  | { type: 'TRANSACTION_SUCCESS'; userId?: string; message: string; demoBalance: number; realBalance: number }
  | { type: 'ASSETS_UPDATE'; assets: Asset[] }
  | { type: 'ERROR'; message: string };
