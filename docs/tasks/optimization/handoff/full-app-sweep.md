<!-- doc-meta: status=active; verified=2026-10-23; owner=commerce-auth -->
# HANDOFF — Full app sweep (build + route/role matrix + feature checks trên DB thật)

> **Work item:** `task-50` · **Agent:** `commerce-auth` · **Ngày:** 2026-10-23 · **Repo:** `/home/thanh/home/thanh/project/Vcube` @ `9c7e5cf` + working tree FL-2a publish
> **Read-only `src/**` — KHÔNG sửa code.** Không commit/push. Preview `:4179` đã tắt. Mật khẩu demo chỉ dùng trong script `/tmp/app-sweep/demo-pass` (600, không in trong handoff).
> **Tree snapshot cuối (dùng cho số liệu/gates):** `git status --porcelain` sha256 `f968dcc5…` — **trùng hash trước/sau khi chạy gate**.
> **Lưu ý tree thay đổi giữa sweep:** lúc bắt đầu sweep, agent FL-2a-publish đang ghi code (migration #13, `productStatus.ts`, sửa designer/admin product). Theo yêu cầu, tôi **build lại từ tree mới** rồi mới chốt toàn bộ evidence dưới đây; build cũ bị loại bỏ.

---

## 0. Tóm tắt

| Hạng mục | Kết quả |
|---|---|
| **Route sweep** | **114 page-check** (5 role × 390/1440): **107 OK · 7 defect (P2, cùng 1 root cause)** · 2 lần đo flake đã retest OK |
| **Guard / deep-link** | **6/6 PASS** (guest→login, designer/lab/customer→`/admin` 403 đúng, designer→`/lab` 403); F5 deep-link admin 4/4 |
| **Feature checks** | **PASS toàn bộ**: add-to-cart, quote STL, checkout tạo đơn thật, tracking token, admin xác nhận thanh toán, đổi stage, thêm/sửa sản phẩm, duyệt KYC, pricing tabs, **designer upload thật (FL-2a)**, customer `/orders`+`/assets`, lab tabs |
| **Icon / ngôn ngữ** | 0 trang có emoji icon; **min 6** `<svg class="lucide">`/trang; 0 pageerror trên 114 page-check; 0 console error (sau lọc nhiễu mạng Supabase) |
| **Lazy chunks** | 32 request chunk quan sát được (Tool3DView, PersonalizeView, Admin/Designer/Workshop panels, ThreeModelViewer…) — lazy load hoạt động |
| **Gates** | `lint` PASS · `build` PASS · `test:unit` **123/123 PASS** · **15/15 offline gate “KHÔNG TỆ HƠN BASELINE”** |
| **Cleanup** | **0 leftover**: order/product/digital_asset/temp-user/storage-object test đều 0; `cad/`, `digital/` root rỗng |

**Kết luận:** app build mới chạy được toàn bộ luồng chính với tài khoản thật. Chỉ còn **1 lỗi UI mobile (P2, cùng root cause)** + 1 timing nit (P3). **Không có P0/P1.**

---

## 1. Phương pháp

- Build: `rm -rf dist && npm run build` từ tree snapshot `f968dcc5…`; preview `npx vite preview --outDir dist --port 4179` (đã tắt).
- Chromium: `~/.cache/ms-playwright/chromium-1244/chrome-linux64/chrome` + `LD_LIBRARY_PATH=~/.local/share/opencode-pwlibs/x86_64-linux-gnu`; Playwright npx cache.
- Tài khoản thật (mật khẩu demo, không in): guest; customer `khachhang@vcube.vn`; designer `creator.lethang@vcube.vn`; lab `workshop.mes@vcube.vn`; admin `admin.forge@vcube.vn`. Kiểm DB/storage bằng **secret key trong Node (server-side)**.
- Script/artefact: `/tmp/app-sweep/{sweep2.mjs,features2.mjs,features3.mjs,features4-kyc.mjs,overflow-evidence.mjs,bisect-overflow.mjs}`, JSON kết quả, **97 ảnh** `/tmp/app-sweep/shots/`.

---

## 2. Route sweep — 30 route + route phụ × role × 390/1440

### 2.1 Phủ route
- Guest (18 path × 2 vp): `/`, `/explore`, `/products/:id` (DEMO-P01), `/personalize`, `/quote`, `/cart`, `/checkout`, `/tracking`, `/auth/login`, `/auth/register`, `/order-success`, `/does-not-exist` (404), redirect `/tool-3d`→`/quote`, `/my-orders`→`/orders`, `/library`→`/assets`, `/login`, `/register`, `/creator`.
- Customer (4×2): `/orders`, `/assets`, `/tracking`, `/personalize`.
- Designer (6×2): `/designer` + `overview`, `models`, `wizard`, `requests`, `payouts`.
- Lab (7×2): `/lab` + `queue`, `machines`, `materials`, `accessories`, `audit_trail`, `preferences`.
- Admin (22×2): `/admin` + 21 section: overview, products, workshops, partners, machines, designers, users, customers, pricing, pricing-engine, pricing-setup, cost-rules, materials, hardware, quote-calc, queue, orders, inventory, storefront, seo, settings.

Tổng **114 page-check**. Mỗi page ghi: URL, render OK, pageerror/console error, `scrollWidth > innerWidth`, text, số icon lucide, emoji, lazy chunk, empty-state hint.

### 2.2 Kết quả tổng hợp

| Role | Checks | OK | Defect |
|---|---:|---:|---:|
| guest | 36 | 36 | 0 |
| customer | 8 | 8 | 0 |
| designer | 12 | 12 | 0 |
| lab | 14 | 13 | **1** (`/lab/queue` @390 overflow) |
| admin | 44 | 38 | **6** (`/admin/users`,`/admin/customers`,`/admin/pricing*` @390 overflow) |
| **Tổng** | **114** | **107** | **7** |

- **0 pageerror** trên 114 check; 0 console error sau lọc nhiễu Supabase/network.
- **0 trang có emoji icon**; số icon lucide thấp nhất **6**/trang (bình thường với trang ít nút).
- Empty-state/loading hiển thị đúng ở các bảng không có dữ liệu (users/customers/pricing/inventory…).
- 2 lần đo `/admin/pricing`, `/admin/pricing-engine` @1440 ra “trắng” (text 30 ký tự) ngay sau 2.2s — **retest sau +1.5s render đầy đủ 6.841 ký tự** ⇒ không phải crash, là timing lazy-load (xem P3-01).

---

## 3. Defects (không sửa — read-only)

### D1 — **P2** · `/admin/pricing`,`/admin/pricing-engine`,`/admin/pricing-setup`,`/admin/cost-rules`,`/admin/users`,`/admin/customers`,`/lab/queue` @390 · tràn ngang trang
- **Hiện tượng:** `document.documentElement.scrollWidth` > 390 (bảng dưới) dù nội dung chính vẫn đọc được; xuất hiện khi có bảng dài trong khung `overflow-x-auto`.
- **Bằng chứng (đo bằng Chromium):**
  | Route @390 | scrollWidth | Phần tử gây tràn (bisect DOM) |
  |---|---:|---|
  | `/lab/queue` | **783** | `<label class="text-sm font-medium text-fg sr-only">Tiến độ lớp (%)</label>` (absolute, x≈782) trong bảng queue |
  | `/admin/pricing*` (4 route) | **469** | `<label class="sr-only">Bậc N: nhãn hiển thị</label>` (x≈468) trong bảng chiết khấu số lượng |
  | `/admin/users`, `/admin/customers` | **484** | `sr-only` (caption/sort-state) của `DataTable` trong panel khách hàng |
  Ảnh: `/tmp/app-sweep/shots/overflow-*.png`.
- **Root cause:** các nhãn `sr-only` (Tailwind = `position:absolute; width/height:1px; clip`) nằm trong bảng rộng bên trong **scroll container KHÔNG có `position:relative`** (`DataTable.tsx:601` `w-full overflow-auto …`, `FormulaVolumeDiscount.tsx:33` `responsive-table-wrapper overflow-x-auto …`). Vì containing block là viewport/ICB, nhãn absolute lấy **static position ở mép phải bảng rộng** (x≈468/782) ⇒ làm tăng `scrollWidth` của **trang**, dù bảng bị cuộn trong khung.
- **Nghi file:line:** `src/frontend/ui/DataTable.tsx:601` (wrapper) + `:607` (`caption sr-only`), `:674` (`sr-only` sort state); `src/frontend/components/admin/pricing/FormulaVolumeDiscount.tsx:33` (wrapper) + `:48,63,75,93` (sr-only labels); `/lab/queue` dùng `DataTable` trong `src/frontend/components/workshop/settings/QueueTab.tsx`.
- **Đề xuất fix (1 dòng/khung):** thêm `relative` vào wrapper cuộn (`className="relative w-full overflow-auto …"`; `relative responsive-table-wrapper overflow-x-auto …`) — đủ để absolute `sr-only` bám khung cuộn thay vì viewport; hoặc thêm `left-0 top-0` cho `sr-only`/dùng utility riêng `sr-only` có `position:absolute;left:0;top:0`. Kiểm lại bằng `document.documentElement.scrollWidth === 390`.
- **Mức:** P2 (mobile 390 — điều kiện QA chặn; không mất dữ liệu, không chặn thao tác; desktop 1440 sạch).

### D2 — **P3** · `/admin/pricing`,`/admin/pricing-engine` @1440 · khung trống ~2s đầu
- **Hiện tượng:** tại thời điểm đo 2.2s sau điều hướng, `body.innerText` chỉ 30 ký tự (khung trắng); sau thêm 1.5s render đủ 6.841 ký tự.
- **Nghi file:** panel pricing lazy-load (`AdminDashboardView` → lazy `PricingConfigPanel`) nhưng fallback Suspense quá ngắn/không có skeleton; hoặc panel tự fetch nặng.
- **Đề xuất:** render `PageSkeleton`/`Skeleton` trong `React.Suspense` cho admin section (hoặc preload chunk `pricing` khi hover menu).
- **Mức:** P3 (chỉ ảnh hưởng cảm nhận; không tái hiện khi chờ đủ).

### Quan sát thêm (không phải defect mới của sweep này)
- `khachhang@vcube.vn`: lần này **đăng nhập OK** (khác lần verify trước — Lead đã sửa account), dùng thật cho `/orders`,`/assets`.
- `/lab/queue` 390 defect **không phải** do toast viewport như ghi nhận ở task-46; lần này root cause là `sr-only` trong `DataTable` (D1). Bug toast viewport (`AppOverlays.tsx:105`) vẫn là latent nếu toast hiện ở 390 — không tái hiện trong sweep này.

---

## 4. Feature checks (hành vi thật trên DB) — PASS toàn bộ

| # | Feature | Kết quả / bằng chứng |
|---|---|---|
| 1 | Guest thêm vào giỏ | PASS — cart store = 1 item, toast “Đã thêm 1x …” |
| 2 | `/quote` upload STL thật (20×20×20 mm, 684 B) | PASS — workspace + `canvas=1`, parse hiển thị |
| 3 | Checkout guest tạo đơn | PASS — payment block “Đã tạo đơn hàng” + DB row thật (`VCB-…`, tổng 302.400) |
| 4 | Tracking bằng mã đơn + token (khách) | PASS — render đúng đơn |
| 5 | **Admin xác nhận đã nhận tiền** | PASS — DB `payment_status=paid`, `order_items=1`, `payment_transactions.status=paid`; UI hiện ĐÃ THANH TOÁN |
| 6 | Admin đổi nấc đơn (Kanban) | PASS — `status_stage_index` 1 → 2 (status processing) |
| 7 | Admin **thêm sản phẩm** | PASS — tạo `SWEEP-PRODUCT-…` (150.000/75.000, `status=published`, seller designer); verify DB + cleanup |
| 8 | Admin **sửa sản phẩm** | PASS — đổi tên thành `…-EDIT`, verify DB |
| 9 | Admin **duyệt KYC** | PASS — temp customer `pending_review` → UI “Duyệt” → DB `kyc_status=verified` (temp user xoá sau test) |
| 10 | Admin **pricing tabs** | PASS — click 5 tab (Công thức/Vật liệu/Máy in/Phụ kiện/Kho…), cả 5 render |
| 11 | **Designer upload thật (FL-2a)** | PASS — product `under review` có `designer_id`; `digital_assets` path **`cad/<uid>/<uuid>/cube20.stl`**, format STL, size 684; object tải bằng secret: **sha256 khớp** `bd896cc3…`; `createSignedUrl` 200 + sha256 khớp; 0 pageerror; cleanup object+asset+product |
| 12 | Lab xem queue/máy/vật liệu | PASS render 1440 (390: `/lab/queue` dính D1) |
| 13 | Customer `/orders`, `/assets` | PASS render 390/1440 (hiện trạng rỗng thật — FL-2b/FL-5) |
| 14 | F5 deep-link | PASS 4/4 route admin (`/admin/orders`,`products`,`queue`,`pricing`) render sau reload |
| 15 | Guard sai quyền | PASS 6/6: guest→`/admin`,`/orders` redirect login; designer/lab/customer→`/admin` **403 “KHÔNG CÓ QUYỀN TRUY CẬP”**; designer→`/lab` 403 |

---

## 5. Regression gates (tree `f968dcc5…`)

| Gate | Kết quả |
|---|---|
| `npm run lint` | **PASS** |
| `npm run build` (`rm -rf dist && npm run build`) | **PASS** — `✓ built in 5.49s` |
| `npm run test:unit` | **PASS — 123/123 test** |
| 15 gate offline (`run-checks --only …`) | **15/15 OK rc=0 → “KHÔNG TỆ HƠN BASELINE”** (lint, test-unit, build, contrast-combos, contrast, error-handling, fabricated, icon-names, icon-library, ui-rules, unitprice-multiplier, a8-sql, lint-rls-migration, lint-rls-sources, test-catalog-sync) |
| Gate live (`verify-rls`,`inspect-db`) | Không chạy trong lượt gate này (không bắt buộc; DB đã được chạm trong feature checks) |

---

## 6. Cleanup proof (đo bằng secret key)

```json
{ "leftoverOrders": 0, "leftoverSweepProducts": 0, "leftoverTestAssets": 0,
  "leftoverTempUsers": 0, "tempEmails": [],
  "cadRoot": [], "digitalRoot": [], "cadTest": [], "digitalTest": [] }
```
- Order test checkout/tracking đã xoá (cascade items/payments/files).
- Product thêm/sửa (admin) + product/asset/object designer upload đã xoá.
- Temp KYC customer đã xoá; customer dùng `khachhang@vcube.vn` thật (không tạo mới lần này).
- Bucket `cad-files`: root `cad/` và `digital/` **rỗng** sau dọn.
- Preview `:4179` đã tắt (`curl` = 000).

## 7. Ghi chú cho Lead trước khi commit

1. **Chỉ D1 cần quyết định**: fix 2 chỗ `relative` (`DataTable.tsx:601`, `FormulaVolumeDiscount.tsx:33`) là hết 7/7 defect 390; nếu chưa fix trong đợt này, ghi vào backlog P2 mobile.
2. D2 (pricing 1440 khung trống ~2s) nên thêm skeleton/loading ở admin section — P3.
3. Tree đã đổi giữa sweep (FL-2a-publish). **Toàn bộ evidence/gates ở trên thuộc tree `f968dcc5…`**; nếu Lead commit đúng tree này thì kết quả áp dụng nguyên. Nếu agent khác sửa tiếp, cần rebuild + rerun sweep (script sẵn trong `/tmp/app-sweep`).
4. `dist/` hiện là build của tree này (gitignored) — preview đã tắt.
5. Ảnh: **97 file** `/tmp/app-sweep/shots/` (route 390/1440 + feature: checkout, tracking, admin confirm/order detail, admin product, KYC, pricing tabs, designer publish, overflow evidence).
