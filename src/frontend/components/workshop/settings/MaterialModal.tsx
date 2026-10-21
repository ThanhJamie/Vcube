// MaterialModal (Khai báo/Chỉnh sửa vật liệu) — tách từ WorkshopSettingsView.tsx (Phase 4c, block-move verbatim; parent giữ state).
import { Button, Field, Input, Modal, Select } from '@frontend/ui';
import type { WorkshopSettingsController } from './types';


export interface MaterialModalProps {
  ctl: WorkshopSettingsController;
}

export const MaterialModal: React.FC<MaterialModalProps> = ({ ctl }) => {
  const { editingMaterial, handleSaveMaterial, matColor, matName,
    matPrice, matStock, matThreshold, matType,
    materialModalOpen, savingMaterial, setMatColor, setMatName,
    setMatPrice, setMatStock, setMatThreshold, setMatType,
    setMaterialModalOpen } = ctl;

  return (
<Modal
        open={materialModalOpen}
        onClose={() => setMaterialModalOpen(false)}
        title={editingMaterial ? 'Chỉnh sửa vật liệu' : 'Khai báo vật liệu'}
        description="Vật liệu thuộc kho của xưởng bạn."
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={() => setMaterialModalOpen(false)}>
              Huỷ
            </Button>
            <Button variant="primary" type="submit" form="w1b-material-form" loading={savingMaterial} loadingLabel="Đang lưu…">
              {editingMaterial ? 'Lưu thay đổi' : 'Thêm vào kho'}
            </Button>
          </div>
        }
      >
        <form id="w1b-material-form" onSubmit={handleSaveMaterial} className="flex flex-col gap-4">
          <Field label="Tên vật liệu" required>
            {(control) => <Input {...control} value={matName} onChange={(e) => setMatName(e.target.value)} />}
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Loại">
              {(control) => (
                <Select
                  {...control}
                  value={matType}
                  onChange={(e) => setMatType(e.target.value)}
                  options={['PLA', 'PETG', 'ABS', 'ASA', 'TPU', 'Nylon', 'Resin', 'Khác'].map((t) => ({
                    value: t,
                    label: t,
                  }))}
                />
              )}
            </Field>

            <Field label="Màu">
              {(control) => <Input {...control} value={matColor} onChange={(e) => setMatColor(e.target.value)} />}
            </Field>

            <Field label="Tồn kho (gram)">
              {(control) => (
                <Input
                  {...control}
                  numeric
                  value={matStock}
                  onChange={(e) => setMatStock(e.target.value.replace(/[^\d]/g, ''))}
                  placeholder="0"
                />
              )}
            </Field>

            <Field label="Ngưỡng cảnh báo (gram)">
              {(control) => (
                <Input
                  {...control}
                  numeric
                  value={matThreshold}
                  onChange={(e) => setMatThreshold(e.target.value.replace(/[^\d]/g, ''))}
                  placeholder="500"
                />
              )}
            </Field>
          </div>

          <Field label="Đơn giá (VND/kg)" hint="Để trống = chưa khai.">
            {(control) => (
              <Input
                {...control}
                numeric
                value={matPrice}
                onChange={(e) => setMatPrice(e.target.value.replace(/[^\d]/g, ''))}
                placeholder="—"
              />
            )}
          </Field>
        </form>
      </Modal>
  );
};

export default MaterialModal;
