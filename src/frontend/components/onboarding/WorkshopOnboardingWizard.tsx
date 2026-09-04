import React, { useState, useMemo } from 'react';
import {
  Printer,
  Sparkles,
  Zap,
  Clock,
  Coins,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Building2,
  MapPin,
  Phone,
  Mail,
  Layers,
  HelpCircle,
  Check,
  Info
} from 'lucide-react';
import {
  WorkshopProfile,
  WorkshopMachine,
  WorkshopMaterial
} from '../../types';

export interface WorkshopOnboardingWizardProps {
  initialData?: Partial<WorkshopProfile>;
  onComplete?: (data: {
    workshop: WorkshopProfile;
    machines: WorkshopMachine[];
    materials: WorkshopMaterial[];
  }) => void;
  onCancel?: () => void;
  onNavigate?: (screen: string, payload?: any) => void;
  onShowToast?: (message: string) => void;
}

// Preset popular 3D printers with accurate industry specifications
export interface PrinterPreset {
  id: string;
  name: string;
  brand: string;
  technology: 'FDM' | 'SLA' | 'SLS';
  avgPowerKW: number;
  purchasePrice: number;
  lifetimeHours: number;
  buildVolumeMm: { x: number; y: number; z: number };
  badge?: string;
  description: string;
}

const POPULAR_PRINTER_PRESETS: PrinterPreset[] = [
  {
    id: 'bambu-x1c',
    name: 'Bambu Lab X1-Carbon Combo',
    brand: 'Bambu Lab',
    technology: 'FDM',
    avgPowerKW: 0.18,
    purchasePrice: 35000000,
    lifetimeHours: 10000,
    buildVolumeMm: { x: 256, y: 256, z: 256 },
    badge: 'Phổ biến nhất',
    description: 'Tốc độ 500mm/s, hỗ trợ đa màu AMS, camera AI chống spaghetti.'
  },
  {
    id: 'bambu-p1s',
    name: 'Bambu Lab P1S Combo',
    brand: 'Bambu Lab',
    technology: 'FDM',
    avgPowerKW: 0.16,
    purchasePrice: 19500000,
    lifetimeHours: 8000,
    buildVolumeMm: { x: 256, y: 256, z: 256 },
    badge: 'Hiệu năng cao',
    description: 'Buồng kín in ABS/PETG ổn định, giá thành đầu tư tối ưu cho hub.'
  },
  {
    id: 'creality-k1-max',
    name: 'Creality K1 Max',
    brand: 'Creality',
    technology: 'FDM',
    avgPowerKW: 0.22,
    purchasePrice: 21000000,
    lifetimeHours: 7000,
    buildVolumeMm: { x: 300, y: 300, z: 300 },
    badge: 'Khổ lớn 300mm',
    description: 'Bàn in 300x300x300mm, lidar kép tự cân bàn, sấy buồng chủ động.'
  },
  {
    id: 'elegoo-saturn-4',
    name: 'Elegoo Saturn 4 Ultra 12K',
    brand: 'Elegoo',
    technology: 'SLA',
    avgPowerKW: 0.12,
    purchasePrice: 13500000,
    lifetimeHours: 5000,
    buildVolumeMm: { x: 218, y: 122, z: 220 },
    badge: 'Độ nét cao 12K',
    description: 'Công nghệ màn hình 12K Mono LCD, cảm biến tự cân bằng Tilt Release.'
  },
  {
    id: 'anycubic-kobra-2-plus',
    name: 'Anycubic Kobra 2 Plus',
    brand: 'Anycubic',
    technology: 'FDM',
    avgPowerKW: 0.20,
    purchasePrice: 10500000,
    lifetimeHours: 6000,
    buildVolumeMm: { x: 300, y: 300, z: 350 },
    badge: 'Tiết kiệm vốn',
    description: 'Tốc độ 500mm/s, khổ in cao 350mm, chi phí khấu hao thấp.'
  },
  {
    id: 'formlabs-form-4',
    name: 'Formlabs Form 4 SLA',
    brand: 'Formlabs',
    technology: 'SLA',
    avgPowerKW: 0.22,
    purchasePrice: 85000000,
    lifetimeHours: 12000,
    buildVolumeMm: { x: 200, y: 125, z: 210 },
    badge: 'Công nghiệp y tế',
    description: 'Độ chính xác cấp công nghiệp, hỗ trợ resin kỹ thuật cao Tough/Rigid.'
  }
];

const PRESET_MATERIAL_PALETTE = [
  { name: 'Đen Titan', hex: '#1E1E1E' },
  { name: 'Trắng Sứ', hex: '#F8FAFC' },
  { name: 'Xám Cơ Khí', hex: '#64748B' },
  { name: 'Đỏ Ferrari', hex: '#EF4444' },
  { name: 'Xanh VCUBE', hex: '#00687A' },
  { name: 'Vàng Cam Amber', hex: '#F59E0B' },
  { name: 'Xanh Lá Olive', hex: '#10B981' },
  { name: 'Trong Suốt', hex: '#CBD5E1' }
];

export const WorkshopOnboardingWizard: React.FC<WorkshopOnboardingWizardProps> = ({
  initialData,
  onComplete,
  onCancel,
  onNavigate,
  onShowToast
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // -------------------------------------------------------------
  // Step 1: Workshop Information
  // -------------------------------------------------------------
  const [workshopName, setWorkshopName] = useState(initialData?.workshopName || 'Xưởng In 3D Kỹ Thuật Số Hub');
  const [contactPerson, setContactPerson] = useState('Nguyễn Văn Tuấn (Kỹ sư)');
  const [contactPhone, setContactPhone] = useState(initialData?.contactPhone || '0988 123 456');
  const [contactEmail, setContactEmail] = useState(initialData?.contactEmail || 'workshop@vcube.vn');
  const [address, setAddress] = useState(initialData?.address || '128 Đường Xuân Thủy, Cầu Giấy, Hà Nội');
  const [region, setRegion] = useState<'Bắc' | 'Trung' | 'Nam'>((initialData?.region as any) || 'Bắc');
  const [electricityRate, setElectricityRate] = useState<number>(2850); // VND/kWh (VN commercial average)

  // -------------------------------------------------------------
  // Step 2: Machines Declaration
  // -------------------------------------------------------------
  const [machines, setMachines] = useState<WorkshopMachine[]>([
    {
      id: `mch-${Date.now()}-1`,
      workshopId: 'ws-pending',
      machineName: 'Bambu Lab X1-Carbon #01',
      machineType: 'FDM',
      avgPowerKW: 0.18,
      purchasePrice: 35000000,
      lifetimeHours: 10000,
      status: 'Free',
      buildVolumeMm: { x: 256, y: 256, z: 256 }
    }
  ]);

  // Temporary state for adding/editing a machine
  const [isAddingMachine, setIsAddingMachine] = useState(false);
  const [tempMachineName, setTempMachineName] = useState('');
  const [tempMachineType, setTempMachineType] = useState<'FDM' | 'SLA' | 'SLS'>('FDM');
  const [tempAvgPowerKW, setTempAvgPowerKW] = useState<number>(0.18);
  const [tempPurchasePrice, setTempPurchasePrice] = useState<number>(35000000);
  const [tempLifetimeHours, setTempLifetimeHours] = useState<number>(10000);
  const [tempVolumeX, setTempVolumeX] = useState<number>(256);
  const [tempVolumeY, setTempVolumeY] = useState<number>(256);
  const [tempVolumeZ, setTempVolumeZ] = useState<number>(256);

  // -------------------------------------------------------------
  // Step 3: Material Inventory Declaration
  // -------------------------------------------------------------
  const [materials, setMaterials] = useState<WorkshopMaterial[]>([
    {
      id: `mat-${Date.now()}-1`,
      workshopId: 'ws-pending',
      materialName: 'eSUN PLA+ Đen Mờ High-Speed',
      materialType: 'PLA',
      pricePerKg: 250000,
      colorHex: '#1E1E1E',
      colorName: 'Đen Titan',
      density: 1.24,
      stockStatus: 'Tracking',
      currentStockGrams: 5000,
      lowStockThresholdGrams: 1000
    },
    {
      id: `mat-${Date.now()}-2`,
      workshopId: 'ws-pending',
      materialName: 'Bambu Lab PETG Basic Trắng Sứ',
      materialType: 'PETG',
      pricePerKg: 290000,
      colorHex: '#F8FAFC',
      colorName: 'Trắng Sứ',
      density: 1.27,
      stockStatus: 'Tracking',
      currentStockGrams: 3000,
      lowStockThresholdGrams: 1000
    }
  ]);

  // Temporary state for adding a material
  const [isAddingMaterial, setIsAddingMaterial] = useState(false);
  const [tempMaterialName, setTempMaterialName] = useState('');
  const [tempMaterialType, setTempMaterialType] = useState<WorkshopMaterial['materialType']>('PLA');
  const [tempPricePerKg, setTempPricePerKg] = useState<number>(260000);
  const [tempStockGrams, setTempStockGrams] = useState<number>(3000);
  const [tempColorHex, setTempColorHex] = useState('#1E1E1E');
  const [tempColorName, setTempColorName] = useState('Đen Titan');

  // Submission Status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedProfile, setSubmittedProfile] = useState<WorkshopProfile | null>(null);

  // Calculations for preview in Step 2
  const currentDepreciationPerHour = useMemo(() => {
    if (!tempLifetimeHours || tempLifetimeHours <= 0) return 0;
    return Math.round(tempPurchasePrice / tempLifetimeHours);
  }, [tempPurchasePrice, tempLifetimeHours]);

  const currentElectricityPerHour = useMemo(() => {
    return Math.round(tempAvgPowerKW * electricityRate);
  }, [tempAvgPowerKW, electricityRate]);

  const currentTotalMachinePerHour = useMemo(() => {
    return currentDepreciationPerHour + currentElectricityPerHour;
  }, [currentDepreciationPerHour, currentElectricityPerHour]);

  // Load a preset machine into the editor form
  const handleSelectPreset = (preset: PrinterPreset) => {
    setTempMachineName(`${preset.name} #0${machines.length + 1}`);
    setTempMachineType(preset.technology);
    setTempAvgPowerKW(preset.avgPowerKW);
    setTempPurchasePrice(preset.purchasePrice);
    setTempLifetimeHours(preset.lifetimeHours);
    setTempVolumeX(preset.buildVolumeMm.x);
    setTempVolumeY(preset.buildVolumeMm.y);
    setTempVolumeZ(preset.buildVolumeMm.z);
    setIsAddingMachine(true);
  };

  const handleSaveMachine = () => {
    if (!tempMachineName.trim()) {
      onShowToast?.('Vui lòng nhập tên nhận diện cho máy in!');
      return;
    }
    const newMachine: WorkshopMachine = {
      id: `mch-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      workshopId: 'ws-pending',
      machineName: tempMachineName.trim(),
      machineType: tempMachineType,
      avgPowerKW: Number(tempAvgPowerKW) || 0.18,
      purchasePrice: Number(tempPurchasePrice) || 20000000,
      lifetimeHours: Number(tempLifetimeHours) || 8000,
      status: 'Free',
      buildVolumeMm: {
        x: Number(tempVolumeX) || 256,
        y: Number(tempVolumeY) || 256,
        z: Number(tempVolumeZ) || 256
      }
    };
    setMachines(prev => [...prev, newMachine]);
    setIsAddingMachine(false);
    onShowToast?.(`Đã thêm máy "${newMachine.machineName}" vào danh sách!`);
  };

  const handleRemoveMachine = (id: string) => {
    if (machines.length <= 1) {
      onShowToast?.('Xưởng cần tối thiểu 01 máy in để tham gia mạng lưới MES!');
      return;
    }
    setMachines(prev => prev.filter(m => m.id !== id));
  };

  const handleSaveMaterial = () => {
    if (!tempMaterialName.trim()) {
      onShowToast?.('Vui lòng nhập tên cuộn nhựa hoặc loại vật liệu!');
      return;
    }
    const newMaterial: WorkshopMaterial = {
      id: `mat-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      workshopId: 'ws-pending',
      materialName: tempMaterialName.trim(),
      materialType: tempMaterialType,
      pricePerKg: Number(tempPricePerKg) || 250000,
      colorHex: tempColorHex,
      colorName: tempColorName,
      density: tempMaterialType === 'PLA' ? 1.24 : tempMaterialType === 'PETG' ? 1.27 : 1.05,
      stockStatus: 'Tracking',
      currentStockGrams: Number(tempStockGrams) || 1000,
      lowStockThresholdGrams: 1000
    };
    setMaterials(prev => [...prev, newMaterial]);
    setIsAddingMaterial(false);
    setTempMaterialName('');
    onShowToast?.(`Đã thêm ${newMaterial.materialName} vào kho phôi ban đầu!`);
  };

  const handleRemoveMaterial = (id: string) => {
    if (materials.length <= 1) {
      onShowToast?.('Cần tối thiểu 01 loại nhựa tồn kho để tiếp nhận đơn in!');
      return;
    }
    setMaterials(prev => prev.filter(m => m.id !== id));
  };

  // Submit the entire onboarding profile
  const handleSubmitOnboarding = () => {
    if (!workshopName.trim()) {
      onShowToast?.('Vui lòng nhập tên xưởng in!');
      setCurrentStep(1);
      return;
    }
    if (machines.length === 0) {
      onShowToast?.('Vui lòng khai báo tối thiểu 1 máy in!');
      setCurrentStep(2);
      return;
    }
    if (materials.length === 0) {
      onShowToast?.('Vui lòng khai báo tối thiểu 1 loại nhựa tồn kho!');
      setCurrentStep(3);
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      const generatedId = `ws-${Date.now().toString().slice(-6)}`;
      const newWorkshop: WorkshopProfile = {
        id: generatedId,
        workshopName: workshopName.trim(),
        address: address.trim(),
        region: region,
        totalMachines: machines.length,
        activeMachinesNow: machines.length,
        electricityRateOverride: electricityRate,
        laborRateOverride: 65000,
        verifiedStatus: 'Pending', // Mandatory requirement
        contactPhone: contactPhone.trim(),
        contactEmail: contactEmail.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const updatedMachines = machines.map(m => ({ ...m, workshopId: generatedId }));
      const updatedMaterials = materials.map(m => ({ ...m, workshopId: generatedId }));

      // Save to localStorage for seamless persistence
      try {
        localStorage.setItem('vcube_workshop_profile', JSON.stringify(newWorkshop));
        localStorage.setItem('vcube_workshop_machines', JSON.stringify(updatedMachines));
        localStorage.setItem('vcube_workshop_materials', JSON.stringify(updatedMaterials));
      } catch (err) {
        console.warn('Could not save to localStorage:', err);
      }

      setSubmittedProfile(newWorkshop);
      setIsSubmitting(false);
      setCurrentStep(4); // Success step

      if (onComplete) {
        onComplete({
          workshop: newWorkshop,
          machines: updatedMachines,
          materials: updatedMaterials
        });
      }
      onShowToast?.('Đã gửi hồ sơ xưởng in thành công! Trạng thái đang chờ Quản trị viên duyệt.');
    }, 900);
  };

  return (
    <div className="w-full max-w-5xl mx-auto my-6 px-4 font-sans text-slate-800">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
        <div className="bg-gradient-to-r from-[#00687A] via-[#0284C7] to-[#0369A1] p-6 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
              <Printer className="w-8 h-8 text-cyan-200" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-300/30 text-xs font-semibold text-cyan-100 mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                MES Hub Onboarding Wizard
              </div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight">
                Đăng Ký Đối Tác Xưởng In 3D (MES Partner)
              </h1>
              <p className="text-sm text-cyan-100/90 mt-0.5">
                Gia nhập mạng lưới điều phối gia công Geo-Dispatcher toàn quốc của VCUBE
              </p>
            </div>
          </div>

          {currentStep < 4 && (
            <div className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-xl border border-white/10 text-xs text-cyan-100">
              <Clock className="w-4 h-4 text-cyan-300" />
              <span>Thời gian hoàn tất: ~3 phút</span>
            </div>
          )}
        </div>

        {/* Progress Step Bar */}
        {currentStep < 4 && (
          <div className="grid grid-cols-3 border-b border-slate-200 bg-slate-50/80">
            {[
              { step: 1, label: 'Thông Tin Xưởng', sub: 'Địa chỉ & Geo-Dispatcher', icon: Building2 },
              { step: 2, label: 'Khai Báo Máy In', sub: 'Công suất & Khấu hao', icon: Printer },
              { step: 3, label: 'Nhựa Tồn Kho', sub: 'Loại nhựa & Giá nhập', icon: Layers }
            ].map(item => {
              const Icon = item.icon;
              const isActive = currentStep === item.step;
              const isCompleted = currentStep > item.step;
              return (
                <div
                  key={item.step}
                  onClick={() => {
                    if (isCompleted) setCurrentStep(item.step as any);
                  }}
                  className={`p-4 flex items-center gap-3 transition-colors ${
                    isCompleted ? 'cursor-pointer hover:bg-emerald-50/60' : ''
                  } ${isActive ? 'bg-white border-b-2 border-[#00687A]' : ''}`}
                >
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                      isCompleted
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : isActive
                        ? 'bg-[#00687A] text-white shadow-sm'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {isCompleted ? <Check className="w-5 h-5" /> : item.step}
                  </div>
                  <div className="hidden sm:block">
                    <div className={`text-xs font-bold uppercase tracking-wider ${isActive ? 'text-[#00687A]' : 'text-slate-600'}`}>
                      {item.label}
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium">{item.sub}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* STEP 1: Workshop Information */}
      {/* ========================================================================= */}
      {currentStep === 1 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#00687A]" />
              Bước 1: Khai báo thông tin cơ sở sản xuất & Khu vực địa lý
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Hệ thống Geo-Dispatcher của VCUBE sử dụng khu vực này để tự động phân luồng đơn hàng gần nhất, giúp giảm thời gian giao hàng xuống dưới 24h.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Workshop Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                Tên Xưởng In / Hub Gia Công <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={workshopName}
                onChange={e => setWorkshopName(e.target.value)}
                placeholder="VD: FabLab CNC & 3D Printing Cầu Giấy"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#00687A]/30 focus:border-[#00687A] text-sm"
              />
              <span className="text-[11px] text-slate-400">Tên thương hiệu xưởng sẽ hiển thị trên tem đóng gói bưu phẩm</span>
            </div>

            {/* Contact Person */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                Kỹ Sư Trưởng / Người Phụ Trách <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={contactPerson}
                onChange={e => setContactPerson(e.target.value)}
                placeholder="VD: KS. Nguyễn Văn Tuấn"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#00687A]/30 focus:border-[#00687A] text-sm"
              />
            </div>

            {/* Hotline Phone */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                Số Điện Thoại Điều Phối Hotline <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={contactPhone}
                onChange={e => setContactPhone(e.target.value)}
                placeholder="VD: 0988 123 456"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#00687A]/30 focus:border-[#00687A] text-sm"
              />
              <span className="text-[11px] text-slate-400">Nhận thông báo đơn hàng hỏa tốc qua Zalo / SMS</span>
            </div>

            {/* Contact Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                Email Kỹ Thuật Tiếp Nhận File 3D <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={e => setContactEmail(e.target.value)}
                placeholder="VD: tech@xuongin3d.vn"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#00687A]/30 focus:border-[#00687A] text-sm"
              />
            </div>
          </div>

          {/* Full Address */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              Địa Chỉ Chi Tiết Xưởng In <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="Số nhà, ngõ/đường, Phường/Xã, Quận/Huyện, Tỉnh/TP"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#00687A]/30 focus:border-[#00687A] text-sm"
            />
          </div>

          {/* Geo-Dispatcher Region Selection */}
          <div className="space-y-2 pt-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-500" />
              Khu Vực Phục Vụ (Thuật toán Geo-Dispatcher Bắc / Trung / Nam) <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  id: 'Bắc',
                  title: 'Miền Bắc (Hub Hà Nội)',
                  desc: 'Hà Nội, Hải Phòng, Bắc Ninh, Quảng Ninh...',
                  tag: 'Giao 2-4h nội thành'
                },
                {
                  id: 'Trung',
                  title: 'Miền Trung (Hub Đà Nẵng)',
                  desc: 'Đà Nẵng, Huế, Quảng Nam, Quảng Ngãi...',
                  tag: 'Giao 24h liên tỉnh'
                },
                {
                  id: 'Nam',
                  title: 'Miền Nam (Hub TP.HCM)',
                  desc: 'TP.HCM, Bình Dương, Đồng Nai, Long An...',
                  tag: 'Giao 2-4h nội thành'
                }
              ].map(item => {
                const isSel = region === item.id;
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => setRegion(item.id as any)}
                    className={`p-4 rounded-xl border-2 text-left transition-all relative ${
                      isSel
                        ? 'border-[#00687A] bg-teal-50/50 shadow-sm ring-2 ring-[#00687A]/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm text-slate-900">{item.title}</span>
                      {isSel && (
                        <div className="w-5 h-5 rounded-full bg-[#00687A] text-white flex items-center justify-center">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2">{item.desc}</p>
                    <div className="mt-2 inline-block px-2 py-0.5 rounded bg-slate-100 text-[10px] font-semibold text-slate-600">
                      {item.tag}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Electricity base rate */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">Đơn giá điện cơ sở của xưởng (VND/kWh)</h4>
                <p className="text-xs text-slate-500">Dùng để tính tiền điện theo giờ in thực tế của từng máy in</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={electricityRate}
                onChange={e => setElectricityRate(Number(e.target.value) || 2850)}
                className="w-28 px-3 py-1.5 rounded-lg border border-slate-300 text-right font-bold text-sm"
              />
              <span className="text-xs font-semibold text-slate-600">đ/kWh</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            {onCancel ? (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 transition-colors"
              >
                Hủy bỏ
              </button>
            ) : (
              <div />
            )}
            <button
              type="button"
              onClick={() => {
                if (!workshopName.trim()) {
                  onShowToast?.('Vui lòng nhập tên xưởng in!');
                  return;
                }
                setCurrentStep(2);
              }}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#00687A] hover:bg-[#005260] text-white font-bold text-sm shadow-sm transition-all"
            >
              Tiếp tục: Khai báo máy in
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: Declare 3D Printers with Live Calculations */}
      {/* ========================================================================= */}
      {currentStep === 2 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Printer className="w-5 h-5 text-[#00687A]" />
                Bước 2: Khai báo đội ngũ máy in & Công suất vận hành
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Chọn từ các máy mẫu có sẵn hoặc thêm máy tùy biến. Hệ thống tự động tính Khấu hao/giờ và Tiền điện/giờ.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setTempMachineName(`Máy In 3D FDM #${machines.length + 1}`);
                setTempMachineType('FDM');
                setTempAvgPowerKW(0.18);
                setTempPurchasePrice(25000000);
                setTempLifetimeHours(8000);
                setTempVolumeX(256);
                setTempVolumeY(256);
                setTempVolumeZ(256);
                setIsAddingMachine(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shrink-0 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Thêm Máy In Khác
            </button>
          </div>

          {/* Preset Quick Selectors */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Chọn nhanh máy mẫu phổ biến để nạp cấu hình chuẩn:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {POPULAR_PRINTER_PRESETS.map(preset => (
                <button
                  type="button"
                  key={preset.id}
                  onClick={() => handleSelectPreset(preset)}
                  className="p-2.5 rounded-xl border border-slate-200 hover:border-[#00687A] hover:bg-teal-50/40 text-left transition-all group"
                >
                  <div className="text-[10px] font-semibold text-[#00687A] uppercase tracking-wider mb-0.5">
                    {preset.brand}
                  </div>
                  <div className="font-bold text-xs text-slate-900 group-hover:text-[#00687A] line-clamp-1">
                    {preset.name}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {preset.technology} • {preset.avgPowerKW} kW
                  </div>
                  <div className="text-[10px] font-medium text-emerald-600 mt-0.5">
                    {(preset.purchasePrice / 1000000).toFixed(1)} tr đ
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Machine Addition/Edit Modal / Form */}
          {isAddingMachine && (
            <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-teal-50/30 border-2 border-[#00687A]/30 space-y-4 shadow-sm animate-fadeIn">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Printer className="w-4 h-4 text-[#00687A]" />
                  Cấu hình chi tiết máy in
                </h3>
                <button
                  type="button"
                  onClick={() => setIsAddingMachine(false)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                >
                  Đóng lại
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Machine Name */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Tên máy in / Ký hiệu định danh</label>
                  <input
                    type="text"
                    value={tempMachineName}
                    onChange={e => setTempMachineName(e.target.value)}
                    placeholder="VD: Bambu Lab X1C - Máy số 1"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-medium focus:ring-1 focus:ring-[#00687A]"
                  />
                </div>

                {/* Machine Tech */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Công nghệ in</label>
                  <select
                    value={tempMachineType}
                    onChange={e => setTempMachineType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-medium focus:ring-1 focus:ring-[#00687A]"
                  >
                    <option value="FDM">FDM / FFF (Sợi nhựa)</option>
                    <option value="SLA">SLA / MSLA (Quang hóa Resin)</option>
                    <option value="SLS">SLS (Bột laser nung kết)</option>
                  </select>
                </div>

                {/* Build Volume */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Khổ in (X × Y × Z mm)</label>
                  <div className="grid grid-cols-3 gap-1">
                    <input
                      type="number"
                      value={tempVolumeX}
                      onChange={e => setTempVolumeX(Number(e.target.value) || 256)}
                      placeholder="X"
                      className="px-2 py-2 rounded-lg border border-slate-300 text-xs text-center font-bold"
                    />
                    <input
                      type="number"
                      value={tempVolumeY}
                      onChange={e => setTempVolumeY(Number(e.target.value) || 256)}
                      placeholder="Y"
                      className="px-2 py-2 rounded-lg border border-slate-300 text-xs text-center font-bold"
                    />
                    <input
                      type="number"
                      value={tempVolumeZ}
                      onChange={e => setTempVolumeZ(Number(e.target.value) || 256)}
                      placeholder="Z"
                      className="px-2 py-2 rounded-lg border border-slate-300 text-xs text-center font-bold"
                    />
                  </div>
                </div>

                {/* Power KW */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                    <span>Công suất TB (kW)</span>
                    <span className="text-[10px] text-slate-400">Không phải công suất đỉnh</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={tempAvgPowerKW}
                    onChange={e => setTempAvgPowerKW(Number(e.target.value) || 0.1)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-bold text-amber-700"
                  />
                </div>

                {/* Purchase Price */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Giá mua máy (VND)</label>
                  <input
                    type="number"
                    step="500000"
                    value={tempPurchasePrice}
                    onChange={e => setTempPurchasePrice(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-bold text-slate-800"
                  />
                </div>

                {/* Lifetime Hours */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Tuổi thọ khấu hao (Giờ)</label>
                  <input
                    type="number"
                    step="500"
                    value={tempLifetimeHours}
                    onChange={e => setTempLifetimeHours(Number(e.target.value) || 5000)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-bold text-slate-800"
                  />
                </div>

                {/* Save button inside modal */}
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleSaveMachine}
                    className="w-full py-2.5 rounded-lg bg-[#00687A] hover:bg-[#005260] text-white font-bold text-sm shadow-sm transition-colors"
                  >
                    Lưu Máy In Này
                  </button>
                </div>
              </div>

              {/* LIVE PREVIEW BOX: Khấu hao / giờ & Tiền điện / giờ */}
              <div className="p-4 rounded-xl bg-white border border-teal-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-teal-100 text-[#00687A] flex items-center justify-center shrink-0">
                    <Coins className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#00687A]">
                      Ước Tính Chi Phí Máy Theo Giờ Thực Tế (Live Machine Rates)
                    </span>
                    <div className="text-xs text-slate-500">
                      Được nhúng trực tiếp vào công thức tính Inkiri BOM để chia sẻ doanh thu cho xưởng
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                  <div className="text-right">
                    <div className="text-[11px] text-slate-500">Khấu hao / giờ</div>
                    <div className="text-sm font-bold text-indigo-700">
                      {currentDepreciationPerHour.toLocaleString('vi-VN')} đ/h
                    </div>
                  </div>
                  <div className="text-slate-300 font-light text-xl">+</div>
                  <div className="text-right">
                    <div className="text-[11px] text-slate-500">Tiền điện / giờ</div>
                    <div className="text-sm font-bold text-amber-700">
                      {currentElectricityPerHour.toLocaleString('vi-VN')} đ/h
                    </div>
                  </div>
                  <div className="text-slate-300 font-light text-xl">=</div>
                  <div className="p-2 px-3 rounded-lg bg-emerald-50 border border-emerald-200 text-right">
                    <div className="text-[10px] uppercase font-bold text-emerald-700">Tổng máy / giờ</div>
                    <div className="text-sm font-extrabold text-emerald-800">
                      {currentTotalMachinePerHour.toLocaleString('vi-VN')} đ/h
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Current declared machines list */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
              <span>Danh sách máy in của xưởng ({machines.length} máy sẵn sàng)</span>
              <span className="text-slate-400 font-normal">Trạng thái mặc định: Free (Sẵn sàng nhận lệnh)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {machines.map((machine, idx) => {
                const depPerHour = Math.round(machine.purchasePrice / (machine.lifetimeHours || 8000));
                const elecPerHour = Math.round(machine.avgPowerKW * electricityRate);
                return (
                  <div
                    key={machine.id}
                    className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 bg-white shadow-xs relative flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-teal-50 text-[#00687A] flex items-center justify-center font-bold text-xs">
                            #{idx + 1}
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-slate-900">{machine.machineName}</h4>
                            <div className="text-xs text-slate-500">
                              {machine.machineType} • {machine.buildVolumeMm?.x}×{machine.buildVolumeMm?.y}×{machine.buildVolumeMm?.z} mm
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveMachine(machine.id)}
                          className="text-slate-400 hover:text-red-500 p-1 transition-colors"
                          title="Xóa máy in"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100 text-xs">
                        <div>
                          <div className="text-[10px] text-slate-400">Giá mua</div>
                          <div className="font-semibold text-slate-700">
                            {(machine.purchasePrice / 1000000).toFixed(1)} tr
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400">Khấu hao/h</div>
                          <div className="font-semibold text-indigo-700">
                            {depPerHour.toLocaleString('vi-VN')} đ
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400">Tiền điện/h</div>
                          <div className="font-semibold text-amber-700">
                            {elecPerHour.toLocaleString('vi-VN')} đ
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                      <span className="text-slate-500">Công suất: {machine.avgPowerKW} kW ({machine.lifetimeHours}h tuổi thọ)</span>
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Trạng thái: Sẵn sàng
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Quay lại Bước 1
            </button>
            <button
              type="button"
              onClick={() => {
                if (machines.length === 0) {
                  onShowToast?.('Vui lòng khai báo tối thiểu 1 máy in!');
                  return;
                }
                setCurrentStep(3);
              }}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#00687A] hover:bg-[#005260] text-white font-bold text-sm shadow-sm transition-all"
            >
              Tiếp tục: Khai báo tồn kho nhựa
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: Declare Material / Filament Inventory */}
      {/* ========================================================================= */}
      {currentStep === 3 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#00687A]" />
                Bước 3: Khai báo phôi nhựa & Vật liệu tồn kho ban đầu
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Khai báo các cuộn nhựa đang có tại xưởng để Geo-Dispatcher điều phối các đơn hàng có màu sắc & vật liệu tương thích.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setTempMaterialName('Bambu Lab PLA Matte Đen');
                setTempMaterialType('PLA');
                setTempPricePerKg(250000);
                setTempStockGrams(3000);
                setIsAddingMaterial(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shrink-0 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Thêm Cuộn Nhựa Mới
            </button>
          </div>

          {/* Material Modal Form */}
          {isAddingMaterial && (
            <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-teal-50/30 border-2 border-[#00687A]/30 space-y-4 shadow-sm animate-fadeIn">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-[#00687A]" />
                  Khai báo cuộn phôi nhựa mới
                </h3>
                <button
                  type="button"
                  onClick={() => setIsAddingMaterial(false)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                >
                  Đóng lại
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Material Name */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Tên cuộn nhựa / Thương hiệu</label>
                  <input
                    type="text"
                    value={tempMaterialName}
                    onChange={e => setTempMaterialName(e.target.value)}
                    placeholder="VD: eSUN PLA+ Đen Mờ, SUNLU PETG..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-medium focus:ring-1 focus:ring-[#00687A]"
                  />
                </div>

                {/* Material Type */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Loại vật liệu</label>
                  <select
                    value={tempMaterialType}
                    onChange={e => setTempMaterialType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-medium focus:ring-1 focus:ring-[#00687A]"
                  >
                    <option value="PLA">PLA / PLA+ (Phổ biến, dễ in)</option>
                    <option value="PETG">PETG (Bền cơ, chịu nước ngoài trời)</option>
                    <option value="ABS">ABS / ASA (Chịu nhiệt, vỏ xe máy)</option>
                    <option value="TPU">TPU (Nhựa dẻo đàn hồi)</option>
                    <option value="PC">Polycarbonate (PC siêu cứng)</option>
                    <option value="Resin">Resin Quang Hóa 8K/12K (Mịn sắc nét)</option>
                  </select>
                </div>

                {/* Initial Stock in Grams */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Tồn kho ban đầu (Gram)</label>
                  <input
                    type="number"
                    step="500"
                    value={tempStockGrams}
                    onChange={e => setTempStockGrams(Number(e.target.value) || 1000)}
                    placeholder="VD: 3000g = 3 cuộn"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-bold text-[#00687A]"
                  />
                </div>

                {/* Price per KG */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Đơn giá nhập (VND/kg)</label>
                  <input
                    type="number"
                    step="10000"
                    value={tempPricePerKg}
                    onChange={e => setTempPricePerKg(Number(e.target.value) || 200000)}
                    placeholder="VD: 250000"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-bold text-slate-800"
                  />
                </div>

                {/* Color Swatch Picker */}
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                    <span>Màu sắc phôi: {tempColorName}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{tempColorHex}</span>
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {PRESET_MATERIAL_PALETTE.map(p => (
                      <button
                        type="button"
                        key={p.name}
                        onClick={() => {
                          setTempColorHex(p.hex);
                          setTempColorName(p.name);
                        }}
                        className={`w-7 h-7 rounded-full border-2 transition-transform ${
                          tempColorHex === p.hex ? 'scale-115 border-[#00687A] ring-2 ring-[#00687A]/30' : 'border-slate-300'
                        }`}
                        style={{ backgroundColor: p.hex }}
                        title={p.name}
                      />
                    ))}
                    <input
                      type="color"
                      value={tempColorHex}
                      onChange={e => {
                        setTempColorHex(e.target.value);
                        setTempColorName('Màu tự chọn');
                      }}
                      className="w-7 h-7 rounded-full cursor-pointer border border-slate-300 p-0 overflow-hidden"
                      title="Màu tùy chỉnh"
                    />
                  </div>
                </div>

                {/* Save button */}
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleSaveMaterial}
                    className="w-full py-2.5 rounded-lg bg-[#00687A] hover:bg-[#005260] text-white font-bold text-sm shadow-sm transition-colors"
                  >
                    Lưu Cuộn Nhựa Này
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Declared Materials List */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
              <span>Danh mục phôi sẵn sàng ({materials.length} loại nhựa)</span>
              <span className="text-slate-400 font-normal">
                Tổng khối lượng: {materials.reduce((acc, m) => acc + m.currentStockGrams, 0).toLocaleString('vi-VN')} g
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {materials.map(mat => (
                <div
                  key={mat.id}
                  className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 bg-white shadow-xs flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl border border-slate-300 shadow-inner flex items-center justify-center shrink-0"
                      style={{ backgroundColor: mat.colorHex }}
                    >
                      <span
                        className="text-[9px] font-bold uppercase tracking-wider px-1 rounded bg-black/40 text-white"
                      >
                        {mat.materialType}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{mat.materialName}</h4>
                      <div className="text-xs text-slate-500">
                        {mat.colorName || 'Chuẩn'} • Giá nhập: {mat.pricePerKg.toLocaleString('vi-VN')} đ/kg
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-xs font-extrabold text-[#00687A]">
                        {(mat.currentStockGrams / 1000).toFixed(1)} kg
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {mat.currentStockGrams.toLocaleString('vi-VN')} g
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveMaterial(mat.id)}
                      className="text-slate-400 hover:text-red-500 p-1 transition-colors"
                      title="Xóa vật liệu"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notice about Auto Price Update & Audit Log */}
          <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Lưu ý về cơ chế cập nhật đơn giá và kiểm kê:</span>
              <p className="mt-0.5 text-amber-800">
                Sau khi xưởng hoàn tất đăng ký, mỗi khi bạn nhập thêm phôi nhựa với đơn giá khác đơn giá hiện tại, hệ thống sẽ tự động cập nhật đơn giá tính toán và lưu vết vào <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">material_inventory_logs</code> để kiểm toán minh bạch.
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Quay lại Bước 2
            </button>
            <button
              type="button"
              onClick={handleSubmitOnboarding}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-7 py-2.5 rounded-xl bg-gradient-to-r from-[#00687A] to-[#0284C7] hover:from-[#005260] hover:to-[#0369A1] text-white font-bold text-sm shadow-md transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Đang khởi tạo hồ sơ xưởng...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-cyan-200" />
                  Hoàn tất & Gửi hồ sơ phê duyệt
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 4: Success & Pending Approval State (verified_status = 'Pending') */}
      {/* ========================================================================= */}
      {currentStep === 4 && submittedProfile && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center space-y-6 animate-fadeIn">
          <div className="w-20 h-20 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto ring-8 ring-amber-50">
            <Clock className="w-10 h-10 animate-pulse" />
          </div>

          <div className="max-w-xl mx-auto space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 border border-amber-300 text-xs font-bold text-amber-800">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              verified_status: Pending (Chờ Admin Duyệt)
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Đã Gửi Hồ Sơ Xưởng In Thành Công!
            </h2>
            <p className="text-sm text-slate-600">
              Hồ sơ cơ sở <strong>"{submittedProfile.workshopName}"</strong> tại khu vực{' '}
              <strong>Miền {submittedProfile.region}</strong> đã được gửi tới Ban Quản Trị VCUBE MES.
            </p>
          </div>

          {/* Summary Card */}
          <div className="max-w-lg mx-auto bg-slate-50 rounded-2xl p-5 border border-slate-200 text-left space-y-3">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Tóm tắt hồ sơ vừa khai báo:
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="text-slate-500">Mã định danh xưởng:</div>
              <div className="font-mono font-bold text-slate-800">{submittedProfile.id}</div>

              <div className="text-slate-500">Số lượng máy in:</div>
              <div className="font-bold text-slate-800">{machines.length} máy FDM/SLA</div>

              <div className="text-slate-500">Tổng phôi nhựa tồn kho:</div>
              <div className="font-bold text-slate-800">
                {(materials.reduce((a, b) => a + b.currentStockGrams, 0) / 1000).toFixed(1)} kg ({materials.length} cuộn)
              </div>

              <div className="text-slate-500">Địa bàn Geo-Dispatcher:</div>
              <div className="font-bold text-[#00687A]">Miền {submittedProfile.region}</div>

              <div className="text-slate-500">Thời gian cam kết SLA:</div>
              <div className="font-bold text-emerald-600">Phản hồi trong 24 giờ làm việc</div>
            </div>
          </div>

          {/* Instructions */}
          <div className="max-w-lg mx-auto p-4 rounded-xl bg-blue-50/80 border border-blue-200 text-blue-900 text-xs text-left space-y-1.5">
            <div className="font-bold flex items-center gap-1.5 text-blue-800">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              Các bước tiếp theo dành cho Đối tác Xưởng:
            </div>
            <ul className="list-disc list-inside space-y-1 text-blue-800/90 pl-1">
              <li>Admin VCUBE sẽ liên hệ qua điện thoại ({submittedProfile.contactPhone}) để xác thực hình ảnh xưởng.</li>
              <li>Bạn có thể in thử nghiệm tệp <em>VCUBE Tolerance Calibration Cube</em> để kiểm tra độ sai số máy (&lt; 0.05mm).</li>
              <li>Sau khi được cấp chứng nhận "Verified", bạn sẽ tự động nhận lệnh in qua Dashboard MES.</li>
            </ul>
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (onNavigate) {
                  onNavigate('workshop_settings');
                } else {
                  window.location.reload();
                }
              }}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#00687A] hover:bg-[#005260] text-white font-bold text-sm shadow-sm transition-all"
            >
              Mở Trang Cấu Hình Xưởng (Workshop Settings)
            </button>
            <button
              type="button"
              onClick={() => {
                if (onNavigate) {
                  onNavigate('home');
                }
              }}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-all"
            >
              Về Trang Chủ VCUBE
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkshopOnboardingWizard;
