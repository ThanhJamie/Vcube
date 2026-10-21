<!-- doc-meta: status=active; verified=2026-10-20; owner=ui-auditor -->
# ROUTE-MATRIX — 30 route hiệu lực · màn hình · state · ưu tiên chụp (W0)

> **Snapshot audit:** `HEAD 97cc256` + working tree lúc **2026-10-20 11:2x**.
> ⚠️ Trong lúc W0 chạy, `design-foundation` (W1) đang sửa `src/App.tsx`,
> `src/frontend/components/Header.tsx`, `src/index.css` ⇒ **số dòng có thể lệch sau snapshot**.
> Mỗi defect trong `UI-DEFECTS.md` kèm **chuỗi trích dẫn** để tìm lại khi dòng đổi.
> Nguồn route: `docs/pages/_routes.generated.md` (sinh từ `src/App.tsx`, 30 route) — đã đối chiếu tay
> với `src/App.tsx:1541-1867` (khối `<Routes>`), không thêm/bớt route nào.

---

## 0. Cách đọc

| Ký hiệu | Nghĩa |
|---|---|
| **L** | Loading (skeleton/spinner/`role="status"`) |
| **Em** | Empty (EmptyState riêng biệt với "không có kết quả lọc") |
| **Er** | Error (khối lỗi + retry, phân biệt với empty) |
| **S** | Success (nội dung thật) |
| **M/Sh** | Modal / Sheet / Drawer dùng trong màn |
| **—** | Không áp dụng (redirect) hoặc **chưa có** (ghi rõ) |
| Guard | `ProtectedRoute` = phải đăng nhập; `RoleGuard` = đăng nhập + vai trò trong DB |
| Ưu tiên chụp | **T0** redirect (1 ảnh 390) · **T1** flagship storefront · **T2** transaction/auth · **T3** console |

**Viewport chuẩn:** 390×844 (mobile) · 768×1024 (tablet) · 1440×900 (desktop).
**Mốc cố định cần kiểm:** header storefront `h-20` = **80px** (`Header.tsx:167`), topbar console **56px**
(`ui/Topbar.tsx`, `top-14` = 3.5rem ở `ui/AppShell.tsx`), FAB `fixed bottom-6 right-6` (`App.tsx:1885`).

---

## 1. Tổng hợp 30 route — 23 màn thật + 7 redirect

| # | Path | Component (wrapper → view) | Guard | Loại | Nguồn dữ liệu (hiện tại) | L | Em | Er | S | M/Sh | Viewports cần chụp | Ưu tiên |
|---|---|---|---|---|---|---:|---:|---:|---:|---|---|---|
| 1 | `/` | `HomeView` | — | **Màn thật** (eager) | `products` từ DB + `site_content`; fallback localStorage; `CATEGORIES/POPULAR_TAGS` tĩnh | ✓ (`852`) | ✓ (`913`) | ✓ (`839`, `868`) | ✓ | 3D hero switcher, `CadQuickViewModal`, `CustomIdeaRequestModal`, `ServiceShowcaseSection` modal | 390/768/1440 | **T1** |
| 2 | `/explore` | `ExploreRoute` → `ExploreView` | — | **Màn thật** (eager) | `products` + `materials` + `pricingConfig` từ DB | ✓ skeleton lưới (`889`) | ✓ (`946`) | ✓ + retry (`showError`, `onRetry`) + banner dữ liệu cũ (`897`) | ✓ (grid + **table view**) | `Sheet` lọc mobile (`1345`), `CadQuickViewModal`, bookmark | 390/768/1440 | **T1** |
| 3 | `/products/:productId` | `ProductDetailRoute` → `ProductDetailView` | — | **Màn thật** (eager) | `products`, `materials`, `pricingConfig` | ✓ spinner (`App.tsx:174`) | — | ✓ (`App.tsx:184`) | ✓ | 3D viewer, tab specs, quick view, **mobile sticky order bar** (`1007`) | 390/768/1440 | **T1** |
| 4 | `/personalize` | `PersonalizeRoute` → `PersonalizeView` | — | **Màn thật** (eager) | `products[0]` khi catalog có dữ liệu; `materials` từ DB | ✓ 3D loading | ✓ NotFoundView nếu catalog rỗng | — | ✓ | `PersonalizeModelViewer3D` (fullscreen), **mobile sticky bar** (`1055`) | 390/768/1440 | **T1** |
| 5 | `/personalize/:productId` | `PersonalizeRoute` | — | **Màn thật** (eager) | `products.find(id)` | ✓ | ✓ `NotFoundView` khi id sai (`App.tsx:256`) | — | ✓ | như #4 | 390/768/1440 | **T1** |
| 6 | `/quote` | `Tool3DView` (**lazy**) | — | **Màn thật** | `SAMPLE_ANALYSIS_FILES = []`; parser file người dùng; printers/materials DB | ✓ `PageSkeleton` (Suspense) | ✓ chưa có tệp (`1113`) | ✓ parse-failure panel; thiếu máy/vật liệu (`1145`) | ✓ | ~30 state, `StlUnitConfirmModal`, `StlVs3mfComparisonModal`, `MachineComparisonModal`, `InternalCostBreakdownModal` (admin) | 390/768/1440 | **T1** |
| 7 | `/tool-3d` | `Navigate` | — | **Redirect** | — | — | — | — | — | → `/quote` (replace) | 390 (1 ảnh) | T0 |
| 8 | `/cart` | `CartView` | — | **Màn thật** (eager) | `useCartStore` + `usePricingGlobalSettings` + `computeShippingFee` | — | ✓ (`104`) | — | ✓ | `CartDrawer` (mở từ header), promo | 390/768/1440 | **T1** |
| 9 | `/checkout` | `CheckoutView` | — | **Màn thật** (eager) | `OrderService`, `settingsService`, cart | ✓ `isProcessing` (`790`) | ✓ cart rỗng → CTA về giỏ (`247`) | ✓ `orderError` (`766`) | ✓ | form PII, VAT invoice, COD/VietQR/VNPAY | 390/768/1440 | **T1** |
| 10 | `/order-success` | `OrderSuccessRoute` → `OrderSuccessView` | — | **Màn thật** (eager) | `orders` (từ App state/DB) | — | ✓ `OrderNotFoundView` (`App.tsx:282`) | — | ✓ | copy token, hướng dẫn | 390/768 | **T2** |
| 11 | `/order-success/:orderId` | `OrderSuccessRoute` | — | **Màn thật** (eager) | resolve nghiêm ngặt theo id (`App.tsx:264`) | — | ✓ not-found | — | ✓ | — | 390/768 | **T2** |
| 12 | `/tracking` | `OrderTrackingRoute` → `OrderTrackingView` | — | **Màn thật** (eager) | `dbService.getOrderByToken` (guest), không đọc fixture (`73-78`) | ✓ (`221`) | ✓ form tra cứu | ✓ not-found + lỗi tra cứu | ✓ | pipeline 8 stage (`OrderProgress`), bảng item | 390/768/1440 | **T2** |
| 13 | `/tracking/:orderId` | `OrderTrackingRoute` | — | **Màn thật** (eager) | như #12 | ✓ | ✓ not-found | ✓ | ✓ | — | 390/768 | **T2** |
| 14 | `/orders` | `MyOrdersView` | **ProtectedRoute** | **Màn thật** (eager) | `orders` (DB/user) | **✗ trắng** (xem UI-001) | ✓ (`194`) | — | ✓ | `Modal` bảo hành, `InvoiceModal`, filter/search | 390/768/1440 | **T2** |
| 15 | `/my-orders` | `Navigate` | — | **Redirect** | — | — | — | — | — | → `/orders` | 390 | T0 |
| 16 | `/assets` | `AssetLibraryView` | **ProtectedRoute** | **Màn thật** (eager) | `AssetService` (signed URL TTL 60s) | ✓ (tạo link) | ✓ (`134`) | — (báo thẳng chưa nối `order_files`) | ✓ | `Modal` preview | 390/768/1440 | **T2** |
| 17 | `/library` | `Navigate` | — | **Redirect** | — | — | — | — | — | → `/assets` | 390 | T0 |
| 18 | `/designer` | `DesignerDashboardShell` > `DesignerDashboardView` (**lazy**) | **RoleGuard** designer/admin | **Màn thật** | store tabs + DB services | ✓ RoleGuard loading (`RoleGuard.tsx:44`) + Suspense panel | ✓ per-tab | ✓ `PanelErrorBoundary` per tab | ✓ | chat/quote modal, upload wizard | 390/768/1440 | **T3** |
| 19 | `/designer/:tab` | như #18 | RoleGuard | **Màn thật** | theo tab (5 tab) | ✓ | ✓ | ✓ | ✓ | như #18 | 390/768/1440 | **T3** |
| 20 | `/creator` | `Navigate` | — | **Redirect** | — | — | — | — | — | → `/designer` | 390 | T0 |
| 21 | `/creator/*` | `Navigate` | — | **Redirect** | — | — | — | — | — | → `/designer` | 390 | T0 |
| 22 | `/admin` | `AdminDashboardView` (**lazy**) | **RoleGuard** admin | **Màn thật** | 11 panel lazy + `buildAdminNavGroups` | ✓ `AdminPanelLoadingSkeleton` (`319`) + RoleGuard | ✓ per-panel | ✓ `PanelErrorBoundary` | ✓ | `DataTable`, `ConfirmDialog`, mobile nav | 390/768/1440 | **T3** |
| 23 | `/admin/:section` | `AdminDashboardView` | RoleGuard | **Màn thật** | section từ URL (nguồn sự thật duy nhất) | ✓ | ✓ | ✓ | ✓ | như #22 | 390/768/1440 | **T3** |
| 24 | `/lab` | `LabRoute` (onboarding \| settings) (**lazy**) | **RoleGuard** lab/workshop/admin | **Màn thật** | `WorkshopService.getWorkshopProfileByUserId` | ✓ `PageSkeleton` (`591`) | ✓ onboarding wizard | ✓ (catch → onboarding) | ✓ | 4 modal editor, kanban | 390/768/1440 | **T3** |
| 25 | `/lab/:tab` | `LabRoute` | RoleGuard | **Màn thật** | theo 6 tab | ✓ | ✓ `EmptyState` (`as-is` §2) | ✓ | ✓ | như #24 | 390/768/1440 | **T3** |
| 26 | `/auth/login` | `LoginView` | — | **Màn thật** (eager) | `useAuth` | ✓ (`184`) | — | ✓ (`90`) | ✓ | `AuthModal` không dùng (trang riêng) | 390/768 | **T2** |
| 27 | `/login` | `Navigate` | — | **Redirect** | — | — | — | — | — | → `/auth/login` | 390 | T0 |
| 28 | `/auth/register` | `RegisterView` | — | **Màn thật** (eager) | `useAuth` | ✓ (`396`) | — | ✓ (`176`) | ✓ + `awaitingEmailConfirm` (`403`) | — | 390/768 | **T2** |
| 29 | `/register` | `Navigate` | — | **Redirect** | — | — | — | — | — | → `/auth/register` | 390 | T0 |
| 30 | `*` | `NotFoundView` | — | **Màn thật** (404) | — | — | — | — | ✓ | — | 390/1440 | **T2** |

**Đếm:** 30 route = **23 màn thật** (22 view/wrapper + 404) + **7 redirect**.
**Lazy (5 module):** `Tool3DView`, `AdminDashboardView`, `DesignerDashboardView`, `WorkshopSettingsView`, `WorkshopOnboardingWizard`
(`App.tsx:82-88`). Toàn bộ storefront + transaction **eager** ⇒ `three` nằm trong bundle đầu (qua `ThreeModelViewer`).

---

## 2. Bản đồ redirect (7 route) — chỉ cần 1 ảnh 390 để xác nhận

| Route cũ | → đích | Kiểu | Ghi chú QA |
|---|---|---|---|
| `/tool-3d` | `/quote` | `replace` | Không được để lại history entry |
| `/my-orders` | `/orders` | `replace` | Nếu chưa đăng nhập → `/auth/login` (ProtectedRoute) |
| `/library` | `/assets` | `replace` | như trên |
| `/creator` | `/designer` | `replace` | Nếu role khách → RoleGuard chặn (không phải redirect im lặng) |
| `/creator/*` | `/designer` | `replace` | Bắt mọi path con |
| `/login` | `/auth/login` | `replace` | — |
| `/register` | `/auth/register` | `replace` | — |

---

## 3. Ma trận guard (nguồn: `src/App.tsx` + `components/RoleGuard.tsx`)

| Guard | Route áp dụng | Hành vi khi chưa đủ điều kiện | Bằng chứng |
|---|---|---|---|
| `ProtectedRoute` | `/orders`, `/assets` | `loading` → **`return null`** (màn trắng); chưa login → `/auth/login` | `App.tsx:93-101` |
| `RoleGuard(admin)` | `/admin`, `/admin/:section` | loading → khối "Đang xác thực phiên đăng nhập…"; chưa login → login + `?redirectTo=`; sai role → màn từ chối | `RoleGuard.tsx:39-74` |
| `RoleGuard(designer, admin)` | `/designer`, `/designer/:tab` | như trên | `RoleGuard.tsx` |
| `RoleGuard(lab, workshop, admin)` | `/lab`, `/lab/:tab` | như trên | `RoleGuard.tsx` |

**Bất đối xứng cần sửa (UI-001):** `ProtectedRoute` trả `null` trong khi `RoleGuard` có loading UI → 2 guard
cùng chức năng nhưng trải nghiệm khác nhau.

---

## 4. State bắt buộc phải chụp cho trang có dữ liệu (exit criteria PLAN §6.2)

| Nhóm màn | Loading | Empty | Error | Success | Ghi chú |
|---|---|---|---|---|---|
| Catalog (`/`, `/explore`) | skeleton khớp lưới (`ExploreView.tsx:110`, `HomeView.tsx:852`) | "chưa có bản vẽ" (phân biệt với filter-miss) | lỗi + `Thử lại` (`App.tsx:184`, `ExploreView` showError) | lưới + bảng kỹ thuật | Supabase paused ⇒ chụp **empty/fallback** là chính |
| PDP (`/products/:id`) | spinner (`App.tsx:174`) | not-found (`App.tsx:209`) | lỗi tải (`App.tsx:184`) | đủ tab | — |
| `/quote` | Suspense `PageSkeleton` | "chưa có tệp" (`Tool3DView.tsx:1113`) | parse-failure + thiếu máy/vật liệu (`1145`) | báo giá đủ số | Không được hiện giá khi dữ liệu chưa đo |
| Cart/Checkout | `isProcessing` (`CheckoutView:790`) | cart rỗng (`CartView.tsx:104`, `CheckoutView.tsx:247`) | `orderError` (`766`) | → `/order-success` | — |
| Tracking/Orders | `role="status"` (`OrderTrackingView.tsx:221`) | not-found + form tra cứu | lỗi tra cứu | pipeline 8 stage | `/orders` **thiếu** loading (UI-001) |
| Consoles | RoleGuard + Suspense skeleton | per-panel `EmptyState` | `PanelErrorBoundary` | bảng/KPI | Không áp dụng luật landing-page (density 7) |
| Auth | nút loading (`LoginView:184`, `RegisterView:396`) | — | `errorMessage` (`LoginView:90`) | redirect sau đăng nhập / `awaitingEmailConfirm` | `alert()` còn ở `LoginView.tsx:163` (UI-013) |

---

## 5. Kế hoạch chụp (90 ảnh lõi + 22 ảnh console/tab)

| Tier | Route | Số ảnh | Lý do |
|---|---|---:|---|
| **T0** redirect | 7 route redirect | 7 × 1 (390) | Chỉ xác nhận đích + không vòng lặp |
| **T1** flagship | `/`, `/explore`, `/products/:id`, `/personalize`, `/quote`, `/cart`, `/checkout` | 7 × 3 = 21 | Nơi chứng minh design language v3; defect P0/P1 tập trung |
| **T2** transaction/auth | `/orders`, `/assets`, `/tracking`, `/order-success`, `/auth/login`, `/auth/register`, `*` | 7 × 3 = 21 (một số 2 viewport) | Form/label/contrast, state |
| **T3** console | `/admin` + `:section` (11), `/designer` + 5 tab, `/lab` + 6 tab | ~23 × 3 = 69 | Surface-only, density không đổi |

**Tổng tối thiểu:** 30 route × 3 viewport = **90 ảnh** (redirect 1 viewport) + state shots
(loading/empty/error) cho 8 nhóm màn có dữ liệu.

**Thứ tự chụp đề xuất:** PDP → Explore → Home → Quote → Cart/Checkout → Auth/Orders → Admin/Designer/Lab.
Lý do: PDP + Explore thể hiện rõ nhất ngôn ngữ mới; nếu fail contrast/3D thì dừng sớm (PLAN §11.3).

---

## 6. Ghi chú môi trường

1. **Supabase đang paused** (`docs/tasks/ui-redesign-v3/PLAN.md:209`): QA dùng empty/fallback state, **không** chặn audit UI.
   Mọi màn hình phải chụp được khi catalog rỗng — đây là điều kiện chụp chính của W0.
2. **Storefront eager** ⇒ lần tải đầu kéo `three`; không phải defect W0 nhưng ảnh hưởng LCP — ghi nhận
   (không sửa trong wave UI).
3. 4 route console dùng `AppShell` (`max-w-[1400px]`, SideNav 240) — **không** áp `max-w-7xl` storefront.
4. `/personalize` **không** kèm id sẽ lấy `products[0]` khi catalog có dữ liệu thật (`App.tsx:243`) —
   với Supabase paused, catalog rỗng ⇒ `NotFoundView`; QA phải chụp cả 2 trạng thái.
