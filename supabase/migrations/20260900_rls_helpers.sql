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
