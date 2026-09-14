# VCUBE Design Tokens (spec)

Nguồn sự thật duy nhất cho màu / typography / spacing / radius / elevation / motion.
Cài đặt: khối `@theme` + `.dark` trong `src/index.css` (xem §9). Kiểm tương phản: `node scripts/check-contrast.mjs`.
Hướng đã chốt: **dual-theme, giữ brand teal** — storefront light-first, `/quote` + `/admin` + `/lab` + `/designer` dark-first.

---

## 1. Nguyên tắc

1. Tên token theo **vai trò**, không theo màu (`--color-primary`, không `--color-teal`) → đổi theme chỉ đổi giá trị.
2. Không viết hex/`[Npx]` trong component. Mọi giá trị đi qua token.
3. Không dùng `#000`/`#FFF` tuyệt đối. Không truyền đạt trạng thái chỉ bằng màu.
4. Phân cấp surface bằng **viền** và **elevation**, không bằng độ sáng (dark surface chỉ lệch 1.04–1.25:1).
5. Cặp `text`/`background` phải đạt: chữ thường ≥4.5:1, chữ lớn (≥24px hoặc ≥18.5px bold) ≥3:1, viền control & focus ring ≥3:1.
6. Mọi cột số dùng `font-variant-numeric: tabular-nums`.
7. Sàn chữ 12px. Không có ngoại lệ "nhãn 9px".

---

## 2. Màu — light theme (mặc định)

| Token | Hex | Vai trò | Tương phản đo được |
|---|---|---|---|
| `--color-canvas` | `#F8FAFC` | nền trang | nền cho `--color-fg` = **17.61:1** |
| `--color-surface` | `#FFFFFF` | card, panel, bảng | `fg` = **18.43:1** |
| `--color-surface-muted` | `#F8F9FF` | header, dải xen kẽ | — |
| `--color-surface-inverse` | `#091426` | panel HUD tối giữa trang light | `accent` trên nó = **11.75:1** |
| `--color-surface-inverse-raised` | `#1E293B` | panel tối nổi | — |
| `--color-line` | `#CBD5E1` | viền, đường phân cách (**trang trí**) | 1.42:1 trên canvas — hợp lệ vì không phải viền control |
| `--color-line-subtle` | `#E2E8F0` | hairline trong bảng | — |
| `--color-line-control` | `#8590A6` | viền input/select/checkbox | **3.21:1** trên trắng, **3.07:1** trên canvas ✓ |
| `--color-fg` | `#091426` | chữ chính | **17.61:1** |
| `--color-fg-muted` | `#545F73` | chữ phụ, mô tả | **6.15:1** ✓ |
| `--color-fg-subtle` | `#64748B` | metadata, placeholder, nhãn | **4.76:1** trên trắng, **4.55:1** trên canvas ✓ |
| `--color-primary` | `#00687A` | nút chính, link, trạng thái active | **6.15:1** ✓ |
| `--color-primary-hover` | `#005260` | hover | trắng trên nó = **8.84:1** ✓ |
| `--color-primary-fg` | `#FFFFFF` | chữ trên nền primary | **6.44:1** ✓ |
| `--color-accent` | `#57DFFE` | nhấn kỹ thuật (đo lường, layer, dung sai) | trên `surface-inverse` **11.75:1** |
| `--color-positive` | `#15803D` | thành công, đạt chuẩn | **5.02:1** ✓ |
| `--color-warning` | `#B45309` | cảnh báo, cần review | **5.02:1** ✓ |
| `--color-warning-strong` | `#D97706` | sao đánh giá (đồ hoạ, không phải chữ nhỏ) | 3.19:1 — chỉ dùng ≥18px hoặc dạng icon |
| `--color-danger` | `#B91C1C` | lỗi, hành động phá huỷ | **6.47:1** ✓ |
| `--color-info` | `#1D4ED8` | thông tin | ≥4.5:1 ✓ |
| `--color-ring` | `#00687A` | focus ring | 6.15:1 ✓ (ring 2px) |

**Đã loại bỏ khỏi vai trò chữ:** `#94A3B8` (2.56:1 — fail), `#8590A6` (3.21:1 — chỉ làm viền), `#7D7565`, `#8C857B`, `#A69C8A`, `#BCC7DE`, `#D8E3FB`, và bảng "editorial" `#F7F6F2`/`#1C1C1C`/`#D5CFC5`/`#E0DDD5`.

### 2.1 Tint cho thẻ trạng thái

Luật: **nền tint + chữ `<màu>` đặc** (`bg-warning-tint text-warning`) — thay cho `bg-<màu>-50/100` tho
(`docs/plans/12-ui-refactor-spec.md` §1.3). Mỗi tint phải đủ nhạt để màu đặc tương ứng đạt ≥ 4.5:1 khi làm chữ 12px.
Đo bằng số học WCAG 2.x trên gamma sRGB; cổng: `node scripts/check-contrast-combos.mjs`.

| Token | Hex (light) | Chữ đặc | Tương phản light | Hex (dark) | Tương phản dark |
|---|---|---|---|---|---|
| `--color-primary-tint` | `#E6F0F2` | `--color-primary` | **5.55:1** ✓ | `#10262B` | 6.69:1 ✓ |
| `--color-positive-tint` | `#F0F9F3` | `--color-positive` | **4.67:1** ✓ (D-1b) | `#10241A` | 9.35:1 ✓ |
| `--color-warning-tint` | `#FEF6EC` | `--color-warning` | **4.69:1** ✓ (D-1) | `#2A2114` | 9.49:1 ✓ |
| `--color-danger-tint` | `#FBE9E9` | `--color-danger` | **5.53:1** ✓ | `#2C1618` | 6.15:1 ✓ |
| `--color-info-tint` | `#E8EDFB` | `--color-info` | **5.72:1** ✓ | `#141F33` | 6.49:1 ✓ |

> **D-1 và D-1b (token đã sửa trong cùng wave):**
> • `--color-warning-tint` `#FBF0E4` → `#FEF6EC`: `#B45309` chỉ đạt **4.47:1** ⇒ FAIL, mà `bg-warning-tint`
>   được dùng **83 lần / 30 file** (gồm `/admin`, `/checkout`, `/cart`, `/quote`) nên bản vá cục bộ trong
>   `MaterialComparisonMatrix.tsx` không đủ — đổi token mới là sửa gốc; badge HDT trong ma trận vật liệu
>   quay lại `bg-warning-tint` đúng quy tắc ở trên.
> • `--color-positive-tint` `#E7F3EC` → `#F0F9F3`: `#15803D` chỉ đạt **4.40:1** ⇒ FAIL ở ~55 chỗ
>   `bg-positive-tint text-positive`; sửa token một dòng là đủ, không sửa call site.
> Tint dark đều đạt (9.35 / 9.49) nên **không đổi giá trị dark**.
> ⚠️ `--color-fg-subtle` không đạt trên **nền tint/hairline**: `warning-tint` 4.44 (light) / 4.33 (dark) ·
> `positive-tint` 4.43 (light) / 4.46 (dark) · `bg-primary/5` 4.40 (light) · `line-subtle` 3.86 (light) / 4.26 (dark)
> ⇒ trên các nền đó dùng `--color-fg-muted` (5.22 light / 6.53 dark trên `line-subtle`).

---

## 3. Màu — dark theme (`/quote`, `/admin`, `/lab`, `/designer`)

| Token | Hex | Vai trò | Tương phản |
|---|---|---|---|
| `--color-canvas` | `#080D16` | nền app | `fg` = **16.68:1** |
| `--color-surface` | `#0E1520` | card, panel | `fg` = **15.70:1** |
| `--color-surface-muted` | `#131C2A` | panel nổi, hàng xen kẽ | — |
| `--color-surface-raised` | `#1A2434` | popover, dropdown | — |
| `--color-line` | `#232F42` | viền trang trí | 1.52:1 (trang trí) |
| `--color-line-control` | `#4E6490` | viền input/select | **3.10:1** trên surface, **3.29:1** trên canvas ✓ |
| `--color-fg` | `#E8EEF7` | chữ chính | **15.70:1** ✓ |
| `--color-fg-muted` | `#9BA9BE` | chữ phụ | **7.68:1** ✓ |
| `--color-fg-subtle` | `#7A8798` | metadata, placeholder | **5.01:1** ✓ |
| `--color-primary` | `#3AB8CE` | nút chính, link | **7.78:1** trên surface, **8.27:1** trên canvas ✓ |
| `--color-primary-hover` | `#57DFFE` | hover | **11.68:1** ✓ |
| `--color-primary-fg` | `#07272E` | chữ trên nền primary | **6.67:1** ✓ |
| `--color-accent` | `#57DFFE` | nhấn kỹ thuật | **11.68:1** ✓ |
| `--color-ring` | `#57DFFE` | focus ring | ✓ |

**Không dùng cho chữ:** `#6E7A8A` (4.20:1 — fail trên `#0E1520`), `#28374D` (chỉ viền trang trí).

---

## 4. Typography

Font: **Be Vietnam Pro** (sans, thiết kế cho tiếng Việt — bắt buộc vì dấu tiếng Việt) + **JetBrains Mono** (mã, thông số kỹ thuật, ID). Bỏ `Inter`.

**Thang chữ có thật (ĐỔI 2026-09-20 — redesign Modern SaaS, `docs/plans/21-saas-spec.md` §2.2):**
khai báo thẳng vào namespace `--text-*` của Tailwind v4 trong `src/index.css`, nên
`text-sm`/`text-base`… là cỡ chữ thật, không còn là mặc định của framework.

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

Ngoài thang trên (class có sẵn trong `src/index.css`, KHÔNG thêm biến mới):
`.fluid-hero-heading` / `.fluid-h1` / `.fluid-h2` cho hero responsive, và `.font-mono`
(13px JetBrains Mono) cho tên file / part ID / G-code.

**Số liệu** (bảng, KPI, tiền, tiến độ) dùng `tabular-nums` — `@utility` khai tường minh
trong `src/index.css` (Tailwind v4 đã có utility lõi cùng tên; bản của dự án thêm
`font-feature-settings: "tnum" 1`).

Luật: tối đa **2 cỡ chữ trong một card**; nhãn uppercase chỉ dùng cho micro-label và không nhỏ hơn 12px; không dùng `font-serif` (đang là sans stack → gây nhầm).

---

## 5. Spacing

Thang 4px: `0, 2, 4, 8, 12, 16, 24, 32, 40, 48, 64, 80, 96` (Tailwind v4 mặc định `--spacing: 0.25rem` đã đủ — dùng `p-1..p-24`, không dùng `p-[13px]`).
Quy ước: padding trong card **16–20px** (mật độ SaaS — `Card` map: sm 12 / md 16 / lg 20);
gutter trang 16px mobile / 24px tablet / 32–48px desktop; khoảng giữa nhãn và input trong
`Field` là **8px** (`gap-2`); giữa các field 16px.

**Nhịp dọc — token hoá (2026-09-20, `21-saas-spec.md` §2.3):** khai trong namespace
`--spacing-*` nên sinh utility thật, dùng thay cho giá trị lẻ tuỳ hứng:

| Token | Giá trị | Utility | Dùng cho |
|---|---|---|---|
| `--spacing-section` | **24px** | `gap-section`, `space-y-section` | giữa hai section |
| `--spacing-block` | **16px** | `gap-block` | giữa các khối trong một section |
| `--spacing-label` | **4px** | `gap-label` | giữa nhãn và giá trị (`KeyValue`, `Section`) |

**Breakpoint:** 390 (kiểm tối thiểu), 640, 768, 1024, 1280, 1536.

---

## 6. Radius · Elevation · Z

**Radius — thang SaaS 6 / 8 / 12 / 16 / modal 14 / full** (ĐỔI 2026-09-20 — redesign
Modern SaaS, `docs/plans/21-saas-spec.md` §1.1):

| Token | Giá trị | Utility | Dùng cho |
|---|---|---|---|
| `--radius-sm` | **6px** | `rounded-sm` | badge, chip, tag, **ô vuông ≤ 24px** |
| `--radius-md` | **8px** | `rounded-md` | **nút/CTA**, input, select, toolbar, **ô vuông 25–40px** |
| `--radius-lg` | **12px** | `rounded-lg` | card, panel, bảng, viewport 3D |
| `--radius-xl` | **16px** | `rounded-xl` | band/panel lớn toàn chiều rộng (nhịp section) |
| `--radius-modal` | **14px** | `rounded-modal` | modal, sheet (không dùng `rounded-lg` cho modal) |
| `--radius-full` | 9999px | `rounded-full` | **avatar, chấm trạng thái, pill đếm, thanh tiến độ** |

> 🔴 **Nút KHÔNG còn là pill.** Luật cũ "`rounded-full` cho mọi nút/CTA/chip" (`12-ui-refactor-spec.md`
> §2.2 bản trước) **đã bị bãi bỏ**: `ui/Button` nay dùng `rounded-md` (8px). Hệ quả phải dọn:
> ~30 CTA tự viết đang `rounded-full` để khớp pill cũ sẽ **lệch** với `ui/Button` — đưa về
> `ui/Button` hoặc đổi sang `rounded-md` khi áp từng trang.
> **Lý do đổi (2026-09-20):** redesign Modern SaaS (`21-saas-spec.md` §0 câu 4 + §1.1) chọn
> ngôn ngữ SaaS: bán kính nhỏ, mật độ dày vừa, viền nhạt. Đổi ở tầng token nên **1.833 chỗ
> `rounded-*`** đi theo cùng lúc.
> **Cập nhật 2026-09-12 (đã bị thay thế):** thang 8/12/20 (+xl 28) theo
> `docs/plans/11-layout-references.md` §6 — nay thay bằng 6/8/12/16/14.
> **Bẫy đã xử lý (bài học A19):** 57 chỗ là **ô vuông nhỏ** (`w-7`…`w-12`) dùng `rounded-lg`;
> với radius lớn chúng thành **hình tròn** (bán kính bị kẹp về nửa cạnh). Thang mới nhỏ hơn nên
> rủi ro giảm, **nhưng vẫn phải rà**: assert `borderRadius / (min(w,h)/2) < 1` cho mọi phần tử
> vuông 20–60px (trừ avatar/chấm/pill cố ý).

**Elevation** (không dùng shadow làm tín hiệu duy nhất):

| Token | Giá trị | Dùng cho |
|---|---|---|
| `--shadow-e0` | `none` + 1px `--color-line-subtle` | **card/panel trong luồng** (mặc định của `Card`) |
| `--shadow-e1` | `0 1px 2px rgb(9 20 38 / .05), 0 1px 1px rgb(9 20 38 / .04)` | card nổi (`Card interactive` hover) |
| `--shadow-e2` | `0 2px 8px rgb(9 20 38 / .08), 0 1px 2px rgb(9 20 38 / .04)` | popover, dropdown, toast |
| `--shadow-e3` | `0 12px 32px rgb(9 20 38 / .16), 0 2px 8px rgb(9 20 38 / .08)` | modal, sheet |

> **ĐỔI 2026-09-20 (`21-saas-spec.md` §2.4):** giữ 4 bậc nhưng **rà nhẹ hơn** bản cũ
> (SaaS tối giản: bóng chỉ gợi độ nổi, **viền** mới là tín hiệu phân tách). Không bóng cho
> phần tử trong luồng.

Dark theme: shadow yếu hơn trên nền tối → **thêm viền `--color-line` và tăng 1 bậc surface** thay vì tăng shadow.

**Glass** chỉ được dùng ở **một chỗ**: chrome nổi trên canvas 3D (`backdrop-filter: blur(12px)`, nền `color-mix(in oklab, var(--color-surface-muted) 80%, transparent)`). Phải chuyển sang nền đặc khi `prefers-contrast: more` hoặc `forced-colors: active`.

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

| Token | Giá trị | Dùng cho |
|---|---|---|
| `--duration-instant` | 100ms | phản hồi nhấn, checkbox |
| `--duration-fast` | 150ms | hover, tooltip, chip |
| `--duration-base` | 200ms | dropdown, tab, mặc định |
| `--duration-moderate` | 250ms | sheet, mở rộng disclosure |
| `--duration-slow` | 320ms | modal |
| `--ease-out` | `cubic-bezier(0.2, 0, 0, 1)` | xuất hiện |
| `--ease-in-out` | `cubic-bezier(0.4, 0, 0.2, 1)` | chuyển trạng thái |
| `--ease-exit` | `cubic-bezier(0.3, 0, 1, 1)` | biến mất |

Luật: không animate từ `scale(0)` (bắt đầu ≥0.94); nhấn = `scale(0.97)`; không animate hành động bàn phím hoặc hành động tần suất cao (gõ, cuộn, kéo slider); không auto-rotate 3D quá 5 giây mà không có nút dừng; `@media (prefers-reduced-motion: reduce)` → thay chuyển động bằng opacity, tắt auto-rotate.

---

## 8. Component rules (bắt buộc)

**Button:** 5 biến thể — `primary` (nền `--color-primary`, chữ `--color-primary-fg`), `secondary` (nền `--color-surface`, viền `--color-line-control`, chữ `--color-fg`), `ghost` (không nền), `danger`, `danger-ghost`. **Bán kính `--radius-md` = 8px (KHÔNG pill)**. Cao 40px (`size="md"`), 36px (`size="sm"` — toolbar), 48px (`size="lg"`); padding 12–16px; dưới `md` mọi nút ≥48px. Icon-only: `aria-label` bắt buộc, vùng bấm ≥44×44 (đích 48×48 với khoảng cách ≥8px). Icon trong nút **16px** (`size-4`) — xem quy tắc icon.

**Field:** `<label for>` luôn tồn tại (hiện `htmlFor` = 0 trong `components/admin`), đánh dấu **cả** field bắt buộc và không bắt buộc, lỗi hiển thị inline + `aria-invalid` + `aria-describedby`, validate khi blur (không khi đang gõ), `autocomplete` + `inputmode` đúng.

**Card/Panel:** `--radius-lg` (12px), **viền `--color-line-subtle`** + `bg-surface`, `--shadow-e0`
(không bóng khi nằm trong luồng); `interactive` hover nâng lên `--shadow-e1`; không dùng gradient nền.
Phân tách chủ yếu bằng **viền nhạt**, fill chỉ phụ (`21-saas-spec.md` §1.2). Vẫn **cấm** viền trang trí
quanh mọi khối: chỉ card/panel/bảng/ô nhập mới có viền.

**Icon (ĐỔI 2026-09-20 — `21-saas-spec.md` §1.3):** icon **trong control** (nút, ô nhập, tab)
= **16px** (`size-4`); icon **điều hướng sidebar** = **18px**; icon trong **thẻ KPI / empty state**
= **20–30px** (không thu nhỏ). Thu nhỏ icon control **không** được làm vùng bấm < 44×44 ở mobile —
bù bằng padding.

**Table (admin):** density **40/44** (hàng cao **40–44px** ở mọi bề rộng), header sticky,
đường kẻ hàng `divide-line-subtle`, cột số căn phải + `tabular-nums`, giá trị không có hiển thị `—` (không "N/A"), empty state render **ngoài** bảng, toolbar tối đa 5 hành động rồi vào overflow menu, pagination ghi rõ khoảng ("21–40 / 142"), mọi hàng ≥44px trên mobile.

**Trạng thái:** mỗi màn phải có đủ 4 state — loading (skeleton đúng layout, không phải spinner toàn trang), empty (icon + 1 câu nguyên nhân + 1 hành động), error (nêu nguyên nhân + retry), success.

**3D viewport chrome:** viewport là panel có viền (`--radius-lg`, nền tối hơn 1 bậc so với trang), chrome nổi dùng glass; top-left = tên part + chip `W×D×H mm` (tabular-nums); top-right = preset góc nhìn (Iso/Front/Top) dạng segmented; bottom-left = đơn vị + scale; bottom-right = zoom ±, fit, reset; desktop thêm rail phải cho vật liệu/infill. **Không được có 2 control cùng `z` chồng nhau** (hiện toolbar, banner out-of-bounds và caliper đều ở `top-14` + `z-20`).

---

## 9. Cài đặt trong `src/index.css`

> Bản thật trong repo dùng `@theme static` (bắt buộc: token nền tảng như `--radius-full`,
`--shadow-e0..e3`, `--z-*` chưa có consumer nên phải ép phát đủ) và có thêm `@utility`
cho `z-*` + `tabular-nums` (Tailwind v4 không có namespace utility cho z-index).
> Body mặc định **14px** (`font-size: var(--text-base)` trong `@layer base`).
> Rút gọn dưới đây chỉ để đọc nhanh — **nguồn sự thật là `src/index.css`**.

```css
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));

@theme {
  --font-sans: 'Be Vietnam Pro', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;

  --color-canvas: #F8FAFC;
  --color-surface: #FFFFFF;
  --color-surface-muted: #F8F9FF;
  --color-surface-inverse: #091426;
  --color-surface-inverse-raised: #1E293B;
  --color-line: #CBD5E1;
  --color-line-subtle: #E2E8F0;
  --color-line-control: #8590A6;
  --color-fg: #091426;
  --color-fg-muted: #545F73;
  --color-fg-subtle: #64748B;
  --color-primary: #00687A;
  --color-primary-hover: #005260;
  --color-primary-fg: #FFFFFF;
  --color-accent: #57DFFE;
  --color-positive: #15803D;
  --color-warning: #B45309;
  --color-danger: #B91C1C;
  --color-info: #1D4ED8;
  --color-ring: #00687A;

  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-modal: 14px;
  --radius-full: 9999px;

  --shadow-e0: none;
  --shadow-e1: 0 1px 2px rgb(9 20 38 / 0.05), 0 1px 1px rgb(9 20 38 / 0.04);
  --shadow-e2: 0 2px 8px rgb(9 20 38 / 0.08), 0 1px 2px rgb(9 20 38 / 0.04);
  --shadow-e3: 0 12px 32px rgb(9 20 38 / 0.16), 0 2px 8px rgb(9 20 38 / 0.08);

  --text-xs: 12px;
  --text-xs--line-height: 1.35;
  --text-sm: 13px;
  --text-sm--line-height: 1.45;
  --text-base: 14px;
  --text-base--line-height: 1.5;
  --text-lg: 16px;
  --text-lg--line-height: 1.4;
  --text-xl: 20px;
  --text-xl--line-height: 1.35;
  --text-2xl: 24px;
  --text-2xl--line-height: 1.25;
  --text-3xl: 30px;
  --text-3xl--line-height: 1.2;
  --text-4xl: 38px;
  --text-4xl--line-height: 1.15;

  --spacing-section: 24px;
  --spacing-block: 16px;
  --spacing-label: 4px;

  --duration-fast: 150ms;
  --duration-base: 200ms;
  --duration-moderate: 250ms;
  --duration-slow: 320ms;
  --ease-out: cubic-bezier(0.2, 0, 0, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-exit: cubic-bezier(0.3, 0, 1, 1);
}

.dark {
  --color-canvas: #080D16;
  --color-surface: #0E1520;
  --color-surface-muted: #131C2A;
  --color-surface-raised: #1A2434;
  --color-line: #232F42;
  --color-line-subtle: #1B2434;
  --color-line-control: #4E6490;
  --color-fg: #E8EEF7;
  --color-fg-muted: #9BA9BE;
  --color-fg-subtle: #7A8798;
  --color-primary: #3AB8CE;
  --color-primary-hover: #57DFFE;
  --color-primary-fg: #07272E;
  --color-accent: #57DFFE;
  --color-positive: #4ADE80;
  --color-warning: #FBBF24;
  --color-danger: #F87171;
  --color-info: #60A5FA;
  --color-ring: #57DFFE;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

## 10. Gate

```
npm run lint                        # 0 lỗi
npm run build                       # thành công
node scripts/check-contrast.mjs     # exit 0, 25+/30 cặp PASS (5 cặp fail có chủ đích: viền trang trí + màu chữ đã loại)
node scripts/check-contrast-combos.mjs  # RC=0: không tổ hợp (chữ, nền) nào < 4.5 trong .tsx
grep -c '\[#' src --include='*.tsx' # 0
grep -rhoE 'text-\[[0-9]px\]|text-\[1[01]px\]' src --include='*.tsx' | wc -l   # 0
```
