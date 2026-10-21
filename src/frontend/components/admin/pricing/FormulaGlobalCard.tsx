import React from 'react';
import { Icon, InfoTip, Button } from '@frontend/ui';
import { VAT_MAX_PERCENT, VAT_MIN_PERCENT, MARKETPLACE_FEE_MAX_PERCENT, MARKETPLACE_FEE_MIN_PERCENT } from '../../../../backend/services/settingsService';
import { formatNumber } from '../../../lib/format';
import { FieldError, PREVIEW_EXAMPLE, PREVIEW_KWH, formatPreviewDelta, formatPreviewVnd } from './pricingShared';
import type { FormulaGlobalCardProps } from './types';

export const FormulaGlobalCard: React.FC<FormulaGlobalCardProps> = (props) => {
  const { handleSaveGlobalSettings, globalSaving, globalIsReference, globalForm, setGlobalForm, setGlobalIssues, globalIssues, previewRows } = props;

  return (
          <div className="space-y-4 rounded-lg border border-line-subtle bg-surface p-6">
            <div className="flex flex-col justify-between gap-3 border-b border-line-subtle pb-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-sm bg-primary-tint font-bold text-primary">
                  <Icon name="receipt_long" size={18} />
                </span>
                <div>
                  <h3 className="flex items-center gap-1.5 text-base font-semibold tracking-tight text-fg">
                    0. Cấu Hình Chung Toàn Hệ Thống (VAT · Điện · Nhân Công)
                    <InfoTip label="Cấu hình chung được lưu ở đâu?">
                      Lưu ở bảng <span className="font-mono tabular-nums">pricing_global_settings</span> (kho riêng, có audit).
                      Ô trống = <strong>chưa cấu hình</strong> — hệ thống KHÔNG tự điền một con số đoán.
                    </InfoTip>
                  </h3>
                </div>
              </div>
              <Button
                type="button"
                variant="primary"
                onClick={handleSaveGlobalSettings}
                disabled={globalSaving}
                loading={globalSaving}
                loadingLabel="Đang lưu…"
                leadingIcon={<Icon name="save" size={16} />}
                className="shrink-0"
              >
                Lưu Cấu Hình Chung
              </Button>
            </div>

            <div
              className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 ${
                globalIsReference ? '[&_input]:border-dashed [&_input]:border-warning [&_input]:bg-warning-tint/40' : ''
              }`}
            >
              <div>
                <label htmlFor="pricing-global-vat" className="mb-1.5 block text-sm font-medium text-fg">
                  Thuế VAT (%)
                </label>
                <input
                  id="pricing-global-vat"
                  type="number"
                  min={VAT_MIN_PERCENT}
                  max={VAT_MAX_PERCENT}
                  step="0.1"
                  placeholder="Chưa cấu hình"
                  value={globalForm.vatPercent}
                  onChange={(e) => {
                    const value = e.target.value;
                    setGlobalForm((prev) => ({ ...prev, vatPercent: value }));
                    setGlobalIssues((prev) => { if (!('vatPercent' in prev)) return prev; const next = { ...prev }; delete next.vatPercent; return next; });
                  }}
                  aria-invalid={!!globalIssues.vatPercent}
                  aria-describedby={globalIssues.vatPercent ? 'pricing-global-vat-error pricing-global-vat-hint' : 'pricing-global-vat-hint'}
                  className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 text-right font-mono text-sm font-bold tabular-nums text-fg focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <FieldError id="pricing-global-vat" message={globalIssues.vatPercent} />
                <p id="pricing-global-vat-hint" className="mt-1.5 text-xs text-fg-muted">
                  Khoảng {VAT_MIN_PERCENT}–{VAT_MAX_PERCENT}%. Bỏ trống = chưa cấu hình (KHÔNG mặc định 8%).
                </p>
              </div>

              <div>
                <label htmlFor="pricing-global-electricity" className="mb-1.5 block text-sm font-medium text-fg">
                  Đơn giá điện toàn hệ thống (VNĐ / kWh)
                </label>
                <input
                  id="pricing-global-electricity"
                  type="number"
                  min="0"
                  step="50"
                  placeholder="Chưa cấu hình"
                  value={globalForm.electricityRateVnd}
                  onChange={(e) => {
                    const value = e.target.value;
                    setGlobalForm((prev) => ({ ...prev, electricityRateVnd: value }));
                    setGlobalIssues((prev) => { if (!('electricityRateVnd' in prev)) return prev; const next = { ...prev }; delete next.electricityRateVnd; return next; });
                  }}
                  aria-invalid={!!globalIssues.electricityRateVnd}
                  aria-describedby={globalIssues.electricityRateVnd ? 'pricing-global-electricity-error pricing-global-electricity-hint' : 'pricing-global-electricity-hint'}
                  className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 text-right font-mono text-sm font-bold tabular-nums text-fg focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <FieldError id="pricing-global-electricity" message={globalIssues.electricityRateVnd} />
                <p id="pricing-global-electricity-hint" className="mt-1.5 text-xs text-fg-muted">Bỏ trống = chưa cấu hình (KHÔNG mặc định 2850).</p>
              </div>

              <div>
                <label htmlFor="pricing-global-labor" className="mb-1.5 block text-sm font-medium text-fg">
                  Đơn giá nhân công toàn hệ thống (VNĐ / giờ)
                </label>
                <input
                  id="pricing-global-labor"
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="Chưa cấu hình"
                  value={globalForm.laborHourlyRateVnd}
                  onChange={(e) => {
                    const value = e.target.value;
                    setGlobalForm((prev) => ({ ...prev, laborHourlyRateVnd: value }));
                    setGlobalIssues((prev) => { if (!('laborHourlyRateVnd' in prev)) return prev; const next = { ...prev }; delete next.laborHourlyRateVnd; return next; });
                  }}
                  aria-invalid={!!globalIssues.laborHourlyRateVnd}
                  aria-describedby={globalIssues.laborHourlyRateVnd ? 'pricing-global-labor-error pricing-global-labor-hint' : 'pricing-global-labor-hint'}
                  className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 text-right font-mono text-sm font-bold tabular-nums text-fg focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <FieldError id="pricing-global-labor" message={globalIssues.laborHourlyRateVnd} />
                <p id="pricing-global-labor-hint" className="mt-1.5 text-xs text-fg-muted">Bỏ trống = chưa cấu hình (KHÔNG mặc định 65000).</p>
              </div>

              <div>
                <label htmlFor="pricing-global-marketplace-fee" className="mb-1.5 block text-sm font-medium text-fg">
                  Phí nền tảng toàn hệ thống (%)
                </label>
                <input
                  id="pricing-global-marketplace-fee"
                  type="number"
                  min={MARKETPLACE_FEE_MIN_PERCENT}
                  max={MARKETPLACE_FEE_MAX_PERCENT}
                  step="0.5"
                  placeholder="Chưa cấu hình"
                  value={globalForm.marketplaceFeePercent}
                  onChange={(e) => {
                    const value = e.target.value;
                    setGlobalForm((prev) => ({ ...prev, marketplaceFeePercent: value }));
                    setGlobalIssues((prev) => { if (!('marketplaceFeePercent' in prev)) return prev; const next = { ...prev }; delete next.marketplaceFeePercent; return next; });
                  }}
                  aria-invalid={!!globalIssues.marketplaceFeePercent}
                  aria-describedby={globalIssues.marketplaceFeePercent ? 'pricing-global-marketplace-fee-error pricing-global-marketplace-fee-hint' : 'pricing-global-marketplace-fee-hint'}
                  className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 text-right font-mono text-sm font-bold tabular-nums text-fg focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <FieldError id="pricing-global-marketplace-fee" message={globalIssues.marketplaceFeePercent} />
                <p id="pricing-global-marketplace-fee-hint" className="mt-1.5 text-xs text-fg-muted">
                  Cột <span className="font-mono tabular-nums">marketplace_fee_percent</span>, khoảng {MARKETPLACE_FEE_MIN_PERCENT}–{MARKETPLACE_FEE_MAX_PERCENT}%. Bỏ trống = chưa cấu hình (KHÔNG mặc định 8).
                </p>
                <p className="text-xs text-fg-muted mt-1 leading-relaxed">
                  Đây là <strong>nguồn DUY NHẤT</strong> của phí nền tảng: bộ tính giá đọc đúng cột này.
                  Ô "Phí nền tảng" trong công thức (mục 5) đã bị <strong>vô hiệu</strong> — bộ tính giá không đọc nữa.
                </p>
              </div>
            </div>

            {/* BẢN XEM TRƯỚC TÁC ĐỘNG — ví dụ minh hoạ, tham số cố định in rõ bên dưới */}
            <div className="space-y-2 border-t border-line-subtle pt-4">
              <div className="flex items-center gap-1.5">
                <Icon name="calculate" size={18} className="text-primary" />
                <h4 className="text-sm font-semibold text-fg">Xem trước tác động lên một ví dụ minh hoạ</h4>
              </div>
              <p className="text-xs text-fg-muted leading-relaxed">
                Ví dụ minh hoạ, tham số CỐ ĐỊNH: máy in {PREVIEW_EXAMPLE.powerKW} kW chạy {PREVIEW_EXAMPLE.printHours} giờ
                ({formatNumber(PREVIEW_KWH)} kWh) · {PREVIEW_EXAMPLE.laborMinutes} phút nhân công ·
                tiền hàng mẫu {formatNumber(PREVIEW_EXAMPLE.goodsVnd)} ₫. Đây KHÔNG phải số liệu của một đơn hàng thật.
              </p>
              <div className="overflow-x-auto rounded-lg border border-line">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-muted text-xs uppercase tracking-wider text-fg-subtle">
                    <tr>
                      <th className="h-10 px-4 text-left font-semibold">Hạng mục (ví dụ)</th>
                      <th className="h-10 px-4 text-right font-semibold">Đang lưu (DB)</th>
                      <th className="h-10 px-4 text-right font-semibold">Đang gõ</th>
                      <th className="h-10 px-4 text-right font-semibold">Chênh lệch</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono tabular-nums">
                    {previewRows.map((row) => (
                      <tr key={row.key} className="border-t border-line-subtle hover:bg-surface-muted/60">
                        <td className="px-4 py-2.5 text-fg-muted">{row.label}</td>
                        <td className="px-4 py-2.5 text-right text-fg">{formatPreviewVnd(row.saved)}</td>
                        <td className="px-4 py-2.5 text-right text-fg">{formatPreviewVnd(row.typed)}</td>
                        <td className={`px-4 py-2.5 text-right font-bold ${
                          row.saved === null || row.typed === null
                            ? 'text-fg-subtle'
                            : row.typed === row.saved
                            ? 'text-fg-subtle'
                            : 'text-warning'
                        }`}>
                          {formatPreviewDelta(row.saved, row.typed)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <p className="border-t border-line-subtle pt-3 text-xs italic text-fg-muted">
              * Kho này là cấu hình CHUNG (VAT · điện · nhân công). Từ Đợt 9 (R1) bộ tính giá ĐỌC THẬT kho này:
              thiếu đơn giá điện hoặc đơn giá nhân công ⇒ bộ tính giá CHẶN việc tính giá và nêu đích danh tham số còn thiếu
              (không còn rơi về 2850/65000 viết trong mã); <span className="font-mono tabular-nums">vat_percent</span> để trống
              ⇒ mọi màn hình ẩn dòng VAT và ghi rõ "VAT chưa được cấu hình".
              Các hệ số còn lại của công thức vẫn nằm ở bảng<span className="font-mono tabular-nums"> pricing_configs</span> bên dưới.
            </p>
          </div>
  );
};
