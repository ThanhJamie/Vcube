import React from 'react';
import { Icon } from '@frontend/ui';
import { FieldError } from './pricingShared';
import type { FormulaAddonSectionsProps } from './types';

export const FormulaAddonSections: React.FC<FormulaAddonSectionsProps> = (props) => {
  const { formulaForm, updateFormulaField, formulaIssues } = props;

  return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-4 rounded-lg border border-line-subtle bg-surface p-6">
              <div className="flex items-center gap-2 border-b border-line-subtle pb-3">
                <span className="w-8 h-8 rounded-sm bg-info-tint text-info flex items-center justify-center font-bold">
                  <Icon name="edit_note" size={18} />
                </span>
                <div>
                  <h3 className="text-base font-semibold tracking-tight text-fg">5. Phí Dịch Vụ Cá Nhân Hóa</h3>
                  <p className="text-xs text-fg-muted">Khắc laser, đùn nổi & logo vector</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label htmlFor="cfg-engraving-fee" className="mb-1.5 block text-sm font-medium text-fg-muted">
                    Phí khắc tên / Laser / Chữ nổi (VNĐ)
                  </label>
                  <input
                    id="cfg-engraving-fee"
                    type="number"
                    step="5000"
                    min="0"
                    placeholder="Chưa cấu hình"
                    value={formulaForm.customEngravingFee ?? ''}
                    onChange={(e) => updateFormulaField('customEngravingFee', e.target.value)}
                    aria-invalid={!!formulaIssues.customEngravingFee}
                    aria-describedby={formulaIssues.customEngravingFee ? 'cfg-engraving-fee-error' : undefined}
                    className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 text-right font-mono text-sm font-bold tabular-nums text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <FieldError id="cfg-engraving-fee" message={formulaIssues.customEngravingFee} />
                  <p className="mt-1.5 text-xs text-fg-muted">Áp dụng khi khách yêu cầu khắc text cá nhân hóa trên sản phẩm</p>
                </div>

                <div>
                  <label htmlFor="cfg-logo-fee" className="mb-1.5 block text-sm font-medium text-fg-muted">
                    Phí xử lý & Đùn Logo Doanh Nghiệp (VNĐ)
                  </label>
                  <input
                    id="cfg-logo-fee"
                    type="number"
                    step="5000"
                    min="0"
                    placeholder="Chưa cấu hình"
                    value={formulaForm.customLogoUploadFee ?? ''}
                    onChange={(e) => updateFormulaField('customLogoUploadFee', e.target.value)}
                    aria-invalid={!!formulaIssues.customLogoUploadFee}
                    aria-describedby={formulaIssues.customLogoUploadFee ? 'cfg-logo-fee-error' : undefined}
                    className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 text-right font-mono text-sm font-bold tabular-nums text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <FieldError id="cfg-logo-fee" message={formulaIssues.customLogoUploadFee} />
                  <p className="mt-1.5 text-xs text-fg-muted">Xử lý vector SVG/PNG sang dạng 3D dập nổi/chìm</p>
                </div>
              </div>
            </div>

            {/* Section 6: Delivery Packages Config */}
            <div className="space-y-4 rounded-lg border border-line-subtle bg-surface p-6">
              <div className="flex items-center gap-2 border-b border-line-subtle pb-3">
                <span className="w-8 h-8 rounded-sm bg-primary-tint text-primary flex items-center justify-center font-bold">
                  <Icon name="local_shipping" size={18} />
                </span>
                <div>
                  <h3 className="text-base font-semibold tracking-tight text-fg">6. Gói Giao Hàng & Hỏa Tốc</h3>
                  <p className="text-xs text-fg-muted">Chiết khấu ghép khay & phụ phí gấp</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label htmlFor="cfg-economy-discount" className="mb-1.5 block text-sm font-medium text-fg-muted">
                    Chiết khấu Gói Tiết Kiệm (5-7 ngày) (%)
                  </label>
                  <div className="relative">
                    <input
                      id="cfg-economy-discount"
                      type="number"
                      min="0"
                      max="30"
                      placeholder="Chưa cấu hình"
                      value={formulaForm.economyDiscountPercent ?? ''}
                      onChange={(e) => updateFormulaField('economyDiscountPercent', e.target.value)}
                      aria-invalid={!!formulaIssues.economyDiscountPercent}
                      aria-describedby={formulaIssues.economyDiscountPercent ? 'cfg-economy-discount-error' : undefined}
                      className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface py-2 pl-3 pr-10 text-right font-mono text-sm font-bold tabular-nums text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-fg-muted font-mono tabular-nums">%</span>
                  </div>
                  <FieldError id="cfg-economy-discount" message={formulaIssues.economyDiscountPercent} />
                  <p className="mt-1.5 text-xs text-fg-muted">Giảm giá cho khách chấp nhận chờ xưởng gom đủ mẻ in</p>
                </div>

                <div>
                  <label htmlFor="cfg-express-surcharge" className="mb-1.5 block text-sm font-medium text-fg-muted">
                    Phụ phí Gói Hỏa Tốc 24H (%)
                  </label>
                  <div className="relative">
                    <input
                      id="cfg-express-surcharge"
                      type="number"
                      min="0"
                      max="100"
                      placeholder="Chưa cấu hình"
                      value={formulaForm.expressRushSurchargePercent ?? ''}
                      onChange={(e) => updateFormulaField('expressRushSurchargePercent', e.target.value)}
                      aria-invalid={!!formulaIssues.expressRushSurchargePercent}
                      aria-describedby={formulaIssues.expressRushSurchargePercent ? 'cfg-express-surcharge-error' : undefined}
                      className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface py-2 pl-3 pr-10 text-right font-mono text-sm font-bold tabular-nums text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-fg-muted font-mono tabular-nums">%</span>
                  </div>
                  <FieldError id="cfg-express-surcharge" message={formulaIssues.expressRushSurchargePercent} />
                  <p className="mt-1.5 text-xs text-fg-muted">Phụ thu ưu tiên chen hàng vào máy và ca trực đêm</p>
                </div>
              </div>
            </div>

            {/* Section 7: Slicing Model Constants */}
            <div className="space-y-4 rounded-lg border border-line-subtle bg-surface p-6">
              <div className="flex items-center gap-2 border-b border-line-subtle pb-3">
                <span className="w-8 h-8 rounded-sm bg-warning-tint text-warning flex items-center justify-center font-bold">
                  <Icon name="tune" size={18} />
                </span>
                <div>
                  <h3 className="text-base font-semibold tracking-tight text-fg">7. Tham Số Cắt Lớp & Tháp Xả</h3>
                  <p className="text-xs text-fg-muted">Hệ số tiêu hao vật liệu đỡ, đế bám & AMS</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <label htmlFor="cfg-support-ratio" className="mb-1.5 block text-sm font-medium text-fg-muted">
                    Tỷ lệ vật liệu đỡ (%)
                  </label>
                  <input
                    id="cfg-support-ratio"
                    type="number"
                    min="0"
                    max="50"
                    placeholder="Chưa cấu hình"
                    value={formulaForm.supportVolumeRatioPercent ?? ''}
                    onChange={(e) => updateFormulaField('supportVolumeRatioPercent', e.target.value)}
                    aria-invalid={!!formulaIssues.supportVolumeRatioPercent}
                    aria-describedby={formulaIssues.supportVolumeRatioPercent ? 'cfg-support-ratio-error' : undefined}
                    className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 text-right font-mono text-sm font-bold tabular-nums text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <FieldError id="cfg-support-ratio" message={formulaIssues.supportVolumeRatioPercent} />
                </div>
                <div>
                  <label htmlFor="cfg-brim-grams" className="mb-1.5 block text-sm font-medium text-fg-muted">
                    Nhựa đế bám/bè đỡ (g)
                  </label>
                  <input
                    id="cfg-brim-grams"
                    type="number"
                    min="0"
                    max="30"
                    placeholder="Chưa cấu hình"
                    value={formulaForm.brimRaftGrams ?? ''}
                    onChange={(e) => updateFormulaField('brimRaftGrams', e.target.value)}
                    aria-invalid={!!formulaIssues.brimRaftGrams}
                    aria-describedby={formulaIssues.brimRaftGrams ? 'cfg-brim-grams-error' : undefined}
                    className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 text-right font-mono text-sm font-bold tabular-nums text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <FieldError id="cfg-brim-grams" message={formulaIssues.brimRaftGrams} />
                </div>
                <div>
                  <label htmlFor="cfg-purge-grams" className="mb-1.5 block text-sm font-medium text-fg-muted">
                    Xả nhựa tháp xả / màu (g)
                  </label>
                  <input
                    id="cfg-purge-grams"
                    type="number"
                    min="0"
                    max="100"
                    placeholder="Chưa cấu hình"
                    value={formulaForm.multiColorPurgeWasteGrams ?? ''}
                    onChange={(e) => updateFormulaField('multiColorPurgeWasteGrams', e.target.value)}
                    aria-invalid={!!formulaIssues.multiColorPurgeWasteGrams}
                    aria-describedby={formulaIssues.multiColorPurgeWasteGrams ? 'cfg-purge-grams-error' : undefined}
                    className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 text-right font-mono text-sm font-bold tabular-nums text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <FieldError id="cfg-purge-grams" message={formulaIssues.multiColorPurgeWasteGrams} />
                </div>
                <div>
                  <label htmlFor="cfg-toolchange-mins" className="mb-1.5 block text-sm font-medium text-fg-muted">
                    Đổi màu AMS (phút)
                  </label>
                  <input
                    id="cfg-toolchange-mins"
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="Chưa cấu hình"
                    value={formulaForm.multiColorToolChangeMins ?? ''}
                    onChange={(e) => updateFormulaField('multiColorToolChangeMins', e.target.value)}
                    aria-invalid={!!formulaIssues.multiColorToolChangeMins}
                    aria-describedby={formulaIssues.multiColorToolChangeMins ? 'cfg-toolchange-mins-error' : undefined}
                    className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 text-right font-mono text-sm font-bold tabular-nums text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <FieldError id="cfg-toolchange-mins" message={formulaIssues.multiColorToolChangeMins} />
                </div>
                <div>
                  <label htmlFor="cfg-fast-estimator-overhead" className="mb-1.5 block text-sm font-medium text-fg-muted">
                    Phụ phí vận hành bộ tính nhanh (VNĐ)
                  </label>
                  <input
                    id="cfg-fast-estimator-overhead"
                    type="number"
                    min="0"
                    step="1000"
                    placeholder="Chưa cấu hình"
                    value={formulaForm.fastEstimatorBaseOverhead ?? ''}
                    onChange={(e) => updateFormulaField('fastEstimatorBaseOverhead', e.target.value)}
                    aria-invalid={!!formulaIssues.fastEstimatorBaseOverhead}
                    aria-describedby={formulaIssues.fastEstimatorBaseOverhead ? 'cfg-fast-estimator-overhead-error' : undefined}
                    className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 text-right font-mono text-sm font-bold tabular-nums text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <FieldError id="cfg-fast-estimator-overhead" message={formulaIssues.fastEstimatorBaseOverhead} />
                  <p className="text-xs text-fg-muted mt-0.5">
                    Chỉ dùng cho bộ ước lượng nhanh ở trang chủ; bộ tính giá KHÔNG đọc ô này.
                  </p>
                </div>
              </div>
            </div>
          </div>
  );
};
