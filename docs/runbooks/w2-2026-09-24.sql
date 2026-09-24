-- VCUBE — W2 BUNDLE 2026-09-24 (SEC-02 + CHECK constraints + orders broadcast)
-- Áp SAU khi đã áp bundle hotfix. Mỗi migration có begin/commit riêng.
-- LƯU Ý: 20261012130000 (broadcast) chạy PREFLIGHT realtime.send trước (xem header file).

-- ============================================================
-- >>> supabase/migrations/20261012090000_sec02_open_requests.sql
-- ============================================================
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

-- ============================================================
-- >>> supabase/migrations/20261012100000_check_constraints.sql
-- ============================================================
-- DB-03 / DB-04 / NEW-02 (T22b, quyết định D11) — CHECK cho các cột enum-like.
--
-- Chiến lược D11: `NOT VALID` → người vận hành audit dữ liệu thật → dọn → `VALIDATE`.
-- `add constraint ... not valid` KHÔNG quét bảng hiện có (không khoá lâu, không đỏ vì dữ
-- liệu cũ) nhưng VẪN thi hành cho mọi INSERT/UPDATE mới ⇒ không có cửa sổ dữ liệu bẩn mới.
--
-- Trạng thái thực tế (đã rà 2026-09-24, KHÁC giả định "4 cột đều trống"): 2/4 cột ĐÃ có
-- CHECK từ baseline §3c (20260901_baseline_schema.sql):
--   * `orders.status`             → `orders_status_chk`                     (dòng 802-810)
--   * `orders.status_stage_index` → `orders_status_stage_index_range_chk`    (dòng 777-784)
-- Để KHÔNG trùng tên và KHÔNG tạo 2 ràng buộc cùng nghĩa, hai cột này được thêm có GUARD
-- `if not exists` (no-op trên DB đã chạy baseline; chỉ thêm thật trên DB khuyết baseline).
-- Hai cột còn lại THIẾU CHECK và được thêm thật ở đây:
--   * `orders.payment_status`     → `orders_payment_status_chk`   (MỚI)
--   * `kyc_records.status`        → `kyc_records_status_chk`       (MỚI)
--
-- Tập giá trị cho phép = HỢP(default DB, union code). Từng khối nêu nguồn file:line.
begin;

-- 1. orders.payment_status — MỚI.
--    Union code: `OrderPaymentStatus` = src/types/index.ts:79
--      'awaiting_payment' | 'paid' | 'cod' | 'cancelled' | 'unpaid'.
--    Đường ghi thực tế:
--      * CheckoutView.tsx:141-142 → 'cod' | 'awaiting_payment' (đơn mới KHÔNG tự nhận 'paid').
--      * database.ts:369          → 'paid' | 'unpaid' (fallback).
--      * default DB 'unpaid'      (baseline 20260901, khối `orders`).
--    ⚠️ docs/database/schema.md:75 ghi 'pending'/'failed'/'refunded' — ĐÓ LÀ DRIFT: không giá
--    trị nào trong 3 nguồn trên. T11 (`schema-notes.md`) ghi lại chênh lệch 3 chiều này.
alter table public.orders add constraint orders_payment_status_chk
  check (payment_status in ('awaiting_payment','paid','cod','cancelled','unpaid')) not valid;

-- 2. kyc_records.status — MỚI.
--    Union code:
--      * database.ts:531 updateUserKyc — 'verified' | 'pending_review' | 'rejected' | 'unverified'
--      * Group3CustomersPanel.tsx:10 KycStatus — 'verified' | 'pending_review' | 'rejected' | 'unverified'
--      * types/index.ts:832 kycStatus — 'unverified' | 'pending' | 'verified' | 'rejected'
--      * docs/database/schema.md:77 liệt kê cùng tập cho `kyc_records.status`.
--    default DB 'pending' (baseline 20260901, khối `kyc_records`) — đã nằm trong tập.
--    'pending_review' BẮT BUỘC có: admin UI gộp 'pending' → 'pending_review'
--    (Group3CustomersPanel.tsx:35). Seed-sample-data.mjs:673 ghi 'pending'.
alter table public.kyc_records add constraint kyc_records_status_chk
  check (status in ('pending','pending_review','verified','rejected','unverified')) not valid;

-- 3. orders.status — ĐÃ CÓ `orders_status_chk` (baseline §3c). Guard chỉ để idempotent.
--    Union code: `Order['status']` = src/types/index.ts:86 (đúng 8 giá trị).
do $do$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'orders_status_chk'
       and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders add constraint orders_status_chk
      check (status in ('pending_payment','processing','printing','post_processing',
                        'packaging','shipping','completed','cancelled')) not valid;
    raise notice 'T22b: đã thêm orders_status_chk (DB chưa chạy baseline §3c)';
  else
    raise notice 'T22b: bỏ qua orders_status_chk — ràng buộc đã tồn tại';
  end if;
end
$do$;

-- 4. orders.status_stage_index — ĐÃ CÓ `orders_status_stage_index_range_chk` (baseline §3c).
--    Guard theo CẢ HAI tên để không tạo ràng buộc trùng nghĩa.
--    Nguồn 0..7: MES_PIPELINE_STAGES = src/frontend/components/OrderProgress.tsx:13-21
--    (ĐÚNG 8 nấc, step 1..8), useProductionStore.ts cùng 8 khoá, types/index.ts:88 "0 to 7".
do $do$
begin
  if not exists (
    select 1 from pg_constraint
     where conname in ('orders_status_stage_index_range_chk','orders_status_stage_index_chk')
       and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders add constraint orders_status_stage_index_chk
      check (status_stage_index >= 0 and status_stage_index <= 7) not valid;
    raise notice 'T22b: đã thêm orders_status_stage_index_chk (DB chưa chạy baseline §3c)';
  else
    raise notice 'T22b: bỏ qua status_stage_index — ràng buộc đã tồn tại';
  end if;
end
$do$;

commit;

-- ============================================================================
-- BƯỚC NGƯỜI VẬN HÀNH — CHẠY SAU (KHÔNG thuộc transaction trên)
-- ============================================================================
-- D11: sau `add ... not valid`, ràng buộc chỉ áp cho dòng MỚI. Trước khi `VALIDATE`
-- (quét toàn bảng và áp cho dòng CŨ) PHẢI audit + dọn dữ liệu. Chạy từng khối trong
-- SQL Editor với vai trò postgres.
--
-- (a) AUDIT — đếm giá trị thật đang có:
--   select payment_status, count(*) from public.orders      group by 1 order by 2 desc;
--   select status,         count(*) from public.kyc_records group by 1 order by 2 desc;
--   select status,         count(*) from public.orders      group by 1 order by 2 desc;
--   select status_stage_index, count(*) from public.orders  group by 1 order by 2 desc;
--
-- (b) TÌM DÒNG VI PHẠM (dòng cũ mà constraint mới sẽ từ chối):
--   select id, payment_status from public.orders
--    where payment_status not in ('awaiting_payment','paid','cod','cancelled','unpaid');
--   select id, status from public.kyc_records
--    where status not in ('pending','pending_review','verified','rejected','unverified');
--   select id, status from public.orders
--    where status not in ('pending_payment','processing','printing','post_processing',
--                         'packaging','shipping','completed','cancelled');
--   select id, status_stage_index from public.orders
--    where status_stage_index < 0 or status_stage_index > 7;
--
-- (c) DỌN — ánh xạ từng giá trị lạ về giá trị hợp lệ gần nghĩa nhất (KHÔNG bịa).
--     Ví dụ (SỬA theo kết quả audit thật, đây chỉ là mẫu):
--   -- update public.orders set payment_status = 'unpaid'
--   --  where payment_status not in ('awaiting_payment','paid','cod','cancelled','unpaid');
--   -- update public.kyc_records set status = 'pending'
--   --  where status not in ('pending','pending_review','verified','rejected','unverified');
--     Nếu audit cho thấy một giá trị HỢP LỆ bị thiếu trong tập (ví dụ dữ liệu cũ dùng
--     'refunded'), thì mở rộng tập: `drop constraint` rồi `add constraint ... not valid`
--     với tập mới, rồi mới validate — KHÔNG xoá dữ liệu thật để chiều constraint.
--     Ghi kết quả audit/chênh lệch vào báo cáo T11 `docs/database/schema-notes.md`.
--
-- (d) VALIDATE — sau khi (b) trả 0 dòng cho mọi cột:
--   alter table public.orders      validate constraint orders_payment_status_chk;
--   alter table public.kyc_records validate constraint kyc_records_status_chk;
--   -- Hai ràng buộc dưới đã validated trên DB chạy baseline §3c; lệnh là no-op an toàn:
--   alter table public.orders      validate constraint orders_status_chk;
--   alter table public.orders      validate constraint orders_status_stage_index_range_chk;
--
-- (e) KIỂM CHỨNG — tất cả phải `convalidated = true`:
--   select conname, convalidated from pg_constraint
--    where conrelid in ('public.orders'::regclass, 'public.kyc_records'::regclass)
--      and contype = 'c'
--    order by conname;

-- ============================================================
-- >>> supabase/migrations/20261012130000_orders_broadcast.sql
-- ============================================================
-- T35-mig — Realtime cập nhật trạng thái đơn hàng cho ADMIN (quyết định D6).
--
-- MỤC TIÊU: khi `public.orders.status` đổi (INSERT hoặc UPDATE OF status), phát một
-- sự kiện realtime TỐI THIỂU `{id, status}` tới kênh RIÊNG TƯ `orders:admin`.
--
-- ⚠️ KHÔNG dùng `realtime.broadcast_changes`: hàm đó gửi cả `new`/`old` = TOÀN BỘ hàng,
-- trong đó có `secure_access_token` (token truy cập đơn của khách) và PII (tên, SĐT,
-- địa chỉ). Chỉ `realtime.send` với payload tự chọn mới tránh được rò rỉ này.
--
-- ⚠️ PREFLIGHT — PHẢI KIỂM TRÊN PROJECT TRƯỚC KHI ÁP (SQL Editor, vai trò postgres):
--     select p.proname, pg_get_function_identity_arguments(p.oid) as args
--       from pg_proc p
--       join pg_namespace n on n.oid = p.pronamespace
--      where n.nspname = 'realtime' and p.proname = 'send';
--   Kỳ vọng: đúng một hàm `send(payload jsonb, event text, topic text, private boolean)`.
--   Nếu KHÔNG có (project chưa bật Supabase Realtime Authorization / phiên bản cũ),
--   DỪNG LẠI — trigger sẽ lỗi lúc runtime mỗi lần ghi `orders`.
--   Kiểm thêm bảng + hàm mà policy dựa vào (policy là cổng chặn thật):
--     select to_regclass('realtime.messages');   -- phải khác NULL
--     select p.proname from pg_proc p
--       join pg_namespace n on n.oid = p.pronamespace
--      where n.nspname = 'realtime' and p.proname = 'topic';
--
-- GHI CHÚ BẢO MẬT: policy trên `realtime.messages` chỉ cho `authenticated` SELECT
-- topic `orders:admin` khi `public.current_app_role() = 'admin'` (vai trò đọc từ DB,
-- không dùng user_metadata). Payload đã được tối giản từ trước nên kể cả lộ topic
-- cũng không lộ `secure_access_token`/PII.
--
-- DRAFT: file này do subagent soạn, CHƯA áp lên production. H áp theo §1.4 của
-- docs/tasks/DRIFT-TASKS.md (backup + SQL Editor + post-check).
begin;

-- ==============================================================================
-- 1. HÀM TRIGGER — phát `{id, status}` lên kênh riêng tư `orders:admin`
-- ==============================================================================
-- `security definer` + `search_path` gồm `realtime` để gọi được `realtime.send`
-- dù hàm bị giới hạn quyền cho role thường.
create or replace function public.orders_broadcast_status()
returns trigger
language plpgsql
security definer
set search_path = public, realtime, pg_temp
as $fn$
declare
  v_should_send boolean;
begin
  -- Dùng CASE (không dùng OR) để ĐẢM BẢO không đọc `old` khi INSERT: ở trigger
  -- INSERT, `old` chưa được gán; thứ tự ước lượng của AND/OR không được Postgres
  -- bảo đảm, còn CASE chỉ ước lượng nhánh được chọn.
  v_should_send := case
                     when tg_op = 'INSERT' then true
                     else new.status is distinct from old.status
                   end;

  if v_should_send then
    perform realtime.send(
      jsonb_build_object('id', new.id, 'status', new.status),
      'order_status',
      'orders:admin',
      true
    );
  end if;

  return new;
end
$fn$;

-- ==============================================================================
-- 2. TRIGGER — AFTER INSERT OR UPDATE OF status
-- ==============================================================================
do $do$
begin
  if to_regclass('public.orders') is not null then
    execute 'drop trigger if exists trg_orders_broadcast on public.orders';
    execute 'create trigger trg_orders_broadcast
               after insert or update of status on public.orders
               for each row execute function public.orders_broadcast_status()';
    raise notice 'OK    trigger phát trạng thái đơn lên orders:admin';
  else
    raise warning 'Bỏ qua trigger realtime: public.orders không tồn tại';
  end if;
end
$do$;

-- ==============================================================================
-- 3. POLICY TRÊN realtime.messages — chỉ admin đọc được topic `orders:admin`
-- ==============================================================================
-- Postgres KHÔNG có `create policy if not exists` ⇒ kiểm `pg_policies` trước.
do $do$
begin
  if to_regclass('realtime.messages') is null then
    raise warning 'Bỏ qua policy realtime.messages: bảng không tồn tại (Realtime Authorization chưa bật?)';
  elsif not exists (
    select 1
      from pg_policies
     where schemaname = 'realtime'
       and tablename  = 'messages'
       and policyname = 'orders_admin_realtime'
  ) then
    create policy orders_admin_realtime
      on realtime.messages
      for select
      to authenticated
      using (
        realtime.topic() = 'orders:admin'
        and public.current_app_role() = 'admin'
      );
    raise notice 'OK    policy realtime.messages: orders:admin chỉ admin';
  else
    raise notice 'SKIP  policy orders_admin_realtime đã tồn tại';
  end if;
end
$do$;

commit;

