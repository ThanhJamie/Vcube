# 28 — Kế hoạch nâng cấp UI/UX (Modern SaaS) + sửa "sự thật dữ liệu"

> Trả lời trực tiếp câu hỏi: **"source code hiện tại đã đủ demo chưa, và cần sửa UI/UX thế nào cho đẹp hơn?"**
> Nền: `21-saas-spec.md` (spec redesign đã duyệt) · `26-decisions-and-plan.md` (trạng thái) · 4 đợt rà soát read-only A1–A4 (`29-a1-funnel-audit.md`, `A2-report.md`, `A3-report.md`, `A4-report.md`).
> Mọi số trong tài liệu này do **coordinator tự đo lại** trên cây nguồn (không chép nguyên báo cáo agent) — xem §2, §3.

---

## 0. Trả lời ngắn: CHƯA đủ demo — nhưng chỉ thiếu **2 việc**, không phải 51

Phải tách **2 trục độc lập**, vì chúng có mức độ "đủ demo" trái ngược nhau:

| Trục | Trạng thái | Vì sao |
|---|---|---|
| **A. Lớp giao diện (UI/UX)** | ⚠️ **Nền tảng xong ~100%, nhưng "độ phủ" ~20%** | Token + 25 primitive Modern SaaS **đã có và đúng spec**; nhưng hầu hết màn hình **vẫn tự dựng** card/nút/bảng ⇒ đúng cảm giác "mỗi page một UI riêng" của anh |
| **B. Lớp dữ liệu (tính năng)** | 🔴 **KHÔNG đủ demo** | Đặt hàng **không ghi DB**; 6 màn admin chạy RAM/`localStorage`; **`/quote` trắng trang với mọi tệp CAD** (B0-1) |

⇒ **Kết luận:** giao diện *trông* demo được (vì có dữ liệu mẫu), nhưng **luồng lõi không thật**. Sửa **§4 (U0→U4)** cho đẹp/đồng bộ, và **§5 (B0→B7)** cho thật. Thứ tự: **U0 + B0 + B2/B1 trước**, vì đó là những thứ chặn mọi thứ khác.

---

## 1. Phát hiện quan trọng nhất — ĐẢO NGƯỢC giả định ban đầu

Tôi tưởng phải *nghĩ ra* hướng "Modern SaaS". **Không phải.** `docs/plans/21-saas-spec.md` (143 dòng) **đã được duyệt** và **phần nền tảng đã thi công xong**:

| Hạng mục theo `21` §1/§4 | Trạng thái đo được | Bằng chứng |
|---|---|---|
| Thang bán kính SaaS | ✅ **ĐÚNG** `sm:6 · md:8 · lg:12 · xl:16 · modal:14 · full:9999` | `src/index.css:78-83` |
| Nút bỏ pill → `rounded-md` | ✅ **ĐÃ ĐỔI** | `src/frontend/ui/Button.tsx:70` |
| 25 primitive + barrel | ✅ **ĐÃ CÓ ĐỦ** (kể cả 5 cái `21` §4 ghi "THIẾU": `PageHeader`, `Section`, `Toolbar`, `KeyValue`, `AppShell`+`SideNav`+`Topbar`, và `DataTable`) | `src/frontend/ui/*.tsx` (25 file) · `ui/index.ts:23-50` |
| **Đưa từng trang về dùng primitive** | 🔴 **GẦN NHƯ CHƯA LÀM** | §2 |

⇒ **Việc còn lại là "độ phủ" (adoption), không phải định hướng.** Tin tốt: rẻ hơn nhiều so với tưởng, và **không cần anh quyết thêm gì về phong cách** — `21` §0 đã chốt 6/6.

---

## 2. Bằng chứng "độ phủ" — tôi tự đo trên `src/frontend/**` + `src/App.tsx` (trừ `src/frontend/ui/`)

Cách đo: đếm **thẻ JSX** `<Tên` thật trong cây nguồn (không tính `import`, không tính comment).
Script ngoài repo: `verify-adoption.sh` + `verify-zeros.sh`.

**Primitive ĐÃ được dùng:**

| Primitive | Số thẻ JSX | Số file |
|---|---|---|
| `Icon` | 655 | 57 |
| `Button` | 90 | 8 |
| `Card` | 41 | 6 |
| `InfoTip` | 38 | 15 |
| `EmptyState` | 32 | 12 |
| `Field` | 27 | 1 |
| `Badge` | 14 | 4 |
| `Input` | 11 | 1 |
| `DataTable` | 10 | **1** |
| `StatCard` | 8 | 2 |
| `Skeleton` | 8 | 1 |
| `Select` | 8 | 2 |
| `Modal` | 4 | 1 |
| `PageHeader` | 2 | 2 |
| `AppShell` / `SideNav` / `Topbar` | 2 / 2 / 2 | 2 |
| `KeyValue` · `ProgressBar` · `Sheet` | 1 · 1 · 1 | 1 |

**Primitive có sẵn nhưng KHÔNG nơi nào dùng (0 thẻ JSX toàn repo):**
`Section` · `Toolbar` · `Money` · `ConfirmDialog` · `ToastViewport`

**Thứ vẫn còn "tự dựng" (đây chính là "mỗi page một UI riêng"):**

| Mẫu tự dựng | Số lần | Số file | Primitive đáng lẽ dùng |
|---|---|---|---|
| `<button` | **483** | 54 | `ui/Button` |
| `<input` | **278** | 38 | `ui/Input` + `ui/Field` |
| `<select` | 56 | 19 | `ui/Select` |
| `<table` | 21 | 16 | `ui/DataTable` |
| `toLocaleString` | 140 | 23 | `ui/Money` (hoặc `lib/format`) |
| `animate-pulse` | 50 | 25 | `ui/Skeleton` |
| `fixed inset-0` | 38 | 24 | `ui/Modal` / `ui/Sheet` |
| `window.confirm` | 5 | 4 | `ui/ConfirmDialog` |
| `rounded-full` | **313** | 47 | `21` §1.1: chỉ giữ cho avatar/chấm/pill đếm |

**Thang chữ & viền — lệch đúng như `21` §1.3 dự đoán:**

| Token | Số lần | Ghi chú |
|---|---|---|
| `text-xs` (12px) | **2.136** | `21` §1.3 chốt body = **14px** ⇒ phải giảm mạnh |
| `text-sm` (13px) | 184 | |
| `text-base` (14px) | 97 | |
| `border-line` | 477 | `21` §1.2: card/panel phải là **`border-line-subtle`** |
| `border-line-subtle` | 288 | ⇒ đang **ngược** |

**Điểm sáng (không phải sửa):** `bg-white|text-white|bg-black|(text|bg|border)-[#` = **0** · `text-[Npx]` = **0**.

---

## 3. Màn mẫu đã đạt chuẩn — dùng làm khuôn, không phải thiết kế lại

**`src/frontend/views/WorkshopSettingsView.tsx` (2.216 dòng) là màn DUY NHẤT đạt "Modern SaaS Dashboard" đầy đủ:**

`PageHeader` + 4×`StatCard` + **5×`DataTable`** + 7×`EmptyState` + 4×`Modal` + 5×`Select` + `Card` + `Badge` — đúng bộ primitive mà `21` §4 yêu cầu.

⇒ **Chiến lược rẻ nhất: nhân khuôn này ra 15 view còn lại**, mỗi view một đợt.

Bối cảnh quy mô: **16 view · 14.281 dòng**; 59/64 file `.tsx` **đã** import barrel `@frontend/ui` (nên "dây nối" có sẵn — chỉ là chưa dùng primitive *bố cục*). Top view nặng nhất:

| View | Dòng |
|---|---|
| `WorkshopSettingsView.tsx` | 2.216 ✅ đã đạt chuẩn |
| `Tool3DView.tsx` | 1.802 |
| `DesignerDashboardView.tsx` | 1.547 |
| `HomeView.tsx` | 1.363 |
| `ExploreView.tsx` | 1.279 |
| `PersonalizeView.tsx` | 1.073 |

---

## 4. Kế hoạch UI/UX — 5 đợt, mỗi đợt duyệt riêng

> Nguyên tắc: **một đợt = một nhóm màn hình = một "chủ sở hữu file" duy nhất** (luật phiên này: không 2 agent cùng sửa 1 file).

### U0 — Hạ tầng dùng chung (làm ngay, không đụng view nào) — *nhỏ, rủi ro thấp*
Mục tiêu: bịt các lỗi chrome toàn cục + lưới an toàn.
1. `App.tsx:1358` — `<main>` **lồng nhau** (`AppShell.tsx:160` cũng render `<main>`) ⇒ mọi trang có **2 landmark `main`**, và `<main>` ngoài bao luôn cả sidebar. Đổi `App.tsx` sang `<div>`. *(A3 đo `mainTot=2` trên cả 16 mục.)*
2. `App.tsx` — **thêm `RouteErrorBoundary` cấp route** (xem B0-3). Hiện throw ở đâu cũng trắng cả app.
3. `App.tsx:1681-1696` — **FAB "Trợ lý tự động" của storefront hiện trong `/admin`** ⇒ ẩn theo `CHROMELESS_SCREENS` (`App.tsx:987`).
4. `index.html` — **không có favicon** (0 `rel="icon"`, không `public/`) + font **chưa preload**, weight 300 **không dùng** nhưng đang là `--font-sans` nền.
5. Thêm gate `check-ui-adoption.mjs` (§6) — **có test âm**.

### U1 — Storefront (đúng phần anh đã bắt đầu)
`HomeView` · `ExploreView` · `ProductDetailView` · `PersonalizeView` + `Header` · `CartDrawer` · `MaterialComparisonMatrix`.
Việc: đưa card/CTA/nút về `Card`/`Button`. A1 đo: 4 màn storefront có **0 pill CTA** ✅ nhưng `MaterialComparisonMatrix` là nguồn **12 text node fail tương phản** ở MỌI kích thước (3 cặp màu — xem §6).

### U2 — `/admin` (16 mục menu / 22 route id) — **ưu tiên cao nhất về "đẹp"**
Đây là nơi anh phàn nàn nặng nhất: **"quá nhiều text"**.
- **Đo được**: `/admin` có **47.094 ký tự tĩnh / 22.694 ký tự hiện thật**, mà chỉ **24 `InfoTip`**; riêng `pricing` = **6.067 ký tự / 2 InfoTip**; `AdminProductsPanel` = 1.878 ký tự / **0 InfoTip**.
- ⇒ **12 đoạn ≥80 ký tự** chuyển vào `InfoTip` (**7 đoạn ở `PricingConfigPanel`**) — danh sách đích danh ở `A3-report.md` §3.3.
- Thay emoji bằng `Icon`: **115 node hiển thị** (nặng nhất `AdminProductsPanel` 17).
- Gộp **57 card tự dựng** ở `Group1/2/3` + `AdminSeoPanel` (12–16 mỗi panel) về `Card`.
- Bảng → `DataTable`; nút → `Button`; hộp thoại → `Modal`; `window.confirm` → `ConfirmDialog`.

### U3 — Khu đã đăng nhập: `/lab` (WorkshopSettings ✅ mẫu) · `/designer`
**`DesignerDashboardView.tsx` là màn "bẩn" nhất repo** (~215 điểm lệch): 157 `text-xs`, 17 CTA `rounded-full`, 27 `<button>`, 14 `<input>`, 70 `border-line`.

### U4 — Funnel & tài khoản: `/cart` · `/checkout` · `/orders` · `/order-success` · `/tracking` · `/assets` · auth · 404
Hiện **mỗi trang một kiểu**; thống nhất về `PageHeader` + `Section` + `Card` + `EmptyState`.

---

## 5. Sửa "sự thật dữ liệu" (song song — UI đẹp mà số bịa thì vô nghĩa)

> **A1 bổ sung 3 lỗi P0 ngay trước khi thi công.** Coordinator đã **kiểm chứng lại từng cái bằng cách đọc trực tiếp mã nguồn**, không tin báo cáo agent.

| # | Việc | Điểm sửa | Vì sao chặn demo |
|---|---|---|---|
| **B0-1** | 🔴 **`/quote` TRẮNG TRANG khi khách upload tệp CAD** — React unmount cả cây, `#root` rỗng, 0 ký tự. **Màn bán hàng chủ lực chết với MỌI tệp.** | `QuoteSummaryPanel.tsx:183` gọi `comparePrintersForModel(...)` **ngay trong render, không try/catch** (`:174` `generateDeliveryPackages` cũng vậy), trong khi `:114-132` **đã bọc đúng** ⇒ chính file này đã có khuôn xử lý. Dữ liệu thật gây nổ: `printer_fleet.DEMO-PR06` có `bed_dimensions = null` | Không demo được luồng báo giá; **và A1 không đo được UI `/quote` + 8 panel con vì trang trắng** |
| **B0-2** | 🔴 **Hiện `0 đ` như một cái giá thật** | `HomeView.tsx:29-30` + `ProductDetailView.tsx:25-26`: `isNum(0) === true` ⇒ cột DB `0` ("không bán kênh đó") in thành `"0 đ"`. DOM thật: `/products/DEMO-P03` có nút **"ĐẶT GIA CÔNG IN 3D (0 đ)"**, trang chủ **8 dòng "0 đ"** | Bịa giá — vi phạm `docs/design/data-honesty.md`. Comment **ngay trên** hàm đã ghi đúng luật ("thiếu giá trị ⇒ `—`, không bịa `0 đ`") ⇒ **mã tự mâu thuẫn với hợp đồng của chính nó**. `ExploreView.tsx:49-51` làm ĐÚNG (`> 0`) ⇒ 2 màn kia **lệch chuẩn** |
| **B0-3** | **Toàn app chỉ có DUY NHẤT 1 ErrorBoundary**, chỉ bọc khung 3D | `CanvasErrorBoundary` chỉ nằm trong `Tool3DView.tsx:1099-1131`; **không có boundary cấp route** ⇒ mọi lỗi render ở bất kỳ đâu làm trắng cả app (đó là lý do B0-1 phá hoại toàn cục) | Cần lưới an toàn để 1 lỗi dữ liệu không giết cả ứng dụng |
| **B1** | **Đặt hàng phải ghi DB** | `CheckoutView.tsx:106-194` hiện chỉ `setState`; gọi `OrderService.createOrder` (`orderService.ts:7`, hiện **dead code** — chỉ `backend/index.ts:5` re-export); `database.ts:240` `saveOrder` đã có. **Chưa có đường ghi `order_items` nào trong `database.ts`** | Đơn **không** vào `orders`; `/lab` trông như chạy được vì có 3 đơn seed |
| **B2** | **Sửa kiểu `orders.date`** | `CheckoutView.tsx:133` gửi chuỗi hiển thị `"13/9/2026 14:30:00"` vào `timestamptz` ⇒ lỗi `22008` | Kể cả nối `saveOrder` cũng **INSERT gãy** |
| **B1b** | `assigned_workshop_id` **không bao giờ được ghi** | `database.ts:262-285` không đưa cột này vào payload insert | Không định tuyến được đơn cho xưởng — lõi của marketplace 3 bên |
| **B3** | `mappers.ts` **thôi biến NULL → 0** | `mappers.ts:137-138` `n(d.price_physical ?? …)`; dùng `numOrNull` (`:191`) | Giá chưa khai hiện **0 đ** thay vì `—` |
| **B4** | **Bỏ số bịa GHI VÀO DB** | `AdminProductsPanel.tsx:83,84` (`\|\| 150000`/`\|\| 45000`) + `:89-99` (specs/ảnh/tag/badge bịa); `AdminStorefrontPanel.tsx:661,671` (`\|\| 300000`/`\|\| 25000`) | Admin bỏ trống ⇒ **sản phẩm thật mang giá/thông số bịa** |
| **B5** | Admin **đọc DB thật** thay RAM | Đội máy in: DB có **7** máy, UI hiện **0** (`Group1WorkshopsPanel.tsx:9-10`, store rỗng) · Nhà thiết kế: `designer_profiles` có sẵn service mà panel in-memory · Khách/RFQ: `customer_profiles`/`quotes` | 3 panel "trông có, thật ra rỗng" |
| **B6** | `queue`/`orders`/`inventory` là **cùng một màn** | `AdminDashboardView.tsx:379-388` render **cùng `Group5ProductionPanel`** (A3 đo 3 mục đều `panelChars=765`, text y hệt); Kanban chỉ ghi `localStorage: vcube_production_store_v1`; `dbService.updateOrderStatus` **0 caller**; `inventory` lẽ ra mở `WarehouseInventoryPanel` | 3/16 mục menu trùng nhau + mục "Kho Vật Liệu" mở nhầm màn |
| **B7** | Nối nốt đường ghi còn hụt | `onUpdateAccessories={setAccessories}` (`App.tsx:1622,1653`) ⇒ `saveAccessory` **0 caller**; không có `deleteMaterial`/`deletePrinter` (upsert-only); `settingsService.bootstrapSettings()` **không gọi `notify()`** | Sửa phụ kiện **mất khi tải lại**; xoá không xoá dưới DB |
| **B8** | Còn 2 nguồn bịa khác | `CartView.tsx:70-77` hardcode mã giảm giá `TECH3D`/`VCUBE10`/`VN3DHUN` (không có bảng promo) nhưng **chảy vào `appliedDiscount`**; `App.tsx:1202-1209` bịa `isVerified/format/version/license/maxDownloads/fileSize:'16.5 MB'` trong khi DB có giá trị thật (2.4/8.1/1.2 MB) | Mã giảm giá không tồn tại vẫn trừ tiền; thư viện tài sản hiện metadata bịa |

---

## 6. Gate & nghiệm thu (giữ toàn bộ gate cũ, **cộng thêm**)

**Gate hiện có — coordinator vừa chạy lại toàn bộ và xác nhận:** `lint` RC=0 · `build` RC=0 · `check-contrast` RC=0 · `check-fabricated` RC=0 · `check-unitprice-multiplier` RC=0 · `a8-sql-syntax-check` RC=0 · `lint-rls-sources` RC=0 · `lint-rls-migration` RC=0 · `verify-rls` RC=0.

⚠️ **Nhưng "xanh" không có nghĩa "đúng" — 3 lỗ hổng gate đã được chứng minh:**

| Lỗ hổng | Bằng chứng |
|---|---|
| `check-contrast.mjs` **chỉ so bảng token với chính nó, KHÔNG đo DOM** | RC=0 (72/84 PASS, 0 unexpected) **trong khi DOM thật có 12 text node fail tương phản trên `/`** ở mọi kích thước. Thiếu 3 cặp: `text-fg-subtle #64748B` trên `bg-line-subtle #E2E8F0` (3.86/4.26) · `#64748B` trên `bg-primary/5` (4.40, phải composite alpha) · `text-warning #B45309` trên `bg-warning-tint` (4.47) |
| `check-fabricated.mjs` **mù** với `\| <số>` ngoài `pricingEngine` (141 chỗ toàn repo), với `'16.5 MB'`, version, license | RC=0 "SẠCH" trong khi `App.tsx:1202-1209` bịa đủ 6 trường |
| Gate tĩnh **không bắt được lỗi kiểu** (do `strict:false` ⇒ `strictNullChecks` TẮT) | B0-2 (`0 đ`) và `mappers.ts` NULL→0 lọt qua mọi gate |

**Gate mới cần thêm (mỗi cái PHẢI có test âm — luật phiên này):**

| Gate mới | Chặn gì | Test âm |
|---|---|---|
| 3 cặp màu trên vào `check-contrast.mjs` | gate "xanh giả" về tương phản | đặt lại màu fail ⇒ RC=1 |
| `scripts/check-ui-adoption.mjs` | `<button>`/`<table>`/`window.confirm`/`toLocaleString` **tăng thêm** so với mốc §2; `Section`/`Toolbar`/`Money`/`ConfirmDialog` vẫn 0 dùng | thêm 1 `<button>` ⇒ RC=1 |
| Mở rộng `check-fabricated.mjs` | `\| <số>` ngoài engine, `'16.5 MB'`, version, license | thêm `fileSize:'16.5 MB'` ⇒ RC=1 |
| `scripts/check-orphan-services.mjs` | hàm `dbService.*` có **0 caller** (như `saveAccessory`, `updateOrderStatus`) | bỏ 1 caller ⇒ RC=1 |

**Nghiệm thu thị giác mỗi đợt (theo `21` §5):** build tĩnh + `vite preview` **cổng riêng** → Edge gọi **IP WSL** → ảnh **trước/sau** ở **390 / 1024 / 1440**, **light + dark**; đo **bằng số**: `scrollWidth===clientWidth` ở 390 · 0 phần tử chữ có tương phản <4.5:1 · 0 `pageerror`.

---

## 7. Thứ tự & phụ thuộc

```
U0 (hạ tầng + ErrorBoundary)  ──┐
B0-1, B0-2 (2 lỗi P0 nhỏ)      ──┤  ĐỢT 1 — đang chạy
B2 → B1 → B1b (ghi được đơn)   ──┘
                                   │
B3, B4, B5, B6, B7, B8 ────────────┘  ĐỢT 2 (song song được: khác file)
                                   │
U1 Storefront ─────────────────────┤ (song song: khác file)
U2 /admin  ← CHỜ B4/B5/B6 xong mới sửa giao diện, tránh sửa 2 lần
U3 /lab + /designer ← sau U2 (học khuôn WorkshopSettingsView)
U4 Funnel ← sau B1 (vì luồng đổi)
```
**Lý do thứ tự:** `U2` phải **sau** `B4/B5/B6` — nếu làm giao diện admin trước rồi mới đổi nguồn dữ liệu thì phải sửa **hai lần** (bài học đã ghi ở `26` §E).

---

## 8. Việc cần anh quyết

1. **`text-xs` 2.136 chỗ**: `21` §1.3 chốt body **14px** ⇒ sẽ **đổi diện mạo gần như mọi màn**. Làm **theo từng đợt** (an toàn, chậm, duyệt ảnh được) hay **một lần toàn repo** (nhanh, rủi ro cao, khó duyệt ảnh)? — *mặc định tôi chọn: theo từng đợt.*
2. **Dữ liệu mẫu**: giữ để duyệt UI, hay `--remove` để thấy đúng trạng thái "trống" thật? — *mặc định tôi chọn: giữ tới hết U2.*

---

## 9. Việc anh cần làm (không thuộc code)

- 🔴 **Rotate `sb_secret_…` NGAY** — khoá này **đã lộ thêm một lần nữa** trong phiên này (A1: một lệnh `curl` lỗi cú pháp in nguyên dòng lệnh kèm khoá ra stderr).
- **Dán lại `supabase/scripts/bootstrap_admin.sql`** (98 dòng) — bản trong editor của anh đã hỏng do tìm–thay `CHANGE_ME@example.com`; sentinel nay là `'__change_me__'`.
- Chạy `supabase/diagnostics/audit_schema_truth.sql` trong SQL Editor — kỳ vọng `P6 = 30 · 84 · 6`, `P11 = OK 24/24`, `P9 = 0`.
- Khai báo env trên Vercel.
- Trước khi nghiệm thu UI: **hard-reload + xoá `localStorage`** (vì admin đang đọc `localStorage`/RAM — xem B5/B6).
