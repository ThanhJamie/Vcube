-- Rollback SEC-02 — bỏ chốt chặn cột đặc quyền của designer_profiles:
-- xoá trigger rồi xoá hàm. Policy `vcube_designer_profiles_owner_all` trở lại
-- cho chủ sở hữu UPDATE mọi cột như trước (đúng trạng thái trước 20261011110000).
begin;

drop trigger if exists trg_protect_designer_profile_privileged_columns on public.designer_profiles;
drop function if exists public.fn_protect_designer_profile_privileged_columns();

commit;
