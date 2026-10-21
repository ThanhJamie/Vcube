import React, { useState, useEffect, useRef } from 'react';
import { MaterialProfile, PrinterProfile, InkiriCostFormulaConfig, VolumeDiscountTier, AccessoryItem } from '../../types';
import {
  MARKETPLACE_FEE_MAX_PERCENT,
  MARKETPLACE_FEE_MIN_PERCENT,
  VAT_MAX_PERCENT,
  VAT_MIN_PERCENT,
  getStore,
  peekSettings,
  savePricingGlobalSettings,
  settingsAccessors,
  subscribeSettings,
  validateSetting,
  type PricingGlobalSettings,
} from '../../../backend/services/settingsService';
import { computeElectricityCostVnd, computeLaborCostVnd } from '../../../utils/pricingEngine';
import { computeVat, vatRateFromPercent } from '../../lib/vat';
import { formatNumber } from '../../lib/format';
import { INKIRI_REFERENCE_VALUES } from '../../../data/mockData';
import { AccessoriesManager } from './AccessoriesManager';
import { WarehouseInventoryPanel } from './WarehouseInventoryPanel';
import { WorkshopEstimatorBOM } from './WorkshopEstimatorBOM';
import { ConfirmDialog } from '@frontend/ui';
import { PricingHeader } from './pricing/PricingHeader';
import { FormulaTab } from './pricing/FormulaTab';
import { MaterialsTab, MaterialEditorModal } from './pricing/MaterialsSection';
import { PrintersTab, PrinterEditorModal } from './pricing/PrintersSection';
import {
  PREVIEW_EXAMPLE,
  PREVIEW_KWH,
  formatPreviewDelta,
  formatPreviewVnd,
  isConfiguredNumber,
  referenceFormulaForm,
  referenceGlobalForm,
} from './pricing/pricingShared';
import type { GlobalFormField } from './pricing/pricingShared';
import type {
  FormulaTabProps,
  MaterialEditorModalProps,
  MaterialsTabProps,
  PricingHeaderProps,
  PrinterEditorModalProps,
  PrintersTabProps,
} from './pricing/types';

interface PricingConfigPanelProps {
  initialSubTab?: 'formula' | 'materials' | 'printers' | 'accessories' | 'inventory' | 'estimator';
  materials: MaterialProfile[];
  printers: PrinterProfile[];
  accessories: AccessoryItem[];
  pricingConfig: InkiriCostFormulaConfig;
  onUpdateMaterials: (materials: MaterialProfile[]) => void;
  onUpdatePrinters: (printers: PrinterProfile[]) => void;
  onUpdateAccessories: (accessories: AccessoryItem[]) => void;
  onUpdatePricingConfig: (config: InkiriCostFormulaConfig) => Promise<{ success: boolean; error?: string }> | void;
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
  const [pendingDeleteMaterial, setPendingDeleteMaterial] = useState<{ id: string; name: string } | null>(null);
  const [pendingDeletePrinter, setPendingDeletePrinter] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (initialSubTab) {
      setSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  // Working local copies
  const [formulaForm, setFormulaForm] = useState<Partial<InkiriCostFormulaConfig>>(() => ({ ...pricingConfig }));
  const [formulaIssues, setFormulaIssues] = useState<Record<string, string>>({});

  // ---------------------------------------------------------------------------
  // `pricing_configs` — NGUỒN SỰ THẬT LÀ DB. `settingsService` phân biệt
  // `undefined` = CHƯA ĐỌC với `null` = ĐÃ ĐỌC nhưng CHƯA CẤU HÌNH.
  // Chưa cấu hình ⇒ form để TRỐNG + "Chưa cấu hình"; KHÔNG hiển thị
  // `DEFAULT_INKIRI_FORMULA_CONFIG` (hằng số trong mã) như thể đã lưu.
  // (docs/design/data-honesty.md §"Unknown-metric display"; 09-admin-settings.md §3.2 #1)
  // ---------------------------------------------------------------------------
  const [dbFormulaState, setDbFormulaState] = useState<'loading' | 'missing' | 'loaded' | 'error'>('loading');
  const appliedFormulaRef = useRef<string>('__unset__');
  /**
   * Đợt U: `true` = form đang giữ BỘ SỐ MẪU INKIRI (chưa được admin xem xét và lưu).
   * Dùng để (a) hiện BĂNG-RÔN bắt buộc, (b) tô viền NÉT ĐỨT cho các ô đang là số mẫu.
   * TẮT khi admin bấm LƯU thành công — tức "đã xem và chọn".
   */
  const [formulaIsReference, setFormulaIsReference] = useState(false);
  const [globalIsReference, setGlobalIsReference] = useState(false);

  useEffect(() => {
    const applyFromCache = () => {
      if (peekSettings('pricing_configs') === undefined) return; // chưa đọc xong
      const cfg = settingsAccessors.pricingConfig();
      const signature = JSON.stringify(cfg ?? null);
      if (signature === appliedFormulaRef.current) return; // không ghi đè bản đang sửa
      appliedFormulaRef.current = signature;
      setFormulaIssues({});
      if (cfg) {
        setFormulaForm({ ...cfg });
        setFormulaIsReference(false);
      } else {
        // Đợt U: `pricing_configs` TRỐNG ⇒ ĐIỀN SẴN bộ số mẫu Inkiri vào FORM
        // (admin chỉ cần xem lại + bấm LƯU). KHÔNG ghi DB ở bước này.
        setFormulaForm(referenceFormulaForm());
        setFormulaIsReference(true);
      }
      setDbFormulaState(cfg ? 'loaded' : 'missing');
    };

    const unsubscribe = subscribeSettings(applyFromCache);
    if (peekSettings('pricing_configs') === undefined) {
      void getStore('pricing_configs').then((res) => {
        if (res.error) setDbFormulaState('error');
        else applyFromCache();
      });
    }
    return unsubscribe;
  }, []);

  // ---------------------------------------------------------------------------
  // `pricing_global_settings` — VAT · điện · nhân công · phí nền tảng. KHO RIÊNG (có audit).
  // Ô trống = "chưa cấu hình" (ghi `null`), KHÔNG tự điền 8% / 2850 / 65000 / 8.
  // ---------------------------------------------------------------------------
  const [globalForm, setGlobalForm] = useState<Record<GlobalFormField, string>>({
    vatPercent: '',
    electricityRateVnd: '',
    laborHourlyRateVnd: '',
    marketplaceFeePercent: '',
  });
  const [globalIssues, setGlobalIssues] = useState<Record<string, string>>({});
  const [globalSaving, setGlobalSaving] = useState<boolean>(false);
  const appliedGlobalRef = useRef<string>('__unset__');

  useEffect(() => {
    const applyGlobalFromCache = () => {
      if (peekSettings('pricing_global_settings') === undefined) return;
      const g = settingsAccessors.pricingGlobal();
      const signature = JSON.stringify([
        g?.vatPercent ?? null,
        g?.electricityRateVnd ?? null,
        g?.laborHourlyRateVnd ?? null,
        g?.marketplaceFeePercent ?? null,
      ]);
      if (signature === appliedGlobalRef.current) return; // không ghi đè bản đang sửa
      appliedGlobalRef.current = signature;
      const asText = (v: number | null | undefined) => (isConfiguredNumber(v) ? String(v) : '');
      const anyConfigured =
        isConfiguredNumber(g?.vatPercent) ||
        isConfiguredNumber(g?.electricityRateVnd) ||
        isConfiguredNumber(g?.laborHourlyRateVnd) ||
        isConfiguredNumber(g?.marketplaceFeePercent);
      if (!anyConfigured) {
        // Đợt U: hàng `pricing_global_settings` CHƯA có số nào ⇒ điền sẵn số mẫu Inkiri (KHÔNG ghi DB).
        setGlobalForm(referenceGlobalForm());
        setGlobalIsReference(true);
        return;
      }
      setGlobalForm({
        vatPercent: asText(g?.vatPercent),
        electricityRateVnd: asText(g?.electricityRateVnd),
        laborHourlyRateVnd: asText(g?.laborHourlyRateVnd),
        marketplaceFeePercent: asText(g?.marketplaceFeePercent),
      });
      setGlobalIsReference(false);
    };

    const unsubscribe = subscribeSettings(applyGlobalFromCache);
    if (peekSettings('pricing_global_settings') === undefined) void getStore('pricing_global_settings');
    return unsubscribe;
  }, []);

  // Material Modal/Edit States
  // ⚠️ KHÔNG prefill số liệu bịa: mọi ô số để TRỐNG, admin phải nhập giá trị thật.
  const [editingMaterial, setEditingMaterial] = useState<MaterialProfile | null>(null);
  const [isNewMaterialOpen, setIsNewMaterialOpen] = useState<boolean>(false);
  const [materialIssues, setMaterialIssues] = useState<Record<string, string>>({});
  const [materialForm, setMaterialForm] = useState<Partial<MaterialProfile>>({
    name: '',
    brand: '',
    density: undefined,
    strength: '',
    heatResistance: '',
    flexibility: '',
    costPerKg: undefined,
    pricePerGram: undefined,
    unitPriceMultiplier: undefined,
    spoolWeightGrams: undefined,
    extruderTempMin: undefined,
    extruderTempMax: undefined,
    bedTemp: undefined,
    colors: [],
    desc: '',
    recommendedFor: '',
    inStock: false,
    stockRollsCount: undefined,
    failureExtraPercent: null,
  });

  // Printer Modal/Edit States
  // ⚠️ KHÔNG prefill số liệu bịa (khổ bàn 256³, giá máy 28tr, kW 0.18 … để TRỐNG).
  const [editingPrinter, setEditingPrinter] = useState<PrinterProfile | null>(null);
  const [isNewPrinterOpen, setIsNewPrinterOpen] = useState<boolean>(false);
  const [printerIssues, setPrinterIssues] = useState<Record<string, string>>({});
  const [printerForm, setPrinterForm] = useState<Partial<PrinterProfile>>({
    name: '',
    brand: '',
    technology: undefined,
    bedDimensions: { x: undefined, y: undefined, z: undefined } as unknown as PrinterProfile['bedDimensions'],
    nozzleDiameter: undefined,
    powerKW: undefined,
    acquisitionCost: undefined,
    expectedLifetimeHours: undefined,
    consumablesHourlyRate: undefined,
    hourlyRate: undefined,
    maxPrintSpeedMmS: undefined,
    heatedBedMaxTemp: undefined,
    hasEnclosure: false,
    hasAMS: false,
    status: 'Idle',
    // Năng suất in khai báo (g/giờ). `null` = CHƯA KHAI — không có số mặc định.
    throughputGramsPerHour: null,
  });

  /**
   * Ô nhập rỗng ⇒ `undefined` (CHƯA CẤU HÌNH) — KHÔNG rơi về `0` hay một số đoán.
   * `0` chỉ được lưu khi admin thật sự gõ `0`.
   */
  const numberOrUndefined = (text: string): number | undefined => (String(text).trim() === '' ? undefined : Number(text));

  /** Định mức phút nhân công — chỉ tính tổng khi MỌI ô đã được cấu hình. */
  const laborMinuteFields = [
    'fileReviewLaborMinutes',
    'setupLaborMinutes',
    'supportRemovalMinutes',
    'postProcessingLaborMinutes',
    'qcLaborMinutes',
    'packagingLaborMinutes',
  ] as const;
  const laborMinuteValues = laborMinuteFields.map((f) => formulaForm[f]);
  const totalLaborMins: number | null = laborMinuteValues.every(isConfiguredNumber)
    ? (laborMinuteValues as number[]).reduce((sum, v) => sum + v, 0)
    : null;
  const laborCostPerUnit: number | null =
    totalLaborMins !== null && isConfiguredNumber(formulaForm.laborHourlyRate)
      ? Math.round((totalLaborMins / 60) * formulaForm.laborHourlyRate)
      : null;

  /** Trường SỐ bắt buộc của công thức giá — thiếu ⇒ CHẶN LƯU + lỗi cạnh ô nhập. */
  const REQUIRED_FORMULA_FIELDS: { key: string; label: string; min?: number; max?: number; exclusiveMin?: boolean }[] = [
    // ⚠️ Đợt P: `electricityRatePerKWh` và `laborHourlyRate` ĐÃ BỊ BỎ khỏi danh sách này —
    // nguồn thật của chúng là mục 0 (`pricing_global_settings`), engine KHÔNG đọc bản trong
    // công thức nữa. Giữ chúng ở đây sẽ chặn Lưu một cách vô nghĩa.
    // `defaultMachineDepreciationPerHour` cũng bỏ: bỏ trống thì engine TỰ TÍNH
    // = giá mua ÷ tuổi thọ của chính máy đó (xem `pricingEngine.resolveGlobalRates`).
    { key: 'noSupportRemovalMinutes', label: 'Bóc vật liệu đỡ khi KHÔNG có vật liệu đỡ (phút)', min: 0 },
    { key: 'fixedPackagingCost', label: 'Phí đóng gói cố định', min: 0 },
    { key: 'ipaSolventCost', label: 'Chi phí cồn IPA & dung môi', min: 0 },
    { key: 'multiColorPackagingExtra', label: 'Phụ phí đóng gói in đa màu', min: 0 },
    { key: 'overheadPerUnit', label: 'Chi phí quản lý mặt bằng xưởng', min: 0 },
    { key: 'fileReviewLaborMinutes', label: 'Duyệt tệp & cắt lớp', min: 0 },
    { key: 'setupLaborMinutes', label: 'Cài đặt máy & bàn in', min: 0 },
    { key: 'supportRemovalMinutes', label: 'Tách vật liệu đỡ', min: 0 },
    { key: 'postProcessingLaborMinutes', label: 'Mài nhẵn ba via', min: 0 },
    { key: 'qcLaborMinutes', label: 'Đo kiểm QC dung sai', min: 0 },
    { key: 'packagingLaborMinutes', label: 'Đóng gói hoàn thiện', min: 0 },
    { key: 'defaultMarkupPercent', label: 'Lợi nhuận mục tiêu (%)', min: 0, max: 1000 },
    { key: 'baseFailureReservePercent', label: 'Dự phòng rủi ro in lỗi cơ bản', min: 0, max: 100 },
    { key: 'lowPrintabilityExtraPercent', label: 'Phụ phí mô hình khó', min: 0, max: 100 },
    { key: 'multiColorExtraPercent', label: 'Phụ phí in nhiều màu AMS', min: 0, max: 100 },
    // Đợt Q (#4): `platformCommissionPercent` BỎ khỏi danh sách bắt buộc — nguồn thật là mục 0
    // (`marketplace_fee_percent`); giữ ở đây sẽ chặn Lưu một cách vô nghĩa.
    { key: 'paymentGatewayFeePercent', label: 'Phí cổng thanh toán', min: 0, max: 100 },
    { key: 'designerRoyaltyPercent', label: 'Bản quyền 3D', min: 0, max: 100 },
    { key: 'customEngravingFee', label: 'Phí khắc tên / Laser', min: 0 },
    { key: 'customLogoUploadFee', label: 'Phí xử lý & đùn logo', min: 0 },
    { key: 'economyDiscountPercent', label: 'Chiết khấu Gói Tiết Kiệm', min: 0, max: 100 },
    { key: 'expressRushSurchargePercent', label: 'Phụ phí Gói Hỏa Tốc', min: 0, max: 100 },
    { key: 'supportVolumeRatioPercent', label: 'Tỷ lệ vật liệu đỡ', min: 0, max: 100 },
    { key: 'brimRaftGrams', label: 'Nhựa đế bám/bè đỡ', min: 0 },
    { key: 'multiColorPurgeWasteGrams', label: 'Xả nhựa tháp xả / màu', min: 0 },
    { key: 'multiColorToolChangeMins', label: 'Đổi màu AMS', min: 0 },
    { key: 'bulkOrderQuantityThreshold', label: 'Ngưỡng cảnh báo đơn lớn — số lượng (chiếc)', min: 1 },
    { key: 'bulkOrderAmountThresholdVnd', label: 'Ngưỡng cảnh báo đơn lớn — số tiền (₫)', min: 0 },
  ];

  /** Ghi lỗi vào `issues` khi thiếu số hoặc ngoài khoảng. KHÔNG tự thay bằng số khác. */
  const requireNumber = (
    issues: Record<string, string>,
    values: Record<string, unknown>,
    key: string,
    label: string,
    opts: { min?: number; max?: number; exclusiveMin?: boolean } = {}
  ) => {
    const raw = values[key];
    if (!isConfiguredNumber(raw)) {
      issues[key] = `${label}: chưa cấu hình — nhập một con số thật (hệ thống KHÔNG tự điền giá trị đoán).`;
      return;
    }
    if (opts.min !== undefined && (opts.exclusiveMin ? raw <= opts.min : raw < opts.min)) {
      issues[key] = `${label}: phải ${opts.exclusiveMin ? 'lớn hơn' : 'lớn hơn hoặc bằng'} ${opts.min}.`;
      return;
    }
    if (opts.max !== undefined && raw > opts.max) {
      issues[key] = `${label}: phải nhỏ hơn hoặc bằng ${opts.max}.`;
    }
  };

  const validateFormula = (): Record<string, string> => {
    const issues: Record<string, string> = {};
    const values = formulaForm as Record<string, unknown>;
    for (const spec of REQUIRED_FORMULA_FIELDS) requireNumber(issues, values, spec.key, spec.label, spec);
    if (!formulaForm.roundingRule) {
      issues.roundingRule = 'Quy tắc làm tròn giá: chưa cấu hình — chọn một quy tắc thật.';
    }
    (formulaForm.volumeDiscounts ?? []).forEach((tier, idx) => {
      if (!isConfiguredNumber(tier?.minQty) || tier.minQty < 1) {
        issues[`volumeDiscounts.${idx}.minQty`] = `Bậc ${idx + 1}: số lượng tối thiểu phải từ 1 trở lên.`;
      }
      if (!isConfiguredNumber(tier?.discountPercent) || tier.discountPercent < 0 || tier.discountPercent > 70) {
        issues[`volumeDiscounts.${idx}.discountPercent`] = `Bậc ${idx + 1}: mức giảm giá phải trong khoảng 0–70%.`;
      }
      if (!String(tier?.label ?? '').trim()) {
        issues[`volumeDiscounts.${idx}.label`] = `Bậc ${idx + 1}: chưa có nhãn hiển thị cho khách.`;
      }
    });
    return issues;
  };

  const updateFormulaField = (key: keyof InkiriCostFormulaConfig, text: string) => {
    setFormulaForm((prev) => ({ ...prev, [key]: numberOrUndefined(text) } as Partial<InkiriCostFormulaConfig>));
    setFormulaIssues((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
  };

  const updateFormulaSelect = (value: string) => {
    setFormulaForm((prev) => ({ ...prev, roundingRule: value === '' ? undefined : (value as InkiriCostFormulaConfig['roundingRule']) }));
    setFormulaIssues((prev) => {
      if (!('roundingRule' in prev)) return prev;
      const next = { ...prev };
      delete next.roundingRule;
      return next;
    });
  };

  // Handle Save Formula — CHẶN LƯU khi còn trường chưa cấu hình (không ghi số đoán vào DB).
  const handleSaveFormula = async (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    if (dbFormulaState === 'error') {
      onShowToast('KHÔNG lưu: không đọc được cấu hình hiện tại từ Supabase — tránh ghi đè bằng dữ liệu tạm.');
      return;
    }
    const issues = validateFormula();
    setFormulaIssues(issues);
    const count = Object.keys(issues).length;
    if (count > 0) {
      onShowToast(`KHÔNG lưu: còn ${count} trường chưa cấu hình hoặc không hợp lệ — xem lỗi ngay cạnh từng ô nhập.`);
      return;
    }
    // Chỉ báo thành công khi DB THẬT SỰ nhận (service validate + audit); nếu không, nêu lỗi thật.
    const result = await onUpdatePricingConfig(formulaForm as unknown as InkiriCostFormulaConfig);
    setFormulaIsReference(false);
    if (!result || result.success) {
      onShowToast('Đã lưu cấu hình công thức tính giá Inkiri toàn hệ thống!');
    } else {
      onShowToast(`KHÔNG lưu được công thức: ${result.error || 'lỗi không xác định'}`);
    }
  };

  // Handle Save `pricing_global_settings` (VAT · điện · nhân công)
  const handleSaveGlobalSettings = async () => {
    const issues: Record<string, string> = {};
    const patch: Partial<PricingGlobalSettings> = {};
    const fields: { field: GlobalFormField }[] = [
      { field: 'vatPercent' },
      { field: 'electricityRateVnd' },
      { field: 'laborHourlyRateVnd' },
      { field: 'marketplaceFeePercent' },
    ];
    const currentGlobalBeforeSave = settingsAccessors.pricingGlobal();
    for (const { field } of fields) {
      const text = String(globalForm[field] ?? '').trim();
      if (text === '') {
        // Bỏ trống = CHƯA CẤU HÌNH (khác hẳn 0).
        // ⚠️ Riêng `marketplaceFeePercent`: cột này mới thêm ở tầng schema và **production
        // CHƯA áp migration** (đo được: PostgREST trả 42703 `column ... does not exist`).
        // Nếu hàng đang trống mà vẫn gửi `null`, lệnh upsert sẽ hỏng 42703 và **kéo đổ cả
        // các ô VAT/điện/nhân công đang lưu được**. Vì vậy chỉ gửi `null` khi ĐANG có giá trị
        // (đó mới thật sự là thao tác XOÁ cấu hình); còn lại bỏ qua trường này.
        if (field === 'marketplaceFeePercent' && !isConfiguredNumber(currentGlobalBeforeSave?.marketplaceFeePercent)) {
          continue;
        }
        patch[field] = null;
        continue;
      }
      const value = Number(text);
      const res = validateSetting('pricing_global_settings', field, value);
      if (!res.valid) {
        issues[field] = res.issues[0]?.message ?? 'Giá trị không hợp lệ.';
        continue;
      }
      patch[field] = value;
    }
    setGlobalIssues(issues);
    if (Object.keys(issues).length > 0) {
      onShowToast('KHÔNG lưu cấu hình chung: có ô nhập không hợp lệ — xem lỗi ngay cạnh ô nhập.');
      return;
    }
    // Ô trống = "chưa cấu hình". Không ô nào được nhập VÀ kho cũng đang trống ⇒ thao tác
    // rỗng: CHẶN trước khi chạm DB (0 request ghi), không tạo hàng rỗng trong
    // pricing_global_settings và không ghi setting_audit.
    // Chỉ khi kho ĐANG có giá trị thì việc để trống mới là ý định XOÁ cấu hình — vẫn cho lưu.
    const currentGlobal = settingsAccessors.pricingGlobal();
    const hasAnyInput = fields.some(({ field }) => String(globalForm[field] ?? '').trim() !== '');
    const hasAnyConfigured =
      isConfiguredNumber(currentGlobal?.vatPercent) ||
      isConfiguredNumber(currentGlobal?.electricityRateVnd) ||
      isConfiguredNumber(currentGlobal?.laborHourlyRateVnd) ||
      isConfiguredNumber(currentGlobal?.marketplaceFeePercent);
    if (!hasAnyInput && !hasAnyConfigured) {
      onShowToast('KHÔNG lưu cấu hình chung: cả 3 ô đang để trống (chưa cấu hình) — không có gì để ghi vào pricing_global_settings.');
      return;
    }
    setGlobalSaving(true);
    const res = await savePricingGlobalSettings(patch);
    setGlobalSaving(false);
    if (!res.success) {
      if (res.issues && res.issues.length > 0) {
        const mapped: Record<string, string> = {};
        for (const issue of res.issues) mapped[issue.field] = issue.message;
        setGlobalIssues(mapped);
      }
      onShowToast(`KHÔNG lưu được cấu hình chung: ${res.error ?? 'không rõ nguyên nhân'}`);
      return;
    }
    setGlobalIsReference(false);
    onShowToast('Đã lưu cấu hình chung (VAT · điện · nhân công) vào pricing_global_settings.');
  };

  /**
   * Đợt U — nút "Điền lại gợi ý Inkiri": CHỈ điền vào FORM, KHÔNG ghi DB.
   * Admin vẫn phải bấm LƯU thì cấu hình mới thành của VCUBE.
   */
  const refillFromInkiriReference = () => {
    setFormulaForm(referenceFormulaForm());
    setFormulaIssues({});
    setFormulaIsReference(true);
    setGlobalForm(referenceGlobalForm());
    setGlobalIssues({});
    setGlobalIsReference(true);
    onShowToast('Đã điền giá trị mẫu theo Inkiri vào FORM — CHƯA lưu. Xem lại rồi bấm Lưu để áp dụng.');
  };

  /* ---------------------------------------------------------------------------
   * BẢN XEM TRƯỚC TÁC ĐỘNG (Đợt 9 / R1, việc 4)
   *
   * KHÔNG BỊA SỐ: đây là ví dụ minh hoạ với tham số CỐ ĐỊNH (`PREVIEW_EXAMPLE`) in rõ trên
   * màn hình. Ba phép tính gọi CHÍNH các hàm mà hệ thống dùng — `computeElectricityCostVnd`
   * và `computeLaborCostVnd` của `src/utils/pricingEngine.ts`, `computeVat` của
   * `src/frontend/lib/vat.ts` — nên con số xem trước khớp con số engine sẽ tính.
   * Chỉ ĐỌC cache (`settingsAccessors.pricingGlobal()`), không ghi DB.
   * ------------------------------------------------------------------------- */
  const textToNumber = (text: string): number | null => {
    const t = String(text ?? '').trim();
    if (t === '') return null;
    const v = Number(t);
    return Number.isFinite(v) ? v : null;
  };

  const savedGlobal = settingsAccessors.pricingGlobal();
  const savedVatPercent = savedGlobal && isConfiguredNumber(savedGlobal.vatPercent) ? savedGlobal.vatPercent : null;
  const savedElectricityRate =
    savedGlobal && isConfiguredNumber(savedGlobal.electricityRateVnd) ? savedGlobal.electricityRateVnd : null;
  const savedLaborRate =
    savedGlobal && isConfiguredNumber(savedGlobal.laborHourlyRateVnd) ? savedGlobal.laborHourlyRateVnd : null;

  const typedVatPercent = textToNumber(globalForm.vatPercent);
  const typedElectricityRate = textToNumber(globalForm.electricityRateVnd);
  const typedLaborRate = textToNumber(globalForm.laborHourlyRateVnd);

  /**
   * Đợt U: số ô của công thức đang GIỮ ĐÚNG giá trị mẫu Inkiri — để admin biết còn bao nhiêu ô
   * chưa xem lại. So sánh bằng JSON để `volumeDiscounts` (mảng) cũng tính đúng.
   */
  const referenceHeldCount = formulaIsReference
    ? Object.keys(INKIRI_REFERENCE_VALUES.formula).filter((key) => {
        const ref = (INKIRI_REFERENCE_VALUES.formula as Record<string, unknown>)[key];
        const current = (formulaForm as Record<string, unknown>)[key];
        return JSON.stringify(current) === JSON.stringify(ref);
      }).length
    : 0;
  const referenceTotal = Object.keys(INKIRI_REFERENCE_VALUES.formula).length;

  const previewVatAmount = (percent: number | null): number | null => {
    const line = computeVat(PREVIEW_EXAMPLE.goodsVnd, vatRateFromPercent(percent));
    return line ? line.amount : null;
  };
  const previewElectricityAmount = (rate: number | null): number | null =>
    rate === null ? null : computeElectricityCostVnd(PREVIEW_EXAMPLE.powerKW, PREVIEW_EXAMPLE.printHours, rate);
  const previewLaborAmount = (rate: number | null): number | null =>
    rate === null ? null : computeLaborCostVnd(PREVIEW_EXAMPLE.laborMinutes, rate);

  const previewRows: { key: string; label: string; saved: number | null; typed: number | null }[] = [
    {
      key: 'vat',
      label: `VAT của tiền hàng mẫu ${formatNumber(PREVIEW_EXAMPLE.goodsVnd)} ₫`,
      saved: previewVatAmount(savedVatPercent),
      typed: previewVatAmount(typedVatPercent),
    },
    {
      key: 'electricity',
      label: `Tiền điện ${formatNumber(PREVIEW_KWH)} kWh`,
      saved: previewElectricityAmount(savedElectricityRate),
      typed: previewElectricityAmount(typedElectricityRate),
    },
    {
      key: 'labor',
      label: `Tiền nhân công ${PREVIEW_EXAMPLE.laborMinutes} phút`,
      saved: previewLaborAmount(savedLaborRate),
      typed: previewLaborAmount(typedLaborRate),
    },
  ];

  // Volume Discount Handlers — bậc mới để TRỐNG, KHÔNG đẩy fixture vào công thức.
  const handleAddDiscountTier = () => {
    const emptyTier: Partial<VolumeDiscountTier> = { minQty: undefined, maxQty: undefined, discountPercent: undefined, label: '' };
    setFormulaForm((prev) => ({
      ...prev,
      volumeDiscounts: [...(prev.volumeDiscounts ?? []), emptyTier] as VolumeDiscountTier[],
    }));
  };

  const handleRemoveDiscountTier = (idx: number) => {
    setFormulaForm((prev) => ({
      ...prev,
      volumeDiscounts: (prev.volumeDiscounts ?? []).filter((_, i) => i !== idx),
    }));
  };

  const handleUpdateDiscountTier = (idx: number, updated: Partial<VolumeDiscountTier>) => {
    setFormulaForm((prev) => ({
      ...prev,
      volumeDiscounts: (prev.volumeDiscounts ?? []).map((t, i) => (i === idx ? { ...t, ...updated } : t)),
    }));
    setFormulaIssues((prev) => {
      const next: Record<string, string> = {};
      let changed = false;
      for (const [k, v] of Object.entries(prev)) {
        if (k.startsWith(`volumeDiscounts.${idx}.`)) changed = true;
        else next[k] = v;
      }
      return changed ? next : prev;
    });
  };

  const setMaterialField = (key: keyof MaterialProfile, value: unknown) => {
    if (editingMaterial) setEditingMaterial({ ...editingMaterial, [key]: value } as MaterialProfile);
    else setMaterialForm((prev) => ({ ...prev, [key]: value }));
    setMaterialIssues((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
  };

  const validateMaterialValues = (values: Record<string, unknown>): Record<string, string> => {
    const issues: Record<string, string> = {};
    requireNumber(issues, values, 'density', 'Khối lượng riêng', { min: 0, exclusiveMin: true });
    requireNumber(issues, values, 'costPerKg', 'Giá nhập 1 cuộn / kg', { min: 0 });
    requireNumber(issues, values, 'pricePerGram', 'Đơn giá tính khách / gram', { min: 0 });
    requireNumber(issues, values, 'unitPriceMultiplier', 'Hệ số đơn giá', { min: 0, exclusiveMin: true });
    requireNumber(issues, values, 'spoolWeightGrams', 'Khối lượng cuộn', { min: 0, exclusiveMin: true });
    requireNumber(issues, values, 'extruderTempMin', 'Nhiệt độ đầu đùn tối thiểu', { min: 0, exclusiveMin: true });
    requireNumber(issues, values, 'extruderTempMax', 'Nhiệt độ đầu đùn tối đa', { min: 0, exclusiveMin: true });
    requireNumber(issues, values, 'bedTemp', 'Nhiệt độ bàn in', { min: 0 });
    requireNumber(issues, values, 'stockRollsCount', 'Tồn kho (cuộn)', { min: 0 });
    // TÙY CHỌN (Đợt P): phụ phí dự phòng in hỏng riêng của vật liệu. Để trống = không cộng thêm;
    // nếu có số thì phải là số hữu hạn trong 0–100 (engine cộng thẳng vào tỉ lệ dự phòng).
    const failureExtra = values.failureExtraPercent;
    if (failureExtra !== undefined && failureExtra !== null && failureExtra !== '') {
      if (isConfiguredNumber(failureExtra)) {
        if (failureExtra < 0 || failureExtra > 100) {
          issues.failureExtraPercent = 'Phụ phí dự phòng in hỏng: phải trong khoảng 0–100% (hoặc để trống).';
        }
      } else {
        issues.failureExtraPercent = 'Phụ phí dự phòng in hỏng: phải là một con số (hoặc để trống).';
      }
    }
    return issues;
  };

  // Material Handlers
  const handleSaveNewMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!materialForm.name?.trim()) {
      setMaterialIssues({ name: 'Tên vật liệu: bắt buộc.' });
      onShowToast('Vui lòng nhập tên loại nhựa!');
      return;
    }
    const values = materialForm as Record<string, unknown>;
    const issues = validateMaterialValues(values);
    setMaterialIssues(issues);
    if (Object.keys(issues).length > 0) {
      onShowToast(`KHÔNG lưu vật liệu: còn ${Object.keys(issues).length} ô chưa cấu hình — xem lỗi ngay cạnh ô nhập.`);
      return;
    }
    const newId = `mat-${Date.now()}`;
    const newMat: MaterialProfile = {
      id: newId,
      name: materialForm.name,
      brand: materialForm.brand ?? '',
      density: materialForm.density as number,
      strength: materialForm.strength ?? '',
      heatResistance: materialForm.heatResistance ?? '',
      flexibility: materialForm.flexibility ?? '',
      costPerKg: materialForm.costPerKg as number,
      pricePerGram: materialForm.pricePerGram as number,
      unitPriceMultiplier: materialForm.unitPriceMultiplier as number,
      spoolWeightGrams: materialForm.spoolWeightGrams as number,
      extruderTempMin: materialForm.extruderTempMin as number,
      extruderTempMax: materialForm.extruderTempMax as number,
      bedTemp: materialForm.bedTemp as number,
      colors: materialForm.colors ?? [],
      desc: materialForm.desc ?? '',
      recommendedFor: materialForm.recommendedFor ?? '',
      inStock: materialForm.inStock === true,
      stockRollsCount: materialForm.stockRollsCount as number,
      failureExtraPercent: materialForm.failureExtraPercent ?? null,
    };
    const updatedList = [...materials, newMat];
    onUpdateMaterials(updatedList);
    setIsNewMaterialOpen(false);
    setMaterialIssues({});
    onShowToast(`Đã thêm vật liệu mới: "${newMat.name}"`);
  };

  const handleSaveEditMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMaterial) return;
    const values = editingMaterial as unknown as Record<string, unknown>;
    const issues = validateMaterialValues(values);
    setMaterialIssues(issues);
    if (Object.keys(issues).length > 0) {
      onShowToast(`KHÔNG lưu vật liệu: còn ${Object.keys(issues).length} ô chưa cấu hình — xem lỗi ngay cạnh ô nhập.`);
      return;
    }
    const updatedList = materials.map((m) => (m.id === editingMaterial.id ? editingMaterial : m));
    onUpdateMaterials(updatedList);
    setEditingMaterial(null);
    setMaterialIssues({});
    onShowToast(`Đã cập nhật vật liệu: "${editingMaterial.name}"`);
  };

  const handleDeleteMaterial = (id: string, name: string) => {
    if (materials.length <= 1) {
      onShowToast('Cần duy trì tối thiểu 1 loại vật liệu trong hệ thống!');
      return;
    }
    setPendingDeleteMaterial({ id, name });
  };

  const setPrinterField = (key: keyof PrinterProfile, value: unknown) => {
    if (editingPrinter) setEditingPrinter({ ...editingPrinter, [key]: value } as PrinterProfile);
    else setPrinterForm((prev) => ({ ...prev, [key]: value }));
    setPrinterIssues((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
  };

  const setPrinterBedDimension = (axis: 'x' | 'y' | 'z', text: string) => {
    const value = numberOrUndefined(text) as unknown as number;
    if (editingPrinter) {
      setPrinterField('bedDimensions', { ...editingPrinter.bedDimensions, [axis]: value });
    } else {
      const current = (printerForm.bedDimensions ?? { x: undefined, y: undefined, z: undefined }) as unknown as Record<string, number>;
      setPrinterField('bedDimensions', { ...current, [axis]: value });
    }
    setPrinterIssues((prev) => {
      if (!(`bedDimensions.${axis}` in prev)) return prev;
      const next = { ...prev };
      delete next[`bedDimensions.${axis}`];
      return next;
    });
  };

  /**
   * Ô "Năng suất in (g/giờ)": để trống ⇒ `null` = CHƯA KHAI (KHÔNG rơi về số mặc định).
   * Nhập số ⇒ giữ đúng số admin gõ để validate (> 0).
   */
  const setPrinterThroughput = (text: string) => {
    const raw = String(text).trim();
    setPrinterField('throughputGramsPerHour', raw === '' ? null : Number(raw));
  };

  const validatePrinterValues = (values: Record<string, unknown>, bed: Record<string, unknown> | undefined): Record<string, string> => {
    const issues: Record<string, string> = {};
    requireNumber(issues, values, 'nozzleDiameter', 'Đường kính đầu phun', { min: 0, exclusiveMin: true });
    requireNumber(issues, values, 'powerKW', 'Công suất điện', { min: 0, exclusiveMin: true });
    requireNumber(issues, values, 'acquisitionCost', 'Giá trị đầu tư máy', { min: 0, exclusiveMin: true });
    requireNumber(issues, values, 'expectedLifetimeHours', 'Tuổi thọ khấu hao', { min: 0, exclusiveMin: true });
    requireNumber(issues, values, 'consumablesHourlyRate', 'Hao mòn vật tư / giờ', { min: 0 });
    requireNumber(issues, values, 'hourlyRate', 'Đơn giá giờ máy', { min: 0 });
    requireNumber(issues, values, 'maxPrintSpeedMmS', 'Tốc độ in tối đa', { min: 0, exclusiveMin: true });
    requireNumber(issues, values, 'heatedBedMaxTemp', 'Nhiệt độ bàn tối đa', { min: 0, exclusiveMin: true });
    // Năng suất in (g/giờ): để TRỐNG / `null` là HỢP LỆ (chưa khai — engine rơi về ước lượng
    // thể tích có gắn nhãn nguồn). ĐÃ NHẬP thì phải là số hữu hạn > 0.
    const throughput = values.throughputGramsPerHour;
    if (throughput !== null && throughput !== undefined && !(isConfiguredNumber(throughput) && throughput > 0)) {
      issues.throughputGramsPerHour = 'Năng suất in: để trống nếu chưa khai, hoặc nhập số lớn hơn 0 (g/giờ).';
    }
    if (!values.technology) issues.technology = 'Công nghệ in: chưa chọn.';
    for (const axis of ['x', 'y', 'z'] as const) {
      const raw = bed?.[axis];
      if (!isConfiguredNumber(raw)) {
        issues[`bedDimensions.${axis}`] = `Khổ bàn in ${axis.toUpperCase()}: chưa cấu hình — nhập số mm thật (hệ thống KHÔNG tự điền 256mm).`;
      } else if (raw <= 0) {
        issues[`bedDimensions.${axis}`] = `Khổ bàn in ${axis.toUpperCase()}: phải lớn hơn 0.`;
      }
    }
    return issues;
  };

  // Printer Handlers
  const handleSaveNewPrinter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!printerForm.name?.trim()) {
      setPrinterIssues({ name: 'Tên máy in: bắt buộc.' });
      onShowToast('Vui lòng nhập tên máy in!');
      return;
    }
    const values = printerForm as Record<string, unknown>;
    const bed = printerForm.bedDimensions as unknown as Record<string, unknown>;
    const issues = validatePrinterValues(values, bed);
    setPrinterIssues(issues);
    if (Object.keys(issues).length > 0) {
      onShowToast(`KHÔNG lưu máy in: còn ${Object.keys(issues).length} ô chưa cấu hình — xem lỗi ngay cạnh ô nhập.`);
      return;
    }
    const newId = `prn-${Date.now()}`;
    const newPrinter: PrinterProfile = {
      id: newId,
      name: printerForm.name,
      brand: printerForm.brand ?? '',
      technology: printerForm.technology as PrinterProfile['technology'],
      bedDimensions: printerForm.bedDimensions as PrinterProfile['bedDimensions'],
      nozzleDiameter: printerForm.nozzleDiameter as number,
      powerKW: printerForm.powerKW as number,
      acquisitionCost: printerForm.acquisitionCost as number,
      expectedLifetimeHours: printerForm.expectedLifetimeHours as number,
      consumablesHourlyRate: printerForm.consumablesHourlyRate as number,
      hourlyRate: printerForm.hourlyRate as number,
      maxPrintSpeedMmS: printerForm.maxPrintSpeedMmS as number,
      heatedBedMaxTemp: printerForm.heatedBedMaxTemp as number,
      // `null` = chưa khai năng suất (không thay bằng số mặc định).
      throughputGramsPerHour: printerForm.throughputGramsPerHour ?? null,
      hasEnclosure: printerForm.hasEnclosure === true,
      hasAMS: printerForm.hasAMS === true,
      status: printerForm.status ?? 'Idle',
    };
    const updatedList = [...printers, newPrinter];
    onUpdatePrinters(updatedList);
    setIsNewPrinterOpen(false);
    setPrinterIssues({});
    onShowToast(`Đã thêm máy in mới: "${newPrinter.name}"`);
  };

  const handleSaveEditPrinter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPrinter) return;
    const values = editingPrinter as unknown as Record<string, unknown>;
    const bed = editingPrinter.bedDimensions as unknown as Record<string, unknown>;
    const issues = validatePrinterValues(values, bed);
    setPrinterIssues(issues);
    if (Object.keys(issues).length > 0) {
      onShowToast(`KHÔNG lưu máy in: còn ${Object.keys(issues).length} ô chưa cấu hình — xem lỗi ngay cạnh ô nhập.`);
      return;
    }
    const updatedList = printers.map((p) => (p.id === editingPrinter.id ? editingPrinter : p));
    onUpdatePrinters(updatedList);
    setEditingPrinter(null);
    setPrinterIssues({});
    onShowToast(`Đã cập nhật máy in: "${editingPrinter.name}"`);
  };

  const handleDeletePrinter = (id: string, name: string) => {
    if (printers.length <= 1) {
      onShowToast('Cần duy trì tối thiểu 1 máy in trong hệ thống!');
      return;
    }
    setPendingDeletePrinter({ id, name });
  };

  const pricingHeaderProps: PricingHeaderProps = {
    refillFromInkiriReference,
    handleSaveFormula,
    formulaIsReference,
    globalIsReference,
    referenceHeldCount,
    referenceTotal,
    dbFormulaState,
    subTab,
    setSubTab,
    materials,
    printers,
    accessories,
  };

  const formulaTabProps: FormulaTabProps = {
    handleSaveFormula,
    handleSaveGlobalSettings,
    globalSaving,
    globalIsReference,
    globalForm,
    setGlobalForm,
    setGlobalIssues,
    globalIssues,
    previewRows,
    formulaIsReference,
    formulaForm,
    updateFormulaField,
    formulaIssues,
    totalLaborMins,
    laborCostPerUnit,
    setFormulaForm,
    updateFormulaSelect,
    handleAddDiscountTier,
    handleUpdateDiscountTier,
    numberOrUndefined,
    handleRemoveDiscountTier,
  };

  const materialsTabProps: MaterialsTabProps = {
    materials,
    setIsNewMaterialOpen,
    setEditingMaterial,
    handleDeleteMaterial,
  };

  const materialEditorModalProps: MaterialEditorModalProps = {
    setIsNewMaterialOpen,
    setEditingMaterial,
    setMaterialIssues,
    editingMaterial,
    handleSaveEditMaterial,
    handleSaveNewMaterial,
    materialIssues,
    materialForm,
    setMaterialField,
    numberOrUndefined,
  };

  const printersTabProps: PrintersTabProps = {
    printers,
    setIsNewPrinterOpen,
    formulaForm,
    setEditingPrinter,
    handleDeletePrinter,
  };

  const printerEditorModalProps: PrinterEditorModalProps = {
    setIsNewPrinterOpen,
    setEditingPrinter,
    setPrinterIssues,
    editingPrinter,
    handleSaveEditPrinter,
    handleSaveNewPrinter,
    printerIssues,
    printerForm,
    setPrinterField,
    setPrinterBedDimension,
    numberOrUndefined,
    setPrinterThroughput,
  };

  return (
    <div className="space-y-6">
      <ConfirmDialog
        open={pendingDeleteMaterial !== null}
        tone="danger"
        title="Xoá vật liệu"
        description={pendingDeleteMaterial ? `Xoá vật liệu "${pendingDeleteMaterial.name}" khỏi danh mục xưởng? Hành động này không hoàn tác được.` : ''}
        confirmLabel="Xoá vật liệu"
        cancelLabel="Huỷ"
        onCancel={() => setPendingDeleteMaterial(null)}
        onConfirm={() => {
          if (!pendingDeleteMaterial) return;
          onUpdateMaterials(materials.filter((m) => m.id !== pendingDeleteMaterial.id));
          onShowToast(`Đã xóa vật liệu "${pendingDeleteMaterial.name}"`);
          setPendingDeleteMaterial(null);
        }}
      />
      <ConfirmDialog
        open={pendingDeletePrinter !== null}
        tone="danger"
        title="Xoá máy in"
        description={pendingDeletePrinter ? `Xoá máy in "${pendingDeletePrinter.name}" khỏi đội máy? Hành động này không hoàn tác được.` : ''}
        confirmLabel="Xoá máy in"
        cancelLabel="Huỷ"
        onCancel={() => setPendingDeletePrinter(null)}
        onConfirm={() => {
          if (!pendingDeletePrinter) return;
          onUpdatePrinters(printers.filter((p) => p.id !== pendingDeletePrinter.id));
          onShowToast(`Đã xóa máy in "${pendingDeletePrinter.name}"`);
          setPendingDeletePrinter(null);
        }}
      />
      {/* Panel Header & Summary banner */}
      <PricingHeader {...pricingHeaderProps} />

      {/* SUB-TAB 1: FORMULA & OPERATING RATES */}
      {subTab === 'formula' && <FormulaTab {...formulaTabProps} />}

      {/* SUB-TAB 2: MATERIALS CATALOG CRUD */}
      {subTab === 'materials' && <MaterialsTab {...materialsTabProps} />}

      {/* SUB-TAB 3: PRINTER FLEET CRUD */}
      {subTab === 'printers' && <PrintersTab {...printersTabProps} />}

      {/* SUB-TAB 4: ACCESSORIES & PACKAGING MANAGEMENT */}
      {subTab === 'accessories' && (
        <div role="tabpanel" id="pricing-panel-accessories" aria-labelledby="pricing-tab-accessories">
          <AccessoriesManager
            accessories={accessories}
            onUpdateAccessories={onUpdateAccessories}
            onShowToast={onShowToast}
          />
        </div>
      )}

      {/* SUB-TAB 5: WAREHOUSE INVENTORY & STOCK MAPPING */}
      {subTab === 'inventory' && (
        <div role="tabpanel" id="pricing-panel-inventory" aria-labelledby="pricing-tab-inventory">
          <WarehouseInventoryPanel
            materials={materials}
            accessories={accessories}
            onUpdateMaterials={onUpdateMaterials}
            onUpdateAccessories={onUpdateAccessories}
            onShowToast={onShowToast}
          />
        </div>
      )}

      {/* SUB-TAB 6: WORKSHOP ESTIMATOR & MANUFACTURING BOM */}
      {subTab === 'estimator' && (
        <div role="tabpanel" id="pricing-panel-estimator" aria-labelledby="pricing-tab-estimator">
          <WorkshopEstimatorBOM
            materials={materials}
            printers={printers}
            accessories={accessories}
            pricingConfig={formulaForm as unknown as InkiriCostFormulaConfig}
            onShowToast={onShowToast}
          />
        </div>
      )}

      {/* NEW/EDIT MATERIAL MODAL */}
      {(isNewMaterialOpen || editingMaterial) && <MaterialEditorModal {...materialEditorModalProps} />}

      {/* NEW/EDIT PRINTER MODAL */}
      {(isNewPrinterOpen || editingPrinter) && <PrinterEditorModal {...printerEditorModalProps} />}
    </div>
  );
};
