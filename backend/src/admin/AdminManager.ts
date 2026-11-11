import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { UserAccount, Transaction, PromoCoupon, AdminOverview } from '../types.js';
import { SupabaseDb } from '../db/supabase.js';

export class AdminManager extends EventEmitter {
  private users: Map<string, UserAccount> = new Map();
  private transactions: Transaction[] = [];
  private coupons: PromoCoupon[] = [];
  private totalVolumeUSD = 124800.00;

  constructor() {
    super();
    this.seedInitialData();
    this.initSupabaseSync();
  }

  private async initSupabaseSync() {
    try {
      const dbUsers = await SupabaseDb.loadUsers();
      if (dbUsers.length > 0) {
        for (const u of dbUsers) {
          this.users.set(u.id, u);
        }
      } else {
        for (const u of this.users.values()) {
          await SupabaseDb.saveUser(u);
        }
      }

      const dbTxns = await SupabaseDb.loadTransactions();
      if (dbTxns.length > 0) {
        this.transactions = dbTxns;
      }

      const dbCoupons = await SupabaseDb.loadCoupons();
      if (dbCoupons.length > 0) {
        this.coupons = dbCoupons;
      }
    } catch (e: any) {
      console.warn('Supabase sync warning in AdminManager:', e.message);
    }
  }

  private seedInitialData() {
    // Primary User
    const primaryUser: UserAccount = {
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
    this.users.set(primaryUser.id, primaryUser);

    // Additional mock platform traders
    const mockUsers: UserAccount[] = [
      {
        id: 'usr_sat_01',
        name: 'Satoshi Nakamoto',
        email: 'sat@block.org',
        demoBalance: 15400.00,
        realBalance: 14285.40,
        activeAccountType: 'REAL',
        currency: 'USD',
        vipLevel: 'VIP',
        isKycVerified: true,
        status: 'ACTIVE',
        totalTrades: 218,
        totalDepositedUSD: 5000.00,
      },
      {
        id: 'usr_whale_02',
        name: 'Crypto Whale 9',
        email: 'whale9@crypto.net',
        demoBalance: 10000.00,
        realBalance: 9840.10,
        activeAccountType: 'REAL',
        currency: 'USD',
        vipLevel: 'VIP',
        isKycVerified: true,
        status: 'ACTIVE',
        totalTrades: 145,
        totalDepositedUSD: 3500.00,
      },
      {
        id: 'usr_elena_03',
        name: 'Elena Vance',
        email: 'elena.v@invest.de',
        demoBalance: 8200.00,
        realBalance: 2450.00,
        activeAccountType: 'REAL',
        currency: 'EUR',
        vipLevel: 'PRO',
        isKycVerified: true,
        status: 'ACTIVE',
        totalTrades: 72,
        totalDepositedUSD: 2000.00,
      },
      {
        id: 'usr_raj_04',
        name: 'Raj Patel',
        email: 'raj.p@trader.in',
        demoBalance: 12000.00,
        realBalance: 650.00,
        activeAccountType: 'DEMO',
        currency: 'INR',
        vipLevel: 'STANDARD',
        isKycVerified: false,
        status: 'ACTIVE',
        totalTrades: 49,
        totalDepositedUSD: 500.00,
      },
    ];

    for (const u of mockUsers) {
      this.users.set(u.id, u);
    }

    // Default Coupons
    this.coupons = [
      {
        id: 'cpn_1',
        code: 'WELCOME50',
        bonusPercentage: 50,
        maxBonusUSD: 500,
        minDepositUSD: 20,
        usageCount: 148,
        maxUsage: 1000,
        isActive: true,
        createdAt: Date.now() - 3600000 * 24 * 7,
      },
      {
        id: 'cpn_2',
        code: 'VIP100',
        bonusPercentage: 100,
        maxBonusUSD: 1000,
        minDepositUSD: 250,
        usageCount: 42,
        maxUsage: 200,
        isActive: true,
        createdAt: Date.now() - 3600000 * 24 * 3,
      },
      {
        id: 'cpn_3',
        code: 'CRYPTO30',
        bonusPercentage: 30,
        maxBonusUSD: 300,
        minDepositUSD: 50,
        usageCount: 89,
        maxUsage: 500,
        isActive: true,
        createdAt: Date.now() - 3600000 * 24 * 5,
      },
    ];

    // Seed Initial Transactions
    this.transactions = [
      {
        id: 'tx_101',
        userId: 'usr_quotex_vip_99',
        userName: 'Alex Rivera',
        type: 'DEPOSIT',
        amount: 250.00,
        currency: 'USD',
        method: 'USDT (TRC-20)',
        address: 'TX9QxN7m48aLkVmY2ZqQ3v7JkP1m8RtW5n',
        promoCode: 'WELCOME50',
        status: 'APPROVED',
        timestamp: Date.now() - 1000 * 60 * 60 * 2,
      },
      {
        id: 'tx_102',
        userId: 'usr_elena_03',
        userName: 'Elena Vance',
        type: 'WITHDRAWAL',
        amount: 300.00,
        currency: 'USD',
        method: 'Tether TRC-20',
        address: 'TY5WqP9k21aBcVmZ8RqQ1v4JkP9m2RtX7m',
        status: 'PENDING',
        timestamp: Date.now() - 1000 * 60 * 25,
      },
      {
        id: 'tx_103',
        userId: 'usr_raj_04',
        userName: 'Raj Patel',
        type: 'DEPOSIT',
        amount: 100.00,
        currency: 'INR',
        method: 'UPI Instant Payout',
        address: 'raj@okaxis',
        status: 'PENDING',
        timestamp: Date.now() - 1000 * 60 * 8,
      },
    ];
  }

  public getOverview(): AdminOverview {
    const usersArr = Array.from(this.users.values());
    const totalUsers = usersArr.length;
    const activeTradersCount = usersArr.filter((u) => u.status === 'ACTIVE').length;

    let totalDepositsUSD = 0;
    let totalWithdrawalsUSD = 0;
    let pendingTransactionsCount = 0;

    for (const tx of this.transactions) {
      if (tx.status === 'APPROVED') {
        if (tx.type === 'DEPOSIT') totalDepositsUSD += tx.amount;
        if (tx.type === 'WITHDRAWAL') totalWithdrawalsUSD += tx.amount;
      }
      if (tx.status === 'PENDING') {
        pendingTransactionsCount++;
      }
    }

    const houseNetProfitUSD = Number((totalDepositsUSD - totalWithdrawalsUSD + 8420.50).toFixed(2));

    return {
      totalUsers,
      activeTradersCount,
      totalVolumeUSD: this.totalVolumeUSD,
      totalDepositsUSD: Number(totalDepositsUSD.toFixed(2)),
      totalWithdrawalsUSD: Number(totalWithdrawalsUSD.toFixed(2)),
      houseNetProfitUSD,
      pendingTransactionsCount,
    };
  }

  public recordTradeVolume(amountUSD: number) {
    this.totalVolumeUSD = Number((this.totalVolumeUSD + amountUSD).toFixed(2));
  }

  public getUsers(): UserAccount[] {
    return Array.from(this.users.values());
  }

  public getUser(userId: string): UserAccount | undefined {
    return this.users.get(userId);
  }

  public adjustUserBalance(params: {
    userId: string;
    accountType: 'DEMO' | 'REAL';
    action: 'ADD' | 'REMOVE';
    amount: number;
    reason?: string;
  }): { success: boolean; user?: UserAccount; error?: string } {
    const user = this.users.get(params.userId);
    if (!user) return { success: false, error: 'User not found' };
    if (params.amount <= 0) return { success: false, error: 'Amount must be greater than 0' };

    const multiplier = params.action === 'ADD' ? 1 : -1;
    const change = params.amount * multiplier;

    if (params.accountType === 'DEMO') {
      const newBal = Number((user.demoBalance + change).toFixed(2));
      if (newBal < 0) return { success: false, error: 'Balance cannot be negative' };
      user.demoBalance = newBal;
    } else {
      const newBal = Number((user.realBalance + change).toFixed(2));
      if (newBal < 0) return { success: false, error: 'Balance cannot be negative' };
      user.realBalance = newBal;
    }

    this.emit('user_updated', user);
    SupabaseDb.saveUser(user);
    return { success: true, user: { ...user } };
  }

  public createUser(params: {
    name: string;
    email: string;
    demoBalance?: number;
    realBalance?: number;
    activeAccountType?: 'DEMO' | 'REAL';
    currency?: any;
    vipLevel?: any;
    isKycVerified?: boolean;
    status?: 'ACTIVE' | 'FROZEN';
  }): { success: boolean; user?: UserAccount; error?: string } {
    if (!params.name || params.name.trim().length === 0) {
      return { success: false, error: 'Full name is required' };
    }
    if (!params.email || !params.email.includes('@')) {
      return { success: false, error: 'Valid email address is required' };
    }

    for (const u of this.users.values()) {
      if (u.email.toLowerCase() === params.email.trim().toLowerCase()) {
        return { success: false, error: 'A trader with this email already exists' };
      }
    }

    const newUser: UserAccount = {
      id: `usr_${uuidv4().slice(0, 8)}`,
      name: params.name.trim(),
      email: params.email.trim().toLowerCase(),
      demoBalance: Number(params.demoBalance ?? 10000.00),
      realBalance: Number(params.realBalance ?? 0.00),
      activeAccountType: params.activeAccountType ?? 'DEMO',
      currency: params.currency ?? 'USD',
      vipLevel: params.vipLevel ?? 'STANDARD',
      isKycVerified: Boolean(params.isKycVerified ?? false),
      status: params.status ?? 'ACTIVE',
      totalTrades: 0,
      totalDepositedUSD: Number(params.realBalance ?? 0.00),
    };

    this.users.set(newUser.id, newUser);
    this.emit('user_created', newUser);
    SupabaseDb.saveUser(newUser);
    return { success: true, user: { ...newUser } };
  }

  public updateUser(
    userId: string,
    updates: Partial<Pick<UserAccount, 'name' | 'vipLevel' | 'isKycVerified' | 'status'>>
  ): { success: boolean; user?: UserAccount; error?: string } {
    const user = this.users.get(userId);
    if (!user) return { success: false, error: 'User not found' };

    if (updates.name !== undefined) user.name = updates.name;
    if (updates.vipLevel !== undefined) user.vipLevel = updates.vipLevel;
    if (updates.isKycVerified !== undefined) user.isKycVerified = updates.isKycVerified;
    if (updates.status !== undefined) user.status = updates.status;

    this.emit('user_updated', user);
    SupabaseDb.saveUser(user);
    return { success: true, user: { ...user } };
  }

  public getTransactions(): Transaction[] {
    return [...this.transactions];
  }

  public addTransaction(tx: Omit<Transaction, 'id' | 'timestamp'>): Transaction {
    const newTx: Transaction = {
      ...tx,
      id: `tx_${uuidv4().slice(0, 8)}`,
      timestamp: Date.now(),
    };
    this.transactions.unshift(newTx);
    this.emit('transaction_added', newTx);
    SupabaseDb.saveTransaction(newTx);
    return newTx;
  }

  public approveTransaction(txId: string): { success: boolean; transaction?: Transaction; error?: string } {
    const tx = this.transactions.find((t) => t.id === txId);
    if (!tx) return { success: false, error: 'Transaction not found' };
    if (tx.status !== 'PENDING') return { success: false, error: 'Transaction already resolved' };

    tx.status = 'APPROVED';

    const user = this.users.get(tx.userId);
    if (user && tx.type === 'DEPOSIT') {
      let credited = tx.amount;
      if (tx.promoCode) {
        const cpnRes = this.validateCoupon(tx.promoCode, tx.amount);
        if (cpnRes.valid) {
          credited += cpnRes.bonus;
        }
      }
      user.realBalance = Number((user.realBalance + credited).toFixed(2));
      user.totalDepositedUSD = Number((user.totalDepositedUSD + tx.amount).toFixed(2));
      this.emit('user_updated', user);
      SupabaseDb.saveUser(user);
    }

    this.emit('transaction_updated', tx);
    SupabaseDb.saveTransaction(tx);
    return { success: true, transaction: { ...tx } };
  }

  public rejectTransaction(txId: string, reason: string): { success: boolean; transaction?: Transaction; error?: string } {
    const tx = this.transactions.find((t) => t.id === txId);
    if (!tx) return { success: false, error: 'Transaction not found' };
    if (tx.status !== 'PENDING') return { success: false, error: 'Transaction already resolved' };

    tx.status = 'REJECTED';
    tx.rejectReason = reason || 'Declined by Admin compliance';

    // If it was a withdrawal that failed/rejected, refund the user
    const user = this.users.get(tx.userId);
    if (user && tx.type === 'WITHDRAWAL') {
      user.realBalance = Number((user.realBalance + tx.amount).toFixed(2));
      this.emit('user_updated', user);
      SupabaseDb.saveUser(user);
    }

    this.emit('transaction_updated', tx);
    SupabaseDb.saveTransaction(tx);
    return { success: true, transaction: { ...tx } };
  }

  public getCoupons(): PromoCoupon[] {
    return [...this.coupons];
  }

  public createCoupon(params: {
    code: string;
    bonusPercentage: number;
    maxBonusUSD: number;
    minDepositUSD: number;
    maxUsage: number;
  }): { success: boolean; coupon?: PromoCoupon; error?: string } {
    const upperCode = params.code.trim().toUpperCase();
    if (!upperCode) return { success: false, error: 'Coupon code cannot be empty' };
    if (this.coupons.some((c) => c.code === upperCode)) {
      return { success: false, error: 'Coupon code already exists' };
    }

    const newCoupon: PromoCoupon = {
      id: `cpn_${uuidv4().slice(0, 8)}`,
      code: upperCode,
      bonusPercentage: params.bonusPercentage,
      maxBonusUSD: params.maxBonusUSD,
      minDepositUSD: params.minDepositUSD,
      usageCount: 0,
      maxUsage: params.maxUsage || 500,
      isActive: true,
      createdAt: Date.now(),
    };

    this.coupons.unshift(newCoupon);
    this.emit('coupon_created', newCoupon);
    SupabaseDb.saveCoupon(newCoupon);
    return { success: true, coupon: newCoupon };
  }

  public toggleCoupon(id: string): { success: boolean; coupon?: PromoCoupon } {
    const coupon = this.coupons.find((c) => c.id === id);
    if (!coupon) return { success: false };
    coupon.isActive = !coupon.isActive;
    SupabaseDb.saveCoupon(coupon);
    return { success: true, coupon: { ...coupon } };
  }

  public deleteCoupon(id: string): boolean {
    const coupon = this.coupons.find((c) => c.id === id);
    const initial = this.coupons.length;
    this.coupons = this.coupons.filter((c) => c.id !== id);
    if (coupon) SupabaseDb.deleteCoupon(coupon.code);
    return this.coupons.length < initial;
  }

  public validateCoupon(code: string, depositAmount: number): { valid: boolean; bonus: number; message: string } {
    const coupon = this.coupons.find((c) => c.code === code.trim().toUpperCase() && c.isActive);
    if (!coupon) return { valid: false, bonus: 0, message: 'Invalid or expired promo code' };
    if (depositAmount < coupon.minDepositUSD) {
      return {
        valid: false,
        bonus: 0,
        message: `Min deposit for ${coupon.code} is $${coupon.minDepositUSD}`,
      };
    }
    if (coupon.usageCount >= coupon.maxUsage) {
      return { valid: false, bonus: 0, message: 'Coupon usage limit reached' };
    }

    const calculatedBonus = Math.min(coupon.maxBonusUSD, depositAmount * (coupon.bonusPercentage / 100));
    coupon.usageCount++;
    return {
      valid: true,
      bonus: Number(calculatedBonus.toFixed(2)),
      message: `+${coupon.bonusPercentage}% bonus ($${calculatedBonus.toFixed(2)}) applied!`,
    };
  }
}

