import React, { useState, useEffect, useMemo } from 'react';
import { Product } from '../../../types';
import { ThreeModelViewer } from '../LazyThreeModelViewer';
import { Button, ConfirmDialog, DataTable, EmptyState, Field, Icon, Input, Modal, Select } from '@frontend/ui';
import type { DataTableColumn } from '@frontend/ui';
import { EMPTY_VALUE, formatCurrency } from '@frontend/lib/format';
import { settingsAccessors, subscribeSettings } from '../../../backend/services/settingsService';
import { useAuth } from '@frontend/context/AuthContext';
import {
  DESIGNER_STATUS_FILTERS,
  DESIGNER_STATUS_OPTIONS,
  isDesignerEditableStatus,
  isDraftStatus,
  isPublishedStatus,
  isUnderReviewStatus,
  normalizeProductStatus,
  productStatusLabel,
  toStoredProductStatus,
} from '@frontend/lib/productStatus';

/**
 * UI-010: nhãn VI cho enum giấy phép / trạng thái xuất bản.
 * Giá trị enum (`Standard`/`Commercial`/`Exclusive`, `Published`/`Under Review`/`Draft`)
 * vẫn chỉ sống trong code + DB; UI không render thô ra cho tác giả Việt.
 */
const LICENSE_LABELS: Record<string, string> = {
  Standard: 'Tiêu chuẩn',
  Commercial: 'Thương mại',
  Exclusive: 'Độc quyền',
};

/** Nhãn danh mục — giá trị `category` trong DB là slug kỹ thuật, không render thô. */
const CATEGORY_LABELS: Record<string, string> = {
  mechanical: 'Cơ khí',
  iot: 'Vỏ hộp IoT',
  robotics: 'Robot',
  art: 'Nghệ thuật',
  tools: 'Công cụ',
};

/**
 * A6 (data-honesty): tỉ lệ bản quyền tác giả đọc từ cấu hình giá thật
 * (`pricing_configs.designerRoyaltyPercent`), KHÔNG dùng số cứng 90%/10%. Chưa cấu hình ⇒
 * `null` ⇒ hiện `—`.
 */
const readDesignerRoyaltyPercent = (): number | null => {
  const v = settingsAccessors.pricingConfig()?.designerRoyaltyPercent;
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
};

function useDesignerRoyaltyPercent(): number | null {
  const [percent, setPercent] = useState<number | null>(readDesignerRoyaltyPercent);
  useEffect(() => subscribeSettings(() => setPercent(readDesignerRoyaltyPercent())), []);
  return percent;
}

export interface DesignerModelsManagerTabProps {
  products: Product[];
  /** Tên tác giả đang đăng nhập — dùng để chỉ hiện ấn phẩm của CHÍNH họ. */
  currentDesignerName: string;
  onUpdateProduct?: (product: Product) => void;
  onDeleteProduct?: (productId: string) => void;
  onShowToast: (message: string) => void;
  onNavigateToUpload: () => void;
}

export const DesignerModelsManagerTab: React.FC<DesignerModelsManagerTabProps> = ({
  products,
  currentDesignerName,
  onUpdateProduct,
  onDeleteProduct,
  onShowToast,
  onNavigateToUpload,
}) => {
  const { user } = useAuth();
  const designerRoyaltyPercent = useDesignerRoyaltyPercent();
  // Filter state
  const [modelCategoryFilter, setModelCategoryFilter] = useState('all');
  const [modelStatusFilter, setModelStatusFilter] = useState('all');
  const [searchModelQuery, setSearchModelQuery] = useState('');

  // Editing Product Modal State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editName, setEditName] = useState('');
  const [editSku, setEditSku] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editPricePhysical, setEditPricePhysical] = useState('');
  const [editPriceDigital, setEditPriceDigital] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editLicense, setEditLicense] = useState<'Standard' | 'Commercial' | 'Exclusive'>('Standard');
  const [editStatus, setEditStatus] = useState<'draft' | 'under review'>('under review');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editTagInput, setEditTagInput] = useState('');

  // 3D Preview Modal State
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);

  // Open Edit Modal — policy DB chỉ cho designer sửa sản phẩm CHƯA xuất bản (APPLY-TODAY §B).
  const handleOpenEditModal = (prod: Product) => {
    if (!isDesignerEditableStatus(prod.status)) {
      onShowToast(
        'Sản phẩm đã xuất bản/lưu trữ: chỉ quản trị viên được sửa. Ấn phẩm chờ duyệt hoặc nháp thì bạn sửa được.'
      );
      return;
    }
    setEditingProduct(prod);
    setEditName(prod.name);
    setEditSku(prod.sku || '');
    setEditCategory(prod.category || 'mechanical');
    setEditPricePhysical(prod.pricePhysical?.toString() || '0');
    setEditPriceDigital(prod.priceDigital?.toString() || '0');
    setEditDesc(prod.description || '');
    setEditLicense(prod.licenseType || 'Standard');
    setEditStatus(isDraftStatus(prod.status) ? 'draft' : 'under review');
    setEditTags(prod.tags || []);
    setEditTagInput('');
  };

  // Save Edit Product Changes
  const handleSaveEditProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    if (!isDesignerEditableStatus(editingProduct.status)) {
      onShowToast('Không sửa được sản phẩm đã xuất bản/lưu trữ — chỉ quản trị viên có quyền.');
      setEditingProduct(null);
      return;
    }

    const updatedProd: Product = {
      ...editingProduct,
      name: editName.trim() || editingProduct.name,
      sku: editSku.trim() || editingProduct.sku,
      category: editCategory || editingProduct.category,
      pricePhysical: Number(editPricePhysical) || editingProduct.pricePhysical,
      priceDigital: Number(editPriceDigital) || editingProduct.priceDigital,
      description: editDesc.trim() || editingProduct.description,
      licenseType: editLicense,
      status: toStoredProductStatus(editStatus) as Product['status'],
      tags: editTags.length > 0 ? editTags : editingProduct.tags,
    };

    if (onUpdateProduct) {
      onUpdateProduct(updatedProd);
    }
    setEditingProduct(null);
    // Không tự báo thành công: App là bên ghi DB và sẽ báo kết quả thật.
  };

  // Quick Toggle Status — designer chỉ đổi trong nhóm CHƯA xuất bản (không tự publish).
  const handleToggleProductStatus = (prod: Product) => {
    if (!isDesignerEditableStatus(prod.status)) {
      onShowToast(
        'Ấn phẩm đã xuất bản — không thể đổi trạng thái. Liên hệ quản trị viên nếu cần hạ xuống bản nháp.'
      );
      return;
    }
    const nextStatus = isDraftStatus(prod.status) ? 'under review' : 'draft';
    const updatedProd: Product = {
      ...prod,
      status: nextStatus as any,
    };
    if (onUpdateProduct) {
      onUpdateProduct(updatedProd);
    }
    // Không tự báo thành công: App là bên ghi DB và sẽ báo kết quả thật.
  };

  // Delete product with confirm (ConfirmDialog thay window.confirm)
  const [pendingDelete, setPendingDelete] = useState<Product | null>(null);
  const handleDeleteConfirm = (prod: Product) => {
    setPendingDelete(prod);
  };

  const handleAddEditTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && editTagInput.trim()) {
      e.preventDefault();
      const val = editTagInput.trim().toLowerCase();
      if (!editTags.includes(val)) {
        setEditTags([...editTags, val]);
      }
      setEditTagInput('');
    }
  };

  const handleRemoveEditTag = (tagToRemove: string) => {
    setEditTags(editTags.filter((t) => t !== tagToRemove));
  };

  // Chỉ ấn phẩm của CHÍNH tác giả: ưu tiên khoá `designerId` (policy products.designer_id),
  // fallback khớp tên cho dữ liệu cũ chưa có designer_id.
  const myProducts = useMemo(
    () =>
      products.filter((p) => {
        if (user?.id && p.designerId) return p.designerId === user.id;
        if (user?.id && p.designerId === undefined) {
          return (p.designer || '').trim().toLowerCase() === currentDesignerName.trim().toLowerCase();
        }
        return (p.designer || '').trim().toLowerCase() === currentDesignerName.trim().toLowerCase();
      }),
    [products, currentDesignerName, user?.id]
  );

  // Filter products
  const filteredProducts = useMemo(() => {
    return myProducts.filter((p) => {
      if (modelCategoryFilter !== 'all' && p.category !== modelCategoryFilter) return false;
      if (modelStatusFilter !== 'all' && normalizeProductStatus(p.status) !== modelStatusFilter)
        return false;
      if (searchModelQuery.trim()) {
        const q = searchModelQuery.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          (p.sku && p.sku.toLowerCase().includes(q)) ||
          p.tags?.some((t) => t.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [myProducts, modelCategoryFilter, modelStatusFilter, searchModelQuery]);

  /** Cột bảng ấn phẩm dùng primitive `DataTable`. */
  const modelColumns = useMemo<DataTableColumn<Product>[]>(() => [
    {
      key: 'name',
      header: 'Ấn phẩm & SKU',
      value: (p) => p.name,
      render: (prod) => (
        <div className="flex items-center gap-3">
          {prod.images?.[0] ? (
            <img src={prod.images[0]} alt={prod.name} className="size-12 shrink-0 rounded-md border border-line bg-surface-muted object-cover" />
          ) : (
            <span className="grid size-12 shrink-0 place-items-center rounded-md border border-line bg-surface-muted text-fg-muted">
              <Icon name="deployed_code" size={20} />
            </span>
          )}
          <div>
            <span className="block font-semibold leading-tight text-fg">{prod.name}</span>
            <div className="mt-0.5 flex items-center gap-2">
              <span className="font-mono text-xs text-fg-muted">SKU: {prod.sku || '—'}</span>
              <span className="rounded-sm bg-surface-muted px-1.5 py-0.5 font-mono text-xs uppercase text-fg-muted">
                {CATEGORY_LABELS[prod.category] ?? prod.category}
              </span>
            </div>
          </div>
        </div>
      ),
    },
    { key: 'designer', header: 'Tác giả', value: (p) => p.designer || '', render: (prod) => <span className="text-sm text-fg-muted">{prod.designer || '—'}</span> },
    {
      key: 'licenseType',
      header: 'Giấy phép',
      value: (p) => p.licenseType || 'Standard',
      render: (prod) => (
        <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary-tint px-2.5 py-1 text-xs font-medium text-primary">
          {LICENSE_LABELS[prod.licenseType || 'Standard'] ?? 'Tiêu chuẩn'}
        </span>
      ),
    },
    { key: 'priceDigital', header: 'Giá tải tệp số', numeric: true, value: (p) => p.priceDigital ?? 0, render: (prod) => <span className="font-semibold text-fg">{formatCurrency(prod.priceDigital)}</span> },
    { key: 'pricePhysical', header: 'Giá in 3D vật lý', numeric: true, value: (p) => p.pricePhysical ?? 0, render: (prod) => <span className="font-semibold text-fg">{formatCurrency(prod.pricePhysical)}</span> },
    {
      key: 'status',
      header: 'Trạng thái',
      align: 'center',
      value: (p) => normalizeProductStatus(p.status),
      render: (prod) => {
        const underReview = isUnderReviewStatus(prod.status);
        const draft = isDraftStatus(prod.status);
        const published = isPublishedStatus(prod.status);
        return (
          <button
            onClick={() => handleToggleProductStatus(prod)}
            title="Bấm để đổi trạng thái xuất bản (chỉ nháp/chờ duyệt; publish do quản trị viên)"
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              underReview
                ? 'border-warning/20 bg-warning-tint text-warning'
                : draft
                  ? 'border-line bg-surface-muted text-fg-muted'
                  : published
                    ? 'border-positive/20 bg-positive-tint text-positive'
                    : 'border-line bg-surface-muted text-fg-muted'
            }`}
          >
            <span
              aria-hidden="true"
              className={`size-1.5 rounded-full ${
                underReview ? 'bg-warning' : draft ? 'bg-fg-subtle' : published ? 'bg-positive' : 'bg-fg-subtle'
              }`}
            />
            {productStatusLabel(prod.status)}
          </button>
        );
      },
    },
    {
      key: 'actions',
      header: 'Hành động',
      align: 'right',
      render: (prod) => (
        <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleOpenEditModal(prod)}
            leadingIcon={<Icon name="edit" size={16} />}
          >
            {'Sửa & giá'}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setPreviewProduct(prod)}
            leadingIcon={<Icon name="view_in_ar" size={16} />}
          >
            Xem 3D
          </Button>
          <Button
            iconOnly
            size="sm"
            variant="danger-ghost"
            aria-label={`Xoá ${prod.name}`}
            title="Xoá ấn phẩm"
            onClick={() => handleDeleteConfirm(prod)}
            leadingIcon={<Icon name="delete" size={16} />}
          />
        </div>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], []);

  return (
    <div className="space-y-4">
      <ConfirmDialog
        open={pendingDelete !== null}
        tone="danger"
        title="Xoá ấn phẩm"
        description={pendingDelete ? `Bạn có chắc chắn muốn xoá ấn phẩm "${pendingDelete.name}" khỏi danh mục ấn phẩm? Hành động này không hoàn tác được.` : ''}
        confirmLabel="Xoá ấn phẩm"
        cancelLabel="Huỷ"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (!pendingDelete) return;
          onDeleteProduct?.(pendingDelete.id);
          setPendingDelete(null);
        }}
      />
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div className="space-y-1">
          <h2 className="text-lg font-bold tracking-tight text-fg">Kho ấn phẩm &amp; điều chỉnh giá in</h2>
          <p className="max-w-prose text-sm text-fg-muted">
            Quản lý {myProducts.length} ấn phẩm của bạn trong cơ sở dữ liệu ấn phẩm. Bạn có thể chỉnh sửa
            thông tin kỹ thuật, giá in vật lý và giá tệp số.
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center md:w-auto">
          <Field label="Tìm ấn phẩm" hideLabel className="w-full sm:w-52">
            {(control) => (
              <Input
                {...control}
                type="search"
                size="sm"
                placeholder="Tìm theo tên, SKU, thẻ…"
                value={searchModelQuery}
                onChange={(e) => setSearchModelQuery(e.target.value)}
              />
            )}
          </Field>

          <Field label="Lọc theo danh mục" hideLabel className="w-full sm:w-auto">
            {(control) => (
              <Select
                {...control}
                size="sm"
                value={modelCategoryFilter}
                onChange={(e) => setModelCategoryFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'Mọi danh mục' },
                  { value: 'mechanical', label: 'Cơ khí' },
                  { value: 'iot', label: 'Vỏ hộp IoT' },
                  { value: 'robotics', label: 'Robot' },
                  { value: 'art', label: 'Nghệ thuật' },
                  { value: 'tools', label: 'Công cụ' },
                ]}
              />
            )}
          </Field>

          <Field label="Lọc theo trạng thái" hideLabel className="w-full sm:w-auto">
            {(control) => (
              <Select
                {...control}
                size="sm"
                value={modelStatusFilter}
                onChange={(e) => setModelStatusFilter(e.target.value)}
                options={DESIGNER_STATUS_FILTERS.map((o) => ({ value: o.value, label: o.label }))}
              />
            )}
          </Field>
        </div>
      </div>

      {/* Models Table */}
      <DataTable<Product>
        columns={modelColumns}
        rows={filteredProducts}
        getRowId={(row) => row.id}
        caption="Ấn phẩm của tôi"
        tableLabel="Ấn phẩm của tôi"
        defaultSort={[{ key: 'name', direction: 'asc' }]}
        emptyState={
          <EmptyState
            live
            title="Không tìm thấy ấn phẩm nào phù hợp"
            description="Thử xoá từ khoá hoặc đổi bộ lọc."
            action={<Button variant="primary" size="sm" onClick={onNavigateToUpload}>Đăng tải ấn phẩm mới</Button>}
          />
        }
      />

      {/* MODAL 1: EDIT PRODUCT DETAILS & PRICING */}
      {editingProduct && (
        <Modal
          open
          onClose={() => setEditingProduct(null)}
          size="lg"
          title={<span className="flex items-center gap-2"><Icon name="edit" size={22} className="text-primary" />{'Chỉnh sửa ấn phẩm & giá in'}</span>}
        >
            <form onSubmit={handleSaveEditProduct} className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Tên ấn phẩm" required>
                  {(control) => (
                    <Input
                      {...control}
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                  )}
                </Field>

                <Field label="Mã SKU">
                  {(control) => (
                    <Input
                      {...control}
                      type="text"
                      value={editSku}
                      onChange={(e) => setEditSku(e.target.value)}
                      className="font-mono"
                    />
                  )}
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Field label="Danh mục">
                  {(control) => (
                    <Select
                      {...control}
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      options={[
                        { value: 'mechanical', label: 'Cơ khí chính xác' },
                        { value: 'iot', label: 'Vỏ hộp IoT' },
                        { value: 'robotics', label: 'Robot & tự động hoá' },
                        { value: 'art', label: 'Nghệ thuật & trang trí' },
                        { value: 'tools', label: 'Dụng cụ & đồ gá' },
                      ]}
                    />
                  )}
                </Field>

                <Field label="Giấy phép bản quyền">
                  {(control) => (
                    <Select
                      {...control}
                      value={editLicense}
                      onChange={(e) => setEditLicense(e.target.value as any)}
                      options={[
                        { value: 'Standard', label: 'Tiêu chuẩn (cá nhân)' },
                        { value: 'Commercial', label: 'Thương mại' },
                        { value: 'Exclusive', label: 'Độc quyền' },
                      ]}
                    />
                  )}
                </Field>

                <Field label="Trạng thái xuất bản">
                  {(control) => (
                    <Select
                      {...control}
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as 'draft' | 'under review')}
                      options={DESIGNER_STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                    />
                  )}
                </Field>
              </div>

              {/* PRICING FIELDS */}
              <div className="space-y-3 rounded-md border border-line-subtle bg-surface-muted p-4">
                <span className="block text-xs font-semibold uppercase tracking-wider text-fg-muted">
                  ĐIỀU CHỈNH GIÁ BÁN &amp; HOA HỒNG (₫)
                </span>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <Field label="Giá tải tệp thiết kế số">
                      {(control) => (
                        <div className="relative">
                          <Input
                            {...control}
                            type="number"
                            numeric
                            value={editPriceDigital}
                            onChange={(e) => setEditPriceDigital(e.target.value)}
                            className="pr-8 font-semibold"
                          />
                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-fg-muted">
                            ₫
                          </span>
                        </div>
                      )}
                    </Field>
                    <p className="mt-1 text-xs text-fg-muted">
                      Tác giả nhận: <strong>{EMPTY_VALUE}</strong> — tỉ lệ bản quyền tệp số không
                      nằm trong cấu hình giá, VCUBE công bố khi quyết toán.
                    </p>
                  </div>

                  <div>
                    <Field label="Giá in 3D vật lý thành phẩm">
                      {(control) => (
                        <div className="relative">
                          <Input
                            {...control}
                            type="number"
                            numeric
                            value={editPricePhysical}
                            onChange={(e) => setEditPricePhysical(e.target.value)}
                            className="pr-8 font-semibold"
                          />
                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-fg-muted">
                            ₫
                          </span>
                        </div>
                      )}
                    </Field>
                    {designerRoyaltyPercent !== null ? (
                      <p className="mt-1 text-xs text-fg-muted">
                        Bản quyền tác giả theo cấu hình giá:{' '}
                        <strong>{designerRoyaltyPercent}%</strong> — số tiền quyết toán theo công
                        thức giá của VCUBE.
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-fg-muted">
                        Hoa hồng tác giả: <strong>{EMPTY_VALUE}</strong> (chưa cấu hình tỉ lệ bản
                        quyền trong giá)
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <span className="mb-1 block text-sm font-medium text-fg">
                  Thẻ phân loại
                </span>
                <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-md border border-line-control bg-surface p-2">
                  {editTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-sm bg-primary-tint px-2 py-0.5 text-xs text-fg"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveEditTag(tag)}
                        aria-label={`Xoá thẻ ${tag}`}
                        className="rounded-sm text-fg-muted transition-colors hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    placeholder="Thêm thẻ (nhấn Enter)…"
                    aria-label="Thêm thẻ phân loại"
                    value={editTagInput}
                    onChange={(e) => setEditTagInput(e.target.value)}
                    onKeyDown={handleAddEditTag}
                    className="min-w-[100px] flex-1 border-none bg-transparent p-0 text-sm text-fg placeholder:text-fg-subtle rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              </div>

              <Field label="Mô tả kỹ thuật">
                {(control) => (
                  <textarea
                    {...control}
                    rows={3}
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    className="w-full rounded-md border border-line-control bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                )}
              </Field>

              <div className="flex flex-wrap justify-end gap-2 border-t border-line-subtle pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setEditingProduct(null)}
                >
                  Huỷ
                </Button>
                <Button type="submit" variant="primary">
                  Lưu thay đổi
                </Button>
              </div>
            </form>
        </Modal>
      )}

      {/* MODAL 2: 3D PREVIEW INSPECTION */}
      {previewProduct && (
        <Modal
          open
          onClose={() => setPreviewProduct(null)}
          size="lg"
          title={previewProduct.name}
          description={`SKU: ${previewProduct.sku || '—'} • ${CATEGORY_LABELS[previewProduct.category] ?? previewProduct.category}`}
        >

            <div className="rounded-lg border border-line bg-surface-muted p-2">
              <ThreeModelViewer
                modelType={previewProduct.category === 'iot' ? 'case' : 'gear'}
                color="#E0DDD5"
                className="h-[320px] w-full"
              />
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div className="rounded-md border border-line-subtle bg-surface p-3">
                <span className="block text-xs font-semibold uppercase tracking-wider text-fg-muted">GIÁ TẢI SỐ</span>
                <span className="font-mono text-sm font-semibold tabular-nums text-fg">
                  {formatCurrency(previewProduct.priceDigital)}
                </span>
              </div>
              <div className="rounded-md border border-line-subtle bg-surface p-3">
                <span className="block text-xs font-semibold uppercase tracking-wider text-fg-muted">GIÁ IN VẬT LÝ</span>
                <span className="font-mono text-sm font-semibold tabular-nums text-fg">
                  {formatCurrency(previewProduct.pricePhysical)}
                </span>
              </div>
              <div className="rounded-md border border-line-subtle bg-surface p-3">
                <span className="block text-xs font-semibold uppercase tracking-wider text-fg-muted">GIẤY PHÉP</span>
                <span className="text-sm font-semibold text-fg">
                  {LICENSE_LABELS[previewProduct.licenseType || 'Standard'] ?? 'Tiêu chuẩn'}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t border-line-subtle pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setPreviewProduct(null)}
              >
                Đóng
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={() => {
                  const prod = previewProduct;
                  setPreviewProduct(null);
                  handleOpenEditModal(prod);
                }}
              >
                Chỉnh sửa bản vẽ này
              </Button>
            </div>
        </Modal>
      )}
    </div>
  );
};
