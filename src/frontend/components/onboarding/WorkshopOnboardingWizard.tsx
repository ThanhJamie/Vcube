import React, { useState, useMemo } from 'react';
import { Button, Input, Select } from '@frontend/ui';
import { formatCurrency, formatNumber } from '@frontend/lib/format';
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
      onShowToast?.('Vui lòng nhập đủ địa chỉ xưởng, số điện thoại điều phối và email kỹ thuật!');
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
        `Đã lưu hồ sơ xưởng cùng ${machines.length} máy in và ${materials.length} vật liệu. Trạng thái: chờ quản trị viên duyệt.`
      );
    }
  };

  return (
    <div className="mx-auto my-6 w-full max-w-5xl px-4 font-sans text-fg">
      {/* Top Header Card */}
      <div className="mb-6 overflow-hidden rounded-xl border border-line bg-surface">
        <div className="flex flex-col items-start justify-between gap-4 border-b border-line-subtle p-6 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <div className="grid size-14 place-items-center rounded-lg border border-line bg-surface-muted text-fg">
              <Printer className="size-6" aria-hidden="true" />
            </div>
            <div>
              <div className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary-tint px-2.5 py-1 text-xs font-medium text-fg">
                <Sparkles className="size-3.5" aria-hidden="true" />
                Đăng ký đối tác xưởng in (MES)
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-fg">
                Đăng ký đối tác xưởng in 3D (MES)
              </h1>
              <p className="mt-0.5 text-sm text-fg-muted">
                Khai báo cơ sở sản xuất của xưởng để VCUBE đối chiếu khi phân công đơn in
              </p>
            </div>
          </div>

          {currentStep < 4 && (
            <div className="flex items-center gap-2 rounded-lg border border-line bg-surface-muted px-3 py-1.5 text-xs text-fg-muted">
              <Clock className="size-4" aria-hidden="true" />
              <span>3 bước khai báo: cơ sở · máy in · vật liệu</span>
            </div>
          )}
        </div>

        {/* Progress Step Bar — 4 bước, §3.6 (xong = đen đặc, hiện tại = viền đen). */}
        {currentStep < 4 && (
          <div className="flex items-center gap-2 border-b border-line-subtle bg-surface-muted/50 p-4">
            {[
              { step: 1, label: 'Thông Tin Xưởng', sub: 'Địa chỉ & khu vực', icon: Building2 },
              { step: 2, label: 'Khai Báo Máy In', sub: 'Đơn giá giờ & khổ in', icon: Printer },
              { step: 3, label: 'Nhựa Tồn Kho', sub: 'Loại nhựa & Giá nhập', icon: Layers },
              { step: 4, label: 'Xác Nhận & Gửi', sub: 'Chờ duyệt', icon: Check }
            ].map(item => {
              const ItemIcon = item.icon;
              const isActive = currentStep === item.step;
              const isCompleted = currentStep > item.step;
              return (
                <React.Fragment key={item.step}>
                  {item.step > 1 ? (
                    <div
                      aria-hidden="true"
                      className={`hidden h-0.5 flex-1 sm:block ${currentStep >= item.step ? 'bg-primary' : 'bg-line-subtle'}`}
                    />
                  ) : null}
                  <button
                    type="button"
                    disabled={!isCompleted}
                    aria-current={isActive ? 'step' : undefined}
                    onClick={() => {
                      if (isCompleted) setCurrentStep(item.step as any);
                    }}
                    className={`flex items-center gap-2 rounded-md px-1 py-1 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-md:min-h-11 motion-reduce:transition-none ${
                      isCompleted ? 'cursor-pointer hover:bg-surface-muted' : ''
                    }`}
                  >
                    <div
                      className={`grid size-8 shrink-0 place-items-center rounded-full text-xs font-semibold ${
                        isCompleted
                          ? 'bg-primary text-primary-fg'
                          : isActive
                          ? 'border-2 border-primary text-primary'
                          : 'bg-surface-muted text-fg-muted'
                      }`}
                    >
                      {isCompleted ? <Check className="size-4" aria-hidden="true" /> : <ItemIcon className="size-4" aria-hidden="true" />}
                    </div>
                    <div className="hidden sm:block">
                      <div className={`text-xs font-semibold uppercase tracking-wider ${isActive ? 'text-fg' : 'text-fg-muted'}`}>
                        {item.label}
                      </div>
                      <div className="text-xs font-medium text-fg-muted">{item.sub}</div>
                    </div>
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* STEP 1: Workshop Information */}
      {/* ========================================================================= */}
      {currentStep === 1 && (
        <div className="space-y-6 rounded-xl border border-line bg-surface p-6 sm:p-8">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-fg">
              <Building2 className="size-5 text-fg-muted" aria-hidden="true" />
              Bước 1: Khai báo thông tin cơ sở sản xuất & Khu vực địa lý
            </h2>
            <p className="mt-1 text-sm text-fg-muted">
              Khu vực này được lưu vào hồ sơ xưởng để VCUBE đối chiếu khi phân công đơn in.
            </p>
          </div>

          {initialData?.verifiedStatus === 'Pending' && (
            <div className="flex flex-col justify-between gap-3 rounded-lg border border-info/20 bg-info-tint p-4 text-sm text-info sm:flex-row sm:items-center">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>
                  Hồ sơ xưởng <strong>{initialData?.workshopName}</strong> đã được gửi và đang ở trạng thái{' '}
                  <strong>Chờ duyệt</strong> (chờ quản trị viên duyệt). Bạn có thể khai lại hồ sơ bên dưới,
                  hoặc mở bảng điều khiển của xưởng ngay.
                </span>
              </div>
              {onSkipToDashboard && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="shrink-0"
                  onClick={onSkipToDashboard}
                >
                  Mở bảng điều khiển
                </Button>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {/* Workshop Name */}
            <div className="space-y-2">
              <label htmlFor="w1a-workshop-name" className="flex items-center gap-1 text-sm font-medium text-fg">
                Tên xưởng in / đầu mối gia công <span className="text-danger">*</span>
              </label>
              <Input
                id="w1a-workshop-name"
                type="text"
                value={workshopName}
                onChange={e => setWorkshopName(e.target.value)}
                placeholder="VD: Xưởng in CNC & 3D Cầu Giấy"
              />
              <span className="text-xs text-fg-subtle">Tên thương hiệu xưởng sẽ hiển thị trên tem đóng gói bưu phẩm</span>
            </div>

            {/* Hotline Phone */}
            <div className="space-y-2">
              <label htmlFor="w1a-workshop-phone" className="flex items-center gap-1 text-sm font-medium text-fg">
                <Phone className="size-3.5 text-fg-subtle" aria-hidden="true" />
                Số điện thoại điều phối <span className="text-danger">*</span>
              </label>
              <Input
                id="w1a-workshop-phone"
                type="text"
                value={contactPhone}
                onChange={e => setContactPhone(e.target.value)}
                placeholder="Nhập số điện thoại kỹ thuật"
              />
              <span className="text-xs text-fg-subtle">Nhận thông báo đơn hàng hỏa tốc qua Zalo / SMS</span>
            </div>

            {/* Contact Email */}
            <div className="space-y-2">
              <label htmlFor="w1a-workshop-email" className="flex items-center gap-1 text-sm font-medium text-fg">
                <Mail className="size-3.5 text-fg-subtle" aria-hidden="true" />
                Email kỹ thuật tiếp nhận tệp 3D <span className="text-danger">*</span>
              </label>
              <Input
                id="w1a-workshop-email"
                type="email"
                value={contactEmail}
                onChange={e => setContactEmail(e.target.value)}
                placeholder="VD: tech@xuongin3d.vn"
              />
            </div>
          </div>

          {/* Full Address */}
          <div className="space-y-2">
            <label htmlFor="w1a-workshop-address" className="flex items-center gap-1 text-sm font-medium text-fg">
              <MapPin className="size-3.5 text-fg-subtle" aria-hidden="true" />
              Địa Chỉ Chi Tiết Xưởng In <span className="text-danger">*</span>
            </label>
            <Input
              id="w1a-workshop-address"
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="Số nhà, ngõ/đường, Phường/Xã, Quận/Huyện, Tỉnh/TP"
            />
          </div>

          {/* Khu vực phục vụ của xưởng (Bắc / Trung / Nam) */}
          <div className="space-y-2 pt-2">
            <label className="flex items-center gap-1.5 text-sm font-medium text-fg">
              <Zap className="size-4 text-warning" aria-hidden="true" />
              Khu Vực Phục Vụ (Bắc / Trung / Nam) <span className="text-danger">*</span>
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                {
                  id: 'Bắc',
                  title: 'Miền Bắc (đầu mối Hà Nội)',
                  desc: 'Hà Nội, Hải Phòng, Bắc Ninh, Quảng Ninh...',
                  tag: 'Xưởng tại miền Bắc'
                },
                {
                  id: 'Trung',
                  title: 'Miền Trung (đầu mối Đà Nẵng)',
                  desc: 'Đà Nẵng, Huế, Quảng Nam, Quảng Ngãi...',
                  tag: 'Xưởng tại miền Trung'
                },
                {
                  id: 'Nam',
                  title: 'Miền Nam (đầu mối TP.HCM)',
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
                    aria-pressed={isSel}
                    className={`relative rounded-lg border p-4 text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      isSel
                        ? 'border-primary bg-primary-tint ring-1 ring-primary'
                        : 'border-line-subtle bg-surface hover:border-line-control hover:bg-surface-muted'
                    }`}
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-sm font-semibold text-fg">{item.title}</span>
                      {isSel && (
                        <div className="grid size-5 place-items-center rounded-full bg-primary text-primary-fg">
                          <Check className="size-3.5" aria-hidden="true" />
                        </div>
                      )}
                    </div>
                    {/* A11Y-03: nền `primary-tint` khi selected làm `fg-subtle` chỉ còn 4.37:1
                        (12px) ⇒ dùng `fg-muted` (6.63:1) cho mô tả của ô đang chọn; ô thường
                        giữ `fg-subtle`. */}
                    <p className={`line-clamp-2 text-xs ${isSel ? 'text-fg-muted' : 'text-fg-subtle'}`}>{item.desc}</p>
                    <div className="mt-2 inline-block rounded-sm bg-surface-muted px-2 py-0.5 text-xs font-medium text-fg-muted">
                      {item.tag}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Electricity base rate */}
          <div className="flex flex-col items-start justify-between gap-3 rounded-lg border border-line-subtle bg-surface-muted p-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-md bg-warning-tint text-warning">
                <Zap className="size-5" aria-hidden="true" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-fg">Đơn giá điện cơ sở của xưởng</h4>
                <p className="text-xs text-fg-subtle">Để trống nếu xưởng chưa khai — hệ thống KHÔNG tự điền đơn giá điện</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-28">
                <Input
                  type="number"
                  numeric
                  aria-label="Đơn giá điện cơ sở của xưởng (₫/kWh)"
                  align="right"
                  value={electricityRate}
                  placeholder="Chưa khai"
                  onChange={e => setElectricityRate(e.target.value === '' ? '' : Number(e.target.value))}
                  className="font-semibold"
                />
              </div>
              <span className="text-xs font-medium text-fg-muted">₫/kWh</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between border-t border-line-subtle pt-4">
            {onCancel ? (
              <Button type="button" variant="ghost" onClick={onCancel}>
                Hủy bỏ
              </Button>
            ) : (
              <div />
            )}
            <Button
              type="button"
              variant="primary"
              trailingIcon={<ArrowRight className="size-4" aria-hidden="true" />}
              onClick={() => {
                if (!workshopName.trim()) {
                  onShowToast?.('Vui lòng nhập tên xưởng in!');
                  return;
                }
                setCurrentStep(2);
              }}
            >
              Tiếp tục: Khai báo máy in
            </Button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: Declare 3D Printers with Live Calculations */}
      {/* ========================================================================= */}
      {currentStep === 2 && (
        <div className="space-y-6 rounded-xl border border-line bg-surface p-6 sm:p-8">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-fg">
                <Printer className="size-5 text-fg-muted" aria-hidden="true" />
                Bước 2: Khai báo đội ngũ máy in & Đơn giá giờ máy
              </h2>
              <p className="mt-0.5 text-sm text-fg-muted">
                Chọn từ các máy mẫu có sẵn hoặc thêm máy tùy biến. Đơn giá giờ máy là con số DUY NHẤT được lưu vào hồ sơ xưởng.
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              className="shrink-0"
              leadingIcon={<Plus className="size-4" aria-hidden="true" />}
              onClick={() => {
                setTempMachineName(`Máy In 3D FDM #${machines.length + 1}`);
                setTempMachineType('FDM');
                setTempHourlyRate('');
                setTempVolumeX('');
                setTempVolumeY('');
                setTempVolumeZ('');
                setIsAddingMachine(true);
              }}
            >
              Thêm Máy In Khác
            </Button>
          </div>

          {/* Preset Quick Selectors */}
          <div className="space-y-2">
            <span className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-fg-muted">
              <Sparkles className="size-3.5 text-warning" aria-hidden="true" />
              Chọn nhanh máy mẫu phổ biến để nạp cấu hình chuẩn:
            </span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {POPULAR_PRINTER_PRESETS.map(preset => (
                <button
                  type="button"
                  key={preset.id}
                  onClick={() => handleSelectPreset(preset)}
                  className="group rounded-lg border border-line-subtle p-3 text-left transition-colors duration-200 hover:border-line-control hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="mb-0.5 text-xs font-medium uppercase tracking-wider text-fg-muted">
                    {preset.brand}
                  </div>
                  <div className="line-clamp-1 text-sm font-semibold text-fg group-hover:text-fg">
                    {preset.name}
                  </div>
                  <div className="mt-1 text-xs text-fg-subtle">
                    {preset.technology} • {preset.buildVolumeMm.x}×{preset.buildVolumeMm.y}×
                    {preset.buildVolumeMm.z} mm
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Machine Addition/Edit Modal / Form */}
          {isAddingMachine && (
            <div className="space-y-4 rounded-lg border border-line bg-surface-muted p-5">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-base font-semibold tracking-tight text-fg">
                  <Printer className="size-4 text-fg-muted" aria-hidden="true" />
                  Cấu hình chi tiết máy in
                </h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAddingMachine(false)}
                >
                  Đóng lại
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Machine Name */}
                <div className="space-y-2 sm:col-span-2">
                  <label htmlFor="w1a-machine-name" className="text-sm font-medium text-fg">Tên máy in / Ký hiệu định danh</label>
                  <Input
                    id="w1a-machine-name"
                    type="text"
                    value={tempMachineName}
                    onChange={e => setTempMachineName(e.target.value)}
                    placeholder="VD: Bambu Lab X1C - Máy số 1"
                  />
                </div>

                {/* Machine Tech */}
                <div className="space-y-2">
                  <label htmlFor="w1a-machine-tech" className="text-sm font-medium text-fg">Công nghệ in</label>
                  <Select
                    id="w1a-machine-tech"
                    value={tempMachineType}
                    onChange={e => setTempMachineType(e.target.value as any)}
                    options={[
                      { value: 'FDM', label: 'FDM / FFF (Sợi nhựa)' },
                      { value: 'SLA', label: 'SLA / MSLA (Quang hóa Resin)' },
                      { value: 'SLS', label: 'SLS (Bột laser nung kết)' },
                    ]}
                  />
                </div>

                {/* Build Volume */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-fg">Khổ in (X × Y × Z mm)</label>
                  <div className="grid grid-cols-3 gap-1">
                    <Input
                      type="number"
                      numeric
                      aria-label="Khổ in trục X (mm)"
                      value={tempVolumeX}
                      onChange={e => setTempVolumeX(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="X"
                      className="px-2 text-center font-semibold"
                    />
                    <Input
                      type="number"
                      numeric
                      aria-label="Khổ in trục Y (mm)"
                      value={tempVolumeY}
                      onChange={e => setTempVolumeY(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Y"
                      className="px-2 text-center font-semibold"
                    />
                    <Input
                      type="number"
                      numeric
                      aria-label="Khổ in trục Z (mm)"
                      value={tempVolumeZ}
                      onChange={e => setTempVolumeZ(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Z"
                      className="px-2 text-center font-semibold"
                    />
                  </div>
                </div>

                {/* Đơn giá giờ máy — CỘT CÓ THẬT `workshop_machines.hourly_rate` */}
                <div className="space-y-2">
                  <label htmlFor="w1a-machine-rate" className="flex items-center justify-between gap-2 text-sm font-medium text-fg">
                    <span>Đơn giá giờ máy (VND/giờ)</span>
                    <span className="text-xs font-normal text-fg-subtle">Để trống = chưa khai</span>
                  </label>
                  <Input
                    id="w1a-machine-rate"
                    type="number"
                    step="1000"
                    numeric
                    value={tempHourlyRate}
                    onChange={e => setTempHourlyRate(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="VD: 60000"
                    className="font-semibold"
                  />
                </div>

                {/* Save button inside modal */}
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="primary"
                    fullWidth
                    onClick={handleSaveMachine}
                  >
                    Lưu Máy In Này
                  </Button>
                </div>
              </div>

              {/* ĐƠN GIÁ GIỜ MÁY — con số DUY NHẤT được lưu (`workshop_machines.hourly_rate`) */}
              <div className="flex flex-col items-center justify-between gap-4 rounded-lg border border-line bg-surface p-4 md:flex-row">
                <div className="flex items-center gap-3">
                  <div className="grid size-10 shrink-0 place-items-center rounded-md bg-primary-tint text-fg">
                    <Coins className="size-5" aria-hidden="true" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
                      Đơn giá giờ máy sẽ ghi vào hồ sơ
                    </span>
                    <div className="text-xs text-fg-subtle">
                      Lưu ở cột <code className="font-mono">workshop_machines.hourly_rate</code>. Bỏ trống =
                      chưa khai — hệ thống KHÔNG tự điền con số nào.
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-positive/20 bg-positive-tint px-3 py-2 text-right">
                  <div className="text-xs font-medium uppercase tracking-wider text-positive">Đơn giá / giờ</div>
                  <div className="font-mono text-sm font-semibold tabular-nums text-positive">
                    {currentHourlyRate != null
                      ? `${formatCurrency(currentHourlyRate)}/giờ`
                      : '— chưa khai'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Current declared machines list */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-fg-muted">
              <span>Danh sách máy in của xưởng ({machines.length} máy sẵn sàng)</span>
              <span className="font-normal normal-case text-fg-subtle">Trạng thái mặc định: Rảnh (sẵn sàng nhận lệnh)</span>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {machines.map((machine, idx) => {
                return (
                  <div
                    key={machine.id}
                    className="relative flex flex-col justify-between gap-3 rounded-lg border border-line bg-surface p-4 transition-all duration-300 hover:border-line hover:shadow-e1 motion-reduce:transition-none"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="grid size-8 place-items-center rounded-sm bg-primary-tint text-xs font-semibold text-fg">
                            #{idx + 1}
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-fg">{machine.machineName}</h4>
                            <div className="text-xs text-fg-subtle">
                              {machine.machineType} • {machine.buildVolumeMm?.x}×{machine.buildVolumeMm?.y}×{machine.buildVolumeMm?.z} mm
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveMachine(machine.id)}
                          className="inline-flex items-center justify-center rounded-md p-2 text-fg-subtle transition-colors hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-md:min-h-11 max-md:min-w-11"
                          title="Xoá máy in"
                          aria-label={`Xóa máy in ${machine.machineName}`}
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </button>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-line-subtle pt-3 text-xs">
                        <div>
                          <div className="text-xs text-fg-subtle">Khổ in (mm)</div>
                          <div className="font-mono font-semibold tabular-nums text-fg-muted">
                            {machine.buildVolumeMm
                              ? `${machine.buildVolumeMm.x}×${machine.buildVolumeMm.y}×${machine.buildVolumeMm.z}`
                              : '—'}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-fg-subtle">Đơn giá giờ máy</div>
                          <div className="font-mono font-semibold tabular-nums text-fg">
                            {machine.hourlyRate != null
                              ? `${formatCurrency(machine.hourlyRate)}/giờ`
                              : 'Chưa khai'}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between rounded-md border border-line-subtle bg-surface-muted px-2.5 py-1.5 text-xs">
                      <span className="text-fg-subtle">Phân loại: {machine.machineType}</span>
                      <span className="inline-flex items-center gap-1 font-medium text-positive">
                        <span aria-hidden="true" className="size-1.5 rounded-full bg-positive" />
                        Trạng thái: Sẵn sàng
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between border-t border-line-subtle pt-4">
            <Button
              type="button"
              variant="ghost"
              leadingIcon={<ArrowLeft className="size-4" aria-hidden="true" />}
              onClick={() => setCurrentStep(1)}
            >
              Quay lại Bước 1
            </Button>
            <Button
              type="button"
              variant="primary"
              trailingIcon={<ArrowRight className="size-4" aria-hidden="true" />}
              onClick={() => {
                if (machines.length === 0) {
                  onShowToast?.('Vui lòng khai báo tối thiểu 1 máy in!');
                  return;
                }
                setCurrentStep(3);
              }}
            >
              Tiếp tục: Khai báo tồn kho nhựa
            </Button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: Declare Material / Filament Inventory */}
      {/* ========================================================================= */}
      {currentStep === 3 && (
        <div className="space-y-6 rounded-xl border border-line bg-surface p-6 sm:p-8">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-fg">
                <Layers className="size-5 text-fg-muted" aria-hidden="true" />
                Bước 3: Khai báo phôi nhựa & Vật liệu tồn kho ban đầu
              </h2>
              <p className="mt-0.5 text-sm text-fg-muted">
                Khai báo các cuộn nhựa đang có tại xưởng. Dữ liệu được lưu vào vật liệu của chính xưởng bạn.
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              className="shrink-0"
              leadingIcon={<Plus className="size-4" aria-hidden="true" />}
              onClick={() => {
                setTempMaterialName('');
                setTempMaterialType('PLA');
                setTempPricePerKg('');
                setTempStockGrams('');
                setIsAddingMaterial(true);
              }}
            >
              Thêm Cuộn Nhựa Mới
            </Button>
          </div>

          {/* Material Modal Form */}
          {isAddingMaterial && (
            <div className="space-y-4 rounded-lg border border-line bg-surface-muted p-5">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-base font-semibold tracking-tight text-fg">
                  <Plus className="size-4 text-fg-muted" aria-hidden="true" />
                  Khai báo cuộn phôi nhựa mới
                </h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAddingMaterial(false)}
                >
                  Đóng lại
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Material Name */}
                <div className="space-y-2 sm:col-span-2">
                  <label htmlFor="w1a-material-name" className="text-sm font-medium text-fg">Tên cuộn nhựa / Thương hiệu</label>
                  <Input
                    id="w1a-material-name"
                    type="text"
                    value={tempMaterialName}
                    onChange={e => setTempMaterialName(e.target.value)}
                    placeholder="VD: eSUN PLA+ Đen Mờ, SUNLU PETG..."
                  />
                </div>

                {/* Material Type */}
                <div className="space-y-2">
                  <label htmlFor="w1a-material-type" className="text-sm font-medium text-fg">Loại vật liệu</label>
                  <Select
                    id="w1a-material-type"
                    value={tempMaterialType}
                    onChange={e => setTempMaterialType(e.target.value as any)}
                    options={[
                      { value: 'PLA', label: 'PLA / PLA+ (Phổ biến, dễ in)' },
                      { value: 'PETG', label: 'PETG (Bền cơ, chịu nước ngoài trời)' },
                      { value: 'ABS', label: 'ABS / ASA (Chịu nhiệt, vỏ xe máy)' },
                      { value: 'TPU', label: 'TPU (Nhựa dẻo đàn hồi)' },
                      { value: 'PC', label: 'Polycarbonate (PC siêu cứng)' },
                      { value: 'Resin', label: 'Resin Quang Hóa 8K/12K (Mịn sắc nét)' },
                    ]}
                  />
                </div>

                {/* Initial Stock in Grams */}
                <div className="space-y-2">
                  <label htmlFor="w1a-material-stock" className="text-sm font-medium text-fg">Tồn kho ban đầu (Gram)</label>
                  <Input
                    id="w1a-material-stock"
                    type="number"
                    step="500"
                    numeric
                    value={tempStockGrams}
                    onChange={e => setTempStockGrams(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="VD: 3000g = 3 cuộn"
                    className="font-semibold"
                  />
                </div>

                {/* Price per KG */}
                <div className="space-y-2">
                  <label htmlFor="w1a-material-price" className="text-sm font-medium text-fg">Đơn giá nhập (VND/kg)</label>
                  <Input
                    id="w1a-material-price"
                    type="number"
                    step="10000"
                    numeric
                    value={tempPricePerKg}
                    onChange={e => setTempPricePerKg(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="VD: 250000"
                    className="font-semibold"
                  />
                </div>

                {/* Low stock threshold — do XUONG khai, khong tu dien */}
                <div className="space-y-2">
                  <label htmlFor="w1a-material-threshold" className="text-sm font-medium text-fg">
                    Ngưỡng cảnh báo tồn kho (gram)
                  </label>
                  <Input
                    id="w1a-material-threshold"
                    type="number"
                    step="100"
                    numeric
                    value={tempLowStockThreshold}
                    onChange={e => setTempLowStockThreshold(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="VD: 1000"
                    className="font-semibold"
                  />
                </div>

                {/* Color Swatch Picker */}
                <div className="space-y-2 sm:col-span-2">
                  <label className="flex items-center justify-between gap-2 text-sm font-medium text-fg">
                    <span>Màu sắc phôi: {tempColorName}</span>
                    <span className="font-mono text-xs font-normal text-fg-subtle">{tempColorHex}</span>
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    {PRESET_MATERIAL_PALETTE.map(p => (
                      <button
                        type="button"
                        key={p.name}
                        onClick={() => {
                          setTempColorHex(p.hex);
                          setTempColorName(p.name);
                        }}
                        aria-pressed={tempColorHex === p.hex}
                        className={`size-7 rounded-full border-2 transition-transform duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-md:size-11 motion-reduce:transition-none ${
                          tempColorHex === p.hex ? 'ring-2 ring-ring ring-offset-1' : ''
                        }`}
                        style={{ backgroundColor: p.hex, borderColor: tempColorHex === p.hex ? 'var(--color-ring)' : 'var(--color-line-control)' }}
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
                      aria-label="Màu tùy chỉnh"
                      className="size-7 cursor-pointer overflow-hidden rounded-full border border-line-control p-0 max-md:size-11"
                      title="Màu tùy chỉnh"
                    />
                  </div>
                </div>

                {/* Save button */}
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="primary"
                    fullWidth
                    onClick={handleSaveMaterial}
                  >
                    Lưu Cuộn Nhựa Này
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Declared Materials List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-fg-muted">
              <span>Danh mục phôi sẵn sàng ({materials.length} loại nhựa)</span>
              <span className="font-normal normal-case text-fg-subtle">
                Tổng khối lượng: {formatNumber(materials.reduce((acc, m) => acc + m.currentStockGrams, 0))} g
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {materials.map(mat => (
                <div
                  key={mat.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface p-4 transition-all duration-300 hover:border-line hover:shadow-e1 motion-reduce:transition-none"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="grid size-10 shrink-0 place-items-center rounded-md border border-line"
                      style={{ backgroundColor: mat.colorHex }}
                    >
                      <span
                        className="rounded-sm bg-surface-inverse/80 px-1 text-xs font-semibold uppercase tracking-wider text-on-inverse"
                      >
                        {mat.materialType}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-fg">{mat.materialName}</h4>
                      <div className="text-xs text-fg-subtle">
                        {mat.colorName || 'Chuẩn'} • Giá nhập: {formatCurrency(mat.pricePerKg)}/kg
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-mono text-sm font-semibold tabular-nums text-fg">
                        {(mat.currentStockGrams / 1000).toFixed(1)} kg
                      </div>
                      <div className="text-xs text-fg-subtle">
                        {formatNumber(mat.currentStockGrams)} g
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveMaterial(mat.id)}
                      className="inline-flex items-center justify-center rounded-md p-2 text-fg-subtle transition-colors hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-md:min-h-11 max-md:min-w-11"
                      title="Xoá vật liệu"
                      aria-label={`Xóa vật liệu ${mat.materialName}`}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notice about Auto Price Update & Audit Log */}
          <div className="flex items-start gap-3 rounded-lg border border-warning/20 bg-warning-tint p-4 text-xs text-warning">
            <Info className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
            <div>
              <span className="font-semibold">Lưu ý về cơ chế cập nhật đơn giá và kiểm kê:</span>
              <p className="mt-0.5 text-warning">
                Mỗi lần ghi nhập/xuất kho ở bảng điều khiển, hệ thống lưu một dòng vào <code className="rounded-sm bg-surface px-1 py-0.5 font-mono">material_inventory_logs</code> để kiểm toán. Đơn giá nhập bạn khai ở đây không tự đổi đơn giá báo cho khách.
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between border-t border-line-subtle pt-4">
            <Button
              type="button"
              variant="ghost"
              leadingIcon={<ArrowLeft className="size-4" aria-hidden="true" />}
              onClick={() => setCurrentStep(2)}
            >
              Quay lại Bước 2
            </Button>
            <Button
              size="md"
              loading={isSubmitting}
              loadingLabel="Đang khởi tạo hồ sơ xưởng…"
              type="button"
              onClick={handleSubmitOnboarding}
              disabled={isSubmitting}
              leadingIcon={<CheckCircle2 className="size-4" aria-hidden="true" />}
            >
              Hoàn tất &amp; Gửi hồ sơ phê duyệt
            </Button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 4: Success & Pending Approval State (verified_status = 'Pending') */}
      {/* ========================================================================= */}
      {currentStep === 4 && submittedProfile && (
        <div className="space-y-6 rounded-xl border border-line bg-surface p-6 text-center sm:p-8">
          <div className="mx-auto grid size-16 place-items-center rounded-lg border border-info/20 bg-info-tint text-info">
            <Clock className="size-8" aria-hidden="true" />
          </div>

          <div className="mx-auto max-w-xl space-y-2">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-info/20 bg-info-tint px-3 py-1 text-xs font-medium text-info">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-info" />
              verified_status: Pending — chờ quản trị viên duyệt
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-fg">
              Đã Lưu Hồ Sơ Xưởng In
            </h2>
            <p className="text-sm text-fg-muted">
              Hồ sơ cơ sở <strong>"{submittedProfile.workshopName}"</strong> tại khu vực{' '}
              <strong>Miền {submittedProfile.region}</strong> đã được lưu với trạng thái chờ duyệt.
            </p>
          </div>

          {/* Summary Card */}
          <div className="mx-auto max-w-lg space-y-3 rounded-lg border border-line-subtle bg-surface-muted p-5 text-left">
            <div className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">
              Tóm tắt hồ sơ vừa khai báo:
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="text-fg-subtle">Mã định danh xưởng:</div>
              <div className="font-mono font-semibold text-fg">{submittedProfile.id}</div>

              <div className="text-fg-subtle">Số lượng máy in:</div>
              <div className="font-semibold tabular-nums text-fg">{machines.length} máy FDM/SLA</div>

              <div className="text-fg-subtle">Tổng phôi nhựa tồn kho:</div>
              <div className="font-semibold tabular-nums text-fg">
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
            <ul className="list-disc list-inside space-y-1 text-info pl-1">
              <li>Hồ sơ đang ở trạng thái <strong>Chờ duyệt</strong>. Quyền xưởng chỉ có hiệu lực sau khi quản trị viên chuyển <code className="font-mono">verified_status</code> sang <strong>Đã duyệt</strong>.</li>
              <li>Bạn có thể mở bảng điều khiển xưởng in ngay để khai báo máy in, vật liệu và xem dữ liệu của chính xưởng mình.</li>
              <li>Đầu mối liên hệ là số điện thoại/email bạn vừa khai{submittedProfile.contactPhone ? `: ${submittedProfile.contactPhone}` : ''}.</li>
            </ul>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col items-center justify-center gap-3 pt-2 sm:flex-row">
            <Button
              type="button"
              variant="primary"
              className="w-full sm:w-auto"
              onClick={() => {
                if (onSkipToDashboard) {
                  onSkipToDashboard();
                } else if (onNavigate) {
                  onNavigate('lab');
                } else {
                  window.location.reload();
                }
              }}
            >
              Mở Bảng Điều Khiển Xưởng
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={() => {
                if (onNavigate) {
                  onNavigate('home');
                }
              }}
            >
              Về Trang Chủ VCUBE
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkshopOnboardingWizard;
