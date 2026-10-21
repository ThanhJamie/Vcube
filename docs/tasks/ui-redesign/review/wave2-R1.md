<!-- doc-meta: status=active; verified=2026-10-19; owner=thanh; reviewer=R1 -->
# Review R1 — Wave 2 (Consistency)

> Reviewer **R1 — Consistency**. Chỉ đọc/chấm, **không sửa code**. Căn cứ duy nhất:
> `docs/tasks/ui-redesign/DESIGN-LANGUAGE.md` (LOCKED), `PLAN.md` §2/§7/§8, `REVIEW.md` §2/§6/§7.
> Nguồn bổ sung: `docs/design/data-honesty.md` (qua PLAN §2.8), `AGENTS.md`.

## Tổng

- **File đã đổi UI trong working tree**: 94 (`git diff --name-only -- src/frontend src/App.tsx src/index.css`).
- **File đã chấm (đọc diff + đọc mẫu)**: 24 — mẫu phủ đủ 8 nhóm:
  - storefront: `views/HomeView.tsx`, `views/ExploreView.tsx`, `views/ProductDetailView.tsx`, `views/PersonalizeView.tsx`
  - transaction: `views/CartView.tsx`, `views/CheckoutView.tsx`, `views/OrderTrackingView.tsx`, `views/MyOrdersView.tsx`, `components/InvoiceModal.tsx`, `components/OrderProgress.tsx`
  - admin: `views/AdminDashboardView.tsx`, `components/admin/AdminSidebar.tsx`, `AdminProductsPanel.tsx`, `AdminStorefrontPanel.tsx`, `AdminSeoPanel.tsx`, `PricingConfigPanel.tsx`, `WorkshopEstimatorBOM.tsx`
  - groups: `components/admin/groups/Group5ProductionPanel.tsx`
  - tool3d: `views/Tool3DView.tsx`, `components/tool3d/ModelViewer3D.tsx`, `QuoteSummaryPanel.tsx`
  - designer/lab: `views/DesignerDashboardView.tsx`, `components/designer/DesignerPayoutsTab.tsx`, `DesignerModelsManagerTab.tsx`, `DesignerUploadWizardTab.tsx`
  - header + modal + primitives Wave 0: `components/Header.tsx`, `ui/Button|Badge|Card|Modal|Money|PageHeader|SideNav|DataTable|EmptyState.tsx`
- **Blocker: 0 · Major: 15 · minor: 22 · Nit: 3** (tổng 40 mục, đã ưu tiên lỗi nặng nhất).
- **Grep tự động (chạy trên toàn `src`)**:

| Check | Kết quả | Kết luận |
|---|---|---|
| `grep -rn "chrome" src --include=*.tsx --include=*.ts` | **rỗng** | ĐẠT (§1.5) |
| hex `#[0-9A-Fa-f]{3,8}` trong `.tsx` | 77 dòng — **100% là dữ liệu/brand/engine**: fill logo Google (12), palette vật liệu (`PresetPalettePanel`, `ObjectTreePanel`, `WorkshopOnboardingWizard`, `HomeView` model color), engine 3D (`ModelViewer3D`, `PersonalizeModelViewer3D` ctx.fillStyle), màu mặc định viewer (`ThreeModelViewer`, `CadQuickViewModal`, `AssetLibraryView`, `HomeView`), hex mặc định form (`Group1WorkshopsPanel:319`), so sánh dữ liệu (`PersonalizeView:557`) | ĐẠT — **0 hex mới cho màu UI** |
| `text-[10px]\|text-[11px]` | **rỗng** | ĐẠT (sàn 12px) |
| `min-h-screen\|h-screen` | **rỗng** | ĐẠT |
| `shadow-sm\|shadow-md\|shadow-lg\|shadow-xl` | **rỗng** | ĐẠT — chỉ còn `shadow-e0..e3` + legacy CSS |
| `rounded-full` | 183 dòng — phân loại theo tag: `span` 113, `div` 50, **`button` 11**, `input` 3, `label` 1; 11 button = 8 swatch/toggle hợp lệ (avatar, switch, dot, chấm màu) + **3 CTA sai (App.tsx)** + 1 badge-as-button | CÓ lỗi ở #6, #31 |
| `backdrop-blur` | 37 dòng / 15 file; hợp lệ ở header (`Header:153`), modal (`ui/Modal:121`, `Topbar`, `AppShell`), HUD 3D (`ModelViewer3D`, `ThreeModelViewer`, `ServiceShowcaseSection`, `ProductDetailView`, `PersonalizeModelViewer3D`) và badge trên ảnh; **2 chỗ ngoài danh mục** (sticky bar mobile) | CÓ lỗi ở #30 |
| `<table` | 12 dòng: 1 trong `ui/DataTable` + **11 bảng thô**. Empty render NGOÀI bảng ở `HomeView:1137`, `ExploreView:1190` (guard trước đó), `PricingConfigPanel:1942` (câu hướng dẫn ngoài), `DataTable` (`ui/DataTable:578`). Không chỗ nào nhồi empty vào `<tbody>` | ĐẠT phần empty; còn lệch recipe ở #23/#24/#32 |
| `<Button>` thiếu `variant` | 19 tag (1 tag trong comment `Tool3DView:596`); 18 là CTA chính hợp lệ theo ngữ cảnh; **1 sai** (`HomeView:918`) | Xem #19 |
| `grep -c "chrome"` mỗi handoff | 0/0/0/0/0/0 ở C1–C6, F1–F3, S1–S5 | ĐẠT |
| `npx tsc --noEmit` (working tree hiện tại) | **exit 0** | ĐẠT |
| Diff logic (`git diff -U0` lọc dòng thêm/xoá không chứa class/markup/a11y) | Không phát hiện đổi props/state/service/chuỗi `isVi ?`; các dòng "lạ" là markup được di chuyển + thuộc tính a11y thêm mới; `getStatusBadge` (`MyOrdersView:109`) đổi shape nội bộ 1 call site | ĐẠT (xem #13 cho thay copy) |
| Số dòng mỗi file vs HEAD | Tất cả trong ±10% **trừ 2**: `DesignerDashboardView +20,1%` (144→173), `AdminStorefrontPanel +10,7%` (987→1093) — không block nào bị xoá | CÓ lỗi ở #27 |

## Danh sách

| # | Mức | File:line | Vấn đề | Căn cứ (§) | Cách sửa |
|---|---|---|---|---|---|
| 1 | M | `ui/Card.tsx:34` | `BASE = '… border-line-subtle …'` — mọi `<Card>` dùng `border-line-subtle`, hợp đồng card là `border-line`. Lệch hệ thống, hiện diện trên ~100 card call-site | §3.1 | đổi `border-line-subtle` → `border-line`; nơi cần hairline mới truyền `className` (nhớ thứ tự CSS: `.border-line-subtle` sau `.border-line`) |
| 2 | M | `ui/Modal.tsx:151-153` | `placement='right'/'left'` và `size='full'` phát `rounded-none`; §2.1 nói modal/sheet bo `--radius-modal` 20px. `cn()` không merge: `.rounded-none` (28313) thắng `.rounded-modal` (28264) nên call site `panelClassName="rounded-modal"` **không có tác dụng** → `CartDrawer`/`Sheet` cạnh trượt vuông góc | §2.1, §3.1 | đổi `rounded-none` → `rounded-modal` (hoặc `rounded-l-modal`), hoặc bổ sung ngoại lệ vào hợp đồng |
| 3 | M | `ui/Money.tsx:39-43` | `SIZE` chỉ có `text-*` + `font-semibold`, **thiếu `font-mono`**; §2.4 bắt "Số liệu: `font-mono tabular-nums`". 31 call-site phải tự vá `font-mono` → chỗ có (`CartDrawer:250`), chỗ không (`InternalCostBreakdownModal:172`) | §2.4 | thêm `font-mono` vào SIZE (Wave 0 phải mở khoá `ui/`), hoặc ghi nợ + hợp đồng cho phép `Money` tự quyết |
| 4 | M | `admin/AdminStorefrontPanel.tsx:125,252,465,538,669,759,888`; `AdminSeoPanel.tsx:88,428,528`; `AdminSettingsPanel.tsx:244`; `PricingConfigPanel.tsx:899` | Panel lớn dùng `rounded-lg … border-line-subtle … p-6 sm:p-8` — lệch cả radius (16 vs 24) và viền (subtle vs line) của recipe panel | §3.1 (`rounded-xl border border-line bg-surface p-6 sm:p-8`) | đổi 14 khối sang `rounded-xl border-line`; giữ `border-line-subtle` cho divider trong panel |
| 5 | M | `views/ExploreView.tsx:865` | `<Card className="… border-primary/30 bg-primary-tint">` — **`bg-primary-tint` là class chết**: trong CSS build `.bg-primary-tint` (offset 36716) đứng TRƯỚC `.bg-surface` của Card (37908) nên nền trắng thắng; CTA "Đã có file CAD riêng?" mất nền tint | §1.4, §3.1 + REVIEW §2 | bỏ chồng nền nằm trong `Card`, thay bằng `ring-2 ring-primary` (đã đo thắng) hoặc bọc `<div className="rounded-lg bg-primary-tint …">` |
| 6 | M | `App.tsx:217`, `:330`, `:336` | CTA nút thô còn **`rounded-full`** (pill), `font-mono uppercase font-bold`, `shadow-e1`, **không có `focus-visible:ring`** — 2 màn "không tìm thấy" (CAD/đơn hàng) chưa qua AURA | §3.2, §4 (`rounded-full` trên nút/CTA → `rounded-md`) | thay bằng `<Button variant="primary|secondary" size="lg">` (App.tsx thuộc wave foundation — cần orchestrator) |
| 7 | M | `Header.tsx:305-311` + `src/index.css:397-421` | Mobile nav là `div role="dialog"` tự chế, dựa `.mobile-nav-panel` còn **`z-index: 999`** (ngoài thang `--z-*`, > `z-modal` 50 / `z-toast` 60) và `box-shadow: -4px 0 24px rgba(9,20,38,.2)` màu slate **đã bị xoá khỏi palette**; backdrop `rgba(0,0,0,.65)` không phải `fg/40` | §2.2, §3.7, REVIEW §7 (modal phải là `<dialog>`) | chuyển sang `Sheet` (đã dựng trên `<dialog>`) hoặc re-tokenize `.mobile-nav-panel` (bỏ z 999 → `z-drawer`, shadow-e3, `--color-fg`) |
| 8 | M | `Header.tsx:153` | Header storefront `h-20 bg-canvas/90`; §3.7 chốt topbar `h-14 … bg-surface/90 backdrop-blur-md sticky` (F3/C5 tuyên bố `h-14` nhưng thực tế `h-20`) | §3.7 | hoặc hạ `h-14` (kèm chỉnh `LoginView/RegisterView:min-h-[calc(100dvh-80px)]`), hoặc bổ sung spec "header storefront cao 80px" vào hợp đồng |
| 9 | M | `views/ProductDetailView.tsx:317-334` | Toggle 3D/Gallery là segmented nằm trong card nhưng active dùng `variant="primary"` (nền đen) — §3.6 quy định active `bg-surface text-fg shadow-e1 font-semibold`; chỉ §3.8 (HUD trên canvas) mới dùng `bg-primary` | §3.6 vs §3.8 (S2 tự nêu ở handoff §4.9) | chuyển sang recipe §3.6 (track `bg-surface-muted p-1`, item active `bg-surface shadow-e1`) |
| 10 | M | `components/tool3d/QuoteSummaryPanel.tsx:629` | Badge "Phổ Biến" = `bg-primary text-primary-fg rounded-full` — badge phải là tint + chữ đặc (C4 đã báo, chưa sửa) | §3.4 | `<Badge variant="technical" size="sm">Phổ Biến</Badge>` |
| 11 | M | `components/tool3d/QuoteSummaryPanel.tsx:687` | Nút hành động thô `bg-warning text-white` — §3.2 chỉ có primary/secondary/ghost/danger/danger-ghost; vàng nghĩa là trạng thái, không phải CTA | §3.2, §0 | dùng `<Button variant="secondary">` + badge/dot `warning` để giữ nghĩa trạng thái |
| 12 | M | `views/Tool3DView.tsx:1610-1660` | Segmented "So Sánh" và 2 toggle raw dùng nền đặc `bg-danger/bg-positive/bg-warning text-white`; trạng thái truyền đạt **chỉ bằng màu** ở item không active | §3.6, §1.4, REVIEW §2 | item active về recipe §3.6 (`bg-surface shadow-e1`), giữ icon/chữ "Trước sửa/Sau sửa"; hoặc dùng `<Button variant>` |
| 13 | M | `components/designer/DesignerPayoutsTab.tsx:26` | `PAYOUT_TRANSACTIONS` (mockData) vẫn render thành **lịch sử quyết toán thật** — AD-08; C4 giữ nguyên theo lệnh nhưng chưa có quyết định orchestrator | data-honesty (PLAN §2.8, D-8) | chọn: (a) empty state + chờ bảng payout thật, (b) nhãn `DỮ LIỆU MẪU`; ghi vào `PROGRESS.md` §Decision log |
| 14 | M | `views/HomeView.tsx:606`, `:970`; `views/ExploreView.tsx:1019`, `:1044`; `components/tool3d/PresetPalettePanel.tsx:293` | Còn `group-hover:scale-105/110` + `transition-transform` trên ảnh/icon — §2.5 chỉ cho hover đổi màu, `hover:shadow-e1`, `active:scale-[0.97]` | §2.5 | xoá `group-hover:scale-*`; giữ `hover:shadow-e1`/đổi màu |
| 15 | M | `src/index.css:397-421` | CSS legacy `.mobile-nav-backdrop/.mobile-nav-panel` dùng màu ngoài token (`rgba(0,0,0,.65)`, `rgba(9,20,38,.2)`) và z-index 998/999; Header phải dùng 3 `!important` (`bg-fg/40!`, `bg-surface!`, `shadow-e3!`) để đè — dấu hiệu tầng style chưa dọn | §1.1, §2.2 | xoá/đổi 2 rule này sang token (`--color-fg/40`, `--shadow-e3`, `--z-drawer`) trong Wave 0/4 |
| 16 | m | `views/CartView.tsx:107-133` | `EmptyState` nhận **2 CTA ngang hàng** trong 1 `action` — hợp đồng "1 hành động"; đây là điểm S3/S4 bất đồng | §3.9, REVIEW §7 (transaction) | 1 CTA chính trong `action`; CTA phụ chuyển thành link chữ dưới `description` (không nằm trong `action`) |
| 17 | m | `views/ExploreView.tsx:952-978` | Empty state "không khớp bộ lọc" có 2–3 nút (reset + báo giá + InfoTip) trong 1 `action` | §3.9 | giữ 1 CTA; phần còn lại thành chú thích/link |
| 18 | m | `components/RouteErrorBoundary.tsx:84-106` | `action` chứa 2 nút (Thử lại + Về trang chủ) | §3.9 | giữ "Thử lại" là action, "Về trang chủ" là link phụ |
| 19 | m | `views/HomeView.tsx:918` | Nút "Reset All Filters" không truyền `variant` → mặc định `primary` (nền đen), thành 2 CTA đen trong cùng empty state | §3.2 | `variant="secondary"` (hoặc `ghost`) |
| 20 | m | `Header.tsx:183-200` | Nav item active dùng `border-b-2 border-primary` (gạch chân) trong khi §3.7 chốt active = `bg-primary-tint font-semibold` + thanh dọc 2px; hợp đồng chỉ mô tả console nên cần chốt | §3.7 (lỗ hổng hợp đồng cho storefront) | đồng bộ với `SideNav` (tint + thanh dọc) hoặc thêm mục "storefront nav" vào §3.7 |
| 21 | m | `components/admin/AdminProductsPanel.tsx:264` | Nhãn SKU trong bảng dùng chip tối `bg-surface-inverse text-on-inverse` — chip kỹ thuật phải là `primary-tint` | §3.4, §1.5 | `<Badge variant="technical" size="sm">` |
| 22 | m | `components/designer/DesignerUploadWizardTab.tsx:232` | Chip định dạng file `bg-surface-inverse px-2 py-0.5 text-on-inverse` — cùng lỗi chip tối trong bề mặt sáng (§1.1: inverse chỉ cho panel lớn giữa trang sáng) | §1.1, §3.4 | `bg-primary-tint text-fg border border-line` |
| 23 | m | `components/admin/PricingConfigPanel.tsx:1942-1960` | Bảng "Mốc chiết khấu" dùng `th px-4 py-3` (không `h-10`) và row `px-4 py-3` (không `h-11`) — trong khi bảng preview cùng file (`:1284`) làm đúng §3.5 → 2 bảng cùng panel lệch nhau | §3.5 | đồng bộ header `h-10` + row `h-11` |
| 24 | m | `components/InvoiceModal.tsx:191-215` | Header bảng `px-2 py-3` `text-xs`, cell `py-3` — không theo §3.5 (`h-10`, `h-11`, `text-sm`); ngoại lệ print chưa được hợp đồng hoá | §3.5, §7 (`@media print` là ngoại lệ hợp lệ) | hoặc chỉnh theo §3.5, hoặc ghi "bảng in" là ngoại lệ trong §3.5 |
| 25 | m | `components/tool3d/ModelViewer3D.tsx:1712` | Fullscreen dùng `z-[100]` (ngoài thang `--z-*`; lớn hơn `z-toast` 60 ⇒ toast bị che) và `rounded-none` | §3.8, §2.1, §3.7 (không 2 control chồng z) | dùng `z-modal` + ghi ngoại lệ `rounded-none` cho fullscreen |
| 26 | m | `components/personalize/PersonalizeModelViewer3D.tsx:703-704` | Fullscreen `rounded-modal` trên overlay `fixed inset-0` → lộ 4 góc nền trang (S2 đã nêu). Cùng lỗi #25 nhưng ngược chiều — 3 màn 3D không thống nhất | §2.1 | chốt 1 quy ước: fullscreen `rounded-none` (ngoại lệ có ghi) cho cả 3 viewport |
| 27 | m | `views/DesignerDashboardView.tsx` (144→173, +20,1%) | Vượt ngưỡng rủi ro ±10% của PLAN §8; nội dung tăng là tab bar mới (không xoá block) | PLAN §8 | chấp nhận + ghi lý do vào handoff (đã có), hoặc tách tab bar ra component riêng |
| 28 | m | `ui/PageHeader.tsx:138` | Tiêu đề trang `text-xl font-bold` — recipe §2.4 là `text-2xl font-bold tracking-tight`; ảnh hưởng `/designer`, `/lab` (2 call-site) | §2.4 | đổi `text-xl` → `text-2xl` |
| 29 | m | `views/Tool3DView.tsx:1248,1296,1320,1345`; `views/PersonalizeView.tsx:295,305,427,493`; `views/MyOrdersView.tsx:315` | Dùng `text-primary` cho **giá trị/số liệu/nhãn trạng thái**, không phải CTA/link/focus (R1 của S3 cũng bắt đúng ở `MyOrdersView:315`) | §0, §4 | đổi sang `text-fg`/`text-fg-muted`; giữ `text-primary` cho link/nút/focus |
| 30 | m | `views/ProductDetailView.tsx:993`; `views/PersonalizeView.tsx:1055` | Sticky CTA bar mobile dùng `backdrop-blur-md` — §4 chỉ cho phép header/modal/HUD | §4, REVIEW §2 #10 | bỏ blur (giữ `bg-surface/95`) |
| 31 | m | `components/designer/DesignerModelsManagerTab.tsx:213-229` | Status badge là `<button>` (pill) để toggle — nút phải 12px; pill chỉ dành badge | §3.2 vs §3.4 | `<Badge>` + `<Button variant="ghost" iconOnly>` riêng cho hành động |
| 32 | m | `views/HomeView.tsx:1137`; `views/ExploreView.tsx:1190` | Cell bảng dùng `text-xs` (Explore) trong khi §3.5 cell là `text-sm text-fg`; 2 bảng này cũng lặp recipe §3.5 bằng tay thay vì `DataTable` | §3.5 | đồng bộ `text-sm`; hoặc chuyển sang `DataTable` (đã có sort/filter sẵn) |
| 33 | m | `components/admin/groups/Group5ProductionPanel.tsx:1078-1092` | `<label>` bao nhóm 8 nút (không `htmlFor`/không control) — label không gắn được; 8 nút `size="sm"` 1 dòng dễ truncate ở 390 (C2 tự nêu) | REVIEW §2 #7 | đổi `<label>` → `<p>`/`<span>` micro-label; giữ `Button size="sm"` (đã có `max-md:min-h-11`) |
| 34 | m | `views/CartView.tsx:106`, `CheckoutView.tsx:249`, `MyOrdersView.tsx:131`, `AssetLibraryView.tsx:83`, `ProductDetailView.tsx:220`, … (~20 view) | Mỗi route lại `min-h-dvh` trong khi đã nằm trong shell có header (`h-20`/`h-14`) ⇒ trang ngắn luôn cao hơn viewport 1 header (scrollbar thừa) | §3.7 (`app: min-h-dvh`) | bỏ `min-h-dvh` khỏi view, hoặc tính `calc(100dvh-…)` như LoginView |
| 35 | m | `views/Tool3DView.tsx:702,1135,1471`; `QuoteSummaryPanel.tsx:57,663,678` (34 chỗ toàn repo) | Viền trạng thái dùng `/30`–`/40`; hợp đồng tint/badge chốt `/20` | §3.4 | chuẩn hoá `/20` (ngoại lệ: viền control) |
| 36 | m | `views/WorkshopSettingsView.tsx:1541,1560` | Banner warning dùng `border-warning/40` + `text-fg-muted` trên `warning-tint`; cặp chữ/nền này nằm ngoài bộ gate contrast (4.3x với fg-subtle, chưa đo với fg-muted) | §1.4, §3.9 | đổi viền `/20` và chữ `text-warning` (đúng cặp đã đo 4.87:1) |
| 37 | m | `components/admin/AdminSidebar.tsx:12,63,70,110,117,135,142,149,161` | `badgeColor` vẫn được build cho mọi item nhưng `SideNav` **không đọc prop này** (F1 ghi rõ) — code chết dễ gây hiểu nhầm là badge đang được style | PLAN §2.6 (không refactor ngoài phạm vi) | xoá `badgeColor` khỏi `AdminNavItem` + 8 literal (hoặc để orchestrator chốt) |
| 38 | N | `views/AssetLibraryView.tsx:258` | `color="#00687a"` (teal cũ) truyền cho `ThreeModelViewer` — hex có sẵn, không do wave này thêm | §4 (ngoại lệ dữ liệu) | ghi nợ, đổi sang `var(--color-info)` khi chạm `ThreeModelViewer` |
| 39 | N | `views/PersonalizeView.tsx:19-20` | Comment nói `#8590A6` là token `line-control` nhưng token mới là `#8A8078` — comment lạc hậu, dễ dẫn integrator sai | §1.1 | cập nhật comment (không đổi giá trị) |
| 40 | N | `components/admin/AdminSeoPanel.tsx:412,554` | Chip tối `bg-surface-inverse/70` + `backdrop-blur-sm` trong preview OG; hợp lệ nếu coi là HUD, nhưng là chip tối trên nền sáng | §1.1/§3.8 | tuỳ chốt: giữ (HUD) hoặc đổi `bg-surface/90` |

## Điểm tốt (giữ nguyên)

- **Wave 0 primitives đúng hợp đồng phần lõi**: `Button` (5 variant, `h-10`/`max-md:min-h-11`, `active:scale-[0.97]`, `ring-offset-2`, `iconOnly` bắt buộc `aria-label` ở tầng type), `Badge` (tint + chữ đặc + `/20` + dot), `DataTable` (header `h-10`, row `h-11`, `numeric` → `font-mono tabular-nums`, **empty render NGOÀI `<table>`**), `EmptyState` (`size-12 rounded-lg bg-surface-muted`, title/body đúng §3.9), `SideNav` active `bg-primary-tint` + **thanh dọc 2px** + `aria-current="page"`, `Modal` là `<dialog>` (top-layer, Esc, focus trap, scroll lock).
- **`chrome` = 0 toàn repo**, `tone`/`chrome` prop đã gỡ sạch, hex mới = 0, `text-[10px]/[11px]` = 0, `min-h-screen/h-screen` = 0, `shadow-sm|md|lg|xl` = 0 — 5/5 điều kiện "Checklist tự kiểm" §5 của hợp đồng đạt trên toàn bộ diff.
- **Số liệu**: mọi chỗ tổng tiền/tổng đơn ở transaction (Cart/Checkout/Invoice/Tracking) đều `font-mono tabular-nums` + căn phải, tổng dùng `border-t border-line-subtle pt-4`.
- **Header/F3 + C5**: header sticky `z-header`, quick search `h-10 border-line-control`, drawer dùng `<Button>` + `aria-label`, badge giỏ `tabular-nums`.
- **Nhóm 3D (§3.8)**: `ModelViewer3D` dời banner `top-32`, caliper/tooltip `bottom-32`, 1 hàng control ở `top-14`; toolbar `UnifiedCadToolbar` sáng `bg-surface/95 shadow-e2 backdrop-blur-md`; canvas **không** bị filter/backdrop.
- **C2 (groups)**: đã hạ raw control 41→25 button · 3→2 input; 100% bảng dùng `DataTable`; empty ngoài bảng; filter chip theo §3.6; `Skeleton` thay spinner.
- **Data honesty**: các màn giữ `—`/`Chưa cấu hình`/`EMPTY_VALUE`, không thêm số liệu hay ảnh mẫu; `InvoiceModal` không còn chữ ký/hash giả; `AssetLibraryView` không tạo link tải giả.
- **Logic**: `tsc --noEmit` exit 0 và rà `git diff -U0` không thấy đổi điều kiện render/handler/service/chuỗi `isVi ?` (các chuỗi `isVi ?` trong diff là dòng bị **di chuyển**, không sửa nội dung).

## Đề xuất cập nhật hợp đồng

1. **§3.7 thiếu spec "storefront header"**: chốt chiều cao (`h-20` hiện tại hay `h-14` như console), nền (`bg-canvas/90` vs `bg-surface/90`) và trạng thái active của nav ngang (gạch chân vs tint + thanh dọc) — nếu không, R1/R2 sẽ chấm lệch nhau ở mọi lần review sau.
2. **§2.1/§3.1 cần ngoại lệ "side sheet/fullscreen"**: `Modal` đang phát `rounded-none` cho `placement='right'/'left'` và `size='full'`; fullscreen 3D có 3 cách làm khác nhau (`rounded-none` + `z-[100]`, `rounded-modal`, `rounded-lg`). Chốt 1 quy ước + ghi rõ có được vượt `z-toast` hay không.
3. **§2.4 bổ sung "số liệu qua `<Money>` mặc định `font-mono`"** (hoặc yêu cầu call-site), và **§3.5** ghi rõ ngoại lệ bảng in (`InvoiceModal`) để không phải sửa primitive.
4. **§3.9 làm rõ "1 action"**: cho phép tối đa 1 nút + 1 link chữ phụ (đang bị 3 chỗ vi phạm vì nhu cầu thật: giỏ rỗng, lỗi tải, reset filter).
5. **§3.4 ghi rõ scale alpha viền badge = `/20`**; hiện 34 chỗ dùng `/30`–`/40` (callout + badge) nên nếu không chốt sẽ tái diễn.
6. **Ghi nợ Wave 4**: `.mobile-nav-*` trong `src/index.css` (z 998/999, màu ngoài palette) và `--color-info` cũ trong `AssetLibraryView`/`ThreeModelViewer`.
