import React from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { Button, Icon } from '@frontend/ui';

/**
 * W1a — `public.user_profiles.role` có CHECK cho phép cả `'workshop'` lẫn `'lab'`
 * (`supabase/migrations/20260901_baseline_schema.sql:460`), nhưng `UserRole`
 * (`src/types/index.ts:711`) mới chỉ khai `'customer' | 'designer' | 'admin' | 'lab'`.
 *
 * Vai trò được đọc THẲNG từ DB (`AuthContext.resolveDbRole` → `data.role as UserRole`,
 * `src/frontend/context/AuthContext.tsx:90`) nên giá trị `'workshop'` VẪN tới được UI lúc
 * chạy. Ở đây chấp nhận cả hai cho tới khi `src/types/index.ts` được nới — file đó KHÔNG
 * thuộc W1a (xem `docs/plans/20-dot10-briefs.md` §9).
 */
export type GuardRole = UserRole | 'workshop';

interface RoleGuardProps {
  allowedRoles: GuardRole[];
  children: React.ReactNode;
  onNavigate?: (screen: string) => void;
  featureName?: string;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  allowedRoles,
  children,
  onNavigate,
  featureName = 'tính năng này',
}) => {
  const { role, profile, isLoggedIn, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Chờ AuthContext khôi phục phiên (getSession + user_profiles.role) TRƯỚC khi
  // quyết định. Nếu redirect lúc `loading` còn true thì deep-link /admin (F5, tab mới)
  // sẽ bị đẩy về /auth/login dù phiên Supabase vẫn còn hợp lệ.
  if (loading) {
    return (
      <div className="min-h-[60dvh] grid place-items-center p-6 bg-canvas">
        <div className="flex items-center gap-2 text-fg-muted text-sm font-sans">
          <Icon name="sync" size={18} className="animate-spin motion-reduce:animate-none text-fg-subtle" />
          <span>Đang xác thực phiên đăng nhập…</span>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    // Chưa đăng nhập: đưa về trang đăng nhập và GIỮ ĐƯỜNG VỀ — `LoginView` đã đọc
    // `?redirectTo=` (`src/frontend/views/LoginView.tsx:39-44`) nên đăng nhập xong quay
    // lại đúng khu vực vừa bị chặn thay vì rơi về trang chủ.
    const redirectTo = `${location.pathname}${location.search}`;
    return <Navigate to={`/auth/login?redirectTo=${encodeURIComponent(redirectTo)}`} replace />;
  }

  const isAllowed = allowedRoles.includes(role as GuardRole);

  if (isAllowed) {
    return <>{children}</>;
  }

  const getRoleLabel = (r: GuardRole) => {
    switch (r) {
      // D-A + UI-006: nhãn vai trò VI-only (bỏ tên EN trong ngoặc); giá trị DB giữ nguyên.
      case 'admin':
        return 'Quản trị hệ thống';
      case 'designer':
        return 'Tác giả thiết kế 3D';
      case 'lab':
      case 'workshop':
        return 'Xưởng in / Đối tác sản xuất';
      case 'customer':
        return 'Khách hàng';
      default:
        return r;
    }
  };

  return (
    <div className="min-h-[60dvh] grid place-items-center p-6 bg-canvas">
      <div className="max-w-md w-full rounded-xl border border-line bg-surface p-6 sm:p-8 text-center space-y-5">
        <div className="mx-auto grid size-12 place-items-center rounded-md border border-danger/20 bg-danger-tint text-danger">
          <Icon name="lock" size={24} />
        </div>

        <div className="space-y-2">
          <span className="font-tech text-xs text-danger uppercase tracking-wider font-semibold block">
            403 • KHÔNG CÓ QUYỀN TRUY CẬP
          </span>
          <h2 className="text-xl font-bold tracking-tight text-fg">
            Yêu cầu quyền truy cập {featureName}
          </h2>
          <p className="text-sm text-fg-muted font-sans leading-relaxed">
            Tài khoản hiện tại của bạn (<span className="font-bold text-fg">{profile?.displayName || 'Khách'}</span> - vai trò <span className="font-tech text-fg">{getRoleLabel(role as GuardRole)}</span>) chưa có thẩm quyền để thao tác phân hệ này.
          </p>
        </div>

        <div className="p-4 bg-surface-muted border border-line-subtle rounded-lg text-left text-xs space-y-1">
          <p className="font-semibold text-sm text-fg">Các vai trò được phép truy cập:</p>
          <ul className="list-disc list-inside text-fg-muted space-y-0.5 font-sans">
            {allowedRoles.map((r) => (
              <li key={r} className="font-medium text-fg-muted">
                {getRoleLabel(r)}
              </li>
            ))}
          </ul>
        </div>

        <div className="pt-2">
          <Button
            fullWidth
            size="lg"
            onClick={() => (onNavigate ? onNavigate('home') : navigate('/'))}
          >
            Về Trang Chủ
          </Button>
        </div>
      </div>
    </div>
  );
};
