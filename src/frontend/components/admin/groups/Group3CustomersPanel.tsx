import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useCustomerAdminStore, CustomerRow, isB2b } from '@frontend/stores/useCustomerAdminStore';
import { dbService } from '../../../../backend/supabase/database';
import { designerService } from '../../../../backend/services/designerService';
import { AppUserProfile } from '../../../../types';
import { Badge, Button, ConfirmDialog, DataTable, EmptyState, Field, Icon, InfoTip, Input, Modal, Skeleton } from '@frontend/ui';
import type { DataTableColumn } from '@frontend/ui';

export type KycStatus = 'verified' | 'pending_review' | 'rejected' | 'unverified';

export interface KycRow {
  uid: string;
  displayName: string;
  email: string;
  phone: string;
  role: string;
  company: string;
  kycStatus: KycStatus;
  accountStatus: string;
  totalOrders: number;
  totalSpent: number;
  notes: string;
}

/** Nhãn VI cho giá trị enum khi HIỂN THỊ — không render thô giá trị DB ra UI. */
const kycStatusLabel = (status: string): string =>
  status === 'verified'
    ? 'Đã duyệt'
    : status === 'pending_review'
      ? 'Chờ duyệt'
      : status === 'rejected'
        ? 'Bị từ chối'
        : status === 'unverified'
          ? 'Chưa xác minh'
          : status;

const roleLabel = (role: string): string =>
  role === 'admin'
    ? 'Quản trị viên'
    : role === 'designer'
      ? 'Tác giả 3D'
      : role === 'lab'
        ? 'Xưởng in'
        : role === 'customer'
          ? 'Khách hàng'
          : role;

const accountStatusLabel = (status: string): string =>
  status === 'active' ? 'Đang hoạt động' : status === 'suspended' ? 'Tạm khoá' : status;

const toKycRow = (u: AppUserProfile): KycRow => {
  const raw = (u.kycStatus as string) || 'unverified';
  return {
    uid: u.uid,
    displayName: u.displayName || u.email || u.uid,
    email: u.email || '',
    phone: u.phone || '',
    role: (u.role as string) || 'customer',
    company: u.company || '',
    kycStatus: (raw === 'pending' ? 'pending_review' : raw) as KycStatus,
    accountStatus: (u.accountStatus as string) || 'active',
    totalOrders: Number(u.totalOrders || 0),
    totalSpent: Number(u.totalSpent || 0),
    notes: u.notes || '',
  };
};

interface Group3CustomersPanelProps {
  onShowToast?: (message: string) => void;
  onNavigateSection?: (section: any) => void;
}

export const Group3CustomersPanel: React.FC<Group3CustomersPanelProps> = ({
  onShowToast,
  onNavigateSection
}) => {

  const [activeTab, setActiveTab] = useState<'customers' | 'nda' | 'rfq' | 'kyc'>('customers');

  // Store khách hàng — đọc/ghi bảng THẬT `customer_profiles` (xem chú thích đầu store).
  const {
    customers,
    isLoading: isCustomersLoading,
    error: customersError,
    filters,
    setFilterCustomerType,
    setFilterNdaStatus,
    setSearchQuery,
    loadCustomers,
    setNdaSigned,
    getCustomerStats
  } = useCustomerAdminStore();

  const stats = getCustomerStats();
  /** Id hồ sơ đang ghi NDA (khoá nút để không bấm đôi). */
  const [savingNdaId, setSavingNdaId] = useState<string | null>(null);

  // Modals state
  const [selectedCustomerForNda, setSelectedCustomerForNda] = useState<CustomerRow | null>(null);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  // ==========================================================================
  // HỒ SƠ ĐỊNH DANH (KYC) ĐỌC/GHI TỪ BẢNG `user_profiles`
  // Port từ AdminUsersPanel (đã xoá) để luồng duyệt / từ chối KYC không mất.
  // ==========================================================================
  const [kycRows, setKycRows] = useState<KycRow[]>([]);
  const [isKycLoading, setIsKycLoading] = useState(false);
  const [kycSearch, setKycSearch] = useState('');
  const [kycFilter, setKycFilter] = useState<'all' | KycStatus>('all');
  const [reviewingKyc, setReviewingKyc] = useState<KycRow | null>(null);
  const [kycRejectionReason, setKycRejectionReason] = useState('');

  const loadKycRows = useCallback(async () => {
    setIsKycLoading(true);
    try {
      const rows = await dbService.getUsers();
      setKycRows(Array.isArray(rows) ? rows.map(toKycRow) : []);
    } catch (err: any) {
      onShowToast?.(
        `Không tải được hồ sơ KYC: ${err?.message || 'lỗi không xác định'}`
      );
    } finally {
      setIsKycLoading(false);
    }
  }, [onShowToast]);

  useEffect(() => {
    void loadKycRows();
  }, [loadKycRows]);

  const pendingKycCount = useMemo(
    () => kycRows.filter((r) => r.kycStatus === 'pending_review').length,
    [kycRows]
  );

  const filteredKycRows = useMemo(() => {
    const q = kycSearch.trim().toLowerCase();
    return kycRows.filter((r) => {
      const matchStatus = kycFilter === 'all' || r.kycStatus === kycFilter;
      const matchSearch =
        !q ||
        r.displayName.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        (r.company && r.company.toLowerCase().includes(q));
      return matchStatus && matchSearch;
    });
  }, [kycRows, kycFilter, kycSearch]);

  const applyKycResult = async (
    row: KycRow,
    status: 'verified' | 'rejected',
    notes: string | undefined,
    successMessage: string
  ) => {
    const result = await dbService.updateUserKyc(row.uid, status, notes);
    if (result.success) {
      setKycRows((prev) =>
        prev.map((r) => (r.uid === row.uid ? { ...r, kycStatus: status, notes: notes || r.notes } : r))
      );
      onShowToast?.(successMessage);
    } else {
      onShowToast?.(
        `Cập nhật KYC thất bại: ${result.error || 'lỗi không xác định'}`
      );
    }
  };

  const handleApproveKyc = async (row: KycRow) => {
    await applyKycResult(
      row,
      'verified',
      undefined,
      `Đã phê duyệt hồ sơ KYC cho ${row.displayName}`
    );
    setReviewingKyc(null);
  };

  const handleRejectKyc = async (row: KycRow) => {
    const reason = kycRejectionReason.trim() || ('Hồ sơ định danh chưa hợp lệ.');
    await applyKycResult(
      row,
      'rejected',
      reason,
      `Đã từ chối hồ sơ KYC của ${row.displayName}`
    );
    setReviewingKyc(null);
    setKycRejectionReason('');
  };

  // Format currency
  const formatVnd = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(val);
  };

  // Filtered Customers
  // ==========================================================================
  // DANH SÁCH KHÁCH HÀNG = `customer_profiles` ⟕ `user_profiles`
  // `customer_profiles` (baseline) KHÔNG có tên/email người dùng — chúng nằm ở
  // `user_profiles`, ghép theo `user_id`. Dữ liệu người dùng đã được nạp sẵn cho tab KYC
  // (`kycRows` từ `dbService.getUsers()`), nên không phát sinh truy vấn thứ hai.
  // ==========================================================================
  interface CustomerDisplayRow {
    row: CustomerRow;
    user?: KycRow;
    name: string | null;
    email: string | null;
    phone: string | null;
    company: string | null;
    type: 'B2B' | 'B2C';
  }

  const kycByUid = useMemo(() => {
    const map = new Map<string, KycRow>();
    kycRows.forEach((r) => map.set(r.uid, r));
    return map;
  }, [kycRows]);

  const displayRows = useMemo<CustomerDisplayRow[]>(
    () =>
      customers.map((c) => {
        const user = c.userId ? kycByUid.get(c.userId) : undefined;
        return {
          row: c,
          user,
          name: c.profileName || user?.displayName || null,
          email: c.billingEmail || user?.email || null,
          phone: c.phone || user?.phone || null,
          company: c.companyName || user?.company || null,
          // B2B/B2C suy từ dữ liệu thật (có tên công ty hoặc MST) — bảng không có cột "loại khách".
          type: isB2b(c) ? 'B2B' : 'B2C'
        };
      }),
    [customers, kycByUid]
  );

  /** Hồ sơ đang chờ xác nhận thăng cấp Designer (mở `ConfirmDialog`). */
  const [customerToPromote, setCustomerToPromote] = useState<CustomerDisplayRow | null>(null);
  const [isPromoting, setIsPromoting] = useState(false);

  /** Chỉ thăng cấp người dùng đã ghép được `user_profiles` và chưa là designer/admin. */
  const canPromoteToDesigner = (c: CustomerDisplayRow): boolean =>
    Boolean(c.user && c.user.role !== 'designer' && c.user.role !== 'admin');

  /** Ghi vai trò `designer` + đồng bộ `designer_profiles`; chỉ báo thành công khi service xác nhận. */
  const handlePromoteToDesigner = async () => {
    if (!customerToPromote) return;
    const target = customerToPromote;
    const uid = target.user?.uid || target.row.userId;
    if (!uid) {
      onShowToast?.(
        'Không xác định được hồ sơ người dùng để thăng cấp.'
      );
      setCustomerToPromote(null);
      return;
    }
    setIsPromoting(true);
    try {
      const res = await designerService.promoteUserToDesigner(uid, {
        displayName: target.name ?? undefined,
      });
      if (!res.ok) {
        onShowToast?.(
          `Cấp quyền nhà thiết kế thất bại: ${res.error || 'lỗi không xác định'}`
        );
        return;
      }
      onShowToast?.(
        `Đã cấp quyền nhà thiết kế cho ${target.name || target.email || uid}`
      );
      setCustomerToPromote(null);
      await loadCustomers();
      await loadKycRows();
    } finally {
      setIsPromoting(false);
    }
  };

  const filteredCustomers = useMemo(() => {
    const q = filters.searchQuery.trim().toLowerCase();
    return displayRows.filter((d) => {
      const matchType = filters.customerType === 'all' || d.type === filters.customerType;
      const matchNda =
        filters.ndaStatus === 'all' ||
        (filters.ndaStatus === 'Signed' ? d.row.ndaSigned : !d.row.ndaSigned);
      const matchSearch =
        !q ||
        (d.name ? d.name.toLowerCase().includes(q) : false) ||
        (d.email ? d.email.toLowerCase().includes(q) : false) ||
        (d.company ? d.company.toLowerCase().includes(q) : false) ||
        (d.row.taxId ? d.row.taxId.includes(q) : false);
      return matchType && matchNda && matchSearch;
    });
  }, [displayRows, filters]);

  /** Tổng chi tiêu CHỈ có nguồn ở `user_profiles.total_spent`; không ghép được ⇒ `null` ⇒ '—'. */
  const totalSpendVnd = useMemo(() => {
    const matched = displayRows.filter((d) => d.user);
    if (matched.length === 0) return null;
    return matched.reduce((acc, d) => acc + Number(d.user?.totalSpent || 0), 0);
  }, [displayRows]);

  const hasActiveCustomerFilter =
    filters.customerType !== 'all' || filters.ndaStatus !== 'all' || filters.searchQuery.trim() !== '';

  /** Ghi trạng thái NDA xuống DB; chỉ báo thành công khi DB xác nhận. */
  const handleSetNda = async (row: CustomerRow, signed: boolean) => {
    setSavingNdaId(row.id);
    try {
      const res = await setNdaSigned(row.id, signed);
      const label = row.profileName || row.companyName || row.id;
      if (!res.success) {
        onShowToast?.(
          `Ghi trạng thái NDA thất bại: ${res.error || 'lỗi không xác định'}`
        );
        return;
      }
      onShowToast?.(
        signed
          ? `Đã ghi NDA đã ký cho ${label} vào customer_profiles`
          : `Đã thu hồi NDA của ${label} trong customer_profiles`
      );
    } finally {
      setSavingNdaId(null);
    }
  };

  /** Cột bảng khách hàng (NDA) dùng primitive `DataTable`. */
  const customerColumns = useMemo<DataTableColumn<CustomerDisplayRow>[]>(() => [
    {
      key: 'name',
      header: 'Khách Hàng / Đơn Vị',
      value: (c) => c.name || '',
      render: (c) => (
        <div>
          <div className="font-bold text-fg">{c.name || '—'}</div>
          {c.company && <div className="text-xs text-fg-subtle font-normal">{c.company}</div>}
        </div>
      ),
    },
    { key: 'type', header: 'Phân loại', value: (c) => c.type, render: (c) => <span className="px-2 py-0.5 bg-surface-muted border border-line font-medium text-xs rounded-sm text-fg-muted">{c.type}</span> },
    { key: 'taxId', header: 'Mã số thuế', value: (c) => c.row.taxId || '', render: (c) => <span className="text-fg-muted">{c.row.taxId || '—'}</span> },
    {
      key: 'ndaSignedAt',
      header: 'Ngày ký kết',
      value: (c) => c.row.ndaSignedAt || '',
      render: (c) => <span className="text-fg-subtle">{c.row.ndaSignedAt ? new Date(c.row.ndaSignedAt).toLocaleDateString('vi-VN') : '—'}</span>,
    },
    {
      key: 'ndaSigned',
      header: 'Trạng thái',
      value: (c) => (c.row.ndaSigned ? 'signed' : 'unsigned'),
      render: (c) => (
        <Badge variant={c.row.ndaSigned ? 'success' : 'neutral'} dot>
          {c.row.ndaSigned ? ('Đã Ghi Nhận') : ('Chưa Ký')}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Hành động',
      align: 'right',
      render: (c) =>
        c.row.ndaSigned ? (
          <Button
            variant="danger-ghost"
            size="sm"
            onClick={() => void handleSetNda(c.row, false)}
            disabled={savingNdaId === c.row.id}
          >
            Thu Hồi
          </Button>
        ) : (
          <Button
            variant="primary"
            size="sm"
            onClick={() => void handleSetNda(c.row, true)}
            disabled={savingNdaId === c.row.id}
          >
            Ghi Đã Ký
          </Button>
        ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [savingNdaId]);

  /** Cột bảng KYC dùng primitive `DataTable`. */
  const kycColumns = useMemo<DataTableColumn<KycRow>[]>(() => [
    {
      key: 'user',
      header: 'Người dùng / Pháp nhân',
      value: (r) => r.displayName || '',
      render: (r) => (
        <div>
          <div className="font-bold text-fg">{r.displayName}</div>
          <div className="text-xs text-fg-subtle font-mono">{r.email}</div>
          {r.company && <div className="text-xs text-primary">{r.company}</div>}
        </div>
      ),
    },
    { key: 'role', header: 'Vai trò', value: (r) => r.role, render: (r) => <span className="px-2 py-0.5 bg-surface-muted border border-line text-fg-muted rounded-sm font-medium text-xs uppercase">{roleLabel(r.role)}</span> },
    {
      key: 'kycStatus',
      header: 'Trạng thái KYC',
      value: (r) => r.kycStatus,
      render: (r) => (
        <Badge
          variant={
            r.kycStatus === 'verified'
              ? 'success'
              : r.kycStatus === 'pending_review'
              ? 'warning'
              : r.kycStatus === 'rejected'
              ? 'danger'
              : 'neutral'
          }
          dot
        >
          {kycStatusLabel(r.kycStatus)}
        </Badge>
      ),
    },
    {
      key: 'accountStatus',
      header: 'Tài khoản',
      value: (r) => r.accountStatus,
      render: (r) => <span className={`text-xs font-bold uppercase ${r.accountStatus === 'active' ? 'text-positive' : 'text-danger'}`}>{accountStatusLabel(r.accountStatus)}</span>,
    },
    {
      key: 'orders',
      header: 'Đơn / Chi tiêu',
      numeric: true,
      value: (r) => r.totalSpent,
      render: (r) => (
        <div>
          <div>{r.totalOrders}</div>
          <div className="text-xs text-fg-subtle">{formatVnd(r.totalSpent)}</div>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Thao tác',
      align: 'right',
      render: (r) => (
        <div className="flex items-center justify-end gap-1.5">
          {r.kycStatus !== 'verified' && (
            <Button variant="primary" size="sm" onClick={() => void handleApproveKyc(r)}>
              Duyệt
            </Button>
          )}
          {r.kycStatus !== 'rejected' && (
            <Button variant="danger-ghost" size="sm" onClick={() => setReviewingKyc(r)}>
              Từ chối
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={() => setReviewingKyc(r)}>
            Hồ sơ
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
            <Badge variant="technical">Khách hàng</Badge>
            <h2 className="text-xl font-bold text-fg tracking-tight">
              {'Quản Trị Khách Hàng, NDA & Đơn Lô Lớn RFQ'}
            </h2>
          </div>
          <div className="mt-1">
            <InfoTip label="Mục này quản trị những gì?">
              Phân hệ khách hàng B2C / Doanh nghiệp B2B (MST, Hóa đơn VAT), kiểm soát thỏa thuận NDA bảo mật và điều phối báo giá dự án in 3D hàng loạt.
            </InfoTip>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="inline-flex flex-wrap items-center gap-1 rounded-md border border-line bg-surface-muted p-1">
          <button
            onClick={() => setActiveTab('customers')}
            className={`flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
              activeTab === 'customers'
                ? 'bg-surface text-fg font-semibold shadow-e1'
                : 'text-fg-muted hover:text-fg'
            }`}
          >
            <Icon name="corporate_fare" size={18} />
            Khách Hàng B2B/B2C
          </button>
          <button
            onClick={() => setActiveTab('nda')}
            className={`flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
              activeTab === 'nda'
                ? 'bg-surface text-fg font-semibold shadow-e1'
                : 'text-fg-muted hover:text-fg'
            }`}
          >
            <Icon name="verified_user" size={18} />
            Thỏa Thuận NDA
          </button>
          <button
            onClick={() => setActiveTab('rfq')}
            className={`flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
              activeTab === 'rfq'
                ? 'bg-surface text-fg font-semibold shadow-e1'
                : 'text-fg-muted hover:text-fg'
            }`}
          >
            <Icon name="request_quote" size={18} />
            Báo Giá Lô Lớn (RFQ)
          </button>
          <button
            onClick={() => setActiveTab('kyc')}
            className={`flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
              activeTab === 'kyc'
                ? 'bg-surface text-fg font-semibold shadow-e1'
                : 'text-fg-muted hover:text-fg'
            }`}
          >
            <Icon name="badge" size={18} />
            Hồ Sơ KYC
            {pendingKycCount > 0 && (
              <Badge variant="danger" size="sm">
                {pendingKycCount}
              </Badge>
            )}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {/* KPI Cards — số đọc từ `customer_profiles` / `user_profiles`; thiếu cột ⇒ '—' */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-surface p-4 rounded-lg border border-line-subtle">
          <div className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Tổng Khách Hàng</div>
          <div className="text-2xl font-bold tabular-nums text-fg mt-1">
            {customersError ? '—' : isCustomersLoading ? '…' : stats.totalCustomers}
          </div>
          <div className="text-xs text-fg-subtle font-medium mt-0.5">
            {customersError
              ? 'Lỗi đọc customer_profiles'
              : `${stats.b2bCount} B2B • ${stats.b2cCount} B2C`}
          </div>
        </div>

        <div className="bg-surface p-4 rounded-lg border border-line-subtle">
          <div className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Doanh Nghiệp B2B</div>
          <div className="text-2xl font-bold tabular-nums text-fg mt-1">{customersError ? '—' : stats.b2bCount}</div>
          <div className="text-xs text-info font-medium mt-0.5">
            Suy từ tên công ty / MST
          </div>
        </div>

        <div className="bg-surface p-4 rounded-lg border border-line-subtle">
          <div className="text-xs font-semibold uppercase tracking-wider text-fg-muted">NDA Đã Ký</div>
          <div className="text-2xl font-bold tabular-nums text-fg mt-1">{customersError ? '—' : stats.signedNDACount}</div>
          <div className="text-xs text-positive font-medium mt-0.5">customer_profiles.nda_signed</div>
        </div>

        <div className="bg-surface p-4 rounded-lg border border-line-subtle">
          <div className="text-xs font-semibold uppercase tracking-wider text-fg-muted">NDA Chờ Duyệt</div>
          <div className="text-2xl font-bold tabular-nums text-fg mt-1">—</div>
          <div className="text-xs text-warning font-medium mt-0.5">
            Bảng chỉ có nda_signed (không có trạng thái chờ duyệt)
          </div>
        </div>

        <div className="bg-surface p-4 rounded-lg border border-line-subtle">
          <div className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Dự Án RFQ Lô Lớn</div>
          <div className="text-2xl font-bold tabular-nums text-fg mt-1">—</div>
          <div className="text-xs text-info font-medium mt-0.5">
            Chưa có nguồn dữ liệu RFQ
          </div>
        </div>

        <div className="bg-surface p-4 rounded-lg border border-line-subtle">
          <div className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Doanh Thu Khách</div>
          <div className="text-lg font-bold tabular-nums text-fg mt-1 truncate">
            {totalSpendVnd === null ? '—' : formatVnd(totalSpendVnd)}
          </div>
          <div className="text-xs text-positive font-medium mt-0.5">
            {totalSpendVnd === null
              ? 'Không ghép được hồ sơ người dùng'
              : 'user_profiles.total_spent'}
          </div>
        </div>
      </div>

      {/* TAB 1: KHÁCH HÀNG B2B & B2C */}
      {activeTab === 'customers' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-surface p-4 rounded-lg border border-line">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex flex-wrap items-center gap-1 bg-surface-muted border border-line p-1 rounded-md text-sm">
                <span className="text-fg-subtle px-1 text-xs uppercase tracking-wider">Phân loại:</span>
                {(['all', 'B2B', 'B2C'] as const).map((tp) => (
                  <button
                    key={tp}
                    onClick={() => setFilterCustomerType(tp)}
                    className={`px-3 py-1.5 rounded-sm transition-colors cursor-pointer ${
                      filters.customerType === tp
                        ? 'bg-surface text-fg font-semibold shadow-e1'
                        : 'text-fg-muted hover:text-fg'
                    }`}
                  >
                    {tp === 'all' ? ('Tất cả') : tp === 'B2B' ? ('🏢 Doanh nghiệp (B2B)') : ('👤 Cá nhân (B2C)')}
                  </button>
                ))}
              </div>

              <div className="inline-flex flex-wrap items-center gap-1 bg-surface-muted border border-line p-1 rounded-md text-sm">
                <span className="text-fg-subtle px-1 text-xs uppercase tracking-wider">NDA:</span>
                {(['all', 'Signed', 'None'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilterNdaStatus(s)}
                    className={`px-3 py-1.5 rounded-sm transition-colors cursor-pointer ${
                      filters.ndaStatus === s
                        ? 'bg-surface text-fg font-semibold shadow-e1'
                        : 'text-fg-muted hover:text-fg'
                    }`}
                  >
                    {s === 'all' ? ('Tất cả') : s === 'Signed' ? ('Đã ký') : ('Chưa ký')}
                  </button>
                ))}
              </div>

              <span className="text-xs text-fg-subtle">
                Nguồn: bảng customer_profiles
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-full md:w-72">
                <Icon name="search" size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-subtle pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Tìm tên, công ty, MST, email..."
                  aria-label="Tìm khách hàng theo tên, công ty, MST hoặc email"
                  value={filters.searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="shrink-0"
                leadingIcon={<Icon name="sync" size={16} className={isCustomersLoading ? 'animate-spin motion-reduce:animate-none' : ''} />}
                onClick={() => void loadCustomers()}
                disabled={isCustomersLoading}
              >
                Tải Lại
              </Button>
            </div>
          </div>

          {/* Đang tải */}
          {isCustomersLoading && customers.length === 0 && customersError === null && (
            <div
              role="status"
              aria-label="Đang tải hồ sơ khách hàng từ customer_profiles..."
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {[0, 1].map((i) => (
                <Skeleton key={i} variant="rect" height="11rem" rounded="lg" />
              ))}
            </div>
          )}

          {/* LỖI THẬT */}
          {customersError !== null && (
            <div role="alert" className="p-4 bg-danger-tint border border-danger/20 rounded-lg flex items-start gap-3">
              <Icon name="error" size={24} className="text-danger mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-danger text-sm">
                  Không đọc được bảng customer_profiles
                </h4>
                <p className="text-xs text-danger mt-1 font-mono break-all">{customersError}</p>
                <Button variant="secondary" size="sm" className="mt-2" onClick={() => void loadCustomers()}>
                  Thử lại
                </Button>
              </div>
            </div>
          )}

          {customersError === null && !isCustomersLoading && filteredCustomers.length === 0 && (
            <EmptyState
              size="sm"
              title="Chưa có khách hàng nào"
              description={
                customers.length === 0
                  ? 'Bảng customer_profiles chưa có bản ghi nào.'
                  : 'Không có hồ sơ khách hàng nào khớp bộ lọc hiện tại.'
              }
              icon={<Icon name="group" size={20} className="text-primary" />}
              action={
                <Button variant="secondary" size="sm" onClick={() => setActiveTab('kyc')}>
                  Xem Hồ Sơ KYC
                </Button>
              }
            />
          )}

          {customersError === null && filteredCustomers.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCustomers.map((c) => {
              const row = c.row;
              return (
              <div
                key={row.id}
                className="bg-surface rounded-lg border border-line p-6 hover:shadow-e1 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded-sm border border-line text-xs font-semibold uppercase ${
                            c.type === 'B2B'
                              ? 'bg-info-tint text-info'
                              : 'bg-positive-tint text-positive'
                          }`}
                        >
                          {c.type === 'B2B' ? '🏢 Khách Doanh Nghiệp' : '👤 Khách Cá Nhân'}
                        </span>

                        {row.ndaSigned ? (
                          <Badge variant="success" dot>
                            NDA đã ký
                          </Badge>
                        ) : (
                          <Badge variant="neutral">
                            Chưa ký NDA
                          </Badge>
                        )}
                      </div>

                      <h3 className="font-bold text-fg text-base mt-2">{c.name || '—'}</h3>
                      {c.company && (
                        <p className="text-xs font-semibold text-fg-muted mt-0.5">{c.company}</p>
                      )}
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-fg-subtle font-semibold uppercase tracking-wider">Tổng Chi Tiêu</div>
                      <div className="font-bold text-fg font-mono tabular-nums text-sm">
                        {c.user ? formatVnd(Number(c.user.totalSpent || 0)) : '—'}
                      </div>
                      <div className="text-xs text-fg-subtle">
                        {c.user ? `${c.user.totalOrders} ${'đơn hàng'}` : 'chưa ghép user_profiles'}
                      </div>
                    </div>
                  </div>

                  {/* Corporate Legal & Tax Details */}
                  {c.type === 'B2B' && (
                    <div className="mt-3 p-3 bg-surface-muted rounded-md border border-line-subtle space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-fg-subtle">Mã số thuế (MST):</span>
                        <span className="font-mono font-bold text-fg">{row.taxId || ('Chưa có trong DB')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-fg-subtle">Email hóa đơn VAT:</span>
                        <span className="font-mono text-fg-muted">{row.billingEmail || c.email || '—'}</span>
                      </div>
                      {row.preferredPaymentMethod && (
                        <div className="flex justify-between">
                          <span className="text-fg-subtle">Thanh toán ưu tiên:</span>
                          <span className="font-bold text-fg-muted uppercase">{row.preferredPaymentMethod}</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-1 border-t border-line-subtle">
                        <span className="text-fg-subtle">customer_profiles.id</span>
                        <span className="font-mono text-fg-subtle">{row.id}</span>
                      </div>
                    </div>
                  )}

                  {/* Contact info */}
                  <div className="mt-3 text-xs text-fg-subtle space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Icon name="mail" size={14} />
                      <span>{c.email || '—'}</span>
                      <span className="text-fg-subtle">•</span>
                      <Icon name="call" size={14} />
                      <span>{c.phone || '—'}</span>
                    </div>
                    {(row.businessAddress || row.shippingAddress) && (
                      <div className="flex items-center gap-1.5 line-clamp-1">
                        <Icon name="home_pin" size={14} />
                        <span>
                          {row.businessAddress ||
                            [row.shippingAddress?.address, row.shippingAddress?.city]
                              .filter(Boolean)
                              .join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Action — ghi thẳng customer_profiles.nda_signed */}
                <div className="mt-4 pt-3 border-t border-line-subtle flex items-center justify-between text-xs">
                  <span className="text-fg-subtle">
                    Ký NDA:{' '}
                    <span className="font-bold text-fg-muted">
                      {row.ndaSignedAt ? new Date(row.ndaSignedAt).toLocaleDateString('vi-VN') : '—'}
                    </span>
                  </span>

                  <div className="flex items-center gap-1.5">
                    {!row.ndaSigned ? (
                      <Button
                        variant="primary"
                        size="sm"
                        leadingIcon={<Icon name="check" size={16} />}
                        onClick={() => void handleSetNda(row, true)}
                        disabled={savingNdaId === row.id}
                      >
                        Ghi NDA Đã Ký
                      </Button>
                    ) : (
                      <Button
                        variant="danger-ghost"
                        size="sm"
                        onClick={() => void handleSetNda(row, false)}
                        disabled={savingNdaId === row.id}
                      >
                        Thu Hồi NDA
                      </Button>
                    )}
                    <Button
                      variant="secondary"
                      size="sm"
                      leadingIcon={<Icon name="shield" size={16} />}
                      onClick={() => setSelectedCustomerForNda(row)}
                    >
                      Hồ Sơ
                    </Button>
                    {canPromoteToDesigner(c) && (
                      <Button
                        variant="secondary"
                        size="sm"
                        leadingIcon={<Icon name="badge" size={16} />}
                        onClick={() => setCustomerToPromote(c)}
                      >
                        Cấp quyền nhà thiết kế
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

      {/* TAB 2: THỎA THUẬN BẢO MẬT NDA */}
      {activeTab === 'nda' && (
        <div className="space-y-4">
          <div className="bg-surface p-4 rounded-lg border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <h4 className="font-semibold text-fg text-sm">
                {'Chính Sách Bảo Mật Tài Sản Trí Tuệ & Tệp CAD (Chuẩn NDA)'}
              </h4>
              <p className="text-fg-subtle mt-0.5">
                Trạng thái NDA đọc/ghi trực tiếp cột customer_profiles.nda_signed (bảng không có trạng thái "chờ duyệt").
              </p>
            </div>
            <Badge variant="success" className="shrink-0">
              {`Đã ký: ${stats.signedNDACount}`}
            </Badge>
          </div>

          <div className="bg-surface rounded-lg border border-line overflow-hidden">
            {isCustomersLoading && customers.length === 0 && customersError === null ? (
              <div className="py-8 text-center text-sm text-fg-muted">
                Đang tải hồ sơ khách hàng từ customer_profiles...
              </div>
            ) : customersError !== null ? (
              <div role="alert" className="m-4 p-4 bg-danger-tint border border-danger/20 rounded-lg text-xs text-danger font-mono break-all">
                {customersError}
              </div>
            ) : customers.length === 0 ? (
            <EmptyState
              size="sm"
              title="Chưa có tài liệu NDA nào"
              description="Bảng customer_profiles chưa có bản ghi nào nên chưa có hồ sơ NDA nào để hiển thị."
              icon={<Icon name="policy" size={20} className="text-primary" />}
              action={
                <Button variant="secondary" size="sm" onClick={() => setActiveTab('customers')}>
                  Xem Khách Hàng
                </Button>
              }
            />
            ) : (
            <DataTable<CustomerDisplayRow>
              columns={customerColumns}
              rows={displayRows}
              getRowId={(row) => row.row.id}
              caption="Danh sách khách hàng"
              tableLabel="Danh sách khách hàng"
              defaultSort={[{ key: 'name', direction: 'asc' }]}
            />
            )}
          </div>
        </div>
      )}

      {/* TAB 3: BÁO GIÁ LÔ LỚN (BATCH RFQ) */}
      {activeTab === 'rfq' && (
        <div className="space-y-4">
          <div className="bg-warning-tint p-4 rounded-lg border border-warning/20 flex items-start gap-3">
            <Icon name="warning" size={24} className="text-warning mt-0.5" />
            <div className="text-xs">
              <h4 className="font-semibold text-warning text-sm">
                Chưa có nguồn dữ liệu RFQ trong DB
              </h4>
              <p className="text-fg-muted mt-1">
                Bảng `quotes` KHÔNG phải bảng RFQ: nó chỉ có file_name / material_id / printer_id / quantity / unit_price / payload (một bản báo giá cho 1 file) — không có tên dự án, số lượng lô, hạn giao hay trạng thái RFQ. Và trong toàn bộ service layer CHỈ có `dbService.saveQuote()` (ghi mù, có `insert` mà không có hàm ĐỌC). Vì vậy tab này không hiển thị danh sách thay thế và không có nút báo giá trên RAM.
              </p>
            </div>
          </div>
          <EmptyState
            size="sm"
            title="Không có bản ghi RFQ"
            description="Cần một bảng + hàm service đọc/ghi yêu cầu báo giá lô lớn trước khi tab này có dữ liệu thật."
            icon={<Icon name="request_quote" size={20} className="text-primary" />}
          />
        </div>
      )}

      {/* MODAL: XEM HỒ SƠ NDA KHÁCH HÀNG */}
      {selectedCustomerForNda && (
        <Modal
          open
          onClose={() => setSelectedCustomerForNda(null)}
          size="md"
          title="Hồ Sơ Thỏa Thuận Bảo Mật (NDA)"
        >
            <div className="space-y-3 text-xs">
              <div className="p-4 bg-surface-muted rounded-md space-y-1.5 border border-line-subtle">
                <div className="flex justify-between">
                  <span className="text-fg-subtle">Tên khách hàng:</span>
                  <span className="font-bold text-fg">
                    {selectedCustomerForNda.profileName || '—'}
                  </span>
                </div>
                {selectedCustomerForNda.companyName && (
                  <div className="flex justify-between">
                    <span className="text-fg-subtle">Pháp nhân:</span>
                    <span className="font-bold text-fg">{selectedCustomerForNda.companyName}</span>
                  </div>
                )}
                {selectedCustomerForNda.taxId && (
                  <div className="flex justify-between">
                    <span className="text-fg-subtle">MST:</span>
                    <span className="font-mono font-bold text-fg">{selectedCustomerForNda.taxId}</span>
                  </div>
                )}
                {selectedCustomerForNda.billingEmail && (
                  <div className="flex justify-between">
                    <span className="text-fg-subtle">Email hóa đơn:</span>
                    <span className="font-mono text-fg-muted">{selectedCustomerForNda.billingEmail}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-fg-subtle">Trạng thái NDA:</span>
                  <span className={`font-bold ${selectedCustomerForNda.ndaSigned ? 'text-positive' : 'text-fg-muted'}`}>
                    {selectedCustomerForNda.ndaSigned ? ('Đã ký') : 'Chưa ký'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-fg-subtle">Ngày ghi nhận:</span>
                  <span className="font-mono text-fg-muted">
                    {selectedCustomerForNda.ndaSignedAt
                      ? new Date(selectedCustomerForNda.ndaSignedAt).toLocaleDateString('vi-VN')
                      : '—'}
                  </span>
                </div>
              </div>

              <div className="p-4 bg-info-tint rounded-md border border-info/20 text-fg-muted text-xs space-y-1">
                <div className="font-bold text-info">Cam Kết Bảo Vệ Thiết Kế CAD:</div>
                <p>1. Bản quyền thuộc 100% về khách hàng và nhà phát triển.</p>
                <p>2. Không sao lưu, tái sử dụng hoặc cung cấp cho bên thứ 3 dưới mọi hình thức.</p>
                <p>3. Tiêu hủy mẫu phế phẩm thử nghiệm theo tiêu chuẩn bảo mật.</p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-line-subtle">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setSelectedCustomerForNda(null)}
                >
                  Đóng
                </Button>
              </div>
            </div>
        </Modal>
      )}

      {/* TAB 4: THẨM ĐỊNH HỒ SƠ ĐỊNH DANH (KYC) — bảng `user_profiles` */}
      {activeTab === 'kyc' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-surface p-4 rounded-lg border border-line">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex flex-wrap items-center gap-1 bg-surface-muted border border-line p-1 rounded-md text-sm">
                <span className="text-fg-subtle px-1 text-xs uppercase tracking-wider">
                  KYC:
                </span>
                {(['all', 'pending_review', 'verified', 'rejected', 'unverified'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setKycFilter(s)}
                    className={`px-3 py-1.5 rounded-sm transition-colors cursor-pointer ${
                      kycFilter === s ? 'bg-surface text-fg font-semibold shadow-e1' : 'text-fg-muted hover:text-fg'
                    }`}
                  >
                    {s === 'all'
                      ? 'Tất cả'
                      : s === 'pending_review'
                      ? 'Chờ duyệt'
                      : s === 'verified'
                      ? 'Đã duyệt'
                      : s === 'rejected'
                      ? 'Bị từ chối'
                      : 'Chưa nộp'}
                  </button>
                ))}
              </div>

              <Button
                variant="secondary"
                size="sm"
                leadingIcon={<Icon name="sync" size={16} className={isKycLoading ? 'animate-spin motion-reduce:animate-none' : ''} />}
                onClick={() => void loadKycRows()}
                disabled={isKycLoading}
              >
                Tải lại
              </Button>
            </div>

            <div className="relative w-full md:w-72">
              <Icon name="search" size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-subtle pointer-events-none" />
              <Input
                type="text"
                aria-label="Tìm kiếm hồ sơ KYC theo tên, email, doanh nghiệp"
                placeholder="Tìm tên, email, doanh nghiệp..."
                value={kycSearch}
                onChange={(e) => setKycSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <div className="bg-surface rounded-lg border border-line overflow-hidden">
            {!isKycLoading && filteredKycRows.length === 0 ? (
            <EmptyState
              size="sm"
              title="Chưa có hồ sơ KYC nào"
              description="Không hồ sơ người dùng nào khớp bộ lọc KYC hiện tại."
              icon={<Icon name="verified" size={20} className="text-primary" />}
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setActiveTab('customers')}
                >
                  Xem Khách Hàng
                </Button>
              }
            />
            ) : (
            <DataTable<KycRow>
              columns={kycColumns}
              rows={filteredKycRows}
              getRowId={(row) => row.uid}
              loading={isKycLoading && kycRows.length === 0}
              caption="Hồ sơ KYC"
              tableLabel="Hồ sơ KYC"
              emptyState={
                <EmptyState
                  live
                  title="Không có hồ sơ KYC phù hợp"
                  description="Thử xoá từ khoá hoặc đổi bộ lọc trạng thái."
                />
              }
            />
            )}
          </div>

          {/* MODAL: THẨM ĐỊNH KYC */}
          {reviewingKyc && (
            <Modal
              open
              onClose={() => setReviewingKyc(null)}
              size="lg"
              title="Thẩm định hồ sơ định danh (KYC)"
            >
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-fg-subtle">Người dùng:</span>
                    <span className="font-bold text-fg">{reviewingKyc.displayName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-fg-subtle">UID:</span>
                    <span className="font-mono text-fg-muted">{reviewingKyc.uid}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-fg-subtle">Email:</span>
                    <span className="font-mono text-fg-muted">{reviewingKyc.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-fg-subtle">Vai trò:</span>
                    <span className="font-bold uppercase text-info">{roleLabel(reviewingKyc.role)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-fg-subtle">Trạng thái KYC hiện tại:</span>
                    <span className="font-bold text-fg">{kycStatusLabel(reviewingKyc.kycStatus)}</span>
                  </div>
                  {reviewingKyc.notes && (
                    <div className="p-3 bg-warning-tint border border-warning/20 rounded-md text-warning">
                      <div className="font-semibold text-xs uppercase">Ghi chú hiện tại:</div>
                      <p>{reviewingKyc.notes}</p>
                    </div>
                  )}

                  <Field
                    label="Lý do từ chối (bắt buộc khi từ chối):"
                    optionalLabel={null}
                  >
                    {(control) => (
                      <Input
                        {...control}
                        type="text"
                        value={kycRejectionReason}
                        onChange={(e) => setKycRejectionReason(e.target.value)}
                        placeholder="Ví dụ: Ảnh CCCD bị mờ, MST không khớp tên doanh nghiệp..."
                      />
                    )}
                  </Field>
                </div>

                <div className="flex flex-wrap justify-end gap-2 pt-4 mt-4 border-t border-line-subtle">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setReviewingKyc(null)}
                  >
                    Đóng
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => void handleRejectKyc(reviewingKyc)}
                  >
                    Từ Chối KYC
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => void handleApproveKyc(reviewingKyc)}
                  >
                    Duyệt Xác Minh
                  </Button>
                </div>
            </Modal>
          )}
        </div>
      )}

      {/* MODAL: XÁC NHẬN CẤP QUYỀN DESIGNER */}
      <ConfirmDialog
        open={customerToPromote !== null}
        title="Cấp quyền nhà thiết kế"
        description={
          customerToPromote
            ? `Cấp quyền nhà thiết kế cho ${customerToPromote.name || customerToPromote.email || 'người dùng này'}? Vai trò trong user_profiles sẽ đổi thành "designer" và hồ sơ designer_profiles sẽ được tạo/cập nhật.`
            : ''
        }
        confirmLabel="Cấp quyền"
        cancelLabel="Huỷ"
        loading={isPromoting}
        onCancel={() => {
          if (isPromoting) return;
          setCustomerToPromote(null);
        }}
        onConfirm={() => void handlePromoteToDesigner()}
      />

    </div>
  );
};
export default Group3CustomersPanel;