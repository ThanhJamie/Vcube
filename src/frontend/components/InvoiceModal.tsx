import React, { useEffect, useState } from 'react';
import { Order } from '../types';
import { vatLabel, vatNotConfiguredLabel, vatRateFromPercent } from '../lib/vat';
import { Button, Icon, Modal } from '@frontend/ui';
import { settingsAccessors, subscribeSettings, getAppSettings } from '../../backend/services/settingsService';
import { usePricingGlobalSettings } from '../hooks/useSettings';
import { EMPTY_VALUE, formatCurrency, formatDateTime } from '../lib/format';

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
  // Hook nằm ở OUTER (luôn mount) và đứng trước mọi guard — CC-01: không còn `return null`
  // sớm, `<Modal>` mount sẵn nên hook không bị đổi thứ tự.
  // `subscribeSettings` gọi listener NGAY với snapshot hiện tại ⇒ có cache lập tức; nếu cache
  // còn rỗng (bootstrap chưa chạy xong) thì nạp một lần rồi để service lo phần realtime.
  const [legal, setLegal] = useState<InvoiceLegalSettings | null>(() => settingsAccessors.appSettings());

  // Đợt 9 (R1): hoá đơn cần biết `vat_percent` HIỆN TẠI chỉ để phân biệt "đơn không ghi
  // nhận VAT" với "VAT chưa được cấu hình" — số tiền in ra vẫn là số ĐÃ GHI trên đơn.
  // Hook ở outer (luôn mount) — body `InvoiceModalBody` không gọi hook nào.
  const { data: pricingGlobal, loading: pricingLoading, error: pricingError } = usePricingGlobalSettings();

  useEffect(() => {
    const unsubscribe = subscribeSettings((snap) => setLegal(snap.app_settings));
    if (!settingsAccessors.appSettings()) {
      void getAppSettings().then(({ data }) => { if (data) setLegal(data); });
    }
    return unsubscribe;
  }, []);

  // CC-01 (B) — BẪY StrictMode: trước đây `if (!isOpen || !order) return null;` khiến `<Modal>`
  // chỉ mount lúc mở; cleanup ở lần mount đầu gọi `dialog.close()`, sự kiện `close` bắn BẤT ĐỒNG BỘ
  // vào listener của lần mount thứ hai ⇒ `onClose()` ⇒ hoá đơn tự đóng (nút "Hoá đơn" như chết ở
  // dev). Sửa theo pattern `CadQuickViewModal.tsx`: `<Modal>` LUÔN mount, body chỉ dựng khi có
  // `order`. Props/hành vi/call-site trong `App.tsx` không đổi.
  const handlePrint = () => {
    window.print();
  };

  // Tiêu đề (header của Modal) chỉ cần tỉ lệ VAT ĐÃ GHI trên đơn ⇒ đọc an toàn khi `order` null.
  const titleVatRate =
    order && typeof order.payment.vatRate === 'number' && Number.isFinite(order.payment.vatRate)
      ? order.payment.vatRate
      : null;
  const titleVat = titleVatRate === null ? null : vatLabel(titleVatRate);

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      size="lg"
      showCloseButton={false}
      bodyClassName="p-0"
      title={
        <span className="flex w-full items-center justify-between gap-3">
          <span className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-fg">
              <Icon name="receipt_long" size={16} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold uppercase tracking-wider text-fg">
                {titleVat ? 'HOÁ ĐƠN GTGT & CHỨNG NHẬN GIA CÔNG KỸ THUẬT' : 'HOÁ ĐƠN & CHỨNG NHẬN GIA CÔNG KỸ THUẬT'}
              </span>
              <span className="block font-mono text-xs text-fg-subtle">
                {order ? `Số HĐ: HD-VCUBE-${order.orderNumber.replace('#', '')}` : 'Chưa chọn đơn để lập hoá đơn'}
              </span>
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={handlePrint}
              leadingIcon={<Icon name="print" size={16} />}
            >
              In Hóa Đơn
            </Button>
            <Button
              iconOnly
              variant="ghost"
              size="sm"
              aria-label="Đóng hóa đơn"
              onClick={onClose}
            >
              <Icon name="close" size={20} />
            </Button>
          </span>
        </span>
      }
    >
      {order ? (
        <InvoiceModalBody
          order={order}
          legal={legal}
          pricingGlobal={pricingGlobal}
          pricingLoading={pricingLoading}
          pricingError={pricingError}
        />
      ) : null}
    </Modal>
  );
};

interface InvoiceModalBodyProps {
  /** KHÁC outer: body CHỈ được dựng khi đã có hoá đơn (non-null). */
  order: Order;
  legal: InvoiceLegalSettings | null;
  pricingGlobal: ReturnType<typeof usePricingGlobalSettings>['data'];
  pricingLoading: boolean;
  pricingError: ReturnType<typeof usePricingGlobalSettings>['error'];
}

/** Nội dung hoá đơn in được — mọi con số đọc từ `order` đã lưu (PC-04). */
const InvoiceModalBody: React.FC<InvoiceModalBodyProps> = ({
  order,
  legal,
  pricingGlobal,
  pricingLoading,
  pricingError,
}) => {

  // PC-04: hoá đơn chỉ in những con số ĐÃ ĐƯỢC GHI NHẬN trên đơn. Trước đây hoá
  // đơn tự bịa `Math.round(subtotal * 0.08)` trên subtotalPhysical rồi cộng vào
  // tổng, ra một con số khác cả checkout lẫn quote.
  const p = order.payment;
  // Đợt 9 (R1): tỉ lệ VAT của hoá đơn là tỉ lệ ĐÃ GHI trên đơn (`payment.vatRate`) — nguồn
  // của nó ở /checkout là `pricing_global_settings.vat_percent`. KHÔNG rơi về 8% như trước:
  // đơn không ghi tỉ lệ ⇒ hoá đơn không in dòng VAT (PC-04: chỉ in số đã ghi nhận).
  const recordedVatRate = typeof p.vatRate === 'number' && Number.isFinite(p.vatRate) ? p.vatRate : null;
  const recordedVat = recordedVatRate === null ? null : vatLabel(recordedVatRate);
  const liveVatRate = vatRateFromPercent(pricingGlobal?.vatPercent);
  // Giữ nguyên `null`: hoá đơn KHÔNG được bịa "0 ₫" khi đơn thiếu tổng/tax.
  const vatAmount = typeof p.tax === 'number' && Number.isFinite(p.tax) ? p.tax : null;
  const grandTotal = typeof p.total === 'number' && Number.isFinite(p.total) ? p.total : null;
  const vatPending = pricingLoading && pricingGlobal === null && !pricingError;
  const isPaid = p.isPaid === true || p.status === 'paid';
  const isCod = p.status === 'cod';

  return (
    <>
          {/* Printable Invoice Body */}
          <div className="space-y-6 bg-surface p-6 text-xs text-fg sm:p-8">
            {/* Company & Order Info Header */}
            <div className="flex flex-col justify-between gap-4 border-b border-line pb-5 sm:flex-row">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-display text-xl font-black tracking-tighter text-fg">VCUBE</span>
                  <span className="rounded-full border border-line bg-surface-muted px-2.5 py-1 text-xs font-medium text-fg-muted">
                    Chế tác chính xác Việt Nam
                  </span>
                </div>
                <p className="mt-2 text-xs text-fg-muted">
                  {legal?.legalName || <Unknown title="Chưa khai báo tên pháp nhân (Cấu hình → Pháp lý & Định danh)" />}
                </p>
                <p className="mt-1 font-mono text-xs text-fg-subtle">
                  Mã Số Thuế: <strong className="text-fg">{legal?.taxCode || <Unknown title="Chưa khai báo mã số thuế" />}</strong>
                  {' • '}Tổng đài kỹ thuật: {legal?.hotline || <Unknown title="Chưa khai báo số tổng đài" />}
                </p>
                <p className="mt-1 text-xs text-fg-subtle">
                  Chứng từ nội bộ do VCUBE phát hành. Hoá đơn điện tử do cơ quan thuế cấp mã sẽ được gửi riêng.
                </p>
                <p className="text-xs text-fg-subtle">
                  Xưởng Chế Tác: {legal?.invoiceAddress || <Unknown title="Chưa khai báo địa chỉ xuất hoá đơn" />}
                </p>
              </div>

              <div className="space-y-1 font-mono text-left sm:text-right">
                <p className="text-sm font-bold text-fg">MÃ ĐƠN: {order.orderNumber}</p>
                <p className="text-xs text-fg-subtle">Ngày phát hành: {orderDateText(order.date)}</p>
                <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium uppercase ${
                  isPaid
                    ? 'border-positive/20 bg-positive-tint text-positive'
                    : 'border-warning/20 bg-warning-tint text-warning'
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
            <div className="space-y-1 rounded-lg border border-line-subtle bg-surface p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
                THÔNG TIN ĐƠN VỊ / KHÁCH HÀNG:
              </p>
              <p className="text-sm font-semibold text-fg">
                {order.shippingAddress.fullName}
                <span className="ml-2 font-mono text-xs font-normal text-fg-subtle">({order.shippingAddress.phone})</span>
              </p>
              <p className="text-xs text-fg-muted">
                Địa chỉ nhận: {[order.shippingAddress.address, order.shippingAddress.district, order.shippingAddress.city].filter(Boolean).join(', ') || <Unknown />}
              </p>
            </div>

            {/* Items Table */}
            <div className="overflow-x-auto rounded-lg border border-line bg-surface">
              <table className="w-full text-left text-xs sm:min-w-[560px]">
                <thead className="bg-surface-muted text-xs uppercase tracking-wider text-fg-muted">
                  <tr>
                    <th className="px-2 py-3 font-semibold sm:px-4">STT</th>
                    <th className="px-2 py-3 font-semibold sm:px-4">Chi Tiết / Mã Bản Vẽ</th>
                    <th className="hidden px-2 py-3 font-semibold sm:table-cell sm:px-4">Vật Liệu &amp; Dung Sai</th>
                    <th className="px-2 py-3 text-center font-semibold sm:px-4">SL</th>
                    <th className="hidden px-2 py-3 text-right font-semibold sm:table-cell sm:px-4">Đơn Giá</th>
                    <th className="px-2 py-3 text-right font-semibold sm:px-4">Thành Tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item, idx) => (
                    <tr key={item.id} className="border-t border-line-subtle hover:bg-surface-muted/60">
                      <td className="px-2 py-3 font-mono tabular-nums text-fg-subtle sm:px-4">{idx + 1}</td>
                      <td className="px-2 py-3 font-semibold text-fg sm:px-4">
                        {item.name}
                        {item.customText && (
                          <span className="block font-mono text-xs font-normal text-fg-muted">
                            Khắc Laser: "{item.customText}"
                          </span>
                        )}
                      </td>
                      <td className="hidden px-2 py-3 font-mono text-xs text-fg-muted sm:table-cell sm:px-4">
                        {item.material || <Unknown title="Không ghi nhận vật liệu" />}
                      </td>
                      <td className="px-2 py-3 text-center font-mono tabular-nums text-fg sm:px-4">{item.quantity}</td>
                      <td className="hidden px-2 py-3 text-right font-mono tabular-nums text-fg-muted sm:table-cell sm:px-4">{formatCurrency(item.price)}</td>
                      <td className="px-2 py-3 text-right font-mono font-semibold tabular-nums text-fg sm:px-4">
                        {formatCurrency(item.price * item.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Payment breakdown & Digital Signature Stamp */}
            <div className="grid grid-cols-1 gap-6 pt-2 sm:grid-cols-2">
              {/* Left: verification status — chỉ nêu sự thật, không in chữ ký giả */}
              <div className="space-y-2 rounded-lg border border-line-subtle bg-surface p-4 text-xs">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-fg-subtle">
                  <Icon name="info" size={16} className="shrink-0" />
                  <span>TRẠNG THÁI CHỨNG TỪ</span>
                </div>
                <p className="text-xs leading-relaxed text-fg-muted">
                  VCUBE chưa tích hợp dịch vụ ký số cho hoá đơn này, nên không có chữ ký điện tử
                  hay mã băm xác thực nào được in kèm. Bản in này là chứng từ nội bộ để đối chiếu
                  đơn hàng.
                </p>
                <p className="text-xs text-fg-muted">
                  Mã đơn đối chiếu: <strong className="font-mono text-fg">{order.orderNumber}</strong>
                  {' • '}Ngày tạo đơn: <strong className="font-mono text-fg">{orderDateText(order.date)}</strong>
                </p>
              </div>

              {/* Right: Amounts Calculation — mọi con số đọc từ đơn đã lưu */}
              <div className="space-y-2 rounded-lg border border-line-subtle bg-surface p-4 font-mono text-xs">
                {p.subtotalDigital > 0 && (
                  <div className="flex justify-between gap-3 text-fg-muted">
                    <span>Tạm tính tệp CAD:</span>
                    <span className="text-right tabular-nums">{formatCurrency(p.subtotalDigital)}</span>
                  </div>
                )}
                {p.subtotalPhysical > 0 && (
                  <div className="flex justify-between gap-3 text-fg-muted">
                    <span>Tạm tính in 3D:</span>
                    <span className="text-right tabular-nums">{formatCurrency(p.subtotalPhysical)}</span>
                  </div>
                )}
                {p.discount > 0 && (
                  <div className="flex justify-between gap-3 font-semibold text-positive">
                    <span>Giảm giá ưu đãi:</span>
                    <span className="text-right tabular-nums">- {formatCurrency(p.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between gap-3 text-fg-muted">
                  <span>Phí vận chuyển:</span>
                  <span className="text-right tabular-nums">{formatCurrency(p.shippingFee)}</span>
                </div>
                {recordedVat !== null ? (
                  <div className="flex justify-between gap-3 text-fg-muted">
                    <span>{`Thuế GTGT — ${recordedVat}:`}</span>
                    <span className="text-right tabular-nums">{vatAmount === null ? EMPTY_VALUE : formatCurrency(vatAmount)}</span>
                  </div>
                ) : pricingError ? (
                  <p className="font-sans text-xs leading-relaxed text-danger">
                    Không đọc được cấu hình VAT: {pricingError}
                  </p>
                ) : vatPending ? (
                  <p className="font-sans text-xs leading-relaxed text-fg-subtle">Đang đọc cấu hình VAT…</p>
                ) : (
                  <p className="font-sans text-xs leading-relaxed text-fg-subtle">
                    {liveVatRate === null
                      ? vatNotConfiguredLabel(true)
                      : 'Đơn này không ghi nhận dòng VAT — hoá đơn chỉ in số tiền đã ghi trên đơn.'}
                  </p>
                )}
                <div className="flex justify-between gap-3 border-t border-line-subtle pt-3 text-sm font-bold text-fg">
                  <span>TỔNG CỘNG THANH TOÁN:</span>
                  <span className="text-right font-mono tabular-nums text-fg">
                    {grandTotal === null ? EMPTY_VALUE : formatCurrency(grandTotal)}
                  </span>
                </div>
                <p className="pt-1 font-sans text-xs leading-relaxed text-fg-subtle">
                  Tổng cộng là số tiền đã ghi nhận trên đơn {order.orderNumber}
                  {grandTotal === null ? ' — chưa có số tiền được ghi nhận.' : '.'}
                </p>
              </div>
            </div>
          </div>
    </>
  );
};
