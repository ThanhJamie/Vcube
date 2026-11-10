/**
 * routeWrappers — các wrapper route của App (tách khỏi `src/App.tsx`, Phase 3c).
 *
 * Hành vi giữ NGUYÊN 100% so với bản trong App.tsx: cùng props, cùng nhánh
 * loading/error/not-found, cùng lazy import cho view không thuộc critical path.
 * Wrapper chỉ đọc URL/params + props từ `MainApp`; không giữ state riêng.
 */

import React from 'react';
import { Navigate, useLocation, useParams, useSearchParams } from 'react-router-dom';
import type {
  CartItem,
  InkiriCostFormulaConfig,
  MaterialProfile,
  Order,
  Product,
} from '@/types';
import { useAuth } from '@frontend/context/AuthContext';
import { NotFoundView } from '@frontend/components/NotFoundView';
import { PageSkeleton } from '@frontend/components/PageSkeleton';
import { Button, EmptyState, Icon } from '@frontend/ui';
import { ExploreView } from '@frontend/views/ExploreView';
import { OrderService } from '@backend/services/orderService';
import { ProductDetailView } from '@frontend/views/ProductDetailView';
import { buildLoginHref } from '@frontend/lib/authRedirect';

// View chỉ dùng bởi các wrapper dưới đây ⇒ lazy declaration đặt tại đây (cùng pattern
// `import().then(m => ({ default: m.X }))` như App.tsx, không đổi cách code-split).
const PersonalizeView = React.lazy(() => import('@frontend/views/PersonalizeView').then((m) => ({ default: m.PersonalizeView })));
const OrderSuccessView = React.lazy(() => import('@frontend/views/OrderSuccessView').then((m) => ({ default: m.OrderSuccessView })));
const OrderTrackingView = React.lazy(() => import('@frontend/views/OrderTrackingView').then((m) => ({ default: m.OrderTrackingView })));

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoggedIn, loading } = useAuth();
  const location = useLocation();
  // Chờ khôi phục phiên trước khi redirect: nếu không, deep-link (F5 / tab mới) tới
  // /orders, /assets… sẽ bị đẩy về /auth/login dù phiên Supabase còn hợp lệ.
  // UI-001 (P1): trước đây trả `null` ⇒ màn TRẮNG trong lúc khôi phục phiên, không có
  // phản hồi cho người dùng khi mạng chậm/Supabase paused. Nay render skeleton của
  // route (component có sẵn) — KHÔNG đổi logic auth/redirect: hết loading vẫn rẽ nhánh
  // `!isLoggedIn` như cũ.
  if (loading) return <PageSkeleton />;
  if (!isLoggedIn) {
    // UX-02: GIỮ ĐƯỜNG VỀ. Trước đây guest mở /orders (hoặc /assets, /account) bị đẩy
    // sang `/auth/login` không kèm query ⇒ đăng nhập xong rơi về trang chủ, mất ngữ cảnh.
    // Nay gắn `?redirectTo=<pathname+search>` (chỉ path nội bộ — xem `authRedirect.ts`);
    // `LoginView` đọc lại và điều hướng sau khi đăng nhập thành công.
    return <Navigate to={buildLoginHref(location.pathname, location.search)} replace />;
  }
  return <>{children}</>;
};

export const ExploreRoute: React.FC<{
  products: Product[];
  productsLoading?: boolean;
  productsError?: boolean;
  onRetry?: () => void;
  materials?: MaterialProfile[];
  pricingConfig?: InkiriCostFormulaConfig;
  onAddToCart: (item: CartItem) => void;
  onNavigate: (screen: string, payload?: any) => void;
  onSelectProduct: (product: Product) => void;
  onShowToast: (msg: string) => void;
}> = ({ products, productsLoading, productsError, onRetry, materials, pricingConfig, onAddToCart, onNavigate, onSelectProduct, onShowToast }) => {
  const [searchParams] = useSearchParams();
  const category = searchParams.get('category') || 'all';
  const search = searchParams.get('search') || '';
  const tag = searchParams.get('tag') || 'all';

  return (
    <ExploreView
      products={products}
      productsLoading={productsLoading}
      productsError={productsError}
      onRetry={onRetry}
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

export const ProductDetailRoute: React.FC<{
  products: Product[];
  productsLoading?: boolean;
  productsError?: boolean;
  onRetry?: () => void;
  materials?: MaterialProfile[];
  pricingConfig?: InkiriCostFormulaConfig;
  onAddToCart: (item: CartItem) => void;
  onNavigate: (screen: string, payload?: any) => void;
  onShowToast: (msg: string) => void;
}> = ({ products, productsLoading, productsError, onRetry, materials, pricingConfig, onAddToCart, onNavigate, onShowToast }) => {
  const { productId } = useParams<{ productId: string }>();
  const product = products.find((p) => p.id === productId);

  if (product) {
    return (
      <ProductDetailView
        product={product}
        allProducts={products}
        materials={materials}
        pricingConfig={pricingConfig}
        onAddToCart={onAddToCart}
        onNavigate={onNavigate}
        onShowToast={onShowToast}
      />
    );
  }

  if (productsLoading) {
    return (
      <div role="status" aria-live="polite" aria-busy="true" className="min-h-dvh bg-canvas flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          {/* A11Y-W1.2: trạng thái tải là toàn bộ trang ⇒ vẫn cần h1 cấp trang, cùng nhãn
              với h1 của trạng thái lỗi bên dưới. */}
          <h1 className="sr-only">Chi tiết bản vẽ CAD</h1>
          <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin motion-reduce:animate-none mx-auto" />
          <p className="font-mono text-xs text-fg-subtle">Đang tải thông số kỹ thuật mô hình 3D...</p>
        </div>
      </div>
    );
  }

  if (productsError) {
    return (
      <div role="alert" className="min-h-dvh bg-canvas flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* A11Y-W1.1: trạng thái lỗi vẫn phải có h1 cấp trang (EmptyState chỉ render `<p>`).
              `sr-only` nên không đổi layout hay thêm heading thị giác. */}
          <h1 className="sr-only">Chi tiết bản vẽ CAD</h1>
          <EmptyState
            icon={<Icon name="error" size={20} />}
            title="Không tải được kho bản vẽ"
            description="Không kết nối được tới máy chủ dữ liệu. Kiểm tra kết nối mạng rồi thử lại."
            action={
              <Button
                variant="secondary"
                size="md"
                loading={Boolean(productsLoading)}
                loadingLabel="Đang tải…"
                leadingIcon={<Icon name="refresh" size={18} />}
                onClick={() => onRetry?.()}
              >
                Thử lại
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-canvas flex items-center justify-center p-6">
      <div className="bg-surface p-8 rounded-lg text-center max-w-md space-y-4 shadow-e1">
        <Icon name="precision_manufacturing" size={36} className="text-fg-subtle" />
        {/* A11Y-W1.1: đây là heading DUY NHẤT của trạng thái not-found ⇒ dùng h1
            (trước là h2, khiến trang không có heading cấp 1). */}
        <h1 className="font-bold text-lg text-fg">Không tìm thấy bản vẽ CAD này</h1>
        <p className="text-xs text-fg-subtle">Mô hình bạn đang tìm có thể đã được lưu trữ hoặc thay đổi mã định danh.</p>
        <Button
          variant="primary"
          size="lg"
          onClick={() => onNavigate('explore')}
        >
          Quay lại Kho Bản Vẽ
        </Button>
      </div>
    </div>
  );
};

export const PersonalizeRoute: React.FC<{
  products: Product[];
  productsLoading?: boolean;
  productsError?: boolean;
  onRetry?: () => void;
  materials?: MaterialProfile[];
  pricingConfig?: InkiriCostFormulaConfig;
  onAddToCart: (item: CartItem) => void;
  onNavigate: (screen: string, payload?: any) => void;
  onShowToast: (msg: string) => void;
}> = ({ products, productsLoading, productsError, onRetry, materials, pricingConfig, onAddToCart, onNavigate, onShowToast }) => {
  const { productId } = useParams<{ productId?: string }>();
  // UX-04: chỉ kết luận "không có mẫu" khi catalog đã tải XONG và không lỗi.
  // `PersonalizeView` (prop `product` bắt buộc) crash nếu `products[0]` là `undefined`,
  // nên không bao giờ truyền sản phẩm không tồn tại.
  const product = productId ? products.find((p) => p.id === productId) : products[0];

  if (product) {
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
  }

  // Đang nạp catalog: hiện skeleton thay vì 404/empty state sai thời điểm.
  if (productsLoading) return <PageSkeleton heading="Tuỳ biến mẫu 3D" />;

  // Lỗi tải catalog: nói thật + cho thử lại (không giả vờ kho rỗng).
  if (productsError) {
    return (
      <div className="min-h-dvh bg-canvas flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <h1 className="sr-only">Tuỳ biến mẫu 3D</h1>
          <EmptyState
            icon={<Icon name="error" size={20} />}
            title="Không tải được kho mẫu"
            description="Không kết nối được tới kho mẫu nên chưa thể mở trình tuỳ biến. Kiểm tra kết nối mạng rồi thử lại."
            action={
              <Button
                variant="secondary"
                size="md"
                leadingIcon={<Icon name="refresh" size={18} />}
                onClick={() => onRetry?.()}
              >
                Thử lại
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  // UX-04: `/personalize` KHÔNG kèm id mà kho mẫu rỗng ⇒ trạng thái rỗng của storefront,
  // không phải URL sai. Chỉ `/personalize/:productId` không khớp mới là 404 thật.
  if (!productId) {
    return (
      <div className="min-h-dvh bg-canvas flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <h1 className="sr-only">Tuỳ biến mẫu 3D</h1>
          <EmptyState
            icon={<Icon name="view_in_ar" size={20} />}
            title="Chưa có mẫu nào để tuỳ biến"
            description="Kho mẫu đang trống nên chưa có sản phẩm để cá nhân hoá. Bạn vẫn có thể tải tệp CAD lên để nhận báo giá in 3D."
            action={
              <>
                <Button
                  variant="primary"
                  size="lg"
                  leadingIcon={<Icon name="upload_file" size={18} />}
                  onClick={() => onNavigate('quote')}
                >
                  Báo giá tệp 3D
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  leadingIcon={<Icon name="storefront" size={18} />}
                  onClick={() => onNavigate('explore')}
                >
                  Khám phá kho mẫu
                </Button>
              </>
            }
          />
        </div>
      </div>
    );
  }

  return <NotFoundView />;
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
export function resolveOrderById(orders: Order[], orderId?: string): Order | null {
  if (!orderId) return null;
  return orders.find((o) => o.id === orderId) ?? null;
}

export const OrderSuccessRoute: React.FC<{
  orders: Order[];
  onNavigate: (screen: string, payload?: any) => void;
  onOpenInvoice: (order: Order) => void;
}> = ({ orders, onNavigate, onOpenInvoice }) => {
  const { orderId } = useParams<{ orderId?: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? undefined;
  const fromRam = resolveOrderById(orders, orderId);

  // FL-1 — HOÁ ĐƠN BỀN qua F5: nếu đơn không còn trên RAM (reload/tab mới) thì đọc lại từ DB.
  //   * Chủ đơn đã đăng nhập: RLS `vcube_orders_owner_read` cho đọc theo id.
  //   * Khách vãng lai: cần `?token=<secure_access_token>` (RPC SECURITY DEFINER) — không đoán.
  // Không có fallback sang đơn khác: sai id/token ⇒ trạng thái "không tìm thấy" như cũ.
  const [dbOrder, setDbOrder] = React.useState<Order | null>(null);
  // Khởi tạo 'loading' khi đã có `orderId` mà chưa có đơn trên RAM: tránh 1 frame hiện
  // nhầm "không tìm thấy" trước khi effect kịp chạy (A11Y-W1.2 audit loading/error).
  const [loadState, setLoadState] = React.useState<'idle' | 'loading' | 'error'>(() =>
    orderId && !fromRam ? 'loading' : 'idle'
  );
  // A11Y-W1.2: lỗi đọc đơn (mạng/DB) phải tách khỏi "không tìm thấy". Mỗi lần bấm
  // "Thử lại" tăng tick ⇒ effect chạy lại; KHÔNG đổi logic đọc DB.
  const [retryTick, setRetryTick] = React.useState(0);

  React.useEffect(() => {
    if (!orderId || fromRam) {
      setDbOrder(null);
      setLoadState('idle');
      return;
    }
    let alive = true;
    setLoadState('loading');
    OrderService.getOrderDetail(orderId, { token })
      .then((res) => {
        if (!alive) return;
        setDbOrder(res.order);
        setLoadState('idle');
      })
      .catch(() => {
        if (alive) setLoadState('error');
      });
    return () => {
      alive = false;
    };
  }, [orderId, fromRam, token, retryTick]);

  const order = fromRam ?? dbOrder;

  if (!order) {
    if (loadState === 'loading') return <PageSkeleton heading="Xác nhận đơn hàng" />;
    // Lỗi kết nối/đọc dữ liệu ≠ đơn không tồn tại ⇒ không được hiện "Không tìm thấy đơn hàng".
    if (loadState === 'error') {
      return (
        <OrderLoadErrorView
          onRetry={() => setRetryTick((n) => n + 1)}
          onNavigate={onNavigate}
        />
      );
    }
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

export const OrderTrackingRoute: React.FC<{
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
export const OrderNotFoundView: React.FC<{
  onNavigate: (screen: string, payload?: any) => void;
  context: 'order-success' | 'tracking';
}> = ({ onNavigate, context }) => (
  <div className="min-h-dvh bg-canvas flex items-center justify-center p-6">
    <div className="bg-surface p-8 rounded-lg text-center max-w-md space-y-4 shadow-e1">
      <Icon name="receipt_long" size={36} className="text-fg-subtle" />
      {/* A11Y-W1.1: heading DUY NHẤT của màn không tìm thấy đơn ⇒ h1 (trước là h2,
          khiến `/order-success` không có heading cấp 1). */}
      <h1 className="font-bold text-lg text-fg">Không tìm thấy đơn hàng</h1>
      <p className="text-xs text-fg-subtle leading-relaxed">
        {context === 'order-success'
          ? 'Liên kết này không ứng với đơn hàng nào trong phiên làm việc hiện tại. Đơn của bạn nằm trong mục Đơn hàng, hoặc tra cứu bằng mã đơn kèm token.'
          : 'Chúng tôi không có đơn hàng nào khớp với mã bạn mở. Vui lòng tra cứu lại bằng mã đơn kèm token.'}
      </p>
      <div className="flex flex-col sm:flex-row justify-center gap-2 pt-1">
        <Button
          variant="primary"
          size="lg"
          onClick={() => onNavigate('tracking')}
        >
          Tra cứu đơn hàng
        </Button>
        <Button
          variant="secondary"
          size="lg"
          onClick={() => onNavigate('my_orders')}
        >
          Đơn hàng của tôi
        </Button>
      </div>
    </div>
  </div>
);

/**
 * A11Y-W1.2 / honesty: `/order-success/:id` đọc đơn từ DB mà lỗi (mạng/DB) KHÔNG phải
 * "không tìm thấy đơn". Trạng thái này nói đúng là CHƯA ĐỌC ĐƯỢC (nêu cả khả năng mất
 * kết nối lẫn mã/token không khớp vì service không phân biệt được hai nguyên nhân) và
 * cho thử lại; không khẳng định đơn không tồn tại.
 */
export const OrderLoadErrorView: React.FC<{
  onRetry: () => void;
  onNavigate: (screen: string, payload?: any) => void;
}> = ({ onRetry, onNavigate }) => (
  <div role="alert" className="min-h-dvh bg-canvas flex items-center justify-center p-6">
    <div className="bg-surface p-8 rounded-lg text-center max-w-md space-y-4 shadow-e1">
      <Icon name="error" size={36} className="text-fg-subtle" />
      <h1 className="font-bold text-lg text-fg">Không tải được đơn hàng</h1>
      <p className="text-xs text-fg-subtle leading-relaxed">
        Chưa đọc được đơn này từ máy chủ. Có thể do mất kết nối mạng, hoặc mã đơn kèm token
        không khớp. Kiểm tra kết nối rồi thử lại.
      </p>
      <div className="flex flex-col sm:flex-row justify-center gap-2 pt-1">
        <Button
          variant="primary"
          size="lg"
          leadingIcon={<Icon name="refresh" size={18} />}
          onClick={onRetry}
        >
          Thử lại
        </Button>
        <Button
          variant="secondary"
          size="lg"
          onClick={() => onNavigate('my_orders')}
        >
          Đơn hàng của tôi
        </Button>
      </div>
    </div>
  </div>
);
