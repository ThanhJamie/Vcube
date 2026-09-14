# A2 — RÀ SOÁT READ-ONLY: LUỒNG TIỀN (VCUBE)

- Repo: `/home/thanh/projects/Vcube` (WSL2 Ubuntu-24.04), git `541023b` (working tree có nhiều file đã sửa/xoá sẵn — KHÔNG do tôi).
- Phạm vi: `src/App.tsx`, `orderService.ts`, `database.ts`, `useCartStore.ts`, `CartView/CheckoutView/MyOrdersView/OrderSuccessView/AssetLibraryView`.
- **Tôi không sửa file nào trong repo, không chạy git mutation, không thêm dependency, không ghi gì lên DB** (DB chỉ đọc bằng GET; 1 lệnh POST duy nhất là `storage/v1/object/list` — API ĐỌC của Storage, xem §5).

## KẾT LUẬN NGẮN GỌN NHẤT

**Đặt hàng KHÔNG ghi DB.** Nút "XÁC NHẬN & TẠO ĐƠN HÀNG" tạo một object `Order` trong RAM, đẩy vào React state, xoá giỏ, rồi điều hướng sang `/order-success`. `OrderService.createOrder` / `dbService.saveOrder` **có 0 caller**. Bảng `order_items` / `cart_items` / `digital_assets` có **0 tham chiếu** trong `src/**`.

Thêm một chốt chặn thứ hai mà brief chưa nêu: **kể cả khi nối `saveOrder` vào, đơn vẫn INSERT THẤT BẠI** vì `orders.date` là `timestamptz` còn checkout gửi chuỗi hiển thị `"13/9/2026 …"` → Postgres lỗi `22008` (đã chứng minh bằng GET, §1.4).

---

## 1. BẢN ĐỒ TỪNG BƯỚC CỦA "ĐẶT HÀNG"

| # | Bước | Điểm bấm / hàm | Ghi bảng nào? |
|---|---|---|---|
| 1 | Thêm vào giỏ | `handleAddToCart` → `addToCartStore` — `App.tsx:1168-1171` → `useCartStore.ts:31-43` | ❌ chỉ state + localStorage `vcube_cart_store` |
| 2 | `/cart` → thanh toán | nút `CartView.tsx:481` `onNavigate('checkout')` | ❌ |
| 3 | `/checkout` submit | nút `CheckoutView.tsx:710-717` → `handleCompleteOrder` `CheckoutView.tsx:106-194` | ❌ |
| 4 | Dựng đơn trong RAM | `newOrder` object — `CheckoutView.tsx:130-188` | ❌ |
| 5 | Trả đơn lên App | `onOrderCompleted(newOrder)` — `CheckoutView.tsx:190` → prop gắn tại `App.tsx:1466-1473` | ❌ |
| 6 | Nhận đơn | `handleOrderCompleted` — `App.tsx:1191-1219` | ❌ |
| 7 | Lưu đơn | `setOrders((prev) => [newOrder, ...prev])` — `App.tsx:1192` (state khởi tạo `[]` tại `App.tsx:619`) | ❌ **RAM** |
| 8 | Bịa tài sản số | `App.tsx:1196-1216` → `setAssets` `App.tsx:1215` | ❌ **RAM** |
| 9 | Xoá giỏ | `clearCartStore()` — `App.tsx:1218` | ❌ không xoá `cart_items` (không hề đọc/ghi bảng đó) |
| 10 | Điều hướng | `onNavigate('order_success', …)` `CheckoutView.tsx:192` → `App.tsx:1105-1112` → `/order-success/:id` | ❌ |

**⇒ KẾT LUẬN: KHÔNG GHI DB.** Đơn chỉ tồn tại trong React state `orders` (`App.tsx:619`); F5 là mất. `/orders` là `ProtectedRoute` bọc `MyOrdersView` nhận đúng `orders={orders}` (`App.tsx:1520-1530`) nên sau reload = rỗng; `/order-success/:id` sau reload render "Không tìm thấy đơn hàng" (`App.tsx:226-241` + `OrderNotFoundView` `App.tsx:273-302`).

Bằng chứng "handler không gọi DB" — toàn bộ cây `dbService.*` được gọi trong `App.tsx`:

```
$ wsl -d Ubuntu-24.04 --cd /home/thanh/projects/Vcube -- bash -lc "cd src; grep -n 'dbService\.' App.tsx"
701:    dbService.getProducts().then(async (remoteProducts) => {
707:          const seeded = await dbService.seedInitialProductsIfEmpty();
709:            const fresh = await dbService.getProducts();
795:    dbService.getPricingConfig().then((cfg) => {
799:    dbService.getSiteContent().then((content) => {
803:    dbService.getMaterials().then((remoteMats) => {
807:    dbService.getPrinters().then((remotePrinters) => {
814:    dbService.getAccessories().then((remoteAccessories) => {
902:    const res = await dbService.savePricingConfig(newConfig);
939:      dbService.saveMaterial(m).catch((e) => console.warn('Failed to sync material to Supabase:', e));
952:      dbService.savePrinter(p).catch((e) => console.warn('Failed to sync printer to Supabase:', e));
1231:    const res = await dbService.saveProduct(prod);
1252:    const res = await dbService.saveProduct(updated);
1273:    const res = await dbService.deleteProduct(productId);
1312:    const res = await dbService.saveSiteContent(newContent);
```

→ **Không có `saveOrder`, không có `getOrders`, không có `updateOrderStatus`.** (Comment ở `App.tsx:617-618` nói "hoặc đơn đọc từ Supabase (xem effect bên dưới)" — **effect đó không tồn tại**; 6 `useEffect` của App.tsx nằm ở dòng 520, 691, 697, 793, 835, 964, không effect nào đọc `orders`.)

### 1.4. Chốt chặn thứ hai: `orders.date` là `timestamptz`, checkout gửi chuỗi hiển thị

- `supabase/migrations/20260901_baseline_schema.sql:610` → `date timestamptz not null default now()`.
- `CheckoutView.tsx:133` → `date: new Date().toLocaleDateString('vi-VN') + ' ' + new Date().toLocaleTimeString(...)` ⇒ `"13/9/2026 14:30:00"`.
- `database.ts:266` → `date: order.date` (gửi nguyên chuỗi đó vào cột timestamptz).

Chứng minh bằng GET (PostgREST phải cast cùng kiểu khi INSERT):

```
$ curl -s "$URL/rest/v1/orders?select=id&date=eq.13%2F9%2F2026" -H "apikey: $K" -H "Authorization: Bearer $K"
{"code":"22008","details":null,"hint":"Perhaps you need a different \"datestyle\" setting.","message":"date/time field value out of range: \"13/9/2026\""}

# đối chứng ISO — chạy được:
$ curl -s "$URL/rest/v1/orders?select=id&date=gt.2020-01-01" -H "apikey: $K" -H "Authorization: Bearer $K"
[{"id":"DEMO-O01"}, {"id":"DEMO-O02"}, {"id":"DEMO-O03"}, {"id":"DEMO-O04"}]
```

---

## 2. XÁC NHẬN 0 CALLER (lệnh grep + kết quả THÔ, đầy đủ)

```
$ wsl -d Ubuntu-24.04 --cd /home/thanh/projects/Vcube -- bash -lc \
  "echo '=== createOrder ==='; grep -rn 'createOrder' src scripts 2>/dev/null; \
   echo '=== saveOrder ==='; grep -rn 'saveOrder' src scripts 2>/dev/null; \
   echo '=== getOrders ==='; grep -rn 'getOrders' src scripts 2>/dev/null; \
   echo '=== cart_items ==='; grep -rn 'cart_items' src scripts 2>/dev/null; \
   echo '=== order_items ==='; grep -rn 'order_items' src scripts 2>/dev/null; \
   echo '=== digital_assets ==='; grep -rn 'digital_assets' src scripts 2>/dev/null"
```

Kết quả thô (nguyên văn):

```
=== createOrder ===
src/backend/services/orderService.ts:7:  static async createOrder(orderData: Omit<Order, 'id'>): Promise<Order> {
=== saveOrder ===
src/backend/supabase/database.ts:240:  async saveOrder(order: Order, explicitUserId?: string): Promise<{ success: boolean; error?: string }> {
src/backend/supabase/database.ts:292:      console.warn('DB error on saveOrder:', err);
src/backend/services/orderService.ts:13:    await dbService.saveOrder(newOrder);
=== getOrders ===
src/backend/supabase/database.ts:335:  async getOrders(userEmail?: string): Promise<Order[]> {
src/backend/services/orderService.ts:17:  static async getOrdersByCustomer(email: string): Promise<Order[]> {
src/backend/services/orderService.ts:18:    return await dbService.getOrders(email);
=== cart_items ===
scripts/seed-sample-data.mjs:679:    { table: 'cart_items', conflict: 'id', rows: [
scripts/seed-sample-data.mjs:758:  chk(every('cart_items', (r) => r.quantity >= 1), 'cart_items.quantity < 1');
scripts/seed-sample-data.mjs:963:  { table: 'cart_items', ids: () => idsOf('cart_items'), marker: null },
scripts/a8-db-probe.mjs:116:await probeColumns('cart_items', [
scripts/a8-db-probe.mjs:118:], 'cart_items (7 cột)');
scripts/a8-db-probe.mjs:259:    ['cart_items', true],                  // giỏ hàng của khách
scripts/inspect-db.mjs:88:  { name: 'cart_items', sensitive: true },
scripts/verify-rls.mjs:258:await expectZeroTwoKey('anon đọc cart_items', 'cart_items', null, 'lộ giỏ hàng của khách');
=== order_items ===
scripts/gen-apply-all.mjs:257:  'vcube_order_items_owner_read',
scripts/gen-apply-all.mjs:258:  'vcube_order_items_admin_all',
scripts/gen-apply-all.mjs:280:-- 5.14 — Policy của Đợt 10/Đợt 25 phải có đủ (xưởng in · workshop_profiles · quotes/kyc · order_items)
scripts/gen-apply-all.mjs:292:               ('vcube_order_items_owner_read'),
scripts/gen-apply-all.mjs:293:               ('vcube_order_items_admin_all')) as t(expected)
scripts/gen-apply-all.mjs:310:select 'order_items (bảng)' as muc,
scripts/gen-apply-all.mjs:311:       case when to_regclass('public.order_items') is not null then 'OK' else 'THIEU' end as ket_qua;
scripts/seed-sample-data.mjs:532:/** Dựng 4 đơn + order_items + `items` jsonb + các cột chia tiền (khớp công thức đã chốt). */
scripts/seed-sample-data.mjs:627:   * `order_items` KHÔNG có cột `updated_at` ⇒ truyền stamps: ['created_at'].
scripts/seed-sample-data.mjs:656:    { table: 'order_items', conflict: 'id', rows: rows(items, { stamps: ['created_at'] }), label: `${items.length} dòng đơn (trộn print/digital, platform/designer)` },
scripts/seed-sample-data.mjs:728:  'order_items.seller_type': ['platform', 'designer'],
scripts/seed-sample-data.mjs:729:  'order_items.fulfillment': ['print', 'digital'],
scripts/seed-sample-data.mjs:751:  chk(every('order_items', (r) => LEGAL['order_items.seller_type'].includes(r.seller_type)), 'order_items.seller_type sai');
scripts/seed-sample-data.mjs:752:  chk(every('order_items', (r) => LEGAL['order_items.fulfillment'].includes(r.fulfillment)), 'order_items.fulfillment sai');
scripts/seed-sample-data.mjs:753:  chk(every('order_items', (r) => r.quantity >= 1), 'order_items.quantity < 1');
scripts/seed-sample-data.mjs:959:  { table: 'order_items', ids: () => idsOf('order_items'), marker: null },
scripts/a8-db-probe.mjs:99:await probeColumns('order_items', [
scripts/a8-db-probe.mjs:104:], 'order_items (16 cột)');
scripts/a8-db-probe.mjs:256:    ['order_items', true],                 // dòng tiền của đơn ⇒ anon phải bị chặn
scripts/inspect-db.mjs:83:  { name: 'order_items', sensitive: true },
scripts/verify-rls.mjs:252:await expectZeroTwoKey('anon đọc order_items', 'order_items', null,
=== digital_assets ===
scripts/gen-apply-all.mjs:405:               ('digital_assets','file_size_bytes'),
scripts/gen-apply-all.mjs:406:               ('digital_assets','checksum')) as t(tbl, col)
scripts/seed-sample-data.mjs:674:    { table: 'digital_assets', conflict: 'id', rows: [
scripts/seed-sample-data.mjs:759:  chk(every('digital_assets', (r) => r.download_limit === null || r.download_limit >= 0), 'digital_assets.download_limit < 0');
scripts/seed-sample-data.mjs:962:  { table: 'digital_assets', ids: () => idsOf('digital_assets'), marker: null },
scripts/a8-db-probe.mjs:112:await probeColumns('digital_assets', [
scripts/a8-db-probe.mjs:115:], 'digital_assets (12 cột)');
scripts/a8-db-probe.mjs:258:    ['digital_assets', true],              // storage_path ⇒ anon phải bị chặn
scripts/inspect-db.mjs:87:  { name: 'digital_assets', sensitive: true },
scripts/verify-rls.mjs:259:await expectZeroTwoKey('anon đọc digital_assets', 'digital_assets', null,
```

**Đọc kết quả cho đúng (không tự lừa mình):**

| Hàm / bảng | Số tham chiếu trong `src/**` | Kết luận |
|---|---|---|
| `OrderService.createOrder` | **1** — đúng dòng định nghĩa `orderService.ts:7` | **0 caller. Chết.** |
| `dbService.saveOrder` | 1 def (`database.ts:240`) + 1 call site (`orderService.ts:13`, nằm trong hàm chết) | **0 caller sống** |
| `dbService.getOrders` | 1 def (`database.ts:335`) + 1 call site (`orderService.ts:18`, hàm chết) | **0 caller sống** |
| `dbService.updateOrderStatus` | 1 def (`database.ts:297`) + 1 call site (`orderService.ts:33`) | **0 caller sống** |
| `cart_items` | **0** trong `src/**` (chỉ có trong `scripts/**`) | không ai đọc/ghi |
| `order_items` | **0** trong `src/**` | không ai đọc/ghi |
| `digital_assets` | **0** trong `src/**` | không ai đọc/ghi |

Cả class `OrderService` không được import ở bất kỳ đâu trong UI:

```
$ ... grep -rn 'OrderService\|orderService' src
src/backend/services/settingsService.ts:16: * `orderService`, `catalogService`, `pricingService` đều ở đây) — audit + validate +
src/backend/services/orderService.ts:6:export class OrderService {
src/backend/index.ts:5:export { OrderService } from './services/orderService';
```

⇒ `orderService.ts` là **dead code** (chỉ còn được re-export ở `backend/index.ts`).

Và `setOrders` (cập nhật trạng thái đơn ở `/admin`) **cũng chỉ sửa RAM** — `App.tsx:1285-1305` `handleUpdateOrderStatus` chỉ `setOrders(prev => prev.map(...))`, không gọi `dbService.updateOrderStatus`.

---

## 3. GIỎ HÀNG (`useCartStore.ts`)

| Câu hỏi | Trả lời | Bằng chứng |
|---|---|---|
| Lưu ở đâu? | **zustand `persist` → localStorage, key `vcube_cart_store`** | `useCartStore.ts:25-27` (`persist(`) và `useCartStore.ts:77-79` (`name: 'vcube_cart_store'`) |
| Có ghi `cart_items` không? | **KHÔNG** — 0 tham chiếu trong `src/**` | grep §2 |
| Sống qua reload? | **CÓ** (localStorage), nhưng **chỉ trên đúng máy/trình duyệt đó**; không theo tài khoản | persist ở trên |
| Gộp khi đăng nhập? | **KHÔNG thực chất.** `mergeGuestCart` chỉ được gọi đúng 1 lần, với **mảng rỗng**: `mergeGuestCart([])` — `App.tsx:967` | grep: `mergeGuestCart` → `useCartStore.ts:22,62` + `App.tsx:602,967,969` |

```ts
// App.tsx:964-969
useEffect(() => {
  if (isLoggedIn && user) {
    // When user logs in, merge guest local cart with user's remote server cart
    mergeGuestCart([]);          // ← luôn rỗng ⇒ no-op; KHÔNG đọc cart_items từ server
  }
}, [isLoggedIn, user, mergeGuestCart]);
```

Hệ quả: giỏ của khách vãng lai **không** chuyển thành giỏ tài khoản; bảng `cart_items` (có sẵn RLS `vcube_cart_items_owner_all`, `20261010_harden_rls.sql:628-631`) **chưa từng được dùng**. `clearCart` (`useCartStore.ts:58`) cũng chỉ xoá state + `appliedDiscount`.

---

## 4. MỌI CHỖ BỊA SỐ TRÊN ĐƯỜNG TIỀN

### 4.1. Bịa thật, đang hiển thị cho khách (P0/P1)

| # | Vị trí | Nội dung bịa | Ghi chú |
|---|---|---|---|
| F1 | `App.tsx:1203` | `format: 'STL'` cho **mọi** file số | DB thật có cả `STEP`, `3MF` (`digital_assets.file_format`) |
| F2 | `App.tsx:1204` | `version: 'v2.0'` | không có cột version nào trong DB |
| F3 | `App.tsx:1209` | `fileSize: '16.5 MB'` | DB thật: 2.400.000 / 8.100.000 / 1.200.000 bytes (2.4 / 8.1 / 1.2 MB) |
| F4 | `App.tsx:1202` | `isVerified: true` | không có nguồn xác minh nào |
| F5 | `App.tsx:1205` | `license: 'Commercial'` | DB thật: `Personal` / `NULL` / `Commercial` |
| F6 | `App.tsx:1208` | `maxDownloads: 'Không giới hạn'` | DB thật: `download_limit` = 3 / 5 / 0 |
| F7 | `CartView.tsx:70-77` | 2 mã giảm giá **hardcode** trong mã nguồn: `TECH3D` = −20.000đ; `VCUBE10`/`VN3DHUB` = −10% | không có bảng promo/voucher nào; tiền giảm chảy thật vào `appliedDiscount` → `CartView.tsx:62` và `CheckoutView.tsx:102` |
| F8 | `OrderSuccessView.tsx:215` | `'Bản quyền CAD (.STL + .STEP)'` cứng cho mọi item số | |
| F9 | `database.ts:245-246` | `order.payment?.total \|\| 0`, `order.payment?.shippingFee \|\| 0` | "không biết" bị biến thành **0 đồng** khi ghi DB — đúng thứ `data-honesty` cấm |

### 4.2. Đã sạch (brief nghi ngờ, tôi **bác bỏ**)

- `450000`: **0 lần** xuất hiện như số trong code — chỉ còn trong comment giải thích đã gỡ (`PersonalizeView.tsx:118`):
  ```
  $ grep -rn 450000 src
  ./frontend/views/PersonalizeView.tsx:118:   * trong `pricingEngine`). Trước đây: `pricePhysical || 450000` (bịa giá gốc) và
  ./backend/services/workshopService.ts:136:    purchasePrice: 24500000,      # khớp chuỗi con, không phải giá 450000
  ./backend/services/workshopService.ts:296:    totalRoyaltiesEarned: 18450000,   # khớp chuỗi con
  ```
- `50000` / `80000` / `45000` chỉ còn là **giá trị tham chiếu Inkiri để điền sẵn form /admin** (`mockData.ts:170,171,180`, khối `INKIRI_REFERENCE_VALUES` có băng-rôn "KHÔNG PHẢI CẤU HÌNH CỦA VCUBE"). Các view đọc từ `pricingConfig` và **trả `null` khi chưa cấu hình** thay vì rơi về số bịa: `PersonalizeView.tsx:122-123` (`positiveNumberOrNull`), `ProductDetailView.tsx:83`, `HomeView.tsx:162+203`. `App.tsx:667` khởi tạo `pricingConfig = null` ⇒ **không có fallback giá bịa**.
- `DEFAULT_SALES_RULES = { standardShippingFee: 30000, freeShippingThreshold: 300000 }` (`database.ts:22-25`) là **mặc định có tên**, bị `site_content` ghi đè (`database.ts:37-38`); dùng ở `CheckoutView.tsx:96-97`, `CartView.tsx:53-54`, `CartDrawer.tsx:76-77`. Đây là "giá trị mặc định của hệ thống", không phải số bịa — **nhưng** vẫn là con số khách bị tính nếu admin chưa cấu hình. Xếp P2.
- `InvoiceModal.tsx:52-62` **đã sạch**: chỉ in `payment.vatRate` / `payment.tax` đã ghi trên đơn, không tự cộng 8%.

### 4.3. Cổng `check-fabricated.mjs` KHÔNG bắt được F1–F6 (lỗ hổng công cụ)

```
$ node scripts/check-fabricated.mjs
check-fabricated: quet 124 file .ts/.tsx
  KET QUA: SACH — 0 tuyen bo bia trong chuoi hien thi.
```

Cổng chỉ so một **danh sách mẫu cố định** (`CLAIMS`: watertight, dung sai ±0.05, Mitutoyo, ISO, hotline bịa…) — `scripts/check-fabricated.mjs:36-60`. Nó **không** có mẫu cho dung lượng file / version / license / "Verified". Vì vậy `'16.5 MB'`, `'v2.0'`, `isVerified: true` đi qua cổng sạch dù là số bịa. Đây là "nghi dụng cụ trước" đúng như brief dặn: dụng cụ chạy đúng, **phạm vi mẫu của nó thiếu**.

---

## 5. `/assets` — METADATA BỊA, NGUỒN DỮ LIỆU, TẢI FILE

**Nguồn dữ liệu:** KHÔNG có. `assets` khởi tạo bằng fixture rỗng `DIGITAL_ASSETS = []` (`mockData.ts:75-77` ghi rõ "RỖNG CÓ CHỦ Ý"), gán ở `App.tsx:620`. Bảng `digital_assets` **0 tham chiếu**. `catalogService.getDigitalAssets()` (`catalogService.ts:26-29`) trả `[]` cứng và **0 caller**. ⇒ Nội dung duy nhất `/assets` từng có là do `handleOrderCompleted` **bịa ra** ở `App.tsx:1196-1216` (F1–F6), và mất khi F5.

**Tải file có hoạt động không?** Hai lớp đều hỏng:

1. `AssetLibraryView.tsx:52-63`: chỉ cho tải khi `asset.storagePath` là chuỗi khác rỗng. `handleOrderCompleted` **không set `storagePath`** (`App.tsx:1196-1212`) ⇒ luôn rơi vào nhánh "Chưa hỗ trợ tải trực tiếp". Code ở đây **trung thực** (không toast giả, không link giả) và tự ghi rõ cần bảng `order_files` (`AssetLibraryView.tsx:13-27`).
2. Kể cả có `storagePath`, **object không tồn tại**. Kiểm bằng GET thật (không đoán):

```
$ curl -s "$URL/storage/v1/object/cad-files/$p" -H "$AUTH"     # cho 3 storage_path trong DB
DEMO/cad/banh-rang-hanh-tinh.stl -> HTTP 400
DEMO/cad/vo-hop-iot.step         -> HTTP 400
DEMO/cad/hop-the-nho.3mf         -> HTTP 400

# body thật của lần gọi có đủ 2 header:
{"statusCode":"404","error":"not_found","message":"Object not found","code":"NoSuchKey"}

# liệt kê gốc bucket (API ĐỌC của Storage — POST /storage/v1/object/list, không ghi gì):
[]
```

Bucket thì **có thật**: `GET /storage/v1/bucket` → `cad-files` private, `file_size_limit` 157286400, mime `octet-stream|stl|step|3mf|obj|zip`. ⇒ **Bucket tồn tại nhưng 0 object**: 3 dòng `digital_assets` trỏ vào file không có.

**Chặn thứ ba về RLS:** `digital_assets` chỉ có policy cho designer (`designer_id = auth.uid()`) và admin (`20261010_harden_rls.sql:617-623`) ⇒ **khách không đọc được dòng nào** vì RLS mức DÒNG, nên client không bao giờ nhận được `storage_path` — đúng như comment `:610-616`. Muốn khách tải file thì phải có tầng service-role + `createSignedUrl`, hoặc bảng `order_files` + policy cho người mua.

---

## 6. SAU KHI ĐẶT HÀNG, XƯỞNG IN CÓ NHẬN ĐƯỢC KHÔNG?

**KHÔNG.**

Đường đọc của `/lab`:

- `App.tsx:1329-1336` → `labRouteElement` = `RoleGuard(lab|workshop|admin)` → `LabRoute` (`App.tsx:512`)
- `WorkshopSettingsView.tsx:181-195` → `loadQueue()` → **`workshopService.getMyQueueOrders(partnerId)`**
- `workshopService.ts:1656-1667`:
  ```ts
  const { data, error } = await supabase
    .from('orders')
    .select('id,order_number,date,estimated_delivery,status,status_stage_index,layer_progress,items,assigned_printer_id')
    .eq('assigned_workshop_id', partnerId)
    .order('created_at', { ascending: false });
  ```
- RLS tương ứng: `vcube_orders_workshop_read` — `20261010_harden_rls.sql:767-771` (`assigned_workshop_id = current_workshop_partner_id()`), helper ở `:99-108` (`workshop_profiles.user_id = auth.uid()` và `partner_id is not null`).

Vì sao đơn khách đặt không tới đó — **3 lý do xếp chồng**:

1. Đơn **không được ghi vào `orders`** (§1) ⇒ không có hàng nào để mà gán.
2. `saveOrder` **không hề ghi `assigned_workshop_id`** (`database.ts:262-285` — danh sách cột gửi lên không có trường này).
3. **Không có bất kỳ đoạn code nào trong `src/**` GHI `assigned_workshop_id`** — grep chỉ ra toàn điểm ĐỌC:

```
$ ... grep -rn 'assigned_workshop_id' src
src/frontend/views/WorkshopSettingsView.tsx:60,1460   (chỉ hiển thị/so khớp)
src/backend/services/workshopService.ts:1654,1663,1673,1699 (đọc/lọc)
src/backend/services/workshopService.ts:2066,2088     (comment/interface)
```
→ 0 chỗ ghi. Không có màn "gán đơn cho xưởng" nào (kể cả `/admin`: `handleUpdateOrderStatus` `App.tsx:1285-1305` chỉ sửa `status`/`status_stage_index`/`layer_progress` trong RAM).

**CẢNH BÁO DEMO:** DB seed hiện có **3/4 đơn đã gán sẵn** `assigned_workshop_id = 'ws-test-01'`, và tài khoản role `lab` (`user_profiles.id = b30e1af6-…`) chính là `workshop_profiles.user_id` của `partner_id = 'ws-test-01'`. Nghĩa là **`/lab` đang hiện 3 đơn DEMO** → demo trông "chạy được" trong khi luồng đặt hàng thật hoàn toàn không nối. Đừng nhầm hiệu ứng seed thành tính năng.

Dữ liệu production đã đọc (GET, nguyên văn):

```
=== ORDERS ===
[{"order_number":"DEMO-ORD-0001","status":"pending_payment","payment_status":"unpaid","total_amount":300000,"subtotal_amount":250000,"vat_amount":20000,"platform_fee_amount":25000,"workshop_payout_amount":260000,"designer_payout_amount":12500,"assigned_workshop_id":null,"assigned_printer_id":null},
 {"order_number":"DEMO-ORD-0002","status":"printing",...,"assigned_workshop_id":"ws-test-01","assigned_printer_id":"DEMO-PR01"},
 {"order_number":"DEMO-ORD-0003","status":"shipping","payment_status":"paid",...,"assigned_workshop_id":"ws-test-01"},
 {"order_number":"DEMO-ORD-0004","status":"completed","payment_status":"paid",...,"assigned_workshop_id":"ws-test-01"}]
=== ORDER_ITEMS ===  8 dòng, order_id = DEMO-O01..DEMO-O04, seller_type platform|designer, fulfillment print|digital
=== CART_ITEMS ===   2 dòng (DEMO-P03 x1 @150000, DEMO-P01 x2 @250000)
=== DIGITAL_ASSETS === 3 dòng (DEMO-P03 STL 2.400.000B Personal limit 3 · DEMO-P04 STEP 8.100.000B license NULL limit 5 · DEMO-P06 3MF 1.200.000B Commercial limit 0)
=== ORDERS id ===     id = DEMO-O01..DEMO-O04, user_id = 88af4e8c-… (1 khách demo)
=== workshop_profiles === {"id":"d023e30e-…","user_id":"b30e1af6-…","partner_id":"ws-test-01","workshop_name":"Xưởng MES Test (VCUBE Test)","verified_status":"Verified"}
```

**Bảng chia tiền 3 bên chỉ có dữ liệu do seed tạo. Không có writer:** không trigger/hàm nào tính `platform_fee_amount` / `workshop_payout_amount` / `designer_payout_amount` (grep `create trigger|create or replace function` trong 2 migration chỉ ra `get_order_by_guest_token` và `fn_protect_order_privileged_columns` — không có hàm tính tiền). Và **client không thể tự ghi `order_items`**: chỉ có `vcube_order_items_owner_read` (SELECT) + `vcube_order_items_admin_all` (`20261010_harden_rls.sql:677-692`) ⇒ INSERT từ trình duyệt sẽ bị RLS từ chối.

---

## 7. VIỆC CẦN SỬA, XẾP THEO MỨC CHẶN DEMO

| Mức | Việc | `file:line` |
|---|---|---|
| **P0** | Nối checkout → DB: gọi `orderService.createOrder(newOrder)` (hoặc `dbService.saveOrder`) và **xử lý `{success:false}`** trước khi báo thành công | `CheckoutView.tsx:106-194` (thêm call quanh `:190`), `App.tsx:1191-1219` |
| **P0** | Sửa kiểu `date`: gửi ISO timestamp cho cột `timestamptz`, giữ chuỗi hiển thị ở tầng UI | `CheckoutView.tsx:133`, `database.ts:266`, `20260901_baseline_schema.sql:610` |
| **P0** | Ghi `assigned_workshop_id` (bước gán đơn cho xưởng) — hiện **không có chỗ nào ghi** | mới; đọc ở `workshopService.ts:1663`, chặn ghi bởi `fn_protect_order_privileged_columns` (`20261010_harden_rls.sql:897-950`) |
| **P0** | Bỏ/bịt cảnh báo demo: `/lab` đang hiện 3 đơn seed ⇒ dễ tưởng luồng đã chạy | `workshopService.ts:1656-1667` |
| **P1** | Gỡ metadata bịa F1–F6, đọc từ `digital_assets` (hoặc nói rõ chưa có nguồn) | `App.tsx:1196-1216` |
| **P1** | Gỡ 2 mã giảm giá hardcode, hoặc đưa vào bảng cấu hình | `CartView.tsx:70-77` |
| **P1** | `|| 0` biến "chưa biết" thành 0 đồng khi ghi DB | `database.ts:245-246,276` |
| **P1** | Mở rộng mẫu cổng bịa để bắt dung lượng/version/license/verified | `scripts/check-fabricated.mjs:36-60` |
| **P1** | Ghi `order_items` (chưa có writer + chưa có policy INSERT cho client) | `20261010_harden_rls.sql:677-692`, `20260901_baseline_schema.sql:1066-1086` |
| **P2** | Nối giỏ theo tài khoản vào `cart_items`; `mergeGuestCart` đang no-op | `App.tsx:967`, `useCartStore.ts:62-75`, policy `20261010_harden_rls.sql:628-634` |
| **P2** | Nối `/assets` + tải file: cần bảng `order_files` / tầng service-role `createSignedUrl`, và **upload object thật** (0 object hiện tại) | `AssetLibraryView.tsx:13-27,52-89` |
| **P2** | `DEFAULT_SALES_RULES` 30.000/300.000 vẫn là phí mặc định khách bị tính khi admin chưa cấu hình | `database.ts:22-25` |
| **P2** | Dọn dead code `orderService.ts` (hoặc nối nó vào) | `orderService.ts:1-36`, `backend/index.ts:5` |

---

## 8. VIỆC TỐI THIỂU ĐỂ MỘT ĐƠN KHÁCH ĐẶT HIỆN ĐƯỢC Ở `/lab`

Chuỗi phải nối, theo đúng thứ tự (không có đường tắt nào bỏ qua được):

1. **Ghi đơn** — trong `CheckoutView.handleCompleteOrder` (`CheckoutView.tsx:106-194`), sau khi dựng `newOrder` (`:130-188`) và **trước** `onOrderCompleted(newOrder)` (`:190`): `await OrderService.createOrder(newOrder)` → `orderService.ts:7-15` → `dbService.saveOrder` → `database.ts:240-295` (INSERT `orders`). Điều kiện đã sẵn có: policy `vcube_orders_guest_insert` cho phép `anon`+`authenticated` INSERT khi `secure_access_token` dài ≥12 và `customer_email` không rỗng (`20261010_harden_rls.sql:352-369`) — `saveOrder` đã sinh token (`database.ts:247`) và email đến từ form (`CheckoutView.tsx:340`). **Phải sửa `date` trước** nếu không sẽ lỗi 22008.
2. **Gán xưởng** — thêm bước ghi `orders.assigned_workshop_id`. Không có hàm nào làm việc này; phải tạo mới (RPC/admin action) và chỉ admin/`service_role` ghi được (`fn_protect_order_privileged_columns`, `20261010_harden_rls.sql:897-950`). Giá trị phải khớp `workshop_profiles.partner_id` mà `current_workshop_partner_id()` trả về (`:99-108`).
3. **Đọc ở `/lab`** — **không cần sửa**: `WorkshopSettingsView.loadQueue` (`:181-195`) → `WorkshopService.getMyQueueOrders` (`workshopService.ts:1656-1667`) → policy `vcube_orders_workshop_read` (`:767-771`) đã đúng. Chỉ cần `orders` có hàng với `assigned_workshop_id` khớp.
4. (Không bắt buộc cho "hiện được ở /lab") **`order_items`** cho bảng chia tiền 3 bên: phải ghi bằng đường admin/`service_role` **hoặc** thêm policy INSERT + hàm tính phí — hiện client bị RLS chặn và không có hàm tính (`20261010_harden_rls.sql:677-692`).

Tóm lại 3 file/hàm phải chạm: **`CheckoutView.tsx` (gọi `OrderService.createOrder` + sửa `date`)**, **`database.ts:saveOrder` (sửa `date`, thêm `assigned_workshop_id`, bỏ `|| 0`)**, và **một điểm gán xưởng mới** (RPC/admin). `/lab` giữ nguyên.

---

## 9. 5 VIỆC QUAN TRỌNG NHẤT

1. **Đặt hàng không ghi DB.** Không có gì bền vững: F5 là mất đơn, khách không tra cứu lại được. (`CheckoutView.tsx:190`, `App.tsx:1191-1219`)
2. **`orders.date` sai kiểu** ⇒ nối `saveOrder` vào vẫn vỡ với `22008`. Sửa trước khi nối, nếu không sẽ tưởng "nối rồi mà vẫn lỗi". (`CheckoutView.tsx:133` vs `20260901_baseline_schema.sql:610`)
3. **`assigned_workshop_id` không có writer** ⇒ xưởng không bao giờ nhận đơn khách. Đây là mắt xích "đơn tới xưởng" — và là mắt xích duy nhất còn thiếu ở phía `/lab`. (`workshopService.ts:1663` chỉ đọc)
4. **Metadata `/assets` bịa** (`16.5 MB`, `v2.0`, `STL`, `Commercial`, `isVerified: true`) đang hiển thị như dữ liệu thật, và **cổng `check-fabricated.mjs` báo SẠCH** ⇒ cần sửa cả code lẫn mẫu cổng. (`App.tsx:1196-1216`, `scripts/check-fabricated.mjs:36-60`)
5. **Bảng chia tiền 3 bên chỉ có dữ liệu seed**: `order_items` không có writer, client bị RLS chặn INSERT, không có hàm tính `platform_fee/workshop_payout/designer_payout`. (`20261010_harden_rls.sql:677-692`)

---

## 10. LỖI DO CHÍNH TÔI GÂY RA / GIỚI HẠN

1. **Nhiều lệnh pwsh→wsl bị lỗi cú pháp** (`unexpected EOF while looking for matching '"'`, `missing the terminator`) do tôi escape nháy sai giữa PowerShell và bash. Đã chuyển sang truyền script qua stdin (`bash -s`). **Không lệnh nào trong số đó ghi file hay ghi DB** — chỉ là lần đọc thất bại.
2. Một lệnh `grep -rn 'storage_path' .` khớp vào **file bundle/minified** trong cây nguồn, làm output bị nhiễu và bị cắt (14 KB). Tôi đã đọc lại `database.ts` bằng công cụ `read` để lấy số dòng chính xác. Không ảnh hưởng kết luận.
3. `source .env` báo `set: command not found` / `$'echo\r'` do file có **BOM + CRLF**. Tôi sửa bằng `sed '1s/^\xEF\xBB\xBF//' | tr -d '\r'`; các lệnh curl vẫn chạy và cho kết quả thật. Đây là lỗi của môi trường, không phải của repo.
4. **Ngoại lệ có khai báo:** tôi dùng **1 lệnh POST** `POST /storage/v1/object/list/cad-files` để liệt kê object. Đây là **API ĐỌC** của Supabase Storage (không có biến thể GET tương đương), body gửi `{"prefix":"","limit":20}`, kết quả `[]`. Mọi truy cập **DB** đều bằng GET. **Không có thao tác ghi nào lên DB hay Storage.** Khoá bí mật không bị in ra ở bất kỳ output nào (chỉ truyền qua biến môi trường trong shell).
5. Tôi **không** kiểm chứng được bằng trình duyệt (không chạy app, không mở Playwright) — mọi kết luận về UI đều từ mã nguồn + comment, không phải từ quan sát màn hình thật.
6. Tôi **không** chạy `npm run lint/build` (ngoài phạm vi rà soát read-only này), nên không có phát biểu nào về việc build còn xanh hay không.
