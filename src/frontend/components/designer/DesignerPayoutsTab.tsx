import React, { useMemo } from 'react';
import { PayoutTransaction } from '../../../types';
import { PAYOUT_TRANSACTIONS } from '../../../data/mockData';
import { Badge, Button, EmptyState, Icon, DataTable } from '@frontend/ui';
import type { DataTableColumn } from '@frontend/ui';
import { formatCurrency } from '@frontend/lib/format';

/** Nhãn VI cho enum trạng thái quyết toán — enum chỉ sống trong code/DB. */
const PAYOUT_STATUS_LABELS: Record<string, string> = {
  COMPLETED: 'Hoàn tất',
  PENDING: 'Đang xử lý',
  FAILED: 'Thất bại',
};

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
 */
export const DesignerPayoutsTab: React.FC<DesignerPayoutsTabProps> = ({
  onShowToast,
  availableBalance,
}) => {
  const payouts: PayoutTransaction[] = PAYOUT_TRANSACTIONS;
  const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
  const hasBalance = isNum(availableBalance);

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

        {/* Linked Accounts */}
        <div className="space-y-4 rounded-lg border border-line bg-surface p-6 md:col-span-7">
          <h3 className="text-base font-semibold tracking-tight text-fg">
            Tài khoản nhận thanh toán
          </h3>
          <EmptyState
            bordered
            icon={<Icon name="account_balance" size={20} />}
            title="Chưa liên kết tài khoản nhận thanh toán"
            description="Tài khoản ngân hàng/ví sẽ hiển thị ở đây sau khi hệ thống quyết toán được kích hoạt và bạn khai báo."
          />
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
              title="Chưa có giao dịch quyết toán"
              description="Khi hệ thống quyết toán được nối, các lệnh rút tiền và trạng thái xử lý sẽ hiển thị tại đây."
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
