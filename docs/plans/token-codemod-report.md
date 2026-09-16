> [!WARNING]
> **TÀI LIỆU LỊCH SỬ (SUPERSEDED — archived 2026-09).** Thư mục `docs/plans/**` là bộ kế hoạch refactor cũ và **không còn là nguồn chuẩn**. Nguồn chuẩn hiện tại: `docs/README.md` → `docs/architecture/`, `docs/pages/`, `docs/database/`, `docs/security/`, `docs/SETUP_RUNBOOK.md`. Nội dung được giữ nguyên để tra cứu lịch sử; **mọi số liệu (số bảng/index/policy, bundle, phase) trong đây đã lạc hậu** so với code. Xem `docs/archive/README.md`.

# Báo cáo codemod token — Stage A (`docs/plans/01-theme-migration.md` §3.2–§3.4)

> Sinh tự động bởi `scripts/codemod-tokens.mjs`. **Không sửa tay.**

- Lệnh: `node scripts/codemod-tokens.mjs --dry-run`
- Chế độ: **DRY-RUN (không ghi file)**
- Phạm vi (`--dir`): `src`
- Loại trừ: `src/frontend/ui`, `src/frontend/theme`
- File `.tsx`/`.jsx` đã quét: **65**
- Utility dạng `prefix-[#hex][/opacity]` tìm thấy trong `className`/`class`: **4398**
- Sẽ thay thế: **3570**
- Từ chối (không map được, cần xử lý tay): **828**
- File bị sửa: **0**

---

## 1. Token → số chỗ thay thế

| Token | Số chỗ | Tiền tố | Ví dụ |
|---|---:|---|---|
| `primary` | 1146 | `text-`(473), `border-`(290), `bg-`(281), `ring-`(59), `accent-`(22), `from-`(15), `to-`(3), `shadow-`(2), `border-l-`(1) | `border-(#00687A) → border-primary  (src/App.tsx:123)`<br>`bg-(#00687A) → bg-primary  (src/App.tsx:139)`<br>`bg-(#00687A) → bg-primary  (src/App.tsx:257)` |
| `fg` | 666 | `text-`(666) | `text-(#091426) → text-fg  (src/App.tsx:135)`<br>`text-(#091426) → text-fg  (src/App.tsx:248)`<br>`text-(#091426) → text-fg  (src/App.tsx:263)` |
| `line` | 512 | `border-`(498), `divide-`(8), `bg-`(5), `text-`(1) | `border-(#CBD5E1) → border-line  (src/App.tsx:133)`<br>`border-(#CBD5E1) → border-line  (src/App.tsx:246)`<br>`border-(#CBD5E1) → border-line  (src/App.tsx:263)` |
| `fg-subtle` | 342 | `text-`(326), `placeholder-`(16) | `text-(#64748B) → text-fg-subtle  (src/App.tsx:124)`<br>`text-(#64748B) → text-fg-subtle  (src/App.tsx:134)`<br>`text-(#64748B) → text-fg-subtle  (src/App.tsx:136)` |
| `fg-muted` | 225 | `text-`(223), `border-`(2) | `border-(#545F73)/30 → border-fg-muted/30  (src/App.tsx:1181)`<br>`border-(#545F73)/50 → border-fg-muted/50  (src/App.tsx:1288)`<br>`text-(#545F73) → text-fg-muted  (src/frontend/components/Header.tsx:111)` |
| `canvas` | 205 | `bg-`(203), `from-`(2) | `bg-(#F8FAFC) → bg-canvas  (src/App.tsx:121)`<br>`bg-(#F8FAFC) → bg-canvas  (src/App.tsx:132)`<br>`bg-(#F8FAFC) → bg-canvas  (src/App.tsx:245)` |
| `accent` | 128 | `text-`(77), `border-`(21), `bg-`(20), `to-`(4), `ring-`(3), `accent-`(2), `via-`(1) | `bg-(#57DFFE) → bg-accent  (src/App.tsx:1184)`<br>`border-(#57DFFE)/30 → border-accent/30  (src/App.tsx:1203)`<br>`text-(#57DFFE) → text-accent  (src/App.tsx:1207)` |
| `surface-inverse` | 119 | `bg-`(114), `from-`(4), `to-`(1) | `bg-(#091426) → bg-surface-inverse  (src/App.tsx:1181)`<br>`bg-(#091426) → bg-surface-inverse  (src/App.tsx:1202)`<br>`bg-(#091426) → bg-surface-inverse  (src/App.tsx:1203)` |
| `surface-muted` | 69 | `bg-`(69) | `bg-(#F8F9FF)/95 → bg-surface-muted/95  (src/frontend/components/Header.tsx:84)`<br>`bg-(#F8F9FF) → bg-surface-muted  (src/frontend/components/NotFoundView.tsx:11)`<br>`bg-(#F8F9FF) → bg-surface-muted  (src/frontend/components/RoleGuard.tsx:50)` |
| `line-subtle` | 59 | `border-`(33), `bg-`(23), `divide-`(3) | `bg-(#F1F5F9) → bg-line-subtle  (src/frontend/components/AuthModal.tsx:304)`<br>`border-(#E2E8F0) → border-line-subtle  (src/frontend/components/AuthModal.tsx:414)`<br>`border-(#E2E8F0) → border-line-subtle  (src/frontend/components/AuthModal.tsx:438)` |
| `primary-hover` | 52 | `bg-`(44), `from-`(6), `text-`(1), `to-`(1) | `bg-(#005260) → bg-primary-hover  (src/App.tsx:139)`<br>`bg-(#005260) → bg-primary-hover  (src/App.tsx:257)`<br>`bg-(#005260) → bg-primary-hover  (src/frontend/components/CanvasErrorBoundary.tsx:83)` |
| `surface-inverse-raised` | 38 | `bg-`(35), `to-`(3) | `bg-(#1E293B) → bg-surface-inverse-raised  (src/App.tsx:1181)`<br>`bg-(#1E293B) → bg-surface-inverse-raised  (src/App.tsx:1288)`<br>`bg-(#1E293B) → bg-surface-inverse-raised  (src/frontend/components/AuthModal.tsx:582)` |
| `line-control` | 6 | `border-`(6) | `border-(#94A3B8) → border-line-control  (src/frontend/components/AuthModal.tsx:657)`<br>`border-(#94A3B8) → border-line-control  (src/frontend/components/AuthModal.tsx:679)`<br>`border-(#94A3B8) → border-line-control  (src/frontend/components/AuthModal.tsx:701)` |
| `warning-strong` | 2 | `text-`(2) | `text-(#D97706) → text-warning-strong  (src/frontend/views/ExploreView.tsx:827)`<br>`text-(#D97706) → text-warning-strong  (src/frontend/views/ProductDetailView.tsx:519)` |
| `surface` | 1 | `bg-`(1) | `bg-(#FFFFFF) → bg-surface  (src/frontend/views/HomeView.tsx:457)` |

## 2. Màu KHÔNG map được — phải xử lý tay

Không đoán. Mọi hex dưới đây nằm ngoài bảng §3.2 (hoặc có trong bảng nhưng tiền tố không ứng với vai trò nào).

### 2.1 Tổng hợp theo hex

| Hex | Số chỗ | Tiền tố | Số file | Gợi ý |
|---|---:|---|---:|---|
| `#c5c6cd` | 261 | border(258), bg(2), divide(1) | 9 | Xám trung tính "viền" (261 chỗ) — Stage B: line hoặc line-control |
| `#1c1c1c` | 85 | text(74), bg(9), border(2) | 9 | Bảng "editorial" (§3.2) — Stage B (mực đen ấm) |
| `#7d7565` | 52 | text(52) | 10 | Bảng "editorial" (§3.2) — Stage B (fg-muted?) |
| `#1e293b` | 50 | text(34), border(16) | 11 | Đã có token surface-inverse-raised cho bg-/from-/to-; text-/border- cần người chốt (Stage B) |
| `#334155` | 47 | text(27), border(17), bg(3) | 12 | Slate-700 — Stage B: fg hoặc fg-muted |
| `#475569` | 37 | text(37) | 11 | Slate-600 — Stage B: fg-muted |
| `#5a554c` | 28 | text(28) | 6 | Xám nâu editorial — Stage B |
| `#f7f6f2` | 24 | bg(24) | 6 | Bảng "editorial" (§3.2) — Stage B: chọn token storefront |
| `#0f172a` | 22 | text(20), bg(2) | 5 | Slate-900 — Stage B: fg |
| `#e5eeff` | 21 | divide(9), bg(7), border(5) | 7 | Nền/viền xanh nhạt — Stage B |
| `#eff4ff` | 17 | bg(17) | 6 | Nền xanh rất nhạt — Stage B: surface-muted? |
| `#005463` | 17 | bg(17) | 10 | Biến thể teal tối — Stage B: primary-hover? |
| `#0b1c30` | 13 | text(9), bg(4) | 3 | Navy tối — Stage B |
| `#004e5c` | 10 | bg(9), text(1) | 1 | Biến thể teal tối — Stage B: primary-hover? |
| `#990000` | 10 | text(6), bg(4) | 2 | Đỏ đậm — Stage B: danger |
| `#faf9f5` | 9 | bg(9) | 6 | Bảng "editorial" (§3.2) — Stage B |
| `#eae8e0` | 8 | bg(8) | 3 | Bảng "editorial" (§3.2) — Stage B |
| `#0e7490` | 7 | to(7) | 4 | §3.2: gradient stop, 1 chỗ ở HomeView — xử lý tay (Stage B) |
| `#00515f` | 7 | bg(7) | 1 | Biến thể teal tối — Stage B: primary-hover? |
| `#75777d` | 5 | text(5) | 2 | Xám trung tính — Stage B: fg-subtle |
| `#085f75` | 5 | to(5) | 3 | Biến thể teal — Stage B |
| `#f4f6f9` | 4 | bg(4) | 2 | Nền xám rất nhạt — Stage B |
| `#5f6368` | 4 | text(4) | 1 | Xám Google-ish — Stage B: fg-muted |
| `#664d03` | 4 | text(4) | 3 | Vàng nâu (warning text) — Stage B: warning |
| `#dce9ff` | 4 | bg(4) | 2 | Nền xanh nhạt — Stage B |
| `#ffd700` | 4 | bg(2), text(2) | 2 | Vàng kim (sao) — Stage B: warning-strong |
| `#0f1d32` | 3 | bg(3) | 1 | Navy tối — Stage B |
| `#333333` | 3 | bg(3) | 2 | Xám đậm — Stage B |
| `#1a0dab` | 3 | text(3) | 1 | Xanh link Google — Stage B: info |
| `#0284c7` | 3 | to(2), via(1) | 2 | Sky-600 (gradient) — Stage B: info |
| `#d8e3fb` | 3 | bg(3) | 1 | Xám xanh đã loại khỏi chữ — chỉ map khi là CHỮ; bg- cần người chốt (Stage B) |
| `#166534` | 3 | text(3) | 1 | Xanh lá đậm — Stage B: positive |
| `#8c857b` | 3 | text(2), placeholder(1) | 1 | Xám nâu editorial — Stage B |
| `#1c2c45` | 2 | bg(2) | 1 | Navy tối — Stage B: surface-inverse-raised |
| `#1e40af` | 2 | text(2) | 1 | Blue-800 — Stage B: info |
| `#202124` | 2 | text(2) | 1 | Xám Google-ish — Stage B: fg |
| `#4d5156` | 2 | text(2) | 1 | Xám Google-ish — Stage B: fg-muted |
| `#0369a1` | 2 | to(2) | 1 | Sky-700 (gradient) — Stage B: info |
| `#fff8e6` | 2 | bg(2) | 2 | Vàng rất nhạt (nền) — Stage B |
| `#dcfce7` | 2 | bg(2) | 1 | Nền xanh nhạt — Stage B |
| `#1c0a0a` | 1 | bg(1) | 1 | Nền đỏ rất tối (toast) — Stage B: danger nền |
| `#ef4444` | 1 | border(1) | 1 | Red-500 (viền) — Stage B: danger |
| `#fca5a5` | 1 | text(1) | 1 | Đỏ nhạt (chữ trên nền tối) — Stage B: danger |
| `#1c1608` | 1 | bg(1) | 1 | Nền vàng rất tối (toast) — Stage B: warning nền |
| `#f59e0b` | 1 | border(1) | 1 | Amber-500 (viền) — Stage B: warning-strong |
| `#fde68a` | 1 | text(1) | 1 | Vàng nhạt (chữ trên nền tối) — Stage B: warning |
| `#10b981` | 1 | border(1) | 1 | Emerald (viền) — Stage B: positive |
| `#070f1e` | 1 | bg(1) | 1 | Navy gần đen — Stage B: surface-inverse |
| `#132238` | 1 | bg(1) | 1 | Navy tối — Stage B: surface-inverse |
| `#00879e` | 1 | bg(1) | 1 | Biến thể teal sáng — Stage B |
| `#eff6ff` | 1 | bg(1) | 1 | Nền xanh rất nhạt — Stage B |
| `#bfdbfe` | 1 | border(1) | 1 | Viền xanh nhạt — Stage B |
| `#d5cfc5` | 1 | text(1) | 1 | Bảng "editorial" (§3.2) — Stage B |
| `#d0e2ff` | 1 | bg(1) | 1 | Nền xanh nhạt — Stage B |
| `#fafafa` | 1 | bg(1) | 1 | Nền trắng ngà — Stage B: surface |
| `#fafbfd` | 1 | bg(1) | 1 | Nền xám nhạt — Stage B: canvas |
| `#131f33` | 1 | bg(1) | 1 | Navy tối — Stage B: surface-inverse |
| `#00a8c6` | 1 | text(1) | 1 | Biến thể cyan — Stage B: accent |
| `#060d1a` | 1 | bg(1) | 1 | Navy gần đen — Stage B: surface-inverse |
| `#7a5b00` | 1 | text(1) | 1 | Vàng nâu đậm — Stage B |
| `#fffdf0` | 1 | bg(1) | 1 | Vàng rất nhạt (nền) — Stage B |
| `#f0f7ff` | 1 | bg(1) | 1 | Nền xanh rất nhạt — Stage B |
| `#b8d5ff` | 1 | border(1) | 1 | Viền xanh nhạt — Stage B |
| `#004b87` | 1 | text(1) | 1 | Xanh dương — Stage B: info |
| `#204060` | 1 | text(1) | 1 | Navy trung tính — Stage B: fg-muted |
| `#111111` | 1 | bg(1) | 1 | Đen tuyệt đối — Stage B (tokens.md §1: không dùng #000) |
| `#e0ddd5` | 1 | bg(1) | 1 | Bảng "editorial" (§3.2) — Stage B |
| `#4cd7f6` | 1 | bg(1) | 1 | Biến thể cyan — Stage B: accent |
| `#001f26` | 1 | text(1) | 1 | Navy rất tối — Stage B: fg |
| `#ffedd5` | 1 | bg(1) | 1 | Cam rất nhạt (nền) — Stage B |
| `#9a3412` | 1 | text(1) | 1 | Cam nâu đậm — Stage B |
| `#fed7aa` | 1 | border(1) | 1 | Cam nhạt (viền) — Stage B |
| `#bbf7d0` | 1 | border(1) | 1 | Viền xanh nhạt — Stage B |
| `#d3e4fe` | 1 | bg(1) | 1 | Nền xanh nhạt — Stage B |
| `#ea580c` | 1 | text(1) | 1 | Cam đậm — Stage B: warning-strong |
| `#c59b27` | 1 | text(1) | 1 | Vàng kim tối — Stage B: warning-strong |
| `#11233b` | 1 | via(1) | 1 | Navy tối (gradient) — Stage B |
| `#f8f9fa` | 1 | bg(1) | 1 | Nền xám nhạt — Stage B: canvas |

### 2.2 Chi tiết `file:line`

#### `#c5c6cd` — 261 chỗ · Xám trung tính "viền" (261 chỗ) — Stage B: line hoặc line-control

- `src/frontend/components/Header.tsx`:84, 244, 310, 401
- `src/frontend/components/RoleGuard.tsx`:51, 68, 90
- `src/frontend/components/admin/AccessoriesManager.tsx`:132, 163, 172, 182, 194, 197, 223, 376, 400, 411, 420, 439, 450, 462, 474, 485, 496, 507, 518, 523, 527, 547, 570, 581, 590, 608, 618, 629, 640, 651, 662, 672, 682, 687, 691
- `src/frontend/components/admin/AdminProductsPanel.tsx`:145, 154, 164, 176, 195, 197, 220, 285, 315, 316, 332, 344, 352, 368, 377, 388, 400, 409, 432, 433, 450, 462, 470, 486, 495, 506, 519, 524
- `src/frontend/components/admin/AdminSettingsPanel.tsx`:27, 55, 56, 68, 78, 88, 95, 96, 102, 115
- `src/frontend/components/admin/PricingConfigPanel.tsx`:289, 309, 325, 406, 407, 428, 437, 452, 462, 475, 487, 499, 510, 517, 518, 538, 552, 562, 572, 582, 592, 602, 613, 614, 649, 660, 669, 674, 684, 695, 706, 716, 729, 730, 747, 756, 765, 774, 785, 795, 817, 818, 836, 848, 856, 857, 877, 893, 903, 904, 923, 934, 945, 956, 978, 994, 995, 1008, 1042, 1052, 1055, 1076, 1092, 1093, 1108, 1115, 1145, 1156, 1159, 1211, 1212, 1234, 1244, 1255, 1266, 1289, 1297, 1308, 1318, 1334, 1338, 1357, 1358, 1380, 1390, 1399, 1422, 1436, 1450, 1462, 1473, 1484, 1495, 1522, 1526
- `src/frontend/components/admin/WarehouseInventoryPanel.tsx`:74, 89, 104, 119, 190, 220, 227, 228, 240, 358, 359, 371, 402
- `src/frontend/components/admin/WorkshopEstimatorBOM.tsx`:181, 211, 224, 234, 241, 253, 268, 285, 297, 309, 349, 382, 500
- `src/frontend/views/DesignerDashboardView.tsx`:343, 371, 380, 407, 418, 427, 436, 450, 451, 520, 526, 535, 548, 559, 562, 580, 646, 682, 689, 696, 704, 711, 719, 729, 770, 803, 804, 842, 843, 907, 908, 954, 955, 1012, 1033, 1035, 1036, 1069, 1090, 1102, 1133, 1157, 1160, 1214, 1215, 1240, 1241, 1247, 1282, 1283, 1414, 1418, 1437, 1438, 1469, 1473, 1496, 1497, 1513, 1522

#### `#1c1c1c` — 85 chỗ · Bảng "editorial" (§3.2) — Stage B (mực đen ấm)

- `src/frontend/components/ChatSupportModal.tsx`:45, 47, 53, 76, 77, 93, 107, 111
- `src/frontend/components/tool3d/InternalCostBreakdownModal.tsx`:147, 171, 181, 203, 206, 223, 239, 247, 253, 293, 306, 313, 332, 336
- `src/frontend/components/tool3d/ObjectTreePanel.tsx`:81, 93, 158, 165, 212
- `src/frontend/components/tool3d/PresetPalettePanel.tsx`:186, 239, 302, 308, 317, 373
- `src/frontend/components/tool3d/StlVs3mfComparisonModal.tsx`:108, 115, 125
- `src/frontend/components/tool3d/TransformControlsPanel.tsx`:29, 37, 50, 60, 70, 83, 102, 118, 132, 139, 147, 155, 234, 249, 258
- `src/frontend/components/tool3d/ValidationReportPanel.tsx`:52, 64, 73, 82, 114, 131, 140, 149, 188, 194, 230, 238, 245, 261, 265, 277, 285
- `src/frontend/views/DesignerDashboardView.tsx`:580
- `src/frontend/views/HomeView.tsx`:468, 513, 518, 537, 546, 571, 590, 629, 661, 752, 761, 805, 877, 890, 899

#### `#7d7565` — 52 chỗ · Bảng "editorial" (§3.2) — Stage B (fg-muted?)

- `src/frontend/components/ChatSupportModal.tsx`:82
- `src/frontend/components/admin/AccessoriesManager.tsx`:249
- `src/frontend/components/tool3d/InternalCostBreakdownModal.tsx`:146, 150, 170, 174, 192, 205, 246, 252, 258, 331
- `src/frontend/components/tool3d/ObjectTreePanel.tsx`:78, 126, 174, 191, 208, 224
- `src/frontend/components/tool3d/PresetPalettePanel.tsx`:208, 226, 242, 270, 311, 325, 329, 333, 360
- `src/frontend/components/tool3d/StlVs3mfComparisonModal.tsx`:127
- `src/frontend/components/tool3d/TransformControlsPanel.tsx`:26, 37, 99
- `src/frontend/components/tool3d/ValidationReportPanel.tsx`:49, 126, 163, 229, 237, 244, 251, 260, 264, 276, 280, 284, 288, 289
- `src/frontend/views/AssetLibraryView.tsx`:117, 145
- `src/frontend/views/HomeView.tsx`:471, 505, 518, 794, 802

#### `#1e293b` — 50 chỗ · Đã có token surface-inverse-raised cho bg-/from-/to-; text-/border- cần người chốt (Stage B)

- `src/App.tsx`:1272, 1364
- `src/frontend/components/AuthModal.tsx`:243
- `src/frontend/components/CanvasErrorBoundary.tsx`:39
- `src/frontend/components/PageSkeleton.tsx`:39
- `src/frontend/components/ThreeModelViewer.tsx`:345
- `src/frontend/components/admin/AdminSidebar.tsx`:214, 219, 268, 304, 367
- `src/frontend/components/admin/AdminStorefrontPanel.tsx`:148, 159, 170, 181, 192, 203, 221, 239, 257, 309, 320, 331, 359, 370, 389, 398, 415, 424, 441, 450, 478, 489, 500, 511, 522, 533, 561, 572, 585, 595, 605, 615, 625, 635
- `src/frontend/views/AssetLibraryView.tsx`:270
- `src/frontend/views/DesignerDashboardView.tsx`:812, 1446
- `src/frontend/views/PersonalizeView.tsx`:256
- `src/frontend/views/ProductDetailView.tsx`:263

#### `#334155` — 47 chỗ · Slate-700 — Stage B: fg hoặc fg-muted

- `src/frontend/components/AuthModal.tsx`:511, 531, 568, 647, 657, 679, 701, 722, 739, 759, 775, 833
- `src/frontend/components/MaterialComparisonMatrix.tsx`:371, 378
- `src/frontend/components/ThreeModelViewer.tsx`:352, 376
- `src/frontend/components/admin/AdminSidebar.tsx`:349, 372
- `src/frontend/components/personalize/PersonalizeModelViewer3D.tsx`:710, 739
- `src/frontend/components/tool3d/InternalCostBreakdownModal.tsx`:264
- `src/frontend/components/tool3d/ModelViewer3D.tsx`:1563, 1584, 1596, 1613, 1615, 1633, 1664, 1670, 1720, 1830
- `src/frontend/components/tool3d/QuoteSummaryPanel.tsx`:453, 485
- `src/frontend/components/tool3d/UnifiedCadToolbar.tsx`:36, 40
- `src/frontend/views/LoginView.tsx`:97, 115, 157
- `src/frontend/views/OrderTrackingView.tsx`:546
- `src/frontend/views/RegisterView.tsx`:165, 175, 197, 219, 240, 257, 277, 319

#### `#475569` — 37 chỗ · Slate-600 — Stage B: fg-muted

- `src/frontend/components/MaterialComparisonMatrix.tsx`:234, 298, 311, 324, 337, 350
- `src/frontend/components/admin/AdminSeoPanel.tsx`:99, 111, 123, 135, 456
- `src/frontend/components/admin/AdminStorefrontPanel.tsx`:77, 89, 101, 113, 125
- `src/frontend/components/tool3d/MachineComparisonModal.tsx`:160
- `src/frontend/views/CartView.tsx`:413
- `src/frontend/views/CheckoutView.tsx`:460, 576
- `src/frontend/views/DesignerDashboardView.tsx`:625
- `src/frontend/views/ExploreView.tsx`:329, 473, 493, 522, 533, 544, 555, 614, 842, 862
- `src/frontend/views/HomeView.tsx`:245
- `src/frontend/views/ProductDetailView.tsx`:396, 459, 470, 546
- `src/frontend/views/RegisterView.tsx`:355

#### `#5a554c` — 28 chỗ · Xám nâu editorial — Stage B

- `src/frontend/components/tool3d/InternalCostBreakdownModal.tsx`:185, 204, 248, 254
- `src/frontend/components/tool3d/ObjectTreePanel.tsx`:101, 111, 158, 231
- `src/frontend/components/tool3d/PresetPalettePanel.tsx`:222, 266
- `src/frontend/components/tool3d/StlVs3mfComparisonModal.tsx`:107, 129
- `src/frontend/components/tool3d/TransformControlsPanel.tsx`:50, 60, 70, 166, 188, 204, 243, 249, 258
- `src/frontend/components/tool3d/ValidationReportPanel.tsx`:64, 73, 82, 131, 140, 149, 166

#### `#f7f6f2` — 24 chỗ · Bảng "editorial" (§3.2) — Stage B: chọn token storefront

- `src/frontend/components/ChatSupportModal.tsx`:45, 70, 93, 107
- `src/frontend/components/tool3d/InternalCostBreakdownModal.tsx`:145, 192, 330
- `src/frontend/components/tool3d/ObjectTreePanel.tsx`:93, 212
- `src/frontend/components/tool3d/PresetPalettePanel.tsx`:373
- `src/frontend/components/tool3d/TransformControlsPanel.tsx`:45, 118, 139, 147, 155, 234, 244
- `src/frontend/components/tool3d/ValidationReportPanel.tsx`:59, 161, 228, 236, 243, 250, 274

#### `#0f172a` — 22 chỗ · Slate-900 — Stage B: fg

- `src/frontend/components/AuthModal.tsx`:524, 552, 557, 614, 733, 750, 770, 786, 844, 861
- `src/frontend/components/tool3d/ModelViewer3D.tsx`:1615
- `src/frontend/components/tool3d/UnifiedCadToolbar.tsx`:40
- `src/frontend/views/LoginView.tsx`:108, 134, 139, 197
- `src/frontend/views/RegisterView.tsx`:251, 268, 288, 293, 330, 403

#### `#e5eeff` — 21 chỗ · Nền/viền xanh nhạt — Stage B

- `src/frontend/components/Header.tsx`:130
- `src/frontend/components/admin/AccessoriesManager.tsx`:209, 342
- `src/frontend/components/admin/AdminProductsPanel.tsx`:209
- `src/frontend/components/admin/PricingConfigPanel.tsx`:1014, 1277
- `src/frontend/components/admin/WarehouseInventoryPanel.tsx`:251, 382
- `src/frontend/components/admin/WorkshopEstimatorBOM.tsx`:212, 242, 350, 382, 501, 506
- `src/frontend/views/DesignerDashboardView.tsx`:393, 460, 476, 573, 1040, 1046, 1256

#### `#eff4ff` — 17 chỗ · Nền xanh rất nhạt — Stage B: surface-muted?

- `src/frontend/components/AuthModal.tsx`:874
- `src/frontend/components/Header.tsx`:209, 299, 401
- `src/frontend/components/RoleGuard.tsx`:68
- `src/frontend/components/admin/AdminProductsPanel.tsx`:197
- `src/frontend/views/DesignerDashboardView.tsx`:562, 598, 737, 914, 933, 1220, 1247, 1361, 1513
- `src/frontend/views/PersonalizeView.tsx`:543

#### `#005463` — 17 chỗ · Biến thể teal tối — Stage B: primary-hover?

- `src/frontend/components/Header.tsx`:381
- `src/frontend/components/NotFoundView.tsx`:34
- `src/frontend/components/RoleGuard.tsx`:82
- `src/frontend/components/admin/AccessoriesManager.tsx`:153, 533, 697
- `src/frontend/components/admin/AdminProductsPanel.tsx`:186, 419, 534
- `src/frontend/components/admin/AdminSettingsPanel.tsx`:46
- `src/frontend/components/admin/WorkshopEstimatorBOM.tsx`:198
- `src/frontend/components/admin/groups/Group0OverviewPanel.tsx`:121
- `src/frontend/components/admin/groups/Group5ProductionPanel.tsx`:494, 718
- `src/frontend/views/HomeView.tsx`:675, 815, 913

#### `#0b1c30` — 13 chỗ · Navy tối — Stage B

- `src/frontend/components/CadQuickViewModal.tsx`:186
- `src/frontend/views/DesignerDashboardView.tsx`:339, 371, 593, 597, 1115, 1259, 1282, 1437, 1496
- `src/frontend/views/ProductDetailView.tsx`:266, 270, 286

#### `#004e5c` — 10 chỗ · Biến thể teal tối — Stage B: primary-hover?

- `src/frontend/views/DesignerDashboardView.tsx`:364, 637, 763, 1019, 1038, 1083, 1143, 1205, 1424, 1529

#### `#990000` — 10 chỗ · Đỏ đậm — Stage B: danger

- `src/frontend/views/ExploreView.tsx`:325, 328, 335, 790, 859
- `src/frontend/views/HomeView.tsx`:625, 628, 634, 703, 780

#### `#faf9f5` — 9 chỗ · Bảng "editorial" (§3.2) — Stage B

- `src/frontend/components/admin/PricingConfigPanel.tsx`:747
- `src/frontend/components/admin/WorkshopEstimatorBOM.tsx`:382
- `src/frontend/components/tool3d/InternalCostBreakdownModal.tsx`:169, 202, 238
- `src/frontend/components/tool3d/ObjectTreePanel.tsx`:109
- `src/frontend/components/tool3d/PresetPalettePanel.tsx`:220, 323
- `src/frontend/components/tool3d/ValidationReportPanel.tsx`:91

#### `#eae8e0` — 8 chỗ · Bảng "editorial" (§3.2) — Stage B

- `src/frontend/components/tool3d/ObjectTreePanel.tsx`:93, 101
- `src/frontend/components/tool3d/PresetPalettePanel.tsx`:373
- `src/frontend/components/tool3d/TransformControlsPanel.tsx`:118, 139, 147, 155, 234

#### `#0e7490` — 7 chỗ · §3.2: gradient stop, 1 chỗ ở HomeView — xử lý tay (Stage B)

- `src/frontend/components/AuthModal.tsx`:246
- `src/frontend/components/admin/AdminSeoPanel.tsx`:83
- `src/frontend/components/admin/AdminStorefrontPanel.tsx`:61
- `src/frontend/views/HomeView.tsx`:214, 238, 254, 1070

#### `#00515f` — 7 chỗ · Biến thể teal tối — Stage B: primary-hover?

- `src/frontend/components/admin/PricingConfigPanel.tsx`:316, 738, 966, 985, 1083, 1344, 1532

#### `#75777d` — 5 chỗ · Xám trung tính — Stage B: fg-subtle

- `src/frontend/components/Header.tsx`:166
- `src/frontend/views/DesignerDashboardView.tsx`:686, 701, 716, 1127

#### `#085f75` — 5 chỗ · Biến thể teal — Stage B

- `src/frontend/components/admin/AdminSeoPanel.tsx`:83
- `src/frontend/components/admin/AdminStorefrontPanel.tsx`:61
- `src/frontend/views/HomeView.tsx`:214, 254, 1070

#### `#f4f6f9` — 4 chỗ · Nền xám rất nhạt — Stage B

- `src/frontend/components/admin/AccessoriesManager.tsx`:197
- `src/frontend/components/admin/WarehouseInventoryPanel.tsx`:205, 240, 371

#### `#5f6368` — 4 chỗ · Xám Google-ish — Stage B: fg-muted

- `src/frontend/components/admin/AdminSeoPanel.tsx`:379, 397, 407, 413

#### `#664d03` — 4 chỗ · Vàng nâu (warning text) — Stage B: warning

- `src/frontend/components/tool3d/InternalCostBreakdownModal.tsx`:284, 298
- `src/frontend/components/tool3d/ObjectTreePanel.tsx`:267
- `src/frontend/components/tool3d/StlUnitConfirmModal.tsx`:65

#### `#dce9ff` — 4 chỗ · Nền xanh nhạt — Stage B

- `src/frontend/views/ExploreView.tsx`:247, 249
- `src/frontend/views/HomeView.tsx`:186, 188

#### `#ffd700` — 4 chỗ · Vàng kim (sao) — Stage B: warning-strong

- `src/frontend/views/ExploreView.tsx`:335, 790
- `src/frontend/views/HomeView.tsx`:634, 703

#### `#0f1d32` — 3 chỗ · Navy tối — Stage B

- `src/frontend/components/CadQuickViewModal.tsx`:135, 290, 308

#### `#333333` — 3 chỗ · Xám đậm — Stage B

- `src/frontend/components/ChatSupportModal.tsx`:111
- `src/frontend/components/tool3d/InternalCostBreakdownModal.tsx`:313, 336

#### `#1a0dab` — 3 chỗ · Xanh link Google — Stage B: info

- `src/frontend/components/admin/AdminSeoPanel.tsx`:389, 404, 410

#### `#0284c7` — 3 chỗ · Sky-600 (gradient) — Stage B: info

- `src/frontend/components/onboarding/WorkshopOnboardingWizard.tsx`:396, 1240
- `src/frontend/views/WorkshopSettingsView.tsx`:1302

#### `#d8e3fb` — 3 chỗ · Xám xanh đã loại khỏi chữ — chỉ map khi là CHỮ; bg- cần người chốt (Stage B)

- `src/frontend/views/DesignerDashboardView.tsx`:468, 1049, 1071

#### `#166534` — 3 chỗ · Xanh lá đậm — Stage B: positive

- `src/frontend/views/DesignerDashboardView.tsx`:626, 827, 1266

#### `#8c857b` — 3 chỗ · Xám nâu editorial — Stage B

- `src/frontend/views/HomeView.tsx`:513, 760, 764

#### `#1c2c45` — 2 chỗ · Navy tối — Stage B: surface-inverse-raised

- `src/frontend/components/CadQuickViewModal.tsx`:315, 348

#### `#1e40af` — 2 chỗ · Blue-800 — Stage B: info

- `src/frontend/components/CartDrawer.tsx`:128, 134

#### `#202124` — 2 chỗ · Xám Google-ish — Stage B: fg

- `src/frontend/components/admin/AdminSeoPanel.tsx`:372, 377

#### `#4d5156` — 2 chỗ · Xám Google-ish — Stage B: fg-muted

- `src/frontend/components/admin/AdminSeoPanel.tsx`:378, 396

#### `#0369a1` — 2 chỗ · Sky-700 (gradient) — Stage B: info

- `src/frontend/components/onboarding/WorkshopOnboardingWizard.tsx`:396, 1240

#### `#fff8e6` — 2 chỗ · Vàng rất nhạt (nền) — Stage B

- `src/frontend/components/tool3d/InternalCostBreakdownModal.tsx`:273
- `src/frontend/components/tool3d/ObjectTreePanel.tsx`:267

#### `#dcfce7` — 2 chỗ · Nền xanh nhạt — Stage B

- `src/frontend/views/DesignerDashboardView.tsx`:626, 1266

#### `#1c0a0a` — 1 chỗ · Nền đỏ rất tối (toast) — Stage B: danger nền

- `src/App.tsx`:1198

#### `#ef4444` — 1 chỗ · Red-500 (viền) — Stage B: danger

- `src/App.tsx`:1198

#### `#fca5a5` — 1 chỗ · Đỏ nhạt (chữ trên nền tối) — Stage B: danger

- `src/App.tsx`:1198

#### `#1c1608` — 1 chỗ · Nền vàng rất tối (toast) — Stage B: warning nền

- `src/App.tsx`:1200

#### `#f59e0b` — 1 chỗ · Amber-500 (viền) — Stage B: warning-strong

- `src/App.tsx`:1200

#### `#fde68a` — 1 chỗ · Vàng nhạt (chữ trên nền tối) — Stage B: warning

- `src/App.tsx`:1200

#### `#10b981` — 1 chỗ · Emerald (viền) — Stage B: positive

- `src/App.tsx`:1202

#### `#070f1e` — 1 chỗ · Navy gần đen — Stage B: surface-inverse

- `src/frontend/components/CadQuickViewModal.tsx`:183

#### `#132238` — 1 chỗ · Navy tối — Stage B: surface-inverse

- `src/frontend/components/CadQuickViewModal.tsx`:250

#### `#00879e` — 1 chỗ · Biến thể teal sáng — Stage B

- `src/frontend/components/CadQuickViewModal.tsx`:386

#### `#eff6ff` — 1 chỗ · Nền xanh rất nhạt — Stage B

- `src/frontend/components/CartDrawer.tsx`:126

#### `#bfdbfe` — 1 chỗ · Viền xanh nhạt — Stage B

- `src/frontend/components/CartDrawer.tsx`:126

#### `#d5cfc5` — 1 chỗ · Bảng "editorial" (§3.2) — Stage B

- `src/frontend/components/ChatSupportModal.tsx`:57

#### `#d0e2ff` — 1 chỗ · Nền xanh nhạt — Stage B

- `src/frontend/components/admin/AccessoriesManager.tsx`:342

#### `#fafafa` — 1 chỗ · Nền trắng ngà — Stage B: surface

- `src/frontend/components/admin/AdminSeoPanel.tsx`:367

#### `#fafbfd` — 1 chỗ · Nền xám nhạt — Stage B: canvas

- `src/frontend/components/admin/AdminSettingsPanel.tsx`:128

#### `#131f33` — 1 chỗ · Navy tối — Stage B: surface-inverse

- `src/frontend/components/admin/AdminSidebar.tsx`:268

#### `#00a8c6` — 1 chỗ · Biến thể cyan — Stage B: accent

- `src/frontend/components/admin/AdminSidebar.tsx`:297

#### `#060d1a` — 1 chỗ · Navy gần đen — Stage B: surface-inverse

- `src/frontend/components/admin/AdminSidebar.tsx`:367

#### `#7a5b00` — 1 chỗ · Vàng nâu đậm — Stage B

- `src/frontend/components/tool3d/ObjectTreePanel.tsx`:272

#### `#fffdf0` — 1 chỗ · Vàng rất nhạt (nền) — Stage B

- `src/frontend/components/tool3d/StlUnitConfirmModal.tsx`:65

#### `#f0f7ff` — 1 chỗ · Nền xanh rất nhạt — Stage B

- `src/frontend/components/tool3d/StlVs3mfComparisonModal.tsx`:140

#### `#b8d5ff` — 1 chỗ · Viền xanh nhạt — Stage B

- `src/frontend/components/tool3d/StlVs3mfComparisonModal.tsx`:140

#### `#004b87` — 1 chỗ · Xanh dương — Stage B: info

- `src/frontend/components/tool3d/StlVs3mfComparisonModal.tsx`:141

#### `#204060` — 1 chỗ · Navy trung tính — Stage B: fg-muted

- `src/frontend/components/tool3d/StlVs3mfComparisonModal.tsx`:145

#### `#111111` — 1 chỗ · Đen tuyệt đối — Stage B (tokens.md §1: không dùng #000)

- `src/frontend/views/AssetLibraryView.tsx`:287

#### `#e0ddd5` — 1 chỗ · Bảng "editorial" (§3.2) — Stage B

- `src/frontend/views/AssetLibraryView.tsx`:307

#### `#4cd7f6` — 1 chỗ · Biến thể cyan — Stage B: accent

- `src/frontend/views/DesignerDashboardView.tsx`:494

#### `#001f26` — 1 chỗ · Navy rất tối — Stage B: fg

- `src/frontend/views/DesignerDashboardView.tsx`:494

#### `#ffedd5` — 1 chỗ · Cam rất nhạt (nền) — Stage B

- `src/frontend/views/DesignerDashboardView.tsx`:623

#### `#9a3412` — 1 chỗ · Cam nâu đậm — Stage B

- `src/frontend/views/DesignerDashboardView.tsx`:623

#### `#fed7aa` — 1 chỗ · Cam nhạt (viền) — Stage B

- `src/frontend/views/DesignerDashboardView.tsx`:623

#### `#bbf7d0` — 1 chỗ · Viền xanh nhạt — Stage B

- `src/frontend/views/DesignerDashboardView.tsx`:626

#### `#d3e4fe` — 1 chỗ · Nền xanh nhạt — Stage B

- `src/frontend/views/DesignerDashboardView.tsx`:889

#### `#ea580c` — 1 chỗ · Cam đậm — Stage B: warning-strong

- `src/frontend/views/DesignerDashboardView.tsx`:1229

#### `#c59b27` — 1 chỗ · Vàng kim tối — Stage B: warning-strong

- `src/frontend/views/ExploreView.tsx`:765

#### `#11233b` — 1 chỗ · Navy tối (gradient) — Stage B

- `src/frontend/views/HomeView.tsx`:193

#### `#f8f9fa` — 1 chỗ · Nền xám nhạt — Stage B: canvas

- `src/frontend/views/WorkshopSettingsView.tsx`:555

## 3. Ngoại lệ CÓ CHỦ ĐÍCH (đổi giá trị màu so với hex gốc)

Stage A yêu cầu "0 pixel đổi"; các dòng dưới đây là ngoại lệ do chính bảng map §3.2 và luật tương phản §3.3 quy định.

| Hex gốc | → Token | Giá trị token (light) | Số chỗ | File |
|---|---|---|---:|---|
| `#94a3b8` | `fg-subtle` | `#64748b` | 43 | `src/frontend/components/AuthModal.tsx`:269, 282, 524, 552, 733, 750, 770, 786, 844, 910<br>`src/frontend/components/CadQuickViewModal.tsx`:241<br>`src/frontend/components/CartDrawer.tsx`:149<br>`src/frontend/components/InvoiceModal.tsx`:13, 48, 88, 217<br>`src/frontend/components/MaterialComparisonMatrix.tsx`:223, 244, 252<br>`src/frontend/components/OrderProgress.tsx`:94<br>`src/frontend/components/PageSkeleton.tsx`:20, 64<br>`src/frontend/components/admin/AdminSidebar.tsx`:232, 242, 253, 322<br>`src/frontend/views/AssetLibraryView.tsx`:274<br>`src/frontend/views/ExploreView.tsx`:277, 582, 828<br>`src/frontend/views/LoginView.tsx`:108, 134<br>`src/frontend/views/MyOrdersView.tsx`:151, 375<br>`src/frontend/views/OrderTrackingView.tsx`:21, 399, 423, 529<br>`src/frontend/views/ProductDetailView.tsx`:520<br>`src/frontend/views/RegisterView.tsx`:251, 268, 288, 330 |
| `#f1f5f9` | `line-subtle` | `#e2e8f0` | 17 | `src/frontend/components/AuthModal.tsx`:304<br>`src/frontend/components/CartDrawer.tsx`:149<br>`src/frontend/components/Header.tsx`:258<br>`src/frontend/components/MaterialComparisonMatrix.tsx`:156, 195<br>`src/frontend/components/PageSkeleton.tsx`:93, 102, 104<br>`src/frontend/views/AdminDashboardView.tsx`:283<br>`src/frontend/views/CartView.tsx`:168<br>`src/frontend/views/CheckoutView.tsx`:185<br>`src/frontend/views/DesignerDashboardView.tsx`:586, 625, 646<br>`src/frontend/views/HomeView.tsx`:1012<br>`src/frontend/views/PersonalizeView.tsx`:612<br>`src/frontend/views/ProductDetailView.tsx`:340 |
| `#091426` | `line` | `#cbd5e1` | 9 | `src/frontend/components/Header.tsx`:268, 280, 365<br>`src/frontend/components/admin/WorkshopEstimatorBOM.tsx`:318<br>`src/frontend/views/AssetLibraryView.tsx`:144<br>`src/frontend/views/MyOrdersView.tsx`:169<br>`src/frontend/views/PersonalizeView.tsx`:789, 821<br>`src/frontend/views/Tool3DView.tsx`:795 |
| `#8590a6` | `fg-subtle` | `#64748b` | 8 | `src/App.tsx`:1298, 1328, 1358, 1359, 1360, 1364<br>`src/frontend/components/Header.tsx`:172<br>`src/frontend/views/DesignerDashboardView.tsx`:1197 |
| `#94a3b8` | `line-control` | `#8590a6` | 6 | `src/frontend/components/AuthModal.tsx`:657, 679, 701<br>`src/frontend/views/RegisterView.tsx`:175, 197, 219 |
| `#bcc7de` | `fg-subtle` | `#64748b` | 3 | `src/App.tsx`:1285<br>`src/frontend/views/DesignerDashboardView.tsx`:488, 1209 |
| `#d8e3fb` | `fg-subtle` | `#64748b` | 3 | `src/App.tsx`:1295, 1325, 1355 |

**Hệ quả lên tập màu của CSS build** (`scripts/verify-tokens-unchanged.mjs`): các hex sau sẽ BIẾN MẤT khỏi CSS
vì không còn consumer nào và không phải giá trị của token nào:

`#94a3b8`, `#bcc7de`, `#d8e3fb`, `#f1f5f9`

### 3.1 Thay thế nằm trong nội suy `${…}` của template literal — đã rà bằng mắt

- `src/App.tsx:1202` — `bg-(#091426)` → `bg-surface-inverse`
- `src/App.tsx:1203` — `bg-(#091426)` → `bg-surface-inverse`
- `src/App.tsx:1203` — `border-(#57DFFE)/30` → `border-accent/30`
- `src/frontend/components/AuthModal.tsx:311` — `text-(#00687A)` → `text-primary`
- `src/frontend/components/AuthModal.tsx:312` — `text-(#64748B)` → `text-fg-subtle`
- `src/frontend/components/AuthModal.tsx:312` — `text-(#091426)` → `text-fg`
- `src/frontend/components/AuthModal.tsx:325` — `text-(#00687A)` → `text-primary`
- `src/frontend/components/AuthModal.tsx:326` — `text-(#64748B)` → `text-fg-subtle`
- `src/frontend/components/AuthModal.tsx:326` — `text-(#091426)` → `text-fg`
- `src/frontend/components/AuthModal.tsx:338` — `text-(#00687A)` → `text-primary`
- `src/frontend/components/AuthModal.tsx:339` — `text-(#64748B)` → `text-fg-subtle`
- `src/frontend/components/AuthModal.tsx:339` — `text-(#091426)` → `text-fg`
- `src/frontend/components/AuthModal.tsx:418` — `bg-(#00687A)` → `bg-primary`
- `src/frontend/components/AuthModal.tsx:656` — `border-(#00687A)` → `border-primary`
- `src/frontend/components/AuthModal.tsx:656` — `bg-(#00687A)/5` → `bg-primary/5`
- `src/frontend/components/AuthModal.tsx:656` — `ring-(#00687A)` → `ring-primary`
- `src/frontend/components/AuthModal.tsx:656` — `text-(#00687A)` → `text-primary`
- `src/frontend/components/AuthModal.tsx:657` — `border-(#CBD5E1)` → `border-line`
- `src/frontend/components/AuthModal.tsx:657` — `bg-(#F8FAFC)` → `bg-canvas`
- `src/frontend/components/AuthModal.tsx:657` — `border-(#94A3B8)` → `border-line-control`
- `src/frontend/components/AuthModal.tsx:662` — `bg-(#00687A)` → `bg-primary`
- `src/frontend/components/AuthModal.tsx:678` — `border-(#00687A)` → `border-primary`
- `src/frontend/components/AuthModal.tsx:678` — `bg-(#00687A)/5` → `bg-primary/5`
- `src/frontend/components/AuthModal.tsx:678` — `ring-(#00687A)` → `ring-primary`
- `src/frontend/components/AuthModal.tsx:678` — `text-(#00687A)` → `text-primary`
- `src/frontend/components/AuthModal.tsx:679` — `border-(#CBD5E1)` → `border-line`
- `src/frontend/components/AuthModal.tsx:679` — `bg-(#F8FAFC)` → `bg-canvas`
- `src/frontend/components/AuthModal.tsx:679` — `border-(#94A3B8)` → `border-line-control`
- `src/frontend/components/AuthModal.tsx:684` — `bg-(#00687A)` → `bg-primary`
- `src/frontend/components/AuthModal.tsx:700` — `border-(#00687A)` → `border-primary`
- `src/frontend/components/AuthModal.tsx:700` — `bg-(#00687A)/5` → `bg-primary/5`
- `src/frontend/components/AuthModal.tsx:700` — `ring-(#00687A)` → `ring-primary`
- `src/frontend/components/AuthModal.tsx:700` — `text-(#00687A)` → `text-primary`
- `src/frontend/components/AuthModal.tsx:701` — `border-(#CBD5E1)` → `border-line`
- `src/frontend/components/AuthModal.tsx:701` — `bg-(#F8FAFC)` → `bg-canvas`
- `src/frontend/components/AuthModal.tsx:701` — `border-(#94A3B8)` → `border-line-control`
- `src/frontend/components/AuthModal.tsx:706` — `bg-(#00687A)` → `bg-primary`
- `src/frontend/components/AuthModal.tsx:890` — `border-(#00687A)` → `border-primary`
- `src/frontend/components/AuthModal.tsx:890` — `bg-(#00687A)/5` → `bg-primary/5`
- `src/frontend/components/AuthModal.tsx:890` — `ring-(#00687A)` → `ring-primary`
- `src/frontend/components/AuthModal.tsx:891` — `border-(#CBD5E1)` → `border-line`
- `src/frontend/components/AuthModal.tsx:891` — `bg-(#F8FAFC)` → `bg-canvas`
- `src/frontend/components/CadQuickViewModal.tsx:256` — `bg-(#00687A)` → `bg-primary`
- `src/frontend/components/CadQuickViewModal.tsx:274` — `bg-(#00687A)` → `bg-primary`
- `src/frontend/components/CadQuickViewModal.tsx:335` — `border-(#57DFFE)` → `border-accent`
- `src/frontend/components/CadQuickViewModal.tsx:335` — `ring-(#57DFFE)/40` → `ring-accent/40`
- `src/frontend/components/CartDrawer.tsx:189` — `bg-(#00687A)` → `bg-primary`
- `src/frontend/components/CartDrawer.tsx:189` — `bg-(#091426)` → `bg-surface-inverse`
- `src/frontend/components/Header.tsx:110` — `border-(#00687A)` → `border-primary`
- `src/frontend/components/Header.tsx:110` — `text-(#00687A)` → `text-primary`
- `src/frontend/components/Header.tsx:111` — `text-(#545F73)` → `text-fg-muted`
- `src/frontend/components/Header.tsx:111` — `text-(#091426)` → `text-fg`
- `src/frontend/components/Header.tsx:140` — `bg-(#091426)` → `bg-surface-inverse`
- `src/frontend/components/Header.tsx:141` — `text-(#545F73)` → `text-fg-muted`
- `src/frontend/components/Header.tsx:141` — `text-(#091426)` → `text-fg`
- `src/frontend/components/Header.tsx:153` — `bg-(#091426)` → `bg-surface-inverse`
- `src/frontend/components/Header.tsx:154` — `text-(#545F73)` → `text-fg-muted`
- `src/frontend/components/Header.tsx:154` — `text-(#091426)` → `text-fg`
- `src/frontend/components/Header.tsx:268` — `bg-(#091426)` → `bg-surface-inverse`
- `src/frontend/components/Header.tsx:268` — `border-(#091426)` → `border-line`
- `src/frontend/components/Header.tsx:269` — `text-(#091426)` → `text-fg`
- `src/frontend/components/Header.tsx:269` — `border-(#CBD5E1)` → `border-line`
- `src/frontend/components/Header.tsx:280` — `bg-(#091426)` → `bg-surface-inverse`
- `src/frontend/components/Header.tsx:280` — `border-(#091426)` → `border-line`
- `src/frontend/components/Header.tsx:281` — `text-(#091426)` → `text-fg`
- `src/frontend/components/Header.tsx:281` — `border-(#CBD5E1)` → `border-line`
- `src/frontend/components/Header.tsx:298` — `bg-(#00687A)` → `bg-primary`
- `src/frontend/components/Header.tsx:299` — `text-(#091426)` → `text-fg`
- `src/frontend/components/Header.tsx:365` — `bg-(#091426)` → `bg-surface-inverse`
- `src/frontend/components/Header.tsx:365` — `border-(#091426)` → `border-line`
- `src/frontend/components/MaterialComparisonMatrix.tsx:169` — `text-(#00687A)` → `text-primary`
- `src/frontend/components/MaterialComparisonMatrix.tsx:170` — `text-(#64748B)` → `text-fg-subtle`
- `src/frontend/components/MaterialComparisonMatrix.tsx:170` — `text-(#091426)` → `text-fg`
- `src/frontend/components/MaterialComparisonMatrix.tsx:203` — `bg-(#00687A)/5` → `bg-primary/5`
- `src/frontend/components/OrderProgress.tsx:70` — `bg-(#00687A)` → `bg-primary`
- `src/frontend/components/OrderProgress.tsx:72` — `from-(#00687A)` → `from-primary`
- `src/frontend/components/OrderProgress.tsx:72` — `to-(#57DFFE)` → `to-accent`
- `src/frontend/components/OrderProgress.tsx:72` — `ring-(#57DFFE)` → `ring-accent`
- `src/frontend/components/OrderProgress.tsx:120` — `border-(#00687A)` → `border-primary`
- `src/frontend/components/OrderProgress.tsx:120` — `bg-(#091426)` → `bg-surface-inverse`
- … và 469 chỗ nữa

## 4. Từ chối theo lý do

| Lý do | Số chỗ |
|---|---:|
| hex không có trong bảng map §3.2 | 775 |
| hex có trong map nhưng KHÔNG có vai trò cho tiền tố "text" | 34 |
| hex có trong map nhưng KHÔNG có vai trò cho tiền tố "border" | 16 |
| hex có trong map nhưng KHÔNG có vai trò cho tiền tố "bg" | 3 |

## 5. Phạm vi & bất biến

- Chỉ khớp trong `className="…"` / `className='…'` / `className={"…"}` / `className={'…'}` / ``className={`…`}`` / `class="…"`.
- Không đụng `.ts` (màu trong JS/Three.js là Stage C), không đụng `style={{…}}`, không đụng utility phi màu.
- Loại trừ cứng: `src/frontend/ui/**` (thư viện primitive của A2b) và `src/frontend/theme/**`.
- Idempotent: chạy lần hai không còn gì để đổi cho các cặp đã map.

---

# PHẦN B — KẾT QUẢ ÁP THỰC TẾ (Stage A, theo thứ tự §9)

> Phần A ở trên là kết quả `--dry-run` trên trạng thái **trước khi áp**.
> Phần B ghi kết quả đã áp, danh sách còn lại và bằng chứng gate.
> Tổng thay thế khớp: 3.570 (lần dry-run đầu) + 6 chỗ phát sinh khi bổ sung hỗ trợ
> `className={biểu thức}` (ternary/`cn(...)`) = **3.576**. Từ chối: 828 + 2 = **830**.

## B.1 Tiến trình áp + KPI sau mỗi bước

| Bước | Thư mục | File ghi | Thay thế | KPI `grep className="…"` | lint | build | contrast | color-set |
|---|---|---:|---:|---:|---|---|---|---|
| — | baseline | 0 | 0 | **3710** | — | — | — | 118 màu |
| step1 | `src/frontend/components` (trừ `admin`) | 27 | 782 | 3104 | RC=0 | OK | RC=0 | ADDED 0 / REMOVED 0 |
| step2 | `src/frontend/views` | 16 | 1868 | 1521 | RC=0 | OK | RC=0 | ADDED 0 / REMOVED 0 |
| step1b | chạy lại `components` sau khi codemod hỗ trợ `className={…}` | 3 | 6 | 1521 | RC=0 | OK | RC=0 | ADDED 0 / REMOVED 0 |
| step2b | chạy lại `views` (idempotent) | 0 | 0 | 1521 | RC=0 | OK | RC=0 | ADDED 0 / REMOVED 0 |
| step3 | `src/frontend/components/admin` (gồm `admin/groups`) | 15 | 873 | 750 | RC=0 | OK | RC=0 | ADDED 0 / REMOVED 0 |
| step4 | còn lại (`src/App.tsx`) — quét toàn `src` | 1 | 47 | **706** | RC=0 | OK | RC=0 | ADDED 0 / REMOVED 1 (`#bcc7de`) |

KPI giảm **3.710 → 706**; 706 chỗ còn lại = đúng 706/830 chỗ thuộc danh sách TỪ CHỐI ở §2 (hex ngoài bảng §3.2, thuộc Stage B).
Chênh 830 − 706 = 124 chỗ nằm trong `className={`…`}` (không được lệnh `grep` này đếm).

## B.2 Tổng thay thế ĐÃ ÁP theo token

| Token | Số chỗ |
|---|---:|
| `primary` | 1148 |
| `fg` | 666 |
| `line` | 514 |
| `fg-subtle` | 342 |
| `fg-muted` | 225 |
| `canvas` | 205 |
| `accent` | 128 |
| `surface-inverse` | 121 |
| `surface-muted` | 69 |
| `line-subtle` | 59 |
| `primary-hover` | 52 |
| `surface-inverse-raised` | 38 |
| `line-control` | 6 |
| `warning-strong` | 2 |
| `surface` | 1 |
| **Tổng** | **3576** |

## B.3 Còn lại — hex KHÔNG map được (đúng như §2, trạng thái sau khi áp)

### 2.1 Tổng hợp theo hex

| Hex | Số chỗ | Tiền tố | Số file | Gợi ý |
|---|---:|---|---:|---|
| `#c5c6cd` | 261 | border(258), bg(2), divide(1) | 9 | Xám trung tính "viền" (261 chỗ) — Stage B: line hoặc line-control |
| `#1c1c1c` | 85 | text(74), bg(9), border(2) | 9 | Bảng "editorial" (§3.2) — Stage B (mực đen ấm) |
| `#7d7565` | 52 | text(52) | 10 | Bảng "editorial" (§3.2) — Stage B (fg-muted?) |
| `#1e293b` | 51 | text(34), border(17) | 12 | Đã có token surface-inverse-raised cho bg-/from-/to-; text-/border- cần người chốt (Stage B) |
| `#334155` | 47 | text(27), border(17), bg(3) | 12 | Slate-700 — Stage B: fg hoặc fg-muted |
| `#475569` | 37 | text(37) | 11 | Slate-600 — Stage B: fg-muted |
| `#5a554c` | 28 | text(28) | 6 | Xám nâu editorial — Stage B |
| `#f7f6f2` | 25 | bg(25) | 7 | Bảng "editorial" (§3.2) — Stage B: chọn token storefront |
| `#0f172a` | 22 | text(20), bg(2) | 5 | Slate-900 — Stage B: fg |
| `#e5eeff` | 21 | divide(9), bg(7), border(5) | 7 | Nền/viền xanh nhạt — Stage B |
| `#eff4ff` | 17 | bg(17) | 6 | Nền xanh rất nhạt — Stage B: surface-muted? |
| `#005463` | 17 | bg(17) | 10 | Biến thể teal tối — Stage B: primary-hover? |
| `#0b1c30` | 13 | text(9), bg(4) | 3 | Navy tối — Stage B |
| `#004e5c` | 10 | bg(9), text(1) | 1 | Biến thể teal tối — Stage B: primary-hover? |
| `#990000` | 10 | text(6), bg(4) | 2 | Đỏ đậm — Stage B: danger |
| `#faf9f5` | 9 | bg(9) | 6 | Bảng "editorial" (§3.2) — Stage B |
| `#eae8e0` | 8 | bg(8) | 3 | Bảng "editorial" (§3.2) — Stage B |
| `#0e7490` | 7 | to(7) | 4 | §3.2: gradient stop, 1 chỗ ở HomeView — xử lý tay (Stage B) |
| `#00515f` | 7 | bg(7) | 1 | Biến thể teal tối — Stage B: primary-hover? |
| `#75777d` | 5 | text(5) | 2 | Xám trung tính — Stage B: fg-subtle |
| `#085f75` | 5 | to(5) | 3 | Biến thể teal — Stage B |
| `#f4f6f9` | 4 | bg(4) | 2 | Nền xám rất nhạt — Stage B |
| `#5f6368` | 4 | text(4) | 1 | Xám Google-ish — Stage B: fg-muted |
| `#664d03` | 4 | text(4) | 3 | Vàng nâu (warning text) — Stage B: warning |
| `#dce9ff` | 4 | bg(4) | 2 | Nền xanh nhạt — Stage B |
| `#ffd700` | 4 | bg(2), text(2) | 2 | Vàng kim (sao) — Stage B: warning-strong |
| `#0f1d32` | 3 | bg(3) | 1 | Navy tối — Stage B |
| `#333333` | 3 | bg(3) | 2 | Xám đậm — Stage B |
| `#1a0dab` | 3 | text(3) | 1 | Xanh link Google — Stage B: info |
| `#0284c7` | 3 | to(2), via(1) | 2 | Sky-600 (gradient) — Stage B: info |
| `#d8e3fb` | 3 | bg(3) | 1 | Xám xanh đã loại khỏi chữ — chỉ map khi là CHỮ; bg- cần người chốt (Stage B) |
| `#166534` | 3 | text(3) | 1 | Xanh lá đậm — Stage B: positive |
| `#8c857b` | 3 | text(2), placeholder(1) | 1 | Xám nâu editorial — Stage B |
| `#1c2c45` | 2 | bg(2) | 1 | Navy tối — Stage B: surface-inverse-raised |
| `#1e40af` | 2 | text(2) | 1 | Blue-800 — Stage B: info |
| `#202124` | 2 | text(2) | 1 | Xám Google-ish — Stage B: fg |
| `#4d5156` | 2 | text(2) | 1 | Xám Google-ish — Stage B: fg-muted |
| `#0369a1` | 2 | to(2) | 1 | Sky-700 (gradient) — Stage B: info |
| `#fff8e6` | 2 | bg(2) | 2 | Vàng rất nhạt (nền) — Stage B |
| `#dcfce7` | 2 | bg(2) | 1 | Nền xanh nhạt — Stage B |
| `#1c0a0a` | 1 | bg(1) | 1 | Nền đỏ rất tối (toast) — Stage B: danger nền |
| `#ef4444` | 1 | border(1) | 1 | Red-500 (viền) — Stage B: danger |
| `#fca5a5` | 1 | text(1) | 1 | Đỏ nhạt (chữ trên nền tối) — Stage B: danger |
| `#1c1608` | 1 | bg(1) | 1 | Nền vàng rất tối (toast) — Stage B: warning nền |
| `#f59e0b` | 1 | border(1) | 1 | Amber-500 (viền) — Stage B: warning-strong |
| `#fde68a` | 1 | text(1) | 1 | Vàng nhạt (chữ trên nền tối) — Stage B: warning |
| `#10b981` | 1 | border(1) | 1 | Emerald (viền) — Stage B: positive |
| `#070f1e` | 1 | bg(1) | 1 | Navy gần đen — Stage B: surface-inverse |
| `#132238` | 1 | bg(1) | 1 | Navy tối — Stage B: surface-inverse |
| `#00879e` | 1 | bg(1) | 1 | Biến thể teal sáng — Stage B |
| `#eff6ff` | 1 | bg(1) | 1 | Nền xanh rất nhạt — Stage B |
| `#bfdbfe` | 1 | border(1) | 1 | Viền xanh nhạt — Stage B |
| `#d5cfc5` | 1 | text(1) | 1 | Bảng "editorial" (§3.2) — Stage B |
| `#d0e2ff` | 1 | bg(1) | 1 | Nền xanh nhạt — Stage B |
| `#fafafa` | 1 | bg(1) | 1 | Nền trắng ngà — Stage B: surface |
| `#fafbfd` | 1 | bg(1) | 1 | Nền xám nhạt — Stage B: canvas |
| `#131f33` | 1 | bg(1) | 1 | Navy tối — Stage B: surface-inverse |
| `#00a8c6` | 1 | text(1) | 1 | Biến thể cyan — Stage B: accent |
| `#060d1a` | 1 | bg(1) | 1 | Navy gần đen — Stage B: surface-inverse |
| `#7a5b00` | 1 | text(1) | 1 | Vàng nâu đậm — Stage B |
| `#fffdf0` | 1 | bg(1) | 1 | Vàng rất nhạt (nền) — Stage B |
| `#f0f7ff` | 1 | bg(1) | 1 | Nền xanh rất nhạt — Stage B |
| `#b8d5ff` | 1 | border(1) | 1 | Viền xanh nhạt — Stage B |
| `#004b87` | 1 | text(1) | 1 | Xanh dương — Stage B: info |
| `#204060` | 1 | text(1) | 1 | Navy trung tính — Stage B: fg-muted |
| `#111111` | 1 | bg(1) | 1 | Đen tuyệt đối — Stage B (tokens.md §1: không dùng #000) |
| `#e0ddd5` | 1 | bg(1) | 1 | Bảng "editorial" (§3.2) — Stage B |
| `#4cd7f6` | 1 | bg(1) | 1 | Biến thể cyan — Stage B: accent |
| `#001f26` | 1 | text(1) | 1 | Navy rất tối — Stage B: fg |
| `#ffedd5` | 1 | bg(1) | 1 | Cam rất nhạt (nền) — Stage B |
| `#9a3412` | 1 | text(1) | 1 | Cam nâu đậm — Stage B |
| `#fed7aa` | 1 | border(1) | 1 | Cam nhạt (viền) — Stage B |
| `#bbf7d0` | 1 | border(1) | 1 | Viền xanh nhạt — Stage B |
| `#d3e4fe` | 1 | bg(1) | 1 | Nền xanh nhạt — Stage B |
| `#ea580c` | 1 | text(1) | 1 | Cam đậm — Stage B: warning-strong |
| `#c59b27` | 1 | text(1) | 1 | Vàng kim tối — Stage B: warning-strong |
| `#11233b` | 1 | via(1) | 1 | Navy tối (gradient) — Stage B |
| `#f8f9fa` | 1 | bg(1) | 1 | Nền xám nhạt — Stage B: canvas |

### B.3.1 Chi tiết `file:line`

#### `#c5c6cd` — 261 chỗ · Xám trung tính "viền" (261 chỗ) — Stage B: line hoặc line-control

- `src/frontend/components/Header.tsx`:84, 244, 310, 401
- `src/frontend/components/RoleGuard.tsx`:51, 68, 90
- `src/frontend/components/admin/AccessoriesManager.tsx`:132, 163, 172, 182, 194, 197, 223, 376, 400, 411, 420, 439, 450, 462, 474, 485, 496, 507, 518, 523, 527, 547, 570, 581, 590, 608, 618, 629, 640, 651, 662, 672, 682, 687, 691
- `src/frontend/components/admin/AdminProductsPanel.tsx`:145, 154, 164, 176, 195, 197, 220, 285, 315, 316, 332, 344, 352, 368, 377, 388, 400, 409, 432, 433, 450, 462, 470, 486, 495, 506, 519, 524
- `src/frontend/components/admin/AdminSettingsPanel.tsx`:27, 55, 56, 68, 78, 88, 95, 96, 102, 115
- `src/frontend/components/admin/PricingConfigPanel.tsx`:289, 309, 325, 406, 407, 428, 437, 452, 462, 475, 487, 499, 510, 517, 518, 538, 552, 562, 572, 582, 592, 602, 613, 614, 649, 660, 669, 674, 684, 695, 706, 716, 729, 730, 747, 756, 765, 774, 785, 795, 817, 818, 836, 848, 856, 857, 877, 893, 903, 904, 923, 934, 945, 956, 978, 994, 995, 1008, 1042, 1052, 1055, 1076, 1092, 1093, 1108, 1115, 1145, 1156, 1159, 1211, 1212, 1234, 1244, 1255, 1266, 1289, 1297, 1308, 1318, 1334, 1338, 1357, 1358, 1380, 1390, 1399, 1422, 1436, 1450, 1462, 1473, 1484, 1495, 1522, 1526
- `src/frontend/components/admin/WarehouseInventoryPanel.tsx`:74, 89, 104, 119, 190, 220, 227, 228, 240, 358, 359, 371, 402
- `src/frontend/components/admin/WorkshopEstimatorBOM.tsx`:181, 211, 224, 234, 241, 253, 268, 285, 297, 309, 349, 382, 500
- `src/frontend/views/DesignerDashboardView.tsx`:343, 371, 380, 407, 418, 427, 436, 450, 451, 520, 526, 535, 548, 559, 562, 580, 646, 682, 689, 696, 704, 711, 719, 729, 770, 803, 804, 842, 843, 907, 908, 954, 955, 1012, 1033, 1035, 1036, 1069, 1090, 1102, 1133, 1157, 1160, 1214, 1215, 1240, 1241, 1247, 1282, 1283, 1414, 1418, 1437, 1438, 1469, 1473, 1496, 1497, 1513, 1522

#### `#1c1c1c` — 85 chỗ · Bảng "editorial" (§3.2) — Stage B (mực đen ấm)

- `src/frontend/components/ChatSupportModal.tsx`:45, 47, 53, 76, 77, 93, 107, 111
- `src/frontend/components/tool3d/InternalCostBreakdownModal.tsx`:147, 171, 181, 203, 206, 223, 239, 247, 253, 293, 306, 313, 332, 336
- `src/frontend/components/tool3d/ObjectTreePanel.tsx`:81, 93, 158, 165, 212
- `src/frontend/components/tool3d/PresetPalettePanel.tsx`:186, 239, 302, 308, 317, 373
- `src/frontend/components/tool3d/StlVs3mfComparisonModal.tsx`:108, 115, 125
- `src/frontend/components/tool3d/TransformControlsPanel.tsx`:29, 37, 50, 60, 70, 83, 102, 118, 132, 139, 147, 155, 234, 249, 258
- `src/frontend/components/tool3d/ValidationReportPanel.tsx`:52, 64, 73, 82, 114, 131, 140, 149, 188, 194, 230, 238, 245, 261, 265, 277, 285
- `src/frontend/views/DesignerDashboardView.tsx`:580
- `src/frontend/views/HomeView.tsx`:468, 513, 518, 537, 546, 571, 590, 629, 661, 752, 761, 805, 877, 890, 899

#### `#7d7565` — 52 chỗ · Bảng "editorial" (§3.2) — Stage B (fg-muted?)

- `src/frontend/components/ChatSupportModal.tsx`:82
- `src/frontend/components/admin/AccessoriesManager.tsx`:249
- `src/frontend/components/tool3d/InternalCostBreakdownModal.tsx`:146, 150, 170, 174, 192, 205, 246, 252, 258, 331
- `src/frontend/components/tool3d/ObjectTreePanel.tsx`:78, 126, 174, 191, 208, 224
- `src/frontend/components/tool3d/PresetPalettePanel.tsx`:208, 226, 242, 270, 311, 325, 329, 333, 360
- `src/frontend/components/tool3d/StlVs3mfComparisonModal.tsx`:127
- `src/frontend/components/tool3d/TransformControlsPanel.tsx`:26, 37, 99
- `src/frontend/components/tool3d/ValidationReportPanel.tsx`:49, 126, 163, 229, 237, 244, 251, 260, 264, 276, 280, 284, 288, 289
- `src/frontend/views/AssetLibraryView.tsx`:117, 145
- `src/frontend/views/HomeView.tsx`:471, 505, 518, 794, 802

#### `#1e293b` — 51 chỗ · Đã có token surface-inverse-raised cho bg-/from-/to-; text-/border- cần người chốt (Stage B)

- `src/App.tsx`:1272, 1364
- `src/frontend/components/AuthModal.tsx`:243
- `src/frontend/components/CanvasErrorBoundary.tsx`:39
- `src/frontend/components/PageSkeleton.tsx`:39
- `src/frontend/components/ThreeModelViewer.tsx`:345
- `src/frontend/components/admin/AdminSidebar.tsx`:214, 219, 268, 304, 367
- `src/frontend/components/admin/AdminStorefrontPanel.tsx`:148, 159, 170, 181, 192, 203, 221, 239, 257, 309, 320, 331, 359, 370, 389, 398, 415, 424, 441, 450, 478, 489, 500, 511, 522, 533, 561, 572, 585, 595, 605, 615, 625, 635
- `src/frontend/components/personalize/PersonalizeModelViewer3D.tsx`:700
- `src/frontend/views/AssetLibraryView.tsx`:270
- `src/frontend/views/DesignerDashboardView.tsx`:812, 1446
- `src/frontend/views/PersonalizeView.tsx`:256
- `src/frontend/views/ProductDetailView.tsx`:263

#### `#334155` — 47 chỗ · Slate-700 — Stage B: fg hoặc fg-muted

- `src/frontend/components/AuthModal.tsx`:511, 531, 568, 647, 657, 679, 701, 722, 739, 759, 775, 833
- `src/frontend/components/MaterialComparisonMatrix.tsx`:371, 378
- `src/frontend/components/ThreeModelViewer.tsx`:352, 376
- `src/frontend/components/admin/AdminSidebar.tsx`:349, 372
- `src/frontend/components/personalize/PersonalizeModelViewer3D.tsx`:710, 739
- `src/frontend/components/tool3d/InternalCostBreakdownModal.tsx`:264
- `src/frontend/components/tool3d/ModelViewer3D.tsx`:1563, 1584, 1596, 1613, 1615, 1633, 1664, 1670, 1720, 1830
- `src/frontend/components/tool3d/QuoteSummaryPanel.tsx`:453, 485
- `src/frontend/components/tool3d/UnifiedCadToolbar.tsx`:36, 40
- `src/frontend/views/LoginView.tsx`:97, 115, 157
- `src/frontend/views/OrderTrackingView.tsx`:546
- `src/frontend/views/RegisterView.tsx`:165, 175, 197, 219, 240, 257, 277, 319

#### `#475569` — 37 chỗ · Slate-600 — Stage B: fg-muted

- `src/frontend/components/MaterialComparisonMatrix.tsx`:234, 298, 311, 324, 337, 350
- `src/frontend/components/admin/AdminSeoPanel.tsx`:99, 111, 123, 135, 456
- `src/frontend/components/admin/AdminStorefrontPanel.tsx`:77, 89, 101, 113, 125
- `src/frontend/components/tool3d/MachineComparisonModal.tsx`:160
- `src/frontend/views/CartView.tsx`:413
- `src/frontend/views/CheckoutView.tsx`:460, 576
- `src/frontend/views/DesignerDashboardView.tsx`:625
- `src/frontend/views/ExploreView.tsx`:329, 473, 493, 522, 533, 544, 555, 614, 842, 862
- `src/frontend/views/HomeView.tsx`:245
- `src/frontend/views/ProductDetailView.tsx`:396, 459, 470, 546
- `src/frontend/views/RegisterView.tsx`:355

#### `#5a554c` — 28 chỗ · Xám nâu editorial — Stage B

- `src/frontend/components/tool3d/InternalCostBreakdownModal.tsx`:185, 204, 248, 254
- `src/frontend/components/tool3d/ObjectTreePanel.tsx`:101, 111, 158, 231
- `src/frontend/components/tool3d/PresetPalettePanel.tsx`:222, 266
- `src/frontend/components/tool3d/StlVs3mfComparisonModal.tsx`:107, 129
- `src/frontend/components/tool3d/TransformControlsPanel.tsx`:50, 60, 70, 166, 188, 204, 243, 249, 258
- `src/frontend/components/tool3d/ValidationReportPanel.tsx`:64, 73, 82, 131, 140, 149, 166

#### `#f7f6f2` — 25 chỗ · Bảng "editorial" (§3.2) — Stage B: chọn token storefront

- `src/frontend/components/ChatSupportModal.tsx`:45, 70, 93, 107
- `src/frontend/components/tool3d/InternalCostBreakdownModal.tsx`:145, 192, 330
- `src/frontend/components/tool3d/ObjectTreePanel.tsx`:93, 212
- `src/frontend/components/tool3d/PresetPalettePanel.tsx`:373
- `src/frontend/components/tool3d/StlVs3mfComparisonModal.tsx`:124
- `src/frontend/components/tool3d/TransformControlsPanel.tsx`:45, 118, 139, 147, 155, 234, 244
- `src/frontend/components/tool3d/ValidationReportPanel.tsx`:59, 161, 228, 236, 243, 250, 274

#### `#0f172a` — 22 chỗ · Slate-900 — Stage B: fg

- `src/frontend/components/AuthModal.tsx`:524, 552, 557, 614, 733, 750, 770, 786, 844, 861
- `src/frontend/components/tool3d/ModelViewer3D.tsx`:1615
- `src/frontend/components/tool3d/UnifiedCadToolbar.tsx`:40
- `src/frontend/views/LoginView.tsx`:108, 134, 139, 197
- `src/frontend/views/RegisterView.tsx`:251, 268, 288, 293, 330, 403

#### `#e5eeff` — 21 chỗ · Nền/viền xanh nhạt — Stage B

- `src/frontend/components/Header.tsx`:130
- `src/frontend/components/admin/AccessoriesManager.tsx`:209, 342
- `src/frontend/components/admin/AdminProductsPanel.tsx`:209
- `src/frontend/components/admin/PricingConfigPanel.tsx`:1014, 1277
- `src/frontend/components/admin/WarehouseInventoryPanel.tsx`:251, 382
- `src/frontend/components/admin/WorkshopEstimatorBOM.tsx`:212, 242, 350, 382, 501, 506
- `src/frontend/views/DesignerDashboardView.tsx`:393, 460, 476, 573, 1040, 1046, 1256

#### `#eff4ff` — 17 chỗ · Nền xanh rất nhạt — Stage B: surface-muted?

- `src/frontend/components/AuthModal.tsx`:874
- `src/frontend/components/Header.tsx`:209, 299, 401
- `src/frontend/components/RoleGuard.tsx`:68
- `src/frontend/components/admin/AdminProductsPanel.tsx`:197
- `src/frontend/views/DesignerDashboardView.tsx`:562, 598, 737, 914, 933, 1220, 1247, 1361, 1513
- `src/frontend/views/PersonalizeView.tsx`:543

#### `#005463` — 17 chỗ · Biến thể teal tối — Stage B: primary-hover?

- `src/frontend/components/Header.tsx`:381
- `src/frontend/components/NotFoundView.tsx`:34
- `src/frontend/components/RoleGuard.tsx`:82
- `src/frontend/components/admin/AccessoriesManager.tsx`:153, 533, 697
- `src/frontend/components/admin/AdminProductsPanel.tsx`:186, 419, 534
- `src/frontend/components/admin/AdminSettingsPanel.tsx`:46
- `src/frontend/components/admin/WorkshopEstimatorBOM.tsx`:198
- `src/frontend/components/admin/groups/Group0OverviewPanel.tsx`:121
- `src/frontend/components/admin/groups/Group5ProductionPanel.tsx`:494, 718
- `src/frontend/views/HomeView.tsx`:675, 815, 913

#### `#0b1c30` — 13 chỗ · Navy tối — Stage B

- `src/frontend/components/CadQuickViewModal.tsx`:186
- `src/frontend/views/DesignerDashboardView.tsx`:339, 371, 593, 597, 1115, 1259, 1282, 1437, 1496
- `src/frontend/views/ProductDetailView.tsx`:266, 270, 286

#### `#004e5c` — 10 chỗ · Biến thể teal tối — Stage B: primary-hover?

- `src/frontend/views/DesignerDashboardView.tsx`:364, 637, 763, 1019, 1038, 1083, 1143, 1205, 1424, 1529

#### `#990000` — 10 chỗ · Đỏ đậm — Stage B: danger

- `src/frontend/views/ExploreView.tsx`:325, 328, 335, 790, 859
- `src/frontend/views/HomeView.tsx`:625, 628, 634, 703, 780

#### `#faf9f5` — 9 chỗ · Bảng "editorial" (§3.2) — Stage B

- `src/frontend/components/admin/PricingConfigPanel.tsx`:747
- `src/frontend/components/admin/WorkshopEstimatorBOM.tsx`:382
- `src/frontend/components/tool3d/InternalCostBreakdownModal.tsx`:169, 202, 238
- `src/frontend/components/tool3d/ObjectTreePanel.tsx`:109
- `src/frontend/components/tool3d/PresetPalettePanel.tsx`:220, 323
- `src/frontend/components/tool3d/ValidationReportPanel.tsx`:91

#### `#eae8e0` — 8 chỗ · Bảng "editorial" (§3.2) — Stage B

- `src/frontend/components/tool3d/ObjectTreePanel.tsx`:93, 101
- `src/frontend/components/tool3d/PresetPalettePanel.tsx`:373
- `src/frontend/components/tool3d/TransformControlsPanel.tsx`:118, 139, 147, 155, 234

#### `#0e7490` — 7 chỗ · §3.2: gradient stop, 1 chỗ ở HomeView — xử lý tay (Stage B)

- `src/frontend/components/AuthModal.tsx`:246
- `src/frontend/components/admin/AdminSeoPanel.tsx`:83
- `src/frontend/components/admin/AdminStorefrontPanel.tsx`:61
- `src/frontend/views/HomeView.tsx`:214, 238, 254, 1070

#### `#00515f` — 7 chỗ · Biến thể teal tối — Stage B: primary-hover?

- `src/frontend/components/admin/PricingConfigPanel.tsx`:316, 738, 966, 985, 1083, 1344, 1532

#### `#75777d` — 5 chỗ · Xám trung tính — Stage B: fg-subtle

- `src/frontend/components/Header.tsx`:166
- `src/frontend/views/DesignerDashboardView.tsx`:686, 701, 716, 1127

#### `#085f75` — 5 chỗ · Biến thể teal — Stage B

- `src/frontend/components/admin/AdminSeoPanel.tsx`:83
- `src/frontend/components/admin/AdminStorefrontPanel.tsx`:61
- `src/frontend/views/HomeView.tsx`:214, 254, 1070

#### `#f4f6f9` — 4 chỗ · Nền xám rất nhạt — Stage B

- `src/frontend/components/admin/AccessoriesManager.tsx`:197
- `src/frontend/components/admin/WarehouseInventoryPanel.tsx`:205, 240, 371

#### `#5f6368` — 4 chỗ · Xám Google-ish — Stage B: fg-muted

- `src/frontend/components/admin/AdminSeoPanel.tsx`:379, 397, 407, 413

#### `#664d03` — 4 chỗ · Vàng nâu (warning text) — Stage B: warning

- `src/frontend/components/tool3d/InternalCostBreakdownModal.tsx`:284, 298
- `src/frontend/components/tool3d/ObjectTreePanel.tsx`:267
- `src/frontend/components/tool3d/StlUnitConfirmModal.tsx`:65

#### `#dce9ff` — 4 chỗ · Nền xanh nhạt — Stage B

- `src/frontend/views/ExploreView.tsx`:247, 249
- `src/frontend/views/HomeView.tsx`:186, 188

#### `#ffd700` — 4 chỗ · Vàng kim (sao) — Stage B: warning-strong

- `src/frontend/views/ExploreView.tsx`:335, 790
- `src/frontend/views/HomeView.tsx`:634, 703

#### `#0f1d32` — 3 chỗ · Navy tối — Stage B

- `src/frontend/components/CadQuickViewModal.tsx`:135, 290, 308

#### `#333333` — 3 chỗ · Xám đậm — Stage B

- `src/frontend/components/ChatSupportModal.tsx`:111
- `src/frontend/components/tool3d/InternalCostBreakdownModal.tsx`:313, 336

#### `#1a0dab` — 3 chỗ · Xanh link Google — Stage B: info

- `src/frontend/components/admin/AdminSeoPanel.tsx`:389, 404, 410

#### `#0284c7` — 3 chỗ · Sky-600 (gradient) — Stage B: info

- `src/frontend/components/onboarding/WorkshopOnboardingWizard.tsx`:396, 1240
- `src/frontend/views/WorkshopSettingsView.tsx`:1302

#### `#d8e3fb` — 3 chỗ · Xám xanh đã loại khỏi chữ — chỉ map khi là CHỮ; bg- cần người chốt (Stage B)

- `src/frontend/views/DesignerDashboardView.tsx`:468, 1049, 1071

#### `#166534` — 3 chỗ · Xanh lá đậm — Stage B: positive

- `src/frontend/views/DesignerDashboardView.tsx`:626, 827, 1266

#### `#8c857b` — 3 chỗ · Xám nâu editorial — Stage B

- `src/frontend/views/HomeView.tsx`:513, 760, 764

#### `#1c2c45` — 2 chỗ · Navy tối — Stage B: surface-inverse-raised

- `src/frontend/components/CadQuickViewModal.tsx`:315, 348

#### `#1e40af` — 2 chỗ · Blue-800 — Stage B: info

- `src/frontend/components/CartDrawer.tsx`:128, 134

#### `#202124` — 2 chỗ · Xám Google-ish — Stage B: fg

- `src/frontend/components/admin/AdminSeoPanel.tsx`:372, 377

#### `#4d5156` — 2 chỗ · Xám Google-ish — Stage B: fg-muted

- `src/frontend/components/admin/AdminSeoPanel.tsx`:378, 396

#### `#0369a1` — 2 chỗ · Sky-700 (gradient) — Stage B: info

- `src/frontend/components/onboarding/WorkshopOnboardingWizard.tsx`:396, 1240

#### `#fff8e6` — 2 chỗ · Vàng rất nhạt (nền) — Stage B

- `src/frontend/components/tool3d/InternalCostBreakdownModal.tsx`:273
- `src/frontend/components/tool3d/ObjectTreePanel.tsx`:267

#### `#dcfce7` — 2 chỗ · Nền xanh nhạt — Stage B

- `src/frontend/views/DesignerDashboardView.tsx`:626, 1266

#### `#1c0a0a` — 1 chỗ · Nền đỏ rất tối (toast) — Stage B: danger nền

- `src/App.tsx`:1198

#### `#ef4444` — 1 chỗ · Red-500 (viền) — Stage B: danger

- `src/App.tsx`:1198

#### `#fca5a5` — 1 chỗ · Đỏ nhạt (chữ trên nền tối) — Stage B: danger

- `src/App.tsx`:1198

#### `#1c1608` — 1 chỗ · Nền vàng rất tối (toast) — Stage B: warning nền

- `src/App.tsx`:1200

#### `#f59e0b` — 1 chỗ · Amber-500 (viền) — Stage B: warning-strong

- `src/App.tsx`:1200

#### `#fde68a` — 1 chỗ · Vàng nhạt (chữ trên nền tối) — Stage B: warning

- `src/App.tsx`:1200

#### `#10b981` — 1 chỗ · Emerald (viền) — Stage B: positive

- `src/App.tsx`:1202

#### `#070f1e` — 1 chỗ · Navy gần đen — Stage B: surface-inverse

- `src/frontend/components/CadQuickViewModal.tsx`:183

#### `#132238` — 1 chỗ · Navy tối — Stage B: surface-inverse

- `src/frontend/components/CadQuickViewModal.tsx`:250

#### `#00879e` — 1 chỗ · Biến thể teal sáng — Stage B

- `src/frontend/components/CadQuickViewModal.tsx`:386

#### `#eff6ff` — 1 chỗ · Nền xanh rất nhạt — Stage B

- `src/frontend/components/CartDrawer.tsx`:126

#### `#bfdbfe` — 1 chỗ · Viền xanh nhạt — Stage B

- `src/frontend/components/CartDrawer.tsx`:126

#### `#d5cfc5` — 1 chỗ · Bảng "editorial" (§3.2) — Stage B

- `src/frontend/components/ChatSupportModal.tsx`:57

#### `#d0e2ff` — 1 chỗ · Nền xanh nhạt — Stage B

- `src/frontend/components/admin/AccessoriesManager.tsx`:342

#### `#fafafa` — 1 chỗ · Nền trắng ngà — Stage B: surface

- `src/frontend/components/admin/AdminSeoPanel.tsx`:367

#### `#fafbfd` — 1 chỗ · Nền xám nhạt — Stage B: canvas

- `src/frontend/components/admin/AdminSettingsPanel.tsx`:128

#### `#131f33` — 1 chỗ · Navy tối — Stage B: surface-inverse

- `src/frontend/components/admin/AdminSidebar.tsx`:268

#### `#00a8c6` — 1 chỗ · Biến thể cyan — Stage B: accent

- `src/frontend/components/admin/AdminSidebar.tsx`:297

#### `#060d1a` — 1 chỗ · Navy gần đen — Stage B: surface-inverse

- `src/frontend/components/admin/AdminSidebar.tsx`:367

#### `#7a5b00` — 1 chỗ · Vàng nâu đậm — Stage B

- `src/frontend/components/tool3d/ObjectTreePanel.tsx`:272

#### `#fffdf0` — 1 chỗ · Vàng rất nhạt (nền) — Stage B

- `src/frontend/components/tool3d/StlUnitConfirmModal.tsx`:65

#### `#f0f7ff` — 1 chỗ · Nền xanh rất nhạt — Stage B

- `src/frontend/components/tool3d/StlVs3mfComparisonModal.tsx`:140

#### `#b8d5ff` — 1 chỗ · Viền xanh nhạt — Stage B

- `src/frontend/components/tool3d/StlVs3mfComparisonModal.tsx`:140

#### `#004b87` — 1 chỗ · Xanh dương — Stage B: info

- `src/frontend/components/tool3d/StlVs3mfComparisonModal.tsx`:141

#### `#204060` — 1 chỗ · Navy trung tính — Stage B: fg-muted

- `src/frontend/components/tool3d/StlVs3mfComparisonModal.tsx`:145

#### `#111111` — 1 chỗ · Đen tuyệt đối — Stage B (tokens.md §1: không dùng #000)

- `src/frontend/views/AssetLibraryView.tsx`:287

#### `#e0ddd5` — 1 chỗ · Bảng "editorial" (§3.2) — Stage B

- `src/frontend/views/AssetLibraryView.tsx`:307

#### `#4cd7f6` — 1 chỗ · Biến thể cyan — Stage B: accent

- `src/frontend/views/DesignerDashboardView.tsx`:494

#### `#001f26` — 1 chỗ · Navy rất tối — Stage B: fg

- `src/frontend/views/DesignerDashboardView.tsx`:494

#### `#ffedd5` — 1 chỗ · Cam rất nhạt (nền) — Stage B

- `src/frontend/views/DesignerDashboardView.tsx`:623

#### `#9a3412` — 1 chỗ · Cam nâu đậm — Stage B

- `src/frontend/views/DesignerDashboardView.tsx`:623

#### `#fed7aa` — 1 chỗ · Cam nhạt (viền) — Stage B

- `src/frontend/views/DesignerDashboardView.tsx`:623

#### `#bbf7d0` — 1 chỗ · Viền xanh nhạt — Stage B

- `src/frontend/views/DesignerDashboardView.tsx`:626

#### `#d3e4fe` — 1 chỗ · Nền xanh nhạt — Stage B

- `src/frontend/views/DesignerDashboardView.tsx`:889

#### `#ea580c` — 1 chỗ · Cam đậm — Stage B: warning-strong

- `src/frontend/views/DesignerDashboardView.tsx`:1229

#### `#c59b27` — 1 chỗ · Vàng kim tối — Stage B: warning-strong

- `src/frontend/views/ExploreView.tsx`:765

#### `#11233b` — 1 chỗ · Navy tối (gradient) — Stage B

- `src/frontend/views/HomeView.tsx`:193

#### `#f8f9fa` — 1 chỗ · Nền xám nhạt — Stage B: canvas

- `src/frontend/views/WorkshopSettingsView.tsx`:555

## B.4 Ngoài phạm vi `className` (luật "không đụng biến/`.ts`") — không sửa

Các chuỗi lớp nằm trong **biến/hằng/object** (`const`, `bgGradient:`, `labelClass:`…) chứ không
nằm trực tiếp trong `className`, nên codemod **không đụng** theo đúng luật. Đây là việc của Stage B/C.

- `src/frontend/views/MyOrdersView.tsx:109` — return { label: 'Đang Gia Công In 3D', bg: 'bg-teal-50 border-teal-200 text-(#00687A)', dot: 'bg-(#57DFFE)' };
- `src/frontend/views/MyOrdersView.tsx:109` — return { label: 'Đang Gia Công In 3D', bg: 'bg-teal-50 border-teal-200 text-(#00687A)', dot: 'bg-(#57DFFE)' };
- `src/frontend/views/RegisterView.tsx:38` — labelClass: 'text-(#75777D)',
- `src/frontend/views/RegisterView.tsx:39` — bar1: 'bg-(#DCE9FF)',
- `src/frontend/views/RegisterView.tsx:40` — bar2: 'bg-(#DCE9FF)',
- `src/frontend/views/RegisterView.tsx:41` — bar3: 'bg-(#DCE9FF)',
- `src/frontend/views/RegisterView.tsx:47` — labelClass: 'text-(#BA1A1A) font-bold',
- `src/frontend/views/RegisterView.tsx:48` — bar1: 'bg-(#BA1A1A)',
- `src/frontend/views/RegisterView.tsx:49` — bar2: 'bg-(#DCE9FF)',
- `src/frontend/views/RegisterView.tsx:50` — bar3: 'bg-(#DCE9FF)',
- `src/frontend/views/RegisterView.tsx:59` — bar3: 'bg-(#DCE9FF)',
- `src/frontend/components/auth/UserAvatarMenu.tsx:83` — bgGradient: 'from-purple-900 to-(#091426)',
- `src/frontend/components/auth/UserAvatarMenu.tsx:93` — bgGradient: 'from-amber-900 to-(#091426)',
- `src/frontend/components/auth/UserAvatarMenu.tsx:103` — bgGradient: 'from-emerald-950 to-(#091426)',
- `src/frontend/components/auth/UserAvatarMenu.tsx:112` — badgeClass: 'bg-teal-500/15 text-(#00687A) border-teal-400/40',
- `src/frontend/components/auth/UserAvatarMenu.tsx:113` — bgGradient: 'from-(#004e5b) to-(#091426)',
- `src/frontend/components/auth/UserAvatarMenu.tsx:113` — bgGradient: 'from-(#004e5b) to-(#091426)',
- `src/frontend/components/auth/UserAvatarMenu.tsx:115` — avatarBg: 'bg-(#00687A) text-white',

Ngoài ra màu trong JS/Three.js (`new THREE.Color(0x…)`, `colorHex`) thuộc `src/frontend/theme/tokens.ts` — **Stage C**, không sửa.

## B.5 Bằng chứng "0 pixel đổi"

```
node scripts/verify-tokens-unchanged.mjs /tmp/vc-css-before.css /tmp/vc-css-final.css --allow-added
BEFORE  /tmp/vc-css-before.css  (118 màu)
AFTER   /tmp/vc-css-final.css   (116 màu)
ADDED   (0)
REMOVED (2)
  - #bcc7de
  - #f1f5f9
```

ADDED = 0: token hoá **không sinh màu mới** ở bất kỳ bước nào. 2 màu MẤT là ngoại lệ có chủ đích:

- `#bcc7de` — xám xanh **đã bị loại khỏi vai trò chữ** (`docs/design/tokens.md` §2); 3 chỗ duy nhất
  (`src/App.tsx:1285`, `src/views` DesignerDashboardView:488, 1209) đều là `text-` → `fg-subtle` theo §3.2.
- `#f1f5f9` — §3.2 gộp `#E2E8F0` + `#F1F5F9` → `line-subtle` (giá trị `#E2E8F0`); 17 chỗ (`bg-`/`border-`/`divide-`).

Các ngoại lệ đổi giá trị khác (đều do §3.2/§3.3 quy định) đã liệt kê đầy đủ `file:line` ở **Phần A §3**:
`#94a3b8` (43 chỗ chữ + 6 chỗ viền control), `#8590a6` (8 chỗ chữ), `#091426` (9 chỗ viền), `#d8e3fb` (3 chỗ chữ).
Tổng **89 chỗ** đổi giá trị màu có chủ đích trên 3.576 chỗ thay thế (2,5%).

`#94a3b8` vẫn còn 2 lần trong CSS build — **không phải** do source: `docs/plans/01-theme-migration.md`
chứa nguyên văn `placeholder-(#94A3B8)` nên Tailwind sinh 1 rule CHẾT (không component nào dùng).
Trong `src/**` đã sạch: 0 chỗ `#94A3B8` còn lại trong `className`.

## B.6 Idempotent + phạm vi

```
node scripts/codemod-tokens.mjs --dry-run        # chạy lại trên toàn src
REPLACE 0 (chưa ghi)   REJECT 830
```

- Chỉ ghi file `.tsx` / `.jsx` (hàm `collectFiles` lọc cứng) → **không file `.ts` nào bị sửa**.
- Không đụng `style={{…}}`, không đụng utility phi màu (`text-[10px]`, `w-88`, `rounded-*`, `shadow-*`, `z-*`).
- Bỏ qua cứng `src/frontend/ui/**` (thư viện primitive của A2b) và `src/frontend/theme/**`.
- Màu trong JS của `ModelViewer3D.tsx` (vùng 143–180: `stencilMatBackRef`/`stencilMatFrontRef`/`capMaterialRef`,
  `new THREE.Color(0x…)`) **không bị chạm** — codemod chỉ khớp class string trong `className`.
- **Report này không tự sinh CSS:** Tailwind v4 quét cả `.md` trong repo, nên mọi ví dụ "trước" được in dạng
  `bg-(#00687A)` thay vì nguyên văn lớp hex. Đã kiểm chứng: report chứa 0 chuỗi dạng lớp hex.

## B.7 Gate cuối

```
npm run lint                                        # RC=0 (tsc --noEmit)
npx vite build --outDir /tmp/vc-verify-a2d --emptyOutDir   # RC=0
node scripts/check-contrast.mjs                     # RC=0 — 58/68 pass, 10 EXPECTED, 0 unexpected fail
node scripts/verify-tokens-unchanged.mjs <before> <final> --allow-added   # ADDED 0, REMOVED 2 (có chủ đích)
```
