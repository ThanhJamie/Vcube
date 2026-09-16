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
import { INKIRI_REFERENCE_VALUES } from '../../../data/mockData';
import { AccessoriesManager } from './AccessoriesManager';
import { WarehouseInventoryPanel } from './WarehouseInventoryPanel';
import { WorkshopEstimatorBOM } from './WorkshopEstimatorBOM';
import { Icon, InfoTip } from '@frontend/ui';

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

/**
 * `true` khi `v` là một số HỮU HẠN đã được cấu hình (khác `undefined`/`null`/`NaN`).
 * Dùng để phân biệt "chưa cấu hình" với "giá trị thật" — không bao giờ thay bằng số đoán.
 */
const isConfiguredNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/**
 * Ví dụ minh hoạ CỐ ĐỊNH cho BẢN XEM TRƯỚC TÁC ĐỘNG (Đợt 9 / R1, việc 4).
 *
 * Đây KHÔNG phải số liệu của một đơn hàng thật: mọi tham số được IN NGAY TRÊN MÀN HÌNH
 * cạnh bảng kết quả để admin tự đối chiếu. Mục đích là để thấy tiền đổi thế nào TRƯỚC khi
 * bấm Lưu — đổi VAT/điện/nhân công là đổi giá của mọi báo giá.
 */
const PREVIEW_EXAMPLE = {
  /** Công suất máy in trong ví dụ (kW). */
  powerKW: 0.18,
  /** Thời gian in trong ví dụ (giờ). */
  printHours: 2.5,
  /** Số phút nhân công trong ví dụ (phút). */
  laborMinutes: 45,
  /** Tiền hàng mẫu để minh hoạ VAT (đồng). */
  goodsVnd: 500000,
} as const;

/** Điện năng tiêu thụ của ví dụ (kWh) — in ra màn hình, không phải một hằng số ngầm. */
const PREVIEW_KWH = PREVIEW_EXAMPLE.powerKW * PREVIEW_EXAMPLE.printHours;

/** Nhãn cho giá trị CHƯA cấu hình trong bản xem trước (KHÔNG in một con số đoán). */
const PREVIEW_NOT_CONFIGURED = 'Chưa cấu hình';

/**
 * Bản sao SÂU của bộ số mẫu Inkiri để đưa vào form (không mutate hằng số dùng chung).
 * Đợt U: chỉ dùng để ĐIỀN FORM — không có lệnh ghi DB nào ở đây.
 */
const referenceFormulaForm = (): Partial<InkiriCostFormulaConfig> => ({
  ...INKIRI_REFERENCE_VALUES.formula,
  volumeDiscounts: INKIRI_REFERENCE_VALUES.formula.volumeDiscounts.map((tier) => ({ ...tier })),
});

/** 4 ô ở "mục 0" (`pricing_global_settings`) dưới dạng chuỗi cho `<input>`. */
const referenceGlobalForm = (): {
  vatPercent: string;
  electricityRateVnd: string;
  laborHourlyRateVnd: string;
  marketplaceFeePercent: string;
} => ({
  vatPercent: String(INKIRI_REFERENCE_VALUES.global.vatPercent),
  electricityRateVnd: String(INKIRI_REFERENCE_VALUES.global.electricityRateVnd),
  laborHourlyRateVnd: String(INKIRI_REFERENCE_VALUES.global.laborHourlyRateVnd),
  marketplaceFeePercent: String(INKIRI_REFERENCE_VALUES.global.marketplaceFeePercent),
});

const formatPreviewVnd = (v: number | null): string =>
  v === null ? PREVIEW_NOT_CONFIGURED : `${v.toLocaleString('vi-VN')} đ`;

/** Chênh lệch giữa giá trị ĐANG GÕ và giá trị ĐANG LƯU; thiếu một bên ⇒ nói rõ chưa đủ dữ liệu. */
const formatPreviewDelta = (saved: number | null, typed: number | null): string => {
  if (saved === null || typed === null) return 'Chưa đủ dữ liệu';
  const delta = typed - saved;
  if (delta === 0) return 'Không đổi';
  return `${delta > 0 ? '+' : '−'}${Math.abs(delta).toLocaleString('vi-VN')} đ`;
};

/**
 * Lỗi hiện NGAY CẠNH ô nhập (a11y: `role="alert"` + `aria-describedby` trỏ tới id này).
 * Bắt buộc theo `docs/plans/14-dot7-briefs.md` mục O2 — việc 4.
 */
const FieldError: React.FC<{ id: string; message?: string }> = ({ id, message }) =>
  message ? (
    <p id={`${id}-error`} role="alert" className="text-xs text-danger mt-1 font-semibold">
      {message}
    </p>
  ) : null;

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
  type GlobalFormField = 'vatPercent' | 'electricityRateVnd' | 'laborHourlyRateVnd' | 'marketplaceFeePercent';
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
    { key: 'noSupportRemovalMinutes', label: 'Bóc support khi KHÔNG có support (phút)', min: 0 },
    { key: 'fixedPackagingCost', label: 'Phí đóng gói cố định', min: 0 },
    { key: 'ipaSolventCost', label: 'Chi phí cồn IPA & dung môi', min: 0 },
    { key: 'multiColorPackagingExtra', label: 'Phụ phí đóng gói in đa màu', min: 0 },
    { key: 'overheadPerUnit', label: 'Chi phí quản lý mặt bằng xưởng', min: 0 },
    { key: 'fileReviewLaborMinutes', label: 'Review file & Slicing', min: 0 },
    { key: 'setupLaborMinutes', label: 'Setup máy & bàn in', min: 0 },
    { key: 'supportRemovalMinutes', label: 'Tách Support', min: 0 },
    { key: 'postProcessingLaborMinutes', label: 'Mài nhẵn Deburring', min: 0 },
    { key: 'qcLaborMinutes', label: 'Đo kiểm QC dung sai', min: 0 },
    { key: 'packagingLaborMinutes', label: 'Đóng gói hoàn thiện', min: 0 },
    { key: 'defaultMarkupPercent', label: 'Lợi nhuận mục tiêu (Markup)', min: 0, max: 1000 },
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
    { key: 'supportVolumeRatioPercent', label: 'Tỷ lệ Support', min: 0, max: 100 },
    { key: 'brimRaftGrams', label: 'Nhựa Brim/Raft', min: 0 },
    { key: 'multiColorPurgeWasteGrams', label: 'Purge tháp xả / màu', min: 0 },
    { key: 'multiColorToolChangeMins', label: 'Đổi màu AMS', min: 0 },
    { key: 'bulkOrderQuantityThreshold', label: 'Ngưỡng cảnh báo đơn lớn — số lượng (chiếc)', min: 1 },
    { key: 'bulkOrderAmountThresholdVnd', label: 'Ngưỡng cảnh báo đơn lớn — số tiền (đ)', min: 0 },
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
      label: `VAT của tiền hàng mẫu ${PREVIEW_EXAMPLE.goodsVnd.toLocaleString('vi-VN')} đ`,
      saved: previewVatAmount(savedVatPercent),
      typed: previewVatAmount(typedVatPercent),
    },
    {
      key: 'electricity',
      label: `Tiền điện ${PREVIEW_KWH.toLocaleString('vi-VN')} kWh`,
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
    requireNumber(issues, values, 'extruderTempMin', 'Nhiệt độ đầu đùn Min', { min: 0, exclusiveMin: true });
    requireNumber(issues, values, 'extruderTempMax', 'Nhiệt độ đầu đùn Max', { min: 0, exclusiveMin: true });
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
    if (window.confirm(`Xóa vật liệu "${name}" khỏi danh mục xưởng?`)) {
      const updatedList = materials.filter((m) => m.id !== id);
      onUpdateMaterials(updatedList);
      onShowToast(`Đã xóa vật liệu "${name}"`);
    }
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
    if (window.confirm(`Xóa máy in "${name}" khỏi đội máy?`)) {
      const updatedList = printers.filter((p) => p.id !== id);
      onUpdatePrinters(updatedList);
      onShowToast(`Đã xóa máy in "${name}"`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Panel Header & Summary banner */}
      <div className="bg-surface p-5 sm:p-6 rounded-lg shadow-e1">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-accent/20 text-primary font-tech text-xs font-bold rounded-sm border border-accent/40 uppercase tracking-widest">
                INKIRI 3D COST ENGINE v3.4
              </span>
              <span className="text-xs text-fg-muted">Mô hình định giá theo chuẩn xưởng in 3D công nghiệp</span>
            </div>
            <h2 className="mt-1 flex items-center gap-1.5 text-lg font-bold text-fg sm:text-xl">
              Quản Trị Bảng Giá, Nhựa In, Máy In & Thông Số Tính Phí Xưởng
              <InfoTip label="Giá thành gồm những biến số nào?">
                Cấu hình các biến số ảnh hưởng trực tiếp đến giá thành: Tiền nhựa, điện năng, khấu hao máy in,
                nhân công xử lý file/support, đóng gói và biên lợi nhuận.
              </InfoTip>
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              id="inkiri-refill-reference"
              data-testid="inkiri-refill"
              onClick={refillFromInkiriReference}
              title="Điền bộ số mẫu theo Inkiri vào form — KHÔNG ghi database cho tới khi anh bấm Lưu"
              className="px-4 py-2 bg-surface border border-primary text-primary hover:bg-accent/15 text-xs font-bold rounded-sm transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Icon name="tune" size={16} />
              Điền lại gợi ý Inkiri
            </button>
            <button
              type="button"
              onClick={handleSaveFormula}
              className="px-4 py-2 bg-primary hover:bg-primary-hover text-primary-fg text-xs font-bold rounded-sm transition-colors shadow-e1 flex items-center gap-1.5 cursor-pointer"
            >
              <Icon name="save" size={16} />
              Lưu Toàn Bộ Cấu Hình
            </button>
          </div>
        </div>

        {/* Đợt U: BĂNG-RÔN BẮT BUỘC khi form đang giữ bộ số MẪU theo Inkiri (chưa được admin lưu) */}
        {(formulaIsReference || globalIsReference) && (
          <div
            role="status"
            data-testid="inkiri-reference-banner"
            className="mt-4 flex flex-wrap items-center gap-2 rounded-sm border border-accent/50 bg-accent/10 p-3 text-xs text-fg"
          >
            <p className="flex items-start gap-1.5 font-bold text-primary">
              <Icon name="warning" size={16} className="text-primary shrink-0" />
              <span>Đang dùng giá trị mẫu theo Inkiri — chưa được xem xét cho VCUBE. Xem lại rồi bấm Lưu để áp dụng.</span>
            </p>
            <InfoTip label="Nguồn số mẫu, cảnh báo VAT và các ô cần anh quyết định" title="Về bộ số mẫu Inkiri">
              <span className="flex flex-col gap-2">
                <span>
                  Nguồn: <span className="font-tech">{INKIRI_REFERENCE_VALUES.source.label}</span> (
                  <span className="font-tech">{INKIRI_REFERENCE_VALUES.source.url}</span>), ghi lại ngày
                  <span className="font-tech"> {INKIRI_REFERENCE_VALUES.source.capturedAt}</span>. Chưa bấm Lưu
                  thì KHÔNG có lệnh ghi nào tới database.
                </span>
                <span>
                  <strong>VAT là con số PHÁP LÝ</strong> — anh phải tự xác nhận. Phí nền tảng · bản quyền · markup
                  là <strong>QUYẾT ĐỊNH KINH DOANH</strong>: số của Inkiri chỉ là điểm khởi đầu, KHÔNG phải chuẩn đúng.
                </span>
                <span>
                  Ô Inkiri KHÔNG thể biết (mô hình 3 bên: nền tảng · xưởng · nhà thiết kế) vẫn để TRỐNG và gắn nhãn
                  &ldquo;cần anh quyết định&rdquo;:
                  <span className="font-tech"> {INKIRI_REFERENCE_VALUES.needsOwnerDecision.join(' · ')}</span>
                </span>
                {formulaIsReference && (
                  <span>
                    Đang là số mẫu: <strong>công thức (mục 1–10)</strong> — còn
                    <span className="font-tech"> {referenceHeldCount}/{referenceTotal}</span> ô giữ đúng số mẫu; các ô
                    đang là số mẫu có <strong>viền NÉT ĐỨT</strong> để phân biệt với ô anh tự nhập. Hết số mẫu khi anh
                    bấm Lưu.
                  </span>
                )}
                {globalIsReference && (
                  <span>
                    Đang là số mẫu: <strong>mục 0 — VAT · điện · nhân công · phí nền tảng</strong> (bảng
                    <span className="font-tech"> pricing_global_settings</span>) — bấm &ldquo;Lưu Cấu Hình Chung&rdquo;
                    để áp dụng.
                  </span>
                )}
              </span>
            </InfoTip>
          </div>
        )}

        {/* Trạng thái nguồn dữ liệu THẬT của công thức giá (không hiển thị số đoán) */}
        {dbFormulaState !== 'loaded' && (
          <div
            role="status"
            className="mt-4 flex flex-wrap items-center gap-2 rounded-sm border border-warning/30 bg-warning-tint/60 p-3 text-xs font-semibold text-warning"
          >
            {dbFormulaState === 'loading' && 'Đang đọc cấu hình công thức giá từ Supabase (bảng pricing_configs)…'}
            {dbFormulaState === 'missing' && (
              <>
                <span>CHƯA CẤU HÌNH: bảng pricing_configs chưa có hàng nào đang bật — mọi ô bên dưới để TRỐNG.</span>
                <InfoTip label="Vì sao các ô để trống và cần làm gì tiếp">
                  <span className="font-normal text-fg-muted">
                    Hệ thống không hiển thị và không lưu giá trị mặc định đoán
                    (DEFAULT_INKIRI_FORMULA_CONFIG). Nhập số thật rồi bấm Lưu để tạo cấu hình.
                  </span>
                </InfoTip>
              </>
            )}
            {dbFormulaState === 'error' &&
              'KHÔNG ĐỌC ĐƯỢC cấu hình công thức giá từ Supabase. Các ô đang giữ giá trị tạm và sẽ KHÔNG được lưu (tránh ghi đè bằng dữ liệu không phải từ DB).'}
          </div>
        )}

        {/* Sub Navigation Bar */}
        <div className="flex border-b border-line gap-2 mt-6 pt-2 overflow-x-auto">
          <button
            onClick={() => setSubTab('formula')}
            className={`px-3 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              subTab === 'formula'
                ? 'border-primary text-primary'
                : 'border-transparent text-fg-muted hover:text-fg'
            }`}
          >
            <Icon name="calculate" size={16} />
            1. Công Thức Tính Giá
          </button>

          <button
            onClick={() => setSubTab('materials')}
            className={`px-3 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              subTab === 'materials'
                ? 'border-primary text-primary'
                : 'border-transparent text-fg-muted hover:text-fg'
            }`}
          >
            <Icon name="layers" size={16} />
            2. Nhựa In & Resin ({materials.length})
          </button>

          <button
            onClick={() => setSubTab('printers')}
            className={`px-3 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              subTab === 'printers'
                ? 'border-primary text-primary'
                : 'border-transparent text-fg-muted hover:text-fg'
            }`}
          >
            <Icon name="precision_manufacturing" size={16} />
            3. Đội Máy In ({printers.length})
          </button>

          <button
            onClick={() => setSubTab('accessories')}
            className={`px-3 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              subTab === 'accessories'
                ? 'border-primary text-primary'
                : 'border-transparent text-fg-muted hover:text-fg'
            }`}
          >
            <Icon name="extension" size={16} />
            4. Phụ Kiện & Đóng Gói ({accessories.length})
          </button>

          <button
            onClick={() => setSubTab('inventory')}
            className={`px-3 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              subTab === 'inventory'
                ? 'border-primary text-primary'
                : 'border-transparent text-fg-muted hover:text-fg'
            }`}
          >
            <Icon name="shelves" size={16} />
            5. Kho & Vị Trí Kệ
          </button>

          <button
            onClick={() => setSubTab('estimator')}
            className={`px-3 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              subTab === 'estimator'
                ? 'border-primary text-primary'
                : 'border-transparent text-fg-muted hover:text-fg'
            }`}
          >
            <Icon name="receipt_long" size={16} />
            6. Dự Toán BOM Kỹ Thuật & Báo Giá Xưởng
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: FORMULA & OPERATING RATES */}
      {subTab === 'formula' && (
        <form onSubmit={handleSaveFormula} className="space-y-6">

          {/* KHO RIÊNG: pricing_global_settings — VAT · điện · nhân công (có audit log) */}
          <div className="bg-surface p-5 rounded-lg space-y-4 shadow-e1 border border-line">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-sm bg-accent/20 text-primary flex items-center justify-center font-bold">
                  <Icon name="receipt_long" size={18} />
                </span>
                <div>
                  <h3 className="flex items-center gap-1.5 text-sm font-bold text-fg">
                    0. Cấu Hình Chung Toàn Hệ Thống (VAT · Điện · Nhân Công)
                    <InfoTip label="Cấu hình chung được lưu ở đâu?">
                      Lưu ở bảng <span className="font-tech">pricing_global_settings</span> (kho riêng, có audit).
                      Ô trống = <strong>chưa cấu hình</strong> — hệ thống KHÔNG tự điền một con số đoán.
                    </InfoTip>
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSaveGlobalSettings}
                disabled={globalSaving}
                className="px-4 py-2 bg-primary hover:bg-primary-hover disabled:opacity-60 text-primary-fg text-xs font-bold rounded-sm transition-colors shadow-e1 flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Icon name="save" size={16} />
                {globalSaving ? 'Đang lưu…' : 'Lưu Cấu Hình Chung'}
              </button>
            </div>

            <div
              className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${
                globalIsReference ? '[&_input]:border [&_input]:border-dashed [&_input]:border-primary [&_input]:bg-accent/10' : ''
              }`}
            >
              <div>
                <label htmlFor="pricing-global-vat" className="block text-xs font-semibold text-fg mb-1">
                  Thuế VAT (%)
                </label>
                <input
                  id="pricing-global-vat"
                  type="number"
                  min={VAT_MIN_PERCENT}
                  max={VAT_MAX_PERCENT}
                  step="0.1"
                  placeholder="Chưa cấu hình"
                  value={globalForm.vatPercent}
                  onChange={(e) => {
                    const value = e.target.value;
                    setGlobalForm((prev) => ({ ...prev, vatPercent: value }));
                    setGlobalIssues((prev) => { if (!('vatPercent' in prev)) return prev; const next = { ...prev }; delete next.vatPercent; return next; });
                  }}
                  aria-invalid={!!globalIssues.vatPercent}
                  aria-describedby={globalIssues.vatPercent ? 'pricing-global-vat-error' : undefined}
                  className="w-full bg-surface-muted border border-line rounded-sm px-3 py-2 text-xs font-tech font-bold text-fg focus:outline-hidden focus:border-primary"
                />
                <FieldError id="pricing-global-vat" message={globalIssues.vatPercent} />
                <p className="text-xs text-fg-muted mt-1">
                  Khoảng {VAT_MIN_PERCENT}–{VAT_MAX_PERCENT}%. Bỏ trống = chưa cấu hình (KHÔNG mặc định 8%).
                </p>
              </div>

              <div>
                <label htmlFor="pricing-global-electricity" className="block text-xs font-semibold text-fg mb-1">
                  Đơn giá điện toàn hệ thống (VNĐ / kWh)
                </label>
                <input
                  id="pricing-global-electricity"
                  type="number"
                  min="0"
                  step="50"
                  placeholder="Chưa cấu hình"
                  value={globalForm.electricityRateVnd}
                  onChange={(e) => {
                    const value = e.target.value;
                    setGlobalForm((prev) => ({ ...prev, electricityRateVnd: value }));
                    setGlobalIssues((prev) => { if (!('electricityRateVnd' in prev)) return prev; const next = { ...prev }; delete next.electricityRateVnd; return next; });
                  }}
                  aria-invalid={!!globalIssues.electricityRateVnd}
                  aria-describedby={globalIssues.electricityRateVnd ? 'pricing-global-electricity-error' : undefined}
                  className="w-full bg-surface-muted border border-line rounded-sm px-3 py-2 text-xs font-tech font-bold text-fg focus:outline-hidden focus:border-primary"
                />
                <FieldError id="pricing-global-electricity" message={globalIssues.electricityRateVnd} />
                <p className="text-xs text-fg-muted mt-1">Bỏ trống = chưa cấu hình (KHÔNG mặc định 2850).</p>
              </div>

              <div>
                <label htmlFor="pricing-global-labor" className="block text-xs font-semibold text-fg mb-1">
                  Đơn giá nhân công toàn hệ thống (VNĐ / giờ)
                </label>
                <input
                  id="pricing-global-labor"
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="Chưa cấu hình"
                  value={globalForm.laborHourlyRateVnd}
                  onChange={(e) => {
                    const value = e.target.value;
                    setGlobalForm((prev) => ({ ...prev, laborHourlyRateVnd: value }));
                    setGlobalIssues((prev) => { if (!('laborHourlyRateVnd' in prev)) return prev; const next = { ...prev }; delete next.laborHourlyRateVnd; return next; });
                  }}
                  aria-invalid={!!globalIssues.laborHourlyRateVnd}
                  aria-describedby={globalIssues.laborHourlyRateVnd ? 'pricing-global-labor-error' : undefined}
                  className="w-full bg-surface-muted border border-line rounded-sm px-3 py-2 text-xs font-tech font-bold text-fg focus:outline-hidden focus:border-primary"
                />
                <FieldError id="pricing-global-labor" message={globalIssues.laborHourlyRateVnd} />
                <p className="text-xs text-fg-muted mt-1">Bỏ trống = chưa cấu hình (KHÔNG mặc định 65000).</p>
              </div>

              <div>
                <label htmlFor="pricing-global-marketplace-fee" className="block text-xs font-semibold text-fg mb-1">
                  Phí nền tảng toàn hệ thống (%)
                </label>
                <input
                  id="pricing-global-marketplace-fee"
                  type="number"
                  min={MARKETPLACE_FEE_MIN_PERCENT}
                  max={MARKETPLACE_FEE_MAX_PERCENT}
                  step="0.5"
                  placeholder="Chưa cấu hình"
                  value={globalForm.marketplaceFeePercent}
                  onChange={(e) => {
                    const value = e.target.value;
                    setGlobalForm((prev) => ({ ...prev, marketplaceFeePercent: value }));
                    setGlobalIssues((prev) => { if (!('marketplaceFeePercent' in prev)) return prev; const next = { ...prev }; delete next.marketplaceFeePercent; return next; });
                  }}
                  aria-invalid={!!globalIssues.marketplaceFeePercent}
                  aria-describedby={globalIssues.marketplaceFeePercent ? 'pricing-global-marketplace-fee-error' : undefined}
                  className="w-full bg-surface-muted border border-line rounded-sm px-3 py-2 text-xs font-tech font-bold text-fg focus:outline-hidden focus:border-primary"
                />
                <FieldError id="pricing-global-marketplace-fee" message={globalIssues.marketplaceFeePercent} />
                <p className="text-xs text-fg-muted mt-1">
                  Cột <span className="font-tech">marketplace_fee_percent</span>, khoảng {MARKETPLACE_FEE_MIN_PERCENT}–{MARKETPLACE_FEE_MAX_PERCENT}%. Bỏ trống = chưa cấu hình (KHÔNG mặc định 8).
                </p>
                <p className="text-xs text-fg-muted mt-1 leading-relaxed">
                  Đây là <strong>nguồn DUY NHẤT</strong> của phí nền tảng: engine đọc đúng cột này.
                  Ô "Phí Platform" trong công thức (mục 5) đã bị <strong>vô hiệu</strong> — engine không đọc nữa.
                </p>
              </div>
            </div>

            {/* BẢN XEM TRƯỚC TÁC ĐỘNG — ví dụ minh hoạ, tham số cố định in rõ bên dưới */}
            <div className="border-t border-line/60 pt-3 space-y-2">
              <div className="flex items-center gap-1.5">
                <Icon name="calculate" size={18} className="text-primary" />
                <h4 className="text-xs font-bold text-fg">Xem trước tác động lên một ví dụ minh hoạ</h4>
              </div>
              <p className="text-xs text-fg-muted leading-relaxed">
                Ví dụ minh hoạ, tham số CỐ ĐỊNH: máy in {PREVIEW_EXAMPLE.powerKW} kW chạy {PREVIEW_EXAMPLE.printHours} giờ
                ({PREVIEW_KWH.toLocaleString('vi-VN')} kWh) · {PREVIEW_EXAMPLE.laborMinutes} phút nhân công ·
                tiền hàng mẫu {PREVIEW_EXAMPLE.goodsVnd.toLocaleString('vi-VN')} đ. Đây KHÔNG phải số liệu của một đơn hàng thật.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-fg-subtle uppercase font-mono">
                      <th className="py-1.5 pr-3 font-bold">Hạng mục (ví dụ)</th>
                      <th className="py-1.5 pr-3 font-bold text-right">Đang lưu (DB)</th>
                      <th className="py-1.5 pr-3 font-bold text-right">Đang gõ</th>
                      <th className="py-1.5 font-bold text-right">Chênh lệch</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono">
                    {previewRows.map((row) => (
                      <tr key={row.key} className="border-t border-line/60">
                        <td className="py-1.5 pr-3 text-fg-muted">{row.label}</td>
                        <td className="py-1.5 pr-3 text-right text-fg">{formatPreviewVnd(row.saved)}</td>
                        <td className="py-1.5 pr-3 text-right text-fg">{formatPreviewVnd(row.typed)}</td>
                        <td className={`py-1.5 text-right font-bold ${
                          row.saved === null || row.typed === null
                            ? 'text-fg-subtle'
                            : row.typed === row.saved
                            ? 'text-fg-subtle'
                            : 'text-warning'
                        }`}>
                          {formatPreviewDelta(row.saved, row.typed)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <p className="text-xs text-fg-muted italic border-t border-line/60 pt-2">
              * Kho này là cấu hình CHUNG (VAT · điện · nhân công). Từ Đợt 9 (R1) pricing engine ĐỌC THẬT kho này:
              thiếu đơn giá điện hoặc đơn giá nhân công ⇒ engine CHẶN tính giá và nêu đích danh tham số còn thiếu
              (không còn rơi về 2850/65000 viết trong mã); <span className="font-tech">vat_percent</span> để trống
              ⇒ mọi màn hình ẩn dòng VAT và ghi rõ "VAT chưa được cấu hình".
              Các hệ số còn lại của công thức vẫn nằm ở bảng<span className="font-tech"> pricing_configs</span> bên dưới.
            </p>
          </div>

          <div
            className={`grid grid-cols-1 lg:grid-cols-3 gap-6 ${
              formulaIsReference ? '[&_input]:border [&_input]:border-dashed [&_input]:border-primary [&_input]:bg-accent/10' : ''
            }`}
          >

            {/* Section 1: Electricity & Energy */}
            <div className="bg-surface p-5 rounded-lg space-y-4 shadow-e1">
              <div className="flex items-center gap-2 border-b border-line pb-3">
                <span className="w-8 h-8 rounded-sm bg-warning-tint text-warning flex items-center justify-center font-bold">
                  <Icon name="bolt" size={18} />
                </span>
                <div>
                  <h3 className="font-bold text-sm text-fg">1. Đơn Giá Điện Năng</h3>
                  <p className="text-xs text-fg-muted">Điện sản xuất kinh doanh EVN</p>
                </div>
              </div>

              <div className="p-3 rounded-sm border border-warning/40 bg-warning-tint/40 space-y-2">
                <p className="text-xs font-bold text-warning flex items-start gap-1.5">
                  <Icon name="warning" size={18} className="text-warning shrink-0" />
                  <span>Ô NÀY ĐÃ HẾT TÁC DỤNG — đừng nhập giá điện ở đây.</span>
                </p>
                <p className="text-xs text-fg-muted leading-relaxed">
                  Nguồn thật là <span className="font-tech">pricing_global_settings.electricity_rate_vnd</span>, nhập ở
                  <strong> mục 0 — Cấu hình Chung Toàn Hệ Thống</strong> phía trên. Giá trị còn lưu trong
                  <span className="font-tech"> pricing_configs</span> chỉ để đọc lại cấu hình cũ — engine KHÔNG dùng.
                </p>
                <label htmlFor="cfg-electricity-rate" className="block text-xs text-fg-muted mb-1">
                  Đơn giá điện trong công thức (đã ngừng dùng — nhập ở mục 0)
                </label>
                <input
                  id="cfg-electricity-rate"
                  type="number"
                  disabled
                  readOnly
                  aria-describedby="cfg-electricity-rate-deprecated"
                  value={formulaForm.electricityRatePerKWh ?? ''}
                  placeholder="Không còn dùng"
                  className="w-full bg-surface-muted border border-line rounded-sm px-3 py-2 text-xs font-tech text-fg-subtle cursor-not-allowed"
                />
                <p id="cfg-electricity-rate-deprecated" className="text-xs text-fg-subtle">
                  * Công thức điện: Công suất máy (kW) × Giờ in (h) × Đơn giá điện (mục 0).
                </p>
              </div>

              <div className="pt-2 border-t border-line/60 space-y-3">
                <h4 className="font-bold text-xs text-fg flex items-center gap-1.5">
                  <Icon name="precision_manufacturing" size={16} className="text-primary" />
                  Khấu Hao Máy In Cơ Sở
                </h4>

                <div>
                  <label htmlFor="cfg-machine-depreciation" className="block text-xs text-fg-muted mb-1">
                    Khấu hao máy in cơ sở (VNĐ / giờ)
                  </label>
                  <div className="relative">
                    <input
                      id="cfg-machine-depreciation"
                      type="number"
                      step="250"
                      min="0"
                      placeholder="Chưa cấu hình"
                      value={formulaForm.defaultMachineDepreciationPerHour ?? ''}
                      onChange={(e) => updateFormulaField('defaultMachineDepreciationPerHour', e.target.value)}
                      aria-invalid={!!formulaIssues.defaultMachineDepreciationPerHour}
                      aria-describedby={formulaIssues.defaultMachineDepreciationPerHour ? 'cfg-machine-depreciation-error' : undefined}
                      className="w-full bg-surface-muted rounded-sm px-3 py-1.5 text-xs font-tech font-bold text-fg"
                    />
                    <span className="absolute right-3 top-1.5 text-xs text-fg-muted font-tech">VNĐ/h</span>
                  </div>
                  <FieldError id="cfg-machine-depreciation" message={formulaIssues.defaultMachineDepreciationPerHour} />
                </div>
              </div>

              <div className="pt-2 border-t border-line/60 space-y-3">
                <h4 className="font-bold text-xs text-fg flex items-center gap-1.5">
                  <Icon name="inventory" size={16} className="text-primary" />
                  Đóng Gói &amp; Vật Tư Hoàn Thiện
                </h4>

                <div>
                  <label htmlFor="cfg-packaging" className="block text-xs text-fg-muted mb-1">
                    Phí đóng gói cố định / sp (VNĐ)
                  </label>
                  <input
                    id="cfg-packaging"
                    type="number"
                    step="500"
                    min="0"
                    placeholder="Chưa cấu hình"
                    value={formulaForm.fixedPackagingCost ?? ''}
                    onChange={(e) => updateFormulaField('fixedPackagingCost', e.target.value)}
                    aria-invalid={!!formulaIssues.fixedPackagingCost}
                    aria-describedby={formulaIssues.fixedPackagingCost ? 'cfg-packaging-error' : undefined}
                    className="w-full bg-surface-muted rounded-sm px-3 py-1.5 text-xs font-tech font-bold text-fg"
                  />
                  <FieldError id="cfg-packaging" message={formulaIssues.fixedPackagingCost} />
                </div>

                <div>
                  <label htmlFor="cfg-ipa" className="block text-xs text-fg-muted mb-1">
                    Chi phí cồn IPA &amp; dung môi hoàn thiện / sp (VNĐ)
                  </label>
                  <input
                    id="cfg-ipa"
                    type="number"
                    step="500"
                    min="0"
                    placeholder="Chưa cấu hình"
                    value={formulaForm.ipaSolventCost ?? ''}
                    onChange={(e) => updateFormulaField('ipaSolventCost', e.target.value)}
                    aria-invalid={!!formulaIssues.ipaSolventCost}
                    aria-describedby={formulaIssues.ipaSolventCost ? 'cfg-ipa-error' : undefined}
                    className="w-full bg-surface-muted rounded-sm px-3 py-1.5 text-xs font-tech font-bold text-fg"
                  />
                  <FieldError id="cfg-ipa" message={formulaIssues.ipaSolventCost} />
                  <p className="text-xs text-fg-muted mt-0.5">Rửa siêu âm, dung môi IPA 99%, sấy UV sạch nhựa</p>
                </div>

                <div>
                  <label htmlFor="cfg-multicolor-packaging" className="block text-xs text-fg-muted mb-1">
                    Phụ phí đóng gói in đa màu (VNĐ)
                  </label>
                  <input
                    id="cfg-multicolor-packaging"
                    type="number"
                    step="500"
                    min="0"
                    placeholder="Chưa cấu hình"
                    value={formulaForm.multiColorPackagingExtra ?? ''}
                    onChange={(e) => updateFormulaField('multiColorPackagingExtra', e.target.value)}
                    aria-invalid={!!formulaIssues.multiColorPackagingExtra}
                    aria-describedby={formulaIssues.multiColorPackagingExtra ? 'cfg-multicolor-packaging-error' : undefined}
                    className="w-full bg-surface-muted rounded-sm px-3 py-1.5 text-xs font-tech font-bold text-fg"
                  />
                  <FieldError id="cfg-multicolor-packaging" message={formulaIssues.multiColorPackagingExtra} />
                </div>

                <div>
                  <label htmlFor="cfg-overhead" className="block text-xs text-fg-muted mb-1">
                    Chi phí quản lý mặt bằng xưởng / unit (VNĐ)
                  </label>
                  <input
                    id="cfg-overhead"
                    type="number"
                    step="1000"
                    min="0"
                    placeholder="Chưa cấu hình"
                    value={formulaForm.overheadPerUnit ?? ''}
                    onChange={(e) => updateFormulaField('overheadPerUnit', e.target.value)}
                    aria-invalid={!!formulaIssues.overheadPerUnit}
                    aria-describedby={formulaIssues.overheadPerUnit ? 'cfg-overhead-error' : undefined}
                    className="w-full bg-surface-muted rounded-sm px-3 py-1.5 text-xs font-tech font-bold text-fg"
                  />
                  <FieldError id="cfg-overhead" message={formulaIssues.overheadPerUnit} />
                </div>
              </div>
            </div>

            {/* Section 2: Labor & Technician Times */}
            <div className="bg-surface p-5 rounded-lg space-y-4 shadow-e1">
              <div className="flex items-center gap-2 border-b border-line pb-3">
                <span className="w-8 h-8 rounded-sm bg-info-tint text-info flex items-center justify-center font-bold">
                  <Icon name="engineering" size={18} />
                </span>
                <div>
                  <h3 className="font-bold text-sm text-fg">2. Nhân Công & Quy Trình Kỹ Thuật</h3>
                  <p className="text-xs text-fg-muted">Định mức công việc cho từng bước</p>
                </div>
              </div>

              <div className="p-3 rounded-sm border border-warning/40 bg-warning-tint/40 space-y-2">
                <p className="text-xs font-bold text-warning flex items-start gap-1.5">
                  <Icon name="warning" size={18} className="text-warning shrink-0" />
                  <span>Ô NÀY ĐÃ HẾT TÁC DỤNG — đừng nhập lương giờ ở đây.</span>
                </p>
                <p className="text-xs text-fg-muted leading-relaxed">
                  Nguồn thật là <span className="font-tech">pricing_global_settings.labor_hourly_rate_vnd</span>, nhập ở
                  <strong> mục 0 — Cấu hình Chung Toàn Hệ Thống</strong>. Các ô PHÚT bên dưới thật sự được engine dùng.
                </p>
                <label htmlFor="cfg-labor-rate" className="block text-xs text-fg-muted mb-1">
                  Mức lương kỹ thuật viên trong công thức (đã ngừng dùng — nhập ở mục 0)
                </label>
                <input
                  id="cfg-labor-rate"
                  type="number"
                  disabled
                  readOnly
                  aria-describedby="cfg-labor-rate-deprecated"
                  value={formulaForm.laborHourlyRate ?? ''}
                  placeholder="Không còn dùng"
                  className="w-full bg-surface-muted border border-line rounded-sm px-3 py-2 text-xs font-tech text-fg-subtle cursor-not-allowed"
                />
                <p id="cfg-labor-rate-deprecated" className="text-xs text-fg-subtle">
                  * Tiền công = (tổng số phút bên dưới ÷ 60) × Lương giờ (mục 0).
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label htmlFor="cfg-labor-file-review" className="block text-xs text-fg-muted mb-1">
                    Review file & Slicing (phút)
                  </label>
                  <input
                    id="cfg-labor-file-review"
                    type="number"
                    min="0"
                    placeholder="Chưa cấu hình"
                    value={formulaForm.fileReviewLaborMinutes ?? ''}
                    onChange={(e) => updateFormulaField('fileReviewLaborMinutes', e.target.value)}
                    aria-invalid={!!formulaIssues.fileReviewLaborMinutes}
                    aria-describedby={formulaIssues.fileReviewLaborMinutes ? 'cfg-labor-file-review-error' : undefined}
                    className="w-full bg-surface-muted rounded-sm px-2.5 py-1.5 text-xs font-tech text-fg"
                  />
                  <FieldError id="cfg-labor-file-review" message={formulaIssues.fileReviewLaborMinutes} />
                </div>
                <div>
                  <label htmlFor="cfg-labor-setup" className="block text-xs text-fg-muted mb-1">
                    Setup máy & bàn in (phút)
                  </label>
                  <input
                    id="cfg-labor-setup"
                    type="number"
                    min="0"
                    placeholder="Chưa cấu hình"
                    value={formulaForm.setupLaborMinutes ?? ''}
                    onChange={(e) => updateFormulaField('setupLaborMinutes', e.target.value)}
                    aria-invalid={!!formulaIssues.setupLaborMinutes}
                    aria-describedby={formulaIssues.setupLaborMinutes ? 'cfg-labor-setup-error' : undefined}
                    className="w-full bg-surface-muted rounded-sm px-2.5 py-1.5 text-xs font-tech text-fg"
                  />
                  <FieldError id="cfg-labor-setup" message={formulaIssues.setupLaborMinutes} />
                </div>
                <div>
                  <label htmlFor="cfg-labor-support" className="block text-xs text-fg-muted mb-1">
                    Tách Support (phút)
                  </label>
                  <input
                    id="cfg-labor-support"
                    type="number"
                    min="0"
                    placeholder="Chưa cấu hình"
                    value={formulaForm.supportRemovalMinutes ?? ''}
                    onChange={(e) => updateFormulaField('supportRemovalMinutes', e.target.value)}
                    aria-invalid={!!formulaIssues.supportRemovalMinutes}
                    aria-describedby={formulaIssues.supportRemovalMinutes ? 'cfg-labor-support-error' : undefined}
                    className="w-full bg-surface-muted rounded-sm px-2.5 py-1.5 text-xs font-tech text-fg"
                  />
                  <FieldError id="cfg-labor-support" message={formulaIssues.supportRemovalMinutes} />
                </div>
                <div>
                  <p className="text-xs font-bold text-warning mb-1" data-testid="can-anh-quyet-dinh">
                    cần anh quyết định — Inkiri không có tham số này
                  </p>
                  <label htmlFor="cfg-labor-no-support" className="block text-xs text-fg-muted mb-1">
                    Không dùng support (phút)
                  </label>
                  <input
                    id="cfg-labor-no-support"
                    type="number"
                    min="0"
                    placeholder="Chưa cấu hình"
                    value={formulaForm.noSupportRemovalMinutes ?? ''}
                    onChange={(e) => updateFormulaField('noSupportRemovalMinutes', e.target.value)}
                    aria-invalid={!!formulaIssues.noSupportRemovalMinutes}
                    aria-describedby={formulaIssues.noSupportRemovalMinutes ? 'cfg-labor-no-support-error' : undefined}
                    className="w-full bg-surface-muted rounded-sm px-2.5 py-1.5 text-xs font-tech text-fg"
                  />
                  <FieldError id="cfg-labor-no-support" message={formulaIssues.noSupportRemovalMinutes} />
                  <p className="text-xs text-fg-muted mt-0.5">Dùng khi đơn KHÔNG có support (trước đây cứng 2 phút)</p>
                </div>
                <div>
                  <label htmlFor="cfg-labor-post" className="block text-xs text-fg-muted mb-1">
                    Mài nhẵn Deburring (phút)
                  </label>
                  <input
                    id="cfg-labor-post"
                    type="number"
                    min="0"
                    placeholder="Chưa cấu hình"
                    value={formulaForm.postProcessingLaborMinutes ?? ''}
                    onChange={(e) => updateFormulaField('postProcessingLaborMinutes', e.target.value)}
                    aria-invalid={!!formulaIssues.postProcessingLaborMinutes}
                    aria-describedby={formulaIssues.postProcessingLaborMinutes ? 'cfg-labor-post-error' : undefined}
                    className="w-full bg-surface-muted rounded-sm px-2.5 py-1.5 text-xs font-tech text-fg"
                  />
                  <FieldError id="cfg-labor-post" message={formulaIssues.postProcessingLaborMinutes} />
                </div>
                <div>
                  <label htmlFor="cfg-labor-qc" className="block text-xs text-fg-muted mb-1">
                    Đo kiểm QC dung sai (phút)
                  </label>
                  <input
                    id="cfg-labor-qc"
                    type="number"
                    min="0"
                    placeholder="Chưa cấu hình"
                    value={formulaForm.qcLaborMinutes ?? ''}
                    onChange={(e) => updateFormulaField('qcLaborMinutes', e.target.value)}
                    aria-invalid={!!formulaIssues.qcLaborMinutes}
                    aria-describedby={formulaIssues.qcLaborMinutes ? 'cfg-labor-qc-error' : undefined}
                    className="w-full bg-surface-muted rounded-sm px-2.5 py-1.5 text-xs font-tech text-fg"
                  />
                  <FieldError id="cfg-labor-qc" message={formulaIssues.qcLaborMinutes} />
                </div>
                <div>
                  <label htmlFor="cfg-labor-packaging" className="block text-xs text-fg-muted mb-1">
                    Đóng gói hoàn thiện (phút)
                  </label>
                  <input
                    id="cfg-labor-packaging"
                    type="number"
                    min="0"
                    placeholder="Chưa cấu hình"
                    value={formulaForm.packagingLaborMinutes ?? ''}
                    onChange={(e) => updateFormulaField('packagingLaborMinutes', e.target.value)}
                    aria-invalid={!!formulaIssues.packagingLaborMinutes}
                    aria-describedby={formulaIssues.packagingLaborMinutes ? 'cfg-labor-packaging-error' : undefined}
                    className="w-full bg-surface-muted rounded-sm px-2.5 py-1.5 text-xs font-tech text-fg"
                  />
                  <FieldError id="cfg-labor-packaging" message={formulaIssues.packagingLaborMinutes} />
                </div>
              </div>

              <div className="p-2.5 bg-info-tint/60 rounded-sm border border-info/30 text-xs text-info font-tech">
                {totalLaborMins === null ? (
                  <>Tổng nhân công: <strong>Chưa cấu hình</strong> (còn định mức phút để trống)</>
                ) : (
                  <>
                    Tổng nhân công: <strong>{totalLaborMins} phút</strong> / sản phẩm
                    {laborCostPerUnit !== null && <> (~{laborCostPerUnit.toLocaleString()} đ)</>}
                  </>
                )}
              </div>
            </div>

            {/* Section 3: Risk Reserve, Markup & Fees */}
            <div className="bg-surface p-5 rounded-lg space-y-4 shadow-e1">
              <div className="flex items-center gap-2 border-b border-line pb-3">
                <span className="w-8 h-8 rounded-sm bg-positive-tint text-positive flex items-center justify-center font-bold">
                  <Icon name="trending_up" size={18} />
                </span>
                <div>
                  <h3 className="font-bold text-sm text-fg">3. Dự Phòng Rủi Ro & Lợi Nhuận</h3>
                  <p className="text-xs text-fg-muted">Tỉ lệ in hỏng, thuế & biên lợi nhuận</p>
                </div>
              </div>

              <div className="space-y-2.5">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <label htmlFor="cfg-markup" className="font-semibold text-fg">
                      Lợi nhuận mục tiêu (Markup %)
                    </label>
                    <span className="font-bold text-primary font-tech">
                      {isConfiguredNumber(formulaForm.defaultMarkupPercent) ? `${formulaForm.defaultMarkupPercent}%` : 'Chưa cấu hình'}
                    </span>
                  </div>
                  <input
                    id="cfg-markup"
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={isConfiguredNumber(formulaForm.defaultMarkupPercent) ? formulaForm.defaultMarkupPercent : 10}
                    onChange={(e) => updateFormulaField('defaultMarkupPercent', e.target.value)}
                    aria-invalid={!!formulaIssues.defaultMarkupPercent}
                    aria-describedby={formulaIssues.defaultMarkupPercent ? 'cfg-markup-error' : undefined}
                    className="w-full accent-primary"
                  />
                  <FieldError id="cfg-markup" message={formulaIssues.defaultMarkupPercent} />
                </div>

                <div>
                  <label htmlFor="cfg-profit-mode" className="block text-xs text-fg-muted mb-1">
                    Cách tính lợi nhuận
                  </label>
                  <select
                    id="cfg-profit-mode"
                    value={formulaForm.profitMode ?? 'markup'}
                    onChange={(e) => {
                      // `profitMode` là CHUỖI — KHÔNG dùng `updateFormulaField` (nó ép qua Number).
                      const value: 'markup' | 'margin' = e.target.value === 'margin' ? 'margin' : 'markup';
                      setFormulaForm((prev) => ({ ...prev, profitMode: value }));
                    }}
                    aria-describedby="cfg-profit-mode-help"
                    className="w-full bg-surface-muted border border-line rounded-sm px-2.5 py-1.5 text-xs font-tech text-fg cursor-pointer"
                  >
                    <option value="markup">Markup — lãi trên GIÁ VỐN (công thức hiện tại)</option>
                    <option value="margin" disabled>Margin — lãi trên GIÁ BÁN (chưa hỗ trợ)</option>
                  </select>
                  <p id="cfg-profit-mode-help" className="text-xs text-fg-muted mt-1 leading-relaxed">
                    Công thức hiện tại chỉ có <strong>Markup</strong>. Chọn <strong>Margin</strong> sẽ bị CHẶN kèm lỗi
                    (không âm thầm tính bằng Markup) vì đó là ĐỔI CÔNG THỨC — ngoài phạm vi "chỉ đổi nguồn thông số".
                  </p>
                </div>

                <div>
                  <label htmlFor="cfg-failure-reserve" className="block text-xs text-fg-muted mb-1">
                    Dự phòng rủi ro in lỗi cơ bản (%)
                  </label>
                  <input
                    id="cfg-failure-reserve"
                    type="number"
                    min="0"
                    max="30"
                    placeholder="Chưa cấu hình"
                    value={formulaForm.baseFailureReservePercent ?? ''}
                    onChange={(e) => updateFormulaField('baseFailureReservePercent', e.target.value)}
                    aria-invalid={!!formulaIssues.baseFailureReservePercent}
                    aria-describedby={formulaIssues.baseFailureReservePercent ? 'cfg-failure-reserve-error' : undefined}
                    className="w-full bg-surface-muted rounded-sm px-3 py-1.5 text-xs font-tech font-bold text-fg"
                  />
                  <FieldError id="cfg-failure-reserve" message={formulaIssues.baseFailureReservePercent} />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label htmlFor="cfg-low-printability" className="text-fg-muted block mb-1">
                      Mô hình khó &lt;80đ (%)
                    </label>
                    <input
                      id="cfg-low-printability"
                      type="number"
                      min="0"
                      max="100"
                      placeholder="Chưa cấu hình"
                      value={formulaForm.lowPrintabilityExtraPercent ?? ''}
                      onChange={(e) => updateFormulaField('lowPrintabilityExtraPercent', e.target.value)}
                      aria-invalid={!!formulaIssues.lowPrintabilityExtraPercent}
                      aria-describedby={formulaIssues.lowPrintabilityExtraPercent ? 'cfg-low-printability-error' : undefined}
                      className="w-full bg-surface-muted rounded-sm px-2.5 py-1 text-xs font-tech text-fg"
                    />
                    <FieldError id="cfg-low-printability" message={formulaIssues.lowPrintabilityExtraPercent} />
                  </div>
                  <div>
                    <label htmlFor="cfg-multicolor-extra" className="text-fg-muted block mb-1">
                      In nhiều màu AMS (%)
                    </label>
                    <input
                      id="cfg-multicolor-extra"
                      type="number"
                      min="0"
                      max="100"
                      placeholder="Chưa cấu hình"
                      value={formulaForm.multiColorExtraPercent ?? ''}
                      onChange={(e) => updateFormulaField('multiColorExtraPercent', e.target.value)}
                      aria-invalid={!!formulaIssues.multiColorExtraPercent}
                      aria-describedby={formulaIssues.multiColorExtraPercent ? 'cfg-multicolor-extra-error' : undefined}
                      className="w-full bg-surface-muted rounded-sm px-2.5 py-1 text-xs font-tech text-fg"
                    />
                    <FieldError id="cfg-multicolor-extra" message={formulaIssues.multiColorExtraPercent} />
                  </div>
                </div>

                <div className="pt-2 border-t border-line/60 space-y-2">
                  <h4 className="font-bold text-xs text-fg">Ngưỡng cảnh báo "đơn lớn" (chuyển sang kiểm duyệt)</h4>
                  <p className="text-xs font-bold text-warning" data-testid="can-anh-quyet-dinh">
                    cần anh quyết định — Inkiri không có ngưỡng cảnh báo "đơn lớn"; hệ thống KHÔNG tự đoán số.
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label htmlFor="cfg-bulk-qty-threshold" className="text-fg-muted block mb-1">
                        Từ số lượng (chiếc)
                      </label>
                      <input
                        id="cfg-bulk-qty-threshold"
                        type="number"
                        min="1"
                        step="1"
                        placeholder="Chưa cấu hình"
                        value={formulaForm.bulkOrderQuantityThreshold ?? ''}
                        onChange={(e) => updateFormulaField('bulkOrderQuantityThreshold', e.target.value)}
                        aria-invalid={!!formulaIssues.bulkOrderQuantityThreshold}
                        aria-describedby={formulaIssues.bulkOrderQuantityThreshold ? 'cfg-bulk-qty-threshold-error' : undefined}
                        className="w-full bg-surface-muted rounded-sm px-2.5 py-1 text-xs font-tech text-fg"
                      />
                      <FieldError id="cfg-bulk-qty-threshold" message={formulaIssues.bulkOrderQuantityThreshold} />
                    </div>
                    <div>
                      <label htmlFor="cfg-bulk-amount-threshold" className="text-fg-muted block mb-1">
                        Từ số tiền (VNĐ)
                      </label>
                      <input
                        id="cfg-bulk-amount-threshold"
                        type="number"
                        min="0"
                        step="100000"
                        placeholder="Chưa cấu hình"
                        value={formulaForm.bulkOrderAmountThresholdVnd ?? ''}
                        onChange={(e) => updateFormulaField('bulkOrderAmountThresholdVnd', e.target.value)}
                        aria-invalid={!!formulaIssues.bulkOrderAmountThresholdVnd}
                        aria-describedby={formulaIssues.bulkOrderAmountThresholdVnd ? 'cfg-bulk-amount-threshold-error' : undefined}
                        className="w-full bg-surface-muted rounded-sm px-2.5 py-1 text-xs font-tech text-fg"
                      />
                      <FieldError id="cfg-bulk-amount-threshold" message={formulaIssues.bulkOrderAmountThresholdVnd} />
                    </div>
                  </div>
                  <p className="text-xs text-fg-muted leading-relaxed">
                    Vượt MỘT trong hai ngưỡng ⇒ báo giá kèm lý do "đơn lớn cần kỹ sư xếp khay".
                    Trước đây hai số này cứng trong mã (50 chiếc / 15.000.000 đ).
                  </p>
                  <p className="text-xs text-fg-muted leading-relaxed border-t border-line/60 pt-2">
                    ⚠️ Phụ phí <strong>vật liệu khó</strong> KHÔNG còn là thông số chung: nay khai theo TỪNG vật liệu
                    (<strong>tab Danh Mục Nhựa &amp; Resin → Sửa vật liệu → "Phụ Phí Dự Phòng In Hỏng Riêng"</strong>).
                    Lý do: luật cũ nhận diện bằng chuỗi con trong <span className="font-tech">id</span>
                    (nylon/resin/pa-cf) nên trên nền tảng có id khác nó im lặng không chạy.
                  </p>
                </div>

                <div className="pt-2 border-t border-line/60 space-y-2">
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <label htmlFor="cfg-platform-fee" className="text-fg-muted block mb-1">
                        Phí Platform (đã ngừng dùng)
                      </label>
                      <input
                        id="cfg-platform-fee"
                        type="number"
                        disabled
                        readOnly
                        aria-describedby="cfg-platform-fee-deprecated"
                        value={formulaForm.platformCommissionPercent ?? ''}
                        placeholder="Không còn dùng"
                        className="w-full bg-surface-muted rounded-sm px-2 py-1 text-xs font-tech text-fg-subtle cursor-not-allowed"
                      />
                      <p id="cfg-platform-fee-deprecated" className="text-xs text-warning mt-1 leading-relaxed">
                        ⚠️ Engine KHÔNG đọc ô này. Phí nền tảng có MỘT nguồn: <strong>mục 0 — "Phí nền tảng toàn hệ thống (%)"</strong>.
                      </p>
                    </div>
                    <div>
                      <label htmlFor="cfg-gateway-fee" className="text-fg-muted block mb-1">
                        Cổng TT (%)
                      </label>
                      <input
                        id="cfg-gateway-fee"
                        type="number"
                        min="0"
                        max="100"
                        placeholder="Chưa cấu hình"
                        value={formulaForm.paymentGatewayFeePercent ?? ''}
                        onChange={(e) => updateFormulaField('paymentGatewayFeePercent', e.target.value)}
                        aria-invalid={!!formulaIssues.paymentGatewayFeePercent}
                        aria-describedby={formulaIssues.paymentGatewayFeePercent ? 'cfg-gateway-fee-error' : undefined}
                        className="w-full bg-surface-muted rounded-sm px-2 py-1 text-xs font-tech font-bold text-fg"
                      />
                      <FieldError id="cfg-gateway-fee" message={formulaIssues.paymentGatewayFeePercent} />
                    </div>
                    <div>
                      <label htmlFor="cfg-royalty" className="text-fg-muted block mb-1">
                        Bản quyền 3D (%)
                      </label>
                      <input
                        id="cfg-royalty"
                        type="number"
                        min="0"
                        max="100"
                        placeholder="Chưa cấu hình"
                        value={formulaForm.designerRoyaltyPercent ?? ''}
                        onChange={(e) => updateFormulaField('designerRoyaltyPercent', e.target.value)}
                        aria-invalid={!!formulaIssues.designerRoyaltyPercent}
                        aria-describedby={formulaIssues.designerRoyaltyPercent ? 'cfg-royalty-error' : undefined}
                        className="w-full bg-surface-muted rounded-sm px-2 py-1 text-xs font-tech font-bold text-fg"
                      />
                      <FieldError id="cfg-royalty" message={formulaIssues.designerRoyaltyPercent} />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="cfg-rounding" className="block text-xs text-fg-muted mb-1">
                      Quy tắc làm tròn giá
                    </label>
                    <select
                      id="cfg-rounding"
                      value={formulaForm.roundingRule ?? ''}
                      onChange={(e) => updateFormulaSelect(e.target.value)}
                      aria-invalid={!!formulaIssues.roundingRule}
                      aria-describedby={formulaIssues.roundingRule ? 'cfg-rounding-error' : undefined}
                      className="w-full bg-surface-muted rounded-sm px-2.5 py-1.5 text-xs text-fg font-medium"
                    >
                      <option value="">— Chưa cấu hình —</option>
                      <option value="1000">Làm tròn lên 1,000 đ (Khuyên dùng)</option>
                      <option value="5000">Làm tròn lên 5,000 đ</option>
                      <option value="10000">Làm tròn lên 10,000 đ</option>
                    </select>
                    <FieldError id="cfg-rounding" message={formulaIssues.roundingRule} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Volume Discount Tiers */}
          <div className="bg-surface p-5 rounded-lg space-y-4 shadow-e1">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <h3 className="font-bold text-sm text-fg">4. Bảng Chiết Khấu Số Lượng (Volume Discount Tiers)</h3>
                <p className="text-xs text-fg-muted">Tự động áp dụng mức giảm giá khi khách hàng đặt in số lượng lớn</p>
              </div>
              <button
                type="button"
                onClick={handleAddDiscountTier}
                className="px-3 py-1.5 bg-primary text-primary-fg hover:bg-primary-hover text-xs font-bold rounded-sm flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Icon name="add" size={16} />
                Thêm Mốc Chiết Khấu
              </button>
            </div>

            {(formulaForm.volumeDiscounts ?? []).length === 0 && (
              <p className="text-xs text-fg-muted italic">
                Chưa có bậc chiết khấu nào được cấu hình. Bấm “Thêm Mốc Chiết Khấu” rồi nhập số thật — hệ thống không tự tạo bậc mẫu.
              </p>
            )}

            <div className="responsive-table-wrapper">
              <table className="text-left text-xs font-sans">
                <thead className="bg-surface-muted border-b border-line text-xs text-fg-muted uppercase tracking-wider">
                  <tr>
                    <th className="p-3">Số lượng tối thiểu (Min)</th>
                    <th className="p-3">Số lượng tối đa (Max)</th>
                    <th className="p-3">Mức giảm giá (%)</th>
                    <th className="p-3">Nhãn hiển thị khách hàng</th>
                    <th className="p-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/40">
                  {(formulaForm.volumeDiscounts ?? []).map((tier, idx) => (
                    <tr key={idx} className="hover:bg-canvas transition-colors">
                      <td className="p-3">
                        <label htmlFor={`tier-${idx}-min`} className="sr-only">{`Bậc ${idx + 1}: số lượng tối thiểu`}</label>
                        <input
                          id={`tier-${idx}-min`}
                          type="number"
                          min="1"
                          placeholder="Chưa cấu hình"
                          value={tier.minQty ?? ''}
                          onChange={(e) => handleUpdateDiscountTier(idx, { minQty: numberOrUndefined(e.target.value) })}
                          aria-invalid={!!formulaIssues[`volumeDiscounts.${idx}.minQty`]}
                          aria-describedby={formulaIssues[`volumeDiscounts.${idx}.minQty`] ? `tier-${idx}-min-error` : undefined}
                          className="w-24 bg-surface-muted rounded-sm px-2.5 py-1 text-xs font-tech font-bold text-fg"
                        />
                        <FieldError id={`tier-${idx}-min`} message={formulaIssues[`volumeDiscounts.${idx}.minQty`]} />
                      </td>
                      <td className="p-3">
                        <label htmlFor={`tier-${idx}-max`} className="sr-only">{`Bậc ${idx + 1}: số lượng tối đa`}</label>
                        <input
                          id={`tier-${idx}-max`}
                          type="number"
                          placeholder="Không giới hạn"
                          value={tier.maxQty !== undefined ? tier.maxQty : ''}
                          onChange={(e) => handleUpdateDiscountTier(idx, { maxQty: numberOrUndefined(e.target.value) })}
                          className="w-28 bg-surface-muted rounded-sm px-2.5 py-1 text-xs font-tech text-fg"
                        />
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <label htmlFor={`tier-${idx}-discount`} className="sr-only">{`Bậc ${idx + 1}: mức giảm giá`}</label>
                          <input
                            id={`tier-${idx}-discount`}
                            type="number"
                            min="0"
                            max="70"
                            placeholder="—"
                            value={tier.discountPercent ?? ''}
                            onChange={(e) => handleUpdateDiscountTier(idx, { discountPercent: numberOrUndefined(e.target.value) })}
                            aria-invalid={!!formulaIssues[`volumeDiscounts.${idx}.discountPercent`]}
                            aria-describedby={formulaIssues[`volumeDiscounts.${idx}.discountPercent`] ? `tier-${idx}-discount-error` : undefined}
                            className="w-20 bg-surface-muted rounded-sm px-2.5 py-1 text-xs font-tech font-bold text-positive"
                          />
                          <span className="font-tech text-xs font-bold text-positive">%</span>
                        </div>
                        <FieldError id={`tier-${idx}-discount`} message={formulaIssues[`volumeDiscounts.${idx}.discountPercent`]} />
                      </td>
                      <td className="p-3">
                        <label htmlFor={`tier-${idx}-label`} className="sr-only">{`Bậc ${idx + 1}: nhãn hiển thị`}</label>
                        <input
                          id={`tier-${idx}-label`}
                          type="text"
                          placeholder="VD: 50+ chiếc"
                          value={tier.label ?? ''}
                          onChange={(e) => handleUpdateDiscountTier(idx, { label: e.target.value })}
                          aria-invalid={!!formulaIssues[`volumeDiscounts.${idx}.label`]}
                          aria-describedby={formulaIssues[`volumeDiscounts.${idx}.label`] ? `tier-${idx}-label-error` : undefined}
                          className="w-full bg-surface-muted rounded-sm px-2.5 py-1 text-xs text-fg"
                        />
                        <FieldError id={`tier-${idx}-label`} message={formulaIssues[`volumeDiscounts.${idx}.label`]} />
                      </td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveDiscountTier(idx)}
                          className="text-danger hover:text-danger p-1 rounded-sm transition-colors cursor-pointer"
                          title="Xóa mốc"
                          aria-label={`Xóa bậc ${idx + 1}`}
                        >
                          <Icon name="delete" size={18} />
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
            <div className="bg-surface p-5 rounded-lg space-y-4 shadow-e1">
              <div className="flex items-center gap-2 border-b border-line pb-3">
                <span className="w-8 h-8 rounded-sm bg-info-tint text-info flex items-center justify-center font-bold">
                  <Icon name="edit_note" size={18} />
                </span>
                <div>
                  <h3 className="font-bold text-sm text-fg">5. Phí Dịch Vụ Cá Nhân Hóa</h3>
                  <p className="text-xs text-fg-muted">Khắc laser, đùn nổi & logo vector</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label htmlFor="cfg-engraving-fee" className="block text-xs text-fg-muted mb-1">
                    Phí khắc tên / Laser / Chữ nổi (VNĐ)
                  </label>
                  <input
                    id="cfg-engraving-fee"
                    type="number"
                    step="5000"
                    min="0"
                    placeholder="Chưa cấu hình"
                    value={formulaForm.customEngravingFee ?? ''}
                    onChange={(e) => updateFormulaField('customEngravingFee', e.target.value)}
                    aria-invalid={!!formulaIssues.customEngravingFee}
                    aria-describedby={formulaIssues.customEngravingFee ? 'cfg-engraving-fee-error' : undefined}
                    className="w-full bg-surface-muted rounded-sm px-3 py-1.5 text-xs font-tech font-bold text-fg"
                  />
                  <FieldError id="cfg-engraving-fee" message={formulaIssues.customEngravingFee} />
                  <p className="text-xs text-fg-muted mt-1">Áp dụng khi khách yêu cầu khắc text cá nhân hóa trên sản phẩm</p>
                </div>

                <div>
                  <label htmlFor="cfg-logo-fee" className="block text-xs text-fg-muted mb-1">
                    Phí xử lý & Đùn Logo Doanh Nghiệp (VNĐ)
                  </label>
                  <input
                    id="cfg-logo-fee"
                    type="number"
                    step="5000"
                    min="0"
                    placeholder="Chưa cấu hình"
                    value={formulaForm.customLogoUploadFee ?? ''}
                    onChange={(e) => updateFormulaField('customLogoUploadFee', e.target.value)}
                    aria-invalid={!!formulaIssues.customLogoUploadFee}
                    aria-describedby={formulaIssues.customLogoUploadFee ? 'cfg-logo-fee-error' : undefined}
                    className="w-full bg-surface-muted rounded-sm px-3 py-1.5 text-xs font-tech font-bold text-fg"
                  />
                  <FieldError id="cfg-logo-fee" message={formulaIssues.customLogoUploadFee} />
                  <p className="text-xs text-fg-muted mt-1">Xử lý vector SVG/PNG sang dạng 3D dập nổi/chìm</p>
                </div>
              </div>
            </div>

            {/* Section 6: Delivery Packages Config */}
            <div className="bg-surface p-5 rounded-lg space-y-4 shadow-e1">
              <div className="flex items-center gap-2 border-b border-line pb-3">
                <span className="w-8 h-8 rounded-sm bg-primary-tint text-primary flex items-center justify-center font-bold">
                  <Icon name="local_shipping" size={18} />
                </span>
                <div>
                  <h3 className="font-bold text-sm text-fg">6. Gói Giao Hàng & Hỏa Tốc</h3>
                  <p className="text-xs text-fg-muted">Chiết khấu ghép khay & phụ phí gấp</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label htmlFor="cfg-economy-discount" className="block text-xs text-fg-muted mb-1">
                    Chiết khấu Gói Tiết Kiệm (5-7 ngày) (%)
                  </label>
                  <div className="relative">
                    <input
                      id="cfg-economy-discount"
                      type="number"
                      min="0"
                      max="30"
                      placeholder="Chưa cấu hình"
                      value={formulaForm.economyDiscountPercent ?? ''}
                      onChange={(e) => updateFormulaField('economyDiscountPercent', e.target.value)}
                      aria-invalid={!!formulaIssues.economyDiscountPercent}
                      aria-describedby={formulaIssues.economyDiscountPercent ? 'cfg-economy-discount-error' : undefined}
                      className="w-full bg-surface-muted rounded-sm px-3 py-1.5 text-xs font-tech font-bold text-fg"
                    />
                    <span className="absolute right-3 top-1.5 text-xs text-fg-muted font-tech">%</span>
                  </div>
                  <FieldError id="cfg-economy-discount" message={formulaIssues.economyDiscountPercent} />
                  <p className="text-xs text-fg-muted mt-1">Giảm giá cho khách chấp nhận chờ xưởng gom đủ mẻ in</p>
                </div>

                <div>
                  <label htmlFor="cfg-express-surcharge" className="block text-xs text-fg-muted mb-1">
                    Phụ phí Gói Hỏa Tốc 24H (%)
                  </label>
                  <div className="relative">
                    <input
                      id="cfg-express-surcharge"
                      type="number"
                      min="0"
                      max="100"
                      placeholder="Chưa cấu hình"
                      value={formulaForm.expressRushSurchargePercent ?? ''}
                      onChange={(e) => updateFormulaField('expressRushSurchargePercent', e.target.value)}
                      aria-invalid={!!formulaIssues.expressRushSurchargePercent}
                      aria-describedby={formulaIssues.expressRushSurchargePercent ? 'cfg-express-surcharge-error' : undefined}
                      className="w-full bg-surface-muted rounded-sm px-3 py-1.5 text-xs font-tech font-bold text-fg"
                    />
                    <span className="absolute right-3 top-1.5 text-xs text-fg-muted font-tech">%</span>
                  </div>
                  <FieldError id="cfg-express-surcharge" message={formulaIssues.expressRushSurchargePercent} />
                  <p className="text-xs text-fg-muted mt-1">Phụ thu ưu tiên chen hàng vào máy và ca trực đêm</p>
                </div>
              </div>
            </div>

            {/* Section 7: Slicing Model Constants */}
            <div className="bg-surface p-5 rounded-lg space-y-4 shadow-e1">
              <div className="flex items-center gap-2 border-b border-line pb-3">
                <span className="w-8 h-8 rounded-sm bg-warning-tint text-warning flex items-center justify-center font-bold">
                  <Icon name="tune" size={18} />
                </span>
                <div>
                  <h3 className="font-bold text-sm text-fg">7. Tham Số Slicing & Tháp Xả</h3>
                  <p className="text-xs text-fg-muted">Hệ số tiêu hao support, brim & AMS</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label htmlFor="cfg-support-ratio" className="block text-xs text-fg-muted mb-1">
                    Tỷ lệ Support (%)
                  </label>
                  <input
                    id="cfg-support-ratio"
                    type="number"
                    min="0"
                    max="50"
                    placeholder="Chưa cấu hình"
                    value={formulaForm.supportVolumeRatioPercent ?? ''}
                    onChange={(e) => updateFormulaField('supportVolumeRatioPercent', e.target.value)}
                    aria-invalid={!!formulaIssues.supportVolumeRatioPercent}
                    aria-describedby={formulaIssues.supportVolumeRatioPercent ? 'cfg-support-ratio-error' : undefined}
                    className="w-full bg-surface-muted rounded-sm px-2.5 py-1 text-xs font-tech font-bold text-fg"
                  />
                  <FieldError id="cfg-support-ratio" message={formulaIssues.supportVolumeRatioPercent} />
                </div>
                <div>
                  <label htmlFor="cfg-brim-grams" className="block text-xs text-fg-muted mb-1">
                    Nhựa Brim/Raft (g)
                  </label>
                  <input
                    id="cfg-brim-grams"
                    type="number"
                    min="0"
                    max="30"
                    placeholder="Chưa cấu hình"
                    value={formulaForm.brimRaftGrams ?? ''}
                    onChange={(e) => updateFormulaField('brimRaftGrams', e.target.value)}
                    aria-invalid={!!formulaIssues.brimRaftGrams}
                    aria-describedby={formulaIssues.brimRaftGrams ? 'cfg-brim-grams-error' : undefined}
                    className="w-full bg-surface-muted rounded-sm px-2.5 py-1 text-xs font-tech font-bold text-fg"
                  />
                  <FieldError id="cfg-brim-grams" message={formulaIssues.brimRaftGrams} />
                </div>
                <div>
                  <label htmlFor="cfg-purge-grams" className="block text-xs text-fg-muted mb-1">
                    Purge tháp xả / màu (g)
                  </label>
                  <input
                    id="cfg-purge-grams"
                    type="number"
                    min="0"
                    max="100"
                    placeholder="Chưa cấu hình"
                    value={formulaForm.multiColorPurgeWasteGrams ?? ''}
                    onChange={(e) => updateFormulaField('multiColorPurgeWasteGrams', e.target.value)}
                    aria-invalid={!!formulaIssues.multiColorPurgeWasteGrams}
                    aria-describedby={formulaIssues.multiColorPurgeWasteGrams ? 'cfg-purge-grams-error' : undefined}
                    className="w-full bg-surface-muted rounded-sm px-2.5 py-1 text-xs font-tech font-bold text-fg"
                  />
                  <FieldError id="cfg-purge-grams" message={formulaIssues.multiColorPurgeWasteGrams} />
                </div>
                <div>
                  <label htmlFor="cfg-toolchange-mins" className="block text-xs text-fg-muted mb-1">
                    Đổi màu AMS (phút)
                  </label>
                  <input
                    id="cfg-toolchange-mins"
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="Chưa cấu hình"
                    value={formulaForm.multiColorToolChangeMins ?? ''}
                    onChange={(e) => updateFormulaField('multiColorToolChangeMins', e.target.value)}
                    aria-invalid={!!formulaIssues.multiColorToolChangeMins}
                    aria-describedby={formulaIssues.multiColorToolChangeMins ? 'cfg-toolchange-mins-error' : undefined}
                    className="w-full bg-surface-muted rounded-sm px-2.5 py-1 text-xs font-tech font-bold text-fg"
                  />
                  <FieldError id="cfg-toolchange-mins" message={formulaIssues.multiColorToolChangeMins} />
                </div>
                <div>
                  <label htmlFor="cfg-fast-estimator-overhead" className="block text-xs text-fg-muted mb-1">
                    Overhead bộ tính nhanh (VNĐ)
                  </label>
                  <input
                    id="cfg-fast-estimator-overhead"
                    type="number"
                    min="0"
                    step="1000"
                    placeholder="Chưa cấu hình"
                    value={formulaForm.fastEstimatorBaseOverhead ?? ''}
                    onChange={(e) => updateFormulaField('fastEstimatorBaseOverhead', e.target.value)}
                    aria-invalid={!!formulaIssues.fastEstimatorBaseOverhead}
                    aria-describedby={formulaIssues.fastEstimatorBaseOverhead ? 'cfg-fast-estimator-overhead-error' : undefined}
                    className="w-full bg-surface-muted rounded-sm px-2.5 py-1 text-xs font-tech font-bold text-fg"
                  />
                  <FieldError id="cfg-fast-estimator-overhead" message={formulaIssues.fastEstimatorBaseOverhead} />
                  <p className="text-xs text-fg-muted mt-0.5">
                    Chỉ dùng cho bộ ước lượng nhanh ở trang chủ (HomeView); engine tính giá KHÔNG đọc ô này.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="submit"
              className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-primary-fg font-bold text-xs uppercase tracking-wider rounded-sm transition-colors shadow-e1 flex items-center gap-2 cursor-pointer"
            >
              <Icon name="check_circle" size={18} />
              Lưu Toàn Bộ Cấu Hình Công Thức
            </button>
          </div>
        </form>
      )}

      {/* SUB-TAB 2: MATERIALS CATALOG CRUD */}
      {subTab === 'materials' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-4 sm:p-5 rounded-lg">
            <div>
              <h3 className="font-bold text-sm text-fg">Danh Sách Nhựa & Vật Liệu Đang Quản Lý ({materials.length})</h3>
              <p className="text-xs text-fg-muted">Quản lý giá nhập cuộn, đơn giá tính theo gram, thông số nhiệt độ đùn và tồn kho</p>
            </div>
            <button
              onClick={() => setIsNewMaterialOpen(true)}
              className="px-4 py-2 bg-primary hover:bg-primary-hover text-primary-fg text-xs font-bold uppercase rounded-sm flex items-center gap-1.5 cursor-pointer transition-colors shadow-e1"
            >
              <Icon name="add" size={16} />
              Thêm Vật Liệu Mới
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {materials.map((mat) => (
              <div key={mat.id} className="bg-surface rounded-lg p-5 space-y-4 hover:shadow-e2 transition-shadow relative">
                <div className="flex items-start justify-between gap-2 border-b border-line/60 pb-3">
                  <div>
                    <span className="text-xs font-tech uppercase text-fg-muted font-bold block">{mat.brand || 'Filament'}</span>
                    <h4 className="font-bold text-sm text-fg">{mat.name}</h4>
                  </div>
                  <span className={`px-2 py-0.5 text-xs font-tech font-bold uppercase rounded-sm ${
                    mat.inStock ? 'bg-positive-tint text-positive' : 'bg-danger-tint text-danger'
                  }`}>
                    {mat.inStock
                      ? isConfiguredNumber(mat.stockRollsCount)
                        ? `Còn hàng (${mat.stockRollsCount} cuộn)`
                        : 'Còn hàng (chưa kiểm kê số cuộn)'
                      : 'Tạm hết'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-surface-muted p-2.5 rounded-sm border border-line/40">
                    <span className="text-xs text-fg-muted block uppercase">Giá Nhập / Kg</span>
                    <span className="font-bold text-sm text-fg font-tech">
                      {isConfiguredNumber(mat.costPerKg)
                        ? `${mat.costPerKg.toLocaleString()} đ`
                        : isConfiguredNumber(mat.pricePerGram)
                          ? `${(mat.pricePerGram * 1000).toLocaleString()} đ (quy đổi từ đơn giá/g)`
                          : '—'}
                    </span>
                  </div>
                  <div className="bg-primary/10 p-2.5 rounded-sm border border-primary/20">
                    <span className="text-xs text-primary block uppercase font-bold">Giá Tính Khách / g</span>
                    <span className="font-bold text-sm text-primary font-tech">
                      {isConfiguredNumber(mat.pricePerGram) ? `${mat.pricePerGram.toLocaleString()} đ/g` : '—'}
                    </span>
                  </div>
                </div>

                <div className="space-y-1 text-xs text-fg-muted">
                  <div className="flex justify-between">
                    <span>Khối lượng riêng (Density):</span>
                    <strong className="text-fg font-tech">{mat.density} g/cm³</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Nhiệt độ đùn:</span>
                    <strong className="text-fg font-tech">
                      {isConfiguredNumber(mat.extruderTempMin) && isConfiguredNumber(mat.extruderTempMax)
                        ? `${mat.extruderTempMin}°C - ${mat.extruderTempMax}°C`
                        : '—'}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Nhiệt độ bàn in:</span>
                    <strong className="text-fg font-tech">{isConfiguredNumber(mat.bedTemp) ? `${mat.bedTemp}°C` : '—'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Chịu nhiệt / Độ bền:</span>
                    <strong className="text-fg">{(mat.heatResistance || '—')} / {(mat.strength || '—')}</strong>
                  </div>
                </div>

                {mat.colors && mat.colors.length > 0 && (
                  <div className="flex items-center gap-1.5 pt-2 border-t border-line/40">
                    <span className="text-xs text-fg-muted">Màu có sẵn:</span>
                    <div className="flex items-center gap-1">
                      {mat.colors.map((c, i) => (
                        <span key={i} className="w-3.5 h-3.5 rounded-full border border-line shadow-e1" style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-line/40">
                  <button
                    onClick={() => setEditingMaterial({ ...mat })}
                    className="px-3 py-1.5 bg-surface-muted hover:bg-line-subtle border border-line text-fg text-xs font-bold rounded-sm flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Icon name="edit" size={16} />
                    Sửa
                  </button>
                  <button aria-label="Xoá"
                    onClick={() => handleDeleteMaterial(mat.id, mat.name)}
                    className="px-2.5 py-1.5 text-danger hover:bg-danger-tint rounded-sm text-xs transition-colors cursor-pointer"
                  >
                    <Icon name="delete" size={16} />
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-4 sm:p-5 rounded-lg">
            <div>
              <h3 className="font-bold text-sm text-fg">Danh Sách Đội Máy In Công Nghiệp ({printers.length})</h3>
              <p className="text-xs text-fg-muted">Khổ bàn in, công suất điện kW, khấu hao máy theo giờ và chi phí linh kiện thay thế</p>
            </div>
            <button
              onClick={() => setIsNewPrinterOpen(true)}
              className="px-4 py-2 bg-primary hover:bg-primary-hover text-primary-fg text-xs font-bold uppercase rounded-sm flex items-center gap-1.5 cursor-pointer transition-colors shadow-e1"
            >
              <Icon name="add" size={16} />
              Thêm Máy In Mới
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {printers.map((prn) => (
              <div key={prn.id} className="bg-surface rounded-lg p-5 space-y-4 hover:shadow-e2 transition-shadow">
                <div className="flex items-start justify-between gap-2 border-b border-line/60 pb-3">
                  <div>
                    <span className="text-xs font-tech uppercase text-fg-muted font-bold block">{(prn.brand || '—')} // {(prn.technology || '—')}</span>
                    <h4 className="font-bold text-sm text-fg">{prn.name}</h4>
                  </div>
                  <span className={`px-2 py-0.5 text-xs font-tech font-bold uppercase rounded-sm ${
                    prn.status === 'Printing' ? 'bg-warning-tint text-warning animate-pulse' :
                    prn.status === 'Idle' ? 'bg-positive-tint text-positive' :
                    'bg-line-subtle text-fg-muted'
                  }`}>
                    {prn.status === 'Printing' ? 'Đang In' : prn.status === 'Idle' ? 'Sẵn Sàng' : 'Bảo Trì'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-surface-muted p-2.5 rounded-sm border border-line/40">
                    <span className="text-xs text-fg-muted block uppercase">Khổ Bàn In (X×Y×Z)</span>
                    <span className="font-bold text-sm text-fg font-tech">
                      {isConfiguredNumber(prn.bedDimensions?.x) && isConfiguredNumber(prn.bedDimensions?.y) && isConfiguredNumber(prn.bedDimensions?.z)
                        ? `${prn.bedDimensions.x}×${prn.bedDimensions.y}×${prn.bedDimensions.z}`
                        : '—'}
                    </span>
                    <span className="text-xs text-fg-muted font-tech block">mm</span>
                  </div>
                  <div className="bg-surface-muted p-2.5 rounded-sm border border-line/40">
                    <span className="text-xs text-fg-muted block uppercase">Công Suất Điện</span>
                    <span className="font-bold text-sm text-fg font-tech">
                      {isConfiguredNumber(prn.powerKW) ? `${prn.powerKW} kW` : '—'}
                    </span>
                    <span className="text-xs text-warning font-tech block">
                      {isConfiguredNumber(prn.powerKW) && isConfiguredNumber(formulaForm.electricityRatePerKWh)
                        ? `~${Math.round(prn.powerKW * formulaForm.electricityRatePerKWh).toLocaleString()} đ/h`
                        : '—'}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-fg-muted">
                  <div className="flex justify-between">
                    <span>Giá trị đầu tư:</span>
                    <strong className="text-fg font-tech">{isConfiguredNumber(prn.acquisitionCost) ? `${prn.acquisitionCost.toLocaleString()} đ` : '—'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Tuổi thọ khấu hao:</span>
                    <strong className="text-fg font-tech">{isConfiguredNumber(prn.expectedLifetimeHours) ? `${prn.expectedLifetimeHours.toLocaleString()} giờ` : '—'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Hao mòn linh kiện / giờ:</span>
                    <strong className="text-fg font-tech">{isConfiguredNumber(prn.consumablesHourlyRate) ? `${prn.consumablesHourlyRate.toLocaleString()} đ/h` : '—'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Tốc độ in tối đa:</span>
                    <strong className="text-fg font-tech">{isConfiguredNumber(prn.maxPrintSpeedMmS) ? `${prn.maxPrintSpeedMmS} mm/s` : '—'}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2 border-t border-line/40 text-xs">
                  <span className={`inline-flex items-center gap-1 ${prn.hasEnclosure ? 'text-positive' : 'text-fg-subtle'}`}>
                    <Icon name={prn.hasEnclosure ? 'check_box' : 'check_box_outline_blank'} size={16} />
                    Buồng Kín
                  </span>
                  <span className={`inline-flex items-center gap-1 ${prn.hasAMS ? 'text-positive' : 'text-fg-subtle'}`}>
                    <Icon name={prn.hasAMS ? 'check_box' : 'check_box_outline_blank'} size={16} />
                    Bộ Đa Màu AMS
                  </span>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-line/40">
                  <button
                    onClick={() => setEditingPrinter({ ...prn })}
                    className="px-3 py-1.5 bg-surface-muted hover:bg-line-subtle border border-line text-fg text-xs font-bold rounded-sm flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Icon name="edit" size={16} />
                    Sửa
                  </button>
                  <button aria-label="Xoá"
                    onClick={() => handleDeletePrinter(prn.id, prn.name)}
                    className="px-2.5 py-1.5 text-danger hover:bg-danger-tint rounded-sm text-xs transition-colors cursor-pointer"
                  >
                    <Icon name="delete" size={16} />
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
          pricingConfig={formulaForm as unknown as InkiriCostFormulaConfig}
          onShowToast={onShowToast}
        />
      )}

      {/* NEW/EDIT MATERIAL MODAL */}
      {(isNewMaterialOpen || editingMaterial) && (
        <div className="fixed inset-0 z-modal bg-surface-inverse/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-surface rounded-lg max-w-lg w-full p-6 space-y-4 border border-line shadow-e3">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="font-bold text-base text-fg">
                {editingMaterial ? `Chỉnh Sửa Vật Liệu: ${editingMaterial.name}` : 'Thêm Vật Liệu In 3D Mới'}
              </h3>
              <button aria-label="Đóng"
                onClick={() => { setIsNewMaterialOpen(false); setEditingMaterial(null); setMaterialIssues({}); }}
                className="text-fg-muted hover:text-fg cursor-pointer"
              >
                <Icon name="close" size={20} />
              </button>
            </div>

            <form onSubmit={editingMaterial ? handleSaveEditMaterial : handleSaveNewMaterial} className="space-y-3 text-xs">
              {Object.keys(materialIssues).length > 0 && (
                <p role="alert" className="p-2 rounded-sm bg-danger-tint border border-danger/30 text-danger font-semibold">
                  KHÔNG lưu: còn {Object.keys(materialIssues).length} ô chưa cấu hình hoặc không hợp lệ. Hệ thống không tự điền giá trị đoán.
                </p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label htmlFor="mat-name" className="block font-semibold mb-1 text-fg">Tên Vật Liệu *</label>
                  <input
                    id="mat-name"
                    type="text"
                    required
                    placeholder="VD: PLA Tough Plus, PETG-CF, Resin High Temp..."
                    value={editingMaterial ? editingMaterial.name : (materialForm.name ?? '')}
                    onChange={(e) => setMaterialField('name', e.target.value)}
                    aria-invalid={!!materialIssues.name}
                    aria-describedby={materialIssues.name ? 'mat-name-error' : undefined}
                    className="w-full bg-surface-muted rounded-sm px-3 py-2 text-xs"
                  />
                  <FieldError id="mat-name" message={materialIssues.name} />
                </div>

                <div>
                  <label htmlFor="mat-brand" className="block font-semibold mb-1 text-fg">Thương Hiệu</label>
                  <input
                    id="mat-brand"
                    type="text"
                    value={editingMaterial ? (editingMaterial.brand ?? '') : (materialForm.brand ?? '')}
                    onChange={(e) => setMaterialField('brand', e.target.value)}
                    className="w-full bg-surface-muted rounded-sm px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label htmlFor="mat-density" className="block font-semibold mb-1 text-fg">Khối Lượng Riêng (g/cm³)</label>
                  <input
                    id="mat-density"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Chưa cấu hình"
                    value={editingMaterial ? (editingMaterial.density ?? '') : (materialForm.density ?? '')}
                    onChange={(e) => setMaterialField('density', numberOrUndefined(e.target.value))}
                    aria-invalid={!!materialIssues.density}
                    aria-describedby={materialIssues.density ? 'mat-density-error' : undefined}
                    className="w-full bg-surface-muted rounded-sm px-3 py-2 text-xs font-tech"
                  />
                  <FieldError id="mat-density" message={materialIssues.density} />
                </div>

                <div>
                  <label htmlFor="mat-cost" className="block font-semibold mb-1 text-fg">Giá Nhập 1 Cuộn / Kg (VNĐ)</label>
                  <input
                    id="mat-cost"
                    type="number"
                    step="5000"
                    min="0"
                    placeholder="Chưa cấu hình"
                    value={editingMaterial ? (editingMaterial.costPerKg ?? '') : (materialForm.costPerKg ?? '')}
                    onChange={(e) => setMaterialField('costPerKg', numberOrUndefined(e.target.value))}
                    aria-invalid={!!materialIssues.costPerKg}
                    aria-describedby={materialIssues.costPerKg ? 'mat-cost-error' : undefined}
                    className="w-full bg-surface-muted rounded-sm px-3 py-2 text-xs font-tech font-bold"
                  />
                  <FieldError id="mat-cost" message={materialIssues.costPerKg} />
                </div>

                <div>
                  <label htmlFor="mat-price" className="block font-semibold mb-1 text-primary">Đơn Giá Tính Khách / Gram (VNĐ)</label>
                  <input
                    id="mat-price"
                    type="number"
                    step="50"
                    min="0"
                    placeholder="Chưa cấu hình"
                    value={editingMaterial ? (editingMaterial.pricePerGram ?? '') : (materialForm.pricePerGram ?? '')}
                    onChange={(e) => setMaterialField('pricePerGram', numberOrUndefined(e.target.value))}
                    aria-invalid={!!materialIssues.pricePerGram}
                    aria-describedby={materialIssues.pricePerGram ? 'mat-price-error' : undefined}
                    className="w-full bg-primary/10 border border-primary/30 rounded-sm px-3 py-2 text-xs font-tech font-bold text-primary"
                  />
                  <FieldError id="mat-price" message={materialIssues.pricePerGram} />
                </div>

                <div>
                  <label htmlFor="mat-temp-min" className="block font-semibold mb-1 text-fg">Nhiệt Độ Đầu Đùn Min/Max (°C)</label>
                  <div className="flex items-center gap-1">
                    <input
                      id="mat-temp-min"
                      type="number"
                      min="0"
                      placeholder="Min"
                      value={editingMaterial ? (editingMaterial.extruderTempMin ?? '') : (materialForm.extruderTempMin ?? '')}
                      onChange={(e) => setMaterialField('extruderTempMin', numberOrUndefined(e.target.value))}
                      aria-invalid={!!materialIssues.extruderTempMin}
                      aria-describedby={materialIssues.extruderTempMin ? 'mat-temp-min-error' : undefined}
                      className="w-full bg-surface-muted rounded-sm px-2 py-1.5 text-xs font-tech"
                    />
                    <span>-</span>
                    <label htmlFor="mat-temp-max" className="sr-only">Nhiệt độ đầu đùn Max (°C)</label>
                    <input
                      id="mat-temp-max"
                      type="number"
                      min="0"
                      placeholder="Max"
                      value={editingMaterial ? (editingMaterial.extruderTempMax ?? '') : (materialForm.extruderTempMax ?? '')}
                      onChange={(e) => setMaterialField('extruderTempMax', numberOrUndefined(e.target.value))}
                      aria-invalid={!!materialIssues.extruderTempMax}
                      aria-describedby={materialIssues.extruderTempMax ? 'mat-temp-max-error' : undefined}
                      className="w-full bg-surface-muted rounded-sm px-2 py-1.5 text-xs font-tech"
                    />
                  </div>
                  <FieldError id="mat-temp-min" message={materialIssues.extruderTempMin} />
                  <FieldError id="mat-temp-max" message={materialIssues.extruderTempMax} />
                </div>

                <div>
                  <label htmlFor="mat-bed-temp" className="block font-semibold mb-1 text-fg">Nhiệt Độ Bàn In (°C)</label>
                  <input
                    id="mat-bed-temp"
                    type="number"
                    min="0"
                    placeholder="Chưa cấu hình"
                    value={editingMaterial ? (editingMaterial.bedTemp ?? '') : (materialForm.bedTemp ?? '')}
                    onChange={(e) => setMaterialField('bedTemp', numberOrUndefined(e.target.value))}
                    aria-invalid={!!materialIssues.bedTemp}
                    aria-describedby={materialIssues.bedTemp ? 'mat-bed-temp-error' : undefined}
                    className="w-full bg-surface-muted rounded-sm px-3 py-2 text-xs font-tech"
                  />
                  <FieldError id="mat-bed-temp" message={materialIssues.bedTemp} />
                </div>

                <div>
                  <label htmlFor="mat-stock" className="block font-semibold mb-1 text-fg">Tồn Kho (Cuộn)</label>
                  <input
                    id="mat-stock"
                    type="number"
                    min="0"
                    placeholder="Chưa cấu hình"
                    value={editingMaterial ? (editingMaterial.stockRollsCount ?? '') : (materialForm.stockRollsCount ?? '')}
                    onChange={(e) => setMaterialField('stockRollsCount', numberOrUndefined(e.target.value))}
                    aria-invalid={!!materialIssues.stockRollsCount}
                    aria-describedby={materialIssues.stockRollsCount ? 'mat-stock-error' : undefined}
                    className="w-full bg-surface-muted rounded-sm px-3 py-2 text-xs font-tech"
                  />
                  <FieldError id="mat-stock" message={materialIssues.stockRollsCount} />
                </div>

                <div>
                  <label htmlFor="mat-multiplier" className="block font-semibold mb-1 text-fg">Hệ số suy đơn giá nhựa (đ/g từ giá vốn)</label>
                  <input
                    id="mat-multiplier"
                    type="number"
                    step="0.05"
                    min="0"
                    placeholder="Chưa cấu hình"
                    value={editingMaterial ? (editingMaterial.unitPriceMultiplier ?? '') : (materialForm.unitPriceMultiplier ?? '')}
                    onChange={(e) => setMaterialField('unitPriceMultiplier', numberOrUndefined(e.target.value))}
                    aria-invalid={!!materialIssues.unitPriceMultiplier}
                    aria-describedby={materialIssues.unitPriceMultiplier ? 'mat-multiplier-error' : undefined}
                    className="w-full bg-surface-muted rounded-sm px-3 py-2 text-xs font-tech"
                  />
                  <FieldError id="mat-multiplier" message={materialIssues.unitPriceMultiplier} />
                  <p className="text-xs text-fg-muted mt-1">Chỉ dùng để SUY đơn giá nhựa (đ/g) từ giá vốn: giá vốn/kg ÷ 1000 × hệ số. KHÔNG phải hệ số nhân giá bán — để trống ô đơn giá/g thì engine mới dùng hệ số này.</p>
                </div>

                <div>
                  <label htmlFor="mat-spool-weight" className="block font-semibold mb-1 text-fg">Khối Lượng Cuộn (g)</label>
                  <input
                    id="mat-spool-weight"
                    type="number"
                    step="50"
                    min="0"
                    placeholder="Chưa cấu hình"
                    value={editingMaterial ? (editingMaterial.spoolWeightGrams ?? '') : (materialForm.spoolWeightGrams ?? '')}
                    onChange={(e) => setMaterialField('spoolWeightGrams', numberOrUndefined(e.target.value))}
                    aria-invalid={!!materialIssues.spoolWeightGrams}
                    aria-describedby={materialIssues.spoolWeightGrams ? 'mat-spool-weight-error' : undefined}
                    className="w-full bg-surface-muted rounded-sm px-3 py-2 text-xs font-tech"
                  />
                  <FieldError id="mat-spool-weight" message={materialIssues.spoolWeightGrams} />
                </div>

                <div>
                  <p className="text-xs font-bold text-warning mb-1" data-testid="can-anh-quyet-dinh">
                    cần anh quyết định — Inkiri gộp chung một hệ số "vật liệu khó", không tách theo từng vật liệu
                  </p>
                  <label htmlFor="mat-failure-extra" className="block font-semibold mb-1 text-fg">Phụ Phí Dự Phòng In Hỏng Riêng (%)</label>
                  <input
                    id="mat-failure-extra"
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    placeholder="Để trống = không cộng thêm"
                    value={editingMaterial ? (editingMaterial.failureExtraPercent ?? '') : (materialForm.failureExtraPercent ?? '')}
                    onChange={(e) => setMaterialField('failureExtraPercent', e.target.value === '' ? null : numberOrUndefined(e.target.value))}
                    aria-invalid={!!materialIssues.failureExtraPercent}
                    aria-describedby={materialIssues.failureExtraPercent ? 'mat-failure-extra-error' : undefined}
                    className="w-full bg-surface-muted rounded-sm px-3 py-2 text-xs font-tech"
                  />
                  <FieldError id="mat-failure-extra" message={materialIssues.failureExtraPercent} />
                  <p className="text-xs text-fg-muted mt-1">
                    Cộng thêm vào dự phòng in hỏng CHỈ cho vật liệu này (thay luật cũ dò chuỗi trong
                    <span className="font-tech"> id</span>). Để trống = không cộng thêm (không mượn số mẫu).
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="matStockCheck"
                    checked={editingMaterial ? editingMaterial.inStock === true : materialForm.inStock === true}
                    onChange={(e) => setMaterialField('inStock', e.target.checked)}
                    className="w-4 h-4 rounded-sm text-primary"
                  />
                  <label htmlFor="matStockCheck" className="font-semibold text-fg">Đang Có Sẵn Hàng</label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-line">
                <button
                  type="button"
                  onClick={() => { setIsNewMaterialOpen(false); setEditingMaterial(null); setMaterialIssues({}); }}
                  className="px-4 py-2 border border-line rounded-sm text-fg hover:bg-surface-muted cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary text-primary-fg font-bold rounded-sm hover:bg-primary-hover cursor-pointer"
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
        <div className="fixed inset-0 z-modal bg-surface-inverse/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-surface rounded-lg max-w-lg w-full p-6 space-y-4 border border-line shadow-e3">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="font-bold text-base text-fg">
                {editingPrinter ? `Chỉnh Sửa Máy In: ${editingPrinter.name}` : 'Thêm Máy In Mới Vào Đội Máy'}
              </h3>
              <button aria-label="Đóng"
                onClick={() => { setIsNewPrinterOpen(false); setEditingPrinter(null); setPrinterIssues({}); }}
                className="text-fg-muted hover:text-fg cursor-pointer"
              >
                <Icon name="close" size={20} />
              </button>
            </div>

            <form onSubmit={editingPrinter ? handleSaveEditPrinter : handleSaveNewPrinter} className="space-y-3 text-xs">
              {Object.keys(printerIssues).length > 0 && (
                <p role="alert" className="p-2 rounded-sm bg-danger-tint border border-danger/30 text-danger font-semibold">
                  KHÔNG lưu: còn {Object.keys(printerIssues).length} ô chưa cấu hình hoặc không hợp lệ. Hệ thống không tự điền thông số máy đoán.
                </p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label htmlFor="prn-name" className="block font-semibold mb-1 text-fg">Tên Máy In *</label>
                  <input
                    id="prn-name"
                    type="text"
                    required
                    placeholder="VD: Bambu Lab X1-Carbon AMS, Creality K1 Max..."
                    value={editingPrinter ? editingPrinter.name : (printerForm.name ?? '')}
                    onChange={(e) => setPrinterField('name', e.target.value)}
                    aria-invalid={!!printerIssues.name}
                    aria-describedby={printerIssues.name ? 'prn-name-error' : undefined}
                    className="w-full bg-surface-muted rounded-sm px-3 py-2 text-xs"
                  />
                  <FieldError id="prn-name" message={printerIssues.name} />
                </div>

                <div>
                  <label htmlFor="prn-brand" className="block font-semibold mb-1 text-fg">Hãng Sản Xuất</label>
                  <input
                    id="prn-brand"
                    type="text"
                    value={editingPrinter ? (editingPrinter.brand ?? '') : (printerForm.brand ?? '')}
                    onChange={(e) => setPrinterField('brand', e.target.value)}
                    className="w-full bg-surface-muted rounded-sm px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label htmlFor="prn-technology" className="block font-semibold mb-1 text-fg">Công Nghệ In</label>
                  <select
                    id="prn-technology"
                    value={editingPrinter ? (editingPrinter.technology ?? '') : (printerForm.technology ?? '')}
                    onChange={(e) => setPrinterField('technology', e.target.value === '' ? undefined : (e.target.value as any))}
                    aria-invalid={!!printerIssues.technology}
                    aria-describedby={printerIssues.technology ? 'prn-technology-error' : undefined}
                    className="w-full bg-surface-muted rounded-sm px-3 py-2 text-xs"
                  >
                    <option value="">— Chọn công nghệ in —</option>
                    <option value="FDM">FDM / FFF (Đùn nhựa)</option>
                    <option value="SLA">SLA / DLP (Quang trùng hợp Resin)</option>
                    <option value="SLS">SLS (Thiêu kết bột)</option>
                  </select>
                  <FieldError id="prn-technology" message={printerIssues.technology} />
                </div>

                <div className="col-span-2">
                  <label htmlFor="prn-bed-x" className="block font-semibold mb-1 text-fg">Khổ Bàn In X × Y × Z (mm)</label>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      id="prn-bed-x"
                      type="number"
                      min="0"
                      placeholder="X (mm)"
                      value={editingPrinter ? (editingPrinter.bedDimensions?.x ?? '') : (printerForm.bedDimensions?.x ?? '')}
                      onChange={(e) => setPrinterBedDimension('x', e.target.value)}
                      aria-invalid={!!printerIssues['bedDimensions.x']}
                      aria-describedby={printerIssues['bedDimensions.x'] ? 'prn-bed-x-error' : undefined}
                      className="w-full bg-surface-muted rounded-sm px-2.5 py-1.5 text-xs font-tech"
                    />
                    <label htmlFor="prn-bed-y" className="sr-only">Khổ bàn in Y (mm)</label>
                    <input
                      id="prn-bed-y"
                      type="number"
                      min="0"
                      placeholder="Y (mm)"
                      value={editingPrinter ? (editingPrinter.bedDimensions?.y ?? '') : (printerForm.bedDimensions?.y ?? '')}
                      onChange={(e) => setPrinterBedDimension('y', e.target.value)}
                      aria-invalid={!!printerIssues['bedDimensions.y']}
                      aria-describedby={printerIssues['bedDimensions.y'] ? 'prn-bed-y-error' : undefined}
                      className="w-full bg-surface-muted rounded-sm px-2.5 py-1.5 text-xs font-tech"
                    />
                    <label htmlFor="prn-bed-z" className="sr-only">Khổ bàn in Z (mm)</label>
                    <input
                      id="prn-bed-z"
                      type="number"
                      min="0"
                      placeholder="Z (mm)"
                      value={editingPrinter ? (editingPrinter.bedDimensions?.z ?? '') : (printerForm.bedDimensions?.z ?? '')}
                      onChange={(e) => setPrinterBedDimension('z', e.target.value)}
                      aria-invalid={!!printerIssues['bedDimensions.z']}
                      aria-describedby={printerIssues['bedDimensions.z'] ? 'prn-bed-z-error' : undefined}
                      className="w-full bg-surface-muted rounded-sm px-2.5 py-1.5 text-xs font-tech"
                    />
                  </div>
                  <FieldError id="prn-bed-x" message={printerIssues['bedDimensions.x']} />
                  <FieldError id="prn-bed-y" message={printerIssues['bedDimensions.y']} />
                  <FieldError id="prn-bed-z" message={printerIssues['bedDimensions.z']} />
                </div>

                <div>
                  <label htmlFor="prn-nozzle" className="block font-semibold mb-1 text-fg">Đường Kính Đầu Phun (mm)</label>
                  <input
                    id="prn-nozzle"
                    type="number"
                    step="0.05"
                    min="0"
                    placeholder="Chưa cấu hình"
                    value={editingPrinter ? (editingPrinter.nozzleDiameter ?? '') : (printerForm.nozzleDiameter ?? '')}
                    onChange={(e) => setPrinterField('nozzleDiameter', numberOrUndefined(e.target.value))}
                    aria-invalid={!!printerIssues.nozzleDiameter}
                    aria-describedby={printerIssues.nozzleDiameter ? 'prn-nozzle-error' : undefined}
                    className="w-full bg-surface-muted rounded-sm px-3 py-2 text-xs font-tech"
                  />
                  <FieldError id="prn-nozzle" message={printerIssues.nozzleDiameter} />
                </div>

                <div>
                  <label htmlFor="prn-power" className="block font-semibold mb-1 text-fg">Công Suất Điện (kW)</label>
                  <input
                    id="prn-power"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Chưa cấu hình"
                    value={editingPrinter ? (editingPrinter.powerKW ?? '') : (printerForm.powerKW ?? '')}
                    onChange={(e) => setPrinterField('powerKW', numberOrUndefined(e.target.value))}
                    aria-invalid={!!printerIssues.powerKW}
                    aria-describedby={printerIssues.powerKW ? 'prn-power-error' : undefined}
                    className="w-full bg-surface-muted rounded-sm px-3 py-2 text-xs font-tech font-bold"
                  />
                  <FieldError id="prn-power" message={printerIssues.powerKW} />
                </div>

                <div>
                  <label htmlFor="prn-acquisition" className="block font-semibold mb-1 text-fg">Giá Trị Đầu Tư Máy (VNĐ)</label>
                  <input
                    id="prn-acquisition"
                    type="number"
                    step="1000000"
                    min="0"
                    placeholder="Chưa cấu hình"
                    value={editingPrinter ? (editingPrinter.acquisitionCost ?? '') : (printerForm.acquisitionCost ?? '')}
                    onChange={(e) => setPrinterField('acquisitionCost', numberOrUndefined(e.target.value))}
                    aria-invalid={!!printerIssues.acquisitionCost}
                    aria-describedby={printerIssues.acquisitionCost ? 'prn-acquisition-error' : undefined}
                    className="w-full bg-surface-muted rounded-sm px-3 py-2 text-xs font-tech font-bold"
                  />
                  <FieldError id="prn-acquisition" message={printerIssues.acquisitionCost} />
                </div>

                <div>
                  <label htmlFor="prn-lifetime" className="block font-semibold mb-1 text-fg">Tuổi Thọ Khấu Hao (Giờ)</label>
                  <input
                    id="prn-lifetime"
                    type="number"
                    step="500"
                    min="0"
                    placeholder="Chưa cấu hình"
                    value={editingPrinter ? (editingPrinter.expectedLifetimeHours ?? '') : (printerForm.expectedLifetimeHours ?? '')}
                    onChange={(e) => setPrinterField('expectedLifetimeHours', numberOrUndefined(e.target.value))}
                    aria-invalid={!!printerIssues.expectedLifetimeHours}
                    aria-describedby={printerIssues.expectedLifetimeHours ? 'prn-lifetime-error' : undefined}
                    className="w-full bg-surface-muted rounded-sm px-3 py-2 text-xs font-tech"
                  />
                  <FieldError id="prn-lifetime" message={printerIssues.expectedLifetimeHours} />
                </div>

                <div>
                  <label htmlFor="prn-consumables" className="block font-semibold mb-1 text-fg">Hao Mòn Vật Tư / Giờ (VNĐ)</label>
                  <input
                    id="prn-consumables"
                    type="number"
                    step="500"
                    min="0"
                    placeholder="Chưa cấu hình"
                    value={editingPrinter ? (editingPrinter.consumablesHourlyRate ?? '') : (printerForm.consumablesHourlyRate ?? '')}
                    onChange={(e) => setPrinterField('consumablesHourlyRate', numberOrUndefined(e.target.value))}
                    aria-invalid={!!printerIssues.consumablesHourlyRate}
                    aria-describedby={printerIssues.consumablesHourlyRate ? 'prn-consumables-error' : undefined}
                    className="w-full bg-surface-muted rounded-sm px-3 py-2 text-xs font-tech font-bold"
                  />
                  <FieldError id="prn-consumables" message={printerIssues.consumablesHourlyRate} />
                </div>

                <div>
                  <label htmlFor="prn-hourly-rate" className="block font-semibold mb-1 text-fg">Đơn Giá Giờ Máy (VNĐ/giờ)</label>
                  <input
                    id="prn-hourly-rate"
                    type="number"
                    step="1000"
                    min="0"
                    placeholder="Chưa cấu hình"
                    value={editingPrinter ? (editingPrinter.hourlyRate ?? '') : (printerForm.hourlyRate ?? '')}
                    onChange={(e) => setPrinterField('hourlyRate', numberOrUndefined(e.target.value))}
                    aria-invalid={!!printerIssues.hourlyRate}
                    aria-describedby={printerIssues.hourlyRate ? 'prn-hourly-rate-error' : undefined}
                    className="w-full bg-surface-muted rounded-sm px-3 py-2 text-xs font-tech"
                  />
                  <FieldError id="prn-hourly-rate" message={printerIssues.hourlyRate} />
                </div>

                <div>
                  <label htmlFor="prn-max-speed" className="block font-semibold mb-1 text-fg">Tốc Độ In Tối Đa (mm/s)</label>
                  <input
                    id="prn-max-speed"
                    type="number"
                    min="0"
                    placeholder="Chưa cấu hình"
                    value={editingPrinter ? (editingPrinter.maxPrintSpeedMmS ?? '') : (printerForm.maxPrintSpeedMmS ?? '')}
                    onChange={(e) => setPrinterField('maxPrintSpeedMmS', numberOrUndefined(e.target.value))}
                    aria-invalid={!!printerIssues.maxPrintSpeedMmS}
                    aria-describedby={printerIssues.maxPrintSpeedMmS ? 'prn-max-speed-error' : undefined}
                    className="w-full bg-surface-muted rounded-sm px-3 py-2 text-xs font-tech"
                  />
                  <FieldError id="prn-max-speed" message={printerIssues.maxPrintSpeedMmS} />
                </div>

                <div>
                  <label htmlFor="prn-heated-bed" className="block font-semibold mb-1 text-fg">Nhiệt Độ Bàn Tối Đa (°C)</label>
                  <input
                    id="prn-heated-bed"
                    type="number"
                    min="0"
                    placeholder="Chưa cấu hình"
                    value={editingPrinter ? (editingPrinter.heatedBedMaxTemp ?? '') : (printerForm.heatedBedMaxTemp ?? '')}
                    onChange={(e) => setPrinterField('heatedBedMaxTemp', numberOrUndefined(e.target.value))}
                    aria-invalid={!!printerIssues.heatedBedMaxTemp}
                    aria-describedby={printerIssues.heatedBedMaxTemp ? 'prn-heated-bed-error' : undefined}
                    className="w-full bg-surface-muted rounded-sm px-3 py-2 text-xs font-tech"
                  />
                  <FieldError id="prn-heated-bed" message={printerIssues.heatedBedMaxTemp} />
                </div>

                <div className="flex items-center gap-4 col-span-2 pt-2">
                  <label htmlFor="prn-enclosure" className="flex items-center gap-2 cursor-pointer">
                    <input
                      id="prn-enclosure"
                      type="checkbox"
                      checked={editingPrinter ? editingPrinter.hasEnclosure === true : printerForm.hasEnclosure === true}
                      onChange={(e) => setPrinterField('hasEnclosure', e.target.checked)}
                      className="w-4 h-4 rounded-sm text-primary"
                    />
                    <span className="font-semibold text-fg">Có Buồng Kín Giữ Nhiệt</span>
                  </label>

                  <label htmlFor="prn-ams" className="flex items-center gap-2 cursor-pointer">
                    <input
                      id="prn-ams"
                      type="checkbox"
                      checked={editingPrinter ? editingPrinter.hasAMS === true : printerForm.hasAMS === true}
                      onChange={(e) => setPrinterField('hasAMS', e.target.checked)}
                      className="w-4 h-4 rounded-sm text-primary"
                    />
                    <span className="font-semibold text-fg">Có Bộ Đổi Màu Tự Động AMS</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-line">
                <button
                  type="button"
                  onClick={() => { setIsNewPrinterOpen(false); setEditingPrinter(null); setPrinterIssues({}); }}
                  className="px-4 py-2 border border-line rounded-sm text-fg hover:bg-surface-muted cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary text-primary-fg font-bold rounded-sm hover:bg-primary-hover cursor-pointer"
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
