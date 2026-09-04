import React, { useState, useEffect, useMemo } from 'react';
import {
  Printer,
  Layers,
  FileText,
  Settings,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Clock,
  Zap,
  Coins,
  ShieldCheck,
  Building2,
  MapPin,
  Phone,
  Mail,
  RefreshCw,
  Search,
  Filter,
  ArrowDownToLine,
  ArrowUpRight,
  TrendingUp,
  Package,
  Check,
  X,
  Info,
  Calendar,
  Save
} from 'lucide-react';
import {
  WorkshopProfile,
  WorkshopMachine,
  WorkshopMaterial,
  MaterialInventoryLog
} from '../types';

export interface WorkshopSettingsViewProps {
  onNavigate?: (screen: string, payload?: any) => void;
  onShowToast?: (message: string) => void;
}

// Default initial mock data if not yet present in localStorage
const DEFAULT_WORKSHOP_PROFILE: WorkshopProfile = {
  id: 'ws-hub-01',
  workshopName: 'Xưởng In 3D Kỹ Thuật Số Cầu Giấy (VCUBE MES)',
  address: '128 Đường Xuân Thủy, Cầu Giấy, Hà Nội',
  region: 'Bắc',
  totalMachines: 4,
  activeMachinesNow: 4,
  electricityRateOverride: 2850,
  laborRateOverride: 65000,
  verifiedStatus: 'Verified',
  contactPhone: '0988 123 456',
  contactEmail: 'mes.caugiay@vcube.vn',
  createdAt: '2026-01-15T08:00:00.000Z',
  updatedAt: new Date().toISOString()
};

const DEFAULT_MACHINES: WorkshopMachine[] = [
  {
    id: 'mch-101',
    workshopId: 'ws-hub-01',
    machineName: 'Bambu Lab X1-Carbon #01 (AMS Pro)',
    machineType: 'FDM',
    avgPowerKW: 0.18,
    purchasePrice: 35000000,
    lifetimeHours: 10000,
    status: 'Free',
    buildVolumeMm: { x: 256, y: 256, z: 256 }
  },
  {
    id: 'mch-102',
    workshopId: 'ws-hub-01',
    machineName: 'Bambu Lab P1S #02 (High-Speed)',
    machineType: 'FDM',
    avgPowerKW: 0.16,
    purchasePrice: 19500000,
    lifetimeHours: 8000,
    status: 'Busy',
    currentJobId: 'ORD-VCB-8421',
    buildVolumeMm: { x: 256, y: 256, z: 256 }
  },
  {
    id: 'mch-103',
    workshopId: 'ws-hub-01',
    machineName: 'Creality K1 Max #03 (Khổ 300mm)',
    machineType: 'FDM',
    avgPowerKW: 0.22,
    purchasePrice: 21000000,
    lifetimeHours: 7000,
    status: 'Free',
    buildVolumeMm: { x: 300, y: 300, z: 300 }
  },
  {
    id: 'mch-104',
    workshopId: 'ws-hub-01',
    machineName: 'Elegoo Saturn 4 Ultra 12K #04',
    machineType: 'SLA',
    avgPowerKW: 0.12,
    purchasePrice: 13500000,
    lifetimeHours: 5000,
    status: 'Maintenance',
    buildVolumeMm: { x: 218, y: 122, z: 220 }
  }
];

const DEFAULT_MATERIALS: WorkshopMaterial[] = [
  {
    id: 'mat-201',
    workshopId: 'ws-hub-01',
    materialName: 'eSUN PLA+ Đen Mờ (Matte Black)',
    materialType: 'PLA',
    pricePerKg: 250000,
    colorHex: '#1E1E1E',
    colorName: 'Đen Titan',
    density: 1.24,
    stockStatus: 'Tracking',
    currentStockGrams: 7500,
    lowStockThresholdGrams: 2000
  },
  {
    id: 'mat-202',
    workshopId: 'ws-hub-01',
    materialName: 'Bambu Lab PETG Basic Trắng Sứ',
    materialType: 'PETG',
    pricePerKg: 280000,
    colorHex: '#F8FAFC',
    colorName: 'Trắng Sứ',
    density: 1.27,
    stockStatus: 'Tracking',
    currentStockGrams: 3200,
    lowStockThresholdGrams: 2000
  },
  {
    id: 'mat-203',
    workshopId: 'ws-hub-01',
    materialName: 'Polymaker PolyLite ABS Đỏ Đô',
    materialType: 'ABS',
    pricePerKg: 320000,
    colorHex: '#DC2626',
    colorName: 'Đỏ Đô',
    density: 1.05,
    stockStatus: 'LowStock',
    currentStockGrams: 950,
    lowStockThresholdGrams: 1500
  },
  {
    id: 'mat-204',
    workshopId: 'ws-hub-01',
    materialName: 'Anycubic Standard Resin 8K Xám',
    materialType: 'Resin',
    pricePerKg: 420000,
    colorHex: '#64748B',
    colorName: 'Xám Cơ Khí',
    density: 1.15,
    stockStatus: 'Tracking',
    currentStockGrams: 4000,
    lowStockThresholdGrams: 1000
  }
];

const DEFAULT_INVENTORY_LOGS: MaterialInventoryLog[] = [
  {
    id: 'log-301',
    materialId: 'mat-201',
    action: 'Import',
    grams: 10000,
    pricePerKgAtTime: 250000,
    supplier: 'eSUN Vietnam Official Distributor',
    batchCode: 'LOT-ESUN-2026-08',
    note: 'Nhập lô hàng 10 cuộn 1kg định kỳ tháng 8',
    createdBy: 'KS. Nguyễn Văn Tuấn',
    createdAt: '2026-08-20T10:15:00.000Z'
  },
  {
    id: 'log-302',
    materialId: 'mat-201',
    action: 'Export',
    grams: -2500,
    pricePerKgAtTime: 250000,
    note: 'Xuất in cụm chi tiết gá robot đơn #ORD-VCB-8402',
    createdBy: 'MES Auto-Dispatcher',
    createdAt: '2026-08-25T14:20:00.000Z'
  },
  {
    id: 'log-303',
    materialId: 'mat-202',
    action: 'Import',
    grams: 5000,
    pricePerKgAtTime: 280000,
    supplier: 'Bambu Store VN',
    batchCode: 'LOT-BAMBU-2609-PETG',
    note: 'Nhập phôi PETG chịu nhiệt',
    createdBy: 'KS. Nguyễn Văn Tuấn',
    createdAt: '2026-08-28T09:30:00.000Z'
  },
  {
    id: 'log-304',
    materialId: 'mat-203',
    action: 'Adjustment',
    grams: -50,
    pricePerKgAtTime: 320000,
    note: 'Kiểm kê định kỳ hao hụt đầu cuộn gãy giòn',
    createdBy: 'KS. Nguyễn Văn Tuấn',
    createdAt: '2026-09-01T16:00:00.000Z'
  }
];

export const WorkshopSettingsView: React.FC<WorkshopSettingsViewProps> = ({
  onNavigate,
  onShowToast
}) => {
  const [activeTab, setActiveTab] = useState<'machines' | 'materials' | 'audit_trail' | 'preferences'>('machines');

  // Load / initialize state from localStorage
  const [workshop, setWorkshop] = useState<WorkshopProfile>(() => {
    try {
      const saved = localStorage.getItem('vcube_workshop_profile');
      return saved ? JSON.parse(saved) : DEFAULT_WORKSHOP_PROFILE;
    } catch {
      return DEFAULT_WORKSHOP_PROFILE;
    }
  });

  const [machines, setMachines] = useState<WorkshopMachine[]>(() => {
    try {
      const saved = localStorage.getItem('vcube_workshop_machines');
      return saved ? JSON.parse(saved) : DEFAULT_MACHINES;
    } catch {
      return DEFAULT_MACHINES;
    }
  });

  const [materials, setMaterials] = useState<WorkshopMaterial[]>(() => {
    try {
      const saved = localStorage.getItem('vcube_workshop_materials');
      return saved ? JSON.parse(saved) : DEFAULT_MATERIALS;
    } catch {
      return DEFAULT_MATERIALS;
    }
  });

  const [inventoryLogs, setInventoryLogs] = useState<MaterialInventoryLog[]>(() => {
    try {
      const saved = localStorage.getItem('vcube_material_inventory_logs');
      return saved ? JSON.parse(saved) : DEFAULT_INVENTORY_LOGS;
    } catch {
      return DEFAULT_INVENTORY_LOGS;
    }
  });

  // Sync state back to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('vcube_workshop_profile', JSON.stringify(workshop));
    } catch (e) {
      console.warn(e);
    }
  }, [workshop]);

  useEffect(() => {
    try {
      localStorage.setItem('vcube_workshop_machines', JSON.stringify(machines));
    } catch (e) {
      console.warn(e);
    }
  }, [machines]);

  useEffect(() => {
    try {
      localStorage.setItem('vcube_workshop_materials', JSON.stringify(materials));
    } catch (e) {
      console.warn(e);
    }
  }, [materials]);

  useEffect(() => {
    try {
      localStorage.setItem('vcube_material_inventory_logs', JSON.stringify(inventoryLogs));
    } catch (e) {
      console.warn(e);
    }
  }, [inventoryLogs]);

  // -------------------------------------------------------------
  // Machine Management Actions
  // -------------------------------------------------------------
  const handleToggleMachineStatus = (machineId: string, newStatus: WorkshopMachine['status']) => {
    setMachines(prev =>
      prev.map(m => (m.id === machineId ? { ...m, status: newStatus, updatedAt: new Date().toISOString() } : m))
    );
    const mName = machines.find(m => m.id === machineId)?.machineName || 'Máy in';
    onShowToast?.(`Đã đổi trạng thái "${mName}" thành ${newStatus}!`);
  };

  // Add / Edit Machine Modal State
  const [machineModalOpen, setMachineModalOpen] = useState(false);
  const [editingMachine, setEditingMachine] = useState<WorkshopMachine | null>(null);
  const [mName, setMName] = useState('');
  const [mType, setMType] = useState<WorkshopMachine['machineType']>('FDM');
  const [mPower, setMPower] = useState<number>(0.18);
  const [mPrice, setMPrice] = useState<number>(25000000);
  const [mLifetime, setMLifetime] = useState<number>(8000);
  const [mVolX, setMVolX] = useState<number>(256);
  const [mVolY, setMVolY] = useState<number>(256);
  const [mVolZ, setMVolZ] = useState<number>(256);

  const openMachineModal = (machine?: WorkshopMachine) => {
    if (machine) {
      setEditingMachine(machine);
      setMName(machine.machineName);
      setMType(machine.machineType);
      setMPower(machine.avgPowerKW);
      setMPrice(machine.purchasePrice);
      setMLifetime(machine.lifetimeHours);
      setMVolX(machine.buildVolumeMm?.x || 256);
      setMVolY(machine.buildVolumeMm?.y || 256);
      setMVolZ(machine.buildVolumeMm?.z || 256);
    } else {
      setEditingMachine(null);
      setMName(`Máy In 3D FDM #${machines.length + 1}`);
      setMType('FDM');
      setMPower(0.18);
      setMPrice(25000000);
      setMLifetime(8000);
      setMVolX(256);
      setMVolY(256);
      setMVolZ(256);
    }
    setMachineModalOpen(true);
  };

  const handleSaveMachine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mName.trim()) {
      onShowToast?.('Vui lòng nhập tên máy in!');
      return;
    }

    if (editingMachine) {
      setMachines(prev =>
        prev.map(m =>
          m.id === editingMachine.id
            ? {
                ...m,
                machineName: mName.trim(),
                machineType: mType,
                avgPowerKW: Number(mPower) || 0.18,
                purchasePrice: Number(mPrice) || 20000000,
                lifetimeHours: Number(mLifetime) || 8000,
                buildVolumeMm: { x: mVolX, y: mVolY, z: mVolZ },
                updatedAt: new Date().toISOString()
              }
            : m
        )
      );
      onShowToast?.(`Đã cập nhật máy "${mName}"!`);
    } else {
      const newMachine: WorkshopMachine = {
        id: `mch-${Date.now()}`,
        workshopId: workshop.id,
        machineName: mName.trim(),
        machineType: mType,
        avgPowerKW: Number(mPower) || 0.18,
        purchasePrice: Number(mPrice) || 20000000,
        lifetimeHours: Number(mLifetime) || 8000,
        status: 'Free',
        buildVolumeMm: { x: mVolX, y: mVolY, z: mVolZ },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setMachines(prev => [...prev, newMachine]);
      onShowToast?.(`Đã thêm máy in "${newMachine.machineName}" vào xưởng!`);
    }
    setMachineModalOpen(false);
  };

  const handleDeleteMachine = (id: string) => {
    if (machines.length <= 1) {
      onShowToast?.('Xưởng cần duy trì tối thiểu 01 máy in!');
      return;
    }
    const m = machines.find(x => x.id === id);
    setMachines(prev => prev.filter(x => x.id !== id));
    onShowToast?.(`Đã xóa máy "${m?.machineName || id}"!`);
  };

  // -------------------------------------------------------------
  // Material Restock Form & Price Change Warning
  // -------------------------------------------------------------
  const [restockModalOpen, setRestockModalOpen] = useState(false);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>(materials[0]?.id || '');
  const [restockGrams, setRestockGrams] = useState<number>(3000);
  const [restockPricePerKg, setRestockPricePerKg] = useState<number>(250000);
  const [restockSupplier, setRestockSupplier] = useState('Nhà Phân Phối Nhựa 3D Chính Hãng');
  const [restockBatchCode, setRestockBatchCode] = useState(`LOT-${new Date().getFullYear()}-${(new Date().getMonth() + 1).toString().padStart(2, '0')}`);
  const [restockNote, setRestockNote] = useState('Nhập bổ sung phôi in đơn hàng lớn');

  // Selected Material details
  const targetMaterial = useMemo(() => {
    return materials.find(m => m.id === selectedMaterialId) || materials[0];
  }, [materials, selectedMaterialId]);

  // When changing selected material in restock modal, set current price
  useEffect(() => {
    if (targetMaterial) {
      setRestockPricePerKg(targetMaterial.pricePerKg);
    }
  }, [selectedMaterialId, targetMaterial]);

  // Check if price is different from current system price
  const isPriceDifferent = useMemo(() => {
    if (!targetMaterial) return false;
    return Number(restockPricePerKg) !== Number(targetMaterial.pricePerKg);
  }, [targetMaterial, restockPricePerKg]);

  const priceDiffAmount = useMemo(() => {
    if (!targetMaterial) return 0;
    return Number(restockPricePerKg) - Number(targetMaterial.pricePerKg);
  }, [targetMaterial, restockPricePerKg]);

  const handleConfirmRestock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetMaterial) return;

    const gramsNum = Number(restockGrams) || 0;
    if (gramsNum <= 0) {
      onShowToast?.('Vui lòng nhập số gram phôi hợp lệ (> 0)!');
      return;
    }

    const newPrice = Number(restockPricePerKg) || targetMaterial.pricePerKg;
    const oldPrice = targetMaterial.pricePerKg;

    // 1. Update material inventory and price
    const updatedStockGrams = targetMaterial.currentStockGrams + gramsNum;
    const updatedStatus: WorkshopMaterial['stockStatus'] =
      updatedStockGrams <= 0
        ? 'OutOfStock'
        : updatedStockGrams < (targetMaterial.lowStockThresholdGrams || 1000)
        ? 'LowStock'
        : 'Tracking';

    setMaterials(prev =>
      prev.map(m =>
        m.id === targetMaterial.id
          ? {
              ...m,
              currentStockGrams: updatedStockGrams,
              pricePerKg: newPrice, // Update price if changed
              stockStatus: updatedStatus,
              updatedAt: new Date().toISOString()
            }
          : m
      )
    );

    // 2. Create Audit Log entry in material_inventory_logs
    const newLog: MaterialInventoryLog = {
      id: `log-${Date.now()}`,
      materialId: targetMaterial.id,
      action: 'Import',
      grams: gramsNum,
      pricePerKgAtTime: newPrice,
      supplier: restockSupplier.trim() || 'Nhà phân phối',
      batchCode: restockBatchCode.trim() || 'BATCH-AUTO',
      note: isPriceDifferent
        ? `${restockNote.trim()} [Cập nhật giá: ${oldPrice.toLocaleString('vi-VN')}đ ➔ ${newPrice.toLocaleString('vi-VN')}đ/kg]`
        : restockNote.trim(),
      createdBy: workshop.workshopName || 'Quản lý xưởng',
      createdAt: new Date().toISOString()
    };

    setInventoryLogs(prev => [newLog, ...prev]);

    setRestockModalOpen(false);

    if (isPriceDifferent) {
      onShowToast?.(
        `Đã nhập +${(gramsNum / 1000).toFixed(1)}kg! Đơn giá ${targetMaterial.materialName} đã tự động cập nhật sang ${newPrice.toLocaleString('vi-VN')} đ/kg và lưu vết lịch sử.`
      );
    } else {
      onShowToast?.(`Đã nhập kho +${(gramsNum / 1000).toFixed(1)}kg ${targetMaterial.materialName} thành công!`);
    }
  };

  // -------------------------------------------------------------
  // Audit Trail Filter State
  // -------------------------------------------------------------
  const [auditSearchQuery, setAuditSearchQuery] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState<'ALL' | 'Import' | 'Export' | 'Adjustment'>('ALL');
  const [auditMaterialFilter, setAuditMaterialFilter] = useState<'ALL' | string>('ALL');

  const filteredLogs = useMemo(() => {
    return inventoryLogs.filter(log => {
      if (auditActionFilter !== 'ALL' && log.action !== auditActionFilter) return false;
      if (auditMaterialFilter !== 'ALL' && log.materialId !== auditMaterialFilter) return false;
      if (auditSearchQuery.trim()) {
        const q = auditSearchQuery.toLowerCase();
        const mat = materials.find(m => m.id === log.materialId);
        const matchName = mat?.materialName.toLowerCase().includes(q);
        const matchBatch = log.batchCode?.toLowerCase().includes(q);
        const matchNote = log.note?.toLowerCase().includes(q);
        const matchSupplier = log.supplier?.toLowerCase().includes(q);
        if (!matchName && !matchBatch && !matchNote && !matchSupplier) return false;
      }
      return true;
    });
  }, [inventoryLogs, auditActionFilter, auditMaterialFilter, auditSearchQuery, materials]);

  // Workshop preferences form
  const [prefWorkshopName, setPrefWorkshopName] = useState(workshop.workshopName);
  const [prefAddress, setPrefAddress] = useState(workshop.address);
  const [prefRegion, setPrefRegion] = useState(workshop.region);
  const [prefPhone, setPrefPhone] = useState(workshop.contactPhone || '');
  const [prefEmail, setPrefEmail] = useState(workshop.contactEmail || '');
  const [prefElectricity, setPrefElectricity] = useState(workshop.electricityRateOverride || 2850);
  const [prefLabor, setPrefLabor] = useState(workshop.laborRateOverride || 65000);

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    setWorkshop(prev => ({
      ...prev,
      workshopName: prefWorkshopName.trim(),
      address: prefAddress.trim(),
      region: prefRegion as any,
      contactPhone: prefPhone.trim(),
      contactEmail: prefEmail.trim(),
      electricityRateOverride: Number(prefElectricity) || 2850,
      laborRateOverride: Number(prefLabor) || 65000,
      updatedAt: new Date().toISOString()
    }));
    onShowToast?.('Đã lưu thông tin cấu hình xưởng in thành công!');
  };

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = machines.length;
    const free = machines.filter(m => m.status === 'Free').length;
    const busy = machines.filter(m => m.status === 'Busy').length;
    const maintenance = machines.filter(m => m.status === 'Maintenance').length;
    const totalStockKg = materials.reduce((a, b) => a + b.currentStockGrams, 0) / 1000;
    const lowStockCount = materials.filter(
      m => m.currentStockGrams < (m.lowStockThresholdGrams || 1500)
    ).length;

    return { total, free, busy, maintenance, totalStockKg, lowStockCount };
  }, [machines, materials]);

  return (
    <div className="w-full min-h-screen bg-[#F8F9FA] text-slate-800 pb-16 font-sans">
      {/* Top Navigation & Status Banner */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between py-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-[#00687A] text-white flex items-center justify-center shadow-sm shrink-0">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold text-slate-900 tracking-tight">{workshop.workshopName}</h1>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-bold inline-flex items-center gap-1 ${
                      workshop.verifiedStatus === 'Verified'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : workshop.verifiedStatus === 'Pending'
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-rose-100 text-rose-800 border border-rose-300'
                    }`}
                  >
                    {workshop.verifiedStatus === 'Verified' ? (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        Xưởng Đã Duyệt (Verified)
                      </>
                    ) : (
                      <>
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        Chờ Duyệt (Pending)
                      </>
                    )}
                  </span>
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    Khu vực: <strong>Miền {workshop.region}</strong> (Geo-Dispatcher)
                  </span>
                  <span>•</span>
                  <span>Hotline: {workshop.contactPhone}</span>
                </div>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRestockModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#00687A] hover:bg-[#005260] text-white text-xs font-bold shadow-sm transition-all"
              >
                <ArrowDownToLine className="w-4 h-4 text-cyan-200" />
                Nhập Kho Nhựa Nhanh
              </button>
              <button
                type="button"
                onClick={() => openMachineModal()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                Thêm Máy In
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 overflow-x-auto border-t border-slate-100 pt-1 -mb-px">
            {[
              { id: 'machines', label: `Quản Lý Máy In (${machines.length})`, icon: Printer },
              { id: 'materials', label: `Kho Nhựa & Phôi (${materials.length})`, icon: Layers },
              { id: 'audit_trail', label: `Lịch Sử Biến Động Giá (${inventoryLogs.length})`, icon: FileText },
              { id: 'preferences', label: 'Cấu Hình Xưởng', icon: Settings }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  type="button"
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-3 px-4 text-xs font-bold border-b-2 whitespace-nowrap flex items-center gap-2 transition-colors ${
                    isActive
                      ? 'border-[#00687A] text-[#00687A] bg-teal-50/40'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* KPI Mini-Cards Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Đội máy hoạt động</div>
            <div className="text-xl font-extrabold text-slate-900 mt-1 flex items-baseline gap-1.5">
              {metrics.total} <span className="text-xs font-semibold text-slate-500">máy</span>
            </div>
            <div className="mt-1 flex items-center gap-2 text-[11px]">
              <span className="text-emerald-700 font-bold">{metrics.free} Rảnh</span>
              <span>•</span>
              <span className="text-amber-700 font-bold">{metrics.busy} Đang In</span>
              {metrics.maintenance > 0 && (
                <>
                  <span>•</span>
                  <span className="text-rose-700 font-bold">{metrics.maintenance} Bảo trì</span>
                </>
              )}
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tổng nhựa tồn kho</div>
            <div className="text-xl font-extrabold text-[#00687A] mt-1">
              {metrics.totalStockKg.toFixed(1)} <span className="text-xs font-semibold text-slate-500">kg phôi</span>
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              {materials.length} cuộn màu sẵn sàng
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Cảnh báo sắp hết phôi</div>
            <div className={`text-xl font-extrabold mt-1 ${metrics.lowStockCount > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
              {metrics.lowStockCount} <span className="text-xs font-semibold text-slate-500">cuộn &lt; 1.5kg</span>
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              {metrics.lowStockCount > 0 ? 'Cần nhập hàng bổ sung' : 'Tồn kho dồi dào'}
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Đơn giá điện xưởng</div>
            <div className="text-xl font-extrabold text-amber-700 mt-1">
              {(workshop.electricityRateOverride || 2850).toLocaleString('vi-VN')} <span className="text-xs font-semibold text-slate-500">đ/kWh</span>
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              Điện kinh doanh 3 pha
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: 3D PRINTERS SELF-MANAGEMENT */}
        {/* ========================================================================= */}
        {activeTab === 'machines' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Printer className="w-5 h-5 text-[#00687A]" />
                  Quản lý trạng thái đội máy in & Cấu hình vận hành
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Xưởng có thể chủ động chuyển trạng thái máy. Thuật toán Geo-Dispatcher chỉ điều phối đơn hàng đến các máy ở trạng thái <strong>Free (Rảnh)</strong>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => openMachineModal()}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shrink-0 shadow-xs"
              >
                <Plus className="w-4 h-4" />
                Thêm Máy In Mới
              </button>
            </div>

            {/* Machines Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
              {machines.map((machine, index) => {
                const depRate = Math.round(machine.purchasePrice / (machine.lifetimeHours || 8000));
                const elecRate = Math.round(machine.avgPowerKW * (workshop.electricityRateOverride || 2850));
                const totalRate = depRate + elecRate;

                // Status styling helper
                const statusConfig = {
                  Free: {
                    label: 'Free (Rảnh)',
                    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/20',
                    dot: 'bg-emerald-500'
                  },
                  Busy: {
                    label: 'Busy (Đang In)',
                    bg: 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-500/20',
                    dot: 'bg-amber-500 animate-pulse'
                  },
                  Maintenance: {
                    label: 'Maintenance (Bảo Trì)',
                    bg: 'bg-rose-50 text-rose-700 border-rose-200 ring-rose-500/20',
                    dot: 'bg-rose-500'
                  },
                  Offline: {
                    label: 'Offline (Tắt Máy)',
                    bg: 'bg-slate-100 text-slate-600 border-slate-300 ring-slate-400/20',
                    dot: 'bg-slate-400'
                  }
                }[machine.status];

                return (
                  <div
                    key={machine.id}
                    className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow p-5 flex flex-col justify-between gap-4"
                  >
                    <div>
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-sm">
                            #{index + 1}
                          </div>
                          <div>
                            <h3 className="font-bold text-sm text-slate-900 leading-snug">{machine.machineName}</h3>
                            <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                              <span className="font-semibold text-slate-700">{machine.machineType}</span>
                              <span>•</span>
                              <span>Khổ in: {machine.buildVolumeMm?.x}×{machine.buildVolumeMm?.y}×{machine.buildVolumeMm?.z} mm</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openMachineModal(machine)}
                            className="p-1.5 text-slate-400 hover:text-[#00687A] rounded-lg hover:bg-teal-50 transition-colors"
                            title="Chỉnh sửa máy"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteMachine(machine.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-rose-50 transition-colors"
                            title="Xóa máy"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Status Selector Bar */}
                      <div className="mt-4 p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-wrap items-center justify-between gap-2">
                        <div className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${statusConfig.dot}`} />
                          <span>Trạng thái: <strong>{statusConfig.label}</strong></span>
                        </div>

                        {/* Interactive Status Toggle Buttons */}
                        <div className="flex items-center gap-1">
                          {(['Free', 'Busy', 'Maintenance', 'Offline'] as WorkshopMachine['status'][]).map(st => (
                            <button
                              type="button"
                              key={st}
                              onClick={() => handleToggleMachineStatus(machine.id, st)}
                              className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${
                                machine.status === st
                                  ? 'bg-white shadow-xs text-slate-900 ring-1 ring-slate-300 font-extrabold'
                                  : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/60'
                              }`}
                            >
                              {st}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Active Job ID if Busy */}
                      {machine.status === 'Busy' && machine.currentJobId && (
                        <div className="mt-2 text-xs bg-amber-50 text-amber-800 px-3 py-1.5 rounded-lg border border-amber-200 flex items-center justify-between">
                          <span className="font-semibold">Đang xử lý đơn in:</span>
                          <span className="font-mono font-bold">{machine.currentJobId}</span>
                        </div>
                      )}

                      {/* Specs & Cost Rates */}
                      <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 text-xs">
                        <div>
                          <div className="text-[10px] text-slate-400">Công suất TB</div>
                          <div className="font-bold text-amber-700">{machine.avgPowerKW} kW</div>
                          <div className="text-[10px] text-slate-400">~{elecRate.toLocaleString('vi-VN')} đ/h điện</div>
                        </div>

                        <div>
                          <div className="text-[10px] text-slate-400">Giá mua / Tuổi thọ</div>
                          <div className="font-bold text-slate-700">
                            {(machine.purchasePrice / 1000000).toFixed(1)} tr / {machine.lifetimeHours}h
                          </div>
                          <div className="text-[10px] text-indigo-600 font-medium">
                            ~{depRate.toLocaleString('vi-VN')} đ/h khấu hao
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-[10px] text-slate-400">Tổng chi phí máy/h</div>
                          <div className="text-sm font-extrabold text-emerald-700">
                            {totalRate.toLocaleString('vi-VN')} đ/h
                          </div>
                          <div className="text-[10px] text-emerald-600 font-semibold">Tự động nạp BOM</div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: MATERIALS & INVENTORY MANAGEMENT */}
        {/* ========================================================================= */}
        {activeTab === 'materials' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-[#00687A]" />
                  Quản lý kho nhựa in & Báo cáo tồn kho
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Theo dõi số gram tồn kho thực tế. Dễ dàng nhập hàng và cập nhật đơn giá phôi tức thì.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRestockModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#00687A] hover:bg-[#005260] text-white text-xs font-bold shadow-xs transition-colors"
              >
                <ArrowDownToLine className="w-4 h-4 text-cyan-200" />
                Phiếu Nhập Kho Nhựa
              </button>
            </div>

            {/* Materials Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Loại & Màu Sắc Phôi</th>
                      <th className="py-3 px-4">Tên Cuộn / Dòng Nhựa</th>
                      <th className="py-3 px-4 text-right">Đơn Giá Cơ Sở (VND/kg)</th>
                      <th className="py-3 px-4 text-right">Tồn Kho Hiện Tại</th>
                      <th className="py-3 px-4 text-center">Trạng Thái Kho</th>
                      <th className="py-3 px-4 text-center">Hành Động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {materials.map(mat => {
                      const isLow = mat.currentStockGrams < (mat.lowStockThresholdGrams || 1500);
                      const isOut = mat.currentStockGrams <= 0;
                      return (
                        <tr key={mat.id} className="hover:bg-slate-50/80 transition-colors">
                          {/* Type & Color Swatch */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div
                                className="w-7 h-7 rounded-lg border border-slate-300 shadow-inner shrink-0 flex items-center justify-center text-[9px] font-bold text-white uppercase"
                                style={{ backgroundColor: mat.colorHex }}
                              >
                                {mat.materialType.slice(0, 3)}
                              </div>
                              <div>
                                <span className="font-bold text-slate-800">{mat.materialType}</span>
                                <div className="text-[11px] text-slate-400">{mat.colorName || 'Chuẩn'}</div>
                              </div>
                            </div>
                          </td>

                          {/* Material Name */}
                          <td className="py-3.5 px-4 font-semibold text-slate-900">
                            {mat.materialName}
                          </td>

                          {/* Price per Kg */}
                          <td className="py-3.5 px-4 text-right">
                            <span className="font-mono font-bold text-slate-900 text-sm">
                              {mat.pricePerKg.toLocaleString('vi-VN')}
                            </span>
                            <span className="text-[10px] text-slate-400 block">đ/kg</span>
                          </td>

                          {/* Stock in grams & kg */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="font-extrabold text-sm text-[#00687A]">
                              {(mat.currentStockGrams / 1000).toFixed(2)} kg
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {mat.currentStockGrams.toLocaleString('vi-VN')} g
                            </div>
                          </td>

                          {/* Stock Status Badge */}
                          <td className="py-3.5 px-4 text-center">
                            {isOut ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                Hết Hàng
                              </span>
                            ) : isLow ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                Sắp Hết (Cần Nhập)
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                Đủ Phôi In
                              </span>
                            )}
                          </td>

                          {/* Action */}
                          <td className="py-3.5 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedMaterialId(mat.id);
                                setRestockModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-[#00687A] font-bold text-xs transition-colors"
                            >
                              + Nhập Thêm
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: MATERIAL INVENTORY AUDIT TRAIL */}
        {/* ========================================================================= */}
        {activeTab === 'audit_trail' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#00687A]" />
                  Lịch sử biến động giá vật liệu & Sổ nhật ký kho (Audit Trail)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Lưu vết toàn bộ giao dịch nhập xuất, đơn giá tại thời điểm nhập, nhà cung cấp và mã lô hàng.
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={auditSearchQuery}
                    onChange={e => setAuditSearchQuery(e.target.value)}
                    placeholder="Tìm theo mã lô, tên phôi..."
                    className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#00687A]"
                  />
                </div>

                <select
                  value={auditActionFilter}
                  onChange={e => setAuditActionFilter(e.target.value as any)}
                  className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 font-semibold text-slate-700"
                >
                  <option value="ALL">Tất cả hành động</option>
                  <option value="Import">Nhập kho (Import)</option>
                  <option value="Export">Xuất in (Export)</option>
                  <option value="Adjustment">Điều chỉnh (Adjustment)</option>
                </select>

                <select
                  value={auditMaterialFilter}
                  onChange={e => setAuditMaterialFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 font-semibold text-slate-700"
                >
                  <option value="ALL">Tất cả vật liệu</option>
                  {materials.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.materialName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Audit Trail Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Thời Gian</th>
                      <th className="py-3 px-4">Hành Động</th>
                      <th className="py-3 px-4">Loại Vật Liệu</th>
                      <th className="py-3 px-4 text-right">Khối Lượng</th>
                      <th className="py-3 px-4 text-right">Đơn Giá Tại Thời Điểm</th>
                      <th className="py-3 px-4">Mã Lô & Nhà Cung Cấp</th>
                      <th className="py-3 px-4">Ghi Chú / Người Tạo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLogs.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                          Không tìm thấy nhật ký biến động phù hợp với bộ lọc.
                        </td>
                      </tr>
                    ) : (
                      filteredLogs.map(log => {
                        const mat = materials.find(m => m.id === log.materialId);
                        const isImport = log.action === 'Import';
                        const isExport = log.action === 'Export';

                        return (
                          <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                            {/* Timestamp */}
                            <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-medium">
                              {new Date(log.createdAt).toLocaleString('vi-VN', {
                                hour: '2-digit',
                                minute: '2-digit',
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                              })}
                            </td>

                            {/* Action badge */}
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                                  isImport
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : isExport
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {isImport ? (
                                  <>
                                    <ArrowDownToLine className="w-3 h-3" />
                                    Nhập kho
                                  </>
                                ) : isExport ? (
                                  <>
                                    <ArrowUpRight className="w-3 h-3" />
                                    Xuất in
                                  </>
                                ) : (
                                  <>
                                    <RefreshCw className="w-3 h-3" />
                                    Điều chỉnh
                                  </>
                                )}
                              </span>
                            </td>

                            {/* Material */}
                            <td className="py-3 px-4 font-semibold text-slate-800">
                              <div className="flex items-center gap-2">
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: mat?.colorHex || '#666' }}
                                />
                                <span>{mat?.materialName || log.materialId}</span>
                              </div>
                            </td>

                            {/* Grams */}
                            <td className="py-3 px-4 text-right">
                              <span
                                className={`font-bold font-mono ${
                                  log.grams > 0 ? 'text-emerald-700' : 'text-slate-700'
                                }`}
                              >
                                {log.grams > 0 ? `+${log.grams.toLocaleString('vi-VN')}` : log.grams.toLocaleString('vi-VN')}{' '}
                                g
                              </span>
                            </td>

                            {/* Price at time */}
                            <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                              {log.pricePerKgAtTime ? (
                                <>
                                  {log.pricePerKgAtTime.toLocaleString('vi-VN')}{' '}
                                  <span className="text-[10px] text-slate-400 font-normal">đ/kg</span>
                                </>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>

                            {/* Batch & Supplier */}
                            <td className="py-3 px-4">
                              <div className="font-mono text-[11px] font-semibold text-slate-800">
                                {log.batchCode || 'N/A'}
                              </div>
                              <div className="text-[11px] text-slate-400 truncate max-w-[180px]">
                                {log.supplier || 'Không ghi nhận'}
                              </div>
                            </td>

                            {/* Note & Created By */}
                            <td className="py-3 px-4">
                              <div className="text-slate-700 max-w-[220px] truncate">{log.note || 'Phiếu tự động'}</div>
                              <div className="text-[10px] text-slate-400 mt-0.5">{log.createdBy || 'Hệ thống'}</div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: WORKSHOP PREFERENCES & SETTINGS */}
        {/* ========================================================================= */}
        {activeTab === 'preferences' && (
          <div className="max-w-3xl bg-white rounded-2xl border border-slate-200 shadow-xs p-6 md:p-8 space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Settings className="w-5 h-5 text-[#00687A]" />
                Cấu hình thông tin hoạt động & Thông số định tuyến xưởng
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Các thông số này được sử dụng để thuật toán Geo-Dispatcher tính toán khoảng cách và đơn giá BOM gia công.
              </p>
            </div>

            <form onSubmit={handleSavePreferences} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Tên xưởng in</label>
                  <input
                    type="text"
                    value={prefWorkshopName}
                    onChange={e => setPrefWorkshopName(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Khu vực Geo-Dispatcher</label>
                  <select
                    value={prefRegion}
                    onChange={e => setPrefRegion(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 font-semibold"
                  >
                    <option value="Bắc">Miền Bắc (Hub Hà Nội & lân cận)</option>
                    <option value="Trung">Miền Trung (Hub Đà Nẵng & lân cận)</option>
                    <option value="Nam">Miền Nam (Hub TP.HCM & lân cận)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Số điện thoại hotline</label>
                  <input
                    type="text"
                    value={prefPhone}
                    onChange={e => setPrefPhone(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Email kỹ thuật</label>
                  <input
                    type="email"
                    value={prefEmail}
                    onChange={e => setPrefEmail(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Địa chỉ xưởng thực tế</label>
                <input
                  type="text"
                  value={prefAddress}
                  onChange={e => setPrefAddress(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-500" />
                    Đơn giá điện xưởng (VND/kWh)
                  </div>
                  <input
                    type="number"
                    value={prefElectricity}
                    onChange={e => setPrefElectricity(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 font-bold text-amber-700"
                  />
                  <span className="text-[11px] text-slate-400 block">Dùng tính chi phí tiền điện máy theo giờ in</span>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-emerald-600" />
                    Chi phí nhân công xưởng (VND/giờ)
                  </div>
                  <input
                    type="number"
                    value={prefLabor}
                    onChange={e => setPrefLabor(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 font-bold text-emerald-700"
                  />
                  <span className="text-[11px] text-slate-400 block">Dùng tính tiền công tách support & xử lý bề mặt</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#00687A] hover:bg-[#005260] text-white font-bold text-sm shadow-sm transition-colors"
                >
                  <Save className="w-4 h-4" />
                  Lưu Cấu Hình Xưởng
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: FORM NHẬP KHO NHỰA NHANH & CẢNH BÁO GIÁ THAY ĐỔI */}
      {/* ========================================================================= */}
      {restockModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-xl overflow-hidden animate-fadeIn">
            <div className="bg-gradient-to-r from-[#00687A] to-[#0284C7] p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ArrowDownToLine className="w-5 h-5 text-cyan-200" />
                <h3 className="font-bold text-base">Phiếu Nhập Kho Phôi Nhựa Nhanh</h3>
              </div>
              <button
                type="button"
                onClick={() => setRestockModalOpen(false)}
                className="text-white/80 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmRestock} className="p-6 space-y-4">
              {/* Select Material */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Chọn loại cuộn nhựa cần nhập <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedMaterialId}
                  onChange={e => setSelectedMaterialId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-semibold text-sm"
                >
                  {materials.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.materialName} ({m.colorName || m.colorHex}) - Hiện có: {(m.currentStockGrams / 1000).toFixed(1)}kg
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Grams to import */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Số lượng nhập (Gram) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="500"
                    value={restockGrams}
                    onChange={e => setRestockGrams(Number(e.target.value))}
                    placeholder="VD: 3000g = 3 cuộn"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-bold text-[#00687A]"
                  />
                  <span className="text-[11px] text-slate-400">
                    Tương đương: {(restockGrams / 1000).toFixed(1)} kg
                  </span>
                </div>

                {/* Import Price per kg */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Đơn giá nhập đợt này (VND/kg) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="5000"
                    value={restockPricePerKg}
                    onChange={e => setRestockPricePerKg(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-900"
                  />
                  <span className="text-[11px] text-slate-400">
                    Giá cũ: {targetMaterial?.pricePerKg.toLocaleString('vi-VN')} đ/kg
                  </span>
                </div>
              </div>

              {/* CRITICAL FEATURE: Price Fluctuation Warning */}
              {isPriceDifferent && (
                <div className="p-4 rounded-xl bg-amber-50 border-2 border-amber-300 text-amber-900 text-xs space-y-1 animate-fadeIn">
                  <div className="flex items-center gap-2 font-bold text-amber-800 text-sm">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                    Cảnh Báo Biến Động Đơn Giá Nhập Phôi!
                  </div>
                  <p className="text-amber-800 leading-relaxed">
                    Đơn giá nhập đợt này (<strong>{Number(restockPricePerKg).toLocaleString('vi-VN')} đ/kg</strong>) khác
                    với đơn giá hiện tại trong hệ thống (
                    <strong>{targetMaterial?.pricePerKg.toLocaleString('vi-VN')} đ/kg</strong>, lệch{' '}
                    <span className="font-bold font-mono">
                      {priceDiffAmount > 0 ? `+${priceDiffAmount.toLocaleString('vi-VN')}` : priceDiffAmount.toLocaleString('vi-VN')} đ
                    </span>
                    ).
                  </p>
                  <p className="font-semibold text-amber-900">
                    ➔ Hệ thống sẽ tự động cập nhật đơn giá cơ sở mới và ghi nhận nhật ký lưu vết vào bảng{' '}
                    <code className="bg-amber-200/80 px-1 py-0.5 rounded font-mono">material_inventory_logs</code>.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Nhà cung cấp</label>
                  <input
                    type="text"
                    value={restockSupplier}
                    onChange={e => setRestockSupplier(e.target.value)}
                    placeholder="VD: eSUN VN, Phân phối 3D..."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Mã lô hàng (Batch Code)</label>
                  <input
                    type="text"
                    value={restockBatchCode}
                    onChange={e => setRestockBatchCode(e.target.value)}
                    placeholder="VD: LOT-2026-09A"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Ghi chú phiếu nhập kho</label>
                <input
                  type="text"
                  value={restockNote}
                  onChange={e => setRestockNote(e.target.value)}
                  placeholder="Ghi chú về nguồn gốc, mục đích đơn hàng..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRestockModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#00687A] hover:bg-[#005260] text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Xác Nhận Nhập Kho & Cập Nhật Giá
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: THÊM / SỬA MÁY IN */}
      {/* ========================================================================= */}
      {machineModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-xl overflow-hidden animate-fadeIn">
            <div className="bg-slate-900 p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Printer className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-base">
                  {editingMachine ? 'Chỉnh Sửa Thông Số Máy In' : 'Khai Báo Thêm Máy In Mới'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setMachineModalOpen(false)}
                className="text-white/80 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMachine} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Tên Máy In & Ký Hiệu <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={mName}
                  onChange={e => setMName(e.target.value)}
                  placeholder="VD: Bambu Lab X1-Carbon #05"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Công nghệ</label>
                  <select
                    value={mType}
                    onChange={e => setMType(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-semibold"
                  >
                    <option value="FDM">FDM / FFF (Sợi nhựa)</option>
                    <option value="SLA">SLA / Resin quang hóa</option>
                    <option value="SLS">SLS (Bột laser)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Công suất tiêu thụ TB (kW)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={mPower}
                    onChange={e => setMPower(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-bold text-amber-700"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Giá mua máy (VND)</label>
                  <input
                    type="number"
                    step="500000"
                    value={mPrice}
                    onChange={e => setMPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-bold text-slate-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Tuổi thọ khấu hao (Giờ)</label>
                  <input
                    type="number"
                    step="500"
                    value={mLifetime}
                    onChange={e => setMLifetime(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Khổ in (X × Y × Z mm)</label>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    value={mVolX}
                    onChange={e => setMVolX(Number(e.target.value))}
                    placeholder="X"
                    className="px-2 py-2 text-xs rounded-lg border border-slate-300 text-center font-bold"
                  />
                  <input
                    type="number"
                    value={mVolY}
                    onChange={e => setMVolY(Number(e.target.value))}
                    placeholder="Y"
                    className="px-2 py-2 text-xs rounded-lg border border-slate-300 text-center font-bold"
                  />
                  <input
                    type="number"
                    value={mVolZ}
                    onChange={e => setMVolZ(Number(e.target.value))}
                    placeholder="Z"
                    className="px-2 py-2 text-xs rounded-lg border border-slate-300 text-center font-bold"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setMachineModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition-all"
                >
                  {editingMachine ? 'Lưu Thay Đổi' : 'Thêm Máy Vào Xưởng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkshopSettingsView;
