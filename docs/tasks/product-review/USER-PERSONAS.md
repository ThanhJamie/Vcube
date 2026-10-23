<!-- doc-meta: status=active; verified=2026-10-23; owner=design-foundation -->
# USER PERSONAS — ai dùng VCUBE, cần gì, đau ở đâu

> Dựa trên **code thật** (role DB, route, service) + quan sát browser guest flow.
> Vai trò trong DB: `check (role in ('customer','designer','workshop','lab','admin'))`
> — `supabase/migrations/20260901_baseline_schema.sql:852`.
> `lab` và `workshop` dùng **cùng cổng `/lab`** (`AppRoutes.tsx:444-445`, `LabRoute.tsx:26-41`).
> Persona #6 (Điều phối viên) **không có role riêng** — suy ra từ chức năng admin/lab, ghi rõ.

| # | Persona | Role | Quan sát runtime? |
|---:|---|---|---|
| 1 | Khách vãng lai | — | ✅ 14 route × 390/1440 + upload STL + add-to-cart |
| 2 | Khách hàng | `customer` | ⚠️ code; guard quan sát được |
| 3 | Nhà thiết kế | `designer` | ⚠️ code; guard quan sát được |
| 4 | Xưởng in | `lab` / `workshop` | ⚠️ code; guard quan sát được |
| 5 | Quản trị viên | `admin` | ⚠️ code; guard quan sát được |
| 6 | Điều phối viên/vận hành (suy diễn) | *(không có)* | ❌ chỉ suy ra từ admin/lab |

---

## 1. Khách vãng lai (chưa đăng nhập)

**Hồ sơ:** kỹ sư cơ khí / founder phần cứng / người mua lẻ; vào từ Google hoặc link được chia sẻ;
**chưa có tài khoản, chưa tin VCUBE**. Đây là persona **quan trọng nhất** vì chiếm phần lớn traffic
và quyết định "có đáng bỏ thời gian không".

**Jobs-to-be-done**
1. "Tôi cần một mẫu CAD/linh kiện phù hợp — cho tôi xem nhanh có gì, giá bao nhiêu."
2. "Tôi có file STL/STEP — báo giá in cho tôi mà không phải gọi điện/đăng ký."
3. "Tôi cần tin là mẫu này in được, đúng vật liệu, đúng kích thước."
4. "Tôi muốn đặt thử một cái, không muốn tạo mật khẩu."
5. "Tôi cần tra cứu tiến độ đơn sau khi đặt."

**Bối cảnh:** desktop ở văn phòng (1440) hoặc điện thoại trong xưởng (390); không kiên nhẫn; so
sánh với Craftcloud/Protolabs/Etsy.

**Màn hình dùng**

| Route | Việc họ làm | Trạng thái |
|---|---|---|
| `/` | xem định vị + hero 3D + vài mẫu + dropzone báo giá | ✅ quan sát |
| `/explore` | duyệt 10 mẫu, lọc danh mục/thẻ/vật liệu/giá, sort, grid/table | ✅ quan sát |
| `/products/:id` | xem 3D, thông số, giá, cấu hình in, thêm giỏ | ✅ quan sát (`DEMO-P07`) |
| `/personalize` `/personalize/:id` | tuỳ biến (khắc, logo, màu, gói) | code (`PersonalizeView`) |
| `/quote` | upload STL → đo → chọn vật liệu/máy/layer → giá | ✅ quan sát (upload cube thật) |
| `/cart` | sửa số lượng, ship, VAT, checkout | ✅ quan sát |
| `/checkout` | nhập SĐT/địa chỉ, chọn COD/VietQR/VNPAY | ✅ quan sát form (không submit) |
| `/tracking` | nhập mã đơn + token/SĐT | ✅ quan sát cổng tra cứu |
| `/auth/login`, `/auth/register` | nếu muốn tài khoản | ✅ quan sát |

**Dữ liệu cần:** `products` (tên, giá, ảnh/3D, specs, license), `materials`, `printer_fleet`,
`pricing_configs`/`pricing_global_settings`, `site_content` (banner/footer/hotline), token đơn.

**Thành công đo bằng:** thời-gian-tới-giá (target < 60 giây từ lúc upload); tỷ lệ upload→cart;
tỷ lệ cart→checkout; 0 bước bắt buộc đăng nhập; 0 lỗi/hoang mang khi reload.

**Đau đớn hiện tại** (quan sát/code):
- **Ảnh sản phẩm trống** — card chỉ là khối xám placeholder (Explore 1440; 0 `<img>` trên
  `/explore`) ⇒ cảm giác "chưa xong", khó tin. `ExploreView.tsx` render card; DB demo không có ảnh.
- **Bộ lọc không vào URL** — đổi filter rồi refresh/Back là mất; không copy link cho đồng nghiệp
  được. `ExploreView.tsx:215-226` (state), **0 `setSearchParams`** trong file.
- **Bookmark chỉ là local state** — thông báo "Đã lưu" nhưng rời trang là mất, không đăng nhập
  được để giữ. `ExploreView.tsx:224,249-256`; PDP `ProductDetailView.tsx:78`.
- **Bảng "GIÁ" của quote không lưu** — báo giá xong không có mã báo giá, không gửi email, không
  chuyển thành đơn (chỉ thêm được line cart qua `QuoteSummaryPanel.tsx:739`). `dbService.saveQuote`
  (`database.ts:415`) **0 caller**.
- **Banner demo lặp 2 lần** ở đầu trang và có CTA "Xem Sản Phẩm Tag 2/9" — chiến dịch 2/9 không
  tồn tại, đọc như lỗi nội dung (quan sát `/` 390/1440). Dữ liệu từ `site_content` demo.
- **`/checkout` nói thật là "thanh toán mô phỏng — xác nhận thủ công"** và "Chưa cấu hình thông
  tin chuyển khoản" (`CheckoutView.tsx:143-146`, box VietQR) ⇒ khách không biết chuyển tiền thế nào.

---

## 2. Khách hàng (đã đăng nhập, role `customer`)

**Hồ sơ:** người đã mua hoặc đang theo dõi đơn; quay lại sau 1–7 ngày; cần trạng thái đơn, file
CAD đã mua, hoá đơn VAT, bảo hành. **Chưa quan sát runtime do thiếu account** — đọc code.

**Jobs-to-be-done**
1. "Đơn của tôi đang ở đâu, bao giờ xong?" (danh sách + chi tiết + tracking)
2. "Tôi đã mua file CAD — tải và dùng được chưa?"
3. "Cho tôi hoá đơn VAT / chứng từ."
4. "Hàng lỗi thì báo bảo hành."
5. "Mua lại / đặt lại đơn cũ."
6. "Tôi muốn yêu cầu thiết kế riêng và trao đổi với designer."
7. "Cập nhật thông tin tài khoản/địa chỉ."

**Màn hình dùng:** `/orders` (ProtectedRoute – `AppRoutes.tsx:299`), `/assets`
(`:314`), `/tracking`, `/cart`, `/checkout`, `/order-success*`, `/auth/*`, modal account
(`AuthModal`), `InvoiceModal`, `CustomIdeaRequestModal` (từ Home/PDP).

**Dữ liệu cần:** `orders` (của chính mình), `order_items`, `order_files`,
`digital_assets` (quyền đọc của người mua), `payment_transactions`, `warranty_claims`,
`reviews`, `custom_design_requests`, `user_profiles`.

**Thành công đo bằng:** mở `/orders` thấy đơn thật + trạng thái đúng; tải được file đã mua;
hoá đơn in được; bảo hành có mã hồ sơ; reorder tạo lại giỏ.

**Đau đớn hiện tại (P0/P1):**
- **P0 — `/orders` không bao giờ nạp đơn của khách.** `useOrdersData.ts:44-55` chỉ fetch khi
  `role === 'admin'`; `OrderService.getOrdersByCustomer` (`orderService.ts:46`) **0 caller**.
  ⇒ Khách đăng nhập, F5: luôn thấy "Bạn chưa có đơn hàng nào" kể cả khi DB có đơn
  (`MyOrdersView.tsx` empty-state) — **khẳng định sai sự thật**.
- **P0 — không nhận được file CAD đã mua.** `/assets` chỉ tải được khi `asset.storagePath` có
  thật (`AssetLibraryView.tsx:50-52`), nhưng chuỗi mua không ghi `order_files` / `storage_path`
  (không có writer nào trong `src/`; RLS `digital_assets` chỉ designer/admin —
  `20261010_harden_rls.sql:628-641`) ⇒ mua file số xong vẫn không có file.
- **`/order-success` không bền:** đơn chỉ nằm RAM; F5 → not-found (`OrderSuccessRoute` +
  `resolveOrderById` chỉ tìm trong `orders` state); route không id luôn not-found
  (`AppRoutes.tsx:257`).
- **Bảo hành chỉ là UI:** form ghi state rồi báo "đã ghi nhận", không ghi DB; chính comment
  code nói `warranty_claims` chưa nối (`MyOrdersView.tsx:89-100`).
- **"Đặt lại" không hoạt động:** gửi `reorderItems` (`MyOrdersView.tsx:73`) nhưng không ai đọc
  payload ⇒ sang `/quote` trắng.
- **Không có trang hồ sơ tài khoản:** account mode trong `AuthModal` chỉ hiển thị; không sửa
  tên/SĐT/địa chỉ; không đổi mật khẩu (reset bị tắt cờ — `AuthModal.tsx:14`).
- **Reviews không viết được:** PDP chỉ đọc `rating/reviewsCount` từ cột sản phẩm
  (`ProductDetailView.tsx:143-147,925-975`); không có service/ghi bảng `reviews` ⇒ khách không
  thể đánh giá sau mua (vòng tin cậy bị hở).

---

## 3. Nhà thiết kế (role `designer`)

**Hồ sơ:** cá nhân/xưởng thiết kế 3D đăng bán mẫu; tự đăng ký (chọn "Tác giả 3D" ở
`RegisterView.tsx:24,106-112`) rồi chờ duyệt; cần biết mẫu nào đang bán, doanh thu, giấy phép,
yêu cầu CAD riêng, tiền về. **Chưa quan sát runtime (thiếu account).**

**Jobs-to-be-done**
1. "Đăng mẫu mới: file, ảnh, mô tả, giá in/giá file, giấy phép."
2. "Quản lý mẫu đã đăng (sửa/xoá/trạng thái duyệt)."
3. "Nhận & trả lời yêu cầu thiết kế riêng (chat), nhận việc."
4. "Xem doanh thu/tổng quan."
5. "Quản lý giấy phép & tỷ lệ bản quyền."
6. "Xem/rút tiền (payout)."
7. "Biết trạng thái duyệt hồ sơ/KYC."

**Màn hình:** `/designer`, `/designer/:tab` (RoleGuard designer/admin, `AppRoutes.tsx:329,352`);
5 tab: `overview | models | wizard | payouts | requests`
(`DesignerDashboardView.tsx:12-13`); tab yêu cầu dùng `customDesignService` + realtime
`public:custom_design_requests` (`customDesignService.ts:380`).

**Dữ liệu cần:** `designer_profiles`, `designer_payout_info`, `products` (owner),
`custom_design_requests` + messages, `orders`/ledger để tính doanh thu.

**Thành công đo bằng:** mẫu được duyệt và hiện trên catalog; % yêu cầu được nhận/trả lời;
doanh thu nhìn thấy; payout có trạng thái; KYC rõ.

**Đau đớn hiện tại:**
- **Payout là màn hình tĩnh:** fixture rỗng + nút rút `disabled`, số dư `—`
  (`DesignerPayoutsTab.tsx:3,35,84,110`); không có bảng ledger/yêu cầu rút; admin không có
  màn duyệt payout (`Group2DesignersPanel` chỉ xem hồ sơ).
- **Doanh thu ở Overview mỏng:** `DesignerOverviewTab` chỉ nạp `inquiries` (yêu cầu), không có
  doanh thu/đơn (code: `useState` inquiries; không gọi ledger).
- **Không thấy trạng thái duyệt hồ sơ/KYC của chính mình** trong dashboard (không có khối
  trạng thái `designer_profiles.verified_status`/KYC; admin mới thấy — `Group3CustomersPanel`).
- **Upload chờ duyệt đúng** (`DesignerUploadWizardTab.tsx:128-134`) nhưng không có thông báo
  khi được duyệt (không email/realtime notification cho designer).
- **Chat theo request có thật** (`DesignerRequestsTab.tsx:98,117` claim + gửi tin) — điểm mạnh.

---

## 4. Xưởng in (role `lab` / `workshop`)

**Hồ sơ:** xưởng in/đối tác sản xuất; onboarding hồ sơ năng lực → chờ duyệt → nhận việc, cập nhật
tiến độ, quản máy/vật liệu/tồn kho, cấu hình giá riêng. **Chưa quan sát runtime (thiếu account).**

**Jobs-to-be-done**
1. "Đăng ký/hoàn thiện hồ sơ xưởng (năng lực, máy, vật liệu, khu vực)."
2. "Nhận đơn được giao, xem yêu cầu in, cập nhật tiến độ 8 nấc."
3. "Quản lý máy in (thêm/sửa/xoá, trạng thái)."
4. "Quản lý vật liệu & tồn kho, log nhập/xuất."
5. "Quản lý phụ kiện/linh kiện."
6. "Cấu hình xưởng: lead time, phí ship, rate riêng."
7. "Sổ kho/audit & đối soát."

**Màn hình:** `/lab`, `/lab/:tab` (RoleGuard `lab|workshop|admin`, `AppRoutes.tsx:444-445`),
onboarding wizard khi chưa duyệt/Pending (`LabRoute.tsx:26-41`), 6 tab
`queue | machines | materials | accessories | audit_trail | preferences`
(`WorkshopSettingsView.tsx:84`, `components/workshop/settings/tabs.ts`), Kanban 4 bước
(`WorkshopSettingsView.tsx:92`), 4 modal CRUD + form preferences.

**Dữ liệu cần:** `workshop_profiles`, `workshop_machines`, `workshop_materials`,
`workshop_accessories`, `material_inventory_logs`, `orders` (assigned_workshop_id),
`workshop_commission_terms`, `pricing_global_settings`.

**Thành công đo bằng:** hồ sơ được duyệt nhanh; hàng đợi có đơn thật đúng hạn; cập nhật tiến độ
đến tay khách; tồn kho không âm; rate riêng đúng trong báo giá.

**Đau đớn hiện tại:**
- **P1 — hàng đợi luôn rỗng:** `orders.assigned_workshop_id` **không có đường ghi** từ checkout
  (`CheckoutView.tsx:216-222` không truyền; `Group5ProductionPanel` có tab dispatcher nhưng
  không có thao tác lưu gán — chỉ đọc/lọc). `useOrdersData`/workshop `getMyQueueOrders` chỉ đọc.
- **P1 — cổng `/lab` cho xưởng `Suspended` đi qua:** `LabRoute.tsx:41` chỉ chặn `Pending`;
  schema có cả `Pending/Verified/Suspended` (`20260901_baseline_schema.sql:933`).
- **Đối soát/doanh thu xưởng không có:** không màn ledger/commission statement; chỉ có cấu hình
  commission (`workshop_commission_terms`) và setting.
- **Thông báo đơn mới không có:** không realtime cho orders (chỉ 3 channel: products, settings,
  custom_design_requests).
- Điểm mạnh: CRUD máy/vật liệu/accessory + inventory log + preferences là **thật**
  (`WorkshopSettingsView.tsx:339,452,619,688`).

---

## 5. Quản trị viên (role `admin`)

**Hồ sơ:** nội bộ VCUBE / chủ vận hành; cần catalog đúng, xưởng/designer được duyệt, giá đúng,
đơn chạy, kho đủ, nội dung/SEO đúng. **Chưa quan sát runtime (thiếu account);** guard đã quan sát
redirect đúng kèm `redirectTo`.

**Jobs-to-be-done**
1. "Tổng quan vận hành: đơn chờ, tồn kho thấp, KYC chờ."
2. "Quản lý sản phẩm/catalog (CRUD, ảnh, trạng thái)."
3. "Duyệt/giám sát xưởng, đội máy, năng lực."
4. "Quản lý designer: hồ sơ, giấy phép, payout."
5. "Quản lý khách hàng/KYC/NDA/RFQ."
6. "Cấu hình công thức giá + audit thay đổi."
7. "Điều phối đơn → xưởng, theo dõi queue/kanban."
8. "Kho vật liệu, phụ kiện."
9. "CMS trang chủ + SEO."
10. "Cài đặt hệ thống (VAT, phí ship, ngưỡng…)."

**Màn hình:** `/admin`, `/admin/:section` (RoleGuard admin `AppRoutes.tsx:379,410`);
`validSections` **22 mục** (`AdminDashboardView.tsx:118-124`); nav 16 nhóm
(`AdminSidebar.tsx:47-176`); 11 panel + 6 group panel (lazy).

**Dữ liệu:** toàn bộ 32 bảng; trọng tâm `products`, `orders`, `workshop_*`, `user_profiles`,
`designer_profiles`, `pricing_configs/pricing_global_settings`, `site_content`, `materials`,
`printer_fleet`, `accessories`, `setting_audit`.

**Thành công đo bằng:** 0 đơn kẹt; 100% KYC/workshop xử lý trong ngày; giá không lệch engine;
tồn kho chính xác; nội dung/SEO đã phát hành.

**Đau đớn hiện tại:**
- **P1 — điều phối đơn→xưởng chưa lưu được:** tab dispatcher tồn tại
  (`Group5ProductionPanel.tsx:26,156`) nhưng không ghi `assigned_workshop_id` ⇒ queue/xưởng
  không bao giờ có đơn.
- **P1 — duyệt payout designer không có:** không màn/không bảng yêu cầu rút; designer thấy
  "đang xử lý" vĩnh viễn ở trạng thái trống.
- **Đối soát thanh toán thiếu:** đơn ghi `payment_status` nhưng không ghi
  `payment_transactions` (0 caller) ⇒ admin không có sổ giao dịch để đối chiếu COD/VietQR.
- **Bề mặt rộng → khó học:** 22 section + 16 nav + nhiều tab trong panel; chưa có "hôm nay cần
  làm gì" (dashboard là số đếm, không phải hàng đợi hành động).
- **3 registry section dễ lệch** (validSections/breadcrumb/nav) — đã giảm nhưng vẫn nhiều nguồn.
- **Orders của admin không realtime** (`useOrdersData.ts` fetch 1 lần theo role) ⇒ badge/queue
  có thể cũ.

---

## 6. Điều phối viên / vận hành nội bộ (SUY DIỄN — không có role riêng)

**Vì sao suy ra:** DB chỉ có 5 role; nhưng công việc "điều đơn→xưởng, đối soát thanh toán, CSKH,
duyệt KYC" nằm rải trong admin + lab và **không role nào sở hữu trọn**. Nếu VCUBE vận hành thật,
đây là người dùng số 1 hằng ngày.

**Jobs-to-be-done (từ chức năng hiện có):**
1. Gán đơn cho xưởng phù hợp (năng lực/vật liệu/khu vực/SLA).
2. Theo dõi tiến độ 8 nấc, đôn đốc xưởng trễ.
3. Đối soát COD/VietQR, xác nhận đã thanh toán.
4. Duyệt KYC/NDA/workshop, xử lý yêu cầu CAD.
5. Trả lời khách (chat/hotline) và xử lý bảo hành.

**Bằng chứng chức năng đã có nhưng chưa thành một persona:** dispatcher tab
(`Group5ProductionPanel.tsx:26`), KYC tab (`Group3CustomersPanel.tsx:85-119`), queue admin
(`AdminSidebar.tsx:130`), chat khách (`ChatSupportModal`), bảo hành (`MyOrdersView`).
**Thiếu:** role/queue công việc chung + audit thao tác; không có thông báo/assign tự động.

---

## Phụ lục — bằng chứng runtime guest (2026-10-23)

- 14 route × {1440, 390}: **0 pageerror, 0 overflow**, header+main render, guard redirect đúng.
- Upload STL thật (`20×20×20 mm`, 12 tam giác) trên `/quote`: đo **8,0 cm³**, chọn máy/vật liệu/
  layer, ra giá **111.000 đ** — ảnh `screens/quote-analyzed-1440.png`.
- Thêm giỏ từ PDP: toast "Đã thêm 1x … vào đơn hàng!", badge header = 1, `/cart` hiện đúng dòng
  hàng + ship 30.000 + VAT 8% + tổng 378.000 — ảnh `screens/cart-with-item-1440.png`.
- `/checkout` guest mode + form đầy đủ + 3 phương thức thanh toán (nhãn "mô phỏng/thủ công").
- Chưa submit đơn (tránh ghi DB) ⇒ trạng thái thành công/confetti chưa quan sát.
