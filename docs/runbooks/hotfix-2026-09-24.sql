-- VCUBE — HOTFIX BUNDLE 2026-09-24 (SEC-01 + designer lifecycle + column guard)
-- Dán TOÀN BỘ file này vào Supabase SQL Editor và Run (mỗi migration có begin/commit riêng).
-- Rollback: xem supabase/rollback/*_down.sql tương ứng.

-- ============================================================
-- >>> supabase/migrations/20261011090000_sec01_designer_payout_hotfix.sql
-- ============================================================
-- SEC-01 hotfix (T0A-3): designer_profiles đang lộ bank_name/bank_account/tax_id
-- vì bảng bị `select('*')` ở client. Thu hẹp quyền SELECT cho anon/authenticated
-- xuống danh sách cột an toàn; đọc 3 cột nhạy cảm qua 2 RPC security definer.
-- UPDATE/INSERT giữ nguyên (chưa đụng); designer vẫn ghi được bank_* trực tiếp cho tới T20.
begin;
revoke select on public.designer_profiles from anon, authenticated;
grant  select (id, user_id, display_name, bio, portfolio_url, avatar_url, royalty_percent, verified_status, rating, total_sales, created_at, updated_at) on public.designer_profiles to anon, authenticated;
-- UPDATE/INSERT giữ nguyên (chưa đụng); designer vẫn ghi được bank_* trực tiếp cho tới T20.

create or replace function public.get_my_payout_info()
returns table(bank_name text, bank_account text, tax_id text)
language sql stable security definer set search_path = public, pg_temp as $$
  select p.bank_name, p.bank_account, p.tax_id
  from public.designer_profiles p
  where p.user_id = (select auth.uid())
$$;
revoke all on function public.get_my_payout_info() from public, anon;
grant execute on function public.get_my_payout_info() to authenticated;

create or replace function public.admin_get_designer_payout(p_designer_id uuid)
returns table(bank_name text, bank_account text, tax_id text)
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if public.current_app_role() <> 'admin' then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query select p.bank_name, p.bank_account, p.tax_id
               from public.designer_profiles p where p.id = p_designer_id;
end $$;
revoke all on function public.admin_get_designer_payout(uuid) from public, anon;
grant execute on function public.admin_get_designer_payout(uuid) to authenticated;
commit;

-- ============================================================
-- >>> supabase/migrations/20261011100000_signup_role_designer.sql
-- ============================================================
-- T58 — Đăng ký tự phục vụ vai trò "Nhà thiết kế" (designer).
--
-- BỐI CẢNH: trigger fn_create_profile_for_new_user() (định nghĩa lại ở
-- 20261010_harden_rls.sql mục 6b) luôn ghi user_profiles.role = 'customer' và
-- KHÔNG tạo designer_profiles. Vì vậy muốn có designer phải nhờ admin can thiệp tay.
--
-- MỤC TIÊU: cho phép người dùng tự chọn 'designer' ngay khi đăng ký, nhưng GIỮ
-- NGUYÊN nguyên tắc "quyền do DB quyết định": metadata do client gửi lên chỉ được
-- ánh xạ qua một guard ĐÓNG, và KHÔNG BAO GIỜ cấp 'admin'.
--
-- ⚠️ GUARD LEO THANG (dòng v_role bên dưới): chỉ 'designer' mới ánh xạ thành
-- 'designer'; MỌI giá trị khác — kể cả 'admin', 'lab', 'workshop' hay rác — đều
-- rơi về 'customer'. Không có nhánh nào chạm tới 'admin'.
--
-- Hồ sơ designer mới luôn verified_status = 'Pending' để admin duyệt sau
-- (VCUBE chưa xác minh danh tính ở bước đăng ký).
--
-- KHÔNG đụng fn_protect_profile_privileged_columns — hàm bảo vệ cột đặc quyền
-- vẫn nguyên vẹn.
begin;

create or replace function public.fn_create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_role text;
  v_name text;
begin
  -- Guard ĐÓNG: chỉ đúng 'designer' là designer; tất cả còn lại (admin, lab,
  -- workshop, null, rác…) → customer. Không tin bất kỳ giá trị nào khác.
  v_role := case
              when new.raw_user_meta_data->>'role' = 'designer' then 'designer'
              else 'customer'
            end;

  v_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    split_part(coalesce(new.email, 'user'), '@', 1)
  );

  begin
    insert into public.user_profiles (id, email, display_name, role)
    values (new.id, coalesce(new.email, ''), v_name, v_role)
    on conflict (id) do nothing;
  exception when others then
    null;  -- không được chặn việc tạo tài khoản vì lỗi profile
  end;

  -- Chỉ tạo hồ sơ designer khi và chỉ khi vai trò đã được guard xác nhận.
  -- Bọc try/catch riêng để thiếu bảng/tài nguyên cũng không chặn đăng ký.
  if v_role = 'designer' then
    begin
      insert into public.designer_profiles (user_id, display_name, verified_status)
      values (new.id, v_name, 'Pending')
      on conflict do nothing;
    exception when others then
      null;
    end;
  end if;

  return new;
end
$fn$;

-- Tái tạo trigger trên auth.users y như harden migration: bọc exception để môi
-- trường thiếu quyền không làm hỏng cả file (khi đó chạy bootstrap_admin.sql).
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

-- ============================================================
-- >>> supabase/migrations/20261011110000_designer_profile_column_guard.sql
-- ============================================================
-- SEC-02 — Chặn nhà thiết kế tự nâng quyền qua UPDATE trên designer_profiles.
--
-- LỖ HỔNG: policy `vcube_designer_profiles_owner_all` (20261010_harden_rls.sql:479-484)
-- cho chủ sở hữu UPDATE MỌI CỘT của hàng mình. Bảng lại đọc công khai
-- (`vcube_designer_profiles_public_read`) và T58 cho phép tự đăng ký designer
-- (20261011100000_signup_role_designer.sql) ⇒ một designer tự đăng ký có thể:
--     update public.designer_profiles
--        set royalty_percent = 100, verified_status = 'Verified', total_sales = 1e9
--      where user_id = (select auth.uid());
-- ⇒ tự nâng tỷ lệ chia hoa hồng, tự xác minh hồ sơ, tự thổi doanh số.
--
-- VÌ SAO TRIGGER: RLS là mức DÒNG, không phải mức CỘT — policy không giới hạn được
-- cột. Phải chặn ở tầng trigger, cùng khuôn `fn_protect_profile_privileged_columns`
-- (20261010_harden_rls.sql mục 6).
--
-- CƠ CHẾ: ALLOW-LIST, fail-closed y như `fn_protect_order_privileged_columns` (mục 6c).
-- So `to_jsonb(new) - v_allowed` với `to_jsonb(old) - v_allowed`; cột thêm vào bảng
-- sau này TỰ ĐỘNG thuộc nhóm bị chặn cho tới khi được thêm tường minh vào danh sách.
--
-- CHỈ `before update`: vector đã báo là UPDATE hàng của chính mình. Đường INSERT do
-- RLS owner_all + T58 kiểm soát (verified_status luôn 'Pending'); thêm `before insert`
-- sẽ cần nhánh TG_OP mà không tăng bảo vệ cho lỗ hổng này.
begin;

create or replace function public.fn_protect_designer_profile_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  -- Cột chủ hồ sơ được phép sửa. `bank_*` / `tax_id` còn ở bảng này cho tới khi T20
  -- tách chúng ra — chủ hồ sơ được tự cập nhật thông tin nhận tiền của mình.
  v_allowed text[] := array[
    'display_name','bio','portfolio_url','avatar_url',
    'bank_name','bank_account','tax_id','updated_at'
  ];
  v_uid     uuid;
  v_new     jsonb;
  v_old     jsonb;
  v_changed text;
begin
  -- Admin (public.is_admin() = public.current_app_role() = 'admin') bypass — đây là
  -- đường duyệt hồ sơ / gán royalty_percent / xác minh.
  if public.is_admin() then
    return new;
  end if;

  v_uid := (select auth.uid());

  -- auth.uid() NULL khi gọi bằng secret key / SQL Editor / service_role ⇒ đi qua, để
  -- không chặn nhầm đường quản trị hợp lệ (cùng lý do như mục 6d).
  if v_uid is null then
    return new;
  end if;

  -- Chỉ áp cho CHÍNH chủ hàng; người khác để RLS quyết định.
  if old.user_id is distinct from v_uid then
    return new;
  end if;

  v_new := to_jsonb(new) - v_allowed;
  v_old := to_jsonb(old) - v_allowed;

  if v_new is distinct from v_old then
    select string_agg(k, ', ' order by k)
      into v_changed
      from jsonb_object_keys(v_new) k
     where v_new -> k is distinct from v_old -> k;

    raise exception 'VCUBE: chủ hồ sơ thiết kế chỉ được đổi display_name/bio/portfolio_url/avatar_url/bank_name/bank_account/tax_id/updated_at (bị chặn: %)',
      coalesce(v_changed, '?')
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end
$fn$;

do $do$
begin
  if to_regclass('public.designer_profiles') is not null then
    execute 'drop trigger if exists trg_protect_designer_profile_privileged_columns on public.designer_profiles';
    execute 'create trigger trg_protect_designer_profile_privileged_columns
               before update on public.designer_profiles
               for each row execute function public.fn_protect_designer_profile_privileged_columns()';
    raise notice 'OK    trigger chống chủ hồ sơ thiết kế tự đổi cột đặc quyền trên public.designer_profiles';
  else
    raise warning 'Bỏ qua trigger designer_profiles: bảng không tồn tại';
  end if;
end
$do$;

commit;

