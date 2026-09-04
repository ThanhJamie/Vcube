import { supabase } from './client';
import { Order, Product, MaterialProfile, PrinterProfile, AppUserProfile, WorkshopPartner, AccessoryItem, SiteContentConfig, InkiriCostFormulaConfig } from '../../types';
import { 
  PRODUCTS, 
  MOCK_ORDERS, 
  MATERIALS_CATALOG, 
  PRINTER_PROFILES, 
  MOCK_APP_USERS, 
  DEFAULT_INKIRI_FORMULA_CONFIG,
  DEFAULT_SITE_CONTENT,
  WORKSHOP_PARTNERS,
  ACCESSORIES_CATALOG
} from '../../data/mockData';

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
  async saveOrder(order: Order, explicitUserId?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const customerEmail = order.shippingAddress?.email || 'guest@vcube.vn';
      const customerName = order.shippingAddress?.fullName || 'Khách Hàng VCUBE';
      const customerPhone = order.shippingAddress?.phone || '';
      const totalAmount = order.payment?.total || 0;
      const shippingFee = order.payment?.shippingFee || 0;
      const secureToken = order.secureAccessToken || `token_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

      // Pass full user_id from user account if logged in (ensuring RLS auth.uid() = user_id works)
      let userId: string | null = explicitUserId || (order as any).userId || (order as any).user_id || null;
      if (!userId) {
        try {
          const { data: authData } = await supabase.auth.getUser();
          if (authData?.user?.id) {
            userId = authData.user.id;
          }
        } catch {
          // Fallback if auth is unavailable or guest checkout
        }
      }

      const { error } = await supabase.from('orders').upsert({
        id: order.id,
        order_number: order.orderNumber,
        user_id: userId,
        date: order.date,
        estimated_delivery: order.estimatedDelivery,
        customer_email: customerEmail,
        customer_name: customerName,
        customer_phone: customerPhone,
        total_amount: totalAmount,
        shipping_fee: shippingFee,
        secure_access_token: secureToken,
        status: order.status,
        status_stage_index: order.statusStageIndex,
        layer_progress: order.layerProgress || 0,
        payment_method: order.payment?.method || 'cod',
        payment_status: order.payment?.isPaid ? 'paid' : 'unpaid',
        items: order.items,
        shipping_address: order.shippingAddress,
        carrier: order.carrier,
        payment: order.payment,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (error) {
        console.warn('Supabase DB saveOrder fallback to local:', error.message);
        const existing: Order[] = JSON.parse(localStorage.getItem('vcube_orders') || '[]');
        const updated = [{ ...order, secureAccessToken: secureToken }, ...existing.filter((o: Order) => o.id !== order.id)];
        localStorage.setItem('vcube_orders', JSON.stringify(updated));
      }
      return { success: true };
    } catch (err: any) {
      console.warn('DB error:', err);
      return { success: false, error: err?.message };
    }
  },

  async updateOrderStatus(
    orderId: string, 
    statusStageIndex: number, 
    status: string, 
    notes?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const updateData: Record<string, any> = {
        status,
        status_stage_index: statusStageIndex,
        updated_at: new Date().toISOString(),
      };
      if (notes) {
        updateData.notes = notes;
      }
      if (statusStageIndex >= 6) {
        updateData.layer_progress = 100;
      }

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId);

      // Keep localStorage in sync
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          const localOrders: Order[] = JSON.parse(localStorage.getItem('vcube_orders') || '[]');
          const idx = localOrders.findIndex((o: Order) => o.id === orderId);
          if (idx !== -1) {
            localOrders[idx].status = status as any;
            localOrders[idx].statusStageIndex = statusStageIndex;
            if (statusStageIndex >= 6) {
              localOrders[idx].layerProgress = 100;
            }
            localStorage.setItem('vcube_orders', JSON.stringify(localOrders));
          }
        }
      } catch {}

      if (error) {
        console.warn('Supabase updateOrderStatus error:', error.message);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      console.warn('DB error on updateOrderStatus:', err);
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
          layerProgress: d.layer_progress ?? d.layerProgress ?? 0,
          secureAccessToken: d.secure_access_token || d.secureAccessToken,
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

  // Guest order lookup via secure access token
  async getOrderByToken(identifier: string, token: string): Promise<Order | null> {
    try {
      // 1. Try Security Definer RPC function
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_order_by_guest_token', {
        p_order_number: identifier,
        p_token: token,
      });

      const matched = (rpcData && rpcData.length > 0) ? rpcData[0] : null;

      if (!rpcError && matched) {
        return {
          id: matched.id,
          orderNumber: matched.order_number || matched.id,
          date: matched.date || matched.created_at || new Date().toISOString(),
          estimatedDelivery: matched.estimated_delivery || '3 ngày sau khi duyệt',
          status: matched.status || 'processing',
          statusStageIndex: matched.status_stage_index ?? 1,
          layerProgress: matched.layer_progress ?? 0,
          secureAccessToken: matched.secure_access_token,
          items: matched.items || [],
          shippingAddress: matched.shipping_address || {},
          carrier: matched.carrier || {},
          payment: matched.payment || {},
        };
      }

      // 2. Direct query fallback
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .or(`order_number.eq.${identifier},id.eq.${identifier}`)
        .eq('secure_access_token', token)
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        return {
          id: data.id,
          orderNumber: data.order_number || data.id,
          date: data.date || data.created_at || new Date().toISOString(),
          estimatedDelivery: data.estimated_delivery || '3 ngày sau khi duyệt',
          status: data.status || 'processing',
          statusStageIndex: data.status_stage_index ?? 1,
          layerProgress: data.layer_progress ?? 0,
          secureAccessToken: data.secure_access_token,
          items: data.items || [],
          shippingAddress: data.shipping_address || {},
          carrier: data.carrier || {},
          payment: data.payment || {},
        };
      }
    } catch (e) {
      console.warn('Supabase getOrderByToken fallback to local:', e);
    }

    // 3. Fallback to localStorage
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const localOrders: Order[] = JSON.parse(localStorage.getItem('vcube_orders') || '[]');
        const cleanId = identifier.trim().toLowerCase();
        const found = localOrders.find(
          (o) =>
            (o.orderNumber.toLowerCase() === cleanId || o.id.toLowerCase() === cleanId) &&
            o.secureAccessToken === token
        );
        if (found) return found;
      }
    } catch {}

    return null;
  },

  // Quotes
  async saveQuote(quote: any): Promise<void> {
    try {
      await supabase.from('quotes').insert([quote]);
    } catch (e) {
      console.warn('Save quote error:', e);
    }
  },

  // Users & Multi-stakeholder Profiles
  async getUsers(): Promise<AppUserProfile[]> {
    try {
      const { data, error } = await supabase.from('user_profiles').select('*').order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        return data.map((d: any): AppUserProfile => ({
          uid: d.id,
          email: d.email,
          displayName: d.display_name,
          phone: d.phone || '',
          role: d.role || 'customer',
          company: d.company || '',
          avatarUrl: d.avatar_url || '',
          createdAt: d.created_at || new Date().toISOString(),
          lastLoginAt: d.updated_at || new Date().toISOString(),
          kycStatus: d.kyc_status || 'verified',
          accountStatus: d.account_status || 'active',
          totalOrders: Number(d.total_orders || 0),
          totalSpent: Number(d.total_spent || 0),
          notes: d.notes || '',
        }));
      }
    } catch (e) {
      console.warn('Supabase getUsers fallback to local:', e);
    }
    const local = typeof window !== 'undefined' ? localStorage.getItem('vcube_app_users') : null;
    return local ? JSON.parse(local) : MOCK_APP_USERS;
  },

  async saveUser(user: Partial<AppUserProfile> & { uid: string }): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.from('user_profiles').upsert({
        id: user.uid,
        email: user.email,
        display_name: user.displayName,
        phone: user.phone,
        role: user.role,
        company: user.company,
        avatar_url: user.avatarUrl,
        kyc_status: user.kycStatus,
        account_status: user.accountStatus,
        total_orders: user.totalOrders,
        total_spent: user.totalSpent,
        notes: user.notes,
        updated_at: new Date().toISOString(),
      });
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message };
    }
  },

  async updateUserKyc(userId: string, kycStatus: 'verified' | 'pending_review' | 'rejected' | 'unverified', notes?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.from('user_profiles').update({
        kyc_status: kycStatus,
        notes: notes || undefined,
        updated_at: new Date().toISOString(),
      }).eq('id', userId);

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message };
    }
  },

  // Materials
  async getMaterials(): Promise<MaterialProfile[]> {
    try {
      const { data, error } = await supabase.from('materials').select('*');
      if (!error && data && data.length > 0) {
        return data.map((d: any): MaterialProfile => ({
          id: d.id,
          name: d.name,
          brand: d.brand,
          density: Number(d.density || 1.24),
          strength: d.strength,
          heatResistance: d.heat_resistance,
          flexibility: d.flexibility,
          costPerKg: Number(d.cost_per_kg || 320000),
          pricePerGram: Number(d.price_per_gram || 850),
          unitPriceMultiplier: Number(d.unit_price_multiplier || 1.0),
          spoolWeightGrams: Number(d.spool_weight_grams || 1000),
          extruderTempMin: Number(d.extruder_temp_min || 200),
          extruderTempMax: Number(d.extruder_temp_max || 220),
          bedTemp: Number(d.bed_temp || 55),
          colors: Array.isArray(d.colors) ? d.colors : [],
          desc: d.desc || '',
          recommendedFor: d.recommended_for || '',
          inStock: Boolean(d.in_stock),
          stockRollsCount: Number(d.stock_rolls_count || 10),
        }));
      }
    } catch (e) {
      console.warn('Supabase getMaterials fallback to local:', e);
    }
    const local = typeof window !== 'undefined' ? localStorage.getItem('vcube_materials') : null;
    return local ? JSON.parse(local) : MATERIALS_CATALOG;
  },

  async saveMaterial(mat: MaterialProfile): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.from('materials').upsert({
        id: mat.id,
        name: mat.name,
        brand: mat.brand,
        density: mat.density,
        strength: mat.strength,
        heat_resistance: mat.heatResistance,
        flexibility: mat.flexibility,
        cost_per_kg: mat.costPerKg,
        price_per_gram: mat.pricePerGram,
        unit_price_multiplier: mat.unitPriceMultiplier,
        spool_weight_grams: mat.spoolWeightGrams,
        extruder_temp_min: mat.extruderTempMin,
        extruder_temp_max: mat.extruderTempMax,
        bed_temp: mat.bedTemp,
        colors: mat.colors,
        desc: mat.desc,
        recommended_for: mat.recommendedFor,
        in_stock: mat.inStock,
        stock_rolls_count: mat.stockRollsCount,
        updated_at: new Date().toISOString(),
      });
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message };
    }
  },

  // Printer Fleet
  async getPrinters(): Promise<PrinterProfile[]> {
    try {
      const { data, error } = await supabase.from('printer_fleet').select('*');
      if (!error && data && data.length > 0) {
        return data.map((d: any): PrinterProfile => ({
          id: d.id,
          name: d.name,
          brand: d.brand || 'Bambu Lab',
          bedDimensions: d.bed_dimensions || { x: 256, y: 256, z: 256 },
          nozzleDiameter: Number(d.nozzle_diameter || 0.4),
          technology: d.technology || 'FDM',
          powerKW: Number(d.power_kw || 0.18),
          acquisitionCost: Number(d.acquisition_cost || 30000000),
          expectedLifetimeHours: Number(d.expected_lifetime_hours || 8000),
          consumablesHourlyRate: Number(d.consumables_hourly_rate || 2000),
          hourlyRate: Number(d.hourly_rate || 25000),
          maxPrintSpeedMmS: Number(d.max_print_speed_mms || 500),
          heatedBedMaxTemp: Number(d.heated_bed_max_temp || 100),
          hasEnclosure: Boolean(d.has_enclosure),
          hasAMS: Boolean(d.has_ams),
          status: d.status || 'Idle',
        }));
      }
    } catch (e) {
      console.warn('Supabase getPrinters fallback to local:', e);
    }
    const local = typeof window !== 'undefined' ? localStorage.getItem('vcube_printers') : null;
    return local ? JSON.parse(local) : PRINTER_PROFILES;
  },

  async savePrinter(printer: PrinterProfile): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.from('printer_fleet').upsert({
        id: printer.id,
        name: printer.name,
        brand: printer.brand,
        bed_dimensions: printer.bedDimensions,
        nozzle_diameter: printer.nozzleDiameter,
        technology: printer.technology,
        power_kw: printer.powerKW,
        acquisition_cost: printer.acquisitionCost,
        expected_lifetime_hours: printer.expectedLifetimeHours,
        consumables_hourly_rate: printer.consumablesHourlyRate,
        hourly_rate: printer.hourlyRate,
        max_print_speed_mms: printer.maxPrintSpeedMmS,
        heated_bed_max_temp: printer.heatedBedMaxTemp,
        has_enclosure: printer.hasEnclosure,
        has_ams: printer.hasAMS,
        status: printer.status,
        updated_at: new Date().toISOString(),
      });
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message };
    }
  },

  // Pricing Config
  async getPricingConfig(): Promise<InkiriCostFormulaConfig> {
    try {
      const { data, error } = await supabase.from('pricing_configs').select('*').eq('is_active', true).limit(1).single();
      if (!error && data && data.config) {
        return data.config as InkiriCostFormulaConfig;
      }
      // Fallback check on singular table if legacy
      const legacyRes = await supabase.from('pricing_config').select('*').limit(1).single();
      if (!legacyRes.error && legacyRes.data && legacyRes.data.config) {
        return legacyRes.data.config as InkiriCostFormulaConfig;
      }
    } catch (e) {
      console.warn('Supabase getPricingConfig fallback to local:', e);
    }
    const local = typeof window !== 'undefined' ? localStorage.getItem('vcube_pricing_config') : null;
    return local ? JSON.parse(local) : DEFAULT_INKIRI_FORMULA_CONFIG;
  },

  async savePricingConfig(config: InkiriCostFormulaConfig): Promise<{ success: boolean; error?: string }> {
    try {
      // Keep localStorage in sync
      if (typeof window !== 'undefined') {
        localStorage.setItem('vcube_pricing_config', JSON.stringify(config));
      }

      const { error } = await supabase.from('pricing_configs').upsert({
        id: 'default-active-formula',
        config_name: 'Default Inkiri Formula v3.4',
        formula_version: 'v3.4',
        is_active: true,
        config: config,
        updated_at: new Date().toISOString(),
      });
      if (error) {
        // Fallback upsert on legacy table if present
        await supabase.from('pricing_config').upsert({
          id: 'default-active-formula',
          config: config,
          updated_at: new Date().toISOString(),
        });
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message };
    }
  },

  // Site Content & CMS
  async getSiteContent(): Promise<SiteContentConfig> {
    try {
      const { data, error } = await supabase.from('site_content').select('*').limit(1).single();
      if (!error && data) {
        return {
          ...DEFAULT_SITE_CONTENT,
          heroBadge: data.hero_badge || DEFAULT_SITE_CONTENT.heroBadge,
          heroHeadline: data.hero_title || DEFAULT_SITE_CONTENT.heroHeadline,
          heroSubheadline: data.hero_subtitle || DEFAULT_SITE_CONTENT.heroSubheadline,
          hotline: data.phone || DEFAULT_SITE_CONTENT.hotline,
          contactEmail: data.email || DEFAULT_SITE_CONTENT.contactEmail,
          hanoiWorkshopAddress: data.hanoi_workshop_address || DEFAULT_SITE_CONTENT.hanoiWorkshopAddress,
          hcmWorkshopAddress: data.hcm_workshop_address || DEFAULT_SITE_CONTENT.hcmWorkshopAddress,
          announcementText: data.announcement_text || DEFAULT_SITE_CONTENT.announcementText,
          announcementActive: data.announcement_enabled ?? DEFAULT_SITE_CONTENT.announcementActive,
        };
      }
    } catch (e) {
      console.warn('Supabase getSiteContent fallback to local:', e);
    }
    const local = typeof window !== 'undefined' ? localStorage.getItem('vcube_site_content') : null;
    return local ? JSON.parse(local) : DEFAULT_SITE_CONTENT;
  },

  async saveSiteContent(content: SiteContentConfig): Promise<{ success: boolean; error?: string }> {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('vcube_site_content', JSON.stringify(content));
      }
      const { error } = await supabase.from('site_content').upsert({
        id: 'default',
        hero_badge: content.heroBadge,
        hero_title: content.heroHeadline,
        hero_subtitle: content.heroSubheadline,
        phone: content.hotline,
        email: content.contactEmail,
        hanoi_workshop_address: content.hanoiWorkshopAddress,
        hcm_workshop_address: content.hcmWorkshopAddress,
        announcement_text: content.announcementText,
        announcement_enabled: content.announcementActive,
        updated_at: new Date().toISOString(),
      });
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message };
    }
  },

  // Banking Idempotency: Record Payment Transaction
  async recordPaymentTransaction(tx: {
    orderId: string;
    transactionId: string;
    amount: number;
    gateway?: string;
    payload?: any;
  }): Promise<{ success: boolean; error?: string; alreadyProcessed?: boolean }> {
    try {
      const { error } = await supabase.from('payment_transactions').insert({
        id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        order_id: tx.orderId,
        transaction_id: tx.transactionId,
        amount: tx.amount,
        payment_gateway: tx.gateway || 'vietqr',
        payload: tx.payload || {},
        status: 'success',
      });
      if (error) {
        if (error.code === '23505') {
          // Unique constraint violation on transaction_id
          return { success: true, alreadyProcessed: true };
        }
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message };
    }
  },

  // Workshop Partners
  async getWorkshopPartners(): Promise<WorkshopPartner[]> {
    try {
      const { data, error } = await supabase.from('workshop_partners').select('*').order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        return data.map((d: any): WorkshopPartner => ({
          id: d.id,
          name: d.name,
          region: (d.region || 'hanoi') as 'hanoi' | 'danang' | 'hcm',
          address: d.address || '',
          contactPerson: d.contact_person || 'Kỹ sư quản trị xưởng',
          phone: d.phone || '',
          email: d.email || '',
          supportedTechnologies: Array.isArray(d.supported_technologies) ? d.supported_technologies : ['FDM'],
          maxBuildVolume: d.max_build_volume || { x: 450, y: 450, z: 500 },
          activePrintersCount: Number(d.active_jobs_count || d.active_printers_count || 10),
          availablePrintersCount: Number(d.available_printers_count || 4),
          slaRating: Number(d.rating || d.sla_rating || 4.9),
          completedJobsCount: Number(d.completed_jobs_count || 500),
          currentQueueLength: Number(d.current_queue_length || 6.5),
          inStockMaterials: Array.isArray(d.in_stock_materials) ? d.in_stock_materials : ['PLA Pro', 'PETG Technical Pro', 'ABS Industrial'],
          status: (d.capacity_status === 'available' || d.status === 'active') ? 'active' : (d.capacity_status || d.status || 'active') as any,
        }));
      }
    } catch (e) {
      console.warn('Supabase getWorkshopPartners fallback to local:', e);
    }
    const local = typeof window !== 'undefined' ? localStorage.getItem('vcube_workshop_partners') : null;
    return local ? JSON.parse(local) : WORKSHOP_PARTNERS;
  },

  async saveWorkshopPartner(partner: WorkshopPartner): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.from('workshop_partners').upsert({
        id: partner.id,
        name: partner.name,
        code: `WS-${partner.region.toUpperCase()}-${partner.id.substring(0, 4).toUpperCase()}`,
        region: partner.region,
        address: partner.address,
        phone: partner.phone,
        email: partner.email,
        capacity_status: partner.status === 'active' ? 'available' : partner.status,
        rating: partner.slaRating,
        sla_on_time_rate: 98.5,
        active_jobs_count: partner.activePrintersCount,
        supported_technologies: partner.supportedTechnologies,
        updated_at: new Date().toISOString(),
      });
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message };
    }
  },

  // Accessories & Hardware Add-ons
  async getAccessories(): Promise<AccessoryItem[]> {
    try {
      const { data, error } = await supabase.from('accessories').select('*').order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        return data.map((d: any): AccessoryItem => ({
          id: d.id,
          name: d.name,
          nameEn: d.name_en || d.name,
          category: (d.type || d.category || 'hardware') as any,
          unit: d.unit || 'cái',
          costPrice: Number(d.cost_price || Math.round((d.price || 0) * 0.5)),
          sellingPrice: Number(d.price ?? d.selling_price ?? 0),
          sku: d.sku || `ACC-${d.id.substring(0, 6).toUpperCase()}`,
          stockCount: Number(d.stock_quantity ?? d.stock_count ?? 0),
          lowStockThreshold: Number(d.low_stock_threshold || 10),
          warehouseLocation: d.warehouse_location || 'Kệ A1 - Hộc 01',
          supplier: d.supplier || 'VCUBE Fab Hub',
          description: d.description || '',
          imageUrl: d.image_url || '',
          isActive: Boolean(d.in_stock ?? d.is_active ?? true),
          compatibleWith: Array.isArray(d.compatible_with) ? d.compatible_with : ['Móc khóa', 'Vỏ hộp IoT', 'Đồ gá'],
        }));
      }
    } catch (e) {
      console.warn('Supabase getAccessories fallback to local:', e);
    }
    const local = typeof window !== 'undefined' ? localStorage.getItem('vcube_accessories') : null;
    return local ? JSON.parse(local) : ACCESSORIES_CATALOG;
  },

  async saveAccessory(acc: AccessoryItem): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.from('accessories').upsert({
        id: acc.id,
        name: acc.name,
        type: acc.category,
        price: acc.sellingPrice,
        in_stock: acc.isActive && acc.stockCount > 0,
        stock_quantity: acc.stockCount,
        description: acc.description,
        updated_at: new Date().toISOString(),
      });
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message };
    }
  },
};

