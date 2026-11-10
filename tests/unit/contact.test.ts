/**
 * Unit test — `src/frontend/lib/contact.ts`
 *
 * Vì sao quan trọng: `site_content` có thể chứa placeholder của seed
 * (`mau@example.com`, `0000000000`) hoặc nhãn `[MẪU]`. Nếu lọt ra UI, khách sẽ thấy
 * một kênh liên hệ KHÔNG tồn tại. Luật phải giống nhau ở footer, Quote và ChatSupport:
 * chỉ hiện kênh THẬT, còn lại ẩn/fallback "Hỏi trợ lý tự động".
 */
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { isDisplayableEmail, isDisplayableHotline } from '../../src/frontend/lib/contact';

describe('contact — email hiển thị được', () => {
  test('rỗng/khoảng trắng/null ⇒ không hiển thị', () => {
    assert.equal(isDisplayableEmail(''), false);
    assert.equal(isDisplayableEmail('   '), false);
    assert.equal(isDisplayableEmail(null), false);
    assert.equal(isDisplayableEmail(undefined), false);
  });

  test('placeholder seed + nhãn dữ liệu mẫu ⇒ ẩn', () => {
    // RFC 2606: example.com/org/net là tên miền dành riêng cho tài liệu/thử nghiệm.
    assert.equal(isDisplayableEmail('mau@example.com'), false);
    assert.equal(isDisplayableEmail('mau@example.org'), false);
    assert.equal(isDisplayableEmail('mau@example.net'), false);
    assert.equal(isDisplayableEmail('[MẪU] lienhe@vcube.vn'), false);
  });

  test('sai định dạng ⇒ ẩn', () => {
    assert.equal(isDisplayableEmail('khong-phai-email'), false);
    assert.equal(isDisplayableEmail('a@b'), false);
    assert.equal(isDisplayableEmail('a b@c.vn'), false);
    assert.equal(isDisplayableEmail('a@@b.vn'), false);
  });

  test('email thật (kể cả hoa/khoảng trắng) ⇒ hiển thị', () => {
    assert.equal(isDisplayableEmail('contact@vcube.vn'), true);
    assert.equal(isDisplayableEmail('lienhe@vcube.com.vn'), true);
    assert.equal(isDisplayableEmail('  LienHe@VCUBE.VN  '), true);
  });
});

describe('contact — hotline hiển thị được', () => {
  test('rỗng/dãy 0 lặp/quá ngắn ⇒ ẩn', () => {
    assert.equal(isDisplayableHotline(''), false);
    assert.equal(isDisplayableHotline('   '), false);
    assert.equal(isDisplayableHotline('0000000000'), false);
    assert.equal(isDisplayableHotline('0000 000 000'), false);
    assert.equal(isDisplayableHotline('1234567'), false);
    assert.equal(isDisplayableHotline('+8490'), false);
    assert.equal(isDisplayableHotline(null), false);
  });

  test('hotline thật VN (có +84, khoảng trắng) ⇒ hiển thị', () => {
    assert.equal(isDisplayableHotline('0901234567'), true);
    assert.equal(isDisplayableHotline('090 123 4567'), true);
    assert.equal(isDisplayableHotline('+84901234567'), true);
  });

  test('nhãn dữ liệu mẫu ⇒ ẩn', () => {
    assert.equal(isDisplayableHotline('[MẪU] 0901234567'), false);
  });
});
