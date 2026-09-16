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

-- ---------------------------------------------------------------------------
-- site_content: cot THAT cho nhom storefront/SEO truoc day bi NUOT khi luu.
-- Truoc day admin sua duoc nhung `saveSiteContent` khong ghi o dau (khong cot,
-- khong jsonb) ⇒ mat du lieu am tham. Nay moi truong co mot cot rieng de query/index
-- (khong don cuc vao jsonb). Cot text mac dinh '' = chua cau hinh; boolean/jsonb
-- nullable de phan biet "chua khai" voi false/[].
-- ---------------------------------------------------------------------------
alter table public.site_content
  add column if not exists announcement_badge         text default '',
  add column if not exists announcement_action_text   text default '',
  add column if not exists announcement_action_tag    text default '',
  add column if not exists hero_headline_line1        text default '',
  add column if not exists hero_headline_highlight    text default '',
  add column if not exists hero_cta_quote_text        text default '',
  add column if not exists hero_cta_catalog_text      text default '',
  add column if not exists hero_metric1_label         text default '',
  add column if not exists hero_metric1_value         text default '',
  add column if not exists hero_metric2_label         text default '',
  add column if not exists hero_metric2_value         text default '',
  add column if not exists hero_metric3_label         text default '',
  add column if not exists hero_metric3_value         text default '',
  add column if not exists workflow_badge             text default '',
  add column if not exists workflow_title             text default '',
  add column if not exists workflow_step1_title       text default '',
  add column if not exists workflow_step1_desc        text default '',
  add column if not exists workflow_step2_title       text default '',
  add column if not exists workflow_step2_desc        text default '',
  add column if not exists workflow_step3_title       text default '',
  add column if not exists workflow_step3_desc        text default '',
  add column if not exists estimator_badge            text default '',
  add column if not exists estimator_title            text default '',
  add column if not exists estimator_subtitle         text default '',
  add column if not exists estimator_benefit1         text default '',
  add column if not exists estimator_benefit2         text default '',
  add column if not exists estimator_cta_text         text default '',
  add column if not exists trust_partners_title       text default '',
  add column if not exists trust_partners_list        jsonb default '[]'::jsonb,
  add column if not exists seo_title                  text default '',
  add column if not exists seo_description            text default '',
  add column if not exists seo_keywords               text default '',
  add column if not exists seo_og_image               text default '',
  add column if not exists seo_canonical_url          text default '',
  add column if not exists seo_robots_index           boolean,
  add column if not exists seo_structured_data        text default '';


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
       set current_stock_grams = coalesce(current_stock_grams, 0) + new.grams,
           price_per_kg = coalesce(nullif(new.price_per_kg_at_time, 0), price_per_kg),
           stock_status = case
             when coalesce(current_stock_grams, 0) + new.grams <= 0 then 'OutOfStock'
             when coalesce(current_stock_grams, 0) + new.grams <= low_stock_threshold_grams then 'LowStock'
             else 'Tracking' end,
           updated_at = now()
     where id = new.material_id;
  elsif new.action = 'Export' then
    update public.workshop_materials
       set current_stock_grams = greatest(0, coalesce(current_stock_grams, 0) - new.grams),
           stock_status = case
             when greatest(0, coalesce(current_stock_grams, 0) - new.grams) <= low_stock_threshold_grams then 'LowStock'
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
alter table public.workshop_materials       alter column current_stock_grams              drop default;
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
alter table public.workshop_materials       alter column current_stock_grams              drop not null;
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
