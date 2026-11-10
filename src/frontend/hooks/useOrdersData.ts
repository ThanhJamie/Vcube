/**
 * useOrdersData — domain đơn hàng + thư viện file số của `MainApp` (Phase 3c), tách
 * NGUYÊN VĂN logic.
 *
 * Hợp đồng (hành vi giữ y nguyên):
 * - `orders` chỉ chứa đơn THẬT: đơn tạo trong phiên hoặc đơn đọc từ DB (admin thấy toàn bộ
 *   khi RLS cho phép); KHÔNG seed fixture.
 * - `assets` là bản ghi file số suy ra TỪ CHÍNH ĐƠN đã tạo (không bịa trường không có dữ liệu).
 * - `handleUpdateOrderStatus` cập nhật stage/status/progress và đồng bộ `activeOrder`.
 * - Realtime `orders:me` chỉ MERGE các cột trạng thái vào đơn đã có trong RAM (không thay
 *   nguyên object từ payload) và sinh `notifications` — state RAM của phiên, không localStorage.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { DigitalAsset, Order } from '@/types';
import { dbService } from '@backend/supabase/database';
import { isSupabaseConfigured } from '@backend/supabase/client';
import { MY_ORDER_STATUS_LABELS } from '@backend/services/workshop/constants';
import {
  createWarrantyClaim,
  listWorkshopWarrantyClaims,
  updateWarrantyClaim,
  type CreateWarrantyClaimInput,
  type WarrantyClaim,
  type WarrantyClaimStatus,
} from '@backend/services/warrantyService';
import type { WriteResult } from '@backend/lib/result';
import { useAuth } from '@frontend/context/AuthContext';
import { useCartStore } from '@frontend/stores/useCartStore';
import { EMPTY_VALUE } from '@frontend/lib/format';
import { subscribeOrders } from '@frontend/lib/realtimeRegistry';

/** Một cập nhật trạng thái đơn CÓ THẬT — chỉ sinh từ realtime `orders` UPDATE. */
export interface OrderNotification {
  id: string;
  orderId: string;
  orderNumber: string;
  status: Order['status'];
  /** Nhãn VI từ `MY_ORDER_STATUS_LABELS`; trạng thái lạ ⇒ giữ mã thô, không bịa nhãn. */
  label: string;
  /** ISO timestamp của lúc nhận được cập nhật. */
  at: string;
}

export interface OrdersData {
  orders: Order[];
  assets: DigitalAsset[];
  activeOrder: Order | null;
  setActiveOrder: Dispatch<SetStateAction<Order | null>>;
  handleOrderCompleted: (newOrder: Order) => void;
  handleUpdateOrderStatus: (orderId: string, newStageIndex: number, newStatus: Order['status'], progress?: number) => void;
  notifications: OrderNotification[];
  unreadCount: number;
  markNotificationsRead: () => void;
}

/** Số cột số từ payload realtime (có thể là `null`, chuỗi số hoặc thiếu hẳn). */
function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Số thông báo tối đa giữ trong RAM (chống phình khi đơn chạy qua nhiều trạng thái). */
const MAX_NOTIFICATIONS = 20;

export function useOrdersData(): OrdersData {
  const { role, isLoggedIn, user } = useAuth();
  const clearCartStore = useCartStore((s) => s.clearCart);

  // Đơn hàng KHÔNG được seed từ fixture: chỉ chứa đơn thật do người dùng tạo
  // trong phiên, hoặc đơn đọc từ Supabase (xem effect bên dưới).
  const [orders, setOrders] = useState<Order[]>([]);
  const [assets, setAssets] = useState<DigitalAsset[]>([]);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  /** Thông báo trạng thái của phiên hiện tại — RAM-only, dọn khi đổi người dùng. */
  const [notifications, setNotifications] = useState<OrderNotification[]>([]);
  /** Id các thông báo đã đọc (`markNotificationsRead` ghi mốc "đã xem"). */
  const [readIds, setReadIds] = useState<ReadonlySet<string>>(() => new Set());

  /**
   * Refs đọc GIÁ TRỊ MỚI NHẤT trong callback realtime — handler đăng ký một lần, không
   * được đóng băng state của lần render đầu tiên.
   */
  const ordersRef = useRef<Order[]>([]);
  const notificationsRef = useRef<OrderNotification[]>([]);
  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);
  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  /** Khoá người dùng cho realtime: null khi chưa đăng nhập (channel không được mở). */
  const userId = isLoggedIn ? user?.id ?? null : null;

  /**
   * Nạp đơn cho MỌI người dùng đã đăng nhập (không chỉ admin).
   *
   * Trước đây effect chỉ chạy khi `role === 'admin'`, nên `/orders` của khách luôn rỗng —
   * trang "nói sai" rằng khách chưa từng đặt đơn. RLS đã là cổng chặn thật:
   * `vcube_orders_owner_read` chỉ trả đơn khớp `user_id`/`customer_email` của JWT, còn
   * `vcube_orders_admin_all` cho admin thấy toàn bộ — nên KHÔNG truyền email/điều kiện
   * từ client (tránh bỏ sót đơn có email khác lúc đặt).
   */
  useEffect(() => {
    if (!isLoggedIn) return;
    let alive = true;
    dbService.getOrders()
      .then((list) => {
        if (alive && Array.isArray(list)) setOrders(list);
      })
      .catch((err) => console.warn('Could not load orders:', err));
    return () => {
      alive = false;
    };
  }, [isLoggedIn, role]);

  /**
   * Đổi người dùng / đăng xuất ⇒ thông báo của phiên trước phải biến mất: chúng chứa mã đơn
   * thật của tài khoản cũ. Đây chỉ là state UI trong RAM, không đụng dữ liệu DB.
   */
  useEffect(() => {
    setNotifications([]);
    setReadIds(new Set());
  }, [userId]);

  /**
   * Realtime `orders:me` — cập nhật trạng thái đơn của CHÍNH người dùng đang đăng nhập.
   *
   * Bảng `orders` đã nằm trong publication `supabase_realtime` (baseline §11) và RLS
   * (`vcube_orders_owner_read` / `vcube_orders_admin_all`) quyết định dòng nào tới được
   * client ⇒ client KHÔNG lọc theo email/vai trò ở đây.
   *
   * Kênh do `realtimeRegistry` sở hữu: nhiều consumer cùng nghe `orders:me` dùng chung
   * MỘT channel, effect này chỉ đăng ký/gỡ handler của mình (tránh subscribe trùng khi
   * hook mount nhiều lần / StrictMode / HMR).
   *
   * Payload chỉ dùng để MERGE các cột trạng thái vào đơn đã có trong RAM — KHÔNG thay
   * nguyên object (payload realtime có thể thiếu cột hoặc kiểu khác mapper). Đơn chưa có
   * trong RAM thì bỏ qua: không đủ dữ kiện (orderNumber/items…) để dựng một đơn đầy đủ.
   */
  useEffect(() => {
    if (!userId) return;

    return subscribeOrders((payload) => {
      const row = payload.new;
      if (!row || typeof row.id !== 'string') return;
      const orderId = row.id;

      const previous = ordersRef.current.find((o) => o.id === orderId);
      if (!previous) return;

      // Chỉ nhận cột CÓ trong payload; cột vắng mặt ⇒ giữ giá trị đang có.
      const nextStatus =
        typeof row.status === 'string' ? (row.status as Order['status']) : previous.status;
      const patch: Partial<Order> = {
        status: nextStatus,
        statusStageIndex:
          'status_stage_index' in row
            ? toNumberOrNull(row.status_stage_index)
            : previous.statusStageIndex,
        layerProgress:
          'layer_progress' in row ? toNumberOrNull(row.layer_progress) : previous.layerProgress,
        timeRemaining:
          'time_remaining' in row
            ? row.time_remaining == null
              ? null
              : String(row.time_remaining)
            : previous.timeRemaining,
        assignedWorkshopId:
          'assigned_workshop_id' in row
            ? row.assigned_workshop_id == null
              ? null
              : String(row.assigned_workshop_id)
            : previous.assignedWorkshopId,
      };

      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, ...patch } : o)));
      setActiveOrder((prev) => (prev && prev.id === orderId ? { ...prev, ...patch } : prev));

      // Thông báo CHỈ khi trạng thái THẬT SỰ đổi. Khoá dedupe `${orderId}:${status}`:
      // cùng một đơn không báo lặp cùng một trạng thái (kể cả khi quay lại trạng thái cũ).
      if (nextStatus !== previous.status) {
        const id = `${orderId}:${nextStatus}`;
        const at = new Date().toISOString();
        setNotifications((prevList) => {
          if (prevList.some((n) => n.id === id)) return prevList;
          return [
            {
              id,
              orderId,
              orderNumber: previous.orderNumber,
              status: nextStatus,
              label: MY_ORDER_STATUS_LABELS[nextStatus] ?? nextStatus,
              at,
            },
            ...prevList,
          ].slice(0, MAX_NOTIFICATIONS);
        });
      }
    });
  }, [userId]);

  /**
   * Lưới an toàn khi realtime rớt (tab ngủ, mạng chập chờn): quay lại tab ⇒ đồng bộ lại
   * danh sách đơn từ DB (RLS tự lọc). Chỉ chạy khi đã đăng nhập.
   */
  useEffect(() => {
    if (!isLoggedIn || !isSupabaseConfigured) return;
    let alive = true;

    const syncWhenVisible = () => {
      if (document.visibilityState !== 'visible') return;
      dbService.getOrders()
        .then((list) => {
          if (alive && Array.isArray(list)) setOrders(list);
        })
        .catch((err) => console.warn('Could not sync orders on focus:', err));
    };

    document.addEventListener('visibilitychange', syncWhenVisible);
    return () => {
      alive = false;
      document.removeEventListener('visibilitychange', syncWhenVisible);
    };
  }, [isLoggedIn]);

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

  /**
   * Đánh dấu đã đọc toàn bộ thông báo hiện có. Identity ổn định để không tạo lại prop mỗi
   * lần render; đọc bản mới nhất qua ref.
   */
  const markNotificationsRead = useCallback(() => {
    setReadIds(new Set(notificationsRef.current.map((n) => n.id)));
  }, []);

  const unreadCount = notifications.reduce((acc, n) => acc + (readIds.has(n.id) ? 0 : 1), 0);

  return {
    orders,
    assets,
    activeOrder,
    setActiveOrder,
    handleOrderCompleted,
    handleUpdateOrderStatus,
    notifications,
    unreadCount,
    markNotificationsRead,
  };
}

/* ============================================================================
 * WARRANTY BRIDGE — component KHÔNG import thẳng `backend/services`
 * (gate `check-import-boundaries`). Hook này là cầu nối đã nằm trong baseline,
 * component chỉ nhận state/action từ đây.
 * ========================================================================== */
export type { CreateWarrantyClaimInput, WarrantyClaim, WarrantyClaimStatus };

export interface WarrantyClaimSubmitState {
  submitting: boolean;
  submit: (input: CreateWarrantyClaimInput) => Promise<WriteResult<WarrantyClaim>>;
}

/** Gửi yêu cầu bảo hành cho đơn của chính khách đang đăng nhập. */
export function useWarrantyClaimSubmit(): WarrantyClaimSubmitState {
  const [submitting, setSubmitting] = useState(false);

  const submit = useCallback(async (input: CreateWarrantyClaimInput) => {
    setSubmitting(true);
    try {
      return await createWarrantyClaim(input);
    } finally {
      setSubmitting(false);
    }
  }, []);

  return { submitting, submit };
}

export interface WorkshopWarrantyClaimsState {
  claims: WarrantyClaim[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

/** Claim thuộc các đơn đã giao cho xưởng `partnerId` (lọc ở service, không lộ xưởng khác). */
export function useWorkshopWarrantyClaims(partnerId: string | null): WorkshopWarrantyClaimsState {
  const [claims, setClaims] = useState<WarrantyClaim[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!partnerId) {
      setClaims([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setClaims(await listWorkshopWarrantyClaims(partnerId));
    } catch (err) {
      setClaims([]);
      setError(err instanceof Error ? err.message : 'Không tải được yêu cầu bảo hành.');
    } finally {
      setLoading(false);
    }
  }, [partnerId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { claims, loading, error, reload };
}

export interface WarrantyClaimUpdateState {
  saving: boolean;
  save: (input: {
    id: string;
    status: WarrantyClaimStatus;
    resolution: string;
  }) => Promise<WriteResult>;
}

/** Cập nhật trạng thái/kết quả xử lý claim (RLS chỉ cho admin/lab). */
export function useWarrantyClaimUpdate(): WarrantyClaimUpdateState {
  const [saving, setSaving] = useState(false);

  const save = useCallback(
    async (input: { id: string; status: WarrantyClaimStatus; resolution: string }) => {
      setSaving(true);
      try {
        return await updateWarrantyClaim(input);
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  return { saving, save };
}
