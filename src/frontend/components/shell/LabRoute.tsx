/**
 * LabRoute — cổng xưởng in `/lab` (tách NGUYÊN VĂN từ `src/App.tsx`, Phase 3c).
 *
 * Quyết định hiển thị dựa trên hàng `workshop_profiles` CỦA CHÍNH người đăng nhập
 * (khớp `user_id`), đọc qua `WorkshopService` — không truy vấn DB inline trong component:
 *   - chưa có hàng, hoặc `verified_status='Pending'` ⇒ `WorkshopOnboardingWizard`;
 *   - đã có hàng (đã duyệt) ⇒ bảng điều khiển xưởng `WorkshopSettingsView`.
 * Trước W1a, `/lab` không tồn tại trong router nên cả hai module trên không có người gọi.
 */

import React, { useEffect, useState } from 'react';
import type { WorkshopProfile } from '@/types';
import { useAuth } from '@frontend/context/AuthContext';
import { WorkshopService } from '@backend/services/workshopService';
import { PageSkeleton } from '@frontend/components/PageSkeleton';
import { LabDashboardShell } from './LabDashboardShell';

const WorkshopSettingsView = React.lazy(() => import('@frontend/views/WorkshopSettingsView'));
const WorkshopOnboardingWizard = React.lazy(() => import('@frontend/components/onboarding/WorkshopOnboardingWizard'));

export const LabRoute: React.FC<{
  onNavigate: (screen: string, payload?: any) => void;
  onShowToast: (msg: string) => void;
}> = ({ onNavigate, onShowToast }) => {
  const { user } = useAuth();
  const [gate, setGate] = useState<'loading' | 'onboarding' | 'ready'>('loading');
  const [profile, setProfile] = useState<WorkshopProfile | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!user?.id) {
      // RoleGuard đã chặn khách; tới đây mà không có uid thì không thể xác định hồ sơ.
      setGate('loading');
      return;
    }
    setGate('loading');
    WorkshopService.getWorkshopProfileByUserId(user.id)
      .then((found) => {
        if (cancelled) return;
        setProfile(found);
        setGate(!found || found.verifiedStatus === 'Pending' ? 'onboarding' : 'ready');
      })
      .catch((err) => {
        console.warn('Could not resolve workshop profile for /lab:', err);
        if (cancelled) return;
        setProfile(null);
        setGate('onboarding');
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (gate === 'loading') {
    return (
      <LabDashboardShell>
        <PageSkeleton />
      </LabDashboardShell>
    );
  }

  if (gate === 'onboarding') {
    return (
      <LabDashboardShell>
        <WorkshopOnboardingWizard
          initialData={profile ?? undefined}
          onNavigate={onNavigate}
          onShowToast={onShowToast}
          // Hồ sơ đã gửi nhưng còn 'Pending': wizard vẫn là cổng vào (theo brief Đợt 10
          // §W1a), nhưng KHÔNG được biến thành ngõ cụt — xưởng phải mở được bảng điều khiển.
          // KHÔNG chuyển gate ở `onComplete`: giữ wizard để hiện BƯỚC 4 (chờ duyệt);
          // chỉ khi bấm "Mở bảng điều khiển" (onSkipToDashboard) mới vào MES.
          onSkipToDashboard={() => setGate('ready')}
        />
      </LabDashboardShell>
    );
  }

  return (
    <LabDashboardShell>
      <WorkshopSettingsView onNavigate={onNavigate} onShowToast={onShowToast} />
    </LabDashboardShell>
  );
};
