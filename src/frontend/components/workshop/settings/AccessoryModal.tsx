// AccessoryModal (Khai báo/Chỉnh sửa phụ kiện) — tách từ WorkshopSettingsView.tsx (Phase 4c, block-move verbatim; parent giữ state).
import { Button, Field, Input, Modal } from '@frontend/ui';
import type { WorkshopSettingsController } from './types';


export interface AccessoryModalProps {
  ctl: WorkshopSettingsController;
}

export const AccessoryModal: React.FC<AccessoryModalProps> = ({ ctl }) => {
  const { accModalOpen, accName, accQty, accSku,
    accUnit, editingAcc, handleSaveAcc, savingAcc,
    setAccModalOpen, setAccName, setAccQty, setAccSku,
    setAccUnit } = ctl;

  return (
<Modal
        open={accModalOpen}
        onClose={() => setAccModalOpen(false)}
        title={editingAcc ? 'Chỉnh sửa phụ kiện' : 'Khai báo phụ kiện'}
        description="Phụ kiện riêng của xưởng bạn."
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={() => setAccModalOpen(false)}>
              Huỷ
            </Button>
            <Button variant="primary" type="submit" form="w1b-acc-form" loading={savingAcc} loadingLabel="Đang lưu…">
              {editingAcc ? 'Lưu thay đổi' : 'Thêm phụ kiện'}
            </Button>
          </div>
        }
      >
        <form id="w1b-acc-form" onSubmit={handleSaveAcc} className="flex flex-col gap-4">
          <Field label="Tên phụ kiện" required>
            {(control) => <Input {...control} value={accName} onChange={(e) => setAccName(e.target.value)} />}
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Số lượng">
              {(control) => (
                <Input
                  {...control}
                  numeric
                  value={accQty}
                  onChange={(e) => setAccQty(e.target.value.replace(/[^\d]/g, ''))}
                  placeholder="0"
                />
              )}
            </Field>

            <Field label="Đơn vị">
              {(control) => <Input {...control} value={accUnit} onChange={(e) => setAccUnit(e.target.value)} />}
            </Field>
          </div>

          <Field label="Mã SKU">
            {(control) => <Input {...control} value={accSku} onChange={(e) => setAccSku(e.target.value)} />}
          </Field>
        </form>
      </Modal>
  );
};

export default AccessoryModal;
