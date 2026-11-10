import type { Product, ProductStatus } from '@/types';
import type { DataTableColumn } from '@frontend/ui';
import { Button, Icon } from '@frontend/ui';
import { formatCurrency } from '@frontend/lib/format';
import { realProductImageUrl } from '@frontend/lib/productImage';
import {
  ADMIN_STATUS_OPTIONS,
  isUnderReviewStatus,
  normalizeProductStatus,
  toAdminSelectStatus,
} from '@frontend/lib/productStatus';
import {
  formatPublishIssues,
  validateProductForPublish,
} from '@frontend/lib/productPublish';

interface AdminProductColumnActions {
  onEditProduct: (product: Product) => void;
  onDeleteRequest: (product: Product) => void;
  onUpdateProduct: (product: Product) => void;
  onShowToast: (message: string) => void;
}

/**
 * Cột bảng `/admin/products` — tách khỏi `AdminProductsPanel` để panel không vượt giới hạn
 * dòng (`scripts/check-max-lines.mjs`) và phần render bảng chỉ nhận callback từ panel.
 *
 * UI-01: cột "Trạng Thái" chặn chọn "Đang bán" khi sản phẩm chưa đủ điều kiện; `title` của
 * select nêu đúng lý do (ảnh/giá/giấy phép/designer) để admin biết cần sửa gì.
 */
export function buildAdminProductColumns({
  onEditProduct,
  onDeleteRequest,
  onUpdateProduct,
  onShowToast,
}: AdminProductColumnActions): DataTableColumn<Product>[] {
  return [
    {
      key: 'name',
      header: 'Ảnh & Sản Phẩm',
      value: (p) => p.name,
      render: (prod) => {
        const imageUrl = realProductImageUrl(prod.images);
        return (
          <div className="flex items-center gap-3">
            {imageUrl ? (
              <img src={imageUrl} alt={prod.name} className="w-11 h-11 rounded-md object-cover border border-line shrink-0" />
            ) : (
              <div
                className="w-11 h-11 rounded-md border border-line-subtle bg-surface-muted text-fg-muted flex items-center justify-center shrink-0"
                title="Chưa có ảnh"
              >
                <Icon name="image" size={16} />
              </div>
            )}
            <div>
              <p className="font-semibold text-fg max-w-[200px] truncate">{prod.name}</p>
              <p className="text-xs text-fg-subtle">{prod.designer || '—'}</p>
              {prod.badge && (
                <span className="mt-0.5 inline-block rounded-sm border border-line bg-primary-tint px-2 py-0.5 font-mono text-xs font-medium text-fg">
                  {prod.badge}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: 'sku',
      header: 'Mã SKU',
      render: (prod) =>
        prod.sku || <span className="text-fg-subtle" title="Chưa có mã SKU">Chưa có mã</span>,
    },
    {
      key: 'category',
      header: 'Danh Mục',
      value: (p) => p.category,
      render: (prod) => <span className="capitalize">{prod.category}</span>,
    },
    {
      key: 'pricePhysical',
      header: 'Giá Bản In (Vật Lý)',
      numeric: true,
      value: (p) => p.pricePhysical,
      render: (prod) => formatCurrency(prod.pricePhysical),
    },
    {
      key: 'priceDigital',
      header: 'Giá Tệp (STL)',
      numeric: true,
      value: (p) => p.priceDigital,
      render: (prod) => formatCurrency(prod.priceDigital),
    },
    {
      key: 'readiness',
      header: 'Chuẩn Sẵn Sàng In',
      value: (p) => p.productionReadiness || 'ready_to_print',
      render: (prod) => {
        const readiness = prod.productionReadiness || 'ready_to_print';
        if (readiness === 'ready_to_print') {
          return (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-positive/20 bg-positive-tint px-2.5 py-1 text-xs font-medium text-positive">
              <Icon name="check" size={12} aria-hidden="true" /> Sẵn Sàng In
            </span>
          );
        }
        if (readiness === 'missing_profile') {
          return (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/20 bg-warning-tint px-2.5 py-1 text-xs font-medium text-warning">
              <Icon name="warning" size={12} aria-hidden="true" /> Thiếu hồ sơ cắt lớp
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-info/20 bg-info-tint px-2.5 py-1 text-xs font-medium text-info">
            Cần duyệt CAD
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Trạng Thái',
      value: (p) => normalizeProductStatus(p.status),
      render: (prod) => {
        // FL-2a-fix: DB lưu lowercase; hiển thị select theo canonical để sản phẩm
        // "under review"/"pending" không rơi về option đầu và mất nhãn "Chờ duyệt".
        const status = toAdminSelectStatus(prod.status);
        const pending = isUnderReviewStatus(prod.status);
        // P1-1: chỉ CHẶN khi đang chuyển từ trạng thái khác SANG published. Hàng ĐÃ published
        // (kể cả legacy thiếu license/ảnh) vẫn đổi trạng thái/lưu bình thường.
        const currentPublished = normalizeProductStatus(prod.status) === 'published';
        const publishReadiness = validateProductForPublish({ ...prod, status: 'published' });
        return (
          <select
            value={status} aria-label={`Trạng thái ${prod.name}`}
            title={
              currentPublished || publishReadiness.ready
                ? undefined
                : `Chưa đủ điều kiện đăng bán: ${formatPublishIssues(publishReadiness)}`
            }
            onChange={(e) => {
              // Admin-all policy: chọn "Đang bán" là publish sản phẩm pending.
              // Lưu đúng giá trị DB ('under review', lowercase) — KHÔNG 'under_review'
              // (policy so `lower(status) in ('under review','pending','draft')`).
              const nextStatus = e.target.value as ProductStatus;
              const nextProduct = { ...prod, status: nextStatus };
              // UI-01: KHÔNG ghi 'published' khi thiếu ảnh/giá/giấy phép/designer — nêu lý do.
              const nextPublished = normalizeProductStatus(nextStatus) === 'published';
              if (nextPublished && !currentPublished && !publishReadiness.ready) {
                onShowToast(
                  `Không thể đăng bán "${prod.name}": ${formatPublishIssues(publishReadiness)}`
                );
                return;
              }
              onUpdateProduct(nextProduct);
            }}
            className={`h-10 cursor-pointer rounded-md border px-2.5 font-mono text-xs font-medium transition-colors duration-200 motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              status === 'published'
                ? 'bg-positive-tint text-positive border-positive/30'
                : pending
                  ? 'bg-warning-tint text-warning border-warning/30'
                  : status === 'draft'
                    ? 'bg-warning-tint text-warning border-warning/30'
                    : 'bg-surface-muted text-fg-muted border-line-control'
            }`}
          >
            {ADMIN_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        );
      },
    },
    {
      key: 'actions',
      header: 'Thao Tác',
      align: 'right',
      render: (prod) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            iconOnly
            variant="ghost"
            size="sm"
            onClick={() => onEditProduct(prod)}
            aria-label={`Sửa ${prod.name}`}
            title="Sửa sản phẩm"
          >
            <Icon name="edit" size={16} />
          </Button>
          <Button
            iconOnly
            variant="danger-ghost"
            size="sm"
            onClick={() => onDeleteRequest(prod)}
            aria-label={`Xoá ${prod.name}`}
            title="Xóa sản phẩm"
          >
            <Icon name="delete" size={16} />
          </Button>
        </div>
      ),
    },
  ];
}
