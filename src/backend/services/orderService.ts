import { Order } from '../../types';
import { dbService } from '../supabase/database';

export type OrderStatus = Order['status'];

/**
 * Tham số ghi đơn KHÔNG nằm trong `Order`, vì chúng khác kiểu dữ liệu với thứ `Order` mang:
 *   * `Order.date` là chuỗi HIỂN THỊ ("13/9/2026 14:05") để render;
 *   * `orders.date` là `timestamptz`.
 * Trộn hai thứ này chính là lỗi `22008 date/time field value out of range` ở checkout.
 */
export interface CreateOrderOptions {
  /** `auth.uid()` của người đang đăng nhập; bỏ trống cho khách vãng lai. */
  userId?: string;
  /** ISO-8601 ghi vào `orders.date` (timestamptz). KHÔNG truyền chuỗi hiển thị. */
  createdAtIso?: string;
  /** Xưởng nhận đơn (`orders.assigned_workshop_id`); null/undefined = chưa giao xưởng. */
  assignedWorkshopId?: string | null;
}

export class OrderService {
  /**
   * Tạo đơn THẬT trong Supabase.
   *
   * NÉM LỖI nếu DB từ chối. Người gọi (CheckoutView) chỉ được hiện màn hình thành công
   * khi hàm này trả về bình thường — đơn chỉ tồn tại khi DB đã nhận
   * (`docs/design/data-honesty.md` OT-03).
   */
  static async createOrder(orderData: Omit<Order, 'id'>, options: CreateOrderOptions = {}): Promise<Order> {
    const newOrder: Order = {
      ...orderData,
      id: `VCB-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
    };

    const result = await dbService.saveOrder(newOrder, options.userId, {
      createdAtIso: options.createdAtIso,
      assignedWorkshopId: options.assignedWorkshopId ?? null,
    });

    if (!result.success) {
      throw new Error(result.error || 'Không lưu được đơn hàng vào cơ sở dữ liệu.');
    }
    return newOrder;
  }

  static async getOrdersByCustomer(email: string): Promise<Order[]> {
    return await dbService.getOrders(email);
  }

  static async updateOrderStatus(orderId: string, status: OrderStatus, stageIndex?: number, notes?: string): Promise<boolean> {
    const stageMap: Record<OrderStatus, number> = {
      pending_payment: 0,
      processing: 1,
      printing: 2,
      post_processing: 3,
      packaging: 4,
      shipping: 5,
      completed: 6,
      cancelled: 7,
    };
    const resolvedStage = stageIndex ?? stageMap[status] ?? 1;
    const res = await dbService.updateOrderStatus(orderId, resolvedStage, status, notes);
    return res.success;
  }
}
