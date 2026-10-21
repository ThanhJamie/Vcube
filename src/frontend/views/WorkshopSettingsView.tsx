import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { formatNumber } from '@frontend/lib/format';
import { useAuth } from '../context/AuthContext';
import { MES_PIPELINE_STAGES } from '../components/OrderProgress';
import { workshopService, MY_MACHINE_STATUS_LABELS, MY_ORDER_STATUS_BY_STAGE, type MaterialCatalogRef, type MyAccessory, type MyInventoryLog, type MyMachine, type MyMaterial, type MyQueueOrder, type MyWorkshopProfile, type PrinterFleetRef } from '@backend/services/workshopService';
import { SettingsHeader } from '../components/workshop/settings/SettingsHeader';
import { SettingsBanners } from '../components/workshop/settings/SettingsBanners';
import { SettingsLoadingState, SettingsErrorState, SettingsMissingProfile } from '../components/workshop/settings/SettingsStates';
import { WorkshopStatsCards } from '../components/workshop/settings/WorkshopStatsCards';
import { QueueTab } from '../components/workshop/settings/QueueTab';
import { MachinesTab } from '../components/workshop/settings/MachinesTab';
import { MaterialsTab } from '../components/workshop/settings/MaterialsTab';
import { AccessoriesTab } from '../components/workshop/settings/AccessoriesTab';
import { AuditTrailTab } from '../components/workshop/settings/AuditTrailTab';
import { PreferencesTab } from '../components/workshop/settings/PreferencesTab';
import { MachineModal } from '../components/workshop/settings/MachineModal';
import { MaterialModal } from '../components/workshop/settings/MaterialModal';
import { InventoryLogModal } from '../components/workshop/settings/InventoryLogModal';
import { AccessoryModal } from '../components/workshop/settings/AccessoryModal';
import { LAB_TAB_IDS, type TabId } from '../components/workshop/settings/tabs';
import { parseRateInput } from '../components/workshop/settings/helpers';
import type { WorkshopSettingsController } from '../components/workshop/settings/types';

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
  const [loadingMachines, setLoadingMachines] = useState(false);

  const [materials, setMaterials] = useState<MyMaterial[]>([]);
  const [materialsError, setMaterialsError] = useState<string | null>(null);
  const [loadingMaterials, setLoadingMaterials] = useState(false);

  const [logs, setLogs] = useState<MyInventoryLog[]>([]);
  const [logsError, setLogsError] = useState<string | null>(null);

  const [accessories, setAccessories] = useState<MyAccessory[]>([]);
  const [accessoriesError, setAccessoriesError] = useState<string | null>(null);
  const [loadingAccessories, setLoadingAccessories] = useState(false);

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
  /** Hàng đợi việc: xem dạng danh sách (thao tác) hay Kanban 4 bước (tổng quan). */
  const [queueView, setQueueView] = useState<'list' | 'board'>('list');

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
    setProfileError(res.error ?? null);
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
    setOrdersError(res.error ?? null);
    setLoadingOrders(false);
  }, [partnerId]);

  const loadMachines = useCallback(async () => {
    if (!workshopKey) return;
    setLoadingMachines(true);
    const res = await workshopService.getMyMachines(workshopKey);
    setMachines(res.data);
    setMachinesError(res.error ?? null);
    setLoadingMachines(false);
  }, [workshopKey]);

  const loadMaterialsAndLogs = useCallback(async () => {
    if (!workshopKey) return;
    setLoadingMaterials(true);
    const res = await workshopService.getMyMaterials(workshopKey);
    setMaterials(res.data);
    setMaterialsError(res.error ?? null);
    const logRes = await workshopService.getMyInventoryLogs(res.data.map((m) => m.id));
    setLogs(logRes.data);
    setLogsError(logRes.error ?? null);
    setLoadingMaterials(false);
  }, [workshopKey]);

  const loadAccessories = useCallback(async () => {
    if (!workshopKey) return;
    setLoadingAccessories(true);
    const res = await workshopService.getMyAccessories(workshopKey);
    setAccessories(res.data);
    setAccessoriesError(res.error ?? null);
    setLoadingAccessories(false);
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

  /**
   * 8 nấc MES dừng ở "Xuất xưởng giao" (status `shipping`). Đơn chỉ thực sự kết thúc khi xưởng
   * xác nhận ĐÃ GIAO: đặt `status='completed'` (giữ nấc cuối) — trước đây không có đường nào
   * đưa đơn tới `completed`.
   */
  const handleMarkDelivered = (order: MyQueueOrder) => {
    if (!partnerId) {
      notify('Tài khoản chưa được gắn mã đối tác xưởng.', 'warning');
      return;
    }
    setBusyOrderId(order.id);
    void workshopService
      .updateMyOrderProgress({
        orderId: order.id,
        partnerId,
        stageIndex: 7,
        status: 'completed',
        layerProgress: 100,
      })
      .then((res) => {
        if (!res.success) {
          notify(`Chưa đánh dấu được đã giao cho ${order.orderNumber}: ${res.error}`, 'error');
          return;
        }
        setOrders((prev) =>
          prev.map((o) =>
            o.id === order.id
              ? { ...o, statusStageIndex: 7, status: 'completed', layerProgress: 100 }
              : o,
          ),
        );
        const sd = res.stockDeduction;
        notify(
          `Đơn ${order.orderNumber} đã hoàn tất (đã giao).` +
            (sd
              ? ` Kho: đã trừ ${sd.deducted} vật liệu${sd.skipped > 0 ? `, bỏ qua ${sd.skipped} (chưa khai khối lượng)` : ''}.`
              : ''),
          'success',
        );
      })
      .finally(() => setBusyOrderId(null));
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
        currentStockGrams: stock ?? null,
        lowStockThresholdGrams: threshold ?? null,
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

  if (authLoading || loadingProfile) {
    return <SettingsLoadingState />;
  }

  if (profileError) {
    return <SettingsErrorState profileError={profileError} onRetry={() => void loadProfile()} />;
  }

  if (!profile) {
    return <SettingsMissingProfile user={user} onNavigate={onNavigate} />;
  }

  const hasPartner = Boolean(partnerId);

  /** Controller (state + handler) truyền xuống component tab/modal; view cha giữ state + composition. */
  const controller: WorkshopSettingsController = {
    accModalOpen, accName,
    accQty, accSku,
    accUnit, accessories,
    accessoriesError, activeTab,
    applyFleetSuggestion, applyStage,
    authLoading, busyOrderId,
    duplicateProfiles, editingAcc,
    editingMachine, editingMaterial,
    fleetCatalog, handleAcceptJob,
    handleConfirmDone, handleDeleteAcc,
    handleDeleteMachine, handleDeleteMaterial,
    handleMachineStatus, handleMarkDelivered,
    handleSaveAcc, handleSaveLayerProgress,
    handleSaveLog, handleSaveMachine,
    handleSaveMaterial, handleSavePreferences,
    hasPartner, layerDraft,
    loadAccessories, loadMachines,
    loadMaterialsAndLogs, loadProfile,
    loadQueue, loadingAccessories,
    loadingMachines, loadingMaterials,
    loadingOrders, loadingProfile,
    logAction, logBatch,
    logGrams, logMaterialId,
    logModalOpen, logNote,
    logPrice, logSupplier,
    logs, logsError,
    mHourlyRate, mName,
    mStatus, mTechnology,
    mVol, machineModalOpen,
    machines, machinesError,
    matColor, matName,
    matPrice, matStock,
    matThreshold, matType,
    materialCatalog, materialModalOpen,
    materials, materialsError,
    onNavigate, openAccModal,
    openLogModal, openMachineModal,
    openMaterialModal, orders,
    ordersError, partnerId,
    prefAddress, prefElectricity,
    prefEmail, prefLabor,
    prefName, prefPhone,
    prefRegion, profile,
    profileError, queueView,
    refreshAll, savingAcc,
    savingLog, savingMachine,
    savingMaterial, savingPref,
    setAccModalOpen, setAccName,
    setAccQty, setAccSku,
    setAccUnit, setActiveTab,
    setBusyLabel, setLayerDraft,
    setLogAction, setLogBatch,
    setLogGrams, setLogMaterialId,
    setLogModalOpen, setLogNote,
    setLogPrice, setLogSupplier,
    setMHourlyRate, setMName,
    setMStatus, setMTechnology,
    setMVol, setMachineModalOpen,
    setMatColor, setMatName,
    setMatPrice, setMatStock,
    setMatThreshold, setMatType,
    setMaterialModalOpen, setPrefAddress,
    setPrefElectricity, setPrefEmail,
    setPrefLabor, setPrefName,
    setPrefPhone, setPrefRegion,
    setQueueView, user,
    workshopKey,
  };
  /* ------------------------------------------------------------------ */
  /* Render                                                              */
  /* ------------------------------------------------------------------ */
  return (
    <div className="flex w-full flex-col gap-section font-sans text-fg">
      <SettingsHeader ctl={controller} />

      {/* Nội dung giữ nguyên margin riêng của từng khối (`mb-6`…) nên KHÔNG thêm gap
          ở đây — thêm gap sẽ cộng dồn và làm nhịp dọc sai lệch. */}
      <div className="w-full">
        <SettingsBanners ctl={controller} />

        <WorkshopStatsCards ctl={controller} />
        {activeTab === 'queue' && <QueueTab ctl={controller} />}
        {activeTab === 'machines' && <MachinesTab ctl={controller} />}
        {activeTab === 'materials' && <MaterialsTab ctl={controller} />}
        {activeTab === 'accessories' && <AccessoriesTab ctl={controller} />}
        {activeTab === 'audit_trail' && <AuditTrailTab ctl={controller} />}
        {activeTab === 'preferences' && <PreferencesTab ctl={controller} />}
      </div>
      <MachineModal ctl={controller} />
      <MaterialModal ctl={controller} />
      <InventoryLogModal ctl={controller} />
      <AccessoryModal ctl={controller} />
    </div>
  );
};

export default WorkshopSettingsView;
