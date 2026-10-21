import { supabase } from '../../supabase/client';
import { ok, fail, type WriteResult } from '../../lib/result';
import {
  WorkshopAccessory
} from '../../../types';
import { SEED_WORKSHOP_ACCESSORIES } from './seed';
import { readFromStorage, writeToStorage, STORAGE_KEYS } from './storage';
import { mapMyAccessory } from './shared';
import type { MyAccessoriesResult, MyAccessoryInput } from './types';



/* ── Đợt P (Việc 5): nhóm hàm ghi legacy đã bị XOÁ ──────────────────────────────
 * `getPricingGlobalSettings()` + `savePricingGlobalSettings()` (0 caller, đã kiểm bằng
 * `grep -rn 'getPricingGlobalSettings|...savePricingGlobalSettings'`):
 *   * dùng `id: 'default'` trong khi hàng thật là `id: 'global'` ⇒ ghi/đọc SAI hàng;
 *   * upsert 14 cột KHÔNG tồn tại trong baseline (`electricity_rate_vnd_kwh`,
 *     `default_labor_rate_vnd_hour`, `default_scrap_rate_percent`, `profit_mode`,
 *     `default_profit_percent`, `marketplace_fee_percent`, `marketplace_fixed_fee_vnd`,
 *     `overhead_monthly_cost`, `avg_products_sold_per_month`, …) ⇒ lỗi hoặc ghi rỗng;
 *   * nuốt lỗi rồi rơi về `SEED_PRICING_GLOBAL_SETTINGS` (đã xoá ở trên) ⇒ số bịa.
 * Đường ĐỌC/GHI duy nhất còn lại là `src/backend/services/settingsService.ts`
 * (`getPricingGlobalSettings` / `savePricingGlobalSettings` của module đó).
 * ────────────────────────────────────────────────────────────────────────────── */

// ----------------------------------------------------------------------------
// 8. WORKSHOP ACCESSORIES (workshop_accessories)
// ----------------------------------------------------------------------------
export async function getWorkshopAccessories(workshopId?: string): Promise<WorkshopAccessory[]> {
  try {
    let query = supabase.from('workshop_accessories').select('*').order('created_at', { ascending: true });
    if (workshopId) {
      query = query.or(`workshop_id.eq.${workshopId},workshop_id.is.null`);
    }
    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      const mapped: WorkshopAccessory[] = data.map((d: any) => ({
        id: d.id,
        workshopId: d.workshop_id,
        name: d.name,
        groupName: d.group_name || 'Hardware',
        qtyPerPack: Number(d.qty_per_pack || 100),
        pricePerPack: Number(d.price_per_pack || 50000),
        isActive: Boolean(d.is_active ?? true),
        createdAt: d.created_at
      }));
      writeToStorage(STORAGE_KEYS.WORKSHOP_ACCESSORIES, mapped);
      return mapped;
    }
  } catch (e) {
    console.warn('[WorkshopService] Supabase getWorkshopAccessories fallback to local:', e);
  }
  const local = readFromStorage<WorkshopAccessory[]>(STORAGE_KEYS.WORKSHOP_ACCESSORIES, SEED_WORKSHOP_ACCESSORIES);
  return workshopId ? local.filter(a => !a.workshopId || a.workshopId === workshopId) : local;
}

export async function getWorkshopAccessoryById(id: string): Promise<WorkshopAccessory | null> {
  const list = await getWorkshopAccessories();
  return list.find(a => a.id === id) || null;
}

export async function saveWorkshopAccessory(
  acc: WorkshopAccessory
): Promise<WriteResult<WorkshopAccessory>> {
  const now = new Date().toISOString();
  const id = acc.id || `acc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const fullAcc: WorkshopAccessory = {
    ...acc,
    id,
    createdAt: acc.createdAt || now
  };

  const local = readFromStorage<WorkshopAccessory[]>(STORAGE_KEYS.WORKSHOP_ACCESSORIES, SEED_WORKSHOP_ACCESSORIES);
  writeToStorage(STORAGE_KEYS.WORKSHOP_ACCESSORIES, [fullAcc, ...local.filter(a => a.id !== id)]);

  try {
    const { error } = await supabase.from('workshop_accessories').upsert({
      id: fullAcc.id,
      workshop_id: fullAcc.workshopId || null,
      name: fullAcc.name,
      group_name: fullAcc.groupName,
      qty_per_pack: fullAcc.qtyPerPack,
      price_per_pack: fullAcc.pricePerPack,
      is_active: fullAcc.isActive
    });
    if (error) throw error;
    return ok(fullAcc);
  } catch (e: any) {
    return fail(e, 'Không lưu được phụ kiện.');
  }
}

export async function deleteWorkshopAccessory(id: string): Promise<WriteResult> {
  const local = readFromStorage<WorkshopAccessory[]>(STORAGE_KEYS.WORKSHOP_ACCESSORIES, SEED_WORKSHOP_ACCESSORIES);
  writeToStorage(STORAGE_KEYS.WORKSHOP_ACCESSORIES, local.filter(a => a.id !== id));
  try {
    const { error } = await supabase.from('workshop_accessories').delete().eq('id', id);
    if (error) throw error;
    return ok();
  } catch (e: any) {
    return fail(e, 'Không xoá được phụ kiện.');
  }
}

// --------------------------------------------------------------------------
// W1b.3 — PHỤ KIỆN RIÊNG CỦA XƯỞNG (`workshop_accessories`)
// Chỉ bản ghi có `workshop_id` = xưởng của mình (bản ghi dùng chung của nền tảng
// không thuộc phạm vi "năng lực của tôi" nên không hiển thị ở đây).
// --------------------------------------------------------------------------
export async function getMyAccessories(workshopProfileId: string): Promise<MyAccessoriesResult> {
  if (!workshopProfileId) return { data: [] };
  const { data, error } = await supabase
    .from('workshop_accessories')
    .select('id,workshop_id,name,unit,quantity,cost_price,selling_price,sku,is_active,created_at,updated_at')
    .eq('workshop_id', workshopProfileId)
    .order('created_at', { ascending: true });
  if (error) return { data: [], error: error.message };
  return { data: ((data ?? []) as unknown as Record<string, unknown>[]).map(mapMyAccessory) };
}

export async function saveMyAccessory(input: MyAccessoryInput): Promise<WriteResult> {
  if (!input.workshopProfileId) {
    return { success: false, error: 'Thiếu hồ sơ xưởng — không thể khai báo phụ kiện.' };
  }
  const payload: Record<string, unknown> = {
    workshop_id: input.workshopProfileId,
    name: input.name,
    unit: input.unit ?? 'cái',
    quantity: input.quantity ?? 0,
    cost_price: input.costPrice ?? null,
    selling_price: input.sellingPrice ?? null,
    sku: input.sku ?? '',
    is_active: input.isActive ?? true,
    updated_at: new Date().toISOString(),
  };

  try {
    if (input.id) {
      const { data, error } = await supabase
        .from('workshop_accessories')
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
    const { data, error } = await supabase.from('workshop_accessories').insert(payload).select('id');
    if (error) return { success: false, error: error.message };
    if (!data || data.length === 0) {
      return { success: false, error: 'Máy chủ không tạo được hàng nào (quyền RLS).' };
    }
    return ok();
  } catch (e: any) {
    return { success: false, error: e?.message || 'Lỗi không xác định khi lưu phụ kiện.' };
  }
}

export async function deleteMyAccessory(accessoryId: string, workshopProfileId: string): Promise<WriteResult> {
  try {
    const { data, error } = await supabase
      .from('workshop_accessories')
      .delete()
      .eq('id', accessoryId)
      .eq('workshop_id', workshopProfileId)
      .select('id');
    if (error) return { success: false, error: error.message };
    if (!data || data.length === 0) {
      return { success: false, error: 'Máy chủ không xoá được hàng nào (quyền RLS).' };
    }
    return ok();
  } catch (e: any) {
    return { success: false, error: e?.message || 'Lỗi không xác định khi xoá phụ kiện.' };
  }
}