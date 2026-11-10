import React, { useMemo, useState } from 'react';
import { Product } from '@/types';
import { CATEGORIES } from '@/data/mockData';
import { dbService } from '../../../backend/supabase/database';
import { Button, ConfirmDialog, DataTable, EmptyState, Field, Icon, Input, Modal, Select } from '@frontend/ui';
import type { DataTableColumn } from '@frontend/ui';
import { buildAdminProductColumns } from './adminProductColumns';
import {
  ADMIN_STATUS_OPTIONS,
  formatPublishIssues,
  normalizeProductStatus,
  toAdminSelectStatus,
  validateProductForPublish,
} from '@frontend/lib/productStatus';

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
  // UI-01: sản phẩm mới KHÔNG tự đăng bán — tạo ở dạng nháp để admin tự kiểm điều kiện
  // (ảnh/giá/giấy phép) rồi mới publish. Trước đây form không chọn trạng thái nhưng luôn
  // ghi 'Published' (giá trị DB default) dù thiếu giấy phép.
  status: 'draft',
  // Sản phẩm admin tạo do nền tảng bán ⇒ không đòi designer_id (khác 'designer').
  sellerType: 'platform',
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
      onShowToast('Vui lòng nhập tên sản phẩm');
      return;
    }

    const imageUrl = newProductForm.images?.[0]?.trim() || '';
    if (!imageUrl) {
      onShowToast(
        'Vui lòng nhập URL ảnh sản phẩm — hệ thống không tự chèn ảnh mẫu'
      );
      return;
    }

    const pricePhysical = newProductForm.pricePhysical;
    if (pricePhysical === undefined || !Number.isFinite(pricePhysical)) {
      onShowToast('Vui lòng nhập Giá Bản In (VNĐ)');
      return;
    }
    if (pricePhysical < 0) {
      onShowToast('Giá Bản In không được là số âm');
      return;
    }

    const priceDigital = newProductForm.priceDigital;
    if (priceDigital === undefined || !Number.isFinite(priceDigital)) {
      onShowToast('Vui lòng nhập Giá Tệp STL (VNĐ)');
      return;
    }
    if (priceDigital < 0) {
      onShowToast('Giá Tệp STL không được là số âm');
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
      // UI-01: trạng thái do admin chọn trên form mới (mặc định 'draft'); giấy phép chỉ ghi
      // khi admin đã khai — không tự gán 'Standard' thay admin.
      status: (newProductForm.status || 'draft') as Product['status'],
      licenseType: newProductForm.licenseType,
      sellerType: newProductForm.sellerType || 'platform',
      productionReadiness: newProductForm.productionReadiness || 'ready_to_print'
    };

    // UI-01: chỉ đăng bán khi sản phẩm đã đủ điều kiện; nêu rõ lý do còn thiếu.
    if (normalizeProductStatus(created.status) === 'published') {
      const readiness = validateProductForPublish(created);
      if (!readiness.ready) {
        onShowToast(`Không thể đăng bán: ${formatPublishIssues(readiness)}`);
        return;
      }
    }

    onAddProduct(created);
    setIsNewProductModalOpen(false);
    onShowToast(`Đã thêm sản phẩm "${created.name}" vào hệ thống`);
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
      onShowToast('Vui lòng nhập Giá Bản In Vật Lý (VNĐ)');
      return;
    }
    if (pricePhysical < 0) {
      onShowToast('Giá Bản In Vật Lý không được là số âm');
      return;
    }

    const priceDigital = editingProduct.priceDigital;
    if (priceDigital === undefined || !Number.isFinite(priceDigital)) {
      onShowToast('Vui lòng nhập Giá Tệp STL Số (VNĐ)');
      return;
    }
    if (priceDigital < 0) {
      onShowToast('Giá Tệp STL Số không được là số âm');
      return;
    }

    // Chỉ tới đây mới ghi xuống DB: hai giá là số admin ĐÃ nhập (0 cũng là số thật).
    const updatedProduct: Product = { ...editingProduct, pricePhysical, priceDigital };
    // UI-01: đổi sang 'published' (hoặc đang published) mà thiếu điều kiện ⇒ CHẶN + nêu lý do.
    if (normalizeProductStatus(updatedProduct.status) === 'published') {
      const readiness = validateProductForPublish(updatedProduct);
      if (!readiness.ready) {
        onShowToast(`Không thể đăng bán: ${formatPublishIssues(readiness)}`);
        return;
      }
    }
    onUpdateProduct(updatedProduct);
    setEditingProduct(null);
    onShowToast(`Đã cập nhật sản phẩm "${editingProduct.name}"`);
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

  /** Cột bảng tách ở `adminProductColumns.tsx` (UI-01: chặn publish thiếu điều kiện). */
  const productColumns = useMemo<DataTableColumn<Product>[]>(
    () =>
      buildAdminProductColumns({
        onEditProduct: (product) => setEditingProduct({ ...product }),
        onDeleteRequest: handleDeleteProductConfirm,
        onUpdateProduct,
        onShowToast,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  /**
   * UI-01: lý do CHƯA đăng bán được của sản phẩm đang sửa — hiển thị ngay dưới select trạng
   * thái để admin biết cần bổ sung gì (toast chỉ là thông báo tức thời).
   */
  const editingPublishIssues =
    editingProduct && normalizeProductStatus(editingProduct.status) === 'published'
      ? validateProductForPublish({
          ...editingProduct,
          pricePhysical: editingProduct.pricePhysical ?? 0,
          priceDigital: editingProduct.priceDigital ?? 0,
        } as Product).issues
      : [];

  return (
    <div className="space-y-6">
      <ConfirmDialog
        open={pendingDeleteProduct !== null}
        tone="danger"
        title="Xoá sản phẩm"
        description={
          pendingDeleteProduct
            ? (`Bạn có chắc chắn muốn xoá sản phẩm "${pendingDeleteProduct.name}"? Hành động này không hoàn tác được.`)
            : ''
        }
        confirmLabel="Xoá sản phẩm"
        cancelLabel="Huỷ"
        onCancel={() => setPendingDeleteProduct(null)}
        onConfirm={() => {
          if (!pendingDeleteProduct) return;
          onDeleteProduct(pendingDeleteProduct.id);
          onShowToast(`Đã xóa sản phẩm "${pendingDeleteProduct.name}"`);
          setPendingDeleteProduct(null);
        }}
      />
      {/* Header & Add Button Bar */}
      <div className="flex flex-col items-stretch justify-between gap-4 rounded-lg border border-line-subtle bg-surface p-4 md:flex-row md:items-end">
        <div className="w-full max-w-md">
          <Field id="admin-products-search" label="Tìm sản phẩm" hideLabel optionalLabel={null}>
            {(control) => (
              <div className="relative">
                <Icon name="search" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
                <Input
                  {...control}
                  type="search"
                  size="sm"
                  placeholder="Tìm theo tên sản phẩm, SKU..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            )}
          </Field>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {/* Category Filter */}
          <div className="w-full sm:w-44">
            <Field id="admin-products-category" label="Lọc theo danh mục" hideLabel optionalLabel={null}>
              {(control) => (
                <Select
                  {...control}
                  size="sm"
                  value={productCategoryFilter}
                  onChange={(e) => setProductCategoryFilter(e.target.value)}
                >
                  <option value="all">Tất Cả Danh Mục</option>
                  {CATEGORIES.filter(c => c.id !== 'all').map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
              )}
            </Field>
          </div>

          {/* Production Readiness Filter */}
          <div className="w-full sm:w-44">
            <Field id="admin-products-readiness" label="Lọc theo chuẩn in" hideLabel optionalLabel={null}>
              {(control) => (
                <Select
                  {...control}
                  size="sm"
                  value={readinessFilter}
                  onChange={(e) => setReadinessFilter(e.target.value)}
                >
                  <option value="all">Tất Cả Chuẩn In</option>
                  <option value="ready_to_print">Sẵn sàng in</option>
                  <option value="missing_profile">Thiếu hồ sơ cắt lớp</option>
                  <option value="cad_review_needed">Cần duyệt CAD</option>
                </Select>
              )}
            </Field>
          </div>

          <Button
            variant="primary"
            size="sm"
            leadingIcon={<Icon name="add_circle" size={16} />}
            onClick={() => setIsNewProductModalOpen(true)}
          >
            Thêm Sản Phẩm Mới
          </Button>
        </div>
      </div>

      {/* Products Table — primitive DataTable (sort + phân trang + empty state ngoài bảng) */}
      <DataTable<Product>
        columns={productColumns}
        rows={filteredProducts}
        getRowId={(row) => row.id}
        caption="Danh sách sản phẩm"
        tableLabel="Danh sách sản phẩm"
        defaultSort={[{ key: 'name', direction: 'asc' }]}
        emptyState={
          <EmptyState
            live
            title="Không tìm thấy sản phẩm nào phù hợp"
            description="Thử xoá từ khoá hoặc đổi bộ lọc danh mục / chuẩn in."
          />
        }
      />

      {/* Edit Product Modal */}
      {editingProduct && (
        <Modal
          open
          onClose={() => setEditingProduct(null)}
          size="lg"
          title="Chỉnh Sửa Thông Tin Sản Phẩm"
        >
            <form onSubmit={handleSaveEditProduct} className="space-y-5">
              <Field label="Tên sản phẩm *" required requiredMark="" optionalLabel={null}>
                {(control) => (
                  <Input
                    {...control}
                    type="text"
                    value={editingProduct.name}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    required
                  />
                )}
              </Field>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Mã SKU" optionalLabel={null}>
                  {(control) => (
                    <Input
                      {...control}
                      type="text"
                      value={editingProduct.sku || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value })}
                      className="font-mono"
                    />
                  )}
                </Field>
                <Field label="Danh mục" optionalLabel={null}>
                  {(control) => (
                    <Select
                      {...control}
                      value={editingProduct.category}
                      onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                    >
                      {CATEGORIES.filter(c => c.id !== 'all').map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </Select>
                  )}
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Giá Bản In Vật Lý (VNĐ) *" optionalLabel={null}>
                  {(control) => (
                    <Input
                      {...control}
                      type="number"
                      min={0}
                      aria-required="true"
                      numeric
                      value={editingProduct.pricePhysical ?? ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, pricePhysical: parseMoneyInput(e.target.value) })}
                    />
                  )}
                </Field>
                <Field label="Giá Tệp STL Số (VNĐ) *" optionalLabel={null}>
                  {(control) => (
                    <Input
                      {...control}
                      type="number"
                      min={0}
                      aria-required="true"
                      numeric
                      value={editingProduct.priceDigital ?? ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, priceDigital: parseMoneyInput(e.target.value) })}
                    />
                  )}
                </Field>
              </div>
              <p className="text-xs text-fg-muted">
                Xoá trắng ô giá = "chưa nhập": hệ thống chặn lưu và báo thiếu trường, KHÔNG tự
                quay về 0. Nhập đúng số 0 nếu kênh này không bán.
              </p>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Độ Sẵn Sàng In" optionalLabel={null}>
                  {(control) => (
                    <Select
                      {...control}
                      value={editingProduct.productionReadiness || 'ready_to_print'}
                      onChange={(e) => setEditingProduct({ ...editingProduct, productionReadiness: e.target.value as any })}
                    >
                      <option value="ready_to_print">Sẵn sàng in</option>
                      <option value="missing_profile">Thiếu hồ sơ cắt lớp</option>
                      <option value="cad_review_needed">Cần duyệt CAD</option>
                    </Select>
                  )}
                </Field>
                <Field label="Trạng thái hiển thị" hint="Đăng bán chỉ khi đủ điều kiện bên dưới." optionalLabel={null}>
                  {(control) => (
                    <Select
                      {...control}
                      value={toAdminSelectStatus(editingProduct.status)}
                      onChange={(e) => setEditingProduct({ ...editingProduct, status: e.target.value as any })}
                    >
                      {ADMIN_STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </Select>
                  )}
                </Field>
                <Field label="Giấy phép sử dụng" hint="Bắt buộc để đăng bán." optionalLabel={null}>
                  {(control) => (
                    <Select
                      {...control}
                      value={editingProduct.licenseType || ''}
                      onChange={(e) =>
                        setEditingProduct({
                          ...editingProduct,
                          licenseType: (e.target.value || undefined) as Product['licenseType'],
                        })
                      }
                    >
                      <option value="">Chưa khai</option>
                      <option value="Standard">Tiêu chuẩn (Standard)</option>
                      <option value="Commercial">Thương mại (Commercial)</option>
                      <option value="Exclusive">Độc quyền (Exclusive)</option>
                    </Select>
                  )}
                </Field>
                <Field label="Bên bán" hint="'Tác giả 3D' cần designer_id liên kết." optionalLabel={null}>
                  {(control) => (
                    <Select
                      {...control}
                      value={editingProduct.sellerType || ''}
                      onChange={(e) =>
                        setEditingProduct({
                          ...editingProduct,
                          sellerType: (e.target.value || undefined) as Product['sellerType'],
                        })
                      }
                    >
                      <option value="">Chưa khai</option>
                      <option value="platform">Nền tảng VCUBE</option>
                      <option value="designer">Tác giả 3D</option>
                    </Select>
                  )}
                </Field>
              </div>

              {editingPublishIssues.length > 0 && (
                <div className="rounded-md border border-warning/20 bg-warning-tint p-3 text-xs text-fg-muted">
                  <p className="font-semibold text-warning">Chưa đủ điều kiện đăng bán</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-4">
                    {editingPublishIssues.map((issue) => (
                      <li key={`${issue.code}-${issue.field}`}>{issue.message}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-end gap-2 border-t border-line-subtle pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setEditingProduct(null)}
                >
                  Hủy
                </Button>
                <Button type="submit" variant="primary">
                  Lưu Thay Đổi
                </Button>
              </div>
            </form>
        </Modal>
      )}

      {/* Add New Product Modal */}
      {isNewProductModalOpen && (
        <Modal
          open
          onClose={() => setIsNewProductModalOpen(false)}
          size="lg"
          title={'Thêm Sản Phẩm & Bản In Mới'}
        >
            <form onSubmit={handleSaveNewProduct} className="space-y-5">
              <Field label="Tên sản phẩm *" required requiredMark="" optionalLabel={null}>
                {(control) => (
                  <Input
                    {...control}
                    type="text"
                    placeholder="VD: Khớp nối mềm Coupler 8x8mm"
                    value={newProductForm.name}
                    onChange={(e) => setNewProductForm({ ...newProductForm, name: e.target.value })}
                    required
                  />
                )}
              </Field>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Mã SKU (do bạn tự nhập)" optionalLabel={null}>
                  {(control) => (
                    <Input
                      {...control}
                      type="text"
                      placeholder="Để trống nếu chưa có mã"
                      value={newProductForm.sku}
                      onChange={(e) => setNewProductForm({ ...newProductForm, sku: e.target.value })}
                      className="font-mono"
                    />
                  )}
                </Field>
                <Field label="Danh mục" optionalLabel={null}>
                  {(control) => (
                    <Select
                      {...control}
                      value={newProductForm.category}
                      onChange={(e) => setNewProductForm({ ...newProductForm, category: e.target.value })}
                    >
                      {CATEGORIES.filter(c => c.id !== 'all').map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </Select>
                  )}
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Giá Bản In (VNĐ) *" optionalLabel={null}>
                  {(control) => (
                    <Input
                      {...control}
                      type="number"
                      min={0}
                      aria-required="true"
                      numeric
                      placeholder="Bắt buộc — nhập giá bản in"
                      value={newProductForm.pricePhysical ?? ''}
                      onChange={(e) => setNewProductForm({ ...newProductForm, pricePhysical: parseMoneyInput(e.target.value) })}
                    />
                  )}
                </Field>
                <Field label="Giá Tệp STL (VNĐ) *" optionalLabel={null}>
                  {(control) => (
                    <Input
                      {...control}
                      type="number"
                      min={0}
                      aria-required="true"
                      numeric
                      placeholder="Bắt buộc — nhập giá tệp STL"
                      value={newProductForm.priceDigital ?? ''}
                      onChange={(e) => setNewProductForm({ ...newProductForm, priceDigital: parseMoneyInput(e.target.value) })}
                    />
                  )}
                </Field>
              </div>
              <p className="text-xs text-fg-muted">
                Giá là dữ liệu THẬT do bạn nhập. Bỏ trống ⇒ hệ thống chặn lưu và báo thiếu trường,
                KHÔNG tự điền giá mẫu. Nhập 0 nếu sản phẩm miễn phí.
              </p>

              {/* Q2 (data-honesty): ô nhập tính năng THẬT — mỗi dòng một tính năng. */}
              <Field
                label="Tính năng sản phẩm (mỗi dòng một tính năng)"
                hint="Chỉ nhập tính năng đã xác nhận. Bỏ trống ⇒ sản phẩm không có tính năng nào, hệ thống không tự thêm."
                optionalLabel={null}
              >
                {(control) => (
                  <textarea
                    {...control}
                    rows={3}
                    value={newProductFeaturesText}
                    onChange={(e) => setNewProductFeaturesText(e.target.value)}
                    placeholder="Để trống nếu chưa xác nhận được tính năng nào"
                    className="w-full rounded-md border border-line-control bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:border-primary focus:ring-2 focus:ring-ring aria-invalid:border-danger"
                  />
                )}
              </Field>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Độ Sẵn Sàng In" optionalLabel={null}>
                  {(control) => (
                    <Select
                      {...control}
                      value={newProductForm.productionReadiness || 'ready_to_print'}
                      onChange={(e) => setNewProductForm({ ...newProductForm, productionReadiness: e.target.value as any })}
                    >
                      <option value="ready_to_print">Sẵn sàng in</option>
                      <option value="missing_profile">Thiếu hồ sơ cắt lớp</option>
                      <option value="cad_review_needed">Cần duyệt CAD</option>
                    </Select>
                  )}
                </Field>
                <Field
                  label="Ảnh Sản Phẩm (URL) *"
                  hint="Dán URL ảnh thật của sản phẩm — hệ thống không tự chèn ảnh mẫu."
                  optionalLabel={null}
                >
                  {(control) => (
                    <Input
                      {...control}
                      type="text"
                      aria-required="true"
                      placeholder="https://..."
                      value={newProductForm.images?.[0] || ''}
                      onChange={(e) => setNewProductForm({ ...newProductForm, images: [e.target.value] })}
                    />
                  )}
                </Field>
                <Field label="Trạng thái" hint="Mặc định Nháp; chỉ Đang bán khi đủ điều kiện." optionalLabel={null}>
                  {(control) => (
                    <Select
                      {...control}
                      value={toAdminSelectStatus(newProductForm.status)}
                      onChange={(e) => setNewProductForm({ ...newProductForm, status: e.target.value as Product['status'] })}
                    >
                      {ADMIN_STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </Select>
                  )}
                </Field>
                <Field label="Giấy phép sử dụng" hint="Bắt buộc để đăng bán." optionalLabel={null}>
                  {(control) => (
                    <Select
                      {...control}
                      value={newProductForm.licenseType || ''}
                      onChange={(e) =>
                        setNewProductForm({
                          ...newProductForm,
                          licenseType: (e.target.value || undefined) as Product['licenseType'],
                        })
                      }
                    >
                      <option value="">Chưa khai</option>
                      <option value="Standard">Tiêu chuẩn (Standard)</option>
                      <option value="Commercial">Thương mại (Commercial)</option>
                      <option value="Exclusive">Độc quyền (Exclusive)</option>
                    </Select>
                  )}
                </Field>
              </div>

              <div className="flex justify-end gap-2 border-t border-line-subtle pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsNewProductModalOpen(false)}
                >
                  Hủy
                </Button>
                <Button type="submit" variant="primary">
                  Thêm Vào Danh Mục
                </Button>
              </div>
            </form>
        </Modal>
      )}
    </div>
  );
};
