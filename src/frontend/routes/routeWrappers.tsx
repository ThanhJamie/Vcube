/**
 * routeWrappers — các wrapper route của App (tách khỏi `src/App.tsx`, Phase 3c).
 *
 * Hành vi giữ NGUYÊN 100% so với bản trong App.tsx: cùng props, cùng nhánh
 * loading/error/not-found, cùng lazy import cho view không thuộc critical path.
 * Wrapper chỉ đọc URL/params + props từ `MainApp`; không giữ state riêng.
 */

import React from 'react';
import { Navigate, useParams, useSearchParams } from 'react-router-dom';
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

// View chỉ dùng bởi các wrapper dưới đây ⇒ lazy declaration đặt tại đây (cùng pattern
// `import().then(m => ({ default: m.X }))` như App.tsx, không đổi cách code-split).
const PersonalizeView = React.lazy(() => import('@frontend/views/PersonalizeView').then((m) => ({ default: m.PersonalizeView })));
const OrderSuccessView = React.lazy(() => import('@frontend/views/OrderSuccessView').then((m) => ({ default: m.OrderSuccessView })));
const OrderTrackingView = React.lazy(() => import('@frontend/views/OrderTrackingView').then((m) => ({ default: m.OrderTrackingView })));

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoggedIn, loading } = useAuth();
  // Chờ khôi phục phiên trước khi redirect: nếu không, deep-link (F5 / tab mới) tới
  // /orders, /assets… sẽ bị đẩy về /auth/login dù phiên Supabase còn hợp lệ.
  // UI-001 (P1): trước đây trả `null` ⇒ màn TRẮNG trong lúc khôi phục phiên, không có
  // phản hồi cho người dùng khi mạng chậm/Supabase paused. Nay render skeleton của
  // route (component có sẵn) — KHÔNG đổi logic auth/redirect: hết loading vẫn rẽ nhánh
  // `!isLoggedIn` như cũ.
  if (loading) return <PageSkeleton />;
  if (!isLoggedIn) {
    return <Navigate to="/auth/login" replace />;
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
      <div role="status" className="min-h-dvh bg-canvas flex items-center justify-center p-6">
        <div className="text-center space-y-3">
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
        <h2 className="font-bold text-lg text-fg">Không tìm thấy bản vẽ CAD này</h2>
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
  const [loadState, setLoadState] = React.useState<'idle' | 'loading' | 'error'>('idle');

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
  }, [orderId, fromRam, token]);

  const order = fromRam ?? dbOrder;

  if (!order) {
    if (loadState === 'loading') return <PageSkeleton />;
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
      <h2 className="font-bold text-lg text-fg">Không tìm thấy đơn hàng</h2>
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
