import React, { useState, useMemo } from 'react';
import { Product } from '../../../types';
import { ThreeModelViewer } from '../ThreeModelViewer';
import { Button, Icon } from '@frontend/ui';

export interface DesignerModelsManagerTabProps {
  products: Product[];
  onUpdateProduct?: (product: Product) => void;
  onDeleteProduct?: (productId: string) => void;
  onShowToast: (message: string) => void;
  onNavigateToUpload: () => void;
}

export const DesignerModelsManagerTab: React.FC<DesignerModelsManagerTabProps> = ({
  products,
  onUpdateProduct,
  onDeleteProduct,
  onShowToast,
  onNavigateToUpload,
}) => {
  // Filter state
  const [modelCategoryFilter, setModelCategoryFilter] = useState('all');
  const [modelStatusFilter, setModelStatusFilter] = useState('all');
  const [modelAuthorFilter, setModelAuthorFilter] = useState<'all' | 'mine'>('all');
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
    onShowToast(`Đã cập nhật ấn phẩm "${updatedProd.name}" vào Catalog thành công!`);
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
    onShowToast(
      `Đã chuyển trạng thái sang "${nextStatus === 'Published' ? 'Đã Xuất Bản' : 'Bản Nháp'}"`
    );
  };

  // Delete product with confirm
  const handleDeleteConfirm = (prod: Product) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa ấn phẩm "${prod.name}" khỏi Catalog không?`)) {
      if (onDeleteProduct) {
        onDeleteProduct(prod.id);
        onShowToast(`Đã xóa ấn phẩm "${prod.name}" khỏi cơ sở dữ liệu.`);
      }
    }
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

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (modelAuthorFilter === 'mine') {
        const isMine =
          p.designer?.toLowerCase().includes('bạn') ||
          p.designer?.toLowerCase().includes('thắng') ||
          p.designer?.toLowerCase().includes('alexei');
        if (!isMine) return false;
      }
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
  }, [products, modelAuthorFilter, modelCategoryFilter, modelStatusFilter, searchModelQuery]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h2 className="text-lg font-bold text-fg">Kho Ấn Phẩm &amp; Điều Chỉnh Giá In</h2>
          <p className="text-xs text-fg-muted">
            Quản lý {products.length} ấn phẩm trong Catalog DB. Bạn có thể chỉnh sửa thông tin kỹ
            thuật, giá in vật lý và giá file số.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <input
            type="text"
            placeholder="Tìm theo tên, SKU, tag..."
            value={searchModelQuery}
            onChange={(e) => setSearchModelQuery(e.target.value)}
            className="bg-surface border border-line-control px-3 py-2 text-xs rounded-sm w-full sm:w-52 focus:outline-none focus:border-primary"
          />

          <select
            value={modelAuthorFilter}
            onChange={(e) => setModelAuthorFilter(e.target.value as any)}
            className="bg-surface border border-line-control px-3 py-2 text-xs rounded-sm focus:outline-none focus:border-primary"
          >
            <option value="all">Tất Cả Ấn Phẩm</option>
            <option value="mine">Ấn Phẩm Của Tôi</option>
          </select>

          <select
            value={modelCategoryFilter}
            onChange={(e) => setModelCategoryFilter(e.target.value)}
            className="bg-surface border border-line-control px-3 py-2 text-xs rounded-sm focus:outline-none focus:border-primary"
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
            className="bg-surface border border-line-control px-3 py-2 text-xs rounded-sm focus:outline-none focus:border-primary"
          >
            <option value="all">Mọi Trạng Thái</option>
            <option value="Published">Đã Xuất Bản</option>
            <option value="Under Review">Chờ Duyệt</option>
            <option value="Draft">Bản Nháp</option>
          </select>
        </div>
      </div>

      {/* Models Table */}
      <div className="bg-surface border border-line rounded-sm overflow-hidden shadow-e1">
        <div className="responsive-table-wrapper">
          <table className="text-left text-xs w-full">
            <thead className="bg-primary/10 border-b border-line text-fg-muted font-tech text-xs uppercase tracking-wider">
              <tr>
                <th className="p-3.5">Ấn Phẩm &amp; SKU</th>
                <th className="p-3.5">Tác Giả</th>
                <th className="p-3.5">Giấy Phép</th>
                <th className="p-3.5 text-right">Giá Tải File Số</th>
                <th className="p-3.5 text-right">Giá In 3D Vật Lý</th>
                <th className="p-3.5 text-center">Trạng Thái</th>
                <th className="p-3.5 text-right">Hành Động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-subtle">
              {filteredProducts.map((prod) => (
                <tr key={prod.id} className="hover:bg-canvas transition-colors">
                  <td className="p-3.5 flex items-center gap-3">
                    <img
                      src={
                        prod.images?.[0] ||
                        'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=800&auto=format&fit=crop&q=80'
                      }
                      alt={prod.name}
                      className="w-12 h-12 object-cover border border-line rounded-sm shrink-0 bg-surface-inverse"
                    />
                    <div>
                      <span className="font-bold text-fg block leading-tight">{prod.name}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-tech text-xs text-fg-muted">SKU: {prod.sku || '—'}</span>
                        <span className="px-1.5 py-0.2 bg-line-subtle text-fg font-tech text-xs rounded-sm uppercase">
                          {prod.category}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td className="p-3.5 text-fg font-sans">
                    <span className="font-medium text-xs">{prod.designer}</span>
                  </td>

                  <td className="p-3.5 font-tech text-fg">
                    <span className="px-2 py-0.5 bg-primary/10 border border-line rounded-sm text-xs font-bold text-primary">
                      {prod.licenseType || 'Standard'}
                    </span>
                  </td>

                  <td className="p-3.5 font-tech text-right">
                    <span className="font-bold text-fg block text-xs">
                      {(prod.priceDigital || 0).toLocaleString('vi-VN')} đ
                    </span>
                    <span className="text-xs text-primary">
                      Nhận ~{Math.round((prod.priceDigital || 0) * 0.9).toLocaleString('vi-VN')} đ
                    </span>
                  </td>

                  <td className="p-3.5 font-tech text-right">
                    <span className="font-bold text-fg block text-xs">
                      {(prod.pricePhysical || 0).toLocaleString('vi-VN')} đ
                    </span>
                    <span className="text-xs text-fg-muted">
                      Nhận ~{Math.round((prod.pricePhysical || 0) * 0.1).toLocaleString('vi-VN')} đ / sp
                    </span>
                  </td>

                  <td className="p-3.5 text-center">
                    <button
                      onClick={() => handleToggleProductStatus(prod)}
                      title="Bấm để đổi trạng thái"
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
                  </td>

                  <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                    {/* Sửa thông tin & Giá */}
                    <button
                      onClick={() => handleOpenEditModal(prod)}
                      className="px-2.5 py-1.5 bg-primary hover:bg-primary-hover text-primary-fg rounded-full text-xs uppercase font-bold transition-colors inline-flex items-center gap-1 touch-target-btn shadow-e1"
                    >
                      <Icon name="edit" size={18} />
                      Sửa &amp; Giá
                    </button>

                    {/* Xem 3D */}
                    <button
                      onClick={() => setPreviewProduct(prod)}
                      className="px-2.5 py-1.5 border border-line-control hover:bg-line-subtle text-fg rounded-full text-xs uppercase font-bold transition-colors inline-flex items-center gap-1 touch-target-btn"
                    >
                      <Icon name="view_in_ar" size={18} />
                      Xem 3D
                    </button>

                    {/* Xóa */}
                    <Button
                      iconOnly
                      size="sm"
                      variant="danger-ghost"
                      aria-label="Xoá ấn phẩm"
                      title="Xóa ấn phẩm"
                      onClick={() => handleDeleteConfirm(prod)}
                      leadingIcon={<Icon name="delete" size={14} />}
                    />
                  </td>
                </tr>
              ))}

              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-fg-muted text-xs">
                    Không tìm thấy ấn phẩm nào phù hợp với bộ lọc.{' '}
                    <button
                      onClick={onNavigateToUpload}
                      className="text-primary font-bold hover:underline ml-1"
                    >
                      Đăng tải ấn phẩm mới?
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: EDIT PRODUCT DETAILS & PRICING */}
      {editingProduct && (
        <div className="fixed inset-0 bg-surface-inverse/70 z-modal flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-surface rounded-lg max-w-2xl w-full p-6 space-y-4 text-fg shadow-e3 my-8">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <Icon name="edit" size={24} className="text-primary" />
                <h3 className="font-bold text-sm text-fg uppercase">
                  Chỉnh Sửa Ấn Phẩm &amp; Giá In (Catalog DB)
                </h3>
              </div>
              <button
                onClick={() => setEditingProduct(null)}
                className="text-fg-subtle hover:text-fg"
              >
                ✕
              </button>
            </div>

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
                    className="w-full bg-canvas border border-line-control p-2 rounded-sm text-xs focus:outline-none focus:border-primary"
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
                    className="w-full bg-canvas border border-line-control p-2 rounded-sm text-xs font-tech focus:outline-none focus:border-primary"
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
                    className="w-full bg-canvas border border-line-control p-2 rounded-sm text-xs focus:outline-none focus:border-primary"
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
                    className="w-full bg-canvas border border-line-control p-2 rounded-sm text-xs focus:outline-none focus:border-primary"
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
                    className="w-full bg-canvas border border-line-control p-2 rounded-sm text-xs focus:outline-none focus:border-primary"
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
                        className="w-full bg-surface border border-line-control p-2 text-xs font-tech font-bold rounded-sm focus:outline-none focus:border-primary"
                      />
                      <span className="absolute right-2.5 top-2 text-xs font-tech text-fg-muted">
                        đ
                      </span>
                    </div>
                    <p className="text-xs text-primary font-tech mt-1">
                      Tác giả nhận:{' '}
                      {Math.round((Number(editPriceDigital) || 0) * 0.9).toLocaleString('vi-VN')} đ
                      (90%)
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
                        className="w-full bg-surface border border-line-control p-2 text-xs font-tech font-bold rounded-sm focus:outline-none focus:border-primary"
                      />
                      <span className="absolute right-2.5 top-2 text-xs font-tech text-fg-muted">
                        đ
                      </span>
                    </div>
                    <p className="text-xs text-fg-muted font-tech mt-1">
                      Hoa hồng tác giả:{' '}
                      {Math.round((Number(editPricePhysical) || 0) * 0.1).toLocaleString('vi-VN')} đ /
                      sp
                    </p>
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
                  className="w-full bg-canvas border border-line-control p-2 rounded-sm text-xs focus:outline-none focus:border-primary"
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
          </div>
        </div>
      )}

      {/* MODAL 2: 3D PREVIEW INSPECTION */}
      {previewProduct && (
        <div className="fixed inset-0 bg-surface-inverse/70 z-modal flex items-center justify-center p-4">
          <div className="bg-surface rounded-lg max-w-2xl w-full p-6 space-y-4 text-fg shadow-e3">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <h3 className="font-bold text-sm text-fg">{previewProduct.name}</h3>
                <p className="text-xs font-tech text-fg-muted">
                  SKU: {previewProduct.sku || '—'} • {previewProduct.category}
                </p>
              </div>
              <button
                onClick={() => setPreviewProduct(null)}
                className="text-fg-subtle hover:text-fg"
              >
                ✕
              </button>
            </div>

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
          </div>
        </div>
      )}
    </div>
  );
};
