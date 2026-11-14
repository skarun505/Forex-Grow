import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { UserAccount, Transaction, PromoCoupon, AdminOverview, AuditLog, UserRole, DepositPaymentSettings, RiskSettings } from '../types.js';
import { SupabaseDb } from '../db/supabase.js';

export class AdminManager extends EventEmitter {
  private users: Map<string, UserAccount> = new Map();
  private transactions: Transaction[] = [];
  private coupons: PromoCoupon[] = [];
  private auditLogs: AuditLog[] = [];
  private totalVolumeUSD = 124800.00;
  private paymentSettings: DepositPaymentSettings = {
    upiId: 'forexgrow@icici',
    upiName: 'Forex Grow Official Desk',
    bankName: 'HDFC Bank',
    accountHolderName: 'Forex Grow Institutional Operations',
    accountNumber: '50200084729104',
    ifscCode: 'HDFC0000240',
    accountType: 'Current Account',
    branchName: 'Nariman Point, Mumbai',
    instructions: 'Transfer funds via IMPS, NEFT, RTGS or UPI. Upload clear screenshot showing complete 12-digit UTR/Reference number for verification.',
    minDepositINR: 500,
    updatedAt: Date.now(),
    updatedBy: 'System Initializer',
  };
  private riskSettings: RiskSettings = {
    enabled: true,
    targetWinRate: 20, // 20% default: out of 10 trades, trader wins 2 and loses 8 (standard Quotex OTC behavior)
    mode: 'QUOTEX_OTC',
    microPipSniping: true,
    applyToRealOnly: false,
    updatedAt: Date.now(),
    updatedBy: 'System Initializer',
  };

  public getRiskSettings(): RiskSettings {
    return { ...this.riskSettings };
  }

  public updateRiskSettings(updates: Partial<RiskSettings>, adminName: string = 'Admin'): RiskSettings {
    this.riskSettings = {
      ...this.riskSettings,
      ...updates,
      updatedAt: Date.now(),
      updatedBy: adminName,
    };
    this.auditLogs.unshift({
      id: `aud_${uuidv4().slice(0, 8)}`,
      actorId: 'admin_sys',
      actorName: adminName,
      actorRole: 'ADMIN',
      action: 'UPDATE_RISK_SETTINGS',
      details: `Target Win Rate: ${this.riskSettings.targetWinRate}% | Mode: ${this.riskSettings.mode} | Sniping: ${this.riskSettings.microPipSniping}`,
      timestamp: Date.now(),
    });
    this.emit('risk_settings_updated', this.riskSettings);
    return { ...this.riskSettings };
  }

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
    // Super Admin Account
    const superAdmin: UserAccount = {
      id: 'usr_admin_001',
      name: 'Super Admin',
      email: 'admin@forexgrow.com',
      phone: '+15550001111',
      password: 'admin123',
      role: 'ADMIN',
      demoBalance: 100000.00,
      realBalance: 50000.00,
      activeAccountType: 'REAL',
      currency: 'USD',
      vipLevel: 'VIP',
      isKycVerified: true,
      status: 'ACTIVE',
      totalTrades: 500,
      totalDepositedUSD: 50000.00,
      createdAt: Date.now() - 365 * 86400000,
    };
    this.users.set(superAdmin.id, superAdmin);

    // Primary Demo VIP Trader
    const primaryUser: UserAccount = {
      id: 'usr_quotex_vip_99',
      name: 'Alex Rivera',
      email: 'alex.rivera@quotex.pro',
      phone: '+15559876543',
      password: 'forexgrow123',
      role: 'ADMIN',
      demoBalance: 10000.00,
      realBalance: 500.00,
      activeAccountType: 'DEMO',
      currency: 'USD',
      vipLevel: 'VIP',
      isKycVerified: true,
      status: 'ACTIVE',
      totalTrades: 34,
      totalDepositedUSD: 1250.00,
      createdAt: Date.now() - 30 * 86400000,
    };
    this.users.set(primaryUser.id, primaryUser);

    // Operations Manager Account
    const opsManager: UserAccount = {
      id: 'usr_manager_ops_01',
      name: 'Sarah Connor',
      email: 'manager@forexgrow.com',
      phone: '+15550002222',
      password: 'manager123',
      role: 'MANAGER',
      demoBalance: 10000.00,
      realBalance: 0.00,
      activeAccountType: 'DEMO',
      currency: 'USD',
      vipLevel: 'PRO',
      isKycVerified: true,
      status: 'ACTIVE',
      totalTrades: 0,
      totalDepositedUSD: 0,
      createdAt: Date.now() - 60 * 86400000,
    };
    this.users.set(opsManager.id, opsManager);

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
    phone?: string;
    password?: string;
    role?: UserRole;
    demoBalance?: number;
    realBalance?: number;
    activeAccountType?: 'DEMO' | 'REAL';
    currency?: any;
    vipLevel?: any;
    isKycVerified?: boolean;
    status?: 'ACTIVE' | 'FROZEN';
    actor?: { id: string; name: string; role: UserRole };
  }): { success: boolean; user?: UserAccount; error?: string } {
    if (!params.name || params.name.trim().length === 0) {
      return { success: false, error: 'Full name is required' };
    }
    if (!params.email || !params.email.includes('@')) {
      return { success: false, error: 'Valid email address is required' };
    }

    const cleanEmail = params.email.trim().toLowerCase();
    const cleanPhone = params.phone ? params.phone.trim().replace(/[^\d+]/g, '') : undefined;

    for (const u of this.users.values()) {
      if (u.email && u.email.toLowerCase() === cleanEmail) {
        return { success: false, error: 'A trader with this email already exists' };
      }
      if (cleanPhone && u.phone && u.phone.replace(/[^\d+]/g, '') === cleanPhone) {
        return { success: false, error: 'A trader with this phone number already exists' };
      }
    }

    const newUser: UserAccount = {
      id: `usr_${uuidv4().slice(0, 8)}`,
      name: params.name.trim(),
      email: cleanEmail,
      phone: params.phone?.trim() || undefined,
      password: params.password?.trim() || 'Trader@2026',
      role: params.role || 'TRADER',
      demoBalance: Number(params.demoBalance ?? 10000.00),
      realBalance: Number(params.realBalance ?? 0.00),
      activeAccountType: params.activeAccountType ?? 'DEMO',
      currency: params.currency ?? 'USD',
      vipLevel: params.vipLevel ?? 'STANDARD',
      isKycVerified: Boolean(params.isKycVerified ?? false),
      status: params.status ?? 'ACTIVE',
      totalTrades: 0,
      totalDepositedUSD: Number(params.realBalance ?? 0.00),
      createdAt: Date.now(),
      createdBy: params.actor ? `${params.actor.name} (${params.actor.role})` : undefined,
    };

    this.users.set(newUser.id, newUser);
    this.emit('user_created', newUser);
    SupabaseDb.saveUser(newUser);

    if (params.actor) {
      this.addAuditLog(
        params.actor.id,
        params.actor.name,
        params.actor.role,
        'CREATE_CLIENT_ACCOUNT',
        newUser.id,
        newUser.name,
        `Issued client credentials for ${newUser.name} (Email: ${newUser.email}, Phone: ${newUser.phone || 'N/A'}, Currency: ${newUser.currency}, Demo: ${newUser.demoBalance}, Real: ${newUser.realBalance})`
      );
    }

    return { success: true, user: { ...newUser } };
  }

  public updateUser(
    userId: string,
    updates: Partial<Pick<UserAccount, 'name' | 'vipLevel' | 'isKycVerified' | 'status' | 'currency'>>
  ): { success: boolean; user?: UserAccount; error?: string } {
    const user = this.users.get(userId);
    if (!user) return { success: false, error: 'User not found' };

    if (updates.name !== undefined) user.name = updates.name;
    if (updates.vipLevel !== undefined) user.vipLevel = updates.vipLevel;
    if (updates.isKycVerified !== undefined) user.isKycVerified = updates.isKycVerified;
    if (updates.status !== undefined) user.status = updates.status;
    if (updates.currency !== undefined) user.currency = updates.currency;

    this.emit('user_updated', user);
    SupabaseDb.saveUser(user);
    return { success: true, user: { ...user } };
  }

  public getTransactions(): Transaction[] {
    return [...this.transactions];
  }

  public getTransactionsForUser(userId: string): Transaction[] {
    return this.transactions.filter(
      (tx) => tx.userId === userId || (!tx.userId && userId === 'usr_quotex_vip_99')
    );
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

  public addAuditLog(
    actorId: string,
    actorName: string,
    actorRole: UserRole,
    action: string,
    targetId?: string,
    targetName?: string,
    details?: string
  ): AuditLog {
    const log: AuditLog = {
      id: `log_${uuidv4().slice(0, 8)}`,
      actorId,
      actorName,
      actorRole,
      action,
      targetId,
      targetName,
      details,
      timestamp: Date.now(),
    };
    this.auditLogs.unshift(log);
    if (this.auditLogs.length > 250) this.auditLogs.pop();
    this.emit('audit_log_added', log);
    return log;
  }

  public getAuditLogs(): AuditLog[] {
    return [...this.auditLogs];
  }

  public approveTransaction(
    txId: string,
    actor?: { id: string; name: string; role: UserRole }
  ): { success: boolean; transaction?: Transaction; error?: string } {
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

    this.addAuditLog(
      actor?.id || 'admin_sys',
      actor?.name || 'Operations Desk',
      actor?.role || 'MANAGER',
      `APPROVED_${tx.type}`,
      tx.id,
      user?.name || tx.userName,
      `Amount: $${tx.amount} (${tx.currency}) via ${tx.method}`
    );

    this.emit('transaction_updated', tx);
    SupabaseDb.saveTransaction(tx);
    return { success: true, transaction: { ...tx } };
  }

  public rejectTransaction(
    txId: string,
    reason: string,
    actor?: { id: string; name: string; role: UserRole }
  ): { success: boolean; transaction?: Transaction; error?: string } {
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

    this.addAuditLog(
      actor?.id || 'admin_sys',
      actor?.name || 'Operations Desk',
      actor?.role || 'MANAGER',
      `REJECTED_${tx.type}`,
      tx.id,
      user?.name || tx.userName,
      `Reason: ${tx.rejectReason}`
    );

    this.emit('transaction_updated', tx);
    SupabaseDb.saveTransaction(tx);
    return { success: true, transaction: { ...tx } };
  }

  public setUserKyc(
    userId: string,
    isVerified: boolean,
    actor?: { id: string; name: string; role: UserRole }
  ): { success: boolean; user?: UserAccount; error?: string } {
    const user = this.users.get(userId);
    if (!user) return { success: false, error: 'User not found' };
    user.isKycVerified = isVerified;
    this.addAuditLog(
      actor?.id || 'mgr_sys',
      actor?.name || 'Operations Desk',
      actor?.role || 'MANAGER',
      isVerified ? 'VERIFIED_KYC' : 'REVOKED_KYC',
      user.id,
      user.name,
      `KYC status changed to ${isVerified ? 'VERIFIED' : 'PENDING'}`
    );
    this.emit('user_updated', user);
    SupabaseDb.saveUser(user);
    return { success: true, user: { ...user } };
  }

  public setUserStatus(
    userId: string,
    status: 'ACTIVE' | 'FROZEN',
    actor?: { id: string; name: string; role: UserRole }
  ): { success: boolean; user?: UserAccount; error?: string } {
    const user = this.users.get(userId);
    if (!user) return { success: false, error: 'User not found' };
    user.status = status;
    this.addAuditLog(
      actor?.id || 'mgr_sys',
      actor?.name || 'Operations Desk',
      actor?.role || 'MANAGER',
      status === 'FROZEN' ? 'FROZE_USER' : 'UNFROZE_USER',
      user.id,
      user.name,
      `User account status set to ${status}`
    );
    this.emit('user_updated', user);
    SupabaseDb.saveUser(user);
    return { success: true, user: { ...user } };
  }

  public resetUserDemo(
    userId: string,
    actor?: { id: string; name: string; role: UserRole }
  ): { success: boolean; user?: UserAccount; error?: string } {
    const user = this.users.get(userId);
    if (!user) return { success: false, error: 'User not found' };
    user.demoBalance = 10000.00;
    this.addAuditLog(
      actor?.id || 'mgr_sys',
      actor?.name || 'Operations Desk',
      actor?.role || 'MANAGER',
      'RESET_DEMO_BALANCE',
      user.id,
      user.name,
      'Demo balance reset to $10,000.00'
    );
    this.emit('user_updated', user);
    SupabaseDb.saveUser(user);
    return { success: true, user: { ...user } };
  }

  public getManagerOverview(): {
    pendingDeposits: number;
    pendingWithdrawals: number;
    totalActiveUsers: number;
    verifiedUsersCount: number;
    totalApprovedDepositsUSD: number;
    totalPendingAmountUSD: number;
  } {
    let pendingDeposits = 0;
    let pendingWithdrawals = 0;
    let totalApprovedDepositsUSD = 0;
    let totalPendingAmountUSD = 0;

    for (const tx of this.transactions) {
      if (tx.status === 'PENDING') {
        if (tx.type === 'DEPOSIT') pendingDeposits++;
        if (tx.type === 'WITHDRAWAL') pendingWithdrawals++;
        totalPendingAmountUSD += tx.amount;
      }
      if (tx.status === 'APPROVED' && tx.type === 'DEPOSIT') {
        totalApprovedDepositsUSD += tx.amount;
      }
    }

    const usersArr = Array.from(this.users.values());
    const totalActiveUsers = usersArr.filter((u) => u.status === 'ACTIVE').length;
    const verifiedUsersCount = usersArr.filter((u) => u.isKycVerified).length;

    return {
      pendingDeposits,
      pendingWithdrawals,
      totalActiveUsers,
      verifiedUsersCount,
      totalApprovedDepositsUSD: Number(totalApprovedDepositsUSD.toFixed(2)),
      totalPendingAmountUSD: Number(totalPendingAmountUSD.toFixed(2)),
    };
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

  public getPaymentSettings(): DepositPaymentSettings {
    return { ...this.paymentSettings };
  }

  public updatePaymentSettings(
    newSettings: Partial<DepositPaymentSettings>,
    actor?: { id: string; name: string; role: UserRole }
  ): DepositPaymentSettings {
    this.paymentSettings = {
      ...this.paymentSettings,
      ...newSettings,
      updatedAt: Date.now(),
      updatedBy: actor ? `${actor.name} (${actor.role})` : 'System Administrator',
    };

    if (actor) {
      this.auditLogs.unshift({
        id: `aud_${uuidv4().slice(0, 8)}`,
        actorId: actor.id,
        actorName: actor.name,
        actorRole: actor.role,
        action: 'UPDATE_PAYMENT_SETTINGS',
        details: `Updated Bank: ${this.paymentSettings.bankName} | A/C: ${this.paymentSettings.accountNumber} | IFSC: ${this.paymentSettings.ifscCode} | UPI: ${this.paymentSettings.upiId}`,
        timestamp: Date.now(),
      });
    }

    this.emit('payment_settings_updated', this.paymentSettings);
    return { ...this.paymentSettings };
  }
}

