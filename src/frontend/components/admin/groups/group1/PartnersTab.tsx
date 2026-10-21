import React from 'react';
import { Button, Icon, EmptyState, DataTable, Modal, Field, Input, Select } from '@frontend/ui';
import type { WorkshopPartner } from '@/types';
import type { PartnersTabProps } from './types';

export const PartnersTab: React.FC<PartnersTabProps> = (props) => {
  const { partners, isPartnersLoading, loadPartners, setPartnerDraft, emptyPartnerDraft, partnerColumns, partnerDraft, handleSubmitPartner } = props;

  return (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-4 rounded-lg border border-line">
            <div className="text-xs text-fg-subtle font-medium">
              {`Đối tác xưởng đọc/ghi trực tiếp bảng workshop_partners trên Supabase: ${partners.length} bản ghi.`}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="secondary"
                size="sm"
                leadingIcon={<Icon name="sync" size={16} className={isPartnersLoading ? 'animate-spin motion-reduce:animate-none' : ''} />}
                onClick={() => void loadPartners()}
                disabled={isPartnersLoading}
              >
                Tải Lại
              </Button>

              <Button
                variant="primary"
                size="sm"
                leadingIcon={<Icon name="add_business" size={16} />}
                onClick={() => setPartnerDraft(emptyPartnerDraft())}
              >
                Thêm Đối Tác
              </Button>
            </div>
          </div>

          <div className="bg-surface rounded-lg border border-line overflow-hidden">
            {!isPartnersLoading && partners.length === 0 ? (
            <EmptyState
              size="sm"
              title="Chưa có đối tác xưởng nào"
              description="Bảng workshop_partners chưa có bản ghi nào để hiển thị."
              icon={<Icon name="handshake" size={20} className="text-primary" />}
              action={
                <Button
                  variant="primary"
                  size="sm"
                  leadingIcon={<Icon name="add_business" size={18} />}
                  onClick={() => setPartnerDraft(emptyPartnerDraft())}
                >
                  Thêm Đối Tác
                </Button>
              }
            />
            ) : (
            <DataTable<WorkshopPartner>
              columns={partnerColumns}
              rows={partners}
              getRowId={(row) => row.id}
              loading={isPartnersLoading && partners.length === 0}
              caption="Đối tác xưởng in"
              tableLabel="Đối tác xưởng in"
              defaultSort={[{ key: 'name', direction: 'asc' }]}
              emptyState={
                <EmptyState
                  live
                  title="Chưa có đối tác xưởng nào"
                  description="Thêm đối tác xưởng để bắt đầu điều phối đơn."
                />
              }
            />
            )}
          </div>

          {/* MODAL: THÊM / SỬA ĐỐI TÁC (ghi thẳng vào Supabase) */}
          {partnerDraft && (
            <Modal
              open
              onClose={() => setPartnerDraft(null)}
              size="lg"
              title={
                partners.some((p) => p.id === partnerDraft.id)
                  ? `Cấu hình đối tác: ${partnerDraft.name}`
                  : 'Thêm đối tác xưởng mới'
              }
            >
                <form onSubmit={handleSubmitPartner} className="mt-4 space-y-4">
                  <Field label="Tên xưởng / trạm MES *" optionalLabel={null}>
                    {(control) => (
                      <Input
                        {...control}
                        type="text"
                        required
                        value={partnerDraft.name}
                        onChange={(e) => setPartnerDraft({ ...partnerDraft, name: e.target.value })}
                      />
                    )}
                  </Field>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Vùng:" optionalLabel={null}>
                      {(control) => (
                        <Select
                          {...control}
                          value={partnerDraft.region}
                          onChange={(e) =>
                            setPartnerDraft({ ...partnerDraft, region: e.target.value as WorkshopPartner['region'] })
                          }
                        >
                          <option value="hanoi">Miền Bắc (Hà Nội)</option>
                          <option value="danang">Miền Trung (Đà Nẵng)</option>
                          <option value="hcm">Miền Nam (TP.HCM)</option>
                        </Select>
                      )}
                    </Field>
                    <Field label="Trạng thái:" optionalLabel={null}>
                      {(control) => (
                        <Select
                          {...control}
                          value={partnerDraft.status}
                          onChange={(e) =>
                            setPartnerDraft({ ...partnerDraft, status: e.target.value as WorkshopPartner['status'] })
                          }
                        >
                          <option value="active">Sẵn sàng</option>
                          <option value="busy">Đang bận</option>
                          <option value="offline">Ngoại tuyến</option>
                        </Select>
                      )}
                    </Field>
                  </div>

                  <Field label="Địa chỉ *" optionalLabel={null}>
                    {(control) => (
                      <Input
                        {...control}
                        type="text"
                        required
                        value={partnerDraft.address}
                        onChange={(e) => setPartnerDraft({ ...partnerDraft, address: e.target.value })}
                      />
                    )}
                  </Field>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Người phụ trách:" optionalLabel={null}>
                      {(control) => (
                        <Input
                          {...control}
                          type="text"
                          value={partnerDraft.contactPerson}
                          onChange={(e) => setPartnerDraft({ ...partnerDraft, contactPerson: e.target.value })}
                        />
                      )}
                    </Field>
                    <Field label="Đường dây nóng:" optionalLabel={null}>
                      {(control) => (
                        <Input
                          {...control}
                          type="text"
                          value={partnerDraft.phone}
                          onChange={(e) => setPartnerDraft({ ...partnerDraft, phone: e.target.value })}
                        />
                      )}
                    </Field>
                  </div>

                  <Field label="Email:" optionalLabel={null}>
                    {(control) => (
                      <Input
                        {...control}
                        type="email"
                        value={partnerDraft.email}
                        onChange={(e) => setPartnerDraft({ ...partnerDraft, email: e.target.value })}
                      />
                    )}
                  </Field>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Field label="Máy đang chạy:" optionalLabel={null}>
                      {(control) => (
                        <Input
                          {...control}
                          type="number"
                          numeric
                          min="0"
                          value={partnerDraft.activePrintersCount}
                          onChange={(e) =>
                            setPartnerDraft({ ...partnerDraft, activePrintersCount: Number(e.target.value) })
                          }
                        />
                      )}
                    </Field>
                    <Field label="Máy rảnh:" optionalLabel={null}>
                      {(control) => (
                        <Input
                          {...control}
                          type="number"
                          numeric
                          min="0"
                          value={partnerDraft.availablePrintersCount}
                          onChange={(e) =>
                            setPartnerDraft({ ...partnerDraft, availablePrintersCount: Number(e.target.value) })
                          }
                        />
                      )}
                    </Field>
                    <Field label="Điểm SLA:" optionalLabel={null}>
                      {(control) => (
                        <Input
                          {...control}
                          type="number"
                          numeric
                          step="0.1"
                          min="0"
                          max="5"
                          value={partnerDraft.slaRating}
                          onChange={(e) => setPartnerDraft({ ...partnerDraft, slaRating: Number(e.target.value) })}
                        />
                      )}
                    </Field>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-fg mb-1.5">
                      Công nghệ hỗ trợ:
                    </label>
                    <div className="flex items-center gap-4 pt-1">
                      {(['FDM', 'SLA', 'SLS'] as const).map((tech) => (
                        <label key={tech} className="flex items-center gap-1.5 text-xs text-fg-muted cursor-pointer">
                          <input
                            type="checkbox"
                            checked={(partnerDraft.supportedTechnologies || []).includes(tech)}
                            onChange={(e) => {
                              const current: WorkshopPartner['supportedTechnologies'] =
                                partnerDraft.supportedTechnologies || [];
                              const next: WorkshopPartner['supportedTechnologies'] = e.target.checked
                                ? current.includes(tech)
                                  ? current
                                  : [...current, tech]
                                : current.filter((t) => t !== tech);
                              setPartnerDraft({ ...partnerDraft, supportedTechnologies: next });
                            }}
                            className="size-4 rounded-sm border-line-control accent-primary"
                          />
                          <span>{tech}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t border-line-subtle">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setPartnerDraft(null)}
                    >
                      Hủy Bỏ
                    </Button>
                    <Button type="submit" variant="primary">
                      Lưu Vào Supabase
                    </Button>
                  </div>
                </form>
            </Modal>
          )}
        </div>
  );
};
