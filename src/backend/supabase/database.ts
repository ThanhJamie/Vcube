import { supabase } from './client';
import { Order, Product } from '../../types';
import { PRODUCTS } from '../../data/mockData';

export const dbService = {
  // Products
  async getProducts(filterParams?: { status?: string; category?: string; limit?: number; offset?: number }): Promise<Product[]> {
    try {
      let query = supabase.from('products').select('*');
      
      if (filterParams?.status) {
        query = query.eq('status', filterParams.status.toLowerCase());
      }
      if (filterParams?.category && filterParams.category !== 'all') {
        query = query.eq('category', filterParams.category);
      }
      if (filterParams?.limit) {
        const offset = filterParams.offset || 0;
        query = query.range(offset, offset + filterParams.limit - 1);
      }
      
      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data.map((d: any): Product => ({
          id: d.id,
          sku: d.sku || `VC-${Math.floor(1000 + Math.random() * 9000)}`,
          name: d.name,
          category: d.category,
          designer: d.designer || 'VCUBE Engineering',
          pricePhysical: Number(d.price_physical ?? d.pricePhysical ?? 0),
          priceDigital: Number(d.price_digital ?? d.priceDigital ?? 0),
          images: Array.isArray(d.images) ? d.images : [d.images].filter(Boolean),
          thumbnailUrl: d.thumbnail_url || (Array.isArray(d.images) ? d.images[0] : ''),
          cadFileUrl: d.cad_file_url || '',
          cadFormat: d.cad_format || 'STL',
          fileSizeBytes: Number(d.file_size_bytes || 0),
          description: d.description || '',
          features: Array.isArray(d.features) ? d.features : [],
          specs: d.specs || {
            dimensions: '80 x 80 x 40 mm',
            weight: '60g',
            resolution: '0.12mm',
            infillDefault: '35%',
            technology: 'FDM Industrial'
          },
          supportedMaterials: Array.isArray(d.supported_materials || d.supportedMaterials) ? (d.supported_materials || d.supportedMaterials) : ['PLA Tough'],
          colors: Array.isArray(d.colors) ? d.colors : [{ name: 'Đen Kỹ Thuật', hex: '#1C1C1C', available: true }],
          tags: Array.isArray(d.tags) ? d.tags : [],
          badge: d.badge || '',
          rating: Number(d.rating || 5.0),
          reviewsCount: Number(d.reviews_count || d.reviewsCount || 0),
          printsCount: Number(d.prints_count || d.printsCount || 0),
          printTime: d.print_time || d.printTime || '2h',
          isCustomizable: Boolean(d.is_customizable ?? d.isCustomizable ?? false),
          status: (d.status ? d.status.toLowerCase() : 'published') as any,
          productionReadiness: d.production_readiness || d.productionReadiness || 'ready_to_print'
        }));
      }
    } catch (e) {
      console.warn('Supabase getProducts query fallback to local:', e);
    }
    const local = localStorage.getItem('vcube_products');
    return local ? JSON.parse(local) : PRODUCTS;
  },

  async saveProduct(product: Product): Promise<{ success: boolean; error?: string }> {
    try {
      const normalizedStatus = (product.status ? product.status.toLowerCase() : 'published');
      const { error } = await supabase.from('products').upsert({
        id: product.id,
        sku: product.sku,
        name: product.name,
        category: product.category,
        designer: product.designer,
        price_physical: product.pricePhysical,
        price_digital: product.priceDigital,
        images: product.images,
        thumbnail_url: product.thumbnailUrl || product.images?.[0] || '',
        cad_file_url: product.cadFileUrl || '',
        cad_format: product.cadFormat || 'STL',
        file_size_bytes: product.fileSizeBytes || 0,
        description: product.description,
        features: product.features,
        specs: product.specs,
        supported_materials: product.supportedMaterials,
        colors: product.colors,
        tags: product.tags,
        badge: product.badge,
        rating: product.rating,
        reviews_count: product.reviewsCount,
        prints_count: product.printsCount,
        print_time: product.printTime,
        is_customizable: product.isCustomizable,
        status: normalizedStatus,
        production_readiness: product.productionReadiness || 'ready_to_print',
        updated_at: new Date().toISOString()
      });
      if (error) {
        console.warn('Supabase saveProduct error (falling back to local):', error.message);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      console.warn('DB error on saveProduct:', err);
      return { success: false, error: err?.message };
    }
  },

  async deleteProduct(productId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.from('products').delete().eq('id', productId);
      if (error) {
        console.warn('Supabase deleteProduct error:', error.message);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      console.warn('DB error on deleteProduct:', err);
      return { success: false, error: err?.message };
    }
  },

  // Seed initial products if DB is empty
  async seedInitialProductsIfEmpty(): Promise<boolean> {
    try {
      const { data, count, error } = await supabase.from('products').select('id', { count: 'exact', head: true });
      if (!error && (count === 0 || !data || data.length === 0)) {
        console.info('Products table is empty. Seeding initial catalog from mockData...');
        const payload = PRODUCTS.map(p => ({
          id: p.id,
          sku: p.sku || `VC-${Math.floor(1000 + Math.random() * 9000)}`,
          name: p.name,
          category: p.category,
          designer: p.designer,
          price_physical: p.pricePhysical,
          price_digital: p.priceDigital,
          images: p.images,
          thumbnail_url: p.images[0] || '',
          cad_file_url: p.cadFileUrl || '',
          cad_format: p.cadFormat || 'STL',
          description: p.description,
          features: p.features,
          specs: p.specs,
          supported_materials: p.supportedMaterials,
          colors: p.colors,
          tags: p.tags,
          badge: p.badge,
          rating: p.rating,
          reviews_count: p.reviewsCount,
          prints_count: p.printsCount,
          print_time: p.printTime,
          is_customizable: p.isCustomizable,
          status: 'published',
          production_readiness: p.productionReadiness || 'ready_to_print',
        }));
        const { error: seedError } = await supabase.from('products').upsert(payload, { onConflict: 'id' });
        if (seedError) {
          console.warn('Could not seed initial products:', seedError.message);
          return false;
        }
        return true;
      }
    } catch (e) {
      console.warn('seedInitialProductsIfEmpty error:', e);
    }
    return false;
  },

  // Supabase Storage: Upload product image
  async uploadProductImage(file: File): Promise<{ url?: string; error?: string }> {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
      const filePath = `products/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('product-images').upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

      if (uploadError) {
        return { error: uploadError.message };
      }

      const { data } = supabase.storage.from('product-images').getPublicUrl(filePath);
      return { url: data.publicUrl };
    } catch (err: any) {
      return { error: err?.message || 'Upload failed' };
    }
  },

  // Supabase Storage: Upload CAD file (.stl, .step, .3mf)
  async uploadCadFile(file: File): Promise<{ path?: string; error?: string }> {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
      const filePath = `cad/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('cad-files').upload(filePath, file, {
        upsert: false
      });

      if (uploadError) {
        return { error: uploadError.message };
      }

      return { path: filePath };
    } catch (err: any) {
      return { error: err?.message || 'CAD Upload failed' };
    }
  },

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

