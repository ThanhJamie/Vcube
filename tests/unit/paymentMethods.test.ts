/**
 * Unit test — UX-05 payment method honesty (`src/frontend/lib/paymentMethods.ts`).
 *
 * Vì sao quan trọng: VNPAY chưa được kết nối nhưng UI cũ vẫn cho chọn và tạo đơn như thể
 * thanh toán online đã bật. Helper này chốt: VNPAY KHÔNG BAO GIỜ chọn được; COD cần hàng in;
 * thiếu `app_settings` thì nêu đúng trường còn thiếu (không bịa thông tin nhận tiền).
 */
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import {
  getPaymentMethodAvailability,
  getTransferInfoReadiness,
  isPaymentMethodSelectable,
  resolveSelectablePaymentMethod,
  VNPAY_NOT_CONNECTED_REASON,
} from '../../src/frontend/lib/paymentMethods';

const physical = { hasPhysicalItems: true };
const digitalOnly = { hasPhysicalItems: false };

describe('paymentMethods — VNPAY chưa kết nối', () => {
  test('VNPAY không chọn được ở mọi giỏ hàng + nêu lý do', () => {
    for (const context of [physical, digitalOnly]) {
      assert.equal(isPaymentMethodSelectable('vnpay', context), false);
      assert.equal(getPaymentMethodAvailability('vnpay', context).reason, VNPAY_NOT_CONNECTED_REASON);
    }
  });

  test('lựa chọn VNPAY (nếu có) luôn quy về VietQR — không tạo đơn mang tên VNPAY', () => {
    assert.equal(resolveSelectablePaymentMethod('vnpay', physical), 'vietqr');
  });
});

describe('paymentMethods — COD/VietQR theo loại giỏ', () => {
  test('COD chỉ khi có hàng in 3D; giỏ chỉ có tệp số ⇒ quy về VietQR', () => {
    assert.equal(isPaymentMethodSelectable('cod', physical), true);
    assert.equal(isPaymentMethodSelectable('cod', digitalOnly), false);
    assert.equal(resolveSelectablePaymentMethod('cod', digitalOnly), 'vietqr');
    assert.equal(resolveSelectablePaymentMethod('cod', physical), 'cod');
  });

  test('VietQR luôn khả dụng (đơn tạo ở trạng thái chờ thanh toán thủ công)', () => {
    assert.equal(isPaymentMethodSelectable('vietqr', physical), true);
    assert.equal(isPaymentMethodSelectable('vietqr', digitalOnly), true);
    assert.equal(resolveSelectablePaymentMethod('vietqr', digitalOnly), 'vietqr');
  });
});

describe('paymentMethods — readiness thông tin nhận tiền', () => {
  test('app_settings trống ⇒ chưa cấu hình + liệt kê đủ 3 trường thiếu', () => {
    const readiness = getTransferInfoReadiness({ bankName: '', bankAccount: null, accountHolder: '  ' });
    assert.equal(readiness.configured, false);
    assert.deepEqual(readiness.missing, ['bankName', 'bankAccount', 'accountHolder']);
  });

  test('P2-3: thiếu tên pháp nhân nhưng có ngân hàng + số TK ⇒ VẪN configured (2/3)', () => {
    const readiness = getTransferInfoReadiness({
      bankName: 'Vietcombank',
      bankAccount: '0123456789',
      accountHolder: '',
    });
    assert.equal(readiness.configured, true);
    assert.deepEqual(readiness.missing, ['accountHolder']);
  });

  test('chỉ có ngân hàng, thiếu số TK ⇒ chưa configured (không chuyển được)', () => {
    const readiness = getTransferInfoReadiness({
      bankName: 'Vietcombank',
      bankAccount: '   ',
      accountHolder: 'CÔNG TY VCUBE',
    });
    assert.equal(readiness.configured, false);
    assert.deepEqual(readiness.missing, ['bankAccount']);
  });

  test('đủ cả ba ⇒ configured', () => {
    const readiness = getTransferInfoReadiness({
      bankName: 'Vietcombank',
      bankAccount: '0123456789',
      accountHolder: 'CÔNG TY VCUBE',
    });
    assert.equal(readiness.configured, true);
    assert.deepEqual(readiness.missing, []);
  });
});
