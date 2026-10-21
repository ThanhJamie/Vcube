import { supabase } from '../../supabase/client';
import { ok, fail, type WriteResult } from '../../lib/result';
import {
  WorkshopMaterial
} from '../../../types';
import { SEED_WORKSHOP_MATERIALS } from './seed';
import { readFromStorage, writeToStorage, STORAGE_KEYS } from './storage';
import { computeStockStatus, mapMyMaterial } from './shared';
import type { MyMaterialsResult, MyMaterialInput } from './types';



// ----------------------------------------------------------------------------
// 3. WORKSHOP MATERIALS (workshop_materials)
// ----------------------------------------------------------------------------
export async function getWorkshopMaterials(workshopId?: string): Promise<WorkshopMaterial[]> {
  try {
    let query = supabase.from('workshop_materials').select('*').order('created_at', { ascending: false });
    if (workshopId) {
      query = query.eq('workshop_id', workshopId);
    }
    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      const mapped: WorkshopMaterial[] = data.map((d: any) => ({
        id: d.id,
        workshopId: d.workshop_id,
        materialName: d.material_name,
        materialType: d.material_type,
        pricePerKg: Number(d.price_per_kg || 280000),
        colorHex: d.color_hex || '#1E293B',
        colorName: d.color_name || 'Tiêu chuẩn',
        density: Number(d.density || 1.24),
        stockStatus: d.stock_status || 'Tracking',
        currentStockGrams: Number(d.current_stock_grams || 0),
        lowStockThresholdGrams: Number(d.low_stock_threshold_grams || 1000),
        createdAt: d.created_at,
        updatedAt: d.updated_at
      }));
      writeToStorage(STORAGE_KEYS.WORKSHOP_MATERIALS, mapped);
      return mapped;
    }
  } catch (e) {
    console.warn('[WorkshopService] Supabase getWorkshopMaterials fallback to local:', e);
  }
  const local = readFromStorage<WorkshopMaterial[]>(STORAGE_KEYS.WORKSHOP_MATERIALS, SEED_WORKSHOP_MATERIALS);
  return workshopId ? local.filter(m => m.workshopId === workshopId) : local;
}

export async function getWorkshopMaterialById(id: string): Promise<WorkshopMaterial | null> {
  const list = await getWorkshopMaterials();
  return list.find(m => m.id === id) || null;
}

export async function saveWorkshopMaterial(mat: WorkshopMaterial): Promise<WriteResult<WorkshopMaterial>> {
  const now = new Date().toISOString();
  const id = mat.id || `wmat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const fullMat: WorkshopMaterial = {
    ...mat,
    id,
    createdAt: mat.createdAt || now,
    updatedAt: now
  };

  const local = readFromStorage<WorkshopMaterial[]>(STORAGE_KEYS.WORKSHOP_MATERIALS, SEED_WORKSHOP_MATERIALS);
  writeToStorage(STORAGE_KEYS.WORKSHOP_MATERIALS, [fullMat, ...local.filter(m => m.id !== id)]);

  try {
    const { error } = await supabase.from('workshop_materials').upsert({
      id: fullMat.id,
      workshop_id: fullMat.workshopId,
      material_name: fullMat.materialName,
      material_type: fullMat.materialType,
      price_per_kg: fullMat.pricePerKg,
      color_hex: fullMat.colorHex,
      color_name: fullMat.colorName,
      density: fullMat.density,
      stock_status: fullMat.stockStatus,
      current_stock_grams: fullMat.currentStockGrams,
      low_stock_threshold_grams: fullMat.lowStockThresholdGrams,
      updated_at: fullMat.updatedAt
    });
    if (error) throw error;
    return ok(fullMat);
  } catch (e: any) {
    return fail(e, 'Không lưu được vật liệu.');
  }
}

export async function updateMaterialStock(
  materialId: string,
  currentStockGrams: number,
  stockStatus?: WorkshopMaterial['stockStatus']
): Promise<WriteResult> {
  const local = readFromStorage<WorkshopMaterial[]>(STORAGE_KEYS.WORKSHOP_MATERIALS, SEED_WORKSHOP_MATERIALS);
  const target = local.find(m => m.id === materialId);
  const threshold = target?.lowStockThresholdGrams || 1000;
  const computedStatus = stockStatus || (
    currentStockGrams <= 0 ? 'OutOfStock' :
    currentStockGrams <= threshold ? 'LowStock' : 'Tracking'
  );

  const updated = local.map(m => m.id === materialId ? {
    ...m,
    currentStockGrams,
    stockStatus: computedStatus,
    updatedAt: new Date().toISOString()
  } : m);
  writeToStorage(STORAGE_KEYS.WORKSHOP_MATERIALS, updated);

  try {
    const { error } = await supabase.from('workshop_materials').update({
      current_stock_grams: currentStockGrams,
      stock_status: computedStatus,
      updated_at: new Date().toISOString()
    }).eq('id', materialId);
    if (error) throw error;
    return ok();
  } catch (e: any) {
    return fail(e, 'Không cập nhật được tồn kho vật liệu.');
  }
}

export async function deleteWorkshopMaterial(id: string): Promise<WriteResult> {
  const local = readFromStorage<WorkshopMaterial[]>(STORAGE_KEYS.WORKSHOP_MATERIALS, SEED_WORKSHOP_MATERIALS);
  writeToStorage(STORAGE_KEYS.WORKSHOP_MATERIALS, local.filter(m => m.id !== id));
  try {
    const { error } = await supabase.from('workshop_materials').delete().eq('id', id);
    if (error) throw error;
    return ok();
  } catch (e: any) {
    return fail(e, 'Không xoá được vật liệu.');
  }
}

// --------------------------------------------------------------------------
// W1b.2 — VẬT LIỆU & TỒN KHO CỦA CHÍNH XƯỞNG
// (`workshop_materials` + `material_inventory_logs`)
// --------------------------------------------------------------------------
export async function getMyMaterials(workshopProfileId: string): Promise<MyMaterialsResult> {
  if (!workshopProfileId) return { data: [] };
  const { data, error } = await supabase
    .from('workshop_materials')
    .select(
      'id,workshop_id,name,type,color,current_stock_grams,low_stock_threshold_grams,price_per_kg,stock_status,created_at,updated_at'
    )
    .eq('workshop_id', workshopProfileId)
    .order('created_at', { ascending: true });
  if (error) return { data: [], error: error.message };
  return { data: ((data ?? []) as unknown as Record<string, unknown>[]).map(mapMyMaterial) };
}

export async function saveMyMaterial(input: MyMaterialInput): Promise<WriteResult> {
  if (!input.workshopProfileId) {
    return { success: false, error: 'Thiếu hồ sơ xưởng — không thể khai báo vật liệu.' };
  }
  const payload: Record<string, unknown> = {
    workshop_id: input.workshopProfileId,
    name: input.name,
    type: input.type ?? 'PLA',
    color: input.color ?? '',
    current_stock_grams: input.currentStockGrams ?? null,
    low_stock_threshold_grams: input.lowStockThresholdGrams ?? null,
    price_per_kg: input.pricePerKg ?? null,
    stock_status: input.stockStatus ?? computeStockStatus(
      input.currentStockGrams ?? null,
      input.lowStockThresholdGrams ?? null
    ),
    updated_at: new Date().toISOString(),
  };

  try {
    if (input.id) {
      const { data, error } = await supabase
        .from('workshop_materials')
        .update(payload)
        .eq('id', input.id)
        .eq('workshop_id', input.workshopProfileId)
        .select('id');
      if (error) return { success: false, error: error.message };
      if (!data || data.length === 0) {
        return { success: false, error: 'Máy chủ không ghi được hàng nào (quyền RLS).' };
      }
      return ok();
    }

    const { data, error } = await supabase.from('workshop_materials').insert(payload).select('id');
    if (error) return { success: false, error: error.message };
    if (!data || data.length === 0) {
      return { success: false, error: 'Máy chủ không tạo được hàng nào (quyền RLS).' };
    }
    return ok();
  } catch (e: any) {
    return { success: false, error: e?.message || 'Lỗi không xác định khi lưu vật liệu.' };
  }
}

export async function deleteMyMaterial(materialId: string, workshopProfileId: string): Promise<WriteResult> {
  try {
    const { data, error } = await supabase
      .from('workshop_materials')
      .delete()
      .eq('id', materialId)
      .eq('workshop_id', workshopProfileId)
      .select('id');
    if (error) return { success: false, error: error.message };
    if (!data || data.length === 0) {
      return { success: false, error: 'Máy chủ không xoá được hàng nào (quyền RLS).' };
    }
    return ok();
  } catch (e: any) {
    return { success: false, error: e?.message || 'Lỗi không xác định khi xoá vật liệu.' };
  }
}