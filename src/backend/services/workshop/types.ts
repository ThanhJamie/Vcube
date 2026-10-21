import type { WriteResult } from '../../lib/result';



// ============================================================================
// W1b — KIỂU DỮ LIỆU CHO BẢNG ĐIỀU KHIỂN XƯỞNG
//
// Các kiểu dưới đây phản ánh ĐÚNG cột đang tồn tại trên project thật (kiểm chứng bằng
// OpenAPI của PostgREST). Chúng KHÔNG dùng `WorkshopMachine`/`WorkshopMaterial` trong
// `src/types/index.ts` vì hai kiểu đó mô tả cột không tồn tại (`machine_name`,
// `avg_power_kw`, `current_stock_grams`…) — dùng chúng sẽ cho ra `undefined` hàng loạt.
// ============================================================================

export interface MyWorkshopProfile {
  id: string;
  userId: string | null;
  /** `null` = tài khoản chưa được gắn đối tác ⇒ không thể nhận đơn. */
  partnerId: string | null;
  workshopName: string;
  address: string;
  region: string;
  verifiedStatus: string;
  contactPhone: string;
  contactEmail: string;
  /** `null` = CHƯA CẤU HÌNH (rỗng). KHÔNG được thay bằng một số mặc định. */
  electricityRateOverride: number | null;
  /** `null` = CHƯA CẤU HÌNH (rỗng). KHÔNG được thay bằng một số mặc định. */
  laborRateOverride: number | null;
  totalMachines: number | null;
  activeMachinesNow: number | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface MyWorkshopProfileResult {
  profile: MyWorkshopProfile | null;
  error?: string | null;
  /** > 1 = user có nhiều hồ sơ xưởng (bảng KHÔNG có unique trên `user_id`). */
  duplicateCount: number;
}

export interface MyWorkshopProfilePatch {
  workshopName?: string;
  address?: string;
  region?: string;
  contactPhone?: string;
  contactEmail?: string;
  /** `null` = xoá cấu hình (ô để trống). */
  electricityRateOverride?: number | null;
  laborRateOverride?: number | null;
}

/** Một máy in do CHÍNH xưởng khai báo (`workshop_machines`). */
export interface MyMachine {
  id: string;
  workshopId: string;
  name: string;
  brand: string;
  model: string;
  technology: string;
  status: string;
  /** `null` = xưởng chưa khai đơn giá giờ máy. */
  hourlyRate: number | null;
  bedDimensions: { x: number; y: number; z: number } | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface MyMachinesResult {
  data: MyMachine[];
  error?: string | null;
}

export interface MyMachineInput {
  id?: string;
  workshopProfileId: string;
  name: string;
  brand?: string;
  model?: string;
  technology?: string;
  status?: string;
  hourlyRate?: number | null;
  bedDimensions?: { x: number; y: number; z: number };
}

/** Một vật liệu của CHÍNH xưởng (`workshop_materials`). */
export interface MyMaterial {
  id: string;
  workshopId: string;
  name: string;
  type: string;
  color: string;
  /** `null` = chưa từng ghi nhận tồn (KHÁC `0`). */
  currentStockGrams: number | null;
  lowStockThresholdGrams: number | null;
  /** `null` = xưởng chưa khai đơn giá vật liệu. */
  pricePerKg: number | null;
  stockStatus: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface MyMaterialsResult {
  data: MyMaterial[];
  error?: string | null;
}

export interface MyMaterialInput {
  id?: string;
  workshopProfileId: string;
  name: string;
  type?: string;
  color?: string;
  currentStockGrams?: number | null;
  lowStockThresholdGrams?: number | null;
  pricePerKg?: number | null;
  stockStatus?: string;
}

/** Một dòng sổ kho của xưởng (`material_inventory_logs`). */
export interface MyInventoryLog {
  id: string;
  materialId: string;
  action: string;
  grams: number | null;
  pricePerKgAtTime: number | null;
  supplier: string;
  batchCode: string;
  note: string;
  createdBy: string;
  createdAt: string | null;
}

export interface MyInventoryLogsResult {
  data: MyInventoryLog[];
  error?: string | null;
}

export interface MyInventoryLogInput {
  workshopProfileId: string;
  materialId: string;
  action: 'Import' | 'Export' | 'Adjustment';
  grams: number;
  pricePerKgAtTime?: number | null;
  supplier?: string;
  batchCode?: string;
  note?: string;
  /** Danh tính THẬT của người ghi phiếu (email phiên đăng nhập). */
  createdBy?: string;
}

export type MyInventoryLogResult = WriteResult<
  void,
  {
    /** `false` = phiếu đã ghi nhưng tồn kho CHƯA cập nhật ⇒ view phải nói đúng. */
    stockUpdated: boolean;
    newStockGrams: number | null;
  }
>;

/** Một phụ kiện riêng của xưởng (`workshop_accessories`). */
export interface MyAccessory {
  id: string;
  workshopId: string;
  name: string;
  unit: string;
  quantity: number | null;
  costPrice: number | null;
  sellingPrice: number | null;
  sku: string;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface MyAccessoriesResult {
  data: MyAccessory[];
  error?: string | null;
}

export interface MyAccessoryInput {
  id?: string;
  workshopProfileId: string;
  name: string;
  unit?: string;
  quantity?: number;
  costPrice?: number | null;
  sellingPrice?: number | null;
  sku?: string;
  isActive?: boolean;
}

export interface MyQueueItem {
  id: string;
  name: string;
  quantity: number;
  material: string | null;
  color: string | null;
}

/** Một đơn được giao CHO XƯỞNG NÀY (`orders.assigned_workshop_id = partner_id`). */
export interface MyQueueOrder {
  id: string;
  orderNumber: string;
  date: string | null;
  estimatedDelivery: string;
  status: string;
  /** `null` = xưởng chưa báo nấc nào. */
  statusStageIndex: number | null;
  /** `null` = máy in chưa báo tiến độ lớp. */
  layerProgress: number | null;
  assignedPrinterId: string | null;
  items: MyQueueItem[];
}

export interface MyQueueResult {
  data: MyQueueOrder[];
  error?: string | null;
}

export interface MyOrderProgressInput {
  orderId: string;
  /** `orders.assigned_workshop_id` của xưởng đang đăng nhập — chốt phạm vi ở tầng truy vấn. */
  partnerId: string | null;
  /** 0..7, khớp `MES_PIPELINE_STAGES` trong `OrderProgress.tsx`. */
  stageIndex: number;
  status: string;
  layerProgress?: number | null;
}

export type MyOrderProgressResult = WriteResult<
  void,
  {
    updatedRows: number;
    /** Kết quả tự động trừ kho khi đơn chuyển sang `completed` (chỉ khi item khai khối lượng). */
    stockDeduction?: { deducted: number; skipped: number };
  }
>;

export interface PrinterFleetRef {
  id: string;
  name: string;
  brand?: string | null;
  model?: string | null;
  technology?: string | null;
  bed_dimensions?: { x?: number; y?: number; z?: number } | null;
  power_kw?: number | null;
  status?: string | null;
}

export interface PrinterFleetCatalogResult {
  data: PrinterFleetRef[];
  error?: string | null;
}

export interface MaterialCatalogRef {
  id: string;
  name: string;
  brand?: string | null;
  type?: string | null;
  density?: number | null;
  cost_per_kg?: number | null;
}

export interface MaterialCatalogResult {
  data: MaterialCatalogRef[];
  error?: string | null;
}
