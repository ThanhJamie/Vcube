import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useWorkshopAdminStore } from '../../../../stores/useWorkshopAdminStore';
import { dbService } from '../../../../backend/supabase/database';
import { WorkshopProfile, WorkshopMachine, WorkshopMaterial, WorkshopPartner, PrinterProfile } from '../../../../types';
import { getPricingGlobalSettings } from '../../../../backend/services/settingsService';
import { Badge, Button, DataTable, EmptyState, Field, Icon, InfoTip, Input, Modal, Select, Skeleton } from '@frontend/ui';
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
      setFleetError(err?.message || ('lỗi không xác định'));
    } finally {
      setIsFleetLoading(false);
    }
  }, [onUpdatePrinters]);

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
        `Lưu máy in thất bại: ${result.error || 'lỗi không xác định'}`
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
      `Đã lưu trạng thái máy ${printer.name}: ${status}`
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
        `Không tải được danh sách đối tác: ${err?.message || 'lỗi không xác định'}`
      );
    } finally {
      setIsPartnersLoading(false);
    }
  }, [onShowToast]);

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
        `Lưu đối tác thất bại: ${result.error || 'lỗi không xác định'}`
      );
    }
  };

  const handleTogglePartnerStatus = (partner: WorkshopPartner) => {
    const nextStatus: WorkshopPartner['status'] = partner.status === 'active' ? 'busy' : 'active';
    void persistPartner(
      { ...partner, status: nextStatus },
      `Đã cập nhật trạng thái đối tác ${partner.name}: ${nextStatus}`
    );
  };

  const handleSubmitPartner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerDraft) return;
    if (!partnerDraft.name.trim() || !partnerDraft.address.trim()) {
      onShowToast?.(
        'Vui lòng nhập tên xưởng và địa chỉ'
      );
      return;
    }
    const isNew = !partners.some((p) => p.id === partnerDraft.id);
    void persistPartner(
      partnerDraft,
      isNew
        ? `Đã thêm đối tác xưởng vào mạng lưới: ${partnerDraft.name}`
        : `Đã lưu đối tác xưởng: ${partnerDraft.name}`
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
        `Cập nhật trạng thái xưởng thất bại: ${res.error || 'lỗi không xác định'}`
      );
      return;
    }
    onShowToast?.(
      status === 'Verified'
        ? `Đã ghi trạng thái Đã duyệt cho xưởng: ${name}`
        : `Đã ghi trạng thái Tạm đình chỉ cho xưởng: ${name}`
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
      onShowToast?.('Vui lòng điền tên xưởng và địa chỉ');
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
        `Tạo xưởng thất bại: ${res.error || 'lỗi không xác định'}`
      );
      return; // giữ modal để không mất dữ liệu đã nhập
    }
    setIsAddWorkshopModalOpen(false);
    onShowToast?.('Đã ghi xưởng in mới vào workshop_profiles!');
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
      onShowToast?.('Vui lòng nhập tên máy in');
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
      'Đã ghi máy in mới vào bảng printer_fleet!'
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
      onShowToast?.('Vui lòng nhập tên vật liệu');
      return;
    }
    addMaterial(newMaterialForm);
    setIsAddMaterialModalOpen(false);
    // ⚠️ NÓI THẬT: chưa có hàm service nào ghi tồn kho theo xưởng, nên bản ghi này CHỈ nằm
    // trong bộ nhớ màn hình và mất khi tải lại — không được báo như đã lưu vào DB.
    onShowToast?.(
      'Bản ghi vật liệu CHỈ nằm trong bộ nhớ màn hình: chưa có hàm ghi DB cho tồn kho theo xưởng nên sẽ mất khi tải lại.'
    );
  };

  /** Cột bảng tồn kho vật liệu (tab Vật liệu) dùng primitive `DataTable`. */
  const materialColumns = useMemo<DataTableColumn<WorkshopMaterial>[]>(() => [
    {
      key: 'materialName',
      header: 'Vật liệu',
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
    { key: 'materialType', header: 'Loại', value: (m) => m.materialType, render: (mat) => <span className="px-2 py-0.5 bg-surface-muted text-fg-muted border border-line rounded-sm font-medium text-xs">{mat.materialType}</span> },
    {
      key: 'workshop',
      header: 'Xưởng giữ kho',
      value: (m) => m.workshopId,
      render: (mat) => {
        const ws = workshops.find((w) => w.id === mat.workshopId);
        return <span className="text-fg-muted font-medium">{ws ? `${ws.workshopName} (${ws.region})` : '—'}</span>;
      },
    },
    { key: 'pricePerKg', header: 'Đơn giá/kg', numeric: true, value: (m) => m.pricePerKg, render: (mat) => <span className="font-semibold text-fg">{formatVnd(mat.pricePerKg)}</span> },
    {
      key: 'currentStockGrams',
      header: 'Tồn kho hiện tại',
      numeric: true,
      value: (m) => m.currentStockGrams,
      render: (mat) => (
        <div>
          <div className="font-bold text-fg">{mat.currentStockGrams}g</div>
          <div className="text-xs text-fg-subtle">Ngưỡng min: {numOrEmpty(mat.lowStockThresholdGrams, 'g')}</div>
        </div>
      ),
    },
    {
      key: 'stockStatus',
      header: 'Trạng thái',
      value: (m) => m.stockStatus,
      render: (mat) => (
        <Badge
          variant={mat.stockStatus === 'Tracking' ? 'success' : mat.stockStatus === 'LowStock' ? 'warning' : 'danger'}
          dot
        >
          {mat.stockStatus === 'Tracking' ? ('Đầy đủ') : mat.stockStatus === 'LowStock' ? ('Sắp hết') : ('Hết hàng')}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Điều chỉnh nhanh',
      align: 'right',
      render: (mat) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => updateMaterialStock(mat.id, Math.max(0, mat.currentStockGrams - 500))}
            title="-500g"
          >
            -500g
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => updateMaterialStock(mat.id, mat.currentStockGrams + 1000)}
            title="+1kg (1000g)"
          >
            +1kg
          </Button>
        </div>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [workshops, updateMaterialStock]);

  /** Cột bảng đối tác xưởng (tab Đối tác) dùng primitive `DataTable`. */
  const partnerColumns = useMemo<DataTableColumn<WorkshopPartner>[]>(() => [
    {
      key: 'name',
      header: 'Đối tác / Địa chỉ',
      value: (p) => p.name || '',
      render: (p) => (
        <div>
          <div className="font-bold text-fg">{p.name || ('(chưa đặt tên)')}</div>
          <div className="text-xs text-fg-subtle line-clamp-1">{p.address || '—'}</div>
        </div>
      ),
    },
    { key: 'region', header: 'Vùng', value: (p) => p.region, render: (p) => <span className="px-2 py-0.5 bg-surface-muted text-fg-muted border border-line rounded-sm font-medium text-xs uppercase">{p.region}</span> },
    {
      key: 'contact',
      header: 'Liên hệ',
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
      header: 'Công nghệ',
      render: (p) => (
        <div className="flex flex-wrap gap-1">
          {(p.supportedTechnologies || []).map((tech) => (
            <span key={tech} className="px-1.5 py-0.5 bg-primary-tint text-primary border border-primary/20 rounded-sm font-mono font-medium text-xs">{tech}</span>
          ))}
        </div>
      ),
    },
    {
      key: 'printers',
      header: 'Máy / Hàng đợi',
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
      header: 'Trạng thái',
      value: (p) => p.status,
      render: (p) => (
        <Badge
          variant={p.status === 'active' ? 'success' : p.status === 'busy' ? 'warning' : 'neutral'}
          dot
        >
          {p.status === 'active' ? 'Đang hoạt động' : p.status === 'busy' ? 'Đang bận' : 'Ngoại tuyến'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Thao tác',
      align: 'right',
      render: (p) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleTogglePartnerStatus(p)}
          >
            {p.status === 'active' ? ('Giảm tải') : 'Nhận đơn'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPartnerDraft({ ...p })}
          >
            Sửa
          </Button>
        </div>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], []);

  return (
    <div className="space-y-6">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-6 rounded-lg border border-line">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="technical">{'Xưởng in & Thiết bị'}</Badge>
            <h2 className="text-xl font-bold text-fg tracking-tight">
              {'Quản Trị Mạng Lưới Xưởng In & Đội Máy'}
            </h2>
          </div>
          <div className="mt-1">
            <InfoTip label="Mục này quản trị những gì?">
              Điều phối xưởng in 3 miền Bắc - Trung - Nam, thanh tra hiệu suất máy in real-time và kiểm soát tồn kho nhựa.
            </InfoTip>
          </div>
        </div>

        {/* Tab Navigation Buttons */}
        <div className="inline-flex flex-wrap items-center gap-1 rounded-md border border-line bg-surface-muted p-1">
          <button
            onClick={() => setActiveTab('workshops')}
            className={`flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
              activeTab === 'workshops'
                ? 'bg-surface text-fg font-semibold shadow-e1'
                : 'text-fg-muted hover:text-fg'
            }`}
          >
            <Icon name="home_work" size={18} />
            Danh Sách Xưởng
          </button>
          <button
            onClick={() => setActiveTab('fleet')}
            className={`flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
              activeTab === 'fleet'
                ? 'bg-surface text-fg font-semibold shadow-e1'
                : 'text-fg-muted hover:text-fg'
            }`}
          >
            <Icon name="precision_manufacturing" size={18} />
            Đội Máy
          </button>
          <button
            onClick={() => setActiveTab('materials')}
            className={`flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
              activeTab === 'materials'
                ? 'bg-surface text-fg font-semibold shadow-e1'
                : 'text-fg-muted hover:text-fg'
            }`}
          >
            <Icon name="inventory_2" size={18} />
            Tồn Kho Nhựa
            {stats.lowStockMaterialsCount > 0 && (
              <Badge variant="danger" size="sm">
                {stats.lowStockMaterialsCount}
              </Badge>
            )}
          </button>
          <button
            onClick={() => setActiveTab('partners')}
            className={`flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
              activeTab === 'partners'
                ? 'bg-surface text-fg font-semibold shadow-e1'
                : 'text-fg-muted hover:text-fg'
            }`}
          >
            <Icon name="handshake" size={18} />
            Đối Tác (DB)
            {partners.length > 0 && (
              <Badge variant="technical" size="sm">
                {partners.length}
              </Badge>
            )}
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-surface p-4 rounded-lg border border-line-subtle">
          <div className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Tổng Xưởng</div>
          <div className="text-2xl font-bold tabular-nums text-fg mt-1">
            {workshopsError ? '—' : workshopsLoading ? '…' : stats.totalWorkshops}
          </div>
          <div className="text-xs text-positive font-medium mt-0.5">
            {workshopsError
              ? 'Lỗi đọc workshop_profiles'
              : `${stats.verifiedCount} ${'Đã duyệt'}`}
          </div>
        </div>

        <div className="bg-surface p-4 rounded-lg border border-line-subtle">
          <div className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Chờ Duyệt</div>
          <div className="text-2xl font-bold tabular-nums text-fg mt-1">{workshopsError ? '—' : stats.pendingCount}</div>
          <div className="text-xs text-warning font-medium mt-0.5">
            {workshopsError
              ? 'Xem lỗi ở tab Danh Sách Xưởng'
              : 'Cần phê duyệt'}
          </div>
        </div>

        <div className="bg-surface p-4 rounded-lg border border-line-subtle">
          <div className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Tổng Máy In</div>
          <div className="text-2xl font-bold tabular-nums text-fg mt-1">
            {fleetError ? '—' : fleetPrinters === null ? '…' : fleetCounts.total}
          </div>
          <div className="text-xs text-fg-subtle font-medium mt-0.5">
            {fleetError
              ? 'Lỗi đọc printer_fleet'
              : 'Bảng printer_fleet'}
          </div>
        </div>

        <div className="bg-surface p-4 rounded-lg border border-line-subtle">
          <div className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Máy Rảnh</div>
          <div className="text-2xl font-bold tabular-nums text-fg mt-1">
            {fleetError ? '—' : fleetPrinters === null ? '…' : fleetCounts.free}
          </div>
          <div className="text-xs text-positive font-medium mt-0.5">Sẵn sàng nhận lệnh</div>
        </div>

        <div className="bg-surface p-4 rounded-lg border border-line-subtle">
          <div className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Đang In</div>
          <div className="text-2xl font-bold tabular-nums text-fg mt-1">
            {fleetError ? '—' : fleetPrinters === null ? '…' : fleetCounts.busy}
          </div>
          <div className="text-xs text-info font-medium mt-0.5">
            {fleetError || fleetPrinters === null || fleetCounts.total === 0
              ? '—'
              : `${Math.round((fleetCounts.busy / fleetCounts.total) * 100)}% ${'công suất'}`}
          </div>
        </div>

        {/* Tab Tồn Kho Nhựa CHƯA nối nguồn DB (`workshop_materials` bị RLS theo xưởng, và
            bảng danh mục `materials` không có cột tồn kho theo xưởng) ⇒ KHÔNG hiện "0 / Đủ tồn kho"
            như một khẳng định thật. */}
        <div className="p-4 rounded-lg border border-line-subtle bg-surface">
          <div className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
            Cảnh Báo Nhựa
          </div>
          <div className="text-2xl font-bold tabular-nums text-fg mt-1">—</div>
          <div className="text-xs font-medium mt-0.5 text-fg-subtle">
            Chưa nối nguồn tồn kho
          </div>
        </div>
      </div>

      {/* TAB 1: DANH SÁCH XƯỞNG */}
      {activeTab === 'workshops' && (
        <div className="space-y-4">
          {/* Controls bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-surface p-4 rounded-lg border border-line">
            <div className="flex flex-wrap items-center gap-2">
              {/* Region Filter */}
              <div className="inline-flex flex-wrap items-center gap-1 bg-surface-muted border border-line p-1 rounded-md text-sm">
                <span className="text-fg-subtle px-1 text-xs uppercase tracking-wider">Khu vực:</span>
                {(['all', 'Bắc', 'Trung', 'Nam'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setFilterRegion(r)}
                    className={`px-3 py-1.5 rounded-sm transition-colors cursor-pointer ${
                      filters.region === r
                        ? 'bg-surface text-fg font-semibold shadow-e1'
                        : 'text-fg-muted hover:text-fg'
                    }`}
                  >
                    {r === 'all' ? ('Tất cả') : r}
                  </button>
                ))}
              </div>

              {/* Status Filter */}
              <div className="inline-flex flex-wrap items-center gap-1 bg-surface-muted border border-line p-1 rounded-md text-sm">
                <span className="text-fg-subtle px-1 text-xs uppercase tracking-wider">Trạng thái:</span>
                {(['all', 'Verified', 'Pending', 'Suspended'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(s)}
                    className={`px-3 py-1.5 rounded-sm transition-colors cursor-pointer ${
                      filters.status === s
                        ? 'bg-surface text-fg font-semibold shadow-e1'
                        : 'text-fg-muted hover:text-fg'
                    }`}
                  >
                    {s === 'all' ? ('Tất cả') : s}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <Icon name="search" size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-subtle pointer-events-none" />
                <Input
                  type="text"
                  aria-label="Tìm tên xưởng, địa chỉ, sđt"
                  placeholder="Tìm tên xưởng, địa chỉ, sđt..."
                  value={filters.searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>

              <Button
                variant="primary"
                size="sm"
                leadingIcon={<Icon name="add_circle" size={16} />}
                onClick={() => setIsAddWorkshopModalOpen(true)}
                className="shrink-0"
              >
                Thêm Xưởng In
              </Button>
            </div>
          </div>

          {/* Workshop Cards Grid */}
          {/* Đang tải danh sách xưởng từ DB */}
          {workshopsLoading && workshops.length === 0 && workshopsError === null && (
            <div
              role="status"
              aria-label="Đang tải danh sách xưởng từ workshop_profiles..."
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {[0, 1].map((i) => (
                <Skeleton key={i} variant="rect" height="10rem" rounded="lg" />
              ))}
            </div>
          )}

          {/* LỖI THẬT */}
          {workshopsError !== null && (
            <div role="alert" className="p-4 bg-danger-tint border border-danger/20 rounded-lg flex items-start gap-3">
              <Icon name="error" size={24} className="text-danger mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-danger text-sm">
                  Không đọc được bảng workshop_profiles
                </h4>
                <p className="text-xs text-danger mt-1 font-mono break-all">{workshopsError}</p>
                <Button variant="secondary" size="sm" className="mt-2" onClick={() => void loadWorkshops()}>
                  Thử lại
                </Button>
              </div>
            </div>
          )}

          {/* RỖNG THẬT / không khớp bộ lọc */}
          {workshopsError === null && !workshopsLoading && filteredWorkshops.length === 0 && (
            <EmptyState
              size="sm"
              title="Chưa có xưởng in nào"
              description={
                workshops.length === 0
                  ? 'Bảng workshop_profiles chưa có bản ghi nào.'
                  : 'Không có bản ghi xưởng in nào khớp bộ lọc khu vực/trạng thái hiện tại.'
              }
              icon={<Icon name="factory" size={20} className="text-primary" />}
              action={
                <Button
                  variant="primary"
                  size="sm"
                  leadingIcon={<Icon name="add_circle" size={18} />}
                  onClick={() => setIsAddWorkshopModalOpen(true)}
                >
                  Thêm Xưởng In
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
                  className="bg-surface rounded-lg border border-line hover:shadow-e1 transition-all duration-300 flex flex-col justify-between overflow-hidden"
                >
                  <div className="p-6 border-b border-line-subtle">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-sm border border-line text-xs font-semibold uppercase ${
                              w.region === 'Bắc'
                                ? 'bg-info-tint text-info'
                                : w.region === 'Trung'
                                ? 'bg-warning-tint text-warning'
                                : 'bg-positive-tint text-positive'
                            }`}
                          >
                            Miền {w.region}
                          </span>
                          <Badge
                            variant={
                              w.verifiedStatus === 'Verified'
                                ? 'success'
                                : w.verifiedStatus === 'Pending'
                                ? 'warning'
                                : 'danger'
                            }
                            dot
                          >
                            {w.verifiedStatus === 'Verified'
                              ? '● ' + ('Đã duyệt')
                              : w.verifiedStatus === 'Pending'
                              ? '⏳ ' + ('Chờ duyệt')
                              : '✕ ' + ('Đình chỉ')}
                          </Badge>
                        </div>
                        <h3 className="font-bold text-fg text-base mt-2 line-clamp-1">{w.workshopName}</h3>
                        <p className="text-xs text-fg-subtle mt-0.5 flex items-center gap-1 line-clamp-1">
                          <Icon name="pin_drop" size={14} />
                          {w.address}
                        </p>
                      </div>
                    </div>

                    {/* Machine summary mini badges */}
                    <div className="grid grid-cols-3 gap-2 mt-4 p-3 bg-surface-muted rounded-md text-center">
                      <div>
                        <div className="text-xs text-fg-subtle font-semibold uppercase">Tổng máy</div>
                        <div className="text-base font-bold tabular-nums text-fg">{numOrEmpty(w.totalMachines)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-fg-subtle font-semibold uppercase">Rảnh</div>
                        <div className="text-base font-bold tabular-nums text-fg">—</div>
                      </div>
                      <div>
                        <div className="text-xs text-fg-subtle font-semibold uppercase">Đang In</div>
                        <div className="text-base font-bold tabular-nums text-fg">{numOrEmpty(w.activeMachinesNow)}</div>
                      </div>
                    </div>

                    {/* Rates & Contact */}
                    <div className="mt-3 space-y-1 text-xs text-fg-muted">
                      <div className="flex justify-between">
                        <span className="text-fg-subtle">Đơn giá điện:</span>
                        <span className="font-semibold text-fg-muted">{vndOrEmpty(w.electricityRateOverride)}/kWh</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-fg-subtle">Nhân công vận hành:</span>
                        <span className="font-semibold text-fg-muted">{vndOrEmpty(w.laborRateOverride)}/h</span>
                      </div>
                      {w.contactPhone && (
                        <div className="flex justify-between pt-1 border-t border-line-subtle">
                          <span className="text-fg-subtle">Đường dây nóng:</span>
                          <span className="font-mono text-fg-muted">{w.contactPhone}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="p-4 bg-surface-muted/60 flex items-center justify-between gap-2">
                    {w.verifiedStatus === 'Pending' ? (
                      <Button
                        variant="primary"
                        size="sm"
                        fullWidth
                        leadingIcon={<Icon name="check_circle" size={16} />}
                        onClick={() => handleApprove(w.id, w.workshopName)}
                      >
                        Phê Duyệt Xưởng Này
                      </Button>
                    ) : w.verifiedStatus === 'Verified' ? (
                      <div className="flex items-center gap-2 w-full">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="flex-1"
                          leadingIcon={<Icon name="view_timeline" size={16} />}
                          onClick={() => setActiveTab('fleet')}
                        >
                          Xem Đội Máy
                        </Button>
                        <Button
                          variant="danger-ghost"
                          size="sm"
                          onClick={() => handleSuspend(w.id, w.workshopName)}
                          title="Đình chỉ xưởng"
                        >
                          Đình Chỉ
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        fullWidth
                        leadingIcon={<Icon name="replay" size={16} />}
                        onClick={() => void handleSetWorkshopStatus(w.id, 'Verified', w.workshopName)}
                      >
                        Khôi Phục Hoạt Động
                      </Button>
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
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface p-4 rounded-lg border border-line">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex flex-wrap items-center gap-1 bg-surface-muted border border-line p-1 rounded-md text-sm">
                <span className="text-fg-subtle px-1 text-xs uppercase tracking-wider">Trạng thái máy:</span>
                {(['all', 'Free', 'Busy', 'Maintenance'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setFleetStatusFilter(s)}
                    className={`px-3 py-1.5 rounded-sm transition-colors cursor-pointer ${
                      fleetStatusFilter === s
                        ? 'bg-surface text-fg font-semibold shadow-e1'
                        : 'text-fg-muted hover:text-fg'
                    }`}
                  >
                    {s === 'all'
                      ? ('Tất cả')
                      : s === 'Free'
                      ? ('Rảnh')
                      : s === 'Busy'
                      ? ('Đang In')
                      : ('Bảo Trì')}
                  </button>
                ))}
              </div>

              <span className="text-xs text-fg-subtle">
                Nguồn: bảng printer_fleet (đội máy toàn hệ thống)
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="secondary"
                size="sm"
                leadingIcon={<Icon name="sync" size={16} className={isFleetLoading ? 'animate-spin motion-reduce:animate-none' : ''} />}
                onClick={() => void loadFleet()}
                disabled={isFleetLoading}
              >
                Tải Lại
              </Button>

              <Button
                variant="primary"
                size="sm"
                leadingIcon={<Icon name="add" size={16} />}
                onClick={() => setIsAddMachineModalOpen(true)}
              >
                Biên Chế Máy Mới
              </Button>
            </div>
          </div>

          {/* Đang tải */}
          {isFleetLoading && fleetPrinters === null && (
            <div className="bg-surface p-6 rounded-lg border border-line-subtle text-center text-sm text-fg-muted">
              Đang tải đội máy in từ bảng printer_fleet...
            </div>
          )}

          {/* LỖI THẬT — không rơi về 0, không rơi về fixture */}
          {!isFleetLoading && fleetError !== null && (
            <div role="alert" className="p-4 bg-danger-tint border border-danger/20 rounded-lg flex items-start gap-3">
              <Icon name="error" size={24} className="text-danger mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-danger text-sm">
                  Không đọc được đội máy in từ bảng printer_fleet
                </h4>
                <p className="text-xs text-danger mt-1 font-mono break-all">{fleetError}</p>
                <Button variant="secondary" size="sm" className="mt-2" onClick={() => void loadFleet()}>
                  Thử lại
                </Button>
              </div>
            </div>
          )}

          {/* RỖNG THẬT / không khớp bộ lọc */}
          {!isFleetLoading && fleetError === null && fleetPrinters !== null && filteredPrinters.length === 0 && (
            <EmptyState
              size="sm"
              title="Chưa có máy in nào"
              description={
                fleetStatusFilter !== 'all'
                  ? 'Không có máy in nào khớp bộ lọc trạng thái hiện tại.'
                  : 'Bảng printer_fleet chưa có bản ghi nào.'
              }
              icon={<Icon name="print" size={20} className="text-primary" />}
              action={
                <Button
                  variant="primary"
                  size="sm"
                  leadingIcon={<Icon name="add" size={18} />}
                  onClick={() => setIsAddMachineModalOpen(true)}
                >
                  Biên Chế Máy Mới
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
                  ? 'Đang In'
                  : p.status === 'Maintenance'
                  ? 'Bảo Trì'
                  : 'Rảnh';
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
                  className="bg-surface rounded-lg border border-line p-6 hover:shadow-e1 transition-all duration-300"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-sm border border-line text-xs font-medium uppercase tracking-wider bg-surface-muted text-fg-muted">
                          {p.technology}
                        </span>
                        <Badge
                          variant={p.status === 'Idle' ? 'success' : p.status === 'Printing' ? 'info' : 'warning'}
                          dot
                        >
                          {statusLabel}
                        </Badge>
                      </div>
                      <h4 className="font-bold text-fg text-base mt-2">{p.name}</h4>
                      <p className="text-xs text-fg-subtle mt-0.5 flex items-center gap-1">
                        <Icon name="precision_manufacturing" size={13} />
                        {p.brand || '—'}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-mono text-fg-subtle block">Khổ in (mm)</span>
                      <span className="text-xs font-mono font-bold text-fg-muted">{volumeText ?? '—'}</span>
                    </div>
                  </div>

                  {/* Hourly Cost Breakdown Card */}
                  <div className="mt-4 p-3 bg-surface-muted rounded-md border border-line-subtle space-y-2">
                    <div className="text-xs font-semibold uppercase text-fg-muted tracking-wider flex items-center justify-between">
                      <span>Định Mức Chi Phí Vận Hành</span>
                      <span className="font-mono font-bold tabular-nums text-fg">
                        {totalHourlyCost != null ? `${formatVnd(totalHourlyCost)}/h` : '—'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-line-subtle text-xs">
                      <div>
                        <div className="text-xs text-fg-subtle font-medium">
                          Khấu hao máy/giờ:
                        </div>
                        <div className="font-bold text-fg font-mono tabular-nums">
                          {depPerHour != null ? `${formatVnd(depPerHour)}/h` : '—'}
                        </div>
                        <div className="text-xs text-fg-subtle">
                          {m.purchasePrice != null && m.lifetimeHours
                            ? `(${formatVnd(m.purchasePrice)} / ${m.lifetimeHours}h)`
                            : '(chưa khai giá mua / tuổi thọ)'}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-fg-subtle font-medium">
                          Tiền điện máy/giờ:
                        </div>
                        <div className="font-bold text-fg font-mono tabular-nums">
                          {elecPerHour != null ? `${formatVnd(elecPerHour)}/h` : '—'}
                        </div>
                        <div className="text-xs text-fg-subtle">
                          {m.avgPowerKW != null && electricityRateVnd != null
                            ? `(${m.avgPowerKW} kW × ${formatVnd(electricityRateVnd)})`
                            : electricityRateVnd == null
                            ? '(chưa cấu hình giá điện trong pricing_global_settings)'
                            : '(chưa khai công suất)'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Machine Action Bar — ghi thẳng xuống printer_fleet */}
                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-line-subtle text-xs">
                    <span className="text-fg-subtle font-mono">ID: {p.id}</span>

                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          void handleSetPrinterStatus(p, p.status === 'Printing' ? 'Idle' : 'Printing')
                        }
                      >
                        {p.status === 'Printing'
                          ? 'Đặt Rảnh (Idle)'
                          : 'Đặt Bận (Printing)'}
                      </Button>
                      <Button
                        iconOnly
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          void handleSetPrinterStatus(p, p.status === 'Maintenance' ? 'Idle' : 'Maintenance')
                        }
                        title="Chuyển sang bảo trì"
                        aria-label="Chuyển sang bảo trì"
                      >
                        <Icon name="build" size={14} />
                      </Button>
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
            <div className="p-4 bg-danger-tint border border-danger/20 rounded-lg flex items-start gap-3">
              <Icon name="warning" size={28} className="text-danger mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-danger text-sm">
                  {`Cảnh Báo: Có ${lowStockList.length} cuộn/loại vật liệu đang dưới ngưỡng an toàn!`}
                </h4>
                <p className="text-xs text-danger mt-1">
                  Cần nhập bổ sung ngay để không gián đoạn các đơn hàng in 3D đang dispatch tới xưởng.
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {lowStockList.map((m) => (
                    <span
                      key={m.id}
                      className="px-2 py-0.5 bg-surface border border-danger/20 text-danger text-xs font-medium rounded-md"
                    >
                      {m.materialName}: {m.currentStockGrams}g / {m.lowStockThresholdGrams}g
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Material inventory table controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-4 rounded-lg border border-line">
            <div className="text-xs text-fg-subtle font-medium">
              Danh sách tồn kho CHƯA nối nguồn DB: `workshop_materials` bị RLS giới hạn theo xưởng và bảng danh mục `materials` không có cột tồn kho theo xưởng — nên bảng dưới đây không phải số liệu thật.
            </div>

            <Button
              variant="primary"
              size="sm"
              leadingIcon={<Icon name="add" size={16} />}
              onClick={() => setIsAddMaterialModalOpen(true)}
              className="shrink-0"
            >
              Thêm Cuộn Nhựa / Resin
            </Button>
          </div>

          {/* Materials Table */}
          <div className="bg-surface rounded-lg border border-line overflow-hidden">
            {materials.length === 0 ? (
            <EmptyState
              size="sm"
              title="Chưa nối nguồn tồn kho"
              description={
                'Đây KHÔNG phải "kho rỗng": màn này chưa có hàm service nào đọc tồn kho theo xưởng, nên không hiển thị số liệu thay thế.'
              }
              icon={<Icon name="layers" size={20} className="text-primary" />}
              action={
                <Button
                  variant="primary"
                  size="sm"
                  leadingIcon={<Icon name="add" size={18} />}
                  onClick={() => setIsAddMaterialModalOpen(true)}
                >
                  Thêm Cuộn Nhựa / Resin
                </Button>
              }
            />
            ) : (
            <DataTable<WorkshopMaterial>
              columns={materialColumns}
              rows={materials}
              getRowId={(row) => row.id}
              caption="Tồn kho vật liệu theo xưởng"
              tableLabel="Tồn kho vật liệu theo xưởng"
              defaultSort={[{ key: 'materialName', direction: 'asc' }]}
            />
            )}
          </div>
        </div>
      )}

      {/* MODAL: THÊM XƯỞNG IN */}
      {isAddWorkshopModalOpen && (
        <Modal
          open
          onClose={() => setIsAddWorkshopModalOpen(false)}
          size="lg"
          title="Thêm Xưởng In Mới Vào Mạng Lưới"
        >
            <form onSubmit={handleCreateWorkshop} className="mt-4 space-y-4">
              <Field label="Tên xưởng in:" optionalLabel={null}>
                {(control) => (
                  <Input
                    {...control}
                    type="text"
                    required
                    placeholder="Ví dụ: Smart 3D FabLab Đà Nẵng"
                    value={newWorkshopForm.workshopName}
                    onChange={(e) => setNewWorkshopForm({ ...newWorkshopForm, workshopName: e.target.value })}
                  />
                )}
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Khu vực (Miền):" optionalLabel={null}>
                  {(control) => (
                    <Select
                      {...control}
                      value={newWorkshopForm.region}
                      onChange={(e) => setNewWorkshopForm({ ...newWorkshopForm, region: e.target.value as any })}
                    >
                      <option value="Bắc">Miền Bắc (Hà Nội, Hải Phòng...)</option>
                      <option value="Trung">Miền Trung (Đà Nẵng, Huế...)</option>
                      <option value="Nam">Miền Nam (TP.HCM, Bình Dương...)</option>
                    </Select>
                  )}
                </Field>
                <Field label="Trạng thái ban đầu:" optionalLabel={null}>
                  {(control) => (
                    <Select
                      {...control}
                      value={newWorkshopForm.verifiedStatus}
                      onChange={(e) => setNewWorkshopForm({ ...newWorkshopForm, verifiedStatus: e.target.value as any })}
                    >
                      <option value="Pending">Chờ duyệt</option>
                      <option value="Verified">Đã duyệt</option>
                    </Select>
                  )}
                </Field>
              </div>

              <Field label="Địa chỉ xưởng:" optionalLabel={null}>
                {(control) => (
                  <Input
                    {...control}
                    type="text"
                    required
                    placeholder="Số nhà, đường, quận/huyện, tỉnh/thành"
                    value={newWorkshopForm.address}
                    onChange={(e) => setNewWorkshopForm({ ...newWorkshopForm, address: e.target.value })}
                  />
                )}
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Số điện thoại:" optionalLabel={null}>
                  {(control) => (
                    <Input
                      {...control}
                      type="text"
                      placeholder="0988 xxx xxx"
                      value={newWorkshopForm.contactPhone}
                      onChange={(e) => setNewWorkshopForm({ ...newWorkshopForm, contactPhone: e.target.value })}
                    />
                  )}
                </Field>
                <Field label="Email liên hệ:" optionalLabel={null}>
                  {(control) => (
                    <Input
                      {...control}
                      type="email"
                      placeholder="workshop@vcube.vn"
                      value={newWorkshopForm.contactEmail}
                      onChange={(e) => setNewWorkshopForm({ ...newWorkshopForm, contactEmail: e.target.value })}
                    />
                  )}
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Giá điện riêng (VNĐ/kWh):" optionalLabel={null}>
                  {(control) => (
                    <Input
                      {...control}
                      type="number"
                      numeric
                      placeholder="Chưa khai ⇒ để trống"
                      value={newWorkshopForm.electricityRateOverride ?? ''}
                      onChange={(e) =>
                        setNewWorkshopForm({
                          ...newWorkshopForm,
                          electricityRateOverride: e.target.value === '' ? null : Number(e.target.value)
                        })
                      }
                    />
                  )}
                </Field>
                <Field label="Công nhân công (VNĐ/giờ):" optionalLabel={null}>
                  {(control) => (
                    <Input
                      {...control}
                      type="number"
                      numeric
                      placeholder="Chưa khai ⇒ để trống"
                      value={newWorkshopForm.laborRateOverride ?? ''}
                      onChange={(e) =>
                        setNewWorkshopForm({
                          ...newWorkshopForm,
                          laborRateOverride: e.target.value === '' ? null : Number(e.target.value)
                        })
                      }
                    />
                  )}
                </Field>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-line-subtle">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsAddWorkshopModalOpen(false)}
                >
                  Hủy Bỏ
                </Button>
                <Button type="submit" variant="primary">
                  {'Lưu & Khởi Tạo Xưởng'}
                </Button>
              </div>
            </form>
        </Modal>
      )}

      {/* MODAL: BIÊN CHẾ MÁY MỚI */}
      {isAddMachineModalOpen && (
        <Modal
          open
          onClose={() => setIsAddMachineModalOpen(false)}
          size="md"
          title="Thêm Máy In Vào printer_fleet"
        >
            <form onSubmit={handleCreateMachine} className="mt-4 space-y-4">
              <Field label="Tên máy in:" optionalLabel={null}>
                {(control) => (
                  <Input
                    {...control}
                    type="text"
                    required
                    placeholder="Ví dụ: Bambu Lab X1-Carbon #05"
                    value={newMachineForm.machineName}
                    onChange={(e) => setNewMachineForm({ ...newMachineForm, machineName: e.target.value })}
                  />
                )}
              </Field>

              <Field label="Hãng / dòng máy:" optionalLabel={null}>
                {(control) => (
                  <Input
                    {...control}
                    type="text"
                    placeholder="Để trống nếu chưa rõ"
                    value={newMachineForm.brand}
                    onChange={(e) => setNewMachineForm({ ...newMachineForm, brand: e.target.value })}
                  />
                )}
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Công nghệ in:" optionalLabel={null}>
                  {(control) => (
                    <Select
                      {...control}
                      value={newMachineForm.machineType}
                      onChange={(e) => setNewMachineForm({ ...newMachineForm, machineType: e.target.value as any })}
                    >
                      <option value="FDM">FDM (Dây nhựa)</option>
                      <option value="SLA">SLA (Resin lỏng)</option>
                      <option value="SLS">SLS (Bột nylon)</option>
                    </Select>
                  )}
                </Field>
                <Field label="Công suất chạy (kW):" optionalLabel={null}>
                  {(control) => (
                    <Input
                      {...control}
                      type="number"
                      step="0.01"
                      numeric
                      placeholder="Chưa đo ⇒ để trống"
                      value={newMachineForm.avgPowerKW ?? ''}
                      onChange={(e) =>
                        setNewMachineForm({
                          ...newMachineForm,
                          avgPowerKW: e.target.value === '' ? null : Number(e.target.value)
                        })
                      }
                    />
                  )}
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Giá mua máy (VNĐ):" optionalLabel={null}>
                  {(control) => (
                    <Input
                      {...control}
                      type="number"
                      numeric
                      placeholder="Chưa có ⇒ để trống"
                      value={newMachineForm.purchasePrice ?? ''}
                      onChange={(e) =>
                        setNewMachineForm({
                          ...newMachineForm,
                          purchasePrice: e.target.value === '' ? null : Number(e.target.value)
                        })
                      }
                    />
                  )}
                </Field>
                <Field label="Tuổi thọ khấu hao (giờ):" optionalLabel={null}>
                  {(control) => (
                    <Input
                      {...control}
                      type="number"
                      numeric
                      placeholder="Chưa có ⇒ để trống"
                      value={newMachineForm.lifetimeHours ?? ''}
                      onChange={(e) =>
                        setNewMachineForm({
                          ...newMachineForm,
                          lifetimeHours: e.target.value === '' ? null : Number(e.target.value)
                        })
                      }
                    />
                  )}
                </Field>
              </div>

              <p className="text-xs text-fg-subtle">
                Bảng printer_fleet không gắn với một xưởng cụ thể, nên không có ô chọn xưởng. Ô số để trống nghĩa là CHƯA ĐO — hệ thống ghi NULL, không điền số mặc định.
              </p>

              <div className="flex justify-end gap-2 pt-4 border-t border-line-subtle">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsAddMachineModalOpen(false)}
                >
                  Đóng
                </Button>
                <Button type="submit" variant="primary">
                  Ghi Vào DB
                </Button>
              </div>
            </form>
        </Modal>
      )}

      {/* MODAL: THÊM VẬT LIỆU */}
      {isAddMaterialModalOpen && (
        <Modal
          open
          onClose={() => setIsAddMaterialModalOpen(false)}
          size="md"
          title="Thêm Cuộn Nhựa / Vật Liệu Mới"
        >
            <form onSubmit={handleCreateMaterial} className="mt-4 space-y-4">
              <Field label="Xưởng lưu kho:" optionalLabel={null}>
                {(control) => (
                  <Select
                    {...control}
                    value={newMaterialForm.workshopId}
                    onChange={(e) => setNewMaterialForm({ ...newMaterialForm, workshopId: e.target.value })}
                  >
                    {workshops.map((w) => (
                      <option key={w.id} value={w.id}>{w.workshopName} ({w.region})</option>
                    ))}
                  </Select>
                )}
              </Field>

              <Field label="Tên vật liệu:" optionalLabel={null}>
                {(control) => (
                  <Input
                    {...control}
                    type="text"
                    required
                    placeholder="Ví dụ: PETG-CF Carbon Fiber Đen"
                    value={newMaterialForm.materialName}
                    onChange={(e) => setNewMaterialForm({ ...newMaterialForm, materialName: e.target.value })}
                  />
                )}
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Họ nhựa:" optionalLabel={null}>
                  {(control) => (
                    <Select
                      {...control}
                      value={newMaterialForm.materialType}
                      onChange={(e) => setNewMaterialForm({ ...newMaterialForm, materialType: e.target.value as any })}
                    >
                      <option value="PLA">PLA</option>
                      <option value="PETG">PETG</option>
                      <option value="ABS">ABS</option>
                      <option value="TPU">TPU</option>
                      <option value="PA">PA (Nylon)</option>
                      <option value="Resin">Resin</option>
                    </Select>
                  )}
                </Field>
                <Field label="Đơn giá/kg (VNĐ):" optionalLabel={null}>
                  {(control) => (
                    <Input
                      {...control}
                      type="number"
                      numeric
                      value={newMaterialForm.pricePerKg}
                      onChange={(e) => setNewMaterialForm({ ...newMaterialForm, pricePerKg: Number(e.target.value) })}
                    />
                  )}
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Tồn kho ban đầu (grams):" optionalLabel={null}>
                  {(control) => (
                    <Input
                      {...control}
                      type="number"
                      numeric
                      value={newMaterialForm.currentStockGrams}
                      onChange={(e) => setNewMaterialForm({ ...newMaterialForm, currentStockGrams: Number(e.target.value) })}
                    />
                  )}
                </Field>
                <Field label="Ngưỡng cảnh báo (grams):" optionalLabel={null}>
                  {(control) => (
                    <Input
                      {...control}
                      type="number"
                      numeric
                      value={newMaterialForm.lowStockThresholdGrams}
                      onChange={(e) => setNewMaterialForm({ ...newMaterialForm, lowStockThresholdGrams: Number(e.target.value) })}
                    />
                  )}
                </Field>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-line-subtle">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsAddMaterialModalOpen(false)}
                >
                  Đóng
                </Button>
                <Button type="submit" variant="primary">
                  Lưu Cuộn Nhựa
                </Button>
              </div>
            </form>
        </Modal>
      )}

      {/* TAB 4: ĐỐI TÁC XƯỞNG LƯU TRONG SUPABASE (`workshop_partners`) */}
      {activeTab === 'partners' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-4 rounded-lg border border-line">
            <div className="text-xs text-fg-subtle font-medium">
              {`Đối tác xưởng đọc/ghi trực tiếp bảng workshop_partners trên Supabase: ${partners.length} bản ghi.`}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="secondary"
                size="sm"
                leadingIcon={<Icon name="sync" size={16} className={isPartnersLoading ? 'animate-spin motion-reduce:animate-none' : ''} />}
                onClick={() => void loadPartners()}
                disabled={isPartnersLoading}
              >
                Tải Lại
              </Button>

              <Button
                variant="primary"
                size="sm"
                leadingIcon={<Icon name="add_business" size={16} />}
                onClick={() => setPartnerDraft(emptyPartnerDraft())}
              >
                Thêm Đối Tác
              </Button>
            </div>
          </div>

          <div className="bg-surface rounded-lg border border-line overflow-hidden">
            {!isPartnersLoading && partners.length === 0 ? (
            <EmptyState
              size="sm"
              title="Chưa có đối tác xưởng nào"
              description="Bảng workshop_partners chưa có bản ghi nào để hiển thị."
              icon={<Icon name="handshake" size={20} className="text-primary" />}
              action={
                <Button
                  variant="primary"
                  size="sm"
                  leadingIcon={<Icon name="add_business" size={18} />}
                  onClick={() => setPartnerDraft(emptyPartnerDraft())}
                >
                  Thêm Đối Tác
                </Button>
              }
            />
            ) : (
            <DataTable<WorkshopPartner>
              columns={partnerColumns}
              rows={partners}
              getRowId={(row) => row.id}
              loading={isPartnersLoading && partners.length === 0}
              caption="Đối tác xưởng in"
              tableLabel="Đối tác xưởng in"
              defaultSort={[{ key: 'name', direction: 'asc' }]}
              emptyState={
                <EmptyState
                  live
                  title="Chưa có đối tác xưởng nào"
                  description="Thêm đối tác xưởng để bắt đầu điều phối đơn."
                />
              }
            />
            )}
          </div>

          {/* MODAL: THÊM / SỬA ĐỐI TÁC (ghi thẳng vào Supabase) */}
          {partnerDraft && (
            <Modal
              open
              onClose={() => setPartnerDraft(null)}
              size="lg"
              title={
                partners.some((p) => p.id === partnerDraft.id)
                  ? `Cấu hình đối tác: ${partnerDraft.name}`
                  : 'Thêm đối tác xưởng mới'
              }
            >
                <form onSubmit={handleSubmitPartner} className="mt-4 space-y-4">
                  <Field label="Tên xưởng / trạm MES *" optionalLabel={null}>
                    {(control) => (
                      <Input
                        {...control}
                        type="text"
                        required
                        value={partnerDraft.name}
                        onChange={(e) => setPartnerDraft({ ...partnerDraft, name: e.target.value })}
                      />
                    )}
                  </Field>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Vùng:" optionalLabel={null}>
                      {(control) => (
                        <Select
                          {...control}
                          value={partnerDraft.region}
                          onChange={(e) =>
                            setPartnerDraft({ ...partnerDraft, region: e.target.value as WorkshopPartner['region'] })
                          }
                        >
                          <option value="hanoi">Miền Bắc (Hà Nội)</option>
                          <option value="danang">Miền Trung (Đà Nẵng)</option>
                          <option value="hcm">Miền Nam (TP.HCM)</option>
                        </Select>
                      )}
                    </Field>
                    <Field label="Trạng thái:" optionalLabel={null}>
                      {(control) => (
                        <Select
                          {...control}
                          value={partnerDraft.status}
                          onChange={(e) =>
                            setPartnerDraft({ ...partnerDraft, status: e.target.value as WorkshopPartner['status'] })
                          }
                        >
                          <option value="active">Sẵn sàng</option>
                          <option value="busy">Đang bận</option>
                          <option value="offline">Ngoại tuyến</option>
                        </Select>
                      )}
                    </Field>
                  </div>

                  <Field label="Địa chỉ *" optionalLabel={null}>
                    {(control) => (
                      <Input
                        {...control}
                        type="text"
                        required
                        value={partnerDraft.address}
                        onChange={(e) => setPartnerDraft({ ...partnerDraft, address: e.target.value })}
                      />
                    )}
                  </Field>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Người phụ trách:" optionalLabel={null}>
                      {(control) => (
                        <Input
                          {...control}
                          type="text"
                          value={partnerDraft.contactPerson}
                          onChange={(e) => setPartnerDraft({ ...partnerDraft, contactPerson: e.target.value })}
                        />
                      )}
                    </Field>
                    <Field label="Đường dây nóng:" optionalLabel={null}>
                      {(control) => (
                        <Input
                          {...control}
                          type="text"
                          value={partnerDraft.phone}
                          onChange={(e) => setPartnerDraft({ ...partnerDraft, phone: e.target.value })}
                        />
                      )}
                    </Field>
                  </div>

                  <Field label="Email:" optionalLabel={null}>
                    {(control) => (
                      <Input
                        {...control}
                        type="email"
                        value={partnerDraft.email}
                        onChange={(e) => setPartnerDraft({ ...partnerDraft, email: e.target.value })}
                      />
                    )}
                  </Field>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Field label="Máy đang chạy:" optionalLabel={null}>
                      {(control) => (
                        <Input
                          {...control}
                          type="number"
                          numeric
                          min="0"
                          value={partnerDraft.activePrintersCount}
                          onChange={(e) =>
                            setPartnerDraft({ ...partnerDraft, activePrintersCount: Number(e.target.value) })
                          }
                        />
                      )}
                    </Field>
                    <Field label="Máy rảnh:" optionalLabel={null}>
                      {(control) => (
                        <Input
                          {...control}
                          type="number"
                          numeric
                          min="0"
                          value={partnerDraft.availablePrintersCount}
                          onChange={(e) =>
                            setPartnerDraft({ ...partnerDraft, availablePrintersCount: Number(e.target.value) })
                          }
                        />
                      )}
                    </Field>
                    <Field label="Điểm SLA:" optionalLabel={null}>
                      {(control) => (
                        <Input
                          {...control}
                          type="number"
                          numeric
                          step="0.1"
                          min="0"
                          max="5"
                          value={partnerDraft.slaRating}
                          onChange={(e) => setPartnerDraft({ ...partnerDraft, slaRating: Number(e.target.value) })}
                        />
                      )}
                    </Field>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-fg mb-1.5">
                      Công nghệ hỗ trợ:
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
                            className="size-4 rounded-sm border-line-control accent-primary"
                          />
                          <span>{tech}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t border-line-subtle">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setPartnerDraft(null)}
                    >
                      Hủy Bỏ
                    </Button>
                    <Button type="submit" variant="primary">
                      Lưu Vào Supabase
                    </Button>
                  </div>
                </form>
            </Modal>
          )}
        </div>
      )}

    </div>
  );
};
export default Group1WorkshopsPanel;
