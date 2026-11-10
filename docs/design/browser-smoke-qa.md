<!-- doc-meta: status=active; verified=2026-11-10; owner=lead -->
# QA-BROWSER-01 — Browser smoke 390 / 1440 (không ghi DB)

> **Mục đích:** một checklist cố định để chạy smoke UI sau mỗi phase, tách khỏi
> `docs/design/qa-checklist.md` (file cũ, rất dài và trỏ tới route table `src/App.tsx` đã
> tách). Doc này là **cổng nhanh**: route sweep + 4 assert máy đo được, kèm template evidence.
>
> **Không thay thế** kiểm thử giao dịch. Ba mức dưới đây là **khác nhau** và không được gộp:

| Mức | Chứng minh được | KHÔNG chứng minh được |
|---|---|---|
| `npm run test:unit` / `npm run lint` | hàm thuần, type, build | UI thật, RLS, tiền |
| `npm run test:e2e:api` dry-run | fixture harness, (nếu có env) DB reachable — **read-only** | vòng tiền, ghi DB, browser |
| **QA-BROWSER-01 (doc này)** | route render, 0 `pageerror`, 0 tràn ngang, empty/error/navigation | DB/RLS, thanh toán, publish |
| `--live` trên staging (QA-API-01) | guest insert + token RPC + RLS chặn ghi bảng tiền | UI, dispatch, settlement |
| **QA-MONEY-01** (staging, có ghi DB) | guest order → admin confirm → dispatch → tracking + cleanup | — |

**Route source of truth:** `src/frontend/routes/AppRoutes.tsx` (+ `navConfig.ts` cho tab console).
Nếu route/tab đổi, cập nhật bảng dưới trong cùng thay đổi.

## 0. Quy tắc tuyệt đối

- **Chỉ đọc:** không bấm submit form, không thêm vào giỏ ở bước này, không publish, không xoá.
  Browser smoke không được ghi DB.
- Không chạy trên production khi chưa được duyệt; ưu tiên server local với dữ liệu mock hoặc
  staging read-only.
- **Không thêm Playwright/Chromium vào dependency** nếu PO chưa duyệt (repo hiện không có).
  Agent có thể dùng browser tool sẵn có; người có thể dùng DevTools.
- Không ghi secret vào evidence/log. Nếu URL chứa token/email thật, che trước khi dán.

## 1. Chuẩn bị

```bash
npm run dev          # http://localhost:3000 (hoặc cổng Vite báo, ví dụ 3001 nếu 3000 bận)
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:<port>/
```

- Nếu `.env` thiếu: app chạy **mock**, console có cảnh báo
  `[vcube] Supabase CHƯA được cấu hình…` + lỗi `ERR_CONNECTION_REFUSED` tới Supabase.
  Đây là **nhiễu môi trường**, không phải lỗi UI — vẫn phải ghi rõ trong evidence.
- Nếu có `.env` staging: dùng tài khoản test cho console; đọc-only.
- DevTools: bật **Preserve log**; lọc `Errors`.

## 2. Viewport bắt buộc

| Width | Height | Vì sao |
|---|---:|---|
| **390** | 844 | Blocking width: tràn ngang, tap target, nav drawer |
| **1440** | 900 | Desktop chuẩn, container `max-w-[1440px]` |

(768/1024/1920 là spot-check bổ sung, không bắt buộc cho gate nhanh.)

## 3. Route matrix

### 3.1 Public (không cần đăng nhập)

| Route | Kỳ vọng chính |
|---|---|
| `/` | Home render; h1 có; catalog/3D hero không tràn |
| `/explore` | Explore render; filter/search URL còn; empty state thật khi catalog rỗng |
| `/personalize` | Empty state (không 404) khi không có sản phẩm |
| `/quote` | Quote workstation render; dropzone không tự submit |
| `/cart` | Empty state giỏ hàng |
| `/checkout` | Form render; **không submit**; cảnh báo nếu thiếu payment config |
| `/order-success` | Empty state khi không có order trong session/DB |
| `/tracking` | Form tra cứu; **không submit** |
| `/auth/login` | Form; không submit; không bấm OAuth nếu đang tắt |
| `/auth/register` | Form; không submit |
| `/this-route-does-not-exist` | `NotFoundView` (404) |
| `/products/<id-không-tồn-tại>` | Empty/not-found thật, không crash |

Khi có **published product** trên staging: thêm `/products/<id thật>` và
`/personalize/<id thật>`. Không bịa id/sản phẩm.

### 3.2 Guard khi CHƯA đăng nhập

| Route | Kỳ vọng |
|---|---|
| `/orders`, `/assets`, `/account` | `ProtectedRoute` → `/auth/login?redirectTo=<path+search>` |
| `/designer`, `/designer/:tab` | `RoleGuard` → `/auth/login?redirectTo=…` |
| `/admin`, `/admin/:section` | `RoleGuard` → `/auth/login?redirectTo=…` |
| `/lab`, `/lab/:tab` | `RoleGuard` → `/auth/login?redirectTo=…` |

### 3.3 Redirect legacy

`/tool-3d`→`/quote`, `/my-orders`→`/orders` (rồi guard), `/library`→`/assets` (guard),
`/profile`→`/account` (guard), `/creator`(+`/*`)→`/designer` (guard), `/login`→`/auth/login`,
`/register`→`/auth/register`. Không có vòng redirect ngược khi bấm Back.

### 3.4 Console đã đăng nhập (cần tài khoản staging)

| Persona | Route cần phủ |
|---|---|
| Admin (23 section) | `/admin/{overview,group0-overview,workshops,partners,machines,designers,users,customers,pricing,pricing-engine,pricing-setup,cost-rules,materials,hardware,quote-calc,queue,orders,inventory,products,storefront,seo,settings,audit-log}` |
| Designer (5 tab) | `/designer/{overview,models,wizard,requests,payouts}` |
| Lab/Workshop (7 tab) | `/lab/{queue,machines,materials,accessories,warranty,audit_trail,preferences}` |

Mỗi route: đổi tab/section ít nhất một lần để phát hiện lỗi keep-alive/boundary, **không bấm
nút ghi dữ liệu** (Save/Publish/Delete/Confirm). Nếu buộc phải mở modal, đóng bằng Esc/✕.

## 4. Assert mỗi route × mỗi width

| ID | Assert | Cách đo | Đạt khi |
|---|---|---|---|
| B1 | **0 pageerror** | Playwright `page.on('pageerror')` hoặc DevTools Console filter `Uncaught` | 0 exception chưa bắt |
| B2 | **0 tràn ngang** | `document.documentElement.scrollWidth <= clientWidth + 1` | true |
| B3 | **Có nội dung** | `document.body.innerText.trim().length` | > 20 ký tự (không màn trắng) |
| B4 | **Heading** | `document.querySelectorAll('h1')` có text | ≥ 1 (trừ ngoại lệ đã ghi trong evidence) |
| B5 | **Tiếng Việt** | đọc copy hiển thị | không lộ chuỗi EN mới |
| B6 | **Console sạch** | Console errors, trừ nhiễu môi trường đã biết | 0 lỗi không giải thích được |
| B7 | **Không ghi DB** | không submit/save; mạng chỉ GET | 0 request POST/PATCH/DELETE do QA |

Đo nhanh trong DevTools Console (dán sau khi trang ổn định):

```js
({
  path: location.pathname + location.search,
  pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  h1: [...document.querySelectorAll('h1')].filter(e => e.textContent.trim()).length,
  textLen: document.body.innerText.replace(/\s+/g, ' ').trim().length,
});
```

`pageerror` **không** đo được bằng snippet sau khi load; phải bật listener trước khi điều hướng
(Playwright) hoặc đọc mục `Uncaught` trong Console (DevTools).

## 5. Evidence template

Copy khối này vào `docs/handoff/qa-browser-01-evidence.md` (hoặc file handoff của phase).

```md
### Phiên chạy
| Field | Value |
|---|---|
| Ngày | YYYY-MM-DD |
| Người/agent | |
| Commit / branch | |
| Server | `npm run dev` · http://localhost:<port> |
| Dữ liệu | mock (không .env) / staging read-only |
| Viewport | 390×844 · 1440×900 |
| Số route × width | |
| Ghi chú môi trường | ví dụ: thiếu .env → console cảnh báo mock + ERR_CONNECTION_REFUSED |

### Kết quả tổng
| Metric | 390 | 1440 |
|---|---:|---:|
| pageerror | | |
| tràn ngang | | |
| route không có h1 | | |
| console lỗi không phải nhiễu môi trường | | |

### Chi tiết
| Route | Width | Kết quả | B1 pageerror | B2 tràn | B4 h1 | Ghi chú / evidence |
|---|---|---:|---|---|---|---|
| `/` | 390 | PASS | 0 | 0 | 1 | |
```

**Giá trị kết quả:** `PASS` · `FAIL` · `BLOCKED` (kèm lý do) · `N/A` (kèm lý do).

## 6. Điều kiện dừng

- `FAIL` nếu có `pageerror`, tràn ngang ở 390, màn trắng, hoặc console error không giải thích được.
- `BLOCKED` hợp lệ khi thiếu tài khoản staging/route cần dữ liệu thật; phải ghi rõ.
- Không được ghi "QA-BROWSER-01 PASS" nếu console route chưa chạy. Ghi
  **"public routes PASS · console BLOCKED (thiếu tài khoản)"**.
- Không được suy ra "vòng tiền PASS" từ browser smoke.
