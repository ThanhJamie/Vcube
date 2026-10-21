<!-- doc-meta: status=active; verified=2026-10-20; owner=pdp-viewer -->
# HANDOFF — W2 PDP / Personalize / 3D (pdp-viewer) · v3 "Soft Studio"

> **Trạng thái: DONE — task-4 hoàn tất.** Gate offline xanh (`lint`, `build`, fabricated, ui-rules,
> contrast, combos, icon-names). Ảnh 390/768/1024/1440 đã chụp bằng Chromium headless với fixture
> **chỉ tiêm ở tầng network** (Supabase đang paused) — không có file mock/fixture nào vào `src/`.
> Không commit/push. Không sửa `src/index.css`, `src/frontend/ui/**`, `src/App.tsx`,
> `src/backend/**`, `src/stores/**`, `src/utils/**`, `supabase/**`.
>
> Đọc kèm: `DESIGN-LANGUAGE.md` (v3), `TOKEN-PREVIEW.md`, `UI-DEFECTS.md`, `COPY-GLOSSARY.md`.

---

## 1. Files changed (đúng 6 file được giao + handoff này)

| File | Thay đổi |
|---|---|
| `src/frontend/views/ProductDetailView.tsx` | Recompose PDP theo template Detail v3: breadcrumb + headline (h1/rating thật/SKU) tách khỏi card; hero grid 7/5; **card báo giá sticky** (giá lớn → số lượng → CTA) + card cấu hình; tabs kỹ thuật thành **khối hàng 2 cùng grid** (desktop dưới 3D, mobile sau khối báo giá); gallery/3D 1 card soft; related soft card. Toàn bộ logic giá/giỏ/chặn bán giữ nguyên. |
| `src/frontend/views/PersonalizeView.tsx` | Cùng template Detail: headline riêng; 7/5; **sticky summary** (tổng tiền thật + tóm tắt cấu hình đang chọn + CTA ≥lg); cột trái = 3D + specs + vật liệu/màu; cột phải = summary + khắc/logo; khối 4–6 (tách nắp, số lượng, gói tiến độ) + BOM thành **card full-width 2 cột**. Không đổi pricing/logic. |
| `src/frontend/components/personalize/PersonalizeModelViewer3D.tsx` | Soften HUD chip (bỏ số đo proxy khỏi chip, ẩn chip ở <sm để không đè toolbar CAD); fallback VI **“HỘP ARDUINO”/“MÔ HÌNH 3D”** (UI-035); **fix bug StrictMode**: cleanup phải nhả `renderRequestedRef` — trước đó mount lần 2 early-return ⇒ **canvas đen vĩnh viễn ở dev**. Không đổi scene/ánh sáng/material. |
| `src/frontend/components/ThreeModelViewer.tsx` | Frame/standby theo D7: khung ngoài `bg-surface-inverse` (hết “nháy sáng” khi canvas vào khung nhìn), standby chữ VI + contrast `on-inverse`; layer bar đổi `0.16mm Layer` → `Lớp in 0,16 mm`; chip HUD `shadow-soft`. Không đổi scene/lights/geometry. |
| `src/frontend/components/CadQuickViewModal.tsx` | VI-only: title `KIỂM TRA LƯỚI CAD 360°`, aria “Đóng trình xem CAD nhanh” (UI-033), “Tải tệp CAD”, “Định dạng tệp”, bỏ “File/Buy/…”; rating chỉ hiện khi có **cả điểm + số đánh giá thật** (T3); `printTime` thiếu ⇒ `—`; segmented pill v3; gỡ `text-fg-subtle` trên `bg-surface-muted` (UI-017 near-miss). |
| `src/frontend/components/material/MaterialTechnicalAdvisory.tsx` | Panel nested `rounded-lg bg-surface-muted` (bỏ viền + card-in-card); “vật liệu đỡ” thay “supports” theo D-A; giữ nguyên toàn bộ nội dung R3. |

---

## 2. Quyết định layout

### 2.1 PDP (`/products/:id`)

```txt
breadcrumb + quick actions (Lưu / Chia sẻ)      ← không card, giảm "card soup"
headline: designer • định dạng • ★ thật (n) · H1 · SKU
┌───────────────────────────────┬──────────────────────────────┐
│ 7 cột trái                    │ 5 cột phải                   │
│ Card soft: 3D / Thư viện ảnh  │ ┌ sticky (top-24) ─────────┐ │
│  · viewport tối graphite D7   │ │ Tổng đặt in (3xl)         │ │
│  · HUD chip + toolbar viewer  │ │ Số lượng (− 1 +)          │ │
│  · footer: hướng dẫn, vật     │ │ [Đặt in 3D — …] (≥lg)     │ │
│    liệu, lưới kín nước, proxy │ │ [Mua tệp CAD — …] (≥lg)   │ │
│ Batch co-printing (nếu có)    │ └───────────────────────────┘ │
│ Tabs kỹ thuật (hàng 2)        │ Card soft: cấu hình          │
│  Tổng quan/Thông số/Đánh giá/ │  1 vật liệu (+advisory)      │
│  Hồ sơ in & cắt lớp           │  2 màu · 3 lớp in · 4 khắc   │
└───────────────────────────────┴──────────────────────────────┘
related products (soft card, 3 cột)
```

- **7/5 thật**: `lg:grid-cols-12` + `col-span-7/5`. Cả hai cột nằm cùng một grid: khối 3D
  `lg:row-start-1`, khối báo giá `lg:row-start-1 lg:row-span-2`, tabs `lg:row-start-2` ⇒
  **desktop tabs nằm ngay dưới 3D** (lấp khoảng trống), **mobile tabs nằm sau khối báo giá**
  (giá/mua lên sớm) — hai thứ tự đúng theo từng viewport, không duplicate DOM.
- **Right card sticky** `lg:sticky lg:top-24` (header 80px + 16). Sticky chỉ bám trong containing
  block của wrapper (hết cột thì nhả), nên không cắt nội dung; summary cao ~420px < viewport.
- **CTA 1 intent / viewport (UI-008)**: nhóm CTA mua của card `hidden lg:block`; dưới `lg` chỉ còn
  **thanh đặt hàng cố định** (giá + Tệp CAD + Đặt in 3D). Nút “Tuỳ biến 3D & khắc laser” vẫn hiện
  ở mọi viewport (không phải CTA mua). Bằng chứng: 390 chỉ còn 1 nút “Đặt in 3D” (thanh dưới).
- **Hierarchy Prestiva-image-3 adaptation**: ảnh/gallery trái → tiêu đề + đánh giá thật + giá lớn
  phải → hành động chính; **không** có attendee/match %, không số liệu xã hội bịa. Đánh giá chỉ
  render khi `rating > 0` **và** `reviewsCount > 0`; ngược lại “Chưa có đánh giá” (cả header, tab,
  card báo giá).

### 2.2 Personalize (`/personalize[/:productId]`)

```txt
headline: Xưởng thiết kế VCUBE • ★ thật · H1 · designer/giấy phép
┌──────────────────────────────┬──────────────────────────────┐
│ 7 trái                        │ 5 phải                       │
│ Card soft: khung xem trước 3D │ sticky summary: tổng tiền,   │
│ + nhãn "Mô hình minh hoạ"     │ tóm tắt (vật liệu/màu/khắc/  │
│ Proxy disclosure (honesty)    │ gói/số lượng), CTA ≥lg,      │
│ Card soft: specs từ DB        │ cảnh báo thiếu tham số giá   │
│ Card soft: 1 vật liệu · 2 màu │ Card soft: 3 khắc/logo       │
└──────────────────────────────┴──────────────────────────────┘
Card soft full-width: 4 tách nắp · 5 số lượng · 6 gói QC | CAD inspector · BOM chi tiết
```

- Cùng “detail template” PDP: headline riêng, 7/5, sticky summary, card soft, nhịp `space-y-6/8`.
- Tổng tiền/tóm tắt đọc thẳng từ state (không thêm dữ liệu); mọi guard `priceUnavailable`,
  `unconfiguredFees`, “Tổng trên CHƯA gồm…” giữ nguyên.
- Mobile: 3D → specs → vật liệu/màu → summary → khắc → 4–6 + BOM; CTA mua chỉ ở thanh dưới.
- Mọi enum không render thô: `PACKAGE_LABEL` (Tiết kiệm/Tiêu chuẩn/Hỏa tốc),
  `ENGRAVING_DEPTH_LABEL` (đùn nổi/khắc laser/khoét âm) — trước đó BOM in “embossed”.

### 2.3 3D viewport (D7 — giữ nguyên engine)

- **Không đổi** `scene.background` (#091426), ánh sáng, material, geometry, camera, controls,
  slicing/clipping, dispose/VRAM. Chỉ đổi **chrome**: khung/standby/HUD chip/layer bar copy.
- PDP: khung ngoài `Card variant="soft"`; vùng render `rounded-md bg-surface-inverse`; 1 HUD chip
  trái “WebGL 360°” (ẩn phần vật liệu khỏi HUD để **không đè toolbar CAD** ở góc phải); thông tin
  vật liệu + “Lưới (kín nước): —” xuống footer sáng của card; thêm dòng **proxy disclosure**:
  “Mô hình 3D minh hoạ theo danh mục — không phải tệp CAD gốc… số đo thật ở tab Thông số”.
- Personalize: chip “HỘP ARDUINO” (fallback VI), **ẩn <sm** vì toolbar viewer chiếm góc phải ở 390;
  nền viewport tối giữ nguyên.
- Chip light `bg-surface/90 + shadow-soft` đúng recipe §3.8; toolbar/dock giữ nguyên (component
  `UnifiedCadToolbar` thuộc W3 — không sửa).

---

## 3. Defect register — đã đóng / cập nhật (trong file mình sở hữu)

| ID | Mức | Kết quả |
|---|---|---|
| **UI-008** | P1 | ✅ PDP 390 hết 4 CTA mua: CTA trong card `hidden lg:block`, thanh dưới là CTA duy nhất. Đo bằng browser: 390 chỉ 1 nút “Đặt in 3D” hiển thị (44px), CTA card `display:none`; 1440 CTA card hiện. |
| **UI-011** (phần PDP) | P1 | ✅ `Share` → “Chia sẻ”; `Profile In & Slicing` → “Hồ sơ in & cắt lớp”; `Mesh Wireframe` → “Lưới khung”; `3D Interactive Canvas` → “Khung 3D”; `Gallery` → “Thư viện ảnh”; bỏ `//` ghép EN. Phần tool3d **không đụng** (W3). |
| **UI-033** | P3 | ✅ `aria-label="Đóng trình xem CAD nhanh"` (CadQuickViewModal). |
| **UI-035** | P3 | ✅ HUD fallback VI “HỘP ARDUINO”/“MÔ HÌNH 3D”, không còn `ARDUINO-CASE`. |
| **UI-004** (phần Personalize) | P1 | ✅ `VCUBE STUDIO // PERSONALIZATION` → “Xưởng thiết kế VCUBE”; “Catalog” → “Kho bản vẽ”; “Share” → “Chia sẻ”; gỡ `Batch Quantity`, `Layer Height`, `Exploded View`, `BOM Breakdown`, `CAD Mesh Inspector/Slicer` → VI. |
| **UI-016** | P2 | ✅ **Đã đóng bởi foundation trong `App.tsx`** (`FAB_HIDDEN_SCREENS = ['product_detail','personalize']`). Mình xác nhận FAB không render trên 2 route; không sửa App.tsx, không cần SHELL-REQUEST. |
| **UI-017** (near-miss) | P2 | ◐ Giảm: gỡ toàn bộ `text-fg-subtle` trên `bg-surface-muted` trong 6 file mình sở hữu; combos gate từ **34 → 31** chỗ 4.56:1 (toàn bộ còn lại thuộc file W2/W3 khác). |
| **UI-039** (D-B) | P3 | ✅ Trong 2 view: ký hiệu tiền chuyển ` đ` → **`₫`** (250.000 ₫), thống nhất `formatCurrency`/`Money`; format tiền vẫn `vi-VN`. |

**Phát hiện thêm (đã sửa, ngoài register):** `PersonalizeModelViewer3D` không vẽ frame nào ở
dev do `renderRequestedRef` không được reset trong cleanup (StrictMode mount→unmount→mount) ⇒
canvas đen. Đã fix trong cleanup (`renderRequestedRef.current = false`), có ảnh trước/sau.

**Không sửa vì ngoài scope:** UI-011 phần tool3d, UI-014 (raw button ở toolbar 3D — component
W3), UI-001 (foundation/integrator), UI-027 (Header), UI-039 các chỗ nối tay ngoài 2 view này.

---

## 4. Gate results (2026-10-20, working tree hiện tại)

| Gate | Lệnh | Kết quả |
|---|---|---|
| Typecheck | `npm run lint` | **PASS** (tsc --noEmit, 0 lỗi) |
| Build | `npm run build` | **PASS** (`✓ built in 4.78s`) |
| Fabricated | `node scripts/check-fabricated.mjs` | **SẠCH** — 0 tuyên bố bịa |
| UI rules | `node scripts/check-ui-rules.mjs` | **PASS** — 0 vi phạm mới |
| Contrast token | `node scripts/check-contrast.mjs` | **0 unexpected fail** (56 pass + 14 expected) |
| Contrast combos | `node scripts/check-contrast-combos.mjs` | **SẠCH** — 0 tổ hợp < 4.5; near-miss 34→31 |
| Icon names | `node scripts/check-icon-names.mjs` | **PASS** — 224 glyph, 0 thiếu |

Không chạy `npm run check` đầy đủ (live gate Supabase có thể treo — Supabase đang paused), theo
đúng cho phép của task.

---

## 5. Bằng chứng viewport (390/768/1024/1440)

Supabase paused ⇒ dùng **harness tạm ngoài repo**: Playwright (Chromium headless, libs runtime
giải nén ở `/tmp`) + `page.route('**/rest/v1/**')` trả fixture **chỉ ở network layer**. Không có
fixture/mock/ảnh nào được ghi vào `src/`. Fixture dùng 2 sản phẩm: (p1) đầy đủ dữ liệu + ảnh
data-URI trung tính; (p2) **thiếu dữ liệu có chủ đích** (không rating, không vật liệu/màu, không
giá tệp số, giấy phép unset) để kiểm data-honesty.

Script: `/tmp/vcube-pdp-shot.cjs`, `/tmp/vcube-fixtures.cjs`, `/tmp/vcube-interaction.cjs`
(ảnh: `/tmp/vcube-pdp-shots/`). Chạy lại:
```bash
LD_LIBRARY_PATH=/tmp/debx/root/usr/lib/x86_64-linux-gnu node /tmp/vcube-pdp-shot.cjs
```

| Viewport | PDP | Personalize | Kết quả đo |
|---|---|---|---|
| 390×844 | `pdp-390.png`, `pdp-gallery-390.png`, `pdp-empty-rating-390.png` | `personalize-390.png` | **0 tràn ngang** (`scrollWidth = 390`); CTA card ẩn / chỉ thanh dưới; nút thanh dưới **44×44**; HUD chip 3D ẩn để không đè toolbar |
| 768×1024 | `pdp-768.png`, `pdp-empty-rating-768.png` | `personalize-768.png` | **0 tràn ngang** (`scrollWidth = 768`); cột đơn, summary ngay sau 3D; CTA dùng thanh dưới |
| 1024×800 | `pdp-1024.png` | — | **0 tràn ngang**; breakpoint `lg` 7/5 vào đúng, cột phải ~400px vẫn đủ chỗ |
| 1440×900 | `pdp-1440.png`, `pdp-gallery-1440.png`, `pdp-specs-1440.png`, `pdp-reviews-1440.png`, `pdp-empty-rating-1440.png` | `personalize-1440.png` | **0 tràn ngang** (`scrollWidth = 1440`); CTA card hiện đúng; sticky summary `top = 96px` sau khi cuộn 600px (đo computed) |

Trạng thái đã kiểm bằng browser: 3D mode, gallery mode (thumbnail + “Ảnh 1/3”), tab specs,
tab reviews (điểm thật 4.6/37), empty-rating (p2: “Chưa có đánh giá”, giá/kênh bị khoá kèm lý do,
giấy phép `— (người bán chưa khai báo)`), empty-materials/colors. Console: **0 pageerror**.

---

## 6. Rủi ro & việc QA W6 cần xác nhận

1. **Supabase paused** ⇒ chưa thấy dữ liệu thật từ DB; ảnh dùng fixture network-layer. QA phải
   chụp lại 390/768/1440 bằng catalog thật sau khi Resume (đặc biệt sản phẩm có ảnh thật, nhiều
   vật liệu/màu, giấy phép khác nhau).
2. **Sticky trên viewport thấp**: summary 420px + header 80px vẫn vừa 667px, nhưng nếu card cấu
   hình dài bất thường (nhiều vật liệu/khuyến nghị R3 dài) thì sticky chỉ bám trong wrapper và
   nhả ở cuối cột — cần xem 390×667 và 768×1024 thực tế.
3. **WebGL headless**: ảnh dùng SwiftShader; trên máy thật cần xác nhận canvas 3D render, toolbar
   fullscreen, slider layer (PDP chưa bật `showLayerSlicer` nên không đổi).
4. **`nav-fade-right` trên tablist PDP** (dùng mask) — cần xác nhận Safari cũ không mất chữ; nếu
   có, bỏ class (không ảnh hưởng logic).
5. **Proxy 3D PDP** đã có disclosure (thêm mới) — reviewer nên giữ; nếu muốn chuyển vào `InfoTip`
   thì đó là quyết định consistency W4/W5.
6. **Dung sai/mesh**: vẫn render `—` (không bịa). Nếu sau này có API đo kiểm thật thì thay bằng số
   thật + nguồn, không hardcode.

---

## 7. Shell requests

**Không có.** UI-016 đã được foundation xử lý trong `App.tsx` (`FAB_HIDDEN_SCREENS`), xác nhận
bằng code + ảnh 390 (không còn FAB đè thanh đặt hàng).

---

## 8. W2b follow-up (task-15) — StrictMode quick-view + VI 3D labels

> **Trạng thái: DONE.** Fix blocker storefront báo (modal quick-view không mở ở dev),
> dọn nốt aria/toolbar EN trong phạm vi 3D, kiểm tra trap `{open && <Modal/>}` ở 2 view.

### 8.1 Root cause & fix `CadQuickViewModal.tsx`

- **Nguyên nhân thật:** component cũ `return null` khi `!isOpen || !product` ⇒ `<Modal>` chỉ
  **mount lúc đang mở**. Ở dev, StrictMode chạy mount → cleanup → mount cho effect của `Modal`:
  cleanup gọi `dialog.close()`, và sự kiện `close` là **task bất đồng bộ** nên nó bắn vào
  listener vừa được gắn lại ở lần mount thứ hai ⇒ `onClose()` ⇒ modal đóng ngay
  (storefront đo `dialogs=0`). Đây là tương tác StrictMode ⇄ `<dialog>`, không phải lỗi dữ liệu.
- **Fix:** tách đôi component:
  - `CadQuickViewModal` (outer) **luôn render `<Modal open={isOpen} …>`** — mount từ đầu với
    `open=false`, chỉ đổi prop khi mở ⇒ effect showModal chạy đúng MỘT lần, không còn race.
    Title dùng `product?.sku`; nút “Chi tiết đầy đủ” `disabled={!product}`.
  - `CadQuickViewBody` (inner, không export) chỉ mount khi `product != null`; toàn bộ state
    mua hàng + sync effect + JSX chuyển vào đây. `key={isOpen ? 'open' : 'closed'}` giữ đúng
    hành vi cũ (mỗi lần mở state reset như khi unmount trước đây).
  - Thêm `useEffect` reset `isFullscreen` khi đóng (trước đây unmount tự reset).
- **Không đổi:** call site Home/Explore (vẫn truyền cùng props), logic giá/giỏ/data-honesty,
  markup nội dung. Tiện thể đổi ký hiệu tiền trong file sang `₫` (D-B) và “file số” → “tệp số”.

**Bằng chứng (dev server + fixture network-layer, Chromium headless):**

| Kịch bản | Trước fix | Sau fix |
|---|---|---|
| `/explore` → “Xem trước 3D” (1440) | `dialogs open = 0` | `openDialogs = 1`, title “KIỂM TRA LƯỚI CAD 360°”, body scroll locked, **Esc đóng được** |
| `/explore` 390 | — | `openDialogs = 1`, panel cuộn được (scrollHeight 844 = viewport) |
| `/` (Home 1440) → quick view | — | `openDialogs = 1` |
| `/explore` → nút “Đặt in 3D” (physical) | — | `openDialogs = 1`, tab “In 3D Vật Lý” `aria-pressed=true`, có select vật liệu |
| Console | — | 0 `pageerror` |

Ảnh: `/tmp/vcube-pdp-shots/quickview-explore-1440.png`, `quickview-explore-390-physical.png`.
Script: `/tmp/vcube-quickview-probe.cjs`, `/tmp/vcube-quickview-verify.cjs`,
`/tmp/vcube-quickview-phys.cjs` (fixture chỉ ở network layer, không vào `src/`).

### 8.2 EN aria/toolbar 3D → VI

- **`ThreeModelViewer.tsx` (file của mình):** không còn chuỗi EN hiển thị/aria — aria duy nhất
  là `"Lớp cắt (%)"` (VI). Thêm map VI cho chip `showTitleBadge` (nếu bật):
  `gear→Bánh răng`, `box→Vỏ hộp`, `drone→Drone`, `vase→Bình`, `arch→Vòm`, fallback
  “Mô hình 3D”. **Không đổi scene/lights/geometry.**
- **Cross-scope (đã xử lý xong):** các chuỗi `Toggle auto rotate/wireframe`, `Reset camera`,
  `Toggle fullscreen`, `Toggle camera mode` và nhãn preset `ISO/TOP/FRONT/SIDE` nằm trong
  `src/frontend/components/tool3d/UnifiedCadToolbar.tsx` — **file của `tool3d` (task-8, đang
  active)** nên mình **không sửa**; đã gửi yêu cầu chính xác cho `tool3d` và họ đã áp:
  aria VI (“Bật xoay tự động 360°”, “Chuyển sang chế độ khung dây”, “Đặt lại góc nhìn chuẩn”,
  “Xem toàn màn hình”, “Chuyển sang phối cảnh/trực giao”) + nhãn preset VI
  (`CHUẨN/TRÊN/TRƯỚC/CẠNH`) với `title/aria-label="Góc nhìn …"`, kèm `aria-pressed`.
  `ThreeModelViewer` (dùng ở PDP + CadQuickView) truyền `showAnglePresets={true}` nên **PDP và
  quick-view cũng hiện preset**; ở `<sm` cụm preset bị ẩn (`hidden sm:flex`) nên toolbar còn
  5 nút icon. `ModelViewer3D` (Tool3D) cũng đã đổi tương tự để 2 nơi khớp nhau.

  Verify lại 2026-10-20 sau khi đổi nhãn (dev + fixture network-layer, Chromium headless):

  | Bề mặt | Viewport | Nhãn preset (VI) | Toolbar | Overflow |
  |---|---|---|---|---|
  | Personalize | 1440 | CHUẨN/TRÊN/TRƯỚC/CẠNH (aria “Góc nhìn …”, `aria-pressed`) | 450×54px, đủ 9 nút | không |
  | Personalize | 390 | preset ẩn (`hidden sm:flex`), còn 5 nút icon 40×40 | 238×54px, mép phải 350/390 | không (`scrollWidth=390`) |
  | Quick-view (Explore) | 1440 | CHUẨN/TRÊN/TRƯỚC/CẠNH + 5 icon aria VI | đủ nút | không |
  | PDP | 1440 | CHUẨN/TRÊN/TRƯỚC/CẠNH (aria VI) | đủ nút | không |

  Ảnh: `/tmp/vcube-pdp-shots/toolbar-personalize-1440.png`,
  `toolbar-personalize-390.png`, `toolbar-quickview-1440.png`, `toolbar-pdp-1440.png`.
  Script: `/tmp/vcube-toolbar-verify.cjs`. 0 `pageerror`; **layout/density toolbar không đổi**,
  chỉ chữ + aria (đúng yêu cầu tool3d).

### 8.3 Trap `{open && <Modal/>}` ở 2 view

`ProductDetailView.tsx` và `PersonalizeView.tsx` **không import/không render** `Modal`/`Sheet`/
`ConfirmDialog` (grep 0 hit) ⇒ không có trap tương tự. `PersonalizeModelViewer3D` dùng
fullscreen API (không phải `<dialog>`), đã có reset `renderRequestedRef` từ W2.

### 8.4 Gate W2b (chạy lại sau khi sửa)

`npm run lint` **PASS** · `npm run build` **PASS** (7.72s) · `check-fabricated` **SẠCH** ·
`check-ui-rules` **PASS** · `check-contrast` **0 unexpected fail** · `check-contrast-combos`
**SẠCH** · `check-icon-names` **PASS**. Không commit.
