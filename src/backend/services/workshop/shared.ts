import { supabase } from '../../supabase/client';
import type { MyWorkshopProfile, MyMachine, MyMaterial, MyInventoryLog, MyAccessory, MyQueueOrder } from './types';



// ==========================================================================
// W1b — BẢNG ĐIỀU KHIỂN XƯỞNG: CHỈ DỮ LIỆU CỦA CHÍNH XƯỞNG ĐANG ĐĂNG NHẬP
//
// Vì sao tách khỏi nhóm `getWorkshop*` phía trên: nhóm cũ rơi về `SEED_*` /
// localStorage khi bảng rỗng. Với bảng điều khiển của xưởng, "rơi về seed" nghĩa là
// xưởng A nhìn thấy máy / vật liệu của một xưởng không tồn tại — vừa RÒ DỮ LIỆU vừa
// SỐ BỊA (`docs/design/data-honesty.md` CI-07). Nhóm hàm dưới đây:
//   - KHÔNG đọc/ghi localStorage, KHÔNG rơi về `SEED_*`;
//   - LUÔN lọc theo hồ sơ xưởng của `auth.uid()` (máy/vật liệu/phụ kiện) hoặc theo
//     `partner_id` của xưởng đó (`orders.assigned_workshop_id`);
//   - trả `{ data, error }` để tầng view nói THẬT khi máy chủ từ chối (RLS) thay vì
//     báo thành công giả.
// ==========================================================================

/** `auth.uid()` hiện tại; `null` khi chưa đăng nhập. */
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user?.id ?? null;
  } catch {
    return null;
  }
}

// --------------------------------------------------------------------------
// W1b.6 — HÀM ÁNH XẠ / TIỆN ÍCH NỘI BỘ
// --------------------------------------------------------------------------
export function computeStockStatus(grams: number | null, threshold: number | null): string {
  // Chưa khai tồn ⇒ KHÔNG kết luận hết hàng/sắp hết (tránh biến "chưa khai" thành 0 g).
  if (grams === null || grams === undefined) return 'Tracking';
  if (grams <= 0) return 'OutOfStock';
  if (threshold !== null && threshold !== undefined && grams <= threshold) return 'LowStock';
  return 'Tracking';
}

export function mapMyWorkshopProfile(d: Record<string, unknown>): MyWorkshopProfile {
  return {
    id: String(d.id ?? ''),
    userId: d.user_id ? String(d.user_id) : null,
    partnerId: d.partner_id ? String(d.partner_id) : null,
    workshopName: String(d.workshop_name ?? ''),
    address: String(d.address ?? ''),
    region: String(d.region ?? ''),
    verifiedStatus: String(d.verified_status ?? 'Pending'),
    contactPhone: String(d.contact_phone ?? ''),
    contactEmail: String(d.contact_email ?? ''),
    electricityRateOverride: toNumberOrNull(d.electricity_rate_override),
    laborRateOverride: toNumberOrNull(d.labor_rate_override),
    totalMachines: toNumberOrNull(d.total_machines),
    activeMachinesNow: toNumberOrNull(d.active_machines_now),
    createdAt: d.created_at ? String(d.created_at) : null,
    updatedAt: d.updated_at ? String(d.updated_at) : null,
  };
}

export function mapMyMachine(d: Record<string, unknown>): MyMachine {
  const bed = (d.bed_dimensions ?? null) as Record<string, unknown> | null;
  return {
    id: String(d.id ?? ''),
    workshopId: String(d.workshop_id ?? ''),
    name: String(d.name ?? ''),
    brand: String(d.brand ?? ''),
    model: String(d.model ?? ''),
    technology: String(d.technology ?? ''),
    status: String(d.status ?? ''),
    hourlyRate: toNumberOrNull(d.hourly_rate),
    bedDimensions: bed
      ? {
          x: toNumberOrNull(bed.x) ?? 0,
          y: toNumberOrNull(bed.y) ?? 0,
          z: toNumberOrNull(bed.z) ?? 0,
        }
      : null,
    createdAt: d.created_at ? String(d.created_at) : null,
    updatedAt: d.updated_at ? String(d.updated_at) : null,
  };
}

export function mapMyMaterial(d: Record<string, unknown>): MyMaterial {
  return {
    id: String(d.id ?? ''),
    workshopId: String(d.workshop_id ?? ''),
    name: String(d.name ?? ''),
    type: String(d.type ?? ''),
    color: String(d.color ?? ''),
    currentStockGrams: toNumberOrNull(d.current_stock_grams),
    lowStockThresholdGrams: toNumberOrNull(d.low_stock_threshold_grams),
    pricePerKg: toNumberOrNull(d.price_per_kg),
    stockStatus: String(d.stock_status ?? ''),
    createdAt: d.created_at ? String(d.created_at) : null,
    updatedAt: d.updated_at ? String(d.updated_at) : null,
  };
}

export function mapMyInventoryLog(d: Record<string, unknown>): MyInventoryLog {
  return {
    id: String(d.id ?? ''),
    materialId: String(d.material_id ?? ''),
    action: String(d.action ?? ''),
    grams: toNumberOrNull(d.grams),
    pricePerKgAtTime: toNumberOrNull(d.price_per_kg_at_time),
    supplier: String(d.supplier ?? ''),
    batchCode: String(d.batch_code ?? ''),
    note: String(d.note ?? ''),
    createdBy: String(d.created_by ?? ''),
    createdAt: d.created_at ? String(d.created_at) : null,
  };
}

export function mapMyAccessory(d: Record<string, unknown>): MyAccessory {
  return {
    id: String(d.id ?? ''),
    workshopId: String(d.workshop_id ?? ''),
    name: String(d.name ?? ''),
    unit: String(d.unit ?? ''),
    quantity: toNumberOrNull(d.quantity),
    costPrice: toNumberOrNull(d.cost_price),
    sellingPrice: toNumberOrNull(d.selling_price),
    sku: String(d.sku ?? ''),
    isActive: d.is_active === true,
    createdAt: d.created_at ? String(d.created_at) : null,
    updatedAt: d.updated_at ? String(d.updated_at) : null,
  };
}

export function mapMyQueueOrder(d: Record<string, unknown>): MyQueueOrder {
  const rawItems = Array.isArray(d.items) ? (d.items as Record<string, unknown>[]) : [];
  return {
    id: String(d.id ?? ''),
    orderNumber: String(d.order_number ?? ''),
    date: d.date ? String(d.date) : null,
    estimatedDelivery: d.estimated_delivery ? String(d.estimated_delivery) : '',
    status: String(d.status ?? ''),
    statusStageIndex: toNumberOrNull(d.status_stage_index),
    layerProgress: toNumberOrNull(d.layer_progress),
    assignedPrinterId: d.assigned_printer_id ? String(d.assigned_printer_id) : null,
    items: rawItems.map((it) => ({
      id: String(it.id ?? ''),
      name: String(it.name ?? ''),
      quantity: toNumberOrNull(it.quantity) ?? 0,
      material: it.material ? String(it.material) : null,
      color: it.color ? String(it.color) : null,
    })),
  };
}

export function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}