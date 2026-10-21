<!-- doc-meta: status=active; verified=2026-10-20; owner=storefront -->
# HANDOFF — W2 Storefront (storefront) · v3 "Soft Studio"

> **Trạng thái: DONE — task-3 hoàn tất.** `npm run lint` + `npm run build` PASS; 4 gate
> offline (contrast / contrast-combos / ui-rules / fabricated / icon-names) PASS.
> 390/768/1440: **0 tràn ngang** trên cả 2 trang; 0 tab-stop thiếu focus ring; 0 animation
> chạy dưới `prefers-reduced-motion: reduce`. Không commit, không sửa file ngoài write-scope.
>
> Đọc kèm: `docs/tasks/ui-redesign-v3/DESIGN-LANGUAGE.md` (hợp đồng v3) ·
> `docs/tasks/ui-redesign-v3/handoff/design-foundation.md` (W1) · `UI-DEFECTS.md` ·
> `COPY-GLOSSARY.md`. Quyết định Lead đã áp: D0 VI-only, D-B giữ `₫`, D-A bảng thuật ngữ
> (Slicing→cắt lớp, Infill→độ đặc, Support→vật liệu đỡ, Layer→lớp in, Batch→lô, Hub→đầu mối,
> Studio→xưởng thiết kế, Score→điểm), giữ tên phần mềm/vật liệu/acronym.

---

## 1. Việc đã làm (đúng write-scope W2)

| # | File | Thay đổi chính |
|---|---|---|
| 1 | `src/frontend/views/ExploreView.tsx` | Recompose: **category tile pastel** (6 tile, `bg-tile-*`) + **card soft** đúng thứ tự contract (ảnh/3D → tiêu đề → vật liệu/định dạng/kích thước → giá + giấy phép → CTA). Giữ nguyên: sidebar lọc desktop, bottom-sheet mobile, grid/table toggle, search, phân trang, sort, price range, material filter, empty/loading/error/warning. Search → **search pill**; chip/segmented → **pill**; card/table/toolbar/sidebar → `variant="soft"` |
| 2 | `src/frontend/views/HomeView.tsx` | Hero **giữ value prop + 3D showcase** (KHÔNG thay bằng category grid); **soften dark chassis**: khung ngoài `bg-surface` + `border-line` + `shadow-soft`, chỉ **viewport giữ nền tối D7**; header/footer khung + model tabs + HUD chip chuyển sang tông sáng (§3.8). Hero band/panel/card/skeleton/step/footer callout → soft. Card catalog dùng đúng thứ tự contract + VI. Anchor `scroll-mt-20`. Hotline rời góc phải (UI-025) |
| 3 | `src/frontend/components/HorizontalScrollFilter.tsx` | Bỏ 2 lớp **gradient phủ `from-surface`** (sai màu trên canvas/card soft) → **mask-image** trên khung cuộn (cùng kỹ thuật `.nav-fade-right` của W1). Nút cuộn = `Button` icon-only, `aria-label` VI, `motion-reduce:scroll-auto`. Bỏ nhánh EN chết |
| 4 | `src/frontend/components/services/ServiceShowcaseSection.tsx` | **UI-003**: 4 badge EN → VI; **UI-004**: bỏ vế EN sau `//` (3 eyebrow); card `variant="soft"`, icon tile pastel; modal luôn-mount (xem §5); HUD chip modal dời xuống đáy (hết đè toolbar 3D); swatch màu thành nút 36/44px; `file`→`tệp` |
| 5 | `src/frontend/components/custom/CustomIdeaRequestModal.tsx` | Bỏ `01 //`/`02 //` (COPY-GLOSSARY §3); section form → card soft không viền; bỏ nhánh EN chết ở option nhãn; `đ` → `₫`; bỏ từ EN trong ngoặc của câu VI; placeholder email VI |
| 6 | `src/frontend/components/ChatSupportModal.tsx` | Brand mark `bg-brand` + `text-fg` (5.23), bubble không viền, chip → pill ≥44px, header chống tràn ở 390 (`min-w-0`/`truncate`), **luôn-mount** Modal (xem §5), giữ nguyên data-honesty AT-09 (trợ lý tự động, không bịa tiến độ/dung sai) |

**Không đụng:** `src/index.css`, `src/frontend/ui/**`, `src/App.tsx`, `Header.tsx`,
`LanguageContext.tsx`, `src/backend/**`, `supabase/**`, `src/stores/**`, `src/utils/**`,
`src/workers/**`, `package.json`, `.env`, file của agent khác. Không thêm dependency/font/
dark theme. Không đổi route/slug/nhãn nav.

---

## 2. Before → after (pattern chính)

### 2.1 Explore — cấu trúc

```txt
TRƯỚC: header + tag chips (Card flat) + filter tray + sidebar (Card flat) + grid card flat
       card: ảnh → tên+rating → SIZE/FORMAT → giá 2 cột → CTA
SAU:   header (eyebrow pill có chấm brand) + search pill
       → CATEGORY TILES pastel (grid 2/3/6; active = ring-2 ring-primary; count chỉ hiện khi > 0)
       → tag chips Card soft (chip = pill)
       → filter tray Card soft
       → sidebar Card soft + grid card soft
       card: ảnh/3D → tiêu đề (+rating) → Vật liệu · Định dạng · Kích thước
             → Tệp CAD/In từ + Giấy phép → CTA (primary "Xem & tải tệp" + icon đặt in)
```

- **Tile pastel**: `TILE_TONE = [bg-tile-mint, bg-tile-lilac, bg-tile-rose, bg-tile-amber]`,
  chữ `text-fg`/`text-fg-muted` (KHÔNG `text-fg-subtle` trên pastel — ledger v3).
  Tile = lối vào nhanh, **song song** với sidebar lọc (không xoá filter nào).
- **Segment control** §3.6: track `rounded-full` + item `rounded-full` + active `shadow-soft`.
- **Price presets / tag chips** → pill; CTA & form giữ `rounded-md` 12px.
- **License**: map enum DB → VI (`standard/commercial/exclusive` → Tiêu chuẩn/Thương mại/
  Độc quyền); NULL → `— (người bán chưa khai báo)`; giá trị lạ in nguyên (không dịch hộ).
- **Bảng kỹ thuật**: giữ density §3.5, chỉ đổi wrapper sang soft; `thead text-fg-subtle`
  trên `bg-surface-muted` giữ theo recipe (4.56:1 — đạt AA).

### 2.2 Home — 3D chassis "soften"

```txt
TRƯỚC: 1 khối tối toàn bộ (header/tabs/viewport/footer cùng bg-surface-inverse + viền line-subtle)
SAU:   khung ngoài: rounded-lg border-line bg-surface shadow-soft
       ├ thanh tiêu đề SÁNG  : "Khung xem 3D" + chip WebGL 2.0 / Tương tác
       ├ model tabs SÁNG     : chip pill, active bg-primary text-primary-fg
       ├ viewport TỐI (D7)   : GIỮ NGUYÊN scene/ánh sáng/material
       │   └ HUD chip SÁNG   : bg-surface/90 + border-line + backdrop-blur (§3.8)
       └ thanh chân SÁNG     : gợi ý xoay/thu phóng, text-fg-muted
```

- Hero band: `rounded-xl bg-surface shadow-soft` (bỏ viền — panel lớn §3.1).
- 4 ô "value prop" catalog → chip `bg-surface shadow-soft` (hết `bg-surface-muted` chìm).
- Card catalog + skeleton + Empty/Error + step 4 bước + footer callout → soft.
- Panel CTA cuối: `border border-on-inverse/10` (viền trên nền tối theo bảng chuyển đổi).
- **Anchor UI-024**: `scroll-mt-16 → scroll-mt-20` (header 80px).

### 2.3 Copy VI-only (D0) — các chuỗi đã sửa

| Chỗ | Trước | Sau |
|---|---|---|
| Service badges (UI-003) | `ON-DEMAND MANUFACTURING`, `CONCEPT TO PROTOTYPE`, `VERIFIED CAD ASSETS`, `TOLERANCE & METROLOGY` | `SẢN XUẤT THEO YÊU CẦU`, `TỪ Ý TƯỞNG ĐẾN MẪU`, `BẢN VẼ CAD ĐÃ KIỂM DUYỆT`, `DUNG SAI & ĐO KIỂM` |
| Eyebrow `//` (UI-004) | `HỆ SINH THÁI DỊCH VỤ // VCUBE ENGINEERING SERVICES`, `Mô Phỏng 3D // LIVE 3D MESH`, `THÔNG SỐ KỸ THUẬT & CAM KẾT // TECHNICAL SPECIFICATIONS`, `ĐẶC ĐIỂM NỔI BẬT // KEY CAPABILITIES` | bỏ vế EN, giữ VI |
| Home eyebrow (UI-004) | `VCUBE CAD CATALOG // INDUSTRIAL ARCHIVE`, `SẴN SÀNG SẢN XUẤT // RAPID FABRICATION` | `KHO BẢN VẼ CAD CÔNG NGHIỆP VCUBE`, `SẴN SÀNG SẢN XUẤT` |
| Home hero badge | `VCUBE PRECISION ANTHOLOGY // 2026` (từ `DEFAULT_SITE_CONTENT`) | `TUYỂN TẬP CHẾ TÁC CHÍNH XÁC VCUBE 2026` (map legacy seed, xem §6.2) |
| Card Home | `SIZE:` / `FORMAT:` / `File Số (STL/STEP)` / `In Vật Lý (FDM/Resin)` | `Kích thước` / `Định dạng` / `Tệp số` / `In vật lý` |
| CTA/Toast | `Mua File CAD`, `Không bán file số`, `Đã thêm File CAD…` | `Mua tệp CAD`, `Không bán tệp số`, `Đã thêm tệp CAD…` |
| Chassis | `CHASSIS // 3D VIEWER`, `INTERACTIVE` | `Khung xem 3D`, `Tương tác` |
| Tag chip label | `Tag nhanh:` / `Lọc nhanh theo Tag kỹ thuật:` | `Thẻ nhanh:` / `Lọc nhanh theo thẻ kỹ thuật:` |
| Modal ý tưởng | `01 // Thông Tin Người Đăng Ký`, `02 // Chi Tiết Dự Án…` | `01 · Thông tin người đăng ký`, `02 · Chi tiết dự án & ý tưởng cần dựng` |
| Tiền | `1.000.000 đ` (nối tay trong option) | `1.000.000 ₫` (khớp `formatCurrency`, D-B) |

---

## 3. UI-DEFECTS — đóng / một phần / còn mở (trong file W2)

| ID | Mức | Trạng thái | Ghi chú |
|---|---|---|---|
| **UI-003** | P1 | ✅ **Đóng** | 4 badge VI; ảnh: card dịch vụ 390/768/1440 |
| **UI-004** | P1 | ✅ **Đóng (phần storefront)** | 7 eyebrow `//` + hero badge; badge service; `//` còn lại chỉ ở nhánh `en` chết |
| **UI-014** | P2 | ◐ **Giảm, có ngoại lệ** | Action controls dùng `Button`; **giữ raw `<button>`** cho control chọn (accordion `aria-expanded`, tile/chip/preset `aria-pressed`, segmented, nút phủ 3D). Lý do: `Button` không phù hợp layout/role của radio-like toggle; mọi raw button đều có `aria-pressed`/`aria-label` + focus ring |
| **UI-017** | P2 | ◐ **Giảm trong file W2** | 4 chỗ `fg-subtle` trang trí trên `surface-muted` (khung ảnh placeholder ×2, tile ảnh bảng) → `text-fg-muted`. `thead` giữ `fg-subtle` theo recipe §3.5 (4.56:1, đạt) |
| **UI-024** | P2 | ✅ **Đóng** | `scroll-mt-16 → scroll-mt-20` (header 80px) |
| **UI-025** | P2 | ◐ **Giảm, cần SHELL-REQUEST** | Hotline chuyển `bottom-24 right-6` → `bottom-6 left-6` (rời góc FAB `z-drawer`). **Gom 1 cụm triệt để cần `App.tsx`** (FAB) — thuộc foundation, xem §6.1 |
| **UI-031** | P3 | ✅ **Đóng trong file W2** | `File` → `Tệp` toàn bộ chuỗi VI hiển thị (trừ tên định dạng STL/STEP/3MF) |

Ngoài register (W2 phát hiện) — đề nghị Lead ghi vào `UI-DEFECTS.md`:

| ID đề xuất | Mức | Vị trí | Mô tả | Đã xử lý |
|---|---|---|---|---|
| **W2-NEW-1** | P1 (dev-only, giống P0 "nút chết") | `ExploreView.tsx` (Sheet), `ServiceShowcaseSection.tsx` (Modal), `ChatSupportModal.tsx` | **Mount có điều kiện** `{open && <Modal/>}` khiến `<dialog>` mount→cleanup→mount dưới **StrictMode**; `dialog.close()` trong cleanup đóng modal vừa mở ⇒ bấm nút không thấy gì ở dev server | ✅ Đã sửa: luôn mount, chỉ đổi prop `open` (3 file trên) |
| **W2-NEW-2** | P1 | `src/frontend/components/CadQuickViewModal.tsx:81` (`if (!isOpen \|\| !product) return null;`) | **Cùng bẫy StrictMode**: "Soi 3D"/"Đặt in nhanh" từ Home/Explore **không mở** quick-view ở dev (đã kiểm: `dialogs open: 0`). File của **pdp-viewer** | ❌ **Chưa sửa** (ngoài write-scope) — xem §6.1 |
| **W2-NEW-3** | P2 | `ChatSupportModal.tsx` header | 390: dòng phụ "Phản hồi tự động • Không phải kỹ sư trực ca" tràn dưới nút X | ✅ Đã sửa `min-w-0` + `truncate` |
| **W2-NEW-4** | P2 | `ServiceShowcaseSection.tsx` modal | 390: chip "Mô hình minh họa…" đè toolbar 3D của `ThreeModelViewer` | ✅ Đã dời chip xuống đáy + truncate |
| **W2-NEW-5** | P3 | `HomeView.tsx` card | 390: nhãn giá 2 dòng ("TỆP SỐ (STL/STEP)" / "IN VẬT LÝ (FDM/NHỰA LỎNG)") lệch baseline | ✅ Đã rút gọn "Tệp số" / "In vật lý" |

---

## 4. Gate results (working tree 2026-10-20)

| Gate | Lệnh | Kết quả |
|---|---|---|
| Typecheck | `npm run lint` | ✅ **PASS** (`tsc --noEmit`, 0 lỗi) |
| Build | `npm run build` | ✅ **PASS** (`✓ built in 4.77s`) |
| Contrast token | `node scripts/check-contrast.mjs` | ✅ `56/70 pass, 14 expected non-pass, 0 unexpected fail` |
| Contrast combos | `node scripts/check-contrast-combos.mjs` | ✅ `SẠCH` — 99 file, 14 luật, 0 tổ hợp < 4.5 |
| UI rules | `node scripts/check-ui-rules.mjs` | ✅ `PASS` — 139 file, 0 vi phạm mới |
| Fabricated | `node scripts/check-fabricated.mjs` | ✅ `SẠCH` — 139 file |
| Icon names | `node scripts/check-icon-names.mjs` | ✅ `PASS` — 138 file, 224 glyph |

> Không chạy `npm run check` đầy đủ (live gate Supabase pause/DNS có thể treo) — đúng cho
> phép của task. Không hồi quy so với baseline W1.

---

## 5. Bằng chứng 390 / 768 / 1440

**Cách đo** (Supabase project paused ⇒ dùng fallback state; để thấy thẻ thật, harness chặn
`rest/v1` và trả **row fixture chỉ trong trình duyệt**, không ghi vào repo, không hiển thị
cho khách; tên cố tình rất dài + nhiều trường rỗng để thử wrap/overflow + data-honesty):

```bash
# harness tạm (không commit): /tmp/vcube-probe/{probe,topshots,smoke,smoke2,a11y,chat}.mjs
# Chromium 1244 sẵn trong cache; thiếu lib hệ thống ⇒ tải .deb vào /tmp/chromelibs:
apt-get download libnspr4 libnss3 libasound2t64 libatk1.0-0t64 libatk-bridge2.0-0t64 \
  libatspi2.0-0t64 libcairo2 libcups2t64 libdrm2 libgbm1 libpango-1.0-0 libxkbcommon0 \
  libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgtk-3-0t64 && dpkg-deb -x *.deb /tmp/chromelibs
LD_LIBRARY_PATH=/tmp/chromelibs/usr/lib/x86_64-linux-gnu node /tmp/vcube-probe/probe.mjs
```

### 5.1 Tràn ngang + focus

| Trang | 390 | 768 | 1440 |
|---|---|---|---|
| `/explore` | `scrollW 390 / vw 390` — **0 tràn** | `768 / 768` — 0 | `1440 / 1440` — 0 |
| `/` | `390 / 390` — **0 tràn** | `768 / 768` — 0 | `1440 / 1440` — 0 |

- **Focus ring**: 18 tab-stop đầu tiên ở mỗi tổ hợp (2 trang × 390/1440) → **0 phần tử thiếu
  ring** (`box-shadow`/`outline` đo bằng computed style sau `Tab`).
- **`prefers-reduced-motion: reduce`**: 0 phần tử `animate-pulse/spin/ping/bounce` còn chạy
  animation; `HorizontalScrollFilter` chuyển `scroll-auto`.
- **Tap target**: nút/CTA ≥44px mobile (Button `max-md:min-h-11`; icon-only `size-12`);
  select sắp xếp thêm `max-md:min-h-11`; chip thẻ Home `min-h-6` (sàn AA 2.5.8 24px);
  swatch màu service 44px mobile. Còn <44px chỉ là **text link** (tiêu đề thẻ, "Nhập ở /admin")
  và **InfoTip 24–32px** — đúng hợp đồng `InfoTip` (nằm trong dòng chữ, không phải toolbar).
- **Modal/sheet**: filter bottom-sheet, service modal, CustomIdea modal, ChatSupport modal
  → mở được, `dialog[open] = 1`, **0 tràn ngang**; Esc đóng và trả focus (Modal primitive).
- **Chuỗi VI dài**: fixture tên dài 60+ ký tự + "Nguyễn Văn Thiết Kế" → truncate/line-clamp
  đúng, không đẩy cột, không tràn.

### 5.2 Ảnh (tạm, không commit — QA/W6 chụp lại)

`/tmp/vcube-probe/`: `top-explore-{390,768,1440}.png`, `top-home-{390,768,1440}.png`,
`grid-{explore,home}-{390,768,1440}.png`, `card-{explore,home}-{390,768,1440}.png`,
`tiles-explore-390.png`, `sheet-filters-390.png`, `table-390.png`,
`modal-service-390.png`, `modal-idea-390.png`, `modal-chat-390.png`, `chat-390.png`.

Điểm đã xác nhận bằng mắt trên ảnh:
- Explore 1440: 6 tile pastel 1 hàng → chip thẻ → sidebar soft + lưới 3 cột card soft.
- Explore 390: tile 2 cột, search pill, filter sheet, card đúng thứ tự.
- Home 1440/390: hero giữ headline + 3 CTA + 3D showcase; chassis sáng bao viewport tối;
  dropzone; card catalog soft; không còn EN `CHASSIS`/`INTERACTIVE`.
- Chat 390: brand mark coral + chữ `text-fg` (5.23), header không tràn.

---

## 6. Rủi ro & việc cần Lead/integrator/W3–W6

### 6.1 SHELL-REQUEST (cần `App.tsx` — không phải file W2)

1. **UI-025 (triệt để)**: Gom hotline + FAB + chat thành **một cụm nổi** (hoặc ẩn FAB ở route
   `/`) — W2 chỉ tạm tách góc (hotline trái, FAB phải). `App.tsx:1885` FAB `fixed bottom-6
   right-6 z-drawer`.
2. **`CadQuickViewModal.tsx:81` (W2-NEW-2, P1)** — **pdp-viewer**: bỏ
   `if (!isOpen || !product) return null;`, luôn render `<Modal open={isOpen}>` và guard nội
   dung; nếu không, "Soi 3D"/"Đặt in nhanh" từ Home/Explore **không mở** ở dev server
   (StrictMode). Cùng bẫy đã sửa ở 3 file W2.

### 6.2 Ngoài write-scope W2 (đề nghị nơi sở hữu xử lý)

| # | Vị trí | Vấn đề | Đề nghị |
|---|---|---|---|
| 1 | `src/data/mockData.ts` — `DEFAULT_SITE_CONTENT.heroBadge` = `VCUBE PRECISION ANTHOLOGY // 2026`; `heroCtaQuoteText` = `Báo Giá File 3D Tức Thì`; `workflowBadge`/`estimatorBadge` còn `// EN` | Seed UI copy còn EN. W2 **không được** sửa file dữ liệu ⇒ đã map **legacy seed → VI** ngay trong `HomeView` (`LEGACY_SITE_COPY`, chỉ thay khi giá trị vẫn đúng bằng seed; admin đã sửa thì giữ nguyên) | Sửa seed tại `src/data/mockData.ts` (owner: Lead/integrator) và/hoặc admin lưu lại CMS; xoá map legacy sau khi DB đã sạch để tránh 2 nguồn |
| 2 | `components/ThreeModelViewer.tsx` | aria-label EN `Toggle auto rotate`, `Toggle wireframe`, `Reset camera`; thanh công cụ `ISO / TOP / FRONT / SIDE` (technical, chấp nhận được nhưng nên VI: Trục/Trên/Trước/Cạnh) | **pdp-viewer** (file owner) |
| 3 | `CadQuickViewModal.tsx` | Như §6.1 — StrictMode | **pdp-viewer** |
| 4 | Table view 390 | Bảng kỹ thuật cuộn ngang **trong** `overflow-x-auto` (đúng luật "không tràn trang") nhưng cột bị cắt; grid là mặc định | W4/W6 cân nhắc: dưới `md` chuyển bảng thành danh sách thẻ (chỉ khi Lead duyệt — W2 không đổi IA) |
| 5 | Header nav | Ở 1440 nav chỉ hiện 2 mục (role-dependent) — đúng file foundation, không phải lỗi W2 | foundation/integrator xác nhận khi QA |

### 6.3 Rủi ro kỹ thuật còn lại

1. **Supabase paused**: chưa kiểm được catalog **thật**; toàn bộ bằng chứng dùng fallback +
   fixture trong trình duyệt. QA/W6 phải chụp lại khi DB resume (đặc biệt ảnh thật → tỉ lệ
   khung 4:3 + badge trên ảnh).
2. **Ảnh sản phẩm thật có thể tối**: badge/pill trên ảnh dùng nền `surface/90` + viền theo
   §3.4; nếu ảnh thật quá sáng/tối, QA soi lại tương phản (ledger đã đo token, không đo ảnh).
3. **StrictMode**: bất kỳ overlay mới nào cũng **không** được mount có điều kiện. Đã ghi
   thành pattern trong comment 3 file W2; W3 nên rà `{x && <Modal/>}` trong scope mình.
4. **`mask-image`** (HorizontalScrollFilter): có `-webkit-` prefix; nếu Safari cũ mất chữ ở
   mép, fallback = bỏ `style` mask (không ảnh hưởng logic).
5. **`LEGACY_SITE_COPY`**: là giải pháp tạm cho tới khi seed/DB sạch; nếu admin cố ý lưu
   đúng chuỗi seed cũ, UI sẽ hiện bản VI — chấp nhận (UI copy, không phải dữ liệu nghiệp vụ).
6. **Card soft không viền**: trên `bg-canvas` sage nhạt, phân tách nhờ `shadow-soft`; nếu QA
   thấy nhạt ở màn hình kém, tăng `--shadow-soft` phải do foundation (không tự đổi token).

---

## 7. Checklist tự kiểm (DESIGN-LANGUAGE §7)

- [x] Không hex/`rgb()` mới trong `.tsx` (swatch màu lấy từ token `readColorToken`).
- [x] Không `text-[10px]`/`text-[11px]`; sàn chữ 12px.
- [x] Không `min-h-screen`/`h-screen` (dùng `dvh`).
- [x] Card storefront `variant="soft"`; không đổi default primitive.
- [x] Không pill cho CTA/form; pill chỉ nav/search/chip/segmented.
- [x] Không `text-fg-subtle` trên pastel/tint (tile dùng `text-fg`/`text-fg-muted`).
- [x] Không chuỗi EN hiển thị; `aria-label`/`title`/`placeholder` VI.
- [x] Đủ 4 state ở trang có dữ liệu: loading (skeleton) / empty / error + warning / success (toast).
- [x] 390 không tràn ngang, tap ≥44px (trừ text link/InfoTip theo hợp đồng); 1440 không lệch baseline.
- [x] `prefers-reduced-motion` được tôn trọng.
- [x] Không đổi logic: props, state, service call, route/slug/nhãn nav.
- [x] Không fake data/ảnh; data-honesty giữ: giá `>0` mới bán, `—` khi thiếu, license NULL nói thật, rating 0 → "Chưa có đánh giá".
