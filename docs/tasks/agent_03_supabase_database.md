# SUBAGENT 03: SUPABASE DATABASE ARCHITECT & SCHEMA SPECIALIST
**Vai trò:** Kiến Trúc Sư Cơ Sở Dữ Liệu Supabase (Database Architect) & Chuyên Gia Bảo Mật RLS  
**Thư mục mục tiêu:** `supabase/migrations/`, `src/backend/supabase/database.ts`, `src/backend/supabase/seedService.ts`  
**Nhiệm vụ trọng tâm:** **CHUẨN HÓA TOÀN DIỆN SCHEMA DỮ LIỆU, THIẾT LẬP CHÍNH SÁCH BẢO MẬT RLS CHẶT CHẼ, LOẠI BỎ SỰ PHỤ THUỘC VÀO MOCKDATA / LOCALSTORAGE.**

---

## 1. MỤC TIÊU & TẦM NHÌN
Thiết lập một kiến trúc cơ sở dữ liệu quan hệ hoàn chỉnh, chuẩn hóa và tối ưu hóa cao trên nền tảng Supabase (PostgreSQL 15+). Toàn bộ dữ liệu sản phẩm, đơn hàng, người dùng, xưởng in, vật liệu và quan trọng nhất là các cấu hình thông số của Admin ForgeControl đều được lưu trữ, kiểm tra toàn vẹn và đồng bộ hai chiều thời gian thực (Supabase Realtime) với tính bảo mật tuyệt đối.

---

## 2. DANH MỤC NHIỆM VỤ CHI TIẾT (TASK BREAKDOWN)

### TASK 3.1: Hoàn Thiện & Áp Dụng Schema Chuẩn Hóa Toàn Diện (Production-Grade Schema Migration)
- **Tệp liên quan:** Tạo file migration mới `supabase/migrations/20260905_master_production_schema.sql`
- **Yêu cầu triển khai:**
  1. **Bảng `pricing_configs`:**
     - Lưu trữ toàn bộ thông số của công thức Inkiri v3.4 dưới dạng bảng cấu hình tập trung.
     - Các trường: `id TEXT PRIMARY KEY`, `config_name TEXT`, `formula_version TEXT`, `config JSONB NOT NULL`, `is_active BOOLEAN DEFAULT true`, `updated_by TEXT`, `updated_at TIMESTAMPTZ DEFAULT NOW()`.
  2. **Bảng `site_content`:**
     - Lưu trữ toàn bộ nội dung động của storefront.
     - Các trường: `id TEXT PRIMARY KEY`, `hero_badge TEXT`, `hero_title TEXT`, `hero_subtitle TEXT`, `phone TEXT`, `email TEXT`, `hanoi_workshop_address TEXT`, `danang_workshop_address TEXT`, `hcm_workshop_address TEXT`, `announcement_text TEXT`, `announcement_enabled BOOLEAN`, `updated_at TIMESTAMPTZ`.
  3. **Bảng `materials`:**
     - Đầy đủ các cột nghiệp vụ kỹ thuật: `id`, `name`, `brand`, `type`, `density`, `cost_per_kg`, `price_per_gram`, `unit_price_multiplier`, `spool_weight_grams`, `extruder_temp_min`, `extruder_temp_max`, `bed_temp`, `strength`, `heat_resistance`, `flexibility`, `colors JSONB`, `recommended_for TEXT[]`, `in_stock BOOLEAN`, `stock_rolls_count INT`.
  4. **Bảng `printer_fleet`:**
     - Khổ in thực tế và thông số máy in: `id`, `name`, `brand`, `model`, `technology`, `bed_dimensions JSONB`, `power_kw`, `acquisition_cost`, `expected_lifetime_hours`, `hourly_cost`, `hourly_rate`, `has_enclosure`, `has_ams`, `status`.
  5. **Bảng `workshop_partners`:**
     - Mạng lưới 3 miền: `id`, `name`, `code`, `region ('hanoi' | 'danang' | 'hcm')`, `address`, `contact_person`, `phone`, `email`, `supported_technologies TEXT[]`, `max_build_volume JSONB`, `active_printers_count`, `available_printers_count`, `sla_rating`, `completed_jobs_count`, `current_queue_length`, `status`.
  6. **Bảng `orders`:**
     - `id TEXT PRIMARY KEY`, `order_number TEXT UNIQUE`, `user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL`, `secure_access_token TEXT UNIQUE NOT NULL`, `date TIMESTAMPTZ`, `customer_name TEXT`, `customer_email TEXT`, `customer_phone TEXT`, `shipping_address JSONB`, `items JSONB NOT NULL`, `total_amount NUMERIC NOT NULL`, `shipping_fee NUMERIC`, `payment_method TEXT`, `payment_status TEXT`, `status TEXT`, `status_stage_index INT DEFAULT 0`, `assigned_workshop_id TEXT REFERENCES workshop_partners(id)`, `assigned_printer_id TEXT REFERENCES printer_fleet(id)`, `notes TEXT`, `created_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`.
  7. **Bảng `payment_transactions` (Chống Race Condition & Idempotency):**
     - `id TEXT PRIMARY KEY`, `order_id TEXT REFERENCES orders(id)`, `transaction_id TEXT UNIQUE NOT NULL`, `amount NUMERIC NOT NULL`, `payment_gateway TEXT DEFAULT 'vietqr'`, `payload JSONB`, `status TEXT DEFAULT 'success'`, `created_at TIMESTAMPTZ DEFAULT NOW()`.
  8. **Bảng `user_profiles`:**
     - `id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE`, `email TEXT NOT NULL`, `display_name TEXT`, `phone TEXT`, `role TEXT DEFAULT 'customer'`, `tier TEXT DEFAULT 'Standard'`, `kyc_status TEXT DEFAULT 'unverified'`, `kyc_details JSONB`, `account_status TEXT DEFAULT 'active'`, `total_orders INT DEFAULT 0`, `total_spent NUMERIC DEFAULT 0`, `notes TEXT`, `created_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`.
  9. **Bảng `accessories`:**
     - `id TEXT PRIMARY KEY`, `name TEXT`, `type TEXT`, `price NUMERIC`, `in_stock BOOLEAN`, `stock_quantity INT`, `description TEXT`.

### TASK 3.2: Thiết Lập Ma Trận Phân Quyền Hàng (Row Level Security - RLS Matrix)
- **Yêu cầu bảo mật cấp ngân hàng:**
  1. Bảng `orders`:
     - `anon` và `authenticated` có thể `SELECT` **CHỈ KHI** `auth.uid() = user_id` HOẶC khi cung cấp đúng `secure_access_token` qua header hoặc query (áp dụng hàm Postgres Security Definer).
     - Cấm tuyệt đối việc khách đọc trộm danh sách đơn hàng của người khác.
  2. Bảng `user_profiles`:
     - Người dùng chỉ được `SELECT` và `UPDATE` hồ sơ cá nhân của chính mình (`auth.uid() = id`).
     - Chỉ có tài khoản role `admin` mới được xem và cập nhật hồ sơ của toàn bộ người dùng khác.
  3. Bảng `pricing_configs`, `site_content`, `materials`, `printer_fleet`, `workshop_partners`, `accessories`:
     - Cho phép `anon` và `authenticated` quyền `SELECT` (đọc thông số công khai để hiển thị website).
     - Chỉ cho phép tài khoản có role `admin` quyền `INSERT`, `UPDATE`, `DELETE`.
  4. Bảng `payment_transactions`:
     - Chỉ cho phép Service Role (Backend Webhook) hoặc Admin ghi và đọc.

### TASK 3.3: Tối Ưu Hóa Tầng Giao Tiếp Backend (database.ts & seedService.ts)
- **Tệp liên quan:** `src/backend/supabase/database.ts`, `src/backend/supabase/seedService.ts`
- **Yêu cầu triển khai:**
  1. Cung cấp các hàm bất đồng bộ chuẩn xác:
     - `getPricingConfig()` / `savePricingConfig(config)`
     - `getSiteContent()` / `saveSiteContent(content)`
     - `getMaterials()` / `saveMaterial(material)`
     - `getPrinters()` / `savePrinter(printer)`
     - `getWorkshopPartners()` / `saveWorkshopPartner(partner)`
     - `getOrders()` / `saveOrder(order)` / `updateOrderStatus(orderId, stageIndex, status, notes)`
     - `getUserProfile(uid)` / `updateUserKyc(uid, status, notes)`
  2. Xây dựng cơ chế **Offline Fallback & Cache Thông Minh**:
     - Lưu trữ cache cục bộ vào `localStorage` có gắn cờ thời gian sống (TTL 5 phút).
     - Khi mất mạng hoặc Supabase tạm thời gián đoạn, tự động phục hồi từ cache để giao diện không bị gián đoạn.
  3. Cập nhật `seedAllToSupabase()` trong `seedService.ts` để nạp toàn bộ cấu hình ban đầu lên Cloud chỉ bằng 1 nút bấm từ Admin.

---

## 3. TIÊU CHÍ NGHIỆM THU (ACCEPTANCE CRITERIA)
- Tệp SQL migration chạy thành công trên Supabase SQL Editor mà không phát sinh bất kỳ lỗi cú pháp nào.
- Toàn bộ các bảng đều có Index trên các khóa ngoại (`user_id`, `order_id`) và các trường tìm kiếm thường xuyên (`order_number`, `secure_access_token`).
- Kiểm thử chính sách RLS: Khách vãng lai không thể đọc trộm đơn hàng của người khác khi không có token; Admin có thể cập nhật mọi bảng dữ liệu thành công.
