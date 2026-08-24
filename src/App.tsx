import React, { useState } from 'react';
import { Product, CartItem, Order, DigitalAsset, SiteContentConfig } from './types';
import { PRODUCTS, INITIAL_CART_ITEMS, MOCK_ORDERS, DIGITAL_ASSETS, DEFAULT_SITE_CONTENT } from './data/mockData';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { Header } from './components/Header';
import { AuthModal } from './components/AuthModal';
import { RoleGuard } from './components/RoleGuard';
import { HomeView } from './views/HomeView';
import { ExploreView } from './views/ExploreView';
import { ProductDetailView } from './views/ProductDetailView';
import { Tool3DView } from './views/Tool3DView';
import { CartView } from './views/CartView';
import { CheckoutView } from './views/CheckoutView';
import { OrderSuccessView } from './views/OrderSuccessView';
import { OrderTrackingView } from './views/OrderTrackingView';
import { MyOrdersView } from './views/MyOrdersView';
import { AdminDashboardView } from './views/AdminDashboardView';
import { PersonalizeView } from './views/PersonalizeView';
import { AssetLibraryView } from './views/AssetLibraryView';
import { ChatSupportModal } from './components/ChatSupportModal';
import { InvoiceModal } from './components/InvoiceModal';

function MainApp() {
  const { role, profile } = useAuth();
  const { language, t } = useLanguage();

  // Core App State
  const [products, setProducts] = useState<Product[]>(PRODUCTS);
  const [cart, setCart] = useState<CartItem[]>(INITIAL_CART_ITEMS);
  const [orders, setOrders] = useState<Order[]>(MOCK_ORDERS);
  const [assets, setAssets] = useState<DigitalAsset[]>(DIGITAL_ASSETS);
  const [siteContent, setSiteContent] = useState<SiteContentConfig>(DEFAULT_SITE_CONTENT);

  // Router State
  const [currentScreen, setCurrentScreen] = useState<string>('home');
  const [selectedProduct, setSelectedProduct] = useState<Product>(PRODUCTS[0]);
  const [activeOrder, setActiveOrder] = useState<Order>(MOCK_ORDERS[0]);
  const [appliedDiscount, setAppliedDiscount] = useState<number>(0);

  // Modals & Notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup' | 'role_select'>('signin');

  // Filtering params for Explore
  const [exploreCategory, setExploreCategory] = useState<string>('all');
  const [exploreSearch, setExploreSearch] = useState<string>('');
  const [exploreTag, setExploreTag] = useState<string>('all');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handleOpenAuth = (mode: 'signin' | 'signup' | 'role_select' = 'signin') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const handleNavigate = (screen: string, payload?: any) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (screen === 'explore') {
      if (payload?.category !== undefined) setExploreCategory(payload.category);
      if (payload?.search !== undefined) setExploreSearch(payload.search);
      if (payload?.tag !== undefined) setExploreTag(payload.tag);
    } else if (screen === 'product_detail' && payload?.product) {
      setSelectedProduct(payload.product);
    } else if (screen === 'personalize' && payload?.product) {
      setSelectedProduct(payload.product);
    } else if (screen === 'order_tracking' && payload?.order) {
      // Find latest version of order from orders state if exists
      const latestOrder = orders.find(o => o.id === payload.order.id) || payload.order;
      setActiveOrder(latestOrder);
    } else if (screen === 'checkout' && payload) {
      if (payload.appliedDiscount !== undefined) setAppliedDiscount(payload.appliedDiscount);
    }
    setCurrentScreen(screen);
  };

  const handleAddToCart = (item: CartItem) => {
    setCart((prev) => {
      const existingIdx = prev.findIndex(
        (i) =>
          i.productId === item.productId &&
          i.type === item.type &&
          i.material === item.material &&
          i.color === item.color &&
          i.customText === item.customText
      );
      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx].quantity += item.quantity;
        return updated;
      }
      return [...prev, item];
    });
  };

  const handleUpdateQuantity = (id: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(id);
      return;
    }
    setCart((prev) => prev.map((item) => (item.id === id ? { ...item, quantity: newQty } : item)));
  };

  const handleRemoveItem = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
    showToast(language === 'vi' ? 'Đã xóa sản phẩm khỏi giỏ hàng' : 'Removed item from cart');
  };

  const handleOrderCompleted = (newOrder: Order) => {
    setOrders((prev) => [newOrder, ...prev]);
    setActiveOrder(newOrder);

    // Also add any digital files to user's Digital Asset Library
    const newAssets: DigitalAsset[] = newOrder.items
      .filter((i) => i.type === 'digital')
      .map((i) => ({
        id: `asset-${Date.now()}-${Math.random()}`,
        name: i.name,
        designer: i.designer,
        isVerified: true,
        format: 'STL',
        version: 'v2.0',
        license: 'Commercial',
        purchaseDate: new Date().toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US'),
        downloadsCount: 0,
        maxDownloads: language === 'vi' ? 'Không giới hạn' : 'Unlimited',
        fileSize: '16.5 MB',
        image: i.image,
        model3DType: 'gear'
      }));

    if (newAssets.length > 0) {
      setAssets((prev) => [...newAssets, ...prev]);
    }

    // Clear cart after checkout
    setCart([]);
  };

  // Admin Product Handlers
  const handleAddNewProduct = (prod: Product) => {
    setProducts((prev) => [prod, ...prev]);
  };

  const handleUpdateProduct = (updated: Product) => {
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    if (selectedProduct.id === updated.id) {
      setSelectedProduct(updated);
    }
  };

  const handleDeleteProduct = (productId: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId));
  };

  // Admin Order Status Update Handler
  const handleUpdateOrderStatus = (orderId: string, newStageIndex: number, newStatus: Order['status'], progress?: number) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId) {
          const updated: Order = {
            ...o,
            statusStageIndex: newStageIndex,
            status: newStatus,
            layerProgress: progress !== undefined ? progress : o.layerProgress
          };
          if (activeOrder.id === orderId) {
            setActiveOrder(updated);
          }
          return updated;
        }
        return o;
      })
    );
  };

  // Admin Site Content Update Handler
  const handleUpdateSiteContent = (newContent: SiteContentConfig) => {
    setSiteContent(newContent);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FF] text-[#0B1C30]">
      {/* Top Header Navbar */}
      <Header
        currentScreen={currentScreen}
        onNavigate={handleNavigate}
        cart={cart}
        siteContent={siteContent}
        onOpenAuth={handleOpenAuth}
      />

      {/* Main View Router */}
      <main className="flex-1">
        {currentScreen === 'home' && (
          <HomeView
            products={products}
            onNavigate={handleNavigate}
            onSelectProduct={(p) => setSelectedProduct(p)}
          />
        )}

        {currentScreen === 'explore' && (
          <ExploreView
            products={products}
            initialCategory={exploreCategory}
            initialSearch={exploreSearch}
            initialTag={exploreTag}
            onNavigate={handleNavigate}
            onSelectProduct={(p) => setSelectedProduct(p)}
          />
        )}

        {currentScreen === 'product_detail' && (
          <ProductDetailView
            product={selectedProduct}
            onAddToCart={handleAddToCart}
            onNavigate={handleNavigate}
            onShowToast={showToast}
          />
        )}

        {currentScreen === 'personalize' && (
          <PersonalizeView
            product={selectedProduct}
            onAddToCart={handleAddToCart}
            onNavigate={handleNavigate}
            onShowToast={showToast}
          />
        )}

        {currentScreen === 'tool_3d' && (
          <Tool3DView
            onAddToCart={handleAddToCart}
            onNavigate={handleNavigate}
            onShowToast={showToast}
          />
        )}

        {currentScreen === 'cart' && (
          <CartView
            cart={cart}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
            onNavigate={handleNavigate}
            onShowToast={showToast}
          />
        )}

        {currentScreen === 'checkout' && (
          <CheckoutView
            cart={cart}
            appliedDiscount={appliedDiscount}
            siteContent={siteContent}
            onOrderCompleted={handleOrderCompleted}
            onNavigate={handleNavigate}
          />
        )}

        {currentScreen === 'order_success' && (
          <OrderSuccessView
            order={activeOrder}
            onNavigate={handleNavigate}
            onOpenInvoice={(ord) => setInvoiceOrder(ord)}
          />
        )}

        {currentScreen === 'order_tracking' && (
          <OrderTrackingView
            order={activeOrder}
            onNavigate={handleNavigate}
            onOpenChat={() => setIsChatOpen(true)}
            onOpenInvoice={(ord) => setInvoiceOrder(ord)}
          />
        )}

        {currentScreen === 'my_orders' && (
          <MyOrdersView
            orders={orders}
            onNavigate={handleNavigate}
            onOpenInvoice={(ord) => setInvoiceOrder(ord)}
          />
        )}

        {/* ForgeControl Console with Product, Order, Production Status & Content Management */}
        {currentScreen === 'admin' && (
          <RoleGuard
            allowedRoles={['admin']}
            featureName={language === 'vi' ? 'ForgeControl Quản Trị Hệ Thống' : 'ForgeControl Administration Console'}
            onNavigate={handleNavigate}
            onOpenAuthModal={handleOpenAuth}
          >
            <AdminDashboardView
              products={products}
              orders={orders}
              siteContent={siteContent}
              onUpdateProduct={handleUpdateProduct}
              onAddProduct={handleAddNewProduct}
              onDeleteProduct={handleDeleteProduct}
              onUpdateOrderStatus={handleUpdateOrderStatus}
              onUpdateSiteContent={handleUpdateSiteContent}
              onNavigate={handleNavigate}
              onShowToast={showToast}
            />
          </RoleGuard>
        )}

        {currentScreen === 'asset_library' && (
          <AssetLibraryView
            assets={assets}
            onNavigate={handleNavigate}
            onShowToast={showToast}
          />
        )}
      </main>

      {/* Floating Quick Support Button */}
      <button
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-6 right-6 z-40 px-4 py-3 bg-[#091426] hover:bg-[#1E293B] text-white shadow-2xl border border-[#545F73]/30 flex items-center gap-2.5 font-sans text-xs transition-all hover:scale-105 touch-target-btn rounded cursor-pointer"
        aria-label={t('liveSupportAria', 'Tư vấn kỹ thuật trực tuyến', 'Live technical consultation')}
      >
        <span className="w-2 h-2 rounded-full bg-[#57DFFE] animate-pulse"></span>
        <span className="material-symbols-outlined text-white text-lg">support_agent</span>
        <span className="font-bold text-[10px] uppercase tracking-widest hidden sm:inline font-tech">
          {t('liveSupportEngineer', 'Kỹ Sư VCUBE 24/7', 'VCUBE Engineer 24/7')}
        </span>
      </button>

      {/* Interactive Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-6 z-50 bg-[#091426] text-white px-4 py-3 border border-[#57DFFE]/30 shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200 rounded">
          <span className="material-symbols-outlined text-[#57DFFE] text-xl">check_circle</span>
          <span className="text-xs font-sans font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Auth Modal for Login & Registration */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
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

      {/* Industrial Aesthetic Footer with Dynamic Admin Content */}
      <footer className="bg-[#091426] text-white border-t border-[#1E293B] pt-12 pb-8 mt-12">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-12 space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Col 1: Brand & Bio */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="font-display font-black text-2xl tracking-tighter text-white uppercase italic">
                  VCUBE
                </span>
                <span className="text-[10px] font-sans uppercase tracking-[0.2em] text-[#57DFFE] border-l border-white/20 pl-2">
                  Vietnam
                </span>
              </div>
              <p className="text-xs text-[#BCC7DE] leading-relaxed font-serif">
                {siteContent.heroSubheadline || t('footerAboutText', 'Nền tảng sản xuất bồi đắp và chế tác linh kiện cơ khí chính xác theo tiêu chuẩn công nghiệp ISO/ASTM 52900.', 'Additive manufacturing and precision mechanical fabrication platform meeting ISO/ASTM 52900 industrial standards.')}
              </p>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-[#1E293B] text-[#57DFFE] text-[10px] font-tech uppercase tracking-wider rounded border border-[#545F73]/50">
                <span>{t('industrialTolerance', 'Dung sai chế tạo:', 'Fabrication tolerance:')} {siteContent.toleranceSpec}</span>
              </div>
            </div>

            {/* Col 2: Customer Navigation */}
            <div className="space-y-2.5 text-xs font-sans">
              <p className="font-bold uppercase tracking-widest text-[#D8E3FB] text-[10px] font-tech">
                {t('footerServices', 'Dịch Vụ & Mua Hàng', 'Customer Store')}
              </p>
              <ul className="space-y-2 text-[#8590A6]">
                <li>
                  <button onClick={() => handleNavigate('explore')} className="hover:text-white transition-colors text-left">
                    {t('footerMarketplace', 'Marketplace linh kiện 3D', '3D Parts Marketplace')}
                  </button>
                </li>
                <li>
                  <button onClick={() => handleNavigate('tool_3d')} className="hover:text-white transition-colors text-left">
                    {t('footerInstantQuote', 'Báo giá in 3D trực tuyến', 'Instant 3D File Quoting')}
                  </button>
                </li>
                <li>
                  <button onClick={() => handleNavigate('cart')} className="hover:text-white transition-colors text-left">
                    {t('cartTitle', 'Giỏ hàng của bạn', 'Your Shopping Cart')}
                  </button>
                </li>
                <li>
                  <button onClick={() => handleNavigate('my_orders')} className="hover:text-white transition-colors text-left">
                    {t('myOrdersTracking', 'Theo dõi đơn hàng thời gian thực', 'Real-time Order Tracking')}
                  </button>
                </li>
              </ul>
            </div>

            {/* Col 3: Admin Console */}
            <div className="space-y-2.5 text-xs font-sans">
              <p className="font-bold uppercase tracking-widest text-[#D8E3FB] text-[10px] font-tech">
                {t('footerCreators', 'Quản Trị Hệ Thống', 'Administration')}
              </p>
              <ul className="space-y-2 text-[#8590A6]">
                <li>
                  <button onClick={() => handleNavigate('admin')} className="hover:text-white transition-colors text-left font-bold text-[#57DFFE]">
                    ForgeControl Admin Console
                  </button>
                </li>
                <li>
                  <button onClick={() => handleNavigate('admin')} className="hover:text-white transition-colors text-left">
                    {language === 'vi' ? 'Quản lý sản phẩm & giá' : 'Product & Pricing Management'}
                  </button>
                </li>
                <li>
                  <button onClick={() => handleNavigate('admin')} className="hover:text-white transition-colors text-left">
                    {language === 'vi' ? 'Cập nhật tiến độ 8 bước gia công' : '8-Stage Fabrication Status'}
                  </button>
                </li>
                <li>
                  <button onClick={() => handleNavigate('admin')} className="hover:text-white transition-colors text-left">
                    {language === 'vi' ? 'Cấu hình phí ship & thông báo' : 'Site Content & Announcement'}
                  </button>
                </li>
              </ul>
            </div>

            {/* Col 4: Dynamic Contact from Admin Content */}
            <div className="space-y-2.5 text-xs font-sans">
              <p className="font-bold uppercase tracking-widest text-[#D8E3FB] text-[10px] font-tech">
                {t('footerLocationTitle', 'Trụ Sở & Xưởng Chế Tác', 'Headquarters & Facilities')}
              </p>
              <p className="text-[#8590A6]">{siteContent.hanoiWorkshopAddress}</p>
              <p className="text-[#8590A6]">{siteContent.hcmWorkshopAddress}</p>
              <p className="text-[#8590A6] font-tech">Hotline: {siteContent.hotline} • {siteContent.contactEmail}</p>
            </div>
          </div>

          <div className="pt-8 border-t border-[#1E293B] flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#8590A6] font-sans gap-4">
            <p>{t('footerRights', '© 2026 VCUBE Vietnam Industrial Fabrication. Bảo lưu mọi quyền.', '© 2026 VCUBE Vietnam Industrial Fabrication. All rights reserved.')}</p>
            <div className="flex items-center gap-4">
              <span>{t('footerCadSecurity', 'Bảo mật dữ liệu CAD/STL', 'CAD/STL Data Security')}</span>
              <span>•</span>
              <span>{t('footerIsoCert', 'Chứng nhận ISO 9001:2015', 'ISO 9001:2015 Certified')}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <MainApp />
      </LanguageProvider>
    </AuthProvider>
  );
}

export default App;
