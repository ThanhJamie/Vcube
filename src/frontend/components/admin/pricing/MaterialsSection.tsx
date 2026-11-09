import React from 'react';
import { Badge, Button, Field, Icon, Input, Modal, Select } from '@frontend/ui';
import { formatNumber } from '../../../lib/format';
import { FieldError, isConfiguredNumber } from './pricingShared';
import type { MaterialEditorModalProps, MaterialsTabProps } from './types';

/**
 * Màu lưu dạng mã CSS (hex/rgb/hsl) thì hiện ô màu; tên màu admin gõ ("Đỏ") hiện thành nhãn chữ.
 * Không tự đoán tên màu thành mã hex — dữ liệu hiển thị đúng như đã lưu.
 */
const isCssColor = (value: string): boolean =>
  /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value) || /^(?:rgb|hsl)a?\(/i.test(value);


export const MaterialsTab: React.FC<MaterialsTabProps> = (props) => {
  const { materials, setIsNewMaterialOpen, setEditingMaterial, handleDeleteMaterial } = props;

  return (
        <div role="tabpanel" id="pricing-panel-materials" aria-labelledby="pricing-tab-materials" className="space-y-6">
          <div className="flex flex-col justify-between gap-4 rounded-lg border border-line-subtle bg-surface p-6 sm:flex-row sm:items-center">
            <div>
              <h3 className="text-base font-semibold tracking-tight text-fg">Danh Sách Nhựa & Vật Liệu Đang Quản Lý ({materials.length})</h3>
              <p className="text-sm text-fg-muted">Quản lý giá nhập cuộn, đơn giá tính theo gram, thông số nhiệt độ đùn và tồn kho</p>
            </div>
            <Button
              variant="primary"
              leadingIcon={<Icon name="add" size={16} />}
              onClick={() => setIsNewMaterialOpen(true)}
            >
              Thêm Vật Liệu Mới
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {materials.map((mat) => (
              <div key={mat.id} className="relative space-y-4 rounded-lg border border-line-subtle bg-surface p-5 transition-all duration-300 hover:border-line hover:shadow-e1">
                <div className="flex items-start justify-between gap-2 border-b border-line-subtle pb-3">
                  <div>
                    <span className="block text-xs font-semibold uppercase tracking-wider text-fg-muted">{mat.brand || 'Filament'}</span>
                    <h4 className="text-base font-semibold tracking-tight text-fg">{mat.name}</h4>
                  </div>
                  <Badge variant={mat.inStock ? 'success' : 'danger'} dot>
                    {mat.inStock
                      ? isConfiguredNumber(mat.stockRollsCount)
                        ? `Còn hàng (${mat.stockRollsCount} cuộn)`
                        : 'Còn hàng (chưa kiểm kê số cuộn)'
                      : 'Tạm hết'}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="rounded-md border border-line-subtle bg-surface-muted p-2.5">
                    <span className="block text-xs uppercase text-fg-muted">Giá Nhập / Kg</span>
                    <span className="font-mono text-sm font-bold tabular-nums text-fg">
                      {isConfiguredNumber(mat.costPerKg)
                        ? `${formatNumber(mat.costPerKg)} ₫`
                        : isConfiguredNumber(mat.pricePerGram)
                          ? `${formatNumber(mat.pricePerGram * 1000)} ₫ (quy đổi từ đơn giá/g)`
                          : '—'}
                    </span>
                  </div>
                  <div className="rounded-md border border-line-subtle bg-primary-tint p-2.5">
                    <span className="block text-xs font-semibold uppercase text-primary">Giá Tính Khách / g</span>
                    <span className="font-mono text-sm font-bold tabular-nums text-primary">
                      {isConfiguredNumber(mat.pricePerGram) ? `${formatNumber(mat.pricePerGram)} ₫/g` : '—'}
                    </span>
                  </div>
                </div>

                <div className="space-y-1 text-xs text-fg-muted">
                  <div className="flex justify-between">
                    <span>Khối lượng riêng (Density):</span>
                    <strong className="text-fg font-mono tabular-nums">{mat.density} g/cm³</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Nhiệt độ đùn:</span>
                    <strong className="text-fg font-mono tabular-nums">
                      {isConfiguredNumber(mat.extruderTempMin) && isConfiguredNumber(mat.extruderTempMax)
                        ? `${mat.extruderTempMin}°C - ${mat.extruderTempMax}°C`
                        : '—'}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Nhiệt độ bàn in:</span>
                    <strong className="text-fg font-mono tabular-nums">{isConfiguredNumber(mat.bedTemp) ? `${mat.bedTemp}°C` : '—'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Chịu nhiệt / Độ bền:</span>
                    <strong className="text-fg">{(mat.heatResistance || '—')} / {(mat.strength || '—')}</strong>
                  </div>
                </div>

                {mat.colors && mat.colors.length > 0 && (
                  <div className="flex items-center gap-1.5 pt-2 border-t border-line-subtle">
                    <span className="text-xs text-fg-muted">Màu có sẵn:</span>
                    <div className="flex items-center gap-1">
                      {mat.colors.map((c, i) =>
                        isCssColor(c) ? (
                          <span
                            key={i}
                            title={c}
                            className="h-3.5 w-3.5 rounded-full border border-line"
                            style={{ backgroundColor: c }}
                          />
                        ) : (
                          <span key={i} className="rounded-sm border border-line-subtle bg-surface px-1.5 py-0.5 text-xs text-fg-muted">
                            {c}
                          </span>
                        ),
                      )}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 border-t border-line-subtle pt-3">
                  <Button
                    size="sm"
                    variant="secondary"
                    leadingIcon={<Icon name="edit" size={16} />}
                    onClick={() => setEditingMaterial({ ...mat })}
                  >
                    Sửa
                  </Button>
                  <Button
                    iconOnly
                    size="sm"
                    variant="danger-ghost"
                    aria-label="Xoá"
                    onClick={() => handleDeleteMaterial(mat.id, mat.name)}
                    leadingIcon={<Icon name="delete" size={16} />}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
  );
};

export const MaterialEditorModal: React.FC<MaterialEditorModalProps> = (props) => {
  const { setIsNewMaterialOpen, setEditingMaterial, setMaterialIssues, editingMaterial, handleSaveEditMaterial, handleSaveNewMaterial, materialIssues, materialForm, setMaterialField, numberOrUndefined } = props;

  /**
   * `colors` giữ dạng CHUỖI người dùng đang gõ ("Đỏ, Đen, Trắng") để không nuốt dấu phẩy
   * giữa các lần render. Chỉ parse thành `string[]` khi ghi vào state vật liệu.
   */
  const colorsValue = (editingMaterial ? editingMaterial.colors : materialForm.colors) ?? [];
  const [colorsText, setColorsText] = React.useState<string>(colorsValue.join(', '));
  // Reset khi mở modal / đổi bản ghi đang sửa. KHÔNG phụ thuộc `colors` đã parse: reset theo
  // từng ký tự sẽ xoá dấu phẩy vừa gõ.
  React.useEffect(() => {
    setColorsText((((editingMaterial ? editingMaterial.colors : materialForm.colors) ?? []).join(', ')));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingMaterial?.id]);

  const handleColorsChange = (text: string) => {
    setColorsText(text);
    setMaterialField(
      'colors',
      text.split(',').map((c) => c.trim()).filter((c) => c.length > 0),
    );
  };

  return (
        <Modal
          open
          onClose={() => { setIsNewMaterialOpen(false); setEditingMaterial(null); setMaterialIssues({}); }}
          size="lg"
          title={<span className="flex items-center gap-2"><Icon name="layers" size={22} className="text-primary" />{editingMaterial ? `Chỉnh Sửa Vật Liệu: ${editingMaterial.name}` : 'Thêm Vật Liệu In 3D Mới'}</span>}
        >
            <form onSubmit={editingMaterial ? handleSaveEditMaterial : handleSaveNewMaterial} className="space-y-4 text-sm">
              {Object.keys(materialIssues).length > 0 && (
                <p role="alert" className="rounded-md border border-danger/20 bg-danger-tint p-3 text-sm font-semibold text-danger">
                  KHÔNG lưu: còn {Object.keys(materialIssues).length} ô chưa cấu hình hoặc không hợp lệ. Hệ thống không tự điền giá trị đoán.
                </p>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label htmlFor="mat-name" className="mb-1.5 block text-sm font-medium text-fg">Tên Vật Liệu *</label>
                  <input
                    id="mat-name"
                    type="text"
                    required
                    placeholder="VD: PLA Tough Plus, PETG-CF, Resin High Temp..."
                    value={editingMaterial ? editingMaterial.name : (materialForm.name ?? '')}
                    onChange={(e) => setMaterialField('name', e.target.value)}
                    aria-invalid={!!materialIssues.name}
                    aria-describedby={materialIssues.name ? 'mat-name-error' : undefined}
                    className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 text-sm text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <FieldError id="mat-name" message={materialIssues.name} />
                </div>

                <div>
                  <label htmlFor="mat-brand" className="mb-1.5 block text-sm font-medium text-fg">Thương Hiệu</label>
                  <input
                    id="mat-brand"
                    type="text"
                    value={editingMaterial ? (editingMaterial.brand ?? '') : (materialForm.brand ?? '')}
                    onChange={(e) => setMaterialField('brand', e.target.value)}
                    className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 text-sm text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div>
                  <Field id="mat-type" label="Loại Vật Liệu" optionalLabel={null} error={materialIssues.type}>
                    {(control) => (
                      <Select
                        {...control}
                        value={editingMaterial ? (editingMaterial.type ?? 'FDM') : (materialForm.type ?? 'FDM')}
                        onChange={(e) => setMaterialField('type', e.target.value)}
                      >
                        <option value="FDM">FDM / FFF (nhựa đùn)</option>
                        <option value="SLA">SLA / DLP (resin quang trùng hợp)</option>
                        <option value="SLS">SLS (thiêu kết bột)</option>
                      </Select>
                    )}
                  </Field>
                </div>

                <div>
                  <label htmlFor="mat-density" className="mb-1.5 block text-sm font-medium text-fg">Khối Lượng Riêng (g/cm³)</label>
                  <input
                    id="mat-density"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Chưa cấu hình"
                    value={editingMaterial ? (editingMaterial.density ?? '') : (materialForm.density ?? '')}
                    onChange={(e) => setMaterialField('density', numberOrUndefined(e.target.value))}
                    aria-invalid={!!materialIssues.density}
                    aria-describedby={materialIssues.density ? 'mat-density-error' : undefined}
                    className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 text-right font-mono text-sm tabular-nums text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <FieldError id="mat-density" message={materialIssues.density} />
                </div>

                <div>
                  <label htmlFor="mat-cost" className="mb-1.5 block text-sm font-medium text-fg">Giá Nhập 1 Cuộn / Kg (VNĐ)</label>
                  <input
                    id="mat-cost"
                    type="number"
                    step="5000"
                    min="0"
                    placeholder="Chưa cấu hình"
                    value={editingMaterial ? (editingMaterial.costPerKg ?? '') : (materialForm.costPerKg ?? '')}
                    onChange={(e) => setMaterialField('costPerKg', numberOrUndefined(e.target.value))}
                    aria-invalid={!!materialIssues.costPerKg}
                    aria-describedby={materialIssues.costPerKg ? 'mat-cost-error' : undefined}
                    className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 text-right font-mono text-sm font-bold tabular-nums text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <FieldError id="mat-cost" message={materialIssues.costPerKg} />
                </div>

                <div>
                  <label htmlFor="mat-price" className="block font-semibold mb-1 text-primary">Đơn Giá Tính Khách / Gram (VNĐ)</label>
                  <input
                    id="mat-price"
                    type="number"
                    step="50"
                    min="0"
                    placeholder="Chưa cấu hình"
                    value={editingMaterial ? (editingMaterial.pricePerGram ?? '') : (materialForm.pricePerGram ?? '')}
                    onChange={(e) => setMaterialField('pricePerGram', numberOrUndefined(e.target.value))}
                    aria-invalid={!!materialIssues.pricePerGram}
                    aria-describedby={materialIssues.pricePerGram ? 'mat-price-error' : undefined}
                    className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 text-right font-mono text-sm font-bold tabular-nums text-primary placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <FieldError id="mat-price" message={materialIssues.pricePerGram} />
                </div>

                <div>
                  <label htmlFor="mat-temp-min" className="mb-1.5 block text-sm font-medium text-fg">Nhiệt Độ Đầu Đùn Nhỏ Nhất / Lớn Nhất (°C)</label>
                  <div className="flex items-center gap-1">
                    <input
                      id="mat-temp-min"
                      type="number"
                      min="0"
                      placeholder="Nhỏ nhất"
                      value={editingMaterial ? (editingMaterial.extruderTempMin ?? '') : (materialForm.extruderTempMin ?? '')}
                      onChange={(e) => setMaterialField('extruderTempMin', numberOrUndefined(e.target.value))}
                      aria-invalid={!!materialIssues.extruderTempMin}
                      aria-describedby={materialIssues.extruderTempMin ? 'mat-temp-min-error' : undefined}
                      className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 text-right font-mono text-sm tabular-nums text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <span>-</span>
                    <label htmlFor="mat-temp-max" className="sr-only">Nhiệt độ đầu đùn tối đa (°C)</label>
                    <input
                      id="mat-temp-max"
                      type="number"
                      min="0"
                      placeholder="Lớn nhất"
                      value={editingMaterial ? (editingMaterial.extruderTempMax ?? '') : (materialForm.extruderTempMax ?? '')}
                      onChange={(e) => setMaterialField('extruderTempMax', numberOrUndefined(e.target.value))}
                      aria-invalid={!!materialIssues.extruderTempMax}
                      aria-describedby={materialIssues.extruderTempMax ? 'mat-temp-max-error' : undefined}
                      className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 text-right font-mono text-sm tabular-nums text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <FieldError id="mat-temp-min" message={materialIssues.extruderTempMin} />
                  <FieldError id="mat-temp-max" message={materialIssues.extruderTempMax} />
                </div>

                <div>
                  <label htmlFor="mat-bed-temp" className="mb-1.5 block text-sm font-medium text-fg">Nhiệt Độ Bàn In (°C)</label>
                  <input
                    id="mat-bed-temp"
                    type="number"
                    min="0"
                    placeholder="Chưa cấu hình"
                    value={editingMaterial ? (editingMaterial.bedTemp ?? '') : (materialForm.bedTemp ?? '')}
                    onChange={(e) => setMaterialField('bedTemp', numberOrUndefined(e.target.value))}
                    aria-invalid={!!materialIssues.bedTemp}
                    aria-describedby={materialIssues.bedTemp ? 'mat-bed-temp-error' : undefined}
                    className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 text-right font-mono text-sm tabular-nums text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <FieldError id="mat-bed-temp" message={materialIssues.bedTemp} />
                </div>

                <div>
                  <label htmlFor="mat-stock" className="mb-1.5 block text-sm font-medium text-fg">Tồn Kho (Cuộn)</label>
                  <input
                    id="mat-stock"
                    type="number"
                    min="0"
                    placeholder="Chưa cấu hình"
                    value={editingMaterial ? (editingMaterial.stockRollsCount ?? '') : (materialForm.stockRollsCount ?? '')}
                    onChange={(e) => setMaterialField('stockRollsCount', numberOrUndefined(e.target.value))}
                    aria-invalid={!!materialIssues.stockRollsCount}
                    aria-describedby={materialIssues.stockRollsCount ? 'mat-stock-error' : undefined}
                    className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 text-right font-mono text-sm tabular-nums text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <FieldError id="mat-stock" message={materialIssues.stockRollsCount} />
                </div>

                <div>
                  <label htmlFor="mat-multiplier" className="mb-1.5 block text-sm font-medium text-fg">Hệ số suy đơn giá nhựa (₫/g từ giá vốn)</label>
                  <input
                    id="mat-multiplier"
                    type="number"
                    step="0.05"
                    min="0"
                    placeholder="Chưa cấu hình"
                    value={editingMaterial ? (editingMaterial.unitPriceMultiplier ?? '') : (materialForm.unitPriceMultiplier ?? '')}
                    onChange={(e) => setMaterialField('unitPriceMultiplier', numberOrUndefined(e.target.value))}
                    aria-invalid={!!materialIssues.unitPriceMultiplier}
                    aria-describedby={materialIssues.unitPriceMultiplier ? 'mat-multiplier-error' : undefined}
                    className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 text-right font-mono text-sm tabular-nums text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <FieldError id="mat-multiplier" message={materialIssues.unitPriceMultiplier} />
                  <p className="mt-1.5 text-xs text-fg-muted">Chỉ dùng để SUY đơn giá nhựa (₫/g) từ giá vốn: giá vốn/kg ÷ 1000 × hệ số. KHÔNG phải hệ số nhân giá bán — để trống ô đơn giá/g thì bộ tính giá mới dùng hệ số này.</p>
                </div>

                <div>
                  <label htmlFor="mat-spool-weight" className="mb-1.5 block text-sm font-medium text-fg">Khối Lượng Cuộn (g)</label>
                  <input
                    id="mat-spool-weight"
                    type="number"
                    step="50"
                    min="0"
                    placeholder="Chưa cấu hình"
                    value={editingMaterial ? (editingMaterial.spoolWeightGrams ?? '') : (materialForm.spoolWeightGrams ?? '')}
                    onChange={(e) => setMaterialField('spoolWeightGrams', numberOrUndefined(e.target.value))}
                    aria-invalid={!!materialIssues.spoolWeightGrams}
                    aria-describedby={materialIssues.spoolWeightGrams ? 'mat-spool-weight-error' : undefined}
                    className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 text-right font-mono text-sm tabular-nums text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <FieldError id="mat-spool-weight" message={materialIssues.spoolWeightGrams} />
                </div>

                <div>
                  <p className="text-xs font-bold text-warning mb-1" data-testid="can-anh-quyet-dinh">
                    cần anh quyết định — Inkiri gộp chung một hệ số "vật liệu khó", không tách theo từng vật liệu
                  </p>
                  <label htmlFor="mat-failure-extra" className="mb-1.5 block text-sm font-medium text-fg">Phụ Phí Dự Phòng In Hỏng Riêng (%)</label>
                  <input
                    id="mat-failure-extra"
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    placeholder="Để trống = không cộng thêm"
                    value={editingMaterial ? (editingMaterial.failureExtraPercent ?? '') : (materialForm.failureExtraPercent ?? '')}
                    onChange={(e) => setMaterialField('failureExtraPercent', e.target.value === '' ? null : numberOrUndefined(e.target.value))}
                    aria-invalid={!!materialIssues.failureExtraPercent}
                    aria-describedby={materialIssues.failureExtraPercent ? 'mat-failure-extra-error' : undefined}
                    className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 text-right font-mono text-sm tabular-nums text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <FieldError id="mat-failure-extra" message={materialIssues.failureExtraPercent} />
                  <p className="mt-1.5 text-xs text-fg-muted">
                    Cộng thêm vào dự phòng in hỏng CHỈ cho vật liệu này (thay luật cũ dò chuỗi trong
                    <span className="font-mono tabular-nums"> id</span>). Để trống = không cộng thêm (không mượn số mẫu).
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="matStockCheck"
                    checked={editingMaterial ? editingMaterial.inStock === true : materialForm.inStock === true}
                    onChange={(e) => setMaterialField('inStock', e.target.checked)}
                    className="size-4 rounded-sm border-line-control text-primary focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <label htmlFor="matStockCheck" className="font-semibold text-fg">Đang Có Sẵn Hàng</label>
                </div>

                {/* Trường phụ (không bắt buộc) gom vào <details> để modal không quá dài. */}
                <details className="col-span-2 rounded-md border border-line-subtle bg-surface-muted p-3">
                  <summary className="cursor-pointer text-sm font-semibold text-fg">Thông số kỹ thuật &amp; mô tả</summary>
                  <div className="mt-3 grid grid-cols-2 gap-4">
                    <div>
                      <Field id="mat-strength" label="Độ Bền (Strength)" optionalLabel={null} error={materialIssues.strength}>
                        {(control) => (
                          <Input
                            {...control}
                            type="text"
                            placeholder="VD: Cao, 45 MPa..."
                            value={editingMaterial ? (editingMaterial.strength ?? '') : (materialForm.strength ?? '')}
                            onChange={(e) => setMaterialField('strength', e.target.value)}
                          />
                        )}
                      </Field>
                    </div>

                    <div>
                      <Field id="mat-heat-resistance" label="Chịu Nhiệt (Heat Resistance)" optionalLabel={null} error={materialIssues.heatResistance}>
                        {(control) => (
                          <Input
                            {...control}
                            type="text"
                            placeholder="VD: 80 °C, 120 °C..."
                            value={editingMaterial ? (editingMaterial.heatResistance ?? '') : (materialForm.heatResistance ?? '')}
                            onChange={(e) => setMaterialField('heatResistance', e.target.value)}
                          />
                        )}
                      </Field>
                    </div>

                    <div>
                      <Field id="mat-flexibility" label="Độ Dẻo (Flexibility)" optionalLabel={null} error={materialIssues.flexibility}>
                        {(control) => (
                          <Input
                            {...control}
                            type="text"
                            placeholder="VD: Thấp, Trung bình, Cao..."
                            value={editingMaterial ? (editingMaterial.flexibility ?? '') : (materialForm.flexibility ?? '')}
                            onChange={(e) => setMaterialField('flexibility', e.target.value)}
                          />
                        )}
                      </Field>
                    </div>

                    <div>
                      <Field id="mat-recommended-for" label="Khuyên Dùng Cho" optionalLabel={null} error={materialIssues.recommendedFor}>
                        {(control) => (
                          <Input
                            {...control}
                            type="text"
                            placeholder="VD: Mô hình cơ khí, đồ chơi..."
                            value={editingMaterial ? (editingMaterial.recommendedFor ?? '') : (materialForm.recommendedFor ?? '')}
                            onChange={(e) => setMaterialField('recommendedFor', e.target.value)}
                          />
                        )}
                      </Field>
                    </div>

                    <div className="col-span-2">
                      <Field
                        id="mat-colors"
                        label="Màu Có Sẵn"
                        optionalLabel={null}
                        error={materialIssues.colors}
                        hint="Ngăn cách bằng dấu phẩy — VD: Đỏ, Đen, Trắng hoặc mã màu #DC2626. Để trống = chưa khai màu."
                      >
                        {(control) => (
                          <Input
                            {...control}
                            type="text"
                            placeholder="Đỏ, Đen, Trắng"
                            value={colorsText}
                            onChange={(e) => handleColorsChange(e.target.value)}
                          />
                        )}
                      </Field>
                    </div>

                    <div className="col-span-2">
                      <Field id="mat-desc" label="Mô Tả" optionalLabel={null} error={materialIssues.desc}>
                        {(control) => (
                          <Input
                            {...control}
                            type="text"
                            placeholder="VD: Nhựa PLA dễ in, bề mặt mờ, dùng cho mô hình trưng bày..."
                            value={editingMaterial ? (editingMaterial.desc ?? '') : (materialForm.desc ?? '')}
                            onChange={(e) => setMaterialField('desc', e.target.value)}
                          />
                        )}
                      </Field>
                    </div>
                  </div>
                </details>
              </div>

              <div className="flex justify-end gap-2 border-t border-line-subtle pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => { setIsNewMaterialOpen(false); setEditingMaterial(null); setMaterialIssues({}); }}
                >
                  Hủy
                </Button>
                <Button type="submit" variant="primary">
                  Lưu Vật Liệu
                </Button>
              </div>
            </form>
        </Modal>
  );
};
