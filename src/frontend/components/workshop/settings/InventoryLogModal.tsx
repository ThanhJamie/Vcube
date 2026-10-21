// InventoryLogModal (Phiếu nhập/xuất kho) — tách từ WorkshopSettingsView.tsx (Phase 4c, block-move verbatim; parent giữ state).
import { Button, Field, Input, Modal, Select } from '@frontend/ui';
import { formatNumber } from '@frontend/lib/format';
import type { WorkshopSettingsController } from './types';


export interface InventoryLogModalProps {
  ctl: WorkshopSettingsController;
}

export const InventoryLogModal: React.FC<InventoryLogModalProps> = ({ ctl }) => {
  const { handleSaveLog, logAction, logBatch, logGrams,
    logMaterialId, logModalOpen, logNote, logPrice,
    logSupplier, materials, savingLog, setLogAction,
    setLogBatch, setLogGrams, setLogMaterialId, setLogModalOpen,
    setLogNote, setLogPrice, setLogSupplier, user } = ctl;

  return (
<Modal
        open={logModalOpen}
        onClose={() => setLogModalOpen(false)}
        title="Phiếu nhập / xuất kho"
        description="Phiếu kho chỉ ghi cho vật liệu của xưởng bạn."
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={() => setLogModalOpen(false)}>
              Huỷ
            </Button>
            <Button variant="primary" type="submit" form="w1b-log-form" loading={savingLog} loadingLabel="Đang ghi…">
              Ghi phiếu kho
            </Button>
          </div>
        }
      >
        <form id="w1b-log-form" onSubmit={handleSaveLog} className="flex flex-col gap-4">
          <Field label="Vật liệu" required>
            {(control) => (
              <Select
                {...control}
                value={logMaterialId}
                onChange={(e) => setLogMaterialId(e.target.value)}
                options={materials.map((m) => ({
                  value: m.id,
                  label: `${m.name}${m.currentStockGrams != null ? ` — tồn ${formatNumber(m.currentStockGrams)} g` : ' — chưa ghi nhận tồn'}`,
                }))}
              />
            )}
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Loại phiếu" required>
              {(control) => (
                <Select
                  {...control}
                  value={logAction}
                  onChange={(e) => setLogAction(e.target.value as 'Import' | 'Export' | 'Adjustment')}
                  options={[
                    { value: 'Import', label: 'Nhập kho' },
                    { value: 'Export', label: 'Xuất in' },
                    { value: 'Adjustment', label: 'Điều chỉnh (đặt tồn theo số đếm thực tế)' },
                  ]}
                />
              )}
            </Field>

            <Field
              label="Khối lượng (gram)"
              required
              hint={logAction === 'Adjustment' ? 'Với phiếu điều chỉnh, số này là TỒN THỰC TẾ sau kiểm kê.' : undefined}
            >
              {(control) => (
                <Input
                  {...control}
                  numeric
                  value={logGrams}
                  onChange={(e) => setLogGrams(e.target.value.replace(/[^\d]/g, ''))}
                />
              )}
            </Field>

            <Field label="Đơn giá nhập (VND/kg)" hint="Để trống = không cập nhật giá vật liệu.">
              {(control) => (
                <Input
                  {...control}
                  numeric
                  value={logPrice}
                  onChange={(e) => setLogPrice(e.target.value.replace(/[^\d]/g, ''))}
                  placeholder="—"
                />
              )}
            </Field>

            <Field label="Mã lô">
              {(control) => <Input {...control} value={logBatch} onChange={(e) => setLogBatch(e.target.value)} />}
            </Field>
          </div>

          <Field label="Nhà cung cấp">
            {(control) => <Input {...control} value={logSupplier} onChange={(e) => setLogSupplier(e.target.value)} />}
          </Field>

          <Field label="Ghi chú">
            {(control) => <Input {...control} value={logNote} onChange={(e) => setLogNote(e.target.value)} />}
          </Field>

          <p className="text-xs text-fg-subtle">
            Người ghi phiếu sẽ là <strong>{user?.email || 'chưa xác định'}</strong> (danh tính phiên đăng nhập).
          </p>
        </form>
      </Modal>
  );
};

export default InventoryLogModal;
