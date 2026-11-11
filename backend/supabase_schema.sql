-- ==========================================================
-- FOREX GROW BINARY TRADING APP - DATABASE SCHEMA
-- Run this in Supabase Dashboard -> SQL Editor -> Run
-- ==========================================================

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    demo_balance NUMERIC(15, 2) DEFAULT 10000.00 NOT NULL,
    real_balance NUMERIC(15, 2) DEFAULT 500.00 NOT NULL,
    active_account_type TEXT DEFAULT 'DEMO' NOT NULL,
    currency TEXT DEFAULT 'USD' NOT NULL,
    vip_level TEXT DEFAULT 'STANDARD' NOT NULL,
    is_kyc_verified BOOLEAN DEFAULT FALSE NOT NULL,
    status TEXT DEFAULT 'ACTIVE' NOT NULL,
    total_trades INTEGER DEFAULT 0 NOT NULL,
    total_deposited_usd NUMERIC(15, 2) DEFAULT 0.00 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. TRADES TABLE
CREATE TABLE IF NOT EXISTS public.trades (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
    asset_id TEXT NOT NULL,
    direction TEXT NOT NULL,
    amount NUMERIC(15, 4) NOT NULL,
    duration INTEGER NOT NULL,
    entry_price NUMERIC(15, 5) NOT NULL,
    exit_price NUMERIC(15, 5),
    entry_time BIGINT NOT NULL,
    expiry_time BIGINT NOT NULL,
    status TEXT DEFAULT 'ACTIVE' NOT NULL,
    payout NUMERIC(5, 2) NOT NULL,
    profit NUMERIC(15, 4),
    account_type TEXT DEFAULT 'DEMO' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. TRANSACTIONS TABLE (Deposits & Withdrawals)
CREATE TABLE IF NOT EXISTS public.transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    currency TEXT NOT NULL,
    amount_usd NUMERIC(15, 2) NOT NULL,
    status TEXT DEFAULT 'PENDING' NOT NULL,
    payment_method TEXT NOT NULL,
    reference TEXT NOT NULL,
    utr_number TEXT,
    proof_image TEXT,
    bank_details JSONB,
    promo_code TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. COUPONS TABLE
CREATE TABLE IF NOT EXISTS public.coupons (
    code TEXT PRIMARY KEY,
    bonus_percentage NUMERIC(5, 2) NOT NULL,
    min_deposit_usd NUMERIC(15, 2) DEFAULT 10.00 NOT NULL,
    max_bonus_usd NUMERIC(15, 2) DEFAULT 500.00 NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    total_uses INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- SEED INITIAL VIP DEMO USER
INSERT INTO public.users (
    id, name, email, demo_balance, real_balance, active_account_type, currency, vip_level, is_kyc_verified, status, total_trades, total_deposited_usd
) VALUES (
    'usr_quotex_vip_99',
    'Alex Rivera',
    'alex.rivera@quotex.pro',
    10000.00,
    500.00,
    'DEMO',
    'USD',
    'VIP',
    TRUE,
    'ACTIVE',
    34,
    1250.00
) ON CONFLICT (id) DO NOTHING;

-- SEED ACTIVE PROMO COUPONS
INSERT INTO public.coupons (code, bonus_percentage, min_deposit_usd, max_bonus_usd, is_active)
VALUES 
    ('WELCOME50', 50, 20, 250, TRUE),
    ('VIP100', 100, 50, 500, TRUE),
    ('FOREXGROW50', 50, 10, 100, TRUE)
ON CONFLICT (code) DO NOTHING;

-- ENABLE ROW LEVEL SECURITY AND PERMISSIVE POLICIES FOR SERVICE ROLE
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all for service_role" ON public.users FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for service_role" ON public.trades FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for service_role" ON public.transactions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for service_role" ON public.coupons FOR ALL TO service_role USING (true) WITH CHECK (true);

