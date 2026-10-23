/**
 * Unit test — FL-2a-fix: mapper `products.designer_id` + payload ghi sản phẩm.
 *
 * Vì sao quan trọng:
 *  1. Trước khi migration `products.designer_id` được áp, payload gửi cột lạ sẽ bị PostgREST
 *     từ chối ⇒ admin không tạo được sản phẩm. Payload PHẢI chỉ thêm `designer_id` khi có giá trị.
 *  2. Designer insert sản phẩm phải gửi `designer_id = auth.uid()` và status lowercase để khớp
 *     policy `lower(status) in ('under review','pending','draft')`.
 *  3. `insertProduct` (INSERT) tách khỏi `saveProduct` (upsert) — upsert cần UPDATE policy nên
 *     designer sẽ dính 42501 nếu dùng nhầm.
 */
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { rowToProduct } from '../../src/backend/supabase/mappers';
import type { Product } from '../../src/types';

// client.ts đọc `NEXT_PUBLIC_*` lúc import; đặt env trước khi import database.ts (không gọi mạng).
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://fl2a-fix-test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'sb_publishable_fl2a_fix_test';
const { buildProductRowPayload, dbService } = await import('../../src/backend/supabase/database');

const baseProduct = (overrides: Partial<Product> = {}): Product => ({
  id: 'prod-test-1',
  name: 'Bánh răng test',
  category: 'mechanical',
  designer: 'Tác giả QA',
  pricePhysical: 320000,
  priceDigital: 120000,
  images: [],
  description: 'Mô tả',
  features: [],
  specs: { dimensions: '—', weight: '—', resolution: '—', infillDefault: '—', technology: '—' },
  supportedMaterials: [],
  colors: [],
  tags: [],
  rating: 0,
  reviewsCount: 0,
  printsCount: 0,
  printTime: '—',
  ...overrides,
});

describe('mappers — rowToProduct.designerId', () => {
  test('map cột designer_id khi có', () => {
    const product = rowToProduct({
      id: 'p1',
      name: 'X',
      category: 'mechanical',
      designer: 'A',
      designer_id: '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed',
      price_physical: 1,
      price_digital: 2,
      status: 'published',
    });
    assert.equal(product.designerId, '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed');
  });

  test('cột vắng ⇒ undefined (không tự gán chủ sở hữu)', () => {
    const product = rowToProduct({
      id: 'p1',
      name: 'X',
      category: 'mechanical',
      designer: 'A',
      price_physical: 1,
      price_digital: 2,
      status: 'published',
    });
    assert.equal(product.designerId, undefined);
  });
});

describe('buildProductRowPayload — conditional designer_id + status lowercase', () => {
  test('designer product: gửi designer_id + status "under review"', () => {
    const payload = buildProductRowPayload(
      baseProduct({ designerId: '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed', status: 'Under Review' })
    );
    assert.equal(payload.designer_id, '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed');
    assert.equal(payload.status, 'under review');
  });

  test('sản phẩm admin tạo (không có designerId) KHÔNG gửi designer_id — chạy được trước migration', () => {
    const payload = buildProductRowPayload(baseProduct({ status: 'Published' }));
    assert.equal(Object.prototype.hasOwnProperty.call(payload, 'designer_id'), false);
    assert.equal(payload.status, 'published');
  });

  test('status rỗng ⇒ published (DB default); production_readiness có default rõ', () => {
    const payload = buildProductRowPayload(baseProduct({ status: undefined }));
    assert.equal(payload.status, 'published');
    assert.equal(payload.production_readiness, 'ready_to_print');
  });

  test('không ghi đè các cột khác: updated_at luôn có, id/name/designer khớp product', () => {
    const payload = buildProductRowPayload(baseProduct({ designerId: 'uid-1' }));
    assert.equal(payload.id, 'prod-test-1');
    assert.equal(payload.name, 'Bánh răng test');
    assert.equal(payload.designer, 'Tác giả QA');
    assert.equal(typeof payload.updated_at, 'string');
    assert.equal(payload.designer_id, 'uid-1');
  });

  test('designerId rỗng/undefined ⇒ không thêm cột', () => {
    for (const designerId of [undefined, '', null as unknown as string]) {
      const payload = buildProductRowPayload(baseProduct({ designerId }));
      assert.equal(Object.prototype.hasOwnProperty.call(payload, 'designer_id'), false, String(designerId));
    }
  });
});

describe('dbService — insertProduct tách khỏi saveProduct (upsert)', () => {
  test('có insertProduct + saveProduct riêng', () => {
    assert.equal(typeof dbService.insertProduct, 'function');
    assert.equal(typeof dbService.saveProduct, 'function');
    assert.notEqual(dbService.insertProduct, dbService.saveProduct);
  });
});
