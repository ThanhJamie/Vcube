# Giao file số sau khi mua (digital delivery)

> Trạng thái: **DRAFT — thiết kế, CHƯA chạy migration, CHƯA sửa code** (2026-11-09).
> Phạm vi: làm cho luồng “mua file CAD → tải được” chạy đúng, an toàn, không bịa dữ liệu.
> Migration đề xuất: **#14 `20261025090000_digital_delivery.sql`** (số thứ tự nối tiếp chuỗi 13 file hiện có).

---

## 1. Hiện trạng & lỗ hổng

- **Checkout chỉ ghi `orders`.** `CheckoutView` → `OrderService.createOrder` → `dbService.saveOrder` chỉ `insert` bảng `orders`; không ghi `order_files`, không gắn file. Khách vãng lai còn không có `user_id` (chỉ có `secure_access_token`).
- **Không có luồng ghi `order_files` phía người mua.** Chỉ `OrderService.confirmManualPayment` (admin, client-side) bước 3c mới `insertOrderFiles`. Nếu admin không xác nhận, hoặc bước 3c fail/không có `digital_assets` lúc đó, đơn vĩnh viễn không có file.
- **Người mua không đọc được `digital_assets`.** Policy chỉ có `vcube_digital_assets_designer_all` + admin (`20261010` §5.4f). Vì vậy buyer không biết `storage_path`, `file_format`, `file_size_bytes`, `license_type`, `download_limit`.
- **`/assets` đang là UI trung thực nhưng rỗng nghĩa.** `AssetLibraryView` suy `assets` từ `orders.items`, không có `storagePath` ⇒ luôn hiện “Chưa hỗ trợ tải trực tiếp”.
- **Storage `cad-files`:** đã có policy đọc cho **buyer authenticated** dựa trên `order_files` (`vcube_cad_files_order_files_read`), designer chỉ trong `digital/<uid>/` và `cad/<uid>/`, admin toàn quyền. **Anon không có quyền nào** ⇒ khách vãng lai không thể `createSignedUrl` dù có token.
- **`order_files` thiếu khoá duy nhất `(order_id, storage_path)`** ⇒ không thể `ON CONFLICT` để idempotent; gọi lặp sẽ nhân bản dòng.
- **Bẫy bảo mật quan trọng:** storage policy tin tuyệt đối vào `order_files.storage_path`. Ai **ghi được** `order_files` thì **đọc được** object bất kỳ trong bucket. Vì thế tuyệt đối không mở quyền INSERT `order_files` cho buyer/anon (xem PA2).
- **`orders.items` do client gửi lên** (không được admin kiểm chứng). Không được dùng `orders.items` làm căn cứ cấp quyền tải file.

---

## 2. Thiết kế đề xuất

### PA1 — RPC `SECURITY DEFINER` (KHUYẾN NGHỊ)

Một cửa ghi duy nhất ở server, dựa trên dữ liệu **admin đã xác nhận**:

1. `finalize_digital_delivery(p_order_id, p_token default null)` — kiểm quyền (chủ đơn / admin-lab / token khách), kiểm điều kiện thanh toán, `insert ... select` từ `order_items` ⨝ `digital_assets` vào `order_files`, `on conflict do nothing`, trả danh sách file (kèm metadata từ `digital_assets`).
2. `get_my_order_files(p_order_id default null)` — trả file của chính người gọi (join `products` + `digital_assets` để có tên/định dạng/dung lượng mà buyer không đọc trực tiếp được). Đây là *lớp đọc tiện dụng*; policy `vcube_order_files_buyer_read` vẫn là cổng chặn thật.
3. `claim_guest_order(p_order_id, p_token)` — gắn đơn khách (`user_id is null`) vào tài khoản đang đăng nhập khi token đúng. Sau đó buyer authenticated dùng được toàn bộ policy sẵn có.

**Đọc file:** dùng `createSignedUrl` sẵn có (`fileStorage.ts`, TTL 60s) — **không cần policy storage mới** cho buyer authenticated, vì `vcube_cad_files_order_files_read` đã khớp `order_files.storage_path = storage.objects.name` + `orders.user_id = auth.uid()`.

**Khách vãng lai:** khuyến nghị **bắt buộc đăng nhập + claim đơn bằng token** (một RPC, không cần service key). Tải file chỉ bằng token, không cần tài khoản, cần **Edge Function giữ `SUPABASE_SECRET_KEY`** để ký URL — để dành **PA1b** (ngoài scope đợt này) vì repo là Vite SPA, không có server runtime.

### PA2 — Client tự `insert order_files` + policy buyer/anon (KHÔNG CHỌN)

- Policy `insert` cho buyer/anon không thể diễn đạt “token hợp lệ” trong RLS (policy không nhận tham số request). Nới cho anon = **ai cũng tự cấp file cho mình**.
- Ngay cả khi chỉ cho buyer authenticated `with check order.user_id = auth.uid()`, buyer vẫn chèn được `storage_path` tuỳ ý. Storage policy `order_files.storage_path = name` sẽ **cấp quyền đọc object bất kỳ** trong `cad-files` (đường dẫn có thể dò/đoán từ log, referral, hoặc lỗi khác). Đây là leo thang đặc quyền, không thể vá bằng RLS.
- Không idempotent, không atomic, phụ thuộc client.

Kết luận: **PA1**. `order_files` chỉ được ghi bởi `SECURITY DEFINER` (và admin/lab như hiện tại).

---

## 3. SQL đầy đủ (ĐỀ XUẤT — chưa chạy)

File: `supabase/migrations/20261025090000_digital_delivery.sql`

```sql
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
```

Ghi chú thiết kế:

- **Không** cấp file ở thời điểm checkout cho đơn chưa thanh toán; `finalize` trả 0 dòng. Điểm cấp quyền thật là lúc admin xác nhận tiền (hoặc lần đầu mở `/assets` sau khi đơn đã `paid`).
- `license` lấy từ `digital_assets.license_type`; `NULL` (designer chưa khai) ⇒ `'personal'` theo default hiện có của cột, **không bịa** giá trị khác.
- Nếu một sản phẩm có nhiều `digital_assets` (nhiều định dạng), tất cả được cấp — xem câu hỏi PO #4.
- Nhánh `p_token` trong `finalize` **chỉ ghi** `order_files`; quyền đọc storage vẫn đòi `orders.user_id = auth.uid()`. Vì RPC chỉ grant cho `authenticated`, khách phải gọi `claim_guest_order` trước khi tải (hoặc admin backfill).

---

## 4. Luồng client sau khi duyệt

### 4.1 Checkout — `src/frontend/views/CheckoutView.tsx`

Sau `OrderService.createOrder(...)` thành công, **chỉ khi đã đăng nhập và đơn có item `digital`**, gọi best-effort:

```ts
// idempotent; đơn chưa thanh toán => 0 dòng, KHÔNG phải lỗi
if (user && newOrder.items.some((i) => i.type === 'digital')) {
  await dbService.finalizeDigitalDelivery(savedOrder.id, savedOrder.secureAccessToken);
}
```

- Guest: bỏ qua (RPC chỉ grant cho `authenticated`), không chặn màn hình thành công.
- Lỗi RPC không được biến đơn thành “thất bại” — đơn đã nằm trong DB; chỉ log + để lần mở `/assets` tự chữa.

### 4.2 Admin xác nhận thanh toán — `src/backend/services/orderService.ts`

Giữ nguyên bước 3c hiện tại (đã ghi `order_files` từ `digital_assets`). **Khuyến nghị refactor tối thiểu:** thay `dbService.insertOrderFiles(fileRows)` bằng gọi `finalize_digital_delivery(orderId)` sau khi đã ghi `order_items`, để chỉ còn **một** đường ghi và tự idempotent. Không bắt buộc trong đợt này.

### 4.3 Thư viện `/assets` — `useOrdersData` + `AssetLibraryView`

`AssetLibraryView` đã `ProtectedRoute`, đã có `AssetService.createSignedUrl`. Chỉ cần đổi nguồn `assets`:

```ts
// src/backend/supabase/database.ts
async getMyOrderFiles(orderId?: string) {
  const { data, error } = await supabase.rpc('get_my_order_files', {
    p_order_id: orderId ?? null,
  });
  if (error) throw new Error(`Không tải được thư viện tệp: ${error.message}`);
  return data ?? [];
}
```

```ts
// useOrdersData: thay khối suy assets từ orders.items
const files = await dbService.getMyOrderFiles();      // 1 lần cho tất cả đơn
setAssets(files.map((f) => ({
  id: f.id,
  name: f.product_name || f.product_id,
  designer: '—',                                       // chưa có nguồn thật trong RPC
  format: (f.file_format || '—') as DigitalAsset['format'],
  license: f.license as DigitalAsset['license'],
  purchaseDate: new Date(f.created_at).toLocaleDateString('vi-VN'),
  downloadsCount: 0,                                   // KHÔNG hiển thị nếu chưa đếm thật
  maxDownloads: f.download_limit == null ? 'Không giới hạn' : String(f.download_limit),
  fileSize: formatCadFileSize(f.file_size_bytes),
  image: '',                                           // lấy từ products nếu cần
  storagePath: f.storage_path,                         // ✅ bật nút tải
})));
```

Tải: `AssetService.createSignedUrl(asset.storagePath)` (TTL 60s, đã có). Không đổi `AssetLibraryView` ngoài việc bỏ banner “chưa hỗ trợ” khi `storagePath` tồn tại.

### 4.4 Fallback trung thực (bắt buộc)

| Tình huống | UI |
|---|---|
| `storagePath` rỗng (dữ liệu cũ) | “Chưa có vị trí tệp — liên hệ hỗ trợ”, không hiện nút giả |
| RPC trả 0 dòng vì chưa thanh toán | “Tệp sẽ mở sau khi thanh toán được xác nhận” |
| `createSignedUrl` lỗi | Toast lỗi thật; không thông báo “đã tải” |
| Khách vãng lai | “Đăng nhập + gắn đơn bằng mã truy cập để tải” (`claim_guest_order`) |
| Đơn không có `digital_assets` | “Sản phẩm chưa có tệp số” — không bịa đường dẫn |

---

## 5. Rollback & an toàn

### 5.1 Rollback (không xoá dữ liệu)

```sql
drop function if exists public.finalize_digital_delivery(text, text);
drop function if exists public.get_my_order_files(text);
drop function if exists public.claim_guest_order(text, text);
drop index  if exists public.ux_order_files_order_path;
```

- Các dòng `order_files` đã cấp là **dữ liệu nghiệp vụ** (bằng chứng đã mua) — rollback **không** xoá. Nếu buộc phải dọn, làm thủ công theo `order_id` sau khi review.
- `claim_guest_order` chỉ đổi `orders.user_id` từ `NULL` → uid; rollback code không tự đảo. Muốn đảo phải có script rà soát riêng (không đưa vào migration này).

### 5.2 An toàn token

- Token truyền trong **body RPC** (`supabase.rpc` = POST), không đưa lên query string, không log, không gửi analytics, không đặt vào `href`.
- Token hiện tại (`sec_<timestamp>_<8 base36>`) chỉ ~41 bit ngẫu nhiên — **yếu**. Đề xuất đổi sang `crypto.randomUUID()` hoặc 32 byte hex (≥ 64 ký tự) ở `CheckoutView`; RPC chỉ yêu cầu ≥ 12 nên tương thích ngược.
- `finalize` không phân biệt “đơn không tồn tại” và “sai quyền” (cùng `42501`) để tránh dò mã đơn.

### 5.3 Kiểm thử RLS (positive/negative)

```sql
-- POSITIVE: chủ đơn đã thanh toán
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"<buyer-uid>"}';
  select public.finalize_digital_delivery('<order-id>', null);   -- > 0 dòng
  select public.get_my_order_files('<order-id>');                -- > 0 dòng
  select count(*) from public.order_files where order_id = '<order-id>';
commit;

-- IDEMPOTENT: gọi lần 2, số dòng không đổi
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"<buyer-uid>"}';
  select count(*) from public.finalize_digital_delivery('<order-id>', null);
commit;

-- NEGATIVE: user khác
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"<other-uid>"}';
  select public.finalize_digital_delivery('<order-id>', null);   -- ERROR 42501
  select count(*) from public.order_files where order_id = '<order-id>'; -- 0
  select public.claim_guest_order('<order-id>', '<token>');      -- false hoặc 0 dòng
commit;

-- NEGATIVE: anon (không có grant execute)
begin;
  set local role anon;
  select public.finalize_digital_delivery('<order-id>', '<token>'); -- permission denied
  select * from storage.objects where bucket_id = 'cad-files';      -- 0 dòng
commit;

-- STORAGE: buyer ký được URL, anon thì không (chạy ở client/SDK)
-- buyer:  storage.from('cad-files').createSignedUrl('<order_files.storage_path>', 60) => OK
-- anon :  cùng path => 400/403 (không có policy)
```

Bổ sung khi có môi trường sống: chạy `node scripts/verify-rls.mjs` và thêm case `order_files`/`cad-files` vào checklist.

---

## 6. Rủi ro & câu hỏi cho PO

| # | Vấn đề | Đề xuất |
|---|---|---|
| 1 | **Điểm cấp quyền:** chỉ sau khi thanh toán được xác nhận, hay cho tải ngay khi đặt (COD/awaiting)? | Chỉ `paid` hoặc `order_items` digital do admin ghi. Không bao giờ dựa `orders.items`. |
| 2 | **Khách vãng lai:** bắt buộc đăng nhập + claim, hay đầu tư Edge Function để tải chỉ bằng token? | Claim trước (rẻ, không cần service key). Edge Function là PA1b. |
| 3 | **License / `download_limit` / watermark:** có đếm lượt tải và watermark thật không? | Hiện chưa enforce: signed URL 60s tạo lại vô hạn. Nếu cần, thêm bảng `download_events` + Edge Function (client không đáng tin) và pipeline watermark server-side. `watermark_required` đang chỉ là cờ dữ liệu. |
| 4 | Một sản phẩm có nhiều `digital_assets` (STL + STEP + 3MF) | Hiện cấp tất cả. PO xác nhận có đúng ý (“mua 1 lần nhận mọi định dạng”)? |
| 5 | Hoàn tiền / thu hồi license | Cần quy trình xoá/đánh dấu `order_files` (hiện chưa có). Không tự xoá khi refund nếu chưa có luật. |
| 6 | Policy `vcube_cad_files_buyer_read` (heuristic `orders.items LIKE name`) | Nên bỏ sau khi backfill `order_files` — heuristic cho phép dò object nếu biết tên. Ngoài scope #14, đề xuất migration riêng. |
| 7 | `products.cad_file_url` vs `digital_assets.storage_path` | Chốt `digital_assets` là nguồn duy nhất cho file bán; `cad_file_url` chỉ là preview/legacy. |
| 8 | `orders.items` do client gửi | Không dùng để cấp quyền. Nếu cần hiển thị, chỉ dùng làm snapshot. |

---

## 7. Tóm tắt thay đổi khi được duyệt

1. Tạo `supabase/migrations/20261025090000_digital_delivery.sql` (mục 3).
2. `src/backend/supabase/database.ts`: thêm `finalizeDigitalDelivery`, `getMyOrderFiles`, `claimGuestOrder`.
3. `src/frontend/hooks/useOrdersData.ts`: nguồn `assets` chuyển sang `get_my_order_files`.
4. `src/frontend/views/CheckoutView.tsx`: gọi finalize best-effort (chỉ user đã đăng nhập).
5. `src/frontend/views/AssetLibraryView.tsx`: bỏ banner “chưa hỗ trợ” khi có `storagePath`; thêm luồng claim cho đơn khách.
6. Không đổi policy storage; không cấp quyền ghi `order_files` cho buyer/anon.
