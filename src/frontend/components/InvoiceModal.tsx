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

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white w-full max-w-2xl shadow-2xl border border-black/15 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-[#1C1C1C] text-white flex items-center justify-between font-sans">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-base">receipt</span>
            <h3 className="font-bold text-xs uppercase tracking-widest truncate">HÓA ĐƠN GTGT & BIÊN BẢN GIA CÔNG</h3>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-white text-[#1C1C1C] hover:bg-[#E0DDD5] text-[10px] uppercase tracking-widest font-bold flex items-center gap-1 transition-colors touch-target-btn"
            >
              <span className="material-symbols-outlined text-xs">print</span>
              <span className="hidden sm:inline">In Hóa Đơn</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/10 text-white/70 hover:text-white transition-colors touch-target-btn"
              aria-label="Đóng hóa đơn"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        </div>

        {/* Printable Invoice Body */}
        <div className="p-4 sm:p-8 overflow-y-auto space-y-6 text-xs text-[#1C1C1C] font-sans bg-[#FAF9F5]">
          {/* Company & Order Info */}
          <div className="flex flex-col sm:flex-row justify-between border-b border-black/10 pb-4 sm:pb-6 gap-3">
            <div>
              <h2 className="font-bold text-base sm:text-lg text-[#1C1C1C] font-serif uppercase tracking-wider">VCUBE VIETNAM JSC</h2>
              <p className="text-[#7D7565] mt-1 font-serif">Nền tảng In 3D Kỹ thuật & Chế tác Công nghiệp</p>
              <p className="text-[#7D7565]">MST: 0108924881 • Hotline: 1900 6833</p>
              <p className="text-[#7D7565]">Xưởng in: Khu Công Nghệ Cao Hòa Lạc, Hà Nội</p>
            </div>
            <div className="text-left sm:text-right space-y-1">
              <p className="font-tech font-bold text-sm text-[#1C1C1C]">MÃ ĐƠN: {order.orderNumber}</p>
              <p className="text-[#7D7565]">Ngày lập: {order.date}</p>
              <p className="text-[10px] uppercase tracking-wider font-bold text-[#1C1C1C]">ĐÃ THANH TOÁN ({order.payment.method})</p>
            </div>
          </div>

          {/* Customer info */}
          <div className="bg-white p-3.5 sm:p-4 border border-black/10 space-y-1">
            <p className="font-bold text-[10px] uppercase tracking-widest text-[#7D7565]">KHÁCH HÀNG / KỸ SƯ:</p>
            <p className="font-serif font-bold text-sm text-[#1C1C1C]">{order.shippingAddress.fullName} ({order.shippingAddress.phone})</p>
            <p className="text-[#7D7565] font-serif">{order.shippingAddress.address}, {order.shippingAddress.district}, {order.shippingAddress.city}</p>
          </div>

          {/* Items Table */}
          <div className="responsive-table-wrapper">
            <table className="text-left text-xs">
              <thead className="border-b border-black/10 text-[10px] uppercase tracking-widest text-[#7D7565] pb-2">
                <tr>
                  <th className="p-2 font-semibold">STT</th>
                  <th className="p-2 font-semibold">Tên Linh Kiện / Bản Vẽ</th>
                  <th className="p-2 font-semibold">Vật Liệu</th>
                  <th className="p-2 font-semibold text-center">SL</th>
                  <th className="p-2 font-semibold text-right">Đơn Giá</th>
                  <th className="p-2 font-semibold text-right">Thành Tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 font-sans text-xs">
                {order.items.map((item, idx) => (
                  <tr key={item.id}>
                    <td className="p-2 text-[#7D7565] font-tech">{idx + 1}</td>
                    <td className="p-2 font-serif font-bold text-[#1C1C1C]">{item.name}</td>
                    <td className="p-2 text-[#7D7565]">{item.material || 'File 3D STL'}</td>
                    <td className="p-2 text-center font-tech">{item.quantity}</td>
                    <td className="p-2 text-right font-tech">{item.price.toLocaleString('vi-VN')} đ</td>
                    <td className="p-2 text-right font-tech font-bold text-[#1C1C1C]">{(item.price * item.quantity).toLocaleString('vi-VN')} đ</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Payment summary */}
          <div className="pt-4 border-t border-black/10 flex justify-end">
            <div className="w-full sm:w-64 space-y-2 font-sans text-right">
              <div className="flex justify-between text-[#7D7565]">
                <span>Tạm tính linh kiện:</span>
                <span className="font-tech text-[#1C1C1C]">{(order.payment.subtotalPhysical + order.payment.subtotalDigital).toLocaleString('vi-VN')} đ</span>
              </div>
              <div className="flex justify-between text-[#7D7565]">
                <span>Phí vận chuyển chuyên dụng:</span>
                <span className="font-tech text-[#1C1C1C]">{order.payment.shippingFee.toLocaleString('vi-VN')} đ</span>
              </div>
              {order.payment.discount > 0 && (
                <div className="flex justify-between text-[#1C1C1C] font-semibold">
                  <span>Ưu đãi áp dụng:</span>
                  <span className="font-tech">-{order.payment.discount.toLocaleString('vi-VN')} đ</span>
                </div>
              )}
              <div className="pt-2 border-t border-black/15 flex justify-between font-bold text-sm text-[#1C1C1C]">
                <span className="uppercase tracking-wider text-xs">Tổng cộng:</span>
                <span className="font-tech text-base">{order.payment.total.toLocaleString('vi-VN')} đ</span>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-[#7D7565] font-serif italic text-center pt-4 border-t border-black/10">
            Hóa đơn điện tử khởi tạo bởi VCUBE Vietnam • Bảo hành dung sai và kiểm tra chất lượng 100% trước khi xuất xưởng.
          </div>
        </div>
      </div>
    </div>
  );
};
