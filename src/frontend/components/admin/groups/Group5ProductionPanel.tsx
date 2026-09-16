import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  useProductionStore,
  KANBAN_STAGES,
  ProductionJob,
  ProductionRegion,
  ProductionStageKey,
  regionFromAddress,
} from '../../../../stores/useProductionStore';
import { Order } from '../../../types';
import { dbService } from '../../../../backend/supabase/database';
import { useLanguage } from '../../../context/LanguageContext';
import { EMPTY_VALUE } from '../../../lib/format';
import { Button, EmptyState, Icon, InfoTip, Modal } from '@frontend/ui';

/** Mục menu đang mở panel này (`/admin/queue` hoặc `/admin/orders`) — quyết định tab mặc định. */
export type ProductionPanelSection = 'queue' | 'orders';

interface Group5ProductionPanelProps {
  section?: ProductionPanelSection;
  onUpdateOrderStatus?: (orderId: string, newStageIndex: number, newStatus: Order['status'], progress?: number) => void;
  onNavigateTracking?: (order: Order) => void;
  onShowToast?: (message: string) => void;
  onNavigateSection?: (section: any) => void;
}

type ProductionTab = 'kanban' | 'dispatcher' | 'fleet';

/** `null`/`undefined`/NaN ⇒ `—` (docs/design/data-honesty.md). KHÔNG bịa `0`. */
const numOrDash = (v: number | null | undefined, suffix = ''): string =>
  typeof v === 'number' && Number.isFinite(v) ? `${v.toLocaleString('vi-VN')}${suffix}` : EMPTY_VALUE;

/** Nấc Kanban → `orders.status` (enum THẬT của cột — xem `20260901_baseline_schema.sql`). */
const STATUS_BY_STAGE: Record<ProductionStageKey, Order['status']> = {
  pending_payment: 'pending_payment',
  cad_prep: 'processing',
  slicing: 'processing',
  printing: 'printing',
  post_processing: 'post_processing',
  qc_inspection: 'packaging',
  packaging: 'packaging',
  delivering: 'shipping',
};

/** `orders.status` → nấc Kanban; CHỈ dùng khi `orders.status_stage_index` chưa được ghi. */
const STAGE_KEY_BY_STATUS: Record<Order['status'], ProductionStageKey> = {
  pending_payment: 'pending_payment',
  processing: 'cad_prep',
  printing: 'printing',
  post_processing: 'post_processing',
  packaging: 'packaging',
  shipping: 'delivering',
  completed: 'delivering',
  cancelled: 'pending_payment',
};

const stageIndexOf = (order: Order): number => {
  const reported = order.statusStageIndex;
  if (typeof reported === 'number' && KANBAN_STAGES[reported]) return reported;
  const key = STAGE_KEY_BY_STATUS[order.status] ?? 'pending_payment';
  const idx = KANBAN_STAGES.findIndex((s) => s.key === key);
  return idx >= 0 ? idx : 0;
};

/** `'20%'` → 20; chuỗi không phải số ⇒ `null` (KHÔNG thay bằng 25). */
const parsePercent = (raw?: string): number | null => {
  if (!raw) return null;
  const n = Number.parseFloat(String(raw).replace('%', '').trim());
  return Number.isFinite(n) ? n : null;
};

const uniqText = (values: (string | undefined)[]): string | null => {
  const out = Array.from(new Set(values.map((v) => (v || '').trim()).filter(Boolean)));
  return out.length > 0 ? out.join(', ') : null;
};

/**
 * `orders` (Supabase) → thẻ Kanban.
 *
 * LUẬT TRUNG THỰC: chỉ trường CÓ trong `orders`/`orders.items` mới được điền. Cột không tồn
 * tại (khối lượng gam, giờ in, layer height, màu hex, xưởng/máy được gán…) để `null` ⇒ UI
 * render `—`. Trước đây màn này đọc `localStorage: vcube_production_store_v1` với fixture BỊA
 * (PII khách, 480/705 layer, bedTempC…) nên mọi số đều không có nguồn.
 */
const orderToProductionJob = (order: Order): ProductionJob => {
  const items = Array.isArray(order.items) ? order.items : [];
  const address = order.shippingAddress || ({} as Order['shippingAddress']);
  const stageIndex = stageIndexOf(order);
  const stage = KANBAN_STAGES[stageIndex];
  // `orders.items` là jsonb: cột nào thiếu thì hiện `—`, không để chuỗi "undefined" lọt lên thẻ.
  const summary = items.length
    ? `${items
        .slice(0, 3)
        .map((i) => `${i.name || EMPTY_VALUE} ×${typeof i.quantity === 'number' ? i.quantity : EMPTY_VALUE}`)
        .join(', ')}${items.length > 3 ? ` +${items.length - 3}` : ''}`
    : null;
  const firstInfill = items.find((i) => (i.infill || '').trim());

  return {
    id: order.id,
    orderNumber: order.orderNumber || order.id,
    customerName: address.fullName || '',
    customerPhone: address.phone || '',
    customerAddress: address.address || '',
    customerCity: address.city || '',
    region: regionFromAddress(`${address.district || ''} ${address.city || ''} ${address.address || ''}`),
    stageIndex,
    stageKey: stage.key,
    itemsSummary: summary,
    materialName: uniqText(items.map((i) => i.material)),
    colorName: uniqText(items.map((i) => i.color)),
    // `orders.items[].color` là TÊN màu; bảng không có mã hex ⇒ không bịa màu.
    colorHex: null,
    layerHeightMm: null,
    infillPercent: parsePercent(firstInfill?.infill),
    totalGrams: null,
    estimatedPrintHours: null,
    estimatedDeliveryDate: order.estimatedDelivery || '',
    assignedWorkshopId: null,
    assignedWorkshopName: null,
    assignedPrinterId: null,
    assignedPrinterName: null,
    dispatchStatus: 'unassigned',
    layerProgress: typeof order.layerProgress === 'number' ? order.layerProgress : null,
    priority: 'normal',
    operatorNotes: '',
    createdAt: order.date || ''
  };
};

export const Group5ProductionPanel: React.FC<Group5ProductionPanelProps> = ({
  section,
  onUpdateOrderStatus,
  onNavigateTracking,
  onShowToast,
  onNavigateSection
}) => {
  const { language } = useLanguage();
  const isVi = language === 'vi';

  // Store CHỈ giữ trạng thái giao diện (bộ lọc / dòng đang chọn / danh sách trạm chưa nối nguồn).
  // Không còn `jobs` trong store và không còn `persist`: nguồn sự thật là bảng `orders`.
  const {
    workshops,
    selectedJobId,
    activeStageFilter,
    activeRegionFilter,
    activeWorkshopFilter,
    searchQuery,
    setSelectedJobId,
    setActiveStageFilter,
    setActiveRegionFilter,
    setActiveWorkshopFilter,
    setSearchQuery,
    calculateGeoDispatchRecommendation
  } = useProductionStore();

  // Tab mặc định theo MỤC MENU: `/admin/queue` → Kanban 8 nấc, `/admin/orders` → Điều phối.
  const [activeTab, setActiveTab] = useState<ProductionTab>(section === 'orders' ? 'dispatcher' : 'kanban');
  useEffect(() => {
    setActiveTab(section === 'orders' ? 'dispatcher' : 'kanban');
  }, [section]);

  const [editingJobNotes, setEditingJobNotes] = useState<string>('');
  const [qcNotesInput, setQcNotesInput] = useState<string>('');

  // ==========================================================================
  // ĐƠN THẬT TỪ SUPABASE — nguồn DUY NHẤT của bảng Kanban
  //
  // VÌ SAO KHÔNG đọc prop `orders` của App:
  //   `App.tsx:620` khởi tạo `useState<Order[]>([])` và KHÔNG có effect nào nạp `orders` từ
  //   Supabase (chỉ `handleOrderCompleted` thêm đơn vừa đặt trong phiên) ⇒ prop này không
  //   phân biệt được "bảng rỗng" với "truy vấn lỗi", và sau khi tải lại trang thì luôn rỗng.
  //   `dbService.getOrders()` NÉM lỗi thật nên mới dựng được 3 trạng thái loading / rỗng / lỗi.
  // ==========================================================================
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const rows = await dbService.getOrders();
      setOrders(Array.isArray(rows) ? rows : []);
    } catch (err: any) {
      // Lỗi thật ⇒ KHÔNG hiện 0 như thể bảng rỗng, KHÔNG rơi về fixture/localStorage.
      setOrders(null);
      setLoadError(err?.message || (isVi ? 'lỗi không xác định' : 'unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [isVi]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  /**
   * Trường KHÔNG có cột trong `orders` (ghi chú kỹ thuật, kết quả QC): giữ TRONG PHIÊN, không
   * ghi localStorage. Nói thẳng trong toast để không ai tưởng đã lưu xuống DB.
   */
  const [sessionPatches, setSessionPatches] = useState<
    Record<string, { operatorNotes?: string; qcInspectionPassed?: boolean; qcNotes?: string }>
  >({});

  const patchSession = (
    jobId: string,
    patch: { operatorNotes?: string; qcInspectionPassed?: boolean; qcNotes?: string }
  ) => setSessionPatches((prev) => ({ ...prev, [jobId]: { ...prev[jobId], ...patch } }));

  const jobs = useMemo<ProductionJob[]>(() => {
    // Đơn đã huỷ không còn nằm trong quy trình sản xuất.
    const live = (orders ?? []).filter((o) => o.status !== 'cancelled');
    return live.map((order) => {
      const job = orderToProductionJob(order);
      const patch = sessionPatches[job.id];
      return patch ? { ...job, ...patch } : job;
    });
  }, [orders, sessionPatches]);

  const selectedJob = jobs.find((j) => j.id === selectedJobId) || null;

  // Filter jobs
  const filteredJobs = jobs.filter((job) => {
    if (activeStageFilter !== 'all' && job.stageKey !== activeStageFilter) return false;
    if (activeRegionFilter !== 'all' && job.region !== activeRegionFilter) return false;
    if (activeWorkshopFilter !== 'all' && job.assignedWorkshopId !== activeWorkshopFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchNumber = job.orderNumber.toLowerCase().includes(q);
      const matchCustomer = job.customerName.toLowerCase().includes(q);
      const matchItem = (job.itemsSummary || '').toLowerCase().includes(q);
      const matchMat = (job.materialName || '').toLowerCase().includes(q);
      if (!matchNumber && !matchCustomer && !matchItem && !matchMat) return false;
    }
    return true;
  });

  /**
   * GHI NẤC SẢN XUẤT XUỐNG SUPABASE.
   *
   * Đây là lệnh ghi DUY NHẤT của bảng Kanban: `dbService.updateOrderStatus(orderId, stageIndex,
   * status)` (`src/backend/supabase/database.ts`) — hàm này trước đây KHÔNG có caller nào.
   * Thành công mới đọc lại DB rồi mới báo; thất bại thì hiện ĐÚNG lỗi nhận được.
   */
  const persistStage = async (job: ProductionJob, stageIndex: number, successMessage: string) => {
    const stage = KANBAN_STAGES[stageIndex];
    if (!stage) return false;
    const status = STATUS_BY_STAGE[stage.key];
    const result = await dbService.updateOrderStatus(job.id, stage.index, status);
    if (!result.success) {
      onShowToast?.(
        isVi
          ? `Cập nhật nấc sản xuất thất bại: ${result.error || 'lỗi không xác định'}`
          : `Failed to update production stage: ${result.error || 'unknown error'}`
      );
      return false;
    }
    // DB là nguồn duy nhất ⇒ đọc lại thay vì tự suy tiến độ trong RAM.
    await loadOrders();
    // Đồng bộ state đơn trong RAM của App (sau khi DB đã nhận — không phải nguồn sự thật).
    onUpdateOrderStatus?.(job.id, stage.index, status);
    onShowToast?.(successMessage);
    return true;
  };

  const handleAdvance = (jobId: string) => {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;
    if (job.stageIndex >= KANBAN_STAGES.length - 1) {
      onShowToast?.(isVi ? 'Đã hoàn tất quy trình sản xuất' : 'Production flow already complete');
      return;
    }
    const next = KANBAN_STAGES[job.stageIndex + 1];
    void persistStage(job, next.index, isVi ? `Đã chuyển sang: ${next.labelVi}` : `Advanced to: ${next.labelEn}`);
  };

  const handleRegress = (jobId: string) => {
    const job = jobs.find((j) => j.id === jobId);
    if (!job || job.stageIndex <= 0) return;
    const prev = KANBAN_STAGES[job.stageIndex - 1];
    void persistStage(job, prev.index, isVi ? `Đã lùi về: ${prev.shortVi}` : `Moved back to ${prev.labelEn}`);
  };

  const handleSetStage = (jobId: string, stageIndex: number) => {
    const job = jobs.find((j) => j.id === jobId);
    const stage = KANBAN_STAGES[stageIndex];
    if (!job || !stage) return;
    void persistStage(job, stage.index, isVi ? `Đã đặt nấc: ${stage.shortVi}` : `Stage set: ${stage.labelEn}`);
  };

  // Metrics — chưa tải xong thì `—`, KHÔNG hiện 0 như thể đã đo.
  const ordersReady = orders !== null;
  const totalJobs = jobs.length;
  const printingCount = jobs.filter((j) => j.stageKey === 'printing').length;
  const suggestedDispatchCount = jobs.filter((j) => j.dispatchStatus === 'suggested' || j.dispatchStatus === 'unassigned').length;

  /** 3 trạng thái THẬT của dữ liệu (loading / lỗi / rỗng) — dùng chung cho 2 tab đọc `orders`. */
  const renderOrdersGate = (emptyTitle: string, emptyDescription: string) => {
    if (loadError) {
      return (
        <div className="bg-danger-tint border border-danger/30 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2 text-danger font-bold text-sm">
            <Icon name="error" size={20} className="text-danger" />
            {isVi ? 'Không tải được đơn hàng từ Supabase' : 'Could not load orders from Supabase'}
          </div>
          <p className="text-xs font-tech text-danger break-all">{loadError}</p>
          <Button variant="secondary" size="sm" onClick={() => void loadOrders()}>
            {isVi ? 'Thử lại' : 'Retry'}
          </Button>
        </div>
      );
    }
    if (isLoading && orders === null) {
      return (
        <div className="bg-surface border border-line-subtle rounded-lg p-8 flex flex-col items-center gap-2 text-fg-muted text-xs font-tech">
          <Icon name="sync" size={28} className="animate-spin text-primary" />
          <span>{isVi ? 'ĐANG TẢI ĐƠN HÀNG THẬT TỪ SUPABASE…' : 'LOADING REAL ORDERS FROM SUPABASE…'}</span>
        </div>
      );
    }
    if (jobs.length === 0) {
      return (
        <EmptyState
          size="sm"
          title={emptyTitle}
          description={emptyDescription}
          icon={<Icon name="inbox" size={20} className="text-primary" />}
          action={
            <Button variant="secondary" size="sm" onClick={() => void loadOrders()}>
              {isVi ? 'Tải lại' : 'Reload'}
            </Button>
          }
        />
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Bar with MES Telemetry Summary */}
      <div className="bg-surface p-5 sm:p-6 rounded-lg shadow-e1">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-primary/10 text-primary font-tech text-xs font-bold rounded-md border border-primary/20 uppercase tracking-wider">
                VẬN HÀNH SẢN XUẤT
              </span>
            </div>
            <h2 className="text-lg font-bold text-fg mt-1.5 flex items-center gap-2.5">
              <Icon name="precision_manufacturing" size={24} className="text-primary" />
              {activeTab === 'dispatcher'
                ? isVi
                  ? 'Đơn Hàng & Điều Phối Trạm In'
                  : 'Orders & Workshop Dispatch'
                : isVi
                ? 'Hàng Đợi Chế Tác: Kanban 8 Nấc & Geo-Dispatcher'
                : 'MES Production: 8-Stage Kanban & Geo-Dispatcher'}
            </h2>
            <div className="mt-0.5">
              <InfoTip label={isVi ? 'Điều phối sản xuất hoạt động thế nào?' : 'How does production dispatch work?'}>
                {isVi
                  ? 'Thẻ Kanban là ĐƠN THẬT trong bảng orders; chuyển nấc ghi thẳng xuống Supabase. Điều phối trạm in cần trạm đã được khai báo.'
                  : 'Each Kanban card is a REAL order row; stage moves are written straight to Supabase. Dispatch needs declared workshops.'}
              </InfoTip>
            </div>
          </div>

          {/* Quick Metrics Badges */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="px-3.5 py-2 bg-canvas border border-line-subtle rounded-lg flex items-center gap-2">
              <Icon name="format_list_bulleted" size={20} className="text-fg-subtle" />
              <div>
                <div className="text-xs font-tech uppercase text-fg-subtle font-bold">Tổng Đơn Hàng Đợi</div>
                <div className="text-sm font-bold text-fg">{ordersReady ? `${totalJobs} jobs` : EMPTY_VALUE}</div>
              </div>
            </div>

            <div className="px-3.5 py-2 bg-positive-tint border border-positive/30 rounded-lg flex items-center gap-2">
              <Icon name="print" size={20} className="text-positive" />
              <div>
                <div className="text-xs font-tech uppercase text-positive font-bold">Đang Chạy Máy</div>
                <div className="text-sm font-bold text-positive">
                  {ordersReady ? `${printingCount} máy in` : EMPTY_VALUE}
                </div>
              </div>
            </div>

            <div className="px-3.5 py-2 bg-warning-tint border border-warning/30 rounded-lg flex items-center gap-2">
              <Icon name="share_location" size={20} className="text-warning" />
              <div>
                <div className="text-xs font-tech uppercase text-warning font-bold">Chưa Phân Bổ</div>
                <div className="text-sm font-bold text-warning">
                  {ordersReady ? `${suggestedDispatchCount} đơn` : EMPTY_VALUE}
                </div>
              </div>
            </div>

            <button
              onClick={() => void loadOrders()}
              disabled={isLoading}
              className="px-3 py-2 text-xs font-semibold text-fg-muted hover:text-fg hover:bg-surface-muted disabled:opacity-50 disabled:cursor-not-allowed rounded-lg border border-line-subtle transition-colors flex items-center gap-1 cursor-pointer"
              title={isVi ? 'Đọc lại đơn từ Supabase' : 'Reload orders from Supabase'}
            >
              <Icon name="refresh" size={16} />
              {isVi ? 'Tải lại' : 'Reload'}
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-5 pt-4 border-t border-line-subtle">
          <div className="flex items-center gap-1 bg-surface-muted p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('kanban')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'kanban'
                  ? 'bg-surface text-primary shadow-e1'
                  : 'text-fg-muted hover:text-fg'
              }`}
            >
              <Icon name="view_kanban" size={16} />
              {isVi ? 'Bảng Kanban 8 Nấc' : '8-Stage Kanban'}
              <span className="text-xs px-1.5 py-0.2 bg-line-subtle text-fg-muted rounded-full font-tech">
                {ordersReady ? filteredJobs.length : EMPTY_VALUE}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('dispatcher')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'dispatcher'
                  ? 'bg-surface text-primary shadow-e1'
                  : 'text-fg-muted hover:text-fg'
              }`}
            >
              <Icon name="hub" size={16} />
              {isVi ? 'Danh Sách Đơn & Điều Phối' : 'Orders & Dispatch'}
              {ordersReady && suggestedDispatchCount > 0 && (
                <span className="text-xs px-1.5 py-0.2 bg-warning-tint text-warning rounded-full font-tech">
                  {suggestedDispatchCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('fleet')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'fleet'
                  ? 'bg-surface text-primary shadow-e1'
                  : 'text-fg-muted hover:text-fg'
              }`}
            >
              <Icon name="factory" size={16} />
              {isVi ? 'Trạm Xưởng & Fleet Máy' : 'Workshop Fleet'}
              <span className="text-xs px-1.5 py-0.2 bg-line-subtle text-fg-muted rounded-full font-tech">
                {workshops.length} Hubs
              </span>
            </button>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isVi ? 'Tìm mã đơn, khách hàng, vật liệu...' : 'Search orders...'}
                className="pl-8 pr-3 py-1.5 bg-canvas border border-line-subtle rounded-lg text-xs text-fg placeholder:text-fg-subtle focus:outline-none focus:border-primary focus:bg-surface w-48 sm:w-64"
              />
              <Icon name="search" size={16} className="text-fg-subtle absolute left-2.5 top-2 pointer-events-none" />
              {searchQuery && (
                <button aria-label="Xoá tìm kiếm"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1.5 text-fg-subtle hover:text-fg-muted p-0.5"
                >
                  <Icon name="close" size={14} />
                </button>
              )}
            </div>

            {/* Region Filter — vùng miền suy từ địa chỉ thật; đơn không suy được nằm ở "Toàn Quốc" */}
            <div className="flex items-center gap-1 bg-canvas border border-line-subtle rounded-lg p-0.5 text-xs font-medium">
              {(['all', 'Bắc', 'Trung', 'Nam'] as const).map((reg) => (
                <button
                  key={reg}
                  onClick={() => setActiveRegionFilter(reg)}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    activeRegionFilter === reg
                      ? 'bg-primary text-primary-fg font-bold shadow-e1'
                      : 'text-fg-muted hover:text-fg'
                  }`}
                >
                  {reg === 'all' ? (isVi ? 'Toàn Quốc' : 'All') : `Miền ${reg}`}
                </button>
              ))}
            </div>

            {/* Workshop Filter */}
            <select
              value={activeWorkshopFilter}
              onChange={(e) => setActiveWorkshopFilter(e.target.value)}
              className="px-3 py-1.5 bg-canvas border border-line-subtle rounded-lg text-xs text-fg-muted font-medium focus:outline-none focus:border-primary"
            >
              <option value="all">{isVi ? 'Tất cả trạm MES' : 'All MES hubs'}</option>
              {workshops.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.region})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 2. TAB CONTENT: KANBAN BOARD */}
      {activeTab === 'kanban' &&
        (renderOrdersGate(
          isVi ? 'Chưa có đơn nào trong bảng orders' : 'No order in the orders table',
          isVi
            ? 'Supabase trả về 0 đơn (hoặc tài khoản này không được RLS cho đọc). Đơn sẽ xuất hiện ở đây ngay khi khách đặt hàng — không có hàng nào được tạo mẫu.'
            : 'Supabase returned 0 orders (or RLS does not let this account read them). Orders appear here as soon as customers place them; nothing is seeded.'
        ) ?? (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1 text-xs text-fg-muted">
              <span className="flex items-center gap-1.5">
                <Icon name="touch_app" size={16} className="text-primary" />
                <span>{isVi ? 'Chuyển nấc sản xuất trên từng thẻ' : 'Move a card to the next stage'}</span>
                <InfoTip label={isVi ? 'Cách chuyển nấc sản xuất' : 'How to move a card between stages'}>
                  {isVi
                    ? 'Bấm nút mũi tên trên thẻ để ghi nấc mới xuống Supabase (orders.status + orders.status_stage_index).'
                    : 'Press the arrow on a card to write the new stage to Supabase (orders.status + orders.status_stage_index).'}
                </InfoTip>
              </span>
              <span>Hiển thị {filteredJobs.length} / {jobs.length} đơn</span>
            </div>

            {/* Kanban 8 Columns Horizontal Scroll Container */}
            <div className="overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-300">
              <div className="flex items-start gap-3.5 min-w-[2100px]">
                {KANBAN_STAGES.map((stage) => {
                  const stageJobs = filteredJobs.filter((j) => j.stageIndex === stage.index);

                  return (
                    <div
                      key={stage.key}
                      className="w-[260px] shrink-0 bg-surface-muted/80 border border-line-subtle rounded-lg p-3 flex flex-col max-h-[780px]"
                    >
                      {/* Column Header */}
                      <div className="pb-2.5 mb-2 border-b border-line-subtle flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`w-7 h-7 rounded-sm ${stage.bgColor} ${stage.color} flex items-center justify-center shrink-0 border ${stage.borderColor}`}>
                            <Icon name={stage.icon} size={16} />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-xs font-bold text-fg truncate">
                              {isVi ? stage.shortVi : stage.key}
                            </h3>
                            <p className="text-xs text-fg-subtle truncate">{stage.role}</p>
                          </div>
                        </div>

                        <span className={`text-xs font-tech font-bold px-2 py-0.5 rounded-full ${
                          stageJobs.length > 0 ? 'bg-surface text-fg border border-line shadow-e0' : 'bg-line-subtle text-fg-muted'
                        }`}>
                          {stageJobs.length}
                        </span>
                      </div>

                      {/* Column Job Cards List */}
                      <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5 scrollbar-thin scrollbar-thumb-slate-300">
                        {stageJobs.length === 0 ? (
                          <div className="py-8 text-center text-fg-subtle text-xs border border-dashed border-line-subtle rounded-lg">
                            <Icon name="inbox" size={24} className="block mb-1 text-fg-subtle" />
                            {isVi ? 'Không có đơn ở nấc này' : 'Empty stage'}
                          </div>
                        ) : (
                          stageJobs.map((job) => (
                            <div
                              key={job.id}
                              className="bg-surface border border-line-subtle rounded-lg p-3 shadow-e0 hover:shadow-e1 hover:border-primary/40 transition-all text-xs space-y-2 group"
                            >
                              {/* Card Top: Order Number & Priority */}
                              <div className="flex items-center justify-between">
                                <span className="font-tech font-bold text-xs text-primary flex items-center gap-1">
                                  {job.orderNumber}
                                </span>

                                <div className="flex items-center gap-1">
                                  {/* Region Tag */}
                                  <span className={`text-xs font-tech font-bold px-1.5 py-0.2 rounded-sm ${
                                    job.region === 'Bắc'
                                      ? 'bg-info-tint text-info border border-info/30'
                                      : job.region === 'Trung'
                                      ? 'bg-positive-tint text-positive border border-positive/30'
                                      : job.region === 'Nam'
                                      ? 'bg-info-tint text-info border border-info/30'
                                      : 'bg-surface-muted text-fg-muted border border-line-subtle'
                                  }`}>
                                    {job.region === 'Chưa rõ' ? (isVi ? 'Chưa rõ khu vực' : 'Region unknown') : `Miền ${job.region}`}
                                  </span>

                                  {/* Priority Badge — `orders` chưa có cột ưu tiên nên không tự bật */}
                                  {job.priority === 'urgent' && (
                                    <span className="text-xs font-tech font-bold px-1.5 py-0.2 rounded-sm bg-danger-tint text-danger border border-danger/30">
                                      Hỏa tốc
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Customer & Items */}
                              <div>
                                <div className="font-bold text-fg truncate">{job.customerName || EMPTY_VALUE}</div>
                                <div className="text-xs text-fg-subtle line-clamp-2 mt-0.5">
                                  {job.itemsSummary ?? EMPTY_VALUE}
                                </div>
                              </div>

                              {/* Material & Specs */}
                              <div className="flex items-center gap-1.5 text-xs text-fg-muted bg-canvas p-1.5 rounded-sm">
                                {job.colorHex && (
                                  <span
                                    className="w-2.5 h-2.5 rounded-full shrink-0 border border-line"
                                    style={{ backgroundColor: job.colorHex }}
                                  />
                                )}
                                <span className="truncate font-medium">{job.materialName ?? EMPTY_VALUE}</span>
                                <span className="text-fg-subtle">|</span>
                                <span className="font-tech font-semibold shrink-0">{numOrDash(job.totalGrams, 'g')}</span>
                              </div>

                              {/* Dispatch status & Assigned Machine */}
                              <div className="text-xs space-y-1">
                                {job.assignedWorkshopName ? (
                                  <div className="flex items-center gap-1 text-fg-muted truncate" title={job.assignedWorkshopName}>
                                    <Icon name="factory" size={14} className="text-primary" />
                                    <span className="truncate">{job.assignedWorkshopName}</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1 text-warning bg-warning-tint px-1.5 py-0.5 rounded-sm border border-warning/30">
                                    <Icon name="warning" size={14} />
                                    <span>Chưa điều phối trạm xưởng</span>
                                  </div>
                                )}

                                {job.assignedPrinterName && (
                                  <div className="flex items-center gap-1 text-positive font-medium">
                                    <Icon name="print" size={14} />
                                    <span className="truncate">{job.assignedPrinterName}</span>
                                  </div>
                                )}
                              </div>

                              {/* Progress bar — `orders.layer_progress` chưa báo ⇒ `—`, không vẽ 0% */}
                              <div>
                                <div className="flex items-center justify-between text-xs text-fg-subtle mb-1 font-tech">
                                  <span>Tiến độ nấc</span>
                                  <span className="font-bold text-fg">{numOrDash(job.layerProgress, '%')}</span>
                                </div>
                                <div className="w-full h-1.5 bg-surface-muted rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-primary rounded-full transition-all duration-300"
                                    style={{
                                      width: `${
                                        typeof job.layerProgress === 'number'
                                          ? Math.min(100, Math.max(0, job.layerProgress))
                                          : 0
                                      }%`
                                    }}
                                  />
                                </div>
                              </div>

                              {/* Operator Note preview (chỉ trong phiên) */}
                              {job.operatorNotes && (
                                <p className="text-xs text-fg-muted italic bg-warning-tint/50 p-1 rounded-sm border border-warning/30 line-clamp-1">
                                  {job.operatorNotes}
                                </p>
                              )}

                              {/* Card Action Controls */}
                              <div className="pt-2 border-t border-line-subtle flex items-center justify-between gap-1">
                                <button
                                  onClick={() => {
                                    setSelectedJobId(job.id);
                                    setEditingJobNotes(job.operatorNotes);
                                    setQcNotesInput(job.qcNotes || '');
                                  }}
                                  className="px-2 py-1 text-xs font-semibold text-fg-muted hover:text-primary hover:bg-canvas rounded-md transition-colors flex items-center gap-0.5 cursor-pointer"
                                >
                                  <Icon name="info" size={14} />
                                  Chi tiết
                                </button>

                                <div className="flex items-center gap-1">
                                  {stage.index > 0 && (
                                    <button
                                      onClick={() => handleRegress(job.id)}
                                      className="p-1 text-fg-subtle hover:text-fg-muted hover:bg-surface-muted rounded-md transition-colors cursor-pointer"
                                      title="Lùi lại 1 nấc"
                                    >
                                      <Icon name="arrow_back" size={16} />
                                    </button>
                                  )}

                                  {stage.index < KANBAN_STAGES.length - 1 && (
                                    <button
                                      onClick={() => handleAdvance(job.id)}
                                      className="px-2.5 py-1 bg-primary hover:bg-primary-hover text-primary-fg rounded-md text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-e0"
                                      title={`Chuyển sang: ${KANBAN_STAGES[stage.index + 1].shortVi}`}
                                    >
                                      <span>Tiếp</span>
                                      <Icon name="arrow_forward" size={14} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}

      {/* 3. TAB CONTENT: ORDER LIST & DISPATCH */}
      {activeTab === 'dispatcher' &&
        (renderOrdersGate(
          isVi ? 'Chưa có đơn nào trong bảng orders' : 'No order in the orders table',
          isVi
            ? 'Không có đơn THẬT nào để phân bổ. Danh sách này chỉ dựng từ bảng orders — không có đơn mẫu.'
            : 'No REAL order to allocate. This list is built from the orders table only — nothing is seeded.'
        ) ?? (
          <div className="space-y-4">
            <div className="bg-warning-tint border border-warning/30 p-4 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-md bg-warning-tint text-warning flex items-center justify-center shrink-0 shadow-e1">
                  <Icon name="share_location" size={24} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-warning">
                    Phân Bổ Đơn Về Trạm Xưởng (Geo-Dispatch &amp; Fleet Allocation)
                  </h3>
                  <p className="text-xs text-warning mt-0.5">
                    {isVi
                      ? 'Danh sách đơn THẬT chưa được phân bổ. Vùng miền suy từ địa chỉ giao hàng; đề xuất chỉ xuất hiện khi đã có trạm in được khai báo.'
                      : 'REAL orders not yet allocated. Region is inferred from the shipping address; a recommendation appears only once a workshop is declared.'}
                  </p>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                <span className="text-xs font-tech font-bold px-2.5 py-1 rounded-lg bg-surface text-warning border border-warning/30 shadow-e0">
                  {suggestedDispatchCount} đơn chưa phân bổ
                </span>
              </div>
            </div>

            {/* Chưa có trạm in nào ⇒ không thể chốt phân bổ: nói thẳng, KHÔNG hiện nút "thành công giả" */}
            {workshops.length === 0 && (
              <div className="bg-canvas border border-line-subtle rounded-lg p-3 text-xs text-fg-muted flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="flex items-start gap-1.5">
                  <Icon name="info" size={16} className="text-primary shrink-0 mt-0.5" />
                  <span>
                    {isVi
                      ? 'Chưa có trạm in nào được khai báo và hệ thống chưa có đường ghi orders.assigned_workshop_id, nên nút xác nhận điều phối đã được gỡ thay vì báo thành công mà không lưu được gì.'
                      : 'No workshop is declared and there is no write path for orders.assigned_workshop_id yet, so the confirm-dispatch buttons were removed instead of reporting a success that stores nothing.'}
                  </span>
                </span>
                <Button variant="secondary" size="sm" onClick={() => onNavigateSection?.('partners')}>
                  {isVi ? 'Khai trạm in' : 'Declare workshops'}
                </Button>
              </div>
            )}

            {filteredJobs.length === 0 ? (
              <EmptyState
                size="sm"
                title={isVi ? 'Không có đơn nào khớp bộ lọc' : 'No order matches the filters'}
                description={
                  isVi
                    ? 'Không đơn nào khớp bộ lọc vùng/xưởng hiện tại nên danh sách trống.'
                    : 'No order matches the current region/workshop filter, so the list is empty.'
                }
                icon={<Icon name="share_location" size={20} className="text-primary" />}
                action={
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setActiveTab('kanban')}
                  >
                    {isVi ? 'Xem Kanban 8 Nấc' : 'Open 8-stage Kanban'}
                  </Button>
                }
              />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredJobs.map((job) => {
                  const rec = calculateGeoDispatchRecommendation(job);
                  const hasWorkshop = rec.workshopId !== '';

                  return (
                    <div
                      key={job.id}
                      className="bg-surface border border-line-subtle rounded-lg p-5 shadow-e1 transition-all space-y-4"
                    >
                      {/* Job Header */}
                      <div className="flex items-start justify-between gap-2 pb-3 border-b border-line-subtle">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-tech font-bold text-sm text-primary">{job.orderNumber}</span>
                            <span className={`text-xs font-tech font-bold px-2 py-0.5 rounded-full ${
                              job.region === 'Bắc'
                                ? 'bg-info-tint text-info border border-info/30'
                                : job.region === 'Trung'
                                ? 'bg-positive-tint text-positive border border-positive/30'
                                : job.region === 'Nam'
                                ? 'bg-info-tint text-info border border-info/30'
                                : 'bg-surface-muted text-fg-muted border border-line-subtle'
                            }`}>
                              {job.region === 'Chưa rõ' ? (isVi ? 'Chưa rõ khu vực' : 'Region unknown') : `Khu vực: Miền ${job.region}`}
                            </span>
                            <span className="text-xs font-bold px-2 py-0.5 bg-surface-muted text-fg-muted border border-line-subtle rounded-full">
                              Chưa phân bổ
                            </span>
                          </div>
                          <h4 className="font-bold text-fg mt-1">{job.customerName || EMPTY_VALUE}</h4>
                          <p className="text-xs text-fg-muted">
                            {[job.customerAddress, job.customerCity].filter(Boolean).join(', ') || EMPTY_VALUE}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-xs font-tech font-bold text-fg">
                            {numOrDash(job.totalGrams, 'g')} nhựa
                          </div>
                          <div className="text-xs text-fg-muted">
                            {job.estimatedPrintHours === null
                              ? `${EMPTY_VALUE} giờ in`
                              : `~${job.estimatedPrintHours}h in`}
                          </div>
                        </div>
                      </div>

                      {/* Requirements summary */}
                      <div className="bg-canvas p-3 rounded-lg text-xs space-y-1">
                        <div className="font-semibold text-fg-muted flex items-center gap-1.5">
                          <Icon name="layers" size={16} className="text-primary" />
                          {job.itemsSummary ?? EMPTY_VALUE}
                        </div>
                        <div className="text-fg-muted flex items-center gap-2 pt-0.5">
                          <span>Vật liệu: <strong className="text-fg-muted">{job.materialName ?? EMPTY_VALUE}</strong></span>
                          <span>•</span>
                          <span>Màu: <strong className="text-fg-muted">{job.colorName ?? EMPTY_VALUE}</strong></span>
                          <span>•</span>
                          <span>Lớp in: <strong className="text-fg-muted">{numOrDash(job.layerHeightMm, 'mm')}</strong></span>
                        </div>
                      </div>

                      {/* Allocation status — đề xuất chỉ có khi đã khai trạm in */}
                      {!hasWorkshop ? (
                        <div className="bg-surface-muted border border-line-subtle rounded-lg p-3 text-xs text-fg-muted flex items-start gap-2">
                          <Icon name="info" size={16} className="text-primary shrink-0 mt-0.5" />
                          <span>{rec.matchReasons[0]}</span>
                        </div>
                      ) : (
                        <div className="bg-canvas border border-positive/30 rounded-lg p-3.5 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-xs font-bold text-positive">
                              <Icon name="auto_awesome" size={18} className="text-positive" />
                              Đề Xuất Điều Phối (công thức trên dữ liệu đã khai)
                            </span>
                            <span className="text-xs font-tech font-bold px-2 py-0.5 bg-positive-tint text-positive rounded-md shadow-e0">
                              {rec.matchScore}% Match
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <div className="bg-surface p-2.5 rounded-lg border border-positive/30">
                              <div className="text-xs text-fg-muted uppercase font-tech">Trạm Xưởng Đề Xuất</div>
                              <div className="font-bold text-fg flex items-center gap-1 mt-0.5 truncate">
                                <Icon name="store" size={14} className="text-positive" />
                                {rec.workshopName}
                              </div>
                              <div className="text-xs text-fg-muted mt-0.5">Khoảng cách ~{rec.distanceEstimateKm} km</div>
                            </div>

                            <div className="bg-surface p-2.5 rounded-lg border border-positive/30">
                              <div className="text-xs text-fg-muted uppercase font-tech">Máy In Trống Phù Hợp</div>
                              <div className="font-bold text-fg flex items-center gap-1 mt-0.5 truncate">
                                <Icon name="print" size={14} className="text-positive" />
                                {rec.suggestedPrinterName || EMPTY_VALUE}
                              </div>
                              <div className="text-xs text-positive font-semibold mt-0.5">
                                {rec.printerStatus === 'Free'
                                  ? isVi
                                    ? 'Trạng thái: Trống (Free)'
                                    : 'Status: Free'
                                  : `Trạng thái: ${rec.printerStatus}`}
                              </div>
                            </div>
                          </div>

                          {/* Stock Check Badge */}
                          <div className="flex items-center justify-between text-xs bg-surface px-2.5 py-1.5 rounded-lg border border-positive/30">
                            <span className="text-fg-muted flex items-center gap-1">
                              <Icon name="inventory" size={14} className="text-positive" />
                              Tồn kho nhựa xưởng:
                            </span>
                            <span className="font-bold text-fg-muted">
                              {(rec.availableStockGrams / 1000).toFixed(1)} kg
                            </span>
                          </div>

                          {/* Match Reasons */}
                          <ul className="text-xs text-positive space-y-0.5 list-disc list-inside">
                            {rec.matchReasons.map((reason, rIdx) => (
                              <li key={rIdx}>{reason}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}

      {/* 4. TAB CONTENT: FLEET & WORKSHOP OVERVIEW */}
      {activeTab === 'fleet' && (
        <div className="space-y-4">
          {workshops.length === 0 ? (
            <EmptyState
              size="sm"
              title={isVi ? 'Chưa có dữ liệu đội máy theo xưởng' : 'No fleet data per workshop'}
              description={
                isVi
                  ? 'Chưa có xưởng nào được khai báo nên chưa tổng hợp được đội máy và tồn kho.'
                  : 'No workshop has been declared yet, so no fleet or stock can be aggregated.'
              }
              icon={<Icon name="factory" size={20} className="text-primary" />}
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onNavigateSection?.('partners')}
                >
                  {isVi ? 'Mở Mạng Lưới Xưởng In' : 'Open workshop network'}
                </Button>
              }
            />
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {workshops.map((ws) => (
              <div key={ws.id} className="bg-surface-subtle rounded-lg p-5 shadow-e1 space-y-4">
                <div className="flex items-start justify-between pb-3 border-b border-line-subtle">
                  <div>
                    <span className="text-xs font-tech font-bold px-2 py-0.5 bg-primary/10 text-primary rounded-sm">
                      KHU VỰC MIỀN {ws.region.toUpperCase()}
                    </span>
                    <h3 className="font-bold text-fg text-sm mt-1">{ws.name}</h3>
                    <p className="text-xs text-fg-subtle mt-0.5">{ws.address}</p>
                  </div>
                  <div className="w-8 h-8 rounded-sm bg-surface-muted flex items-center justify-center text-fg-muted">
                    <Icon name="factory" size={20} />
                  </div>
                </div>

                {/* Machine Fleet Telemetry */}
                <div>
                  <div className="flex items-center justify-between text-xs text-fg-muted mb-2">
                    <span className="font-semibold">Đội máy in (Fleet)</span>
                    <span className="font-tech text-positive font-bold">
                      {ws.freeMachines} máy rảnh / {ws.totalMachines} máy
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {ws.fleet.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between p-2 bg-canvas rounded-lg text-xs border border-line-subtle"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="font-bold text-fg truncate">{m.name}</div>
                          <div className="text-xs text-fg-subtle">{m.type} • {m.currentMaterial || 'Sẵn sàng'}</div>
                        </div>

                        <div className="shrink-0 text-right">
                          <span
                            className={`text-xs font-tech font-bold px-2 py-0.5 rounded-full ${
                              m.status === 'Free'
                                ? 'bg-positive-tint text-positive border border-positive/30'
                                : m.status === 'Busy'
                                ? 'bg-info-tint text-info border border-info/30'
                                : 'bg-danger-tint text-danger border border-danger/30'
                            }`}
                          >
                            {m.status === 'Free'
                              ? 'Trống (Free)'
                              : m.status === 'Busy'
                              ? `Đang in (${numOrDash(m.progressPercent, '%')})`
                              : 'Bảo trì'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Stock Materials Summary */}
                <div className="pt-2 border-t border-line-subtle">
                  <div className="text-xs font-semibold text-fg-muted mb-1.5">Tồn kho vật liệu chính</div>
                  <div className="flex flex-wrap gap-1.5">
                    {ws.materialsStock.map((mat, mIdx) => (
                      <span
                        key={mIdx}
                        className="text-xs font-tech px-2 py-1 bg-surface-muted text-fg-muted rounded-lg flex items-center gap-1"
                      >
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: mat.colorHex }} />
                        {mat.materialName}: <strong>{(mat.stockGrams / 1000).toFixed(1)}kg</strong>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
          )}
        </div>
      )}

      {/* 5. JOB DETAILS MODAL — thẻ đang chọn = đơn THẬT trong `orders` */}
      {selectedJob && (
        <Modal
          open
          onClose={() => setSelectedJobId(null)}
          size="lg"
          title={
            <span className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-md bg-primary text-primary-fg flex items-center justify-center shadow-e1">
                <Icon name="precision_manufacturing" size={24} />
              </span>
              <span>
                <span className="flex items-center gap-2">
                  <span className="font-tech font-bold text-base text-primary">{selectedJob.orderNumber}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-surface-muted text-fg-muted font-tech">
                    Nấc {selectedJob.stageIndex + 1}: {KANBAN_STAGES[selectedJob.stageIndex].shortVi}
                  </span>
                </span>
                <span className="block text-sm font-bold text-fg">{selectedJob.customerName || EMPTY_VALUE}</span>
              </span>
            </span>
          }
        >
            {/* Modal Body */}
            <div className="space-y-5 text-xs">
              {/* Stage Progression Buttons — ghi xuống Supabase */}
              <div>
                <label className="text-xs font-bold text-fg-muted uppercase tracking-wider block mb-2">
                  Chuyển Nấc Trực Tiếp (ghi orders.status_stage_index xuống Supabase)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {KANBAN_STAGES.map((s) => (
                    <button
                      key={s.key}
                      onClick={() => handleSetStage(selectedJob.id, s.index)}
                      className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                        selectedJob.stageIndex === s.index
                          ? 'bg-primary text-primary-fg border-primary font-bold shadow-e1'
                          : 'bg-canvas hover:bg-surface-muted text-fg-muted border-line-subtle'
                      }`}
                    >
                      <div className="font-tech text-xs opacity-75">Nấc #{s.index + 1}</div>
                      <div className="text-xs font-semibold truncate">{s.shortVi}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Technical Specifications — cột nào `orders` không có thì `—` */}
              <div className="bg-canvas p-4 rounded-lg border border-line-subtle grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <span className="text-xs text-fg-muted uppercase font-tech">Vật Liệu</span>
                  <div className="font-bold text-fg">{selectedJob.materialName ?? EMPTY_VALUE}</div>
                </div>
                <div>
                  <span className="text-xs text-fg-muted uppercase font-tech">Màu Sắc</span>
                  <div className="font-bold text-fg flex items-center gap-1.5 mt-0.5">
                    {selectedJob.colorHex && (
                      <span className="w-3 h-3 rounded-full border border-line" style={{ backgroundColor: selectedJob.colorHex }} />
                    )}
                    {selectedJob.colorName ?? EMPTY_VALUE}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-fg-muted uppercase font-tech">Độ Dày Lớp In</span>
                  <div className="font-bold text-fg">{numOrDash(selectedJob.layerHeightMm, ' mm')}</div>
                </div>
                <div>
                  <span className="text-xs text-fg-muted uppercase font-tech">Độ Đặc (Infill)</span>
                  <div className="font-bold text-fg">{numOrDash(selectedJob.infillPercent, '%')}</div>
                </div>
              </div>

              {/* Operator Notes Box — CHỈ TRONG PHIÊN (orders không có cột ghi chú kỹ thuật) */}
              <div>
                <label className="text-xs font-bold text-fg-muted block mb-1">
                  Ghi chú Kỹ Thuật Viên / Trưởng Xưởng (chỉ trong phiên — chưa có cột DB):
                </label>
                <textarea
                  value={editingJobNotes}
                  onChange={(e) => setEditingJobNotes(e.target.value)}
                  rows={3}
                  className="w-full p-3 bg-canvas border border-line-subtle rounded-lg text-xs focus:bg-surface focus:outline-none focus:border-primary"
                  placeholder="Nhập hướng dẫn gá đặt, nhiệt độ bàn, dung sai thước kẹp..."
                />
                <button
                  onClick={() => {
                    patchSession(selectedJob.id, { operatorNotes: editingJobNotes });
                    onShowToast?.(
                      isVi
                        ? 'Đã ghi nhận ghi chú TRONG PHIÊN (orders chưa có cột lưu ghi chú kỹ thuật).'
                        : 'Note kept for THIS SESSION only (orders has no technician-note column).'
                    );
                  }}
                  className="mt-2 px-3.5 py-1.5 bg-surface-inverse text-on-inverse rounded-lg font-bold text-xs hover:bg-surface-inverse transition-colors cursor-pointer"
                >
                  Ghi Nhận Ghi Chú
                </button>
              </div>

              {/* QC Verification Section — CHỈ TRONG PHIÊN */}
              <div className="bg-danger-tint/60 border border-danger/30 p-4 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-danger flex items-center gap-1.5">
                    <Icon name="verified" size={18} className="text-danger" />
                    Kiểm Định Đo Dung Sai &amp; QC (chỉ trong phiên)
                  </span>
                  <span className={`text-xs font-tech font-bold px-2 py-0.5 rounded-sm ${
                    selectedJob.qcInspectionPassed ? 'bg-positive-tint text-positive' : 'bg-surface-muted text-fg-muted'
                  }`}>
                    {selectedJob.qcInspectionPassed ? 'ĐẠT TIÊU CHUẨN' : 'CHƯA PHÊ DUYỆT'}
                  </span>
                </div>

                <input
                  type="text"
                  value={qcNotesInput}
                  onChange={(e) => setQcNotesInput(e.target.value)}
                  placeholder="Kết quả đo kiểm / lý do không đạt..."
                  className="w-full p-2.5 bg-surface border border-line-subtle rounded-lg text-xs focus:outline-none focus:border-primary"
                />

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const note = qcNotesInput.trim();
                      if (!note) {
                        onShowToast?.(isVi ? 'Nhập kết quả đo kiểm trước khi xác nhận QC.' : 'Enter the inspection result before confirming QC.');
                        return;
                      }
                      patchSession(selectedJob.id, { qcInspectionPassed: true, qcNotes: note });
                      onShowToast?.(
                        isVi
                          ? 'Đã ghi nhận QC Đạt TRONG PHIÊN (chưa có cột DB cho kết quả QC).'
                          : 'QC pass kept for THIS SESSION only (no DB column for QC results).'
                      );
                    }}
                    className="px-3 py-1.5 bg-primary hover:bg-primary-hover text-primary-fg font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer shadow-e0"
                  >
                    <Icon name="check" size={14} />
                    Xác nhận QC Đạt (Pass)
                  </button>

                  <button
                    onClick={() => {
                      const note = qcNotesInput.trim();
                      if (!note) {
                        onShowToast?.(isVi ? 'Nhập lý do không đạt trước khi yêu cầu in lại.' : 'Enter the defect reason before requesting a reprint.');
                        return;
                      }
                      patchSession(selectedJob.id, { qcInspectionPassed: false, qcNotes: note });
                      onShowToast?.(
                        isVi
                          ? 'Đã đánh dấu in lại TRONG PHIÊN (chưa có cột DB cho kết quả QC).'
                          : 'Reprint flag kept for THIS SESSION only (no DB column for QC results).'
                      );
                    }}
                    className="px-3 py-1.5 bg-danger-tint hover:bg-danger/20 text-danger font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Icon name="close" size={14} />
                    Không đạt (In lại)
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-line-subtle bg-canvas flex items-center justify-between gap-2 rounded-b-lg">
              <div className="text-xs text-fg-muted truncate">
                Mã đơn (orders.id): <strong className="font-tech">{selectedJob.id}</strong>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {onNavigateTracking && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      const order = (orders ?? []).find((o) => o.id === selectedJob.id);
                      if (!order) {
                        onShowToast?.(isVi ? 'Không còn đơn này trong dữ liệu vừa tải.' : 'This order is no longer in the loaded data.');
                        return;
                      }
                      setSelectedJobId(null);
                      onNavigateTracking(order);
                    }}
                  >
                    {isVi ? 'Xem hành trình đơn' : 'View order tracking'}
                  </Button>
                )}
                <button
                  onClick={() => setSelectedJobId(null)}
                  className="px-4 py-2 bg-line-subtle hover:bg-line text-fg font-bold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
        </Modal>
      )}
    </div>
  );
};

export default Group5ProductionPanel;
