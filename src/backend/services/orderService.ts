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

  static async updateOrderStatus(orderId: string, status: OrderStatus): Promise<boolean> {
    const orders = await dbService.getOrders();
    const target = orders.find(o => o.id === orderId);
    if (!target) return false;

    target.status = status;
    await dbService.saveOrder(target);
    return true;
  }
}
