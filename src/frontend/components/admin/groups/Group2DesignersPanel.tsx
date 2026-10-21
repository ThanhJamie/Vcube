import React, { useState, useMemo, useEffect } from 'react';
import { useDesignerAdminStore, DesignerRow } from '../../../../stores/useDesignerAdminStore';
import { dbService } from '../../../../backend/supabase/database';
import { AppUserProfile } from '../../../../types';
import { Badge, Button, DataTable, EmptyState, Field, Icon, InfoTip, Input, Modal, Skeleton } from '@frontend/ui';
import type { DataTableColumn } from '@frontend/ui';

export interface Group2DesignersPanelProps {
  onShowToast?: (message: string) => void;
  onNavigateSection?: (section: any) => void;
}

const BADGE_TIERS = [
  { id: 'TopCreator', label: '👑 Tác giả hàng đầu', desc: 'Nhà sáng tạo xuất sắc' },
  { id: 'VerifiedEngineer', label: '🛡️ Kỹ sư đã kiểm duyệt', desc: 'Kỹ sư cơ khí kiểm duyệt' },
  { id: 'PioneerMaker', label: '🚀 Nghệ nhân tiên phong', desc: 'Nghệ nhân tiên phong' },
  { id: 'Standard', label: 'Tiêu Chuẩn', desc: 'Tác giả phổ thông' }
] as const;

/** Nhãn VI cho `verifiedStatus` (giá trị enum DB) — không render thô ra UI. */
const verifiedStatusLabel = (status: string | null | undefined): string =>
  status === 'Verified'
    ? 'Đã duyệt'
    : status === 'Pending'
      ? 'Chờ duyệt'
      : status === 'Suspended'
        ? 'Tạm đình chỉ'
        : status || '—';

export const Group2DesignersPanel: React.FC<Group2DesignersPanelProps> = ({
  onShowToast,
  onNavigateSection
}) => {

  const [activeTab, setActiveTab] = useState<'designers' | 'withdrawals' | 'analytics'>('designers');

  // Store đọc/ghi bảng thật `designer_profiles` (xem chú thích đầu store).
  const {
    designers,
    designerColumns,
    isLoading,
    error,
    filters,
    setFilterBadgeTier,
    setFilterVerifiedStatus,
    setSearchQuery,
    loadDesigners,
    updateDesigner,
    getDesignerStats
  } = useDesignerAdminStore();

  const stats = getDesignerStats();
  /** `badge_tier` KHÔNG có trong baseline ⇒ ẩn mọi điều khiển huy hiệu thay vì ghi rồi báo lỗi. */
  const hasBadgeColumn = designerColumns.includes('badge_tier');
  /**
   * Ghi chú dùng chung khi KHÔNG lọc/gán được huy hiệu. Phân biệt 2 nguyên nhân KHÁC NHAU:
   * bảng chưa có bản ghi nào (⇒ chưa đọc được danh sách cột) so với bảng có dữ liệu nhưng
   * thiếu hẳn cột `badge_tier`.
   */
  const noBadgeTierNote =
    designerColumns.length === 0
      ? 'chưa xác định được cột vì bảng chưa có bản ghi nào'
      : 'bảng designer_profiles không có cột badge_tier';

  useEffect(() => {
    void loadDesigners();
  }, [loadDesigners]);

  // ==========================================================================
  // Danh tính (email / SĐT) KHÔNG nằm trong `designer_profiles` — nó ở `user_profiles`.
  // Ghép theo `designer_profiles.user_id = user_profiles.id`. Không ghép được ⇒ '—'.
  // ==========================================================================
  const [users, setUsers] = useState<AppUserProfile[]>([]);
  const [usersError, setUsersError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const rows = await dbService.getUsers();
        if (alive) {
          setUsers(Array.isArray(rows) ? rows : []);
          setUsersError(null);
        }
      } catch (err: any) {
        if (alive) {
          setUsers([]);
          setUsersError(err?.message || ('lỗi không xác định'));
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const userById = useMemo(() => {
    const map = new Map<string, AppUserProfile>();
    users.forEach((u) => map.set(u.uid, u));
    return map;
  }, [users]);

  // Modals / Editing state
  const [editingDesigner, setEditingDesigner] = useState<DesignerRow | null>(null);
  const [royaltyDraft, setRoyaltyDraft] = useState<number>(10);
  const [badgeDraft, setBadgeDraft] = useState<string>('Standard');
  const [isSavingDesigner, setIsSavingDesigner] = useState(false);

  // Format currency
  const formatVnd = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(val);
  };
  /** Thiếu số đo ⇒ '—' (không rơi về 0 như thể đã đo được). */
  const numOrDash = (val: number | null | undefined) =>
    val === null || val === undefined ? '—' : String(val);

  // Filtered designers
  const filteredDesigners = useMemo(() => {
    const q = filters.searchQuery.trim().toLowerCase();
    return designers.filter((d) => {
      const user = d.userId ? userById.get(d.userId) : undefined;
      const matchBadge =
        !hasBadgeColumn || filters.badgeTier === 'all' || d.badgeTier === filters.badgeTier;
      const matchStatus =
        filters.verifiedStatus === 'all' || d.verifiedStatus === filters.verifiedStatus;
      const matchQuery =
        !q ||
        d.displayName.toLowerCase().includes(q) ||
        (d.bio && d.bio.toLowerCase().includes(q)) ||
        (user?.email && user.email.toLowerCase().includes(q));
      return matchBadge && matchStatus && matchQuery;
    });
  }, [designers, filters, hasBadgeColumn, userById]);

  // Open Edit Designer Modal
  const handleOpenEdit = (d: DesignerRow) => {
    setEditingDesigner(d);
    // Chưa có giá trị trong DB ⇒ mặc định của thanh trượt chỉ là ĐIỂM BẮT ĐẦU; chỉ ghi khi bấm Lưu.
    setRoyaltyDraft(d.royaltyPercent ?? 10);
    setBadgeDraft(d.badgeTier ?? 'Standard');
  };

  // Save changes to designer — GHI XUỐNG DB, chỉ báo thành công khi DB xác nhận.
  const handleSaveDesigner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDesigner) return;
    setIsSavingDesigner(true);
    try {
      const res = await updateDesigner(editingDesigner.id, {
        royaltyPercent: royaltyDraft,
        badgeTier: hasBadgeColumn ? badgeDraft : undefined
      });
      if (!res.success) {
        onShowToast?.(
          `Lưu hồ sơ designer thất bại: ${res.error || 'lỗi không xác định'}`
        );
        return; // giữ modal mở để không mất thao tác vừa nhập
      }
      setEditingDesigner(null);
      onShowToast?.(
        `Đã lưu vào designer_profiles: ${editingDesigner.displayName}`
      );
    } finally {
      setIsSavingDesigner(false);
    }
  };

  // Cycle tier (chỉ khi bảng thật sự có cột `badge_tier`)
  const handleCycleTier = async (d: DesignerRow) => {
    if (!hasBadgeColumn) return;
    const current = d.badgeTier ?? 'Standard';
    const nextTier =
      current === 'Standard'
        ? 'PioneerMaker'
        : current === 'PioneerMaker'
        ? 'VerifiedEngineer'
        : current === 'VerifiedEngineer'
        ? 'TopCreator'
        : 'Standard';
    const res = await updateDesigner(d.id, { badgeTier: nextTier });
    onShowToast?.(
      res.success
        ? `Đã đổi huy hiệu ${d.displayName} thành ${nextTier === 'TopCreator' ? 'Tác giả hàng đầu' : nextTier === 'VerifiedEngineer' ? 'Kỹ sư đã kiểm duyệt' : nextTier === 'PioneerMaker' ? 'Nghệ nhân tiên phong' : 'Tác giả tiêu chuẩn'}`
        : `Đổi huy hiệu thất bại: ${res.error}`
    );
  };

  /** Cột bảng thống kê designer dùng primitive `DataTable`. */
  const analyticsColumns = useMemo<DataTableColumn<DesignerRow>[]>(() => [
    {
      key: 'designer',
      header: 'Nhà thiết kế',
      value: (d) => d.displayName || d.id,
      render: (d) => (
        <div>
          <div className="font-bold text-fg">{d.displayName || '—'}</div>
          <div className="text-xs text-fg-subtle font-mono">{d.id}</div>
        </div>
      ),
    },
    {
      key: 'royaltyPercent',
      header: 'Trần hoa hồng',
      numeric: true,
      value: (d) => d.royaltyPercent ?? 0,
      render: (d) => <span className="font-bold text-primary">{d.royaltyPercent !== null ? `${d.royaltyPercent}%` : '—'}</span>,
    },
    { key: 'totalSales', header: 'total_sales', numeric: true, value: (d) => d.totalSales ?? 0, render: (d) => numOrDash(d.totalSales) },
    { key: 'rating', header: 'Đánh giá', numeric: true, value: (d) => d.rating ?? 0, render: (d) => numOrDash(d.rating) },
    { key: 'verifiedStatus', header: 'Xác thực', value: (d) => d.verifiedStatus || '', render: (d) => <span className="text-fg-muted">{verifiedStatusLabel(d.verifiedStatus)}</span> },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], []);

  return (
    <div className="space-y-6">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-6 rounded-lg border border-line">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="technical">Nhà thiết kế</Badge>
            <h2 className="text-xl font-bold text-fg tracking-tight">
              {'Quản Trị Nhà Thiết Kế & Bản Quyền'}
            </h2>
          </div>
          <div className="mt-1">
            <InfoTip label="Mục này quản trị những gì?">
              Hồ sơ nhà thiết kế đọc/ghi trực tiếp bảng designer_profiles: trần hoa hồng bản quyền và (nếu bảng có cột) huy hiệu.
            </InfoTip>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="inline-flex flex-wrap items-center gap-1 rounded-md border border-line bg-surface-muted p-1">
          <button
            onClick={() => setActiveTab('designers')}
            className={`flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
              activeTab === 'designers'
                ? 'bg-surface text-fg font-semibold shadow-e1'
                : 'text-fg-muted hover:text-fg'
            }`}
          >
            <Icon name="palette" size={18} />
            Hồ Sơ Nhà Thiết Kế
          </button>
          <button
            onClick={() => setActiveTab('withdrawals')}
            className={`flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
              activeTab === 'withdrawals'
                ? 'bg-surface text-fg font-semibold shadow-e1'
                : 'text-fg-muted hover:text-fg'
            }`}
          >
            <Icon name="payments" size={18} />
            Lệnh Rút Tiền
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
              activeTab === 'analytics'
                ? 'bg-surface text-fg font-semibold shadow-e1'
                : 'text-fg-muted hover:text-fg'
            }`}
          >
            <Icon name="query_stats" size={18} />
            {'Doanh thu & bán hàng'}
          </button>
        </div>
      </div>

      {/* KPI Cards — mọi số đều từ `designer_profiles`; không có cột ⇒ '—' */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-surface p-4 rounded-lg border border-line-subtle">
          <div className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Tổng Nhà Thiết Kế</div>
          <div className="text-2xl font-bold tabular-nums text-fg mt-1">{error ? '—' : isLoading ? '…' : stats.totalDesigners}</div>
          <div className="text-xs text-fg-subtle font-medium mt-0.5">
            {error
              ? 'Lỗi đọc designer_profiles'
              : 'Bảng designer_profiles'}
          </div>
        </div>

        <div className="bg-surface p-4 rounded-lg border border-line-subtle">
          <div className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Tác Giả Hàng Đầu</div>
          <div className="text-2xl font-bold tabular-nums text-fg mt-1">{numOrDash(stats.topCreatorsCount)}</div>
          <div className="text-xs text-warning font-medium mt-0.5">
            {hasBadgeColumn ? ('Huy hiệu cao nhất') : noBadgeTierNote}
          </div>
        </div>

        <div className="bg-surface p-4 rounded-lg border border-line-subtle">
          <div className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Kỹ Sư CAD</div>
          <div className="text-2xl font-bold tabular-nums text-fg mt-1">{numOrDash(stats.verifiedEngineersCount)}</div>
          <div className="text-xs text-info font-medium mt-0.5">
            {hasBadgeColumn ? ('Kỹ thuật chính xác') : noBadgeTierNote}
          </div>
        </div>

        <div className="bg-surface p-4 rounded-lg border border-line-subtle">
          <div className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Tác giả tiên phong</div>
          <div className="text-2xl font-bold tabular-nums text-fg mt-1">{numOrDash(stats.pioneerMakersCount)}</div>
          <div className="text-xs text-info font-medium mt-0.5">
            {hasBadgeColumn ? ('Tạo mẫu sáng tạo') : noBadgeTierNote}
          </div>
        </div>

        <div className="bg-surface p-4 rounded-lg border border-line-subtle">
          <div className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Hoa hồng ghi nhận</div>
          <div className="text-lg font-bold tabular-nums text-fg mt-1 truncate">
            {stats.totalRoyaltiesPaidVnd === null ? '—' : formatVnd(stats.totalRoyaltiesPaidVnd)}
          </div>
          <div className="text-xs text-positive font-medium mt-0.5">
            {stats.totalRoyaltiesPaidVnd === null
              ? 'Bảng không có cột total_royalties_earned'
              : 'Tổng theo hồ sơ'}
          </div>
        </div>

        <div className="bg-surface p-4 rounded-lg border border-line-subtle">
          <div className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Chờ Quyết Toán</div>
          <div className="text-lg font-bold tabular-nums text-fg mt-1 truncate">—</div>
          <div className="text-xs text-danger font-medium mt-0.5">
            Chưa có nguồn dữ liệu chi trả
          </div>
        </div>
      </div>

      {/* TAB 1: DANH SÁCH DESIGNER & HUY HIỆU */}
      {activeTab === 'designers' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-surface p-4 rounded-lg border border-line">
            <div className="flex flex-wrap items-center gap-2">
              {hasBadgeColumn ? (
                <div className="inline-flex flex-wrap items-center gap-1 bg-surface-muted border border-line p-1 rounded-md text-sm">
                  <span className="text-fg-subtle px-1 text-xs uppercase tracking-wider">Huy hiệu:</span>
                  {(['all', 'TopCreator', 'VerifiedEngineer', 'PioneerMaker', 'Standard'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setFilterBadgeTier(t)}
                      className={`px-3 py-1.5 rounded-sm transition-colors cursor-pointer ${
                        filters.badgeTier === t
                          ? 'bg-surface text-fg font-semibold shadow-e1'
                          : 'text-fg-muted hover:text-fg'
                      }`}
                    >
                      {t === 'all'
                        ? ('Tất cả')
                        : t === 'TopCreator'
                        ? '👑 Tác giả hàng đầu'
                        : t === 'VerifiedEngineer'
                        ? '⚙️ Kỹ sư'
                        : t === 'PioneerMaker'
                        ? '🚀 Tiên phong'
                        : ('Tiêu chuẩn')}
                    </button>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-fg-subtle bg-surface-muted border border-line px-2.5 py-1.5 rounded-md">
                  {`Không lọc/gán huy hiệu được: ${noBadgeTierNote}.`}
                </span>
              )}

              <div className="inline-flex flex-wrap items-center gap-1 bg-surface-muted border border-line p-1 rounded-md text-sm">
                <span className="text-fg-subtle px-1 text-xs uppercase tracking-wider">
                  Xác thực:
                </span>
                {(['all', 'Verified', 'Pending'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilterVerifiedStatus(s)}
                    className={`px-3 py-1.5 rounded-sm transition-colors cursor-pointer ${
                      filters.verifiedStatus === s
                        ? 'bg-surface text-fg font-semibold shadow-e1'
                        : 'text-fg-muted hover:text-fg'
                    }`}
                  >
                    {s === 'all' ? ('Tất cả') : s === 'Verified' ? 'Đã duyệt' : 'Chờ duyệt'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-full md:w-72">
                <Icon name="search" size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-subtle pointer-events-none" />
                <Field label="Tìm tên nhà thiết kế, email" hideLabel optionalLabel={null}>
                  {(control) => (
                    <Input
                      {...control}
                      type="text"
                      aria-label="Tìm tên nhà thiết kế, email"
                      placeholder="Tìm tên nhà thiết kế, email..."
                      value={filters.searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8"
                    />
                  )}
                </Field>
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="shrink-0"
                leadingIcon={<Icon name="sync" size={16} className={isLoading ? 'animate-spin motion-reduce:animate-none' : ''} />}
                onClick={() => void loadDesigners()}
                disabled={isLoading}
              >
                Tải Lại
              </Button>
            </div>
          </div>

          {usersError !== null && (
            <p className="text-xs text-warning bg-warning-tint border border-warning/20 rounded-md px-3 py-2">
              {`Không ghép được hồ sơ người dùng (email/SĐT) từ user_profiles: ${usersError}`}
            </p>
          )}

          {/* Đang tải */}
          {isLoading && designers.length === 0 && error === null && (
            <div
              role="status"
              aria-label="Đang tải hồ sơ nhà thiết kế từ designer_profiles..."
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {[0, 1].map((i) => (
                <Skeleton key={i} variant="rect" height="11rem" rounded="lg" />
              ))}
            </div>
          )}

          {/* LỖI THẬT */}
          {error !== null && (
            <div role="alert" className="p-4 bg-danger-tint border border-danger/20 rounded-lg flex items-start gap-3">
              <Icon name="error" size={24} className="text-danger mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-danger text-sm">
                  Không đọc được bảng designer_profiles
                </h4>
                <p className="text-xs text-danger mt-1 font-mono break-all">{error}</p>
                <Button variant="secondary" size="sm" className="mt-2" onClick={() => void loadDesigners()}>
                  Thử lại
                </Button>
              </div>
            </div>
          )}

          {error === null && !isLoading && filteredDesigners.length === 0 && (
            <EmptyState
              size="sm"
              title="Chưa có nhà thiết kế nào"
              description={
                designers.length === 0
                  ? 'Bảng designer_profiles chưa có bản ghi nào.'
                  : 'Không có hồ sơ nhà thiết kế nào khớp bộ lọc hiện tại.'
              }
              icon={<Icon name="draw" size={20} className="text-primary" />}
              action={
                <Button variant="secondary" size="sm" onClick={() => setActiveTab('analytics')}>
                  Xem Doanh Thu Theo Nhà Thiết Kế
                </Button>
              }
            />
          )}

          {error === null && filteredDesigners.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredDesigners.map((d) => {
              const user = d.userId ? userById.get(d.userId) : undefined;
              return (
              <div
                key={d.id}
                className="bg-surface rounded-lg border border-line p-6 hover:shadow-e1 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {d.avatarUrl ? (
                        <img
                          src={d.avatarUrl}
                          alt={d.displayName}
                          className="w-13 h-13 rounded-md object-cover border border-line shrink-0"
                        />
                      ) : (
                        <span
                          aria-hidden="true"
                          className="w-13 h-13 rounded-md border border-line bg-surface-muted text-fg-muted font-semibold flex items-center justify-center shrink-0"
                        >
                          {(d.displayName || '?').charAt(0)}
                        </span>
                      )}
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-bold text-fg text-base">{d.displayName || '—'}</h3>
                          {d.badgeTier && (
                            <Badge
                              variant={
                                d.badgeTier === 'TopCreator'
                                  ? 'warning'
                                  : d.badgeTier === 'VerifiedEngineer' || d.badgeTier === 'PioneerMaker'
                                  ? 'info'
                                  : 'neutral'
                              }
                            >
                              {d.badgeTier === 'TopCreator' && '👑 Tác giả hàng đầu'}
                              {d.badgeTier === 'VerifiedEngineer' && '🛡️ Kỹ sư đã kiểm duyệt'}
                              {d.badgeTier === 'PioneerMaker' && '🚀 Nghệ nhân tiên phong'}
                              {d.badgeTier === 'Standard' && 'Tác giả tiêu chuẩn'}
                              {!['TopCreator', 'VerifiedEngineer', 'PioneerMaker', 'Standard'].includes(d.badgeTier) && d.badgeTier}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-fg-subtle mt-0.5">
                          {user?.email || '—'} • {user?.phone || ('Chưa cập nhật SĐT')}
                        </p>
                        <p className="text-xs text-fg-subtle mt-0.5 font-mono">
                          Xác thực: {verifiedStatusLabel(d.verifiedStatus)}
                          {d.rating !== null ? ` • ★ ${d.rating}` : ''}
                        </p>
                      </div>
                    </div>

                    <Button
                      variant="secondary"
                      size="sm"
                      className="shrink-0"
                      leadingIcon={<Icon name="tune" size={16} />}
                      onClick={() => handleOpenEdit(d)}
                    >
                      Cấu Hình
                    </Button>
                  </div>

                  {d.bio && (
                    <p className="text-xs text-fg-muted mt-3 line-clamp-2 bg-surface-muted p-2.5 rounded-md border border-line-subtle italic">
                      "{d.bio}"
                    </p>
                  )}

                  {/* Royalty & Sales — chỉ hiện số có thật trong DB */}
                  <div className="grid grid-cols-3 gap-2 mt-4 p-3 bg-surface-muted rounded-md border border-line-subtle">
                    <div>
                      <div className="text-xs text-fg-subtle font-semibold uppercase">Trần Hoa Hồng</div>
                      <div className="text-lg font-bold text-fg font-mono tabular-nums">
                        {d.royaltyPercent !== null ? `${d.royaltyPercent}%` : '—'}
                      </div>
                      <div className="text-xs text-fg-subtle">royalty_percent</div>
                    </div>
                    <div>
                      <div className="text-xs text-fg-subtle font-semibold uppercase">Doanh Số Ghi Nhận</div>
                      <div className="text-sm font-bold text-fg font-mono tabular-nums mt-0.5">
                        {numOrDash(d.totalSales)}
                      </div>
                      <div className="text-xs text-fg-subtle">total_sales</div>
                    </div>
                    <div>
                      <div className="text-xs text-fg-subtle font-semibold uppercase">Hoa Hồng Đã Trả</div>
                      <div className="text-sm font-bold text-warning font-mono tabular-nums mt-0.5">
                        {d.totalRoyaltiesEarned !== null ? formatVnd(d.totalRoyaltiesEarned) : '—'}
                      </div>
                      <div className="text-xs text-fg-subtle">
                        {d.totalRoyaltiesEarned !== null ? 'total_royalties_earned' : 'bảng không có cột này'}
                      </div>
                    </div>
                  </div>

                  {/* Bank info — cột thật của bảng */}
                  {(d.bankName || d.bankAccount || d.taxId || d.portfolioUrl) && (
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-fg-subtle bg-surface-muted border border-line-subtle px-2.5 py-1.5 rounded-md font-mono">
                      <Icon name="account_balance" size={16} className="text-fg-subtle" />
                      <span className="truncate">
                        {[d.bankName, d.bankAccount, d.taxId && `MST: ${d.taxId}`, d.portfolioUrl]
                          .filter(Boolean)
                          .join(' • ')}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-line-subtle flex items-center justify-between text-xs">
                  <span className="text-fg-subtle">
                    Gia nhập:{' '}
                    {d.createdAt ? new Date(d.createdAt).toLocaleDateString('vi-VN') : '—'}
                  </span>
                  <div className="flex items-center gap-2">
                    {hasBadgeColumn && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => void handleCycleTier(d)}
                      >
                        Thăng Hạng Nhanh
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              );
            })}
          </div>
          )}
        </div>
      )}

      {/* TAB 2: LỆNH RÚT TIỀN — CHƯA CÓ NGUỒN DỮ LIỆU DB */}
      {activeTab === 'withdrawals' && (
        <div className="space-y-4">
          <div className="bg-warning-tint p-4 rounded-lg border border-warning/20 flex items-start gap-3">
            <Icon name="warning" size={24} className="text-warning mt-0.5" />
            <div className="text-xs">
              <h4 className="font-semibold text-warning text-sm">
                Chưa có nguồn dữ liệu lệnh rút tiền trong DB
              </h4>
              <p className="text-fg-muted mt-1">
                Không có bảng nào lưu YÊU CẦU rút tiền của designer: `payment_transactions` (baseline schema) chỉ có order_id / transaction_id / amount / status — không có designer_id, số tài khoản hay thời điểm yêu cầu; và không có hàm service nào đọc bảng đó. Vì vậy màn này KHÔNG hiển thị danh sách thay thế và không cho duyệt/từ chối trên RAM.
              </p>
            </div>
          </div>
          <EmptyState
            size="sm"
            title="Không có bản ghi lệnh rút tiền"
            description="Cần một bảng + hàm service đọc/ghi yêu cầu rút tiền trước khi tab này có dữ liệu thật."
            icon={<Icon name="payments" size={20} className="text-primary" />}
            action={
              <Button variant="secondary" size="sm" onClick={() => setActiveTab('designers')}>
                Xem Nhà Thiết Kế
              </Button>
            }
          />
        </div>
      )}

      {/* TAB 3: THỐNG KÊ THEO DESIGNER — chỉ số có thật trong `designer_profiles` */}
      {activeTab === 'analytics' && (
        <div className="space-y-4">
          <div className="bg-surface p-4 rounded-lg border border-line text-xs">
            <h4 className="font-semibold text-fg text-sm">
              Số liệu đọc từ designer_profiles
            </h4>
            <p className="text-fg-subtle mt-0.5">
              Chỉ hiển thị các cột có thật (`total_sales`, `rating`). Doanh thu theo tháng và số đơn hoàn thành KHÔNG có cột trong bảng nên để trống thay vì bịa số.
            </p>
          </div>

          {error !== null ? (
            <div role="alert" className="p-4 bg-danger-tint border border-danger/20 rounded-lg text-xs text-danger font-mono break-all">
              {error}
            </div>
          ) : designers.length === 0 ? (
            <EmptyState
              size="sm"
              title="Chưa có dữ liệu theo designer"
              description={
                isLoading
                  ? 'Đang tải...'
                  : 'Bảng designer_profiles chưa có bản ghi nào.'
              }
              icon={<Icon name="analytics" size={20} className="text-primary" />}
              action={
                <Button variant="secondary" size="sm" onClick={() => setActiveTab('designers')}>
                  Xem Nhà Thiết Kế
                </Button>
              }
            />
          ) : (
            <DataTable<DesignerRow>
              columns={analyticsColumns}
              rows={designers}
              getRowId={(row) => row.id}
              caption="Thống kê theo designer"
              tableLabel="Thống kê theo designer"
              defaultSort={[{ key: 'totalSales', direction: 'desc' }]}
            />
          )}
        </div>
      )}

      {/* MODAL: CHỈNH SỬA HOA HỒNG (và huy hiệu nếu bảng có cột) */}
      {editingDesigner && (
        <Modal
          open
          onClose={() => setEditingDesigner(null)}
          size="md"
          title={'Cấu Hình Nhà Thiết Kế & Bản Quyền'}
          description={editingDesigner.displayName}
        >
            <form onSubmit={handleSaveDesigner} className="space-y-4">
              {hasBadgeColumn ? (
                <Field label="Gán Huy Hiệu:" optionalLabel={null}>
                  {() => (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {BADGE_TIERS.map((tier) => (
                        <button
                          key={tier.id}
                          type="button"
                          aria-pressed={badgeDraft === tier.id}
                          onClick={() => setBadgeDraft(tier.id)}
                          className={`min-h-11 p-3 text-left rounded-md border text-xs transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                            badgeDraft === tier.id
                              ? 'border-primary bg-primary-tint ring-2 ring-ring/20'
                              : 'border-line hover:bg-surface-muted'
                          }`}
                        >
                          <div className="font-semibold text-fg">{tier.label}</div>
                          <div className="text-xs text-fg-subtle mt-0.5">{tier.desc}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </Field>
              ) : (
                <p className="text-xs text-fg-muted bg-surface-muted border border-line-subtle rounded-md px-3 py-2">
                  {`Mục huy hiệu được ẩn (không ghi vào cột không tồn tại): ${noBadgeTierNote}.`}
                </p>
              )}

              {/* Royalty slider — ghi `royalty_percent` */}
              <Field
                label={
                  <span className="flex items-center justify-between gap-2">
                    <span>Trần Hoa Hồng Bản Quyền (%):</span>
                    <span className="font-mono font-bold tabular-nums text-sm text-fg">{royaltyDraft}%</span>
                  </span>
                }
                optionalLabel={null}
              >
                {(control) => (
                  <div>
                    <input
                      {...control}
                      type="range"
                      min={5}
                      max={25}
                      step={1}
                      value={royaltyDraft}
                      onChange={(e) => setRoyaltyDraft(Number(e.target.value))}
                      className="w-full accent-primary cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-fg-subtle mt-1 font-mono">
                      <span>Tối thiểu: 5%</span>
                      <span>Mặc định: 10%</span>
                      <span>Tối đa: 25%</span>
                    </div>
                    <p className="text-xs text-fg-subtle mt-1.5">
                      {editingDesigner.royaltyPercent === null
                        ? 'Hiện DB chưa có giá trị royalty_percent cho hồ sơ này. Thanh trượt đang ở 10% chỉ là điểm bắt đầu — bấm Lưu mới ghi.'
                        : 'Giá trị đang lưu trong DB được nạp sẵn vào thanh trượt.'}
                    </p>
                  </div>
                )}
              </Field>

              <div className="flex justify-end gap-2 pt-4 border-t border-line-subtle">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setEditingDesigner(null)}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSavingDesigner}
                >
                  {isSavingDesigner ? ('Đang lưu...') : 'Lưu Vào DB'}
                </Button>
              </div>
            </form>
        </Modal>
      )}
    </div>
  );
};
export default Group2DesignersPanel;
