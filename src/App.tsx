import React, { useState, useEffect } from 'react';
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
import { dbService } from './backend/supabase/database';
import { supabase } from './backend/supabase/client';
import { Header } from '@frontend/components/Header';
import { AuthModal } from '@frontend/components/AuthModal';
import { RoleGuard } from '@frontend/components/RoleGuard';
import { ScrollToTop } from '@frontend/components/ScrollToTop';
import { NotFoundView } from '@frontend/components/NotFoundView';
import { HomeView } from '@frontend/views/HomeView';
import { ExploreView } from '@frontend/views/ExploreView';
import { ProductDetailView } from '@frontend/views/ProductDetailView';
import { CartView } from '@frontend/views/CartView';
import { CheckoutView } from '@frontend/views/CheckoutView';
import { OrderSuccessView } from '@frontend/views/OrderSuccessView';
import { OrderTrackingView } from '@frontend/views/OrderTrackingView';
import { MyOrdersView } from '@frontend/views/MyOrdersView';
import { PersonalizeView } from '@frontend/views/PersonalizeView';
import { AssetLibraryView } from '@frontend/views/AssetLibraryView';
import { LoginView } from '@frontend/views/LoginView';
import { RegisterView } from '@frontend/views/RegisterView';
import { ChatSupportModal } from '@frontend/components/ChatSupportModal';
import { InvoiceModal } from '@frontend/components/InvoiceModal';
import { CartDrawer } from '@frontend/components/CartDrawer';
import { PageSkeleton } from '@frontend/components/PageSkeleton';
import { useCartStore } from '@frontend/stores/useCartStore';
import { useUIStore } from '@frontend/stores/useUIStore';

// Heavy modules code-split via React.lazy() for fast initial page load
const Tool3DView = React.lazy(() => import('@frontend/views/Tool3DView'));
const AdminDashboardView = React.lazy(() => import('@frontend/views/AdminDashboardView'));
const DesignerDashboardView = React.lazy(() => import('@frontend/views/DesignerDashboardView'));


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
  const product = products.find((p) => p.id === productId);

  if (!product && products.length === 0) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-3 border-[#00687A] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="font-mono text-xs text-[#64748B]">Đang tải thông số kỹ thuật mô hình 3D...</p>
        </div>
      </div>
    );
  }

  if (!product && products.length > 0) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-2xl border border-[#CBD5E1] text-center max-w-md space-y-4 shadow-sm">
          <span className="material-symbols-outlined text-4xl text-[#64748B]">precision_manufacturing</span>
          <h2 className="font-bold text-lg text-[#091426]">Không tìm thấy bản vẽ CAD này</h2>
          <p className="text-xs text-[#64748B]">Mô hình bạn đang tìm có thể đã được lưu trữ hoặc thay đổi mã định danh.</p>
          <button
            onClick={() => onNavigate('explore')}
            className="px-5 py-2.5 bg-[#00687A] hover:bg-[#005260] text-white font-mono text-xs uppercase font-bold rounded-xl shadow-xs cursor-pointer"
          >
            Quay lại Kho Bản Vẽ
          </button>
        </div>
      </div>
    );
  }

  return (
    <ProductDetailView
      product={product!}
      allProducts={products}
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
  // Zustand State Management for Cart & UI
  const cart = useCartStore((s) => s.cart);
  const appliedDiscount = useCartStore((s) => s.appliedDiscount);
  const addToCartStore = useCartStore((s) => s.addToCart);
  const updateQuantityStore = useCartStore((s) => s.updateQuantity);
  const removeItemStore = useCartStore((s) => s.removeItem);
  const clearCartStore = useCartStore((s) => s.clearCart);
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

  const [orders, setOrders] = useState<Order[]>(MOCK_ORDERS);
  const [assets, setAssets] = useState<DigitalAsset[]>(DIGITAL_ASSETS);
  const [siteContent, setSiteContent] = useState<SiteContentConfig>(() => {
    try {
      const saved = localStorage.getItem('vcube_site_content');
      if (saved) return { ...DEFAULT_SITE_CONTENT, ...JSON.parse(saved) };
    } catch (e) {
      console.warn('Could not load saved site content', e);
    }
    return DEFAULT_SITE_CONTENT;
  });
  
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

  // Synchronize products from Supabase DB on startup + Realtime Channel + Auto Seeding
  useEffect(() => {
    let isMounted = true;

    // 1. Initial Fetch with auto-seed fallback
    dbService.getProducts().then(async (remoteProducts) => {
      if (isMounted) {
        if (remoteProducts && remoteProducts.length > 0) {
          setProducts(remoteProducts);
        } else {
          // If empty, auto-seed mockData into Supabase
          const seeded = await dbService.seedInitialProductsIfEmpty();
          if (seeded) {
            const fresh = await dbService.getProducts();
            if (isMounted && fresh.length > 0) setProducts(fresh);
          }
        }
      }
    }).catch((err) => console.warn('Could not sync remote products:', err));

    // 2. Supabase Realtime Channel for Multi-user Sync
    const channel = supabase
      .channel('public:products')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        (payload) => {
          if (!isMounted) return;
          if (payload.eventType === 'INSERT') {
            const newRecord: any = payload.new;
            setProducts((prev) => {
              if (prev.some((p) => p.id === newRecord.id)) return prev;
              const mapped: Product = {
                id: newRecord.id,
                sku: newRecord.sku,
                name: newRecord.name,
                category: newRecord.category,
                designer: newRecord.designer,
                pricePhysical: Number(newRecord.price_physical || 0),
                priceDigital: Number(newRecord.price_digital || 0),
                images: Array.isArray(newRecord.images) ? newRecord.images : [newRecord.images].filter(Boolean),
                thumbnailUrl: newRecord.thumbnail_url || (Array.isArray(newRecord.images) ? newRecord.images[0] : ''),
                cadFileUrl: newRecord.cad_file_url || '',
                cadFormat: newRecord.cad_format || 'STL',
                description: newRecord.description || '',
                features: Array.isArray(newRecord.features) ? newRecord.features : [],
                specs: newRecord.specs || { dimensions: '80x80x40mm', weight: '60g', resolution: '0.12mm', infillDefault: '35%', technology: 'FDM' },
                supportedMaterials: Array.isArray(newRecord.supported_materials) ? newRecord.supported_materials : ['PLA Tough'],
                colors: Array.isArray(newRecord.colors) ? newRecord.colors : [],
                tags: Array.isArray(newRecord.tags) ? newRecord.tags : [],
                badge: newRecord.badge,
                rating: Number(newRecord.rating || 5.0),
                reviewsCount: Number(newRecord.reviews_count || 0),
                printsCount: Number(newRecord.prints_count || 0),
                printTime: newRecord.print_time || '2h',
                isCustomizable: Boolean(newRecord.is_customizable),
                status: (newRecord.status || 'published').toLowerCase() as any,
                productionReadiness: newRecord.production_readiness || 'ready_to_print'
              };
              return [mapped, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedRecord: any = payload.new;
            setProducts((prev) =>
              prev.map((p) =>
                p.id === updatedRecord.id
                  ? {
                      ...p,
                      name: updatedRecord.name || p.name,
                      category: updatedRecord.category || p.category,
                      pricePhysical: Number(updatedRecord.price_physical ?? p.pricePhysical),
                      priceDigital: Number(updatedRecord.price_digital ?? p.priceDigital),
                      status: (updatedRecord.status || p.status).toLowerCase() as any,
                      badge: updatedRecord.badge !== undefined ? updatedRecord.badge : p.badge,
                      images: Array.isArray(updatedRecord.images) ? updatedRecord.images : p.images,
                      thumbnailUrl: updatedRecord.thumbnail_url || p.thumbnailUrl,
                    }
                  : p
              )
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedRecord: any = payload.old;
            if (deletedRecord?.id) {
              setProducts((prev) => prev.filter((p) => p.id !== deletedRecord.id));
            }
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  // Fetch dynamic system parameters (Pricing Config & Site Content) from Supabase on mount
  useEffect(() => {
    let isMounted = true;
    dbService.getPricingConfig().then((cfg) => {
      if (isMounted && cfg) setPricingConfig(cfg);
    }).catch((err) => console.warn('Could not load remote pricing config:', err));

    dbService.getSiteContent().then((content) => {
      if (isMounted && content) setSiteContent(content);
    }).catch((err) => console.warn('Could not load remote site content:', err));

    dbService.getMaterials().then((remoteMats) => {
      if (isMounted && remoteMats && remoteMats.length > 0) setMaterials(remoteMats);
    }).catch((err) => console.warn('Could not load remote materials:', err));

    dbService.getPrinters().then((remotePrinters) => {
      if (isMounted && remotePrinters && remotePrinters.length > 0) setPrinters(remotePrinters);
    }).catch((err) => console.warn('Could not load remote printers:', err));

    return () => {
      isMounted = false;
    };
  }, []);

  const handleUpdatePricingConfig = async (newConfig: InkiriCostFormulaConfig) => {
    setPricingConfig(newConfig);
    try {
      localStorage.setItem('vcube_pricing_config', JSON.stringify(newConfig));
    } catch (e) {
      console.warn('Could not save pricing config', e);
    }
    const res = await dbService.savePricingConfig(newConfig);
    if (!res.success) {
      console.warn('Could not persist pricing config to Supabase:', res.error);
    }
  };

  const handleUpdateMaterials = (newMaterials: MaterialProfile[]) => {
    setMaterials(newMaterials);
    try {
      localStorage.setItem('vcube_materials', JSON.stringify(newMaterials));
    } catch (e) {
      console.warn('Could not save materials', e);
    }
    // Asynchronously upsert to Supabase
    newMaterials.forEach((m) => {
      dbService.saveMaterial(m).catch((e) => console.warn('Failed to sync material to Supabase:', e));
    });
  };

  const handleUpdatePrinters = (newPrinters: PrinterProfile[]) => {
    setPrinters(newPrinters);
    try {
      localStorage.setItem('vcube_printers', JSON.stringify(newPrinters));
    } catch (e) {
      console.warn('Could not save printers', e);
    }
    // Asynchronously upsert to Supabase
    newPrinters.forEach((p) => {
      dbService.savePrinter(p).catch((e) => console.warn('Failed to sync printer to Supabase:', e));
    });
  };

  const [activeOrder, setActiveOrder] = useState<Order>(MOCK_ORDERS[0]);
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);

  // Sync server cart with guest local cart upon user login
  useEffect(() => {
    if (isLoggedIn && user) {
      // When user logs in, merge guest local cart with user's remote server cart
      mergeGuestCart([]);
    }
  }, [isLoggedIn, user, mergeGuestCart]);

  const showToast = (msg: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    addToast({ message: msg, type });
  };

  const handleOpenAuth = (mode: 'signin' | 'signup' | 'role_select' | 'account' = 'signin') => {
    openAuthModal(mode);
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
          navigate(`/tracking/${activeOrder?.id || 'ORD-2026-8801'}`);
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
      message: language === 'vi' ? 'Đã xóa sản phẩm khỏi giỏ hàng' : 'Removed item from cart',
      type: 'info',
      undoAction: itemToRemove ? () => addToCartStore(itemToRemove) : undefined
    });
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

    clearCartStore();
  };

  // Product Handlers (Synced to Supabase DB & LocalStorage Catalog DB with Rollback)
  const handleAddNewProduct = async (prod: Product) => {
    const previous = [...products];
    // Optimistic UI update
    setProducts((prev) => {
      const updated = [prod, ...prev];
      try { localStorage.setItem('vcube_products', JSON.stringify(updated)); } catch (e) {}
      return updated;
    });

    const res = await dbService.saveProduct(prod);
    if (!res.success) {
      // Rollback on DB error
      console.warn('Rollback adding product due to DB error:', res.error);
      setProducts(previous);
      try { localStorage.setItem('vcube_products', JSON.stringify(previous)); } catch (e) {}
      showToast(language === 'vi' ? 'Không thể lưu vào Supabase. Đã hoàn tác.' : 'Could not save to Supabase. Reverted.');
    } else {
      showToast(language === 'vi' ? 'Đã thêm sản phẩm thành công!' : 'Product added successfully!');
    }
  };

  const handleUpdateProduct = async (updated: Product) => {
    const previous = [...products];
    // Optimistic UI update
    setProducts((prev) => {
      const next = prev.map((p) => (p.id === updated.id ? updated : p));
      try { localStorage.setItem('vcube_products', JSON.stringify(next)); } catch (e) {}
      return next;
    });

    const res = await dbService.saveProduct(updated);
    if (!res.success) {
      // Rollback on DB error
      console.warn('Rollback updating product due to DB error:', res.error);
      setProducts(previous);
      try { localStorage.setItem('vcube_products', JSON.stringify(previous)); } catch (e) {}
      showToast(language === 'vi' ? 'Lỗi cập nhật trên Supabase. Đã hoàn tác.' : 'Supabase update failed. Reverted.');
    } else {
      showToast(language === 'vi' ? 'Đã cập nhật sản phẩm thành công!' : 'Product updated successfully!');
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    const previous = [...products];
    // Optimistic UI update
    setProducts((prev) => {
      const next = prev.filter((p) => p.id !== productId);
      try { localStorage.setItem('vcube_products', JSON.stringify(next)); } catch (e) {}
      return next;
    });

    const res = await dbService.deleteProduct(productId);
    if (!res.success) {
      // Rollback on DB error
      console.warn('Rollback deleting product due to DB error:', res.error);
      setProducts(previous);
      try { localStorage.setItem('vcube_products', JSON.stringify(previous)); } catch (e) {}
      showToast(language === 'vi' ? 'Lỗi xóa trên Supabase. Đã hoàn tác.' : 'Supabase delete failed. Reverted.');
    } else {
      showToast(language === 'vi' ? 'Đã xóa sản phẩm thành công!' : 'Product deleted successfully!');
    }
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

  const handleUpdateSiteContent = async (newContent: SiteContentConfig) => {
    setSiteContent(newContent);
    try {
      localStorage.setItem('vcube_site_content', JSON.stringify(newContent));
    } catch (e) {
      console.warn('Could not save site content to localStorage', e);
    }
    const res = await dbService.saveSiteContent(newContent);
    if (!res.success) {
      console.warn('Could not save site content to Supabase:', res.error);
      showToast('Đã lưu cục bộ nhưng lỗi đồng bộ Supabase.', 'warning');
    } else {
      showToast('Đã lưu và đồng bộ cấu hình giao diện lên Supabase thành công!', 'success');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#091426]">
      {/* Top Header Navbar */}
      <Header
        currentScreen={currentScreen}
        onNavigate={handleNavigate}
        cart={cart}
        siteContent={siteContent}
        onOpenAuth={handleOpenAuth}
        onOpenCartDrawer={() => setIsCartDrawerOpen(true)}
      />

      {/* Main View Routes with React.Suspense Code-Splitting */}
      <main className="flex-1">
        <React.Suspense fallback={<PageSkeleton />}>
          <Routes>
          {/* Marketplace & Home */}
          <Route
            path="/"
            element={
              <HomeView
                products={products}
                materials={materials}
                pricingConfig={pricingConfig}
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
                materials={materials}
                pricingConfig={pricingConfig}
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
                materials={materials}
                pricingConfig={pricingConfig}
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
                pricingConfig={pricingConfig}
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
                pricingConfig={pricingConfig}
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
                pricingConfig={pricingConfig}
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
                activeOrder={activeOrder}
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
                activeOrder={activeOrder}
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
                activeOrder={activeOrder}
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
                activeOrder={activeOrder}
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
        </React.Suspense>
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

      {/* Interactive Toast Notification Queue via useUIStore */}
      <div className="fixed bottom-6 left-6 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full">
        {toastQueue.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto px-4 py-3 border shadow-2xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200 rounded text-white ${
              toast.type === 'error'
                ? 'bg-[#1C0A0A] border-[#EF4444]/40 text-[#FCA5A5]'
                : toast.type === 'warning'
                ? 'bg-[#1C1608] border-[#F59E0B]/40 text-[#FDE68A]'
                : toast.type === 'success'
                ? 'bg-[#091426] border-[#10B981]/40 text-white'
                : 'bg-[#091426] border-[#57DFFE]/30 text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-lg text-[#57DFFE]">
                {toast.type === 'error'
                  ? 'error'
                  : toast.type === 'warning'
                  ? 'warning'
                  : toast.type === 'success'
                  ? 'check_circle'
                  : 'info'}
              </span>
              <span className="text-xs font-sans font-semibold">{toast.message}</span>
            </div>
            <div className="flex items-center gap-2">
              {toast.undoAction && (
                <button
                  onClick={toast.undoAction}
                  className="px-2 py-0.5 bg-white/10 hover:bg-white/20 text-[11px] font-mono rounded text-[#57DFFE] underline cursor-pointer"
                >
                  Hoàn tác
                </button>
              )}
              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-white cursor-pointer"
                aria-label="Đóng thông báo"
              >
                <span className="material-symbols-outlined text-sm">close</span>
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
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onNavigate={handleNavigate}
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
