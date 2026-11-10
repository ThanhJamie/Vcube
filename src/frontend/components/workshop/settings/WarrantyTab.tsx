// WarrantyTab — xưởng nhận & xử lý yêu cầu bảo hành thuộc đơn được giao cho mình.
// Nguồn sự thật: `warranty_claims` + `orders.assigned_workshop_id = partnerId`.
// Không seed, không claim giả; chưa có dữ liệu ⇒ EmptyState đúng nguyên nhân.
import { useMemo, useState } from 'react';
import {
  Badge,
  Button,
  DataTable,
  EmptyState,
  Field,
  Icon,
  Modal,
  Select,
  type BadgeVariant,
  type DataTableColumn,
} from '@frontend/ui';
import { EMPTY_VALUE, formatDateTime } from '@frontend/lib/format';
import {
  useWarrantyClaimUpdate,
  useWorkshopWarrantyClaims,
  type WarrantyClaim,
  type WarrantyClaimStatus,
} from '@frontend/hooks/useOrdersData';
import type { WorkshopSettingsController } from './types';

/** Trạng thái xưởng được phép đặt từ modal xử lý (không đặt lại `submitted`). */
type EditableWarrantyStatus = Exclude<WarrantyClaimStatus, 'submitted'>;

const EDITABLE_STATUS_OPTIONS: Array<{ value: EditableWarrantyStatus; label: string }> = [
  { value: 'reviewing', label: 'Đang xem xét' },
  { value: 'approved', label: 'Chấp thuận bảo hành' },
  { value: 'rejected', label: 'Từ chối bảo hành' },
  { value: 'resolved', label: 'Đã xử lý xong' },
];

const STATUS_META: Record<WarrantyClaimStatus, { label: string; variant: BadgeVariant }> = {
  submitted: { label: 'Chờ tiếp nhận', variant: 'warning' },
  reviewing: { label: 'Đang xem xét', variant: 'info' },
  approved: { label: 'Chấp thuận', variant: 'success' },
  rejected: { label: 'Từ chối', variant: 'danger' },
  resolved: { label: 'Đã xử lý', variant: 'success' },
};

function toEditableStatus(status: WarrantyClaimStatus): EditableWarrantyStatus {
  return status === 'submitted' ? 'reviewing' : status;
}

export interface WarrantyTabProps {
  ctl: WorkshopSettingsController;
}

export const WarrantyTab: React.FC<WarrantyTabProps> = ({ ctl }) => {
  const partnerId = ctl.partnerId;
  const { claims, loading, error, reload } = useWorkshopWarrantyClaims(partnerId);
  const { saving, save } = useWarrantyClaimUpdate();

  const [editing, setEditing] = useState<WarrantyClaim | null>(null);
  const [draftStatus, setDraftStatus] = useState<EditableWarrantyStatus>('reviewing');
  const [draftResolution, setDraftResolution] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);

  const openHandler = (claim: WarrantyClaim) => {
    setEditing(claim);
    setDraftStatus(toEditableStatus(claim.status));
    setDraftResolution(claim.resolution);
    setSaveError(null);
  };

  const closeHandler = () => {
    if (saving) return;
    setEditing(null);
    setSaveError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;

    setSaveError(null);
    const res = await save({
      id: editing.id,
      status: draftStatus,
      resolution: draftResolution,
    });

    if (!res.success) {
      setSaveError(res.error);
      return;
    }

    setEditing(null);
    await reload();
  };

  const columns = useMemo<DataTableColumn<WarrantyClaim>[]>(
    () => [
      {
        key: 'orderNumber',
        header: 'Mã đơn',
        sortable: true,
        render: (row) => (
          <span className="font-mono text-xs tabular-nums text-fg">
            {row.orderNumber ?? EMPTY_VALUE}
          </span>
        ),
      },
      {
        key: 'reason',
        header: 'Lý do',
        render: (row) => <span className="text-xs text-fg">{row.reason || EMPTY_VALUE}</span>,
      },
      {
        key: 'status',
        header: 'Trạng thái',
        render: (row) => {
          const meta = STATUS_META[row.status];
          return <Badge variant={meta.variant}>{meta.label}</Badge>;
        },
      },
      {
        key: 'createdAt',
        header: 'Ngày gửi',
        sortable: true,
        render: (row) => (
          <span className="font-mono text-xs tabular-nums text-fg-subtle">
            {row.createdAt ? formatDateTime(row.createdAt) : EMPTY_VALUE}
          </span>
        ),
      },
      {
        key: 'actions',
        header: 'Thao tác',
        align: 'right',
        render: (row) => (
          <Button size="sm" variant="secondary" onClick={() => openHandler(row)}>
            Xử lý
          </Button>
        ),
      },
    ],
    [],
  );

  if (!partnerId) {
    return (
      <section className="space-y-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-fg">
            <Icon name="shield" className="size-5 text-primary" aria-hidden="true" />
            Bảo hành của xưởng bạn
          </h2>
        </div>
        <EmptyState
          icon={<Icon name="shield" size={20} />}
          title="Chưa xác định được xưởng của bạn"
          description="Tài khoản chưa gắn mã đối tác xưởng."
        />
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-fg">
          <Icon name="shield" className="size-5 text-primary" aria-hidden="true" />
          Bảo hành của xưởng bạn
        </h2>
        <p className="mt-0.5 text-xs text-fg-subtle">
          Chỉ hiển thị yêu cầu thuộc các đơn được giao cho xưởng bạn. Trạng thái do xưởng cập nhật và lưu
          vào cơ sở dữ liệu.
        </p>
      </div>

      <DataTable<WarrantyClaim>
        columns={columns}
        rows={claims}
        getRowId={(row) => row.id}
        caption="Yêu cầu bảo hành của xưởng"
        tableLabel="Yêu cầu bảo hành của xưởng"
        filterable
        filterPlaceholder="Tìm theo mã đơn, lý do…"
        filterFn={(row, query) => {
          const q = query.trim().toLowerCase();
          if (!q) return true;
          return (
            String(row.orderNumber ?? '').toLowerCase().includes(q) ||
            row.reason.toLowerCase().includes(q)
          );
        }}
        defaultSort={[{ key: 'createdAt', direction: 'desc' }]}
        pagination
        defaultPageSize={10}
        loading={loading}
        loadingLabel="Đang tải yêu cầu bảo hành…"
        error={error}
        errorTitle="Không tải được yêu cầu bảo hành"
        errorDescription={error ?? undefined}
        onRetry={() => void reload()}
        emptyState={
          <EmptyState
            live
            icon={<Icon name="shield" size={20} />}
            title="Chưa có yêu cầu bảo hành nào"
            description="Chưa có khách nào gửi yêu cầu bảo hành cho các đơn được giao cho xưởng bạn."
          />
        }
      />

      {/* Luôn mount Modal, chỉ đổi prop `open` — mount có điều kiện làm effect của
          `Modal` chạy mount→cleanup→mount dưới StrictMode; `dialog.close()` trong cleanup
          gọi `onClose` và đóng modal vừa mở (xem ChatSupportModal). */}
      <Modal
        open={Boolean(editing)}
        onClose={closeHandler}
        size="md"
        title="Xử lý yêu cầu bảo hành"
        description={editing ? `Đơn ${editing.orderNumber ?? editing.orderId}` : undefined}
      >
        {editing ? (
          <form onSubmit={handleSave} className="space-y-4 text-xs">
            <div className="space-y-1">
              <span className="block text-sm font-medium text-fg">Nội dung khách gửi:</span>
              <p className="whitespace-pre-line rounded-md border border-line-subtle bg-surface-muted p-3 font-mono text-xs text-fg">
                {editing.description || EMPTY_VALUE}
              </p>
            </div>

            <Field id="warranty-status" label="Trạng thái xử lý:">
              {(control) => (
                <Select
                  {...control}
                  value={draftStatus}
                  onChange={(e) => setDraftStatus(e.target.value as EditableWarrantyStatus)}
                >
                  {EDITABLE_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>

            <Field id="warranty-resolution" label="Kết quả xử lý:">
              {(control) => (
                <textarea
                  {...control}
                  rows={3}
                  value={draftResolution}
                  onChange={(e) => setDraftResolution(e.target.value)}
                  placeholder="Ghi rõ nguyên nhân, hướng xử lý và bước tiếp theo cho khách."
                  className="w-full rounded-md border border-line-control bg-surface p-3 text-sm text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              )}
            </Field>

            {saveError && (
              <div role="alert" className="flex items-start gap-2 rounded-md border border-danger/20 bg-danger-tint p-3 text-danger">
                <Icon name="error" size={18} className="mt-0.5 shrink-0" />
                <span>{saveError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2 font-mono">
              <Button type="button" variant="secondary" size="md" onClick={closeHandler} disabled={saving}>
                Đóng
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={saving}
                loadingLabel="Đang lưu…"
              >
                Lưu xử lý
              </Button>
            </div>
          </form>
        ) : null}
      </Modal>
    </section>
  );
};

export default WarrantyTab;
