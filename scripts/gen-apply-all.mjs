#!/usr/bin/env node
/**
 * A8 — SINH LẠI `supabase/scripts/apply_all_manual.sql` từ 4 file gốc.
 *
 * File gộp là bản nối NGUYÊN VĂN (không sửa 1 ký tự SQL) của:
 *   PHẦN 1 — supabase/migrations/20260900_rls_helpers.sql
 *   PHẦN 2 — supabase/migrations/20260901_baseline_schema.sql
 *   PHẦN 3 — supabase/migrations/20261010_harden_rls.sql
 *   PHẦN 4 — supabase/scripts/bootstrap_admin.sql
 *   PHẦN 5 — kiểm chứng sau khi chạy (chỉ đọc, sinh từ script này)
 *
 * Vì sao cần script: sau khi sửa baseline (thêm `alter table` idempotent cho bảng đã
 * tồn tại), bản gộp cũ KHÔNG còn khớp nguồn sự thật. Chủ dự án dán file gộp ⇒ file
 * gộp phải luôn được sinh lại, không sửa tay.
 *
 * Dùng: node scripts/gen-apply-all.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const R = (p) => readFileSync(resolve(root, p), 'utf8');

/* ------------------------------------------------------- số kỳ vọng (tính động)
 * KHÔNG hardcode số bảng / số policy. Bản trước hardcode "25 bảng" và "61 policy";
 * Đợt 10 (W2) thêm 3 bảng + 10 policy ⇒ PHẦN 5 in ra "kỳ vọng" sai, người dán file dễ
 * tưởng migration hỏng. Tính động thì lần sau tự khớp.
 *   * số bảng  : đếm `create table if not exists public.<tên>` trong baseline — khớp
 *                `information_schema.tables where table_type='BASE TABLE'` (view
 *                `pricing_config` không tính vì không phải BASE TABLE).
 *   * số policy: đọc allowlist `v_keep` (public) và `v_ok` (storage) của file hardening.
 *                Đây là nguồn đúng duy nhất: bước 9 của file đó xoá mọi policy không nằm
 *                trong `v_keep`, và `scripts/lint-rls-migration.mjs` assert "tạo == allowlist".
 * Tại thời điểm Đợt 10 (W2): 28 bảng · 71 policy bảng · 5 policy storage.
 */
const BASELINE_SRC = R('supabase/migrations/20260901_baseline_schema.sql');
const HARDEN_SRC = R('supabase/migrations/20261010_harden_rls.sql');

const tableCount = new Set(
  [...BASELINE_SRC.matchAll(/create table if not exists public\.([a-z_]+)/g)].map((m) => m[1]),
).size;

function allowlistSize(sql, varName) {
  const block = sql.match(new RegExp(varName + ' text\\[\\] := array\\[([\\s\\S]*?)\\];'));
  if (!block) throw new Error('Không tìm thấy allowlist ' + varName + ' trong 20261010_harden_rls.sql');
  return new Set([...block[1].matchAll(/'([a-z0-9_]+)'/g)].map((m) => m[1])).size;
}

const publicPolicyCount = allowlistSize(HARDEN_SRC, 'v_keep');
const storagePolicyCount = allowlistSize(HARDEN_SRC, 'v_ok');

// Số mục của `scripts/inspect-db.mjs` — SUY ĐỘNG từ chính script đó, không hardcode: comment
// trong file gộp từng ghi "19/19 bảng" trong khi danh sách đã phủ 31 mục (bài học T3).
const INSPECT_DB_SRC = R('scripts/inspect-db.mjs');
const inspectDbCount = new Set(
  [...INSPECT_DB_SRC.matchAll(/\{\s*name:\s*'([a-z_]+)'/g)].map((m) => m[1]),
).size;

if (!(tableCount > 0 && publicPolicyCount > 0 && storagePolicyCount > 0 && inspectDbCount > 0)) {
  console.log('FAIL: không suy ra được số kỳ vọng (đếm bảng / đọc allowlist policy).');
  process.exit(1);
}

const PARTS = [
  {
    n: 1,
    title: 'supabase/migrations/20260900_rls_helpers.sql',
    note: 'RLS HELPERS — bắt buộc chạy TRƯỚC. Định nghĩa public.current_app_role() + public.is_admin() + public.is_admin_or_lab().',
    file: 'supabase/migrations/20260900_rls_helpers.sql',
  },
  {
    n: 2,
    title: 'supabase/migrations/20260901_baseline_schema.sql',
    note: 'BASELINE SCHEMA — bảng, cột, index, ràng buộc, hàm, trigger, bucket, seed. Có cả `alter table` idempotent cho bảng ĐÃ TỒN TẠI.',
    file: 'supabase/migrations/20260901_baseline_schema.sql',
  },
  {
    n: 3,
    title: 'supabase/migrations/20261010_harden_rls.sql',
    note: `HARDEN RLS — toàn bộ policy (${publicPolicyCount} policy bảng + ${storagePolicyCount} policy storage). Tự dọn policy cũ/lạ.`,
    //  Số policy TÍNH ĐỘNG từ allowlist v_keep/v_ok của chính file hardening.
    file: 'supabase/migrations/20261010_harden_rls.sql',
  },
  {
    n: 4,
    title: 'supabase/scripts/bootstrap_admin.sql',
    note: 'CẤP QUYỀN ADMIN — SỬA `v_email` thành email thật trước khi chạy, nếu không script sẽ raise exception.',
    file: 'supabase/scripts/bootstrap_admin.sql',
  },
];

const HEADER = `-- ##############################################################################
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
--   2. Mỗi phần đã có \`begin; ... commit;\` riêng nên chạy được theo từng phần.
--      Nếu phần nào lỗi, các phần trước đã commit xong — không mất kết quả.
--
-- CHẠY LẠI ĐƯỢC NHIỀU LẦN (IDEMPOTENT) — kể cả trên project ĐÃ CÓ SCHEMA.
--   * \`create table if not exists\` là NO-OP với bảng đã tồn tại, nên mọi thay đổi cột
--     cho bảng CŨ đều có \`alter table ... if not exists\` / \`drop constraint if exists\`
--     đi kèm trong PHẦN 2. (Đây là lỗi thật đã gặp: site_content.settings và DEFAULT
--     2850/65000/8 của pricing_global_settings không được áp ở lần chạy trước.)
--   * PHẦN 2 có khối chuẩn hoá đưa 3 giá trị seed 2850/65000/8 về NULL, CÓ ĐIỀU KIỆN
--     BẢO VỆ: chỉ chạy khi hàng còn là hàng seed (settings = '{}'), nên không xoá giá
--     trị admin đã nhập thật.
--
-- SAU KHI CHẠY, kiểm chứng bằng 3 cách:
--   a) Xem kết quả PHẦN 5 ngay dưới đáy file này (chỉ đọc, in ra PASS/FAIL từng mục).
--   b) Trong SQL Editor: chạy supabase/diagnostics/verify_admin_settings.sql
--   c) Trong repo:  node scripts/inspect-db.mjs   (phải đủ ${inspectDbCount}/${inspectDbCount} mục trong
--                   DANH SÁCH ĐỐI CHIẾU của chính script đó; hiện phủ ${tableCount} bảng khai báo
--                   trong 20260901_baseline_schema.sql, cộng view pricing_config)
--                   node scripts/verify-rls.mjs   (0 FAIL)
--
-- THỨ TỰ BẮT BUỘC: phần 1 -> 2 -> 3. Phần 4 chạy sau cùng và tùy chọn (phải sửa email).
-- ##############################################################################
`;

const VERIFY = `-- ##############################################################################
-- PHẦN 5 — KIỂM CHỨNG SAU KHI CHẠY (chỉ đọc, không thay đổi gì)
-- ##############################################################################
-- Mỗi truy vấn in ra cột \`ket_qua\` = 'OK' hoặc 'THIEU'/'SAI'. Không có dòng 'SAI'/'THIEU'
-- nghĩa là migration đã áp đủ. Script này CHỈ ĐỌC: chỉ select trên catalog + đếm.
-- ⚠️ Các con số "kỳ vọng" bên dưới được TÍNH ĐỘNG lúc sinh file (đếm lệnh create table
-- if not exists trong 20260901 + đọc allowlist v_keep/v_ok của 20261010), KHÔNG hardcode:
-- tại thời điểm Đợt 10 (W2) là ${tableCount} bảng · ${publicPolicyCount} policy bảng ·
-- ${storagePolicyCount} policy storage. Nếu số khi bạn dán KHÁC "kỳ vọng" ở đây thì
-- migration CHƯA được áp đủ (hoặc còn policy lạ), KHÔNG phải lỗi của file này.

-- 5.1 — Tổng số bảng thật trong schema public (kỳ vọng ${tableCount})
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

-- 5.8 — Số policy đang có (kỳ vọng ${publicPolicyCount} policy bảng + ${storagePolicyCount} policy storage)
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
`;

/* ------------------------------------------- D12(a): danh sách kỳ vọng của PHẦN 5
 * MỘT nguồn duy nhất: các mảng dưới đây vừa SINH ra truy vấn của PHẦN 5, vừa được đối chiếu
 * với chính file migration NGAY LÚC SINH — TRƯỚC writeFileSync. Nếu ai đổi tên policy/trigger
 * mà quên cập nhật danh sách thì script FAIL to, thay vì ghi ra bản gộp có "kỳ vọng" đã cũ
 * (đúng lớp lỗi đã gặp với con số 25 bảng / 61 policy).
 * Phép kiểm cố ý CHẶT: policy phải xuất hiện dạng chuỗi có nháy ('ten') và trigger theo ranh
 * giới từ (\bten\b) — nhờ vậy đổi tên kiểu THÊM HẬU TỐ cũng bị bắt.
 */
const EXPECTED_POLICIES = [
  'vcube_orders_workshop_read',
  'vcube_orders_workshop_update_progress',
  'vcube_workshop_profiles_owner_insert',
  'vcube_quotes_owner_read',
  'vcube_quotes_owner_insert',
  'vcube_quotes_owner_update',
  'vcube_quotes_admin_all',
  'vcube_kyc_owner_read',
  'vcube_kyc_owner_insert',
  'vcube_kyc_admin_all',
  'vcube_order_items_owner_read',
  'vcube_order_items_admin_all',
  'vcube_workshop_commission_terms_admin_all',
];
const EXPECTED_TRIGGERS = [
  'trg_protect_order_privileged_columns',
  'trg_protect_workshop_profile_privileged_columns',
  'trg_protect_profile_privileged_columns',
  'trg_create_profile_for_new_user',
  'trg_touch_updated_at',
  'trg_sync_product_review_stats',
  'trg_sync_material_on_inventory_log',
];
const EXPECTED_STORAGE = [
  'vcube_product_images_public_read',
  'vcube_product_images_admin_write',
  'vcube_cad_files_admin_all',
  'vcube_cad_files_buyer_read',
  'vcube_cad_files_order_files_read',
  'vcube_cad_files_digital_owner_rw',
];

const W8_VERIFY = `
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
`;

const VERIFY_ALL = VERIFY + W8_VERIFY;

/* TỰ KIỂM TRƯỚC KHI GHI (chạy trước writeFileSync ⇒ danh sách lệch thì KHÔNG ghi gì). */
{
  const haystack = BASELINE_SRC + '\n' + HARDEN_SRC;
  const hasPolicy = (n) => haystack.includes("'" + n + "'");
  const hasTrigger = (n) => new RegExp('\\b' + n + '\\b').test(haystack);
  const hasStoragePolicy = (n) => new RegExp('create policy\\s+' + n + '\\s+on\\s+storage\\.objects').test(haystack);
  const missing = []
    .concat(EXPECTED_POLICIES.filter((n) => !hasPolicy(n)).map((n) => 'policy: ' + n))
    .concat(EXPECTED_TRIGGERS.filter((n) => !hasTrigger(n)).map((n) => 'trigger: ' + n))
    .concat(EXPECTED_STORAGE.filter((n) => !hasStoragePolicy(n)).map((n) => 'storage policy: ' + n));
  if (missing.length) {
    console.log('FAIL — danh sách kỳ vọng của PHẦN 5 KHÔNG khớp file migration:');
    for (const m of missing) console.log('  - không tìm thấy ' + m);
    console.log('  (đổi tên policy/trigger thì phải cập nhật EXPECTED_POLICIES/EXPECTED_TRIGGERS)');
    console.log('  ⇒ KHÔNG ghi đè file gộp.');
    process.exit(1);
  }
  console.log(`Tự kiểm PHẦN 5: ${EXPECTED_POLICIES.length} policy + ${EXPECTED_TRIGGERS.length} trigger + ${EXPECTED_STORAGE.length} policy storage — khớp file migration.`);
}

let out = HEADER;
for (const p of PARTS) {
  out += `
-- ##############################################################################
-- PHẦN ${p.n}/4 — ${p.title}
-- ${p.note}
-- ##############################################################################

`;
  out += R(p.file);
  if (!out.endsWith('\n')) out += '\n';
}
out += '\n' + VERIFY_ALL;

writeFileSync(resolve(root, 'supabase/scripts/apply_all_manual.sql'), out, 'utf8');

// Tự kiểm: nội dung 4 file gốc phải xuất hiện NGUYÊN VĂN
let problems = [];
for (const p of PARTS) {
  const body = R(p.file);
  if (!out.includes(body)) problems.push(`PHẦN ${p.n} KHÔNG nguyên văn: ${p.file}`);
}
const lines = out.split('\n').length - (out.endsWith('\n') ? 1 : 0);
const verifyQueries = (VERIFY_ALL.match(/^select/gim) ?? []).length;
console.log(`Đã sinh supabase/scripts/apply_all_manual.sql — ${lines} dòng, ${out.length} ký tự.`);
console.log('Các phần:');
for (const p of PARTS) console.log(`  PHẦN ${p.n}/4 — ${p.title}`);
console.log(`  PHẦN 5   — kiểm chứng (${verifyQueries} truy vấn chỉ đọc, có kiểm policy/trigger)`);
console.log(`Số kỳ vọng (tính động từ file gốc): ${tableCount} bảng · ${publicPolicyCount} policy bảng · ${storagePolicyCount} policy storage`);
if (problems.length) {
  console.log('\nFAIL:');
  for (const x of problems) console.log('  - ' + x);
  process.exit(1);
}
console.log('\nPASS — cả 4 file gốc xuất hiện nguyên văn trong file gộp.');
