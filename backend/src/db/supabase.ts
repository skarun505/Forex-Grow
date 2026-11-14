import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Ensure .env is loaded
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.SUPABASE_URL || 'https://jgqoqvdltaazzztmbrpj.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpncW9xdmRsdGFhenp6dG1icnBqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5Mzg2Njg4MSwiZXhwIjoyMTA5NDQyODgxfQ.i2CpLPPstLk__4An0UXAC10_jnHf9m10ixxksoiRmXE';

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export class SupabaseDb {
  public static isConnected = false;

  public static async init() {
    try {
      const { data, error } = await supabase.from('users').select('id').limit(1);
      if (error) {
        console.warn('⚠️ Supabase connection warning:', error.message);
      } else {
        SupabaseDb.isConnected = true;
        console.log('✅ Supabase PostgreSQL live & synced for Forex Grow!');
      }
    } catch (e: any) {
      console.warn('⚠️ Supabase init caught error:', e.message);
    }
  }

  // --- Users ---
  public static async loadUsers(): Promise<any[]> {
    try {
      const { data, error } = await supabase.from('users').select('*');
      if (error) throw error;
      return (data || []).map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        demoBalance: parseFloat(row.demo_balance),
        realBalance: parseFloat(row.real_balance),
        activeAccountType: row.active_account_type,
        currency: row.currency,
        vipLevel: row.vip_level,
        isKycVerified: row.is_kyc_verified,
        status: row.status,
        totalTrades: row.total_trades,
        totalDepositedUSD: parseFloat(row.total_deposited_usd),
      }));
    } catch (err: any) {
      console.error('Failed to load users from Supabase:', err.message);
      return [];
    }
  }

  public static async saveUser(user: any): Promise<void> {
    try {
      await supabase.from('users').upsert({
        id: user.id,
        name: user.name,
        email: user.email,
        demo_balance: user.demoBalance,
        real_balance: user.realBalance,
        active_account_type: user.activeAccountType,
        currency: user.currency,
        vip_level: user.vipLevel,
        is_kyc_verified: user.isKycVerified,
        status: user.status,
        total_trades: user.totalTrades,
        total_deposited_usd: user.totalDepositedUSD,
        updated_at: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Failed to save user to Supabase:', err.message);
    }
  }

  // --- Transactions ---
  public static async loadTransactions(): Promise<any[]> {
    try {
      const { data, error } = await supabase.from('transactions').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((row) => ({
        id: row.id,
        userId: row.user_id,
        type: row.type,
        amount: parseFloat(row.amount),
        currency: row.currency,
        amountUSD: parseFloat(row.amount_usd),
        status: row.status,
        timestamp: new Date(row.created_at).getTime(),
        paymentMethod: row.payment_method,
        reference: row.reference,
        utrNumber: row.utr_number,
        proofImage: row.proof_image,
        bankDetails: row.bank_details,
        promoCode: row.promo_code,
      }));
    } catch (err: any) {
      console.error('Failed to load transactions from Supabase:', err.message);
      return [];
    }
  }

  public static async saveTransaction(txn: any): Promise<void> {
    try {
      await supabase.from('transactions').upsert({
        id: txn.id,
        user_id: txn.userId,
        type: txn.type,
        amount: txn.amount,
        currency: txn.currency,
        amount_usd: txn.amountUSD,
        status: txn.status,
        payment_method: txn.paymentMethod,
        reference: txn.reference,
        utr_number: txn.utrNumber,
        proof_image: txn.proofImage,
        bank_details: txn.bankDetails,
        promo_code: txn.promoCode,
        created_at: new Date(txn.timestamp || Date.now()).toISOString(),
      });
    } catch (err: any) {
      console.error('Failed to save transaction to Supabase:', err.message);
    }
  }

  // --- Trades ---
  public static async loadTrades(): Promise<any[]> {
    try {
      const { data, error } = await supabase.from('trades').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((row) => ({
        id: row.id,
        userId: row.user_id,
        assetId: row.asset_id,
        direction: row.direction,
        amount: parseFloat(row.amount),
        duration: row.duration,
        entryPrice: parseFloat(row.entry_price),
        exitPrice: row.exit_price ? parseFloat(row.exit_price) : undefined,
        openTime: parseInt(row.open_time || row.entry_time, 10) || Date.now(),
        entryTime: parseInt(row.entry_time || row.open_time, 10) || Date.now(),
        expiryTime: parseInt(row.expiry_time, 10),
        status: row.status,
        payout: parseFloat(row.payout),
        profit: row.profit ? parseFloat(row.profit) : undefined,
        accountType: row.account_type,
      }));
    } catch (err: any) {
      console.error('Failed to load trades from Supabase:', err.message);
      return [];
    }
  }

  public static async saveTrade(trade: any): Promise<void> {
    try {
      await supabase.from('trades').upsert({
        id: trade.id,
        user_id: trade.userId,
        asset_id: trade.assetId,
        direction: trade.direction,
        amount: trade.amount,
        duration: trade.duration,
        entry_price: trade.entryPrice,
        exit_price: trade.exitPrice,
        entry_time: trade.openTime || trade.entryTime || Date.now(),
        expiry_time: trade.expiryTime,
        status: trade.status,
        payout: trade.payout,
        profit: trade.profit,
        account_type: trade.accountType || 'DEMO',
        created_at: new Date(trade.openTime || trade.entryTime || Date.now()).toISOString(),
      });
    } catch (err: any) {
      console.error('Failed to save trade to Supabase:', err.message);
    }
  }

  public static async deleteTrade(tradeId: string): Promise<void> {
    try {
      await supabase.from('trades').delete().eq('id', tradeId);
    } catch (err: any) {
      console.error('Failed to delete trade from Supabase:', err.message);
    }
  }

  public static async deleteUserTrades(userId: string): Promise<void> {
    try {
      await supabase.from('trades').delete().eq('user_id', userId);
    } catch (err: any) {
      console.error('Failed to delete user trades from Supabase:', err.message);
    }
  }

  // --- Coupons ---
  public static async loadCoupons(): Promise<any[]> {
    try {
      const { data, error } = await supabase.from('coupons').select('*');
      if (error) throw error;
      return (data || []).map((row) => ({
        id: `cpn_${row.code}`,
        code: row.code,
        bonusPercentage: parseFloat(row.bonus_percentage),
        minDepositUSD: parseFloat(row.min_deposit_usd),
        maxBonusUSD: parseFloat(row.max_bonus_usd),
        isActive: row.is_active,
        usageCount: row.total_uses,
        maxUsage: 500,
        createdAt: new Date(row.created_at).getTime(),
      }));
    } catch (err: any) {
      console.error('Failed to load coupons from Supabase:', err.message);
      return [];
    }
  }

  public static async saveCoupon(coupon: any): Promise<void> {
    try {
      await supabase.from('coupons').upsert({
        code: coupon.code,
        bonus_percentage: coupon.bonusPercentage,
        min_deposit_usd: coupon.minDepositUSD,
        max_bonus_usd: coupon.maxBonusUSD,
        is_active: coupon.isActive,
        total_uses: coupon.usageCount || 0,
      });
    } catch (err: any) {
      console.error('Failed to save coupon to Supabase:', err.message);
    }
  }

  public static async deleteCoupon(code: string): Promise<void> {
    try {
      await supabase.from('coupons').delete().eq('code', code);
    } catch (err: any) {
      console.error('Failed to delete coupon from Supabase:', err.message);
    }
  }
}

