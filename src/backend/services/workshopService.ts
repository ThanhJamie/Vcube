/**
 * WorkshopService — PUBLIC API FAÇADE (Phase 4c tách god-file, behavior-preserving).
 *
 * Toàn bộ thân method đã chuyển sang `./workshop/*` theo nhóm trách nhiệm:
 * profiles · machines · materials · inventory · accessories · designers · customers ·
 * queue · catalogs · shared (mapper/util) · storage (fallback localStorage) · seed · types.
 *
 * File này CHỈ còn:
 * - import namespace module con + delegate 1-1 (giữ nguyên chữ ký, kiểu trả về, hành vi);
 * - re-export y hệt surface cũ: class `WorkshopService`, singleton `workshopService`,
 *   các SEED_* / hằng MY_* / toàn bộ interface type.
 * ⇒ 0 importer phải sửa.
 */
import type { WorkshopProfile, WorkshopMachine, WorkshopMaterial, MaterialInventoryLog, DesignerProfile, CustomerProfile, WorkshopAccessory } from '../../types';
import type { WriteResult } from '../lib/result';
import type { MyWorkshopProfileResult, MyWorkshopProfilePatch, MyMachinesResult, MyMachineInput, MyMaterialsResult, MyMaterialInput, MyInventoryLogsResult, MyInventoryLogInput, MyInventoryLogResult, MyAccessoriesResult, MyAccessoryInput, MyQueueResult, MyOrderProgressInput, MyOrderProgressResult, PrinterFleetCatalogResult, MaterialCatalogResult } from './workshop/types';
import * as profiles from './workshop/profiles';
import * as machines from './workshop/machines';
import * as materials from './workshop/materials';
import * as inventory from './workshop/inventory';
import * as accessories from './workshop/accessories';
import * as designers from './workshop/designers';
import * as customers from './workshop/customers';
import * as queue from './workshop/queue';
import * as catalogs from './workshop/catalogs';
import * as shared from './workshop/shared';

export class WorkshopService {
  static async checkSupabaseHealth(): Promise<{ online: boolean; message: string }> { return profiles.checkSupabaseHealth(); }
  static async getWorkshopProfiles(filterRegion?: string): Promise<WorkshopProfile[]> { return profiles.getWorkshopProfiles(filterRegion); }
  static async getWorkshopProfileById(id: string): Promise<WorkshopProfile | null> { return profiles.getWorkshopProfileById(id); }
  static async getWorkshopProfileByUserId(userId: string): Promise<WorkshopProfile | null> { return profiles.getWorkshopProfileByUserId(userId); }
  static async saveWorkshopProfile(profile: Partial<WorkshopProfile> & { workshopName: string; address: string }): Promise<WriteResult<WorkshopProfile>> { return profiles.saveWorkshopProfile(profile); }
  static async deleteWorkshopProfile(id: string): Promise<WriteResult> { return profiles.deleteWorkshopProfile(id); }
  static async getWorkshopMachines(workshopId?: string): Promise<WorkshopMachine[]> { return machines.getWorkshopMachines(workshopId); }
  static async getWorkshopMachineById(id: string): Promise<WorkshopMachine | null> { return machines.getWorkshopMachineById(id); }
  static async saveWorkshopMachine(machine: WorkshopMachine): Promise<WriteResult<WorkshopMachine>> { return machines.saveWorkshopMachine(machine); }
  static async updateMachineStatus( machineId: string, status: 'Free' | 'Busy' | 'Maintenance' | 'Offline', currentJobId?: string ): Promise<WriteResult> { return machines.updateMachineStatus(machineId, status, currentJobId); }
  static async deleteWorkshopMachine(id: string): Promise<WriteResult> { return machines.deleteWorkshopMachine(id); }
  static async getWorkshopMaterials(workshopId?: string): Promise<WorkshopMaterial[]> { return materials.getWorkshopMaterials(workshopId); }
  static async getWorkshopMaterialById(id: string): Promise<WorkshopMaterial | null> { return materials.getWorkshopMaterialById(id); }
  static async saveWorkshopMaterial(mat: WorkshopMaterial): Promise<WriteResult<WorkshopMaterial>> { return materials.saveWorkshopMaterial(mat); }
  static async updateMaterialStock( materialId: string, currentStockGrams: number, stockStatus?: WorkshopMaterial['stockStatus'] ): Promise<WriteResult> { return materials.updateMaterialStock(materialId, currentStockGrams, stockStatus); }
  static async deleteWorkshopMaterial(id: string): Promise<WriteResult> { return materials.deleteWorkshopMaterial(id); }
  static async getInventoryLogs(materialId?: string): Promise<MaterialInventoryLog[]> { return inventory.getInventoryLogs(materialId); }
  static async addInventoryLog( log: Omit<MaterialInventoryLog, 'id' | 'createdAt'> & { id?: string; createdAt?: string } ): Promise<WriteResult<MaterialInventoryLog>> { return inventory.addInventoryLog(log); }
  static async getDesignerProfiles(): Promise<DesignerProfile[]> { return designers.getDesignerProfiles(); }
  static async getDesignerProfileById(id: string): Promise<DesignerProfile | null> { return designers.getDesignerProfileById(id); }
  static async getDesignerProfileByUserId(userId: string): Promise<DesignerProfile | null> { return designers.getDesignerProfileByUserId(userId); }
  static async saveDesignerProfile( profile: Partial<DesignerProfile> & { userId: string; displayName: string } ): Promise<WriteResult<DesignerProfile>> { return designers.saveDesignerProfile(profile); }
  static async deleteDesignerProfile(id: string): Promise<WriteResult> { return designers.deleteDesignerProfile(id); }
  static async getCustomerProfiles(): Promise<CustomerProfile[]> { return customers.getCustomerProfiles(); }
  static async getCustomerProfileById(id: string): Promise<CustomerProfile | null> { return customers.getCustomerProfileById(id); }
  static async getCustomerProfileByUserId(userId: string): Promise<CustomerProfile | null> { return customers.getCustomerProfileByUserId(userId); }
  static async saveCustomerProfile( profile: Partial<CustomerProfile> & { userId: string } ): Promise<WriteResult<CustomerProfile>> { return customers.saveCustomerProfile(profile); }
  static async deleteCustomerProfile(id: string): Promise<WriteResult> { return customers.deleteCustomerProfile(id); }
  static async getWorkshopAccessories(workshopId?: string): Promise<WorkshopAccessory[]> { return accessories.getWorkshopAccessories(workshopId); }
  static async getWorkshopAccessoryById(id: string): Promise<WorkshopAccessory | null> { return accessories.getWorkshopAccessoryById(id); }
  static async saveWorkshopAccessory( acc: WorkshopAccessory ): Promise<WriteResult<WorkshopAccessory>> { return accessories.saveWorkshopAccessory(acc); }
  static async deleteWorkshopAccessory(id: string): Promise<WriteResult> { return accessories.deleteWorkshopAccessory(id); }
  static async getCurrentUserId(): Promise<string | null> { return shared.getCurrentUserId(); }
  static async getMyWorkshopProfile(): Promise<MyWorkshopProfileResult> { return profiles.getMyWorkshopProfile(); }
  static async saveMyWorkshopProfile( profileId: string, patch: MyWorkshopProfilePatch ): Promise<WriteResult> { return profiles.saveMyWorkshopProfile(profileId, patch); }
  static async getMyMachines(workshopProfileId: string): Promise<MyMachinesResult> { return machines.getMyMachines(workshopProfileId); }
  static async saveMyMachine(input: MyMachineInput): Promise<WriteResult> { return machines.saveMyMachine(input); }
  static async setMyMachineStatus( machineId: string, workshopProfileId: string, status: string ): Promise<WriteResult> { return machines.setMyMachineStatus(machineId, workshopProfileId, status); }
  static async deleteMyMachine(machineId: string, workshopProfileId: string): Promise<WriteResult> { return machines.deleteMyMachine(machineId, workshopProfileId); }
  static async getMyMaterials(workshopProfileId: string): Promise<MyMaterialsResult> { return materials.getMyMaterials(workshopProfileId); }
  static async saveMyMaterial(input: MyMaterialInput): Promise<WriteResult> { return materials.saveMyMaterial(input); }
  static async deleteMyMaterial(materialId: string, workshopProfileId: string): Promise<WriteResult> { return materials.deleteMyMaterial(materialId, workshopProfileId); }
  static async getMyInventoryLogs(materialIds: string[]): Promise<MyInventoryLogsResult> { return inventory.getMyInventoryLogs(materialIds); }
  static async addMyInventoryLog(input: MyInventoryLogInput): Promise<MyInventoryLogResult> { return inventory.addMyInventoryLog(input); }
  static async getMyAccessories(workshopProfileId: string): Promise<MyAccessoriesResult> { return accessories.getMyAccessories(workshopProfileId); }
  static async saveMyAccessory(input: MyAccessoryInput): Promise<WriteResult> { return accessories.saveMyAccessory(input); }
  static async deleteMyAccessory(accessoryId: string, workshopProfileId: string): Promise<WriteResult> { return accessories.deleteMyAccessory(accessoryId, workshopProfileId); }
  static async getMyQueueOrders(partnerId: string | null): Promise<MyQueueResult> { return queue.getMyQueueOrders(partnerId); }
  static async updateMyOrderProgress(input: MyOrderProgressInput): Promise<MyOrderProgressResult> { return queue.updateMyOrderProgress(input); }
  static async deductMaterialsForCompletedOrder( orderId: string, partnerId: string, ): Promise<{ deducted: number; skipped: number }> { return inventory.deductMaterialsForCompletedOrder(orderId, partnerId); }
  static async getPrinterFleetCatalog(): Promise<PrinterFleetCatalogResult> { return catalogs.getPrinterFleetCatalog(); }
  static async getMaterialsCatalog(): Promise<MaterialCatalogResult> { return catalogs.getMaterialsCatalog(); }
}

export type {
  MyWorkshopProfile,
  MyWorkshopProfileResult,
  MyWorkshopProfilePatch,
  MyMachine,
  MyMachinesResult,
  MyMachineInput,
  MyMaterial,
  MyMaterialsResult,
  MyMaterialInput,
  MyInventoryLog,
  MyInventoryLogsResult,
  MyInventoryLogInput,
  MyInventoryLogResult,
  MyAccessory,
  MyAccessoriesResult,
  MyAccessoryInput,
  MyQueueItem,
  MyQueueOrder,
  MyQueueResult,
  MyOrderProgressInput,
  MyOrderProgressResult,
  PrinterFleetRef,
  PrinterFleetCatalogResult,
  MaterialCatalogRef,
  MaterialCatalogResult,
} from './workshop/types';

export {
  MY_ORDER_STATUS_LABELS,
  MY_ORDER_STATUS_BY_STAGE,
  MY_MACHINE_STATUSES,
  MY_MACHINE_STATUS_LABELS,
} from './workshop/constants';

export {
  SEED_WORKSHOP_PROFILES,
  SEED_WORKSHOP_MACHINES,
  SEED_WORKSHOP_MATERIALS,
  SEED_MATERIAL_INVENTORY_LOGS,
  SEED_DESIGNER_PROFILES,
  SEED_CUSTOMER_PROFILES,
  SEED_WORKSHOP_ACCESSORIES,
} from './workshop/seed';

export const workshopService = WorkshopService;
