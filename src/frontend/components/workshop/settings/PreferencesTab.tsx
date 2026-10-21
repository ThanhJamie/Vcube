// PreferencesTab — tách từ WorkshopSettingsView.tsx (Phase 4c, block-move verbatim; parent giữ state).
import { Settings, TriangleAlert } from 'lucide-react';
import { Button, Card, Field, Input, Select } from '@frontend/ui';
import { formatCurrency, formatDate, EMPTY_VALUE } from '@frontend/lib/format';
import { REGION_OPTIONS, digitsOnly } from './helpers';
import type { WorkshopSettingsController } from './types';


export interface PreferencesTabProps {
  ctl: WorkshopSettingsController;
}

export const PreferencesTab: React.FC<PreferencesTabProps> = ({ ctl }) => {
  const { handleSavePreferences, prefAddress, prefElectricity, prefEmail,
    prefLabor, prefName, prefPhone, prefRegion,
    profile, savingPref, setPrefAddress, setPrefElectricity,
    setPrefEmail, setPrefLabor, setPrefName, setPrefPhone,
    setPrefRegion } = ctl;

  return (
<section className="max-w-3xl">
            <Card padding="lg">
              <form onSubmit={handleSavePreferences} className="flex flex-col gap-5">
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-fg">
                    <Settings className="size-5 text-primary" aria-hidden="true" />
                    Cấu hình xưởng & đơn giá riêng
                  </h2>
                  <p className="mt-0.5 text-xs text-fg-subtle">
                    Đơn giá điện và nhân công dưới đây là <strong>của riêng xưởng bạn</strong>. Để trống nghĩa
                    là <strong>chưa cấu hình</strong> — hệ thống sẽ không tự điền một con số nào thay bạn.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="Tên xưởng in" required>
                    {(control) => (
                      <Input {...control} value={prefName} onChange={(e) => setPrefName(e.target.value)} />
                    )}
                  </Field>

                  <Field label="Khu vực điều phối">
                    {(control) => (
                      <Select
                        {...control}
                        options={
                          prefRegion && !REGION_OPTIONS.some((o) => o.value === prefRegion)
                            ? [{ value: prefRegion, label: `${prefRegion} (giá trị cũ — nên đổi sang Nam)` }, ...REGION_OPTIONS]
                            : REGION_OPTIONS
                        }
                        value={prefRegion}
                        onChange={(e) => setPrefRegion(e.target.value)}
                      />
                    )}
                  </Field>

                  <Field label="Số điện thoại liên hệ">
                    {(control) => (
                      <Input
                        {...control}
                        value={prefPhone}
                        onChange={(e) => setPrefPhone(digitsOnly(e.target.value))}
                      />
                    )}
                  </Field>

                  <Field label="Email kỹ thuật">
                    {(control) => (
                      <Input
                        {...control}
                        type="email"
                        value={prefEmail}
                        onChange={(e) => setPrefEmail(e.target.value)}
                      />
                    )}
                  </Field>
                </div>

                <Field label="Địa chỉ xưởng thực tế">
                  {(control) => (
                    <Input {...control} value={prefAddress} onChange={(e) => setPrefAddress(e.target.value)} />
                  )}
                </Field>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Card padding="md">
                    <Field
                      label="Đơn giá điện xưởng (VND/kWh)"
                      hint="Để trống = chưa cấu hình. Trang này không lấy và không ghi cấu hình giá toàn hệ thống."
                    >
                      {(control) => (
                        <Input
                          {...control}
                          numeric
                          value={prefElectricity}
                          onChange={(e) => setPrefElectricity(e.target.value.replace(/[^\d]/g, ''))}
                          placeholder="—"
                        />
                      )}
                    </Field>
                    <p className="mt-2 text-xs text-fg-subtle">
                      Hiện tại:{' '}
                      {profile.electricityRateOverride != null ? (
                        <strong className="tabular-nums text-fg">
                          {formatCurrency(profile.electricityRateOverride)}/kWh
                        </strong>
                      ) : (
                        <strong className="inline-flex items-center gap-1 text-warning">
                          <TriangleAlert className="size-3.5" aria-hidden="true" /> Chưa cấu hình — cần bổ sung để tính giá tự động
                        </strong>
                      )}
                    </p>
                  </Card>

                  <Card padding="md">
                    <Field
                      label="Chi phí nhân công xưởng (VND/giờ)"
                      hint="Để trống = chưa cấu hình. Không dùng số mặc định nào của hệ thống."
                    >
                      {(control) => (
                        <Input
                          {...control}
                          numeric
                          value={prefLabor}
                          onChange={(e) => setPrefLabor(e.target.value.replace(/[^\d]/g, ''))}
                          placeholder="—"
                        />
                      )}
                    </Field>
                    <p className="mt-2 text-xs text-fg-subtle">
                      Hiện tại:{' '}
                      {profile.laborRateOverride != null ? (
                        <strong className="tabular-nums text-fg">
                          {formatCurrency(profile.laborRateOverride)}/giờ
                        </strong>
                      ) : (
                        <strong className="inline-flex items-center gap-1 text-warning">
                          <TriangleAlert className="size-3.5" aria-hidden="true" /> Chưa cấu hình — cần bổ sung để tính giá tự động
                        </strong>
                      )}
                    </p>
                  </Card>
                </div>

                <div className="flex justify-end border-t border-line-subtle pt-4">
                  <Button type="submit" variant="primary" loading={savingPref} loadingLabel="Đang lưu…">
                    Lưu cấu hình xưởng
                  </Button>
                </div>
              </form>
            </Card>

            <Card className="mt-4" padding="md">
              <p className="text-xs text-fg-muted">
                Cập nhật lần cuối:{' '}
                <strong>{profile.updatedAt ? formatDate(profile.updatedAt) : EMPTY_VALUE}</strong> · Mã hồ sơ:{' '}
                <code className="font-mono">{profile.id}</code>
              </p>
            </Card>
          </section>
  );
};

export default PreferencesTab;
