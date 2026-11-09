<!-- doc-meta: status=proposal; verified=2026-11-09; owner=po -->
# Phân tích phương án phát triển tiếp theo (sau vòng Code Machine #1)

## 0. Snapshot đo được (2026-11-09)

| Chỉ số | Giá trị |
|---|---|
| PO score | **76,1/100** (ngưỡng đạt: ≥85 + 0 P0 fail) |
| Gate | 19/19 PASS · tsc PASS |
| P0 còn lại | `dataHonesty`: 29 dòng `[MẪU]`, 14 ảnh bịa |
| Core journeys | 5/9: order history · account · quote vault · reviews · dispatch |
| Task tự chủ kế tiếp | `notifications` → sau đó `account-security` |
| Task chờ người duyệt | `demo-data-cleanup` · `digital-delivery` · `review-photos` |

## 1. Khung quyết định

Xếp hạng theo: **(giá trị người dùng × điểm PO) / (effort × rủi ro)**, với 2 luật cứng:

1. Việc cần ghi DB/migration/secret → **chỉ làm khi PO duyệt** (`machine-next --approve`).
2. Mọi thay đổi phải giữ 19/19 gate + tsc; nếu không → hoàn nguyên.

## 2. Ma trận phương án

| # | Phương án | Δ score | Giá trị người dùng | Effort | Rủi ro | Phụ thuộc | Kết luận |
|---|---|---:|---|---|---|---|---|
| 1 | **Dọn dữ liệu demo** (`[MẪU]`, ảnh bịa) | **+15** (→91,1, hết P0) | Rất cao: hết cảm giác “app demo” | S | Thấp (UPDATE, có rollback) | PO duyệt DB | **Làm ngay khi được duyệt** |
| 2 | **Digital delivery** (file CAD sau mua) | +2,2 | Rất cao: mua là nhận được hàng | M | Trung bình (RLS/RPC) | Duyệt migration #14 | Làm ngay sau #1 |
| 3 | **Notifications realtime** | +2,2 | Cao: đơn tự cập nhật, không F5 | M | Trung bình (Realtime/RLS, Header chật) | Không | **Task tự chủ kế tiếp** |
| 4 | **Account security + địa chỉ** | +2,2 | Cao: đổi mật khẩu, địa chỉ giao hàng | S–M | Thấp–TB (schema drift dịch vụ cũ) | Không (bảng đã có) | Làm sau #3 |
| 5 | Review photos | +2,2 | Cao: bằng chứng xã hội thật | M | Trung bình | Duyệt storage policy | Chờ duyệt |
| 6 | PWA offline (service worker) | 0 | TB: mở lại khi mạng yếu | M | **Cao** (cache bản cũ sau deploy) | Không | Hoãn; manifest đã đủ điểm |
| 7 | Performance/CLS còn lại | 0 (đã 15/15) | TB | S | Thấp | Không | Chỉ khi có hồi quy |

> “Điểm PO” là thước đo nội bộ; **giá trị người dùng** mới là lý do tồn tại. Vì vậy #2 vẫn được ưu tiên
> cao dù chỉ +2,2 điểm.

## 3. Thứ tự khuyến nghị

```
[PO duyệt] 1. Data cleanup  ──► score 91,1 · hết P0 · “PO satisfied”
[PO duyệt] 2. Digital delivery (migration #14) ──► doanh thu số thật
[tự chủ]   3. Notifications realtime ──► retention + giảm F5
[tự chủ]   4. Account security + địa chỉ ──► niềm tin
[duyệt]    5. Review photos (storage policy) ──► social proof
[hoãn]     6. PWA offline / tối ưu phụ
```

## 4. Deep-dive #3 — Notifications realtime (task tự chủ kế tiếp)

**Sự thật đã kiểm chứng**
- `orders` **đã nằm trong** publication `supabase_realtime` (`20260901_baseline_schema.sql` §11).
- RLS `vcube_orders_owner_read` + `vcube_orders_admin_all` đã đủ để giới hạn dữ liệu realtime.
- Chưa có consumer nào: grep `postgres_changes` chỉ thấy `products`, `site_content`, `custom_design_requests`.
- Trigger `orders_broadcast_status` phát `{id,status}` lên `orders:admin` nhưng chưa ai subscribe.
- `MY_ORDER_STATUS_LABELS` đã có nhãn VI cho 8 trạng thái.

**Thiết kế tối thiểu (không migration, không dependency)**
1. `useOrdersData`: mở channel `orders:me` (`postgres_changes` UPDATE/INSERT trên `orders`), **merge
   đúng các cột trạng thái** (`status`, `status_stage_index`, `layer_progress`, `time_remaining`,
   `assigned_workshop_id`) — không ghi đè tiền/địa chỉ từ payload thiếu cột.
2. Sinh `OrderNotification` từ thay đổi thật (`orderId+status` làm khoá dedupe), cap 20, chỉ trong RAM.
3. `NotificationBell`: `Button iconOnly` + `Icon name="notifications_active"`, badge số `aria-hidden`,
   panel `Sheet` + `EmptyState` trung thực, click → mark read + điều hướng `/orders`.
4. Header: chỉ hiện khi đăng nhập; **<lg đưa vào drawer** để không tràn 390px.
5. Lưới an toàn: refetch `getOrders()` khi tab quay lại foreground (`visibilitychange`) — phòng
   trường hợp Realtime Authorization chưa bật.

**Acceptance**
- 2 phiên: admin đổi trạng thái → khách thấy badge tăng và dòng đơn đổi trạng thái **không reload**.
- Khách khác không nhận thông báo của đơn không thuộc mình.
- 390/1440: 0 tràn ngang, 0 `pageerror`; `npm run check` 19/19.
- Chỉ flip `notifications.done` sau khi có bằng chứng live; nếu Supabase paused → để `false`, báo blocked.

**Rủi ro**: payload realtime thiếu cột (chỉ merge cột trạng thái), Header chật (ẩn dưới `lg`),
Realtime chưa bật (fallback refetch), nhiễu thông báo (dedupe + cap + bỏ qua đơn vừa tạo trong phiên).

## 5. Deep-dive #4 — Account security + địa chỉ

**Sự thật đã kiểm chứng**
- Bảng `customer_profiles` **đã có**: `display_name`, `company`, `tax_id`, `business_address`, `phone`,
  `nda_signed`, `nda_signed_at` + RLS `vcube_customer_profiles_owner_all` (owner toàn quyền).
- **Schema drift**: `workshop/customers.ts#saveCustomerProfile` ghi các cột **không tồn tại**
  (`company_name`, `billing_email`, `preferred_payment_method`, `default_shipping_address`) và còn
  đọc/ghi localStorage (trái luật “không cache DB trong localStorage”). Không dùng service này cho /account.
- `AuthContext.updateUserProfile` **nuốt lỗi** (`console.warn`) ⇒ UI có thể báo “Đã lưu” dù Supabase từ chối.

**Kế hoạch**
1. Service mới `customerProfileService` (get/upsert theo `user_id`, chỉ cột thật của baseline).
2. `/account`: form địa chỉ giao hàng + công ty/mã số thuế/điện thoại; lưu qua service mới; lỗi thật hiện inline.
3. Đổi mật khẩu: `supabase.auth.updateUser({ password })` + validate độ mạnh; thông báo rõ nếu cần xác nhận email.
4. Sửa `updateUserProfile` để ném lỗi thật (hoặc trả `Result`) — hiện tại là rủi ro trung thực dữ liệu.
5. (Tuỳ chọn) sửa `saveCustomerProfile` cũ hoặc đánh dấu deprecated để tránh 2 nguồn sự thật.

**Acceptance**: đọc/ghi được địa chỉ + phone + company; reload còn dữ liệu (DB, không localStorage);
mật khẩu đổi được và đăng nhập lại bằng mật khẩu mới; lỗi hiển thị thật; gate 19/19.

## 6. Deep-dive #1/#2 (chờ duyệt)

- **Data cleanup**: 4 bước trong `docs/tasks/demo-data-cleanup.md` — ẩn `draft` trước, sửa
  `site_content`, set ảnh `NULL`, xoá fixture review sau cùng; rollback bằng snapshot.
- **Digital delivery**: PA1 trong `docs/database/digital-delivery.md` — RPC `finalize_digital_delivery`
  + `get_my_order_files` + `claim_guest_order`; **không** mở INSERT `order_files` cho buyer.
  3 quyết định PO: thời điểm cấp quyền tải, khách vãng lai, license/download_limit/watermark.

## 7. Cách thực thi bằng Code Machine

```bash
node scripts/machine-next.mjs --approve demo-data-cleanup   # khi PO đồng ý DB
node scripts/machine-next.mjs --approve digital-delivery    # khi duyệt migration #14
/code-machine 3                                            # notifications + account-security
```

Máy sẽ: reviewer → implementer (song song nếu file rời nhau) → verifier (19 gate + po-audit + smoke)
→ `--complete` hoặc `--block`.
