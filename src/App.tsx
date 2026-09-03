import React, { useState } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
  useParams,
  useSearchParams
} from 'react-router-dom';
import {
  Product,
  CartItem,
  Order,
  DigitalAsset,
  SiteContentConfig,
  MaterialProfile,
  PrinterProfile,
  InkiriCostFormulaConfig,
  AccessoryItem
} from './types';
import {
  PRODUCTS,
  INITIAL_CART_ITEMS,
  MOCK_ORDERS,
  DIGITAL_ASSETS,
  DEFAULT_SITE_CONTENT,
  MATERIALS_CATALOG,
  PRINTER_PROFILES,
  DEFAULT_INKIRI_FORMULA_CONFIG,
  DEFAULT_ACCESSORIES
} from './data/mockData';
import { AuthProvider, useAuth } from '@frontend/context/AuthContext';
import { LanguageProvider, useLanguage } from '@frontend/context/LanguageContext';
import { Header } from '@frontend/components/Header';
import { AuthModal } from '@frontend/components/AuthModal';
import { RoleGuard } from '@frontend/components/RoleGuard';
import { ScrollToTop } from '@frontend/components/ScrollToTop';
import { NotFoundView } from '@frontend/components/NotFoundView';
import { HomeView } from '@frontend/views/HomeView';
import { ExploreView } from '@frontend/views/ExploreView';
import { ProductDetailView } from '@frontend/views/ProductDetailView';
import { Tool3DView } from '@frontend/views/Tool3DView';
import { CartView } from '@frontend/views/CartView';
import { CheckoutView } from '@frontend/views/CheckoutView';
import { OrderSuccessView } from '@frontend/views/OrderSuccessView';
import { OrderTrackingView } from '@frontend/views/OrderTrackingView';
import { MyOrdersView } from '@frontend/views/MyOrdersView';
import { AdminDashboardView } from '@frontend/views/AdminDashboardView';
import { DesignerDashboardView } from '@frontend/views/DesignerDashboardView';
import { PersonalizeView } from '@frontend/views/PersonalizeView';
import { AssetLibraryView } from '@frontend/views/AssetLibraryView';
import { LoginView } from '@frontend/views/LoginView';
import { RegisterView } from '@frontend/views/RegisterView';
import { ChatSupportModal } from '@frontend/components/ChatSupportModal';
import { InvoiceModal } from '@frontend/components/InvoiceModal';

// --- ROUTE WRAPPER COMPONENTS ---

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoggedIn } = useAuth();
  if (!isLoggedIn) {
    return <Navigate to="/auth/login" replace />;
  }
  return <>{children}</>;
};

const ExploreRoute: React.FC<{
  products: Product[];
  materials?: MaterialProfile[];
  pricingConfig?: InkiriCostFormulaConfig;
  onAddToCart: (item: CartItem) => void;
  onNavigate: (screen: string, payload?: any) => void;
  onSelectProduct: (product: Product) => void;
  onShowToast: (msg: string) => void;
}> = ({ products, materials, pricingConfig, onAddToCart, onNavigate, onSelectProduct, onShowToast }) => {
  const [searchParams] = useSearchParams();
  const category = searchParams.get('category') || 'all';
  const search = searchParams.get('search') || '';
  const tag = searchParams.get('tag') || 'all';

  return (
    <ExploreView
      products={products}
      materials={materials}
      pricingConfig={pricingConfig}
      initialCategory={category}
      initialSearch={search}
      initialTag={tag}
      onAddToCart={onAddToCart}
      onNavigate={onNavigate}
      onSelectProduct={onSelectProduct}
      onShowToast={onShowToast}
    />
  );
};

const ProductDetailRoute: React.FC<{
  products: Product[];
  materials?: MaterialProfile[];
  pricingConfig?: InkiriCostFormulaConfig;
  onAddToCart: (item: CartItem) => void;
  onNavigate: (screen: string, payload?: any) => void;
  onShowToast: (msg: string) => void;
}> = ({ products, materials, pricingConfig, onAddToCart, onNavigate, onShowToast }) => {
  const { productId } = useParams<{ productId: string }>();
  const product = products.find((p) => p.id === productId) || products[0];

  return (
    <ProductDetailView
      product={product}
      materials={materials}
      pricingConfig={pricingConfig}
      onAddToCart={onAddToCart}
      onNavigate={onNavigate}
      onShowToast={onShowToast}
    />
  );
};

const PersonalizeRoute: React.FC<{
  products: Product[];
  materials?: MaterialProfile[];
  pricingConfig?: InkiriCostFormulaConfig;
  onAddToCart: (item: CartItem) => void;
  onNavigate: (screen: string, payload?: any) => void;
  onShowToast: (msg: string) => void;
}> = ({ products, materials, pricingConfig, onAddToCart, onNavigate, onShowToast }) => {
  const { productId } = useParams<{ productId?: string }>();
  const product = products.find((p) => p.id === productId) || products[0];

  return (
    <PersonalizeView
      product={product}
      materials={materials}
      pricingConfig={pricingConfig}
      onAddToCart={onAddToCart}
      onNavigate={onNavigate}
      onShowToast={onShowToast}
    />
  );
};

const OrderSuccessRoute: React.FC<{
  orders: Order[];
  activeOrder: Order;
  onNavigate: (screen: string, payload?: any) => void;
  onOpenInvoice: (order: Order) => void;
}> = ({ orders, activeOrder, onNavigate, onOpenInvoice }) => {
  const { orderId } = useParams<{ orderId?: string }>();
  const order = orders.find((o) => o.id === orderId) || activeOrder || orders[0];

  return (
    <OrderSuccessView
      order={order}
      onNavigate={onNavigate}
      onOpenInvoice={onOpenInvoice}
    />
  );
};

const OrderTrackingRoute: React.FC<{
  orders: Order[];
  activeOrder: Order;
  onNavigate: (screen: string, payload?: any) => void;
  onOpenChat: () => void;
  onOpenInvoice: (order: Order) => void;
}> = ({ orders, activeOrder, onNavigate, onOpenChat, onOpenInvoice }) => {
  const { orderId } = useParams<{ orderId?: string }>();
  const order = orders.find((o) => o.id === orderId) || activeOrder || orders[0];

  return (
    <OrderTrackingView
      order={order}
      onNavigate={onNavigate}
      onOpenChat={onOpenChat}
      onOpenInvoice={onOpenInvoice}
    />
  );
};

// --- MAIN APPLICATION COMPONENT WITH ROUTING ---

function MainApp() {
  const { language, t } = useLanguage();
  const { user, role, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Core App State with LocalStorage persistence for Admin & Designer configurable items
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('vcube_products');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Could not load saved products', e);
    }
    return PRODUCTS;
  });
  const [cart, setCart] = useState<CartItem[]>(INITIAL_CART_ITEMS);
  const [orders, setOrders] = useState<Order[]>(MOCK_ORDERS);
  const [assets, setAssets] = useState<DigitalAsset[]>(DIGITAL_ASSETS);
  const [siteContent, setSiteContent] = useState<SiteContentConfig>(DEFAULT_SITE_CONTENT);
  
  const [materials, setMaterials] = useState<MaterialProfile[]>(() => {
    try {
      const saved = localStorage.getItem('vcube_materials');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Could not load saved materials', e);
    }
    return MATERIALS_CATALOG;
  });

  const [printers, setPrinters] = useState<PrinterProfile[]>(() => {
    try {
      const saved = localStorage.getItem('vcube_printers');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Could not load saved printers', e);
    }
    return PRINTER_PROFILES;
  });

  const [accessories, setAccessories] = useState<AccessoryItem[]>(DEFAULT_ACCESSORIES);

  const [pricingConfig, setPricingConfig] = useState<InkiriCostFormulaConfig>(() => {
    try {
      const saved = localStorage.getItem('vcube_pricing_config');
      if (saved) return { ...DEFAULT_INKIRI_FORMULA_CONFIG, ...JSON.parse(saved) };
    } catch (e) {
      console.warn('Could not load saved pricing config', e);
    }
    return DEFAULT_INKIRI_FORMULA_CONFIG;
  });

  const handleUpdatePricingConfig = (newConfig: InkiriCostFormulaConfig) => {
    setPricingConfig(newConfig);
    try {
      localStorage.setItem('vcube_pricing_config', JSON.stringify(newConfig));
    } catch (e) {
      console.warn('Could not save pricing config', e);
    }
  };

  const handleUpdateMaterials = (newMaterials: MaterialProfile[]) => {
    setMaterials(newMaterials);
    try {
      localStorage.setItem('vcube_materials', JSON.stringify(newMaterials));
    } catch (e) {
      console.warn('Could not save materials', e);
    }
  };

  const handleUpdatePrinters = (newPrinters: PrinterProfile[]) => {
    setPrinters(newPrinters);
    try {
      localStorage.setItem('vcube_printers', JSON.stringify(newPrinters));
    } catch (e) {
      console.warn('Could not save printers', e);
    }
  };

  const [activeOrder, setActiveOrder] = useState<Order>(MOCK_ORDERS[0]);
  const [appliedDiscount, setAppliedDiscount] = useState<number>(0);

  // Modals & Notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup' | 'role_select' | 'account'>('signin');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handleOpenAuth = (mode: 'signin' | 'signup' | 'role_select' | 'account' = 'signin') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

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

    // If user is not logged in, clicking buttons or navigating protected views triggers login
    if (!isLoggedIn && screen !== 'home') {
      navigate('/auth/login');
      return;
    }

    // Only admin can access admin console
    if (screen === 'admin' && role !== 'admin') {
      showToast(language === 'vi' ? 'Chỉ Quản Trị Viên (Admin) mới có quyền truy cập trang quản trị' : 'Admin role required to access Admin Console');
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
      case 'quote':
        navigate('/quote');
        break;
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
      case 'tracking':
        if (payload?.order) {
          const latestOrder = orders.find((o) => o.id === payload.order.id) || payload.order;
          setActiveOrder(latestOrder);
          navigate(`/tracking/${latestOrder.id}`);
        } else {
          navigate(`/tracking/${activeOrder?.id || 'ORD-2026-8801'}`);
        }
        break;
      case 'my_orders':
      case 'orders':
        navigate('/orders');
        break;
      case 'asset_library':
      case 'assets':
        navigate('/assets');
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

    // Add digital files to user's Digital Asset Library
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

    setCart([]);
  };

  // Product Handlers (Synced to LocalStorage Catalog DB)
  const handleAddNewProduct = (prod: Product) => {
    setProducts((prev) => {
      const updated = [prod, ...prev];
      try {
        localStorage.setItem('vcube_products', JSON.stringify(updated));
      } catch (e) {
        console.warn('Could not save products to storage', e);
      }
      return updated;
    });
  };

  const handleUpdateProduct = (updated: Product) => {
    setProducts((prev) => {
      const next = prev.map((p) => (p.id === updated.id ? updated : p));
      try {
        localStorage.setItem('vcube_products', JSON.stringify(next));
      } catch (e) {
        console.warn('Could not save products to storage', e);
      }
      return next;
    });
  };

  const handleDeleteProduct = (productId: string) => {
    setProducts((prev) => {
      const next = prev.filter((p) => p.id !== productId);
      try {
        localStorage.setItem('vcube_products', JSON.stringify(next));
      } catch (e) {
        console.warn('Could not save products to storage', e);
      }
      return next;
    });
  };

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
          if (activeOrder?.id === orderId) {
            setActiveOrder(updated);
          }
          return updated;
        }
        return o;
      })
    );
  };

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

      {/* Main View Routes */}
      <main className="flex-1">
        <Routes>
          {/* Marketplace & Home */}
          <Route
            path="/"
            element={
              <HomeView
                products={products}
                materials={materials}
                pricingConfig={pricingConfig}
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
              <ProtectedRoute>
                <ExploreRoute
                  products={products}
                  materials={materials}
                  pricingConfig={pricingConfig}
                  onAddToCart={handleAddToCart}
                  onNavigate={handleNavigate}
                  onSelectProduct={(p) => handleNavigate('product_detail', { product: p })}
                  onShowToast={showToast}
                />
              </ProtectedRoute>
            }
          />

          {/* Product Details & Personalization */}
          <Route
            path="/products/:productId"
            element={
              <ProtectedRoute>
                <ProductDetailRoute
                  products={products}
                  materials={materials}
                  pricingConfig={pricingConfig}
                  onAddToCart={handleAddToCart}
                  onNavigate={handleNavigate}
                  onShowToast={showToast}
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/personalize"
            element={
              <ProtectedRoute>
                <PersonalizeRoute
                  products={products}
                  materials={materials}
                  pricingConfig={pricingConfig}
                  onAddToCart={handleAddToCart}
                  onNavigate={handleNavigate}
                  onShowToast={showToast}
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/personalize/:productId"
            element={
              <ProtectedRoute>
                <PersonalizeRoute
                  products={products}
                  materials={materials}
                  pricingConfig={pricingConfig}
                  onAddToCart={handleAddToCart}
                  onNavigate={handleNavigate}
                  onShowToast={showToast}
                />
              </ProtectedRoute>
            }
          />

          {/* 3D CAD & Instant Quoting */}
          <Route
            path="/quote"
            element={
              <ProtectedRoute>
                <Tool3DView
                  materials={materials}
                  printers={printers}
                  pricingConfig={pricingConfig}
                  onAddToCart={handleAddToCart}
                  onNavigate={handleNavigate}
                  onShowToast={showToast}
                />
              </ProtectedRoute>
            }
          />
          <Route path="/tool-3d" element={<Navigate to="/quote" replace />} />

          {/* Cart & Checkout */}
          <Route
            path="/cart"
            element={
              <ProtectedRoute>
                <CartView
                  cart={cart}
                  onUpdateQuantity={handleUpdateQuantity}
                  onRemoveItem={handleRemoveItem}
                  onNavigate={handleNavigate}
                  onShowToast={showToast}
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/checkout"
            element={
              <ProtectedRoute>
                <CheckoutView
                  cart={cart}
                  appliedDiscount={appliedDiscount}
                  siteContent={siteContent}
                  onOrderCompleted={handleOrderCompleted}
                  onNavigate={handleNavigate}
                />
              </ProtectedRoute>
            }
          />

          {/* Order Tracking & Confirmation */}
          <Route
            path="/order-success"
            element={
              <ProtectedRoute>
                <OrderSuccessRoute
                  orders={orders}
                  activeOrder={activeOrder}
                  onNavigate={handleNavigate}
                  onOpenInvoice={(ord) => setInvoiceOrder(ord)}
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/order-success/:orderId"
            element={
              <ProtectedRoute>
                <OrderSuccessRoute
                  orders={orders}
                  activeOrder={activeOrder}
                  onNavigate={handleNavigate}
                  onOpenInvoice={(ord) => setInvoiceOrder(ord)}
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tracking"
            element={
              <ProtectedRoute>
                <OrderTrackingRoute
                  orders={orders}
                  activeOrder={activeOrder}
                  onNavigate={handleNavigate}
                  onOpenChat={() => setIsChatOpen(true)}
                  onOpenInvoice={(ord) => setInvoiceOrder(ord)}
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tracking/:orderId"
            element={
              <ProtectedRoute>
                <OrderTrackingRoute
                  orders={orders}
                  activeOrder={activeOrder}
                  onNavigate={handleNavigate}
                  onOpenChat={() => setIsChatOpen(true)}
                  onOpenInvoice={(ord) => setInvoiceOrder(ord)}
                />
              </ProtectedRoute>
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
                featureName={language === 'vi' ? 'Studio Tác Giả & Quản Lý Ấn Phẩm' : '3D Designer Studio & Publications'}
                onNavigate={handleNavigate}
                onOpenAuthModal={handleOpenAuth}
              >
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
              </RoleGuard>
            }
          />
          <Route
            path="/designer/:tab"
            element={
              <RoleGuard
                allowedRoles={['designer', 'admin']}
                featureName={language === 'vi' ? 'Studio Tác Giả & Quản Lý Ấn Phẩm' : '3D Designer Studio & Publications'}
                onNavigate={handleNavigate}
                onOpenAuthModal={handleOpenAuth}
              >
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
                featureName={language === 'vi' ? 'ForgeControl Quản Trị Hệ Thống' : 'ForgeControl Administration Console'}
                onNavigate={handleNavigate}
                onOpenAuthModal={handleOpenAuth}
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
                  onUpdateAccessories={setAccessories}
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
                featureName={language === 'vi' ? 'ForgeControl Quản Trị Hệ Thống' : 'ForgeControl Administration Console'}
                onNavigate={handleNavigate}
                onOpenAuthModal={handleOpenAuth}
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
                  onUpdateAccessories={setAccessories}
                  onUpdatePricingConfig={handleUpdatePricingConfig}
                  onNavigate={handleNavigate}
                  onShowToast={showToast}
                />
              </RoleGuard>
            }
          />

          {/* Authentication Pages */}
          <Route path="/auth/login" element={<LoginView onNavigate={handleNavigate} />} />
          <Route path="/login" element={<Navigate to="/auth/login" replace />} />
          <Route path="/auth/register" element={<RegisterView onNavigate={handleNavigate} />} />
          <Route path="/register" element={<Navigate to="/auth/register" replace />} />

          {/* 404 Not Found Fallback */}
          <Route path="*" element={<NotFoundView />} />
        </Routes>
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
                  <button onClick={() => handleNavigate('explore')} className="hover:text-white transition-colors text-left cursor-pointer">
                    {t('footerMarketplace', 'Marketplace linh kiện 3D', '3D Parts Marketplace')}
                  </button>
                </li>
                <li>
                  <button onClick={() => handleNavigate('quote')} className="hover:text-white transition-colors text-left cursor-pointer">
                    {t('footerInstantQuote', 'Báo giá in 3D trực tuyến', 'Instant 3D File Quoting')}
                  </button>
                </li>
                <li>
                  <button onClick={() => handleNavigate('cart')} className="hover:text-white transition-colors text-left cursor-pointer">
                    {t('cartTitle', 'Giỏ hàng của bạn', 'Your Shopping Cart')}
                  </button>
                </li>
                <li>
                  <button onClick={() => handleNavigate('orders')} className="hover:text-white transition-colors text-left cursor-pointer">
                    {t('myOrdersTracking', 'Theo dõi đơn hàng thời gian thực', 'Real-time Order Tracking')}
                  </button>
                </li>
              </ul>
            </div>

            {/* Col 3: Admin Console - Only visible for admin users */}
            {role === 'admin' && (
              <div className="space-y-2.5 text-xs font-sans">
                <p className="font-bold uppercase tracking-widest text-[#D8E3FB] text-[10px] font-tech">
                  {t('footerCreators', 'Quản Trị Hệ Thống', 'Administration')}
                </p>
                <ul className="space-y-2 text-[#8590A6]">
                  <li>
                    <button onClick={() => handleNavigate('admin')} className="hover:text-white transition-colors text-left font-bold text-[#57DFFE] cursor-pointer">
                      ForgeControl Admin Console
                    </button>
                  </li>
                  <li>
                    <button onClick={() => handleNavigate('admin', { section: 'products' })} className="hover:text-white transition-colors text-left cursor-pointer">
                      {language === 'vi' ? 'Quản lý sản phẩm & giá' : 'Product & Pricing Management'}
                    </button>
                  </li>
                  <li>
                    <button onClick={() => handleNavigate('admin', { section: 'queue' })} className="hover:text-white transition-colors text-left cursor-pointer">
                      {language === 'vi' ? 'Cập nhật tiến độ 8 bước gia công' : '8-Stage Fabrication Status'}
                    </button>
                  </li>
                  <li>
                    <button onClick={() => handleNavigate('admin', { section: 'storefront' })} className="hover:text-white transition-colors text-left cursor-pointer">
                      {language === 'vi' ? 'Cấu hình phí ship & thông báo' : 'Site Content & Announcement'}
                    </button>
                  </li>
                </ul>
              </div>
            )}

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
