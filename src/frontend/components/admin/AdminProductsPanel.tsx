import React, { useState } from 'react';
import { Product, ProductStatus } from '../../types';
import { CATEGORIES } from '../../data/mockData';
import { useLanguage } from '../../context/LanguageContext';
import { dbService } from '../../../backend/supabase/database';

interface AdminProductsPanelProps {
  products: Product[];
  onAddProduct: (product: Product) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onShowToast: (message: string) => void;
}

export const AdminProductsPanel: React.FC<AdminProductsPanelProps> = ({
  products,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onShowToast,
}) => {
  const { language } = useLanguage();
  const isVi = language === 'vi';

  const [productSearch, setProductSearch] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('all');
  const [readinessFilter, setReadinessFilter] = useState('all');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false);

  const [newProductForm, setNewProductForm] = useState<Partial<Product>>({
    name: '',
    category: 'mechanical',
    sku: `VC-${Math.floor(1000 + Math.random() * 9000)}`,
    pricePhysical: 180000,
    priceDigital: 45000,
    description: '',
    supportedMaterials: ['PLA Tough', 'PETG Technical Pro'],
    images: ['https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=800&auto=format&fit=crop&q=80'],
    badge: 'MỚI',
    status: 'Published',
    productionReadiness: 'ready_to_print',
    designer: 'VCUBE Engineering Team',
    rating: 5.0,
    reviewsCount: 0,
    printsCount: 0,
    printTime: '2h 15m',
    features: ['Kiểm định ứng suất Finite Element Analysis (FEA)', 'Bề mặt láng mịn dung sai ±0.05mm'],
    specs: {
      dimensions: '80 x 80 x 45 mm',
      weight: '65g',
      resolution: '0.12mm Standard',
      infillDefault: '35% Gyroid',
      technology: 'FDM / SLA Precision'
    },
    colors: [
      { name: 'Đen Kỹ Thuật', hex: '#1C1C1C', available: true },
      { name: 'Xám Titan', hex: '#64748b', available: true }
    ],
    tags: ['cơ khí', 'in 3d', 'linh kiện chính xác']
  });

  const handleSaveNewProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductForm.name?.trim()) {
      onShowToast(isVi ? 'Vui lòng nhập tên sản phẩm' : 'Please enter product name');
      return;
    }

    const created: Product = {
      id: `prod-${Date.now()}`,
      sku: newProductForm.sku || `VC-${Math.floor(1000 + Math.random() * 9000)}`,
      name: newProductForm.name || 'Linh Kiện Mới',
      category: newProductForm.category || 'mechanical',
      designer: newProductForm.designer || 'VCUBE Engineering',
      pricePhysical: Number(newProductForm.pricePhysical) || 150000,
      priceDigital: Number(newProductForm.priceDigital) || 45000,
      images: newProductForm.images && newProductForm.images.length > 0 ? newProductForm.images : ['https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=800&auto=format&fit=crop&q=80'],
      description: newProductForm.description || 'Linh kiện cơ khí tiêu chuẩn in 3D chính xác.',
      features: newProductForm.features || ['Độ chính xác cao', 'Kháng mài mòn'],
      specs: newProductForm.specs || {
        dimensions: '80 x 80 x 40 mm',
        weight: '60g',
        resolution: '0.12mm',
        infillDefault: '35% Gyroid',
        technology: 'FDM Industrial'
      },
      supportedMaterials: newProductForm.supportedMaterials || ['PLA Tough', 'PETG'],
      colors: newProductForm.colors || [{ name: 'Đen Kỹ Thuật', hex: '#1C1C1C', available: true }],
      tags: newProductForm.tags || ['cơ khí', 'linh kiện'],
      badge: newProductForm.badge || 'MỚI',
      rating: 5.0,
      reviewsCount: 0,
      printsCount: 1,
      printTime: newProductForm.printTime || '2h 30m',
      status: newProductForm.status || 'Published',
      productionReadiness: newProductForm.productionReadiness || 'ready_to_print'
    };

    onAddProduct(created);
    setIsNewProductModalOpen(false);
    onShowToast(isVi ? `Đã thêm sản phẩm "${created.name}" vào hệ thống` : `Added product "${created.name}"`);
    setNewProductForm({
      name: '',
      category: 'mechanical',
      sku: `VC-${Math.floor(1000 + Math.random() * 9000)}`,
      pricePhysical: 180000,
      priceDigital: 45000,
      description: '',
      supportedMaterials: ['PLA Tough', 'PETG'],
      images: ['https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=800&auto=format&fit=crop&q=80'],
      badge: 'MỚI',
      status: 'Published',
      productionReadiness: 'ready_to_print'
    });
  };

  const handleSaveEditProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    onUpdateProduct(editingProduct);
    setEditingProduct(null);
    onShowToast(isVi ? `Đã cập nhật sản phẩm "${editingProduct.name}"` : `Updated product "${editingProduct.name}"`);
  };

  const handleDeleteProductConfirm = (prod: Product) => {
    if (window.confirm(isVi ? `Bạn có chắc chắn muốn xóa sản phẩm "${prod.name}"?` : `Are you sure you want to delete "${prod.name}"?`)) {
      onDeleteProduct(prod.id);
      onShowToast(isVi ? `Đã xóa sản phẩm "${prod.name}"` : `Deleted "${prod.name}"`);
    }
  };

  // Filtered products
  const filteredProducts = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(productSearch.toLowerCase()) || (p.sku && p.sku.toLowerCase().includes(productSearch.toLowerCase()));
    const matchCat = productCategoryFilter === 'all' || p.category === productCategoryFilter;
    const readiness = p.productionReadiness || 'ready_to_print';
    const matchReadiness = readinessFilter === 'all' || readiness === readinessFilter;
    return matchSearch && matchCat && matchReadiness;
  });

  return (
    <div className="space-y-4">
      {/* Header & Add Button Bar */}
      <div className="bg-white p-4 border border-[#C5C6CD] rounded-xl flex flex-col md:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3 w-full md:w-auto flex-1 max-w-md">
          <div className="relative w-full">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#545F73] text-sm">search</span>
            <input
              type="text"
              placeholder={isVi ? 'Tìm theo tên sản phẩm, SKU...' : 'Search by name, SKU...'}
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-[#C5C6CD] rounded-lg text-xs focus:outline-none focus:border-[#00687A] bg-[#F8F9FF]"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          {/* Category Filter */}
          <select
            value={productCategoryFilter}
            onChange={(e) => setProductCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-[#C5C6CD] rounded-lg text-xs font-bold bg-white focus:outline-none cursor-pointer"
          >
            <option value="all">{isVi ? 'Tất Cả Danh Mục' : 'All Categories'}</option>
            {CATEGORIES.filter(c => c.id !== 'all').map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Production Readiness Filter */}
          <select
            value={readinessFilter}
            onChange={(e) => setReadinessFilter(e.target.value)}
            className="px-3 py-2 border border-[#C5C6CD] rounded-lg text-xs font-bold bg-white focus:outline-none cursor-pointer"
          >
            <option value="all">{isVi ? 'Tất Cả Chuẩn In' : 'All Readiness'}</option>
            <option value="ready_to_print">{isVi ? '✓ Sẵn Sàng In (Verified)' : '✓ Ready to Print'}</option>
            <option value="missing_profile">{isVi ? '⚠ Thiếu Profile Slicing' : '⚠ Missing Profile'}</option>
            <option value="cad_review_needed">{isVi ? '🔧 Cần Review CAD' : '🔧 CAD Review Needed'}</option>
          </select>

          <button
            onClick={() => setIsNewProductModalOpen(true)}
            className="px-4 py-2 bg-[#00687A] hover:bg-[#005463] text-white text-xs font-bold uppercase rounded-lg flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">add_circle</span>
            {isVi ? 'Thêm Sản Phẩm Mới' : 'Add New Product'}
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white border border-[#C5C6CD] rounded-xl overflow-x-auto shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#EFF4FF] text-[#091426] font-bold font-tech uppercase text-[10px] border-b border-[#C5C6CD]">
            <tr>
              <th className="py-3 px-4">Ảnh & Sản Phẩm</th>
              <th className="py-3 px-4">Mã SKU</th>
              <th className="py-3 px-4">Danh Mục</th>
              <th className="py-3 px-4">Giá Bản In (Vật Lý)</th>
              <th className="py-3 px-4">Giá File (STL)</th>
              <th className="py-3 px-4">Chuẩn Sẵn Sàng In</th>
              <th className="py-3 px-4">Trạng Thái</th>
              <th className="py-3 px-4 text-right">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5EEFF]">
            {filteredProducts.map((prod) => {
              const readiness = prod.productionReadiness || 'ready_to_print';

              return (
                <tr key={prod.id} className="hover:bg-[#F8FAFC] transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={prod.images[0]}
                        alt={prod.name}
                        className="w-11 h-11 rounded-lg object-cover border border-[#C5C6CD] shrink-0"
                      />
                      <div>
                        <p className="font-bold text-[#091426] max-w-[200px] truncate">{prod.name}</p>
                        <p className="text-[10px] text-[#545F73]">{prod.designer}</p>
                        {prod.badge && (
                          <span className="inline-block text-[8px] font-tech font-bold px-1.5 py-0.2 bg-[#091426] text-white rounded mt-0.5">
                            {prod.badge}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-tech font-bold text-[#545F73]">
                    {prod.sku || 'VC-STD'}
                  </td>
                  <td className="py-3 px-4 font-sans text-[#545F73] capitalize">
                    {prod.category}
                  </td>
                  <td className="py-3 px-4 font-tech font-bold text-[#091426]">
                    {prod.pricePhysical.toLocaleString(isVi ? 'vi-VN' : 'en-US')} đ
                  </td>
                  <td className="py-3 px-4 font-tech text-[#545F73]">
                    {prod.priceDigital.toLocaleString(isVi ? 'vi-VN' : 'en-US')} đ
                  </td>
                  <td className="py-3 px-4">
                    {readiness === 'ready_to_print' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-tech font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <span className="text-emerald-600">✓</span> Sẵn Sàng In
                      </span>
                    ) : readiness === 'missing_profile' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-tech font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        <span>⚠</span> Thiếu Profile
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-tech font-bold bg-blue-50 text-blue-800 border border-blue-200">
                        <span>🔧</span> Cần CAD Review
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <select
                      value={(prod.status || 'published').toLowerCase()}
                      onChange={(e) => {
                        const nextStatus = e.target.value as any;
                        onUpdateProduct({ ...prod, status: nextStatus });
                        onShowToast(isVi ? `Đã chuyển "${prod.name}" sang ${nextStatus === 'published' ? 'Đang Bán (Published)' : nextStatus === 'draft' ? 'Bản Nháp (Draft)' : 'Lưu Trữ (Archived)'}` : `Updated status to ${nextStatus}`);
                      }}
                      className={`text-[11px] font-mono font-bold px-2 py-1 rounded-lg border cursor-pointer focus:outline-none transition-colors ${
                        (prod.status || 'published').toLowerCase() === 'published'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : (prod.status || 'published').toLowerCase() === 'draft'
                          ? 'bg-amber-50 text-amber-800 border-amber-300'
                          : 'bg-slate-100 text-slate-700 border-slate-300'
                      }`}
                    >
                      <option value="published">● Published</option>
                      <option value="draft">◌ Draft</option>
                      <option value="archived">✖ Archived</option>
                    </select>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setEditingProduct({ ...prod })}
                        className="p-1.5 bg-white border border-[#C5C6CD] hover:border-[#00687A] text-[#091426] rounded-lg transition-colors cursor-pointer"
                        title="Sửa sản phẩm"
                      >
                        <span className="material-symbols-outlined text-sm">edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteProductConfirm(prod)}
                        className="p-1.5 bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors cursor-pointer"
                        title="Xóa sản phẩm"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredProducts.length === 0 && (
          <div className="p-8 text-center text-[#545F73] text-xs">
            {isVi ? 'Không tìm thấy sản phẩm nào phù hợp.' : 'No products found.'}
          </div>
        )}
      </div>

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl border border-[#C5C6CD]">
            <div className="flex items-center justify-between border-b border-[#C5C6CD] pb-3">
              <h3 className="text-base font-bold text-[#091426]">
                {isVi ? 'Chỉnh Sửa Thông Tin Sản Phẩm' : 'Edit Product'}
              </h3>
              <button onClick={() => setEditingProduct(null)} className="p-1 text-[#545F73] hover:text-[#091426]">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveEditProduct} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-[#091426]">Tên sản phẩm *</label>
                <input
                  type="text"
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className="w-full p-2.5 border border-[#C5C6CD] rounded-lg text-xs font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[#091426]">Mã SKU</label>
                  <input
                    type="text"
                    value={editingProduct.sku || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value })}
                    className="w-full p-2 border border-[#C5C6CD] rounded-lg text-xs font-tech"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-[#091426]">Danh mục</label>
                  <select
                    value={editingProduct.category}
                    onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                    className="w-full p-2 border border-[#C5C6CD] rounded-lg text-xs font-bold bg-white"
                  >
                    {CATEGORIES.filter(c => c.id !== 'all').map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[#091426]">Giá Bản In Vật Lý (VNĐ)</label>
                  <input
                    type="number"
                    value={editingProduct.pricePhysical}
                    onChange={(e) => setEditingProduct({ ...editingProduct, pricePhysical: Number(e.target.value) })}
                    className="w-full p-2 border border-[#C5C6CD] rounded-lg text-xs font-tech font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-[#091426]">Giá File STL Số (VNĐ)</label>
                  <input
                    type="number"
                    value={editingProduct.priceDigital}
                    onChange={(e) => setEditingProduct({ ...editingProduct, priceDigital: Number(e.target.value) })}
                    className="w-full p-2 border border-[#C5C6CD] rounded-lg text-xs font-tech"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[#091426]">Độ Sẵn Sàng In (Readiness)</label>
                  <select
                    value={editingProduct.productionReadiness || 'ready_to_print'}
                    onChange={(e) => setEditingProduct({ ...editingProduct, productionReadiness: e.target.value as any })}
                    className="w-full p-2 border border-[#C5C6CD] rounded-lg text-xs font-bold bg-white"
                  >
                    <option value="ready_to_print">✓ Sẵn sàng in (G-code Verified)</option>
                    <option value="missing_profile">⚠ Thiếu Profile Slicing</option>
                    <option value="cad_review_needed">🔧 Cần CAD Review</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-[#091426]">Trạng thái hiển thị</label>
                  <select
                    value={editingProduct.status}
                    onChange={(e) => setEditingProduct({ ...editingProduct, status: e.target.value as any })}
                    className="w-full p-2 border border-[#C5C6CD] rounded-lg text-xs font-bold bg-white"
                  >
                    <option value="Published">Đang Mở Bán (Published)</option>
                    <option value="Out of Stock">Tạm Hết Hàng (Out of Stock)</option>
                    <option value="Under Review">Đang Duyệt</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#C5C6CD]">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-[#091426] font-bold rounded-lg cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#00687A] hover:bg-[#005463] text-white font-bold rounded-lg cursor-pointer"
                >
                  Lưu Thay Đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Product Modal */}
      {isNewProductModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl border border-[#C5C6CD]">
            <div className="flex items-center justify-between border-b border-[#C5C6CD] pb-3">
              <h3 className="text-base font-bold text-[#091426]">
                {isVi ? 'Thêm Sản Phẩm & Bản In Mới' : 'Add New Product'}
              </h3>
              <button onClick={() => setIsNewProductModalOpen(false)} className="p-1 text-[#545F73] hover:text-[#091426]">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveNewProduct} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-[#091426]">Tên sản phẩm *</label>
                <input
                  type="text"
                  placeholder="VD: Khớp nối mềm Coupler 8x8mm"
                  value={newProductForm.name}
                  onChange={(e) => setNewProductForm({ ...newProductForm, name: e.target.value })}
                  className="w-full p-2.5 border border-[#C5C6CD] rounded-lg text-xs font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[#091426]">Mã SKU</label>
                  <input
                    type="text"
                    value={newProductForm.sku}
                    onChange={(e) => setNewProductForm({ ...newProductForm, sku: e.target.value })}
                    className="w-full p-2 border border-[#C5C6CD] rounded-lg text-xs font-tech"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-[#091426]">Danh mục</label>
                  <select
                    value={newProductForm.category}
                    onChange={(e) => setNewProductForm({ ...newProductForm, category: e.target.value })}
                    className="w-full p-2 border border-[#C5C6CD] rounded-lg text-xs font-bold bg-white"
                  >
                    {CATEGORIES.filter(c => c.id !== 'all').map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[#091426]">Giá Bản In (VNĐ)</label>
                  <input
                    type="number"
                    value={newProductForm.pricePhysical}
                    onChange={(e) => setNewProductForm({ ...newProductForm, pricePhysical: Number(e.target.value) })}
                    className="w-full p-2 border border-[#C5C6CD] rounded-lg text-xs font-tech font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-[#091426]">Giá File STL (VNĐ)</label>
                  <input
                    type="number"
                    value={newProductForm.priceDigital}
                    onChange={(e) => setNewProductForm({ ...newProductForm, priceDigital: Number(e.target.value) })}
                    className="w-full p-2 border border-[#C5C6CD] rounded-lg text-xs font-tech"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[#091426]">Độ Sẵn Sàng In (Readiness)</label>
                  <select
                    value={newProductForm.productionReadiness || 'ready_to_print'}
                    onChange={(e) => setNewProductForm({ ...newProductForm, productionReadiness: e.target.value as any })}
                    className="w-full p-2 border border-[#C5C6CD] rounded-lg text-xs font-bold bg-white"
                  >
                    <option value="ready_to_print">✓ Sẵn sàng in (G-code Verified)</option>
                    <option value="missing_profile">⚠ Thiếu Profile Slicing</option>
                    <option value="cad_review_needed">🔧 Cần CAD Review</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-[#091426]">Ảnh URL (Demo)</label>
                  <input
                    type="text"
                    value={newProductForm.images?.[0] || ''}
                    onChange={(e) => setNewProductForm({ ...newProductForm, images: [e.target.value] })}
                    className="w-full p-2 border border-[#C5C6CD] rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#C5C6CD]">
                <button
                  type="button"
                  onClick={() => setIsNewProductModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-[#091426] font-bold rounded-lg cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#00687A] hover:bg-[#005463] text-white font-bold rounded-lg cursor-pointer"
                >
                  Thêm Vào Catalog
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
