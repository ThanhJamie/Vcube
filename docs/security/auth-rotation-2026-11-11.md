<!-- doc-meta: status=active; verified=2026-11-11; owner=lead -->
# Auth rotation — 2026-11-11

> **Không chứa mật khẩu.** Mật khẩu mới nằm trong file `0600` ngoài repo:
> `/home/agent/.secrets/vcube-auth-rotation-20261111.txt` (không commit, không log).

## 1. Vì sao

Kiểm tra hash `auth.users` cho thấy mật khẩu dễ đoán: 6/7 tài khoản khớp `123456`, 1/7 khớp
`Password123!@`, 0/7 khớp `1234566`. Không có bằng chứng truy cập trái phép, nhưng đây là rủi ro
P0 trước khi dùng DB hiện tại cho bất kỳ luồng thật.

## 2. Đã làm

- Dùng **Supabase Auth Admin API** (`PUT /auth/v1/admin/users/{id}`) tại môi trường server/agent;
  **không** sửa trực tiếp `auth.users` bằng SQL.
- Rotate **7/7** tài khoản bằng mật khẩu ngẫu nhiên riêng từng tài khoản (24 byte base64url).
- Ghi file `0600`, thư mục `0700` ngoài repo; không in mật khẩu ra chat/log.
- Kiểm lại hash: `123456` = 0/7, `1234566` = 0/7, `Password123!@` = 0/7.
- Kiểm session: `auth.sessions` = 0, `auth.refresh_tokens` = 0 ⇒ refresh token/phiên hiện tại
  đã bị thu hồi; access JWT cũ (nếu có) vẫn có thể sống tới expiry theo tài liệu Supabase.

## 3. Còn mở

- File mật khẩu chỉ là nguồn tạm; cần chuyển vào password manager/kênh an toàn của owner rồi xoá file.
- 1/7 tài khoản **không có `user_profiles`** — cần owner xác nhận là tài khoản test hay thiếu hồ sơ.
- Bật chính sách mật khẩu mạnh/chống mật khẩu đã lộ nếu gói dự án hỗ trợ; xem lịch sử đăng nhập/thay đổi nhạy cảm.
- Access JWT đã cấp trước rotation có thể còn hiệu lực tới expiry; nếu cần thu hồi tức thời, dùng
  cơ chế session/JWT expiry phù hợp (không đổi bằng SQL `auth.users`).
