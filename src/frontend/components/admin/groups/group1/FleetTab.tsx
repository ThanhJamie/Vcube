import React from 'react';
import { Button, Icon, EmptyState, Badge } from '@frontend/ui';
import { printerToMachine } from './group1Shared';
import type { FleetTabProps } from './types';

export const FleetTab: React.FC<FleetTabProps> = (props) => {
  const { setFleetStatusFilter, fleetStatusFilter, isFleetLoading, loadFleet, setIsAddMachineModalOpen, fleetPrinters, fleetError, filteredPrinters, getDepreciationPerHour, electricityRateVnd, getElectricityPerHour, formatVnd, handleSetPrinterStatus } = props;

  return (
        <div className="space-y-4">
          {/* Fleet Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface p-4 rounded-lg border border-line">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex flex-wrap items-center gap-1 bg-surface-muted border border-line p-1 rounded-md text-sm">
                <span className="text-fg-subtle px-1 text-xs uppercase tracking-wider">Trạng thái máy:</span>
                {(['all', 'Free', 'Busy', 'Maintenance'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setFleetStatusFilter(s)}
                    className={`px-3 py-1.5 rounded-sm transition-colors cursor-pointer ${
                      fleetStatusFilter === s
                        ? 'bg-surface text-fg font-semibold shadow-e1'
                        : 'text-fg-muted hover:text-fg'
                    }`}
                  >
                    {s === 'all'
                      ? ('Tất cả')
                      : s === 'Free'
                      ? ('Rảnh')
                      : s === 'Busy'
                      ? ('Đang In')
                      : ('Bảo Trì')}
                  </button>
                ))}
              </div>

              <span className="text-xs text-fg-subtle">
                Nguồn: bảng printer_fleet (đội máy toàn hệ thống)
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="secondary"
                size="sm"
                leadingIcon={<Icon name="sync" size={16} className={isFleetLoading ? 'animate-spin motion-reduce:animate-none' : ''} />}
                onClick={() => void loadFleet()}
                disabled={isFleetLoading}
              >
                Tải Lại
              </Button>

              <Button
                variant="primary"
                size="sm"
                leadingIcon={<Icon name="add" size={16} />}
                onClick={() => setIsAddMachineModalOpen(true)}
              >
                Biên Chế Máy Mới
              </Button>
            </div>
          </div>

          {/* Đang tải */}
          {isFleetLoading && fleetPrinters === null && (
            <div className="bg-surface p-6 rounded-lg border border-line-subtle text-center text-sm text-fg-muted">
              Đang tải đội máy in từ bảng printer_fleet...
            </div>
          )}

          {/* LỖI THẬT — không rơi về 0, không rơi về fixture */}
          {!isFleetLoading && fleetError !== null && (
            <div role="alert" className="p-4 bg-danger-tint border border-danger/20 rounded-lg flex items-start gap-3">
              <Icon name="error" size={24} className="text-danger mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-danger text-sm">
                  Không đọc được đội máy in từ bảng printer_fleet
                </h4>
                <p className="text-xs text-danger mt-1 font-mono break-all">{fleetError}</p>
                <Button variant="secondary" size="sm" className="mt-2" onClick={() => void loadFleet()}>
                  Thử lại
                </Button>
              </div>
            </div>
          )}

          {/* RỖNG THẬT / không khớp bộ lọc */}
          {!isFleetLoading && fleetError === null && fleetPrinters !== null && filteredPrinters.length === 0 && (
            <EmptyState
              size="sm"
              title="Chưa có máy in nào"
              description={
                fleetStatusFilter !== 'all'
                  ? 'Không có máy in nào khớp bộ lọc trạng thái hiện tại.'
                  : 'Bảng printer_fleet chưa có bản ghi nào.'
              }
              icon={<Icon name="print" size={20} className="text-primary" />}
              action={
                <Button
                  variant="primary"
                  size="sm"
                  leadingIcon={<Icon name="add" size={18} />}
                  onClick={() => setIsAddMachineModalOpen(true)}
                >
                  Biên Chế Máy Mới
                </Button>
              }
            />
          )}

          {/* Machine Fleet Grid */}
          {!isFleetLoading && fleetError === null && filteredPrinters.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredPrinters.map((p) => {
              const m = printerToMachine(p);
              const depPerHour =
                m.purchasePrice != null && m.lifetimeHours ? getDepreciationPerHour(m) : null;
              const elecPerHour =
                m.avgPowerKW != null && electricityRateVnd != null
                  ? getElectricityPerHour(m, electricityRateVnd)
                  : null;
              const totalHourlyCost =
                depPerHour != null && elecPerHour != null ? depPerHour + elecPerHour : null;
              const statusLabel =
                p.status === 'Printing'
                  ? 'Đang In'
                  : p.status === 'Maintenance'
                  ? 'Bảo Trì'
                  : 'Rảnh';
              const volumeText =
                p.bedDimensions &&
                p.bedDimensions.x != null &&
                p.bedDimensions.y != null &&
                p.bedDimensions.z != null
                  ? `${p.bedDimensions.x}×${p.bedDimensions.y}×${p.bedDimensions.z}`
                  : null;

              return (
                <div
                  key={p.id}
                  className="bg-surface rounded-lg border border-line p-6 hover:shadow-e1 transition-all duration-300"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-sm border border-line text-xs font-medium uppercase tracking-wider bg-surface-muted text-fg-muted">
                          {p.technology}
                        </span>
                        <Badge
                          variant={p.status === 'Idle' ? 'success' : p.status === 'Printing' ? 'info' : 'warning'}
                          dot
                        >
                          {statusLabel}
                        </Badge>
                      </div>
                      <h4 className="font-bold text-fg text-base mt-2">{p.name}</h4>
                      <p className="text-xs text-fg-subtle mt-0.5 flex items-center gap-1">
                        <Icon name="precision_manufacturing" size={13} />
                        {p.brand || '—'}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-mono text-fg-subtle block">Khổ in (mm)</span>
                      <span className="text-xs font-mono font-bold text-fg-muted">{volumeText ?? '—'}</span>
                    </div>
                  </div>

                  {/* Hourly Cost Breakdown Card */}
                  <div className="mt-4 p-3 bg-surface-muted rounded-md border border-line-subtle space-y-2">
                    <div className="text-xs font-semibold uppercase text-fg-muted tracking-wider flex items-center justify-between">
                      <span>Định Mức Chi Phí Vận Hành</span>
                      <span className="font-mono font-bold tabular-nums text-fg">
                        {totalHourlyCost != null ? `${formatVnd(totalHourlyCost)}/h` : '—'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-line-subtle text-xs">
                      <div>
                        <div className="text-xs text-fg-subtle font-medium">
                          Khấu hao máy/giờ:
                        </div>
                        <div className="font-bold text-fg font-mono tabular-nums">
                          {depPerHour != null ? `${formatVnd(depPerHour)}/h` : '—'}
                        </div>
                        <div className="text-xs text-fg-subtle">
                          {m.purchasePrice != null && m.lifetimeHours
                            ? `(${formatVnd(m.purchasePrice)} / ${m.lifetimeHours}h)`
                            : '(chưa khai giá mua / tuổi thọ)'}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-fg-subtle font-medium">
                          Tiền điện máy/giờ:
                        </div>
                        <div className="font-bold text-fg font-mono tabular-nums">
                          {elecPerHour != null ? `${formatVnd(elecPerHour)}/h` : '—'}
                        </div>
                        <div className="text-xs text-fg-subtle">
                          {m.avgPowerKW != null && electricityRateVnd != null
                            ? `(${m.avgPowerKW} kW × ${formatVnd(electricityRateVnd)})`
                            : electricityRateVnd == null
                            ? '(chưa cấu hình giá điện trong pricing_global_settings)'
                            : '(chưa khai công suất)'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Machine Action Bar — ghi thẳng xuống printer_fleet */}
                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-line-subtle text-xs">
                    <span className="text-fg-subtle font-mono">ID: {p.id}</span>

                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          void handleSetPrinterStatus(p, p.status === 'Printing' ? 'Idle' : 'Printing')
                        }
                      >
                        {p.status === 'Printing'
                          ? 'Đặt Rảnh (Idle)'
                          : 'Đặt Bận (Printing)'}
                      </Button>
                      <Button
                        iconOnly
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          void handleSetPrinterStatus(p, p.status === 'Maintenance' ? 'Idle' : 'Maintenance')
                        }
                        title="Chuyển sang bảo trì"
                        aria-label="Chuyển sang bảo trì"
                      >
                        <Icon name="build" size={14} />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          )}
        </div>
  );
};
