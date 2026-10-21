import React from 'react';
import { Icon, Input, Button, Skeleton, EmptyState, Badge } from '@frontend/ui';
import type { WorkshopsTabProps } from './types';

export const WorkshopsTab: React.FC<WorkshopsTabProps> = (props) => {
  const { setFilterRegion, filters, setFilterStatus, setSearchQuery, setIsAddWorkshopModalOpen, workshopsLoading, workshops, workshopsError, loadWorkshops, filteredWorkshops, numOrEmpty, vndOrEmpty, handleApprove, setActiveTab, handleSuspend, handleSetWorkshopStatus } = props;

  return (
        <div className="space-y-4">
          {/* Controls bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-surface p-4 rounded-lg border border-line">
            <div className="flex flex-wrap items-center gap-2">
              {/* Region Filter */}
              <div className="inline-flex flex-wrap items-center gap-1 bg-surface-muted border border-line p-1 rounded-md text-sm">
                <span className="text-fg-subtle px-1 text-xs uppercase tracking-wider">Khu vực:</span>
                {(['all', 'Bắc', 'Trung', 'Nam'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setFilterRegion(r)}
                    className={`px-3 py-1.5 rounded-sm transition-colors cursor-pointer ${
                      filters.region === r
                        ? 'bg-surface text-fg font-semibold shadow-e1'
                        : 'text-fg-muted hover:text-fg'
                    }`}
                  >
                    {r === 'all' ? ('Tất cả') : r}
                  </button>
                ))}
              </div>

              {/* Status Filter */}
              <div className="inline-flex flex-wrap items-center gap-1 bg-surface-muted border border-line p-1 rounded-md text-sm">
                <span className="text-fg-subtle px-1 text-xs uppercase tracking-wider">Trạng thái:</span>
                {(['all', 'Verified', 'Pending', 'Suspended'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(s)}
                    className={`px-3 py-1.5 rounded-sm transition-colors cursor-pointer ${
                      filters.status === s
                        ? 'bg-surface text-fg font-semibold shadow-e1'
                        : 'text-fg-muted hover:text-fg'
                    }`}
                  >
                    {s === 'all' ? ('Tất cả') : s}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <Icon name="search" size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-subtle pointer-events-none" />
                <Input
                  type="text"
                  aria-label="Tìm tên xưởng, địa chỉ, sđt"
                  placeholder="Tìm tên xưởng, địa chỉ, sđt..."
                  value={filters.searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>

              <Button
                variant="primary"
                size="sm"
                leadingIcon={<Icon name="add_circle" size={16} />}
                onClick={() => setIsAddWorkshopModalOpen(true)}
                className="shrink-0"
              >
                Thêm Xưởng In
              </Button>
            </div>
          </div>

          {/* Workshop Cards Grid */}
          {/* Đang tải danh sách xưởng từ DB */}
          {workshopsLoading && workshops.length === 0 && workshopsError === null && (
            <div
              role="status"
              aria-label="Đang tải danh sách xưởng từ workshop_profiles..."
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {[0, 1].map((i) => (
                <Skeleton key={i} variant="rect" height="10rem" rounded="lg" />
              ))}
            </div>
          )}

          {/* LỖI THẬT */}
          {workshopsError !== null && (
            <div role="alert" className="p-4 bg-danger-tint border border-danger/20 rounded-lg flex items-start gap-3">
              <Icon name="error" size={24} className="text-danger mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-danger text-sm">
                  Không đọc được bảng workshop_profiles
                </h4>
                <p className="text-xs text-danger mt-1 font-mono break-all">{workshopsError}</p>
                <Button variant="secondary" size="sm" className="mt-2" onClick={() => void loadWorkshops()}>
                  Thử lại
                </Button>
              </div>
            </div>
          )}

          {/* RỖNG THẬT / không khớp bộ lọc */}
          {workshopsError === null && !workshopsLoading && filteredWorkshops.length === 0 && (
            <EmptyState
              size="sm"
              title="Chưa có xưởng in nào"
              description={
                workshops.length === 0
                  ? 'Bảng workshop_profiles chưa có bản ghi nào.'
                  : 'Không có bản ghi xưởng in nào khớp bộ lọc khu vực/trạng thái hiện tại.'
              }
              icon={<Icon name="factory" size={20} className="text-primary" />}
              action={
                <Button
                  variant="primary"
                  size="sm"
                  leadingIcon={<Icon name="add_circle" size={18} />}
                  onClick={() => setIsAddWorkshopModalOpen(true)}
                >
                  Thêm Xưởng In
                </Button>
              }
            />
          )}

          {workshopsError === null && filteredWorkshops.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredWorkshops.map((w) => {
              // `printer_fleet` là đội máy TOÀN HỆ THỐNG (không có `workshop_id`) nên KHÔNG
              // suy ra được "máy rảnh" của riêng một xưởng. Hiện đúng 2 số đếm mà
              // `workshop_profiles` thật sự lưu (`total_machines`, `active_machines_now`);
              // phần không có nguồn thì để '—' thay vì bịa 0.
              return (
                <div
                  key={w.id}
                  className="bg-surface rounded-lg border border-line hover:shadow-e1 transition-all duration-300 flex flex-col justify-between overflow-hidden"
                >
                  <div className="p-6 border-b border-line-subtle">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-sm border border-line text-xs font-semibold uppercase ${
                              w.region === 'Bắc'
                                ? 'bg-info-tint text-info'
                                : w.region === 'Trung'
                                ? 'bg-warning-tint text-warning'
                                : 'bg-positive-tint text-positive'
                            }`}
                          >
                            Miền {w.region}
                          </span>
                          <Badge
                            variant={
                              w.verifiedStatus === 'Verified'
                                ? 'success'
                                : w.verifiedStatus === 'Pending'
                                ? 'warning'
                                : 'danger'
                            }
                            dot
                          >
                            {w.verifiedStatus === 'Verified'
                              ? '● ' + ('Đã duyệt')
                              : w.verifiedStatus === 'Pending'
                              ? '⏳ ' + ('Chờ duyệt')
                              : '✕ ' + ('Đình chỉ')}
                          </Badge>
                        </div>
                        <h3 className="font-bold text-fg text-base mt-2 line-clamp-1">{w.workshopName}</h3>
                        <p className="text-xs text-fg-subtle mt-0.5 flex items-center gap-1 line-clamp-1">
                          <Icon name="pin_drop" size={14} />
                          {w.address}
                        </p>
                      </div>
                    </div>

                    {/* Machine summary mini badges */}
                    <div className="grid grid-cols-3 gap-2 mt-4 p-3 bg-surface-muted rounded-md text-center">
                      <div>
                        <div className="text-xs text-fg-subtle font-semibold uppercase">Tổng máy</div>
                        <div className="text-base font-bold tabular-nums text-fg">{numOrEmpty(w.totalMachines)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-fg-subtle font-semibold uppercase">Rảnh</div>
                        <div className="text-base font-bold tabular-nums text-fg">—</div>
                      </div>
                      <div>
                        <div className="text-xs text-fg-subtle font-semibold uppercase">Đang In</div>
                        <div className="text-base font-bold tabular-nums text-fg">{numOrEmpty(w.activeMachinesNow)}</div>
                      </div>
                    </div>

                    {/* Rates & Contact */}
                    <div className="mt-3 space-y-1 text-xs text-fg-muted">
                      <div className="flex justify-between">
                        <span className="text-fg-subtle">Đơn giá điện:</span>
                        <span className="font-semibold text-fg-muted">{vndOrEmpty(w.electricityRateOverride)}/kWh</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-fg-subtle">Nhân công vận hành:</span>
                        <span className="font-semibold text-fg-muted">{vndOrEmpty(w.laborRateOverride)}/h</span>
                      </div>
                      {w.contactPhone && (
                        <div className="flex justify-between pt-1 border-t border-line-subtle">
                          <span className="text-fg-subtle">Đường dây nóng:</span>
                          <span className="font-mono text-fg-muted">{w.contactPhone}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="p-4 bg-surface-muted/60 flex items-center justify-between gap-2">
                    {w.verifiedStatus === 'Pending' ? (
                      <Button
                        variant="primary"
                        size="sm"
                        fullWidth
                        leadingIcon={<Icon name="check_circle" size={16} />}
                        onClick={() => handleApprove(w.id, w.workshopName)}
                      >
                        Phê Duyệt Xưởng Này
                      </Button>
                    ) : w.verifiedStatus === 'Verified' ? (
                      <div className="flex items-center gap-2 w-full">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="flex-1"
                          leadingIcon={<Icon name="view_timeline" size={16} />}
                          onClick={() => setActiveTab('fleet')}
                        >
                          Xem Đội Máy
                        </Button>
                        <Button
                          variant="danger-ghost"
                          size="sm"
                          onClick={() => handleSuspend(w.id, w.workshopName)}
                          title="Đình chỉ xưởng"
                        >
                          Đình Chỉ
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        fullWidth
                        leadingIcon={<Icon name="replay" size={16} />}
                        onClick={() => void handleSetWorkshopStatus(w.id, 'Verified', w.workshopName)}
                      >
                        Khôi Phục Hoạt Động
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          )}
        </div>
  );
};
