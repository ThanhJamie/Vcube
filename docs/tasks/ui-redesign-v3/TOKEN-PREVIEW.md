<!-- doc-meta: status=active; verified=2026-10-20; owner=thanh -->
# TOKEN-PREVIEW — v3 "Soft Studio" (W1 / design-foundation)

> Bản xem trước token + bằng chứng tương phản cho đợt v3. **Không** chứa page-level design
> spike trong `src/`: bằng chứng thị giác thật là PDP/Explore ở W2. File này là "bảng màu
> sống" để page agent copy recipe, và là nơi ghi số đo để reviewer đối chiếu.
>
> Nguồn sự thật: `src/index.css` (`@theme static`) · hợp đồng: `DESIGN-LANGUAGE.md` (v3).

---

## 1. Snapshot token — bảng chốt

### 1.1 Màu bề mặt

| Token | v2 | **v3** | Ghi chú |
|---|---|---|---|
| `--color-canvas` | `#FAFAF9` | **`#F6F7EF`** | sage/cream rất nhạt; `fg-subtle` 4.67 |
| `--color-surface` | `#FFFFFF` | **`#FFFDF9`** | trắng ngà (card/panel/bảng) |
| `--color-surface-raised` | `#FFFFFF` | **`#FFFDF9`** | light = surface |
| `--color-surface-muted` | `#F5F5F4` | **`#F5F4EC`** | input/segmented track/dải xen kẽ |
| `--color-surface-inverse` | `#1C1917` | `#1C1917` | footer, HUD 3D |
| `--color-surface-inverse-raised` | `#292524` | `#292524` | |
| `--color-on-inverse` | `#FAFAF9` | `#FAFAF9` | |
| `--color-line` | `#E7E5E4` | **`#E7E3D6`** | viền trang trí (1.19 trên canvas) |
| `--color-line-subtle` | `#F0EFEB` | **`#F0EDE3`** | hairline |
| `--color-line-control` | `#8A8078` | `#8A8078` | **giữ nguyên** — 3.80/3.58/3.50 |

### 1.2 Chữ

| Token | v3 | canvas | surface | surface-muted |
|---|---|---|---|---|
| `--color-fg` | `#1C1917` | **16.21** | **17.21** | **15.85** |
| `--color-fg-muted` | `#57534E` | **7.07** | **7.51** | **6.92** |
| `--color-fg-subtle` | `#746E68` | **4.67** | **4.95** | **4.56** |

### 1.3 Nhấn / brand / tiện ích

| Token | v3 | Vai trò | Đo |
|---|---|---|---|
| `--color-primary` | `#1C1917` | CTA, link, focus | 16.21 trên canvas |
| `--color-primary-hover` | `#292524` | hover CTA | trắng trên nó 15.17 |
| `--color-primary-fg` | `#FFFFFF` | chữ trên CTA | 17.49 |
| `--color-brand` | **`#E8624A`** (MỚI) | **chỉ brand mark** | `fg` trên nó 5.23; trên surface 3.29 (chỉ đồ hoạ) |
| `--color-accent` | `#57DFFE` | HUD nền tối | 11.15 / 9.67 |
| `--color-positive` | `#047857` | thành công | 5.40 surface · 5.08 canvas |
| `--color-warning` | `#B45309` | cảnh báo | 4.94 surface · **4.66 canvas** |
| `--color-warning-strong` | `#D97706` | sao đánh giá | 3.14 (chỉ ≥18px/icon) |
| `--color-danger` | `#BE123C` | lỗi/phá huỷ | 6.19 surface · 5.83 canvas |
| `--color-info` | `#00687A` | đang xử lý (teal) | 6.34 |
| `--color-ring` | `#1C1917` | focus ring 2px | 16.21 |

### 1.4 Tile pastel (MỚI)

| Token | Hex | `text-fg` | `text-fg-muted` | `text-fg-subtle` |
|---|---|---|---|---|
| `--color-tile-mint` | `#E7F1E4` | 15.07 ✓ | 6.58 ✓ | 4.34 ✗ |
| `--color-tile-lilac` | `#EFEBF8` | 14.91 ✓ | 6.51 ✓ | 4.29 ✗ |
| `--color-tile-rose` | `#FCEBE5` | 15.12 ✓ | 6.60 ✓ | 4.35 ✗ |
| `--color-tile-amber` | `#FAF0DA` | 15.44 ✓ | 6.74 ✓ | 4.44 ✗ |

### 1.5 Radius / shadow

| Token | v2 | **v3** | Utility | Dùng |
|---|---|---|---|---|
| `--radius-sm` | 8 | 8 | `rounded-sm` | chip, tag, ô ≤24px |
| `--radius-md` | 12 | 12 | `rounded-md` | **control**: nút, input, select, toolbar |
| `--radius-lg` | 16 | **20** | `rounded-lg` | **card, bảng, 3D frame** |
| `--radius-xl` | 24 | **28** | `rounded-xl` | panel/band lớn |
| `--radius-modal` | 20 | **24** | `rounded-modal` | modal, sheet |
| `--radius-full` | 9999 | 9999 | `rounded-full` | avatar, badge, **nav/search pill** |

| Shadow | Giá trị | Dùng |
|---|---|---|
| `--shadow-e0` | `none` | `Card variant="flat"` trong luồng |
| `--shadow-soft` (MỚI) | `0 1px 2px rgb(92 74 51 / .05), 0 10px 24px -14px rgb(92 74 51 / .18)` | storefront card soft, nav pill active, toast, FAB |
| `--shadow-e1` | stone 28 25 23 | flat hover |
| `--shadow-e2` | stone | popover/dropdown, soft hover |
| `--shadow-e3` | stone | modal/sheet |

### 1.6 Không đổi
`--font-sans` Be Vietnam Pro · `--font-mono` JetBrains Mono · thang chữ 12/13/14/16/20/24/30/38 ·
`--spacing-section/block/label` 32/16/4 · `--z-*` 10/20/30/40/50/60 · tint trạng thái 5 màu.
**Không** dark theme, **không** dependency/font mới (D4).

---

## 2. Snapshot recipe (copy nguyên văn vào W2)

### 2.1 Storefront card (soft)

```tsx
<Card variant="soft" padding="lg">        {/* rounded-lg(20) · bg-surface(#FFFDF9) · shadow-soft */}
  <CardHeader>
    <CardTitle>Vỏ hộp IoT</CardTitle>
    <Badge variant="success">Đạt chuẩn</Badge>
  </CardHeader>
  <CardDescription>Bản in vật lý · PETG</CardDescription>
  <CardContent>…</CardContent>
  <CardFooter><Button>Thêm vào giỏ</Button></CardFooter>
</Card>
```

```txt
DOM thực tế (không đổi API):
<div class="rounded-lg bg-surface text-fg border-0 shadow-soft p-6"> … </div>
```

### 2.2 Storefront header — nav pill + search pill

```txt
┌──────────────────────────────────────────────────────────────────────────┐ 80px
│ [V] VCUBE         ( Khám Phá )  Báo Giá   Đơn Hàng      (🔍 Tìm…)  🛒 [ĐK]│
│  ^coral mark         ^white pill + shadow-soft          ^search pill      │
└──────────────────────────────────────────────────────────────────────────┘
 header: sticky top-0 z-header h-20 border-b border-line bg-canvas/90 backdrop-blur-md
 nav active:   rounded-full bg-surface font-semibold text-fg shadow-soft
 nav thường:   rounded-full text-fg-muted hover:bg-surface-muted hover:text-fg
 search:       h-10 rounded-full border border-line-control bg-surface
 CTA Đăng ký:  h-10 rounded-md bg-primary text-primary-fg   ← 12px, KHÔNG pill/coral
```

### 2.3 Console shell — sidebar pill

```txt
┌────────────────────────────────────────────────────────────┐
│ Topbar 56px  (brand mark coral)                  Về cửa hàng│
├──────────────┬─────────────────────────────────────────────┤
│ ( Hàng đợi ) │  nội dung trên canvas #F6F7EF                │
│   Máy in     │  ┌ card flat (viền hairline) ──────────────┐ │
│   Vật liệu   │  │ DataTable 40–44px, số font-mono         │ │
│  …           │  └─────────────────────────────────────────┘ │
└──────────────┴─────────────────────────────────────────────┘
 sidebar: bg-canvas (SideNav variant="pill")
 active:  rounded-full bg-surface font-semibold text-fg shadow-soft
 content: mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-6
```

### 2.4 Button — 3 bán kính đúng chỗ

```txt
CTA / form / toolbar : <Button>                → rounded-md (12px)  ✔ mặc định
nav / search / chip  : <Button shape="pill">   → rounded-full      ✔ có chủ đích
                       card                   → rounded-lg (20px)  ✔
```

### 2.5 Tile phân loại (pastel)

```tsx
<Link className="rounded-lg bg-tile-mint p-5 text-fg hover:shadow-soft">
  <Icon name="view_in_ar" size={20} className="text-fg-muted" />
  <p className="mt-2 text-base font-semibold text-fg">Vỏ hộp IoT</p>
  <p className="text-xs text-fg-muted">128 mẫu</p>   {/* KHÔNG text-fg-subtle */}
</Link>
```

### 2.6 Coral — duy nhất 1 chỗ

```tsx
<span className="grid size-10 place-items-center rounded-md bg-brand text-fg shadow-soft">V</span>
```

```txt
✔ bg-brand + text-fg          = 5.23  (mark)
✘ bg-brand + text-white       = 3.35  (cấm)
✘ text-brand trên nền sáng    = 3.10–3.29 (cấm)
✘ bg-brand làm nền CTA        (D3: CTA = primary đen)
```

---

## 3. Bằng chứng tương phản (đo bằng 2 script của repo)

```
$ node scripts/check-contrast.mjs
56/70 pass, 14 expected non-pass, 0 unexpected fail
```

14 cặp "expected non-pass" là **có chủ đích** và đã ghi lý do trong ledger:

| Nhóm | Cặp | Tỉ lệ | Lý do |
|---|---|---|---|
| Trang trí | line/canvas · hairline/card · line/card | 1.19 / 1.15 / 1.26 | WCAG 1.4.11 miễn viền trang trí |
| Đồ hoạ | `warning-strong` làm chữ nhỏ | 3.14 | chỉ sao/icon ≥18px |
| Tint | `fg-subtle` trên primary-tint / info-tint | 4.37 / 4.34 | dùng `fg-muted` |
| Hairline | `fg-subtle` trên `line-subtle` | 4.30 | dùng `fg-muted` (6.51) |
| Brand | coral làm chữ trên surface/canvas · trắng trên coral | 3.29 / 3.10 / 3.35 | coral chỉ brand mark (D3) |
| Pastel | `fg-subtle` trên 4 tile | 4.29–4.44 | dùng `fg`/`fg-muted` |

```
$ node scripts/check-contrast-combos.mjs
check-contrast-combos: quet 99 file .tsx, 14 luat
  KET QUA: SACH — 0 to hop class vi pham nguong 4.5:1.
  Dat nhung sat nguong: 34 cho — tất cả là fg-subtle trên bg-surface-muted = 4.56
```

**Sổ sách chống "xanh giả":** script đối chiếu `TOKENS` + `RULES[].ratios` với giá trị thật
trong `src/index.css`. Đổi token mà không cập nhật ledger ⇒ `token-drift` /
`rule-ratio-drift` ⇒ RC=1.

> **Cảnh báo biên an toàn:** 4 cặp sát ngưỡng cần review kỹ nếu ai đó chỉnh palette —
> `fg-subtle` trên canvas (**4.67**), trên surface-muted (**4.56**), `fg-subtle` trên
> `primary/5` (**4.50**), `warning` trên canvas (**4.66**). Đừng làm canvas/surface tối hơn.

---

## 4. Cách tự kiểm nhanh trên máy

```bash
npm run lint                                  # typecheck
npm run build                                 # Tailwind v4 sinh utility mới
node scripts/check-contrast.mjs               # bảng token
node scripts/check-contrast-combos.mjs        # tổ hợp class + sổ sách
# xác nhận utility MỚI có mặt trong CSS build (tránh "token chết"):
grep -o '\.shadow-soft{[^}]*}' dist/assets/index-*.css
grep -o '\.bg-tile-mint{[^}]*}' dist/assets/index-*.css
```

Kết quả W1 (2026-10-20): `shadow-soft`, `bg-tile-mint/lilac/rose/amber`, `bg-brand`,
`[&_input]:rounded-full`, `border-on-inverse` **đều được sinh** trong
`dist/assets/index-*.css`; `--radius-lg:20px`, `--color-brand:#e8624a`,
`--color-surface-muted:#f5f4ec`, `--shadow-soft` có trong `:root`/`@theme`.

---

## 5. Bằng chứng thị giác thật

W1 **không** chỉnh page view. Bằng chứng thật nằm ở:

1. W2 `ProductDetailView` (PDP) — card soft, sticky buy card, khung 3D.
2. W2 `ExploreView` — tile pastel, card grid, filter pill.
3. W2 `HomeView` + `Header` — chrome storefront (đã áp ở W1).
4. W3 console — `SideNav variant="pill"`, density bảng giữ nguyên.

Reviewer đối chiếu ảnh chụp 390/768/1440 với bảng recipe §2 và checklist §7 của
`DESIGN-LANGUAGE.md`.
