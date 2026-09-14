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
