import React, { useEffect, useState } from 'react';
import { Order } from '../types';
import { vatLabel, vatNotConfiguredLabel, vatRateFromPercent } from '../lib/vat';
import { Icon } from '@frontend/ui';
import { settingsAccessors, subscribeSettings, getAppSettings } from '../../backend/services/settingsService';
import { usePricingGlobalSettings } from '../hooks/useSettings';
import { EMPTY_VALUE, formatDateTime } from '../lib/format';

/**
 * `Order.date` đến từ HAI nguồn khác nhau:
 *   * `/checkout` ghi một CHUỖI HIỂN THỊ (`dd/mm/yyyy hh:mm` theo `toLocaleDateString`).
 *   * Đơn ĐỌC LẠI từ DB mang ISO/timestamptz (cột `orders.date` → `rowToOrder` ở mappers).
 * Chỉ định dạng lại giá trị ISO; chuỗi đã là bản hiển thị thì giữ nguyên — đem `new Date()` đi
 * đoán `dd/mm` sẽ bị đọc thành `mm/dd`, tức là HIỂN SAI NGÀY. Giá trị trống hoặc không đọc
 * được thì in nguyên văn thứ đang có, KHÔNG bịa một ngày.
 *
 * (Đây là bản sao có chủ đích của `OrderSuccessView.tsx`; gộp lại cần sửa
 * `src/frontend/lib/format.ts`, nằm ngoài phạm vi 2 file này.)
 */
function orderDateText(value: string | null | undefined): string {
  const raw = (value ?? '').trim();
  if (!raw) return EMPTY_VALUE;
  if (!/^\d{4}-\d{2}-\d{2}([T ]|$)/.test(raw)) return raw;
  const formatted = formatDateTime(raw);
  return formatted === EMPTY_VALUE ? raw : formatted;
}

interface InvoiceModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

/** `—` cho mọi giá trị chưa có nguồn thật. */
const Unknown: React.FC<{ title?: string }> = ({ title = 'Chưa có dữ liệu' }) => (
  <span className="text-fg-subtle font-mono" title={title}>—</span>
);

/**
 * Pháp nhân / MST / hotline / địa chỉ xuất hoá đơn là DỮ LIỆU CẤU HÌNH, không phải hằng số
 * trong mã (PC-04). Kiểu suy ra từ chính accessor của `settingsService` để không phải import
 * thêm type từ tầng mappers.
 */
type InvoiceLegalSettings = NonNullable<ReturnType<typeof settingsAccessors.appSettings>>;

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ order, isOpen, onClose }) => {
  // Hook phải đứng TRƯỚC `if (!isOpen || !order) return null;` (luật hook của React).
  // `subscribeSettings` gọi listener NGAY với snapshot hiện tại ⇒ có cache lập tức; nếu cache
  // còn rỗng (bootstrap chưa chạy xong) thì nạp một lần rồi để service lo phần realtime.
  const [legal, setLegal] = useState<InvoiceLegalSettings | null>(() => settingsAccessors.appSettings());

  // Đợt 9 (R1): hoá đơn cần biết `vat_percent` HIỆN TẠI chỉ để phân biệt "đơn không ghi
  // nhận VAT" với "VAT chưa được cấu hình" — số tiền in ra vẫn là số ĐÃ GHI trên đơn.
  // Hook đứng TRƯỚC `if (!isOpen || !order) return null;` (luật hook của React).
  const { data: pricingGlobal } = usePricingGlobalSettings();

  useEffect(() => {
    const unsubscribe = subscribeSettings((snap) => setLegal(snap.app_settings));
    if (!settingsAccessors.appSettings()) {
      void getAppSettings().then(({ data }) => { if (data) setLegal(data); });
    }
    return unsubscribe;
  }, []);

  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  // PC-04: hoá đơn chỉ in những con số ĐÃ ĐƯỢC GHI NHẬN trên đơn. Trước đây hoá
  // đơn tự bịa `Math.round(subtotal * 0.08)` trên subtotalPhysical rồi cộng vào
  // tổng, ra một con số khác cả checkout lẫn quote.
  const p = order.payment;
  const subtotal = (p.subtotalPhysical || 0) + (p.subtotalDigital || 0);
  // Đợt 9 (R1): tỉ lệ VAT của hoá đơn là tỉ lệ ĐÃ GHI trên đơn (`payment.vatRate`) — nguồn
  // của nó ở /checkout là `pricing_global_settings.vat_percent`. KHÔNG rơi về 8% như trước:
  // đơn không ghi tỉ lệ ⇒ hoá đơn không in dòng VAT (PC-04: chỉ in số đã ghi nhận).
  const recordedVatRate = typeof p.vatRate === 'number' && Number.isFinite(p.vatRate) ? p.vatRate : null;
  const recordedVat = recordedVatRate === null ? null : vatLabel(recordedVatRate);
  const liveVatRate = vatRateFromPercent(pricingGlobal?.vatPercent);
  const vatAmount = p.tax || 0;
  const grandTotal = p.total || 0;
  const isPaid = p.isPaid === true || p.status === 'paid';
  const isCod = p.status === 'cod';

  return (
    <div className="fixed inset-0 bg-surface-inverse/70 z-modal flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs">
      <div className="bg-surface w-full max-w-3xl rounded-lg shadow-e3 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Top Control Bar */}
        <div className="px-5 py-4 bg-surface-inverse text-on-inverse flex items-center justify-between font-sans shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-sm bg-primary flex items-center justify-center text-primary-fg">
              <Icon name="receipt_long" size={18} />
            </div>
            <div>
              <h3 className="font-bold text-xs uppercase tracking-wider">
                HÓA ĐƠN GTGT & CHỨNG NHẬN GIA CÔNG KỸ THUẬT
              </h3>
              <p className="text-xs text-fg-subtle font-mono">
                Số HĐ: HD-VCUBE-{order.orderNumber.replace('#', '')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-primary hover:bg-primary-hover text-primary-fg text-xs font-mono uppercase tracking-wider font-bold rounded-full flex items-center gap-1.5 transition-colors cursor-pointer shadow-e1"
            >
              <Icon name="print" size={18} />
              <span>In Hóa Đơn</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-on-inverse/10 text-on-inverse/70 hover:text-on-inverse rounded-lg transition-colors cursor-pointer"
              aria-label="Đóng hóa đơn"
            >
              <Icon name="close" size={24} />
            </button>
          </div>
        </div>

        {/* Printable Invoice Body */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-xs text-fg font-sans bg-canvas">
          {/* Company & Order Info Header */}
          <div className="flex flex-col sm:flex-row justify-between border-b border-line pb-5 gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-black text-xl text-fg tracking-tighter">VCUBE</span>
                <span className="text-xs font-mono font-bold text-primary bg-primary-tint px-2 py-0.5 rounded-sm border border-primary/30">
                  VIETNAM PRECISION FABRICATION
                </span>
              </div>
              <p className="text-fg-muted mt-1 text-xs">
                {legal?.legalName || <Unknown title="Chưa khai báo tên pháp nhân (Cấu hình → Pháp lý & Định danh)" />}
              </p>
              <p className="text-fg-subtle text-xs font-mono mt-0.5">
                Mã Số Thuế: <strong className="text-fg">{legal?.taxCode || <Unknown title="Chưa khai báo mã số thuế" />}</strong>
                {' • '}Hotline Kỹ Thuật: {legal?.hotline || <Unknown title="Chưa khai báo hotline" />}
              </p>
              <p className="text-fg-subtle text-xs mt-0.5">
                Chứng từ nội bộ do VCUBE phát hành. Hoá đơn điện tử do cơ quan thuế cấp mã sẽ được gửi riêng.
              </p>
              <p className="text-fg-subtle text-xs">
                Xưởng Chế Tác: {legal?.invoiceAddress || <Unknown title="Chưa khai báo địa chỉ xuất hoá đơn" />}
              </p>
            </div>

            <div className="text-left sm:text-right space-y-1 font-mono">
              <p className="font-bold text-sm text-fg">MÃ ĐƠN: {order.orderNumber}</p>
              <p className="text-xs text-fg-subtle">Ngày phát hành: {orderDateText(order.date)}</p>
              <span className={`inline-block px-2 py-0.5 border rounded-sm text-xs font-bold uppercase ${
                isPaid
                  ? 'bg-positive-tint text-positive border-positive/30'
                  : 'bg-warning-tint text-warning border-warning/30'
              }`}>
                {isPaid
                  ? `ĐÃ THANH TOÁN (${p.method || '—'})`
                  : isCod
                  ? `THU KHI GIAO HÀNG (${p.method || 'COD'})`
                  : `CHƯA THANH TOÁN (${p.method || '—'})`}
              </span>
            </div>
          </div>

          {/* Customer info card */}
          <div className="bg-surface-muted p-4 rounded-lg space-y-1 shadow-e0">
            <p className="font-mono font-bold text-xs uppercase tracking-widest text-primary">
              THÔNG TIN ĐƠN VỊ / KHÁCH HÀNG:
            </p>
            <p className="font-bold text-sm text-fg">
              {order.shippingAddress.fullName}
              <span className="text-fg-subtle font-mono font-normal ml-2">({order.shippingAddress.phone})</span>
            </p>
            <p className="text-fg-muted text-xs">
              Địa chỉ nhận: {[order.shippingAddress.address, order.shippingAddress.district, order.shippingAddress.city].filter(Boolean).join(', ') || <Unknown />}
            </p>
          </div>

          {/* Items Table */}
          <div className="bg-surface-muted rounded-lg overflow-hidden shadow-e0">
            <table className="w-full text-left text-xs">
              <thead className="bg-canvas border-b border-line text-xs font-mono font-bold uppercase tracking-wider text-fg-subtle">
                <tr>
                  <th className="p-3">STT</th>
                  <th className="p-3">Chi Tiết / Mã Bản Vẽ</th>
                  <th className="p-3">Vật Liệu & Dung Sai</th>
                  <th className="p-3 text-center">SL</th>
                  <th className="p-3 text-right">Đơn Giá</th>
                  <th className="p-3 text-right">Thành Tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-subtle">
                {order.items.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-canvas/50">
                    <td className="p-3 text-fg-subtle font-mono">{idx + 1}</td>
                    <td className="p-3 font-bold text-fg">
                      {item.name}
                      {item.customText && (
                        <span className="block text-xs text-primary font-mono font-normal">
                          Khắc Laser: "{item.customText}"
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-fg-muted font-mono text-xs">
                      {item.material || <Unknown title="Không ghi nhận vật liệu" />}
                    </td>
                    <td className="p-3 text-center font-mono font-bold">{item.quantity}</td>
                    <td className="p-3 text-right font-mono">{item.price.toLocaleString('vi-VN')} ₫</td>
                    <td className="p-3 text-right font-mono font-bold text-fg">
                      {(item.price * item.quantity).toLocaleString('vi-VN')} ₫
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Payment breakdown & Digital Signature Stamp */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
            {/* Left: verification status — chỉ nêu sự thật, không in chữ ký giả */}
            <div className="bg-surface-muted p-4 rounded-lg space-y-2 text-xs shadow-e0">
              <div className="flex items-center gap-2 text-fg-subtle font-mono font-bold">
                <Icon name="info" size={18} />
                <span>TRẠNG THÁI CHỨNG TỪ</span>
              </div>
              <p className="text-fg-subtle text-xs leading-relaxed">
                VCUBE chưa tích hợp dịch vụ ký số cho hoá đơn này, nên không có chữ ký điện tử
                hay mã băm xác thực nào được in kèm. Bản in này là chứng từ nội bộ để đối chiếu
                đơn hàng.
              </p>
              <p className="text-fg-subtle text-xs">
                Mã đơn đối chiếu: <strong className="font-mono text-fg">{order.orderNumber}</strong>
                {' • '}Ngày tạo đơn: <strong className="font-mono text-fg">{orderDateText(order.date)}</strong>
              </p>
            </div>

            {/* Right: Amounts Calculation — mọi con số đọc từ đơn đã lưu */}
            <div className="bg-surface-muted p-4 rounded-lg space-y-2 font-mono text-xs shadow-e0">
              {p.subtotalDigital > 0 && (
                <div className="flex justify-between text-fg-subtle">
                  <span>Tạm tính file CAD:</span>
                  <span>{p.subtotalDigital.toLocaleString('vi-VN')} ₫</span>
                </div>
              )}
              {p.subtotalPhysical > 0 && (
                <div className="flex justify-between text-fg-subtle">
                  <span>Tạm tính in 3D:</span>
                  <span>{p.subtotalPhysical.toLocaleString('vi-VN')} ₫</span>
                </div>
              )}
              {p.discount > 0 && (
                <div className="flex justify-between text-positive font-bold">
                  <span>Giảm giá ưu đãi:</span>
                  <span>- {p.discount.toLocaleString('vi-VN')} ₫</span>
                </div>
              )}
              <div className="flex justify-between text-fg-subtle">
                <span>Phí vận chuyển:</span>
                <span>{p.shippingFee ? `${p.shippingFee.toLocaleString('vi-VN')} ₫` : '0 ₫'}</span>
              </div>
              {recordedVat !== null ? (
                <div className="flex justify-between text-fg-subtle">
                  <span>{`Thuế GTGT — ${recordedVat}:`}</span>
                  <span>{vatAmount.toLocaleString('vi-VN')} ₫</span>
                </div>
              ) : (
                <p className="text-xs text-fg-subtle font-sans leading-relaxed">
                  {liveVatRate === null
                    ? vatNotConfiguredLabel(true)
                    : 'Đơn này không ghi nhận dòng VAT — hoá đơn chỉ in số tiền đã ghi trên đơn.'}
                </p>
              )}
              <div className="border-t border-line pt-2 flex justify-between font-bold text-sm text-fg">
                <span>TỔNG CỘNG THANH TOÁN:</span>
                <span className="text-primary text-base">{grandTotal.toLocaleString('vi-VN')} ₫</span>
              </div>
              <p className="text-xs text-fg-subtle font-sans leading-relaxed pt-1">
                Tổng cộng khớp với số tiền đã ghi nhận trên đơn {order.orderNumber}
                {subtotal !== (p.total || 0) && vatAmount === 0 ? ' (chưa bao gồm VAT)' : ''}.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
