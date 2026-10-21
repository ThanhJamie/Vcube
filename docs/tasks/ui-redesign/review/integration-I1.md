<!-- doc-meta: status=active; verified=2026-10-19; owner=integrator-I1 -->
# Integration I1 — A11y & 3D/Invoice

> Phạm vi: 12 file được giao. Chỉ sửa `className`, thuộc tính ARIA/label và wrapper trình bày.
> Không đổi logic/handler/props/state/service call/chuỗi `isVi ?`; không chạm `ui/**`, `index.css`,
> `App.tsx`, backend/store/utils.

## 1. Mục đã sửa

### 1.1 Bảng trong modal bị cắt ở 390

| Mục | File:line | Cách sửa |
|---|---|---|
| R2 #8 | `tool3d/InternalCostBreakdownModal.tsx:223` | wrapper `overflow-hidden` → `overflow-x-auto`; `<table>` thêm `min-w-[640px]` |
| R2 #9 | `tool3d/StlVs3mfComparisonModal.tsx:90` | wrapper `overflow-x-auto`; `<table>` thêm `min-w-[600px]` |
| R2 #10 | `InvoiceModal.tsx:191` | wrapper `overflow-x-auto` (bỏ `overflow-hidden`); `<table>` thêm `min-w-[720px]`; giữ ngoại lệ bảng in §3.10 (`py-2/py-3`, số `font-mono tabular-nums` căn phải) |

### 1.2 Tap target < 44px ở mobile (`max-md:` only, desktop không đổi)

| Mục | File:line (hiện tại) | Cách sửa |
|---|---|---|
| R2 #2 | `ValidationReportPanel.tsx` — 3 tab (88/101/114), auto-fix (130), toggle lỗi (144), 3 nút so sánh (163/172/181) | `max-md:min-h-11` cho cả 8 |
| R2 #3 | `Group5ProductionPanel.tsx:425,442,461` (tab) + `:510` (chip vùng miền) | `max-md:min-h-11` |
| R2 #5 | `PresetPalettePanel.tsx:341,350` (slot 28×28) | `max-md:size-11` |
| R2 #5 | `PresetPalettePanel.tsx:363,373` | `max-md:min-h-11` |
| R2 #6 | `TransformControlsPanel.tsx:35,55,69,83` (reset + 3 tab) + preset scale/rotate/unit/lay-flat | `max-md:min-h-11` |
| R2 #6 | `Tool3DView.tsx:1361` (preset infill), `:1440` (batch qty), nút chọn file lịch sử | `max-md:min-h-11` |
| R2 #6 | `MachineComparisonModal.tsx:75` (đóng) | `max-md:size-11` |
| R2 #6 | `MachineComparisonModal.tsx:156,209` | `max-md:min-h-11` |
| R2 #6 | `StlUnitConfirmModal.tsx:89,96` | `max-md:min-h-11` |
| — | `Tool3DView.tsx:243,267` (ParseFailurePanel) | `max-md:min-h-11` (cùng nhóm nút raw 40px) |

### 1.3 Focus ring cho control raw

| Mục | File | Cách sửa |
|---|---|---|
| R2 #1 | `ValidationReportPanel.tsx` (8/8 nút), `TransformControlsPanel.tsx` (12 nút + 4 range), `PresetPalettePanel.tsx` (4 nút), `StlUnitConfirmModal.tsx` (2), `MachineComparisonModal.tsx` (3), `InternalCostBreakdownModal.tsx` (2), `StlVs3mfComparisonModal.tsx` (1), `Group5ProductionPanel.tsx` (7 tab/chip), `Tool3DView.tsx` (defect toggle, 3 compare, 3 sub-tab, infill, qty, history action, sample, retry/manual-review), `ThreeModelViewer.tsx` (range) | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` |
| — | `PresetPalettePanel.tsx:290` | `input[type=color]` opacity-0 → ring đặt trên `<label>` bằng `focus-within:ring-2 focus-within:ring-ring` (ring trên input vô hình) |

### 1.4 Field thiếu label lập trình được

| Mục | File:line | Cách sửa |
|---|---|---|
| R2 #11 | `AccessoriesManager.tsx:490–629` + `:658–790` | 22 field: mỗi `<label>` có `htmlFor`, control có `id` (`new-accessory-*` / `edit-accessory-*`); value/onChange/disabled giữ nguyên |
| R2 #12 | `Tool3DView.tsx:1294/1301` (máy in), `:1319/1326` (vật liệu), `:1383/1387` (layer height), `:1405/1409` (supports) | `htmlFor` + `id` |
| R2 #12 | `Tool3DView.tsx:1346/1368` (infill) | `htmlFor` + `id` + `aria-label="Độ đặc ruột (Infill Density)"` |
| R2 #15 | `Group5ProductionPanel.tsx:526` | `aria-label` cho Select lọc xưởng |
| R2 #15 | `Group5ProductionPanel.tsx:1137/1141` | `htmlFor="group5-job-notes"` + `id` cho textarea |
| R2 #15 + R1 #33 | `Group5ProductionPanel.tsx:1092` | `<label>` bao nhóm 8 nút → `<p>` micro-label (giữ style) |
| R2 #16 | `InternalCostBreakdownModal.tsx:318/322, :335/339` | `id` + `htmlFor`, `aria-describedby` trỏ cảnh báo audit (`override-audit-note`) và lỗi (`override-form-error`), `aria-invalid` theo `overrideError` |
| R2 #17 | `ThreeModelViewer.tsx:453` | `aria-label="Lớp cắt (%)"` |

### 1.5 Ngữ nghĩa tab/segmented

| Mục | File:line | Cách sửa |
|---|---|---|
| R2 #19 | `Group5ProductionPanel.tsx:425,442,461,510` | `type="button"` + `aria-pressed` (giữ nguyên handler) |
| R2 #19 | `Tool3DView.tsx:1627` (toggle lỗi), `:1645/1655/1665` (So Sánh), `:1355` (infill pattern), `:1433` (batch), `:1681/1696/1708` (sub-tab), `:1906` (chọn file) | `aria-pressed`; các tab đã có `type="button"` |
| — | `ValidationReportPanel.tsx:162/172/182`, `TransformControlsPanel.tsx` unit toggle | `aria-pressed` (cùng pattern segmented) |

### 1.6 Lệch recipe R1

| Mục | File:line | Cách sửa |
|---|---|---|
| R1 #12 / §3.6 | `Tool3DView.tsx:1624–1670` | toggle "Hiện/Tắt Vùng Lỗi" + segmented "So Sánh": active `bg-surface text-fg shadow-e1 font-semibold` (bỏ `bg-warning/bg-danger/bg-positive text-white`); chữ + icon giữ nguyên nên trạng thái không chỉ dựa màu |
| R1 #29 | `Tool3DView.tsx:1249, 1297, 1322, 1347` | giá trị/số liệu `text-primary` → `text-fg` |
| R1 #28 | `Tool3DView.tsx:1120, 1682, 1697, 1709` | `transition-all` → `transition-colors` (card hover không đổi) |
| R1 #27 (A19) | `Tool3DView.tsx:1013` | ô 48px `rounded-lg` → `rounded-md` |
| R1 #35 | `Tool3DView.tsx` (callout warning, score tile, watertight/wall/overhang tile) + `ValidationReportPanel.tsx:50–52, 251–255` + `StlUnitConfirmModal.tsx:42` + `InternalCostBreakdownModal.tsx:154` | viền trạng thái `/30`–`/40` → `/20` |
| R1 #14 | `PresetPalettePanel.tsx:291` | bỏ `group-hover:scale-105 transition-transform` trên swatch (§2.5) |
| R1 #12 (mở rộng cùng file) | `ValidationReportPanel.tsx` toggle/compare | active về §3.6, giữ nhãn "Chuẩn / Trước Khi Sửa / Sau Khi Sửa" |

## 2. Mục bỏ qua / chưa làm

| Mục | Lý do |
|---|---|
| R2 #13, #14, #18, #20–#26, #29–#30 | File ngoài danh sách 12 file (ProductDetail/HomeView/Header/UserAvatar/CartDrawer/ui/AuthModal…) |
| R2 #27 `CanvasErrorBoundary.tsx`, `RoleGuard.tsx` | Ngoài danh sách file |
| R2 #28 `ModelViewer3D.tsx`, `PersonalizeModelViewer3D.tsx` | Ngoài danh sách file |
| R1 #29 `PersonalizeView`, `MyOrdersView` | Ngoài danh sách file |
| R2 #35 `QuoteSummaryPanel.tsx` | Không nằm trong 12 file được giao (đã có integrator/owner khác) — hiện vẫn còn `/30`–`/40` |
| Ring `focus:ring-ring/20` trên raw input `AccessoriesManager` + textarea `Group5` | Đã có ring sẵn; prompt yêu cầu bỏ qua phần tử đã có ring. Đây vẫn là nợ §3.10 (ring 20% chỉ trang trí) — xem §4 |
| Theme card `<div onClick>` trong `PresetPalettePanel` | Không có trong danh sách review; đổi sang `<button>` kèm `onKeyDown` sẽ là thêm handler (ngoài bất biến "không đổi handler") — xem §4 |
| Browser 390/768/1440 | Phiên này không có Playwright MCP; mới xác nhận tĩnh. Cần Wave 4 đo `scrollWidth <= 390` cho 3 modal bảng |

## 3. Gate

```
npx tsc --noEmit                     PASS (exit 0)
npm run build                        PASS (✓ built in 7.07s)
node scripts/check-contrast.mjs      PASS (RC=0)
node scripts/check-contrast-combos   PASS (RC=0; chỉ còn cặp 4.61:1 đã biết)
node scripts/check-ui-rules.mjs      PASS — 0 vi phạm mới ngoài allowlist
```

Số dòng so với trước khi sửa: lớn nhất `AccessoriesManager +22/+787 (+2.8%)`, các file còn lại ≤ +1.8% — dưới ngưỡng 5%.

## 4. Rủi ro còn lại

1. **390 chưa đo bằng browser**: 3 bảng đã có `overflow-x-auto + min-w`, nhưng cần xác nhận `document.documentElement.scrollWidth <= 390` khi modal mở (đặc biệt `InvoiceModal` lồng trong `<dialog>`).
2. **Ring 20% trên input raw**: `AccessoriesManager` (22 field) và textarea `Group5` vẫn dùng `focus:ring-ring/20`; viền `border-primary` 1px là indicator chính. Nếu Wave 4 siết §3.10, cần đổi sang ring đặc.
3. **Theme card chỉ dùng chuột**: 4 thẻ `PRESET_PALETTE_THEMES` là `<div onClick>` (không tab được). Cần một quyết định của orchestrator (đổi sang `<button>` = thêm phần tử tương tác, ngoài danh sách review).
