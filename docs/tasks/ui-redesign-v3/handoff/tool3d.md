<!-- doc-meta: status=active; verified=2026-10-20; owner=tool3d -->
# HANDOFF — W3 Tool3D / Quote (tool3d) · v3 "Soft Studio" — SURFACE-ONLY

> **Trạng thái: DONE — task-8 hoàn tất.** Surface-only: **không** đổi layout/panel order/toolbar/
> state logic/pricing/mesh analysis/density. 3D viewport giữ nền tối D7, **không** đổi
> `scene.background`, ánh sáng, material, geometry.
> Gate offline xanh: `npm run lint` · `npm run build` · contrast token · contrast combos ·
> ui-rules · fabricated · icon-names. Không commit/push. Không sửa file ngoài write-scope.
>
> Đọc kèm: `docs/tasks/ui-redesign-v3/PLAN.md` (v3 + D-A…D-F) · `DESIGN-LANGUAGE.md` (v3) ·
> `handoff/design-foundation.md` (W1) · `UI-DEFECTS.md` · `COPY-GLOSSARY.md` ·
> `docs/design/data-honesty.md`.

---

## 1. Việc đã làm (đúng write-scope task-8)

| # | File | Thay đổi chính |
|---|---|---|
| 1 | `src/frontend/views/Tool3DView.tsx` | VI hoá toàn bộ chuỗi hiển thị của `/quote` (eyebrow D-C, HUD, tabs, panel cắt lớp/QA, bảng lịch sử); **UI-009** `Risk Score`→`Điểm rủi ro`; **UI-004** 2 eyebrow bỏ English sau `//`; **UI-026** stat bar 3→1 cột ở <380px + `break-words`; sửa tràn ngang 390 của hàng tab workspace (`min-w-0`, `flex` thay `inline-flex`, nhãn tab ngắn, ẩn icon <sm); `File`→`Tệp`, `Caliper`→`thước cặp`, `Layer`→`lớp in`, `Infill`→`độ đặc`, `Support`→`vật liệu đỡ`, `Batch`→`lô`; `đ/g`→`₫/g`; toast VI |
| 2 | `components/tool3d/ModelViewer3D.tsx` | **UI-023** `z-[100]`→`z-modal` (token, không còn z ngoài thang); HUD chip VI (mobile: nhãn ngắn `VCUBE v2.6`, ≥sm: `BỘ MÁY LƯỚI 3D VCUBE v2.6`), bỏ `//` giữa các thành phần (D-C) → `·`; nhãn góc nhìn VI `CHUẨN/TRÊN/TRƯỚC/CẠNH`; `CAD Studio`→`xem CAD` (B12); `Wireframe/Solid/Bounding Box/Caliper/FULLSCREEN/ORTHO/PERSP`→VI; `0.16mm Layer`→`Lớp in 0,16 mm`; `text-fg-subtle` trên HUD nền bán trong suốt → `text-fg-muted` (UI-017); thêm `aria-pressed` cho toggle + `aria-label` cho slider lớp in. **Không đổi scene/lights/material** |
| 3 | `components/tool3d/UnifiedCadToolbar.tsx` | Aria-label VI (`Toggle camera mode/auto rotate/wireframe/reset/fullscreen` → VI); nhãn góc nhìn VI + `aria-pressed`; bỏ English trong `title`; **thêm helper** `VIEW_ANGLE_LABEL` (chỉ nhãn hiển thị). `File` này dùng chung với PDP quick-view + Personalize (pdp-viewer đã yêu cầu — xem §8) |
| 4 | `components/tool3d/QuoteSummaryPanel.tsx` | **UI-009/UI-011/B7** `VCUBE Engineering Studio`→`Xưởng kỹ thuật VCUBE`; `PRICING ENGINE`→`BỘ TÍNH GIÁ VCUBE`; layer/support options VI (B8–B11); **D-B** tiền qua `formatCurrency` (`vnd`, `vndAllowZero`, `perGramText`→`₫/g`, toast); `-x% OFF`→`-x%`; `Manual Review Required`→VI; `Part`→`chi tiết`; hàng infill/số lượng thêm `flex-wrap` (chống tràn 390); package card thêm `min-w-0`/`break-words`; copy VI sentence-case |
| 5 | `components/tool3d/InternalCostBreakdownModal.tsx` | **UI-020**: bảng `min-w-[640px]` → **card list dưới `md`**, bảng từ `md` (không còn nested scroll ngang trong modal 390); **UI-039** toàn bộ `đ` nối tay → `formatCurrency`/`₫`, `đ/g`→`₫/g`, `đ/kWh`, `đ/h`; VI hoá `Filament/Resin, Model/Support/Purge/Brim, Labor, Nozzle/Plate, Failure Reserve, Overhead, Markup, Margin, Platform/Payment/Royalty, Audit Trail, Override, Internal Costing` |
| 6 | `components/tool3d/StlVs3mfComparisonModal.tsx` | **UI-009/UI-020**: `Print Settings`/`Infill, Layer, Support` → VI (B4/B5); bảng `min-w-[600px]` → **card list dưới `md`**, bảng từ `md`; `Unit Verification` không còn; title/eyebrow VI (D-C); `File`→`Tệp`; copy VI |
| 7 | `components/tool3d/StlUnitConfirmModal.tsx` | **UI-011**: bỏ `// Unit Verification`; `File`→`Tệp`, `Millimet`→`mi-li-mét`, `Inch (x25.4)`→`inch (×25,4)`; eyebrow VI |
| 8 | `components/tool3d/MachineComparisonModal.tsx` | **UI-039** tiền qua `formatCurrency`; `PRC-009 // … (Multi-Machine Slicer)`→VI; `Smart Router`→`Điều phối thông minh`; header bảng VI; `(Smart Routing)` bỏ English |
| 9 | `components/tool3d/ObjectTreePanel.tsx` | Card `border-line-subtle`→`border-line` (recipe v3 console); `Part`→`chi tiết`; `3MF Multi-Body Standard`/`Body`→VI; `Tool T1..T4`→`Đầu đùn T1..T4`; `(Slicer)` bỏ; tap target mobile: swatch 20px→44px (`max-md:size-11`, hàng swatch `flex-wrap`), nút mắt 32→44, select `max-md:min-h-11` (desktop giữ density 32px) |
| 10 | `components/tool3d/PresetPalettePanel.tsx` | **D-A**: `Palette Slots`/`Part` → `khe màu`/`chi tiết`; theme name EN → VI (`Bộ 1..4`); `1-Click Batch Color Switch`→VI; **a11y**: theme card `div onClick` → `<button type="button">` có focus ring (không đổi handler); card `border-line` |
| 11 | `components/tool3d/TransformControlsPanel.tsx` | Card `border-line`; `Scale/Rotate/Move (… )`→`Thu phóng/Xoay/Toạ độ`; `Uniform Scale` bỏ; `Millimet/Inches`→`Mi-li-mét/Inch` |
| 12 | `components/tool3d/ValidationReportPanel.tsx` | **UI-009**: bỏ `(Risk Score)`; `Level 1/2/3`→`Cấp 1/2/3`; `triangles/faces`→`tam giác/mặt`; `(Inverted)`, `(Min Wall)` bỏ; severity enum thô `high/medium/low/info` không còn render thô (giữ trong code) — nhãn VI ở issue list; màu/icon bám số đo giữ nguyên (data-honesty) |
| 13 | `docs/tasks/ui-redesign-v3/handoff/tool3d.md` | File này |

**Không đụng:** `src/index.css`, `src/frontend/ui/**`, `src/App.tsx`, `Header.tsx`,
`ThreeModelViewer.tsx` (pdp-owned), `src/backend/**`, `supabase/**`, `src/stores/**`,
`src/utils/**`, `src/workers/**`, `package.json`, `.env`, file agent khác. Không thêm
dependency/font; không đổi route/slug/nhãn nav.

---

## 2. Quyết định surface (v3 — "surface-only, giữ density")

```txt
Token      : chỉ dùng token v3 sẵn có (radius-lg 20 / radius-md 12 / line / surface / fg-* /
             shadow-e0-e3 / primary / tint trạng thái). 0 hex mới trong .tsx (swatch dữ liệu
             `style={{backgroundColor}}` + màu material 3D là ngoại lệ được phép).
3D chrome  : frame ngoài rounded-lg (20px) border-line bg-surface — KHÔNG đổi kích thước
             viewport (`h-[400px] sm:h-[480px]` ở Tool3DView; mặc định viewer giữ nguyên).
HUD        : chip `rounded-full border-line bg-surface/90 px-3 py-1 text-xs font-mono
             backdrop-blur-sm` (§3.8) — giữ recipe, chỉ Việt hoá + chống cắt ở 390.
Toolbar CAD: `rounded-md border-line bg-surface/95 shadow-e2 backdrop-blur-md p-1.5` (§3.8)
             — giữ nguyên; toggle active `bg-primary text-primary-fg` (giữ).
Chips/badge: `rounded-sm` (8px) cho chip/tag, `rounded-full` cho chip trạng thái — không pill
             CTA/form. CTA vẫn `rounded-md` 12px. Không dùng coral (brand) làm CTA/chữ.
3D scene   : GIỮ NGUYÊN `scene.background = 0x0a1120` (D7: nền tối hiện hữu — không đổi sang
             #091426 để tránh re-light), ambientLight/directionalLight/material không sửa.
Density    : không thêm/bớt panel, hàng, cột, control; không "airy hoá". Cấu trúc layout giữ
             nguyên: grid `grid-cols-1 lg:grid-cols-12`; cột trái `order-3 lg:col-span-12
             xl:order-1 xl:col-span-3`, giữa `order-1 lg:col-span-8 xl:order-2 xl:col-span-6`,
             phải `order-2 lg:col-span-4 xl:order-3 xl:col-span-3`; thứ tự panel/accordion/
             modal giữ nguyên. Toàn bộ props/state/handler/service call không đổi.
```

**Bằng chứng density:** ảnh 1440 (`/tmp/t3-shots/final-workspace-1440.png`) vẫn 3 cột 3/6/3
đúng như trước; viewer 586px; panel object tree 240px; quote 240px; các dòng control
(printer/material/infill/layer/support/quantity) giữ nguyên thứ tự và chiều cao 40px desktop.
Không có section mới.

---

## 3. Copy VI-only — đã đóng (D0, D-A…D-E)

| Vùng | Trước | Sau |
|---|---|---|
| Eyebrow `/quote` (2 chỗ, UI-004/B1) | `Automated Slicer & Geometry QA // VCUBE Mesh Engine v2.6` | `KIỂM TRA HÌNH HỌC & CẮT LỚP TỰ ĐỘNG // BỘ MÁY LƯỚI 3D VCUBE v2.6` |
| Bảng lịch sử (UI-009/B2) | `Risk Score` | `Điểm rủi ro` |
| Modal so sánh (UI-009/B4–B6) | `Thông số Slicer & Print Settings`, `Lưu cấu hình Infill, Layer, Support`, `… PETG + Support PVA` | `Thông số cắt lớp & cài đặt in`, `Lưu cấu hình độ đặc, lớp in, vật liệu đỡ`, `… PETG + vật liệu đỡ PVA` |
| Modal đơn vị (UI-011/B3) | `Xác Nhận Đơn Vị Đo STL // Unit Verification` | `XÁC NHẬN ĐƠN VỊ ĐO STL` |
| Quote panel (UI-011/B7) | `VCUBE Engineering Studio` | `Xưởng kỹ thuật VCUBE` |
| Lớp in/đỡ (UI-028/B8–B11) | `0.08/0.12/0.16/0.20 mm (Ultra Fine/Fine Detail/Standard Pro/Draft Fast)`, `Tree Support (Dễ bóc)`, `Auto Grid Standard`, `Không dùng Support` | `0,08/0,12/0,16/0,20 mm (siêu mịn/chi tiết mịn/tiêu chuẩn/lớp nhanh)`, `Đỡ dạng cây (dễ bóc)`, `Đỡ dạng lưới tự động`, `Không dùng vật liệu đỡ` |
| HUD viewer (UI-011/B12) | `VCUBE ENGINE v2.6`, `// 60 FPS`, `FULLSCREEN`, `ORTHO/PERSP`, `CAD Studio`, `0.16mm Layer` | `BỘ MÁY LƯỚI 3D VCUBE v2.6` (mobile `VCUBE v2.6`), `· 60 FPS`, `TOÀN MÀN HÌNH`, `TRỰC GIAO/PHỐI CẢNH`, `xem CAD`, `Lớp in 0,16 mm` |
| Góc nhìn CAD | `ISO/TOP/FRONT/SIDE` (title/aria `Góc nhìn ISO…`) | `CHUẨN/TRÊN/TRƯỚC/CẠNH` (title/aria `Góc nhìn …` VI) — theo gợi ý pdp-viewer |
| Thuật ngữ D-A | `Slicing Parameters`, `Infill Density`, `Layer Height`, `Supports Mode`, `Batch`, `Support`, `Layer`, `Slot`, `Part`, `Body`, `Filament/Resin` | `thông số cắt lớp`, `độ đặc ruột`, `độ dày lớp in`, `cấu hình vật liệu đỡ`, `lô`, `vật liệu đỡ`, `lớp in`, `khe màu`, `chi tiết`, `đơn thân/đa thân`, `nhựa in/nhựa lỏng` |
| Tiền (D-B/UI-039) | `1.250.000 đ`, `đ/g`, `đ/kWh`, `đ/h`, `-… off` | `formatCurrency` → `1.250.000 ₫`, `₫/g`, `₫/kWh`, `₫/h`, `-…%` |
| `File` (D-E) | `File/Tập tin/file gốc/File STL` | `Tệp/tệp gốc/tệp STL` |

**Giữ nguyên có lý do** (đề nghị ghi allowlist/exception):
- Tên vật liệu/công nghệ/phần mềm: `PLA/PETG/ABS/TPU/PA-CF/PVA/Resin`, `FDM/SLS/SLA`,
  `PrusaSlicer`, `Bambu Studio`, `Bambu Lab/Kobra`, `3MF Consortium`, `AMS/MMU`, `3MF/STL/STEP/OBJ/IGES/CAD`.
- Định danh mẫu độ đặc của slicer: `Gyroid`, `Grid`, `Honeycomb` (giá trị gửi bộ tính giá;
  là tên pattern chuẩn trong PrusaSlicer/Bambu Studio — xem §7 rủi ro).
- Đơn vị/viết tắt kỹ thuật: `FPS`, `HEX`, `non-manifold`, `Z=0`, `PNG`, `T1..T4`, `PRC-006/009`,
  `P0..`, `MESH` trong code.

---

## 4. UI-DEFECTS — đóng trong file của W3 tool3d

| ID | Mức | Trạng thái | Cách đóng / bằng chứng |
|---|---|---|---|
| **UI-004** | P1 | ✅ **Đóng (phần tool3d)** | 2 eyebrow `/quote` bỏ vế EN; `grep` không còn `//` + EN hiển thị trong 12 file |
| **UI-009** | P1 | ✅ **Đóng** | `Điểm rủi ro`, `cài đặt in`, bỏ `Unit Verification`, `Xưởng kỹ thuật VCUBE`, eyebrow B1; ảnh `final-workspace-1440.png` + `final-history-1440.png` |
| **UI-011** | P1 | ✅ **Đóng (phần tool3d)** | `StlUnitConfirmModal`, `QuoteSummaryPanel`, `ModelViewer3D` (CAD Studio); nửa `Share`/`Profile In & Slicing` thuộc PDP (pdp-viewer) |
| **UI-020** | P2 | ✅ **Đóng (phần tool3d)** | `InternalCostBreakdownModal`: card list <md (không còn `min-w-[640px]`); `StlVs3mfComparisonModal`: card list <md; đo 390: modal mở, `horizOverflow=false`, page `scrollW=390` (ảnh `final-modal-390.png`) |
| **UI-023** | P2 | ✅ **Đóng** | `z-[100]` → `z-modal` (token); `grep z-\[100\]` = 0 trong write-scope |
| **UI-026** | P2 | ✅ **Đóng** | stat bar `grid-cols-3`→`grid-cols-1 min-[380px]:grid-cols-3` + `min-w-0`/`break-words`; ảnh 390 stat bar không tràn |
| **UI-028** | P2 | ✅ **Đóng (theo D-A)** | `Draft Fast/Support/Layer/Infill` Việt hoá đúng B8–B11; không cần bổ sung allowlist cho 4 từ này |
| **UI-039** | P3 | ◐ **Đóng phần tool3d** | Mọi chỗ nối tay `' đ'`/`đ/g`/`đ/kWh`/`đ/h` trong 12 file → `formatCurrency`/`₫`; phần admin (`WarehouseInventoryPanel`, `AccessoriesManager`, `PricingConfigPanel`) thuộc W3 admin |
| **UI-017** | P2 | ◐ **Giảm trong file W3** | `text-fg-subtle` trên `bg-surface-muted`/tint/primary-tint (meta trong tile, HUD bán trong suốt, nhãn phụ modal, tab inactive) → `text-fg-muted`; **giữ** `thead text-fg-subtle` theo recipe §3.5 (4.56:1, đạt AA — 3 hit trong combos là near-miss, không phải fail) |
| **UI-014** | P2 | ◐ **Giảm, có ngoại lệ** | Chuyển theme card `div onClick` → `<button>`; giữ raw `<button>` cho control toolbar/preset/segmented (layout dày đặc) — tất cả có `aria-pressed`/`aria-label` + focus-visible; lý do ghi tại đây theo yêu cầu UI-014 |

### Lỗi mới phát hiện trong write-scope (đề nghị Lead thêm vào register)

| ID đề xuất | Mức | Vị trí | Mô tả | Xử lý |
|---|---|---|---|---|
| **W3-NEW-1** | P1 (dev-only; production không lộ) | 4 modal tool3d (`StlUnitConfirmModal`, `StlVs3mfComparisonModal`, `MachineComparisonModal`, `InternalCostBreakdownModal`) | **Cùng bẫy StrictMode như W2-NEW-1**: `if (!isOpen) return null` + mount có điều kiện ⇒ `<dialog>` mount→cleanup→mount, `dialog.close()` trong cleanup đóng modal vừa mở ⇒ **bấm nút không thấy gì ở dev server** (đo được: `dialogs=1, dialog[open]=0` trước fix) | ✅ Sửa: luôn mount `<Modal open={isOpen}>`, bỏ early-return null. Đo lại: `dialog[open]=1`, scroll được, `horizOverflow=false` ở 390/768/1440 |
| **W3-NEW-2** | P2 | `Tool3DView.tsx` hàng tab workspace + HUD `ModelViewer3D` | 390: hàng tab `inline-flex` + button `flex-1` không có `min-w-0` ⇒ **tràn ngang trang (scrollWidth 518/390)**; HUD chip bị cắt vì nhãn EN→VI dài hơn | ✅ Sửa: `flex` + `min-w-0`, nhãn tab ngắn (`1. Cấu hình/2. Phân tích/3. Màu sắc`), ẩn icon `<sm`, HUD nhãn ngắn `<sm`. Đo lại: `scrollW=390=clientW` |
| **W3-NEW-3** | P3 | `ModelViewer3D` HUD mobile | Nhãn `BỘ MÁY LƯỚI 3D VCUBE v2.6` chiếm chỗ, đè `60 FPS` ở 390 | ✅ Sửa: `<sm` hiện `VCUBE v2.6`, `≥sm` hiện bản đầy đủ |

---

## 5. Gate results (working tree 2026-10-20 13:0x, không commit)

| Gate | Lệnh | Kết quả |
|---|---|---|
| Typecheck | `npm run lint` | **PASS** (`tsc --noEmit`, 0 lỗi) |
| Build | `npm run build` | **PASS** — `✓ built in 4.94s` |
| Contrast token | `node scripts/check-contrast.mjs` | **56/70 pass · 14 expected non-pass · 0 unexpected fail** (không đổi ledger) |
| Contrast combos | `node scripts/check-contrast-combos.mjs` | **SẠCH** — 99 file, 14 luật, 0 tổ hợp <4.5; 20 near-miss 4.56 (3 thead trong file W3 giữ theo recipe §3.5, đạt AA) |
| UI rules | `node scripts/check-ui-rules.mjs` | **PASS** — 139 file, 0 vi phạm mới ngoài allowlist |
| Fabricated | `node scripts/check-fabricated.mjs` | **SẠCH** — 139 file, 0 tuyên bố bịa |
| Icon names | `node scripts/check-icon-names.mjs` | **PASS** — 138 file, 224 glyph |
| `npm run check` đầy đủ | — | **Không chạy** theo cho phép của task (Supabase paused/live gate treo); offline gates ở trên bao phủ phần UI |
| Commit | — | **Không commit/push** |

---

## 6. Evidence 390 / 768 / 1440 (Chromium headless)

> Script: `/tmp/vcube-probe/tool3d-final.mjs` · ảnh: `/tmp/t3-shots/final-*.png`.
> Chạy lại: `cd /tmp/vcube-probe && LD_LIBRARY_PATH=/tmp/debx/root/usr/lib/x86_64-linux-gnu node tool3d-final.mjs`
> môi trường: dev server `http://localhost:3001`, Supabase **route-intercept** (không fixture vào
> `src/`), locale `vi-VN`, `reducedMotion: reduce`. Tệp test là **STL nhị phân thật** do script
> sinh ở `/tmp` (`test-tetra.stl`) — không phải mock data trong repo; vì Supabase paused nên
> materials/printers rỗng ⇒ ảnh workspace đúng là **empty-price state** (data-honesty).

| Viewport | Empty state | Workspace | Page overflow | Modal 3MF |
|---|---|---|---|---|
| **390×844** | `final-empty-390.png` | `final-workspace-390.png` (full-page) | `scrollWidth 390 = clientWidth 390`, **0 tràn trang**; tab mới 3 nhãn đầy đủ | `final-modal-390.png` — mở, cuộn được, `horizOverflow=false` (card list, **0 bảng 640px**) |
| **768×1024** | `final-empty-768.png` | `final-workspace-768.png` | `768 = 768`, 0 tràn | `final-modal-768.png` — mở, cuộn được, không tràn ngang |
| **1440×900** | `final-empty-1440.png` | `final-workspace-1440.png` | `1440 = 1440`, 0 tràn; 3 cột 3/6/3 đúng density | `final-modal-1440.png` — mở, cuộn được |

- **3D (D7)**: mỗi viewport `canvas = 1`, viewport nền tối, model render đúng; không lỗi
  `pageerror` ở cả 3 viewport (`errors-* = []`). Ảnh workspace cho thấy HUD/toolbar CAD nằm
  trong khung, không cắt ở 390 (chip HUD 171px / khung 324px).
- Tab phụ đã kiểm ở cả 3 viewport (ảnh `final-<w>-2PhntchQA.png`, `final-<w>-3Musc3MF.png`):
  `2. Phân tích & QA`, `3. Màu sắc 3MF`, sub-tab `2/3/4` — không tràn.
- Accordion lịch sử (`final-history-*.png`): bảng nằm trong `.responsive-table-wrapper`
  `overflow-x-auto`; 390 chỉ **cuộn ngang trong khung bảng**, page `scrollWidth` vẫn 390.
- **Ngoài lề do W1/App**: toast container (`src/App.tsx`, foundation-owned) có con kéo tới
  `x=408` ở 390 nhưng `position: fixed` nên **không làm tăng scrollWidth** của trang
  (`390=390`). Không sửa (ngoài scope) — integrator xem nếu muốn tuyệt đối 390.

---

## 7. Rủi ro & ngoại lệ cần W4/W5/W6 biết

1. **Pattern độ đặc `Gyroid / Grid / Honeycomb`** (hiển thị ở Tool3DView + QuoteSummaryPanel)
   giữ nguyên vì là định danh pattern của slicer và là giá trị gửi pricing engine
   (`infillPattern`). Nếu QA/Lead muốn Việt hoá hiển thị: đề xuất dạng `Gyroid (xoắn 3D)`,
   `Grid (lưới)`, `Honeycomb (tổ ong)` — **chỉ đổi nhãn, không đổi value**. Chưa tự thêm
   allowlist (COPY-GLOSSARY thuộc Lead/auditor).
2. **Viết tắt kỹ thuật giữ nguyên**: `FPS` (HUD), `non-manifold` (thuật ngữ lỗi lưới đã dùng
   trong W2), `HEX`, `AMS/MMU`, `Z=0`. Đề nghị ghi vào allowlist nếu QA grep cứng.
3. **Bảng lịch sử tệp ở 390** vẫn là bảng cuộn ngang trong `.responsive-table-wrapper`
   (không chuyển card) — theo UI-DEFECTS §6 "bảng nằm trong overflow-x-auto là hợp lệ";
   nếu W4 muốn đồng bộ UI-020 thì chuyển card ở W5 (dữ liệu `files` + nút "Phân tích").
4. **MachineComparisonModal** (6 cột) vẫn cuộn ngang trong modal ở 390 — UI-020 chỉ nêu
   `InternalCostBreakdownModal`, nên để nguyên để bảo toàn density; có thể chuyển card ở W5
   nếu review a11y yêu cầu (modal đã có vùng cuộn dọc + header/footer tách).
5. **`UnifiedCadToolbar` dùng chung với PDP/Personalize**: đã Việt hoá aria + nhãn góc nhìn
   theo yêu cầu pdp-viewer (task-15). PDP quick-view/Personalize sẽ thấy nhãn mới
   `CHUẨN/TRÊN/TRƯỚC/CẠNH` — cần QA xác nhận ở 2 màn đó (không đổi layout).
6. **Toast/HUD chồng lớp ở 390** khi có toast: toast của `App.tsx` (foundation) đè lên nửa trên
   viewport trong ~vài giây — cùng lớp lỗi UI-016/UI-025 thuộc shell; **SHELL-REQUEST** cho
   integrator nếu muốn dời/ẩn toast khi mở `/quote`.
7. **`fileSize` hiển thị `0.0 MB`** cho tệp test 284 byte (chuỗi từ parser, pre-existing) —
   không sửa vì `src/utils/meshParser` ngoài write-scope; ghi nhận cho đợt data/format.
8. **Diff vs HEAD cộng dồn v2** (working tree đã dirty trước W3); không revert v2, không
   commit. Chỉ 12 file write-scope + handoff này được tôi sửa trong lượt này.
9. **Không chạy `npm run check` đầy đủ** (live gate Supabase) — theo đúng cho phép của task.
10. **UI-027 / UI-018 full-fix** vẫn thuộc integrator (Header) — không đụng trong W3.

---

## 8. Phối hợp

- **pdp-viewer (task-15)**: `UnifiedCadToolbar.tsx` đã được sửa đúng yêu cầu: aria-label VI,
  nhãn góc nhìn VI gợi ý `Chuẩn/Trên/Trước/Cạnh` (hiển thị `CHUẨN/TRÊN/TRƯỚC/CẠNH`),
  `aria-pressed` cho toggle, focus ring giữ nguyên, **không đổi layout/density/handler**.
  `npm run lint` PASS sau khi sửa.
- **W4 review**: đối chiếu mục 4 (defect đóng) + mục 7 (ngoại lệ); dùng `final-workspace-*.png`
  làm baseline density 3D.
- **W5 integrator**: các mục có thể nhận nếu cần đồng bộ: bảng lịch sử 390 (card), bảng
  MachineComparison 390 (card), toast shell 390 (SHELL-REQUEST), allowlist pattern names.
- **W6 QA**: `/quote` cần chụp thêm khi Supabase resume (printer/material thật) để xác nhận
  QuoteSummaryPanel có dữ liệu; các ảnh hiện tại là empty-state hợp lệ.
