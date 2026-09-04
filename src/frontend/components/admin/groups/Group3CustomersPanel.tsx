import React, { useState, useMemo } from 'react';
import { useCustomerAdminStore, ExtendedCustomerProfile, RFQItem } from '../../../../stores/useCustomerAdminStore';
import { useWorkshopAdminStore } from '../../../../stores/useWorkshopAdminStore';
import { useLanguage } from '../../../context/LanguageContext';

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

  const [activeTab, setActiveTab] = useState<'customers' | 'nda' | 'rfq'>('customers');

  // Customer Admin Store
  const {
    customers,
    rfqs,
    filters,
    setFilterCustomerType,
    setFilterNdaStatus,
    setFilterRfqStatus,
    setSearchQuery,
    approveCustomerNDA,
    revokeCustomerNDA,
    updateRFQStatus,
    assignRFQToWorkshop,
    getCustomerStats
  } = useCustomerAdminStore();

  // Workshop Store (to select workshop when assigning RFQ)
  const { workshops } = useWorkshopAdminStore();

  const stats = getCustomerStats();

  // Modals state
  const [selectedRfqForQuote, setSelectedRfqForQuote] = useState<RFQItem | null>(null);
  const [quotePriceInput, setQuotePriceInput] = useState<number>(0);
  const [selectedWorkshopIdForRfq, setSelectedWorkshopIdForRfq] = useState<string>('');

  const [selectedCustomerForNda, setSelectedCustomerForNda] = useState<ExtendedCustomerProfile | null>(null);

  // Format currency
  const formatVnd = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(val);
  };

  // Filtered Customers
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchType = filters.customerType === 'all' || c.customerType === filters.customerType;
      const matchNda = filters.ndaStatus === 'all' || c.ndaStatus === filters.ndaStatus;
      const matchSearch =
        !filters.searchQuery ||
        c.name.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
        c.email.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
        (c.companyName && c.companyName.toLowerCase().includes(filters.searchQuery.toLowerCase())) ||
        (c.taxId && c.taxId.includes(filters.searchQuery));
      return matchType && matchNda && matchSearch;
    });
  }, [customers, filters]);

  // Filtered RFQs
  const filteredRfqs = useMemo(() => {
    return rfqs.filter((r) => {
      const matchStatus = filters.rfqStatus === 'all' || r.status === filters.rfqStatus;
      const matchSearch =
        !filters.searchQuery ||
        r.projectName.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
        r.customerName.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
        (r.companyName && r.companyName.toLowerCase().includes(filters.searchQuery.toLowerCase()));
      return matchStatus && matchSearch;
    });
  }, [rfqs, filters]);

  // Open Quote Modal
  const handleOpenQuoteModal = (rfq: RFQItem) => {
    setSelectedRfqForQuote(rfq);
    setQuotePriceInput(rfq.quotedPriceVnd || rfq.budgetEstimateVnd || 10000000);
    setSelectedWorkshopIdForRfq(rfq.assignedWorkshopId || (workshops[0]?.id ?? ''));
  };

  // Submit Official Quote & Assign
  const handleSubmitQuote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRfqForQuote) return;

    const chosenWorkshop = workshops.find((w) => w.id === selectedWorkshopIdForRfq);
    if (chosenWorkshop) {
      assignRFQToWorkshop(selectedRfqForQuote.id, chosenWorkshop.id, chosenWorkshop.workshopName);
    }
    updateRFQStatus(selectedRfqForQuote.id, 'Quoted', quotePriceInput);

    onShowToast?.(
      isVi
        ? `Đã gửi báo giá ${formatVnd(quotePriceInput)} cho dự án ${selectedRfqForQuote.projectName}!`
        : `Sent quotation of ${formatVnd(quotePriceInput)} for ${selectedRfqForQuote.projectName}!`
    );
    setSelectedRfqForQuote(null);
  };

  // Approve NDA
  const handleApproveNDA = (c: ExtendedCustomerProfile) => {
    approveCustomerNDA(c.id);
    onShowToast?.(
      isVi
        ? `Đã xác thực thỏa thuận bảo mật NDA cho khách hàng ${c.name} (${c.companyName || 'Doanh nghiệp'})`
        : `Verified NDA agreement for ${c.name}`
    );
  };

  return (
    <div className="space-y-6">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-700">
              Group 3
            </span>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              {isVi ? 'Quản Trị Khách Hàng, NDA & Đơn Lô Lớn RFQ' : 'Customers, NDA Agreements & Batch RFQ Hub'}
            </h2>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {isVi
              ? 'Phân hệ khách hàng B2C / Doanh nghiệp B2B (MST, Hóa đơn VAT), kiểm soát thỏa thuận NDA bảo mật và điều phối báo giá dự án in 3D hàng loạt.'
              : 'Manage B2C / B2B corporate profiles, enforce confidential NDA contracts, and process industrial batch RFQ requests.'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setActiveTab('customers')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'customers'
                ? 'bg-white text-[#00687A] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-base">corporate_fare</span>
            {isVi ? 'Khách Hàng B2B/B2C' : 'Customers'}
          </button>
          <button
            onClick={() => setActiveTab('nda')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'nda'
                ? 'bg-white text-[#00687A] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-base">verified_user</span>
            {isVi ? 'Thỏa Thuận NDA' : 'NDA Agreements'}
            {stats.pendingNDACount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-amber-500 text-white text-[10px] font-black rounded-full">
                {stats.pendingNDACount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('rfq')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'rfq'
                ? 'bg-white text-[#00687A] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-base">request_quote</span>
            {isVi ? 'Báo Giá Lô Lớn (RFQ)' : 'Batch RFQ'}
            {stats.pendingRFQsCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-blue-600 text-white text-[10px] font-black rounded-full">
                {stats.pendingRFQsCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold uppercase text-slate-500">{isVi ? 'Tổng Khách Hàng' : 'Total Accounts'}</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{stats.totalCustomers}</div>
          <div className="text-[11px] text-slate-500 font-semibold mt-0.5">{stats.b2bCount} B2B • {stats.b2cCount} B2C</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-blue-200 bg-blue-50/20 shadow-2xs">
          <div className="text-[11px] font-bold uppercase text-blue-700">{isVi ? 'Doanh Nghiệp B2B' : 'B2B Corporate'}</div>
          <div className="text-2xl font-black text-blue-700 mt-1">{stats.b2bCount}</div>
          <div className="text-[11px] text-blue-600 font-semibold mt-0.5">{isVi ? 'Có MST & Hóa đơn' : 'Verified Tax ID'}</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-2xs">
          <div className="text-[11px] font-bold uppercase text-emerald-700">{isVi ? 'NDA Đã Ký' : 'NDA Signed'}</div>
          <div className="text-2xl font-black text-emerald-700 mt-1">{stats.signedNDACount}</div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">{isVi ? 'Bảo mật R&D' : 'Confidential'}</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-amber-200 bg-amber-50/20 shadow-2xs">
          <div className="text-[11px] font-bold uppercase text-amber-700">{isVi ? 'NDA Chờ Duyệt' : 'NDA Review'}</div>
          <div className="text-2xl font-black text-amber-700 mt-1">{stats.pendingNDACount}</div>
          <div className="text-[11px] text-amber-600 font-semibold mt-0.5">{isVi ? 'Cần xác thực' : 'Action needed'}</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/20 shadow-2xs">
          <div className="text-[11px] font-bold uppercase text-indigo-700">{isVi ? 'Dự Án RFQ Lô Lớn' : 'Batch RFQs'}</div>
          <div className="text-2xl font-black text-indigo-700 mt-1">{stats.totalRFQsCount}</div>
          <div className="text-[11px] text-indigo-600 font-semibold mt-0.5">{stats.pendingRFQsCount} {isVi ? 'cần báo giá' : 'open'}</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-2xs">
          <div className="text-[11px] font-bold uppercase text-emerald-700">{isVi ? 'Doanh Thu Khách' : 'Total Revenue'}</div>
          <div className="text-lg font-black text-emerald-700 mt-1 truncate">
            {formatVnd(stats.totalCustomerSpendVnd)}
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">{isVi ? 'Đã thanh toán' : 'Settled'}</div>
        </div>
      </div>

      {/* TAB 1: KHÁCH HÀNG B2B & B2C */}
      {activeTab === 'customers' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
                <span className="text-slate-400 px-1 text-[11px] uppercase tracking-wider">{isVi ? 'Phân loại:' : 'Type:'}</span>
                {(['all', 'B2B', 'B2C'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setFilterCustomerType(t)}
                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                      filters.customerType === t
                        ? 'bg-white text-[#00687A] font-bold shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {t === 'all' ? (isVi ? 'Tất cả' : 'All') : t === 'B2B' ? (isVi ? '🏢 Doanh nghiệp (B2B)' : '🏢 B2B') : (isVi ? '👤 Cá nhân (B2C)' : '👤 B2C')}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
                <span className="text-slate-400 px-1 text-[11px] uppercase tracking-wider">NDA:</span>
                {(['all', 'Signed', 'PendingReview', 'None'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilterNdaStatus(s)}
                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                      filters.ndaStatus === s
                        ? 'bg-white text-[#00687A] font-bold shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {s === 'all'
                      ? (isVi ? 'Tất cả' : 'All')
                      : s === 'Signed'
                      ? 'Đã ký'
                      : s === 'PendingReview'
                      ? 'Chờ duyệt'
                      : 'Chưa có'}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative w-full md:w-72">
              <span className="material-symbols-outlined absolute left-2.5 top-2 text-slate-400 text-sm">
                search
              </span>
              <input
                type="text"
                placeholder={isVi ? 'Tìm tên, công ty, MST, email...' : 'Search customer, tax ID...'}
                value={filters.searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#00687A] focus:bg-white"
              />
            </div>
          </div>

          {/* Customer Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCustomers.map((c) => (
              <div
                key={c.id}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            c.customerType === 'B2B'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {c.customerType === 'B2B' ? '🏢 Khách Doanh Nghiệp' : '👤 Khách Cá Nhân'}
                        </span>

                        {c.ndaStatus === 'Signed' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">verified</span>
                            NDA Signed
                          </span>
                        ) : c.ndaStatus === 'PendingReview' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">pending_actions</span>
                            NDA Pending
                          </span>
                        ) : null}
                      </div>

                      <h3 className="font-bold text-slate-900 text-base mt-2">{c.name}</h3>
                      {c.companyName && (
                        <p className="text-xs font-semibold text-slate-700 mt-0.5">{c.companyName}</p>
                      )}
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] text-slate-400 font-bold uppercase">{isVi ? 'Tổng Chi Tiêu' : 'Total Spend'}</div>
                      <div className="font-black text-slate-900 font-mono text-sm">{formatVnd(c.totalSpendVnd)}</div>
                      <div className="text-[10px] text-slate-500">{c.totalOrders} {isVi ? 'đơn hàng' : 'orders'}</div>
                    </div>
                  </div>

                  {/* Corporate Legal & Tax Details */}
                  {c.customerType === 'B2B' && (
                    <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">{isVi ? 'Mã số thuế (MST):' : 'Tax ID:'}</span>
                        <span className="font-mono font-bold text-slate-800">{c.taxId || 'Chưa cung cấp'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">{isVi ? 'Email hóa đơn VAT:' : 'Billing Email:'}</span>
                        <span className="font-mono text-slate-700">{c.billingEmail || c.email}</span>
                      </div>
                      {c.assignedAccountManager && (
                        <div className="flex justify-between pt-1 border-t border-slate-200/50">
                          <span className="text-slate-400">{isVi ? 'Phụ trách Account:' : 'Key Account:'}</span>
                          <span className="font-medium text-[#00687A]">{c.assignedAccountManager}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Contact info */}
                  <div className="mt-3 text-xs text-slate-500 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px]">mail</span>
                      <span>{c.email}</span>
                      <span className="text-slate-300">•</span>
                      <span className="material-symbols-outlined text-[14px]">call</span>
                      <span>{c.phone}</span>
                    </div>
                    {c.shippingAddressText && (
                      <div className="flex items-center gap-1.5 line-clamp-1">
                        <span className="material-symbols-outlined text-[14px]">home_pin</span>
                        <span>{c.shippingAddressText}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Action */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400">
                    {isVi ? 'Thanh toán ưu tiên:' : 'Payment:'} <span className="uppercase font-bold text-slate-700">{c.preferredPaymentMethod}</span>
                  </span>

                  {c.ndaStatus === 'PendingReview' ? (
                    <button
                      onClick={() => handleApproveNDA(c)}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">check</span>
                      {isVi ? 'Duyệt Ký NDA' : 'Approve NDA'}
                    </button>
                  ) : (
                    <button
                      onClick={() => setSelectedCustomerForNda(c)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">shield</span>
                      {isVi ? 'Hồ Sơ NDA' : 'NDA Info'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: THỎA THUẬN BẢO MẬT NDA */}
      {activeTab === 'nda' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between text-xs">
            <div>
              <h4 className="font-bold text-slate-900 text-sm">
                {isVi ? 'Chính Sách Bảo Mật Tài Sản Trí Tuệ & CAD File (NDA Standard)' : 'IP Confidentiality & CAD NDA'}
              </h4>
              <p className="text-slate-500 mt-0.5">
                {isVi
                  ? 'Mọi xưởng in và kỹ sư VCUBE cam kết mã hóa file STL/STEP 256-bit và xóa vĩnh viễn sau khi hoàn thành đơn.'
                  : 'All workshop partners are bound to 256-bit CAD encryption and post-print data wipe policies.'}
              </p>
            </div>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-lg font-bold">
              VCUBE NDA v2.4
            </span>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">{isVi ? 'Khách Hàng / Đơn Vị' : 'Client Entity'}</th>
                    <th className="py-3 px-3">{isVi ? 'Phân loại' : 'Type'}</th>
                    <th className="py-3 px-3">{isVi ? 'Mã số thuế' : 'Tax ID'}</th>
                    <th className="py-3 px-3">{isVi ? 'Tài liệu ký kết' : 'Document'}</th>
                    <th className="py-3 px-3">{isVi ? 'Ngày ký kết' : 'Signed Date'}</th>
                    <th className="py-3 px-3">{isVi ? 'Trạng thái' : 'Status'}</th>
                    <th className="py-3 px-4 text-right">{isVi ? 'Hành động' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customers.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <div>{c.name}</div>
                        {c.companyName && <div className="text-[11px] text-slate-500 font-normal">{c.companyName}</div>}
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="px-2 py-0.5 bg-slate-100 font-bold text-[10px] rounded text-slate-700">
                          {c.customerType}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 font-mono text-slate-700">
                        {c.taxId || '-'}
                      </td>
                      <td className="py-3.5 px-3">
                        {c.ndaDocumentUrl ? (
                          <span className="text-[#00687A] font-mono font-medium underline cursor-pointer flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">description</span>
                            {c.ndaDocumentUrl.split('/').pop()}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">{isVi ? 'Chưa đính kèm' : 'None'}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-slate-500">
                        {c.ndaSignedAt ? new Date(c.ndaSignedAt).toLocaleDateString('vi-VN') : '-'}
                      </td>
                      <td className="py-3.5 px-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            c.ndaStatus === 'Signed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : c.ndaStatus === 'PendingReview'
                              ? 'bg-amber-100 text-amber-800 animate-pulse'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {c.ndaStatus === 'Signed'
                            ? (isVi ? 'Đã Xác Thực' : 'Signed')
                            : c.ndaStatus === 'PendingReview'
                            ? (isVi ? 'Chờ Phê Duyệt' : 'Pending Review')
                            : (isVi ? 'Chưa Ký' : 'Unsigned')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {c.ndaStatus === 'PendingReview' && (
                          <button
                            onClick={() => handleApproveNDA(c)}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded cursor-pointer"
                          >
                            {isVi ? 'Duyệt NDA' : 'Approve'}
                          </button>
                        )}
                        {c.ndaStatus === 'Signed' && (
                          <button
                            onClick={() => {
                              revokeCustomerNDA(c.id);
                              onShowToast?.(isVi ? `Đã thu hồi thỏa thuận NDA của ${c.name}` : `Revoked NDA for ${c.name}`);
                            }}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-semibold rounded cursor-pointer"
                          >
                            {isVi ? 'Thu Hồi' : 'Revoke'}
                          </button>
                        )}
                        {c.ndaStatus === 'None' && (
                          <button
                            onClick={() => {
                              approveCustomerNDA(c.id);
                              onShowToast?.(isVi ? `Đã gửi hợp đồng NDA cho ${c.name}` : `Issued NDA for ${c.name}`);
                            }}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium rounded cursor-pointer"
                          >
                            {isVi ? 'Gửi Ký Mới' : 'Issue NDA'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: BÁO GIÁ LÔ LỚN (BATCH RFQ) */}
      {activeTab === 'rfq' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
              <span className="text-slate-400 px-1 text-[11px] uppercase tracking-wider">{isVi ? 'Trạng thái RFQ:' : 'Status:'}</span>
              {(['all', 'New', 'UnderReview', 'Quoted', 'Accepted'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterRfqStatus(st as any)}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    filters.rfqStatus === st
                      ? 'bg-white text-[#00687A] font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st === 'all'
                    ? (isVi ? 'Tất cả' : 'All')
                    : st === 'New'
                    ? '🔴 Mới'
                    : st === 'UnderReview'
                    ? '🟡 Đang Xem'
                    : st === 'Quoted'
                    ? '🟢 Đã Báo Giá'
                    : '🔵 Khách Chốt'}
                </button>
              ))}
            </div>

            <div className="text-xs text-slate-500 font-medium">
              {isVi
                ? `Tổng ${rfqs.length} dự án in 3D công nghiệp số lượng lớn.`
                : `Total ${rfqs.length} industrial batch projects.`}
            </div>
          </div>

          {/* RFQ Projects Cards */}
          <div className="space-y-3">
            {filteredRfqs.map((rfq) => (
              <div
                key={rfq.id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-slate-100 text-slate-700">
                      {rfq.targetTechnology}
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-400">{rfq.id}</span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        rfq.status === 'Accepted'
                          ? 'bg-emerald-100 text-emerald-800'
                          : rfq.status === 'Quoted'
                          ? 'bg-blue-100 text-blue-800'
                          : rfq.status === 'UnderReview'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800 animate-pulse'
                      }`}
                    >
                      {rfq.status === 'Accepted'
                        ? (isVi ? 'Đã Chốt Sản Xuất' : 'Order Accepted')
                        : rfq.status === 'Quoted'
                        ? (isVi ? 'Đã Gửi Báo Giá' : 'Quoted')
                        : rfq.status === 'UnderReview'
                        ? (isVi ? 'Đang Khảo Sát Kỹ Thuật' : 'Technical Review')
                        : (isVi ? 'Yêu Cầu Mới' : 'New Request')}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-base">{rfq.projectName}</h3>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm text-slate-400">domain</span>
                      <span className="font-semibold text-slate-800">{rfq.companyName || rfq.customerName}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm text-slate-400">category</span>
                      <span>{rfq.preferredMaterial}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm text-slate-400">production_quantity_limits</span>
                      <span className="font-bold text-slate-900 font-mono">SL: {rfq.targetQuantity} chiếc</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm text-slate-400">event</span>
                      <span>Hạn: <span className="font-medium text-slate-800">{rfq.requiredDeadline}</span></span>
                    </div>
                  </div>

                  {rfq.specsNotes && (
                    <p className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <span className="font-bold text-slate-700">{isVi ? 'Yêu cầu kỹ thuật:' : 'Specs:'}</span> {rfq.specsNotes}
                    </p>
                  )}

                  {rfq.assignedWorkshopName && (
                    <div className="text-xs text-[#00687A] flex items-center gap-1 font-medium">
                      <span className="material-symbols-outlined text-sm">home_repair_service</span>
                      {isVi ? 'Xưởng phụ trách:' : 'Assigned Workshop:'} <span className="font-bold">{rfq.assignedWorkshopName}</span>
                    </div>
                  )}
                </div>

                {/* Right Financial & Action Box */}
                <div className="md:w-64 border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-5 flex flex-col justify-between items-start md:items-end gap-3 shrink-0">
                  <div className="text-left md:text-right">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">{isVi ? 'Ngân Sách Dự Kiến' : 'Target Budget'}</div>
                    <div className="text-sm font-bold text-slate-700 font-mono">{formatVnd(rfq.budgetEstimateVnd)}</div>

                    {rfq.quotedPriceVnd && (
                      <div className="mt-1">
                        <div className="text-[10px] text-blue-600 font-bold uppercase">{isVi ? 'Báo Giá Chính Thức' : 'Official Quoted'}</div>
                        <div className="text-lg font-black text-[#00687A] font-mono">{formatVnd(rfq.quotedPriceVnd)}</div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleOpenQuoteModal(rfq)}
                    className="w-full py-2 px-3 bg-[#00687A] hover:bg-[#005260] text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">price_check</span>
                    {rfq.status === 'Quoted' ? (isVi ? 'Điều Chỉnh Báo Giá' : 'Adjust Quote') : (isVi ? 'Báo Giá & Gán Xưởng' : 'Quote & Dispatch')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: BÁO GIÁ & GÁN XƯỞNG IN RFQ */}
      {selectedRfqForQuote && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  {isVi ? 'Gửi Báo Giá Đơn Lô Lớn & Điều Phối Xưởng' : 'Quotation & Workshop Assignment'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">{selectedRfqForQuote.projectName}</p>
              </div>
              <button
                onClick={() => setSelectedRfqForQuote(null)}
                className="text-slate-400 hover:text-slate-600 material-symbols-outlined text-xl cursor-pointer"
              >
                close
              </button>
            </div>

            <form onSubmit={handleSubmitQuote} className="mt-4 space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">{isVi ? 'Khách hàng:' : 'Client:'}</span>
                  <span className="font-bold text-slate-900">{selectedRfqForQuote.customerName} ({selectedRfqForQuote.companyName || 'Cá nhân'})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{isVi ? 'Số lượng đặt:' : 'Quantity:'}</span>
                  <span className="font-bold text-slate-900 font-mono">{selectedRfqForQuote.targetQuantity} chiếc ({selectedRfqForQuote.targetTechnology})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{isVi ? 'Ngân sách mong đợi:' : 'Target Budget:'}</span>
                  <span className="font-bold text-slate-700 font-mono">{formatVnd(selectedRfqForQuote.budgetEstimateVnd)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isVi ? 'Xưởng in nhận gia công chính:' : 'Assigned Workshop Partner:'}
                </label>
                <select
                  value={selectedWorkshopIdForRfq}
                  onChange={(e) => setSelectedWorkshopIdForRfq(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#00687A]"
                >
                  {workshops.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.workshopName} ({w.region} - {w.totalMachines} máy in)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isVi ? 'Đơn giá báo giá chính thức (VNĐ đã gồm thuế):' : 'Official Quoted Price (VND):'}
                </label>
                <input
                  type="number"
                  step="500000"
                  required
                  value={quotePriceInput}
                  onChange={(e) => setQuotePriceInput(Number(e.target.value))}
                  className="w-full text-sm font-mono font-bold px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#00687A]"
                />
                <div className="text-[11px] text-slate-500 mt-1">
                  Tương đương: {formatVnd(Math.round(quotePriceInput / selectedRfqForQuote.targetQuantity))} / chiếc
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedRfqForQuote(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg cursor-pointer"
                >
                  {isVi ? 'Hủy' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#00687A] text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer"
                >
                  {isVi ? 'Phê Duyệt & Gửi Báo Giá' : 'Approve & Send Quote'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: XEM HỒ SƠ NDA KHÁCH HÀNG */}
      {selectedCustomerForNda && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">
                {isVi ? 'Hồ Sơ Thỏa Thuận Bảo Mật (NDA)' : 'NDA Profile'}
              </h3>
              <button
                onClick={() => setSelectedCustomerForNda(null)}
                className="text-slate-400 hover:text-slate-600 material-symbols-outlined text-xl cursor-pointer"
              >
                close
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 border border-slate-100">
                <div className="flex justify-between">
                  <span className="text-slate-500">{isVi ? 'Tên khách hàng:' : 'Client Name:'}</span>
                  <span className="font-bold text-slate-900">{selectedCustomerForNda.name}</span>
                </div>
                {selectedCustomerForNda.companyName && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">{isVi ? 'Pháp nhân:' : 'Entity:'}</span>
                    <span className="font-bold text-slate-900">{selectedCustomerForNda.companyName}</span>
                  </div>
                )}
                {selectedCustomerForNda.taxId && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">{isVi ? 'MST:' : 'Tax ID:'}</span>
                    <span className="font-mono font-bold text-slate-900">{selectedCustomerForNda.taxId}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">{isVi ? 'Trạng thái NDA:' : 'Status:'}</span>
                  <span className="font-bold text-emerald-700">{selectedCustomerForNda.ndaStatus}</span>
                </div>
              </div>

              <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 text-slate-600 text-xs space-y-1">
                <div className="font-bold text-blue-900">{isVi ? 'Cam Kết Bảo Vệ Thiết Kế CAD:' : 'CAD IP Protection:'}</div>
                <p>1. Bản quyền thuộc 100% về khách hàng và nhà phát triển.</p>
                <p>2. Không sao lưu, tái sử dụng hoặc cung cấp cho bên thứ 3 dưới mọi hình thức.</p>
                <p>3. Tiêu hủy mẫu phế phẩm thử nghiệm theo tiêu chuẩn bảo mật.</p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedCustomerForNda(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg cursor-pointer"
                >
                  {isVi ? 'Đóng' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Group3CustomersPanel;
