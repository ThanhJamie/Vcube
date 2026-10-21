/**
 * Unit test — validator thuần trong `src/backend/services/settingsService.ts`
 *
 * Vì sao quan trọng: đây là lớp chặn cuối trước khi ghi `app_settings` / `pricing_global_settings`.
 * Luật data-honesty: chuỗi rỗng/NULL = **CHƯA CẤU HÌNH** ⇒ hợp lệ (không được ép thành 0),
 * nhưng giá trị đã nhập phải đúng định dạng/ngưỡng (VAT 0–20, phí nền tảng 0–30, ...).
 */
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import {
  MARKETPLACE_FEE_MAX_PERCENT,
  MARKETPLACE_FEE_MIN_PERCENT,
  VAT_MAX_PERCENT,
  VAT_MIN_PERCENT,
  isValidBankAccount,
  isValidEmail,
  isValidHotline,
  isValidMarketplaceFeePercent,
  isValidShippingFee,
  isValidTaxCode,
  isValidVatPercent,
  validatePatch,
  validateSetting,
} from '../../src/backend/services/settingsService';

describe('settings validators — giá trị trống = "chưa cấu hình" luôn hợp lệ', () => {
  test('null/undefined/chuỗi rỗng hợp lệ với MỌI validator (không phải 0)', () => {
    // Vì sao: "chưa cấu hình" là trạng thái hợp lệ; nếu validator đỏ ở đây admin không thể lưu
    // các ô còn lại của cùng form (một ô trống chặn cả patch).
    for (const validate of [isValidTaxCode, isValidEmail, isValidHotline, isValidBankAccount]) {
      assert.equal(validate(null), true);
      assert.equal(validate(undefined), true);
      assert.equal(validate(''), true);
      assert.equal(validate('   '), true);
    }
    for (const validate of [isValidVatPercent, isValidMarketplaceFeePercent, isValidShippingFee]) {
      assert.equal(validate(null), true);
      assert.equal(validate(undefined), true);
      assert.equal(validate(''), true);
    }
  });
});

describe('settings validators — mã số thuế VN', () => {
  test('10 chữ số hoặc 10-3 cho chi nhánh; sai định dạng bị chặn', () => {
    assert.equal(isValidTaxCode('0101010101'), true);
    assert.equal(isValidTaxCode('0101010101-001'), true);
    assert.equal(isValidTaxCode(' 0101010101 '), true, 'phải trim trước khi kiểm');
    assert.equal(isValidTaxCode('123'), false);
    assert.equal(isValidTaxCode('010101010a'), false);
    assert.equal(isValidTaxCode('0101010101-01'), false);
  });
});

describe('settings validators — VAT & phí nền tảng (ngưỡng khớp CHECK constraint)', () => {
  test('VAT trong 0–20%; nhận cả number và chuỗi số', () => {
    assert.equal(VAT_MIN_PERCENT, 0);
    assert.equal(VAT_MAX_PERCENT, 20);
    assert.equal(isValidVatPercent(0), true, '0 là VAT 0% thật, vẫn hợp lệ');
    assert.equal(isValidVatPercent(8), true);
    assert.equal(isValidVatPercent('8'), true);
    assert.equal(isValidVatPercent(20), true);
    assert.equal(isValidVatPercent(20.1), false);
    assert.equal(isValidVatPercent(-1), false);
    assert.equal(isValidVatPercent('abc'), false);
  });

  test('phí nền tảng trong 0–30%', () => {
    assert.equal(MARKETPLACE_FEE_MIN_PERCENT, 0);
    assert.equal(MARKETPLACE_FEE_MAX_PERCENT, 30);
    assert.equal(isValidMarketplaceFeePercent(0), true);
    assert.equal(isValidMarketplaceFeePercent(30), true);
    assert.equal(isValidMarketplaceFeePercent(31), false);
    assert.equal(isValidMarketplaceFeePercent(-0.1), false);
  });

  test('phí vận chuyển / đơn giá điện / nhân công chỉ cần ≥ 0', () => {
    assert.equal(isValidShippingFee(0), true);
    assert.equal(isValidShippingFee(30_000), true);
    assert.equal(isValidShippingFee(-1), false);
    assert.equal(isValidShippingFee(Number.NaN), false);
  });
});

describe('settings validators — liên hệ & tài khoản', () => {
  test('email phải có @ và tên miền', () => {
    assert.equal(isValidEmail('contact@vcube.vn'), true);
    assert.equal(isValidEmail('a@b'), false);
    assert.equal(isValidEmail('a b@c.vn'), false);
  });

  test('hotline 8–20 ký tự ký tự hợp lệ và tối thiểu 8 chữ số', () => {
    assert.equal(isValidHotline('0988 123 456'), true);
    assert.equal(isValidHotline('+84 (0)988-123-456'), true);
    assert.equal(isValidHotline('1234567890'), true);
    assert.equal(isValidHotline('1234567'), false, 'chỉ 7 chữ số ⇒ không hợp lệ');
    assert.equal(isValidHotline('0988 abc 123'), false);
  });

  test('số tài khoản ngân hàng chỉ gồm chữ số', () => {
    assert.equal(isValidBankAccount('0123456789'), true);
    assert.equal(isValidBankAccount('0123 456 789'), false);
    assert.equal(isValidBankAccount('0123a'), false);
  });
});

describe('settings validators — validateSetting / validatePatch', () => {
  test('khoá không khai báo validator ⇒ coi là hợp lệ (văn bản tự do)', () => {
    const result = validateSetting('app_settings', 'legalName', '<script>');
    assert.equal(result.valid, true);
    assert.deepEqual(result.issues, []);
  });

  test('trả issue đúng tên field domain khi sai', () => {
    const result = validateSetting('app_settings', 'taxCode', '123');
    assert.equal(result.valid, false);
    assert.equal(result.issues.length, 1);
    assert.equal(result.issues[0].field, 'taxCode');
    assert.match(result.issues[0].message, /10 chữ số/u);
  });

  test('validatePatch gom NHIỀU issue của cùng một patch', () => {
    const result = validatePatch('pricing_global_settings', {
      vatPercent: 25,
      marketplaceFeePercent: 40,
      electricityRateVnd: -5,
    });
    assert.equal(result.valid, false);
    assert.equal(result.issues.length, 3);
    assert.deepEqual(
      result.issues.map((issue) => issue.field).sort(),
      ['electricityRateVnd', 'marketplaceFeePercent', 'vatPercent'],
    );
  });

  test('patch hợp lệ ⇒ valid true, issues rỗng', () => {
    const result = validatePatch('pricing_global_settings', { vatPercent: 8, marketplaceFeePercent: 8 });
    assert.deepEqual(result, { valid: true, issues: [] });
  });
});
