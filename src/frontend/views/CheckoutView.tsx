import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { CartItem, Order, OrderPaymentStatus, SiteContentConfig } from '../../types';
import { useAuth } from '../context/AuthContext';
import { useCartStore } from '@frontend/stores/useCartStore';
import { computeShippingFee, DEFAULT_SALES_RULES } from '../../backend/supabase/database';
import { computeVat, vatLabel, vatNotConfiguredLabel, vatRateFromPercent, vatTotalNote } from '../lib/vat';
import { usePricingGlobalSettings } from '../hooks/useSettings';
import { Icon, Button, Card, EmptyState, Field, Input, Money, Select } from '@frontend/ui';
import { settingsAccessors, subscribeSettings, getAppSettings } from '../../backend/services/settingsService';
import { OrderService } from '../../backend/services/orderService';
import { manualPaymentProvider } from '../../backend/integrations/paymentProvider';
import type { PaymentInstructions } from '../../backend/integrations/paymentProvider';

/** Nhãn vai trò hiển thị VI (giá trị `role` trong DB là enum tiếng Anh — không render thô). */
const ROLE_LABEL: Record<string, string> = {
  admin: 'Quản trị viên',
  designer: 'Tác giả 3D',
  lab: 'Xưởng in',
  customer: 'Khách hàng',
};

/**
 * Q1 (Đợt 8C §0 + data-honesty PC-03): ngân hàng / số tài khoản / tên pháp nhân nhận
 * chuyển khoản là DỮ LIỆU CẤU HÌNH trong `app_settings`, KHÔNG phải hằng số trong mã.
 * Kiểu suy ra từ chính accessor của `settingsService` (không import thêm type).
 */
type TransferSettings = NonNullable<ReturnType<typeof settingsAccessors.appSettings>>;

interface CheckoutViewProps {
  cart: CartItem[];
  appliedDiscount?: number;
  siteContent?: SiteContentConfig;
  onOrderCompleted: (order: Order) => void;
  onNavigate: (screen: string, payload?: any) => void;
}

export const CheckoutView: React.FC<CheckoutViewProps> = ({
  cart,
  appliedDiscount = 0,
  siteContent,
  onOrderCompleted,
  onNavigate
}) => {
  const { user, profile, isLoggedIn } = useAuth();

  // Q1 (Đợt 8C §0 / data-honesty PC-03): số tài khoản ngân hàng và tên pháp nhân trước
  // đây là HẰNG SỐ trong mã — khách nhìn thấy một số tài khoản BỊA ngay ở bước thanh toán
  // (giá trị cũ ghi trong báo cáo Q1). Nay đọc từ `app_settings` qua settingsService.
  // Giá trị rỗng ⇒ ẨN DÒNG đó (KHÔNG in "Số tài khoản: —"). Hook đặt TRƯỚC mọi early
  // return của component (luật hook của React).
  const [transferSettings, setTransferSettings] = useState<TransferSettings | null>(
    () => settingsAccessors.appSettings()
  );

  useEffect(() => {
    const unsubscribe = subscribeSettings((snap) => setTransferSettings(snap.app_settings));
    if (!settingsAccessors.appSettings()) {
      void getAppSettings().then(({ data }) => { if (data) setTransferSettings(data); });
    }
    return unsubscribe;
  }, []);

  // Đợt 9 (R1): tỉ lệ VAT đọc từ `pricing_global_settings.vat_percent` — hết 8% cứng.
  // Hook đứng TRƯỚC mọi early return của component (luật hook của React).
  const { data: pricingGlobal, loading: pricingLoading, error: pricingError } = usePricingGlobalSettings();
  const vatRate = vatRateFromPercent(pricingGlobal?.vatPercent);
  /** Đang đọc cấu hình VAT (chưa có cache) — KHÔNG được kết luận "chưa cấu hình". */
  const vatPending = pricingLoading && pricingGlobal === null && !pricingError;

  const bankName = transferSettings?.bankName?.trim() || '';
  const bankAccount = transferSettings?.bankAccount?.trim() || '';
  const accountHolder = transferSettings?.legalName?.trim() || '';
  const hasTransferInfo = Boolean(bankName || bankAccount || accountHolder);
  // CTA tới /admin chỉ hiện với người xem là admin (role lấy từ DB — AuthContext).
  const canConfigureTransferInfo = profile?.role === 'admin';

  // P0 (data-honesty #2): KHÔNG prefill PII của người khác. Chỉ điền sẵn thông tin
  // của CHÍNH người dùng đang đăng nhập và đã tự lưu trong hồ sơ; khách vãng lai
  // bắt đầu với form trống. Trước đây mọi khách đều thấy tên/SĐT/địa chỉ của một
  // "Kỹ Sư Trần Tuấn Anh" bịa sẵn làm giá trị mặc định.
  const [fullName, setFullName] = useState(profile?.displayName || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [email, setEmail] = useState(profile?.email || '');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'vietqr' | 'vnpay' | 'cod'>('vietqr');
  const [needsVatInvoice, setNeedsVatInvoice] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  /**
   * B1 — lỗi THẬT từ tầng ghi DB. Có giá trị ⇒ đơn CHƯA tồn tại và UI phải nói đúng
   * điều đó; màn hình thành công chỉ được mở khi DB đã nhận đơn (data-honesty OT-03).
   */
  const [orderError, setOrderError] = useState<string | null>(null);
  /**
   * FL-1: đơn VỪA TẠO (đã xuống DB). Có giá trị ⇒ màn hình chuyển sang khối thanh toán thủ công
   * (số tiền + nội dung chuyển khoản + thông tin nhận tiền từ `app_settings`) thay vì rời trang
   * ngay. KHÔNG bịa thông tin ngân hàng: thiếu cấu hình ⇒ hiện "Chưa cấu hình thông tin nhận tiền".
   */
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [copiedPaymentField, setCopiedPaymentField] = useState<string | null>(null);

  const physicalItems = cart.filter(i => i.type === 'physical');
  const digitalItems = cart.filter(i => i.type === 'digital');

  const subtotalPhysical = physicalItems.reduce((a, b) => a + b.price * b.quantity, 0);
  const subtotalDigital = digitalItems.reduce((a, b) => a + b.price * b.quantity, 0);
  const subtotal = subtotalPhysical + subtotalDigital;

  // Phí vận chuyển: MỘT nguồn duy nhất (`computeShippingFee` ← site_content).
  // Trước đây ba nơi hardcode ba giá trị khác nhau (25.000 / 30.000 / inline 30.000).
  const shippingFee = computeShippingFee(subtotalPhysical, physicalItems.length > 0, siteContent);
  const freeThreshold = siteContent?.freeShippingThreshold ?? DEFAULT_SALES_RULES.freeShippingThreshold;

  // VAT: giá niêm yết CHƯA gồm VAT; VAT là một dòng riêng, cùng con số với /quote, /cart
  // và hoá đơn (trước đây checkout set `tax: 0` còn InvoiceModal tự cộng 8%). Tỉ lệ đọc từ
  // `pricing_global_settings.vat_percent`; NULL ⇒ `vat === null` ⇒ ẩn dòng VAT (KHÔNG 0%/8%).
  const afterDiscount = Math.max(0, subtotal + shippingFee - appliedDiscount);
  const vat = computeVat(afterDiscount, vatRate);
  const totalAmount = vat ? vat.total : afterDiscount;

  const handleCompleteOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing) return; // chống gửi 2 lần (S10)
    setIsProcessing(true);
    setOrderError(null);

    const prefersReducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);

    // B2 — MỘT mốc thời gian, HAI biểu diễn, không bao giờ trộn:
    //   * `createdAtIso` (ISO-8601) là thứ DUY NHẤT được ghi vào cột `orders.date`
    //     (timestamptz). Trước đây chuỗi hiển thị bị ghi thẳng ⇒ Postgres `22008`.
    //   * `displayDate` chỉ để RENDER (OrderSuccessView/InvoiceModal in thẳng `order.date`).
    const createdAt = new Date();
    const createdAtIso = createdAt.toISOString();
    const displayDate =
      createdAt.toLocaleDateString('vi-VN') +
      ' ' +
      createdAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    // P0 (PC-03 / data-honesty §5): đơn mới KHÔNG bao giờ tự nhận đã thanh toán.
    // VietQR/VNPAY chỉ được chuyển sang `paid` bởi webhook cổng thanh toán đã
    // kiểm chứng hoặc bởi người vận hành. COD là `cod` — thu tiền khi giao.
    const paymentStatus: OrderPaymentStatus =
      paymentMethod === 'cod' ? 'cod' : 'awaiting_payment';

    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      orderNumber: `#VCUBE-${randomSuffix}`,
      date: displayDate,
      // Không hứa hạn giao khi chưa có đơn vị vận chuyển nào nhận đơn.
      estimatedDelivery: '',
      status: 'pending_payment',
      statusStageIndex: 0,
      layerProgress: null,
      timeRemaining: null,
      customerType: isLoggedIn ? 'registered' : 'guest',
      secureAccessToken: !isLoggedIn ? `sec_${Date.now()}_${Math.random().toString(36).substring(2, 10)}` : undefined,
      items: cart.map(item => ({
        id: item.id,
        name: item.name,
        designer: item.designer,
        type: item.type,
        image: item.image,
        price: item.price,
        quantity: item.quantity,
        material: item.material,
        color: item.color,
        resolution: item.resolution,
        license: item.licenseType,
        customText: item.customText,
        weightGrams: item.weightGrams ?? null,
        version: 'v2.1'
      })),
      shippingAddress: {
        fullName,
        phone,
        email,
        address,
        city,
        district,
        note: needsVatInvoice
          ? `${note} [VAT: ${companyName} - MST: ${taxId}${companyAddress ? ` - ĐC: ${companyAddress}` : ''}]`
          : note
      },
      // OT-11: không bịa hãng vận chuyển và mã vận đơn. Chỉ điền khi đơn vị
      // vận chuyển thực sự trả về; UI render "Chưa có mã vận đơn".
      carrier: {
        name: '',
        trackingCode: ''
      },
      payment: {
        method: paymentMethod === 'vietqr' ? 'VietQR Chuyển Khoản' : paymentMethod === 'vnpay' ? 'VNPAY QR' : 'Thanh toán khi nhận hàng (COD)',
        // '' = chưa nhận được tiền, chưa có thời điểm thanh toán.
        paidDate: '',
        subtotalPhysical,
        subtotalDigital,
        shippingFee,
        discount: appliedDiscount,
        // Chưa cấu hình VAT ⇒ KHÔNG ghi một tỉ lệ nào vào đơn (hoá đơn sẽ không in dòng
        // VAT và nói rõ chưa cấu hình). `tax: 0` = không cộng thêm đồng thuế nào.
        tax: vat ? vat.amount : 0,
        vatRate: vat ? vat.rate : undefined,
        total: totalAmount,
        isPaid: false,
        status: paymentStatus
      }
    };

    try {
      // B1 — ĐƠN PHẢI XUỐNG DB TRƯỚC KHI BÁO THÀNH CÔNG. Đường ghi đi qua tầng service
      // (`src/backend/services/orderService.ts` → `dbService.saveOrder`), KHÔNG gọi
      // Supabase trong component. `user?.id` là `auth.uid()` thật để RLS
      // `vcube_orders_owner_read` đọc lại được đơn của chính người đặt.
      const savedOrder = await OrderService.createOrder(newOrder, {
        userId: user?.id,
        createdAtIso,
      });

      // Chỉ bắn confetti SAU khi DB đã nhận đơn (trước đây bắn trước khi ghi ⇒ chúc mừng
      // nhầm khi tạo đơn thất bại). Tôn trọng `prefers-reduced-motion`.
      if (!prefersReducedMotion) {
        try {
          confetti({
            particleCount: 90,
            spread: 80,
            origin: { y: 0.6 }
          });
        } catch {
          // ignore: confetti là hiệu ứng phụ — silent fallback
        }
      }

      // Chỉ tới đây — khi DB ĐÃ nhận đơn — mới được coi là thành công.
      // FL-1: giữ khách ở lại để đọc HƯỚNG DẪN THANH TOÁN THỦ CÔNG (số tiền, nội dung CK,
      // thông tin nhận tiền) — màn hình thành công vẫn mở được từ CTA bên dưới.
      onOrderCompleted(savedOrder);
      setCreatedOrder(savedOrder);
    } catch (err: any) {
      // Ghi DB hỏng ⇒ KHÔNG có màn hình thành công, KHÔNG đơn "trên RAM".
      // Hiện nguyên văn lỗi thật để người dùng/người vận hành biết chuyện gì xảy ra.
      setOrderError(
        err?.message || ('Không lưu được đơn hàng vào cơ sở dữ liệu.')
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // FL-1 — màn hình SAU KHI ĐẶT ĐƠN: khối thanh toán thủ công (không tự rời trang).
  // Đặt TRƯỚC guard giỏ rỗng vì `onOrderCompleted` đã clear cart (guard sẽ che mất khối này).
  if (createdOrder) {
    const instructions: PaymentInstructions = manualPaymentProvider.buildInstructions(createdOrder, {
      bankName: transferSettings?.bankName ?? null,
      bankAccount: transferSettings?.bankAccount ?? null,
      accountHolder: transferSettings?.legalName ?? null,
    });
    const payment = createdOrder.payment;
    const copyText = async (field: string, value: string | null) => {
      if (!value) return;
      try {
        await navigator.clipboard?.writeText(value);
        setCopiedPaymentField(field);
        window.setTimeout(() => setCopiedPaymentField(null), 2000);
      } catch {
        /* ignore: clipboard bị trình duyệt chặn — không báo thành công giả, người dùng vẫn copy tay được */
      }
    };

    return (
      <div className="min-h-dvh bg-canvas text-fg py-8 sm:py-12 px-4 sm:px-6 md:px-12">
        <div className="mx-auto max-w-3xl space-y-6">
          <Card variant="soft" padding="lg" className="space-y-6">
            <div className="text-center space-y-2">
              <div className="mx-auto grid size-12 place-items-center rounded-full bg-positive-tint text-positive">
                <Icon name="check_circle" size={24} aria-hidden="true" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-fg">Đã tạo đơn hàng</h1>
              <p className="text-sm text-fg-muted">
                Mã đơn{' '}
                <strong className="font-mono text-fg tabular-nums">{createdOrder.orderNumber}</strong>. Đơn đang ở
                trạng thái <strong className="text-warning">CHỜ THANH TOÁN</strong> — VCUBE xác nhận khoản chuyển
                thủ công trước khi xưởng bắt đầu.
              </p>
            </div>

            {/* Số tiền + hướng dẫn chuyển khoản */}
            <div className="rounded-lg border border-line bg-surface-muted p-4 space-y-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm font-semibold text-fg">Số tiền cần chuyển</span>
                <Money value={instructions.amount} size="heading" className="text-fg" />
              </div>

              {instructions.configured ? (
                <div className="space-y-2 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-fg-muted">Ngân hàng</span>
                    <strong className="text-fg">{instructions.bankName}</strong>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-fg-muted">Số tài khoản</span>
                    <span className="flex items-center gap-2">
                      <strong className="font-mono text-fg tabular-nums">{instructions.bankAccount}</strong>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => void copyText('account', instructions.bankAccount)}
                        leadingIcon={<Icon name={copiedPaymentField === 'account' ? 'check' : 'content_copy'} size={14} />}
                      >
                        {copiedPaymentField === 'account' ? 'Đã chép' : 'Sao chép'}
                      </Button>
                    </span>
                  </div>
                  {instructions.accountHolder && (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-fg-muted">Chủ tài khoản</span>
                      <strong className="text-fg">{instructions.accountHolder}</strong>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line-subtle pt-2">
                    <span className="text-fg-muted">Nội dung chuyển khoản</span>
                    <span className="flex items-center gap-2">
                      <strong className="font-mono text-fg">{instructions.transferContent}</strong>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => void copyText('content', instructions.transferContent)}
                        leadingIcon={<Icon name={copiedPaymentField === 'content' ? 'check' : 'content_copy'} size={14} />}
                      >
                        {copiedPaymentField === 'content' ? 'Đã chép' : 'Sao chép'}
                      </Button>
                    </span>
                  </div>
                </div>
              ) : (
                <div className="rounded-md border border-warning/20 bg-warning-tint p-3 text-sm text-fg-muted">
                  <p className="font-semibold text-warning">Chưa cấu hình thông tin nhận tiền</p>
                  <p className="mt-1 leading-relaxed">
                    VCUBE chưa khai báo ngân hàng / số tài khoản nhận chuyển khoản trong hệ thống. Vui lòng liên hệ
                    VCUBE để nhận thông tin chính xác — không chuyển tiền theo số khác.
                  </p>
                </div>
              )}

              <p className="text-xs leading-relaxed text-fg-muted">
                Đơn chỉ chuyển sang trạng thái <strong>ĐÃ THANH TOÁN</strong> sau khi VCUBE đối soát được khoản chuyển.
                Bạn có thể tra cứu đơn bằng mã đơn {createdOrder.secureAccessToken ? 'kèm mã truy cập bên dưới' : 'trong mục Đơn hàng của tôi'}.
              </p>
            </div>

            {/* Breakdown tiền — giữ nguyên cách tính của checkout */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between gap-3 text-fg-muted">
                <span>Tiền hàng (chưa VAT)</span>
                <Money value={(payment?.subtotalPhysical ?? 0) + (payment?.subtotalDigital ?? 0)} size="base" className="text-fg" />
              </div>
              {(payment?.shippingFee ?? 0) > 0 && (
                <div className="flex justify-between gap-3 text-fg-muted">
                  <span>Phí vận chuyển</span>
                  <Money value={payment.shippingFee} size="base" className="text-fg" />
                </div>
              )}
              {(payment?.discount ?? 0) > 0 && (
                <div className="flex justify-between gap-3 text-positive">
                  <span>Giảm giá</span>
                  <span className="font-mono tabular-nums">
                    − <Money value={payment.discount} size="base" className="text-positive" />
                  </span>
                </div>
              )}
              {(payment?.tax ?? 0) > 0 && (
                <div className="flex justify-between gap-3 text-fg-muted">
                  <span>{vatLabel(payment?.vatRate ?? null)}</span>
                  <Money value={payment.tax} size="base" className="text-fg" />
                </div>
              )}
              <div className="flex items-baseline justify-between gap-3 border-t border-line-subtle pt-2">
                <span className="text-base font-bold text-fg">Tổng thanh toán</span>
                <Money value={payment?.total} size="heading" className="text-fg" />
              </div>
            </div>

            {createdOrder.secureAccessToken && (
              <div className="rounded-md border border-dashed border-line bg-surface-muted p-3 text-sm">
                <span className="text-fg-muted">Mã truy cập tra cứu đơn (lưu lại): </span>
                <code className="font-mono text-fg break-all">{createdOrder.secureAccessToken}</code>
              </div>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                variant="primary"
                size="lg"
                className="w-full sm:flex-1"
                onClick={() => onNavigate('order_tracking', { orderId: createdOrder.id })}
                leadingIcon={<Icon name="sensors" size={18} aria-hidden="true" />}
              >
                Theo dõi đơn hàng
              </Button>
              <Button
                variant="secondary"
                size="lg"
                className="w-full sm:flex-1"
                onClick={() => onNavigate('order_success', { order: createdOrder })}
                leadingIcon={<Icon name="receipt_long" size={18} aria-hidden="true" />}
              >
                Xem đơn &amp; hoá đơn
              </Button>
            </div>
            <p className="text-center text-xs text-fg-subtle">
              Đơn đã được lưu trên hệ thống. Bạn không cần đặt lại.
            </p>
          </Card>
        </div>
      </div>
    );
  }

  // Critical: giỏ rỗng (deep-link hoặc đã xoá ở tab khác) KHÔNG được render form
  // thanh toán rồi tạo đơn 0đ trong DB.
  if (cart.length === 0) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-canvas px-4 py-16 text-fg sm:px-6 sm:py-24">
        {/* A11Y-01: h1 cấp trang DUY NHẤT (sr-only — giữ nguyên layout/density của trang).
            Trước đây /checkout là view duy nhất không có heading cấp 1 (outline bắt đầu ở h2). */}
        <h1 className="sr-only">Thanh Toán</h1>
        <EmptyState
          bordered
          className="w-full max-w-md bg-surface"
          icon={<Icon name="shopping_cart" size={22} />}
          title="Giỏ hàng của bạn đang trống"
          description="Thêm sản phẩm hoặc tệp CAD vào giỏ trước khi thanh toán."
          action={
            <Button variant="primary" size="lg" onClick={() => onNavigate('cart')}>
              Về giỏ hàng
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-canvas text-fg py-6 sm:py-10 px-4 sm:px-6 md:px-12 pb-24 lg:pb-12">
      {/* A11Y-01: h1 cấp trang DUY NHẤT. Đặt NGOÀI container `space-y-*` và dùng `sr-only`
          (absolute) để không đổi layout/density; 3 tiêu đề mục bên dưới vẫn là `h2`. */}
      <h1 className="sr-only">Thanh Toán</h1>
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Step Progress Tracker */}
        <Card variant="soft" padding="md" className="sm:p-5">
          <div className="mx-auto flex max-w-2xl items-center justify-between text-xs">
            {/* Step 1 */}
            <button
              type="button"
              onClick={() => onNavigate('cart')}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 font-medium text-fg-muted transition-colors duration-200 hover:bg-surface-muted hover:text-fg max-md:min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-positive-tint text-xs text-positive">
                <Icon name="check" size={14} aria-hidden="true" />
              </span>
              <span className="hidden sm:inline">01. Giỏ hàng</span>
            </button>

            <div className="h-0.5 w-12 bg-positive sm:w-20"></div>

            {/* Step 2 (Active) */}
            <div className="flex items-center gap-2 font-semibold text-fg">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs tabular-nums text-primary-fg">
                2
              </span>
              <span>02. Thanh toán</span>
            </div>

            <div className="h-0.5 w-12 bg-line sm:w-20"></div>

            {/* Step 3 */}
            <div className="flex items-center gap-2 text-fg-subtle">
              <span className="flex h-6 w-6 items-center justify-center rounded-full border border-line bg-surface-muted text-xs tabular-nums text-fg-muted">
                3
              </span>
              <span className="hidden sm:inline">03. Hoàn tất & In 3D</span>
            </div>
          </div>
        </Card>

        {/* Account Authentication Banner */}
        {isLoggedIn ? (
          <Card variant="soft" padding="md" className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary-tint text-fg">
                <Icon name="verified_user" size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold text-fg">
                  {`Tài khoản đặt hàng: ${profile?.displayName || user?.email}`}
                </p>
                <p className="text-xs text-fg-subtle">
                  Đơn hàng sẽ tự động lưu vào kho lưu trữ số và cấp quyền theo dõi tiến độ in 3D.
                </p>
              </div>
            </div>
            <span className="rounded-full border border-line bg-surface-muted px-2.5 py-1 font-mono text-xs font-medium uppercase text-fg-muted">
              {ROLE_LABEL[profile?.role ?? 'customer'] ?? 'Khách hàng'}
            </span>
          </Card>
        ) : (
          <Card variant="soft" padding="md" className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary-tint text-fg">
                <Icon name="bolt" size={20} />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-fg">
                    Chế độ đặt hàng khách vãng lai
                  </p>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-info/20 bg-info-tint px-2.5 py-1 text-xs font-medium text-info">
                    Không Cần Mật Khẩu
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-fg-muted">
                  {'Bạn có thể đặt in trực tiếp bằng SĐT & Địa chỉ. Hệ thống cấp một mã truy cập riêng để bạn tra cứu trạng thái đơn hàng.'}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Link
                to="/auth/login?redirectTo=/checkout"
                className="inline-flex items-center gap-1.5 rounded-md border border-line-control bg-surface px-3.5 py-2 text-sm font-medium text-fg transition-colors duration-200 hover:border-fg-subtle hover:bg-surface-muted max-md:min-h-11"
              >
                <Icon name="login" size={16} />
                <span>Đăng nhập nếu có tài khoản</span>
              </Link>
            </div>
          </Card>
        )}

        {/* Checkout Main Form */}
        <form onSubmit={handleCompleteOrder} className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left Column: Form Fields */}
          <div className="space-y-6 lg:col-span-8">
            {/* 1. Delivery & Contact Details */}
            <Card as="section" variant="soft" padding="lg" className="space-y-6">
              <h2 className="flex items-center gap-2 border-b border-line-subtle pb-4 text-lg font-bold tracking-tight text-fg">
                <Icon name="local_shipping" size={18} className="shrink-0 text-fg-muted" />
                <span>1. Thông Tin Nhận Hàng & Lệnh Chế Tác</span>
              </h2>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field id="checkout-full-name" label="Họ và tên người nhận" required>
                  {(control) => (
                    <Input
                      {...control}
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  )}
                </Field>

                <Field id="checkout-phone" label="Số điện thoại nhận hàng" required>
                  {(control) => (
                    <Input
                      {...control}
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  )}
                </Field>

                <Field id="checkout-email" label="Email nhận tệp CAD & hoá đơn VAT" required className="sm:col-span-2">
                  {(control) => (
                    <Input
                      {...control}
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  )}
                </Field>

                <Field id="checkout-city" label="Tỉnh / Thành phố" required>
                  {(control) => (
                    <Select
                      {...control}
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    >
                      <option value="" disabled>Chọn Tỉnh / Thành phố…</option>
                      <option value="Hà Nội">Hà Nội (đầu mối miền Bắc)</option>
                      <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh (đầu mối miền Nam)</option>
                      <option value="Đà Nẵng">Đà Nẵng (đầu mối miền Trung)</option>
                      <option value="Hải Phòng">Hải Phòng</option>
                      <option value="Bình Dương">Bình Dương</option>
                      <option value="Đồng Nai">Đồng Nai</option>
                      <option value="Cần Thơ">Cần Thơ</option>
                      <option value="Tỉnh Thành Khác">Tỉnh Thành Khác</option>
                    </Select>
                  )}
                </Field>

                <Field id="checkout-district" label="Quận / Huyện / Khu Công Nghệ" required>
                  {(control) => (
                    <Input
                      {...control}
                      type="text"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                    />
                  )}
                </Field>

                <Field id="checkout-address" label="Địa chỉ chi tiết (Số nhà, tòa nhà, phòng Lab)" required className="sm:col-span-2">
                  {(control) => (
                    <Input
                      {...control}
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  )}
                </Field>

                <Field id="checkout-note" label="Ghi chú kỹ thuật dung sai cho kỹ sư vận hành xưởng" optionalLabel={null} className="sm:col-span-2">
                  {(control) => (
                    <textarea
                      {...control}
                      rows={2}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="min-h-20 w-full rounded-md border border-line-control bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-subtle transition-colors duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring aria-invalid:border-danger"
                    />
                  )}
                </Field>
              </div>
            </Card>

            {/* 2. Payment Method Selection */}
            <Card as="section" variant="soft" padding="lg" className="space-y-5">
              <h2 className="flex items-center gap-2 border-b border-line-subtle pb-4 text-lg font-bold tracking-tight text-fg">
                <Icon name="payments" size={18} className="shrink-0 text-fg-muted" />
                <span>2. Phương Thức Thanh Toán</span>
              </h2>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {/* Method 1: VietQR */}
                <label
                  htmlFor="checkout-payment-vietqr"
                  onClick={() => setPaymentMethod('vietqr')}
                  className={`flex cursor-pointer flex-col justify-between gap-2 rounded-md border p-3 transition-colors duration-200 ${
                    paymentMethod === 'vietqr'
                      ? 'border-primary bg-surface ring-2 ring-ring/20'
                      : 'border-line bg-surface-muted hover:border-fg-subtle'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Icon name="qr_code_2" size={20} className="text-fg-muted" />
                    <input
                      id="checkout-payment-vietqr"
                      type="radio"
                      name="payment"
                      checked={paymentMethod === 'vietqr'}
                      onChange={() => setPaymentMethod('vietqr')}
                      className="accent-primary"
                    />
                  </div>
                  <div>
                    <strong className="block text-sm font-semibold text-fg">VietQR Ngân Hàng</strong>
                    <span className="text-xs text-fg-muted">Chuyển khoản — VCUBE đối soát thủ công</span>
                  </div>
                </label>

                {/* Method 2: VNPAY */}
                <label
                  htmlFor="checkout-payment-vnpay"
                  onClick={() => setPaymentMethod('vnpay')}
                  className={`flex cursor-pointer flex-col justify-between gap-2 rounded-md border p-3 transition-colors duration-200 ${
                    paymentMethod === 'vnpay'
                      ? 'border-primary bg-surface ring-2 ring-ring/20'
                      : 'border-line bg-surface-muted hover:border-fg-subtle'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Icon name="account_balance_wallet" size={20} className="text-fg-muted" />
                    <input
                      id="checkout-payment-vnpay"
                      type="radio"
                      name="payment"
                      checked={paymentMethod === 'vnpay'}
                      onChange={() => setPaymentMethod('vnpay')}
                      className="accent-primary"
                    />
                  </div>
                  <div>
                    <strong className="block text-sm font-semibold text-fg">Cổng VNPAY QR</strong>
                    <span className="text-xs text-fg-muted">Chưa kết nối cổng — xác nhận thủ công</span>
                  </div>
                </label>

                {/* Method 3: COD */}
                <label
                  htmlFor="checkout-payment-cod"
                  onClick={() => physicalItems.length > 0 && setPaymentMethod('cod')}
                  className={`flex flex-col justify-between gap-2 rounded-md border p-3 transition-colors duration-200 ${
                    physicalItems.length === 0
                      ? 'cursor-not-allowed border-line bg-surface-muted opacity-40'
                      : paymentMethod === 'cod'
                      ? 'cursor-pointer border-primary bg-surface ring-2 ring-ring/20'
                      : 'cursor-pointer border-line bg-surface-muted hover:border-fg-subtle'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Icon name="handshake" size={20} className="text-fg-muted" />
                    <input
                      id="checkout-payment-cod"
                      type="radio"
                      name="payment"
                      disabled={physicalItems.length === 0}
                      checked={paymentMethod === 'cod'}
                      onChange={() => setPaymentMethod('cod')}
                      className="accent-primary"
                    />
                  </div>
                  <div>
                    <strong className="block text-sm font-semibold text-fg">Thanh toán khi nhận hàng</strong>
                    <span className="text-xs text-fg-muted">
                      {physicalItems.length === 0 ? 'Chỉ áp dụng hàng in 3D' : 'Nhận hàng & kiểm tra QC'}
                    </span>
                  </div>
                </label>
              </div>

              {/* VietQR Instructions Box */}
              {paymentMethod === 'vietqr' && (
                <div className="space-y-3 rounded-lg border border-line-subtle bg-surface-muted p-4 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 font-semibold text-fg">
                    <span>Thông Tin Chuyển Khoản:</span>
                    {/* PC-03: không được quảng cáo "Tự động duyệt" khi chưa có cổng thanh toán. */}
                    <span className="rounded-full border border-warning/20 bg-warning-tint px-2.5 py-1 text-xs font-medium text-warning">
                      Thanh toán mô phỏng — xác nhận thủ công
                    </span>
                  </div>
                  {hasTransferInfo ? (
                    <div className="grid grid-cols-1 gap-2 text-xs text-fg-muted sm:grid-cols-2">
                      {bankName && (
                        <div>Ngân hàng: <strong className="font-semibold text-fg">{bankName}</strong></div>
                      )}
                      {bankAccount && (
                        <div>Số tài khoản: <strong className="font-mono font-semibold text-fg">{bankAccount}</strong></div>
                      )}
                      {accountHolder && (
                        <div>Chủ tài khoản: <strong className="font-semibold text-fg">{accountHolder}</strong></div>
                      )}
                      <div className="font-mono tabular-nums">
                        Số tiền: <Money as="strong" value={totalAmount} size="base" className="font-mono font-semibold text-fg" />
                      </div>
                      <div className="sm:col-span-2">
                        Nội dung chuyển khoản: <strong className="font-mono font-semibold text-warning">VCUBE {phone.replace(/\s/g, '') || '<SĐT>'}</strong>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 rounded-md border border-warning/20 bg-warning-tint p-3 text-xs text-fg-muted">
                      <p className="font-semibold text-warning">
                        Chưa cấu hình thông tin chuyển khoản — liên hệ VCUBE
                      </p>
                      <p className="leading-relaxed">
                        VCUBE chưa khai báo ngân hàng, số tài khoản và tên pháp nhân nhận chuyển khoản. Vui lòng liên hệ VCUBE để nhận thông tin chính xác trước khi chuyển khoản.
                      </p>
                      {canConfigureTransferInfo && (
                        <Link
                          to="/admin"
                          className="inline-flex items-center gap-1.5 font-semibold text-fg hover:underline max-md:min-h-11"
                        >
                          <Icon name="settings" size={16} />
                          <span>{'Cấu hình ngay (Cấu hình → Pháp lý & Định danh)'}</span>
                        </Link>
                      )}
                    </div>
                  )}
                  <p className="pt-1 leading-relaxed text-fg-muted">
                    Đơn hàng sẽ ở trạng thái CHỜ THANH TOÁN cho tới khi VCUBE đối soát được khoản chuyển. Xưởng chỉ bắt đầu in sau khi thanh toán được xác nhận.
                  </p>
                </div>
              )}
            </Card>

            {/* 3. Electronic VAT Invoice Toggle */}
            <Card as="section" variant="soft" padding="lg" className="space-y-4">
              <label htmlFor="checkout-needs-vat-invoice" className="flex min-h-11 cursor-pointer select-none items-center gap-3">
                <input
                  id="checkout-needs-vat-invoice"
                  type="checkbox"
                  checked={needsVatInvoice}
                  onChange={(e) => setNeedsVatInvoice(e.target.checked)}
                  className="size-4 shrink-0 rounded-sm text-primary accent-primary"
                />
                <span className="text-sm font-medium text-fg">
                  {vat
                    ? `Yêu cầu xuất hóa đơn điện tử ${vatLabel(vat.rate)} cho Doanh nghiệp / Dự án`
                    : 'Yêu cầu xuất hóa đơn điện tử cho Doanh nghiệp / Dự án (VAT chưa được cấu hình)'}
                </span>
              </label>

              {needsVatInvoice && (
                <div className="grid grid-cols-1 gap-4 rounded-lg border border-line-subtle bg-surface-muted p-4 sm:grid-cols-2">
                  <Field id="checkout-vat-company-name" label="Tên doanh nghiệp / Đơn vị" required>
                    {(control) => (
                      <Input
                        {...control}
                        type="text"
                        placeholder="CÔNG TY TNHH CÔNG NGHỆ..."
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                      />
                    )}
                  </Field>
                  <Field id="checkout-vat-tax-code" label="Mã số thuế" required>
                    {(control) => (
                      <Input
                        {...control}
                        type="text"
                        placeholder="Nhập mã số thuế"
                        value={taxId}
                        onChange={(e) => setTaxId(e.target.value)}
                      />
                    )}
                  </Field>
                  <Field id="checkout-vat-address" label="Địa chỉ đăng ký kinh doanh" required className="sm:col-span-2">
                    {(control) => (
                      <Input
                        {...control}
                        type="text"
                        placeholder="Tầng 5, Tòa nhà Sáng Tạo, Cầu Giấy, Hà Nội"
                        value={companyAddress}
                        onChange={(e) => setCompanyAddress(e.target.value)}
                      />
                    )}
                  </Field>
                </div>
              )}
            </Card>
          </div>

          {/* Right Column: Order Manifest Sidebar */}
          <div className="space-y-6 lg:col-span-4">
            <Card variant="soft" padding="lg" className="space-y-6 lg:sticky lg:top-24">
              <div className="flex items-center justify-between gap-3 border-b border-line-subtle pb-4">
                <h2 className="text-lg font-bold tracking-tight text-fg">
                  Đơn Hàng ({cart.length} mục)
                </h2>
                <button
                  type="button"
                  onClick={() => onNavigate('cart')}
                  className="inline-flex items-center rounded-md px-2 py-2 text-sm font-medium text-fg-muted transition-colors duration-200 hover:bg-surface-muted hover:text-fg max-md:min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Sửa giỏ hàng
                </button>
              </div>

              {/* Items Mini-list */}
              <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 rounded-md border border-line-subtle p-2 text-xs">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-12 w-12 shrink-0 rounded-md border border-line-subtle bg-surface-muted object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-fg">{item.name}</p>
                      <p className="text-xs text-fg-subtle">
                        {item.type === 'digital' ? 'Bản quyền CAD' : `${item.material} • SL: ${item.quantity}`}
                      </p>
                    </div>
                    <Money value={item.price * item.quantity} size="base" className="shrink-0 font-mono font-semibold tabular-nums text-right text-fg" />
                  </div>
                ))}
              </div>

              {/* Price Calculation */}
              <div className="space-y-3 border-t border-line-subtle pt-4 text-sm text-fg-muted">
                <div className="flex justify-between gap-4 text-sm">
                  <span>Tạm tính sản phẩm:</span>
                  <Money value={subtotal} size="base" className="font-mono font-semibold tabular-nums text-right text-fg" />
                </div>

                <div className="flex justify-between gap-4 text-sm">
                  <span>Phí vận chuyển:</span>
                  <span className={`text-right font-mono tabular-nums ${shippingFee === 0 ? 'font-semibold text-positive' : 'font-semibold text-fg'}`}>
                    {shippingFee === 0 ? 'Miễn phí' : (
                      <Money value={shippingFee} size="base" className="font-mono font-semibold tabular-nums" />
                    )}
                  </span>
                </div>

                {appliedDiscount > 0 && (
                  <div className="flex justify-between gap-4 text-sm font-semibold text-positive">
                    <span>Mã ưu đãi đã áp dụng:</span>
                    <span className="text-right font-mono tabular-nums">- <Money value={appliedDiscount} size="base" className="font-mono text-positive" /></span>
                  </div>
                )}

                {vat ? (
                  <div className="flex justify-between gap-4 text-sm">
                    <span>{vatLabel(vat.rate)}:</span>
                    <Money value={vat.amount} size="base" className="font-mono font-semibold tabular-nums text-right text-fg" />
                  </div>
                ) : pricingError ? (
                  <p className="text-xs leading-relaxed text-danger">
                    {`Không đọc được cấu hình VAT: ${pricingError}`}
                  </p>
                ) : vatPending ? (
                  <p className="text-xs leading-relaxed text-fg-subtle">
                    Đang đọc cấu hình VAT…
                  </p>
                ) : (
                  <p className="text-xs leading-relaxed text-fg-subtle">{vatNotConfiguredLabel()}</p>
                )}

                <div className="flex items-baseline justify-between gap-4 border-t border-line-subtle pt-4">
                  <span className="text-lg font-bold text-fg">Tổng thanh toán:</span>
                  <div className="text-right">
                    <Money value={totalAmount} size="heading" className="block font-mono tabular-nums text-right text-fg" />
                    <span className="block text-xs text-fg-subtle">
                      {vatTotalNote(vatRate)}
                    </span>
                  </div>
                </div>
              </div>

              {/* B1 — ghi DB hỏng thì KHÔNG có màn hình thành công; lỗi thật hiện ở đây. */}
              {orderError && (
                <div
                  role="alert"
                  className="space-y-1 rounded-md border border-danger/20 bg-danger-tint p-3 text-sm text-danger"
                >
                  <p className="flex items-center gap-1.5 font-semibold">
                    <Icon name="error" size={16} className="shrink-0" />
                    <span>ĐƠN HÀNG CHƯA ĐƯỢC TẠO</span>
                  </p>
                  <p className="text-xs leading-relaxed">
                    Hệ thống chưa ghi được đơn vào cơ sở dữ liệu, nên đơn CHƯA tồn tại. Chi tiết lỗi:
                  </p>
                  <p className="break-words text-xs">{orderError}</p>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={isProcessing}
                loadingLabel="ĐANG KHỞI TẠO ĐƠN HÀNG..."
              >
                <span>XÁC NHẬN &amp; TẠO ĐƠN HÀNG</span>
              </Button>

              <p className="text-xs text-center leading-snug text-fg-subtle">
                Bằng việc xác nhận đặt hàng, bạn đồng ý với Điều khoản Chế tác & Bản quyền thương mại của VCUBE.
              </p>
            </Card>
          </div>
        </form>
      </div>
    </div>
  );
};
