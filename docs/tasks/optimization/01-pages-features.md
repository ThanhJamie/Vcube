<!-- doc-meta: status=active; verified=2026-10-21; owner=page-auditor -->
# 01 — Audit trang & tính năng (current state · UI v3 chưa commit)

> **Snapshot:** `HEAD 97cc256` + working tree ngày **2026-10-21** — **159 file dirty**, **98 file dưới
> `src/`**; UI v3 ("Soft Studio") nằm trong working tree, chưa commit.
> **Read-only:** không sửa `src/**`, không commit; chỉ ghi file này.
> **Supabase đang paused** ⇒ mọi kết luận là **code truth + docs**, không phải hành vi live. Số LOC đo
> trên cây hiện tại; số bundle lấy từ `dist/` build **2026-10-21 10:13** (khớp cây).
> Ký hiệu trạng thái: **L** loading · **E** empty · **Er** error · **S** success · `—` = không có.

---

## 0. Nguồn, phương pháp, giới hạn

| Loại | Nguồn đã đọc / dùng |
|---|---|
| Route | `src/App.tsx:1551-1876` (khối `<Routes>`); đối chiếu `docs/pages/_routes.generated.md` (30 route) |
| View | `src/frontend/views/*.tsx` (16 file, **14.330 LOC**); `components/NotFoundView.tsx` (54) |
| Tầng dữ liệu | `src/backend/supabase/database.ts`, `services/{orderService,workshopService,settingsService,customDesignService,assetService}.ts`, `migrations/20260901_baseline_schema.sql`, `20261010_harden_rls.sql` |
| Docs đối chiếu | `docs/tasks/as-is/03-routes-views-components.md`, `04-workflows-feature-status.md`, `ui-redesign-v3/ROUTE-MATRIX.md`, `QA-REPORT.md`, `handoff/*.md` (7 file) |
| Đo | `wc -l`, `grep`, `git status`, `git show HEAD:src/App.tsx`, kích thước `dist/assets/*` |

**Giới hạn (đọc trước khi dùng):**
1. Không chạy dev server / browser / Supabase ⇒ không có bằng chứng runtime; các mục "state" là **suy ra
   từ JSX + điều kiện code**, có kèm dòng.
2. Số bundle là của lần build gần nhất (10:13 cùng ngày); nếu sửa `src/**` sau đó thì phải build lại.
3. Không xác minh được RLS *thực tế*; chỉ đọc policy trong migration. Chỗ nào kết luận "khách không đọc
   được" là dựa trên `20261010_harden_rls.sql`.

---

## 1. Bản đồ route/trang — **30 route = 23 màn thật + 7 redirect**

`src/App.tsx:1551-1876`. Toàn bộ storefront/transaction **eager**; chỉ **5 module lazy**
(`Tool3DView`, `AdminDashboardView`, `DesignerDashboardView`, `WorkshopSettingsView`,
`WorkshopOnboardingWizard` — `src/App.tsx:82-88`).

### 1.1 · 23 màn thật

| # | Path | View (wrapper → view) | Guard | Nguồn dữ liệu (hiện tại) | Load | LOC | L | E | Er | S | Tính năng chính | Ngõ cụt / thiếu nối | Ghi chú (code vs docs) |
|---:|---|---|---|---|---|---:|---|---|---|---|---|---|---|
| 1 | `/` | `HomeView` | — | `products` (App `loadProducts` → `dbService.getProducts`, `App.tsx:768-804`); `siteContent` (App `888-890` + localStorage); `materials` (`892-894`); `pricingConfig` (`884-886` + settings cache `758-761`); `CATEGORIES/POPULAR_TAGS` tĩnh | eager | 1454 | ✓ `886-911` | ✓ `936-975` | ✓ `894-927` + banner `874-884` | ✓ | Hero 3D switcher `388-575`; dropzone `577-672`; service showcase `673`; catalog lưới/bảng + filter `679-1290`; quy trình 4 bước `1311`; callout `1344`; hotline `1424`; quick-view `1436`; custom-idea `1446` | Không có CTA chết (dropzone → `/quote` + state `uploadedFile` được `Tool3DView.tsx:589` đọc) | 11 `useState`; **91 nhánh `isVi ?`** (dead EN) |
| 2 | `/explore` | `ExploreRoute` → `ExploreView` | — | `products/materials/pricingConfig` props; `useCartStore` (`:10`); `useAuth` (`:9`); bookmark **local state** `:228` | eager | 1470 | ✓ `965-976` | ✓ `1013-1070` | ✓ `978-1011` + cảnh báo dữ liệu cũ `954` | ✓ | Category tile `667`; tag chip `711`; sidebar lọc `846`; sort + phân trang `872-1280`; **table view** `1330-1425`; sheet lọc mobile `1431`; quick-view `1456` | Bộ lọc **một chiều** `URL → state` (`241-251`); không có `setSearchParams` trong file ⇒ refresh/Back/mở link đều mất filter. Bookmark mất khi rời trang (`253-266`) | 17 `useState`; **113 nhánh `isVi ?`** — file nhiều dead EN nhất |
| 3 | `/products/:productId` | `ProductDetailRoute` → `ProductDetailView` | — | `products` prop (`App.tsx:1593`); `MATERIALS_CATALOG` fallback (`PDP:51,61` — **rỗng**, `mockData.ts:49`); `pricingConfig` | eager | 1128 | ✓ `App 174-183` | — (chỉ "không tìm thấy" `213-228`) | ✓ `App 185-211` | ✓ | 3D/thư viện `417`; batch co-print `503`; card báo giá sticky `529`; tabs `844-1029`; reviews `944`; related `1030`; **sticky bar mobile** `1093` | Tab reviews **chỉ đọc counter** `products.rating/reviews_count` — không đọc bảng `reviews` (`944-989`); bookmark local (`:78`) | 12 `useState`; 38 nhánh `isVi ?` |
| 4 | `/personalize` | `PersonalizeRoute` → `PersonalizeView` | — | `products[0]` (`App.tsx:244`) + `materials`/`pricingConfig` props; 3D viewer local | eager | 1160 | — (loading nằm trong viewer) | ✓ `NotFoundView` `App 246-248` (catalog rỗng) | — | ✓ | 3D `435`; khắc/logo/tách nắp/gói/số lượng `120-138`; summary sticky `612`; BOM; sticky bar `1133` | Tuỳ biến **không được lưu** ngoài line cart (không có job/spec server) | 14 `useState`; không có route-level skeleton |
| 5 | `/personalize/:productId` | `PersonalizeRoute` | — | `products.find(id)` | eager | — | — | ✓ `App 246` khi id sai | — | ✓ | như #4 | id sai ⇒ 404, không có gợi ý sản phẩm khác | Dùng chung wrapper với #4 |
| 6 | `/quote` | `Tool3DView` | — | props `materials/printers/pricingConfig` (`App 1637-1645`); parse client `utils/meshParser` (`Tool3D:15`); `pricingEngine` chạy client; `SAMPLE_ANALYSIS_FILES = []` (`mockData.ts:215`) | **lazy** `App:82` | 1956 | ✓ `Suspense` `App:1542` + Analyzing `645` | ✓ chưa có tệp `606-660` | ✓ parse-fail `683-700` + thiếu máy/vật liệu | ✓ | Upload/drag `620-700`, `997-1067`; object tree; 3 tab workspace `392`; `ModelViewer3D` `1202`; `QuoteSummaryPanel` `1803`; lịch sử | "Gửi yêu cầu thẩm định thủ công" chỉ bật **note tĩnh** (`278-283`); **không lưu báo giá** — `dbService.saveQuote` **0 caller** (`database.ts:550-552`); CTA `/admin/pricing` hiện cho **mọi role** (`QuoteSummaryPanel:227,589`) ⇒ khách bấm vào bị 403 | 28 `useState`; `import * as THREE` trực tiếp (`:3`) |
| 7 | `/cart` | `CartView` | — | `useCartStore` (persist localStorage, `useCartStore.ts:28-`); `computeShippingFee` (`CartView.tsx:53` → `database.ts:33`); `usePricingGlobalSettings` (`:38`); VAT `lib/vat` (`:62`) | eager | 532 | ✓ VAT "đang đọc cấu hình" | ✓ `109` | ✓ VAT/pricing error | ✓ | 2 nhóm vật lý/tệp số; promo `395-425`; ship; VAT; summary sticky | Promo **luôn bị từ chối** (`73-84`, không có bảng voucher); giỏ **không persist server** — `cart_items` có 0 tham chiếu trong `src/` | 26 nhánh `isVi ?` |
| 8 | `/checkout` | `CheckoutView` | — (guest checkout) | `OrderService.createOrder` `:219` → `dbService.saveOrder` `:375` (**chỉ bảng `orders`**); `settingsService` `:12`; ship/VAT | eager | 820 | ✓ `isProcessing` | ✓ giỏ rỗng `260` | ✓ `orderError` `781-795` | ✓ chỉ sau khi DB nhận | PII; 3 phương thức `491-540`; VAT invoice; COD/VietQR/VNPAY; token khách sinh client `:161` | **Không ghi** `order_items` / `order_files` / `payment_transactions` (`recordPaymentTransaction` **0 caller**, `database.ts:864`); không có cổng thanh toán thật (`539`) | 16 `useState`; 12 nhánh `isVi ?` |
| 9 | `/order-success` | `OrderSuccessRoute` → `OrderSuccessView` | — | `orders` state của App (RAM) | eager | 276 | — | — | — | ✓ | Copy token `74-104`; stepper 4 nấc; mở hoá đơn | **Route không id luôn lỗi**: `resolveOrderById` trả `null` khi thiếu id (`App.tsx:272-275`) ⇒ chỉ render `OrderNotFoundView` (`282-287`). F5 sau khi đặt ⇒ `orders=[]` ⇒ lỗi | Docs ghi "E ✓ OrderNotFoundView" — đúng, nhưng đó là **trạng thái duy nhất** của route này |
| 10 | `/order-success/:orderId` | `OrderSuccessRoute` | — | như #9, resolve nghiêm ngặt | eager | — | — | ✓ not-found | — | ✓ | như #9 | Đơn chỉ tồn tại trong RAM; refresh mất. Cửa bền duy nhất là `/tracking` + token | Không có L/Er |
| 11 | `/tracking` | `OrderTrackingRoute` → `OrderTrackingView` | — | `dbService.getOrderByToken` (RPC `get_order_by_guest_token`, `database.ts:517-546`); guest mode `73-117` | eager | 597 | ✓ `221-230` | ✓ cổng tra cứu | ✓ `205` | ✓ | Pipeline 8 nấc (`OrderProgress`/`MES_PIPELINE_STAGES`); QC; thanh toán; items | Không realtime; tra cứu **bắt buộc token ≥12 ký tự** (đúng bảo mật) | File **VI-only** (0 nhánh `isVi ?`) |
| 12 | `/tracking/:orderId` | `OrderTrackingRoute` | — | `orders` (App) resolve nghiêm ngặt `272-275` | eager | — | ✓ | ✓ not-found `212` | ✓ | ✓ | như #11 | Refresh ⇒ not-found (đơn không còn trong RAM) | Đường bền: `/tracking?code=…&token=…` |
| 13 | `/orders` | `MyOrdersView` | **ProtectedRoute** (`App:93-106`, skeleton `:101`) | **`orders` chỉ được nạp cho admin** (`App:917-928`); khách **không có** lượt fetch nào; `OrderService.getOrdersByCustomer` **0 caller** (`orderService.ts:46`) | eager | 504 | ✓ (từ guard) | ✓ 2 empty `195-230` | **—** (không có error state) | ✓ | Filter 6 tab `42-48`; search; `OrderProgress`; bảo hành `399-490`; hoá đơn `376`; đặt lại `68-75` | **Dữ liệu không bao giờ được nạp** ⇒ sau reload luôn hiện "Bạn chưa có đơn hàng nào" (`198`) dù DB có đơn (RLS `vcube_orders_owner_read` **cho phép** đọc — `harden_rls.sql:349`). "Đặt lại" gửi payload `reorderItems` (`:73`) **không ai đọc** ⇒ sang `/quote` trắng. Bảo hành không persist (`89-100`) | Docs `ROUTE-MATRIX` #14 và `as-is 03` ghi nguồn "orders (DB/user)" — **sai với code** |
| 14 | `/assets` | `AssetLibraryView` | **ProtectedRoute** | `assets` prop = `DIGITAL_ASSETS` (**rỗng**, `mockData.ts:75`) + asset sinh từ đơn trong phiên (`App:1357-1383`); `AssetService.createSignedUrl` (`assetService.ts:19-24`) | eager | 293 | ✓ tạo link | ✓ `135` | — (toast) | ✓ | Search/lọc định dạng; modal preview `250`; thumb 3D | **`canDownload` luôn false** vì `storagePath` không tồn tại (`51-52`, `types/index.ts:172-175`); `order_files` **không có luồng ghi** (chỉ có comment `TODO(order_files)` `:25`); `digital_assets` **không có policy cho khách** (`harden_rls.sql:628-641`) | UI nói thật "chưa hỗ trợ tải trực tiếp" (`125-128`, `224`, `285`) |
| 15 | `/designer` | `DesignerDashboardShell` > `DesignerDashboardView` | **RoleGuard** `designer, admin` (`App:1750-1794`) | `products` prop; tab overview/requests qua `customDesignService` (realtime `:380`); models/wizard qua handler App → `dbService.saveProduct/deleteProduct`; payouts đọc fixture | **lazy** `App:84` | 173 (+2.018 tab) | ✓ `RoleGuard:39-48` + loading tab | ✓ per-tab | ✓ `PanelErrorBoundary` `113-170` | ✓ | 5 tab `14-21`; upload wizard `136`; board yêu cầu + chat `150`; payout `160` | **Payouts inert**: `PAYOUT_TRANSACTIONS = []` (`mockData.ts:225`), bảng rỗng + nút rút disabled (`DesignerPayoutsTab:3,35`) | Shell `App:410-512`; `activeId` lấy từ URL |
| 16 | `/designer/:tab` | như #15 | RoleGuard | theo tab | lazy | — | ✓ | ✓ | ✓ | ✓ | như #15 | Tab sai ⇒ **im lặng về `overview`** (`DesignerDashboardView:47-50`) nhưng URL vẫn sai | — |
| 17 | `/admin` | `AdminDashboardView` | **RoleGuard** `admin` (`App:1800-1829`) | props (products/orders/materials/printers/accessories/pricing) + **11 panel lazy** (`AdminDashboardView:27-44`); Group1/2/3/5 tự fetch `dbService`; Group0/4/Warehouse prop-driven; Settings qua `settingsService` | **lazy** `App:83` | 642 (+**14.568** panel) | ✓ `327` skeleton | ✓ per-panel | ✓ `PanelErrorBoundary` | ✓ | 16 mục nav (`AdminSidebar:48-…`); badge đếm `154-170`; `h1` sr-only `326`; map section→panel `330-500` | **Dispatch không có write path** (`Group5ProductionPanel:800`); duyệt payout không có bảng (`Group2DesignersPanel:642`); orders chỉ nạp 1 lần khi role=admin (`App:917`) và **không realtime** | **3 registry song song**: `validSections` 23 (`121-127`), `sectionBreadcrumbs` 23 (`167-269`), nav 16 id (`AdminSidebar`) |
| 18 | `/admin/:section` | như #17 | RoleGuard | section từ URL (nguồn sự thật) | lazy | — | ✓ | ✓ | ✓ | ✓ | như #17 | Section sai ⇒ im lặng về `overview` (`135-137`) | Alias: `group0-overview`, `workshops`, `customers`, `pricing-engine`, `pricing-setup`, `cost-rules` |
| 19 | `/lab` | `LabRoute` (onboarding \| MES) | **RoleGuard** `lab, workshop, admin` (`App:1500-1508`) | `workshopService.getWorkshopProfileByUserId` (`workshopService.ts:499`, gọi ở `App:575`); `getMyWorkshopProfile:1239`, `getMyMachines:1308`, `getMyMaterials:1405`, `getMyInventoryLogs:1481`, `getMyAccessories:1581`, `getMyQueueOrders:1654`, `updateMyOrderProgress:1675`; catalog gợi ý `291-296` | **lazy** `App:87-88` | 2574 | ✓ `App:592-597` + `1375-1400` | ✓ EmptyState per tab | ✓ profile error `1406-1421` + error prop từng bảng | ✓ | 6 tab (`:76`, `109-116`); toggle list/kanban `198`; 4 modal CRUD (`446`,`559`,`642`,`726`); preferences `795` | **Queue luôn rỗng**: `orders.assigned_workshop_id` không có đường ghi (checkout không truyền `assignedWorkshopId`; dispatcher đã gỡ nút — `Group5:800`). **Xưởng `Suspended` vẫn qua cổng**: `App:579` chỉ chặn `Pending`, còn schema có `Pending/Verified/Suspended` (`baseline_schema.sql:933`) | View **nặng nhất** (66 `useState`), gấp 1,3× file lớn thứ nhì |
| 20 | `/lab/:tab` | `LabRoute` | RoleGuard | theo tab | lazy | — | ✓ | ✓ | ✓ | ✓ | như #19 | Tab sai ⇒ im lặng về `queue` (`WorkshopSettingsView:189`) | — |
| 21 | `/auth/login` | `LoginView` | — | `useAuth.signInWithEmail` (`31-55`); `?redirectTo=` `41-44` | eager | 263 | ✓ `191` | — | ✓ `94` | ✓ redirect | Google (gated) + reset (gated); hiện/ẩn mật khẩu | Google/reset **tắt bằng cờ** (`AuthModal:14,22`); `redirectTarget.replace(/^\//,'')` (`:41`) đi qua adapter chuỗi screen — dễ vỡ nếu path lạ | 8 `useState` |
| 22 | `/auth/register` | `RegisterView` | — | `useAuth.signUpWithEmail` (`111-115`); `signupRole` customer/designer (`:27`) | eager | 488 | ✓ `406` | — | ✓ `178` | ✓ + chờ xác nhận email `413` | Strength meter `326`; consent mặc định **không tick** | Không có route `/terms` `/privacy` ⇒ chấp nhận "không link" (quyết định `handoff/commerce-auth.md §6.3`) | 13 `useState`; 29 nhánh `isVi ?` |
| 23 | `*` | `NotFoundView` | — | — | eager | 54 | — | — | — | ✓ | 2 CTA: về `/`, `/explore` | — | `currentScreen` fallback `home` (`App:1154`) ⇒ vẫn render Header/Footer/FAB trên 404 |

### 1.2 · 7 redirect

| # | Path cũ | → đích | Kiểu | Ghi chú |
|---:|---|---|---|---|
| 24 | `/tool-3d` | `/quote` | `replace` (`App:1647`) | Alias của màn #6 |
| 25 | `/my-orders` | `/orders` | `replace` (`App:1731`) | Nếu chưa login, `ProtectedRoute` mới đẩy tiếp `/auth/login` |
| 26 | `/library` | `/assets` | `replace` (`App:1746`) | Như trên |
| 27 | `/creator` | `/designer` | `replace` (`App:1795`) | Vai trò khách ⇒ RoleGuard 403 (không phải redirect im lặng) |
| 28 | `/creator/*` | `/designer` | `replace` (`App:1796`) | Bắt mọi path con |
| 29 | `/login` | `/auth/login` | `replace` (`App:1870`) | — |
| 30 | `/register` | `/auth/register` | `replace` (`App:1872`) | — |

### 1.3 · Ma trận guard & deep-link

| Guard | Route | `loading` | Chưa đăng nhập | Sai vai trò |
|---|---|---|---|---|
| `ProtectedRoute` (`App:93-106`) | `/orders`, `/assets` | `<PageSkeleton/>` (`:101`) — **đã sửa so với docs** | `/auth/login` (không giữ `redirectTo`) | không áp dụng |
| `RoleGuard` (`RoleGuard.tsx:26-123`) | `/designer`, `/admin`, `/lab` | khối "Đang xác thực phiên…" (`39-48`) | `/auth/login?redirectTo=…` (`50-56`) | màn 403 + danh sách role (`81-121`) |

**Bất đối xứng còn lại (P2):** `ProtectedRoute` không giữ `redirectTo`; `RoleGuard` giữ. Người dùng mở
`/orders` khi chưa login sẽ về `/auth/login` trơn, đăng nhập xong rơi về `/` — trong khi `/admin` thì
quay lại đúng chỗ.

### 1.4 · Hành vi route "mềm" (không 404)

| Tình huống | Hành vi thật | Hệ quả |
|---|---|---|
| `/admin/<section lạ>` | render `overview`, URL giữ nguyên (`AdminDashboardView:135-137`) | nav highlight `overview`, URL nói khác; không có trang 404 cho console |
| `/designer/<tab lạ>` | render `overview` (`DesignerDashboardView:47-50`) | như trên |
| `/lab/<tab lạ>` | render `queue` (`WorkshopSettingsView:189`) | như trên |
| `/order-success` (không id) | luôn `OrderNotFoundView` (`App:272-287`) | route tồn tại nhưng **không thể thành công** |
| `/tracking` (không id) | cổng tra cứu guest | đúng thiết kế |

---

## 2. Ma trận tính năng (13 workflow)

> Trạng thái: **REAL** dùng được end-to-end với DB · **PARTIAL** có phần thật + phần thiếu · **UI-ONLY**
> chỉ có giao diện, không ghi/đọc DB · **MOCK** đọc fixture · **DEAD** không thể hoàn thành.

| # | Workflow | Trạng thái | Bằng chứng (file:line) | Điều chặn production |
|---:|---|---|---|---|
| 1 | **Auth** (email/password, đăng ký, role từ DB) | **REAL** (extras gated) | `AuthContext` `resolveDbRole`; `LoginView.tsx:31-55`; `RegisterView.tsx:100-130`; `AuthModal.tsx:406-500` | Google OAuth `AuthModal:22` = false; reset `:14` = false; project chưa bật provider ⇒ 2 affordance chết có cờ |
| 2 | **Catalog** (đọc + realtime) | **REAL** | `App.tsx:768-804` (`dbService.getProducts`), `822-879` (channel `public:products`), mapper chung `rowToProduct` `:842` | Phụ thuộc Supabase sống; chưa có fixture ⇒ mọi ảnh QA là empty-state |
| 3 | **PDP** | **PARTIAL** | `ProductDetailView.tsx:48-1128`; add-to-cart qua prop; reviews `944-989` | Tab reviews **chỉ có counter**; `reviews` table không đọc/không ghi ⇒ không thể có đánh giá thật; không tồn kho/lead-time |
| 4 | **Quote (`/quote`)** | **PARTIAL** | parse `Tool3DView.tsx:405`; giá client `pricingEngine`; empty/missing `606-700` | Không có Edge Function/quote server; **không lưu báo giá** (`dbService.saveQuote` 0 caller, `database.ts:550-552`); thiếu `materials`/`printer_fleet` ⇒ không ra giá (`PricingUnavailableError`) |
| 5 | **Personalize** | **PARTIAL** | `PersonalizeView.tsx:120-138`, `435`, `612`; add-to-cart | Chỉ lưu line cart; không spec/job server; phí khắc/logo phụ thuộc cấu hình (`196-206`) |
| 6 | **Cart** | **PARTIAL** | `useCartStore.ts:28-` (persist localStorage); `CartView.tsx:73-84` promo; `cart_items` **0 ref** trong `src/` | Giỏ không persist server (`cart_items` có bảng, không service); promo **luôn bị từ chối** (không bảng voucher) |
| 7 | **Checkout / tạo đơn** | **PARTIAL** | `CheckoutView.tsx:219` → `orderService.ts:28-45` → `database.ts:375-449` | Chỉ ghi `orders` (items jsonb): **không** `order_items`, **không** `order_files`, **không** `payment_transactions` (`recordPaymentTransaction` 0 caller `database.ts:864`); VNPAY/VietQR chỉ là nhãn (`CheckoutView:539`); token khách sinh client (`:161`) |
| 8 | **Orders / tracking** | **PARTIAL** | tracking thật: `OrderTrackingView.tsx:73-117` → `database.ts:517-546`; `/orders` rỗng: `App.tsx:917-928` | `/orders` **không nạp dữ liệu cho khách** ⇒ lịch sử đơn = UI-ONLY (xem P0-1); không realtime; warranty không persist |
| 9 | **Assets (tệp CAD đã mua)** | **DEAD** | `AssetLibraryView.tsx:51-52`, `125-128`; `order_files` không có writer; `digital_assets` RLS chỉ designer/admin (`harden_rls.sql:628-641`) | Không có chuỗi giao file: checkout không ghi `order_files`, `storagePath` không tồn tại, khách không đọc `digital_assets` ⇒ **mua tệp số không bao giờ nhận được tệp** |
| 10 | **Designer Studio** | **PARTIAL** | models/wizard → `dbService.saveProduct` (qua `App:1411-1453`); requests realtime `customDesignService.ts:380`; payouts `DesignerPayoutsTab.tsx:3,35` | **Payout = UI-ONLY**: fixture rỗng `mockData.ts:225`, không ledger, nút rút disabled; duyệt payout không có bảng (`Group2DesignersPanel:642`) |
| 11 | **Lab / MES** | **PARTIAL** | `workshopService.ts:1239-1710` (scope `partner_id`); `WorkshopSettingsView.tsx:1697` (queue), `1864` (machines), `2098` (preferences) | Queue **DEAD**: `orders.assigned_workshop_id` không có write path (checkout không truyền; dispatcher gỡ nút `Group5:800`); cổng `/lab` cho `Suspended` đi qua (`App:579` vs schema `:933`) |
| 12 | **Admin console** | **PARTIAL** | 11 panel lazy `AdminDashboardView:27-44`; CRUD/pricing/KYC qua `dbService`/`settingsService` | Dispatch & payout approval thiếu write path; orders không realtime; 3 registry section dễ lệch |
| 13 | **Settings / realtime** | **PARTIAL** | `settingsService.ts:336` (channel `vcube:settings`), 4 store + `setting_audit`; `App:758-761`; `customDesignService:380` | Orders realtime **có server, không client** (3 kênh: `public:products`, `vcube:settings`, `public:custom_design_requests`) |

### 2.1 · Trạng thái sub-surface (để không gộp nhầm vào workflow)

| Sub-surface | Trạng thái | Bằng chứng |
|---|---|---|
| Reviews (đọc/ghi/tổng hợp) | **DEAD** | PDP chỉ đọc counter `ProductDetailView.tsx:944-989`; không service nào chạm `reviews` |
| Warranty claims | **UI-ONLY** | `MyOrdersView.tsx:89-100`, `408-420`; bảng `warranty_claims` không có writer |
| Promo / voucher | **DEAD** | `CartView.tsx:73-84`; không bảng promo trong migration |
| `cart_items` (giỏ server) | **DEAD** | 0 tham chiếu trong `src/` |
| `order_items` (chia 3 bên) | **DEAD** | `saveOrder` chỉ ghi `orders` (`database.ts:414-449`) |
| `payment_transactions` | **DEAD** | `database.ts:864`, 0 caller |
| `quotes` | **DEAD** | `database.ts:550`, 0 caller (docs `as-is 04 §7` nói "ghi nhưng không đọc" — **thực tế không ghi**) |
| `order_files` / tải tệp | **DEAD** | 0 writer; `canDownload` luôn false |
| Payout ledger / duyệt rút | **DEAD** | không bảng request; `Group2DesignersPanel:642` |
| Dispatch gán xưởng | **DEAD** | `Group5ProductionPanel:800`; `saveOrder` có nhận `assignedWorkshopId` nhưng checkout không truyền (`CheckoutView:219-222`) |
| Orders realtime | **DEAD** (client) | 3 channel ở trên; không có `orders` |
| Bookmark (PDP/Explore) | **UI-ONLY** | `ExploreView:228,253-266`; `PDP:78` — local state, mất khi rời trang |
| Homepage CMS (`site_content`) | **REAL** | `AdminStorefrontPanel.tsx:109`; `App:1475-1489` → `saveSiteContent` |
| SEO panel | **REAL** (cùng `site_content`) | `AdminSeoPanel.tsx:68` |
| Pricing config | **REAL** | `App:1010-1030` → `settingsService.savePricingConfig` (validate + audit) |

---

## 3. Tín hiệu tài nguyên / refactor theo trang

### 3.1 · Bundle & eager imports

`dist/` build 2026-10-21 10:13; `index.html` preload **4 chunk** (`dist/index.html:16-20`):

| Chunk | Kích thước | Nạp khi | Ghi chú |
|---|---:|---|---|
| `index-*.js` (entry) | **880 KiB** | mọi route | Chứa toàn bộ 12 view eager (storefront + transaction + auth) + `Header` 480 + `AuthModal` **913** + `CartDrawer` 353 + `InvoiceModal` 348 + `ChatSupportModal` 125 + `ThreeModelViewer` 484 |
| `three-vendor-*.js` | **519 KiB** | **mọi route** (modulepreload) | Vào graph qua `ThreeModelViewer` (Home/PDP/Assets) và `PersonalizeModelViewer3D` |
| `supabase-vendor-*.js` | **216 KiB** | mọi route | client khởi tạo ở `main.tsx` |
| `react-vendor-*.js` | **50 KiB** | mọi route | — |
| **Tổng JS preload** | **≈ 1,63 MiB** | — | + CSS **88 KiB** |
| `Tool3DView-*.js` | 343 KiB | `/quote` | Lazy, nhưng `three` đã nạp sẵn ⇒ lợi ích chỉ là parse |
| `Group4PricingEnginePanel-*.js` | 160 KiB | `/admin/pricing*` | Panel admin nặng nhất (chứa `PricingConfigPanel` 3.079 LOC) |
| `WorkshopSettingsView-*.js` | 55 KiB | `/lab` | — |

**Hệ quả:** code-split 5 module **không** giảm được chi phí storefront vì `three` + `supabase` nằm trong
graph eager. Đây là tín hiệu P1 về hiệu năng, không phải lỗi UI.

### 3.2 · View nặng (LOC · state · dead EN · raw control)

| View | LOC | `useState` | `isVi ?` (dead EN) | `<button` raw | Ghi chú |
|---|---:|---:|---:|---:|---|
| `WorkshopSettingsView` | **2574** | **66** | 0 | 5 | 6 tab + 4 modal + kanban + 6 miền dữ liệu trong 1 file |
| `Tool3DView` | **1956** | **28** | 0 | 16 | ~30 state, 4 modal, 3 tab, parse/QA/quote |
| `ExploreView` | **1470** | 17 | **113** | 12 | Bộ lọc render 2 lần (sidebar + sheet) |
| `HomeView` | **1454** | 11 | 91 | 9 | Hero + showcase + catalog + 3 modal |
| `PersonalizeView` | 1160 | 14 | 0 | 8 | — |
| `ProductDetailView` | 1128 | 12 | 38 | 10 | — |
| `CheckoutView` | 820 | 16 | 12 | 2 | — |
| `AdminDashboardView` | 642 | 4 | 65 | 0 | + 14.568 LOC panel admin |
| `OrderTrackingView` | 597 | 7 | 0 | 0 | — |
| `CartView` | 532 | 3 | 26 | 3 | — |
| `MyOrdersView` | 504 | 5 | 0 | 5 | — |
| `RegisterView` | 488 | 13 | 29 | 2 | — |
| `AssetLibraryView` | 293 | 5 | 0 | 0 | — |
| `OrderSuccessView` | 276 | 2 | 14 | 0 | — |
| `LoginView` | 263 | 8 | 13 | 1 | — |
| `DesignerDashboardView` | 173 | 2 | 0 | 1 | + 2.018 LOC tab |
| **Tổng view** | **14.330** | — | **401** | **74** | `App.tsx` thêm **2.152** LOC / 19 `useState` / 10 `useEffect` |

Toàn repo: **1.179 nhánh `isVi ? … : …`** trong `.tsx` (cách đếm: ternary `isVi ?`; nếu đếm mọi lần
xuất hiện `isVi` thì **1.467**) — tất cả là **dead EN** vì `LanguageContext` đã khoá `vi`
(`handoff/design-foundation.md §9.1`). Đây là nợ code, không phải nợ UI.

### 3.3 · Logic lặp (cùng một luật hiện nhiều bản)

| Mẫu lặp | Số bản | Vị trí |
|---|---:|---|
| `vnd()` / tiền "0 không phải giá" | 4 | `HomeView.tsx:44`, `ProductDetailView.tsx:32`, `PersonalizeView.tsx:211-213` (`money`), `QuoteSummaryPanel.tsx:38` |
| `licenseLabel()` (NULL ⇒ "— (người bán chưa khai báo)") | 3 | `HomeView.tsx:57`, `ExploreView.tsx:104`, `PersonalizeView.tsx:44` |
| `StepNumber` | 2 | `ProductDetailView.tsx:39`, `PersonalizeView.tsx:50` (bản sao gần nguyên văn) |
| Logic "giá khả dụng/thiếu tham số" | 4 | `HomeView:298-302`, `ExploreView:276-292`, `PersonalizeView:192-206`, `QuoteSummaryPanel` |
| Tóm tắt đơn + pipeline | 3 màn | `MyOrdersView`, `OrderTrackingView`, `OrderSuccessView` (chỉ `OrderProgress` dùng chung) |
| Registry section admin | **3 danh sách** | `AdminDashboardView:121-127` (23), `:167-269` (23 breadcrumb), `AdminSidebar` (16 nav) |
| Bề mặt auth | **2 bộ** | trang `/auth/*` + `AuthModal.tsx` 913 LOC (vẫn đủ 4 mode signin/signup/account/forgot, `:63-77`, `:318-350`) |
| Shell dashboard | 1 nơi nhưng cấu hình 2 lần | `DashboardShell` + `LAB_NAV`/`DESIGNER_NAV` (`App:373-408`) |

### 3.4 · Route trùng & alias

| Nhóm | Route | Dòng |
|---|---|---|
| Cùng view, 2 path | `/personalize` + `/personalize/:productId`; `/order-success` + `:orderId`; `/tracking` + `:orderId` | Khối element **copy nguyên** trong `App.tsx` (`1606-1631`, `1677-1696`, `1697-1718`) |
| Console, 2 path | `/admin` + `/admin/:section` (2 khối 30 dòng giống nhau `1799-1860`); `/designer` + `/designer/:tab` (`1749-1794`) | Tổng ~**190 dòng JSX** trong `<Routes>` là bản sao |
| Alias cũ | 7 redirect (§1.2) | `1647`, `1731`, `1746`, `1795-1796`, `1870`, `1872` |

### 3.5 · CTA / link / payload chết

| Mục | Vị trí | Loại | Mức |
|---|---|---|---|
| "Đặt lại" (MyOrders) gửi `reorderItems` | `MyOrdersView.tsx:73`; **không consumer** trong `src/` | payload chết | **P1** |
| CTA "Mở cấu hình giá (/admin/pricing)" hiện cho khách | `QuoteSummaryPanel.tsx:227`, `:589` | CTA dẫn 403 | **P1** |
| `/order-success` không id | `App.tsx:272-287`; `handleNavigate('order_success')` fallback `:1258` | route chết | P1 |
| "Gửi yêu cầu thẩm định thủ công" | `Tool3DView.tsx:274-283` | chỉ hiện note, không gửi | P2 (đã ghi nhận) |
| Nút rút tiền designer | `DesignerPayoutsTab` (disabled + fixture rỗng) | CTA chết có chủ ý | P2 |
| Nút "Xác nhận điều phối" admin | đã gỡ (`Group5ProductionPanel:800`) | không còn affordance giả | — |
| Footer "Theo dõi đơn hàng thời gian thực" → `/orders` | `App.tsx:2059` | nhãn hứa realtime, đích là danh sách + không realtime | P3 (CC-17) |
| Footer admin "Cấu hình phí ship & thông báo" | `App.tsx:2089` | chuỗi "ship" còn sót — **QA-REPORT §11 nói đã sửa** | P3 |
| `href="#preview"` / `#quote` (SERP preview) | `AdminSeoPanel.tsx:496,513,519` | anchor demo, 2 chỗ `preventDefault` | P3 |
| Double-push history khi bấm menu avatar | `UserAvatarMenu.tsx:64-70`: `navigate(path)` **rồi** `onNavigate(legacyScreen)` → `handleNavigate` navigate lần 2 | lỗi điều hướng | P2 |

### 3.6 · Docs lệch code (stale) — *code là sự thật*

| Tài liệu | Tuyên bố | Code hiện tại | Mức |
|---|---|---|---|
| `docs/pages/_routes.generated.md:1,7` | `source-sha256: 48f2f15ebd73` | sha256(`src/App.tsx`) = **`8dd75d3d0aa5`**; file sinh 2026-09-24, `App.tsx` sửa 2026-10-20 14:04 ⇒ **stale ~4 tuần** (tập route vẫn đúng 30) | P2 (regen 1 lệnh) |
| `ROUTE-MATRIX.md §3` (dòng 91) | `ProtectedRoute` loading "`return null` (màn trắng)" | `App.tsx:101` trả `<PageSkeleton/>` (UI-001 đã đóng) | P2 |
| `ROUTE-MATRIX.md` #14 (dòng 49) | `/orders` nguồn "`orders` (DB/user)" | Chỉ admin được nạp (`App:917-928`); khách không có lượt fetch | **P1** |
| `as-is/03` §2 (dòng 37-56) | LOC: Home 1404, Explore 1360, PDP 1020, Personalize 1079, Checkout 832, Tool3D 1938, Workshop 2493… tổng view 13.790 | Thực tế 1454/1470/1128/1160/820/1956/2574 — **14.330** | P2 |
| `as-is/03` §4 (dòng 170) | `ToastViewport` DEAD | Đúng (0 import; chỉ re-export `ui/index.ts:50`); `CardFooter` cũng 0 | — |
| `as-is/04` §7 (dòng 56) | "`quotes` ghi nhưng không UI nào đọc" | `saveQuote` **0 caller** ⇒ không ghi | P3 |
| `as-is/04` §11 (dòng 90) | "dispatch đã gỡ vì không có write path" | Đúng (`Group5:800`) | — |
| `QA-REPORT.md §11` | "`phí ship` → `phí vận chuyển`; grep visible = 0" | `App.tsx:2089` còn "Cấu hình phí ship & thông báo" | P3 |
| `QA-REPORT.md §11` | P0 = 0, P1 = 0 | Đồng ý **cho UI**; nhưng P0 **dữ liệu trang** tồn tại (§4) nằm ngoài phạm vi QA UI | — |
| `handoff/commerce-auth.md §4` | `/orders` loading "App-level" | Đúng (skeleton guard) — nhưng **không có dữ liệu** để hiện | P1 |

---

## 4. Rủi ro ưu tiên & quick win

### P0 — trang không hoàn thành chức năng / nói sai dữ liệu

| ID | Vấn đề | Bằng chứng | Vì sao P0 |
|---|---|---|---|
| **P0-1** | `/orders` của khách **không bao giờ nạp đơn** ⇒ luôn hiện "Bạn chưa có đơn hàng nào" kể cả khi DB có đơn | `App.tsx:917-928` (chỉ `role==='admin'`); `orderService.ts:46` 0 caller; RLS cho phép đọc `harden_rls.sql:349`; copy `MyOrdersView.tsx:198` | Trang **khẳng định sai** trạng thái đơn của người dùng = vi phạm data-honesty; chức năng chính của trang không tồn tại |
| **P0-2** | Chuỗi giao **tệp CAD đã mua** không tồn tại: checkout bán tệp số nhưng không ghi `order_files`, không có `storagePath`, khách không đọc `digital_assets` | `AssetLibraryView.tsx:51-52`; `database.ts:414-449`; `harden_rls.sql:628-641`; `types/index.ts:172-175` | Workflow thương mại cốt lõi ("mua tệp") không thể hoàn tất; mọi đơn tệp số hết ở trạng thái chết |

### P1

| ID | Vấn đề | Bằng chứng | Hướng |
|---|---|---|---|
| **P1-1** | `/order-success` (không id) luôn lỗi; F5 sau khi đặt ⇒ mất màn xác nhận | `App.tsx:272-287`; `orders` chỉ RAM (`App:686`, `1357-1359`) | Resolve theo `?order=`/sessionStorage hoặc redirect `/tracking` |
| **P1-2** | Checkout không ghi `order_items`/`payment_transactions`; không có cổng thanh toán ⇒ mô hình chia 3 bên & đối soát không có dòng nguồn | `database.ts:414-449`, `:864`; `CheckoutView.tsx:219`, `:539` | Viết `order_items` trong cùng transaction; webhook/đối soát thủ công |
| **P1-3** | `/lab` queue **luôn rỗng** vì `assigned_workshop_id` không có write path | `Group5ProductionPanel:800`; `CheckoutView.tsx:219-222` (không truyền `assignedWorkshopId`) | Bật dispatcher ghi cột (hoặc auto-assign) |
| **P1-4** | Xưởng `Suspended` vẫn vào MES dashboard | `App.tsx:579` chỉ chặn `Pending`; schema `baseline_schema.sql:933` | Gate `!== 'Verified'` → onboarding/blocked |
| **P1-5** | CTA `/admin/pricing` hiện cho khách ở `/quote` ⇒ 403 | `QuoteSummaryPanel.tsx:227,589` | Ẩn theo role hoặc đổi thành "liên hệ" |
| **P1-6** | "Đặt lại" của `/orders` gửi payload không ai đọc | `MyOrdersView.tsx:73` | Nạp lại giỏ từ items hoặc bỏ CTA |
| **P1-7** | Storefront preload **≈1,63 MiB JS** (three 519 KiB trên mọi route) | `dist/index.html:16-20`; `ThreeModelViewer.tsx:2` eager | Lazy `ThreeModelViewer` (Suspense) hoặc chỉ nạp ở PDP |

### P2

| ID | Vấn đề | Bằng chứng |
|---|---|---|
| **P2-1** | `/explore` filter một chiều: đổi filter không ghi URL; refresh/Back mất trạng thái | `ExploreView.tsx:241-251`; 0 `setSearchParams` |
| **P2-2** | Hai bề mặt auth: `AuthModal` (913 LOC, 4 mode) + `/auth/*` | `AuthModal.tsx:63-77`, `318-350`; `App.tsx:1968-1973` |
| **P2-3** | Bấm menu avatar push 2 history entry | `UserAvatarMenu.tsx:64-70` + `App:1160-1314` |
| **P2-4** | Tab/section lạ im lặng fallback, URL và nav lệch nhau | §1.4 |
| **P2-5** | `/orders` không có error state (khi nối DB sẽ không phân biệt "lỗi" với "rỗng") | `MyOrdersView.tsx:194-230` |
| **P2-6** | Bảo hành không persist dù có bảng | `MyOrdersView.tsx:89-100` |
| **P2-7** | Registry admin 3 bản (23/23/16) — thêm section phải sửa 3 nơi | `AdminDashboardView:121-269`, `AdminSidebar` |
| **P2-8** | `ProtectedRoute` không giữ `redirectTo` (bất đối xứng với `RoleGuard`) | `App:102-104` vs `RoleGuard:54-55` |
| **P2-9** | Docs stale làm mất niềm tin: route hash, LOC, `/orders` source, "phí ship" | §3.6 |

### Quick win (≤ 1 buổi, không đổi kiến trúc)

1. `node scripts/gen-routes-doc.mjs` — regen bảng route (đóng P2-9 phần hash).
2. `App.tsx:2089` "phí ship" → "phí vận chuyển" (1 chuỗi).
3. `/order-success` không id ⇒ `<Navigate to="/tracking" replace/>` (1 dòng route).
4. Ẩn CTA `/admin/pricing` khi `role !== 'admin'` (`QuoteSummaryPanel` đã có `useAuth` `:155`).
5. `/orders`: thêm 1 effect nạp `dbService.getOrders()` khi đã đăng nhập — RLS `vcube_orders_owner_read` tự lọc theo `auth.uid()`/email, không cần tham số — mở khoá P0-1.
6. Bỏ `navigate(path)` trùng trong `UserAvatarMenu.handleNavigateRoute`.
7. `/explore`: `setSearchParams` theo `selectedCategory/search/tag` (3 effect hiện có đã đủ chỗ).
8. Gate `/lab`: đổi điều kiện thành `verifiedStatus !== 'Verified'` ⇒ onboarding.

---

## 5. Đếm & kết luận ngắn

| Chỉ số | Giá trị |
|---|---|
| Route | **30** = 23 màn thật (22 page + 404) + **7 redirect** |
| View module | **16** (14.330 LOC); lazy **5**, eager **12** view |
| Tổng `src/` đã đọc | `App.tsx` 2.152 · views 14.330 · components 30.284 · ui 4.930 |
| Workflow | **2 REAL** (auth lõi, catalog) · **10 PARTIAL** · **1 DEAD** (assets) |
| Sub-surface chết | 10 (reviews, warranty, promo, cart_items, order_items, payment_transactions, quotes, order_files, payout ledger, dispatch) + orders realtime (client) |
| Trang có đủ 4 state (L/E/Er/S) | **13/23 path** = 9 màn: `/`, `/explore`, `/quote`, `/cart`, `/checkout`, `/tracking`, `/designer`, `/admin`, `/lab` |
| Trang **thiếu** error state | `/orders`, `/assets` (chỉ toast), `/personalize`, `/order-success*` |
| Dead EN | **1.179** nhánh `isVi ?` toàn repo (401 trong views) |
| Bundle preload | ≈ **1,63 MiB JS** + 88 KiB CSS |
| Docs lệch code | 6 mục đáng sửa (§3.6), trong đó 1 mục P1 (`/orders` data source) |

**Kết luận:** bề mặt UI v3 đã đạt mức "surface done" (QA: 0 P0 UI), nhưng **tầng trang–dữ liệu** còn
2 lỗ hổng P0 (lịch sử đơn của khách; giao tệp số) và 7 P1 nối dây. Ưu tiên tuyệt đối là **nối dữ liệu
cho `/orders`** và **hoàn tất chuỗi `order_files` → `/assets`** trước khi coi storefront là
production-ready; các mục còn lại là refactor/bundle và đồng bộ docs.

*Hết. Không sửa `src/**`, không commit.*
