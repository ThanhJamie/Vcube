// SettingsBanners (cảnh báo chưa gắn partner_id / trùng hồ sơ) — tách từ WorkshopSettingsView.tsx (Phase 4c).
import type { WorkshopSettingsController } from './types';
import { Icon } from '@frontend/ui';


export interface SettingsBannersProps {
  ctl: WorkshopSettingsController;
}

export const SettingsBanners: React.FC<SettingsBannersProps> = ({ ctl }) => {
  const { hasPartner, setActiveTab, duplicateProfiles, profile } = ctl;

  return (
    <>
              {!hasPartner ? (
                <div className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-warning/40 bg-warning-tint px-3 py-2 text-xs text-warning">
                  <Icon name="warning" className="size-4 shrink-0" aria-hidden="true" />
                  <span className="font-semibold">
                    Tài khoản chưa gắn <code className="font-mono">partner_id</code> — không nhận được đơn tự động.
                  </span>
                  <span className="hidden text-fg-muted sm:inline">
                    Máy in, vật liệu và phụ kiện bạn tự khai vẫn hoạt động bình thường.
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('preferences')}
                    className="ml-auto font-bold underline underline-offset-2 hover:no-underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                  >
                    Xem cấu hình xưởng
                  </button>
                </div>
              ) : null}

              {duplicateProfiles > 1 ? (
                <div className="mb-4 flex flex-wrap items-center gap-2 rounded-md border border-warning/40 bg-warning-tint px-3 py-2 text-xs text-fg-muted">
                  <Icon name="warning" className="size-4 shrink-0 text-warning" aria-hidden="true" />
                  <span>
                    Có <strong className="text-fg">{duplicateProfiles}</strong> hồ sơ xưởng — đang dùng hồ sơ mới nhất{' '}
                    <code className="font-mono">{profile.id}</code>. Nhờ quản trị viên dọn hồ sơ trùng.
                  </span>
                </div>
              ) : null}
    </>
  );
};

export default SettingsBanners;
