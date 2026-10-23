<!-- doc-meta: status=active; verified=2026-10-23; owner=design-foundation -->
# HANDOFF — FL-2a-fix: wire designer publish (`insertProduct` + `designer_id` + status canonical + admin duyệt)

> **Work item:** `task-49` · **Agent:** `design-foundation` · **Ngày:** 2026-10-23
> **Repo:** `/home/thanh/home/thanh/project/Vcube` · **HEAD:** `9c7e5cf` + thay đổi task này (unstaged)
> **Trạng thái:** DONE — **đã verify THẬT end-to-end sau khi chủ dự án áp `APPLY-TODAY.sql`**: designer publish OK, admin publish OK, anon thấy sản phẩm, cleanup 0 leftover.
> **Không commit/push** · Không sửa SQL/migration · Không dependency · Không đổi theme/layout/route.

---

## 1. Kết luận ngắn

Trước FL-2a-fix: designer upload file + `digital_assets` đã chạy, nhưng **publish product fail 42501** vì
(a) `products` thiếu `designer_id`/policy designer; (b) code dùng **upsert** (cần UPDATE policy);
(c) UI so sánh status **chữ hoa** trong khi DB lưu lowercase ⇒ filter/nhãn sai.

Sau FL-2a-fix + migration đã áp: **designer tự tạo sản phẩm `status='under review'` + `designer_id=uid`**
(INSERT, không upsert), file STL thật + `digital_assets` khớp; **designer không tự publish** (DB policy);
**admin thấy "Chờ duyệt" và publish được**; **anon thấy sản phẩm sau khi published**. Đã verify bằng UI thật
với tài khoản thật (§5) và dọn sạch dữ liệu test.

---

## 2. Thay đổi code (7 file + 3 mới)

| File | Thay đổi |
|---|---|
| `src/types/index.ts` | + `Product.designerId?: string` (additive — không đổi field khác; commerce-auth đã thống nhất) |
| `src/backend/supabase/mappers.ts` | `rowToProduct` map `designerId: optStr(d.designer_id)` — cột vắng ⇒ `undefined`, KHÔNG tự gán chủ |
| `src/backend/supabase/database.ts` | + `buildProductRowPayload(product)` (nguồn payload duy nhất); + `insertProduct()` dùng **`.insert()`**; `saveProduct()` giữ **upsert** cho update. Payload **chỉ thêm `designer_id` khi `product.designerId` có giá trị**; `status` lowercase |
| `src/frontend/hooks/useCatalogData.ts` | `handleAddNewProduct` → `dbService.insertProduct`; `handleUpdateProduct` giữ `saveProduct` |
| `src/frontend/components/designer/DesignerUploadWizardTab.tsx` | `newProd.designerId = user.id` (giữ `status: 'Under Review'`, DB lưu lowercase) |
| `src/frontend/lib/productStatus.ts` | **MỚI** — canonical status helper: `normalizeProductStatus`, `isUnderReviewStatus`, `isPublishedStatus`, `isDraftStatus`, `isDesignerEditableStatus`, `productStatusLabel(Long)`, `toStoredProductStatus`, `toAdminSelectStatus`, `DESIGNER_STATUS_OPTIONS/FILTERS`, `ADMIN_STATUS_OPTIONS` |
| `src/frontend/components/designer/DesignerModelsManagerTab.tsx` | lọc "ấn phẩm của tôi" ưu tiên `designerId === user.id`, fallback tên cho dữ liệu cũ; filter/label/toggle dùng canonical (không phân biệt hoa thường); chặn sửa/toggle sản phẩm đã publish bằng toast giải thích policy |
| `src/frontend/components/admin/AdminProductsPanel.tsx` | select trạng thái dùng canonical + option **"Chờ duyệt"** (`under review`); admin chọn "Đang bán" ⇒ publish qua `saveProduct` upsert (admin-all); nhãn modal "Chờ duyệt" |
| `tests/unit/productStatus.test.ts` | **MỚI** — normalize/nhãn/quyền designer/admin select |
| `tests/unit/productPublish.test.ts` | **MỚI** — mapper `designer_id`, payload conditional (có/không cột), status lowercase, `insertProduct` ≠ `saveProduct` |

### Luồng trạng thái (một nguồn)

| UI cũ | DB thực tế | Canonical helper | Nhãn UI mới |
|---|---|---|---|
| `'Under Review'` | `under review` | `under_review` | **Chờ duyệt** |
| `'Pending'` | `pending` | `pending` | **Chờ duyệt** |
| `'Published'` | `published` | `published` | **Đã đăng** (dài: "Đã xuất bản") |
| `'Draft'` | `draft` | `draft` | **Nháp** |
| `'Archived'` | `archived` | `archived` | Lưu trữ |
| lạ/rỗng | — | `unknown` | `—` |

- Designer chỉ đặt được `draft` / `under review` (`toStoredProductStatus` quy mọi lựa chọn khác về under review);
  không có option publish — admin là bên publish.
- Admin select hiển thị `under review`/`pending` đúng "Chờ duyệt"; chọn "Đang bán" ghi `published`.

---

## 3. Điều gì cần migration (đã áp)

`docs/tasks/world-class/sql/APPLY-TODAY.sql` §B:
`products.designer_id uuid references auth.users(id) on delete set null` + index + 4 policy
(read-own mọi trạng thái; insert/update/delete chỉ sản phẩm chưa xuất bản `lower(status) in ('under review','pending','draft')`).
Admin-all giữ nguyên.

**Code chạy được cả trước lẫn sau migration:** payload chỉ thêm `designer_id` khi có giá trị ⇒ trước migration
admin vẫn insert được (không gửi cột lạ); sau migration designer insert gửi `designer_id=uid` + status lowercase.
Unit test `productPublish.test.ts` khoá bất biến này.

---

## 4. Gate

| Gate | Kết quả |
|---|---|
| `npm run lint` | **PASS** |
| `npm run build` (`dist-ssr/fl2afix`) | **PASS** |
| `npm run test:unit` | **PASS — 123 test** (+29 mới: `productStatus` + `productPublish`) |
| `npm run check` (19 gate + baseline) | **PASS — “KHÔNG TỆ HƠN BASELINE”** |

---

## 5. Verify THẬT bằng UI + tài khoản thật (sau khi APPLY-TODAY) — **PASS**

Phương pháp: dev server `:3001` + Chromium headless (libs `~/.local/share/opencode-pwlibs`), **network thật**
(không mock); đăng nhập UI thật; verify DB/Storage server-side bằng **secret key** (Node, không đưa vào bundle);
cleanup bằng secret key. Ảnh: `/tmp/fl2afix-real/01..06*.png`, JSON `/tmp/fl2afix-real/result.json`.

### 5.1 Designer `creator.lethang@vcube.vn` → `/designer/wizard` → upload STL 20 mm → Xuất bản

- Upload + parse: `fl2afix-<ts>.stl • 2.0 KB`, **8.00 cm³**, **Kín (watertight)**, **STL · 12 tam giác**,
  SHA-256 `ce1ed1b5b4ea…`.
- Toast thành công: `Đã tải tệp CAD lên kho riêng tư và tạo hồ sơ file số cho "fl2afix-<ts>". Sản phẩm đang chờ duyệt.`
  → tự chuyển `/designer/models`.
- **DB `products`**: `id=prod-1792740515851`, **`status='under review'`**, **`designer_id=4a528ff9-…` (uid designer)**.
- **DB `digital_assets`**: 1 dòng khớp `product_id`, `designer_id`, `file_format=STL`, `file_size_bytes=2047`,
  `checksum=ce1ed1b5b4ea…` (khớp SHA-256 file gốc), `license_type=Standard`, `download_limit=null`.
- **Storage**: path `cad/4a528ff9-…/30dfd2d7-a322-44e0-804e-b0d41f17ea46/fl2afix-<ts>.stl`; tải lại bằng
  service key: **2 047 bytes**, sha256 khớp file gốc (`sizeMatches=true`, `hashMatches=true`).
- 0 pageerror.

### 5.2 Admin `admin.forge@vcube.vn` → `/admin/products` → publish sản phẩm pending

- Select trạng thái của đúng sản phẩm: **`value='under review'`**, options có **`under review=Chờ duyệt`**
  → đổi sang `published` ("Đang bán").
- **DB sau publish**: `status='published'`, `designer_id` **giữ nguyên**.
- Ảnh `/tmp/fl2afix-real/04-admin-pending.png`, `05-admin-after-publish.png`.

### 5.3 Anon thấy sản phẩm đã publish

- Mở `/products/prod-1792740515851` (không session): PDP render, có tên sản phẩm, giá, "Chưa có đánh giá"
  (dữ liệu thật, không bịa) — ảnh `06-anon-pdp.png`.

### 5.4 Cleanup — **0 leftover**

- Xoá `digital_assets` (ok) → xoá storage object (ok) → xoá `products` (ok); quét lại theo tên test:
  **products=0, assets=0, objects=[]**. File test tạm trong `/tmp` đã xoá.

---

## 6. Risks / ghi chú

1. **Designer không sửa/toggle được sản phẩm đã publish** (policy DB chỉ cho update/delete khi chưa xuất bản).
   UI đã chặn bằng toast giải thích ("chỉ quản trị viên được sửa") thay vì để DB trả 42501. Nếu nghiệp vụ cần
   designer sửa sản phẩm đã bán ⇒ cần policy/flow riêng (admin duyệt từng thay đổi).
2. **Delete sản phẩm published**: UI hiện vẫn cho bấm xoá; policy sẽ chặn với designer, App rollback + toast lỗi
   (không kèm giải thích policy). Có thể thêm guard giống edit ở pass sau.
3. **Dữ liệu cũ không có `designer_id`**: `/designer/models` fallback khớp tên designer (giữ tương thích); nên
   backfill `designer_id` một lần từ `designer_profiles`/tên (không làm trong task này).
4. **Upsert của admin không bao giờ xoá `designer_id`** (cột omitted khi product không có designerId ⇒ giữ nguyên).
   Muốn "gỡ liên kết" phải set null tường minh — chưa có UI, chủ ý.
5. `insertProduct` cố tình **không upsert**: trùng id ⇒ lỗi thật; wizard tạo id mới mỗi lần nên bình thường.
6. Status canonical mới chỉ ở UI; **DB vẫn là nguồn sự thật** (`lower(status)`) — policy DB quyết định quyền.
7. Luồng publish vẫn 2 request client (product → asset); nếu asset insert lỗi thì compensation xoá file, product còn
   (ghi ở handoff FL-2a §7). FL-7 sẽ gộp transaction.

---

## 7. Tái lập verify

```bash
# dev server (nếu chưa có)
setsid nohup npm run dev >/tmp/dev.log 2>&1 </dev/null &   # :3000 hoặc :3001 nếu bận

# script verify thật (đặt trong repo để resolve node_modules, xoá sau khi chạy):
#   - login UI creator.lethang@vcube.vn (designer) → /designer/wizard → set file STL → submit
#   - verify products/designer_id/status + digital_assets + storage download/hash bằng secret key
#   - login admin.forge@vcube.vn → /admin/products → publish pending → verify DB
#   - anon PDP; cleanup asset/object/product; assert 0 leftover
```
Mật khẩu demo đọc từ `docs/plans/10-modernization-plan.md` (không in vào tài liệu/log).
