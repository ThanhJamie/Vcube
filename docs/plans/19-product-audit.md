# 19 — Audit sản phẩm theo vai: khách hàng · nhà thiết kế · xưởng in

Mục đích: trả lời *"tối ưu về thẩm mĩ, tính năng, và logic giữ chân khách"* bằng **bằng chứng đo được**, không phải cảm nhận. Mọi số dưới đây lấy từ code + DB thật ngày 2026-09-12.

---

## 0. Tóm tắt một câu

Sàn có **2 phía cung – cầu**, nhưng **phía cung (xưởng in) không dùng được sản phẩm**: vai `lab` tồn tại trong hệ thống quyền, có nhãn UI, nhưng **không có một route nào**. Và cả 3 vai đều thiếu **vòng lặp quay lại** (đánh giá, thông báo, mua lại) — nên khách mua xong là hết lý do quay lại.

---

## 1. Bằng chứng nền

### 1.1 Bề mặt kỹ thuật hiện có

| Hạng mục | Số đo |
|---|---|
| Route | **16** (`/`, `/explore`, `/products/:id`, `/personalize[/:id]`, `/quote`, `/cart`, `/checkout`, `/order-success[/:id]`, `/tracking[/:id]`, `/orders`, `/assets`, `/designer[/:tab]`, `/admin[/:section]`, `/auth/login`, `/auth/register`) |
| View | 16 file, **12.860 dòng** |
| Bảng DB đã tạo | **25** (gồm `quotes`, `cost_rules`, `payment_transactions`, `kyc_records`, `material_inventory_logs`, `designer_profiles`, `customer_profiles`, `workshop_profiles`, `warranty_claims`, `order_files`) |
| Bảng **CHƯA có** | `reviews` (404) · `cart_items` (404) · `digital_assets` (404) |
| Dữ liệu thật | `user_profiles` **3** dòng (3 tài khoản test). **Tất cả bảng nghiệp vụ = 0**: products, materials, printer_fleet, accessories, orders, workshop_partners, designer_profiles, customer_profiles, pricing_configs |
| Lazy-load | chỉ **3 view** (`Tool3DView`, `AdminDashboardView`, `DesignerDashboardView`) + 6 panel admin. 12 view còn lại nằm trong bundle chính (754 kB) |
| Thanh toán | `payment_transactions` có bảng, **0 cổng thanh toán** (không payos/vnpay/momo/stripe) — dừng ở màn chuyển khoản |
| Chat | `ChatSupportModal` là **bot trả lời tĩnh** (`setTimeout`) — không có messaging thật giữa 3 phía |

### 1.2 🔴 Lỗ hổng cấu trúc lớn nhất: vai `lab` không có cửa vào

- `src/types/index.ts:711` → `export type UserRole = 'customer' | 'designer' | 'admin' | 'lab';`
- UI **có** nhắc tới `lab`: `RoleGuard.tsx:53` (nhãn *"Xưởng in / Đối tác sản xuất (3D Print Lab)"*), `UserAvatarMenu.tsx:319,480`, `Header.tsx:427,431,447,457` (badge **"MES Hub"**).
- Route thì **không**: chỉ có `/designer` (`allowedRoles={['designer','admin']}`) và `/admin` (`['admin']`).
- **`src/frontend/views/WorkshopSettingsView.tsx` — 1.588 dòng, file lớn thứ 2 dự án — HOÀN TOÀN MỒ CÔI.** grep toàn repo: chỉ tự tham chiếu (interface / component / default export). Không ai import, không route nào trỏ tới.
- **`src/frontend/components/onboarding/WorkshopOnboardingWizard.tsx` — cũng 0 người gọi.**

⇒ Người dùng có `role='lab'` đăng nhập sẽ **không có gì để làm**. Xưởng in không nhận được việc, không báo được tiến độ, không quản được máy/vật liệu. Admin thì *quản lý* xưởng (Group1/Group5) nhưng **xưởng không tự phục vụ được**.

---

## 2. Khách hàng — người mua

### 2.1 Họ cần gì để tin và mua
| Nhu cầu | Có? | Bằng chứng |
|---|---|---|
| Biết giá **trước khi** có file | ❌ | Chỉ `/quote` sau khi upload; chưa có bảng giá tham chiếu theo vật liệu/khối lượng |
| Tìm đúng thứ nhanh | ⚠️ | `ExploreView` 1.206 dòng, lọc tag/danh mục/giá/vật liệu — nhưng **DB products = 0** nên chưa từng chạy thật |
| Xem sản phẩm trước khi mua | ⚠️ | `ProductDetailView` 806 dòng + viewer 3D; **nhưng 0 sản phẩm, 0 ảnh thật** (ảnh hiện là Unsplash stock) |
| **Biết người bán có tốt không** | ❌ | **Không có bảng `reviews`** (404). `rating`/`reviewsCount` có trong type nhưng luôn rỗng ⇒ mọi chỗ phải hiện "Chưa có đánh giá" |
| Trả tiền dễ | ❌ | Không có cổng thanh toán ⇒ dừng ở "chuyển khoản thủ công". Đây là **nút thắt chuyển đổi lớn nhất** |
| Theo dõi đơn | ✅ | `/orders`, `/tracking/:id`, `OrderProgress` 8 nấc (đã bỏ số bịa) |
| Biết quyền bảo hành | ⚠️ | Bảng `warranty_claims` **đã có** nhưng **0 code client gọi** ⇒ khách không tạo được yêu cầu |
| Mua lại / in lại | ❌ | `/assets` có thư viện file đã mua nhưng **không có luồng "đặt lại"** |
| Lưu để xem sau | ❌ | Không có wishlist/favorite (grep = 0 file thật) |
| Giỏ hàng bền | ❌ | **Không có bảng `cart_items`** ⇒ giỏ chỉ trong RAM/localStorage, mất khi đổi thiết bị |
| Được nhắc quay lại | ❌ | Không có thông báo/email; chat là bot tĩnh |

### 2.2 Thẩm mĩ khi kho rỗng (đây là điều khách mới **thực sự** thấy hôm nay)
Sau khi dọn sạch dữ liệu bịa, khách mới gặp: catalog trống, 3 thẻ số liệu "Chưa cấu hình", không ảnh sản phẩm, không đánh giá, không con số xã hội nào. **Trung thực nhưng lạnh.** Cần: ảnh/khối minh hoạ thật, empty state có ích (đã thêm CTA `/quote`), và **nội dung thật do admin nhập**.

---

## 3. Nhà thiết kế 3D

### 3.1 Họ cần gì để dám bán ở đây
| Nhu cầu | Có? | Bằng chứng |
|---|---|---|
| Studio quản lý ấn phẩm | ✅ | `DesignerDashboardView` 1.550 dòng, 5 tab: *Tổng Quan & Doanh Thu* · *Quản Lý Ấn Phẩm & Giá* · *Đăng Tải & Cấu Hình Mới* · *Yêu Cầu CAD & Chat* · *Quyết Toán Tiền Mặt* |
| Upload + đặt giá | ✅ | `handlePublishModel`, `handleAutoEstimatePrice`, `handleSaveEditProduct`, `handleToggleProductStatus` |
| Nhận tiền minh bạch | ⚠️ | `handleRequestPayout` + tab Quyết Toán; nhưng số liệu doanh thu lấy từ fixture đã rỗng |
| Yêu cầu CAD riêng + chat | ⚠️ | tab `requests` + `handleSendChatMessage`; nhưng **chat không có backend** |
| **Bán file số** | ❌ | **Không có bảng `digital_assets`** (404) ⇒ không có nơi lưu/trao file số |
| **Chống bị copy** | ❌ | Không watermark, không DRM, không giới hạn tải. **Đây là nỗi sợ số 1 của designer** |
| Xem trước mà không lộ file | ❌ | `CadQuickViewModal` bán "quyền xem"; không có preview có watermark/giới hạn |
| Tự chọn giấy phép | ❌ | `licenseType` từng hardcode `'Commercial License'` (đã sửa thành `—`), **không có UI để designer tự khai** |
| Uy tín (sao, lượt bán) | ❌ | Không có `reviews`; `rating`/`isVerified` từng bị bịa (đã sửa), nay luôn rỗng |
| Biết cái gì bán chạy | ⚠️ | Tab Tổng Quan có KPI nhưng nguồn dữ liệu rỗng |
| Công cụ định giá đúng chi phí | ⚠️ | `handleAutoEstimatePrice` vẫn dùng **định mức mẫu** (PC-09, đã dán nhãn "tạm tính") |

---

## 4. Xưởng in — **phía cung, và họ không có gì**

### 4.1 Họ cần gì
| Nhu cầu | Có? |
|---|---|
| Đăng nhập và có màn hình riêng | ❌ **không có route** |
| Nhận việc / hàng đợi đơn | ❌ (admin có `Group5ProductionPanel`, nhưng xưởng không thấy) |
| Cập nhật tiến độ 8 nấc cho khách | ❌ (khách có `OrderProgress`; xưởng không có chỗ bấm) |
| Khai báo máy in / vật liệu / tồn kho | ⚠️ UI đã viết (`WorkshopSettingsView` 1.588 dòng) nhưng **mồ côi** |
| Báo giá và nhận đơn | ❌ |
| Nhận tiền / đối soát | ❌ |
| Hiệu suất (đúng hạn, tỉ lệ lỗi) | ❌ |
| Onboarding trở thành đối tác | ⚠️ `WorkshopOnboardingWizard` đã viết nhưng **0 người gọi** |

### 4.2 Nghịch lý
Admin có **6 panel** để quản xưởng (`Group1WorkshopsPanel` 54 kB, `Group5ProductionPanel` 41 kB) — tức hệ thống **đã có dữ liệu và luồng cho xưởng**, chỉ thiếu **cửa cho chính xưởng tự vào**. Đây là việc **rẻ mà giá trị cao nhất** trong toàn bộ audit: phần lớn UI đã tồn tại, chỉ cần nối route + quyền + chọn đúng dữ liệu của chính xưởng đó.

---

## 5. Bốn thứ thiếu ở **cả ba vai** (vòng lặp giữ chân)

| # | Thiếu gì | Hệ quả |
|---|---|---|
| 1 | **Không có thông báo** (in-app/email) | Khách không biết đơn tới đâu; designer không biết có yêu cầu mới; xưởng không biết có việc mới ⇒ mọi bên phải tự quay lại kiểm tra |
| 2 | **Không có messaging thật** | Chat hiện là bot tĩnh ⇒ không thương lượng được giá/độ khó/kích thước — thứ mà gia công cơ khí **luôn** cần |
| 3 | **Không có đánh giá/uy tín** | Không có `reviews`. Sàn không thể tự xây niềm tin, cả 3 vai đều không tích luỹ được gì sau mỗi đơn |
| 4 | **Không có lý do quay lại sau khi nhận hàng** | Không đánh giá, không điểm thưởng, không nhắc bảo hành, không gợi ý in lại ⇒ mỗi đơn là một giao dịch rời rạc |

---

## 6. Đề xuất ưu tiên (theo tỉ lệ giá trị / công sức)

| Ưu tiên | Việc | Vì sao | Công sức |
|---|---|---|---|
| **P0** | **Mở cổng cho xưởng in**: route `/lab` + `RoleGuard(['lab','admin'])` + nối `WorkshopSettingsView` + onboarding; xưởng chỉ thấy **dữ liệu của chính mình** | Phía cung của sàn đang không tồn tại. UI đã viết sẵn 1.588 dòng | **Thấp** (nối dây, không viết mới) |
| **P0** | **Hàng đợi việc cho xưởng**: nhận việc → cập nhật 8 nấc → xác nhận hoàn thành | Không có nó thì đơn đặt xong cũng không ai sản xuất | Trung bình |
| **P1** | **Bảng `reviews` + đánh giá 2 chiều** (khách ↔ designer, khách ↔ xưởng) | Niềm tin là thứ sàn phải tự xây; hiện `rating` luôn rỗng nên mọi chỗ hiện "Chưa có đánh giá" | Trung bình (thêm 1 bảng + UI) |
| **P1** | **Bảo hành**: nối `warranty_claims` (bảng đã có, 0 code gọi) | Khách biết quyền của mình ⇒ tin hơn; là cam kết **thật** thay cho "Đổi mới 100%" bịa đã gỡ | Thấp–Trung bình |
| **P1** | **Thông báo**: badge in-app + email khi trạng thái đơn đổi | Bơm vòng lặp quay lại cho cả 3 vai | Trung bình |
| **P2** | **Bảng giá tham chiếu trước khi upload** (theo vật liệu × khối lượng × công nghệ) | Cứu khách **chưa có file** — nhóm khách đông nhất và đang rời đi ngay | Thấp–Trung bình |
| **P2** | **Bán file số**: bảng `digital_assets` + watermark/tải có kiểm soát + designer tự khai giấy phép | Mở doanh thu thứ hai; chặn nỗi sợ copy của designer | Cao |
| **P2** | **Giỏ hàng bền**: bảng `cart_items` | Giỏ hiện mất khi đổi thiết bị | Thấp |
| **P3** | Messaging thật 3 phía · loyalty/coupon · mua lại 1 chạm | Tăng LTV nhưng cần P0/P1 làm nền | Trung bình–Cao |
| **P3** | **Thanh toán online** | Nút thắt chuyển đổi lớn nhất, nhưng chủ dự án đã chốt "giữ dạng sample, không tích hợp PSP" ⇒ cần quyết lại | Cao (phụ thuộc đối tác) |

### 6.1 Thẩm mĩ — 3 việc cụ thể
1. **Ảnh thật thay stock**: hiện sản phẩm/designer dùng ảnh Unsplash. Sàn gia công cần ảnh **thật** (mẫu in, xưởng, máy) — nếu chưa có, dùng khối minh hoạ hình học thay vì ảnh stock giả.
2. **Empty state có sức hút** ở `/`, `/explore`, `/assets`: hiện đã trung thực và có CTA, nhưng cần thêm **giá trị ngay cả khi rỗng** (ví dụ: bảng giá tham chiếu, ví dụ mẫu, quy trình 3 bước).
3. **Nhịp thị giác cho `/lab` mới**: khi mở cổng xưởng, phải theo dark-first + token hiện có (đừng tạo ngôn ngữ mới) — dùng `StatCard`/`DataTable`/`EmptyState` trong `src/frontend/ui`.

---

## 7. Câu hỏi cần chủ dự án chốt
1. **Mở cổng xưởng in (P0) ngay chứ?** Đây là việc rẻ nhất và vá lỗ hổng lớn nhất.
2. **Thanh toán online**: giữ "sample" như đã chốt, hay mở lại để bàn (đây là nút thắt chuyển đổi số 1)?
3. **Bán file số (digital assets)**: có nằm trong phạm vi không? (quyết định có cần bảng `digital_assets` + watermark)
4. **Thứ tự P1**: đánh giá · bảo hành · thông báo — chọn cái nào trước?
