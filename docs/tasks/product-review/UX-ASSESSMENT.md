<!-- doc-meta: status=active; verified=2026-10-23; owner=design-foundation -->
# UX ASSESSMENT — "nhìn và dùng thử" (guest quan sát thật, persona khác theo code)

> Quan sát: Chromium headless, DB demo `[MẪU]`, 2026-10-23 · 33 ảnh trong `screens/`.
> **Theme UI hiện tại (v3 "Soft Studio") đã được duyệt — tài liệu này KHÔNG đề xuất đổi
> theme/layout tổng thể.** Mọi khuyến nghị dưới đây là nối dữ liệu/hành vi, không phải restyle.

---

## 1. "First 5 minutes" theo persona

### 1.1 Khách vãng lai — **quan sát trực tiếp** (1440 & 390)

| Thời điểm | Họ thấy gì | Đánh giá |
|---|---|---|
| 0–10 s | Trang chủ: nền kem, logo coral `V / VCUBE VIỆT NAM`, nav 2 mục, **banner `[MẪU]` ở trên cùng**, tiếp đó **một banner `[MẪU]` thứ hai** + nút "Xem Sản Phẩm Tag 2/9". Hero headline lớn + **khung 3D xoay được** ngay trên màn hình 1440. | Ấn tượng đầu **rất tốt**; trừ điểm vì banner mẫu lặp và CTA "Tag 2/9" (chiến dịch không tồn tại) gây khó hiểu. 390: 3D nằm dưới fold, vẫn rõ CTA. |
| 10–40 s | `/explore`: tiêu đề rõ, **6 tile danh mục pastel**, chip lọc nhanh, search, sort, toggle grid/table. 10 mẫu hiện ra nhưng **ảnh sản phẩm là khối xám** (0 `<img>`). | Bố cục và filter **dễ dùng**; cảm giác "chưa xong" vì ảnh trống — lỗi dữ liệu demo, không phải UI. Bấm thử filter: **không đổi URL**; refresh là mất trạng thái. |
| 40–90 s | PDP `[MẪU] Giá đỡ điện thoại`: breadcrumb, 3D 360°, tab Khung 3D/Thư viện ảnh, card giá sticky bên phải với **2 lựa chọn rõ ràng: Đặt in 3D 320.000 ₫ / Mua tệp CAD 120.000 ₫**, cấu hình vật liệu/màu/layer. | **Đây là màn thuyết phục nhất** — đúng chuẩn marketplace in 3D. Trừ điểm: `SKU: —`, "4.4 (5 đánh giá)" nhưng tab Đánh giá **không có nội dung đánh giá nào**; ảnh thư viện trống. |
| 90–150 s | `/quote`: kéo/thả tệp; tự tay upload 1 khối STL 20×20×20 mm → hiện **cây đối tượng, 3D, 8,0 cm³, 12 tam giác**, chọn máy/vật liệu/layer → **giá 111.000 đ**, nút thêm vào giỏ. | **Điểm "wow" thứ hai.** Rõ ràng, nhanh, không cần đăng nhập. Thiếu: không lưu báo giá/không gửi email/không có mã báo giá. |
| 150–300 s | `/cart` (có hàng): nhóm Sản phẩm in 3D, promo ghi thật "hệ thống chưa có danh sách khuyến mãi", ship 30.000, VAT 8%, tổng 378.000; `/checkout` guest mode: form SĐT/địa chỉ rõ, 3 phương thức thanh toán. | Luồng mua **trơn**; nhưng thanh toán ghi "mô phỏng/thủ công", box chuyển khoản "Chưa cấu hình thông tin" ⇒ người dùng **dừng lại vì không biết trả tiền thế nào**. |

**Tổng first-5 guest:** 9/10 về trình bày, 6/10 về "đi đến cùng". Người dùng sẽ tin đây là sản
phẩm thật cho tới bước thanh toán/nhận file.

### 1.2 Khách hàng — **chưa quan sát được (thiếu account)**, suy từ code

- Đăng nhập → `/orders`: **luôn thấy "Bạn chưa có đơn hàng nào"** kể cả khi có đơn
  (`useOrdersData.ts:44-55` chỉ fetch cho admin). Đây là trải nghiệm tệ nhất trong toàn bộ
  sản phẩm: khách vừa mua xong, quay lại tìm đơn và bị nói rằng chưa từng mua.
- `/assets`: trạng thái "chưa hỗ trợ tải trực tiếp" trung thực nhưng **không phải kết quả khách
  trả tiền để nhận**.
- Hoá đơn: chỉ mở được khi đơn còn trong state RAM; F5 là mất.
- Không có trang tài khoản để sửa tên/địa chỉ/mật khẩu; "Quên mật khẩu?" chỉ hiện câu
  "liên hệ hỗ trợ" (reset tắt cờ — `AuthModal.tsx:14`).
- Bảo hành: form mở được, bấm gửi báo "đã ghi nhận" nhưng không lưu.

### 1.3 Nhà thiết kế — **chưa quan sát được**, suy từ code

- Vào `/designer`: overview hiện yêu cầu CAD (realtime thật), models CRUD, upload wizard rõ
  ràng (file → thông tin → giấy phép/giá → chờ duyệt), requests claim + chat hoạt động.
- **Payouts**: số dư `—`, nút rút disabled, bảng rỗng — designer hiểu ngay "chưa có hệ thống
  trả tiền". Đây là chặn niềm tin lớn nhất để họ đăng bán thật.
- Không thấy trạng thái duyệt hồ sơ/KYC của chính mình; không có thông báo khi mẫu được duyệt.

### 1.4 Xưởng in — **chưa quan sát được**, suy từ code

- `/lab` lần đầu: onboarding wizard (hồ sơ xưởng) → chờ duyệt → 6 tab vận hành (hàng đợi,
  máy in, vật liệu & kho, phụ kiện, sổ kho, cấu hình xưởng). CRUD máy/vật liệu/accessory và
  tồn kho **là thật**.
- **Hàng đợi luôn rỗng** vì không có đường gán đơn (`orders.assigned_workshop_id` không được
  ghi ở checkout hay admin). Xưởng đăng nhập ngày đầu sẽ nghĩ "hệ thống không có việc".
- Không có thông báo đơn mới, không sao kê doanh thu/commission.

### 1.5 Quản trị viên — **chưa quan sát được**, suy từ code

- `/admin`: 22 section/16 nhóm nav; overview có số đếm (đơn chưa xong, tồn thấp, KYC chờ);
  products/workshops/machines/users+pricing/inventory/CMS/SEO/settings đều **có thật**.
- Tab "Điều phối" (`Group5ProductionPanel.tsx:26`) tồn tại nhưng **không có thao tác lưu gán
  xưởng** ⇒ nhìn như tính năng đã xong nhưng bấm không có kết quả (affordance giả).
- Không có màn duyệt payout; không có sổ giao dịch thanh toán để đối soát.
- Bề mặt rộng: người mới cần ~1 ngày để học 22 section; thiếu "hôm nay cần xử lý gì".

### 1.6 Điều phối viên/vận hành (suy diễn) — **không quan sát được**

Không có role/màn riêng. Người làm vận hành sẽ phải mở admin + lab + chat thủ công; không có
inbox công việc, không audit thao tác, không cảnh báo SLA.

---

## 2. Điểm mạnh thật — **giữ nguyên, đừng đổi theme**

1. **Ngôn ngữ thị giác v3 đồng bộ**: cream canvas, card mềm, radius lớn, coral chỉ ở brand mark;
   toàn bộ route dùng cùng một ngôn ngữ — nhìn là biết "một sản phẩm".
2. **3D là lợi thế thật**: hero 3D + PDP 360° + quote viewer. Không đối thủ VN nào có lớp
   trải nghiệm này.
3. **`/quote` là công cụ thật, không phải mock**: parse STL/3MF/OBJ, thể tích/kích thước, chọn
   máy/vật liệu/layer, ra giá — đã tự kiểm chứng (`screens/quote-analyzed-1440.png`).
4. **Trung thực dữ liệu (data-honesty)**: promo nói thật là chưa có khuyến mãi; asset nói thật
   là chưa tải được; rating chỉ hiện khi có; demo có nhãn `[MẪU]`. Đây là điểm tin cậy hiếm có.
5. **Guest checkout**: không bắt đăng ký, cấp token tra cứu — đúng cho persona kỹ sư mua nhanh.
6. **VI-only + Be Vietnam Pro**: dấu tiếng Việt đẹp, không lẫn EN; microcopy rõ nghề.
7. **390 không tràn ngang, 0 pageerror** trên 14 route đã đo; tap target/empty-state đạt.
8. **Console nhìn "nghề"**: admin 22 section, lab 6 tab + kanban, designer 5 tab — tạo cảm giác
   hệ sinh thái vận hành, không chỉ storefront.

---

## 3. Top 10 vấn đề (P0/P1/P2) — có bằng chứng

| # | Mức | Vấn đề người dùng gặp | Bằng chứng |
|---|---|---|---|
| 1 | **P0** | **Khách không bao giờ thấy đơn của mình.** `/orders` chỉ fetch khi role=admin ⇒ luôn empty sai sự thật. | `/orders` (`AppRoutes.tsx:299`); `useOrdersData.ts:44-55`; `orderService.ts:46` 0 caller |
| 2 | **P0** | **Mua file CAD xong không nhận được file.** Không ghi `order_files`/`storage_path`; library luôn báo "chưa hỗ trợ tải". | `/assets` (`AppRoutes.tsx:314`); `AssetLibraryView.tsx:50-52`; không writer; RLS `harden_rls.sql:628-641` |
| 3 | P1 | **Đơn không có dòng hàng/giao dịch để vận hành tiếp.** Checkout chỉ ghi bảng `orders`; không `order_items`, không `payment_transactions`; thanh toán là "mô phỏng/thủ công", không có thông tin chuyển khoản. | `CheckoutView.tsx:143-146,194,216-222`; `database.ts:240-318` (chỉ `orders.upsert`) |
| 4 | P1 | **Màn xác nhận đơn không bền.** Đơn chỉ ở RAM; F5 mất; route `/order-success` không id luôn "không tìm thấy". | `OrderSuccessRoute` + `resolveOrderById` (`routeWrappers.tsx`); `AppRoutes.tsx:257` |
| 5 | P1 | **Điều phối đơn→xưởng không lưu được** ⇒ xưởng luôn hàng đợi rỗng, MES không có việc. | `Group5ProductionPanel.tsx:26,156` (tab nhưng không write); `CheckoutView.tsx:216-222` không truyền `assignedWorkshopId` |
| 6 | P1 | **Designer không có đường nhận tiền.** Payout trống, nút rút disabled; không ledger/không màn duyệt; UI nhập bank chưa nối RPC. | `DesignerPayoutsTab.tsx:35,84,110`; `useDesignerAdminStore.ts:27-41,119` |
| 7 | P1 | **Vòng tin cậy đánh giá hở.** PDP hiện "4.4 (5 đánh giá)" từ cột sản phẩm nhưng không có danh sách/không viết được review. | `ProductDetailView.tsx:143-147,925-975`; không service ghi `reviews` |
| 8 | P2 | **Catalog thiếu ảnh thật** — card xám placeholder; cảm giác "chưa xong", giảm tỷ lệ click. | Quan sát `/explore` 1440/390 (`screens/explore-1440.png`), 0 `<img>`; dữ liệu demo không thumbnail |
| 9 | P2 | **Filter/bookmark không bền, không chia sẻ được.** Filter không ghi URL; bookmark mất khi rời trang. | `ExploreView.tsx:215-226` (state), `:224,249-256`; **0** `setSearchParams` |
| 10 | P2 | **Nhiễu demo + CTA chết ở đầu trang.** Banner `[MẪU]` lặp 2 lần; "Xem Sản Phẩm Tag 2/9" trỏ chiến dịch không tồn tại. | Quan sát `/` (`screens/home-1440.png`); nội dung từ `site_content` demo |

**Dưới Top 10 (P3, ghi nhận):** không có trang tài khoản; Google/reset tắt cờ nhưng UI vẫn có
chỗ nhắc; chat "trợ lý tự động" trả lời chung chung không tạo ticket; `ProtectedRoute` không giữ
`redirectTo` (khác `RoleGuard`); admin không realtime đơn.

---

## 4. "Nếu chỉ được sửa 5 thứ" (theo giá trị người dùng / đồng)

| Ưu tiên | Sửa gì | Vì sao người dùng thấy ngay | Chi phí kỳ vọng |
|---:|---|---|---|
| 1 | **Nạp đơn của khách ở `/orders`** + error state | Trang thôi "nói sai"; khách thấy lịch sử, mở lại hoá đơn/tracking | Rất thấp: 1 effect dùng `getOrders()` (RLS đã lọc theo user) |
| 2 | **Hoàn tất chuỗi giao file CAD**: checkout ghi `order_files` + `digital_assets`/storage, `/assets` cấp signed URL | Biến "mua file số" từ demo thành giao dịch thật | Trung bình: writer + policy + storage path |
| 3 | **Ghi đủ đơn để vận hành**: `order_items`, `payment_transactions`, hướng dẫn chuyển khoản cấu hình được | Admin/xưởng có dòng hàng & sổ tiền; khách biết trả thế nào | Trung bình |
| 4 | **Gán đơn→xưởng (write path) + lab queue thật** | Xưởng có việc; khách thấy tiến độ do xưởng cập nhật | Trung bình |
| 5 | **Xác nhận đơn bền + tra cứu được**: `/order-success/:id` resolve từ DB/token, hoặc redirect `/tracking`; hiện mã truy cập rõ | Hết mất đơn sau F5; giảm tải CSKH | Thấp |

> 5 việc này **không đổi theme/layout**; đều là nối dữ liệu đã có bảng/route/service.
> Việc tiếp theo (ngoài top 5): ảnh sản phẩm thật, review write, account/profile, payout ledger,
> notification (email/realtime), filter vào URL.

---

## 5. So sánh ngắn với kỳ vọng thị trường (kiến thức chung, không cần web)

| Kỳ vọng của người mua trên marketplace 3D-printing/CAD | VCUBE hiện tại |
|---|---|
| Báo giá tức thì theo file/vật liệu (như Craftcloud, Protolabs, Hubs) | **Đạt về UX** (client-side, nhanh) — **thiếu**: lưu báo giá/lead, xác nhận qua email |
| Marketplace mẫu có ảnh đẹp + preview 3D + đánh giá (Cults3D, MyMiniFactory, Etsy) | 3D preview **tốt hơn trung bình**; **thiếu ảnh thật & review** (điểm quyết định mua) |
| Checkout tin cậy, thanh toán thật, hoá đơn | Form + VAT rõ; **chưa có cổng thanh toán**, chưa có sổ giao dịch/đối soát |
| Giao file số ngay sau thanh toán | **Không có** (chặn mua file số) |
| Theo dõi đơn minh bạch, thông báo trạng thái | Tracking guest + 8 nấc **tốt**; thiếu lịch sử tài khoản, realtime/email |
| Designer storefront + payout minh bạch | Công cụ đăng bán/giá/giấy phép **có**; payout **không có** |
| Mạng xưởng in + SLA/điều phối (như Hubs network) | MES 6 tab **có**; điều phối–gán việc **không có** |
| Niềm tin: vật liệu, dung sai, chứng từ | Nhãn trung thực, không bịa số — **điểm cộng lớn**; nhưng dữ liệu demo chưa tách bạch tuyệt đối khỏi nhãn thương hiệu |

**Kết luận cạnh tranh:** VCUBE đang ở vị thế "**UX-first, data-second**". Nếu nối đủ 5 việc ở §4,
sản phẩm vượt phần lớn đối thủ nội địa về trải nghiệm 3D và console; nếu không, nó vẫn là
**showroom / demo tool** rất đẹp nhưng chưa phải marketplace vận hành.

---

## 6. Ghi chú trung thực & phần chưa kiểm chứng

- Toàn bộ ảnh chụp dùng **DB demo `[MẪU]`**; không phải dữ liệu kinh doanh thật.
- Persona cần đăng nhập **chưa quan sát runtime**: customer, designer, lab, admin, ops. Kết luận
  của họ dựa trên code + route + service/DB; các kết luận P0/P1 ở trên **đều kiểm bằng code**.
- Chưa chạy tạo đơn thật/thanh toán/email (tránh ghi DB + chưa có dịch vụ); chưa có account
  để kiểm payout/queue/KYC runtime.
- Đo runtime: 14 route × 390/1440 = **0 pageerror, 0 overflow**; upload STL + add-to-cart chạy thật.
