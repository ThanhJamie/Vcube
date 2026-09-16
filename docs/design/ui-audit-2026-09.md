# UI/UX Audit & Backlog — 2026-09

> Nguồn: 7 audit agent (E1–E7) theo `docs/design/taste-contract.md`, sau commit `41302c0`.
> **Cách dùng**: đây là backlog thi công UI/UX. Bất biến repo (data-honesty, token, icon, light-first) luôn thắng skill.

## 0. Đã xử lý (cập nhật cuối)
- **Phase 1**: FAB, ModelViewer3D on-demand, `/quote` (input value, try/finally, money guard + boundary, file picker, STL unit modal), icon glyphs/gate.
- **C1**: `h-dvh`, sàn chữ 12px, hex/token, reduced-motion JS.
- **C2a/C2b**: header, CadQuickView honesty, MaterialComparisonMatrix (dùng `materials` thật), ProductDetail slicer, ServiceShowcase, hero telemetry, Personalize default, CustomIdea targetSpecs, i18n header bảng, keyboard a11y, bỏ CTA trùng.
- **C3**: chặn giỏ rỗng, confetti sau khi lưu, money/formatCurrency, VAT loading, COD persist, CartDrawer (width/Unsplash/tap), OrderSuccess guest, MyOrders warranty, AssetLibrary.
- **C4a–f**: admin write-path (accessories/materials/printers), formula qua service audited, nav `machines`, load orders, label `unit_price_multiplier`, estimator null-guard, region enum; **migration 36 cột `site_content`**; honest saves + ConfirmDialog + bỏ ảnh bịa + nullable `current_stock_grams`; **Designer** bỏ dữ liệu bịa (payout/overview/wizard/quote) + **RLS scope `custom_design_requests`**; Lab onboarding bước 4; Lab stats dedupe; **InvoiceModal → `<dialog>`**.
- Ghi chú: migration `20260901` + `20261010` cần chạy lại trên DB (idempotent).

## Còn lại (chưa làm)
- `DataTable` adoption cho admin/lab/designer (sort/pagination) — hiện dùng `<table>` tự chế.
- Migrate ~30 overlay tự chế còn lại sang `Modal`/`Sheet` + `Header` drawer focus trap.
- Lab: thêm trạng thái "delivered/completed" (pipeline MES hiện dừng ở "Xuất xưởng giao"); `onRetry`/loading cho các bảng.
- Storefront: hero fit viewport (restructure), catalog skeleton, `content-visibility` cho list dài.
- Đổi `picsum`/ảnh tham chiếu (nếu dùng `imagegen`) — chỉ nội bộ.
- **C5**: verify browser 390/768/1440 (cần Playwright MCP hoặc kiểm thủ công).

## 1. Đã sửa ở Phase 1 (không báo lại)
FAB (rAF + overlap khi ngừng cuộn), ModelViewer3D on-demand loop + FPS ref, `/quote` file input value + try/finally, money guard QuoteSummaryPanel + PanelErrorBoundary, icon glyphs + touch affordance, CadQuickView/StlUnitConfirm → `<dialog>`, header blur, reduced-motion toàn cục, gate `check-icon-names`.

## 2. Critical
| # | file:line | Vấn đề |
|---|---|---|
| C-1 | `tool3d/MachineComparisonModal.tsx:104,144` | Lộ **giá vốn** cho khách (modal không gate `canSeeInternalCost`). |
| C-2 | `CheckoutView.tsx:63-110,231` | Không chặn giỏ rỗng → tạo đơn 0đ thật. |
| C-3 | Admin: `App.tsx:1666,1697` + `AccessoriesManager` | Phụ kiện **không persist** (RAM-only); `saveAccessory` không có caller. |
| C-4 | Admin: `PricingConfigPanel.tsx:424` + `database.ts:650-673` | Lưu công thức **báo success dù lỗi**, không audit. |
| C-5 | Admin: `App.tsx:1328-1342` | ~36 field Storefront/SEO **bị bỏ** khi lưu. |
| C-6 | Admin: `App.tsx:934-958` | Xoá material/printer **không xoá DB** → hiện lại sau reload. |
| C-7 | Designer: `DesignerPayoutsTab.tsx:15,29-43`, `DesignerOverviewTab.tsx:16-111`, `DesignerUploadWizardTab.tsx:23-39,310-331`, `DesignerRequestsTab.tsx:99-115` | Số dư/nút rút tiền/mesh/quote **bịa** là mặc định render. |
| C-8 | Storefront: `MaterialComparisonMatrix.tsx:28-113` | Bảng so sánh **bịa** điểm/°C/giá, bỏ qua prop `materials` thật. |
| C-9 | Storefront: `ProductDetailView.tsx:566-590` | Profile slicer hardcode (Bambu 215–230°C, "In được") cho **mọi** sản phẩm. |
| C-10 | Lab: `WorkshopOnboardingWizard.tsx:443-455` | Step 4 không bao giờ hiển thị; status `Pending` bịa tại RAM. |

## 3. High
- **Transaction**: confetti trước khi tạo đơn (`CheckoutView.tsx:118`); VAT loading bị coi là "chưa cấu hình" (4 file); COD mâu thuẫn giữa success/invoice/tracking; `NaN đ` do `.toLocaleString` không guard (`OrderSuccessView.tsx:260`, `MyOrdersView.tsx:307`, `OrderTrackingView.tsx:455`); `InvoiceModal` in "0 ₫" cho total thiếu; `/cart` hứa "Tải Tức Thời" còn `/assets` báo "chưa hỗ trợ".
- **Storefront**: telemetry 3D hero bịa (`HomeView.tsx:533-544`); badge "Commercial Ready"/"Mesh check" toàn catalog (`HomeView.tsx:631`); ServiceShowcase cam kết ±0.10mm/100%/PEEK (`ServiceShowcaseSection.tsx:55-135`); `CadQuickViewModal` rating không guard + format/màu bịa.
- **/quote**: manual-review "gửi/30 phút" giả (`QuoteSummaryPanel.tsx:263-270`); discount bịa (`:342`); `ObjectTreePanel` material list hardcode (`:35-43`); thumbnail stock Unsplash (`:251`); nhãn `unit_price_multiplier` sai (`PricingConfigPanel.tsx:2596`).
- **Lab/Designer**: region enum lệch `Nam`/`Đông`; `CustomIdea` targetSpecs bịa; `DesignerModelsManagerTab.tsx:126-131` lọc "của tôi" bằng substring tên.
- **Design-system**: 34 modal tự chế (không `<dialog>`); 5 `window.confirm`; 18 icon-button thiếu `aria-label`; ~40 input dùng `border-line` (1.42:1) làm viền control.

## 4. Medium (chọn lọc)
- 183 `transition-all` / 45 file; 50 `animate-pulse`, 26 `animate-spin`, 5 `animate-ping` vô hạn.
- `min-h-screen` ở 16 route (nên `min-h-dvh`); `h-screen` ở sidebar/viewer.
- 24 overlay `backdrop-blur`; blur trên sticky (`ProductDetailView.tsx:934`, `PersonalizeView.tsx:1049`, `UserAvatarMenu.tsx:149`).
- `text-[10px]/[11px]` dưới sàn 12px (9 chỗ); `tracking-wider` 232×, `uppercase` 530× (eyebrow tràn lan).
- Hex cứng còn lại: `HomeView.tsx:523,1079`; token đã xoá `#94A3B8` ở `PersonalizeView.tsx:18`.
- `ui/Money` 0 consumer; `ui/ConfirmDialog`/`Toolbar`/`Section` 0 consumer; `DataTable` dùng ở 1 view vs 23 `<table>` tự chế.
- `ThemeProvider.tsx:27` `DARK_ROUTE_PREFIXES=[]` nhưng nhiều console tự style dark → lệch.
- WebGL `ThreeModelViewer.tsx:330` rAF vô điều kiện + remount khi scroll; auto-rotate JS chưa gate reduced-motion.
- `key={idx}` 19 chỗ; `useInViewport` không re-observe khi ref đổi.

## 5. Task 1 — E1 (docs ↔ code) còn lệch
- `/workshop/settings` là route "ma" trong `docs/README.md:93` + `docs/pages/designer-workshop-portals.md:7,87` (không có trong router).
- `src/backend/supabase/admin.ts` là file chết (đọc `NEXT_PUBLIC_*`) — cần xoá hoặc tài liệu hoá.
- `docs/tasks/README.md:5` vẫn gọi `docs/plans/00–07` là "nguồn chuẩn".
- OCCT WASM ghi "32MB" nhưng thực 7.6MB (`docs/SETUP_RUNBOOK.md`).
- `@supabase/ssr`, `@google/genai` trong deps nhưng 0 import.

## 6. Thứ tự thi công đề xuất
1. **C1 (đã làm 1 phần)**: token/vệ sinh toàn cục — `dvh`, sàn chữ 12px, hex/token xoá, reduced-motion JS, `warning-strong` nhỏ.
2. **C2 Storefront**: hero fit + CTA intent + eyebrow + data-honesty (C-8, C-9, telemetry/badge/ServiceShowcase).
3. **C3 Transaction**: empty-cart guard, money guard, VAT loading, COD resolver, modal primitive.
4. **C4 Consoles**: DataTable, ConfirmDialog, `machines` tab, region enum, admin write-path (cần migration).
5. **C5**: gate + browser 390/768/1440.
