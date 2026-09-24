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
