/**
 * Unit test — W1.3 phân loại lỗi `OrderService.getOrderDetail`.
 *
 * Vì sao quan trọng: UI `/order-success/:id` phải phân biệt "đơn KHÔNG TỒN TẠI" (màn không
 * tìm thấy, không có nút Thử lại) với "KHÔNG ĐỌC ĐƯỢC" (mạng/quyền → màn lỗi + Thử lại).
 * Nếu classifier đoán sai, lỗi mạng bị báo thành đơn không tồn tại — đúng lỗi data-honesty
 * mà task này sửa. Test khoá các nhánh bằng dữ liệu lỗi ĐẶC TRƯNG (không gọi mạng/DB).
 */
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { classifyOrderDetailError } from '../../src/backend/services/orderDetailError';
import { OrderDetailError } from '../../src/types/orderRecords';

/** Lỗi dạng PostgREST: object có `code` + `message` (không phải `Error`). */
const postgrest = (code: string, message: string) => ({ code, message, details: null, hint: null });

describe('classifyOrderDetailError — forbidden', () => {
  test('PostgREST 42501 (permission denied) → forbidden', () => {
    assert.equal(
      classifyOrderDetailError(postgrest('42501', 'permission denied for table orders')),
      'forbidden'
    );
  });

  test('Error bị bọc mất mã nhưng còn chữ "permission denied" → forbidden', () => {
    assert.equal(
      classifyOrderDetailError(new Error('Không tải được đơn hàng: permission denied for table orders')),
      'forbidden'
    );
  });

  test('row-level security policy → forbidden', () => {
    assert.equal(
      classifyOrderDetailError(new Error('new row violates row-level security policy for table "orders"')),
      'forbidden'
    );
  });

  test('PGRST301 (JWT hết hạn) → forbidden, không phải network', () => {
    assert.equal(classifyOrderDetailError(postgrest('PGRST301', 'JWT expired')), 'forbidden');
  });
});

describe('classifyOrderDetailError — network', () => {
  test('TypeError "Failed to fetch" (fetch bị chặn/mất mạng) → network', () => {
    assert.equal(classifyOrderDetailError(new TypeError('Failed to fetch')), 'network');
  });

  test('AbortError (timeout/abort) → network', () => {
    const err = Object.assign(new Error('The operation was aborted.'), { name: 'AbortError' });
    assert.equal(classifyOrderDetailError(err), 'network');
  });

  test('mã Node ECONNREFUSED → network', () => {
    assert.equal(classifyOrderDetailError(Object.assign(new Error('boom'), { code: 'ECONNREFUSED' })), 'network');
  });
});

describe('classifyOrderDetailError — unknown / giữ nguyên mã', () => {
  test('lỗi lạ → unknown (không đoán bừa thành network)', () => {
    assert.equal(classifyOrderDetailError(new Error('invalid input syntax for type uuid')), 'unknown');
  });

  test('giá trị không phải object lỗi → unknown', () => {
    assert.equal(classifyOrderDetailError(null), 'unknown');
    assert.equal(classifyOrderDetailError(undefined), 'unknown');
  });

  test('OrderDetailError giữ nguyên code (không phân loại lại)', () => {
    assert.equal(classifyOrderDetailError(new OrderDetailError('not_found', 'Không tìm thấy đơn hàng.')), 'not_found');
    assert.equal(classifyOrderDetailError(new OrderDetailError('forbidden', 'Không có quyền.')), 'forbidden');
  });
});

describe('OrderDetailError — mang mã + warnings', () => {
  test('code/name/warnings/cause được giữ', () => {
    const cause = new TypeError('Failed to fetch');
    const err = new OrderDetailError('network', 'Không tải được đơn hàng.', {
      cause,
      warnings: ['Không đọc được orders qua RLS'],
    });
    assert.equal(err.code, 'network');
    assert.equal(err.name, 'OrderDetailError');
    assert.deepEqual(err.warnings, ['Không đọc được orders qua RLS']);
    assert.equal(err.cause, cause);
    assert.ok(err instanceof Error);
  });
});
