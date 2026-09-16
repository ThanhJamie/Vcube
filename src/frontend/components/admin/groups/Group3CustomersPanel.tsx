import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useCustomerAdminStore, CustomerRow, isB2b } from '../../../../stores/useCustomerAdminStore';
import { useLanguage } from '../../../context/LanguageContext';
import { dbService } from '../../../../backend/supabase/database';
import { AppUserProfile } from '../../../../types';
import { Button, DataTable, EmptyState, Icon, InfoTip, Modal } from '@frontend/ui';
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
  const { language } = useLanguage();
  const isVi = language === 'vi';

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
        isVi
          ? `Không tải được hồ sơ KYC: ${err?.message || 'lỗi không xác định'}`
          : `Failed to load KYC profiles: ${err?.message || 'unknown error'}`
      );
    } finally {
      setIsKycLoading(false);
    }
  }, [isVi, onShowToast]);

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
        isVi
          ? `Cập nhật KYC thất bại: ${result.error || 'lỗi không xác định'}`
          : `Failed to update KYC: ${result.error || 'unknown error'}`
      );
    }
  };

  const handleApproveKyc = async (row: KycRow) => {
    await applyKycResult(
      row,
      'verified',
      undefined,
      isVi ? `Đã phê duyệt hồ sơ KYC cho ${row.displayName}` : `Approved KYC for ${row.displayName}`
    );
    setReviewingKyc(null);
  };

  const handleRejectKyc = async (row: KycRow) => {
    const reason = kycRejectionReason.trim() || (isVi ? 'Hồ sơ định danh chưa hợp lệ.' : 'Invalid identity document.');
    await applyKycResult(
      row,
      'rejected',
      reason,
      isVi ? `Đã từ chối hồ sơ KYC của ${row.displayName}` : `Rejected KYC for ${row.displayName}`
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
          isVi
            ? `Ghi trạng thái NDA thất bại: ${res.error || 'lỗi không xác định'}`
            : `Failed to write NDA status: ${res.error || 'unknown error'}`
        );
        return;
      }
      onShowToast?.(
        signed
          ? isVi
            ? `Đã ghi NDA đã ký cho ${label} vào customer_profiles`
            : `Recorded signed NDA for ${label} in customer_profiles`
          : isVi
          ? `Đã thu hồi NDA của ${label} trong customer_profiles`
          : `Revoked NDA for ${label} in customer_profiles`
      );
    } finally {
      setSavingNdaId(null);
    }
  };

  /** Cột bảng khách hàng (NDA) dùng primitive `DataTable`. */
  const customerColumns = useMemo<DataTableColumn<CustomerDisplayRow>[]>(() => [
    {
      key: 'name',
      header: isVi ? 'Khách Hàng / Đơn Vị' : 'Client entity',
      value: (c) => c.name || '',
      render: (c) => (
        <div>
          <div className="font-bold text-fg">{c.name || '—'}</div>
          {c.company && <div className="text-xs text-fg-subtle font-normal">{c.company}</div>}
        </div>
      ),
    },
    { key: 'type', header: isVi ? 'Phân loại' : 'Type', value: (c) => c.type, render: (c) => <span className="px-2 py-0.5 bg-surface-muted font-bold text-xs rounded-sm text-fg-muted">{c.type}</span> },
    { key: 'taxId', header: isVi ? 'Mã số thuế' : 'Tax ID', value: (c) => c.row.taxId || '', render: (c) => <span className="text-fg-muted">{c.row.taxId || '—'}</span> },
    {
      key: 'ndaSignedAt',
      header: isVi ? 'Ngày ký kết' : 'Signed date',
      value: (c) => c.row.ndaSignedAt || '',
      render: (c) => <span className="text-fg-subtle">{c.row.ndaSignedAt ? new Date(c.row.ndaSignedAt).toLocaleDateString('vi-VN') : '—'}</span>,
    },
    {
      key: 'ndaSigned',
      header: isVi ? 'Trạng thái' : 'Status',
      value: (c) => (c.row.ndaSigned ? 'signed' : 'unsigned'),
      render: (c) => (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${c.row.ndaSigned ? 'bg-positive-tint text-positive' : 'bg-surface-muted text-fg-subtle'}`}>
          {c.row.ndaSigned ? (isVi ? 'Đã Ghi Nhận' : 'Signed') : (isVi ? 'Chưa Ký' : 'Unsigned')}
        </span>
      ),
    },
    {
      key: 'actions',
      header: isVi ? 'Hành động' : 'Actions',
      align: 'right',
      render: (c) =>
        c.row.ndaSigned ? (
          <button
            onClick={() => void handleSetNda(c.row, false)}
            disabled={savingNdaId === c.row.id}
            className="px-2.5 py-1 bg-danger-tint text-danger text-xs font-semibold rounded-sm cursor-pointer disabled:opacity-60"
          >
            {isVi ? 'Thu Hồi' : 'Revoke'}
          </button>
        ) : (
          <button
            onClick={() => void handleSetNda(c.row, true)}
            disabled={savingNdaId === c.row.id}
            className="px-3 py-1 bg-primary hover:bg-primary-hover text-primary-fg text-xs font-bold rounded-sm cursor-pointer disabled:opacity-60"
          >
            {isVi ? 'Ghi Đã Ký' : 'Mark signed'}
          </button>
        ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [isVi, savingNdaId]);

  /** Cột bảng KYC dùng primitive `DataTable`. */
  const kycColumns = useMemo<DataTableColumn<KycRow>[]>(() => [
    {
      key: 'user',
      header: isVi ? 'Người dùng / Pháp nhân' : 'User / Entity',
      value: (r) => r.displayName || '',
      render: (r) => (
        <div>
          <div className="font-bold text-fg">{r.displayName}</div>
          <div className="text-xs text-fg-subtle font-mono">{r.email}</div>
          {r.company && <div className="text-xs text-primary">{r.company}</div>}
        </div>
      ),
    },
    { key: 'role', header: isVi ? 'Vai trò' : 'Role', value: (r) => r.role, render: (r) => <span className="px-2 py-0.5 bg-surface-muted text-fg-muted rounded-sm font-bold text-xs uppercase">{r.role}</span> },
    {
      key: 'kycStatus',
      header: isVi ? 'Trạng thái KYC' : 'KYC status',
      value: (r) => r.kycStatus,
      render: (r) => (
        <span
          className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
            r.kycStatus === 'verified'
              ? 'bg-positive-tint text-positive border border-positive/30'
              : r.kycStatus === 'pending_review'
              ? 'bg-warning-tint text-warning border border-warning/30'
              : r.kycStatus === 'rejected'
              ? 'bg-danger-tint text-danger border border-danger/30'
              : 'bg-surface-muted text-fg-muted'
          }`}
        >
          {r.kycStatus}
        </span>
      ),
    },
    {
      key: 'accountStatus',
      header: isVi ? 'Tài khoản' : 'Account',
      value: (r) => r.accountStatus,
      render: (r) => <span className={`text-xs font-bold uppercase ${r.accountStatus === 'active' ? 'text-positive' : 'text-danger'}`}>{r.accountStatus}</span>,
    },
    {
      key: 'orders',
      header: isVi ? 'Đơn / Chi tiêu' : 'Orders / Spend',
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
      header: isVi ? 'Thao tác' : 'Actions',
      align: 'right',
      render: (r) => (
        <div className="flex items-center justify-end gap-1.5">
          {r.kycStatus !== 'verified' && (
            <button onClick={() => void handleApproveKyc(r)} className="px-2.5 py-1 bg-primary hover:bg-primary-hover text-primary-fg text-xs font-bold rounded-sm cursor-pointer">
              {isVi ? 'Duyệt' : 'Approve'}
            </button>
          )}
          {r.kycStatus !== 'rejected' && (
            <button onClick={() => setReviewingKyc(r)} className="px-2.5 py-1 bg-danger-tint text-danger text-xs font-bold rounded-sm cursor-pointer">
              {isVi ? 'Từ chối' : 'Reject'}
            </button>
          )}
          <button onClick={() => setReviewingKyc(r)} className="px-2.5 py-1 bg-surface-subtle hover:bg-canvas text-fg-muted text-xs font-bold rounded-sm cursor-pointer">
            {isVi ? 'Hồ sơ' : 'Review'}
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
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-info/10 text-info">
              Khách hàng
            </span>
            <h2 className="text-xl font-black text-fg tracking-tight">
              {isVi ? 'Quản Trị Khách Hàng, NDA & Đơn Lô Lớn RFQ' : 'Customers, NDA Agreements & Batch RFQ Hub'}
            </h2>
          </div>
          <div className="mt-1">
            <InfoTip label={isVi ? 'Mục này quản trị những gì?' : 'What does this hub manage?'}>
              {isVi
                ? 'Phân hệ khách hàng B2C / Doanh nghiệp B2B (MST, Hóa đơn VAT), kiểm soát thỏa thuận NDA bảo mật và điều phối báo giá dự án in 3D hàng loạt.'
                : 'Manage B2C / B2B corporate profiles, enforce confidential NDA contracts, and process industrial batch RFQ requests.'}
            </InfoTip>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-surface-muted rounded-lg">
          <button
            onClick={() => setActiveTab('customers')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'customers'
                ? 'bg-surface text-primary shadow-e1'
                : 'text-fg-muted hover:text-fg'
            }`}
          >
            <Icon name="corporate_fare" size={18} />
            {isVi ? 'Khách Hàng B2B/B2C' : 'Customers'}
          </button>
          <button
            onClick={() => setActiveTab('nda')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'nda'
                ? 'bg-surface text-primary shadow-e1'
                : 'text-fg-muted hover:text-fg'
            }`}
          >
            <Icon name="verified_user" size={18} />
            {isVi ? 'Thỏa Thuận NDA' : 'NDA Agreements'}
          </button>
          <button
            onClick={() => setActiveTab('rfq')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'rfq'
                ? 'bg-surface text-primary shadow-e1'
                : 'text-fg-muted hover:text-fg'
            }`}
          >
            <Icon name="request_quote" size={18} />
            {isVi ? 'Báo Giá Lô Lớn (RFQ)' : 'Batch RFQ'}
          </button>
          <button
            onClick={() => setActiveTab('kyc')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'kyc'
                ? 'bg-surface text-primary shadow-e1'
                : 'text-fg-muted hover:text-fg'
            }`}
          >
            <Icon name="badge" size={18} />
            {isVi ? 'Hồ Sơ KYC' : 'KYC Review'}
            {pendingKycCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-danger-tint text-danger text-xs font-black rounded-full">
                {pendingKycCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {/* KPI Cards — số đọc từ `customer_profiles` / `user_profiles`; thiếu cột ⇒ '—' */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-surface p-3.5 rounded-lg border border-line-subtle shadow-e0">
          <div className="text-xs font-bold uppercase text-fg-subtle">{isVi ? 'Tổng Khách Hàng' : 'Total Accounts'}</div>
          <div className="text-2xl font-black text-fg mt-1">
            {customersError ? '—' : isCustomersLoading ? '…' : stats.totalCustomers}
          </div>
          <div className="text-xs text-fg-subtle font-semibold mt-0.5">
            {customersError
              ? isVi ? 'Lỗi đọc customer_profiles' : 'customer_profiles read failed'
              : `${stats.b2bCount} B2B • ${stats.b2cCount} B2C`}
          </div>
        </div>

        <div className="bg-surface p-3.5 rounded-lg border border-info/30 bg-info-tint/20 shadow-e0">
          <div className="text-xs font-bold uppercase text-info">{isVi ? 'Doanh Nghiệp B2B' : 'B2B Corporate'}</div>
          <div className="text-2xl font-black text-info mt-1">{customersError ? '—' : stats.b2bCount}</div>
          <div className="text-xs text-info font-semibold mt-0.5">
            {isVi ? 'Suy từ tên công ty / MST' : 'From company or tax id'}
          </div>
        </div>

        <div className="bg-surface p-3.5 rounded-lg border border-positive/30 bg-positive-tint/20 shadow-e0">
          <div className="text-xs font-bold uppercase text-positive">{isVi ? 'NDA Đã Ký' : 'NDA Signed'}</div>
          <div className="text-2xl font-black text-positive mt-1">{customersError ? '—' : stats.signedNDACount}</div>
          <div className="text-xs text-positive font-semibold mt-0.5">customer_profiles.nda_signed</div>
        </div>

        <div className="bg-surface p-3.5 rounded-lg border border-warning/30 bg-warning-tint/20 shadow-e0">
          <div className="text-xs font-bold uppercase text-warning">{isVi ? 'NDA Chờ Duyệt' : 'NDA Review'}</div>
          <div className="text-2xl font-black text-warning mt-1">—</div>
          <div className="text-xs text-warning font-semibold mt-0.5">
            {isVi
              ? 'Bảng chỉ có nda_signed (không có trạng thái chờ duyệt)'
              : 'Only nda_signed exists (no pending state)'}
          </div>
        </div>

        <div className="bg-surface p-3.5 rounded-lg border border-info/30 bg-info-tint/20 shadow-e0">
          <div className="text-xs font-bold uppercase text-info">{isVi ? 'Dự Án RFQ Lô Lớn' : 'Batch RFQs'}</div>
          <div className="text-2xl font-black text-info mt-1">—</div>
          <div className="text-xs text-info font-semibold mt-0.5">
            {isVi ? 'Chưa có nguồn dữ liệu RFQ' : 'No RFQ data source'}
          </div>
        </div>

        <div className="bg-surface p-3.5 rounded-lg border border-positive/30 bg-positive-tint/20 shadow-e0">
          <div className="text-xs font-bold uppercase text-positive">{isVi ? 'Doanh Thu Khách' : 'Total Revenue'}</div>
          <div className="text-lg font-black text-positive mt-1 truncate">
            {totalSpendVnd === null ? '—' : formatVnd(totalSpendVnd)}
          </div>
          <div className="text-xs text-positive font-semibold mt-0.5">
            {totalSpendVnd === null
              ? isVi ? 'Không ghép được hồ sơ người dùng' : 'No user profile matched'
              : 'user_profiles.total_spent'}
          </div>
        </div>
      </div>

      {/* TAB 1: KHÁCH HÀNG B2B & B2C */}
      {activeTab === 'customers' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-surface p-3.5 rounded-lg border border-line-subtle shadow-e0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 bg-surface-muted p-1 rounded-lg text-xs font-semibold">
                <span className="text-fg-subtle px-1 text-xs uppercase tracking-wider">{isVi ? 'Phân loại:' : 'Type:'}</span>
                {(['all', 'B2B', 'B2C'] as const).map((tp) => (
                  <button
                    key={tp}
                    onClick={() => setFilterCustomerType(tp)}
                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                      filters.customerType === tp
                        ? 'bg-surface text-primary font-bold shadow-e0'
                        : 'text-fg-muted hover:text-fg'
                    }`}
                  >
                    {tp === 'all' ? (isVi ? 'Tất cả' : 'All') : tp === 'B2B' ? (isVi ? '🏢 Doanh nghiệp (B2B)' : '🏢 B2B') : (isVi ? '👤 Cá nhân (B2C)' : '👤 B2C')}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1 bg-surface-muted p-1 rounded-lg text-xs font-semibold">
                <span className="text-fg-subtle px-1 text-xs uppercase tracking-wider">NDA:</span>
                {(['all', 'Signed', 'None'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilterNdaStatus(s)}
                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                      filters.ndaStatus === s
                        ? 'bg-surface text-primary font-bold shadow-e0'
                        : 'text-fg-muted hover:text-fg'
                    }`}
                  >
                    {s === 'all' ? (isVi ? 'Tất cả' : 'All') : s === 'Signed' ? (isVi ? 'Đã ký' : 'Signed') : (isVi ? 'Chưa ký' : 'Not signed')}
                  </button>
                ))}
              </div>

              <span className="text-xs text-fg-subtle">
                {isVi ? 'Nguồn: bảng customer_profiles' : 'Source: customer_profiles'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-full md:w-72">
                <Icon name="search" size={16} className="absolute left-2.5 top-2 text-fg-subtle" />
                <input
                  type="text"
                  placeholder={isVi ? 'Tìm tên, công ty, MST, email...' : 'Search customer, tax ID...'}
                  value={filters.searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-canvas border border-line-subtle rounded-lg focus:outline-none focus:border-primary focus:bg-surface"
                />
              </div>
              <button
                onClick={() => void loadCustomers()}
                disabled={isCustomersLoading}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-surface-subtle hover:bg-canvas text-fg-muted text-xs font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-60 shrink-0"
              >
                <Icon name="sync" size={16} className={isCustomersLoading ? 'animate-spin' : ''} />
                {isVi ? 'Tải Lại' : 'Reload'}
              </button>
            </div>
          </div>

          {/* Đang tải */}
          {isCustomersLoading && customers.length === 0 && customersError === null && (
            <div className="bg-surface p-6 rounded-lg border border-line-subtle shadow-e0 text-center text-xs text-fg-subtle">
              {isVi ? 'Đang tải hồ sơ khách hàng từ customer_profiles...' : 'Loading customer profiles from customer_profiles...'}
            </div>
          )}

          {/* LỖI THẬT */}
          {customersError !== null && (
            <div role="alert" className="p-4 bg-danger-tint border border-danger/30 rounded-lg flex items-start gap-3">
              <Icon name="error" size={24} className="text-danger mt-0.5" />
              <div className="flex-1">
                <h4 className="font-bold text-danger text-sm">
                  {isVi ? 'Không đọc được bảng customer_profiles' : 'Could not read the customer_profiles table'}
                </h4>
                <p className="text-xs text-danger mt-1 font-mono break-all">{customersError}</p>
                <button
                  onClick={() => void loadCustomers()}
                  className="mt-2 px-3 py-1 bg-surface border border-danger/30 text-danger text-xs font-bold rounded-lg cursor-pointer"
                >
                  {isVi ? 'Thử lại' : 'Retry'}
                </button>
              </div>
            </div>
          )}

          {customersError === null && !isCustomersLoading && filteredCustomers.length === 0 && (
            <EmptyState
              size="sm"
              title={isVi ? 'Chưa có khách hàng nào' : 'No customer yet'}
              description={
                customers.length === 0
                  ? isVi
                    ? 'Bảng customer_profiles chưa có bản ghi nào.'
                    : 'The customer_profiles table has no row yet.'
                  : isVi
                  ? 'Không có hồ sơ khách hàng nào khớp bộ lọc hiện tại.'
                  : 'No customer profile matches the current filter.'
              }
              icon={<Icon name="group" size={20} className="text-primary" />}
              action={
                <Button variant="secondary" size="sm" onClick={() => setActiveTab('kyc')}>
                  {isVi ? 'Xem Hồ Sơ KYC' : 'View KYC profiles'}
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
                className="bg-surface rounded-lg border border-line-subtle p-4 shadow-e0 hover:shadow-e1 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded-sm text-xs font-black uppercase ${
                            c.type === 'B2B'
                              ? 'bg-info-tint text-info'
                              : 'bg-positive-tint text-positive'
                          }`}
                        >
                          {c.type === 'B2B' ? '🏢 Khách Doanh Nghiệp' : '👤 Khách Cá Nhân'}
                        </span>

                        {row.ndaSigned ? (
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-positive-tint text-positive border border-positive/30 flex items-center gap-1">
                            <Icon name="verified" size={12} />
                            {isVi ? 'NDA đã ký' : 'NDA signed'}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-surface-muted text-fg-subtle border border-line-subtle">
                            {isVi ? 'Chưa ký NDA' : 'NDA not signed'}
                          </span>
                        )}
                      </div>

                      <h3 className="font-bold text-fg text-base mt-2">{c.name || '—'}</h3>
                      {c.company && (
                        <p className="text-xs font-semibold text-fg-muted mt-0.5">{c.company}</p>
                      )}
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-fg-subtle font-bold uppercase">{isVi ? 'Tổng Chi Tiêu' : 'Total Spend'}</div>
                      <div className="font-black text-fg font-mono text-sm">
                        {c.user ? formatVnd(Number(c.user.totalSpent || 0)) : '—'}
                      </div>
                      <div className="text-xs text-fg-subtle">
                        {c.user ? `${c.user.totalOrders} ${isVi ? 'đơn hàng' : 'orders'}` : isVi ? 'chưa ghép user_profiles' : 'no user_profiles row'}
                      </div>
                    </div>
                  </div>

                  {/* Corporate Legal & Tax Details */}
                  {c.type === 'B2B' && (
                    <div className="mt-3 p-3 bg-canvas rounded-lg border border-line-subtle space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-fg-subtle">{isVi ? 'Mã số thuế (MST):' : 'Tax ID:'}</span>
                        <span className="font-mono font-bold text-fg">{row.taxId || (isVi ? 'Chưa có trong DB' : 'Not in DB')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-fg-subtle">{isVi ? 'Email hóa đơn VAT:' : 'Billing Email:'}</span>
                        <span className="font-mono text-fg-muted">{row.billingEmail || c.email || '—'}</span>
                      </div>
                      {row.preferredPaymentMethod && (
                        <div className="flex justify-between">
                          <span className="text-fg-subtle">{isVi ? 'Thanh toán ưu tiên:' : 'Preferred payment:'}</span>
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
                    {isVi ? 'Ký NDA:' : 'NDA signed:'}{' '}
                    <span className="font-bold text-fg-muted">
                      {row.ndaSignedAt ? new Date(row.ndaSignedAt).toLocaleDateString('vi-VN') : '—'}
                    </span>
                  </span>

                  <div className="flex items-center gap-1.5">
                    {!row.ndaSigned ? (
                      <button
                        onClick={() => void handleSetNda(row, true)}
                        disabled={savingNdaId === row.id}
                        className="px-3 py-1 bg-primary hover:bg-primary-hover text-primary-fg font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-60"
                      >
                        <Icon name="check" size={16} />
                        {isVi ? 'Ghi NDA Đã Ký' : 'Mark NDA signed'}
                      </button>
                    ) : (
                      <button
                        onClick={() => void handleSetNda(row, false)}
                        disabled={savingNdaId === row.id}
                        className="px-2.5 py-1 bg-danger-tint hover:bg-danger-tint text-danger font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-60"
                      >
                        {isVi ? 'Thu Hồi NDA' : 'Revoke NDA'}
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedCustomerForNda(row)}
                      className="px-2.5 py-1 bg-surface-muted hover:bg-line-subtle text-fg-muted font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Icon name="shield" size={16} />
                      {isVi ? 'Hồ Sơ' : 'Info'}
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

      {/* TAB 2: THỎA THUẬN BẢO MẬT NDA */}
      {activeTab === 'nda' && (
        <div className="space-y-4">
          <div className="bg-surface p-4 rounded-lg border border-line-subtle shadow-e0 flex items-center justify-between text-xs">
            <div>
              <h4 className="font-bold text-fg text-sm">
                {isVi ? 'Chính Sách Bảo Mật Tài Sản Trí Tuệ & CAD File (NDA Standard)' : 'IP Confidentiality & CAD NDA'}
              </h4>
              <p className="text-fg-subtle mt-0.5">
                {isVi
                  ? 'Trạng thái NDA đọc/ghi trực tiếp cột customer_profiles.nda_signed (bảng không có trạng thái "chờ duyệt").'
                  : 'NDA status is read/written directly to customer_profiles.nda_signed (the table has no pending state).'}
              </p>
            </div>
            <span className="px-3 py-1 bg-positive-tint text-positive rounded-lg font-bold">
              {isVi ? `Đã ký: ${stats.signedNDACount}` : `Signed: ${stats.signedNDACount}`}
            </span>
          </div>

          <div className="bg-surface rounded-lg border border-line-subtle overflow-hidden shadow-e0">
            {isCustomersLoading && customers.length === 0 && customersError === null ? (
              <div className="py-8 text-center text-xs text-fg-subtle">
                {isVi ? 'Đang tải hồ sơ khách hàng từ customer_profiles...' : 'Loading customer profiles from customer_profiles...'}
              </div>
            ) : customersError !== null ? (
              <div role="alert" className="m-4 p-4 bg-danger-tint border border-danger/30 rounded-lg text-xs text-danger font-mono break-all">
                {customersError}
              </div>
            ) : customers.length === 0 ? (
            <EmptyState
              size="sm"
              title={isVi ? 'Chưa có tài liệu NDA nào' : 'No NDA document yet'}
              description={
                isVi
                  ? 'Bảng customer_profiles chưa có bản ghi nào nên chưa có hồ sơ NDA nào để hiển thị.'
                  : 'customer_profiles has no row yet, so there is no NDA record to show.'
              }
              icon={<Icon name="policy" size={20} className="text-primary" />}
              action={
                <Button variant="secondary" size="sm" onClick={() => setActiveTab('customers')}>
                  {isVi ? 'Xem Khách Hàng' : 'View customers'}
                </Button>
              }
            />
            ) : (
            <DataTable<CustomerDisplayRow>
              columns={customerColumns}
              rows={displayRows}
              getRowId={(row) => row.row.id}
              caption={isVi ? 'Danh sách khách hàng' : 'Customer list'}
              tableLabel={isVi ? 'Danh sách khách hàng' : 'Customer list'}
              defaultSort={[{ key: 'name', direction: 'asc' }]}
            />
            )}
          </div>
        </div>
      )}

      {/* TAB 3: BÁO GIÁ LÔ LỚN (BATCH RFQ) */}
      {activeTab === 'rfq' && (
        <div className="space-y-4">
          <div className="bg-surface p-4 rounded-lg border border-warning/30 bg-warning-tint/20 flex items-start gap-3">
            <Icon name="warning" size={24} className="text-warning mt-0.5" />
            <div className="text-xs">
              <h4 className="font-bold text-warning text-sm">
                {isVi ? 'Chưa có nguồn dữ liệu RFQ trong DB' : 'No RFQ data source in the DB yet'}
              </h4>
              <p className="text-fg-muted mt-1">
                {isVi
                  ? 'Bảng `quotes` KHÔNG phải bảng RFQ: nó chỉ có file_name / material_id / printer_id / quantity / unit_price / payload (một bản báo giá cho 1 file) — không có tên dự án, số lượng lô, hạn giao hay trạng thái RFQ. Và trong toàn bộ service layer CHỈ có `dbService.saveQuote()` (ghi mù, có `insert` mà không có hàm ĐỌC). Vì vậy tab này không hiển thị danh sách thay thế và không có nút báo giá trên RAM.'
                  : 'The `quotes` table is NOT an RFQ table: it only has file_name / material_id / printer_id / quantity / unit_price / payload (one quote for one file) — no project name, batch quantity, deadline or RFQ status. The whole service layer only has `dbService.saveQuote()` (blind insert, no reader). This tab therefore shows no substitute list and offers no RAM-only quoting.'}
              </p>
            </div>
          </div>
          <EmptyState
            size="sm"
            title={isVi ? 'Không có bản ghi RFQ' : 'No RFQ record'}
            description={
              isVi
                ? 'Cần một bảng + hàm service đọc/ghi yêu cầu báo giá lô lớn trước khi tab này có dữ liệu thật.'
                : 'A table plus service read/write for batch quote requests is required before this tab can hold real data.'
            }
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
          title={isVi ? 'Hồ Sơ Thỏa Thuận Bảo Mật (NDA)' : 'NDA Profile'}
        >
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-canvas rounded-lg space-y-1.5 border border-line-subtle">
                <div className="flex justify-between">
                  <span className="text-fg-subtle">{isVi ? 'Tên khách hàng:' : 'Client Name:'}</span>
                  <span className="font-bold text-fg">
                    {selectedCustomerForNda.profileName || '—'}
                  </span>
                </div>
                {selectedCustomerForNda.companyName && (
                  <div className="flex justify-between">
                    <span className="text-fg-subtle">{isVi ? 'Pháp nhân:' : 'Entity:'}</span>
                    <span className="font-bold text-fg">{selectedCustomerForNda.companyName}</span>
                  </div>
                )}
                {selectedCustomerForNda.taxId && (
                  <div className="flex justify-between">
                    <span className="text-fg-subtle">{isVi ? 'MST:' : 'Tax ID:'}</span>
                    <span className="font-mono font-bold text-fg">{selectedCustomerForNda.taxId}</span>
                  </div>
                )}
                {selectedCustomerForNda.billingEmail && (
                  <div className="flex justify-between">
                    <span className="text-fg-subtle">{isVi ? 'Email hóa đơn:' : 'Billing email:'}</span>
                    <span className="font-mono text-fg-muted">{selectedCustomerForNda.billingEmail}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-fg-subtle">{isVi ? 'Trạng thái NDA:' : 'Status:'}</span>
                  <span className={`font-bold ${selectedCustomerForNda.ndaSigned ? 'text-positive' : 'text-fg-muted'}`}>
                    {selectedCustomerForNda.ndaSigned ? (isVi ? 'Đã ký' : 'Signed') : isVi ? 'Chưa ký' : 'Not signed'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-fg-subtle">{isVi ? 'Ngày ghi nhận:' : 'Recorded at:'}</span>
                  <span className="font-mono text-fg-muted">
                    {selectedCustomerForNda.ndaSignedAt
                      ? new Date(selectedCustomerForNda.ndaSignedAt).toLocaleDateString('vi-VN')
                      : '—'}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-info-tint/50 rounded-lg border border-info/30 text-fg-muted text-xs space-y-1">
                <div className="font-bold text-info">{isVi ? 'Cam Kết Bảo Vệ Thiết Kế CAD:' : 'CAD IP Protection:'}</div>
                <p>1. Bản quyền thuộc 100% về khách hàng và nhà phát triển.</p>
                <p>2. Không sao lưu, tái sử dụng hoặc cung cấp cho bên thứ 3 dưới mọi hình thức.</p>
                <p>3. Tiêu hủy mẫu phế phẩm thử nghiệm theo tiêu chuẩn bảo mật.</p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-line-subtle">
                <button
                  type="button"
                  onClick={() => setSelectedCustomerForNda(null)}
                  className="px-4 py-2 bg-surface-muted text-fg-muted text-xs font-bold rounded-lg cursor-pointer"
                >
                  {isVi ? 'Đóng' : 'Close'}
                </button>
              </div>
            </div>
        </Modal>
      )}

      {/* TAB 4: THẨM ĐỊNH HỒ SƠ ĐỊNH DANH (KYC) — bảng `user_profiles` */}
      {activeTab === 'kyc' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-surface p-3.5 rounded-lg border border-line-subtle shadow-e0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 bg-surface-muted p-1 rounded-lg text-xs font-semibold">
                <span className="text-fg-subtle px-1 text-xs uppercase tracking-wider">
                  {isVi ? 'KYC:' : 'KYC:'}
                </span>
                {(['all', 'pending_review', 'verified', 'rejected', 'unverified'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setKycFilter(s)}
                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                      kycFilter === s ? 'bg-surface text-primary font-bold shadow-e0' : 'text-fg-muted hover:text-fg'
                    }`}
                  >
                    {s === 'all'
                      ? isVi
                        ? 'Tất cả'
                        : 'All'
                      : s === 'pending_review'
                      ? isVi
                        ? 'Chờ duyệt'
                        : 'Pending'
                      : s === 'verified'
                      ? isVi
                        ? 'Đã duyệt'
                        : 'Verified'
                      : s === 'rejected'
                      ? isVi
                        ? 'Bị từ chối'
                        : 'Rejected'
                      : isVi
                      ? 'Chưa nộp'
                      : 'Unverified'}
                  </button>
                ))}
              </div>

              <button
                onClick={() => void loadKycRows()}
                disabled={isKycLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-subtle hover:bg-canvas text-fg-muted text-xs font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-60"
              >
                <Icon name="sync" size={16} className={isKycLoading ? 'animate-spin' : ''} />
                {isVi ? 'Tải lại' : 'Reload'}
              </button>
            </div>

            <div className="relative w-full md:w-72">
              <Icon name="search" size={16} className="absolute left-2.5 top-2 text-fg-subtle" />
              <input
                type="text"
                placeholder={isVi ? 'Tìm tên, email, doanh nghiệp...' : 'Search name, email, company...'}
                value={kycSearch}
                onChange={(e) => setKycSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-canvas border border-line-subtle rounded-lg focus:outline-none focus:border-primary focus:bg-surface"
              />
            </div>
          </div>

          <div className="bg-surface rounded-lg border border-line-subtle overflow-hidden shadow-e0">
            {!isKycLoading && filteredKycRows.length === 0 ? (
            <EmptyState
              size="sm"
              title={isVi ? 'Chưa có hồ sơ KYC nào' : 'No KYC profile yet'}
              description={
                isVi
                  ? 'Không hồ sơ người dùng nào khớp bộ lọc KYC hiện tại.'
                  : 'No user profile matches the current KYC filter.'
              }
              icon={<Icon name="verified" size={20} className="text-primary" />}
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setActiveTab('customers')}
                >
                  {isVi ? 'Xem Khách Hàng' : 'View customers'}
                </Button>
              }
            />
            ) : (
            <DataTable<KycRow>
              columns={kycColumns}
              rows={filteredKycRows}
              getRowId={(row) => row.uid}
              loading={isKycLoading && kycRows.length === 0}
              caption={isVi ? 'Hồ sơ KYC' : 'KYC profiles'}
              tableLabel={isVi ? 'Hồ sơ KYC' : 'KYC profiles'}
              emptyState={
                <EmptyState
                  live
                  title={isVi ? 'Không có hồ sơ KYC phù hợp' : 'No matching KYC profiles'}
                  description={isVi ? 'Thử xoá từ khoá hoặc đổi bộ lọc trạng thái.' : 'Clear the search or change the status filter.'}
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
              title={isVi ? 'Thẩm định hồ sơ định danh (KYC)' : 'KYC review'}
            >
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-fg-subtle">{isVi ? 'Người dùng:' : 'User:'}</span>
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
                    <span className="text-fg-subtle">{isVi ? 'Vai trò:' : 'Role:'}</span>
                    <span className="font-bold uppercase text-info">{reviewingKyc.role}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-fg-subtle">{isVi ? 'Trạng thái KYC hiện tại:' : 'Current KYC:'}</span>
                    <span className="font-bold text-fg">{reviewingKyc.kycStatus}</span>
                  </div>
                  {reviewingKyc.notes && (
                    <div className="p-2.5 bg-warning-tint border border-warning/30 rounded-lg text-warning">
                      <div className="font-bold text-xs uppercase">{isVi ? 'Ghi chú hiện tại:' : 'Current note:'}</div>
                      <p>{reviewingKyc.notes}</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-fg-muted mb-1">
                      {isVi ? 'Lý do từ chối (bắt buộc khi từ chối):' : 'Rejection reason (required when rejecting):'}
                    </label>
                    <input
                      type="text"
                      value={kycRejectionReason}
                      onChange={(e) => setKycRejectionReason(e.target.value)}
                      placeholder={isVi ? 'Ví dụ: Ảnh CCCD bị mờ, MST không khớp tên doanh nghiệp...' : 'e.g. blurry ID, tax code mismatch...'}
                      className="w-full text-xs px-3 py-2 border border-line-subtle rounded-lg focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-line-subtle">
                  <button
                    type="button"
                    onClick={() => setReviewingKyc(null)}
                    className="px-4 py-2 bg-surface-muted hover:bg-line-subtle text-fg-muted text-xs font-bold rounded-lg cursor-pointer"
                  >
                    {isVi ? 'Đóng' : 'Close'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleRejectKyc(reviewingKyc)}
                    className="px-4 py-2 bg-danger hover:bg-danger/90 text-primary-fg text-xs font-bold rounded-lg cursor-pointer"
                  >
                    {isVi ? 'Từ Chối KYC' : 'Reject KYC'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleApproveKyc(reviewingKyc)}
                    className="px-4 py-2 bg-primary hover:bg-primary-hover text-primary-fg text-xs font-bold rounded-lg cursor-pointer"
                  >
                    {isVi ? 'Duyệt Xác Minh' : 'Approve KYC'}
                  </button>
                </div>
            </Modal>
          )}
        </div>
      )}

    </div>
  );
};
export default Group3CustomersPanel;
