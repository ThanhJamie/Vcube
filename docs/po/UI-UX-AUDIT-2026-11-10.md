<!-- doc-meta: status=active; verified=2026-11-10; owner=lead -->
# UI/UX Audit toàn app — 2026-11-10

> Base: `main` @ `611c1f7`. Không push/deploy. Không ghi/xoá dữ liệu production.
> Ảnh bằng chứng tạm ở `/tmp/opencode/audit/` (không commit).

## 1. Route & luồng theo vai trò

| Vai trò | Route đã đi | Trạng thái dữ liệu đã kiểm |
|---|---|---|
| Khách | `/`, `/explore`, `/explore?search=…`, `/products/:id` (404 + mock published), `/personalize`, `/quote` (STL thật), `/cart` (rỗng + có món), `/checkout` (rỗng + có món, **không submit**), `/order-success/nope`, `/tracking`, `/tracking/nope`, `/auth/login`, `/auth/register`, route 404 | thật / rỗng / loading / lỗi mạng (abort `rest/v1`) |
| Khách đã đăng nhập | `/orders`, `/account`, `/assets` | danh sách rỗng, mock phiên buyer + REST rỗng |
| Designer | `/designer` | mock phiên designer, REST rỗng |
| Admin | `/admin`, `/admin/orders`, `/admin/products`, `/admin/storefront` | mock phiên admin, REST rỗng |
| Chưa kiểm chứng được | `/lab`; checkout submit thật; đơn/asset thật; CMS save thật | thiếu tài khoản staging/quyền ghi — **không tạo dữ liệu** |

Viewport: **390×844, 768×1024, 1440×900** cho mọi route nhóm khách; admin/designer/buyer ở 390 + 1440.

## 2. Bằng chứng chính

| Ảnh | Nội dung |
|---|---|
| `390-home.png`, `768-home.png`, `1440-home.png` | H1 hero bị cắt dấu tiếng Việt ở 768/1440; dòng "Chưa cấu hình" hiện công khai |
| `390-explore.png` | Empty state + CTA rõ; không tràn |
| `390-pdp-notfound.png` | 404 PDP có 2 CTA đúng (Wave 2) |
| `390-quote-loaded.png`, `390-quote-sticky` | Sticky tổng/CTA mobile hoạt động |
| `390-cart-drawer.png` | Thumbnail xám trống cho món từ quote |
| `390-cart-item.png`, `390-checkout-item.png` | Cart/checkout có fallback icon; checkout đủ bước/phương thức |
| `390-tracking-nope.png`, `390-tracking-invalid.png` | Nhãn "Mã Đơn Hàng: (không bắt buộc)" nhưng input `required` ⇒ chặn submit, tooltip tiếng Anh |
| `390-notfound.png` | Nút chính "Về Trang Chủ" cao 21px, nút phụ 48px |
| `390-register.png`, `1440-admin-storefront-mock.png` | Role toggle 31px; nhãn "Họ và tên **" lặp dấu sao |
| `390-admin-mock.png`, `1440-admin-mock.png`, `390-designer-mock.png` | Shell admin/designer responsive, 0 tràn |
| `390-error-explore-8s.png` | Lỗi mạng có error + "Thử lại" sau timeout (không phải skeleton vĩnh viễn) |

## 3. Bảng ưu tiên

| # | Màn hình/luồng | Vấn đề | Bằng chứng | Tác động | Cách sửa | Tiêu chí nghiệm thu |
|---|---|---|---|---|---|---|
| **P0-1** | Home hero (768/1440) | `--font-hero-lh` 0.90–0.96 làm dấu mũ/acute của "CHẾ / KHÍ" bị cắt | `768-home.png`, `1440-home.png` | Ấn tượng đầu, lỗi chữ tiếng Việt | Nâng line-height hero ≥1.03; thêm khoảng trắng accessible giữa 2 dòng h1 | 768/1440 không cắt dấu; 0 tràn; h1 đọc đúng |
| **P0-2** | `/tracking` | Nhãn nói mã đơn "(không bắt buộc)" nhưng input `required` chặn submit; tooltip tiếng Anh; Field tự thêm "(không bắt buộc)" lần 2 | `390-tracking-invalid.png` | **Chặn tra cứu** khi user chỉ có token/SĐT; thông báo sai ngôn ngữ | `Field required` cho cả 2 ô, bỏ "(bắt buộc)" thủ công, `noValidate` + validate VI sẵn có | Submit thiếu mã/token hiện lỗi VI; đủ 2 ô → gọi RPC; không tooltip EN |
| **P0-3** | Route 404 | Nút chính cao 21px do `flex-1` trong flex-col mobile đè `h-12` | `390-notfound.png` | CTA chính trông hỏng, vùng chạm <24px | `w-full sm:flex-1` cho nút chính | Nút chính cao 48px ở 390/768/1440 |
| **P1-1** | Cart drawer | Món từ quote không có ảnh ⇒ `<img src="">` bị ẩn, để lại ô xám trống; Cart/Checkout đã có icon fallback | `390-cart-drawer.png` | Khó nhận diện món, không nhất quán | Dùng `safeImageUrl` + icon fallback như CartView | Drawer hiện icon khi không có ảnh; ảnh thật vẫn hiện |
| **P1-2** | Login/Register | Submit rỗng bị HTML5 `required` chặn ⇒ không hiện lỗi VI đã code; nhãn Register lặp `**`; role toggle 31px | `390-register.png` | Phản hồi không nhất quán, khó hiểu | `noValidate` + bỏ `*` thủ công + `min-h-11` role toggle | Submit rỗng hiện lỗi VI; nhãn 1 dấu `*`; toggle ≥44px |
| **P1-3** | Home (khách) | Hiện "Chưa cấu hình" cho 3 chỉ số kỹ thuật khi CMS trống | `390-home.png` | Cảm giác web chưa hoàn thiện | Ẩn dòng này với khách; admin vẫn thấy + CTA nhập | Khách không thấy "Chưa cấu hình"; admin giữ shortcut |
| P2-1 | Cart | Ô mã giảm giá là dead-end vì chưa có bảng promotions | text cart | Mời gõ rồi từ chối | Giữ note trung thực, cân nhắc thu gọn | — (backlog) |
| P2-2 | Checkout rỗng | Card rỗng giữa trang, nhiều khoảng trắng | `1440-checkout-empty.png` | Cảm giác trống | Căn đầu trang hoặc thêm CTA phụ | — (backlog) |
| P2-3 | Admin mobile | Breadcrumb bị cắt "VCUBE / Tổng …" | `390-admin-mock.png` | Mất ngữ cảnh phụ | Cho breadcrumb wrap hoặc rút gọn có chủ đích | — (backlog) |
| P2-4 | Footer desktop | Link chân trang cao 16px (<24px WCAG 2.5.8) | metrics 768/1440 | Vùng chạm nhỏ trên tablet | Bỏ `sm:min-h-0` hoặc `py-1` | — (backlog) |
| P2-5 | Auth | "Quên mật khẩu" chỉ dẫn liên hệ hỗ trợ dù đã có `sendPasswordReset` | `390-login.png` | Phụ thuộc hỗ trợ thủ công | Thêm luồng reset bằng email | — (backlog) |

## 4. Nhóm triển khai đã chọn

**“Guest journey correctness & polish”** — P0-1, P0-2, P0-3, P1-1, P1-2, P1-3.

Vì sao: sửa lỗi cản thao tác (tracking), lỗi hiển thị first-impression (hero, 404) và các điểm lặp ở nhiều trang (auth, cart drawer) bằng thay đổi nhỏ, không đổi kiến trúc/dữ liệu.

| Worker | File sở hữu | Nội dung |
|---|---|---|
| UI3-HOME | `src/index.css`, `src/frontend/views/HomeView.tsx` | Hero line-height + accessible h1; ẩn dòng "Chưa cấu hình" với khách |
| UI3-AUTH | `src/frontend/components/NotFoundView.tsx`, `LoginView.tsx`, `RegisterView.tsx` | Nút 404; `noValidate`; nhãn 1 dấu `*`; role toggle 44px |
| UI3-COMMERCE | `src/frontend/views/OrderTrackingView.tsx`, `src/frontend/components/CartDrawer.tsx` | Nhãn/validate tra cứu; fallback thumbnail drawer |

Không sửa DB/migration/seed; không thêm dependency; VI-only; design v3.

## 5. Giới hạn kiểm chứng

- Không có tài khoản buyer/designer/admin thật ⇒ admin/designer/buyer dùng **mock phiên + REST rỗng**, chỉ kết luận layout/empty state, không kết luận dữ liệu thật.
- PDP published dùng **mock product** (route intercept), không ghi DB.
- Quote dùng STL cục bộ; checkout **không submit** để tránh tạo đơn production.
- Lỗi mạng mô phỏng bằng abort `rest/v1`; thời gian hiện error phụ thuộc timeout Supabase (~5s).
- Không kiểm chứng `/lab`, CMS save thật, invoice/print, upload file lên Storage.

## 6. Kết quả triển khai (2026-11-10)

**Trạng thái: 6/6 item nhóm đã chọn DONE**, tích hợp `ui3/integration` (merge `8df434c` → `ab44bf5` → `3ff4ab7`). Không push/deploy.

| ID | Item | Branch / commit | Kết quả | Bằng chứng |
|---|---|---|---|---|
| P0-1 | Hero không cắt dấu tiếng Việt | `ui3/home` · `a7fd99a` + tinh chỉnh integration | **DONE** | Line-height 1.05 ở 640/768/1024/1280; 390/768/1440 dấu hiện đủ; h1 đọc `"CHẾ TÁC CƠ KHÍ IN 3D…"` |
| P1-3 | Khách không thấy "Chưa cấu hình" | `ui3/home` · `a7fd99a` | **DONE** | 390/768/1440 `document.body.innerText` không chứa chuỗi; admin giữ shortcut |
| P0-3 | Nút 404 cao 48px | `ui3/auth` · `9af1934` | **DONE** | `w-full sm:flex-1`; đo 390/768/1440 = **48px** |
| P1-2 | Auth validation VI + nhãn 1 dấu `*` + toggle 44px | `ui3/auth` · `9af1934` | **DONE** | Submit rỗng → alert "Vui lòng nhập đầy đủ email và mật khẩu." / "Vui lòng điền đầy đủ email và mật khẩu."; 0 nhãn `**`; role toggle **44/44px** |
| P0-2 | Tra cứu đơn: nhãn/validate đúng | `ui3/commerce` · `9cd8fe7` | **DONE** | 2 form `noValidate`; nhãn `Mã Đơn Hàng: *` / `Mã truy cập hoặc số điện thoại nhận hàng: *`; thiếu mã → lỗi VI; đủ mã+token sai → card "Không tìm thấy đơn hàng" (`role=status`) |
| P1-1 | Cart drawer có fallback thumbnail | `ui3/commerce` · `9cd8fe7` | **DONE** | Món quote hiện icon `photo_library` + badge "IN 3D"; ảnh thật vẫn render |

**Gate sau tích hợp:** `npx tsc --noEmit` PASS; `npm run test:unit` **203/203**; `npm run check` **24/24 OK** (18 gate so baseline); browser 390/768/1440 **0 tràn, 0 `pageerror`**.

**Ảnh sau sửa:** `/tmp/opencode/audit/final-home-390|768|1440.png`, `final-404-390.png`, `final-login-390.png`, `final-register-390.png`, `final-tracking-missing-390.png`, `final-tracking-notfound-390.png`, `final-cart-drawer-390.png` (tạm, không commit).

**Backlog giữ nguyên:** P2-1 promo dead-end; P2-2 checkout rỗng nhiều khoảng trắng; P2-3 breadcrumb admin mobile; P2-4 footer desktop 16px; P2-5 luồng quên mật khẩu; cùng các blocker dữ liệu/staging cũ.
