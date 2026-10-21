<!-- doc-meta: status=active; verified=2026-10-19; owner=thanh -->
# VCUBE Design Language v2 — "Warm Studio"

> **Nguồn tham chiếu**: `C:\Users\thanh.dang\Downloads\aura-3d-—-minimalist-modern-living-&-3d-asset-studio`
> (AURA 3D). Đây là **hợp đồng thị giác duy nhất** cho đợt redesign. Mọi subagent đọc file này
> TRƯỚC khi sửa bất kỳ `.tsx` nào. Không tự sáng tạo palette/radius/shadow ngoài bảng dưới.
>
> **Trạng thái**: LOCKED. Thay đổi chỉ được thực hiện bởi Wave 0 (foundation) và phải ghi vào
> `PROGRESS.md` §Decision log.

---

## 0. Tinh thần

AURA là **studio ấm, tối giản, tĩnh**. Ba câu để tự kiểm khi phân vân:

1. **Viền làm việc, bóng chỉ gợi ý.** 1px hairline + nền trắng; không đổ bóng để phân tách.
2. **Bo tròn lớn, mật độ thoáng.** Card 16px, panel lớn 24px, input/nút 12px. Padding panel 24–32px.
3. **Một màu nhấn duy nhất: đen đá.** CTA, link, focus ring đều `#1C1917`. Màu chức năng
   (emerald/amber/rose/teal) chỉ dùng cho **trạng thái**, không dùng trang trí.

Điều **không** làm: gradient màu, glassmorphism tràn lan, hero tối, icon đổi sang bộ khác,
font mới, dark mode.

---

## 1. Palette (thay thế `@theme` hiện tại)

### 1.1 Bề mặt & đường

| Token | Mới | Cũ | Vai trò |
|---|---|---|---|
| `--color-canvas` | `#FAFAF9` | `#F8FAFC` | nền trang (stone-50 ấm) |
| `--color-surface` | `#FFFFFF` | `#FFFFFF` | card, panel, bảng |
| `--color-surface-raised` | `#FFFFFF` | `#FFFFFF` | giữ nguyên |
| `--color-surface-muted` | `#F5F5F4` | `#F8F9FF` | input bg, segmented track, dải xen kẽ |
| `--color-surface-inverse` | `#1C1917` | `#091426` | panel tối giữa trang sáng |
| `--color-surface-inverse-raised` | `#292524` | `#1E293B` | panel tối nổi |
| `--color-on-inverse` | `#FAFAF9` | `#FFFFFF` | chữ trên nền tối |
| `--color-line` | `#E7E5E4` | `#CBD5E1` | viền card/panel/bảng |
| `--color-line-subtle` | `#F0EFEB` | `#E2E8F0` | hairline trong bảng, divider |
| `--color-line-control` | `#8A8078` | `#8590A6` | viền input/select/checkbox — **3.70:1** trên canvas ✓ |

> `--color-line-control` **không** lấy `#E7E5E4` như AURA: gate `check-contrast-combos` đòi
> viền control ≥ 3:1. `#8A8078` là màu ấm gần nhất đạt ngưỡng.

### 1.2 Chữ

| Token | Mới | Cũ | Vai trò | Contrast |
|---|---|---|---|---|
| `--color-fg` | `#1C1917` | `#091426` | chữ chính | 16.4:1 trên canvas ✓ |
| `--color-fg-muted` | `#57534E` | `#545F73` | chữ phụ, mô tả | 7.0:1 ✓ |
| `--color-fg-subtle` | `#746E68` | `#64748B` | metadata, placeholder | 4.82:1 trên canvas · 4.61:1 trên `surface-muted` ✓ |

### 1.3 Nhấn & trạng thái

| Token | Mới | Cũ | Vai trò |
|---|---|---|---|
| `--color-primary` | `#1C1917` | `#00687A` | **CTA, link, focus ring** |
| `--color-primary-hover` | `#292524` | `#005260` | hover CTA |
| `--color-primary-fg` | `#FFFFFF` | `#FFFFFF` | chữ trên CTA |
| `--color-accent` | `#57DFFE` | `#57DFFE` | nhấn kỹ thuật trên nền tối (giữ) |
| `--color-positive` | `#047857` | `#15803D` | thành công (emerald-700) |
| `--color-warning` | `#B45309` | `#B45309` | cảnh báo (giữ) |
| `--color-warning-strong` | `#D97706` | `#D97706` | sao đánh giá |
| `--color-danger` | `#BE123C` | `#B91C1C` | lỗi, phá huỷ (rose-700) |
| `--color-info` | `#00687A` | `#1D4ED8` | **teal giữ cho info/đang xử lý** |
| `--color-ring` | `#1C1917` | `#00687A` | focus ring |

### 1.4 Tint

Luật bất di: **nền tint + chữ màu đặc**. Không dùng `bg-emerald-50/100` trần.

| Token | Mới | Chữ đặc | Contrast |
|---|---|---|---|
| `--color-primary-tint` | `#F0EFEB` | `#1C1917` | 15.3:1 ✓ |
| `--color-positive-tint` | `#ECFDF5` | `#047857` | 5.27:1 ✓ |
| `--color-warning-tint` | `#FFFBEB` | `#B45309` | 4.87:1 ✓ |
| `--color-danger-tint` | `#FFF1F2` | `#BE123C` | 5.82:1 ✓ |
| `--color-info-tint` | `#E6F0F2` | `#00687A` | 5.55:1 ✓ |

### 1.5 Xoá hẳn tier chrome tối

`--color-chrome`, `--color-chrome-raised`, `--color-chrome-fg`, `--color-chrome-fg-muted`,
`--color-chrome-border`, `--color-chrome-active`, `--color-chrome-active-fg`,
`--color-chrome-ring` → **XOÁ**. Cam `#FF9736` không còn tồn tại trong hệ thống.

Kéo theo: `src/frontend/ui/tone.ts` xoá; prop `tone` gỡ khỏi `Button`, `Field`, `Input`,
`Select`, `Modal`, `Sheet`, `SideNav`; prop `chrome` gỡ khỏi `AppShell`.

---

## 2. Hình khối

### 2.1 Radius

| Token | Mới | Cũ | Dùng cho |
|---|---|---|---|
| `--radius-sm` | `8px` | 6px | chip, tag, badge vuông, ô vuông ≤ 24px |
| `--radius-md` | `12px` | 8px | **nút, input, select, toolbar** |
| `--radius-lg` | `16px` | 12px | **card, panel, bảng, viewport 3D** |
| `--radius-xl` | `24px` | 16px | band/panel lớn, hero section |
| `--radius-modal` | `20px` | 14px | modal, sheet |
| `--radius-full` | `9999px` | — | avatar, chấm, pill đếm, **badge trạng thái** |

> **Bẫy A19**: ô vuông 20–60px dùng `rounded-lg` (16px) sẽ thành gần tròn.
> Với `w-7`…`w-12` dùng `rounded-md` (12px) hoặc `rounded-sm` (8px).
> Assert `borderRadius / (min(w,h)/2) < 1` khi rà.

### 2.2 Elevation

| Token | Mới | Dùng cho |
|---|---|---|
| `--shadow-e0` | `none` | card/panel trong luồng (mặc định) |
| `--shadow-e1` | `0 1px 2px rgb(28 25 23 / .05), 0 1px 1px rgb(28 25 23 / .04)` | card hover |
| `--shadow-e2` | `0 2px 8px rgb(28 25 23 / .08), 0 1px 2px rgb(28 25 23 / .04)` | popover, dropdown, toast |
| `--shadow-e3` | `0 12px 32px rgb(28 25 23 / .16), 0 2px 8px rgb(28 25 23 / .08)` | modal, sheet |

AURA dùng `shadow-xs`/`shadow-sm`/`shadow-md`/`shadow-xl`. Map về e0–e3 ở trên; **không** thêm
bậc mới.

### 2.3 Spacing

| Token | Mới | Cũ | Dùng |
|---|---|---|---|
| `--spacing-section` | `32px` | 24px | giữa hai section |
| `--spacing-block` | `16px` | 16px | giữa block trong section |
| `--spacing-label` | `4px` | 4px | nhãn ↔ giá trị |

Quy ước padding: card `p-4` (16), panel `p-6` (24), panel lớn `p-6 sm:p-8` (24→32),
gutter trang `px-4 sm:px-6 lg:px-8`. Khoảng giữa 2 cột lớn `gap-8` (32).

### 2.4 Typography

**Giữ nguyên** `--font-sans: 'Be Vietnam Pro'` + `--font-mono: 'JetBrains Mono'` và thang chữ
hiện tại (12/13/14/16/20/24/30/38). Lý do: tiếng Việt + tránh reflow toàn app trong cùng wave.

Cách tạo cảm giác "AURA" **không** dùng font size, mà dùng:

| Vai trò | Recipe |
|---|---|
| Tiêu đề trang | `text-2xl font-bold tracking-tight text-fg` (AURA: `text-2xl sm:text-3xl`) |
| Tiêu đề section | `text-lg font-bold tracking-tight text-fg` |
| Tiêu đề card | `text-base font-semibold tracking-tight text-fg` |
| Micro-label | `text-xs font-semibold uppercase tracking-wider text-fg-muted` |
| Metadata | `text-xs text-fg-subtle` |
| Số liệu / ID | `font-mono tabular-nums` |
| Body trong card | `text-sm text-fg-muted` |

### 2.5 Motion

Giữ token hiện tại. Bổ sung đúng 3 luật lấy từ AURA:

- Hover chuyển màu: `transition-colors duration-200`.
- Card hover: `hover:shadow-e1 hover:border-line` + `transition-all duration-300`.
- Nhấn: `active:scale-[0.97]` (không dùng `scale-95`).
- Mọi thứ phải có `motion-reduce:transition-none` hoặc nằm dưới media query toàn cục đã có.

---

## 3. Recipe lớp — copy nguyên văn

Đây là các "khối LEGO" để 8 subagent cho ra cùng một giao diện. Không tự chế biến thể.

### 3.1 Card / Panel

```txt
Card cơ bản:   rounded-lg border border-line bg-surface
Card hover:    hover:border-line hover:shadow-e1 transition-all duration-300
Panel lớn:     rounded-xl border border-line bg-surface p-6 sm:p-8
Divider trong: border-t border-line-subtle
```

### 3.2 Button

| Variant | Recipe |
|---|---|
| `primary` | `bg-primary text-primary-fg hover:bg-primary-hover rounded-md h-10 px-4 text-sm font-semibold shadow-e1 active:scale-[0.97]` |
| `secondary` | `bg-surface text-fg border border-line-control hover:border-fg-subtle hover:bg-surface-muted rounded-md h-10 px-4 text-sm font-medium` |
| `ghost` | `text-fg-muted hover:text-fg hover:bg-surface-muted rounded-md h-10 px-3 text-sm font-medium` |
| `danger` | `bg-danger text-white hover:brightness-95 rounded-md h-10 px-4 text-sm font-semibold` |
| `danger-ghost` | `text-danger hover:bg-danger-tint rounded-md h-10 px-3 text-sm font-medium` |

Icon trong nút: `size-4` (16px). Icon-only: `size-10` (40) desktop / `size-12` (48) mobile,
`aria-label` bắt buộc.

> Nút **không** pill. Bán kính 12px. Đây là thay đổi so với bản AURA (AURA dùng `rounded-2xl`
> cho nút); giữ 12px để khớp `--radius-md` và tránh nút quá mềm trong console dày.

### 3.3 Input / Select / Field

```txt
Input:   h-10 rounded-md border border-line-control bg-surface px-3 text-sm text-fg
         placeholder:text-fg-subtle
         focus:outline-none focus:border-primary focus:ring-2 focus:ring-ring/20
Select:  như Input + appearance-none + chevron lucide size-4
Field:   gap-2; label text-sm font-medium text-fg; hint text-xs text-fg-subtle
         error: border-danger + text-danger text-xs + aria-invalid + aria-describedby
```

Không dùng `bg-surface-muted` cho input (AURA dùng `#FAF9F8`; ta dùng trắng để tương phản
với card trắng bằng viền — nhất quán với luật "viền làm việc").

### 3.4 Badge trạng thái

```txt
dot:  w-1.5 h-1.5 rounded-full
base: inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium
ok:   bg-positive-tint text-positive border-positive/20
warn: bg-warning-tint text-warning border-warning/20
bad:  bg-danger-tint text-danger border-danger/20
info: bg-info-tint text-info border-info/20
mute: bg-surface-muted text-fg-muted border-line
```

### 3.5 Table (DataTable)

```txt
wrapper: rounded-lg border border-line bg-surface overflow-hidden
thead:   bg-surface-muted text-xs uppercase tracking-wider text-fg-subtle
th:      h-10 px-4 text-left font-semibold
row:     h-11 border-t border-line-subtle hover:bg-surface-muted/60
cell:    px-4 text-sm text-fg
num:     text-right font-mono tabular-nums
empty:   render NGOÀI bảng (EmptyState)
```

### 3.6 Segmented control

```txt
track:  inline-flex items-center gap-1 rounded-md border border-line bg-surface-muted p-1
item:   rounded-sm px-3 py-1.5 text-sm font-medium text-fg-muted
active: bg-surface text-fg shadow-e1 font-semibold
```

### 3.7 Shell console (sáng)

```txt
app:      min-h-dvh bg-canvas
topbar:   h-14 border-b border-line bg-surface/90 backdrop-blur-md sticky top-0 z-header
sidebar:  w-60 border-r border-line bg-surface
nav item: rounded-md px-3 py-2 text-sm font-medium text-fg-muted
          hover:bg-surface-muted hover:text-fg
active:   bg-primary-tint text-fg font-semibold + thanh dọc 2px bg-primary bên trái
content:  mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-6
```

> Không còn sidebar tối, không còn cam. Active state dùng `primary-tint` + thanh dọc đen.

### 3.8 3D viewport chrome

```txt
frame:    relative rounded-lg border border-line bg-surface overflow-hidden
HUD chip: absolute rounded-full border border-line bg-surface/90 px-3 py-1
          text-xs font-mono text-fg-muted backdrop-blur-sm
toolbar:  rounded-md border border-line bg-surface/95 shadow-e2 backdrop-blur-md p-1.5
toggle active: bg-primary text-primary-fg
dock:     rounded-lg border border-line bg-surface/95 shadow-e2 backdrop-blur-md
```

Giữ nguyên luật z-index: không có 2 control cùng `z` chồng nhau; `top-14` dành riêng 1 hàng.

### 3.9 EmptyState / Skeleton / Error

```txt
empty icon:  size-12 rounded-lg bg-surface-muted text-fg-subtle grid place-items-center
empty title: text-base font-semibold text-fg
empty body:  text-sm text-fg-muted max-w-sm
skeleton:    bg-surface-muted animate-pulse rounded-md
error:       border-danger/20 bg-danger-tint text-danger + nút "Thử lại" variant secondary
```

**"1 hành động" — diễn giải chính thức**: `action` chỉ chứa **một** nút. Nếu luồng cần
thêm đường phụ (ví dụ "Báo giá STL" trong giỏ rỗng), đặt nó thành **link chữ** ngay dưới
`description`, không đặt hai nút ngang hàng trong `action`.

### 3.10 Ngoại lệ & chốt bổ sung (sau review Wave 3)

| Chủ đề | Chốt |
|---|---|
| Sheet cạnh trượt | `placement="right"` → `rounded-l-modal`; `placement="left"` → `rounded-r-modal`. Cạnh sát viewport phẳng. |
| Fullscreen | `size="full"` và viewer 3D fullscreen dùng `rounded-none` (phủ kín viewport) + `z-modal`; **không** vượt `z-toast`. |
| Bảng trong modal | Bắt buộc `overflow-x-auto` + `min-w-[…]`; `overflow-hidden` một mình là bẫy cắt nội dung. |
| Bảng in (`InvoiceModal`) | Cho phép `py-2/px-2` thay `h-10/h-11` để vừa A4; số vẫn `font-mono tabular-nums` căn phải. |
| `<Money>` | Mặc định `font-mono tabular-nums`; call-site không cần thêm. |
| Focus ring | `focus-visible:ring-2 focus-visible:ring-ring` (đặc). `ring/20` chỉ là trang trí, **không** tính là indicator. |
| Viền badge/callout trạng thái | `/20`. `/30`–`/40` chỉ dùng cho viền control. |
| Storefront header | Cao **80px** (`h-20`), nền `bg-canvas/90 backdrop-blur-md`, nav active = chữ `text-fg font-semibold` + gạch chân 2px `bg-primary` (console dùng tint + thanh dọc). |
| Hover ảnh/icon | **Không** `group-hover:scale-*`; chỉ đổi màu, `hover:shadow-e1`, `active:scale-[0.97]`. |
| Segmented/tab | Bắt buộc `aria-pressed` hoặc `role="tab"` + `aria-selected`; mobile `max-md:min-h-11`. |
| Icon tile empty state | `size-12 rounded-lg` là ngoại lệ A19 được phép. |

---

## 4. Bảng chuyển đổi nhanh (codemod tay)

| Cũ | Mới |
|---|---|
| `rounded-full` trên nút/CTA | `rounded-md` |
| `rounded-lg` trên card | `rounded-lg` (giữ, nhưng giá trị token đổi 12→16) |
| `rounded-xl` trên panel | `rounded-xl` (16→24) |
| `bg-primary` (teal) trên CTA | giữ class, token đổi sang đen |
| `bg-chrome*`, `text-chrome*`, `border-chrome*` | `bg-surface*`, `text-fg*`, `border-line*` |
| `ring-chrome-ring` | `ring-ring` |
| `tone="chrome"` | xoá prop |
| `chrome` (AppShell) | xoá prop |
| `shadow-md` / `shadow-lg` tuỳ tiện | `shadow-e1` / `shadow-e2` / `shadow-e3` |
| `bg-gray-*`, `bg-slate-*`, `bg-zinc-*` | token tương ứng |
| `text-emerald-600` (trạng thái) | `text-positive` |
| `text-amber-600` (trạng thái) | `text-warning` |
| `text-rose-500` (trạng thái) | `text-danger` |
| `bg-gradient-to-*` (trừ hero band) | bỏ, dùng `bg-surface` |
| `backdrop-blur-*` ngoài header/modal/HUD | bỏ |

**Ngoại lệ được phép**: màu swatch sản phẩm/vật liệu lấy từ DB (`style={{ backgroundColor }}`)
— đó là dữ liệu, không phải token.

---

## 5. Checklist tự kiểm trước khi bàn giao

Mỗi file đã sửa phải trả lời được "có" cho tất cả:

- [ ] Không còn chuỗi `chrome` trong file.
- [ ] Không có hex/`rgb()` mới trong `.tsx` (trừ swatch dữ liệu).
- [ ] Không có `text-[10px]` / `text-[11px]` (sàn 12px).
- [ ] Không có `min-h-screen` / `h-screen` (dùng `dvh`).
- [ ] Nút dùng `<Button>` hoặc đúng recipe §3.2; input dùng `<Input>/<Select>/<Field>`.
- [ ] Bảng dùng `<DataTable>` hoặc đúng recipe §3.5.
- [ ] Đủ 4 state: loading / empty / error / success.
- [ ] Mobile 390: không tràn ngang, tap target ≥44px.
- [ ] `prefers-reduced-motion`: không animation vô hạn không có `motion-reduce`.
- [ ] Không đổi logic: props, state, service call, chuỗi `isVi ?` giữ nguyên.
