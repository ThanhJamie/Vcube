<!-- doc-meta: status=active; verified=2026-11-10; owner=lead -->
# Wave 2 — UI/UX feature wave (2026-11-10)

> Từ main local `0adcb09`. **Không dùng QA-MONEY staging làm gate.** Không push/deploy.
> Dùng DB/service hiện tại; không migration/seed/xoá/giao dịch QA production.
> Tính năng cần dữ liệu chưa có ⇒ báo “chưa thể lưu”, không báo thành công giả.

## 0. Khảo sát trực tiếp

### Flow 1 — Upload 3D → báo giá → giỏ → checkout

**Quan sát browser (4302, STL cube 20mm):**
- `/quote` upload → parse 8.0 cm³, 12 tam giác; file status + object tree + 3D + pricing panel đều có.
- Desktop: pricing panel hẹp làm label “TỔNG GIÁ TRỊ ĐƠN HÀNG (1 CÁI)” xuống dòng dọc; tổng 133.920 đ.
- Mobile 390: 3D viewer chiếm gần hết màn hình; **giá + CTA nằm dưới fold**, user phải cuộn dài mới biết tổng/next step.
- Bấm “Đặt in ngay”: URL `/checkout` nhưng **CartDrawer vẫn mở đè lên checkout** (vì `handleAddToCart` mở drawer; `handleDirectOrder` chỉ navigate).
- Checkout: 3 phương thức; VNPAY disabled đúng; bank info “Chưa cấu hình” trung thực; VAT/ship/tổng rõ.

**Mục tiêu:** user hiểu trạng thái tệp, giá và bước tiếp theo; CTA làm đúng hành vi.
- **W2-Q1:** direct order không mở cart drawer đè checkout.
- **W2-Q2:** mobile sticky price/CTA sau khi có báo giá.
- **W2-Q3:** price breakdown dễ đọc (label không wrap dọc; nhóm giá in/VAT/tổng).

### Flow 2 — Explore/catalog → PDP → personalize

**Quan sát:**
- `/explore` 0 published: empty state tốt, 3 CTA; search/filter ẩn (đúng vì không có gì để lọc).
- `/products/nope`: not-found chỉ có “Quay lại Kho Bản Vẽ”; thiếu CTA quote.
- `/personalize` rỗng: 2 CTA quote/explore, h1 đúng.
- PDP khi có published không test được live; cần mock product qua route interception (không ghi DB).
- Mobile PDP code có buy box desktop; chưa có sticky purchase bar cho mobile.

**Mục tiêu:** tìm/chọn mẫu dễ hơn desktop/mobile, kể cả ít dữ liệu.
- **W2-D1:** PDP not-found/empty thêm CTA “Gửi tệp 3D để báo giá” + “Về kho mẫu”.
- **W2-D2:** PDP mobile sticky buy bar (giá + CTA đặt in/mua file), chỉ hiện mobile, không đè FAB; test bằng route mock product.
- **W2-D3:** Explore empty state thêm nhóm danh mục ngắn (link filter) hoặc thông điệp rõ “kho đang cập nhật” + quote CTA; không fake sản phẩm.

### Flow 3 — Landing page + admin marketing content

**Quan sát code:**
- `AdminStorefrontPanel` có nhiều field hero/announcement/workflow/metrics/tolerance/footer; **không có preview** các thay đổi trước khi lưu.
- Home dùng `siteContent` + fallback; field rỗng hiện “Chưa cấu hình”/ẩn; admin link đã role-gate.
- Marketing team phải lưu rồi mở Home để xem, dễ sai copy/layout.

**Mục tiêu:** preview và chỉnh các phần UI cấu hình được bằng dữ liệu hiện có.
- **W2-M1:** thêm `StorefrontPreview` trong AdminStorefrontPanel, render hero/announcement/metrics từ `localContent` (chưa lưu), empty field hiện “Chưa cấu hình”, không fake.
- Giữ save flow/validation; không DB mới.

## 1. File ownership (tránh trùng)

| Worker | Item | File chính |
|---|---|---|
| W2-QUOTE | Q1, Q2, Q3 | `Tool3DView.tsx`, `QuoteSummaryPanel.tsx`, có thể `App.tsx`/`useUIStore` chỉ để đóng drawer |
| W2-DISCOVER | D1, D2, D3 | `ProductDetailView.tsx`, `ExploreView.tsx`, `components/explore/ExploreEmptyCatalog.tsx`, `PersonalizeView.tsx` (nếu cần) |
| W2-MARKETING | M1 | `AdminStorefrontPanel.tsx`, new `components/admin/StorefrontPreview.tsx` |

Không worker nào sửa file của worker khác. Không sửa `scripts/**`, migrations, DB.

## 2. Browser evidence

- Flow 1: real DB quote/checkout, 390/1440, STL fixture.
- Flow 2: Explore/Personalize real empty state; PDP dùng **Playwright route mock** product (ghi rõ fixture, không DB).
- Flow 3: AdminStorefrontPanel cần admin; nếu không có account, dùng mock auth/site_content hoặc ghi rõ static/code evidence; không tạo/xoá account.

## 3. Acceptance chung

- tsc PASS; `npm run check` không hồi quy; 390/1440 0 tràn/0 pageerror.
- Không fake save/success; field thiếu dữ liệu báo “Chưa cấu hình”.
- Commit branch riêng; không push.

## 4. Kết quả (2026-11-10)

**Trạng thái: 7/7 item DONE**, đã tích hợp `wave2/integration` (merge `68db0b5` → `cc9c3c3` → `4cd8e4f`). Không push/deploy.

| ID | Item | Branch / commit | Kết quả | Bằng chứng |
|---|---|---|---|---|
| W2-Q1 | Direct order đóng cart drawer trước khi sang checkout | `wave2/quote` · `9595fec` | **DONE** | `/quote` → “Đặt in ngay” → `/checkout`, `document.querySelectorAll('dialog[open]').length = 0` |
| W2-Q2 | Thanh mobile sticky tổng tiền + CTA | `wave2/quote` · `9595fec` | **DONE** | 390: nút “Đặt in ngay” ở `y=762` (trong viewport 844), tổng hiển thị; 1440: không render (`md:hidden`) |
| W2-Q3 | Phân tầng giá in / VAT / tổng | `wave2/quote` · `9595fec` | **DONE** | Nhãn thật “Giá in (chưa VAT)”, “VAT (8%)”, “Tổng phải trả”; không còn label wrap dọc; số liệu giá không đổi |
| W2-D1 | PDP not-found có CTA báo giá + kho mẫu | `wave2/discover` · `be9fb9b` | **DONE** | `/products/nope`: h1 “Không tìm thấy bản vẽ CAD này”, hiện đường dẫn đã mở, 2 CTA “Gửi tệp 3D để báo giá” (→ `/quote`) + “Về kho mẫu” (→ `/explore`) |
| W2-D2 | PDP mobile buy bar chỉ khi có kênh bán | `wave2/discover` · `be9fb9b` | **DONE** | Mock product 390: bar “TỔNG ĐẶT IN 150.000 đ” + “Tệp CAD”/“Đặt in 3D”; mock không kênh bán 390: không bar; desktop không bar |
| W2-D3 | Explore empty state có dải danh mục | `wave2/discover` · `be9fb9b` | **DONE** | 6 nhóm danh mục thật, mỗi nhóm “0 mẫu” từ kho thật; ghi rõ nhóm xuất hiện khi có bản vẽ; CTA quote giữ; không fake sản phẩm |
| W2-M1 | Preview nội dung storefront chưa lưu | `wave2/marketing` · `823cfda` | **DONE** | `StorefrontPreview` render announcement/hero/metrics/tolerance từ `localContent`; desktop 2 cột sticky, mobile preview trước form; field trống “Chưa cấu hình”/“(mặc định)” |

### 4.1 Chi tiết theo luồng

**Flow 1 — Quote/cart/checkout** (`wave2/quote`)
- Trước: bấm “Đặt in ngay” thì `App.handleAddToCart` mở drawer, `Tool3DView.handleDirectOrder` chỉ navigate ⇒ drawer đè checkout. Sau: `handleDirectOrder` đóng drawer trước khi navigate.
- Trước: mobile phải cuộn hết viewer + form mới thấy giá/CTA. Sau: `QuoteMobileOrderBar` fixed bottom khi có `selectedPackage`, có safe-area + chừa làn FAB, spacer đáy `max-md:pb-28` để không che nội dung.
- Trước: card tổng giá label dài wrap dọc. Sau: 3 nhóm giá in → VAT → tổng, badge gói riêng; logic giá/VAT giữ nguyên.
- File: `Tool3DView.tsx`, `QuoteSummaryPanel.tsx`, `QuoteMobileOrderBar.tsx` (mới). DB: dùng `pricingService`/settings hiện có; không thêm bảng/cột.

**Flow 2 — Explore/PDP/personalize** (`wave2/discover`)
- Trước: 404 PDP chỉ có “Quay lại Kho Bản Vẽ”; state lỗi tải kho không có lối sang quote. Sau: 2 CTA quote/kho mẫu + giữ h1 cấp trang.
- Trước: mobile bar render bất kể sản phẩm có kênh bán hay không. Sau: chỉ render khi ≥1 kênh mở bán (`hasAnyChannel`), thêm `role="region" aria-label="Đặt in nhanh"`; handler/giá không đổi.
- Trước: empty Explore chỉ có CTA. Sau: dải “Danh mục đang chờ bản vẽ đầu tiên” với 6 nhóm thật, đếm 0 từ kho thật (không dùng `cat.count` seed).
- File: `routeWrappers.tsx`, `ProductDetailView.tsx`, `ExploreEmptyCatalog.tsx`. `PersonalizeView.tsx` không sửa (empty state đã đủ). DB: không thêm; PDP mock chỉ để test UI, không ghi DB.

**Flow 3 — Landing/admin marketing** (`wave2/marketing`)
- Trước: marketing phải lưu rồi mở Home mới thấy kết quả. Sau: `StorefrontPreview` cạnh form (desktop `sticky` 2 cột `xl`, mobile preview trước form), phản ánh `localContent` chưa lưu.
- Field trống hiện “Chưa cấu hình” hoặc giá trị mặc định có nhãn “(mặc định)”; announcement tắt thì ẩn; badge/CTA có ghi chú “chưa hiển thị trên web” khi đúng.
- Không đổi `handleSave`/validation; không gọi DB. `AdminStorefrontPanel.tsx` nén 4 dòng formatting để giữ trần `max-lines` (1.112).
- DB: chỉ đọc/ghi qua `siteContent` hiện có; không bảng mới.

### 4.2 Gate & tích hợp

| Lệnh | Kết quả |
|---|---|
| `npx tsc --noEmit` | PASS |
| `npm run test:unit` | **203/203 PASS**, 64 suite |
| `npm run check` | **24/24 OK** (18 gate so baseline) |
| Browser smoke 390/1440 | quote → checkout (0 dialog), sticky bar, PDP not-found, PDP mock product/no-channel, Explore, Personalize: 0 tràn, 0 `pageerror` |

- Nhánh: `wave2/quote`, `wave2/discover`, `wave2/marketing` → `wave2/integration`.
- Bằng chứng ảnh: `/tmp/opencode/pw/out/wave2-quote-sticky-390.png`, `/tmp/opencode/wave2d-pdp-product-390.png`, `/tmp/opencode/wave2d-pdp-nochannel-390.png`, `/tmp/opencode/wave2d-real-explore-390.png`, `/tmp/opencode/w2m-1440.png`, `/tmp/opencode/w2m-390.png` (ảnh tạm, không commit).
- Admin preview chạy bằng mock auth/`site_content`; **không** tạo tài khoản, không ghi DB.

### 4.3 Phụ thuộc DB còn thiếu / giới hạn

- Không item nào cần cột/bảng mới; tất cả đọc/ghi qua service hiện có.
- PDP sellable + admin preview chưa có dữ liệu/tài khoản thật ⇒ chỉ chứng minh bằng mock; cần QA trên dữ liệu thật khi có catalog publish.
- Preview marketing chỉ phản ánh các field đang có trong `site_content`; section chưa có schema (workflow images, testimonial…) vẫn ngoài phạm vi, hiển thị “Chưa cấu hình”.
- Các blocker cũ không đổi: QA-MONEY-01 staging, SEC-01, DB publish enforcement, SEO-02, DATA-01/02/03, mailbox liên hệ.

**Không đánh dấu Phase 0 hoàn tất từ Wave 2.**
