import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDownToLine,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  ClipboardList,
  Clock,
  Layers,
  MapPin,
  Package,
  Printer,
  RefreshCw,
  Settings,
  ShieldCheck,
  TriangleAlert,
  Wrench,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  Field,
  Icon,
  Input,
  Modal,
  PageHeader,
  Select,
  StatCard,
  type DataTableColumn,
} from '@frontend/ui';
import { useNavigate, useParams } from 'react-router-dom';
import { formatCurrency, formatDate, formatNumber, EMPTY_VALUE } from '@frontend/lib/format';
import { useAuth } from '../context/AuthContext';
import { MES_PIPELINE_STAGES } from '../components/OrderProgress';
import {
  workshopService,
  MY_MACHINE_STATUSES,
  MY_MACHINE_STATUS_LABELS,
  MY_ORDER_STATUS_BY_STAGE,
  MY_ORDER_STATUS_LABELS,
  type MaterialCatalogRef,
  type MyAccessory,
  type MyInventoryLog,
  type MyMachine,
  type MyMaterial,
  type MyQueueOrder,
  type MyWorkshopProfile,
  type PrinterFleetRef,
} from '@backend/services/workshopService';

/**
 * WorkshopSettingsView — bảng điều khiển của CHÍNH xưởng đang đăng nhập.
 *
 * Nguyên tắc bắt buộc (docs/plans/20-dot10-briefs.md W1b + docs/design/data-honesty.md):
 * 1. **Phạm vi theo chủ thể.** Mọi danh sách lấy từ hồ sơ xưởng của `auth.uid()`
 *    (`workshop_profiles.user_id`) → `partner_id`. Đơn chỉ hiện khi
 *    `orders.assigned_workshop_id = partner_id`. Không hiện số liệu xưởng khác, không
 *    hiện số liệu toàn hệ thống.
 * 2. **Không rơi về dữ liệu mẫu.** Bảng rỗng ⇒ `EmptyState`, KHÔNG seed, KHÔNG localStorage.
 * 3. **Không số bịa.** Thiếu dữ liệu ⇒ `—`; rate rỗng = CHƯA CẤU HÌNH (không mặc định số).
 * 4. **8 nấc dùng chung** với khách: nhãn/nấc lấy nguyên từ `MES_PIPELINE_STAGES`
 *    (`OrderProgress.tsx`) — nguồn sự thật duy nhất của pipeline.
 */

export interface WorkshopSettingsViewProps {
  onNavigate?: (screen: string, payload?: any) => void;
  onShowToast?: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

type TabId = 'queue' | 'machines' | 'materials' | 'accessories' | 'audit_trail' | 'preferences';

/**
 * Danh sách tab hợp lệ của `/lab` — PHẢI khớp `LAB_NAV` trong `src/App.tsx`
 * (`SideNav` dựng ở đó trỏ tới `/lab/<id>`).
 */
const LAB_TAB_IDS: TabId[] = [
  'queue',
  'machines',
  'materials',
  'accessories',
  'audit_trail',
  'preferences',
];

/** Ô số gắn nhãn CHƯA CẤU HÌNH khi rỗng — KHÔNG mặc định một con số nào. */
function parseRateInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
}

function digitsOnly(raw: string): string {
  return raw.replace(/[^\d]/g, '');
}

const REGION_OPTIONS = [
  { value: 'Bắc', label: 'Miền Bắc (Hub Hà Nội & lân cận)' },
  { value: 'Trung', label: 'Miền Trung (Hub Đà Nẵng & lân cận)' },
  { value: 'Đông', label: 'Miền Đông (Hub TP.HCM & lân cận)' },
];

export const WorkshopSettingsView: React.FC<WorkshopSettingsViewProps> = ({
  onNavigate,
  onShowToast,
}) => {
  const { user, loading: authLoading } = useAuth();

  const [profile, setProfile] = useState<MyWorkshopProfile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [duplicateProfiles, setDuplicateProfiles] = useState(0);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [orders, setOrders] = useState<MyQueueOrder[]>([]);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const [machines, setMachines] = useState<MyMachine[]>([]);
  const [machinesError, setMachinesError] = useState<string | null>(null);

  const [materials, setMaterials] = useState<MyMaterial[]>([]);
  const [materialsError, setMaterialsError] = useState<string | null>(null);

  const [logs, setLogs] = useState<MyInventoryLog[]>([]);
  const [logsError, setLogsError] = useState<string | null>(null);

  const [accessories, setAccessories] = useState<MyAccessory[]>([]);
  const [accessoriesError, setAccessoriesError] = useState<string | null>(null);

  const [fleetCatalog, setFleetCatalog] = useState<PrinterFleetRef[]>([]);
  const [materialCatalog, setMaterialCatalog] = useState<MaterialCatalogRef[]>([]);

  /**
   * Tab đang mở đọc từ URL (`/lab/:tab`) — URL là NGUỒN SỰ THẬT DUY NHẤT, nên
   * deep-link `/lab/machines` mở đúng tab và `SideNav` (ở `App.tsx`) highlight đúng mục.
   * Giá trị lạ ⇒ rơi về tab đầu (`queue`), không dựng tab không tồn tại.
   */
  const { tab: tabParam } = useParams<{ tab?: string }>();
  const navigate = useNavigate();
  const activeTab: TabId = LAB_TAB_IDS.includes(tabParam as TabId) ? (tabParam as TabId) : 'queue';
  const setActiveTab = useCallback(
    (next: TabId) => {
      navigate(`/lab/${next}`);
    },
    [navigate],
  );
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);

  const notify = useCallback(
    (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'success') => {
      onShowToast?.(message, type);
    },
    [onShowToast],
  );

  const workshopKey = profile?.id ?? '';
  const partnerId = profile?.partnerId ?? null;

  /* ------------------------------------------------------------------ */
  /* Nạp hồ sơ xưởng của chính mình                                      */
  /* ------------------------------------------------------------------ */
  const loadProfile = useCallback(async () => {
    if (!user?.id) {
      setProfile(null);
      setLoadingProfile(false);
      return;
    }
    setLoadingProfile(true);
    const res = await workshopService.getMyWorkshopProfile();
    setProfile(res.profile);
    setProfileError(res.error);
    setDuplicateProfiles(res.duplicateCount);
    setLoadingProfile(false);
  }, [user?.id]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  /* ------------------------------------------------------------------ */
  /* Nạp dữ liệu con — CHỈ của hồ sơ xưởng này                           */
  /* ------------------------------------------------------------------ */
  const loadQueue = useCallback(async () => {
    if (!partnerId) {
      setOrders([]);
      setOrdersError(null);
      return;
    }
    setLoadingOrders(true);
    const res = await workshopService.getMyQueueOrders(partnerId);
    setOrders(res.data);
    setOrdersError(res.error);
    setLoadingOrders(false);
  }, [partnerId]);

  const loadMachines = useCallback(async () => {
    if (!workshopKey) return;
    const res = await workshopService.getMyMachines(workshopKey);
    setMachines(res.data);
    setMachinesError(res.error);
  }, [workshopKey]);

  const loadMaterialsAndLogs = useCallback(async () => {
    if (!workshopKey) return;
    const res = await workshopService.getMyMaterials(workshopKey);
    setMaterials(res.data);
    setMaterialsError(res.error);
    const logRes = await workshopService.getMyInventoryLogs(res.data.map((m) => m.id));
    setLogs(logRes.data);
    setLogsError(logRes.error);
  }, [workshopKey]);

  const loadAccessories = useCallback(async () => {
    if (!workshopKey) return;
    const res = await workshopService.getMyAccessories(workshopKey);
    setAccessories(res.data);
    setAccessoriesError(res.error);
  }, [workshopKey]);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    void loadMachines();
    void loadMaterialsAndLogs();
    void loadAccessories();
  }, [loadMachines, loadMaterialsAndLogs, loadAccessories]);

  /* Danh mục tham chiếu của nền tảng — chỉ để GỢI Ý thông số khi khai báo. */
  useEffect(() => {
    let alive = true;
    void (async () => {
      const [fleet, mats] = await Promise.all([
        workshopService.getPrinterFleetCatalog(),
        workshopService.getMaterialsCatalog(),
      ]);
      if (!alive) return;
      setFleetCatalog(fleet.data);
      setMaterialCatalog(mats.data);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadProfile(), loadQueue(), loadMachines(), loadMaterialsAndLogs(), loadAccessories()]);
  }, [loadProfile, loadQueue, loadMachines, loadMaterialsAndLogs, loadAccessories]);

  /* ------------------------------------------------------------------ */
  /* Hàng đợi việc — cập nhật tiến độ theo ĐÚNG 8 nấc của OrderProgress   */
  /* ------------------------------------------------------------------ */
  const applyStage = useCallback(
    async (order: MyQueueOrder, stageIndex: number, busyLabel: string) => {
      if (!partnerId) {
        notify('Tài khoản chưa được gắn mã đối tác xưởng nên không thể nhận đơn.', 'warning');
        return;
      }
      const stage = MES_PIPELINE_STAGES[stageIndex];
      setBusyOrderId(order.id);
      const res = await workshopService.updateMyOrderProgress({
        orderId: order.id,
        partnerId,
        stageIndex,
        status: MY_ORDER_STATUS_BY_STAGE[stageIndex] ?? order.status,
        layerProgress: stageIndex >= 5 ? 100 : order.layerProgress,
      });
      setBusyOrderId(null);

      if (!res.success) {
        notify(`Chưa cập nhật được đơn ${order.orderNumber}: ${res.error}`, 'error');
        return;
      }
      setOrders((prev) =>
        prev.map((o) =>
          o.id === order.id
            ? {
                ...o,
                statusStageIndex: stageIndex,
                status: MY_ORDER_STATUS_BY_STAGE[stageIndex] ?? o.status,
                layerProgress: stageIndex >= 5 ? 100 : o.layerProgress,
              }
            : o,
        ),
      );
      notify(
        `Đơn ${order.orderNumber} → nấc ${stageIndex + 1}/8 "${stage.label}". ` +
          `Khách thấy đúng nấc này ở trang theo dõi đơn. Không có thông báo nào được gửi thêm.`,
        'success',
      );
    },
    [partnerId, notify],
  );

  const [layerDraft, setLayerDraft] = useState<Record<string, string>>({});
  const [busyLabel, setBusyLabel] = useState<string | null>(null);

  const handleAcceptJob = (order: MyQueueOrder) => {
    setBusyLabel('Đang nhận việc…');
    void applyStage(order, 1, 'Nhận việc').finally(() => setBusyLabel(null));
  };

  const handleConfirmDone = (order: MyQueueOrder) => {
    setBusyLabel('Đang xác nhận hoàn thành…');
    void applyStage(order, 7, 'Hoàn thành').finally(() => setBusyLabel(null));
  };

  const handleSaveLayerProgress = (order: MyQueueOrder) => {
    const raw = (layerDraft[order.id] ?? '').trim();
    if (!raw) {
      notify('Chưa nhập tiến độ lớp in nên chưa có gì để lưu.', 'warning');
      return;
    }
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      notify('Tiến độ lớp in phải là số từ 0 đến 100.', 'warning');
      return;
    }
    const stageIndex = order.statusStageIndex ?? 4;
    setBusyOrderId(order.id);
    void workshopService
      .updateMyOrderProgress({
        orderId: order.id,
        partnerId,
        stageIndex,
        status: MY_ORDER_STATUS_BY_STAGE[stageIndex] ?? order.status,
        layerProgress: value,
      })
      .then((res) => {
        if (!res.success) {
          notify(`Chưa lưu được tiến độ lớp cho ${order.orderNumber}: ${res.error}`, 'error');
          return;
        }
        setOrders((prev) =>
          prev.map((o) => (o.id === order.id ? { ...o, layerProgress: value } : o)),
        );
        notify(`Đã ghi tiến độ lớp ${value}% cho đơn ${order.orderNumber}.`, 'success');
      })
      .finally(() => setBusyOrderId(null));
  };

  /* ------------------------------------------------------------------ */
  /* Máy in                                                              */
  /* ------------------------------------------------------------------ */
  const [machineModalOpen, setMachineModalOpen] = useState(false);
  const [editingMachine, setEditingMachine] = useState<MyMachine | null>(null);
  const [mName, setMName] = useState('');
  const [mTechnology, setMTechnology] = useState('FDM');
  const [mStatus, setMStatus] = useState<string>('Free');
  const [mHourlyRate, setMHourlyRate] = useState('');
  const [mVol, setMVol] = useState({ x: '', y: '', z: '' });
  const [savingMachine, setSavingMachine] = useState(false);

  const openMachineModal = (machine?: MyMachine) => {
    setEditingMachine(machine ?? null);
    setMName(machine?.name ?? `Máy in #${machines.length + 1}`);
    setMTechnology(machine?.technology ?? 'FDM');
    setMStatus(machine?.status ?? 'Free');
    setMHourlyRate(machine?.hourlyRate != null ? String(machine.hourlyRate) : '');
    setMVol({
      x: machine?.bedDimensions ? String(machine.bedDimensions.x) : '',
      y: machine?.bedDimensions ? String(machine.bedDimensions.y) : '',
      z: machine?.bedDimensions ? String(machine.bedDimensions.z) : '',
    });
    setMachineModalOpen(true);
  };

  const applyFleetSuggestion = (fleetId: string) => {
    const ref = fleetCatalog.find((f) => f.id === fleetId);
    if (!ref) return;
    setMName(ref.name);
    setMTechnology(ref.technology || 'FDM');
    const bed = ref.bed_dimensions;
    if (bed) {
      setMVol({
        x: bed.x != null ? String(bed.x) : '',
        y: bed.y != null ? String(bed.y) : '',
        z: bed.z != null ? String(bed.z) : '',
      });
    }
  };

  const handleSaveMachine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workshopKey) {
      notify('Chưa có hồ sơ xưởng nên không thể khai báo máy in.', 'warning');
      return;
    }
    const name = mName.trim();
    if (!name) {
      notify('Vui lòng nhập tên máy in.', 'warning');
      return;
    }
    const hourlyRate = parseRateInput(mHourlyRate);
    if (Number.isNaN(hourlyRate)) {
      notify('Đơn giá giờ máy phải là số không âm (để trống = chưa khai).', 'warning');
      return;
    }
    const bed = {
      x: Number(mVol.x) || 0,
      y: Number(mVol.y) || 0,
      z: Number(mVol.z) || 0,
    };

    setSavingMachine(true);
    void workshopService
      .saveMyMachine({
        id: editingMachine?.id,
        workshopProfileId: workshopKey,
        name,
        technology: mTechnology,
        status: mStatus,
        hourlyRate,
        bedDimensions: bed,
      })
      .then(async (res) => {
        if (!res.success) {
          notify(`Chưa lưu được máy in: ${res.error}`, 'error');
          return;
        }
        notify(
          editingMachine
            ? `Đã cập nhật máy "${name}".`
            : `Đã khai báo máy "${name}" vào xưởng của bạn.`,
          'success',
        );
        setMachineModalOpen(false);
        await loadMachines();
      })
      .finally(() => setSavingMachine(false));
  };

  const handleMachineStatus = (machine: MyMachine, status: string) => {
    void workshopService.setMyMachineStatus(machine.id, workshopKey, status).then(async (res) => {
      if (!res.success) {
        notify(`Chưa đổi được trạng thái máy "${machine.name}": ${res.error}`, 'error');
        return;
      }
      notify(`Máy "${machine.name}" → ${MY_MACHINE_STATUS_LABELS[status] ?? status}.`, 'success');
      await loadMachines();
    });
  };

  const handleDeleteMachine = (machine: MyMachine) => {
    void workshopService.deleteMyMachine(machine.id, workshopKey).then(async (res) => {
      if (!res.success) {
        notify(`Chưa xoá được máy "${machine.name}": ${res.error}`, 'error');
        return;
      }
      notify(`Đã xoá máy "${machine.name}" khỏi xưởng.`, 'success');
      await loadMachines();
    });
  };

  /* ------------------------------------------------------------------ */
  /* Vật liệu & kho                                                      */
  /* ------------------------------------------------------------------ */
  const [materialModalOpen, setMaterialModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<MyMaterial | null>(null);
  const [matName, setMatName] = useState('');
  const [matType, setMatType] = useState('PLA');
  const [matColor, setMatColor] = useState('');
  const [matStock, setMatStock] = useState('');
  const [matThreshold, setMatThreshold] = useState('');
  const [matPrice, setMatPrice] = useState('');
  const [savingMaterial, setSavingMaterial] = useState(false);

  const openMaterialModal = (material?: MyMaterial) => {
    setEditingMaterial(material ?? null);
    setMatName(material?.name ?? '');
    setMatType(material?.type ?? 'PLA');
    setMatColor(material?.color ?? '');
    setMatStock(material?.currentStockGrams != null ? String(material.currentStockGrams) : '');
    setMatThreshold(
      material?.lowStockThresholdGrams != null ? String(material.lowStockThresholdGrams) : '',
    );
    setMatPrice(material?.pricePerKg != null ? String(material.pricePerKg) : '');
    setMaterialModalOpen(true);
  };

  const handleSaveMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workshopKey) {
      notify('Chưa có hồ sơ xưởng nên không thể khai báo vật liệu.', 'warning');
      return;
    }
    const name = matName.trim();
    if (!name) {
      notify('Vui lòng nhập tên vật liệu.', 'warning');
      return;
    }
    const stock = parseRateInput(matStock);
    const threshold = parseRateInput(matThreshold);
    const price = parseRateInput(matPrice);
    if (Number.isNaN(stock) || Number.isNaN(threshold) || Number.isNaN(price)) {
      notify('Tồn kho / ngưỡng / đơn giá phải là số không âm (để trống = chưa khai).', 'warning');
      return;
    }

    setSavingMaterial(true);
    void workshopService
      .saveMyMaterial({
        id: editingMaterial?.id,
        workshopProfileId: workshopKey,
        name,
        type: matType,
        color: matColor.trim(),
        currentStockGrams: stock ?? 0,
        lowStockThresholdGrams: threshold ?? 500,
        pricePerKg: price,
      })
      .then(async (res) => {
        if (!res.success) {
          notify(`Chưa lưu được vật liệu: ${res.error}`, 'error');
          return;
        }
        notify(
          editingMaterial
            ? `Đã cập nhật vật liệu "${name}".`
            : `Đã khai báo vật liệu "${name}" vào kho của xưởng bạn.`,
          'success',
        );
        setMaterialModalOpen(false);
        await loadMaterialsAndLogs();
      })
      .finally(() => setSavingMaterial(false));
  };

  const handleDeleteMaterial = (material: MyMaterial) => {
    void workshopService.deleteMyMaterial(material.id, workshopKey).then(async (res) => {
      if (!res.success) {
        notify(`Chưa xoá được vật liệu "${material.name}": ${res.error}`, 'error');
        return;
      }
      notify(`Đã xoá vật liệu "${material.name}".`, 'success');
      await loadMaterialsAndLogs();
    });
  };

  /* Phiếu kho */
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [logMaterialId, setLogMaterialId] = useState('');
  const [logAction, setLogAction] = useState<'Import' | 'Export' | 'Adjustment'>('Import');
  const [logGrams, setLogGrams] = useState('');
  const [logPrice, setLogPrice] = useState('');
  const [logSupplier, setLogSupplier] = useState('');
  const [logBatch, setLogBatch] = useState('');
  const [logNote, setLogNote] = useState('');
  const [savingLog, setSavingLog] = useState(false);

  const openLogModal = (materialId?: string) => {
    if (materials.length === 0) {
      notify('Chưa khai vật liệu nào nên chưa ghi được phiếu kho.', 'warning');
      return;
    }
    const target = materials.find((m) => m.id === materialId) ?? materials[0];
    setLogMaterialId(target.id);
    setLogAction('Import');
    setLogGrams('');
    setLogPrice(target.pricePerKg != null ? String(target.pricePerKg) : '');
    setLogSupplier('');
    setLogBatch('');
    setLogNote('');
    setLogModalOpen(true);
  };

  const handleSaveLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!logMaterialId) {
      notify('Vui lòng chọn vật liệu cho phiếu kho.', 'warning');
      return;
    }
    const grams = Number(logGrams);
    if (!Number.isFinite(grams) || grams <= 0) {
      notify('Khối lượng phiếu kho phải là số lớn hơn 0 (gram).', 'warning');
      return;
    }
    const price = parseRateInput(logPrice);
    if (Number.isNaN(price)) {
      notify('Đơn giá nhập phải là số không âm (để trống = không cập nhật giá).', 'warning');
      return;
    }

    setSavingLog(true);
    void workshopService
      .addMyInventoryLog({
        workshopProfileId: workshopKey,
        materialId: logMaterialId,
        action: logAction,
        grams,
        pricePerKgAtTime: price,
        supplier: logSupplier.trim(),
        batchCode: logBatch.trim(),
        note: logNote.trim(),
        // Danh tính THẬT của người ghi phiếu (không bịa tên kỹ sư).
        createdBy: user?.email ?? '',
      })
      .then(async (res) => {
        if (!res.success) {
          notify(`Chưa ghi được phiếu kho: ${res.error}`, 'error');
          return;
        }
        if (!res.stockUpdated) {
          notify(
            `Phiếu kho đã ghi nhưng TỒN KHO CHƯA cập nhật: ${res.error ?? 'máy chủ từ chối bước cập nhật tồn'}. ` +
              'Hãy kiểm tra lại cột tồn kho trước khi tin số liệu.',
            'warning',
          );
        } else {
          notify(
            `Đã ghi phiếu ${logAction === 'Import' ? 'nhập' : logAction === 'Export' ? 'xuất' : 'điều chỉnh'} ` +
              `${formatNumber(grams)} g. Tồn mới: ${formatNumber(res.newStockGrams)} g.`,
            'success',
          );
        }
        setLogModalOpen(false);
        await loadMaterialsAndLogs();
      })
      .finally(() => setSavingLog(false));
  };

  /* ------------------------------------------------------------------ */
  /* Phụ kiện                                                            */
  /* ------------------------------------------------------------------ */
  const [accModalOpen, setAccModalOpen] = useState(false);
  const [editingAcc, setEditingAcc] = useState<MyAccessory | null>(null);
  const [accName, setAccName] = useState('');
  const [accUnit, setAccUnit] = useState('cái');
  const [accQty, setAccQty] = useState('');
  const [accSku, setAccSku] = useState('');
  const [savingAcc, setSavingAcc] = useState(false);

  const openAccModal = (acc?: MyAccessory) => {
    setEditingAcc(acc ?? null);
    setAccName(acc?.name ?? '');
    setAccUnit(acc?.unit ?? 'cái');
    setAccQty(acc?.quantity != null ? String(acc.quantity) : '');
    setAccSku(acc?.sku ?? '');
    setAccModalOpen(true);
  };

  const handleSaveAcc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workshopKey) {
      notify('Chưa có hồ sơ xưởng nên không thể khai báo phụ kiện.', 'warning');
      return;
    }
    const name = accName.trim();
    if (!name) {
      notify('Vui lòng nhập tên phụ kiện.', 'warning');
      return;
    }
    const qty = parseRateInput(accQty);
    if (Number.isNaN(qty)) {
      notify('Số lượng phụ kiện phải là số không âm.', 'warning');
      return;
    }
    setSavingAcc(true);
    void workshopService
      .saveMyAccessory({
        id: editingAcc?.id,
        workshopProfileId: workshopKey,
        name,
        unit: accUnit.trim() || 'cái',
        quantity: qty ?? 0,
        sku: accSku.trim(),
      })
      .then(async (res) => {
        if (!res.success) {
          notify(`Chưa lưu được phụ kiện: ${res.error}`, 'error');
          return;
        }
        notify(editingAcc ? `Đã cập nhật phụ kiện "${name}".` : `Đã khai báo phụ kiện "${name}".`, 'success');
        setAccModalOpen(false);
        await loadAccessories();
      })
      .finally(() => setSavingAcc(false));
  };

  const handleDeleteAcc = (acc: MyAccessory) => {
    void workshopService.deleteMyAccessory(acc.id, workshopKey).then(async (res) => {
      if (!res.success) {
        notify(`Chưa xoá được phụ kiện "${acc.name}": ${res.error}`, 'error');
        return;
      }
      notify(`Đã xoá phụ kiện "${acc.name}".`, 'success');
      await loadAccessories();
    });
  };

  /* ------------------------------------------------------------------ */
  /* Cấu hình xưởng (kể cả rate riêng)                                   */
  /* ------------------------------------------------------------------ */
  const [prefName, setPrefName] = useState('');
  const [prefAddress, setPrefAddress] = useState('');
  const [prefRegion, setPrefRegion] = useState('Bắc');
  const [prefPhone, setPrefPhone] = useState('');
  const [prefEmail, setPrefEmail] = useState('');
  const [prefElectricity, setPrefElectricity] = useState('');
  const [prefLabor, setPrefLabor] = useState('');
  const [savingPref, setSavingPref] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setPrefName(profile.workshopName);
    setPrefAddress(profile.address);
    setPrefRegion(profile.region || 'Bắc');
    setPrefPhone(profile.contactPhone);
    setPrefEmail(profile.contactEmail);
    setPrefElectricity(
      profile.electricityRateOverride != null ? String(profile.electricityRateOverride) : '',
    );
    setPrefLabor(profile.laborRateOverride != null ? String(profile.laborRateOverride) : '');
  }, [profile]);

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) {
      notify('Chưa có hồ sơ xưởng nên không thể lưu cấu hình.', 'warning');
      return;
    }
    const name = prefName.trim();
    if (!name) {
      notify('Vui lòng nhập tên xưởng in.', 'warning');
      return;
    }
    const electricity = parseRateInput(prefElectricity);
    const labor = parseRateInput(prefLabor);
    if (Number.isNaN(electricity) || Number.isNaN(labor)) {
      notify('Đơn giá điện / nhân công phải là số không âm (để trống = chưa cấu hình).', 'warning');
      return;
    }

    setSavingPref(true);
    void workshopService
      .saveMyWorkshopProfile(profile.id, {
        workshopName: name,
        address: prefAddress.trim(),
        region: prefRegion,
        contactPhone: prefPhone.trim(),
        contactEmail: prefEmail.trim(),
        // null = XOÁ cấu hình. Rỗng nghĩa là CHƯA cấu hình, không phải 0 và không phải số mặc định.
        electricityRateOverride: electricity,
        laborRateOverride: labor,
      })
      .then(async (res) => {
        if (!res.success) {
          notify(`Chưa lưu được cấu hình xưởng: ${res.error}`, 'error');
          return;
        }
        notify('Đã lưu cấu hình xưởng của bạn.', 'success');
        await loadProfile();
      })
      .finally(() => setSavingPref(false));
  };

  /* ------------------------------------------------------------------ */
  /* Số liệu tổng quan — TÍNH TỪ chính dữ liệu của xưởng này             */
  /* ------------------------------------------------------------------ */
  const stats = useMemo(() => {
    const idx = (o: MyQueueOrder) => (typeof o.statusStageIndex === 'number' ? o.statusStageIndex : null);
    const active = orders.filter((o) => o.status !== 'completed' && o.status !== 'cancelled');
    const inPrint = orders.filter((o) => {
      const i = idx(o);
      return i != null && i >= 3 && i <= 4;
    });
    const done = orders.filter((o) => o.status === 'completed' || idx(o) === 7);
    const stockGrams = materials.reduce((sum, m) => sum + (m.currentStockGrams ?? 0), 0);
    const lowStock = materials.filter(
      (m) =>
        m.currentStockGrams != null &&
        m.lowStockThresholdGrams != null &&
        m.currentStockGrams <= m.lowStockThresholdGrams,
    ).length;
    const freeMachines = machines.filter((m) => m.status === 'Free').length;
    return {
      active: active.length,
      inPrint: inPrint.length,
      done: done.length,
      stockGrams,
      lowStock,
      hasStockData: materials.some((m) => m.currentStockGrams != null),
      freeMachines,
      machinesWithoutRate: machines.filter((m) => m.hourlyRate == null).length,
    };
  }, [orders, materials, machines]);

  /* ------------------------------------------------------------------ */
  /* Cột bảng                                                            */
  /* ------------------------------------------------------------------ */
  const queueColumns = useMemo<DataTableColumn<MyQueueOrder>[]>(
    () => [
      {
        key: 'orderNumber',
        header: 'Đơn hàng',
        render: (row) => (
          <div className="flex flex-col">
            <span className="font-mono text-xs font-semibold text-fg">{row.orderNumber || EMPTY_VALUE}</span>
            <span className="text-xs text-fg-subtle">
              Đặt: {row.date ? formatDate(row.date) : EMPTY_VALUE} · Hạn:{' '}
              {row.estimatedDelivery ? formatDate(row.estimatedDelivery) : EMPTY_VALUE}
            </span>
          </div>
        ),
        value: (row) => row.orderNumber,
      },
      {
        key: 'items',
        header: 'Mặt hàng',
        render: (row) =>
          row.items.length === 0 ? (
            <span className="text-fg-subtle">{EMPTY_VALUE}</span>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {row.items.slice(0, 3).map((it) => (
                <li key={it.id || it.name} className="text-xs text-fg">
                  {it.name || EMPTY_VALUE}
                  <span className="text-fg-subtle">
                    {' '}
                    ×{formatNumber(it.quantity)}
                    {it.material ? ` · ${it.material}` : ''}
                  </span>
                </li>
              ))}
              {row.items.length > 3 ? (
                <li className="text-xs text-fg-subtle">+{row.items.length - 3} mặt hàng khác</li>
              ) : null}
            </ul>
          ),
        value: (row) => row.items.map((i) => i.name).join(', '),
      },
      {
        key: 'stage',
        header: 'Nấc gia công (8 nấc)',
        render: (row) => {
          const stageIndex = row.statusStageIndex;
          const stage = stageIndex != null ? MES_PIPELINE_STAGES[stageIndex] : null;
          return (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-fg">
                {stage ? `Nấc ${stageIndex + 1}/8 · ${stage.label}` : `Nấc: ${EMPTY_VALUE} (xưởng chưa báo)`}
              </span>
              <span className="text-xs text-fg-subtle">{MY_ORDER_STATUS_LABELS[row.status] ?? row.status}</span>
            </div>
          );
        },
        value: (row) => (row.statusStageIndex != null ? row.statusStageIndex : -1),
      },
      {
        key: 'layer',
        header: 'Tiến độ lớp',
        render: (row) => (
          <span className="text-xs tabular-nums text-fg">
            {row.layerProgress != null ? `${formatNumber(row.layerProgress)}%` : EMPTY_VALUE}
          </span>
        ),
        value: (row) => (row.layerProgress != null ? row.layerProgress : -1),
      },
      {
        key: 'actions',
        header: 'Cập nhật tiến độ',
        render: (row) => {
          const stageIndex = row.statusStageIndex;
          const disabled = busyOrderId === row.id;
          return (
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={disabled}
                  onClick={() => handleAcceptJob(row)}
                >
                  Nhận việc
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={disabled}
                  onClick={() => handleConfirmDone(row)}
                >
                  Xác nhận hoàn thành
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                {MES_PIPELINE_STAGES.map((stage, idx) => (
                  <button
                    key={stage.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      setBusyLabel(`Đang ghi nấc ${idx + 1}/8…`);
                      void applyStage(row, idx, stage.shortLabel).finally(() => setBusyLabel(null));
                    }}
                    title={`Đặt nấc ${idx + 1}/8 — ${stage.label}`}
                    className={`rounded-sm border px-1.5 py-0.5 text-xs transition-colors disabled:opacity-50 ${
                      stageIndex === idx
                        ? 'border-primary bg-primary text-primary-fg'
                        : 'border-line-control bg-surface text-fg-muted hover:bg-surface-muted'
                    }`}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>
              <div className="flex items-end gap-1.5">
                <Field label="Tiến độ lớp (%)" hideLabel>
                  {(control) => (
                    <Input
                      {...control}
                      size="sm"
                      numeric
                      className="w-24"
                      value={layerDraft[row.id] ?? ''}
                      onChange={(ev) => setLayerDraft((prev) => ({ ...prev, [row.id]: ev.target.value }))}
                      placeholder="—"
                    />
                  )}
                </Field>
                <Button variant="ghost" size="sm" disabled={disabled} onClick={() => handleSaveLayerProgress(row)}>
                  Lưu %
                </Button>
              </div>
            </div>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [busyOrderId, layerDraft, applyStage],
  );

  const machineColumns = useMemo<DataTableColumn<MyMachine>[]>(
    () => [
      {
        key: 'name',
        header: 'Máy in',
        render: (row) => (
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-fg">{row.name || EMPTY_VALUE}</span>
            <span className="text-xs text-fg-subtle">
              {row.technology || EMPTY_VALUE}
              {row.brand ? ` · ${row.brand}` : ''}
              {row.model ? ` ${row.model}` : ''}
            </span>
          </div>
        ),
        value: (row) => row.name,
      },
      {
        key: 'bed',
        header: 'Khổ in (mm)',
        render: (row) => {
          // D8: `bed_dimensions` NULL ⇒ service trả `null` (hiện `—`). Nhưng JSON có thể là
          // `{x:null,…}` ⇒ service map thành 0 ⇒ KHÔNG được in "0×0×0" như một khổ in thật.
          const bed = row.bedDimensions;
          const hasBed =
            Boolean(bed) &&
            [bed!.x, bed!.y, bed!.z].every((v) => typeof v === 'number' && Number.isFinite(v) && v > 0);
          return hasBed ? (
            <span className="text-xs tabular-nums text-fg">
              {bed!.x}×{bed!.y}×{bed!.z}
            </span>
          ) : (
            <span className="text-fg-subtle">{EMPTY_VALUE}</span>
          );
        },
      },
      {
        key: 'hourlyRate',
        header: 'Đơn giá giờ máy',
        numeric: true,
        render: (row) =>
          row.hourlyRate != null ? (
            <span className="text-xs tabular-nums text-fg">{formatCurrency(row.hourlyRate)}</span>
          ) : (
            <Badge variant="warning">Chưa khai</Badge>
          ),
        value: (row) => (row.hourlyRate != null ? row.hourlyRate : -1),
      },
      {
        key: 'status',
        header: 'Trạng thái',
        render: (row) => (
          <div className="flex flex-wrap items-center gap-1">
            {MY_MACHINE_STATUSES.map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => handleMachineStatus(row, st)}
                className={`rounded-sm border px-2 py-1 text-xs transition-colors ${
                  row.status === st
                    ? 'border-primary bg-primary text-primary-fg'
                    : 'border-line-control bg-surface text-fg-muted hover:bg-surface-muted'
                }`}
              >
                {MY_MACHINE_STATUS_LABELS[st] ?? st}
              </button>
            ))}
          </div>
        ),
      },
      {
        key: 'actions',
        header: 'Thao tác',
        render: (row) => (
          <div className="flex flex-wrap items-center gap-1.5">
            <Button variant="ghost" size="sm" onClick={() => openMachineModal(row)}>
              Sửa
            </Button>
            <Button variant="danger-ghost" size="sm" onClick={() => handleDeleteMachine(row)}>
              Xoá
            </Button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [workshopKey],
  );

  const materialColumns = useMemo<DataTableColumn<MyMaterial>[]>(
    () => [
      {
        key: 'name',
        header: 'Vật liệu',
        render: (row) => (
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-fg">{row.name || EMPTY_VALUE}</span>
            <span className="text-xs text-fg-subtle">
              {row.type || EMPTY_VALUE}
              {row.color ? ` · ${row.color}` : ''}
            </span>
          </div>
        ),
        value: (row) => row.name,
      },
      {
        key: 'stock',
        header: 'Tồn kho',
        numeric: true,
        render: (row) =>
          row.currentStockGrams != null ? (
            <span className="text-xs tabular-nums text-fg">{formatNumber(row.currentStockGrams)} g</span>
          ) : (
            <Badge variant="neutral">Chưa ghi nhận</Badge>
          ),
        value: (row) => (row.currentStockGrams != null ? row.currentStockGrams : -1),
      },
      {
        key: 'threshold',
        header: 'Ngưỡng cảnh báo',
        numeric: true,
        render: (row) =>
          row.lowStockThresholdGrams != null ? (
            <span className="text-xs tabular-nums text-fg">
              {formatNumber(row.lowStockThresholdGrams)} g
            </span>
          ) : (
            <span className="text-fg-subtle">{EMPTY_VALUE}</span>
          ),
      },
      {
        key: 'pricePerKg',
        header: 'Đơn giá',
        numeric: true,
        render: (row) =>
          row.pricePerKg != null ? (
            <span className="text-xs tabular-nums text-fg">{formatCurrency(row.pricePerKg)}/kg</span>
          ) : (
            <Badge variant="warning">Chưa khai</Badge>
          ),
        value: (row) => (row.pricePerKg != null ? row.pricePerKg : -1),
      },
      {
        key: 'stockStatus',
        header: 'Trạng thái kho',
        render: (row) => (
          <Badge
            variant={
              row.stockStatus === 'OutOfStock'
                ? 'danger'
                : row.stockStatus === 'LowStock'
                  ? 'warning'
                  : 'neutral'
            }
          >
            {row.stockStatus === 'OutOfStock'
              ? 'Hết hàng'
              : row.stockStatus === 'LowStock'
                ? 'Sắp hết'
                : row.stockStatus || 'Chưa khai'}
          </Badge>
        ),
      },
      {
        key: 'actions',
        header: 'Thao tác',
        render: (row) => (
          <div className="flex flex-wrap items-center gap-1.5">
            <Button variant="secondary" size="sm" onClick={() => openLogModal(row.id)}>
              Ghi phiếu
            </Button>
            <Button variant="ghost" size="sm" onClick={() => openMaterialModal(row)}>
              Sửa
            </Button>
            <Button variant="danger-ghost" size="sm" onClick={() => handleDeleteMaterial(row)}>
              Xoá
            </Button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [workshopKey],
  );

  const logColumns = useMemo<DataTableColumn<MyInventoryLog>[]>(
    () => [
      {
        key: 'createdAt',
        header: 'Thời gian',
        render: (row) => (
          <span className="text-xs text-fg-subtle">
            {row.createdAt ? formatDate(row.createdAt) : EMPTY_VALUE}
          </span>
        ),
      },
      {
        key: 'action',
        header: 'Hành động',
        render: (row) => (
          <Badge variant={row.action === 'Import' ? 'success' : row.action === 'Export' ? 'info' : 'warning'}>
            {row.action === 'Import' ? 'Nhập kho' : row.action === 'Export' ? 'Xuất in' : 'Điều chỉnh'}
          </Badge>
        ),
      },
      {
        key: 'material',
        header: 'Vật liệu',
        render: (row) => (
          <span className="text-xs text-fg">
            {materials.find((m) => m.id === row.materialId)?.name ?? EMPTY_VALUE}
          </span>
        ),
      },
      {
        key: 'grams',
        header: 'Khối lượng',
        numeric: true,
        render: (row) => (
          <span className="text-xs tabular-nums text-fg">
            {row.grams != null ? `${formatNumber(row.grams)} g` : EMPTY_VALUE}
          </span>
        ),
      },
      {
        key: 'pricePerKgAtTime',
        header: 'Đơn giá tại thời điểm',
        numeric: true,
        render: (row) =>
          row.pricePerKgAtTime != null ? (
            <span className="text-xs tabular-nums text-fg">{formatCurrency(row.pricePerKgAtTime)}/kg</span>
          ) : (
            <span className="text-fg-subtle">{EMPTY_VALUE}</span>
          ),
      },
      {
        key: 'batch',
        header: 'Lô / Nhà cung cấp',
        render: (row) => (
          <div className="flex flex-col">
            <span className="font-mono text-xs text-fg">{row.batchCode || EMPTY_VALUE}</span>
            <span className="text-xs text-fg-subtle">{row.supplier || EMPTY_VALUE}</span>
          </div>
        ),
      },
      {
        key: 'note',
        header: 'Ghi chú / Người ghi',
        render: (row) => (
          <div className="flex flex-col">
            <span className="text-xs text-fg-muted">{row.note || EMPTY_VALUE}</span>
            <span className="text-xs text-fg-subtle">{row.createdBy || EMPTY_VALUE}</span>
          </div>
        ),
      },
    ],
    [materials],
  );

  const accessoryColumns = useMemo<DataTableColumn<MyAccessory>[]>(
    () => [
      {
        key: 'name',
        header: 'Phụ kiện',
        render: (row) => (
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-fg">{row.name || EMPTY_VALUE}</span>
            <span className="font-mono text-xs text-fg-subtle">{row.sku || EMPTY_VALUE}</span>
          </div>
        ),
        value: (row) => row.name,
      },
      {
        key: 'quantity',
        header: 'Số lượng',
        numeric: true,
        render: (row) => (
          <span className="text-xs tabular-nums text-fg">
            {row.quantity != null ? formatNumber(row.quantity) : EMPTY_VALUE} {row.unit || ''}
          </span>
        ),
      },
      {
        key: 'prices',
        header: 'Giá vốn / Giá bán',
        render: (row) => (
          <span className="text-xs tabular-nums text-fg">
            {row.costPrice != null ? formatCurrency(row.costPrice) : EMPTY_VALUE} /{' '}
            {row.sellingPrice != null ? formatCurrency(row.sellingPrice) : EMPTY_VALUE}
          </span>
        ),
      },
      {
        key: 'actions',
        header: 'Thao tác',
        render: (row) => (
          <div className="flex flex-wrap items-center gap-1.5">
            <Button variant="ghost" size="sm" onClick={() => openAccModal(row)}>
              Sửa
            </Button>
            <Button variant="danger-ghost" size="sm" onClick={() => handleDeleteAcc(row)}>
              Xoá
            </Button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [workshopKey],
  );

  /* ------------------------------------------------------------------ */
  /* Trạng thái đang tải / lỗi hồ sơ                                     */
  /* ------------------------------------------------------------------ */
  if (authLoading || loadingProfile) {
    return (
      <div className="mx-auto w-full max-w-3xl">
          <EmptyState
            live
            icon={<RefreshCw className="size-5 animate-spin motion-reduce:animate-none" />}
            title="Đang tải hồ sơ xưởng"
            description="Đang đối chiếu tài khoản đăng nhập với hồ sơ xưởng để chỉ hiển thị dữ liệu của chính bạn."
          />
      </div>
    );
  }

  if (profileError) {
    return (
      <div className="mx-auto w-full max-w-3xl">
          <EmptyState
            live
            icon={<TriangleAlert className="size-5" />}
            title="Không đọc được hồ sơ xưởng"
            description={`Máy chủ trả lỗi: ${profileError}. Chưa có dữ liệu nào của xưởng được hiển thị để tránh cho bạn xem nhầm dữ liệu của xưởng khác.`}
            action={
              <Button variant="secondary" leadingIcon={<RefreshCw className="size-4" />} onClick={() => void loadProfile()}>
                Thử lại
              </Button>
            }
          />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto w-full max-w-3xl">
          <EmptyState
            live
            icon={<Building2 className="size-5" />}
            title="Tài khoản này chưa có hồ sơ xưởng"
            description={
              user?.email
                ? `Tài khoản ${user.email} chưa được gắn hồ sơ xưởng trong bảng workshop_profiles, nên chưa có dữ liệu nào để hiển thị. Hãy hoàn tất khai báo xưởng trước.`
                : 'Bạn chưa đăng nhập nên chưa xác định được xưởng nào là của bạn. Hãy đăng nhập bằng tài khoản xưởng.'
            }
            action={
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button variant="primary" onClick={() => onNavigate?.('auth')}>
                  {user?.email ? 'Khai báo xưởng' : 'Đăng nhập'}
                </Button>
                <Button variant="secondary" onClick={() => onNavigate?.('home')}>
                  Về cửa hàng
                </Button>
              </div>
            }
          />
      </div>
    );
  }

  const hasPartner = Boolean(partnerId);

  /* ------------------------------------------------------------------ */
  /* Render                                                              */
  /* ------------------------------------------------------------------ */
  return (
    <div className="flex w-full flex-col gap-section font-sans text-fg">
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            <span>{profile.workshopName || 'Xưởng chưa đặt tên'}</span>
            <Badge
              variant={
                profile.verifiedStatus === 'Verified'
                  ? 'success'
                  : profile.verifiedStatus === 'Suspended'
                    ? 'danger'
                    : 'warning'
              }
              icon={<ShieldCheck className="size-3.5" aria-hidden="true" />}
            >
              {profile.verifiedStatus === 'Verified'
                ? 'Đã duyệt'
                : profile.verifiedStatus === 'Suspended'
                  ? 'Tạm ngưng'
                  : 'Chờ duyệt'}
            </Badge>
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1">
              <MapPin className="size-3.5" aria-hidden="true" />
              Khu vực: <strong>{profile.region || EMPTY_VALUE}</strong>
            </span>
            <span aria-hidden="true">•</span>
            <span>
              Mã đối tác: <strong className="font-mono">{partnerId || 'chưa gắn'}</strong>
            </span>
            {profile.contactPhone ? (
              <>
                <span aria-hidden="true">•</span>
                <span>Hotline: {profile.contactPhone}</span>
              </>
            ) : null}
          </span>
        }
        actions={
          <>
            <Button
              variant="secondary"
              leadingIcon={<RefreshCw className="size-4" />}
              onClick={() => void refreshAll()}
            >
              Tải lại
            </Button>
            <Button
              variant="primary"
              leadingIcon={<ArrowDownToLine className="size-4" />}
              onClick={() => openLogModal()}
            >
              Ghi phiếu kho
            </Button>
          </>
        }
      />

      {/* Nội dung giữ nguyên margin riêng của từng khối (`mb-6`…) nên KHÔNG thêm gap
          ở đây — thêm gap sẽ cộng dồn và làm nhịp dọc sai lệch. */}
      <div className="w-full">
        {!hasPartner ? (
          <Card className="mb-6" padding="md">
            <div className="flex items-start gap-3">
              <TriangleAlert className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden="true" />
              <div className="flex flex-col gap-1">
                <p className="text-sm font-semibold text-fg">Tài khoản chưa được gắn mã đối tác xưởng</p>
                <p className="text-xs text-fg-muted">
                  Hồ sơ xưởng của bạn có <code className="font-mono">partner_id</code> rỗng, nên hệ thống
                  không xác định được đơn nào đã giao cho bạn. Hàng đợi việc sẽ luôn rỗng cho tới khi quản trị
                  viên gắn mã đối tác. Máy in, vật liệu và phụ kiện bạn tự khai vẫn hoạt động bình thường.
                </p>
                <div className="pt-1">
                  <Button variant="secondary" size="sm" onClick={() => setActiveTab('preferences')}>
                    Xem cấu hình xưởng
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ) : null}

        {duplicateProfiles > 1 ? (
          <Card className="mb-6" padding="md">
            <div className="flex items-start gap-3">
              <TriangleAlert className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden="true" />
              <p className="text-xs text-fg-muted">
                Tài khoản này đang có <strong>{duplicateProfiles}</strong> hồ sơ xưởng trong bảng{' '}
                <code className="font-mono">workshop_profiles</code>. Trang này hiển thị hồ sơ{' '}
                <strong>mới nhất</strong> (<code className="font-mono">{profile.id}</code>). Hãy nhờ quản trị
                viên dọn các hồ sơ trùng để tránh nhầm dữ liệu.
              </p>
            </div>
          </Card>
        ) : null}

        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Đơn đang xử lý"
            value={hasPartner ? formatNumber(stats.active) : EMPTY_VALUE}
            icon={<ClipboardList className="size-4" />}
            hint={hasPartner ? `Tổng ${formatNumber(orders.length)} đơn được giao cho xưởng bạn` : 'Chưa gắn mã đối tác xưởng'}
          />
          <StatCard
            label="Đang in / hậu kỳ"
            value={hasPartner ? formatNumber(stats.inPrint) : EMPTY_VALUE}
            icon={<Printer className="size-4" />}
            hint={hasPartner ? `${formatNumber(stats.done)} đơn đã hoàn thành` : 'Chưa gắn mã đối tác xưởng'}
          />
          <StatCard
            label="Máy in của xưởng"
            value={formatNumber(machines.length)}
            icon={<Wrench className="size-4" />}
            hint={
              machines.length === 0
                ? 'Chưa khai máy in nào'
                : `${formatNumber(stats.freeMachines)} rảnh${stats.machinesWithoutRate > 0 ? ` · ${formatNumber(stats.machinesWithoutRate)} chưa khai đơn giá giờ` : ''}`
            }
          />
          <StatCard
            label="Tồn kho phôi"
            value={stats.hasStockData ? `${formatNumber(stats.stockGrams)} g` : EMPTY_VALUE}
            icon={<Layers className="size-4" />}
            hint={
              materials.length === 0
                ? 'Chưa khai vật liệu nào'
                : stats.hasStockData
                  ? `${formatNumber(materials.length)} vật liệu · ${formatNumber(stats.lowStock)} tới ngưỡng cảnh báo`
                  : 'Chưa từng ghi nhận tồn kho'
            }
          />
        </div>

        {/* ---------------------------- HÀNG ĐỢI VIỆC ---------------------------- */}
        {activeTab === 'queue' && (
          <section className="space-y-4">
            <div>
              <h2 className="flex items-center gap-2 text-base font-bold text-fg">
                <ClipboardList className="size-5 text-primary" aria-hidden="true" />
                Hàng đợi việc của xưởng bạn
              </h2>
              <p className="mt-0.5 text-xs text-fg-subtle">
                Chỉ hiển thị đơn có <code className="font-mono">assigned_workshop_id = {partnerId || '—'}</code>.
                Nấc tiến độ dùng đúng 8 nấc khách nhìn thấy ở trang theo dõi đơn.
              </p>
            </div>

            <DataTable<MyQueueOrder>
              columns={queueColumns}
              rows={orders}
              getRowId={(row) => row.id}
              caption="Hàng đợi việc được giao cho xưởng"
              tableLabel="Hàng đợi việc"
              filterable
              filterPlaceholder="Tìm theo mã đơn hoặc mặt hàng…"
              filterFn={(row, query) => {
                const q = query.trim().toLowerCase();
                if (!q) return true;
                return (
                  row.orderNumber.toLowerCase().includes(q) ||
                  row.items.some((it) => it.name.toLowerCase().includes(q))
                );
              }}
              pagination
              defaultPageSize={10}
              loading={loadingOrders}
              loadingLabel="Đang tải hàng đợi việc"
              error={ordersError}
              errorTitle="Không tải được hàng đợi việc"
              emptyState={
                hasPartner ? (
                  <EmptyState
                    live
                    icon={<ClipboardList className="size-5" />}
                    title="Chưa có đơn nào được giao cho xưởng bạn"
                    description={
                      `Hệ thống chưa giao đơn nào cho mã đối tác ${partnerId}. Hãy khai báo năng lực ` +
                      '(máy in, vật liệu) để sẵn sàng nhận việc, và quay lại đây khi có đơn được điều phối.'
                    }
                    action={
                      <>
                        <Button variant="primary" onClick={() => setActiveTab('machines')}>
                          Khai báo máy in
                        </Button>
                        <Button variant="secondary" onClick={() => setActiveTab('materials')}>
                          Khai báo vật liệu
                        </Button>
                      </>
                    }
                  />
                ) : (
                  <EmptyState
                    live
                    icon={<TriangleAlert className="size-5" />}
                    title="Chưa gắn mã đối tác xưởng"
                    description="Hồ sơ xưởng của bạn chưa có partner_id nên không có đơn nào được giao. Hãy nhờ quản trị viên gắn mã đối tác."
                    action={
                      <Button variant="secondary" onClick={() => setActiveTab('preferences')}>
                        Xem cấu hình xưởng
                      </Button>
                    }
                  />
                )
              }
            />
          </section>
        )}

        {/* ------------------------------- MÁY IN ------------------------------- */}
        {activeTab === 'machines' && (
          <section className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-base font-bold text-fg">
                  <Printer className="size-5 text-primary" aria-hidden="true" />
                  Máy in của xưởng bạn
                </h2>
                <p className="mt-0.5 text-xs text-fg-subtle">
                  Danh sách này lấy từ <code className="font-mono">workshop_machines</code> với{' '}
                  <code className="font-mono">workshop_id = {profile.id}</code>. Trạng thái do xưởng tự đặt,
                  không phải telemetry từ máy.
                </p>
              </div>
              <Button variant="primary" leadingIcon={<Printer className="size-4" />} onClick={() => openMachineModal()}>
                Khai báo máy in
              </Button>
            </div>

            <DataTable<MyMachine>
              columns={machineColumns}
              rows={machines}
              getRowId={(row) => row.id}
              caption="Máy in của xưởng"
              tableLabel="Máy in của xưởng"
              pagination={false}
              error={machinesError}
              errorTitle="Không tải được danh sách máy in"
              emptyState={
                <EmptyState
                  live
                  icon={<Printer className="size-5" />}
                  title="Xưởng bạn chưa khai máy in nào"
                  description="Chưa có hàng nào trong workshop_machines cho hồ sơ xưởng này. Khai báo máy in đầu tiên để bắt đầu nhận việc."
                  action={
                    <Button variant="primary" onClick={() => openMachineModal()}>
                      Khai báo máy in đầu tiên
                    </Button>
                  }
                />
              }
            />
          </section>
        )}

        {/* ---------------------------- VẬT LIỆU & KHO ---------------------------- */}
        {activeTab === 'materials' && (
          <section className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-base font-bold text-fg">
                  <Layers className="size-5 text-primary" aria-hidden="true" />
                  Vật liệu & tồn kho của xưởng bạn
                </h2>
                <p className="mt-0.5 text-xs text-fg-subtle">
                  Tồn kho để trống nghĩa là <strong>chưa từng ghi nhận</strong> (khác với 0 g). Đơn giá để
                  trống nghĩa là <strong>chưa khai</strong>.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="secondary" leadingIcon={<ArrowDownToLine className="size-4" />} onClick={() => openLogModal()}>
                  Ghi phiếu kho
                </Button>
                <Button variant="primary" leadingIcon={<Layers className="size-4" />} onClick={() => openMaterialModal()}>
                  Khai báo vật liệu
                </Button>
              </div>
            </div>

            <DataTable<MyMaterial>
              columns={materialColumns}
              rows={materials}
              getRowId={(row) => row.id}
              caption="Vật liệu của xưởng"
              tableLabel="Vật liệu của xưởng"
              pagination={false}
              error={materialsError}
              errorTitle="Không tải được danh sách vật liệu"
              emptyState={
                <EmptyState
                  live
                  icon={<Layers className="size-5" />}
                  title="Xưởng bạn chưa khai vật liệu nào"
                  description="Chưa có hàng nào trong workshop_materials cho hồ sơ xưởng này. Khai báo cuộn phôi đầu tiên rồi ghi phiếu nhập để theo dõi tồn."
                  action={
                    <Button variant="primary" onClick={() => openMaterialModal()}>
                      Khai báo vật liệu đầu tiên
                    </Button>
                  }
                />
              }
            />

            {materialCatalog.length > 0 ? (
              <Card padding="md">
                <p className="text-xs font-semibold text-fg">Danh mục vật liệu tham chiếu của VCUBE</p>
                <p className="mt-1 text-xs text-fg-subtle">
                  Đây là danh mục dùng chung của nền tảng, <strong>không phải</strong> tồn kho của xưởng bạn.
                  Dùng để đối chiếu tên/loại khi khai báo.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {materialCatalog.map((m) => (
                    <Badge key={m.id} variant="neutral">
                      {m.name}
                      {m.type ? ` · ${m.type}` : ''}
                    </Badge>
                  ))}
                </div>
              </Card>
            ) : null}
          </section>
        )}

        {/* ------------------------------ PHỤ KIỆN ------------------------------ */}
        {activeTab === 'accessories' && (
          <section className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-base font-bold text-fg">
                  <Package className="size-5 text-primary" aria-hidden="true" />
                  Phụ kiện riêng của xưởng bạn
                </h2>
                <p className="mt-0.5 text-xs text-fg-subtle">
                  Chỉ hiển thị bản ghi <code className="font-mono">workshop_accessories.workshop_id = {profile.id}</code>.
                  Phụ kiện dùng chung của nền tảng không thuộc năng lực riêng của xưởng nên không liệt kê ở đây.
                </p>
              </div>
              <Button variant="primary" leadingIcon={<Package className="size-4" />} onClick={() => openAccModal()}>
                Khai báo phụ kiện
              </Button>
            </div>

            <DataTable<MyAccessory>
              columns={accessoryColumns}
              rows={accessories}
              getRowId={(row) => row.id}
              caption="Phụ kiện của xưởng"
              tableLabel="Phụ kiện của xưởng"
              pagination={false}
              error={accessoriesError}
              errorTitle="Không tải được danh sách phụ kiện"
              emptyState={
                <EmptyState
                  live
                  icon={<Package className="size-5" />}
                  title="Xưởng bạn chưa khai phụ kiện nào"
                  description="Chưa có hàng nào trong workshop_accessories cho hồ sơ xưởng này. Khai báo ốc cấy nhiệt, nam châm, hộp đóng gói… nếu xưởng có dùng."
                  action={
                    <Button variant="primary" onClick={() => openAccModal()}>
                      Khai báo phụ kiện đầu tiên
                    </Button>
                  }
                />
              }
            />
          </section>
        )}

        {/* ------------------------------- SỔ KHO ------------------------------- */}
        {activeTab === 'audit_trail' && (
          <section className="space-y-4">
            <div>
              <h2 className="flex items-center gap-2 text-base font-bold text-fg">
                <ArrowUpRight className="size-5 text-primary" aria-hidden="true" />
                Sổ kho của xưởng bạn
              </h2>
              <p className="mt-0.5 text-xs text-fg-subtle">
                Mọi dòng đều thuộc vật liệu của xưởng bạn. Người ghi là danh tính phiên đăng nhập thật.
              </p>
            </div>

            <DataTable<MyInventoryLog>
              columns={logColumns}
              rows={logs}
              getRowId={(row) => row.id}
              caption="Sổ kho của xưởng"
              tableLabel="Sổ kho của xưởng"
              filterable
              filterPlaceholder="Tìm theo mã lô, nhà cung cấp, ghi chú…"
              filterFn={(row, query) => {
                const q = query.trim().toLowerCase();
                if (!q) return true;
                return (
                  row.batchCode.toLowerCase().includes(q) ||
                  String(row.supplier || '').toLowerCase().includes(q) ||
                  row.note.toLowerCase().includes(q)
                );
              }}
              defaultSort={[{ key: 'createdAt', direction: 'desc' }]}
              pagination
              defaultPageSize={10}
              error={logsError}
              errorTitle="Không tải được sổ kho"
              emptyState={
                <EmptyState
                  live
                  icon={<ArrowUpRight className="size-5" />}
                  title="Sổ kho chưa có dòng nào"
                  description={
                    materials.length === 0
                      ? 'Chưa có vật liệu nào nên chưa thể có phiếu kho. Hãy khai báo vật liệu trước.'
                      : 'Chưa có phiếu nhập/xuất nào được ghi cho vật liệu của xưởng bạn.'
                  }
                  action={
                    materials.length === 0 ? (
                      <Button variant="primary" onClick={() => setActiveTab('materials')}>
                        Khai báo vật liệu
                      </Button>
                    ) : (
                      <Button variant="primary" onClick={() => openLogModal()}>
                        Ghi phiếu kho đầu tiên
                      </Button>
                    )
                  }
                />
              }
            />
          </section>
        )}

        {/* ---------------------------- CẤU HÌNH XƯỞNG ---------------------------- */}
        {activeTab === 'preferences' && (
          <section className="max-w-3xl">
            <Card padding="lg">
              <form onSubmit={handleSavePreferences} className="flex flex-col gap-5">
                <div>
                  <h2 className="flex items-center gap-2 text-base font-bold text-fg">
                    <Settings className="size-5 text-primary" aria-hidden="true" />
                    Cấu hình xưởng & đơn giá riêng
                  </h2>
                  <p className="mt-0.5 text-xs text-fg-subtle">
                    Đơn giá điện và nhân công dưới đây là <strong>của riêng xưởng bạn</strong>. Để trống nghĩa
                    là <strong>chưa cấu hình</strong> — hệ thống sẽ không tự điền một con số nào thay bạn.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="Tên xưởng in" required>
                    {(control) => (
                      <Input {...control} value={prefName} onChange={(e) => setPrefName(e.target.value)} />
                    )}
                  </Field>

                  <Field label="Khu vực điều phối">
                    {(control) => (
                      <Select
                        {...control}
                        options={REGION_OPTIONS}
                        value={prefRegion}
                        onChange={(e) => setPrefRegion(e.target.value)}
                      />
                    )}
                  </Field>

                  <Field label="Số điện thoại liên hệ">
                    {(control) => (
                      <Input
                        {...control}
                        value={prefPhone}
                        onChange={(e) => setPrefPhone(digitsOnly(e.target.value))}
                      />
                    )}
                  </Field>

                  <Field label="Email kỹ thuật">
                    {(control) => (
                      <Input
                        {...control}
                        type="email"
                        value={prefEmail}
                        onChange={(e) => setPrefEmail(e.target.value)}
                      />
                    )}
                  </Field>
                </div>

                <Field label="Địa chỉ xưởng thực tế">
                  {(control) => (
                    <Input {...control} value={prefAddress} onChange={(e) => setPrefAddress(e.target.value)} />
                  )}
                </Field>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Card padding="md">
                    <Field
                      label="Đơn giá điện xưởng (VND/kWh)"
                      hint="Để trống = chưa cấu hình. Trang này không lấy và không ghi cấu hình giá toàn hệ thống."
                    >
                      {(control) => (
                        <Input
                          {...control}
                          numeric
                          value={prefElectricity}
                          onChange={(e) => setPrefElectricity(e.target.value.replace(/[^\d]/g, ''))}
                          placeholder="—"
                        />
                      )}
                    </Field>
                    <p className="mt-2 text-xs text-fg-subtle">
                      Hiện tại:{' '}
                      {profile.electricityRateOverride != null ? (
                        <strong className="tabular-nums text-fg">
                          {formatCurrency(profile.electricityRateOverride)}/kWh
                        </strong>
                      ) : (
                        <strong className="text-warning">Chưa cấu hình</strong>
                      )}
                    </p>
                  </Card>

                  <Card padding="md">
                    <Field
                      label="Chi phí nhân công xưởng (VND/giờ)"
                      hint="Để trống = chưa cấu hình. Không dùng số mặc định nào của hệ thống."
                    >
                      {(control) => (
                        <Input
                          {...control}
                          numeric
                          value={prefLabor}
                          onChange={(e) => setPrefLabor(e.target.value.replace(/[^\d]/g, ''))}
                          placeholder="—"
                        />
                      )}
                    </Field>
                    <p className="mt-2 text-xs text-fg-subtle">
                      Hiện tại:{' '}
                      {profile.laborRateOverride != null ? (
                        <strong className="tabular-nums text-fg">
                          {formatCurrency(profile.laborRateOverride)}/giờ
                        </strong>
                      ) : (
                        <strong className="text-warning">Chưa cấu hình</strong>
                      )}
                    </p>
                  </Card>
                </div>

                <div className="flex justify-end border-t border-line-subtle pt-4">
                  <Button type="submit" variant="primary" loading={savingPref} loadingLabel="Đang lưu…">
                    Lưu cấu hình xưởng
                  </Button>
                </div>
              </form>
            </Card>

            <Card className="mt-4" padding="md">
              <p className="text-xs text-fg-muted">
                Cập nhật lần cuối:{' '}
                <strong>{profile.updatedAt ? formatDate(profile.updatedAt) : EMPTY_VALUE}</strong> · Mã hồ sơ:{' '}
                <code className="font-mono">{profile.id}</code>
              </p>
            </Card>
          </section>
        )}
      </div>

      {/* ---------------------------- MODAL: MÁY IN ---------------------------- */}
      <Modal
        open={machineModalOpen}
        onClose={() => setMachineModalOpen(false)}
        title={editingMachine ? 'Chỉnh sửa máy in' : 'Khai báo máy in'}
        description="Máy in thuộc xưởng của bạn. Trạng thái do bạn tự đặt, không phải telemetry."
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={() => setMachineModalOpen(false)}>
              Huỷ
            </Button>
            <Button variant="primary" type="submit" form="w1b-machine-form" loading={savingMachine} loadingLabel="Đang lưu…">
              {editingMachine ? 'Lưu thay đổi' : 'Thêm máy vào xưởng'}
            </Button>
          </div>
        }
      >
        <form id="w1b-machine-form" onSubmit={handleSaveMachine} className="flex flex-col gap-4">
          {fleetCatalog.length > 0 ? (
            <Field
              label="Gợi ý từ danh mục máy của VCUBE"
              hint="Chọn để điền sẵn tên và khổ in. Đây là danh mục tham chiếu, không phải máy của xưởng bạn."
              optionalLabel={null}
            >
              {(control) => (
                <Select
                  {...control}
                  placeholder="— Không dùng gợi ý —"
                  options={fleetCatalog.map((f) => ({ value: f.id, label: f.name }))}
                  value=""
                  onChange={(e) => applyFleetSuggestion(e.target.value)}
                />
              )}
            </Field>
          ) : null}

          <Field label="Tên máy in" required>
            {(control) => <Input {...control} value={mName} onChange={(e) => setMName(e.target.value)} />}
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Công nghệ">
              {(control) => (
                <Select
                  {...control}
                  value={mTechnology}
                  onChange={(e) => setMTechnology(e.target.value)}
                  options={[
                    { value: 'FDM', label: 'FDM / FFF (sợi nhựa)' },
                    { value: 'SLA', label: 'SLA / Resin quang hoá' },
                    { value: 'SLS', label: 'SLS (bột laser)' },
                    { value: 'PolyJet', label: 'PolyJet' },
                  ]}
                />
              )}
            </Field>

            <Field label="Trạng thái">
              {(control) => (
                <Select
                  {...control}
                  value={mStatus}
                  onChange={(e) => setMStatus(e.target.value)}
                  options={MY_MACHINE_STATUSES.map((st) => ({
                    value: st,
                    label: MY_MACHINE_STATUS_LABELS[st] ?? st,
                  }))}
                />
              )}
            </Field>
          </div>

          <Field label="Đơn giá giờ máy (VND/giờ)" hint="Để trống = chưa khai.">
            {(control) => (
              <Input
                {...control}
                numeric
                value={mHourlyRate}
                onChange={(e) => setMHourlyRate(e.target.value.replace(/[^\d]/g, ''))}
                placeholder="—"
              />
            )}
          </Field>

          <Field label="Khổ in (X × Y × Z mm)" hint="Để trống = chưa khai.">
            {() => (
              <div className="grid grid-cols-3 gap-2">
                {(['x', 'y', 'z'] as const).map((axis) => (
                  <Input
                    key={axis}
                    numeric
                    value={mVol[axis]}
                    aria-label={`Khổ in trục ${axis.toUpperCase()}`}
                    placeholder={axis.toUpperCase()}
                    onChange={(e) =>
                      setMVol((prev) => ({ ...prev, [axis]: e.target.value.replace(/[^\d]/g, '') }))
                    }
                  />
                ))}
              </div>
            )}
          </Field>
        </form>
      </Modal>

      {/* --------------------------- MODAL: VẬT LIỆU --------------------------- */}
      <Modal
        open={materialModalOpen}
        onClose={() => setMaterialModalOpen(false)}
        title={editingMaterial ? 'Chỉnh sửa vật liệu' : 'Khai báo vật liệu'}
        description="Vật liệu thuộc kho của xưởng bạn."
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={() => setMaterialModalOpen(false)}>
              Huỷ
            </Button>
            <Button variant="primary" type="submit" form="w1b-material-form" loading={savingMaterial} loadingLabel="Đang lưu…">
              {editingMaterial ? 'Lưu thay đổi' : 'Thêm vào kho'}
            </Button>
          </div>
        }
      >
        <form id="w1b-material-form" onSubmit={handleSaveMaterial} className="flex flex-col gap-4">
          <Field label="Tên vật liệu" required>
            {(control) => <Input {...control} value={matName} onChange={(e) => setMatName(e.target.value)} />}
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Loại">
              {(control) => (
                <Select
                  {...control}
                  value={matType}
                  onChange={(e) => setMatType(e.target.value)}
                  options={['PLA', 'PETG', 'ABS', 'ASA', 'TPU', 'Nylon', 'Resin', 'Khác'].map((t) => ({
                    value: t,
                    label: t,
                  }))}
                />
              )}
            </Field>

            <Field label="Màu">
              {(control) => <Input {...control} value={matColor} onChange={(e) => setMatColor(e.target.value)} />}
            </Field>

            <Field label="Tồn kho (gram)">
              {(control) => (
                <Input
                  {...control}
                  numeric
                  value={matStock}
                  onChange={(e) => setMatStock(e.target.value.replace(/[^\d]/g, ''))}
                  placeholder="0"
                />
              )}
            </Field>

            <Field label="Ngưỡng cảnh báo (gram)">
              {(control) => (
                <Input
                  {...control}
                  numeric
                  value={matThreshold}
                  onChange={(e) => setMatThreshold(e.target.value.replace(/[^\d]/g, ''))}
                  placeholder="500"
                />
              )}
            </Field>
          </div>

          <Field label="Đơn giá (VND/kg)" hint="Để trống = chưa khai.">
            {(control) => (
              <Input
                {...control}
                numeric
                value={matPrice}
                onChange={(e) => setMatPrice(e.target.value.replace(/[^\d]/g, ''))}
                placeholder="—"
              />
            )}
          </Field>
        </form>
      </Modal>

      {/* ---------------------------- MODAL: PHIẾU KHO ---------------------------- */}
      <Modal
        open={logModalOpen}
        onClose={() => setLogModalOpen(false)}
        title="Phiếu nhập / xuất kho"
        description="Phiếu kho chỉ ghi cho vật liệu của xưởng bạn."
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={() => setLogModalOpen(false)}>
              Huỷ
            </Button>
            <Button variant="primary" type="submit" form="w1b-log-form" loading={savingLog} loadingLabel="Đang ghi…">
              Ghi phiếu kho
            </Button>
          </div>
        }
      >
        <form id="w1b-log-form" onSubmit={handleSaveLog} className="flex flex-col gap-4">
          <Field label="Vật liệu" required>
            {(control) => (
              <Select
                {...control}
                value={logMaterialId}
                onChange={(e) => setLogMaterialId(e.target.value)}
                options={materials.map((m) => ({
                  value: m.id,
                  label: `${m.name}${m.currentStockGrams != null ? ` — tồn ${formatNumber(m.currentStockGrams)} g` : ' — chưa ghi nhận tồn'}`,
                }))}
              />
            )}
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Loại phiếu" required>
              {(control) => (
                <Select
                  {...control}
                  value={logAction}
                  onChange={(e) => setLogAction(e.target.value as 'Import' | 'Export' | 'Adjustment')}
                  options={[
                    { value: 'Import', label: 'Nhập kho' },
                    { value: 'Export', label: 'Xuất in' },
                    { value: 'Adjustment', label: 'Điều chỉnh (đặt tồn theo số đếm thực tế)' },
                  ]}
                />
              )}
            </Field>

            <Field
              label="Khối lượng (gram)"
              required
              hint={logAction === 'Adjustment' ? 'Với phiếu điều chỉnh, số này là TỒN THỰC TẾ sau kiểm kê.' : undefined}
            >
              {(control) => (
                <Input
                  {...control}
                  numeric
                  value={logGrams}
                  onChange={(e) => setLogGrams(e.target.value.replace(/[^\d]/g, ''))}
                />
              )}
            </Field>

            <Field label="Đơn giá nhập (VND/kg)" hint="Để trống = không cập nhật giá vật liệu.">
              {(control) => (
                <Input
                  {...control}
                  numeric
                  value={logPrice}
                  onChange={(e) => setLogPrice(e.target.value.replace(/[^\d]/g, ''))}
                  placeholder="—"
                />
              )}
            </Field>

            <Field label="Mã lô">
              {(control) => <Input {...control} value={logBatch} onChange={(e) => setLogBatch(e.target.value)} />}
            </Field>
          </div>

          <Field label="Nhà cung cấp">
            {(control) => <Input {...control} value={logSupplier} onChange={(e) => setLogSupplier(e.target.value)} />}
          </Field>

          <Field label="Ghi chú">
            {(control) => <Input {...control} value={logNote} onChange={(e) => setLogNote(e.target.value)} />}
          </Field>

          <p className="text-xs text-fg-subtle">
            Người ghi phiếu sẽ là <strong>{user?.email || 'chưa xác định'}</strong> (danh tính phiên đăng nhập).
          </p>
        </form>
      </Modal>

      {/* ---------------------------- MODAL: PHỤ KIỆN ---------------------------- */}
      <Modal
        open={accModalOpen}
        onClose={() => setAccModalOpen(false)}
        title={editingAcc ? 'Chỉnh sửa phụ kiện' : 'Khai báo phụ kiện'}
        description="Phụ kiện riêng của xưởng bạn."
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={() => setAccModalOpen(false)}>
              Huỷ
            </Button>
            <Button variant="primary" type="submit" form="w1b-acc-form" loading={savingAcc} loadingLabel="Đang lưu…">
              {editingAcc ? 'Lưu thay đổi' : 'Thêm phụ kiện'}
            </Button>
          </div>
        }
      >
        <form id="w1b-acc-form" onSubmit={handleSaveAcc} className="flex flex-col gap-4">
          <Field label="Tên phụ kiện" required>
            {(control) => <Input {...control} value={accName} onChange={(e) => setAccName(e.target.value)} />}
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Số lượng">
              {(control) => (
                <Input
                  {...control}
                  numeric
                  value={accQty}
                  onChange={(e) => setAccQty(e.target.value.replace(/[^\d]/g, ''))}
                  placeholder="0"
                />
              )}
            </Field>

            <Field label="Đơn vị">
              {(control) => <Input {...control} value={accUnit} onChange={(e) => setAccUnit(e.target.value)} />}
            </Field>
          </div>

          <Field label="Mã SKU">
            {(control) => <Input {...control} value={accSku} onChange={(e) => setAccSku(e.target.value)} />}
          </Field>
        </form>
      </Modal>
    </div>
  );
};

export default WorkshopSettingsView;
