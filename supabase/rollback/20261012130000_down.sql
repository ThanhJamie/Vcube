-- Rollback T35-mig — bỏ phát realtime trạng thái đơn cho admin.
--
-- Thứ tự bắt buộc: policy realtime.messages → trigger (đang phụ thuộc hàm) → hàm.
-- Mỗi bước có guard tồn tại để rollback không vỡ khi môi trường thiếu đối tượng.
begin;

-- 1. Bỏ policy trên realtime.messages (chỉ khi bảng tồn tại).
do $do$
begin
  if to_regclass('realtime.messages') is not null then
    drop policy if exists orders_admin_realtime on realtime.messages;
    raise notice 'OK    đã bỏ policy orders_admin_realtime';
  else
    raise notice 'SKIP  realtime.messages không tồn tại';
  end if;
end
$do$;

-- 2. Bỏ trigger trước hàm (trigger phụ thuộc hàm).
do $do$
begin
  if to_regclass('public.orders') is not null then
    drop trigger if exists trg_orders_broadcast on public.orders;
  end if;
end
$do$;

-- 3. Bỏ hàm trigger.
drop function if exists public.orders_broadcast_status();

commit;
