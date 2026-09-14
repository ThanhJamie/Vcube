import React, { useState } from 'react';
import { PayoutTransaction } from '../../../types';
import { PAYOUT_TRANSACTIONS } from '../../../data/mockData';
import { Icon } from '@frontend/ui';

export interface DesignerPayoutsTabProps {
  currentDesignerName: string;
  onShowToast: (message: string) => void;
  availableBalance?: number;
}

export const DesignerPayoutsTab: React.FC<DesignerPayoutsTabProps> = ({
  currentDesignerName,
  onShowToast,
  availableBalance = 48500000,
}) => {
  const [payouts, setPayouts] = useState<PayoutTransaction[]>(PAYOUT_TRANSACTIONS);
  const [balance, setBalance] = useState<number>(availableBalance);
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [payoutAmountInput, setPayoutAmountInput] = useState('10000000');

  const handleRequestPayout = () => {
    const amount = Number(payoutAmountInput) || 10000000;
    if (amount > balance) {
      onShowToast('Số dư khả dụng không đủ');
      return;
    }

    const newTx: PayoutTransaction = {
      id: `TRX-${Math.floor(10000 + Math.random() * 90000)}-Z`,
      date: new Date().toLocaleDateString('vi-VN'),
      reference: `VCUBE-WITHDRAW-${Date.now().toString().slice(-5)}`,
      method: 'Vietcombank (*1234)',
      amount,
      status: 'COMPLETED',
    };

    setPayouts([newTx, ...payouts]);
    setBalance((prev) => prev - amount);
    setIsPayoutModalOpen(false);
    onShowToast(
      `Đã chuyển ${amount.toLocaleString('vi-VN')} đ về tài khoản Vietcombank thành công!`
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Available Balance Hero Card */}
        <div className="md:col-span-5 bg-surface-inverse text-on-inverse p-6 rounded-sm flex flex-col justify-between space-y-4 shadow-e2">
          <div>
            <span className="text-xs font-tech uppercase tracking-widest text-accent">
              SỐ DƯ KHẢ DỤNG
            </span>
            <div className="text-3xl font-bold font-tech mt-1 text-on-inverse">
              {balance.toLocaleString('vi-VN')} đ
            </div>
            <p className="text-xs text-fg-subtle mt-1">
              Doanh thu tích lũy từ lượt tải file STL và hoa hồng in 3D vật lý.
            </p>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => setIsPayoutModalOpen(true)}
              className="w-full py-3 bg-primary hover:bg-primary-hover text-primary-fg font-bold text-xs uppercase tracking-wider rounded-full transition-colors touch-target-btn shadow-e2"
            >
              Yêu Cầu Rút Tiền Về Ngân Hàng
            </button>
            <p className="text-xs font-tech text-fg-subtle text-center">
              Tự động quyết toán ngày 15 hàng tháng
            </p>
          </div>
        </div>

        {/* Linked Accounts */}
        <div className="md:col-span-7 bg-surface p-5 rounded-sm space-y-4 shadow-e1">
          <h3 className="font-bold text-xs uppercase tracking-wider text-fg border-b border-line pb-2">
            Tài Khoản Nhận Thanh Toán
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 border-2 border-primary bg-primary/10 rounded-sm flex items-center gap-3">
              <Icon name="account_balance" size={28} className="text-primary" />
              <div>
                <p className="font-bold text-xs text-fg">Vietcombank</p>
                <p className="text-xs font-tech text-fg-muted">**** **** 1234 (Mặc định)</p>
              </div>
            </div>

            <div className="p-3 bg-surface rounded-sm flex items-center gap-3">
              <Icon name="account_balance_wallet" size={28} className="text-warning-strong" />
              <div>
                <p className="font-bold text-xs text-fg">Ví MoMo Business</p>
                <p className="text-xs font-tech text-fg-muted">0987 654 321</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payout History */}
      <div className="bg-surface border border-line rounded-sm overflow-hidden shadow-e1">
        <div className="p-4 border-b border-line flex items-center justify-between">
          <h3 className="font-bold text-xs uppercase tracking-wider text-fg">
            Lịch Sử Rút Tiền &amp; Quyết Toán
          </h3>
          <span className="font-tech text-xs text-fg-muted">Sao kê tự động 90 ngày</span>
        </div>
        <div className="responsive-table-wrapper">
          <table className="text-left text-xs w-full">
            <thead className="bg-primary/10 border-b border-line text-fg-muted font-tech text-xs uppercase">
              <tr>
                <th className="p-3">Ngày</th>
                <th className="p-3">Mã Giao Dịch</th>
                <th className="p-3">Phương Thức</th>
                <th className="p-3 text-right">Số Tiền</th>
                <th className="p-3 text-center">Trạng Thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-subtle">
              {payouts.map((p) => (
                <tr key={p.id} className="hover:bg-canvas">
                  <td className="p-3 font-tech text-fg">{p.date}</td>
                  <td className="p-3 font-tech text-fg-muted">{p.reference}</td>
                  <td className="p-3 text-fg">{p.method}</td>
                  <td className="p-3 font-tech font-bold text-right text-fg">
                    {p.amount.toLocaleString('vi-VN')} đ
                  </td>
                  <td className="p-3 text-center">
                    <span className="px-2 py-0.5 bg-positive/10 text-positive font-tech text-xs rounded-sm font-bold">
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: PAYOUT REQUEST */}
      {isPayoutModalOpen && (
        <div className="fixed inset-0 bg-surface-inverse/70 z-modal flex items-center justify-center p-4">
          <div className="bg-surface rounded-sm max-w-md w-full p-6 space-y-4 text-fg shadow-e3">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="font-bold text-sm text-fg uppercase">
                Yêu Cầu Rút Tiền Về Ngân Hàng
              </h3>
              <button
                onClick={() => setIsPayoutModalOpen(false)}
                className="text-fg-subtle hover:text-fg"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="text-xs uppercase font-bold text-fg-muted block mb-1">
                Số tiền muốn rút (VNĐ):
              </label>
              <input
                type="number"
                value={payoutAmountInput}
                onChange={(e) => setPayoutAmountInput(e.target.value)}
                className="w-full bg-canvas border border-line-control p-2.5 text-sm font-tech font-bold rounded-sm focus:outline-none focus:border-primary"
              />
              <p className="text-xs text-fg-muted font-tech mt-1">
                Số dư hiện có: {balance.toLocaleString('vi-VN')} đ
              </p>
            </div>

            <div className="p-3 bg-primary/10 border border-line rounded-sm text-xs">
              <span className="font-bold block text-primary">Tài khoản thụ hưởng:</span>
              <p className="font-tech text-xs mt-0.5">
                VIETCOMBANK • {currentDesignerName.toUpperCase()} (****1234)
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsPayoutModalOpen(false)}
                className="px-4 py-2 border border-line-control text-xs font-bold rounded-full uppercase"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleRequestPayout}
                className="px-5 py-2 bg-primary hover:bg-primary-hover text-primary-fg text-xs font-bold rounded-full uppercase transition-colors"
              >
                Xác Nhận Rút
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
