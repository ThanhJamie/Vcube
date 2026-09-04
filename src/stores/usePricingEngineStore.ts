import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  PricingGlobalSettings,
  WorkshopMachine,
  WorkshopMaterial,
  WorkshopAccessory,
  InkiriCalculationInput,
  InkiriCalculationResult
} from '../types';
import { PricingEngineService, DEFAULT_PRICING_GLOBAL_SETTINGS } from '../backend/services/pricingEngineService';

// Extended preset models to include temperature and metadata
export interface ExtendedWorkshopMaterial extends WorkshopMaterial {
  extruderTempMin?: number;
  extruderTempMax?: number;
  bedTemp?: number;
  recommendedFor?: string;
  brand?: string;
}

export interface ExtendedWorkshopAccessory extends WorkshopAccessory {
  unit?: string;
  defaultUsedQty?: number;
  description?: string;
}

// Initial Machine Presets
export const INITIAL_MACHINE_PRESETS: WorkshopMachine[] = [
  {
    id: 'mach-bambu-x1c',
    workshopId: 'ws-global',
    machineName: 'Bambu Lab X1-Carbon AMS',
    machineType: 'FDM',
    avgPowerKW: 0.18,
    purchasePrice: 36000000,
    lifetimeHours: 8000,
    status: 'Free',
    buildVolumeMm: { x: 256, y: 256, z: 256 },
    createdAt: new Date().toISOString()
  },
  {
    id: 'mach-bambu-p1s',
    workshopId: 'ws-global',
    machineName: 'Bambu Lab P1S Combo AMS',
    machineType: 'FDM',
    avgPowerKW: 0.16,
    purchasePrice: 24500000,
    lifetimeHours: 7500,
    status: 'Free',
    buildVolumeMm: { x: 256, y: 256, z: 256 },
    createdAt: new Date().toISOString()
  },
  {
    id: 'mach-creality-k1max',
    workshopId: 'ws-global',
    machineName: 'Creality K1 Max High-Speed',
    machineType: 'FDM',
    avgPowerKW: 0.22,
    purchasePrice: 19500000,
    lifetimeHours: 6500,
    status: 'Free',
    buildVolumeMm: { x: 300, y: 300, z: 300 },
    createdAt: new Date().toISOString()
  },
  {
    id: 'mach-anycubic-kobra2max',
    workshopId: 'ws-global',
    machineName: 'Anycubic Kobra 2 Max Pro',
    machineType: 'FDM',
    avgPowerKW: 0.25,
    purchasePrice: 16800000,
    lifetimeHours: 6000,
    status: 'Free',
    buildVolumeMm: { x: 420, y: 420, z: 500 },
    createdAt: new Date().toISOString()
  },
  {
    id: 'mach-elegoo-saturn4',
    workshopId: 'ws-global',
    machineName: 'Elegoo Saturn 4 Ultra 12K (SLA)',
    machineType: 'SLA',
    avgPowerKW: 0.12,
    purchasePrice: 14500000,
    lifetimeHours: 4500,
    status: 'Free',
    buildVolumeMm: { x: 218, y: 122, z: 220 },
    createdAt: new Date().toISOString()
  },
  {
    id: 'mach-formlabs-form4',
    workshopId: 'ws-global',
    machineName: 'Formlabs Form 4 Industrial SLA',
    machineType: 'SLA',
    avgPowerKW: 0.28,
    purchasePrice: 115000000,
    lifetimeHours: 10000,
    status: 'Free',
    buildVolumeMm: { x: 200, y: 125, z: 210 },
    createdAt: new Date().toISOString()
  }
];

// Initial Material Presets
export const INITIAL_MATERIAL_PRESETS: ExtendedWorkshopMaterial[] = [
  {
    id: 'mat-pla-tough',
    workshopId: 'ws-global',
    materialName: 'PLA Tough / PLA+',
    materialType: 'PLA',
    pricePerKg: 320000,
    colorHex: '#00687a',
    colorName: 'Xanh Teal VCUBE',
    density: 1.24,
    stockStatus: 'Tracking',
    currentStockGrams: 8500,
    lowStockThresholdGrams: 2000,
    extruderTempMin: 205,
    extruderTempMax: 225,
    bedTemp: 55,
    recommendedFor: 'Prototypes, linh kiện lắp ráp nhanh, vỏ hộp tiêu chuẩn',
    brand: 'eSUN / Bambu Lab'
  },
  {
    id: 'mat-petg-pro',
    workshopId: 'ws-global',
    materialName: 'PETG Technical Pro',
    materialType: 'PETG',
    pricePerKg: 380000,
    colorHex: '#1E293B',
    colorName: 'Đen Kỹ Thuật',
    density: 1.27,
    stockStatus: 'Tracking',
    currentStockGrams: 6200,
    lowStockThresholdGrams: 1500,
    extruderTempMin: 235,
    extruderTempMax: 250,
    bedTemp: 75,
    recommendedFor: 'Linh kiện ngoài trời, đồ gá chịu lực, chi tiết kháng va đập',
    brand: 'Bambu Lab / Sunlu'
  },
  {
    id: 'mat-abs-industrial',
    workshopId: 'ws-global',
    materialName: 'ABS Industrial Grade',
    materialType: 'ABS',
    pricePerKg: 420000,
    colorHex: '#64748B',
    colorName: 'Xám Titan',
    density: 1.04,
    stockStatus: 'Tracking',
    currentStockGrams: 4500,
    lowStockThresholdGrams: 1000,
    extruderTempMin: 250,
    extruderTempMax: 270,
    bedTemp: 100,
    recommendedFor: 'Khoang động cơ ô tô xe máy, môi trường nhiệt độ cao',
    brand: 'PolyMaker PolyLite'
  },
  {
    id: 'mat-tpu-95a',
    workshopId: 'ws-global',
    materialName: 'TPU 95A Flexible High Speed',
    materialType: 'TPU',
    pricePerKg: 520000,
    colorHex: '#ea580c',
    colorName: 'Cam Cảnh Báo',
    density: 1.21,
    stockStatus: 'Tracking',
    currentStockGrams: 3000,
    lowStockThresholdGrams: 800,
    extruderTempMin: 220,
    extruderTempMax: 240,
    bedTemp: 45,
    recommendedFor: 'Gioăng làm kín, đệm chống rung, ốp bảo vệ chịu sốc',
    brand: 'Bambu Lab TPU-HF'
  },
  {
    id: 'mat-pa-cf',
    workshopId: 'ws-global',
    materialName: 'PA-CF (Nylon Carbon Fiber)',
    materialType: 'PA',
    pricePerKg: 1250000,
    colorHex: '#18181b',
    colorName: 'Đen Carbon Mờ',
    density: 1.15,
    stockStatus: 'Tracking',
    currentStockGrams: 2000,
    lowStockThresholdGrams: 500,
    extruderTempMin: 285,
    extruderTempMax: 305,
    bedTemp: 100,
    recommendedFor: 'Cánh tay drone FPV, đồ gá thay thế nhôm CNC, khớp xoay chịu tải',
    brand: 'Bambu Lab PAHT-CF'
  },
  {
    id: 'mat-resin-8k',
    workshopId: 'ws-global',
    materialName: 'Resin Engineering 8K (SLA)',
    materialType: 'Resin',
    pricePerKg: 780000,
    colorHex: '#94a3b8',
    colorName: 'Xám Siêu Mịn',
    density: 1.18,
    stockStatus: 'Tracking',
    currentStockGrams: 4000,
    lowStockThresholdGrams: 1000,
    extruderTempMin: 25,
    extruderTempMax: 35,
    bedTemp: 30,
    recommendedFor: 'Mô hình kim hoàn vi mô, tượng mỹ thuật, prototype đòi hỏi láng mịn',
    brand: 'Formlabs / Elegoo'
  }
];

// Initial Accessories Catalog
export const INITIAL_ACCESSORIES: ExtendedWorkshopAccessory[] = [
  {
    id: 'acc-brass-m3',
    workshopId: 'ws-global',
    name: 'Ốc cấy ren đồng nhiệt Brass Insert M3 x 4 x 5mm',
    groupName: 'Fastener',
    qtyPerPack: 100,
    pricePerPack: 80000,
    unit: 'con',
    defaultUsedQty: 4,
    isActive: true,
    description: 'Ren đồng ép nhiệt mỏ hàn 240°C, rãnh khía kim cương chống xoay trượt'
  },
  {
    id: 'acc-brass-m4',
    workshopId: 'ws-global',
    name: 'Ốc cấy ren đồng nhiệt Brass Insert M4 x 6 x 6mm',
    groupName: 'Fastener',
    qtyPerPack: 100,
    pricePerPack: 120000,
    unit: 'con',
    defaultUsedQty: 4,
    isActive: true,
    description: 'Ren đồng chịu mô-men xoắn cao cho vỏ hộp máy và đồ gá công nghiệp'
  },
  {
    id: 'acc-magnet-n52-6x3',
    workshopId: 'ws-global',
    name: 'Nam châm Neodymium N52 tròn 6x3mm mạ Niken',
    groupName: 'Magnet',
    qtyPerPack: 50,
    pricePerPack: 110000,
    unit: 'viên',
    defaultUsedQty: 2,
    isActive: true,
    description: 'Lực hút từ tính siêu mạnh N52 cho nắp hộp hít từ và cơ cấu tháo lắp nhanh'
  },
  {
    id: 'acc-bolt-inox304-m3-12',
    workshopId: 'ws-global',
    name: 'Bu lông lục giác chìm Inox 304 M3x12mm + Tán tự hãm',
    groupName: 'Hardware',
    qtyPerPack: 100,
    pricePerPack: 150000,
    unit: 'bộ',
    defaultUsedQty: 4,
    isActive: true,
    description: 'Thép không gỉ 304 chuẩn A2-70, ren chống tuột'
  },
  {
    id: 'acc-box-kraft-foam',
    workshopId: 'ws-global',
    name: 'Hộp Carton Kraft cứng quà tặng + Mút xốp EVA định hình',
    groupName: 'Packaging',
    qtyPerPack: 20,
    pricePerPack: 160000,
    unit: 'hộp',
    defaultUsedQty: 1,
    isActive: true,
    description: 'Bao bì thương mại cao cấp lót mút chống sốc bảo vệ sản phẩm khi vận chuyển'
  },
  {
    id: 'acc-zip-esd-desiccant',
    workshopId: 'ws-global',
    name: 'Túi Zip mờ chống trầy ESD + Gói hút ẩm Silica Gel 2g',
    groupName: 'Packaging',
    qtyPerPack: 50,
    pricePerPack: 90000,
    unit: 'túi',
    defaultUsedQty: 1,
    isActive: true,
    description: 'Túi nhám dẻo khử tĩnh điện và hút ẩm bảo quản mô hình kỹ thuật'
  }
];

export interface PricingEngineState {
  // 1. Global Settings
  settings: PricingGlobalSettings;

  // 2. Machine Fleet & Presets
  machinePresets: WorkshopMachine[];

  // 3. Material Catalog Presets
  materialPresets: ExtendedWorkshopMaterial[];

  // 4. Accessories Catalog
  accessories: ExtendedWorkshopAccessory[];

  // Actions: Settings
  updateSettings: (partial: Partial<PricingGlobalSettings>) => void;
  setProfitMode: (mode: 'Markup' | 'Margin') => void;
  setProfitPercent: (percent: number) => void;
  toggleMarketplaceFee: (enabled?: boolean) => void;
  toggleAdvancedOverhead: (enabled?: boolean) => void;
  toggleAccessoriesPricing: (enabled?: boolean) => void;
  resetSettings: () => void;

  // Actions: Machine Presets
  addMachine: (machine: Omit<WorkshopMachine, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => void;
  updateMachine: (id: string, partial: Partial<WorkshopMachine>) => void;
  deleteMachine: (id: string) => void;
  resetMachines: () => void;

  // Actions: Material Presets
  addMaterial: (material: Omit<ExtendedWorkshopMaterial, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => void;
  updateMaterial: (id: string, partial: Partial<ExtendedWorkshopMaterial>) => void;
  deleteMaterial: (id: string) => void;
  resetMaterials: () => void;

  // Actions: Accessories
  toggleAccessoryActive: (id: string, active?: boolean) => void;
  addAccessory: (acc: Omit<ExtendedWorkshopAccessory, 'id'> & { id?: string }) => void;
  updateAccessory: (id: string, partial: Partial<ExtendedWorkshopAccessory>) => void;
  deleteAccessory: (id: string) => void;
  resetAccessories: () => void;

  // Helpers
  getMachineHourlyRates: (machineId: string) => {
    depreciationPerHour: number;
    electricityPerHour: number;
    totalMachineCostPerHour: number;
  };
  calculateCost: (input: Omit<InkiriCalculationInput, 'globalSettings'>) => InkiriCalculationResult;
}

export const usePricingEngineStore = create<PricingEngineState>()(
  persist(
    (set, get) => ({
      // State init
      settings: { ...DEFAULT_PRICING_GLOBAL_SETTINGS },
      machinePresets: [...INITIAL_MACHINE_PRESETS],
      materialPresets: [...INITIAL_MATERIAL_PRESETS],
      accessories: [...INITIAL_ACCESSORIES],

      // Settings actions
      updateSettings: (partial) => {
        set((state) => ({
          settings: {
            ...state.settings,
            ...partial,
            version: state.settings.version + 1,
            updatedAt: new Date().toISOString()
          }
        }));
      },

      setProfitMode: (mode) => {
        set((state) => ({
          settings: {
            ...state.settings,
            profitMode: mode,
            version: state.settings.version + 1,
            updatedAt: new Date().toISOString()
          }
        }));
      },

      setProfitPercent: (percent) => {
        set((state) => ({
          settings: {
            ...state.settings,
            defaultProfitPercent: Math.max(0, percent),
            version: state.settings.version + 1,
            updatedAt: new Date().toISOString()
          }
        }));
      },

      toggleMarketplaceFee: (enabled) => {
        set((state) => ({
          settings: {
            ...state.settings,
            enableMarketplaceFeeMode: enabled !== undefined ? enabled : !state.settings.enableMarketplaceFeeMode,
            version: state.settings.version + 1,
            updatedAt: new Date().toISOString()
          }
        }));
      },

      toggleAdvancedOverhead: (enabled) => {
        set((state) => ({
          settings: {
            ...state.settings,
            enableAdvancedOverhead: enabled !== undefined ? enabled : !state.settings.enableAdvancedOverhead,
            version: state.settings.version + 1,
            updatedAt: new Date().toISOString()
          }
        }));
      },

      toggleAccessoriesPricing: (enabled) => {
        set((state) => ({
          settings: {
            ...state.settings,
            enableAccessoriesPricing: enabled !== undefined ? enabled : !state.settings.enableAccessoriesPricing,
            version: state.settings.version + 1,
            updatedAt: new Date().toISOString()
          }
        }));
      },

      resetSettings: () => {
        set({
          settings: { ...DEFAULT_PRICING_GLOBAL_SETTINGS, updatedAt: new Date().toISOString() }
        });
      },

      // Machine Actions
      addMachine: (machine) => {
        const newMachine: WorkshopMachine = {
          ...machine,
          id: machine.id || `mach-custom-${Date.now()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        set((state) => ({
          machinePresets: [newMachine, ...state.machinePresets]
        }));
      },

      updateMachine: (id, partial) => {
        set((state) => ({
          machinePresets: state.machinePresets.map((m) =>
            m.id === id ? { ...m, ...partial, updatedAt: new Date().toISOString() } : m
          )
        }));
      },

      deleteMachine: (id) => {
        set((state) => ({
          machinePresets: state.machinePresets.filter((m) => m.id !== id)
        }));
      },

      resetMachines: () => {
        set({ machinePresets: [...INITIAL_MACHINE_PRESETS] });
      },

      // Material Actions
      addMaterial: (material) => {
        const newMaterial: ExtendedWorkshopMaterial = {
          ...material,
          id: material.id || `mat-custom-${Date.now()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        set((state) => ({
          materialPresets: [newMaterial, ...state.materialPresets]
        }));
      },

      updateMaterial: (id, partial) => {
        set((state) => ({
          materialPresets: state.materialPresets.map((m) =>
            m.id === id ? { ...m, ...partial, updatedAt: new Date().toISOString() } : m
          )
        }));
      },

      deleteMaterial: (id) => {
        set((state) => ({
          materialPresets: state.materialPresets.filter((m) => m.id !== id)
        }));
      },

      resetMaterials: () => {
        set({ materialPresets: [...INITIAL_MATERIAL_PRESETS] });
      },

      // Accessories Actions
      toggleAccessoryActive: (id, active) => {
        set((state) => ({
          accessories: state.accessories.map((acc) =>
            acc.id === id
              ? { ...acc, isActive: active !== undefined ? active : !acc.isActive }
              : acc
          )
        }));
      },

      addAccessory: (acc) => {
        const newAcc: ExtendedWorkshopAccessory = {
          ...acc,
          id: acc.id || `acc-custom-${Date.now()}`
        };
        set((state) => ({
          accessories: [newAcc, ...state.accessories]
        }));
      },

      updateAccessory: (id, partial) => {
        set((state) => ({
          accessories: state.accessories.map((acc) =>
            acc.id === id ? { ...acc, ...partial } : acc
          )
        }));
      },

      deleteAccessory: (id) => {
        set((state) => ({
          accessories: state.accessories.filter((acc) => acc.id !== id)
        }));
      },

      resetAccessories: () => {
        set({ accessories: [...INITIAL_ACCESSORIES] });
      },

      // Helpers
      getMachineHourlyRates: (machineId) => {
        const state = get();
        const machine = state.machinePresets.find((m) => m.id === machineId) || state.machinePresets[0];
        const electricityRate = state.settings.electricityRateVndKwh;
        if (!machine) {
          return { depreciationPerHour: 0, electricityPerHour: 0, totalMachineCostPerHour: 0 };
        }
        const lifetime = Math.max(1, machine.lifetimeHours || 8000);
        const purchase = Math.max(0, machine.purchasePrice || 0);
        const depreciation = Math.round(purchase / lifetime);
        const power = Math.max(0.01, machine.avgPowerKW || 0.18);
        const electricity = Math.round(power * electricityRate);
        return {
          depreciationPerHour: depreciation,
          electricityPerHour: electricity,
          totalMachineCostPerHour: depreciation + electricity
        };
      },

      calculateCost: (input) => {
        const state = get();
        return PricingEngineService.calculateInkiriCost({
          ...input,
          globalSettings: state.settings
        });
      }
    }),
    {
      name: 'vcube_pricing_engine_store',
      partialize: (state) => ({
        settings: state.settings,
        machinePresets: state.machinePresets,
        materialPresets: state.materialPresets,
        accessories: state.accessories
      })
    }
  )
);
