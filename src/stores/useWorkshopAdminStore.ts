import { create } from 'zustand';
import { WorkshopProfile, WorkshopMachine, WorkshopMaterial } from '../types';

export interface WorkshopFilterState {
  region: 'all' | 'Bắc' | 'Trung' | 'Nam';
  status: 'all' | 'Pending' | 'Verified' | 'Suspended';
  searchQuery: string;
}

export interface WorkshopAdminState {
  workshops: WorkshopProfile[];
  machines: WorkshopMachine[];
  materials: WorkshopMaterial[];
  filters: WorkshopFilterState;
  selectedWorkshopId: string | null;

  // Actions for Workshops
  setFilterRegion: (region: WorkshopFilterState['region']) => void;
  setFilterStatus: (status: WorkshopFilterState['status']) => void;
  setSearchQuery: (query: string) => void;
  setSelectedWorkshopId: (id: string | null) => void;

  approveWorkshop: (id: string) => void;
  suspendWorkshop: (id: string) => void;
  reactivateWorkshop: (id: string) => void;
  updateWorkshop: (id: string, updates: Partial<WorkshopProfile>) => void;
  addWorkshop: (workshop: Omit<WorkshopProfile, 'id' | 'createdAt' | 'updatedAt'>) => void;
  deleteWorkshop: (id: string) => void;

  // Actions for Machines
  updateMachineStatus: (machineId: string, status: WorkshopMachine['status']) => void;
  addMachine: (machine: Omit<WorkshopMachine, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateMachine: (machineId: string, updates: Partial<WorkshopMachine>) => void;
  deleteMachine: (machineId: string) => void;

  // Actions for Materials
  updateMaterialStock: (materialId: string, newStockGrams: number) => void;
  addMaterial: (material: Omit<WorkshopMaterial, 'id' | 'createdAt' | 'updatedAt' | 'stockStatus'> & { stockStatus?: WorkshopMaterial['stockStatus'] }) => void;
  updateMaterial: (materialId: string, updates: Partial<WorkshopMaterial>) => void;
  deleteMaterial: (materialId: string) => void;

  // Computations / Helpers
  getDepreciationPerHour: (machine: WorkshopMachine) => number;
  getElectricityPerHour: (machine: WorkshopMachine, electricityRateOverride?: number) => number;
  getMachineTotalRunningCostPerHour: (machine: WorkshopMachine, electricityRateOverride?: number) => number;
  getLowStockMaterials: () => WorkshopMaterial[];
  getWorkshopStats: () => {
    totalWorkshops: number;
    verifiedCount: number;
    pendingCount: number;
    suspendedCount: number;
    totalMachines: number;
    freeMachinesCount: number;
    busyMachinesCount: number;
    maintenanceMachinesCount: number;
    lowStockMaterialsCount: number;
  };
}

const DEFAULT_ELECTRICITY_RATE_VND = 2850;

const INITIAL_WORKSHOPS: WorkshopProfile[] = [
  {
    id: 'ws-hn-01',
    workshopName: 'Hub Bắc - VCUBE Tech Lab Hà Nội',
    address: 'Số 18 Hoàng Quốc Việt, Cầu Giấy, Hà Nội',
    region: 'Bắc',
    totalMachines: 12,
    activeMachinesNow: 9,
    electricityRateOverride: 2850,
    laborRateOverride: 70000,
    verifiedStatus: 'Verified',
    contactPhone: '0988 123 456',
    contactEmail: 'hanoi.lab@vcube.vn',
    createdAt: '2025-01-15T08:00:00Z',
    updatedAt: '2026-03-01T10:00:00Z'
  },
  {
    id: 'ws-hp-02',
    workshopName: 'Xưởng In Kỹ Thuật Số Cảng Hải Phòng',
    address: 'Lô C5 KCN Đình Vũ, Hải An, Hải Phòng',
    region: 'Bắc',
    totalMachines: 6,
    activeMachinesNow: 2,
    electricityRateOverride: 2750,
    laborRateOverride: 60000,
    verifiedStatus: 'Pending',
    contactPhone: '0912 345 678',
    contactEmail: 'contact@haiphong3dprint.vn',
    createdAt: '2026-02-28T14:30:00Z',
    updatedAt: '2026-02-28T14:30:00Z'
  },
  {
    id: 'ws-dn-03',
    workshopName: 'Hub Trung - Smart FabLab Đà Nẵng',
    address: 'Khu Công Nghệ Cao, Hòa Vang, Đà Nẵng',
    region: 'Trung',
    totalMachines: 8,
    activeMachinesNow: 5,
    electricityRateOverride: 2900,
    laborRateOverride: 65000,
    verifiedStatus: 'Verified',
    contactPhone: '0905 789 012',
    contactEmail: 'danang.hub@vcube.vn',
    createdAt: '2025-04-10T09:00:00Z',
    updatedAt: '2026-02-20T16:00:00Z'
  },
  {
    id: 'ws-hue-04',
    workshopName: 'Cơ Sở Chế Tác Mẫu Mỹ Nghệ Cố Đô Huế',
    address: '45 Lê Lợi, TP. Huế, Thừa Thiên Huế',
    region: 'Trung',
    totalMachines: 4,
    activeMachinesNow: 1,
    electricityRateOverride: 2850,
    laborRateOverride: 55000,
    verifiedStatus: 'Pending',
    contactPhone: '0935 222 333',
    contactEmail: 'huecraft3d@gmail.com',
    createdAt: '2026-03-01T11:20:00Z',
    updatedAt: '2026-03-01T11:20:00Z'
  },
  {
    id: 'ws-hcm-05',
    workshopName: 'Hub Nam - VCUBE Mega Workshop TP.HCM',
    address: 'Khu Công Nghệ Cao Quận 9, TP. Thủ Đức, TP. Hồ Chí Minh',
    region: 'Nam',
    totalMachines: 24,
    activeMachinesNow: 18,
    electricityRateOverride: 2950,
    laborRateOverride: 75000,
    verifiedStatus: 'Verified',
    contactPhone: '0979 999 888',
    contactEmail: 'hcm.mega@vcube.vn',
    createdAt: '2024-11-01T07:30:00Z',
    updatedAt: '2026-03-02T09:15:00Z'
  },
  {
    id: 'ws-bd-06',
    workshopName: 'Cơ Sở In 3D Kỹ Nghệ Tân Uyên',
    address: 'Đường ĐT746, TX. Tân Uyên, Bình Dương',
    region: 'Nam',
    totalMachines: 5,
    activeMachinesNow: 0,
    electricityRateOverride: 3100,
    laborRateOverride: 62000,
    verifiedStatus: 'Suspended',
    contactPhone: '0966 444 555',
    contactEmail: 'tanuyen.support@printproto.vn',
    createdAt: '2025-06-12T10:00:00Z',
    updatedAt: '2026-01-18T15:00:00Z'
  }
];

const INITIAL_MACHINES: WorkshopMachine[] = [
  {
    id: 'm-hn-01',
    workshopId: 'ws-hn-01',
    machineName: 'Bambu Lab X1-Carbon Combo #01',
    machineType: 'FDM',
    avgPowerKW: 0.35,
    purchasePrice: 38500000,
    lifetimeHours: 8000,
    status: 'Busy',
    currentJobId: 'JOB-2026-0811',
    buildVolumeMm: { x: 256, y: 256, z: 256 },
    createdAt: '2025-01-15T08:00:00Z'
  },
  {
    id: 'm-hn-02',
    workshopId: 'ws-hn-01',
    machineName: 'Bambu Lab X1-Carbon Combo #02',
    machineType: 'FDM',
    avgPowerKW: 0.35,
    purchasePrice: 38500000,
    lifetimeHours: 8000,
    status: 'Free',
    buildVolumeMm: { x: 256, y: 256, z: 256 },
    createdAt: '2025-01-15T08:00:00Z'
  },
  {
    id: 'm-hn-03',
    workshopId: 'ws-hn-01',
    machineName: 'Creality K1 Max High-Speed',
    machineType: 'FDM',
    avgPowerKW: 0.45,
    purchasePrice: 22000000,
    lifetimeHours: 6000,
    status: 'Busy',
    currentJobId: 'JOB-2026-0814',
    buildVolumeMm: { x: 300, y: 300, z: 300 },
    createdAt: '2025-02-10T08:00:00Z'
  },
  {
    id: 'm-hn-04',
    workshopId: 'ws-hn-01',
    machineName: 'Formlabs Form 4 SLA Công Nghiệp',
    machineType: 'SLA',
    avgPowerKW: 0.25,
    purchasePrice: 125000000,
    lifetimeHours: 12000,
    status: 'Free',
    buildVolumeMm: { x: 200, y: 125, z: 210 },
    createdAt: '2025-03-20T08:00:00Z'
  },
  {
    id: 'm-hp-01',
    workshopId: 'ws-hp-02',
    machineName: 'Prusa XL 5 Toolheads',
    machineType: 'FDM',
    avgPowerKW: 0.50,
    purchasePrice: 98000000,
    lifetimeHours: 10000,
    status: 'Free',
    buildVolumeMm: { x: 360, y: 360, z: 360 },
    createdAt: '2026-02-28T14:30:00Z'
  },
  {
    id: 'm-hp-02',
    workshopId: 'ws-hp-02',
    machineName: 'Elegoo Saturn 4 Ultra 12K',
    machineType: 'SLA',
    avgPowerKW: 0.18,
    purchasePrice: 18500000,
    lifetimeHours: 5000,
    status: 'Maintenance',
    buildVolumeMm: { x: 218, y: 122, z: 220 },
    createdAt: '2026-02-28T14:30:00Z'
  },
  {
    id: 'm-dn-01',
    workshopId: 'ws-dn-03',
    machineName: 'Bambu Lab P1S #01',
    machineType: 'FDM',
    avgPowerKW: 0.32,
    purchasePrice: 24000000,
    lifetimeHours: 8000,
    status: 'Busy',
    currentJobId: 'JOB-2026-0830',
    buildVolumeMm: { x: 256, y: 256, z: 256 },
    createdAt: '2025-04-10T09:00:00Z'
  },
  {
    id: 'm-dn-02',
    workshopId: 'ws-dn-03',
    machineName: 'Bambu Lab P1S #02',
    machineType: 'FDM',
    avgPowerKW: 0.32,
    purchasePrice: 24000000,
    lifetimeHours: 8000,
    status: 'Free',
    buildVolumeMm: { x: 256, y: 256, z: 256 },
    createdAt: '2025-04-10T09:00:00Z'
  },
  {
    id: 'm-hcm-01',
    workshopId: 'ws-hcm-05',
    machineName: 'Flashforge Guider 3 Plus',
    machineType: 'FDM',
    avgPowerKW: 0.65,
    purchasePrice: 85000000,
    lifetimeHours: 12000,
    status: 'Busy',
    currentJobId: 'JOB-2026-0902',
    buildVolumeMm: { x: 350, y: 350, z: 600 },
    createdAt: '2024-11-01T07:30:00Z'
  },
  {
    id: 'm-hcm-02',
    workshopId: 'ws-hcm-05',
    machineName: 'Farsoon Flight-SS403P SLS',
    machineType: 'SLS',
    avgPowerKW: 2.80,
    purchasePrice: 850000000,
    lifetimeHours: 20000,
    status: 'Free',
    buildVolumeMm: { x: 400, y: 400, z: 540 },
    createdAt: '2025-02-15T09:00:00Z'
  },
  {
    id: 'm-hcm-03',
    workshopId: 'ws-hcm-05',
    machineName: 'Bambu Lab X1-Carbon Mega #01',
    machineType: 'FDM',
    avgPowerKW: 0.35,
    purchasePrice: 38500000,
    lifetimeHours: 8000,
    status: 'Busy',
    currentJobId: 'JOB-2026-0915',
    buildVolumeMm: { x: 256, y: 256, z: 256 },
    createdAt: '2024-11-01T07:30:00Z'
  },
  {
    id: 'm-hcm-04',
    workshopId: 'ws-hcm-05',
    machineName: 'Anycubic Photon Mono M5s Pro',
    machineType: 'SLA',
    avgPowerKW: 0.15,
    purchasePrice: 16000000,
    lifetimeHours: 5000,
    status: 'Free',
    buildVolumeMm: { x: 200, y: 123, z: 200 },
    createdAt: '2025-05-01T08:00:00Z'
  }
];

const INITIAL_MATERIALS: WorkshopMaterial[] = [
  {
    id: 'mat-hn-01',
    workshopId: 'ws-hn-01',
    materialName: 'PLA+ Matte Đen Carbon (Bambu)',
    materialType: 'PLA',
    pricePerKg: 380000,
    colorHex: '#1E293B',
    colorName: 'Matte Black',
    density: 1.24,
    stockStatus: 'Tracking',
    currentStockGrams: 8500,
    lowStockThresholdGrams: 2000,
    createdAt: '2025-01-15T08:00:00Z'
  },
  {
    id: 'mat-hn-02',
    workshopId: 'ws-hn-01',
    materialName: 'PETG Trong Suốt Kháng UV',
    materialType: 'PETG',
    pricePerKg: 420000,
    colorHex: '#38BDF8',
    colorName: 'Clear Cyan',
    density: 1.27,
    stockStatus: 'LowStock',
    currentStockGrams: 650,
    lowStockThresholdGrams: 1500,
    createdAt: '2025-01-15T08:00:00Z'
  },
  {
    id: 'mat-hn-03',
    workshopId: 'ws-hn-01',
    materialName: 'Resin Tiêu Chuẩn Xám 8K Formlabs',
    materialType: 'Resin',
    pricePerKg: 1850000,
    colorHex: '#94A3B8',
    colorName: 'Neutral Grey',
    density: 1.15,
    stockStatus: 'Tracking',
    currentStockGrams: 3200,
    lowStockThresholdGrams: 1000,
    createdAt: '2025-03-20T08:00:00Z'
  },
  {
    id: 'mat-dn-01',
    workshopId: 'ws-dn-03',
    materialName: 'PLA Silk Vàng Hoàng Gia Sunlu',
    materialType: 'PLA',
    pricePerKg: 360000,
    colorHex: '#F59E0B',
    colorName: 'Silk Gold',
    density: 1.24,
    stockStatus: 'LowStock',
    currentStockGrams: 450,
    lowStockThresholdGrams: 1000,
    createdAt: '2025-04-10T09:00:00Z'
  },
  {
    id: 'mat-dn-02',
    workshopId: 'ws-dn-03',
    materialName: 'ABS Kỹ Thuật Trắng Chịu Nhiệt',
    materialType: 'ABS',
    pricePerKg: 390000,
    colorHex: '#F8FAFC',
    colorName: 'Pure White',
    density: 1.04,
    stockStatus: 'Tracking',
    currentStockGrams: 6200,
    lowStockThresholdGrams: 2000,
    createdAt: '2025-04-10T09:00:00Z'
  },
  {
    id: 'mat-hcm-01',
    workshopId: 'ws-hcm-05',
    materialName: 'PA12 Nylon SLS Công Nghiệp (Farsoon)',
    materialType: 'PA',
    pricePerKg: 2400000,
    colorHex: '#CBD5E1',
    colorName: 'Natural Grey SLS',
    density: 1.01,
    stockStatus: 'Tracking',
    currentStockGrams: 45000,
    lowStockThresholdGrams: 10000,
    createdAt: '2025-02-15T09:00:00Z'
  },
  {
    id: 'mat-hcm-02',
    workshopId: 'ws-hcm-05',
    materialName: 'TPU 95A Độ Đàn Hồi Cao Đỏ Rubik',
    materialType: 'TPU',
    pricePerKg: 580000,
    colorHex: '#EF4444',
    colorName: 'Vibrant Red',
    density: 1.21,
    stockStatus: 'LowStock',
    currentStockGrams: 800,
    lowStockThresholdGrams: 2000,
    createdAt: '2024-11-01T07:30:00Z'
  }
];

export const useWorkshopAdminStore = create<WorkshopAdminState>((set, get) => ({
  workshops: INITIAL_WORKSHOPS,
  machines: INITIAL_MACHINES,
  materials: INITIAL_MATERIALS,
  filters: {
    region: 'all',
    status: 'all',
    searchQuery: ''
  },
  selectedWorkshopId: null,

  setFilterRegion: (region) =>
    set((state) => ({ filters: { ...state.filters, region } })),

  setFilterStatus: (status) =>
    set((state) => ({ filters: { ...state.filters, status } })),

  setSearchQuery: (searchQuery) =>
    set((state) => ({ filters: { ...state.filters, searchQuery } })),

  setSelectedWorkshopId: (selectedWorkshopId) =>
    set({ selectedWorkshopId }),

  approveWorkshop: (id) =>
    set((state) => ({
      workshops: state.workshops.map((w) =>
        w.id === id ? { ...w, verifiedStatus: 'Verified', updatedAt: new Date().toISOString() } : w
      )
    })),

  suspendWorkshop: (id) =>
    set((state) => ({
      workshops: state.workshops.map((w) =>
        w.id === id ? { ...w, verifiedStatus: 'Suspended', updatedAt: new Date().toISOString() } : w
      )
    })),

  reactivateWorkshop: (id) =>
    set((state) => ({
      workshops: state.workshops.map((w) =>
        w.id === id ? { ...w, verifiedStatus: 'Verified', updatedAt: new Date().toISOString() } : w
      )
    })),

  updateWorkshop: (id, updates) =>
    set((state) => ({
      workshops: state.workshops.map((w) =>
        w.id === id ? { ...w, ...updates, updatedAt: new Date().toISOString() } : w
      )
    })),

  addWorkshop: (workshopData) => {
    const newWorkshop: WorkshopProfile = {
      ...workshopData,
      id: `ws-${Date.now().toString(36)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    set((state) => ({ workshops: [newWorkshop, ...state.workshops] }));
  },

  deleteWorkshop: (id) =>
    set((state) => ({
      workshops: state.workshops.filter((w) => w.id !== id),
      machines: state.machines.filter((m) => m.workshopId !== id),
      materials: state.materials.filter((mat) => mat.workshopId !== id)
    })),

  updateMachineStatus: (machineId, status) =>
    set((state) => {
      const targetMachine = state.machines.find((m) => m.id === machineId);
      if (!targetMachine) return state;

      const updatedMachines = state.machines.map((m) =>
        m.id === machineId ? { ...m, status, updatedAt: new Date().toISOString() } : m
      );

      // Recalculate activeMachinesNow for target workshop
      const workshopId = targetMachine.workshopId;
      const activeCount = updatedMachines.filter(
        (m) => m.workshopId === workshopId && m.status === 'Busy'
      ).length;

      const updatedWorkshops = state.workshops.map((w) =>
        w.id === workshopId ? { ...w, activeMachinesNow: activeCount } : w
      );

      return { machines: updatedMachines, workshops: updatedWorkshops };
    }),

  addMachine: (machineData) => {
    const newMachine: WorkshopMachine = {
      ...machineData,
      id: `m-${Date.now().toString(36)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    set((state) => {
      const updatedMachines = [newMachine, ...state.machines];
      const updatedWorkshops = state.workshops.map((w) => {
        if (w.id === machineData.workshopId) {
          return {
            ...w,
            totalMachines: w.totalMachines + 1,
            activeMachinesNow: machineData.status === 'Busy' ? w.activeMachinesNow + 1 : w.activeMachinesNow
          };
        }
        return w;
      });
      return { machines: updatedMachines, workshops: updatedWorkshops };
    });
  },

  updateMachine: (machineId, updates) =>
    set((state) => ({
      machines: state.machines.map((m) =>
        m.id === machineId ? { ...m, ...updates, updatedAt: new Date().toISOString() } : m
      )
    })),

  deleteMachine: (machineId) =>
    set((state) => {
      const machine = state.machines.find((m) => m.id === machineId);
      if (!machine) return state;
      return {
        machines: state.machines.filter((m) => m.id !== machineId),
        workshops: state.workshops.map((w) =>
          w.id === machine.workshopId
            ? {
                ...w,
                totalMachines: Math.max(0, w.totalMachines - 1),
                activeMachinesNow: machine.status === 'Busy' ? Math.max(0, w.activeMachinesNow - 1) : w.activeMachinesNow
              }
            : w
        )
      };
    }),

  updateMaterialStock: (materialId, newStockGrams) =>
    set((state) => ({
      materials: state.materials.map((mat) => {
        if (mat.id !== materialId) return mat;
        const threshold = mat.lowStockThresholdGrams ?? 1000;
        const stockStatus =
          newStockGrams <= 0
            ? 'OutOfStock'
            : newStockGrams <= threshold
            ? 'LowStock'
            : 'Tracking';
        return {
          ...mat,
          currentStockGrams: newStockGrams,
          stockStatus,
          updatedAt: new Date().toISOString()
        };
      })
    })),

  addMaterial: (materialData) => {
    const threshold = materialData.lowStockThresholdGrams ?? 1000;
    const stockStatus =
      materialData.currentStockGrams <= 0
        ? 'OutOfStock'
        : materialData.currentStockGrams <= threshold
        ? 'LowStock'
        : 'Tracking';

    const newMaterial: WorkshopMaterial = {
      ...materialData,
      id: `mat-${Date.now().toString(36)}`,
      stockStatus,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    set((state) => ({ materials: [newMaterial, ...state.materials] }));
  },

  updateMaterial: (materialId, updates) =>
    set((state) => ({
      materials: state.materials.map((mat) => {
        if (mat.id !== materialId) return mat;
        const updated = { ...mat, ...updates, updatedAt: new Date().toISOString() };
        if (updates.currentStockGrams !== undefined || updates.lowStockThresholdGrams !== undefined) {
          const threshold = updated.lowStockThresholdGrams ?? 1000;
          updated.stockStatus =
            updated.currentStockGrams <= 0
              ? 'OutOfStock'
              : updated.currentStockGrams <= threshold
              ? 'LowStock'
              : 'Tracking';
        }
        return updated;
      })
    })),

  deleteMaterial: (materialId) =>
    set((state) => ({
      materials: state.materials.filter((mat) => mat.id !== materialId)
    })),

  getDepreciationPerHour: (machine: WorkshopMachine) => {
    if (!machine.lifetimeHours || machine.lifetimeHours <= 0) return 0;
    return Math.round(machine.purchasePrice / machine.lifetimeHours);
  },

  getElectricityPerHour: (machine: WorkshopMachine, electricityRateOverride?: number) => {
    const rate = electricityRateOverride ?? DEFAULT_ELECTRICITY_RATE_VND;
    return Math.round(machine.avgPowerKW * rate);
  },

  getMachineTotalRunningCostPerHour: (machine: WorkshopMachine, electricityRateOverride?: number) => {
    const dep = get().getDepreciationPerHour(machine);
    const elec = get().getElectricityPerHour(machine, electricityRateOverride);
    return dep + elec;
  },

  getLowStockMaterials: () => {
    const { materials } = get();
    return materials.filter(
      (m) =>
        m.stockStatus === 'LowStock' ||
        m.stockStatus === 'OutOfStock' ||
        m.currentStockGrams <= (m.lowStockThresholdGrams ?? 1000)
    );
  },

  getWorkshopStats: () => {
    const { workshops, machines, materials } = get();
    const verifiedCount = workshops.filter((w) => w.verifiedStatus === 'Verified').length;
    const pendingCount = workshops.filter((w) => w.verifiedStatus === 'Pending').length;
    const suspendedCount = workshops.filter((w) => w.verifiedStatus === 'Suspended').length;

    const totalMachines = machines.length;
    const freeMachinesCount = machines.filter((m) => m.status === 'Free').length;
    const busyMachinesCount = machines.filter((m) => m.status === 'Busy').length;
    const maintenanceMachinesCount = machines.filter(
      (m) => m.status === 'Maintenance' || m.status === 'Offline'
    ).length;

    const lowStockMaterialsCount = materials.filter(
      (m) =>
        m.stockStatus === 'LowStock' ||
        m.stockStatus === 'OutOfStock' ||
        m.currentStockGrams <= (m.lowStockThresholdGrams ?? 1000)
    ).length;

    return {
      totalWorkshops: workshops.length,
      verifiedCount,
      pendingCount,
      suspendedCount,
      totalMachines,
      freeMachinesCount,
      busyMachinesCount,
      maintenanceMachinesCount,
      lowStockMaterialsCount
    };
  }
}));
