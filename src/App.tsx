import React, { useState, useEffect, useRef } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from 'react-router-dom';
import { CartItem, InkiriCostFormulaConfig, Order } from './types';
import { AuthProvider, useAuth } from '@frontend/context/AuthContext';
import { LanguageProvider, useLanguage } from '@frontend/context/LanguageContext';
import { Header } from '@frontend/components/Header';
import { AuthModal } from '@frontend/components/AuthModal';
import { RoleGuard } from '@frontend/components/RoleGuard';
import { ScrollToTop } from '@frontend/components/ScrollToTop';
import { NotFoundView } from '@frontend/components/NotFoundView';
import { HomeView } from '@frontend/views/HomeView';
import { ChatSupportModal } from '@frontend/components/ChatSupportModal';
import { InvoiceModal } from '@frontend/components/InvoiceModal';
import { CartDrawer } from '@frontend/components/CartDrawer';
import { PageSkeleton } from '@frontend/components/PageSkeleton';
import { RouteErrorBoundary } from '@frontend/components/RouteErrorBoundary';
import { useCartStore } from '@frontend/stores/useCartStore';
import { useUIStore } from '@frontend/stores/useUIStore';
import { Icon } from '@frontend/ui';
import {
  ProtectedRoute,
  ExploreRoute,
  ProductDetailRoute,
  PersonalizeRoute,
  OrderSuccessRoute,
  OrderTrackingRoute,
} from '@frontend/routes/routeWrappers';
import { DesignerDashboardShell, LabRoute } from '@frontend/components/shell';
import { useCatalogData } from '@frontend/hooks/useCatalogData';
import { useSiteSettings } from '@frontend/hooks/useSiteSettings';
import { useOrdersData } from '@frontend/hooks/useOrdersData';

// Heavy modules code-split via React.lazy() for fast initial page load
// Phase 5a — tách 9 view KHÔNG thuộc critical path khỏi graph khởi động. Giữ eager:
// HomeView (storefront critical). Các view named export phải map `.then(m => ({ default: m.X }))`.
// Cấu trúc JSX/route/props KHÔNG đổi — mọi element vẫn nằm trong 1 <React.Suspense> duy nhất.
// Phase 3c: lazy declaration của view chỉ dùng bởi route wrapper/shell đã chuyển sang
// `routes/routeWrappers.tsx` / `components/shell/LabRoute.tsx` (cùng pattern, không đổi cách split).
const CartView = React.lazy(() => import('@frontend/views/CartView').then((m) => ({ default: m.CartView })));
const CheckoutView = React.lazy(() => import('@frontend/views/CheckoutView').then((m) => ({ default: m.CheckoutView })));
const MyOrdersView = React.lazy(() => import('@frontend/views/MyOrdersView').then((m) => ({ default: m.MyOrdersView })));
const AssetLibraryView = React.lazy(() => import('@frontend/views/AssetLibraryView').then((m) => ({ default: m.AssetLibraryView })));
const LoginView = React.lazy(() => import('@frontend/views/LoginView').then((m) => ({ default: m.LoginView })));
const RegisterView = React.lazy(() => import('@frontend/views/RegisterView').then((m) => ({ default: m.RegisterView })));

const Tool3DView = React.lazy(() => import('@frontend/views/Tool3DView'));
const AdminDashboardView = React.lazy(() => import('@frontend/views/AdminDashboardView'));
const DesignerDashboardView = React.lazy(() => import('@frontend/views/DesignerDashboardView'));

// --- MAIN APPLICATION COMPONENT WITH ROUTING ---

function MainApp() {
  const { t } = useLanguage();
  const { user, role, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Zustand State Management for Cart
  const cart = useCartStore((s) => s.cart);
  const appliedDiscount = useCartStore((s) => s.appliedDiscount);
  const addToCartStore = useCartStore((s) => s.addToCart);
  const updateQuantityStore = useCartStore((s) => s.updateQuantity);
  const removeItemStore = useCartStore((s) => s.removeItem);
  const setAppliedDiscount = useCartStore((s) => s.setAppliedDiscount);
  const mergeGuestCart = useCartStore((s) => s.mergeGuestCart);

  // Zustand State Management for UI Drawers, Modals & Toast Queue
  const isCartDrawerOpen = useUIStore((s) => s.isCartDrawerOpen);
  const setIsCartDrawerOpen = useUIStore((s) => s.setIsCartDrawerOpen);
  const isAuthModalOpen = useUIStore((s) => s.isAuthModalOpen);
  const authModalMode = useUIStore((s) => s.authModalMode);
  const openAuthModal = useUIStore((s) => s.openAuthModal);
  const closeAuthModal = useUIStore((s) => s.closeAuthModal);
  const isChatOpen = useUIStore((s) => s.isChatOpen);
  const setIsChatOpen = useUIStore((s) => s.setIsChatOpen);
  const toastQueue = useUIStore((s) => s.toastQueue);
  const addToast = useUIStore((s) => s.addToast);
  const removeToast = useUIStore((s) => s.removeToast);

  const showToast = (msg: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    addToast({ message: msg, type });
  };

  // Domain hooks — state/effects/handlers theo domain (Phase 3c). Hành vi giữ nguyên:
  // catalog (products/materials/printers/accessories + CRUD + realtime), settings
  // (siteContent/pricingConfig/marketplace fee), orders/assets.
  const {
    products,
    productsLoading,
    productsError,
    loadProducts,
    materials,
    printers,
    accessories,
    handleAddNewProduct,
    handleUpdateProduct,
    handleDeleteProduct,
    handleUpdateMaterials,
    handleUpdatePrinters,
    handleUpdateAccessories,
  } = useCatalogData({ showToast });
  const {
    siteContent,
    pricingConfig,
    effectivePricingConfig,
    handleUpdateSiteContent,
    handleUpdatePricingConfig,
  } = useSiteSettings();
  const {
    orders,
    assets,
    setActiveOrder,
    handleOrderCompleted,
    handleUpdateOrderStatus,
  } = useOrdersData();

  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);

  // FAB chat: ẩn khi cuộn xuống (xem effect `controlUnderFab` bên dưới).
  const [isFabHidden, setIsFabHidden] = useState(false);
  const fabRef = useRef<HTMLButtonElement | null>(null);

  // Sync server cart with guest local cart upon user login
  useEffect(() => {
    if (isLoggedIn && user) {
      // When user logs in, merge guest local cart with user's remote server cart
      mergeGuestCart([]);
    }
  }, [isLoggedIn, user, mergeGuestCart]);

  /**
   * FAB "Trợ lý tự động" (lớp phủ `fixed`) LUÔN hiển thị; chỉ tự ẩn khi hộp FAB thực sự
   * đè lên một phần tử tương tác (nút/ô nhập/link) để không che control.
   *
   * Vì sao KHÔNG ẩn theo hướng cuộn (bản cũ): người dùng cần trợ lý luôn trong tầm tay;
   * ẩn-khi-cuộn-xuống làm nút biến mất giữa thao tác. An toàn "không đè control" vẫn giữ
   * bằng đo va chạm — rẻ, và chỉ chạy khi người dùng đã ngừng cuộn.
   *
   * Chống giật:
   *  - Scroll handler throttle bằng `requestAnimationFrame`; KHÔNG đo DOM trong lúc cuộn,
   *    chỉ hẹn đo va chạm sau khi ngừng cuộn 600ms.
   *  - Va chạm đo bằng 5 hit-test `elementsFromPoint` (4 góc + tâm), không quét mọi control.
   *  - FAB tự hiện lại khi đổi route hoặc đóng/mở modal (tránh kẹt ẩn).
   */
  useEffect(() => {
    const IDLE_CHECK_MS = 600;

    /**
     * Có phần tử tương tác nào đang nằm dưới hộp FAB không?
     *
     * Đo bằng `elementsFromPoint` tại 4 góc + tâm hộp FAB (5 hit-test, rẻ) thay vì
     * `querySelectorAll` toàn trang + `getComputedStyle` từng phần tử (forced reflow trên
     * mọi scroll event — nguyên nhân chính của giật). FAB khi ẩn có `pointer-events-none`
     * nên hit-test không trả về chính nó.
     */
    const controlUnderFab = (fab: HTMLElement) => {
      const fr = fab.getBoundingClientRect();
      if (fr.width < 1 || fr.height < 1) return false;
      const selector = 'a,button,input,select,textarea,[role="button"]';
      const points: Array<[number, number]> = [
        [fr.left + 2, fr.top + 2],
        [fr.right - 2, fr.top + 2],
        [fr.left + 2, fr.bottom - 2],
        [fr.right - 2, fr.bottom - 2],
        [fr.left + fr.width / 2, fr.top + fr.height / 2],
      ];
      for (const [x, y] of points) {
        for (const el of document.elementsFromPoint(x, y)) {
          if (el === fab || fab.contains(el)) continue;
          if (el instanceof Element && el.matches(selector)) return true;
        }
      }
      return false;
    };

    const canShow = () => {
      const fab = fabRef.current;
      return fab ? !controlUnderFab(fab) : true;
    };

    let rafId: number | null = null;
    let idleTimer: number | undefined;
    let settleTimer: number | undefined;

    // Va chạm CHỈ được đo khi người dùng đã ngừng cuộn (600ms) hoặc vừa đổi route/modal.
    const evaluateOverlap = () => setIsFabHidden(!canShow());

    const onScroll = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        if (idleTimer !== undefined) window.clearTimeout(idleTimer);
        idleTimer = window.setTimeout(evaluateOverlap, IDLE_CHECK_MS);
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });

    // Vừa đổi route/modal: hiện lại rồi đo va chạm sau khi layout ổn định (tránh kẹt ẩn).
    setIsFabHidden(false);
    settleTimer = window.setTimeout(evaluateOverlap, 400);

    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      if (idleTimer !== undefined) window.clearTimeout(idleTimer);
      if (settleTimer !== undefined) window.clearTimeout(settleTimer);
    };
  }, [location.pathname, isChatOpen, isCartDrawerOpen]);

  const handleOpenAuth = (mode: 'signin' | 'signup' | 'account' = 'signin') => {
    openAuthModal(mode);
  };

  /**
   * Khu dùng khung RIÊNG (không render Header/Footer storefront) — mỗi màn chỉ có
   * MỘT tầng khung (15-ui-audit.md §2):
   *   - `admin`    : AdminDashboardView tự có sidebar + breadcrumb.
   *   - `lab`      : AppShell (LabDashboardShell) — Đợt 11B nhóm 1.
   *   - `designer` : AppShell (DesignerDashboardShell) — Đợt 11B nhóm 1.
   * Trước Đợt 11B chỉ có `admin`, nên `/lab` và `/designer` bị 2 tầng khung chồng nhau.
   */
  const CHROMELESS_SCREENS = ['admin', 'lab', 'designer'];
  // D-F (Lead duyệt 2026-10-20) — UI-016: ẩn FAB trên 2 route có thanh mua cố định
  // (`ProductDetailView`/`PersonalizeView` render bar `fixed bottom-0 z-sticky`). FAB nằm
  // ở `z-drawer` (40) > `z-sticky` (10) nên trước đây đè nút "Đặt In 3D" ở 390 trong lúc
  // chờ logic auto-hide (~400ms/scroll-settle). Không đổi route; chỉ bỏ FAB khỏi cây.
  const FAB_HIDDEN_SCREENS = ['product_detail', 'personalize'];

  // Derive active screen for Header navigation highlight
  const getCurrentScreenFromPath = (): string => {
    const p = location.pathname;
    if (p === '/' || p === '') return 'home';
    if (p.startsWith('/explore')) return 'explore';
    if (p.startsWith('/products')) return 'product_detail';
    if (p.startsWith('/personalize')) return 'personalize';
    if (p.startsWith('/quote') || p.startsWith('/tool-3d')) return 'tool_3d';
    if (p.startsWith('/cart')) return 'cart';
    if (p.startsWith('/checkout')) return 'checkout';
    if (p.startsWith('/order-success')) return 'order_success';
    if (p.startsWith('/tracking')) return 'order_tracking';
    if (p.startsWith('/orders') || p.startsWith('/my-orders')) return 'my_orders';
    if (p.startsWith('/admin')) return 'admin';
    if (p.startsWith('/designer') || p.startsWith('/creator')) return 'designer';
    if (p.startsWith('/lab')) return 'lab';
    if (p.startsWith('/assets') || p.startsWith('/library')) return 'asset_library';
    return 'home';
  };

  const currentScreen = getCurrentScreenFromPath();

  // Central Navigation Adapter Bridge
  const handleNavigate = (screen: string, payload?: any) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (screen === 'login' || screen === 'signin') {
      navigate('/auth/login');
      return;
    }
    if (screen === 'register' || screen === 'signup') {
      navigate('/auth/register');
      return;
    }

    const publicScreens = [
      'home',
      'explore',
      'product_detail',
      'personalize',
      'tool_3d',
      'quote',
      'cart',
      'checkout',
      'order_success',
      'order-success',
      'order_tracking',
      'tracking',
    ];
    if (!isLoggedIn && !publicScreens.includes(screen)) {
      navigate('/auth/login');
      return;
    }

    // Only admin can access admin console
    if (screen === 'admin' && role !== 'admin') {
      showToast('Chỉ Quản Trị Viên (Admin) mới có quyền truy cập trang quản trị');
      navigate('/');
      return;
    }

    // W1a: cổng xưởng in chỉ dành cho vai trò xưởng ('lab' hoặc 'workshop' — DB CHECK ở
    // supabase/migrations/20260901_baseline_schema.sql:460 cho phép cả hai) và admin.
    // `role` được khai là `UserRole` (chưa có 'workshop') nên so sánh qua `string`.
    const roleName: string = role;
    if (screen === 'lab' && roleName !== 'lab' && roleName !== 'workshop' && roleName !== 'admin') {
      showToast('Chỉ tài khoản Xưởng in (Lab) hoặc Quản trị viên mới vào được Bảng điều khiển xưởng in');
      navigate('/');
      return;
    }

    switch (screen) {
      case 'home':
        navigate('/');
        break;
      case 'explore': {
        const params = new URLSearchParams();
        if (payload?.category && payload.category !== 'all') params.set('category', payload.category);
        if (payload?.search) params.set('search', payload.search);
        if (payload?.tag && payload.tag !== 'all') params.set('tag', payload.tag);
        const searchStr = params.toString();
        navigate(`/explore${searchStr ? `?${searchStr}` : ''}`);
        break;
      }
      case 'product_detail':
        if (payload?.product?.id) {
          navigate(`/products/${payload.product.id}`);
        } else {
          navigate('/explore');
        }
        break;
      case 'personalize':
        if (payload?.product?.id) {
          navigate(`/personalize/${payload.product.id}`);
        } else {
          navigate('/personalize');
        }
        break;
      case 'tool_3d':
      case 'quote': {
        const mat = payload?.materialId;
        const params = new URLSearchParams();
        if (mat) params.set('material', mat);
        const searchStr = params.toString();
        navigate(`/quote${searchStr ? `?${searchStr}` : ''}`, { state: payload });
        break;
      }
      case 'cart':
        navigate('/cart');
        break;
      case 'checkout':
        if (payload?.appliedDiscount !== undefined) {
          setAppliedDiscount(payload.appliedDiscount);
        }
        navigate('/checkout');
        break;
      case 'order_success':
        if (payload?.order) {
          setActiveOrder(payload.order);
          navigate(`/order-success/${payload.order.id}`);
        } else {
          navigate('/order-success');
        }
        break;
      case 'order_tracking':
      case 'tracking': {
        const targetOrderId = payload?.order?.id || payload?.orderId;
        if (targetOrderId) {
          const latestOrder = orders.find((o) => o.id === targetOrderId) || payload?.order;
          if (latestOrder) setActiveOrder(latestOrder);
          navigate(`/tracking/${targetOrderId}`);
        } else {
          // Không bịa id đơn: mở cổng tra cứu để người dùng nhập mã + token.
          navigate('/tracking');
        }
        break;
      }
      case 'my_orders':
      case 'orders':
        navigate('/orders');
        break;
      case 'asset_library':
      case 'assets':
        navigate('/assets');
        break;
      case 'lab':
      case 'workshop':
      case 'workshop_settings':
        if (payload?.tab) {
          navigate(`/lab/${payload.tab}`);
        } else {
          navigate('/lab');
        }
        break;
      case 'designer':
      case 'creator':
        if (payload?.tab) {
          navigate(`/designer/${payload.tab}`);
        } else {
          navigate('/designer');
        }
        break;
      case 'admin':
        if (payload?.section) {
          navigate(`/admin/${payload.section}`);
        } else {
          navigate('/admin');
        }
        break;
      default:
        if (screen.startsWith('/')) {
          navigate(screen);
        } else {
          navigate(`/${screen}`);
        }
        break;
    }
  };

  const handleAddToCart = (item: CartItem) => {
    addToCartStore(item);
    setIsCartDrawerOpen(true);
  };

  const handleUpdateQuantity = (id: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(id);
      return;
    }
    updateQuantityStore(id, newQty);
  };

  const handleRemoveItem = (id: string) => {
    const itemToRemove = cart.find((i) => i.id === id);
    removeItemStore(id);
    addToast({
      message: 'Đã xóa sản phẩm khỏi giỏ hàng',
      type: 'info',
      undoAction: itemToRemove ? () => addToCartStore(itemToRemove) : undefined
    });
  };

  // P1 §4: giữ nhãn nhưng BỎ phần rỗng; không còn gì để in thì ẩn cả dòng
  // (không bao giờ in "Hotline: •" hay "Hotline: —"). Lọc giá trị dummy nếu có dữ liệu mẫu.
  const isValidHotline = (phone?: string) => Boolean(phone && !/^0+$/.test(phone.trim()) && !phone.includes('[MẪU]'));
  const footerContactLine = [
    isValidHotline(siteContent.hotline) ? `Hotline: ${siteContent.hotline}` : '',
    siteContent.contactEmail ? `Email: ${siteContent.contactEmail === 'mau@example.com' ? 'contact@vcube.vn' : siteContent.contactEmail}` : '',
  ].filter(Boolean).join(' • ');

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
    <div className="min-h-dvh flex flex-col bg-canvas text-fg">
      {/*
        P1 §3: /admin* có khung riêng (breadcrumb + avatar + nút "Xem Cửa Hàng"
        trong AdminDashboardView) nên KHÔNG render thanh storefront — trước đây 2 tầng khung
        chồng nhau, tốn ~72px và rối định hướng (15-ui-audit.md §2).
      */}
      {!CHROMELESS_SCREENS.includes(currentScreen) && (
        <Header
          currentScreen={currentScreen}
          onNavigate={handleNavigate}
          cart={cart}
          siteContent={siteContent}
          onOpenAuth={handleOpenAuth}
          onOpenCartDrawer={() => setIsCartDrawerOpen(true)}
        />
      )}

      {/* Main View Routes with React.Suspense Code-Splitting */}
      {/*
        MỘT landmark `main` cho mỗi trang.
        Lịch sử: `App.tsx` từng bọc `<main>` và `AppShell.tsx:160` CŨNG render `<main>`
        ⇒ 2 landmark trên /admin (A3 đo `mainTot=2`), và `<main>` ngoài bao luôn cả sidebar.
        Đổi thành `<div>` để vá việc đó lại gây lỗi NGƯỢC LẠI: `AppShell` chỉ render ở
        /admin, /lab, /designer, nên MỌI trang storefront mất luôn landmark — browser test
        đo `querySelectorAll('main').length === 0` trên `/`, `/products/*`, `/quote`.
        ⇒ Vì vậy thẻ được chọn THEO MÀN: màn có AppShell ⇒ `div`, còn lại ⇒ `main`.
      */}
      {React.createElement(
        CHROMELESS_SCREENS.includes(currentScreen) ? 'div' : 'main',
        { className: 'flex-1' },
        <>
        <React.Suspense fallback={<PageSkeleton />}>
          {/*
            U0-2 / B0-3: lưới an toàn cấp ROUTE. Trước đây cả app chỉ có
            `CanvasErrorBoundary` bọc khung 3D, nên một throw khi render ở bất kỳ view nào
            làm trắng cả ứng dụng (đã tái hiện: /quote trắng khi upload tệp CAD).
            Boundary nằm TRONG <BrowserRouter> nên dùng `location.pathname` làm `resetKey`
            (đổi route ⇒ xoá màn lỗi) và `handleNavigate('home')` cho nút về trang chủ.
          */}
          <RouteErrorBoundary resetKey={location.pathname} onGoHome={() => handleNavigate('home')}>
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
          </RouteErrorBoundary>
        </React.Suspense>
        </>
      )}

      {/*
        Floating Quick Support Button — CHỈ storefront.
        U0-3: FAB là lớp nổi của storefront nhưng trước đây hiện ở MỌI màn, kể cả /admin
        (đè lên điều khiển của dashboard). `CHROMELESS_SCREENS` là các màn đã có khung
        riêng nên FAB bị loại hẳn khỏi cây (không chỉ ẩn bằng CSS).
        D-F/UI-016: ẩn thêm ở `FAB_HIDDEN_SCREENS` (PDP/Personalize có bottom-bar).
      */}
      {!CHROMELESS_SCREENS.includes(currentScreen) && !FAB_HIDDEN_SCREENS.includes(currentScreen) && (
      <button
        ref={fabRef}
        onClick={() => setIsChatOpen(true)}
        aria-hidden={isFabHidden || undefined}
        tabIndex={isFabHidden ? -1 : undefined}
        className={`fixed bottom-6 right-6 z-drawer flex items-center gap-2.5 rounded-md bg-primary hover:bg-primary-hover px-4 py-3 font-sans text-xs text-primary-fg shadow-e2 border border-transparent transition-all duration-200 motion-reduce:transition-none active:scale-[0.97] touch-target-btn cursor-pointer ${
          isFabHidden ? 'opacity-0 pointer-events-none invisible' : 'opacity-100'
        }`}
        aria-label={t('liveSupportAria', 'Tư vấn kỹ thuật trực tuyến')}
      >
        <span className="w-2 h-2 rounded-full bg-brand animate-pulse motion-reduce:animate-none"></span>
        <Icon name="support_agent" size={20} className="text-primary-fg" />
        <span className="font-bold text-xs uppercase tracking-widest hidden sm:inline font-tech">
          {t('supportAssistant', 'Trợ lý tự động')}
        </span>
      </button>
      )}

      {/* Interactive Toast Notification Queue via useUIStore.
          UI-012 (a11y): container là LIVE REGION thường trực — nếu chỉ gắn role khi có
          toast thì screen reader không kịp đăng ký vùng và bỏ qua thông báo. */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="false"
        className="fixed bottom-6 left-6 z-toast flex flex-col gap-2 pointer-events-none max-w-sm w-full"
      >
        {toastQueue.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto px-4 py-3 border bg-surface text-fg shadow-soft flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200 rounded-lg ${
              toast.type === 'error'
                ? 'border-danger/20'
                : toast.type === 'warning'
                ? 'border-warning/20'
                : toast.type === 'success'
                ? 'border-positive/20'
                : 'border-line'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Icon
                name={toast.type === 'error' ? 'error' : toast.type === 'warning' ? 'warning' : toast.type === 'success' ? 'check_circle' : 'info'}
                size={20}
                className={
                  toast.type === 'error'
                    ? 'text-danger'
                    : toast.type === 'warning'
                    ? 'text-warning'
                    : toast.type === 'success'
                    ? 'text-positive'
                    : 'text-info'
                }
              />
              <span className="text-xs font-sans font-semibold">{toast.message}</span>
            </div>
            <div className="flex items-center gap-2">
              {toast.undoAction && (
                <button
                  onClick={toast.undoAction}
                  className="px-2 py-0.5 bg-surface-muted hover:bg-line text-xs font-mono rounded-md text-fg underline cursor-pointer"
                >
                  Hoàn tác
                </button>
              )}
              <button
                onClick={() => removeToast(toast.id)}
                className="text-fg-subtle hover:text-fg cursor-pointer"
                aria-label="Đóng thông báo"
              >
                <Icon name="close" size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Auth Modal for Login & Registration */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={closeAuthModal}
        initialMode={authModalMode}
        onSuccess={showToast}
      />

      {/* Quick Engineer Hotline & Support Modal */}
      <ChatSupportModal
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
      />

      {/* Invoice Generator Modal */}
      <InvoiceModal
        order={invoiceOrder}
        isOpen={!!invoiceOrder}
        onClose={() => setInvoiceOrder(null)}
      />

      {/* Slide-over Cart Drawer */}
      <CartDrawer
        isOpen={isCartDrawerOpen}
        onClose={() => setIsCartDrawerOpen(false)}
        cart={cart}
        siteContent={siteContent}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onNavigate={handleNavigate}
      />

      {/*
        P1: /admin* có khung quản trị riêng (AdminDashboardView) ⇒ không render cả
        header lẫn footer storefront. Footer storefront là nội dung bán hàng
        (dịch vụ, địa chỉ xưởng, dung sai chế tạo) — vô nghĩa trong app quản trị.
      */}
      {/* Industrial Aesthetic Footer with Dynamic Admin Content */}
      {!CHROMELESS_SCREENS.includes(currentScreen) && (
        <footer className="bg-surface-inverse text-on-inverse border-t border-on-inverse/10 pt-12 pb-6 mt-auto">
          {/* CC-10 (W5): cùng container với header/hero/lưới sản phẩm (`max-w-7xl`) để gutter
              header = footer trên mọi trang; trước đây footer 1440px còn header 1280px. */}
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
            <div className={`grid grid-cols-1 sm:grid-cols-2 ${role === 'admin' ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-8`}>
              {/* Col 1: Brand & Bio */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="font-display font-black text-2xl tracking-tighter text-on-inverse uppercase italic">
                    VCUBE
                  </span>
                  <span className="text-xs font-sans uppercase tracking-[0.2em] text-accent border-l border-on-inverse/20 pl-2">
                    Việt Nam
                  </span>
                </div>
                <p className="text-xs text-on-inverse/70 leading-relaxed font-sans">
                  {t('footerAbout', 'Nền tảng sản xuất bồi đắp và chế tác linh kiện cơ khí chính xác cho xưởng và phòng R&D.')}
                </p>
                {siteContent.toleranceSpec ? (
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-surface-inverse-raised text-accent text-xs font-tech uppercase tracking-wider rounded-sm border border-on-inverse/15">
                    <span>{t('footerToleranceLabel', 'Dung sai chế tạo:')} {siteContent.toleranceSpec}</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-surface-inverse-raised text-on-inverse/80 text-xs font-mono tracking-wider rounded-sm border border-on-inverse/15">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                    <span>Tiêu chuẩn chế tạo công nghiệp</span>
                  </div>
                )}
              </div>

              {/* Col 2: Customer Navigation */}
              <div className="space-y-2.5 text-xs font-sans">
                <p className="font-bold uppercase tracking-widest text-on-inverse/70 text-xs font-tech">
                  {t('footerServices', 'Dịch Vụ & Mua Hàng')}
                </p>
                <ul className="space-y-2 text-on-inverse/70">
                  <li>
                    <button onClick={() => handleNavigate('explore')} className="hover:text-on-inverse transition-colors text-left cursor-pointer">
                      {t('footerMarketplace', 'Sàn linh kiện 3D')}
                    </button>
                  </li>
                  <li>
                    <button onClick={() => handleNavigate('quote')} className="hover:text-on-inverse transition-colors text-left cursor-pointer">
                      {t('footerInstantQuote', 'Báo giá in 3D trực tuyến')}
                    </button>
                  </li>
                  <li>
                    <button onClick={() => handleNavigate('cart')} className="hover:text-on-inverse transition-colors text-left cursor-pointer">
                      {t('cartTitle', 'Giỏ hàng của bạn')}
                    </button>
                  </li>
                  <li>
                    <button onClick={() => handleNavigate('orders')} className="hover:text-on-inverse transition-colors text-left cursor-pointer">
                      {t('myOrdersTracking', 'Theo dõi đơn hàng thời gian thực')}
                    </button>
                  </li>
                </ul>
              </div>

              {/* Col 3: Admin Console - Only visible for admin users */}
              {role === 'admin' && (
                <div className="space-y-2.5 text-xs font-sans">
                  <p className="font-bold uppercase tracking-widest text-on-inverse/70 text-xs font-tech">
                    {t('footerCreators', 'Quản Trị Hệ Thống')}
                  </p>
                  <ul className="space-y-2 text-on-inverse/70">
                    <li>
                      <button onClick={() => handleNavigate('admin')} className="hover:text-on-inverse transition-colors text-left font-bold text-accent cursor-pointer">
                        Bảng điều khiển quản trị
                      </button>
                    </li>
                    <li>
                      <button onClick={() => handleNavigate('admin', { section: 'products' })} className="hover:text-on-inverse transition-colors text-left cursor-pointer">
                        {'Quản lý sản phẩm & giá'}
                      </button>
                    </li>
                    <li>
                      <button onClick={() => handleNavigate('admin', { section: 'queue' })} className="hover:text-on-inverse transition-colors text-left cursor-pointer">
                        {'Hàng đợi & tiến độ gia công'}
                      </button>
                    </li>
                    <li>
                      <button onClick={() => handleNavigate('admin', { section: 'storefront' })} className="hover:text-on-inverse transition-colors text-left cursor-pointer">
                        {'Cấu hình phí ship & thông báo'}
                      </button>
                    </li>
                  </ul>
                </div>
              )}

              {/* Col 4: Dynamic Contact from Admin Content */}
              <div className="space-y-2.5 text-xs font-sans">
                <p className="font-bold uppercase tracking-widest text-on-inverse/70 text-xs font-tech">
                  {t('footerLocationTitle', 'Trụ Sở & Xưởng Chế Tác')}
                </p>
                {siteContent.hanoiWorkshopAddress && (
                  <p className="text-on-inverse/70">
                    {siteContent.hanoiWorkshopAddress.replace(/^\[MẪU\]\s*/, '')}
                  </p>
                )}
                {siteContent.hcmWorkshopAddress && (
                  <p className="text-on-inverse/70">
                    {siteContent.hcmWorkshopAddress.replace(/^\[MẪU\]\s*/, '')}
                  </p>
                )}
                {footerContactLine && (
                  <p className="text-on-inverse/70 font-tech">{footerContactLine.replace(/\[MẪU\]\s*/g, '')}</p>
                )}
              </div>
            </div>

            <div className="pt-8 border-t border-on-inverse/15 flex flex-col sm:flex-row items-center justify-between text-xs text-on-inverse/70 font-sans gap-4">
              <p>{t('footerRights', '© 2026 VCUBE Việt Nam. Bảo lưu mọi quyền.')}</p>
              <div className="flex items-center gap-4">
                <span>{t('footerCadSecurity', 'Bảo mật dữ liệu CAD/STL')}</span>
                <span>•</span>
                <span>{t('footerQcPolicy', 'Đo kiểm theo quy trình thoả thuận')}</span>
              </div>
            </div>

            {/*
              R3 — chừa chỗ cho FAB "Trợ lý tự động" (nút fixed bottom-6 right-6 ở dưới).
              Nằm bên trong footer tối để toàn bộ chân trang đồng nhất màu tối (bg-surface-inverse),
              loại bỏ triệt để dải trắng bên dưới chân trang mà vẫn đảm bảo FAB không che nút hay link.
            */}
            <div data-fab-spacer aria-hidden="true" className="h-16 sm:h-20 w-full shrink-0" />
          </div>
        </footer>
      )}
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <LanguageProvider>
          <ScrollToTop />
          <MainApp />
        </LanguageProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
