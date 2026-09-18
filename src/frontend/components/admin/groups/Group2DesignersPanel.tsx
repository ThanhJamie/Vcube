import React, { useState, useMemo, useEffect } from 'react';
import { useDesignerAdminStore, DesignerRow } from '../../../../stores/useDesignerAdminStore';
import { useLanguage } from '../../../context/LanguageContext';
import { dbService } from '../../../../backend/supabase/database';
import { AppUserProfile } from '../../../../types';
import { Button, DataTable, EmptyState, Icon, InfoTip, Modal } from '@frontend/ui';
import type { DataTableColumn } from '@frontend/ui';

export interface Group2DesignersPanelProps {
  onShowToast?: (message: string) => void;
  onNavigateSection?: (section: any) => void;
}

const BADGE_TIERS = [
  { id: 'TopCreator', label: '👑 Top Creator', desc: 'Nhà sáng tạo xuất sắc' },
  { id: 'VerifiedEngineer', label: '🛡️ Verified Engineer', desc: 'Kỹ sư cơ khí kiểm duyệt' },
  { id: 'PioneerMaker', label: '🚀 Pioneer Maker', desc: 'Nghệ nhân tiên phong' },
  { id: 'Standard', label: 'Tiêu Chuẩn', desc: 'Creator phổ thông' }
] as const;

export const Group2DesignersPanel: React.FC<Group2DesignersPanelProps> = ({
  onShowToast,
  onNavigateSection
}) => {
  const { language } = useLanguage();
  const isVi = language === 'vi';

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
      ? isVi
        ? 'chưa xác định được cột vì bảng chưa có bản ghi nào'
        : 'columns unknown because the table has no row yet'
      : isVi
      ? 'bảng designer_profiles không có cột badge_tier'
      : 'designer_profiles has no badge_tier column';

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
          setUsersError(err?.message || (isVi ? 'lỗi không xác định' : 'unknown error'));
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [isVi]);

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
          isVi
            ? `Lưu hồ sơ designer thất bại: ${res.error || 'lỗi không xác định'}`
            : `Failed to save designer profile: ${res.error || 'unknown error'}`
        );
        return; // giữ modal mở để không mất thao tác vừa nhập
      }
      setEditingDesigner(null);
      onShowToast?.(
        isVi
          ? `Đã lưu vào designer_profiles: ${editingDesigner.displayName}`
          : `Saved to designer_profiles: ${editingDesigner.displayName}`
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
        ? isVi
          ? `Đã đổi huy hiệu ${d.displayName} thành ${nextTier}`
          : `Changed ${d.displayName} tier to ${nextTier}`
        : isVi
        ? `Đổi huy hiệu thất bại: ${res.error}`
        : `Failed to change tier: ${res.error}`
    );
  };

  /** Cột bảng thống kê designer dùng primitive `DataTable`. */
  const analyticsColumns = useMemo<DataTableColumn<DesignerRow>[]>(() => [
    {
      key: 'designer',
      header: 'Designer',
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
      header: isVi ? 'Trần hoa hồng' : 'Royalty cap',
      numeric: true,
      value: (d) => d.royaltyPercent ?? 0,
      render: (d) => <span className="font-bold text-primary">{d.royaltyPercent !== null ? `${d.royaltyPercent}%` : '—'}</span>,
    },
    { key: 'totalSales', header: 'total_sales', numeric: true, value: (d) => d.totalSales ?? 0, render: (d) => numOrDash(d.totalSales) },
    { key: 'rating', header: isVi ? 'Đánh giá' : 'Rating', numeric: true, value: (d) => d.rating ?? 0, render: (d) => numOrDash(d.rating) },
    { key: 'verifiedStatus', header: isVi ? 'Xác thực' : 'Verified', value: (d) => d.verifiedStatus || '', render: (d) => <span className="text-fg-muted">{d.verifiedStatus || '—'}</span> },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [isVi]);

  return (
    <div className="space-y-6">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-5 rounded-lg border border-line-subtle shadow-e1">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-warning/10 text-warning">
              Nhà thiết kế
            </span>
            <h2 className="text-xl font-black text-fg tracking-tight">
              {isVi ? 'Quản Trị Nhà Thiết Kế & Bản Quyền (Designers Hub)' : 'Designers & IP Royalty Hub'}
            </h2>
          </div>
          <div className="mt-1">
            <InfoTip label={isVi ? 'Mục này quản trị những gì?' : 'What does this hub manage?'}>
              {isVi
                ? 'Hồ sơ nhà thiết kế đọc/ghi trực tiếp bảng designer_profiles: trần hoa hồng bản quyền và (nếu bảng có cột) huy hiệu.'
                : 'Designer profiles are read/written directly to designer_profiles: royalty cap and (when the column exists) badge tier.'}
            </InfoTip>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-surface-muted rounded-lg">
          <button
            onClick={() => setActiveTab('designers')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'designers'
                ? 'bg-surface text-primary shadow-e1'
                : 'text-fg-muted hover:text-fg'
            }`}
          >
            <Icon name="palette" size={18} />
            {isVi ? 'Hồ Sơ Designers' : 'Designers'}
          </button>
          <button
            onClick={() => setActiveTab('withdrawals')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'withdrawals'
                ? 'bg-surface text-primary shadow-e1'
                : 'text-fg-muted hover:text-fg'
            }`}
          >
            <Icon name="payments" size={18} />
            {isVi ? 'Lệnh Rút Tiền' : 'Payouts'}
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'analytics'
                ? 'bg-surface text-primary shadow-e1'
                : 'text-fg-muted hover:text-fg'
            }`}
          >
            <Icon name="query_stats" size={18} />
            {isVi ? 'Doanh Thu & Sales' : 'Sales Stats'}
          </button>
        </div>
      </div>

      {/* KPI Cards — mọi số đều từ `designer_profiles`; không có cột ⇒ '—' */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-surface p-3.5 rounded-lg border border-line-subtle shadow-e0">
          <div className="text-xs font-bold uppercase text-fg-subtle">{isVi ? 'Tổng Designers' : 'Total Designers'}</div>
          <div className="text-2xl font-black text-fg mt-1">{error ? '—' : isLoading ? '…' : stats.totalDesigners}</div>
          <div className="text-xs text-fg-subtle font-semibold mt-0.5">
            {error
              ? isVi ? 'Lỗi đọc designer_profiles' : 'designer_profiles read failed'
              : isVi ? 'Bảng designer_profiles' : 'designer_profiles table'}
          </div>
        </div>

        <div className="bg-surface p-3.5 rounded-lg border border-warning/30 bg-warning-tint/20 shadow-e0">
          <div className="text-xs font-bold uppercase text-warning">{isVi ? 'Top Creators' : 'Top Creators'}</div>
          <div className="text-2xl font-black text-warning mt-1">{numOrDash(stats.topCreatorsCount)}</div>
          <div className="text-xs text-warning font-semibold mt-0.5">
            {hasBadgeColumn ? (isVi ? 'Huy hiệu cao nhất' : 'Elite tier') : noBadgeTierNote}
          </div>
        </div>

        <div className="bg-surface p-3.5 rounded-lg border border-info/30 bg-info-tint/20 shadow-e0">
          <div className="text-xs font-bold uppercase text-info">{isVi ? 'Kỹ Sư CAD' : 'Verified Eng.'}</div>
          <div className="text-2xl font-black text-info mt-1">{numOrDash(stats.verifiedEngineersCount)}</div>
          <div className="text-xs text-info font-semibold mt-0.5">
            {hasBadgeColumn ? (isVi ? 'Kỹ thuật chính xác' : 'Mechanical') : noBadgeTierNote}
          </div>
        </div>

        <div className="bg-surface p-3.5 rounded-lg border border-info/30 bg-info-tint/20 shadow-e0">
          <div className="text-xs font-bold uppercase text-info">{isVi ? 'Pioneer Makers' : 'Pioneers'}</div>
          <div className="text-2xl font-black text-info mt-1">{numOrDash(stats.pioneerMakersCount)}</div>
          <div className="text-xs text-info font-semibold mt-0.5">
            {hasBadgeColumn ? (isVi ? 'Tạo mẫu sáng tạo' : 'Artistic') : noBadgeTierNote}
          </div>
        </div>

        <div className="bg-surface p-3.5 rounded-lg border border-positive/30 bg-positive-tint/20 shadow-e0">
          <div className="text-xs font-bold uppercase text-positive">{isVi ? 'Royalties Ghi Nhận' : 'Royalties Recorded'}</div>
          <div className="text-lg font-black text-positive mt-1 truncate">
            {stats.totalRoyaltiesPaidVnd === null ? '—' : formatVnd(stats.totalRoyaltiesPaidVnd)}
          </div>
          <div className="text-xs text-positive font-semibold mt-0.5">
            {stats.totalRoyaltiesPaidVnd === null
              ? isVi ? 'Bảng không có cột total_royalties_earned' : 'no total_royalties_earned column'
              : isVi ? 'Tổng theo hồ sơ' : 'From profiles'}
          </div>
        </div>

        <div className="bg-surface p-3.5 rounded-lg border border-danger/30 bg-danger-tint/20 shadow-e0">
          <div className="text-xs font-bold uppercase text-danger">{isVi ? 'Chờ Quyết Toán' : 'Pending Payout'}</div>
          <div className="text-lg font-black text-danger mt-1 truncate">—</div>
          <div className="text-xs text-danger font-semibold mt-0.5">
            {isVi ? 'Chưa có nguồn dữ liệu chi trả' : 'No payout data source'}
          </div>
        </div>
      </div>

      {/* TAB 1: DANH SÁCH DESIGNER & HUY HIỆU */}
      {activeTab === 'designers' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-surface p-3.5 rounded-lg border border-line-subtle shadow-e0">
            <div className="flex flex-wrap items-center gap-2">
              {hasBadgeColumn ? (
                <div className="flex items-center gap-1 bg-surface-muted p-1 rounded-lg text-xs font-semibold">
                  <span className="text-fg-subtle px-1 text-xs uppercase tracking-wider">{isVi ? 'Huy hiệu:' : 'Badge Tier:'}</span>
                  {(['all', 'TopCreator', 'VerifiedEngineer', 'PioneerMaker', 'Standard'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setFilterBadgeTier(t)}
                      className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                        filters.badgeTier === t
                          ? 'bg-surface text-primary font-bold shadow-e0'
                          : 'text-fg-muted hover:text-fg'
                      }`}
                    >
                      {t === 'all'
                        ? (isVi ? 'Tất cả' : 'All')
                        : t === 'TopCreator'
                        ? '👑 Top Creator'
                        : t === 'VerifiedEngineer'
                        ? '⚙️ Engineer'
                        : t === 'PioneerMaker'
                        ? '🚀 Pioneer'
                        : (isVi ? 'Tiêu chuẩn' : 'Standard')}
                    </button>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-fg-subtle bg-surface-muted px-2.5 py-1.5 rounded-lg">
                  {isVi
                    ? `Không lọc/gán huy hiệu được: ${noBadgeTierNote}.`
                    : `Tier filter/assignment unavailable: ${noBadgeTierNote}.`}
                </span>
              )}

              <div className="flex items-center gap-1 bg-surface-muted p-1 rounded-lg text-xs font-semibold">
                <span className="text-fg-subtle px-1 text-xs uppercase tracking-wider">
                  {isVi ? 'Xác thực:' : 'Verified:'}
                </span>
                {(['all', 'Verified', 'Pending'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilterVerifiedStatus(s)}
                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                      filters.verifiedStatus === s
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
              <div className="relative w-full md:w-72">
                <Icon name="search" size={16} className="absolute left-2.5 top-2 text-fg-subtle" />
                <input
                  type="text"
                  placeholder={isVi ? 'Tìm tên designer, email...' : 'Search designer...'}
                  value={filters.searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-canvas border border-line-subtle rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus:border-primary focus:bg-surface"
                />
              </div>
              <button
                onClick={() => void loadDesigners()}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-surface-subtle hover:bg-canvas text-fg-muted text-xs font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-60 shrink-0"
              >
                <Icon name="sync" size={16} className={isLoading ? 'animate-spin motion-reduce:animate-none' : ''} />
                {isVi ? 'Tải Lại' : 'Reload'}
              </button>
            </div>
          </div>

          {usersError !== null && (
            <p className="text-xs text-warning bg-warning-tint border border-warning/30 rounded-lg px-3 py-2">
              {isVi
                ? `Không ghép được hồ sơ người dùng (email/SĐT) từ user_profiles: ${usersError}`
                : `Could not join user profiles (email/phone) from user_profiles: ${usersError}`}
            </p>
          )}

          {/* Đang tải */}
          {isLoading && designers.length === 0 && error === null && (
            <div className="bg-surface p-6 rounded-lg border border-line-subtle shadow-e0 text-center text-xs text-fg-subtle">
              {isVi ? 'Đang tải hồ sơ nhà thiết kế từ designer_profiles...' : 'Loading designer profiles from designer_profiles...'}
            </div>
          )}

          {/* LỖI THẬT */}
          {error !== null && (
            <div role="alert" className="p-4 bg-danger-tint border border-danger/30 rounded-lg flex items-start gap-3">
              <Icon name="error" size={24} className="text-danger mt-0.5" />
              <div className="flex-1">
                <h4 className="font-bold text-danger text-sm">
                  {isVi ? 'Không đọc được bảng designer_profiles' : 'Could not read the designer_profiles table'}
                </h4>
                <p className="text-xs text-danger mt-1 font-mono break-all">{error}</p>
                <button
                  onClick={() => void loadDesigners()}
                  className="mt-2 px-3 py-1 bg-surface border border-danger/30 text-danger text-xs font-bold rounded-lg cursor-pointer"
                >
                  {isVi ? 'Thử lại' : 'Retry'}
                </button>
              </div>
            </div>
          )}

          {error === null && !isLoading && filteredDesigners.length === 0 && (
            <EmptyState
              size="sm"
              title={isVi ? 'Chưa có nhà thiết kế nào' : 'No designer yet'}
              description={
                designers.length === 0
                  ? isVi
                    ? 'Bảng designer_profiles chưa có bản ghi nào.'
                    : 'The designer_profiles table has no row yet.'
                  : isVi
                  ? 'Không có hồ sơ nhà thiết kế nào khớp bộ lọc hiện tại.'
                  : 'No designer profile matches the current filter.'
              }
              icon={<Icon name="draw" size={20} className="text-primary" />}
              action={
                <Button variant="secondary" size="sm" onClick={() => setActiveTab('analytics')}>
                  {isVi ? 'Xem Doanh Thu Theo Designer' : 'View revenue by designer'}
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
                className="bg-surface rounded-lg border border-line-subtle p-5 shadow-e0 hover:shadow-e1 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {d.avatarUrl ? (
                        <img
                          src={d.avatarUrl}
                          alt={d.displayName}
                          className="w-13 h-13 rounded-full object-cover border-2 border-line-subtle shadow-e0 shrink-0"
                        />
                      ) : (
                        <span
                          aria-hidden="true"
                          className="w-13 h-13 rounded-full border-2 border-line-subtle bg-surface-muted text-fg-muted font-bold flex items-center justify-center shrink-0"
                        >
                          {(d.displayName || '?').charAt(0)}
                        </span>
                      )}
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-bold text-fg text-base">{d.displayName || '—'}</h3>
                          {d.badgeTier && (
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1 shadow-e0 ${
                                d.badgeTier === 'TopCreator'
                                  ? 'bg-warning-tint text-warning border border-warning/30'
                                  : d.badgeTier === 'VerifiedEngineer'
                                  ? 'bg-info-tint text-info border border-info/30'
                                  : d.badgeTier === 'PioneerMaker'
                                  ? 'bg-info-tint text-info border border-info/30'
                                  : 'bg-surface-muted text-fg-muted border border-line-subtle'
                              }`}
                            >
                              {d.badgeTier === 'TopCreator' && '👑 Top Creator'}
                              {d.badgeTier === 'VerifiedEngineer' && '🛡️ Verified Engineer'}
                              {d.badgeTier === 'PioneerMaker' && '🚀 Pioneer Maker'}
                              {d.badgeTier === 'Standard' && 'Standard Maker'}
                              {!['TopCreator', 'VerifiedEngineer', 'PioneerMaker', 'Standard'].includes(d.badgeTier) && d.badgeTier}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-fg-subtle mt-0.5">
                          {user?.email || '—'} • {user?.phone || (isVi ? 'Chưa cập nhật SĐT' : 'No phone')}
                        </p>
                        <p className="text-xs text-fg-subtle mt-0.5 font-mono">
                          {isVi ? 'Xác thực:' : 'Verified:'} {d.verifiedStatus || '—'}
                          {d.rating !== null ? ` • ★ ${d.rating}` : ''}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleOpenEdit(d)}
                      className="px-3 py-1 bg-surface-muted hover:bg-primary/10 text-fg-muted hover:text-primary text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Icon name="tune" size={16} />
                      {isVi ? 'Cấu Hình' : 'Configure'}
                    </button>
                  </div>

                  {d.bio && (
                    <p className="text-xs text-fg-muted mt-3 line-clamp-2 bg-canvas p-2 rounded-lg border border-line-subtle italic">
                      "{d.bio}"
                    </p>
                  )}

                  {/* Royalty & Sales — chỉ hiện số có thật trong DB */}
                  <div className="grid grid-cols-3 gap-2 mt-4 p-3 bg-canvas/80 rounded-lg border border-line-subtle">
                    <div>
                      <div className="text-xs text-fg-subtle font-bold uppercase">{isVi ? 'Trần Royalty' : 'Royalty Cap'}</div>
                      <div className="text-lg font-black text-primary font-mono">
                        {d.royaltyPercent !== null ? `${d.royaltyPercent}%` : '—'}
                      </div>
                      <div className="text-xs text-fg-subtle">royalty_percent</div>
                    </div>
                    <div>
                      <div className="text-xs text-fg-subtle font-bold uppercase">{isVi ? 'Doanh Số Ghi Nhận' : 'Recorded Sales'}</div>
                      <div className="text-sm font-bold text-fg font-mono mt-0.5">
                        {numOrDash(d.totalSales)}
                      </div>
                      <div className="text-xs text-fg-subtle">total_sales</div>
                    </div>
                    <div>
                      <div className="text-xs text-fg-subtle font-bold uppercase">{isVi ? 'Hoa Hồng Đã Trả' : 'Royalties Paid'}</div>
                      <div className="text-sm font-bold text-warning font-mono mt-0.5">
                        {d.totalRoyaltiesEarned !== null ? formatVnd(d.totalRoyaltiesEarned) : '—'}
                      </div>
                      <div className="text-xs text-fg-subtle">
                        {d.totalRoyaltiesEarned !== null ? 'total_royalties_earned' : isVi ? 'bảng không có cột này' : 'no such column'}
                      </div>
                    </div>
                  </div>

                  {/* Bank info — cột thật của bảng */}
                  {(d.bankName || d.bankAccount || d.taxId || d.portfolioUrl) && (
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-fg-subtle bg-surface-muted/60 px-2.5 py-1.5 rounded-lg font-mono">
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
                    {isVi ? 'Gia nhập:' : 'Joined:'}{' '}
                    {d.createdAt ? new Date(d.createdAt).toLocaleDateString('vi-VN') : '—'}
                  </span>
                  <div className="flex items-center gap-2">
                    {hasBadgeColumn && (
                      <button
                        onClick={() => void handleCycleTier(d)}
                        className="px-2.5 py-1 bg-warning-tint hover:bg-warning-tint text-warning text-xs font-bold rounded-sm cursor-pointer"
                      >
                        {isVi ? 'Thăng Hạng Nhanh' : 'Cycle Tier'}
                      </button>
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
          <div className="bg-surface p-4 rounded-lg border border-warning/30 bg-warning-tint/20 flex items-start gap-3">
            <Icon name="warning" size={24} className="text-warning mt-0.5" />
            <div className="text-xs">
              <h4 className="font-bold text-warning text-sm">
                {isVi ? 'Chưa có nguồn dữ liệu lệnh rút tiền trong DB' : 'No DB source for payout requests yet'}
              </h4>
              <p className="text-fg-muted mt-1">
                {isVi
                  ? 'Không có bảng nào lưu YÊU CẦU rút tiền của designer: `payment_transactions` (baseline schema) chỉ có order_id / transaction_id / amount / status — không có designer_id, số tài khoản hay thời điểm yêu cầu; và không có hàm service nào đọc bảng đó. Vì vậy màn này KHÔNG hiển thị danh sách thay thế và không cho duyệt/từ chối trên RAM.'
                  : 'No table stores designer payout REQUESTS: `payment_transactions` only has order_id / transaction_id / amount / status — no designer_id, bank account or requested-at; and no service function reads it. This screen therefore shows no substitute list and offers no RAM-only approve/reject.'}
              </p>
            </div>
          </div>
          <EmptyState
            size="sm"
            title={isVi ? 'Không có bản ghi lệnh rút tiền' : 'No payout request record'}
            description={
              isVi
                ? 'Cần một bảng + hàm service đọc/ghi yêu cầu rút tiền trước khi tab này có dữ liệu thật.'
                : 'A table plus service read/write for payout requests is required before this tab can hold real data.'
            }
            icon={<Icon name="payments" size={20} className="text-primary" />}
            action={
              <Button variant="secondary" size="sm" onClick={() => setActiveTab('designers')}>
                {isVi ? 'Xem Nhà Thiết Kế' : 'View designers'}
              </Button>
            }
          />
        </div>
      )}

      {/* TAB 3: THỐNG KÊ THEO DESIGNER — chỉ số có thật trong `designer_profiles` */}
      {activeTab === 'analytics' && (
        <div className="space-y-4">
          <div className="bg-surface p-4 rounded-lg border border-line-subtle shadow-e0 text-xs">
            <h4 className="font-bold text-fg text-sm">
              {isVi ? 'Số liệu đọc từ designer_profiles' : 'Numbers read from designer_profiles'}
            </h4>
            <p className="text-fg-subtle mt-0.5">
              {isVi
                ? 'Chỉ hiển thị các cột có thật (`total_sales`, `rating`). Doanh thu theo tháng và số đơn hoàn thành KHÔNG có cột trong bảng nên để trống thay vì bịa số.'
                : 'Only real columns are shown (`total_sales`, `rating`). Monthly revenue and completed orders have no column, so they are left blank instead of invented.'}
            </p>
          </div>

          {error !== null ? (
            <div role="alert" className="p-4 bg-danger-tint border border-danger/30 rounded-lg text-xs text-danger font-mono break-all">
              {error}
            </div>
          ) : designers.length === 0 ? (
            <EmptyState
              size="sm"
              title={isVi ? 'Chưa có dữ liệu theo designer' : 'No per-designer data yet'}
              description={
                isLoading
                  ? isVi ? 'Đang tải...' : 'Loading...'
                  : isVi
                  ? 'Bảng designer_profiles chưa có bản ghi nào.'
                  : 'designer_profiles has no row yet.'
              }
              icon={<Icon name="analytics" size={20} className="text-primary" />}
              action={
                <Button variant="secondary" size="sm" onClick={() => setActiveTab('designers')}>
                  {isVi ? 'Xem Nhà Thiết Kế' : 'View designers'}
                </Button>
              }
            />
          ) : (
            <DataTable<DesignerRow>
              columns={analyticsColumns}
              rows={designers}
              getRowId={(row) => row.id}
              caption={isVi ? 'Thống kê theo designer' : 'Per-designer analytics'}
              tableLabel={isVi ? 'Thống kê theo designer' : 'Per-designer analytics'}
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
          title={isVi ? 'Cấu Hình Designer & Bản Quyền' : 'Configure Designer & IP'}
          description={editingDesigner.displayName}
        >
            <form onSubmit={handleSaveDesigner} className="space-y-4">
              {hasBadgeColumn ? (
                <div>
                  <label className="block text-xs font-bold text-fg-muted mb-1.5">
                    {isVi ? 'Gán Huy Hiệu Badge Tier:' : 'Badge Tier Assignment:'}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {BADGE_TIERS.map((tier) => (
                      <button
                        key={tier.id}
                        type="button"
                        onClick={() => setBadgeDraft(tier.id)}
                        className={`p-2.5 text-left rounded-lg border text-xs transition-colors cursor-pointer ${
                          badgeDraft === tier.id
                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                            : 'border-line-subtle hover:bg-canvas'
                        }`}
                      >
                        <div className="font-bold text-fg">{tier.label}</div>
                        <div className="text-xs text-fg-subtle mt-0.5">{tier.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-fg-muted bg-surface-muted rounded-lg px-3 py-2">
                  {isVi
                    ? `Mục huy hiệu được ẩn (không ghi vào cột không tồn tại): ${noBadgeTierNote}.`
                    : `The tier section is hidden (no write to a non-existent column): ${noBadgeTierNote}.`}
                </p>
              )}

              {/* Royalty slider — ghi `royalty_percent` */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-fg-muted">
                    {isVi ? 'Trần Hoa Hồng Bản Quyền (% Royalty):' : 'Royalty Rate (%):'}
                  </label>
                  <span className="font-mono font-black text-sm text-primary">{royaltyDraft}%</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={25}
                  step={1}
                  value={royaltyDraft}
                  onChange={(e) => setRoyaltyDraft(Number(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
                <div className="flex justify-between text-xs text-fg-subtle mt-1 font-mono">
                  <span>Min: 5%</span>
                  <span>{isVi ? 'Mặc định: 10%' : 'Default: 10%'}</span>
                  <span>{isVi ? 'Trần max: 25%' : 'Max: 25%'}</span>
                </div>
                <p className="text-xs text-fg-subtle mt-1.5">
                  {editingDesigner.royaltyPercent === null
                    ? isVi
                      ? 'Hiện DB chưa có giá trị royalty_percent cho hồ sơ này. Thanh trượt đang ở 10% chỉ là điểm bắt đầu — bấm Lưu mới ghi.'
                      : 'The DB currently has no royalty_percent for this profile. The slider starts at 10% but only Save writes it.'
                    : isVi
                    ? 'Giá trị đang lưu trong DB được nạp sẵn vào thanh trượt.'
                    : 'The value currently stored in the DB is loaded into the slider.'}
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-line-subtle">
                <button
                  type="button"
                  onClick={() => setEditingDesigner(null)}
                  className="px-4 py-2 bg-surface-muted text-fg-muted text-xs font-bold rounded-lg cursor-pointer"
                >
                  {isVi ? 'Hủy' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSavingDesigner}
                  className="px-4 py-2 bg-primary text-primary-fg text-xs font-bold rounded-lg shadow-e1 cursor-pointer disabled:opacity-60"
                >
                  {isSavingDesigner ? (isVi ? 'Đang lưu...' : 'Saving...') : isVi ? 'Lưu Vào DB' : 'Save to DB'}
                </button>
              </div>
            </form>
        </Modal>
      )}
    </div>
  );
};
export default Group2DesignersPanel;
