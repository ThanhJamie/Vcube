/**
 * Unit test — UI-01 publish readiness (`validateProductForPublish`).
 *
 * Vì sao quan trọng: trước đây admin có thể chọn "Đang bán" cho sản phẩm 0 ảnh / giá 0 /
 * chưa khai giấy phép ⇒ storefront hiển thị một sản phẩm không mua được, không đúng dữ liệu.
 * Helper này là nguồn DUY NHẤT cho admin UI + `dbService.saveProduct/insertProduct`.
 */
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import {
  formatPublishIssues,
  productSellableChannels,
  validateProductForPublish,
} from '../../src/frontend/lib/productStatus';
import type { Product } from '../../src/types';

const validProduct = (overrides: Partial<Product> = {}): Product => ({
  id: 'prod-ui01',
  name: 'Bánh răng hành tinh',
  category: 'mechanical',
  designer: '',
  pricePhysical: 250000,
  priceDigital: 0,
  images: ['https://cdn.vcube.vn/products/banh-rang.webp'],
  description: 'Mô tả',
  features: [],
  specs: { dimensions: '', weight: '', resolution: '', infillDefault: '', technology: '' },
  supportedMaterials: [],
  colors: [],
  tags: [],
  rating: 0,
  reviewsCount: 0,
  printsCount: 0,
  printTime: '',
  licenseType: 'Commercial',
  sellerType: 'platform',
  status: 'published',
  ...overrides,
});

describe('validateProductForPublish — sản phẩm hợp lệ', () => {
  test('sản phẩm nền tảng đủ ảnh/giá/giấy phép ⇒ publish được', () => {
    const readiness = validateProductForPublish(validProduct());
    assert.equal(readiness.ready, true);
    assert.deepEqual(readiness.issues, []);
    assert.deepEqual(readiness.channels, { physical: true, digital: false });
  });

  test('chỉ bán tệp số (giá in = 0) vẫn hợp lệ', () => {
    const readiness = validateProductForPublish(
      validProduct({ pricePhysical: 0, priceDigital: 120000 })
    );
    assert.equal(readiness.ready, true);
    assert.deepEqual(readiness.channels, { physical: false, digital: true });
  });

  test('thumbnail hợp lệ thay cho images[]', () => {
    const readiness = validateProductForPublish(
      validProduct({ images: [], thumbnailUrl: 'https://cdn.vcube.vn/products/thumb.webp' })
    );
    assert.equal(readiness.ready, true);
  });
});

describe('validateProductForPublish — trường thiếu bị chặn + có lý do', () => {
  const codes = (overrides: Partial<Product>) =>
    validateProductForPublish(validProduct(overrides)).issues.map((i) => i.code);

  test('tên / danh mục', () => {
    assert.deepEqual(codes({ name: '   ' }), ['name']);
    assert.deepEqual(codes({ category: '' }), ['category']);
  });

  test('ảnh: rỗng hoặc ảnh bịa (Unsplash) đều không tính', () => {
    assert.deepEqual(codes({ images: [] }), ['image']);
    assert.deepEqual(codes({ images: ['https://images.unsplash.com/photo-1581092335397-9583fe92d232'] }), [
      'image',
    ]);
  });

  test('giá: cả hai kênh = 0 ⇒ chặn; giá âm ⇒ chặn', () => {
    assert.deepEqual(codes({ pricePhysical: 0, priceDigital: 0 }), ['price']);
    assert.deepEqual(codes({ pricePhysical: -1 }), ['price']);
  });

  test('giấy phép chưa khai hoặc giá trị lạ ⇒ chặn', () => {
    assert.deepEqual(codes({ licenseType: undefined }), ['license']);
    assert.deepEqual(codes({ licenseType: 'Miễn phí' as Product['licenseType'] }), ['license']);
  });

  test('sellerType designer thiếu designer_id ⇒ chặn; platform thiếu vẫn OK', () => {
    assert.deepEqual(codes({ sellerType: 'designer' }), ['seller']);
    assert.equal(
      validateProductForPublish(
        validProduct({ sellerType: 'designer', designerId: '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed' })
      ).ready,
      true
    );
    assert.equal(validateProductForPublish(validProduct({ sellerType: 'platform' })).ready, true);
  });

  test('status không nhận diện được ⇒ chặn', () => {
    assert.deepEqual(codes({ status: 'weird' as Product['status'] }), ['status']);
    assert.equal(validateProductForPublish(validProduct({ status: 'Published' })).ready, true);
  });
});

describe('productSellableChannels + formatPublishIssues', () => {
  test('kênh bán theo giá > 0, KHÔNG coi 0 là miễn phí', () => {
    assert.deepEqual(productSellableChannels({ pricePhysical: 0, priceDigital: 1000 }), {
      physical: false,
      digital: true,
    });
    assert.deepEqual(
      productSellableChannels({ pricePhysical: Number.NaN, priceDigital: -5 }),
      { physical: false, digital: false }
    );
  });

  test('format gộp mọi lý do thành một câu, không cắt', () => {
    const readiness = validateProductForPublish(
      validProduct({ name: '', images: [], licenseType: undefined })
    );
    const text = formatPublishIssues(readiness);
    assert.ok(text.includes('Thiếu tên sản phẩm'));
    assert.ok(text.includes('Cần ít nhất 1 ảnh sản phẩm thật'));
    assert.ok(text.includes('Chưa khai giấy phép sử dụng'));
    assert.equal(text.split(' · ').length, readiness.issues.length);
  });
});
