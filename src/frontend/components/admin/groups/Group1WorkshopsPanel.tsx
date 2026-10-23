import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useWorkshopAdminStore } from '@frontend/stores/useWorkshopAdminStore';
import { dbService } from '../../../../backend/supabase/database';
import { WorkshopProfile, WorkshopMachine, WorkshopMaterial, WorkshopPartner, PrinterProfile } from '../../../../types';
import { getPricingGlobalSettings } from '../../../../backend/services/settingsService';
import { Badge, Button } from '@frontend/ui';
import type { DataTableColumn } from '@frontend/ui';
import { Group1Header } from './group1/Group1Header';
import { Group1Kpi } from './group1/Group1Kpi';
import { WorkshopsTab } from './group1/WorkshopsTab';
import { FleetTab } from './group1/FleetTab';
import { MaterialsTab } from './group1/MaterialsTab';
import { PartnersTab } from './group1/PartnersTab';
import { AddMaterialModal, AddMachineModal, AddWorkshopModal } from './group1/Group1Modals';
import { printerStatusToMachineStatus } from './group1/group1Shared';
import type {
  AddMachineModalProps,
  AddMaterialModalProps,
  AddWorkshopModalProps,
  FleetTabProps,
  Group1HeaderProps,
  Group1KpiProps,
  MaterialsTabProps,
  PartnersTabProps,
  WorkshopsTabProps,
} from './group1/types';

export interface Group1WorkshopsPanelProps {
  printers?: any[];
  onUpdatePrinters?: (printers: any[]) => void;
  onShowToast?: (message: string) => void;
  onNavigateSection?: (section: any) => void;
  /** Section đang mở từ URL — quyết định tab mặc định (machines ⇒ Đội máy, partners ⇒ Đối tác). */
  section?: string;
}

export const Group1WorkshopsPanel: React.FC<Group1WorkshopsPanelProps> = ({
  // `printers` (prop) KHÔNG được đọc — xem khối "ĐỘI MÁY IN" bên dưới: App khởi tạo prop đó
  // bằng fixture/localStorage nên nó không phân biệt được "bảng rỗng" với "truy vấn lỗi".
  // `onUpdatePrinters` thì CÓ dùng: đồng bộ state của App sau mỗi lần GHI DB thành công.
  onUpdatePrinters,
  onShowToast,
  section
}) => {
  /**
   * Hai callback từ props được giữ trong ref: chỉ dùng để ĐỒNG BỘ/ BÁO LỖI, KHÔNG phải dữ liệu
   * để fetch. Nhờ vậy `fetchFleetRows`/`loadPartners` giữ identity ổn định (`useCallback([])`)
   * và effect chỉ chạy khi mount — trước đây chúng nằm trong dep nên mỗi lần App re-render
   * (identity handler mới) lại tạo vòng fetch mới ⇒ UI nhảy liên tục.
   */
  const onUpdatePrintersRef = useRef(onUpdatePrinters);
  const onShowToastRef = useRef(onShowToast);
  useEffect(() => { onUpdatePrintersRef.current = onUpdatePrinters; }, [onUpdatePrinters]);
  useEffect(() => { onShowToastRef.current = onShowToast; }, [onShowToast]);

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
  //   App khởi tạo prop đó bằng `[]` (Phase 3: đã bỏ hẳn cache localStorage cho danh sách máy)
  //   và CHỈ ghi đè khi mảng remote KHÁC RỖNG ⇒ prop không phân biệt được "bảng rỗng" với
  //   "truy vấn lỗi" (đúng thứ màn này phải nói thật). `dbService.getPrinters()` ném lỗi
  //   thật nên mới dựng được 3 trạng thái loading / rỗng / lỗi. Sau mỗi lần GHI ta vẫn gọi
  //   `onUpdatePrinters` (qua ref) để state App khớp DB — nhưng KHÔNG gọi ở lần load đầu.
  // ==========================================================================
  const [fleetPrinters, setFleetPrinters] = useState<PrinterProfile[] | null>(null);
  const [isFleetLoading, setIsFleetLoading] = useState(false);
  const [fleetError, setFleetError] = useState<string | null>(null);
  /** `null` = CHƯA cấu hình giá điện trong `pricing_global_settings` (KHÔNG rơi về 2.850đ). */
  const [electricityRateVnd, setElectricityRateVnd] = useState<number | null>(null);

  /**
   * Đọc `printer_fleet` và trả về các dòng vừa đọc (hoặc `null` khi lỗi).
   * Identity ỔN ĐỊNH: KHÔNG phụ thuộc prop callback — nhờ vậy effect bên dưới chạy 1 lần.
   */
  const fetchFleetRows = useCallback(async (): Promise<PrinterProfile[] | null> => {
    setIsFleetLoading(true);
    setFleetError(null);
    try {
      const rows = await dbService.getPrinters();
      setFleetPrinters(rows);
      return rows;
    } catch (err: any) {
      // Lỗi thật ⇒ KHÔNG hiện 0 như thể bảng rỗng, KHÔNG rơi về fixture.
      setFleetPrinters(null);
      setFleetError(err?.message || ('lỗi không xác định'));
      return null;
    } finally {
      setIsFleetLoading(false);
    }
  }, []);

  const loadFleet = useCallback(async (): Promise<void> => {
    await fetchFleetRows();
  }, [fetchFleetRows]);

  useEffect(() => {
    void loadFleet();
    // Danh sách xưởng: đọc bảng thật `workshop_profiles` (không còn mảng RAM trong store).
    void loadWorkshops();
    // Giá điện dùng cho quy đổi kW → VNĐ/giờ trong thẻ chi phí. Chưa cấu hình ⇒ `null`.
    void getPricingGlobalSettings()
      .then((res) => setElectricityRateVnd(res?.data?.electricityRateVnd ?? null))
      .catch(() => setElectricityRateVnd(null));
    // `loadWorkshops` là action Zustand (identity ổn định); effect chỉ chạy khi mount.
  }, [loadFleet, loadWorkshops]);

  /** Ghi 1 máy in xuống `printer_fleet`; chỉ báo thành công khi DB xác nhận. */
  const persistPrinter = async (printer: PrinterProfile, successMessage: string) => {
    const result = await dbService.savePrinter(printer);
    if (!result.success) {
      onShowToastRef.current?.(
        `Lưu máy in thất bại: ${result.error || 'lỗi không xác định'}`
      );
      return false;
    }
    // Đọc lại danh sách thật rồi mới đồng bộ state App — KHÔNG đồng bộ ở lần load đầu.
    const rows = await fetchFleetRows();
    if (rows !== null) onUpdatePrintersRef.current?.(rows);
    onShowToastRef.current?.(successMessage);
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
      onShowToastRef.current?.(
        `Không tải được danh sách đối tác: ${err?.message || 'lỗi không xác định'}`
      );
    } finally {
      setIsPartnersLoading(false);
    }
  }, []);

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

  const persistPartner = useCallback(async (partner: WorkshopPartner, successMessage: string) => {
    setPartners((prev) =>
      prev.some((p) => p.id === partner.id)
        ? prev.map((p) => (p.id === partner.id ? partner : p))
        : [partner, ...prev]
    );
    const result = await dbService.saveWorkshopPartner(partner);
    if (result.success) {
      onShowToastRef.current?.(successMessage);
    } else {
      onShowToastRef.current?.(
        `Lưu đối tác thất bại: ${result.error || 'lỗi không xác định'}`
      );
    }
  }, []);

  const handleTogglePartnerStatus = useCallback((partner: WorkshopPartner) => {
    const nextStatus: WorkshopPartner['status'] = partner.status === 'active' ? 'busy' : 'active';
    void persistPartner(
      { ...partner, status: nextStatus },
      `Đã cập nhật trạng thái đối tác ${partner.name}: ${nextStatus}`
    );
  }, [persistPartner]);

  const handleSubmitPartner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerDraft) return;
    if (!partnerDraft.name.trim() || !partnerDraft.address.trim()) {
      onShowToastRef.current?.(
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
      onShowToastRef.current?.(
        `Cập nhật trạng thái xưởng thất bại: ${res.error || 'lỗi không xác định'}`
      );
      return;
    }
    onShowToastRef.current?.(
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
      onShowToastRef.current?.('Vui lòng điền tên xưởng và địa chỉ');
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
      onShowToastRef.current?.(
        `Tạo xưởng thất bại: ${res.error || 'lỗi không xác định'}`
      );
      return; // giữ modal để không mất dữ liệu đã nhập
    }
    setIsAddWorkshopModalOpen(false);
    onShowToastRef.current?.('Đã ghi xưởng in mới vào workshop_profiles!');
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
      onShowToastRef.current?.('Vui lòng nhập tên máy in');
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
      onShowToastRef.current?.('Vui lòng nhập tên vật liệu');
      return;
    }
    addMaterial(newMaterialForm);
    setIsAddMaterialModalOpen(false);
    // ⚠️ NÓI THẬT: chưa có hàm service nào ghi tồn kho theo xưởng, nên bản ghi này CHỈ nằm
    // trong bộ nhớ màn hình và mất khi tải lại — không được báo như đã lưu vào DB.
    onShowToastRef.current?.(
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
  ], [handleTogglePartnerStatus]);

  const group1HeaderProps: Group1HeaderProps = {
    setActiveTab,
    activeTab,
    stats,
    partners,
  };

  const group1KpiProps: Group1KpiProps = {
    workshopsError,
    workshopsLoading,
    stats,
    fleetError,
    fleetPrinters,
    fleetCounts,
  };

  const workshopsTabProps: WorkshopsTabProps = {
    setFilterRegion,
    filters,
    setFilterStatus,
    setSearchQuery,
    setIsAddWorkshopModalOpen,
    workshopsLoading,
    workshops,
    workshopsError,
    loadWorkshops,
    filteredWorkshops,
    numOrEmpty,
    vndOrEmpty,
    handleApprove,
    setActiveTab,
    handleSuspend,
    handleSetWorkshopStatus,
  };

  const fleetTabProps: FleetTabProps = {
    setFleetStatusFilter,
    fleetStatusFilter,
    isFleetLoading,
    loadFleet,
    setIsAddMachineModalOpen,
    fleetPrinters,
    fleetError,
    filteredPrinters,
    getDepreciationPerHour,
    electricityRateVnd,
    getElectricityPerHour,
    formatVnd,
    handleSetPrinterStatus,
  };

  const materialsTabProps: MaterialsTabProps = {
    lowStockList,
    setIsAddMaterialModalOpen,
    materials,
    materialColumns,
  };

  const partnersTabProps: PartnersTabProps = {
    partners,
    isPartnersLoading,
    loadPartners,
    setPartnerDraft,
    emptyPartnerDraft,
    partnerColumns,
    partnerDraft,
    handleSubmitPartner,
  };

  const addWorkshopModalProps: AddWorkshopModalProps = {
    setIsAddWorkshopModalOpen,
    handleCreateWorkshop,
    newWorkshopForm,
    setNewWorkshopForm,
  };

  const addMachineModalProps: AddMachineModalProps = {
    setIsAddMachineModalOpen,
    handleCreateMachine,
    newMachineForm,
    setNewMachineForm,
  };

  const addMaterialModalProps: AddMaterialModalProps = {
    setIsAddMaterialModalOpen,
    handleCreateMaterial,
    newMaterialForm,
    setNewMaterialForm,
    workshops,
  };

  return (
    <div className="space-y-6">
      {/* Header & Title */}
      <Group1Header {...group1HeaderProps} />

      {/* KPI Cards Strip */}
      <Group1Kpi {...group1KpiProps} />

      {/* TAB 1: DANH SÁCH XƯỞNG */}
      {activeTab === 'workshops' && <WorkshopsTab {...workshopsTabProps} />}

      {/* TAB 2: ĐỘI MÁY IN TOÀN HỆ THỐNG (FLEET INSPECTOR) */}
      {activeTab === 'fleet' && <FleetTab {...fleetTabProps} />}

      {/* TAB 3: TỒN KHO & NHỰA TOÀN MẠNG LƯỚI */}
      {activeTab === 'materials' && <MaterialsTab {...materialsTabProps} />}

      {/* MODAL: THÊM XƯỞNG IN */}
      {isAddWorkshopModalOpen && <AddWorkshopModal {...addWorkshopModalProps} />}

      {/* MODAL: BIÊN CHẾ MÁY MỚI */}
      {isAddMachineModalOpen && <AddMachineModal {...addMachineModalProps} />}

      {/* MODAL: THÊM VẬT LIỆU */}
      {isAddMaterialModalOpen && <AddMaterialModal {...addMaterialModalProps} />}

      {/* TAB 4: ĐỐI TÁC XƯỞNG LƯU TRONG SUPABASE (`workshop_partners`) */}
      {activeTab === 'partners' && <PartnersTab {...partnersTabProps} />}

    </div>
  );
};
export default Group1WorkshopsPanel;
