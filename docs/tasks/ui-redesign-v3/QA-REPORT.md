<!-- doc-meta: status=active; verified=2026-10-20; owner=qa-verify -->
# QA-REPORT — UI/UX v3 "Soft Studio" (W6 · QA độc lập)

> **Snapshot đo cuối:** `HEAD 97cc256` + working tree W1–W5c, **2026-10-20 15:03–15:12**
> (159 file dirty, chưa commit). Cây **đã bị sửa trong lúc QA** (W5c: 14:36–14:58) ⇒ toàn bộ số
> liệu dưới đây được **đo lại sau W5c**, không dùng kết quả của R1/R2/W5 làm bằng chứng thay thế.
> **Read-only:** không sửa `src/**`, không commit; chỉ ghi file này (+ harness/ảnh ở `/tmp`).
>
> **Phương pháp:** `npm run lint`, `npm run build`, 10 gate offline qua `scripts/run-checks.mjs`,
> **browser thật** (Chromium 1244 headless, dev server `:3010`), fixture **ở tầng network**
> (Supabase paused; không thêm file/mock nào vào `src/`). Harness: `/tmp/vcube-qa/*.mjs`;
> ảnh: `/tmp/vcube-qa-shots/`.
>
> ⚠️ **Lưu ý phiên bản tài liệu:** một bản `QA-REPORT.md` nháp được tạo lúc **15:01** (bởi phiên
> khác) kết luận *0 P0 / GO-WITH-RISKS* dựa trên **trích dẫn review**, không có phép đo độc lập.
> Bản này thay thế bản nháp đó; chỗ khác biệt được nêu ở §9.3.

---

## 0. Kết luận (verdict)

# **GO-WITH-RISKS** (sau khi vá QA-01/QA-02 + copy; xem §11)

| | |
|---|---|
| **P0 còn mở** | **0** — QA-01 đã vá và đo lại (`/orders` 390 `scrollWidth = 390`) |
| **P2 còn mở** | **5 ngoại lệ có ghi** — UI-014, UI-015, UI-018, UI-025, A11Y-12; UI-027 đã đóng code (QA-02 hết) |
| **P1** | **0** xác nhận (UI-003…UI-011 đóng thật; UI-007 đóng nốt bằng CC-02) |
| **Điều kiện còn lại** | real data/RLS (Supabase paused), browser Safari/iOS/SR, các modal cần data thật |

> Bản đo gốc **NO-GO** vì QA-01 (`/orders` 390) + QA-02 (2 trigger); sau khi vá, probe lại
> `probe-orders3.mjs` = `sw:390, candidates:[]` và `probe-header.mjs` = đúng 1 trigger mỗi
> breakpoint. Các rủi ro dữ liệu thật/RLS vẫn nguyên (§10).

---

## 1. Gate (chạy trên cây sau W5c)

| Gate | Lệnh | Kết quả |
|---|---|---|
| Typecheck | `npm run lint` | **PASS** — `tsc --noEmit`, exit 0 (`/tmp/vcube-qa-lint2.log`) |
| Build | `npm run build` | **PASS** — `✓ built in 5.40s`, exit 0 (`/tmp/vcube-qa-build2.log`) |
| Contrast token | `node scripts/check-contrast.mjs` | **56/70 PASS + 14 expected non-pass, 0 unexpected fail** |
| Contrast combos | `node scripts/check-contrast-combos.mjs` | **SẠCH** — 99 file, 14 luật, **0 tổ hợp < 4.5**; **20 near-miss 4.56:1** (đã biết, pass) |
| UI rules | `check-ui-rules` | **PASS** — rc=0, 0 vi phạm |
| Data honesty | `check-fabricated` | **SẠCH** — rc=0 |
| Icon names | `check-icon-names` | **PASS** — rc=0 |
| Error handling | `check-error-handling` | **PASS** — rc=0 |
| Unit-price multiplier | `check-unitprice-multiplier` | **PASS** — rc=0 |
| SQL syntax | `a8-sql-syntax-check` | **PASS** — rc=0 |
| RLS lint | `lint-rls-migration` + `lint-rls-sources` | **PASS** — rc=0 |
| Tổng hợp 10 gate | `node scripts/run-checks.mjs --only …` | **KHÔNG TỆ HƠN BASELINE**, exit 0 |
| Live RLS / DB | `verify-rls`, `inspect-db` | **SKIP** — Supabase paused (theo chỉ đạo) |
| Full repo check | `npm run check` | **KHÔNG chạy full** (có thể treo vì gate live; đã chạy đúng 10 gate offline) |

**Gate browser (do QA tự chạy):** 36 lượt tải (12 route × 390/768/1440) — **0 `pageerror`**;
1 console error lặp lại ở `/personalize/p1` (React "unique key", §5).

---

## 2. Viewport matrix — 12 route × 390/768/1440

Đo tại `localhost:3010`, fixture network-layer (products/materials/pricing + 1 `orders` row +
session admin). Mỗi ô kiểm: `documentElement.scrollWidth ≤ innerWidth`, `h1` đúng 1, `pageerror`,
dialog mở ngoài ý muốn.

| Route | 390 | 768 | 1440 | Ghi chú |
|---|---|---|---|---|
| `/` | ✅ | ✅ | ✅ | 1 h1; không tràn; ảnh lazy (xem §10) |
| `/explore` | ✅ | ✅ | ✅ | 1 h1; filter row cuộn ngang **trong** khung (hợp lệ) |
| `/products/p1` | ✅ | ✅ | ✅ | 1 h1; toolbar 3D/swatch/tab ≥44 ở 390 |
| `/personalize/p1` | ✅ | ✅ | ✅ | 1 h1; console error "unique key" (§5.4) |
| `/cart` | ✅ | ✅ | ✅ | **1 h1** cả nhánh rỗng (A11Y-09 đã vá ở W5c) |
| `/checkout` | ✅ | ✅ | ✅ | **1 h1 "Thanh Toán"** ở cả nhánh rỗng và có hàng — đúng yêu cầu |
| `/auth/login` | ✅ | ✅ | ✅ | 1 h1 |
| `/orders` | ❌ **+64px** | ✅ | ✅ | **QA-01 (P0)** — xem §3.1 |
| `/admin/overview` | ✅ | ✅ | ✅ | 1 h1 (sr-only) + h2 panel |
| `/lab` | ✅ | ✅ | ✅ | 1 h1; console shell |
| `/designer` | ✅ | ✅ | ✅ | 1 h1; console shell |
| `/quote` | ✅ | ✅ | ✅ | 1 h1; empty state đúng |

**Tổng: 35/36 ô PASS.** Ảnh: `/tmp/vcube-qa-shots/{slug}-{390|768|1440}.png` (36 file).

**Đo bổ sung ngoài 12 route** (1440, cùng fixture): `/admin`, `/admin/products`, `/admin/queue`,
`/admin/storefront`, `/admin/analytics`, `/tracking`, `/assets` — **0 trang 404, đúng 1 h1, 0 tràn**.
**390 bổ sung:** `/cart` có hàng (1 h1, không tràn), `/checkout` có hàng (1 h1, không tràn).

---

## 3. Findings mới (QA phát hiện, không có trong register/review)

### 3.1 `QA-01` — **P0** · `/orders` tràn ngang 64px ở 390 (tooltip tiến độ 8 nấc)

- **Đo:** `documentElement.scrollWidth = 454` khi `innerWidth = 390` (+64px), ảnh full-page
  **454×1795** (`/tmp/vcube-qa-shots/orders-390.png`, `orders-390-final.png`).
- **Nguồn duy nhất:** tooltip hover của nấc cuối trong thanh tiến độ 8 nấc:
  `src/frontend/components/OrderProgress.tsx:91` —
  `absolute -top-8 … whitespace-nowrap` **không có `left/right` constraint**.
  Đo: `position:absolute`, `opacity:0`, `right = 454`, text `"8. Xuất xưởng giao"`.
  Ẩn toàn bộ phần tử `absolute` (display:none) ⇒ `scrollWidth` về **390** ⇒ khẳng định nguồn.
- **Vì sao review trước không thấy:** R2/consistency đo `/orders` với **bảng rỗng** (`orders = []`);
  lỗi chỉ xuất hiện khi **có ≥1 đơn** (dữ liệu thật sau khi Resume, hoặc fixture).
- **Tác động:** người dùng mobile có đơn hàng bị kéo ngang trang 64px, nền/footer rộng 454px,
  dễ chạm nhầm khi vuốt; vi phạm PLAN §6.1 ("tràn ngang 390" = P0).
- **Fix đề xuất (1 dòng):** thêm `right-0` vào tooltip (và nên `max-md:hidden` vì tooltip
  hover vô dụng trên touch); hoặc `overflow-x: clip` cho card đơn.
- **ID đề nghị cho register:** `UI-042`.

### 3.2 `QA-02` / `UI-027` tái phát — **P2** · dưới 768px có **2 nút** mở cùng drawer

- **Đo @390:** `header` có **2** button `aria-label="Mở menu & tìm kiếm"`, cùng 44×44, cùng gọi
  `setMobileMenuOpen(true)`; ảnh `header-390.png` (kính lúp + giỏ + hamburger).
- **Nguyên nhân:** `.touch-target-btn` trong `src/index.css:426-434` nằm trong
  `@media (max-width:767px)` và đặt `display:inline-flex` **không layer** ⇒ **thắng utility
  `hidden`** của Tailwind v4. Nút search `className="hidden lg:flex 2xl:hidden … touch-target-btn"`
  (`Header.tsx:230`) vì vậy vẫn `display: flex` ở ≤767px.
- **Hệ quả:** CC-07 (W5) và tuyên bố "A11Y-13 ĐÃ ĐÓNG / mỗi breakpoint đúng 1 trigger"
  (`integration.md` §12.3) **sai ở mobile**; desktop ≥1024 đúng 1 trigger.
- **Đo @768:** đúng 1 trigger (44×40). `@1024`: 1 trigger 44×40; `@1440`: 1 trigger 44×40.
- **Fix:** bỏ `display` khỏi `.touch-target-btn` (chỉ giữ `min-*`), hoặc bọc rule trong
  `@layer utilities`/thêm `[hidden]` guard, hoặc đổi nút search thành `hidden lg:inline-flex`.
- **ID đề nghị:** giữ `UI-027` (mở lại), ghi `QA-02` trong log.

### 3.3 Các nit P3 mới

| ID | Vị trí | Vấn đề | Đề xuất |
|---|---|---|---|
| **QA-03** | `src/frontend/views/PersonalizeView.tsx` (React warning "unique key" trong `ForwardRef`) | Console error ở **mọi** width trên `/personalize/p1` | thêm `key` ổn định cho list |
| **QA-04** | `src/frontend/components/InvoiceModal.tsx` | Ở 390 ẩn **2 cột** "Vật Liệu & Dung Sai" + "Đơn Giá" (còn STT/Chi tiết/SL/Thành Tiền) — hoá đơn mobile mất đơn giá | ghi nhận là chủ ý, hoặc hiện đơn giá dưới dạng dòng phụ |
| **QA-05** | `Header.tsx:310` | Hamburger **44×40** ở 768/1024 (bar 44 chỉ áp dụng <768) | nếu muốn 44 tuyệt đối: `min-h-11` (không đổi desktop) |
| **QA-06** | `src/index.css:426-434` | `.touch-target-btn{display:inline-flex}` không layer ⇒ override mọi `display` utility ở <768 (nguồn của QA-02; bẫy cho page sau) | bỏ `display`, hoặc đưa vào `@layer components` |
| **QA-07** | tài liệu | `integration.md` §12.3 ghi A11Y-13 "đã đóng" và §12.4 ghi ring `/20` = 0; đo thực tế: A11Y-13 **sai ở <768**, ring `/20` còn **5** (selected-state, chấp nhận). Bản QA-REPORT nháp 15:01 ghi "0 P0" | sửa lại 2 câu trong `integration.md`; không dùng bản nháp 15:01 |

---

## 4. Modal / StrictMode (CC-01) — PASS

Mở thật bằng click ở **390 và 1440**, chờ ≥900ms (StrictMode đã cleanup→mount lại):

| Overlay | Mở được | Ở lại sau 900ms | `role` / `aria-modal` | Focus vào trong | Esc đóng | Focus trả về trigger |
|---|---|---|---|---|---|---|
| **AuthModal** (drawer → "Đổi Tài Khoản") | ✅ | ✅ `open=1` | `dialog` / **true** | ✅ | ✅ | ✅ ("Mở menu & tìm kiếm") |
| **CartDrawer** (PDP → thêm tệp CAD → nút giỏ) | ✅ | ✅ `open=1` | `dialog` / **true** | ✅ | ✅ | ✅ |
| **QuickView** (`/explore` → "Xem trước 3D") | ✅ | ✅ `open=1` | `dialog` / **true** | ✅ | ✅ | ✅ |
| **InvoiceModal** (`/orders` → "…" → "Hoá đơn") | ✅ | ✅ `open=1` | `dialog` / **true** | ✅ | ✅ | ✅ |

- **CC-01 coi như ĐÓNG**: 3 overlay luôn mount `<Modal>`; không còn hiện tượng "bấm nút không có gì".
- Mỗi trang có 4–8 `<dialog>` trong DOM (các overlay luôn-mount, `open=false`) — **đúng thiết kế**,
  không tính là lỗi; `aria-modal` có trên `<Modal>` và `Sheet` kế thừa (R2 A11Y-07 đã vá).
- **InvoiceModal @390:** body cuộn `clientH 653 / scrollH 999` (1 vùng cuộn, không lồng ngang),
  bảng 306px/6 cột, **0 scroller ngang** — UI-020 đóng đúng.
- **QuickView @390:** CTA chính **316×48** (trước 316×16) ⇒ R2 **A11Y-01 (B) đã đóng**;
  metrology `grid-cols-2` (158px×2), không truncate ⇒ A11Y-11 đóng; nút "Tuỳ biến" có
  `aria-label="Tuỳ biến 3D & khắc laser"` ⇒ A11Y-10 đóng.

**Chưa mở được** (thiếu dữ liệu/cần luồng riêng): `WarrantyClaim` (đã đọc code — có form + trạng thái
"chưa gửi được"), `MachineComparisonModal`, `StlVs3mfComparisonModal`, `StlUnitConfirmModal`,
`InternalCostBreakdownModal`, modal sửa của admin. Chúng dùng chung `Modal` primitive đã kiểm.

---

## 5. Tap target & heading/loading a11y

### 5.1 Tap target (đo `getBoundingClientRect`)

| Phần tử | 390 | 768 | 1440 |
|---|---|---|---|
| Hamburger header | **44×44** ✅ | 44×**40** (QA-05) | 44×40 (trigger search) |
| Nút search drawer (thứ 2, QA-02) | **44×44** ⚠️ (không nên tồn tại) | ẩn (đúng) | 44×40 |
| Nút giỏ header | 48×48 ✅ | 40×40 | 40×40 |
| PDP: toolbar 3D, swatch màu, tab, select/input | **≥44** ✅ (5 nút toolbar 44×44, swatch 44×44, tab 44) | — | 40/31/40 (desktop, không đổi) |
| Drawer mobile: hàng nav + ô search | ≥44 ✅ | — | — |
| Footer (text button) | 16px cao — **ngoại lệ A11Y-14** (inline text link, đạt WCAG 2.5.8) | — | 16px |
| `InfoTip` / tag chip | 24px — ngoại lệ A11Y-14 | — | — |

Kết luận: **không còn control cảm ứng <44px ngoài ngoại lệ đã ghi** ở 12 route chính; lỗi A11Y-05 (R2)
đã đóng. Hamburger 44×40 ở 768 là nit (bar 44 của repo chỉ áp <768).

### 5.2 Heading

- **35/36 ô có đúng 1 `h1`**; ô còn lại `/orders@390` vẫn 1 `h1` — matrix PASS heading toàn bộ.
- `/checkout`: **đúng 1 `h1` "Thanh Toán"** ở cả nhánh giỏ rỗng và có hàng (yêu cầu cụ thể) ✅.
- `/cart` rỗng: **đã có `h1.sr-only`** (A11Y-09 đóng ở W5c) ✅; `/cart` có hàng: 1 `h1` visible.
- `/admin/*`: 1 `h1` sr-only theo section + `h2` panel (CC-06) ⇒ thứ bậc liền mạch; **không có
  tiêu đề h1 nhìn thấy** trên console (quyết định thiết kế, đã ghi).
- `PageSkeleton` là fallback `Suspense` của mọi route lazy: **không** tạo `h1`.

### 5.3 Loading / live region

- `PageSkeleton`: `role="status"` + `aria-live="polite"` + `aria-busy="true"` + nhãn VI
  "Đang tải trang, vui lòng chờ…". **Đo thật** bằng cách giữ chunk `Tool3DView` 2.5s:
  @390 `390×1113`, @1440 `1440×660`, đủ 3 thuộc tính, text VI — **PASS**.
- Rủi ro đã ghi (W5b): `aria-busy=true` có thể khiến một số AT hoãn thông báo; **chưa test SR thật**.
- Skeleton vẫn dùng **một copy chung** ("Đang tải thư viện xử lý 3D & dữ liệu CAD bồi đắp") cho cả
  `/quote` và `/lab`; container đã về `max-w-7xl` (UI-038 đóng một phần, copy theo surface còn mở).

### 5.4 Console / runtime

- **0 `pageerror`** trên 36 lượt tải.
- **1 console error lặp lại**: React "Each child in a list should have a unique key" —
  `/personalize/p1` ở cả 3 width (`QA-03`, P3). Không ảnh hưởng render nhưng làm bẩn dev console.
- Focus ring: **0** `focus:ring-ring/20` còn trong `focus:` (còn 5 ở selected-state, chấp nhận);
  admin StatCard khi Tab: `outline: rgb(28,25,23) solid 2px; offset 2px` ⇒ R2 **A11Y-02 đóng**.
- `aria-modal=true` trên mọi dialog mở; `aria-label` giỏ hàng có số lượng
  ("Giỏ hàng, 1 sản phẩm") ⇒ R2 **A11Y-08 đóng**.

---

## 6. Ngôn ngữ, tiền tệ, CTA

### 6.1 English ngoài allowlist — **còn 4 chuỗi hiển thị**

Audit = code grep + **text browser** trên 12 route × 3 width + 9 route console (fixture VI).

| Chuỗi | Vị trí | Mức |
|---|---|---|
| `Báo giá file 3D của bạn` | `HomeView.tsx:931` (CTA hero) | P3 (UI-031) — D-E: `File → Tệp` |
| `Tải file CAD của bạn` | `HomeView.tsx:952` | P3 |
| `Tải file STL / STEP / 3MF lên hệ thống.` | `HomeView.tsx:1324` (quy trình 4 bước) | P3 |
| `Báo giá file 3D trực tuyến` | `LanguageContext.tsx:384` (footer) | P3 |
| `Cấu hình phí ship & thông báo` | `LanguageContext` + `AdminStorefrontPanel.tsx:772` | P3 ("ship" ngoài allowlist) |

- **Admin/lab/designer:** quét 9 route (`/admin/overview`, `storefront`, `pricing`, `products`,
  `queue`, `warehouse`, `seo`, `settings`, `/lab`, `/designer`) — **0 chuỗi EN** ngoài allowlist;
  `Pending/Verified/Sales/Pioneer/% Match/Min/Max/enum thô` **đã hết** (CC-02 đóng).
- **aria/placeholder:** `name@domain.vn`, `admin`, `tech@xuongin3d.vn` (placeholder — P3);
  `aria-label="Điều hướng studio tác giả"` (`App.tsx:543`) còn "studio" (D-A) — P3.
- **Nhãn hỏi đáp:** "Theo dõi đơn hàng thời gian thực" → `/orders` (`App.tsx:2059`);
  nhãn hứa tracking realtime nhưng đích là danh sách đơn — **data-honesty** P3 (CC-17).
- **Kết luận gate ngôn ngữ:** exit criteria "0 English ngoài allowlist" **hiện FAIL** (4–5 chuỗi).
  Nếu Lead áp PLAN §6.1 theo nghĩa đen ("English lẫn = P1") thì đây là **P1**; register xếp P3
  nên báo cáo giữ **P3**, nhưng phải sửa trước khi tuyên bố "một ngôn ngữ".

### 6.2 Tiền tệ

- **Storefront dùng `₫`**: 0 chuỗi tiền nối tay `" đ"` trong text render của 12 route
  (`/` 3, `/explore` 7, `/products/p1` 6, `/personalize/p1` 15, `/orders` 1, `/admin` 1, `/lab` 1).
- **Còn `đ/g` ở console**: `Tool3DView.tsx:1325,1339`, `WarehouseInventoryPanel.tsx:208` — 3 chỗ,
  P3 (UI-039 đóng ở storefront, chưa đóng ở console).

### 6.3 CTA chết — **không phát hiện**

- Header 6/6 nav điều hướng đúng (`/explore`, `/quote`, `/orders`, `/lab`, `/designer`, `/admin`).
- Footer 8/8 button điều hướng đúng (`/explore`, `/quote`, `/cart`, `/orders`, `/admin`,
  `/admin/products`, `/admin/queue`, `/admin/storefront`).
- Home: "Báo giá tệp 3D tức thì" → `/quote`; "Gửi Ý Tưởng Mới" mở modal; "Khám Phá Kho Mẫu CAD"
  là **anchor** — đo `scrollY 0 → 1852`, tiêu đề đích `top = 80.3px` (đúng header 80) ⇒ không chết.
- PDP: "Lưu" → toast "Đã lưu bản vẽ…"; "Chia sẻ" → toast "Đã sao chép liên kết…";
  "Tuỳ biến 3D & khắc laser" → `/personalize/p1`; "Khung 3D"/"Thư viện ảnh (3)" đổi tab tại chỗ.
- 0 `href="#"` / `javascript:`; 0 `alert()`; 0 `window.confirm` thật (chỉ comment).
- **Giới hạn:** phần lớn CTA dùng `<button onClick>`, không phải `<a href>` ⇒ crawl link không đủ;
  QA đã click trực tiếp 18 CTA chính + 8 footer. CTA phụ trong admin chưa click hết.

---

## 7. Register `UI-DEFECTS.md` — đối chiếu sau W5c

**32/41 mục ĐÓNG (đã kiểm), 9 mục còn mở/partial:**

| Nhóm | Mục còn mở | Bằng chứng đo |
|---|---|---|
| **P2** | `UI-014` raw `<button>` (AuthModal 6, UserAvatarMenu 11, Tool3D 16, Explore 12, Home 9) — ngoại lệ có ghi | đếm `grep -c "<button"` |
| **P2** | `UI-015` raw form control (`PricingConfigPanel` **73**, `AccessoriesManager` 21) — ngoại lệ có ghi | grep; AST label chưa chạy toàn bộ |
| **P2** | `UI-018` nav 1024–1279 bị cắt nhưng chỉ có fade, **chưa có overflow menu** | code |
| **P2** | `UI-025` hotline (`bottom-6 left-6`) + FAB (`bottom-6 right-6`) vẫn là **2 CTA nổi**, chưa gom cụm | ảnh Home 1440 |
| **P2** | `UI-027` **tái phát <768** — xem QA-02 | đo 2 trigger 44×44 @390 |
| **P2** | `A11Y-12` `MachineComparisonModal` bảng 6 cột @390 chưa có card fallback | code (`overflow-x-auto`, không card) |
| **P3** | `UI-031` `File`/`ship` còn 4–5 chuỗi | §6.1 |
| **P3** | `UI-036` `Section`/`Toolbar`/`ToastViewport` vẫn export, **0 import** | grep |
| **P3** | `UI-038` skeleton dùng chung copy cho storefront/console | ảnh `quote-skeleton-390.png` |
| **P3** | `UI-039` `đ/g` console 3 chỗ | grep |
| **P3** | `CC-15` docblock token cũ (`Modal` 20px, `Section` 24px, `PersonalizeView` #8590A6) | code |
| **P3** | `CC-16` `studio` trong aria-label, `Quản Trị Hệ Thống` hoa/thường, `• NCC:` | code |
| **P3** | `CC-17` "Theo dõi đơn hàng thời gian thực" → `/orders` | code |
| **P3** | `CC-18` sticky `top-20` (Explore) vs `lg:top-24` (PDP/Cart/Checkout/Personalize) | code |

**Đã kiểm và xác nhận ĐÓNG (không báo lại):** UI-001, 002, 003, 004, 005, 006, 007, 008, 009,
010, 011, 012, 013, 016, 017, 019, 020, 021, 022, 023, 024, 026, 028, 029, 030, 032, 033, 034,
035, 037, 040, 041 (32 mục) + R2 **A11Y-01…A11Y-03, A11Y-05…A11Y-11** đóng;
**A11Y-04 đóng một phần** (có `role="img"` + nhãn VI, **chưa** keyboard orbit/zoom);
A11Y-13 chỉ còn đúng ở ≥768 (sai ở <768); A11Y-06 đóng (0 `focus:ring-ring/20`).

### 7.1 Đếm defect còn mở (đề xuất cập nhật register)

| Mức | Số | ID |
|---|---:|---|
| **P0** | **1** | `QA-01` → đề nghị `UI-042` (`/orders` tràn 390) |
| **P1** | **0** | — |
| **P2** | **6** | `UI-014`, `UI-015`, `UI-018`, `UI-025`, `UI-027` (QA-02), `A11Y-12` |
| **P3** | **13** | `UI-031`, `UI-036`, `UI-038`, `UI-039`, `CC-15`, `CC-16`, `CC-17`, `CC-18`, `QA-03`…`QA-07` |
| **Tổng** | **20** | trong đó **7** là must-fix trước release (P0 + UI-027 + 5 chuỗi EN nếu Lead áp §6.1) |

> So với register gốc (41 mục, 38 mở lúc W0): **−18 mục**, nhưng phát sinh **1 P0** do dữ liệu đơn
> — đúng loại lỗi "chỉ thấy khi có dữ liệu thật" mà exit criteria nhắm tới.

---

## 8. Bằng chứng & giới hạn

**Ảnh (55 file, `/tmp/vcube-qa-shots/`):**
- Matrix 36: `home|explore|products-p1|personalize-p1|cart|checkout|auth-login|orders|admin-overview|lab|designer|quote-{390,768,1440}.png`
- Modal: `modal-auth-{390,1440}.png`, `modal-cartdrawer-{390,1440}.png`,
  `modal-quickview-{390,1440}.png`, `modal-invoice-{390,1440}.png`
- Chuyên biệt: `orders-390.png` (454px — P0), `orders-390-final.png`, `orders-details-390.png`,
  `header-390.png` (2 trigger — QA-02), `drawer-390x667.png`, `cart-empty-390.png`,
  `cart-with-item-{390,1440}.png`, `checkout-with-item-{390,1440}.png`,
  `admin-focus-1440.png`, `home-catalog-390.png` (card sản phẩm render đúng khi cuộn),
  `quote-skeleton-{390,1440}.png`, `lab-skeleton-390.png`.

**Harness (ngoài repo, không commit):** `/tmp/vcube-qa/matrix.mjs`, `modals.mjs`, `modals2.mjs`,
`final.mjs`, `final2.mjs`, `lang2.mjs`, `links.mjs`, `cta.mjs`, `drawer667.mjs`,
`probe-orders*.mjs`, `probe-header.mjs`, `adminlang.mjs`; fixture `/tmp/vcube-fixtures.cjs`.

**Giới hạn (đọc trước khi dùng báo cáo):**
1. **Supabase paused** ⇒ catalog/materials/pricing/orders/roles là fixture network-layer; **RLS,
   dữ liệu thật, ảnh thật, giá thật, realtime chưa kiểm**. Đặc biệt: P0 QA-01 chỉ lộ ra nhờ
   fixture đơn hàng — **phải chụp lại sau Resume** với đơn thật.
2. **Cây thay đổi trong lúc QA** (W5c 14:36–14:58; `integration.md` sửa 15:03). Số liệu pin ở
   **15:03–15:12**; file nào sửa sau đó phải đo lại.
3. **Chromium 1244 headless only** — không Safari/Firefox/iOS, không bàn phím mềm/safe-area,
   không VoiceOver/NVDA; `backdrop-blur`, `mask-image`, `dvh` chưa xác nhận trên thiết bị thật.
4. **Ảnh full-page có ảnh sản phẩm lazy chưa nạp** (nền trắng) — artefact chụp, **không phải lỗi**:
   khi cuộn tới, `naturalWidth=800`, card render đủ (`home-catalog-390.png`).
5. **Modal cần dữ liệu chưa mở**: MachineComparison/StlVs3mf/StlUnit/InternalCost/Warranty/admin edit
   — chỉ đọc code + dùng chung `Modal`.
6. **Không chạy `npm run check` full** (theo chỉ đạo, tránh treo gate live) và **không** chạy
   `verify-rls`/`inspect-db`.

---

## 9. Release recommendation

### 9.1 Verdict: **NO-GO** (hiện tại) → **GO-WITH-RISKS** sau 2 fix

**Must-fix trước release (ước tính ~3 dòng):**

1. **QA-01 (P0)** — `OrderProgress.tsx:91`: thêm `right-0` (+ `max-md:hidden`) cho tooltip, hoặc
   `overflow-x: clip` cho card đơn. Kiểm lại `/orders` 390 có đơn: `scrollWidth == 390`.
2. **UI-027 (P2)** — `index.css:426-434`: bỏ `display:inline-flex` khỏi `.touch-target-btn`
   (giữ `min-height/min-width`); kiểm @390 chỉ còn **1** nút `aria-label="Mở menu & tìm kiếm"`.
3. (Khuyến nghị, nếu muốn tuyên bố "một ngôn ngữ") — đổi 4–5 chuỗi `file`/`ship` (§6.1).

Sau 3 mục trên: chạy lại `matrix.mjs` (36 ô) + 4 modal + `lint/build` ⇒ dự kiến **GO-WITH-RISKS**.

### 9.2 Residual risks (không thể đóng trong phiên này)

| Rủi ro | Mức | Ghi chú |
|---|---|---|
| **Supabase paused — chưa kiểm dữ liệu thật/RLS** | **Cao** | Fixture không đại diện số dòng, chuỗi dài, ảnh, quyền. `verify-rls`/`inspect-db` chưa chạy. **Không sign-off production** dựa trên báo cáo này |
| **P0 chỉ thấy với dữ liệu đơn** | Cao | Chứng minh matrix review trước (bảng rỗng) không đủ; sau Resume phải chụp lại 390 với ≥1 đơn |
| Mobile <768 duplicate drawer trigger (QA-02) | Trung bình | Đã có fix 1 class; nếu không vá, 2 affordance + 2 tên giống nhau cho AT |
| `MachineComparisonModal` 6 cột @390 (A11Y-12) | Trung bình | Ngoại lệ có ghi; chưa card fallback |
| 3D canvas: `role=img` + nhãn VI nhưng **orbit vẫn pointer-only** (A11Y-04 residual) | Trung bình | SR chỉ nghe mô tả, không thao tác được model |
| Focus ring `ring/20` ở 5 selected-state + UA outline ~50 nút admin (A11Y-15) | Thấp | Không phải control form; vẫn thấy focus |
| `aria-busy=true` có thể làm AT hoãn thông báo skeleton | Thấp | Cần test SR thật |
| English `file`/`ship` (nếu không sửa) | Thấp–TB | Vi phạm D-E + exit criteria "0 English" |
| 159 file dirty chưa commit | Trung bình | Cần tách commit (v2/v3/docs) trước merge; QA không commit |
| Build ghi `dist/` (gitignore) | Thấp | Không ảnh hưởng |

### 9.3 Khác biệt với các tài liệu trước (để không "đóng khống")

| Nguồn | Tuyên bố | Đo thực tế (báo cáo này) |
|---|---|---|
| `review/integration.md` §12.3 | A11Y-13 "ĐÃ ĐÓNG — mỗi breakpoint đúng 1 trigger" | **Sai <768**: 2 trigger 44×44, cùng `aria-label` (QA-02) |
| `review/integration.md` §12.4 | ring `/20` = 0 | Đúng sau codemod 14:54: `focus:ring-ring/20` = 0; còn 5 selected-state (chấp nhận) |
| Bản `QA-REPORT.md` nháp 15:01 | "0 P0", "22 route 0 tràn ngang", "visible EN = 0" | **0 P0 sai** (QA-01); 0 tràn chỉ đúng khi bảng đơn rỗng; EN còn 4–5 chuỗi |
| `review/a11y-responsive.md` §0 | "22 route × 390/768/1440 — 0 overflow" | Đúng với bảng rỗng; **sai khi có đơn** |
| `review/consistency.md` §3 | UI-007 đóng một phần (CC-02) | Đã đóng nốt: 9 route console **0 EN** |
| Register W0 | 38 mục mở (26 P0/P1/P2) | Còn **20 mục** (1 P0, 6 P2, 13 P3) — xem §7.1 |

---

## 10. Đề nghị (thứ tự thực hiện)

1. Vá **QA-01** + **UI-027** (2 file, ~3 dòng), chạy lại `npm run lint` + `npm run build`.
2. Chạy lại `/tmp/vcube-qa/matrix.mjs` (36 ô) + `modals2.mjs`; xác nhận `/orders@390 = 390px`
   và @390 chỉ 1 nút menu.
3. Cập nhật `UI-DEFECTS.md`: thêm **UI-042 (P0)** = QA-01; mở lại **UI-027**; ghi QA-03…QA-07;
   sửa 2 câu "đã đóng" trong `integration.md` §12.3.
4. Chốt 4–5 chuỗi `file`/`ship` (D-E) hoặc ghi ngoại lệ có chữ ký Lead.
5. **Resume Supabase** → chạy `verify-rls`, `inspect-db`, mở catalog + ≥1 đơn thật, chụp lại
   390/768/1440 **trước khi** coi là release production.
6. Commit/tag baseline UI v3 trên branch riêng; không trộn migration khác.

---

*QA W6 — read-only với `src/**`; chỉ ghi file này. Không commit. Snapshot đo: 2026-10-20 15:03–15:12.*

---

## 11. Post-QA fixes & recheck (2026-10-20 15:5x)

| QA ID | Trạng thái | Bằng chứng |
|---|---|---|
| **QA-01 P0** `/orders` 390 +64px | **FIXED** | `OrderProgress.tsx:91` tooltip thêm `right-0 max-md:hidden`. Chạy lại `probe-orders3.mjs`: `{ "sw": 390, "candidates": [] }` (fixture có 1 order) |
| **QA-02 P2** 2 trigger dưới 768 | **FIXED** | `src/index.css` `.touch-target-btn` bỏ `display:inline-flex` (giữ min 44px). `probe-header.mjs`: 390 chỉ 1 nút “Mở menu & tìm kiếm” (44×44); 768/1024/1440 đúng 1 trigger |
| **Copy EN `file`/`ship`** | **FIXED** | `HomeView` 3 chuỗi “file” → “tệp”; `LanguageContext.footerInstantQuote` → “tệp”; `AdminStorefrontPanel` “phí ship” → “phí vận chuyển”. Grep visible = 0 (chỉ còn comment/code identifier) |
| Focus ring `/20` | **0** focus occurrences | 5 selected-state `ring-ring/20` giữ nguyên (không phải focus) |
| Gates sau fix | **PASS** | `npm run lint` PASS · `npm run build` PASS (5.25s) · 10 gate offline PASS · contrast/combos SẠCH |

**Đo lại nhanh:** `/orders` 390 `documentElement.scrollWidth = 390` (trước 454); header 390
chỉ hamburger + cart (trước có thêm nút search thứ hai); `/personalize` vẫn còn **1 console
warning key** (QA-03, P3) — không ảnh hưởng render.

**Kết luận cập nhật:** **GO-WITH-RISKS cho UI-only**. P0 = 0; P1 = 0; P2 còn 5 ngoại lệ có ghi
(UI-014, UI-015, UI-018, UI-025, A11Y-12); P3 còn nit (QA-03 key warning, UI-036 primitive chết,
CC-15/16/17/18, `đ/g` 3 chỗ console). Chưa kiểm real data/RLS, Safari/iOS/VoiceOver.
