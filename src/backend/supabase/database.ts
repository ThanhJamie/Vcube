import { supabase } from './client';
import { Order } from '../../types';

export const dbService = {
  // Orders
  async saveOrder(order: Order): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.from('orders').upsert({
        id: order.id,
        order_number: order.orderNumber,
        date: order.date,
        estimated_delivery: order.estimatedDelivery,
        status: order.status,
        status_stage_index: order.statusStageIndex,
        items: order.items,
        shipping_address: order.shippingAddress,
        carrier: order.carrier,
        payment: order.payment,
        created_at: new Date().toISOString(),
      });

      if (error) {
        console.warn('Supabase DB saveOrder fallback to local:', error.message);
        const existing: Order[] = JSON.parse(localStorage.getItem('vcube_orders') || '[]');
        const updated = [order, ...existing.filter((o: Order) => o.id !== order.id)];
        localStorage.setItem('vcube_orders', JSON.stringify(updated));
      }
      return { success: true };
    } catch (err: any) {
      console.warn('DB error:', err);
      return { success: false, error: err?.message };
    }
  },

  async getOrders(userEmail?: string): Promise<Order[]> {
    try {
      let query = supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (userEmail) {
        query = query.eq('customer_email', userEmail);
      }
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data.map((d: any): Order => ({
          id: d.id,
          orderNumber: d.order_number || d.id,
          date: d.date || d.created_at || new Date().toISOString(),
          estimatedDelivery: d.estimated_delivery || '3 ngày sau khi duyệt',
          status: d.status || 'processing',
          statusStageIndex: d.status_stage_index ?? 1,
          items: d.items || [],
          shippingAddress: d.shipping_address || {
            fullName: 'Khách hàng',
            phone: '0900000000',
            address: '',
            city: 'Hà Nội',
            district: '',
          },
          carrier: d.carrier || {
            name: 'Viettel Post',
            trackingCode: 'VTP' + Math.floor(100000 + Math.random() * 900000),
          },
          payment: d.payment || {
            method: 'Chuyển khoản QR Techcombank',
            paidDate: new Date().toISOString(),
            subtotalPhysical: 0,
            subtotalDigital: 0,
            shippingFee: 30000,
            discount: 0,
            total: 30000,
            isPaid: true,
          },
        }));
      }
    } catch (e) {
      console.warn('Supabase getOrders query error:', e);
    }
    // Fallback to local storage
    const local = localStorage.getItem('vcube_orders');
    return local ? JSON.parse(local) : [];
  },

  // Quotes
  async saveQuote(quote: any): Promise<void> {
    try {
      await supabase.from('quotes').insert([quote]);
    } catch (e) {
      console.warn('Save quote error:', e);
    }
  },
};
