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
  buildAuthSwitchHref,
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

  test('chặn vòng lặp: đích trỏ vào khu vực auth (kể cả alias) ⇒ trang chủ', () => {
    assert.equal(sanitizeRedirectPath('/auth'), '/');
    assert.equal(sanitizeRedirectPath('/auth/login'), '/');
    assert.equal(sanitizeRedirectPath('/auth/register'), '/');
    assert.equal(sanitizeRedirectPath('/auth/login?redirectTo=%2Forders'), '/');
    assert.equal(sanitizeRedirectPath('/login'), '/');
    assert.equal(sanitizeRedirectPath('/register?redirectTo=%2Forders'), '/');
    // Path có tiền tố giống nhưng KHÔNG thuộc khu vực auth vẫn được giữ.
    assert.equal(sanitizeRedirectPath('/auth0'), '/auth0');
    assert.equal(sanitizeRedirectPath('/login-history'), '/login-history');
  });

  test('biến thể case/trailing slash của khu vực auth cũng bị chặn', () => {
    assert.equal(sanitizeRedirectPath('/LOGIN'), '/');
    assert.equal(sanitizeRedirectPath('/login/'), '/');
    assert.equal(sanitizeRedirectPath('/Auth/Login'), '/');
    assert.equal(sanitizeRedirectPath('/AUTH/register/'), '/');
    assert.equal(sanitizeRedirectPath('/auth/'), '/');
    assert.equal(sanitizeRedirectPath('/REGISTER/?redirectTo=%2Forders'), '/');
    // Giá trị hợp lệ KHÔNG bị lowercase/đổi dấu `/` khi trả về.
    assert.equal(sanitizeRedirectPath('/orders'), '/orders');
    assert.equal(sanitizeRedirectPath('/Orders/Detail?id=1'), '/Orders/Detail?id=1');
    assert.equal(sanitizeRedirectPath('/'), '/');
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

describe('authRedirect — buildAuthSwitchHref', () => {
  test('không có redirectTo ⇒ route trần, không thêm query rỗng', () => {
    assert.equal(buildAuthSwitchHref('/auth/register', null), '/auth/register');
    assert.equal(buildAuthSwitchHref('/auth/login', undefined), '/auth/login');
    assert.equal(buildAuthSwitchHref('/auth/register', ''), '/auth/register');
  });

  test('login → register giữ nguyên target (path + search), encode đúng một lần', () => {
    assert.equal(
      buildAuthSwitchHref('/auth/register', '/orders'),
      '/auth/register?redirectTo=%2Forders'
    );
    assert.equal(
      buildAuthSwitchHref('/auth/login', '/orders?status=pending'),
      '/auth/login?redirectTo=%2Forders%3Fstatus%3Dpending'
    );
  });

  test('target không hợp lệ/vòng lặp auth vẫn bị lọc về trang chủ', () => {
    assert.equal(
      buildAuthSwitchHref('/auth/register', 'https://evil.example/orders'),
      '/auth/register?redirectTo=%2F'
    );
    assert.equal(
      buildAuthSwitchHref('/auth/login', '/auth/register'),
      '/auth/login?redirectTo=%2F'
    );
  });

  test('giá trị đã decode từ useSearchParams không bị encode hai lần', () => {
    // `?redirectTo=%2Forders%3Fstatus%3Dpending` → searchParams.get() = '/orders?status=pending'
    const decoded = decodeURIComponent('%2Forders%3Fstatus%3Dpending');
    assert.equal(
      buildAuthSwitchHref('/auth/register', decoded),
      '/auth/register?redirectTo=%2Forders%3Fstatus%3Dpending'
    );
  });
});
