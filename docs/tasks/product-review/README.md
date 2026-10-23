<!-- doc-meta: status=active; verified=2026-10-23; owner=design-foundation -->
# VCUBE — Product review từ góc nhìn người dùng (2026-10-23)

> **Câu hỏi của founder:** sản phẩm này dùng cho ai, mỗi người cần gì, hiện có gì / thiếu gì,
> và nhìn trực quan thì đáng giá đến đâu?
>
> **Cách làm:** đọc code là nguồn sự thật (route, view, service, migration) **+ chạy app thật**
> (Supabase đã sống lại, DB có dữ liệu demo `[MẪU]`) và quan sát bằng Chromium headless
> 390/1440. Không sửa `src/**`; chỉ ghi bộ tài liệu này.
>
> > **Bước tiếp theo:** kế hoạch chỉnh sửa để đạt world-class cho 4 nhóm đối tượng nằm ở
> [`docs/tasks/world-class/PLAN.md`](../world-class/PLAN.md) (8 workstream · phase WC-0→WC-7 · acceptance gates).

**Bộ tài liệu:** `USER-PERSONAS.md` · `FEATURE-MATRIX.md` · `UX-ASSESSMENT.md` ·
> `screens/` (33 ảnh chụp 390/1440) · handoff `docs/tasks/optimization/handoff/product-review.md`.

---

## 1. Kết luận 60 giây

**VCUBE hiện là một sản phẩm 2 lớp rất khác nhau về độ chín:**

1. **Lớp "trình diễn" (storefront + công cụ 3D): đã đủ đẹp để demo và bán ý tưởng.**
   Giao diện v3 "Soft Studio" đồng bộ, tiếng Việt 100%; trang chủ có hero 3D;
   PDP có khung 3D + giá + cấu hình in; `/quote` thực sự **nhận file STL, parse lưới, đo
   ‎20×20×20 mm / 8 cm³ và ra giá 111.000 đ** (đã tự tay upload thử — xem
   `screens/quote-analyzed-1440.png`). Khách vãng lai đi được trọn luồng:
   xem → chọn → thêm giỏ → toast + badge → checkout guest → (form sẵn sàng).
   Quan sát 33 màn 390/1440: **0 pageerror, 0 tràn ngang, 0 ảnh vỡ**.

2. **Lớp "vận hành thương mại" (dữ liệu sau nút bấm): mới nối một phần.**
   Mua hàng ghi **chỉ bảng `orders`**; **không ghi `order_items` / `payment_transactions` /
   `order_files`** ⇒ đơn không có dòng hàng để chia 3 bên, không có giao dịch để đối soát,
   và **file CAD đã mua không bao giờ tới tay khách** (Asset Library chỉ hiện "chưa hỗ trợ
   tải trực tiếp"). Khách quay lại **`/orders` không thấy đơn** vì app chỉ nạp đơn cho admin.
   Designer payout và điều phối đơn→xưởng có màn nhưng **không có đường ghi** ⇒ xưởng luôn
   thấy hàng đợi rỗng. Kết quả: **demo rất tốt, vận hành thật thì chưa.**

**Nếu chỉ nhớ 1 câu:** *UI và công cụ 3D đã ở mức sản phẩm; thiếu 3 sợi dây dữ liệu
(đơn của khách · giao file số · giao việc cho xưởng) mới là thứ chặn VCUBE thành marketplace
vận hành được.*

**Thang điểm nhanh (thang 5):**

| Trục | Điểm | Vì sao |
|---|---:|---|
| Ấn tượng thị giác / tin cậy ban đầu | **4,5** | v3 đồng bộ, 3D đẹp, VI-only, empty-state nói thật |
| Khám phá & chọn sản phẩm (guest) | **3,5** | catalog + filter + PDP tốt; thiếu ảnh sản phẩm thật, filter không vào URL |
| Báo giá 3D | **4** | parse + giá client thật; chưa lưu báo giá, chưa có RFQ server |
| Mua hàng | **2,5** | guest checkout mượt nhưng thanh toán thủ công, chỉ 1 bảng DB |
| Nhận hàng / hậu mãi | **1** | không có file số, không lịch sử đơn, bảo hành không lưu |
| Công cụ cho designer | **2,5** | đăng bán + nhận request thật; payout/ledger trống |
| Công cụ cho xưởng (MES) | **2,5** | 6 tab quản trị thật; hàng đợi không có đơn |
| Công cụ cho admin | **3,5** | 16 mục điều hành thật; thiếu dispatch/đối soát/payout |
| **Tổng thể "sẵn sàng bán thật"** | **2,5 / 5** | UI-first đã xong; dữ liệu vận hành còn thiếu |

---

## 2. Sản phẩm này dùng cho ai (tóm tắt — chi tiết ở `USER-PERSONAS.md`)

| # | Persona | Vai trò trong DB | Họ đến để làm gì | Quan sát được? |
|---:|---|---|---|---|
| 1 | **Khách vãng lai** | *không cần tài khoản* | khám phá mẫu, xem 3D, báo giá file, đặt in không cần mật khẩu | ✅ quan sát trực tiếp |
| 2 | **Khách hàng** | `customer` | mua, theo dõi đơn, tải file CAD, hoá đơn, bảo hành | ⚠️ chỉ theo code (thiếu account) |
| 3 | **Nhà thiết kế** | `designer` | đăng mẫu, cấu hình giấy phép/giá, nhận yêu cầu CAD, doanh thu | ⚠️ code (thiếu account) |
| 4 | **Xưởng in** | `lab` / `workshop` | onboarding, máy in, vật liệu/kho, hàng đợi, cấu hình xưởng | ⚠️ code (thiếu account) |
| 5 | **Quản trị viên** | `admin` | catalog, xưởng/đội máy, designer/KYC, giá, queue, kho, CMS/SEO | ⚠️ code + guard quan sát được |
| 6 | **Điều phối viên / vận hành (suy diễn)** | *không có role riêng* | điều đơn→xưởng, đối soát thanh toán, CSKH, duyệt KYC | ❌ suy ra từ chức năng admin/lab |

---

## 3. Cách đọc bộ tài liệu

1. **`USER-PERSONAS.md`** — 6 persona: jobs-to-be-done, route, dữ liệu cần, thước đo thành
   công, đau đớn hiện tại (kèm bằng chứng). Đọc mục 0 (bảng tổng) trước.
2. **`FEATURE-MATRIX.md`** — 72 dòng tính năng (≥8/persona: 14/12/11/12/15/8), cột
   `Bắt buộc? | Hiện có (✅/⚠️/❌/🧪) | Bằng chứng route+file:line | Gap`. Đây là nơi tra
   "cái gì có thật, cái gì chỉ là màn hình".
3. **`UX-ASSESSMENT.md`** — "First 5 minutes" từng persona, điểm mạnh giữ nguyên (theme đã
   duyệt — không đề xuất đổi), **Top 10 vấn đề P0/P1/P2**, "nếu chỉ sửa 5 thứ", so sánh
   kỳ vọng thị trường.
4. **`screens/`** — 33 ảnh 390/1440 của guest flow (home, explore, PDP, quote đã upload STL,
   cart có hàng, checkout guest, tracking, login/register, 404, guard-redirect).
   Ảnh persona cần đăng nhập **không có** (không có account) — ghi rõ trong persona.

---

## 4. Phương pháp & độ tin cậy

| Loại bằng chứng | Cách lấy | Dùng cho |
|---|---|---|
| Code truth | `src/frontend/routes/AppRoutes.tsx` (30 route), 16 view, `src/frontend/hooks/*`, `src/backend/services/*`, `supabase/migrations/*.sql` (32 bảng/2 view) | mọi kết luận "có/không", gap dữ liệu |
| DB thật | Supabase REST bằng anon key trong `.env` (không in khoá): **10 sản phẩm demo**, 8 vật liệu, 7 máy in, 5 phụ kiện, 1 site_content, 1 review, 2 workshop profile; `orders` = 0 | xác nhận dữ liệu demo, trạng thái catalog |
| Browser thật | Chromium headless (Playwright cache + `~/.local/share/opencode-pwlibs`), CDP: 14 route × 390/1440 + upload STL thật + add-to-cart | "First 5 minutes", lỗi/overflow thực tế, ảnh chụp |
| Audit cũ | `docs/tasks/optimization/01-pages-features.md`, `AUDIT.md`, `ui-redesign-v3/QA-REPORT.md`, `docs/design/data-honesty.md` | đối chiếu, **không copy số**; điểm nào lệch code đã tự kiểm lại |

**Giới hạn (đọc trước khi trích dẫn):**
- **Không có account** cho customer/designer/lab/admin ⇒ các luồng sau đăng nhập **chưa được
  quan sát runtime**, chỉ đọc code. Riêng guard đã quan sát: `/orders`, `/assets` →
  `/auth/login` (mất `redirectTo`); `/admin`, `/lab`, `/designer` →
  `/auth/login?redirectTo=…` (giữ đích).
- **Không tạo đơn thật** khi review (tránh làm bẩn DB) ⇒ "đặt hàng thành công" chưa chạy
  end-to-end; suy luận từ code + form đã quan sát.
- Chưa có cổng thanh toán/email thật ⇒ các luồng payment/notification chỉ đánh giá ở tầng code.
- Dữ liệu DB là **demo `[MẪU]`** (banner nói thật) ⇒ ảnh chụp minh hoạ UI, không phải số liệu
  kinh doanh.

**Không sửa `src/**`; không commit.** Thời điểm review: 2026-10-23, HEAD `b78c24a`.
