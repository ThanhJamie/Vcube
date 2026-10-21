import React from 'react';
import { Button, Field, Input, Modal, Select } from '@frontend/ui';
import type { AddMachineModalProps, AddMaterialModalProps, AddWorkshopModalProps } from './types';

export const AddWorkshopModal: React.FC<AddWorkshopModalProps> = (props) => {
  const { setIsAddWorkshopModalOpen, handleCreateWorkshop, newWorkshopForm, setNewWorkshopForm } = props;

  return (
        <Modal
          open
          onClose={() => setIsAddWorkshopModalOpen(false)}
          size="lg"
          title="Thêm Xưởng In Mới Vào Mạng Lưới"
        >
            <form onSubmit={handleCreateWorkshop} className="mt-4 space-y-4">
              <Field label="Tên xưởng in:" optionalLabel={null}>
                {(control) => (
                  <Input
                    {...control}
                    type="text"
                    required
                    placeholder="Ví dụ: Smart 3D FabLab Đà Nẵng"
                    value={newWorkshopForm.workshopName}
                    onChange={(e) => setNewWorkshopForm({ ...newWorkshopForm, workshopName: e.target.value })}
                  />
                )}
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Khu vực (Miền):" optionalLabel={null}>
                  {(control) => (
                    <Select
                      {...control}
                      value={newWorkshopForm.region}
                      onChange={(e) => setNewWorkshopForm({ ...newWorkshopForm, region: e.target.value as any })}
                    >
                      <option value="Bắc">Miền Bắc (Hà Nội, Hải Phòng...)</option>
                      <option value="Trung">Miền Trung (Đà Nẵng, Huế...)</option>
                      <option value="Nam">Miền Nam (TP.HCM, Bình Dương...)</option>
                    </Select>
                  )}
                </Field>
                <Field label="Trạng thái ban đầu:" optionalLabel={null}>
                  {(control) => (
                    <Select
                      {...control}
                      value={newWorkshopForm.verifiedStatus}
                      onChange={(e) => setNewWorkshopForm({ ...newWorkshopForm, verifiedStatus: e.target.value as any })}
                    >
                      <option value="Pending">Chờ duyệt</option>
                      <option value="Verified">Đã duyệt</option>
                    </Select>
                  )}
                </Field>
              </div>

              <Field label="Địa chỉ xưởng:" optionalLabel={null}>
                {(control) => (
                  <Input
                    {...control}
                    type="text"
                    required
                    placeholder="Số nhà, đường, quận/huyện, tỉnh/thành"
                    value={newWorkshopForm.address}
                    onChange={(e) => setNewWorkshopForm({ ...newWorkshopForm, address: e.target.value })}
                  />
                )}
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Số điện thoại:" optionalLabel={null}>
                  {(control) => (
                    <Input
                      {...control}
                      type="text"
                      placeholder="0988 xxx xxx"
                      value={newWorkshopForm.contactPhone}
                      onChange={(e) => setNewWorkshopForm({ ...newWorkshopForm, contactPhone: e.target.value })}
                    />
                  )}
                </Field>
                <Field label="Email liên hệ:" optionalLabel={null}>
                  {(control) => (
                    <Input
                      {...control}
                      type="email"
                      placeholder="workshop@vcube.vn"
                      value={newWorkshopForm.contactEmail}
                      onChange={(e) => setNewWorkshopForm({ ...newWorkshopForm, contactEmail: e.target.value })}
                    />
                  )}
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Giá điện riêng (VNĐ/kWh):" optionalLabel={null}>
                  {(control) => (
                    <Input
                      {...control}
                      type="number"
                      numeric
                      placeholder="Chưa khai ⇒ để trống"
                      value={newWorkshopForm.electricityRateOverride ?? ''}
                      onChange={(e) =>
                        setNewWorkshopForm({
                          ...newWorkshopForm,
                          electricityRateOverride: e.target.value === '' ? null : Number(e.target.value)
                        })
                      }
                    />
                  )}
                </Field>
                <Field label="Công nhân công (VNĐ/giờ):" optionalLabel={null}>
                  {(control) => (
                    <Input
                      {...control}
                      type="number"
                      numeric
                      placeholder="Chưa khai ⇒ để trống"
                      value={newWorkshopForm.laborRateOverride ?? ''}
                      onChange={(e) =>
                        setNewWorkshopForm({
                          ...newWorkshopForm,
                          laborRateOverride: e.target.value === '' ? null : Number(e.target.value)
                        })
                      }
                    />
                  )}
                </Field>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-line-subtle">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsAddWorkshopModalOpen(false)}
                >
                  Hủy Bỏ
                </Button>
                <Button type="submit" variant="primary">
                  {'Lưu & Khởi Tạo Xưởng'}
                </Button>
              </div>
            </form>
        </Modal>
  );
};

export const AddMachineModal: React.FC<AddMachineModalProps> = (props) => {
  const { setIsAddMachineModalOpen, handleCreateMachine, newMachineForm, setNewMachineForm } = props;

  return (
        <Modal
          open
          onClose={() => setIsAddMachineModalOpen(false)}
          size="md"
          title="Thêm Máy In Vào printer_fleet"
        >
            <form onSubmit={handleCreateMachine} className="mt-4 space-y-4">
              <Field label="Tên máy in:" optionalLabel={null}>
                {(control) => (
                  <Input
                    {...control}
                    type="text"
                    required
                    placeholder="Ví dụ: Bambu Lab X1-Carbon #05"
                    value={newMachineForm.machineName}
                    onChange={(e) => setNewMachineForm({ ...newMachineForm, machineName: e.target.value })}
                  />
                )}
              </Field>

              <Field label="Hãng / dòng máy:" optionalLabel={null}>
                {(control) => (
                  <Input
                    {...control}
                    type="text"
                    placeholder="Để trống nếu chưa rõ"
                    value={newMachineForm.brand}
                    onChange={(e) => setNewMachineForm({ ...newMachineForm, brand: e.target.value })}
                  />
                )}
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Công nghệ in:" optionalLabel={null}>
                  {(control) => (
                    <Select
                      {...control}
                      value={newMachineForm.machineType}
                      onChange={(e) => setNewMachineForm({ ...newMachineForm, machineType: e.target.value as any })}
                    >
                      <option value="FDM">FDM (Dây nhựa)</option>
                      <option value="SLA">SLA (Resin lỏng)</option>
                      <option value="SLS">SLS (Bột nylon)</option>
                    </Select>
                  )}
                </Field>
                <Field label="Công suất chạy (kW):" optionalLabel={null}>
                  {(control) => (
                    <Input
                      {...control}
                      type="number"
                      step="0.01"
                      numeric
                      placeholder="Chưa đo ⇒ để trống"
                      value={newMachineForm.avgPowerKW ?? ''}
                      onChange={(e) =>
                        setNewMachineForm({
                          ...newMachineForm,
                          avgPowerKW: e.target.value === '' ? null : Number(e.target.value)
                        })
                      }
                    />
                  )}
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Giá mua máy (VNĐ):" optionalLabel={null}>
                  {(control) => (
                    <Input
                      {...control}
                      type="number"
                      numeric
                      placeholder="Chưa có ⇒ để trống"
                      value={newMachineForm.purchasePrice ?? ''}
                      onChange={(e) =>
                        setNewMachineForm({
                          ...newMachineForm,
                          purchasePrice: e.target.value === '' ? null : Number(e.target.value)
                        })
                      }
                    />
                  )}
                </Field>
                <Field label="Tuổi thọ khấu hao (giờ):" optionalLabel={null}>
                  {(control) => (
                    <Input
                      {...control}
                      type="number"
                      numeric
                      placeholder="Chưa có ⇒ để trống"
                      value={newMachineForm.lifetimeHours ?? ''}
                      onChange={(e) =>
                        setNewMachineForm({
                          ...newMachineForm,
                          lifetimeHours: e.target.value === '' ? null : Number(e.target.value)
                        })
                      }
                    />
                  )}
                </Field>
              </div>

              <p className="text-xs text-fg-subtle">
                Bảng printer_fleet không gắn với một xưởng cụ thể, nên không có ô chọn xưởng. Ô số để trống nghĩa là CHƯA ĐO — hệ thống ghi NULL, không điền số mặc định.
              </p>

              <div className="flex justify-end gap-2 pt-4 border-t border-line-subtle">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsAddMachineModalOpen(false)}
                >
                  Đóng
                </Button>
                <Button type="submit" variant="primary">
                  Ghi Vào DB
                </Button>
              </div>
            </form>
        </Modal>
  );
};

export const AddMaterialModal: React.FC<AddMaterialModalProps> = (props) => {
  const { setIsAddMaterialModalOpen, handleCreateMaterial, newMaterialForm, setNewMaterialForm, workshops } = props;

  return (
        <Modal
          open
          onClose={() => setIsAddMaterialModalOpen(false)}
          size="md"
          title="Thêm Cuộn Nhựa / Vật Liệu Mới"
        >
            <form onSubmit={handleCreateMaterial} className="mt-4 space-y-4">
              <Field label="Xưởng lưu kho:" optionalLabel={null}>
                {(control) => (
                  <Select
                    {...control}
                    value={newMaterialForm.workshopId}
                    onChange={(e) => setNewMaterialForm({ ...newMaterialForm, workshopId: e.target.value })}
                  >
                    {workshops.map((w) => (
                      <option key={w.id} value={w.id}>{w.workshopName} ({w.region})</option>
                    ))}
                  </Select>
                )}
              </Field>

              <Field label="Tên vật liệu:" optionalLabel={null}>
                {(control) => (
                  <Input
                    {...control}
                    type="text"
                    required
                    placeholder="Ví dụ: PETG-CF Carbon Fiber Đen"
                    value={newMaterialForm.materialName}
                    onChange={(e) => setNewMaterialForm({ ...newMaterialForm, materialName: e.target.value })}
                  />
                )}
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Họ nhựa:" optionalLabel={null}>
                  {(control) => (
                    <Select
                      {...control}
                      value={newMaterialForm.materialType}
                      onChange={(e) => setNewMaterialForm({ ...newMaterialForm, materialType: e.target.value as any })}
                    >
                      <option value="PLA">PLA</option>
                      <option value="PETG">PETG</option>
                      <option value="ABS">ABS</option>
                      <option value="TPU">TPU</option>
                      <option value="PA">PA (Nylon)</option>
                      <option value="Resin">Resin</option>
                    </Select>
                  )}
                </Field>
                <Field label="Đơn giá/kg (VNĐ):" optionalLabel={null}>
                  {(control) => (
                    <Input
                      {...control}
                      type="number"
                      numeric
                      value={newMaterialForm.pricePerKg}
                      onChange={(e) => setNewMaterialForm({ ...newMaterialForm, pricePerKg: Number(e.target.value) })}
                    />
                  )}
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Tồn kho ban đầu (grams):" optionalLabel={null}>
                  {(control) => (
                    <Input
                      {...control}
                      type="number"
                      numeric
                      value={newMaterialForm.currentStockGrams}
                      onChange={(e) => setNewMaterialForm({ ...newMaterialForm, currentStockGrams: Number(e.target.value) })}
                    />
                  )}
                </Field>
                <Field label="Ngưỡng cảnh báo (grams):" optionalLabel={null}>
                  {(control) => (
                    <Input
                      {...control}
                      type="number"
                      numeric
                      value={newMaterialForm.lowStockThresholdGrams}
                      onChange={(e) => setNewMaterialForm({ ...newMaterialForm, lowStockThresholdGrams: Number(e.target.value) })}
                    />
                  )}
                </Field>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-line-subtle">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsAddMaterialModalOpen(false)}
                >
                  Đóng
                </Button>
                <Button type="submit" variant="primary">
                  Lưu Cuộn Nhựa
                </Button>
              </div>
            </form>
        </Modal>
  );
};
