// SettingsStates — 3 trạng thái chặn render của WorkshopSettingsView (Phase 4c, block-move).
import { Building2, RefreshCw, TriangleAlert } from 'lucide-react';
import { Button, EmptyState, Skeleton } from '@frontend/ui';
import type { AuthUser } from '@frontend/context/AuthContext';


export const SettingsLoadingState: React.FC = () => (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6" role="status" aria-label="Đang tải hồ sơ xưởng">
            <div className="space-y-2">
              <Skeleton variant="text" width="55%" height="1.75rem" />
              <Skeleton variant="text" width="80%" />
            </div>
            <Skeleton variant="rect" height="2.5rem" rounded="md" />
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[0, 1, 2, 3].map((card) => (
                <div key={card} className="space-y-3 rounded-lg border border-line bg-surface p-4">
                  <Skeleton variant="text" width="50%" />
                  <Skeleton variant="text" width="70%" height="1.75rem" />
                  <Skeleton variant="text" width="40%" />
                </div>
              ))}
            </div>
            <div className="space-y-3 rounded-lg border border-line bg-surface p-4">
              {[0, 1, 2, 3, 4].map((row) => (
                <Skeleton key={row} variant="text" width={row % 2 === 0 ? '90%' : '70%'} />
              ))}
            </div>
            <p className="text-sm text-fg-muted">
              Đang đối chiếu tài khoản đăng nhập với hồ sơ xưởng để chỉ hiển thị dữ liệu của chính bạn.
            </p>
          </div>
);

export const SettingsErrorState: React.FC<{ profileError: string; onRetry: () => void }> = ({ profileError, onRetry }) => (
    <div className="mx-auto w-full max-w-3xl">
              <EmptyState
                live
                icon={<TriangleAlert className="size-5" />}
                title="Không đọc được hồ sơ xưởng"
                description={`Máy chủ trả lỗi: ${profileError}. Chưa có dữ liệu nào của xưởng được hiển thị để tránh cho bạn xem nhầm dữ liệu của xưởng khác.`}
                action={
                  <Button variant="secondary" leadingIcon={<RefreshCw className="size-4" />} onClick={onRetry}>
                    Thử lại
                  </Button>
                }
              />
          </div>
);

export const SettingsMissingProfile: React.FC<{ user: AuthUser; onNavigate?: (screen: string, payload?: any) => void }> = ({ user, onNavigate }) => (
    <div className="mx-auto w-full max-w-3xl">
              <EmptyState
                live
                icon={<Building2 className="size-5" />}
                title="Tài khoản này chưa có hồ sơ xưởng"
                description={
                  user?.email
                    ? `Tài khoản ${user.email} chưa được gắn hồ sơ xưởng trong bảng workshop_profiles, nên chưa có dữ liệu nào để hiển thị. Hãy hoàn tất khai báo xưởng trước.`
                    : 'Bạn chưa đăng nhập nên chưa xác định được xưởng nào là của bạn. Hãy đăng nhập bằng tài khoản xưởng.'
                }
                action={
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <Button variant="primary" onClick={() => onNavigate?.('auth')}>
                      {user?.email ? 'Khai báo xưởng' : 'Đăng nhập'}
                    </Button>
                    <Button variant="secondary" onClick={() => onNavigate?.('home')}>
                      Về cửa hàng
                    </Button>
                  </div>
                }
              />
          </div>
);
