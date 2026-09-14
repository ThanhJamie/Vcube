import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, DEMO_ROLE_SWITCHER_ENABLED } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { UserRole } from '../../../types';
import { Icon } from '@frontend/ui';

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

  /**
   * P1: chỉ dùng cho công cụ DEV (nút đã bị ẩn khi DEMO_ROLE_SWITCHER_ENABLED = false).
   * Lỗi phải được bắt: nếu không, promise bị từ chối sẽ tạo console error và toast
   * "đã chuyển vai trò" vẫn hiện dù việc đổi vai trò đã thất bại.
   */
  const handleSelectRole = async (targetRole: UserRole) => {
    try {
      await switchDemoRole(targetRole);
      if (onShowToast) {
        const roleName = targetRole === 'admin'
          ? 'Super Admin (ForgeControl)'
          : targetRole === 'designer'
          ? (isVi ? 'Tác Giả 3D (Creator)' : '3D Creator / Designer')
          : targetRole === 'lab'
          ? (isVi ? 'Xưởng In 3D (MES Hub)' : '3D Print Lab (MES Hub)')
          : (isVi ? 'Khách Hàng (Customer)' : 'Customer');
        onShowToast(isVi ? `Đã chuyển sang góc nhìn: ${roleName}` : `Switched role perspective to: ${roleName}`);
      }
    } catch (err: any) {
      if (onShowToast) {
        onShowToast(err?.message || (isVi ? 'Không thể đổi góc nhìn vai trò.' : 'Could not switch role perspective.'));
      }
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

  // Role visual aesthetics — chỉ dùng token tint/fg, không dùng nền đặc màu trạng thái (§1.3)
  const getRoleTheme = (r: UserRole) => {
    switch (r) {
      case 'admin':
        return {
          title: isVi ? 'Ban Quản Trị' : 'Super Admin',
          badgeText: 'FORGE ADMIN',
          badgeClass: 'bg-info-tint text-info',
          avatarBg: 'bg-info-tint text-info',
        };
      case 'designer':
        return {
          title: isVi ? 'Tác Giả 3D' : 'Creator & CAD',
          badgeText: 'DESIGNER PRO',
          badgeClass: 'bg-warning-tint text-warning',
          avatarBg: 'bg-warning-tint text-warning',
        };
      case 'lab':
        return {
          title: isVi ? 'Xưởng In MES' : 'MES Hub Lab',
          badgeText: 'MES HUB CNC',
          badgeClass: 'bg-positive-tint text-positive',
          avatarBg: 'bg-positive-tint text-positive',
        };
      default:
        return {
          title: isVi ? 'Khách Đặt In' : 'Customer',
          badgeText: 'CUSTOMER',
          badgeClass: 'bg-primary-tint text-primary',
          avatarBg: 'bg-primary-tint text-primary',
        };
    }
  };

  const theme = getRoleTheme(role);
  const displayName = profile?.displayName || user?.email?.split('@')[0] || (isVi ? 'Thành viên VCUBE' : 'VCUBE Member');
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
        className={`flex items-center gap-1.5 p-1 rounded-full transition-all cursor-pointer focus:outline-none ${
          isOpen ? 'bg-surface-muted ring-2 ring-primary/20' : 'hover:bg-surface-muted'
        }`}
        aria-label={isVi ? "Tài khoản người dùng" : "User account"}
        aria-expanded={isOpen}
      >
        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-mono font-bold text-xs relative ${theme.avatarBg}`}>
          {initialLetter}
        </div>
        <Icon name={isOpen ? 'arrow_drop_up' : 'arrow_drop_down'} size={18} className="text-fg-muted" />
      </button>

      {/* 2. Role-Tailored Popover */}
      {isOpen && (
        <div
          className={`absolute right-0 mt-2 w-[340px] sm:w-[390px] bg-surface/95 backdrop-blur-xl shadow-e3 rounded-lg z-modal text-xs overflow-hidden transition-all animate-in fade-in zoom-in-95 duration-150 font-sans`}
        >
          {/* A. Identity Header Banner */}
          <div className="p-4 bg-surface-inverse text-on-inverse relative overflow-hidden">
            {/* Tech grid texture overlay */}
            <div
              className="absolute inset-0 opacity-10 pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(#57DFFE 1px, transparent 1px)',
                backgroundSize: '16px 16px',
              }}
            />

            <div className="flex items-center justify-between mb-2 relative z-sticky">
              <span className="font-mono text-xs uppercase tracking-widest text-accent font-bold">
                {isVi ? 'HỒ SƠ ĐỊNH DANH // VCUBE NETWORK' : 'IDENTITY & ACCESS // VCUBE NETWORK'}
              </span>
              <div className="flex items-center gap-1.5">
                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full uppercase ${theme.badgeClass}`}>
                  {theme.badgeText}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 relative z-sticky">
              <div className={`w-11 h-11 rounded-md flex items-center justify-center font-mono font-black text-base ${theme.avatarBg}`}>
                {initialLetter}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="font-bold text-sm text-on-inverse truncate">
                    {displayName}
                  </p>
                </div>
                <p className="text-xs font-mono text-fg-subtle truncate">
                  {profile?.email || user?.email || '—'}
                </p>
                {profile?.company && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-mono text-accent bg-on-inverse/10 px-1.5 py-0.5 rounded-sm">
                      {profile.company}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* B. Dynamic Role-Tailored Content Tabs */}
          <div className="max-h-[65vh] overflow-y-auto divide-y divide-line-subtle p-2 space-y-1">

            {/* --- ROLE 1: CUSTOMER (Khách Đặt In) --- */}
            {role === 'customer' && (
              <div className="space-y-1">
                <div className="px-2.5 py-1 flex items-center justify-between">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-fg-subtle">
                    {isVi ? 'ĐƠN HÀNG & TIẾN ĐỘ SẢN XUẤT' : 'ORDERS & FABRICATION PROGRESS'}
                  </span>
                  <span className="text-xs font-mono text-primary font-bold bg-primary-tint px-2 py-0.5 rounded-full">
                    {isVi ? '8 Nấc Chuẩn ISO' : '8 ISO Stages'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleNavigateRoute('/orders', 'my_orders')}
                  className="w-full text-left p-2.5 hover:bg-surface-muted rounded-lg flex items-center gap-3 transition-colors cursor-pointer group"
                >
                  <div className="w-9 h-9 rounded-md bg-info-tint text-info flex items-center justify-center shrink-0 group-hover:bg-info group-hover:text-on-inverse transition-colors">
                    <Icon name="receipt_long" size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-xs text-fg">
                      {isVi ? 'Đơn Hàng Của Tôi' : 'My Orders'}
                    </p>
                    <p className="text-xs text-fg-subtle truncate">
                      {isVi ? 'Tiến độ sản xuất & thông tin vận đơn' : 'Production progress & carrier details'}
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleNavigateRoute('/quote', 'tool_3d')}
                  className="w-full text-left p-2.5 hover:bg-surface-muted rounded-lg flex items-center gap-3 transition-colors cursor-pointer group"
                >
                  <div className="w-9 h-9 rounded-md bg-primary-tint text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-fg transition-colors">
                    <Icon name="view_in_ar" size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-xs text-fg">
                      {isVi ? 'Báo Giá In 3D Từ Tệp CAD' : 'Instant Quote from CAD'}
                    </p>
                    <p className="text-xs text-fg-subtle truncate">
                      {isVi ? 'Tải tệp lên để phân tích & báo giá' : 'Upload a file to analyse and quote'}
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleNavigateRoute('/personalize', 'personalize')}
                  className="w-full text-left p-2.5 hover:bg-surface-muted rounded-lg flex items-center gap-3 transition-colors cursor-pointer group"
                >
                  <div className="w-9 h-9 rounded-md bg-info-tint text-info flex items-center justify-center shrink-0 group-hover:bg-info group-hover:text-on-inverse transition-colors">
                    <Icon name="tune" size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-xs text-fg">
                      {isVi ? 'Tùy Biến Cá Nhân Hóa (Customizer)' : 'Product Customizer & Personalization'}
                    </p>
                    <p className="text-xs text-fg-subtle truncate">
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
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-fg-subtle">
                    {isVi ? 'CREATOR STUDIO' : 'CREATOR STUDIO'}
                  </span>
                  <span className="text-xs font-mono text-warning font-bold bg-warning-tint px-2 py-0.5 rounded-full">
                    {isVi ? 'Bản Quyền STL' : 'STL Royalties'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleNavigateRoute('/designer', 'designer')}
                  className="w-full text-left p-2.5 hover:bg-surface-muted rounded-lg flex items-center gap-3 transition-colors cursor-pointer group"
                >
                  <div className="w-9 h-9 rounded-md bg-warning-tint text-warning flex items-center justify-center shrink-0 group-hover:bg-warning group-hover:text-on-inverse transition-colors">
                    <Icon name="palette" size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-xs text-fg">
                      {isVi ? 'Bảng Điều Khiển Tác Giả' : 'Creator Dashboard'}
                    </p>
                    <p className="text-xs text-fg-subtle truncate">
                      {isVi ? 'Quản lý catalog bản vẽ, upload STL/3MF' : 'Manage CAD catalog, upload STL/3MF'}
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleItemClick(() => handleNavigateRoute('/designer', 'designer'))}
                  className="w-full text-left p-2.5 hover:bg-surface-muted rounded-lg flex items-center gap-3 transition-colors cursor-pointer group"
                >
                  <div className="w-9 h-9 rounded-md bg-surface-muted text-fg-muted flex items-center justify-center shrink-0">
                    <Icon name="payments" size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-xs text-fg">
                      {isVi ? 'Thu Nhập & Hoa Hồng' : 'Earnings & Royalties'}
                    </p>
                    <p className="text-xs text-fg-subtle truncate">
                      {isVi ? 'Số liệu thật hiển thị trong Studio Thiết Kế' : 'Real figures are shown in the Creator Studio'}
                    </p>
                  </div>
                </button>
              </div>
            )}

            {/* --- ROLE 3: LAB (Xưởng In 3D MES Hub) --- */}
            {role === 'lab' && (
              <div className="space-y-1">
                <div className="px-2.5 py-1 flex items-center justify-between">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-fg-subtle">
                    {isVi ? 'MES HUB & ĐỘI MÁY IN 3D' : 'MES HUB & PRINT FLEET'}
                  </span>
                  <span className="text-xs font-mono text-positive font-bold bg-positive-tint px-2 py-0.5 rounded-full">
                    {isVi ? 'Xưởng In' : 'Print Lab'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleNavigateRoute('/admin/queue')}
                  className="w-full text-left p-2.5 hover:bg-surface-muted rounded-lg flex items-center gap-3 transition-colors cursor-pointer group"
                >
                  <div className="w-9 h-9 rounded-md bg-positive-tint text-positive flex items-center justify-center shrink-0 group-hover:bg-positive group-hover:text-on-inverse transition-colors">
                    <Icon name="precision_manufacturing" size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-xs text-fg">
                      {isVi ? 'Hàng Đợi Chế Tác (Queue)' : 'Fabrication Queue'}
                    </p>
                    <p className="text-xs text-fg-subtle truncate">
                      {isVi ? 'Nhận phôi in, chia lệnh cắt lớp Bambu/SLA' : 'Receive print jobs, dispatch Bambu/SLA slicing'}
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleNavigateRoute('/admin/machines')}
                  className="w-full text-left p-2.5 hover:bg-surface-muted rounded-lg flex items-center gap-3 transition-colors cursor-pointer group"
                >
                  <div className="w-9 h-9 rounded-md bg-primary-tint text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-fg transition-colors">
                    <Icon name="print" size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-xs text-fg">
                      {isVi ? 'Cụm Máy In Bambu Lab X1C / P1S' : 'Bambu Lab X1C / P1S Fleet'}
                    </p>
                    <p className="text-xs text-fg-subtle truncate">
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
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-fg-subtle">
                    {isVi ? 'QUẢN TRỊ FORGECONTROL' : 'FORGECONTROL ADMIN'}
                  </span>
                  <span className="text-xs font-mono text-info font-bold bg-info-tint px-2 py-0.5 rounded-full">
                    {isVi ? 'Toàn Quyền' : 'Full Access'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleNavigateRoute('/admin/overview')}
                  className="w-full text-left p-2.5 hover:bg-surface-muted rounded-lg flex items-center gap-3 transition-colors cursor-pointer group"
                >
                  <div className="w-9 h-9 rounded-md bg-info-tint text-info flex items-center justify-center shrink-0 group-hover:bg-info group-hover:text-on-inverse transition-colors">
                    <Icon name="dashboard" size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-xs text-fg">
                      {isVi ? 'Bảng Điều Khiển Trung Tâm' : 'Central Admin Dashboard'}
                    </p>
                    <p className="text-xs text-fg-subtle truncate">
                      {isVi ? 'Quản lý tổng quan doanh thu, đơn hàng & máy' : 'Overview of revenue, orders & printer fleet'}
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleNavigateRoute('/admin/users')}
                  className="w-full text-left p-2.5 hover:bg-surface-muted rounded-lg flex items-center gap-3 transition-colors cursor-pointer group"
                >
                  <div className="w-9 h-9 rounded-md bg-primary-tint text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-fg transition-colors">
                    <Icon name="manage_accounts" size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-xs text-fg">
                      {isVi ? 'Quản Trị Người Dùng & KYC' : 'User Management & KYC'}
                    </p>
                    <p className="text-xs text-fg-subtle truncate">
                      {isVi ? 'Thẩm định hồ sơ 4 nhóm tác nhân' : 'Review profiles of 4 stakeholder groups'}
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleNavigateRoute('/admin/pricing-setup')}
                  className="w-full text-left p-2.5 hover:bg-surface-muted rounded-lg flex items-center gap-3 transition-colors cursor-pointer group"
                >
                  <div className="w-9 h-9 rounded-md bg-surface-muted text-fg-muted flex items-center justify-center shrink-0 group-hover:bg-surface-inverse group-hover:text-on-inverse transition-colors">
                    <Icon name="tune" size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-xs text-fg">
                      {isVi ? 'Cấu Hình Định Giá Inkiri v2' : 'Inkiri v2 Pricing Configuration'}
                    </p>
                    <p className="text-xs text-fg-subtle truncate">
                      {isVi ? 'Chi phí khấu hao máy, điện, nhựa & nhân công' : 'Depreciation, energy, filament & labor costs'}
                    </p>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* C. Quick Demo Role Switcher (4 Stakeholders) — CHỈ DEV, không tồn tại ở bản phát hành (P1) */}
          {DEMO_ROLE_SWITCHER_ENABLED && (
            <div className="p-3 bg-surface-muted border-t border-line-subtle">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-fg-subtle">
                  {isVi ? 'GÓC NHÌN DEMO (QUICK ROLE SWITCH)' : 'DEMO ROLE SWITCHER'}
                </span>
                <span className="text-xs font-mono text-primary bg-primary-tint px-2 py-0.5 rounded-full">
                  {isVi ? 'Thử 1 Chạm' : '1-Click Test'}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-1 font-mono text-xs">
                <button
                  type="button"
                  onClick={() => handleSelectRole('customer')}
                  className={`py-1.5 px-1 rounded-full flex flex-col items-center gap-1 transition-all cursor-pointer ${
                    role === 'customer'
                      ? 'bg-primary text-primary-fg font-bold shadow-e1'
                      : 'bg-surface text-fg-muted hover:bg-canvas'
                  }`}
                  title={isVi ? "Khách Hàng: Đặt in 3D & mua file" : "Customer: 3D printing & file orders"}
                >
                  <Icon name="person" size={18} />
                  <span className="truncate">{isVi ? 'Khách In' : 'Customer'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectRole('designer')}
                  className={`py-1.5 px-1 rounded-full flex flex-col items-center gap-1 transition-all cursor-pointer ${
                    role === 'designer'
                      ? 'bg-primary text-primary-fg font-bold shadow-e1'
                      : 'bg-surface text-fg-muted hover:bg-canvas'
                  }`}
                  title={isVi ? "Tác Giả 3D: Upload mẫu & nhận bản quyền" : "3D Designer: Upload models & earn royalties"}
                >
                  <Icon name="palette" size={18} />
                  <span className="truncate">{isVi ? 'Tác Giả' : 'Designer'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectRole('lab')}
                  className={`py-1.5 px-1 rounded-full flex flex-col items-center gap-1 transition-all cursor-pointer ${
                    role === 'lab'
                      ? 'bg-primary text-primary-fg font-bold shadow-e1'
                      : 'bg-surface text-fg-muted hover:bg-canvas'
                  }`}
                  title={isVi ? "Xưởng In MES: Hàng đợi in & đội máy" : "MES Hub: Print queue & machine fleet"}
                >
                  <Icon name="precision_manufacturing" size={18} />
                  <span className="truncate">{isVi ? 'Xưởng MES' : 'MES Hub'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectRole('admin')}
                  className={`py-1.5 px-1 rounded-full flex flex-col items-center gap-1 transition-all cursor-pointer ${
                    role === 'admin'
                      ? 'bg-primary text-primary-fg font-bold shadow-e1'
                      : 'bg-surface text-fg-muted hover:bg-canvas'
                  }`}
                  title={isVi ? "Quản Trị Viên: Toàn bộ quyền hạn" : "Administrator: Full control"}
                >
                  <Icon name="security" size={18} />
                  <span className="truncate">Admin</span>
                </button>
              </div>
            </div>
          )}

          {/* D. Footer Signout & Profile Link */}
          <div className="p-2.5 bg-surface border-t border-line-subtle flex items-center justify-between">
            <button
              type="button"
              onClick={() => handleNavigateRoute('/', 'home')}
              className="text-fg-muted hover:text-fg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors rounded-full px-2 py-1 hover:bg-surface-muted"
            >
              <Icon name="home" size={18} />
              <span>{isVi ? 'Trang Chủ' : 'Home'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleItemClick(logout)}
              className="text-danger hover:text-danger text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors rounded-full px-2 py-1 hover:bg-danger-tint"
            >
              <Icon name="logout" size={18} />
              <span>{isVi ? 'Đăng Xuất' : 'Sign Out'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
