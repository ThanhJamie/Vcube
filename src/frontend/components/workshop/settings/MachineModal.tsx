// MachineModal (Khai báo/Chỉnh sửa máy in) — tách từ WorkshopSettingsView.tsx (Phase 4c, block-move verbatim; parent giữ state).
import { Button, Field, Input, Modal, Select } from '@frontend/ui';
import { MY_MACHINE_STATUSES, MY_MACHINE_STATUS_LABELS } from '@backend/services/workshopService';
import type { WorkshopSettingsController } from './types';


export interface MachineModalProps {
  ctl: WorkshopSettingsController;
}

export const MachineModal: React.FC<MachineModalProps> = ({ ctl }) => {
  const { applyFleetSuggestion, editingMachine, fleetCatalog, handleSaveMachine,
    mHourlyRate, mName, mStatus, mTechnology,
    mVol, machineModalOpen, savingMachine, setMHourlyRate,
    setMName, setMStatus, setMTechnology, setMVol,
    setMachineModalOpen } = ctl;

  return (
<Modal
        open={machineModalOpen}
        onClose={() => setMachineModalOpen(false)}
        title={editingMachine ? 'Chỉnh sửa máy in' : 'Khai báo máy in'}
        description="Máy in thuộc xưởng của bạn. Trạng thái do bạn tự đặt, không phải số đo tự động từ thiết bị."
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={() => setMachineModalOpen(false)}>
              Huỷ
            </Button>
            <Button variant="primary" type="submit" form="w1b-machine-form" loading={savingMachine} loadingLabel="Đang lưu…">
              {editingMachine ? 'Lưu thay đổi' : 'Thêm máy vào xưởng'}
            </Button>
          </div>
        }
      >
        <form id="w1b-machine-form" onSubmit={handleSaveMachine} className="flex flex-col gap-4">
          {fleetCatalog.length > 0 ? (
            <Field
              label="Gợi ý từ danh mục máy của VCUBE"
              hint="Chọn để điền sẵn tên và khổ in. Đây là danh mục tham chiếu, không phải máy của xưởng bạn."
              optionalLabel={null}
            >
              {(control) => (
                <Select
                  {...control}
                  placeholder="— Không dùng gợi ý —"
                  options={fleetCatalog.map((f) => ({ value: f.id, label: f.name }))}
                  value=""
                  onChange={(e) => applyFleetSuggestion(e.target.value)}
                />
              )}
            </Field>
          ) : null}

          <Field label="Tên máy in" required>
            {(control) => <Input {...control} value={mName} onChange={(e) => setMName(e.target.value)} />}
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Công nghệ">
              {(control) => (
                <Select
                  {...control}
                  value={mTechnology}
                  onChange={(e) => setMTechnology(e.target.value)}
                  options={[
                    { value: 'FDM', label: 'FDM / FFF (sợi nhựa)' },
                    { value: 'SLA', label: 'SLA / Resin quang hoá' },
                    { value: 'SLS', label: 'SLS (bột laser)' },
                    { value: 'PolyJet', label: 'PolyJet' },
                  ]}
                />
              )}
            </Field>

            <Field label="Trạng thái">
              {(control) => (
                <Select
                  {...control}
                  value={mStatus}
                  onChange={(e) => setMStatus(e.target.value)}
                  options={MY_MACHINE_STATUSES.map((st) => ({
                    value: st,
                    label: MY_MACHINE_STATUS_LABELS[st] ?? st,
                  }))}
                />
              )}
            </Field>
          </div>

          <Field label="Đơn giá giờ máy (VND/giờ)" hint="Để trống = chưa khai.">
            {(control) => (
              <Input
                {...control}
                numeric
                value={mHourlyRate}
                onChange={(e) => setMHourlyRate(e.target.value.replace(/[^\d]/g, ''))}
                placeholder="—"
              />
            )}
          </Field>

          <Field label="Khổ in (X × Y × Z mm)" hint="Để trống = chưa khai.">
            {() => (
              <div className="grid grid-cols-3 gap-2">
                {(['x', 'y', 'z'] as const).map((axis) => (
                  <Input
                    key={axis}
                    numeric
                    value={mVol[axis]}
                    aria-label={`Khổ in trục ${axis.toUpperCase()}`}
                    placeholder={axis.toUpperCase()}
                    onChange={(e) =>
                      setMVol((prev) => ({ ...prev, [axis]: e.target.value.replace(/[^\d]/g, '') }))
                    }
                  />
                ))}
              </div>
            )}
          </Field>
        </form>
      </Modal>
  );
};

export default MachineModal;
