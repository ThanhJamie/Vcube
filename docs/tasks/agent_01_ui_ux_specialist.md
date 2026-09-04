# SUBAGENT 01: UI/UX, DESIGN SYSTEM & CONVERSION RATE OPTIMIZER
**Vai trò:** Chuyên gia Thiết Kế Trải Nghiệm Người Dùng (UI/UX Architect) & Tối Ưu Tỷ Lệ Chuyển Đổi (CRO)  
**Thư mục mục tiêu:** `src/frontend/views/`, `src/frontend/components/`, `src/index.css`  
**Skills áp dụng:** `ui-ux-pro-max`, `ui-styling`, `design-system`, `brand`

---

## 1. MỤC TIÊU & TẦM NHÌN
Chuyển hóa toàn bộ giao diện VCUBE từ một nguyên mẫu kỹ thuật thành một sàn thương mại và cổng dịch vụ chế tác 3D trực quan, sang trọng (Modern Industrial Glassmorphism), loại bỏ hoàn toàn ma sát trải nghiệm, tối ưu hóa tỷ lệ chuyển đổi đơn hàng và hỗ trợ mượt mà trên mọi thiết bị (Desktop, iPad, Mobile iOS/Android).

---

## 2. DANH MỤC NHIỆM VỤ CHI TIẾT (TASK BREAKDOWN)

### TASK 1.1: Gỡ Bỏ Walled Garden & Mở Toàn Bộ Trải Nghiệm Cho Khách Vãng Lai
- **Tệp liên quan:** `src/frontend/views/HomeView.tsx`, `src/App.tsx`
- **Vấn đề hiện tại:** Khách chưa đăng nhập bấm vào sản phẩm hoặc nút xem trước 3D bị hàm `handleProtectedAction` và `handleSelectProductAction` ép chuyển hướng sang `/login`.
- **Yêu cầu triển khai:**
  1. Loại bỏ toàn bộ các điều kiện chặn đăng nhập khi duyệt xem sản phẩm, mở modal 3D, đổi góc nhìn, phóng to thu nhỏ, và chuyển tab danh mục.
  2. Cho phép khách vãng lai tự do cấu hình thông số (vật liệu, màu sắc, tỷ lệ infill, khắc chữ cá nhân hóa) và bấm "Thêm Vào Giỏ Hàng".
  3. Giỏ hàng được lưu trữ trong Zustand store (`useCartStore`) và đồng bộ an toàn với `localStorage`.
  4. Chỉ điều hướng hoặc mở popup đăng nhập khi khách hàng bấm nút **"Tiến Hành Đặt Hàng"** tại bước cuối cùng của `CartView` / `CheckoutView`.

### TASK 1.2: Thiết Kế Vùng Kéo Thả Báo Giá Nhanh Tại Hero Banner (Hero Instant Quote Widget)
- **Tệp liên quan:** `src/frontend/views/HomeView.tsx`, `src/frontend/components/tool3d/UnifiedCadToolbar.tsx`
- **Yêu cầu triển khai:**
  1. Xây dựng một Widget nhận diện tệp kéo thả (.stl, .step, .stp, .3mf, .obj) nổi bật ngay bên phải Hero Banner của trang chủ.
  2. Hiệu ứng viền phát sáng động (Cyber-Industrial Glow: cyan #57DFFE kết hợp deep navy #091426).
  3. Ngay khi thả file, hiển thị thẻ tính toán tóm tắt: Tên file, thể tích ước tính, vật liệu gợi ý (PLA Pro), đơn giá dự toán tức thì trong 3 giây.
  4. Cung cấp nút CTA: *"In Ngay"* (chuyển thẳng tới Checkout với item phôi đã cấu hình) và *"Chỉnh Sửa Chi Tiết"* (chuyển sang Tool3DView).

### TASK 1.3: Bảng Ma Trận So Sánh Vật Liệu Trực Quan (Interactive Material Matrix)
- **Tệp liên quan:** Tạo mới `src/frontend/components/MaterialComparisonMatrix.tsx`, tích hợp vào `ExploreView.tsx` và `ProductDetailView.tsx`
- **Yêu cầu triển khai:**
  1. Thiết kế bảng so sánh trực quan các nhóm vật liệu:
     - **FDM Standard:** PLA Pro (Thẩm mỹ, trang trí, nguyên mẫu nhanh).
     - **FDM Technical:** PETG Technical Pro (Kháng ẩm, kháng hóa chất, bền cơ học).
     - **FDM Industrial:** ABS Industrial, PA-CF Carbon Fiber (Chịu nhiệt 100°C+, độ cứng cao, phụ tùng xe).
     - **SLA Photopolymer:** Tough Resin 8K (Bề mặt siêu mịn, không thấy đường layer, chi tiết siêu nhỏ).
  2. Biểu diễn trực quan bằng thanh điểm (1-5 sao) hoặc Radar Chart cho 4 tiêu chí: Độ bền va đập, Chịu nhiệt độ, Thẩm mỹ bề mặt, Giá thành.
  3. Cung cấp bộ lọc theo mục đích sử dụng thông minh: *"Đồ gá cơ khí"*, *"Mô hình trưng bày"*, *"Vỏ hộp mạch điện tử"*, *"Kháng nước ngoài trời"*.

### TASK 1.4: Tối Ưu Hóa Phễu Đặt Hàng & Thanh Toán (Checkout View CRO)
- **Tệp liên quan:** `src/frontend/views/CheckoutView.tsx`, `src/frontend/views/CartView.tsx`
- **Yêu cầu triển khai:**
  1. Cung cấp luồng **Guest Checkout**: Khách hàng chỉ cần nhập Họ tên, SĐT nhận hàng, Địa chỉ và Email nhận hóa đơn/mã tra cứu; không bắt buộc tạo mật khẩu.
  2. Sinh mã tra cứu bảo mật `secure_access_token` gắn vào đơn hàng để khách tra cứu tiến độ in mà không cần tài khoản.
  3. Bổ sung các huy hiệu tin cậy (Trust Badges): *Cam kết dung sai cơ khí ISO 2768*, *Đổi trả in lại 100% nếu cong vênh/lỗi kỹ thuật*, *Bảo mật bản vẽ CAD theo chuẩn NDA*.
  4. Hiển thị mã VietQR động tự động kèm hướng dẫn quét mã ngân hàng 24/7.

### TASK 1.5: Tối Ưu Toàn Diện Giao Diện Di Động & Trải Nghiệm Cảm Ứng
- **Tệp liên quan:** `src/index.css`, `src/frontend/components/Header.tsx`, `src/frontend/views/ProductDetailView.tsx`, `src/frontend/views/OrderTrackingView.tsx`
- **Yêu cầu triển khai:**
  1. Áp dụng chuẩn **iOS Safe Area** (`env(safe-area-inset-bottom)`) cho tất cả các thanh công cụ, thanh đặt in cố định dưới đáy màn hình (Bottom Sticky Bars).
  2. Kích thước vùng bấm chạm tối thiểu đạt chuẩn $44 \times 44\text{ px}$ (Touch Targets) trên smartphone.
  3. Trực quan hóa tiến trình 8 bước sản xuất tại trang Theo dõi đơn hàng với hiệu ứng phát sáng cho bước đang in và chỉ báo camera trực tiếp.

---

## 3. TIÊU CHÍ NGHIỆM THU (ACCEPTANCE CRITERIA)
- Khách vãng lai mở trình duyệt ẩn danh (Incognito) có thể xem toàn bộ sản phẩm, tương tác 3D, thêm vào giỏ hàng và đến bước Checkout thành công mà không bị chuyển hướng sang `/login`.
- Giao diện đạt chuẩn Responsive hoàn hảo trên iPhone 13/14/15/16, iPad Air, và màn hình Desktop 4K.
- Chạy `npm run lint` đạt 0 lỗi TypeScript và bundle sạch sẽ.
