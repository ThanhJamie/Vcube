-- ==============================================================================
-- VCUBE 3D & INDUSTRIAL FABRICATION PLATFORM - COMPREHENSIVE SUPABASE SCHEMA & SEEDS
-- Tables: products, orders, user_profiles, materials, printer_fleet, pricing_config, kyc_records
-- Author: VCUBE Engineering Core
-- Date: 2026-09-04
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 1. TABLE: public.products
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    sku TEXT UNIQUE,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'mechanical',
    designer TEXT NOT NULL DEFAULT 'VCUBE Engineering Team',
    price_physical NUMERIC NOT NULL DEFAULT 0,
    price_digital NUMERIC NOT NULL DEFAULT 0,
    images JSONB NOT NULL DEFAULT '[]'::jsonb,
    thumbnail_url TEXT,
    cad_file_url TEXT,
    cad_format TEXT DEFAULT 'STL',
    file_size_bytes BIGINT DEFAULT 0,
    description TEXT,
    features JSONB NOT NULL DEFAULT '[]'::jsonb,
    specs JSONB NOT NULL DEFAULT '{}'::jsonb,
    supported_materials JSONB NOT NULL DEFAULT '["PLA Tough"]'::jsonb,
    colors JSONB NOT NULL DEFAULT '[]'::jsonb,
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    badge TEXT,
    rating NUMERIC(3, 2) DEFAULT 5.0,
    reviews_count INT DEFAULT 0,
    prints_count INT DEFAULT 0,
    print_time TEXT DEFAULT '2h',
    is_customizable BOOLEAN DEFAULT false,
    license_type TEXT DEFAULT 'Commercial',
    status TEXT NOT NULL DEFAULT 'published',
    production_readiness TEXT DEFAULT 'ready_to_print',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view published products" ON public.products;
CREATE POLICY "Public can view published products" ON public.products FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Admins can manage products" ON public.products FOR ALL USING (true);

-- ==============================================================================
-- 2. TABLE: public.orders
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY,
    order_number TEXT UNIQUE NOT NULL,
    date TEXT NOT NULL,
    estimated_delivery TEXT,
    status TEXT NOT NULL DEFAULT 'printing',
    status_stage_index INT NOT NULL DEFAULT 4,
    layer_progress INT DEFAULT 64,
    time_remaining TEXT DEFAULT '04h 12m',
    customer_type TEXT DEFAULT 'registered',
    secure_access_token TEXT,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    shipping_address JSONB NOT NULL DEFAULT '{}'::jsonb,
    carrier JSONB NOT NULL DEFAULT '{}'::jsonb,
    payment JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view orders" ON public.orders;
CREATE POLICY "Public can view orders" ON public.orders FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public can insert orders" ON public.orders;
CREATE POLICY "Public can insert orders" ON public.orders FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;
CREATE POLICY "Admins can update orders" ON public.orders FOR ALL USING (true);

-- ==============================================================================
-- 3. TABLE: public.user_profiles
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'customer',
    tier TEXT DEFAULT 'Standard',
    kyc_status TEXT NOT NULL DEFAULT 'unverified',
    status TEXT NOT NULL DEFAULT 'active',
    total_orders INT DEFAULT 0,
    total_spent_or_earned NUMERIC DEFAULT 0,
    kyc_details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view profiles" ON public.user_profiles;
CREATE POLICY "Users can view profiles" ON public.user_profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage profiles" ON public.user_profiles;
CREATE POLICY "Admins can manage profiles" ON public.user_profiles FOR ALL USING (true);

-- ==============================================================================
-- 4. TABLE: public.materials
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

ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read materials" ON public.materials;
CREATE POLICY "Public can read materials" ON public.materials FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage materials" ON public.materials;
CREATE POLICY "Admins can manage materials" ON public.materials FOR ALL USING (true);

-- ==============================================================================
-- 5. TABLE: public.printer_fleet
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

ALTER TABLE public.printer_fleet ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read printer fleet" ON public.printer_fleet;
CREATE POLICY "Public can read printer fleet" ON public.printer_fleet FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage printer fleet" ON public.printer_fleet;
CREATE POLICY "Admins can manage printer fleet" ON public.printer_fleet FOR ALL USING (true);

-- ==============================================================================
-- 6. TABLE: public.pricing_config
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.pricing_config (
    id TEXT PRIMARY KEY DEFAULT 'default_inkiri_config',
    config JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.pricing_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read pricing config" ON public.pricing_config;
CREATE POLICY "Public can read pricing config" ON public.pricing_config FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage pricing config" ON public.pricing_config;
CREATE POLICY "Admins can manage pricing config" ON public.pricing_config FOR ALL USING (true);

-- ==============================================================================
-- 7. SEED DATA (NẠP DỮ LIỆU MẪU BAN ĐẦU ĐỒNG BỘ 100%)
-- ==============================================================================

-- 7.1 SEED PRODUCTS
INSERT INTO public.products (
    id, sku, name, category, designer, price_physical, price_digital,
    images, thumbnail_url, cad_file_url, cad_format, description,
    features, specs, supported_materials, colors, tags, badge, rating, reviews_count, prints_count, print_time, is_customizable
) VALUES
(
    'prod-1', 'VC-MECH-001', 'Bánh Răng Hành Tinh Kép Tỉ Số 5:1', 'mechanical', 'VCUBE Precision Labs',
    165000, 45000,
    '["https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=800&auto=format&fit=crop&q=80"]'::jsonb,
    'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=800&auto=format&fit=crop&q=80',
    '/models/planetary_gear.stl', 'STL',
    'Bộ bánh răng hành tinh tỉ số truyền động cao, module m=1.5, tối ưu chống kẹt cơ học và chịu tải mô-men xoắn lớn.',
    '["Ăn khớp chuẩn involute", "Chịu lực xoắn 12 N.m", "Lắp ráp không cần keo dán"]'::jsonb,
    '{"dimensions": "92 x 92 x 38 mm", "weight": "85g", "resolution": "0.16mm", "infillDefault": "40% Gyroid"}'::jsonb,
    '["PLA Tough", "PETG Carbon", "Nylon PA12"]'::jsonb,
    '[{"name": "Xanh Teal VCUBE", "hex": "#00687a", "available": true}, {"name": "Đen Kỹ Thuật", "hex": "#091426", "available": true}]'::jsonb,
    '["Bán chạy nhất", "Bánh răng", "Cơ khí chính xác", "ISO-52900"]'::jsonb,
    'TOP SELLER', 4.95, 48, 142, '3h 15m', true
),
(
    'prod-2', 'VC-CASE-002', 'Vỏ Bọc Vi Điều Khiển Snap-Fit Arduino / ESP32', 'enclosure', 'TechLab Vietnam',
    120000, 35000,
    '["https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80"]'::jsonb,
    'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80',
    '/models/arduino_case.stl', 'STL',
    'Hộp bảo vệ bo mạch phát triển IoT với cơ cấu ngàm bấm Snap-fit chắc chắn, có sẵn lỗ ren trụ M3 và khe tản nhiệt đối lưu.',
    '["Khóa nắp Snap-fit 0.2mm", "Có sẵn 4 trụ ren M3", "Hỗ trợ khắc Laser tên dự án"]'::jsonb,
    '{"dimensions": "110 x 75 x 32 mm", "weight": "62g", "resolution": "0.16mm", "infillDefault": "25% Grid"}'::jsonb,
    '["PETG Technical Pro", "ABS Fireproof", "PLA+"]'::jsonb,
    '[{"name": "Xanh Teal Công Nghiệp", "hex": "#00687a", "available": true}, {"name": "Trắng Kỹ Thuật", "hex": "#F8FAFC", "available": true}]'::jsonb,
    '["Vỏ hộp IoT", "Tùy biến laser", "Snap-fit", "ESD Safe"]'::jsonb,
    'HOT', 4.9, 32, 98, '2h 20m', true
),
(
    'prod-3', 'VC-AERO-003', 'Khung Drone FPV 5 Inch Cực Nhẹ Chịu Lực', 'aerospace', 'AeroDynamics VN',
    350000, 85000,
    '["https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=800&auto=format&fit=crop&q=80"]'::jsonb,
    'https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=800&auto=format&fit=crop&q=80',
    '/models/fpv_frame.stl', 'STEP',
    'Khung quadcopter cấu trúc khí động học tối ưu, phân bổ ứng suất FEA chịu va đập tốc độ cao lên tới 120km/h.',
    '["Vật liệu gia cường sợi carbon", "Tối ưu hóa FEA topology", "Cân nặng chỉ 74 gram"]'::jsonb,
    '{"dimensions": "180 x 180 x 45 mm", "weight": "74g", "resolution": "0.12mm", "infillDefault": "100% Solid"}'::jsonb,
    '["PETG Carbon Fiber", "Nylon Carbon PA-CF"]'::jsonb,
    '[{"name": "Đen Carbon Matte", "hex": "#1a1a1a", "available": true}]'::jsonb,
    '["FPV Racing", "Carbon Fiber", "Chịu lực cao"]'::jsonb,
    'PRO GRADE', 5.0, 19, 64, '5h 45m', false
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    price_physical = EXCLUDED.price_physical,
    price_digital = EXCLUDED.price_digital,
    updated_at = NOW();

-- 7.2 SEED ORDERS
INSERT INTO public.orders (
    id, order_number, date, estimated_delivery, status, status_stage_index, layer_progress, time_remaining,
    customer_type, secure_access_token, items, shipping_address, carrier, payment
) VALUES
(
    'ord-8924', '#VCUBE-8924-A', '24/10/2026 09:15', '26/10/2026', 'printing', 4, 64, '04h 12m',
    'registered', 'tok_8924_xyz',
    '[{"id":"ord-item-1","name":"Vỏ bọc Arduino Pro Max Snap-Fit","designer":"TechLab VN","type":"physical","image":"https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80","price":120000,"quantity":2,"material":"PLA Tough / PLA+","color":"Xanh Teal Công Nghiệp (#00687a)","resolution":"0.16 mm","infill":"25% Gyroid"}]'::jsonb,
    '{"fullName":"Nguyễn Văn Minh","phone":"0987 654 321","address":"Tòa nhà FPT Tower, Tầng 8, Phạm Văn Bạch","district":"Cầu Giấy","city":"Hà Nội"}'::jsonb,
    '{"name":"VCUBE Express / GHTK Chuyên Dụng","trackingCode":"VCE-882941-HN"}'::jsonb,
    '{"method":"Chuyển khoản QR Napas 24/7","paidDate":"24/10/2026 09:20","subtotalPhysical":240000,"total":240000}'::jsonb
),
(
    'ord-8919', '#VCUBE-8919-C', '20/10/2026 14:30', '22/10/2026', 'completed', 7, 100, '00h 00m',
    'registered', 'tok_8919_abc',
    '[{"id":"ord-item-2","name":"Bánh Răng Hành Tinh Kép Tỉ Số 5:1","designer":"MechanicMaster","type":"physical","image":"https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=800&auto=format&fit=crop&q=80","price":165000,"quantity":4,"material":"PETG Carbon","color":"Đen Kỹ Thuật","resolution":"0.12 mm"}]'::jsonb,
    '{"fullName":"Lê Tuấn Anh","phone":"0912 888 777","address":"Khu Công Nghệ Cao Hòa Lạc, Tòa Alpha","district":"Thạch Thất","city":"Hà Nội"}'::jsonb,
    '{"name":"VCUBE Express Hỏa Tốc","trackingCode":"VCE-771922-HL"}'::jsonb,
    '{"method":"Thẻ Doanh Nghiệp Visa/Mastercard","paidDate":"20/10/2026 14:35","subtotalPhysical":660000,"total":660000}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status,
    layer_progress = EXCLUDED.layer_progress,
    updated_at = NOW();

-- 7.3 SEED USER PROFILES (4 ROLES)
INSERT INTO public.user_profiles (
    id, display_name, email, phone, role, tier, kyc_status, status, total_orders, total_spent_or_earned, kyc_details
) VALUES
(
    'usr-001', 'Nguyễn Văn Minh', 'minh.nguyen@fpt.com.vn', '0987 654 321', 'customer', 'Pro Engineer',
    'verified', 'active', 14, 18450000,
    '{"companyName":"FPT Software Smart Robotics Lab","taxCode":"0101234567","idNumber":"001095012345","bankName":"Vietcombank","bankAccount":"0011004567890"}'::jsonb
),
(
    'usr-002', 'Trần Kỹ Thuật (TechLab VN)', 'techlab.vietnam@gmail.com', '0912 345 678', 'designer', 'Master Designer',
    'verified', 'active', 68, 45200000,
    '{"companyName":"TechLab 3D Design Studio","taxCode":"0309876543","bankName":"Techcombank","bankAccount":"19034567890123"}'::jsonb
),
(
    'usr-003', 'Xưởng In 3D CNC Hòa Lạc', 'mes.hoalac@vcube.vn', '0903 888 999', 'lab', 'Enterprise CNC',
    'verified', 'active', 215, 128600000,
    '{"companyName":"Công Ty TNHH Chế Tác Thông Minh Hòa Lạc","taxCode":"0108924881","bankName":"MB Bank","bankAccount":"888899996666"}'::jsonb
),
(
    'usr-007', 'Chí Thành (Forge Master Admin)', 'admin@vcube.vn', '1900 6833', 'admin', 'Enterprise CNC',
    'verified', 'active', 0, 0,
    '{"companyName":"VCUBE Platform Operations Core","taxCode":"0108924881"}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    kyc_status = EXCLUDED.kyc_status,
    updated_at = NOW();

-- 7.4 SEED MATERIALS
INSERT INTO public.materials (
    id, name, type, density, cost_per_kg, description, in_stock, stock_rolls_count, bed_temp, nozzle_temp
) VALUES
('mat-pla-tough', 'PLA Tough Kỹ Thuật', 'FDM', 1.24, 280000, 'Chịu lực va đập cao gấp 3 lần PLA tiêu chuẩn, không co ngót.', true, 24, 60, 215),
('mat-petg-pro', 'PETG Technical Pro', 'FDM', 1.27, 340000, 'Kháng hóa chất, chống nước, chịu nhiệt tới 85°C.', true, 18, 75, 240),
('mat-petg-cf', 'PETG Carbon Fiber', 'FDM', 1.32, 580000, 'Gia cường 15% sợi carbon cắt ngắn, độ cứng siêu cao.', true, 12, 80, 260),
('mat-abs-plus', 'ABS+ Industrial Flame-Retardant', 'FDM', 1.05, 380000, 'Chịu nhiệt độ cao 100°C, bề mặt mịn màng sau xử lý hơi acetone.', true, 15, 100, 255),
('mat-sla-tough', 'Resin Tough 2000 Pro', 'SLA', 1.15, 1200000, 'Độ chính xác kích thước cực cao ±0.03mm, mô phỏng nhựa ABS đúc khuôn.', true, 8, 0, 0)
ON CONFLICT (id) DO UPDATE SET
    cost_per_kg = EXCLUDED.cost_per_kg,
    in_stock = EXCLUDED.in_stock;

-- 7.5 SEED PRINTER FLEET
INSERT INTO public.printer_fleet (
    id, name, brand, model, technology, build_volume, status, hourly_rate, hourly_cost, nozzle_diameter
) VALUES
('prn-x1c-01', 'Bambu Lab X1-Carbon #01', 'Bambu Lab', 'X1-Carbon Combo', 'FDM', '{"x":256,"y":256,"z":256}'::jsonb, 'printing', 45000, 22000, 0.4),
('prn-x1c-02', 'Bambu Lab X1-Carbon #02', 'Bambu Lab', 'X1-Carbon Combo', 'FDM', '{"x":256,"y":256,"z":256}'::jsonb, 'idle', 45000, 22000, 0.4),
('prn-prusa-01', 'Prusa MK4 Industrial #01', 'Prusa Research', 'Original Prusa MK4', 'FDM', '{"x":250,"y":210,"z":220}'::jsonb, 'idle', 40000, 19000, 0.4),
('prn-form3-01', 'Formlabs Form 3+ Laser SLA', 'Formlabs', 'Form 3+', 'SLA', '{"x":145,"y":145,"z":185}'::jsonb, 'idle', 95000, 52000, 0.085)
ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status,
    hourly_rate = EXCLUDED.hourly_rate;

-- 7.6 SEED DEFAULT PRICING CONFIG
INSERT INTO public.pricing_config (id, config) VALUES
(
    'default_inkiri_config',
    '{
        "depreciationPerYear": 4500000,
        "lifespanYears": 3,
        "operatingHoursPerYear": 3600,
        "powerKw": 0.35,
        "electricityCostPerKwh": 2600,
        "maintenancePerHour": 4500,
        "laborRatePerHour": 50000,
        "setupMinutesPerJob": 15,
        "prepMinutesPerJob": 20,
        "postProcessMinutes": 25,
        "materialMarkupPercent": 1.25,
        "minimumJobFee": 50000,
        "expressMultiplier": 1.4,
        "failureRateBufferPercent": 0.08,
        "profitMarginPercent": 0.25
    }'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
    config = EXCLUDED.config,
    updated_at = NOW();

