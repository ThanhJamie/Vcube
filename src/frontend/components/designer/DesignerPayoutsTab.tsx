import React, { useMemo } from 'react';
import { PayoutTransaction } from '../../../types';
import { PAYOUT_TRANSACTIONS } from '../../../data/mockData';
import { Icon, EmptyState, DataTable } from '@frontend/ui';
import type { DataTableColumn } from '@frontend/ui';

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
      { key: 'reference', header: 'Mã Giao Dịch', value: (p) => p.reference, render: (p) => <span className="text-fg-muted">{p.reference}</span> },
      { key: 'method', header: 'Phương Thức', value: (p) => p.method, render: (p) => <span className="text-fg">{p.method}</span> },
      { key: 'amount', header: 'Số Tiền', numeric: true, value: (p) => p.amount, render: (p) => <span className="font-bold text-fg">{p.amount.toLocaleString('vi-VN')} đ</span> },
      {
        key: 'status',
        header: 'Trạng Thái',
        align: 'center',
        value: (p) => p.status,
        render: (p) => <span className="px-2 py-0.5 bg-positive/10 text-positive font-tech text-xs rounded-sm font-bold">{p.status}</span>,
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Available Balance */}
        <div className="md:col-span-5 bg-surface-inverse text-on-inverse p-6 rounded-sm flex flex-col justify-between space-y-4 shadow-e2">
          <div>
            <span className="text-xs font-tech uppercase tracking-widest text-accent">
              SỐ DƯ KHẢ DỤNG
            </span>
            <div className="text-3xl font-bold font-tech mt-1 text-on-inverse">
              {hasBalance ? `${availableBalance.toLocaleString('vi-VN')} đ` : '—'}
            </div>
            <p className="text-xs text-fg-subtle mt-1">
              {hasBalance
                ? 'Số dư đã được hệ thống ghi nhận cho tài khoản của bạn.'
                : 'Chưa có nguồn số dư khả dụng cho tài khoản này.'}
            </p>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              disabled
              onClick={() => onShowToast('Chức năng rút tiền chưa được nối tới hệ thống thanh toán.')}
              className="w-full py-3 bg-primary/40 text-primary-fg/70 font-bold text-xs uppercase tracking-wider rounded-full cursor-not-allowed"
              title="Chưa có hệ thống quyết toán được nối"
            >
              Yêu Cầu Rút Tiền Về Ngân Hàng
            </button>
            <p className="text-xs font-tech text-fg-subtle text-center">
              Chức năng quyết toán chưa được kích hoạt.
            </p>
          </div>
        </div>

        {/* Linked Accounts */}
        <div className="md:col-span-7 bg-surface p-5 rounded-sm space-y-4 shadow-e1">
          <h3 className="font-bold text-xs uppercase tracking-wider text-fg border-b border-line pb-2">
            Tài Khoản Nhận Thanh Toán
          </h3>
          <EmptyState
            bordered
            icon={<Icon name="account_balance" size={20} />}
            title="Chưa liên kết tài khoản nhận thanh toán"
            description="Tài khoản ngân hàng/ví sẽ hiển thị ở đây sau khi hệ thống quyết toán được kích hoạt và bạn khai báo."
          />
        </div>
      </div>

      {/* Payout History */}
      <div className="bg-surface border border-line rounded-sm overflow-hidden shadow-e1">
        <div className="p-4 border-b border-line flex items-center justify-between">
          <h3 className="font-bold text-xs uppercase tracking-wider text-fg">
            Lịch Sử Rút Tiền &amp; Quyết Toán
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
