<!-- doc-meta: status=active; verified=2026-10-20; owner=thanh -->
# VCUBE Design Tokens (spec)

> ⚠️ **Hợp đồng thị giác hiện hành (từ 2026-10-20) là
> `docs/tasks/ui-redesign-v3/DESIGN-LANGUAGE.md` — palette v3 "Soft Studio"**
> (canvas kem `#F6F7EF`, surface `#FFFDF9`, CTA đen đá `#1C1917`, coral `#E8624A`
> **chỉ** cho brand mark, card radius 20 / panel 28 / modal 24 / control 12, `--shadow-soft` ấm).
> File này giữ vai trò spec kỹ thuật của token; nếu lệch, DESIGN-LANGUAGE v3 thắng.
> Bản v2 "Warm Studio" (`docs/tasks/ui-redesign/DESIGN-LANGUAGE.md`) chỉ còn giá trị lịch sử.

Nguồn sự thật duy nhất cho màu / typography / spacing / radius / elevation / motion.
Cài đặt: khối `@theme static` trong `src/index.css` (xem §9). Kiểm tương phản:
`node scripts/check-contrast.mjs` + `node scripts/check-contrast-combos.mjs`.
Hướng đã chốt: **light-only vĩnh viễn, primary đen đá (D1/D3); coral chỉ brand mark (v3 D3);
teal chỉ còn ở vai trò `info` (D-2)**.

---

## 1. Nguyên tắc

1. Tên token theo **vai trò**, không theo màu (`--color-primary`, không `--color-teal`)
   → token là hằng số, không còn theme thay đổi.
2. Không viết hex/`[Npx]` trong component. Mọi giá trị đi qua token.
3. Không dùng `#000`/`#FFF` tuyệt đối. Không truyền đạt trạng thái chỉ bằng màu.
4. Phân cấp surface bằng **viền** (console) hoặc **shadow ấm** (storefront soft), không
   bằng độ sáng.
5. Cặp `text`/`background` phải đạt: chữ thường ≥4.5:1, chữ lớn (≥24px hoặc ≥18.5px bold)
   ≥3:1, viền control & focus ring ≥3:1.
6. Mọi cột số dùng `font-variant-numeric: tabular-nums`.
7. Sàn chữ 12px. Không có ngoại lệ "nhãn 9px".
8. Pill **chỉ** cho nav / search / chip. Control và CTA luôn 12px (`--radius-md`).

---

## 2. Màu — light theme (v3)

| Token | Hex | Vai trò | Tương phản đo được |
|---|---|---|---|
| `--color-canvas` | `#F6F7EF` | nền trang (sage/cream rất nhạt) | `fg` = **16.21**, `fg-muted` = **7.07**, `fg-subtle` = **4.67** |
| `--color-surface` | `#FFFDF9` | card, panel, bảng | `fg` = **17.21**, `fg-muted` = **7.51**, `fg-subtle` = **4.95** |
| `--color-surface-raised` | `#FFFDF9` | bề mặt nổi (light = surface) | như `surface` |
| `--color-surface-muted` | `#F5F4EC` | input bg, segmented track, dải xen kẽ | `fg` = **15.85**, `fg-muted` = **6.92**, `fg-subtle` = **4.56** |
| `--color-surface-inverse` | `#1C1917` | panel tối giữa trang light (footer, HUD 3D) | `on-inverse` = **16.74** |
| `--color-surface-inverse-raised` | `#292524` | panel tối nổi | `accent` = **9.67** |
| `--color-on-inverse` | `#FAFAF9` | chữ trên `surface-inverse` | **16.74** |
| `--color-line` | `#E7E3D6` | viền **mạnh** (band/panel lớn, modal, popover, toolbar) — trang trí | 1.19 trên canvas — hợp lệ vì không phải viền control |
| `--color-line-subtle` | `#F0EDE3` | viền **card/panel/bảng mặc định**, hairline trong bảng, divider | — |
| `--color-line-control` | `#8A8078` | viền input/select/checkbox | **3.80** surface, **3.58** canvas, **3.50** muted ✓ |
| `--color-fg` | `#1C1917` | chữ chính | **16.21** ✓ |
| `--color-fg-muted` | `#57534E` | chữ phụ, mô tả | **7.07** ✓ |
| `--color-fg-subtle` | `#746E68` | metadata, placeholder, nhãn | **4.67** canvas / **4.56** muted ✓ |
| `--color-primary` | `#1C1917` | nút chính, link, trạng thái active | **16.21** ✓ |
| `--color-primary-hover` | `#292524` | hover | trắng trên nó = **15.17** ✓ |
| `--color-primary-fg` | `#FFFFFF` | chữ trên nền primary | **17.49** ✓ |
| `--color-brand` | `#E8624A` | **CHỈ brand mark** (ô logo V, mark, badge) | `fg` trên nó = **5.23**; coral trên surface = 3.29 (chỉ đồ hoạ) |
| `--color-accent` | `#57DFFE` | nhấn kỹ thuật trên nền tối | trên `surface-inverse` **11.15** |
| `--color-positive` | `#047857` | thành công, đạt chuẩn | **5.40** ✓ |
| `--color-warning` | `#B45309` | cảnh báo, cần review | **4.94** ✓ (4.66 trên canvas — sát ngưỡng) |
| `--color-warning-strong` | `#D97706` | sao đánh giá (đồ hoạ, ≥18px) | **3.14** — chỉ dùng ≥18px hoặc dạng icon |
| `--color-danger` | `#BE123C` | lỗi, hành động phá huỷ | **6.19** ✓ |
| `--color-info` | `#00687A` | thông tin / đang xử lý (**teal — D-2**) | **6.34** ✓ |
| `--color-ring` | `#1C1917` | focus ring 2px | 16.21 ✓ |

**Đã loại bỏ khỏi vai trò chữ:** `#94A3B8` (2.56), `#8590A6` (3.21 — chỉ làm viền),
`#7D7565`, `#8C857B`, `#A69C8A`, `#BCC7DE`, `#D8E3FB`, bảng "editorial"
`#F7F6F2`/`#1C1C1C`/`#D5CFC5`/`#E0DDD5`.

> **v3 (2026-10-20):** canvas/surface/muted/line chuyển sang hệ kem ấm; `--color-brand`
> coral được thêm nhưng **chỉ** dùng cho brand mark (D3). Canvas `#F6F7EF` là **giới hạn
> tối đa** — tối hơn sẽ làm `fg-subtle` rơi dưới 4.5 (xem cặp `fg-subtle-on-canvas` trong
> `check-contrast-combos.mjs`).

### 2.1 Tint cho thẻ trạng thái (không đổi so với v2)

Luật: **nền tint + chữ `<màu>` đặc** (`bg-warning-tint text-warning`) — thay cho
`bg-<màu>-50/100` tho. Mỗi tint phải đủ nhạt để màu đặc tương ứng đạt ≥ 4.5:1 khi làm chữ 12px.
Đo bằng số học WCAG 2.x trên gamma sRGB; cổng: `node scripts/check-contrast-combos.mjs`.

| Token | Hex | Chữ đặc | Tương phản |
|---|---|---|---|
| `--color-primary-tint` | `#F0EFEB` | `--color-primary` | **15.20:1** ✓ |
| `--color-positive-tint` | `#ECFDF5` | `--color-positive` | **5.21:1** ✓ |
| `--color-warning-tint` | `#FFFBEB` | `--color-warning` | **4.84:1** ✓ |
| `--color-danger-tint` | `#FFF1F2` | `--color-danger` | **5.72:1** ✓ |
| `--color-info-tint` | `#E6F0F2` | `--color-info` | **5.55:1** ✓ |

> `--color-fg-subtle` **fail** trên `primary-tint` (4.37), `info-tint` (4.34),
> `line-subtle` (4.30) và 4 tile pastel (4.29–4.44) ⇒ trên các nền đó dùng `--color-fg-muted`.

### 2.2 Tile pastel (MỚI ở v3)

Nền trang trí cho category tile / hero card — **không phải tint trạng thái**, không mang
nghĩa success/error/warning.

| Token | Hex | `text-fg` | `text-fg-muted` | `text-fg-subtle` |
|---|---|---|---|---|
| `--color-tile-mint` | `#E7F1E4` | 15.07 ✓ | 6.58 ✓ | 4.34 ✗ |
| `--color-tile-lilac` | `#EFEBF8` | 14.91 ✓ | 6.51 ✓ | 4.29 ✗ |
| `--color-tile-rose` | `#FCEBE5` | 15.12 ✓ | 6.60 ✓ | 4.35 ✗ |
| `--color-tile-amber` | `#FAF0DA` | 15.44 ✓ | 6.74 ✓ | 4.44 ✗ |

`check-contrast-combos.mjs` có 4 luật chặn `text-fg-subtle` + `bg-tile-*`.

---

## 3. Dark theme — ĐÃ XOÁ

Dark theme đã bị xoá hẳn; app **light-only vĩnh viễn**. Không còn khối `.dark`,
`@custom-variant dark`, `ThemeProvider`, `ThemeMode` hay `DARK_ROUTE_PREFIXES` trong mã nguồn.
Bề mặt tối duy nhất còn lại là `--color-surface-inverse` (footer storefront, HUD 3D) —
cố định, không phải theme.

## 3.1 Chrome — ĐÃ XOÁ (2026-10-19)

> **D-3 (v2)**: tier `--color-chrome*` đã bị xoá khỏi `src/index.css`; console
> (`/admin`, `/lab`, `/designer`) dùng shell sáng. Cam `#FF9736` không còn trong hệ thống;
> `tone`/`chrome` prop đã gỡ khỏi mọi primitive. Bảng chrome cũ chỉ còn giá trị lịch sử
> (xem git history nếu cần).

---

## 4. Typography

Font: **Be Vietnam Pro** (sans, thiết kế cho tiếng Việt — bắt buộc vì dấu tiếng Việt) +
**JetBrains Mono** (mã, thông số kỹ thuật, ID). `'Inter'` vẫn còn trong fallback stack của
`--font-sans` (`src/index.css`) nhưng không được tải qua Google Fonts; Be Vietnam Pro luôn thắng.
**v3 D4: không thêm font mới.** Wordmark serif (nếu cần) chỉ qua SVG/Georgia.

**Thang chữ có thật** khai báo thẳng vào namespace `--text-*` của Tailwind v4 trong
`src/index.css`, nên `text-sm`/`text-base`… là cỡ chữ thật:

| Token (Tailwind) | Size / line-height | Dùng cho |
|---|---|---|
| `--text-xs` | **12px** / 1.35 | nhãn, badge, metadata, caption — **SÀN, không nhỏ hơn** |
| `--text-sm` | **13px** / 1.45 | dòng phụ, mô tả, ô bảng, mặc định của `Card` |
| `--text-base` | **14px** / 1.5 | **chữ mặc định của sản phẩm** (body, `html` mặc định 14px) |
| `--text-lg` | **16px** / 1.4 | tiêu đề card/panel, `Section size="md"` |
| `--text-xl` | **20px** / 1.35 | tiêu đề trang (`PageHeader` `h1`) |
| `--text-2xl` | **24px** / 1.25 | số liệu KPI (`StatCard`) |
| `--text-3xl` | **30px** / 1.2 | tiêu đề khối lớn, số liệu hero |
| `--text-4xl` | **38px** / 1.15 | headline trang chủ |

Ngoài thang trên (class có sẵn, KHÔNG thêm biến mới): `.fluid-hero-heading` / `.fluid-h1` /
`.fluid-h2` cho hero responsive, `.font-mono` cho tên file / part ID / G-code.
`.font-mono` chỉ đặt `font-family` + `font-feature-settings`, **không** đặt cỡ chữ.

**Số liệu** (bảng, KPI, tiền, tiến độ) dùng `tabular-nums` — `@utility` khai tường minh
trong `src/index.css`.

Luật: tối đa **2 cỡ chữ trong một card**; nhãn uppercase chỉ cho micro-label và không nhỏ
hơn 12px; không dùng `font-serif` trong chrome/UI (serif thật = Georgia/Times, lệch ngôn
ngữ sans của app).

---

## 5. Spacing

Thang 4px: `0, 2, 4, 8, 12, 16, 24, 32, 40, 48, 64, 80, 96` (Tailwind v4 mặc định
`--spacing: 0.25rem` đã đủ — dùng `p-1..p-24`, không dùng `p-[13px]`).
Quy ước: padding trong card **16–20px** (`Card` map: sm 12 / md 16 / lg 20);
gutter trang 16px mobile / 24px tablet / 32–48px desktop; khoảng giữa nhãn và input trong
`Field` là **8px** (`gap-2`); giữa các field 16px.

**Nhịp dọc — token hoá:**

| Token | Giá trị | Utility | Dùng cho |
|---|---|---|---|
| `--spacing-section` | **32px** | `gap-section`, `space-y-section` | giữa hai section |
| `--spacing-block` | **16px** | `gap-block` | giữa các khối trong một section |
| `--spacing-label` | **4px** | `gap-label` | giữa nhãn và giá trị (`KeyValue`, `Section`) |

**Breakpoint:** 390 (kiểm tối thiểu), 640, 768, 1024, 1280, 1536.

---

## 6. Radius · Elevation · Z

**Radius — thang v3 `8 / 12 / 20 / 28 / modal 24 / full` (ĐỔI 2026-10-20):**

| Token | Giá trị | Utility | Dùng cho |
|---|---|---|---|
| `--radius-sm` | **8px** | `rounded-sm` | chip, tag, **ô vuông ≤ 24px** |
| `--radius-md` | **12px** | `rounded-md` | **nút/CTA**, input, select, toolbar, **ô vuông 25–40px** |
| `--radius-lg` | **20px** | `rounded-lg` | card, panel, bảng, viewport 3D |
| `--radius-xl` | **28px** | `rounded-xl` | band/panel lớn toàn chiều rộng (nhịp section) |
| `--radius-modal` | **24px** | `rounded-modal` | modal, sheet (không dùng `rounded-lg` cho modal) |
| `--radius-full` | 9999px | `rounded-full` | **avatar, chấm trạng thái, pill đếm, badge trạng thái, nav/search pill** |

> 🔴 **Nút KHÔNG phải pill.** `ui/Button` mặc định `shape="rounded"` = `rounded-md` (12px).
> `shape="pill"` chỉ cho nav/search/chip (v3 opt-in).
> **Bẫy A19 (nặng hơn v2 vì `--radius-lg` = 20px):** ô vuông 20–60px dùng `rounded-lg` sẽ
> gần tròn — với `w-7`…`w-12` dùng `rounded-md` (12px) hoặc `rounded-sm` (8px).
> Assert `borderRadius / (min(w,h)/2) < 1`. Đã sửa ở `EmptyState`, `NotFoundView`,
> `RoleGuard`, `CanvasErrorBoundary`.

**Elevation** (không dùng shadow làm tín hiệu duy nhất):

| Token | Giá trị | Dùng cho |
|---|---|---|
| `--shadow-e0` | `none` | **card/panel trong luồng** (mặc định `Card variant="flat"`) |
| `--shadow-soft` | `0 1px 2px rgb(92 74 51 / .05), 0 10px 24px -14px rgb(92 74 51 / .18)` | **storefront**: card soft, nav pill active, toast, FAB (ấm, tán rộng) |
| `--shadow-e1` | `0 1px 2px rgb(28 25 23 / .05), 0 1px 1px rgb(28 25 23 / .04)` | card nổi (`Card interactive` hover / flat hover) |
| `--shadow-e2` | `0 2px 8px rgb(28 25 23 / .08), 0 1px 2px rgb(28 25 23 / .04)` | popover, dropdown, card soft hover |
| `--shadow-e3` | `0 12px 32px rgb(28 25 23 / .16), 0 2px 8px rgb(28 25 23 / .08)` | modal, sheet |

> **v3:** thêm `--shadow-soft` hệ ấm (nâu `92 74 51`); e1–e3 giữ hệ stone `28 25 23`.
> Console vẫn lấy **viền hairline** làm tín hiệu phân tách chính.

**Glass:** `backdrop-blur` xuất hiện ở header/modal/HUD (13 vị trí / 8 file, snapshot
2026-09-24). **Chưa có** fallback `prefers-contrast: more` / `forced-colors: active` trong
`src/` → **nợ UI**: khi hai media query đó bật, glass phải chuyển sang nền đặc.

**Z-index:**

| Token | Giá trị | Dùng cho |
|---|---|---|
| `--z-sticky` | 10 | sticky trong nội dung (cột giá, header bảng) |
| `--z-panel` | 20 | chrome nổi trên canvas 3D |
| `--z-header` | 30 | header, announcement bar |
| `--z-drawer` | 40 | cart drawer, mobile nav, FAB hỗ trợ |
| `--z-modal` | 50 | modal, sheet |
| `--z-toast` | 60 | toast |

---

## 7. Motion

> **Tên token thật trong `src/index.css` là namespace `--transition-duration-*`** (không phải
> `--duration-*`): Tailwind v4 chỉ đọc `--transition-duration-*` để sinh utility `duration-*`.
> Chỉ `--ease-exit` được khai thêm; `--ease-out`/`--ease-in-out` **không** khai lại.

| Token | Giá trị | Dùng cho |
|---|---|---|
| `--transition-duration-instant` | 100ms | phản hồi nhấn, checkbox |
| `--transition-duration-fast` | 150ms | hover, tooltip, chip |
| `--transition-duration-base` | 200ms | dropdown, tab, mặc định |
| `--transition-duration-moderate` | 250ms | sheet, mở rộng disclosure |
| `--transition-duration-slow` | 320ms | modal |
| `--ease-out` (mặc định Tailwind) | `cubic-bezier(0.2, 0, 0, 1)` | xuất hiện |
| `--ease-in-out` (mặc định Tailwind) | `cubic-bezier(0.4, 0, 0.2, 1)` | chuyển trạng thái |
| `--ease-exit` | `cubic-bezier(0.3, 0, 1, 1)` | biến mất |

Luật: không animate từ `scale(0)` (bắt đầu ≥0.94); nhấn = `scale(0.97)`; không animate hành
động bàn phím hoặc tần suất cao (gõ, cuộn, kéo slider); không auto-rotate 3D quá 5 giây mà
không có nút dừng; `@media (prefers-reduced-motion: reduce)` → thay chuyển động bằng opacity,
tắt auto-rotate.

---

## 8. Component rules (bắt buộc)

**Button:** 6 biến thể — `primary` (nền `--color-primary` đen đá, chữ `--color-primary-fg`),
`accent` (nền `--color-accent`, chữ `--color-fg`, cho CTA trên bề mặt tối), `secondary`
(nền `--color-surface`, viền `--color-line-control`, chữ `--color-fg`), `ghost`, `danger`,
`danger-ghost`. **Bán kính `--radius-md` = 12px** (`shape="rounded"` mặc định;
`shape="pill"` chỉ nav/search/chip). Cao 40px (`size="md"`), 36px (`size="sm"`), 48px
(`size="lg"`); dưới `md` mọi nút ≥44px. Icon-only: `aria-label` bắt buộc, vùng bấm ≥44×44.
Icon trong nút **16px** (`size-4`).

**Field:** `<label for>` luôn tồn tại, đánh dấu **cả** field bắt buộc và không bắt buộc,
lỗi hiển thị inline + `aria-invalid` + `aria-describedby`, validate khi blur (không khi đang
gõ), `autocomplete` + `inputmode` đúng.

**Card/Panel:** `rounded-lg` (**20px**), hai dạng:
- `variant="flat"` (MẶC ĐỊNH, console): **viền `--color-line-subtle`** + `bg-surface` + `--shadow-e0`;
  `interactive` hover lên `--shadow-e1` (viền hover đậm lên `--color-line`).
  `--color-line` để dành cho panel **mạnh**: band, modal, popover, toolbar (wrapper DataTable cũng `line-subtle`).
- `variant="soft"` (storefront v3): **borderless** + `--shadow-soft`; `interactive` hover
  `--shadow-e2`.
Không dùng gradient nền. Phân tách chủ yếu bằng **viền nhạt** (console) hoặc **bóng ấm**
(storefront). Vẫn **cấm** viền trang trí quanh mọi khối: chỉ card/panel/bảng/ô nhập mới có viền.

**Icon:** icon **trong control** (nút, ô nhập, tab) = **16px** (`size-4`); icon **điều hướng
sidebar** = **18px**; icon trong **thẻ KPI / empty state** = **20–30px**. Thu nhỏ icon control
**không** được làm vùng bấm < 44×44 ở mobile.

**Table (admin):** density **40/44** (hàng cao **40–44px** ở mọi bề rộng), header sticky,
đường kẻ hàng `divide-line-subtle`, cột số căn phải + `tabular-nums`, giá trị không có hiển
thị `—` (không "N/A"), empty state render **ngoài** bảng, toolbar tối đa 5 hành động rồi vào
overflow menu, pagination ghi rõ khoảng ("21–40 / 142"), mọi hàng ≥44px trên mobile.

**Trạng thái:** mỗi màn phải có đủ 4 state — loading (skeleton đúng layout, không phải
spinner toàn trang), empty (icon + 1 câu nguyên nhân + 1 hành động), error (nêu nguyên nhân +
retry), success.

**3D viewport chrome (D7):** viewport giữ **nền tối `#091426`** (cửa sổ kỹ thuật); frame
ngoài `rounded-lg` + `border-line` + `bg-surface`. Chrome nổi dùng glass; top-left = tên part
+ chip `W×D×H mm` (tabular-nums); top-right = preset góc nhìn dạng segmented; bottom-left =
đơn vị + scale; bottom-right = zoom ±, fit, reset. **Không** đổi `scene.background`/ánh
sáng/material trong wave UI. **Không được có 2 control cùng `z` chồng nhau**.

---

## 9. Cài đặt trong `src/index.css`

> Bản thật trong repo dùng `@theme static` (bắt buộc: token nền tảng như `--radius-full`,
> `--shadow-e0..e3`, `--shadow-soft`, `--z-*`, `--color-tile-*` chưa/ít consumer nên phải ép
> phát đủ) và có thêm `@utility` cho `z-*` + `tabular-nums`.
> Body mặc định **14px** (`font-size: var(--text-base)` trong `@layer base`).
> Rút gọn dưới đây chỉ để đọc nhanh — **nguồn sự thật là `src/index.css`**.

```css
@import "tailwindcss";

@theme {
  --font-sans: 'Be Vietnam Pro', 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;

  /* v3 Soft Studio */
  --color-canvas: #F6F7EF;
  --color-surface: #FFFDF9;
  --color-surface-raised: #FFFDF9;
  --color-surface-muted: #F5F4EC;
  --color-surface-inverse: #1C1917;
  --color-surface-inverse-raised: #292524;
  --color-on-inverse: #FAFAF9;
  --color-line: #E7E3D6;
  --color-line-subtle: #F0EDE3;
  --color-line-control: #8A8078;
  --color-fg: #1C1917;
  --color-fg-muted: #57534E;
  --color-fg-subtle: #746E68;
  --color-primary: #1C1917;
  --color-primary-hover: #292524;
  --color-primary-fg: #FFFFFF;
  --color-brand: #E8624A;      /* CHỈ brand mark */
  --color-accent: #57DFFE;
  --color-positive: #047857;
  --color-warning: #B45309;
  --color-warning-strong: #D97706;
  --color-danger: #BE123C;
  --color-info: #00687A;
  --color-ring: #1C1917;

  /* Tint trạng thái §2.1 */
  --color-primary-tint: #F0EFEB;
  --color-positive-tint: #ECFDF5;
  --color-warning-tint: #FFFBEB;
  --color-danger-tint: #FFF1F2;
  --color-info-tint: #E6F0F2;

  /* Tile pastel §2.2 */
  --color-tile-mint: #E7F1E4;
  --color-tile-lilac: #EFEBF8;
  --color-tile-rose: #FCEBE5;
  --color-tile-amber: #FAF0DA;

  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 20px;
  --radius-xl: 28px;
  --radius-modal: 24px;
  --radius-full: 9999px;

  --shadow-e0: none;
  --shadow-soft: 0 1px 2px rgb(92 74 51 / 0.05), 0 10px 24px -14px rgb(92 74 51 / 0.18);
  --shadow-e1: 0 1px 2px rgb(28 25 23 / 0.05), 0 1px 1px rgb(28 25 23 / 0.04);
  --shadow-e2: 0 2px 8px rgb(28 25 23 / 0.08), 0 1px 2px rgb(28 25 23 / 0.04);
  --shadow-e3: 0 12px 32px rgb(28 25 23 / 0.16), 0 2px 8px rgb(28 25 23 / 0.08);

  --text-xs: 12px;   --text-xs--line-height: 1.35;
  --text-sm: 13px;   --text-sm--line-height: 1.45;
  --text-base: 14px; --text-base--line-height: 1.5;
  --text-lg: 16px;   --text-lg--line-height: 1.4;
  --text-xl: 20px;   --text-xl--line-height: 1.35;
  --text-2xl: 24px;  --text-2xl--line-height: 1.25;
  --text-3xl: 30px;  --text-3xl--line-height: 1.2;
  --text-4xl: 38px;  --text-4xl--line-height: 1.15;

  --spacing-section: 32px;
  --spacing-block: 16px;
  --spacing-label: 4px;

  --transition-duration-instant: 100ms;
  --transition-duration-fast: 150ms;
  --transition-duration-base: 200ms;
  --transition-duration-moderate: 250ms;
  --transition-duration-slow: 320ms;
  --ease-exit: cubic-bezier(0.3, 0, 1, 1);
}
```

---

## 10. Gate

Chạy **một** lệnh (gom mọi checker qua `scripts/gate-manifest.json`):

```
npm run check
```

Không chép tay danh sách gate ở đây nữa — manifest là nguồn sự thật. Gate tối thiểu cho
riêng tokens vẫn nằm trong đó: contrast (`check-contrast.mjs`), contrast combos
(`check-contrast-combos.mjs`, có kiểm `token-drift` với `src/index.css`), cấm hex trong `.tsx`.
