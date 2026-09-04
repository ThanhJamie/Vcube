import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { UserRole } from '../../../types';

interface UserAvatarMenuProps {
  onNavigate: (screen: string, data?: any) => void;
  onOpenCart?: () => void;
  onShowToast?: (msg: string) => void;
}

export const UserAvatarMenu: React.FC<UserAvatarMenuProps> = ({
  onNavigate,
  onOpenCart,
  onShowToast,
}) => {
  const { user, profile, role, switchDemoRole, logout } = useAuth();
  const { language } = useLanguage();
  const isVi = language === 'vi';
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'main' | 'roles' | 'stats'>('main');
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 220);
  };

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  const handleSelectRole = async (targetRole: UserRole) => {
    await switchDemoRole(targetRole);
    if (onShowToast) {
      const roleName = targetRole === 'admin' 
        ? (isVi ? 'Super Admin (ForgeControl)' : 'Super Admin (ForgeControl)')
        : targetRole === 'designer' 
        ? (isVi ? 'Tác Giả 3D (Creator)' : '3D Creator / Designer')
        : targetRole === 'lab' 
        ? (isVi ? 'Xưởng In 3D (MES Hub)' : '3D Print Lab (MES Hub)')
        : (isVi ? 'Khách Hàng (Customer)' : 'Customer');
      onShowToast(isVi ? `Đã chuyển sang góc nhìn: ${roleName}` : `Switched role perspective to: ${roleName}`);
    }
  };

  const handleItemClick = (action: () => void) => {
    setIsOpen(false);
    action();
  };

  const handleNavigateRoute = (path: string, legacyScreen?: string) => {
    setIsOpen(false);
    navigate(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (onNavigate) {
      onNavigate(legacyScreen || path);
    }
  };

  // Role visual aesthetics
  const getRoleTheme = (r: UserRole) => {
    switch (r) {
      case 'admin':
        return {
          title: isVi ? 'Ban Quản Trị' : 'Super Admin',
          badgeText: 'FORGE ADMIN',
          badgeClass: 'bg-purple-500/15 text-purple-700 border-purple-400/40',
          bgGradient: 'from-purple-900 to-[#091426]',
          borderAccent: 'border-purple-500/50',
          avatarBg: 'bg-purple-800 text-white',
          glow: 'shadow-purple-500/20'
        };
      case 'designer':
        return {
          title: isVi ? 'Tác Giả 3D' : 'Creator & CAD',
          badgeText: 'DESIGNER PRO',
          badgeClass: 'bg-amber-500/15 text-amber-800 border-amber-400/40',
          bgGradient: 'from-amber-900 to-[#091426]',
          borderAccent: 'border-amber-500/50',
          avatarBg: 'bg-amber-700 text-white',
          glow: 'shadow-amber-500/20'
        };
      case 'lab':
        return {
          title: isVi ? 'Xưởng In MES' : 'MES Hub Lab',
          badgeText: 'MES HUB CNC',
          badgeClass: 'bg-emerald-500/15 text-emerald-800 border-emerald-400/40',
          bgGradient: 'from-emerald-950 to-[#091426]',
          borderAccent: 'border-emerald-500/50',
          avatarBg: 'bg-emerald-700 text-white',
          glow: 'shadow-emerald-500/20'
        };
      default:
        return {
          title: isVi ? 'Khách Đặt In' : 'Pro Engineer',
          badgeText: 'CUSTOMER',
          badgeClass: 'bg-teal-500/15 text-[#00687A] border-teal-400/40',
          bgGradient: 'from-[#004e5b] to-[#091426]',
          borderAccent: 'border-teal-500/50',
          avatarBg: 'bg-[#00687A] text-white',
          glow: 'shadow-cyan-500/20'
        };
    }
  };

  const theme = getRoleTheme(role);
  const displayName = profile?.displayName || user?.email?.split('@')[0] || (isVi ? 'Kỹ sư VCUBE' : 'VCUBE Member');
  const initialLetter = displayName.charAt(0).toUpperCase();

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 1. Avatar Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 p-1 rounded-xl transition-all border cursor-pointer focus:outline-none shadow-2xs ${
          isOpen ? `border-[#00687A] ring-2 ring-cyan-500/20` : 'border-[#CBD5E1] hover:border-[#00687A]'
        }`}
        aria-label={isVi ? "Tài khoản người dùng" : "User account"}
      >
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-xs shadow-xs relative ${theme.avatarBg}`}>
          {initialLetter}
          {/* Online status indicator */}
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white animate-pulse" />
        </div>
        <span className="material-symbols-outlined text-xs text-[#545F73]">
          {isOpen ? 'arrow_drop_up' : 'arrow_drop_down'}
        </span>
      </button>

      {/* 2. Glassmorphism Role-Tailored Popover */}
      {isOpen && (
        <div
          className={`absolute right-0 mt-2 w-[340px] sm:w-[390px] bg-white/95 backdrop-blur-xl border border-slate-200/90 shadow-2xl rounded-3xl z-50 text-xs overflow-hidden transition-all animate-in fade-in zoom-in-95 duration-150 font-sans`}
        >
          {/* A. Identity Header Banner with Role Gradient */}
          <div className={`p-4 bg-gradient-to-br ${theme.bgGradient} text-white relative overflow-hidden`}>
            {/* Tech grid texture overlay */}
            <div
              className="absolute inset-0 opacity-10 pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(#57DFFE 1px, transparent 1px)',
                backgroundSize: '16px 16px',
              }}
            />

            <div className="flex items-center justify-between mb-2 relative z-10">
              <span className="font-mono text-[9px] uppercase tracking-widest text-[#57DFFE] font-bold">
                {isVi ? 'HỒ SƠ ĐỊNH DANH // VCUBE NETWORK' : 'IDENTITY & ACCESS // VCUBE NETWORK'}
              </span>
              <div className="flex items-center gap-1.5">
                <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border uppercase ${theme.badgeClass} bg-white/90`}>
                  {theme.badgeText}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 relative z-10">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-mono font-black text-base shadow-inner ${theme.avatarBg} border border-white/20`}>
                {initialLetter}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="font-bold text-sm text-white truncate">
                    {displayName}
                  </p>
                  <span className="material-symbols-outlined text-emerald-400 text-sm shrink-0" title={isVi ? "Đã xác thực danh tính" : "Identity verified"}>
                    verified
                  </span>
                </div>
                <p className="text-[11px] font-mono text-slate-300 truncate">
                  {profile?.email || user?.email || 'user@vcube.vn'}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-mono text-[#57DFFE] bg-white/10 px-1.5 py-0.2 rounded border border-white/10">
                    {profile?.company || (role === 'admin' ? 'VCUBE Core HQ' : isVi ? 'Thành viên Kỹ thuật' : 'Technical Member')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* B. Dynamic Role-Tailored Content Tabs */}
          <div className="max-h-[65vh] overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">

            {/* --- ROLE 1: CUSTOMER (Khách Đặt In) --- */}
            {role === 'customer' && (
              <div className="space-y-1">
                <div className="px-2.5 py-1 flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                    {isVi ? 'ĐƠN HÀNG & TIẾN ĐỘ SẢN XUẤT' : 'ORDERS & FABRICATION PROGRESS'}
                  </span>
                  <span className="text-[9px] font-mono text-[#00687A] font-bold bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                    {isVi ? '8 Nấc Chuẩn ISO' : '8 ISO Stages'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleNavigateRoute('/orders', 'my_orders')}
                  className="w-full text-left p-2.5 hover:bg-slate-50 rounded-2xl flex items-center gap-3 transition-colors cursor-pointer group"
                >
                  <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <span className="material-symbols-outlined text-lg">receipt_long</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-xs text-[#091426]">
                        {isVi ? 'Đơn Hàng Của Tôi' : 'My Orders'}
                      </p>
                      <span className="text-[10px] font-mono text-emerald-600 font-bold">
                        {isVi ? 'Đang in lớp 42%' : 'Printing layer 42%'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">
                      {isVi ? 'Theo dõi camera & mã vận đơn Viettel Post' : 'Live camera tracking & carrier tracking'}
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleNavigateRoute('/quote', 'tool_3d')}
                  className="w-full text-left p-2.5 hover:bg-slate-50 rounded-2xl flex items-center gap-3 transition-colors cursor-pointer group"
                >
                  <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 text-[#00687A] flex items-center justify-center shrink-0 group-hover:bg-[#00687A] group-hover:text-white transition-colors">
                    <span className="material-symbols-outlined text-lg">view_in_ar</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-xs text-[#091426]">
                      {isVi ? '3D CAD Mesh Inspector // Báo Giá' : '3D CAD Mesh Inspector // Instant Quote'}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {isVi ? 'Kiểm định watertight, cắt lớp & báo giá tức thì' : 'Watertight check, slicing analysis & instant quote'}
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleNavigateRoute('/personalize', 'personalize')}
                  className="w-full text-left p-2.5 hover:bg-slate-50 rounded-2xl flex items-center gap-3 transition-colors cursor-pointer group"
                >
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <span className="material-symbols-outlined text-lg">tune</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-xs text-[#091426]">
                      {isVi ? 'Tùy Biến Cá Nhân Hóa (Customizer)' : 'Product Customizer & Personalization'}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {isVi ? 'Khắc laser, màu sắc AMS & phụ kiện đồ gá' : 'Laser engraving, AMS colors & fixtures'}
                    </p>
                  </div>
                </button>
              </div>
            )}

            {/* --- ROLE 2: DESIGNER (Tác Giả 3D) --- */}
            {role === 'designer' && (
              <div className="space-y-1">
                <div className="px-2.5 py-1 flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                    {isVi ? 'CREATOR STUDIO & DOANH THU' : 'CREATOR STUDIO & REVENUE'}
                  </span>
                  <span className="text-[9px] font-mono text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                    {isVi ? 'Bản Quyền STL' : 'STL Royalties'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleNavigateRoute('/designer', 'designer')}
                  className="w-full text-left p-2.5 hover:bg-slate-50 rounded-2xl flex items-center gap-3 transition-colors cursor-pointer group"
                >
                  <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                    <span className="material-symbols-outlined text-lg">palette</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-xs text-[#091426]">
                        {isVi ? 'Bảng Điều Khiển Tác Giả' : 'Creator Dashboard'}
                      </p>
                      <span className="text-[10px] font-mono text-amber-700 font-bold">
                        {isVi ? '14 Mẫu Đã Đăng' : '14 Published'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">
                      {isVi ? 'Quản lý catalog bản vẽ, upload STL/3MF' : 'Manage CAD catalog, upload STL/3MF'}
                    </p>
                  </div>
                </button>

                <div className="bg-amber-50/60 p-3 rounded-2xl border border-amber-200 flex items-center justify-between font-mono">
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase">
                      {isVi ? 'Thu Nhập Tháng Này' : 'Earnings This Month'}
                    </span>
                    <span className="text-base font-extrabold text-amber-900">45.200.000 đ</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleItemClick(() => {
                      if (onShowToast) onShowToast(isVi ? 'Yêu cầu rút tiền hoa hồng đang được xử lý qua Techcombank' : 'Payout request is being processed via Techcombank');
                    })}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[10px] font-bold cursor-pointer transition-colors shadow-2xs"
                  >
                    {isVi ? 'Rút Tiền' : 'Withdraw'}
                  </button>
                </div>
              </div>
            )}

            {/* --- ROLE 3: LAB (Xưởng In 3D MES Hub) --- */}
            {role === 'lab' && (
              <div className="space-y-1">
                <div className="px-2.5 py-1 flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                    {isVi ? 'MES HUB & ĐỘI MÁY IN 3D' : 'MES HUB & PRINT FLEET'}
                  </span>
                  <span className="text-[9px] font-mono text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    {isVi ? 'Hòa Lạc Hub' : 'Hoa Lac Hub'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleNavigateRoute('/admin/queue')}
                  className="w-full text-left p-2.5 hover:bg-slate-50 rounded-2xl flex items-center gap-3 transition-colors cursor-pointer group"
                >
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <span className="material-symbols-outlined text-lg">precision_manufacturing</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-xs text-[#091426]">
                        {isVi ? 'Hàng Đợi Chế Tác (Queue)' : 'Fabrication Queue'}
                      </p>
                      <span className="text-[10px] font-mono text-emerald-600 font-bold">
                        {isVi ? '12 Lệnh Chờ' : '12 Pending'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">
                      {isVi ? 'Nhận phôi in, chia lệnh cắt lớp Bambu/SLA' : 'Receive print jobs, dispatch Bambu/SLA slicing'}
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleNavigateRoute('/admin/machines')}
                  className="w-full text-left p-2.5 hover:bg-slate-50 rounded-2xl flex items-center gap-3 transition-colors cursor-pointer group"
                >
                  <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 text-[#00687A] flex items-center justify-center shrink-0 group-hover:bg-[#00687A] group-hover:text-white transition-colors">
                    <span className="material-symbols-outlined text-lg">print</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-xs text-[#091426]">
                      {isVi ? 'Cụm Máy In Bambu Lab X1C / P1S' : 'Bambu Lab X1C / P1S Fleet'}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {isVi ? 'Giám sát nhiệt độ buồng, bàn in & cuộn nhựa' : 'Monitor chamber temp, bed & filament spools'}
                    </p>
                  </div>
                </button>
              </div>
            )}

            {/* --- ROLE 4: ADMIN (Quản Trị Hệ Thống) --- */}
            {role === 'admin' && (
              <div className="space-y-1">
                <div className="px-2.5 py-1 flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                    {isVi ? 'QUẢN TRỊ FORGECONTROL' : 'FORGECONTROL ADMIN'}
                  </span>
                  <span className="text-[9px] font-mono text-purple-700 font-bold bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                    {isVi ? 'Toàn Quyền' : 'Full Access'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleNavigateRoute('/admin/overview')}
                  className="w-full text-left p-2.5 hover:bg-slate-50 rounded-2xl flex items-center gap-3 transition-colors cursor-pointer group"
                >
                  <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center shrink-0 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                    <span className="material-symbols-outlined text-lg">dashboard</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-xs text-[#091426]">
                      {isVi ? 'Bảng Điều Khiển Trung Tâm' : 'Central Admin Dashboard'}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {isVi ? 'Quản lý tổng quan doanh thu, đơn hàng & máy' : 'Overview of revenue, orders & printer fleet'}
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleNavigateRoute('/admin/users')}
                  className="w-full text-left p-2.5 hover:bg-slate-50 rounded-2xl flex items-center gap-3 transition-colors cursor-pointer group"
                >
                  <div className="w-9 h-9 rounded-xl bg-cyan-50 border border-cyan-200 text-[#00687A] flex items-center justify-center shrink-0 group-hover:bg-[#00687A] group-hover:text-white transition-colors">
                    <span className="material-symbols-outlined text-lg">manage_accounts</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-xs text-[#091426]">
                        {isVi ? 'Quản Trị Người Dùng & KYC' : 'User Management & KYC'}
                      </p>
                      <span className="text-[10px] font-mono text-amber-700 font-bold bg-amber-100 px-1.5 py-0.2 rounded">
                        {isVi ? '1 Chờ Duyệt' : '1 Pending'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">
                      {isVi ? 'Thẩm định hồ sơ 4 nhóm tác nhân' : 'Review profiles of 4 stakeholder groups'}
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleNavigateRoute('/admin/pricing-setup')}
                  className="w-full text-left p-2.5 hover:bg-slate-50 rounded-2xl flex items-center gap-3 transition-colors cursor-pointer group"
                >
                  <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-300 text-slate-700 flex items-center justify-center shrink-0 group-hover:bg-slate-800 group-hover:text-white transition-colors">
                    <span className="material-symbols-outlined text-lg">tune</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-xs text-[#091426]">
                      {isVi ? 'Cấu Hình Định Giá Inkiri v2' : 'Inkiri v2 Pricing Configuration'}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {isVi ? 'Chi phí khấu hao máy, điện, nhựa & nhân công' : 'Depreciation, energy, filament & labor costs'}
                    </p>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* C. Quick Demo Role Switcher (4 Stakeholders) */}
          <div className="p-3 bg-slate-50/90 border-t border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-500">
                {isVi ? 'GÓC NHÌN DEMO (QUICK ROLE SWITCH)' : 'DEMO ROLE SWITCHER'}
              </span>
              <span className="text-[9px] font-mono text-cyan-700 bg-cyan-50 px-1 rounded">
                {isVi ? 'Thử 1 Chạm' : '1-Click Test'}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1 font-mono text-[10px]">
              <button
                type="button"
                onClick={() => handleSelectRole('customer')}
                className={`py-1.5 px-1 rounded-xl flex flex-col items-center gap-1 transition-all cursor-pointer border ${
                  role === 'customer'
                    ? 'bg-teal-600 text-white border-teal-700 font-bold shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
                title={isVi ? "Khách Hàng: Đặt in 3D & mua file" : "Customer: 3D printing & file orders"}
              >
                <span className="material-symbols-outlined text-base">person</span>
                <span className="truncate">{isVi ? 'Khách In' : 'Customer'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectRole('designer')}
                className={`py-1.5 px-1 rounded-xl flex flex-col items-center gap-1 transition-all cursor-pointer border ${
                  role === 'designer'
                    ? 'bg-amber-600 text-white border-amber-700 font-bold shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
                title={isVi ? "Tác Giả 3D: Upload mẫu & nhận bản quyền" : "3D Designer: Upload models & earn royalties"}
              >
                <span className="material-symbols-outlined text-base">palette</span>
                <span className="truncate">{isVi ? 'Tác Giả' : 'Designer'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectRole('lab')}
                className={`py-1.5 px-1 rounded-xl flex flex-col items-center gap-1 transition-all cursor-pointer border ${
                  role === 'lab'
                    ? 'bg-emerald-600 text-white border-emerald-700 font-bold shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
                title={isVi ? "Xưởng In MES: Hàng đợi in & đội máy" : "MES Hub: Print queue & machine fleet"}
              >
                <span className="material-symbols-outlined text-base">precision_manufacturing</span>
                <span className="truncate">{isVi ? 'Xưởng MES' : 'MES Hub'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectRole('admin')}
                className={`py-1.5 px-1 rounded-xl flex flex-col items-center gap-1 transition-all cursor-pointer border ${
                  role === 'admin'
                    ? 'bg-purple-700 text-white border-purple-800 font-bold shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
                title={isVi ? "Quản Trị Viên: Toàn bộ quyền hạn" : "Administrator: Full control"}
              >
                <span className="material-symbols-outlined text-base">security</span>
                <span className="truncate">Admin</span>
              </button>
            </div>
          </div>

          {/* D. Footer Signout & Profile Link */}
          <div className="p-2.5 bg-white border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => handleNavigateRoute('/', 'home')}
              className="text-slate-500 hover:text-[#091426] text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span className="material-symbols-outlined text-sm">home</span>
              <span>{isVi ? 'Trang Chủ' : 'Home'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleItemClick(logout)}
              className="text-rose-600 hover:text-rose-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span className="material-symbols-outlined text-sm">logout</span>
              <span>{isVi ? 'Đăng Xuất' : 'Sign Out'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};