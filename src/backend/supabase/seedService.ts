import { supabase, isSupabaseConfigured } from './client';
import { 
  PRODUCTS, 
  MOCK_ORDERS, 
  MATERIALS_CATALOG, 
  PRINTER_PROFILES, 
  DEFAULT_INKIRI_FORMULA_CONFIG,
  MOCK_APP_USERS,
  ACCESSORIES_CATALOG,
  WORKSHOP_PARTNERS,
  DEFAULT_SITE_CONTENT
} from '../../data/mockData';
import { Product, Order, MaterialProfile, PrinterProfile, AccessoryItem, WorkshopPartner } from '../../types';

export interface SyncHealthReport {
  ok: boolean;
  latencyMs: number;
  message: string;
  configured: boolean;
}

export interface TableCountsReport {
  products: number;
  orders: number;
  user_profiles: number;
  materials: number;
  printer_fleet: number;
  pricing_config: number;
  kyc_records: number;
  accessories: number;
  workshop_partners: number;
}

export interface SeedResult {
  success: boolean;
  counts: Record<string, number>;
  errors: string[];
  timestamp: string;
}

export const seedService = {
  /**
   * Pings Supabase to check connection and response latency
   */
  async checkSupabaseHealth(): Promise<SyncHealthReport> {
    if (!isSupabaseConfigured) {
      return {
        ok: false,
        latencyMs: 0,
        message: 'Supabase URL hoặc Anon Key chưa được cấu hình đầy đủ.',
        configured: false,
      };
    }

    const start = performance.now();
    try {
      // Query light head request to check connection
      const { error } = await supabase.from('products').select('id', { count: 'exact', head: true });
      const latencyMs = Math.round(performance.now() - start);

      if (error) {
        return {
          ok: false,
          latencyMs,
          message: `Supabase phản hồi lỗi: ${error.message} (Mã: ${error.code})`,
          configured: true,
        };
      }

      return {
        ok: true,
        latencyMs,
        message: `Kết nối Supabase Cloud hoàn tất (${latencyMs}ms)`,
        configured: true,
      };
    } catch (err: any) {
      return {
        ok: false,
        latencyMs: Math.round(performance.now() - start),
        message: `Không thể kết nối Supabase: ${err?.message || 'Lỗi mạng'}`,
        configured: true,
      };
    }
  },

  /**
   * Queries real-time record counts for all 9 primary VCUBE tables
   */
  async getTableCounts(): Promise<TableCountsReport> {
    const counts: TableCountsReport = {
      products: 0,
      orders: 0,
      user_profiles: 0,
      materials: 0,
      printer_fleet: 0,
      pricing_config: 0,
      kyc_records: 0,
      accessories: 0,
      workshop_partners: 0,
    };

    const tables = [
      'products',
      'orders',
      'user_profiles',
      'materials',
      'printer_fleet',
      'pricing_config',
      'kyc_records',
      'accessories',
      'workshop_partners',
    ] as const;

    await Promise.allSettled(
      tables.map(async (table) => {
        try {
          const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
          if (!error && count !== null) {
            counts[table] = count;
          } else if (table === 'pricing_config') {
            // Check master production table pricing_configs
            const { count: altCount, error: altErr } = await supabase.from('pricing_configs').select('*', { count: 'exact', head: true });
            if (!altErr && altCount !== null) {
              counts.pricing_config = altCount;
            }
          }
        } catch {
          // Table doesn't exist yet or connection issue
        }
      })
    );

    return counts;
  },

  /**
   * 1-Click Cloud Sync: Seeds all mock data into Supabase tables
   */
  async seedAllToSupabase(): Promise<SeedResult> {
    const counts: Record<string, number> = {
      products: 0,
      orders: 0,
      user_profiles: 0,
      materials: 0,
      printer_fleet: 0,
      pricing_config: 0,
      kyc_records: 0,
      accessories: 0,
      workshop_partners: 0,
    };
    const errors: string[] = [];

    // 1. Seed Products
    try {
      const productPayload = PRODUCTS.map((p) => ({
        id: p.id,
        sku: p.sku || `VC-${Math.floor(1000 + Math.random() * 9000)}`,
        name: p.name,
        category: p.category,
        designer: p.designer,
        price_physical: p.pricePhysical,
        price_digital: p.priceDigital,
        images: p.images,
        thumbnail_url: p.thumbnailUrl || p.images?.[0] || '',
        cad_file_url: p.cadFileUrl || '',
        cad_format: p.cadFormat || 'STL',
        file_size_bytes: p.fileSizeBytes || 0,
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
        is_customizable: Boolean(p.isCustomizable),
        status: (p.status ? p.status.toLowerCase() : 'published'),
        production_readiness: p.productionReadiness || 'ready_to_print',
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase.from('products').upsert(productPayload, { onConflict: 'id' });
      if (error) {
        errors.push(`Products: ${error.message}`);
      } else {
        counts.products = productPayload.length;
      }
    } catch (e: any) {
      errors.push(`Products: ${e?.message}`);
    }

    // 2. Seed Orders
    try {
      const orderPayload = MOCK_ORDERS.map((o) => ({
        id: o.id,
        order_number: o.orderNumber,
        date: o.date,
        estimated_delivery: o.estimatedDelivery,
        customer_email: o.shippingAddress?.email || 'customer@vcube.vn',
        customer_name: o.shippingAddress?.fullName || 'Khách Hàng VCUBE',
        customer_phone: o.shippingAddress?.phone || '0901234567',
        total_amount: o.payment?.total || 0,
        shipping_fee: o.payment?.shippingFee || 30000,
        secure_access_token: o.secureAccessToken || `token_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        status: o.status || 'processing',
        status_stage_index: o.statusStageIndex ?? 1,
        layer_progress: o.layerProgress || 0,
        payment_method: o.payment?.method || 'Chuyển khoản QR Techcombank',
        payment_status: o.payment?.isPaid ? 'paid' : 'unpaid',
        items: o.items || [],
        shipping_address: o.shippingAddress || {},
        carrier: o.carrier || {},
        payment: o.payment || {},
        created_at: new Date().toISOString(),
      }));

      const { error } = await supabase.from('orders').upsert(orderPayload, { onConflict: 'id' });
      if (error) {
        errors.push(`Orders: ${error.message}`);
      } else {
        counts.orders = orderPayload.length;
      }
    } catch (e: any) {
      errors.push(`Orders: ${e?.message}`);
    }

    // 3. Seed User Profiles & KYC Records
    try {
      const userPayload = MOCK_APP_USERS.map((u) => ({
        id: u.uid,
        email: u.email,
        display_name: u.displayName,
        phone: u.phone,
        role: u.role,
        tier: u.role === 'customer' ? 'Pro Engineer' : u.role === 'designer' ? 'Master Designer' : u.role === 'lab' ? 'Enterprise CNC' : 'Standard',
        kyc_status: u.kycStatus || 'verified',
        account_status: u.accountStatus || 'active',
        avatar_url: u.avatarUrl || '',
        company: u.company || '',
        total_orders: u.totalOrders || 0,
        total_spent: u.totalSpent || 0,
        notes: u.notes || '',
        created_at: u.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      const { error: userError } = await supabase.from('user_profiles').upsert(userPayload, { onConflict: 'id' });
      if (userError) {
        errors.push(`User Profiles: ${userError.message}`);
      } else {
        counts.user_profiles = userPayload.length;
      }

      // KYC records for verified/pending users
      const kycPayload = MOCK_APP_USERS.filter((u) => u.kycDocumentNumber || u.company).map((u, idx) => ({
        id: `kyc-${u.uid.replace('usr-', '')}`,
        user_id: u.uid,
        company_name: u.company || `${u.displayName} Enterprise`,
        tax_code: `0${Math.floor(100000000 + idx * 12345678)}`,
        id_number: u.kycDocumentNumber || `00109${Math.floor(1000000 + idx * 23456)}`,
        bank_name: idx % 2 === 0 ? 'Vietcombank - CN Thăng Long' : 'Techcombank - CN Hội Sở',
        bank_account: `1903${Math.floor(10000000 + idx * 987654)}`,
        submitted_at: u.kycSubmittedAt || u.createdAt,
        verified_at: u.kycVerifiedAt || null,
        status: u.kycStatus === 'verified' ? 'approved' : u.kycStatus === 'pending' ? 'pending' : 'rejected',
        notes: u.notes || 'Đã kiểm tra căn cước công dân và xác minh thực thể.',
      }));

      if (kycPayload.length > 0) {
        const { error: kycError } = await supabase.from('kyc_records').upsert(kycPayload, { onConflict: 'id' });
        if (kycError) {
          errors.push(`KYC Records: ${kycError.message}`);
        } else {
          counts.kyc_records = kycPayload.length;
        }
      }
    } catch (e: any) {
      errors.push(`Users/KYC: ${e?.message}`);
    }

    // 4. Seed Materials Catalog
    try {
      const materialPayload = MATERIALS_CATALOG.map((m) => ({
        id: m.id,
        name: m.name,
        brand: m.brand,
        density: m.density,
        strength: m.strength,
        heat_resistance: m.heatResistance,
        flexibility: m.flexibility,
        cost_per_kg: m.costPerKg,
        price_per_gram: m.pricePerGram,
        unit_price_multiplier: m.unitPriceMultiplier,
        spool_weight_grams: m.spoolWeightGrams,
        extruder_temp_min: m.extruderTempMin,
        extruder_temp_max: m.extruderTempMax,
        bed_temp: m.bedTemp,
        colors: m.colors,
        desc: m.desc,
        recommended_for: m.recommendedFor,
        in_stock: m.inStock,
        stock_rolls_count: m.stockRollsCount || 10,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase.from('materials').upsert(materialPayload, { onConflict: 'id' });
      if (error) {
        errors.push(`Materials: ${error.message}`);
      } else {
        counts.materials = materialPayload.length;
      }
    } catch (e: any) {
      errors.push(`Materials: ${e?.message}`);
    }

    // 5. Seed Printer Fleet
    try {
      const printerPayload = PRINTER_PROFILES.map((p) => ({
        id: p.id,
        name: p.name,
        brand: p.brand,
        bed_dimensions: p.bedDimensions,
        nozzle_diameter: p.nozzleDiameter,
        technology: p.technology,
        power_kw: p.powerKW,
        acquisition_cost: p.acquisitionCost,
        expected_lifetime_hours: p.expectedLifetimeHours,
        consumables_hourly_rate: p.consumablesHourlyRate,
        hourly_rate: p.hourlyRate,
        max_print_speed_mms: p.maxPrintSpeedMmS || 500,
        heated_bed_max_temp: p.heatedBedMaxTemp || 100,
        has_enclosure: p.hasEnclosure ?? true,
        has_ams: p.hasAMS ?? false,
        status: p.status,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase.from('printer_fleet').upsert(printerPayload, { onConflict: 'id' });
      if (error) {
        errors.push(`Printer Fleet: ${error.message}`);
      } else {
        counts.printer_fleet = printerPayload.length;
      }
    } catch (e: any) {
      errors.push(`Printer Fleet: ${e?.message}`);
    }

    // 6. Seed Pricing Configuration
    try {
      // 6.1 Upsert into master production table 'pricing_configs'
      const masterPricingPayload = [
        {
          id: 'default-active-formula',
          config_name: 'Default Inkiri Formula v3.4',
          formula_version: 'v3.4',
          is_active: true,
          config: DEFAULT_INKIRI_FORMULA_CONFIG,
          updated_at: new Date().toISOString(),
        },
      ];

      const { error: masterErr } = await supabase.from('pricing_configs').upsert(masterPricingPayload, { onConflict: 'id' });

      // 6.2 Also attempt legacy table if present
      const pricingPayload = [
        {
          id: 'pricing-inkiri-standard',
          key: 'inkiri_standard_v2',
          config: DEFAULT_INKIRI_FORMULA_CONFIG,
          updated_at: new Date().toISOString(),
        },
      ];

      const { error: legacyErr } = await supabase.from('pricing_config').upsert(pricingPayload, { onConflict: 'id' });

      if (masterErr && legacyErr) {
        errors.push(`Pricing Config: ${masterErr.message || legacyErr.message}`);
      } else {
        counts.pricing_config = 1;
      }
    } catch (e: any) {
      errors.push(`Pricing Config: ${e?.message}`);
    }

    // 7. Seed Accessories Catalog
    try {
      const accessoryPayload = ACCESSORIES_CATALOG.map((acc) => ({
        id: acc.id,
        name: acc.name,
        type: acc.category,
        price: acc.sellingPrice,
        in_stock: acc.isActive && acc.stockCount > 0,
        stock_quantity: acc.stockCount,
        description: acc.description || '',
        updated_at: new Date().toISOString(),
      }));

      const { error: accError } = await supabase.from('accessories').upsert(accessoryPayload, { onConflict: 'id' });
      if (accError) {
        errors.push(`Accessories: ${accError.message}`);
      } else {
        counts.accessories = accessoryPayload.length;
      }
    } catch (e: any) {
      errors.push(`Accessories: ${e?.message}`);
    }

    // 8. Seed Workshop Partners
    try {
      const workshopPayload = WORKSHOP_PARTNERS.map((ws) => ({
        id: ws.id,
        name: ws.name,
        code: `WS-${ws.region.toUpperCase()}-${ws.id.substring(0, 4).toUpperCase()}`,
        region: ws.region,
        address: ws.address,
        phone: ws.phone,
        email: ws.email,
        capacity_status: ws.status === 'active' ? 'available' : ws.status,
        rating: ws.slaRating,
        sla_on_time_rate: 98.5,
        active_jobs_count: ws.activePrintersCount,
        supported_technologies: ws.supportedTechnologies,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      const { error: wsError } = await supabase.from('workshop_partners').upsert(workshopPayload, { onConflict: 'id' });
      if (wsError) {
        errors.push(`Workshop Partners: ${wsError.message}`);
      } else {
        counts.workshop_partners = workshopPayload.length;
      }
    } catch (e: any) {
      errors.push(`Workshop Partners: ${e?.message}`);
    }

    // 9. Seed Site Content & CMS
    try {
      const sitePayload = {
        id: 'default',
        hero_badge: DEFAULT_SITE_CONTENT.heroBadge,
        hero_title: DEFAULT_SITE_CONTENT.heroHeadline,
        hero_subtitle: DEFAULT_SITE_CONTENT.heroSubheadline,
        phone: DEFAULT_SITE_CONTENT.hotline,
        email: DEFAULT_SITE_CONTENT.contactEmail,
        hanoi_workshop_address: DEFAULT_SITE_CONTENT.hanoiWorkshopAddress,
        hcm_workshop_address: DEFAULT_SITE_CONTENT.hcmWorkshopAddress,
        announcement_text: DEFAULT_SITE_CONTENT.announcementText,
        announcement_enabled: DEFAULT_SITE_CONTENT.announcementActive,
        updated_at: new Date().toISOString(),
      };
      await supabase.from('site_content').upsert(sitePayload, { onConflict: 'id' });
    } catch (e: any) {
      errors.push(`Site Content: ${e?.message}`);
    }

    // Also update localStorage caches to match
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('vcube_products', JSON.stringify(PRODUCTS));
        localStorage.setItem('vcube_orders', JSON.stringify(MOCK_ORDERS));
        localStorage.setItem('vcube_materials', JSON.stringify(MATERIALS_CATALOG));
        localStorage.setItem('vcube_printers', JSON.stringify(PRINTER_PROFILES));
        localStorage.setItem('vcube_app_users', JSON.stringify(MOCK_APP_USERS));
        localStorage.setItem('vcube_pricing_config', JSON.stringify(DEFAULT_INKIRI_FORMULA_CONFIG));
        localStorage.setItem('vcube_accessories', JSON.stringify(ACCESSORIES_CATALOG));
        localStorage.setItem('vcube_workshop_partners', JSON.stringify(WORKSHOP_PARTNERS));
        localStorage.setItem('vcube_site_content', JSON.stringify(DEFAULT_SITE_CONTENT));
        localStorage.setItem('vcube_last_cloud_sync', new Date().toISOString());
      }
    } catch {
      // Ignore localStorage in non-browser context
    }

    return {
      success: errors.length === 0,
      counts,
      errors,
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * Syncs latest data from Supabase to client localStorage
   */
  async syncFromSupabase(): Promise<{
    products: Product[];
    orders: Order[];
    materials: MaterialProfile[];
    printers: PrinterProfile[];
    users: any[];
    accessories: AccessoryItem[];
    workshopPartners: WorkshopPartner[];
    syncTime: string;
  }> {
    const result = {
      products: PRODUCTS,
      orders: MOCK_ORDERS,
      materials: MATERIALS_CATALOG,
      printers: PRINTER_PROFILES,
      users: MOCK_APP_USERS,
      accessories: ACCESSORIES_CATALOG,
      workshopPartners: WORKSHOP_PARTNERS,
      syncTime: new Date().toISOString(),
    };

    try {
      // Products
      const { data: dbProducts } = await supabase.from('products').select('*');
      if (dbProducts && dbProducts.length > 0) {
        result.products = dbProducts.map((d: any): Product => ({
          id: d.id,
          sku: d.sku || `VC-${d.id.substring(0, 4)}`,
          name: d.name,
          category: d.category,
          designer: d.designer || 'VCUBE Engineering',
          pricePhysical: Number(d.price_physical ?? 0),
          priceDigital: Number(d.price_digital ?? 0),
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
          supportedMaterials: Array.isArray(d.supported_materials) ? d.supported_materials : ['PLA Tough'],
          colors: Array.isArray(d.colors) ? d.colors : [{ name: 'Đen Kỹ Thuật', hex: '#1C1C1C', available: true }],
          tags: Array.isArray(d.tags) ? d.tags : [],
          badge: d.badge || '',
          rating: Number(d.rating || 5.0),
          reviewsCount: Number(d.reviews_count || 0),
          printsCount: Number(d.prints_count || 0),
          printTime: d.print_time || '2h',
          isCustomizable: Boolean(d.is_customizable),
          status: (d.status ? d.status.toLowerCase() : 'published') as any,
          productionReadiness: d.production_readiness || 'ready_to_print'
        }));
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem('vcube_products', JSON.stringify(result.products));
        }
      }

      // Orders
      const { data: dbOrders } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (dbOrders && dbOrders.length > 0) {
        result.orders = dbOrders.map((d: any): Order => ({
          id: d.id,
          orderNumber: d.order_number || d.id,
          date: d.date || d.created_at || new Date().toISOString(),
          estimatedDelivery: d.estimated_delivery || '3 ngày sau khi duyệt',
          status: d.status || 'processing',
          statusStageIndex: d.status_stage_index ?? 1,
          layerProgress: d.layer_progress ?? 0,
          secureAccessToken: d.secure_access_token,
          items: d.items || [],
          shippingAddress: d.shipping_address || {},
          carrier: d.carrier || {},
          payment: d.payment || {},
        }));
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem('vcube_orders', JSON.stringify(result.orders));
        }
      }

      // Materials
      const { data: dbMaterials } = await supabase.from('materials').select('*');
      if (dbMaterials && dbMaterials.length > 0) {
        result.materials = dbMaterials.map((d: any): MaterialProfile => ({
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
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem('vcube_materials', JSON.stringify(result.materials));
        }
      }

      // Printers
      const { data: dbPrinters } = await supabase.from('printer_fleet').select('*');
      if (dbPrinters && dbPrinters.length > 0) {
        result.printers = dbPrinters.map((d: any): PrinterProfile => ({
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
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem('vcube_printers', JSON.stringify(result.printers));
        }
      }

      // Users
      const { data: dbUsers } = await supabase.from('user_profiles').select('*');
      if (dbUsers && dbUsers.length > 0) {
        result.users = dbUsers.map((d: any) => ({
          uid: d.id,
          id: d.id,
          email: d.email,
          displayName: d.display_name,
          phone: d.phone,
          role: d.role,
          tier: d.tier,
          kycStatus: d.kyc_status,
          accountStatus: d.account_status,
          avatarUrl: d.avatar_url,
          company: d.company,
          totalOrders: Number(d.total_orders || 0),
          totalSpent: Number(d.total_spent || 0),
          notes: d.notes,
          createdAt: d.created_at,
          lastActive: 'Vừa xong',
        }));
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem('vcube_app_users', JSON.stringify(result.users));
        }
      }

      // Accessories
      const { data: dbAccessories } = await supabase.from('accessories').select('*');
      if (dbAccessories && dbAccessories.length > 0) {
        result.accessories = dbAccessories.map((d: any): AccessoryItem => ({
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
          warehouseLocation: d.warehouse_location || 'Kệ A1',
          supplier: d.supplier || 'VCUBE Fab Hub',
          description: d.description || '',
          imageUrl: d.image_url || '',
          isActive: Boolean(d.in_stock ?? d.is_active ?? true),
          compatibleWith: Array.isArray(d.compatible_with) ? d.compatible_with : ['Móc khóa', 'Vỏ hộp IoT', 'Đồ gá'],
        }));
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem('vcube_accessories', JSON.stringify(result.accessories));
        }
      }

      // Workshop Partners
      const { data: dbPartners } = await supabase.from('workshop_partners').select('*');
      if (dbPartners && dbPartners.length > 0) {
        result.workshopPartners = dbPartners.map((d: any): WorkshopPartner => ({
          id: d.id,
          name: d.name,
          region: (d.region || 'hanoi') as 'hanoi' | 'danang' | 'hcm',
          address: d.address || '',
          contactPerson: d.contact_person || 'Kỹ sư xưởng',
          phone: d.phone || '',
          email: d.email || '',
          supportedTechnologies: Array.isArray(d.supported_technologies) ? d.supported_technologies : ['FDM'],
          maxBuildVolume: d.max_build_volume || { x: 450, y: 450, z: 500 },
          activePrintersCount: Number(d.active_jobs_count || d.active_printers_count || 10),
          availablePrintersCount: Number(d.available_printers_count || 4),
          slaRating: Number(d.rating || d.sla_rating || 4.9),
          completedJobsCount: Number(d.completed_jobs_count || 500),
          currentQueueLength: Number(d.current_queue_length || 6.5),
          inStockMaterials: Array.isArray(d.in_stock_materials) ? d.in_stock_materials : ['PLA Pro', 'PETG Technical Pro'],
          status: (d.capacity_status === 'available' || d.status === 'active') ? 'active' : (d.capacity_status || d.status || 'active') as any,
        }));
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem('vcube_workshop_partners', JSON.stringify(result.workshopPartners));
        }
      }

      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('vcube_last_cloud_sync', result.syncTime);
      }
    } catch (err) {
      console.warn('Sync from Supabase fallback to local:', err);
    }

    return result;
  },
};