import { supabase } from '../../supabase/client';
import { ok, fail, type WriteResult } from '../../lib/result';
import {
  WorkshopMachine
} from '../../../types';
import { SEED_WORKSHOP_MACHINES } from './seed';
import { readFromStorage, writeToStorage, STORAGE_KEYS } from './storage';
import { mapMyMachine } from './shared';
import type { MyMachinesResult, MyMachineInput } from './types';



// ----------------------------------------------------------------------------
// 2. WORKSHOP MACHINES (workshop_machines)
// ----------------------------------------------------------------------------
export async function getWorkshopMachines(workshopId?: string): Promise<WorkshopMachine[]> {
  try {
    let query = supabase.from('workshop_machines').select('*').order('created_at', { ascending: false });
    if (workshopId) {
      query = query.eq('workshop_id', workshopId);
    }
    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      const mapped: WorkshopMachine[] = data.map((d: any) => ({
        id: d.id,
        workshopId: d.workshop_id,
        machineName: d.machine_name,
        machineType: d.machine_type,
        avgPowerKW: Number(d.avg_power_kw || 0.18),
        purchasePrice: Number(d.purchase_price || 25000000),
        lifetimeHours: Number(d.lifetime_hours || 8000),
        status: d.status || 'Free',
        currentJobId: d.current_job_id,
        buildVolumeMm: d.build_volume_mm || { x: 256, y: 256, z: 256 },
        createdAt: d.created_at,
        updatedAt: d.updated_at
      }));
      writeToStorage(STORAGE_KEYS.WORKSHOP_MACHINES, mapped);
      return mapped;
    }
  } catch (e) {
    console.warn('[WorkshopService] Supabase getWorkshopMachines fallback to local:', e);
  }
  const local = readFromStorage<WorkshopMachine[]>(STORAGE_KEYS.WORKSHOP_MACHINES, SEED_WORKSHOP_MACHINES);
  return workshopId ? local.filter(m => m.workshopId === workshopId) : local;
}

export async function getWorkshopMachineById(id: string): Promise<WorkshopMachine | null> {
  const list = await getWorkshopMachines();
  return list.find(m => m.id === id) || null;
}

export async function saveWorkshopMachine(machine: WorkshopMachine): Promise<WriteResult<WorkshopMachine>> {
  const now = new Date().toISOString();
  const id = machine.id || `wm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const fullMachine: WorkshopMachine = {
    ...machine,
    id,
    createdAt: machine.createdAt || now,
    updatedAt: now
  };

  const local = readFromStorage<WorkshopMachine[]>(STORAGE_KEYS.WORKSHOP_MACHINES, SEED_WORKSHOP_MACHINES);
  writeToStorage(STORAGE_KEYS.WORKSHOP_MACHINES, [fullMachine, ...local.filter(m => m.id !== id)]);

  try {
    const { error } = await supabase.from('workshop_machines').upsert({
      id: fullMachine.id,
      workshop_id: fullMachine.workshopId,
      machine_name: fullMachine.machineName,
      machine_type: fullMachine.machineType,
      avg_power_kw: fullMachine.avgPowerKW,
      purchase_price: fullMachine.purchasePrice,
      lifetime_hours: fullMachine.lifetimeHours,
      status: fullMachine.status,
      current_job_id: fullMachine.currentJobId || null,
      build_volume_mm: fullMachine.buildVolumeMm,
      updated_at: fullMachine.updatedAt
    });
    if (error) throw error;
    return ok(fullMachine);
  } catch (e: any) {
    return fail(e, 'Không lưu được máy in.');
  }
}

export async function updateMachineStatus(
  machineId: string,
  status: 'Free' | 'Busy' | 'Maintenance' | 'Offline',
  currentJobId?: string
): Promise<WriteResult> {
  const local = readFromStorage<WorkshopMachine[]>(STORAGE_KEYS.WORKSHOP_MACHINES, SEED_WORKSHOP_MACHINES);
  const updated = local.map(m => m.id === machineId ? { ...m, status, currentJobId: currentJobId ?? (status === 'Busy' ? m.currentJobId : undefined), updatedAt: new Date().toISOString() } : m);
  writeToStorage(STORAGE_KEYS.WORKSHOP_MACHINES, updated);

  try {
    const { error } = await supabase.from('workshop_machines').update({
      status,
      current_job_id: currentJobId ?? (status === 'Busy' ? undefined : null),
      updated_at: new Date().toISOString()
    }).eq('id', machineId);
    if (error) throw error;
    return ok();
  } catch (e: any) {
    return fail(e, 'Không cập nhật được trạng thái máy.');
  }
}

export async function deleteWorkshopMachine(id: string): Promise<WriteResult> {
  const local = readFromStorage<WorkshopMachine[]>(STORAGE_KEYS.WORKSHOP_MACHINES, SEED_WORKSHOP_MACHINES);
  writeToStorage(STORAGE_KEYS.WORKSHOP_MACHINES, local.filter(m => m.id !== id));
  try {
    const { error } = await supabase.from('workshop_machines').delete().eq('id', id);
    if (error) throw error;
    return ok();
  } catch (e: any) {
    return fail(e, 'Không xoá được máy in.');
  }
}

// --------------------------------------------------------------------------
// W1b.1 — MÁY IN CỦA CHÍNH XƯỞNG (`workshop_machines`)
// --------------------------------------------------------------------------
export async function getMyMachines(workshopProfileId: string): Promise<MyMachinesResult> {
  if (!workshopProfileId) return { data: [] };
  const { data, error } = await supabase
    .from('workshop_machines')
    .select('id,workshop_id,name,brand,model,technology,bed_dimensions,status,hourly_rate,created_at,updated_at')
    .eq('workshop_id', workshopProfileId)
    .order('created_at', { ascending: true });
  if (error) return { data: [], error: error.message };
  return { data: ((data ?? []) as unknown as Record<string, unknown>[]).map(mapMyMachine) };
}

export async function saveMyMachine(input: MyMachineInput): Promise<WriteResult> {
  if (!input.workshopProfileId) {
    return { success: false, error: 'Thiếu hồ sơ xưởng — không thể khai báo máy in.' };
  }
  const payload: Record<string, unknown> = {
    workshop_id: input.workshopProfileId,
    name: input.name,
    brand: input.brand ?? '',
    model: input.model ?? '',
    technology: input.technology ?? 'FDM',
    bed_dimensions: input.bedDimensions ?? { x: 256, y: 256, z: 256 },
    status: input.status ?? 'Free',
    hourly_rate: input.hourlyRate ?? null,
    updated_at: new Date().toISOString(),
  };

  try {
    if (input.id) {
      const { data, error } = await supabase
        .from('workshop_machines')
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

    const { data, error } = await supabase.from('workshop_machines').insert(payload).select('id');
    if (error) return { success: false, error: error.message };
    if (!data || data.length === 0) {
      return { success: false, error: 'Máy chủ không tạo được hàng nào (quyền RLS).' };
    }
    return ok();
  } catch (e: any) {
    return { success: false, error: e?.message || 'Lỗi không xác định khi lưu máy in.' };
  }
}

export async function setMyMachineStatus(
  machineId: string,
  workshopProfileId: string,
  status: string
): Promise<WriteResult> {
  try {
    const { data, error } = await supabase
      .from('workshop_machines')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', machineId)
      .eq('workshop_id', workshopProfileId)
      .select('id');
    if (error) return { success: false, error: error.message };
    if (!data || data.length === 0) {
      return { success: false, error: 'Máy chủ không ghi được hàng nào (quyền RLS).' };
    }
    return ok();
  } catch (e: any) {
    return { success: false, error: e?.message || 'Lỗi không xác định khi đổi trạng thái máy.' };
  }
}

export async function deleteMyMachine(machineId: string, workshopProfileId: string): Promise<WriteResult> {
  try {
    const { data, error } = await supabase
      .from('workshop_machines')
      .delete()
      .eq('id', machineId)
      .eq('workshop_id', workshopProfileId)
      .select('id');
    if (error) return { success: false, error: error.message };
    if (!data || data.length === 0) {
      return { success: false, error: 'Máy chủ không xoá được hàng nào (quyền RLS).' };
    }
    return ok();
  } catch (e: any) {
    return { success: false, error: e?.message || 'Lỗi không xác định khi xoá máy in.' };
  }
}