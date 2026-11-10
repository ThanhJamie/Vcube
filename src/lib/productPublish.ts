/**
 * productPublish — điều kiện ĐĂNG BÁN sản phẩm + quyết định theo TRANSITION (UI-01).
 *
 * VÌ SAO Ở `src/lib/`
 * -------------------
 * Module TRUNG LẬP (thuần, không React/DB): backend service (`database.ts`, `publishGuard.ts`)
 * và admin UI dùng CHUNG một nguồn mà backend không phải import `src/frontend/**`.
 *
 * LUẬT (plan v2 UI-01):
 *   name · category · ≥1 ảnh THẬT (không tính placeholder bịa) · giá > 0 ở ít nhất một
 *   kênh (bản in hoặc tệp số) · giấy phép đã khai · `designer_id` khi `sellerType='designer'`
 *   · status nhận diện được.
 *
 * TRANSITION-AWARE (P1-1)
 * -----------------------
 * Chỉ CHẶN khi lần ghi này BIẾN sản phẩm thành `published` (tạo mới hoặc previous ≠ published).
 * Sản phẩm ĐÃ published từ trước được lưu bình thường (giá/mô tả/tồn…) kể cả khi dữ liệu cũ
 * còn thiếu license/ảnh/designer — UI chỉ CẢNH BÁO, không chặn.
 */

import type { Product } from '../types';
import { realProductImageUrl } from './productImage';
import { isPublishedStatus, normalizeProductStatus } from './productStatus';

export const PRODUCT_LICENSE_TYPES = ['Standard', 'Commercial', 'Exclusive'] as const;

export type PublishIssueCode = 'name' | 'category' | 'image' | 'price' | 'license' | 'seller' | 'status';

export interface PublishReadinessIssue {
  code: PublishIssueCode;
  /** Tên trường trên `Product` (để UI/log chỉ đúng chỗ thiếu). */
  field: string;
  message: string;
}

export interface PublishReadiness {
  ready: boolean;
  issues: PublishReadinessIssue[];
  /** Kênh nào thực sự bán được (có giá > 0). `0` = kênh không bán, KHÔNG phải "miễn phí". */
  channels: { physical: boolean; digital: boolean };
}

/** Kênh bán khả dụng theo giá: `0`/âm/không phải số ⇒ kênh đó KHÔNG bán. */
export function productSellableChannels(
  product: Pick<Product, 'pricePhysical' | 'priceDigital'>
): PublishReadiness['channels'] {
  const finitePositive = (value: unknown): boolean =>
    typeof value === 'number' && Number.isFinite(value) && value > 0;
  return {
    physical: finitePositive(product.pricePhysical),
    digital: finitePositive(product.priceDigital),
  };
}

export function isKnownProductLicense(raw: unknown): boolean {
  return typeof raw === 'string' && (PRODUCT_LICENSE_TYPES as readonly string[]).includes(raw.trim());
}

/**
 * Trạng thái THỰC SỰ được ghi xuống `products.status` — MỘT nguồn cho cả payload và guard
 * (P2-1: `buildProductRowPayload` và publish guard không được hiểu rỗng khác nhau).
 * Rỗng/không khai ⇒ `published` (đúng DEFAULT của cột, xem `20260901_baseline_schema.sql`).
 */
export function resolveStoredProductStatus(raw: unknown): string {
  if (typeof raw === 'string' && raw.trim() !== '') return raw.trim().toLowerCase();
  return 'published';
}

/**
 * Kiểm tra sản phẩm có đủ điều kiện ĐĂNG BÁN hay không (không xét transition).
 * Hàm THUẦN — không đọc DB, không tự sửa dữ liệu; chỉ trả lý do còn thiếu.
 */
export function validateProductForPublish(product: Product): PublishReadiness {
  const issues: PublishReadinessIssue[] = [];
  const channels = productSellableChannels(product);

  if (typeof product.name !== 'string' || product.name.trim() === '') {
    issues.push({ code: 'name', field: 'name', message: 'Thiếu tên sản phẩm' });
  }

  if (typeof product.category !== 'string' || product.category.trim() === '') {
    issues.push({ code: 'category', field: 'category', message: 'Thiếu danh mục sản phẩm' });
  }

  if (!realProductImageUrl(product.images, product.thumbnailUrl)) {
    issues.push({
      code: 'image',
      field: 'images',
      message: 'Cần ít nhất 1 ảnh sản phẩm thật (ảnh hoặc thumbnail)',
    });
  }

  const hasNegativePrice =
    (typeof product.pricePhysical === 'number' && product.pricePhysical < 0) ||
    (typeof product.priceDigital === 'number' && product.priceDigital < 0);
  if (hasNegativePrice) {
    issues.push({ code: 'price', field: 'pricePhysical', message: 'Giá bán không được là số âm' });
  } else if (!channels.physical && !channels.digital) {
    issues.push({
      code: 'price',
      field: 'pricePhysical',
      message: 'Giá bán phải lớn hơn 0 ở ít nhất một kênh (bản in hoặc tệp số)',
    });
  }

  if (!isKnownProductLicense(product.licenseType)) {
    issues.push({
      code: 'license',
      field: 'licenseType',
      message: 'Chưa khai giấy phép sử dụng (Standard / Commercial / Exclusive)',
    });
  }

  // P1-2: chỉ hàng THỰC SỰ do tác giả bán mới cần liên kết; câu lỗi nói đúng đối tượng.
  if (product.sellerType === 'designer' && !(product.designerId || '').trim()) {
    issues.push({
      code: 'seller',
      field: 'designerId',
      message: 'Sản phẩm tác giả cần liên kết designer (designer_id) trước khi đăng bán',
    });
  }

  if (normalizeProductStatus(resolveStoredProductStatus(product.status)) === 'unknown') {
    issues.push({ code: 'status', field: 'status', message: 'Trạng thái sản phẩm không hợp lệ' });
  }

  return { ready: issues.length === 0, issues, channels };
}

/** Gộp lý do thành MỘT câu cho toast/log (UI hiển thị nguyên văn, không cắt bớt). */
export function formatPublishIssues(readiness: PublishReadiness): string {
  return readiness.issues.map((issue) => issue.message).join(' · ');
}

/* ── Transition-aware (P1-1) ──────────────────────────────────────────────── */

export interface PublishGuardContext {
  /**
   * Trạng thái `products.status` TRƯỚC lần ghi (giá trị thô từ DB/UI).
   * `undefined`/`null` + `isCreate=false` = CHƯA BIẾT (service tự đọc hoặc bỏ qua guard).
   */
  previousStatus?: unknown;
  /** `true` khi INSERT sản phẩm mới. */
  isCreate?: boolean;
}

export interface PublishTransition {
  /** Giá trị thực sự ghi xuống DB (đã áp default `published`). */
  storedStatus: string;
  /** Lần ghi này có ghi trạng thái `published` không. */
  targetPublished: boolean;
  /** Sản phẩm đã published TỪ TRƯỚC (không phải transition) ⇒ chỉ cảnh báo. */
  alreadyPublished: boolean;
  /** Lần ghi này BIẾN sản phẩm thành published ⇒ phải đủ điều kiện. */
  enteringPublish: boolean;
  readiness: PublishReadiness;
}

/**
 * Quyết định transition của một lần ghi:
 *  - `isCreate` + published            → entering (phải đủ điều kiện)
 *  - previous đã published + published → already (cho lưu, chỉ cảnh báo)
 *  - previous khác/published trước ≠ published → entering
 *  - target ≠ published                → không xét publish (cho lưu draft/archive…)
 */
export function evaluatePublishTransition(
  product: Product,
  context: PublishGuardContext = {}
): PublishTransition {
  const storedStatus = resolveStoredProductStatus(product.status);
  const targetPublished = isPublishedStatus(storedStatus);
  const previousKnown = context.previousStatus !== undefined && context.previousStatus !== null;
  const previousPublished = previousKnown && isPublishedStatus(context.previousStatus);
  const alreadyPublished = targetPublished && !context.isCreate && previousPublished;
  const enteringPublish = targetPublished && !alreadyPublished;

  return {
    storedStatus,
    targetPublished,
    alreadyPublished,
    enteringPublish,
    readiness: validateProductForPublish(product),
  };
}
