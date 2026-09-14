-- ==============================================================================
-- VCUBE — KIỂM CHỨNG CẤU HÌNH ADMIN SAU KHI ÁP MIGRATION (CHỈ ĐỌC)
-- ==============================================================================
-- Chạy trong Supabase SQL Editor SAU khi chạy supabase/scripts/apply_all_manual.sql.
--
-- Vì sao cần file này: PostgREST CHỈ expose schema `public`, nên script Node
-- (scripts/a8-db-probe.mjs) không đọc được `information_schema`/`pg_constraint`.
-- Muốn chứng minh cột/constraint/policy CÓ THẬT trên DB thì phải chạy SQL trong
-- SQL Editor — file này làm đúng việc đó.
--
-- BỐI CẢNH LỖI ĐÃ GẶP (2026-09-12): `create table if not exists` là NO-OP HOÀN TOÀN
-- với bảng ĐÃ TỒN TẠI. Project này đã có schema từ lần áp baseline trước, nên:
--   * `site_content.settings`   → KHÔNG được thêm (ghi vào bị lỗi 42703)
--   * `pricing_global_settings` → DEFAULT 2850/65000/8 VẪN CÒN, và 2 CHECK
--                                 constraint KHÔNG được tạo
-- Baseline đã được sửa để có `alter table ... if not exists` tương ứng. File này
-- xác nhận lại bằng catalog thật.
--
-- KHÔNG thay đổi dữ liệu. Không in PII (chỉ đếm / chỉ tên cột-constraint-policy).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. LỖI 1 — `site_content.settings` phải TỒN TẠI (trước đây không có)
-- ------------------------------------------------------------------------------
select '1. site_content.settings' as muc,
       case when count(*) = 1 then 'OK' else 'THIEU - chua ap alter table' end as ket_qua,
       coalesce(max(data_type), '-')      as kieu_du_lieu,
       coalesce(max(is_nullable), '-')    as cho_phep_null,
       coalesce(max(column_default), '-') as gia_tri_mac_dinh
  from information_schema.columns
 where table_schema = 'public'
   and table_name = 'site_content'
   and column_name = 'settings';

-- ------------------------------------------------------------------------------
-- 2. LỖI 2a — 3 cột nghiệp vụ của `pricing_global_settings` KHÔNG còn DEFAULT
-- ------------------------------------------------------------------------------
select '2. default da bo: ' || column_name as muc,
       case when column_default is null then 'OK' else 'SAI - con default: ' || column_default end as ket_qua,
       coalesce(column_default, '(khong co)') as gia_tri_mac_dinh
  from information_schema.columns
 where table_schema = 'public'
   and table_name = 'pricing_global_settings'
   and column_name in ('electricity_rate_vnd', 'labor_hourly_rate_vnd', 'vat_percent')
 order by column_name;

-- ------------------------------------------------------------------------------
-- 3. LỖI 2b — 5 CHECK constraint (2 của pricing + 3 của app_settings) phải TỒN TẠI
-- ------------------------------------------------------------------------------
select '3. constraint ' || t.expected as muc,
       case when c.conname is not null then 'OK' else 'THIEU - chua ap alter table' end as ket_qua,
       coalesce(pg_get_constraintdef(c.oid), '-') as dinh_nghia
  from (values
          ('app_settings', 'app_settings_tax_code_format_chk'),
          ('app_settings', 'app_settings_bank_account_digits_chk'),
          ('app_settings', 'app_settings_contact_email_chk'),
          ('pricing_global_settings', 'pricing_global_settings_vat_range_chk'),
          ('pricing_global_settings', 'pricing_global_settings_rates_nonneg_chk')
       ) as t(tbl, expected)
  left join pg_constraint c
         on c.conname = t.expected
        and c.conrelid = to_regclass('public.' || t.tbl)
 order by t.expected;

-- ------------------------------------------------------------------------------
-- 4. LỖI 2c — dữ liệu seed cũ 2850/65000/8 phải đã về NULL
--    ('KIEM TRA' = admin đã nhập giá trị thật, không phải lỗi migration)
-- ------------------------------------------------------------------------------
select '4. du lieu seed: ' || t.nhan as muc,
       case when t.hien_tai is null then 'OK (NULL = chua cau hinh)'
            when t.hien_tai = t.seed_cu then 'SAI - con gia tri seed cu'
            else 'KIEM TRA - admin da nhap gia tri that' end as ket_qua,
       t.seed_cu as gia_tri_seed_cu,
       t.hien_tai as gia_tri_hien_tai
  from (
    select 'electricity_rate_vnd'  as nhan, 2850::numeric  as seed_cu,
           electricity_rate_vnd  as hien_tai from public.pricing_global_settings where id = 'global'
    union all
    select 'labor_hourly_rate_vnd', 65000::numeric,
           labor_hourly_rate_vnd from public.pricing_global_settings where id = 'global'
    union all
    select 'vat_percent', 8::numeric,
           vat_percent from public.pricing_global_settings where id = 'global'
  ) t;

-- ------------------------------------------------------------------------------
-- 5. Bốn bảng mới + số cột thật (đối chiếu với khai báo trong baseline)
-- ------------------------------------------------------------------------------
select t.expected as bang,
       case when coalesce(cc.n, 0) > 0 then 'OK' else 'THIEU' end as ket_qua,
       coalesce(cc.n, 0) as so_cot_thuc_te,
       t.so_cot_mong_doi
  from (values ('app_settings', 13), ('setting_audit', 7),
               ('warranty_claims', 11), ('order_files', 6)) as t(expected, so_cot_mong_doi)
  left join (
    select table_name, count(*)::int as n
      from information_schema.columns
     where table_schema = 'public'
     group by table_name
  ) cc on cc.table_name = t.expected
 order by t.expected;

-- ------------------------------------------------------------------------------
-- 6. Bảng chưa bật RLS (phải trả về 0 dòng)
-- ------------------------------------------------------------------------------
select '6. bang chua bat RLS: ' || c.relname as muc, 'SAI' as ket_qua
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;

-- ------------------------------------------------------------------------------
-- 7. Policy: tổng số + 13 policy mới + 1 policy storage
-- ------------------------------------------------------------------------------
select '7a. tong policy bang' as muc, 'INFO' as ket_qua,
       (select count(*) from pg_policies where schemaname = 'public') as so_luong,
       61 as mong_doi;

select '7b. tong policy storage' as muc, 'INFO' as ket_qua,
       (select count(*) from pg_policies where schemaname = 'storage') as so_luong,
       5 as mong_doi;

select '7c. policy ' || t.expected as muc,
       case when p.policyname is not null then 'OK' else 'THIEU' end as ket_qua
  from (values ('vcube_app_settings_public_read'), ('vcube_app_settings_admin_insert'),
               ('vcube_app_settings_admin_update'), ('vcube_setting_audit_admin_read'),
               ('vcube_setting_audit_admin_insert'), ('vcube_warranty_claims_customer_read'),
               ('vcube_warranty_claims_customer_insert'), ('vcube_warranty_claims_staff_read'),
               ('vcube_warranty_claims_staff_update'), ('vcube_order_files_buyer_read'),
               ('vcube_order_files_staff_insert'), ('vcube_order_files_staff_update'),
               ('vcube_order_files_admin_delete')) as t(expected)
  left join pg_policies p on p.schemaname = 'public' and p.policyname = t.expected
 order by t.expected;

select '7d. policy storage vcube_cad_files_order_files_read' as muc,
       case when count(*) = 1 then 'OK' else 'THIEU' end as ket_qua
  from pg_policies
 where schemaname = 'storage' and policyname = 'vcube_cad_files_order_files_read';

-- ------------------------------------------------------------------------------
-- 8. setting_audit phải APPEND-ONLY: chỉ có policy SELECT và INSERT
-- ------------------------------------------------------------------------------
select '8. setting_audit policy ' || cmd as muc,
       case when cmd in ('SELECT', 'INSERT') then 'OK' else 'SAI - phai append-only' end as ket_qua
  from pg_policies
 where schemaname = 'public' and tablename = 'setting_audit'
 order by cmd;

-- ------------------------------------------------------------------------------
-- 9. app_settings: đúng 1 hàng, tax_code NULL (chưa cấu hình)
-- ------------------------------------------------------------------------------
select '9. app_settings seed' as muc,
       case when count(*) = 1 and count(tax_code) = 0
            then 'OK (1 hang, tax_code NULL)'
            else 'KIEM TRA' end as ket_qua,
       count(*) as so_hang,
       count(tax_code) as so_hang_co_ma_so_thue
  from public.app_settings;

-- ------------------------------------------------------------------------------
-- 10. Trigger tự cập nhật updated_at phải có trên 2 bảng mới cần nó
-- ------------------------------------------------------------------------------
select '10. trigger ' || t.expected as muc,
       case when count(g.tgname) > 0 then 'OK' else 'THIEU' end as ket_qua
  from (values ('app_settings'), ('warranty_claims')) as t(expected)
  left join pg_trigger g on g.tgrelid = to_regclass('public.' || t.expected)
                        and g.tgname = 'trg_touch_updated_at'
 group by t.expected
 order by t.expected;

-- ==============================================================================
-- KẾT LUẬN: nếu không có dòng nào mang ket_qua bắt đầu bằng 'THIEU' hoặc 'SAI'
--           thì migration đã áp đủ lên project này.
-- ==============================================================================
