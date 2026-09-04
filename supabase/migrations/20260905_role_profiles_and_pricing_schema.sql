-- ==============================================================================
-- VCUBE PLATFORM - ROLE PROFILES, INKIRI PRICING ENGINE & INVENTORY AUDIT SCHEMA
-- Migration: 20260905_role_profiles_and_pricing_schema.sql
-- Description: Multi-tenant workshop profiles, machine fleet, materials & inventory audit trail,
--              designer/customer profiles, global pricing settings, and accessories.
-- Author: Subagent A (Data & Security Layer)
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 0. Update user_profiles.role check constraint to support 'workshop' (with backward compatibility for 'lab')
DO $$
BEGIN
    ALTER TABLE IF EXISTS public.user_profiles 
    DROP CONSTRAINT IF EXISTS user_profiles_role_check;
    
    ALTER TABLE IF EXISTS public.user_profiles
    ADD CONSTRAINT user_profiles_role_check 
    CHECK (role IN ('customer', 'designer', 'workshop', 'lab', 'admin'));
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- ==============================================================================
-- 1. TABLE: public.workshop_profiles (1-1 with partners / workshop users)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.workshop_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    partner_id TEXT, -- optional link to public.workshop_partners(id)
    workshop_name TEXT NOT NULL,
    address TEXT NOT NULL,
    region TEXT NOT NULL DEFAULT 'Bắc' CHECK (region IN ('Bắc', 'Trung', 'Nam', 'hanoi', 'danang', 'hcm')),
    total_machines INT NOT NULL DEFAULT 0,
    active_machines_now INT NOT NULL DEFAULT 0,
    electricity_rate_override NUMERIC, -- nullable, overrides global electricity rate if specified
    labor_rate_override NUMERIC,       -- nullable, overrides global labor hourly rate if specified
    verified_status TEXT NOT NULL DEFAULT 'Pending' CHECK (verified_status IN ('Pending', 'Verified', 'Suspended')),
    contact_phone TEXT,
    contact_email TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workshop_profiles_user_id ON public.workshop_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_workshop_profiles_region ON public.workshop_profiles(region);
CREATE INDEX IF NOT EXISTS idx_workshop_profiles_verified ON public.workshop_profiles(verified_status);

ALTER TABLE public.workshop_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view verified workshops" ON public.workshop_profiles;
CREATE POLICY "Public can view verified workshops"
ON public.workshop_profiles FOR SELECT
TO anon, authenticated
USING (verified_status = 'Verified' OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Workshop owners can update own profile" ON public.workshop_profiles;
CREATE POLICY "Workshop owners can update own profile"
ON public.workshop_profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all workshop profiles" ON public.workshop_profiles;
CREATE POLICY "Admins can manage all workshop profiles"
ON public.workshop_profiles FOR ALL
TO authenticated
USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR (SELECT email FROM auth.users WHERE id = auth.uid()) = 'chithanhso10@gmail.com'
);

-- ==============================================================================
-- 2. TABLE: public.workshop_machines (N-1 with workshop)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.workshop_machines (
    id TEXT PRIMARY KEY DEFAULT ('wm_' || substr(md5(random()::text), 1, 10)),
    workshop_id UUID NOT NULL REFERENCES public.workshop_profiles(id) ON DELETE CASCADE,
    machine_name TEXT NOT NULL,
    machine_type TEXT NOT NULL DEFAULT 'FDM' CHECK (machine_type IN ('FDM', 'SLA', 'SLS', 'PolyJet')),
    avg_power_kw NUMERIC NOT NULL DEFAULT 0.18, -- Average operating power (not rated peak power)
    purchase_price NUMERIC NOT NULL DEFAULT 25000000, -- Purchase cost in VND
    lifetime_hours INT NOT NULL DEFAULT 8000,          -- Expected lifetime operating hours
    status TEXT NOT NULL DEFAULT 'Free' CHECK (status IN ('Free', 'Busy', 'Maintenance', 'Offline')),
    current_job_id TEXT,                               -- nullable link to active order
    build_volume_mm JSONB DEFAULT '{"x":256,"y":256,"z":256}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workshop_machines_workshop_id ON public.workshop_machines(workshop_id);
CREATE INDEX IF NOT EXISTS idx_workshop_machines_status ON public.workshop_machines(status);

ALTER TABLE public.workshop_machines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active machines" ON public.workshop_machines;
CREATE POLICY "Public can view active machines"
ON public.workshop_machines FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Workshop owners can manage own machines" ON public.workshop_machines;
CREATE POLICY "Workshop owners can manage own machines"
ON public.workshop_machines FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.workshop_profiles wp
        WHERE wp.id = workshop_machines.workshop_id AND wp.user_id = auth.uid()
    )
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    OR (SELECT email FROM auth.users WHERE id = auth.uid()) = 'chithanhso10@gmail.com'
);

-- ==============================================================================
-- 3. TABLE: public.workshop_materials (N-1 with workshop)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.workshop_materials (
    id TEXT PRIMARY KEY DEFAULT ('wmat_' || substr(md5(random()::text), 1, 10)),
    workshop_id UUID NOT NULL REFERENCES public.workshop_profiles(id) ON DELETE CASCADE,
    material_name TEXT NOT NULL,
    material_type TEXT NOT NULL DEFAULT 'PLA' CHECK (material_type IN ('PLA', 'PETG', 'ABS', 'ASA', 'TPU', 'PC', 'PA', 'PVA', 'Resin')),
    price_per_kg NUMERIC NOT NULL DEFAULT 280000,
    color_hex TEXT NOT NULL DEFAULT '#1E293B',
    color_name TEXT DEFAULT 'Tiêu chuẩn',
    density NUMERIC NOT NULL DEFAULT 1.24,
    stock_status TEXT NOT NULL DEFAULT 'Tracking' CHECK (stock_status IN ('Tracking', 'NotTracking', 'LowStock', 'OutOfStock')),
    current_stock_grams NUMERIC NOT NULL DEFAULT 5000,
    low_stock_threshold_grams NUMERIC NOT NULL DEFAULT 1000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workshop_materials_workshop_id ON public.workshop_materials(workshop_id);
CREATE INDEX IF NOT EXISTS idx_workshop_materials_type ON public.workshop_materials(material_type);

ALTER TABLE public.workshop_materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view workshop materials" ON public.workshop_materials;
CREATE POLICY "Public can view workshop materials"
ON public.workshop_materials FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Workshop owners can manage own materials" ON public.workshop_materials;
CREATE POLICY "Workshop owners can manage own materials"
ON public.workshop_materials FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.workshop_profiles wp
        WHERE wp.id = workshop_materials.workshop_id AND wp.user_id = auth.uid()
    )
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    OR (SELECT email FROM auth.users WHERE id = auth.uid()) = 'chithanhso10@gmail.com'
);

-- ==============================================================================
-- 4. TABLE: public.material_inventory_logs (Audit Trail for Stock & Price Changes)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.material_inventory_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    material_id TEXT NOT NULL REFERENCES public.workshop_materials(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('Import', 'Export', 'Adjustment')),
    grams NUMERIC NOT NULL,
    price_per_kg_at_time NUMERIC,
    supplier TEXT,
    batch_code TEXT,
    note TEXT,
    created_by TEXT DEFAULT 'system',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_material_inventory_logs_material_id ON public.material_inventory_logs(material_id);
CREATE INDEX IF NOT EXISTS idx_material_inventory_logs_created_at ON public.material_inventory_logs(created_at DESC);

ALTER TABLE public.material_inventory_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workshop owners and admins can view inventory logs" ON public.material_inventory_logs;
CREATE POLICY "Workshop owners and admins can view inventory logs"
ON public.material_inventory_logs FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.workshop_materials wm
        JOIN public.workshop_profiles wp ON wp.id = wm.workshop_id
        WHERE wm.id = material_inventory_logs.material_id AND (wp.user_id = auth.uid() OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
    )
    OR (SELECT email FROM auth.users WHERE id = auth.uid()) = 'chithanhso10@gmail.com'
);

DROP POLICY IF EXISTS "Workshop owners and admins can insert inventory logs" ON public.material_inventory_logs;
CREATE POLICY "Workshop owners and admins can insert inventory logs"
ON public.material_inventory_logs FOR INSERT
TO authenticated
WITH CHECK (true);

-- Trigger: When an Import log is inserted, automatically update workshop_materials.price_per_kg and adjust stock
CREATE OR REPLACE FUNCTION public.fn_sync_material_on_inventory_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- If importing with a new price, auto-update price_per_kg
    IF NEW.action = 'Import' THEN
        UPDATE public.workshop_materials
        SET current_stock_grams = current_stock_grams + NEW.grams,
            price_per_kg = COALESCE(NULLIF(NEW.price_per_kg_at_time, 0), price_per_kg),
            stock_status = CASE 
                WHEN current_stock_grams + NEW.grams <= 0 THEN 'OutOfStock'
                WHEN current_stock_grams + NEW.grams <= low_stock_threshold_grams THEN 'LowStock'
                ELSE 'Tracking'
            END,
            updated_at = NOW()
        WHERE id = NEW.material_id;
    ELSIF NEW.action = 'Export' THEN
        UPDATE public.workshop_materials
        SET current_stock_grams = GREATEST(0, current_stock_grams - NEW.grams),
            stock_status = CASE 
                WHEN GREATEST(0, current_stock_grams - NEW.grams) = 0 THEN 'OutOfStock'
                WHEN GREATEST(0, current_stock_grams - NEW.grams) <= low_stock_threshold_grams THEN 'LowStock'
                ELSE 'Tracking'
            END,
            updated_at = NOW()
        WHERE id = NEW.material_id;
    ELSIF NEW.action = 'Adjustment' THEN
        UPDATE public.workshop_materials
        SET current_stock_grams = NEW.grams,
            stock_status = CASE 
                WHEN NEW.grams <= 0 THEN 'OutOfStock'
                WHEN NEW.grams <= low_stock_threshold_grams THEN 'LowStock'
                ELSE 'Tracking'
            END,
            updated_at = NOW()
        WHERE id = NEW.material_id;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_material_on_inventory_log ON public.material_inventory_logs;
CREATE TRIGGER trg_sync_material_on_inventory_log
AFTER INSERT ON public.material_inventory_logs
FOR EACH ROW
EXECUTE FUNCTION public.fn_sync_material_on_inventory_log();

-- ==============================================================================
-- 5. TABLE: public.designer_profiles (1-1 with users role=Designer)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.designer_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    bio TEXT,
    avatar_url TEXT,
    cover_url TEXT,
    social_links JSONB NOT NULL DEFAULT '{}'::jsonb,
    default_royalty_percent NUMERIC NOT NULL DEFAULT 10,
    license_mode TEXT NOT NULL DEFAULT 'PrintOnly' CHECK (license_mode IN ('PrintOnly', 'CommercialSubscription')),
    badge_tier TEXT NOT NULL DEFAULT 'Standard' CHECK (badge_tier IN ('Standard', 'TopCreator', 'VerifiedEngineer', 'PioneerMaker')),
    payout_bank_info TEXT, -- encrypted or masked
    total_sales_count INT DEFAULT 0,
    total_royalties_earned NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.designer_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view designer profiles" ON public.designer_profiles;
CREATE POLICY "Public can view designer profiles"
ON public.designer_profiles FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Designers can update own profile" ON public.designer_profiles;
CREATE POLICY "Designers can update own profile"
ON public.designer_profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
    auth.uid() = user_id
    -- Cannot self-promote badge tier
    AND badge_tier = (SELECT badge_tier FROM public.designer_profiles WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Admins can manage all designer profiles" ON public.designer_profiles;
CREATE POLICY "Admins can manage all designer profiles"
ON public.designer_profiles FOR ALL
TO authenticated
USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    OR (SELECT email FROM auth.users WHERE id = auth.uid()) = 'chithanhso10@gmail.com'
);

-- ==============================================================================
-- 6. TABLE: public.customer_profiles (1-1 with users role=Customer)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.customer_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    default_shipping_address JSONB NOT NULL DEFAULT '{}'::jsonb,
    preferred_payment_method TEXT NOT NULL DEFAULT 'vietqr',
    company_name TEXT,
    tax_id TEXT,
    billing_email TEXT,
    nda_signed BOOLEAN NOT NULL DEFAULT false,
    nda_signed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers can view own profile" ON public.customer_profiles;
CREATE POLICY "Customers can view own profile"
ON public.customer_profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Customers can update own profile" ON public.customer_profiles;
CREATE POLICY "Customers can update own profile"
ON public.customer_profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all customer profiles" ON public.customer_profiles;
CREATE POLICY "Admins can manage all customer profiles"
ON public.customer_profiles FOR ALL
TO authenticated
USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    OR (SELECT email FROM auth.users WHERE id = auth.uid()) = 'chithanhso10@gmail.com'
);

-- ==============================================================================
-- 7. TABLE: public.pricing_global_settings (Inkiri Global Parameters - Admin Controlled)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.pricing_global_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    electricity_rate_vnd_kwh NUMERIC NOT NULL DEFAULT 2850,
    default_labor_rate_vnd_hour NUMERIC NOT NULL DEFAULT 65000,
    default_scrap_rate_percent NUMERIC NOT NULL DEFAULT 5, -- Dự phòng in hỏng %
    profit_mode TEXT NOT NULL DEFAULT 'Markup' CHECK (profit_mode IN ('Markup', 'Margin')),
    default_profit_percent NUMERIC NOT NULL DEFAULT 35,     -- Tỷ lệ lợi nhuận %
    marketplace_fee_percent NUMERIC NOT NULL DEFAULT 8,     -- Phí sàn %
    marketplace_fixed_fee_vnd NUMERIC NOT NULL DEFAULT 5000,-- Phí cố định / đơn
    overhead_monthly_cost NUMERIC NOT NULL DEFAULT 15000000, -- Chi phí cố định tháng
    avg_products_sold_per_month INT NOT NULL DEFAULT 300,   -- Số SP bán / tháng dự kiến
    enable_accessories_pricing BOOLEAN NOT NULL DEFAULT true,
    enable_marketplace_fee_mode BOOLEAN NOT NULL DEFAULT false,
    enable_advanced_overhead BOOLEAN NOT NULL DEFAULT true,
    version INT NOT NULL DEFAULT 1,
    updated_by TEXT DEFAULT 'admin',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.pricing_global_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view pricing settings" ON public.pricing_global_settings;
CREATE POLICY "Public can view pricing settings"
ON public.pricing_global_settings FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Admins can update pricing settings" ON public.pricing_global_settings;
CREATE POLICY "Admins can update pricing settings"
ON public.pricing_global_settings FOR ALL
TO authenticated
USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    OR (SELECT email FROM auth.users WHERE id = auth.uid()) = 'chithanhso10@gmail.com'
);

-- ==============================================================================
-- 8. TABLE: public.workshop_accessories (Addon Hardware / Packaging per Workshop)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.workshop_accessories (
    id TEXT PRIMARY KEY DEFAULT ('acc_' || substr(md5(random()::text), 1, 10)),
    workshop_id UUID REFERENCES public.workshop_profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    group_name TEXT NOT NULL DEFAULT 'Hardware', -- Hardware, Packaging, Fastener, Magnet
    qty_per_pack INT NOT NULL DEFAULT 100,
    price_per_pack NUMERIC NOT NULL DEFAULT 50000,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.workshop_accessories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active accessories" ON public.workshop_accessories;
CREATE POLICY "Public can view active accessories"
ON public.workshop_accessories FOR SELECT
TO anon, authenticated
USING (is_active = true OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Admins and workshops can manage accessories" ON public.workshop_accessories;
CREATE POLICY "Admins and workshops can manage accessories"
ON public.workshop_accessories FOR ALL
TO authenticated
USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    OR (SELECT email FROM auth.users WHERE id = auth.uid()) = 'chithanhso10@gmail.com'
    OR EXISTS (
        SELECT 1 FROM public.workshop_profiles wp
        WHERE wp.id = workshop_accessories.workshop_id AND wp.user_id = auth.uid()
    )
);

-- ==============================================================================
-- 9. DEFAULT SEEDING
-- ==============================================================================
INSERT INTO public.pricing_global_settings (id)
VALUES ('default')
ON CONFLICT (id) DO NOTHING;

-- Seed default global accessories if table empty
INSERT INTO public.workshop_accessories (id, name, group_name, qty_per_pack, price_per_pack)
VALUES 
    ('acc_heatset_m3', 'Ốc cấy nhiệt M3x4x5mm (Heat-set Inserts)', 'Hardware', 100, 65000),
    ('acc_heatset_m4', 'Ốc cấy nhiệt M4x5x6mm (Heat-set Inserts)', 'Hardware', 100, 78000),
    ('acc_magnet_6x3', 'Nam châm Neodymium N52 6x3mm', 'Magnet', 50, 85000),
    ('acc_box_standard', 'Hộp carton định hình VCUBE Eco + Xốp chống sốc', 'Packaging', 50, 350000)
ON CONFLICT (id) DO NOTHING;

