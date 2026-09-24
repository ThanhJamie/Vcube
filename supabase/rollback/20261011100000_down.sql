-- Rollback T58 — trả fn_create_profile_for_new_user() về hành vi cũ:
-- LUÔN ghi user_profiles.role = 'customer' và KHÔNG tạo designer_profiles.
--
-- Tương đương trung thành với định nghĩa trong 20261010_harden_rls.sql mục 6b
-- (bản gốc dựng động bằng execute format vì kiểm tra cột display_name; baseline
-- 20260901 đã đảm bảo cột này tồn tại nên bản tĩnh dưới đây là tương đương).
--
-- LƯU Ý: các hàng designer_profiles đã tạo khi T58 bật KHÔNG bị xoá ở đây —
-- rollback chỉ khôi phục hành vi trigger. Dọn hồ sơ (nếu muốn) phải làm thủ công.
begin;

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
      coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email, 'user'), '@', 1)),
      'customer'
    )
    on conflict (id) do nothing;
  exception when others then
    null;  -- không được chặn việc tạo tài khoản vì lỗi profile
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
  raise notice 'OK    trigger tạo profile tự động trên auth.users';
exception when others then
  raise warning 'Không tạo được trigger trên auth.users (%): hãy chạy bootstrap_admin.sql cho từng tài khoản', sqlerrm;
end
$do$;

commit;
