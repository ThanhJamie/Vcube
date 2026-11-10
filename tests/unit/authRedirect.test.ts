/**
 * Unit test — `src/frontend/lib/authRedirect.ts` (UX-02).
 *
 * Vì sao quan trọng: `?redirectTo=` đến từ URL (dữ liệu không tin cậy) và được dùng để
 * `navigate()` sau khi đăng nhập. Chỉ path nội bộ mới được chấp nhận; mọi giá trị khác
 * (domain ngoài, protocol-relative, backslash, scheme…) phải rơi về `/`.
 */
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_AUTH_REDIRECT,
  buildLoginHref,
  sanitizeRedirectPath,
} from '../../src/frontend/lib/authRedirect';

describe('authRedirect — sanitizeRedirectPath', () => {
  test('thiếu/chuỗi rỗng ⇒ trang chủ', () => {
    assert.equal(sanitizeRedirectPath(null), '/');
    assert.equal(sanitizeRedirectPath(undefined), '/');
    assert.equal(sanitizeRedirectPath(''), '/');
    assert.equal(sanitizeRedirectPath('   '), '/');
    assert.equal(DEFAULT_AUTH_REDIRECT, '/');
  });

  test('path nội bộ (kèm query) được giữ nguyên', () => {
    assert.equal(sanitizeRedirectPath('/orders'), '/orders');
    assert.equal(sanitizeRedirectPath('/orders?status=pending'), '/orders?status=pending');
    assert.equal(sanitizeRedirectPath('/assets?tab=cad#top'), '/assets?tab=cad#top');
    assert.equal(sanitizeRedirectPath('/'), '/');
  });

  test('domain ngoài / scheme / protocol-relative bị chặn', () => {
    assert.equal(sanitizeRedirectPath('https://evil.example/orders'), '/');
    assert.equal(sanitizeRedirectPath('//evil.example/orders'), '/');
    assert.equal(sanitizeRedirectPath('/\\evil.example'), '/');
    assert.equal(sanitizeRedirectPath('javascript:alert(1)'), '/');
    assert.equal(sanitizeRedirectPath('orders'), '/');
  });

  test('ký tự điều khiển (xuống dòng/NUL) bị chặn', () => {
    assert.equal(sanitizeRedirectPath('/orders\nX-Injected: 1'), '/');
    assert.equal(sanitizeRedirectPath('/orders\u0000'), '/');
  });
});

describe('authRedirect — buildLoginHref', () => {
  test('ghép path + search và encode đúng một lần', () => {
    assert.equal(
      buildLoginHref('/orders', '?status=pending'),
      '/auth/login?redirectTo=%2Forders%3Fstatus%3Dpending'
    );
    assert.equal(buildLoginHref('/account'), '/auth/login?redirectTo=%2Faccount');
  });

  test('path không hợp lệ vẫn rơi về trang chủ', () => {
    assert.equal(buildLoginHref('//evil.example'), '/auth/login?redirectTo=%2F');
  });
});
