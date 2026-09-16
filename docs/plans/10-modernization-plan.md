> [!WARNING]
> **TÀI LIỆU LỊCH SỬ (SUPERSEDED — archived 2026-09).** Thư mục `docs/plans/**` là bộ kế hoạch refactor cũ và **không còn là nguồn chuẩn**. Nguồn chuẩn hiện tại: `docs/README.md` → `docs/architecture/`, `docs/pages/`, `docs/database/`, `docs/security/`, `docs/SETUP_RUNBOOK.md`. Nội dung được giữ nguyên để tra cứu lịch sử; **mọi số liệu (số bảng/index/policy, bundle, phase) trong đây đã lạc hậu** so với code. Xem `docs/archive/README.md`.

# 10 — Hiện đại hoá UI/UX + liên kết tính năng (kế hoạch tổng thể)

> Trả lời 3 yêu cầu của chủ dự án (2026-09-12): **(1)** UI còn basic, thiếu cảm giác hiện đại/mượt — muốn đổi **toàn bộ UI**, không chỉ CSS; **(2)** performance + tính năng/thông số rời rạc, chưa nối với nhau, khó tiếp cận; **(3)** còn lỗi theme và **`/admin` rất xấu**.
>
> Toàn bộ số liệu dưới đây **đo trên working tree** sau Đợt 1–4c, kèm **ảnh chụp thật** (Playwright + Edge). Trạng thái: **CHỜ DUYỆT**.

---

## 0. Kết luận ngắn — vì sao UI trông cũ

| # | Nguyên nhân gốc | Bằng chứng đo được |
|---|---|---|
| 1 | **Design system đã dựng nhưng KHÔNG ĐƯỢC DÙNG.** 18 primitive + token có thật, nhưng trang không dùng | Adoption ngoài `ui/**`: `Button` **4 file**, `Field`/`Input`/`Select`/`Modal`/`Sheet`/`ConfirmDialog`/`Badge`/`Card`/`StatCard`/`DataTable`/`ToastViewport`/`EmptyState`/`Skeleton`/`ProgressBar`/`Money` = **0 file**. Chỉ `<Icon>` được dùng (58 file) |
| 2 | **~5.600 class palette THÔ không đổi theo `.dark`** ⇒ theme tối vỡ | `components` 2.187 + `admin` 1.471 + `admin/groups` 1.152 + `views` 629 + `tool3d` 180 = **5.619** (slate/rose/emerald/amber/blue…). Cộng **1.630** `bg-white`/`text-white`/`bg-black` |
| 3 | **`/admin` là vùng tệ nhất, chưa hề chạm primitive** | 15 panel · **12.817 LOC** · 10 `<table>`, **0 `<DataTable>`** · **0 `<Modal>`**, 8 file tự viết `fixed inset-0` · 5 `window.confirm/alert` · **1 `htmlFor` cho 167 `<input>`** |
| 4 | **Số liệu bịa vẫn hiển thị** (A10 chỉ dọn tầng data; `.tsx` còn fallback `||`) | `HomeView.tsx:355` `\|\| '±0.05 MM'`, `:364` `\|\| 'GIAO HÀNG 24H'`, `:373` `\|\| 'ISO/ASTM 52900'`, `:450`/`:1208` Mitutoyo, `:178` `\|\| [... 'ISO 9001:2015 CERTIFIED' ...]`. **17 file `.tsx`** còn chuỗi bịa |
| 5 | **`localStorage` hồi sinh dữ liệu cũ/vô hiệu hoá mọi nỗ lực trung thực** | `App.tsx` **đọc** 5 key ở `:292,328,338,348,360` và **ghi** ở `:491,504,517,764,773` (`vcube_products/site_content/materials/printers/pricing_config`) |

**Bằng chứng ảnh:** `/quote` (route tối) — khung dropzone render thành **hộp TRẮNG** (`Tool3DView.tsx:596` `bg-white`) với chữ `text-slate-500` ⇒ **chữ gần như vô hình**; banner cảnh báo dùng `bg-amber-50` sáng. Đây chính là "lỗi theme" và "trông không hiện đại".

---

## 1. Baseline đo được (số liệu để nghiệm thu)

| Chỉ số | Hiện tại | Đích |
|---|---:|---:|
| class palette thô (không theo theme) | **5.619** | **0** ở route dual-theme |
| `bg-white`/`text-white`/`bg-black` thô | **1.630** | **0** |
| file dùng primitive ngoài `ui/**` | **4** | **≥ 60** |
| `<table>` tự viết (admin) | **10** | 0 (qua `DataTable`) |
| modal tự viết `fixed inset-0` | **26 file** | 0 (qua `Modal`/`Sheet`) |
| `window.confirm/alert` | **6** | 0 |
| `<input>` admin có `htmlFor` | **1 / 167** | 100% |
| chuỗi số liệu bịa trong `.tsx` | 17 file | 0 |
| `localStorage` shadow trong `App.tsx` | 10 dòng | 0 |
| `<img>` có `loading="lazy"` | **1 / 23** | 100% |
| CSS build | 140.769 B | ≤ 60.000 B |
| critical path gzip | ~403 KB | ≤ 250 KB |

---

## 2. Nguyên nhân gốc (vì sao "không mượt / không hiện tại")

1. **Không có design language cho *chuyển động và nhịp*** — chỉ có token màu/typography. Không có: nhịp spacing theo vùng, motion cho chuyển trang/panel, trạng thái hover/active/press nhất quán, skeleton đúng layout.
2. **Bố cục dùng "viền + nền xám" thay vì phân cấp surface** — mọi thứ là `bg-white` + `border-slate-200` ⇒ phẳng, nặng, giống template admin 2020.
3. **Icon nhỏ và không đồng nhất** — sau migrate icon, 491/610 icon nhỏ đi; ảnh chụp cho thấy icon 14px thành "vệt đen" không đọc được.
4. **Rời rạc tính năng (feature silos):** `/quote` → giỏ → checkout → đơn → tài sản không chia sẻ một mô hình dữ liệu; `/admin` sửa `materials`/`printers`/`công thức giá` nhưng storefront đọc từ prop/`localStorage`; settings nằm 5 nơi (`site_content`, `app_settings`, `pricing_configs`, `pricing_global_settings`, `localStorage`) mà chưa có một nguồn/ một hook.
5. **Không có tầng trạng thái dùng chung** — mỗi màn tự xử lý loading/empty/error; hiện chỉ 1 số màn có.

---

## 3. Hướng thị giác mới (đề xuất — cần chốt, sẽ ghi vào `00` §2)

Giữ bất biến đã chốt (dual-theme + brand teal, light-first storefront, dark-first `/quote`/`/admin`/`/lab`/`/designer`). **Thay đổi ngôn ngữ thị giác:**

| Khía cạnh | Hiện tại | Đề xuất |
|---|---|---|
| **Phân cấp surface** | viền xám + `bg-white` khắp nơi | **3 tầng surface** (`canvas` → `surface` → `surface-raised`) + bo góc lớn; viền chỉ dùng khi cần phân tách, mặc định dùng **chênh sắc độ** + shadow mềm |
| **Radius** | `rounded` 6px tràn lan, card 6px | **card 16px, control 10px, chip 9999px**, badge 8px (thang mới `--radius-card/control/pill`) |
| **Elevation** | 4 bậc nhưng ít dùng | `e0` phẳng cho bảng, `e1` card, `e2` popover, `e3` modal + **viền sáng 1px** ở dark để tách tầng |
| **Typography** | 12/13/14 rời rạc, nhiều nhãn 12px | Giữ sàn 12px nhưng **tăng tương phản cấp bậc**: display 40–56px, title 24, heading 18, body 15, caption 12. **Body 15px** (thay 14) cho dễ đọc |
| **Icon** | 14/16 phần lớn, nhỏ | **18/20/24** theo ngữ cảnh; icon-only button ≥ 20px; **cấm 14px cho icon tương tác** |
| **Mật độ** | dày, chữ nhỏ | Nhịp 4/8: padding card 20–24, gap field 16, section 64–80; **`/admin` density 36/44** qua `DataTable` |
| **Motion** | gần như không có | `150ms` hover · `200ms` tab/popover · `250ms` sheet · `320ms` modal; trang vào bằng fade+8px; `prefers-reduced-motion` tôn trọng |
| **Màu** | teal + xám slate + nhiều màu status | Giữ teal `#00687A`; **xám chuyển sang hệ token** (không dùng `slate-*`); status dùng **nền tint 8–12%** + chữ đậm, không dùng nền đặc chói |
| **Dark theme** | vỡ (palette thô) | Phân cấp bằng **viền `line` + surface tăng 1 bậc**, không tăng shadow; mọi component **phải** dùng token |

**Nguyên tắc bắt buộc:** mọi thay đổi thị giác đi qua token + primitive. **Cấm** thêm hex, cấm thêm class palette thô — có **gate grep** chặn ở CI.

---

## 4. Liên kết tính năng (chữa "rời rạc")

| # | Vấn đề | Cách nối |
|---|---|---|
| 1 | Settings nằm 5 nơi | **Một** `settingsStore` (Zustand) nạp qua `settingsService` (A8 đã có) + `subscribeSettings()` realtime; **mọi** màn đọc từ đó, xoá hết prop-drilling `siteContent`/`pricingConfig` và xoá 10 dòng localStorage ở `App.tsx` |
| 2 | `/quote` → giỏ → checkout không cùng mô hình | `CartItem` mang **đủ tham số tính giá** (volume, infill, layer, printer, material, discount) ⇒ checkout **kiểm tra lại giá** bằng engine, hiển thị chênh lệch nếu có |
| 3 | Trạng thái đơn chỉ có 1 chiều | Một `orderLifecycle` dùng chung cho `/order-success`, `/tracking`, `/orders`, `/admin` (một nguồn trạng thái, một timeline) |
| 4 | Tài sản số không nối đơn hàng | Nối `order_files` ⇒ `AssetLibraryView` tải được bằng `createSignedUrl` (DoD #19) |
| 5 | Không có luồng "bắt đầu" cho người mới | **Onboarding 3 bước** ở `/`: tải file → xem giá → đặt; empty-state toàn hệ thống có CTA trỏ đúng nơi nhập dữ liệu |
| 6 | `/admin` 15 panel không có IA | **IA mới 5 nhóm** (Tổng quan · Vận hành · Danh mục & Giá · Khách & Đối tác · Cấu hình) + deep-link sub-tab + `DataTable` chung + 4 trạng thái |
| 7 | Không thấy "hệ thống đang thế nào" | `/admin` **Health card**: số sản phẩm/vật liệu/máy in/đơn, cái nào rỗng thì **cảnh báo + nút nhập** |

---

## 5. Performance

| # | Việc | Bằng chứng/đích |
|---|---|---|
| 1 | Ảnh: `loading="lazy"` + `width/height` + `decoding="async"` | 1/23 → 23/23; chống layout shift |
| 2 | three.js **không** ở first paint (đã đúng) — giữ + kiểm bằng gate | critical path ≤ 250 KB gzip |
| 3 | CSS 140 KB → ≤ 60 KB | bỏ palette thô + bỏ utility chết; `@source` chỉ quét `src`/`index.html` |
| 4 | Bỏ `localStorage` shadow, giảm 21 `setTimeout/setInterval` xuống mức cần thiết | ít re-render, ít rác |
| 5 | Rà re-render `/quote` (viewer 1.885 LOC, `setFps` mỗi 500ms) | thuộc Phase 5 (A5) — giữ trong plan cũ |
| 6 | Đo bằng Playwright: LCP/TBT trên 5 route chính | ghi baseline, không hồi quy |

---

## 6. Năm track thi công

### Track A — Theme correctness (P0, chặn mọi thứ) — **A13**
Đổi 5.619 class palette thô + 1.630 `white/black` sang token/`dark:` theo **bảng map có kiểm tương phản**; xoá 10 dòng `localStorage` ở `App.tsx`; xoá toàn bộ fallback chuỗi bịa trong `.tsx` (17 file).
**Gate:** `grep` palette thô = 0 (trừ allowlist có ghi chú) · `check-contrast` RC=0 · Playwright **ma trận theme** (16 route × light/dark) không còn phần tử sáng trên nền tối · 0 console error.

### Track B — Design language + primitives áp dụng thật — **A14 ∥ A15**
- **A14**: bổ sung token còn thiếu (`--radius-card/control/pill`, `--text-body`, motion, surface 3 tầng, `Icon` size chuẩn) + nâng cấp primitive (Button/Card/Field/DataTable/StatCard/EmptyState/Skeleton/Toast) theo §3.
- **A15**: **chuyển trang sang primitive** theo thứ tự `auth → cart/checkout → storefront → quote → admin`; xoá 26 modal tự viết, 10 `<table>`, 6 `window.confirm`, bù `htmlFor` cho 167 input.
**Gate:** adoption ≥ 60 file · 0 `<table>`/`fixed inset-0`/`window.confirm` trong đích · Playwright a11y (mọi control có tên) + keyboard (Tab/Esc/focus trap) PASS.

### Track C — Liên kết tính năng — **A16 ∥ A17**
- **A16**: `settingsStore` + bỏ prop-drilling + nối `order_files`/`createSignedUrl` + `orderLifecycle` dùng chung.
- **A17**: IA mới cho `/admin` + `DataTable` + 4 trạng thái + Health card + onboarding 3 bước ở `/`.
**Gate:** Playwright luồng end-to-end (khách: `/` → `/quote` → giỏ → checkout → success → tracking; admin: sửa giá ship → storefront đổi theo **sau reload**) · mọi panel có 4 trạng thái.

### Track D — Performance — **A18**
Ảnh lazy/sized, giảm CSS, gỡ suppression, đo lại bằng Playwright.
**Gate:** critical path ≤ 250 KB gzip · CSS ≤ 60 KB · 23/23 ảnh lazy · không hồi quy LCP.

### Track E — Kiểm thử tự động (nền tảng) — **A0**
Dựng `tests/` Playwright (đã chạy được: **Edge trên Windows**, xem §8) thành gate chính thức: route sweep, theme matrix, a11y, 390px overflow, console-error budget, screenshot diff.

**Thứ tự bắt buộc:** A → E (hạ tầng test) → B → C → D. Lý do: sửa theme trước vì đó là lỗi thấy được; test trước khi redesign để **chứng minh không hồi quy**; redesign trên nền theme đúng mới không phải làm hai lần.

---

## 7. Tiêu chí nghiệm thu (đo được, không cảm tính)

1. **Theme:** 16 route × 2 theme — không phần tử nào có nền sáng trên route tối (kiểm bằng Playwright: quét `backgroundColor` của mọi phần tử có text, phát hiện độ sáng > 0.8 trên route dark).
2. **Hiện đại:** 0 palette thô; radius/typography/nhịp theo §3; motion có mặt ở ≥ 8 tương tác chính; ảnh chụp trước/sau cho 8 màn.
3. **Liên kết:** đổi một setting ở `/admin` → **storefront đổi ngay sau reload** (1 luồng test thật); mã giảm giá giữ đúng từ cart → checkout → hoá đơn; tải được file CAD sau khi mua.
4. **`/admin`:** 0 `<table>` tự viết, 0 modal tự viết, 100% input có nhãn, mọi bảng có sort/phân trang/chọn nhiều, mọi panel có 4 trạng thái, Health card báo rõ cái gì rỗng.
5. **A11y:** mọi control có tên truy cập; focus nhìn thấy; vùng bấm ≥44×44 (hết nợ #30); keyboard đi hết luồng.
6. **Perf:** các đích ở §5.
7. **Không bịa:** 0 chuỗi số liệu bịa trong `.tsx`; setting rỗng ⇒ hiện "chưa cấu hình".

---

## 8. Hạ tầng kiểm thử đã sẵn sàng (từ phiên này)

- **Playwright chạy được:** WSL không cài được lib chromium (không có `sudo` không mật khẩu) ⇒ dùng **Edge trên Windows** qua `channel: 'msedge'`; đã kiểm chứng với server WSL ở `http://localhost:3000`.
- **Đã có sẵn 3 script** (đặt ngoài repo): quét 16 route (`pw-sweep.cjs`), tương tác (`pw-interact.cjs`), chẩn đoán tràn ngang/redirect/console (`pw-diag.cjs`).
- **Kết quả lần chạy đầu (đã dùng để viết plan này):** 16/16 route HTTP 200, **0 page error**, không có Vite overlay; theme override qua `localStorage` **4/4 OK**; icon-only thiếu tên = **0**; **phát hiện:** tràn ngang 390px trên **mọi route** (Header: doc 568 vs 390), nav dùng `<button>` thay vì `<a href>` (chỉ `/auth/login` + `/auth/register` là link thật), `/explore` **thiếu trạng thái rỗng**, React warning "unique key" ở `/explore` + `/auth/register`, `console.error` "Chưa cấu hình công thức giá" xuất hiện cả ở trang không cần giá.

---

## 9. Rủi ro

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| Đổi 5.619 class ⇒ lệch thị giác diện rộng | **Cao** | Làm theo **bảng map + gate tương phản**; Playwright **screenshot diff** theo từng nhóm thư mục; commit theo nhóm để revert |
| Redesign làm vỡ luồng đang chạy | Cao | Track E (test) chạy **trước** Track B; test luồng end-to-end trước khi redesign |
| Không xem được `/admin` để review (chưa có tài khoản admin) | Trung bình | Cần chủ dự án tạo tài khoản + cấp `role='admin'` (đoạn SQL đã đưa) **trước khi** Track B/C chạm `/admin` |
| Migration bản vá chưa dán lại ⇒ settings vẫn không lưu | Trung bình | Dán lại `apply_all_manual.sql`; `a8-db-probe.mjs` phải RC=0 |
| "Hiện đại" là cảm tính | Trung bình | Biến thành tiêu chí đo được (§7) + ảnh trước/sau để duyệt |

---

## 10. Cần chủ dự án chốt

1. **Hướng thị giác ở §3** — đặc biệt: **card 16px / control 10px**, **body 15px** (thay 14), **icon tối thiểu 18px**, **status dùng nền tint thay vì nền đặc**. Đồng ý hay muốn giữ hiện trạng?
2. **Có cho phép đổi `00-overview.md` §2** (hướng thị giác) theo §3 không? (Luật `00` §6.4 yêu cầu cập nhật trước khi code.)
3. **Thứ tự:** A (theme) → E (test) → B (design) → C (liên kết) → D (perf). Hay muốn ưu tiên `/admin` trước?
4. **Track C mục 6 (IA mới `/admin` 5 nhóm)** — bạn duyệt IA mới chứ? (Đây là thay đổi điều hướng, ảnh hưởng thói quen dùng.)
5. **Tài khoản admin:** bạn tạo + cấp quyền khi nào? Không có thì không review được `/admin`.
6. **Dán lại migration** để settings hoạt động thật — làm luôn không?

---

## 11. Bằng chứng `/admin` (đã vào được, 2026-09-12) — vì sao nó tệ nhất

**Cách vào:** `/admin` **không** vào được bằng deep-link/F5 (xem §12), nhưng **vào được** bằng bấm menu trong app. Ảnh chụp thật: `C:\Users\chith\AppData\Local\Temp\pwtest\admin\admin-soft.png` (1600×1000), `dark=true`, `h1="Bảng Điều Khiển Trung Tâm"`, 4.024 ký tự.

### 11.1 🔴 Số liệu bịa — vi phạm `data-honesty.md` nặng nhất toàn app

**DB đang RỖNG** (đã kiểm bằng secret key): `products` 0 · `materials` 0 · `printer_fleet` 0 · `accessories` 0 · `orders` 0 · `workshop_partners` 0 · `pricing_configs` 0. Chỉ `site_content` 1 · `pricing_global_settings` 1 · `app_settings` 1.

Nhưng dashboard hiển thị:
| Hiển thị | Thực tế |
|---|---|
| `TỶ LỆ SỬ DỤNG (FLEET UTILIZATION) 67.3%` `+5.4%` | không có máy in nào |
| `ĐƠN ĐANG CHẾ TÁC (IN PIPELINE) 6` + `98.4% SLA` | 0 đơn |
| `DOANH THU (THÁNG NÀY) 284.600.000 đ` `+24.8% MoM` | 0 đơn, 0 doanh thu |
| `CẢNH BÁO TỒN KHO 3 vật tư dưới định mức` | 0 vật tư |
| `KHẤU HAO MÁY & ĐIỆN NĂNG 62.612.000 đ` · `NHỰA/RESIN 108.148.000 đ` · `NHÂN CÔNG 51.228.000 đ` · `LỢI NHUẬN RÒNG 62.612.000 đ` | không có dữ liệu giá |
| `Mạng Lưới 3 Hub Vcube MES` (Hà Nội/Đà Nẵng/HCM, `Bambu X1C, Creativity K1, Elegoo 12K`) | 0 hub, 0 máy |
| `Nhựa Resin 8K Siêu Nét sắp cạn tại Trạm Đà Nẵng — Khô còn 2.1kg` | 0 vật tư |

⇒ `/admin` hiện là **dashboard số liệu kinh doanh bịa**. Đây là lý do không thể "nghiệm thu" nó trước khi Track A xong.

### 11.2 🔴 Dark theme KHÔNG hoạt động trong `/admin`
`documentElement` có `class="dark"` (ThemeProvider đúng), nhưng nội dung admin hardcode sáng: sidebar navy tối + **thân trang trắng** + heading xám nhạt. Nguyên nhân đúng như đo ở `10` §1: `admin/**` có **1.471** class palette thô + **317** `bg-white`/`text-white`/`bg-black` ⇒ `.dark` không chạm tới.

### 11.3 🔴 Heading gần như KHÔNG ĐỌC ĐƯỢC (fail AA)
Trong ảnh, các tiêu đề `Tổng Quan Điều Hành Hệ Sinh Thái VCUBE`, `Biểu Đồ Phân Bổ Cơ Cấu Chi Phí & Định Giá Inkiri`, `Bảng Điều Khiển Trung Tâm` render **xám rất nhạt trên nền trắng** — không phải vấn đề thẩm mỹ mà là **tương phản**. Cùng lớp lỗi với `text-slate-300/400` dùng làm màu chữ.

### 11.4 🔴 Biểu đồ dùng "cầu vồng" ngoài token
Thanh cơ cấu chi phí dùng 4 màu bão hoà `#2563EB` / `#16A34A` / `#9333EA` / `#EA580C` — không màu nào thuộc `tokens.md`. Cần bảng màu biểu đồ theo token (và `check-contrast` phải phủ).

### 11.5 🟠 IA lộ jargon nội bộ ra UI
Sidebar ghi thẳng `GROUP 0: TỔNG QUAN ĐIỀU HÀNH` · `GROUP 1: QUẢN LÝ XƯỞNG IN (MES HUBS)` · `GROUP 2: QUẢN LÝ DESIGNER` · `GROUP 3: QUẢN LÝ KHÁCH HÀNG` · `GROUP 4: CẤU HÌNH GIÁ INKIRI` · `GROUP 5: VẬN HÀNH SẢN XUẤT (MES)`. Ô tìm kiếm ghi `Tìm nhanh (Group 0–5, mạng, kho)`.
⇒ "GROUP n" là **cách chia việc refactor của dev**, không phải ngôn ngữ người dùng — đúng yêu cầu #2 của chủ dự án ("khó tiếp cận người dùng").

### 11.6 🟠 Vẫn còn "Đồng Bộ DB"
Top bar có nút `Đồng Bộ DB` + `Báo Giá BOM` + `Xem Cửa Hàng`. Nhưng A10 đã **bỏ** cơ chế tự nạp fixture (`seedInitialProductsIfEmpty` không ghi gì) ⇒ nút này giờ **không có gì để đồng bộ**. Cần đổi thành "Trạng thái dữ liệu" (chỉ đọc) hoặc bỏ.

### 11.7 🟠 Thẻ KPI phẳng, thiếu chiều sâu
4 thẻ KPI là `bg-white` + viền xám mảnh, icon nhỏ ở góc — đúng anti-pattern *"Flat design without depth"*. Cần: surface 3 tầng, icon ≥20px, delta có mũi tên + nhãn (primitive `StatCard` đã có sẵn nhưng **không được dùng**).

---

## 12. 🔴 Bug chặn review `/admin`: không có session Supabase + fallback xác thực giả

### 12.1 Triệu chứng (đo bằng Playwright, Edge)
| Cách vào `/admin` | Kết quả |
|---|---|
| Bấm menu trong app (SPA) | ✅ vào được |
| **F5 reload trên `/admin`** | ❌ bị đẩy về `/auth/login` |
| **Mở tab mới `/admin`** (deep-link) | ❌ bị đẩy về `/auth/login` |
| `/designer` deep-link | ❌ bị đẩy về `/auth/login` |
| `/lab` deep-link | ✅ vào (hiện **chưa có guard** — thuộc A7) |

### 12.2 Nguyên nhân gốc
`src/frontend/context/AuthContext.tsx:215-232`: khi `signInWithPassword` **lỗi**, code **âm thầm rơi về `DEMO_ACCOUNTS`** (hardcode) và chấp nhận mật khẩu `'123456'` **hoặc** `'Password123!@'`, tạo profile giả `uid: 'demo-<role>'` + ghi `localStorage['vcube_active_local_user']` — **không có session Supabase**.
⇒ (1) **mật khẩu hardcode trong bundle cấp được giao diện admin cho bất kỳ ai**; (2) UI hiện "đã đăng nhập" dù không có session ⇒ F5/deep-link mất đăng nhập; (3) **che mất lỗi mật khẩu sai**.
`client.ts` đã đúng (`persistSession: true`) ⇒ session thật sẽ lưu nếu đi đúng đường.

### 12.3 Tài khoản (đã sẵn sàng)
| Email | Mật khẩu | role trong `user_profiles` |
|---|---|---|
| `admin.forge@vcube.vn` | `123456` | **admin** |
| `chithanhso10@gmail.com` | `123456` | **admin** |
| `creator.lethang@vcube.vn` | `123456` | designer |

`user_profiles` trước đó **0 dòng** ⇒ **không ai là admin**; đã cấp 3 vai trò trên. 2 tài khoản (`admin.forge@`, `creator.lethang@`) **không** khớp mật khẩu `123456` ⇒ đã đặt lại; cả 3 nay **đăng nhập thật OK** (kiểm bằng publishable key, có `session=true`, đọc đúng `role` từ DB).

**Trạng thái:** đã giao **A20** bịt lỗ hổng + bỏ "bóng" đăng nhập từ `localStorage` + cho `RoleGuard` chờ `loading` + red-test riêng (sai mật khẩu ⇒ KHÔNG vào được).
