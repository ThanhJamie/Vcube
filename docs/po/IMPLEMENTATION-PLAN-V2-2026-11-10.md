<!-- doc-meta: status=active; verified=2026-11-10; owner=lead -->
# VCUBE — Implementation Plan v2 (2026-11-10)

> **Vai trò:** Technical Lead + Product Engineer.
> **Phạm vi:** review hiện trạng + thiết kế phương án + backlog đủ nhỏ để coding sau khi duyệt.
> **Không sửa code trong tài liệu này.** Mọi kết luận dưới đây đã đối chiếu code, DB live,
> migrations, tests và app đang chạy (`http://localhost:3000`, 1440×900 + 390×844).
> **Định hướng:** UI đang được hoàn thiện; một phần dữ liệu mẫu được giữ có chủ đích.
> Vì vậy **không** đặt “nhập dữ liệu thật” lên đầu một cách máy móc. Thứ tự ưu tiên là:
> **UI/UX leak → dead code/security hygiene → verification harness → publish readiness →
> real data integration → transaction durability → workshop/settlement → scale**.

---

## 0. Executive summary

### 0.1 Dự án đang ở đâu

VCUBE hiện có **lớp trình diễn và công cụ rất tốt**, nhưng **lớp vận hành thương mại vẫn là demo**:

- **UI/UX:** 17 view, 23 UI primitive, 104 component; Home/Explore/PDP/Quote/Cart/Checkout/
  Tracking/Login/Register/404 chạy ổn; 0 `pageerror`, 0 tràn ngang 390/1440; VI-only.
- **Console:** Admin 23 section, Designer 5 tab, Lab 7 tab; nhiều luồng đã nối DB thật
  (dispatch, warranty, payout info, audit log, order_items, digital delivery RPC).
- **Dữ liệu:** **0 sản phẩm published**, **0 ảnh sản phẩm**, **`app_settings` trống**,
  10/10 product, 7/8 materials, 6/7 printers, 5/5 accessories, 6/6 orders, 2/3 designers là `[MẪU]`.
  `payment_transactions` = 0, `order_files` = 0, `reviews` = 0, `warranty_claims` = 0.
- **Kỹ thuật:** `tsc` PASS, 23/23 gate, 140 unit test, 11 test file; 1 E2E script
  (`scripts/e2e/guest-order-flow.ts`) **chưa nằm trong CI**; RLS 96 policy; 33 bảng public
  (32 theo migration + 1 bảng backup PII ngoài migration).

### 0.2 Nút thắt thực sự

**Không phải thiếu feature.** Nút thắt là:

1. **Vài UX leak làm sản phẩm trông “dở dang”** (link `/admin` cho guest, mất `redirectTo`,
   CTA quote nói “đặt hàng” nhưng chỉ thêm giỏ, `/personalize` 404).
2. **Dead code & security hygiene**: `AuthModal` 913 LOC không mở được; bảng backup
   `_bak_designer_profiles_20260924` chứa bank/tax PII ngoài migration. **Đã kiểm tra truy cập
   thực tế:** anon/authenticated đọc **0 hàng** (RLS bật + 0 policy = default deny), service_role
   đọc được (đúng vai trò server); đây là **PII at rest/schema drift**, **không phải active leak**
   qua PostgREST. Vẫn nên dọn theo runbook.
3. **Thiếu verification harness**: chưa có E2E tiền/đơn trong CI; nhiều luồng “có code + DB”
   nhưng chưa được chứng minh end-to-end.
4. **Publish readiness chưa có guard**: admin có thể publish sản phẩm thiếu ảnh/giá/license;
   counter review/print demo vẫn còn.
5. **Sau khi UI chốt**: data thật + `app_settings` + payment + invoice + payout ledger +
   review photos + SLA/settlement mới là các tầng tiếp theo.

### 0.3 Nguyên tắc thực thi

- **Không restyle toàn bộ.** Design system v3 đã tốt; chỉ sửa luồng cụ thể.
- **Không thêm dependency** nếu có thể dùng stack hiện tại (Supabase RPC/Storage/Realtime + Vite).
- **Không publish dữ liệu giả** để “cho đầy”; dữ liệu mẫu được giữ có chủ đích đến phase integration.
- **Mỗi item phải có acceptance + test + dependency**; không gộp tất cả vào một “go-live sprint”.
- **Không khẳng định chạy thật chỉ vì có UI/service/bảng.** Trạng thái phải là một trong:
  `✅ verified` · `🟡 wired-not-e2e` · `🟠 UI/demo-only` · `🔴 missing` · `⚪ n/a`.

---

## 1. Xác minh hiện trạng

### 1.1 Route / page inventory

Nguồn: `src/frontend/routes/AppRoutes.tsx` + `docs/pages/_routes.generated.md`.

**32 route entry = 23 màn thật + 8 redirect + 1 fallback 404.**

| Nhóm | Route | Guard | Trạng thái |
|---|---|---|---|
| Storefront | `/` | — | ✅ verified (Home + 3D hero) |
| Storefront | `/explore` | — | ✅ UI; catalog rỗng do data |
| Storefront | `/products/:productId` | — | 🟡 code đủ; chưa verify với published product (0 published) |
| Storefront | `/personalize`, `/personalize/:productId` | — | 🟠 **404 khi catalog rỗng** |
| Quote | `/quote` | — | ✅ verified upload STL → parse → price → cart |
| Cart | `/cart` | — | ✅ verified empty + có item |
| Checkout | `/checkout` | — | ✅ form verified; payment config thiếu |
| Order | `/order-success`, `/order-success/:orderId` | — | 🟡 đọc DB/session; chưa E2E tạo đơn |
| Tracking | `/tracking`, `/tracking/:orderId` | — | ✅ verified guest token với DEMO-O01 |
| Customer | `/orders` | Protected | ✅ verified với QA order |
| Customer | `/assets` | Protected | 🟡 RPC delivery có; chưa có order_files thật |
| Customer | `/account` | Protected | ✅ UI/code profile/password/claim |
| Designer | `/designer`, `/designer/:tab` | designer/admin | ✅ 5 tab verified |
| Admin | `/admin`, `/admin/:section` | admin | ✅ 23 section verified |
| Lab | `/lab`, `/lab/:tab` | lab/workshop/admin | ✅ 7 tab verified |
| Auth | `/auth/login`, `/auth/register` | — | ✅ routes; Google/reset tắt |
| 404 | `*` | — | ✅ |

**Redirect:** `/tool-3d`→`/quote`, `/my-orders`→`/orders`, `/library`→`/assets`,
`/profile`→`/account`, `/creator` + `/creator/*`→`/designer`, `/login`→`/auth/login`,
`/register`→`/auth/register`.

### 1.2 Feature matrix theo persona

#### Storefront / guest

| Tính năng | Trạng thái | Bằng chứng |
|---|---|---|
| Home hero + 3D switcher | ✅ | `/`; 0 lỗi 1440/390 |
| Explore filter/sort/search URL | ✅ code | `ExploreView.tsx` dùng `setSearchParams`; catalog rỗng |
| PDP 3D, giá, cấu hình, review tab | 🟡 | code đủ; 0 published product để verify live |
| Personalize | 🟠 | `/personalize` trả 404 khi không có product published |
| Quote upload/parse/price | ✅ | upload `cube20.stl`: 8.0 cm³, 12 tam giác, add-to-cart OK |
| Cart | ✅ | empty state + item từ quote |
| Checkout guest | ✅ UI | form, VAT 8%, ship 30.000, 3 payment method |
| Payment bank info | 🟠 | `app_settings` null → “Chưa cấu hình thông tin chuyển khoản” |
| Guest tracking | ✅ | `DEMO-ORD-0001` + token → 8-stage timeline |
| Login/Register | ✅ | routes; OAuth/reset tắt cờ |
| 404/guard | ✅ | redirect đúng; `ProtectedRoute` mất `redirectTo` (P1) |

#### Customer

| Tính năng | Trạng thái | Bằng chứng |
|---|---|---|
| Lịch sử đơn | ✅ | `useOrdersData` fetch mọi user đăng nhập; verified QA order |
| Chi tiết đơn + invoice | 🟡 | `InvoiceModal` đọc DB; số HĐ tự sinh, chưa persist |
| Tải file số | 🟡 | RPC `finalize_digital_delivery`/`get_my_order_files` tồn tại; `order_files` = 0 |
| Review text | 🟡 | service + PDP write; chưa có completed order thật |
| Review photos | 🔴 | schema `reviews.photos`; chưa upload/hiển thị |
| Bảo hành | ✅ | verified customer create + lab update (QA, đã xoá) |
| Account/profile/password/claim guest | ✅ UI/code | `AccountView` |
| Reorder | 🟠 | `reorderItems` không được `Tool3DView` đọc |
| Notification in-app | ✅ | realtime `orders:me`; email 🔴 |
| Support | 🟠 | chat auto-reply, không ticket |

#### Designer

| Tính năng | Trạng thái | Bằng chứng |
|---|---|---|
| Upload wizard + product CRUD | ✅ code | `DesignerUploadWizardTab`, `DesignerModelsManagerTab` |
| Trạng thái draft/under review | ✅ | `productStatus.ts`; admin publish |
| Request CAD + chat + claim | ✅ code | `DesignerRequestsTab`, `customDesignService` |
| Payout info bank/tax | ✅ | verified save/reload/mask |
| Earnings ledger/payout request | 🔴 | `order_items` RLS chỉ chủ đơn/admin; chưa có RPC/view |
| License/royalty config | 🟠 | license field; royalty do admin, chưa ledger |
| Storefront công khai | 🔴 | — |

#### Lab / workshop

| Tính năng | Trạng thái | Bằng chứng |
|---|---|---|
| Onboarding/profile | ✅ code | `WorkshopOnboardingWizard`; 1 profile `partner_id` null |
| Queue + dispatch | ✅ | verified admin assign → lab sees order |
| Machines/materials/accessories/inventory | ✅ | CRUD + log thật theo `partner_id` |
| Progress 8 stage | ✅ | `updateMyOrderProgress` |
| Warranty | ✅ | tab mới verified |
| Accept/decline + SLA/deadline | 🔴 | chỉ cập nhật stage |
| QC checklist + ảnh | 🔴 | — |
| Settlement kỳ | 🔴 | snapshot trong order_items; chưa bảng/UI |
| Reports | 🔴 | — |

#### Admin

| Tính năng | Trạng thái | Bằng chứng |
|---|---|---|
| Overview | ✅ | counters, cảnh báo; data demo |
| Products/catalog CRUD | ✅ | 23 section; publish chưa có readiness guard |
| Pricing/materials/printers/accessories | ✅ | settings + full fields |
| Workshops/designers/KYC | ✅ | panels + stores |
| Orders/dispatch | ✅ | `assignOrderWorkshop` verified |
| Inventory | ✅ | warehouse panel |
| Storefront/SEO | ✅ code | SEO files sai domain/demo URLs |
| Settings | ✅ form | `app_settings` live rỗng |
| Audit log | ✅ | `/admin/audit-log` verified; chỉ `setting_audit` |
| Feature flags | 🔴 | chỉ env `VITE_ATOMIC_ORDER` |
| Reports/cohorts/CSV | 🟠 | overview cơ bản |
| Support tickets | 🔴 | — |

### 1.3 Shared UI / design system / responsive

- **UI primitive:** 23 file trong `src/frontend/ui`; `Button`, `Card`, `DataTable`, `Modal`,
  `EmptyState`, `PageHeader`, `SideNav`, `Topbar`, `Field`, `Select`, `Input`, `Badge`, `Money`…
- **Design language:** v3 “Soft Studio”, light-only, Be Vietnam Pro + JetBrains Mono,
  CTA đen, coral chỉ brand mark; token trong `src/index.css` + `docs/design/tokens.md`.
- **Responsive:** verified 390/1440 cho public + 3 console; 0 tràn ngang. Mobile header có
  hamburger/search drawer; console dùng SideNav.
- **A11y:** contrast/UI-rules/icon gates xanh; focus ring có; `Modal` dùng `<dialog>`.
  Cần manual spot-check cho screen reader/focus trap ở form dài.
- **Icon:** mọi icon qua `<Icon name>` + `iconMap`; không lucide ngoài `ui/**`.
- **Motion:** CSS/Tailwind + `motion-reduce`; không dependency animation.

### 1.4 API / service / DB / RLS / integrations / flags / tests

| Hạng mục | Hiện trạng |
|---|---|
| Service | 27 file backend: order, settings, workshop façade + 14 module, review, delivery, asset, customDesign, designer… |
| DB live | **33 bảng public** (32 chuỗi migration + `_bak_designer_profiles_20260924`), **2 view**, **96 policy**, **7 storage policy**, **24 function** |
| RPC tiền/đơn | `create_order_atomic`, `confirm_payment_atomic`, `get_order_by_guest_token`, `claim_guest_order`, `finalize_digital_delivery`, `get_my_order_files` **đã có** |
| Integrations | `ManualPaymentProvider`, `ManualPayoutProvider`, `InAppNotificationProvider`, `SupabaseFileStorage`; TODO(FL-7) cho gateway/email/payout |
| Feature flags | chỉ `VITE_ATOMIC_ORDER` (env, mặc định off); **không có bảng flags** |
| Tests | 11 file unit / 140 test; `scripts/e2e/guest-order-flow.ts` có nhưng **chưa script npm/CI** |
| CI | offline gates + optional live Supabase gates; **không có E2E tiền** |
| Build | index 202 KB gzip + three 133 KB + supabase 58 KB + react 18 KB; Three hiệu dụng tải ngay trên Home |
| SEO | `robots.txt`/`sitemap.xml` đang `http://localhost:3000`; sitemap chứa demo product URLs 404 |
| Security | RLS phủ 96 policy; **bảng backup PII ngoài migration** (xem 3.3). Đã test: anon/authenticated 0 hàng, service_role đọc được; không phải active leak qua PostgREST. |

### 1.5 Luồng xuyên suốt — trạng thái thực

| Luồng | Trạng thái | Bằng chứng / giới hạn |
|---|---|---|
| Khám phá → PDP | 🟡 | UI/code đủ; **0 published product** nên không verify live |
| Quote → cart | ✅ | upload STL thật → 8.0 cm³ → add cart; dùng materials/printers demo |
| Cart → checkout | ✅ UI | form, VAT, ship, 3 payment method; bank info thiếu |
| Checkout → order → payment | 🟡 | order gateway + manual provider code; **chưa submit thật trong review**; app_settings trống |
| Order → dispatch → lab | ✅ | QA order assign → lab queue → stage update verified |
| Digital fulfilment | 🟡 | RPC có; `order_files` = 0; chưa E2E mua file |
| Tracking | ✅ | guest code+token verified |
| Post-purchase review | 🟡 | write service + PDP; 0 review; photos missing |
| Warranty | ✅ | customer create + lab update verified |
| Designer payout | 🟡/🔴 | info ✅; ledger/request 🔴 |
| Admin finance/audit | 🟡 | audit log settings ✅; settlement/reports 🔴 |

---

## 2. Review UI/UX theo page và luồng

### 2.1 Public / storefront

| Page | Persona/mục tiêu | Đánh giá | Vấn đề / đề xuất |
|---|---|---|---|
| `/` Home | Guest: hiểu sản phẩm, vào quote/explore | Ấn tượng tốt; hero 3D, CTA rõ; mobile CTA trên fold | **Bỏ link “Nhập ở /admin”** với guest; thay bằng copy trung tính. Giữ hero/3D. |
| `/explore` | Guest: tìm mẫu | Empty state tốt, 3 CTA; filter URL sync | Khi có data: kiểm card ảnh/placeholder, filter count; hiện tại rỗng là data, không phải UI. |
| `/products/:id` | Guest: quyết định mua | Code đủ PDP; không verify được vì 0 published | Cần publish 1 product thật để UAT; kiểm rating/review count chỉ hiện khi có review thật. |
| `/personalize` | Guest: tuỳ biến | **404 khi catalog rỗng** | Empty state + CTA quote/explore; không để 404. |
| `/quote` | Guest: upload → giá | Luồng thật, parse nhanh, 3D tốt; CTA chính gây nhầm | **Đổi label** “Thêm vào giỏ” (primary) và “Đặt in ngay” (secondary). Hiện primary nói “& đặt hàng” nhưng không navigate. |
| `/cart` | Guest/customer | Empty/có item rõ; VAT/ship minh bạch | Giữ; kiểm mobile sticky CTA. |
| `/checkout` | Guest/customer | Form đầy đủ; guest mode tốt; payment minh bạch | **Disable VNPAY** đến khi gateway; hiển thị readiness bank config; link admin chỉ cho admin. |
| `/tracking` | Guest | Verified token; timeline 8 bước; empty MES honest | Giữ; test mobile form. |
| `/auth/*` | Guest | Sạch, VI-only | Google/reset tắt cờ; quyết định bật hay bỏ; `AuthModal` chết cần xoá. |
| 404 | All | Rõ ràng | Giữ. |

### 2.2 Customer

| Page/flow | Đánh giá | Vấn đề |
|---|---|---|
| `/orders` | Filter/search/card; verified với order thật | `ProtectedRoute` mất `redirectTo`; reorder chưa hoạt động |
| `/assets` | Empty state honest; download code | Chưa có file thật để verify; cần E2E digital order |
| `/account` | Profile/billing/password/claim guest | Tốt; thiếu sổ địa chỉ nhiều nơi; legal links |
| Invoice | In từ DB + legal settings | Số HĐ tự sinh, không persist; cần invoice number server |
| Warranty | Form + status + lab xử lý | Tốt; cần policy siết order ownership (RLS) |
| Reviews | Text + rating; photos missing | Cần upload/duyệt ảnh; chỉ hiện rating khi có review thật |
| Notifications | In-app realtime | Cần email opt-in |

### 2.3 Designer

| Page | Đánh giá | Vấn đề |
|---|---|---|
| Overview | Doanh thu/requests hạn chế | Cần ledger/doanh thu thật; trạng thái duyệt KYC |
| Models | CRUD/status tốt | Lý do từ chối, duplicate, readiness trước publish |
| Wizard | Upload/giá/license rõ | Cần validate file/ảnh/price; preview |
| Requests | Claim/chat thật | Cần SLA/deadline, thông báo |
| Payouts | Info bank/tax đã nối | Ledger/rút tiền/trạng thái payout còn thiếu |

### 2.4 Lab

| Page | Đánh giá | Vấn đề |
|---|---|---|
| Queue | Verified dispatch; stage update | Thiếu accept/decline, deadline/SLA, priority |
| Machines/Materials/Accessories | CRUD thật; empty state tốt | Auto stock deduct; capacity calendar |
| Warranty | Verified; đúng đơn được giao | Siết RLS staff read theo workshop |
| Audit trail | Inventory log rõ | Chưa có settlement/finance |
| Preferences | Rate/address config | 1.8s first load; prefetch |

### 2.5 Admin

| Page | Đánh giá | Vấn đề |
|---|---|---|
| Overview | Đẹp, counters; cảnh báo demo | Cần “hôm nay cần làm gì” / Ops Inbox; data demo |
| Products | CRUD/status; 23 section | **Publish readiness guard**; bulk; rejection reason |
| Orders/Dispatch | Detail + assign verified | Refund/cancel/notes/SLA |
| Pricing/Catalog | Full fields | Bulk import UI; version giá |
| Workshops/Designers/KYC | Panels thật | Payout approval/settlement |
| Inventory | Real CRUD | Low stock alerts |
| Storefront/SEO | Editor + SEO panel | SEO files sai; publish schedule |
| Settings | Form đủ trường | Live data rỗng; readiness checklist |
| Audit log | Verified filter/modal | Chỉ setting_audit; cần order/product/payment audit |

### 2.6 Cross-page UX

- **Navigation:** URL là nguồn sự thật; dashboard tabs keep-alive; state filter giữ.
- **Consistency:** design system tốt; hai bề mặt auth (routes + AuthModal chết) gây lệch.
- **Error/empty/loading:** đa số tốt; cần audit các trang data-heavy (admin/lab) khi DB lỗi.
- **Mobile:** 0 tràn; một số header truncate (“Xưởng thiết kế …”) chấp nhận được.
- **SEO:** public pages có SEOHead; nhưng sitemap/robots sai domain + demo URLs.
- **Performance:** 3D/Three nặng; Home tải Three sớm; lazy routes tốt; cần đo LCP sau data.

---

## 3. Đối chiếu bản review cũ (2026-10-23)

### 3.1 Nhận định còn đúng

| Nhận định cũ | Trạng thái hiện tại |
|---|---|
| Payment thủ công, chưa gateway | ✅ còn đúng; VNPAY chưa kết nối |
| Invoice chưa bền | ✅ còn đúng; số HĐ tự sinh |
| Designer payout ledger thiếu | ✅ còn đúng; info đã nối nhưng ledger chưa |
| Review photos thiếu | ✅ còn đúng |
| SLA/QC/settlement thiếu | ✅ còn đúng |
| Public admin/copy nội bộ | ✅ còn đúng (Home/Quote/PDP) |
| `ProtectedRoute` mất `redirectTo` | ✅ còn đúng |
| God files / nợ kiến trúc | ✅ còn đúng (21 file >800 dòng) |
| Reorder payload không có consumer | ✅ còn đúng |
| `/personalize` lỗi khi catalog rỗng | ✅ còn đúng (404) |
| SEO files localhost/demo | ✅ còn đúng |
| Demo counters rating/review/print | ✅ còn đúng |

### 3.2 Nhận định đã lỗi thời / thiếu bằng chứng

| Nhận định cũ | Thực tế hiện tại |
|---|---|
| Khách không thấy đơn ở `/orders` | ❌ đã sửa: fetch mọi user đăng nhập; verified |
| Mua file số không nhận được file | ⚠️ một phần: RPC `finalize_digital_delivery`/`get_my_order_files` đã có; chưa E2E |
| Dispatch không có write path | ❌ đã sửa: `assignOrderWorkshop` + admin UI; verified |
| Warranty UI-only | ❌ đã sửa: service + customer/lab UI; verified |
| Review không có service ghi | ❌ đã sửa: `reviewService.submitProductReview` + PDP form |
| Payout info UI chưa nối RPC | ❌ đã sửa: verified save/reload/mask |
| Filter không vào URL | ❌ đã sửa: `setSearchParams` |
| Không có trang `/account` | ❌ đã sửa: `AccountView` |
| Không có unit test runner | ❌ đã sửa: 11 file/140 test |
| Banner `[MẪU]` lặp + CTA Tag 2/9 | ❌ không còn thấy trong runtime hiện tại |
| Chỉ 30 route | ❌ hiện 32 route (thêm audit-log + alias) |

### 3.3 Vấn đề mới phát hiện

| # | Vấn đề | Bằng chứng |
|---:|---|---|
| N1 | **Bảng backup chứa PII ngoài migration** | `_bak_designer_profiles_20260924`: 2 hàng, có `bank_name/bank_account/tax_id`, RLS bật nhưng **0 policy**; grants full cho anon/authenticated. **Test thực tế:** PostgREST anon `200 []`; SQL role anon/authenticated `0` hàng; service_role `2` hàng; không code/RPC nào đọc bảng. Kết luận: **PII at rest + schema drift, không phải active leak**; dọn theo `docs/runbooks/OWNER-ACTIONS-2026-09-24.md`. |
| N2 | **Quote CTA chính gây nhầm** | “Thêm vào giỏ & đặt hàng” chỉ add cart, không navigate; “Đặt in ngay” mới sang checkout |
| N3 | **`app_settings` live rỗng** | bank/legal/invoice fields NULL → checkout không có thông tin chuyển khoản |
| N4 | **Product publish không có readiness guard** | Admin có thể set Published khi 0 ảnh/giá/license |
| N5 | **SEO sitemap chứa demo product URLs 404** | `sitemap.xml` có `/products/DEMO-P01…` |
| N6 | **`AuthModal` 913 LOC chết** | `onOpenAuth` không dùng; `openAuthModal` chỉ gọi từ App nhưng Header không gọi |
| N7 | **E2E script chưa vào CI** | `scripts/e2e/guest-order-flow.ts` không có npm script/CI step |
| N8 | **RLS storage 7 policy** | Thiếu policy cho ảnh review; docs kỳ vọng 8 |

### 3.4 Không thể xác minh trong review này

- Mua file số end-to-end (cần order paid + `order_files` + storage file thật).
- Payment gateway/refund (chưa có provider/secret).
- Email transactional (chưa có provider).
- Payout ledger/settlement (chưa có bảng/RPC).
- SLA/QC ảnh (chưa có schema/UI).
- LCP/CLS mới sau data thật (chưa đo lại; dùng PO performance 15/15).
- Hành vi screen reader/focus trap trên toàn bộ form dài (mới spot-check).

---

## 4. Quyết định thiết kế/kiến trúc quan trọng

### 4.1 Auth: xoá `AuthModal` hay giữ?

| Phương án | Ưu | Nhược | Kết luận |
|---|---|---|---|
| A. Xoá `AuthModal` + `onOpenAuth` + UI store auth-modal; giữ Login/Register routes | Giảm 913 LOC + DOM/bundle; một nguồn auth; route deep-link tốt | Phải chuyển `ENABLE_GOOGLE_OAUTH`/`ENABLE_PASSWORD_RESET` sang config nhỏ | **Khuyến nghị** |
| B. Giữ modal, bỏ route Login/Register | Modal nhanh hơn | Mất deep-link/SEO; modal khó test; duplicate | Không |
| C. Giữ cả hai | Không phá gì | Hai bề mặt lệch nhau, bundle thừa | Không |

**Tác động:** UI shell/Header/App; không DB. **Test:** tsc, build, click login/register từ header, deep-link `/orders` redirect.

### 4.2 Publish workflow: guard ở đâu?

| Phương án | Ưu | Nhược | Kết luận |
|---|---|---|---|
| A. Client/service validation trước khi set `published` | Nhanh, không migration; chặn UI | Direct API vẫn có thể bypass | **Làm ngay** |
| B. DB trigger/constraint cho `status='published'` yêu cầu ảnh/giá/license | Chặn cả API | Cần migration + backfill; khó rollback | Làm sau khi data sạch |
| C. Bảng `product_publications` + audit/approval | Audit tốt | Nặng, chưa cần | Phase sau |

**Khuyến nghị:** A trước (Phase 0/1), B khi vào data integration nếu cần chặn cứng.

### 4.3 Invoice: cột trên `orders` hay bảng `invoices`?

| Phương án | Ưu | Nhược | Kết luận |
|---|---|---|---|
| A. Thêm `orders.invoice_number`, `invoice_issued_at` | Đơn giản, 1-1 order; đọc nhanh | Khó mở rộng credit note/nhiều hoá đơn | **MVP khuyến nghị** |
| B. Bảng `invoices` (order_id, number, issued_at, pdf_path, status) | Mở rộng, audit, nhiều hoá đơn | Thêm join/service | Khi cần e-invoice/refund |
| C. Provider e-invoice ngoài | Chuẩn thuế | Phụ thuộc đối tác/secret | Phase sau |

**Khuyến nghị:** A cho MVP; thiết kế service `InvoiceService` để sau đổi sang B.

### 4.4 Designer earnings: RPC/view hay ledger table?

| Phương án | Ưu | Nhược | Kết luận |
|---|---|---|---|
| A. RPC security-definer `designer_earnings` aggregate từ `order_items` | Không duplicate; đọc realtime | Tính lại mỗi lần; phức tạp refund | **MVP** |
| B. Bảng ledger cập nhật khi paid/refund | Nhanh, audit | Cần trigger/job, đồng bộ | Khi settlement/refund |
| C. Admin report only | Nhanh | Designer không tự thấy | Không |

**Khuyến nghị:** A trước; B khi có settlement/refund.

### 4.5 Review photos: bucket nào?

| Phương án | Ưu | Nhược | Kết luận |
|---|---|---|---|
| A. Dùng `product-images` với path `reviews/<uid>/…` | Ít bucket | Policy trộn product/admin; khó phân quyền | Không |
| B. Bucket `review-images` public read, owner write, admin all | Tách biệt, RLS rõ | Thêm bucket/policy | **Khuyến nghị** |
| C. CDN ngoài | Tốt scale | Dependency/secret | Phase sau |

### 4.6 Feature flags: env hay bảng?

| Phương án | Ưu | Nhược | Kết luận |
|---|---|---|---|
| A. Bảng `feature_flags` + hook cache | Rollout/tắt bật không deploy | Migration + admin UI | **Khuyến nghị** |
| B. Env only (hiện tại) | Đơn giản | Phải rebuild/deploy; không per-user | Giữ cho dev |
| C. Third-party | Nhanh | Dependency/secret | Không |

### 4.7 SEO: build-time hay runtime?

- **Build-time** (`scripts/gen-seo-files.mjs`) là phù hợp SPA hiện tại; cần `VITE_SITE_URL` production,
  chỉ published products, bỏ `/personalize`, `/order-success`; thêm CI check cấm `localhost`.
- Runtime SSR/prerender là quyết định lớn hơn (Vercel/Next) — **không cần bây giờ**.

### 4.8 E2E: mở rộng script hiện có hay thêm Playwright?

- **Mở rộng `scripts/e2e/guest-order-flow.ts`** (tsx + Supabase) cho money/DB flows; không thêm dependency.
- Browser UAT (390/1440) tiếp tục manual/agent; nếu muốn CI browser, cần quyết định thêm Playwright
  (dependency + CI browser) — để phase sau.

---

## 5. FIRST ITEMS — NÊN LÀM TRƯỚC (10–15)

> Thứ tự mới: **xác minh SEC-01 → sửa UX-01…UX-06 → dựng QA harness trên staging + chuẩn bị
> dữ liệu/cấu hình song song → publish guard → kiểm thử giao dịch → publish catalog thật.**
> Không đưa “nhập dữ liệu thật” lên đầu; không coi dry-run là bằng chứng vòng tiền.
> **ARCH-01 (feature flags) đã được đưa ra khỏi FIRST ITEMS** — xem §5.3.

### 5.1 Bảng 15 việc đầu

| # | ID | Việc | Làm ngay? | Cần dữ liệu/secret? | Cần PO quyết định? | Vì sao trước / dependency |
|---:|---|---|---|---|---|---|
| 1 | **SEC-01** | Xác minh truy cập bảng backup PII; dọn theo runbook | ✅ Verify đã xong; cleanup chờ duyệt | Không (verify); backup offline khi drop | ✅ Có xoá/di chuyển bảng không | Verify độc lập; làm sạch schema trước migration mới. **Không phải active leak** (anon/authenticated 0 hàng) |
| 2 | **UX-01** | Bỏ link/copy `/admin` khỏi Home/Quote/PDP cho guest | ✅ Có | Không | Không | UX dead-end rõ nhất; độc lập |
| 3 | **UX-02** | `ProtectedRoute` giữ `?redirectTo=` | ✅ Có | Không | Không | Điều hướng sau login; 1 file |
| 4 | **UX-03** | Sửa CTA quote: “Thêm vào giỏ” vs “Đặt in ngay” | ✅ Có | Không | Không | CTA nói sai hành vi; độc lập |
| 5 | **UX-04** | `/personalize` empty state thay 404 | ✅ Có | Không | Không | Route public bị lạc khi catalog rỗng |
| 6 | **UX-05** | Checkout: disable/ẩn VNPAY đến khi gateway; hiện readiness bank | ✅ Có | Không | Không (trừ khi muốn bật gateway) | Tránh chọn phương thức chết |
| 7 | **UX-06** | Reorder: đọc payload trong `Tool3DView` hoặc ẩn nút | ✅ Có | Không | Không | Nút “In lại” hiện không mang dữ liệu |
| 8 | **QA-API-01** | Harness API/DB trên staging: guest order + RLS + token; fixture sạch | ✅ Có (staging) | ✅ Staging URL/key/secret | Không | **Không phụ thuộc UX**; chạy song song với UX-01…06 |
| 9 | **QA-BROWSER-01** | Browser smoke 390/1440 cho route/flow; 0 pageerror/tràn | ✅ Có | Không (agent/manual) | ⚠️ Nếu muốn Playwright CI | Chạy song song; không ghi DB |
| 10 | **DATA-PREP-01** | Ops chuẩn bị catalog/ảnh/`app_settings` (chưa publish) | ✅ Có (ops) | ✅ Dữ liệu thật/ảnh/pháp lý | ✅ Nội dung pháp lý/ngân hàng | Song song; **chưa publish** cho đến UI-01 + QA-MONEY-01 |
| 11 | **LEG-01** | Scaffold `/terms`, `/privacy`, `/warranty-policy` + link | ✅ Có (khung) | ✅ Nội dung legal | ✅ Nội dung/đơn vị duyệt | Khung chạy song song; **không coi hoàn tất chỉ vì route mở** |
| 12 | **TECH-01** | Xoá `AuthModal` chết + `onOpenAuth` + UI store fields; tách auth flags | ✅ Có | Không | Không | Giảm 913 LOC/DOM; test redirect sau UX-02 |
| 13 | **TECH-02** | Dọn mock imports rỗng (`PAYOUT_TRANSACTIONS`, `SAMPLE_ANALYSIS_FILES`, `MATERIALS_CATALOG`, `PRINTER_PROFILES`) | ✅ Có | Không | Không | Dead code; độc lập |
| 14 | **SEO-01** | Sửa generator: production URL, chỉ published, bỏ URL 404; regenerate | ✅ Code guard ngay | ✅ Domain production | ✅ Domain | Code làm ngay; acceptance chờ domain |
| 15 | **UI-01** | Publish readiness guard (ảnh/giá/license/designer) | ✅ Có | Không | Không | Sau UX-03; trước khi publish data thật |

**Ngay sau 15 việc trên (Phase 1):**

| # | ID | Việc | Điều kiện bắt đầu |
|---:|---|---|---|
| 16 | **QA-MONEY-01** | Transactional test có ghi DB: guest order → admin confirm → dispatch → tracking; cleanup `E2E-` | Staging + admin session + UI-01; **dry-run không đủ acceptance** |
| 17 | **DATA-02** | Publish catalog thật + ảnh; reset counter bịa | UI-01 + QA-MONEY-01 + DATA-PREP-01 |
| 18 | **DATA-03** | E2E với dữ liệu thật (`app_settings`, product, payment, tracking) | DATA-02 |
| 19 | **SEO-02** | Regenerate/verify SEO sau data + domain | DATA-02 + SEO-01 |

### 5.2 Dependency thật (chỉ giữ lý do kỹ thuật/nghiệp vụ)

| Item | Phụ thuộc | Lý do | Có thể chạy song song |
|---|---|---|---|
| SEC-01 cleanup | PO/DB owner duyệt + backup offline | Xoá/di chuyển dữ liệu không thể tự động | Verify đã xong; cleanup chờ duyệt |
| UX-02 | Không | 1 file route wrapper | UX-01/03/04/05/06 |
| TECH-01 | UX-02 (chỉ để test redirect) | Auth routes là canonical; removal độc lập | UX-01/03/04/05/06 |
| QA-API-01 | Staging secret | Cần DB/API staging; không cần UI | UX-01…06, DATA-PREP |
| QA-BROWSER-01 | Không | Chỉ đọc UI | UX-01…06 |
| QA-MONEY-01 | Staging + admin session + UI-01 | Cần ghi DB và publish guard đã ổn | QA-API-01 sau khi có staging |
| DATA-02 | UI-01 + QA-MONEY-01 | Không publish khi chưa guard/verify | DATA-PREP-01 trước đó |
| DES-01 (read-only earnings) | DB RPC/view | Designer không đọc `order_items`; cần security-definer | REV-01, INV-02 |
| INV-02 (schema) | PO chốt nghiệp vụ số HĐ | Chọn `orders` columns vs `invoices` | DES-01, REV-01 |
| ARCH-01 | Không cho Phase 0; chỉ cần trước rollout nhiều flow | Atomic order dùng env flag hiện có | Phase 2 |

**Dependency graph (rút gọn):**

```text
Song song ngay:
  A  UX-01/03/04/05/06 ──► UI-01 ──► QA-MONEY-01 ──► DATA-02 (publish thật)
  B  SEC-01 verify ──► cleanup (chờ PO/DB)
  C  UX-02 ──► TECH-01
  D  QA-API-01 + QA-BROWSER-01 (staging/current; không chờ UX)
  E  DATA-PREP-01 ──► DATA-01 (import) + DATA-03 (app_settings/site_content)
  F  LEG-01 (khung) ──► LEG-02 (nội dung) ──► LEG-03 (link)
  G  SEO-01 (code guard) ──► SEO-02 (sau domain + DATA-02)
  H  TECH-02 (độc lập)

Sau Phase 2:
  INV-01 ──► INV-02 ──► INV-03 ──► INV-04
  DES-01 ──► DES-02 ──► DES-03
  ARCH-01 (trước rollout nhiều flow)
```

### 5.3 Vì sao ARCH-01 không còn trong FIRST ITEMS

- Feature flags table + RLS + hook + admin UI là **thay đổi lớn**, không có item Phase 0 nào
  phụ thuộc trực tiếp.
- `VITE_ATOMIC_ORDER` hiện đủ để verify atomic order trên staging.
- Chỉ cần `feature_flags` khi **rollout nhiều flow mới** (review photos, SLA, invoice, email)
  hoặc cần bật/tắt theo user/tenant. Vì vậy chuyển ARCH-01 sang **Phase 2 — trước rollout**,
  không chặn UI/QA/data prep.

### 5.4 Nhóm song song

- **A — Public UX:** UX-01, UX-03, UX-04, UX-05, UX-06, SEO-01 (code guard).
- **B — Auth/Security:** SEC-01 (verify/cleanup), UX-02, TECH-01, TECH-02.
- **C — QA harness:** QA-API-01, QA-BROWSER-01.
- **D — Ops data prep:** DATA-PREP-01 (không publish).
- **E — Legal scaffold:** LEG-01 (nội dung chờ PO/legal).
- **F — Publish guard:** UI-01 (sau UX-03); **QA-MONEY-01** ngay sau đó.

### 5.5 Wave 1.1 — code-only P2 (2026-11-10)

| ID | Item | Branch / commit | Kết quả | Bằng chứng |
|---|---|---|---|---|
| W1.1-AUTH | Register/Header giữ `redirectTo` sau đăng ký | `wave1.1/auth` · `60dee17` → `ad181c4` → `57255a9` | **DONE** | Card + Header login/register link giữ `?redirectTo=`; loop `/LOGIN`, `/login/`, `/Auth/Login` bị chặn; 189 unit test; 390/1440 0 tràn |
| W1.1-A11Y | Audit H1 public | `wave1.1/a11y` · `c51a62d` | **DONE** | `/order-success`, `/order-success/:id`, `/products/:id` not-found/error có đúng 1 h1; public settled routes 1 h1; 0 tràn |
| W1.1-SEO | robots `/assets` vs asset build | `wave1.1/seo` · `daaf3cb` | **DONE** | `dist/index.html` dùng `/assets/*.js|css`; đổi sang `Allow: /assets/` + `Disallow: /assets$`; `npm run seo:check` PASS; negative prefix test fail đúng |
| W1.1-CONTACT | Bỏ email mặc định chưa xác nhận; lọc placeholder dùng chung | `wave1.1/contact` · `8ce0d4b` → `6544548` | **DONE (code)** | `DEFAULT_SITE_CONTENT.contactEmail=''`; footer/Quote/ChatSupport dùng `src/frontend/lib/contact.ts`; 7 test; `contact@vcube.vn` không còn trong `src/` |

**Wave 1.1 vẫn không đóng các blocker:**
- QA-MONEY-01 / staging: chưa có `E2E_STAGING_*` + quyền ghi/xoá fixture.
- SEC-01: chưa có quyết định drop/chuyển bảng backup PII.
- DB publish enforcement: guard client/service vẫn có direct-API gap; cần migration/trigger + DB owner.
- SEO-02: chờ production domain + catalog published.
- DATA-01/02/03: chờ dữ liệu/ảnh/app_settings + QA-MONEY.
- Owner chưa xác nhận mailbox liên hệ thật; UI đang ẩn/fallback trợ lý tự động.

**P2 follow-up ghi nhận:** Header/NotificationBell/ProductDetail còn vài entry auth trong app chưa truyền `redirectTo`; A11y loading state `/products/:id`/`/order-success/:id` chưa có h1; robots `/assets/` (slash cuối) vẫn crawlable; admin storefront chưa validate email trước khi lưu; guard publish tin `previousStatus` caller.

### 5.6 Wave 1.2 — code-only P2 tiếp theo (2026-11-10)

| ID | Item | Branch / commit | Kết quả | Bằng chứng |
|---|---|---|---|---|
| W1.2-AUTH | In-app auth links giữ `redirectTo` (`useAppNavigation`, PDP) | `wave1.2/auth` · `e6a38f7` | **DONE** | `/explore` header login/register = `?redirectTo=%2Fexplore`; guest protected navigation dùng loginHref; 189 test |
| W1.2-A11Y | H1 loading/latent + tách lỗi tải đơn | `wave1.2/a11y` · `fd52d7e` | **DONE** | Loading `/products/:id` và `/order-success/:id` có 1 h1; `OrderLoadErrorView` có Thử lại; 390/1440 0 tràn |
| W1.2-SEO | Đóng `/assets/` slash; sửa evidence `$` | `wave1.2/seo` · `1fa18c9` | **DONE** | `Allow: /assets/` + `Disallow: /assets$` + `Disallow: /assets/$`; `seo:check` PASS; negative thiếu rule fail |
| W1.2-CONTACT | Admin validate email trước khi lưu | `wave1.2/contact` · `e17a4cc` | **DONE** | `getContactEmailIssue`/`isValidContactEmail`; panel chặn email sai/`[MẪU]`/example; 192 test |

**P2 còn lại sau Wave 1.2:** robots parser chỉ mô phỏng group `User-agent: *`; `seo:check` chưa vào `npm run check`; `OrderService` chưa có typed error để phân biệt not-found vs network; guard publish vẫn tin `previousStatus` caller; direct-API publish gap; owner chưa xác nhận mailbox thật.

---

## 6. Backlog đầy đủ

> Mỗi item có: mục tiêu, ưu tiên, persona/page, scope, bước chính, dependency, acceptance,
> test, effort, rủi ro. Các item Phase 4 được rút gọn nhưng vẫn đủ để nhận việc.

### Phase 0 — UI/UX stabilization, security hygiene & verification foundation

#### SEC-01 — Xác minh & dọn bảng backup PII `_bak_designer_profiles_20260924`

- **Vấn đề:** bảng public 2 hàng chứa `bank_name/bank_account/tax_id`, RLS bật nhưng 0 policy,
  grants full cho anon/authenticated, không có trong migration; được tạo bởi runbook
  `docs/runbooks/OWNER-ACTIONS-2026-09-24.md` và đã có hướng dẫn drop sau khi ổn định.
- **Đã xác minh truy cập thực tế (read-only):**
  - `has_table_privilege('anon'/'authenticated', ..., 'SELECT')` = true (grant có).
  - PostgREST anon `GET /rest/v1/_bak...` → **200 `[]`** (0 hàng).
  - SQL `set local role anon` / `authenticated` → **0 hàng**.
  - `service_role` → 2 hàng (đúng vai trò server, bypass RLS).
  - Không code/RPC nào đọc bảng (`grep` + `pg_proc.prosrc` = 0).
- **Kết luận mức độ:** **P1 — PII at rest + schema drift**, **không phải active leak** qua
  anon/authenticated. Rủi ro còn lại: service_role compromise, future policy/grant sai,
  backup ngoài migration gây drift. Không cần emergency drop ngoài quy trình.
- **Ưu tiên:** P1 (security hygiene) — dọn sau khi PO/DB owner duyệt; có thể chạy song song UI.
- **Persona/page:** toàn hệ thống; admin/security.
- **Scope:** DB migration/ops; không sửa UI.
- **Bước:** (1) export offline nếu cần lưu; (2) `drop table` hoặc chuyển sang schema `private`
  + revoke grants; (3) ghi docs `schema-notes`; (4) chạy `inspect-db`, `verify-rls`, `lint-rls-*`.
- **Dependency:** PO/DB owner duyệt; backup ngoài repo.
- **Acceptance:** bảng không còn trong `public`; `information_schema` không thấy; 0 policy/grant PII;
  live gate xanh; docs cập nhật.
- **Test:** SQL `to_regclass` null; `npm run check`; PostgREST anon không thấy bảng/không trả hàng.
- **Effort:** S. **Rủi ro:** nếu có job/admin panel đang đọc bảng (đã grep = 0); cần backup.

#### UX-01 — Bỏ link/copy `/admin` khỏi public storefront

- **Vấn đề:** Home hiện “Chưa cấu hình • Nhập ở /admin”; Quote/PDP copy “Quản trị viên nhập ở /admin”
  với guest.
- **Ưu tiên:** P1 (UX/dead-end) — guest bấm bị đá sang login.
- **Persona/page:** guest; `/`, `/quote`, `/products/:id`.
- **Scope:** `HomeView.tsx`, `Tool3DView.tsx`, `Tool3DEmptyState.tsx`, `QuoteSummaryPanel.tsx`,
  `ProductDetailView.tsx`; dùng `role` từ `useAuth`.
- **Bước:** tạo helper/copy trung tính; chỉ render link admin khi `role === 'admin'`; guest thấy
  “Thông số đang được cập nhật — liên hệ VCUBE” hoặc ẩn.
- **Dependency:** không.
- **Acceptance:** guest không thấy chuỗi `/admin`/“Nhập ở /admin”; admin vẫn thấy shortcut;
  copy VI-only; 390/1440 không tràn.
- **Test:** Playwright guest + admin; grep `/admin` trong public views; `check-ui-rules`.
- **Effort:** S. **Rủi ro:** không.

#### UX-02 — `ProtectedRoute` giữ `redirectTo`

- **Vấn đề:** `/orders`, `/assets`, `/account` redirect `/auth/login` không query; login xong về `/`.
- **Ưu tiên:** P1 — mất ngữ cảnh sau login.
- **Scope:** `src/frontend/routes/routeWrappers.tsx`.
- **Bước:** dùng `useLocation`, tạo `/auth/login?redirectTo=${encodeURIComponent(pathname+search)}` như `RoleGuard`;
  `LoginView` đã đọc `redirectTo`.
- **Dependency:** không.
- **Acceptance:** guest mở `/orders` → login → quay lại `/orders`; `/assets`/`/account` tương tự.
- **Test:** Playwright 2 case; unit test helper nếu tách hàm.
- **Effort:** S. **Rủi ro:** open redirect — chỉ cho path nội bộ (`startsWith('/')`, không `//`).

#### UX-03 — Sửa CTA quote

- **Vấn đề:** primary “Thêm vào giỏ & đặt hàng” chỉ add cart; secondary “Đặt in ngay” mới checkout.
- **Ưu tiên:** P1 — CTA nói sai hành vi.
- **Scope:** `QuoteSummaryPanel.tsx`; có thể `Tool3DView.tsx`.
- **Bước:** đổi primary label “Thêm vào giỏ”; giữ secondary “Đặt in ngay (chuyển đến thanh toán)”;
  hoặc primary gọi `onDirectOrder`. Chọn 1 hành vi rõ; thêm toast đúng.
- **Dependency:** không.
- **Acceptance:** bấm primary → cart badge tăng, ở lại quote; bấm secondary → `/checkout`;
  label khớp hành vi.
- **Test:** Playwright quote upload → click both; manual 390.
- **Effort:** S.

#### UX-04 — `/personalize` empty state

- **Vấn đề:** `/personalize` và `/personalize/:draft` trả 404 khi không có product published.
- **Ưu tiên:** P1 — route public lạc.
- **Scope:** `src/frontend/routes/routeWrappers.tsx` (`PersonalizeRoute`), `PersonalizeView`.
- **Bước:** nếu không resolve product → render EmptyState “Chưa có mẫu để tuỳ biến” + CTA quote/explore;
  chỉ 404 khi id không tồn tại thật.
- **Dependency:** không.
- **Acceptance:** `/personalize` hiện empty state, không 404; `/personalize/nope` vẫn 404.
- **Test:** Playwright 2 route; manual 390.
- **Effort:** S.

#### UX-05 — Checkout payment method honesty

- **Vấn đề:** VNPAY selectable dù chưa kết nối; bank info unconfigured.
- **Ưu tiên:** P1 — tránh chọn phương thức chết.
- **Scope:** `CheckoutView.tsx`; `paymentProvider`.
- **Bước:** disable VNPAY + tooltip “Chưa kết nối”; nếu chọn, fallback manual? Hiển thị rõ
  “Chưa cấu hình thông tin nhận tiền” + link admin chỉ admin; guest CTA liên hệ.
- **Dependency:** không.
- **Acceptance:** VNPAY disabled/không chọn được; VietQR/COD vẫn hoạt động; copy trung thực.
- **Test:** Playwright; manual; check-ui-rules.
- **Effort:** S.

#### UX-06 — Reorder payload

- **Vấn đề:** `MyOrdersView` gửi `reorderItems`; `Tool3DView` không đọc.
- **Ưu tiên:** P1 — nút “In lại” không hoạt động.
- **Scope:** `MyOrdersView.tsx`, `Tool3DView.tsx`, `useAppNavigation.ts`.
- **Bước:** `useLocation().state` trong Tool3DView; map items → files/cart hoặc mở quote với item;
  nếu không khả thi, ẩn nút + copy “chưa hỗ trợ”.
- **Dependency:** UX-03 (CTA semantics).
- **Acceptance:** bấm “In lại” mở quote có item/dữ liệu; hoặc nút bị ẩn có lý do.
- **Test:** Playwright customer order → reorder.
- **Effort:** S–M.

#### LEG-01 — Legal routes scaffold

- **Vấn đề:** register/checkout nhắc “Điều khoản dịch vụ/Chính sách bảo mật” nhưng không có route.
- **Ưu tiên:** P1 — khung pháp lý tối thiểu.
- **Scope:** route `/terms`, `/privacy`, `/warranty-policy`; component `LegalPage`; SEOHead;
  placeholder có disclaimer “nội dung chờ legal review”.
- **Bước:** scaffold route + component + metadata; chưa coi là “hoàn tất pháp lý”.
- **Dependency:** không (khung); nội dung ở LEG-02.
- **Acceptance:** 3 route mở được, không 404; VI-only; có disclaimer rõ.
- **Test:** Playwright; doc-refs.
- **Effort:** S.

#### LEG-02 — Legal content review

- **Vấn đề:** nội dung điều khoản/chính sách bảo mật/bảo hành cần người có thẩm quyền duyệt.
- **Scope:** nội dung Markdown/HTML trong `LegalPage`; version/ngày hiệu lực.
- **Dependency:** PO/legal.
- **Acceptance:** nội dung được duyệt; ngày hiệu lực/version; không còn disclaimer “chờ duyệt”.
- **Test:** review sign-off; manual.
- **Effort:** M (nội dung).

#### LEG-03 — Link/publish integration

- **Scope:** link từ `RegisterView`, `CheckoutView`, footer; sitemap; analytics event.
- **Dependency:** LEG-01 + LEG-02.
- **Acceptance:** link đúng 3 nơi; sitemap có URL; click mở đúng.
- **Test:** Playwright; doc-refs.
- **Effort:** S.

#### TECH-01 — Xoá AuthModal chết + tách auth flags

- **Vấn đề:** 913 LOC luôn mount; `onOpenAuth` không dùng; 2 bề mặt auth.
- **Ưu tiên:** P1 — dead code/bundle/consistency.
- **Scope:** `AuthModal.tsx`, `AppOverlays.tsx`, `App.tsx`, `Header.tsx`, `useUIStore.ts`,
  `LoginView.tsx`, `RegisterView.tsx`; tạo module `authFlags.ts` trong thư mục `src/frontend/lib/`
  (dự kiến tạo khi code).
- **Bước:** move `ENABLE_GOOGLE_OAUTH`/`ENABLE_PASSWORD_RESET`; xoá import/mount/prop/store fields;
  kiểm route auth vẫn chạy.
- **Dependency:** UX-02 (redirect) để auth flow ổn định.
- **Acceptance:** tsc/build/gate xanh; bundle giảm; không còn `AuthModal`/`onOpenAuth`; login/register OK.
- **Test:** build size before/after; Playwright auth; grep dead symbol.
- **Effort:** M. **Rủi ro:** auth modal có thể được mở từ nơi chưa grep thấy — search toàn repo trước.

#### TECH-02 — Dọn mock imports rỗng

- **Vấn đề:** `PAYOUT_TRANSACTIONS`, `SAMPLE_ANALYSIS_FILES`, `MATERIALS_CATALOG`, `PRINTER_PROFILES`
  đều `[]` nhưng còn import/default props.
- **Ưu tiên:** P2 — dead code/dễ hiểu.
- **Scope:** `DesignerPayoutsTab.tsx`, `Tool3DView.tsx`, `QuoteSummaryPanel.tsx`,
  `ProductDetailView.tsx`, `src/data/mockData.ts`.
- **Bước:** thay default `[]` tại call-site; xoá import/constant nếu 0 ref; giữ `CATEGORIES`,
  `POPULAR_TAGS`, `DEFAULT_SITE_CONTENT`, `INKIRI_REFERENCE_VALUES`.
- **Dependency:** không.
- **Acceptance:** grep 0 ref; tsc/gate xanh; UI empty state vẫn đúng.
- **Test:** `npm run check`; unit; manual quote/payout.
- **Effort:** S.

#### SEO-01 — Sửa SEO generator & files

- **Vấn đề:** robots/sitemap localhost; sitemap chứa demo product 404.
- **Ưu tiên:** P1 — chặn index sai khi deploy.
- **Scope:** `scripts/gen-seo-files.mjs`, `public/robots.txt`, `public/sitemap.xml`,
  `public/manifest.webmanifest`; `.env.example`/CI.
- **Bước:** validate `VITE_SITE_URL` production; chỉ published products; bỏ `/personalize`,
  `/order-success`; manifest color token; thêm CI check cấm `localhost` trong public SEO.
- **Dependency:** PO chốt domain production (có thể implement guard trước).
- **Acceptance:** `sitemap.xml` không có localhost/demo; chỉ URL 200; manifest đúng màu.
- **Test:** `npm run seo:gen`; grep; curl deploy preview.
- **Effort:** S.

#### UI-01 — Publish readiness guard

- **Vấn đề:** admin có thể set Published khi thiếu ảnh/giá/license/designer; counter demo bịa.
- **Ưu tiên:** P1 — bảo vệ data phase.
- **Scope:** `AdminProductsPanel.tsx`, `productStatus.ts`, `dbService.saveProduct`/service validation;
  pure helper + unit test.
- **Bước:** định nghĩa `validateProductForPublish(product)`: name, category, ≥1 image/thumbnail,
  price > 0, license, designer_id (nếu seller_type designer), status; disable “Đã đăng” + show issues;
  admin có thể override? Không mặc định.
- **Dependency:** UX-03 (product UI ổn định).
- **Acceptance:** publish sản phẩm thiếu điều kiện bị chặn + lý do; sản phẩm đủ điều kiện publish được;
  unit test pure helper.
- **Test:** unit + Playwright admin products.
- **Effort:** M. **Rủi ro:** sản phẩm platform có thể không cần designer — xử lý theo `seller_type`.

#### QA-API-01 — API/DB harness trên staging (fixture, không UI)

- **Vấn đề:** `scripts/e2e/guest-order-flow.ts` có nhưng chưa có npm script/CI; chưa có harness
  API/DB tách khỏi UI.
- **Ưu tiên:** P1 — nền tảng verification; **không phụ thuộc UX fixes**.
- **Scope:** `package.json`, `.github/workflows/ci.yml`, `scripts/e2e/guest-order-flow.ts`,
  docs.
- **Bước:** thêm `test:e2e:api` (dry-run mặc định); fixture staging; test guest insert + RLS +
  token RPC; cleanup `E2E-`; output JSON.
- **Dependency:** staging URL/key/secret. Không cần chờ UX-01…06.
- **Acceptance:** `npm run test:e2e:api` dry-run pass; staging live pass; cleanup sạch;
  **dry-run không được ghi “đã chứng minh vòng tiền”**.
- **Test:** dry-run + staging live; CI optional secret.
- **Effort:** M. **Rủi ro:** ghi DB — prefix `E2E-`, cleanup; không chạy production nếu chưa duyệt.

#### QA-BROWSER-01 — Browser smoke 390/1440 (không ghi DB)

- **Vấn đề:** browser regression hiện dựa manual/agent; chưa có checklist/script cố định.
- **Ưu tiên:** P1 — bắt lỗi UI/overflow/console.
- **Scope:** checklist trong `docs/design/qa-checklist.md` + script agent/Playwright nếu PO duyệt.
- **Bước:** route list public + 3 console; assert 0 `pageerror`, 0 tràn, h1/text; screenshot;
  không submit form/ghi DB.
- **Dependency:** không (chạy song song). Nếu muốn CI browser → cần PO quyết định Playwright.
- **Acceptance:** 23 admin + 5 designer + 7 lab + public routes pass checklist; evidence lưu
  trong handoff.
- **Test:** manual/agent; Playwright optional.
- **Effort:** S–M. **Rủi ro:** browser CI cần dependency/secret — không tự thêm.

> **ARCH-01 đã chuyển khỏi Phase 0** — xem block dưới Phase 2. Lý do: không item Phase 0 nào
> phụ thuộc feature-flags table; atomic order dùng env flag hiện có.

### Phase 1 — Data integration & publish readiness (sau UI)

#### QA-MONEY-01 — Transactional write test (staging, có ghi DB)

- **Vấn đề:** chưa chứng minh checkout → admin confirm → dispatch → tracking → cleanup.
- **Ưu tiên:** P1 — **điều kiện để publish catalog thật**.
- **Scope:** `scripts/e2e/guest-order-flow.ts` mở rộng `--admin-session`; staging; DB assertions.
- **Bước:** tạo order guest → admin login confirm payment → assert `orders.payment_status='paid'`,
  `order_items`, `payment_transactions` → dispatch → lab stage → tracking; cleanup.
- **Dependency:** staging + admin session + UI-01 (publish guard) đã ổn; QA-API-01.
- **Acceptance:** **DB rows đúng + cleanup sạch**; dry-run **không** được dùng làm acceptance.
- **Test:** live staging; log JSON; rerun idempotent.
- **Effort:** M–L. **Rủi ro:** ghi dữ liệu — chỉ staging; prefix/cleanup; không production nếu chưa duyệt.

#### DATA-01 — Import catalog thật

- **Vấn đề:** materials/printers/accessories demo.
- **Ưu tiên:** P0 cho go-live, nhưng **sau** Phase 0.
- **Scope:** `scripts/catalog/*.json`, `scripts/import-catalog.mjs`, DB.
- **Bước:** điền dữ liệu thật; dry-run; `--apply`; verify counts/fields; remove `[MẪU]`.
- **Dependency:** DATA-PREP-01; dry-run/import có thể chạy song song UI. **Chỉ publish/consume**
  sau UI-01 + QA-MONEY-01.
- **Acceptance:** 0 `[MẪU]`; PO dataHonesty 0; quote dùng dữ liệu thật.
- **Test:** `npm run po:audit`; quote manual; DB counts.
- **Effort:** M (ops).

#### DATA-02 — Publish sản phẩm thật + ảnh

- **Vấn đề:** 0 published/0 ảnh; counter bịa.
- **Ưu tiên:** P0 go-live.
- **Scope:** products + storage `product-images`; admin/designer.
- **Bước:** tạo/publish ≥5 sản phẩm; upload ảnh; reset `rating/reviews_count/prints_count`;
  kiểm PDP/Explore.
- **Dependency:** UI-01 + QA-MONEY-01 + DATA-PREP-01 + DATA-01; ảnh thật.
- **Acceptance:** `products` published ≥5; ảnh thật; card/PDP; 0 counter bịa.
- **Test:** Playwright Explore/PDP; DB query.
- **Effort:** M (ops).

#### DATA-03 — Cấu hình `app_settings` & `site_content`

- **Vấn đề:** app_settings null; hero metrics rỗng.
- **Ưu tiên:** P0 go-live.
- **Scope:** Admin settings/storefront; DB.
- **Bước:** legal name/tax/invoice/hotline/email/bank; hero metrics/tolerance/address/announcement.
- **Dependency:** DATA-PREP-01 (nội dung pháp lý/bank); **không cần chờ DATA-02** — có thể làm song song.
- **Acceptance:** checkout hiện bank; invoice legal; Home không “Chưa cấu hình”; guest không thấy admin link.
- **Test:** Playwright checkout/invoice/home.
- **Effort:** S (ops).

#### DATA-04 — Full E2E smoke với dữ liệu thật

- **Vấn đề:** chưa chứng minh vòng tiền thật.
- **Ưu tiên:** P0 go-live.
- **Scope:** QA-MONEY-01 + QA-API-01 + real accounts.
- **Bước:** guest order → admin confirm payment → dispatch → lab progress → completed; digital order →
  order_files → `/assets` download; tracking; review; warranty.
- **Dependency:** DATA-03 + QA-MONEY-01 + DATA-02.
- **Acceptance:** DB rows đúng (`orders`, `order_items`, `payment_transactions`, `order_files`);
  0 lỗi; tracking/review/warranty hoạt động.
- **Test:** E2E live; manual browser.
- **Effort:** M.

### Phase 2 — Transaction durability

#### INV-01 — Chốt nghiệp vụ hoá đơn (không code)

- **Mục tiêu:** chốt trước khi chọn schema/cơ chế cấp số.
- **Câu hỏi:** 1 order = 1 invoice? Có credit note/refund invoice? Số HĐ format/sequence?
  Có cần e-invoice provider? Ai cấp số, có reset theo năm không? Có cần lưu PDF/version?
- **Scope:** docs + PO/legal/accounting.
- **Dependency:** PO/accounting.
- **Acceptance:** quyết định bằng văn bản trong docs; INV-02 mới bắt đầu.
- **Test:** review sign-off.
- **Effort:** S.

#### INV-02 — Schema hoá đơn (migration)

- **Phương án A (khuyến nghị MVP):** `orders.invoice_number`, `invoice_issued_at`, `invoice_pdf_path`.
- **Phương án B:** bảng `invoices` (order_id, number, issued_at, status, pdf_path) — khi cần
  credit note/nhiều hoá đơn.
- **Scope:** migration + backfill + RLS; docs.
- **Dependency:** INV-01; DB approval.
- **Acceptance:** số HĐ unique; 1 order 1 invoice (MVP); F5 đọc lại; migration rollback.
- **Test:** SQL constraint; integration.
- **Effort:** S–M.

#### INV-03 — Cấp số & đọc hoá đơn bền

- **Scope:** `InvoiceService`/RPC cấp số idempotent khi `paid`; `InvoiceModal` đọc DB;
  admin search/export.
- **Dependency:** INV-02; DATA-04.
- **Acceptance:** cấp số 1 lần; retry không trùng; F5 vẫn số; admin export.
- **Test:** unit number generator; E2E paid order; print.
- **Effort:** M.

#### INV-04 — UI/print/search hoá đơn

- **Scope:** `InvoiceModal`, admin order detail, `/orders`; print CSS; search.
- **Dependency:** INV-03.
- **Acceptance:** in đúng pháp nhân/VAT/số HĐ; mobile print; không lộ PII.
- **Test:** Playwright print; manual PDF.
- **Effort:** S–M.

#### DES-01 — Designer earnings read-only (RPC/view)

- **Vấn đề:** designer không đọc `order_items` (RLS chỉ chủ đơn/admin).
- **Scope:** RPC security-definer `designer_earnings(p_from,p_to)` aggregate từ `order_items`
  + `orders` (chỉ đơn paid/completed); `DesignerOverviewTab`/`DesignerPayoutsTab`.
- **Dependency:** DB approval; DATA-04.
- **Acceptance:** designer thấy doanh thu/đơn/kỳ của CHÍNH mình; RLS chặn người khác.
- **Test:** RLS; unit mapping; Playwright.
- **Effort:** M.

#### DES-02 — Payout request

- **Scope:** UI form + RPC/insert `payout_requests` (hoặc cột trạng thái) — chờ chốt nghiệp vụ.
- **Dependency:** DES-01; PO chốt quy trình rút.
- **Acceptance:** designer tạo request; trạng thái pending; không tự mark paid.
- **Test:** RLS; E2E.
- **Effort:** M.

#### DES-03 — Admin duyệt payout/trạng thái

- **Scope:** admin panel danh sách request; mark paid/partial/rejected; audit; thông báo.
- **Dependency:** DES-02; INV/ledger optional.
- **Acceptance:** admin duyệt; designer thấy trạng thái; audit.
- **Test:** RLS; Playwright.
- **Effort:** M.

#### ARCH-01 — Feature flags table + hook (chuyển từ Phase 0)

- **Vấn đề:** chỉ env `VITE_ATOMIC_ORDER`; không rollout/tắt bật runtime.
- **Vì sao Phase 2:** không item Phase 0 nào phụ thuộc; atomic order dùng env flag hiện có.
  Chỉ cần khi rollout nhiều flow mới (invoice, review photos, SLA, email) hoặc per-user/tenant.
- **Scope:** migration `feature_flags`; service/hook `useFeatureFlag`; admin toggle; cache; docs.
- **Dependency:** DB approval; SEC-01 cleanup trước để schema sạch.
- **Acceptance:** flag đọc runtime; admin bật/tắt; atomic order flag hoạt động; gate/RLS xanh.
- **Test:** unit helper; RLS; Playwright admin.
- **Effort:** M.

#### REV-01 — Review photos

- **Vấn đề:** schema photos; không upload/hiển thị.
- **Ưu tiên:** P1.
- **Scope:** bucket `review-images` + policies; `reviewService` upload; PDP render; admin moderation.
- **Bước:** bucket/policy; upload; signed/public URL; display; duyệt.
- **Dependency:** storage policy approval; DATA-04.
- **Acceptance:** khách upload ảnh; PDP hiện; admin ẩn/duyệt; RLS owner/admin.
- **Test:** storage RLS; Playwright; manual.
- **Effort:** M.

#### ORD-01 — Cancel/address change trước production

- **Vấn đề:** không service/UI.
- **Ưu tiên:** P1.
- **Scope:** RPC/policy; `MyOrdersView`/admin; status history.
- **Bước:** rule trước `printing`; cancel; address update; audit; notify.
- **Dependency:** DB approval; DATA-04.
- **Acceptance:** khách/admin huỷ/đổi địa chỉ đúng điều kiện; DB/status/audit.
- **Test:** E2E; RLS; unit transition.
- **Effort:** M.

#### PAY-01 — Bật atomic order

- **Vấn đề:** flag off; legacy multi-step.
- **Ưu tiên:** P1.
- **Scope:** `.env`/feature flag; `orderGateway`.
- **Bước:** E2E 3 luồng; bật flag; monitor; rollback flag.
- **Dependency:** DATA-04; ARCH-01.
- **Acceptance:** atomic RPC dùng thật; retry không trùng; rollback.
- **Test:** E2E; failure injection.
- **Effort:** S (sau E2E).

#### EMAIL-01 — Email transactional

- **Vấn đề:** chỉ in-app.
- **Ưu tiên:** P1/P2.
- **Scope:** `NotificationProvider` implementation + secret; templates; opt-in.
- **Bước:** chọn provider; adapter; event order status; preference; log.
- **Dependency:** PO/provider/secret.
- **Acceptance:** email xác nhận/đổi trạng thái; opt-in; no secret in bundle.
- **Test:** provider sandbox; E2E.
- **Effort:** M.

### Phase 3 — Workshop & settlement

| ID | Việc | Scope | Acceptance | Effort |
|---|---|---|---|---|
| LAB-01 | Accept/decline + SLA/deadline | migration columns/RPC; QueueTab | Xưởng nhận/từ chối; deadline; cảnh báo trễ | M |
| LAB-02 | QC checklist + ảnh + reprint | tables/storage; lab UI | Checklist/ảnh lưu; reprint tạo | M |
| LAB-03 | Auto trừ kho khi completed | `updateMyOrderProgress` + inventory | Tồn kho/log đúng | S–M |
| SET-01 | Settlement kỳ | bảng settlements; admin/lab/designer UI | Kỳ/trạng thái paid; đối soát | L |
| AUD-01 | Audit mở rộng | trigger/bảng audit; admin viewer | Audit order/product/payment | M |
| FLAG-02 | Rollout flags cho flow mới | `feature_flags` + UI | Bật/tắt không deploy | S |

### Phase 4 — Growth/scale (chưa cần ngay)

| ID | Việc | Giá trị | Điều kiện |
|---|---|---|---|
| SUP-01 | Support ticket chat → ticket | CSKH có hàng đợi | Phase 2 ổn định |
| ADDR-01 | Sổ địa chỉ nhiều nơi | B2B | customer_profiles mở rộng |
| REP-01 | Báo cáo/cohort/CSV | Quyết định kinh doanh | order/payout data |
| STORE-01 | Designer storefront/license/royalty | Khác biệt | ledger/license |
| SEARCH-01 | Server-side search | Catalog lớn | > vài trăm product |
| PWA-01 | PWA offline/notification | Retention | notification center |
| ARCH-02 | Split god files + component tests | Maintainability | UI ổn định |

---

## 7. Roadmap theo phase & kết quả nghiệm thu

### Phase 0 — “UI sạch, không dead-end” (1–2 tuần)

**Items:** SEC-01 (verify xong, cleanup chờ duyệt), UX-01..UX-06, QA-API-01, QA-BROWSER-01,
DATA-PREP-01 (ops, không publish), LEG-01 (khung), TECH-01, TECH-02, SEO-01 (code guard), UI-01.

**Demo/acceptance:**
- Guest không thấy link `/admin`; login redirect đúng; quote CTA đúng; `/personalize` empty state;
  VNPAY disabled; reorder hoạt động/ẩn; AuthModal removed; SEO không localhost; QA-API/QA-BROWSER
  có evidence; publish guard chặn sản phẩm thiếu điều kiện.
- **LEG-01 chỉ là khung** — chưa coi hoàn tất pháp lý; LEG-02/03 chờ nội dung/duyệt.
- Gate 23/23 + tsc; 390/1440 0 lỗi/0 tràn.

### Phase 1 — “Data & publish readiness” (1–2 tuần, ops + code)

**Items:** QA-MONEY-01; DATA-01 (import dry-run có thể chạy song song); DATA-02 (publish after
QA-MONEY-01 + UI-01); DATA-03 (app_settings/site_content, song song); DATA-04; SEO-02.

**Demo/acceptance:**
- **QA-MONEY-01 pass với DB rows thật** (`orders`, `order_items`, `payment_transactions`) — dry-run
  **không** được dùng làm acceptance.
- Catalog thật, ≥5 product published + ảnh; `app_settings` đầy đủ; checkout bank/invoice;
  tracking/review/warranty; PO dataHonesty 0.

### Phase 2 — “Money & post-purchase durable” (2–3 tuần)

**Items:** INV-01..INV-04, DES-01..DES-03, REV-01, ORD-01, PAY-01, EMAIL-01, ARCH-01.

**Demo/acceptance:**
- Hoá đơn bền (số HĐ server, idempotent); designer earnings read-only + payout request + admin duyệt;
  review ảnh; huỷ/đổi địa chỉ; atomic order; email; feature flags trước rollout nhiều flow.

### Phase 3 — “Workshop & settlement” (2–3 tuần)

**Items:** LAB-01..03, SET-01, AUD-01, FLAG-02.

**Demo/acceptance:**
- SLA/accept/decline; QC ảnh; auto stock; settlement; audit; flags.

### Phase 4 — “Scale & differentiation” (3–6 tuần)

**Items:** SUP-01, ADDR-01, REP-01, STORE-01, SEARCH-01, PWA-01, ARCH-02.

**Demo/acceptance:**
- Ticket; address book; reports; storefront/license; search; PWA; file ≤800; component tests.

---

## 8. Giả định, điểm chưa xác minh, quyết định cần PO chốt

### Giả định
- UI v3 là theme cuối; không restyle.
- Một phần dữ liệu mẫu được giữ có chủ đích đến Phase 1.
- Không thêm dependency; Supabase là backend.
- Production domain sẽ được cung cấp trước SEO-01 acceptance.
- DB migration cần PO/DB owner duyệt.

### Chưa xác minh
- Mua file số end-to-end; payment gateway/refund; email; payout ledger; SLA/QC/settlement.
- LCP/CLS sau data thật; screen reader toàn bộ form.
- Tác động của việc xoá AuthModal lên bất kỳ deep-link/modal cũ nào (cần grep toàn repo).
- SEC-01: đã grep 0 code/RPC refs; vẫn cần xác nhận vận hành trước khi drop.
- Invoice numbering/e-invoice: chưa chốt nghiệp vụ.
- Designer payout request flow: chưa chốt quy trình duyệt/trả tiền.

### PO cần chốt
1. Có xoá `_bak_designer_profiles_20260924` sau backup offline không?
2. Production domain cho SEO (`VITE_SITE_URL`).
3. Có bật Google OAuth/password reset không, hay bỏ hẳn UI nhắc?
4. Legal content: ai cung cấp/duyệt `/terms`, `/privacy`, `/warranty-policy`?
5. Payment: tiếp tục manual (VietQR + admin confirm) hay mở gateway ngay? (Khuyến nghị manual trước)
6. Invoice: cột trên `orders` hay bảng `invoices`? (Khuyến nghị cột trước)
7. Review photos: bucket `review-images` mới hay dùng `product-images`? (Khuyến nghị bucket mới)
8. Có cho phép E2E live chạy trên production hay chỉ staging?
9. Có thêm Playwright vào CI browser hay giữ browser UAT manual/agent?
10. Mức dữ liệu mẫu được giữ: xoá hết hay giữ một bộ demo có nhãn cho sales?
11. Có cấp staging project/secret cho QA-API-01/QA-MONEY-01 không?
12. Có cho phép QA-MONEY-01 ghi DB staging + cleanup `E2E-` không?
13. ARCH-01 (feature flags table): làm ngay Phase 2 hay chỉ khi có ≥2 flow cần rollout?
14. Invoice: có cần e-invoice provider/credit note ngay không? (Khuyến nghị chưa)
15. Designer payout: ai duyệt, kỳ trả, hình thức trả? (cần chốt trước DES-02)

---

## 9. Verification plan cho chính plan này

- Mỗi item merge phải: `npm run lint` PASS, `npm run check` 23/23, `npm run test:unit` PASS.
- UI item: Playwright 390/1440, 0 `pageerror`, 0 tràn; screenshot trước/sau.
- DB/RLS item: `verify-rls`, `inspect-db`, `lint-rls-*`, SQL check; rollback plan.
- QA-API-01: dry-run + staging API/DB, **không** dùng làm acceptance vòng tiền.
- QA-BROWSER-01: 390/1440 route sweep, 0 pageerror/tràn, no data writes.
- QA-MONEY-01: staging write test + DB row assertions + cleanup; **dry-run không phải acceptance**.
- Dead code: build size before/after; grep symbol; no runtime errors.
- Docs: `node scripts/check-doc-refs.mjs`; cập nhật `docs/database/*`, `docs/security/*` khi schema/RLS đổi.
