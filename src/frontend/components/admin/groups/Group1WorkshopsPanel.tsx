import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useWorkshopAdminStore } from '../../../../stores/useWorkshopAdminStore';
import { useLanguage } from '../../../context/LanguageContext';
import { dbService } from '../../../../backend/supabase/database';
import { WorkshopProfile, WorkshopMachine, WorkshopMaterial, WorkshopPartner, PrinterProfile } from '../../../../types';
import { getPricingGlobalSettings } from '../../../../backend/services/settingsService';
import { Button, DataTable, EmptyState, Icon, InfoTip } from '@frontend/ui';
import type { DataTableColumn } from '@frontend/ui';

export interface Group1WorkshopsPanelProps {
  printers?: any[];
  onUpdatePrinters?: (printers: any[]) => void;
  onShowToast?: (message: string) => void;
  onNavigateSection?: (section: any) => void;
  /** Section đang mở từ URL — quyết định tab mặc định (machines ⇒ Đội máy, partners ⇒ Đối tác). */
  section?: string;
}

/**
 * `printer_fleet.status` (Idle | Printing | Maintenance) → nhãn trạng thái của màn Đội Máy.
 * Đây là ánh xạ HIỂN THỊ (1-1, không suy diễn thêm): bảng dùng `Idle`, màn này gọi là "Rảnh".
 */
const printerStatusToMachineStatus = (
  status: PrinterProfile['status']
): WorkshopMachine['status'] =>
  status === 'Printing' ? 'Busy' : status === 'Maintenance' ? 'Maintenance' : 'Free';

/**
 * Dòng `printer_fleet` → dạng `WorkshopMachine` để dùng lại bộ tính chi phí vận hành của
 * store. `workshopId` để rỗng: `printer_fleet` là đội máy TOÀN HỆ THỐNG, KHÔNG có cột
 * `workshop_id` (khác `workshop_machines` — bảng bị giới hạn theo xưởng đang đăng nhập).
 * Trường nào DB chưa đo (`power_kw` / `acquisition_cost` / `expected_lifetime_hours`
 * nullable) thì để `undefined` ⇒ UI hiện '—', KHÔNG điền số thay.
 */
const printerToMachine = (p: PrinterProfile): WorkshopMachine => {
  const bed = p.bedDimensions;
  const hasVolume =
    !!bed && bed.x !== null && bed.y !== null && bed.z !== null;
  return {
    id: p.id,
    workshopId: '',
    machineName: p.name,
    // `printer_fleet.technology` chỉ có FDM | SLA | SLS (không có PolyJet) ⇒ ánh xạ thẳng.
    machineType: p.technology as WorkshopMachine['machineType'],
    avgPowerKW: p.powerKW ?? undefined,
    purchasePrice: p.acquisitionCost ?? undefined,
    lifetimeHours: p.expectedLifetimeHours ?? undefined,
    hourlyRate: p.hourlyRate ?? null,
    status: printerStatusToMachineStatus(p.status),
    buildVolumeMm: hasVolume
      ? { x: bed!.x as number, y: bed!.y as number, z: bed!.z as number }
      : undefined
  };
};

export const Group1WorkshopsPanel: React.FC<Group1WorkshopsPanelProps> = ({
  // `printers` (prop) KHÔNG được đọc — xem khối "ĐỘI MÁY IN" bên dưới: App khởi tạo prop đó
  // bằng fixture/localStorage nên nó không phân biệt được "bảng rỗng" với "truy vấn lỗi".
  // `onUpdatePrinters` thì CÓ dùng: đồng bộ state của App sau mỗi lần ghi DB thành công.
  onUpdatePrinters,
  onShowToast,
  onNavigateSection,
  section
}) => {
  const { language } = useLanguage();
  const isVi = language === 'vi';

  const tabFromSection = (s?: string): 'workshops' | 'fleet' | 'materials' | 'partners' =>
    s === 'machines' ? 'fleet' : s === 'partners' ? 'partners' : 'workshops';

  const [activeTab, setActiveTab] = useState<'workshops' | 'fleet' | 'materials' | 'partners'>(() => tabFromSection(section));

  // URL là nguồn sự thật: đổi /admin/machines ⇒ mở tab Đội máy (trước đây luôn mở "Danh sách xưởng").
  useEffect(() => {
    setActiveTab(tabFromSection(section));
  }, [section]);

  // Zustand Store (xưởng / vật liệu / bộ lọc). Đội máy KHÔNG còn nằm ở store —
  // nguồn thật là bảng `printer_fleet`, xem khối dưới.
  const {
    workshops,
    workshopsLoading,
    workshopsError,
    materials,
    filters,
    setFilterRegion,
    setFilterStatus,
    setSearchQuery,
    loadWorkshops,
    setWorkshopVerifiedStatus,
    addWorkshop,
    updateMaterialStock,
    addMaterial,
    getDepreciationPerHour,
    getElectricityPerHour,
    getLowStockMaterials,
    getWorkshopStats
  } = useWorkshopAdminStore();

  const stats = getWorkshopStats();
  const lowStockList = getLowStockMaterials();

  // ==========================================================================
  // ĐỘI MÁY IN — ĐỌC/GHI TRỰC TIẾP BẢNG `printer_fleet`
  //
  // VÌ SAO `printer_fleet` (không phải `workshop_machines`/`getMyMachines`):
  //   * `printer_fleet` là ĐỘI MÁY TOÀN HỆ THỐNG — đúng phạm vi tab "Fleet Inspector" và
  //     thẻ KPI "Tổng Máy In" của màn quản trị này. Bảng KHÔNG có cột `workshop_id`.
  //   * `workshop_machines` (đọc bằng `WorkshopService.getMyMachines`) bị RLS giới hạn
  //     theo hồ sơ xưởng của `auth.uid()` ⇒ admin sẽ luôn thấy 0 máy, và nó cũng không
  //     phải "đội máy toàn hệ thống".
  //
  // VÌ SAO KHÔNG đọc prop `printers` (dù App có truyền):
  //   `App.tsx:642-650` khởi tạo prop đó bằng localStorage `vcube_printers` hoặc fixture
  //   `PRINTER_PROFILES`, và `App.tsx:808-810` CHỈ ghi đè khi mảng remote KHÁC RỖNG
  //   ⇒ prop không phân biệt được "bảng rỗng" với "truy vấn lỗi" (đúng thứ màn này phải
  //   nói thật). `dbService.getPrinters()` ném lỗi thật nên mới dựng được 3 trạng thái
  //   loading / rỗng / lỗi. Sau mỗi lần ghi ta vẫn gọi `onUpdatePrinters` để state App khớp DB.
  // ==========================================================================
  const [fleetPrinters, setFleetPrinters] = useState<PrinterProfile[] | null>(null);
  const [isFleetLoading, setIsFleetLoading] = useState(false);
  const [fleetError, setFleetError] = useState<string | null>(null);
  /** `null` = CHƯA cấu hình giá điện trong `pricing_global_settings` (KHÔNG rơi về 2.850đ). */
  const [electricityRateVnd, setElectricityRateVnd] = useState<number | null>(null);

  const loadFleet = useCallback(async () => {
    setIsFleetLoading(true);
    setFleetError(null);
    try {
      const rows = await dbService.getPrinters();
      setFleetPrinters(rows);
      onUpdatePrinters?.(rows);
    } catch (err: any) {
      // Lỗi thật ⇒ KHÔNG hiện 0 như thể bảng rỗng, KHÔNG rơi về fixture.
      setFleetPrinters(null);
      setFleetError(err?.message || (isVi ? 'lỗi không xác định' : 'unknown error'));
    } finally {
      setIsFleetLoading(false);
    }
  }, [isVi, onUpdatePrinters]);

  useEffect(() => {
    void loadFleet();
    // Danh sách xưởng: đọc bảng thật `workshop_profiles` (không còn mảng RAM trong store).
    void loadWorkshops();
    // Giá điện dùng cho quy đổi kW → VNĐ/giờ trong thẻ chi phí. Chưa cấu hình ⇒ `null`.
    void getPricingGlobalSettings()
      .then((res) => setElectricityRateVnd(res?.data?.electricityRateVnd ?? null))
      .catch(() => setElectricityRateVnd(null));
  }, [loadFleet, loadWorkshops]);

  /** Ghi 1 máy in xuống `printer_fleet`; chỉ báo thành công khi DB xác nhận. */
  const persistPrinter = async (printer: PrinterProfile, successMessage: string) => {
    const result = await dbService.savePrinter(printer);
    if (!result.success) {
      onShowToast?.(
        isVi
          ? `Lưu máy in thất bại: ${result.error || 'lỗi không xác định'}`
          : `Failed to save printer: ${result.error || 'unknown error'}`
      );
      return false;
    }
    await loadFleet();
    onShowToast?.(successMessage);
    return true;
  };

  const handleSetPrinterStatus = async (
    printer: PrinterProfile,
    status: PrinterProfile['status']
  ) => {
    await persistPrinter(
      { ...printer, status },
      isVi
        ? `Đã lưu trạng thái máy ${printer.name}: ${status}`
        : `Saved printer ${printer.name}: ${status}`
    );
  };

  // ==========================================================================
  // ĐỐI TÁC XƯỞNG LƯU TRONG SUPABASE (`workshop_partners`)
  // Port từ AdminPartnersPanel (đã xoá) để CRUD đối tác thật không bị mất.
  // ==========================================================================
  const [partners, setPartners] = useState<WorkshopPartner[]>([]);
  const [isPartnersLoading, setIsPartnersLoading] = useState(false);
  const [partnerDraft, setPartnerDraft] = useState<WorkshopPartner | null>(null);

  const loadPartners = useCallback(async () => {
    setIsPartnersLoading(true);
    try {
      const rows = await dbService.getWorkshopPartners();
      setPartners(Array.isArray(rows) ? rows : []);
    } catch (err: any) {
      onShowToast?.(
        isVi
          ? `Không tải được danh sách đối tác: ${err?.message || 'lỗi không xác định'}`
          : `Failed to load workshop partners: ${err?.message || 'unknown error'}`
      );
    } finally {
      setIsPartnersLoading(false);
    }
  }, [isVi, onShowToast]);

  useEffect(() => {
    void loadPartners();
  }, [loadPartners]);

  const emptyPartnerDraft = (): WorkshopPartner => ({
    id: `hub-${Date.now().toString(36)}`,
    name: '',
    region: 'hanoi',
    address: '',
    contactPerson: '',
    phone: '',
    email: '',
    supportedTechnologies: ['FDM', 'SLA'],
    maxBuildVolume: { x: 256, y: 256, z: 256 },
    activePrintersCount: 0,
    availablePrintersCount: 0,
    slaRating: 5,
    completedJobsCount: 0,
    currentQueueLength: 0,
    inStockMaterials: [],
    status: 'active'
  });

  const persistPartner = async (partner: WorkshopPartner, successMessage: string) => {
    const isNew = !partners.some((p) => p.id === partner.id);
    setPartners((prev) =>
      isNew ? [partner, ...prev] : prev.map((p) => (p.id === partner.id ? partner : p))
    );
    const result = await dbService.saveWorkshopPartner(partner);
    if (result.success) {
      onShowToast?.(successMessage);
    } else {
      onShowToast?.(
        isVi
          ? `Lưu đối tác thất bại: ${result.error || 'lỗi không xác định'}`
          : `Failed to save partner: ${result.error || 'unknown error'}`
      );
    }
  };

  const handleTogglePartnerStatus = (partner: WorkshopPartner) => {
    const nextStatus: WorkshopPartner['status'] = partner.status === 'active' ? 'busy' : 'active';
    void persistPartner(
      { ...partner, status: nextStatus },
      isVi
        ? `Đã cập nhật trạng thái đối tác ${partner.name}: ${nextStatus}`
        : `Updated partner ${partner.name}: ${nextStatus}`
    );
  };

  const handleSubmitPartner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerDraft) return;
    if (!partnerDraft.name.trim() || !partnerDraft.address.trim()) {
      onShowToast?.(
        isVi ? 'Vui lòng nhập tên xưởng và địa chỉ' : 'Please enter workshop name and address'
      );
      return;
    }
    const isNew = !partners.some((p) => p.id === partnerDraft.id);
    void persistPartner(
      partnerDraft,
      isNew
        ? isVi
          ? `Đã thêm đối tác xưởng vào mạng lưới: ${partnerDraft.name}`
          : `Added workshop partner: ${partnerDraft.name}`
        : isVi
        ? `Đã lưu đối tác xưởng: ${partnerDraft.name}`
        : `Saved workshop partner: ${partnerDraft.name}`
    );
    setPartnerDraft(null);
  };

  // Modals state
  const [isAddWorkshopModalOpen, setIsAddWorkshopModalOpen] = useState(false);
  const [isAddMachineModalOpen, setIsAddMachineModalOpen] = useState(false);
  const [isAddMaterialModalOpen, setIsAddMaterialModalOpen] = useState(false);

  // New Workshop form — ghi vào bảng `workshop_profiles`.
  // ⚠️ `totalMachines` / `activeMachinesNow` ĐÃ BỎ: modal không có ô nhập nào cho chúng
  // nên "2 máy" chỉ là số bịa được ghi vào DB; để cột tự nhận default.
  // ⚠️ Hai đơn giá mặc định RỖNG = CHƯA KHAI (trước đây điền sẵn 2.850đ/kWh và 65.000đ/h
  // như số thật — cả hai cột đều nullable trong DB).
  const [newWorkshopForm, setNewWorkshopForm] = useState({
    workshopName: '',
    address: '',
    region: 'Bắc' as 'Bắc' | 'Trung' | 'Nam',
    electricityRateOverride: null as number | null,
    laborRateOverride: null as number | null,
    contactPhone: '',
    contactEmail: '',
    verifiedStatus: 'Pending' as 'Pending' | 'Verified' | 'Suspended'
  });

  // New Machine form — ghi vào `printer_fleet`.
  // ⚠️ Ba ô SỐ mặc định RỖNG: `power_kw` / `acquisition_cost` / `expected_lifetime_hours`
  // là cột nullable ("chưa đo" ≠ 0). Trước đây form điền sẵn 0,35 kW / 35.000.000đ / 8.000h
  // nên bấm Lưu là ghi số CHƯA ĐO vào DB như số thật. Không còn ô "xưởng tiếp nhận" và
  // không còn khổ in mặc định 256×256×256: `printer_fleet` không có cột xưởng, và khổ in
  // chưa đo thì phải là NULL.
  const [newMachineForm, setNewMachineForm] = useState({
    machineName: '',
    brand: '',
    machineType: 'FDM' as WorkshopMachine['machineType'],
    avgPowerKW: null as number | null,
    purchasePrice: null as number | null,
    lifetimeHours: null as number | null
  });

  // New Material form
  const [newMaterialForm, setNewMaterialForm] = useState({
    workshopId: workshops[0]?.id || '',
    materialName: '',
    materialType: 'PLA' as WorkshopMaterial['materialType'],
    pricePerKg: 380000,
    colorHex: '#1E293B',
    colorName: 'Đen Mờ',
    density: 1.24,
    currentStockGrams: 5000,
    lowStockThresholdGrams: 1500
  });

  // Filtered workshops
  const filteredWorkshops = useMemo(() => {
    return workshops.filter((w) => {
      const matchRegion = filters.region === 'all' || w.region === filters.region;
      const matchStatus = filters.status === 'all' || w.verifiedStatus === filters.status;
      const matchSearch =
        !filters.searchQuery ||
        w.workshopName.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
        w.address.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
        (w.contactPhone && w.contactPhone.includes(filters.searchQuery));
      return matchRegion && matchStatus && matchSearch;
    });
  }, [workshops, filters]);

  // Fleet filters. KHÔNG còn bộ lọc "theo xưởng": `printer_fleet` không có cột `workshop_id`
  // ⇒ lọc theo xưởng luôn ra rỗng, tức là nói dối bằng 0 dòng.
  const [fleetStatusFilter, setFleetStatusFilter] = useState<'all' | 'Free' | 'Busy' | 'Maintenance'>('all');

  const filteredPrinters = useMemo(() => {
    const list = fleetPrinters ?? [];
    if (fleetStatusFilter === 'all') return list;
    return list.filter((p) => printerStatusToMachineStatus(p.status) === fleetStatusFilter);
  }, [fleetPrinters, fleetStatusFilter]);

  /** Số đếm KPI của đội máy — tính từ chính các dòng vừa đọc, không suy diễn. */
  const fleetCounts = useMemo(() => {
    const list = fleetPrinters ?? [];
    return {
      total: list.length,
      free: list.filter((p) => p.status === 'Idle').length,
      busy: list.filter((p) => p.status === 'Printing').length,
      maintenance: list.filter((p) => p.status === 'Maintenance').length
    };
  }, [fleetPrinters]);

  // Format currency
  const formatVnd = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(val);
  };

  /** Số đo thiếu ⇒ '—' (không rơi về hằng số, không hiện 0 giả). */
  const numOrEmpty = (val: number | null | undefined, unit = '') =>
    val === null || val === undefined ? '—' : `${val}${unit}`;
  const vndOrEmpty = (val: number | null | undefined) => (val === null || val === undefined ? '—' : formatVnd(val));

  /**
   * Duyệt / đình chỉ / khôi phục xưởng = GHI cột `workshop_profiles.verified_status`.
   * Trước đây 3 hàm này chỉ sửa mảng RAM của store rồi báo "thành công" — mất khi reload.
   */
  const handleSetWorkshopStatus = async (
    id: string,
    status: WorkshopProfile['verifiedStatus'],
    name: string
  ) => {
    const res = await setWorkshopVerifiedStatus(id, status);
    if (!res.success) {
      onShowToast?.(
        isVi
          ? `Cập nhật trạng thái xưởng thất bại: ${res.error || 'lỗi không xác định'}`
          : `Failed to update workshop status: ${res.error || 'unknown error'}`
      );
      return;
    }
    onShowToast?.(
      status === 'Verified'
        ? isVi
          ? `Đã ghi trạng thái Đã duyệt cho xưởng: ${name}`
          : `Stored Verified status for workshop: ${name}`
        : isVi
        ? `Đã ghi trạng thái Tạm đình chỉ cho xưởng: ${name}`
        : `Stored Suspended status for workshop: ${name}`
    );
  };

  const handleApprove = (id: string, name: string) => {
    void handleSetWorkshopStatus(id, 'Verified', name);
  };

  const handleSuspend = (id: string, name: string) => {
    void handleSetWorkshopStatus(id, 'Suspended', name);
  };

  const handleCreateWorkshop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkshopForm.workshopName || !newWorkshopForm.address) {
      onShowToast?.(isVi ? 'Vui lòng điền tên xưởng và địa chỉ' : 'Please provide workshop name and address');
      return;
    }
    const res = await addWorkshop({
      workshopName: newWorkshopForm.workshopName.trim(),
      address: newWorkshopForm.address.trim(),
      region: newWorkshopForm.region,
      verifiedStatus: newWorkshopForm.verifiedStatus,
      contactPhone: newWorkshopForm.contactPhone.trim() || undefined,
      contactEmail: newWorkshopForm.contactEmail.trim() || undefined,
      electricityRateOverride: newWorkshopForm.electricityRateOverride,
      laborRateOverride: newWorkshopForm.laborRateOverride
    });
    if (!res.success) {
      onShowToast?.(
        isVi
          ? `Tạo xưởng thất bại: ${res.error || 'lỗi không xác định'}`
          : `Failed to create workshop: ${res.error || 'unknown error'}`
      );
      return; // giữ modal để không mất dữ liệu đã nhập
    }
    setIsAddWorkshopModalOpen(false);
    onShowToast?.(isVi ? 'Đã ghi xưởng in mới vào workshop_profiles!' : 'Saved new workshop to workshop_profiles!');
    setNewWorkshopForm({
      workshopName: '',
      address: '',
      region: 'Bắc',
      electricityRateOverride: null,
      laborRateOverride: null,
      contactPhone: '',
      contactEmail: '',
      verifiedStatus: 'Pending'
    });
  };

  const handleCreateMachine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMachineForm.machineName.trim()) {
      onShowToast?.(isVi ? 'Vui lòng nhập tên máy in' : 'Please enter printer name');
      return;
    }
    // `printer_fleet.id` là text PK KHÔNG có default ⇒ phải tự sinh id.
    const printer: PrinterProfile = {
      id: `prn-${Date.now().toString(36)}`,
      name: newMachineForm.machineName.trim(),
      brand: newMachineForm.brand.trim(),
      bedDimensions: null, // chưa đo ⇒ NULL, KHÔNG ghi 256×256×256
      nozzleDiameter: null,
      technology: (newMachineForm.machineType === 'PolyJet'
        ? 'FDM'
        : newMachineForm.machineType) as PrinterProfile['technology'],
      powerKW: newMachineForm.avgPowerKW,
      acquisitionCost: newMachineForm.purchasePrice,
      expectedLifetimeHours: newMachineForm.lifetimeHours,
      consumablesHourlyRate: null,
      hourlyRate: null,
      status: 'Idle'
    };

    const ok = await persistPrinter(
      printer,
      isVi ? 'Đã ghi máy in mới vào bảng printer_fleet!' : 'Saved new printer to printer_fleet!'
    );
    if (!ok) return; // lỗi thật đã được báo qua toast, giữ modal để không mất dữ liệu đã nhập

    setIsAddMachineModalOpen(false);
    setNewMachineForm({
      machineName: '',
      brand: '',
      machineType: 'FDM',
      avgPowerKW: null,
      purchasePrice: null,
      lifetimeHours: null
    });
  };

  const handleCreateMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMaterialForm.materialName) {
      onShowToast?.(isVi ? 'Vui lòng nhập tên vật liệu' : 'Please enter material name');
      return;
    }
    addMaterial(newMaterialForm);
    setIsAddMaterialModalOpen(false);
    // ⚠️ NÓI THẬT: chưa có hàm service nào ghi tồn kho theo xưởng, nên bản ghi này CHỈ nằm
    // trong bộ nhớ màn hình và mất khi tải lại — không được báo như đã lưu vào DB.
    onShowToast?.(
      isVi
        ? 'Bản ghi vật liệu CHỈ nằm trong bộ nhớ màn hình: chưa có hàm ghi DB cho tồn kho theo xưởng nên sẽ mất khi tải lại.'
        : 'Material record is IN-MEMORY only: no DB write function exists for per-workshop inventory, so it is lost on reload.'
    );
  };

  /** Cột bảng tồn kho vật liệu (tab Vật liệu) dùng primitive `DataTable`. */
  const materialColumns = useMemo<DataTableColumn<WorkshopMaterial>[]>(() => [
    {
      key: 'materialName',
      header: isVi ? 'Vật liệu' : 'Material',
      value: (m) => m.materialName,
      render: (mat) => (
        <div className="flex items-center gap-2.5">
          <span className="w-4 h-4 rounded-full border border-line shadow-e0 shrink-0" style={{ backgroundColor: mat.colorHex }} title={mat.colorName || mat.colorHex} />
          <div>
            <div className="font-bold text-fg">{mat.materialName}</div>
            <div className="text-xs text-fg-subtle">{mat.colorName} • {mat.density} g/cm³</div>
          </div>
        </div>
      ),
    },
    { key: 'materialType', header: isVi ? 'Loại' : 'Type', value: (m) => m.materialType, render: (mat) => <span className="px-2 py-0.5 bg-surface-muted text-fg-muted rounded-sm font-bold text-xs">{mat.materialType}</span> },
    {
      key: 'workshop',
      header: isVi ? 'Xưởng giữ kho' : 'Workshop',
      value: (m) => m.workshopId,
      render: (mat) => {
        const ws = workshops.find((w) => w.id === mat.workshopId);
        return <span className="text-fg-muted font-medium">{ws ? `${ws.workshopName} (${ws.region})` : '—'}</span>;
      },
    },
    { key: 'pricePerKg', header: isVi ? 'Đơn giá/kg' : 'Price/kg', numeric: true, value: (m) => m.pricePerKg, render: (mat) => <span className="font-semibold text-fg">{formatVnd(mat.pricePerKg)}</span> },
    {
      key: 'currentStockGrams',
      header: isVi ? 'Tồn kho hiện tại' : 'Current stock',
      numeric: true,
      value: (m) => m.currentStockGrams,
      render: (mat) => (
        <div>
          <div className="font-bold text-fg">{mat.currentStockGrams}g</div>
          <div className="text-xs text-fg-subtle">{isVi ? 'Ngưỡng min' : 'Min'}: {numOrEmpty(mat.lowStockThresholdGrams, 'g')}</div>
        </div>
      ),
    },
    {
      key: 'stockStatus',
      header: isVi ? 'Trạng thái' : 'Status',
      value: (m) => m.stockStatus,
      render: (mat) => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
          mat.stockStatus === 'Tracking' ? 'bg-positive-tint text-positive' : mat.stockStatus === 'LowStock' ? 'bg-warning-tint text-warning font-black' : 'bg-danger-tint text-danger font-black'
        }`}>
          {mat.stockStatus === 'Tracking' ? (isVi ? 'Đầy đủ' : 'In Stock') : mat.stockStatus === 'LowStock' ? (isVi ? 'Sắp hết' : 'Low Stock') : (isVi ? 'Hết hàng' : 'Out of Stock')}
        </span>
      ),
    },
    {
      key: 'actions',
      header: isVi ? 'Điều chỉnh nhanh' : 'Quick adjust',
      align: 'right',
      render: (mat) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => updateMaterialStock(mat.id, Math.max(0, mat.currentStockGrams - 500))}
            className="px-2 py-0.5 bg-surface-muted hover:bg-line-subtle text-fg-muted text-xs font-bold rounded-sm cursor-pointer"
            title="-500g"
          >
            -500g
          </button>
          <button
            onClick={() => updateMaterialStock(mat.id, mat.currentStockGrams + 1000)}
            className="px-2 py-0.5 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold rounded-sm cursor-pointer"
            title="+1kg (1000g)"
          >
            +1kg
          </button>
        </div>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [isVi, workshops, updateMaterialStock]);

  /** Cột bảng đối tác xưởng (tab Đối tác) dùng primitive `DataTable`. */
  const partnerColumns = useMemo<DataTableColumn<WorkshopPartner>[]>(() => [
    {
      key: 'name',
      header: isVi ? 'Đối tác / Địa chỉ' : 'Partner / Address',
      value: (p) => p.name || '',
      render: (p) => (
        <div>
          <div className="font-bold text-fg">{p.name || (isVi ? '(chưa đặt tên)' : '(unnamed)')}</div>
          <div className="text-xs text-fg-subtle line-clamp-1">{p.address || '—'}</div>
        </div>
      ),
    },
    { key: 'region', header: isVi ? 'Vùng' : 'Region', value: (p) => p.region, render: (p) => <span className="px-2 py-0.5 bg-surface-muted text-fg-muted rounded-sm font-bold text-xs uppercase">{p.region}</span> },
    {
      key: 'contact',
      header: isVi ? 'Liên hệ' : 'Contact',
      value: (p) => p.contactPerson || '',
      render: (p) => (
        <div>
          <div className="text-fg-muted">{p.contactPerson || '—'}</div>
          <div className="text-xs text-fg-subtle font-mono">{p.phone || '—'}</div>
        </div>
      ),
    },
    {
      key: 'tech',
      header: isVi ? 'Công nghệ' : 'Tech',
      render: (p) => (
        <div className="flex flex-wrap gap-1">
          {(p.supportedTechnologies || []).map((tech) => (
            <span key={tech} className="px-1.5 py-0.5 bg-primary-tint text-primary border border-primary/30 rounded-sm font-tech font-bold text-xs">{tech}</span>
          ))}
        </div>
      ),
    },
    {
      key: 'printers',
      header: isVi ? 'Máy / Hàng đợi' : 'Printers / Queue',
      value: (p) => p.activePrintersCount,
      render: (p) => (
        <div className="text-fg-muted">
          <div>{p.activePrintersCount + p.availablePrintersCount > 0 ? `${p.activePrintersCount} / ${p.activePrintersCount + p.availablePrintersCount}` : '—'}</div>
          <div className="text-xs text-warning">{numOrEmpty(p.currentQueueLength, 'h')}</div>
        </div>
      ),
    },
    { key: 'sla', header: 'SLA', numeric: true, value: (p) => p.slaRating, render: (p) => <span className="font-semibold text-fg">{p.slaRating > 0 ? `${p.slaRating} / 5.0` : '—'}</span> },
    {
      key: 'status',
      header: isVi ? 'Trạng thái' : 'Status',
      value: (p) => p.status,
      render: (p) => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${p.status === 'active' ? 'bg-positive-tint text-positive border border-positive/30' : p.status === 'busy' ? 'bg-warning-tint text-warning border border-warning/30' : 'bg-surface-muted text-fg-subtle'}`}>
          {p.status}
        </span>
      ),
    },
    {
      key: 'actions',
      header: isVi ? 'Thao tác' : 'Actions',
      align: 'right',
      render: (p) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => handleTogglePartnerStatus(p)}
            className={`px-2.5 py-1 text-xs font-bold rounded-sm cursor-pointer ${p.status === 'active' ? 'bg-warning-tint text-warning' : 'bg-positive-tint text-positive'}`}
          >
            {p.status === 'active' ? (isVi ? 'Giảm tải' : 'Throttle') : isVi ? 'Nhận đơn' : 'Activate'}
          </button>
          <button
            onClick={() => setPartnerDraft({ ...p })}
            className="px-2.5 py-1 bg-surface-subtle hover:bg-canvas text-fg-muted text-xs font-bold rounded-sm cursor-pointer"
          >
            {isVi ? 'Sửa' : 'Edit'}
          </button>
        </div>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [isVi]);

  return (
    <div className="space-y-6">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-5 rounded-lg border border-line-subtle shadow-e1">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary">
              Xưởng in & Thiết bị
            </span>
            <h2 className="text-xl font-black text-fg tracking-tight">
              {isVi ? 'Quản Trị Mạng Lưới Xưởng In & Đội Máy (Workshops Hub)' : 'Workshops & Fleet Network Hub'}
            </h2>
          </div>
          <div className="mt-1">
            <InfoTip label={isVi ? 'Mục này quản trị những gì?' : 'What does this hub manage?'}>
              {isVi
                ? 'Điều phối xưởng in 3 miền Bắc - Trung - Nam, thanh tra hiệu suất máy in real-time và kiểm soát tồn kho nhựa.'
                : 'Orchestrate regional workshops across North, Central, and South Vietnam, inspect fleet real-time, and monitor materials.'}
            </InfoTip>
          </div>
        </div>

        {/* Tab Navigation Buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-surface-muted rounded-lg">
          <button
            onClick={() => setActiveTab('workshops')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'workshops'
                ? 'bg-surface text-primary shadow-e1'
                : 'text-fg-muted hover:text-fg'
            }`}
          >
            <Icon name="home_work" size={18} />
            {isVi ? 'Danh Sách Xưởng' : 'Workshops'}
          </button>
          <button
            onClick={() => setActiveTab('fleet')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'fleet'
                ? 'bg-surface text-primary shadow-e1'
                : 'text-fg-muted hover:text-fg'
            }`}
          >
            <Icon name="precision_manufacturing" size={18} />
            {isVi ? 'Đội Máy (Fleet)' : 'Fleet Inspector'}
          </button>
          <button
            onClick={() => setActiveTab('materials')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'materials'
                ? 'bg-surface text-primary shadow-e1'
                : 'text-fg-muted hover:text-fg'
            }`}
          >
            <Icon name="inventory_2" size={18} />
            {isVi ? 'Tồn Kho Nhựa' : 'Materials'}
            {stats.lowStockMaterialsCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-danger-tint text-danger text-xs font-black rounded-full">
                {stats.lowStockMaterialsCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('partners')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'partners'
                ? 'bg-surface text-primary shadow-e1'
                : 'text-fg-muted hover:text-fg'
            }`}
          >
            <Icon name="handshake" size={18} />
            {isVi ? 'Đối Tác (DB)' : 'Partners (DB)'}
            {partners.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-primary text-primary-fg text-xs font-black rounded-full">
                {partners.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-surface p-3.5 rounded-lg border border-line-subtle shadow-e0">
          <div className="text-xs font-bold uppercase text-fg-subtle">{isVi ? 'Tổng Xưởng' : 'Total Hubs'}</div>
          <div className="text-2xl font-black text-fg mt-1">
            {workshopsError ? '—' : workshopsLoading ? '…' : stats.totalWorkshops}
          </div>
          <div className="text-xs text-positive font-semibold mt-0.5">
            {workshopsError
              ? isVi ? 'Lỗi đọc workshop_profiles' : 'workshop_profiles read failed'
              : `${stats.verifiedCount} ${isVi ? 'Đã duyệt' : 'Verified'}`}
          </div>
        </div>

        <div className="bg-surface p-3.5 rounded-lg border border-warning/30 bg-warning-tint/30 shadow-e0">
          <div className="text-xs font-bold uppercase text-warning">{isVi ? 'Chờ Duyệt' : 'Pending Review'}</div>
          <div className="text-2xl font-black text-warning mt-1">{workshopsError ? '—' : stats.pendingCount}</div>
          <div className="text-xs text-warning font-semibold mt-0.5">
            {workshopsError
              ? isVi ? 'Xem lỗi ở tab Danh Sách Xưởng' : 'See the Workshops tab error'
              : isVi ? 'Cần phê duyệt' : 'Action needed'}
          </div>
        </div>

        <div className="bg-surface p-3.5 rounded-lg border border-line-subtle shadow-e0">
          <div className="text-xs font-bold uppercase text-fg-subtle">{isVi ? 'Tổng Máy In' : 'Fleet Size'}</div>
          <div className="text-2xl font-black text-fg mt-1">
            {fleetError ? '—' : fleetPrinters === null ? '…' : fleetCounts.total}
          </div>
          <div className="text-xs text-fg-subtle font-medium mt-0.5">
            {fleetError
              ? isVi ? 'Lỗi đọc printer_fleet' : 'printer_fleet read failed'
              : isVi ? 'Bảng printer_fleet' : 'printer_fleet table'}
          </div>
        </div>

        <div className="bg-surface p-3.5 rounded-lg border border-positive/30 bg-positive-tint/20 shadow-e0">
          <div className="text-xs font-bold uppercase text-positive">{isVi ? 'Máy Rảnh (Idle)' : 'Printers Idle'}</div>
          <div className="text-2xl font-black text-positive mt-1">
            {fleetError ? '—' : fleetPrinters === null ? '…' : fleetCounts.free}
          </div>
          <div className="text-xs text-positive font-semibold mt-0.5">{isVi ? 'Sẵn sàng nhận lệnh' : 'Available now'}</div>
        </div>

        <div className="bg-surface p-3.5 rounded-lg border border-info/30 bg-info-tint/20 shadow-e0">
          <div className="text-xs font-bold uppercase text-info">{isVi ? 'Đang In (Printing)' : 'Printing Now'}</div>
          <div className="text-2xl font-black text-info mt-1">
            {fleetError ? '—' : fleetPrinters === null ? '…' : fleetCounts.busy}
          </div>
          <div className="text-xs text-info font-semibold mt-0.5">
            {fleetError || fleetPrinters === null || fleetCounts.total === 0
              ? '—'
              : `${Math.round((fleetCounts.busy / fleetCounts.total) * 100)}% ${isVi ? 'công suất' : 'load'}`}
          </div>
        </div>

        {/* Tab Tồn Kho Nhựa CHƯA nối nguồn DB (`workshop_materials` bị RLS theo xưởng, và
            bảng catalog `materials` không có cột tồn kho theo xưởng) ⇒ KHÔNG hiện "0 / Đủ tồn kho"
            như một khẳng định thật. */}
        <div className="p-3.5 rounded-lg border border-line-subtle bg-surface shadow-e0">
          <div className="text-xs font-bold uppercase text-fg-subtle">
            {isVi ? 'Cảnh Báo Nhựa' : 'Low Stock Alert'}
          </div>
          <div className="text-2xl font-black text-fg mt-1">—</div>
          <div className="text-xs font-semibold mt-0.5 text-fg-subtle">
            {isVi ? 'Chưa nối nguồn tồn kho' : 'Inventory source not wired'}
          </div>
        </div>
      </div>

      {/* TAB 1: DANH SÁCH XƯỞNG */}
      {activeTab === 'workshops' && (
        <div className="space-y-4">
          {/* Controls bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-surface p-3.5 rounded-lg border border-line-subtle shadow-e0">
            <div className="flex flex-wrap items-center gap-2">
              {/* Region Filter */}
              <div className="flex items-center gap-1 bg-surface-muted p-1 rounded-lg text-xs font-semibold">
                <span className="text-fg-subtle px-1 text-xs uppercase tracking-wider">{isVi ? 'Khu vực:' : 'Region:'}</span>
                {(['all', 'Bắc', 'Trung', 'Nam'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setFilterRegion(r)}
                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                      filters.region === r
                        ? 'bg-surface text-primary font-bold shadow-e0'
                        : 'text-fg-muted hover:text-fg'
                    }`}
                  >
                    {r === 'all' ? (isVi ? 'Tất cả' : 'All') : r}
                  </button>
                ))}
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1 bg-surface-muted p-1 rounded-lg text-xs font-semibold">
                <span className="text-fg-subtle px-1 text-xs uppercase tracking-wider">{isVi ? 'Trạng thái:' : 'Status:'}</span>
                {(['all', 'Verified', 'Pending', 'Suspended'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(s)}
                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                      filters.status === s
                        ? 'bg-surface text-primary font-bold shadow-e0'
                        : 'text-fg-muted hover:text-fg'
                    }`}
                  >
                    {s === 'all' ? (isVi ? 'Tất cả' : 'All') : s}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <Icon name="search" size={16} className="absolute left-2.5 top-2 text-fg-subtle" />
                <input
                  type="text"
                  placeholder={isVi ? 'Tìm tên xưởng, địa chỉ, sđt...' : 'Search workshop...'}
                  value={filters.searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-canvas border border-line-subtle rounded-lg focus:outline-none focus:border-primary focus:bg-surface"
                />
              </div>

              <button
                onClick={() => setIsAddWorkshopModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-primary hover:bg-primary-hover text-primary-fg text-xs font-bold rounded-lg shadow-e1 transition-colors shrink-0 cursor-pointer"
              >
                <Icon name="add_circle" size={16} />
                {isVi ? 'Thêm Xưởng In' : 'Add Workshop'}
              </button>
            </div>
          </div>

          {/* Workshop Cards Grid */}
          {/* Đang tải danh sách xưởng từ DB */}
          {workshopsLoading && workshops.length === 0 && workshopsError === null && (
            <div className="bg-surface p-6 rounded-lg border border-line-subtle shadow-e0 text-center text-xs text-fg-subtle">
              {isVi ? 'Đang tải danh sách xưởng từ workshop_profiles...' : 'Loading workshops from workshop_profiles...'}
            </div>
          )}

          {/* LỖI THẬT */}
          {workshopsError !== null && (
            <div role="alert" className="p-4 bg-danger-tint border border-danger/30 rounded-lg flex items-start gap-3">
              <Icon name="error" size={24} className="text-danger mt-0.5" />
              <div className="flex-1">
                <h4 className="font-bold text-danger text-sm">
                  {isVi ? 'Không đọc được bảng workshop_profiles' : 'Could not read the workshop_profiles table'}
                </h4>
                <p className="text-xs text-danger mt-1 font-mono break-all">{workshopsError}</p>
                <button
                  onClick={() => void loadWorkshops()}
                  className="mt-2 px-3 py-1 bg-surface border border-danger/30 text-danger text-xs font-bold rounded-lg cursor-pointer"
                >
                  {isVi ? 'Thử lại' : 'Retry'}
                </button>
              </div>
            </div>
          )}

          {/* RỖNG THẬT / không khớp bộ lọc */}
          {workshopsError === null && !workshopsLoading && filteredWorkshops.length === 0 && (
            <EmptyState
              size="sm"
              title={isVi ? 'Chưa có xưởng in nào' : 'No workshop yet'}
              description={
                workshops.length === 0
                  ? isVi
                    ? 'Bảng workshop_profiles chưa có bản ghi nào.'
                    : 'The workshop_profiles table has no row yet.'
                  : isVi
                  ? 'Không có bản ghi xưởng in nào khớp bộ lọc khu vực/trạng thái hiện tại.'
                  : 'No workshop record matches the current region/status filter.'
              }
              icon={<Icon name="factory" size={20} className="text-primary" />}
              action={
                <Button
                  variant="primary"
                  size="sm"
                  leadingIcon={<Icon name="add_circle" size={18} />}
                  onClick={() => setIsAddWorkshopModalOpen(true)}
                >
                  {isVi ? 'Thêm Xưởng In' : 'Add workshop'}
                </Button>
              }
            />
          )}

          {workshopsError === null && filteredWorkshops.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredWorkshops.map((w) => {
              // `printer_fleet` là đội máy TOÀN HỆ THỐNG (không có `workshop_id`) nên KHÔNG
              // suy ra được "máy rảnh" của riêng một xưởng. Hiện đúng 2 số đếm mà
              // `workshop_profiles` thật sự lưu (`total_machines`, `active_machines_now`);
              // phần không có nguồn thì để '—' thay vì bịa 0.
              return (
                <div
                  key={w.id}
                  className="bg-surface rounded-lg border border-line-subtle hover:border-line shadow-e0 transition-all flex flex-col justify-between overflow-hidden"
                >
                  <div className="p-4 border-b border-line-subtle">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-sm text-xs font-black uppercase ${
                              w.region === 'Bắc'
                                ? 'bg-info-tint text-info'
                                : w.region === 'Trung'
                                ? 'bg-warning-tint text-warning'
                                : 'bg-positive-tint text-positive'
                            }`}
                          >
                            Miền {w.region}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                              w.verifiedStatus === 'Verified'
                                ? 'bg-positive-tint text-positive border border-positive/30'
                                : w.verifiedStatus === 'Pending'
                                ? 'bg-warning-tint text-warning border border-warning/30 animate-pulse'
                                : 'bg-danger-tint text-danger border border-danger/30'
                            }`}
                          >
                            {w.verifiedStatus === 'Verified'
                              ? '● ' + (isVi ? 'Đã duyệt' : 'Verified')
                              : w.verifiedStatus === 'Pending'
                              ? '⏳ ' + (isVi ? 'Chờ duyệt' : 'Pending')
                              : '✕ ' + (isVi ? 'Đình chỉ' : 'Suspended')}
                          </span>
                        </div>
                        <h3 className="font-bold text-fg text-base mt-2 line-clamp-1">{w.workshopName}</h3>
                        <p className="text-xs text-fg-subtle mt-0.5 flex items-center gap-1 line-clamp-1">
                          <Icon name="pin_drop" size={14} />
                          {w.address}
                        </p>
                      </div>
                    </div>

                    {/* Machine summary mini badges */}
                    <div className="grid grid-cols-3 gap-2 mt-4 p-2.5 bg-canvas rounded-lg text-center">
                      <div>
                        <div className="text-xs text-fg-subtle font-bold uppercase">{isVi ? 'Tổng máy' : 'Total'}</div>
                        <div className="text-base font-black text-fg">{numOrEmpty(w.totalMachines)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-positive font-bold uppercase">{isVi ? 'Rảnh' : 'Free'}</div>
                        <div className="text-base font-black text-positive">—</div>
                      </div>
                      <div>
                        <div className="text-xs text-info font-bold uppercase">{isVi ? 'Đang In' : 'Busy'}</div>
                        <div className="text-base font-black text-info">{numOrEmpty(w.activeMachinesNow)}</div>
                      </div>
                    </div>

                    {/* Rates & Contact */}
                    <div className="mt-3 space-y-1 text-xs text-fg-muted">
                      <div className="flex justify-between">
                        <span className="text-fg-subtle">{isVi ? 'Đơn giá điện:' : 'Power rate:'}</span>
                        <span className="font-semibold text-fg-muted">{vndOrEmpty(w.electricityRateOverride)}/kWh</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-fg-subtle">{isVi ? 'Nhân công vận hành:' : 'Labor rate:'}</span>
                        <span className="font-semibold text-fg-muted">{vndOrEmpty(w.laborRateOverride)}/h</span>
                      </div>
                      {w.contactPhone && (
                        <div className="flex justify-between pt-1 border-t border-line-subtle">
                          <span className="text-fg-subtle">{isVi ? 'Hotline:' : 'Contact:'}</span>
                          <span className="font-mono text-fg-muted">{w.contactPhone}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="p-3 bg-canvas/70 flex items-center justify-between gap-2">
                    {w.verifiedStatus === 'Pending' ? (
                      <button
                        onClick={() => handleApprove(w.id, w.workshopName)}
                        className="w-full py-1.5 px-3 bg-primary hover:bg-primary-hover text-primary-fg text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Icon name="check_circle" size={16} />
                        {isVi ? 'Phê Duyệt Xưởng Này' : 'Approve Workshop'}
                      </button>
                    ) : w.verifiedStatus === 'Verified' ? (
                      <div className="flex items-center gap-2 w-full">
                        <button
                          onClick={() => setActiveTab('fleet')}
                          className="flex-1 py-1.5 px-2.5 bg-surface-subtle hover:bg-canvas text-fg-muted text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Icon name="view_timeline" size={16} />
                          {isVi ? 'Xem Đội Máy' : 'View Fleet'}
                        </button>
                        <button
                          onClick={() => handleSuspend(w.id, w.workshopName)}
                          className="py-1.5 px-2.5 bg-danger-tint hover:bg-danger-tint text-danger text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                          title={isVi ? 'Đình chỉ xưởng' : 'Suspend workshop'}
                        >
                          {isVi ? 'Đình Chỉ' : 'Suspend'}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => void handleSetWorkshopStatus(w.id, 'Verified', w.workshopName)}
                        className="w-full py-1.5 px-3 bg-primary hover:bg-primary-hover text-primary-fg text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Icon name="replay" size={16} />
                        {isVi ? 'Khôi Phục Hoạt Động' : 'Reactivate'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          )}
        </div>
      )}

      {/* TAB 2: ĐỘI MÁY IN TOÀN HỆ THỐNG (FLEET INSPECTOR) */}
      {activeTab === 'fleet' && (
        <div className="space-y-4">
          {/* Fleet Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface p-3.5 rounded-lg border border-line-subtle shadow-e0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 bg-surface-muted p-1 rounded-lg text-xs font-semibold">
                <span className="text-fg-subtle px-1 text-xs uppercase tracking-wider">{isVi ? 'Trạng thái máy:' : 'Printer Status:'}</span>
                {(['all', 'Free', 'Busy', 'Maintenance'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setFleetStatusFilter(s)}
                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                      fleetStatusFilter === s
                        ? 'bg-surface text-primary font-bold shadow-e0'
                        : 'text-fg-muted hover:text-fg'
                    }`}
                  >
                    {s === 'all'
                      ? (isVi ? 'Tất cả' : 'All')
                      : s === 'Free'
                      ? (isVi ? 'Rảnh (Idle)' : 'Idle')
                      : s === 'Busy'
                      ? (isVi ? 'Đang In (Printing)' : 'Printing')
                      : (isVi ? 'Bảo Trì' : 'Maintenance')}
                  </button>
                ))}
              </div>

              <span className="text-xs text-fg-subtle">
                {isVi
                  ? 'Nguồn: bảng printer_fleet (đội máy toàn hệ thống)'
                  : 'Source: printer_fleet (global fleet)'}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => void loadFleet()}
                disabled={isFleetLoading}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-surface-subtle hover:bg-canvas text-fg-muted text-xs font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-60"
              >
                <Icon name="sync" size={16} className={isFleetLoading ? 'animate-spin' : ''} />
                {isVi ? 'Tải Lại' : 'Reload'}
              </button>

              <button
                onClick={() => setIsAddMachineModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-primary hover:bg-primary-hover text-primary-fg text-xs font-bold rounded-lg shadow-e1 transition-colors cursor-pointer"
              >
                <Icon name="add" size={16} />
                {isVi ? 'Biên Chế Máy Mới' : 'Register Printer'}
              </button>
            </div>
          </div>

          {/* Đang tải */}
          {isFleetLoading && fleetPrinters === null && (
            <div className="bg-surface p-6 rounded-lg border border-line-subtle shadow-e0 text-center text-xs text-fg-subtle">
              {isVi
                ? 'Đang tải đội máy in từ bảng printer_fleet...'
                : 'Loading printer fleet from printer_fleet...'}
            </div>
          )}

          {/* LỖI THẬT — không rơi về 0, không rơi về fixture */}
          {!isFleetLoading && fleetError !== null && (
            <div role="alert" className="p-4 bg-danger-tint border border-danger/30 rounded-lg flex items-start gap-3">
              <Icon name="error" size={24} className="text-danger mt-0.5" />
              <div className="flex-1">
                <h4 className="font-bold text-danger text-sm">
                  {isVi
                    ? 'Không đọc được đội máy in từ bảng printer_fleet'
                    : 'Could not read the printer fleet from printer_fleet'}
                </h4>
                <p className="text-xs text-danger mt-1 font-mono break-all">{fleetError}</p>
                <button
                  onClick={() => void loadFleet()}
                  className="mt-2 px-3 py-1 bg-surface border border-danger/30 text-danger text-xs font-bold rounded-lg cursor-pointer"
                >
                  {isVi ? 'Thử lại' : 'Retry'}
                </button>
              </div>
            </div>
          )}

          {/* RỖNG THẬT / không khớp bộ lọc */}
          {!isFleetLoading && fleetError === null && fleetPrinters !== null && filteredPrinters.length === 0 && (
            <EmptyState
              size="sm"
              title={isVi ? 'Chưa có máy in nào' : 'No printer yet'}
              description={
                fleetStatusFilter !== 'all'
                  ? isVi
                    ? 'Không có máy in nào khớp bộ lọc trạng thái hiện tại.'
                    : 'No printer matches the current status filter.'
                  : isVi
                  ? 'Bảng printer_fleet chưa có bản ghi nào.'
                  : 'The printer_fleet table has no row yet.'
              }
              icon={<Icon name="print" size={20} className="text-primary" />}
              action={
                <Button
                  variant="primary"
                  size="sm"
                  leadingIcon={<Icon name="add" size={18} />}
                  onClick={() => setIsAddMachineModalOpen(true)}
                >
                  {isVi ? 'Biên Chế Máy Mới' : 'Register printer'}
                </Button>
              }
            />
          )}

          {/* Machine Fleet Grid */}
          {!isFleetLoading && fleetError === null && filteredPrinters.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredPrinters.map((p) => {
              const m = printerToMachine(p);
              const depPerHour =
                m.purchasePrice != null && m.lifetimeHours ? getDepreciationPerHour(m) : null;
              const elecPerHour =
                m.avgPowerKW != null && electricityRateVnd != null
                  ? getElectricityPerHour(m, electricityRateVnd)
                  : null;
              const totalHourlyCost =
                depPerHour != null && elecPerHour != null ? depPerHour + elecPerHour : null;
              const statusLabel =
                p.status === 'Printing'
                  ? isVi ? 'Đang In' : 'Printing'
                  : p.status === 'Maintenance'
                  ? isVi ? 'Bảo Trì' : 'Maintenance'
                  : isVi ? 'Rảnh' : 'Idle';
              const volumeText =
                p.bedDimensions &&
                p.bedDimensions.x != null &&
                p.bedDimensions.y != null &&
                p.bedDimensions.z != null
                  ? `${p.bedDimensions.x}×${p.bedDimensions.y}×${p.bedDimensions.z}`
                  : null;

              return (
                <div
                  key={p.id}
                  className="bg-surface rounded-lg border border-line-subtle p-4 shadow-e0 hover:shadow-e1 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-sm text-xs font-black bg-surface-muted text-fg-muted">
                          {p.technology}
                        </span>
                        <span
                          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                            p.status === 'Idle'
                              ? 'bg-positive-tint text-positive border border-positive/30'
                              : p.status === 'Printing'
                              ? 'bg-info-tint text-info border border-info/30'
                              : 'bg-warning-tint text-warning border border-warning/30'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              p.status === 'Idle'
                                ? 'bg-positive animate-pulse'
                                : p.status === 'Printing'
                                ? 'bg-info animate-pulse'
                                : 'bg-warning'
                            }`}
                          />
                          {statusLabel}
                        </span>
                      </div>
                      <h4 className="font-bold text-fg text-base mt-2">{p.name}</h4>
                      <p className="text-xs text-fg-subtle mt-0.5 flex items-center gap-1">
                        <Icon name="precision_manufacturing" size={13} />
                        {p.brand || '—'}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-mono text-fg-subtle block">{isVi ? 'Khổ in (mm)' : 'Volume'}</span>
                      <span className="text-xs font-mono font-bold text-fg-muted">{volumeText ?? '—'}</span>
                    </div>
                  </div>

                  {/* Hourly Cost Breakdown Card */}
                  <div className="mt-4 p-3 bg-canvas rounded-lg border border-line-subtle space-y-2">
                    <div className="text-xs font-black uppercase text-fg-subtle tracking-wider flex items-center justify-between">
                      <span>{isVi ? 'Định Mức Chi Phí Vận Hành' : 'Operational Cost Engine'}</span>
                      <span className="font-bold text-primary">
                        {totalHourlyCost != null ? `${formatVnd(totalHourlyCost)}/h` : '—'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-line-subtle text-xs">
                      <div>
                        <div className="text-xs text-fg-subtle font-medium">
                          {isVi ? 'Khấu hao máy/giờ:' : 'Depreciation/h:'}
                        </div>
                        <div className="font-bold text-fg font-mono">
                          {depPerHour != null ? `${formatVnd(depPerHour)}/h` : '—'}
                        </div>
                        <div className="text-xs text-fg-subtle">
                          {m.purchasePrice != null && m.lifetimeHours
                            ? `(${formatVnd(m.purchasePrice)} / ${m.lifetimeHours}h)`
                            : isVi
                            ? '(chưa khai giá mua / tuổi thọ)'
                            : '(purchase price / lifetime not recorded)'}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-fg-subtle font-medium">
                          {isVi ? 'Tiền điện máy/giờ:' : 'Electricity/h:'}
                        </div>
                        <div className="font-bold text-fg font-mono">
                          {elecPerHour != null ? `${formatVnd(elecPerHour)}/h` : '—'}
                        </div>
                        <div className="text-xs text-fg-subtle">
                          {m.avgPowerKW != null && electricityRateVnd != null
                            ? `(${m.avgPowerKW} kW × ${formatVnd(electricityRateVnd)})`
                            : electricityRateVnd == null
                            ? isVi
                              ? '(chưa cấu hình giá điện trong pricing_global_settings)'
                              : '(electricity rate not configured)'
                            : isVi
                            ? '(chưa khai công suất)'
                            : '(power not recorded)'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Machine Action Bar — ghi thẳng xuống printer_fleet */}
                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-line-subtle text-xs">
                    <span className="text-fg-subtle font-mono">ID: {p.id}</span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() =>
                          void handleSetPrinterStatus(p, p.status === 'Printing' ? 'Idle' : 'Printing')
                        }
                        className={`px-2.5 py-1 text-xs font-bold rounded-sm transition-colors cursor-pointer ${
                          p.status === 'Printing'
                            ? 'bg-positive-tint hover:bg-positive/20 text-positive'
                            : 'bg-info-tint hover:bg-info/20 text-info'
                        }`}
                      >
                        {p.status === 'Printing'
                          ? isVi ? 'Đặt Rảnh (Idle)' : 'Set Idle'
                          : isVi ? 'Đặt Bận (Printing)' : 'Set Printing'}
                      </button>
                      <button
                        onClick={() =>
                          void handleSetPrinterStatus(p, p.status === 'Maintenance' ? 'Idle' : 'Maintenance')
                        }
                        className="px-2 py-1 text-xs font-medium text-fg-subtle hover:text-warning bg-surface-muted rounded-sm hover:bg-warning-tint cursor-pointer"
                        title={isVi ? 'Chuyển sang bảo trì' : 'Toggle maintenance'}
                      >
                        <Icon name="build" size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          )}
        </div>
      )}

      {/* TAB 3: TỒN KHO & NHỰA TOÀN MẠNG LƯỚI */}
      {activeTab === 'materials' && (
        <div className="space-y-4">
          {/* Low stock warning banner */}
          {lowStockList.length > 0 && (
            <div className="p-4 bg-danger-tint border border-danger/30 rounded-lg flex items-start gap-3">
              <Icon name="warning" size={28} className="text-danger mt-0.5" />
              <div className="flex-1">
                <h4 className="font-bold text-danger text-sm">
                  {isVi
                    ? `Cảnh Báo: Có ${lowStockList.length} cuộn/loại vật liệu đang dưới ngưỡng an toàn!`
                    : `Alert: ${lowStockList.length} material spools are below safe stock threshold!`}
                </h4>
                <p className="text-xs text-danger mt-1">
                  {isVi
                    ? 'Cần nhập bổ sung ngay để không gián đoạn các đơn hàng in 3D đang dispatch tới xưởng.'
                    : 'Restock immediately to prevent dispatch bottlenecks across network workshops.'}
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {lowStockList.map((m) => (
                    <span
                      key={m.id}
                      className="px-2 py-0.5 bg-surface border border-danger/30 text-danger text-xs font-bold rounded-md"
                    >
                      {m.materialName}: {m.currentStockGrams}g / {m.lowStockThresholdGrams}g
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Material inventory table controls */}
          <div className="flex items-center justify-between gap-3 bg-surface p-3.5 rounded-lg border border-line-subtle shadow-e0">
            <div className="text-xs text-fg-subtle font-medium">
              {isVi
                ? 'Danh sách tồn kho CHƯA nối nguồn DB: `workshop_materials` bị RLS giới hạn theo xưởng và bảng catalog `materials` không có cột tồn kho theo xưởng — nên bảng dưới đây không phải số liệu thật.'
                : 'The inventory list has NO DB source yet: `workshop_materials` is RLS-scoped per workshop and the `materials` catalogue has no per-workshop stock column, so the table below is not real data.'}
            </div>

            <button
              onClick={() => setIsAddMaterialModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-primary hover:bg-primary-hover text-primary-fg text-xs font-bold rounded-lg shadow-e1 transition-colors cursor-pointer"
            >
              <Icon name="add" size={16} />
              {isVi ? 'Thêm Cuộn Nhựa / Resin' : 'Add Material SKU'}
            </button>
          </div>

          {/* Materials Table */}
          <div className="bg-surface rounded-lg border border-line-subtle overflow-hidden shadow-e0">
            {materials.length === 0 ? (
            <EmptyState
              size="sm"
              title={isVi ? 'Chưa nối nguồn tồn kho' : 'Inventory source not wired'}
              description={
                isVi
                  ? 'Đây KHÔNG phải "kho rỗng": màn này chưa có hàm service nào đọc tồn kho theo xưởng, nên không hiển thị số liệu thay thế.'
                  : 'This is NOT "empty stock": no service function reads per-workshop inventory yet, so no substitute numbers are shown.'
              }
              icon={<Icon name="layers" size={20} className="text-primary" />}
              action={
                <Button
                  variant="primary"
                  size="sm"
                  leadingIcon={<Icon name="add" size={18} />}
                  onClick={() => setIsAddMaterialModalOpen(true)}
                >
                  {isVi ? 'Thêm Cuộn Nhựa / Resin' : 'Add material SKU'}
                </Button>
              }
            />
            ) : (
            <DataTable<WorkshopMaterial>
              columns={materialColumns}
              rows={materials}
              getRowId={(row) => row.id}
              caption={isVi ? 'Tồn kho vật liệu theo xưởng' : 'Material stock by workshop'}
              tableLabel={isVi ? 'Tồn kho vật liệu theo xưởng' : 'Material stock by workshop'}
              defaultSort={[{ key: 'materialName', direction: 'asc' }]}
            />
            )}
          </div>
        </div>
      )}

      {/* MODAL: THÊM XƯỞNG IN */}
      {isAddWorkshopModalOpen && (
        <div className="fixed inset-0 z-modal bg-surface-inverse/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface rounded-lg max-w-lg w-full p-6 shadow-e3 border border-line-subtle">
            <div className="flex items-center justify-between pb-3 border-b border-line-subtle">
              <h3 className="font-bold text-fg text-lg">
                {isVi ? 'Thêm Xưởng In Mới Vào Mạng Lưới' : 'Register New Partner Workshop'}
              </h3>
              <button aria-label="Đóng"
                onClick={() => setIsAddWorkshopModalOpen(false)}
                className="text-fg-subtle hover:text-fg-muted cursor-pointer"
              >
                <Icon name="close" size={24} />
              </button>
            </div>

            <form onSubmit={handleCreateWorkshop} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-fg-muted mb-1">
                  {isVi ? 'Tên xưởng in:' : 'Workshop Name:'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Smart 3D FabLab Đà Nẵng"
                  value={newWorkshopForm.workshopName}
                  onChange={(e) => setNewWorkshopForm({ ...newWorkshopForm, workshopName: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-line-subtle rounded-lg focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-fg-muted mb-1">
                    {isVi ? 'Khu vực (Miền):' : 'Region:'}
                  </label>
                  <select
                    value={newWorkshopForm.region}
                    onChange={(e) => setNewWorkshopForm({ ...newWorkshopForm, region: e.target.value as any })}
                    className="w-full text-xs px-3 py-2 border border-line-subtle rounded-lg focus:outline-none focus:border-primary"
                  >
                    <option value="Bắc">Miền Bắc (Hà Nội, Hải Phòng...)</option>
                    <option value="Trung">Miền Trung (Đà Nẵng, Huế...)</option>
                    <option value="Nam">Miền Nam (TP.HCM, Bình Dương...)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-fg-muted mb-1">
                    {isVi ? 'Trạng thái ban đầu:' : 'Initial Status:'}
                  </label>
                  <select
                    value={newWorkshopForm.verifiedStatus}
                    onChange={(e) => setNewWorkshopForm({ ...newWorkshopForm, verifiedStatus: e.target.value as any })}
                    className="w-full text-xs px-3 py-2 border border-line-subtle rounded-lg focus:outline-none focus:border-primary"
                  >
                    <option value="Pending">Chờ duyệt (Pending)</option>
                    <option value="Verified">Đã duyệt (Verified)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-fg-muted mb-1">
                  {isVi ? 'Địa chỉ xưởng:' : 'Address:'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="Số nhà, đường, quận/huyện, tỉnh/thành"
                  value={newWorkshopForm.address}
                  onChange={(e) => setNewWorkshopForm({ ...newWorkshopForm, address: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-line-subtle rounded-lg focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-fg-muted mb-1">
                    {isVi ? 'Số điện thoại:' : 'Phone:'}
                  </label>
                  <input
                    type="text"
                    placeholder="0988 xxx xxx"
                    value={newWorkshopForm.contactPhone}
                    onChange={(e) => setNewWorkshopForm({ ...newWorkshopForm, contactPhone: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-line-subtle rounded-lg focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-fg-muted mb-1">
                    {isVi ? 'Email liên hệ:' : 'Email:'}
                  </label>
                  <input
                    type="email"
                    placeholder="workshop@vcube.vn"
                    value={newWorkshopForm.contactEmail}
                    onChange={(e) => setNewWorkshopForm({ ...newWorkshopForm, contactEmail: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-line-subtle rounded-lg focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-fg-muted mb-1">
                    {isVi ? 'Giá điện riêng (VNĐ/kWh):' : 'Electricity Rate (VND/kWh):'}
                  </label>
                  <input
                    type="number"
                    placeholder={isVi ? 'Chưa khai ⇒ để trống' : 'Not set ⇒ leave empty'}
                    value={newWorkshopForm.electricityRateOverride ?? ''}
                    onChange={(e) =>
                      setNewWorkshopForm({
                        ...newWorkshopForm,
                        electricityRateOverride: e.target.value === '' ? null : Number(e.target.value)
                      })
                    }
                    className="w-full text-xs px-3 py-2 border border-line-subtle rounded-lg focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-fg-muted mb-1">
                    {isVi ? 'Công nhân công (VNĐ/giờ):' : 'Labor Rate (VND/h):'}
                  </label>
                  <input
                    type="number"
                    placeholder={isVi ? 'Chưa khai ⇒ để trống' : 'Not set ⇒ leave empty'}
                    value={newWorkshopForm.laborRateOverride ?? ''}
                    onChange={(e) =>
                      setNewWorkshopForm({
                        ...newWorkshopForm,
                        laborRateOverride: e.target.value === '' ? null : Number(e.target.value)
                      })
                    }
                    className="w-full text-xs px-3 py-2 border border-line-subtle rounded-lg focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-line-subtle">
                <button
                  type="button"
                  onClick={() => setIsAddWorkshopModalOpen(false)}
                  className="px-4 py-2 bg-surface-muted hover:bg-line-subtle text-fg-muted text-xs font-bold rounded-lg cursor-pointer"
                >
                  {isVi ? 'Hủy Bỏ' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary hover:bg-primary-hover text-primary-fg text-xs font-bold rounded-lg shadow-e1 cursor-pointer"
                >
                  {isVi ? 'Lưu & Khởi Tạo Xưởng' : 'Save Workshop'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: BIÊN CHẾ MÁY MỚI */}
      {isAddMachineModalOpen && (
        <div className="fixed inset-0 z-modal bg-surface-inverse/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface rounded-lg max-w-md w-full p-6 shadow-e3 border border-line-subtle">
            <div className="flex items-center justify-between pb-3 border-b border-line-subtle">
              <h3 className="font-bold text-fg text-base">
                {isVi ? 'Thêm Máy In Vào printer_fleet' : 'Add Printer to printer_fleet'}
              </h3>
              <button aria-label="Đóng"
                onClick={() => setIsAddMachineModalOpen(false)}
                className="text-fg-subtle hover:text-fg-muted cursor-pointer"
              >
                <Icon name="close" size={24} />
              </button>
            </div>

            <form onSubmit={handleCreateMachine} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-fg-muted mb-1">{isVi ? 'Tên máy in:' : 'Machine Name:'}</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Bambu Lab X1-Carbon #05"
                  value={newMachineForm.machineName}
                  onChange={(e) => setNewMachineForm({ ...newMachineForm, machineName: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-line-subtle rounded-lg focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-fg-muted mb-1">{isVi ? 'Hãng / dòng máy:' : 'Brand / model:'}</label>
                <input
                  type="text"
                  placeholder={isVi ? 'Để trống nếu chưa rõ' : 'Leave empty if unknown'}
                  value={newMachineForm.brand}
                  onChange={(e) => setNewMachineForm({ ...newMachineForm, brand: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-line-subtle rounded-lg focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-fg-muted mb-1">{isVi ? 'Công nghệ in:' : 'Technology:'}</label>
                  <select
                    value={newMachineForm.machineType}
                    onChange={(e) => setNewMachineForm({ ...newMachineForm, machineType: e.target.value as any })}
                    className="w-full text-xs px-3 py-2 border border-line-subtle rounded-lg focus:outline-none focus:border-primary"
                  >
                    <option value="FDM">FDM (Dây nhựa)</option>
                    <option value="SLA">SLA (Resin lỏng)</option>
                    <option value="SLS">SLS (Bột nylon)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-fg-muted mb-1">{isVi ? 'Công suất chạy (kW):' : 'Avg Power (kW):'}</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder={isVi ? 'Chưa đo ⇒ để trống' : 'Not measured ⇒ leave empty'}
                    value={newMachineForm.avgPowerKW ?? ''}
                    onChange={(e) =>
                      setNewMachineForm({
                        ...newMachineForm,
                        avgPowerKW: e.target.value === '' ? null : Number(e.target.value)
                      })
                    }
                    className="w-full text-xs px-3 py-2 border border-line-subtle rounded-lg focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-fg-muted mb-1">{isVi ? 'Giá mua máy (VNĐ):' : 'Purchase Price:'}</label>
                  <input
                    type="number"
                    placeholder={isVi ? 'Chưa có ⇒ để trống' : 'Unknown ⇒ leave empty'}
                    value={newMachineForm.purchasePrice ?? ''}
                    onChange={(e) =>
                      setNewMachineForm({
                        ...newMachineForm,
                        purchasePrice: e.target.value === '' ? null : Number(e.target.value)
                      })
                    }
                    className="w-full text-xs px-3 py-2 border border-line-subtle rounded-lg focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-fg-muted mb-1">{isVi ? 'Tuổi thọ khấu hao (giờ):' : 'Lifetime (Hours):'}</label>
                  <input
                    type="number"
                    placeholder={isVi ? 'Chưa có ⇒ để trống' : 'Unknown ⇒ leave empty'}
                    value={newMachineForm.lifetimeHours ?? ''}
                    onChange={(e) =>
                      setNewMachineForm({
                        ...newMachineForm,
                        lifetimeHours: e.target.value === '' ? null : Number(e.target.value)
                      })
                    }
                    className="w-full text-xs px-3 py-2 border border-line-subtle rounded-lg focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <p className="text-xs text-fg-subtle">
                {isVi
                  ? 'Bảng printer_fleet không gắn với một xưởng cụ thể, nên không có ô chọn xưởng. Ô số để trống nghĩa là CHƯA ĐO — hệ thống ghi NULL, không điền số mặc định.'
                  : 'printer_fleet is not bound to a specific workshop, so there is no workshop field. Empty numeric fields are stored as NULL, never as a made-up default.'}
              </p>

              <div className="flex justify-end gap-2 pt-3 border-t border-line-subtle">
                <button
                  type="button"
                  onClick={() => setIsAddMachineModalOpen(false)}
                  className="px-4 py-2 bg-surface-muted text-fg-muted text-xs font-bold rounded-lg cursor-pointer"
                >
                  {isVi ? 'Đóng' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-primary-fg text-xs font-bold rounded-lg shadow-e1 cursor-pointer"
                >
                  {isVi ? 'Ghi Vào DB' : 'Save to DB'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: THÊM VẬT LIỆU */}
      {isAddMaterialModalOpen && (
        <div className="fixed inset-0 z-modal bg-surface-inverse/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface rounded-lg max-w-md w-full p-6 shadow-e3 border border-line-subtle">
            <div className="flex items-center justify-between pb-3 border-b border-line-subtle">
              <h3 className="font-bold text-fg text-base">
                {isVi ? 'Thêm Cuộn Nhựa / Vật Liệu Mới' : 'Add Material SKU'}
              </h3>
              <button aria-label="Đóng"
                onClick={() => setIsAddMaterialModalOpen(false)}
                className="text-fg-subtle hover:text-fg-muted cursor-pointer"
              >
                <Icon name="close" size={24} />
              </button>
            </div>

            <form onSubmit={handleCreateMaterial} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-fg-muted mb-1">{isVi ? 'Xưởng lưu kho:' : 'Workshop:'}</label>
                <select
                  value={newMaterialForm.workshopId}
                  onChange={(e) => setNewMaterialForm({ ...newMaterialForm, workshopId: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-line-subtle rounded-lg focus:outline-none focus:border-primary"
                >
                  {workshops.map((w) => (
                    <option key={w.id} value={w.id}>{w.workshopName} ({w.region})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-fg-muted mb-1">{isVi ? 'Tên vật liệu:' : 'Material Name:'}</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: PETG-CF Carbon Fiber Đen"
                  value={newMaterialForm.materialName}
                  onChange={(e) => setNewMaterialForm({ ...newMaterialForm, materialName: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-line-subtle rounded-lg focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-fg-muted mb-1">{isVi ? 'Họ nhựa:' : 'Polymer Type:'}</label>
                  <select
                    value={newMaterialForm.materialType}
                    onChange={(e) => setNewMaterialForm({ ...newMaterialForm, materialType: e.target.value as any })}
                    className="w-full text-xs px-3 py-2 border border-line-subtle rounded-lg focus:outline-none focus:border-primary"
                  >
                    <option value="PLA">PLA</option>
                    <option value="PETG">PETG</option>
                    <option value="ABS">ABS</option>
                    <option value="TPU">TPU</option>
                    <option value="PA">PA (Nylon)</option>
                    <option value="Resin">Resin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-fg-muted mb-1">{isVi ? 'Đơn giá/kg (VNĐ):' : 'Price/kg:'}</label>
                  <input
                    type="number"
                    value={newMaterialForm.pricePerKg}
                    onChange={(e) => setNewMaterialForm({ ...newMaterialForm, pricePerKg: Number(e.target.value) })}
                    className="w-full text-xs px-3 py-2 border border-line-subtle rounded-lg focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-fg-muted mb-1">{isVi ? 'Tồn kho ban đầu (grams):' : 'Stock (g):'}</label>
                  <input
                    type="number"
                    value={newMaterialForm.currentStockGrams}
                    onChange={(e) => setNewMaterialForm({ ...newMaterialForm, currentStockGrams: Number(e.target.value) })}
                    className="w-full text-xs px-3 py-2 border border-line-subtle rounded-lg focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-fg-muted mb-1">{isVi ? 'Ngưỡng cảnh báo (grams):' : 'Threshold (g):'}</label>
                  <input
                    type="number"
                    value={newMaterialForm.lowStockThresholdGrams}
                    onChange={(e) => setNewMaterialForm({ ...newMaterialForm, lowStockThresholdGrams: Number(e.target.value) })}
                    className="w-full text-xs px-3 py-2 border border-line-subtle rounded-lg focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-line-subtle">
                <button
                  type="button"
                  onClick={() => setIsAddMaterialModalOpen(false)}
                  className="px-4 py-2 bg-surface-muted text-fg-muted text-xs font-bold rounded-lg cursor-pointer"
                >
                  {isVi ? 'Đóng' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-primary-fg text-xs font-bold rounded-lg shadow-e1 cursor-pointer"
                >
                  {isVi ? 'Lưu Cuộn Nhựa' : 'Save Material'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 4: ĐỐI TÁC XƯỞNG LƯU TRONG SUPABASE (`workshop_partners`) */}
      {activeTab === 'partners' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-3.5 rounded-lg border border-line-subtle shadow-e0">
            <div className="text-xs text-fg-subtle font-medium">
              {isVi
                ? `Đối tác xưởng đọc/ghi trực tiếp bảng workshop_partners trên Supabase: ${partners.length} bản ghi.`
                : `Workshop partners read/written directly to the Supabase workshop_partners table: ${partners.length} rows.`}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => void loadPartners()}
                disabled={isPartnersLoading}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-surface-subtle hover:bg-canvas text-fg-muted text-xs font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-60"
              >
                <Icon name="sync" size={16} className={isPartnersLoading ? 'animate-spin' : ''} />
                {isVi ? 'Tải Lại' : 'Reload'}
              </button>

              <button
                onClick={() => setPartnerDraft(emptyPartnerDraft())}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-primary hover:bg-primary-hover text-primary-fg text-xs font-bold rounded-lg shadow-e1 transition-colors cursor-pointer"
              >
                <Icon name="add_business" size={16} />
                {isVi ? 'Thêm Đối Tác' : 'Add Partner'}
              </button>
            </div>
          </div>

          <div className="bg-surface rounded-lg border border-line-subtle overflow-hidden shadow-e0">
            {!isPartnersLoading && partners.length === 0 ? (
            <EmptyState
              size="sm"
              title={isVi ? 'Chưa có đối tác xưởng nào' : 'No workshop partner yet'}
              description={
                isVi
                  ? 'Bảng workshop_partners chưa có bản ghi nào để hiển thị.'
                  : 'The workshop_partners table has no row to show.'
              }
              icon={<Icon name="handshake" size={20} className="text-primary" />}
              action={
                <Button
                  variant="primary"
                  size="sm"
                  leadingIcon={<Icon name="add_business" size={18} />}
                  onClick={() => setPartnerDraft(emptyPartnerDraft())}
                >
                  {isVi ? 'Thêm Đối Tác' : 'Add partner'}
                </Button>
              }
            />
            ) : (
            <DataTable<WorkshopPartner>
              columns={partnerColumns}
              rows={partners}
              getRowId={(row) => row.id}
              loading={isPartnersLoading && partners.length === 0}
              caption={isVi ? 'Đối tác xưởng in' : 'Workshop partners'}
              tableLabel={isVi ? 'Đối tác xưởng in' : 'Workshop partners'}
              defaultSort={[{ key: 'name', direction: 'asc' }]}
              emptyState={
                <EmptyState
                  live
                  title={isVi ? 'Chưa có đối tác xưởng nào' : 'No workshop partners yet'}
                  description={isVi ? 'Thêm đối tác xưởng để bắt đầu điều phối đơn.' : 'Add a workshop partner to start dispatching orders.'}
                />
              }
            />
            )}
          </div>

          {/* MODAL: THÊM / SỬA ĐỐI TÁC (ghi thẳng vào Supabase) */}
          {partnerDraft && (
            <div className="fixed inset-0 z-modal bg-surface-inverse/70 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-surface rounded-lg max-w-lg w-full p-6 shadow-e3 border border-line-subtle max-h-[92vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-3 border-b border-line-subtle">
                  <h3 className="font-bold text-fg text-lg">
                    {partners.some((p) => p.id === partnerDraft.id)
                      ? isVi
                        ? `Cấu hình đối tác: ${partnerDraft.name}`
                        : `Configure partner: ${partnerDraft.name}`
                      : isVi
                      ? 'Thêm đối tác xưởng mới'
                      : 'Add new workshop partner'}
                  </h3>
                  <button aria-label="Đóng"
                    onClick={() => setPartnerDraft(null)}
                    className="text-fg-subtle hover:text-fg-muted cursor-pointer"
                  >
                    <Icon name="close" size={24} />
                  </button>
                </div>

                <form onSubmit={handleSubmitPartner} className="mt-4 space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-fg-muted mb-1">
                      {isVi ? 'Tên xưởng / trạm MES *' : 'Workshop name *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={partnerDraft.name}
                      onChange={(e) => setPartnerDraft({ ...partnerDraft, name: e.target.value })}
                      className="w-full text-xs px-3 py-2 border border-line-subtle rounded-lg focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-fg-muted mb-1">
                        {isVi ? 'Vùng:' : 'Region:'}
                      </label>
                      <select
                        value={partnerDraft.region}
                        onChange={(e) =>
                          setPartnerDraft({ ...partnerDraft, region: e.target.value as WorkshopPartner['region'] })
                        }
                        className="w-full text-xs px-3 py-2 border border-line-subtle rounded-lg focus:outline-none focus:border-primary"
                      >
                        <option value="hanoi">{isVi ? 'Miền Bắc (Hà Nội)' : 'North (Hanoi)'}</option>
                        <option value="danang">{isVi ? 'Miền Trung (Đà Nẵng)' : 'Central (Da Nang)'}</option>
                        <option value="hcm">{isVi ? 'Miền Nam (TP.HCM)' : 'South (HCMC)'}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-fg-muted mb-1">
                        {isVi ? 'Trạng thái:' : 'Status:'}
                      </label>
                      <select
                        value={partnerDraft.status}
                        onChange={(e) =>
                          setPartnerDraft({ ...partnerDraft, status: e.target.value as WorkshopPartner['status'] })
                        }
                        className="w-full text-xs px-3 py-2 border border-line-subtle rounded-lg focus:outline-none focus:border-primary"
                      >
                        <option value="active">active</option>
                        <option value="busy">busy</option>
                        <option value="offline">offline</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-fg-muted mb-1">
                      {isVi ? 'Địa chỉ *' : 'Address *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={partnerDraft.address}
                      onChange={(e) => setPartnerDraft({ ...partnerDraft, address: e.target.value })}
                      className="w-full text-xs px-3 py-2 border border-line-subtle rounded-lg focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-fg-muted mb-1">
                        {isVi ? 'Người phụ trách:' : 'Contact person:'}
                      </label>
                      <input
                        type="text"
                        value={partnerDraft.contactPerson}
                        onChange={(e) => setPartnerDraft({ ...partnerDraft, contactPerson: e.target.value })}
                        className="w-full text-xs px-3 py-2 border border-line-subtle rounded-lg focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-fg-muted mb-1">
                        {isVi ? 'Hotline:' : 'Phone:'}
                      </label>
                      <input
                        type="text"
                        value={partnerDraft.phone}
                        onChange={(e) => setPartnerDraft({ ...partnerDraft, phone: e.target.value })}
                        className="w-full text-xs px-3 py-2 border border-line-subtle rounded-lg focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-fg-muted mb-1">
                      {isVi ? 'Email:' : 'Email:'}
                    </label>
                    <input
                      type="email"
                      value={partnerDraft.email}
                      onChange={(e) => setPartnerDraft({ ...partnerDraft, email: e.target.value })}
                      className="w-full text-xs px-3 py-2 border border-line-subtle rounded-lg focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-fg-muted mb-1">
                        {isVi ? 'Máy đang chạy:' : 'Active printers:'}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={partnerDraft.activePrintersCount}
                        onChange={(e) =>
                          setPartnerDraft({ ...partnerDraft, activePrintersCount: Number(e.target.value) })
                        }
                        className="w-full text-xs px-3 py-2 border border-line-subtle rounded-lg focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-fg-muted mb-1">
                        {isVi ? 'Máy rảnh:' : 'Idle printers:'}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={partnerDraft.availablePrintersCount}
                        onChange={(e) =>
                          setPartnerDraft({ ...partnerDraft, availablePrintersCount: Number(e.target.value) })
                        }
                        className="w-full text-xs px-3 py-2 border border-line-subtle rounded-lg focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-fg-muted mb-1">
                        {isVi ? 'Điểm SLA:' : 'SLA rating:'}
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="5"
                        value={partnerDraft.slaRating}
                        onChange={(e) => setPartnerDraft({ ...partnerDraft, slaRating: Number(e.target.value) })}
                        className="w-full text-xs px-3 py-2 border border-line-subtle rounded-lg focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-fg-muted mb-1">
                      {isVi ? 'Công nghệ hỗ trợ:' : 'Supported technologies:'}
                    </label>
                    <div className="flex items-center gap-4 pt-1">
                      {(['FDM', 'SLA', 'SLS'] as const).map((tech) => (
                        <label key={tech} className="flex items-center gap-1.5 text-xs text-fg-muted cursor-pointer">
                          <input
                            type="checkbox"
                            checked={(partnerDraft.supportedTechnologies || []).includes(tech)}
                            onChange={(e) => {
                              const current: WorkshopPartner['supportedTechnologies'] =
                                partnerDraft.supportedTechnologies || [];
                              const next: WorkshopPartner['supportedTechnologies'] = e.target.checked
                                ? current.includes(tech)
                                  ? current
                                  : [...current, tech]
                                : current.filter((t) => t !== tech);
                              setPartnerDraft({ ...partnerDraft, supportedTechnologies: next });
                            }}
                            className="rounded-sm text-primary"
                          />
                          <span>{tech}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-line-subtle">
                    <button
                      type="button"
                      onClick={() => setPartnerDraft(null)}
                      className="px-4 py-2 bg-surface-muted hover:bg-line-subtle text-fg-muted text-xs font-bold rounded-lg cursor-pointer"
                    >
                      {isVi ? 'Hủy Bỏ' : 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-primary hover:bg-primary-hover text-primary-fg text-xs font-bold rounded-lg shadow-e1 cursor-pointer"
                    >
                      {isVi ? 'Lưu Vào Supabase' : 'Save to Supabase'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
export default Group1WorkshopsPanel;
