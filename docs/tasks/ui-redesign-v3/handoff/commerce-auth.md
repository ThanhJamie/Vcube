<!-- doc-meta: status=active; verified=2026-10-20; owner=commerce-auth -->
# HANDOFF — W2 Transaction + Auth (commerce-auth) · v3 "Soft Studio"

> **Trạng thái: DONE.** `npm run lint` PASS · `npm run build` PASS · toàn bộ gate offline xanh
> (`check-fabricated`, `check-ui-rules`, `check-contrast`, `check-contrast-combos`, `check-icon-names`).
> Không commit/push. Không sửa file ngoài write scope của task-5.
> Đọc kèm: `DESIGN-LANGUAGE.md` (v3), `UI-DEFECTS.md`, `COPY-GLOSSARY.md`,
> `handoff/design-foundation.md`.

---

## 1. Files changed (13 — đúng write scope)

### 1.1 Views (8)

| File | Thay đổi chính |
|---|---|
| `src/frontend/views/CartView.tsx` | Panel → `Card variant="soft"` (freeship, 2 section, promo, summary sticky); giữ density dòng hàng (item row vẫn hairline); money qua `Money` (bỏ nối tay ` đ`); bỏ badge EN `FREESHIP`; bỏ tuyên bố "mã hóa 256-bit" không có nguồn; `File`→`Tệp`, `sp`→`sản phẩm`; khoá overflow ngang dòng hàng 390 (gap-3 + price `min-w-0 whitespace-nowrap`) |
| `src/frontend/views/CheckoutView.tsx` | Card soft cho step tracker / banner tài khoản / 3 section form / manifest; `ROLE_LABEL` VI cho chip role (trước đó render enum `customer`); `Hub`→`đầu mối`, `Guest Checkout`/`Access Token`→VI; bỏ hứa hẹn tự động sai (`Tự động điền số tiền & xác nhận 2s`, `Thẻ ATM/Visa`) → "VCUBE đối soát thủ công"/"chưa kết nối cổng"; `Qty`→`SL`; money qua `Money`; payment sublabel `fg-subtle`→`fg-muted` (UI-017) |
| `src/frontend/views/OrderSuccessView.tsx` | Reading template `max-w-3xl`; main + details → Card soft; bỏ `(GUEST ACCESS TOKEN)`; stage 3/4 `fg-subtle` trên `surface-muted` → `fg-muted`; `File`→`Tệp`; giữ nguyên trạng thái thanh toán đọc từ đơn (không hứa "đã thanh toán") |
| `src/frontend/views/OrderTrackingView.tsx` | Card soft cho portal / pipeline / đo kiểm / bảng linh kiện / thanh toán; badge `GUEST ORDER`→"Đơn khách vãng lai"; `Token`→"mã truy cập"; 2 CTA dạng text → `Button variant="ghost"`; `fg-subtle` trên `surface-muted`→`fg-muted` (telemetry, thead) |
| `src/frontend/views/MyOrdersView.tsx` | **UI-004 phần của file**: eyebrow `VCUBE MES ARCHIVE // CLIENT FABRICATION RECORDS` → "Hồ sơ gia công của khách hàng"; order card → Card soft; **thêm empty state thật** (`orders.length === 0`, CTA Khám phá) tách khỏi empty-do-lọc; count chip + placeholder ảnh `fg-subtle`→`fg-muted` (UI-017); dịch option bảo hành (Tolerance/Delamination/Datasheet); CTA "Thanh toán ngay" mở hoá đơn (ngõ cụt) → "Xem hướng dẫn thanh toán" mở tracking; `Hóa đơn VAT`→"Hoá đơn" |
| `src/frontend/views/AssetLibraryView.tsx` | Asset card → Card soft; nút "Xem 3D" raw → `Button`; `Update`→"Cập nhật"; bỏ jargon `order_files` khỏi UI khách; `File`→`Tệp`; box "chưa hỗ trợ tải" `fg-subtle`→`fg-muted`; giữ empty state thật vs empty-do-lọc + disclaimer tải trực tiếp |
| `src/frontend/views/LoginView.tsx` | **UI-013**: xoá `alert()` → notice inline (`role="status"`); auth card `Card variant="soft"` 1 CTA; bỏ control chết "Ghi nhớ đăng nhập" (state không được đọc); `VCUBE HUBS`→"Trung tâm VCUBE"; email `autoComplete="username"` + `inputMode="email"` (field là email-hoặc-account-id), password `autoComplete="current-password"`; error box `role="alert"`; cờ Google/reset giữ nguyên gated |
| `src/frontend/views/RegisterView.tsx` | Card soft; **terms mặc định KHÔNG tick** (consent chủ động); segmented track/active theo recipe v3 `rounded-full` + `shadow-soft`; xác nhận mật khẩu dùng `error` của `Field` (aria-describedby) thay vì `<p>` rời; strength meter `role="status"`; `autoComplete` name/email/new-password; `Nhà thiết kế`→"Tác giả 3D"; bỏ style link giả trên điều khoản (không có route trong app); `VCube Hubs`→VCUBE |

### 1.2 Components (5)

| File | Thay đổi chính |
|---|---|
| `src/frontend/components/CartDrawer.tsx` | `FreeShip`→"miễn phí vận chuyển"; money qua `Money` (bỏ `formatNumber(...) + ' đ'`); giữ EmptyState + free-ship progress; sheet/JSX không đổi kiến trúc |
| `src/frontend/components/InvoiceModal.tsx` | **UI-020**: bỏ `min-w-[720px]`; ≤sm ẩn cột "Vật liệu & dung sai" + "Đơn giá", chỉ `sm:min-w-[560px]` ⇒ 390 không còn cuộn ngang lồng trong modal; tiêu đề chỉ ghi "HOÁ ĐƠN GTGT" khi đơn **có** `payment.vatRate` (không bịa VAT); `VIETNAM PRECISION FABRICATION`→"Chế tác chính xác Việt Nam"; `Hotline`→"Tổng đài kỹ thuật"; thead `fg-subtle`→`fg-muted`; **giữ nguyên** hành vi in (`window.print()`, không chữ ký/badge paid giả, chỉ số đã ghi nhận) |
| `src/frontend/components/OrderProgress.tsx` | Thêm `role="progressbar"` + `aria-valuenow/valuetext` cho track compact (trước đây 0 ARIA, tên nấc chỉ có tooltip hover); `title` từng nấc; bỏ `VCUBE Express` (OT-11) → "Chưa có mã vận đơn"; `G-Code & Slicing`→"Cắt lớp & G-code"; câu huỷ đơn không hứa hoàn phí tự động; `fg-subtle`→`fg-muted` trên `surface-muted` |
| `src/frontend/components/AuthModal.tsx` | **UI-019**: bỏ `bodyClassName` flex-column + bỏ `overflow-y-auto` lồng ⇒ **một vùng cuộn duy nhất** (body Modal); **UI-006/E1–E4**: role label VI (`Quản trị viên`, `Tác giả thiết kế 3D`, `Xưởng in (MES)`, `Khách hàng`) — trước đó cả nhãn vai trò VI và chip mini render enum `currentRole`; **UI-014**: 5 nút dismiss/footer/"Đổi tài khoản" raw → `Button`; segmented tabs/role theo recipe v3; bỏ control chết "Ghi nhớ đăng nhập"; `VCUBE HUBS`→"Trung tâm VCUBE"; `Đang hoạt động (Active)`→VI; footer `fg-subtle` trên `surface-muted`→`fg-muted`; error/success thêm `role="alert"/"status"`; cờ `ENABLE_GOOGLE_OAUTH` / `ENABLE_PASSWORD_RESET` **giữ nguyên false** |
| `src/frontend/components/auth/UserAvatarMenu.tsx` | **UI-006/UI-014**: badge `FORGE ADMIN / DESIGNER PRO / MES HUB CNC / CUSTOMER` → VI; tiêu đề section `CREATOR STUDIO / MES HUB & PRINT FLEET / QUẢN TRỊ FORGECONTROL` → VI; bỏ EN trong title/sub (`(Customizer)`, `Studio Thiết Kế`, `(Queue)`), bỏ claim `8 Nấc Chuẩn ISO`; 2 nút footer → `Button` ghost/danger-ghost; **link role lab** `/admin/queue` `/admin/machines` → `/lab` `/lab/machines` (trước đây đẩy xưởng in vào console admin); panel thêm `max-w-[calc(100vw-2rem)]` chống tràn 390. 13 menu-row raw `<button>` **giữ nguyên có lý do** (layout icon-tile + 2 dòng, xem §6) |

---

## 2. v3 áp dụng — tóm tắt quyết định

- **Card**: mọi panel transaction/storefront dùng `<Card variant="soft">`; card con trong danh sách (dòng hàng, progress strip, item pipeline) vẫn **flat/hairline** để giữ phân cấp + density. Không "airy hoá": `p-4`–`p-6`, section dày, bảng 40–44px.
- **Radius**: card 20 (`rounded-lg` qua Card), control/CTA 12 (`Button`/`Input`/`Select`), modal 24 (primitive), segmented dùng recipe `rounded-full` §3.6, pill không dùng cho CTA.
- **Token**: 0 hex mới trong class (các `#4285F4…` là 4 path SVG **brand Google** trong nút OAuth đang gated; `color="#00687a"` là prop màu cho `ThreeModelViewer` — dữ liệu 3D, không phải class). Không đụng `src/index.css` / `src/frontend/ui/**`.
- **Money**: mọi số tiền trong 13 file đi qua `Money`/`formatCurrency` (Lead D-B: giữ `₫`); xoá các chỗ nối tay `formatNumber(x) + ' đ'` ở CartView/CheckoutView/CartDrawer. Ký hiệu tiền không còn trộn trong file mình.
- **Một ngôn ngữ**: không còn chuỗi EN hiển thị/aria/title/placeholder ngoài allowlist + tên riêng (VCUBE, VietQR, VNPAY, Bambu Lab, Supabase, Google, Inkiri) và acronym (`CAD/STL/STEP/3MF/OBJ/WebGL/GPU/API/SKU/KYC/VAT/MES/BOM/PII/RLS/SLA/VND/FDM/SLS/PLA/PETG/ABS/TPU/PA-CF/PVA/Resin/QR/COD/UID/ISO`). `Slicer→cắt lớp`, `Support→vật liệu đỡ`, `Layer→lớp in`, `Infill→độ đặc`, `Hub→đầu mối`, `Studio→xưởng thiết kế`, `Score→điểm` (Lead D-A). `Email` giữ loanword (Lead D-E).
- **Data-honesty**: không thêm payment/order status giả; InvoiceModal chỉ in số đã ghi, badge paid đọc từ `payment.isPaid/status`, VAT line chỉ khi `payment.vatRate` tồn tại; bỏ tuyên bố "mã hoá 256-bit" (không có cổng thanh toán); bỏ "tự động xác nhận", không hứa lead-time/SLA; tracking giữ "chưa có dữ liệu từ máy in", "chưa có mã vận đơn"; `OrderProgress` bỏ carrier bịa.

---

## 3. Defect register — đã đóng trong file mình

| ID | Mức | File | Cách đóng |
|---|---|---|---|
| **UI-006** (phần AuthModal) | P1 | `AuthModal.tsx` | E1–E4: bỏ `(Admin)/(Creator)/(Lab Hub)/(Customer)`; chip mini không còn render enum `currentRole`. **E5–E8 (`RoleGuard.tsx`) không sửa** — file foundation-owned, Lead đã chốt |
| **UI-013** | P2 | `LoginView.tsx` | 0 `alert(` trong `src/frontend`; luồng quên-mật-khẩu (khi bật cờ) hiện notice inline `role="status"` |
| **UI-014** (phần 2 file) | P2 | `AuthModal.tsx`, `UserAvatarMenu.tsx` | 7 nút raw cùng hành vi → `Button`; ngoại lệ có lý do ghi §6 |
| **UI-019** | P2 | `AuthModal.tsx` | Bỏ lớp `overflow-y-auto` lồng; modal còn **1 vùng cuộn** (body `<dialog>`) ⇒ 390 không double-scrollbar |
| **UI-020** (phần Invoice) | P2 | `InvoiceModal.tsx` | 390: 4 cột (STT/tên/SL/thành tiền), ẩn 2 cột phụ; không còn `min-w-720`; bảng rộng chỉ từ `sm` (560px < panel 608px) |
| **UI-017** (phần file mình) | P2 | MyOrders, OrderTracking, InvoiceModal, Checkout, AuthModal | 6 chỗ `fg-subtle` trên `bg-surface-muted` (4.56:1) → `fg-muted` (6.9:1) |
| **UI-004** (phần MyOrders) | P1 | `MyOrdersView.tsx` | Bỏ eyebrow EN sau `//` |
| **UI-039** (money, phần file mình) | P3 | 5 file | Không còn nối tay ` đ`; dùng `Money` (`₫`) |
| **UI-032/UI-033** | P3 | — | `Email` giữ theo Lead D-E; không có `aria-label` EN trong 13 file (đã quét) |

**Không thuộc quyền (không sửa):** UI-001 (`App.tsx`, W1b) · UI-008/UI-011/UI-016 (PDP, pdp-viewer) · UI-021/UI-022 (admin/ops) · UI-025/UI-031 (HomeView, storefront) · UI-040 (foundation) · UI-006 E5–E8 (`RoleGuard`, foundation).

---

## 4. Bằng chứng 4 state (theo code, Supabase paused)

| Màn | Loading | Empty | Error | Success |
|---|---|---|---|---|
| `/cart` | VAT config "Đang đọc cấu hình VAT…" | `EmptyState` (giỏ trống + 2 CTA) | VAT config error (`text-danger`) + promo message inline | Danh sách 2 nhóm + summary |
| `/checkout` | Submit `loading` + `loadingLabel`, VAT pending; `isProcessing` chặn double-submit | Guard giỏ rỗng (không render form 0đ) | `orderError` `role="alert"` "ĐƠN HÀNG CHƯA ĐƯỢC TẠO" + chi tiết lỗi DB | Chỉ điều hướng success **sau khi DB nhận đơn** (`OrderService.createOrder`) |
| `/order-success` | — (route resolve ở App) | — | — | 4 nấc đọc từ `payment.isPaid/status`, `canStartProduction` |
| `/tracking` | Skeleton đúng layout (`role="status"`) khi tra cứu | Not-found `role="status"` + portal khi chưa có đơn | `lookupError` `role="alert"` | 8 nấc + đo kiểm + thanh toán "CHỜ THANH TOÁN/ĐÓNG" từ dữ liệu; cancelled banner |
| `/orders` | App-level (`ProtectedRoute`, W1b) | **2 empty state**: chưa có đơn vs không khớp bộ lọc | App-level | Danh sách + progress + hoá đơn/bảo hành |
| `/assets` | per-card `loading` khi tạo signed URL | Empty thật vs empty-do-lọc | Toast lỗi tải thật | Grid + disclaimer "chưa hỗ trợ tải trực tiếp" |
| `/auth/login` | Nút submit `loading` | — | `role="alert"` (message từ AuthContext) | Điều hướng `?redirectTo=` |
| `/auth/register` | Nút submit `loading` | — | `role="alert"` + lỗi inline Field (mật khẩu xác nhận) | 2 nhánh: có phiên ("đã đăng nhập") / chờ xác nhận email |
| `AuthModal` | Submit loading, logout loading | — | `role="alert"` + dismiss | `role="status"` + account view |
| `InvoiceModal` | VAT config pending | — | VAT config error inline | Chỉ số đã ghi nhận; badge paid/COD/chưa TT theo state |

---

## 5. 390 / 768 / 1440 — kiểm tĩnh + giới hạn bằng chứng

**Đã kiểm tĩnh (code-level):**
- 390: Cart line đổi `gap-3` + price `min-w-0 whitespace-nowrap` (trước có thể tràn 4–6px do nút xoá `max-md:size-12` + stepper + giá); Checkout step tracker không wrap xấu (connector `w-12`, label ẩn ở mobile); OrderSuccess stepper `grid-cols-2`; OrderTracking table nằm trong `overflow-x-auto` (không tràn page); InvoiceModal 4 cột; Auth pages `max-w-md` + `px-4`; UserAvatarMenu panel `max-w-[calc(100vw-2rem)]`; AuthModal 1 vùng cuộn.
- 768: Checkout payment `sm:grid-cols-3`, AssetLibrary `sm:grid-cols-2`, OrderTracking table đủ 3 cột.
- 1440: container `max-w-7xl` (transaction) / `max-w-3xl` (success/reading) / modal `max-w-2xl` (invoice) — không lệch baseline.
- Không dùng `min-h-screen`/`h-screen`; `text-[10px]/[11px]` = 0; không hex/`rounded-[...]` trong class (chỉ SVG brand OAuth + prop màu 3D).

**Giới hạn — CHƯA có screenshot trong phiên này (trung thực):** máy không có Playwright module; Chromium headless-shell trong cache thiếu thư viện hệ thống (`libnspr4.so`/`libnss3`) nên không khởi động được, và tôi không được cài package. Vì vậy **QA W6 phải chụp** 390/768/1440 cho 5 route: `/cart`, `/checkout`, `/orders`, `/tracking`, `/auth/login`, `/auth/register`, + mở `InvoiceModal` bằng đơn thật/giả lập state. Checklist cho QA:
1. `/cart` có 1 dòng physical: stepper + giá + nút xoá cùng hàng ở 390, không tràn.
2. `/checkout` 390: 3 thẻ phương thức thanh toán xếp dọc, không cắt chữ.
3. `InvoiceModal` 390: bảng 4 cột, **không** cuộn ngang trong modal; 768/1440 thấy đủ 6 cột.
4. `AuthModal` 390: cuộn **một** thanh (không double scrollbar), tới được footer.
5. Keyboard: `Tab` qua segmented AuthModal, `Esc` đóng modal/drawer/menu avatar, `Enter` submit.
6. `prefers-reduced-motion`: không animation vô hạn (confetti/transition đều có `motion-reduce`).

---

## 6. Ngoại lệ / quyết định đã ghi

1. **Raw `<button>` còn lại có lý do** (UI-014):
   - `AuthModal` mode tabs (3) + role segmented (2): là **segmented control** (`role=group`/`aria-pressed`), không phải Button — recipe §3.6 v3; đã áp radius/shadow đúng.
   - `UserAvatarMenu` 13 menu row: mỗi row = icon-tile 36px + tiêu đề + mô tả 2 dòng + hover tile đổi màu; `Button` ép `justify-center/whitespace-nowrap` sẽ phá layout. Đã giữ `<button>` với `focus-visible:ring` + `aria` đầy đủ.
   - `CartView`/`CartDrawer` stepper `−/+`: nằm trong group có viền liền; `Button` icon-only (`size-12` mobile) sẽ phá chiều cao group. Có `aria-label` + `touch-target-btn` ≥44px.
2. **Bỏ 2 control chết** (theo QA checklist "implement or remove"): "Ghi nhớ đăng nhập" ở `LoginView` và `AuthModal` — `useState` không được đọc ở bất kỳ đâu, xoá thay vì để affordance giả. Nếu muốn thật, phải sửa `AuthContext` (ngoài quyền UI).
3. **Điều khoản ở Register**: app **không có route** `/terms` `/privacy` nên không tạo link (tránh dead link); đã bỏ style link giả, giữ chữ nhấn mạnh. Cần Lead quyết định thêm trang pháp lý (ngoài scope UI-only).
4. **CTA "Thanh toán ngay"** ở `/orders` trước đây mở hoá đơn (không trả tiền được) → đổi mục tiêu sang `/tracking/<id>` với nhãn "Xem hướng dẫn thanh toán". Không thêm luồng thanh toán mới.
5. **Link lab trong avatar menu** sửa từ `/admin/*` sang `/lab`, `/lab/machines` (route đã tồn tại; sửa đích đến sai, không đổi IA).
6. **Không đổi** `ENABLE_GOOGLE_OAUTH` (=false), `ENABLE_PASSWORD_RESET` (=false), logic auth/order/payment, route/slug/nhãn nav.

---

## 7. Gate results (2026-10-20, working tree hiện tại)

| Gate | Kết quả |
|---|---|
| `npm run lint` (`tsc --noEmit`) | **PASS** — 0 lỗi |
| `npm run build` | **PASS** — `✓ built in 5.53s` |
| `node scripts/check-fabricated.mjs` | **SẠCH** — 139 file, 0 tuyên bố bịa |
| `node scripts/check-ui-rules.mjs` | **PASS** — 0 vi phạm mới |
| `node scripts/check-contrast.mjs` | **PASS** — 0 unexpected fail |
| `node scripts/check-contrast-combos.mjs` | **SẠCH** — 0 tổ hợp < 4.5; 0 hit `fg-subtle-on-surface-muted` trong 13 file mình |
| `node scripts/check-icon-names.mjs` | **PASS** — 224 glyph |
| `npm run check` đầy đủ | **Không chạy** (live gate Supabase có thể treo/DNS — theo cho phép của task) |

---

## 8. Risks / open items

1. **Chưa có screenshot browser** (§5) — QA W6 bắt buộc xác nhận 390/768/1440 + trạng thái mở modal. Đây là rủi ro số 1 của handoff.
2. **AuthModal 3 tab ở 390 khi đã đăng nhập** (`Tài Khoản / Đổi Tài Khoản / Đăng Ký`): chữ có thể xuống 2 dòng trong tab hẹp; không tràn nhưng cần QA soi mắt. Nếu xấu, gợi ý: `text-xs` cho tab dưới `sm`.
3. **InvoiceModal chỉ ẩn cột ở `<sm`**: ở 640–767 vẫn đủ 6 cột trong panel `max-w-2xl`, cần QA xác nhận không bóp chữ.
4. **`ProtectedRoute` loading (UI-001)** do W1b xử lý — `/orders`, `/assets` vẫn phụ thuộc file đó cho state loading; không sửa trong task này.
5. **Dead EN branches (`isVi ? … : …`)** còn nguyên trong 13 file (đúng luật "không mass-codemod"); chỉ chuỗi VI hiển thị được sửa.
6. **`Order.date` hiển thị**: giữ nguyên helper `orderDateText` (ISO → `formatDateTime`, chuỗi sẵn giữ nguyên) — không đổi định dạng để tránh lệch ngày.
7. **Không thêm dependency/font/dark theme**; không sửa `src/index.css`, `src/frontend/ui/**`, `src/App.tsx`, `Header.tsx`, backend/stores/utils/supabase (đã kiểm `git diff --name-only` chỉ 13 file scope).
