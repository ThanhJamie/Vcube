import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  AccessoryItem,
  WorkshopProfile
} from './types';
import {
  PRODUCTS,
  INITIAL_CART_ITEMS,
  DIGITAL_ASSETS,
  DEFAULT_SITE_CONTENT,
  MATERIALS_CATALOG,
  PRINTER_PROFILES,
} from './data/mockData';
import { AuthProvider, useAuth } from '@frontend/context/AuthContext';
import { LanguageProvider, useLanguage } from '@frontend/context/LanguageContext';
import { dbService } from './backend/supabase/database';
import { rowToProduct } from './backend/supabase/mappers';
import { settingsAccessors, subscribeSettings } from './backend/services/settingsService';
import { WorkshopService } from '@backend/services/workshopService';
import { supabase } from './backend/supabase/client';
import { Header } from '@frontend/components/Header';
import { AuthModal } from '@frontend/components/AuthModal';
import { RoleGuard } from '@frontend/components/RoleGuard';
import { ScrollToTop } from '@frontend/components/ScrollToTop';
import { ThemeProvider } from '@frontend/theme/ThemeProvider';
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
import { EMPTY_VALUE } from '@frontend/lib/format';
import { PageSkeleton } from '@frontend/components/PageSkeleton';
import { RouteErrorBoundary } from '@frontend/components/RouteErrorBoundary';
import { useCartStore } from '@frontend/stores/useCartStore';
import { useUIStore } from '@frontend/stores/useUIStore';
import { AppShell, Button, Icon, SideNav, Topbar } from '@frontend/ui';
import {
  Boxes,
  ClipboardList,
  History,
  Layers,
  LayoutDashboard,
  Menu,
  MessagesSquare,
  Package,
  Printer,
  Settings,
  Store,
  UploadCloud,
  Wallet,
} from 'lucide-react';

// Heavy modules code-split via React.lazy() for fast initial page load
const Tool3DView = React.lazy(() => import('@frontend/views/Tool3DView'));
const AdminDashboardView = React.lazy(() => import('@frontend/views/AdminDashboardView'));
const DesignerDashboardView = React.lazy(() => import('@frontend/views/DesignerDashboardView'));
// W1a — cổng xưởng in (/lab). Hai module này trước Đợt 10 HOÀN TOÀN mồ côi
// (xem docs/plans/19-product-audit.md §1.2), code-split như 3 view nặng phía trên.
const WorkshopSettingsView = React.lazy(() => import('@frontend/views/WorkshopSettingsView'));
const WorkshopOnboardingWizard = React.lazy(() => import('@frontend/components/onboarding/WorkshopOnboardingWizard'));


// --- ROUTE WRAPPER COMPONENTS ---

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoggedIn, loading } = useAuth();
  // Chờ khôi phục phiên trước khi redirect: nếu không, deep-link (F5 / tab mới) tới
  // /orders, /assets… sẽ bị đẩy về /auth/login dù phiên Supabase còn hợp lệ.
  if (loading) return null;
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
      <div className="min-h-dvh bg-canvas flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="font-mono text-xs text-fg-subtle">Đang tải thông số kỹ thuật mô hình 3D...</p>
        </div>
      </div>
    );
  }

  if (!product && products.length > 0) {
    return (
      <div className="min-h-dvh bg-canvas flex items-center justify-center p-6">
        <div className="bg-surface p-8 rounded-lg text-center max-w-md space-y-4 shadow-e1">
          <Icon name="precision_manufacturing" size={36} className="text-fg-subtle" />
          <h2 className="font-bold text-lg text-fg">Không tìm thấy bản vẽ CAD này</h2>
          <p className="text-xs text-fg-subtle">Mô hình bạn đang tìm có thể đã được lưu trữ hoặc thay đổi mã định danh.</p>
          <button
            onClick={() => onNavigate('explore')}
            className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-primary-fg font-mono text-xs uppercase font-bold rounded-full shadow-e1 cursor-pointer"
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
  // A11 GUARD (CI-04): catalog fixture đã bị rỗng hoá ⇒ `products[0]` là `undefined` và
  // `PersonalizeView` (prop `product` bắt buộc) crash khi truy cập `product.images[0]`.
  // Không cá nhân hoá một sản phẩm không tồn tại: id không khớp HOẶC catalog rỗng ⇒ trạng thái
  // "không tìm thấy". `/personalize` không kèm id vẫn lấy sản phẩm đầu khi catalog có dữ liệu thật.
  const product = productId ? products.find((p) => p.id === productId) : products[0];

  if (!product) {
    return <NotFoundView />;
  }

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

/**
 * P0 (OT-01): phân giải đơn theo `:orderId` một cách NGHIÊM NGẶT.
 *
 * Trước đây: `orders.find(...) || activeOrder || orders[0]` — nghĩa là
 * `/tracking/<id bất kỳ>` hoặc `/order-success/<id bất kỳ>` sẽ render đại đơn
 * đầu tiên trong danh sách, tức là đơn của người khác.
 *
 * Hiện tại: khớp thì trả đơn đó, không khớp thì trả `null` để view render trạng
 * thái "không tìm thấy". KHÔNG có đường fallback nào khác.
 */
function resolveOrderById(orders: Order[], orderId?: string): Order | null {
  if (!orderId) return null;
  return orders.find((o) => o.id === orderId) ?? null;
}

const OrderSuccessRoute: React.FC<{
  orders: Order[];
  onNavigate: (screen: string, payload?: any) => void;
  onOpenInvoice: (order: Order) => void;
}> = ({ orders, onNavigate, onOpenInvoice }) => {
  const { orderId } = useParams<{ orderId?: string }>();
  const order = resolveOrderById(orders, orderId);

  if (!order) {
    return <OrderNotFoundView onNavigate={onNavigate} context="order-success" />;
  }

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
  onNavigate: (screen: string, payload?: any) => void;
  onOpenChat: () => void;
  onOpenInvoice: (order: Order) => void;
}> = ({ orders, onNavigate, onOpenChat, onOpenInvoice }) => {
  const { orderId } = useParams<{ orderId?: string }>();
  const order = resolveOrderById(orders, orderId);

  return (
    <OrderTrackingView
      order={order ?? undefined}
      notFound={!order && Boolean(orderId)}
      onNavigate={onNavigate}
      onOpenChat={onOpenChat}
      onOpenInvoice={onOpenInvoice}
    />
  );
};

/** Trạng thái "không tìm thấy đơn" dùng chung cho /order-success/:id. */
const OrderNotFoundView: React.FC<{
  onNavigate: (screen: string, payload?: any) => void;
  context: 'order-success' | 'tracking';
}> = ({ onNavigate, context }) => (
  <div className="min-h-dvh bg-canvas flex items-center justify-center p-6">
    <div className="bg-surface p-8 rounded-lg text-center max-w-md space-y-4 shadow-e1">
      <Icon name="receipt_long" size={36} className="text-fg-subtle" />
      <h2 className="font-bold text-lg text-fg">Không tìm thấy đơn hàng</h2>
      <p className="text-xs text-fg-subtle leading-relaxed">
        {context === 'order-success'
          ? 'Liên kết này không ứng với đơn hàng nào trong phiên làm việc hiện tại. Đơn của bạn nằm trong mục Đơn hàng, hoặc tra cứu bằng mã đơn kèm token.'
          : 'Chúng tôi không có đơn hàng nào khớp với mã bạn mở. Vui lòng tra cứu lại bằng mã đơn kèm token.'}
      </p>
      <div className="flex flex-col sm:flex-row justify-center gap-2 pt-1">
        <button
          onClick={() => onNavigate('tracking')}
          className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-primary-fg font-mono text-xs uppercase font-bold rounded-full shadow-e1 cursor-pointer"
        >
          Tra cứu đơn hàng
        </button>
        <button
          onClick={() => onNavigate('my_orders')}
          className="px-5 py-2.5 border border-line-control hover:bg-canvas text-fg font-mono text-xs uppercase font-bold rounded-full cursor-pointer"
        >
          Đơn hàng của tôi
        </button>
      </div>
    </div>
  </div>
);

/* --------------------------------------------------------------------------
   Chrome (shell) cho khu ĐÃ ĐĂNG NHẬP: `/lab` và `/designer`.

   Vì sao đặt ở đây mà không nằm trong từng view: mỗi route chỉ được có ĐÚNG MỘT
   tầng chrome. `LabRoute` có 3 nhánh (đang tải · wizard onboarding · bảng điều
   khiển) và cả 3 đều phải nằm trong cùng một `AppShell` — nếu để view tự bọc thì
   nhánh wizard sẽ mất chrome và thành ngõ cụt (không còn Header storefront vì
   `MainApp` đã ẩn Header cho `/lab`).

   Dùng đúng primitive của Đợt 11A: `AppShell` + `SideNav` (240px/64px) + `Topbar`
   (56px), nội dung `max-w-[1400px]`, drawer mobile bằng `Sheet side="left"`, có
   skip-link. Không tự dựng lại chrome mới.

   ⚠️ `id` của mục nav PHẢI khớp tab id trong view tương ứng:
      - `/lab`      -> `TabId` của `views/WorkshopSettingsView.tsx`
      - `/designer` -> `activeTab` của `views/DesignerDashboardView.tsx`
   -------------------------------------------------------------------------- */

type DashboardNavItem = { id: string; label: string; icon: React.ElementType };
type DashboardNavGroup = { label: string; items: DashboardNavItem[] };

const LAB_NAV: DashboardNavGroup[] = [
  {
    label: 'Vận hành',
    items: [
      { id: 'queue', label: 'Hàng đợi việc', icon: ClipboardList },
      { id: 'machines', label: 'Máy in', icon: Printer },
      { id: 'materials', label: 'Vật liệu & kho', icon: Layers },
      { id: 'accessories', label: 'Phụ kiện', icon: Package },
    ],
  },
  {
    label: 'Quản trị',
    items: [
      { id: 'audit_trail', label: 'Sổ kho', icon: History },
      { id: 'preferences', label: 'Cấu hình xưởng', icon: Settings },
    ],
  },
];

const DESIGNER_NAV: DashboardNavGroup[] = [
  {
    label: 'Ấn phẩm',
    items: [
      { id: 'overview', label: 'Tổng quan & doanh thu', icon: LayoutDashboard },
      { id: 'models', label: 'Quản lý ấn phẩm', icon: Boxes },
      { id: 'wizard', label: 'Đăng tải & cấu hình', icon: UploadCloud },
    ],
  },
  {
    label: 'Kinh doanh',
    items: [
      { id: 'requests', label: 'Yêu cầu CAD & chat', icon: MessagesSquare },
      { id: 'payouts', label: 'Quyết toán tiền mặt', icon: Wallet },
    ],
  },
];

const DashboardShell: React.FC<{
  basePath: '/lab' | '/designer';
  activeId: string;
  groups: DashboardNavGroup[];
  brandTitle: string;
  brandHint: string;
  navLabel: string;
  children: React.ReactNode;
}> = ({ basePath, activeId, groups, brandTitle, brandHint, navLabel, children }) => {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeLabel =
    groups.flatMap((group) => group.items).find((item) => item.id === activeId)?.label ?? '';
  const who = (profile?.displayName || user?.email || '?').trim();
  const initials = who.charAt(0).toUpperCase();

  return (
    <AppShell
      collapsed={collapsed}
      mobileOpen={mobileOpen}
      onMobileOpenChange={setMobileOpen}
      navLabel={navLabel}
      sidebar={
        <SideNav
          label={navLabel}
          collapsed={collapsed}
          onCollapsedChange={setCollapsed}
          activeId={activeId}
          onSelect={(id) => navigate(`${basePath}/${id}`)}
          header={
            <span className="flex min-w-0 items-center gap-2">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-fg">
                V
              </span>
              {collapsed ? null : (
                <span className="flex min-w-0 flex-col leading-tight">
                  <span className="truncate text-sm font-semibold tracking-tight text-fg">
                    {brandTitle}
                  </span>
                  <span className="truncate text-xs text-fg-subtle">{brandHint}</span>
                </span>
              )}
            </span>
          }
          groups={groups.map((group) => ({
            id: group.label,
            label: group.label,
            items: group.items.map((item) => ({
              id: item.id,
              label: item.label,
              icon: <item.icon className="size-4.5" aria-hidden="true" />,
            })),
          }))}
        />
      }
      topbar={({ openNav }) => (
        <Topbar
          leading={
            <Button
              iconOnly
              variant="ghost"
              size="sm"
              aria-label="Mở điều hướng"
              onClick={openNav}
              className="lg:hidden"
            >
              <Menu aria-hidden="true" className="size-4" />
            </Button>
          }
          breadcrumb={
            <span className="truncate text-xs text-fg-muted">
              {brandTitle}
              {activeLabel ? ` / ${activeLabel}` : ''}
            </span>
          }
          actions={
            <Button
              variant="secondary"
              size="sm"
              leadingIcon={<Store aria-hidden="true" className="size-4" />}
              onClick={() => navigate('/')}
            >
              Về cửa hàng
            </Button>
          }
          avatar={
            <span
              aria-hidden="true"
              title={who}
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-muted text-xs font-medium text-fg-muted"
            >
              {initials}
            </span>
          }
        />
      )}
    >
      {children}
    </AppShell>
  );
};

/** Shell của `/lab` — `activeId` đọc từ URL nên `/lab/:tab` deep-link được. */
const LabDashboardShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { tab } = useParams();
  const known = LAB_NAV.some((group) => group.items.some((item) => item.id === tab));
  return (
    <DashboardShell
      basePath="/lab"
      activeId={known ? String(tab) : 'queue'}
      groups={LAB_NAV}
      brandTitle="VCUBE Lab"
      brandHint="Xưởng in (MES)"
      navLabel="Điều hướng xưởng in"
    >
      {children}
    </DashboardShell>
  );
};

/** Shell của `/designer` — `activeId` đọc từ URL nên `/designer/:tab` deep-link được. */
const DesignerDashboardShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { tab } = useParams();
  const known = DESIGNER_NAV.some((group) => group.items.some((item) => item.id === tab));
  return (
    <DashboardShell
      basePath="/designer"
      activeId={known ? String(tab) : 'overview'}
      groups={DESIGNER_NAV}
      brandTitle="Designer Studio"
      brandHint="Tác giả & bản quyền"
      navLabel="Điều hướng studio tác giả"
    >
      {children}
    </DashboardShell>
  );
};

/**
 * W1a — cổng xưởng in `/lab`.
 *
 * Quyết định hiển thị dựa trên hàng `workshop_profiles` CỦA CHÍNH người đăng nhập
 * (khớp `user_id`), đọc qua `WorkshopService` — không truy vấn DB inline trong component:
 *   - chưa có hàng, hoặc `verified_status='Pending'` ⇒ `WorkshopOnboardingWizard`;
 *   - đã có hàng (đã duyệt) ⇒ bảng điều khiển xưởng `WorkshopSettingsView`.
 * Trước W1a, `/lab` không tồn tại trong router nên cả hai module trên không có người gọi.
 */
const LabRoute: React.FC<{
  onNavigate: (screen: string, payload?: any) => void;
  onShowToast: (msg: string) => void;
}> = ({ onNavigate, onShowToast }) => {
  const { user } = useAuth();
  const [gate, setGate] = useState<'loading' | 'onboarding' | 'ready'>('loading');
  const [profile, setProfile] = useState<WorkshopProfile | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!user?.id) {
      // RoleGuard đã chặn khách; tới đây mà không có uid thì không thể xác định hồ sơ.
      setGate('loading');
      return;
    }
    setGate('loading');
    WorkshopService.getWorkshopProfileByUserId(user.id)
      .then((found) => {
        if (cancelled) return;
        setProfile(found);
        setGate(!found || found.verifiedStatus === 'Pending' ? 'onboarding' : 'ready');
      })
      .catch((err) => {
        console.warn('Could not resolve workshop profile for /lab:', err);
        if (cancelled) return;
        setProfile(null);
        setGate('onboarding');
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (gate === 'loading') {
    return (
      <LabDashboardShell>
        <PageSkeleton />
      </LabDashboardShell>
    );
  }

  if (gate === 'onboarding') {
    return (
      <LabDashboardShell>
        <WorkshopOnboardingWizard
          initialData={profile ?? undefined}
          onNavigate={onNavigate}
          onShowToast={onShowToast}
          // Hồ sơ đã gửi nhưng còn 'Pending': wizard vẫn là cổng vào (theo brief Đợt 10
          // §W1a), nhưng KHÔNG được biến thành ngõ cụt — xưởng phải mở được bảng điều khiển.
          onSkipToDashboard={() => setGate('ready')}
          onComplete={() => setGate('ready')}
        />
      </LabDashboardShell>
    );
  }

  return (
    <LabDashboardShell>
      <WorkshopSettingsView onNavigate={onNavigate} onShowToast={onShowToast} />
    </LabDashboardShell>
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

  // Đơn hàng KHÔNG được seed từ fixture: chỉ chứa đơn thật do người dùng tạo
  // trong phiên, hoặc đơn đọc từ Supabase (xem effect bên dưới).
  const [orders, setOrders] = useState<Order[]>([]);
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

  // Đợt T: danh mục phụ kiện do DB quyết định — khởi tạo rỗng.
  // Trước đây state gán fixture rỗng trong mockData nhưng
  // KHÔNG có chỗ nào nạp từ bảng `accessories`, nên trang quản trị luôn trống.
  const [accessories, setAccessories] = useState<AccessoryItem[]>([]);

  /**
   * `null` = CHƯA có cấu hình công thức giá thật.
   *
   * Trước đây state này khởi tạo bằng `DEFAULT_INKIRI_FORMULA_CONFIG` (bộ số của công cụ
   * Inkiri) và còn merge nó với bản lưu localStorage. Hệ quả: views nhận một bộ số KHÔNG ai
   * cấu hình nên HomeView cộng ra 15,5% phụ phí (8 + 2,5 + 5 của Inkiri) rồi hiển thị cho
   * khách, trong khi engine đọc `pricing_global_settings.marketplace_fee_percent` ⇒ số hiển
   * thị và số tính có thể KHÁC NHAU. Đó là lỗi TIỀN.
   *
   * Bỏ hẳn bộ số mẫu ở thượng nguồn: thiếu cấu hình ⇒ `null` ⇒ views hiện `—`.
   */
  const [pricingConfig, setPricingConfig] = useState<InkiriCostFormulaConfig | null>(null);

  /**
   * Phí nền tảng — MỘT nguồn duy nhất, đúng nguồn engine đọc
   * (`pricingEngine.ts:426-428`: `pricing_global_settings.marketplace_fee_percent`).
   * `null` = chưa cấu hình; KHÔNG rơi về 8.
   */
  const [marketplaceFeePercent, setMarketplaceFeePercent] = useState<number | null>(
    () => settingsAccessors.pricingGlobal()?.marketplaceFeePercent ?? null
  );

  /** Đọc lại cache settings (đồng bộ, không chạm DB) và chỉ set khi giá trị đổi. */
  const setMarketplaceFeeFromCache = () => {
    const next = settingsAccessors.pricingGlobal()?.marketplaceFeePercent ?? null;
    setMarketplaceFeePercent((prev) => (prev === next ? prev : next));
  };

  // Cache settings được nạp ở `main.tsx` (không `await`) và cập nhật qua realtime ⇒ đăng ký
  // nhận thay đổi để số hiển thị bám đúng nguồn của engine, không mở truy vấn mới.
  //
  // ⚠️ LỊCH SỆ: `bootstrapSettings()` từng KHÔNG gọi `notify()` nên subscription chỉ bắn một lần với
  // cache rỗng. Nay service đã báo cho subscriber khi nạp xong (W2-I); lời gọi
  // `setMarketplaceFeeFromCache()` ngay tại đây được giữ nguyên để render đầu tiên đọc cache
  // đồng bộ (không đợi effect), không đổi hành vi.
  useEffect(() => {
    setMarketplaceFeeFromCache();
    return subscribeSettings(setMarketplaceFeeFromCache);
  }, [pricingConfig]);

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
              // Dùng CHÍNH mapper của tầng dữ liệu (cùng hàm mà `dbService.getProducts()` dùng ở
              // trên). Bản map viết tay trước đây đoán hộ 4 dữ kiện cho hàng CHƯA khai: `cad_format
              // || 'STL'`, `print_time || '2h'`, `supported_materials || ['PLA Tough']`,
              // `production_readiness || 'ready_to_print'` — khách nhìn một định dạng/thời gian in/độ
              // sẵn sàng sản xuất chưa từng được ai khai (docs/design/data-honesty.md).
              return [rowToProduct(newRecord), ...prev];
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

    // Đợt T: nạp danh mục phụ kiện từ bảng `accessories`.
    // Khác materials/printers: bảng RỖNG là thông tin thật ⇒ gán luôn `[]`
    // (để UI hiện trạng thái trống), KHÔNG giữ fixture và không bịa danh mục.
    dbService.getAccessories().then((remoteAccessories) => {
      if (isMounted && Array.isArray(remoteAccessories)) setAccessories(remoteAccessories);
    }).catch((err) => console.warn('Could not load remote accessories:', err));

    return () => {
      isMounted = false;
    };
  }, []);

  /**
   * FAB "Trợ lý tự động" (lớp phủ `fixed`) tự ẩn khi cuộn XUỐNG, hiện lại khi cuộn LÊN.
   *
   * Vì sao: R3 đo trên /explore (1440×900, bước 50px, 22 vị trí) — FAB đè nút "Tải File
   * CAD"/"Lưu bản vẽ" của thẻ sản phẩm ở 5 vị trí giữa trang; dải đệm `data-fab-spacer`
   * chỉ cứu được ĐÁY trang.
   *
   * Chống giật (thay logic cũ chạy `querySelectorAll` toàn trang + `getComputedStyle` trên
   * MỖI scroll event):
   *  - Scroll handler được throttle bằng `requestAnimationFrame`; chỉ đọc `scrollY` để quyết
   *    định hướng ẩn/hiện — KHÔNG đo DOM.
   *  - Va chạm với phần tử tương tác CHỈ được đo khi người dùng đã ngừng cuộn 600ms (hoặc vừa
   *    đổi route/modal), bằng 5 hit-test `elementsFromPoint` (4 góc + tâm) thay vì quét mọi
   *    control ⇒ không còn forced reflow.
   *  - FAB tự hiện lại khi đổi route hoặc đóng/mở modal (trước đây bị kẹt ẩn do state không
   *    được reset).
   */
  useEffect(() => {
    const HIDE_STEP_PX = 8;
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

    let lastY = window.scrollY;
    let rafId: number | null = null;
    let idleTimer: number | undefined;
    let settleTimer: number | undefined;
    let ticking = false;
    let pendingY = lastY;

    // Va chạm CHỈ được đo khi người dùng đã ngừng cuộn (600ms) hoặc vừa đổi route/modal.
    const evaluateOverlap = () => setIsFabHidden(!canShow());

    const onScroll = () => {
      pendingY = window.scrollY;
      if (ticking) return;
      ticking = true;
      rafId = window.requestAnimationFrame(() => {
        ticking = false;
        const delta = pendingY - lastY;
        if (Math.abs(delta) >= HIDE_STEP_PX) {
          lastY = pendingY;
          // Cuộn xuống ⇒ ẩn; cuộn lên ⇒ hiện ngay (không chờ đo va chạm).
          setIsFabHidden(delta > 0);
        }
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

  /**
   * Cấu hình đưa xuống views. KHÔNG bơm bộ số mặc định nào; chỉ bù ĐÚNG MỘT ô bằng giá trị
   * thật của nguồn phí nền tảng (nếu đã cấu hình) để số hiển thị = số engine tính.
   *
   * Vì sao phải bù: các view storefront vẫn tổng hợp phụ phí từ
   * `platformCommissionPercent + paymentGatewayFeePercent + designerRoyaltyPercent`, trong
   * khi ô `platformCommissionPercent` đã bị engine NGỪNG đọc và /admin cũng không còn ghi
   * (ô disabled "đã ngừng dùng") ⇒ trong DB nó là `undefined` ⇒ view hiện `—` cho phí nền
   * tảng trong lúc engine vẫn tính đủ phí đó ⇒ lệch số.
   *
   * Engine KHÔNG đọc `platformCommissionPercent` trong công thức nữa
   * (`pricingEngine.ts:426-428`), nên phép bù này không thể làm engine tính khác đi.
   */
  const effectivePricingConfig: InkiriCostFormulaConfig | null = useMemo(() => {
    if (!pricingConfig) return null;
    return {
      ...pricingConfig,
      platformCommissionPercent:
        marketplaceFeePercent !== null ? marketplaceFeePercent : pricingConfig.platformCommissionPercent ?? null,
    } as InkiriCostFormulaConfig;
  }, [pricingConfig, marketplaceFeePercent]);

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

  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
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

  const showToast = (msg: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    addToast({ message: msg, type });
  };

  const handleOpenAuth = (mode: 'signin' | 'signup' | 'account' = 'signin') => {
    openAuthModal(mode);
  };

  /**
   * Khu dùng chrome RIÊNG (không render Header/Footer storefront) — mỗi màn chỉ có
   * MỘT tầng chrome (15-ui-audit.md §2):
   *   - `admin`    : AdminDashboardView tự có sidebar + breadcrumb.
   *   - `lab`      : AppShell (LabDashboardShell) — Đợt 11B nhóm 1.
   *   - `designer` : AppShell (DesignerDashboardShell) — Đợt 11B nhóm 1.
   * Trước Đợt 11B chỉ có `admin`, nên `/lab` và `/designer` bị 2 tầng chrome chồng nhau.
   */
  const CHROMELESS_SCREENS = ['admin', 'lab', 'designer'];

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
      showToast(language === 'vi' ? 'Chỉ Quản Trị Viên (Admin) mới có quyền truy cập trang quản trị' : 'Admin role required to access Admin Console');
      navigate('/');
      return;
    }

    // W1a: cổng xưởng in chỉ dành cho vai trò xưởng ('lab' hoặc 'workshop' — DB CHECK ở
    // supabase/migrations/20260901_baseline_schema.sql:460 cho phép cả hai) và admin.
    // `role` được khai là `UserRole` (chưa có 'workshop') nên so sánh qua `string`.
    const roleName: string = role;
    if (screen === 'lab' && roleName !== 'lab' && roleName !== 'workshop' && roleName !== 'admin') {
      showToast(language === 'vi' ? 'Chỉ tài khoản Xưởng in (Lab) hoặc Quản trị viên mới vào được Bảng điều khiển xưởng in' : 'Print Lab or Admin role required to access the Print Lab dashboard');
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
      message: language === 'vi' ? 'Đã xóa sản phẩm khỏi giỏ hàng' : 'Removed item from cart',
      type: 'info',
      undoAction: itemToRemove ? () => addToCartStore(itemToRemove) : undefined
    });
  };

  /**
   * Đơn VỪA TẠO (chỉ trên RAM) — thêm vào Thư viện file CAD đúng những gì ĐÃ BIẾT từ chính
   * đơn, KHÔNG bịa phần còn lại.
   *
   * Trước đây khối này gán cho file vừa mua một loạt dữ kiện chưa ai đọc được: `isVerified:
   * true`, `format: 'STL'`, `version: 'v2.0'`, `license: 'Commercial'`, `maxDownloads:
   * 'Không giới hạn'`, `fileSize: '16.5 MB'`, `model3DType: 'gear'`.
   *
   * Nguồn thật của file số là bảng `digital_assets` (`file_format` / `file_size_bytes` /
   * `license_type` / `download_limit`, xem `20260901_baseline_schema.sql`) — nhưng RLS CHỈ
   * cho designer sở hữu và admin đọc (`20261010_harden_rls.sql`), khách không có policy nào,
   * nên PHÍA KHÁCH không có giá trị thật nào của file để điền. Vì vậy trường không biết để
   * `—`, KHÔNG đoán (docs/design/data-honesty.md).
   *
   * LƯU Ý: `DigitalAsset` (`src/types/index.ts`) vẫn khai `format` / `license` / `version` /
   * `maxDownloads` / `fileSize` là BẮT BUỘC và `format`/`license` là union hẹp, nên chỗ này
   * buộc phải ép kiểu để mang được giá trị trung thực `—`; nới type nằm ngoài phạm vi file này.
   */
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
        // Giấy phép chỉ nêu khi CHÍNH ĐƠN có ghi (`items.license` ← `license_type` của sản
        // phẩm); đơn không ghi ⇒ `—`, không đoán hộ.
        license: (i.license ?? EMPTY_VALUE) as DigitalAsset['license'],
        // Không có trên đơn và khách không đọc được `digital_assets` ⇒ `—`.
        format: EMPTY_VALUE as DigitalAsset['format'],
        version: EMPTY_VALUE,
        maxDownloads: EMPTY_VALUE,
        fileSize: EMPTY_VALUE,
        purchaseDate: new Date().toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US'),
        downloadsCount: 0,
        image: i.image
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
      featureName={language === 'vi' ? 'Bảng Điều Khiển Xưởng In (MES Hub)' : 'Print Lab Control (MES Hub)'}
      onNavigate={handleNavigate}
    >
      <LabRoute onNavigate={handleNavigate} onShowToast={showToast} />
    </RoleGuard>
  );

  return (
    <div className="min-h-dvh flex flex-col bg-canvas text-fg">
      {/*
        P1 §3: /admin* có chrome riêng (breadcrumb + avatar + nút "Xem Cửa Hàng"
        trong AdminDashboardView) nên KHÔNG render thanh storefront — trước đây 2 tầng chrome
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
                featureName={language === 'vi' ? 'Studio Tác Giả & Quản Lý Ấn Phẩm' : '3D Designer Studio & Publications'}
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
                featureName={language === 'vi' ? 'Studio Tác Giả & Quản Lý Ấn Phẩm' : '3D Designer Studio & Publications'}
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
                featureName={language === 'vi' ? 'ForgeControl Quản Trị Hệ Thống' : 'ForgeControl Administration Console'}
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
        U0-3: FAB là chrome của storefront nhưng trước đây hiện ở MỌI màn, kể cả /admin
        (đè lên điều khiển của dashboard). `CHROMELESS_SCREENS` là các màn đã có chrome
        riêng nên FAB bị loại hẳn khỏi cây (không chỉ ẩn bằng CSS).
      */}
      {!CHROMELESS_SCREENS.includes(currentScreen) && (
      <button
        ref={fabRef}
        onClick={() => setIsChatOpen(true)}
        aria-hidden={isFabHidden || undefined}
        tabIndex={isFabHidden ? -1 : undefined}
        className={`fixed bottom-6 right-6 z-drawer px-4 py-3 bg-surface-inverse hover:bg-surface-inverse-raised text-on-inverse shadow-e3 border border-fg-muted/30 flex items-center gap-2.5 font-sans text-xs transition-all duration-200 motion-reduce:transition-none hover:scale-105 touch-target-btn rounded-full cursor-pointer ${
          isFabHidden ? 'opacity-0 pointer-events-none invisible' : 'opacity-100'
        }`}
        aria-label={t('liveSupportAria', 'Tư vấn kỹ thuật trực tuyến', 'Live technical consultation')}
      >
        <span className="w-2 h-2 rounded-full bg-accent animate-pulse"></span>
        <Icon name="support_agent" size={20} className="text-on-inverse" />
        <span className="font-bold text-xs uppercase tracking-widest hidden sm:inline font-tech">
          {t('supportAssistant', 'Trợ lý tự động', 'Automated assistant')}
        </span>
      </button>
      )}

      {/* Interactive Toast Notification Queue via useUIStore */}
      <div className="fixed bottom-6 left-6 z-toast flex flex-col gap-2 pointer-events-none max-w-sm w-full">
        {toastQueue.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto px-4 py-3 border shadow-e3 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200 rounded-sm text-on-inverse ${
              toast.type === 'error'
                ? 'bg-danger border-danger/40 text-primary-fg'
                : toast.type === 'warning'
                ? 'bg-warning border-warning/40 text-primary-fg'
                : toast.type === 'success'
                ? 'bg-surface-inverse border-positive/40 text-on-inverse'
                : 'bg-surface-inverse border-accent/30 text-on-inverse'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Icon name={toast.type === 'error' ? 'error' : toast.type === 'warning' ? 'warning' : toast.type === 'success' ? 'check_circle' : 'info'} size={20} className="text-accent" />
              <span className="text-xs font-sans font-semibold">{toast.message}</span>
            </div>
            <div className="flex items-center gap-2">
              {toast.undoAction && (
                <button
                  onClick={toast.undoAction}
                  className="px-2 py-0.5 bg-on-inverse/10 hover:bg-on-inverse/20 text-xs font-mono rounded-full text-accent underline cursor-pointer"
                >
                  Hoàn tác
                </button>
              )}
              <button
                onClick={() => removeToast(toast.id)}
                className="text-fg-subtle hover:text-on-inverse cursor-pointer"
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
        P1: /admin* có chrome quản trị riêng (AdminDashboardView) ⇒ không render cả
        header lẫn footer storefront. Footer storefront là nội dung bán hàng
        (dịch vụ, địa chỉ xưởng, dung sai chế tạo) — vô nghĩa trong app quản trị.
      */}
      {/* Industrial Aesthetic Footer with Dynamic Admin Content */}
      {!CHROMELESS_SCREENS.includes(currentScreen) && (
        <footer className="bg-surface-inverse text-on-inverse border-t border-surface-inverse-raised pt-12 pb-6 mt-auto">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-12 space-y-8">
            <div className={`grid grid-cols-1 sm:grid-cols-2 ${role === 'admin' ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-8`}>
              {/* Col 1: Brand & Bio */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="font-display font-black text-2xl tracking-tighter text-on-inverse uppercase italic">
                    VCUBE
                  </span>
                  <span className="text-xs font-sans uppercase tracking-[0.2em] text-accent border-l border-line pl-2">
                    Vietnam
                  </span>
                </div>
                <p className="text-xs text-on-inverse/70 leading-relaxed font-sans">
                  {t('footerAbout', 'Nền tảng sản xuất bồi đắp và chế tác linh kiện cơ khí chính xác cho xưởng và phòng R&D.', 'Additive manufacturing and precision mechanical fabrication platform for workshops and R&D teams.')}
                </p>
                {siteContent.toleranceSpec ? (
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-surface-inverse-raised text-accent text-xs font-tech uppercase tracking-wider rounded-sm border border-line-subtle">
                    <span>{t('footerToleranceLabel', 'Dung sai chế tạo:', 'Fabrication tolerance:')} {siteContent.toleranceSpec}</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-surface-inverse-raised text-on-inverse/80 text-xs font-mono tracking-wider rounded-sm border border-line-subtle">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                    <span>{language === 'vi' ? 'Tiêu chuẩn chế tạo công nghiệp' : 'Industrial Manufacturing Standard'}</span>
                  </div>
                )}
              </div>

              {/* Col 2: Customer Navigation */}
              <div className="space-y-2.5 text-xs font-sans">
                <p className="font-bold uppercase tracking-widest text-on-inverse/70 text-xs font-tech">
                  {t('footerServices', 'Dịch Vụ & Mua Hàng', 'Customer Store')}
                </p>
                <ul className="space-y-2 text-on-inverse/70">
                  <li>
                    <button onClick={() => handleNavigate('explore')} className="hover:text-on-inverse transition-colors text-left cursor-pointer">
                      {t('footerMarketplace', 'Marketplace linh kiện 3D', '3D Parts Marketplace')}
                    </button>
                  </li>
                  <li>
                    <button onClick={() => handleNavigate('quote')} className="hover:text-on-inverse transition-colors text-left cursor-pointer">
                      {t('footerInstantQuote', 'Báo giá in 3D trực tuyến', 'Instant 3D File Quoting')}
                    </button>
                  </li>
                  <li>
                    <button onClick={() => handleNavigate('cart')} className="hover:text-on-inverse transition-colors text-left cursor-pointer">
                      {t('cartTitle', 'Giỏ hàng của bạn', 'Your Shopping Cart')}
                    </button>
                  </li>
                  <li>
                    <button onClick={() => handleNavigate('orders')} className="hover:text-on-inverse transition-colors text-left cursor-pointer">
                      {t('myOrdersTracking', 'Theo dõi đơn hàng thời gian thực', 'Real-time Order Tracking')}
                    </button>
                  </li>
                </ul>
              </div>

              {/* Col 3: Admin Console - Only visible for admin users */}
              {role === 'admin' && (
                <div className="space-y-2.5 text-xs font-sans">
                  <p className="font-bold uppercase tracking-widest text-on-inverse/70 text-xs font-tech">
                    {t('footerCreators', 'Quản Trị Hệ Thống', 'Administration')}
                  </p>
                  <ul className="space-y-2 text-on-inverse/70">
                    <li>
                      <button onClick={() => handleNavigate('admin')} className="hover:text-on-inverse transition-colors text-left font-bold text-accent cursor-pointer">
                        ForgeControl Admin Console
                      </button>
                    </li>
                    <li>
                      <button onClick={() => handleNavigate('admin', { section: 'products' })} className="hover:text-on-inverse transition-colors text-left cursor-pointer">
                        {language === 'vi' ? 'Quản lý sản phẩm & giá' : 'Product & Pricing Management'}
                      </button>
                    </li>
                    <li>
                      <button onClick={() => handleNavigate('admin', { section: 'queue' })} className="hover:text-on-inverse transition-colors text-left cursor-pointer">
                        {language === 'vi' ? 'Hàng đợi & tiến độ gia công' : 'Fabrication Queue & Status'}
                      </button>
                    </li>
                    <li>
                      <button onClick={() => handleNavigate('admin', { section: 'storefront' })} className="hover:text-on-inverse transition-colors text-left cursor-pointer">
                        {language === 'vi' ? 'Cấu hình phí ship & thông báo' : 'Site Content & Announcement'}
                      </button>
                    </li>
                  </ul>
                </div>
              )}

              {/* Col 4: Dynamic Contact from Admin Content */}
              <div className="space-y-2.5 text-xs font-sans">
                <p className="font-bold uppercase tracking-widest text-on-inverse/70 text-xs font-tech">
                  {t('footerLocationTitle', 'Trụ Sở & Xưởng Chế Tác', 'Headquarters & Facilities')}
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

            <div className="pt-8 border-t border-surface-inverse-raised flex flex-col sm:flex-row items-center justify-between text-xs text-on-inverse/70 font-sans gap-4">
              <p>{t('footerRights', '© 2026 VCUBE Vietnam Industrial Fabrication. Bảo lưu mọi quyền.', '© 2026 VCUBE Vietnam Industrial Fabrication. All rights reserved.')}</p>
              <div className="flex items-center gap-4">
                <span>{t('footerCadSecurity', 'Bảo mật dữ liệu CAD/STL', 'CAD/STL Data Security')}</span>
                <span>•</span>
                <span>{t('footerQcPolicy', 'Đo kiểm theo quy trình thoả thuận', 'Inspection per agreed process')}</span>
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

/**
 * Bơm `pathname` của react-router vào ThemeProvider.
 *
 * ThemeProvider phải nằm TRONG <BrowserRouter> để dùng `useLocation()` —
 * docs/plans/01-theme-migration.md §5.2. Ở chế độ này provider KHÔNG đụng tới
 * `history.pushState/replaceState`; bộ listener fallback chỉ chạy khi thiếu prop
 * `pathname` (xem src/frontend/theme/ThemeProvider.tsx).
 */
const RouteThemeSync: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { pathname } = useLocation();
  return <ThemeProvider pathname={pathname}>{children}</ThemeProvider>;
};

export function App() {
  return (
    <BrowserRouter>
      <RouteThemeSync>
        <AuthProvider>
          <LanguageProvider>
            <ScrollToTop />
            <MainApp />
          </LanguageProvider>
        </AuthProvider>
      </RouteThemeSync>
    </BrowserRouter>
  );
}

export default App;
