-- ==============================================================================
-- Rollback SEC-02 (T21) — trả lại trạng thái trước 20261012090000.
--   · Bỏ view chợ mở + RPC nhận việc.
--   · Khôi phục nhánh `designer_id is null` trong 2 policy designer select/update
--     (đúng nội dung 20261010_harden_rls.sql phần 5.4l).
-- ==============================================================================
begin;

drop view if exists public.open_design_requests;
drop function if exists public.claim_design_request(text);

drop policy if exists vcube_custom_design_requests_designer_select on public.custom_design_requests;
create policy vcube_custom_design_requests_designer_select
  on public.custom_design_requests
  for select
  to authenticated
  using (public.is_admin() or designer_id::text = (select auth.uid())::text or designer_id is null);

drop policy if exists vcube_custom_design_requests_designer_update on public.custom_design_requests;
create policy vcube_custom_design_requests_designer_update
  on public.custom_design_requests
  for update
  to authenticated
  using (public.is_admin() or designer_id::text = (select auth.uid())::text or designer_id is null)
  with check (public.is_admin() or designer_id::text = (select auth.uid())::text or designer_id is null);

commit;
