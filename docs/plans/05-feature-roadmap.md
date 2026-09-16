> [!WARNING]
> **TÀI LIỆU LỊCH SỬ (SUPERSEDED — archived 2026-09).** Thư mục `docs/plans/**` là bộ kế hoạch refactor cũ và **không còn là nguồn chuẩn**. Nguồn chuẩn hiện tại: `docs/README.md` → `docs/architecture/`, `docs/pages/`, `docs/database/`, `docs/security/`, `docs/SETUP_RUNBOOK.md`. Nội dung được giữ nguyên để tra cứu lịch sử; **mọi số liệu (số bảng/index/policy, bundle, phase) trong đây đã lạc hậu** so với code. Xem `docs/archive/README.md`.

# 05 — Roadmap tính năng (phát triển mới & nâng cấp)

Tài liệu này chốt **cần phát triển thêm tính năng gì**, vì sao, thứ tự nào, và cái gì **không** làm ở đợt này.
Bằng chứng thị trường: `docs/design/research-brief.md` (teardown 11 đối thủ + ghi chú thị trường VN). Chú thích `ASSUMPTION:` là suy luận, không phải số liệu đã kiểm.

Điểm khác biệt của VCUBE so với thị trường VN: các đối thủ nội địa (GN3D, DIGMAN, Good Gearz…) **bán qua Zalo/chat, không có self-serve checkout**. VCUBE có instant quote + cart + checkout — đây là lợi thế, nhưng chỉ thắng nếu giữ được **niềm tin** và **bàn giao sang Zalo** ở bước chốt đơn.

---

## 1. Nguyên tắc chọn tính năng

1. **Ưu tiên tuyến chuyển đổi** (upload → giá → đặt hàng) trước tính năng phụ.
2. **Không hứa thứ chưa có** (camera xưởng, AI slicer, đánh giá giả) — xem `docs/design/data-honesty.md`.
3. **Thắng bằng minh bạch giá**: công bố đơn giá vật liệu + giờ máy, breakdown từng dòng. Đối thủ VN đã công bố bảng giá; VCUBE hiện không.
4. **Thị trường VN: COD vẫn chiếm ưu thế và người mua sợ bị lừa** → cần chứng cứ pháp lý (online.gov.vn), chính sách đổi/hoàn, và kênh Zalo.
5. **Bàn giao Zalo là tính năng, không phải thất bại** — B2B trong ngành này vẫn chốt qua chat/hợp đồng.
6. Mọi tính năng mới phải dùng Supabase (RLS) làm nguồn quyền và dữ liệu, và không làm tăng first-load bundle (lazy theo route).

---

## 2. Nhóm A — Tuyến chuyển đổi (ưu tiên cao nhất)

### A1. Instant Quote Widget ở hero — **Must**
- **Là gì:** widget kéo-thả trong màn hình đầu, trả giá trong vài giây, có tiến trình + huỷ, kết quả kèm kích thước/khối lượng/vật liệu gợi ý/lead time, 2 CTA (In ngay / Chỉnh chi tiết) — chi tiết anatomy ở `docs/plans/02-pages-public.md` §1.3.
- **Vì sao:** tất cả đối thủ đều đưa uploader lên hero; Craftcloud nói rõ "không cần đăng nhập để xem giá". Ép tạo tài khoản trước khi xem giá là nguyên nhân bỏ giỏ lớn (18% theo Baymard).
- **Phụ thuộc:** worker progress + parse trung thực (Phase 5), `pricingEngine` memoized.
- **Effort:** L.

### A2. Báo giá tải được & chia sẻ được (PDF + link) — **Must**
- **Là gì:** nút "Tải PDF báo giá" và "Sao chép link báo giá" cho mỗi cấu hình; link chứa tham số để mở lại đúng cấu hình.
- **Vì sao:** Protolabs Network cho phép tải/chia sẻ quote và khoá giá 30 ngày; đây là điều kiện để B2B xin duyệt nội bộ. Không có nó, kỹ sư không thể đưa báo giá cho người duyệt.
- **Phụ thuộc:** cấu hình đưa lên URL/DB; `CartItem` mang đủ tham số.
- **Effort:** M.

### A3. Khoá giá có thời hạn + hiển thị hạn — **Must**
- **Là gì:** mỗi báo giá có hạn (ví dụ 7 ngày), hiển thị rõ "Giá khoá đến dd/mm", hết hạn thì có nút "Cập nhật giá".
- **Vì sao:** hiện panel ghi "+7 ngày" nhưng không có cơ chế khoá; giá vật liệu thay đổi theo thời gian. Đối thủ: Protolabs 30 ngày.
- **Effort:** S.

### A4. Lead time theo **ngày** + gói Economy/Standard/Express có delta giá — **Must**
- **Là gì:** thay vì "3–4 ngày làm việc", hiện **ngày hoàn thành cụ thể**; 3 mức dịch vụ kèm % giá (ví dụ Economy −30%, Express +50%).
- **Vì sao:** mô hình Sculpteo (Economy/Standard/Express ±30%/+50%, Batch Control 20+ đơn vị giảm tới 80%) là mô hình rõ ràng nhất trong nhóm; người mua đọc mốc thời gian như một lời hứa.
- **Phụ thuộc:** năng lực xưởng (máy in, hàng đợi) → cần `printer_fleet` + queue thật.
- **Effort:** M.

### A5. Breakdown giá cho người mua + upsell bậc số lượng — **Must**
- **Là gì:** khối "Vì sao giá này": nhựa (g × đ/g), giờ máy, nhân công, hậu kỳ, đóng gói, dự phòng lỗi, VAT; và "Thêm 3 cái nữa → −15%".
- **Vì sao:** minh bạch giá là yếu tố niềm tin số 1 trong ngành in theo yêu cầu; hiện toàn bộ breakdown nằm trong modal **nội bộ**. Upsell bậc kế tiếp là cách tăng AOV rẻ nhất.
- **Effort:** M.

### A6. Deposit + VietQR động + payOS-ready — **Must (một phần)**
- **Là gì:** quy tắc đặt cọc theo ngưỡng (mặc định ≥500.000đ đặt 50%, dưới thì 100%), VietQR **có số tiền** + nội dung là mã đơn, trạng thái `awaiting_payment`, và interface `paymentProvider` để sau này cắm payOS/webhook.
- **Vì sao:** thị trường VN: chuyển khoản + COD là chính; đặt cọc là chuẩn ngành (các xưởng công bố 50%/100%). VietQR có API miễn phí; payOS xác nhận chuyển khoản tự động (không cần khách gửi ảnh chụp).
- **Không làm đợt này:** tích hợp PSP thật (đã chốt giữ sample) — nhưng **phải** dựng sẵn abstraction để không phải viết lại checkout.
- **Effort:** M (abstraction) / L (khi cắm PSP).

### A7. Bàn giao Zalo + thông báo ZNS/SMS — **Should**
- **Là gì:** nút "Nhắn Zalo để chốt đơn" ở checkout/order-success/tracking, và tuỳ chọn nhận cập nhật trạng thái qua Zalo ZNS/SMS.
- **Vì sao:** mọi đối thủ VN đều lấy Zalo làm CTA chính; GN3D đã đẩy trạng thái qua Zalo ZNS/SMS. Đây là kênh giữ khách quay lại.
- **Effort:** M (deep link + lưu số) / L (ZNS API, cần OA).

### A8. Danh mục vật liệu theo **mục đích sử dụng** — **Should**
- **Là gì:** bộ lọc/gợi ý vật liệu theo nhu cầu: "đồ gá cơ khí", "mô hình trưng bày", "vỏ hộp điện tử", "ngoài trời/chịu nước"; kèm bảng so sánh 4 tiêu chí (độ bền, chịu nhiệt, thẩm mỹ, giá).
- **Vì sao:** khách không biết PLA/PETG/ABS/PA-CF khác gì; hiện `MaterialComparisonMatrix` có bảng riêng hardcode và lọc sai ngôn ngữ.
- **Phụ thuộc:** dữ liệu `materials` có thuộc tính (đã có `strength`/`heatResistance`/`flexibility` trong type nhưng **không có input nào trong admin** → phải bổ sung form).
- **Effort:** M.

### A9. Tính năng DFM có giá — **Should**
- **Là gì:** kết quả kiểm tra in (thành mỏng, overhang, chi tiết nhỏ) chuyển thành **tuỳ chọn có giá**: bật supports, tăng độ dày, chia nhỏ chi tiết, đổi hướng in — mỗi tuỳ chọn hiện delta giá trước khi áp dụng.
- **Vì sao:** Xometry đặt DFM trong tab "Analyze" cạnh viewer; JLC3DP kiểm tra wall/min-feature ngay khi upload rồi vẫn có kỹ sư xác nhận. Đây là chỗ VCUBE có thể vượt đối thủ VN.
- **Phụ thuộc:** phân tích mesh thật (bỏ số liệu bịa) + engine nhận tham số DfAM.
- **Effort:** L.

### A10. Guest checkout + MST/VAT đúng — **Must**
- Xem `03-pages-transaction.md` §3.3. Thêm (Should): tra cứu MST để tự điền thông tin xuất hoá đơn.

---

## 3. Nhóm B — Khác biệt hoá công cụ 3D

| # | Tính năng | Vì sao | Ưu tiên | Effort |
|---|---|---|---|---|
| B1 | **Draft persistence + mở lại cấu hình** ("Lưu cấu hình", danh sách cấu hình đã lưu) | WCAG 3.3.7 (không bắt nhập lại); người mua B2B quay lại nhiều lần; hiện đổi route là mất hết | Must | M |
| B2 | **Undo/redo** cho transform & tham số | `useUIStore` đã hỗ trợ `undoAction`; hiện chỉ có "reset" | Must | S |
| B3 | **Nhập số + đơn vị** cho transform, range suy từ bed | Hiện chỉ slider, không nhập được 102.4%, range ±100mm cứng | Must | M |
| B4 | **Chia sẻ link xem 3D** (view-only, không cần đăng nhập) | Bán hàng/duyệt nội bộ; cũng là cách marketing | Should | S |
| B5 | **Xem thực tế tăng cường (AR) trên điện thoại** | Android/iOS đều hỗ trợ `model-viewer`/Scene Viewer; "sản phẩm trong phòng" là điểm khác biệt mạnh cho quà tặng/trang trí | Could | M |
| B6 | **Thư viện chi tiết chuẩn** (ốc, vít, nam châm, bản lề) để chèn vào model | `accessories` đã có trong DB; tăng giá trị đơn in | Could | M |
| B7 | **Multi-material / nhiều màu** (MMU) | Đã có trong công thức (`multiColorExtraPercent`) nhưng chưa có UI | Could | L |
| B8 | **Tolerance tiers** (chuẩn / chính xác / siêu chính xác) kèm giá | Xometry công bố tier theo process; khách kỹ thuật mua theo dung sai | Should | M |
| B9 | **Finish options** (đánh bóng, sơn, vapour smoothing) | Đối thủ lớn đều bán; dễ nhân doanh thu/đơn | Should | M |
| B10 | **Ước lượng thời gian in + cảnh báo vượt bàn in ngay trên viewport** | Hiện OOB banner nằm đè toolbar và chỉ có 1 CTA hardcode 1 model máy | Must | S |

---

## 4. Nhóm C — Vận hành (lab / admin)

| # | Tính năng | Vì sao | Ưu tiên | Effort |
|---|---|---|---|---|
| C1 | **`order_events` + timeline thật** | Timeline hiện tĩnh; ZNS/email/thông báo đều cần nguồn sự kiện | Must | M |
| C2 | **Gán máy in + hàng đợi thật** (dispatch có xác nhận, lý do từ chối) | `Group5ProductionPanel` có UI nhưng dữ liệu mock; `printer_fleet` đã có | Must | M |
| C3 | **Trừ tồn kho vật liệu theo lệnh in + log** | `material_inventory_logs` đã có migration; hiện không dùng | Should | M |
| C4 | **Saved views cho admin** (lưu bộ lọc/sort/cột, có dấu "đã sửa") | Bảng đang 0/39 có sort & phân trang; admin dùng lặp lại cùng bộ lọc | Should | M |
| C5 | **Audit log hành động quản trị** (ai đổi giá, ai xoá sản phẩm) | Có "Đồng Bộ DB" và override giá — hiện không truy vết được | Should | M |
| C6 | **Realtime cho bảng admin sửa được** (materials, printer_fleet, site_content, pricing_configs, orders) | Hiện chỉ `products`; 2 admin sửa cùng lúc sẽ ghi đè nhau | Must | M |
| C7 | **Import/Export CSV** cho bảng lớn (vật liệu, máy, sản phẩm) | Onboarding xưởng nhập hàng trăm dòng | Should | M |
| C8 | **Trang trợ giúp/Design guidelines** (dung sai, min wall, layer, chuẩn bị file) | Đối thủ dùng learning hub để hút SEO và giảm support | Could | M |

---

## 5. Nhóm D — Tăng trưởng, nội dung, tuân thủ

| # | Tính năng | Vì sao | Ưu tiên | Effort |
|---|---|---|---|---|
| D1 | **Trang chính sách bắt buộc** (Điều khoản, Bảo mật, Đổi trả/Bảo hành, Vận chuyển, Sở hữu trí tuệ) + link ở footer | Nghị định 52/2013 & 85/2021 yêu cầu sàn TMĐT công bố; Luật BVNTD 19/2023 quy định thông tin giao dịch phải đầy đủ; hiện repo **không có trang nào** | Must | M |
| D2 | **Badge online.gov.vn** ("Đã thông báo Bộ Công Thương") | Mọi đối thủ VN đáng tin đều hiển thị; đây là dấu hiệu tin cậy rẻ nhất | Must | S (sau khi đăng ký) |
| D3 | **Trang SEO theo vật liệu/quy trình/dung sai** (`/in-3d-pla`, `/in-3d-petg`, `/dung-sai`, `/gia-cong-cnc`…) | Đối thủ VN làm landing theo quận/vật liệu; đây là kênh acquisition chính | Should | L |
| D4 | **Review thật có kiểm chứng đơn** (chỉ hiện khi có đơn hoàn thành) | Hiện có review mẫu; review thật cần `order_id` + trạng thái hoàn thành | Should | M |
| D5 | **Coupon/voucher engine trong DB** (thay promo hardcode) | Hiện `TECH3D/VCUBE10/VN3DHUB` nằm trong view, không hạn, không giới hạn | Should | M |
| D6 | **Giới thiệu bạn bè / mã referral hai chiều** | FacFox dùng $5 hai chiều; hiệu quả với tệp khách maker | Could | M |
| D7 | **Gallery cộng đồng + cuộc thi thiết kế** | PCBWay/Treatstock dùng làm content marketing | Could | L |
| D8 | **Tài khoản nhóm/B2B, NET terms, PO, e-procurement** | Xometry/Protolabs phục vụ B2B bằng Team Account + NET 30; 98% doanh nghiệp VN là SME | Could (xa) | XL |
| D9 | **Đa ngôn ngữ mở rộng** (thêm ZH cho khách Trung/Đài đặt gia công) | GN3D đã có VI/EN/ZH; biên giới gia công trong khu vực | Could | M |
| D10 | **Thông báo qua email** (xác nhận, trạng thái, hoá đơn) | Supabase Auth gửi được email; hiện chỉ toast | Should | M |

---

## 6. Thứ tự thực hiện đề xuất (3 đợt)

> **Tiền đề của Đợt 1 đã xong (2026-09-12):** RLS đã siết + kiểm chứng trên production, schema 21 bảng đã áp, khoá Supabase đã đúng. Việc còn lại trước khi làm tính năng: bootstrap admin, seed dữ liệu, 4 lỗi client ở Phase 3, và env Vercel.

**Đợt 1 — "Đáng tin & dùng được" (bắt buộc xong trước khi marketing)**
Must ở nhóm A (A1, A2, A3, A4, A5, A6-một-phần, A10) + B1, B2, B3, B10 + C1, C2, C6 + toàn bộ P0 trong `02/03/04-pages-*.md` + D1, D2.

**Đợt 2 — "Khác biệt hoá"**
A7 (Zalo/ZNS), A8, A9, B4, B8, B9, C3, C4, C5, C7, D3, D4, D5, D10.

**Đợt 3 — "Mở rộng"**
B5, B6, B7, C8, D6, D7, D8, D9 + PSP thật (payOS + webhook) khi sẵn sàng.

**Won't do (đợt này):** tích hợp PSP thật; hệ thống MES đầy đủ; app mobile native; AI sinh mô hình; marketplace đa nhà cung cấp (auction) như Protolabs Network.

---

## 7. Lý do chọn theo bằng chứng (tóm tắt để họp)

| Tính năng | Bằng chứng |
|---|---|
| Widget báo giá ở hero, không gate đăng nhập | Craftcloud nói rõ không cần đăng nhập để xem giá; ép tạo tài khoản = 18% lý do bỏ giỏ (Baymard); trải nghiệm không gate chuyển đổi 7–9% so với 3–5% khi gate |
| Hiện tổng tiền (gồm ship/thuế) sớm | 40% lý do bỏ giỏ là "chi phí phát sinh quá cao"; 21% bỏ vì không thấy tổng tiền trước checkout (Baymard) |
| Giảm số field checkout | Form theo guideline đạt 78% submit một lần vs 42%; 34% người bắt đầu form không hoàn thành |
| Progress bar khi upload/phân tích | Người thấy progress bar sẵn sàng chờ lâu gấp ~3 lần |
| Lead time dạng ngày + delta giá | Mô hình Sculpteo Economy/Standard/Express (−30%/+50%) và Batch Control (−80% ở 20+ đơn vị) |
| Deposit + VietQR có số tiền | Chuẩn ngành VN công bố 50%/100%; VietQR có API công khai, payOS xác nhận chuyển khoản qua Open API |
| Zalo/ZNS | Mọi đối thủ VN lấy Zalo làm CTA chính; GN3D đẩy trạng thái qua Zalo ZNS/SMS |
| Trang chính sách + badge online.gov.vn | Nghị định 52/2013 (sửa bởi 85/2021), Luật BVNTD 19/2023, NĐ 13/2023 về dữ liệu cá nhân |
| Không hứa camera/AI/đánh giá giả | Quyết định "làm cho trung thực"; xem `docs/design/data-honesty.md` |

**Số liệu KHÔNG được dùng trong tài liệu bán hàng/design doc** (đã kiểm, không có nguồn gốc): "mỗi field mất 8% conversion", "53% người dùng bỏ sau 3 giây", "24–34% bỏ giỏ vì bắt tạo tài khoản", "5.2 bước / 11.8 field", và mọi con số "multi-step form tăng X% conversion".
