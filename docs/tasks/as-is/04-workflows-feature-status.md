<!-- doc-meta: status=active; verified=2026-10-19; owner=thanh -->
# AS-IS 04 — Workflow end-to-end + Trạng thái tính năng

## 1. Auth

- **Vào**: Header → `AuthModal` (4 mode: signin/signup/account/forgot); hoặc `/auth/login`, `/auth/register` (alias `/login`, `/register`).
- **Đăng nhập**: form → `signInWithEmail` → session Supabase → `resolveDbRole` đọc `user_profiles.role` (fail-closed → `customer`) → App nạp lại catalog theo role → redirect `redirectTo` hoặc `/`.
- **Đăng ký**: chọn loại tài khoản (customer/designer) → `signUpWithEmail` → trigger `fn_create_profile_for_new_user` (chỉ `designer` → designer, còn lại customer) → có session → redirect; không → hiện "kiểm tra email".
- **Thật**: email/password + logout + role từ DB.
- **Gated (code có, cờ tắt)**: Google OAuth (`ENABLE_GOOGLE_OAUTH=false` trong `AuthModal.tsx`), password reset (`ENABLE_PASSWORD_RESET=false`).
- **Khác**: `switchDemoRole` chỉ DEV. Nâng role chỉ qua admin (`designerService.promoteUserToDesigner`).

## 2. Duyệt catalog (Home / Explore)

- **Nguồn**: prop `products` từ `App.tsx`; `loadProducts()` → `dbService.getProducts()` (RLS), không seed fixture; `productsLoading/productsError/onRetry`.
- **Realtime**: `App.tsx` subscribe `public:products` (`postgres_changes`) → thêm/sửa/xoá trong state (dùng chung mapper với fetch).
- **Bước**: render lưới → filter client-side (category/tag/price) → `onSelectProduct` → PDP.
- **Honesty**: rating/reviews chỉ hiện khi `rating>0 && reviewsCount>0`; ngược lại "Chưa có đánh giá". `CATEGORIES`/`POPULAR_TAGS` tĩnh.

## 3. PDP & mua

- **Vào**: `/products/:productId` → `ProductDetailView`. Tabs `desc|specs|reviews|slicing`.
- **Tab Reviews**: chỉ đọc `products.reviews_count` + `EmptyState` "chưa có đánh giá thật" — **không truy vấn bảng `reviews`**.
- **Mua**: `useCartStore.addToCart` (line vật lý và/hoặc license số) → drawer/checkout.
- **Dead end**: `reviews` luôn hiển thị 0 dù có hàng và trigger đã cập nhật `products.rating`.

## 4. `/quote` — phân tích 3D + báo giá

- **Vào**: `/quote` → `Tool3DView` (`/tool-3d` redirect).
- **Bước**: chọn/kéo file → check cấu trúc → `parse3DFile` (STL/3MF/OBJ; STEP/IGES qua WASM worker) → score/overhang/sha256 → `ModelViewer3D` + `QuoteSummaryPanel` → `onAddToCart` hoặc `onDirectOrder` (add + sang checkout).
- **Thật**: parse, QA mesh, transform, công thức giá **chạy client** (`pricingEngine.ts`), KHÔNG có Edge Function.
- **Rỗng có chủ đích**: `SAMPLE_ANALYSIS_FILES = []` ⇒ empty state thật; không fixture printer/material; engine ném `PricingUnavailableError` nêu tham số thiếu khi `materials`/`printer_fleet` rỗng.
- **Dead end**: "Gửi yêu cầu thẩm định thủ công" chỉ hiện note tĩnh, không gửi đi đâu.

## 5. Personalize

- **Vào**: `/personalize` (`PersonalizeRoute`; có/không `:productId`).
- **Bước**: chọn model → text/tham số → preview → add to cart.
- **Thật**: UI + cart. **Dead end**: không lưu spec ngoài line cart; không job server.

## 6. Giỏ hàng

- **State**: `useCartStore` (Zustand `persist`, key `vcube_cart_store`); giữ `appliedDiscount`/`appliedPromoCode`.
- **Thật**: giỏ local + `mergeGuestCart`.
- **Dead end/honesty**: **`cart_items` tồn tại nhưng giỏ KHÔNG persist server-side**; promo code luôn bị từ chối (không có bảng voucher).

## 7. Checkout

- **Vào**: `/checkout` → `CheckoutView` (832 LOC).
- **Bước**: validate địa chỉ → chọn payment (VietQR dùng bank từ `app_settings`; VNPAY chỉ ghi method; COD chỉ đơn vật lý) → VAT (`lib/vat.ts`) → `orderService.createOrder` → `dbService.saveOrder` (upsert `orders` với `items` jsonb) → (đường webhook) `payment_transactions` → sang OrderSuccess.
- **Guest**: token `sec_<ts>_<random>` sinh **phía client** (không phải CSPRNG).
- **Thật**: ghi `orders`, VAT, ship.
- **Chưa nối**:
  - **`order_items` KHÔNG được ghi** → mô hình chia 3 bên (xưởng/designer/platform) không persist; `orders.platform_fee_amount`… không có dòng nguồn.
  - `recordPaymentTransaction` **0 caller** ⇒ `payment_transactions` rỗng.
  - `quotes` ghi nhưng **không UI nào đọc**.
  - Thanh toán không tự mark paid (`awaiting_payment`/`cod` tới khi operator đổi).
- **Dead end**: VNPAY không có redirect gateway; VietQR chỉ hướng dẫn.

## 8. Order success / tracking / my orders / asset library

- **Success**: `/order-success` — hiện đơn + token.
- **Tracking**: `/tracking` — tra guest qua RPC `get_order_by_guest_token(order_number, token|phone)` (`dbService.getOrderByToken`); pipeline 8 stage (`OrderProgress`/`MES_PIPELINE_STAGES`); **không telemetry** (layer chỉ khi xưởng ghi `orders.layer_progress`).
- **My orders**: `/orders` — `dbService.getOrders()`; modal bảo hành **không persist** ("Chưa gửi được yêu cầu").
- **Asset library**: `/assets` — guard `canDownload`; **`order_files` không bao giờ được ghi** và `DigitalAsset.storagePath` luôn undefined ⇒ `canDownload` luôn false; view nói thẳng cần `order_files`. `assetService.createSignedUrl` (60s, bucket `cad-files`) không có dữ liệu để ký.
- **Dead end**: không tải được file; bảo hành không lưu; mua file số không nhận được file.

## 9. Designer Studio

- **Vào**: `/designer/:tab` — 5 tab `overview|models|wizard|payouts|requests`.
- `models` → sửa/xoá sản phẩm → `dbService.saveProduct/deleteProduct` (qua handler App).
- `wizard` → `onAddNewProduct` → `dbService.saveProduct`; status `'Under Review'`; royalty đọc `pricing_configs.designerRoyaltyPercent` (`null` ⇒ `—`).
- `requests` → `customDesignService`: board (hàng mình + pool qua view `open_design_requests`), `claim_design_request` (RPC), `sendQuote`, subscribe `public:custom_design_requests`.
- `payouts` → `PAYOUT_TRANSACTIONS = []` (mockData); balance `—`; nút rút **disabled** ("chưa liên kết tài khoản"). **Không có payout ledger.**
- **Dead end**: payout hoàn toàn inert; realtime pool mới cần polling (ghi chú trong service).

## 10. Workshop `/lab` (MES)

- **Vào**: `/lab/:tab` → `LabRoute`: chưa có `workshop_profiles` hoặc `Pending` ⇒ `WorkshopOnboardingWizard`; đã duyệt ⇒ `WorkshopSettingsView`. Tabs `queue|machines|materials|accessories|audit_trail|preferences` (phải khớp `LAB_NAV`).
- **Service**: `workshopService.getMy*`/`saveMy*` scope `auth.uid()`→`partner_id`, không seed/localStorage.
  - Queue: `getMyQueueOrders(partnerId)` lọc `orders.assigned_workshop_id = partner_id`; `updateMyOrderProgress` ghi `status_stage_index/status/layer_progress`; khi `completed` best-effort trừ tồn.
  - Machines/materials/accessories/inventory log: CRUD thật.
- **Dead end nghiêm trọng**: **`orders.assigned_workshop_id` không có đường ghi nào** (dispatcher admin không ghi) ⇒ queue thật luôn rỗng trừ khi sửa SQL tay. Xưởng không thể tự nhận đơn.
- Nhóm `getWorkshop*` (legacy) còn fallback `SEED_*`/localStorage → rủi ro honesty ở admin panel.

## 11. Admin ForgeControl

- **Vào**: `/admin/:section` → `AdminDashboardView` lazy 11 panel.
- `orders` nạp 1 lần qua `dbService.getOrders()` khi role admin; **không subscribe realtime** dù server đã có trigger + policy.
- Panel chính: Group0 overview · Group1 workshops/fleet/materials/partners · Group2 designers (royalty/verified, `loadPayoutInfo` RPC; tab withdrawal **rỗng** — không có bảng request) · Group3 customers/KYC/NDA (+ `designerService.promoteUserToDesigner`) · Group4 pricing (passthrough) · Group5 production kanban (nút **dispatch đã gỡ** vì không có write path) · AdminProductsPanel (CRUD) · AdminStorefrontPanel · AdminSeoPanel · AdminSettingsPanel · WarehouseInventoryPanel.
- **Dead end**: dispatch assignment, payout approval/ledger, financial split theo dòng — đều không hoạt động.

## 12. Settings / Realtime

- **Settings**: `settingsService` — 4 store (`site_content`, `app_settings`, `pricing_global_settings`, `pricing_configs`) + `setting_audit`; 1 kênh `vcube:settings`; cache + `settingsAccessors`; validate; `bootstrapSettings` ở `main.tsx` (không await).
- **Kênh client**: `public:products` · `vcube:settings` · `public:custom_design_requests`.
- **Orders realtime**: server có (`orders_broadcast_status` + policy `orders_admin_realtime`) nhưng **không client nào subscribe** ⇒ tracking/kanban chỉ cập nhật khi load lại.

---

## 13. Ma trận trạng thái tính năng

| Tính năng | Schema | Service | UI | Prod-ready |
|---|---|---|---|---|
| Auth email/password + register + role | ✅ | AuthContext | ✅ | ✅ |
| Google OAuth | n/a | có | cờ tắt | ❌ |
| Password reset | n/a | có | cờ tắt | ❌ |
| Catalog read + realtime | ✅ | `dbService.getProducts` | ✅ | ✅ |
| Product CRUD (admin/designer) | ✅ | `dbService.save/deleteProduct` | ✅ | ✅ |
| PDP reviews (hiển thị) | `reviews` ✅ | **không ai đọc** | chỉ counter | ❌ |
| `/quote` phân tích + giá | ✅ | pricingEngine (client) | ✅ | ⚠️ một phần |
| Cart | `cart_items` ✅ | **không** | Zustand localStorage | ❌ |
| Checkout / tạo đơn | ✅ | `orderService`/`saveOrder` | ✅ | ⚠️ một phần |
| `order_items` (chia 3 bên) | ✅ | **không** | ❌ | ❌ |
| Payment (VNPAY) | `payment_transactions` | `recordPaymentTransaction` (0 caller) | chỉ ghi method | ❌ |
| Order success/tracking (guest) | ✅ + RPC | `getOrderByToken` | ✅ | ✅ |
| Tracking realtime | ✅ + broadcast | chỉ trigger server | ❌ | ❌ |
| Tải file CAD số | `order_files`+`digital_assets` ✅ | `assetService` (không có data) | `canDownload` luôn false | ❌ |
| `digital_assets` khách đọc | ✅ | **không** | ❌ | ❌ |
| Bảo hành | `warranty_claims` ✅ | **không** | modal không lưu | ❌ |
| Reviews (ghi + tổng hợp) | ✅ + trigger | **không** | ❌ | ❌ |
| Designer upload sản phẩm | ✅ | `dbService.saveProduct` | ✅ (`Under Review`) | ⚠️ một phần |
| Custom design request | ✅ + view + RPC | `customDesignService` | ✅ | ✅ |
| Designer payout ledger | `designer_payout_info` (chỉ bank info) | `loadPayoutInfo` RPC | tab rỗng, nút disabled | ❌ |
| Workshop machines/materials/inventory | ✅ | `workshopService` | ✅ | ✅ |
| Workshop order queue | `orders.assigned_workshop_id` | `getMyQueueOrders` | ✅ | ❌ (không có write path) |
| Admin dispatcher assignment | ✅ | **không** | nút đã gỡ | ❌ |
| KYC/NDA review | ✅ | admin panel | ✅ | ✅ |
| Pricing config | ✅ | `settingsService` | ✅ | ✅ |
| Edge Function `calculate-quote` | — | — | — | ❌ (client-side) |
| Orders realtime | ✅ | — | ❌ | ❌ |

## 14. Khoảng trống lớn nhất (thứ tự ưu tiên)

1. **`order_items` không được ghi** — mô hình chia 3 bên mất dòng nguồn.
2. **`order_files` không được ghi → giao file số bất khả thi** (`canDownload` luôn false).
3. **`digital_assets` không có đường đọc cho khách**.
4. **`orders.assigned_workshop_id` không có write path** → queue xưởng + dispatch admin chết.
5. **`warranty_claims` không persist**.
6. **Không có payout ledger / luồng rút tiền**.
7. **`reviews` không đọc/không ghi**.
8. **Không có Edge Function `calculate-quote`** (giá chạy client).
9. **Orders realtime chưa dùng ở client**.
10. **Cart chỉ localStorage** dù `cart_items` có.
11. **Payment inert**.
12. **Auth extras bị gated** (Google/reset).
