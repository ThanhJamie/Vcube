<!-- doc-meta: status=active; verified=2026-11-10; owner=lead -->
# QA-BROWSER-01 — Evidence: browser smoke 390/1440

> **Trạng thái 2026-11-10:** `public routes PASS (mock, read-only)` · `console đã đăng nhập: BLOCKED`
> (thiếu tài khoản staging) · `PDP published / tracking chi tiết: BLOCKED` (catalog rỗng, không có
> token thật). **Không** phải bằng chứng giao dịch.
>
> Checklist & cách chạy: `docs/design/browser-smoke-qa.md`.
>
> **Phạm vi bằng chứng (đọc kỹ):** chỉ **public routes**, chạy với **mock data**, **không có
> `.env`/DB**, **không đăng nhập**, **không submit form**, **không ghi DB**. Đây **không** phải
> staging, **không** phải production, **không** đại diện cho console admin/designer/lab.
> Các thay đổi harness/CI/docs ở commit sau **không đổi UI**, nên số đo UI vẫn dùng được.

## 0. Tính tái lập

- Commit đo: `004dfc8` (branch `wave1/qa`); UI không đổi ở commit evidence.
- Máy: worktree WSL2; `npm run dev` từ worktree, Vite báo cổng **3001** do 3000 đã bận.
- Browser context **riêng** (`w1-qa-browser`) để không lẫn phiên agent khác.
- Route list: 30 path (public + guard/redirect + negative case), mỗi viewport 1 lượt.
- Chờ ~1,6 s sau `domcontentloaded` cho lazy chunk/3D settle; bật listener `pageerror` +
  `console` **trước** mỗi `goto`.
- Không dùng secret, không kết nối Supabase thật.

## 1. Phiên chạy

| Field | Value |
|---|---|
| Ngày | 2026-11-10 |
| Branch / base | `wave1/qa` @ `6ecfa19` |
| Tester | machine-implementer (browser agent) |
| Server | `npm run dev` trong worktree; Vite chọn **3001** vì 3000 đang bận |
| Dữ liệu | **mock** — worktree không có `.env`, không kết nối DB |
| Viewport | 390×844 · 1440×900 |
| Số lượt | 30 route × 2 width = **60 navigation** |
| Ghi chú môi trường | console cảnh báo `[vcube] Supabase CHƯA được cấu hình…` + `ERR_CONNECTION_REFUSED` tới `localhost:54321` (do thiếu `.env`). Đã tách khỏi lỗi UI. |
| Công cụ | Playwright browser tool sẵn có của agent; **không thêm dependency** vào repo |

## 2. Kết quả tổng

| Metric | 390×844 | 1440×900 |
|---|---:|---:|
| `pageerror` (uncaught) | **0** | **0** |
| Tràn ngang (`scrollWidth > clientWidth + 1`) | **0** | **0** |
| Route màn trắng (`textLen < 20`) | **0** | **0** |
| Route không có `h1` | 2 (`/order-success`, `/products/does-not-exist`) | 2 (như trên) |
| Console error **không phải nhiễu môi trường** | **0** | **0** |
| Console error nhiễu môi trường (mock/network) | 3.204 dòng tích luỹ | (cùng phiên) |
| Form submit / ghi DB | **0** | **0** |

## 3. Chi tiết public routes

`h1` = số heading cấp 1 có text; `textLen` = độ dài text hiển thị (đã rút gọn khoảng trắng).

| Route | 390 | 1440 | Ghi chú |
|---|---|---|---|
| `/` | PASS · h1=1 · textLen 3478 | PASS · h1=1 · 3983 | |
| `/explore` | PASS · h1=1 · 1042 | PASS · h1=1 · 1308 | catalog rỗng do không có DB; hiển thị trạng thái tải/empty — **chưa kết luận** empty state với dữ liệu thật |
| `/personalize` | PASS · h1=1 · 707 | PASS · h1=1 · 751 | không 404 |
| `/quote` | PASS · h1=1 · 946 | PASS · h1=1 · 1005 | không upload/submit |
| `/cart` | PASS · h1=1 · 718 | PASS · h1=1 · 777 | empty state |
| `/checkout` | PASS · h1=1 · 628 | PASS · h1=1 · 687 | **không submit** |
| `/order-success` | PASS render · **h1=0** · 721 | PASS · **h1=0** · 780 | observation: thiếu `h1` (empty state) — ngoài scope sửa UI của task này |
| `/tracking` | PASS · h1=1 · 932 | PASS · h1=1 · 991 | form tra cứu, không submit |
| `/auth/login` | PASS · h1=1 · 676 | PASS · h1=1 · 735 | |
| `/auth/register` | PASS · h1=1 · 1015 | PASS · h1=1 · 1074 | |
| `/this-route-does-not-exist` | PASS · h1=1 · 707 | PASS · h1=1 · 766 | `NotFoundView` |
| `/products/does-not-exist` | PASS render · **h1=0** · 561 | PASS · **h1=0** · 605 | observation: not-found không có `h1`; **không** phải PDP thật |

## 4. Guard & redirect (chưa đăng nhập)

| Route | 390 → final | 1440 → final | Đánh giá |
|---|---|---|---|
| `/tool-3d` | `/quote` | `/quote` | PASS |
| `/my-orders` | `/auth/login` | `/auth/login` | PASS |
| `/library` | `/auth/login` | `/auth/login` | PASS |
| `/profile` | `/auth/login` | `/auth/login` | PASS |
| `/creator` | `/auth/login?redirectTo=%2Fdesigner` | như 390 | PASS |
| `/login` | `/auth/login` | `/auth/login` | PASS |
| `/register` | `/auth/register` | `/auth/register` | PASS |
| `/orders`, `/assets`, `/account` | `/auth/login` | `/auth/login` | PASS — **observation:** `ProtectedRoute` không giữ `redirectTo` (UX-02, worker khác) |
| `/designer`, `/designer/models` | `/auth/login?redirectTo=…` | như 390 | PASS |
| `/admin/{overview,products,orders,audit-log}` | `/auth/login?redirectTo=…` | như 390 | PASS |
| `/lab`, `/lab/queue` | `/auth/login?redirectTo=…` | như 390 | PASS |

Không có vòng redirect ngược; không trang nào tràn ngang ở 390.

## 5. BLOCKED — chưa chạy được (phải nói rõ, không tính PASS)

| Hạng mục | Lý do | Cần gì |
|---|---|---|
| Admin 23 section | Không có tài khoản admin staging | `E2E_STAGING_ADMIN_EMAIL/PASSWORD` hoặc tài khoản test |
| Designer 5 tab | Không có tài khoản designer | tài khoản staging role `designer` |
| Lab 7 tab | Không có tài khoản lab/workshop | tài khoản staging role `lab`/`workshop` |
| `/products/<published>` + `/personalize/<id>` | **0 sản phẩm published**, không có DB | catalog staging có ít nhất 1 sản phẩm published |
| `/tracking/<order>` timeline | Không có order + token thật | order staging + `secure_access_token` |
| `/order-success/<order>` với dữ liệu | Không có order trong DB/session | order staging |

## 6. Evidence tái lập

Trình tự agent đã dùng (rút gọn, không phụ thuộc package mới):

1. Mở browser context riêng, `viewport` 390×844 rồi 1440×900.
2. Gắn listener `page.on('pageerror')` và `page.on('console')` **trước** mỗi lượt điều hướng.
3. `page.goto(<route>, { waitUntil: 'domcontentloaded' })`, đợi ~1,6 s cho lazy chunk/3D settle.
4. Đo `document.documentElement.scrollWidth/clientWidth`, số `h1`, `body.innerText.length`.
5. Tách console lỗi môi trường bằng pattern `ERR_CONNECTION_REFUSED|localhost:54321|WebSocket|CHƯA được cấu hình`.

Không chụp/lưu dữ liệu DB; không submit form.

## 7. Kết luận (đúng mức)

| Câu hỏi | Trả lời |
|---|---|
| Public routes render không crash ở 390/1440? | **Có** — 0 `pageerror`, 0 tràn |
| Console đã đăng nhập (admin/designer/lab) đã smoke? | **Chưa — BLOCKED** |
| Có bằng chứng UI dùng dữ liệu thật (published/product/tracking)? | **Chưa — BLOCKED** |
| Có được coi là QA-MONEY-01? | **Không** |
| Có thêm Playwright dependency? | **Không** (chỉ đề xuất nếu PO muốn CI browser) |

**Follow-up nhỏ (ngoài scope sửa):** bổ sung `h1` cho empty state `/order-success` và not-found
`/products/:id` (B4). Ghi nhận `ProtectedRoute` mất `redirectTo` (UX-02).

## 8. Đối chiếu review

| Mã | Trạng thái | Ghi chú |
|---|---|---|
| P2-3 evidence đúng môi trường | ✅ | §0 nêu commit/cổng/context/mock; §5 liệt kê BLOCKED thay vì suy diễn |
| P2-4 độ tái lập + giới hạn | ✅ | §0/§6: route count, wait, listener, pattern tách nhiễu; đầu file ghi rõ **chỉ public/mock** |
