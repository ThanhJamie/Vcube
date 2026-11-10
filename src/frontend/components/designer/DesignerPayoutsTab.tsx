import React, { useEffect, useMemo, useState } from 'react';
import { PayoutTransaction } from '../../../types';
import { PAYOUT_TRANSACTIONS } from '../../../data/mockData';
import { Badge, Button, EmptyState, Field, Icon, Input, DataTable } from '@frontend/ui';
import type { DataTableColumn } from '@frontend/ui';
import { formatCurrency } from '@frontend/lib/format';
import {
  useDesignerAdminStore,
  type DesignerPayoutInfo,
} from '@frontend/stores/useDesignerAdminStore';

/** Nhãn VI cho enum trạng thái quyết toán — enum chỉ sống trong code/DB. */
const PAYOUT_STATUS_LABELS: Record<string, string> = {
  COMPLETED: 'Hoàn tất',
  PENDING: 'Đang xử lý',
  FAILED: 'Thất bại',
};

type PayoutForm = { bankName: string; bankAccount: string; taxId: string };

const EMPTY_INFO: PayoutForm = { bankName: '', bankAccount: '', taxId: '' };

/** RPC trả cột null khi designer chưa nhập; form luôn dùng chuỗi. */
function toForm(info: DesignerPayoutInfo | null): PayoutForm {
  return {
    bankName: info?.bankName ?? '',
    bankAccount: info?.bankAccount ?? '',
    taxId: info?.taxId ?? '',
  };
}

/** Đã khai báo thông tin hay chưa — RPC trả cột null/'' khi designer chưa nhập. */
function hasPayoutInfo(info: DesignerPayoutInfo | null): boolean {
  return Boolean(
    info &&
      ((info.bankName ?? '').trim() ||
        (info.bankAccount ?? '').trim() ||
        (info.taxId ?? '').trim()),
  );
}

/**
 * Mask số tài khoản ngân hàng: chỉ giữ 4 ký tự cuối (PII không hiển thị đầy đủ).
 * Không log giá trị gốc ra console ở bất kỳ đâu.
 */
function maskBankAccount(account: string): string {
  const compact = account.replace(/\s+/g, '');
  if (!compact) return '—';
  return `•••• ${compact.slice(-4)}`;
}

export interface DesignerPayoutsTabProps {
  currentDesignerName: string;
  onShowToast: (message: string) => void;
  availableBalance?: number;
}

/**
 * Ví & quyết toán của tác giả.
 *
 * LUẬT TRUNG THỰC DỮ LIỆU
 * ----------------------
 * Bản cũ bịa toàn bộ: số dư mặc định 48.500.000đ, tài khoản Vietcombank/MoMo "của bạn", nút rút
 * tiền tạo giao dịch COMPLETED ngay trên RAM và báo "đã chuyển … thành công", cùng các cam kết
 * "tự động quyết toán ngày 15" / "sao kê 90 ngày" không có hệ thống nào đứng sau. Không có bảng/
 * service payout trong DB ⇒ tab này chỉ được hiển thị dữ liệu THẬT hoặc trạng thái trống.
 *
 * A2: thông tin nhận tiền nay đọc/ghi THẬT qua bảng `designer_payout_info`
 * (`get_my_payout_info` / `upsert_my_payout_info`). Hệ thống CHƯA có quyết toán tự động nên
 * phần số dư/lịch sử vẫn giữ trạng thái trung thực, không suy ra từ thông tin ngân hàng.
 */
export const DesignerPayoutsTab: React.FC<DesignerPayoutsTabProps> = ({
  onShowToast,
  availableBalance,
}) => {
  const payouts: PayoutTransaction[] = PAYOUT_TRANSACTIONS;
  const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
  const hasBalance = isNum(availableBalance);

  const payoutInfo = useDesignerAdminStore((s) => s.myPayoutInfo);
  const isLoadingInfo = useDesignerAdminStore((s) => s.myPayoutLoading);
  const loadError = useDesignerAdminStore((s) => s.myPayoutError);
  const loadMyPayoutInfo = useDesignerAdminStore((s) => s.loadMyPayoutInfo);
  const saveMyPayoutInfo = useDesignerAdminStore((s) => s.saveMyPayoutInfo);

  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<PayoutForm>(EMPTY_INFO);
  const [fieldErrors, setFieldErrors] = useState<{ bankName?: string; bankAccount?: string }>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    void loadMyPayoutInfo();
  }, [loadMyPayoutInfo]);

  useEffect(() => {
    if (isLoadingInfo || loadError) return;
    const next = toForm(payoutInfo);
    setForm(next);
    // Có dữ liệu ⇒ hiện bản tóm tắt đã mask; chưa có ⇒ mở form để khai báo.
    setIsEditing(!hasPayoutInfo(payoutInfo));
  }, [payoutInfo, isLoadingInfo, loadError]);

  const startEditing = () => {
    setForm(toForm(payoutInfo));
    setFieldErrors({});
    setSaveError(null);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setForm(toForm(payoutInfo));
    setFieldErrors({});
    setSaveError(null);
    setIsEditing(false);
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving) return;

    const next: PayoutForm = {
      bankName: form.bankName.trim(),
      bankAccount: form.bankAccount.trim(),
      taxId: form.taxId.trim(),
    };
    const errors = {
      bankName: next.bankName ? undefined : 'Vui lòng nhập tên ngân hàng.',
      bankAccount: next.bankAccount ? undefined : 'Vui lòng nhập số tài khoản.',
    };
    setFieldErrors(errors);
    setSaveError(null);
    if (errors.bankName || errors.bankAccount) return;

    setIsSaving(true);
    try {
      const res = await saveMyPayoutInfo(next);
      if (!res.success) {
        setSaveError(res.error);
        onShowToast(res.error);
        return;
      }
      setForm(next);
      setIsEditing(false);
      onShowToast('Đã lưu thông tin nhận tiền.');
    } catch (err) {
      const message =
        err instanceof Error && err.message ? err.message : 'Không lưu được thông tin nhận tiền.';
      setSaveError(message);
      onShowToast(message);
    } finally {
      setIsSaving(false);
    }
  };

  const payoutColumns = useMemo<DataTableColumn<PayoutTransaction>[]>(
    () => [
      { key: 'date', header: 'Ngày', value: (p) => p.date, render: (p) => <span className="text-fg">{p.date}</span> },
      { key: 'reference', header: 'Mã giao dịch', value: (p) => p.reference, render: (p) => <span className="text-fg-muted">{p.reference}</span> },
      { key: 'method', header: 'Phương thức', value: (p) => p.method, render: (p) => <span className="text-fg">{p.method}</span> },
      { key: 'amount', header: 'Số tiền', numeric: true, value: (p) => p.amount, render: (p) => <span className="font-bold text-fg">{formatCurrency(p.amount)}</span> },
      {
        key: 'status',
        header: 'Trạng thái',
        align: 'center',
        value: (p) => p.status,
        render: (p) => (
          <Badge variant={p.status === 'COMPLETED' ? 'success' : p.status === 'PENDING' ? 'warning' : 'danger'} dot>
            {PAYOUT_STATUS_LABELS[p.status] ?? p.status}
          </Badge>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
        {/* Available Balance */}
        <div className="flex flex-col justify-between gap-6 rounded-lg border border-line bg-surface p-6 md:col-span-5">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
              SỐ DƯ KHẢ DỤNG
            </p>
            <div className="font-mono text-2xl font-bold tabular-nums text-fg">
              {hasBalance ? formatCurrency(availableBalance) : '—'}
            </div>
            <p className="text-sm text-fg-muted">
              {hasBalance
                ? 'Số dư đã được hệ thống ghi nhận cho tài khoản của bạn.'
                : 'Chưa có nguồn số dư khả dụng cho tài khoản này.'}
            </p>
          </div>

          <div className="space-y-2">
            <Button
              type="button"
              variant="primary"
              fullWidth
              disabled
              onClick={() => onShowToast('Chức năng rút tiền chưa được nối tới hệ thống thanh toán.')}
              title="Chưa có hệ thống quyết toán được nối"
            >
              Yêu cầu rút tiền về ngân hàng
            </Button>
            <p className="text-center text-xs text-fg-subtle">
              Chức năng quyết toán chưa được kích hoạt.
            </p>
          </div>
        </div>

        {/* Linked Accounts — A2: form thật trên `designer_payout_info` qua RPC */}
        <div className="space-y-4 rounded-lg border border-line bg-surface p-6 md:col-span-7">
          <div className="space-y-1">
            <h3 className="text-base font-semibold tracking-tight text-fg">
              Tài khoản nhận thanh toán
            </h3>
            <p className="text-sm text-fg-muted">
              Thông tin được lưu để đối soát chi trả. VCUBE chưa có hệ thống quyết toán tự động.
            </p>
          </div>

          {isLoadingInfo ? (
            <p role="status" className="text-sm text-fg-muted">
              Đang tải thông tin nhận tiền…
            </p>
          ) : loadError ? (
            <div
              role="alert"
              className="space-y-3 rounded-md border border-danger/20 bg-danger-tint p-3 text-sm text-danger"
            >
              <p>{loadError}</p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                leadingIcon={<Icon name="refresh" size={16} />}
                onClick={() => void loadMyPayoutInfo()}
              >
                Thử lại
              </Button>
            </div>
          ) : hasPayoutInfo(payoutInfo) && !isEditing ? (
            <div className="space-y-4">
              <dl className="grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
                    Ngân hàng
                  </dt>
                  <dd className="mt-1 text-sm font-medium text-fg">{payoutInfo?.bankName || '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
                    Số tài khoản
                  </dt>
                  <dd className="mt-1 font-mono text-sm font-medium tabular-nums text-fg">
                    {maskBankAccount(payoutInfo?.bankAccount ?? '')}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
                    Mã số thuế
                  </dt>
                  <dd className="mt-1 text-sm font-medium text-fg">{payoutInfo?.taxId || '—'}</dd>
                </div>
              </dl>
              <Button type="button" variant="secondary" onClick={startEditing}>
                Cập nhật
              </Button>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSave} noValidate>
              <Field label="Ngân hàng" required error={fieldErrors.bankName}>
                {(control) => (
                  <Input
                    {...control}
                    value={form.bankName}
                    autoComplete="off"
                    placeholder="Tên ngân hàng theo tài khoản nhận tiền"
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, bankName: event.target.value }))
                    }
                  />
                )}
              </Field>

              <Field label="Số tài khoản" required error={fieldErrors.bankAccount}>
                {(control) => (
                  <Input
                    {...control}
                    value={form.bankAccount}
                    inputMode="numeric"
                    autoComplete="off"
                    className="font-mono tabular-nums"
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, bankAccount: event.target.value }))
                    }
                  />
                )}
              </Field>

              <Field label="Mã số thuế" hint="Dùng khi cần xuất hoá đơn cho khoản chi trả.">
                {(control) => (
                  <Input
                    {...control}
                    value={form.taxId}
                    autoComplete="off"
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, taxId: event.target.value }))
                    }
                  />
                )}
              </Field>

              {saveError ? (
                <p role="alert" className="text-sm font-medium text-danger">
                  {saveError}
                </p>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Button type="submit" variant="primary" loading={isSaving} loadingLabel="Đang lưu…">
                  Lưu thông tin nhận tiền
                </Button>
                {hasPayoutInfo(payoutInfo) ? (
                  <Button type="button" variant="secondary" disabled={isSaving} onClick={cancelEditing}>
                    Huỷ
                  </Button>
                ) : null}
              </div>
            </form>
          )}
        </div>
      </div>

      {/* UI-022 (data honesty): bảng quyết toán CHƯA nối DB và fixture rỗng ⇒ không được
          nói "Dữ liệu mẫu" (người dùng sẽ tưởng có giao dịch mẫu để xem). */}
      <div className="rounded-md border border-warning/20 bg-warning-tint p-3 text-sm text-warning">
        Chưa nối bảng quyết toán — chưa có giao dịch.
      </div>

      {/* Payout History */}
      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        <div className="flex items-center justify-between border-b border-line-subtle p-4">
          <h3 className="text-base font-semibold tracking-tight text-fg">
            Lịch sử rút tiền &amp; quyết toán
          </h3>
        </div>
        {payouts.length === 0 ? (
          <div className="p-6">
            <EmptyState
              bordered
              icon={<Icon name="receipt_long" size={20} />}
              title="Chưa có nguồn dữ liệu quyết toán"
              description="Hệ thống chưa có nguồn dữ liệu kỳ quyết toán nào được nối, nên chưa thể hiển thị lịch sử rút tiền và trạng thái xử lý."
            />
          </div>
        ) : (
          <DataTable<PayoutTransaction>
            columns={payoutColumns}
            rows={payouts}
            getRowId={(row) => row.id}
            caption="Lịch sử quyết toán"
            tableLabel="Lịch sử quyết toán"
            defaultSort={[{ key: 'date', direction: 'desc' }]}
          />
        )}
      </div>
    </div>
  );
};
