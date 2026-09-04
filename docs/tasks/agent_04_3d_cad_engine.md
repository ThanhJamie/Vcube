# SUBAGENT 04: 3D CAD WEBGL ENGINE & COMPUTATIONAL GEOMETRY SPECIALIST
**Vai trò:** Kỹ Sư Đồ Họa 3D WebGL (Three.js Engine Specialist) & Chuyên Gia Hình Học Tính Toán (Computational Geometry)  
**Thư mục mục tiêu:** `src/frontend/components/tool3d/`, `src/utils/meshParser.ts`, `src/workers/`  
**Nhiệm vụ trọng tâm:** **SỬA LỖI HÌNH HỌC MANIFOLD, CHUYỂN TẢI XỬ LÝ SANG WEB WORKER, TỐI ƯU HÓA BỘ NHỚ GPU VÀ TRIỂN KHAI THUẬT TOÁN KIỂM ĐỊNH CHẾ TÁC DfAM THỰC THỤ.**

---

## 1. MỤC TIÊU & TẦM NHÌN
Nâng cấp động cơ hiển thị 3D (VCUBE MESH ENGINE v2.6) lên cấp độ công nghiệp ổn định tuyệt đối: không bao giờ giật lag giao diện luồng chính khi nạp tệp CAD dung lượng lớn, nhận diện chính xác độ kín nước (Watertight Manifold) và cung cấp các công cụ phân tích chế tác (DfAM - Design for Additive Manufacturing) trực quan trước khi đưa vào sản xuất.

---

## 2. DANH MỤC NHIỆM VỤ CHI TIẾT (TASK BREAKDOWN)

### TASK 4.1: Sửa Triệt Để Thuật Toán Nhận Diện Watertight Manifold
- **Tệp liên quan:** `src/utils/meshParser.ts`
- **Vấn đề hiện tại:** Hàm `analyzeMeshDefects` đang đếm chỉ số đỉnh thô (`i1_i2`). Với tệp STL không được đánh chỉ số (unindexed geometry), mỗi tam giác có 3 đỉnh riêng biệt, dẫn tới việc mọi cạnh đều chỉ xuất hiện 1 lần (`boundaryEdges = totalEdges`) và kết luận sai $100\%$ rằng tệp bị rách / hở.
- **Yêu cầu triển khai:**
  1. Sử dụng `BufferGeometryUtils.mergeVertices(geom, 1e-4)` để hàn gắn các đỉnh trùng tọa độ trong không gian trước khi quét cạnh.
  2. Xây dựng cấu trúc dữ liệu đồ thị nửa cạnh (Half-edge Map):
     - Một cạnh hợp lệ của vật thể đóng kín (Watertight Solid) phải được chia sẻ bởi chính xác $2$ tam giác ngược hướng nhau.
     - Cạnh chỉ thuộc về $1$ tam giác: Cạnh biên hở (Hole / Boundary).
     - Cạnh thuộc về $> 2$ tam giác: Cạnh phi đa tạp (Non-manifold Edge - lỗi tự giao cắt hoặc thành vách rỗng bên trong).
  3. Trả về kết quả chính xác: `isWatertight: boolean`, số lượng cạnh hở, số lượng cạnh phi đa tạp.

### TASK 4.2: Đóng Gói Đường Ống Xử Lý Tệp Vào Dedicated Web Worker
- **Tệp liên quan:** Tạo mới `src/workers/cadParser.worker.ts`, cập nhật `meshParser.ts`
- **Yêu cầu triển khai:**
  1. Tạo Web Worker chuyên trách xử lý ngầm các tác vụ nặng:
     - Đọc mảng nhị phân ArrayBuffer của STL / 3MF / OBJ.
     - Tính toán thể tích theo định lý phân kỳ Gauss $\iint \mathbf{F} \cdot \mathbf{n} \, dS$.
     - Tính diện tích bề mặt (Surface Area) và kích thước hộp bao 3 chiều ($X, Y, Z$).
     - Rút gọn lưới tam giác (Mesh Decimation) khi số lượng mặt $> 500,000$ tam giác.
  2. Dữ liệu đỉnh (Position & Normal Float32Arrays) được chuyển về Main Thread thông qua cơ chế `Transferable Objects` (không tốn thời gian sao chép bộ nhớ).
  3. Luồng giao diện chính (Main Thread) duy trì ổn định 60 FPS trong suốt quá trình người dùng tải tệp 50MB+.

### TASK 4.3: Bộ Thuật Toán Kiểm Định Chế Tác DfAM (Computational Geometry Analysis)
- **Tệp liên quan:** `src/frontend/components/tool3d/ModelViewer3D.tsx`, `src/frontend/components/tool3d/ValidationReportPanel.tsx`
- **Yêu cầu triển khai:**
  1. **Phân tích thành mỏng (Thin-wall Raycasting Analysis):**
     - Bắn tia ray ngược chiều pháp tuyến mặt từ bên trong phôi.
     - Tính khoảng cách tới mặt đối diện. Nếu khoảng cách $< 0.8\text{ mm}$ (chuẩn đầu phun $0.4\text{ mm}$ in 2 perimeter), đánh dấu màu đỏ (Vertex Heatmap) cảnh báo chi tiết có nguy cơ gãy rụng khi bóc support.
  2. **Phân tích góc nghiêng cần giá đỡ (Overhang Angle Analysis):**
     - So sánh pháp tuyến mặt $\mathbf{N}$ với phương thẳng đứng của trục $Z$.
     - Nếu $\theta > 45^\circ$, hiển thị màu cam hổ phách và tính tỷ lệ phần trăm bề mặt cần tạo support.
  3. **Mô phỏng lát cắt đầu phun trực quan (Toolpath Slicer Preview Slider):**
     - Bổ sung thanh trượt cắt lớp từng tầng cao (Layer Height Slider) mô phỏng quá trình đắp từng lớp từ $0$ đến $100\%$ chiều cao chi tiết.

### TASK 4.4: Bảo Vệ Bộ Nhớ WebGL & Chống Rò Rỉ VRAM
- **Tệp liên quan:** `src/frontend/components/tool3d/ModelViewer3D.tsx`
- **Yêu cầu triển khai:**
  1. Bảo đảm khi chuyển đổi qua lại giữa các tệp STL/3MF hoặc rời khỏi trang, hàm dọn dẹp `disposeHierarchy()` hủy toàn bộ `BufferGeometry`, `Material`, `Texture` và `WebGLRenderTarget`.
  2. Giữ nguyên cờ `isSharedGeometry: true` trên các mesh stencil capping để không làm đứt gãy hình học hiển thị chính.

---

## 3. TIÊU CHÍ NGHIỆM THU (ACCEPTANCE CRITERIA)
- Kiểm tra độ kín nước (Watertight) đạt độ chính xác $100\%$ trên cả tệp STL indexed và unindexed.
- Nạp tệp CAD dung lượng lớn không làm giảm FPS của trang chủ hoặc công cụ 3D xuống dưới 55 FPS.
- Toàn bộ các cảnh báo DfAM (thành mỏng, góc nghiêng) hiển thị trực quan trên thanh thông số kỹ thuật.
