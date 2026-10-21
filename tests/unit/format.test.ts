/**
 * Unit test — `src/frontend/lib/format.ts`
 *
 * Vì sao quan trọng: mọi bảng KPI, hoá đơn, email báo giá đều hiển thị qua các helper này.
 * Sai dấu phân cách (`.` vs `,`) hoặc format `null` thành `0` là lỗi đọc số của khách và
 * vi phạm data-honesty ("thiếu dữ liệu" phải là `—`, không phải số bịa).
 */
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_CURRENCY,
  DEFAULT_LOCALE,
  EMPTY_VALUE,
  formatBytes,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  formatPercent,
  formatWeight,
} from '../../src/frontend/lib/format';

describe('format — số & tiền theo vi-VN', () => {
  test('hằng số locale/mặc định khớp quy ước dự án', () => {
    // Vì sao: locale mặc định là nguồn sự thật cho mọi màn hình; đổi nó là đổi toàn bộ UI.
    assert.equal(DEFAULT_LOCALE, 'vi-VN');
    assert.equal(DEFAULT_CURRENCY, 'VND');
    assert.equal(EMPTY_VALUE, '—');
  });

  test('số dùng dấu chấm phân cách nghìn, dấu phẩy thập phân', () => {
    assert.equal(formatNumber(1234567.5), '1.234.567,5');
    assert.equal(formatNumber('12.5'), '12,5');
    assert.equal(formatNumber(0), '0');
  });

  test('số làm tròn theo maximumFractionDigits (mặc định tối đa 3 chữ số lẻ)', () => {
    assert.equal(formatNumber(1234.5678), '1.234,568');
    assert.equal(formatNumber(1234.5678, { maximumFractionDigits: 2 }), '1.234,57');
  });

  test('giá trị thiếu/không hợp lệ trả EMPTY_VALUE — KHÔNG bịa số 0', () => {
    // Vì sao: data-honesty cấm biến "chưa nhập" thành 0 (0 là một số đo thật).
    assert.equal(formatNumber(null), EMPTY_VALUE);
    assert.equal(formatNumber(undefined), EMPTY_VALUE);
    assert.equal(formatNumber(Number.NaN), EMPTY_VALUE);
    assert.equal(formatNumber(Number.POSITIVE_INFINITY), EMPTY_VALUE);
    assert.equal(formatNumber(''), EMPTY_VALUE);
    assert.equal(formatNumber('abc'), EMPTY_VALUE);
  });

  test('tiền VND dùng ký hiệu ₫ và phân cách vi-VN', () => {
    assert.match(formatCurrency(1250000), /^1\.250\.000\s₫$/u);
    assert.match(formatCurrency(0), /^0\s₫$/u);
    assert.equal(formatCurrency(null), EMPTY_VALUE);
    assert.equal(formatCurrency('không phải số'), EMPTY_VALUE);
  });

  test('phần trăm hỗ trợ cả số đã nhân 100 và tỷ lệ 0..1', () => {
    assert.equal(formatPercent(12.5), '12,5%');
    assert.equal(formatPercent(12), '12%');
    assert.equal(formatPercent(0.125, { isRatio: true }), '12,5%');
    assert.equal(formatPercent(null), EMPTY_VALUE);
  });

  test('ngày theo dd/MM/yyyy; style long đọc tháng bằng chữ', () => {
    // Vì sao: format ngày trong bảng đơn/hóa đơn phải thống nhất dd/MM/yyyy (PLAN §5.5).
    assert.equal(formatDate('2026-12-09'), '09/12/2026');
    assert.equal(formatDate(new Date(2026, 11, 9)), '09/12/2026');
    assert.equal(formatDate('2026-12-09', { style: 'long' }), '09 tháng 12, 2026');
    assert.equal(formatDate(null), EMPTY_VALUE);
    assert.equal(formatDate(''), EMPTY_VALUE);
    assert.equal(formatDate('không-phải-ngày'), EMPTY_VALUE);
  });

  test('ngày + giờ 24h theo Intl vi-VN (giờ đứng trước ngày)', () => {
    // Ghi nhận HÀNH VI THẬT của Intl vi-VN (không phải lỗi): "HH:mm dd/MM/yyyy".
    assert.equal(formatDateTime('2026-12-09T14:30:00'), '14:30 09/12/2026');
    assert.equal(formatDateTime('2026-12-09T14:30:05', { withSeconds: true }), '14:30:05 09/12/2026');
    assert.equal(formatDateTime('không-phải-ngày'), EMPTY_VALUE);
  });

  test('dung lượng tệp theo SI (1000) hoặc binary (1024), 0 B cố định', () => {
    assert.equal(formatBytes(0), '0 B');
    assert.equal(formatBytes(999), '999 B');
    assert.equal(formatBytes(1500), '1,5 kB');
    assert.equal(formatBytes(1572864, { base: 1024 }), '1,5 MB');
    assert.equal(formatBytes(-1), EMPTY_VALUE);
    assert.equal(formatBytes(null), EMPTY_VALUE);
  });

  test('khối lượng tự quy đổi g → kg khi ≥ 1000 g', () => {
    assert.equal(formatWeight(250), '250 g');
    assert.equal(formatWeight(0.5), '0,5 g');
    assert.equal(formatWeight(1250), '1,25 kg');
    assert.equal(formatWeight(1250, { unit: 'kg' }), '1.250 kg');
    assert.equal(formatWeight(null), EMPTY_VALUE);
  });
});
