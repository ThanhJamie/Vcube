/**
 * authFlags — cờ tạm gác các affordance auth CHƯA bật (TECH-01).
 *
 * Trước đây 2 cờ này nằm trong `src/frontend/components/AuthModal.tsx` (modal chết,
 * không còn luồng nào mở). Khi xoá modal, cờ được chuyển sang module config nhỏ này để
 * `LoginView`/`RegisterView` vẫn giữ nguyên hành vi ẩn/hiện affordance.
 *
 * Bật lại: cấu hình dịch vụ tương ứng (SMTP / Google provider trong Supabase Dashboard)
 * rồi đổi cờ thành `true`. Project HIỆN CHƯA bật cả hai.
 */

/**
 * Chức năng "Quên mật khẩu" TẠM ẨN.
 *
 * Lý do: repo chưa có dịch vụ gửi mail; `resetPasswordForEmail` phụ thuộc SMTP của
 * Supabase Auth và chưa được xác nhận. Bật lại: cấu hình SMTP trong Dashboard, rồi đổi
 * cờ này thành `true`.
 */
export const ENABLE_PASSWORD_RESET = false;

/**
 * D7 — Google OAuth TẠM GÁC. Project CHƯA bật Google provider trong Supabase Dashboard,
 * nên bấm nút Google sẽ đi vào chỗ lỗi. Nút vẫn còn trong code nhưng bị chặn bởi cờ này.
 * Bật lại: cấu hình provider Google, rồi đổi cờ này thành `true`.
 */
export const ENABLE_GOOGLE_OAUTH = false;
