import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  useProductionStore,
  KANBAN_STAGES,
  ProductionJob,
  ProductionRegion,
  ProductionStageKey,
  regionFromAddress,
} from '@frontend/stores/useProductionStore';
import { Order } from '../../../types';
import { dbService } from '../../../../backend/supabase/database';
import { EMPTY_VALUE, formatNumber } from '../../../lib/format';
import { Badge, Button, EmptyState, Field, Icon, InfoTip, Input, Modal, Select, Skeleton } from '@frontend/ui';

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
  typeof v === 'number' && Number.isFinite(v) ? `${formatNumber(v)}${suffix}` : EMPTY_VALUE;

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
      setLoadError(err?.message || ('lỗi không xác định'));
    } finally {
      setIsLoading(false);
    }
  }, []);

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
        `Cập nhật nấc sản xuất thất bại: ${result.error || 'lỗi không xác định'}`
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
      onShowToast?.('Đã hoàn tất quy trình sản xuất');
      return;
    }
    const next = KANBAN_STAGES[job.stageIndex + 1];
    void persistStage(job, next.index, `Đã chuyển sang: ${next.labelVi}`);
  };

  const handleRegress = (jobId: string) => {
    const job = jobs.find((j) => j.id === jobId);
    if (!job || job.stageIndex <= 0) return;
    const prev = KANBAN_STAGES[job.stageIndex - 1];
    void persistStage(job, prev.index, `Đã lùi về: ${prev.shortVi}`);
  };

  const handleSetStage = (jobId: string, stageIndex: number) => {
    const job = jobs.find((j) => j.id === jobId);
    const stage = KANBAN_STAGES[stageIndex];
    if (!job || !stage) return;
    void persistStage(job, stage.index, `Đã đặt nấc: ${stage.shortVi}`);
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
        <div className="bg-danger-tint border border-danger/20 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2 text-danger font-semibold text-sm">
            <Icon name="error" size={20} className="text-danger" />
            Không tải được đơn hàng từ Supabase
          </div>
          <p className="text-xs font-mono text-danger break-all">{loadError}</p>
          <Button variant="secondary" size="sm" onClick={() => void loadOrders()}>
            Thử lại
          </Button>
        </div>
      );
    }
    if (isLoading && orders === null) {
      return (
        <div
          role="status"
          aria-label="ĐANG TẢI ĐƠN HÀNG THẬT TỪ SUPABASE…"
          className="flex flex-col gap-3.5 overflow-hidden md:flex-row"
        >
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rect" height="18rem" rounded="lg" className="w-full md:w-[260px] md:shrink-0" />
          ))}
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
              Tải lại
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
      <div className="bg-surface p-5 sm:p-6 rounded-lg border border-line shadow-e0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-primary-tint text-primary font-mono text-xs font-semibold rounded-sm border border-primary/20 uppercase tracking-wider">
                VẬN HÀNH SẢN XUẤT
              </span>
            </div>
            <h2 className="text-lg font-bold tracking-tight text-fg mt-1.5 flex items-center gap-2.5">
              <Icon name="precision_manufacturing" size={24} className="text-primary" />
              {activeTab === 'dispatcher'
                ? 'Đơn Hàng & Điều Phối Trạm In'
                : 'Hàng Đợi Chế Tác: Bảng Kanban 8 Nấc & Điều Phối Trạm'}
            </h2>
            <div className="mt-0.5">
              <InfoTip label="Điều phối sản xuất hoạt động thế nào?">
                Thẻ Kanban là ĐƠN THẬT trong bảng orders; chuyển nấc ghi thẳng xuống Supabase. Điều phối trạm in cần trạm đã được khai báo.
              </InfoTip>
            </div>
          </div>

          {/* Quick Metrics Badges */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="px-3.5 py-2 bg-surface border border-line rounded-lg flex items-center gap-2">
              <Icon name="format_list_bulleted" size={20} className="text-fg-subtle" />
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Tổng Đơn Hàng Đợi</div>
                <div className="text-sm font-semibold font-mono tabular-nums text-fg">{ordersReady ? `${totalJobs} jobs` : EMPTY_VALUE}</div>
              </div>
            </div>

            <div className="px-3.5 py-2 bg-surface border border-line rounded-lg flex items-center gap-2">
              <Icon name="print" size={20} className="text-positive" />
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Đang Chạy Máy</div>
                <div className="text-sm font-semibold font-mono tabular-nums text-fg">
                  {ordersReady ? `${printingCount} máy in` : EMPTY_VALUE}
                </div>
              </div>
            </div>

            <div className="px-3.5 py-2 bg-surface border border-line rounded-lg flex items-center gap-2">
              <Icon name="share_location" size={20} className="text-warning" />
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Chưa Phân Bổ</div>
                <div className="text-sm font-semibold font-mono tabular-nums text-fg">
                  {ordersReady ? `${suggestedDispatchCount} đơn` : EMPTY_VALUE}
                </div>
              </div>
            </div>

            <Button
              variant="secondary"
              size="sm"
              leadingIcon={<Icon name="refresh" size={16} />}
              onClick={() => void loadOrders()}
              disabled={isLoading}
              title="Đọc lại đơn từ Supabase"
            >
              Tải lại
            </Button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-5 pt-4 border-t border-line-subtle">
          <div className="inline-flex flex-wrap items-center gap-1 rounded-md border border-line bg-surface-muted p-1">
            <button
              type="button"
              onClick={() => setActiveTab('kanban')}
              aria-pressed={activeTab === 'kanban'}
              className={`px-3 py-1.5 max-md:min-h-11 text-sm font-medium rounded-sm transition-colors flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                activeTab === 'kanban'
                  ? 'bg-surface text-fg font-semibold shadow-e1'
                  : 'text-fg-muted hover:text-fg'
              }`}
            >
              <Icon name="view_kanban" size={16} />
              Bảng Kanban 8 Nấc
              <span className="text-xs px-1.5 py-0.5 bg-surface border border-line text-fg-muted rounded-full font-mono tabular-nums">
                {ordersReady ? filteredJobs.length : EMPTY_VALUE}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('dispatcher')}
              aria-pressed={activeTab === 'dispatcher'}
              className={`px-3 py-1.5 max-md:min-h-11 text-sm font-medium rounded-sm transition-colors flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                activeTab === 'dispatcher'
                  ? 'bg-surface text-fg font-semibold shadow-e1'
                  : 'text-fg-muted hover:text-fg'
              }`}
            >
              <Icon name="hub" size={16} />
              {'Danh Sách Đơn & Điều Phối'}
              {ordersReady && suggestedDispatchCount > 0 && (
                <span className="text-xs px-1.5 py-0.5 bg-warning-tint border border-warning/20 text-warning rounded-full font-mono tabular-nums">
                  {suggestedDispatchCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('fleet')}
              aria-pressed={activeTab === 'fleet'}
              className={`px-3 py-1.5 max-md:min-h-11 text-sm font-medium rounded-sm transition-colors flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                activeTab === 'fleet'
                  ? 'bg-surface text-fg font-semibold shadow-e1'
                  : 'text-fg-muted hover:text-fg'
              }`}
            >
              <Icon name="factory" size={16} />
              {'Trạm Xưởng & Đội Máy'}
              <span className="text-xs px-1.5 py-0.5 bg-surface border border-line text-fg-muted rounded-full font-mono tabular-nums">
                {workshops.length} trạm
              </span>
            </button>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Tìm mã đơn, khách hàng, vật liệu"
                placeholder="Tìm mã đơn, khách hàng, vật liệu..."
                className="pl-8 pr-9 w-48 sm:w-64"
              />
              <Icon name="search" size={16} className="text-fg-subtle absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              {searchQuery && (
                <Button
                  iconOnly
                  variant="ghost"
                  size="sm"
                  aria-label="Xoá tìm kiếm"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-0 top-1/2 -translate-y-1/2"
                >
                  <Icon name="close" size={14} />
                </Button>
              )}
            </div>

            {/* Region Filter — vùng miền suy từ địa chỉ thật; đơn không suy được nằm ở "Toàn Quốc" */}
            <div className="inline-flex flex-wrap items-center gap-1 bg-surface-muted border border-line rounded-md p-1 text-sm">
              {(['all', 'Bắc', 'Trung', 'Nam'] as const).map((reg) => (
                <button
                  key={reg}
                  type="button"
                  onClick={() => setActiveRegionFilter(reg)}
                  aria-pressed={activeRegionFilter === reg}
                  className={`px-3 py-1.5 max-md:min-h-11 rounded-sm transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                    activeRegionFilter === reg
                      ? 'bg-surface text-fg font-semibold shadow-e1'
                      : 'text-fg-muted hover:text-fg'
                  }`}
                >
                  {reg === 'all' ? ('Toàn Quốc') : `Miền ${reg}`}
                </button>
              ))}
            </div>

            {/* Workshop Filter */}
            <Select
              value={activeWorkshopFilter}
              onChange={(e) => setActiveWorkshopFilter(e.target.value)}
              aria-label="Lọc đơn theo trạm xưởng (MES)"
              className="w-full sm:w-52"
            >
              <option value="all">Tất cả trạm MES</option>
              {workshops.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.region})
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {/* 2. TAB CONTENT: KANBAN BOARD */}
      {activeTab === 'kanban' &&
        (renderOrdersGate(
          'Chưa có đơn nào trong bảng orders',
          'Supabase trả về 0 đơn (hoặc tài khoản này không được RLS cho đọc). Đơn sẽ xuất hiện ở đây ngay khi khách đặt hàng — không có hàng nào được tạo mẫu.'
        ) ?? (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1 text-xs text-fg-muted">
              <span className="flex items-center gap-1.5">
                <Icon name="touch_app" size={16} className="text-primary" />
                <span>Chuyển nấc sản xuất trên từng thẻ</span>
                <InfoTip label="Cách chuyển nấc sản xuất">
                  Bấm nút mũi tên trên thẻ để ghi nấc mới xuống Supabase (orders.status + orders.status_stage_index).
                </InfoTip>
              </span>
              <span>Hiển thị {filteredJobs.length} / {jobs.length} đơn</span>
            </div>

            {/* Kanban 8 Columns — desktop: hàng ngang cuộn; <md: danh sách nấc dọc (UI-021, không tràn ngang 390) */}
            <div className="pb-4 md:overflow-x-auto">
              <div className="flex flex-col items-stretch gap-3.5 md:min-w-[2100px] md:flex-row md:items-start">
                {KANBAN_STAGES.map((stage) => {
                  const stageJobs = filteredJobs.filter((j) => j.stageIndex === stage.index);

                  return (
                    <div
                      key={stage.key}
                      className="flex w-full flex-col rounded-lg border border-line-subtle bg-surface-muted/50 p-3 md:w-[260px] md:max-h-[780px] md:shrink-0"
                    >
                      {/* Column Header */}
                      <div className="pb-2.5 mb-2 border-b border-line-subtle flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`w-7 h-7 rounded-sm ${stage.bgColor} ${stage.color} flex items-center justify-center shrink-0 border ${stage.borderColor}`}>
                            <Icon name={stage.icon} size={16} />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-fg-muted truncate">
                              {stage.shortVi}
                            </h3>
                            <p className="text-xs text-fg-subtle truncate">{stage.role.replace('Sale Hub', 'Kinh doanh').replace('Slicing', 'cắt lớp').replace('Farm', 'xưởng in')}</p>
                          </div>
                        </div>

                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full tabular-nums ${
                          stageJobs.length > 0 ? 'bg-surface text-fg-muted border border-line' : 'bg-surface-muted text-fg-subtle border border-line-subtle'
                        }`}>
                          {stageJobs.length}
                        </span>
                      </div>

                      {/* Column Job Cards List */}
                      <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5">
                        {stageJobs.length === 0 ? (
                          <div className="py-8 text-center text-fg-subtle text-sm border border-dashed border-line-subtle rounded-lg">
                            <Icon name="inbox" size={24} className="block mb-1 text-fg-subtle" />
                            Không có đơn ở nấc này
                          </div>
                        ) : (
                          stageJobs.map((job) => (
                            <div
                              key={job.id}
                              className="bg-surface border border-line rounded-md p-3 shadow-e0 hover:shadow-e1 transition-all duration-300 text-xs space-y-2 group"
                            >
                              {/* Card Top: Order Number & Priority */}
                              <div className="flex items-center justify-between">
                                <span className="font-mono font-bold text-xs text-primary flex items-center gap-1">
                                  {job.orderNumber}
                                </span>

                                <div className="flex items-center gap-1">
                                  {/* Region Tag */}
                                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded-sm border ${
                                    job.region === 'Bắc'
                                      ? 'bg-info-tint text-info border-info/20'
                                      : job.region === 'Trung'
                                      ? 'bg-positive-tint text-positive border-positive/20'
                                      : job.region === 'Nam'
                                      ? 'bg-info-tint text-info border-info/20'
                                      : 'bg-surface-muted text-fg-muted border-line'
                                  }`}>
                                    {job.region === 'Chưa rõ' ? ('Chưa rõ khu vực') : `Miền ${job.region}`}
                                  </span>

                                  {/* Priority Badge — `orders` chưa có cột ưu tiên nên không tự bật */}
                                  {job.priority === 'urgent' && (
                                    <span className="text-xs font-medium px-1.5 py-0.5 rounded-sm bg-danger-tint text-danger border border-danger/20">
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
                              <div className="flex items-center gap-1.5 text-xs text-fg-muted bg-surface-muted border border-line-subtle p-1.5 rounded-md">
                                {job.colorHex && (
                                  <span
                                    className="w-2.5 h-2.5 rounded-full shrink-0 border border-line"
                                    style={{ backgroundColor: job.colorHex }}
                                  />
                                )}
                                <span className="truncate font-medium">{job.materialName ?? EMPTY_VALUE}</span>
                                <span className="text-fg-subtle">|</span>
                                <span className="font-mono font-semibold shrink-0">{numOrDash(job.totalGrams, 'g')}</span>
                              </div>

                              {/* Dispatch status & Assigned Machine */}
                              <div className="text-xs space-y-1">
                                {job.assignedWorkshopName ? (
                                  <div className="flex items-center gap-1 text-fg-muted truncate" title={job.assignedWorkshopName}>
                                    <Icon name="factory" size={14} className="text-primary" />
                                    <span className="truncate">{job.assignedWorkshopName}</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1 text-warning bg-warning-tint px-1.5 py-0.5 rounded-md border border-warning/20">
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
                                <div className="flex items-center justify-between text-xs text-fg-subtle mb-1 font-mono">
                                  <span>Tiến độ nấc</span>
                                  <span className="font-bold text-fg">{numOrDash(job.layerProgress, '%')}</span>
                                </div>
                                <div className="w-full h-1.5 bg-surface-muted rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-primary rounded-full transition-[width] duration-300"
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
                                <p className="text-xs text-fg-muted italic bg-warning-tint p-1.5 rounded-md border border-warning/20 line-clamp-1">
                                  {job.operatorNotes}
                                </p>
                              )}

                              {/* Card Action Controls */}
                              <div className="pt-2 border-t border-line-subtle flex items-center justify-between gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  leadingIcon={<Icon name="info" size={14} />}
                                  onClick={() => {
                                    setSelectedJobId(job.id);
                                    setEditingJobNotes(job.operatorNotes);
                                    setQcNotesInput(job.qcNotes || '');
                                  }}
                                >
                                  Chi tiết
                                </Button>

                                <div className="flex items-center gap-1">
                                  {stage.index > 0 && (
                                    <Button
                                      iconOnly
                                      variant="ghost"
                                      size="sm"
                                      aria-label="Lùi lại 1 nấc"
                                      title="Lùi lại 1 nấc"
                                      onClick={() => handleRegress(job.id)}
                                    >
                                      <Icon name="arrow_back" size={16} />
                                    </Button>
                                  )}

                                  {stage.index < KANBAN_STAGES.length - 1 && (
                                    <Button
                                      variant="primary"
                                      size="sm"
                                      trailingIcon={<Icon name="arrow_forward" size={14} />}
                                      title={`Chuyển sang: ${KANBAN_STAGES[stage.index + 1].shortVi}`}
                                      onClick={() => handleAdvance(job.id)}
                                    >
                                      Tiếp
                                    </Button>
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
          'Chưa có đơn nào trong bảng orders',
          'Không có đơn THẬT nào để phân bổ. Danh sách này chỉ dựng từ bảng orders — không có đơn mẫu.'
        ) ?? (
          <div className="space-y-4">
            <div className="bg-warning-tint border border-warning/20 p-4 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-md bg-warning-tint text-warning flex items-center justify-center shrink-0 border border-warning/20">
                  <Icon name="share_location" size={24} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-warning">
                    Phân Bổ Đơn Về Trạm Xưởng
                  </h3>
                  <p className="text-xs text-warning mt-0.5">
                    Danh sách đơn THẬT chưa được phân bổ. Vùng miền suy từ địa chỉ giao hàng; đề xuất chỉ xuất hiện khi đã có trạm in được khai báo.
                  </p>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-surface text-warning border border-warning/20 tabular-nums">
                  {suggestedDispatchCount} đơn chưa phân bổ
                </span>
              </div>
            </div>

            {/* Chưa có trạm in nào ⇒ không thể chốt phân bổ: nói thẳng, KHÔNG hiện nút "thành công giả" */}
            {workshops.length === 0 && (
              <div className="bg-surface-muted border border-line rounded-md p-3 text-xs text-fg-muted flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="flex items-start gap-1.5">
                  <Icon name="info" size={16} className="text-primary shrink-0 mt-0.5" />
                  <span>
                    Chưa có trạm in nào được khai báo và hệ thống chưa có đường ghi orders.assigned_workshop_id, nên nút xác nhận điều phối đã được gỡ thay vì báo thành công mà không lưu được gì.
                  </span>
                </span>
                <Button variant="secondary" size="sm" onClick={() => onNavigateSection?.('partners')}>
                  Khai trạm in
                </Button>
              </div>
            )}

            {filteredJobs.length === 0 ? (
              <EmptyState
                size="sm"
                title="Không có đơn nào khớp bộ lọc"
                description="Không đơn nào khớp bộ lọc vùng/xưởng hiện tại nên danh sách trống."
                icon={<Icon name="share_location" size={20} className="text-primary" />}
                action={
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setActiveTab('kanban')}
                  >
                    Xem Kanban 8 Nấc
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
                      className="bg-surface border border-line rounded-lg p-6 hover:shadow-e1 transition-all duration-300 space-y-4"
                    >
                      {/* Job Header */}
                      <div className="flex items-start justify-between gap-2 pb-3 border-b border-line-subtle">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold text-sm text-fg">{job.orderNumber}</span>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                              job.region === 'Bắc'
                                ? 'bg-info-tint text-info border-info/20'
                                : job.region === 'Trung'
                                ? 'bg-positive-tint text-positive border-positive/20'
                                : job.region === 'Nam'
                                ? 'bg-info-tint text-info border-info/20'
                                : 'bg-surface-muted text-fg-muted border-line'
                            }`}>
                              {job.region === 'Chưa rõ' ? ('Chưa rõ khu vực') : `Khu vực: Miền ${job.region}`}
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
                          <div className="text-xs font-mono font-bold text-fg">
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
                      <div className="bg-surface-muted p-3 rounded-md text-xs space-y-1">
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
                        <div className="bg-surface-muted border border-line rounded-md p-3 text-xs text-fg-muted flex items-start gap-2">
                          <Icon name="info" size={16} className="text-primary shrink-0 mt-0.5" />
                          <span>{rec.matchReasons[0]}</span>
                        </div>
                      ) : (
                        <div className="bg-surface-muted border border-positive/20 rounded-md p-4 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-xs font-semibold text-positive">
                              <Icon name="auto_awesome" size={18} className="text-positive" />
                              Đề Xuất Điều Phối (công thức trên dữ liệu đã khai)
                            </span>
                            <span className="text-xs font-semibold px-2 py-0.5 bg-positive-tint text-positive border border-positive/20 rounded-md tabular-nums">
                              {rec.matchScore}% khớp
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <div className="bg-surface p-3 rounded-md border border-line">
                              <div className="text-xs text-fg-muted uppercase tracking-wider font-semibold">Trạm Xưởng Đề Xuất</div>
                              <div className="font-bold text-fg flex items-center gap-1 mt-0.5 truncate">
                                <Icon name="store" size={14} className="text-positive" />
                                {rec.workshopName}
                              </div>
                              <div className="text-xs text-fg-muted mt-0.5">Khoảng cách ~{rec.distanceEstimateKm} km</div>
                            </div>

                            <div className="bg-surface p-3 rounded-md border border-line">
                              <div className="text-xs text-fg-muted uppercase tracking-wider font-semibold">Máy In Trống Phù Hợp</div>
                              <div className="font-bold text-fg flex items-center gap-1 mt-0.5 truncate">
                                <Icon name="print" size={14} className="text-positive" />
                                {rec.suggestedPrinterName || EMPTY_VALUE}
                              </div>
                              <div className="text-xs text-positive font-semibold mt-0.5">
                                {rec.printerStatus === 'Free'
                                  ? 'Trạng thái: Trống (Free)'
                                  : `Trạng thái: ${rec.printerStatus}`}
                              </div>
                            </div>
                          </div>

                          {/* Stock Check Badge */}
                          <div className="flex items-center justify-between text-xs bg-surface px-3 py-2 rounded-md border border-line">
                            <span className="text-fg-muted flex items-center gap-1">
                              <Icon name="inventory" size={14} className="text-positive" />
                              Tồn kho nhựa xưởng:
                            </span>
                            <span className="font-bold text-fg-muted font-mono tabular-nums">
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
              title="Chưa có dữ liệu đội máy theo xưởng"
              description="Chưa có xưởng nào được khai báo nên chưa tổng hợp được đội máy và tồn kho."
              icon={<Icon name="factory" size={20} className="text-primary" />}
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onNavigateSection?.('partners')}
                >
                  Mở Mạng Lưới Xưởng In
                </Button>
              }
            />
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {workshops.map((ws) => (
              <div key={ws.id} className="bg-surface rounded-lg border border-line p-6 hover:shadow-e1 transition-all duration-300 space-y-4">
                <div className="flex items-start justify-between pb-3 border-b border-line-subtle">
                  <div>
                    <span className="text-xs font-mono font-medium px-2 py-0.5 bg-primary-tint text-primary border border-primary/20 rounded-sm">
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
                    <span className="font-semibold">Đội máy in</span>
                    <span className="font-mono text-positive font-bold">
                      {ws.freeMachines} máy rảnh / {ws.totalMachines} máy
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {ws.fleet.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between p-2.5 bg-surface-muted rounded-md text-xs border border-line-subtle"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="font-bold text-fg truncate">{m.name}</div>
                          <div className="text-xs text-fg-subtle">{m.type} • {m.currentMaterial || 'Sẵn sàng'}</div>
                        </div>

                        <div className="shrink-0 text-right">
                          <Badge
                            variant={m.status === 'Free' ? 'success' : m.status === 'Busy' ? 'info' : 'danger'}
                            dot
                          >
                            {m.status === 'Free'
                              ? 'Trống (Free)'
                              : m.status === 'Busy'
                              ? `Đang in (${numOrDash(m.progressPercent, '%')})`
                              : 'Bảo trì'}
                          </Badge>
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
                        className="text-xs font-mono px-2 py-1 bg-surface-muted border border-line-subtle text-fg-muted rounded-md flex items-center gap-1 tabular-nums"
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
                  <span className="font-mono font-bold tabular-nums text-base text-fg">{selectedJob.orderNumber}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-surface-muted border border-line text-fg-muted font-mono">
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
                <p className="text-xs font-semibold text-fg-muted uppercase tracking-wider block mb-2">
                  Chuyển Nấc Trực Tiếp (ghi orders.status_stage_index xuống Supabase)
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {KANBAN_STAGES.map((s) => (
                    <Button
                      key={s.key}
                      variant={selectedJob.stageIndex === s.index ? 'primary' : 'secondary'}
                      size="sm"
                      className="justify-start gap-1.5"
                      onClick={() => handleSetStage(selectedJob.id, s.index)}
                    >
                      <span className="font-mono text-xs opacity-75">Nấc #{s.index + 1}</span>
                      <span className="truncate text-xs font-semibold">{s.shortVi}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Technical Specifications — cột nào `orders` không có thì `—` */}
              <div className="bg-surface-muted p-4 rounded-md border border-line-subtle grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <span className="text-xs text-fg-muted uppercase tracking-wider font-semibold">Vật Liệu</span>
                  <div className="font-bold text-fg">{selectedJob.materialName ?? EMPTY_VALUE}</div>
                </div>
                <div>
                  <span className="text-xs text-fg-muted uppercase tracking-wider font-semibold">Màu Sắc</span>
                  <div className="font-bold text-fg flex items-center gap-1.5 mt-0.5">
                    {selectedJob.colorHex && (
                      <span className="w-3 h-3 rounded-full border border-line" style={{ backgroundColor: selectedJob.colorHex }} />
                    )}
                    {selectedJob.colorName ?? EMPTY_VALUE}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-fg-muted uppercase tracking-wider font-semibold">Độ Dày Lớp In</span>
                  <div className="font-bold text-fg font-mono tabular-nums">{numOrDash(selectedJob.layerHeightMm, ' mm')}</div>
                </div>
                <div>
                  <span className="text-xs text-fg-muted uppercase tracking-wider font-semibold">Độ Đặc</span>
                  <div className="font-bold text-fg font-mono tabular-nums">{numOrDash(selectedJob.infillPercent, '%')}</div>
                </div>
              </div>

              {/* Operator Notes Box — CHỈ TRONG PHIÊN (orders không có cột ghi chú kỹ thuật) */}
              <div>
                <label htmlFor="group5-job-notes" className="text-sm font-medium text-fg block mb-1.5">
                  Ghi chú Kỹ Thuật Viên / Trưởng Xưởng (chỉ trong phiên — chưa có cột DB):
                </label>
                <textarea
                  id="group5-job-notes"
                  value={editingJobNotes}
                  onChange={(e) => setEditingJobNotes(e.target.value)}
                  rows={3}
                  className="w-full p-3 bg-surface border border-line-control rounded-md text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:border-primary focus:ring-2 focus:ring-ring"
                  placeholder="Nhập hướng dẫn gá đặt, nhiệt độ bàn, dung sai thước kẹp..."
                />
                <Button
                  variant="primary"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    patchSession(selectedJob.id, { operatorNotes: editingJobNotes });
                    onShowToast?.(
                      'Đã ghi nhận ghi chú TRONG PHIÊN (orders chưa có cột lưu ghi chú kỹ thuật).'
                    );
                  }}
                >
                  Ghi Nhận Ghi Chú
                </Button>
              </div>

              {/* QC Verification Section — CHỈ TRONG PHIÊN */}
              <div className="bg-danger-tint border border-danger/20 p-4 rounded-md space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-danger flex items-center gap-1.5">
                    <Icon name="verified" size={18} className="text-danger" />
                    Kiểm Định Đo Dung Sai &amp; QC (chỉ trong phiên)
                  </span>
                  <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${
                    selectedJob.qcInspectionPassed ? 'bg-positive-tint text-positive border-positive/20' : 'bg-surface-muted text-fg-muted border-line'
                  }`}>
                    {selectedJob.qcInspectionPassed ? 'ĐẠT TIÊU CHUẨN' : 'CHƯA PHÊ DUYỆT'}
                  </span>
                </div>

                <Field label="Kết quả đo kiểm QC" hideLabel optionalLabel={null}>
                  {(control) => (
                    <Input
                      {...control}
                      type="text"
                      value={qcNotesInput}
                      onChange={(e) => setQcNotesInput(e.target.value)}
                      placeholder="Kết quả đo kiểm / lý do không đạt..."
                    />
                  )}
                </Field>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    leadingIcon={<Icon name="check" size={14} />}
                    onClick={() => {
                      const note = qcNotesInput.trim();
                      if (!note) {
                        onShowToast?.('Nhập kết quả đo kiểm trước khi xác nhận QC.');
                        return;
                      }
                      patchSession(selectedJob.id, { qcInspectionPassed: true, qcNotes: note });
                      onShowToast?.(
                        'Đã ghi nhận QC Đạt TRONG PHIÊN (chưa có cột DB cho kết quả QC).'
                      );
                    }}
                  >
                    Xác nhận QC Đạt (Pass)
                  </Button>

                  <Button
                    variant="danger-ghost"
                    size="sm"
                    leadingIcon={<Icon name="close" size={14} />}
                    onClick={() => {
                      const note = qcNotesInput.trim();
                      if (!note) {
                        onShowToast?.('Nhập lý do không đạt trước khi yêu cầu in lại.');
                        return;
                      }
                      patchSession(selectedJob.id, { qcInspectionPassed: false, qcNotes: note });
                      onShowToast?.(
                        'Đã đánh dấu in lại TRONG PHIÊN (chưa có cột DB cho kết quả QC).'
                      );
                    }}
                  >
                    Không đạt (In lại)
                  </Button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-line bg-surface-muted flex items-center justify-between gap-2">
              <div className="text-xs text-fg-muted truncate">
                Mã đơn (orders.id): <strong className="font-mono">{selectedJob.id}</strong>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {onNavigateTracking && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      const order = (orders ?? []).find((o) => o.id === selectedJob.id);
                      if (!order) {
                        onShowToast?.('Không còn đơn này trong dữ liệu vừa tải.');
                        return;
                      }
                      setSelectedJobId(null);
                      onNavigateTracking(order);
                    }}
                  >
                    Xem hành trình đơn
                  </Button>
                )}
                <Button
                  variant="secondary"
                  onClick={() => setSelectedJobId(null)}
                >
                  Đóng
                </Button>
              </div>
            </div>
        </Modal>
      )}
    </div>
  );
};

export default Group5ProductionPanel;
