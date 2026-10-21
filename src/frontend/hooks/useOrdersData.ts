/**
 * useOrdersData — domain đơn hàng + thư viện file số của `MainApp` (Phase 3c), tách
 * NGUYÊN VĂN logic.
 *
 * Hợp đồng (hành vi giữ y nguyên):
 * - `orders` chỉ chứa đơn THẬT: đơn tạo trong phiên hoặc đơn đọc từ DB (admin thấy toàn bộ
 *   khi RLS cho phép); KHÔNG seed fixture.
 * - `assets` là bản ghi file số suy ra TỪ CHÍNH ĐƠN đã tạo (không bịa trường không có dữ liệu).
 * - `handleUpdateOrderStatus` cập nhật stage/status/progress và đồng bộ `activeOrder`.
 */

import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { DigitalAsset, Order } from '@/types';
import { dbService } from '@backend/supabase/database';
import { useAuth } from '@frontend/context/AuthContext';
import { useCartStore } from '@frontend/stores/useCartStore';
import { EMPTY_VALUE } from '@frontend/lib/format';

export interface OrdersData {
  orders: Order[];
  assets: DigitalAsset[];
  activeOrder: Order | null;
  setActiveOrder: Dispatch<SetStateAction<Order | null>>;
  handleOrderCompleted: (newOrder: Order) => void;
  handleUpdateOrderStatus: (orderId: string, newStageIndex: number, newStatus: Order['status'], progress?: number) => void;
}

export function useOrdersData(): OrdersData {
  const { role } = useAuth();
  const clearCartStore = useCartStore((s) => s.clearCart);

  // Đơn hàng KHÔNG được seed từ fixture: chỉ chứa đơn thật do người dùng tạo
  // trong phiên, hoặc đơn đọc từ Supabase (xem effect bên dưới).
  const [orders, setOrders] = useState<Order[]>([]);
  const [assets, setAssets] = useState<DigitalAsset[]>([]);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);

  /**
   * Admin cần thấy TOÀN BỘ đơn (RLS `vcube_orders_admin_all` cho phép) để Overview, badge
   * sidebar và cảnh báo chờ thanh toán có số thật. Trước đây App không nạp `orders` từ DB nên
   * các chỗ đó luôn rỗng.
   */
  useEffect(() => {
    if (role !== 'admin') return;
    let alive = true;
    dbService.getOrders()
      .then((list) => {
        if (alive && Array.isArray(list)) setOrders(list);
      })
      .catch((err) => console.warn('Could not load orders for admin:', err));
    return () => {
      alive = false;
    };
  }, [role]);

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
        purchaseDate: new Date().toLocaleDateString('vi-VN'),
        downloadsCount: 0,
        image: i.image
      }));

    if (newAssets.length > 0) {
      setAssets((prev) => [...newAssets, ...prev]);
    }

    clearCartStore();
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

  return {
    orders,
    assets,
    activeOrder,
    setActiveOrder,
    handleOrderCompleted,
    handleUpdateOrderStatus,
  };
}
