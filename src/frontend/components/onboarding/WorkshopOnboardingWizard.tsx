import React, { useState, useMemo } from 'react';
import { Button } from '@frontend/ui';
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
import { useAuth } from '@frontend/context/AuthContext';
import { WorkshopService } from '@backend/services/workshopService';

export interface WorkshopOnboardingWizardProps {
  initialData?: Partial<WorkshopProfile>;
  onComplete?: (data: {
    workshop: WorkshopProfile;
    machines: WorkshopMachine[];
    materials: WorkshopMaterial[];
  }) => void;
  /**
   * W1a: hồ sơ xưởng đã gửi nhưng còn `verified_status='Pending'` ⇒ `/lab` vẫn hiện wizard
   * (theo brief Đợt 10 §W1a). Nhưng đó KHÔNG được là ngõ cụt: xưởng phải mở được bảng điều
   * khiển của chính mình. Nút "Mở bảng điều khiển" gọi callback này.
   */
  onSkipToDashboard?: () => void;
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
    buildVolumeMm: { x: 256, y: 256, z: 256 },
    badge: 'Phổ biến nhất',
    description: 'Tốc độ 500mm/s, hỗ trợ đa màu AMS, camera AI chống spaghetti.'
  },
  {
    id: 'bambu-p1s',
    name: 'Bambu Lab P1S Combo',
    brand: 'Bambu Lab',
    technology: 'FDM',
    buildVolumeMm: { x: 256, y: 256, z: 256 },
    badge: 'Hiệu năng cao',
    description: 'Buồng kín in ABS/PETG ổn định, giá thành đầu tư tối ưu cho hub.'
  },
  {
    id: 'creality-k1-max',
    name: 'Creality K1 Max',
    brand: 'Creality',
    technology: 'FDM',
    buildVolumeMm: { x: 300, y: 300, z: 300 },
    badge: 'Khổ lớn 300mm',
    description: 'Bàn in 300x300x300mm, lidar kép tự cân bàn, sấy buồng chủ động.'
  },
  {
    id: 'elegoo-saturn-4',
    name: 'Elegoo Saturn 4 Ultra 12K',
    brand: 'Elegoo',
    technology: 'SLA',
    buildVolumeMm: { x: 218, y: 122, z: 220 },
    badge: 'Độ nét cao 12K',
    description: 'Công nghệ màn hình 12K Mono LCD, cảm biến tự cân bằng Tilt Release.'
  },
  {
    id: 'anycubic-kobra-2-plus',
    name: 'Anycubic Kobra 2 Plus',
    brand: 'Anycubic',
    technology: 'FDM',
    buildVolumeMm: { x: 300, y: 300, z: 350 },
    badge: 'Tiết kiệm vốn',
    description: 'Tốc độ 500mm/s, khổ in cao 350mm, chi phí khấu hao thấp.'
  },
  {
    id: 'formlabs-form-4',
    name: 'Formlabs Form 4 SLA',
    brand: 'Formlabs',
    technology: 'SLA',
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

/**
 * `workshop_profiles.id` là **uuid** (`supabase/migrations/20260901_baseline_schema.sql`),
 * nên KHÔNG được sinh id dạng `ws_<timestamp>` như bản cũ: Postgres từ chối
 * (`invalid input syntax for type uuid`) và hồ sơ xưởng không bao giờ được tạo.
 *
 * `crypto.randomUUID()` chỉ có trong secure context — bản build tĩnh phục vụ qua IP LAN
 * (`http://192.168.x.x:4197`) KHÔNG phải secure context, nên dùng `crypto.getRandomValues`
 * (có ở mọi context) và fallback `Math.random` khi môi trường không có `crypto`.
 */
function createUuidV4(): string {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export const WorkshopOnboardingWizard: React.FC<WorkshopOnboardingWizardProps> = ({
  initialData,
  onComplete,
  onSkipToDashboard,
  onCancel,
  onNavigate,
  onShowToast
}) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // -------------------------------------------------------------
  // Step 1: Workshop Information
  // -------------------------------------------------------------
  // data-honesty: mọi trường dưới đây là HỒ SƠ CỦA CHÍNH XƯỞNG đang đăng ký. Trước đây form
  // được pre-fill bằng một xưởng bịa ("Xưởng In 3D Kỹ Thuật Số Hub", KS. Nguyễn Văn Tuấn,
  // 128 Xuân Thủy – Cầu Giấy, workshop@vcube.vn, 2.850 đ/kWh): người dùng bấm "Hoàn tất" mà
  // không nhập gì vẫn ghi được một xưởng không tồn tại. Nay để TRỐNG, người dùng phải khai.
  const [workshopName, setWorkshopName] = useState(initialData?.workshopName || '');
  const [contactPhone, setContactPhone] = useState(initialData?.contactPhone || '');
  const [contactEmail, setContactEmail] = useState(initialData?.contactEmail || '');
  const [address, setAddress] = useState(initialData?.address || '');
  const [region, setRegion] = useState<'Bắc' | 'Trung' | 'Nam'>((initialData?.region as any) || 'Bắc');
  // '' = xưởng CHƯA khai đơn giá điện ⇒ không ghi số mặc định nào (không bịa 2.850 đ/kWh).
  const [electricityRate, setElectricityRate] = useState<number | ''>(initialData?.electricityRateOverride ?? '');

  // -------------------------------------------------------------
  // Step 2: Machines Declaration
  // -------------------------------------------------------------
  // Bắt đầu TRỐNG: không dựng sẵn một "Bambu Lab X1-Carbon #01 giá 35 triệu" mà xưởng chưa khai.
  const [machines, setMachines] = useState<WorkshopMachine[]>([]);

  // Temporary state for adding/editing a machine
  const [isAddingMachine, setIsAddingMachine] = useState(false);
  const [tempMachineName, setTempMachineName] = useState('');
  const [tempMachineType, setTempMachineType] = useState<'FDM' | 'SLA' | 'SLS'>('FDM');
  /**
   * D2(A): BỎ 3 ô "công suất / giá mua / tuổi thọ khấu hao". Bảng `workshop_machines` KHÔNG
   * có cột nào lưu 3 số đó, nên thu thập rồi vứt đi là làm người khai tưởng đã ghi được.
   * Chi phí máy nay khai TRỰC TIẾP vào `hourly_rate` — cột CÓ THẬT, `saveMyMachine` ghi được.
   * `''` = chưa khai (KHÔNG mặc định 0: 0 đ/giờ là một mức giá thật).
   */
  const [tempHourlyRate, setTempHourlyRate] = useState<number | ''>('');
  // '' = chưa nhập khổ in (trước đây có sẵn số bịa 256³ mm).
  const [tempVolumeX, setTempVolumeX] = useState<number | ''>('');
  const [tempVolumeY, setTempVolumeY] = useState<number | ''>('');
  const [tempVolumeZ, setTempVolumeZ] = useState<number | ''>('');

  // -------------------------------------------------------------
  // Step 3: Material Inventory Declaration
  // -------------------------------------------------------------
  // Bắt đầu TRỐNG (trước đây dựng sẵn 2 cuộn nhựa kèm giá nhập xưởng chưa từng khai).
  const [materials, setMaterials] = useState<WorkshopMaterial[]>([]);

  // Temporary state for adding a material
  const [isAddingMaterial, setIsAddingMaterial] = useState(false);
  const [tempMaterialName, setTempMaterialName] = useState('');
  const [tempMaterialType, setTempMaterialType] = useState<WorkshopMaterial['materialType']>('PLA');
  // '' = chưa nhập (trước đây 260.000 đ/kg và 3.000 g là số bịa được ghi thẳng vào kho xưởng).
  const [tempPricePerKg, setTempPricePerKg] = useState<number | ''>('');
  const [tempStockGrams, setTempStockGrams] = useState<number | ''>('');
  // D8: ngưỡng cảnh báo là dữ kiện của TỪNG xưởng ⇒ bắt khai, KHÔNG tự điền 1000 g.
  const [tempLowStockThreshold, setTempLowStockThreshold] = useState<number | ''>('');
  const [tempColorHex, setTempColorHex] = useState('#1E1E1E');
  const [tempColorName, setTempColorName] = useState('Đen Titan');

  // Submission Status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedProfile, setSubmittedProfile] = useState<WorkshopProfile | null>(null);

  /**
   * Đơn giá giờ máy ĐANG nhập = đúng con số sẽ được lưu (`workshop_machines.hourly_rate`).
   * `null` = chưa khai. Không cộng thêm khấu hao/tiền điện suy diễn từ trường không lưu được.
   */
  const currentHourlyRate = tempHourlyRate === '' ? null : Number(tempHourlyRate);

  // Load a preset machine into the editor form
  const handleSelectPreset = (preset: PrinterPreset) => {
    setTempMachineName(`${preset.name} #0${machines.length + 1}`);
    setTempMachineType(preset.technology);
    // D2(A): preset KHÔNG còn mang công suất/giá mua/tuổi thọ (3 trường không lưu được).
    setTempHourlyRate('');
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
    if (tempVolumeX === '' || tempVolumeY === '' || tempVolumeZ === '') {
      onShowToast?.('Vui lòng nhập khổ in (X × Y × Z mm) — hệ thống không tự điền số mặc định.');
      return;
    }
    if (tempHourlyRate !== '' && (!Number.isFinite(Number(tempHourlyRate)) || Number(tempHourlyRate) < 0)) {
      onShowToast?.('Đơn giá giờ máy phải là số không âm, hoặc để trống nếu chưa khai.');
      return;
    }
    const newMachine: WorkshopMachine = {
      id: `mch-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      workshopId: 'ws-pending',
      machineName: tempMachineName.trim(),
      machineType: tempMachineType,
      // `null` = chưa khai đơn giá giờ (KHÔNG ghi 0 — 0 đ/giờ là một mức giá thật).
      hourlyRate: tempHourlyRate === '' ? null : Number(tempHourlyRate),
      status: 'Free',
      buildVolumeMm: {
        x: Number(tempVolumeX),
        y: Number(tempVolumeY),
        z: Number(tempVolumeZ)
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
    if (tempPricePerKg === '' || tempStockGrams === '' || tempLowStockThreshold === '') {
      onShowToast?.(
        'Vui lòng nhập đơn giá nhập, khối lượng tồn kho và ngưỡng cảnh báo — hệ thống không tự điền số mặc định.',
      );
      return;
    }
    const newMaterial: WorkshopMaterial = {
      id: `mat-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      workshopId: 'ws-pending',
      materialName: tempMaterialName.trim(),
      materialType: tempMaterialType,
      pricePerKg: Number(tempPricePerKg),
      colorHex: tempColorHex,
      colorName: tempColorName,
      density: tempMaterialType === 'PLA' ? 1.24 : tempMaterialType === 'PETG' ? 1.27 : 1.05,
      stockStatus: 'Tracking',
      currentStockGrams: Number(tempStockGrams),
      lowStockThresholdGrams: Number(tempLowStockThreshold)
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
  const handleSubmitOnboarding = async () => {
    if (!workshopName.trim()) {
      onShowToast?.('Vui lòng nhập tên xưởng in!');
      setCurrentStep(1);
      return;
    }
    if (!address.trim() || !contactPhone.trim() || !contactEmail.trim()) {
      onShowToast?.('Vui lòng nhập đủ địa chỉ xưởng, hotline điều phối và email kỹ thuật!');
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
    if (!user?.id) {
      onShowToast?.('Cần đăng nhập bằng tài khoản xưởng trước khi gửi hồ sơ.');
      return;
    }

    setIsSubmitting(true);

    // D2(B): KHÔNG tạo hồ sơ trùng cho cùng một tài khoản.
    // Trước đây mỗi lần nộp đều `createUuidV4()` ⇒ user đã có hàng 'Pending' mà nộp lại thì
    // sinh THÊM một hàng nữa (dữ liệu trôi, admin thấy nhiều hồ sơ cho một xưởng).
    // Nay: dò hàng hiện có của chính user; có mà CHƯA 'Verified' ⇒ dùng lại `id` của hàng đó
    // (upsert theo khoá chính = UPDATE). Chưa có hàng nào ⇒ mới sinh uuid mới.
    let existingProfileId: string | null = null;
    try {
      const existing = await WorkshopService.getWorkshopProfileByUserId(user.id);
      if (existing?.id && existing.verifiedStatus !== 'Verified') {
        existingProfileId = existing.id;
      }
    } catch (e) {
      // Không đọc được (mạng/lỗi tạm) ⇒ đi tiếp như "chưa có hàng": KHÔNG chặn xưởng nộp hồ sơ.
      console.warn('Không đọc được hồ sơ xưởng hiện có, sẽ lưu như hồ sơ mới:', e);
    }
    const isResubmit = existingProfileId !== null;

    // Ghi THẬT qua WorkshopService — đây là tầng duy nhất chạm Supabase.
    // Trước đây bước này CHỈ ghi localStorage rồi báo "Đã gửi hồ sơ… chờ Quản trị viên duyệt":
    // không có hàng nào trong `workshop_profiles`, không ai duyệt được, và `verifiedStatus`
    // 'Pending' chỉ là chữ trong RAM.
    const saved = await WorkshopService.saveWorkshopProfile({
      // Có hàng cũ ⇒ dùng lại id (UPDATE); chưa có ⇒ uuid hợp lệ mới (xem `createUuidV4`).
      id: existingProfileId ?? createUuidV4(),
      userId: user.id,
      workshopName: workshopName.trim(),
      address: address.trim(),
      region: region,
      totalMachines: machines.length,
      activeMachinesNow: machines.length,
      // Rỗng ⇒ CHƯA khai đơn giá điện. Không ghi 2.850 đ/kWh hộ xưởng.
      electricityRateOverride: electricityRate === '' ? undefined : Number(electricityRate),
      // `partner_id` KHÔNG bao giờ được gửi (admin gán khi duyệt — policy INSERT yêu cầu NULL).
      // `verified_status`: chỉ khai khi tạo hàng MỚI ('Pending'). Nộp LẠI thì KHÔNG gửi —
      // gửi kèm 2 cột đặc quyền vào một hàng đã có sẽ bị trigger chặn 42501 (trông như lỗi RLS).
      ...(isResubmit ? {} : { verifiedStatus: 'Pending' as const }),
      contactPhone: contactPhone.trim(),
      contactEmail: contactEmail.trim(),
    });

    const savedId = saved?.data?.id;
    if (!savedId || saved.error) {
      setIsSubmitting(false);
      onShowToast?.(
        `Chưa lưu được hồ sơ xưởng lên máy chủ${saved?.error ? ` (${saved.error})` : ''}. Hồ sơ CHƯA được gửi.`
      );
      return;
    }

    const updatedMachines = machines.map(m => ({ ...m, workshopId: savedId }));
    const updatedMaterials = materials.map(m => ({ ...m, workshopId: savedId }));

    // Nhóm hàm MỚI của W1b (`saveMyMachine` / `saveMyMaterial`) ghi đúng cột THẬT của
    // `workshop_machines` / `workshop_materials`. Nhóm hàm CŨ của service upsert các cột
    // KHÔNG tồn tại (`machine_name`, `avg_power_kw`, `purchase_price`, `build_volume_mm`…)
    // nên Supabase trả lỗi — mà nhóm cũ lại `catch` rồi trả `success: true` ⇒ wizard báo
    // thành công trong khi mất sạch dữ liệu (lỗi do coordinator báo, đã sửa ở đây).
    // Vì vậy phải ĐẾM số lần ghi hỏng, không được nói chung chung là đã lưu hết.
    //
    // D2(A): `workshop_machines` KHÔNG có cột cho công suất / giá mua / tuổi thọ khấu hao nên
    // wizard không còn thu thập chúng. Chi phí máy gửi qua `hourlyRate` (`hourly_rate`) —
    // cột có thật; `null` = xưởng chưa khai, KHÔNG ghi 0.
    let machineFails = 0;
    for (const machine of machines) {
      const res = await WorkshopService.saveMyMachine({
        workshopProfileId: savedId,
        name: machine.machineName,
        technology: machine.machineType,
        bedDimensions: machine.buildVolumeMm,
        status: machine.status,
        hourlyRate: machine.hourlyRate ?? null,
      });
      if (!res.success) {
        machineFails += 1;
        console.warn('Could not save workshop machine:', res.error);
      }
    }

    let materialFails = 0;
    for (const material of materials) {
      const res = await WorkshopService.saveMyMaterial({
        workshopProfileId: savedId,
        name: material.materialName,
        type: material.materialType,
        color: material.colorName || material.colorHex || '',
        currentStockGrams: material.currentStockGrams,
        lowStockThresholdGrams: material.lowStockThresholdGrams,
        pricePerKg: material.pricePerKg,
        stockStatus: material.stockStatus,
      });
      if (!res.success) {
        materialFails += 1;
        console.warn('Could not save workshop material:', res.error);
      }
    }

    const newWorkshop: WorkshopProfile = saved.data as WorkshopProfile;

    setSubmittedProfile(newWorkshop);
    setIsSubmitting(false);
    setCurrentStep(4); // Pending-review step

    if (onComplete) {
      onComplete({
        workshop: newWorkshop,
        machines: updatedMachines,
        materials: updatedMaterials
      });
    }

    // Toast phải nói ĐÚNG số mục chưa lưu được — không khẳng định "đã lưu hết".
    if (machineFails > 0 || materialFails > 0) {
      onShowToast?.(
        `Hồ sơ xưởng đã gửi, nhưng ${machineFails} máy in / ${materialFails} vật liệu CHƯA lưu được — vào Bảng điều khiển để nhập lại.`
      );
    } else {
      onShowToast?.(
        `Đã lưu hồ sơ xưởng cùng ${machines.length} máy in và ${materials.length} vật liệu. Trạng thái: chờ Quản trị viên duyệt (Pending).`
      );
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto my-6 px-4 font-sans text-fg">
      {/* Top Header Card */}
      <div className="bg-surface rounded-lg shadow-e1 overflow-hidden mb-6">
        <div className="bg-surface-inverse p-6 text-on-inverse flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-lg bg-on-inverse/10 backdrop-blur-md flex items-center justify-center border border-line shadow-e0">
              <Printer className="w-8 h-8 text-primary" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary-tint border border-primary/30 text-xs font-semibold text-primary mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                MES Hub Onboarding Wizard
              </div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight">
                Đăng Ký Đối Tác Xưởng In 3D (MES Partner)
              </h1>
              <p className="text-sm text-primary/90 mt-0.5">
                Khai báo cơ sở sản xuất của xưởng để VCUBE đối chiếu khi phân công đơn in
              </p>
            </div>
          </div>

          {currentStep < 4 && (
            <div className="flex items-center gap-2 bg-on-inverse/10 px-3 py-1.5 rounded-lg border border-line text-xs text-accent">
              <Clock className="w-4 h-4 text-primary" />
              <span>3 bước: cơ sở · máy in · vật liệu</span>
            </div>
          )}
        </div>

        {/* Progress Step Bar */}
        {currentStep < 4 && (
          <div className="grid grid-cols-3 border-b border-line-subtle bg-canvas/80">
            {[
              { step: 1, label: 'Thông Tin Xưởng', sub: 'Địa chỉ & khu vực', icon: Building2 },
              { step: 2, label: 'Khai Báo Máy In', sub: 'Đơn giá giờ & khổ in', icon: Printer },
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
                    isCompleted ? 'cursor-pointer hover:bg-positive-tint/60' : ''
                  } ${isActive ? 'bg-surface border-b-2 border-primary' : ''}`}
                >
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                      isCompleted
                        ? 'bg-positive text-primary-fg shadow-e1'
                        : isActive
                        ? 'bg-primary text-primary-fg shadow-e1'
                        : 'bg-line-subtle text-fg-muted'
                    }`}
                  >
                    {isCompleted ? <Check className="w-5 h-5" /> : item.step}
                  </div>
                  <div className="hidden sm:block">
                    <div className={`text-xs font-bold uppercase tracking-wider ${isActive ? 'text-primary' : 'text-fg-muted'}`}>
                      {item.label}
                    </div>
                    <div className="text-xs text-fg-subtle font-medium">{item.sub}</div>
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
        <div className="bg-surface rounded-lg shadow-e1 p-6 md:p-8 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-fg flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              Bước 1: Khai báo thông tin cơ sở sản xuất & Khu vực địa lý
            </h2>
            <p className="text-sm text-fg-subtle mt-1">
              Khu vực này được lưu vào hồ sơ xưởng để VCUBE đối chiếu khi phân công đơn in.
            </p>
          </div>

          {initialData?.verifiedStatus === 'Pending' && (
            <div className="p-4 rounded-lg bg-warning-tint/80 border border-warning/30 text-xs text-warning flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                <span>
                  Hồ sơ xưởng <strong>{initialData?.workshopName}</strong> đã được gửi và đang ở trạng thái{' '}
                  <strong>Pending</strong> (chờ Quản trị viên duyệt). Bạn có thể khai lại hồ sơ bên dưới,
                  hoặc mở bảng điều khiển của xưởng ngay.
                </span>
              </div>
              {onSkipToDashboard && (
                <button
                  type="button"
                  onClick={onSkipToDashboard}
                  className="shrink-0 px-4 py-2 rounded-lg bg-surface border border-warning/40 text-warning font-bold"
                >
                  Mở bảng điều khiển
                </button>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Workshop Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-fg-muted uppercase tracking-wider flex items-center gap-1">
                Tên Xưởng In / Hub Gia Công <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={workshopName}
                onChange={e => setWorkshopName(e.target.value)}
                placeholder="VD: FabLab CNC & 3D Printing Cầu Giấy"
                className="w-full px-3.5 py-2.5 rounded-lg border border-line focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"
              />
              <span className="text-xs text-fg-subtle">Tên thương hiệu xưởng sẽ hiển thị trên tem đóng gói bưu phẩm</span>
            </div>

            {/* Hotline Phone */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-fg-muted uppercase tracking-wider flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-fg-subtle" />
                Số Điện Thoại Điều Phối Hotline <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={contactPhone}
                onChange={e => setContactPhone(e.target.value)}
                placeholder="Nhập hotline kỹ thuật"
                className="w-full px-3.5 py-2.5 rounded-lg border border-line focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"
              />
              <span className="text-xs text-fg-subtle">Nhận thông báo đơn hàng hỏa tốc qua Zalo / SMS</span>
            </div>

            {/* Contact Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-fg-muted uppercase tracking-wider flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-fg-subtle" />
                Email Kỹ Thuật Tiếp Nhận File 3D <span className="text-danger">*</span>
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={e => setContactEmail(e.target.value)}
                placeholder="VD: tech@xuongin3d.vn"
                className="w-full px-3.5 py-2.5 rounded-lg border border-line focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"
              />
            </div>
          </div>

          {/* Full Address */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-fg-muted uppercase tracking-wider flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-fg-subtle" />
              Địa Chỉ Chi Tiết Xưởng In <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="Số nhà, ngõ/đường, Phường/Xã, Quận/Huyện, Tỉnh/TP"
              className="w-full px-3.5 py-2.5 rounded-lg border border-line focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"
            />
          </div>

          {/* Khu vực phục vụ của xưởng (Bắc / Trung / Nam) */}
          <div className="space-y-2 pt-2">
            <label className="text-xs font-bold text-fg-muted uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-warning" />
              Khu Vực Phục Vụ (Bắc / Trung / Nam) <span className="text-danger">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  id: 'Bắc',
                  title: 'Miền Bắc (Hub Hà Nội)',
                  desc: 'Hà Nội, Hải Phòng, Bắc Ninh, Quảng Ninh...',
                  tag: 'Xưởng tại miền Bắc'
                },
                {
                  id: 'Trung',
                  title: 'Miền Trung (Hub Đà Nẵng)',
                  desc: 'Đà Nẵng, Huế, Quảng Nam, Quảng Ngãi...',
                  tag: 'Xưởng tại miền Trung'
                },
                {
                  id: 'Nam',
                  title: 'Miền Nam (Hub TP.HCM)',
                  desc: 'TP.HCM, Bình Dương, Đồng Nai, Long An...',
                  tag: 'Xưởng tại miền Nam'
                }
              ].map(item => {
                const isSel = region === item.id;
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => setRegion(item.id as any)}
                    className={`p-4 rounded-lg border-2 text-left transition-all relative ${
                      isSel
                        ? 'border-primary bg-primary-tint/50 shadow-e1 ring-2 ring-primary/20'
                        : 'border-line-subtle hover:border-line bg-surface'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm text-fg">{item.title}</span>
                      {isSel && (
                        <div className="w-5 h-5 rounded-full bg-primary text-primary-fg flex items-center justify-center">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-fg-subtle line-clamp-2">{item.desc}</p>
                    <div className="mt-2 inline-block px-2 py-0.5 rounded-sm bg-surface-muted text-xs font-semibold text-fg-muted">
                      {item.tag}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Electricity base rate */}
          <div className="p-4 bg-canvas rounded-lg border border-line-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-warning-tint text-warning flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-fg">Đơn giá điện cơ sở của xưởng (VND/kWh)</h4>
                <p className="text-xs text-fg-subtle">Để trống nếu xưởng chưa khai — hệ thống KHÔNG tự điền đơn giá điện</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={electricityRate}
                placeholder="Chưa khai"
                onChange={e => setElectricityRate(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-28 px-3 py-1.5 rounded-lg border border-line text-right font-bold text-sm"
              />
              <span className="text-xs font-semibold text-fg-muted">đ/kWh</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-line-subtle flex items-center justify-between">
            {onCancel ? (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-sm font-semibold text-fg-muted hover:text-fg transition-colors"
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
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-primary-fg font-bold text-sm shadow-e1 transition-all"
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
        <div className="bg-surface rounded-lg shadow-e1 p-6 md:p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-fg flex items-center gap-2">
                <Printer className="w-5 h-5 text-primary" />
                Bước 2: Khai báo đội ngũ máy in & Đơn giá giờ máy
              </h2>
              <p className="text-sm text-fg-subtle mt-0.5">
                Chọn từ các máy mẫu có sẵn hoặc thêm máy tùy biến. Đơn giá giờ máy là con số DUY NHẤT được lưu vào hồ sơ xưởng.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setTempMachineName(`Máy In 3D FDM #${machines.length + 1}`);
                setTempMachineType('FDM');
                setTempHourlyRate('');
                setTempVolumeX('');
                setTempVolumeY('');
                setTempVolumeZ('');
                setIsAddingMachine(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-surface-inverse hover:bg-surface-inverse text-on-inverse text-xs font-bold shrink-0 transition-colors shadow-e1"
            >
              <Plus className="w-4 h-4" />
              Thêm Máy In Khác
            </button>
          </div>

          {/* Preset Quick Selectors */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-fg-muted uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-warning" />
              Chọn nhanh máy mẫu phổ biến để nạp cấu hình chuẩn:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {POPULAR_PRINTER_PRESETS.map(preset => (
                <button
                  type="button"
                  key={preset.id}
                  onClick={() => handleSelectPreset(preset)}
                  className="p-2.5 rounded-lg border border-line-subtle hover:border-primary hover:bg-primary-tint/40 text-left transition-all group"
                >
                  <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-0.5">
                    {preset.brand}
                  </div>
                  <div className="font-bold text-xs text-fg group-hover:text-primary line-clamp-1">
                    {preset.name}
                  </div>
                  <div className="text-xs text-fg-subtle mt-1">
                    {preset.technology} • {preset.buildVolumeMm.x}×{preset.buildVolumeMm.y}×
                    {preset.buildVolumeMm.z} mm
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Machine Addition/Edit Modal / Form */}
          {isAddingMachine && (
            <div className="p-5 rounded-lg bg-primary-tint border border-primary/30 space-y-4 shadow-e1 animate-fadeIn">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-fg flex items-center gap-2">
                  <Printer className="w-4 h-4 text-primary" />
                  Cấu hình chi tiết máy in
                </h3>
                <button
                  type="button"
                  onClick={() => setIsAddingMachine(false)}
                  className="text-xs font-semibold text-fg-subtle hover:text-fg"
                >
                  Đóng lại
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Machine Name */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-fg-muted">Tên máy in / Ký hiệu định danh</label>
                  <input
                    type="text"
                    value={tempMachineName}
                    onChange={e => setTempMachineName(e.target.value)}
                    placeholder="VD: Bambu Lab X1C - Máy số 1"
                    className="w-full px-3 py-2 rounded-lg border border-line text-sm font-medium focus:ring-1 focus:ring-primary"
                  />
                </div>

                {/* Machine Tech */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-fg-muted">Công nghệ in</label>
                  <select
                    value={tempMachineType}
                    onChange={e => setTempMachineType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-line text-sm font-medium focus:ring-1 focus:ring-primary"
                  >
                    <option value="FDM">FDM / FFF (Sợi nhựa)</option>
                    <option value="SLA">SLA / MSLA (Quang hóa Resin)</option>
                    <option value="SLS">SLS (Bột laser nung kết)</option>
                  </select>
                </div>

                {/* Build Volume */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-fg-muted">Khổ in (X × Y × Z mm)</label>
                  <div className="grid grid-cols-3 gap-1">
                    <input
                      type="number"
                      value={tempVolumeX}
                      onChange={e => setTempVolumeX(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="X"
                      className="px-2 py-2 rounded-lg border border-line text-xs text-center font-bold"
                    />
                    <input
                      type="number"
                      value={tempVolumeY}
                      onChange={e => setTempVolumeY(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Y"
                      className="px-2 py-2 rounded-lg border border-line text-xs text-center font-bold"
                    />
                    <input
                      type="number"
                      value={tempVolumeZ}
                      onChange={e => setTempVolumeZ(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Z"
                      className="px-2 py-2 rounded-lg border border-line text-xs text-center font-bold"
                    />
                  </div>
                </div>

                {/* Đơn giá giờ máy — CỘT CÓ THẬT `workshop_machines.hourly_rate` */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-fg-muted flex items-center justify-between">
                    <span>Đơn giá giờ máy (VND/giờ)</span>
                    <span className="text-xs text-fg-subtle">Để trống = chưa khai</span>
                  </label>
                  <input
                    type="number"
                    step="1000"
                    value={tempHourlyRate}
                    onChange={e => setTempHourlyRate(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="VD: 60000"
                    className="w-full px-3 py-2 rounded-lg border border-line text-sm font-bold text-fg"
                  />
                </div>

                {/* Save button inside modal */}
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleSaveMachine}
                    className="w-full py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-primary-fg font-bold text-sm shadow-e1 transition-colors"
                  >
                    Lưu Máy In Này
                  </button>
                </div>
              </div>

              {/* ĐƠN GIÁ GIỜ MÁY — con số DUY NHẤT được lưu (`workshop_machines.hourly_rate`) */}
              <div className="p-4 rounded-lg bg-surface border border-primary/30 shadow-e1 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-md bg-primary-tint text-primary flex items-center justify-center shrink-0">
                    <Coins className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
                      Đơn giá giờ máy sẽ ghi vào hồ sơ
                    </span>
                    <div className="text-xs text-fg-subtle">
                      Lưu ở cột <code className="font-mono">workshop_machines.hourly_rate</code>. Bỏ trống =
                      chưa khai — hệ thống KHÔNG tự điền con số nào.
                    </div>
                  </div>
                </div>

                <div className="p-2 px-3 rounded-lg bg-positive-tint border border-positive/30 text-right">
                  <div className="text-xs uppercase font-bold text-positive">Đơn giá / giờ</div>
                  <div className="text-sm font-extrabold text-positive">
                    {currentHourlyRate != null
                      ? `${currentHourlyRate.toLocaleString('vi-VN')} đ/h`
                      : '— chưa khai'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Current declared machines list */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-fg-muted uppercase tracking-wider flex items-center justify-between">
              <span>Danh sách máy in của xưởng ({machines.length} máy sẵn sàng)</span>
              <span className="text-fg-subtle font-normal">Trạng thái mặc định: Free (Sẵn sàng nhận lệnh)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {machines.map((machine, idx) => {
                return (
                  <div
                    key={machine.id}
                    className="p-4 rounded-lg border border-line-subtle hover:border-line bg-surface shadow-e1 relative flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-sm bg-primary-tint text-primary flex items-center justify-center font-bold text-xs">
                            #{idx + 1}
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-fg">{machine.machineName}</h4>
                            <div className="text-xs text-fg-subtle">
                              {machine.machineType} • {machine.buildVolumeMm?.x}×{machine.buildVolumeMm?.y}×{machine.buildVolumeMm?.z} mm
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveMachine(machine.id)}
                          className="text-fg-subtle hover:text-danger p-1 transition-colors"
                          title="Xóa máy in"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-line-subtle text-xs">
                        <div>
                          <div className="text-xs text-fg-subtle">Khổ in (mm)</div>
                          <div className="font-semibold text-fg-muted tabular-nums">
                            {machine.buildVolumeMm
                              ? `${machine.buildVolumeMm.x}×${machine.buildVolumeMm.y}×${machine.buildVolumeMm.z}`
                              : '—'}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-fg-subtle">Đơn giá giờ máy</div>
                          <div className="font-semibold text-fg tabular-nums">
                            {machine.hourlyRate != null
                              ? `${machine.hourlyRate.toLocaleString('vi-VN')} đ/h`
                              : 'Chưa khai'}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs bg-canvas px-2.5 py-1.5 rounded-lg border border-line-subtle">
                      <span className="text-fg-subtle">Phân loại: {machine.machineType}</span>
                      <span className="inline-flex items-center gap-1 font-semibold text-positive">
                        <span className="w-1.5 h-1.5 rounded-full bg-positive" />
                        Trạng thái: Sẵn sàng
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-line-subtle flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-fg-muted hover:text-fg transition-colors"
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
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-primary-fg font-bold text-sm shadow-e1 transition-all"
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
        <div className="bg-surface rounded-lg shadow-e1 p-6 md:p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-fg flex items-center gap-2">
                <Layers className="w-5 h-5 text-primary" />
                Bước 3: Khai báo phôi nhựa & Vật liệu tồn kho ban đầu
              </h2>
              <p className="text-sm text-fg-subtle mt-0.5">
                Khai báo các cuộn nhựa đang có tại xưởng. Dữ liệu được lưu vào vật liệu của chính xưởng bạn.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setTempMaterialName('');
                setTempMaterialType('PLA');
                setTempPricePerKg('');
                setTempStockGrams('');
                setIsAddingMaterial(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-surface-inverse hover:bg-surface-inverse text-on-inverse text-xs font-bold shrink-0 transition-colors shadow-e1"
            >
              <Plus className="w-4 h-4" />
              Thêm Cuộn Nhựa Mới
            </button>
          </div>

          {/* Material Modal Form */}
          {isAddingMaterial && (
            <div className="p-5 rounded-lg bg-primary-tint border border-primary/30 space-y-4 shadow-e1 animate-fadeIn">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-fg flex items-center gap-2">
                  <Plus className="w-4 h-4 text-primary" />
                  Khai báo cuộn phôi nhựa mới
                </h3>
                <button
                  type="button"
                  onClick={() => setIsAddingMaterial(false)}
                  className="text-xs font-semibold text-fg-subtle hover:text-fg"
                >
                  Đóng lại
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Material Name */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-fg-muted">Tên cuộn nhựa / Thương hiệu</label>
                  <input
                    type="text"
                    value={tempMaterialName}
                    onChange={e => setTempMaterialName(e.target.value)}
                    placeholder="VD: eSUN PLA+ Đen Mờ, SUNLU PETG..."
                    className="w-full px-3 py-2 rounded-lg border border-line text-sm font-medium focus:ring-1 focus:ring-primary"
                  />
                </div>

                {/* Material Type */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-fg-muted">Loại vật liệu</label>
                  <select
                    value={tempMaterialType}
                    onChange={e => setTempMaterialType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-line text-sm font-medium focus:ring-1 focus:ring-primary"
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
                  <label className="text-xs font-semibold text-fg-muted">Tồn kho ban đầu (Gram)</label>
                  <input
                    type="number"
                    step="500"
                    value={tempStockGrams}
                    onChange={e => setTempStockGrams(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="VD: 3000g = 3 cuộn"
                    className="w-full px-3 py-2 rounded-lg border border-line text-sm font-bold text-primary"
                  />
                </div>

                {/* Price per KG */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-fg-muted">Đơn giá nhập (VND/kg)</label>
                  <input
                    type="number"
                    step="10000"
                    value={tempPricePerKg}
                    onChange={e => setTempPricePerKg(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="VD: 250000"
                    className="w-full px-3 py-2 rounded-lg border border-line text-sm font-bold text-fg"
                  />
                </div>

                {/* Low stock threshold — do XUONG khai, khong tu dien */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-fg-muted">
                    Ngưỡng cảnh báo tồn kho (gram)
                  </label>
                  <input
                    type="number"
                    step="100"
                    value={tempLowStockThreshold}
                    onChange={e => setTempLowStockThreshold(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="VD: 1000"
                    className="w-full px-3 py-2 rounded-lg border border-line text-sm font-bold text-fg"
                  />
                </div>

                {/* Color Swatch Picker */}
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-fg-muted flex items-center justify-between">
                    <span>Màu sắc phôi: {tempColorName}</span>
                    <span className="text-xs text-fg-subtle font-mono">{tempColorHex}</span>
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
                          tempColorHex === p.hex ? 'scale-115 border-primary ring-2 ring-primary/30' : 'border-line'
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
                      className="w-7 h-7 rounded-full cursor-pointer border border-line p-0 overflow-hidden"
                      title="Màu tùy chỉnh"
                    />
                  </div>
                </div>

                {/* Save button */}
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleSaveMaterial}
                    className="w-full py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-primary-fg font-bold text-sm shadow-e1 transition-colors"
                  >
                    Lưu Cuộn Nhựa Này
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Declared Materials List */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-fg-muted uppercase tracking-wider flex items-center justify-between">
              <span>Danh mục phôi sẵn sàng ({materials.length} loại nhựa)</span>
              <span className="text-fg-subtle font-normal">
                Tổng khối lượng: {materials.reduce((acc, m) => acc + m.currentStockGrams, 0).toLocaleString('vi-VN')} g
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {materials.map(mat => (
                <div
                  key={mat.id}
                  className="p-4 rounded-lg border border-line-subtle hover:border-line bg-surface shadow-e1 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-md border border-line shadow-e0 flex items-center justify-center shrink-0"
                      style={{ backgroundColor: mat.colorHex }}
                    >
                      <span
                        className="text-xs font-bold uppercase tracking-wider px-1 rounded-sm bg-surface-inverse/70 text-on-inverse"
                      >
                        {mat.materialType}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-fg">{mat.materialName}</h4>
                      <div className="text-xs text-fg-subtle">
                        {mat.colorName || 'Chuẩn'} • Giá nhập: {mat.pricePerKg.toLocaleString('vi-VN')} đ/kg
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-xs font-extrabold text-primary">
                        {(mat.currentStockGrams / 1000).toFixed(1)} kg
                      </div>
                      <div className="text-xs text-fg-subtle">
                        {mat.currentStockGrams.toLocaleString('vi-VN')} g
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveMaterial(mat.id)}
                      className="text-fg-subtle hover:text-danger p-1 transition-colors"
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
          <div className="p-4 rounded-lg bg-warning-tint/80 border border-warning/30 text-warning text-xs flex items-start gap-3">
            <Info className="w-5 h-5 text-warning shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Lưu ý về cơ chế cập nhật đơn giá và kiểm kê:</span>
              <p className="mt-0.5 text-warning">
                Mỗi lần ghi nhập/xuất kho ở bảng điều khiển, hệ thống lưu một dòng vào <code className="bg-warning-tint px-1 py-0.5 rounded-sm font-mono">material_inventory_logs</code> để kiểm toán. Đơn giá nhập bạn khai ở đây không tự đổi đơn giá báo cho khách.
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-line-subtle flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-fg-muted hover:text-fg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Quay lại Bước 2
            </button>
            <Button
              size="md"
              loading={isSubmitting}
              type="button"
              onClick={handleSubmitOnboarding}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span>Đang khởi tạo hồ sơ xưởng...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  Hoàn tất & Gửi hồ sơ phê duyệt
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 4: Success & Pending Approval State (verified_status = 'Pending') */}
      {/* ========================================================================= */}
      {currentStep === 4 && submittedProfile && (
        <div className="bg-surface rounded-lg shadow-e1 p-8 text-center space-y-6 animate-fadeIn">
          <div className="w-20 h-20 rounded-full bg-warning-tint text-warning flex items-center justify-center mx-auto ring-8 ring-warning-tint">
            <Clock className="w-10 h-10 animate-pulse" />
          </div>

          <div className="max-w-xl mx-auto space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-warning-tint border border-warning/40 text-xs font-bold text-warning">
              <span className="w-2 h-2 rounded-full bg-warning animate-ping" />
              verified_status: Pending (Chờ Admin Duyệt)
            </div>
            <h2 className="text-2xl font-bold text-fg tracking-tight">
              Đã Lưu Hồ Sơ Xưởng In
            </h2>
            <p className="text-sm text-fg-muted">
              Hồ sơ cơ sở <strong>"{submittedProfile.workshopName}"</strong> tại khu vực{' '}
              <strong>Miền {submittedProfile.region}</strong> đã được lưu với trạng thái chờ duyệt (Pending).
            </p>
          </div>

          {/* Summary Card */}
          <div className="max-w-lg mx-auto bg-canvas rounded-lg p-5 border border-line-subtle text-left space-y-3">
            <div className="text-xs font-bold text-fg-subtle uppercase tracking-wider">
              Tóm tắt hồ sơ vừa khai báo:
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="text-fg-subtle">Mã định danh xưởng:</div>
              <div className="font-mono font-bold text-fg">{submittedProfile.id}</div>

              <div className="text-fg-subtle">Số lượng máy in:</div>
              <div className="font-bold text-fg">{machines.length} máy FDM/SLA</div>

              <div className="text-fg-subtle">Tổng phôi nhựa tồn kho:</div>
              <div className="font-bold text-fg">
                {(materials.reduce((a, b) => a + b.currentStockGrams, 0) / 1000).toFixed(1)} kg ({materials.length} cuộn)
              </div>

              <div className="text-fg-subtle">Khu vực phục vụ:</div>
              <div className="font-bold text-primary">Miền {submittedProfile.region}</div>
            </div>
          </div>

          {/* Instructions */}
          <div className="max-w-lg mx-auto p-4 rounded-lg bg-info-tint/80 border border-info/30 text-info text-xs text-left space-y-1.5">
            <div className="font-bold flex items-center gap-1.5 text-info">
              <ShieldCheck className="w-4 h-4 text-info" />
              Các bước tiếp theo dành cho Đối tác Xưởng:
            </div>
            <ul className="list-disc list-inside space-y-1 text-info/90 pl-1">
              <li>Hồ sơ đang ở trạng thái <strong>Pending</strong>. Quyền xưởng chỉ có hiệu lực sau khi Quản trị viên chuyển <code className="font-mono">verified_status</code> sang <strong>Verified</strong>.</li>
              <li>Bạn có thể mở bảng điều khiển xưởng in ngay để khai báo máy in, vật liệu và xem dữ liệu của chính xưởng mình.</li>
              <li>Đầu mối liên hệ là hotline/email bạn vừa khai{submittedProfile.contactPhone ? `: ${submittedProfile.contactPhone}` : ''}.</li>
            </ul>
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (onSkipToDashboard) {
                  onSkipToDashboard();
                } else if (onNavigate) {
                  onNavigate('lab');
                } else {
                  window.location.reload();
                }
              }}
              className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-primary-fg font-bold text-sm shadow-e1 transition-all"
            >
              Mở Bảng Điều Khiển Xưởng
            </button>
            <button
              type="button"
              onClick={() => {
                if (onNavigate) {
                  onNavigate('home');
                }
              }}
              className="w-full sm:w-auto px-5 py-2.5 rounded-lg border border-line hover:bg-canvas text-fg-muted font-semibold text-sm transition-all"
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
