import { supabase } from '../../supabase/client';
import { ok, fail, type WriteResult } from '../../lib/result';
import {
  WorkshopProfile
} from '../../../types';
import { SEED_WORKSHOP_PROFILES } from './seed';
import { readFromStorage, writeToStorage, STORAGE_KEYS } from './storage';
import { getCurrentUserId, mapMyWorkshopProfile } from './shared';
import type { MyWorkshopProfileResult, MyWorkshopProfilePatch } from './types';


/**
 * Healthcheck to detect Supabase connectivity
 */
export async function checkSupabaseHealth(): Promise<{ online: boolean; message: string }> {
  try {
    const { error } = await supabase.from('pricing_global_settings').select('id').limit(1);
    if (error) throw error;
    return { online: true, message: 'Supabase Cloud PostgreSQL connected.' };
  } catch (err: any) {
    return { online: false, message: `Offline / Local fallback active: ${err?.message || 'Connection timeout'}` };
  }
}

// ----------------------------------------------------------------------------
// 1. WORKSHOP PROFILES (workshop_profiles)
// ----------------------------------------------------------------------------
export async function getWorkshopProfiles(filterRegion?: string): Promise<WorkshopProfile[]> {
  try {
    let query = supabase.from('workshop_profiles').select('*').order('created_at', { ascending: true });
    if (filterRegion && filterRegion !== 'all') {
      query = query.eq('region', filterRegion);
    }
    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      const mapped: WorkshopProfile[] = data.map((d: any) => ({
        id: d.id,
        userId: d.user_id,
        partnerId: d.partner_id,
        workshopName: d.workshop_name,
        address: d.address,
        region: d.region,
        totalMachines: Number(d.total_machines || 0),
        activeMachinesNow: Number(d.active_machines_now || 0),
        electricityRateOverride: d.electricity_rate_override ? Number(d.electricity_rate_override) : undefined,
        laborRateOverride: d.labor_rate_override ? Number(d.labor_rate_override) : undefined,
        verifiedStatus: d.verified_status || 'Pending',
        contactPhone: d.contact_phone,
        contactEmail: d.contact_email,
        createdAt: d.created_at,
        updatedAt: d.updated_at
      }));
      writeToStorage(STORAGE_KEYS.WORKSHOP_PROFILES, mapped);
      return mapped;
    }
  } catch (e) {
    console.warn('[WorkshopService] Supabase getWorkshopProfiles fallback to local:', e);
  }
  const local = readFromStorage<WorkshopProfile[]>(STORAGE_KEYS.WORKSHOP_PROFILES, SEED_WORKSHOP_PROFILES);
  return filterRegion && filterRegion !== 'all' ? local.filter(w => w.region === filterRegion) : local;
}

export async function getWorkshopProfileById(id: string): Promise<WorkshopProfile | null> {
  const list = await getWorkshopProfiles();
  return list.find(w => w.id === id) || null;
}

export async function getWorkshopProfileByUserId(userId: string): Promise<WorkshopProfile | null> {
  const list = await getWorkshopProfiles();
  return list.find(w => w.userId === userId) || null;
}

export async function saveWorkshopProfile(profile: Partial<WorkshopProfile> & { workshopName: string; address: string }): Promise<WriteResult<WorkshopProfile>> {
  const now = new Date().toISOString();
  const id = profile.id || `ws_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const fullProfile: WorkshopProfile = {
    id,
    userId: profile.userId,
    partnerId: profile.partnerId,
    workshopName: profile.workshopName,
    address: profile.address,
    region: profile.region || 'Bắc',
    totalMachines: profile.totalMachines ?? 0,
    activeMachinesNow: profile.activeMachinesNow ?? 0,
    electricityRateOverride: profile.electricityRateOverride,
    laborRateOverride: profile.laborRateOverride,
    verifiedStatus: profile.verifiedStatus || 'Pending',
    contactPhone: profile.contactPhone,
    contactEmail: profile.contactEmail,
    createdAt: profile.createdAt || now,
    updatedAt: now
  };

  // Update local storage first
  const local = readFromStorage<WorkshopProfile[]>(STORAGE_KEYS.WORKSHOP_PROFILES, SEED_WORKSHOP_PROFILES);
  const updatedLocal = [fullProfile, ...local.filter(w => w.id !== id)];
  writeToStorage(STORAGE_KEYS.WORKSHOP_PROFILES, updatedLocal);

  // W7 — `partner_id` và `verified_status` là 2 cột ĐẶC QUYỀN (chỉ admin gán/duyệt).
  // `upsert` = INSERT **hoặc** UPDATE: nếu gửi kèm 2 cột này khi UPDATE một hàng ĐÃ có
  // `partner_id`/`verified_status` thì payload vô tình ghi đè (null / 'Pending'), và trigger
  // `trg_protect_workshop_profile_privileged_columns` sẽ raise 42501 — nhìn như lỗi RLS.
  // ⇒ CHỈ gửi khi người gọi khai TƯỜNG MINH. Với hàng MỚI thì cột vắng mặt = NULL/DEFAULT,
  // y hệt giá trị cũ, nên đường onboarding không đổi hành vi.
  const payload: Record<string, unknown> = {
    id: fullProfile.id,
    user_id: fullProfile.userId || null,
    workshop_name: fullProfile.workshopName,
    address: fullProfile.address,
    region: fullProfile.region,
    total_machines: fullProfile.totalMachines,
    active_machines_now: fullProfile.activeMachinesNow,
    electricity_rate_override: fullProfile.electricityRateOverride,
    labor_rate_override: fullProfile.laborRateOverride,
    contact_phone: fullProfile.contactPhone,
    contact_email: fullProfile.contactEmail,
    updated_at: fullProfile.updatedAt
  };
  if (profile.partnerId !== undefined) payload.partner_id = profile.partnerId || null;
  if (profile.verifiedStatus !== undefined) payload.verified_status = profile.verifiedStatus;

  try {
    const { error } = await supabase.from('workshop_profiles').upsert(payload);
    if (error) throw error;
    return ok(fullProfile);
  } catch (e: any) {
    return fail(e, 'Không lưu được hồ sơ xưởng.');
  }
}

export async function deleteWorkshopProfile(id: string): Promise<WriteResult> {
  const local = readFromStorage<WorkshopProfile[]>(STORAGE_KEYS.WORKSHOP_PROFILES, SEED_WORKSHOP_PROFILES);
  writeToStorage(STORAGE_KEYS.WORKSHOP_PROFILES, local.filter(w => w.id !== id));
  try {
    const { error } = await supabase.from('workshop_profiles').delete().eq('id', id);
    if (error) throw error;
    return ok();
  } catch (e: any) {
    return fail(e, 'Không xoá được hồ sơ xưởng.');
  }
}

/**
 * Hồ sơ xưởng của CHÍNH người đang đăng nhập.
 *
 * `workshop_profiles` KHÔNG có unique constraint trên `user_id` (đã kiểm chứng trên
 * project thật) ⇒ một user có thể có nhiều hồ sơ. Hàm trả hàng MỚI NHẤT và kèm
 * `duplicateCount` để tầng view cảnh báo thay vì âm thầm chọn bừa.
 */
export async function getMyWorkshopProfile(): Promise<MyWorkshopProfileResult> {
  const uid = await getCurrentUserId();
  if (!uid) return { profile: null, duplicateCount: 0 };

  const { data, error } = await supabase
    .from('workshop_profiles')
    .select(
      'id,user_id,partner_id,workshop_name,address,region,total_machines,active_machines_now,' +
        'electricity_rate_override,labor_rate_override,verified_status,contact_phone,contact_email,' +
        'created_at,updated_at'
    )
    .eq('user_id', uid)
    .order('created_at', { ascending: false });

  if (error) return { profile: null, error: error.message, duplicateCount: 0 };
  const rows = (data ?? []) as unknown as Record<string, unknown>[];
  if (rows.length === 0) return { profile: null, duplicateCount: 0 };

  return {
    profile: mapMyWorkshopProfile(rows[0]),
    duplicateCount: rows.length,
  };
}

/**
 * Lưu cấu hình của chính xưởng. `electricityRateOverride` / `laborRateOverride`:
 * số = có cấu hình, `null` = XOÁ cấu hình (rỗng = chưa cấu hình, KHÔNG mặc định số).
 */
export async function saveMyWorkshopProfile(
  profileId: string,
  patch: MyWorkshopProfilePatch
): Promise<WriteResult> {
  if (!profileId) return { success: false, error: 'Thiếu hồ sơ xưởng — không thể lưu.' };

  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.workshopName !== undefined) payload.workshop_name = patch.workshopName;
  if (patch.address !== undefined) payload.address = patch.address;
  if (patch.region !== undefined) payload.region = patch.region;
  if (patch.contactPhone !== undefined) payload.contact_phone = patch.contactPhone;
  if (patch.contactEmail !== undefined) payload.contact_email = patch.contactEmail;
  if (patch.electricityRateOverride !== undefined) {
    payload.electricity_rate_override = patch.electricityRateOverride;
  }
  if (patch.laborRateOverride !== undefined) {
    payload.labor_rate_override = patch.laborRateOverride;
  }

  try {
    const { data, error } = await supabase
      .from('workshop_profiles')
      .update(payload)
      .eq('id', profileId)
      .select('id');
    if (error) return { success: false, error: error.message };
    if (!data || data.length === 0) {
      return {
        success: false,
        error: 'Máy chủ không ghi được hàng nào (quyền RLS) — chưa có thay đổi nào được lưu.',
      };
    }
    return ok();
  } catch (e: any) {
    return { success: false, error: e?.message || 'Lỗi không xác định khi lưu hồ sơ xưởng.' };
  }
}