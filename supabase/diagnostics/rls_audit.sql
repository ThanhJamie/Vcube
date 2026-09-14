-- ==============================================================================
-- VCUBE — CHẨN ĐOÁN RLS (CHỈ ĐỌC, không thay đổi dữ liệu)
-- ==============================================================================
-- Chạy trong Supabase SQL Editor TRƯỚC và SAU khi chạy
-- supabase/migrations/20261010_harden_rls.sql để so sánh.
-- Script này chỉ SELECT, không UPDATE/INSERT/DELETE/DDL.
-- ==============================================================================

-- ── A. Bảng nào đang bật RLS ────────────────────────────────────────────────────
select c.relname                              as table_name,
       c.relrowsecurity                        as rls_enabled,
       c.relforcerowsecurity                   as rls_forced,
       (select count(*) from pg_policies p
         where p.schemaname = 'public' and p.tablename = c.relname) as policy_count
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relkind = 'r'
 order by c.relrowsecurity asc, c.relname;

-- ── B. TOÀN BỘ policy trên schema public ───────────────────────────────────────
select tablename,
       policyname,
       permissive,
       cmd,
       array_to_string(roles, ',')  as roles,
       coalesce(qual, '')           as using_expr,
       coalesce(with_check, '')     as check_expr
  from pg_policies
 where schemaname = 'public'
 order by tablename, policyname;

-- ── C. LỖ HỔNG: policy permissive không kiểm tra quyền ─────────────────────────
-- Bất kỳ dòng nào ở đây trên bảng nhạy cảm = đang hở.
select tablename,
       policyname,
       cmd,
       array_to_string(roles, ',') as roles,
       case
         when btrim(coalesce(qual, '')) = 'true' then 'USING (true)'
         when btrim(coalesce(with_check, '')) = 'true' then 'WITH CHECK (true)'
         when qual like '%user_metadata%' then 'dựa vào user_metadata (client tự đổi được!)'
         when qual like '%chithanhso10@gmail.com%' then 'email hardcode'
         else 'khác'
       end as lý_do
  from pg_policies
 where schemaname = 'public'
   and (
        btrim(coalesce(qual, '')) = 'true'
     or btrim(coalesce(with_check, '')) = 'true'
     or qual like '%user_metadata%'
     or with_check like '%user_metadata%'
     or qual like '%chithanhso10@gmail.com%'
     or with_check like '%chithanhso10@gmail.com%'
   )
 order by tablename, policyname;

-- ── D. Cột thực tế của orders / user_profiles (schema đang không thống nhất) ───
select table_name, ordinal_position, column_name, data_type, is_nullable, column_default
  from information_schema.columns
 where table_schema = 'public' and table_name in ('orders', 'user_profiles')
 order by table_name, ordinal_position;

-- ── E. pricing_config là TABLE hay VIEW? ───────────────────────────────────────
select c.relname, c.relkind,
       case c.relkind when 'r' then 'TABLE' when 'v' then 'VIEW' else c.relkind::text end as loai,
       (select option_value from pg_options_to_table(c.reloptions)
         where option_name = 'security_invoker') as security_invoker
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relname = 'pricing_config';

-- ── F. Vai trò & tài khoản chưa có profile ─────────────────────────────────────
select role, count(*) as so_luong
  from public.user_profiles group by role order by role;

select u.id, u.email, u.created_at
  from auth.users u
  left join public.user_profiles p on p.id::text = u.id::text
 where p.id is null
 order by u.created_at;

-- ── G. Trigger bảo vệ cột đặc quyền ────────────────────────────────────────────
select tgname, tgenabled, pg_get_triggerdef(t.oid) as dinh_nghia
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relname = 'user_profiles' and not t.tgisinternal;

-- ── H. Policy storage cho 2 bucket ─────────────────────────────────────────────
select policyname, cmd, array_to_string(roles, ',') as roles,
       coalesce(qual, '') as using_expr, coalesce(with_check, '') as check_expr
  from pg_policies
 where schemaname = 'storage' and tablename = 'objects'
   and (coalesce(qual, '') like '%product-images%' or coalesce(qual, '') like '%cad-files%'
        or coalesce(with_check, '') like '%product-images%' or coalesce(with_check, '') like '%cad-files%')
 order by policyname;

-- ── I. Realtime: bảng nào đã vào publication ───────────────────────────────────
select schemaname, tablename
  from pg_publication_tables
 where pubname = 'supabase_realtime'
 order by tablename;

-- ── J. Hàm helper đã tồn tại chưa ──────────────────────────────────────────────
select proname, prosecdef as security_definer, proconfig
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.proname in ('current_app_role', 'is_admin')
 order by proname;
