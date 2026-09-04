-- ==============================================================================
-- VCUBE 3D & INDUSTRIAL FABRICATION PLATFORM - COMPLETE SCHEMA & RLS SYNC
-- Migration: 20260904_sync_complete_schema.sql
-- Tables: materials, printer_fleet, accessories, workshop_partners
-- Author: Backend, Database & Pricing Security Specialist
-- Date: 2026-09-04
-- ==============================================================================

-- Enable UUID extension if not present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 1. EXTEND TABLE: public.materials
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.materials (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    density NUMERIC NOT NULL DEFAULT 1.24,
    cost_per_kg NUMERIC NOT NULL DEFAULT 280000,
    description TEXT,
    colors JSONB NOT NULL DEFAULT '[]'::jsonb,
    in_stock BOOLEAN DEFAULT true,
    stock_rolls_count INT DEFAULT 10,
    bed_temp INT DEFAULT 60,
    nozzle_temp INT DEFAULT 215,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Alter table to add all required columns safely
ALTER TABLE public.materials 
    ADD COLUMN IF NOT EXISTS brand TEXT DEFAULT 'VCUBE Industrial',
    ADD COLUMN IF NOT EXISTS strength TEXT DEFAULT 'Cao (Kháng va đập)',
    ADD COLUMN IF NOT EXISTS heat_resistance TEXT DEFAULT 'Tiêu chuẩn (60°C)',
    ADD COLUMN IF NOT EXISTS flexibility TEXT DEFAULT 'Cứng vững (Rigid)',
    ADD COLUMN IF NOT EXISTS "desc" TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS price_per_gram NUMERIC NOT NULL DEFAULT 850,
    ADD COLUMN IF NOT EXISTS unit_price_multiplier NUMERIC NOT NULL DEFAULT 1.0,
    ADD COLUMN IF NOT EXISTS spool_weight_grams INT NOT NULL DEFAULT 1000,
    ADD COLUMN IF NOT EXISTS extruder_temp_min INT NOT NULL DEFAULT 200,
    ADD COLUMN IF NOT EXISTS extruder_temp_max INT NOT NULL DEFAULT 220,
    ADD COLUMN IF NOT EXISTS recommended_for TEXT[] DEFAULT ARRAY['Cơ khí chính xác', 'Vỏ hộp thiết bị']::TEXT[],
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- RLS for materials
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read materials" ON public.materials;
CREATE POLICY "Public can read materials" 
ON public.materials 
FOR SELECT 
TO anon, authenticated 
USING (true);

DROP POLICY IF EXISTS "Admins can manage materials" ON public.materials;
CREATE POLICY "Admins can manage materials" 
ON public.materials 
FOR ALL 
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
-- 2. EXTEND TABLE: public.printer_fleet
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.printer_fleet (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    technology TEXT NOT NULL DEFAULT 'FDM',
    build_volume JSONB NOT NULL DEFAULT '{"x":256,"y":256,"z":256}'::jsonb,
    status TEXT NOT NULL DEFAULT 'idle',
    hourly_rate NUMERIC NOT NULL DEFAULT 45000,
    hourly_cost NUMERIC NOT NULL DEFAULT 22000,
    nozzle_diameter NUMERIC DEFAULT 0.4,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Alter table to add all missing fleet specifications
ALTER TABLE public.printer_fleet 
    ADD COLUMN IF NOT EXISTS bed_dimensions JSONB NOT NULL DEFAULT '{"x":256,"y":256,"z":256}'::jsonb,
    ADD COLUMN IF NOT EXISTS power_kw NUMERIC NOT NULL DEFAULT 0.18,
    ADD COLUMN IF NOT EXISTS acquisition_cost NUMERIC NOT NULL DEFAULT 32000000,
    ADD COLUMN IF NOT EXISTS expected_lifetime_hours INT NOT NULL DEFAULT 8000,
    ADD COLUMN IF NOT EXISTS consumables_hourly_rate NUMERIC NOT NULL DEFAULT 2500,
    ADD COLUMN IF NOT EXISTS has_enclosure BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS has_ams BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS max_print_speed_mms NUMERIC DEFAULT 500,
    ADD COLUMN IF NOT EXISTS heated_bed_max_temp INT DEFAULT 100,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- RLS for printer_fleet
ALTER TABLE public.printer_fleet ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read printer fleet" ON public.printer_fleet;
CREATE POLICY "Public can read printer fleet" 
ON public.printer_fleet 
FOR SELECT 
TO anon, authenticated 
USING (true);

DROP POLICY IF EXISTS "Admins can manage printer fleet" ON public.printer_fleet;
CREATE POLICY "Admins can manage printer fleet" 
ON public.printer_fleet 
FOR ALL 
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
-- 3. CREATE TABLE: public.accessories
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.accessories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'hardware',
    price NUMERIC NOT NULL DEFAULT 0,
    in_stock BOOLEAN NOT NULL DEFAULT true,
    stock_quantity INT NOT NULL DEFAULT 0,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for accessories
CREATE INDEX IF NOT EXISTS idx_accessories_type ON public.accessories(type);
CREATE INDEX IF NOT EXISTS idx_accessories_in_stock ON public.accessories(in_stock);

-- RLS for accessories
ALTER TABLE public.accessories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read accessories" ON public.accessories;
CREATE POLICY "Public can read accessories" 
ON public.accessories 
FOR SELECT 
TO anon, authenticated 
USING (true);

DROP POLICY IF EXISTS "Admins can manage accessories" ON public.accessories;
CREATE POLICY "Admins can manage accessories" 
ON public.accessories 
FOR ALL 
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
-- 4. CREATE TABLE: public.workshop_partners
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.workshop_partners (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT UNIQUE,
    region TEXT NOT NULL DEFAULT 'hanoi',
    address TEXT,
    phone TEXT,
    email TEXT,
    capacity_status TEXT NOT NULL DEFAULT 'available',
    rating NUMERIC(3, 2) DEFAULT 5.0,
    sla_on_time_rate NUMERIC(5, 2) DEFAULT 98.5,
    active_jobs_count INT DEFAULT 0,
    supported_technologies TEXT[] DEFAULT ARRAY['FDM']::TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for workshop_partners
CREATE INDEX IF NOT EXISTS idx_workshop_partners_region ON public.workshop_partners(region);
CREATE INDEX IF NOT EXISTS idx_workshop_partners_capacity ON public.workshop_partners(capacity_status);

-- RLS for workshop_partners
ALTER TABLE public.workshop_partners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read workshop partners" ON public.workshop_partners;
CREATE POLICY "Public can read workshop partners" 
ON public.workshop_partners 
FOR SELECT 
TO anon, authenticated 
USING (true);

DROP POLICY IF EXISTS "Admins can manage workshop partners" ON public.workshop_partners;
CREATE POLICY "Admins can manage workshop partners" 
ON public.workshop_partners 
FOR ALL 
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
-- 5. INITIAL SEED DATA FOR ACCESSORIES & WORKSHOP PARTNERS
-- ==============================================================================

-- Seed initial accessories
INSERT INTO public.accessories (id, name, type, price, in_stock, stock_quantity, description)
VALUES 
    ('acc-keychain-ring-chain', 'Khoen móc khóa xoay Inox + Dây xích 25mm', 'keychain', 3000, true, 450, 'Khoen kim loại không gỉ mạ niken bóng, vòng xoay 360 độ, chịu lực kéo 5kg.'),
    ('acc-paracord-lanyard', 'Dây dù Paracord 550 kèm Chốt khóa Mini EDC', 'keychain', 6000, true, 180, 'Dây dù 7 lõi đan thủ công, chịu tải cao, gắn kèm chốt bấm kim loại tiện dụng.'),
    ('acc-brass-insert-m3', 'Đai ốc ren đồng thau cấy nhiệt M3 (Threaded Insert)', 'fastener', 2000, true, 1200, 'Đai ốc ren M3x4mm bằng đồng thau, thiết kế rãnh xoắn kép chống trượt xoay khi cấy nhiệt.'),
    ('acc-magnet-neodymium-6x3', 'Nam châm đất hiếm Neodymium N52 tròn 6x3mm', 'magnet', 3500, true, 600, 'Nam châm lực hút cực mạnh Grade N52 mạ 3 lớp Ni-Cu-Ni chống gỉ sét, lực hút 1.2kg.'),
    ('acc-bearing-608zz', 'Vòng bi thép tốc độ cao 608ZZ (8x22x7mm)', 'bearing', 9000, true, 320, 'Vòng bi bạc đạn ABEC-7 chuyên dụng cho khớp xoay cơ khí, trục rulo và đồ chơi spinner.'),
    ('acc-pack-zip-esd', 'Túi zip tráng bạc chống tĩnh điện ESD + Hút ẩm', 'packaging', 4500, true, 800, 'Quy cách đóng gói công nghiệp bảo vệ bo mạch và chi tiết nhựa kỹ thuật khỏi độ ẩm.')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    type = EXCLUDED.type,
    price = EXCLUDED.price,
    in_stock = EXCLUDED.in_stock,
    stock_quantity = EXCLUDED.stock_quantity,
    description = EXCLUDED.description,
    updated_at = NOW();

-- Seed initial workshop partners
INSERT INTO public.workshop_partners (id, name, code, region, address, phone, email, capacity_status, rating, sla_on_time_rate, active_jobs_count, supported_technologies)
VALUES 
    ('ws-hanoi-hub', 'VCUBE R&D & MES Farm Hà Nội', 'WS-HAN-01', 'hanoi', 'Số 18 Hoàng Quốc Việt, Cầu Giấy, Hà Nội', '0981.234.567', 'hanoi.hub@vcube.vn', 'available', 4.95, 99.2, 16, ARRAY['FDM', 'SLA', 'SLS']),
    ('ws-danang-lab', 'VCUBE Innovation Hub Đà Nẵng', 'WS-DAD-01', 'danang', 'Khu Công Nghệ Cao Đà Nẵng, Hòa Vang, Đà Nẵng', '0905.888.999', 'danang.hub@vcube.vn', 'available', 4.88, 98.4, 8, ARRAY['FDM', 'SLA']),
    ('ws-hcm-mega', 'VCUBE Smart MES Hub TP. Hồ Chí Minh', 'WS-SGN-01', 'hcm', 'Đường D1, Khu Công Nghệ Cao (SHTP), TP. Thủ Đức, TP.HCM', '0912.456.789', 'hcm.hub@vcube.vn', 'available', 4.98, 99.6, 28, ARRAY['FDM', 'SLA', 'SLS'])
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    code = EXCLUDED.code,
    region = EXCLUDED.region,
    address = EXCLUDED.address,
    phone = EXCLUDED.phone,
    email = EXCLUDED.email,
    capacity_status = EXCLUDED.capacity_status,
    rating = EXCLUDED.rating,
    sla_on_time_rate = EXCLUDED.sla_on_time_rate,
    active_jobs_count = EXCLUDED.active_jobs_count,
    supported_technologies = EXCLUDED.supported_technologies,
    updated_at = NOW();
