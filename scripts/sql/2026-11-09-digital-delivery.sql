-- ============================================================================
-- #14 — DIGITAL DELIVERY: cấp file CAD sau khi mua (idempotent, server-side)
-- Chưa áp production. Chạy sau 20261024090000_designer_publish.sql.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0) Khoá idempotency cho ON CONFLICT (order_id, storage_path)
--    Bảng hiện chưa có writer thường xuyên; vẫn kiểm trùng trước khi tạo index
--    để migration không làm sập môi trường đang có dữ liệu bẩn.
-- ---------------------------------------------------------------------------
do $do$
begin
  if exists (
    select 1
      from public.order_files
     group by order_id, storage_path
    having count(*) > 1
  ) then
    raise exception 'order_files có cặp (order_id, storage_path) trùng — dọn tay trước khi tạo unique index';
  end if;

  if not exists (
    select 1 from pg_indexes
     where schemaname = 'public' and indexname = 'ux_order_files_order_path'
  ) then
    execute 'create unique index ux_order_files_order_path
               on public.order_files (order_id, storage_path)';
  end if;
end
$do$;

-- ---------------------------------------------------------------------------
-- 1) Cấp file cho đơn đã thanh toán / đã được admin xác nhận
--    - Nguồn cấp quyền: order_items.fulfillment = 'digital' (admin ghi khi xác
--      nhận tiền) HOẶC orders.payment_status = 'paid'. KHÔNG dùng orders.items
--      vì cột đó do client gửi lên.
--    - Idempotent nhờ unique index ở bước 0.
--    - Trả 0 dòng khi đơn chưa đủ điều kiện (không phải lỗi).
-- ---------------------------------------------------------------------------
create or replace function public.finalize_digital_delivery(
  p_order_id text,
  p_token    text default null
)
returns table (
  id                 uuid,
  order_id           text,
  product_id         text,
  product_name       text,
  storage_path       text,
  license            text,
  file_format        text,
  file_size_bytes    bigint,
  watermark_required boolean,
  created_at         timestamptz
)
language plpgsql
security definer
set search_path = public
as $fn$
#variable_conflict use_column
declare
  v_uid   uuid := (select auth.uid());
  v_order public.orders%rowtype;
  v_ready boolean;
begin
  if p_order_id is null or btrim(p_order_id) = '' then
    raise exception 'Thiếu mã đơn hàng.' using errcode = '22023';
  end if;

  select * into v_order from public.orders where id = p_order_id;
  if not found then
    -- Không phân biệt "không tồn tại" với "không có quyền" để tránh dò mã đơn.
    raise exception 'Không có quyền với đơn hàng này.' using errcode = '42501';
  end if;

  -- Chủ đơn / admin-lab / khách có token (token >= 12 ký tự, so khớp tuyệt đối).
  if not (
       public.is_admin_or_lab()
       or (v_uid is not null and v_order.user_id = v_uid)
       or (v_order.user_id is null
           and p_token is not null
           and length(btrim(p_token)) >= 12
           and v_order.secure_access_token = btrim(p_token))
     ) then
    raise exception 'Không có quyền với đơn hàng này.' using errcode = '42501';
  end if;

  select (v_order.payment_status = 'paid')
         or exists (
              select 1
                from public.order_items oi
               where oi.order_id = v_order.id
                 and oi.fulfillment = 'digital'
            )
    into v_ready;

  if not v_ready then
    return;   -- 0 dòng: chưa thanh toán / chưa được admin xác nhận
  end if;

  insert into public.order_files (order_id, product_id, storage_path, license)
  select distinct
         v_order.id,
         da.product_id,
         da.storage_path,
         coalesce(nullif(btrim(da.license_type), ''), 'personal')
    from public.order_items oi
    join public.digital_assets da
      on da.product_id = oi.product_id
     and (oi.designer_id is null or da.designer_id = oi.designer_id)
   where oi.order_id = v_order.id
     and oi.fulfillment = 'digital'
     and da.storage_path is not null
     and btrim(da.storage_path) <> ''
  on conflict (order_id, storage_path) do nothing;

  return query
  select f.id, f.order_id, f.product_id, p.name, f.storage_path, f.license,
         coalesce(da.file_format, ''), da.file_size_bytes,
         coalesce(da.watermark_required, true), f.created_at
    from public.order_files f
    left join public.products p on p.id = f.product_id
    left join public.digital_assets da
           on da.product_id = f.product_id
          and da.storage_path = f.storage_path
   where f.order_id = v_order.id
   order by f.created_at;
end;
$fn$;

revoke all on function public.finalize_digital_delivery(text, text) from public;
revoke all on function public.finalize_digital_delivery(text, text) from anon;
grant execute on function public.finalize_digital_delivery(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 2) Đọc file của chính mình (kèm metadata buyer không đọc trực tiếp được)
--    p_order_id = null  => trả tất cả đơn của người gọi (dùng cho /assets).
--    Vẫn lọc ownership thủ công vì SECURITY DEFINER bỏ qua RLS.
-- ---------------------------------------------------------------------------
create or replace function public.get_my_order_files(p_order_id text default null)
returns table (
  id                 uuid,
  order_id           text,
  product_id         text,
  product_name       text,
  storage_path       text,
  license            text,
  file_format        text,
  file_size_bytes    bigint,
  watermark_required boolean,
  download_limit     int,
  created_at         timestamptz
)
language sql
stable
security definer
set search_path = public
as $fn$
  select f.id, f.order_id, f.product_id, p.name, f.storage_path, f.license,
         coalesce(da.file_format, ''), da.file_size_bytes,
         coalesce(da.watermark_required, true), da.download_limit, f.created_at
    from public.order_files f
    join public.orders o on o.id = f.order_id
    left join public.products p on p.id = f.product_id
    left join public.digital_assets da
           on da.product_id = f.product_id
          and da.storage_path = f.storage_path
   where (public.is_admin_or_lab() or o.user_id = (select auth.uid()))
     and (p_order_id is null or f.order_id = p_order_id)
   order by f.created_at desc;
$fn$;

revoke all on function public.get_my_order_files(text) from public;
revoke all on function public.get_my_order_files(text) from anon;
grant execute on function public.get_my_order_files(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 3) Gắn đơn khách vào tài khoản đang đăng nhập (điều kiện để tải file)
--    Chỉ gắn khi đơn CHƯA có chủ (user_id is null) hoặc đã là chính mình.
--    Token phải >= 12 ký tự và khớp tuyệt đối secure_access_token.
-- ---------------------------------------------------------------------------
create or replace function public.claim_guest_order(p_order_id text, p_token text)
returns boolean
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'Cần đăng nhập để gắn đơn.' using errcode = '42501';
  end if;

  if p_order_id is null or btrim(p_order_id) = ''
     or p_token is null or length(btrim(p_token)) < 12 then
    raise exception 'Thiếu mã đơn hoặc mã truy cập không hợp lệ.' using errcode = '22023';
  end if;

  update public.orders
     set user_id = v_uid,
         updated_at = now()
   where id = p_order_id
     and secure_access_token = btrim(p_token)
     and (user_id is null or user_id = v_uid);

  return found;
end;
$fn$;

revoke all on function public.claim_guest_order(text, text) from public;
revoke all on function public.claim_guest_order(text, text) from anon;
grant execute on function public.claim_guest_order(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 4) KHÔNG tạo policy storage mới.
--    Buyer authenticated đã có `vcube_cad_files_order_files_read` (20261010 §8.3):
--      bucket_id = 'cad-files'
--      and exists (order_files f join orders o
--                  where f.storage_path = storage.objects.name
--                    and (o.user_id = auth.uid() or is_admin_or_lab()))
--    Anon KHÔNG có quyền — khách phải claim_guest_order trước.
--    Chỉ kiểm tra policy tồn tại để migration fail sớm nếu môi trường thiếu.
-- ---------------------------------------------------------------------------
do $do$
begin
  if not exists (
    select 1 from pg_policies
     where schemaname = 'storage'
       and tablename = 'objects'
       and policyname = 'vcube_cad_files_order_files_read'
  ) then
    raise exception 'Thiếu policy storage vcube_cad_files_order_files_read — áp lại 20261010 §8.3';
  end if;
end
$do$;

comment on function public.finalize_digital_delivery(text, text) is
  'Cấp file CAD của đơn đã thanh toán/xác nhận vào order_files (idempotent). Chỉ authenticated; nguồn quyền là order_items digital + digital_assets, không dùng orders.items.';
comment on function public.get_my_order_files(text) is
  'Danh sách file của chính người gọi (admin/lab xem tất cả). Trả metadata từ digital_assets để buyer không cần đọc bảng đó.';
comment on function public.claim_guest_order(text, text) is
  'Gắn đơn khách (user_id null) vào tài khoản hiện tại khi secure_access_token khớp. Không đổi dữ liệu khác của đơn.';
