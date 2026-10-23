/**
 * Unit test — `src/frontend/lib/productStatus.ts` (FL-2a-fix).
 *
 * Vì sao quan trọng: DB lưu `products.status` lowercase, nhưng UI cũ so sánh chuỗi chữ hoa
 * ('Under Review'/'Published'/'Draft') ⇒ nhãn sai, filter không khớp, và designer bấm toggle
 * sẽ ghi trạng thái không được policy cho phép. Helper này là nguồn canonical duy nhất ở UI.
 */
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import {
  ADMIN_STATUS_OPTIONS,
  DESIGNER_STATUS_FILTERS,
  DESIGNER_STATUS_OPTIONS,
  isDesignerEditableStatus,
  isDraftStatus,
  isPublishedStatus,
  isUnderReviewStatus,
  normalizeProductStatus,
  productStatusLabel,
  productStatusLabelLong,
  toAdminSelectStatus,
  toStoredProductStatus,
} from '../../src/frontend/lib/productStatus';

describe('productStatus — normalize (không phân biệt hoa thường/định dạng)', () => {
  test('under review: mọi biến thể hoa/thường/gạch đều về under_review', () => {
    for (const raw of ['Under Review', 'under review', 'UNDER_REVIEW', 'under-review', 'In Review']) {
      assert.equal(normalizeProductStatus(raw), 'under_review', raw);
    }
  });

  test('pending/published/draft/archived và nhãn tiếng Việt', () => {
    assert.equal(normalizeProductStatus('Pending'), 'pending');
    assert.equal(normalizeProductStatus('pending_review'), 'pending');
    assert.equal(normalizeProductStatus('Published'), 'published');
    assert.equal(normalizeProductStatus('PUBLISHED'), 'published');
    assert.equal(normalizeProductStatus('Draft'), 'draft');
    assert.equal(normalizeProductStatus('ARCHIVED'), 'archived');
    assert.equal(normalizeProductStatus('Bản nháp'), 'draft');
    assert.equal(normalizeProductStatus('Lưu trữ'), 'archived');
  });

  test('giá trị lạ/rỗng/null → unknown (không đoán bừa)', () => {
    for (const raw of ['', '   ', 'weird', null, undefined, 123, {}, []]) {
      assert.equal(normalizeProductStatus(raw), 'unknown', String(raw));
    }
  });

  test('status lưu DB lowercase vẫn nhận đúng qua helper', () => {
    assert.equal(isUnderReviewStatus('under review'), true);
    assert.equal(isUnderReviewStatus('pending'), true);
    assert.equal(isUnderReviewStatus('published'), false);
    assert.equal(isPublishedStatus('published'), true);
    assert.equal(isDraftStatus('draft'), true);
  });
});

describe('productStatus — nhãn hiển thị', () => {
  test('nhãn ngắn canonical', () => {
    assert.equal(productStatusLabel('under review'), 'Chờ duyệt');
    assert.equal(productStatusLabel('pending'), 'Chờ duyệt');
    assert.equal(productStatusLabel('published'), 'Đã đăng');
    assert.equal(productStatusLabel('draft'), 'Nháp');
    assert.equal(productStatusLabel('archived'), 'Lưu trữ');
    assert.equal(productStatusLabel(null), '—');
  });

  test('nhãn dài giữ tương thích UI cũ', () => {
    assert.equal(productStatusLabelLong('Published'), 'Đã xuất bản');
    assert.equal(productStatusLabelLong('Draft'), 'Bản nháp');
    assert.equal(productStatusLabelLong('Under Review'), 'Chờ duyệt');
  });
});

describe('productStatus — quyền của designer theo policy DB', () => {
  test('chỉ sửa/xoá được sản phẩm chưa xuất bản', () => {
    for (const raw of ['draft', 'under review', 'pending', 'Under Review']) {
      assert.equal(isDesignerEditableStatus(raw), true, raw);
    }
    for (const raw of ['published', 'Published', 'archived', 'unknown', null]) {
      assert.equal(isDesignerEditableStatus(raw), false, String(raw));
    }
  });

  test('designer không bao giờ lưu được published/archived (bị quy về under review)', () => {
    assert.equal(toStoredProductStatus('under review'), 'under review');
    assert.equal(toStoredProductStatus('pending'), 'pending');
    assert.equal(toStoredProductStatus('draft'), 'draft');
    assert.equal(toStoredProductStatus('published'), 'under review');
    assert.equal(toStoredProductStatus('archived'), 'under review');
  });

  test('option designer không có publish; filter dùng canonical', () => {
    const designerValues = DESIGNER_STATUS_OPTIONS.map((o) => o.value);
    assert.deepEqual([...designerValues], ['draft', 'under review']);
    assert.ok(!(DESIGNER_STATUS_OPTIONS as ReadonlyArray<{ value: string }>).some((o) => o.value === 'published'));
    assert.ok(DESIGNER_STATUS_FILTERS.some((o) => o.value === 'under_review'));
    assert.ok(!(DESIGNER_STATUS_FILTERS as ReadonlyArray<{ value: string }>).some((o) => o.value === 'Under Review'));
  });
});

describe('productStatus — admin publish/pending', () => {
  test('admin select hiển thị được under review/pending, có option publish', () => {
    assert.equal(toAdminSelectStatus('under review'), 'under review');
    assert.equal(toAdminSelectStatus('pending'), 'under review');
    assert.equal(toAdminSelectStatus('published'), 'published');
    assert.equal(toAdminSelectStatus('weird'), 'published');
    const values = ADMIN_STATUS_OPTIONS.map((o) => o.value);
    assert.ok(values.includes('under review'));
    assert.ok(values.includes('published'));
    assert.equal(ADMIN_STATUS_OPTIONS.find((o) => o.value === 'under review')?.label, 'Chờ duyệt');
  });
});
