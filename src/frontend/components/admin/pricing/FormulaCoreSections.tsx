import React from 'react';
import { Icon } from '@frontend/ui';
import { formatNumber } from '../../../lib/format';
import { FieldError, isConfiguredNumber } from './pricingShared';
import type { FormulaCoreSectionsProps } from './types';

export const FormulaCoreSections: React.FC<FormulaCoreSectionsProps> = (props) => {
  const { formulaIsReference, formulaForm, updateFormulaField, formulaIssues, totalLaborMins, laborCostPerUnit, setFormulaForm, updateFormulaSelect } = props;

  return (
          <div
            className={`grid grid-cols-1 lg:grid-cols-3 gap-6 ${
              formulaIsReference ? '[&_input]:border-dashed [&_input]:border-warning [&_input]:bg-warning-tint/40' : ''
            }`}
          >

            {/* Section 1: Electricity & Energy */}
            <div className="space-y-4 rounded-lg border border-line-subtle bg-surface p-6">
              <div className="flex items-center gap-2 border-b border-line-subtle pb-3">
                <span className="w-8 h-8 rounded-sm bg-warning-tint text-warning flex items-center justify-center font-bold">
                  <Icon name="bolt" size={18} />
                </span>
                <div>
                  <h3 className="text-base font-semibold tracking-tight text-fg">1. Đơn Giá Điện Năng</h3>
                  <p className="text-xs text-fg-muted">Điện sản xuất kinh doanh EVN</p>
                </div>
              </div>

              <div className="space-y-2 rounded-md border border-warning/20 bg-warning-tint p-4">
                <p className="text-xs font-bold text-warning flex items-start gap-1.5">
                  <Icon name="warning" size={18} className="text-warning shrink-0" />
                  <span>Ô NÀY ĐÃ HẾT TÁC DỤNG — đừng nhập giá điện ở đây.</span>
                </p>
                <p className="text-xs text-fg-muted leading-relaxed">
                  Nguồn thật là <span className="font-mono tabular-nums">pricing_global_settings.electricity_rate_vnd</span>, nhập ở
                  <strong> mục 0 — Cấu hình Chung Toàn Hệ Thống</strong> phía trên. Giá trị còn lưu trong
                  <span className="font-mono tabular-nums"> pricing_configs</span> chỉ để đọc lại cấu hình cũ — bộ tính giá KHÔNG dùng.
                </p>
                <label htmlFor="cfg-electricity-rate" className="mb-1.5 block text-sm font-medium text-fg-muted">
                  Đơn giá điện trong công thức (đã ngừng dùng — nhập ở mục 0)
                </label>
                <input
                  id="cfg-electricity-rate"
                  type="number"
                  disabled
                  readOnly
                  aria-describedby="cfg-electricity-rate-deprecated"
                  value={formulaForm.electricityRatePerKWh ?? ''}
                  placeholder="Không còn dùng"
                  className="h-10 w-full cursor-not-allowed rounded-md border border-line-control bg-surface-muted px-3 font-mono text-sm tabular-nums text-fg-subtle"
                />
                <p id="cfg-electricity-rate-deprecated" className="text-xs text-fg-subtle">
                  * Công thức điện: Công suất máy (kW) × Giờ in (h) × Đơn giá điện (mục 0).
                </p>
              </div>

              <div className="pt-2 border-t border-line-subtle space-y-3">
                <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-fg">
                  <Icon name="precision_manufacturing" size={16} className="text-primary" />
                  Khấu Hao Máy In Cơ Sở
                </h4>

                <div>
                  <label htmlFor="cfg-machine-depreciation" className="mb-1.5 block text-sm font-medium text-fg-muted">
                    Khấu hao máy in cơ sở (VNĐ / giờ)
                  </label>
                  <div className="relative">
                    <input
                      id="cfg-machine-depreciation"
                      type="number"
                      step="250"
                      min="0"
                      placeholder="Chưa cấu hình"
                      value={formulaForm.defaultMachineDepreciationPerHour ?? ''}
                      onChange={(e) => updateFormulaField('defaultMachineDepreciationPerHour', e.target.value)}
                      aria-invalid={!!formulaIssues.defaultMachineDepreciationPerHour}
                      aria-describedby={formulaIssues.defaultMachineDepreciationPerHour ? 'cfg-machine-depreciation-error' : undefined}
                      className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface py-2 pl-3 pr-14 text-right font-mono text-sm font-bold tabular-nums text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-fg-muted font-mono tabular-nums">VNĐ/h</span>
                  </div>
                  <FieldError id="cfg-machine-depreciation" message={formulaIssues.defaultMachineDepreciationPerHour} />
                </div>
              </div>

              <div className="pt-2 border-t border-line-subtle space-y-3">
                <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-fg">
                  <Icon name="inventory" size={16} className="text-primary" />
                  Đóng Gói &amp; Vật Tư Hoàn Thiện
                </h4>

                <div>
                  <label htmlFor="cfg-packaging" className="mb-1.5 block text-sm font-medium text-fg-muted">
                    Phí đóng gói cố định / sp (VNĐ)
                  </label>
                  <input
                    id="cfg-packaging"
                    type="number"
                    step="500"
                    min="0"
                    placeholder="Chưa cấu hình"
                    value={formulaForm.fixedPackagingCost ?? ''}
                    onChange={(e) => updateFormulaField('fixedPackagingCost', e.target.value)}
                    aria-invalid={!!formulaIssues.fixedPackagingCost}
                    aria-describedby={formulaIssues.fixedPackagingCost ? 'cfg-packaging-error' : undefined}
                    className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 text-right font-mono text-sm font-bold tabular-nums text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <FieldError id="cfg-packaging" message={formulaIssues.fixedPackagingCost} />
                </div>

                <div>
                  <label htmlFor="cfg-ipa" className="mb-1.5 block text-sm font-medium text-fg-muted">
                    Chi phí cồn IPA &amp; dung môi hoàn thiện / sp (VNĐ)
                  </label>
                  <input
                    id="cfg-ipa"
                    type="number"
                    step="500"
                    min="0"
                    placeholder="Chưa cấu hình"
                    value={formulaForm.ipaSolventCost ?? ''}
                    onChange={(e) => updateFormulaField('ipaSolventCost', e.target.value)}
                    aria-invalid={!!formulaIssues.ipaSolventCost}
                    aria-describedby={formulaIssues.ipaSolventCost ? 'cfg-ipa-error' : undefined}
                    className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 text-right font-mono text-sm font-bold tabular-nums text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <FieldError id="cfg-ipa" message={formulaIssues.ipaSolventCost} />
                  <p className="text-xs text-fg-muted mt-0.5">Rửa siêu âm, dung môi IPA 99%, sấy UV sạch nhựa</p>
                </div>

                <div>
                  <label htmlFor="cfg-multicolor-packaging" className="mb-1.5 block text-sm font-medium text-fg-muted">
                    Phụ phí đóng gói in đa màu (VNĐ)
                  </label>
                  <input
                    id="cfg-multicolor-packaging"
                    type="number"
                    step="500"
                    min="0"
                    placeholder="Chưa cấu hình"
                    value={formulaForm.multiColorPackagingExtra ?? ''}
                    onChange={(e) => updateFormulaField('multiColorPackagingExtra', e.target.value)}
                    aria-invalid={!!formulaIssues.multiColorPackagingExtra}
                    aria-describedby={formulaIssues.multiColorPackagingExtra ? 'cfg-multicolor-packaging-error' : undefined}
                    className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 text-right font-mono text-sm font-bold tabular-nums text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <FieldError id="cfg-multicolor-packaging" message={formulaIssues.multiColorPackagingExtra} />
                </div>

                <div>
                  <label htmlFor="cfg-overhead" className="mb-1.5 block text-sm font-medium text-fg-muted">
                    Chi phí quản lý mặt bằng xưởng / đơn vị (VNĐ)
                  </label>
                  <input
                    id="cfg-overhead"
                    type="number"
                    step="1000"
                    min="0"
                    placeholder="Chưa cấu hình"
                    value={formulaForm.overheadPerUnit ?? ''}
                    onChange={(e) => updateFormulaField('overheadPerUnit', e.target.value)}
                    aria-invalid={!!formulaIssues.overheadPerUnit}
                    aria-describedby={formulaIssues.overheadPerUnit ? 'cfg-overhead-error' : undefined}
                    className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 text-right font-mono text-sm font-bold tabular-nums text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <FieldError id="cfg-overhead" message={formulaIssues.overheadPerUnit} />
                </div>
              </div>
            </div>

            {/* Section 2: Labor & Technician Times */}
            <div className="space-y-4 rounded-lg border border-line-subtle bg-surface p-6">
              <div className="flex items-center gap-2 border-b border-line-subtle pb-3">
                <span className="w-8 h-8 rounded-sm bg-info-tint text-info flex items-center justify-center font-bold">
                  <Icon name="engineering" size={18} />
                </span>
                <div>
                  <h3 className="text-base font-semibold tracking-tight text-fg">2. Nhân Công & Quy Trình Kỹ Thuật</h3>
                  <p className="text-xs text-fg-muted">Định mức công việc cho từng bước</p>
                </div>
              </div>

              <div className="space-y-2 rounded-md border border-warning/20 bg-warning-tint p-4">
                <p className="text-xs font-bold text-warning flex items-start gap-1.5">
                  <Icon name="warning" size={18} className="text-warning shrink-0" />
                  <span>Ô NÀY ĐÃ HẾT TÁC DỤNG — đừng nhập lương giờ ở đây.</span>
                </p>
                <p className="text-xs text-fg-muted leading-relaxed">
                  Nguồn thật là <span className="font-mono tabular-nums">pricing_global_settings.labor_hourly_rate_vnd</span>, nhập ở
                  <strong> mục 0 — Cấu hình Chung Toàn Hệ Thống</strong>. Các ô PHÚT bên dưới thật sự được bộ tính giá dùng.
                </p>
                <label htmlFor="cfg-labor-rate" className="mb-1.5 block text-sm font-medium text-fg-muted">
                  Mức lương kỹ thuật viên trong công thức (đã ngừng dùng — nhập ở mục 0)
                </label>
                <input
                  id="cfg-labor-rate"
                  type="number"
                  disabled
                  readOnly
                  aria-describedby="cfg-labor-rate-deprecated"
                  value={formulaForm.laborHourlyRate ?? ''}
                  placeholder="Không còn dùng"
                  className="h-10 w-full cursor-not-allowed rounded-md border border-line-control bg-surface-muted px-3 font-mono text-sm tabular-nums text-fg-subtle"
                />
                <p id="cfg-labor-rate-deprecated" className="text-xs text-fg-subtle">
                  * Tiền công = (tổng số phút bên dưới ÷ 60) × Lương giờ (mục 0).
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label htmlFor="cfg-labor-file-review" className="mb-1.5 block text-sm font-medium text-fg-muted">
                    Duyệt tệp & cắt lớp (phút)
                  </label>
                  <input
                    id="cfg-labor-file-review"
                    type="number"
                    min="0"
                    placeholder="Chưa cấu hình"
                    value={formulaForm.fileReviewLaborMinutes ?? ''}
                    onChange={(e) => updateFormulaField('fileReviewLaborMinutes', e.target.value)}
                    aria-invalid={!!formulaIssues.fileReviewLaborMinutes}
                    aria-describedby={formulaIssues.fileReviewLaborMinutes ? 'cfg-labor-file-review-error' : undefined}
                    className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 text-right font-mono text-sm tabular-nums text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <FieldError id="cfg-labor-file-review" message={formulaIssues.fileReviewLaborMinutes} />
                </div>
                <div>
                  <label htmlFor="cfg-labor-setup" className="mb-1.5 block text-sm font-medium text-fg-muted">
                    Cài đặt máy & bàn in (phút)
                  </label>
                  <input
                    id="cfg-labor-setup"
                    type="number"
                    min="0"
                    placeholder="Chưa cấu hình"
                    value={formulaForm.setupLaborMinutes ?? ''}
                    onChange={(e) => updateFormulaField('setupLaborMinutes', e.target.value)}
                    aria-invalid={!!formulaIssues.setupLaborMinutes}
                    aria-describedby={formulaIssues.setupLaborMinutes ? 'cfg-labor-setup-error' : undefined}
                    className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 text-right font-mono text-sm tabular-nums text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <FieldError id="cfg-labor-setup" message={formulaIssues.setupLaborMinutes} />
                </div>
                <div>
                  <label htmlFor="cfg-labor-support" className="mb-1.5 block text-sm font-medium text-fg-muted">
                    Tách vật liệu đỡ (phút)
                  </label>
                  <input
                    id="cfg-labor-support"
                    type="number"
                    min="0"
                    placeholder="Chưa cấu hình"
                    value={formulaForm.supportRemovalMinutes ?? ''}
                    onChange={(e) => updateFormulaField('supportRemovalMinutes', e.target.value)}
                    aria-invalid={!!formulaIssues.supportRemovalMinutes}
                    aria-describedby={formulaIssues.supportRemovalMinutes ? 'cfg-labor-support-error' : undefined}
                    className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 text-right font-mono text-sm tabular-nums text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <FieldError id="cfg-labor-support" message={formulaIssues.supportRemovalMinutes} />
                </div>
                <div>
                  <p className="text-xs font-bold text-warning mb-1" data-testid="can-anh-quyet-dinh">
                    cần anh quyết định — Inkiri không có tham số này
                  </p>
                  <label htmlFor="cfg-labor-no-support" className="mb-1.5 block text-sm font-medium text-fg-muted">
                    Không dùng vật liệu đỡ (phút)
                  </label>
                  <input
                    id="cfg-labor-no-support"
                    type="number"
                    min="0"
                    placeholder="Chưa cấu hình"
                    value={formulaForm.noSupportRemovalMinutes ?? ''}
                    onChange={(e) => updateFormulaField('noSupportRemovalMinutes', e.target.value)}
                    aria-invalid={!!formulaIssues.noSupportRemovalMinutes}
                    aria-describedby={formulaIssues.noSupportRemovalMinutes ? 'cfg-labor-no-support-error' : undefined}
                    className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 text-right font-mono text-sm tabular-nums text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <FieldError id="cfg-labor-no-support" message={formulaIssues.noSupportRemovalMinutes} />
                  <p className="text-xs text-fg-muted mt-0.5">Dùng khi đơn KHÔNG có vật liệu đỡ (trước đây cứng 2 phút)</p>
                </div>
                <div>
                  <label htmlFor="cfg-labor-post" className="mb-1.5 block text-sm font-medium text-fg-muted">
                    Mài nhẵn ba via (phút)
                  </label>
                  <input
                    id="cfg-labor-post"
                    type="number"
                    min="0"
                    placeholder="Chưa cấu hình"
                    value={formulaForm.postProcessingLaborMinutes ?? ''}
                    onChange={(e) => updateFormulaField('postProcessingLaborMinutes', e.target.value)}
                    aria-invalid={!!formulaIssues.postProcessingLaborMinutes}
                    aria-describedby={formulaIssues.postProcessingLaborMinutes ? 'cfg-labor-post-error' : undefined}
                    className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 text-right font-mono text-sm tabular-nums text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <FieldError id="cfg-labor-post" message={formulaIssues.postProcessingLaborMinutes} />
                </div>
                <div>
                  <label htmlFor="cfg-labor-qc" className="mb-1.5 block text-sm font-medium text-fg-muted">
                    Đo kiểm QC dung sai (phút)
                  </label>
                  <input
                    id="cfg-labor-qc"
                    type="number"
                    min="0"
                    placeholder="Chưa cấu hình"
                    value={formulaForm.qcLaborMinutes ?? ''}
                    onChange={(e) => updateFormulaField('qcLaborMinutes', e.target.value)}
                    aria-invalid={!!formulaIssues.qcLaborMinutes}
                    aria-describedby={formulaIssues.qcLaborMinutes ? 'cfg-labor-qc-error' : undefined}
                    className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 text-right font-mono text-sm tabular-nums text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <FieldError id="cfg-labor-qc" message={formulaIssues.qcLaborMinutes} />
                </div>
                <div>
                  <label htmlFor="cfg-labor-packaging" className="mb-1.5 block text-sm font-medium text-fg-muted">
                    Đóng gói hoàn thiện (phút)
                  </label>
                  <input
                    id="cfg-labor-packaging"
                    type="number"
                    min="0"
                    placeholder="Chưa cấu hình"
                    value={formulaForm.packagingLaborMinutes ?? ''}
                    onChange={(e) => updateFormulaField('packagingLaborMinutes', e.target.value)}
                    aria-invalid={!!formulaIssues.packagingLaborMinutes}
                    aria-describedby={formulaIssues.packagingLaborMinutes ? 'cfg-labor-packaging-error' : undefined}
                    className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 text-right font-mono text-sm tabular-nums text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <FieldError id="cfg-labor-packaging" message={formulaIssues.packagingLaborMinutes} />
                </div>
              </div>

              <div className="rounded-md border border-info/20 bg-info-tint p-3 font-mono text-xs tabular-nums text-info">
                {totalLaborMins === null ? (
                  <>Tổng nhân công: <strong>Chưa cấu hình</strong> (còn định mức phút để trống)</>
                ) : (
                  <>
                    Tổng nhân công: <strong>{totalLaborMins} phút</strong> / sản phẩm
                    {laborCostPerUnit !== null && <> (~{formatNumber(laborCostPerUnit)} ₫)</>}
                  </>
                )}
              </div>
            </div>

            {/* Section 3: Risk Reserve, Markup & Fees */}
            <div className="space-y-4 rounded-lg border border-line-subtle bg-surface p-6">
              <div className="flex items-center gap-2 border-b border-line-subtle pb-3">
                <span className="w-8 h-8 rounded-sm bg-positive-tint text-positive flex items-center justify-center font-bold">
                  <Icon name="trending_up" size={18} />
                </span>
                <div>
                  <h3 className="text-base font-semibold tracking-tight text-fg">3. Dự Phòng Rủi Ro & Lợi Nhuận</h3>
                  <p className="text-xs text-fg-muted">Tỉ lệ in hỏng, thuế & biên lợi nhuận</p>
                </div>
              </div>

              <div className="space-y-2.5">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <label htmlFor="cfg-markup" className="font-semibold text-fg">
                      Lợi nhuận mục tiêu (%)
                    </label>
                    <span className="font-bold text-primary font-mono tabular-nums">
                      {isConfiguredNumber(formulaForm.defaultMarkupPercent) ? `${formulaForm.defaultMarkupPercent}%` : 'Chưa cấu hình'}
                    </span>
                  </div>
                  <input
                    id="cfg-markup"
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={isConfiguredNumber(formulaForm.defaultMarkupPercent) ? formulaForm.defaultMarkupPercent : 10}
                    onChange={(e) => updateFormulaField('defaultMarkupPercent', e.target.value)}
                    aria-invalid={!!formulaIssues.defaultMarkupPercent}
                    aria-describedby={formulaIssues.defaultMarkupPercent ? 'cfg-markup-error' : undefined}
                    className="w-full accent-primary"
                  />
                  <FieldError id="cfg-markup" message={formulaIssues.defaultMarkupPercent} />
                </div>

                <div>
                  <label htmlFor="cfg-profit-mode" className="mb-1.5 block text-sm font-medium text-fg-muted">
                    Cách tính lợi nhuận
                  </label>
                  <select
                    id="cfg-profit-mode"
                    value={formulaForm.profitMode ?? 'markup'}
                    onChange={(e) => {
                      // `profitMode` là CHUỖI — KHÔNG dùng `updateFormulaField` (nó ép qua Number).
                      const value: 'markup' | 'margin' = e.target.value === 'margin' ? 'margin' : 'markup';
                      setFormulaForm((prev) => ({ ...prev, profitMode: value }));
                    }}
                    aria-describedby="cfg-profit-mode-help"
                    className="h-10 w-full cursor-pointer rounded-md border border-line-control bg-surface px-3 text-sm font-medium text-fg focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="markup">Hệ số lãi — lãi trên GIÁ VỐN (công thức hiện tại)</option>
                    <option value="margin" disabled>Biên lợi nhuận — lãi trên GIÁ BÁN (chưa hỗ trợ)</option>
                  </select>
                  <p id="cfg-profit-mode-help" className="text-xs text-fg-muted mt-1 leading-relaxed">
                    Công thức hiện tại chỉ có <strong>hệ số lãi</strong>. Chọn <strong>biên lợi nhuận</strong> sẽ bị CHẶN kèm lỗi
                    (không âm thầm tính bằng hệ số lãi) vì đó là ĐỔI CÔNG THỨC — ngoài phạm vi "chỉ đổi nguồn thông số".
                  </p>
                </div>

                <div>
                  <label htmlFor="cfg-failure-reserve" className="mb-1.5 block text-sm font-medium text-fg-muted">
                    Dự phòng rủi ro in lỗi cơ bản (%)
                  </label>
                  <input
                    id="cfg-failure-reserve"
                    type="number"
                    min="0"
                    max="30"
                    placeholder="Chưa cấu hình"
                    value={formulaForm.baseFailureReservePercent ?? ''}
                    onChange={(e) => updateFormulaField('baseFailureReservePercent', e.target.value)}
                    aria-invalid={!!formulaIssues.baseFailureReservePercent}
                    aria-describedby={formulaIssues.baseFailureReservePercent ? 'cfg-failure-reserve-error' : undefined}
                    className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 text-right font-mono text-sm font-bold tabular-nums text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <FieldError id="cfg-failure-reserve" message={formulaIssues.baseFailureReservePercent} />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label htmlFor="cfg-low-printability" className="text-fg-muted block mb-1">
                      Mô hình khó &lt;80đ (%)
                    </label>
                    <input
                      id="cfg-low-printability"
                      type="number"
                      min="0"
                      max="100"
                      placeholder="Chưa cấu hình"
                      value={formulaForm.lowPrintabilityExtraPercent ?? ''}
                      onChange={(e) => updateFormulaField('lowPrintabilityExtraPercent', e.target.value)}
                      aria-invalid={!!formulaIssues.lowPrintabilityExtraPercent}
                      aria-describedby={formulaIssues.lowPrintabilityExtraPercent ? 'cfg-low-printability-error' : undefined}
                      className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 text-right font-mono text-sm tabular-nums text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <FieldError id="cfg-low-printability" message={formulaIssues.lowPrintabilityExtraPercent} />
                  </div>
                  <div>
                    <label htmlFor="cfg-multicolor-extra" className="text-fg-muted block mb-1">
                      In nhiều màu AMS (%)
                    </label>
                    <input
                      id="cfg-multicolor-extra"
                      type="number"
                      min="0"
                      max="100"
                      placeholder="Chưa cấu hình"
                      value={formulaForm.multiColorExtraPercent ?? ''}
                      onChange={(e) => updateFormulaField('multiColorExtraPercent', e.target.value)}
                      aria-invalid={!!formulaIssues.multiColorExtraPercent}
                      aria-describedby={formulaIssues.multiColorExtraPercent ? 'cfg-multicolor-extra-error' : undefined}
                      className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 text-right font-mono text-sm tabular-nums text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <FieldError id="cfg-multicolor-extra" message={formulaIssues.multiColorExtraPercent} />
                  </div>
                </div>

                <div className="pt-2 border-t border-line-subtle space-y-2">
                  <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-fg">Ngưỡng cảnh báo "đơn lớn" (chuyển sang kiểm duyệt)</h4>
                  <p className="text-xs font-bold text-warning" data-testid="can-anh-quyet-dinh">
                    cần anh quyết định — Inkiri không có ngưỡng cảnh báo "đơn lớn"; hệ thống KHÔNG tự đoán số.
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label htmlFor="cfg-bulk-qty-threshold" className="text-fg-muted block mb-1">
                        Từ số lượng (chiếc)
                      </label>
                      <input
                        id="cfg-bulk-qty-threshold"
                        type="number"
                        min="1"
                        step="1"
                        placeholder="Chưa cấu hình"
                        value={formulaForm.bulkOrderQuantityThreshold ?? ''}
                        onChange={(e) => updateFormulaField('bulkOrderQuantityThreshold', e.target.value)}
                        aria-invalid={!!formulaIssues.bulkOrderQuantityThreshold}
                        aria-describedby={formulaIssues.bulkOrderQuantityThreshold ? 'cfg-bulk-qty-threshold-error' : undefined}
                        className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 text-right font-mono text-sm tabular-nums text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <FieldError id="cfg-bulk-qty-threshold" message={formulaIssues.bulkOrderQuantityThreshold} />
                    </div>
                    <div>
                      <label htmlFor="cfg-bulk-amount-threshold" className="text-fg-muted block mb-1">
                        Từ số tiền (VNĐ)
                      </label>
                      <input
                        id="cfg-bulk-amount-threshold"
                        type="number"
                        min="0"
                        step="100000"
                        placeholder="Chưa cấu hình"
                        value={formulaForm.bulkOrderAmountThresholdVnd ?? ''}
                        onChange={(e) => updateFormulaField('bulkOrderAmountThresholdVnd', e.target.value)}
                        aria-invalid={!!formulaIssues.bulkOrderAmountThresholdVnd}
                        aria-describedby={formulaIssues.bulkOrderAmountThresholdVnd ? 'cfg-bulk-amount-threshold-error' : undefined}
                        className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 text-right font-mono text-sm tabular-nums text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <FieldError id="cfg-bulk-amount-threshold" message={formulaIssues.bulkOrderAmountThresholdVnd} />
                    </div>
                  </div>
                  <p className="text-xs text-fg-muted leading-relaxed">
                    Vượt MỘT trong hai ngưỡng ⇒ báo giá kèm lý do "đơn lớn cần kỹ sư xếp khay".
                    Trước đây hai số này cứng trong mã (50 chiếc / 15.000.000 ₫).
                  </p>
                  <p className="text-xs text-fg-muted leading-relaxed border-t border-line-subtle pt-2">
                    ⚠️ Phụ phí <strong>vật liệu khó</strong> KHÔNG còn là thông số chung: nay khai theo TỪNG vật liệu
                    (<strong>tab Danh Mục Nhựa &amp; Resin → Sửa vật liệu → "Phụ Phí Dự Phòng In Hỏng Riêng"</strong>).
                    Lý do: luật cũ nhận diện bằng chuỗi con trong <span className="font-mono tabular-nums">id</span>
                    (nylon/resin/pa-cf) nên trên nền tảng có id khác nó im lặng không chạy.
                  </p>
                </div>

                <div className="pt-2 border-t border-line-subtle space-y-2">
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <label htmlFor="cfg-platform-fee" className="text-fg-muted block mb-1">
                        Phí nền tảng (đã ngừng dùng)
                      </label>
                      <input
                        id="cfg-platform-fee"
                        type="number"
                        disabled
                        readOnly
                        aria-describedby="cfg-platform-fee-deprecated"
                        value={formulaForm.platformCommissionPercent ?? ''}
                        placeholder="Không còn dùng"
                        className="h-10 w-full cursor-not-allowed rounded-md border border-line-control bg-surface-muted px-2 text-right font-mono text-sm tabular-nums text-fg-subtle"
                      />
                      <p id="cfg-platform-fee-deprecated" className="text-xs text-warning mt-1 leading-relaxed">
                        ⚠️ Bộ tính giá KHÔNG đọc ô này. Phí nền tảng có MỘT nguồn: <strong>mục 0 — "Phí nền tảng toàn hệ thống (%)"</strong>.
                      </p>
                    </div>
                    <div>
                      <label htmlFor="cfg-gateway-fee" className="text-fg-muted block mb-1">
                        Cổng TT (%)
                      </label>
                      <input
                        id="cfg-gateway-fee"
                        type="number"
                        min="0"
                        max="100"
                        placeholder="Chưa cấu hình"
                        value={formulaForm.paymentGatewayFeePercent ?? ''}
                        onChange={(e) => updateFormulaField('paymentGatewayFeePercent', e.target.value)}
                        aria-invalid={!!formulaIssues.paymentGatewayFeePercent}
                        aria-describedby={formulaIssues.paymentGatewayFeePercent ? 'cfg-gateway-fee-error' : undefined}
                        className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 text-right font-mono text-sm font-bold tabular-nums text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <FieldError id="cfg-gateway-fee" message={formulaIssues.paymentGatewayFeePercent} />
                    </div>
                    <div>
                      <label htmlFor="cfg-royalty" className="text-fg-muted block mb-1">
                        Bản quyền 3D (%)
                      </label>
                      <input
                        id="cfg-royalty"
                        type="number"
                        min="0"
                        max="100"
                        placeholder="Chưa cấu hình"
                        value={formulaForm.designerRoyaltyPercent ?? ''}
                        onChange={(e) => updateFormulaField('designerRoyaltyPercent', e.target.value)}
                        aria-invalid={!!formulaIssues.designerRoyaltyPercent}
                        aria-describedby={formulaIssues.designerRoyaltyPercent ? 'cfg-royalty-error' : undefined}
                        className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 text-right font-mono text-sm font-bold tabular-nums text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <FieldError id="cfg-royalty" message={formulaIssues.designerRoyaltyPercent} />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="cfg-rounding" className="mb-1.5 block text-sm font-medium text-fg-muted">
                      Quy tắc làm tròn giá
                    </label>
                    <select
                      id="cfg-rounding"
                      value={formulaForm.roundingRule ?? ''}
                      onChange={(e) => updateFormulaSelect(e.target.value)}
                      aria-invalid={!!formulaIssues.roundingRule}
                      aria-describedby={formulaIssues.roundingRule ? 'cfg-rounding-error' : undefined}
                      className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 text-sm font-medium text-fg focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">— Chưa cấu hình —</option>
                      <option value="1000">Làm tròn lên 1.000 ₫ (Khuyên dùng)</option>
                      <option value="5000">Làm tròn lên 5.000 ₫</option>
                      <option value="10000">Làm tròn lên 10.000 ₫</option>
                    </select>
                    <FieldError id="cfg-rounding" message={formulaIssues.roundingRule} />
                  </div>
                </div>
              </div>
            </div>
          </div>
  );
};
