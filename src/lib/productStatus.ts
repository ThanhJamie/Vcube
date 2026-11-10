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
