/**
 * Unit test — `src/backend/supabase/mappers.ts`
 *
 * Vì sao quan trọng: đây là cửa DUY NHẤT từ row Supabase (snake_case) sang domain type.
 * Luật "null hay 0" (data-honesty): cột nullable phải giữ `null` = CHƯA CẤU HÌNH; chỉ cột
 * NOT NULL mới quy về default của cột. Test khoá lại các quyết định đó để refactor sau
 * không âm thầm bịa số 0 / mặc định 'verified' / 5 sao.
 */
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import {
  EMPTY_PRODUCT_SPECS,
  appSettingsToRow,
  rowToAccessory,
  rowToAppSettings,
  rowToCustomDesignRequest,
  rowToMaterial,
  rowToOrder,
  rowToPrinter,
  rowToProduct,
  rowToSiteContent,
  rowToUserProfile,
  rowToWorkshopPartner,
} from '../../src/backend/supabase/mappers';
import { DEFAULT_SITE_CONTENT } from '../../src/data/mockData';

describe('mappers — sản phẩm', () => {
  test('row rỗng vẫn ra shape hợp lệ: specs rỗng, không bịa SKU/tác giả/rating', () => {
    const product = rowToProduct({});
    assert.deepEqual(product.specs, EMPTY_PRODUCT_SPECS);
    assert.equal(product.sku, undefined);
    assert.equal(product.designer, '');
    assert.equal(product.rating, 0);
    assert.deepEqual(product.images, []);
    assert.equal(product.status, 'published');
    assert.equal(product.licenseType, null);
  });

  test('giá NULL ⇒ 0 (hợp đồng cột NOT NULL), còn 0/“0” THẬT được giữ', () => {
    // Cột price_* là `not null default 0`; UI coi 0 = "không bán kênh đó" ⇒ map về 0.
    const product = rowToProduct({ id: 'p1', name: 'X', category: 'mechanical', price_physical: null, price_digital: '0' });
    assert.equal(product.pricePhysical, 0);
    assert.equal(product.priceDigital, 0);
  });

  test('status được lowercase; SKU toàn khoảng trắng ⇒ undefined; cờ false giữ nguyên', () => {
    const product = rowToProduct({
      id: 'p1',
      name: 'X',
      category: 'mechanical',
      sku: '   ',
      status: 'PUBLISHED',
      is_customizable: false,
      license_type: '   ',
    });
    assert.equal(product.status, 'published');
    assert.equal(product.sku, undefined);
    assert.equal(product.isCustomizable, false);
    assert.equal(product.licenseType, null);
  });

  test('images dạng chuỗi được bọc thành mảng, nhưng thumbnail chỉ lấy từ mảng thật', () => {
    // Hành vi thật: images:[...] mới có thumbnailUrl; images là chuỗi ⇒ images [chuỗi] nhưng thumbnail ''.
    const fromString = rowToProduct({ id: 'p', name: 'X', category: 'c', images: 'a.png' });
    assert.deepEqual(fromString.images, ['a.png']);
    assert.equal(fromString.thumbnailUrl, '');
    const fromArray = rowToProduct({ id: 'p', name: 'X', category: 'c', images: ['a.png', 'b.png'] });
    assert.equal(fromArray.thumbnailUrl, 'a.png');
  });
});

describe('mappers — vật liệu & máy in (phân biệt null với 0)', () => {
  test('density/costPerKg NULL giữ null, còn 0 là số đo thật', () => {
    // Vì sao: 0 g/cm³ vô nghĩa nhưng nếu bị đổi thành null/0 ngầm thì engine không biết
    // "chưa cấu hình" hay "đã cấu hình 0" ⇒ mọi guard PricingUnavailableError mất tác dụng.
    const material = rowToMaterial({ id: 'm1', name: 'PLA', density: 0, cost_per_kg: null, price_per_gram: null });
    assert.equal(material.density, 0);
    assert.equal(material.costPerKg, null);
    assert.equal(material.pricePerGram, null);
    assert.equal(material.inStock, false);
    assert.equal(material.stockRollsCount, undefined);
  });

  test('cờ in_stock chỉ true khi DB ghi nhận đúng boolean true', () => {
    assert.equal(rowToMaterial({ id: 'm', name: 'PLA', in_stock: true }).inStock, true);
    assert.equal(rowToMaterial({ id: 'm', name: 'PLA', in_stock: 'true' }).inStock, false);
    assert.equal(rowToMaterial({ id: 'm', name: 'PLA' }).inStock, false);
  });

  test('máy in: default đúng cột NOT NULL (FDM/Idle), số nullable giữ null', () => {
    const printer = rowToPrinter({ id: 'pr1', name: 'X' });
    assert.equal(printer.technology, 'FDM');
    assert.equal(printer.status, 'Idle');
    assert.equal(printer.bedDimensions, null);
    assert.equal(printer.powerKW, null);
    assert.equal(printer.hasAMS, false);
    assert.equal(printer.hasEnclosure, false);
  });

  test('máy in: powerKW = 0 giữ nguyên 0; cờ chỉ true khi boolean true', () => {
    const printer = rowToPrinter({ id: 'pr1', name: 'X', power_kw: 0, has_ams: 1, has_ams2: true, bed_dimensions: { x: 256, y: null, z: 256 } });
    assert.equal(printer.powerKW, 0);
    assert.equal(printer.hasAMS, false);
    assert.deepEqual(printer.bedDimensions, { x: 256, y: null, z: 256 });
  });
});

describe('mappers — phụ kiện', () => {
  test('row rỗng có default an toàn, không bịa vị trí kho/nhà cung cấp/SKU', () => {
    const accessory = rowToAccessory({});
    assert.equal(accessory.category, 'hardware');
    assert.equal(accessory.unit, 'cái');
    assert.equal(accessory.sku, '');
    assert.equal(accessory.warehouseLocation, '');
    assert.equal(accessory.supplier, '');
    assert.equal(accessory.isActive, false);
    assert.deepEqual(accessory.compatibleWith, []);
  });

  test('nameEn fallback theo name; isActive chỉ true khi DB ghi nhận', () => {
    const accessory = rowToAccessory({ id: 'a1', name: 'Móc khóa', in_stock: true, type: 'magnet' });
    assert.equal(accessory.nameEn, 'Móc khóa');
    assert.equal(accessory.category, 'magnet');
    assert.equal(accessory.isActive, true);
  });
});

describe('mappers — đơn hàng', () => {
  test('row rỗng có payment mặc định: chưa thanh toán, trạng thái unpaid', () => {
    const order = rowToOrder({});
    assert.equal(order.status, 'processing');
    assert.equal(order.statusStageIndex, null);
    assert.equal(order.layerProgress, null);
    assert.equal(order.payment.isPaid, false);
    assert.equal(order.payment.status, 'unpaid');
    assert.equal(order.payment.total, 0);
  });

  test('payment đọc từ object hoặc cột phẳng; isPaid chỉ true khi DB xác nhận', () => {
    const order = rowToOrder({
      id: 'o1',
      order_number: 'ORD-1',
      payment: { total: 150000, isPaid: true, subtotalPhysical: 100000, shippingFee: 25000 },
    });
    assert.equal(order.orderNumber, 'ORD-1');
    assert.equal(order.payment.total, 150000);
    assert.equal(order.payment.shippingFee, 25000);
    assert.equal(order.payment.isPaid, true);
    assert.equal(order.payment.status, 'paid');
  });

  test('status_stage_index = 0 được giữ (không bị coi là null)', () => {
    const order = rowToOrder({ id: 'o1', status_stage_index: 0, layer_progress: 0 });
    assert.equal(order.statusStageIndex, 0);
    assert.equal(order.layerProgress, 0);
  });
});

describe('mappers — người dùng & KYC', () => {
  test('KYC thiếu dữ liệu luôn là unverified, KHÔNG BAO GIỜ verified', () => {
    // Vì sao: AT-05 (Critical) — một phép map từng mặc định 'verified' cho hồ sơ chưa xác minh.
    assert.equal(rowToUserProfile({ id: 'u1' }).kycStatus, 'unverified');
    assert.equal(rowToUserProfile({ id: 'u1', kyc_status: 'pending_review' }).kycStatus, 'pending');
    assert.equal(rowToUserProfile({ id: 'u1', kyc_status: 'verified' }).kycStatus, 'verified');
    assert.equal(rowToUserProfile({ id: 'u1', kyc_status: 'hacked' }).kycStatus, 'unverified');
  });

  test('role/accountStatus có default an toàn; totalOrders/Spent thiếu ⇒ undefined', () => {
    const user = rowToUserProfile({ id: 'u1', email: 'a@b.co' });
    assert.equal(user.role, 'customer');
    assert.equal(user.accountStatus, 'active');
    assert.equal(user.totalOrders, undefined);
    assert.equal(user.totalSpent, undefined);
    assert.ok(Number.isFinite(Date.parse(user.createdAt)), 'createdAt phải là ISO date parse được');
  });
});

describe('mappers — app_settings (khoá pháp lý)', () => {
  test('chuỗi rỗng/khoảng trắng ⇒ null = CHƯA CẤU HÌNH', () => {
    const settings = rowToAppSettings({ id: 'app_settings', legal_name: '  ', hotline: '', tax_code: '0101010101' });
    assert.equal(settings.legalName, null);
    assert.equal(settings.hotline, null);
    assert.equal(settings.taxCode, '0101010101');
    assert.deepEqual(settings.settings, {});
  });

  test('appSettingsToRow: bỏ qua undefined (update từng phần), "" ⇒ null', () => {
    const row = appSettingsToRow({ legalName: '', hotline: undefined, taxCode: '0101010101' });
    assert.deepEqual(row, { legal_name: null, tax_code: '0101010101' });
  });
});

describe('mappers — site_content', () => {
  test('row rỗng trả đúng defaults đã truyền (không tự bịa nguồn thứ hai)', () => {
    const content = rowToSiteContent({}, DEFAULT_SITE_CONTENT);
    for (const key of Object.keys(DEFAULT_SITE_CONTENT) as (keyof typeof DEFAULT_SITE_CONTENT)[]) {
      assert.deepEqual(content[key], DEFAULT_SITE_CONTENT[key], `khoá ${String(key)} phải giữ default`);
    }
    // Hành vi thật: mapper luôn set cả nhóm khoá SEO; defaults không khai ⇒ undefined (chưa cấu hình),
    // KHÔNG bịa chuỗi rỗng/giá trị mẫu.
    assert.equal(content.seoTitle, undefined);
    assert.equal(content.seoDescription, undefined);
  });

  test('override chuỗi/boolean/mảng đúng; chuỗi boolean lạ rơi về defaults', () => {
    const content = rowToSiteContent(
      { hero_badge: 'BADGE', announcement_enabled: false, seo_robots_index: 'false', trust_partners_list: ['A', 'B'] },
      { ...DEFAULT_SITE_CONTENT, announcementActive: true, seoRobotsIndex: true },
    );
    assert.equal(content.heroBadge, 'BADGE');
    assert.equal(content.announcementActive, false);
    // Chỉ nhận boolean thật: chuỗi 'false' không được đổi thành false (một khẳng định bịa).
    assert.equal(content.seoRobotsIndex, true);
    assert.deepEqual(content.trustPartnersList, ['A', 'B']);
  });
});

describe('mappers — đối tác xưởng', () => {
  test('region/status có default; capacity_status available ⇒ active', () => {
    const partner = rowToWorkshopPartner({ id: 'w1', name: 'Xưởng A' });
    assert.equal(partner.region, 'hanoi');
    assert.equal(partner.status, 'active');
    assert.deepEqual(partner.maxBuildVolume, { x: 0, y: 0, z: 0 });
    assert.equal(rowToWorkshopPartner({ id: 'w2', name: 'B', capacity_status: 'available' }).status, 'active');
  });
});

describe('mappers — custom_design_requests', () => {
  test('row rỗng: status Pending, nhãn thiếu dữ liệu là —, không bịa nội dung', () => {
    const req = rowToCustomDesignRequest({});
    assert.equal(req.status, 'Pending');
    assert.equal(req.clientInitials, 'KH');
    assert.equal(req.budget, '—');
    assert.equal(req.deadline, '—');
    assert.deepEqual(req.targetSpecs, { material: '—', infill: '—', nozzle: '—' });
    assert.deepEqual(req.messages, []);
  });

  test('map status snake_case, initials từ tên, last message làm preview', () => {
    const req = rowToCustomDesignRequest({
      id: 7,
      status: 'IN_PROGRESS',
      client_name: 'Nguyen Van A',
      target_specs: { material: 'PLA' },
      unread: 1,
      messages: [{ id: 1, sender: 'designer', sender_name: 'D', text: 'xin chào' }],
    });
    assert.equal(req.id, '7');
    assert.equal(req.status, 'In Progress');
    assert.equal(req.clientInitials, 'NG');
    assert.equal(req.previewMessage, 'xin chào');
    assert.equal(req.unread, true);
    assert.equal(req.targetSpecs.material, 'PLA');
    assert.equal(req.messages.length, 1);
    assert.equal(req.messages[0].sender, 'designer');
  });
});
