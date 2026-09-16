> [!WARNING]
> **TÀI LIỆU LỊCH SỬ (SUPERSEDED — archived 2026-09).** Thư mục `docs/plans/**` là bộ kế hoạch refactor cũ và **không còn là nguồn chuẩn**. Nguồn chuẩn hiện tại: `docs/README.md` → `docs/architecture/`, `docs/pages/`, `docs/database/`, `docs/security/`, `docs/SETUP_RUNBOOK.md`. Nội dung được giữ nguyên để tra cứu lịch sử; **mọi số liệu (số bảng/index/policy, bundle, phase) trong đây đã lạc hậu** so với code. Xem `docs/archive/README.md`.

# 33 — Nhật ký thi công theo đợt (Wave log)

> Mỗi đợt ghi lại **đã sửa gì · đo được gì · phát hiện gì mới**. Coordinator tự kiểm chứng trong cây nguồn, không chép nguyên báo cáo agent.
> Kế hoạch gốc: `28-ui-ux-upgrade-plan.md`.

---

## ĐỢT 1 — hạ tầng + 2 lỗi P0 + ghi đơn

| Agent | File sở hữu | Việc | Trạng thái |
|---|---|---|---|
| W1-A | `src/App.tsx` + `components/RouteErrorBoundary.tsx` (mới) | bỏ `<main>` lồng nhau · ErrorBoundary cấp route · ẩn FAB trong `/admin` | ✅ đã kiểm chứng |
| W1-B | `tool3d/QuoteSummaryPanel.tsx` · `views/HomeView.tsx` · `views/ProductDetailView.tsx` | B0-1 `/quote` hết trắng trang · B0-2 hết hiện `0 đ` | ✅ đã kiểm chứng |
| W1-C | `views/CheckoutView.tsx` · `supabase/database.ts` · `services/orderService.ts` | B2 ISO date · B1 ghi đơn thật · B1b `assigned_workshop_id` | ✅ đã kiểm chứng |
| W1-D | `components/MaterialComparisonMatrix.tsx` · `scripts/check-contrast.mjs` | 3 cặp màu fail + bịt lỗ hổng gate (kèm test âm) | ✅ đã kiểm chứng |
| (coordinator) | `src/App.tsx` | gate dải đệm FAB còn sót (112px) | ✅ đã sửa + kiểm chứng |

**Gate toàn bộ sau Đợt 1 (coordinator chạy lại, RC thật):** `lint` 0 · `check-contrast` 0 · `check-fabricated` 0 · `check-unitprice-multiplier` 0 · `a8-sql-syntax-check` 0 · `lint-rls-sources` 0 · `lint-rls-migration` 0 · `verify-rls` 0 · `build` 0.

---

### W1-A — bỏ `<main>` lồng nhau + ErrorBoundary cấp route + ẩn FAB

Đã kiểm chứng: `grep -c '<main' src/App.tsx` = **0**; `<div className="flex-1">` ở `:1359`; FAB nằm trong `{!CHROMELESS_SCREENS.includes(currentScreen) && (…)}` tại `:1696`. Cùng danh sách ấy nay dùng cho cả Header (`:1347`), FAB (`:1696`), Footer (`:1793`).

`RouteErrorBoundary.tsx` (mới, 122 dòng) — coordinator **đã đọc toàn bộ file** và xác nhận:
- `getDerivedStateFromError` in **NGUYÊN VĂN** `error.message`; `throw 'chuỗi'` ⇒ `String(error)`, không nuốt thành chuỗi rỗng.
- `componentDidCatch` log ra console (không nuốt lỗi).
- `resetKey={location.pathname}` — đổi route thì xoá trạng thái lỗi (nếu không, bấm link ở Header vẫn thấy màn lỗi).
- Chỉ dùng token + primitive (`EmptyState`/`Button`/`Icon`), `role="alert"`, **0 màu thô**.
- Nút "Về trang chủ" xoá lỗi **TRƯỚC** khi điều hướng (nếu không trang chủ cũng bị thay bằng màn lỗi) — chi tiết này đúng.

**Phạm vi bắt lỗi:** chỉ lỗi **render/lifecycle** (đúng ngữ nghĩa React), KHÔNG bắt lỗi trong event handler / async. Điểm nổ của B0-1 (`QuoteSummaryPanel.tsx:183`) là throw trong render ⇒ **đã được bọc**.

**Hai hệ quả W1-A tự khai (coordinator xử lý):**
1. `data-fab-spacer` (`h-28` = 112px) vẫn vô điều kiện ở `App.tsx:1911` ⇒ **dải trống 112px ở đáy `/admin`, `/lab`, `/designer`** sau khi FAB bị unmount. → 🔧 **Coordinator đã sửa**: gate cùng `CHROMELESS_SCREENS`, thêm comment giải thích (`App.tsx:1911-1917`). Gate lại RC=0.
2. **Mất lối vào chat trên 3 màn chromeless**: FAB là **cách duy nhất** mở `ChatSupportModal` ở `/admin`/`/lab`/`/designer` (chỉ `/tracking/:id` có `onOpenChat`). ⇒ Đây là **quyết định sản phẩm**, không phải lỗi kỹ thuật — cần anh chốt: (a) chấp nhận mất, (b) thêm nút chat vào Topbar của `AppShell`, hay (c) giữ FAB nhưng đổi vị trí để không đè control.

### W1-B — `/quote` hết trắng trang + hết `0 đ`

Đã kiểm chứng từng dòng:
- `HomeView.tsx:33-34` và `ProductDetailView.tsx:29-30` nay là `isNum(v) && v > 0 ? … : EMPTY_VALUE`. Comment ngay trên **nói rõ** `0` = người bán KHÔNG bán kênh đó, và dẫn chiếu `ExploreView.tsx` để thống nhất chuẩn.
- `QuoteSummaryPanel.tsx:179-192` — `generateDeliveryPackages` bọc try/catch, `packages ?? []`, `selectedPackage: … | null` (không còn `undefined` để ném tiếp ở JSX). `:197` `vat` nay `null` khi không có gói (trước đó đọc `.totalPrice` của biến nullable ⇒ sẽ ném tiếp).
- `:199-220` — `comparePrintersForModel` bọc try/catch ⇒ `machineComparisons: … | null` + **nguyên nhân thật**. Xác nhận đúng điểm ném: engine `requireBedDimensions` chạy cho **MỌI** máy trong đội ⇒ **chỉ cần 1 dòng** `bed_dimensions` NULL (đúng bản ghi mẫu `DEMO-PR06`) là đủ giết cả trang.
- Khi hỏng: khối gói giao hàng hiện `EmptyState` + **text lỗi thật của engine**, ẩn thanh tổng tiền + 2 CTA (KHÔNG in số bịa), nút "So Sánh Máy" **`disabled`** kèm `InfoTip` nêu lý do.

**Hệ quả người dùng thấy:** `/quote` **render bình thường** thay vì trắng trang; nếu chính máy đang chọn thiếu dữ liệu thì hiện empty state "Chưa thể báo giá tự động" có sẵn từ trước.

W1-B tự khai 2 hạn chế trung thực: (a) `renderToStaticMarkup` của React 19 **ném lại** thay vì chạy boundary nên chỉ trình duyệt mới chạy được nhánh catch thật; (b) một lỗi engine khác (`comparePrintersForModel` không chuyển `globalRates` ⇒ có thể ném `rates_loading` khi cache nguội) khiến **lần vẽ đầu** có thể nêu lý do "đang tải cấu hình giá" thay vì "thiếu bed_dimensions" — panel tự lành khi settings về. ⇒ **Việc còn lại: nghiệm thu `/quote` bằng trình duyệt thật.**

### W1-C — ghi đơn thật

**B2 (sửa gốc lỗi `22008`).** Thêm `toIsoTimestampOrNull()` (`database.ts:91-101`). Giá trị ghi vào cột:
```ts
const orderDateIso = toIsoTimestampOrNull(options?.createdAtIso)
                  || toIsoTimestampOrNull(order.date) || nowIso;   // database.ts:286-287
// upsert({ date: orderDateIso, ... })                              // database.ts:306
```
Client gửi `createdAtIso = new Date().toISOString()` (`CheckoutView.tsx:134-139`). Chuỗi hiển thị `"14/9/2026 07:42"` có `Date.parse = NaN` — đúng nguyên nhân `22008`. Đã xác nhận `grep "date: order.date" src/backend` = **0 dòng**.

**B1 (ghi đơn THẬT + gate màn thành công).** `handleCompleteOrder` nay `async`, bỏ `setTimeout(900)` giả, `await OrderService.createOrder(...)` (`CheckoutView.tsx:212-215`). `orderService.createOrder` (`:29-44`) **ném** khi `saveOrder` trả `success:false` (`:40-42`) — trước là fire-and-forget. Chỉ insert thành công mới `onOrderCompleted` + `onNavigate('order_success')`; lỗi ⇒ hộp `role="alert"` in **lỗi DB thật** (`:744-761`). Supabase không bị gọi thẳng từ component.

**B1b** — `assigned_workshop_id: options?.assignedWorkshopId ?? null` (`database.ts:325`) + kiểu ở `CreateOrderOptions` (`orderService.ts:18`). Checkout ghi `null` tường minh, sẵn sàng cho điều phối.

**Hạn chế W1-C tự khai:** **không** chạy insert thật (bảng `orders` không có policy DELETE ⇒ sẽ để lại rác không xoá được). Bằng chứng là tĩnh. ⇒ E2E phải làm ở bước nghiệm thu UI.

---

## 🔴 Phát hiện MỚI trong Đợt 1 (chưa sửa — đưa vào Đợt 2)

| # | Phát hiện | Bằng chứng (đã kiểm chứng) | Mức độ |
|---|---|---|---|
| **N1** | **`orders` không có policy INSERT cho chủ đơn.** Đường insert duy nhất là `vcube_orders_guest_insert`, cấp cho **`anon` + `authenticated`**, `WITH CHECK` chỉ đòi `secure_access_token` ≥12 ký tự + `customer_email` khác rỗng + `items is not null` — **KHÔNG ràng buộc `user_id = auth.uid()`**. Mà `user_id` do client gửi (`database.ts:290`). ⇒ Người dùng đã đăng nhập có thể tạo đơn **mang `user_id` của người khác**. | `20261010_harden_rls.sql:356-369` | 🔴 **An ninh** — marketplace sắp chia tiền theo chủ đơn | **✅ ĐÃ VÁ Ở ĐỢT 2 (W2-A)**
| **N2** | `payment_status` bị **thu hẹp giá trị**: `order.payment?.isPaid ? 'paid' : 'unpaid'` ⇒ đơn `awaiting_payment`/`cod` lưu thành `unpaid`, đọc lại cũng ra `unpaid` ⇒ **mất trạng thái COD khi tải lại**. | `database.ts:318` | 🟠 Không bịa "đã trả tiền" (an toàn trung thực) nhưng mất thông tin |
| **N3** | Đơn đọc lại từ DB hiện **timestamptz thô**: `OrderSuccessView.tsx:49`, `InvoiceModal.tsx:131,214` in `order.date` nguyên văn. Màn thành công đẹp vì còn đối tượng RAM; **F5 là thấy chuỗi ISO**. | 3 vị trí trên | 🟠 Sửa ở tầng view (Đợt 5) |
| **N4** | 🔴 **`0` vẫn được coi là "bán được"**: `HomeView.tsx:235` `if (!isNum(product.priceDigital))` cho sản phẩm giá 0 vào giỏ; `:899/:992` `disabled={!isNum(product.priceDigital)}`; `ProductDetailView.tsx:94-95` suy `physicalPrice`/`digitalPrice` bằng `isNum` trần ⇒ `:116 purchaseBlocked`, `:645/:933 disabled={digitalPrice === null}` ⇒ nút **"ĐẶT GIA CÔNG IN 3D (—)" vẫn bấm được** và **đẩy được dòng giỏ 0đ**. | các dòng trên | 🔴 **Nửa hành vi của P0-2** — hiện `—` mà vẫn mua được thì vẫn là bịa |
| **N5** | `MachineComparisonModal.tsx:161-168` **hard-code lời khuyên bịa**: "chọn Bambu Lab X1C / Anycubic Kobra Max / Formlabs Form 4". | `:161-168` | 🟠 Vi phạm `data-honesty` |
| **N6** | Vẫn **không có đường ghi `order_items`**; RLS chỉ `owner_read` + `admin_all` ⇒ client không insert được dòng tiền ⇒ **phí 3 bên chưa có nơi ghi**. | `grep order_items src/backend/supabase/database.ts` = 0 | 🔴 Chặn "chia tiền 3 bên" |
| **N7** | `Order` (`src/types/index.ts:79-137`) **không có** `assignedWorkshopId` ⇒ giá trị chỉ đi qua tham số. | `src/types/index.ts` | 🟡 |
| **N8** | `orders` không có policy UPDATE cho chủ đơn mà `saveOrder` dùng `upsert`; hiện **không chạm được** vì `createOrder` luôn sinh id mới (`orderService.ts:32`). | — | 🟡 Tiềm ẩn khi cho sửa đơn |
| **N9** | Còn **in giá không guard** ở file ngoài phạm vi: `QuoteSummaryPanel.tsx:620/625/633` (`toLocaleString + ' đ'` cho gói/VAT/tổng) và `MachineComparisonModal.tsx:117-118`. | các dòng trên | 🟡 |

**Ghi chú về `status`:** chính migration đã thừa nhận (`20261010_harden_rls.sql:364-366`) "client hiện gửi status tuỳ ý khi tạo đơn… Cách đúng là tạo đơn qua Edge Function để ép status ở phía server". ⇒ **N1 nên sửa cùng hướng với ghi chú đó.**

---

## Việc phải làm trước khi đóng Đợt 1

1. ✅ W1-D đÃ XONG và đã được kiểm chứng (test âm RC=1 khi tiêm lỗi, RC=0 trên cây sạch) — xem mục W1-D ở dưới.
2. 🔬 **Nghiệm thu `/quote` bằng trình duyệt thật** — W1-B không chạy được nhánh catch thật (React 19 `renderToStaticMarkup` ném lại), và A1 trước đó **không đo được** `/quote` vì trang trắng. Đây là màn chưa từng được đo.
3. 🔬 **Nghiệm thu 1 đơn thật** vào `orders` (W1-C không dám vì không có policy DELETE) rồi kiểm tra `date` là timestamptz thật + `assigned_workshop_id` NULL.

---

### W1-D — 3 cặp màu tương phản + bịt lỗ hổng gate (coordinator đã kiểm chứng)

Cả **3 cặp đều THẬT**, W1-D tự tính lại và coordinator xác nhận kết quả gate + md5 khớp báo cáo:

| Cặp | Số đo | Kết luận |
|---|---|---|
| `#64748B` trên `#E2E8F0` (tab) | 3.86 (light) / **4.26** (dark, `#7A8798` trên `#1B2434`) | FAIL — THẬT |
| `#64748B` trên `bg-primary/5` | **4.40** (light) | FAIL — THẬT. **Mô hình alpha quyết định**: composite 5% `#00687A` trên trắng **trong gamma space** = `#F2F7F8`; nếu composite ở linear-light sẽ ra 4.56 (PASS SAI), và parse `oklab(...)` bằng regex số sẽ ra rác |
| `#B45309` trên `#FBF0E4` (warning-tint) | 4.47 (light) / 9.49 (dark) | FAIL — THẬT, **chỉ ở light** |

**Đã sửa** (`MaterialComparisonMatrix.tsx`, md5 `492a62fd1fbf7f0f1f12728f4ccbb49d`): `:171` tab `text-fg-subtle`→`text-fg-muted` (3.86→5.22); `:215/:224/:248/:256` metadata `text-fg-subtle`→`text-fg-muted` (4.40→5.96); `:237` badge HDT `bg-warning-tint`→`bg-surface-muted` (4.47→4.78). Giữ nguyên 3 chỗ `text-fg-subtle` còn lại vì **đều PASS** (`:151` 4.76 · `:186` 4.76 · `:291` 4.55).

**Gate** (`scripts/check-contrast.mjs`, md5 `f5045f376d4225e3015a4685f83b0504` — **file mới, chưa từng commit**): thêm 10 dòng theo đúng cấu trúc `PAIRS` sẵn có (6 cặp PASS được ép + 4 dòng `remove:` ghi lại đúng tổ hợp bị cấm). Kết quả: **78/94 pass · 16 expected · 0 unexpected fail**.

**Test âm (bắt buộc) — đã kiểm chứng:** tiêm lại 4 giá trị fail ⇒ **RC=1** (`74/94`, 4 unexpected fail = 3.86/4.26/4.40/4.47); hoàn nguyên ⇒ md5 y hệt trước khi tiêm ⇒ **RC=0**. Coordinator chạy lại `node scripts/check-contrast.mjs` ⇒ **RC=0**.

**Bằng chứng DOM thật (W1-D tự đo):** sau khi sửa, khối ma trận **112 text node ⇒ 0 fail** ở 1440/390 × light/dark; self-test phát hiện đúng 3 cặp tiêm vào; mô phỏng lại class CŨ trong DOM sống ⇒ **12 fail light / 4 fail dark** — **khớp đúng** con số của A1, và giải luôn câu đố 12-vs-10 (mỗi badge `{temp}°C` là **2** text node).

**Hai việc W1-D tự khai là NGOÀI phạm vi (cần quyết định — xem §Quyết định Đợt 2):**
1. 🔴 **Cặp 4.47 mang tính HỆ THỐNG**: `bg-warning-tint` xuất hiện **83 lần trên 30 file** (`grep` của coordinator xác nhận). Sửa 1 chỗ trong ma trận chỉ là vá cục bộ. **Cách sửa gốc = 1 dòng token** trong `src/index.css`: làm nhạt `--color-warning-tint` `#FBF0E4` → `#FEF6EC` (⇒ 4.69 với `#B45309`), sau đó badge quay lại đúng quy tắc "tint + màu đặc" đã ghi trong tokens. Lưu ý: phải cập nhật **cùng lúc** phần ghi sổ của gate (dòng `remove: 4.47` sẽ thành thừa).
2. `text-fg-subtle` trên nền tint/hairline còn ở 7 file khác (các route A1 **chưa từng đo được**): `WorkshopOnboardingWizard:527`, `AdminStorefrontPanel:64`, `AdminSeoPanel:85`, `Group5ProductionPanel:362`, `CheckoutView:227`, `AccessoriesManager:399`, `StlVs3mfComparisonModal:99`, `CartDrawer:126`. **Quy tắc gốc:** `fg-subtle` (`#64748B`) **chỉ hợp lệ trên `surface`/`canvas`** (4.76/4.55); hỏng trên mọi nền tint/hairline.

**Hạn chế gate W1-D tự khai (trung thực, giữ nguyên):** `check-contrast.mjs` **vẫn là gate KHAI BÁO** — nó so bảng cứng với chính nó. Cặp mới chặn được **hồi quy TOKEN** trong `index.css`, nhưng nếu ai đó sửa `className` trong TSX quay lại `text-fg-subtle` thì gate **vẫn RC=0**. Muốn bịt hẳn phải thêm luật theo *tổ hợp class trong nguồn* hoặc gate **đo DOM** — W1-D bị cấm tái cấu trúc script nên để lại. ⇒ **Đây là lỗ hổng gate thứ 4, đã ghi nhận.**

---

### Coordinator tự làm trong Đợt 1

| Việc | Chi tiết | Kiểm chứng |
|---|---|---|
| 🔧 Gate dải đệm FAB còn sót | W1-A unmount FAB ở 3 màn chromeless nhưng `data-fab-spacer` (`h-28` = 112px) vẫn vô điều kiện ⇒ **dải trống 112px ở đáy `/admin`/`/lab`/`/designer`**. Đã gate cùng `CHROMELESS_SCREENS` + comment giải thích | `grep -n data-fab-spacer src/App.tsx` → nằm trong nhánh gate; 9 gate RC=0 |
| ✅ Favicon (U0-4) | Trước đây **0 thẻ `rel="icon"`, không có `public/`** ⇒ tab trình duyệt trống. Thêm `public/favicon.svg` (mark khối lập phương VCUBE, nền `#00687A` để đọc được trên cả tab sáng/tối) + `<link rel="icon">` + **2 `meta theme-color`** (light `#F8FAFC` / dark `#080D16`, khớp token `--color-canvas`) | SVG hợp lệ (1 `rect` + 4 `path`, `viewBox 0 0 32 32`); build RC=0; `favicon.svg` **có trong `dist/`**; `index.html` đã vá |
| ⏭️ Preload font | **CỐ Ý CHƯA LÀM**: weight 300 hiện là `--font-sans` nền nên mọi chữ không gắn class đang render ở 300; cắt weight sẽ **đổi diện mạo toàn bộ chữ** mà chưa có ảnh duyệt. Để sang đợt có nghiệm thu thị giác. | — |

---

## Quyết định cần chốt cho Đợt 2

| # | Vấn đề | Đề xuất của coordinator |
|---|---|---|
| **D-1** | Sửa gốc tương phản: 1 dòng token `--color-warning-tint` `#FBF0E4`→`#FEF6EC` (sửa **83 chỗ / 30 file** cùng lúc, gồm `/admin`, `/checkout`, `/cart`, `/quote` — những route A1 chưa đo được) | **NÊN LÀM**, nhưng phải sửa **cùng lúc** phần ghi sổ `remove: 4.47` của gate, và chạy lại `check-contrast` + chụp ảnh trước/sau |
| **D-2** | Luật hoá quy tắc "`fg-subtle` không được đứng trên nền tint/hairline" thành **gate theo tổ hợp class trong nguồn** (bịt lỗ hổng gate thứ 4) | **NÊN LÀM** — đây là cách duy nhất bắt được lỗi khi ai đó sửa `className` |
| **D-3** | **N1 (an ninh)**: `orders` insert không ràng buộc `user_id = auth.uid()` ⇒ tạo được đơn mang `user_id` người khác | **NÊN SỬA** bằng `and (user_id is null or user_id = auth.uid())` trong `WITH CHECK` của `vcube_orders_guest_insert` — nhưng cần **dán lại migration lên production**, nên phải hỏi anh | **✅ ĐÃ LÀM Ở ĐỢT 2**
| **D-4** | **N4**: sản phẩm giá `0` vẫn **bấm mua được** ⇒ đẩy được dòng giỏ `0đ` (nửa hành vi của P0-2) | **NÊN SỬA**: `0` = "không bán kênh đó" ⇒ CTA phải `disabled`, không cho vào giỏ. Đây là **đổi hành vi mua** nên cần anh xác nhận |
| **D-5** | **N9/N5**: còn in giá không guard (`QuoteSummaryPanel:620/625/633`, `MachineComparisonModal:117-118`) + **lời khuyên máy in bịa** (`MachineComparisonModal:161-168`) | **NÊN SỬA** ở Đợt 2 (cùng nhóm "sự thật dữ liệu") |
| **D-6** | Chat: FAB là **lối vào DUY NHẤT** của `ChatSupportModal` ở `/admin`/`/lab`/`/designer`; nay đã ẩn ⇒ 3 màn đó mất lối vào chat | Cần anh chọn: (a) chấp nhận, (b) thêm nút chat vào `Topbar` của `AppShell`, (c) giữ FAB nhưng đổi vị trí |
| **D-7** | **N3**: đơn đọc lại từ DB in `timestamptz` thô (`OrderSuccessView:49`, `InvoiceModal:131,214`) | Sửa ở Đợt 5 (U4 funnel) cùng lúc thống nhất giao diện 2 màn đó |


---

## 🔬 Bằng chứng E2E trên PRODUCTION (coordinator tự chạy, đã được anh cho phép)

Phép thử **mô phỏng ĐÚNG payload `dbService.saveOrder` dựng ra** (`database.ts:302-328`) và gửi bằng **khoá publishable (anon)** — tức **đúng đường đi thật của checkout**, KHÔNG dùng đường tắt service-role. Khoá đọc từ `.env` **bên trong script** nên không bao giờ xuất hiện trong argv/log.

| Phép thử | Kết quả | Ý nghĩa |
|---|---|---|
| **T1a** Lọc `date=eq."13/9/2026 14:30:00"` (chuỗi hiển thị CŨ) | **HTTP 400 · code `22008`** · `date/time field value out of range` | ✅ **Chứng minh gốc lỗi B2 trên production**: đúng chuỗi cũ mà `CheckoutView` từng gửi bị Postgres từ chối |
| **T1b** Lọc `date=eq."2026-09-14T00:42:46.307Z"` (ISO MỚI) | **HTTP 200** | ✅ Dạng ISO-8601 mà W1-C chuyển sang **được cột `timestamptz` chấp nhận** |
| **T2** INSERT đơn đúng hình dạng checkout, **bằng anon** | **HTTP 201** | ✅ **B1 CHẠY THẬT**: `vcube_orders_guest_insert` nhận đơn ⇒ sau khi W1-C nối, checkout **sẽ ghi được DB** (trước đây chỉ nằm RAM) |
| **T3** INSERT **cùng đường anon** nhưng `user_id` = **uid của NGƯỜI KHÁC** | **HTTP 201** | 🔴 **N1 ĐƯỢC CHỨNG MINH BẰNG THỰC NGHIỆM**, không còn là suy luận: Postgres **chấp nhận** một đơn mang chủ sở hữu là người khác. `auth.uid()` của anon là NULL mà policy vẫn cho qua |
| **Dọn dẹp** | `DELETE` 2 hàng ⇒ **HTTP 204**; kiểm tra lại ⇒ **`rows=0`** | ✅ **Không để lại rác nào** trong production |

### ⚠️ Tự sửa lỗi của chính coordinator (ghi lại để không hiểu sai)

Lần chạy **đầu tiên** của T2/T3 trả về **HTTP 400 · `23514` vi phạm CHECK `orders_status_chk`**, và tôi suýt kết luận "checkout vẫn không ghi được". **Sai — lỗi ở phép thử của tôi:** tôi đã gửi `status='pending'`, nhưng:
- `CheckoutView.tsx:153` gửi **`status: 'pending_payment'`**;
- `src/types/index.ts:84` — union `Order['status']` **chỉ có 8 giá trị**;
- `20260901_baseline_schema.sql:741-743` — CHECK đúng 8 giá trị đó: `pending_payment · processing · printing · post_processing · packaging · shipping · completed · cancelled`, default `pending_payment`.

⇒ `'pending'` **không tồn tại** trong hệ thống. Sửa phép thử sang `'pending_payment'` ⇒ **HTTP 201**. Vì lần chạy đầu bị chặn vì *status* chứ không phải *user_id*, kết luận "N1 không tái hiện được" ở lần đầu là **KHÔNG hợp lệ** — và T3 ở lần chạy thứ hai mới là kết luận đúng.

**Bài học:** một phép thử viết tay cũng có thể sai; phải mirror ĐÚNG giá trị mà mã nguồn gửi, và khi một phép thử "thất bại" thì nghi phép thử trước khi nghi sản phẩm.

### Việc còn lại của Đợt 1

| Việc | Trạng thái |
|---|---|
| Nghiệm thu `/quote` + `/` + `/products/DEMO-P03` bằng trình duyệt thật (ảnh 390/1024/1440 × light/dark, đếm `0 đ`, đo tương phản DOM) | ⏳ agent `c5524ac8` đang chạy |
| **T1/T2/T3** chứng minh đường ghi đơn trên production | ✅ **XONG** (bảng trên) |
| `/admin` (1 landmark `main`, không FAB, không dải trống 112px) | ❌ **chưa đo được** — cần mật khẩu đăng nhập admin |


---

## 🔬 Nghiệm thu bằng TRÌNH DUYỆT THẬT (agent `c5524ac8`) — 5/5 PASS

Cách làm: build tĩnh + `vite preview` cổng riêng 4391 → **Edge trên Windows** (Playwright, `channel:'msedge'`) gọi **IP WSL** `192.168.37.147`. Không sửa file repo, không ghi DB.

| # | Điều cần kiểm | Kết quả | Số đo |
|---|---|---|---|
| 1 | Trang chủ `/` hết `0 đ` bịa | ✅ **PASS** | Token `0 đ` đứng riêng = **0**; vẫn có **14** chuỗi giá THẬT (`250.000 đ`, `1.250.000 đ`, …) |
| 2 | `/products/DEMO-P03` | ✅ **PASS** | CTA đúng chữ `ĐẶT GIA CÔNG IN 3D (—)`; `CAD: —` ở đúng 2 thẻ từng là `CAD: 0 đ`; thẻ thứ 3 vẫn giá thật `CAD: 220.000 đ`. Dấu là **em dash U+2014** thật |
| 3 | `/quote` sau khi upload CAD | ✅ **PASS** | `#root` innerText **865 → 5792 ký tự** (trước đây **0** = trắng trang). **0 `pageerror`**, 0 console error, 0 request fail, 0 HTTP ≥400. Hiện đủ báo giá: 3 gói `144.000/159.000/267.000 đ`, tổng `159.000 đ` + VAT 8% `12.720 đ` = **`171.720 đ`**, CTA `ĐẶT IN NGAY` |
| 4 | Tương phản DOM thật trên `/` | ✅ **PASS** | **Khối ma trận vật liệu nay góp 0 lỗi** (trước là 12 light / 4 dark). Còn **6 node/combo** là 3 số trang trí `01/02/03` cỡ 48px/900 ⇒ ngưỡng lớn-text **3:1**, đo **3.21** (light) / **3.10** (dark) ⇒ **đạt**, chỉ là sát ngưỡng. Bỏ ngoại lệ large-text thì **0 lỗi cả 4 combo** |
| 5 | Ảnh + không tràn ngang 390px | ✅ **PASS** | **19 ảnh** ở `C:\Users\chith\AppData\Local\Temp\vcube\acc-shots\` (`/`, `/products/DEMO-P03`, `/quote` × 390/1024/1440 × light/dark + 1 ảnh sau upload). `scrollWidth === clientWidth === 390` trên **cả 3 route, cả 2 theme** |

Dụng cụ đo tương phản **có self-test** (đúng như bài học A1): `#64748B` trên `#E2E8F0` → **3.86** (khớp), tiêm `#999`/`#fff` → 2.85 **bị bắt**, tiêm `#111` → 18.88 **không bị bắt**, và `oklab(0.55 0.12 0.09)` resolve đúng thành `#b84a29` (5.19) trong khi parse regex cho `[140,31,23]` — **đúng cái bẫy đã ghi nhận**.

**Cảnh báo về MỘT PHÉP ĐO DO CHÍNH COORDINATOR ĐẶT RA (agent bắt lỗi, đúng):** tôi yêu cầu đếm node "bằng `0 đ` **hoặc** kết thúc bằng `0 đ`". Quy tắc đó **thoái hoá**: trong định dạng tiếng Việt, **mọi giá tròn chục nghìn** đều kết thúc bằng `0 đ` ⇒ nó trả **14** dù không có lỗi nào. Metric đúng là **ranh giới token** `/(?:^|[^\d.,])0 đ$/` ⇒ **0**. Tôi đã dùng metric sai; ghi lại để lần sau không lặp.

---

## 🐞 Lỗi hồi quy do chính Đợt 1 gây ra — và cách sửa

### Phát hiện: **MỌI trang storefront mất landmark `main`**

Agent nghiệm thu báo: `document.querySelectorAll('main').length === 0` trên `/`, `/products/DEMO-P03` và `/quote`.

Nguyên nhân **do W1-A** (và do chính tôi duyệt): W1-A đổi `<main className="flex-1">` ở `App.tsx` thành `<div>` để bỏ landmark trùng trên `/admin`, dựa vào việc `AppShell.tsx:160` render `<main>`. Nhưng **`AppShell` chỉ được render ở đúng 2 nơi** — `App.tsx:383` (cho `/lab` + `/designer`) và `AdminDashboardView.tsx:426` (admin). ⇒ 3 màn dashboard có `main`, **13 màn còn lại (toàn bộ storefront + `/cart` + `/checkout` + `/orders` + `/tracking` + auth) mất sạch `main`**.

Tức là: bản gốc có **1 `main`** cho storefront và **2** cho admin. W1-A sửa admin 2→1 nhưng đẩy storefront 1→**0**. Sửa một chỗ làm hỏng chỗ khác — đúng loại lỗi mà "gate xanh" không bắt được vì **không gate nào kiểm landmark**.

### Cách sửa (coordinator tự làm)

1. `App.tsx:1368-1371` — thẻ bọc nay **chọn theo màn**:
   `React.createElement(CHROMELESS_SCREENS.includes(currentScreen) ? 'div' : 'main', { className: 'flex-1' }, <>…</>)`
   ⇒ màn có `AppShell` dùng `div` (tránh 2 landmark), mọi màn khác dùng `main` (có landmark).
2. `ExploreView.tsx:763` — `<main>` → `<div>`: đây là **cột bố cục** trong grid nhưng lại là `<main>`, nên `/explore` có **2** landmark (browser test đo đúng `=== 2`). An toàn vì `src/index.css` **không có selector `main`** nào, và `<main id={mainId}>` của `AppShell` (cho skip link) là phần tử khác.

### Kiểm chứng lại bằng trình duyệt thật (coordinator tự chạy)

| Route | `main` | `#root` ký tự | `pageerror` | |
|---|---|---|---|---|
| `/` | **1** | 7.276 | 0 | ✅ |
| `/explore` | **1** | 3.759 | 0 | ✅ |
| `/products/DEMO-P03` | **1** | 1.962 | 0 | ✅ |
| `/quote` | **1** | 865 | 0 | ✅ |
| `/cart` | **1** | 830 | 0 | ✅ |

`RESULT: ALL OK`. Kèm `lint` RC=0 · `build` RC=0 · `check-contrast` RC=0 · `check-fabricated` RC=0.

**Bài học:** mọi thay đổi về **cấu trúc landmark/thẻ ngữ nghĩa** phải được đo bằng DOM thật, và **phải đo cả storefront LẪN dashboard** — vì hai khu dùng shell khác nhau.

---

## Việc CHƯA đo được (cần anh)

| Việc | Vì sao |
|---|---|
| `/admin`, `/lab`, `/designer` bằng DOM thật (1 landmark `main`, không FAB, **không còn dải trống 112px**) | Cần **mật khẩu đăng nhập** của anh. A3 trước đây đăng nhập được bằng biến môi trường `A3_PW`; coordinator không có |
| Giá **thật từ DB** (không phải `[MẪU]`) trên `/quote` | Hiện `/quote` đang tính trên dữ liệu mẫu đã seed ⇒ số báo giá là số mẫu, **không phải** cấu hình thật của anh |
| Trạng thái hover/focus; chữ trên canvas có cảnh 3D thật | Hero canvas trắng trong lúc đo |


---

## ✅ W2-A — vá lỗ an ninh N1 (đã kiểm chứng độc lập)

**Luật mới** (`supabase/migrations/20261010_harden_rls.sql:369-374`, cùng idiom `_vcube_has_columns` + `||` + `_vcube_make_policy` như các cột khác, không nhét hàm tạm `_vcube_*` vào biểu thức policy nên R9 vẫn sạch):

```sql
if public._vcube_has_columns('orders', array['user_id']) then
  v_guest_check := v_guest_check
    || ' and (user_id is null or user_id::text = (select auth.uid())::text)';
else
  raise warning 'orders: thiếu cột user_id — không ràng buộc được chủ đơn khi insert.';
end if;
```

⇒ `WITH CHECK` cuối cùng = token ≥12 ký tự **AND** `customer_email` khác rỗng **AND** `items is not null` **AND** `(user_id is null OR user_id = auth.uid())`.

**Coordinator tự kiểm chứng (không chỉ đọc báo cáo):**

| Kiểm | Kết quả |
|---|---|
| Đoạn luật có trong file gốc | ✅ `20261010_harden_rls.sql:369-374` |
| Đoạn luật có trong file gộp | ✅ `apply_all_manual.sql:2237` |
| md5 / số dòng / bytes | ✅ `a662adcb087c06452761ebcffae8add5` · **3524 dòng** · 191676 bytes — **khớp đúng** báo cáo |
| Sinh lại có ra file y hệt? (tính tất định) | ✅ `cmp` báo **giống hệt byte** ⇒ generator tất định, md5 đáng tin |
| Đếm cấu trúc | ✅ **30 bảng · 84 policy bảng · 6 policy storage** (không đổi — vì luật này **sửa** `WITH CHECK` của policy sẵn có, không tạo policy mới) |
| Gate SQL | ✅ `a8-sql-syntax-check` 0 · `lint-rls-sources` 0 · `lint-rls-migration` 0 (`policy public: tạo 84, allowlist 84` · `storage: 6/6`) |

### Quyết định: **GIỮ** `user_id is null` hợp lệ cho mọi người (không siết thêm)

W2-A đề nghị một biến thể siết hơn: `(user_id is null and auth.uid() is null) or user_id = auth.uid()` — tức người **đã đăng nhập** thì bắt buộc phải gửi `user_id` của chính mình. **Tôi quyết định KHÔNG siết**, vì:

1. **Nó không vá được gì thêm.** Policy insert cho `anon` là **cố ý công khai** — khách vãng lai phải đặt được hàng, đó là tính năng. Ai muốn tạo một hàng `user_id = null` thì chỉ cần **đăng xuất rồi POST bằng anon**, và luật siết **vẫn phải cho qua** trường hợp đó. Vậy nên phần "còn lại" mà W2-A nêu (người đăng nhập gửi `user_id: null` + `customer_email` tuỳ ý) **không phải lỗ hổng mới** — nó đúng bằng quyền mà bất kỳ khách vãng lai nào cũng có.
2. **Nó thêm chế độ hỏng thật.** Nếu suy phiên thất bại (`database.ts:290-300`) thì đơn của người đã đăng nhập sẽ bị **42501 cứng** thay vì được tạo. Với một sản phẩm đang cần demo chạy được, đổi một rủi ro thấp thành một lỗi chặn là **lỗ**.
3. **Lỗ đã chứng minh thật thì ĐÃ bị bịt**: mạo danh `user_id` của **một người cụ thể** nay trả `42501`. Đó mới là lỗ có bằng chứng (`HTTP 201`).

⇒ **Phần còn lại được ghi nhận là hạn chế đã biết, không phải bỏ sót**, và bản chất là hệ quả của việc ủng hộ guest checkout. Nếu sau này muốn chặn cả spam thì cách **đúng** không phải là siết `WITH CHECK`, mà là **tạo đơn qua Edge Function** (đúng như ghi chú đã có sẵn trong chính migration, dòng 364-366) — nơi ép được `status`, `user_id` và rate-limit ở phía server.

### 🔴 VIỆC ANH PHẢI LÀM để luật này có hiệu lực

**Dán lại `supabase/scripts/apply_all_manual.sql`** (3524 dòng · md5 `a662adcb087c06452761ebcffae8add5`) vào SQL Editor. File **idempotent**, PHẦN 3 tạo lại policy với `WITH CHECK` mới.

Sau khi dán, chạy truy vấn kiểm chứng này (chỉ đọc):

```sql
select 'orders insert: luat chu don (user_id)' as muc,
       case when with_check ilike '%user_id%' then 'OK' else 'THIEU - chua dan lai file gop' end as ket_qua,
       with_check
  from pg_policies
 where schemaname = 'public' and tablename = 'orders' and policyname = 'vcube_orders_guest_insert';
```
Kỳ vọng: `ket_qua = 'OK'`, và `with_check` có `(user_id IS NULL) OR ((user_id)::text = ( SELECT auth.uid() AS uid)::text)`.

**Phép thử lại bằng thực nghiệm** (giống hệt phép thử đã cho `HTTP 201`): POST bằng anon với `user_id` = id thật của **người khác** ⇒ nay phải **403 / `42501`**; còn POST với `user_id: null` (khách vãng lai) ⇒ vẫn phải **201**.

### Ghi chú còn tồn (đã biết, không sửa)

- `docs/plans/30-a2-money-flow-audit.md:339` mô tả điều kiện guest-insert **cũ**. Đây là **báo cáo lịch sử ghi lại đúng thời điểm rà soát**, nên **cố ý không viết lại**; bản mới nhất là mục này.
- PHẦN 5 của file gộp chưa có truy vấn khẳng định luật `user_id` mới; muốn thêm phải sửa `scripts/gen-apply-all.mjs`. ⇒ Đề xuất cho đợt sau.


---

## ĐỢT 2 — kết quả từng agent

### ✅ W2-B — `0` nghĩa là "KHÔNG bán kênh đó" (đã kiểm chứng)

`HomeView.tsx` + `ProductDetailView.tsx`: mọi cổng mua nay dùng `isNum(x) && x > 0`.
- `HomeView.tsx:236` chặn thêm vào giỏ (trước chỉ `!isNum(...)` ⇒ hàng giá `0` **vẫn vào giỏ**); `:900`, `:999` `disabled`; `:901-909`, `:1001-1003` nhãn đổi thành "Không bán file số" / "File not sold" khi kênh không bán (nhãn cũ "Tải file CAD gốc" là **lời khẳng định sai** trên nút bị vô hiệu).
- `ProductDetailView.tsx:100-101` suy `physicalPrice`/`digitalPrice` = `isNum(x) && x > 0 ? x : null` ⇒ tự động sửa `purchaseBlocked` (`:122`), CTA chính (`:830`, thanh mobile `:947`) và 2 CTA số (`:651`, `:939`).

Agent tự kiểm chứng bằng **SSR thật với đúng hình dạng row DB** (không chỉ suy luận): `physical=0/digital=150000` ⇒ CTA vật lý **tắt**, CTA số **bật**, không còn chuỗi `0 đ`; `physical=250000/digital=0` ⇒ ngược lại; đối chứng `300000/90000` ⇒ **cả hai bật**, in đúng `300.000 đ`/`90.000 đ`. Gate: lint 0 · build 0 · check-fabricated 0.

**Cố ý KHÔNG đổi** (vì `0` là giá trị THẬT ở đó, không phải cờ kênh): `vnd`, rating, density/pricePerGram, phí/%/markup trong cấu hình giá, `customEngravingFee`, `reviewsCount`. Nếu áp `> 0` bừa sẽ phá ví dụ **hoa hồng 0%** hoặc **phí khắc 0đ**.

### ✅ W2-E — `mappers.ts`: 6 phép quy đổi trung thực (và 2 phép bị coordinator HOÀN NGUYÊN)

**Giữ lại (đã kiểm chứng là an toàn, type cho phép vắng):**

| Dòng | Trường | Trước → Sau | Vì sao an toàn |
|---|---|---|---|
| `:192` | `Product.isCustomizable` | `Boolean(x ?? false)` → `x ?? undefined` | `?: boolean`. Đồng thời hết tật `Boolean('false') === true` — **tạo cờ "có" giả** |
| `:384` | `Order.statusStageIndex` (sync) | `?? 1` → `?? null` | type `number \| null`; `MyOrdersView:212`, `OrderTrackingView:237`, `Group0OverviewPanel:94`, `WorkshopSettingsView:765,851` đều đã chấp nhận null |
| `:385` | `Order.layerProgress` (sync) | `?? 0` → `?? null` | `OrderProgress.tsx:25-28` đã khai nhận null |
| `:406` | `AppUserProfile.lastLoginAt` | `\|\| new Date().toISOString()` → `optStr(...)` | `lastLoginAt?`; **sự kiện chưa từng xảy ra không được đóng dấu `now()`** |
| `:413-414` | `totalOrders` / `totalSpent` | `n(...)` → `optNum(...)` | cả hai optional |

**🔴 HOÀN NGUYÊN 2 dòng giá (`:165-166` nay là `n(...)` như cũ).** W2-E đã đổi `pricePhysical`/`priceDigital` sang `numOrNull` (NULL ⇒ `null`). Coordinator **kiểm chứng và quyết định hoàn nguyên**, vì `null` **không biểu diễn được đầu-cuối**:

1. **Đường GHI sẽ hỏng.** `20260901_baseline_schema.sql:32-33` vẫn là `numeric not null default 0`, và **không** nằm trong danh sách gỡ `not null` của Đợt Q. `database.ts:140-141` gửi thẳng `product.pricePhysical` ⇒ gửi NULL lên sẽ bị Postgres chặn **`23502`**, tức **lưu sản phẩm hỏng**.
2. **2 chỗ đọc sẽ NÉM TypeError.** `CadQuickViewModal.tsx:293` (`product.priceDigital.toLocaleString(...)`) và `AdminProductsPanel.tsx:296,299` (`prod.pricePhysical/priceDigital.toLocaleString(...)`) **không guard** ⇒ gặp `null` là crash.
3. **Không lợi gì cho người dùng.** Từ W1-B, mọi màn đã coi `0` = "không bán kênh đó" và render `—`. ⇒ **NULL và 0 hiện y hệt nhau**, nên đổi chỉ thêm rủi ro mà không đổi trải nghiệm.

⇒ Muốn NULL thật thì phải làm **một lượt trọn vẹn**: nới `types/index.ts:9-10` thành `number | null` + guard 3 chỗ đọc trên + `alter column … drop not null, drop default` cho 2 cột. **Ghi lại làm việc của đợt sau**, không làm nửa vời.

**Hai lỗi trong báo cáo W2-E mà coordinator phát hiện (đã kiểm chứng):**
- W2-E nói `ExploreView.tsx:50-52` (`formatVnd(value: number)` → `toLocaleString`) sẽ **crash** khi gặp null. **SAI**: hàm bắt đầu bằng `Number.isFinite(value) && value > 0`, mà `Number.isFinite(null) === false` ⇒ trả `—`, **không crash**.
- W2-E nói `AdminProductsPanel.tsx:252,255` là chỗ `toLocaleString`. **SAI số dòng**: `:252` là `</thead>`, `:255` là `const readiness = …`. Chỗ thật là **`:296` và `:299`**.

> **Bài học:** báo cáo agent về "sẽ crash ở đâu" phải được **đọc lại mã** trước khi hành động — ở đây vừa có 1 báo động giả (ExploreView) vừa có 1 số dòng sai (AdminProductsPanel). Cả hai đều do coordinator tự đọc mã mới phát hiện.

### 🟡 W2-C — phát hiện SỚM (đang chạy): thêm một lỗi cùng loại ở token `positive`

Agent đo được: `--color-positive` `#15803D` trên `--color-positive-tint` `#E7F3EC` = **4.40:1 ⇒ FAIL** (light; dark 9.35 đạt). Đây là **đúng cùng loại lỗi với D-1** (vi phạm quy tắc "tint + màu đặc"), và **mang tính hệ thống**: `bg-positive-tint` xuất hiện **72 lần**, khoảng **60 lần** đặt `text-positive` trong cùng class list (`CheckoutView.tsx:242`, `OrderSuccessView.tsx:61`, `CartView.tsx:442`, `UserAvatarMenu.tsx:107/325`, nhiều file admin…).

⇒ **Coordinator ĐÃ CHO PHÉP sửa trong cùng đợt này** (cùng file `src/index.css`, cùng một dòng token, sửa được ~60 chỗ cùng lúc). Tức Đợt 2 nay sửa **2 token tint**, không phải 1.

**Ghi nhận thêm 2 điều W2-C nói đúng và coordinator đã sửa nhận thức:**
1. Brief của tôi ghi `text-fg-subtle` trên `bg-surface-muted` (4.53) là FAIL — **SAI, 4.53 ≥ 4.5 là ĐẠT**. Agent giữ nó là quy tắc "sát ngưỡng" không tính vào RC. Đúng.
2. Gate tổ hợp mới tìm ra **5 vi phạm CÓ SẴN** (đều `text-fg-subtle` + `bg-line-subtle`, 3.86/4.26): `CheckoutView.tsx:262`, `WorkshopOnboardingWizard.tsx:527`, `Group5ProductionPanel.tsx:362`, `AdminStorefrontPanel.tsx:64`, `AdminSeoPanel.tsx:85`. Agent **không tự sửa file ngoài quyền** và **không nới luật / không thêm allowlist** ⇒ coordinator **giữ luật ở mức CHẶN (RC=1 khi còn vi phạm)** và điều các one-liner về đúng chủ sở hữu (`:262`/`:527` → W2-D; `:64`/`:85` → W2-F đang chạy; `:362` → W2-H sắp chạy). **Thà gate đỏ còn hơn gate bị làm yếu.**

### Phát hiện CÒN LẠI từ Đợt 2 (chưa sửa — đang điều việc)

| # | Phát hiện | Bằng chứng |
|---|---|---|
| **N10** | **`/explore` vẫn bán kênh không mở bán**: `ExploreView.tsx:178-198` `handleQuickAddDigital` **không có guard giá nào**, và 2 nút `:1068-1076` / `:1225-1231` **không bị `disabled`** ⇒ vẫn đẩy được dòng giỏ `0đ` (đúng nửa lỗi N4 mà W2-B vừa sửa ở HomeView). File này đúng chuẩn chỉ ở phần **hiển thị** (`:49-51`) | `ExploreView.tsx` |
| **N11** | `AdminProductsPanel.tsx:83-84` **bịa giá** `\|\| 150000` / `\|\| 45000` (W2-F đang sở hữu, đã giao) | `:83-84` |
| **N12** | `mappers.ts` + `App.tsx:735-736,767-768` (`Number(x \|\| 0)`) đều **xoá dấu vết NULL-vs-0** ⇒ không màn nào có thể nói trung thực "chưa khai báo"; phải dùng câu "người bán không mở bán kênh đó" | `App.tsx`, `mappers.ts` |
| **N13** | `WorkshopSettingsView.tsx:323` `order.statusStageIndex ?? 4` — vẫn **bịa nấc 4** khi MES chưa báo (nay gặp `null` thường xuyên hơn sau thay đổi của W2-E) | `:323` |


---

## 🔬 Đo DOM thật `/admin` — 16/16 mục (agent `ebf0508d`, có đăng nhập admin)

Cách làm: build tĩnh → `vite preview` cổng 4393 → **Edge trên Windows** (Playwright) gọi IP WSL, viewport 1440×900, locale vi-VN, đăng nhập qua chính UI `/auth/login`. **Hai lượt độc lập**: deep-link từng mục (page-load) và điều hướng mềm bằng cách bấm 16 mục sidebar — kết quả **giống hệt nhau**. Không bấm Save/Create/Delete/Approve; chỉ GET.

### ✅ 3 bất biến được bảo vệ — ĐỀU ĐẠT trên 16/16

| Bất biến | Kết quả | Bằng chứng kèm **đối chứng dương** |
|---|---|---|
| **Đúng 1 landmark `main`** | ✅ **16/16 = 1** (nhãn "Nội dung chính", từ `AppShell.tsx:160`) | Và `/`, `/explore` cũng = 1 ⇒ **lỗi hồi quy cũ (storefront 0 / explore 2) đã hết** — đây là kiểm chứng độc lập cho bản vá của coordinator |
| **FAB "Trợ lý tự động" VẮNG** | ✅ **16/16 vắng** | 3 selector: `button[aria-label="Tư vấn kỹ thuật trực tuyến"]` = null · khớp text-leaf `/Trợ lý tự động/` = 0 · `button` có `position:fixed` **và** class chứa `z-drawer` = 0. **Đối chứng dương**: trên `/` và `/explore` **cả 3 đều bắn** (FAB 200×46, chữ `TRỢ LÝ TỰ ĐỘNG`) ⇒ không phải selector chết |
| **Dải trống 112px VẮNG** | ✅ **16/16 vắng** (`[data-fab-spacer]` không có trong DOM) | **Đối chứng dương**: trên `/` và `/explore` phần tử **có**, cao **đúng 112px**, class `h-28 w-full shrink-0`. Hình học: đáy hộp `main` == `body.scrollHeight` == `documentElement.scrollHeight`; 8 mục ngắn có `scrollHeight == innerHeight == 900` ⇒ **0px cuộn**. Một "phần tử lạ đáy 1113 > docH 900" đã được truy: nó nằm trong **vùng cuộn nội bộ của sidebar** (`nav … overflow-y-auto`, client 687 / scroll 1013), **không phải dải trống của trang** |

**Lỗi:** **0 console error/warning, 0 `pageerror` trên 16/16** (cả 2 lượt); **0 HTTP ≥ 400**. Chỉ 2 request hỏng trong cả lượt chạy, đều ở `/admin/products`: `net::ERR_BLOCKED_BY_ORB` cho `https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=800…` — **đúng ảnh placeholder bịa** mà W2-F đang gỡ (đã báo W2-F: gỡ default đó sửa luôn 2 request hỏng này).

**Mật độ chữ:** tổng 16 mục = **23.094** ký tự (so với ~22.694 ghi trước đó, **+1,8%**). Top 5: `pricing` **6.176** · `quote-calc` 3.076 · `materials` 2.441 · `products` 1.996 · `hardware` 1.671. Thấp nhất: settings 604 · users 514 · partners 505 · machines 505 · designers 500. *(Con số "~47.094 ký tự tĩnh" là đếm literal trong mã nguồn, **không** tái lập được từ DOM — agent nói rõ điều này.)*

### 🔴 Xác nhận lỗi "hiện 0 dù DB có dữ liệu" — và nó TỆ HƠN mô tả trước đó

Không chỉ là "panel hiện 0", mà là **3 nơi trên CÙNG một màn nói 3 số khác nhau**:

| Nơi | Hiện | Nguồn |
|---|---|---|
| DB | **7** | `GET /rest/v1/printer_fleet?select=*` → **HTTP 200, 7 dòng** |
| Badge sidebar | **7** | "Đội Máy In 3D (Fleet) **7**" |
| KPI trang Tổng quan | **7** | "Tỷ lệ sử dụng đội máy 14,3% — **1 đang in / 7 máy**" |
| **Thẻ KPI của chính panel Đội Máy** | **0** 🔴 | "TỔNG MÁY IN **0**" (vẫn 0 sau khi chờ thêm 20s ⇒ không phải đua tải) |

Cùng màn, cùng loại lỗi: `workshop_partners` trả **2 dòng**, tab badge của panel hiện **"Đối Tác (DB) 2"**, nhưng KPI hiện **"TỔNG XƯỞNG 0"** và empty state nói **"Chưa có xưởng in nào"**.

**Nhà thiết kế:** panel hiện `TỔNG DESIGNERS 0` và **không hề gửi request nào** tới bảng designer (chỉ có site_content, materials, pricing_global_settings, products, app_settings, pricing_configs, printer_fleet, accessories, user_profiles?select=role&id=eq.<uid>) ⇒ số 0 là **rỗng-do-cấu-tạo**, không phải kết quả truy vấn. Vì vậy agent **không thể xác nhận** nửa "DB có dòng" cho designers — và đã nói rõ là không xác nhận được, thay vì đoán.

⇒ Đã gửi **bằng chứng chính xác này** cho W2-G (đang sửa đúng 3 panel đó): yêu cầu kiểm riêng **thẻ KPI** (nghi vẫn đọc `useWorkshopAdminStore` với `INITIAL_MACHINES=[]`) chứ không chỉ bảng, và yêu cầu panel designers **phải thực sự phát truy vấn** để phân biệt "0 dòng thật" với "chưa từng truy vấn".

**Giới hạn đo (agent tự khai):** chỉ đo 1440px (không có mobile/tablet); không tái lập được con số ký tự tĩnh; không xác định được số dòng designers trong DB. Ảnh: 19 file ở `C:\Users\chith\AppData\Local\Temp\vcube\admin-shots\`. Dọn dẹp: kill đúng PID 246950 (cổng 4393), xoá `/tmp/vc-adm-dist`; **không đụng** dev server `:3000` (pid 186856).


---

### ✅ W2-C — sửa GỐC 2 token tint (≈115 chỗ) + bịt lỗ hổng gate "xanh giả"

**Coordinator tự kiểm chứng** (`src/index.css:75-76`, cả hai gate, và đọc mã chỗ bị báo):

| Token | Cũ | Mới | Đo lại (light) | Dark |
|---|---|---|---|---|
| `--color-warning-tint` | `#FBF0E4` → **4.47 FAIL** | **`#FEF6EC`** | **4.69 PASS** (+0.19) | `#2A2114` 9.49 — không đổi, vốn đã đạt |
| `--color-positive-tint` | `#E7F3EC` → **4.40 FAIL** (~55 chỗ) | **`#F0F9F3`** | **4.67 PASS** (+0.17) | `#10241A` 9.35 — không đổi |

Công thức agent trình bày đầy đủ (`lin(x) = ((x/255+0.055)/1.055)^2.4`, `L = 0.2126R+0.7152G+0.0722B`, `ratio = (Lmax+0.05)/(Lmin+0.05)`) và **coordinator kiểm lại giá trị token trong file** ⇒ khớp.

`#FBF0E4` **chỉ tồn tại ở đúng 1 chỗ trong mã** (`src/index.css:69`), phần còn lại là văn xuôi trong docs ⇒ sửa 1 dòng là sửa hết ~83 chỗ dùng `bg-warning-tint` + ~55 chỗ `bg-positive-tint text-positive`. **Đây là lý do tôi chọn sửa token thay vì sửa từng call site.**

`MaterialComparisonMatrix.tsx:238` đã **quay lại đúng quy tắc đã tài liệu hoá** (`bg-warning-tint text-warning border border-warning/30`) — tức bản vá cục bộ của W1-D được gỡ, vì gốc đã đúng.

**Phát hiện quan trọng: làm nhạt tint KHÔNG cứu được `text-fg-subtle`** (`#64748B` nhạt hơn cả màu đặc): 4.44 trên warning-tint, 4.43 trên positive-tint (dark 4.33/4.46) ⇒ **vẫn FAIL**, và nay đã thành **luật được CHẶN** trong gate mới.

#### Gate mới `scripts/check-contrast-combos.mjs` (22 KB) — bịt lỗ hổng "xanh giả"

Quét **literal-level `className` của cả 92 file `.tsx`**, có phân biệt **modifier** (`hover:bg-line-subtle` + `text-fg-subtle` + `hover:text-fg` **không** bị báo oan — đã kiểm với CartDrawer/StlVs3mf/MachineComparisonModal), **composite alpha trong gamma space** (nên `bg-warning-tint/50` = 4.62 là "sát ngưỡng" còn `bg-warning-tint` đặc = 4.44 là **chết**), **KHÔNG allowlist, KHÔNG baseline**, kèm **`token-drift`**: gate tự đọc lại `src/index.css` nên **hồi quy token cũng làm gate đỏ**.

| Kiểm | Clean | Tiêm lỗi |
|---|---|---|
| `node scripts/check-contrast.mjs` | **RC=0** (82/100 pass, 18 expected, **0 unexpected**) | **RC=1** (`UNEXPECTED … 4.47 < 4.5`); hoàn nguyên md5 y hệt ⇒ RC=0 |
| `node scripts/check-contrast-combos.mjs` | **RC=1** trên cây thật (**đúng 1 vi phạm thật**); **RC=0** trên bản sandbox `/tmp` sau khi vá 3 one-liner | **RC=1** (3→4 findings, báo đúng file:line); hoàn nguyên md5 y hệt ⇒ RC=0 |

**🎯 Chứng minh lỗ hổng cũ là THẬT (đây là giá trị lớn nhất của đợt này):** đặt `--color-warning-tint` về `#FBF0E4` ⇒ `check-contrast.mjs` vẫn **RC=0** (gate KHAI BÁO bị mù) trong khi gate mới **RC=1** qua `token-drift`. ⇒ Từ nay một hồi quy token **không thể** lọt qua trong im lặng. `index.css` đã hoàn nguyên byte-identical.

#### ⚠️ Trạng thái gate hiện tại — CỐ Ý ĐỎ, và tôi giữ nguyên như vậy

`check-contrast-combos.mjs` **RC=1 trên cây thật với ĐÚNG 1 vi phạm**, và tôi đã **tự đọc mã để xác nhận nó thật**:

- `Group5ProductionPanel.tsx:362` — badge đếm số việc của một nấc Kanban: `stageJobs.length > 0 ? 'bg-surface text-fg …' : 'bg-line-subtle text-fg-subtle'` ⇒ nhánh "0 việc" dùng **3.86:1** ❌. Thuộc quyền **W2-H** (đang chạy, đã được giao vá `:362`).
- Chỗ "anh em" `:465` (`bg-warning-tint/50 text-fg-subtle` = **4.62**) **ĐẠT** nên **không** bị tính là lỗi — gate phân biệt đúng.

⇒ **4/5 vi phạm đã được các chủ sở hữu vá trong chính đợt này** (`CheckoutView:262`, `WorkshopOnboardingWizard:527`, `AdminStorefrontPanel:64`, `AdminSeoPanel:85`). Còn 1 chỗ, thuộc W2-H. **Tôi chủ động KHÔNG nới luật, KHÔNG thêm allowlist, KHÔNG baseline** — thà gate đỏ và biết chính xác vì sao, còn hơn gate xanh mà giả.

#### 🔎 Rủi ro phát sinh cần nhớ: primitive đang phụ thuộc một tỉ lệ SÁT NGƯỠNG

Gate in ra **21 chỗ "sát ngưỡng"** (đạt, **không** tính vào RC) ở `text-fg-subtle` trên `bg-surface-muted` = **4.53:1**. Trong đó có **primitive dùng chung**: `src/frontend/ui/EmptyState.tsx:70`, `src/frontend/ui/Input.tsx:35`, `src/frontend/ui/Select.tsx:45`. ⇒ **Chỉ cần ai đó làm tối `--color-surface-muted` một chút là 3 primitive hỏng tương phản cùng lúc.** Ghi lại để không ai đổi token đó mà không chạy gate.

**Gate hiện có (số lượng):** `lint` · `build` · `check-contrast` · **`check-contrast-combos` (MỚI)** · `check-fabricated` · `check-unitprice-multiplier` · `a8-sql-syntax-check` · `lint-rls-sources` · `lint-rls-migration` · `verify-rls`.


---

### ✅ W2-D — `/explore` hết bán kênh giá 0 + 5 chỗ tương phản (đã kiểm chứng)

`ExploreView.tsx` nay có `isNum` (`:53`), chặn trước khi dựng `CartItem` (`:193`), và 2 CTA (`:1088-1095` lưới, `:1249-1256` bảng kỹ thuật) đều `disabled` + `title` + nhãn "Không bán file số" khi kênh không bán. **Coordinator đã grep xác nhận** cả 6 điểm guard đều có `> 0`.

Agent chứng minh bằng **thực thi** (không chỉ đọc mã): probe dựng bằng `esbuild` + `react-dom/server` của chính repo, render **ExploreView thật** (chỉ stub primitive lá + hook Language/Auth), bắt closure `onClick` thật ⇒ **23/23 PASS**: giá `89000` ⇒ CTA bật, click đẩy **đúng 1 dòng** `{type:'digital', price: 89000}`; giá `0` và `NaN` ⇒ CTA tắt, **giỏ vẫn rỗng**; EN cũng đúng.

Tương phản: `CheckoutView:262`, `WorkshopOnboardingWizard:527`, `AccessoriesManager:399`, `StlVs3mfComparisonModal:99`, `CartDrawer:126` — đổi `text-fg-subtle` → `text-fg-muted`. Cố ý **không** đổi 2 chỗ 4.53 (đạt) là `ExploreView:1197`, `CartDrawer:158`.

### ✅ W2-F (lượt 2) — SEO bịa, xoá giá ở modal sửa, công tắc announcement

Đã kiểm chứng bằng grep:
- `AdminSeoPanel.tsx:33,36` nay là `localContent.seoX?.trim() || ''` (trước có default tiếng Việt + ảnh OG Unsplash + canonical `https://vcube.vn`); `:39` giữ `robotsIndex` nguyên trạng `undefined` thay vì `?? true`; `:40` ghi rõ JSON-LD `LocalBusiness` bịa đã bị gỡ; `:504-506` có **3 trạng thái** copy trung thực (đang bật / đang chặn / **chưa cấu hình**). Tab Social **không còn** `<img src={ogImage}>` vô điều kiện ⇒ **hết request ảnh bịa**.
- `AdminProductsPanel.tsx` — kiểu nháp `EditableProduct` (`:83-96`) cho giá là `undefined` khi xoá trắng; `handleSaveEditProduct` (`:199-231`) **chặn lưu** và nêu đích danh ô thiếu. Xử lý rất đúng bản chất DB: cột `NOT NULL default 0` ⇒ **không có NULL trung thực để gửi**, nên số `0` admin gõ được giữ nguyên, còn ô trắng **không thể** biến thành `0`. Có hint giải thích ngay dưới ô.
- `AdminStorefrontPanel.tsx:389` `=== true` + nhãn nói rõ "CHƯA CẤU HÌNH ⇒ công tắc TẮT và banner KHÔNG hiện" — và agent **kiểm cả 2 nơi tiêu thụ thật** (`Header.tsx:130`, `HomeView.tsx:300`) để xác nhận "tắt" đúng với thực tế hiển thị. Probe lượt 2: **38/38 PASS**.

**Phát hiện nối tiếp (đã mở rộng phạm vi cho W2-J):** panel SEO nay trung thực, **nhưng `DEFAULT_SITE_CONTENT` vẫn bơm** `seoTitle`/`seoDescription`/`seoKeywords`/`seoOgImage`/`seoCanonicalUrl` (`mockData.ts:304-309`) + `seoStructuredData` (`:314`) qua đúng cái spread `database.ts:643` ⇒ panel vẫn sẽ hiện chữ bịa như "đã cấu hình". **Cùng một gốc với 2 số ship.** Đã yêu cầu W2-J gỡ luôn và báo cáo riêng.

### ✅ W2-G — 3 panel admin đọc/ghi DB thật (đã kiểm chứng)

| Panel | Nguồn thật | Trạng thái lỗi/rỗng |
|---|---|---|
| Đội máy (Fleet) | `dbService.getPrinters()` đọc `Group1WorkshopsPanel.tsx:118`, ghi `savePrinter()` `:142` | rỗng ⇒ EmptyState **nêu tên bảng**; lỗi ⇒ `role="alert"` + **thông báo Supabase thật** + Retry, KPI hiện `—` **chứ không phải 0** |
| Nhà thiết kế | `designer_profiles` (`useDesignerAdminStore.ts:147` đọc, `:203` ghi), nạp khi mount (`Group2DesignersPanel.tsx:62`) | như trên |
| Khách hàng | `customer_profiles` (store `:140`/`:182`), nạp khi mount (`Group3CustomersPanel.tsx:77`) | như trên |

**3 điều coordinator yêu cầu kiểm riêng — đều đã sửa:**
1. **Thẻ KPI đội máy** nay tính từ chính các dòng `printer_fleet` vừa đọc (trước hiện `0` trong khi badge sidebar hiện `7`).
2. **"TỔNG XƯỞNG 0"** — số 0 đến từ store RAM (và là **bảng KHÁC** với `workshop_partners`); nay danh sách + KPI đọc `workshop_profiles` thật, duyệt/đình chỉ ghi `verified_status` thật.
3. **`/admin/designers` phát truy vấn thật** (trước **không hề** gọi bảng nào).

**Cách xử lý đáng khen:** agent **không dùng** `workshopService.getDesignerProfiles()`/`getCustomerProfiles()` và **nói rõ lý do** thay vì dùng bừa — xem mục dưới.

### 🔴 PHÁT HIỆN LỚN: tầng service **BỊA DỮ LIỆU** và **lệch schema** (đã mở W2-L)

Coordinator **tự đọc mã để kiểm chứng**, và cả hai điều agent nói đều **ĐÚNG**:

1. **Bịa dữ liệu + nuốt lỗi.** `workshopService.ts:913-941` (`getDesignerProfiles`): nếu truy vấn **LỖI** *hoặc* trả **0 dòng**, hàm rơi xuống `readFromStorage(..., SEED_DESIGNER_PROFILES)` (`:940`) ⇒ trả về **2 nhà thiết kế bịa** (tên + tiền hoa hồng thật-looking), và `catch` ở `:937-939` **chỉ `console.warn`** ⇒ **không caller nào phân biệt được "bảng rỗng" với "truy vấn hỏng"**. Đây là vi phạm trực tiếp `docs/design/data-honesty.md`.
2. **Lệch schema.** Hàm map các cột `cover_url`, `social_links`, `default_royalty_percent`, `license_mode`, `badge_tier`, `payout_bank_info`, `total_sales_count`, `total_royalties_earned` — nhưng bảng thật (`20260901_baseline_schema.sql:820-836`) **không có cột nào trong số đó**: nó có `portfolio_url`, `bank_name`, `bank_account`, `tax_id`, `royalty_percent`, `verified_status`, `rating`, `total_sales`. Các cột kia chỉ tồn tại trong `supabase/legacy/` — chuỗi migration **chưa từng chạy ở môi trường nào** ⇒ mọi lệnh ghi sẽ hỏng với "column not found". Hàm còn bịa thêm `|| 10`, `|| 'PrintOnly'`, `|| 'Standard'`, `|| 0`.

⇒ **Vì vậy W2-G đọc/ghi bảng một cách THÍCH ỨNG** (`select('*')`, lấy danh sách cột thật từ dòng đầu) để chạy được với cả hai hình dạng schema, hiện `—` cho cột thiếu, và trả **lỗi chính xác** thay vì "thành công" giả. Đó là quyết định đúng khi tầng service bên dưới không đáng tin.

**Tính hệ thống (coordinator grep):** `readFromStorage(..., SEED_*)` xuất hiện **28 lần** chỉ trong `workshopService.ts` — phủ workshop profiles, machines, materials, inventory logs, designer profiles, customer profiles, accessories. Và **bài học đã được rút ra ngay trong chính file đó**: comment `:1116` ghi rằng fallback y hệt đã bị **XOÁ** cho pricing (`SEED_PRICING_GLOBAL_SETTINGS`) vì "nuốt lỗi rồi rơi về `SEED_…` ⇒ số bịa" — chỉ là phần còn lại của file chưa được áp dụng theo. ⇒ **Đã mở W2-L** để hoàn tất việc đó (bỏ fallback seed, ném lỗi thật, rỗng thì trả `[]`, và sửa mapping theo schema baseline).

### Phát hiện KHÔNG nối được nguồn (agent báo trung thực, không bịa)

| Tab | Vì sao | Cách xử lý |
|---|---|---|
| **RFQ / báo giá lô lớn** | `quotes` là báo giá **theo từng tệp** (file_name/material_id/quantity/unit_price/payload) — **không có** cột dự án/số lượng/hạn/trạng thái; hàm duy nhất là `dbService.saveQuote()` (`:432`) — **insert mù, không có hàm đọc** | Tab **nói thẳng** là chưa có nguồn; **xoá** modal báo giá cũ (ghi RAM + toast "đã gửi báo giá" giả) |
| **Kho vật liệu theo xưởng** | không có service phù hợp (`workshop_materials` bị RLS theo xưởng; `materials` là danh mục chung, không có tồn kho) | KPI nay `—` + "Chưa nối nguồn tồn kho" thay vì "Đủ tồn kho" giả; toast thêm vật liệu nói rõ là in-memory |
| **Payout / rút tiền designer** | `payment_transactions` (`baseline:766`) chỉ có order_id/transaction_id/amount/payment_gateway/payload/status — **không** `designer_id`, không bank, không `requested_at`; không service nào đọc | Nêu rõ "chưa có nguồn DB"; **xoá** các nút duyệt/chuyển tiền chỉ ghi RAM |

**Dọn code chết (trong file agent sở hữu):** gỡ slice machines + duyệt/đình chỉ bằng RAM + `total_machines` bịa (workshop store); gỡ toàn bộ fixture/action designer + withdrawal; gỡ toàn bộ fixture/action customer + RFQ, `RFQItem`, `ExtendedCustomerProfile`. Giữ lại đúng thứ còn dùng thật (filter, 3 hàm tính chi phí thuần).

**Còn tồn ngoài quyền (đã giao W2-L):** `workshopService.ts` §5/§6 + `getWorkshopProfiles()` (`:458`).
