import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '@frontend/context/AuthContext';
import { LanguageProvider } from '@frontend/context/LanguageContext';
import { Header } from '@frontend/components/Header';
import { ScrollToTop } from '@frontend/components/ScrollToTop';
import { PageSkeleton } from '@frontend/components/PageSkeleton';
import { RouteErrorBoundary } from '@frontend/components/RouteErrorBoundary';
import { useCartStore } from '@frontend/stores/useCartStore';
import { useUIStore } from '@frontend/stores/useUIStore';
import type { CartItem, Order } from './types';
import { CHROMELESS_SCREENS } from '@frontend/components/shell/screens';
import { AppOverlays } from '@frontend/components/shell/AppOverlays';
import { AppRoutes } from '@frontend/routes/AppRoutes';
import { useCatalogData } from '@frontend/hooks/useCatalogData';
import { useSiteSettings } from '@frontend/hooks/useSiteSettings';
import { useOrdersData } from '@frontend/hooks/useOrdersData';
import { useAppNavigation } from '@frontend/hooks/useAppNavigation';

// --- MAIN APPLICATION COMPONENT WITH ROUTING ---

function MainApp() {
  const { user, role, isLoggedIn } = useAuth();
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
  // (modal/drawer/toast còn lại do `AppOverlays` tự select — cùng store, cùng selector)
  const isCartDrawerOpen = useUIStore((s) => s.isCartDrawerOpen);
  const setIsCartDrawerOpen = useUIStore((s) => s.setIsCartDrawerOpen);
  const isChatOpen = useUIStore((s) => s.isChatOpen);
  const setIsChatOpen = useUIStore((s) => s.setIsChatOpen);
  const addToast = useUIStore((s) => s.addToast);
  const openAuthModal = useUIStore((s) => s.openAuthModal);

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

  const { handleNavigate } = useAppNavigation({
    role,
    isLoggedIn,
    orders,
    setActiveOrder,
    setAppliedDiscount,
    showToast,
  });

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
          <AppRoutes
            products={products}
            productsLoading={productsLoading}
            productsError={productsError}
            loadProducts={loadProducts}
            materials={materials}
            printers={printers}
            accessories={accessories}
            siteContent={siteContent}
            pricingConfig={pricingConfig}
            effectivePricingConfig={effectivePricingConfig}
            orders={orders}
            assets={assets}
            cart={cart}
            appliedDiscount={appliedDiscount}
            setInvoiceOrder={setInvoiceOrder}
            handleAddToCart={handleAddToCart}
            handleUpdateQuantity={handleUpdateQuantity}
            handleRemoveItem={handleRemoveItem}
            handleAddNewProduct={handleAddNewProduct}
            handleUpdateProduct={handleUpdateProduct}
            handleDeleteProduct={handleDeleteProduct}
            handleOrderCompleted={handleOrderCompleted}
            handleUpdateOrderStatus={handleUpdateOrderStatus}
            handleUpdateSiteContent={handleUpdateSiteContent}
            handleUpdateMaterials={handleUpdateMaterials}
            handleUpdatePrinters={handleUpdatePrinters}
            handleUpdateAccessories={handleUpdateAccessories}
            handleUpdatePricingConfig={handleUpdatePricingConfig}
            handleNavigate={handleNavigate}
            showToast={showToast}
            setIsChatOpen={setIsChatOpen}
          />
          </RouteErrorBoundary>
        </React.Suspense>
        </>
      )}

      <AppOverlays
        role={role}
        siteContent={siteContent}
        cart={cart}
        invoiceOrder={invoiceOrder}
        setInvoiceOrder={setInvoiceOrder}
        handleUpdateQuantity={handleUpdateQuantity}
        handleRemoveItem={handleRemoveItem}
        handleNavigate={handleNavigate}
        showToast={showToast}
        fabRef={fabRef}
        isFabHidden={isFabHidden}
        currentScreen={currentScreen}
      />
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
