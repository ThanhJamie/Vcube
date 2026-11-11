<!-- doc-meta: status=active; verified=2026-11-10; owner=lead -->
# Group 1 — Đơn Hàng (guest sau checkout + danh sách đơn)

> Base: `main` @ `91a59c6`. **Không push/deploy.** Không migration/DB, không submit đơn.
> Mục tiêu: khách rời checkout vẫn tìm lại đúng đơn/việc cần làm; `/orders` phân biệt lỗi tải với rỗng.

## 1. Phạm vi

| Nhánh | File chính | Nội dung |
|---|---|---|
| `group1/orders-a` | Checkout, OrderSuccess, OrderTracking, routeWrappers, useAppNavigation, types, mappers, `TransferInstructionsCard` | OPS-01/05/04/34 |
| `group1/orders-b` | useOrdersData, MyOrdersView, AppRoutes, App | OPS-07/34/35 |

## 2. Thay đổi

- **OPS-01:** snapshot hướng dẫn chuyển khoản vào `orders.payment.transferInstructions` (jsonb có sẵn, không migration). Bank/STK/nội dung CK gắn với **từng đơn**; đơn cũ không có snapshot hiện thông báo trung thực, không lấy `app_settings` hiện tại.
- **OPS-05:** OrderSuccess → Tracking truyền token qua router **state** (`guestToken`), không đưa token vào URL; TrackingRoute fetch bằng token khi không có đơn RAM. Token không render/log.
- **OPS-04:** bỏ mọi copy “hoặc số điện thoại”; chỉ còn mã đơn + mã truy cập. Backend/RPC không đổi.
- **OPS-07:** CTA `/orders` chỉ hứa “Xem hướng dẫn thanh toán” khi snapshot của đơn `configured=true`; còn lại “Xem chi tiết đơn”; COD không hiện bank.
- **OPS-34:** đơn `cancelled` hiện “Đơn đã hủy — không cần thanh toán”; tracking badge “ĐÃ HỦY”.
- **OPS-35:** hook trả `ordersLoading/ordersError/reloadOrders`; `/orders` có loading skeleton, lỗi `role=alert` + Thử lại, banner “danh sách có thể cũ” khi đã có list.

## 3. Acceptance

- [x] Guest từ `/order-success` bấm Theo dõi → `/tracking/:id`, **URL không có token**, vẫn thấy bank của đơn.
- [x] Đơn VietQR có snapshot: hiện ngân hàng/STK/chủ TK/số tiền/nội dung; đơn không snapshot: thông báo trung thực.
- [x] COD: hiện “Thanh toán khi nhận hàng”, không hiện bank.
- [x] Cancelled: không còn “Chờ thanh toán”; badge “ĐÃ HỦY”.
- [x] `/orders` lỗi 500: “Không tải được đơn hàng” + Thử lại, **không** “Bạn chưa có đơn”; retry 200 → list.
- [x] 390/1440 không tràn, 0 pageerror.
- [x] tsc PASS; 203/203 unit; `npm run check` 24/24.

## 4. Giới hạn / follow-up

- Chưa submit đơn thật; snapshot được kiểm bằng mock order + đọc source gateway/RPC.
- Đơn tạo trước bản này không có snapshot → cần liên hệ hỗ trợ; không tự suy bank hiện tại.
- **Guest token sau checkout:** token hiển thị ở khối “Đã tạo đơn hàng” (`/checkout`) và trang success, có nút Sao chép; **không có email/SMS và không có cách lấy lại** nếu khách không lưu. Router state chỉ giữ token khi đi tiếp trong phiên; F5 mất state. Đây là giới hạn sản phẩm, không phải lỗi điều hướng — cần PO quyết định kênh gửi/lưu token.
- **Trạng thái thanh toán:** đã kiểm mock paid + cancelled: card không còn kêu thanh toán/không hiện bank cho paid/cancelled; đơn cũ thiếu snapshot hiện thông báo trung thực.
- OPS-24 vẫn mở follow-up hai admin/hai trình duyệt (site_content full object).
- OPS-23 vẫn cần purge key cũ `vcube_custom_design_requests` một lần.
- OPS-19 vẫn cần review cleanup Storage khi asset lỗi trong luồng designer.
- DB auth audit (ngoài nhóm): 7 tài khoản đã rotate qua Auth Admin API; không có mật khẩu trong repo/log.
