<!-- doc-meta: status=active; verified=2026-10-23; owner=design-foundation -->
# HANDOFF — Product review (persona người dùng · feature gap · UX)

> **Work item:** `task-42` · **Agent:** `design-foundation` · **Ngày:** 2026-10-23
> **Repo:** `/home/thanh/home/thanh/project/Vcube` · **HEAD:** `b78c24a` · **Read-only `src/**`**
> **Trạng thái:** DONE — 4 tài liệu + 33 ảnh chụp; **0 file `src/` bị sửa**, không commit.

## 1. Deliverables

| File | Nội dung |
|---|---|
| `docs/tasks/product-review/README.md` | mục tiêu, phương pháp/độ tin cậy, **kết luận 60 giây + thang điểm 5**, tóm tắt persona, cách đọc |
| `docs/tasks/product-review/USER-PERSONAS.md` | **6 persona** (guest, customer, designer, lab/workshop, admin, ops-suy-diễn): JTBD, route, dữ liệu, thước đo thành công, đau đớn + bằng chứng; phụ lục bằng chứng runtime |
| `docs/tasks/product-review/FEATURE-MATRIX.md` | **72 dòng** (14/12/11/12/15/8), cột `Mức | Hiện có (✅/⚠️/❌) | Bằng chứng route+file:line | Gap`; bảng bảng-DB-không-có-writer |
| `docs/tasks/product-review/UX-ASSESSMENT.md` | First-5-min từng persona, 8 điểm mạnh (giữ theme), **Top 10 P0/P1/P2**, "nếu chỉ sửa 5 thứ", so sánh kỳ vọng thị trường |
| `docs/tasks/product-review/screens/` | **33 ảnh PNG** 390/1440: home, explore, PDP, quote đã upload STL, cart có hàng, checkout guest, tracking, login/register, 404, guard-redirect |

## 2. Phương pháp (tự kiểm chứng, không copy audit cũ)

- **Code truth:** `AppRoutes.tsx` (30 route) + 16 view + hooks/routes/shell + `backend/services/*`
  + 32 bảng trong `supabase/migrations/*.sql`.
- **DB thật:** Supabase REST anon key từ `.env` (không in khoá): 10 sản phẩm demo, 8 materials,
  7 printer_fleet, 5 accessories, 1 review, 2 workshop_profiles, 1 site_content; `orders` = 0.
- **Browser thật:** Chromium headless (cache Playwright + `~/.local/share/opencode-pwlibs`),
  CDP: 14 route × 390/1440, **upload STL thật**, **add-to-cart thật**, đọc DOM/text/screenshot.
- Audit cũ đọc để đối chiếu nhưng **số liệu đã lỗi thời** (ghi HEAD 97cc256/App 2152/isVi); mọi
  kết luận trong bộ mới đều kiểm lại trên HEAD `b78c24a` (App 343, Phase 1–5 xong).

## 3. Top 5 phát hiện (người dùng cảm nhận trực tiếp)

1. **UI/3D đã ở mức sản phẩm:** guest đi trọn khám phá → PDP → quote (upload STL 20 mm → 8,0 cm³
   → **111.000 đ**) → add-to-cart (toast + badge) → checkout guest, **0 pageerror/0 overflow**.
2. **P0 — `/orders` của khách không bao giờ nạp đơn:** `useOrdersData.ts:44-55` chỉ fetch cho
   admin; `orderService.ts:46` 0 caller ⇒ khách luôn thấy "chưa có đơn hàng".
3. **P0 — mua file CAD không nhận được file:** không writer `order_files`/`storage_path`;
   `/assets` luôn "chưa hỗ trợ tải trực tiếp"; RLS `digital_assets` chỉ designer/admin.
4. **P1 — đơn chỉ ghi 1 bảng `orders`:** không `order_items`, không `payment_transactions`;
   thanh toán "mô phỏng/thủ công", chưa cấu hình thông tin chuyển khoản.
5. **P1 — vòng vận hành hở:** điều phối đơn→xưởng không có write path (lab queue luôn rỗng),
   designer payout trống/không duyệt được, review không viết được → xưởng/designer/admin có màn
   nhưng không có việc để làm.

## 4. Top 5 đề xuất (không đổi theme)

1. Nạp `/orders` cho khách + error state (1 effect, RLS đã lọc theo user).
2. Hoàn tất giao file số: ghi `order_files` + storage + signed URL; mở khoá `/assets`.
3. Ghi đủ dữ liệu đơn: `order_items` + `payment_transactions` + cấu hình hướng dẫn chuyển khoản.
4. Gán đơn→xưởng (admin dispatcher ghi `assigned_workshop_id`) → lab queue + tiến độ thật.
5. Xác nhận đơn bền: `/order-success/:id` resolve từ DB/token (hoặc redirect `/tracking`) +
   hiện mã truy cập rõ; kèm notification tối thiểu.

## 5. Phần **chưa quan sát được** (ghi rõ trong tài liệu)

- Customer/Designer/Lab/Admin/Ops **chưa có account** ⇒ luồng sau đăng nhập chỉ đọc code; guard
  đã quan sát (redirect đúng; `/orders`,`/assets` mất `redirectTo`).
- **Không tạo đơn thật / không thanh toán** (tránh ghi DB) ⇒ màn thành công, confetti, invoice
  runtime chưa quan sát.
- Không có email/payment gateway thật ⇒ notification/đối soát đánh giá ở tầng code.
- Dữ liệu DB là **demo `[MẪU]`** — ảnh chụp minh hoạ UI, không phải số liệu kinh doanh.

## 6. Gate tự kiểm

| Gate | Kết quả |
|---|---|
| 4 file chính tồn tại | ✅ README/USER-PERSONAS/FEATURE-MATRIX/UX-ASSESSMENT |
| ≥8 tính năng/persona | ✅ 14/12/11/12/15/8 (72 dòng) |
| Mỗi dòng gap có bằng chứng route/file:line | ✅ (cột Bằng chứng + §7 bảng DB) |
| 0 file `src/` bị sửa **bởi review này** | ✅ mọi thao tác là đọc/chạy app; lúc bắt đầu review cây sạch HEAD `b78c24a`. Hiện có 4 file `src/**` modified **bởi agent khác chạy song song** (`App.tsx`, `Group1WorkshopsPanel`, `Group3CustomersPanel`, `useCatalogData`) — không phải thay đổi của review |
| Browser evidence | ✅ 33 ảnh 390/1440; 0 pageerror/0 overflow (14 route) |
| Không commit | ✅ |
