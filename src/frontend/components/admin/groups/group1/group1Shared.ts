import type { PrinterProfile, WorkshopMachine } from '@/types';

export const printerStatusToMachineStatus = (
  status: PrinterProfile['status']
): WorkshopMachine['status'] =>
  status === 'Printing' ? 'Busy' : status === 'Maintenance' ? 'Maintenance' : 'Free';

/**
 * Dòng `printer_fleet` → dạng `WorkshopMachine` để dùng lại bộ tính chi phí vận hành của
 * store. `workshopId` để rỗng: `printer_fleet` là đội máy TOÀN HỆ THỐNG, KHÔNG có cột
 * `workshop_id` (khác `workshop_machines` — bảng bị giới hạn theo xưởng đang đăng nhập).
 * Trường nào DB chưa đo (`power_kw` / `acquisition_cost` / `expected_lifetime_hours`
 * nullable) thì để `undefined` ⇒ UI hiện '—', KHÔNG điền số thay.
 */
export const printerToMachine = (p: PrinterProfile): WorkshopMachine => {
  const bed = p.bedDimensions;
  const hasVolume =
    !!bed && bed.x !== null && bed.y !== null && bed.z !== null;
  return {
    id: p.id,
    workshopId: '',
    machineName: p.name,
    // `printer_fleet.technology` chỉ có FDM | SLA | SLS (không có PolyJet) ⇒ ánh xạ thẳng.
    machineType: p.technology as WorkshopMachine['machineType'],
    avgPowerKW: p.powerKW ?? undefined,
    purchasePrice: p.acquisitionCost ?? undefined,
    lifetimeHours: p.expectedLifetimeHours ?? undefined,
    hourlyRate: p.hourlyRate ?? null,
    status: printerStatusToMachineStatus(p.status),
    buildVolumeMm: hasVolume
      ? { x: bed!.x as number, y: bed!.y as number, z: bed!.z as number }
      : undefined
  };
};
