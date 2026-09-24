-- ==============================================================================
-- SEC-02 — Chợ yêu cầu CAD mở: view chỉ phơi cột không nhạy cảm + RPC nhận việc.
-- ==============================================================================
-- LỖ HỔNG
--   Hai policy designer của `custom_design_requests` (20261010_harden_rls.sql phần 5.4l)
--   chứa nhánh `designer_id is null` áp cho MỌI authenticated:
--       create policy ... for select to authenticated
--         using (public.is_admin() or designer_id = auth.uid() or designer_id is null)
--   ⇒ bất kỳ user đã đăng nhập đọc/nghi được yêu cầu CHƯA GÁN của khách hàng khác,
--     lộ client_name / messages / reference_files (PII + nội dung hội thoại).
--
-- CÁCH SỬA
--   1. View `public.open_design_requests` (security definer — KHÔNG security_invoker)
--      chỉ phơi cột brief không nhạy cảm, và CHỈ cho role designer/admin. Việc "view
--      bỏ qua RLS" ở đây là CHỦ Ý, nhưng bị chặn bởi:
--        · WHERE designer_id is null
--        · danh sách cột an toàn (không client_name/messages/reference_files/customer_id)
--        · target_specs được dựng lại chỉ với material/infill/nozzle — bỏ phone/email/
--          company nhúng bên trong target_specs (createRequest ghi chúng vào đây).
--   2. RPC `public.claim_design_request(p_id text)` security definer: UPDATE nguyên tử
--      (`where id = p_id and designer_id is null returning id`) — hai designer gọi
--      cùng lúc thì Postgres khoá hàng, chỉ một UPDATE trúng, người còn lại nhận NULL.
--   3. Gỡ nhánh `designer_id is null` khỏi 2 policy designer select/update.
--
-- ⚠️ id là `text` (không phải uuid) theo baseline `custom_design_requests.id`.
--
-- ⚠️ REALTIME (đã biết, KHÔNG mở rộng phạm vi): view KHÔNG phải nguồn
--   `postgres_changes`. Kênh `public:custom_design_requests` chạy theo RLS select của
--   người đăng ký, nên sau khi gỡ nhánh `designer_id is null`, designer sẽ KHÔNG còn
--   nhận sự kiện realtime cho hàng chưa nhận. Cần polling ngắn hoặc `realtime.send`
--   trong task riêng — xem báo cáo T21.
-- ==============================================================================

begin;

-- ---------- 1. View chợ mở (cột không nhạy cảm, chỉ designer/admin) ----------
drop view if exists public.open_design_requests;

create view public.open_design_requests
with (security_invoker = false) as
select
  r.id,
  r.title,
  r.budget,
  r.deadline,
  r.service_type,
  r.status,
  r.created_at,
  r.updated_at,
  jsonb_build_object(
    'material', coalesce(r.target_specs->>'material', ''),
    'infill',   coalesce(r.target_specs->>'infill', ''),
    'nozzle',   coalesce(r.target_specs->>'nozzle', '')
  ) as target_specs
from public.custom_design_requests r
where r.designer_id is null
  and public.current_app_role() in ('designer', 'admin');

comment on view public.open_design_requests is
  'Chợ yêu cầu CAD chưa gán: chỉ phơi cột brief không nhạy cảm cho designer/admin.';

revoke all on public.open_design_requests from public, anon;
grant select on public.open_design_requests to authenticated;

-- ---------- 2. RPC nhận việc nguyên tử ----------
create or replace function public.claim_design_request(p_id text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_uid uuid := (select auth.uid());
  v_id  text;
begin
  -- Chỉ designer/admin được nhận việc; khách hàng thường không thể tự gán mình.
  if v_uid is null
     or public.current_app_role() not in ('designer', 'admin') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  update public.custom_design_requests
     set designer_id = v_uid
   where id = p_id
     and designer_id is null
  returning id into v_id;

  return v_id;  -- NULL nếu đã bị người khác nhận (hoặc id không tồn tại)
end
$fn$;

revoke all on function public.claim_design_request(text) from public, anon;
grant execute on function public.claim_design_request(text) to authenticated;

-- ---------- 3. Gỡ nhánh `designer_id is null` khỏi policy designer ----------
-- Giữ đúng tên policy cũ để không nhân bản; nội dung còn lại y như harden 5.4l.
drop policy if exists vcube_custom_design_requests_designer_select on public.custom_design_requests;
create policy vcube_custom_design_requests_designer_select
  on public.custom_design_requests
  for select
  to authenticated
  using (public.is_admin() or designer_id::text = (select auth.uid())::text);

drop policy if exists vcube_custom_design_requests_designer_update on public.custom_design_requests;
create policy vcube_custom_design_requests_designer_update
  on public.custom_design_requests
  for update
  to authenticated
  using (public.is_admin() or designer_id::text = (select auth.uid())::text)
  with check (public.is_admin() or designer_id::text = (select auth.uid())::text);

commit;
