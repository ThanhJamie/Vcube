<!-- AUTO-GENERATED — đừng sửa tay · routes: 30 · source: src/frontend/routes/AppRoutes.tsx · source-sha256: f0bd92f499c9 -->

# Bảng route (sinh tự động)

> Sinh bởi `scripts/gen-routes-doc.mjs` từ `src/frontend/routes/AppRoutes.tsx` — **đừng sửa tay**.
> Sửa route trong `src/frontend/routes/AppRoutes.tsx` rồi chạy lại: `node scripts/gen-routes-doc.mjs`.
> routes: **30** · source: `src/frontend/routes/AppRoutes.tsx` · source-sha256: `f0bd92f499c9` (output ổn định, không kèm ngày).

| Path | Component/Element | Guard | Redirect? |
|---|---|---|---|
| `/` | HomeView | — | — |
| `/explore` | ExploreRoute | — | — |
| `/products/:productId` | ProductDetailRoute | — | — |
| `/personalize` | PersonalizeRoute | — | — |
| `/personalize/:productId` | PersonalizeRoute | — | — |
| `/quote` | Tool3DView | — | — |
| `/tool-3d` | Navigate | — | → /quote (replace) |
| `/cart` | CartView | — | — |
| `/checkout` | CheckoutView | — | — |
| `/order-success` | OrderSuccessRoute | — | — |
| `/order-success/:orderId` | OrderSuccessRoute | — | — |
| `/tracking` | OrderTrackingRoute | — | — |
| `/tracking/:orderId` | OrderTrackingRoute | — | — |
| `/orders` | MyOrdersView | ProtectedRoute (yêu cầu đăng nhập) | — |
| `/my-orders` | Navigate | — | → /orders (replace) |
| `/assets` | AssetLibraryView | ProtectedRoute (yêu cầu đăng nhập) | — |
| `/library` | Navigate | — | → /assets (replace) |
| `/designer` | DesignerDashboardShell > DesignerDashboardView | RoleGuard: designer, admin | — |
| `/designer/:tab` | DesignerDashboardShell > DesignerDashboardView | RoleGuard: designer, admin | — |
| `/creator` | Navigate | — | → /designer (replace) |
| `/creator/*` | Navigate | — | → /designer (replace) |
| `/admin` | AdminDashboardView | RoleGuard: admin | — |
| `/admin/:section` | AdminDashboardView | RoleGuard: admin | — |
| `/lab` | LabRoute | RoleGuard: lab, workshop, admin | — |
| `/lab/:tab` | LabRoute | RoleGuard: lab, workshop, admin | — |
| `/auth/login` | LoginView | — | — |
| `/login` | Navigate | — | → /auth/login (replace) |
| `/auth/register` | RegisterView | — | — |
| `/register` | Navigate | — | → /auth/register (replace) |
| `*` | NotFoundView | — | — |
