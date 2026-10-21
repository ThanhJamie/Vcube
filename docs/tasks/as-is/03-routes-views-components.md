<!-- doc-meta: status=active; verified=2026-10-19; owner=thanh -->
# AS-IS 03 — Routes · Views · Components · UI primitives

## 1. Route (30 route hiệu lực, sinh từ `src/App.tsx`)

| Path | Component | Guard | Ghi chú |
|---|---|---|---|
| `/` | `HomeView` | — | eager |
| `/explore` | `ExploreRoute` → `ExploreView` | — | eager |
| `/products/:productId` | `ProductDetailRoute` → `ProductDetailView` | — | eager |
| `/personalize`, `/personalize/:productId` | `PersonalizeRoute` → `PersonalizeView` | — | eager |
| `/quote` | `Tool3DView` | — | **lazy** |
| `/tool-3d` | `Navigate` | — | → `/quote` |
| `/cart` | `CartView` | — | eager |
| `/checkout` | `CheckoutView` | — | eager |
| `/order-success`, `/order-success/:orderId` | `OrderSuccessRoute` | — | eager |
| `/tracking`, `/tracking/:orderId` | `OrderTrackingRoute` | — | eager |
| `/orders` | `MyOrdersView` | `ProtectedRoute` | eager |
| `/my-orders` | `Navigate` | — | → `/orders` |
| `/assets` | `AssetLibraryView` | `ProtectedRoute` | eager |
| `/library` | `Navigate` | — | → `/assets` |
| `/designer`, `/designer/:tab` | `DesignerDashboardShell` > `DesignerDashboardView` | RoleGuard: designer, admin | **lazy** |
| `/creator`, `/creator/*` | `Navigate` | — | → `/designer` |
| `/admin`, `/admin/:section` | `AdminDashboardView` | RoleGuard: admin | **lazy** |
| `/lab`, `/lab/:tab` | `LabRoute` (onboarding | settings) | RoleGuard: lab, workshop, admin | **lazy** |
| `/auth/login` | `LoginView` | — | eager |
| `/login` | `Navigate` | — | → `/auth/login` |
| `/auth/register` | `RegisterView` | — | eager |
| `/register` | `Navigate` | — | → `/auth/register` |
| `*` | `NotFoundView` | — | — |

**Lazy chỉ 5 module**: `Tool3DView`, `AdminDashboardView`, `DesignerDashboardView`, `WorkshopSettingsView`, `WorkshopOnboardingWizard`. Toàn bộ storefront + transaction (12 view) **eager** → `three` lọt vào bundle đầu (qua `ThreeModelViewer`).
Một `<React.Suspense fallback={<PageSkeleton/>}>` + một `<RouteErrorBoundary resetKey=pathname>`.

---

## 2. Views (16 · 13.790 LOC)

| View | LOC | Nhiệm vụ | State/tab/modal tự giữ | Service/store | Data-honesty |
|---|---|---|---|---|---|
| `HomeView` | 1404 | Landing: hero 3D, showcase dịch vụ, lưới catalog + bảng kỹ thuật | heroModel, filter, catalogViewMode/Limit, quick-view + custom-idea | props; `mockData` CATEGORIES/TAGS | `vnd()`→`—` nếu ≤0; rating cần >0 & count>0; hotline giả bị loại |
| `ExploreView` | 1360 | Duyệt catalog: filter, grid/bảng, quick view, bookmark | 9 state filter, 2 view mode, Sheet mobile, quick-view | `useCartStore`, `useAuth` | license chưa khai ⇒ `—`; loading/error → skeleton/retry |
| `ProductDetailView` | 1020 | PDP: viewer, material/color, tab specs, add-to-cart | viewMode, selectedMaterial/Color, tab, quantity, engraving | props; `ThreeModelViewer` | `LICENSE_UNSET`; cfg null ⇒ `—` |
| `CartView` | 531 | Giỏ: line items, promo, ship, VAT, tổng | promoCode/Message; discount ở store | `useCartStore`, `usePricingGlobalSettings`, `computeShippingFee` từ `database.ts`, `lib/vat` | VAT không hardcode 8%; label "chưa cấu hình" |
| `CheckoutView` | 832 | Form thanh toán, ship, VAT invoice, tạo đơn | PII, paymentMethod, VAT fields, isProcessing, orderError | `OrderService`, `settingsService`, `useCartStore`, `computeShippingFee` | bank/legal ẩn khi trống (không in `—`); CTA cấu hình chỉ admin |
| `OrderSuccessView` | 276 | Xác nhận đơn + copy token | copiedToken | — | date chỉ reformat ISO, không bịa |
| `OrderTrackingView` | 578 | Tra đơn guest (mã + token), pipeline 8 stage | currentOrder, guest search mode, lookup state | `dbService.getOrderByToken`, `OrderProgress` | stage unknown ⇒ `—` |
| `MyOrdersView` | 490 | DS đơn + filter, modal bảo hành, invoice, reorder | activeFilter, searchQuery, warrantyModal, reorderSuccessId | props, `OrderProgress` | `isFabricatedImage` guard |
| `PersonalizeView` | 1079 | Cá nhân hoá: material/color/khắc/logo/lid + 3D + giá | material/color, engraving text/font/size/depth, logo, quantity, package tier | props; `PersonalizeModelViewer3D` | material từ DB (no mock); rating/license honest |
| `AssetLibraryView` | 306 | Tải CAD đã mua (signed URL) | searchQuery, selectedFormat, previewAsset, downloadingId | `AssetService` (TTL 60s) | **không tạo link giả**; báo thẳng `order_files` chưa nối |
| `LoginView` | 252 | Đăng nhập + Google (gated) + remember | email/pass, showPassword, rememberMe, error, loaders | `useAuth` | cờ Google/reset = false; còn `alert()` ở L123 |
| `RegisterView` | 457 | Đăng ký (customer/designer), chờ xác nhận email | form + signupRole + awaitingEmailConfirm | `useAuth` | cờ Google gated |
| `DesignerDashboardView` | 144 | Shell studio, route 5 tab theo URL | activeTab từ `useParams`, selectedReqId | — | tên fallback email → `—`; mỗi tab có `PanelErrorBoundary` |
| `AdminDashboardView` | 630 | Shell ForgeControl, lazy 11 panel theo `/admin/:section` | isNavCollapsed, isMobileNavOpen, navSearch | `buildAdminNavGroups` | badge chỉ khi >0 |
| `Tool3DView` | 1938 | `/quote`: upload/parse STL/3MF, viewer, object tree, transform, validation, báo giá | ~30 state, 2 modal (3mf-vs-stl, stl-unit), parseFailure | `utils/meshParser`; `mockData` (SAMPLE_ANALYSIS_FILES rỗng) | `derivePrintabilityScore` trả `null` nếu mọi số đo null |
| `WorkshopSettingsView` | 2493 | `/lab`: 6 tab (queue/machines/materials/accessories/audit_trail/preferences) + CRUD modal | 6 miền dữ liệu + 4 modal editor + kanban + layerDraft | `workshopService` (`getMy*`/`saveMy*`, `updateMyOrderProgress`) | scope `auth.uid()`→`partner_id`; rỗng ⇒ EmptyState |

---

## 3. Component theo miền

### 3a. Admin panel
| File | LOC | Nhiệm vụ |
|---|---|---|
| `admin/PricingConfigPanel` | **3079** | 6 sub-tab: formula, global params, materials CRUD, printers CRUD, accessories, inventory, estimator (nhúng 3 panel) |
| `admin/AdminProductsPanel` | 736 | CRUD sản phẩm + modal + confirm (dead import `dbService`) |
| `admin/AdminStorefrontPanel` | 987 | CMS 6 tab (hero/announcement/workflow/estimator/facilities/custom-idea) |
| `admin/AdminSeoPanel` | 606 | CMS SEO 4 tab (meta/serp/social/schema) |
| `admin/AdminSettingsPanel` | 409 | Form pháp lý `app_settings` (9 cột) |
| `admin/AccessoriesManager` | 786 | CRUD phụ kiện + modal + confirm |
| `admin/WarehouseInventoryPanel` | 602 | Tồn kho material/accessory + KPI low-stock |
| `admin/WorkshopEstimatorBOM` | 769 | Estimator BOM thủ công (material/printer/accessory/markup/discount) |
| `admin/AdminSidebar` | 183 | Không phải component — export `buildAdminNavGroups()` |

### 3b. Admin group panel
| File | LOC | Tab |
|---|---|---|
| `groups/Group0OverviewPanel` | 668 | KPI + chart + đơn gần đây (timeframe) |
| `groups/Group1WorkshopsPanel` | 2079 | workshops / fleet / materials / partners |
| `groups/Group2DesignersPanel` | 790 | designers / withdrawals / analytics |
| `groups/Group3CustomersPanel` | 1224 | customers / nda / rfq / kyc |
| `groups/Group4PricingEnginePanel` | 62 | passthrough → `PricingConfigPanel` |
| `groups/Group5ProductionPanel` | 1247 | kanban 8 stage / dispatcher / fleet |

### 3c. tool3d
| File | LOC | Nhiệm vụ |
|---|---|---|
| `tool3d/ModelViewer3D` | **2072** | Engine Three.js: orbit/grid/bbox/đo/khuyết tật/plate/WebGL recovery |
| `tool3d/QuoteSummaryPanel` | 796 | Panel báo giá + delivery packages + 2 modal |
| `tool3d/InternalCostBreakdownModal` | 382 | Breakdown giá vốn + override (admin) |
| `tool3d/MachineComparisonModal` | 215 | So sánh máy; cột giá vốn **admin-only** |
| `tool3d/ObjectTreePanel` | 362 | Cây part: hiện/ẩn, màu, extruder, material, plate |
| `tool3d/ValidationReportPanel` | 376 | Báo cáo mesh 3 mức |
| `tool3d/TransformControlsPanel` | 285 | Scale/rotate/move |
| `tool3d/PresetPalettePanel` | 389 | Palette filament + batch apply |
| `tool3d/UnifiedCadToolbar` | 133 | Toolbar 3D dùng chung |
| `tool3d/StlUnitConfirmModal` | 106 | Hỏi mm/inch cho STL |
| `tool3d/StlVs3mfComparisonModal` | 142 | So sánh STL vs 3MF (tĩnh) |

### 3d. designer
| File | LOC | Nhiệm vụ |
|---|---|---|
| `designer/DesignerModelsManagerTab` | 609 | Quản lý ấn phẩm (sửa/preview/xoá) |
| `designer/DesignerUploadWizardTab` | 509 | Wizard 4 bước |
| `designer/DesignerRequestsTab` | 448 | Board yêu cầu: nhận, chat, quote |
| `designer/DesignerOverviewTab` | 197 | Tổng quan + inquiry gần đây |
| `designer/DesignerPayoutsTab` | 127 | ⚠️ **render `PAYOUT_TRANSACTIONS` mock** từ `mockData`; nút rút disabled |

### 3e. personalize / onboarding / auth / material / services
| File | LOC | Nhiệm vụ |
|---|---|---|
| `personalize/PersonalizeModelViewer3D` | 764 | Preview khắc/lid-explode |
| `onboarding/WorkshopOnboardingWizard` | 1407 | Wizard 4 bước (info → machines → materials → review) |
| `auth/UserAvatarMenu` | 411 | Dropdown tài khoản theo role |
| `material/MaterialTechnicalAdvisory` | 368 | Thẻ khuyến nghị vật liệu hiệu năng cao (null với PLA/PETG/ABS) |
| `services/ServiceShowcaseSection` | 621 | Showcase 4 dịch vụ + modal |

### 3f. Component dùng chung (root)
| File | LOC | Nhiệm vụ | Ghi chú |
|---|---|---|---|
| `Header` | 433 | Nav storefront + **drawer mobile tự chế** (không `Sheet`) | `useBodyScrollLock` |
| `AuthModal` | 894 | Dialog auth 4 mode + confirm logout | 0 primitive `<Button>` |
| `CadQuickViewModal` | 522 | Quick view sản phẩm | |
| `CartDrawer` | 336 | Drawer giỏ (dùng `Modal`, không `Sheet`) | |
| `ChatSupportModal` | 124 | Chat hỗ trợ "trợ lý tự động, không phải kỹ sư trực" | |
| `custom/CustomIdeaRequestModal` | 442 | Form yêu cầu CAD | tự điền profile mình |
| `InvoiceModal` | 301 | Hoá đơn in được | legal từ `app_settings` |
| `OrderProgress` | 150 | Pipeline 8 stage — **export `MES_PIPELINE_STAGES` (nguồn sự thật)** | |
| `RoleGuard` | 121 | Gate role (nhận cả `workshop`/`lab`) | giữ `?redirectTo=` |
| `RouteErrorBoundary` | 122 | Boundary cấp route | |
| `PanelErrorBoundary` | — | (trong `ui/`) | |
| `CanvasErrorBoundary` | 96 | Boundary cho canvas 3D | |
| `ThreeModelViewer` | 463 | Viewer 3D nhẹ (gear/box/drone/arch) | **kéo `three` vào eager graph** |
| `PageSkeleton` | 118 | Skeleton toàn trang | |
| `SEOHead` | 85 | `<title>`/meta/JSON-LD | |
| `ScrollToTop` | 22 | Reset scroll theo route | tôn trọng reduced-motion |
| `NotFoundView` | 52 | 404 | |
| `HorizontalScrollFilter` | 104 | Chip rail cuộn ngang | |

---

## 4. UI primitive (`src/frontend/ui/`, 29 module)

| Module | LOC | Mục đích | File import | JSX |
|---|---|---|---|---|
| `Icon` (+`iconMap` 516) | 64 | Điểm render icon duy nhất (Material Symbols name → lucide) | 65 | 712 |
| `Button` | 186 | 5 variant, size, loading, iconOnly (aria-label ép kiểu) | 25 | 214 |
| `Modal` | 383 | `<dialog>` + `showModal()` (nền cho ConfirmDialog/Sheet) | 22 | 35 |
| `EmptyState` | 83 | Empty với lý do + 1 CTA | 21 | 51 |
| `InfoTip` | 156 | Popover giải thích | 17 | 38 |
| `DataTable` | 851 | Bảng admin: density, sticky header, sort/filter/pagination/selection | 9 | 35 |
| `Card` (+Header/Title/Description/Content/Footer) | 132 | Surface + phần section | 8 | 45 |
| `Badge` | 74 | Nhãn trạng thái 6 variant | 6 | 16 |
| `ConfirmDialog` | 95 | Confirm trên Modal, tone danger | 5 | 6 |
| `Money` | 90 | Tiền qua `formatCurrency` | 4 | 29 |
| `Field` | 178 | Bọc `<label for>` + render-prop | 3 | 45 |
| `Input` | 96 | Input theo token | 3 | 32 |
| `PanelErrorBoundary` | 90 | Boundary cấp panel | 3 | 17 |
| `Select` | 118 | `<select>` native styled | 2 | 12 |
| `AppShell` | 203 | Shell dashboard (SideNav+Topbar+Sheet+skip link) | 2 | 2 |
| `SideNav` | 258 | Nav dọc 240/64px | 2 | 3 |
| `Topbar` | 72 | Topbar 56px | 2 | 2 |
| `StatCard` | 129 | Card KPI | 2 | 20 |
| `PageHeader` | 216 | Header chuẩn (breadcrumb→title→tabs) | 2 | 2 |
| `Sheet` | 92 | Sheet bottom/side | 1 | 2 |
| `Skeleton` | 89 | Skeleton khớp layout | 1 | 13 |
| `KeyValue` | 110 | `<dl>` label/value | 1 | 1 |
| `ProgressBar` | 144 | %/bytes/ETA | 1 | 1 |
| `cn` | 35 | Ghép className | 1 | — |
| `ToastViewport` | 297 | Toast region — ⚠️ **DEAD (App tự render toast)** | 0 | 1 |
| `Section` | 117 | ⚠️ **DEAD export** | 0 | 0 |
| `Toolbar` | 87 | ⚠️ **DEAD export** | 0 | 0 |
| `tone.ts` | 10 | Type `Tone = 'light'\|'chrome'` | — | — |

**Chưa dùng/ít dùng**: `CardFooter` (0), `CardDescription` (import nhưng không render), `Sheet` (2), `ToastViewport` (0).

### Tương phản primitive vs raw markup (toàn `src`)
| Raw | SL | Primitive | SL |
|---|---|---|---|
| `<button` | **429** | `<Button` | 214 |
| `<input`+`<select` | **341** | `<Field`+`<Input`+`<Select` | 89 |
| `<table` | 11 | `<DataTable` | ~7 |

Chỉ **1** `<dialog>` raw duy nhất — trong `ui/Modal.tsx`. Không nơi nào khác dùng raw dialog.
`window.confirm`/`alert` còn: `LoginView.tsx:123` (`alert`).

---

## 5. Theme token (`src/frontend/theme/tokens.ts`, 76 LOC)

- `COLOR_TOKEN_PREFIX='--color-'`; `LIGHT_COLOR_TOKENS` = bảng màu light hardcode **phải khớp `@theme` trong `src/index.css`**.
- `readColorToken(name, {root?})`: đọc CSS var, fallback về bảng light khi không có DOM.
- **Light-only**: không có `ThemeProvider`/dark. `LIGHT_COLOR_TOKENS` **thiếu `chrome-*`** (console dùng `--color-chrome*` khai riêng trong `index.css`).
- Consumer: `ServiceShowcaseSection`, viewer 3D.
