import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { seedService, dbService } from '../../../backend';

export interface UserAccountRecord {
  id: string;
  displayName: string;
  email: string;
  phone: string;
  role: 'customer' | 'designer' | 'lab' | 'admin';
  tier: 'Standard' | 'Pro Engineer' | 'Enterprise CNC' | 'Master Designer';
  kycStatus: 'verified' | 'pending_review' | 'rejected' | 'unverified';
  status: 'active' | 'suspended';
  createdAt: string;
  lastActive: string;
  totalOrders: number;
  totalSpentOrEarned: number;
  kycDetails?: {
    companyName?: string;
    taxCode?: string;
    idNumber?: string;
    idCardFront?: string;
    idCardBack?: string;
    submittedAt?: string;
    bankName?: string;
    bankAccount?: string;
    notes?: string;
  };
}

const INITIAL_USERS: UserAccountRecord[] = [
  {
    id: 'usr-001',
    displayName: 'Nguyễn Văn Minh',
    email: 'minh.nguyen@fpt.com.vn',
    phone: '0987 654 321',
    role: 'customer',
    tier: 'Pro Engineer',
    kycStatus: 'verified',
    status: 'active',
    createdAt: '12/01/2026',
    lastActive: 'Hôm nay, 09:20',
    totalOrders: 14,
    totalSpentOrEarned: 18450000,
    kycDetails: {
      companyName: 'FPT Software Smart Robotics Lab',
      taxCode: '0101234567',
      idNumber: '001095012345',
      bankName: 'Vietcombank - Chi nhánh Thăng Long',
      bankAccount: '0011004567890',
      submittedAt: '15/01/2026'
    }
  },
  {
    id: 'usr-002',
    displayName: 'Trần Kỹ Thuật (TechLab VN)',
    email: 'techlab.vietnam@gmail.com',
    phone: '0912 345 678',
    role: 'designer',
    tier: 'Master Designer',
    kycStatus: 'verified',
    status: 'active',
    createdAt: '05/02/2026',
    lastActive: 'Hôm qua, 18:45',
    totalOrders: 68,
    totalSpentOrEarned: 45200000,
    kycDetails: {
      companyName: 'TechLab 3D Design Studio',
      taxCode: '0309876543',
      idNumber: '079093005678',
      bankName: 'Techcombank - CN Tân Bình',
      bankAccount: '19034567890123',
      submittedAt: '08/02/2026'
    }
  },
  {
    id: 'usr-003',
    displayName: 'Xưởng In 3D CNC Hòa Lạc',
    email: 'mes.hoalac@vcube.vn',
    phone: '0903 888 999',
    role: 'lab',
    tier: 'Enterprise CNC',
    kycStatus: 'verified',
    status: 'active',
    createdAt: '20/12/2025',
    lastActive: 'Vừa xong',
    totalOrders: 215,
    totalSpentOrEarned: 128600000,
    kycDetails: {
      companyName: 'Công Ty TNHH Chế Tác Thông Minh Hòa Lạc',
      taxCode: '0108924881',
      idNumber: '025091001122',
      bankName: 'MB Bank - CN Hòa Lạc',
      bankAccount: '888899996666',
      submittedAt: '22/12/2025'
    }
  },
  {
    id: 'usr-004',
    displayName: 'Hoàng Long CAD/CAM',
    email: 'long.cad@maker.io',
    phone: '0977 112 233',
    role: 'designer',
    tier: 'Standard',
    kycStatus: 'pending_review',
    status: 'active',
    createdAt: '01/09/2026',
    lastActive: 'Hôm nay, 07:15',
    totalOrders: 3,
    totalSpentOrEarned: 1450000,
    kycDetails: {
      companyName: 'Cá nhân tự do (Freelance Mechanical Engineer)',
      idNumber: '038096008899',
      bankName: 'VPBank - CN Cầu Giấy',
      bankAccount: '15566778899',
      submittedAt: '02/09/2026',
      notes: 'Đăng ký bán bản vẽ STL cơ khí và yêu cầu nâng hạn mức rút tiền bản quyền.'
    }
  },
  {
    id: 'usr-005',
    displayName: 'Công Ty CP Chế Tạo Máy An Phát',
    email: 'purchasing@anphat-machinery.vn',
    phone: '024 3999 8888',
    role: 'customer',
    tier: 'Enterprise CNC',
    kycStatus: 'pending_review',
    status: 'active',
    createdAt: '28/08/2026',
    lastActive: '2 ngày trước',
    totalOrders: 5,
    totalSpentOrEarned: 32000000,
    kycDetails: {
      companyName: 'Công Ty Cổ Phần Chế Tạo Máy An Phát',
      taxCode: '0106677889',
      bankName: 'BIDV - CN Hà Nội',
      bankAccount: '21110008889999',
      submittedAt: '30/08/2026',
      notes: 'Yêu cầu xuất hóa đơn GTGT điện tử tự động và mở công nợ 30 ngày (B2B Net 30).'
    }
  },
  {
    id: 'usr-006',
    displayName: 'Phạm Hồng Phong',
    email: 'hongphong.badcopy@bot.net',
    phone: '0933 000 111',
    role: 'customer',
    tier: 'Standard',
    kycStatus: 'rejected',
    status: 'suspended',
    createdAt: '15/08/2026',
    lastActive: '10 ngày trước',
    totalOrders: 1,
    totalSpentOrEarned: 89000,
    kycDetails: {
      idNumber: '000000000000',
      submittedAt: '16/08/2026',
      notes: 'Hồ sơ CCCD không hợp lệ, phát hiện hành vi tải file lậu vi phạm bản quyền DMCA.'
    }
  },
  {
    id: 'usr-007',
    displayName: 'Chí Thành (Forge Master Admin)',
    email: 'admin@vcube.vn',
    phone: '1900 6833',
    role: 'admin',
    tier: 'Enterprise CNC',
    kycStatus: 'verified',
    status: 'active',
    createdAt: '01/01/2025',
    lastActive: 'Đang trực tuyến',
    totalOrders: 0,
    totalSpentOrEarned: 0,
    kycDetails: {
      companyName: 'VCUBE Platform Operations Core',
      taxCode: '0108924881',
      idNumber: '001099009999',
      bankName: 'Vietcombank',
      bankAccount: '999999999999',
      submittedAt: '01/01/2025'
    }
  }
];

interface AdminUsersPanelProps {
  onShowToast: (message: string) => void;
  initialRoleFilter?: string;
  onNavigateSection?: (section: any) => void;
}

export const AdminUsersPanel: React.FC<AdminUsersPanelProps> = ({
  onShowToast,
  initialRoleFilter = 'all',
  onNavigateSection,
}) => {
  const { language } = useLanguage();
  const isVi = language === 'vi';

  const [users, setUsers] = useState<UserAccountRecord[]>(INITIAL_USERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>(initialRoleFilter);
  const [kycFilter, setKycFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (initialRoleFilter) {
      setRoleFilter(initialRoleFilter);
    }
  }, [initialRoleFilter]);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('vcube_last_cloud_sync') : null;
  });

  // Modal State for KYC Review
  const [reviewingUser, setReviewingUser] = useState<UserAccountRecord | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // 1-Click Database Cloud Sync
  const handleSyncDatabase = async () => {
    setIsSyncing(true);
    try {
      const result = await seedService.seedAllToSupabase();
      if (result.success) {
        onShowToast(`Đồng bộ Supabase thành công: ${result.counts.products} SP, ${result.counts.orders} đơn hàng, ${result.counts.user_profiles} người dùng, ${result.counts.materials} vật liệu!`);
        setLastSyncTime(result.timestamp);
        
        // Refresh users from DB
        const freshUsers = await dbService.getUsers();
        if (freshUsers && freshUsers.length > 0) {
          const mapped: UserAccountRecord[] = freshUsers.map((u) => {
            const existing = users.find(x => x.id === u.uid || x.email === u.email);
            return {
              id: u.uid,
              displayName: u.displayName,
              email: u.email,
              phone: u.phone,
              role: (u.role as any) || 'customer',
              tier: existing?.tier || (u.role === 'customer' ? 'Pro Engineer' : u.role === 'designer' ? 'Master Designer' : u.role === 'lab' ? 'Enterprise CNC' : 'Standard'),
              kycStatus: (u.kycStatus as any) || 'verified',
              status: (u.accountStatus as any) || 'active',
              createdAt: u.createdAt ? new Date(u.createdAt).toLocaleDateString('vi-VN') : '12/01/2026',
              lastActive: 'Vừa xong',
              totalOrders: u.totalOrders || 0,
              totalSpentOrEarned: u.totalSpent || 0,
              kycDetails: existing?.kycDetails,
            };
          });
          setUsers(mapped);
        }
      } else {
        onShowToast(`Đồng bộ hoàn tất với lưu ý: ${result.errors.join(', ')}`);
      }
    } catch (err: any) {
      onShowToast(`Lỗi đồng bộ Supabase: ${err?.message || 'Không thể kết nối'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Metrics calculation
  const totalUsers = users.length;
  const totalCustomers = users.filter(u => u.role === 'customer').length;
  const totalDesigners = users.filter(u => u.role === 'designer').length;
  const totalLabs = users.filter(u => u.role === 'lab').length;
  const pendingKycCount = users.filter(u => u.kycStatus === 'pending_review').length;
  const suspendedCount = users.filter(u => u.status === 'suspended').length;

  const filteredUsers = users.filter((u) => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (kycFilter !== 'all' && u.kycStatus !== kycFilter) return false;
    if (statusFilter !== 'all' && u.status !== statusFilter) return false;

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchName = u.displayName.toLowerCase().includes(q);
      const matchEmail = u.email.toLowerCase().includes(q);
      const matchPhone = u.phone.includes(q);
      const matchCompany = u.kycDetails?.companyName?.toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchPhone && !matchCompany) return false;
    }
    return true;
  });

  const handleToggleStatus = (userId: string) => {
    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        const newStatus = u.status === 'active' ? 'suspended' : 'active';
        onShowToast(newStatus === 'active' ? `Đã mở khóa tài khoản ${u.displayName}` : `Đã tạm ngưng tài khoản ${u.displayName}`);
        return { ...u, status: newStatus };
      }
      return u;
    }));
  };

  const handleChangeRole = (userId: string, newRole: UserAccountRecord['role']) => {
    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        onShowToast(`Đã thay đổi vai trò của ${u.displayName} thành ${newRole.toUpperCase()}`);
        return { ...u, role: newRole };
      }
      return u;
    }));
  };

  const handleApproveKyc = (user: UserAccountRecord) => {
    setUsers(prev => prev.map(u => {
      if (u.id === user.id) {
        return { ...u, kycStatus: 'verified' };
      }
      return u;
    }));
    dbService.updateUserKyc(user.id, 'verified').catch(console.warn);
    setReviewingUser(null);
    onShowToast(`Đã phê duyệt hồ sơ định danh KYC cho ${user.displayName}`);
  };

  const handleRejectKyc = (user: UserAccountRecord) => {
    const reason = rejectionReason || 'Hồ sơ thông tin định danh chưa hợp lệ.';
    setUsers(prev => prev.map(u => {
      if (u.id === user.id) {
        return {
          ...u,
          kycStatus: 'rejected',
          kycDetails: { ...u.kycDetails, notes: reason }
        };
      }
      return u;
    }));
    dbService.updateUserKyc(user.id, 'rejected', reason).catch(console.warn);
    setReviewingUser(null);
    setRejectionReason('');
    onShowToast(`Đã từ chối hồ sơ KYC của ${user.displayName}`);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* 1. Header Title & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#CBD5E1]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[10px] uppercase tracking-widest text-[#00687A] font-bold px-2 py-0.5 bg-teal-50 rounded border border-teal-200">
              IDENTITY & GOVERNANCE // VCUBE MULTI-STAKEHOLDER
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#091426] tracking-tight">
            Quản Trị Người Dùng & Hồ Sơ Định Danh (KYC)
          </h2>
          <p className="text-xs text-[#545F73] mt-0.5">
            Quản lý 4 nhóm tác nhân: Khách Hàng (B2B/B2C), Tác Giả 3D (Designers), Xưởng Gia Công (MES Hubs) và Ban Quản Trị.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono">
          <button
            onClick={handleSyncDatabase}
            disabled={isSyncing}
            className="px-3 py-2 bg-white border border-[#CBD5E1] hover:bg-slate-50 text-[#091426] text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all disabled:opacity-60"
            title="Đồng bộ toàn bộ bảng dữ liệu Mock Data lên Supabase Database"
          >
            <span className={`material-symbols-outlined text-sm ${isSyncing ? 'animate-spin text-[#00687A]' : 'text-slate-600'}`}>sync</span>
            <span>{isSyncing ? 'Đang Đồng Bộ DB...' : 'Đồng Bộ DB'}</span>
          </button>
        </div>
      </div>

      {/* 2. Key Metrics Telemetry Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-[#CBD5E1] shadow-2xs space-y-1">
          <span className="text-[10px] font-mono uppercase text-[#64748B] block">Tổng Tài Khoản</span>
          <p className="text-xl font-extrabold text-[#091426] font-mono">{totalUsers}</p>
          <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            {lastSyncTime ? `Synced ${new Date(lastSyncTime).toLocaleTimeString('vi-VN')}` : '100% cloud sync'}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-[#CBD5E1] shadow-2xs space-y-1">
          <span className="text-[10px] font-mono uppercase text-[#64748B] block">Khách Đặt In (Buyers)</span>
          <p className="text-xl font-extrabold text-[#00687A] font-mono">{totalCustomers}</p>
          <span className="text-[10px] text-[#64748B]">B2B & B2C</span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-[#CBD5E1] shadow-2xs space-y-1">
          <span className="text-[10px] font-mono uppercase text-[#64748B] block">Tác Giả (Creators)</span>
          <p className="text-xl font-extrabold text-amber-700 font-mono">{totalDesigners}</p>
          <span className="text-[10px] text-amber-700 font-bold">Bán bản quyền STL</span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-[#CBD5E1] shadow-2xs space-y-1">
          <span className="text-[10px] font-mono uppercase text-[#64748B] block">Xưởng In (MES Hubs)</span>
          <p className="text-xl font-extrabold text-indigo-700 font-mono">{totalLabs}</p>
          <span className="text-[10px] text-indigo-700 font-bold">Trang bị Bambu/SLA</span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-amber-300 bg-amber-50/40 shadow-2xs space-y-1">
          <span className="text-[10px] font-mono uppercase text-amber-800 block font-bold">Chờ Duyệt KYC</span>
          <p className="text-xl font-extrabold text-amber-700 font-mono">{pendingKycCount}</p>
          <span className="text-[10px] text-amber-700 font-bold animate-pulse">● Cần xem xét</span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-rose-200 bg-rose-50/30 shadow-2xs space-y-1">
          <span className="text-[10px] font-mono uppercase text-rose-700 block">Tạm Ngưng (Khóa)</span>
          <p className="text-xl font-extrabold text-rose-700 font-mono">{suspendedCount}</p>
          <span className="text-[10px] text-rose-600">Vi phạm / Rủi ro</span>
        </div>
      </div>

      {/* Quick Role Sub-Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {[
          { id: 'all', label: isVi ? 'Tất Cả' : 'All', count: totalUsers, icon: 'group' },
          { id: 'customer', label: isVi ? 'Khách Hàng' : 'Customers', count: totalCustomers, icon: 'person' },
          { id: 'designer', label: isVi ? 'Nhà Thiết Kế (Designers)' : '3D Designers', count: totalDesigners, icon: 'draw' },
          { id: 'lab', label: isVi ? 'Xưởng In (MES Labs)' : 'MES Labs', count: totalLabs, icon: 'factory' },
          { id: 'admin', label: isVi ? 'Ban Quản Trị' : 'Admins', count: users.filter(u => u.role === 'admin').length, icon: 'shield_person' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setRoleFilter(tab.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              roleFilter === tab.id
                ? 'bg-[#091426] text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-[#CBD5E1]'
            }`}
          >
            <span className="material-symbols-outlined text-sm">{tab.icon}</span>
            <span>{tab.label}</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              roleFilter === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#CBD5E1] shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="Tìm theo tên, email, sđt, doanh nghiệp..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-[#CBD5E1] rounded-xl text-xs text-[#091426] placeholder-[#94A3B8] focus:outline-none focus:border-[#00687A]"
          />
          <span className="material-symbols-outlined absolute left-2.5 top-2 text-[#64748B] text-base">
            search
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto font-mono">
          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="p-2 bg-slate-50 border border-[#CBD5E1] rounded-xl text-xs text-[#091426] focus:outline-none focus:border-[#00687A]"
          >
            <option value="all">Tất cả vai trò</option>
            <option value="customer">Khách Hàng (Customer)</option>
            <option value="designer">Tác Giả 3D (Designer)</option>
            <option value="lab">Xưởng In Liên Kết (MES Lab)</option>
            <option value="admin">Quản Trị Viên (Admin)</option>
          </select>

          {/* KYC Filter */}
          <select
            value={kycFilter}
            onChange={(e) => setKycFilter(e.target.value)}
            className="p-2 bg-slate-50 border border-[#CBD5E1] rounded-xl text-xs text-[#091426] focus:outline-none focus:border-[#00687A]"
          >
            <option value="all">Tất cả trạng thái KYC</option>
            <option value="verified">Đã xác minh (Verified)</option>
            <option value="pending_review">Chờ duyệt (Pending Review)</option>
            <option value="rejected">Bị từ chối (Rejected)</option>
            <option value="unverified">Chưa gửi hồ sơ</option>
          </select>

          {/* Account Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="p-2 bg-slate-50 border border-[#CBD5E1] rounded-xl text-xs text-[#091426] focus:outline-none focus:border-[#00687A]"
          >
            <option value="all">Tất cả trạng thái TK</option>
            <option value="active">Đang hoạt động (Active)</option>
            <option value="suspended">Tạm khóa (Suspended)</option>
          </select>
        </div>
      </div>

      {/* 4. Users Table */}
      <div className="bg-white rounded-2xl border border-[#CBD5E1] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-[#CBD5E1] text-[10px] font-mono font-bold uppercase tracking-wider text-[#64748B]">
              <tr>
                <th className="p-3.5">Người Dùng / Pháp Nhân</th>
                <th className="p-3.5">Vai Trò Nền Tảng</th>
                <th className="p-3.5">Hồ Sơ KYC</th>
                <th className="p-3.5">Hoạt Động / Đơn Hàng</th>
                <th className="p-3.5">Doanh Số / Chi Tiêu</th>
                <th className="p-3.5">Trạng Thái TK</th>
                <th className="p-3.5 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-[#64748B]">
                    Không tìm thấy người dùng nào phù hợp với điều kiện tìm kiếm.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  return (
                    <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Name & Contact */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-2xs ${
                            user.role === 'admin' ? 'bg-purple-900' :
                            user.role === 'designer' ? 'bg-amber-700' :
                            user.role === 'lab' ? 'bg-indigo-700' : 'bg-[#00687A]'
                          }`}>
                            {user.displayName.charAt(0).toUpperCase()}
                          </div>
                          <div className="truncate max-w-[200px]">
                            <p className="font-bold text-sm text-[#091426] truncate">
                              {user.displayName}
                            </p>
                            <p className="text-[11px] font-mono text-[#64748B] truncate">
                              {user.email}
                            </p>
                            {user.kycDetails?.companyName && (
                              <p className="text-[10px] text-[#00687A] font-medium truncate">
                                {user.kycDetails.companyName}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Role & Role Selector */}
                      <td className="p-3.5 font-mono">
                        <select
                          value={user.role}
                          onChange={(e) => handleChangeRole(user.id, e.target.value as any)}
                          className="px-2 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-[#091426] focus:outline-none cursor-pointer"
                        >
                          <option value="customer">CUSTOMER</option>
                          <option value="designer">CREATOR</option>
                          <option value="lab">MES LAB</option>
                          <option value="admin">FORGE ADMIN</option>
                        </select>
                        <span className="block text-[10px] text-[#64748B] mt-0.5">
                          Tier: {user.tier}
                        </span>
                      </td>

                      {/* KYC Status */}
                      <td className="p-3.5 font-mono">
                        {user.kycStatus === 'verified' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            ĐÃ DUYỆT KYC
                          </span>
                        )}
                        {user.kycStatus === 'pending_review' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 text-[10px] font-bold animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            CHỜ DUYỆT
                          </span>
                        )}
                        {user.kycStatus === 'rejected' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                            BỊ TỪ CHỐI
                          </span>
                        )}
                        {user.kycStatus === 'unverified' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px]">
                            CHƯA NỘP
                          </span>
                        )}
                      </td>

                      {/* Activity */}
                      <td className="p-3.5 text-[11px]">
                        <p className="font-mono font-bold text-[#091426]">{user.totalOrders} đơn / dự án</p>
                        <p className="text-[#64748B] text-[10px]">Gần nhất: {user.lastActive}</p>
                      </td>

                      {/* Spend / Earned */}
                      <td className="p-3.5 font-mono font-bold text-[#091426]">
                        {user.totalSpentOrEarned.toLocaleString('vi-VN')} ₫
                      </td>

                      {/* Status Toggle */}
                      <td className="p-3.5">
                        <button
                          onClick={() => handleToggleStatus(user.id)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition-all cursor-pointer ${
                            user.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                          }`}
                        >
                          {user.status === 'active' ? 'HOẠT ĐỘNG' : 'ĐANG KHÓA'}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right font-mono">
                        <button
                          onClick={() => setReviewingUser(user)}
                          className="px-3 py-1.5 bg-[#00687A]/10 hover:bg-[#00687A]/20 text-[#00687A] text-xs font-bold rounded-lg border border-[#00687A]/30 transition-colors cursor-pointer inline-flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-sm">badge</span>
                          <span>Hồ Sơ KYC</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. KYC Review Interactive Modal */}
      {reviewingUser && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-[#CBD5E1] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-[#091426] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#57DFFE]">verified_user</span>
                <div>
                  <h3 className="font-bold text-sm">THẨM ĐỊNH HỒ SƠ ĐỊNH DANH (KYC AUDIT)</h3>
                  <p className="text-[10px] text-[#94A3B8] font-mono">
                    Người dùng: {reviewingUser.displayName} ({reviewingUser.id})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setReviewingUser(null)}
                className="text-slate-400 hover:text-white p-1 rounded cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-[#CBD5E1]">
                <div>
                  <span className="text-[10px] font-mono text-[#64748B] block uppercase">Tên Cá Nhân / Kỹ Sư:</span>
                  <span className="font-bold text-sm text-[#091426]">{reviewingUser.displayName}</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-[#64748B] block uppercase">Số Điện Thoại:</span>
                  <span className="font-mono font-bold text-[#091426]">{reviewingUser.phone}</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-[#64748B] block uppercase">Email Hệ Thống:</span>
                  <span className="font-mono text-[#00687A]">{reviewingUser.email}</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-[#64748B] block uppercase">Vai Trò Đăng Ký:</span>
                  <span className="font-mono font-bold text-indigo-700 uppercase">{reviewingUser.role}</span>
                </div>
              </div>

              {/* KYC Form Details */}
              <div className="space-y-2 border-t border-[#CBD5E1] pt-3">
                <h4 className="font-bold text-xs text-[#091426] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-[#00687A]">corporate_fare</span>
                  Thông Tin Pháp Lý & Doanh Nghiệp
                </h4>

                <div className="space-y-2">
                  <div className="p-2.5 bg-white border border-[#CBD5E1] rounded-xl space-y-1">
                    <p className="text-[#64748B] text-[10px] font-mono uppercase">Tên Công Ty / Đơn Vị:</p>
                    <p className="font-bold text-[#091426]">{reviewingUser.kycDetails?.companyName || 'Chưa cập nhật'}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 bg-white border border-[#CBD5E1] rounded-xl space-y-1">
                      <p className="text-[#64748B] text-[10px] font-mono uppercase">Mã Số Thuế (MST):</p>
                      <p className="font-mono font-bold text-[#091426]">{reviewingUser.kycDetails?.taxCode || 'N/A'}</p>
                    </div>
                    <div className="p-2.5 bg-white border border-[#CBD5E1] rounded-xl space-y-1">
                      <p className="text-[#64748B] text-[10px] font-mono uppercase">Số CCCD / Hộ Chiếu:</p>
                      <p className="font-mono font-bold text-[#091426]">{reviewingUser.kycDetails?.idNumber || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="p-2.5 bg-white border border-[#CBD5E1] rounded-xl space-y-1">
                    <p className="text-[#64748B] text-[10px] font-mono uppercase">Tài Khoản Ngân Hàng Nhận Tiền Bản Quyền / Chiết Khấu:</p>
                    <p className="font-mono font-bold text-[#091426]">
                      {reviewingUser.kycDetails?.bankName ? `${reviewingUser.kycDetails.bankName} - ${reviewingUser.kycDetails.bankAccount}` : 'Chưa thiết lập'}
                    </p>
                  </div>

                  {reviewingUser.kycDetails?.notes && (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl space-y-1 text-amber-900">
                      <p className="text-[10px] font-mono uppercase font-bold">Ghi chú từ người dùng:</p>
                      <p>{reviewingUser.kycDetails.notes}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Rejection reason box if rejecting */}
              <div>
                <label className="block text-[11px] font-bold text-[#091426] mb-1">
                  Lý do từ chối (nếu từ chối hồ sơ):
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Hình ảnh CCCD bị mờ, Mã số thuế tra cứu không khớp tên doanh nghiệp..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-[#CBD5E1] rounded-xl text-xs text-[#091426] focus:outline-none focus:border-[#00687A]"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 border-t border-[#CBD5E1] flex items-center justify-between shrink-0 font-mono">
              <button
                type="button"
                onClick={() => setReviewingUser(null)}
                className="px-4 py-2 border border-[#CBD5E1] text-[#64748B] hover:text-[#091426] font-bold rounded-xl cursor-pointer"
              >
                Đóng
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleRejectKyc(reviewingUser)}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl cursor-pointer shadow-xs"
                >
                  Từ Chối KYC
                </button>
                <button
                  type="button"
                  onClick={() => handleApproveKyc(reviewingUser)}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl cursor-pointer shadow-xs"
                >
                  Duyệt Xác Minh ✓
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

