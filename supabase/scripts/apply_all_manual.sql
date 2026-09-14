-- ##############################################################################
-- VCUBE — FILE GỘP ĐỂ DÁN 1 LẦN VÀO SUPABASE SQL EDITOR
-- ##############################################################################
-- ĐÂY KHÔNG PHẢI MIGRATION. Đây chỉ là bản gộp tiện dụng của 3 file migration +
-- script cấp quyền admin, sinh tự động từ đúng nội dung gốc (không sửa 1 ký tự SQL).
-- Nguồn sự thật vẫn là:
--   supabase/migrations/20260900_rls_helpers.sql
--   supabase/migrations/20260901_baseline_schema.sql
--   supabase/migrations/20261010_harden_rls.sql
--   supabase/scripts/bootstrap_admin.sql
--
-- SINH LẠI BẰNG:  node scripts/gen-apply-all.mjs
-- ⚠️ Sửa tay file này là sai — sửa file gốc rồi sinh lại.
--
-- TRƯỚC KHI CHẠY
--   1. SAO LƯU project (Dashboard -> Database -> Backups). Script chỉ CREATE/ALTER/ADD,
--      KHÔNG có DROP TABLE / DELETE dữ liệu, nhưng vẫn nên sao lưu.
--   2. Mỗi phần đã có `begin; ... commit;` riêng nên chạy được theo từng phần.
--      Nếu phần nào lỗi, các phần trước đã commit xong — không mất kết quả.
--
-- CHẠY LẠI ĐƯỢC NHIỀU LẦN (IDEMPOTENT) — kể cả trên project ĐÃ CÓ SCHEMA.
--   * `create table if not exists` là NO-OP với bảng đã tồn tại, nên mọi thay đổi cột
--     cho bảng CŨ đều có `alter table ... if not exists` / `drop constraint if exists`
--     đi kèm trong PHẦN 2. (Đây là lỗi thật đã gặp: site_content.settings và DEFAULT
--     2850/65000/8 của pricing_global_settings không được áp ở lần chạy trước.)
--   * PHẦN 2 có khối chuẩn hoá đưa 3 giá trị seed 2850/65000/8 về NULL, CÓ ĐIỀU KIỆN
--     BẢO VỆ: chỉ chạy khi hàng còn là hàng seed (settings = '{}'), nên không xoá giá
--     trị admin đã nhập thật.
--
-- SAU KHI CHẠY, kiểm chứng bằng 3 cách:
--   a) Xem kết quả PHẦN 5 ngay dưới đáy file này (chỉ đọc, in ra PASS/FAIL từng mục).
--   b) Trong SQL Editor: chạy supabase/diagnostics/verify_admin_settings.sql
--   c) Trong repo:  node scripts/inspect-db.mjs   (phải đủ 31/31 mục trong
--                   DANH SÁCH ĐỐI CHIẾU của chính script đó; hiện phủ 31 bảng khai báo
--                   trong 20260901_baseline_schema.sql, cộng view pricing_config)
--                   node scripts/verify-rls.mjs   (0 FAIL)
--
-- THỨ TỰ BẮT BUỘC: phần 1 -> 2 -> 3. Phần 4 chạy sau cùng và tùy chọn (phải sửa email).
-- ##############################################################################

-- ##############################################################################
-- PHẦN 1/4 — supabase/migrations/20260900_rls_helpers.sql
-- RLS HELPERS — bắt buộc chạy TRƯỚC. Định nghĩa public.current_app_role() + public.is_admin() + public.is_admin_or_lab().
-- ##############################################################################

-- ==============================================================================
-- VCUBE — RLS HELPERS (20260901)
-- ------------------------------------------------------------------------------
-- File này chạy SỚM NHẤT trong chuỗi migration để mọi file sau dùng được
-- public.is_admin() thay cho:
--   * (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'   ← CLIENT TỰ SỬA ĐƯỢC
--   * (auth.jwt() -> 'app_metadata'  ->> 'role') = 'admin'
--   * email hardcode 'chithanhso10@gmail.com'
--
-- Viết bằng plpgsql để KHÔNG bị validate tham chiếu bảng lúc tạo — nhờ vậy file này
-- chạy được cả khi public.user_profiles chưa tồn tại. Khi bảng chưa có, hàm trả
-- 'anon' (fail-closed: không ai là admin cho tới khi bảng được tạo).
-- ==============================================================================

create or replace function public.current_app_role()
returns text
language plpgsql
stable
security definer
set search_path = public
as $fn$
declare
  v_role text;
begin
  begin
    select up.role into v_role
      from public.user_profiles up
     where up.id::text = (select auth.uid())::text
     limit 1;
  exception
    when undefined_table then
      return 'anon';
  end;
  return coalesce(v_role, 'anon');
end
$fn$;

create or replace function public.is_admin()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $fn$
begin
  return public.current_app_role() = 'admin';
end
$fn$;

grant execute on function public.current_app_role() to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;

comment on function public.current_app_role() is
  'VCUBE: vai tro that cua nguoi goi (public.user_profiles.role). Khong dung user_metadata.';

-- ##############################################################################
-- PHẦN 2/4 — supabase/migrations/20260901_baseline_schema.sql
-- BASELINE SCHEMA — bảng, cột, index, ràng buộc, hàm, trigger, bucket, seed. Có cả `alter table` idempotent cho bảng ĐÃ TỒN TẠI.
-- ##############################################################################

-- ==============================================================================
-- VCUBE — BASELINE SCHEMA (20260901)  —  NGUỒN SỰ THẬT DUY NHẤT
-- ==============================================================================
-- Thay thế 6 file migration chồng lấn trước đây (đã chuyển sang supabase/legacy/).
-- Lý do thay: chuỗi cũ KHÔNG chạy được (orders thiếu user_id, user_profiles.id TEXT
-- vs UUID, pricing_config vừa TABLE vừa VIEW…) và tạo ra policy `USING (true)`.
--
-- PHÂN CHIA TRÁCH NHIỆM
--   * File này : bảng, cột, ràng buộc, index, hàm, trigger, bucket, seed.
--                Có BẬT RLS trên mọi bảng (deny-all cho tới khi có policy).
--   * 20261010_harden_rls.sql : TOÀN BỘ policy. Nhờ vậy policy chỉ định nghĩa 1 chỗ.
--
-- Cột được suy trực tiếp từ những gì client thực sự đọc/ghi
-- (src/backend/supabase/database.ts, src/backend/supabase/seedService.ts).
-- Idempotent, chạy được nhiều lần, bao trong 1 transaction.
-- ==============================================================================

begin;

create extension if not exists pgcrypto;

-- ==============================================================================
-- 1. DANH MỤC BÁN HÀNG
-- ==============================================================================

create table if not exists public.products (
    id                    text primary key,
    sku                   text,
    name                  text not null,
    category              text not null default 'mechanical',
    designer              text,
    price_physical        numeric not null default 0,
    price_digital         numeric not null default 0,
    images                jsonb   not null default '[]'::jsonb,
    thumbnail_url         text    default '',
    cad_file_url          text    default '',
    cad_format            text,
    file_size_bytes       bigint  default 0,
    description           text    default '',
    features              jsonb   not null default '[]'::jsonb,
    specs                 jsonb   not null default '{}'::jsonb,
    supported_materials   jsonb   not null default '[]'::jsonb,
    colors                jsonb   not null default '[]'::jsonb,
    tags                  jsonb   not null default '[]'::jsonb,
    badge                 text    default '',
    rating                numeric,
    reviews_count         int     not null default 0,
    prints_count          int     not null default 0,
    print_time            text,
    is_customizable       boolean not null default false,
    status                text    not null default 'published',
    production_readiness  text    not null default 'ready_to_print',
    created_at            timestamptz not null default now(),
    updated_at            timestamptz not null default now()
);

create table if not exists public.materials (
    id                    text primary key,
    name                  text not null,
    brand                 text,
    type                  text not null default 'FDM',
    density               numeric,
    strength              text,
    heat_resistance       text,
    flexibility           text,
    cost_per_kg           numeric,
    price_per_gram        numeric,
    unit_price_multiplier numeric,
    spool_weight_grams    numeric,
    extruder_temp_min     int,
    extruder_temp_max     int,
    bed_temp              int,
    colors                jsonb not null default '[]'::jsonb,
    "desc"                text default '',   -- tên cột client dùng; là từ khoá SQL nên phải quote
    recommended_for       text default '',
    in_stock              boolean not null default true,
    stock_rolls_count     int,
    created_at            timestamptz not null default now(),
    updated_at            timestamptz not null default now()
);

create table if not exists public.printer_fleet (
    id                        text primary key,
    name                      text not null,
    brand                     text,
    model                     text default '',
    technology                text not null default 'FDM',
    bed_dimensions            jsonb,
    build_volume              jsonb,                    -- legacy, giữ để tương thích
    nozzle_diameter           numeric,
    power_kw                  numeric,
    acquisition_cost          numeric,
    expected_lifetime_hours   numeric,
    consumables_hourly_rate   numeric,
    hourly_rate               numeric,
    hourly_cost               numeric,
    max_print_speed_mms       numeric,
    heated_bed_max_temp       numeric,
    has_enclosure             boolean default false,
    has_ams                   boolean default false,
    status                    text not null default 'Idle',
    created_at                timestamptz not null default now(),
    updated_at                timestamptz not null default now()
);

create table if not exists public.accessories (
    id                    text primary key,
    sku                   text,
    name                  text not null,
    name_en               text default '',
    type                  text not null default 'hardware',
    category              text default 'hardware',
    unit                  text default 'cái',
    cost_price            numeric not null default 0,
    price                 numeric not null default 0,
    stock_quantity        int not null default 0,
    low_stock_threshold   int,
    warehouse_location    text default '',
    supplier              text,
    description           text default '',
    image_url             text default '',
    compatible_with       jsonb not null default '[]'::jsonb,
    in_stock              boolean not null default true,
    created_at            timestamptz not null default now(),
    updated_at            timestamptz not null default now()
);

create table if not exists public.workshop_partners (
    id                       text primary key,
    name                     text not null,
    code                     text,
    region                   text not null default 'hanoi',
    address                  text default '',
    contact_person           text default '',
    phone                    text default '',
    email                    text default '',
    capacity_status          text not null default 'available',
    status                   text not null default 'active',
    rating                   numeric,
    sla_on_time_rate         numeric,
    active_jobs_count        int not null default 0,
    available_printers_count int not null default 0,
    completed_jobs_count     int not null default 0,
    current_queue_length     numeric default 0,
    supported_technologies   jsonb not null default '[]'::jsonb,
    max_build_volume         jsonb,
    in_stock_materials       jsonb not null default '[]'::jsonb,
    created_at               timestamptz not null default now(),
    updated_at               timestamptz not null default now()
);

-- ==============================================================================
-- 2. NỘI DUNG WEBSITE & CẤU HÌNH GIÁ
-- ==============================================================================

create table if not exists public.site_content (
    id                       text primary key default 'default',
    hero_badge               text default '',
    hero_title               text default '',
    hero_subtitle            text default '',
    phone                    text default '',
    email                    text default '',
    hanoi_workshop_address   text default '',
    danang_workshop_address  text default '',
    hcm_workshop_address     text default '',
    announcement_text        text default '',
    announcement_enabled     boolean not null default false,
    -- Cac truong storefront ma UI da doc/ghi tu lau nhung CHUA co cot nao giu
    -- (`SiteContentConfig.standardShippingFee/freeShippingThreshold/toleranceSpec`
    -- va nhom SEO). Khong co cot ⇒ `saveSiteContent` am tham bo mat gia tri admin
    -- vua nhap. Giu trong jsonb de khong phai ALTER TABLE moi lan them truong.
    settings                 jsonb not null default '{}'::jsonb,
    created_at               timestamptz not null default now(),
    updated_at               timestamptz not null default now()
);

-- ⚠️`create table if not exists` là NO-OP HOÀN TOÀN với bảng ĐÃ TỒN TẠI (project đã
-- chạy baseline trước đó), nên khai báo `settings` ở trên KHÔNG được áp. Phải ALTER.
-- Lỗi thật đã gặp trên production: `select settings from site_content` → 42703
-- "column site_content.settings does not exist", và `saveSiteContent` ghi thất bại ⇒
-- admin sửa phí ship / ngưỡng free-ship / dung sai vẫn bị mất.
alter table public.site_content
  add column if not exists settings jsonb not null default '{}'::jsonb;

comment on column public.site_content.settings is
  'Truong storefront chua co cot rieng (standardShippingFee, freeShippingThreshold, toleranceSpec, nhom SEO). Key giu nguyen camelCase.';


create table if not exists public.pricing_configs (
    id               text primary key,
    config_name      text not null default 'Default Inkiri Formula',
    formula_version  text not null default 'v3.4',
    is_active        boolean not null default true,
    config           jsonb not null default '{}'::jsonb,
    created_at       timestamptz not null default now(),
    updated_at       timestamptz not null default now()
);

create table if not exists public.pricing_global_settings (
    id                     text primary key default 'global',
    -- ⚠️ KHONG con default cho 3 cot nghiep vu: 09-admin-settings.md §3.2 #1 chot
    -- "khong bia gia tri mac dinh khi chua cau hinh". NULL = chua cau hinh ⇒
    -- `settingsService` tra null va UI hien "Chua cau hinh", khong roi ve 2850/65000/8.
    -- (Truoc day cot co default 2850/65000/8 nen khong the phan biet "admin chua nhap"
    -- voi "admin nhap dung gia tri mac dinh".)
    electricity_rate_vnd   numeric,
    labor_hourly_rate_vnd  numeric,
    currency               text not null default 'VND',
    vat_percent            numeric,
    settings               jsonb not null default '{}'::jsonb,
    updated_at             timestamptz not null default now(),
    constraint pricing_global_settings_vat_range_chk
      check (vat_percent is null or (vat_percent >= 0 and vat_percent <= 20)),
    constraint pricing_global_settings_rates_nonneg_chk
      check ((electricity_rate_vnd is null or electricity_rate_vnd >= 0)
         and (labor_hourly_rate_vnd is null or labor_hourly_rate_vnd >= 0))
);

-- ⚠️ Cùng lý do như `site_content` ở trên: bảng đã tồn tại ⇒ phần khai báo ở trên
-- KHÔNG được áp ⇒ DEFAULT 2850/65000/8 VẪN CÒN và 2 CHECK constraint KHÔNG được tạo.
-- Đã gặp thật trên production: hàng seed giữ nguyên 2850/65000/8, tức nguyên tắc
-- "NULL = chưa cấu hình" (09-admin-settings.md §3.2 #1) không đúng trên DB.
alter table public.pricing_global_settings
  alter column electricity_rate_vnd   drop default,
  alter column labor_hourly_rate_vnd  drop default,
  alter column vat_percent            drop default;

-- ⚠️ DROP DEFAULT LA KHONG DU — phai DROP NOT NULL.
-- `create table if not exists public.pricing_global_settings` o tren la NO-OP voi bang
-- DA TON TAI, nen rang buoc NOT NULL cua ban baseline CU (thoi con `not null default
-- 2850/65000/8`) VAN CON. Khoi chuan hoa ben duoi ghi NULL vao 3 cot do => no
--   ERROR 23502: null value in column "electricity_rate_vnd" ...
--            violates not-null constraint
-- Da gap that tren production ngay 2026-09-12. `drop not null` la IDEMPOTENT: chay lai
-- khong loi khi cot da nullable. Phai dat TRUOC khoi chuan hoa.
alter table public.pricing_global_settings
  alter column electricity_rate_vnd   drop not null,
  alter column labor_hourly_rate_vnd  drop not null,
  alter column vat_percent            drop not null;

alter table public.pricing_global_settings drop constraint if exists pricing_global_settings_vat_range_chk;
alter table public.pricing_global_settings add  constraint pricing_global_settings_vat_range_chk
  check (vat_percent is null or (vat_percent >= 0 and vat_percent <= 20));

alter table public.pricing_global_settings drop constraint if exists pricing_global_settings_rates_nonneg_chk;
alter table public.pricing_global_settings add  constraint pricing_global_settings_rates_nonneg_chk
  check ((electricity_rate_vnd is null or electricity_rate_vnd >= 0)
     and (labor_hourly_rate_vnd is null or labor_hourly_rate_vnd >= 0));

-- Chuẩn hoá hàng seed CŨ về NULL. 2850/65000/8 đến từ DEFAULT của schema, KHÔNG do
-- admin nhập ⇒ phải về NULL để phân biệt "chưa cấu hình" với "đã nhập" (09 §3.2 #1).
--
-- ⚠️ ĐIỀU KIỆN BẢO VỆ (khác bản `update ... where col = <default>` đơn thuần): chỉ
-- chuẩn hoá khi ĐỒNG THỜI (a) hàng do seed tạo — `id = 'global'` và `settings = '{}'`
-- (admin chưa từng lưu gì qua admin UI: `settingsService.savePricingGlobalSettings`
-- luôn ghi kèm `settings`), và (b) giá trị hiện tại ĐÚNG BẰNG default cũ. Nhờ vậy
-- chạy lại baseline sau khi admin đã nhập 8 / 65000 / 2850 THẬT sẽ KHÔNG bị xoá.
do $do$
declare
  v_seed boolean;
  v_elec numeric; v_labor numeric; v_vat numeric;
  v_settings jsonb;
begin
  select true, electricity_rate_vnd, labor_hourly_rate_vnd, vat_percent, coalesce(settings, '{}'::jsonb)
    into v_seed, v_elec, v_labor, v_vat, v_settings
    from public.pricing_global_settings
   where id = 'global'
   limit 1;

  if v_seed is not true then
    raise notice 'Chuẩn hoá pricing_global_settings: không có hàng id=global — bỏ qua.';
    return;
  end if;

  if v_settings <> '{}'::jsonb then
    raise notice 'Chuẩn hoá pricing_global_settings: hàng đã có settings riêng (admin đã cấu hình) — bỏ qua.';
    return;
  end if;

  update public.pricing_global_settings
     set electricity_rate_vnd  = case when v_elec  = 2850  then null else electricity_rate_vnd  end,
         labor_hourly_rate_vnd = case when v_labor = 65000 then null else labor_hourly_rate_vnd end,
         vat_percent           = case when v_vat   = 8     then null else vat_percent           end
   where id = 'global';

  raise notice 'Chuẩn hoá pricing_global_settings: elec % -> %, labor % -> %, vat % -> % (đã về NULL nếu là default cũ).',
    v_elec,  (case when v_elec  = 2850  then 'NULL' else 'giữ nguyên' end),
    v_labor, (case when v_labor = 65000 then 'NULL' else 'giữ nguyên' end),
    v_vat,   (case when v_vat   = 8     then 'NULL' else 'giữ nguyên' end);
end
$do$;

create table if not exists public.cost_rules (
    id          text primary key,
    rule_name   text not null,
    config      jsonb not null default '{}'::jsonb,
    updated_by  text,
    updated_at  timestamptz not null default now()
);

-- ------------------------------------------------------------------------------
-- 2b. CAU HINH DIEU CHINH DUOC TU /admin  (docs/plans/09-admin-settings.md §3)
-- ------------------------------------------------------------------------------
-- app_settings: thong tin phap ly & dinh danh. CHI 1 HANG (id = 'settings').
-- Nguyen tac da chot (09 §3.2 + §6): KHONG bia gia tri mac dinh. Seed la hang
-- RONG; dac biet tax_code de NULL vi app tung co 2 ma thue khac nhau tai
-- InvoiceModal.tsx:86 va AdminSettingsPanel.tsx:15 — chu du an chot "de trong,
-- admin tu nhap; chua cau hinh thi KHONG hien ma nao".
create table if not exists public.app_settings (
    id              text primary key default 'settings',
    legal_name      text,
    tax_code        text,
    invoice_address text,
    hotline         text,
    contact_email   text,
    bank_account    text,
    bank_name       text,
    warranty_terms  text,
    deposit_policy  text,
    settings        jsonb not null default '{}'::jsonb,
    updated_by      uuid,
    updated_at      timestamptz not null default now()
);

-- Validate o phia DB (09-admin-settings.md §3.2 #4: "Validate ở server, không chỉ ở
-- client"). Dat NGAY SAU khi bang duoc tao de moi duong ghi — kể cả service_role hay
-- SQL tay — đều bị chặn. Day la tang server-side that su duy nhat hien co (chua co
-- Edge Function); `settingsService.validateSetting()` là bản sao dùng chung, không
-- thay the duoc constraint nay.
alter table public.app_settings drop constraint if exists app_settings_tax_code_format_chk;
alter table public.app_settings add  constraint app_settings_tax_code_format_chk
  check (tax_code is null or tax_code ~ '^[0-9]{10}(-[0-9]{3})?$');

alter table public.app_settings drop constraint if exists app_settings_bank_account_digits_chk;
alter table public.app_settings add  constraint app_settings_bank_account_digits_chk
  check (bank_account is null or bank_account ~ '^[0-9]+$');

alter table public.app_settings drop constraint if exists app_settings_contact_email_chk;
alter table public.app_settings add  constraint app_settings_contact_email_chk
  check (contact_email is null or contact_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$');

-- setting_audit: nhat ky thay doi cau hinh (gia & phap ly la bat buoc — 09 §6 #4).
-- Append-only: chi admin doc/ghi, KHONG ai duoc UPDATE/DELETE (xem 20261010).
create table if not exists public.setting_audit (
    id           uuid primary key default gen_random_uuid(),
    setting_key  text not null,
    store        text not null
                 check (store in ('site_content','app_settings','pricing_global_settings',
                                      'pricing_configs','order_payouts')),   -- 'order_payouts': audit doi payout (muc 2b-bis)
    old_value    jsonb,
    new_value    jsonb,
    changed_by   uuid,
    changed_at   timestamptz not null default now()
);


-- setting_audit.store: mở rộng allowlist thêm 'order_payouts' (Đợt 25 / B).
-- VÌ SAO: mỗi lần admin đổi `orders.workshop_payout_status` / `designer_payout_status` PHẢI
-- ghi một hàng audit (bất biến dự án "audit log bắt buộc"; đây là tiền thật) — xem
-- docs/plans/25b-revenue-3-sided-answers.md §C.3. CHECK cũ chỉ cho 4 giá trị nên ghi audit
-- payout sẽ lỗi 23514.
--
-- ⚠️ Ràng buộc cũ là CHECK KHAI INLINE trong `create table` ⇒ tên do Postgres tự sinh
-- (`setting_audit_store_check`) — KHÔNG đoán bừa. Khối dưới đây XOÁ MỌI CHECK đang nói về
-- cột `store` (tìm theo định nghĩa ràng buộc, không theo tên), rồi thêm lại ĐÚNG MỘT ràng
-- buộc có tên ổn định ⇒ chạy lại nhiều lần vẫn chỉ có MỘT ràng buộc `store` (nếu drop trượt
-- mà vẫn add thì bảng sẽ có 2 ràng buộc và mọi ghi audit lỗi với thông báo khó đọc).
do $do$
declare
  rec record;
begin
  for rec in
    select con.conname
      from pg_constraint con
     where con.conrelid = 'public.setting_audit'::regclass
       and con.contype = 'c'
       and pg_get_constraintdef(con.oid) ilike '%store%'
  loop
    execute format('alter table public.setting_audit drop constraint %I', rec.conname);
    raise notice 'DROPPED CHECK store cũ: %', rec.conname;
  end loop;

  if not exists (select 1 from pg_constraint
                  where conname = 'setting_audit_store_check'
                    and conrelid = 'public.setting_audit'::regclass) then
    alter table public.setting_audit add constraint setting_audit_store_check
      check (store in ('site_content','app_settings','pricing_global_settings',
                       'pricing_configs','order_payouts'));
    raise notice 'OK    setting_audit.store: đã có order_payouts';
  end if;
end
$do$;
-- warranty_claims: yeu cau bao hanh do khach tao cho don cua chinh minh (09 §4).
create table if not exists public.warranty_claims (
    id           uuid primary key default gen_random_uuid(),
    order_id     text not null references public.orders(id) on delete cascade,
    user_id      uuid references auth.users(id) on delete set null,
    reason       text not null,
    description  text not null default '',
    photo_paths  text[] not null default '{}',
    status       text not null default 'submitted'
                 check (status in ('submitted','reviewing','approved','rejected','resolved')),
    resolution   text not null default '',
    handled_by   uuid,
    created_at   timestamptz not null default now(),
    updated_at   timestamptz not null default now()
);

-- order_files: file CAD thuoc mot don hang. Day la thu mo khoa DoD #19
-- (tai file CAD sau khi mua bang createSignedUrl) — thay cho heuristic
-- `orders.items::text like '%name%'` trong policy storage.
create table if not exists public.order_files (
    id            uuid primary key default gen_random_uuid(),
    order_id      text not null references public.orders(id) on delete cascade,
    product_id    text,
    storage_path  text not null,
    license       text not null default 'personal',
    created_at    timestamptz not null default now()
);

-- pricing_config (số ít) = VIEW tương thích cho code cũ.
-- security_invoker = true để view KHÔNG bỏ qua RLS của bảng gốc.
do $do$
begin
  -- Chỉ drop nếu đang là VIEW. Nếu môi trường cũ có TABLE cùng tên thì bỏ qua
  -- (không tự ý xoá dữ liệu); trường hợp đó cần xử lý thủ công theo runbook.
  if exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
              where n.nspname = 'public' and c.relname = 'pricing_config' and c.relkind = 'v') then
    execute 'drop view public.pricing_config';
  end if;
end
$do$;

create or replace view public.pricing_config with (security_invoker = true) as
    select id, id as "key", config, updated_at from public.pricing_configs;

-- ==============================================================================
-- 2c. DOANH THU 3 BÊN — cột phí, cột giấy phép, cột loại người bán (Đợt 25)
-- ==============================================================================
-- ⚠️ `pricing_global_settings.marketplace_fee_percent` **CHƯA TỪNG TỒN TẠI** trong chuỗi
-- migration hiện hành (chỉ có ở `supabase/legacy/20260905_...` — file KHÔNG chạy). Nó được
-- client đọc/ghi thật: `src/types/index.ts:965`, `workshopService.ts:1139` (đọc, fallback 8)
-- và `:1181` (ghi). Vì vậy mục D4 của spec phải THÊM CỘT, không chỉ thêm CHECK.
-- Cột để **NULLABLE và KHÔNG default**: NULL = chưa cấu hình, KHÔNG bịa 8% (đúng nguyên tắc
-- đã áp cho `electricity_rate_vnd`/`labor_hourly_rate_vnd`/`vat_percent` ở mục 2).
alter table public.pricing_global_settings
  add column if not exists marketplace_fee_percent numeric;

alter table public.pricing_global_settings
  add column if not exists default_workshop_commission_percent numeric;
-- Phí nền tảng CỐ ĐỊNH (VND) mỗi đơn — Đợt 25 / C.
-- VÌ SAO CẦN: `orders.platform_fixed_fee_snapshot` đã có nhưng KHÔNG có nguồn trong DB
-- ⇒ cột snapshot vô nghĩa. Có cột này thì admin cấu hình được, khớp với
-- `marketplace_fee_percent` (phí theo %). NULLABLE, KHÔNG default: NULL = chưa cấu hình
-- (không bịa 5000 như bản legacy `supabase/legacy/...` đã từng).
alter table public.pricing_global_settings
  add column if not exists marketplace_fixed_fee_vnd numeric;

comment on column public.pricing_global_settings.marketplace_fixed_fee_vnd is
  'Phí nền tảng cố định (VND) cho mỗi đơn, cộng thêm phí theo %. NULL = chưa cấu hình. Nguồn cho orders.platform_fixed_fee_snapshot.';

do $do$ begin
  if not exists (select 1 from pg_constraint
                  where conname = 'pricing_global_settings_marketplace_fixed_fee_vnd_chk'
                    and conrelid = 'public.pricing_global_settings'::regclass) then
    alter table public.pricing_global_settings add constraint pricing_global_settings_marketplace_fixed_fee_vnd_chk
      check (marketplace_fixed_fee_vnd is null
             or (marketplace_fixed_fee_vnd >= 0 and marketplace_fixed_fee_vnd <= 10000000));
  end if;
end $do$;

comment on column public.pricing_global_settings.marketplace_fee_percent is
  'Phí sàn % (đã chốt: tính trên tiền hàng TRƯỚC thuế). NULL = chưa cấu hình — KHÔNG mặc định 8.';

comment on column public.pricing_global_settings.default_workshop_commission_percent is
  'Phí sàn % mặc định cho xưởng khi CHƯA có thoả thuận riêng. Nguồn riêng từng đối tác: public.workshop_commission_terms.commission_percent (bảng riêng, chỉ admin). NULL = chưa cấu hình.';

-- Phí riêng của từng xưởng: ĐÃ CHUYỂN sang bảng riêng `workshop_commission_terms` (mục 2e).
-- KHÔNG để ở `workshop_partners` vì bảng đó là catalog CÔNG KHAI (anon đọc mọi cột) ⇒ phơi
-- chiết khấu đàm phán của từng đối tác. `drop column if exists` để dọn sạch nếu ai đó đã
-- dán bản WIP có cột này (idempotent, không lỗi khi cột chưa từng tồn tại).
alter table public.workshop_partners drop column if exists platform_commission_percent;

-- `products.seller_type`: ai bán sản phẩm này (nền tảng hay designer) — cần cho chia tiền.
alter table public.products add column if not exists seller_type text not null default 'designer';

do $do$ begin
  if not exists (select 1 from pg_constraint
                  where conname = 'products_seller_type_chk'
                    and conrelid = 'public.products'::regclass) then
    alter table public.products add constraint products_seller_type_chk
      check (seller_type in ('platform','designer'));
  end if;
end $do$;

-- D1(a): `products.license_type` — nullable, KHÔNG default (đúng tiền lệ
-- `digital_assets.license_type`: rỗng = CHƯA khai giấy phép, không đoán hộ).
alter table public.products add column if not exists license_type text;

comment on column public.products.license_type is
  'Loại giấy phép của sản phẩm. NULL = designer CHƯA khai. Không suy diễn, không mặc định.';

-- ------------------------------------------------------------------------------
-- 2d. D4(b) — CHECK biên độ cho các cột % (trước đây KHÔNG có CHECK)
-- ------------------------------------------------------------------------------
-- Tiền lệ trong file: `pricing_global_settings_vat_range_chk` (0..20).
-- PHẢI guard bằng pg_constraint: PostgreSQL không có `add constraint if not exists`.

do $do$ begin
  if not exists (select 1 from pg_constraint
                  where conname = 'pricing_global_settings_default_workshop_commission_percent_chk'
                    and conrelid = 'public.pricing_global_settings'::regclass) then
    alter table public.pricing_global_settings add constraint pricing_global_settings_default_workshop_commission_percent_chk
      check (default_workshop_commission_percent is null
             or (default_workshop_commission_percent >= 0 and default_workshop_commission_percent <= 30));
  end if;
end $do$;

do $do$ begin
  if not exists (select 1 from pg_constraint
                  where conname = 'pricing_global_settings_marketplace_fee_percent_chk'
                    and conrelid = 'public.pricing_global_settings'::regclass) then
    alter table public.pricing_global_settings add constraint pricing_global_settings_marketplace_fee_percent_chk
      check (marketplace_fee_percent is null
             or (marketplace_fee_percent >= 0 and marketplace_fee_percent <= 30));
  end if;
end $do$;

-- Royalty có thể cao hơn phí sàn ⇒ biên 0..100.
do $do$ begin
  if not exists (select 1 from pg_constraint
                  where conname = 'designer_profiles_royalty_percent_chk'
                    and conrelid = 'public.designer_profiles'::regclass) then
    alter table public.designer_profiles add constraint designer_profiles_royalty_percent_chk
      check (royalty_percent is null or (royalty_percent >= 0 and royalty_percent <= 100));
  end if;
end $do$;
-- ==============================================================================
-- 2e. CHIẾT KHẤU ĐÀM PHÁN RIÊNG CỦA ĐỐI TÁC — bảng RIÊNG, CHỈ ADMIN (Đợt 25)
-- ==============================================================================
-- 🔴 VÌ SAO KHÔNG để cột này trên `workshop_partners`: bảng đó nằm trong danh sách catalog
-- công khai của `20261010` (mục 5.4 tạo `vcube_workshop_partners_public_read` với `using true`)
-- ⇒ **mọi cột ở đó bị ANON đọc**. Để % chiết khấu đàm phán ở đó là PHƠI BÍ MẬT KINH DOANH:
-- đối thủ đọc được giá riêng của từng đối tác. Cũng KHÔNG dùng `revoke select (cột)` vì
-- PostgREST `select *` của storefront sẽ lỗi `42501`.
-- ⇒ Tách sang bảng riêng, chỉ admin đọc/ghi (policy ở `20261010` mục 5.4k).
--
-- Khoá chính: `partner_id text` — ĐÚNG kiểu `workshop_partners.id` (**text**, đã đọc file,
-- không đoán). `on delete cascade` để xoá đối tác thì điều khoản đi theo.
-- `commission_percent` NULLABLE: NULL = CHƯA thoả thuận riêng ⇒ dùng
-- `pricing_global_settings.default_workshop_commission_percent` (không bịa số).
create table if not exists public.workshop_commission_terms (
    partner_id         text primary key references public.workshop_partners(id) on delete cascade,
    commission_percent numeric,
    note               text,
    updated_by         text,
    updated_at         timestamptz not null default now()
);

comment on table public.workshop_commission_terms is
  'Chiết khấu đàm phán riêng theo từng đối tác. CỐ Ý KHÔNG công khai (khác workshop_partners): chỉ admin đọc/ghi.';
comment on column public.workshop_commission_terms.commission_percent is
  'Phí sàn % riêng cho đối tác. NULL = chưa thoả thuận riêng ⇒ dùng pricing_global_settings.default_workshop_commission_percent.';

do $do$ begin
  if not exists (select 1 from pg_constraint
                  where conname = 'workshop_commission_terms_commission_percent_chk'
                    and conrelid = 'public.workshop_commission_terms'::regclass) then
    alter table public.workshop_commission_terms add constraint workshop_commission_terms_commission_percent_chk
      check (commission_percent is null
             or (commission_percent >= 0 and commission_percent <= 30));
  end if;
end $do$;
-- ==============================================================================
-- 2f. THÔNG SỐ GIÁ THEO VẬT LIỆU — failure_extra_percent (Đợt 25, thay luật cứng theo id)
-- ==============================================================================
-- Ý NGHĨA: phần trăm CỘNG THÊM vào tỉ lệ dự phòng in hỏng cho vật liệu khó in
-- (nylon / resin / PA-CF…). NULL = KHÔNG cộng thêm (không bịa 4%).
--
-- VÌ SAO THAY LUẬT CŨ: `src/utils/pricingEngine.ts:305` đang cộng dự phòng theo CHUỖI ID:
--     if (id.includes('nylon') || id.includes('resin') || id.includes('pa-cf')) …
-- Trên nền tảng nhiều xưởng, id vật liệu do admin/xưởng đặt sẽ KHÁC ⇒ luật đó **im lặng
-- không bao giờ chạy** và không báo lỗi (giá thiếu dự phòng). Cột này cho admin bật/tắt
-- theo ĐÚNG vật liệu của mình thay vì đoán qua tên id.
--
-- CÔNG KHAI: `materials` vốn đã public-read (catalog), nên cột này cũng công khai — nó là
-- THÔNG SỐ GIÁ, không phải bí mật (khác `workshop_commission_terms`).
alter table public.materials add column if not exists failure_extra_percent numeric;

comment on column public.materials.failure_extra_percent is
  'Phần trăm cộng thêm vào dự phòng in hỏng cho vật liệu khó in (nylon/resin/PA-CF...). NULL = không cộng thêm. Thay luật cứng theo chuỗi id trong pricingEngine.ts:305 (luật đó im lặng không chạy khi id khác). Công khai cùng materials — là thông số giá, không phải bí mật.';

do $do$ begin
  if not exists (select 1 from pg_constraint
                  where conname = 'materials_failure_extra_percent_chk'
                    and conrelid = 'public.materials'::regclass) then
    alter table public.materials add constraint materials_failure_extra_percent_chk
      check (failure_extra_percent is null
             or (failure_extra_percent >= 0 and failure_extra_percent <= 30));
  end if;
end $do$;
-- ==============================================================================
-- 3. ĐƠN HÀNG, BÁO GIÁ, THANH TOÁN
-- ==============================================================================

create table if not exists public.orders (
    id                   text primary key,
    order_number         text unique,
    user_id              uuid references auth.users(id) on delete set null,
    date                 timestamptz not null default now(),
    estimated_delivery   text default '',
    status               text not null default 'pending_payment',   -- xem muc 3c: khop union Order['status'], 'pending' khong ton tai trong code
    status_stage_index   int  not null default 0,
    layer_progress       int  not null default 0,
    customer_email       text not null default '',
    customer_name        text default '',
    customer_phone       text default '',
    customer_type        text not null default 'guest',
    total_amount         numeric not null default 0,
    shipping_fee         numeric not null default 0,
    payment_method       text not null default 'cod',
    payment_status       text not null default 'unpaid',
    secure_access_token  text not null,
    quote_token          jsonb,
    items                jsonb not null default '[]'::jsonb,
    shipping_address     jsonb not null default '{}'::jsonb,
    carrier              jsonb not null default '{}'::jsonb,
    payment              jsonb not null default '{}'::jsonb,
    assigned_workshop_id text,
    assigned_printer_id  text,
    notes                text default '',
    created_at           timestamptz not null default now(),
    updated_at           timestamptz not null default now()
);

-- ------------------------------------------------------------------------------
-- 3b. DOANH THU 3 BÊN — snapshot & payout trên `orders` (Đợt 25)
-- ------------------------------------------------------------------------------
-- ⚠️ `create table if not exists public.orders` ở trên là NO-OP với bảng ĐÃ tồn tại ⇒ mọi
-- cột dưới đây phải thêm bằng `alter table ... add column if not exists` (đúng bài học đã
-- gặp với `site_content.settings`).
--
-- 🔴 CÔNG THỨC ĐÃ CHỐT (chủ dự án chốt — KHÔNG được đoán lại):
--   * Phí nền tảng tính trên `subtotal_amount` = tiền hàng TRƯỚC thuế.
--     KHÔNG gồm `shipping_fee`. KHÔNG gồm VAT.
--   * platform_fee_amount      = subtotal_amount × platform_fee_percent_snapshot/100
--                                + coalesce(platform_fixed_fee_snapshot, 0)
--   * workshop_payout_amount   = subtotal_amount − platform_fee_amount + shipping_fee
--     NGUỒN % phí xưởng: `workshop_commission_terms.commission_percent` — bảng RIÊNG,
--     chỉ admin đọc (không nằm trên `workshop_partners` để không phơi chiết khấu đàm phán).
--     NULL ⇒ dùng `pricing_global_settings.default_workshop_commission_percent`.
--     (ship CHUYỂN CHO XƯỞNG vì xưởng là bên trả cước vận chuyển)
--   * designer_payout_amount   = tiền hàng SỐ × royalty_percent_snapshot/100
--   * Cấp ĐƠN là TỔNG của cấp dòng: orders.platform_fee_amount = sum(order_items.platform_fee_amount)
--     (một đơn trộn hàng in + file số ⇒ tính ở cấp dòng mới đúng — xem `order_items`).
--
-- Tất cả cột tiền/**snapshot là NULLABLE**: NULL = CHƯA chốt/chưa tính, KHÔNG mặc định 0
-- (0 là một con số khác hẳn "chưa biết" — `docs/design/data-honesty.md`).
--
-- 🛡️ KHÔNG cần trigger mới để bảo vệ tiền: `fn_protect_order_privileged_columns` (20261010
-- mục 6c) so bằng `to_jsonb(new) - v_allowed` với `v_allowed = status/status_stage_index/
-- layer_progress/updated_at` ⇒ **fail-closed**: mọi cột tiền/payout thêm sau này TỰ ĐỘNG bị
-- chặn với xưởng in. Khách không có policy UPDATE nào trên `orders`. Chỉ admin đổi được tiền.
alter table public.orders add column if not exists subtotal_amount                  numeric;
alter table public.orders add column if not exists vat_percent_snapshot            numeric;
alter table public.orders add column if not exists vat_amount                      numeric;
alter table public.orders add column if not exists platform_fee_percent_snapshot   numeric;
alter table public.orders add column if not exists platform_fixed_fee_snapshot     numeric;
alter table public.orders add column if not exists platform_fee_amount             numeric;
alter table public.orders add column if not exists workshop_payout_amount          numeric;
alter table public.orders add column if not exists designer_payout_amount          numeric;
alter table public.orders add column if not exists workshop_payout_status          text not null default 'unpaid';
alter table public.orders add column if not exists designer_payout_status          text not null default 'unpaid';
alter table public.orders add column if not exists workshop_payout_paid_at         timestamptz;
alter table public.orders add column if not exists workshop_payout_paid_by         uuid;
alter table public.orders add column if not exists designer_payout_paid_at         timestamptz;
alter table public.orders add column if not exists designer_payout_paid_by         uuid;

comment on column public.orders.subtotal_amount is
  'Tiền hàng TRƯỚC thuế, KHÔNG gồm shipping_fee. Cơ sở tính phí nền tảng (đã chốt).';
comment on column public.orders.workshop_payout_amount is
  '= subtotal_amount − platform_fee_amount + shipping_fee (ship chuyển cho xưởng vì xưởng trả cước).';
comment on column public.orders.workshop_payout_status is
  'unpaid | paid | partial. Tách riêng khỏi designer_payout_status vì một đơn có thể đã trả xưởng nhưng chưa trả royalty cho designer.';

-- PostgreSQL KHÔNG có `add constraint if not exists` ⇒ phải guard bằng pg_constraint.
do $do$ begin
  if not exists (select 1 from pg_constraint
                  where conname = 'orders_workshop_payout_status_chk'
                    and conrelid = 'public.orders'::regclass) then
    alter table public.orders add constraint orders_workshop_payout_status_chk
      check (workshop_payout_status in ('unpaid','paid','partial'));
  end if;
end $do$;

do $do$ begin
  if not exists (select 1 from pg_constraint
                  where conname = 'orders_designer_payout_status_chk'
                    and conrelid = 'public.orders'::regclass) then
    alter table public.orders add constraint orders_designer_payout_status_chk
      check (designer_payout_status in ('unpaid','paid','partial'));
  end if;
end $do$;

-- ------------------------------------------------------------------------------
-- 3c. D4(a) — CHECK giá trị cho `orders`
-- ------------------------------------------------------------------------------
-- `status_stage_index`: pipeline có ĐÚNG 8 nấc 0..7.
--   Nguồn: `OrderProgress.tsx:13-21` (MES_PIPELINE_STAGES, step 1..8) ·
--   `workshopService.ts:2168` ("0..7, khớp MES_PIPELINE_STAGES") ·
--   `types/index.ts:86` (`statusStageIndex: number | null; // 0 to 7`).
do $do$ begin
  if not exists (select 1 from pg_constraint
                  where conname = 'orders_status_stage_index_range_chk'
                    and conrelid = 'public.orders'::regclass) then
    alter table public.orders add constraint orders_status_stage_index_range_chk
      check (status_stage_index >= 0 and status_stage_index <= 7);
  end if;
end $do$;

-- `status`: allowlist lấy từ CODE, không đoán. Nguồn sự thật là union `Order['status']`:
--   `src/types/index.ts:84` = pending_payment | processing | printing | post_processing |
--                             packaging | shipping | completed | cancelled
-- Đối chiếu thêm (đều là TẬP CON của union trên):
--   * `workshopService.ts:2209-2218` MY_ORDER_STATUS_LABELS — đúng 8 giá trị đó.
--   * `workshopService.ts:2224-2233` MY_ORDER_STATUS_BY_STAGE — processing/printing/
--     post_processing/shipping.
--   * `CheckoutView.tsx:136` — đơn mới bắt đầu bằng 'pending_payment'.
--   * `Group5ProductionPanel.tsx:96-109` — map nấc MES ⇒ chỉ 7 giá trị trong union.
--   * `MyOrdersView.tsx:41-52,212` — so sánh pending_payment/post_processing/packaging/
--     printing/shipping/completed.
-- ⚠️ DEFAULT CŨ LÀ `'pending'` — giá trị này KHÔNG có trong union và không xuất hiện ở bất
-- kỳ đường ghi nào của app ⇒ giữ nó lại thì CHECK mới sẽ là mìn cho mọi insert không gửi
-- `status`. Vì vậy đổi default sang trạng thái khởi tạo THẬT của app: 'pending_payment'.
alter table public.orders alter column status set default 'pending_payment';

do $do$ begin
  if not exists (select 1 from pg_constraint
                  where conname = 'orders_status_chk'
                    and conrelid = 'public.orders'::regclass) then
    alter table public.orders add constraint orders_status_chk
      check (status in ('pending_payment','processing','printing','post_processing',
                        'packaging','shipping','completed','cancelled'));
  end if;
end $do$;

create table if not exists public.quotes (
    id               text primary key,
    user_id          uuid references auth.users(id) on delete set null,
    order_id         text references public.orders(id) on delete set null,
    file_name        text default '',
    material_id      text,
    printer_id       text,
    volume_cm3       numeric,
    infill_percent   numeric,
    layer_height_mm  numeric,
    quantity         int not null default 1,
    unit_price       numeric default 0,
    total_price      numeric default 0,
    currency         text not null default 'VND',
    payload          jsonb not null default '{}'::jsonb,
    expires_at       timestamptz,
    created_at       timestamptz not null default now()
);

create table if not exists public.payment_transactions (
    id               text primary key,
    order_id         text references public.orders(id) on delete cascade,
    transaction_id   text not null unique,
    amount           numeric not null default 0,
    payment_gateway  text not null default 'vietqr',
    payload          jsonb not null default '{}'::jsonb,
    status           text not null default 'pending',
    created_at       timestamptz not null default now()
);

-- ==============================================================================
-- 4. NGƯỜI DÙNG & HỒ SƠ THEO VAI TRÒ
-- ==============================================================================

create table if not exists public.user_profiles (
    id              uuid primary key references auth.users(id) on delete cascade,
    email           text not null default '',
    display_name    text default '',
    phone           text default '',
    role            text not null default 'customer'
                    check (role in ('customer','designer','workshop','lab','admin')),
    tier            text not null default 'Standard',
    company         text default '',
    avatar_url      text default '',
    kyc_status      text not null default 'unverified'
                    check (kyc_status in ('verified','pending','pending_review','rejected','unverified')),
    kyc_details     jsonb not null default '{}'::jsonb,
    account_status  text not null default 'active'
                    check (account_status in ('active','suspended')),
    total_orders    int not null default 0,
    total_spent     numeric not null default 0,
    notes           text default '',
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

create table if not exists public.kyc_records (
    id            text primary key,
    user_id       uuid references auth.users(id) on delete cascade,
    doc_type      text not null default 'cccd',
    doc_number    text default '',
    company       text default '',
    tax_id        text default '',
    bank_name     text default '',
    bank_account  text default '',
    status        text not null default 'pending',
    payload       jsonb not null default '{}'::jsonb,
    reviewed_by   text,
    reviewed_at   timestamptz,
    notes         text default '',
    created_at    timestamptz not null default now()
);

create table if not exists public.designer_profiles (
    id               uuid primary key default gen_random_uuid(),
    user_id          uuid references auth.users(id) on delete cascade,
    display_name     text default '',
    bio              text default '',
    portfolio_url    text default '',
    avatar_url       text default '',
    bank_name        text default '',
    bank_account     text default '',
    tax_id           text default '',
    royalty_percent  numeric not null default 10,
    verified_status  text not null default 'Pending',
    rating           numeric,
    total_sales      numeric not null default 0,
    created_at       timestamptz not null default now(),
    updated_at       timestamptz not null default now()
);

create table if not exists public.customer_profiles (
    id                uuid primary key default gen_random_uuid(),
    user_id           uuid references auth.users(id) on delete cascade,
    display_name      text default '',
    company           text default '',
    tax_id            text default '',
    business_address  text default '',
    phone             text default '',
    nda_signed        boolean not null default false,
    nda_signed_at     timestamptz,
    created_at        timestamptz not null default now(),
    updated_at        timestamptz not null default now()
);

-- ==============================================================================
-- 5. XƯỞNG IN (vai trò lab/workshop)
-- ==============================================================================

create table if not exists public.workshop_profiles (
    id                        uuid primary key default gen_random_uuid(),
    user_id                   uuid references auth.users(id) on delete set null,
    partner_id                text,
    workshop_name             text not null,
    address                   text not null default '',
    region                    text not null default 'Bắc',
    total_machines            int not null default 0,
    active_machines_now       int not null default 0,
    electricity_rate_override numeric,
    labor_rate_override       numeric,
    verified_status           text not null default 'Pending'
                              check (verified_status in ('Pending','Verified','Suspended')),
    contact_phone             text default '',
    contact_email             text default '',
    created_at                timestamptz not null default now(),
    updated_at                timestamptz not null default now()
);

create table if not exists public.workshop_machines (
    id              uuid primary key default gen_random_uuid(),
    workshop_id     uuid not null references public.workshop_profiles(id) on delete cascade,
    name            text not null,
    brand           text default '',
    model           text default '',
    technology      text not null default 'FDM',
    bed_dimensions  jsonb,
    status          text not null default 'active',
    hourly_rate     numeric,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

create table if not exists public.workshop_materials (
    id                        uuid primary key default gen_random_uuid(),
    workshop_id               uuid not null references public.workshop_profiles(id) on delete cascade,
    name                      text not null,
    type                      text not null default 'PLA',
    color                     text default '',
    current_stock_grams       numeric not null default 0,
    low_stock_threshold_grams numeric,
    price_per_kg              numeric,
    stock_status              text not null default 'Tracking',
    created_at                timestamptz not null default now(),
    updated_at                timestamptz not null default now()
);

create table if not exists public.material_inventory_logs (
    id                   uuid primary key default gen_random_uuid(),
    material_id          uuid not null references public.workshop_materials(id) on delete cascade,
    action               text not null check (action in ('Import','Export','Adjustment')),
    grams                numeric not null,
    price_per_kg_at_time numeric,
    supplier             text default '',
    batch_code           text default '',
    note                 text default '',
    created_by           text default 'system',
    created_at           timestamptz not null default now()
);

create table if not exists public.workshop_accessories (
    id            uuid primary key default gen_random_uuid(),
    workshop_id   uuid references public.workshop_profiles(id) on delete cascade,
    name          text not null,
    unit          text default 'cái',
    quantity      int not null default 0,
    cost_price    numeric not null default 0,
    selling_price numeric not null default 0,
    sku           text default '',
    is_active     boolean not null default true,
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now()
);

-- ==============================================================================
-- 5b. ĐÁNH GIÁ · FILE SỐ · GIỎ HÀNG (Đợt 10)
-- ==============================================================================
-- Đặt SAU mục 5 vì `reviews.order_id` tham chiếu public.orders (mục 3) — Postgres kiểm
-- tra bảng được tham chiếu NGAY lúc tạo khóa ngoại.
--
-- LỰA CHỌN: cập nhật products.reviews_count / products.rating bằng TRIGGER (mục 9.6),
-- KHÔNG giao cho tầng service. Lý do:
--   * `rating`/`reviews_count` là số liệu HIỂN THỊ CÔNG KHAI. Nếu để service tự cộng/trừ
--     thì mọi đường ghi khác (admin ẩn đánh giá, tác giả bị xoá theo cascade, SQL tay
--     trong Dashboard) đều làm con số trôi khỏi thực tế mà không ai biết — đúng lớp lỗi
--     "số bịa" mà docs/design/data-honesty.md cấm.
--   * Trigger TÍNH LẠI từ đầu (count + avg) nên không bao giờ lệch, kể cả khi sửa rating
--     của một đánh giá cũ; cùng khuôn với fn_sync_material_on_inventory_log (mục 9.4).
--   * 0 đánh giá published ⇒ reviews_count = 0 và GIỮ NGUYÊN rating cũ (KHÔNG ghi 5.0
--     bịa); UI phải dựa vào reviews_count = 0 để hiện "Chưa có đánh giá".

-- reviews — đánh giá 2 chiều (khách → designer / xưởng / sản phẩm) gắn với một đơn.
--   * order_id NOT NULL: trong unique index mỗi NULL được coi là KHÁC nhau, nên nếu
--     order_id nullable thì ràng buộc "1 đánh giá / (đơn, tác giả, đích)" sẽ vô hiệu
--     đúng với những hàng không gắn đơn. NOT NULL giữ cho ràng buộc có hiệu lực thật.
--   * photos: đường dẫn object trong bucket product-images (dùng lại bucket ở mục 10).
create table if not exists public.reviews (
    id           uuid primary key default gen_random_uuid(),
    order_id     text not null references public.orders(id) on delete cascade,
    author_id    uuid not null references auth.users(id) on delete cascade,
    target_type  text not null
                 constraint reviews_target_type_chk check (target_type in ('designer','workshop','product')),
    target_id    text not null,
    rating       int  not null
                 constraint reviews_rating_range_chk check (rating between 1 and 5),
    comment      text not null default '',
    photos       text[] not null default '{}',
    status       text not null default 'pending'
                 constraint reviews_status_chk check (status in ('published','hidden','pending')),
    created_at   timestamptz not null default now(),
    updated_at   timestamptz not null default now(),
    constraint reviews_order_author_target_key
      unique (order_id, author_id, target_type, target_id)
);

-- ⚠️ `create table if not exists` là NO-OP HOÀN TOÀN với bảng ĐÃ tồn tại ⇒ các ràng buộc
-- khai báo ở trên KHÔNG được áp. Thêm lại có guarded (cùng tên) như cách làm của
-- pricing_global_settings ở mục 2, nhờ vậy chạy lại trên project cũ vẫn đủ ràng buộc.
alter table public.reviews drop constraint if exists reviews_target_type_chk;
alter table public.reviews add  constraint reviews_target_type_chk
  check (target_type in ('designer','workshop','product'));

alter table public.reviews drop constraint if exists reviews_rating_range_chk;
alter table public.reviews add  constraint reviews_rating_range_chk
  check (rating between 1 and 5);

alter table public.reviews drop constraint if exists reviews_status_chk;
alter table public.reviews add  constraint reviews_status_chk
  check (status in ('published','hidden','pending'));

alter table public.reviews drop constraint if exists reviews_order_author_target_key;
alter table public.reviews add  constraint reviews_order_author_target_key
  unique (order_id, author_id, target_type, target_id);

comment on table public.reviews is
  'Đánh giá 2 chiều gắn đơn. Ai cũng đọc bản status=published; tác giả đọc bản của mình và chỉ sửa/xoá khi còn pending (policy ở 20261010). products.reviews_count/rating do trigger fn_sync_product_review_stats cập nhật.';

-- digital_assets — file số (STL/3MF/…) của designer.
--   * storage_path trỏ vào bucket 'cad-files' (PRIVATE) — đúng bucket đã khai ở mục 10.
--   * license_type NULL = designer CHƯA khai giấy phép (không đoán hộ, không đặt mặc định).
--   * download_limit NULL = không giới hạn số lần tải.
--   * product_id KHÔNG có khóa ngoại (theo brief): file số có thể thuộc sản phẩm chưa seed.
create table if not exists public.digital_assets (
    id                 uuid primary key default gen_random_uuid(),
    product_id         text not null,
    designer_id        uuid not null references auth.users(id) on delete cascade,
    storage_path       text not null,
    file_format        text not null default '',
    file_size_bytes    bigint,
    checksum           text,
    license_type       text,
    download_limit     int,
    watermark_required boolean not null default true,
    created_at         timestamptz not null default now(),
    updated_at         timestamptz not null default now(),
    constraint digital_assets_download_limit_chk
      check (download_limit is null or download_limit >= 0)
);

alter table public.digital_assets drop constraint if exists digital_assets_download_limit_chk;
alter table public.digital_assets add  constraint digital_assets_download_limit_chk
  check (download_limit is null or download_limit >= 0);

comment on table public.digital_assets is
  'File số của designer trong bucket cad-files (private). Chỉ designer sở hữu và admin đọc được (RLS 20261010): khách KHÔNG có policy nào nên không đọc được dòng nào.';

comment on column public.digital_assets.storage_path is
  'Đường dẫn object trong bucket PRIVATE cad-files. KHÔNG bao giờ trả về cho khách: khách tải file qua createSignedUrl ở tầng service (service_role), sau khi service tự kiểm tra quyền mua.';

-- cart_items — giỏ hàng bền theo tài khoản (trước đây chỉ có localStorage).
--   * product_id KHÔNG có khóa ngoại: giỏ phải chịu được sản phẩm chưa seed hoặc đã gỡ
--     khỏi catalog mà không làm hỏng cả giỏ (đúng brief: product_id text).
--   * unit_price_snapshot NULL = CHƯA chốt giá lúc thêm vào giỏ (không bịa giá).
create table if not exists public.cart_items (
    id                  uuid primary key default gen_random_uuid(),
    user_id             uuid not null references auth.users(id) on delete cascade,
    product_id          text not null,
    quantity            int  not null default 1
                        constraint cart_items_quantity_chk check (quantity >= 1),
    unit_price_snapshot numeric,
    added_at            timestamptz not null default now(),
    updated_at          timestamptz not null default now(),
    constraint cart_items_user_product_key unique (user_id, product_id)
);

alter table public.cart_items drop constraint if exists cart_items_quantity_chk;
alter table public.cart_items add  constraint cart_items_quantity_chk check (quantity >= 1);

alter table public.cart_items drop constraint if exists cart_items_user_product_key;
alter table public.cart_items add  constraint cart_items_user_product_key unique (user_id, product_id);

comment on table public.cart_items is
  'Giỏ hàng bền theo tài khoản. Chỉ chủ sở hữu đọc/ghi (user_id = auth.uid()); admin CHỈ ĐỌC (RLS 20261010).';

-- ==============================================================================
-- 5c. DÒNG TIỀN CỦA ĐƠN — order_items (Đợt 25: doanh thu 3 bên)
-- ==============================================================================
-- MỘT HÀNG = MỘT DÒNG TIỀN. Vì sao KHÔNG đủ nếu chỉ có cột chia tiền ở cấp `orders`:
-- một đơn được phép TRỘN hàng in + file số (`src/types/index.ts:125-126` có
-- `subtotalPhysical` + `subtotalDigital`; `database.ts:32-39` tính ship theo phần in).
-- Nếu tính phí ở cấp đơn thì xưởng A bị ăn phí trên cả tiền file số mà A không làm, và
-- designer B nhận royalty trên cả tiền in mà B không bán (xem `docs/plans/25b` mục A).
-- Các cột ở `orders` vì vậy là TỔNG: `orders.platform_fee_amount = sum(order_items...)`.
--
-- Ghi chú kiểu dữ liệu (cố ý, không đoán):
--   * `workshop_id` text KHÔNG có FK: nó giữ `workshop_partners.id`/`partner_id` (text),
--     cùng không gian giá trị với `orders.assigned_workshop_id`.
--   * `designer_id` uuid KHÔNG có FK: giữ id user designer (giống `digital_assets.designer_id`).
--   * Các cột snapshot (%) và tiền payout **nullable**: NULL = CHƯA chốt/chưa tính,
--     KHÔNG mặc định 0 (0 là một con số khác hẳn "chưa biết" — `docs/design/data-honesty.md`).
create table if not exists public.order_items (
    id                                    uuid primary key default gen_random_uuid(),
    order_id                              text not null references public.orders(id) on delete cascade,
    product_id                            text not null,
    seller_type                           text not null
                                          constraint order_items_seller_type_chk check (seller_type in ('platform','designer')),
    fulfillment                           text not null
                                          constraint order_items_fulfillment_chk check (fulfillment in ('print','digital')),
    quantity                              int  not null default 1
                                          constraint order_items_quantity_chk check (quantity >= 1),
    unit_price                            numeric not null default 0,
    line_total                            numeric not null default 0,
    workshop_id                           text,
    designer_id                           uuid,
    workshop_commission_percent_snapshot  numeric,
    royalty_percent_snapshot              numeric,
    workshop_payout_amount                numeric,
    designer_payout_amount                numeric,
    platform_fee_amount                   numeric,
    created_at                            timestamptz not null default now()
);

-- ⚠️ `create table if not exists` là NO-OP với bảng ĐÃ tồn tại ⇒ ràng buộc ở trên không
-- được áp. Thêm lại có guarded, cùng kênh như `reviews`/`cart_items` ở mục 5b.
alter table public.order_items drop constraint if exists order_items_seller_type_chk;
alter table public.order_items add  constraint order_items_seller_type_chk
  check (seller_type in ('platform','designer'));

alter table public.order_items drop constraint if exists order_items_fulfillment_chk;
alter table public.order_items add  constraint order_items_fulfillment_chk
  check (fulfillment in ('print','digital'));

alter table public.order_items drop constraint if exists order_items_quantity_chk;
alter table public.order_items add  constraint order_items_quantity_chk check (quantity >= 1);

comment on table public.order_items is
  'Một hàng = một dòng tiền của đơn (trộn hàng in + file số). Các cột ở orders là TỔNG. Chủ đơn đọc dòng của mình; admin toàn quyền; xưởng in KHÔNG có policy (tránh lộ phí nền tảng).';
comment on column public.order_items.workshop_id is
  'partner_id/workshop_partners.id (text), chỉ có nghĩa khi fulfillment = ''print''. Không FK.';
comment on column public.order_items.designer_id is
  'uuid của user designer (giống digital_assets.designer_id), chỉ có nghĩa khi seller_type = ''designer''. Không FK.';
comment on column public.order_items.platform_fee_amount is
  'Phí nền tảng của DÒNG này. Công thức đã chốt: tính trên tiền hàng TRƯỚC thuế, KHÔNG gồm shipping_fee, KHÔNG gồm VAT.';

-- custom_design_requests — Yêu cầu thiết kế CAD tùy chỉnh từ khách hàng gửi tới tác giả
create table if not exists public.custom_design_requests (
    id                text primary key default ('req_' || replace(gen_random_uuid()::text, '-', '')),
    customer_id       uuid references auth.users(id) on delete set null,
    designer_id       uuid references auth.users(id) on delete set null,
    title             text not null default '',
    client_name       text not null default '',
    client_initials   text not null default '',
    status            text not null default 'pending'
                      check (status in ('pending', 'quoted', 'in_progress', 'completed', 'declined')),
    budget            text not null default '',
    deadline          text not null default '',
    service_type      text not null default 'custom_cad',
    target_specs      jsonb not null default '{"material":"","infill":"","nozzle":""}'::jsonb,
    reference_files   jsonb not null default '[]'::jsonb,
    messages          jsonb not null default '[]'::jsonb,
    unread            boolean not null default false,
    created_at        timestamptz not null default now(),
    updated_at        timestamptz not null default now()
);

comment on table public.custom_design_requests is
  'Yêu cầu thiết kế CAD tùy chỉnh và luồng trao đổi kỹ thuật, báo giá giữa khách hàng và tác giả.';

-- ==============================================================================
-- 6. INDEX
-- ==============================================================================
create index if not exists idx_products_status_created on public.products(status, created_at desc);
create index if not exists idx_products_category       on public.products(category);
create index if not exists idx_products_tags           on public.products using gin (tags);
create index if not exists idx_products_fts            on public.products using gin (
    to_tsvector('simple',
        coalesce(name,'') || ' ' || coalesce(sku,'') || ' ' ||
        coalesce(designer,'') || ' ' || coalesce(description,'')));

create index if not exists idx_orders_user_id        on public.orders(user_id);
create index if not exists idx_orders_customer_email on public.orders(customer_email);
create index if not exists idx_orders_secure_token   on public.orders(secure_access_token);
create index if not exists idx_orders_order_number   on public.orders(order_number);
create index if not exists idx_orders_status         on public.orders(status);

-- Đợt 10 (W2b): xưởng in lọc đơn được giao — cả policy RLS (5b) và truy vấn hàng đợi
-- việc của dashboard xưởng đều dùng cột này.
create index if not exists idx_orders_assigned_workshop on public.orders(assigned_workshop_id);
create index if not exists idx_orders_created        on public.orders(created_at desc);

create index if not exists idx_quotes_user   on public.quotes(user_id, created_at desc);
create index if not exists idx_quotes_expires on public.quotes(expires_at);
create index if not exists idx_payment_tx_id on public.payment_transactions(transaction_id);
create index if not exists idx_payment_order on public.payment_transactions(order_id);

create index if not exists idx_profiles_role on public.user_profiles(role);
create index if not exists idx_kyc_user      on public.kyc_records(user_id);
create index if not exists idx_designer_user on public.designer_profiles(user_id);
create index if not exists idx_customer_user on public.customer_profiles(user_id);

create index if not exists idx_ws_profiles_user      on public.workshop_profiles(user_id);
create index if not exists idx_ws_profiles_verified  on public.workshop_profiles(verified_status);
create index if not exists idx_ws_machines_workshop  on public.workshop_machines(workshop_id);
create index if not exists idx_ws_materials_workshop on public.workshop_materials(workshop_id);
create index if not exists idx_inv_logs_material     on public.material_inventory_logs(material_id, created_at desc);
create index if not exists idx_ws_accessories_ws     on public.workshop_accessories(workshop_id);
create index if not exists idx_materials_in_stock    on public.materials(in_stock);
create index if not exists idx_printers_status       on public.printer_fleet(status);

-- 4 bang cau hinh / bao hanh / file CAD (yeu cau "moi thu chinh duoc trong admin")
create index if not exists idx_setting_audit_lookup  on public.setting_audit(store, setting_key, changed_at desc);
create index if not exists idx_setting_audit_time    on public.setting_audit(changed_at desc);
create index if not exists idx_warranty_order        on public.warranty_claims(order_id);
create index if not exists idx_warranty_status_time  on public.warranty_claims(status, created_at desc);
create index if not exists idx_warranty_user         on public.warranty_claims(user_id);
create index if not exists idx_order_files_order     on public.order_files(order_id);
create index if not exists idx_order_files_path      on public.order_files(storage_path);

-- reviews / digital_assets / cart_items (Đợt 10)
create index if not exists idx_reviews_target   on public.reviews(target_type, target_id, status, created_at desc);
create index if not exists idx_reviews_author   on public.reviews(author_id, created_at desc);
create index if not exists idx_reviews_order    on public.reviews(order_id);
create index if not exists idx_reviews_status   on public.reviews(status, created_at desc);
create index if not exists idx_digital_assets_product  on public.digital_assets(product_id);
create index if not exists idx_digital_assets_designer on public.digital_assets(designer_id);
create index if not exists idx_cart_items_user  on public.cart_items(user_id, updated_at desc);

-- order_items (Đợt 25) — dòng tiền tra theo đơn và theo hai bên nhận tiền
create index if not exists idx_order_items_order    on public.order_items(order_id);
create index if not exists idx_order_items_workshop on public.order_items(workshop_id);
create index if not exists idx_order_items_designer on public.order_items(designer_id);
create index if not exists idx_order_items_product  on public.order_items(product_id);

-- D6(b): mỗi người dùng chỉ có TỐI ĐA MỘT hồ sơ KYC đang chờ duyệt.
-- `kyc_records.status` có DEFAULT 'pending' (đã kiểm ở mục 4 của file này) nên dùng đúng
-- 'pending'. Partial unique index: chỉ áp cho hàng đang 'pending', KHÔNG cản việc nộp lại
-- sau khi hồ sơ cũ đã được duyệt/từ chối. Hàng `user_id` NULL vẫn được nhiều dòng
-- (unique index coi mỗi NULL là khác nhau) — không chặn nhầm dữ liệu cũ.
create unique index if not exists uq_kyc_records_one_pending
  on public.kyc_records(user_id) where status = 'pending';

create index if not exists idx_custom_design_requests_customer on public.custom_design_requests(customer_id);
create index if not exists idx_custom_design_requests_designer on public.custom_design_requests(designer_id);
create index if not exists idx_custom_design_requests_status   on public.custom_design_requests(status);

-- ==============================================================================
-- 7. BẬT RLS (policy do 20261010_harden_rls.sql tạo)
-- ==============================================================================
do $do$
declare
  t text;
  v_tables text[] := array[
    'products','materials','printer_fleet','accessories','workshop_partners','site_content',
    'pricing_configs','pricing_global_settings','cost_rules',
    'orders','quotes','payment_transactions',
    'user_profiles','kyc_records','designer_profiles','customer_profiles',
    'workshop_profiles','workshop_machines','workshop_materials',
    'material_inventory_logs','workshop_accessories',
    'app_settings','setting_audit','warranty_claims','order_files','reviews','digital_assets','cart_items','order_items','workshop_commission_terms',
    'custom_design_requests'
  ];
begin
  foreach t in array v_tables loop
    -- CHỈ bật RLS cho bảng thật. `to_regclass` trả về cả VIEW, mà
    -- ALTER TABLE ... ENABLE ROW LEVEL SECURITY trên view sẽ lỗi 42809.
    -- View được bảo vệ bằng `security_invoker = true` + policy của bảng gốc.
    declare
      v_kind "char";
    begin
      select c.relkind into v_kind
        from pg_class c join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relname = t;

      if v_kind is null then
        raise notice 'SKIP  enable RLS: public.% không tồn tại', t;
      elsif v_kind in ('r', 'p') then
        execute format('alter table public.%I enable row level security', t);
      else
        raise notice 'SKIP  enable RLS: public.% là % (không phải bảng)', t, v_kind;
      end if;
    end;
  end loop;
  raise notice 'Baseline: đã bật RLS trên % bảng (policy do 20261010 tạo).', array_length(v_tables, 1);
end
$do$;

-- ==============================================================================
-- 8. GRANT cho API roles (RLS mới là cổng chặn thật)
-- ==============================================================================
do $do$
declare
  t text;
  v_catalog text[] := array['products','materials','printer_fleet','accessories',
                            'workshop_partners','site_content','pricing_configs',
                            'pricing_global_settings','workshop_profiles',
                            'workshop_machines','workshop_materials','workshop_accessories',
                            'designer_profiles'];
begin
  foreach t in array v_catalog loop
    if to_regclass('public.' || quote_ident(t)) is not null then
      execute format('grant select on public.%I to anon, authenticated', t);
      execute format('grant insert, update, delete on public.%I to authenticated', t);
    end if;
  end loop;
end
$do$;

grant select, insert, update, delete on public.orders                 to anon, authenticated;
grant select, insert, update, delete on public.quotes                 to authenticated;
grant select, insert, update, delete on public.payment_transactions   to authenticated;
grant select, insert, update, delete on public.user_profiles          to authenticated;
grant select, insert, update, delete on public.kyc_records            to authenticated;
grant select, insert, update, delete on public.designer_profiles      to authenticated;
grant select, insert, update, delete on public.customer_profiles      to authenticated;
grant select, insert, update, delete on public.material_inventory_logs to authenticated;
grant select, insert, update, delete on public.cost_rules             to authenticated;
grant select on public.pricing_config to anon, authenticated;

-- Cau hinh / bao hanh / file CAD (2026-09). RLS moi la cong chan that; grant chi
-- mo duong cho PostgREST, khong cap quyen doc/ghi.
--   app_settings   : noi dung phap ly hien thi cong khai → anon doc; chi admin ghi.
--   setting_audit  : chi admin doc/ghi; KHONG UPDATE/DELETE cho bat ky ai.
--   warranty_claims: khach doc/tao claim cua minh; admin/lab doc + cap nhat.
--   order_files    : nguoi mua doc file thuoc don cua minh; admin/lab toan quyen.
grant select on public.app_settings to anon, authenticated;
grant select on public.setting_audit to authenticated;
grant select on public.warranty_claims to authenticated;
grant select on public.order_files to authenticated;
grant insert, update on public.app_settings to authenticated;
grant insert on public.setting_audit to authenticated;
grant insert, update on public.warranty_claims to authenticated;
grant insert, update, delete on public.order_files to authenticated;

-- reviews / digital_assets / cart_items (Đợt 10). RLS mới là cổng chặn thật; grant chỉ mở
-- đường cho PostgREST.
--   reviews       : anon CHỈ được đọc (bản published); tác giả ghi bản của mình.
--   digital_assets: CỐ Ý không cho anon quyền nào — storage_path là đường lấy file trong
--                   bucket private. Supabase cấp ALL cho anon bằng default privileges của
--                   schema public, nên phải REVOKE: nhờ vậy khách bị chặn ở CẢ HAI tầng
--                   (GRANT và RLS), không phụ thuộc duy nhất vào policy.
--   cart_items    : chỉ authenticated; anon cũng bị revoke (giỏ khách không lên DB).
grant select on public.reviews to anon, authenticated;
grant insert, update, delete on public.reviews to authenticated;
revoke insert, update, delete on public.reviews from anon;
grant select, insert, update, delete on public.digital_assets to authenticated;
revoke all on public.digital_assets from anon;
grant select, insert, update, delete on public.cart_items to authenticated;
revoke all on public.cart_items from anon;
-- order_items (Đợt 25): dòng tiền. Chủ đơn CHỈ đọc dòng của mình (RLS); admin ghi được
-- (policy `all` cho role `authenticated`). KHÔNG cho anon (dòng tiền).
grant select, insert, update, delete on public.order_items to authenticated;
revoke all on public.order_items from anon;
-- workshop_commission_terms (Đợt 25): giá đàm phán riêng ⇒ CHỈ admin (RLS 20261010 mục 5.4k).
-- KHÔNG public-read, KHÔNG anon — khác hẳn `workshop_partners` (catalog công khai).
grant select, insert, update, delete on public.workshop_commission_terms to authenticated;
revoke all on public.workshop_commission_terms from anon;
-- custom_design_requests (Đợt 30 — Studio Designer): yêu cầu CAD tuỳ chỉnh.
grant select, insert, update on public.custom_design_requests to authenticated;
revoke all on public.custom_design_requests from anon;


-- ==============================================================================
-- 9. HÀM & TRIGGER
-- ==============================================================================

-- 9.1 Tra cứu đơn cho khách bằng token (SECURITY DEFINER, bắt buộc đúng token)
create or replace function public.get_order_by_guest_token(p_order_number text, p_token text)
returns setof public.orders
language sql
stable
security definer
set search_path = public
as $fn$
  select * from public.orders
   where (order_number = p_order_number or id = p_order_number)
     and secure_access_token = p_token
     and p_token is not null
     and length(btrim(p_token)) >= 12
   limit 1;
$fn$;

revoke all on function public.get_order_by_guest_token(text, text) from public;
grant execute on function public.get_order_by_guest_token(text, text) to anon, authenticated;

-- 9.2 Tự tạo profile khi có user mới (client không tự tạo)
create or replace function public.fn_create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  begin
    insert into public.user_profiles (id, email, display_name, role)
    values (
      new.id,
      coalesce(new.email, ''),
      coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email,'user'), '@', 1)),
      'customer'
    )
    on conflict (id) do nothing;
  exception when others then
    null;
  end;
  return new;
end
$fn$;

do $do$
begin
  execute 'drop trigger if exists trg_create_profile_for_new_user on auth.users';
  execute 'create trigger trg_create_profile_for_new_user
             after insert on auth.users
             for each row execute function public.fn_create_profile_for_new_user()';
  raise notice 'Baseline: đã tạo trigger tự sinh profile.';
exception when others then
  raise warning 'Không tạo được trigger trên auth.users (%): dùng supabase/scripts/bootstrap_admin.sql', sqlerrm;
end
$do$;

-- 9.3 Chặn người dùng tự đổi cột đặc quyền của chính mình
create or replace function public.fn_protect_profile_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if public.is_admin() then
    return new;
  end if;
  if new.role is distinct from old.role
     or new.kyc_status is distinct from old.kyc_status
     or new.account_status is distinct from old.account_status
     or new.total_orders is distinct from old.total_orders
     or new.total_spent is distinct from old.total_spent then
    raise exception 'VCUBE: không được tự thay đổi role/kyc_status/account_status/total_*'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end
$fn$;

drop trigger if exists trg_protect_profile_privileged_columns on public.user_profiles;
create trigger trg_protect_profile_privileged_columns
  before update on public.user_profiles
  for each row execute function public.fn_protect_profile_privileged_columns();

-- 9.4 Cập nhật kho khi ghi log nhập/xuất vật liệu
create or replace function public.fn_sync_material_on_inventory_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if new.action = 'Import' then
    update public.workshop_materials
       set current_stock_grams = current_stock_grams + new.grams,
           price_per_kg = coalesce(nullif(new.price_per_kg_at_time, 0), price_per_kg),
           stock_status = case
             when current_stock_grams + new.grams <= 0 then 'OutOfStock'
             when current_stock_grams + new.grams <= low_stock_threshold_grams then 'LowStock'
             else 'Tracking' end,
           updated_at = now()
     where id = new.material_id;
  elsif new.action = 'Export' then
    update public.workshop_materials
       set current_stock_grams = greatest(0, current_stock_grams - new.grams),
           stock_status = case
             when greatest(0, current_stock_grams - new.grams) <= low_stock_threshold_grams then 'LowStock'
             else 'Tracking' end,
           updated_at = now()
     where id = new.material_id;
  end if;
  return new;
end
$fn$;

drop trigger if exists trg_sync_material_on_inventory_log on public.material_inventory_logs;
create trigger trg_sync_material_on_inventory_log
  after insert on public.material_inventory_logs
  for each row execute function public.fn_sync_material_on_inventory_log();

-- 9.5 Tự cập nhật updated_at
create or replace function public.fn_touch_updated_at()
returns trigger language plpgsql as $fn$
begin
  new.updated_at := now();
  return new;
end
$fn$;

do $do$
declare
  t text;
begin
  foreach t in array array['products','materials','printer_fleet','accessories',
                           'workshop_partners','site_content','pricing_configs',
                           'orders','user_profiles','designer_profiles',
                           'customer_profiles','workshop_profiles','workshop_machines',
                           'workshop_materials','workshop_accessories',
                           'app_settings','warranty_claims',
                           'reviews','digital_assets','cart_items','workshop_commission_terms'] loop
    if to_regclass('public.' || quote_ident(t)) is not null then
      execute format('drop trigger if exists trg_touch_updated_at on public.%I', t);
      execute format('create trigger trg_touch_updated_at before update on public.%I
                      for each row execute function public.fn_touch_updated_at()', t);
    end if;
  end loop;
end
$do$;

-- 9.6 Giữ products.reviews_count / products.rating khớp với đánh giá ĐÃ published
-- ------------------------------------------------------------------------------
-- Chọn TRIGGER thay vì tầng service: `products.rating`/`reviews_count` là số liệu hiển thị
-- công khai, nên nếu một đường ghi (admin ẩn đánh giá, xoá tác giả theo cascade, SQL tay,
-- hoặc một service viết sau này) quên cập nhật thì con số sẽ trôi khỏi thực tế mà không ai
-- biết. Trigger TÍNH LẠI từ đầu bằng count + avg ⇒ không bao giờ lệch, cùng khuôn với
-- fn_sync_material_on_inventory_log (mục 9.4).
-- 0 đánh giá published ⇒ reviews_count = 0, và GIỮ NGUYÊN rating cũ (không ghi 5.0 bịa —
-- UI phải dựa vào reviews_count = 0 để hiện "Chưa có đánh giá").
-- SECURITY DEFINER là BẮT BUỘC: policy trên products chỉ cho admin ghi, nên nếu chạy bằng
-- quyền người gọi thì lệnh UPDATE bên dưới bị RLS lọc và âm thầm không làm gì.
create or replace function public.fn_recompute_product_review_stats(p_product_id text)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_cnt int;
  v_avg numeric;
begin
  if p_product_id is null then
    return;
  end if;

  select count(*), avg(rating)::numeric(3,2)
    into v_cnt, v_avg
    from public.reviews
   where target_type = 'product'
     and target_id = p_product_id
     and status = 'published';

  update public.products p
     set reviews_count = v_cnt,
         rating = coalesce(v_avg, p.rating),
         updated_at = now()
   where p.id = p_product_id
     and (p.reviews_count is distinct from v_cnt
          or (v_avg is not null and p.rating is distinct from v_avg));
end
$fn$;

create or replace function public.fn_sync_product_review_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  -- Xoá: chỉ cần tính lại sản phẩm cũ.
  if tg_op = 'DELETE' then
    if old.target_type = 'product' then
      perform public.fn_recompute_product_review_stats(old.target_id);
    end if;
    return old;
  end if;

  -- Thêm/sửa: tính lại sản phẩm mới nếu đích là sản phẩm.
  if new.target_type = 'product' then
    perform public.fn_recompute_product_review_stats(new.target_id);
  end if;

  -- Đổi đích đánh giá ⇒ phải tính lại cả sản phẩm CŨ, nếu không số cũ sẽ đứng yên.
  if tg_op = 'UPDATE' and old.target_type = 'product'
     and (old.target_id is distinct from new.target_id or new.target_type <> 'product') then
    perform public.fn_recompute_product_review_stats(old.target_id);
  end if;

  return new;
end
$fn$;

drop trigger if exists trg_sync_product_review_stats on public.reviews;
create trigger trg_sync_product_review_stats
  after insert or update or delete on public.reviews
  for each row execute function public.fn_sync_product_review_stats();

-- ==============================================================================
-- 10. STORAGE BUCKETS
-- ==============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-images', 'product-images', true, 10485760,
   array['image/png','image/jpeg','image/webp','image/gif']),
  ('cad-files', 'cad-files', false, 157286400,
   array['application/octet-stream','model/stl','model/step','model/3mf','model/obj','application/zip'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ==============================================================================
-- 11. REALTIME
-- ==============================================================================
do $do$
declare
  t text;
begin
  foreach t in array array['products','materials','printer_fleet','site_content',
                           'pricing_configs','orders','accessories',
                           'app_settings','pricing_global_settings','order_files',
                           'custom_design_requests'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception
      when duplicate_object then null;
      when undefined_object then
        raise notice 'Realtime: publication supabase_realtime không tồn tại — bỏ qua';
        exit;
      when others then null;
    end;
  end loop;
end
$do$;

-- ==============================================================================
-- 12. SEED TỐI THIỂU
-- ==============================================================================
insert into public.site_content (id) values ('default') on conflict (id) do nothing;
insert into public.pricing_global_settings (id) values ('global') on conflict (id) do nothing;

-- app_settings: hang RONG. tax_code = NULL (chu du an chot: de trong cho admin
-- nhap; chua cau hinh thi khong hien ma nao — 09-admin-settings.md §6 #1).
-- Cac cot con lai NULL = "chua cau hinh", client phai hien "chua cau hinh",
-- KHONG duoc roi ve mot gia tri doan.
insert into public.app_settings (id, tax_code, settings)
values ('settings', null, '{}'::jsonb)
on conflict (id) do nothing;

-- ==============================================================================
-- 12b. GO DEFAULT SO LIEU BIA (Dot 25 / D8a)
-- ==============================================================================
-- `create table if not exists` la NO-OP voi bang DA TON TAI ⇒ sua DDL o tren KHONG du:
-- phai `alter column ... drop default` cho tung cot. Va voi cot NOT NULL thi phai
-- `drop not null` nua, neu khong moi insert khong gui cot do se fail 23502.
-- NULL = CHUA KHAI (UI phai chiu duoc NULL). Day la cac cot da biet gia tri "bia":
alter table public.products                 alter column rating                           drop default;
alter table public.products                 alter column print_time                       drop default;
alter table public.products                 alter column designer                         drop default;
alter table public.products                 alter column cad_format                       drop default;
alter table public.materials                alter column brand                            drop default;
alter table public.materials                alter column density                          drop default;
alter table public.materials                alter column strength                         drop default;
alter table public.materials                alter column heat_resistance                  drop default;
alter table public.materials                alter column flexibility                      drop default;
alter table public.materials                alter column cost_per_kg                      drop default;
alter table public.materials                alter column price_per_gram                   drop default;
alter table public.materials                alter column unit_price_multiplier            drop default;
alter table public.materials                alter column spool_weight_grams               drop default;
alter table public.materials                alter column stock_rolls_count                drop default;
alter table public.materials                alter column extruder_temp_min                drop default;
alter table public.materials                alter column extruder_temp_max                drop default;
alter table public.materials                alter column bed_temp                         drop default;
alter table public.printer_fleet            alter column brand                            drop default;
alter table public.printer_fleet            alter column bed_dimensions                   drop default;
alter table public.printer_fleet            alter column nozzle_diameter                  drop default;
alter table public.printer_fleet            alter column power_kw                         drop default;
alter table public.printer_fleet            alter column acquisition_cost                 drop default;
alter table public.printer_fleet            alter column expected_lifetime_hours          drop default;
alter table public.printer_fleet            alter column consumables_hourly_rate          drop default;
alter table public.printer_fleet            alter column hourly_rate                      drop default;
alter table public.printer_fleet            alter column hourly_cost                      drop default;
alter table public.printer_fleet            alter column max_print_speed_mms              drop default;
alter table public.printer_fleet            alter column heated_bed_max_temp              drop default;
alter table public.accessories              alter column low_stock_threshold              drop default;
alter table public.accessories              alter column supplier                         drop default;
alter table public.workshop_partners        alter column rating                           drop default;
alter table public.workshop_partners        alter column sla_on_time_rate                 drop default;
alter table public.workshop_partners        alter column max_build_volume                 drop default;
alter table public.designer_profiles        alter column rating                           drop default;
alter table public.workshop_machines        alter column hourly_rate                      drop default;
alter table public.workshop_machines        alter column bed_dimensions                   drop default;
alter table public.workshop_materials       alter column price_per_kg                     drop default;
alter table public.workshop_materials       alter column low_stock_threshold_grams        drop default;
alter table public.quotes                   alter column volume_cm3                       drop default;
alter table public.quotes                   alter column infill_percent                   drop default;
alter table public.quotes                   alter column layer_height_mm                  drop default;
alter table public.digital_assets            alter column file_size_bytes                drop default;
alter table public.digital_assets            alter column checksum                        drop default;
alter table public.products                 alter column rating                           drop not null;
alter table public.products                 alter column designer                         drop not null;
alter table public.materials                alter column density                          drop not null;
alter table public.materials                alter column cost_per_kg                      drop not null;
alter table public.materials                alter column price_per_gram                   drop not null;
alter table public.materials                alter column unit_price_multiplier            drop not null;
alter table public.materials                alter column spool_weight_grams               drop not null;
alter table public.materials                alter column stock_rolls_count                drop not null;
alter table public.printer_fleet            alter column bed_dimensions                   drop not null;
alter table public.accessories              alter column low_stock_threshold              drop not null;
alter table public.workshop_partners        alter column max_build_volume                 drop not null;
alter table public.workshop_machines        alter column bed_dimensions                   drop not null;
alter table public.workshop_materials       alter column price_per_kg                     drop not null;
alter table public.workshop_materials       alter column low_stock_threshold_grams        drop not null;
alter table public.digital_assets            alter column file_size_bytes                drop not null;
alter table public.digital_assets            alter column checksum                        drop not null;
-- ------------------------------------------------------------------------------
-- 13. KIEM TRA CUOI (khong lam fail migration)
-- ------------------------------------------------------------------------------
do $do$
declare
  v_missing text[] := array[]::text[];
  v_def text;
  v_cnt int;
begin
  -- (a) site_content.settings phai TON TAI that (day la loi da gap tren production:
  --     `create table if not exists` la no-op ⇒ cot khong duoc them).
  select count(*) into v_cnt
    from information_schema.columns
   where table_schema = 'public' and table_name = 'site_content' and column_name = 'settings';
  if v_cnt = 0 then
    v_missing := v_missing || 'site_content.settings';
  end if;

  -- (b) 3 default nghiep vu phai da bi bo
  for v_def in
    select column_default from information_schema.columns
     where table_schema = 'public' and table_name = 'pricing_global_settings'
       and column_name in ('electricity_rate_vnd','labor_hourly_rate_vnd','vat_percent')
       and column_default is not null
  loop
    v_missing := v_missing || ('default con lai: ' || v_def);
  end loop;

  -- (c) 2 CHECK constraint phai ton tai
  select count(*) into v_cnt
    from pg_constraint
   where conrelid = 'public.pricing_global_settings'::regclass
     and conname in ('pricing_global_settings_vat_range_chk','pricing_global_settings_rates_nonneg_chk');
  if v_cnt <> 2 then
    v_missing := v_missing || format('thieu CHECK constraint (%s/2)', v_cnt);
  end if;

  -- (d) 4 bang moi phai ton tai
  select count(*) into v_cnt
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r'
     and c.relname in ('app_settings','setting_audit','warranty_claims','order_files');
  if v_cnt <> 4 then
    v_missing := v_missing || format('thieu bang moi (%s/4)', v_cnt);
  end if;

  -- (e) 3 bang cua Dot 10 (reviews/digital_assets/cart_items) phai ton tai
  select count(*) into v_cnt
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r'
     and c.relname in ('reviews','digital_assets','cart_items');
  if v_cnt <> 3 then
    v_missing := v_missing || format('thieu bang Dot 10 (%s/3)', v_cnt);
  end if;

  -- (f) bang order_items (Dot 25) phai ton tai
  select count(*) into v_cnt
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r' and c.relname = 'order_items';
  if v_cnt <> 1 then
    v_missing := v_missing || 'thieu bang order_items (Dot 25)';
  end if;

  -- (g) 14 cot snapshot/payout cua orders phai ton tai
  select count(*) into v_cnt
    from information_schema.columns
   where table_schema = 'public' and table_name = 'orders'
     and column_name in ('subtotal_amount','vat_percent_snapshot','vat_amount',
                         'platform_fee_percent_snapshot','platform_fixed_fee_snapshot','platform_fee_amount',
                         'workshop_payout_amount','designer_payout_amount',
                         'workshop_payout_status','designer_payout_status',
                         'workshop_payout_paid_at','workshop_payout_paid_by',
                         'designer_payout_paid_at','designer_payout_paid_by');
  if v_cnt <> 14 then
    v_missing := v_missing || format('thieu cot snapshot/payout cua orders (%s/14)', v_cnt);
  end if;

  -- (h) bang workshop_commission_terms (Dot 25) phai ton tai + cot ro ri phai DA BI XOA
  select count(*) into v_cnt
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r' and c.relname = 'workshop_commission_terms';
  if v_cnt <> 1 then
    v_missing := v_missing || 'thieu bang workshop_commission_terms (Dot 25)';
  end if;

  select count(*) into v_cnt
    from information_schema.columns
   where table_schema = 'public' and table_name = 'workshop_partners'
     and column_name = 'platform_commission_percent';
  if v_cnt <> 0 then
    v_missing := v_missing || 'cot ro ri workshop_partners.platform_commission_percent VAN CON';
  end if;

  if array_length(v_missing, 1) > 0 then
    raise warning 'BASELINE CHUA AP DU: %', array_to_string(v_missing, ' | ');
    raise warning 'Xem phan "GHI CHU VAN HANH" o cuoi file: bang da ton tai thi phai ALTER.';
  else
    raise notice 'Baseline: OK — site_content.settings co that, default da bo, CHECK da tao, 4 bang moi co that.';
  end if;
  raise notice 'Baseline: xong. Buoc tiep theo: 20261010_harden_rls.sql';
end
$do$;

commit;

-- ==============================================================================
-- GHI CHÚ VẬN HÀNH
-- ------------------------------------------------------------------------------
-- * Danh mục sản phẩm KHÔNG seed ở đây. Client tự seed từ mockData khi bảng rỗng
--   (`dbService.seedInitialProductsIfEmpty`), nhưng thao tác đó cần quyền admin.
--   Vì vậy: chạy bootstrap_admin.sql → đăng nhập → tải lại trang chủ một lần.
-- * Giá & vật liệu: nhập qua /admin (PricingConfigPanel) hoặc bằng SQL.
-- * Thứ tự chạy + kiểm chứng: docs/security/rls-runbook.md
-- ==============================================================================

-- ##############################################################################
-- PHẦN 3/4 — supabase/migrations/20261010_harden_rls.sql
-- HARDEN RLS — toàn bộ policy (90 policy bảng + 6 policy storage). Tự dọn policy cũ/lạ.
-- ##############################################################################

-- ==============================================================================
-- VCUBE — HARDEN RLS (20261010)
-- ==============================================================================
-- Mục tiêu: chấm dứt 3 lỗ hổng đang tồn tại trên production
--   (1) anon GHI được products/materials/printer_fleet/pricing_config
--   (2) anon ĐỌC được toàn bộ orders (tên, SĐT, địa chỉ, secure_access_token)
--   (3) anon ĐỌC được toàn bộ user_profiles (email, điện thoại, kyc_details)
--
-- NGUYÊN NHÂN GỐC: các policy trong 20260904_complete_vcube_schema_and_seeds.sql
--   (và các file sau) dùng `FOR ALL USING (true)` KHÔNG kiểm tra quyền, và các
--   migration "hardening" sau đó chỉ DROP policy TRÙNG TÊN của chính nó. Postgres
--   OR các policy permissive với nhau, nên policy `USING (true)` cũ vẫn còn hiệu lực
--   và vô hiệu hoá mọi policy siết chặt hơn.
--
-- ĐẶC ĐIỂM CỦA FILE NÀY
--   * Idempotent: chạy lại nhiều lần không lỗi, không nhân bản policy.
--   * Thích ứng: schema production không chắc chắn (4 file migration định nghĩa
--     trùng bảng orders/user_profiles với cột khác nhau), nên mọi policy được tạo
--     có kiểm tra sự tồn tại của bảng + cột trước khi tạo.
--   * Tự dọn: xoá MỌI policy còn sót trên bảng mục tiêu không nằm trong allowlist
--     (kể cả policy tạo tay trong Dashboard).
--   * Có kiểm tra cuối file: cảnh báo nếu còn policy permissive nào.
--
-- ⚠️ SAU KHI CHẠY: phải chạy `supabase/scripts/bootstrap_admin.sql` để cấp quyền
--    admin cho tài khoản của bạn (quyền admin nay đọc từ public.user_profiles.role,
--    KHÔNG còn đọc từ user_metadata hay email hardcode).
--    Kiểm chứng: `node scripts/verify-rls.mjs`
--
-- Rollback/khắc phục sự cố: xem docs/security/rls-runbook.md
-- ==============================================================================

begin;

-- ==============================================================================
-- 1. HELPER: hàm đọc vai trò của người gọi
-- ==============================================================================
-- Lý do dùng SECURITY DEFINER: policy trên user_profiles cần đọc user_profiles,
-- nếu đọc trực tiếp sẽ đệ quy vô hạn. Hàm này chạy bằng quyền owner (postgres) nên
-- bỏ qua RLS, nhưng CHỈ trả về vai trò của chính người gọi (lọc theo auth.uid()).
-- `set search_path` cố định để chống hijack.
do $do$
begin
  if to_regclass('public.user_profiles') is null then
    -- Không có bảng profile: mọi người là 'anon' trừ khi có nhánh fallback bên dưới.
    execute $fn$
      create or replace function public.current_app_role()
      returns text language sql stable security definer set search_path = public
      as $body$ select 'anon'::text $body$;
    $fn$;
  else
    execute $fn$
      create or replace function public.current_app_role()
      returns text language sql stable security definer set search_path = public
      as $body$
        select coalesce(
          (select up.role
             from public.user_profiles up
            where up.id::text = (select auth.uid())::text
            limit 1),
          'anon'
        );
      $body$;
    $fn$;
  end if;
end
$do$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $body$ select public.current_app_role() = 'admin' $body$;

-- is_admin_or_lab(): admin HOAC lab. Dung cho warranty_claims / order_files
-- (09-admin-settings.md §4: "Admin/lab doc tat ca + doi status").
create or replace function public.is_admin_or_lab()
returns boolean language sql stable security definer set search_path = public
as $body$ select public.current_app_role() in ('admin','lab') $body$;

grant execute on function public.current_app_role() to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.is_admin_or_lab() to anon, authenticated;

comment on function public.current_app_role() is
  'VCUBE: vai trò thật của người gọi, đọc từ public.user_profiles.role. Không dùng user_metadata.';

-- current_workshop_partner_id(): partner_id của xưởng in đang đăng nhập (NULL nếu người
-- gọi không phải xưởng). Dùng cho 2 policy `orders` của xưởng (mục 5b) và trigger chống
-- sửa cột đặc quyền (mục 6c).
--
-- ⚠️ `workshop_profiles` KHÔNG có unique trên `user_id` (một user có thể có nhiều hàng),
-- nên helper phải `order by updated_at desc nulls last limit 1`: subquery trả >1 hàng
-- trong biểu thức policy sẽ nổ 21000 "more than one row returned by a subquery", và
-- `select ... where user_id = auth.uid()` trần cũng lỗi 42P10 nếu có >1 hàng.
--
-- SECURITY DEFINER: đọc `workshop_profiles` bằng quyền owner nên không phụ thuộc policy
-- của bảng đó; `search_path` cố định để chống hijack. Hàm chỉ trả `partner_id` CỦA CHÍNH
-- người gọi (lọc theo auth.uid()), không lộ dữ liệu của xưởng khác.
-- Cố ý CHỈ grant cho `authenticated`: cả 2 policy dùng hàm này đều `to authenticated`,
-- `anon` không có đường nào gọi tới nó.
create or replace function public.current_workshop_partner_id()
returns text language sql stable security definer set search_path = public
as $body$
  select wp.partner_id
    from public.workshop_profiles wp
   where wp.user_id::text = (select auth.uid())::text
     and wp.partner_id is not null
   order by wp.updated_at desc nulls last
   limit 1
$body$;

grant execute on function public.current_workshop_partner_id() to authenticated;

comment on function public.current_workshop_partner_id() is
  'VCUBE: partner_id của xưởng in đang đăng nhập (NULL nếu không phải xưởng). user_id không unique nên chỉ lấy hàng mới nhất; không lộ dữ liệu xưởng khác.';

-- ==============================================================================
-- 2. HELPER TẠM (bị xoá ở cuối file) — tạo policy có kiểm tra bảng + cột
-- ==============================================================================
create or replace function public._vcube_make_policy(
  p_table text,
  p_name  text,
  p_cmd   text,          -- select | insert | update | delete | all
  p_roles text[],
  p_using text,          -- null nếu không hợp lệ với p_cmd
  p_check text           -- null nếu không hợp lệ với p_cmd
) returns void
language plpgsql
as $fn$
declare
  v_sql text;
  v_kind "char";
begin
  select c.relkind into v_kind
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relname = p_table;

  if v_kind is null then
    raise notice 'SKIP  policy % : public.% không tồn tại', p_name, p_table;
    return;
  end if;
  if v_kind not in ('r', 'p') then
    raise notice 'SKIP  policy % : public.% là % (view không nhận policy)', p_name, p_table, v_kind;
    return;
  end if;

  -- Chuẩn hoá theo loại lệnh: INSERT không có USING, SELECT/DELETE không có WITH CHECK.
  if p_cmd = 'insert' then p_using := null; end if;
  if p_cmd in ('select', 'delete') then p_check := null; end if;

  execute format('drop policy if exists %I on public.%I', p_name, p_table);

  v_sql := format(
    'create policy %I on public.%I for %s to %s',
    p_name, p_table, p_cmd, array_to_string(p_roles, ', ')
  );
  if p_using is not null then v_sql := v_sql || ' using (' || p_using || ')'; end if;
  if p_check is not null then v_sql := v_sql || ' with check (' || p_check || ')'; end if;

  execute v_sql;
  raise notice 'OK    policy % on public.%', p_name, p_table;
exception
  when others then
    raise warning 'FAIL  policy % on public.% : % (%)', p_name, p_table, sqlerrm, sqlstate;
end
$fn$;

create or replace function public._vcube_has_columns(p_table text, p_cols text[])
returns boolean
language sql stable
as $fn$
  select coalesce(bool_and(exists (
    select 1 from information_schema.columns c
     where c.table_schema = 'public'
       and c.table_name = p_table
       and c.column_name = col
  )), true)
  from unnest(coalesce(p_cols, array[]::text[])) as col;
$fn$;

-- ==============================================================================
-- 3. DROP TOÀN BỘ POLICY CŨ (mọi tên đã từng được tạo trong repo)
-- ==============================================================================
do $do$
declare
  rec record;
  v_tables text[] := array[
    'products','orders','user_profiles','materials','printer_fleet','pricing_config',
    'pricing_configs','cost_rules','site_content','accessories','workshop_partners',
    'payment_transactions','workshop_profiles','workshop_machines','workshop_materials',
    'material_inventory_logs','designer_profiles','customer_profiles',
    'pricing_global_settings','workshop_accessories',
    'app_settings','setting_audit','warranty_claims','order_files','reviews','digital_assets','cart_items','quotes','kyc_records','order_items','workshop_commission_terms',
    'custom_design_requests'
  ];
  v_names text[] := array[
    -- products
    'Public can view published products','Admins can manage products',
    'Public read published products','Admin full access',
    -- orders
    'Public can view orders','Public can insert orders','Admins can update orders',
    'Users can read their own orders','Guests can read order with matching secure token',
    'Public can create orders','Admins have full access to orders',
    'Users can read own orders','Guest token holder can read order',
    'Anyone can insert an order',
    -- user_profiles
    'Users can view profiles','Admins can manage profiles',
    'Users can read own profile','Users can update own profile','Admins can manage all profiles',
    -- catalog
    'Public can read materials','Admins can manage materials',
    'Public can read printer fleet','Admins can manage printer fleet',
    'Public can read pricing config','Admins can manage pricing config',
    'Public can read active pricing config','Admins can manage pricing configs',
    'Public can read site content','Admins can update site content',
    'Public can read accessories','Admins can manage accessories',
    'Public can read workshop partners','Admins can manage workshop partners',
    -- cost rules
    'Only admin can view and modify cost rules',
    -- payment
    'Anyone can record payment transaction','Admins can view payment transactions',
    -- workshop / role profiles
    'Public can view verified workshops','Workshop owners can update own profile',
    'Admins can manage all workshop profiles',
    'Public can view active machines','Workshop owners can manage own machines',
    'Public can view workshop materials','Workshop owners can manage own materials',
    'Workshop owners and admins can view inventory logs',
    'Workshop owners and admins can insert inventory logs',
    'Public can view designer profiles','Designers can update own profile',
    'Admins can manage all designer profiles',
    'Customers can view own profile','Customers can update own profile',
    'Admins can manage all customer profiles',
    'Public can view pricing settings','Admins can update pricing settings',
    'Public can view active accessories','Admins and workshops can manage accessories',
    -- app_settings / setting_audit / warranty_claims / order_files (2026-09)
    'app_settings_public_read','app_settings_admin_write',
    'setting_audit_admin_read','setting_audit_admin_insert',
    'warranty_claims_customer_read','warranty_claims_customer_insert',
    'warranty_claims_admin_update','order_files_buyer_read','order_files_admin_write',
    'Public can read app settings','Admins can manage app settings',
    'Admins can read setting audit','Anyone can insert setting audit',
    'Customers can read own warranty claims','Customers can create warranty claims',
    'Admins and lab can manage warranty claims','Buyers can read own order files',
    'Admins can manage order files'
  ];
begin
  for rec in
    select p.schemaname, p.tablename, p.policyname
      from pg_policies p
     where p.schemaname = 'public'
       and p.tablename = any (v_tables)
       and p.policyname = any (v_names)
  loop
    execute format('drop policy if exists %I on %I.%I', rec.policyname, rec.schemaname, rec.tablename);
  end loop;
  raise notice 'Bước 3: đã xoá policy cũ theo tên (nếu tồn tại).';
end
$do$;

-- ==============================================================================
-- 4. BẬT RLS CHO MỌI BẢNG MỤC TIÊU
-- ==============================================================================
do $do$
declare
  t text;
  v_tables text[] := array[
    'products','orders','user_profiles','materials','printer_fleet','pricing_config',
    'pricing_configs','cost_rules','site_content','accessories','workshop_partners',
    'payment_transactions','workshop_profiles','workshop_machines','workshop_materials',
    'material_inventory_logs','designer_profiles','customer_profiles',
    'pricing_global_settings','workshop_accessories',
    'app_settings','setting_audit','warranty_claims','order_files','reviews','digital_assets','cart_items','quotes','kyc_records','order_items','workshop_commission_terms',
    'custom_design_requests'
  ];
begin
  foreach t in array v_tables loop
    -- CHỈ bật RLS cho bảng thật. `to_regclass` trả về cả VIEW, mà
    -- ALTER TABLE ... ENABLE ROW LEVEL SECURITY trên view sẽ lỗi 42809.
    -- View được bảo vệ bằng `security_invoker = true` + policy của bảng gốc.
    declare
      v_kind "char";
    begin
      select c.relkind into v_kind
        from pg_class c join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relname = t;

      if v_kind is null then
        raise notice 'SKIP  enable RLS: public.% không tồn tại', t;
      elsif v_kind in ('r', 'p') then
        execute format('alter table public.%I enable row level security', t);
      else
        raise notice 'SKIP  enable RLS: public.% là % (không phải bảng)', t, v_kind;
      end if;
    end;
  end loop;

  -- Cấp quyền cho custom_design_requests
  if to_regclass('public.custom_design_requests') is not null then
    execute 'grant select, insert, update on public.custom_design_requests to authenticated';
  end if;
end
$do$;

-- ==============================================================================
-- 5. TẠO POLICY ĐÚNG
-- ==============================================================================
do $do$
declare
  -- catalog = dữ liệu bán hàng công khai: ai cũng đọc, chỉ admin ghi
  v_catalog_read text[] := array[
    'materials','printer_fleet','accessories','workshop_partners','site_content',
    'pricing_configs','workshop_machines','workshop_materials','designer_profiles',
    'pricing_global_settings','workshop_accessories'
  ];
  t text;
  v_owner_pred text;
  v_has_user_id boolean;
  v_has_email boolean;
  v_guest_check text;
begin
  -- ---------- 5.1 products ----------
  perform public._vcube_make_policy(
    'products', 'vcube_products_public_read', 'select', array['anon','authenticated'],
    $p$status in ('published','Published')$p$, null);
  perform public._vcube_make_policy(
    'products', 'vcube_products_admin_all', 'all', array['authenticated'],
    'public.is_admin()', 'public.is_admin()');

  -- ---------- 5.2 orders ----------
  -- (a) chủ đơn đọc đơn của mình — chỉ tạo nếu suy ra được danh tính chủ đơn
  select exists (select 1 from information_schema.columns
                  where table_schema='public' and table_name='orders' and column_name='user_id')
    into v_has_user_id;
  select exists (select 1 from information_schema.columns
                  where table_schema='public' and table_name='orders' and column_name='customer_email')
    into v_has_email;

  if v_has_user_id then
    v_owner_pred := 'user_id::text = (select auth.uid())::text';
    if v_has_email then
      v_owner_pred := v_owner_pred || ' or customer_email = (select auth.jwt() ->> ''email'')';
    end if;
  elsif v_has_email then
    v_owner_pred := 'customer_email = (select auth.jwt() ->> ''email'')';
  else
    v_owner_pred := null;
    raise warning 'orders: không có cột user_id/customer_email — bỏ policy đọc theo chủ đơn.';
  end if;

  if v_owner_pred is not null then
    perform public._vcube_make_policy(
      'orders', 'vcube_orders_owner_read', 'select', array['authenticated'], v_owner_pred, null);
  end if;

  -- (b) admin toàn quyền
  perform public._vcube_make_policy(
    'orders', 'vcube_orders_admin_all', 'all', array['authenticated'],
    'public.is_admin()', 'public.is_admin()');

  -- (c) guest checkout: CHO PHÉP insert nhưng phải có token tra cứu hợp lệ.
  --     (không có policy SELECT cho anon — tra cứu đi qua RPC get_order_by_guest_token)
  if public._vcube_has_columns('orders', array['secure_access_token']) then
    -- Dựng biểu thức Ở THỜI ĐIỂM TẠO policy. KHÔNG được gọi hàm tạm `_vcube_*`
    -- bên trong biểu thức policy: các hàm đó bị drop ở bước 10, policy sẽ vỡ lúc
    -- runtime với lỗi "function public._vcube_has_columns does not exist".
    v_guest_check := 'secure_access_token is not null and length(btrim(secure_access_token)) >= 12';
    if public._vcube_has_columns('orders', array['customer_email']) then
      v_guest_check := v_guest_check || ' and coalesce(btrim(customer_email), '''') <> ''''';
    end if;
    if public._vcube_has_columns('orders', array['items']) then
      v_guest_check := v_guest_check || ' and items is not null';
    end if;

    -- Chủ đơn — chống MẠO DANH: `user_id` do CLIENT gửi lên
    -- (src/backend/supabase/database.ts:290). ĐÃ KIỂM CHỨNG THẬT trên production: insert bằng anon
    -- với `user_id` của NGƯỜI KHÁC trả HTTP 201 — DB nhận một đơn thuộc về người khác.
    -- Luật: `user_id is null` (guest checkout — và trường hợp client không suy ra được phiên)
    -- VẪN hợp lệ; mọi giá trị khác PHẢI bằng `auth.uid()` của người đang đăng nhập.
    if public._vcube_has_columns('orders', array['user_id']) then
      v_guest_check := v_guest_check
        || ' and (user_id is null or user_id::text = (select auth.uid())::text)';
    else
      raise warning 'orders: thiếu cột user_id — không ràng buộc được chủ đơn khi insert.';
    end if;

    -- Không ràng buộc `status`: client hiện gửi status tuỳ ý khi tạo đơn. Chỉ admin
    -- được UPDATE nên rủi ro còn lại là sai dữ liệu, không phải leo quyền. Cách đúng
    -- là tạo đơn qua Edge Function để ép status ở phía server.
    perform public._vcube_make_policy(
      'orders', 'vcube_orders_guest_insert', 'insert', array['anon','authenticated'],
      null, v_guest_check);
  else
    raise warning 'orders: thiếu cột secure_access_token — guest checkout cần xử lý thủ công.';
  end if;
  -- Lưu ý: KHÔNG tạo policy SELECT cho anon/authenticated trên orders.

  -- ---------- 5.3 user_profiles ----------
  perform public._vcube_make_policy(
    'user_profiles', 'vcube_profiles_self_read', 'select', array['authenticated'],
    'id::text = (select auth.uid())::text', null);
  perform public._vcube_make_policy(
    'user_profiles', 'vcube_profiles_self_update', 'update', array['authenticated'],
    'id::text = (select auth.uid())::text', 'id::text = (select auth.uid())::text');
  perform public._vcube_make_policy(
    'user_profiles', 'vcube_profiles_admin_all', 'all', array['authenticated'],
    'public.is_admin()', 'public.is_admin()');
  -- Không có policy nào cho anon ⇒ anon không đọc được profile của bất kỳ ai.

  -- ---------- 5.4 catalog công khai ----------
  foreach t in array v_catalog_read loop
    perform public._vcube_make_policy(
      t, 'vcube_' || t || '_public_read', 'select', array['anon','authenticated'], 'true', null);
    perform public._vcube_make_policy(
      t, 'vcube_' || t || '_admin_write', 'all', array['authenticated'],
      'public.is_admin()', 'public.is_admin()');
  end loop;

  -- workshop_profiles: chỉ xưởng đã xác minh được xem công khai
  perform public._vcube_make_policy(
    'workshop_profiles', 'vcube_workshop_profiles_public_read', 'select', array['anon','authenticated'],
    $p$verified_status = 'Verified'$p$, null);
  if public._vcube_has_columns('workshop_profiles', array['user_id']) then
    perform public._vcube_make_policy(
      'workshop_profiles', 'vcube_workshop_profiles_owner_read', 'select', array['authenticated'],
      'user_id::text = (select auth.uid())::text or public.is_admin()', null);
    perform public._vcube_make_policy(
      'workshop_profiles', 'vcube_workshop_profiles_owner_update', 'update', array['authenticated'],
      'user_id::text = (select auth.uid())::text or public.is_admin()',
      'user_id::text = (select auth.uid())::text or public.is_admin()');
    -- B1 (P0): chủ sở hữu TỰ TẠO hồ sơ xưởng. Trước mục này, `workshop_profiles` chỉ có
    -- select/update/admin ⇒ tài khoản xưởng THẬT không thể lưu hồ sơ (onboarding chặn ở
    -- tầng DB; `WorkshopOnboardingWizard` gọi `saveWorkshopProfile` và nhận 42501).
    --
    -- 🔴 HAI CỘT BỊ KHOÁ — đây là chống LEO THANG ĐẶC QUYỀN, không phải cho đẹp:
    --   * `partner_id is null`: helper `current_workshop_partner_id()` (mục 1) đọc CHÍNH
    --     cột này để cấp quyền đọc/cập nhật `orders` của xưởng (2 policy mục 5b + trigger
    --     mục 6c). Nếu chủ sở hữu được tự đặt `partner_id` tuỳ ý thì chỉ cần insert một
    --     hàng với `partner_id` của xưởng KHÁC là đọc và sửa được đơn của xưởng đó.
    --     Admin gán mã đối tác SAU, qua `vcube_workshop_profiles_admin_all`.
    --   * `verified_status = 'Pending'`: không ai tự xác minh mình. Hồ sơ `Verified` được
    --     đọc công khai (`vcube_workshop_profiles_public_read`) nên tự đặt 'Verified' là
    --     tự cấp cho mình trạng thái đã được duyệt.
    -- Cột `verified_status` có DEFAULT 'Pending' ⇒ client KHÔNG cần gửi cột này (DEFAULT
    -- được áp trước khi WITH CHECK chạy). `WorkshopOnboardingWizard.tsx:386` có gửi
    -- 'Pending' tường minh ⇒ khớp cả hai đường.
    --
    -- KHÔNG khoá `total_machines` / `active_machines_now` (quyết định CÓ Ý THỨC, đã báo
    -- coordinator):
    --   (1) VÔ HIỆU: `vcube_workshop_profiles_owner_update` ngay trên cho chủ sở hữu UPDATE
    --       mọi cột, nên khoá lúc INSERT thì họ đặt lại số ngay sau đó bằng một lệnh PATCH.
    --   (2) PHÁ LUỒNG THẬT: `saveWorkshopProfile` là UPSERT và LUÔN gửi 2 cột này
    --       (`workshopService.ts:548-549`); wizard gửi `machines.length`
    --       (`WorkshopOnboardingWizard.tsx:382-383`) ⇒ ép `= 0` làm insert fail 42501 với
    --       MỌI xưởng khai ≥1 máy — đúng P0 đang sửa.
    --   (3) Cách đúng (nếu muốn "số năng lực phải được xác minh"): trigger chặn cột cho CẢ
    --       insert lẫn update, cùng khuôn `fn_protect_order_privileged_columns` (mục 6c).
    --       Đã đề xuất coordinator; CHƯA thêm vì ngoài phạm vi được giao.
    perform public._vcube_make_policy(
      'workshop_profiles', 'vcube_workshop_profiles_owner_insert', 'insert', array['authenticated'],
      null,
      $p$user_id::text = (select auth.uid())::text and partner_id is null and verified_status = 'Pending'$p$);
    -- ⚠️ Policy trên chỉ đóng đường INSERT. Đường UPDATE (`vcube_workshop_profiles_owner_update`)
    -- vẫn KHÔNG giới hạn cột ⇒ cùng lớp leo thang vẫn đi qua được bằng PATCH `partner_id`
    -- hoặc `verified_status` trên hàng của chính mình. RLS không giới hạn được cột; cần
    -- trigger chặn cột (đã báo coordinator, xem mục 6c để biết khuôn).
  end if;
  perform public._vcube_make_policy(
    'workshop_profiles', 'vcube_workshop_profiles_admin_all', 'all', array['authenticated'],
    'public.is_admin()', 'public.is_admin()');

  -- customer_profiles / designer_profiles: chủ sở hữu + admin
  if public._vcube_has_columns('customer_profiles', array['user_id']) then
    perform public._vcube_make_policy(
      'customer_profiles', 'vcube_customer_profiles_owner_all', 'all', array['authenticated'],
      'user_id::text = (select auth.uid())::text or public.is_admin()',
      'user_id::text = (select auth.uid())::text or public.is_admin()');
  end if;
  perform public._vcube_make_policy(
    'customer_profiles', 'vcube_customer_profiles_admin_all', 'all', array['authenticated'],
    'public.is_admin()', 'public.is_admin()');

  if public._vcube_has_columns('designer_profiles', array['user_id']) then
    perform public._vcube_make_policy(
      'designer_profiles', 'vcube_designer_profiles_owner_all', 'all', array['authenticated'],
      'user_id::text = (select auth.uid())::text or public.is_admin()',
      'user_id::text = (select auth.uid())::text or public.is_admin()');
  end if;
  perform public._vcube_make_policy(
    'designer_profiles', 'vcube_designer_profiles_admin_all', 'all', array['authenticated'],
    'public.is_admin()', 'public.is_admin()');

  -- material_inventory_logs: xưởng sở hữu vật liệu hoặc admin
  perform public._vcube_make_policy(
    'material_inventory_logs', 'vcube_inventory_logs_owner_read', 'select', array['authenticated'],
    $p$public.is_admin() or exists (
         select 1 from public.workshop_materials wm
           join public.workshop_profiles wp on wp.id = wm.workshop_id
          where wm.id = material_inventory_logs.material_id
            and wp.user_id::text = (select auth.uid())::text
       )$p$, null);
  perform public._vcube_make_policy(
    'material_inventory_logs', 'vcube_inventory_logs_owner_insert', 'insert', array['authenticated'],
    null,
    $p$public.is_admin() or exists (
         select 1 from public.workshop_materials wm
           join public.workshop_profiles wp on wp.id = wm.workshop_id
          where wm.id = material_inventory_logs.material_id
            and wp.user_id::text = (select auth.uid())::text
       )$p$);
  perform public._vcube_make_policy(
    'material_inventory_logs', 'vcube_inventory_logs_admin_all', 'all', array['authenticated'],
    'public.is_admin()', 'public.is_admin()');

  -- payment_transactions: CHỈ admin (webhook thật phải dùng service_role, bypass RLS)
  perform public._vcube_make_policy(
    'payment_transactions', 'vcube_payment_transactions_admin_all', 'all', array['authenticated'],
    'public.is_admin()', 'public.is_admin()');

  -- cost_rules: chỉ admin
  perform public._vcube_make_policy(
    'cost_rules', 'vcube_cost_rules_admin_all', 'all', array['authenticated'],
    'public.is_admin()', 'public.is_admin()');

  -- pricing_config legacy: nếu là BẢNG thì siết policy; nếu là VIEW thì xử lý ở bước 7
  if exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
              where n.nspname = 'public' and c.relname = 'pricing_config' and c.relkind = 'r') then
    perform public._vcube_make_policy(
      'pricing_config', 'vcube_pricing_config_public_read', 'select', array['anon','authenticated'], 'true', null);
    perform public._vcube_make_policy(
      'pricing_config', 'vcube_pricing_config_admin_write', 'all', array['authenticated'],
      'public.is_admin()', 'public.is_admin()');
  end if;

  -- ---------- 5.4b app_settings / setting_audit ----------
  -- app_settings: noi dung phap ly hien thi cong khai (ten phap nhan, dia chi
  -- xuat hoa don, hotline, email, so tai khoan, dieu khoan). Cho anon doc, nhung
  -- CHI admin ghi. Ma so thue de NULL khi chua cau hinh — UI phai an, khong doan.
  perform public._vcube_make_policy(
    'app_settings', 'vcube_app_settings_public_read', 'select', array['anon','authenticated'],
    $p$true$p$, null);
  perform public._vcube_make_policy(
    'app_settings', 'vcube_app_settings_admin_insert', 'insert', array['authenticated'],
    null, 'public.is_admin()');
  perform public._vcube_make_policy(
    'app_settings', 'vcube_app_settings_admin_update', 'update', array['authenticated'],
    'public.is_admin()', 'public.is_admin()');

  -- setting_audit: append-only. Chi admin doc va ghi; KHONG tao policy UPDATE
  -- hay DELETE cho bat ky vai tro nao ⇒ nhat ky khong the bi sua/xoa tu client.
  perform public._vcube_make_policy(
    'setting_audit', 'vcube_setting_audit_admin_read', 'select', array['authenticated'],
    'public.is_admin()', null);
  perform public._vcube_make_policy(
    'setting_audit', 'vcube_setting_audit_admin_insert', 'insert', array['authenticated'],
    null, 'public.is_admin()');

  -- ---------- 5.4c warranty_claims ----------
  -- Khach doc/tao claim cua CHINH minh (user_id = auth.uid()). Khach KHONG co
  -- policy UPDATE ⇒ khong the tu doi status/resolution/handled_by.
  if public._vcube_has_columns('warranty_claims', array['user_id']) then
    perform public._vcube_make_policy(
      'warranty_claims', 'vcube_warranty_claims_customer_read', 'select', array['authenticated'],
      'user_id::text = (select auth.uid())::text', null);
    perform public._vcube_make_policy(
      'warranty_claims', 'vcube_warranty_claims_customer_insert', 'insert', array['authenticated'],
      null, 'user_id::text = (select auth.uid())::text');
  else
    raise warning 'warranty_claims: thieu cot user_id — khach khong tao duoc claim';
  end if;
  -- admin/lab: doc tat ca + cap nhat trang thai / ghi chu xu ly
  perform public._vcube_make_policy(
    'warranty_claims', 'vcube_warranty_claims_staff_read', 'select', array['authenticated'],
    'public.is_admin_or_lab()', null);
  perform public._vcube_make_policy(
    'warranty_claims', 'vcube_warranty_claims_staff_update', 'update', array['authenticated'],
    'public.is_admin_or_lab()', 'public.is_admin_or_lab()');

  -- ---------- 5.4d order_files (mo khoa DoD #19: tai file CAD sau khi mua) ----------
  -- Nguoi mua doc duoc file thuoc DON CUA MINH qua bang lien ket that, thay cho
  -- heuristic `orders.items::text like '%…%'` truoc day.
  if public._vcube_has_columns('order_files', array['order_id','storage_path'])
     and public._vcube_has_columns('orders', array['user_id']) then
    perform public._vcube_make_policy(
      'order_files', 'vcube_order_files_buyer_read', 'select', array['authenticated'],
      $p$public.is_admin_or_lab() or exists (
           select 1 from public.orders o
            where o.id = order_files.order_id
              and o.user_id::text = (select auth.uid())::text
         )$p$, null);
  else
    raise warning 'order_files: thieu cot order_id/storage_path hoac orders.user_id — bo qua policy nguoi mua';
  end if;
  perform public._vcube_make_policy(
    'order_files', 'vcube_order_files_staff_insert', 'insert', array['authenticated'],
    null, 'public.is_admin_or_lab()');
  perform public._vcube_make_policy(
    'order_files', 'vcube_order_files_staff_update', 'update', array['authenticated'],
    'public.is_admin_or_lab()', 'public.is_admin_or_lab()');
  perform public._vcube_make_policy(
    'order_files', 'vcube_order_files_admin_delete', 'delete', array['authenticated'],
    'public.is_admin()', null);

  -- ---------- 5.4e reviews (Đợt 10) ----------
  -- Ai cũng đọc bản ĐÃ published; tác giả đọc bản của mình (kể cả pending/hidden), CHỈ
  -- chèn được khi author_id = auth.uid(), và chỉ sửa/xoá khi còn 'pending'.
  -- `status = 'pending'` trong WITH CHECK là CỐ Ý siết thêm so với brief: nếu tác giả được
  -- tự chèn thẳng status='published' thì bước duyệt pending -> published vô nghĩa, và bất
  -- kỳ ai cũng bơm được điểm vào products.rating qua trigger (20260901 mục 9.6).
  -- Admin vẫn publish/ẩn được nhờ policy full ở dưới.
  perform public._vcube_make_policy(
    'reviews', 'vcube_reviews_public_read', 'select', array['anon','authenticated'],
    $p$status = 'published'$p$, null);
  perform public._vcube_make_policy(
    'reviews', 'vcube_reviews_author_read', 'select', array['authenticated'],
    'author_id::text = (select auth.uid())::text', null);
  perform public._vcube_make_policy(
    'reviews', 'vcube_reviews_author_insert', 'insert', array['authenticated'],
    null,
    $p$author_id::text = (select auth.uid())::text and status = 'pending'$p$);
  perform public._vcube_make_policy(
    'reviews', 'vcube_reviews_author_update', 'update', array['authenticated'],
    $p$author_id::text = (select auth.uid())::text and status = 'pending'$p$,
    $p$author_id::text = (select auth.uid())::text and status = 'pending'$p$);
  perform public._vcube_make_policy(
    'reviews', 'vcube_reviews_author_delete', 'delete', array['authenticated'],
    $p$author_id::text = (select auth.uid())::text and status = 'pending'$p$, null);
  perform public._vcube_make_policy(
    'reviews', 'vcube_reviews_admin_all', 'all', array['authenticated'],
    'public.is_admin()', 'public.is_admin()');

  -- ---------- 5.4f digital_assets (Đợt 10) ----------
  -- ĐIỂM SỐNG CÒN: storage_path là đường lấy file trong bucket PRIVATE 'cad-files'.
  --   * designer CHỈ thấy file của mình (designer_id = auth.uid()), admin toàn quyền.
  --   * KHÔNG có policy nào cho anon/khách ⇒ khách không đọc được DÒNG NÀO, nên không bao
  --     giờ nhận được storage_path. (RLS là mức DÒNG chứ không phải mức CỘT — cách duy nhất
  --     để chắc chắn không lộ cột là không cho đọc dòng. GRANT cũng không mở cho anon.)
  --   * Khách cần tải file ⇒ tầng service dùng service_role + createSignedUrl NGẮN HẠN, sau
  --     khi service tự kiểm tra quyền mua. KHÔNG đưa storage_path ra client khách.
  perform public._vcube_make_policy(
    'digital_assets', 'vcube_digital_assets_designer_all', 'all', array['authenticated'],
    'designer_id::text = (select auth.uid())::text',
    'designer_id::text = (select auth.uid())::text');
  perform public._vcube_make_policy(
    'digital_assets', 'vcube_digital_assets_admin_all', 'all', array['authenticated'],
    'public.is_admin()', 'public.is_admin()');

  -- ---------- 5.4g cart_items (Đợt 10) ----------
  -- Chỉ chủ sở hữu đọc/ghi giỏ của mình. Admin CHỈ ĐỌC (đúng brief: "admin đọc") — KHÔNG
  -- có policy UPDATE/DELETE cho admin, nên không ai sửa được giỏ của khách qua API.
  perform public._vcube_make_policy(
    'cart_items', 'vcube_cart_items_owner_all', 'all', array['authenticated'],
    'user_id::text = (select auth.uid())::text',
    'user_id::text = (select auth.uid())::text');
  perform public._vcube_make_policy(
    'cart_items', 'vcube_cart_items_admin_read', 'select', array['authenticated'],
    'public.is_admin()', null);

  -- ---------- 5.4h quotes (Đợt 10 — W5) ----------
  -- VÌ SAO CẦN: `quotes` đã có RLS bật + GRANT cho `authenticated` nhưng KHÔNG có policy
  -- nào ⇒ deny-all, nên `src/backend/supabase/database.ts` gọi `insert into quotes` LUÔN
  -- thất bại 42501. Bảng rỗng trên production đúng với việc insert chưa từng thành công.
  -- Đây là lớp lỗi mà `audit` kiểu "bảng thiếu RLS" KHÔNG bắt được (deny-all là an toàn).
  -- Chủ sở hữu toàn quyền trên báo giá của mình; admin toàn quyền. Không có anon.
  -- D5(b): BỎ DELETE khỏi quyền chủ sở hữu — GIỮ LỊCH SỬ BÁO GIÁ để đối soát.
  -- Cố ý KHÔNG có policy delete ⇒ client không xoá được báo giá; admin vẫn xoá được qua
  -- `vcube_quotes_admin_all` khi thật cần.
  perform public._vcube_make_policy(
    'quotes', 'vcube_quotes_owner_read', 'select', array['authenticated'],
    'user_id::text = (select auth.uid())::text', null);
  perform public._vcube_make_policy(
    'quotes', 'vcube_quotes_owner_insert', 'insert', array['authenticated'],
    null, 'user_id::text = (select auth.uid())::text');
  perform public._vcube_make_policy(
    'quotes', 'vcube_quotes_owner_update', 'update', array['authenticated'],
    'user_id::text = (select auth.uid())::text',
    'user_id::text = (select auth.uid())::text');
  perform public._vcube_make_policy(
    'quotes', 'vcube_quotes_admin_all', 'all', array['authenticated'],
    'public.is_admin()', 'public.is_admin()');

  -- ---------- 5.4i kyc_records (Đợt 10 — W5) ----------
  -- PII NẶNG: `doc_number` / `tax_id` / `bank_account`. Chỉ CHỦ SỞ HỮU và admin đọc được;
  -- KHÔNG grant, KHÔNG policy cho anon.
  -- Chủ sở hữu CHỈ được ĐỌC + NỘP MỚI, CỐ Ý KHÔNG có UPDATE/DELETE: kết quả duyệt
  -- (`status`/`reviewed_by`/`reviewed_at`) phải bất biến từ phía người dùng — muốn sửa thì
  -- nộp bản mới. WITH CHECK của insert chặn luôn việc TỰ DUYỆT: status phải là 'pending'
  -- và reviewed_* phải rỗng, nếu không người dùng tự ghi status='verified'.
  perform public._vcube_make_policy(
    'kyc_records', 'vcube_kyc_owner_read', 'select', array['authenticated'],
    'user_id::text = (select auth.uid())::text', null);
  perform public._vcube_make_policy(
    'kyc_records', 'vcube_kyc_owner_insert', 'insert', array['authenticated'],
    null,
    $p$user_id::text = (select auth.uid())::text and coalesce(status, 'pending') = 'pending' and reviewed_by is null and reviewed_at is null$p$);
  perform public._vcube_make_policy(
    'kyc_records', 'vcube_kyc_admin_all', 'all', array['authenticated'],
    'public.is_admin()', 'public.is_admin()');

  -- ---------- 5.4j order_items (Đợt 25) ----------
  -- Dòng tiền của đơn. Chủ đơn đọc dòng của mình; admin toàn quyền.
  -- Biểu thức chủ đơn sao ĐÚNG logic của `vcube_orders_owner_read`: khớp `user_id` HOẶC
  -- `customer_email` (đơn khách để `user_id` NULL). Khách tra cứu đơn vẫn đi qua RPC
  -- `get_order_by_guest_token` (SECURITY DEFINER) nên không cần policy cho anon.
  perform public._vcube_make_policy(
    'order_items', 'vcube_order_items_owner_read', 'select', array['authenticated'],
    $p$exists (
         select 1 from public.orders o
          where o.id = order_items.order_id
            and (o.user_id::text = (select auth.uid())::text
                 or o.customer_email = (select auth.jwt() ->> 'email'))
       )$p$, null);
  perform public._vcube_make_policy(
    'order_items', 'vcube_order_items_admin_all', 'all', array['authenticated'],
    'public.is_admin()', 'public.is_admin()');

  -- ---------- 5.4k workshop_commission_terms (Đợt 25) ----------
  -- CHỈ ADMIN. Bảng này chứa GIÁ ĐÀM PHÁN RIÊNG của từng đối tác ⇒ cố ý KHÔNG public-read,
  -- KHÔNG anon, KHÔNG chủ xưởng. Nó tồn tại ở bảng RIÊNG (không nằm trên `workshop_partners`)
  -- đúng vì `workshop_partners` là catalog công khai — xem mục 2e của file baseline.
  perform public._vcube_make_policy(
    'workshop_commission_terms', 'vcube_workshop_commission_terms_admin_all', 'all', array['authenticated'],
    'public.is_admin()', 'public.is_admin()');
  -- KHÔNG có policy INSERT/UPDATE/DELETE cho chủ đơn: đây là DÒNG TIỀN, chỉ service/admin
  -- được ghi. KHÔNG có policy nào cho anon.
  --
  -- LỰA CHỌN CÓ Ý THỨC — KHÔNG mở đường đọc cho xưởng in (dù spec cho phép cân nhắc):
  --   * RLS là mức DÒNG, không phải mức CỘT. Nếu cho xưởng đọc dòng của đơn được giao thì
  --     họ đọc được LUÔN `platform_fee_amount` = biên lợi nhuận của nền tảng trên chính đơn
  --     đó. Không có cách chặn cột bằng policy.
  --   * Xưởng KHÔNG cần bảng này để làm việc: mặt hàng của đơn đã nằm trong `orders.items`
  --     (jsonb) mà xưởng đọc được qua `vcube_orders_workshop_read` (mục 5b).
  --   * Nếu sau này UI xưởng cần "phần tiền của tôi": tạo VIEW `security_invoker` chỉ phơi
  --     các cột KHÔNG nhạy cảm (id, order_id, product_id, quantity, fulfillment) rồi cấp
  --     select theo `assigned_workshop_id` — việc riêng, cần chốt trước khi làm.

  -- ---------- 5.4l custom_design_requests (Đợt 30 — Studio Designer) ----------
  -- Yêu cầu CAD tuỳ chỉnh. Khách hàng đọc/nộp/sửa yêu cầu của mình.
  -- Designer và Admin được đọc và cập nhật tiến độ / trao đổi kỹ thuật / gửi báo giá.
  perform public._vcube_make_policy(
    'custom_design_requests', 'vcube_custom_design_requests_customer_select', 'select', array['authenticated'],
    'customer_id::text = (select auth.uid())::text', null);
  perform public._vcube_make_policy(
    'custom_design_requests', 'vcube_custom_design_requests_customer_insert', 'insert', array['authenticated'],
    null, 'customer_id::text = (select auth.uid())::text');
  perform public._vcube_make_policy(
    'custom_design_requests', 'vcube_custom_design_requests_customer_update', 'update', array['authenticated'],
    'customer_id::text = (select auth.uid())::text',
    'customer_id::text = (select auth.uid())::text');
  perform public._vcube_make_policy(
    'custom_design_requests', 'vcube_custom_design_requests_designer_select', 'select', array['authenticated'],
    $p$public.current_app_role() in ('designer','admin') or designer_id::text = (select auth.uid())::text$p$, null);
  perform public._vcube_make_policy(
    'custom_design_requests', 'vcube_custom_design_requests_designer_update', 'update', array['authenticated'],
    $p$public.current_app_role() in ('designer','admin') or designer_id::text = (select auth.uid())::text$p$,
    $p$public.current_app_role() in ('designer','admin') or designer_id::text = (select auth.uid())::text$p$);
  perform public._vcube_make_policy(
    'custom_design_requests', 'vcube_custom_design_requests_admin_all', 'all', array['authenticated'],
    'public.is_admin()', 'public.is_admin()');

  -- ---------- 5.5 xưởng in (role lab/workshop) quản lý tài sản của chính mình ----------
  -- workshop_machines / workshop_materials: chủ xưởng hoặc admin
  foreach t in array array['workshop_machines','workshop_materials'] loop
    if public._vcube_has_columns(t, array['workshop_id']) then
      perform public._vcube_make_policy(
        t, 'vcube_' || t || '_owner_all', 'all', array['authenticated'],
        'public.is_admin() or exists (select 1 from public.workshop_profiles wp
           where wp.id = ' || quote_ident(t) || '.workshop_id
             and wp.user_id::text = (select auth.uid())::text)',
        'public.is_admin() or exists (select 1 from public.workshop_profiles wp
           where wp.id = ' || quote_ident(t) || '.workshop_id
             and wp.user_id::text = (select auth.uid())::text)');
    else
      raise warning '% : thiếu cột workshop_id — chỉ admin quản lý được', t;
    end if;
  end loop;

  -- workshop_accessories: bản ghi riêng của xưởng (workshop_id khác null) mới cho xưởng sửa
  if public._vcube_has_columns('workshop_accessories', array['workshop_id']) then
    perform public._vcube_make_policy(
      'workshop_accessories', 'vcube_workshop_accessories_owner_all', 'all', array['authenticated'],
      'public.is_admin() or (workshop_id is not null and exists (
         select 1 from public.workshop_profiles wp
          where wp.id = workshop_accessories.workshop_id
            and wp.user_id::text = (select auth.uid())::text))',
      'public.is_admin() or (workshop_id is not null and exists (
         select 1 from public.workshop_profiles wp
          where wp.id = workshop_accessories.workshop_id
            and wp.user_id::text = (select auth.uid())::text))');
  end if;
end
$do$;

-- ==============================================================================
-- 5b. ORDERS — XƯỞNG IN ĐƯỢC GIAO ĐƠN (đọc + cập nhật tiến độ)
-- ==============================================================================
-- VÌ SAO CẦN: trước mục này, `orders` chỉ có 3 policy — chủ đơn đọc, admin toàn quyền,
-- guest insert. KHÔNG có policy nào cho vai `lab`/`workshop`, nên xưởng bấm "Nhận việc"
-- bị RLS chặn và hàng đợi việc không chạy được (W1b đã đo được trên DB thật).
--
-- VÌ SAO DDL THẲNG Ở ĐÂY, KHÔNG dùng `_vcube_make_policy` (mục 5): helper đó bắt MỌI lỗi
-- rồi chỉ `raise warning` ⇒ nếu biểu thức hỏng thì migration vẫn commit mà policy KHÔNG
-- được tạo, và tính năng chết ÂM THẦM (đúng lớp sự cố W1b vừa gặp). DDL thẳng làm
-- migration ABORT nếu sai — hỏng là biết ngay. (`drop policy if exists` giữ idempotent.)
--
-- ⚠️ `orders` chứa PII của khách (tên, SĐT, địa chỉ, `secure_access_token`). Policy đọc
-- dưới đây chỉ mở cho ĐÚNG xưởng được giao đơn đó (`assigned_workshop_id` = `partner_id`
-- của người gọi); khách và xưởng khác vẫn 0 dòng như trước. Xưởng nhìn thấy thông tin
-- liên hệ của đơn mình in là cần thiết để giao hàng — nhưng chỉ đơn được giao cho mình.
--
-- ⚠️ RLS là mức DÒNG, không phải mức CỘT: 2 policy này vẫn cho xưởng PATCH `total_amount`,
-- `payment_status`, `user_id`… của đơn được giao. Trigger ở mục 6c chặn phần đó.

drop policy if exists vcube_orders_workshop_read on public.orders;
create policy vcube_orders_workshop_read on public.orders
  for select to authenticated
  using (assigned_workshop_id is not null
         and assigned_workshop_id = public.current_workshop_partner_id());

drop policy if exists vcube_orders_workshop_update_progress on public.orders;
create policy vcube_orders_workshop_update_progress on public.orders
  for update to authenticated
  using (assigned_workshop_id is not null
         and assigned_workshop_id = public.current_workshop_partner_id())
  with check (assigned_workshop_id = public.current_workshop_partner_id());
-- ==============================================================================
-- 6. CHỐNG TỰ NÂNG QUYỀN: chặn đổi các cột đặc quyền trong user_profiles
-- ==============================================================================
-- Policy UPDATE ở trên cho phép người dùng sửa profile của mình; trigger này chặn
-- việc tự đổi role / kyc_status / account_status / total_* (chỉ admin hoặc
-- service_role được đổi).
create or replace function public.fn_protect_profile_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if public.is_admin() then
    return new;
  end if;
  if new.role is distinct from old.role
     or new.kyc_status is distinct from old.kyc_status
     or (to_jsonb(new) ? 'account_status' and to_jsonb(new)->>'account_status'
          is distinct from to_jsonb(old)->>'account_status')
     or (to_jsonb(new) ? 'total_orders' and to_jsonb(new)->>'total_orders'
          is distinct from to_jsonb(old)->>'total_orders')
     or (to_jsonb(new) ? 'total_spent' and to_jsonb(new)->>'total_spent'
          is distinct from to_jsonb(old)->>'total_spent') then
    raise exception 'VCUBE: không được tự thay đổi role/kyc_status/account_status/total_* (RLS hardening 20261010)'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end
$fn$;

do $do$
begin
  if to_regclass('public.user_profiles') is not null then
    execute 'drop trigger if exists trg_protect_profile_privileged_columns on public.user_profiles';
    execute 'create trigger trg_protect_profile_privileged_columns
               before update on public.user_profiles
               for each row execute function public.fn_protect_profile_privileged_columns()';
    raise notice 'OK    trigger chống nâng quyền trên public.user_profiles';
  end if;
end
$do$;

-- ==============================================================================
-- 6b. TỰ ĐỘNG TẠO PROFILE KHI CÓ USER MỚI
-- ==============================================================================
-- Vì sao cần: client hiện KHÔNG ghi vào public.user_profiles cho người dùng thật
-- (AuthContext chỉ dựng profile trong bộ nhớ từ auth metadata). Nếu bảng không có
-- dòng tương ứng thì public.is_admin() luôn false ⇒ không ai quản trị được.
-- Trigger này bảo đảm mỗi user mới luôn có một dòng profile role='customer'.
do $do$
declare
  v_cols text := 'id, email, role';
  v_vals text := 'new.id::text, coalesce(new.email, ''''), ''customer''';
begin
  if to_regclass('public.user_profiles') is null then
    raise warning 'Bỏ qua trigger tạo profile: public.user_profiles không tồn tại';
    return;
  end if;

  if exists (select 1 from information_schema.columns
              where table_schema='public' and table_name='user_profiles' and column_name='display_name') then
    v_cols := v_cols || ', display_name';
    v_vals := v_vals || ', coalesce(new.raw_user_meta_data->>''full_name'', split_part(coalesce(new.email, ''user''), ''@'', 1))';
  end if;

  execute format($fn$
    create or replace function public.fn_create_profile_for_new_user()
    returns trigger
    language plpgsql
    security definer
    set search_path = public
    as $body$
    begin
      begin
        insert into public.user_profiles (%s) values (%s)
        on conflict (id) do nothing;
      exception when others then
        null;  -- không được chặn việc tạo tài khoản vì lỗi profile
      end;
      return new;
    end
    $body$;
  $fn$, v_cols, v_vals);

  begin
    execute 'drop trigger if exists trg_create_profile_for_new_user on auth.users';
    execute 'create trigger trg_create_profile_for_new_user
               after insert on auth.users
               for each row execute function public.fn_create_profile_for_new_user()';
    raise notice 'OK    trigger tạo profile tự động trên auth.users';
  exception when others then
    raise warning 'Không tạo được trigger trên auth.users (%): hãy chạy bootstrap_admin.sql cho từng tài khoản', sqlerrm;
  end;
end
$do$;

-- ==============================================================================
-- 6c. CHỐNG XƯỞNG IN SỬA CỘT ĐẶC QUYỀN CỦA ĐƠN (RLS không giới hạn được cột)
-- ==============================================================================
-- VÌ SAO BẮT BUỘC: policy `vcube_orders_workshop_update_progress` (mục 5b) chỉ kiểm tra
-- DÒNG. Không có trigger này, xưởng được giao đơn có thể PATCH `total_amount`,
-- `shipping_fee`, `payment_status`, `items`, `user_id`, `customer_email`,
-- `assigned_workshop_id`… của đơn mình — đó là lỗ hổng TIỀN và ĐỊNH DANH, không phải
-- chuyện nhỏ. Cùng khuôn với `fn_protect_profile_privileged_columns` (mục 6) — hàm đó
-- chặn người dùng tự đổi `role`/`kyc_status`/`total_*` của chính mình.
--
-- LUẬT:
--   * admin (`public.is_admin()`) ⇒ đi qua.
--   * người gọi LÀ xưởng được giao chính đơn này (`old.assigned_workshop_id` =
--     `current_workshop_partner_id()`) ⇒ CHỈ được đổi 4 cột:
--         status, status_stage_index, layer_progress, updated_at
--     đổi bất kỳ cột nào khác ⇒ `raise exception` 42501 nêu rõ tên cột bị chặn.
--   * MỌI trường hợp khác (khách, xưởng khác, service_role, SQL tay không có auth.uid())
--     ⇒ `return new`, để RLS quyết định — trigger KHÔNG tự chặn ai ở đây.
--
-- So sánh bằng `to_jsonb(new) - <cột được phép>` nên KHÔNG phải bảo trì danh sách: nếu
-- `orders` thêm cột mới, cột đó TỰ ĐỘNG thuộc nhóm bị chặn (fail-closed, không fail-open).
create or replace function public.fn_protect_order_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_allowed text[] := array['status','status_stage_index','layer_progress','updated_at'];
  v_partner text;
  v_new     jsonb;
  v_old     jsonb;
  v_changed text;
begin
  if public.is_admin() then
    return new;
  end if;

  v_partner := public.current_workshop_partner_id();

  -- Chỉ áp cho xưởng đang được giao ĐÚNG đơn này; các trường hợp khác để RLS quyết định.
  if v_partner is null
     or old.assigned_workshop_id is null
     or old.assigned_workshop_id <> v_partner then
    return new;
  end if;

  v_new := to_jsonb(new) - v_allowed;
  v_old := to_jsonb(old) - v_allowed;

  if v_new is distinct from v_old then
    select string_agg(k, ', ' order by k)
      into v_changed
      from jsonb_object_keys(v_new) k
     where v_new -> k is distinct from v_old -> k;

    raise exception 'VCUBE: xưởng in chỉ được đổi status/status_stage_index/layer_progress/updated_at của đơn được giao (bị chặn: %)',
      coalesce(v_changed, '?')
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end
$fn$;

do $do$
begin
  if to_regclass('public.orders') is not null then
    execute 'drop trigger if exists trg_protect_order_privileged_columns on public.orders';
    execute 'create trigger trg_protect_order_privileged_columns
               before update on public.orders
               for each row execute function public.fn_protect_order_privileged_columns()';
    raise notice 'OK    trigger chống xưởng sửa cột đặc quyền trên public.orders';
  else
    raise warning 'Bỏ qua trigger chống sửa cột đặc quyền: public.orders không tồn tại';
  end if;
end
$do$;

-- ==============================================================================
-- 6d. CHỐNG CHỦ XƯỞNG TỰ ĐỔI partner_id / verified_status (RLS không giới hạn cột)
-- ==============================================================================
-- VÌ SAO BẮT BUỘC: `vcube_workshop_profiles_owner_update` cho chủ sở hữu UPDATE **mọi cột**
-- (RLS là mức DÒNG, không phải mức CỘT). Mà `public.current_workshop_partner_id()` đọc
-- CHÍNH `partner_id` để cấp quyền đọc/cập nhật `orders` (policy mục 5b + trigger mục 6c).
-- ⇒ Không có trigger này, chủ xưởng chỉ cần:
--        update public.workshop_profiles set partner_id = '<mã của xưởng khác>'
--         where user_id = auth.uid();
--   là đọc và sửa được ĐƠN CỦA XƯỞNG ĐÓ ⇒ LEO THANG ĐẶC QUYỀN. Tương tự, tự đặt
--   `verified_status = 'Verified'` là tự xác minh mình (hồ sơ Verified được đọc công khai).
--   Policy INSERT ở mục 5.4 chỉ đóng đường INSERT ⇒ phải chặn thêm đường UPDATE.
--
-- KHÁC `orders` (mục 6c) — ĐỌC KỸ: ở `orders` ý đồ là ALLOW-LIST ("mọi cột khác đều đặc
-- quyền") nên dùng `to_jsonb(new) - v_allowed` để fail-closed với cột thêm sau này. Ở đây
-- ý đồ NGƯỢC LẠI: DENY-LIST đúng 2 cột — `workshop_name`, `address`, `region`, `contact_*`,
-- `electricity_rate_override`, `labor_rate_override` PHẢI tiếp tục sửa được, và cột thêm
-- sau này mặc định sửa được. Nên so sánh TƯỜNG MINH 2 cột, KHÔNG dùng khuôn `to_jsonb`.
--
-- 5 NHÁNH (thứ tự có lý do, không được bỏ nhánh nào):
--   1. `public.is_admin()` ⇒ đi qua (đây là đường admin gán partner_id / duyệt hồ sơ).
--   2. lấy `v_uid := (select auth.uid())`.
--   3. `v_uid is null` ⇒ đi qua. ⚠️ BẮT BUỘC: `auth.uid()` NULL khi gọi bằng secret key /
--      SQL Editor / service_role; thiếu nhánh này là CHẶN CẢ ĐƯỜNG QUẢN TRỊ HỢP LỆ.
--   4. `old.user_id is distinct from v_uid` ⇒ đi qua (chỉ áp cho CHÍNH chủ hàng; người khác
--      để RLS quyết định — không tự chặn ở tầng trigger).
--   5. còn lại = chủ sở hữu, không phải admin ⇒ nếu 1 trong 2 cột ĐỔI GIÁ TRỊ thì raise 42501
--      và nêu rõ tên cột. Giá trị KHÔNG đổi thì `is distinct from` = false ⇒ KHÔNG báo lỗi
--      (đây là điều kiện để upsert/ghi lại hồ sơ hiện tại vẫn chạy được).
--
-- CHỈ `before update`: đường INSERT đã bị policy `vcube_workshop_profiles_owner_insert`
-- (mục 5.4) khoá bằng `partner_id is null and verified_status = 'Pending'`, còn admin/service
--_role thì đi đường riêng. Thêm `before insert` sẽ phải thêm nhánh TG_OP mà không tăng bảo vệ.
create or replace function public.fn_protect_workshop_profile_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_uid     uuid;
  v_partner boolean;
  v_verify  boolean;
begin
  if public.is_admin() then
    return new;
  end if;

  v_uid := (select auth.uid());

  if v_uid is null then
    return new;
  end if;

  if old.user_id is distinct from v_uid then
    return new;
  end if;

  v_partner := new.partner_id      is distinct from old.partner_id;
  v_verify  := new.verified_status is distinct from old.verified_status;

  if v_partner or v_verify then
    raise exception 'VCUBE: chủ xưởng không được tự đổi % của hồ sơ xưởng (chỉ quản trị viên). Tên/địa chỉ/khu vực/liên hệ/đơn giá thì sửa được.',
      concat_ws(', ',
        case when v_partner then 'partner_id' end,
        case when v_verify  then 'verified_status' end)
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end
$fn$;

do $do$
begin
  if to_regclass('public.workshop_profiles') is not null then
    execute 'drop trigger if exists trg_protect_workshop_profile_privileged_columns on public.workshop_profiles';
    execute 'create trigger trg_protect_workshop_profile_privileged_columns
               before update on public.workshop_profiles
               for each row execute function public.fn_protect_workshop_profile_privileged_columns()';
    raise notice 'OK    trigger chống chủ xưởng tự đổi partner_id/verified_status';
  else
    raise warning 'Bỏ qua trigger workshop_profiles: bảng không tồn tại';
  end if;
end
$do$;
-- ==============================================================================
-- 7. VIEW pricing_config: view bỏ qua RLS ⇒ bắt buộc security_invoker
-- ==============================================================================
do $do$
declare
  v_relkind "char";
begin
  select c.relkind into v_relkind
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relname = 'pricing_config';

  if v_relkind = 'v' then
    begin
      execute 'alter view public.pricing_config set (security_invoker = true)';
      raise notice 'OK    pricing_config là VIEW → đã bật security_invoker';
    exception when others then
      raise warning 'Không bật được security_invoker cho view pricing_config: %', sqlerrm;
    end;
  elsif v_relkind = 'r' then
    raise notice 'INFO  pricing_config là TABLE (không phải view) → đã siết policy ở bước 5';
  else
    raise notice 'INFO  pricing_config không tồn tại';
  end if;
end
$do$;

-- ==============================================================================
-- 8. STORAGE POLICIES
-- ==============================================================================
do $do$
declare
  rec record;
  v_ok text[] := array[
    'vcube_product_images_public_read',
    'vcube_product_images_admin_write',
    'vcube_cad_files_admin_all',
    'vcube_cad_files_buyer_read',
    'vcube_cad_files_order_files_read',
    'vcube_cad_files_digital_owner_rw'
  ];
begin
  if to_regclass('storage.objects') is null then
    raise notice 'SKIP  storage.objects không tồn tại (bỏ qua bước 8)';
    return;
  end if;

  -- 8.1 xoá policy cũ của repo
  for rec in
    select policyname from pg_policies
     where schemaname = 'storage' and tablename = 'objects'
       and policyname in ('Public product-images read','Admin product-images write','Admin cad-files write')
  loop
    execute format('drop policy if exists %I on storage.objects', rec.policyname);
  end loop;

  -- 8.2 dọn policy lạ còn sót trên 2 bucket này
  for rec in
    select policyname from pg_policies
     where schemaname = 'storage' and tablename = 'objects'
       and (coalesce(qual, '') like '%product-images%' or coalesce(with_check, '') like '%product-images%'
            or coalesce(qual, '') like '%cad-files%' or coalesce(with_check, '') like '%cad-files%')
       and policyname <> all (v_ok)
  loop
    execute format('drop policy if exists %I on storage.objects', rec.policyname);
    raise notice 'DROPPED policy storage lạ: %', rec.policyname;
  end loop;

  -- 8.3 tạo policy đúng
  execute 'drop policy if exists vcube_product_images_public_read on storage.objects';
  execute $pol$create policy vcube_product_images_public_read on storage.objects
             for select to anon, authenticated
             using (bucket_id = 'product-images')$pol$;

  execute 'drop policy if exists vcube_product_images_admin_write on storage.objects';
  execute $pol$create policy vcube_product_images_admin_write on storage.objects
             for all to authenticated
             using (bucket_id = 'product-images' and public.is_admin())
             with check (bucket_id = 'product-images' and public.is_admin())$pol$;

  execute 'drop policy if exists vcube_cad_files_admin_all on storage.objects';
  execute $pol$create policy vcube_cad_files_admin_all on storage.objects
             for all to authenticated
             using (bucket_id = 'cad-files' and public.is_admin())
             with check (bucket_id = 'cad-files' and public.is_admin())$pol$;

  -- cad-files (1/2): đường CHÍNH XÁC — file có trong bảng order_files thuộc đơn của
  -- người mua (hoặc admin/lab). Đây là thứ mở khoá DoD #19 cùng createSignedUrl.
  if to_regclass('public.order_files') is not null
     and public._vcube_has_columns('order_files', array['order_id','storage_path']) then
    execute 'drop policy if exists vcube_cad_files_order_files_read on storage.objects';
    execute $pol$create policy vcube_cad_files_order_files_read on storage.objects
               for select to authenticated
               using (
                 bucket_id = 'cad-files'
                 and exists (
                   select 1 from public.order_files of
                     join public.orders o on o.id = of.order_id
                    where of.storage_path = storage.objects.name
                      and (o.user_id::text = (select auth.uid())::text
                           or public.is_admin_or_lab())
                 )
               )$pol$;
    raise notice 'OK    cad-files: policy nguoi mua theo public.order_files (chinh xac)';
  else
    raise warning 'cad-files: chua co public.order_files — chi con policy heuristic orders.items';
  end if;

  -- cad-files (2/2): đường LUI cho đơn đã mua trước khi bảng order_files tồn tại.
  -- LƯU Ý: đây là heuristic dựa trên orders.items (JSONB, chứa đường dẫn/tên file).
  if to_regclass('public.orders') is not null
     and public._vcube_has_columns('orders', array['user_id','items']) then
    execute 'drop policy if exists vcube_cad_files_buyer_read on storage.objects';
    execute $pol$create policy vcube_cad_files_buyer_read on storage.objects
               for select to authenticated
               using (
                 bucket_id = 'cad-files'
                 and exists (
                   select 1 from public.orders o
                    where o.user_id::text = (select auth.uid())::text
                      and o.items::text like '%' || storage.objects.name || '%'
                 )
               )$pol$;
    raise notice 'OK    cad-files: policy đọc cho người mua (heuristic orders.items)';
  else
    raise warning 'cad-files: chưa tạo được policy người mua (thiếu orders.user_id/items). Dùng signed URL.';
  end if;
  -- cad-files (3/3): DESIGNER tự quản file số của mình — quy ước digital/<auth.uid()>/...
  -- ĐÂY LÀ ĐIỀU KIỆN SỐNG CÒN của mục 1a (bán file số): bucket cad-files là PRIVATE và trước
  -- policy này chỉ có admin + người mua, nên designer KHÔNG upload/tải được file của chính
  -- mình ⇒ tính năng lõi của chợ 3 bên không chạy được.
  -- Phạm vi hẹp có chủ ý: chỉ đúng thư mục cấp 1 = 'digital' và cấp 2 = uid của người gọi,
  -- nên designer A KHÔNG chạm được file của designer B, và không chạm được file CAD của đơn
  -- (những file đó nằm ngoài digital/<uid>/). Khách vẫn không có quyền gì trên bucket này.
  execute 'drop policy if exists vcube_cad_files_digital_owner_rw on storage.objects';
  execute $pol$create policy vcube_cad_files_digital_owner_rw on storage.objects
             for all to authenticated
             using (bucket_id = 'cad-files'
                    and (storage.foldername(name))[1] = 'digital'
                    and (storage.foldername(name))[2] = (select auth.uid())::text)
             with check (bucket_id = 'cad-files'
                    and (storage.foldername(name))[1] = 'digital'
                    and (storage.foldername(name))[2] = (select auth.uid())::text)$pol$;
  raise notice 'OK    cad-files: designer tự quản file số trong digital/<uid>/';
end
$do$;

-- ==============================================================================
-- 9. DỌN POLICY LẠ CÒN SÓT LẠI (allowlist)
-- ==============================================================================
do $do$
declare
  rec record;
  v_keep text[] := array[
    'vcube_products_public_read','vcube_products_admin_all',
    'vcube_orders_owner_read','vcube_orders_admin_all','vcube_orders_guest_insert',
    -- Đợt 10 (W2b): xưởng in được giao đơn — đọc + cập nhật tiến độ (mục 5b)
    'vcube_orders_workshop_read','vcube_orders_workshop_update_progress',
    'vcube_profiles_self_read','vcube_profiles_self_update','vcube_profiles_admin_all',
    'vcube_materials_public_read','vcube_materials_admin_write',
    'vcube_printer_fleet_public_read','vcube_printer_fleet_admin_write',
    'vcube_accessories_public_read','vcube_accessories_admin_write',
    'vcube_workshop_partners_public_read','vcube_workshop_partners_admin_write',
    'vcube_site_content_public_read','vcube_site_content_admin_write',
    'vcube_pricing_configs_public_read','vcube_pricing_configs_admin_write',
    'vcube_workshop_machines_public_read','vcube_workshop_machines_admin_write',
    'vcube_workshop_materials_public_read','vcube_workshop_materials_admin_write',
    'vcube_designer_profiles_public_read','vcube_designer_profiles_admin_write',
    'vcube_designer_profiles_owner_all','vcube_designer_profiles_admin_all',
    'vcube_pricing_global_settings_public_read','vcube_pricing_global_settings_admin_write',
    'vcube_workshop_accessories_public_read','vcube_workshop_accessories_admin_write',
    'vcube_workshop_profiles_public_read','vcube_workshop_profiles_owner_read',
    'vcube_workshop_profiles_owner_update','vcube_workshop_profiles_owner_insert',
    'vcube_workshop_profiles_admin_all',
    'vcube_customer_profiles_owner_all','vcube_customer_profiles_admin_all',
    'vcube_inventory_logs_owner_read','vcube_inventory_logs_owner_insert',
    'vcube_inventory_logs_admin_all',
    'vcube_payment_transactions_admin_all','vcube_cost_rules_admin_all',
    'vcube_pricing_config_public_read','vcube_pricing_config_admin_write',
    'vcube_workshop_machines_owner_all','vcube_workshop_materials_owner_all',
    'vcube_workshop_accessories_owner_all',
    -- app_settings / setting_audit / warranty_claims / order_files (2026-09)
    'vcube_app_settings_public_read','vcube_app_settings_admin_insert',
    'vcube_app_settings_admin_update',
    'vcube_setting_audit_admin_read','vcube_setting_audit_admin_insert',
    'vcube_warranty_claims_customer_read','vcube_warranty_claims_customer_insert',
    'vcube_warranty_claims_staff_read','vcube_warranty_claims_staff_update',
    'vcube_order_files_buyer_read','vcube_order_files_staff_insert',
    'vcube_order_files_staff_update','vcube_order_files_admin_delete',
    -- Đợt 10 (W2): reviews / digital_assets / cart_items
    'vcube_reviews_public_read','vcube_reviews_author_read','vcube_reviews_author_insert',
    'vcube_reviews_author_update','vcube_reviews_author_delete','vcube_reviews_admin_all',
    'vcube_digital_assets_designer_all','vcube_digital_assets_admin_all',
    'vcube_cart_items_owner_all','vcube_cart_items_admin_read',
    -- Đợt 10 (W5): quotes + kyc_records (RLS bật nhưng 0 policy ⇒ deny-all)
    'vcube_quotes_owner_read','vcube_quotes_owner_insert','vcube_quotes_owner_update',
    'vcube_quotes_admin_all',
    -- Đợt 25: dòng tiền của đơn
    'vcube_order_items_owner_read','vcube_order_items_admin_all',
    'vcube_workshop_commission_terms_admin_all',
    'vcube_kyc_owner_read','vcube_kyc_owner_insert','vcube_kyc_admin_all',
    -- Đợt 30: custom_design_requests (Studio Designer)
    'vcube_custom_design_requests_customer_select',
    'vcube_custom_design_requests_customer_insert',
    'vcube_custom_design_requests_customer_update',
    'vcube_custom_design_requests_designer_select',
    'vcube_custom_design_requests_designer_update',
    'vcube_custom_design_requests_admin_all'
  ];
  v_tables text[] := array[
    'products','orders','user_profiles','materials','printer_fleet','pricing_config',
    'pricing_configs','cost_rules','site_content','accessories','workshop_partners',
    'payment_transactions','workshop_profiles','workshop_machines','workshop_materials',
    'material_inventory_logs','designer_profiles','customer_profiles',
    'pricing_global_settings','workshop_accessories',
    'app_settings','setting_audit','warranty_claims','order_files','reviews','digital_assets','cart_items','quotes','kyc_records','order_items','workshop_commission_terms',
    'custom_design_requests'
  ];
begin
  for rec in
    select p.tablename, p.policyname from pg_policies p
     where p.schemaname = 'public'
       and p.tablename = any (v_tables)
       and p.policyname <> all (v_keep)
  loop
    execute format('drop policy if exists %I on public.%I', rec.policyname, rec.tablename);
    raise notice 'DROPPED policy lạ: % trên public.%', rec.policyname, rec.tablename;
  end loop;
end
$do$;

-- ==============================================================================
-- 10. XOÁ HELPER TẠM
-- ==============================================================================
drop function if exists public._vcube_make_policy(text, text, text, text[], text, text);
drop function if exists public._vcube_has_columns(text, text[]);

-- ==============================================================================
-- 11. KIỂM TRA SAU KHI CHẠY
-- ==============================================================================
do $do$
declare
  rec record;
  v_bad int := 0;
begin
  raise notice '──────── KIỂM TRA SAU HARDENING ────────';


  -- Policy còn để lọt: dùng qual/with_check = 'true' trên bảng nhạy cảm
  for rec in
    select tablename, policyname, cmd, coalesce(qual,'') as q, coalesce(with_check,'') as w
      from pg_policies
     where schemaname = 'public'
       and tablename in ('orders','user_profiles','payment_transactions','products','cost_rules')
       and (btrim(coalesce(qual,'')) = 'true' or btrim(coalesce(with_check,'')) = 'true')
       and cmd <> 'INSERT'          -- INSERT WITH CHECK(true) chỉ còn ở nơi được kiểm soát
  loop
    v_bad := v_bad + 1;
    raise warning 'CÒN POLICY HỞ: %.% (cmd=%) — qual=%, check=%',
      rec.tablename, rec.policyname, rec.cmd, rec.q, rec.w;
  end loop;

  if v_bad = 0 then
    raise notice 'OK: không còn policy permissive trên các bảng nhạy cảm.';
  end if;

  raise notice 'Nhắc lại: chạy supabase/scripts/bootstrap_admin.sql để cấp quyền admin,';
  raise notice 'sau đó kiểm chứng bằng: node scripts/verify-rls.mjs';
end
$do$;

commit;






-- ##############################################################################
-- PHẦN 4/4 — supabase/scripts/bootstrap_admin.sql
-- CẤP QUYỀN ADMIN — SỬA `v_email` thành email thật trước khi chạy, nếu không script sẽ raise exception.
-- ##############################################################################

-- ==============================================================================
-- VCUBE — CẤP QUYỀN ADMIN (chạy MỘT LẦN sau migration 20261010_harden_rls.sql)
-- ==============================================================================
-- Sau khi hardening, quyền admin KHÔNG còn đọc từ user_metadata hay email hardcode
-- trong policy. Nguồn duy nhất là public.user_profiles.role = 'admin'.
-- Vì vậy cần chạy script này để cấp quyền cho tài khoản của bạn, nếu không sẽ
-- không ai ghi được dữ liệu (kể cả trang /admin).
--
-- CÁCH DÙNG
--   1. `v_email` đã đặt sẵn = email admin của dự án. Đổi nếu cấp admin cho người khác.
--      Guard dùng sentinel '__CHANGE_ME__' (KHÔNG chứa '@') nên tìm-thay-thế theo email
--      sẽ KHÔNG phá được guard — bài học từ lần replace hỏng.
--   2. Chạy trong Supabase SQL Editor.
--   3. Kiểm chứng: node scripts/verify-rls.mjs  và mở /admin sau khi đăng nhập lại.
--
-- Muốn xem danh sách tài khoản hiện có trước khi chạy? Xem cuối file.
-- ==============================================================================

do $do$
declare
  v_email     text := 'chithanhso10@gmail.com';   -- ← SỬA DÒNG NÀY
  v_uid       uuid;
  v_id_type   text;
  v_has_dname boolean;
  v_sql       text;
begin
  if lower(v_email) = '__change_me__' then
    raise exception 'Hãy sửa v_email thành email thật của bạn trước khi chạy.';
  end if;

  select u.id into v_uid
    from auth.users u
   where lower(u.email) = lower(v_email)
   limit 1;

  if v_uid is null then
    raise exception 'Không tìm thấy tài khoản auth.users với email %  (kiểm tra danh sách ở cuối file)', v_email;
  end if;

  if to_regclass('public.user_profiles') is null then
    raise exception 'public.user_profiles không tồn tại — chạy migration tạo schema trước.';
  end if;

  select c.data_type into v_id_type
    from information_schema.columns c
   where c.table_schema = 'public' and c.table_name = 'user_profiles' and c.column_name = 'id';

  select exists (
    select 1 from information_schema.columns c
     where c.table_schema = 'public' and c.table_name = 'user_profiles'
       and c.column_name = 'display_name'
  ) into v_has_dname;

  -- id có thể là TEXT (bản migration 20260904_complete) hoặc UUID (bản master)
  if v_id_type = 'uuid' then
    v_sql := 'insert into public.user_profiles (id, email, role';
    if v_has_dname then v_sql := v_sql || ', display_name'; end if;
    v_sql := v_sql || ') values ($1, $2, ''admin''';
    if v_has_dname then v_sql := v_sql || ', $3'; end if;
    v_sql := v_sql || ') on conflict (id) do update set role = ''admin''';
  else
    v_sql := 'insert into public.user_profiles (id, email, role';
    if v_has_dname then v_sql := v_sql || ', display_name'; end if;
    v_sql := v_sql || ') values ($1::text, $2, ''admin''';
    if v_has_dname then v_sql := v_sql || ', $3'; end if;
    v_sql := v_sql || ') on conflict (id) do update set role = ''admin''';
  end if;

  if v_has_dname then
    execute v_sql using v_uid, lower(v_email), split_part(v_email, '@', 1);
  else
    execute v_sql using v_uid, lower(v_email);
  end if;

  raise notice 'OK: đã cấp role=admin cho % (uid %)', lower(v_email), v_uid;
end
$do$;

-- Kiểm tra kết quả
select id, email, role, kyc_status
  from public.user_profiles
 where role = 'admin';

-- ==============================================================================
-- Xem danh sách tài khoản đang có (bỏ comment để chạy)
-- ==============================================================================
-- select u.id, u.email, u.created_at,
--        coalesce(p.role, '(chưa có profile)') as role
--   from auth.users u
--   left join public.user_profiles p on p.id::text = u.id::text
--  order by u.created_at;

-- ==============================================================================
-- Thu hồi quyền admin (bỏ comment + sửa email nếu cần)
-- ==============================================================================
-- update public.user_profiles set role = 'customer'
--  where lower(email) = lower('email-can-thu-hoi@example.com');

-- ##############################################################################
-- PHẦN 5 — KIỂM CHỨNG SAU KHI CHẠY (chỉ đọc, không thay đổi gì)
-- ##############################################################################
-- Mỗi truy vấn in ra cột `ket_qua` = 'OK' hoặc 'THIEU'/'SAI'. Không có dòng 'SAI'/'THIEU'
-- nghĩa là migration đã áp đủ. Script này CHỈ ĐỌC: chỉ select trên catalog + đếm.
-- ⚠️ Các con số "kỳ vọng" bên dưới được TÍNH ĐỘNG lúc sinh file (đếm lệnh create table
-- if not exists trong 20260901 + đọc allowlist v_keep/v_ok của 20261010), KHÔNG hardcode:
-- tại thời điểm Đợt 10 (W2) là 31 bảng · 90 policy bảng ·
-- 6 policy storage. Nếu số khi bạn dán KHÁC "kỳ vọng" ở đây thì
-- migration CHƯA được áp đủ (hoặc còn policy lạ), KHÔNG phải lỗi của file này.

-- 5.1 — Tổng số bảng thật trong schema public (kỳ vọng 31)
select count(*) as so_bang_public
  from information_schema.tables
 where table_schema = 'public' and table_type = 'BASE TABLE';

-- 5.2 — 4 bảng mới của đợt này (phải có đủ, không dòng nào thiếu)
select t.expected as bang, (c.relname is not null) as da_tao
  from (values ('app_settings'), ('setting_audit'), ('warranty_claims'), ('order_files')) as t(expected)
  left join pg_class c on c.relname = t.expected and c.relnamespace = 'public'::regnamespace
 order by t.expected;

-- 5.3 — (a) LỖI 1 đã sửa: cột site_content.settings phải TỒN TẠI
select 'site_content.settings' as muc,
       case when count(*) = 1 then 'OK' else 'THIEU' end as ket_qua,
       coalesce(max(data_type), '—') as kieu_du_lieu,
       coalesce(max(is_nullable), '—') as cho_phep_null
  from information_schema.columns
 where table_schema = 'public' and table_name = 'site_content' and column_name = 'settings';

-- 5.4 — (b) LỖI 2a đã sửa: 3 cột nghiệp vụ KHÔNG còn DEFAULT
select column_name as cot,
       case when column_default is null then 'OK' else 'SAI — con default: ' || column_default end as ket_qua
  from information_schema.columns
 where table_schema = 'public' and table_name = 'pricing_global_settings'
   and column_name in ('electricity_rate_vnd', 'labor_hourly_rate_vnd', 'vat_percent')
 order by column_name;

-- 5.5 — (b) LỖI 2b đã sửa: 2 CHECK constraint phải TỒN TẠI
select t.expected as constraint_mong_doi,
       case when c.conname is not null then 'OK' else 'THIEU' end as ket_qua
  from (values ('pricing_global_settings_vat_range_chk'),
               ('pricing_global_settings_rates_nonneg_chk')) as t(expected)
  left join pg_constraint c
         on c.conname = t.expected and c.conrelid = 'public.pricing_global_settings'::regclass
 order by t.expected;

-- 5.6 — (b) LỖI 2c đã sửa: 3 cột phải NULL (chưa cấu hình), KHÔNG được là 2850/65000/8
select 2850  as gia_tri_seed_cu, electricity_rate_vnd  as gia_tri_hien_tai,
       case when electricity_rate_vnd  is null then 'OK' else 'KIEM TRA — admin da nhap?' end as ket_qua
  from public.pricing_global_settings where id = 'global'
union all
select 65000, labor_hourly_rate_vnd,
       case when labor_hourly_rate_vnd is null then 'OK' else 'KIEM TRA — admin da nhap?' end
  from public.pricing_global_settings where id = 'global'
union all
select 8, vat_percent,
       case when vat_percent is null then 'OK' else 'KIEM TRA — admin da nhap?' end
  from public.pricing_global_settings where id = 'global';

-- 5.7 — Bảng nào CHƯA bật RLS (phải trả về 0 dòng)
select c.relname as bang_chua_bat_rls
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;

-- 5.8 — Số policy đang có (kỳ vọng 90 policy bảng + 6 policy storage)
select count(*) as so_policy_bang from pg_policies where schemaname = 'public';
select count(*) as so_policy_storage from pg_policies where schemaname = 'storage';

-- 5.9 — 13 policy MỚI của đợt này phải có đủ
select t.expected as policy, case when p.policyname is not null then 'OK' else 'THIEU' end as ket_qua
  from (values ('vcube_app_settings_public_read'), ('vcube_app_settings_admin_insert'),
               ('vcube_app_settings_admin_update'), ('vcube_setting_audit_admin_read'),
               ('vcube_setting_audit_admin_insert'), ('vcube_warranty_claims_customer_read'),
               ('vcube_warranty_claims_customer_insert'), ('vcube_warranty_claims_staff_read'),
               ('vcube_warranty_claims_staff_update'), ('vcube_order_files_buyer_read'),
               ('vcube_order_files_staff_insert'), ('vcube_order_files_staff_update'),
               ('vcube_order_files_admin_delete')) as t(expected)
  left join pg_policies p on p.schemaname = 'public' and p.policyname = t.expected
 order by t.expected;

-- 5.10 — Policy storage mới (đọc cad-files qua order_files)
select 'vcube_cad_files_order_files_read' as policy,
       case when count(*) = 1 then 'OK' else 'THIEU' end as ket_qua
  from pg_policies
 where schemaname = 'storage' and policyname = 'vcube_cad_files_order_files_read';

-- 5.11 — Realtime: 3 bảng mới phải nằm trong publication
select t.expected as bang, case when pt.tablename is not null then 'OK' else 'THIEU' end as ket_qua
  from (values ('app_settings'), ('pricing_global_settings'), ('order_files')) as t(expected)
  left join pg_publication_tables pt
         on pt.pubname = 'supabase_realtime' and pt.schemaname = 'public' and pt.tablename = t.expected
 order by t.expected;

-- 5.12 — app_settings phải có ĐÚNG 1 hàng và tax_code phải là NULL (chưa cấu hình)
select count(*) as so_hang_app_settings,
       count(tax_code) as so_hang_co_ma_so_thue
  from public.app_settings;

-- 5.13 — Ai đang là admin
select id, email, role from public.user_profiles where role = 'admin';

-- 5.14 — Policy của Đợt 10/Đợt 25 phải có đủ (xưởng in · workshop_profiles · quotes/kyc · order_items)
select t.expected as policy, case when p.policyname is not null then 'OK' else 'THIEU' end as ket_qua
  from (values ('vcube_orders_workshop_read'),
               ('vcube_orders_workshop_update_progress'),
               ('vcube_workshop_profiles_owner_insert'),
               ('vcube_quotes_owner_read'),
               ('vcube_quotes_owner_insert'),
               ('vcube_quotes_owner_update'),
               ('vcube_quotes_admin_all'),
               ('vcube_kyc_owner_read'),
               ('vcube_kyc_owner_insert'),
               ('vcube_kyc_admin_all'),
               ('vcube_order_items_owner_read'),
               ('vcube_order_items_admin_all')) as t(expected)
  left join pg_policies p on p.schemaname = 'public' and p.policyname = t.expected
 order by t.expected;

-- 5.15 — Trigger phải có đủ (2 trigger chống sửa cột đặc quyền + các trigger cũ)
select t.expected as trigger, case when tg.tgname is not null then 'OK' else 'THIEU' end as ket_qua
  from (values ('trg_protect_order_privileged_columns'),
               ('trg_protect_workshop_profile_privileged_columns'),
               ('trg_protect_profile_privileged_columns'),
               ('trg_create_profile_for_new_user'),
               ('trg_touch_updated_at'),
               ('trg_sync_product_review_stats'),
               ('trg_sync_material_on_inventory_log')) as t(expected)
  left join pg_trigger tg on tg.tgname = t.expected and not tg.tgisinternal
 order by t.expected;

-- 5.16 — Đợt 25: bảng dòng tiền + 14 cột snapshot/payout của orders
select 'order_items (bảng)' as muc,
       case when to_regclass('public.order_items') is not null then 'OK' else 'THIEU' end as ket_qua;
select 'workshop_commission_terms (bảng riêng chiết khấu)' as muc,
       case when to_regclass('public.workshop_commission_terms') is not null then 'OK' else 'THIEU' end as ket_qua;
select 'rò rỉ đã bịt: workshop_partners.platform_commission_percent phải KHÔNG còn' as muc,
       case when count(*) = 0 then 'OK' else 'CON — cot van ton tai!' end as ket_qua
  from information_schema.columns
 where table_schema = 'public' and table_name = 'workshop_partners'
   and column_name = 'platform_commission_percent';
select count(*) as so_cot_snapshot_payout_cua_orders
  from information_schema.columns
 where table_schema = 'public' and table_name = 'orders'
   and column_name in ('subtotal_amount','vat_percent_snapshot','vat_amount',
                       'platform_fee_percent_snapshot','platform_fixed_fee_snapshot','platform_fee_amount',
                       'workshop_payout_amount','designer_payout_amount',
                       'workshop_payout_status','designer_payout_status',
                       'workshop_payout_paid_at','workshop_payout_paid_by',
                       'designer_payout_paid_at','designer_payout_paid_by');

-- 5.17 — D5(b): KHÔNG còn policy DELETE nào trên bảng quotes (kỳ vọng 0 dòng)
select count(*) as so_policy_delete_tren_quotes
  from pg_policies
 where schemaname = 'public' and tablename = 'quotes' and cmd = 'DELETE';

-- 5.19 — Đợt 25: cột materials.failure_extra_percent phải tồn tại (thay luật id.includes im lặng)
select 'materials.failure_extra_percent' as muc,
       case when count(*) = 1 then 'OK' else 'THIEU' end as ket_qua
  from information_schema.columns
 where table_schema = 'public' and table_name = 'materials'
   and column_name = 'failure_extra_percent';


-- 5.20 — Đợt 25 / C: phí nền tảng CỐ ĐỊNH phải có cột nguồn trong DB (cho platform_fixed_fee_snapshot)
select 'pricing_global_settings.marketplace_fixed_fee_vnd' as muc,
       case when count(*) = 1 then 'OK' else 'THIEU' end as ket_qua
  from information_schema.columns
 where table_schema = 'public' and table_name = 'pricing_global_settings'
   and column_name = 'marketplace_fixed_fee_vnd';

-- 5.21 — Đợt 25 / B: setting_audit.store phải có ĐÚNG MỘT CHECK và chứa order_payouts
select 'setting_audit.store: dung 1 CHECK + co order_payouts' as muc,
       case when count(*) = 1 and bool_and(pg_get_constraintdef(oid) like '%order_payouts%')
            then 'OK' else 'SAI — so CHECK = ' || count(*)::text end as ket_qua
  from pg_constraint
 where conrelid = 'public.setting_audit'::regclass
   and contype = 'c'
   and pg_get_constraintdef(oid) ilike '%store%';

-- 5.22 — Đợt 25 / A: storage policy cho designer tự quản file số (digital/<uid>/...)
select 'storage policy vcube_cad_files_digital_owner_rw' as muc,
       case when count(*) = 1 then 'OK' else 'THIEU' end as ket_qua
  from pg_policies
 where schemaname = 'storage' and tablename = 'objects'
   and policyname = 'vcube_cad_files_digital_owner_rw';

-- 5.18 — D8(a): các cột BỊA đã được gỡ default (kỳ vọng 0 dòng)
select t.tbl || '.' || t.col as cot_con_default_bia
  from (values ('products','rating'),
               ('products','print_time'),
               ('products','designer'),
               ('products','cad_format'),
               ('materials','brand'),
               ('materials','density'),
               ('materials','cost_per_kg'),
               ('materials','price_per_gram'),
               ('materials','unit_price_multiplier'),
               ('materials','spool_weight_grams'),
               ('materials','stock_rolls_count'),
               ('materials','extruder_temp_min'),
               ('materials','extruder_temp_max'),
               ('materials','bed_temp'),
               ('printer_fleet','brand'),
               ('printer_fleet','bed_dimensions'),
               ('printer_fleet','nozzle_diameter'),
               ('printer_fleet','power_kw'),
               ('printer_fleet','acquisition_cost'),
               ('printer_fleet','expected_lifetime_hours'),
               ('printer_fleet','consumables_hourly_rate'),
               ('printer_fleet','hourly_rate'),
               ('printer_fleet','hourly_cost'),
               ('printer_fleet','max_print_speed_mms'),
               ('printer_fleet','heated_bed_max_temp'),
               ('accessories','low_stock_threshold'),
               ('accessories','supplier'),
               ('workshop_partners','rating'),
               ('workshop_partners','sla_on_time_rate'),
               ('workshop_partners','max_build_volume'),
               ('designer_profiles','rating'),
               ('workshop_machines','hourly_rate'),
               ('workshop_machines','bed_dimensions'),
               ('workshop_materials','price_per_kg'),
               ('workshop_materials','low_stock_threshold_grams'),
               ('quotes','volume_cm3'),
               ('quotes','infill_percent'),
               ('quotes','layer_height_mm'),
               ('digital_assets','file_size_bytes'),
               ('digital_assets','checksum')) as t(tbl, col)
  join information_schema.columns c
    on c.table_schema = 'public' and c.table_name = t.tbl and c.column_name = t.col
 where c.column_default is not null
 order by 1;
