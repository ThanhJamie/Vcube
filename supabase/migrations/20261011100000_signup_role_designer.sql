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
