-- ==============================================================================
-- VCUBE — SỰ THẬT SCHEMA TRÊN DB (CHỈ ĐỌC)  ·  supabase/diagnostics/audit_schema_truth.sql
-- ==============================================================================
-- CHẠY TRONG SUPABASE SQL EDITOR. Không sửa gì. Không in PII.
--
-- VÌ SAO CẦN FILE NÀY (bài học 2026-09-12):
--   `create table if not exists` là NO-OP HOÀN TOÀN với bảng ĐÃ TỒN TẠI. Nên **baseline
--   khai gì KHÔNG quyết định DB đang có gì**. Ví dụ thật: baseline khai
--   `electricity_rate_vnd numeric` (nullable) nhưng DB thật vẫn có
--   `NOT NULL DEFAULT 2850` ⇒ khối chuẩn hoá ghi NULL bị nổ
--   `23502 null value ... violates not-null constraint`.
--   Vì vậy MỌI kết luận về schema phải đọc từ catalog thật, không đọc từ file migration.
--
--   PostgREST (và do đó mọi script Node dùng secret key) CHỈ thấy schema `public`
--   ⇒ KHÔNG đọc được `information_schema`/`pg_catalog`. Chỉ SQL Editor làm được.
--
-- CÁCH DÙNG: dán CẢ file vào SQL Editor, chạy 1 lần, rồi gửi lại TOÀN BỘ kết quả (12 phần).
--   * File này CHỈ ĐỌC (read-only): mọi câu lệnh đều là `select`/CTE — KHÔNG có
--     DDL/DML, KHÔNG `begin;`/`commit;` ⇒ chạy lại bao nhiêu lần cũng KHÔNG sửa 1 byte
--     nào của DB. Không in PII, không in giá trị pháp lý.
--   * BẮT BUỘC chạy trong SQL Editor (hoặc psql). Các phép kiểm ở đây đọc
--     `pg_catalog` + `information_schema`, mà PostgREST CHỈ phơi schema `public`
--     ⇒ mọi script Node (`scripts/inspect-db.mjs`, `scripts/a8-db-probe.mjs`) KHÔNG
--     thấy được các bảng catalog đó. Đó chính là lý do file này tồn tại.
--   * CHỈ CẦN ĐỌC 3 CHỖ để biết DB đã đúng chưa: P6 (`30` · `84` · `6`),
--     P11 (`OK 24/24`), P9 (2 dòng tổng kết đều = 0).
-- ==============================================================================


-- ==============================================================================
-- PHẦN 1 — TRIGGER TỰ SINH HỒ SƠ KHI ĐĂNG KÝ (câu hỏi đang treo)
-- Kỳ vọng: có 1 trigger trên auth.users gọi fn_create_profile_for_new_user().
-- Nếu rỗng ⇒ MỌI đăng ký mới KHÔNG có hàng user_profiles (đã gặp thật).
-- ==============================================================================
select
  'P1 — trigger trên auth.users' as phan,
  t.tgname                        as doi_tuong,
  case when t.tgenabled = 'O' then 'DANG BAT' else 'TAT (' || t.tgenabled::text || ')' end as trang_thai,
  pg_get_triggerdef(t.oid)        as chi_tiet
from pg_trigger t
where t.tgrelid = 'auth.users'::regclass
  and not t.tgisinternal
order by t.tgname;

-- Hàm có tồn tại không (kể cả khi trigger chưa gắn)
select
  'P1b — hàm tạo hồ sơ' as phan,
  p.proname             as doi_tuong,
  case when p.oid is null then 'THIEU' else 'CO' end as trang_thai,
  coalesce(obj_description(p.oid, 'pg_proc'), '') as chi_tiet
from (select to_regprocedure('public.fn_create_profile_for_new_user()') as oid) x
left join pg_proc p on p.oid = x.oid;


-- ==============================================================================
-- PHẦN 2 — 3 BẢNG MỚI + CỘT `site_content.settings` (migration đã áp chưa)
-- ==============================================================================
select
  'P2 — bảng mới' as phan,
  v.ten           as doi_tuong,
  case when c.relname is null then 'THIEU' else 'CO' end as trang_thai,
  case when c.relname is null then ''
       when c.relrowsecurity then 'RLS: DA BAT'
       else '🔴 RLS: CHUA BAT' end as chi_tiet
from (values ('reviews'), ('digital_assets'), ('cart_items'), ('app_settings'),
             ('setting_audit'), ('warranty_claims'), ('order_files')) as v(ten)
left join pg_class c on c.relname = v.ten
     and c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
order by v.ten;

select
  'P2b — cột site_content.settings' as phan,
  'site_content.settings'           as doi_tuong,
  case when col.column_name is null then 'THIEU' else 'CO' end as trang_thai,
  coalesce('nullable=' || col.is_nullable || ' default=' || coalesce(col.column_default, 'none'), '') as chi_tiet
from (select 1) dummy
left join information_schema.columns col
  on col.table_schema = 'public' and col.table_name = 'site_content' and col.column_name = 'settings';


-- ==============================================================================
-- PHẦN 3 — 🔴 DEFAULT BỊA CÒN SÓT TRÊN DB THẬT (nợ #38)
-- Phủ 11 bảng: 6 bảng gốc (products, materials, printer_fleet, accessories,
-- workshop_partners, pricing_global_settings) + 5 bảng Đợt 25/W13 vừa thêm vào
-- (quotes, designer_profiles, workshop_machines, workshop_materials, digital_assets).
-- Đây là phần quan trọng nhất: default chỉ "có tác dụng" nếu nó THẬT SỰ nằm trên cột.
-- Cờ `nghi_bia` bật khi: default là số khác 0, hoặc là chuỗi nằm trong danh sách
-- giá trị đã biết là bịa. Cột `nghi_bia = 'CO'` ⇒ MỌI hàng mới sẽ tự nhận giá trị bịa.
-- ==============================================================================
with cot as (
  select
    c.table_name, c.column_name, c.data_type, c.is_nullable, c.column_default
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name in ('products','materials','printer_fleet','accessories',
                         'workshop_partners','pricing_global_settings',
                         'quotes','designer_profiles','workshop_machines',
                         'workshop_materials','digital_assets')
    and c.column_default is not null
)
select
  'P3 — default bịa' as phan,
  table_name || '.' || column_name as doi_tuong,
  'nullable=' || is_nullable as trang_thai,
  column_default as chi_tiet,
  case
    when column_default ~ '^[0-9.]+' and column_default !~ '^0(\.0+)?$' then 'NGHI BIA (so)'
    when column_default ilike any (array[
      '%Bambu Lab%','%X1-Carbon%','%VCUBE%','%hanoi%','%available%','%active%',
      '%Idle%','%published%','%ready_to_print%','%mechanical%','%engineering%',
      '%medium%','%STL%','%2h%','%FDM%','%hardware%','%cái%','%VCUBE Fab Hub%'])
      then 'NGHI BIA (chuoi)'
    when column_default ilike '%jsonb%' or column_default ilike '%ARRAY%' then 'RUOT RONG / HINH DANG (tu danh gia)'
    else 'co the hop le (tu danh gia)'
  end as nghi_bia
from cot
order by nghi_bia, doi_tuong;


-- ==============================================================================
-- PHẦN 4 — 🔴 CỘT `NOT NULL` MÀ APP CẦN ĐƯỢC NULL (chưa cấu hình)
-- Nguyên tắc đã chốt: NULL = CHƯA CẤU HÌNH (khác 0). Cột nào app cần ghi NULL mà DB
-- còn NOT NULL ⇒ sẽ nổ 23502 khi lưu.
--
-- Phủ ĐỦ 33 cột = 17 cột gốc (3 pricing_global_settings + 9 app_settings + 5
-- workshop_profiles) + 16 cột baseline đã `drop not null` (dòng 1626-1641):
-- products 2 · materials 6 · printer_fleet 1 · accessories 1 · workshop_partners 1 ·
-- workshop_machines 1 · workshop_materials 2 · digital_assets 2.
--
-- Vì sao viết lại thành danh sách kỳ vọng LEFT JOIN catalog: cách cũ
-- (where table_name in (...)) KHÔNG in ra dòng nào khi bảng/cột CHƯA tồn tại ⇒ lỗi
-- im lặng — đúng loại lỗi mà file này sinh ra để bắt. Dạng dưới đây in `THIEU COT`
-- cho cột thiếu và có tổng kết đếm được ở dòng `P4 — TONG KET`: `OK n/33`.
-- ==============================================================================
with ky_vong(bang, cot) as (
  values
    -- 17 cột gốc: app ghi NULL khi admin CHƯA cấu hình
    ('pricing_global_settings', 'electricity_rate_vnd'),
    ('pricing_global_settings', 'labor_hourly_rate_vnd'),
    ('pricing_global_settings', 'vat_percent'),
    ('app_settings', 'legal_name'),
    ('app_settings', 'tax_code'),
    ('app_settings', 'invoice_address'),
    ('app_settings', 'hotline'),
    ('app_settings', 'contact_email'),
    ('app_settings', 'bank_account'),
    ('app_settings', 'bank_name'),
    ('app_settings', 'warranty_terms'),
    ('app_settings', 'deposit_policy'),
    ('workshop_profiles', 'electricity_rate_override'),
    ('workshop_profiles', 'labor_rate_override'),
    ('workshop_profiles', 'partner_id'),
    ('workshop_profiles', 'contact_phone'),
    ('workshop_profiles', 'contact_email'),
    ('products', 'rating'),
    ('products', 'designer'),
    ('materials', 'density'),
    ('materials', 'cost_per_kg'),
    ('materials', 'price_per_gram'),
    ('materials', 'unit_price_multiplier'),
    ('materials', 'spool_weight_grams'),
    ('materials', 'stock_rolls_count'),
    ('printer_fleet', 'bed_dimensions'),
    ('accessories', 'low_stock_threshold'),
    ('workshop_partners', 'max_build_volume'),
    ('workshop_machines', 'bed_dimensions'),
    ('workshop_materials', 'price_per_kg'),
    ('workshop_materials', 'low_stock_threshold_grams'),
    ('digital_assets', 'file_size_bytes'),
    ('digital_assets', 'checksum')
),
thuc_te as (
  select c.table_name, c.column_name, c.is_nullable, c.column_default
  from information_schema.columns c
  where c.table_schema = 'public'
)
select phan, doi_tuong, trang_thai, chi_tiet
from (
  select
    'P4 — NOT NULL tren cot can nullable' as phan,
    k.bang || '.' || k.cot as doi_tuong,
    case when t.column_name is null then 'THIEU COT'
         when t.is_nullable = 'NO' then '🔴 CON NOT NULL'
         else 'ok (nullable)' end as trang_thai,
    case when t.column_name is null
           then 'cot khong ton tai trong information_schema (bang/cot chua co tren DB)'
         when t.is_nullable = 'NO'
           then 'con NOT NULL, default=' || coalesce(t.column_default, '(khong co)') || ' — ghi NULL se loi 23502'
         else 'nullable=YES, default=' || coalesce(t.column_default, '(khong co)') end as chi_tiet,
    1 as nhom,
    case when t.column_name is null then 0
         when t.is_nullable = 'NO' then 1
         else 2 end as xep
  from ky_vong k
  left join thuc_te t
    on t.table_name = k.bang and t.column_name = k.cot
  union all
  select
    'P4 — TONG KET' as phan,
    'cot ky vong da nullable (mong du 33)' as doi_tuong,
    'OK ' || (count(*) filter (where t.is_nullable = 'YES'))::text
           || '/' || count(*)::text as trang_thai,
    case when count(*) filter (where t.is_nullable is distinct from 'YES') = 0
           then 'du 33/33 nullable — chuoi nay phai doc dung OK 33/33'
         else 'CON ' || (count(*) filter (where t.is_nullable is distinct from 'YES'))::text
              || ' cot chua nullable hoac thieu — xem cac dong 🔴 / THIEU COT o tren' end as chi_tiet,
    2 as nhom,
    2 as xep
  from ky_vong k
  left join thuc_te t
    on t.table_name = k.bang and t.column_name = k.cot
) z
order by nhom, xep, doi_tuong;


-- ==============================================================================
-- PHẦN 5 — RLS: bảng nào CHƯA bật (hở dữ liệu)
-- ==============================================================================
select
  'P5 — RLS chua bat' as phan,
  c.relname           as doi_tuong,
  case when c.relrowsecurity then 'DA BAT' else '🔴 CHUA BAT' end as trang_thai,
  (select count(*) from pg_policies p where p.schemaname='public' and p.tablename=c.relname)::text as chi_tiet
from pg_class c
where c.relnamespace = 'public'::regnamespace
  and c.relkind = 'r'
  and not c.relrowsecurity
order by c.relname;


-- ==============================================================================
-- PHẦN 6 — TỔNG SỐ: bảng / policy / index / trigger  (đối chiếu kỳ vọng 30 · 84 · 6)
-- ==============================================================================
select 'P6 — tong ket' as phan, 'bang (base table)' as doi_tuong,
       count(*)::text as so_luong, 'ky vong 30' as doi_chieu
from information_schema.tables where table_schema='public' and table_type='BASE TABLE'
union all
select 'P6 — tong ket', 'policy bang', count(*)::text, 'ky vong 84'
from pg_policies where schemaname='public'
union all
select 'P6 — tong ket', 'policy storage', count(*)::text, 'ky vong 6'
from pg_policies where schemaname='storage'
union all
select 'P6 — tong ket', 'index (public)', count(*)::text, '-'
from pg_indexes where schemaname='public'
union all
select 'P6 — tong ket', 'trigger (public)', count(*)::text, '-'
from pg_trigger t join pg_class c on c.oid=t.tgrelid
where c.relnamespace='public'::regnamespace and not t.tgisinternal;


-- ==============================================================================
-- PHẦN 7 — HÀNG `pricing_global_settings` HIỆN TẠI + hàng `app_settings`
-- Chỉ in TRẠNG THÁI (null / có giá trị), KHÔNG in giá trị pháp lý.
-- ==============================================================================
select
  'P7 — du lieu cau hinh' as phan,
  id                      as doi_tuong,
  case when electricity_rate_vnd is null then 'null' else 'CO GIA TRI' end as dien,
  case when labor_hourly_rate_vnd is null then 'null' else 'CO GIA TRI' end as nhan_cong,
  case when vat_percent is null then 'null' else 'CO GIA TRI' end as vat,
  case when coalesce(settings,'{}'::jsonb) = '{}'::jsonb then 'rong' else 'co du lieu' end as settings_jsonb,
  updated_at::text
from public.pricing_global_settings;


-- ==============================================================================
-- PHẦN 8 — HÀNG `site_content`: cột nào CÓ giá trị (để biết admin đã nhập gì)
-- ==============================================================================
select
  'P8 — site_content' as phan,
  'hang du lieu'      as doi_tuong,
  case when coalesce(phone,'')        = '' then 'null' else 'co' end as phone,
  case when coalesce(email,'')        = '' then 'null' else 'co' end as email,
  case when coalesce(hero_title,'')   = '' then 'null' else 'co' end as hero_title,
  case when coalesce(announcement_text,'') = '' then 'null' else 'co' end as announcement,
  updated_at::text
from public.site_content;


-- ==============================================================================
-- PHẦN 9 — HAI LỚP LỖI MÀ P5 VÀ P6 ĐỀU KHÔNG BẮT ĐƯỢC
--   (a) RLS BẬT nhưng 0 POLICY  ⇒ deny-all ⇒ TÍNH NĂNG CHẾT (không lỗi lúc migrate)
--   (b) CÓ POLICY nhưng RLS TẮT  ⇒ policy VÔ HIỆU ⇒ bảng HỞ
-- P5 chỉ tìm bảng THIẾU RLS; P6 chỉ đếm tổng số. Ca hai lop tren lot qua ca hai.
-- Thuc te da gap: quotes + kyc_records (RLS bat, 0 policy, con grant cho authenticated).
-- ==============================================================================
with t as (
  select c.relname,
         c.relrowsecurity as rls_on,
         (select count(*) from pg_policies p
           where p.schemaname = 'public' and p.tablename = c.relname) as n_pol
    from pg_class c
   where c.relnamespace = 'public'::regnamespace
     and c.relkind in ('r', 'p')          -- bang thuong + bang phan vung (bo view)
)
select 'P9 — RLS BAT nhung 0 POLICY (deny-all => tinh nang chet)' as phan,
       relname as bang,
       '0 policy' as chi_tiet
  from t where rls_on and n_pol = 0
union all
select 'P9 — CO POLICY nhung RLS TAT (policy vo hieu => bang ho)',
       relname,
       n_pol::text || ' policy vo hieu'
  from t where not rls_on and n_pol > 0
union all
select 'P9 — TONG KET', 'bang RLS bat / 0 policy', count(*)::text
  from t where rls_on and n_pol = 0
union all
select 'P9 — TONG KET', 'bang co policy vo hieu (RLS tat)', count(*)::text
  from t where not rls_on and n_pol > 0
union all
select 'P9 — TONG KET', 'tong bang dang xet', count(*)::text from t
order by 1, 2;


-- ==============================================================================
-- PHẦN 10 — DANH SACH BANG + SO POLICY, de doi chieu voi 20261010_harden_rls.sql
-- (bang nao co 0 dong o day chinh la bang bi bo sot khoi allowlist)
-- ==============================================================================
select
  'P10 — bang/policy' as phan,
  c.relname           as bang,
  case when c.relrowsecurity then 'RLS ON' else 'RLS OFF' end as rls,
  (select count(*) from pg_policies p
    where p.schemaname = 'public' and p.tablename = c.relname)::text as so_policy
from pg_class c
where c.relnamespace = 'public'::regnamespace
  and c.relkind in ('r', 'p')
order by 4, 2;


-- ==============================================================================
-- PHẦN 11 — 24 CHECK CONSTRAINT CÓ TÊN `_chk` PHẢI CÓ THẬT TRÊN DB (Đợt 25 · W8/W11-W13)
-- Vì sao phải soi theo TỪNG TÊN: Postgres KHÔNG có `add constraint if not exists`,
-- nên baseline + bundle dùng khối guard:
--     do $do$ begin if not exists (select 1 from pg_constraint
--        where conname = '<tên>' and conrelid = 'public.<bảng>'::regclass)
--     then alter table ... add constraint <tên> check (...); end if; end $do$;
-- Tên trong guard SAI 1 ký tự ⇒ khối đó KHÔNG nổ: nó IM LẶNG không tạo constraint.
-- Hậu quả: cột tiền nhận giá trị âm, % hoa hồng vô lý, status lạ… mà không ai biết.
-- Đếm TỔNG số CHECK cũng KHÔNG bắt được (thiếu 1 cái thì vẫn thấy nhiều CHECK).
--
-- 2 phép thử ghi trong `scripts/a8-db-probe.mjs` đã thành opt-in `--writes` (W15),
-- nên ĐÂY là chốt duy nhất còn phủ 2 CHECK của pricing_global_settings:
-- `pricing_global_settings_vat_range_chk` + `pricing_global_settings_rates_nonneg_chk`.
--
-- ĐỌC KẾT QUẢ: dòng `P11 — TONG KET` in `OK n/24`.
--   * `OK 24/24` ⇒ đủ 24/24, các luật đã được DB cưỡng chế.
--   * `OK 23/24` (hoặc nhỏ hơn) ⇒ có dòng `MISSING` phía trên: constraint đó KHÔNG
--     tồn tại ⇒ luật đó KHÔNG được DB cưỡng chế, app ghi được giá trị vi phạm.
-- SQL Editor không có exit code, nên con số `n/24` CHÍNH LÀ phép đếm để người đọc
-- kết luận mà không phải soi 24 dòng. P11b in định nghĩa THẬT của mọi `_chk`.
-- ==============================================================================
with ky_vong(ten, bang) as (
  values
    ('app_settings_bank_account_digits_chk', 'app_settings'),
    ('app_settings_contact_email_chk', 'app_settings'),
    ('app_settings_tax_code_format_chk', 'app_settings'),
    ('cart_items_quantity_chk', 'cart_items'),
    ('designer_profiles_royalty_percent_chk', 'designer_profiles'),
    ('digital_assets_download_limit_chk', 'digital_assets'),
    ('materials_failure_extra_percent_chk', 'materials'),
    ('order_items_fulfillment_chk', 'order_items'),
    ('order_items_quantity_chk', 'order_items'),
    ('order_items_seller_type_chk', 'order_items'),
    ('orders_designer_payout_status_chk', 'orders'),
    ('orders_status_chk', 'orders'),
    ('orders_status_stage_index_range_chk', 'orders'),
    ('orders_workshop_payout_status_chk', 'orders'),
    ('pricing_global_settings_default_workshop_commission_percent_chk', 'pricing_global_settings'),
    ('pricing_global_settings_marketplace_fee_percent_chk', 'pricing_global_settings'),
    ('pricing_global_settings_marketplace_fixed_fee_vnd_chk', 'pricing_global_settings'),
    ('pricing_global_settings_rates_nonneg_chk', 'pricing_global_settings'),
    ('pricing_global_settings_vat_range_chk', 'pricing_global_settings'),
    ('products_seller_type_chk', 'products'),
    ('reviews_rating_range_chk', 'reviews'),
    ('reviews_status_chk', 'reviews'),
    ('reviews_target_type_chk', 'reviews'),
    ('workshop_commission_terms_commission_percent_chk', 'workshop_commission_terms')
),
thuc_te as (
  select c.conname, c.conrelid, c.conrelid::regclass::text as bang_that
  from pg_constraint c
  where c.connamespace = 'public'::regnamespace
    and c.contype = 'c'
)
select phan, doi_tuong, trang_thai, chi_tiet
from (
  select
    'P11 — CHECK da dat ten' as phan,
    k.bang || '.' || k.ten as doi_tuong,
    case when t.conname is null then 'MISSING' else 'OK' end as trang_thai,
    case when t.conname is null
           then 'KHONG thay trong pg_constraint (schema public) — guard da bo sot ten nay'
         else 'co trong pg_constraint, bang = ' || t.bang_that end as chi_tiet,
    1 as nhom,
    case when t.conname is null then 0 else 1 end as xep
  from ky_vong k
  left join thuc_te t
    on t.conname = k.ten
   and t.conrelid = to_regclass('public.' || k.bang)
  union all
  select
    'P11 — TONG KET' as phan,
    'CHECK dung ten + dung bang (mong du 24)' as doi_tuong,
    'OK ' || (count(*) filter (where t.conname is not null))::text
           || '/' || count(*)::text as trang_thai,
    case when count(*) filter (where t.conname is null) = 0
           then 'du 24/24 — chuoi nay phai doc dung OK 24/24'
         else 'THIEU ' || (count(*) filter (where t.conname is null))::text
              || ' constraint — xem cac dong MISSING o tren' end as chi_tiet,
    2 as nhom,
    2 as xep
  from ky_vong k
  left join thuc_te t
    on t.conname = k.ten
   and t.conrelid = to_regclass('public.' || k.bang)
) z
order by nhom, xep, doi_tuong;


-- P11b — định nghĩa THẬT của mọi CHECK có tên `*_chk` đang có trên DB.
-- Dùng để đối chiếu khi P11 báo MISSING: tên có thể bị gõ sai, hoặc bị gắn nhầm bảng.
select 'P11b — moi CHECK *_chk dang co tren DB' as phan,
       c.conrelid::regclass::text as bang,
       c.conname as ten,
       pg_get_constraintdef(c.oid) as dinh_nghia
from pg_constraint c
where c.connamespace = 'public'::regnamespace
  and c.contype = 'c'
  and right(c.conname, 4) = '_chk'
order by bang, ten;


-- ==============================================================================
-- PHẦN 12 — CHỐNG RÒ RỈ HOA HỒNG: % phải nằm ở BẢNG RIÊNG, KHÔNG ở bảng công khai
-- `workshop_partners` là catalog ĐỌC CÔNG KHAI (anon + authenticated select được).
-- W11 đã di dời % hoa hồng sang bảng riêng `workshop_commission_terms` (chỉ admin).
-- 3 chốt chống tái phát:
--   (a) `workshop_partners.platform_commission_percent` phải KHÔNG tồn tại
--       (kỳ vọng `DA GO`). Thấy `CON — RO RI` ⇒ mọi khách đọc bảng này đều biết
--       % hoa hồng của từng xưởng ⇒ lộ biên lợi nhuận nền tảng.
--   (b) bảng `workshop_commission_terms` phải TỒN TẠI (kỳ vọng `CO`).
--   (c) bảng đó phải BẬT RLS và KHÔNG có policy nào cấp cho `anon`.
--       Lưu ý: policy cấp cho vai trò `public`/`authenticated` vẫn AN TOÀN nếu biểu
--       thức USING gọi `is_admin()` (fail-closed) — P12b in biểu thức thật để đọc.
-- ==============================================================================
select phan, doi_tuong, trang_thai, chi_tiet
from (
  select
    'P12 — chong ro ri hoa hong' as phan,
    'workshop_partners.platform_commission_percent' as doi_tuong,
    case when exists (
           select 1 from information_schema.columns
            where table_schema = 'public'
              and table_name = 'workshop_partners'
              and column_name = 'platform_commission_percent')
         then 'CON — RO RI' else 'DA GO' end as trang_thai,
    'ky vong DA GO: workshop_partners la bang doc cong khai' as chi_tiet,
    1 as nhom, 1 as xep
  union all
  select
    'P12 — chong ro ri hoa hong',
    'bang workshop_commission_terms',
    case when to_regclass('public.workshop_commission_terms') is null then 'THIEU' else 'CO' end,
    'ky vong CO: noi duy nhat giu % hoa hong, chi admin doc duoc',
    2, 1
  union all
  select
    'P12 — chong ro ri hoa hong',
    'RLS + policy cho anon cua workshop_commission_terms',
    case when r.oid is null then 'THIEU BANG'
         when not c.relrowsecurity then 'RLS TAT — RO RI'
         when exists (select 1 from pg_policies p
                       where p.schemaname = 'public'
                         and p.tablename = 'workshop_commission_terms'
                         and 'anon' = any (p.roles))
              then 'CO POLICY CHO ANON — RO RI'
         else 'OK (RLS bat, khong cap cho anon)' end,
    'ky vong OK; doc P12b de chac chan USING co is_admin()',
    3, 1
  from (select to_regclass('public.workshop_commission_terms') as oid) r
  left join pg_class c on c.oid = r.oid
) z
order by nhom, xep, doi_tuong;


-- P12b — policy thật trên bảng chứa % hoa hồng: đọc cột `vai_tro` + biểu thức USING.
select 'P12b — policy tren workshop_commission_terms' as phan,
       p.policyname as ten,
       array_to_string(p.roles, ', ') as vai_tro,
       p.cmd as lenh,
       coalesce(p.qual, '(khong co USING)') as using_bieu_thuc,
       coalesce(p.with_check, '(khong co WITH CHECK)') as with_check_bieu_thuc
from pg_policies p
where p.schemaname = 'public'
  and p.tablename = 'workshop_commission_terms'
order by p.policyname;
