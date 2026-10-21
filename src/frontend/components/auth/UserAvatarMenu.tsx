import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../../types';
import { Badge, Button, Icon } from '@frontend/ui';

interface UserAvatarMenuProps {
  onNavigate: (screen: string, data?: any) => void;
  onOpenCart?: () => void;
}

export const UserAvatarMenu: React.FC<UserAvatarMenuProps> = ({
  onNavigate,
  onOpenCart,
}) => {
  const { user, profile, role, logout } = useAuth();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
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
  // R2 #21 — Esc đóng & trả focus về nút mở; pointerdown ngoài đóng menu.
  useEffect(() => {
    if (!isOpen) return;
    const close = () => setIsOpen(false);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { close(); triggerRef.current?.focus(); } };
    const onDown = (e: PointerEvent) => { if (!containerRef.current?.contains(e.target as Node)) close(); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [isOpen]);

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
          title: 'Ban Quản Trị',
          badgeText: 'Quản trị',
          badgeVariant: 'info' as const,
          avatarBg: 'bg-info-tint text-info',
        };
      case 'designer':
        return {
          title: 'Tác Giả 3D',
          badgeText: 'Tác giả 3D',
          badgeVariant: 'warning' as const,
          avatarBg: 'bg-warning-tint text-warning',
        };
      case 'lab':
        return {
          title: 'Xưởng In MES',
          badgeText: 'Xưởng in',
          badgeVariant: 'success' as const,
          avatarBg: 'bg-positive-tint text-positive',
        };
      default:
        return {
          title: 'Khách Đặt In',
          badgeText: 'Khách hàng',
          badgeVariant: 'technical' as const,
          avatarBg: 'bg-primary-tint text-primary',
        };
    }
  };

  const theme = getRoleTheme(role);
  const displayName = profile?.displayName || user?.email?.split('@')[0] || ('Thành viên VCUBE');
  const initialLetter = displayName.charAt(0).toUpperCase();

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex cursor-pointer items-center gap-1.5 rounded-md p-1 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
          isOpen ? 'bg-surface-muted' : 'hover:bg-surface-muted'
        }`}
        aria-label="Tài khoản người dùng"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-controls="vcube-user-menu"
      >
        <span className="grid size-9 place-items-center rounded-full bg-surface-muted font-mono text-xs font-bold text-fg">
          {initialLetter}
        </span>
        <Icon name={isOpen ? 'arrow_drop_up' : 'arrow_drop_down'} size={16} className="text-fg-muted" />
      </button>

      {isOpen && (
        <div
          id="vcube-user-menu"
          role="dialog"
          aria-label="Tài khoản người dùng"
          className="absolute right-0 z-panel mt-2 w-[340px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-line bg-surface p-1 text-xs shadow-e2 transition-colors sm:w-[390px]"
        >
          <div className="rounded-md bg-surface-muted p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate text-xs font-semibold uppercase tracking-wider text-fg-muted">
                HỒ SƠ ĐỊNH DANH
              </span>
              <Badge variant={theme.badgeVariant} size="sm" className="shrink-0 uppercase">
                {theme.badgeText}
              </Badge>
            </div>

            <div className="mt-3 flex items-center gap-3">
              <div className={`grid size-10 shrink-0 place-items-center rounded-md font-mono text-sm font-bold ${theme.avatarBg}`}>
                {initialLetter}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-fg">{displayName}</p>
                <p className="truncate font-mono text-xs text-fg-muted">
                  {profile?.email || user?.email || '—'}
                </p>
                {profile?.company && (
                  <p className="mt-0.5 truncate font-mono text-xs text-primary">{profile.company}</p>
                )}
              </div>
            </div>
          </div>

          <div className="max-h-[65vh] space-y-1 overflow-y-auto p-1">

            {/* --- ROLE 1: CUSTOMER (Khách Đặt In) --- */}
            {role === 'customer' && (
              <div className="space-y-1">
                <div className="flex items-center justify-between px-2.5 py-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
                    {'ĐƠN HÀNG & TIẾN ĐỘ SẢN XUẤT'}
                  </span>
                  <Badge variant="technical" size="sm">
                    8 nấc gia công
                  </Badge>
                </div>

                <button
                  type="button"
                  onClick={() => handleNavigateRoute('/orders', 'my_orders')}
                  className="group flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-fg transition-colors duration-200 hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <div className="w-9 h-9 rounded-md bg-info-tint text-info flex items-center justify-center shrink-0 group-hover:bg-info group-hover:text-on-inverse transition-colors">
                    <Icon name="receipt_long" size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-fg">
                      Đơn Hàng Của Tôi
                    </p>
                    <p className="text-xs text-fg-subtle truncate">
                      {'Tiến độ sản xuất & thông tin vận đơn'}
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleNavigateRoute('/quote', 'tool_3d')}
                  className="group flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-fg transition-colors duration-200 hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <div className="w-9 h-9 rounded-md bg-primary-tint text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-fg transition-colors">
                    <Icon name="view_in_ar" size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-fg">
                      Báo Giá In 3D Từ Tệp CAD
                    </p>
                    <p className="text-xs text-fg-subtle truncate">
                      {'Tải tệp lên để phân tích & báo giá'}
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleNavigateRoute('/personalize', 'personalize')}
                  className="group flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-fg transition-colors duration-200 hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <div className="w-9 h-9 rounded-md bg-info-tint text-info flex items-center justify-center shrink-0 group-hover:bg-info group-hover:text-on-inverse transition-colors">
                    <Icon name="tune" size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-fg">
                      Tùy biến cá nhân hoá
                    </p>
                    <p className="text-xs text-fg-subtle truncate">
                      {'Khắc laser, màu sắc AMS & phụ kiện đồ gá'}
                    </p>
                  </div>
                </button>
              </div>
            )}

            {/* --- ROLE 2: DESIGNER (Tác Giả 3D) --- */}
            {role === 'designer' && (
              <div className="space-y-1">
                <div className="flex items-center justify-between px-2.5 py-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
                    XƯỞNG THIẾT KẾ
                  </span>
                  <Badge variant="warning" size="sm">
                    Bản Quyền STL
                  </Badge>
                </div>

                <button
                  type="button"
                  onClick={() => handleNavigateRoute('/designer', 'designer')}
                  className="group flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-fg transition-colors duration-200 hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <div className="w-9 h-9 rounded-md bg-warning-tint text-warning flex items-center justify-center shrink-0 group-hover:bg-warning group-hover:text-on-inverse transition-colors">
                    <Icon name="palette" size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-fg">
                      Bảng Điều Khiển Tác Giả
                    </p>
                    <p className="text-xs text-fg-subtle truncate">
                      Quản lý catalog bản vẽ, upload STL/3MF
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleItemClick(() => handleNavigateRoute('/designer', 'designer'))}
                  className="group flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-fg transition-colors duration-200 hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <div className="w-9 h-9 rounded-md bg-surface-muted text-fg-muted flex items-center justify-center shrink-0">
                    <Icon name="payments" size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-fg">
                      {'Thu Nhập & Hoa Hồng'}
                    </p>
                    <p className="text-xs text-fg-subtle truncate">
                      Số liệu thật hiển thị trong xưởng thiết kế
                    </p>
                  </div>
                </button>
              </div>
            )}

            {/* --- ROLE 3: LAB (Xưởng In 3D MES Hub) --- */}
            {role === 'lab' && (
              <div className="space-y-1">
                <div className="flex items-center justify-between px-2.5 py-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
                    {'XƯỞNG IN & CỤM MÁY IN'}
                  </span>
                  <Badge variant="success" size="sm">
                    Xưởng In
                  </Badge>
                </div>

                <button
                  type="button"
                  onClick={() => handleNavigateRoute('/lab')}
                  className="group flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-fg transition-colors duration-200 hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <div className="w-9 h-9 rounded-md bg-positive-tint text-positive flex items-center justify-center shrink-0 group-hover:bg-positive group-hover:text-on-inverse transition-colors">
                    <Icon name="precision_manufacturing" size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-fg">
                      Hàng đợi chế tác
                    </p>
                    <p className="text-xs text-fg-subtle truncate">
                      Nhận phôi in, chia lệnh cắt lớp Bambu/SLA
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleNavigateRoute('/lab/machines')}
                  className="group flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-fg transition-colors duration-200 hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <div className="w-9 h-9 rounded-md bg-primary-tint text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-fg transition-colors">
                    <Icon name="print" size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-fg">
                      Cụm Máy In Bambu Lab X1C / P1S
                    </p>
                    <p className="text-xs text-fg-subtle truncate">
                      {'Giám sát nhiệt độ buồng, bàn in & cuộn nhựa'}
                    </p>
                  </div>
                </button>
              </div>
            )}

            {/* --- ROLE 4: ADMIN (Quản Trị Hệ Thống) --- */}
            {role === 'admin' && (
              <div className="space-y-1">
                <div className="flex items-center justify-between px-2.5 py-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
                    QUẢN TRỊ HỆ THỐNG
                  </span>
                  <Badge variant="info" size="sm">
                    Toàn Quyền
                  </Badge>
                </div>

                <button
                  type="button"
                  onClick={() => handleNavigateRoute('/admin/overview')}
                  className="group flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-fg transition-colors duration-200 hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <div className="w-9 h-9 rounded-md bg-info-tint text-info flex items-center justify-center shrink-0 group-hover:bg-info group-hover:text-on-inverse transition-colors">
                    <Icon name="dashboard" size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-fg">
                      Bảng Điều Khiển Trung Tâm
                    </p>
                    <p className="text-xs text-fg-subtle truncate">
                      {'Quản lý tổng quan doanh thu, đơn hàng & máy'}
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleNavigateRoute('/admin/users')}
                  className="group flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-fg transition-colors duration-200 hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <div className="w-9 h-9 rounded-md bg-primary-tint text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-fg transition-colors">
                    <Icon name="manage_accounts" size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-fg">
                      {'Quản Trị Người Dùng & KYC'}
                    </p>
                    <p className="text-xs text-fg-subtle truncate">
                      Thẩm định hồ sơ 4 nhóm tác nhân
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleNavigateRoute('/admin/pricing-setup')}
                  className="group flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-fg transition-colors duration-200 hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <div className="w-9 h-9 rounded-md bg-surface-muted text-fg-muted flex items-center justify-center shrink-0 group-hover:bg-surface-inverse group-hover:text-on-inverse transition-colors">
                    <Icon name="tune" size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-fg">
                      Cấu Hình Định Giá Inkiri v2
                    </p>
                    <p className="text-xs text-fg-subtle truncate">
                      {'Chi phí khấu hao máy, điện, nhựa & nhân công'}
                    </p>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-line-subtle bg-surface p-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleNavigateRoute('/', 'home')}
              leadingIcon={<Icon name="home" size={16} />}
            >
              Trang chủ
            </Button>

            <Button
              type="button"
              variant="danger-ghost"
              size="sm"
              onClick={() => handleItemClick(logout)}
              leadingIcon={<Icon name="logout" size={16} />}
            >
              Đăng xuất
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
