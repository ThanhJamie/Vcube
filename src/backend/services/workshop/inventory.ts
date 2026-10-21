import { supabase } from '../../supabase/client';
import { ok, fail, type WriteResult } from '../../lib/result';
import {
  WorkshopMaterial,
  MaterialInventoryLog
} from '../../../types';
import { SEED_WORKSHOP_MATERIALS, SEED_MATERIAL_INVENTORY_LOGS } from './seed';
import { readFromStorage, writeToStorage, STORAGE_KEYS } from './storage';
import { computeStockStatus, mapMyInventoryLog } from './shared';
import type { MyInventoryLogsResult, MyInventoryLogInput, MyInventoryLogResult } from './types';



// ----------------------------------------------------------------------------
// 4. MATERIAL INVENTORY LOGS (material_inventory_logs)
// ----------------------------------------------------------------------------
export async function getInventoryLogs(materialId?: string): Promise<MaterialInventoryLog[]> {
  try {
    let query = supabase.from('material_inventory_logs').select('*').order('created_at', { ascending: false });
    if (materialId) {
      query = query.eq('material_id', materialId);
    }
    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      const mapped: MaterialInventoryLog[] = data.map((d: any) => ({
        id: d.id,
        materialId: d.material_id,
        action: d.action,
        grams: Number(d.grams || 0),
        pricePerKgAtTime: d.price_per_kg_at_time ? Number(d.price_per_kg_at_time) : undefined,
        supplier: d.supplier,
        batchCode: d.batch_code,
        note: d.note,
        createdBy: d.created_by,
        createdAt: d.created_at
      }));
      writeToStorage(STORAGE_KEYS.INVENTORY_LOGS, mapped);
      return mapped;
    }
  } catch (e) {
    console.warn('[WorkshopService] Supabase getInventoryLogs fallback to local:', e);
  }
  const local = readFromStorage<MaterialInventoryLog[]>(STORAGE_KEYS.INVENTORY_LOGS, SEED_MATERIAL_INVENTORY_LOGS);
  return materialId ? local.filter(l => l.materialId === materialId) : local;
}

/**
 * Adds an inventory log and triggers stock level & price synchronization on workshop_materials
 */
export async function addInventoryLog(
  log: Omit<MaterialInventoryLog, 'id' | 'createdAt'> & { id?: string; createdAt?: string }
): Promise<WriteResult<MaterialInventoryLog>> {
  const now = new Date().toISOString();
  const id = log.id || `inv_log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const fullLog: MaterialInventoryLog = {
    ...log,
    id,
    createdAt: log.createdAt || now
  };

  // 1. Update local inventory logs
  const localLogs = readFromStorage<MaterialInventoryLog[]>(STORAGE_KEYS.INVENTORY_LOGS, SEED_MATERIAL_INVENTORY_LOGS);
  writeToStorage(STORAGE_KEYS.INVENTORY_LOGS, [fullLog, ...localLogs]);

  // 2. Offline trigger logic: Synchronize stock & price in workshop_materials
  const localMaterials = readFromStorage<WorkshopMaterial[]>(STORAGE_KEYS.WORKSHOP_MATERIALS, SEED_WORKSHOP_MATERIALS);
  const targetMat = localMaterials.find(m => m.id === log.materialId);

  if (targetMat) {
    let newStock = targetMat.currentStockGrams;
    let newPrice = targetMat.pricePerKg;

    if (log.action === 'Import') {
      newStock += log.grams;
      if (log.pricePerKgAtTime && log.pricePerKgAtTime > 0) {
        newPrice = log.pricePerKgAtTime;
      }
    } else if (log.action === 'Export') {
      newStock = Math.max(0, newStock - log.grams);
    } else if (log.action === 'Adjustment') {
      newStock = Math.max(0, log.grams);
    }

    const threshold = targetMat.lowStockThresholdGrams || 1000;
    const newStatus = (
      newStock <= 0 ? 'OutOfStock' :
      newStock <= threshold ? 'LowStock' : 'Tracking'
    );

    const updatedMaterials = localMaterials.map(m => m.id === log.materialId ? {
      ...m,
      currentStockGrams: newStock,
      pricePerKg: newPrice,
      stockStatus: newStatus,
      updatedAt: now
    } : m);
    writeToStorage(STORAGE_KEYS.WORKSHOP_MATERIALS, updatedMaterials);
  }

  // 3. Persist to Supabase if connected
  try {
    const { error } = await supabase.from('material_inventory_logs').insert({
      id: fullLog.id,
      material_id: fullLog.materialId,
      action: fullLog.action,
      grams: fullLog.grams,
      price_per_kg_at_time: fullLog.pricePerKgAtTime || null,
      supplier: fullLog.supplier || null,
      batch_code: fullLog.batchCode || null,
      note: fullLog.note || null,
      created_by: fullLog.createdBy || 'system',
      created_at: fullLog.createdAt
    });
    if (error) throw error;
    return ok(fullLog);
  } catch (e: any) {
    return fail(e, 'Không ghi được phiếu kho.');
  }
}

export async function getMyInventoryLogs(materialIds: string[]): Promise<MyInventoryLogsResult> {
  const ids = materialIds.filter(Boolean);
  if (ids.length === 0) return { data: [] };
  const { data, error } = await supabase
    .from('material_inventory_logs')
    .select('id,material_id,action,grams,price_per_kg_at_time,supplier,batch_code,note,created_by,created_at')
    .in('material_id', ids)
    .order('created_at', { ascending: false });
  if (error) return { data: [], error: error.message };
  return {
    data: ((data ?? []) as unknown as Record<string, unknown>[]).map(mapMyInventoryLog),
  };
}

/**
 * Ghi phiếu nhập/xuất kho + cập nhật tồn của vật liệu (và đơn giá nếu phiếu nhập có giá).
 * Trả `stockUpdated = false` khi phiếu đã ghi nhưng tồn CHƯA cập nhật — tầng view phải
 * nói đúng trạng thái đó, không được báo "thành công" trọn vẹn.
 */
export async function addMyInventoryLog(input: MyInventoryLogInput): Promise<MyInventoryLogResult> {
  if (!input.workshopProfileId || !input.materialId) {
    return fail('Thiếu vật liệu hoặc hồ sơ xưởng.');
  }

  const payload: Record<string, unknown> = {
    material_id: input.materialId,
    action: input.action,
    grams: input.grams,
    price_per_kg_at_time: input.pricePerKgAtTime ?? null,
    supplier: input.supplier ?? '',
    batch_code: input.batchCode ?? '',
    note: input.note ?? '',
    created_by: input.createdBy ?? '',
  };

  try {
    const { data: logData, error: logError } = await supabase
      .from('material_inventory_logs')
      .insert(payload)
      .select('id');
    if (logError) return fail(logError.message, 'Chưa ghi được phiếu kho.');
    if (!logData || logData.length === 0) {
      return fail('Phiếu kho chưa được ghi (quyền RLS).');
    }

    // Đọc tồn hiện tại TỪ MÁY CHỦ (không tin state trong RAM) rồi mới tính tồn mới.
    const { data: matData, error: matError } = await supabase
      .from('workshop_materials')
      .select('current_stock_grams,price_per_kg,low_stock_threshold_grams')
      .eq('id', input.materialId)
      .eq('workshop_id', input.workshopProfileId);

    if (matError || !matData || matData.length === 0) {
      // Phiếu ĐÃ ghi thành công; chỉ tồn kho chưa cập nhật được. Tầng view phải đọc
      // `stockUpdated === false` để nói đúng — nhánh success không mang `error`.
      return { success: true, stockUpdated: false, newStockGrams: null };
    }

    const row = matData[0] as Record<string, unknown>;
    const currentStock = Number(row.current_stock_grams ?? 0);
    const threshold = Number(row.low_stock_threshold_grams ?? 500);
    let newStock: number;
    if (input.action === 'Import') newStock = currentStock + input.grams;
    else if (input.action === 'Export') newStock = Math.max(0, currentStock - input.grams);
    else newStock = Math.max(0, input.grams);

    const stockPayload: Record<string, unknown> = {
      current_stock_grams: newStock,
      stock_status: computeStockStatus(newStock, threshold),
      updated_at: new Date().toISOString(),
    };
    if (input.action === 'Import' && typeof input.pricePerKgAtTime === 'number' && input.pricePerKgAtTime > 0) {
      stockPayload.price_per_kg = input.pricePerKgAtTime;
    }

    const { data: updData, error: updError } = await supabase
      .from('workshop_materials')
      .update(stockPayload)
      .eq('id', input.materialId)
      .eq('workshop_id', input.workshopProfileId)
      .select('id');

    if (updError) {
      return fail(updError.message, 'Chưa cập nhật được tồn kho vật liệu.');
    }
    if (!updData || updData.length === 0) {
      return fail('Phiếu kho đã ghi nhưng tồn kho CHƯA cập nhật (quyền RLS).');
    }

    return { success: true, stockUpdated: true, newStockGrams: newStock };
  } catch (e: any) {
    return fail(e, 'Lỗi không xác định khi ghi phiếu kho.');
  }
}

/**
 * Trừ kho vật liệu của xưởng khi một đơn HOÀN THÀNH.
 *
 * CHỈ trừ khi item khai `weightGrams` (khối lượng thực của chi tiết). Item không khai khối
 * lượng ⇒ `skipped` (KHÔNG bịa số gram). Mỗi lần trừ ghi một phiếu `Export` vào sổ kho để
 * truy vết, dùng lại `addMyInventoryLog` (đọc tồn từ máy chủ rồi mới tính tồn mới).
 */
export async function deductMaterialsForCompletedOrder(
  orderId: string,
  partnerId: string,
): Promise<{ deducted: number; skipped: number }> {
  const summary = { deducted: 0, skipped: 0 };
  try {
    const { data: order, error } = await supabase
      .from('orders')
      .select('order_number,items')
      .eq('id', orderId)
      .eq('assigned_workshop_id', partnerId)
      .maybeSingle();
    if (error || !order) return summary;

    const record = order as Record<string, unknown>;
    const orderNumber = String(record.order_number ?? orderId);
    const items: unknown[] = Array.isArray(record.items) ? (record.items as unknown[]) : [];
    if (items.length === 0) return summary;

    const { data: mats } = await supabase
      .from('workshop_materials')
      .select('id,name')
      .eq('workshop_id', partnerId);
    const materials = (mats ?? []) as Array<{ id: string; name: string | null }>;

    for (const raw of items) {
      const it = (raw ?? {}) as Record<string, unknown>;
      const weight = Number(it.weightGrams ?? it.weight_grams);
      const qtyRaw = Number(it.quantity);
      const qty = Number.isFinite(qtyRaw) && qtyRaw > 0 ? qtyRaw : 1;
      const materialName = typeof it.material === 'string' ? it.material.trim().toLowerCase() : '';
      if (!materialName || !Number.isFinite(weight) || weight <= 0) {
        summary.skipped++;
        continue;
      }
      // Khớp tên vật liệu: item lưu dạng "PLA (Prusa MK4)" nên so khớp chứa tên vật liệu xưởng.
      const mat = materials.find((m) => {
        const n = (m.name ?? '').trim().toLowerCase();
        return n.length > 0 && (materialName === n || materialName.includes(n));
      });
      if (!mat) {
        summary.skipped++;
        continue;
      }
      const res = await addMyInventoryLog({
        workshopProfileId: partnerId,
        materialId: mat.id,
        action: 'Export',
        grams: weight * qty,
        note: `Tự động trừ khi đơn ${orderNumber} hoàn thành (${weight} g × ${qty})`,
      });
      if (res.success) summary.deducted++;
      else summary.skipped++;
    }
    return summary;
  } catch {
    return summary;
  }
}