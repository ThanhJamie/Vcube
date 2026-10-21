import React from 'react';
import { Button, Icon } from '@frontend/ui';
import { FieldError } from './pricingShared';
import type { FormulaVolumeDiscountProps } from './types';

export const FormulaVolumeDiscount: React.FC<FormulaVolumeDiscountProps> = (props) => {
  const { handleAddDiscountTier, formulaForm, handleUpdateDiscountTier, numberOrUndefined, formulaIssues, handleRemoveDiscountTier } = props;

  return (
          <div className="space-y-4 rounded-lg border border-line-subtle bg-surface p-6">
            <div className="flex items-center justify-between border-b border-line-subtle pb-3">
              <div>
                <h3 className="text-base font-semibold tracking-tight text-fg">4. Bảng Chiết Khấu Số Lượng</h3>
                <p className="text-xs text-fg-muted">Tự động áp dụng mức giảm giá khi khách hàng đặt in số lượng lớn</p>
              </div>
              <Button
                type="button"
                variant="primary"
                size="sm"
                leadingIcon={<Icon name="add" size={16} />}
                onClick={handleAddDiscountTier}
              >
                Thêm Mốc Chiết Khấu
              </Button>
            </div>

            {(formulaForm.volumeDiscounts ?? []).length === 0 && (
              <p className="text-xs text-fg-muted italic">
                Chưa có bậc chiết khấu nào được cấu hình. Bấm “Thêm Mốc Chiết Khấu” rồi nhập số thật — hệ thống không tự tạo bậc mẫu.
              </p>
            )}

            <div className="responsive-table-wrapper overflow-x-auto rounded-lg border border-line">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-muted text-xs uppercase tracking-wider text-fg-subtle">
                  <tr>
                    <th className="h-10 px-4 text-left font-semibold">Số lượng tối thiểu</th>
                    <th className="h-10 px-4 text-left font-semibold">Số lượng tối đa</th>
                    <th className="h-10 px-4 text-left font-semibold">Mức giảm giá (%)</th>
                    <th className="h-10 px-4 text-left font-semibold">Nhãn hiển thị khách hàng</th>
                    <th className="h-10 px-4 text-right font-semibold">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {(formulaForm.volumeDiscounts ?? []).map((tier, idx) => (
                    <tr key={idx} className="h-11 border-t border-line-subtle transition-colors hover:bg-surface-muted/60">
                      <td className="px-4">
                        <label htmlFor={`tier-${idx}-min`} className="sr-only">{`Bậc ${idx + 1}: số lượng tối thiểu`}</label>
                        <input
                          id={`tier-${idx}-min`}
                          type="number"
                          min="1"
                          placeholder="Chưa cấu hình"
                          value={tier.minQty ?? ''}
                          onChange={(e) => handleUpdateDiscountTier(idx, { minQty: numberOrUndefined(e.target.value) })}
                          aria-invalid={!!formulaIssues[`volumeDiscounts.${idx}.minQty`]}
                          aria-describedby={formulaIssues[`volumeDiscounts.${idx}.minQty`] ? `tier-${idx}-min-error` : undefined}
                          className="h-9 max-md:min-h-11 w-24 rounded-md border border-line-control bg-surface px-2.5 text-right font-mono text-sm font-bold tabular-nums text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        <FieldError id={`tier-${idx}-min`} message={formulaIssues[`volumeDiscounts.${idx}.minQty`]} />
                      </td>
                      <td className="px-4">
                        <label htmlFor={`tier-${idx}-max`} className="sr-only">{`Bậc ${idx + 1}: số lượng tối đa`}</label>
                        <input
                          id={`tier-${idx}-max`}
                          type="number"
                          placeholder="Không giới hạn"
                          value={tier.maxQty !== undefined ? tier.maxQty : ''}
                          onChange={(e) => handleUpdateDiscountTier(idx, { maxQty: numberOrUndefined(e.target.value) })}
                          className="h-9 max-md:min-h-11 w-28 rounded-md border border-line-control bg-surface px-2.5 text-right font-mono text-sm tabular-nums text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </td>
                      <td className="px-4">
                        <div className="flex items-center gap-1">
                          <label htmlFor={`tier-${idx}-discount`} className="sr-only">{`Bậc ${idx + 1}: mức giảm giá`}</label>
                          <input
                            id={`tier-${idx}-discount`}
                            type="number"
                            min="0"
                            max="70"
                            placeholder="—"
                            value={tier.discountPercent ?? ''}
                            onChange={(e) => handleUpdateDiscountTier(idx, { discountPercent: numberOrUndefined(e.target.value) })}
                            aria-invalid={!!formulaIssues[`volumeDiscounts.${idx}.discountPercent`]}
                            aria-describedby={formulaIssues[`volumeDiscounts.${idx}.discountPercent`] ? `tier-${idx}-discount-error` : undefined}
                            className="h-9 max-md:min-h-11 w-20 rounded-md border border-line-control bg-surface px-2.5 text-right font-mono text-sm font-bold tabular-nums text-positive placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                          <span className="font-mono tabular-nums text-xs font-bold text-positive">%</span>
                        </div>
                        <FieldError id={`tier-${idx}-discount`} message={formulaIssues[`volumeDiscounts.${idx}.discountPercent`]} />
                      </td>
                      <td className="px-4">
                        <label htmlFor={`tier-${idx}-label`} className="sr-only">{`Bậc ${idx + 1}: nhãn hiển thị`}</label>
                        <input
                          id={`tier-${idx}-label`}
                          type="text"
                          placeholder="VD: 50+ chiếc"
                          value={tier.label ?? ''}
                          onChange={(e) => handleUpdateDiscountTier(idx, { label: e.target.value })}
                          aria-invalid={!!formulaIssues[`volumeDiscounts.${idx}.label`]}
                          aria-describedby={formulaIssues[`volumeDiscounts.${idx}.label`] ? `tier-${idx}-label-error` : undefined}
                          className="h-9 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-2.5 text-sm text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        <FieldError id={`tier-${idx}-label`} message={formulaIssues[`volumeDiscounts.${idx}.label`]} />
                      </td>
                      <td className="px-4 text-right">
                        <Button
                          type="button"
                          iconOnly
                          size="sm"
                          variant="danger-ghost"
                          onClick={() => handleRemoveDiscountTier(idx)}
                          title="Xóa mốc"
                          aria-label={`Xóa bậc ${idx + 1}`}
                          leadingIcon={<Icon name="delete" size={18} />}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
  );
};
