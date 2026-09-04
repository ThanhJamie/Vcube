# SUBAGENT 02: ADMIN FORGECONTROL & DYNAMIC PARAMETERIZATION SPECIALIST
**Vai trò:** Chuyên gia Quản Trị Hệ Thống Admin ForgeControl & Động Hóa Tham Số Toàn Diện  
**Thư mục mục tiêu:** `src/frontend/components/admin/`, `src/frontend/views/AdminDashboardView.tsx`, `src/utils/pricingEngine.ts`  
**Nguyên tắc tối thượng:** **KHÔNG HARDCODE BẤT KỲ CÔNG THỨC, THAM SỐ CHI PHÍ HOẶC NỘI DUNG NÀO. 100% GIÁ TRỊ PHẢI CẤU HÌNH ĐƯỢC TỪ ADMIN VÀ ĐỒNG BỘ QUA SUPABASE.**

---

## 1. MỤC TIÊU & TẦM NHÌN
Xây dựng Trung tâm Điều hành Vận hành Sản xuất & Kinh doanh (VCUBE ForgeControl Console) tập trung, biến toàn bộ các biến số của hệ thống (chi phí nguyên vật liệu, khấu hao máy in, đơn giá điện, hệ số infill, phí nền tảng, tỷ lệ chiết khấu, thông tin xưởng MES, nội dung storefront) thành các trường dữ liệu động có thể chỉnh sửa trực tiếp, kiểm tra tính hợp lệ và lưu trữ bền vững vào Supabase.

---

## 2. DANH MỤC NHIỆM VỤ CHI TIẾT (TASK BREAKDOWN)

### TASK 2.1: Động Hóa Toàn Bộ 8 Thành Phần Chi Phí Trong Công Thức Giá Inkiri
- **Tệp liên quan:** `src/frontend/components/admin/PricingConfigPanel.tsx`, `src/frontend/components/admin/AdminCostRulesPanel.tsx`, `src/utils/pricingEngine.ts`
- **Vấn đề hiện tại:** Một số hệ số hao hụt, phụ phí cố định (Fixed Overhead) vẫn đang tham chiếu hằng số `FIXED_OVERHEAD_PER_UNIT = 15000` hoặc text tĩnh.
- **Yêu cầu triển khai:**
  1. Loại bỏ toàn bộ các hằng số tính giá tĩnh trong `pricingEngine.ts`. Mọi hàm tính toán (`calculateDetailedPricing`, `compute3SidedOrderFinancialSplit`) phải nhận cấu hình `InkiriCostFormulaConfig` truyền vào.
  2. Mở rộng giao diện `PricingConfigPanel.tsx` cho phép Admin điều chỉnh:
     - **Chi phí nguyên liệu:** Hệ số hao hụt phôi thừa (Wastage Rate %), Trọng lượng cuộn chuẩn (1000g).
     - **Năng lượng & Điện:** Đơn giá điện (VNĐ/kWh - mặc định 3,500 đ), Công suất trung bình máy FDM/SLA (kW).
     - **Khấu hao thiết bị:** Chi phí mua máy (CAPEX), Số giờ vận hành dự kiến (vd: 8,000h), Chi phí bảo trì thay thế đầu phun/bàn in theo giờ in.
     - **Nhân công & Kỹ thuật:** Lương kỹ sư vận hành/cắt lớp G-code theo giờ (VNĐ/h), Thời gian xử lý thủ công cho mỗi lệnh in (phút).
     - **Hoàn thiện bề mặt (Post-Processing):** Chi phí rửa cồn IPA 99%, Chiếu tia UV, Tháo support thủ công, Đánh bóng bề mặt.
     - **Bao bì & Vận chuyển cơ sở:** Hộp carton định hình, Xốp bóng khí chống sốc, Tem niêm phong QC.
     - **Vận hành nền tảng & Tài chính:** Phí nền tảng (Platform Commission %), Phí cổng thanh toán (Payment Gateway %), Tỷ lệ bản quyền Designer (Designer Royalty %).
  3. Cung cấp bộ giả lập thử nghiệm tức thời (Formula Sandbox / Dry-Run): Khi Admin thay đổi 1 thông số, biểu đồ chi phí BOM lập tức cập nhật giá bán thử nghiệm tương ứng để kiểm tra biên lợi nhuận trước khi bấm "Lưu Vào Supabase".

### TASK 2.2: Bảng Chiết Khấu Số Lượng Lớn Động (Dynamic Batch Volume Discount Tiers)
- **Tệp liên quan:** `src/frontend/components/admin/PricingConfigPanel.tsx`, `src/types/index.ts`
- **Yêu cầu triển khai:**
  1. Cho phép Admin tự do Thêm / Sửa / Xóa các nấc số lượng in hàng loạt (Volume Discount Tiers), ví dụ:
     - $5 - 19$ sản phẩm: Giảm $10\%$
     - $20 - 49$ sản phẩm: Giảm $18\%$
     - $50 - 99$ sản phẩm: Giảm $25\%$
     - $100+$ sản phẩm: Giảm $35\%$
  2. Cấu hình ngưỡng đơn giá sàn tối thiểu (Price Floor Guard) để tránh việc giảm giá làm âm chi phí BOM thực tế của xưởng.

### TASK 2.3: Quản Trị Động Nội Dung Trang Web & Banner (Storefront CMS)
- **Tệp liên quan:** `src/frontend/components/admin/AdminStorefrontPanel.tsx`, `src/frontend/views/HomeView.tsx`
- **Yêu cầu triển khai:**
  1. Toàn bộ các chuỗi văn bản trên giao diện: Tiêu đề Hero Banner, Slogan, Số hotline CSKH, Email hỗ trợ, Địa chỉ 3 xưởng Hà Nội - Đà Nẵng - TP.HCM phải được đọc trực tiếp từ bảng `site_content` trong Supabase.
  2. Cho phép Admin tải lên hình ảnh Banner mới trực tiếp qua Supabase Storage (`product-images` bucket).
  3. Bật/Tắt thanh thông báo khẩn cấp đầu trang (Top Announcement Bar) kèm nút gạt Switch toggle.

### TASK 2.4: Nâng Cấp Bộ Điều Phối Sản Xuất Hàng Đợi (MES Human-in-the-Loop Dispatcher)
- **Tệp liên quan:** `src/frontend/components/admin/AdminProductionQueuePanel.tsx`, `src/frontend/components/admin/AdminPartnersPanel.tsx`
- **Yêu cầu triển khai:**
  1. Hiển thị đề xuất thông minh: Hệ thống gợi ý trạm xưởng phù hợp (vd: Khách ở TP.HCM $\to$ Gợi ý VCUBE Smart MES Hub HCM).
  2. Trưởng xưởng / Dispatcher có quyền xem xét tồn kho thực tế và bấm nút **"Xác Nhận Điều Phối"** (Confirm Dispatch) hoặc chuyển tiếp đơn hàng sang trạm khác nếu máy in đang bảo trì.
  3. Cho phép gán trực tiếp Mã máy in cụ thể (lấy động từ danh sách máy in `printer_fleet` trong Supabase) và nhập Ghi chú kỹ thuật cho thợ in.

### TASK 2.5: Quản Lý 4 Nhóm Tác Nhân & Phê Duyệt KYC Danh Tính
- **Tệp liên quan:** `src/frontend/components/admin/AdminUsersPanel.tsx`
- **Yêu cầu triển khai:**
  1. Xem danh sách 4 vai trò: Customer, Designer Pro, MES Hub, Admin.
  2. Kiểm tra hồ sơ định danh KYC: CCCD, Mã số thuế cá nhân, Tên công ty, Số tài khoản ngân hàng thụ hưởng.
  3. Nút phê duyệt (Approve) và từ chối (Reject kèm lý do) gọi trực tiếp `dbService.updateUserKyc` để cập nhật trạng thái vào Supabase.

---

## 3. TIÊU CHÍ NGHIỆM THU (ACCEPTANCE CRITERIA)
- Mọi thay đổi về giá, chi phí khấu hao, chiết khấu hoặc địa chỉ xưởng trong Admin đều có hiệu lực tức thời trên giao diện khách hàng sau khi lưu.
- Tuyệt đối không còn hằng số giá tĩnh nào nằm rải rác trong mã nguồn client.
- Toàn bộ component Admin đều hỗ trợ thông báo Toast và xử lý trạng thái Loading / Error mượt mà.
