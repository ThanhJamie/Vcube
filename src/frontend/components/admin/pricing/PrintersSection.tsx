import React from 'react';
import { Badge, Button, Icon, Modal } from '@frontend/ui';
import { formatNumber } from '../../../lib/format';
import { FieldError, isConfiguredNumber } from './pricingShared';
import type { PrinterEditorModalProps, PrintersTabProps } from './types';

export const PrintersTab: React.FC<PrintersTabProps> = (props) => {
  const { printers, setIsNewPrinterOpen, formulaForm, setEditingPrinter, handleDeletePrinter } = props;

  return (
        <div role="tabpanel" id="pricing-panel-printers" aria-labelledby="pricing-tab-printers" className="space-y-6">
          <div className="flex flex-col justify-between gap-4 rounded-lg border border-line-subtle bg-surface p-6 sm:flex-row sm:items-center">
            <div>
              <h3 className="text-base font-semibold tracking-tight text-fg">Danh Sách Đội Máy In Công Nghiệp ({printers.length})</h3>
              <p className="text-sm text-fg-muted">Khổ bàn in, công suất điện kW, khấu hao máy theo giờ và chi phí linh kiện thay thế</p>
            </div>
            <Button
              variant="primary"
              leadingIcon={<Icon name="add" size={16} />}
              onClick={() => setIsNewPrinterOpen(true)}
            >
              Thêm Máy In Mới
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {printers.map((prn) => (
              <div key={prn.id} className="space-y-4 rounded-lg border border-line-subtle bg-surface p-5 transition-all duration-300 hover:border-line hover:shadow-e1">
                <div className="flex items-start justify-between gap-2 border-b border-line-subtle pb-3">
                  <div>
                    <span className="block text-xs font-semibold uppercase tracking-wider text-fg-muted">{(prn.brand || '—')} // {(prn.technology || '—')}</span>
                    <h4 className="text-base font-semibold tracking-tight text-fg">{prn.name}</h4>
                  </div>
                  <Badge
                    variant={prn.status === 'Printing' ? 'warning' : prn.status === 'Idle' ? 'success' : 'neutral'}
                    dot
                  >
                    {prn.status === 'Printing' ? 'Đang In' : prn.status === 'Idle' ? 'Sẵn Sàng' : 'Bảo Trì'}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="rounded-md border border-line-subtle bg-surface-muted p-2.5">
                    <span className="block text-xs uppercase text-fg-muted">Khổ Bàn In (X×Y×Z)</span>
                    <span className="font-mono text-sm font-bold tabular-nums text-fg">
                      {isConfiguredNumber(prn.bedDimensions?.x) && isConfiguredNumber(prn.bedDimensions?.y) && isConfiguredNumber(prn.bedDimensions?.z)
                        ? `${prn.bedDimensions.x}×${prn.bedDimensions.y}×${prn.bedDimensions.z}`
                        : '—'}
                    </span>
                    <span className="block font-mono text-xs tabular-nums text-fg-muted">mm</span>
                  </div>
                  <div className="rounded-md border border-line-subtle bg-surface-muted p-2.5">
                    <span className="block text-xs uppercase text-fg-muted">Công Suất Điện</span>
                    <span className="font-mono text-sm font-bold tabular-nums text-fg">
                      {isConfiguredNumber(prn.powerKW) ? `${prn.powerKW} kW` : '—'}
                    </span>
                    <span className="block font-mono text-xs tabular-nums text-warning">
                      {isConfiguredNumber(prn.powerKW) && isConfiguredNumber(formulaForm.electricityRatePerKWh)
                        ? `~${formatNumber(Math.round(prn.powerKW * formulaForm.electricityRatePerKWh))} ₫/h`
                        : '—'}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-fg-muted">
                  <div className="flex justify-between">
                    <span>Giá trị đầu tư:</span>
                    <strong className="text-fg font-mono tabular-nums">{isConfiguredNumber(prn.acquisitionCost) ? `${formatNumber(prn.acquisitionCost)} ₫` : '—'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Tuổi thọ khấu hao:</span>
                    <strong className="text-fg font-mono tabular-nums">{isConfiguredNumber(prn.expectedLifetimeHours) ? `${formatNumber(prn.expectedLifetimeHours)} giờ` : '—'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Hao mòn linh kiện / giờ:</span>
                    <strong className="text-fg font-mono tabular-nums">{isConfiguredNumber(prn.consumablesHourlyRate) ? `${formatNumber(prn.consumablesHourlyRate)} ₫/h` : '—'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Tốc độ in tối đa:</span>
                    <strong className="text-fg font-mono tabular-nums">{isConfiguredNumber(prn.maxPrintSpeedMmS) ? `${prn.maxPrintSpeedMmS} mm/s` : '—'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Năng suất in:</span>
                    <strong className="text-fg font-mono tabular-nums">{isConfiguredNumber(prn.throughputGramsPerHour) ? `${prn.throughputGramsPerHour} g/giờ` : '—'}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-3 border-t border-line-subtle pt-3 text-xs">
                  <span className={`inline-flex items-center gap-1 ${prn.hasEnclosure ? 'text-positive' : 'text-fg-subtle'}`}>
                    <Icon name={prn.hasEnclosure ? 'check_box' : 'check_box_outline_blank'} size={16} />
                    Buồng Kín
                  </span>
                  <span className={`inline-flex items-center gap-1 ${prn.hasAMS ? 'text-positive' : 'text-fg-subtle'}`}>
                    <Icon name={prn.hasAMS ? 'check_box' : 'check_box_outline_blank'} size={16} />
                    Bộ Đa Màu AMS
                  </span>
                </div>

                <div className="flex justify-end gap-2 border-t border-line-subtle pt-3">
                  <Button
                    size="sm"
                    variant="secondary"
                    leadingIcon={<Icon name="edit" size={16} />}
                    onClick={() => setEditingPrinter({ ...prn })}
                  >
                    Sửa
                  </Button>
                  <Button
                    iconOnly
                    size="sm"
                    variant="danger-ghost"
                    aria-label="Xoá"
                    onClick={() => handleDeletePrinter(prn.id, prn.name)}
                    leadingIcon={<Icon name="delete" size={16} />}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
  );
};

export const PrinterEditorModal: React.FC<PrinterEditorModalProps> = (props) => {
  const { setIsNewPrinterOpen, setEditingPrinter, setPrinterIssues, editingPrinter, handleSaveEditPrinter, handleSaveNewPrinter, printerIssues, printerForm, setPrinterField, setPrinterBedDimension, numberOrUndefined, setPrinterThroughput } = props;

  return (
        <Modal
          open
          onClose={() => { setIsNewPrinterOpen(false); setEditingPrinter(null); setPrinterIssues({}); }}
          size="lg"
          title={<span className="flex items-center gap-2"><Icon name="precision_manufacturing" size={22} className="text-primary" />{editingPrinter ? `Chỉnh Sửa Máy In: ${editingPrinter.name}` : 'Thêm Máy In Mới Vào Đội Máy'}</span>}
        >
            <form onSubmit={editingPrinter ? handleSaveEditPrinter : handleSaveNewPrinter} className="space-y-4 text-sm">
              {Object.keys(printerIssues).length > 0 && (
                <p role="alert" className="rounded-md border border-danger/20 bg-danger-tint p-3 text-sm font-semibold text-danger">
                  KHÔNG lưu: còn {Object.keys(printerIssues).length} ô chưa cấu hình hoặc không hợp lệ. Hệ thống không tự điền thông số máy đoán.
                </p>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label htmlFor="prn-name" className="mb-1.5 block text-sm font-medium text-fg">Tên Máy In *</label>
                  <input
                    id="prn-name"
                    type="text"
                    required
                    placeholder="VD: Bambu Lab X1-Carbon AMS, Creality K1 Max..."
                    value={editingPrinter ? editingPrinter.name : (printerForm.name ?? '')}
                    onChange={(e) => setPrinterField('name', e.target.value)}
                    aria-invalid={!!printerIssues.name}
                    aria-describedby={printerIssues.name ? 'prn-name-error' : undefined}
                    className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 text-sm text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <FieldError id="prn-name" message={printerIssues.name} />
                </div>

                <div>
                  <label htmlFor="prn-brand" className="mb-1.5 block text-sm font-medium text-fg">Hãng Sản Xuất</label>
                  <input
                    id="prn-brand"
                    type="text"
                    value={editingPrinter ? (editingPrinter.brand ?? '') : (printerForm.brand ?? '')}
                    onChange={(e) => setPrinterField('brand', e.target.value)}
                    className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 text-sm text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div>
                  <label htmlFor="prn-technology" className="mb-1.5 block text-sm font-medium text-fg">Công Nghệ In</label>
                  <select
                    id="prn-technology"
                    value={editingPrinter ? (editingPrinter.technology ?? '') : (printerForm.technology ?? '')}
                    onChange={(e) => setPrinterField('technology', e.target.value === '' ? undefined : (e.target.value as any))}
                    aria-invalid={!!printerIssues.technology}
                    aria-describedby={printerIssues.technology ? 'prn-technology-error' : undefined}
                    className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 text-sm text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">— Chọn công nghệ in —</option>
                    <option value="FDM">FDM / FFF (Đùn nhựa)</option>
                    <option value="SLA">SLA / DLP (Quang trùng hợp Resin)</option>
                    <option value="SLS">SLS (Thiêu kết bột)</option>
                  </select>
                  <FieldError id="prn-technology" message={printerIssues.technology} />
                </div>

                <div className="col-span-2">
                  <label htmlFor="prn-bed-x" className="mb-1.5 block text-sm font-medium text-fg">Khổ Bàn In X × Y × Z (mm)</label>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      id="prn-bed-x"
                      type="number"
                      min="0"
                      placeholder="X (mm)"
                      value={editingPrinter ? (editingPrinter.bedDimensions?.x ?? '') : (printerForm.bedDimensions?.x ?? '')}
                      onChange={(e) => setPrinterBedDimension('x', e.target.value)}
                      aria-invalid={!!printerIssues['bedDimensions.x']}
                      aria-describedby={printerIssues['bedDimensions.x'] ? 'prn-bed-x-error' : undefined}
                      className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 text-right font-mono text-sm tabular-nums text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <label htmlFor="prn-bed-y" className="sr-only">Khổ bàn in Y (mm)</label>
                    <input
                      id="prn-bed-y"
                      type="number"
                      min="0"
                      placeholder="Y (mm)"
                      value={editingPrinter ? (editingPrinter.bedDimensions?.y ?? '') : (printerForm.bedDimensions?.y ?? '')}
                      onChange={(e) => setPrinterBedDimension('y', e.target.value)}
                      aria-invalid={!!printerIssues['bedDimensions.y']}
                      aria-describedby={printerIssues['bedDimensions.y'] ? 'prn-bed-y-error' : undefined}
                      className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 text-right font-mono text-sm tabular-nums text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <label htmlFor="prn-bed-z" className="sr-only">Khổ bàn in Z (mm)</label>
                    <input
                      id="prn-bed-z"
                      type="number"
                      min="0"
                      placeholder="Z (mm)"
                      value={editingPrinter ? (editingPrinter.bedDimensions?.z ?? '') : (printerForm.bedDimensions?.z ?? '')}
                      onChange={(e) => setPrinterBedDimension('z', e.target.value)}
                      aria-invalid={!!printerIssues['bedDimensions.z']}
                      aria-describedby={printerIssues['bedDimensions.z'] ? 'prn-bed-z-error' : undefined}
                      className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 text-right font-mono text-sm tabular-nums text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <FieldError id="prn-bed-x" message={printerIssues['bedDimensions.x']} />
                  <FieldError id="prn-bed-y" message={printerIssues['bedDimensions.y']} />
                  <FieldError id="prn-bed-z" message={printerIssues['bedDimensions.z']} />
                </div>

                <div>
                  <label htmlFor="prn-nozzle" className="mb-1.5 block text-sm font-medium text-fg">Đường Kính Đầu Phun (mm)</label>
                  <input
                    id="prn-nozzle"
                    type="number"
                    step="0.05"
                    min="0"
                    placeholder="Chưa cấu hình"
                    value={editingPrinter ? (editingPrinter.nozzleDiameter ?? '') : (printerForm.nozzleDiameter ?? '')}
                    onChange={(e) => setPrinterField('nozzleDiameter', numberOrUndefined(e.target.value))}
                    aria-invalid={!!printerIssues.nozzleDiameter}
                    aria-describedby={printerIssues.nozzleDiameter ? 'prn-nozzle-error' : undefined}
                    className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 text-right font-mono text-sm tabular-nums text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <FieldError id="prn-nozzle" message={printerIssues.nozzleDiameter} />
                </div>

                <div>
                  <label htmlFor="prn-power" className="mb-1.5 block text-sm font-medium text-fg">Công Suất Điện (kW)</label>
                  <input
                    id="prn-power"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Chưa cấu hình"
                    value={editingPrinter ? (editingPrinter.powerKW ?? '') : (printerForm.powerKW ?? '')}
                    onChange={(e) => setPrinterField('powerKW', numberOrUndefined(e.target.value))}
                    aria-invalid={!!printerIssues.powerKW}
                    aria-describedby={printerIssues.powerKW ? 'prn-power-error' : undefined}
                    className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 text-right font-mono text-sm font-bold tabular-nums text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <FieldError id="prn-power" message={printerIssues.powerKW} />
                </div>

                <div>
                  <label htmlFor="prn-acquisition" className="mb-1.5 block text-sm font-medium text-fg">Giá Trị Đầu Tư Máy (VNĐ)</label>
                  <input
                    id="prn-acquisition"
                    type="number"
                    step="1000000"
                    min="0"
                    placeholder="Chưa cấu hình"
                    value={editingPrinter ? (editingPrinter.acquisitionCost ?? '') : (printerForm.acquisitionCost ?? '')}
                    onChange={(e) => setPrinterField('acquisitionCost', numberOrUndefined(e.target.value))}
                    aria-invalid={!!printerIssues.acquisitionCost}
                    aria-describedby={printerIssues.acquisitionCost ? 'prn-acquisition-error' : undefined}
                    className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 text-right font-mono text-sm font-bold tabular-nums text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <FieldError id="prn-acquisition" message={printerIssues.acquisitionCost} />
                </div>

                <div>
                  <label htmlFor="prn-lifetime" className="mb-1.5 block text-sm font-medium text-fg">Tuổi Thọ Khấu Hao (Giờ)</label>
                  <input
                    id="prn-lifetime"
                    type="number"
                    step="500"
                    min="0"
                    placeholder="Chưa cấu hình"
                    value={editingPrinter ? (editingPrinter.expectedLifetimeHours ?? '') : (printerForm.expectedLifetimeHours ?? '')}
                    onChange={(e) => setPrinterField('expectedLifetimeHours', numberOrUndefined(e.target.value))}
                    aria-invalid={!!printerIssues.expectedLifetimeHours}
                    aria-describedby={printerIssues.expectedLifetimeHours ? 'prn-lifetime-error' : undefined}
                    className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 text-right font-mono text-sm tabular-nums text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <FieldError id="prn-lifetime" message={printerIssues.expectedLifetimeHours} />
                </div>

                <div>
                  <label htmlFor="prn-consumables" className="mb-1.5 block text-sm font-medium text-fg">Hao Mòn Vật Tư / Giờ (VNĐ)</label>
                  <input
                    id="prn-consumables"
                    type="number"
                    step="500"
                    min="0"
                    placeholder="Chưa cấu hình"
                    value={editingPrinter ? (editingPrinter.consumablesHourlyRate ?? '') : (printerForm.consumablesHourlyRate ?? '')}
                    onChange={(e) => setPrinterField('consumablesHourlyRate', numberOrUndefined(e.target.value))}
                    aria-invalid={!!printerIssues.consumablesHourlyRate}
                    aria-describedby={printerIssues.consumablesHourlyRate ? 'prn-consumables-error' : undefined}
                    className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 text-right font-mono text-sm font-bold tabular-nums text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <FieldError id="prn-consumables" message={printerIssues.consumablesHourlyRate} />
                </div>

                <div>
                  <label htmlFor="prn-hourly-rate" className="mb-1.5 block text-sm font-medium text-fg">Đơn Giá Giờ Máy (VNĐ/giờ)</label>
                  <input
                    id="prn-hourly-rate"
                    type="number"
                    step="1000"
                    min="0"
                    placeholder="Chưa cấu hình"
                    value={editingPrinter ? (editingPrinter.hourlyRate ?? '') : (printerForm.hourlyRate ?? '')}
                    onChange={(e) => setPrinterField('hourlyRate', numberOrUndefined(e.target.value))}
                    aria-invalid={!!printerIssues.hourlyRate}
                    aria-describedby={printerIssues.hourlyRate ? 'prn-hourly-rate-error' : undefined}
                    className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 text-right font-mono text-sm tabular-nums text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <FieldError id="prn-hourly-rate" message={printerIssues.hourlyRate} />
                </div>

                <div>
                  <label htmlFor="prn-max-speed" className="mb-1.5 block text-sm font-medium text-fg">Tốc Độ In Tối Đa (mm/s)</label>
                  <input
                    id="prn-max-speed"
                    type="number"
                    min="0"
                    placeholder="Chưa cấu hình"
                    value={editingPrinter ? (editingPrinter.maxPrintSpeedMmS ?? '') : (printerForm.maxPrintSpeedMmS ?? '')}
                    onChange={(e) => setPrinterField('maxPrintSpeedMmS', numberOrUndefined(e.target.value))}
                    aria-invalid={!!printerIssues.maxPrintSpeedMmS}
                    aria-describedby={printerIssues.maxPrintSpeedMmS ? 'prn-max-speed-error' : undefined}
                    className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 text-right font-mono text-sm tabular-nums text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <FieldError id="prn-max-speed" message={printerIssues.maxPrintSpeedMmS} />
                </div>

                <div>
                  <label htmlFor="prn-heated-bed" className="mb-1.5 block text-sm font-medium text-fg">Nhiệt Độ Bàn Tối Đa (°C)</label>
                  <input
                    id="prn-heated-bed"
                    type="number"
                    min="0"
                    placeholder="Chưa cấu hình"
                    value={editingPrinter ? (editingPrinter.heatedBedMaxTemp ?? '') : (printerForm.heatedBedMaxTemp ?? '')}
                    onChange={(e) => setPrinterField('heatedBedMaxTemp', numberOrUndefined(e.target.value))}
                    aria-invalid={!!printerIssues.heatedBedMaxTemp}
                    aria-describedby={printerIssues.heatedBedMaxTemp ? 'prn-heated-bed-error' : undefined}
                    className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 text-right font-mono text-sm tabular-nums text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <FieldError id="prn-heated-bed" message={printerIssues.heatedBedMaxTemp} />
                </div>

                <div className="col-span-2">
                  <label htmlFor="prn-throughput" className="mb-1.5 block text-sm font-medium text-fg">Năng Suất In (g/giờ)</label>
                  <input
                    id="prn-throughput"
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="Để trống nếu chưa khai"
                    value={editingPrinter ? (editingPrinter.throughputGramsPerHour ?? '') : (printerForm.throughputGramsPerHour ?? '')}
                    onChange={(e) => setPrinterThroughput(e.target.value)}
                    aria-invalid={!!printerIssues.throughputGramsPerHour}
                    aria-describedby={printerIssues.throughputGramsPerHour ? 'prn-throughput-error prn-throughput-help' : 'prn-throughput-help'}
                    className="h-10 max-md:min-h-11 w-full rounded-md border border-line-control bg-surface px-3 text-right font-mono text-sm tabular-nums text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <p id="prn-throughput-help" className="text-xs text-fg-muted mt-1">
                    Ví dụ: 100 g trong 3 giờ ⇒ 33,3 g/giờ. Để trống nếu chưa khai — hệ thống ước tính theo thể tích và ghi rõ nguồn, không tự điền số.
                  </p>
                  <FieldError id="prn-throughput" message={printerIssues.throughputGramsPerHour} />
                </div>

                <div className="flex items-center gap-4 col-span-2 pt-2">
                  <label htmlFor="prn-enclosure" className="flex items-center gap-2 cursor-pointer">
                    <input
                      id="prn-enclosure"
                      type="checkbox"
                      checked={editingPrinter ? editingPrinter.hasEnclosure === true : printerForm.hasEnclosure === true}
                      onChange={(e) => setPrinterField('hasEnclosure', e.target.checked)}
                      className="size-4 rounded-sm border-line-control text-primary focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    <span className="font-semibold text-fg">Có Buồng Kín Giữ Nhiệt</span>
                  </label>

                  <label htmlFor="prn-ams" className="flex items-center gap-2 cursor-pointer">
                    <input
                      id="prn-ams"
                      type="checkbox"
                      checked={editingPrinter ? editingPrinter.hasAMS === true : printerForm.hasAMS === true}
                      onChange={(e) => setPrinterField('hasAMS', e.target.checked)}
                      className="size-4 rounded-sm border-line-control text-primary focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    <span className="font-semibold text-fg">Có Bộ Đổi Màu Tự Động AMS</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-line-subtle pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => { setIsNewPrinterOpen(false); setEditingPrinter(null); setPrinterIssues({}); }}
                >
                  Hủy
                </Button>
                <Button type="submit" variant="primary">
                  Lưu Máy In
                </Button>
              </div>
            </form>
        </Modal>
  );
};
