/**
 * useAppNavigation — "Central Navigation Adapter Bridge" tách NGUYÊN VĂN khỏi
 * `src/App.tsx` (Phase 4d). Chuyển `screen` (API cũ của views) → URL thật của router,
 * giữ đủ guard auth/role + toast + payload mapping như bản gốc.
 */

import { useNavigate } from 'react-router-dom';
import type { Order, Product } from '@/types';

/** Payload mà views cũ truyền cho `onNavigate(screen, payload)` — các field dùng trong bridge. */
export interface AppNavPayload {
  product?: Product;
  order?: Order;
  orderId?: string;
  category?: string;
  search?: string;
  tag?: string;
  materialId?: string;
  tab?: string;
  section?: string;
  appliedDiscount?: number;
}

export type AppNavigate = (screen: string, payload?: AppNavPayload) => void;

export interface UseAppNavigationInput {
  role: string;
  isLoggedIn: boolean;
  orders: Order[];
  setActiveOrder: (order: Order | null) => void;
  setAppliedDiscount: (discount: number) => void;
  showToast: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export function useAppNavigation({
  role,
  isLoggedIn,
  orders,
  setActiveOrder,
  setAppliedDiscount,
  showToast,
}: UseAppNavigationInput): { handleNavigate: AppNavigate } {
  const navigate = useNavigate();

  // Central Navigation Adapter Bridge
  const handleNavigate = (screen: string, payload?: AppNavPayload) => {
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

  return { handleNavigate };
}
