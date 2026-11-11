<!-- doc-meta: status=analysis; verified=2026-11-10; owner=lead -->
# VCUBE — Phân tích vận hành & UI/UX bốn khu vực

> **Loại tài liệu:** phân tích read-only để PO review, **không phải implementation plan**.
> **Mốc source:** `main` local `39be1fd` (người dùng nhắc `e46f2be`; từ đó đã có đợt khép audit UI/UX).
> **Phương pháp:** 4 worker đọc source + quan sát UI; coordinator đối chiếu; reviewer độc lập kiểm bằng chứng.
> **Không sửa code/UI, không migration, không ghi/xoá DB, không submit đơn, không push/deploy.**
> UI dùng tài khoản/REST **mock** khi thiếu tài khoản thật; mock chỉ chứng minh giao diện của trạng thái, không chứng minh DB/RLS.

---

## 1. Tóm tắt & giới hạn kiểm chứng

### 1.1 Kết luận điều hành

Bốn khu vực **có đủ khung UI để điều hành cơ bản**, nhưng chuỗi bàn giao giữa các vai trò bị đứt ở dữ liệu và trạng thái:

1. **Đơn hàng:** **source có luồng tạo đơn** (chưa submit DB nên chưa chứng minh giao dịch hoàn tất), nhưng **rời `/checkout` là mất hướng dẫn chuyển khoản**; không có màn “thanh toán lại”. Admin có danh sách/Kanban; modal chi tiết **không mở trên dev do StrictMode**, nhưng **production build đã mở được với mock** (dev-only); không có hủy/hoàn tiền, không thông báo bền.
2. **Xưởng in:** hàng đợi chỉ là `orders` đã gán xưởng; **DB có `items` jsonb nhưng mapper/UI bỏ màu, không snapshot tệp/kích thước/thông số/hạn/liên hệ**; hai bộ nhãn 8 nấc + hai bộ mapping status + một bộ 6 cột lab khác nghĩa; trừ kho tự động sai khóa và thiếu khối lượng.
3. **Xưởng thiết kế:** có quản lý ấn phẩm/upload private/claim atomic, nhưng **vòng yêu cầu CAD chỉ nửa vòng**: khách gửi brief (guest bị RLS chặn), designer chat/báo giá, **khách không có UI xem/duyệt**, không có upload bản cuối, không có bàn giao sang in/catalog.
4. **Quản trị:** navigation rộng và có phân quyền route, nhưng **dashboard không phải “việc cần làm”**, doanh thu cộng cả đơn huỷ, storefront có lost-update/không rollback/audit mù, và **admin không thêm được ảnh/mô tả sản phẩm** để cứu hàng designer.

**Điểm dừng đầu tiên của từng hành trình** được ghi ở §5. Không có hành trình xuyên vai trò nào hoàn tất trọn vẹn với dữ liệu thật trong phạm vi quan sát.

### 1.2 Đã quan sát / chưa quan sát

| Hạng mục | Đã làm | Ý nghĩa |
|---|---|---|
| Source | Đọc 4 nhóm view/component/service/type/migration liên quan | Kết luận “Source” là suy ra từ code, chưa chạy DB thật |
| Browser | 390/1440 đầy đủ cho 4 khu vực; **768 chỉ một phần** (lab queue, admin overview, một số màn phụ). Admin/lab/designer/buyer dùng **mock session + mock REST** | Chứng minh render/luồng UI của trạng thái; không chứng minh dữ liệu/RLS production |
| Mock | 4 worker dùng fixture khác nhau | Số liệu cross-worker (trạm in, low-stock, doanh thu) **không so sánh trực tiếp**; chỉ dùng để chứng minh hành vi UI |
| Ảnh | `/tmp/opencode/ops-analysis/worker-{a,b,c,d}-*.png` | Không chứa PII thật; dùng mock name/email |
| DB | Không ghi/xoá; không submit đơn; không publish/upload/save | Không xác minh ghi thật, trigger, RLS live |
| Tài khoản | Không có admin/lab/designer/buyer thật | Các màn đó là **mock UI**, không phải phiên thật |
| Catalog | Không có published catalog thật | Explore/PDP/order thật chưa kiểm chứng |
| Production | Chỉ dev server | Khác biệt production build chưa kiểm chứng |

**CHƯA KIỂM CHỨNG:** RLS/trigger thực tế; `create_order_atomic`/`confirm_payment_atomic` đã áp hay chưa; email/thông báo; upload Storage; CMS save; in hoá đơn; realtime hai tab; tài khoản thật; catalog published; `/lab` với hồ sơ xưởng thật.

---

## 2. Route / tab / role matrix

### 2.1 Đơn hàng

| Route / màn | Role | Nguồn dữ liệu | Trạng thái |
|---|---|---|---|
| `/cart` | mọi người | `useCartStore` (local persist) | Có/không có món |
| `/checkout` | guest + buyer | cart + `app_settings` + `pricing_global_settings` | Có/không có món; lỗi tạo đơn; sau tạo đơn |
| `/order-success`, `/order-success/:id` | chủ đơn / guest + `?token` | DB theo id/token; payload RAM | loading/not-found/lỗi |
| `/tracking`, `/tracking/:id` | mọi người / guest token | RPC `get_order_by_guest_token`; buyer qua `orders` | portal/not-found/lỗi (nuốt thành not-found) |
| `/orders` | ProtectedRoute (buyer; admin/lab cũng vào được do RLS) | `orders` RLS | có/rỗng/lỗi thành rỗng |
| `/admin/orders` | admin | `orders` toàn bộ | dispatcher mặc định |
| `/admin/queue` | admin | cùng panel, tab Kanban | Kanban 8 nấc |
| InvoiceModal | người có đơn | DB + payload | **Xem/in thông tin đơn** (không phải quy trình phát hành hoá đơn) |

### 2.2 Xưởng in

| Route / tab | Role | Nguồn dữ liệu | Ghi chú |
|---|---|---|---|
| `/lab/queue` | lab/workshop/admin (admin bị wizard nếu không có hồ sơ) | `orders.assigned_workshop_id` | Chỉ đơn đã gán; không auto-dispatch |
| `/lab/machines` | như trên | `workshop_machines` | Trạng thái máy thủ công |
| `/lab/materials`, `/lab/accessories` | như trên | `workshop_materials`, `workshop_accessories` | Kho của xưởng |
| `/lab/warranty` | như trên | `warranty_claims` của đơn đã giao | Không nối in lại |
| `/lab/audit_trail` | như trên | `material_inventory_logs` | Sổ kho |
| `/lab/preferences` | như trên | `workshop_profiles` | Rate điện/nhân công |
| `/admin/queue` | admin | `orders` + `workshop_profiles` | Kanban/Dispatcher/Đội máy |
| `/admin/orders` | admin | cùng panel | Dispatcher |
| `/admin/inventory` | admin | catalog `materials`/`accessories` | **Khác kho xưởng** |
| `/admin/machines` | admin | `printer_fleet` | **Khác máy xưởng** |

### 2.3 Xưởng thiết kế

| Route / tab | Role | Nguồn dữ liệu | Ghi chú |
|---|---|---|---|
| `/designer/overview` | designer/admin | products + custom requests | Metric trộn toàn catalog |
| `/designer/models` | designer/admin | `products` (own) | Sửa/xoá trạng thái chưa publish |
| `/designer/wizard` | designer/admin | Storage `cad-files` + `digital_assets` + `products` | Upload thật; tạo `under review` |
| `/designer/requests` | designer/admin | `custom_design_requests` + view `open_design_requests` | Chat/quote; không file |
| `/designer/payouts` | designer/admin | `designer_payout_info` | Không có nguồn số dư |
| `CustomIdeaRequestModal` (Home) | mọi người (guest UI mở, DB chặn) | `custom_design_requests` | Entry point duy nhất của khách |
| `/admin/designers` | admin | `designer_profiles`, payouts | Không có yêu cầu CAD |

### 2.4 Quản trị

17 item nav + 6 alias = 23 section + `/admin`:

| Nhóm | Item/route |
|---|---|
| Tổng quan | `overview` (alias `group0-overview`) |
| Xưởng in & Thiết bị | `partners` (alias `workshops`), `machines` |
| Nhà thiết kế | `designers` |
| Khách hàng | `users` (alias `customers`) |
| Danh mục & Định giá | `pricing` (alias `pricing-engine`, `pricing-setup`, `cost-rules`), `materials`, `hardware`, `quote-calc` |
| Vận hành sản xuất | `queue`, `orders`, `inventory` |
| Cửa hàng & Hệ thống | `products`, `storefront`, `seo`, `settings`, `audit-log` |

Role: chỉ `admin`; `RoleGuard` chặn route. Không có admin role tách content/ops/finance.

---

## 3. Feature inventory đến cấp thao tác

Quy ước: **ĐÃ CÓ** = có UI + handler + nguồn dữ liệu; **MỘT PHẦN** = có UI nhưng thiếu dữ liệu/bước/guard; **CHƯA CÓ** = không thấy trong source/UI; **CHƯA KIỂM CHỨNG** = có code nhưng không quan sát được bằng dữ liệu/tài khoản thật.

### 3.1 Đơn hàng

| Thao tác | Trạng thái | Ghi chú |
|---|---|---|
| Tạo đơn từ checkout | ĐÃ CÓ (source) / CHƯA KIỂM CHỨNG ghi DB | `saveOrder`; guest/buyer; idempotency legacy có rủi ro |
| Hiển thị hướng dẫn CK ngay sau tạo | ĐÃ CÓ | Chỉ trong state `createdOrder` của checkout |
| Xem lại hướng dẫn CK từ `/orders`/`/tracking` | **CHƯA CÓ** | Không có bank/STK/nội dung CK trong 3 màn |
| Tra cứu token | ĐÃ CÓ | RPC SECURITY DEFINER |
| Tra cứu SĐT | **CHƯA CÓ (UI hứa có)** | `token < 12` bị chặn client, không request |
| Danh sách đơn buyer | ĐÃ CÓ | 7 tab; lỗi mạng thành rỗng |
| Reorder | MỘT PHẦN | Chỉ mở `/quote`, không dựng lại cấu hình |
| Hoá đơn khách | ĐÃ CÓ | In từ DB/RAM |
| Admin xem/điều phối | ĐÃ CÓ | Kanban + dispatcher |
| Admin mở chi tiết | **CHƯA KIỂM CHỨNG / lỗi dev** | Click không mở modal trên dev; production chưa rõ |
| Admin xác nhận thanh toán | MỘT PHẦN | Nằm trong modal chi tiết; modal không mở trên dev (StrictMode), production chưa kiểm chứng; client-side 4 bước |
| Admin hủy/hoàn tiền | **CHƯA CÓ** | Không writer `cancelled` |
| Admin nhập carrier/tracking | **CHƯA CÓ** | `estimatedDelivery` luôn rỗng |
| Thông báo trạng thái | MỘT PHẦN | Realtime in-app; không email/SMS; admin không realtime |
| Audit ai đổi trạng thái | **CHƯA CÓ** | Chỉ `updated_at` |

### 3.2 Xưởng in

| Thao tác | Trạng thái | Ghi chú |
|---|---|---|
| Nhận việc | ĐÃ CÓ / không an toàn | Ghi thẳng nấc 2; bấm trên đơn xong sẽ lùi |
| Cập nhật nấc | ĐÃ CÓ | 8 nút; không confirm/undo |
| Phân công máy | **CHƯA CÓ** | Không writer `assigned_printer_id` |
| Bắt đầu/tạm dừng | **CHƯA CÓ** | Trạng thái máy thủ công |
| Báo lỗi/in lại | **CHƯA CÓ ở lab**; admin chỉ RAM | Không lưu |
| QC | MỘT PHẦN | Lab chỉ đổi nấc; admin ghi RAM |
| Đóng gói | **CHƯA CÓ** | Không bước riêng |
| Bàn giao/đã giao | MỘT PHẦN | Chỉ đổi status; không carrier/ảnh |
| Trừ kho tự động | MỘT PHẦN / hỏng | Sai khóa `partner_id` vs uuid |
| Xem/tải tệp in | **CHƯA CÓ** | `orders.items` không có file/dimension |
| Lịch sử sản xuất | **CHƯA CÓ** | Không audit |
| Bảo hành | ĐÃ CÓ | Không nối in lại |
| Sổ kho | ĐÃ CÓ | Ghi tay; có thể âm |

### 3.3 Xưởng thiết kế

| Thao tác | Trạng thái | Ghi chú |
|---|---|---|
| Khách gửi brief | MỘT PHẦN | Modal Home; guest bị RLS chặn; không file/kích thước |
| Designer xem chợ mở/đã nhận | ĐÃ CÓ | View SEC-02 cho chợ mở |
| Claim việc | ĐÃ CÓ (source) / CHƯA KIỂM CHỨNG runtime | RPC atomic; không đổi status |
| Chat | MỘT PHẦN | Text; không file; race |
| Báo giá | MỘT PHẦN | Mobile ẩn input tiền; không accept/expiry |
| Cập nhật trạng thái | **CHƯA CÓ** | `updateStatus` 0 caller |
| Khách xem/duyệt | **CHƯA CÓ** | Không route/UI |
| Upload nháp/bản cuối | **CHƯA CÓ** | `attachment` chỉ render |
| Quản lý phiên bản | **CHƯA CÓ** | Wizard hardcode V1.0 |
| Bàn giao catalog | MỘT PHẦN / chặn | Thiếu ảnh; admin không thêm ảnh |
| Bàn giao sang in | **CHƯA CÓ** | Request không tạo order |
| Payout | MỘT PHẦN | Không nguồn số dư; rút tiền disabled |

### 3.4 Quản trị

| Thao tác | Trạng thái | Ghi chú |
|---|---|---|
| Điều hướng 17 mục | ĐÃ CÓ | Alias không active; search thiếu synonym |
| Dashboard chỉ số | MỘT PHẦN | Doanh thu sai; low-stock lệch; chart luôn rỗng |
| Tạo sản phẩm | ĐÃ CÓ | Có ảnh URL; giá 0 copy mâu thuẫn |
| Sửa sản phẩm | MỘT PHẦN | Không sửa ảnh/mô tả/specs |
| Publish | MỘT PHẦN | Guard UI/service; direct API gap; thiếu ảnh chặn |
| Hàng chờ duyệt | **CHƯA CÓ** | Không filter status/queue |
| Storefront preview | MỘT PHẦN | Chỉ 2/6 tab |
| Storefront save | MỘT PHẦN | Lost update; không rollback; audit mù |
| Settings pháp lý | ĐÃ CÓ | Audit thật; không dirty guard |
| SEO | MỘT PHẦN | Cùng lost update; không audit |
| Audit log | MỘT PHẦN | Không realtime; trần 200; không filter ngày/người |
| Phân quyền | MỘT PHẦN | Một role admin; promote không transaction; không revoke |

---

## 4. Phân tích UI/UX từng tab

### 4.1 Đơn hàng

**`/checkout` — tạo đơn**
- Mục đích: nhập PII, chọn thanh toán, tạo đơn thật.
- Vùng: 3 section (nhận hàng, thanh toán, VAT); sidebar item + tổng; CTA duy nhất “XÁC NHẬN & TẠO ĐƠN HÀNG”.
- Sau khi tạo: **ở lại trang**, hiện khối “Đã tạo đơn hàng” + hướng dẫn CK + token + 2 CTA. Khối VietQR **trước** khi tạo đơn cũng có bank/STK/chủ TK; đây là hai chỗ duy nhất có dữ liệu chuyển khoản.
- Trạng thái: rỗng (empty state mới), có món, loading, lỗi DB thật; VNPAY disabled.
- 390: 1 cột, CTA cuối; 1440: 8/4 cột, sidebar sticky. Không tràn.
- **Vấn đề:** rời trang là mất hướng dẫn CK (không có ở `/orders`, `/tracking`, `/order-success`, `InvoiceModal`); không có “thanh toán lại”.

**`/order-success/:id`**
- Mục đích: xác nhận, token, hoá đơn, đi tiếp.
- CTA: “THEO DÕI TIẾN ĐỘ” (nếu physical), “Xem/In hoá đơn”, “Mở Kho Tệp CAD”.
- **Vấn đề:** guest bấm theo dõi không kèm token → cổng tra cứu báo “không ứng với đơn nào”. Không có hướng dẫn CK.

**`/tracking` + `/tracking/:id`**
- Mục đích: tra cứu không cần đăng nhập; xem pipeline, item, thanh toán, vận chuyển.
- Form: mã đơn + “mã truy cập hoặc SĐT”; nút Tra cứu.
- Trạng thái: portal/not-found/loading; **lỗi mạng bị nuốt thành not-found**.
- **Vấn đề:** SĐT 10 số bị chặn client; nhãn hứa SĐT; không có bank/STK; back của guest về login.

**`/orders`**
- Mục đích: lịch sử đơn buyer.
- 7 tab trạng thái, search, card đơn, CTA theo trạng thái, menu “…” (hoá đơn, in lại, bảo hành).
- **Vấn đề:** lỗi tải thành “Bạn chưa có đơn hàng nào”; CTA “Xem hướng dẫn thanh toán” dẫn tới nơi không có hướng dẫn; admin/lab vào thấy mọi đơn dưới tiêu đề “của khách hàng”; 390 tab chỉ thấy ~2,5/7.

**`/admin/orders` + `/admin/queue`**
- Mục đích: điều phối, Kanban, chi tiết, xác nhận thanh toán, phân bổ.
- Kanban 8 cột; dispatcher có KPI/filter/search; modal chi tiết chứa xác nhận tiền/QC/ghi chú.
- **Vấn đề:** modal không mở trên dev (browser 2 worker, 3 lần); không realtime; “0 trạm” nhưng select có 3 trạm seed; completed nằm cột “Đang giao”; không hủy/hoàn tiền/mở InvoiceModal.
- 1440 board 2100px; 390 cột dọc.

### 4.2 Xưởng in

**`/lab/queue`**
- Mục đích: xưởng nhận và báo tiến độ đơn đã được admin gán.
- Bảng 5 cột: đơn, mặt hàng, nấc, tiến độ lớp, cập nhật. Nút “Nhận việc”, 8 nút nấc, input %.
- **Thiếu dữ liệu để in:** không file 3D, kích thước, màu, thông số, hạn, SĐT/địa chỉ, ghi chú.
- **Không có chi tiết đơn**; không phân công máy; không pause/error/reprint/QC bền.
- “Xác nhận hoàn thành” ghi `shipping`, không `completed`; “Đánh dấu đã giao” mới `completed`.
- 390/768: bảng 1119px trong 356/736px, cột thao tác ngoài màn hình.

**`/lab/machines` / `materials` / `accessories` / `warranty` / `audit_trail` / `preferences`**
- Máy: trạng thái thủ công, không gán đơn.
- Vật liệu/phụ kiện: kho xưởng; phiếu kho tay; có thể âm.
- Bảo hành: đổi trạng thái claim; không nối in lại.
- Sổ kho: log vật liệu.
- Cấu hình: rate điện/nhân công.

**`/admin/queue` / `/admin/orders`**
- 3 tab: Kanban 8 nấc, Dispatcher, Trạm & đội máy.
- KPI “đang chạy máy” đếm job, không phải máy; “0 trạm” dù có partner.
- Bộ lọc trạm rỗng/seed; phân bổ có thể gán trạm không tồn tại.
- QC/ghi chú chỉ RAM; admin “Tiếp” từ chờ thanh toán lên nấc 1.

### 4.3 Xưởng thiết kế

**`/designer/overview`**
- Metric doanh thu/lượt tải/đơn in/QC; bảng yêu cầu gần đây.
- **Vấn đề:** metric trộn toàn catalog; `sales_count` không tồn tại → luôn 0; số dư payout không có nguồn.

**`/designer/models`**
- Danh sách ấn phẩm, sửa/xoá, xem 3D, đăng tải.
- Empty state luôn đổ lỗi “đổi bộ lọc” dù kho rỗng; preview 3D parametric theo category, không phải file thật; nút xoá published vẫn bật.

**`/designer/wizard`**
- Upload file (private bucket), metadata, giá, license, trạng thái.
- **Vấn đề:** preview luôn gear; không ảnh sản phẩm; insert product lỗi vẫn có thể báo thành công; không reset sau success; CTA “XUẤT BẢN VÀO DANH MỤC” nhưng lưu `under review`.

**`/designer/requests`**
- Hàng đợi đã nhận + chợ mở; chat; báo giá; brief.
- **Vấn đề:** không nhận/duyệt/giao file; status kẹt `pending` sau claim; mobile ẩn input tiền; chọn request bị giữ state cũ; lỗi bị nuốt; localStorage lưu request DB-backed.

**`CustomIdeaRequestModal` (khách)**
- Form: tên/SĐT/email/công ty, dự án, phân loại, mô tả, vật liệu, ngân sách, tiến độ.
- Không file, không kích thước cấu trúc, không mã theo dõi; guest UI mở nhưng DB không cho insert.

**`/designer/payouts` + `/admin/designers`**
- Payout: hồ sơ ngân hàng, số dư, rút tiền disabled; rỗng trung thực.
- Admin: hồ sơ/royalty/analytics; không có yêu cầu CAD, không có hàng chờ publish.

### 4.4 Quản trị

**Dashboard**
- 4 KPI + cảnh báo + biểu đồ cơ cấu chi phí (luôn rỗng) + danh mục.
- Doanh thu cộng mọi đơn (kể cả cancelled/unpaid); low-stock 3 công thức lệch; không có backlog duyệt/KYC/RFQ/request.
- Link KPI/cảnh báo có, nhưng không dẫn tới hàng đợi cần xử lý.

**Điều hướng**
- 17 item/7 nhóm; alias route không active; search chỉ khớp label/id/group, thiếu “ship/phí/duyệt/ảnh/người dùng”; sidebar 1440 phải cuộn, nhãn dài bị cắt.
- Mobile drawer hoạt động, không tràn.

**Sản phẩm**
- Tạo mới: tên/SKU/category/2 giá/1 ảnh URL/feature/readiness/status/license.
- Sửa: thiếu ảnh, mô tả, specs, materials, colors, tags, CAD file; designerId nhập UUID tay.
- Không filter trạng thái/bên bán/designer; không hàng chờ duyệt; empty state đổ lỗi filter.
- Đổi status trong bảng lưu ngay, không xác nhận; modal cần Lưu.

**Storefront/SEO**
- 6 tab storefront, 4 tab SEO; lưu cả object.
- Preview chỉ announcement/hero/metrics/tolerance; 4 tab còn lại không preview.
- Lost update giữa Storefront/SEO; lỗi save không rollback; audit không ghi; DB rỗng hiện “Đã lưu” với default.
- Tab strip 1440 bị cắt; 390 tab 5–6 ngoài màn.

**Settings/Audit/Quyền**
- Settings chỉ `app_settings` 9 field; VAT/điện/nhân công/phí nền tảng ở Pricing; 3 tên màn khác nhau.
- Audit chỉ settings; không realtime; trần 200.
- Một role admin; promote designer không transaction, không revoke; publish guard client/service, DB gap source-level.

---

## 5. Ba hành trình xuyên vai trò & điểm đứt gãy

### 5.1 Khách đặt in → admin → Xưởng In → khách tra cứu

| Bước | Ai | Thao tác UI | Trạng thái trước → sau | Dữ liệu/tệp | Người tiếp theo biết? | Kết luận |
|---|---|---|---|---|---|---|
| 1 | Khách | Checkout → tạo đơn | cart → đơn `pending_payment`/`cod` | PII, item snapshot, tiền | Admin không realtime; phải reload | **MỘT PHẦN / CHƯA KIỂM CHỨNG giao dịch DB** |
| 2 | Khách | Rời `/checkout` | — | Hướng dẫn CK **mất** | — | **ĐỨT P0**: không có STK/nội dung CK ở `/orders`/`/tracking` |
| 3 | Admin | `/admin/orders` reload | thấy đơn | danh sách | — | ĐÃ CÓ (không realtime) |
| 4 | Admin | “Chi tiết & thanh toán” | dev: modal không mở; production build: modal mở | — | — | **DEV-ONLY**: StrictMode; production đã mở với mock, không phải đứt production |
| 5 | Admin | Phân bổ trạm | `assigned_workshop_id` | trạm seed/DB | Lab phải reload | **MỘT PHẦN**: có thể gán trạm ma |
| 6 | Lab | `/lab/queue` nhận việc | nấc 2, `processing` | không file/kích thước/màu/ghi chú | Khách thấy sai nấc | **ĐỨT P0**: không đủ dữ liệu để in |
| 7 | Lab | Cập nhật nấc/QC/giao | stage/status | 3 cột | Khách realtime; admin reload | **MỘT PHẦN**: nhãn nấc/status lệch |
| 8 | Khách | `/tracking` | xem kết quả | — | — | **MỘT PHẦN**: nhãn sai; không bank; lỗi mạng thành not-found |

**Điểm dừng đầu tiên:** bước 2 (mất hướng dẫn thanh toán) với khách; nếu admin xác nhận tay được thì dừng ở bước 6 (xưởng không có tệp/thông số).

### 5.2 Khách gửi yêu cầu thiết kế → Designer → khách duyệt → bàn giao/in

| Bước | Ai | Thao tác UI | Trạng thái | Dữ liệu/tệp | Người tiếp theo biết? | Kết luận |
|---|---|---|---|---|---|---|
| 1 | Khách | Home → modal → gửi brief | tạo `pending`, `designer_id=null` | text, budget, deadline; **không file/kích thước** | Designer chỉ thấy sau reload/chợ mở | **MỘT PHẦN** |
| 2 | Khách guest | Gửi khi chưa đăng nhập | UI cho bấm; DB grant/policy chặn | `customer_id=null` | — | **ĐỨT P1** |
| 3 | Designer | Requests → chợ mở → claim | `designer_id` set; status vẫn `pending` | — | — | ĐÃ CÓ (RPC) / CHƯA KIỂM CHỨNG runtime |
| 4 | Designer | Chat/báo giá | `quoted` | text + số tiền; không file/expiry | Khách không có UI | **ĐỨT P1** |
| 5 | Khách | Xem/duyệt báo giá | **không có màn** | — | — | **CHƯA CÓ** |
| 6 | Designer | Giao bản cuối | **không có upload** | — | — | **CHƯA CÓ** |
| 7 | Admin | Duyệt/publish | products `under review`; thiếu ảnh | — | Khách không thấy | **ĐỨT P1** |
| 8 | Hệ thống | Chuyển sang in | **không có conversion** | — | — | **CHƯA CÓ** |

**Điểm dừng đầu tiên:** guest ở bước 2; khách đã đăng nhập dừng ở bước 4/5 (không có UI duyệt).

### 5.3 Admin tạo/publish sản phẩm → khách thấy → đặt hàng → xưởng

| Bước | Ai | Thao tác UI | Trạng thái | Dữ liệu | Người tiếp theo biết? | Kết luận |
|---|---|---|---|---|---|---|
| 1 | Admin | Products → tạo mới | `draft` | tên/giá/ảnh URL | — | ĐÃ CÓ |
| 2 | Admin | Đổi “Đang bán” | publish guard | cần ≥1 ảnh thật; giá >0 | — | MỘT PHẦN (guard client/service; DB gap source) |
| 3 | Designer | Tạo sản phẩm | `under review` | **không ảnh**; admin edit không có field ảnh | Admin không có queue duyệt | **ĐỨT P1** |
| 4 | Khách | Explore/PDP | published | catalog thật | — | **CHƯA KIỂM CHỨNG** (không có catalog published) |
| 5 | Khách | Đặt hàng | order | như 5.1 | — | **CHƯA KIỂM CHỨNG** submit |

**Điểm dừng đầu tiên:** với hàng designer, bước 3 (không thể bổ sung ảnh/publish qua UI). Với hàng admin, chưa kiểm chứng vì không có catalog published thật.

---

## 6. Danh sách vấn đề hợp nhất

> **Độ chắc chắn:** `Browser` = đã thấy trên UI (mock); `Source` = đọc code/migration; `Both` = cả hai; `Chưa KC` = cần dữ liệu/tài khoản thật.
> P0 = chặn vận hành/tiền; P1 = sai/hỏng luồng nghiêm trọng; P2 = thiếu năng lực vận hành; P3 = chất lượng/UX.

### 6.1 P0 — chặn vận hành

| ID | Khu vực | Bước tái hiện | Bằng chứng | Tác động | Độ chắc chắn | Phụ thuộc |
|---|---|---|---|---|---|---|
| **OPS-01** | Đơn hàng | Tạo đơn VietQR → rời `/checkout` → mở `/orders` hoặc `/tracking` | Bank/STK/chủ TK render **trên `/checkout`** (khối VietQR trước tạo đơn + khối `createdOrder`); grep bank ở `OrderTrackingView`/`MyOrdersView`/`OrderSuccessView`/`InvoiceModal` = 0; ảnh `worker-a-tracking-pending-390.png` | Khách không biết chuyển tiền đi đâu; đơn kẹt; doanh thu phụ thuộc admin nhắn tay | Both | `app_settings` bank; cần quyết định nơi lưu hướng dẫn |
| **OPS-02** | Xưởng in | Mở `/lab/queue` hoặc chi tiết job admin | `workshop/queue.ts:16-22` select nguyên `items` jsonb; `shared.ts:131-150` map color; `QueueTab.tsx:44-58` chỉ render name/qty/material, cắt 3 item; `dimensions` không được snapshot (`CheckoutView.tsx:189-208`); ảnh `worker-b-lab-queue-1440.png` | Xưởng không đủ dữ liệu để in; phải xin file ngoài hệ thống | Both | Cần snapshot file/spec vào order hoặc link product |
| **OPS-28** | Admin/Kho | Bấm `+1` khi panel mount lúc `materials=[]` (cold deep-link/mạng chậm), sau đó dữ liệu mới tải | `WarehouseInventoryPanel.tsx:173-275` `useMemo([])` giữ handler lần render đầu; `useCatalogData.ts:239-250` coi phần tử vắng là “removed”. **Rủi ro:** `onUpdateMaterials([])` ⇒ xoá toàn bộ materials | Click không cộng nhưng báo thành công; **nguy cơ mất dữ liệu danh mục** | Both (nguồn) | **P0 có điều kiện**; test cold deep-link; chặn ghi khi dữ liệu chưa tải xong |

### 6.2 P1 — sai/hỏng luồng

| ID | Khu vực | Bước tái hiện | Bằng chứng | Tác động | Độ chắc chắn | Phụ thuộc |
|---|---|---|---|---|---|---|
| OPS-04 | Đơn hàng | `/tracking` nhập SĐT 10 số | `OrderTrackingView.tsx:186-193`; `database.ts:503-509`; 0 RPC call | Khách mất token không tra cứu được | Both | PO chốt SĐT/OTP |
| OPS-05 | Đơn hàng | Guest success → “THEO DÕI TIẾN ĐỘ” | `OrderSuccessView.tsx:206` chỉ truyền `{orderId}`; `routeWrappers.tsx:402-419`; browser → portal “không ứng với đơn nào” (chỉ guest; buyer không bị) | Mất ngữ cảnh ngay sau đặt | Both | — |
| OPS-03 | Đơn/In/Admin | Cùng `status_stage_index=4`: xem lab, admin, khách | Hai bộ nhãn 8 nấc (`OrderProgress.tsx:13-22` dùng chung khách+lab; `useProductionStore.ts:26-124` cho admin) + hai mapping status (`workshop/settings/constants.ts:20-29`, `Group5:35-56`) + bộ 6 cột lab (`settings/helpers.ts:20-28`). Tại index 4 khách/lab = “Đang in 3D”, admin = “Hậu kỳ”; “Hậu kỳ & QC” là tab theo `status`, không phải nhãn nấc. Ảnh `worker-b-lab-queue-1440.png` vs `worker-b-admin-queue-1440.png` | Ba bên hiểu khác nhau; admin/lab ghi sai status; khách thấy sai bước | Both | Cần chốt một state machine 8 nấc; có thể P0 nếu nấc là cam kết hợp đồng |
| OPS-11 | In/Kho | Hoàn tất đơn | `workshop/inventory.ts:241-245` query `workshop_id = partnerId` (uuid vs slug); caller `queue.ts:65-72`; **nguyên nhân 2:** `weightGrams` catalog thường null (chỉ `QuoteSummaryPanel.tsx:392` set) | Không trừ kho; toast đổ lỗi sai; sửa khóa chưa đủ | Source | Sửa khóa **+** có khối lượng; log lý do skip thật |
| OPS-12 | In/Admin | `/admin/queue` xem trạm/bộ lọc | **Hai nguồn:** banner/tab đếm từ `useProductionStore.workshops = []` (`:278,320`); select phân bổ từ `getWorkshopProfiles()` fallback seed (`profiles.ts:28-60`, `Group5:203-219`). `profiles.ts:54` ghi DB vào localStorage; `partner_id` không UNIQUE; `orders.assigned_workshop_id` là text không FK (`20260901:694,924`) | Gán đơn cho trạm không tồn tại; đơn mồ côi; filter rỗng khó hiểu | Both (conditional: DB rỗng/lỗi) | Bỏ seed fallback, unique/FK, bỏ localStorage |
| OPS-15 | Designer | Khách guest gửi brief | `CustomIdeaRequestModal` submit enabled; `baseline:1387-1389` grant chỉ authenticated; `harden_rls:741-749` policy `customer_id=auth.uid()`; submit gửi `user?.uid` | Mất lead; lỗi API thô | Source + UI | Auth/RLS; **P0 nếu traffic chủ yếu là guest** |
| OPS-07 | Đơn hàng | `/orders` đơn chờ TT → “Xem hướng dẫn thanh toán” | `MyOrdersView.tsx:274-280`; không bank | CTA hứa nội dung không tồn tại | Both | OPS-01 |
| OPS-08 | Đơn/In | Admin “Tiếp” đơn chờ TT; lab “Nhận việc” | `Group5:302-311`; queue không có payment | In trước khi thu tiền | Source | Guard payment |
| OPS-09 | In/Lab | Bấm “Nhận việc” trên đơn đã giao/xong | `QueueTab.tsx:98-112`; `WorkshopSettingsView.tsx:253-261` | Lùi trạng thái khách đã thấy | Both | State machine/guard |
| OPS-10 | In/Lab | Bấm “Xác nhận hoàn thành” | `WorkshopSettingsView.tsx:258-304` ghi `shipping`, không `completed` | Nhãn đánh lừa; đơn kẹt “Đang giao” | Both | — |
| OPS-13 | In/Admin | Kanban “Tiếp/Lùi”, ghi chú/QC | `Group5` chỉ ghi status/stage; notes/QC RAM | Mất quyết định chất lượng; không audit | Source | Bảng QC/reprint |
| OPS-14 | In/Admin | Mở `/admin/queue` | `Group5` không mở kênh realtime nào; lab `WorkshopSettingsView:124-182` | Đơn mới không hiện; hai bên dữ liệu cũ | Both | Realtime/polling |
| OPS-16 | Designer | Gửi request → tìm màn khách xem/duyệt | `AppRoutes` không có route; `customer_select` policy không UI | Vòng thương mại đứt | Source | Cần portal khách |
| OPS-17 | Designer | Chat/báo giá → tìm upload bản cuối | Chat chỉ text; `attachment` chỉ render; không version | Không giao được bản vẽ | Source | Bucket đã có |
| OPS-18 | Designer | Wizard tạo SP → admin publish | Wizard `images: []`; admin edit không field ảnh; guard bắt buộc ảnh | Hàng designer không publish được | Both | Cần field ảnh/quyền admin |
| OPS-19 | Designer | Insert product lỗi | Wrapper không await; `handleAddNewProduct` không throw; `digital_assets` không FK | Báo thành công giả; asset mồ côi | Source | Transaction/idempotency |
| OPS-20 | Designer | 390 → Requests → nhập báo giá | Input tiền `hidden sm:block`; browser `inputVisible=false` | Designer mobile không báo giá | Both | — |
| OPS-21 | Designer | Wizard chọn cube.stl → preview | Luôn `modelType='gear'`; ảnh bánh răng | Preview sai file; rủi ro giao sai | Both | Dùng mesh thật |
| OPS-22 | Designer | Claim → xem status; declined | Claim không đổi status; `updateStatus` 0 caller; `declined→Completed` | Kẹt “Chờ duyệt”; declined hiện hoàn thành | Source | State machine |
| OPS-23 | Designer | Đăng nhập designer khác cùng máy | `customDesignService` localStorage lưu request DB-backed | Lộ brief/PII; trái quy tắc cache | Source | Bỏ cache |
| OPS-24 | Admin/Storefront | Sửa SEO chưa lưu → Storefront lưu → SEO lưu | Browser: payload ghi `hero_badge` cũ; 2 panel full object | Mất thay đổi âm thầm | Both | Patch theo section |
| OPS-26 | Admin/Audit | Lưu Storefront/SEO → Nhật ký | 0 request `setting_audit`; chỉ `settingsService` audit | Audit mù nội dung/SEO | Both | Ghi audit |
| OPS-27 | Admin/Dashboard | Mock 1 đơn cancelled 5tr hôm nay | `Group0:77-88` cộng mọi đơn, bỏ payment/cancelled; “tháng này” là cửa sổ trượt 1/7/30/90 ngày | “Doanh thu” sai | Both | Chốt định nghĩa |
| OPS-25 | Admin/Storefront | Chặn ghi site_content → Lưu | `useSiteSettings` set state trước, không rollback; **cùng phiên trình duyệt** thấy nội dung lưu thất bại (chưa chứng minh mọi khách thấy) | Thông báo lưu sai + state không rollback | Both | Rollback/optimistic rõ |
| OPS-29 | Admin/Products | Sửa sản phẩm | `AdminProductsPanel:420-611` thiếu ảnh/mô tả/specs; **cùng bẫy modal conditional OPS-06 nên trên dev có thể không mở**; evidence hiện là source | Không cứu được hàng thiếu ảnh | Source (dev modal chưa KC) | OPS-18 |
| OPS-30 | Admin/Products | Tìm hàng “Chờ duyệt” | Không filter status; badge tổng | Không có queue duyệt | Both | — |
| OPS-31 | Admin/Form | Sửa Storefront chưa lưu → ghé 6 tab khác → quay lại | `DashboardTabs maxKept=6`; browser mất giá trị | Mất dữ liệu nhập | Both | Dirty guard/pin |
| OPS-32 | Admin/Kho | Chặn ghi materials → +/- | Toast success; `catch(console.warn)`; không rollback | Tồn kho không lưu nhưng tưởng đã lưu | Source | Rollback |

### 6.3 P2 — thiếu năng lực vận hành (chọn lọc)

| ID | Khu vực | Vấn đề | Bằng chứng | Độ chắc chắn |
|---|---|---|---|---|
| OPS-33 | Đơn/Admin | Không hủy/hoàn tiền; `cancelled` không writer, ẩn khỏi admin | `MyOrdersView`, `Group5:236` | Source |
| OPS-34 | Đơn/Admin | `cancelled` vẫn có dòng thanh toán “CHỜ THANH TOÁN” | `MyOrdersView.tsx:305-306` | Both |
| OPS-35 | Đơn/Admin | `/orders` lỗi mạng/RLS thành “chưa có đơn” | `useOrdersData:107-118` | Both |
| OPS-36 | Đơn/Admin | Không nhập carrier/tracking; `estimatedDelivery` rỗng | checkout/không writer | Source |
| OPS-37 | Đơn/Admin | Completed nằm cột “Đang giao”; KPI tính job | `Group5:47-56,305-311` | Both |
| OPS-38 | Đơn/Admin | Mã đơn client 4 số, unique; retry có thể tạo 2 đơn | `CheckoutView:142,176`; gateway | Source |
| OPS-39 | Đơn/Admin | Admin không mở/xem-in thông tin đơn (InvoiceModal) | `Group5` không `onOpenInvoice` | Source |
| OPS-40 | In/Lab | Không phân công máy/pause/reprint/QC bền/đóng gói | `workshop/*` | Source |
| OPS-41 | In/Lab | Không xem chi tiết đơn; bảng cắt item | `QueueTab` | Both |
| OPS-42 | In/Admin | Hai hệ máy/kho: `printer_fleet`/`workshop_machines`, catalog/workshop materials | `Group1`, `Group5`, `Warehouse` | Source |
| OPS-43 | In/Admin | Đơn digital/custom design lọt vào queue in; custom design không tạo order | `queue.ts`, `customDesignService` | Source |
| OPS-44 | In/Admin | Không audit sản xuất (ai đổi nấc/lúc nào) | `database.ts:419-455` | Source |
| OPS-45 | Designer | Chợ mở không realtime; copy hứa realtime | `customDesignService:366-397` | Source |
| OPS-46 | Designer | Lỗi requests/overview bị nuốt thành rỗng | tab components | Source |
| OPS-47 | Designer | Metric trộn catalog; `sales_count` không tồn tại | `DesignerOverviewTab`, schema | Both |
| OPS-48 | Designer | Payout không nguồn số dư; admin withdrawals rỗng | `DesignerPayoutsTab`, `Group2` | Source |
| OPS-49 | Designer | Copy “tự động lên sàn” / “xuất bản” nhưng lưu under review | `DesignerOverview`, wizard | Both |
| OPS-50 | Designer | Chọn request ở tab khác giữ state cũ | `selectedRequestId` useState | Both |
| OPS-51 | Admin/Nav | Alias không active; search thiếu synonym; sidebar phải cuộn/cắt nhãn | `AdminDashboardView` | Both |
| OPS-52 | Admin/Settings | 3 tên màn khác nhau; VAT/điện/nhân công ở Pricing | `AdminSidebar`, `AdminDashboardView` | Both |
| OPS-53 | Admin/Storefront | Preview chỉ 2/6 tab | `StorefrontPreview` | Both |
| OPS-54 | Admin/Storefront | Tab strip 1440 bị cắt; 390 tab 5–6 ngoài màn | browser | Both |
| OPS-55 | Admin/Storefront | DB rỗng hiện “Đã lưu” + default content | `useSiteSettings`, `database` | Both |
| OPS-56 | Admin/Inventory | Group1 “Tồn Kho Nhựa” chỉ RAM | `Group1WorkshopsPanel` | Source |
| OPS-57 | Admin/Auth | Promote designer không transaction; không revoke | `designerService` | Source |
| OPS-58 | Admin/Dashboard | Low-stock 3 công thức lệch; chart luôn rỗng | `Group0`, sidebar, warehouse | Both |
| OPS-59 | Admin/Publish | Direct-API gap: guard client/service; DB không CHECK readiness | `publishGuard`, migrations | Source |
| OPS-60 | Admin/Quyền | Một role admin; mọi admin thấy bank/KYC/audit | `RoleGuard`, panels | Source |
| OPS-68 | Đơn/Quyền | Admin/lab mở `/orders` thấy đơn người khác dưới tiêu đề “của khách hàng” (PII) | `MyOrdersView.tsx:173`; `ProtectedRoute` không giới hạn role; RLS admin/lab-all | Both |
| OPS-69 | In/Lab | User có nhiều `workshop_profiles`: cổng lấy hồ sơ cũ nhất, dashboard lấy mới nhất, RLS lấy `updated_at desc` | `LabRoute.tsx:37-57`; `profiles.ts:30,64-71,150-172`; `harden_rls:99-108` | Source |
| OPS-70 | In/Lab | `getWorkshopProfiles` ghi DB vào localStorage | `profiles.ts:54`; vi phạm quy tắc “không cache DB-backed” | Source |
| OPS-71 | In/Admin | `workshop_profiles.partner_id` không UNIQUE; `orders.assigned_workshop_id` là text không FK | `20260901:694,924`; gán trạm ma vẫn thành công | Source |
| OPS-72 | Admin/Products | Đổi select “Trạng thái” trong bảng lưu ngay, không xác nhận; modal lại cần Lưu | `adminProductColumns.tsx:143-158`; browser | Both |
| OPS-73 | Admin/Settings | Không dirty indicator/beforeunload; nút Lưu luôn bật | `AdminSettingsPanel.tsx:144-215` | Source |
| OPS-74 | Designer | Modal khách hứa đính kèm bản vẽ/ảnh nhưng không có input file | `CustomIdeaRequestModal.tsx:225` | Both |

### 6.4 P3 — chất lượng/UX (chọn lọc)

| ID | Khu vực | Vấn đề | Bằng chứng |
|---|---|---|---|
| OPS-61 | Designer | H1 luôn “Quản Lý Ấn Phẩm & Giá In 3D” ở mọi tab | `DesignerDashboardView:138-144` |
| OPS-62 | Designer | Empty models đổ lỗi “đổi bộ lọc” dù kho rỗng | `DesignerModelsManagerTab:413-420` |
| OPS-63 | Designer | Quote card luôn “ĐÃ GỬI ĐẾN KHÁCH HÀNG” | `DesignerRequestsTab:399-411` |
| OPS-64 | Admin | Avatar “QT” tĩnh, không logout/đổi tài khoản | `AdminDashboardView:701-708` |
| OPS-65 | Admin | `/admin/khong-ton-tai` vẫn render overview | `AdminDashboardView:148-166` |
| OPS-66 | Admin | Sản phẩm giá 0 copy “miễn phí” nhưng 0 = kênh không bán | `AdminProductsPanel:693-696` |
| OPS-67 | In/Lab | Stage ≥5 tự ghi 100% lớp | `WorkshopSettingsView:221,236` |
| OPS-06 | Đơn/Admin | Modal chi tiết không mở **trên dev** | Dev: `dialog[open]=0` do StrictMode + modal conditional; **production build mock: `dialog[open]=1`, nội dung đơn hiện đúng**. Ảnh `g0-ops06-production-modal.png` | Chỉ ảnh hưởng dev/DX; không phải blocker production | **P3 (dev DX)**; không sửa hàng loạt 11 modal |
| OPS-75 | Designer | Nút xoá sản phẩm published vẫn bật dù policy chặn | `DesignerModelsManagerTab:318-326`; `designer_publish:41-44` |
| OPS-76 | Admin/Products | `designerId` nhập UUID tay, không picker/validate | `AdminProductsPanel:565-579` |
| OPS-77 | Admin/Quyền | `app_settings` anon select toàn bộ, gồm `bank_account`/`tax_code` | `20261010:535-543`; schema `:354-368`; **Source, chưa kiểm DB đang chạy; bank/tax có thể là chủ đích công khai — cần kiểm quyền đọc thực tế trước khi gọi là lộ dữ liệu** |

---

## 7. Mâu thuẫn nhãn UI ↔ hành vi ↔ dữ liệu

1. **Hai bộ nhãn 8 nấc + hai bộ mapping status + một bộ 6 cột lab:** `MES_PIPELINE_STAGES` (dùng chung khách/lab), `KANBAN_STAGES` (admin), `MY_ORDER_STATUS_BY_STAGE`/`STATUS_BY_STAGE` (writer), `settings/helpers.ts` (6 cột lab). Cùng `stage_index=4`: khách/lab “Đang in 3D”, admin “Hậu kỳ”; “Hậu kỳ & QC” là tab theo `status`, không phải nhãn nấc.
2. **“Mã truy cập hoặc số điện thoại”** nhưng `getOrderByToken` chặn token <12 ký tự; SĐT 10 số không tạo request.
3. **“Xem hướng dẫn thanh toán”** ở `/orders` nhưng không màn nào ngoài checkout có bank/STK/nội dung CK.
4. **“Đã Hủy Đơn”** vẫn kèm dòng thanh toán “CHỜ THANH TOÁN” (không phải badge trạng thái); admin ẩn hoàn toàn đơn cancelled.
5. **“Xác nhận hoàn thành”** ghi `shipping`, không `completed`; completed chỉ từ “Đánh dấu đã giao”.
6. **“Đã Lưu Nội Dung”** khi `site_content` rỗng, input chứa default; khách có thể thấy copy mặc định.
7. **Wizard “XUẤT BẢN VÀO DANH MỤC”** nhưng lưu `under review`; admin mới publish.
8. **Request `declined`** map thành `Completed` + nhãn “Hoàn thành”.
9. **“Doanh thu · tháng này”** cộng cả đơn cancelled/unpaid.
10. **“0 trạm”** trên banner nhưng select phân bổ có 3 trạm seed.
11. **“ĐANG CHẠY MÁY 0 máy in”** khi có đơn đang in/hậu kỳ: nhãn nói “máy in” nhưng số là **job ở nấc Đang in**; đơn Hậu kỳ/QC không được đếm.
12. **`/orders` tiêu đề “của khách hàng”** nhưng admin/lab thấy đơn người khác (RLS admin-all).
13. **Settings** nav “Cài Đặt Xưởng & Hệ Thống” ≠ breadcrumb “Cài Đặt Xưởng In & Pháp Nhân” ≠ h2 “Cài Đặt Pháp Lý & Định Danh”.
14. **Giá 0** copy “miễn phí” nhưng semantics “kênh không bán”; 0/0 không publish.
15. **Preview 3D** luôn gear/parametric, không phải file đã chọn.
16. **Modal yêu cầu CAD** copy mời “cung cấp bản vẽ tay, ảnh chụp…” nhưng form **không có input file** (`CustomIdeaRequestModal.tsx:225`).
17. **Copy “tự động xuất hiện ngay trên sàn”** (`DesignerOverviewTab.tsx:194-197`) và CTA “XUẤT BẢN VÀO DANH MỤC” (`DesignerUploadWizardTab.tsx:656`) trong khi sản phẩm chỉ lưu `under review` và admin mới publish.
18. **Copy “theo thời gian thực”** ở chợ mở (`DesignerRequestsTab.tsx:250`) nhưng không có realtime cho request chưa gán.

---

## 8. Câu hỏi cần PO xác nhận

1. **Thanh toán:** hướng dẫn CK có phải xem lại được từ `/orders` và `/tracking` (kèm QR/nội dung CK) không? Ai xác nhận đã nhận tiền, ở đâu?
2. **Tra cứu:** SĐT có phải kênh thật? Nếu có, cần OTP hay chỉ cần mã đơn + SĐT? Nếu không, bỏ chữ “hoặc số điện thoại”.
3. **8 nấc:** chốt một bộ canonical cho khách/admin/lab hay cho phép ánh xạ khác nhau? Có migrate `status_stage_index` cũ?
4. **Hoàn tất:** ai được đánh dấu completed (xưởng/admin/hệ thống)? Cancelled có hiện ở admin không?
5. **Hủy/hoàn tiền:** khách tự hủy trước in? Admin hủy/hoàn tiền có ghi nhận?
6. **Dữ liệu in:** snapshot file/kích thước/màu/thông số/hạn/liên hệ vào order hay link product? Ai chịu trách nhiệm khi file thiếu?
7. **Phân công xưởng:** một hay nhiều hồ sơ xưởng/user? Nguồn trạm canonical là `workshop_profiles` hay seed? Có auto-dispatch?
8. **Custom design:** khách guest có được gửi? Khách xem/duyệt báo giá ở đâu? Designer giao file bằng cách nào? Request→order có cần không?
9. **Publish:** admin có được sửa ảnh/mô tả/specs hàng designer? Có hàng đợi “Chờ duyệt” + filter status không? Giá 0 nghĩa là gì?
10. **Storefront/SEO:** lưu theo section hay full object? Có cần audit mọi thay đổi? DB rỗng hiện “Chưa cấu hình” hay “khởi tạo từ default”?
11. **Dashboard:** “doanh thu” là đơn đã đặt hay tiền đã thu? Loại cancelled/unpaid? Kỳ lịch hay trượt? Ai cần thấy backlog nào?
12. **Roles:** một admin role hay tách content/ops/finance? Có cần thu hồi designer? `app_settings` public read bank/tax có chủ đích?
13. **Kho/máy:** canonical là `printer_fleet` hay `workshop_profiles.fleet`; catalog materials hay `workshop_materials`? Có gộp 3 màn đội máy/4 màn kho không?
14. **Thông báo:** realtime in-app đủ hay cần email/SMS? Admin có cần badge/realtime đơn mới?
15. **Route alias:** giữ và highlight nav, hay redirect canonical/404?

---

## 9. Gợi ý cần thảo luận (tối đa 10, tách khỏi phát hiện đã kiểm chứng)

1. **State machine:** PO muốn một bộ 8 nấc canonical cho cả ba mặt, hay chấp nhận ánh xạ khác nhau? Nếu canonical, xử lý dữ liệu `status_stage_index` cũ thế nào?
2. **Hướng dẫn thanh toán:** có cần xem lại từ đơn (QR/nội dung CK) hay chỉ cần gửi một lần? Ai xác nhận tiền và bằng chứng nào?
3. **Dữ liệu sản xuất:** snapshot vào order hay link product/asset? Ai đảm bảo file/kích thước/màu/thông số có mặt trước khi in?
4. **Hàng đợi xưởng:** PO muốn giữ bảng + nút nấc hiện tại, hay cần màn chi tiết/guard trước khi đổi trạng thái? Mức cảnh báo nào là bắt buộc?
5. **Custom design:** khách guest có được gửi? Khách xem/duyệt báo giá ở đâu? Designer giao file bằng kênh nào trước khi có portal?
6. **Publish designer:** admin có được sửa ảnh/mô tả/specs hàng designer không? Có cần hàng đợi “Chờ duyệt” riêng?
7. **IA admin:** giữ 3 màn đội máy/4 màn kho hay chọn một nguồn canonical? Alias route giữ hay redirect?
8. **Storefront/SEO:** lưu theo section hay full object? Có cần audit mọi thay đổi và chặn rời trang khi chưa lưu?
9. **KPI:** “doanh thu” là đơn đã đặt hay tiền đã thu? “Việc cần xử lý” gồm những backlog nào (duyệt SP, KYC, RFQ, request, payout)?
10. **Phạm vi kiểm chứng tiếp:** tối thiểu cần tài khoản staging, catalog published, một đơn thật, một request thật, một lần upload/save thật — PO có thể cấp môi trường/dữ liệu nào trước?

---

## 10. Phụ lục — bằng chứng & giới hạn

**Reviewer độc lập:** đã kiểm 32 issue P0/P1 + §7. Các điểm được sửa sau review: OPS-01 (bank có cả trước tạo đơn), OPS-02 (items jsonb bị mapper/UI bỏ, dimensions không snapshot), OPS-03 (hạ P0→P1, sửa số bộ nhãn/ví dụ stage 4), OPS-06 (**production build đã mở modal; chuyển sang P3 dev-only**), OPS-11 (thêm nguyên nhân `weightGrams` null), OPS-12 (tách 2 nguồn + localStorage/no-FK), OPS-15 (điều kiện P0 nếu guest là chính), OPS-28 (cold deep-link, nâng P0 có điều kiện). Các issue OPS-68…77 bổ sung sau review.

## 11. Cập nhật sau PO review + Nhóm 0 (2026-11-10)

PO đã review và chốt thứ tự ưu tiên “ghi dữ liệu đáng tin” trước. Nhóm 0 đã triển khai trên nhánh `group0/data-integrity` (base `f8c5310`), **không push**:

| Item | Trạng thái | Thay đổi chính | Bằng chứng |
|---|---|---|---|
| OPS-28 | **FIXED** | Bỏ `useMemo([])` giữ handler cũ; thêm cờ “đã tải xong” cho materials/accessories; chặn ghi trước lần đọc đầu; vẫn cho xoá danh sách sau khi đã tải | Cold deep-link: 0 DELETE; bấm +1 sau khi rows hiện → POST đúng; 390/1440 |
| OPS-32 | **FIXED** | Ghi kho lỗi ⇒ rollback state + toast lỗi; success chỉ sau khi DB trả | Mock 500: toast lỗi, giá trị về cũ, không toast thành công |
| OPS-19 | **FIXED** | `handleAddNewProduct` throw sau rollback; wrapper designer await, chỉ đổi tab khi thành công | Mock product 500: vẫn ở wizard, phase error, không success |
| OPS-23 | **FIXED** | Bỏ toàn bộ localStorage `vcube_custom_design_requests`; DB là nguồn duy nhất | Key không còn được tạo/đọc; cache cũ không hiện trong board |
| OPS-24 | **FIXED (semantic)** | Panel gửi patch key đã sửa; hook merge với state mới nhất; không ghi đè field panel kia | Storefront/SEO race: body thứ hai giữ hero mới, không overwrite; body vẫn full object vì `dbService` yêu cầu |
| OPS-25 | **FIXED** | Save fail ⇒ rollback `siteContent` global; panel giữ dirty + báo lỗi | Mock 500: home không giữ giá trị lỗi; panel “Chưa lưu” |
| OPS-06 | **VERIFIED dev-only** | Production build + mock: modal chi tiết mở (`dialog[open]=1`) | `g0-ops06-production-modal.png`; không sửa 11 modal |

**Gate trên nhánh:** tsc PASS; 203/203 unit; `npm run check` 24/24; browser 390/1440 0 tràn/0 pageerror.

**Chưa làm trong Nhóm 0:** purge key localStorage cũ trên máy người dùng (cần quyết định); thông điệp lỗi insert product còn generic do `result.ts`; body site_content vẫn full object (chỉ semantic patch); các luồng Nhóm 2–3 chưa bắt đầu.

### 11.1 Nhóm 1 — Đơn hàng (2026-11-10)

Hai nhánh `group1/orders-a` (`3b37784`) + `group1/orders-b` (`e50ace4`) → tích hợp `ca241fa`, **không push**.

| Item | Trạng thái | Thay đổi chính | Bằng chứng |
|---|---|---|---|
| OPS-01 | **FIXED (per-order)** | Snapshot `payment.transferInstructions` vào `orders.payment` jsonb khi tạo đơn; bank/STK/nội dung CK gắn với đơn. Đơn cũ thiếu snapshot hiện thông báo trung thực, không đọc `app_settings` hiện tại | Success/tracking/orders mock: bank đúng; old order “chưa lưu thông tin nhận tiền” |
| OPS-05 | **FIXED (in-app)** | Success → Tracking truyền token qua router **state**, không vào URL; TrackingRoute fetch bằng token khi không có đơn RAM | Guest success → `/tracking/:id`, URL sạch token, bank hiển thị; F5 cần nhập token |
| OPS-04 | **FIXED (UI)** | Bỏ toàn bộ copy “hoặc số điện thoại”; chỉ mã đơn + mã truy cập | `/tracking` không còn chuỗi “số điện thoại” |
| OPS-07 | **FIXED** | CTA chỉ “Xem hướng dẫn thanh toán” khi snapshot configured; còn lại “Xem chi tiết đơn”; COD không hiện bank | `/orders` 4 đơn mock: VietQR/no-snapshot/COD/cancelled đúng |
| OPS-34 | **FIXED** | Cancelled: “Đơn đã hủy — không cần thanh toán”; tracking badge “ĐÃ HỦY” | `/orders` + tracking mock |
| OPS-35 | **FIXED** | `ordersLoading/ordersError/reloadOrders`; lỗi 500 → alert + Thử lại, không “chưa có đơn”; banner stale khi có list | 500 → retry 200 ra list; 390/1440 |

**Gate:** tsc PASS; 203/203 unit; `npm run check` 24/24; browser 4 kịch bản × 390/1440, 0 tràn/0 pageerror.

**Follow-up:** đơn cũ không snapshot cần hỗ trợ tay; token state mất khi F5; OPS-24/23/19 vẫn mở như §5 Nhóm 0.

### 11.2 Nhóm 2 — Xưởng In (2026-11-11)

Ba nhánh `group2/base` + `lab` (`c8f59fa`) + `admin` (`38ad62d`) + `service` (`b50ae45`) → tích hợp `02cdebd`, **không push**. Giả định tạm: VietQR phải paid trước khi in; COD được in trước khi thu.

| Item | Trạng thái | Thay đổi | Bằng chứng |
|---|---|---|---|
| OPS-02 | **PARTIAL** | Snapshot thêm `productId/dimensions/infill/layerHeightMm/note`; queue đọc khách/SĐT/địa chỉ/ghi chú, item đủ màu/kích thước/độ đặc/lớp/khối lượng | Lab detail mock: đủ trường; thiếu file báo “chưa có” |
| OPS-41 | **FIXED** | `/lab/queue` có nút Chi tiết + phiếu việc inline (390/768/1440) | `g2-review-lab-1440/390.png` |
| OPS-03 | **PARTIAL** | Guard dùng index canonical; nhãn khách/lab/admin vẫn khác nhau | Rules + browser |
| OPS-08 | **FIXED (giả định)** | VietQR chưa trả bị chặn nhận/advance; COD được; admin/lab dùng chung rule | Mock lab/admin |
| OPS-09 | **FIXED** | Chỉ tiến 1 nấc; terminal không thao tác; “Nhận việc” không lùi đơn | Mock lab |
| OPS-10 | **FIXED** | “Xác nhận hoàn thành” chỉ stage 6→7; “Đánh dấu đã giao” chỉ stage 7 + shipping | Mock lab |
| OPS-11 | **FIXED (source)** | Resolve `partner_id` → `workshop_profiles.id`; query kho theo UUID; skip có reason/`skippedNoWeight`; log đúng | Script stub service |
| OPS-12 | **FIXED (source)** | Bỏ fallback seed + localStorage; admin select chỉ DB; DB rỗng ⇒ 0 option | Browser admin mock |
| OPS-13/14 | **OPEN** | QC/notes bền + realtime chưa làm (theo thứ tự PO) | — |

**Gate:** tsc PASS; 203/203 unit; `npm run check` 24/24; lab 29/29 + admin 52/52 check mock; 390/768/1440 0 tràn/0 pageerror.

**Chưa kiểm chứng:** DB thật/ghi đơn; file in chưa lưu trong order; idempotency trừ kho; `partner_id` unique/FK chưa có migration.

- Báo cáo nháp đầy đủ: `/tmp/opencode/ops-analysis/worker-A.md`, `worker-B.md`, `worker-C.md`, `worker-D.md`.
- Ảnh: `/tmp/opencode/ops-analysis/worker-a-*.png`, `worker-b-*.png`, `worker-c-*.png`, `worker-d-*.png`.
- Source chính: `src/frontend/views/{CheckoutView,OrderTrackingView,MyOrdersView,OrderSuccessView,WorkshopSettingsView,DesignerDashboardView,AdminDashboardView}.tsx`; `src/frontend/components/{admin/groups,designer,workshop,OrderProgress,custom}/*`; `src/backend/services/{orderService,workshop/*,customDesignService,settingsService}.ts`; `supabase/migrations/*`.
- **Không có PII thật** trong ảnh; mock name/email dùng `audit@vcube.local`.
- **Không kết luận** RLS/bảo mật DB từ UI; các nhận định RLS chỉ đọc migration và ghi rõ “Source”.
- **Không có implementation plan/kiến trúc mới** trong tài liệu này.
