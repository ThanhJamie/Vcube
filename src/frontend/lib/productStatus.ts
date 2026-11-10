/**
 * productStatus — chuẩn hoá trạng thái xuất bản của `products` (FL-2a-fix).
 *
 * VÌ SAO CÓ FILE NÀY
 * ------------------
 * DB lưu `status` là **lowercase** (`saveProduct`/`insertProduct` normalize `.toLowerCase()`)
 * trong khi UI cũ so sánh chuỗi chữ hoa (`'Under Review'`, `'Published'`, `'Draft'`) ⇒ designer
 * thấy "Đã xuất bản" cho sản phẩm đang chờ duyệt, filter không khớp, toggle ghi sai trạng thái.
 * Migration `products` (APPLY-TODAY) còn dùng `lower(status) in ('under review','pending','draft')`
 * làm điều kiện policy ⇒ code phải so sánh cùng một canonical.
 *
 * Canonical (một nguồn duy nhất):
 *   draft · under_review · pending · published · archived · unknown
 * `pending` giữ riêng (giá trị hợp lệ trong policy) nhưng UI hiểu là "chờ duyệt" như under_review.
 *
 * File thuần (không import React/DB) để unit-test được.
 */

import type { Product } from '../../types';
import { realProductImageUrl } from './productImage';

export type CanonicalProductStatus =
  | 'draft'
  | 'under_review'
  | 'pending'
  | 'published'
  | 'archived'
  | 'unknown';

const CANONICAL_MAP: Record<string, CanonicalProductStatus> = {
  draft: 'draft',
  'bản nháp': 'draft',
  'ban nhap': 'draft',
  'under review': 'under_review',
  'under_review': 'under_review',
  'under-review': 'under_review',
  'in review': 'under_review',
  'review': 'under_review',
  'pending review': 'pending',
  'pending_review': 'pending',
  pending: 'pending',
  published: 'published',
  publish: 'published',
  live: 'published',
  active: 'published',
  archived: 'archived',
  archive: 'archived',
  'lưu trữ': 'archived',
  'luu tru': 'archived',
};

/** Chuẩn hoá bất kỳ giá trị `status` nào (NULL/hoa/thừa khoảng trắng/gạch) về canonical. */
export function normalizeProductStatus(raw: unknown): CanonicalProductStatus {
  if (typeof raw !== 'string') return 'unknown';
  const key = raw
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, ' ')
    .replace(/\s+/g, ' ');
  if (!key) return 'unknown';
  return CANONICAL_MAP[key] ?? 'unknown';
}

/** Chờ duyệt: `under review` hoặc `pending` (cả hai đều không hiển thị công khai). */
export function isUnderReviewStatus(raw: unknown): boolean {
  const status = normalizeProductStatus(raw);
  return status === 'under_review' || status === 'pending';
}

export function isPublishedStatus(raw: unknown): boolean {
  return normalizeProductStatus(raw) === 'published';
}

export function isDraftStatus(raw: unknown): boolean {
  return normalizeProductStatus(raw) === 'draft';
}

/**
 * Designer được sửa/xoá sản phẩm của mình khi CHƯA xuất bản — khớp policy
 * `lower(status) in ('under review','pending','draft')` (APPLY-TODAY §B).
 */
export function isDesignerEditableStatus(raw: unknown): boolean {
  const status = normalizeProductStatus(raw);
  return status === 'draft' || status === 'under_review' || status === 'pending';
}

/** Nhãn VI hiển thị (không render enum thô). */
const LABELS: Record<CanonicalProductStatus, string> = {
  draft: 'Nháp',
  under_review: 'Chờ duyệt',
  pending: 'Chờ duyệt',
  published: 'Đã đăng',
  archived: 'Lưu trữ',
  unknown: '—',
};

export function productStatusLabel(raw: unknown): string {
  return LABELS[normalizeProductStatus(raw)];
}

/** Nhãn ngắn cho badge — giữ tương thích các chỗ cũ ("Đã xuất bản"). */
export function productStatusLabelLong(raw: unknown): string {
  const status = normalizeProductStatus(raw);
  if (status === 'published') return 'Đã xuất bản';
  if (status === 'draft') return 'Bản nháp';
  return LABELS[status];
}

/** Giá trị lưu DB khi designer đổi trạng thái (luôn lowercase, khớp policy). */
export function toStoredProductStatus(raw: unknown): 'draft' | 'under review' | 'pending' {
  const status = normalizeProductStatus(raw);
  if (status === 'pending') return 'pending';
  // Designer KHÔNG được tự publish/archive: mọi lựa chọn khác quy về under review.
  if (status === 'draft') return 'draft';
  return 'under review';
}

/** Danh sách trạng thái designer ĐƯỢC đặt (không có published — admin là bên publish). */
export const DESIGNER_STATUS_OPTIONS: ReadonlyArray<{ value: 'draft' | 'under review'; label: string }> = [
  { value: 'draft', label: 'Nháp' },
  { value: 'under review', label: 'Chờ duyệt' },
];

/** Bộ lọc trạng thái trong /designer (canonical, so sánh không phân biệt hoa thường). */
export const DESIGNER_STATUS_FILTERS: ReadonlyArray<{ value: 'all' | CanonicalProductStatus; label: string }> = [
  { value: 'all', label: 'Mọi trạng thái' },
  { value: 'published', label: 'Đã đăng' },
  { value: 'under_review', label: 'Chờ duyệt' },
  { value: 'draft', label: 'Nháp' },
  { value: 'archived', label: 'Lưu trữ' },
];

/** Trạng thái admin chọn trong `/admin/products` (giá trị lưu DB đúng canonical cũ). */
export const ADMIN_STATUS_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'published', label: 'Đang bán' },
  { value: 'under review', label: 'Chờ duyệt' },
  { value: 'draft', label: 'Bản nháp' },
  { value: 'archived', label: 'Lưu trữ' },
];

/** Map canonical → giá trị hiển thị trong `<select>` admin (under_review/pending → 'under review'). */
export function toAdminSelectStatus(raw: unknown): string {
  const status = normalizeProductStatus(raw);
  if (status === 'under_review' || status === 'pending') return 'under review';
  if (status === 'published' || status === 'draft' || status === 'archived') return status;
  return 'published';
}

/* ============================================================================
 * UI-01 — Publish readiness (một nguồn duy nhất cho UI + `dbService`)
 * ========================================================================== */

/**
 * VÌ SAO ĐẶT Ở ĐÂY
 * ----------------
 * `products.status` và điều kiện được phép đăng bán là CÙNG một khái niệm, nên canonical
 * status + readiness dùng chung một file thuần (không React/DB) ⇒ admin UI và `dbService`
 * (`saveProduct`/`insertProduct`) không thể lệch nhau.
 *
 * LUẬT (theo `docs/po/IMPLEMENTATION-PLAN-V2-2026-11-10.md` UI-01):
 *   name · category · ≥1 ảnh THẬT (không tính placeholder bịa) · giá > 0 ở ít nhất một
 *   kênh (bản in hoặc tệp số) · giấy phép đã khai · `designer_id` nếu `sellerType='designer'`
 *   · status nhận diện được.
 * Sản phẩm `sellerType='platform'` (hoặc chưa khai) KHÔNG cần designer — nền tảng tự bán.
 */

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
 * Kiểm tra sản phẩm có đủ điều kiện ĐĂNG BÁN (`status='published'`) hay không.
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

  if (product.sellerType === 'designer' && !(product.designerId || '').trim()) {
    issues.push({
      code: 'seller',
      field: 'designerId',
      message: 'Sản phẩm của tác giả phải có designer_id liên kết',
    });
  }

  if (normalizeProductStatus(product.status) === 'unknown') {
    issues.push({ code: 'status', field: 'status', message: 'Trạng thái sản phẩm không hợp lệ' });
  }

  return { ready: issues.length === 0, issues, channels };
}

/** Gộp lý do thành MỘT câu cho toast/log (UI hiển thị nguyên văn, không cắt bớt). */
export function formatPublishIssues(readiness: PublishReadiness): string {
  return readiness.issues.map((issue) => issue.message).join(' · ');
}
