/**
 * AppRoutes — route table cấp app tách NGUYÊN VĂN khỏi `src/App.tsx` (Phase 4d).
 *
 * Nhận MỘT props object chứa đúng state/handler mà JSX cần (state từ 3 domain hooks,
 * route wrapper props, cart/modal handlers, navigate/toast). Không context mới, không
 * đọc store trực tiếp — `MainApp` vẫn là nơi sở hữu state.
 */

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import type {
  CartItem,
  Order,
  Product,
  MaterialProfile,
  PrinterProfile,
  AccessoryItem,
  DigitalAsset,
  SiteContentConfig,
  InkiriCostFormulaConfig,
} from '@/types';
import type { CatalogData } from '@frontend/hooks/useCatalogData';
import type { SiteSettings } from '@frontend/hooks/useSiteSettings';
import type { OrdersData } from '@frontend/hooks/useOrdersData';
import type { AppNavigate } from '@frontend/hooks/useAppNavigation';
import { NotFoundView } from '@frontend/components/NotFoundView';
import { RoleGuard } from '@frontend/components/RoleGuard';
import { HomeView } from '@frontend/views/HomeView';
import { DesignerDashboardShell, LabRoute } from '@frontend/components/shell';
import {
  ProtectedRoute,
  ExploreRoute,
  ProductDetailRoute,
  PersonalizeRoute,
  OrderSuccessRoute,
  OrderTrackingRoute,
} from './routeWrappers';

// Heavy modules code-split via React.lazy() for fast initial page load
// Phase 5a — tách 9 view KHÔNG thuộc critical path khỏi graph khởi động. Các view này là named
// export nên phải map `.then(m => ({ default: m.X }))`. Route table tách ở Phase 4d nhưng
// KHÔNG đổi cách code-split (cùng lazy declaration, cùng dynamic import).
const CartView = React.lazy(() => import('@frontend/views/CartView').then((m) => ({ default: m.CartView })));
const CheckoutView = React.lazy(() => import('@frontend/views/CheckoutView').then((m) => ({ default: m.CheckoutView })));
const MyOrdersView = React.lazy(() => import('@frontend/views/MyOrdersView').then((m) => ({ default: m.MyOrdersView })));
const AssetLibraryView = React.lazy(() => import('@frontend/views/AssetLibraryView').then((m) => ({ default: m.AssetLibraryView })));
const LoginView = React.lazy(() => import('@frontend/views/LoginView').then((m) => ({ default: m.LoginView })));
const RegisterView = React.lazy(() => import('@frontend/views/RegisterView').then((m) => ({ default: m.RegisterView })));

const Tool3DView = React.lazy(() => import('@frontend/views/Tool3DView'));
const AdminDashboardView = React.lazy(() => import('@frontend/views/AdminDashboardView'));
const DesignerDashboardView = React.lazy(() => import('@frontend/views/DesignerDashboardView'));

export interface AppRoutesProps
  extends Pick<
      CatalogData,
      | 'products'
      | 'productsLoading'
      | 'productsError'
      | 'loadProducts'
      | 'materials'
      | 'printers'
      | 'accessories'
      | 'handleAddNewProduct'
      | 'handleUpdateProduct'
      | 'handleDeleteProduct'
      | 'handleUpdateMaterials'
      | 'handleUpdatePrinters'
      | 'handleUpdateAccessories'
    >,
    Pick<SiteSettings, 'siteContent' | 'pricingConfig' | 'effectivePricingConfig' | 'handleUpdateSiteContent' | 'handleUpdatePricingConfig'>,
    Pick<OrdersData, 'orders' | 'assets' | 'handleOrderCompleted' | 'handleUpdateOrderStatus'> {
  cart: CartItem[];
  appliedDiscount: number;
  setInvoiceOrder: (order: Order | null) => void;
  handleAddToCart: (item: CartItem) => void;
  handleUpdateQuantity: (id: string, newQty: number) => void;
  handleRemoveItem: (id: string) => void;
  handleNavigate: AppNavigate;
  showToast: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  setIsChatOpen: (open: boolean) => void;
}

// Props chỉ dùng để tsc kiểm tra contract; JSX bên dưới dùng tên trực tiếp như bản gốc.
export function AppRoutes({
  products,
  productsLoading,
  productsError,
  loadProducts,
  materials,
  printers,
  accessories,
  siteContent,
  pricingConfig,
  effectivePricingConfig,
  orders,
  assets,
  cart,
  appliedDiscount,
  setInvoiceOrder,
  handleAddToCart,
  handleUpdateQuantity,
  handleRemoveItem,
  handleAddNewProduct,
  handleUpdateProduct,
  handleDeleteProduct,
  handleOrderCompleted,
  handleUpdateOrderStatus,
  handleUpdateSiteContent,
  handleUpdateMaterials,
  handleUpdatePrinters,
  handleUpdateAccessories,
  handleUpdatePricingConfig,
  handleNavigate,
  showToast,
  setIsChatOpen,
}: AppRoutesProps) {
  // Một định nghĩa dùng cho cả `/lab` và `/lab/:tab` (đúng pattern của /admin, /designer).
  const labRouteElement = (
    <RoleGuard
      allowedRoles={['lab', 'workshop', 'admin']}
      featureName="Bảng điều khiển xưởng in (MES)"
      onNavigate={handleNavigate}
    >
      <LabRoute onNavigate={handleNavigate} onShowToast={showToast} />
    </RoleGuard>
  );

  return (
          <Routes>
          {/* Marketplace & Home */}
          <Route
            path="/"
            element={
              <HomeView
                products={products}
                productsLoading={productsLoading}
                productsError={productsError}
                onRetryProducts={loadProducts}
                materials={materials}
                pricingConfig={effectivePricingConfig as InkiriCostFormulaConfig | undefined}
                siteContent={siteContent}
                onAddToCart={handleAddToCart}
                onNavigate={handleNavigate}
                onSelectProduct={(p) => handleNavigate('product_detail', { product: p })}
                onShowToast={showToast}
              />
            }
          />
          <Route
            path="/explore"
            element={
              <ExploreRoute
                products={products}
                productsLoading={productsLoading}
                productsError={productsError}
                onRetry={loadProducts}
                materials={materials}
                pricingConfig={effectivePricingConfig as InkiriCostFormulaConfig | undefined}
                onAddToCart={handleAddToCart}
                onNavigate={handleNavigate}
                onSelectProduct={(p) => handleNavigate('product_detail', { product: p })}
                onShowToast={showToast}
              />
            }
          />

          {/* Product Details & Personalization */}
          <Route
            path="/products/:productId"
            element={
              <ProductDetailRoute
                products={products}
                productsLoading={productsLoading}
                productsError={productsError}
                onRetry={loadProducts}
                materials={materials}
                pricingConfig={effectivePricingConfig as InkiriCostFormulaConfig | undefined}
                onAddToCart={handleAddToCart}
                onNavigate={handleNavigate}
                onShowToast={showToast}
              />
            }
          />
          <Route
            path="/personalize"
            element={
              <PersonalizeRoute
                products={products}
                materials={materials}
                pricingConfig={effectivePricingConfig as InkiriCostFormulaConfig | undefined}
                onAddToCart={handleAddToCart}
                onNavigate={handleNavigate}
                onShowToast={showToast}
              />
            }
          />
          <Route
            path="/personalize/:productId"
            element={
              <PersonalizeRoute
                products={products}
                materials={materials}
                pricingConfig={effectivePricingConfig as InkiriCostFormulaConfig | undefined}
                onAddToCart={handleAddToCart}
                onNavigate={handleNavigate}
                onShowToast={showToast}
              />
            }
          />

          {/* 3D CAD & Instant Quoting */}
          <Route
            path="/quote"
            element={
              <Tool3DView
                materials={materials}
                printers={printers}
                pricingConfig={effectivePricingConfig as InkiriCostFormulaConfig | undefined}
                onAddToCart={handleAddToCart}
                onNavigate={handleNavigate}
                onShowToast={showToast}
              />
            }
          />
          <Route path="/tool-3d" element={<Navigate to="/quote" replace />} />

          {/* Cart & Checkout */}
          <Route
            path="/cart"
            element={
              <CartView
                cart={cart}
                siteContent={siteContent}
                onUpdateQuantity={handleUpdateQuantity}
                onRemoveItem={handleRemoveItem}
                onNavigate={handleNavigate}
                onShowToast={showToast}
              />
            }
          />
          <Route
            path="/checkout"
            element={
              <CheckoutView
                cart={cart}
                appliedDiscount={appliedDiscount}
                siteContent={siteContent}
                onOrderCompleted={handleOrderCompleted}
                onNavigate={handleNavigate}
              />
            }
          />

          {/* Order Tracking & Confirmation */}
          <Route
            path="/order-success"
            element={
              <OrderSuccessRoute
                orders={orders}
                onNavigate={handleNavigate}
                onOpenInvoice={(ord) => setInvoiceOrder(ord)}
              />
            }
          />
          <Route
            path="/order-success/:orderId"
            element={
              <OrderSuccessRoute
                orders={orders}
                onNavigate={handleNavigate}
                onOpenInvoice={(ord) => setInvoiceOrder(ord)}
              />
            }
          />
          <Route
            path="/tracking"
            element={
              <OrderTrackingRoute
                orders={orders}
                onNavigate={handleNavigate}
                onOpenChat={() => setIsChatOpen(true)}
                onOpenInvoice={(ord) => setInvoiceOrder(ord)}
              />
            }
          />
          <Route
            path="/tracking/:orderId"
            element={
              <OrderTrackingRoute
                orders={orders}
                onNavigate={handleNavigate}
                onOpenChat={() => setIsChatOpen(true)}
                onOpenInvoice={(ord) => setInvoiceOrder(ord)}
              />
            }
          />
          <Route
            path="/orders"
            element={
              <ProtectedRoute>
                <MyOrdersView
                  orders={orders}
                  onNavigate={handleNavigate}
                  onOpenInvoice={(ord) => setInvoiceOrder(ord)}
                />
              </ProtectedRoute>
            }
          />
          <Route path="/my-orders" element={<Navigate to="/orders" replace />} />

          {/* Digital CAD Asset Library */}
          <Route
            path="/assets"
            element={
              <ProtectedRoute>
                <AssetLibraryView
                  assets={assets}
                  onNavigate={handleNavigate}
                  onShowToast={showToast}
                />
              </ProtectedRoute>
            }
          />
          <Route path="/library" element={<Navigate to="/assets" replace />} />

          {/* Designer Studio / Creator Portal (Secured with RoleGuard for designer & admin) */}
          <Route
            path="/designer"
            element={
              <RoleGuard
                allowedRoles={['designer', 'admin']}
                featureName={'Xưởng thiết kế & Quản lý ấn phẩm'}
                onNavigate={handleNavigate}
              >
                <DesignerDashboardShell>
                  <DesignerDashboardView
                    products={products}
                    materials={materials}
                    pricingConfig={pricingConfig}
                    onAddNewProduct={handleAddNewProduct}
                    onUpdateProduct={handleUpdateProduct}
                    onDeleteProduct={handleDeleteProduct}
                    onNavigate={handleNavigate}
                    onShowToast={showToast}
                  />
                </DesignerDashboardShell>
              </RoleGuard>
            }
          />
          <Route
            path="/designer/:tab"
            element={
              <RoleGuard
                allowedRoles={['designer', 'admin']}
                featureName={'Xưởng thiết kế & Quản lý ấn phẩm'}
                onNavigate={handleNavigate}
              >
                <DesignerDashboardShell>
                  <DesignerDashboardView
                    products={products}
                    materials={materials}
                    pricingConfig={pricingConfig}
                    onAddNewProduct={handleAddNewProduct}
                    onUpdateProduct={handleUpdateProduct}
                    onDeleteProduct={handleDeleteProduct}
                    onNavigate={handleNavigate}
                    onShowToast={showToast}
                  />
                </DesignerDashboardShell>
              </RoleGuard>
            }
          />
          <Route path="/creator" element={<Navigate to="/designer" replace />} />
          <Route path="/creator/*" element={<Navigate to="/designer" replace />} />

          {/* ForgeControl Admin Console (Secured with RoleGuard & URL section synchronization) */}
          <Route
            path="/admin"
            element={
              <RoleGuard
                allowedRoles={['admin']}
                featureName="ForgeControl Quản Trị Hệ Thống"
                onNavigate={handleNavigate}
              >
                <AdminDashboardView
                  products={products}
                  orders={orders}
                  siteContent={siteContent}
                  materials={materials}
                  printers={printers}
                  accessories={accessories}
                  pricingConfig={pricingConfig}
                  onUpdateProduct={handleUpdateProduct}
                  onAddProduct={handleAddNewProduct}
                  onDeleteProduct={handleDeleteProduct}
                  onUpdateOrderStatus={handleUpdateOrderStatus}
                  onUpdateSiteContent={handleUpdateSiteContent}
                  onUpdateMaterials={handleUpdateMaterials}
                  onUpdatePrinters={handleUpdatePrinters}
                  onUpdateAccessories={handleUpdateAccessories}
                  onUpdatePricingConfig={handleUpdatePricingConfig}
                  onNavigate={handleNavigate}
                  onShowToast={showToast}
                />
              </RoleGuard>
            }
          />
          <Route
            path="/admin/:section"
            element={
              <RoleGuard
                allowedRoles={['admin']}
                featureName="ForgeControl Quản Trị Hệ Thống"
                onNavigate={handleNavigate}
              >
                <AdminDashboardView
                  products={products}
                  orders={orders}
                  siteContent={siteContent}
                  materials={materials}
                  printers={printers}
                  accessories={accessories}
                  pricingConfig={pricingConfig}
                  onUpdateProduct={handleUpdateProduct}
                  onAddProduct={handleAddNewProduct}
                  onDeleteProduct={handleDeleteProduct}
                  onUpdateOrderStatus={handleUpdateOrderStatus}
                  onUpdateSiteContent={handleUpdateSiteContent}
                  onUpdateMaterials={handleUpdateMaterials}
                  onUpdatePrinters={handleUpdatePrinters}
                  onUpdateAccessories={handleUpdateAccessories}
                  onUpdatePricingConfig={handleUpdatePricingConfig}
                  onNavigate={handleNavigate}
                  onShowToast={showToast}
                />
              </RoleGuard>
            }
          />

          {/* Print Lab / MES Hub — cổng xưởng in (W1a).
              `allowedRoles` chấp nhận CẢ 'lab' và 'workshop': DB CHECK cho phép cả hai, còn
              `UserRole` (src/types/index.ts:711) mới chỉ có 'lab' — xem `GuardRole`. */}
          <Route path="/lab" element={labRouteElement} />
          <Route path="/lab/:tab" element={labRouteElement} />

          {/* Authentication Pages */}
          <Route path="/auth/login" element={<LoginView onNavigate={handleNavigate} />} />
          <Route path="/login" element={<Navigate to="/auth/login" replace />} />
          <Route path="/auth/register" element={<RegisterView onNavigate={handleNavigate} />} />
          <Route path="/register" element={<Navigate to="/auth/register" replace />} />

          {/* 404 Not Found Fallback */}
          <Route path="*" element={<NotFoundView />} />
        </Routes>
  );
}
