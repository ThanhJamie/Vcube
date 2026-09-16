import React, { useState } from 'react';
import { Product, ProductStatus } from '../../types';
import { CATEGORIES } from '../../data/mockData';
import { useLanguage } from '../../context/LanguageContext';
import { dbService } from '../../../backend/supabase/database';
import { ConfirmDialog, Icon } from '@frontend/ui';

interface AdminProductsPanelProps {
  products: Product[];
  onAddProduct: (product: Product) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onShowToast: (message: string) => void;
}

/**
 * Trạng thái form cho sản phẩm MỚI: chỉ chứa những gì admin THỰC SỰ nhập/chọn.
 *
 * VÌ SAO (data-honesty §3): bản cũ seed sẵn giá 180.000/45.000, thông số 80 x 80 x 45 mm,
 * khối lượng 65g, danh sách vật liệu, hai màu, ba thẻ, thời gian in '2h 15m', tác giả
 * 'VCUBE Engineering Team' và một ảnh Unsplash — tất cả bị ghi thẳng vào bảng `products`
 * như thể admin đã khai. Không còn giá trị nào được đoán hộ: ô bắt buộc mà bỏ trống thì
 * CHẶN lưu, các trường form không thu thập thì để RỖNG (đúng như `rowToProduct` đọc từ DB).
 */
const EMPTY_NEW_PRODUCT_FORM: Partial<Product> = {
  name: '',
  category: 'mechanical',
  // Không sinh mã: SKU do admin tự nhập; để trống ⇒ hiện "Chưa có mã" (data-honesty §3).
  sku: '',
  pricePhysical: undefined,
  priceDigital: undefined,
  images: [],
  // Độ sẵn sàng in là lựa chọn HIỆN trên form (select "Sẵn sàng in" là mặc định hiển thị).
  productionReadiness: 'ready_to_print',
};

/** Thông số RỖNG = "chưa khai". Khớp `EMPTY_PRODUCT_SPECS` / `normalizeSpecs()` của
 *  `src/backend/supabase/mappers.ts` ⇒ hàng mới và hàng đọc từ DB hiển thị giống nhau. */
const EMPTY_PRODUCT_SPECS: Product['specs'] = {
  dimensions: '',
  weight: '',
  resolution: '',
  infillDefault: '',
  technology: '',
};

/**
 * Ô nhập tiền: admin xoá trắng ⇒ `undefined` = CHƯA NHẬP, khác hẳn 0.
 *
 * VÌ SAO KHÔNG dùng `Number(value)`: `Number('') === 0` nên "chưa nhập" sẽ thành giá 0,
 * còn `|| 150000` (bản cũ) biến ô trống thành giá bịa 150.000 rồi ghi vào DB.
 */
const parseMoneyInput = (raw: string): number | undefined => {
  const trimmed = raw.trim();
  if (trimmed === '') return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
};

/**
 * Các URL ảnh giữ chỗ do CODE BỊA ra (không phải admin nhập) và đã bị ghi thẳng vào
 * `products.images`:
 *   - ảnh #1: default của chính panel này (bản cũ :44/:85/:120) và
 *     `DesignerDashboardView.tsx:220,580`;
 *   - ảnh #2: ảnh thứ hai của luồng designer (`DesignerDashboardView.tsx:221`).
 *
 * VÌ SAO còn cần sau khi bỏ default: những hàng ĐÃ LỠ tạo với URL này vẫn nằm trong DB.
 * Render thẳng URL đó = vừa hiển thị một tấm ảnh không phải của sản phẩm, vừa gọi ảnh của
 * bên thứ ba (audit /admin/products ghi nhận `net::ERR_BLOCKED_BY_ORB`). Coi như CHƯA CÓ ẢNH.
 */
const FABRICATED_PLACEHOLDER_IMAGE_URLS = [
  'https://images.unsplash.com/photo-1581092335397-9583fe92d232',
  'https://images.unsplash.com/photo-1581092160607-ee22621dd758',
];

/** URL ảnh THẬT của sản phẩm, hoặc `undefined` khi chưa có ảnh / chỉ có ảnh giữ chỗ bịa. */
const realProductImageUrl = (images: string[] | undefined): string | undefined => {
  const first = images?.[0]?.trim();
  if (!first) return undefined;
  return FABRICATED_PLACEHOLDER_IMAGE_URLS.some((url) => first.includes(url)) ? undefined : first;
};

/**
 * Bản nháp khi SỬA sản phẩm: khác `Product` ở chỗ hai trường giá có thể TẠM THỜI TRỐNG
 * ("chưa nhập") trong lúc admin xoá ô.
 *
 * VÌ SAO (data-honesty §3): bản cũ ghi `Number(e.target.value)` nên `Number('') === 0` —
 * xoá trắng ô giá bị biến thành giá 0, mà 0 là một cấu hình THẬT ("kênh này không bán")
 * ⇒ thao tác xoá ô vô tình tắt một kênh bán. Ô trống phải là "chưa nhập"; khi lưu, giá bắt
 * buộc phải có (xem `handleSaveEditProduct`) nên object gửi xuống DB vẫn là `Product` đầy đủ.
 */
type EditableProduct = Omit<Product, 'pricePhysical' | 'priceDigital'> & {
  pricePhysical?: number;
  priceDigital?: number;
};

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
  const [editingProduct, setEditingProduct] = useState<EditableProduct | null>(null);
  const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false);
  /** Q2 (data-honesty): tính năng là dữ liệu THẬT do admin nhập (mỗi dòng một tính năng).
   *  Form trước đây không có ô nhập nên mọi sản phẩm mới luôn có `features: []`. */
  const [newProductFeaturesText, setNewProductFeaturesText] = useState('');

  // P4/Q2 (data-honesty): KHÔNG seed sẵn giá, thông số, vật liệu, màu, thẻ, tác giả, ảnh.
  const [newProductForm, setNewProductForm] = useState<Partial<Product>>({
    ...EMPTY_NEW_PRODUCT_FORM,
  });

  const handleSaveNewProduct = (e: React.FormEvent) => {
    e.preventDefault();

    // (data-honesty §3) KHÔNG đoán hộ. Trường bắt buộc mà bỏ trống ⇒ CHẶN lưu và nói rõ
    // tên trường, thay vì âm thầm ghi một giá / nội dung bịa vào bảng `products`.
    const name = newProductForm.name?.trim() || '';
    if (!name) {
      onShowToast(isVi ? 'Vui lòng nhập tên sản phẩm' : 'Please enter product name');
      return;
    }

    const imageUrl = newProductForm.images?.[0]?.trim() || '';
    if (!imageUrl) {
      onShowToast(
        isVi
          ? 'Vui lòng nhập URL ảnh sản phẩm — hệ thống không tự chèn ảnh mẫu'
          : 'Please enter the product image URL — no placeholder image is inserted'
      );
      return;
    }

    const pricePhysical = newProductForm.pricePhysical;
    if (pricePhysical === undefined || !Number.isFinite(pricePhysical)) {
      onShowToast(isVi ? 'Vui lòng nhập Giá Bản In (VNĐ)' : 'Please enter the physical print price (VND)');
      return;
    }
    if (pricePhysical < 0) {
      onShowToast(isVi ? 'Giá Bản In không được là số âm' : 'Physical print price cannot be negative');
      return;
    }

    const priceDigital = newProductForm.priceDigital;
    if (priceDigital === undefined || !Number.isFinite(priceDigital)) {
      onShowToast(isVi ? 'Vui lòng nhập Giá File STL (VNĐ)' : 'Please enter the STL file price (VND)');
      return;
    }
    if (priceDigital < 0) {
      onShowToast(isVi ? 'Giá File STL không được là số âm' : 'STL file price cannot be negative');
      return;
    }

    const created: Product = {
      id: `prod-${Date.now()}`,
      sku: newProductForm.sku?.trim() || '',
      name,
      category: newProductForm.category || 'mechanical',
      // Form không thu thập tác giả ⇒ để trống, KHÔNG quy kết 'VCUBE Engineering'.
      designer: '',
      pricePhysical,
      priceDigital,
      images: [imageUrl],
      // Form không có ô mô tả ⇒ để trống, KHÔNG viết mô tả bịa.
      description: '',
      // Q2: lấy đúng những gì admin nhập. Không nhập gì ⇒ mảng RỖNG (không tự thêm tính năng).
      features: newProductFeaturesText.split('\n').map((line) => line.trim()).filter(Boolean),
      // KHÔNG bịa thông số / vật liệu / màu / thẻ / thời gian in: form không thu thập chúng
      // ⇒ để RỖNG đúng như `rowToProduct` khi đọc hàng từ DB (mappers.ts:135-160).
      specs: { ...EMPTY_PRODUCT_SPECS },
      supportedMaterials: [],
      colors: [],
      tags: [],
      rating: 0,
      reviewsCount: 0,
      printsCount: 0,
      printTime: '',
      // `products.status` là NOT NULL default 'published' trong schema; modal không thu thập
      // trạng thái nên giá trị này là của DB, không phải một lựa chọn admin đã nhập.
      status: 'Published',
      productionReadiness: newProductForm.productionReadiness || 'ready_to_print'
    };

    onAddProduct(created);
    setIsNewProductModalOpen(false);
    onShowToast(isVi ? `Đã thêm sản phẩm "${created.name}" vào hệ thống` : `Added product "${created.name}"`);
    setNewProductForm({ ...EMPTY_NEW_PRODUCT_FORM });
    setNewProductFeaturesText('');
  };

  const handleSaveEditProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    // data-honesty §3: ô giá xoá trắng = "CHƯA NHẬP", KHÔNG phải 0.
    // Cột `products.price_physical/price_digital` là NOT NULL trong schema ⇒ không có giá
    // trị "NULL" trung thực nào để gửi, nên cách đúng là CHẶN lưu và nói rõ trường còn thiếu.
    // Chỉ khi admin gõ đúng số 0 thì 0 mới được lưu (0 là cấu hình thật: kênh không bán).
    const pricePhysical = editingProduct.pricePhysical;
    if (pricePhysical === undefined || !Number.isFinite(pricePhysical)) {
      onShowToast(isVi ? 'Vui lòng nhập Giá Bản In Vật Lý (VNĐ)' : 'Please enter the physical print price (VND)');
      return;
    }
    if (pricePhysical < 0) {
      onShowToast(isVi ? 'Giá Bản In Vật Lý không được là số âm' : 'Physical print price cannot be negative');
      return;
    }

    const priceDigital = editingProduct.priceDigital;
    if (priceDigital === undefined || !Number.isFinite(priceDigital)) {
      onShowToast(isVi ? 'Vui lòng nhập Giá File STL Số (VNĐ)' : 'Please enter the STL file price (VND)');
      return;
    }
    if (priceDigital < 0) {
      onShowToast(isVi ? 'Giá File STL Số không được là số âm' : 'STL file price cannot be negative');
      return;
    }

    // Chỉ tới đây mới ghi xuống DB: hai giá là số admin ĐÃ nhập (0 cũng là số thật).
    onUpdateProduct({ ...editingProduct, pricePhysical, priceDigital });
    setEditingProduct(null);
    onShowToast(isVi ? `Đã cập nhật sản phẩm "${editingProduct.name}"` : `Updated product "${editingProduct.name}"`);
  };

  const [pendingDeleteProduct, setPendingDeleteProduct] = useState<Product | null>(null);

  const handleDeleteProductConfirm = (prod: Product) => {
    setPendingDeleteProduct(prod);
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
      <ConfirmDialog
        open={pendingDeleteProduct !== null}
        tone="danger"
        title={isVi ? 'Xoá sản phẩm' : 'Delete product'}
        description={
          pendingDeleteProduct
            ? (isVi
                ? `Bạn có chắc chắn muốn xoá sản phẩm "${pendingDeleteProduct.name}"? Hành động này không hoàn tác được.`
                : `Are you sure you want to delete "${pendingDeleteProduct.name}"? This cannot be undone.`)
            : ''
        }
        confirmLabel={isVi ? 'Xoá sản phẩm' : 'Delete'}
        cancelLabel={isVi ? 'Huỷ' : 'Cancel'}
        onCancel={() => setPendingDeleteProduct(null)}
        onConfirm={() => {
          if (!pendingDeleteProduct) return;
          onDeleteProduct(pendingDeleteProduct.id);
          onShowToast(isVi ? `Đã xóa sản phẩm "${pendingDeleteProduct.name}"` : `Deleted "${pendingDeleteProduct.name}"`);
          setPendingDeleteProduct(null);
        }}
      />
      {/* Header & Add Button Bar */}
      <div className="bg-surface p-4 border border-line rounded-lg flex flex-col md:flex-row items-center justify-between gap-3 shadow-e1">
        <div className="flex items-center gap-3 w-full md:w-auto flex-1 max-w-md">
          <div className="relative w-full">
            <Icon name="search" size={16} className="absolute left-3 top-2.5 text-fg-muted" />
            <input
              type="text"
              placeholder={isVi ? 'Tìm theo tên sản phẩm, SKU...' : 'Search by name, SKU...'}
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-line rounded-lg text-xs focus:outline-none focus:border-primary bg-surface-muted"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          {/* Category Filter */}
          <select
            value={productCategoryFilter}
            onChange={(e) => setProductCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-line rounded-lg text-xs font-bold bg-surface focus:outline-none cursor-pointer"
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
            className="px-3 py-2 border border-line rounded-lg text-xs font-bold bg-surface focus:outline-none cursor-pointer"
          >
            <option value="all">{isVi ? 'Tất Cả Chuẩn In' : 'All Readiness'}</option>
            <option value="ready_to_print">{isVi ? 'Sẵn sàng in' : 'Ready to print'}</option>
            <option value="missing_profile">{isVi ? '⚠ Thiếu Profile Slicing' : '⚠ Missing Profile'}</option>
            <option value="cad_review_needed">{isVi ? '🔧 Cần Review CAD' : '🔧 CAD Review Needed'}</option>
          </select>

          <button
            onClick={() => setIsNewProductModalOpen(true)}
            className="px-4 py-2 bg-primary hover:bg-primary-hover text-primary-fg text-xs font-bold uppercase rounded-lg flex items-center gap-1.5 transition-colors shadow-e1 cursor-pointer"
          >
            <Icon name="add_circle" size={16} />
            {isVi ? 'Thêm Sản Phẩm Mới' : 'Add New Product'}
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-surface border border-line rounded-lg overflow-x-auto shadow-e1">
        <table className="w-full text-left text-xs">
          <thead className="bg-primary/10 text-fg font-bold font-tech uppercase text-xs border-b border-line">
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
          <tbody className="divide-y divide-line-subtle">
            {filteredProducts.map((prod) => {
              const readiness = prod.productionReadiness || 'ready_to_print';
              // Hàng cũ có thể mang URL ảnh giữ chỗ bịa ⇒ xử như "chưa có ảnh".
              const imageUrl = realProductImageUrl(prod.images);

              return (
                <tr key={prod.id} className="hover:bg-canvas transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      {/* Không có ảnh thật ⇒ hiện trạng thái trống, KHÔNG chèn/gọi ảnh mẫu. */}
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={prod.name}
                          className="w-11 h-11 rounded-md object-cover border border-line shrink-0"
                        />
                      ) : (
                        <div
                          className="w-11 h-11 rounded-md border border-line-subtle bg-surface-muted text-fg-muted flex items-center justify-center shrink-0"
                          title={isVi ? 'Chưa có ảnh' : 'No image'}
                        >
                          <Icon name="image" size={16} />
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-fg max-w-[200px] truncate">{prod.name}</p>
                        <p className="text-xs text-fg-muted">{prod.designer}</p>
                        {prod.badge && (
                          <span className="inline-block text-xs font-tech font-bold px-1.5 py-0.2 bg-surface-inverse text-on-inverse rounded-sm mt-0.5">
                            {prod.badge}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-tech font-bold text-fg-muted">
                    {prod.sku || (
                      <span className="text-fg-subtle" title="Chưa có mã SKU">Chưa có mã</span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-sans text-fg-muted capitalize">
                    {prod.category}
                  </td>
                  <td className="py-3 px-4 font-tech font-bold text-fg">
                    {prod.pricePhysical.toLocaleString(isVi ? 'vi-VN' : 'en-US')} đ
                  </td>
                  <td className="py-3 px-4 font-tech text-fg-muted">
                    {prod.priceDigital.toLocaleString(isVi ? 'vi-VN' : 'en-US')} đ
                  </td>
                  <td className="py-3 px-4">
                    {readiness === 'ready_to_print' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-xs font-tech font-bold bg-positive-tint text-positive border border-positive/30">
                        <span className="text-positive">✓</span> Sẵn Sàng In
                      </span>
                    ) : readiness === 'missing_profile' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-xs font-tech font-bold bg-warning-tint text-warning border border-warning/30">
                        <span>⚠</span> Thiếu Profile
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-xs font-tech font-bold bg-info-tint text-info border border-info/30">
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
                      className={`text-xs font-mono font-bold px-2 py-1 rounded-lg border cursor-pointer focus:outline-none transition-colors ${
                        (prod.status || 'published').toLowerCase() === 'published'
                          ? 'bg-positive-tint text-positive border-positive/30'
                          : (prod.status || 'published').toLowerCase() === 'draft'
                          ? 'bg-warning-tint text-warning border-warning/30'
                          : 'bg-surface-muted text-fg-muted border-line'
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
                        className="p-1.5 bg-surface border border-line hover:border-primary text-fg rounded-lg transition-colors cursor-pointer"
                        title="Sửa sản phẩm"
                      >
                        <Icon name="edit" size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteProductConfirm(prod)}
                        className="p-1.5 bg-surface border border-danger/30 hover:bg-danger-tint text-danger rounded-lg transition-colors cursor-pointer"
                        title="Xóa sản phẩm"
                      >
                        <Icon name="delete" size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredProducts.length === 0 && (
          <div className="p-8 text-center text-fg-muted text-xs">
            {isVi ? 'Không tìm thấy sản phẩm nào phù hợp.' : 'No products found.'}
          </div>
        )}
      </div>

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 bg-surface-inverse/70 z-modal flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-surface rounded-lg max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-e3 border border-line">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-base font-bold text-fg">
                {isVi ? 'Chỉnh Sửa Thông Tin Sản Phẩm' : 'Edit Product'}
              </h3>
              <button aria-label="Đóng" onClick={() => setEditingProduct(null)} className="p-1 text-fg-muted hover:text-fg">
                <Icon name="close" size={24} />
              </button>
            </div>

            <form onSubmit={handleSaveEditProduct} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-fg">Tên sản phẩm *</label>
                <input
                  type="text"
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className="w-full p-2.5 border border-line rounded-lg text-xs font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-fg">Mã SKU</label>
                  <input
                    type="text"
                    value={editingProduct.sku || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value })}
                    className="w-full p-2 border border-line rounded-lg text-xs font-tech"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-fg">Danh mục</label>
                  <select
                    value={editingProduct.category}
                    onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                    className="w-full p-2 border border-line rounded-lg text-xs font-bold bg-surface"
                  >
                    {CATEGORIES.filter(c => c.id !== 'all').map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-fg">Giá Bản In Vật Lý (VNĐ) *</label>
                  <input
                    type="number"
                    min={0}
                    aria-required="true"
                    value={editingProduct.pricePhysical ?? ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, pricePhysical: parseMoneyInput(e.target.value) })}
                    className="w-full p-2 border border-line rounded-lg text-xs font-tech font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-fg">Giá File STL Số (VNĐ) *</label>
                  <input
                    type="number"
                    min={0}
                    aria-required="true"
                    value={editingProduct.priceDigital ?? ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, priceDigital: parseMoneyInput(e.target.value) })}
                    className="w-full p-2 border border-line rounded-lg text-xs font-tech"
                  />
                </div>
              </div>
              <p className="text-xs text-fg-muted">
                Xoá trắng ô giá = "chưa nhập": hệ thống chặn lưu và báo thiếu trường, KHÔNG tự
                quay về 0. Nhập đúng số 0 nếu kênh này không bán.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-fg">Độ Sẵn Sàng In (Readiness)</label>
                  <select
                    value={editingProduct.productionReadiness || 'ready_to_print'}
                    onChange={(e) => setEditingProduct({ ...editingProduct, productionReadiness: e.target.value as any })}
                    className="w-full p-2 border border-line rounded-lg text-xs font-bold bg-surface"
                  >
                    <option value="ready_to_print">Sẵn sàng in</option>
                    <option value="missing_profile">⚠ Thiếu Profile Slicing</option>
                    <option value="cad_review_needed">🔧 Cần CAD Review</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-fg">Trạng thái hiển thị</label>
                  <select
                    value={editingProduct.status}
                    onChange={(e) => setEditingProduct({ ...editingProduct, status: e.target.value as any })}
                    className="w-full p-2 border border-line rounded-lg text-xs font-bold bg-surface"
                  >
                    <option value="Published">Đang Mở Bán (Published)</option>
                    <option value="Out of Stock">Tạm Hết Hàng (Out of Stock)</option>
                    <option value="Under Review">Đang Duyệt</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 bg-surface-muted hover:bg-line-subtle text-fg font-bold rounded-lg cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary hover:bg-primary-hover text-primary-fg font-bold rounded-lg cursor-pointer"
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
        <div className="fixed inset-0 bg-surface-inverse/70 z-modal flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-surface rounded-lg max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-e3 border border-line">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-base font-bold text-fg">
                {isVi ? 'Thêm Sản Phẩm & Bản In Mới' : 'Add New Product'}
              </h3>
              <button aria-label="Đóng" onClick={() => setIsNewProductModalOpen(false)} className="p-1 text-fg-muted hover:text-fg">
                <Icon name="close" size={24} />
              </button>
            </div>

            <form onSubmit={handleSaveNewProduct} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-fg">Tên sản phẩm *</label>
                <input
                  type="text"
                  placeholder="VD: Khớp nối mềm Coupler 8x8mm"
                  value={newProductForm.name}
                  onChange={(e) => setNewProductForm({ ...newProductForm, name: e.target.value })}
                  className="w-full p-2.5 border border-line rounded-lg text-xs font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-fg">Mã SKU (do bạn tự nhập)</label>
                  <input
                    type="text"
                    placeholder={isVi ? 'Để trống nếu chưa có mã' : 'Leave empty if none'}
                    value={newProductForm.sku}
                    onChange={(e) => setNewProductForm({ ...newProductForm, sku: e.target.value })}
                    className="w-full p-2 border border-line rounded-lg text-xs font-tech"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-fg">Danh mục</label>
                  <select
                    value={newProductForm.category}
                    onChange={(e) => setNewProductForm({ ...newProductForm, category: e.target.value })}
                    className="w-full p-2 border border-line rounded-lg text-xs font-bold bg-surface"
                  >
                    {CATEGORIES.filter(c => c.id !== 'all').map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-fg">Giá Bản In (VNĐ) *</label>
                  <input
                    type="number"
                    min={0}
                    aria-required="true"
                    placeholder={isVi ? 'Bắt buộc — nhập giá bản in' : 'Required — enter print price'}
                    value={newProductForm.pricePhysical ?? ''}
                    onChange={(e) => setNewProductForm({ ...newProductForm, pricePhysical: parseMoneyInput(e.target.value) })}
                    className="w-full p-2 border border-line rounded-lg text-xs font-tech font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-fg">Giá File STL (VNĐ) *</label>
                  <input
                    type="number"
                    min={0}
                    aria-required="true"
                    placeholder={isVi ? 'Bắt buộc — nhập giá file STL' : 'Required — enter STL file price'}
                    value={newProductForm.priceDigital ?? ''}
                    onChange={(e) => setNewProductForm({ ...newProductForm, priceDigital: parseMoneyInput(e.target.value) })}
                    className="w-full p-2 border border-line rounded-lg text-xs font-tech"
                  />
                </div>
              </div>
              <p className="text-xs text-fg-muted">
                Giá là dữ liệu THẬT do bạn nhập. Bỏ trống ⇒ hệ thống chặn lưu và báo thiếu trường,
                KHÔNG tự điền giá mẫu. Nhập 0 nếu sản phẩm miễn phí.
              </p>

              {/* Q2 (data-honesty): ô nhập tính năng THẬT — mỗi dòng một tính năng. */}
              <div className="space-y-1">
                <label htmlFor="new-product-features" className="font-bold text-fg">
                  Tính năng sản phẩm (mỗi dòng một tính năng)
                </label>
                <textarea
                  id="new-product-features"
                  rows={3}
                  value={newProductFeaturesText}
                  onChange={(e) => setNewProductFeaturesText(e.target.value)}
                  placeholder={isVi ? 'Để trống nếu chưa xác nhận được tính năng nào' : 'Leave empty if none confirmed'}
                  className="w-full p-2 border border-line rounded-lg text-xs"
                />
                <p className="text-xs text-fg-muted">
                  Chỉ nhập tính năng đã xác nhận. Bỏ trống ⇒ sản phẩm không có tính năng nào, hệ thống
                  không tự thêm.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-fg">Độ Sẵn Sàng In (Readiness)</label>
                  <select
                    value={newProductForm.productionReadiness || 'ready_to_print'}
                    onChange={(e) => setNewProductForm({ ...newProductForm, productionReadiness: e.target.value as any })}
                    className="w-full p-2 border border-line rounded-lg text-xs font-bold bg-surface"
                  >
                    <option value="ready_to_print">Sẵn sàng in</option>
                    <option value="missing_profile">⚠ Thiếu Profile Slicing</option>
                    <option value="cad_review_needed">🔧 Cần CAD Review</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-fg">Ảnh Sản Phẩm (URL) *</label>
                  <input
                    type="text"
                    aria-required="true"
                    placeholder="https://..."
                    value={newProductForm.images?.[0] || ''}
                    onChange={(e) => setNewProductForm({ ...newProductForm, images: [e.target.value] })}
                    className="w-full p-2 border border-line rounded-lg text-xs"
                  />
                  <p className="text-xs text-fg-muted">
                    Dán URL ảnh thật của sản phẩm — hệ thống không tự chèn ảnh mẫu.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setIsNewProductModalOpen(false)}
                  className="px-4 py-2 bg-surface-muted hover:bg-line-subtle text-fg font-bold rounded-lg cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary hover:bg-primary-hover text-primary-fg font-bold rounded-lg cursor-pointer"
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
