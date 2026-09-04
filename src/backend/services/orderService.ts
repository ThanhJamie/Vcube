import { Order } from '../../types';
import { dbService } from '../supabase/database';

export type OrderStatus = Order['status'];

export class OrderService {
  static async createOrder(orderData: Omit<Order, 'id'>): Promise<Order> {
    const newOrder: Order = {
      ...orderData,
      id: `VCB-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
    };

    await dbService.saveOrder(newOrder);
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
