import React from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { Icon } from '@frontend/ui';

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
      <div className="min-h-[60vh] flex items-center justify-center p-6 bg-surface-muted">
        <div className="flex items-center gap-2 text-fg-muted text-xs font-sans">
          <Icon name="sync" size={18} className="animate-spin motion-reduce:animate-none text-primary" />
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
      case 'admin':
        return 'Quản trị viên (ForgeControl Admin)';
      case 'designer':
        return 'Tác giả thiết kế 3D (Creator)';
      case 'lab':
      case 'workshop':
        return 'Xưởng in / Đối tác sản xuất (3D Print Lab)';
      case 'customer':
        return 'Khách hàng (Customer)';
      default:
        return r;
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6 bg-surface-muted">
      <div className="max-w-md w-full bg-surface rounded-lg shadow-e2 p-6 sm:p-8 text-center space-y-5">
        <div className="w-16 h-16 bg-danger-tint border border-danger/30 text-danger rounded-full flex items-center justify-center mx-auto">
          <Icon name="lock" size={30} />
        </div>

        <div className="space-y-2">
          <span className="font-tech text-xs text-danger uppercase tracking-widest font-bold block">
            403 • ACCESS RESTRICTED
          </span>
          <h2 className="font-display text-xl font-bold text-fg">
            Yêu cầu quyền truy cập {featureName}
          </h2>
          <p className="text-xs text-fg-muted font-sans leading-relaxed">
            Tài khoản hiện tại của bạn (<span className="font-bold text-fg">{profile?.displayName || 'Khách'}</span> - vai trò <span className="font-tech uppercase text-primary">{role}</span>) chưa có thẩm quyền để thao tác phân hệ này.
          </p>
        </div>

        <div className="p-3 bg-primary/10 border border-line rounded-sm text-left text-xs space-y-1">
          <p className="font-bold text-fg">Các vai trò được phép truy cập:</p>
          <ul className="list-disc list-inside text-fg-muted space-y-0.5 font-sans">
            {allowedRoles.map((r) => (
              <li key={r} className="font-medium text-primary">
                {getRoleLabel(r)}
              </li>
            ))}
          </ul>
        </div>

        <div className="pt-2">
          <button
            onClick={() => (onNavigate ? onNavigate('home') : navigate('/'))}
            className="w-full py-2.5 px-4 bg-primary hover:bg-primary-hover text-primary-fg text-xs font-bold uppercase tracking-wider rounded-full transition-colors"
          >
            Về Trang Chủ
          </button>
        </div>
      </div>
    </div>
  );
};
