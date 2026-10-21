<!-- doc-meta: status=active; verified=2026-10-20; owner=thanh -->
# VCUBE Design Language v3 — "Soft Studio"

> **Hợp đồng thị giác duy nhất cho đợt UI v3.** Mọi agent (W2–W6) đọc file này TRƯỚC khi
> sửa bất kỳ `.tsx` nào. Không tự sáng tạo palette/radius/shadow/bán kính ngoài bảng dưới.
> Nguồn token thật: `src/index.css` (khối `@theme static`). Đo tương phản:
> `node scripts/check-contrast.mjs` + `node scripts/check-contrast-combos.mjs`.
>
> **Trạng thái: LOCKED (W1, 2026-10-20).** Thay đổi token/recipe chỉ được thực hiện bởi
> foundation hoặc integrator (W5) và phải cập nhật cả file này + 2 script contrast.
>
> Thay thế v2 "Warm Studio" (`docs/tasks/ui-redesign/DESIGN-LANGUAGE.md` — giữ để tra cứu
> lịch sử, **không dùng làm chuẩn**).

---

## 0. Quyết định nền đã duyệt

| ID | Quyết định | Nội dung | Hệ quả bắt buộc |
|---|---|---|---|
| **D0** | Ngôn ngữ UI | **Tiếng Việt duy nhất** | Không có chuỗi EN hiển thị. `LanguageContext` khoá `vi`; `t()` **bỏ qua** `fallbackEn`. Thuật ngữ kỹ thuật giữ nguyên: CAD, STL, STEP, 3MF, WebGL, GPU, SKU, KYC, VAT, MES, BOM, API, RLS. |
| **D1** | Hướng thị giác | **Soft Studio adaptation** (không clone Prestiva) | Cream/sage canvas, bo lớn hơn, shadow ấm; vẫn giữ chất công nghiệp, mono cho số liệu. |
| **D2** | Shell/IA | **Hybrid**: storefront giữ top nav; console dùng sidebar | `Header.tsx` = storefront top nav; `AppShell` + `SideNav` = console. **Không** đổi route/slug/nhãn nav (D6). |
| **D3** | Accent | **CTA đen giữ nguyên + coral chỉ cho brand mark** | `--color-primary` vẫn `#1C1917` cho CTA/link/focus. `--color-brand` `#E8624A` **chỉ** ô logo/mark/badge — không CTA, không chữ trên nền sáng. |

Bổ sung từ PLAN v3: **D4 no-dep** (không thêm package/font/animation lib), **D5 UI-only**
(feature/data freeze), **D6 không đổi IA/route**, **D7 3D viewport giữ nền tối `#091426`**.

---

## 1. Palette

Nguyên tắc: **token theo vai trò**, không theo màu. Light-only. Không gradient.
Phân cấp bề mặt bằng **viền hairline** hoặc **shadow ấm**, không bằng độ sáng.

### 1.1 Bề mặt & đường

| Token | Hex | Vai trò | Tương phản đo được |
|---|---|---|---|
| `--color-canvas` | `#F6F7EF` | nền trang (sage/cream rất nhạt) | `fg` **16.21** · `fg-muted` **7.07** · `fg-subtle` **4.67** |
| `--color-surface` | `#FFFDF9` | card, panel, bảng, modal | `fg` **17.21** · `fg-muted` **7.51** · `fg-subtle` **4.95** |
| `--color-surface-raised` | `#FFFDF9` | bề mặt nổi (light = surface) | như `surface` |
| `--color-surface-muted` | `#F5F4EC` | input bg, segmented track, dải xen kẽ | `fg` **15.85** · `fg-muted` **6.92** · `fg-subtle` **4.56** |
| `--color-surface-inverse` | `#1C1917` | panel tối (footer storefront, 3D HUD) | `on-inverse` **16.74** |
| `--color-surface-inverse-raised` | `#292524` | panel tối nổi | `accent` **9.67** |
| `--color-on-inverse` | `#FAFAF9` | chữ trên nền tối | **16.74** |
| `--color-line` | `#E7E3D6` | viền **mạnh**: band/panel lớn, modal, popover, toolbar, hover card flat (**trang trí**) | 1.19 trên canvas — hợp lệ (không phải viền control) |
| `--color-line-subtle` | `#F0EDE3` | viền **card/panel/bảng mặc định** (Card flat, DataTable, EmptyState, KeyValue), hairline trong bảng, divider | — |
| `--color-line-control` | `#8A8078` | viền input/select/checkbox | **3.80** surface · **3.58** canvas · **3.50** muted ✓ |

> `--color-line-control` **không** đổi so với v2: đây là màu ấm gần nhất đạt ≥3:1
> (WCAG 1.4.11). Muốn làm nhạt hơn **phải** đo lại và cập nhật ledger.

### 1.2 Chữ

| Token | Hex | Vai trò | Tương phản |
|---|---|---|---|
| `--color-fg` | `#1C1917` | chữ chính | **16.21** canvas · **17.21** surface ✓ |
| `--color-fg-muted` | `#57534E` | chữ phụ, mô tả | **7.07** / **7.51** ✓ |
| `--color-fg-subtle` | `#746E68` | metadata, placeholder | **4.67** canvas · **4.95** surface · **4.56** muted ✓ |

**Không dùng `text-fg-subtle`** trên: `line-subtle` (4.30), `primary-tint` (4.37),
`info-tint` (4.34), 4 tile pastel (4.29–4.44) — dùng `text-fg-muted`.

### 1.3 Nhấn & trạng thái

| Token | Hex | Vai trò |
|---|---|---|
| `--color-primary` | `#1C1917` | **CTA, link, focus ring** (D3) |
| `--color-primary-hover` | `#292524` | hover CTA |
| `--color-primary-fg` | `#FFFFFF` | chữ trên CTA (17.49) |
| `--color-brand` | `#E8624A` | **CHỈ brand mark**: ô logo chữ V, mark, badge thương hiệu |
| `--color-accent` | `#57DFFE` | nhấn kỹ thuật trên nền tối (HUD 3D), giữ |
| `--color-positive` | `#047857` | thành công (5.40 trên surface) |
| `--color-warning` | `#B45309` | cảnh báo (4.94 trên surface; **4.66** trên canvas — sát ngưỡng) |
| `--color-warning-strong` | `#D97706` | sao đánh giá — đồ hoạ/chữ ≥18px (3.14) |
| `--color-danger` | `#BE123C` | lỗi, phá huỷ (6.19) |
| `--color-info` | `#00687A` | thông tin/đang xử lý (teal, 6.34) |
| `--color-ring` | `#1C1917` | focus ring 2px |

**Coral (`--color-brand`) — 3 luật cứng:**

1. Chỉ dùng làm **nền mark/đồ hoạ** (ô logo, chấm brand, badge thương hiệu).
2. Chữ trên coral **phải** là `text-fg` (**5.23**). Không bao giờ `text-white` trên coral (3.35).
3. Coral **không** làm màu chữ trên nền sáng (3.10–3.29) và **không** làm nền CTA.

### 1.4 Tint trạng thái (giữ nguyên hệ v2)

Luật bất di: **nền tint + chữ màu đặc**. Không dùng `bg-emerald-50/100` trần.

| Token | Hex | Chữ đặc | Tương phản |
|---|---|---|---|
| `--color-primary-tint` | `#F0EFEB` | `--color-primary` | **15.20** ✓ |
| `--color-positive-tint` | `#ECFDF5` | `--color-positive` | **5.21** ✓ |
| `--color-warning-tint` | `#FFFBEB` | `--color-warning` | **4.84** ✓ |
| `--color-danger-tint` | `#FFF1F2` | `--color-danger` | **5.72** ✓ |
| `--color-info-tint` | `#E6F0F2` | `--color-info` | **5.55** ✓ |

### 1.5 Tile pastel (MỚI ở v3) — category tile / hero card

Không phải tint trạng thái — **không** mang nghĩa thành công/lỗi. Chỉ dùng cho tile
phân loại, hero card, empty-state trang trí.

| Token | Hex | `text-fg` | `text-fg-muted` | `text-fg-subtle` |
|---|---|---|---|---|
| `--color-tile-mint` | `#E7F1E4` | 15.07 ✓ | 6.58 ✓ | 4.34 ✗ |
| `--color-tile-lilac` | `#EFEBF8` | 14.91 ✓ | 6.51 ✓ | 4.29 ✗ |
| `--color-tile-rose` | `#FCEBE5` | 15.12 ✓ | 6.60 ✓ | 4.35 ✗ |
| `--color-tile-amber` | `#FAF0DA` | 15.44 ✓ | 6.74 ✓ | 4.44 ✗ |

**Luật:** trên tile pastel chỉ dùng `text-fg` hoặc `text-fg-muted`. Không `text-fg-subtle`
(gate `check-contrast-combos` có 4 luật chặn). Không đặt icon trắng trên pastel.

---

## 2. Hình khối

### 2.1 Radius

| Token | Giá trị | Utility | Dùng cho |
|---|---|---|---|
| `--radius-sm` | **8px** | `rounded-sm` | chip, tag, ô vuông ≤ 24px |
| `--radius-md` | **12px** | `rounded-md` | **nút/CTA, input, select, toolbar** — control KHÔNG pill |
| `--radius-lg` | **20px** | `rounded-lg` | **card, bảng, viewport 3D** |
| `--radius-xl` | **28px** | `rounded-xl` | panel/band lớn, modal-card lớn |
| `--radius-modal` | **24px** | `rounded-modal` | modal, sheet |
| `--radius-full` | 9999px | `rounded-full` | avatar, chấm, pill đếm, badge, **nav pill / search pill** |

**Pill chỉ cho 3 chỗ:** nav item, ô tìm kiếm, chip. CTA và form control **luôn 12px**
(`Button shape="rounded"` mặc định).

> **Bẫy A19 (quan trọng hơn v2 vì `--radius-lg` đã là 20px):** ô vuông 20–60px dùng
> `rounded-lg` sẽ gần tròn. Với `size-12` (48px) → dùng `rounded-md` (12px).
> Assert `borderRadius / (min(w,h)/2) < 1`. Đã sửa: `EmptyState` icon tile,
> `NotFoundView`, `RoleGuard`, `CanvasErrorBoundary`. `PageSkeleton` `size-16` (64px)
> giữ `rounded-lg` (20/32 = 0.63 — chấp nhận).

### 2.2 Elevation

| Token | Giá trị | Dùng cho |
|---|---|---|
| `--shadow-e0` | `none` | card/panel trong luồng (mặc định `Card variant="flat"`) |
| `--shadow-soft` | `0 1px 2px rgb(92 74 51 / .05), 0 10px 24px -14px rgb(92 74 51 / .18)` | **storefront card soft, nav pill active, toast, FAB** — bóng ấm, tán rộng, rất nhẹ |
| `--shadow-e1` | `0 1px 2px rgb(28 25 23 / .05), 0 1px 1px rgb(28 25 23 / .04)` | card nổi/`flat` hover |
| `--shadow-e2` | `0 2px 8px rgb(28 25 23 / .08), 0 1px 2px rgb(28 25 23 / .04)` | popover, dropdown |
| `--shadow-e3` | `0 12px 32px rgb(28 25 23 / .16), 0 2px 8px rgb(28 25 23 / .08)` | modal, sheet |

Console giữ **hairline + e0/e1**; không "airy hoá" bằng shadow-soft tràn lan.

### 2.3 Spacing & typography — KHÔNG đổi

`--spacing-section 32 · --spacing-block 16 · --spacing-label 4`. Font giữ
**Be Vietnam Pro + JetBrains Mono** (D4: không thêm font). Thang chữ giữ 12/13/14/16/20/24/30/38.
Wordmark serif chỉ qua SVG/Georgia nếu cần — v3 **không** dùng serif trong chrome.
Số liệu/ID/tiền: `font-mono tabular-nums`.

### 2.4 Motion

- Hover màu: `transition-colors duration-200`.
- Card soft hover: `hover:shadow-e2` (không đổi viền); Card flat hover: `hover:shadow-e1`.
- Card `interactive`: **`transition-shadow duration-200`** — chỉ animate shadow, KHÔNG
  `transition-all` (animate cả layout) và không `duration-300` (ngoài thang token 100/150/200/250/320).
- Nhấn: `active:scale-[0.97]`.
- Mọi animation/transition phải có `motion-reduce:*` hoặc nằm dưới media query toàn cục.

---

## 3. Recipe lớp — copy nguyên văn

### 3.1 Card / Panel

```txt
Card flat (MẶC ĐỊNH — console):  <Card variant="flat"> = rounded-lg border border-line-subtle bg-surface shadow-e0
Card soft (storefront v3):        <Card variant="soft"> = rounded-lg bg-surface shadow-soft (border-0)
Card soft interactive:            hover:shadow-e2  (KHÔNG thêm viền khi hover)
Card flat interactive:            hover:border-line hover:shadow-e1
Panel lớn (band):                 rounded-xl bg-surface shadow-soft p-6 sm:p-8
Divider trong:                    border-t border-line-subtle
```

Quy ước dùng:
- **Storefront** (Home, Explore, PDP, Personalize, Cart, Checkout, Auth, success): `variant="soft"`.
- **Console** (Admin, Lab/Workshop, Designer, Tool3D, tables): `variant="flat"` — density + hairline.
- Không trộn 2 loại card trong cùng một lưới.

### 3.2 Button

| Variant | Recipe |
|---|---|
| `primary` | `bg-primary text-primary-fg hover:bg-primary-hover shape=rounded h-10 px-4 text-sm font-semibold shadow-e1 active:scale-[0.97]` |
| `secondary` | `bg-surface text-fg border border-line-control hover:border-fg-subtle hover:bg-surface-muted rounded-md h-10 px-4 text-sm font-medium` |
| `ghost` | `text-fg-muted hover:text-fg hover:bg-surface-muted rounded-md h-10 px-3 text-sm font-medium` |
| `danger` | `bg-danger text-white hover:brightness-95 rounded-md h-10 px-4 text-sm font-semibold` |
| `danger-ghost` | `text-danger hover:bg-danger-tint rounded-md h-10 px-3 text-sm font-medium` |

`shape="pill"` **chỉ** cho nav/search/chip. CTA, form, toolbar giữ `rounded-md` 12px.
Icon trong nút `size-4` (16px); icon-only bắt buộc `aria-label`, vùng bấm ≥44×44 mobile.

### 3.3 Input / Select / Field

```txt
Input:   h-10 rounded-md border border-line-control bg-surface px-3 text-sm text-fg
         placeholder:text-fg-subtle focus:border-primary focus:ring-2 focus:ring-ring/20
Search:  như Input nhưng rounded-full (search pill — ngoại lệ duy nhất của control)
         Áp cho MỌI ô tìm kiếm: header storefront, drawer, và search sidebar console (`/admin`).
Select:  Input + appearance-none + chevron lucide size-4
Field:   gap-2; label text-sm font-medium text-fg; hint text-xs text-fg-subtle
         error: border-danger + text-danger + aria-invalid + aria-describedby
```

### 3.4 Badge trạng thái — giữ recipe v2

```txt
base: inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium
ok:   bg-positive-tint text-positive border-positive/20
warn: bg-warning-tint text-warning border-warning/20
bad:  bg-danger-tint text-danger border-danger/20
info: bg-info-tint text-info border-info/20
mute: bg-surface-muted text-fg-muted border-line
brand (chỉ nhãn thương hiệu): bg-brand text-fg border-transparent — KHÔNG dùng cho trạng thái
```

### 3.5 Table (DataTable) — console giữ nguyên density

```txt
wrapper: rounded-lg border border-line-subtle bg-surface overflow-hidden
thead:   bg-surface-muted text-xs uppercase tracking-wider text-fg-subtle
th:      h-10 px-4 text-left font-semibold
row:     h-11 border-t border-line-subtle hover:bg-surface-muted/60
cell:    px-4 text-sm text-fg
num:     text-right font-mono tabular-nums
empty:   render NGOÀI bảng (EmptyState)
```

### 3.6 Segmented control

```txt
track:  inline-flex items-center gap-1 rounded-full border border-line bg-surface-muted p-1
item:   rounded-full px-3 py-1.5 text-sm font-medium text-fg-muted
active: bg-surface text-fg shadow-soft font-semibold
```

### 3.7 Shell — HYBRID (D2)

**Storefront (`Header.tsx`)** — top nav, không sidebar:

```txt
header:  sticky top-0 z-header h-20 border-b border-line bg-canvas/90 backdrop-blur-md
inner:   mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8
brand:   ô 40px rounded-md bg-brand text-fg shadow-soft + wordmark text-xl font-bold tracking-tight
nav:     mục active = rounded-full bg-surface text-fg font-semibold shadow-soft
         mục thường = text-fg-muted hover:bg-surface-muted hover:text-fg
         nav wrapper = overflow-x-auto + class .nav-fade-right (affordance "còn mục nữa")
search:  h-10 rounded-full border border-line-control bg-surface (desktop ≥2xl; <2xl mở drawer)
CTA:     "Đăng ký" = bg-primary text-primary-fg rounded-md h-10 (KHÔNG pill, KHÔNG coral)
drawer:  mobile-nav-panel bg-surface; mục active = rounded-full bg-canvas shadow-soft
FAB:     fixed bottom-6 right-6 z-drawer — CHỈ storefront; ẩn ở /admin,/lab,/designer
         (CHROMELESS_SCREENS) và ở /products/:id,/personalize (FAB_HIDDEN_SCREENS, D-F)
```

**Console (`AppShell` + `SideNav` + `Topbar`)** — sidebar 240/64, topbar 56px:

```txt
app:      min-h-dvh bg-canvas
topbar:   h-14 border-b border-line bg-surface/90 backdrop-blur-md sticky top-0 z-header
sidebar:  w-60 border-r border-line; SideNav variant="pill" → nền bg-canvas
nav item: rounded-full min-h-11 px-3 text-sm font-medium text-fg-muted
active:   bg-surface text-fg font-semibold shadow-soft (pill trắng, KHÔNG vạch dọc)
content:  mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-6
```

> Console **cũ** (v2, vẫn là mặc định của primitive): `SideNav variant="tint"` → nền trắng,
> active `bg-primary-tint` + vạch dọc 2px. Không xoá đường này để W3 chuyển dần.

### 3.8 3D viewport chrome (D7 — không đổi trong wave UI)

```txt
frame:    relative rounded-lg (20px) border border-line bg-surface overflow-hidden
viewport: giữ nền tối #091426 — KHÔNG đổi scene.background/ánh sáng trong đợt này
HUD chip: absolute rounded-full border border-line bg-surface/90 px-3 py-1
          text-xs font-mono text-fg-muted backdrop-blur-sm
toolbar:  rounded-md border border-line bg-surface/95 shadow-e2 backdrop-blur-md p-1.5
toggle active: bg-primary text-primary-fg
```

### 3.9 EmptyState / Skeleton / Error

```txt
empty icon:  size-12 rounded-md bg-surface-muted text-fg-subtle (A19: KHÔNG rounded-lg)
empty title: text-base font-semibold text-fg
empty body:  text-sm text-fg-muted max-w-sm
skeleton:    bg-surface-muted animate-pulse rounded-md
error:       border-danger/20 bg-danger-tint text-danger + nút "Thử lại" variant secondary
```

### 3.10 Variant opt-in của primitive (API)

| Primitive | Prop mới | Mặc định | Giá trị |
|---|---|---|---|
| `Card` | `variant` | `flat` (giữ v2) | `flat` · `soft` |
| `Button` | `shape` | `rounded` (12px) | `rounded` · `pill` (nav/search/chip) |
| `SideNav` | `variant` | `tint` (giữ v2) | `tint` · `pill` |
| `Topbar` | `searchShape` | `default` | `default` · `pill` (áp `[&_input]:rounded-full`, không đổi 56px) |

**Không** đổi props/hành vi cũ. Mặc định của mọi primitive vẫn là look console v2 —
page agent chọn variant theo bề mặt, không sửa primitive.

---

## 4. Ngôn ngữ (D0)

1. UI **tiếng Việt**, câu đầy đủ, không viết tắt tuỳ tiện.
2. Giữ thuật ngữ (allowlist): `CAD, STL, STEP, STP, 3MF, OBJ, WebGL, GPU, API, SKU, KYC, VAT,
   MES, BOM, PII, RLS, SLA` + **`Email`** (loanword đã chuẩn hoá — D-E) + mã tiền tệ `VND` +
   tên vật liệu (`PLA, PETG, ABS, TPU, PA-CF, PVA, Resin`) + công nghệ in (`FDM, SLS, SLA`)
   + **tên phần mềm** (`PrusaSlicer`, `Bambu Studio`, `SolidWorks`, `Fusion`). **`File` → `Tệp`**.
3. Không dùng nhãn EN lẫn: `Pending, Verified, Live, Admin, Lab, Dashboard, Settings, Profile,
   Commercial, Creator, Customer, MES Hub` → dịch sang VI hoặc nhãn kỹ thuật có chú thích.
   (W1 đã sửa nhãn role trong `Header.tsx`: Quản trị / Tác giả 3D / Xưởng in / Khách hàng.)
4. **Không mass-codemod** 1.195 `isVi ?` trong một lượt. Chỉ sửa **chuỗi hiển thị** ở file
   đang sửa; nhánh `en` chết thì ghi nợ, dọn ở đợt code cleanup.
5. Format: ngày `dd/MM/yyyy`, tiền **`₫`** (D-B — `Intl` vi-VN + `formatCurrency`/`Money`;
   **không** đổi `format.ts`), số `vi-VN` (thập phân dấu phẩy: `0,20 mm`), `tabular-nums`
   cho bảng/KPI. Không viết "VNĐ" + "₫" cùng lúc.
6. `SEOHead`: title/description/OG locale `vi_VN`; không trộn English.

`LanguageContext` (W1) đã khoá: `language` luôn `'vi'`; `t()` bỏ qua `fallbackEn`; không có
đường đổi ngôn ngữ (không localStorage, không control).

### 4.1 Quyết định copy đã duyệt — D-A…D-F (Lead, 2026-10-20)

Đây là **luật bắt buộc** cho W2–W6; chi tiết từng chuỗi ở `COPY-GLOSSARY.md`. W1c đã áp cho
các file foundation (Header/App footer/RoleGuard/CanvasErrorBoundary/LanguageContext).

| ID | Chốt | Hệ quả code |
|---|---|---|
| **D-A** | **Việt hoá thuật ngữ in 3D**: `Slicer/Slicing → "cắt lớp"`, `Infill → "độ đặc"`, `Support → "vật liệu đỡ"`, `Layer → "lớp in"`, `Batch → "lô"`, `Hub → "trung tâm/đầu mối"`, `Studio → "xưởng thiết kế/không gian thiết kế"`, `Score → "điểm"`, `Watertight → "kín nước"`. **GIỮ** tên phần mềm (`PrusaSlicer`, `Bambu Studio`), tên vật liệu, acronym allowlist. | Page agent Việt hoá chuỗi trong file mình; foundation đã sửa: `Độ đặc Infill:` → `Độ đặc:`, `MES Hub` → `MES`, `VCUBE Lab` → `Xưởng in VCUBE`, `Designer Studio` → `Xưởng thiết kế` |
| **D-B** | **Giữ ký hiệu `₫`** (code hiện tại `formatCurrency`/`Money`). PLAN §5.5 và COPY-GLOSSARY sửa theo `₫`; **KHÔNG** đổi `format.ts`. | 0 dòng code phải sửa; UI-039 đóng |
| **D-C** | **Bỏ hẳn English sau `//`** trong eyebrow; nếu giữ `//` thì **phần sau phải tiếng Việt** (chỉ `VCUBE`/mã kỹ thuật được đứng trước). | W2/W3 sửa eyebrow ở page files; ví dụ `SẴN SÀNG SẢN XUẤT // RAPID FABRICATION` → `SẴN SÀNG SẢN XUẤT` |
| **D-D** | Wordmark **`Việt Nam`** (không `Vietnam`); nav label **`Quản trị hệ thống`** (thay `Quản Trị Admin`) và **`Xưởng thiết kế`** (thay `Studio Thiết Kế`) — **không đổi route/slug**. | Đã sửa `Header.tsx` (wordmark + aria + nav fallback) và dictionary `LanguageContext`; các nav khác giữ nguyên nhãn |
| **D-E** | **`Email`** giữ nguyên như loanword trong allowlist. | Không sửa chuỗi |
| **D-F** | **Ẩn FAB** trên route `product_detail` và `personalize` (2 màn có bottom-bar cố định) — không đổi route, không đổi bottom-bar. | `src/App.tsx`: `FAB_HIDDEN_SCREENS = ['product_detail', 'personalize']`; UI-016 đóng |

---

## 5. Do / Don't

| DO | DON'T |
|---|---|
| Dùng `Card variant="soft"` cho storefront, `flat` cho console | Đổi mặc định của `Card`/`Button`/`SideNav` toàn app |
| Dùng `--color-brand` cho ô logo + chấm brand | Dùng coral làm CTA, link, chữ trên nền sáng |
| Dùng `text-fg-muted` trên tile/tint khi cần chữ phụ | Dùng `text-fg-subtle` trên pastel/tint/line-subtle |
| Pill cho nav + search + chip | Pill cho CTA, input form, toolbar, card |
| `shadow-soft` cho storefront card/nav toast | `shadow-soft` tràn lan trong console (giữ hairline) |
| Radius card 20, panel 28, modal 24, control 12 | `rounded-[Npx]` tuỳ hứng, hex trong `.tsx` |
| VI đầy đủ, giữ thuật ngữ kỹ thuật | Trộn "Admin"/"Settings"/"Pending" ra UI |
| 3D viewport giữ nền tối `#091426` | Đổi nền/ánh sáng 3D trong wave UI |
| Giữ density bảng 40–44px ở console | "Airy hoá" dashboard thành landing page |

**Ngoại lệ được phép:** màu swatch sản phẩm/vật liệu lấy từ DB (`style={{ backgroundColor }}`)
— đó là dữ liệu, không phải token.

---

## 6. Bảng chuyển đổi nhanh từ v2

| v2 | v3 |
|---|---|
| `rounded-full` trên CTA | `rounded-md` (12px) |
| `Card` mặc định flat ở storefront | `<Card variant="soft">` |
| nav active = gạch chân `border-b-2 border-primary` | nav active = `rounded-full bg-surface shadow-soft` |
| search `rounded-md` | `rounded-full` (search pill) |
| `shadow-e1/e2` cho card storefront | `shadow-soft` |
| icon tile 48px `rounded-lg` | `rounded-md` (bẫy A19) |
| `border-line-subtle` trên nền tối (footer) | `border-on-inverse/15` |
| nhãn EN (`Admin`, `Sign In`, `Get Quote`) | VI (`Quản trị`, `Đăng nhập`, `Báo giá ngay`) |
| teal/emerald trang trí | chỉ dùng ở vai trò trạng thái; trang trí dùng tile pastel |

---

## 7. Checklist tự kiểm trước khi bàn giao (page agent)

- [ ] Không có hex/`rgb()` mới trong `.tsx` (trừ swatch dữ liệu).
- [ ] Không có `text-[10px]` / `text-[11px]` (sàn 12px).
- [ ] Không `min-h-screen`/`h-screen` (dùng `dvh`).
- [ ] Card storefront dùng `variant="soft"`; console không đổi density.
- [ ] Không pill cho CTA/form; không coral cho CTA/chữ.
- [ ] Không `text-fg-subtle` trên pastel/tint/line-subtle.
- [ ] Không chuỗi EN hiển thị; aria-label cũng VI; eyebrow `//` chỉ có VI sau `//` (D-C).
- [ ] Thuật ngữ D-A đã Việt hoá (cắt lớp/độ đặc/vật liệu đỡ/lớp in/lô/trung tâm/xưởng thiết kế/điểm);
      chỉ giữ tên phần mềm + vật liệu + acronym allowlist (+ `Email`).
- [ ] Tiền dùng `₫` qua `formatCurrency`/`Money` — không nối tay `đ` (D-B).
- [ ] Đủ 4 state: loading / empty / error / success.
- [ ] Mobile 390: không tràn ngang, tap target ≥44px; 1440 không lệch baseline.
- [ ] `prefers-reduced-motion`: mọi animation tràn lan có `motion-reduce`.
- [ ] Không đổi logic: props, state, service call; không đổi route/slug/nhãn nav.

---

## 8. Gate

| Gate | Lệnh | Điều kiện |
|---|---|---|
| Typecheck | `npm run lint` | 0 lỗi |
| Build | `npm run build` | PASS |
| Contrast token | `node scripts/check-contrast.mjs` | **0 unexpected fail** (expected non-pass có chú thích) |
| Contrast combos | `node scripts/check-contrast-combos.mjs` | 0 tổ hợp class < 4.5, 0 `token-drift` |
| Repo check | `npm run check` | không hồi quy baseline |

Bằng chứng v3 (W1, 2026-10-20): `npm run lint` PASS · `npm run build` PASS ·
contrast **56/70 pass + 14 expected, 0 unexpected fail** · combos **SẠCH (14 luật, 99 file)**.

Bằng chứng W1c (copy D-A…D-F, 2026-10-20): `npm run lint` PASS · `npm run build` PASS; đóng
UI-016/UI-030/UI-041 + nửa RoleGuard của UI-006; UI-027 để integrator.
