import React from 'react';
import { Order } from '../types';

interface InvoiceModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ order, isOpen, onClose }) => {
  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  const subtotal = order.payment.subtotalPhysical || order.payment.total;
  const vatAmount = Math.round(subtotal * 0.08);
  const grandTotal = subtotal + vatAmount;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-[#CBD5E1] overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Top Control Bar */}
        <div className="px-5 py-4 bg-[#091426] text-white flex items-center justify-between font-sans shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#00687A] flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-base">receipt_long</span>
            </div>
            <div>
              <h3 className="font-bold text-xs uppercase tracking-wider">
                HÓA ĐƠN GTGT & CHỨNG NHẬN GIA CÔNG KỸ THUẬT
              </h3>
              <p className="text-[10px] text-[#94A3B8] font-mono">
                Số HĐ: HD-VCUBE-{order.orderNumber.replace('#', '')} • e-Invoice Validated
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-[#00687A] hover:bg-[#005260] text-white text-[11px] font-mono uppercase tracking-wider font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <span className="material-symbols-outlined text-sm">print</span>
              <span>In Hóa Đơn</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/10 text-white/70 hover:text-white rounded-lg transition-colors cursor-pointer"
              aria-label="Đóng hóa đơn"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>
        </div>

        {/* Printable Invoice Body */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-xs text-[#091426] font-sans bg-[#F8FAFC]">
          {/* Company & Order Info Header */}
          <div className="flex flex-col sm:flex-row justify-between border-b border-[#CBD5E1] pb-5 gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-black text-xl text-[#091426] tracking-tighter">VCUBE</span>
                <span className="text-xs font-mono font-bold text-[#00687A] bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                  VIETNAM PRECISION FABRICATION
                </span>
              </div>
              <p className="text-[#545F73] mt-1 text-xs">
                CÔNG TY CỔ PHẦN CÔNG NGHỆ CHẾ TÁC 3D VCUBE VIỆT NAM
              </p>
              <p className="text-[#64748B] text-[11px] font-mono mt-0.5">
                Mã Số Thuế: <strong className="text-[#091426]">0108924881</strong> • Hotline Kỹ Thuật: 1900 6833
              </p>
              <p className="text-[#64748B] text-[11px]">
                Xưởng Chế Tác: Lô E2a-7, Đường D1, Khu CNC Hòa Lạc, Hà Nội
              </p>
            </div>

            <div className="text-left sm:text-right space-y-1 font-mono">
              <p className="font-bold text-sm text-[#091426]">MÃ ĐƠN: {order.orderNumber}</p>
              <p className="text-xs text-[#64748B]">Ngày phát hành: {order.date}</p>
              <span className="inline-block px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-[10px] font-bold uppercase">
                ✓ ĐÃ THANH TOÁN ({order.payment.method})
              </span>
            </div>
          </div>

          {/* Customer info card */}
          <div className="bg-white p-4 rounded-xl border border-[#CBD5E1] space-y-1 shadow-2xs">
            <p className="font-mono font-bold text-[10px] uppercase tracking-widest text-[#00687A]">
              THÔNG TIN ĐƠN VỊ / KHÁCH HÀNG:
            </p>
            <p className="font-bold text-sm text-[#091426]">
              {order.shippingAddress.fullName}
              <span className="text-[#64748B] font-mono font-normal ml-2">({order.shippingAddress.phone})</span>
            </p>
            <p className="text-[#545F73] text-xs">
              Địa chỉ nhận: {order.shippingAddress.address}, {order.shippingAddress.district}, {order.shippingAddress.city}
            </p>
          </div>

          {/* Items Table */}
          <div className="bg-white rounded-xl border border-[#CBD5E1] overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-[#CBD5E1] text-[10px] font-mono font-bold uppercase tracking-wider text-[#64748B]">
                <tr>
                  <th className="p-3">STT</th>
                  <th className="p-3">Chi Tiết / Mã Bản Vẽ</th>
                  <th className="p-3">Vật Liệu & Dung Sai</th>
                  <th className="p-3 text-center">SL</th>
                  <th className="p-3 text-right">Đơn Giá</th>
                  <th className="p-3 text-right">Thành Tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {order.items.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="p-3 text-[#64748B] font-mono">{idx + 1}</td>
                    <td className="p-3 font-bold text-[#091426]">
                      {item.name}
                      {item.customText && (
                        <span className="block text-[10px] text-[#00687A] font-mono font-normal">
                          Khắc Laser: "{item.customText}"
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-[#545F73] font-mono text-[11px]">
                      {item.material || 'PLA Tough Kỹ Thuật'} (±0.05mm)
                    </td>
                    <td className="p-3 text-center font-mono font-bold">{item.quantity}</td>
                    <td className="p-3 text-right font-mono">{item.price.toLocaleString('vi-VN')} ₫</td>
                    <td className="p-3 text-right font-mono font-bold text-[#091426]">
                      {(item.price * item.quantity).toLocaleString('vi-VN')} ₫
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Payment breakdown & Digital Signature Stamp */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
            {/* Left: Digital Verification Box */}
            <div className="bg-white p-4 rounded-xl border border-[#CBD5E1] space-y-2 text-[11px] shadow-2xs">
              <div className="flex items-center gap-2 text-[#00687A] font-mono font-bold">
                <span className="material-symbols-outlined text-base">verified</span>
                <span>CHỮ KÝ SỐ DOANH NGHIỆP (SHA-256)</span>
              </div>
              <p className="text-[#64748B] font-mono text-[10px] break-all bg-slate-50 p-2 rounded border border-slate-200">
                SHA256: 8f4b29a613d07e59c2a10bfcae04d78b27341e938924b1050a4980a312fe8924
              </p>
              <p className="text-[#64748B] text-[10px]">
                Ký bởi: VCUBE CA CA-04 • Thời gian ký: {order.date} • Đạt chuẩn tra cứu thuế e-Invoice TCT.
              </p>
            </div>

            {/* Right: Amounts Calculation */}
            <div className="bg-white p-4 rounded-xl border border-[#CBD5E1] space-y-2 font-mono text-xs shadow-2xs">
              <div className="flex justify-between text-[#64748B]">
                <span>Tạm tính linh kiện:</span>
                <span>{subtotal.toLocaleString('vi-VN')} ₫</span>
              </div>
              <div className="flex justify-between text-[#64748B]">
                <span>Thuế GTGT (VAT 8%):</span>
                <span>{vatAmount.toLocaleString('vi-VN')} ₫</span>
              </div>
              <div className="flex justify-between text-[#64748B]">
                <span>Phí đóng gói & Kiểm định QC:</span>
                <span className="text-emerald-700 font-bold">MIỄN PHÍ</span>
              </div>
              <div className="flex justify-between text-[#64748B]">
                <span>Phí vận chuyển bọc chống sốc:</span>
                <span>0 ₫</span>
              </div>
              <div className="border-t border-[#CBD5E1] pt-2 flex justify-between font-bold text-sm text-[#091426]">
                <span>TỔNG CỘNG THANH TOÁN:</span>
                <span className="text-[#00687A] text-base">{grandTotal.toLocaleString('vi-VN')} ₫</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
