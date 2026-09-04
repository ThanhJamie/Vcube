import React, { useState, useMemo } from 'react';
import { useDesignerAdminStore, ExtendedDesignerProfile, DesignerWithdrawalRequest } from '../../../../stores/useDesignerAdminStore';
import { useLanguage } from '../../../context/LanguageContext';

export interface Group2DesignersPanelProps {
  onShowToast?: (message: string) => void;
  onNavigateSection?: (section: any) => void;
}

export const Group2DesignersPanel: React.FC<Group2DesignersPanelProps> = ({
  onShowToast,
  onNavigateSection
}) => {
  const { language } = useLanguage();
  const isVi = language === 'vi';

  const [activeTab, setActiveTab] = useState<'designers' | 'withdrawals' | 'analytics'>('designers');

  // Zustand Store
  const {
    designers,
    withdrawals,
    filters,
    setFilterBadgeTier,
    setFilterStatus,
    setSearchQuery,
    setBadgeTier,
    updateRoyaltyPercent,
    updateDesignerStatus,
    approveWithdrawal,
    completePayoutTransfer,
    rejectWithdrawal,
    getDesignerStats
  } = useDesignerAdminStore();

  const stats = getDesignerStats();

  // Modals / Editing state
  const [editingDesigner, setEditingDesigner] = useState<ExtendedDesignerProfile | null>(null);
  const [royaltyDraft, setRoyaltyDraft] = useState<number>(10);
  const [badgeDraft, setBadgeDraft] = useState<ExtendedDesignerProfile['badgeTier']>('Standard');

  // Withdrawal processing modal
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<DesignerWithdrawalRequest | null>(null);
  const [txRefInput, setTxRefInput] = useState('');
  const [rejectReasonInput, setRejectReasonInput] = useState('');
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

  // Format currency
  const formatVnd = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(val);
  };

  // Filtered designers
  const filteredDesigners = useMemo(() => {
    return designers.filter((d) => {
      const matchBadge = filters.badgeTier === 'all' || d.badgeTier === filters.badgeTier;
      const matchStatus = filters.status === 'all' || d.status === filters.status;
      const matchQuery =
        !filters.searchQuery ||
        d.displayName.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
        d.email.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
        (d.bio && d.bio.toLowerCase().includes(filters.searchQuery.toLowerCase()));
      return matchBadge && matchStatus && matchQuery;
    });
  }, [designers, filters]);

  // Open Edit Designer Modal
  const handleOpenEdit = (d: ExtendedDesignerProfile) => {
    setEditingDesigner(d);
    setRoyaltyDraft(d.defaultRoyaltyPercent);
    setBadgeDraft(d.badgeTier);
  };

  // Save changes to designer
  const handleSaveDesigner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDesigner) return;

    setBadgeTier(editingDesigner.id, badgeDraft);
    updateRoyaltyPercent(editingDesigner.id, royaltyDraft);
    setEditingDesigner(null);
    onShowToast?.(
      isVi
        ? `Đã cập nhật danh hiệu & trần hoa hồng cho ${editingDesigner.displayName}!`
        : `Updated tier & royalty cap for ${editingDesigner.displayName}!`
    );
  };

  // Handle Complete Transfer
  const handleConfirmTransfer = (w: DesignerWithdrawalRequest) => {
    const tx = txRefInput.trim() || `VCB-${Date.now().toString().slice(-6)}`;
    completePayoutTransfer(w.id, tx);
    setSelectedWithdrawal(null);
    setTxRefInput('');
    onShowToast?.(
      isVi
        ? `Đã xác nhận tất toán ${formatVnd(w.amountVnd)} cho ${w.designerName} (Mã GD: ${tx})`
        : `Payout of ${formatVnd(w.amountVnd)} transferred to ${w.designerName} (Ref: ${tx})`
    );
  };

  // Handle Reject
  const handleConfirmReject = () => {
    if (!selectedWithdrawal) return;
    if (!rejectReasonInput.trim()) {
      alert(isVi ? 'Vui lòng nhập lý do từ chối' : 'Please provide rejection reason');
      return;
    }
    rejectWithdrawal(selectedWithdrawal.id, rejectReasonInput.trim());
    setIsRejectModalOpen(false);
    setSelectedWithdrawal(null);
    setRejectReasonInput('');
    onShowToast?.(isVi ? 'Đã từ chối lệnh rút tiền' : 'Withdrawal rejected');
  };

  return (
    <div className="space-y-6">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-700">
              Group 2
            </span>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              {isVi ? 'Quản Trị Nhà Thiết Kế & Bản Quyền (Designers Hub)' : 'Designers & IP Royalty Hub'}
            </h2>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {isVi
              ? 'Xác thực hồ sơ Creator, gán Badge Tier danh hiệu, điều chỉnh trần hoa hồng bản quyền và quyết toán rút tiền.'
              : 'Verify designer profiles, assign Badge Tiers, adjust royalty percentage caps, and settle withdrawal payouts.'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setActiveTab('designers')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'designers'
                ? 'bg-white text-[#00687A] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-base">palette</span>
            {isVi ? 'Hồ Sơ Designers' : 'Designers'}
          </button>
          <button
            onClick={() => setActiveTab('withdrawals')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'withdrawals'
                ? 'bg-white text-[#00687A] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-base">payments</span>
            {isVi ? 'Lệnh Rút Tiền' : 'Payouts'}
            {withdrawals.filter((w) => w.status === 'Pending').length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-amber-500 text-white text-[10px] font-black rounded-full">
                {withdrawals.filter((w) => w.status === 'Pending').length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'analytics'
                ? 'bg-white text-[#00687A] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-base">query_stats</span>
            {isVi ? 'Doanh Thu & Sales' : 'Sales Stats'}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold uppercase text-slate-500">{isVi ? 'Tổng Designers' : 'Total Designers'}</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{stats.totalDesigners}</div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">100% Hoạt động</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-amber-200 bg-amber-50/20 shadow-2xs">
          <div className="text-[11px] font-bold uppercase text-amber-700">{isVi ? 'Top Creators' : 'Top Creators'}</div>
          <div className="text-2xl font-black text-amber-700 mt-1">{stats.topCreatorsCount}</div>
          <div className="text-[11px] text-amber-600 font-semibold mt-0.5">{isVi ? 'Huy hiệu cao nhất' : 'Elite tier'}</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-blue-200 bg-blue-50/20 shadow-2xs">
          <div className="text-[11px] font-bold uppercase text-blue-700">{isVi ? 'Kỹ Sư CAD' : 'Verified Eng.'}</div>
          <div className="text-2xl font-black text-blue-700 mt-1">{stats.verifiedEngineersCount}</div>
          <div className="text-[11px] text-blue-600 font-semibold mt-0.5">{isVi ? 'Kỹ thuật chính xác' : 'Mechanical'}</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-purple-200 bg-purple-50/20 shadow-2xs">
          <div className="text-[11px] font-bold uppercase text-purple-700">{isVi ? 'Pioneer Makers' : 'Pioneers'}</div>
          <div className="text-2xl font-black text-purple-700 mt-1">{stats.pioneerMakersCount}</div>
          <div className="text-[11px] text-purple-600 font-semibold mt-0.5">{isVi ? 'Tạo mẫu sáng tạo' : 'Artistic'}</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-2xs">
          <div className="text-[11px] font-bold uppercase text-emerald-700">{isVi ? 'Royalties Đã Trả' : 'Royalties Paid'}</div>
          <div className="text-lg font-black text-emerald-700 mt-1 truncate">
            {formatVnd(stats.totalRoyaltiesPaidVnd)}
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">{isVi ? 'Tích lũy hệ thống' : 'All-time'}</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-rose-200 bg-rose-50/20 shadow-2xs">
          <div className="text-[11px] font-bold uppercase text-rose-700">{isVi ? 'Chờ Quyết Toán' : 'Pending Payout'}</div>
          <div className="text-lg font-black text-rose-700 mt-1 truncate">
            {formatVnd(stats.pendingPayoutVnd)}
          </div>
          <div className="text-[11px] text-rose-600 font-semibold mt-0.5">
            {withdrawals.filter((w) => w.status === 'Pending').length} {isVi ? 'lệnh chờ duyệt' : 'pending'}
          </div>
        </div>
      </div>

      {/* TAB 1: DANH SÁCH DESIGNER & HUY HIỆU */}
      {activeTab === 'designers' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
                <span className="text-slate-400 px-1 text-[11px] uppercase tracking-wider">{isVi ? 'Huy hiệu:' : 'Badge Tier:'}</span>
                {(['all', 'TopCreator', 'VerifiedEngineer', 'PioneerMaker', 'Standard'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setFilterBadgeTier(t)}
                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                      filters.badgeTier === t
                        ? 'bg-white text-[#00687A] font-bold shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
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
            </div>

            <div className="relative w-full md:w-72">
              <span className="material-symbols-outlined absolute left-2.5 top-2 text-slate-400 text-sm">
                search
              </span>
              <input
                type="text"
                placeholder={isVi ? 'Tìm tên designer, email...' : 'Search designer...'}
                value={filters.searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#00687A] focus:bg-white"
              />
            </div>
          </div>

          {/* Designer Profiles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredDesigners.map((d) => (
              <div
                key={d.id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={d.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
                        alt={d.displayName}
                        className="w-13 h-13 rounded-full object-cover border-2 border-slate-200 shadow-2xs shrink-0"
                      />
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-bold text-slate-900 text-base">{d.displayName}</h3>
                          {/* Badge Tier Chip */}
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-2xs ${
                              d.badgeTier === 'TopCreator'
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : d.badgeTier === 'VerifiedEngineer'
                                ? 'bg-blue-100 text-blue-900 border border-blue-300'
                                : d.badgeTier === 'PioneerMaker'
                                ? 'bg-purple-100 text-purple-900 border border-purple-300'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {d.badgeTier === 'TopCreator' && '👑 Top Creator'}
                            {d.badgeTier === 'VerifiedEngineer' && '🛡️ Verified Engineer'}
                            {d.badgeTier === 'PioneerMaker' && '🚀 Pioneer Maker'}
                            {d.badgeTier === 'Standard' && 'Standard Maker'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{d.email} • {d.phone || 'Chưa cập nhật SĐT'}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleOpenEdit(d)}
                      className="px-3 py-1 bg-slate-100 hover:bg-[#00687A]/10 text-slate-700 hover:text-[#00687A] text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <span className="material-symbols-outlined text-sm">tune</span>
                      {isVi ? 'Cấu Hình' : 'Configure'}
                    </button>
                  </div>

                  {d.bio && (
                    <p className="text-xs text-slate-600 mt-3 line-clamp-2 bg-slate-50 p-2 rounded-lg border border-slate-100 italic">
                      "{d.bio}"
                    </p>
                  )}

                  {/* Royalty & Revenue Stats */}
                  <div className="grid grid-cols-3 gap-2 mt-4 p-3 bg-slate-50/80 rounded-xl border border-slate-100">
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase">{isVi ? 'Trần Royalty' : 'Royalty Cap'}</div>
                      <div className="text-lg font-black text-[#00687A] font-mono">{d.defaultRoyaltyPercent}%</div>
                      <div className="text-[10px] text-slate-500">{d.licenseMode}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase">{isVi ? 'Đã Kiếm Được' : 'Total Royalties'}</div>
                      <div className="text-sm font-bold text-slate-900 font-mono mt-0.5">{formatVnd(d.totalRoyaltiesEarned || 0)}</div>
                      <div className="text-[10px] text-emerald-600 font-medium">{d.totalSalesCount} {isVi ? 'lượt bán' : 'sales'}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase">{isVi ? 'Đang Chờ Rút' : 'Pending Balance'}</div>
                      <div className="text-sm font-bold text-amber-700 font-mono mt-0.5">{formatVnd(d.pendingRoyaltyPayout)}</div>
                      <div className="text-[10px] text-slate-500">{d.activeModelsCount} {isVi ? 'mẫu active' : 'models'}</div>
                    </div>
                  </div>

                  {/* Bank info */}
                  {d.payoutBankInfo && (
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100/60 px-2.5 py-1.5 rounded-lg font-mono">
                      <span className="material-symbols-outlined text-sm text-slate-400">account_balance</span>
                      <span className="truncate">{d.payoutBankInfo}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400">
                    {isVi ? 'Gia nhập:' : 'Joined:'} {new Date(d.joinedDate).toLocaleDateString('vi-VN')}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const nextTier =
                          d.badgeTier === 'Standard'
                            ? 'PioneerMaker'
                            : d.badgeTier === 'PioneerMaker'
                            ? 'VerifiedEngineer'
                            : d.badgeTier === 'VerifiedEngineer'
                            ? 'TopCreator'
                            : 'Standard';
                        setBadgeTier(d.id, nextTier);
                        onShowToast?.(isVi ? `Đã đổi huy hiệu thành ${nextTier}` : `Changed tier to ${nextTier}`);
                      }}
                      className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-bold rounded cursor-pointer"
                    >
                      {isVi ? 'Thăng Hạng Nhanh' : 'Cycle Tier'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: LỆNH RÚT TIỀN (WITHDRAWALS) */}
      {activeTab === 'withdrawals' && (
        <div className="space-y-4">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between text-xs text-slate-600">
            <span>
              {isVi
                ? `Hệ thống có ${withdrawals.length} giao dịch rút tiền bản quyền tác giả.`
                : `Showing ${withdrawals.length} royalty payout transactions.`}
            </span>
            <span className="font-bold text-[#00687A]">
              {isVi ? 'Cổng thanh toán tự động VietQR Napas 24/7' : 'VietQR Napas 24/7 Enabled'}
            </span>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">{isVi ? 'Designer' : 'Designer'}</th>
                    <th className="py-3 px-3">{isVi ? 'Số tiền yêu cầu' : 'Amount'}</th>
                    <th className="py-3 px-3">{isVi ? 'Tài khoản thụ hưởng' : 'Bank Account'}</th>
                    <th className="py-3 px-3">{isVi ? 'Thời gian' : 'Date'}</th>
                    <th className="py-3 px-3">{isVi ? 'Trạng thái' : 'Status'}</th>
                    <th className="py-3 px-4 text-right">{isVi ? 'Thao tác' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {withdrawals.map((w) => (
                    <tr key={w.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <div>{w.designerName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{w.id}</div>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="font-black text-base text-slate-900 font-mono">{formatVnd(w.amountVnd)}</div>
                      </td>
                      <td className="py-3.5 px-3 font-mono text-xs">
                        <div className="font-bold text-slate-800">{w.bankName} - {w.accountNumber}</div>
                        <div className="text-[11px] text-slate-500">{w.accountName}</div>
                      </td>
                      <td className="py-3.5 px-3 text-slate-500">
                        {new Date(w.requestedAt).toLocaleDateString('vi-VN')} {new Date(w.requestedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3.5 px-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            w.status === 'Transferred'
                              ? 'bg-emerald-100 text-emerald-800'
                              : w.status === 'Approved'
                              ? 'bg-blue-100 text-blue-800'
                              : w.status === 'Pending'
                              ? 'bg-amber-100 text-amber-800 animate-pulse'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {w.status === 'Transferred'
                            ? (isVi ? 'Đã Chuyển Tiền' : 'Transferred')
                            : w.status === 'Approved'
                            ? (isVi ? 'Đã Duyệt (Chờ Bank)' : 'Approved')
                            : w.status === 'Pending'
                            ? (isVi ? 'Chờ Duyệt' : 'Pending')
                            : (isVi ? 'Bị Từ Chối' : 'Rejected')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {w.status === 'Pending' && (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                approveWithdrawal(w.id);
                                onShowToast?.(isVi ? 'Đã duyệt yêu cầu rút tiền!' : 'Approved payout request!');
                              }}
                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded cursor-pointer"
                            >
                              {isVi ? 'Duyệt' : 'Approve'}
                            </button>
                            <button
                              onClick={() => {
                                setSelectedWithdrawal(w);
                                setIsRejectModalOpen(true);
                              }}
                              className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold rounded cursor-pointer"
                            >
                              {isVi ? 'Từ Chối' : 'Reject'}
                            </button>
                          </div>
                        )}
                        {w.status === 'Approved' && (
                          <button
                            onClick={() => {
                              setSelectedWithdrawal(w);
                            }}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded cursor-pointer shadow-xs"
                          >
                            {isVi ? 'Tất Toán Chuyển Tiền' : 'Complete Payout'}
                          </button>
                        )}
                        {w.status === 'Transferred' && (
                          <span className="text-[11px] text-emerald-600 font-medium flex items-center justify-end gap-1">
                            <span className="material-symbols-outlined text-sm">check_circle</span>
                            {isVi ? 'Đã Hoàn Tất' : 'Settled'}
                          </span>
                        )}
                        {w.status === 'Rejected' && (
                          <span className="text-[11px] text-rose-600 font-medium">
                            {w.note || (isVi ? 'Đã hủy lệnh' : 'Cancelled')}
                          </span>
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

      {/* TAB 3: THỐNG KÊ DOANH THU THEO DESIGNER */}
      {activeTab === 'analytics' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {designers.map((d) => (
              <div key={d.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={d.avatarUrl}
                      alt={d.displayName}
                      className="w-10 h-10 rounded-full object-cover border border-slate-200"
                    />
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{d.displayName}</h4>
                      <p className="text-[11px] text-slate-500">Mã: {d.id}</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-[#00687A] bg-[#00687A]/10 px-2 py-0.5 rounded">
                    {d.defaultRoyaltyPercent}% Hoa Hồng
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">{isVi ? 'Doanh Thu Tháng Này' : 'Monthly Revenue'}</span>
                    <span className="font-bold text-slate-900 font-mono text-base">{formatVnd(d.monthlyRevenueVnd || 0)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">{isVi ? 'Đơn Hàng Thành Công' : 'Completed Orders'}</span>
                    <span className="font-bold text-slate-900 font-mono text-base">{d.lifetimeCompletedOrders} {isVi ? 'đơn' : 'orders'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: CHỈNH SỬA HUY HIỆU & HOA HỒNG DESIGNER */}
      {editingDesigner && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  {isVi ? 'Cấu Hình Designer & Bản Quyền' : 'Configure Designer & IP'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">{editingDesigner.displayName}</p>
              </div>
              <button
                onClick={() => setEditingDesigner(null)}
                className="text-slate-400 hover:text-slate-600 material-symbols-outlined text-xl cursor-pointer"
              >
                close
              </button>
            </div>

            <form onSubmit={handleSaveDesigner} className="mt-4 space-y-4">
              {/* Badge Tier Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {isVi ? 'Gán Huy Hiệu Badge Tier:' : 'Badge Tier Assignment:'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'TopCreator', label: '👑 Top Creator', desc: 'Nhà sáng tạo xuất sắc' },
                    { id: 'VerifiedEngineer', label: '🛡️ Verified Engineer', desc: 'Kỹ sư cơ khí kiểm duyệt' },
                    { id: 'PioneerMaker', label: '🚀 Pioneer Maker', desc: 'Nghệ nhân tiên phong' },
                    { id: 'Standard', label: 'Tiêu Chuẩn', desc: 'Creator phổ thông' }
                  ].map((tier) => (
                    <button
                      key={tier.id}
                      type="button"
                      onClick={() => setBadgeDraft(tier.id as any)}
                      className={`p-2.5 text-left rounded-lg border text-xs transition-all cursor-pointer ${
                        badgeDraft === tier.id
                          ? 'border-[#00687A] bg-[#00687A]/5 ring-1 ring-[#00687A]'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="font-bold text-slate-900">{tier.label}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{tier.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Royalty Slider & Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    {isVi ? 'Trần Hoa Hồng Bản Quyền (% Royalty):' : 'Royalty Rate (%):'}
                  </label>
                  <span className="font-mono font-black text-sm text-[#00687A]">{royaltyDraft}%</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={25}
                  step={1}
                  value={royaltyDraft}
                  onChange={(e) => setRoyaltyDraft(Number(e.target.value))}
                  className="w-full accent-[#00687A] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
                  <span>Min: 5%</span>
                  <span>Mặc định: 10%</span>
                  <span>Trần max: 25%</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  * Chính sách Inkiri quy định trần hoa hồng vật lý từ 5% đến 20% (hoặc 25% cho Top Creator độc quyền).
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingDesigner(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg cursor-pointer"
                >
                  {isVi ? 'Hủy' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#00687A] text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer"
                >
                  {isVi ? 'Lưu Thay Đổi' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TẤT TOÁN CHUYỂN KHOẢN (PAYOUT MODAL) */}
      {selectedWithdrawal && !isRejectModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">
                {isVi ? 'Xác Nhận Chuyển Tiền Tất Toán' : 'Confirm Payout Transfer'}
              </h3>
              <button
                onClick={() => setSelectedWithdrawal(null)}
                className="text-slate-400 hover:text-slate-600 material-symbols-outlined text-xl cursor-pointer"
              >
                close
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">{isVi ? 'Người nhận:' : 'Recipient:'}</span>
                  <span className="font-bold text-slate-900">{selectedWithdrawal.designerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{isVi ? 'Số tiền:' : 'Amount:'}</span>
                  <span className="font-black text-emerald-700 text-sm font-mono">
                    {formatVnd(selectedWithdrawal.amountVnd)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{isVi ? 'Ngân hàng:' : 'Bank:'}</span>
                  <span className="font-bold text-slate-800">{selectedWithdrawal.bankName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{isVi ? 'Số tài khoản:' : 'Account #:'}</span>
                  <span className="font-mono font-bold text-slate-900">{selectedWithdrawal.accountNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{isVi ? 'Tên chủ TK:' : 'Account Name:'}</span>
                  <span className="font-bold text-slate-900">{selectedWithdrawal.accountName}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isVi ? 'Mã giao dịch ngân hàng / VietQR Reference:' : 'Transaction Reference:'}
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: VCB-98234812"
                  value={txRefInput}
                  onChange={(e) => setTxRefInput(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#00687A]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedWithdrawal(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg cursor-pointer"
                >
                  {isVi ? 'Hủy' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmTransfer(selectedWithdrawal)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer"
                >
                  {isVi ? 'Xác Nhận Đã Chuyển Tiền' : 'Confirm Transfer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: TỪ CHỐI RÚT TIỀN */}
      {isRejectModalOpen && selectedWithdrawal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-rose-700 text-base">
                {isVi ? 'Từ Chối Lệnh Rút Tiền' : 'Reject Withdrawal Request'}
              </h3>
              <button
                onClick={() => setIsRejectModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 material-symbols-outlined text-xl cursor-pointer"
              >
                close
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-xs text-slate-600">
                {isVi
                  ? `Từ chối lệnh rút tiền ${formatVnd(selectedWithdrawal.amountVnd)} của ${selectedWithdrawal.designerName}.`
                  : `Rejecting payout request for ${selectedWithdrawal.designerName}.`}
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isVi ? 'Lý do từ chối (bắt buộc):' : 'Rejection Reason (Required):'}
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder={isVi ? 'Thông tin STK không trùng khớp với CMND/CCCD...' : 'Bank details do not match...'}
                  value={rejectReasonInput}
                  onChange={(e) => setRejectReasonInput(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRejectModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg cursor-pointer"
                >
                  {isVi ? 'Đóng' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReject}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer"
                >
                  {isVi ? 'Xác Nhận Từ Chối' : 'Confirm Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Group2DesignersPanel;
