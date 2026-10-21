// SettingsHeader (PageHeader + segmented 6 tab) — tách từ WorkshopSettingsView.tsx (Phase 4c).
import { ArrowDownToLine, MapPin, RefreshCw, ShieldCheck } from 'lucide-react';
import { Badge, Button, PageHeader } from '@frontend/ui';
import { EMPTY_VALUE } from '@frontend/lib/format';
import { LAB_TAB_IDS, LAB_TAB_LABELS } from './tabs';
import type { WorkshopSettingsController } from './types';


export interface SettingsHeaderProps {
  ctl: WorkshopSettingsController;
}

export const SettingsHeader: React.FC<SettingsHeaderProps> = ({ ctl }) => {
  const { profile, partnerId, refreshAll, openLogModal, activeTab, setActiveTab } = ctl;

  return (
    <>
            <PageHeader
              title={
                <span className="flex flex-wrap items-center gap-2">
                  <span>{profile.workshopName || 'Xưởng chưa đặt tên'}</span>
                  <Badge
                    variant={
                      profile.verifiedStatus === 'Verified'
                        ? 'success'
                        : profile.verifiedStatus === 'Suspended'
                          ? 'danger'
                          : 'warning'
                    }
                    icon={<ShieldCheck className="size-3.5" aria-hidden="true" />}
                  >
                    {profile.verifiedStatus === 'Verified'
                      ? 'Đã duyệt'
                      : profile.verifiedStatus === 'Suspended'
                        ? 'Tạm ngưng'
                        : 'Chờ duyệt'}
                  </Badge>
                </span>
              }
              description={
                <span className="flex flex-wrap items-center gap-2">
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3.5" aria-hidden="true" />
                    Khu vực: <strong>{profile.region || EMPTY_VALUE}</strong>
                  </span>
                  <span aria-hidden="true">•</span>
                  <span>
                    Mã đối tác: <strong className="font-mono">{partnerId || 'chưa gắn'}</strong>
                  </span>
                  {profile.contactPhone ? (
                    <>
                      <span aria-hidden="true">•</span>
                      <span>Đường dây nóng: {profile.contactPhone}</span>
                    </>
                  ) : null}
                </span>
              }
              actions={
                <>
                  <Button
                    variant="secondary"
                    leadingIcon={<RefreshCw className="size-4" />}
                    onClick={() => void refreshAll()}
                  >
                    Tải lại
                  </Button>
                  <Button
                    variant="primary"
                    leadingIcon={<ArrowDownToLine className="size-4" />}
                    onClick={() => openLogModal()}
                  >
                    Ghi phiếu kho
                  </Button>
                </>
              }
            />

            {/* Segmented control §3.6 — URL `/lab/<tab>` vẫn là nguồn sự thật duy nhất. */}
            <nav aria-label="Mục điều hướng xưởng" className="w-full overflow-x-auto">
              <div className="inline-flex min-w-full items-center gap-1 rounded-full border border-line bg-surface-muted p-1 sm:min-w-0">
                {LAB_TAB_IDS.map((tabId) => {
                  const isActive = activeTab === tabId;
                  return (
                    <button
                      key={tabId}
                      type="button"
                      aria-current={isActive ? 'page' : undefined}
                      onClick={() => setActiveTab(tabId)}
                      className={`inline-flex min-h-9 items-center justify-center whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-md:min-h-11 motion-reduce:transition-none ${
                        isActive
                          ? 'bg-surface font-semibold text-fg shadow-soft'
                          : 'font-medium text-fg-muted hover:text-fg'
                      }`}
                    >
                      {LAB_TAB_LABELS[tabId]}
                    </button>
                  );
                })}
              </div>
            </nav>
    </>
  );
};

export default SettingsHeader;
