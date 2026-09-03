import React, { useState, useEffect } from 'react';
import { MaterialProfile, PrinterProfile, InkiriCostFormulaConfig, VolumeDiscountTier, AccessoryItem } from '../../types';
import { calculateManualInkiriEstimate } from '../../utils/pricingEngine';
import { DEFAULT_INKIRI_FORMULA_CONFIG } from '../../data/mockData';
import { AccessoriesManager } from './AccessoriesManager';
import { WarehouseInventoryPanel } from './WarehouseInventoryPanel';
import { WorkshopEstimatorBOM } from './WorkshopEstimatorBOM';

interface PricingConfigPanelProps {
  initialSubTab?: 'formula' | 'materials' | 'printers' | 'accessories' | 'inventory' | 'estimator';
  materials: MaterialProfile[];
  printers: PrinterProfile[];
  accessories: AccessoryItem[];
  pricingConfig: InkiriCostFormulaConfig;
  onUpdateMaterials: (materials: MaterialProfile[]) => void;
  onUpdatePrinters: (printers: PrinterProfile[]) => void;
  onUpdateAccessories: (accessories: AccessoryItem[]) => void;
  onUpdatePricingConfig: (config: InkiriCostFormulaConfig) => void;
  onShowToast: (message: string) => void;
}

export const PricingConfigPanel: React.FC<PricingConfigPanelProps> = ({
  initialSubTab = 'formula',
  materials,
  printers,
  accessories,
  pricingConfig,
  onUpdateMaterials,
  onUpdatePrinters,
  onUpdateAccessories,
  onUpdatePricingConfig,
  onShowToast
}) => {
  const [subTab, setSubTab] = useState<'formula' | 'materials' | 'printers' | 'accessories' | 'inventory' | 'estimator'>(initialSubTab);

  useEffect(() => {
    if (initialSubTab) {
      setSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  // Working local copies
  const [formulaForm, setFormulaForm] = useState<InkiriCostFormulaConfig>({ ...pricingConfig });

  useEffect(() => {
    setFormulaForm({ ...pricingConfig });
  }, [pricingConfig]);
  
  // Material Modal/Edit States
  const [editingMaterial, setEditingMaterial] = useState<MaterialProfile | null>(null);
  const [isNewMaterialOpen, setIsNewMaterialOpen] = useState<boolean>(false);
  const [materialForm, setMaterialForm] = useState<Partial<MaterialProfile>>({
    name: '',
    brand: 'Bambu Lab',
    density: 1.24,
    strength: 'Cao',
    heatResistance: '60°C',
    flexibility: 'Thấp',
    costPerKg: 350000,
    pricePerGram: 900,
    unitPriceMultiplier: 1.0,
    spoolWeightGrams: 1000,
    extruderTempMin: 200,
    extruderTempMax: 220,
    bedTemp: 55,
    colors: ['#1C1C1C', '#FFFFFF', '#00687A', '#EA580C'],
    desc: 'Vật liệu kỹ thuật cao, cơ tính tốt, bề mặt mịn.',
    recommendedFor: 'Chi tiết cơ khí, vỏ hộp tiêu chuẩn',
    inStock: true,
    stockRollsCount: 20
  });

  // Printer Modal/Edit States
  const [editingPrinter, setEditingPrinter] = useState<PrinterProfile | null>(null);
  const [isNewPrinterOpen, setIsNewPrinterOpen] = useState<boolean>(false);
  const [printerForm, setPrinterForm] = useState<Partial<PrinterProfile>>({
    name: '',
    brand: 'Bambu Lab',
    technology: 'FDM',
    bedDimensions: { x: 256, y: 256, z: 256 },
    nozzleDiameter: 0.4,
    powerKW: 0.18,
    acquisitionCost: 28000000,
    expectedLifetimeHours: 8000,
    consumablesHourlyRate: 2500,
    hourlyRate: 25000,
    maxPrintSpeedMmS: 500,
    heatedBedMaxTemp: 110,
    hasEnclosure: true,
    hasAMS: true,
    status: 'Idle'
  });

  // Live Simulator States
  const [simWeightGrams, setSimWeightGrams] = useState<number>(85);
  const [simPrintHours, setSimPrintHours] = useState<number>(3.5);
  const [simSelectedMaterialId, setSimSelectedMaterialId] = useState<string>(materials[0]?.id || 'pla-tough');
  const [simSelectedPrinterId, setSimSelectedPrinterId] = useState<string>(printers[0]?.id || 'bambu-x1c');
  const [simQuantity, setSimQuantity] = useState<number>(1);
  const [simCustomMarkup, setSimCustomMarkup] = useState<number>(formulaForm.defaultMarkupPercent || 35);

  const selectedSimMaterial = materials.find(m => m.id === simSelectedMaterialId) || materials[0];
  const selectedSimPrinter = printers.find(p => p.id === simSelectedPrinterId) || printers[0];

  // Calculate live sim result
  const totalLaborMins = (formulaForm.fileReviewLaborMinutes ?? 4) +
    (formulaForm.setupLaborMinutes ?? 5) +
    (formulaForm.supportRemovalMinutes ?? 8) +
    (formulaForm.postProcessingLaborMinutes ?? 6) +
    (formulaForm.qcLaborMinutes ?? 4) +
    (formulaForm.packagingLaborMinutes ?? 3);

  const simResult = calculateManualInkiriEstimate({
    filamentGrams: simWeightGrams,
    printHours: simPrintHours,
    materialPricePerKg: selectedSimMaterial?.costPerKg || (selectedSimMaterial?.pricePerGram ? selectedSimMaterial.pricePerGram * 1000 : 350000),
    printerAcquisitionCost: selectedSimPrinter?.acquisitionCost || 30000000,
    printerLifetimeHours: selectedSimPrinter?.expectedLifetimeHours || 8000,
    printerConsumablesPerHour: selectedSimPrinter?.consumablesHourlyRate || 2500,
    printerPowerKW: selectedSimPrinter?.powerKW || 0.18,
    electricityRatePerKWh: formulaForm.electricityRatePerKWh || 2850,
    laborHourlyRate: formulaForm.laborHourlyRate || 65000,
    laborTotalMinutes: totalLaborMins,
    packagingCost: formulaForm.fixedPackagingCost || 12000,
    overheadCost: formulaForm.overheadPerUnit || 15000,
    failureRatePercent: formulaForm.baseFailureReservePercent || 8,
    markupPercent: simCustomMarkup,
    taxAndGatewayPercent: (formulaForm.platformCommissionPercent || 8) + (formulaForm.paymentGatewayFeePercent || 2.5) + (formulaForm.designerRoyaltyPercent || 5),
    quantity: simQuantity
  });

  // Handle Save Formula
  const handleSaveFormula = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdatePricingConfig(formulaForm);
    onShowToast('Đã lưu cấu hình công thức tính giá Inkiri toàn hệ thống!');
  };

  // Handle Reset Formula to Default
  const handleResetFormula = () => {
    if (window.confirm('Khôi phục công thức tính giá về thông số chuẩn ban đầu của Inkiri?')) {
      setFormulaForm({ ...DEFAULT_INKIRI_FORMULA_CONFIG });
      onUpdatePricingConfig({ ...DEFAULT_INKIRI_FORMULA_CONFIG });
      onShowToast('Đã khôi phục thông số công thức về mặc định.');
    }
  };

  // Volume Discount Handlers
  const handleAddDiscountTier = () => {
    const newTier: VolumeDiscountTier = {
      minQty: 100,
      maxQty: undefined,
      discountPercent: 35,
      label: '100+ chiếc (-35% Đơn sỉ cực lớn)'
    };
    setFormulaForm(prev => ({
      ...prev,
      volumeDiscounts: [...(prev.volumeDiscounts || []), newTier]
    }));
  };

  const handleRemoveDiscountTier = (idx: number) => {
    setFormulaForm(prev => ({
      ...prev,
      volumeDiscounts: (prev.volumeDiscounts || []).filter((_, i) => i !== idx)
    }));
  };

  const handleUpdateDiscountTier = (idx: number, updated: VolumeDiscountTier) => {
    setFormulaForm(prev => ({
      ...prev,
      volumeDiscounts: (prev.volumeDiscounts || []).map((t, i) => i === idx ? updated : t)
    }));
  };

  // Material Handlers
  const handleSaveNewMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!materialForm.name?.trim()) {
      onShowToast('Vui lòng nhập tên loại nhựa!');
      return;
    }
    const newId = `mat-${Date.now()}`;
    const newMat: MaterialProfile = {
      id: newId,
      name: materialForm.name,
      brand: materialForm.brand || 'VCUBE Filament',
      density: Number(materialForm.density) || 1.24,
      strength: materialForm.strength || 'Cao',
      heatResistance: materialForm.heatResistance || '60°C',
      flexibility: materialForm.flexibility || 'Thấp',
      costPerKg: Number(materialForm.costPerKg) || 350000,
      pricePerGram: Number(materialForm.pricePerGram) || 900,
      unitPriceMultiplier: Number(materialForm.unitPriceMultiplier) || 1.0,
      spoolWeightGrams: Number(materialForm.spoolWeightGrams) || 1000,
      extruderTempMin: Number(materialForm.extruderTempMin) || 200,
      extruderTempMax: Number(materialForm.extruderTempMax) || 220,
      bedTemp: Number(materialForm.bedTemp) || 55,
      colors: materialForm.colors && materialForm.colors.length > 0 ? materialForm.colors : ['#1C1C1C', '#FFFFFF'],
      desc: materialForm.desc || '',
      recommendedFor: materialForm.recommendedFor || '',
      inStock: materialForm.inStock ?? true,
      stockRollsCount: Number(materialForm.stockRollsCount) || 10
    };
    const updatedList = [...materials, newMat];
    onUpdateMaterials(updatedList);
    setIsNewMaterialOpen(false);
    onShowToast(`Đã thêm vật liệu mới: "${newMat.name}"`);
  };

  const handleSaveEditMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMaterial) return;
    const updatedList = materials.map(m => m.id === editingMaterial.id ? editingMaterial : m);
    onUpdateMaterials(updatedList);
    setEditingMaterial(null);
    onShowToast(`Đã cập nhật vật liệu: "${editingMaterial.name}"`);
  };

  const handleDeleteMaterial = (id: string, name: string) => {
    if (materials.length <= 1) {
      onShowToast('Cần duy trì tối thiểu 1 loại vật liệu trong hệ thống!');
      return;
    }
    if (window.confirm(`Xóa vật liệu "${name}" khỏi danh mục xưởng?`)) {
      const updatedList = materials.filter(m => m.id !== id);
      onUpdateMaterials(updatedList);
      onShowToast(`Đã xóa vật liệu "${name}"`);
    }
  };

  // Printer Handlers
  const handleSaveNewPrinter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!printerForm.name?.trim()) {
      onShowToast('Vui lòng nhập tên máy in!');
      return;
    }
    const newId = `prn-${Date.now()}`;
    const newPrinter: PrinterProfile = {
      id: newId,
      name: printerForm.name,
      brand: printerForm.brand || 'Bambu Lab',
      technology: printerForm.technology || 'FDM',
      bedDimensions: printerForm.bedDimensions || { x: 256, y: 256, z: 256 },
      nozzleDiameter: Number(printerForm.nozzleDiameter) || 0.4,
      powerKW: Number(printerForm.powerKW) || 0.18,
      acquisitionCost: Number(printerForm.acquisitionCost) || 25000000,
      expectedLifetimeHours: Number(printerForm.expectedLifetimeHours) || 8000,
      consumablesHourlyRate: Number(printerForm.consumablesHourlyRate) || 2500,
      hourlyRate: Number(printerForm.hourlyRate) || 25000,
      maxPrintSpeedMmS: Number(printerForm.maxPrintSpeedMmS) || 500,
      heatedBedMaxTemp: Number(printerForm.heatedBedMaxTemp) || 100,
      hasEnclosure: printerForm.hasEnclosure ?? true,
      hasAMS: printerForm.hasAMS ?? true,
      status: printerForm.status || 'Idle'
    };
    const updatedList = [...printers, newPrinter];
    onUpdatePrinters(updatedList);
    setIsNewPrinterOpen(false);
    onShowToast(`Đã thêm máy in mới: "${newPrinter.name}"`);
  };

  const handleSaveEditPrinter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPrinter) return;
    const updatedList = printers.map(p => p.id === editingPrinter.id ? editingPrinter : p);
    onUpdatePrinters(updatedList);
    setEditingPrinter(null);
    onShowToast(`Đã cập nhật máy in: "${editingPrinter.name}"`);
  };

  const handleDeletePrinter = (id: string, name: string) => {
    if (printers.length <= 1) {
      onShowToast('Cần duy trì tối thiểu 1 máy in trong hệ thống!');
      return;
    }
    if (window.confirm(`Xóa máy in "${name}" khỏi đội máy?`)) {
      const updatedList = printers.filter(p => p.id !== id);
      onUpdatePrinters(updatedList);
      onShowToast(`Đã xóa máy in "${name}"`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Panel Header & Summary banner */}
      <div className="bg-white border border-[#C5C6CD] p-5 sm:p-6 rounded-xl shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-[#57DFFE]/20 text-[#00687A] font-tech text-[10px] font-bold rounded border border-[#57DFFE]/40 uppercase tracking-widest">
                INKIRI 3D COST ENGINE v3.4
              </span>
              <span className="text-xs text-[#545F73]">Mô hình định giá theo chuẩn xưởng in 3D công nghiệp</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-[#091426] mt-1">
              Quản Trị Bảng Giá, Nhựa In, Máy In & Thông Số Tính Phí Xưởng
            </h2>
            <p className="text-xs text-[#545F73] mt-0.5">
              Cấu hình các biến số ảnh hưởng trực tiếp đến giá thành: Tiền nhựa, điện năng, khấu hao máy in, nhân công xử lý file/support, đóng gói và biên lợi nhuận.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleResetFormula}
              className="px-3 py-2 bg-white hover:bg-slate-100 border border-[#C5C6CD] text-[#091426] text-xs font-bold rounded transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">restart_alt</span>
              Khôi Phục Chuẩn Inkiri
            </button>
            <button
              onClick={handleSaveFormula}
              className="px-4 py-2 bg-[#00687A] hover:bg-[#00515F] text-white text-xs font-bold rounded transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">save</span>
              Lưu Toàn Bộ Cấu Hình
            </button>
          </div>
        </div>

        {/* Sub Navigation Bar */}
        <div className="flex border-b border-[#C5C6CD] gap-2 mt-6 pt-2 overflow-x-auto">
          <button
            onClick={() => setSubTab('formula')}
            className={`px-3 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              subTab === 'formula'
                ? 'border-[#00687A] text-[#00687A]'
                : 'border-transparent text-[#545F73] hover:text-[#091426]'
            }`}
          >
            <span className="material-symbols-outlined text-sm">calculate</span>
            1. Công Thức Tính Giá
          </button>

          <button
            onClick={() => setSubTab('materials')}
            className={`px-3 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              subTab === 'materials'
                ? 'border-[#00687A] text-[#00687A]'
                : 'border-transparent text-[#545F73] hover:text-[#091426]'
            }`}
          >
            <span className="material-symbols-outlined text-sm">layers</span>
            2. Nhựa In & Resin ({materials.length})
          </button>

          <button
            onClick={() => setSubTab('printers')}
            className={`px-3 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              subTab === 'printers'
                ? 'border-[#00687A] text-[#00687A]'
                : 'border-transparent text-[#545F73] hover:text-[#091426]'
            }`}
          >
            <span className="material-symbols-outlined text-sm">precision_manufacturing</span>
            3. Đội Máy In ({printers.length})
          </button>

          <button
            onClick={() => setSubTab('accessories')}
            className={`px-3 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              subTab === 'accessories'
                ? 'border-[#00687A] text-[#00687A]'
                : 'border-transparent text-[#545F73] hover:text-[#091426]'
            }`}
          >
            <span className="material-symbols-outlined text-sm">extension</span>
            4. Phụ Kiện & Đóng Gói ({accessories.length})
          </button>

          <button
            onClick={() => setSubTab('inventory')}
            className={`px-3 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              subTab === 'inventory'
                ? 'border-[#00687A] text-[#00687A]'
                : 'border-transparent text-[#545F73] hover:text-[#091426]'
            }`}
          >
            <span className="material-symbols-outlined text-sm">shelves</span>
            5. Kho & Vị Trí Kệ
          </button>

          <button
            onClick={() => setSubTab('estimator')}
            className={`px-3 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              subTab === 'estimator'
                ? 'border-[#00687A] text-[#00687A]'
                : 'border-transparent text-[#545F73] hover:text-[#091426]'
            }`}
          >
            <span className="material-symbols-outlined text-sm">receipt_long</span>
            6. Dự Toán BOM Kỹ Thuật & Báo Giá Xưởng
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: FORMULA & OPERATING RATES */}
      {subTab === 'formula' && (
        <form onSubmit={handleSaveFormula} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Section 1: Electricity & Energy */}
            <div className="bg-white border border-[#C5C6CD] p-5 rounded-xl space-y-4 shadow-xs">
              <div className="flex items-center gap-2 border-b border-[#C5C6CD] pb-3">
                <span className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-base">bolt</span>
                </span>
                <div>
                  <h3 className="font-bold text-sm text-[#091426]">1. Đơn Giá Điện Năng</h3>
                  <p className="text-[11px] text-[#545F73]">Điện sản xuất kinh doanh EVN</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#091426] mb-1">
                  Đơn giá điện (VNĐ / kWh)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1000"
                    step="50"
                    value={formulaForm.electricityRatePerKWh}
                    onChange={(e) => setFormulaForm({ ...formulaForm, electricityRatePerKWh: Number(e.target.value) })}
                    className="w-full bg-[#F8F9FF] border border-[#C5C6CD] rounded px-3 py-2 text-xs font-tech font-bold text-[#091426] focus:outline-hidden focus:border-[#00687A]"
                  />
                  <span className="absolute right-3 top-2 text-[11px] text-[#545F73] font-tech">VNĐ/kWh</span>
                </div>
                <p className="text-[10px] text-[#545F73] mt-1 italic">
                  * Công thức: Điện = Công suất máy (kW) × Giờ in (h) × Đơn giá điện
                </p>
              </div>

              <div className="pt-2 border-t border-[#C5C6CD]/60 space-y-3">
                <h4 className="font-bold text-xs text-[#091426] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-[#00687A]">inventory</span>
                  Đóng Gói & Quản Lý
                </h4>
                
                <div>
                  <label className="block text-[11px] text-[#545F73] mb-1">Phí đóng gói cố định / sp (VNĐ)</label>
                  <input
                    type="number"
                    step="500"
                    value={formulaForm.fixedPackagingCost}
                    onChange={(e) => setFormulaForm({ ...formulaForm, fixedPackagingCost: Number(e.target.value) })}
                    className="w-full bg-[#F8F9FF] border border-[#C5C6CD] rounded px-3 py-1.5 text-xs font-tech font-bold text-[#091426]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-[#545F73] mb-1">Phụ phí đóng gói in đa màu (VNĐ)</label>
                  <input
                    type="number"
                    step="500"
                    value={formulaForm.multiColorPackagingExtra}
                    onChange={(e) => setFormulaForm({ ...formulaForm, multiColorPackagingExtra: Number(e.target.value) })}
                    className="w-full bg-[#F8F9FF] border border-[#C5C6CD] rounded px-3 py-1.5 text-xs font-tech font-bold text-[#091426]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-[#545F73] mb-1">Chi phí quản lý mặt bằng xưởng / unit (VNĐ)</label>
                  <input
                    type="number"
                    step="1000"
                    value={formulaForm.overheadPerUnit}
                    onChange={(e) => setFormulaForm({ ...formulaForm, overheadPerUnit: Number(e.target.value) })}
                    className="w-full bg-[#F8F9FF] border border-[#C5C6CD] rounded px-3 py-1.5 text-xs font-tech font-bold text-[#091426]"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Labor & Technician Times */}
            <div className="bg-white border border-[#C5C6CD] p-5 rounded-xl space-y-4 shadow-xs">
              <div className="flex items-center gap-2 border-b border-[#C5C6CD] pb-3">
                <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-base">engineering</span>
                </span>
                <div>
                  <h3 className="font-bold text-sm text-[#091426]">2. Nhân Công & Quy Trình Kỹ Thuật</h3>
                  <p className="text-[11px] text-[#545F73]">Định mức công việc cho từng bước</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#091426] mb-1">
                  Mức lương kỹ thuật viên (VNĐ / giờ)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="1000"
                    value={formulaForm.laborHourlyRate}
                    onChange={(e) => setFormulaForm({ ...formulaForm, laborHourlyRate: Number(e.target.value) })}
                    className="w-full bg-[#F8F9FF] border border-[#C5C6CD] rounded px-3 py-2 text-xs font-tech font-bold text-[#091426] focus:outline-hidden focus:border-[#00687A]"
                  />
                  <span className="absolute right-3 top-2 text-[11px] text-[#545F73] font-tech">VNĐ/giờ</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] text-[#545F73] mb-1">Review file & Slicing (phút)</label>
                  <input
                    type="number"
                    min="0"
                    value={formulaForm.fileReviewLaborMinutes}
                    onChange={(e) => setFormulaForm({ ...formulaForm, fileReviewLaborMinutes: Number(e.target.value) })}
                    className="w-full bg-[#F8F9FF] border border-[#C5C6CD] rounded px-2.5 py-1.5 text-xs font-tech text-[#091426]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#545F73] mb-1">Setup máy & bàn in (phút)</label>
                  <input
                    type="number"
                    min="0"
                    value={formulaForm.setupLaborMinutes}
                    onChange={(e) => setFormulaForm({ ...formulaForm, setupLaborMinutes: Number(e.target.value) })}
                    className="w-full bg-[#F8F9FF] border border-[#C5C6CD] rounded px-2.5 py-1.5 text-xs font-tech text-[#091426]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#545F73] mb-1">Tách Support (phút)</label>
                  <input
                    type="number"
                    min="0"
                    value={formulaForm.supportRemovalMinutes}
                    onChange={(e) => setFormulaForm({ ...formulaForm, supportRemovalMinutes: Number(e.target.value) })}
                    className="w-full bg-[#F8F9FF] border border-[#C5C6CD] rounded px-2.5 py-1.5 text-xs font-tech text-[#091426]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#545F73] mb-1">Mài nhẵn Deburring (phút)</label>
                  <input
                    type="number"
                    min="0"
                    value={formulaForm.postProcessingLaborMinutes}
                    onChange={(e) => setFormulaForm({ ...formulaForm, postProcessingLaborMinutes: Number(e.target.value) })}
                    className="w-full bg-[#F8F9FF] border border-[#C5C6CD] rounded px-2.5 py-1.5 text-xs font-tech text-[#091426]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#545F73] mb-1">Đo kiểm QC dung sai (phút)</label>
                  <input
                    type="number"
                    min="0"
                    value={formulaForm.qcLaborMinutes}
                    onChange={(e) => setFormulaForm({ ...formulaForm, qcLaborMinutes: Number(e.target.value) })}
                    className="w-full bg-[#F8F9FF] border border-[#C5C6CD] rounded px-2.5 py-1.5 text-xs font-tech text-[#091426]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#545F73] mb-1">Đóng gói hoàn thiện (phút)</label>
                  <input
                    type="number"
                    min="0"
                    value={formulaForm.packagingLaborMinutes}
                    onChange={(e) => setFormulaForm({ ...formulaForm, packagingLaborMinutes: Number(e.target.value) })}
                    className="w-full bg-[#F8F9FF] border border-[#C5C6CD] rounded px-2.5 py-1.5 text-xs font-tech text-[#091426]"
                  />
                </div>
              </div>

              <div className="p-2.5 bg-blue-50/60 rounded border border-blue-200 text-[11px] text-blue-900 font-tech">
                Tổng nhân công: <strong>{totalLaborMins} phút</strong> / sản phẩm (~{Math.round((totalLaborMins / 60) * (formulaForm.laborHourlyRate || 65000)).toLocaleString()} đ)
              </div>
            </div>

            {/* Section 3: Risk Reserve, Markup & Fees */}
            <div className="bg-white border border-[#C5C6CD] p-5 rounded-xl space-y-4 shadow-xs">
              <div className="flex items-center gap-2 border-b border-[#C5C6CD] pb-3">
                <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-base">trending_up</span>
                </span>
                <div>
                  <h3 className="font-bold text-sm text-[#091426]">3. Dự Phòng Rủi Ro & Lợi Nhuận</h3>
                  <p className="text-[11px] text-[#545F73]">Tỉ lệ in hỏng, thuế & biên lợi nhuận</p>
                </div>
              </div>

              <div className="space-y-2.5">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-[#091426]">Lợi nhuận mục tiêu (Markup %)</span>
                    <span className="font-bold text-[#00687A] font-tech">{formulaForm.defaultMarkupPercent}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={formulaForm.defaultMarkupPercent}
                    onChange={(e) => setFormulaForm({ ...formulaForm, defaultMarkupPercent: Number(e.target.value) })}
                    className="w-full accent-[#00687A]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-[#545F73] mb-1">Dự phòng rủi ro in lỗi cơ bản (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={formulaForm.baseFailureReservePercent}
                    onChange={(e) => setFormulaForm({ ...formulaForm, baseFailureReservePercent: Number(e.target.value) })}
                    className="w-full bg-[#F8F9FF] border border-[#C5C6CD] rounded px-3 py-1.5 text-xs font-tech font-bold text-[#091426]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <label className="text-[#545F73] block mb-1">Mô hình khó &lt;80đ (%)</label>
                    <input
                      type="number"
                      value={formulaForm.lowPrintabilityExtraPercent}
                      onChange={(e) => setFormulaForm({ ...formulaForm, lowPrintabilityExtraPercent: Number(e.target.value) })}
                      className="w-full bg-[#F8F9FF] border border-[#C5C6CD] rounded px-2.5 py-1 text-xs font-tech text-[#091426]"
                    />
                  </div>
                  <div>
                    <label className="text-[#545F73] block mb-1">In nhiều màu AMS (%)</label>
                    <input
                      type="number"
                      value={formulaForm.multiColorExtraPercent}
                      onChange={(e) => setFormulaForm({ ...formulaForm, multiColorExtraPercent: Number(e.target.value) })}
                      className="w-full bg-[#F8F9FF] border border-[#C5C6CD] rounded px-2.5 py-1 text-xs font-tech text-[#091426]"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-[#C5C6CD]/60 space-y-2">
                  <div className="grid grid-cols-3 gap-2 text-[10px]">
                    <div>
                      <span className="text-[#545F73] block">Phí Platform</span>
                      <span className="font-bold font-tech text-xs text-[#091426]">{formulaForm.platformCommissionPercent}%</span>
                    </div>
                    <div>
                      <span className="text-[#545F73] block">Cổng TT</span>
                      <span className="font-bold font-tech text-xs text-[#091426]">{formulaForm.paymentGatewayFeePercent}%</span>
                    </div>
                    <div>
                      <span className="text-[#545F73] block">Bản quyền 3D</span>
                      <span className="font-bold font-tech text-xs text-[#091426]">{formulaForm.designerRoyaltyPercent}%</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-[#545F73] mb-1">Quy tắc làm tròn giá</label>
                    <select
                      value={formulaForm.roundingRule || '1000'}
                      onChange={(e) => setFormulaForm({ ...formulaForm, roundingRule: e.target.value as any })}
                      className="w-full bg-[#F8F9FF] border border-[#C5C6CD] rounded px-2.5 py-1.5 text-xs text-[#091426] font-medium"
                    >
                      <option value="1000">Làm tròn lên 1,000 đ (Khuyên dùng)</option>
                      <option value="5000">Làm tròn lên 5,000 đ</option>
                      <option value="10000">Làm tròn lên 10,000 đ</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Volume Discount Tiers */}
          <div className="bg-white border border-[#C5C6CD] p-5 rounded-xl space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#C5C6CD] pb-3">
              <div>
                <h3 className="font-bold text-sm text-[#091426]">4. Bảng Chiết Khấu Số Lượng (Volume Discount Tiers)</h3>
                <p className="text-xs text-[#545F73]">Tự động áp dụng mức giảm giá khi khách hàng đặt in số lượng lớn</p>
              </div>
              <button
                type="button"
                onClick={handleAddDiscountTier}
                className="px-3 py-1.5 bg-[#00687A] text-white hover:bg-[#00515F] text-xs font-bold rounded flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                Thêm Mốc Chiết Khấu
              </button>
            </div>

            <div className="responsive-table-wrapper">
              <table className="text-left text-xs font-sans">
                <thead className="bg-[#FAF9F5] border-b border-[#C5C6CD] text-[10px] text-[#545F73] uppercase tracking-wider">
                  <tr>
                    <th className="p-3">Số lượng tối thiểu (Min)</th>
                    <th className="p-3">Số lượng tối đa (Max)</th>
                    <th className="p-3">Mức giảm giá (%)</th>
                    <th className="p-3">Nhãn hiển thị khách hàng</th>
                    <th className="p-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#C5C6CD]/40">
                  {(formulaForm.volumeDiscounts || []).map((tier, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3">
                        <input
                          type="number"
                          min="1"
                          value={tier.minQty}
                          onChange={(e) => handleUpdateDiscountTier(idx, { ...tier, minQty: Number(e.target.value) })}
                          className="w-24 bg-[#F8F9FF] border border-[#C5C6CD] rounded px-2.5 py-1 text-xs font-tech font-bold text-[#091426]"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          placeholder="Không giới hạn"
                          value={tier.maxQty !== undefined ? tier.maxQty : ''}
                          onChange={(e) => handleUpdateDiscountTier(idx, { ...tier, maxQty: e.target.value ? Number(e.target.value) : undefined })}
                          className="w-28 bg-[#F8F9FF] border border-[#C5C6CD] rounded px-2.5 py-1 text-xs font-tech text-[#091426]"
                        />
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            max="70"
                            value={tier.discountPercent}
                            onChange={(e) => handleUpdateDiscountTier(idx, { ...tier, discountPercent: Number(e.target.value) })}
                            className="w-20 bg-[#F8F9FF] border border-[#C5C6CD] rounded px-2.5 py-1 text-xs font-tech font-bold text-emerald-700"
                          />
                          <span className="font-tech text-xs font-bold text-emerald-700">%</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <input
                          type="text"
                          value={tier.label}
                          onChange={(e) => handleUpdateDiscountTier(idx, { ...tier, label: e.target.value })}
                          className="w-full bg-[#F8F9FF] border border-[#C5C6CD] rounded px-2.5 py-1 text-xs text-[#091426]"
                        />
                      </td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveDiscountTier(idx)}
                          className="text-rose-600 hover:text-rose-800 p-1 rounded transition-colors cursor-pointer"
                          title="Xóa mốc"
                        >
                          <span className="material-symbols-outlined text-base">delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 5: Customization & Service Addon Fees */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-[#C5C6CD] p-5 rounded-xl space-y-4 shadow-xs">
              <div className="flex items-center gap-2 border-b border-[#C5C6CD] pb-3">
                <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-base">edit_note</span>
                </span>
                <div>
                  <h3 className="font-bold text-sm text-[#091426]">5. Phí Dịch Vụ Cá Nhân Hóa</h3>
                  <p className="text-[11px] text-[#545F73]">Khắc laser, đùn nổi & logo vector</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] text-[#545F73] mb-1">Phí khắc tên / Laser / Chữ nổi (VNĐ)</label>
                  <input
                    type="number"
                    step="5000"
                    value={formulaForm.customEngravingFee ?? 50000}
                    onChange={(e) => setFormulaForm({ ...formulaForm, customEngravingFee: Number(e.target.value) })}
                    className="w-full bg-[#F8F9FF] border border-[#C5C6CD] rounded px-3 py-1.5 text-xs font-tech font-bold text-[#091426]"
                  />
                  <p className="text-[10px] text-[#545F73] mt-1">Áp dụng khi khách yêu cầu khắc text cá nhân hóa trên sản phẩm</p>
                </div>

                <div>
                  <label className="block text-[11px] text-[#545F73] mb-1">Phí xử lý & Đùn Logo Doanh Nghiệp (VNĐ)</label>
                  <input
                    type="number"
                    step="5000"
                    value={formulaForm.customLogoUploadFee ?? 80000}
                    onChange={(e) => setFormulaForm({ ...formulaForm, customLogoUploadFee: Number(e.target.value) })}
                    className="w-full bg-[#F8F9FF] border border-[#C5C6CD] rounded px-3 py-1.5 text-xs font-tech font-bold text-[#091426]"
                  />
                  <p className="text-[10px] text-[#545F73] mt-1">Xử lý vector SVG/PNG sang dạng 3D dập nổi/chìm</p>
                </div>
              </div>
            </div>

            {/* Section 6: Delivery Packages Config */}
            <div className="bg-white border border-[#C5C6CD] p-5 rounded-xl space-y-4 shadow-xs">
              <div className="flex items-center gap-2 border-b border-[#C5C6CD] pb-3">
                <span className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-base">local_shipping</span>
                </span>
                <div>
                  <h3 className="font-bold text-sm text-[#091426]">6. Gói Giao Hàng & Hỏa Tốc</h3>
                  <p className="text-[11px] text-[#545F73]">Chiết khấu ghép khay & phụ phí gấp</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] text-[#545F73] mb-1">Chiết khấu Gói Tiết Kiệm (5-7 ngày) (%)</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="30"
                      value={formulaForm.economyDiscountPercent ?? 10}
                      onChange={(e) => setFormulaForm({ ...formulaForm, economyDiscountPercent: Number(e.target.value) })}
                      className="w-full bg-[#F8F9FF] border border-[#C5C6CD] rounded px-3 py-1.5 text-xs font-tech font-bold text-[#091426]"
                    />
                    <span className="absolute right-3 top-1.5 text-[11px] text-[#545F73] font-tech">%</span>
                  </div>
                  <p className="text-[10px] text-[#545F73] mt-1">Giảm giá cho khách chấp nhận chờ xưởng gom đủ mẻ in</p>
                </div>

                <div>
                  <label className="block text-[11px] text-[#545F73] mb-1">Phụ phí Gói Hỏa Tốc 24H (%)</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formulaForm.expressRushSurchargePercent ?? 30}
                      onChange={(e) => setFormulaForm({ ...formulaForm, expressRushSurchargePercent: Number(e.target.value) })}
                      className="w-full bg-[#F8F9FF] border border-[#C5C6CD] rounded px-3 py-1.5 text-xs font-tech font-bold text-[#091426]"
                    />
                    <span className="absolute right-3 top-1.5 text-[11px] text-[#545F73] font-tech">%</span>
                  </div>
                  <p className="text-[10px] text-[#545F73] mt-1">Phụ thu ưu tiên chen hàng vào máy và ca trực đêm</p>
                </div>
              </div>
            </div>

            {/* Section 7: Slicing Model Constants */}
            <div className="bg-white border border-[#C5C6CD] p-5 rounded-xl space-y-4 shadow-xs">
              <div className="flex items-center gap-2 border-b border-[#C5C6CD] pb-3">
                <span className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-base">tune</span>
                </span>
                <div>
                  <h3 className="font-bold text-sm text-[#091426]">7. Tham Số Slicing & Tháp Xả</h3>
                  <p className="text-[11px] text-[#545F73]">Hệ số tiêu hao support, brim & AMS</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] text-[#545F73] mb-1">Tỷ lệ Support (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={formulaForm.supportVolumeRatioPercent ?? 16}
                    onChange={(e) => setFormulaForm({ ...formulaForm, supportVolumeRatioPercent: Number(e.target.value) })}
                    className="w-full bg-[#F8F9FF] border border-[#C5C6CD] rounded px-2.5 py-1 text-xs font-tech font-bold text-[#091426]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#545F73] mb-1">Nhựa Brim/Raft (g)</label>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={formulaForm.brimRaftGrams ?? 6}
                    onChange={(e) => setFormulaForm({ ...formulaForm, brimRaftGrams: Number(e.target.value) })}
                    className="w-full bg-[#F8F9FF] border border-[#C5C6CD] rounded px-2.5 py-1 text-xs font-tech font-bold text-[#091426]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#545F73] mb-1">Purge tháp xả / màu (g)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formulaForm.multiColorPurgeWasteGrams ?? 28}
                    onChange={(e) => setFormulaForm({ ...formulaForm, multiColorPurgeWasteGrams: Number(e.target.value) })}
                    className="w-full bg-[#F8F9FF] border border-[#C5C6CD] rounded px-2.5 py-1 text-xs font-tech font-bold text-[#091426]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#545F73] mb-1">Đổi màu AMS (phút)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={formulaForm.multiColorToolChangeMins ?? 1.5}
                    onChange={(e) => setFormulaForm({ ...formulaForm, multiColorToolChangeMins: Number(e.target.value) })}
                    className="w-full bg-[#F8F9FF] border border-[#C5C6CD] rounded px-2.5 py-1 text-xs font-tech font-bold text-[#091426]"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="submit"
              className="px-6 py-2.5 bg-[#00687A] hover:bg-[#00515F] text-white font-bold text-xs uppercase tracking-wider rounded transition-colors shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">check_circle</span>
              Lưu Toàn Bộ Cấu Hình Công Thức
            </button>
          </div>
        </form>
      )}

      {/* SUB-TAB 2: MATERIALS CATALOG CRUD */}
      {subTab === 'materials' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#C5C6CD] p-4 sm:p-5 rounded-xl">
            <div>
              <h3 className="font-bold text-sm text-[#091426]">Danh Sách Nhựa & Vật Liệu Đang Quản Lý ({materials.length})</h3>
              <p className="text-xs text-[#545F73]">Quản lý giá nhập cuộn, đơn giá tính theo gram, thông số nhiệt độ đùn và tồn kho</p>
            </div>
            <button
              onClick={() => setIsNewMaterialOpen(true)}
              className="px-4 py-2 bg-[#00687A] hover:bg-[#00515F] text-white text-xs font-bold uppercase rounded flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              Thêm Vật Liệu Mới
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {materials.map((mat) => (
              <div key={mat.id} className="bg-white border border-[#C5C6CD] rounded-xl p-5 space-y-4 hover:shadow-md transition-shadow relative">
                <div className="flex items-start justify-between gap-2 border-b border-[#C5C6CD]/60 pb-3">
                  <div>
                    <span className="text-[10px] font-tech uppercase text-[#545F73] font-bold block">{mat.brand || 'Filament'}</span>
                    <h4 className="font-bold text-sm text-[#091426]">{mat.name}</h4>
                  </div>
                  <span className={`px-2 py-0.5 text-[9px] font-tech font-bold uppercase rounded ${
                    mat.inStock ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {mat.inStock ? `Còn hàng (${mat.stockRollsCount || 0} cuộn)` : 'Tạm hết'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-[#F8F9FF] p-2.5 rounded border border-[#C5C6CD]/40">
                    <span className="text-[10px] text-[#545F73] block uppercase">Giá Nhập / Kg</span>
                    <span className="font-bold text-sm text-[#091426] font-tech">
                      {(mat.costPerKg || mat.pricePerGram * 1000).toLocaleString()} đ
                    </span>
                  </div>
                  <div className="bg-[#E5EEFF] p-2.5 rounded border border-[#00687A]/20">
                    <span className="text-[10px] text-[#00687A] block uppercase font-bold">Giá Tính Khách / g</span>
                    <span className="font-bold text-sm text-[#00687A] font-tech">
                      {mat.pricePerGram.toLocaleString()} đ/g
                    </span>
                  </div>
                </div>

                <div className="space-y-1 text-xs text-[#545F73]">
                  <div className="flex justify-between">
                    <span>Khối lượng riêng (Density):</span>
                    <strong className="text-[#091426] font-tech">{mat.density} g/cm³</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Nhiệt độ đùn:</span>
                    <strong className="text-[#091426] font-tech">{mat.extruderTempMin || 200}°C - {mat.extruderTempMax || 220}°C</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Nhiệt độ bàn in:</span>
                    <strong className="text-[#091426] font-tech">{mat.bedTemp || 55}°C</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Chịu nhiệt / Độ bền:</span>
                    <strong className="text-[#091426]">{mat.heatResistance} / {mat.strength}</strong>
                  </div>
                </div>

                {mat.colors && mat.colors.length > 0 && (
                  <div className="flex items-center gap-1.5 pt-2 border-t border-[#C5C6CD]/40">
                    <span className="text-[10px] text-[#545F73]">Màu có sẵn:</span>
                    <div className="flex items-center gap-1">
                      {mat.colors.map((c, i) => (
                        <span key={i} className="w-3.5 h-3.5 rounded-full border border-black/20 shadow-xs" style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-[#C5C6CD]/40">
                  <button
                    onClick={() => setEditingMaterial({ ...mat })}
                    className="px-3 py-1.5 bg-[#F8F9FF] hover:bg-slate-200 border border-[#C5C6CD] text-[#091426] text-xs font-bold rounded flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">edit</span>
                    Sửa
                  </button>
                  <button
                    onClick={() => handleDeleteMaterial(mat.id, mat.name)}
                    className="px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 rounded text-xs transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: PRINTER FLEET CRUD */}
      {subTab === 'printers' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#C5C6CD] p-4 sm:p-5 rounded-xl">
            <div>
              <h3 className="font-bold text-sm text-[#091426]">Danh Sách Đội Máy In Công Nghiệp ({printers.length})</h3>
              <p className="text-xs text-[#545F73]">Khổ bàn in, công suất điện kW, khấu hao máy theo giờ và chi phí linh kiện thay thế</p>
            </div>
            <button
              onClick={() => setIsNewPrinterOpen(true)}
              className="px-4 py-2 bg-[#00687A] hover:bg-[#00515F] text-white text-xs font-bold uppercase rounded flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              Thêm Máy In Mới
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {printers.map((prn) => (
              <div key={prn.id} className="bg-white border border-[#C5C6CD] rounded-xl p-5 space-y-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-2 border-b border-[#C5C6CD]/60 pb-3">
                  <div>
                    <span className="text-[10px] font-tech uppercase text-[#545F73] font-bold block">{prn.brand} // {prn.technology}</span>
                    <h4 className="font-bold text-sm text-[#091426]">{prn.name}</h4>
                  </div>
                  <span className={`px-2 py-0.5 text-[9px] font-tech font-bold uppercase rounded ${
                    prn.status === 'Printing' ? 'bg-amber-100 text-amber-800 animate-pulse' :
                    prn.status === 'Idle' ? 'bg-emerald-100 text-emerald-800' :
                    'bg-slate-200 text-slate-700'
                  }`}>
                    {prn.status === 'Printing' ? 'Đang In' : prn.status === 'Idle' ? 'Sẵn Sàng' : 'Bảo Trì'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-[#F8F9FF] p-2.5 rounded border border-[#C5C6CD]/40">
                    <span className="text-[10px] text-[#545F73] block uppercase">Khổ Bàn In (X×Y×Z)</span>
                    <span className="font-bold text-sm text-[#091426] font-tech">
                      {prn.bedDimensions.x}×{prn.bedDimensions.y}×{prn.bedDimensions.z}
                    </span>
                    <span className="text-[10px] text-[#545F73] font-tech block">mm</span>
                  </div>
                  <div className="bg-[#F8F9FF] p-2.5 rounded border border-[#C5C6CD]/40">
                    <span className="text-[10px] text-[#545F73] block uppercase">Công Suất Điện</span>
                    <span className="font-bold text-sm text-[#091426] font-tech">
                      {prn.powerKW || 0.18} kW
                    </span>
                    <span className="text-[10px] text-amber-700 font-tech block">
                      ~{Math.round((prn.powerKW || 0.18) * (formulaForm.electricityRatePerKWh || 2850)).toLocaleString()} đ/h
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-[#545F73]">
                  <div className="flex justify-between">
                    <span>Giá trị đầu tư:</span>
                    <strong className="text-[#091426] font-tech">{(prn.acquisitionCost || 30000000).toLocaleString()} đ</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Tuổi thọ khấu hao:</span>
                    <strong className="text-[#091426] font-tech">{(prn.expectedLifetimeHours || 8000).toLocaleString()} giờ</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Hao mòn linh kiện / giờ:</span>
                    <strong className="text-[#091426] font-tech">{(prn.consumablesHourlyRate || 2500).toLocaleString()} đ/h</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Tốc độ in tối đa:</span>
                    <strong className="text-[#091426] font-tech">{prn.maxPrintSpeedMmS || 500} mm/s</strong>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2 border-t border-[#C5C6CD]/40 text-[11px]">
                  <span className={`inline-flex items-center gap-1 ${prn.hasEnclosure ? 'text-emerald-700' : 'text-slate-400'}`}>
                    <span className="material-symbols-outlined text-sm">{prn.hasEnclosure ? 'check_box' : 'check_box_outline_blank'}</span>
                    Buồng Kín
                  </span>
                  <span className={`inline-flex items-center gap-1 ${prn.hasAMS ? 'text-emerald-700' : 'text-slate-400'}`}>
                    <span className="material-symbols-outlined text-sm">{prn.hasAMS ? 'check_box' : 'check_box_outline_blank'}</span>
                    Bộ Đa Màu AMS
                  </span>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-[#C5C6CD]/40">
                  <button
                    onClick={() => setEditingPrinter({ ...prn })}
                    className="px-3 py-1.5 bg-[#F8F9FF] hover:bg-slate-200 border border-[#C5C6CD] text-[#091426] text-xs font-bold rounded flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">edit</span>
                    Sửa
                  </button>
                  <button
                    onClick={() => handleDeletePrinter(prn.id, prn.name)}
                    className="px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 rounded text-xs transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 4: ACCESSORIES & PACKAGING MANAGEMENT */}
      {subTab === 'accessories' && (
        <AccessoriesManager
          accessories={accessories}
          onUpdateAccessories={onUpdateAccessories}
          onShowToast={onShowToast}
        />
      )}

      {/* SUB-TAB 5: WAREHOUSE INVENTORY & STOCK MAPPING */}
      {subTab === 'inventory' && (
        <WarehouseInventoryPanel
          materials={materials}
          accessories={accessories}
          onUpdateMaterials={onUpdateMaterials}
          onUpdateAccessories={onUpdateAccessories}
          onShowToast={onShowToast}
        />
      )}

      {/* SUB-TAB 6: WORKSHOP ESTIMATOR & MANUFACTURING BOM */}
      {subTab === 'estimator' && (
        <WorkshopEstimatorBOM
          materials={materials}
          printers={printers}
          accessories={accessories}
          pricingConfig={formulaForm}
          onShowToast={onShowToast}
        />
      )}

      {/* NEW/EDIT MATERIAL MODAL */}
      {(isNewMaterialOpen || editingMaterial) && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 border border-[#C5C6CD] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#C5C6CD] pb-3">
              <h3 className="font-bold text-base text-[#091426]">
                {editingMaterial ? `Chỉnh Sửa Vật Liệu: ${editingMaterial.name}` : 'Thêm Vật Liệu In 3D Mới'}
              </h3>
              <button
                onClick={() => { setIsNewMaterialOpen(false); setEditingMaterial(null); }}
                className="text-[#545F73] hover:text-black cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <form onSubmit={editingMaterial ? handleSaveEditMaterial : handleSaveNewMaterial} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block font-semibold mb-1 text-[#091426]">Tên Vật Liệu *</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: PLA Tough Plus, PETG-CF, Resin High Temp..."
                    value={editingMaterial ? editingMaterial.name : materialForm.name}
                    onChange={(e) => editingMaterial ? setEditingMaterial({ ...editingMaterial, name: e.target.value }) : setMaterialForm({ ...materialForm, name: e.target.value })}
                    className="w-full bg-[#F8F9FF] border border-[#C5C6CD] rounded px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-[#091426]">Thương Hiệu</label>
                  <input
                    type="text"
                    value={editingMaterial ? (editingMaterial.brand || '') : (materialForm.brand || '')}
                    onChange={(e) => editingMaterial ? setEditingMaterial({ ...editingMaterial, brand: e.target.value }) : setMaterialForm({ ...materialForm, brand: e.target.value })}
                    className="w-full bg-[#F8F9FF] border border-[#C5C6CD] rounded px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-[#091426]">Khối Lượng Riêng (g/cm³)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingMaterial ? editingMaterial.density : materialForm.density}
                    onChange={(e) => editingMaterial ? setEditingMaterial({ ...editingMaterial, density: Number(e.target.value) }) : setMaterialForm({ ...materialForm, density: Number(e.target.value) })}
                    className="w-full bg-[#F8F9FF] border border-[#C5C6CD] rounded px-3 py-2 text-xs font-tech"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-[#091426]">Giá Nhập 1 Cuộn / Kg (VNĐ)</label>
                  <input
                    type="number"
                    step="5000"
                    value={editingMaterial ? editingMaterial.costPerKg : materialForm.costPerKg}
                    onChange={(e) => editingMaterial ? setEditingMaterial({ ...editingMaterial, costPerKg: Number(e.target.value) }) : setMaterialForm({ ...materialForm, costPerKg: Number(e.target.value) })}
                    className="w-full bg-[#F8F9FF] border border-[#C5C6CD] rounded px-3 py-2 text-xs font-tech font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-[#00687A]">Đơn Giá Tính Khách / Gram (VNĐ)</label>
                  <input
                    type="number"
                    step="50"
                    value={editingMaterial ? editingMaterial.pricePerGram : materialForm.pricePerGram}
                    onChange={(e) => editingMaterial ? setEditingMaterial({ ...editingMaterial, pricePerGram: Number(e.target.value) }) : setMaterialForm({ ...materialForm, pricePerGram: Number(e.target.value) })}
                    className="w-full bg-[#E5EEFF] border border-[#00687A]/30 rounded px-3 py-2 text-xs font-tech font-bold text-[#00687A]"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-[#091426]">Nhiệt Độ Đầu Đùn Min/Max (°C)</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      placeholder="200"
                      value={editingMaterial ? (editingMaterial.extruderTempMin || 200) : (materialForm.extruderTempMin || 200)}
                      onChange={(e) => editingMaterial ? setEditingMaterial({ ...editingMaterial, extruderTempMin: Number(e.target.value) }) : setMaterialForm({ ...materialForm, extruderTempMin: Number(e.target.value) })}
                      className="w-full bg-[#F8F9FF] border border-[#C5C6CD] rounded px-2 py-1.5 text-xs font-tech"
                    />
                    <span>-</span>
                    <input
                      type="number"
                      placeholder="230"
                      value={editingMaterial ? (editingMaterial.extruderTempMax || 220) : (materialForm.extruderTempMax || 220)}
                      onChange={(e) => editingMaterial ? setEditingMaterial({ ...editingMaterial, extruderTempMax: Number(e.target.value) }) : setMaterialForm({ ...materialForm, extruderTempMax: Number(e.target.value) })}
                      className="w-full bg-[#F8F9FF] border border-[#C5C6CD] rounded px-2 py-1.5 text-xs font-tech"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-[#091426]">Nhiệt Độ Bàn In (°C)</label>
                  <input
                    type="number"
                    value={editingMaterial ? (editingMaterial.bedTemp || 55) : (materialForm.bedTemp || 55)}
                    onChange={(e) => editingMaterial ? setEditingMaterial({ ...editingMaterial, bedTemp: Number(e.target.value) }) : setMaterialForm({ ...materialForm, bedTemp: Number(e.target.value) })}
                    className="w-full bg-[#F8F9FF] border border-[#C5C6CD] rounded px-3 py-2 text-xs font-tech"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-[#091426]">Tồn Kho (Cuộn)</label>
                  <input
                    type="number"
                    value={editingMaterial ? (editingMaterial.stockRollsCount || 0) : (materialForm.stockRollsCount || 0)}
                    onChange={(e) => editingMaterial ? setEditingMaterial({ ...editingMaterial, stockRollsCount: Number(e.target.value) }) : setMaterialForm({ ...materialForm, stockRollsCount: Number(e.target.value) })}
                    className="w-full bg-[#F8F9FF] border border-[#C5C6CD] rounded px-3 py-2 text-xs font-tech"
                  />
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="matStockCheck"
                    checked={editingMaterial ? editingMaterial.inStock : materialForm.inStock}
                    onChange={(e) => editingMaterial ? setEditingMaterial({ ...editingMaterial, inStock: e.target.checked }) : setMaterialForm({ ...materialForm, inStock: e.target.checked })}
                    className="w-4 h-4 rounded text-[#00687A]"
                  />
                  <label htmlFor="matStockCheck" className="font-semibold text-[#091426]">Đang Có Sẵn Hàng</label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-[#C5C6CD]">
                <button
                  type="button"
                  onClick={() => { setIsNewMaterialOpen(false); setEditingMaterial(null); }}
                  className="px-4 py-2 border border-[#C5C6CD] rounded text-[#091426] hover:bg-slate-100 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#00687A] text-white font-bold rounded hover:bg-[#00515F] cursor-pointer"
                >
                  Lưu Vật Liệu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NEW/EDIT PRINTER MODAL */}
      {(isNewPrinterOpen || editingPrinter) && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 border border-[#C5C6CD] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#C5C6CD] pb-3">
              <h3 className="font-bold text-base text-[#091426]">
                {editingPrinter ? `Chỉnh Sửa Máy In: ${editingPrinter.name}` : 'Thêm Máy In Mới Vào Đội Máy'}
              </h3>
              <button
                onClick={() => { setIsNewPrinterOpen(false); setEditingPrinter(null); }}
                className="text-[#545F73] hover:text-black cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <form onSubmit={editingPrinter ? handleSaveEditPrinter : handleSaveNewPrinter} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block font-semibold mb-1 text-[#091426]">Tên Máy In *</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Bambu Lab X1-Carbon AMS, Creality K1 Max..."
                    value={editingPrinter ? editingPrinter.name : printerForm.name}
                    onChange={(e) => editingPrinter ? setEditingPrinter({ ...editingPrinter, name: e.target.value }) : setPrinterForm({ ...printerForm, name: e.target.value })}
                    className="w-full bg-[#F8F9FF] border border-[#C5C6CD] rounded px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-[#091426]">Hãng Sản Xuất</label>
                  <input
                    type="text"
                    value={editingPrinter ? editingPrinter.brand : printerForm.brand}
                    onChange={(e) => editingPrinter ? setEditingPrinter({ ...editingPrinter, brand: e.target.value }) : setPrinterForm({ ...printerForm, brand: e.target.value })}
                    className="w-full bg-[#F8F9FF] border border-[#C5C6CD] rounded px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-[#091426]">Công Nghệ In</label>
                  <select
                    value={editingPrinter ? editingPrinter.technology : printerForm.technology}
                    onChange={(e) => editingPrinter ? setEditingPrinter({ ...editingPrinter, technology: e.target.value as any }) : setPrinterForm({ ...printerForm, technology: e.target.value as any })}
                    className="w-full bg-[#F8F9FF] border border-[#C5C6CD] rounded px-3 py-2 text-xs"
                  >
                    <option value="FDM">FDM / FFF (Đùn nhựa)</option>
                    <option value="SLA">SLA / DLP (Quang trùng hợp Resin)</option>
                    <option value="SLS">SLS (Thiêu kết bột)</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block font-semibold mb-1 text-[#091426]">Khổ Bàn In X × Y × Z (mm)</label>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="number"
                      placeholder="X (256)"
                      value={editingPrinter ? editingPrinter.bedDimensions.x : printerForm.bedDimensions?.x}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (editingPrinter) {
                          setEditingPrinter({ ...editingPrinter, bedDimensions: { ...editingPrinter.bedDimensions, x: val } });
                        } else {
                          setPrinterForm({ ...printerForm, bedDimensions: { ...(printerForm.bedDimensions || { x: 256, y: 256, z: 256 }), x: val } });
                        }
                      }}
                      className="w-full bg-[#F8F9FF] border border-[#C5C6CD] rounded px-2.5 py-1.5 text-xs font-tech"
                    />
                    <input
                      type="number"
                      placeholder="Y (256)"
                      value={editingPrinter ? editingPrinter.bedDimensions.y : printerForm.bedDimensions?.y}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (editingPrinter) {
                          setEditingPrinter({ ...editingPrinter, bedDimensions: { ...editingPrinter.bedDimensions, y: val } });
                        } else {
                          setPrinterForm({ ...printerForm, bedDimensions: { ...(printerForm.bedDimensions || { x: 256, y: 256, z: 256 }), y: val } });
                        }
                      }}
                      className="w-full bg-[#F8F9FF] border border-[#C5C6CD] rounded px-2.5 py-1.5 text-xs font-tech"
                    />
                    <input
                      type="number"
                      placeholder="Z (256)"
                      value={editingPrinter ? editingPrinter.bedDimensions.z : printerForm.bedDimensions?.z}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (editingPrinter) {
                          setEditingPrinter({ ...editingPrinter, bedDimensions: { ...editingPrinter.bedDimensions, z: val } });
                        } else {
                          setPrinterForm({ ...printerForm, bedDimensions: { ...(printerForm.bedDimensions || { x: 256, y: 256, z: 256 }), z: val } });
                        }
                      }}
                      className="w-full bg-[#F8F9FF] border border-[#C5C6CD] rounded px-2.5 py-1.5 text-xs font-tech"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-[#091426]">Công Suất Điện (kW)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingPrinter ? editingPrinter.powerKW : printerForm.powerKW}
                    onChange={(e) => editingPrinter ? setEditingPrinter({ ...editingPrinter, powerKW: Number(e.target.value) }) : setPrinterForm({ ...printerForm, powerKW: Number(e.target.value) })}
                    className="w-full bg-[#F8F9FF] border border-[#C5C6CD] rounded px-3 py-2 text-xs font-tech font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-[#091426]">Giá Trị Đầu Tư Máy (VNĐ)</label>
                  <input
                    type="number"
                    step="1000000"
                    value={editingPrinter ? editingPrinter.acquisitionCost : printerForm.acquisitionCost}
                    onChange={(e) => editingPrinter ? setEditingPrinter({ ...editingPrinter, acquisitionCost: Number(e.target.value) }) : setPrinterForm({ ...printerForm, acquisitionCost: Number(e.target.value) })}
                    className="w-full bg-[#F8F9FF] border border-[#C5C6CD] rounded px-3 py-2 text-xs font-tech font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-[#091426]">Tuổi Thọ Khấu Hao (Giờ)</label>
                  <input
                    type="number"
                    step="500"
                    value={editingPrinter ? editingPrinter.expectedLifetimeHours : printerForm.expectedLifetimeHours}
                    onChange={(e) => editingPrinter ? setEditingPrinter({ ...editingPrinter, expectedLifetimeHours: Number(e.target.value) }) : setPrinterForm({ ...printerForm, expectedLifetimeHours: Number(e.target.value) })}
                    className="w-full bg-[#F8F9FF] border border-[#C5C6CD] rounded px-3 py-2 text-xs font-tech"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-[#091426]">Hao Mòn Vật Tư / Giờ (VNĐ)</label>
                  <input
                    type="number"
                    step="500"
                    value={editingPrinter ? editingPrinter.consumablesHourlyRate : printerForm.consumablesHourlyRate}
                    onChange={(e) => editingPrinter ? setEditingPrinter({ ...editingPrinter, consumablesHourlyRate: Number(e.target.value) }) : setPrinterForm({ ...printerForm, consumablesHourlyRate: Number(e.target.value) })}
                    className="w-full bg-[#F8F9FF] border border-[#C5C6CD] rounded px-3 py-2 text-xs font-tech font-bold"
                  />
                </div>

                <div className="flex items-center gap-4 col-span-2 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingPrinter ? editingPrinter.hasEnclosure : printerForm.hasEnclosure}
                      onChange={(e) => editingPrinter ? setEditingPrinter({ ...editingPrinter, hasEnclosure: e.target.checked }) : setPrinterForm({ ...printerForm, hasEnclosure: e.target.checked })}
                      className="w-4 h-4 rounded text-[#00687A]"
                    />
                    <span className="font-semibold text-[#091426]">Có Buồng Kín Giữ Nhiệt</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingPrinter ? editingPrinter.hasAMS : printerForm.hasAMS}
                      onChange={(e) => editingPrinter ? setEditingPrinter({ ...editingPrinter, hasAMS: e.target.checked }) : setPrinterForm({ ...printerForm, hasAMS: e.target.checked })}
                      className="w-4 h-4 rounded text-[#00687A]"
                    />
                    <span className="font-semibold text-[#091426]">Có Bộ Đổi Màu Tự Động AMS</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-[#C5C6CD]">
                <button
                  type="button"
                  onClick={() => { setIsNewPrinterOpen(false); setEditingPrinter(null); }}
                  className="px-4 py-2 border border-[#C5C6CD] rounded text-[#091426] hover:bg-slate-100 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#00687A] text-white font-bold rounded hover:bg-[#00515F] cursor-pointer"
                >
                  Lưu Máy In
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
