import { create } from 'zustand';

export type ProductionStageKey =
  | 'pending_payment'
  | 'cad_prep'
  | 'slicing'
  | 'printing'
  | 'post_processing'
  | 'qc_inspection'
  | 'packaging'
  | 'delivering';

export interface ProductionStageInfo {
  index: number;
  key: ProductionStageKey;
  labelVi: string;
  labelEn: string;
  shortVi: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  role: string;
  avgDuration: string;
}

export const KANBAN_STAGES: ProductionStageInfo[] = [
  {
    index: 0,
    key: 'pending_payment',
    labelVi: '1. Chờ thanh toán & Tiếp nhận',
    labelEn: '1. Awaiting Payment & Intake',
    shortVi: 'Chờ thanh toán',
    icon: 'hourglass_empty',
    color: 'text-warning',
    bgColor: 'bg-warning-tint',
    borderColor: 'border-warning/30',
    role: 'Kế toán / Sale Hub',
    avgDuration: '15 phút'
  },
  {
    index: 1,
    key: 'cad_prep',
    labelVi: '2. Chuẩn bị file CAD & Kiểm lỗi',
    labelEn: '2. CAD Preparation & Healing',
    shortVi: 'Chuẩn bị CAD',
    icon: 'folder_open',
    color: 'text-info',
    bgColor: 'bg-info-tint',
    borderColor: 'border-info/30',
    role: 'Kỹ sư CAD / CAM',
    avgDuration: '25 phút'
  },
  {
    index: 2,
    key: 'slicing',
    labelVi: '3. Đang cắt lớp (Slicing G-code)',
    labelEn: '3. Slicing & G-Code Generation',
    shortVi: 'Đang cắt lớp',
    icon: 'layers',
    color: 'text-info',
    bgColor: 'bg-info-tint',
    borderColor: 'border-info/30',
    role: 'Kỹ sư Slicing CAM',
    avgDuration: '20 phút'
  },
  {
    index: 3,
    key: 'printing',
    labelVi: '4. Đang in 3D (FDM / SLA)',
    labelEn: '4. Active 3D Printing',
    shortVi: 'Đang in',
    icon: 'print',
    color: 'text-positive',
    bgColor: 'bg-positive-tint',
    borderColor: 'border-positive/30',
    role: 'Kỹ thuật viên Farm',
    avgDuration: '3h - 12h'
  },
  {
    index: 4,
    key: 'post_processing',
    labelVi: '5. Hậu kỳ, bóc support & UV',
    labelEn: '5. Post-Processing & Curing',
    shortVi: 'Hậu kỳ',
    icon: 'handyman',
    color: 'text-info',
    bgColor: 'bg-info-tint',
    borderColor: 'border-info/30',
    role: 'Thợ hoàn thiện bề mặt',
    avgDuration: '45 phút'
  },
  {
    index: 5,
    key: 'qc_inspection',
    labelVi: '6. Kiểm định QC & Thước kẹp',
    labelEn: '6. QC & Dimensional Check',
    shortVi: 'Kiểm định QC',
    icon: 'verified',
    color: 'text-danger',
    bgColor: 'bg-danger-tint',
    borderColor: 'border-danger/30',
    role: 'Giám sát chất lượng QC',
    avgDuration: '20 phút'
  },
  {
    index: 6,
    key: 'packaging',
    labelVi: '7. Đóng gói & Chống sốc xốp',
    labelEn: '7. Protective Packaging',
    shortVi: 'Đóng gói',
    icon: 'inventory_2',
    color: 'text-primary',
    bgColor: 'bg-primary-tint',
    borderColor: 'border-primary/30',
    role: 'Nhân viên đóng gói',
    avgDuration: '15 phút'
  },
  {
    index: 7,
    key: 'delivering',
    labelVi: '8. Đang giao (VCUBE Express)',
    labelEn: '8. Delivering & Logistics',
    shortVi: 'Đang giao',
    icon: 'local_shipping',
    color: 'text-info',
    bgColor: 'bg-info-tint',
    borderColor: 'border-info/30',
    role: 'Đối tác giao vận',
    avgDuration: '1 - 2 ngày'
  }
];

/**
 * Vùng miền giao vận.
 *
 * `'Chưa rõ'` là trạng thái THẬT: bảng `orders` KHÔNG có cột vùng miền, chỉ có
 * `shipping_address` dạng văn bản. Chuỗi địa chỉ không khớp tỉnh/thành nào đã biết ⇒
 * KHÔNG được đoán bừa về 'Nam' như bản trước (gán sai miền = điều sai trạm in).
 */
export type ProductionRegion = 'Bắc' | 'Trung' | 'Nam' | 'Chưa rõ';

/**
 * Suy vùng miền từ CHUỖI ĐỊA CHỈ THẬT (`orders.shipping_address`).
 *
 * Đây là ánh xạ HÀNH CHÍNH (tỉnh/thành → miền) trên dữ liệu khách đã nhập, không phải số
 * liệu đo. Không khớp gì ⇒ `'Chưa rõ'`.
 */
export function regionFromAddress(addressText: string): ProductionRegion {
  const hay = (addressText || '').toLowerCase();
  if (!hay.trim()) return 'Chưa rõ';

  const NORTH = [
    'hà nội', 'hải phòng', 'bắc ninh', 'thái nguyên', 'hải dương', 'quảng ninh', 'nam định',
    'ninh bình', 'vĩnh phúc', 'hưng yên', 'thái bình', 'hà nam', 'phú thọ', 'lạng sơn',
    'bắc giang', 'cao bằng', 'lào cai', 'yên bái', 'sơn la', 'hòa bình', 'tuyên quang',
    'hà giang', 'lai châu', 'điện biên', 'bắc kạn'
  ];
  const CENTRAL = [
    'thanh hóa', 'nghệ an', 'hà tĩnh', 'quảng bình', 'quảng trị', 'huế', 'thừa thiên',
    'đà nẵng', 'quảng nam', 'quảng ngãi', 'bình định', 'phú yên', 'khánh hòa', 'ninh thuận',
    'bình thuận', 'kon tum', 'gia lai', 'đắk lắk', 'đắk nông', 'lâm đồng'
  ];
  const SOUTH = [
    'hồ chí minh', 'sài gòn', 'tp.hcm', 'tp hcm', 'bình dương', 'đồng nai', 'bà rịa',
    'vũng tàu', 'long an', 'tiền giang', 'bến tre', 'trà vinh', 'vĩnh long', 'đồng tháp',
    'an giang', 'kiên giang', 'cần thơ', 'hậu giang', 'sóc trăng', 'bạc liêu', 'cà mau',
    'tây ninh', 'bình phước'
  ];

  if (NORTH.some((k) => hay.includes(k))) return 'Bắc';
  if (CENTRAL.some((k) => hay.includes(k))) return 'Trung';
  if (SOUTH.some((k) => hay.includes(k))) return 'Nam';
  return 'Chưa rõ';
}

export interface GeoDispatchRecommendation {
  workshopId: string;
  workshopName: string;
  region: ProductionRegion;
  city: string;
  suggestedPrinterId: string;
  suggestedPrinterName: string;
  printerStatus: 'Free' | 'Busy' | 'Maintenance' | 'Offline';
  stockStatus: 'Sufficient' | 'LowStock' | 'OutOfStock';
  availableStockGrams: number;
  requiredGrams: number;
  matchScore: number; // 0 - 100
  distanceEstimateKm: number;
  matchReasons: string[];
}

/**
 * Một thẻ trên bảng Kanban = MỘT đơn THẬT trong bảng `orders`.
 *
 * LUẬT TRUNG THỰC: chỉ `orders` + `orders.items` (jsonb) là nguồn. Trường nào bảng đơn KHÔNG
 * có cột (`layer_progress` chưa báo, số gam, giờ in, layer height, màu hex, gán xưởng/máy…)
 * thì khai `null` ⇒ UI render `—`, TUYỆT ĐỐI không điền số mặc định. Trường chỉ sống trong
 * phiên (`operatorNotes`, `qcInspectionPassed`, `qcNotes`) được chú thích rõ.
 */
export interface ProductionJob {
  /** `orders.id` — khoá THẬT. Mọi lệnh ghi đi qua `dbService.updateOrderStatus`. */
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerCity: string;
  region: ProductionRegion;
  stageIndex: number;
  stageKey: ProductionStageKey;
  /** Tóm tắt hạng mục suy từ `orders.items`; đơn không có item ⇒ `null`. */
  itemsSummary: string | null;
  materialName: string | null;
  colorName: string | null;
  /** `orders.items[].color` là TÊN màu, không phải mã hex ⇒ luôn `null` cho tới khi có nguồn. */
  colorHex: string | null;
  /** Không có cột trong `orders` ⇒ `null` (UI hiện `—`). */
  layerHeightMm: number | null;
  /** Suy từ `orders.items[].infill` (chuỗi khách chọn) — không parse được ⇒ `null`. */
  infillPercent: number | null;
  /** Không có cột khối lượng ⇒ `null`. */
  totalGrams: number | null;
  /** Không có cột thời lượng in ⇒ `null`. */
  estimatedPrintHours: number | null;
  estimatedDeliveryDate: string;
  assignedWorkshopId: string | null;
  assignedWorkshopName: string | null;
  assignedPrinterId: string | null;
  assignedPrinterName: string | null;
  /** Bảng `orders` chưa có cột trạng thái điều phối ⇒ mặc định `'unassigned'` (đúng thực tế). */
  dispatchStatus: 'unassigned' | 'suggested' | 'confirmed' | 'reassigned';
  dispatchConfirmedAt?: string;
  dispatchConfirmedBy?: string;
  /** `orders.layer_progress`; `null` = máy in/MES CHƯA báo tiến độ. */
  layerProgress: number | null;
  /** `orders` chưa có cột ưu tiên ⇒ luôn `'normal'`; huy hiệu "Hỏa tốc" không tự bật. */
  priority: 'low' | 'normal' | 'high' | 'urgent';
  /** CHỈ TRONG PHIÊN (chưa có cột DB) — không ghi localStorage. */
  operatorNotes: string;
  /** CHỈ TRONG PHIÊN (chưa có cột DB). */
  qcInspectionPassed?: boolean;
  /** CHỈ TRONG PHIÊN (chưa có cột DB). */
  qcNotes?: string;
  createdAt: string;
}

export interface WorkshopTelemetryNode {
  id: string;
  name: string;
  region: ProductionRegion;
  address: string;
  activeMachines: number;
  totalMachines: number;
  freeMachines: number;
  materialsStock: {
    materialName: string;
    stockGrams: number;
    colorHex: string;
  }[];
  fleet: {
    id: string;
    name: string;
    type: 'FDM' | 'SLA';
    status: 'Free' | 'Busy' | 'Maintenance' | 'Offline';
    currentJobId?: string;
    currentMaterial?: string;
    progressPercent?: number;
  }[];
}

/**
 * ⚠️ RỖNG CÓ CHỦ Ý — dữ liệu bịa đã bị gỡ khỏi production.
 * AD-05/CI-05: ham đội máy + trạm in bịa (16/8/28 máy, activeMachines, status Busy/Free,
 * progressPercent 74/42/88/62/30, tệp nhựa tồn kho 28.500 g…) từng hiện như telemetry MES thật.
 * Nguồn thật: bảng `printer_fleet` / `workshop_partners` + `materials` — nhập ở /admin (Đội Máy In 3D).
 */
export const INITIAL_WORKSHOP_NODES: WorkshopTelemetryNode[] = [];

/**
 * KHOÁ PERSIST ĐÃ CHẾT.
 *
 * `useProductionStore` từng là store `persist` ghi xuống `localStorage: vcube_production_store_v1`
 * (job MES + trạm in BỊA, kèm PII khách). Bản persist đó đã bị gỡ: Kanban nay đọc `orders` THẬT
 * từ Supabase và ghi nấc qua `dbService.updateOrderStatus`. Xoá khoá cũ để dữ liệu bịa không
 * còn nằm lại trên máy người dùng (không còn ai đọc nó nữa).
 */
const LEGACY_PERSIST_KEY = 'vcube_production_store_v1';
try {
  localStorage.removeItem(LEGACY_PERSIST_KEY);
} catch {
  // Không có localStorage (SSR/test) — không phải lỗi.
}

/**
 * Store này CHỈ giữ trạng thái GIAO DIỆN của màn vận hành sản xuất (bộ lọc, dòng đang chọn,
 * danh sách trạm in chưa nối nguồn). KHÔNG còn:
 *   * `persist`/localStorage — nguồn sự thật là bảng `orders`;
 *   * `jobs` — Kanban dựng job từ `orders` THẬT (xem `Group5ProductionPanel`);
 *   * các action tự chuyển nấc/gán xưởng tại chỗ — chúng "thành công" mà không ghi đâu cả.
 */
export interface ProductionStoreState {
  workshops: WorkshopTelemetryNode[];
  selectedJobId: string | null;
  activeStageFilter: 'all' | ProductionStageKey;
  activeRegionFilter: 'all' | ProductionRegion;
  activeWorkshopFilter: 'all' | string;
  searchQuery: string;

  setSelectedJobId: (id: string | null) => void;
  setActiveStageFilter: (stage: 'all' | ProductionStageKey) => void;
  setActiveRegionFilter: (region: 'all' | ProductionRegion) => void;
  setActiveWorkshopFilter: (workshopId: 'all' | string) => void;
  setSearchQuery: (query: string) => void;

  calculateGeoDispatchRecommendation: (job: ProductionJob) => GeoDispatchRecommendation;
}

export const useProductionStore = create<ProductionStoreState>()((set, get) => ({
  workshops: INITIAL_WORKSHOP_NODES,
  selectedJobId: null,
  activeStageFilter: 'all',
  activeRegionFilter: 'all',
  activeWorkshopFilter: 'all',
  searchQuery: '',

  setSelectedJobId: (id) => set({ selectedJobId: id }),
  setActiveStageFilter: (stage) => set({ activeStageFilter: stage }),
  setActiveRegionFilter: (region) => set({ activeRegionFilter: region }),
  setActiveWorkshopFilter: (workshopId) => set({ activeWorkshopFilter: workshopId }),
  setSearchQuery: (query) => set({ searchQuery: query }),

  /**
   * Đề xuất điều phối: dựng từ ĐỊA CHỈ THẬT của đơn + đội máy/tồn kho của trạm in.
   * `workshops` hiện RỖNG (fixture trạm in đã gỡ) ⇒ hàm trả đề xuất "chưa có trạm in nào"
   * thay vì bịa một trạm. Mọi điểm số ở đây là CÔNG THỨC trên dữ liệu đã khai, không phải số đo.
   */
  calculateGeoDispatchRecommendation: (job) => {
    const { workshops } = get();

    // 1. Vùng miền: ưu tiên vùng đã suy từ địa chỉ; nếu chưa rõ thì suy tiếp từ chính chuỗi đó.
    const targetRegion: ProductionRegion =
      job.region !== 'Chưa rõ'
        ? job.region
        : regionFromAddress(`${job.customerCity} ${job.customerAddress}`);

    // 2. Trạm in cùng miền (chỉ có khi admin đã khai trạm).
    const regionalWorkshop =
      workshops.find((w) => w.region === targetRegion) || workshops[0];

    // AD-05: fixture trạm in đã rỗng hoá ⇒ có thể không còn trạm nào.
    // Trả đề xuất "chưa có dữ liệu" thay vì ném TypeError khi `workshops` rỗng.
    if (!regionalWorkshop) {
      return {
        workshopId: '',
        workshopName: '',
        region: targetRegion,
        city: targetRegion === 'Chưa rõ' ? '' : targetRegion,
        suggestedPrinterId: '',
        suggestedPrinterName: '',
        printerStatus: 'Offline',
        stockStatus: 'OutOfStock',
        availableStockGrams: 0,
        requiredGrams: job.totalGrams ?? 0,
        matchScore: 0,
        distanceEstimateKm: 0,
        matchReasons: ['Chưa có trạm in nào trong hệ thống (bảng trạm in rỗng)']
      };
    }

    // 3. Máy rảnh.
    const freePrinter = regionalWorkshop.fleet.find((p) => p.status === 'Free') || regionalWorkshop.fleet[0];

    // 4. Tồn kho vật liệu khớp tên vật liệu của đơn (nếu đơn có khai vật liệu).
    const materialKey = (job.materialName || '').trim().toLowerCase().slice(0, 4);
    const matStock = materialKey
      ? regionalWorkshop.materialsStock.find((m) => m.materialName.toLowerCase().includes(materialKey))
      : undefined;
    // Không có bản ghi tồn kho ⇒ 0 g (trước đây suy ra 5.000 g "đủ hàng" không có thật).
    const availableStockGrams = matStock?.stockGrams ?? 0;
    const requiredGrams = job.totalGrams ?? 0;
    const hasSufficientStock = availableStockGrams > 0 && availableStockGrams >= requiredGrams;

    // 5. Điểm khớp (công thức, không phải số đo).
    let score = 50;
    const matchReasons: string[] = [];

    if (regionalWorkshop.region === targetRegion) {
      score += 25;
      matchReasons.push(`Trạm ${regionalWorkshop.name} cùng khu vực Miền ${targetRegion}`);
    }
    if (freePrinter && freePrinter.status === 'Free') {
      score += 15;
      matchReasons.push(`Máy in ${freePrinter.name} đang ở trạng thái Trống (Free)`);
    }
    if (hasSufficientStock) {
      score += 10;
      matchReasons.push(`Tồn kho vật liệu ${job.materialName} đủ (${(availableStockGrams / 1000).toFixed(1)}kg)`);
    }

    return {
      workshopId: regionalWorkshop.id,
      workshopName: regionalWorkshop.name,
      region: targetRegion,
      city: regionalWorkshop.address.split(',').pop()?.trim() || (targetRegion === 'Chưa rõ' ? '' : targetRegion),
      suggestedPrinterId: freePrinter?.id || '',
      suggestedPrinterName: freePrinter?.name || '',
      printerStatus: freePrinter?.status || 'Offline',
      stockStatus: availableStockGrams <= 0 ? 'OutOfStock' : hasSufficientStock ? 'Sufficient' : 'LowStock',
      availableStockGrams,
      requiredGrams,
      matchScore: Math.min(99, score),
      distanceEstimateKm: targetRegion === 'Bắc' ? 8.5 : targetRegion === 'Trung' ? 6.2 : targetRegion === 'Nam' ? 12.0 : 0,
      matchReasons
    };
  }
}));
