/**
 * Unit test — `src/frontend/lib/vat.ts`
 *
 * Vì sao quan trọng: VAT là con số PHÁP LÝ. Trước đây mỗi màn tự cộng 8% (có nơi bỏ 0)
 * nên cùng một đơn ra ba con số khác nhau. Luật hiện tại: `null` = CHƯA CẤU HÌNH ⇒ ẩn dòng
 * VAT (trả `null`), còn `0` là VAT 0% THẬT (trả 0) — không được trộn hai trạng thái này.
 */
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import {
  VAT_CONFIG_PATH,
  computeVat,
  vatLabel,
  vatNotConfiguredLabel,
  vatRateFromPercent,
  vatTotalNote,
} from '../../src/frontend/lib/vat';

describe('vat — quy đổi tỉ lệ phần trăm', () => {
  test('quy đổi phần trăm sang phân số đúng đơn vị DB lưu', () => {
    assert.equal(vatRateFromPercent(8), 0.08);
    assert.equal(vatRateFromPercent(20), 0.2);
    assert.equal(vatRateFromPercent(0), 0);
  });

  test('null/undefined/NaN ⇒ null (CHƯA CẤU HÌNH, không rơi về 8%)', () => {
    // Vì sao: một tỉ lệ mặc định trong mã từng làm hoá đơn in "VAT 8%" dù chưa ai cấu hình.
    assert.equal(vatRateFromPercent(null), null);
    assert.equal(vatRateFromPercent(undefined), null);
    assert.equal(vatRateFromPercent(Number.NaN), null);
    assert.equal(vatRateFromPercent(Number.POSITIVE_INFINITY), null);
  });
});

describe('vat — computeVat', () => {
  test('rate = null ⇒ null để caller ẩn dòng VAT', () => {
    assert.equal(computeVat(1_000_000, null), null);
    assert.equal(computeVat(1_000_000, Number.NaN), null);
  });

  test('rate = 0 là VAT 0% THẬT ⇒ trả dòng tiền 0, không phải null', () => {
    // Phân biệt "chưa cấu hình" (null) với "đã cấu hình thuế suất 0%".
    const line = computeVat(1_000_000, 0);
    assert.notEqual(line, null);
    assert.deepEqual(line, { rate: 0, taxableAmount: 1_000_000, amount: 0, total: 1_000_000 });
  });

  test('công thức Math.round(base × rate), total = base + VAT', () => {
    assert.deepEqual(computeVat(1_000_000, 0.08), {
      rate: 0.08,
      taxableAmount: 1_000_000,
      amount: 80_000,
      total: 1_080_000,
    });
    // 999 × 0.1 = 99.9 ⇒ làm tròn tiền về đồng (100).
    assert.deepEqual(computeVat(999, 0.1), { rate: 0.1, taxableAmount: 999, amount: 100, total: 1_099 });
  });

  test('số tiền chịu thuế được làm tròn và chặn âm', () => {
    assert.equal(computeVat(1000.6, 0.08)?.taxableAmount, 1001);
    assert.deepEqual(computeVat(-500, 0.08), { rate: 0.08, taxableAmount: 0, amount: 0, total: 0 });
  });
});

describe('vat — nhãn hiển thị', () => {
  test('nhãn VAT lấy tỉ lệ phần trăm đã cấu hình', () => {
    assert.equal(vatLabel(0.08), 'VAT (8%)');
    assert.equal(vatLabel(0), 'VAT (0%)');
    assert.equal(vatLabel(null), null);
    assert.equal(vatLabel(Number.NaN), null);
  });

  test('câu "chưa cấu hình" nêu rõ đường dẫn cấu hình, không bịa tỉ lệ', () => {
    const msg = vatNotConfiguredLabel();
    assert.match(msg, /VAT chưa được cấu hình/u);
    assert.ok(msg.includes(VAT_CONFIG_PATH));
    assert.match(vatTotalNote(null), /chưa được cấu hình/u);
    assert.match(vatTotalNote(0.08), /VAT là dòng riêng/u);
  });
});
