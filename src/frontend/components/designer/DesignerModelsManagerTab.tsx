import React, { useState, useEffect, useMemo } from 'react';
import { Product } from '../../../types';
import { ThreeModelViewer } from '../ThreeModelViewer';
import { Button, ConfirmDialog, DataTable, EmptyState, Icon, Modal } from '@frontend/ui';
import type { DataTableColumn } from '@frontend/ui';
import { EMPTY_VALUE, formatCurrency } from '@frontend/lib/format';
import { useLanguage } from '../../context/LanguageContext';
import { settingsAccessors, subscribeSettings } from '../../../backend/services/settingsService';

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
  const { language } = useLanguage();
  const isVi = language === 'vi';
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
  const [editStatus, setEditStatus] = useState<'Published' | 'Under Review' | 'Draft'>('Published');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editTagInput, setEditTagInput] = useState('');

  // 3D Preview Modal State
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);

  // Open Edit Modal
  const handleOpenEditModal = (prod: Product) => {
    setEditingProduct(prod);
    setEditName(prod.name);
    setEditSku(prod.sku || '');
    setEditCategory(prod.category || 'mechanical');
    setEditPricePhysical(prod.pricePhysical?.toString() || '0');
    setEditPriceDigital(prod.priceDigital?.toString() || '0');
    setEditDesc(prod.description || '');
    setEditLicense(prod.licenseType || 'Standard');
    setEditStatus((prod.status as any) || 'Published');
    setEditTags(prod.tags || []);
    setEditTagInput('');
  };

  // Save Edit Product Changes
  const handleSaveEditProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    const updatedProd: Product = {
      ...editingProduct,
      name: editName.trim() || editingProduct.name,
      sku: editSku.trim() || editingProduct.sku,
      category: editCategory || editingProduct.category,
      pricePhysical: Number(editPricePhysical) || editingProduct.pricePhysical,
      priceDigital: Number(editPriceDigital) || editingProduct.priceDigital,
      description: editDesc.trim() || editingProduct.description,
      licenseType: editLicense,
      status: editStatus as any,
      tags: editTags.length > 0 ? editTags : editingProduct.tags,
    };

    if (onUpdateProduct) {
      onUpdateProduct(updatedProd);
    }
    setEditingProduct(null);
    // Không tự báo thành công: App là bên ghi DB và sẽ báo kết quả thật.
  };

  // Quick Toggle Status
  const handleToggleProductStatus = (prod: Product) => {
    const nextStatus = prod.status === 'Published' ? 'Draft' : 'Published';
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

  // Chỉ ấn phẩm của CHÍNH tác giả đang đăng nhập (khớp tên chính xác, không dò chuỗi tên).
  const myProducts = useMemo(
    () =>
      products.filter(
        (p) => (p.designer || '').trim().toLowerCase() === currentDesignerName.trim().toLowerCase()
      ),
    [products, currentDesignerName]
  );

  // Filter products
  const filteredProducts = useMemo(() => {
    return myProducts.filter((p) => {
      if (modelCategoryFilter !== 'all' && p.category !== modelCategoryFilter) return false;
      if (modelStatusFilter !== 'all' && (p.status || 'Published') !== modelStatusFilter)
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
      header: isVi ? 'Ấn Phẩm & SKU' : 'Model & SKU',
      value: (p) => p.name,
      render: (prod) => (
        <div className="flex items-center gap-3">
          {prod.images?.[0] ? (
            <img src={prod.images[0]} alt={prod.name} className="w-12 h-12 object-cover border border-line rounded-sm shrink-0 bg-surface-inverse" />
          ) : (
            <span className="w-12 h-12 border border-line rounded-sm shrink-0 bg-surface-muted text-fg-subtle flex items-center justify-center">
              <Icon name="deployed_code" size={20} />
            </span>
          )}
          <div>
            <span className="font-bold text-fg block leading-tight">{prod.name}</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-tech text-xs text-fg-muted">SKU: {prod.sku || '—'}</span>
              <span className="px-1.5 py-0.5 bg-line-subtle text-fg font-tech text-xs rounded-sm uppercase">{prod.category}</span>
            </div>
          </div>
        </div>
      ),
    },
    { key: 'designer', header: isVi ? 'Tác Giả' : 'Designer', value: (p) => p.designer || '', render: (prod) => <span className="font-medium text-xs">{prod.designer || '—'}</span> },
    {
      key: 'licenseType',
      header: isVi ? 'Giấy Phép' : 'License',
      value: (p) => p.licenseType || 'Standard',
      render: (prod) => (
        <span className="px-2 py-0.5 bg-primary/10 border border-line rounded-sm text-xs font-bold text-primary">
          {prod.licenseType || 'Standard'}
        </span>
      ),
    },
    { key: 'priceDigital', header: isVi ? 'Giá Tải File Số' : 'Digital price', numeric: true, value: (p) => p.priceDigital ?? 0, render: (prod) => <span className="font-bold text-fg text-xs">{formatCurrency(prod.priceDigital)}</span> },
    { key: 'pricePhysical', header: isVi ? 'Giá In 3D Vật Lý' : 'Physical price', numeric: true, value: (p) => p.pricePhysical ?? 0, render: (prod) => <span className="font-bold text-fg text-xs">{formatCurrency(prod.pricePhysical)}</span> },
    {
      key: 'status',
      header: isVi ? 'Trạng Thái' : 'Status',
      align: 'center',
      value: (p) => p.status || 'Published',
      render: (prod) => (
        <button
          onClick={() => handleToggleProductStatus(prod)}
          title={isVi ? 'Bấm để đổi trạng thái' : 'Click to toggle status'}
          className={`px-2.5 py-1 text-xs font-tech font-bold uppercase rounded-full transition-colors ${
            prod.status === 'Under Review'
              ? 'bg-warning/10 text-warning border border-warning/30'
              : prod.status === 'Draft'
              ? 'bg-line-subtle text-fg-muted border border-line-control'
              : 'bg-positive/10 text-positive border border-positive/30'
          }`}
        >
          {prod.status || 'Published'}
        </button>
      ),
    },
    {
      key: 'actions',
      header: isVi ? 'Hành Động' : 'Actions',
      align: 'right',
      render: (prod) => (
        <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
          <button
            onClick={() => handleOpenEditModal(prod)}
            className="px-2.5 py-1.5 bg-primary hover:bg-primary-hover text-primary-fg rounded-full text-xs uppercase font-bold transition-colors inline-flex items-center gap-1 touch-target-btn shadow-e1"
          >
            <Icon name="edit" size={18} />
            {isVi ? 'Sửa & Giá' : 'Edit'}
          </button>
          <button
            onClick={() => setPreviewProduct(prod)}
            className="px-2.5 py-1.5 border border-line-control hover:bg-line-subtle text-fg rounded-full text-xs uppercase font-bold transition-colors inline-flex items-center gap-1 touch-target-btn"
          >
            <Icon name="view_in_ar" size={18} />
            {isVi ? 'Xem 3D' : '3D'}
          </button>
          <Button
            iconOnly
            size="sm"
            variant="danger-ghost"
            aria-label={isVi ? `Xoá ${prod.name}` : `Delete ${prod.name}`}
            title={isVi ? 'Xóa ấn phẩm' : 'Delete'}
            onClick={() => handleDeleteConfirm(prod)}
            leadingIcon={<Icon name="delete" size={14} />}
          />
        </div>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [isVi]);

  return (
    <div className="space-y-4">
      <ConfirmDialog
        open={pendingDelete !== null}
        tone="danger"
        title="Xoá ấn phẩm"
        description={pendingDelete ? `Bạn có chắc chắn muốn xoá ấn phẩm "${pendingDelete.name}" khỏi Catalog? Hành động này không hoàn tác được.` : ''}
        confirmLabel="Xoá ấn phẩm"
        cancelLabel="Huỷ"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (!pendingDelete) return;
          onDeleteProduct?.(pendingDelete.id);
          setPendingDelete(null);
        }}
      />
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h2 className="text-lg font-bold text-fg">Kho Ấn Phẩm &amp; Điều Chỉnh Giá In</h2>
          <p className="text-xs text-fg-muted">
            Quản lý {myProducts.length} ấn phẩm của bạn trong Catalog DB. Bạn có thể chỉnh sửa thông tin kỹ
            thuật, giá in vật lý và giá file số.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <input
            type="text"
            placeholder="Tìm theo tên, SKU, tag..."
            value={searchModelQuery}
            onChange={(e) => setSearchModelQuery(e.target.value)}
            className="bg-surface border border-line-control px-3 py-2 text-xs rounded-sm w-full sm:w-52 focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-ring"
          />

          <select
            value={modelCategoryFilter}
            onChange={(e) => setModelCategoryFilter(e.target.value)}
            className="bg-surface border border-line-control px-3 py-2 text-xs rounded-sm focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="all">Mọi Danh Mục</option>
            <option value="mechanical">Cơ khí</option>
            <option value="iot">Vỏ hộp IoT</option>
            <option value="robotics">Robot</option>
            <option value="art">Nghệ thuật</option>
            <option value="tools">Công cụ</option>
          </select>

          <select
            value={modelStatusFilter}
            onChange={(e) => setModelStatusFilter(e.target.value)}
            className="bg-surface border border-line-control px-3 py-2 text-xs rounded-sm focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="all">Mọi Trạng Thái</option>
            <option value="Published">Đã Xuất Bản</option>
            <option value="Under Review">Chờ Duyệt</option>
            <option value="Draft">Bản Nháp</option>
          </select>
        </div>
      </div>

      {/* Models Table */}
      <DataTable<Product>
        columns={modelColumns}
        rows={filteredProducts}
        getRowId={(row) => row.id}
        caption={isVi ? 'Ấn phẩm của tôi' : 'My models'}
        tableLabel={isVi ? 'Ấn phẩm của tôi' : 'My models'}
        defaultSort={[{ key: 'name', direction: 'asc' }]}
        emptyState={
          <EmptyState
            live
            title={isVi ? 'Không tìm thấy ấn phẩm nào phù hợp' : 'No matching models'}
            description={isVi ? 'Thử xoá từ khoá hoặc đổi bộ lọc.' : 'Clear the search or change the filter.'}
            action={<Button variant="primary" size="sm" onClick={onNavigateToUpload}>{isVi ? 'Đăng tải ấn phẩm mới' : 'Upload new model'}</Button>}
          />
        }
      />

      {/* MODAL 1: EDIT PRODUCT DETAILS & PRICING */}
      {editingProduct && (
        <Modal
          open
          onClose={() => setEditingProduct(null)}
          size="lg"
          title={<span className="flex items-center gap-2"><Icon name="edit" size={22} className="text-primary" />{isVi ? 'Chỉnh Sửa Ấn Phẩm & Giá In (Catalog DB)' : 'Edit model & pricing'}</span>}
        >
            <form onSubmit={handleSaveEditProduct} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs uppercase font-bold text-fg-muted block mb-1">
                    Tên Ấn Phẩm:
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-canvas border border-line-control p-2 rounded-sm text-xs focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>

                <div>
                  <label className="text-xs uppercase font-bold text-fg-muted block mb-1">
                    Mã SKU:
                  </label>
                  <input
                    type="text"
                    value={editSku}
                    onChange={(e) => setEditSku(e.target.value)}
                    className="w-full bg-canvas border border-line-control p-2 rounded-sm text-xs font-tech focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs uppercase font-bold text-fg-muted block mb-1">
                    Danh Mục:
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full bg-canvas border border-line-control p-2 rounded-sm text-xs focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="mechanical">Cơ khí chính xác</option>
                    <option value="iot">Vỏ hộp IoT</option>
                    <option value="robotics">Robot &amp; Automation</option>
                    <option value="art">Nghệ thuật &amp; Decor</option>
                    <option value="tools">Dụng cụ &amp; Đồ gá</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs uppercase font-bold text-fg-muted block mb-1">
                    Giấy Phép (License):
                  </label>
                  <select
                    value={editLicense}
                    onChange={(e) => setEditLicense(e.target.value as any)}
                    className="w-full bg-canvas border border-line-control p-2 rounded-sm text-xs focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="Standard">Standard (Cá nhân)</option>
                    <option value="Commercial">Commercial (Thương mại)</option>
                    <option value="Exclusive">Exclusive (Độc quyền)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs uppercase font-bold text-fg-muted block mb-1">
                    Trạng Thái Xuất Bản:
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full bg-canvas border border-line-control p-2 rounded-sm text-xs focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="Published">Published (Đã xuất bản)</option>
                    <option value="Under Review">Under Review (Chờ duyệt)</option>
                    <option value="Draft">Draft (Bản nháp)</option>
                  </select>
                </div>
              </div>

              {/* PRICING FIELDS */}
              <div className="p-3.5 bg-primary/10 border border-line rounded-sm space-y-3">
                <span className="font-bold text-xs text-primary block uppercase font-tech">
                  ĐIỀU CHỈNH GIÁ BÁN &amp; HOA HỒNG (VNĐ)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs uppercase font-bold text-fg block mb-1">
                      Giá Tải File Thiết Kế Số:
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={editPriceDigital}
                        onChange={(e) => setEditPriceDigital(e.target.value)}
                        className="w-full bg-surface border border-line-control p-2 text-xs font-tech font-bold rounded-sm focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-ring"
                      />
                      <span className="absolute right-2.5 top-2 text-xs font-tech text-fg-muted">
                        đ
                      </span>
                    </div>
                    <p className="text-xs text-fg-muted font-tech mt-1">
                      Tác giả nhận: <strong>{EMPTY_VALUE}</strong> — tỉ lệ bản quyền file số không
                      nằm trong cấu hình giá, VCUBE công bố khi quyết toán.
                    </p>
                  </div>

                  <div>
                    <label className="text-xs uppercase font-bold text-fg block mb-1">
                      Giá In 3D Vật Lý Thành Phẩm:
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={editPricePhysical}
                        onChange={(e) => setEditPricePhysical(e.target.value)}
                        className="w-full bg-surface border border-line-control p-2 text-xs font-tech font-bold rounded-sm focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-ring"
                      />
                      <span className="absolute right-2.5 top-2 text-xs font-tech text-fg-muted">
                        đ
                      </span>
                    </div>
                    {designerRoyaltyPercent !== null ? (
                      <p className="text-xs text-fg-muted font-tech mt-1">
                        Bản quyền tác giả theo cấu hình giá:{' '}
                        <strong>{designerRoyaltyPercent}%</strong> — số tiền quyết toán theo công
                        thức giá của VCUBE.
                      </p>
                    ) : (
                      <p className="text-xs text-fg-muted font-tech mt-1">
                        Hoa hồng tác giả: <strong>{EMPTY_VALUE}</strong> (chưa cấu hình tỉ lệ bản
                        quyền trong giá)
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs uppercase font-bold text-fg-muted block mb-1">
                  Thẻ Phân Loại (Tags):
                </label>
                <div className="flex flex-wrap items-center gap-1.5 p-2 bg-canvas border border-line rounded-sm min-h-[38px]">
                  {editTags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 bg-primary/10 text-fg rounded-sm text-xs font-tech flex items-center gap-1"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveEditTag(tag)}
                        className="hover:text-danger"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    placeholder="Thêm tag (nhấn Enter)..."
                    value={editTagInput}
                    onChange={(e) => setEditTagInput(e.target.value)}
                    onKeyDown={handleAddEditTag}
                    className="bg-transparent border-none text-xs focus:ring-0 p-0 text-fg min-w-[100px]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs uppercase font-bold text-fg-muted block mb-1">
                  Mô Tả Kỹ Thuật:
                </label>
                <textarea
                  rows={3}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full bg-canvas border border-line-control p-2 rounded-sm text-xs focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-line">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 border border-line-control text-xs font-bold rounded-full uppercase"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary hover:bg-primary-hover text-primary-fg text-xs font-bold rounded-full uppercase transition-colors shadow-e1"
                >
                  Lưu Thay Đổi Vào Catalog
                </button>
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
          description={`SKU: ${previewProduct.sku || '—'} • ${previewProduct.category}`}
        >

            <div className="bg-surface-inverse border border-surface-inverse-raised rounded-sm p-2">
              <ThreeModelViewer
                modelType={previewProduct.category === 'iot' ? 'case' : 'gear'}
                color="#E0DDD5"
                className="h-[320px] w-full"
              />
            </div>

            <div className="grid grid-cols-3 gap-2 font-tech text-xs">
              <div className="p-2 bg-canvas border border-line rounded-sm">
                <span className="text-xs text-fg-muted block">GIÁ TẢI SỐ</span>
                <span className="font-bold text-fg">
                  {(previewProduct.priceDigital || 0).toLocaleString('vi-VN')} đ
                </span>
              </div>
              <div className="p-2 bg-canvas border border-line rounded-sm">
                <span className="text-xs text-fg-muted block">GIÁ IN VẬT LÝ</span>
                <span className="font-bold text-fg">
                  {(previewProduct.pricePhysical || 0).toLocaleString('vi-VN')} đ
                </span>
              </div>
              <div className="p-2 bg-canvas border border-line rounded-sm">
                <span className="text-xs text-fg-muted block">GIẤY PHÉP</span>
                <span className="font-bold text-primary">
                  {previewProduct.licenseType || 'Standard'}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-line">
              <button
                type="button"
                onClick={() => setPreviewProduct(null)}
                className="px-4 py-2 border border-line-control text-xs font-bold rounded-full uppercase"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  const prod = previewProduct;
                  setPreviewProduct(null);
                  handleOpenEditModal(prod);
                }}
                className="px-4 py-2 bg-primary text-primary-fg text-xs font-bold rounded-full uppercase"
              >
                Chỉnh Sửa Bản Vẽ Này
              </button>
            </div>
        </Modal>
      )}
    </div>
  );
};
