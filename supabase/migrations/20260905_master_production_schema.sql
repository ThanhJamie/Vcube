-- ==============================================================================
-- VCUBE PLATFORM - MASTER PRODUCTION SCHEMA & RLS POLICIES
-- Migration: 20260905_master_production_schema.sql
-- Description: Complete schema for 3-sided marketplace, dynamic admin parameters,
--              MES manufacturing fleet, order tracking with tokens, and banking idempotency.
-- Author: Supabase Database Architect (Subagent 03)
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 1. TABLE: public.pricing_configs (Dynamic Inkiri v3.4 Cost Formula)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.pricing_configs (
    id TEXT PRIMARY KEY,
    config_name TEXT NOT NULL DEFAULT 'Default Inkiri Formula v3.4',
    formula_version TEXT NOT NULL DEFAULT 'v3.4',
    is_active BOOLEAN NOT NULL DEFAULT true,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS for pricing_configs
ALTER TABLE public.pricing_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read active pricing config" ON public.pricing_configs;
CREATE POLICY "Public can read active pricing config"
ON public.pricing_configs FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Admins can manage pricing configs" ON public.pricing_configs;
CREATE POLICY "Admins can manage pricing configs"
ON public.pricing_configs FOR ALL
TO authenticated
USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR (SELECT email FROM auth.users WHERE id = auth.uid()) = 'chithanhso10@gmail.com'
)
WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR (SELECT email FROM auth.users WHERE id = auth.uid()) = 'chithanhso10@gmail.com'
);

-- ==============================================================================
-- 2. TABLE: public.site_content (Storefront CMS, Addresses, Announcements)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.site_content (
    id TEXT PRIMARY KEY DEFAULT 'default',
    hero_badge TEXT DEFAULT 'HỆ THỐNG IN 3D CÔNG NGHIỆP // VCUBE MESH ENGINE v2.6',
    hero_title TEXT DEFAULT 'Nền Tảng Đặt In 3D Trực Tuyến & Báo Giá Tức Thì',
    hero_subtitle TEXT DEFAULT 'Tải lên tệp CAD (.STL, .STEP, .3MF) để nhận báo giá chi tiết, phân tích hình học DfAM và chế tác tại hệ thống trạm xưởng MES Hà Nội - Đà Nẵng - TP.HCM trong 24h.',
    phone TEXT DEFAULT '0981.234.567',
    email TEXT DEFAULT 'contact@vcube.vn',
    hanoi_workshop_address TEXT DEFAULT 'Xưởng In 3D VCUBE: Khu Công Nghệ Cao Hòa Lạc, Hà Nội',
    danang_workshop_address TEXT DEFAULT 'VCUBE Innovation Lab: Khu Công Nghệ Cao Đà Nẵng, Hòa Vang, Đà Nẵng',
    hcm_workshop_address TEXT DEFAULT 'VCUBE Smart MES Mega Hub: Đường D1, Khu Công Nghệ Cao (SHTP), TP. Thủ Đức, TP.HCM',
    announcement_text TEXT DEFAULT 'Ưu đãi tháng 9: Miễn phí kiểm tra thiết kế DfAM & Chiết khấu 15% cho đơn hàng nguyên mẫu đầu tiên!',
    announcement_enabled BOOLEAN DEFAULT true,
    banner_images JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS for site_content
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read site content" ON public.site_content;
CREATE POLICY "Public can read site content"
ON public.site_content FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Admins can update site content" ON public.site_content;
CREATE POLICY "Admins can update site content"
ON public.site_content FOR ALL
TO authenticated
USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR (SELECT email FROM auth.users WHERE id = auth.uid()) = 'chithanhso10@gmail.com'
)
WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR (SELECT email FROM auth.users WHERE id = auth.uid()) = 'chithanhso10@gmail.com'
);

-- ==============================================================================
-- 3. TABLE: public.materials (Materials Catalog)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.materials (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    brand TEXT DEFAULT 'VCUBE Industrial',
    type TEXT NOT NULL,
    density NUMERIC NOT NULL DEFAULT 1.24,
    cost_per_kg NUMERIC NOT NULL DEFAULT 280000,
    price_per_gram NUMERIC NOT NULL DEFAULT 850,
    unit_price_multiplier NUMERIC NOT NULL DEFAULT 1.0,
    spool_weight_grams INT NOT NULL DEFAULT 1000,
    extruder_temp_min INT NOT NULL DEFAULT 200,
    extruder_temp_max INT NOT NULL DEFAULT 220,
    bed_temp INT DEFAULT 60,
    strength TEXT DEFAULT 'Cao (Kháng va đập)',
    heat_resistance TEXT DEFAULT 'Tiêu chuẩn (60°C)',
    flexibility TEXT DEFAULT 'Cứng vững (Rigid)',
    colors JSONB NOT NULL DEFAULT '[]'::jsonb,
    desc_text TEXT DEFAULT '',
    recommended_for TEXT[] DEFAULT ARRAY['Cơ khí chính xác', 'Vỏ hộp thiết bị']::TEXT[],
    in_stock BOOLEAN DEFAULT true,
    stock_rolls_count INT DEFAULT 10,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read materials" ON public.materials;
CREATE POLICY "Public can read materials"
ON public.materials FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Admins can manage materials" ON public.materials;
CREATE POLICY "Admins can manage materials"
ON public.materials FOR ALL
TO authenticated
USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR (SELECT email FROM auth.users WHERE id = auth.uid()) = 'chithanhso10@gmail.com'
)
WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR (SELECT email FROM auth.users WHERE id = auth.uid()) = 'chithanhso10@gmail.com'
);

-- ==============================================================================
-- 4. TABLE: public.printer_fleet (Machine Fleet Specs)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.printer_fleet (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    brand TEXT NOT NULL DEFAULT 'Bambu Lab',
    model TEXT NOT NULL DEFAULT 'X1-Carbon',
    technology TEXT NOT NULL DEFAULT 'FDM',
    bed_dimensions JSONB NOT NULL DEFAULT '{"x":256,"y":256,"z":256}'::jsonb,
    power_kw NUMERIC NOT NULL DEFAULT 0.18,
    acquisition_cost NUMERIC NOT NULL DEFAULT 32000000,
    expected_lifetime_hours INT NOT NULL DEFAULT 8000,
    consumables_hourly_rate NUMERIC NOT NULL DEFAULT 2500,
    hourly_cost NUMERIC NOT NULL DEFAULT 22000,
    hourly_rate NUMERIC NOT NULL DEFAULT 45000,
    nozzle_diameter NUMERIC DEFAULT 0.4,
    max_print_speed_mms NUMERIC DEFAULT 500,
    heated_bed_max_temp INT DEFAULT 100,
    has_enclosure BOOLEAN NOT NULL DEFAULT true,
    has_ams BOOLEAN NOT NULL DEFAULT false,
    status TEXT NOT NULL DEFAULT 'idle',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.printer_fleet ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read printer fleet" ON public.printer_fleet;
CREATE POLICY "Public can read printer fleet"
ON public.printer_fleet FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Admins can manage printer fleet" ON public.printer_fleet;
CREATE POLICY "Admins can manage printer fleet"
ON public.printer_fleet FOR ALL
TO authenticated
USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR (SELECT email FROM auth.users WHERE id = auth.uid()) = 'chithanhso10@gmail.com'
)
WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR (SELECT email FROM auth.users WHERE id = auth.uid()) = 'chithanhso10@gmail.com'
);

-- ==============================================================================
-- 5. TABLE: public.workshop_partners (Distributed Regional MES Hubs)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.workshop_partners (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    region TEXT NOT NULL CHECK (region IN ('hanoi', 'danang', 'hcm')),
    address TEXT NOT NULL,
    contact_person TEXT DEFAULT 'Kỹ sư trưởng xưởng',
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    supported_technologies TEXT[] NOT NULL DEFAULT ARRAY['FDM']::TEXT[],
    max_build_volume JSONB NOT NULL DEFAULT '{"x":300,"y":300,"z":300}'::jsonb,
    active_printers_count INT NOT NULL DEFAULT 8,
    available_printers_count INT NOT NULL DEFAULT 3,
    sla_rating NUMERIC NOT NULL DEFAULT 4.9,
    completed_jobs_count INT NOT NULL DEFAULT 100,
    current_queue_length NUMERIC NOT NULL DEFAULT 5.0,
    in_stock_materials TEXT[] NOT NULL DEFAULT ARRAY['PLA Pro', 'PETG Technical Pro']::TEXT[],
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.workshop_partners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read workshop partners" ON public.workshop_partners;
CREATE POLICY "Public can read workshop partners"
ON public.workshop_partners FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Admins can manage workshop partners" ON public.workshop_partners;
CREATE POLICY "Admins can manage workshop partners"
ON public.workshop_partners FOR ALL
TO authenticated
USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR (SELECT email FROM auth.users WHERE id = auth.uid()) = 'chithanhso10@gmail.com'
)
WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR (SELECT email FROM auth.users WHERE id = auth.uid()) = 'chithanhso10@gmail.com'
);

-- ==============================================================================
-- 6. TABLE: public.accessories (Hardware, Fasteners, Inserts)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.accessories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    price NUMERIC NOT NULL DEFAULT 0,
    in_stock BOOLEAN NOT NULL DEFAULT true,
    stock_quantity INT NOT NULL DEFAULT 50,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.accessories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read accessories" ON public.accessories;
CREATE POLICY "Public can read accessories"
ON public.accessories FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Admins can manage accessories" ON public.accessories;
CREATE POLICY "Admins can manage accessories"
ON public.accessories FOR ALL
TO authenticated
USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR (SELECT email FROM auth.users WHERE id = auth.uid()) = 'chithanhso10@gmail.com'
)
WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR (SELECT email FROM auth.users WHERE id = auth.uid()) = 'chithanhso10@gmail.com'
);

-- ==============================================================================
-- 7. TABLE: public.orders (Production & Commercial Orders)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY,
    order_number TEXT NOT NULL UNIQUE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    secure_access_token TEXT NOT NULL UNIQUE,
    date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    estimated_delivery TIMESTAMPTZ,
    customer_email TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    total_amount NUMERIC NOT NULL DEFAULT 0,
    shipping_fee NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending_payment',
    status_stage_index INT NOT NULL DEFAULT 0,
    layer_progress NUMERIC NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL DEFAULT 'vietqr',
    payment_status TEXT NOT NULL DEFAULT 'unpaid',
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    shipping_address JSONB NOT NULL DEFAULT '{}'::jsonb,
    carrier JSONB,
    payment JSONB,
    assigned_workshop_id TEXT REFERENCES public.workshop_partners(id),
    assigned_printer_id TEXT REFERENCES public.printer_fleet(id),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast query
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_token ON public.orders(secure_access_token);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- RLS: Authenticated users can read their own orders
DROP POLICY IF EXISTS "Users can read own orders" ON public.orders;
CREATE POLICY "Users can read own orders"
ON public.orders FOR SELECT
TO authenticated
USING (
    auth.uid() = user_id
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    OR (SELECT email FROM auth.users WHERE id = auth.uid()) = 'chithanhso10@gmail.com'
);

-- RLS: Any client with the exact secure_access_token can select the single order
DROP POLICY IF EXISTS "Guest token holder can read order" ON public.orders;
CREATE POLICY "Guest token holder can read order"
ON public.orders FOR SELECT
TO anon, authenticated
USING (
    secure_access_token IS NOT NULL
    AND secure_access_token = current_setting('request.headers', true)::json ->> 'x-order-token'
);

-- RLS: Insertion is permitted for checkout
DROP POLICY IF EXISTS "Anyone can insert an order" ON public.orders;
CREATE POLICY "Anyone can insert an order"
ON public.orders FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- RLS: Only admins or owners can update
DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;
CREATE POLICY "Admins can update orders"
ON public.orders FOR UPDATE
TO authenticated
USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR (SELECT email FROM auth.users WHERE id = auth.uid()) = 'chithanhso10@gmail.com'
);

-- ==============================================================================
-- 8. TABLE: public.payment_transactions (VietQR Idempotency & Anti-Race Condition)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.payment_transactions (
    id TEXT PRIMARY KEY,
    order_id TEXT REFERENCES public.orders(id) ON DELETE CASCADE,
    transaction_id TEXT NOT NULL UNIQUE,
    amount NUMERIC NOT NULL,
    payment_gateway TEXT NOT NULL DEFAULT 'vietqr',
    payload JSONB DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'success',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_trans_tx_id ON public.payment_transactions(transaction_id);

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- Insertion is permitted for checkout & banking webhook confirmations
DROP POLICY IF EXISTS "Anyone can record payment transaction" ON public.payment_transactions;
CREATE POLICY "Anyone can record payment transaction"
ON public.payment_transactions FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view payment transactions" ON public.payment_transactions;
CREATE POLICY "Admins can view payment transactions"
ON public.payment_transactions FOR ALL
TO authenticated
USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR (SELECT email FROM auth.users WHERE id = auth.uid()) = 'chithanhso10@gmail.com'
);

-- ==============================================================================
-- 9. TABLE: public.user_profiles (Stakeholder Accounts & KYC)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    display_name TEXT,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'designer', 'lab', 'admin')),
    tier TEXT NOT NULL DEFAULT 'Standard',
    company TEXT,
    avatar_url TEXT,
    kyc_status TEXT NOT NULL DEFAULT 'unverified' CHECK (kyc_status IN ('verified', 'pending', 'pending_review', 'rejected', 'unverified')),
    kyc_details JSONB DEFAULT '{}'::jsonb,
    account_status TEXT NOT NULL DEFAULT 'active' CHECK (account_status IN ('active', 'suspended')),
    total_orders INT DEFAULT 0,
    total_spent NUMERIC DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profiles;
CREATE POLICY "Users can read own profile"
ON public.user_profiles FOR SELECT
TO authenticated
USING (
    auth.uid() = id
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    OR (SELECT email FROM auth.users WHERE id = auth.uid()) = 'chithanhso10@gmail.com'
);

DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile"
ON public.user_profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.user_profiles;
CREATE POLICY "Admins can manage all profiles"
ON public.user_profiles FOR ALL
TO authenticated
USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR (SELECT email FROM auth.users WHERE id = auth.uid()) = 'chithanhso10@gmail.com'
);

-- ==============================================================================
-- 10. INITIAL DEFAULT DATA SEEDING (Idempotent)
-- ==============================================================================
INSERT INTO public.site_content (id)
VALUES ('default')
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- 11. HELPER FUNCTIONS & BACKWARD COMPATIBILITY VIEWS
-- ==============================================================================

-- Security Definer function to track order safely by token without custom header injection
CREATE OR REPLACE FUNCTION public.get_order_by_guest_token(
    p_order_number TEXT,
    p_token TEXT
)
RETURNS SETOF public.orders
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT *
    FROM public.orders
    WHERE (order_number = p_order_number OR id = p_order_number)
      AND secure_access_token = p_token
    LIMIT 1;
$$;

-- Grant execution to public / anon clients
GRANT EXECUTE ON FUNCTION public.get_order_by_guest_token(TEXT, TEXT) TO anon, authenticated;

-- Backward Compatibility View for legacy pricing_config queries
CREATE OR REPLACE VIEW public.pricing_config AS 
SELECT 
    id,
    id AS key,
    config,
    updated_at
FROM public.pricing_configs;

