/**
 * Unit test — FL-1 `orderMoney` + adapter thanh toán thủ công.
 *
 * Vì sao quan trọng: đây là TIỀN của 3 bên (nền tảng / xưởng / designer). Công thức đã chốt ở
 * `20260901_baseline_schema.sql` §3b; test khoá lại từng con số + quy tắc "thiếu cấu hình ⇒
 * NULL, KHÔNG bịa 0" (`docs/design/data-honesty.md`).
 */
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildOrderItemRows,
  computeOrderMoney,
  isOrderAlreadyConfirmed,
  manualPaymentRowId,
  manualPaymentTransactionId,
} from '../../src/backend/services/orderMoney';
import type { OrderMoneyConfig } from '../../src/backend/services/orderMoney';
import { buildManualPaymentRow, ManualPaymentProvider } from '../../src/backend/integrations/paymentProvider';
import type { Order } from '../../src/types';

const fullConfig = (over: Partial<OrderMoneyConfig> = {}): OrderMoneyConfig => ({
  vatPercent: 8,
  marketplaceFeePercent: 8,
  marketplaceFixedFeeVnd: 5000,
  workshopCommissionPercent: 8,
  defaultDesignerRoyaltyPercent: 10,
  designerRoyaltyByName: {},
  ...over,
});

const emptyConfig = (): OrderMoneyConfig => ({
  vatPercent: null,
  marketplaceFeePercent: null,
  marketplaceFixedFeeVnd: null,
  workshopCommissionPercent: null,
  defaultDesignerRoyaltyPercent: null,
  designerRoyaltyByName: {},
});

describe('orderMoney — đơn chỉ có hàng IN', () => {
  test('phí nền tảng trên subtotal, payout xưởng + shipping, không royalty', () => {
    const money = computeOrderMoney({
      items: [
        { productId: 'p1', type: 'physical', unitPrice: 250000, quantity: 2 }, // 500.000
        { productId: 'p2', type: 'physical', unitPrice: 100000, quantity: 1 }, // 100.000
      ],
      shippingFee: 30000,
      config: fullConfig(),
    });

    assert.equal(money.subtotalAmount, 600000);
    assert.equal(money.vatPercentSnapshot, 8);
    assert.equal(money.vatAmount, 48000); // 8% × 600.000 (KHÔNG gồm ship)
    assert.equal(money.platformFeePercentSnapshot, 8);
    assert.equal(money.platformFeeAmount, 48000 + 5000); // tổng phí dòng + phí cố định
    // 600.000 − 48.000 + 30.000 = 582.000
    assert.equal(money.workshopPayoutAmount, 582000);
    assert.equal(money.designerPayoutAmount, null, 'đơn không có file số ⇒ payout designer NULL, không phải 0');
    assert.equal(money.items[0].workshopPayoutAmount, 460000); // 500.000 − 40.000
    assert.equal(money.items[1].workshopPayoutAmount, 92000); // 100.000 − 8.000
    assert.deepEqual(money.missingConfig, []);
    assert.equal(money.items[0].fulfillment, 'print');
    assert.equal(money.items[0].designerPayoutAmount, null);
  });

  test('làm tròn về đồng (round half up) ở cấp dòng', () => {
    const money = computeOrderMoney({
      items: [{ productId: 'p1', type: 'physical', unitPrice: 33333, quantity: 3 }], // 99.999
      shippingFee: 0,
      config: fullConfig({ workshopCommissionPercent: 8, marketplaceFixedFeeVnd: null }),
    });
    // 99.999 × 8% = 7.999,92 ⇒ 8.000; payout = 91.999
    assert.equal(money.items[0].lineTotal, 99999);
    assert.equal(money.items[0].platformFeeAmount, 8000);
    assert.equal(money.items[0].workshopPayoutAmount, 91999);
    assert.equal(money.platformFeeAmount, 8000); // fixed null ⇒ coalesce 0 theo công thức
  });
});

describe('orderMoney — đơn TRỘN hàng in + file số', () => {
  test('tách phí/payout đúng từng dòng; % cấp đơn = NULL khi trộn 2 tỉ lệ', () => {
    const money = computeOrderMoney({
      items: [
        { productId: 'print-1', type: 'physical', unitPrice: 500000, quantity: 1 }, // 500.000
        { productId: 'file-1', type: 'digital', unitPrice: 200000, quantity: 1, designerName: 'Tác giả A' },
      ],
      shippingFee: 30000,
      assignedWorkshopId: 'ws-1',
      config: fullConfig({
        workshopCommissionPercent: 10, // xưởng ăn 10%
        marketplaceFeePercent: 8, // file số chịu 8%
        marketplaceFixedFeeVnd: null,
        designerRoyaltyByName: { 'Tác giả A': 12 },
        defaultDesignerRoyaltyPercent: 10,
      }),
      recordedVatAmount: 56000,
      recordedVatRate: 0.08,
      metaByProductId: { 'file-1': { sellerType: 'designer', designerId: 'user-a' } },
    });

    assert.equal(money.subtotalAmount, 700000);
    assert.equal(money.vatAmount, 56000); // số đã ghi trên đơn được ưu tiên
    assert.equal(money.vatPercentSnapshot, 8);

    // Dòng in: 10% × 500.000 = 50.000; payout xưởng dòng = 450.000
    assert.equal(money.items[0].workshopCommissionPercentSnapshot, 10);
    assert.equal(money.items[0].platformFeeAmount, 50000);
    assert.equal(money.items[0].workshopPayoutAmount, 450000);
    assert.equal(money.items[0].workshopId, 'ws-1');

    // Dòng file số: 8% × 200.000 = 16.000; royalty 12% × 200.000 = 24.000
    assert.equal(money.items[1].royaltyPercentSnapshot, 12);
    assert.equal(money.items[1].platformFeeAmount, 16000);
    assert.equal(money.items[1].designerPayoutAmount, 24000);
    assert.equal(money.items[1].sellerType, 'designer');
    assert.equal(money.items[1].designerId, 'user-a');

    // Cấp đơn: tổng phí dòng; payout xưởng = 450.000 + ship 30.000; designer = 24.000
    assert.equal(money.platformFeeAmount, 66000);
    assert.equal(money.platformFeePercentSnapshot, null, 'trộn 2 tỉ lệ ⇒ cấp đơn NULL, dòng giữ số');
    assert.equal(money.workshopPayoutAmount, 480000);
    assert.equal(money.designerPayoutAmount, 24000);
    assert.deepEqual(money.missingConfig, []);
  });
});

describe('orderMoney — thiếu cấu hình ⇒ NULL (KHÔNG bịa 0)', () => {
  test('config rỗng: phí nền tảng/payout xưởng/VAT = null; royalty profile vẫn dùng được', () => {
    const money = computeOrderMoney({
      items: [
        { productId: 'print-1', type: 'physical', unitPrice: 500000, quantity: 1 },
        { productId: 'file-1', type: 'digital', unitPrice: 200000, quantity: 1, designerName: 'Tác giả A' },
      ],
      shippingFee: 30000,
      assignedWorkshopId: 'ws-1',
      config: { ...emptyConfig(), designerRoyaltyByName: { 'Tác giả A': 12 } },
    });

    assert.equal(money.subtotalAmount, 700000);
    assert.equal(money.vatPercentSnapshot, null);
    assert.equal(money.vatAmount, null);
    assert.equal(money.platformFeeAmount, null);
    assert.equal(money.platformFeePercentSnapshot, null);
    assert.equal(money.workshopPayoutAmount, null);
    assert.equal(money.items[0].platformFeeAmount, null);
    assert.equal(money.items[0].workshopPayoutAmount, null);
    assert.equal(money.items[1].platformFeeAmount, null);
    // Royalty đọc từ hồ sơ designer là dữ liệu THẬT ⇒ vẫn tính được dù config rỗng.
    assert.equal(money.items[1].designerPayoutAmount, 24000);
    assert.equal(money.designerPayoutAmount, 24000);

    assert.ok(money.missingConfig.includes('workshop_commission_percent'));
    assert.ok(money.missingConfig.includes('marketplace_fee_percent'));
    assert.ok(money.missingConfig.includes('vat_percent'));
    assert.ok(!money.missingConfig.includes('designer_royalty_percent'));
  });

  test('digital-only, không có royalty ⇒ payout designer = NULL; payout xưởng = NULL', () => {
    const money = computeOrderMoney({
      items: [{ productId: 'file-1', type: 'digital', unitPrice: 150000, quantity: 1 }],
      shippingFee: 0,
      config: fullConfig({ defaultDesignerRoyaltyPercent: null, designerRoyaltyByName: {} }),
    });
    assert.equal(money.items[0].designerPayoutAmount, null);
    assert.equal(money.designerPayoutAmount, null);
    assert.equal(money.workshopPayoutAmount, null, 'đơn không có dòng in ⇒ payout xưởng NULL');
    assert.ok(money.missingConfig.includes('designer_royalty_percent'));
  });
});

describe('orderMoney — idempotency & payload builders', () => {
  test('phát hiện đơn đã xác nhận theo payment_status / transaction / order_items', () => {
    assert.equal(isOrderAlreadyConfirmed({}), false);
    assert.equal(isOrderAlreadyConfirmed({ paymentStatus: 'paid' }), true);
    assert.equal(isOrderAlreadyConfirmed({ isPaid: true }), true);
    assert.equal(isOrderAlreadyConfirmed({ paymentTransactions: [{ status: 'paid' }] }), true);
    assert.equal(isOrderAlreadyConfirmed({ paymentTransactions: [{ status: 'pending' }] }), false);
    assert.equal(isOrderAlreadyConfirmed({ orderItems: [{ id: 'x' }] }), true);
  });

  test('transaction id theo đơn là XÁC ĐỊNH (UNIQUE ⇒ chống ghi trùng)', () => {
    assert.equal(manualPaymentTransactionId('VCB-1'), 'manual_VCB-1');
    assert.equal(manualPaymentRowId('VCB-1'), 'pay_VCB-1');
    assert.equal(manualPaymentTransactionId('VCB-1'), manualPaymentTransactionId('VCB-1'));
  });

  test('buildOrderItemRows map đúng cột DB từ snapshot đã tính', () => {
    const money = computeOrderMoney({
      items: [
        { productId: 'print-1', type: 'physical', unitPrice: 500000, quantity: 1 },
        { productId: 'file-1', type: 'digital', unitPrice: 200000, quantity: 2, designerName: 'A' },
      ],
      shippingFee: 0,
      config: fullConfig({
        workshopCommissionPercent: 10,
        marketplaceFeePercent: 8,
        marketplaceFixedFeeVnd: null,
        designerRoyaltyByName: { A: 12 },
      }),
    });
    const rows = buildOrderItemRows('VCB-1', money, () => 'row-id');
    assert.equal(rows.length, 2);
    assert.equal(rows[0].order_id, 'VCB-1');
    assert.equal(rows[0].seller_type, 'platform');
    assert.equal(rows[0].fulfillment, 'print');
    assert.equal(rows[0].platform_fee_amount, 50000);
    assert.equal(rows[1].seller_type, 'designer');
    assert.equal(rows[1].fulfillment, 'digital');
    assert.equal(rows[1].line_total, 400000);
    assert.equal(rows[1].royalty_percent_snapshot, 12);
    assert.equal(rows[1].designer_payout_amount, 48000);
  });

  test('buildManualPaymentRow: status paid + transaction_id duy nhất theo đơn', () => {
    const row = buildManualPaymentRow({ orderId: 'VCB-9', amount: 123000, note: 'đã nhận', actorId: 'admin-1' });
    assert.equal(row.id, 'pay_VCB-9');
    assert.equal(row.order_id, 'VCB-9');
    assert.equal(row.transaction_id, 'manual_VCB-9');
    assert.equal(row.amount, 123000);
    assert.equal(row.status, 'paid');
    assert.equal((row.payload as Record<string, unknown>).actor_id, 'admin-1');
  });
});

/** Đơn tối thiểu để test `buildInstructions` (không đụng DB). */
const orderFixture = (over: Partial<Order['payment']> = {}): Order =>
  ({
    id: 'VCB-1',
    orderNumber: '#VCUBE-1234',
    date: '2026-10-23T00:00:00.000Z',
    estimatedDelivery: '',
    status: 'pending_payment',
    statusStageIndex: 0,
    items: [],
    shippingAddress: { fullName: 'A', phone: '0900', address: '', city: '', district: '' },
    carrier: { name: '', trackingCode: '' },
    payment: {
      method: 'VietQR Chuyển Khoản',
      paidDate: '',
      subtotalPhysical: 0,
      subtotalDigital: 0,
      shippingFee: 0,
      discount: 0,
      tax: 0,
      total: 250000,
      isPaid: false,
      status: 'awaiting_payment',
      ...over,
    },
  }) as Order;

describe('ManualPaymentProvider — hướng dẫn thanh toán', () => {
  const provider = new ManualPaymentProvider();

  test('đủ cấu hình ⇒ hướng dẫn có số tiền + nội dung CK = mã đơn', () => {
    const info = provider.buildInstructions(orderFixture(), {
      bankName: 'Vietcombank',
      bankAccount: '0123456789',
      accountHolder: 'CONG TY VCUBE',
    });
    assert.equal(info.configured, true);
    assert.equal(info.amount, 250000);
    assert.equal(info.transferContent, '#VCUBE-1234');
    assert.ok(info.lines.some((l) => l.includes('Vietcombank')));
    assert.ok(info.lines.some((l) => l.includes('#VCUBE-1234')));
  });

  test('thiếu cấu hình ⇒ configured=false, KHÔNG bịa số tài khoản', () => {
    const info = provider.buildInstructions(orderFixture(), {
      bankName: null,
      bankAccount: '',
      accountHolder: null,
    });
    assert.equal(info.configured, false);
    assert.equal(info.bankName, null);
    assert.equal(info.bankAccount, null);
    assert.ok(info.lines[0].includes('Chưa cấu hình'));
  });
});
