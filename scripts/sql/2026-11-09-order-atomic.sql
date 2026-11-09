-- ============================================================================
-- PR-3 — SERVER BOUNDARY ATOMIC cho luồng đặt hàng
--
-- CHƯA ÁP PRODUCTION. Chạy sau:
--   supabase/migrations/20261024090000_designer_publish.sql
--   scripts/sql/2026-11-09-digital-delivery.sql   (RPC finalize_digital_delivery)
--
-- MỤC TIÊU
--   1) `create_order_atomic(p_order jsonb, p_items jsonb, p_idempotency_key text)`
--      ghi `orders` + `order_items` trong MỘT transaction; idempotent theo khoá
--      idempotency (unique index trên `orders.idempotency_key`).
--   2) `confirm_payment_atomic(p_order_id text, p_ref text)`
--      admin xác nhận đã nhận tiền: `orders.payment_status='paid'` +
--      `payment_transactions` + giao file số (`finalize_digital_delivery`) — atomic,
--      idempotent theo `payment_transactions.transaction_id` (UNIQUE sẵn có).
--
-- QUYẾT ĐỊNH VỀ ANON (ghi rõ theo yêu cầu PR)
--   Guest checkout LÀ luồng có thật (`vcube_orders_guest_insert` cho anon +
--   CheckoutView cho phép đặt không cần tài khoản). Vì vậy `create_order_atomic`
--   ĐƯỢC grant cho `anon` nhưng tự kiểm tra lại TOÀN BỘ điều kiện của policy:
--     * `user_id` LUÔN = `auth.uid()` (anon ⇒ null) — không tin `p_order.user_id`;
--     * `secure_access_token` do SERVER sinh (không nhận token yếu từ client);
--     * `customer_email` không rỗng; `items` là jsonb array;
--     * trạng thái khởi tạo bị ÉP: `status='pending_payment'`, `status_stage_index=0`;
--     * `payment_status` chỉ nhận `awaiting_payment|cod|unpaid` — client KHÔNG được
--       tạo đơn `paid` (nếu không sẽ tự cấp file số qua finalize_digital_delivery).
--   `confirm_payment_atomic` thì KHÔNG grant anon: chỉ admin (hoặc service_role).
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 0) KHOÁ IDEMPOTENCY CHO `orders`
--    Bảng hiện CHƯA có cột này. Unique index có điều kiện để các đơn cũ (NULL)
--    không vướng ràng buộc.
-- ---------------------------------------------------------------------------
alter table public.orders add column if not exists idempotency_key text;

create unique index if not exists ux_orders_idempotency_key
  on public.orders (idempotency_key)
  where idempotency_key is not null;

comment on column public.orders.idempotency_key is
  'Khoá idempotency do client sinh cho MỖI lần đặt hàng (retry dùng lại cùng khoá). UNIQUE có điều kiện.';

-- ---------------------------------------------------------------------------
-- 1) TẠO ĐƠN ATOMIC
--
--    p_order  : snapshot đơn (snake_case) — CHỈ các trường được whitelist dưới đây
--               được đọc; mọi khoá khác bị bỏ qua.
--    p_items  : jsonb array dòng `order_items` (có thể '[]'). Mỗi phần tử cần:
--               product_id, seller_type ('platform'|'designer'),
--               fulfillment ('print'|'digital'), quantity, unit_price, line_total;
--               tuỳ chọn: id, workshop_id, designer_id, *snapshot.
--               Hiện CheckoutView gửi [] vì seller_type/royalty chỉ được chốt khi
--               admin xác nhận tiền (FL-7); khi có dữ liệu thật thì insert cùng
--               transaction với `orders`.
--    p_idempotency_key : BẮT BUỘC, >= 16 ký tự (client: crypto.randomUUID()).
--
--    Trả về: order_id, order_number, secure_access_token của đơn VỪA TẠO hoặc đơn
--    ĐÃ TẠO TRƯỚC ĐÓ với cùng khoá (idempotent). `created` = true/false ở cột
--    thứ tư để caller biết đây là lần tạo mới hay lần retry.
-- ---------------------------------------------------------------------------
create or replace function public.create_order_atomic(
  p_order            jsonb,
  p_items            jsonb,
  p_idempotency_key  text
)
returns table (
  order_id             text,
  order_number         text,
  secure_access_token  text,
  created              boolean
)
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_uid             uuid := (select auth.uid());
  v_key             text := nullif(btrim(coalesce(p_idempotency_key, '')), '');
  v_existing        public.orders%rowtype;
  v_id              text;
  v_order_number    text;
  v_token           text;
  v_payment_status  text;
  v_customer_email  text;
  v_assigned        text;
  v_attempt         int := 0;
  v_item            jsonb;
  v_item_id         uuid;
begin
  if p_order is null or jsonb_typeof(p_order) <> 'object' then
    raise exception 'Dữ liệu đơn hàng không hợp lệ.' using errcode = '22023';
  end if;

  if v_key is null or length(v_key) < 16 then
    raise exception 'Thiếu hoặc sai khoá idempotency (cần >= 16 ký tự).' using errcode = '22023';
  end if;

  if p_items is not null and jsonb_typeof(p_items) <> 'array' then
    raise exception 'Danh sách dòng đơn (p_items) phải là JSON array.' using errcode = '22023';
  end if;

  -- (1) Idempotency — đã có đơn với cùng khoá thì trả lại đơn đó.
  select * into v_existing
    from public.orders o
   where o.idempotency_key = v_key;

  if found then
    if v_existing.user_id is not distinct from v_uid then
      return query select v_existing.id, v_existing.order_number,
                          v_existing.secure_access_token, false;
      return;
    end if;
    raise exception 'Khoá idempotency đã dùng cho một đơn khác.' using errcode = '23505';
  end if;

  -- (2) Kiểm tra tối thiểu — phản chiếu policy `vcube_orders_guest_insert`.
  v_customer_email := nullif(btrim(coalesce(p_order ->> 'customer_email', '')), '');
  if v_customer_email is null then
    raise exception 'Đơn hàng thiếu email liên hệ.' using errcode = '22023';
  end if;

  if p_order -> 'items' is null or jsonb_typeof(p_order -> 'items') <> 'array' then
    raise exception 'Đơn hàng thiếu snapshot items (JSON array).' using errcode = '22023';
  end if;

  -- (3) Trạng thái khởi tạo bị ÉP bởi server (không tin client).
  v_payment_status := nullif(btrim(coalesce(p_order ->> 'payment_status', '')), '');
  if v_payment_status is null
     or v_payment_status not in ('awaiting_payment', 'cod', 'unpaid') then
    v_payment_status := 'awaiting_payment';
  end if;

  -- Chỉ admin mới được gán xưởng ngay khi tạo đơn; khách không tự định tuyến.
  v_assigned := null;
  if public.is_admin() then
    v_assigned := nullif(btrim(coalesce(p_order ->> 'assigned_workshop_id', '')), '');
  end if;

  v_id := nullif(btrim(coalesce(p_order ->> 'id', '')), '');
  if v_id is null then
    v_id := 'ord-' || replace(gen_random_uuid()::text, '-', '');
  end if;

  v_order_number := nullif(btrim(coalesce(p_order ->> 'order_number', '')), '');
  if v_order_number is null then
    v_order_number := 'VCUBE-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  end if;

  -- Token tra cứu do SERVER sinh — không nhận token do client gửi.
  v_token := 'sec_' || replace(gen_random_uuid()::text, '-', '');

  -- (4) Insert `orders` + `order_items` trong cùng transaction. Vòng lặp chỉ để
  --     xử lý tranh chấp UNIQUE (idempotency/order_number/id), không bắt lỗi khác.
  loop
    v_attempt := v_attempt + 1;
    begin
      insert into public.orders (
        id, order_number, user_id, date, estimated_delivery,
        status, status_stage_index, layer_progress,
        customer_email, customer_name, customer_phone, customer_type,
        total_amount, shipping_fee, payment_method, payment_status,
        secure_access_token, items, shipping_address, carrier, payment,
        assigned_workshop_id, notes, idempotency_key, created_at, updated_at
      ) values (
        v_id,
        v_order_number,
        v_uid,
        coalesce(nullif(btrim(p_order ->> 'date'), '')::timestamptz, now()),
        coalesce(p_order ->> 'estimated_delivery', ''),
        'pending_payment',
        0,
        0,
        v_customer_email,
        coalesce(p_order ->> 'customer_name', ''),
        coalesce(p_order ->> 'customer_phone', ''),
        case when v_uid is null then 'guest' else 'registered' end,
        coalesce(nullif(p_order ->> 'total_amount', '')::numeric, 0),
        coalesce(nullif(p_order ->> 'shipping_fee', '')::numeric, 0),
        coalesce(nullif(btrim(p_order ->> 'payment_method'), ''), 'cod'),
        v_payment_status,
        v_token,
        coalesce(p_order -> 'items', '[]'::jsonb),
        coalesce(p_order -> 'shipping_address', '{}'::jsonb),
        coalesce(p_order -> 'carrier', '{}'::jsonb),
        coalesce(p_order -> 'payment', '{}'::jsonb),
        v_assigned,
        coalesce(p_order ->> 'notes', ''),
        v_key,
        now(),
        now()
      );

      -- Dòng tiền (nếu caller đã biết seller_type/royalty). Không suy đoán:
      -- thiếu seller_type hợp lệ ⇒ raise, caller phải gửi dữ liệu thật.
      if p_items is not null and jsonb_array_length(p_items) > 0 then
        if jsonb_array_length(p_items) > 200 then
          raise exception 'Đơn hàng có quá nhiều dòng (tối đa 200).' using errcode = '22023';
        end if;

        for v_item in select * from jsonb_array_elements(p_items)
        loop
          if jsonb_typeof(v_item) <> 'object' then
            raise exception 'Dòng đơn không hợp lệ (phải là object).' using errcode = '22023';
          end if;
          if nullif(btrim(coalesce(v_item ->> 'product_id', '')), '') is null then
            raise exception 'Dòng đơn thiếu product_id.' using errcode = '22023';
          end if;
          if coalesce(v_item ->> 'seller_type', '') not in ('platform', 'designer') then
            raise exception 'Dòng đơn thiếu seller_type hợp lệ (platform|designer).' using errcode = '22023';
          end if;
          if coalesce(v_item ->> 'fulfillment', '') not in ('print', 'digital') then
            raise exception 'Dòng đơn thiếu fulfillment hợp lệ (print|digital).' using errcode = '22023';
          end if;

          v_item_id := null;
          if nullif(btrim(coalesce(v_item ->> 'id', '')), '') is not null then
            v_item_id := (v_item ->> 'id')::uuid;
          else
            v_item_id := gen_random_uuid();
          end if;

          insert into public.order_items (
            id, order_id, product_id, seller_type, fulfillment, quantity,
            unit_price, line_total, workshop_id, designer_id,
            workshop_commission_percent_snapshot, royalty_percent_snapshot,
            workshop_payout_amount, designer_payout_amount, platform_fee_amount
          ) values (
            v_item_id,
            v_id,
            v_item ->> 'product_id',
            v_item ->> 'seller_type',
            v_item ->> 'fulfillment',
            coalesce(nullif(v_item ->> 'quantity', '')::int, 1),
            coalesce(nullif(v_item ->> 'unit_price', '')::numeric, 0),
            coalesce(nullif(v_item ->> 'line_total', '')::numeric, 0),
            nullif(btrim(coalesce(v_item ->> 'workshop_id', '')), ''),
            (nullif(btrim(coalesce(v_item ->> 'designer_id', '')), ''))::uuid,
            (nullif(v_item ->> 'workshop_commission_percent_snapshot', ''))::numeric,
            (nullif(v_item ->> 'royalty_percent_snapshot', ''))::numeric,
            (nullif(v_item ->> 'workshop_payout_amount', ''))::numeric,
            (nullif(v_item ->> 'designer_payout_amount', ''))::numeric,
            (nullif(v_item ->> 'platform_fee_amount', ''))::numeric
          );
        end loop;
      end if;

      exit;
    exception when unique_violation then
      if v_attempt >= 3 then
        raise;
      end if;

      -- Tranh chấp idempotency: một transaction khác vừa tạo đơn cùng khoá.
      select * into v_existing
        from public.orders o
       where o.idempotency_key = v_key;
      if found and v_existing.user_id is not distinct from v_uid then
        return query select v_existing.id, v_existing.order_number,
                            v_existing.secure_access_token, false;
        return;
      end if;

      -- Tranh chấp id/order_number: sinh lại phần bị trùng rồi thử lại.
      if exists (select 1 from public.orders o where o.id = v_id) then
        v_id := 'ord-' || replace(gen_random_uuid()::text, '-', '');
      end if;
      v_order_number := 'VCUBE-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    end;
  end loop;

  return query select v_id, v_order_number, v_token, true;
end;
$fn$;

revoke all on function public.create_order_atomic(jsonb, jsonb, text) from public;
-- Guest checkout là luồng có thật ⇒ cho anon gọi; mọi điều kiện an toàn đã được
-- kiểm tra lại BÊN TRONG hàm (xem khối chú thích đầu file).
grant execute on function public.create_order_atomic(jsonb, jsonb, text) to anon, authenticated;

comment on function public.create_order_atomic(jsonb, jsonb, text) is
  'Tạo orders + order_items trong 1 transaction; idempotent theo orders.idempotency_key. Guest (anon) được gọi nhưng user_id/token/status/payment_status do server quyết định.';

-- ---------------------------------------------------------------------------
-- 2) XÁC NHẬN THANH TOÁN ATOMIC (admin / service_role)
--
--    - Cập nhật `orders.payment_status='paid'` + snapshot `payment` (isPaid/status/
--      paidDate), chuyển đơn `pending_payment` ⇒ `processing` (nấc >= 1).
--    - Ghi `payment_transactions` với `transaction_id = p_ref` (hoặc
--      'manual_<order_id>' khi không có ref) — UNIQUE sẵn có ⇒ idempotent.
--    - Nếu đơn có dòng `order_items.fulfillment='digital'` thì gọi
--      `finalize_digital_delivery` trong CÙNG transaction.
--
--    KHÔNG tính lại tiền/phí (cần pricing config + order_items — việc của FL-7);
--    RPC chỉ chốt trạng thái thanh toán và cấp file.
-- ---------------------------------------------------------------------------
create or replace function public.confirm_payment_atomic(
  p_order_id  text,
  p_ref       text default null
)
returns table (
  already_paid            boolean,
  payment_transaction_id  text,
  finalized_files         int
)
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_order        public.orders%rowtype;
  v_tx           public.payment_transactions%rowtype;
  v_ref          text := nullif(btrim(coalesce(p_ref, '')), '');
  v_tx_id        text;
  v_files        int := 0;
  v_is_service   boolean := coalesce((select auth.jwt() ->> 'role'), '') = 'service_role';
begin
  -- Chỉ admin thật hoặc service_role (webhook/server). KHÔNG cho người dùng tự
  -- đánh dấu đơn của mình là đã thanh toán.
  if not v_is_service and not public.is_admin() then
    raise exception 'Chỉ quản trị viên được xác nhận thanh toán.' using errcode = '42501';
  end if;

  if p_order_id is null or btrim(p_order_id) = '' then
    raise exception 'Thiếu mã đơn hàng.' using errcode = '22023';
  end if;

  select * into v_order from public.orders o where o.id = p_order_id;
  if not found then
    raise exception 'Không tìm thấy đơn hàng.' using errcode = '22023';
  end if;

  -- (1) Idempotency theo mã giao dịch (nếu caller cung cấp ref).
  if v_ref is not null then
    select * into v_tx
      from public.payment_transactions pt
     where pt.transaction_id = v_ref;
    if found then
      if v_tx.order_id is distinct from p_order_id then
        raise exception 'Mã giao dịch đã dùng cho đơn khác.' using errcode = '23505';
      end if;
      return query select true, v_tx.id, 0;
      return;
    end if;
  end if;

  -- (2) Đơn đã paid ⇒ không ghi thêm giao dịch.
  if v_order.payment_status = 'paid' then
    select * into v_tx
      from public.payment_transactions pt
     where pt.order_id = p_order_id
     order by pt.created_at desc
     limit 1;
    return query select true, v_tx.id, 0;
    return;
  end if;

  -- (3) Ghi giao dịch — transaction_id UNIQUE chống ghi trùng khi 2 admin bấm cùng lúc.
  v_tx_id := 'pt_' || replace(gen_random_uuid()::text, '-', '');
  v_ref := coalesce(v_ref, 'manual_' || p_order_id);

  begin
    insert into public.payment_transactions (
      id, order_id, transaction_id, amount, payment_gateway, payload, status, created_at
    ) values (
      v_tx_id,
      p_order_id,
      v_ref,
      coalesce(v_order.total_amount, 0),
      'manual',
      jsonb_build_object(
        'source', 'confirm_payment_atomic',
        'ref', v_ref,
        'confirmed_at', now()
      ),
      'paid',
      now()
    );
  exception when unique_violation then
    select * into v_tx
      from public.payment_transactions pt
     where pt.transaction_id = v_ref;
    if found and v_tx.order_id = p_order_id then
      return query select true, v_tx.id, 0;
      return;
    end if;
    raise;
  end;

  -- (4) Chốt trạng thái đơn (giữ status khác pending_payment nếu đơn đã đi xa hơn).
  update public.orders o
     set payment_status = 'paid',
         payment = jsonb_set(
                     jsonb_set(
                       jsonb_set(
                         coalesce(o.payment, '{}'::jsonb),
                         '{isPaid}', 'true'::jsonb, true
                       ),
                       '{status}', '"paid"'::jsonb, true
                     ),
                     '{paidDate}', to_jsonb(now()), true
                   ),
         status = case
                    when o.status = 'pending_payment' then 'processing'
                    else o.status
                  end,
         status_stage_index = greatest(coalesce(o.status_stage_index, 0), 1),
         updated_at = now()
   where o.id = p_order_id;

  -- (5) Giao file số trong cùng transaction (idempotent nhờ ux_order_files_order_path).
  if exists (
    select 1
      from public.order_items oi
     where oi.order_id = p_order_id
       and oi.fulfillment = 'digital'
  ) then
    select count(*) into v_files
      from public.finalize_digital_delivery(p_order_id, null);
  end if;

  return query select false, v_tx_id, v_files;
end;
$fn$;

revoke all on function public.confirm_payment_atomic(text, text) from public;
revoke all on function public.confirm_payment_atomic(text, text) from anon;
grant execute on function public.confirm_payment_atomic(text, text) to authenticated;

comment on function public.confirm_payment_atomic(text, text) is
  'Admin/service_role xác nhận đã nhận tiền: orders.payment_status=paid + payment_transactions + finalize_digital_delivery trong 1 transaction; idempotent theo transaction_id/trạng thái paid.';

commit;
