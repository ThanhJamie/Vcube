<!-- doc-meta: status=active; verified=2026-10-19; owner=reviewer-R2 -->
# Review R2 — Wave 2 (A11y & Responsive)

> Phạm vi: `git diff --name-only -- src/frontend src/App.tsx src/index.css` (94 file).
> Phương pháp: **static only** — phiên này không có Playwright. Đã chạy `check-contrast.mjs`,
> `check-contrast-combos.mjs`, grep/parse TSX. Các mục ghi "cần browser" ở §3 chưa được xác nhận.

## Tổng
- File đã chấm: 94 (thay đổi UI trong working tree)
- **Blocker: 10 · Major: 14 · minor: 4 · Nit: 2** (30 mục; ưu tiên B/M)
- Gate tĩnh: contrast PASS (47/55 pass, 8 expected non-pass, 0 unexpected); combos PASS (99 file, 0 vi phạm); sàn chữ 12px PASS; `h-screen`/`min-h-screen` = 0; `animate-*` vô hạn 100% có `motion-reduce:animate-none` (cộng media query toàn cục).

## Danh sách

| # | Mức | File:line | Vấn đề (căn cứ) | Ngưỡng | Cách sửa |
|---|---|---|---|---|---|
| 1 | **B** | `ValidationReportPanel.tsx:88`, `Group5ProductionPanel.tsx:424`, `AdminSeoPanel.tsx:136`, `AdminStorefrontPanel.tsx:174`, `TransformControlsPanel.tsx:32`, `AuthModal.tsx:307`, `PresetPalettePanel.tsx:341`, `StlUnitConfirmModal.tsx:89` | **Nút raw thiếu `focus-visible:ring`**: 250 `<button>` không có ring class (163 chỗ có). Không control nào bị mất focus hoàn toàn (0 `outline-none` thiếu ring), nhưng chỉ còn outline mặc định của UA — sai hợp đồng §3.2, dễ mất tương phản trên nền tint/tối. R2 #1 | `focus-visible:ring-2 ring-ring` trên 100% control | Thêm `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` hoặc thay bằng `<Button>` |
| 2 | **B** | `ValidationReportPanel.tsx:88,101,114,130,144,163,172,181` | Tab/action của báo cáo kiểm định cao **34px** (`py-1.5`), nút sửa mesh **40px** — dưới 44px ở 390. R2 #2 | ≥44×44 mobile | Thêm `max-md:min-h-11` (và `max-md:min-w-11` cho icon-only) |
| 3 | **B** | `Group5ProductionPanel.tsx:424,439,456,503` | 3 tab Kanban + 4 chip vùng miền cao **34px** (`py-1.5`), không có min-height mobile. (8 nút chọn nấc và 3 action thẻ dùng `<Button size="sm">` đã đạt 44px — đúng.) R2 #2 | ≥44×44 mobile | `max-md:min-h-11` cho tab/chip |
| 4 | **B** | `AuthModal.tsx:289,307,322,336,359,373` | Nút đóng lỗi/thành công `p-0.5` + icon 16 = **~20px**; tab mode 34px; "Đổi tài khoản" chỉ cao theo text (~20px). R2 #2 | ≥44×44 mobile | Dùng `<Button iconOnly size="sm">`; tab thêm `max-md:min-h-11` |
| 5 | **B** | `PresetPalettePanel.tsx:341,350,360,373` | Nút đổi slot **28×28** (`h-7 w-7`), nút "Đổi Cho Toàn Bộ Part" chỉ theo text, nút áp dụng **32px**. R2 #2 | ≥44×44 mobile | Tăng hit area bằng `max-md:size-11` / `max-md:min-h-11` |
| 6 | **B** | `TransformControlsPanel.tsx:32,48,62,76`; `Tool3DView.tsx:1353,1426`; `MachineComparisonModal.tsx:71,155`; `StlUnitConfirmModal.tsx:89,96` | Nút reset 32px; tab Scale/Rotate/Move 34px; preset infill 32px; batch 32px; đóng modal 40px; "Chọn Máy Này" 36px; 2 nút xác nhận STL 40px. R2 #2 | ≥44×44 mobile | `max-md:min-h-11` / `max-md:size-11` (icon-only) |
| 7 | **B** | `ProductDetailView.tsx:461,476,491,506`; `AdminSeoPanel.tsx:136,149,162,175`; `AdminStorefrontPanel.tsx:174,187,200,213,226,239` | Segmented tab cao **34px**. Riêng Admin có `overflow-x-auto` nên không tràn ngang, nhưng vùng chạm vẫn dưới 44. R2 #2 | ≥44×44 mobile | `max-md:min-h-11`; giữ scroll wrapper |
| 8 | **B** | `InternalCostBreakdownModal.tsx:222-223` | Bảng 4 cột nằm trong `overflow-hidden`, **không có `overflow-x-auto`**; `td` còn `whitespace-nowrap` (dòng 235) ⇒ ở 390 nội dung bị cắt, không cuộn được. R2 #8 | `scrollWidth <= 390`, không mất nội dung | Bọc `overflow-x-auto` + `min-w-[640px]` cho `<table>` |
| 9 | **B** | `StlVs3mfComparisonModal.tsx:89-90` | Bảng 3 cột có cột cứng `w-32/w-40` trong `overflow-hidden`, không có x-scroll ⇒ cắt cột 3MF ở 390. R2 #8 | như trên | `overflow-x-auto` + `min-w-[600px]` |
| 10 | **B** | `InvoiceModal.tsx:190-191` | Bảng hoá đơn **6 cột** trong `overflow-hidden rounded-lg`, không có x-scroll ⇒ cắt cột giá/thành tiền ở 390. R2 #8 | như trên | `overflow-x-auto` + `min-w-[720px]`; cân nhắc card layout mobile |
| 11 | **M** | `AccessoriesManager.tsx:490-610,647-761` | **22 field** dùng `<label>` trần không `htmlFor`, input/select/textarea không `id`/`aria-label`/`aria-invalid`/`aria-describedby` (0/25 control có id). Screen reader chỉ đọc placeholder. R2 #7 | 100% field có label lập trình được | Chuyển sang `<Field>` hoặc cấp `id` + `htmlFor`; lỗi dùng `aria-invalid` + `aria-describedby` |
| 12 | **M** | `Tool3DView.tsx:1300,1324,1364,1381,1402` | 5 `<select>` + range Infill không `id`/`aria-label`; cả file có `htmlFor` = **0**. Label nhìn thấy là sibling nên không gắn với control. R2 #7 | 100% field | Dùng `<Field>`/`<Select>` hoặc `id` + `htmlFor` + `aria-label` cho range |
| 13 | **M** | `ProductDetailView.tsx:817-824,836-844` | "Độ phân giải lớp in" và "Khắc laser" có `<label>` sibling nhưng select/input không `id`, không `aria-label`, label không `htmlFor`. R2 #7 | 100% field | Ghép `id`/`htmlFor` hoặc `Field` |
| 14 | **M** | `HomeView.tsx:695` | Ô tìm kiếm CAD chỉ có `placeholder`, không `aria-label`/label. (ExploreView:605 đã có `aria-label` — đúng.) R2 #7 | 100% field | Thêm `aria-label`/`hideLabel` Field |
| 15 | **M** | `Group5ProductionPanel.tsx:515,1131` | `<Select>` lọc xưởng không label/aria-label; textarea ghi chú có `<label>` sibling nhưng không `htmlFor`. R2 #7 | 100% field | `aria-label` + `id`/`htmlFor` |
| 16 | **M** | `InternalCostBreakdownModal.tsx:321,335` | 2 input override giá/lý do có label sibling, không `id`/`htmlFor`, không `aria-describedby` cho cảnh báo audit. R2 #7 | 100% field | `Field` hoặc ghép id |
| 17 | **M** | `ThreeModelViewer.tsx:448` | Range "Layer Slicer" không `aria-label`/`id`; thanh bar có chữ nhưng không gắn với input. R2 #7 | 100% field | `aria-label="Lớp cắt (%)"` |
| 18 | **M** | `Header.tsx:184-197,354-367` | Nav active (desktop + mobile) chỉ khác màu/viền/font-weight; **không `aria-current="page"`**. R2 #5 | trạng thái có ngữ nghĩa | Thêm `aria-current={isActive ? 'page' : undefined}` |
| 19 | **M** | `Group5ProductionPanel.tsx:424,439,456`; `AdminSeoPanel.tsx:136...`; `AdminStorefrontPanel.tsx:174...` | Tab/segmented chỉ truyền đạt trạng thái bằng nền + đậm; không `role="tab"`/`aria-selected`/`aria-pressed`. Group5 còn thiếu `type="button"`. R2 #5 | không chỉ dùng màu | Dùng `role="tablist"`+`aria-selected` hoặc `aria-pressed`; thêm `type="button"` |
| 20 | **M** | `Header.tsx:298-310` | Drawer mobile là `<div role="dialog" aria-modal="true">`, **không phải `<dialog>`**: không có top-layer/inert, `aria-modal` không thực sự khoá AT. Có focus trap/Esc/body-lock thủ công (tốt), nhưng `z-index: 998/999` hardcode trong `.mobile-nav-*` vượt `z-modal` 50 / `z-toast` 60. R2 #10/#11 | dialog native + z token | Chuyển sang `Sheet side="right"`; bỏ z hardcode |
| 21 | **M** | `UserAvatarMenu.tsx:97-122` | **Xác nhận còn:** không có Esc, không có click-outside; menu mở bằng hover/click và chỉ đóng khi click item hoặc hover ra. Keyboard user không có đường đóng chuẩn. R2 #11 | Esc + click ngoài | Thêm `useEffect` keydown Esc + pointerdown ngoài `ref` |
| 22 | **M** | `CartDrawer.tsx:76-84` + `ui/Modal.tsx:152` | Drawer phải dùng `placement="right"` ⇒ panel luôn `rounded-none`; không có 20px như §2.1 "modal, sheet". Vấn đề "rounded-none thắng rounded-modal do thứ tự CSS" đã được sửa bằng nhánh biến, nhưng **hệ quả là mất bo góc hoàn toàn**. R2 §2.1 | `rounded-modal`/`rounded-l-modal` | Đổi thành `rounded-l-modal` cho `right`, `rounded-r-modal` cho `left`; hoặc ghi rõ ngoại lệ flush-edge vào hợp đồng |
| 23 | **M** | `CartDrawer.tsx:226-241` | Nút giảm/tăng số lượng chỉ có text `-`/`+`, không `aria-label`; screen reader đọc "minus/plus" không kèm sản phẩm. `CartView.tsx:329,342` đã làm đúng. R2 #6 | tên truy cập đầy đủ | Thêm `aria-label={`Giảm số lượng ${item.name}`}` (tương tự tăng) |
| 24 | **M** | `ui/Input.tsx:34`, `ui/Select.tsx:44` | Focus dùng `focus:ring-2 ring-ring/20` (**~1.5:1 trên trắng**) và `focus:` thay vì `focus-visible:`; chỉ còn viền `border-primary` 1px làm indicator. Ring 20% không đạt 3:1 cho focus indicator. R2 #1/#4 | ring ≥3:1 | Dùng `ring-ring` đặc (hoặc `/60`) + `focus-visible:`; đề xuất sửa §3.3 |
| 25 | **m** | `PricingConfigPanel.tsx:1187,1213,1237…` | **Đã kiểm:** 68 input/select có `id`, 68 `htmlFor`, 0 trùng id — label ĐẠT. Nhưng hint `<p>` không có `id`/`aria-describedby`; 69 field dùng recipe inline thay vì `Field` nên dễ lệch tiếp. R2 #7 | hint được mô tả | Gắn `id` hint + `aria-describedby` (hoặc chuyển dần sang `Field`) |
| 26 | **m** | `AuthModal.tsx:416`; `CartDrawer.tsx:89,182` | Heading bắt đầu từ `h4` trong dialog Auth; CartDrawer `h2` → `h4` (bỏ `h3`). R2 #12 | không nhảy cấp | Đổi `h4` → `h3`/`h2` tương ứng |
| 27 | **m** | `CanvasErrorBoundary.tsx:61`; `RoleGuard.tsx:83`; `Tool3DView.tsx:1013` | Ô vuông 48px dùng `rounded-lg` 16px ⇒ tỉ lệ **0.67** (gần tròn), trái khuyến nghị A19 `w-7…w-12` dùng `rounded-md/sm`. `EmptyState.tsx:70` được §3.9 cho phép rõ ràng. | radius/(min/2) < 1, ưu tiên ≤0.5 | Đổi 3 chỗ sang `rounded-md` |
| 28 | **m** | `Tool3DView.tsx:1120,1669,1683,1694`; `ModelViewer3D.tsx:1710`; `PersonalizeModelViewer3D.tsx:701` | `transition-all` trên tab/nút/fullscreen container, không phải card hover. §2.5 chỉ cho card hover dùng `transition-all`. R2 #10 | transition đúng property | Đổi sang `transition-colors`/`transition-[width]` |
| 29 | **N** | `Header.tsx:209-215` | Nút icon search mở **toàn bộ drawer nav** nhưng aria-label "Mở tìm kiếm", thiếu `aria-expanded`/`aria-controls` (nút menu bên cạnh có). | tên khớp hành vi | Đổi label "Mở menu & tìm kiếm" hoặc thêm state search riêng |
| 30 | **N** | 34 call site `text-fg-subtle` trên `bg-surface-muted` (4.61:1) | Không fail nhưng sát ngưỡng 4.5. Nếu ai đổi `fg-subtle`/`surface-muted` sẽ fail ngay. `check-contrast-combos` đang sạch. | ≥4.5:1 | Giữ nguyên token; thêm cặp này vào gate khi đổi token |

## Điểm tốt (giữ nguyên)

- **Sàn chữ:** 0 `text-[9px]`/`[10px]`/`[11px]`; body 14px, `text-xs` 12px.
- **Contrast:** `check-contrast` 0 unexpected fail; `check-contrast-combos` quét 99 file, 0 vi phạm. Không tìm thấy cặp `text-fg-subtle` + `bg-primary-tint`/`info-tint`/`line-subtle` trực tiếp.
- **Reduced motion:** mọi `animate-spin/pulse/ping` đều có `motion-reduce:animate-none`, cộng media query toàn cục ở `src/index.css:562`.
- **Icon-only:** 0 `<Button iconOnly>` thiếu `aria-label` (type union chặn ở TS); raw icon-only button/a đều có aria hoặc text. `Icon` mặc định `aria-hidden`.
- **Dialog:** `Modal`/`Sheet`/`ConfirmDialog` đều dựng trên `<dialog>` + `showModal()`, focus restore, body-scroll ref-count. `AuthModal` lồng `ConfirmDialog` không thấy lỗi tĩnh (cần browser xác nhận Esc/top-layer).
- **PricingConfigPanel:** 68 id ↔ 68 label, 0 trùng — rủi ro "69 field không label" **không xảy ra**; chỉ còn hint chưa `aria-describedby`.
- **OrderTrackingView:** nút "Thử lại" `form="guest-lookup-form"`/`-2` đều trỏ tới `<form id>` có thật (dòng 171/332 và 207/364). PASS.
- **Group5ProductionPanel:** 8 nút chọn nấc + 3 action thẻ dùng `<Button>` ⇒ mobile ≥44px; bảng Kanban `min-w-[2100px]` nằm trong `overflow-x-auto`.
- **DataTable:** có `overflow-auto`, `caption` sr-only, hàng `tabIndex` + `onKeyDown`, checkbox bọc `<label className="size-10">`.
- **Không còn** `h-screen`/`min-h-screen`; `dvh` được dùng.
- **Header drawer:** đã có Esc, click backdrop, focus trap, trả focus; `bg-surface!`/`shadow-e3!` thắng `.mobile-nav-*` đúng như thiết kế.
- **A19:** không có ô vuông nào thành hình tròn; chỉ 3 tile 48px ở mức 0.67 (mục 27).

## Checklist 390 / 768 / 1440

| Mục | 390 | 768 | 1440 |
|---|---|---|---|
| Không tràn ngang toàn trang (R2 #8) | ⚠️ **cần browser** — tĩnh dự đoán FAIL ở 3 bảng modal (#8–10); các bảng khác có `overflow-x-auto` | ⚠️ cần browser | ⚠️ cần browser |
| Bảng cuộn ngang, không cắt cột | ❌ 3 modal fail tĩnh; phần còn lại PASS | ⚠️ cần browser | ⚠️ cần browser |
| Tap target ≥44 (R2 #2) | ❌ nhiều nút 20–40px (mục 2–7); chưa đo phần tử bị wrap | ⚠️ cần browser | ⚠️ cần browser |
| Focus ring nhìn thấy (R2 #1) | ⚠️ tĩnh: thiếu ring ở nhiều nút raw; cần xem outline UA trên nền tint/tối | ⚠️ cần browser | ⚠️ cần browser |
| Không tràn layout / chồng lớp | ⚠️ **cần browser** — Group5 Kanban 2100px, AuthModal, CartDrawer | ⚠️ **cần browser** — UserAvatar popover 340/390px | ⚠️ **cần browser** — PricingConfigPanel 69 field |
| Bàn phím: Tab tới mọi control, Esc đóng | ⚠️ **cần browser** — Header drawer, UserAvatarMenu, AuthModal→ConfirmDialog | ⚠️ cần browser | ⚠️ cần browser |
| Heading order (R2 #12) | ⚠️ tĩnh: 2 trang có 2 `h1` nhưng thuộc nhánh loại trừ (OrderTracking 137/277, Tool3D 618/940); AuthModal/CartDrawer lệch cấp | ⚠️ cần browser | ⚠️ cần browser |
| Reduced motion | ✅ static PASS | ✅ static PASS | ✅ static PASS |
| 768/1440 không vỡ layout | — | ⚠️ cần browser | ⚠️ cần browser |

## Đề xuất cập nhật hợp đồng (orchestrator quyết)

1. **§3.3**: `focus:ring-ring/20` không đạt 3:1 focus indicator. Đổi thành `focus-visible:ring-2 focus-visible:ring-ring` (đặc) hoặc ghi rõ ring 20% chỉ là trang trí và viền `border-primary` mới là indicator.
2. **§2.1/Sheet**: chốt rõ sheet cạnh trái/phải có bo 20px (`rounded-l/r-modal`) hay flush `rounded-none`; code hiện tại và câu "modal, sheet 20px" đang mâu thuẫn.
3. **§3.5**: bổ sung bắt buộc `overflow-x-auto` + `min-w-[…]` cho mọi bảng trong modal; `overflow-hidden` một mình là bẫy cắt nội dung.
4. **§3.9 vs A19**: `size-12 rounded-lg` của EmptyState đang được §3.9 cho phép nhưng trái A19; ghi rõ ngoại lệ "icon tile empty state" hoặc đổi về `rounded-md`.
5. **§3.6**: segmented control phải có `aria-pressed`/`aria-selected` và `max-md:min-h-11`; hiện 6 file dùng tab 34px không ngữ nghĩa.

## Cần browser ở Wave 4 (bắt buộc)

1. **390 toàn bộ route** — `document.documentElement.scrollWidth <= 390`; ưu tiên 3 modal bảng (#8–10) và Group5 Kanban.
2. **Header drawer mobile** — focus trap, Esc, click backdrop, focus trả về; kiểm toast có bị drawer (z 999) che không.
3. **UserAvatarMenu** — Esc/click-outside sau khi sửa (#21); Tab ra khỏi menu.
4. **AuthModal → ConfirmDialog** — Esc chỉ đóng dialog trên, focus trả về nút "Đăng Xuất", body scroll còn khoá đúng 1 lớp.
5. **CartDrawer** — bo góc sau sửa (#22); nút +/- đọc tên đúng (#23); 390 không tràn.
6. **Focus-visible** — soi ring trên nền tối/HUD, segmented 34px và Input ring/20 (#1, #24).
7. **Tap target thực đo** tại 390 cho các nút 20–40px (#2–7), kể cả phần tử bị wrap.
8. **Contrast in-situ** — dark band Home, 3D HUD, badge tint admin; axe/DevTools (script chỉ kiểm cặp token).
9. **768/1440** — PricingConfigPanel, Group5 dispatcher/fleet, UserAvatar popover, ProductDetail sticky card.
10. **Heading outline** từng route (1 `h1`), đặc biệt OrderTracking/Tool3D và 2 dialog lệch cấp.
