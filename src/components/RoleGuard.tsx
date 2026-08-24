import React from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
  fallbackScreen?: string;
  onNavigate?: (screen: string) => void;
  onOpenAuthModal?: (mode: 'signin' | 'role_select') => void;
  featureName?: string;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  allowedRoles,
  children,
  onNavigate,
  onOpenAuthModal,
  featureName = 'tính năng này',
}) => {
  const { role, profile } = useAuth();

  const isAllowed = allowedRoles.includes(role);

  if (isAllowed) {
    return <>{children}</>;
  }

  const getRoleLabel = (r: UserRole) => {
    switch (r) {
      case 'admin':
        return 'Quản trị viên (ForgeControl Admin)';
      case 'designer':
        return 'Tác giả thiết kế 3D (Creator)';
      case 'customer':
        return 'Khách hàng (Customer)';
      default:
        return r;
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6 bg-[#F8F9FF]">
      <div className="max-w-md w-full bg-white border border-[#C5C6CD] rounded shadow-lg p-6 sm:p-8 text-center space-y-5">
        <div className="w-16 h-16 bg-rose-50 border border-rose-200 text-rose-600 rounded-full flex items-center justify-center mx-auto">
          <span className="material-symbols-outlined text-3xl">lock</span>
        </div>

        <div className="space-y-2">
          <span className="font-tech text-[10px] text-rose-600 uppercase tracking-widest font-bold block">
            403 • ACCESS RESTRICTED
          </span>
          <h2 className="font-display text-xl font-bold text-[#091426]">
            Yêu cầu quyền truy cập {featureName}
          </h2>
          <p className="text-xs text-[#545F73] font-sans leading-relaxed">
            Tài khoản hiện tại của bạn (<span className="font-bold text-[#091426]">{profile?.displayName || 'Khách'}</span> - vai trò <span className="font-tech uppercase text-[#00687A]">{role}</span>) chưa có thẩm quyền để thao tác phân hệ này.
          </p>
        </div>

        <div className="p-3 bg-[#EFF4FF] border border-[#C5C6CD] rounded text-left text-xs space-y-1">
          <p className="font-bold text-[#091426]">Các vai trò được phép truy cập:</p>
          <ul className="list-disc list-inside text-[#545F73] space-y-0.5 font-sans">
            {allowedRoles.map((r) => (
              <li key={r} className="font-medium text-[#00687A]">
                {getRoleLabel(r)}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <button
            onClick={() => onOpenAuthModal && onOpenAuthModal('role_select')}
            className="flex-1 py-2.5 px-4 bg-[#00687A] hover:bg-[#005463] text-white text-xs font-bold uppercase tracking-wider rounded transition-colors flex items-center justify-center gap-1.5"
          >
            <span className="material-symbols-outlined text-sm">swap_horiz</span>
            Chuyển Vai Trò (Demo)
          </button>
          
          <button
            onClick={() => onNavigate && onNavigate('home')}
            className="py-2.5 px-4 border border-[#C5C6CD] hover:bg-black/5 text-[#091426] text-xs font-bold uppercase tracking-wider rounded transition-colors"
          >
            Về Trang Chủ
          </button>
        </div>
      </div>
    </div>
  );
};
