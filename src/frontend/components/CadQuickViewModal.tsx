import React, { useState, useEffect } from 'react';
import { Product, CartItem, MaterialProfile, InkiriCostFormulaConfig } from '../../types';
import { MATERIALS_CATALOG } from '../../data/mockData';
import { ThreeModelViewer } from './LazyThreeModelViewer';
import { useLanguage } from '../context/LanguageContext';
import { EMPTY_VALUE, formatNumber } from '@frontend/lib/format';
import { Button, Icon, Modal } from '@frontend/ui';

/** Số hữu hạn hay không — NULL/NaN ⇒ KHÔNG có giá trị (không đoán hộ). */
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/**
 * Tiền VND: thiếu giá trị ⇒ `—`, không bịa `0 đ`.
 * `0` KHÔNG phải một mức giá: `price_digital` / `price_physical` = 0 nghĩa là người bán KHÔNG
 * bán kênh đó (NULL được `mappers.ts` quy về 0). Cùng luật với `HomeView.tsx`,
 * `ExploreView.tsx` và `ProductDetailView.tsx`. Ký hiệu tiền: `₫` (D-B của Lead).
 */
const vnd = (v: unknown, locale: string): string =>
  isNum(v) && v > 0 ? `${formatNumber(v, { locale, maximumFractionDigits: 0 })} ₫` : EMPTY_VALUE;

interface CadQuickViewModalProps {
  product: Product | null;
  isOpen: boolean;
  initialOrderType?: 'digital' | 'physical';
  materials?: MaterialProfile[];
  pricingConfig?: InkiriCostFormulaConfig;
  onClose: () => void;
  onAddToCart?: (item: CartItem) => void;
  onNavigate: (screen: string, payload?: any) => void;
  onShowToast?: (msg: string) => void;
}

interface CadQuickViewBodyProps {
  /** KHÁC outer: body CHỈ được dựng khi product đã có (non-null). */
  product: Product;
  initialOrderType: 'digital' | 'physical';
  materials?: MaterialProfile[];
  onClose: () => void;
  onAddToCart?: (item: CartItem) => void;
  onNavigate: (screen: string, payload?: any) => void;
  onShowToast?: (msg: string) => void;
}

/**
 * CadQuickViewModal — trình xem nhanh CAD/3D từ Home & Explore.
 *
 * **BẪY StrictMode (W2b):** trước đây component này `return null` khi đóng/chưa có product,
 * nên `<Modal>` chỉ được MOUNT lúc `open=true`. Ở dev, StrictMode mount → cleanup → mount:
 * cleanup của `Modal` gọi `dialog.close()`; sự kiện `close` là task BẤT ĐỒNG BỘ nên nó bắn
 * vào listener vừa được gắn lại ở lần mount thứ hai ⇒ `onClose()` ⇒ modal đóng ngay
 * (storefront đo `dialogs=0`, modal không mở được). Cách sửa: **luôn render `<Modal>`**
 * (mount với `open=false` từ đầu, chỉ đổi prop khi mở) để effect mở dialog chạy đúng MỘT lần,
 * và chỉ dựng nội dung khi `product` tồn tại.
 */
export const CadQuickViewModal: React.FC<CadQuickViewModalProps> = ({
  product,
  isOpen,
  initialOrderType = 'digital',
  materials = MATERIALS_CATALOG,
  // `pricingConfig` giữ trong API để call site (Home/Explore) không phải đổi; body chưa dùng.
  onClose,
  onAddToCart,
  onNavigate,
  onShowToast
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Đóng modal ⇒ thoát toàn màn hình; mở lại không dính trạng thái cũ (trước đây unmount reset).
  useEffect(() => {
    if (!isOpen) setIsFullscreen(false);
  }, [isOpen]);

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      size={isFullscreen ? 'full' : 'xl'}
      showCloseButton={false}
      bodyClassName="p-0"
      title={
        <span className="flex w-full flex-wrap items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-2.5">
            <span className="h-2.5 w-2.5 shrink-0 animate-pulse motion-reduce:animate-none rounded-full bg-primary" />
            <span className="truncate font-mono text-xs font-bold uppercase tracking-widest text-fg-muted">
              KIỂM TRA LƯỚI CAD 360°
            </span>
            <span className="hidden text-fg-muted/40 sm:inline">•</span>
            <span className="hidden font-mono text-xs text-fg-muted sm:inline">
              SKU: {product?.sku || EMPTY_VALUE}
            </span>
          </span>

          <span className="flex shrink-0 items-center gap-1.5">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                onClose();
                if (product) onNavigate('product_detail', { product });
              }}
              disabled={!product}
              className="font-mono text-xs"
              title="Xem trang sản phẩm chi tiết"
              trailingIcon={<Icon name="open_in_new" size={16} />}
            >
              Chi tiết đầy đủ
            </Button>

            <Button
              iconOnly
              variant="ghost"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? 'Thu nhỏ' : 'Mở rộng toàn màn hình'}
              aria-label={isFullscreen ? 'Thu nhỏ' : 'Mở rộng toàn màn hình'}
            >
              <Icon name={isFullscreen ? 'fullscreen_exit' : 'fullscreen'} size={18} />
            </Button>

            <Button
              iconOnly
              variant="ghost"
              size="sm"
              onClick={onClose}
              aria-label="Đóng trình xem CAD nhanh"
            >
              <Icon name="close" size={20} />
            </Button>
          </span>
        </span>
      }
    >
      {product ? (
        <CadQuickViewBody
          // Reset state mỗi lần mở/đóng — giữ đúng hành vi cũ (trước đây component unmount).
          key={isOpen ? 'open' : 'closed'}
          product={product}
          initialOrderType={initialOrderType}
          materials={materials}
          onClose={onClose}
          onAddToCart={onAddToCart}
          onNavigate={onNavigate}
          onShowToast={onShowToast}
        />
      ) : null}
    </Modal>
  );
};

/** Toàn bộ nội dung + state mua hàng; chỉ mount khi đã có `product`. */
const CadQuickViewBody: React.FC<CadQuickViewBodyProps> = ({
  product,
  initialOrderType,
  materials = MATERIALS_CATALOG,
  onClose,
  onAddToCart,
  onNavigate,
  onShowToast
}) => {
  const { language } = useLanguage();
  const isVi = language === 'vi';
  const locale = isVi ? 'vi-VN' : 'en-US';

  const [selectedMaterial, setSelectedMaterial] = useState<string>('PLA Tough');
  const [selectedColor, setSelectedColor] = useState<{ name: string; hex: string; available?: boolean }>({
    name: 'Xanh Teal Kỹ Thuật',
    hex: '#008099',
    available: true
  });
  const [orderType, setOrderType] = useState<'digital' | 'physical'>(initialOrderType);
  const [quantity, setQuantity] = useState(1);

  // Sync color & material when product changes
  useEffect(() => {
    if (product.colors && product.colors.length > 0) {
      setSelectedColor(product.colors[0]);
    }
    if (product.supportedMaterials && product.supportedMaterials.length > 0) {
      setSelectedMaterial(product.supportedMaterials[0]);
    }
    setQuantity(1);
    setOrderType(initialOrderType);
  }, [product, initialOrderType]);

  const currentMaterials = materials && materials.length > 0 ? materials : MATERIALS_CATALOG;
  const matchingMat = currentMaterials.find(
    m => m.name.toLowerCase() === selectedMaterial.toLowerCase() ||
         m.id.toLowerCase() === selectedMaterial.toLowerCase()
  );
  /**
   * ĐƠN GIÁ BÁN vật lý = `price_physical` của chính sản phẩm — KHÔNG nhân hệ số nào.
   *
   * `unit_price_multiplier` không phải hệ số nhân giá bán: `pricingEngine.ts:70-88` định nghĩa nó là
   * hệ số SUY ĐƠN GIÁ NHỰA đ/g (`costPerKg ÷ 1000 × hệ số`); dữ liệu thật trong `materials` là
   * 270/320/620/1400/1850 nên nhân thẳng vào giá là sai 270–1850 lần (đo trên DOM: giá niêm yết
   * 250.000 đ hiện thành 67.500.000 đ). Hệ quả CÓ CHỦ Ý: giá ở đây KHÔNG gồm chênh lệch vật liệu —
   * nói rõ ngay dưới ô chọn vật liệu.
   *
   * `price_physical` ≤ 0 (NULL cũng được `mappers.ts` quy về 0) nghĩa là người bán KHÔNG mở bán
   * kênh in vật lý ⇒ `null` ⇒ hiện `—` và CHẶN thêm vào giỏ; KHÔNG hiện `0 đ` như một mức giá thật.
   */
  const physicalPrice: number | null =
    isNum(product.pricePhysical) && product.pricePhysical > 0 ? product.pricePhysical : null;
  const physicalUnitPrice: number | null = physicalPrice;

  /** Tổng tiền in vật lý = đơn giá × số lượng. Thiếu đơn giá ⇒ `null` ⇒ `—`, KHÔNG bịa `NaN`. */
  const physicalTotal: number | null = physicalUnitPrice === null ? null : physicalUnitPrice * quantity;

  /**
   * `price_digital` ≤ 0 cũng nghĩa là người bán KHÔNG mở bán kênh file số — cùng luật với
   * `HomeView.tsx:236` / `ExploreView.tsx:193` / `ProductDetailView.tsx:101`. Trước đây nhánh
   * `digital` đẩy thẳng `product.priceDigital` vào giỏ nên vẫn "bán" được một kênh KHÔNG bán.
   */
  const digitalPrice: number | null =
    isNum(product.priceDigital) && product.priceDigital > 0 ? product.priceDigital : null;
  /** Kênh đang chọn có THẬT SỰ được bán không — quyết định CTA bật/tắt và nhãn nút. */
  const channelSold = orderType === 'digital' ? digitalPrice !== null : physicalUnitPrice !== null;

  /**
   * T3 (data-honesty): chỉ hiện điểm khi có CẢ điểm VÀ số lượng đánh giá THẬT (> 0).
   * `rating = 4.5` nhưng `reviewsCount = 0` không phải một đánh giá — không được hiện "★ 4.5 (0)".
   */
  const ratingValue: number | null = isNum(product.rating) && product.rating > 0 ? product.rating : null;
  const reviewsCount: number | null = isNum(product.reviewsCount) ? product.reviewsCount : null;

  /** Đơn giá nhựa THẬT đã khai của vật liệu đang chọn (đ/g). ≤ 0/thiếu ⇒ `—`, KHÔNG suy diễn. */
  const materialPricePerGram: number | null =
    matchingMat && isNum(matchingMat.pricePerGram) && matchingMat.pricePerGram > 0
      ? matchingMat.pricePerGram
      : null;

  // Determine geometry representation for 3D viewer
  const getModelType = (p: Product): string => {
    const cat = (p.category || '').toLowerCase();
    const name = (p.name || '').toLowerCase();
    if (name.includes('gear') || name.includes('bánh răng') || name.includes('trục') || name.includes('khớp')) return 'gear';
    if (name.includes('drone') || name.includes('cánh') || name.includes('robot')) return 'drone';
    if (name.includes('box') || name.includes('hộp') || name.includes('case') || name.includes('vỏ') || cat.includes('iot')) return 'box';
    if (name.includes('vase') || name.includes('bình') || name.includes('decor')) return 'box';
    return 'gear';
  };

  const handleQuickAdd = () => {
    if (!onAddToCart) {
      onNavigate('product_detail', { product });
      onClose();
      return;
    }

    // Data-honesty: `price_digital` / `price_physical` ≤ 0 (NULL được `mappers.ts` quy về 0) nghĩa
    // là người bán KHÔNG mở bán kênh đó ⇒ KHÔNG đẩy vào giỏ một dòng 0đ. Chỉ giá `> 0` mới là CÓ BÁN.
    const unitPrice: number | null = orderType === 'digital' ? digitalPrice : physicalUnitPrice;
    if (unitPrice === null) {
      // Nêu ĐÍCH DANH kênh không bán — KHÔNG nói "chưa khai báo": DB gộp NULL thành 0 nên
      // "chưa khai" là khẳng định không kiểm chứng được.
      onShowToast?.(orderType === 'digital'
        ? (isVi
            ? `Sản phẩm "${product.name}" không mở bán kênh tệp số (giá tệp số không lớn hơn 0) nên chưa thể mua.`
            : `"${product.name}" is not sold as a CAD file (its CAD price is not greater than 0), so it cannot be purchased.`)
        : (isVi
            ? 'Người bán không mở bán kênh in vật lý cho sản phẩm này (price_physical không lớn hơn 0) nên chưa thể đặt in.'
            : 'The seller does not sell this product as a physical print (price_physical is not greater than 0), so it cannot be ordered yet.'));
      return;
    }

    const item: CartItem = {
      id: `cart-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      productId: product.id,
      type: orderType,
      name: product.name,
      designer: product.designer,
      image: product.images[0],
      // Guard phía trên đã chặn MỌI kênh không bán ⇒ `unitPrice` là số thật, không cần ép kiểu.
      price: unitPrice,
      quantity: quantity,
      material: orderType === 'physical' ? selectedMaterial : undefined,
      color: orderType === 'physical' && product.colors && product.colors.length > 0 ? selectedColor.name : undefined,
      colorHex: orderType === 'physical' && product.colors && product.colors.length > 0 ? selectedColor.hex : undefined,
      dimensions: product.specs?.dimensions,
      // Data-honesty (P3b): KHONG doan ho giay phep/dinh dang tep khi san pham chua khai.
      fileFormat: orderType === 'digital' ? (product.cadFormat ?? undefined) : undefined,
      licenseType: product.licenseType ?? undefined
    };

    onAddToCart(item);
    if (onShowToast) {
      onShowToast(
        isVi
          ? `Đã thêm ${quantity}x ${orderType === 'digital' ? 'tệp CAD' : 'Linh kiện in 3D'} "${product.name}" vào giỏ hàng!`
          : `Added ${quantity}x ${orderType === 'digital' ? 'CAD File' : 'Printed Part'} "${product.name}" to cart!`
      );
    }
    onClose();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12">
      {/* Left 3D Interactive WebGL Canvas */}
      <div className="lg:col-span-7 bg-surface-muted relative flex flex-col p-4 border-b lg:border-b-0 lg:border-r border-line min-h-[360px] lg:min-h-[480px]">
        {/* Top Info Bar */}
        <div className="flex items-center justify-between z-sticky mb-2 gap-2 text-xs font-mono">
          <span className="text-xs text-fg-muted bg-surface px-2.5 py-1 rounded-md border border-line flex items-center gap-1.5">
            <Icon name="view_in_ar" size={16} className="text-fg-subtle" />
            <span>Màu vật liệu: <strong className="text-fg">{selectedColor.name}</strong></span>
          </span>
        </div>

        {/* 3D Canvas Viewport with Built-in Orientation and Slicing Controls */}
        <div className="flex-1 w-full relative min-h-[280px] rounded-lg overflow-hidden border border-line bg-surface shadow-e0">
          <ThreeModelViewer
            modelType={getModelType(product)}
            color={selectedColor.hex}
            className="h-full w-full"
            showGrid={true}
          />
        </div>

        <p className="mt-2 text-center font-mono text-xs text-fg-muted">
          {isVi
            ? 'Mô hình minh họa theo danh mục — không phải tệp CAD gốc của sản phẩm.'
            : 'Category-based illustrative model — not the product’s original CAD file.'}
        </p>

        {/* Bottom Metrology Stats Strip */}
        {/* A11Y-11: 4 cột ở 390px làm mỗi ô ~77px ⇒ “Kích thước” bị `truncate` thành “120 × 8…”.
            2 cột dưới `sm` + bỏ `truncate` để giá trị đo được đọc trọn (wrap thay vì cắt). */}
        <div className="mt-2.5 pt-2.5 border-t border-line grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono text-xs text-fg-muted">
          <div className="bg-surface p-2 rounded-lg border border-line">
            <span className="text-xs text-fg-muted uppercase block mb-0.5">Dung Sai</span>
            <span className="text-fg-muted font-bold" title="Chưa có dữ liệu đo kiểm cho sản phẩm này">—</span>
          </div>
          <div className="bg-surface p-2 rounded-lg border border-line">
            <span className="text-xs text-fg-muted uppercase block mb-0.5">Kích Thước</span>
            <span className="text-fg font-bold block break-words">{product.specs?.dimensions || '—'}</span>
          </div>
          <div className="bg-surface p-2 rounded-lg border border-line">
            <span className="text-xs text-fg-muted uppercase block mb-0.5">Thời Gian In</span>
            <span className="text-fg font-bold">{product.printTime || EMPTY_VALUE}</span>
          </div>
          <div className="bg-surface p-2 rounded-lg border border-line">
            <span className="text-xs text-fg-muted uppercase block mb-0.5">Định Dạng</span>
            <span className="text-fg font-bold">{product.cadFormat || EMPTY_VALUE}</span>
          </div>
        </div>
      </div>

      {/* Right Product Specs & Purchase Options */}
      <div className="lg:col-span-5 p-5 sm:p-6 flex flex-col justify-between space-y-4 bg-surface text-fg">
        <div>
          <div className="flex items-center gap-2 mb-1.5 font-mono">
            <span className="px-2 py-0.5 bg-primary-tint text-fg border border-line text-xs font-bold rounded-sm uppercase">
              {product.category}
            </span>
            {ratingValue !== null && reviewsCount !== null && reviewsCount > 0 ? (
              <span className="text-xs text-warning font-bold flex items-center gap-1 tabular-nums">
                ★ {ratingValue} ({formatNumber(reviewsCount, { locale, maximumFractionDigits: 0 })} {isVi ? 'đánh giá' : 'reviews'})
              </span>
            ) : (
              <span className="text-xs text-fg-muted font-mono">
                {isVi ? 'Chưa có đánh giá' : 'No reviews yet'}
              </span>
            )}
          </div>

          <h2 className="text-lg font-bold tracking-tight text-fg leading-snug">
            {product.name}
          </h2>
          <p className="text-xs text-fg-muted font-mono mt-0.5">
            {isVi ? 'Kỹ sư thiết kế:' : 'Designed by:'} <strong className="text-fg">{product.designer}</strong>
          </p>

          <p className="text-sm text-fg-muted mt-2 line-clamp-2 leading-relaxed">
            {product.description}
          </p>

          {/* Order Mode Selector Toggle */}
          <div className="mt-4 p-1 bg-surface-muted rounded-full border border-line grid grid-cols-2 gap-1 font-mono">
            <button
              type="button"
              aria-pressed={orderType === 'digital'}
              onClick={() => setOrderType('digital')}
              className={`py-2 px-3 rounded-full text-sm transition-colors duration-200 flex flex-col items-center justify-center cursor-pointer ${
                orderType === 'digital'
                  ? 'bg-surface text-fg font-semibold shadow-soft'
                  : 'text-fg-muted font-medium hover:text-fg'
              }`}
            >
              <div className="flex items-center gap-1">
                <Icon name="download" size={16} />
                <span className="text-xs">{isVi ? 'Tải tệp CAD' : 'Buy CAD'}</span>
              </div>
              <span className={`text-xs mt-0.5 font-semibold tabular-nums ${orderType === 'digital' ? 'text-fg' : 'text-fg-muted'}`}>
                {vnd(digitalPrice, locale)}
              </span>
            </button>

            <button
              type="button"
              aria-pressed={orderType === 'physical'}
              onClick={() => setOrderType('physical')}
              className={`py-2 px-3 rounded-full text-sm transition-colors duration-200 flex flex-col items-center justify-center cursor-pointer ${
                orderType === 'physical'
                  ? 'bg-surface text-fg font-semibold shadow-soft'
                  : 'text-fg-muted font-medium hover:text-fg'
              }`}
            >
              <div className="flex items-center gap-1">
                <Icon name="precision_manufacturing" size={16} />
                <span className="text-xs">{isVi ? 'In 3D Vật Lý' : 'Print 3D'}</span>
              </div>
              <span className={`text-xs mt-0.5 font-semibold tabular-nums ${orderType === 'physical' ? 'text-fg' : 'text-fg-muted'}`}>
                {vnd(physicalTotal, locale)}
              </span>
            </button>
          </div>

          {/* Dynamic Options based on Selected Mode */}
          {orderType === 'digital' ? (
            <div className="mt-3.5 space-y-2 text-xs bg-surface-muted p-3.5 rounded-lg border border-line font-mono">
              <div className="flex items-center justify-between text-xs text-fg-muted">
                <span>Định dạng tệp:</span>
                <strong className="text-fg">{product.cadFormat || (isVi ? '— (người bán chưa khai báo)' : '— (not declared)')}</strong>
              </div>
              <div className="flex items-center justify-between text-xs text-fg-muted">
                <span>Bản quyền:</span>
                <strong className="text-fg">{product.licenseType || EMPTY_VALUE}</strong>
              </div>
              <div className="flex items-center justify-between text-xs text-fg-muted">
                <span>Kiểm định hình học:</span>
                <span
                  className="text-fg-muted font-bold"
                  title="Chưa có hồ sơ kiểm định hình học cho sản phẩm này"
                >
                  — Chưa có hồ sơ kiểm định
                </span>
              </div>
            </div>
          ) : (
            <div className="mt-3.5 space-y-3 bg-surface-muted p-3.5 rounded-lg border border-line font-mono text-xs">
              {/* Material dropdown */}
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="cad-quick-material" className="text-xs text-fg-muted">Vật liệu:</label>
                <select
                  id="cad-quick-material"
                  value={selectedMaterial}
                  onChange={(e) => setSelectedMaterial(e.target.value)}
                  className="h-9 rounded-md border border-line-control bg-surface px-2.5 text-xs text-fg transition-colors duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
                >
                  {product.supportedMaterials.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              {/* Đơn giá nhựa THẬT đã khai (đ/g) + minh bạch: giá bán KHÔNG gồm chênh lệch vật liệu */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-fg-muted">
                  {isVi ? 'Đơn giá nhựa đã khai:' : 'Declared material rate:'}
                </span>
                <strong className="text-fg">
                  {materialPricePerGram === null
                    ? EMPTY_VALUE
                    : `${formatNumber(materialPricePerGram, { locale })} ₫/g`}
                </strong>
              </div>
              <p className="text-xs text-fg-muted leading-relaxed">
                {isVi
                  ? 'Giá in theo giá niêm yết của sản phẩm — chưa gồm chênh lệch vật liệu (xưởng xác nhận khi báo giá).'
                  : 'The print price is the product list price — material price differences are not included (the workshop confirms them in the quote).'}
              </p>

              {/* Color Swatches picker syncing to 3D Canvas */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-fg-muted">Màu sắc:</span>
                <div className="flex items-center gap-1.5">
                  {product.colors && product.colors.length > 0 ? (
                    product.colors.map((c) => (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => setSelectedColor(c)}
                        aria-label={c.name}
                        aria-pressed={selectedColor.name === c.name}
                        className={`w-6 h-6 rounded-full border-2 transition-[transform,box-shadow] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                          selectedColor.name === c.name
                            ? 'border-primary scale-115 ring-2 ring-primary/40 shadow-e1'
                            : 'border-line-control hover:scale-105'
                        }`}
                        style={{ backgroundColor: c.hex }}
                        title={c.name}
                      />
                    ))
                  ) : (
                    <span className="text-xs text-fg-muted font-mono">
                      {isVi ? 'Người bán chưa khai màu' : 'No colors declared'}
                    </span>
                  )}
                </div>
              </div>

              {/* Quantity Counter */}
              <div className="flex items-center justify-between pt-1 border-t border-line">
                <span className="text-xs text-fg-muted">Số lượng:</span>
                <div className="flex items-center overflow-hidden rounded-md border border-line-control bg-surface">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    aria-label="Giảm số lượng"
                    className="flex h-9 w-9 items-center justify-center text-fg transition-colors hover:bg-surface-muted font-bold touch-target-btn cursor-pointer"
                  >
                    -
                  </button>
                  <span className="border-x border-line px-3 py-0.5 text-xs font-bold text-fg tabular-nums">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity(quantity + 1)}
                    aria-label="Tăng số lượng"
                    className="flex h-9 w-9 items-center justify-center text-fg transition-colors hover:bg-surface-muted font-bold touch-target-btn cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tags */}
          <div className="flex flex-wrap gap-1 mt-3">
            {product.tags.slice(0, 4).map((tg) => (
              <span
                key={tg}
                className="text-xs font-mono px-2 py-0.5 rounded-sm bg-surface-muted text-fg-muted border border-line"
              >
                #{tg}
              </span>
            ))}
          </div>
        </div>

        {/* Action Buttons in Modal.
            A11Y-01: trước đây footer `flex-col` + CTA `flex-1` ⇒ ở <sm CTA co còn 16px cao
            (flex-basis:0% + column grow = 0, chỉ còn line-box). `w-full sm:flex-1` giữ nguyên
            hành vi desktop (CTA giãn ngang) và để `h-12` của Button quyết định chiều cao mobile;
            `shrink-0` chặn footer bị ép theo cột phải. Modal `footer` slot không dùng được ở đây:
            CTA phụ thuộc state mua hàng (orderType/quantity/channelSold/handleQuickAdd) nằm trong
            `CadQuickViewBody`; đưa ra ngoài phải lift toàn bộ state mua hàng — ngoài phạm vi fix. */}
        <div className="pt-3 border-t border-line flex shrink-0 flex-col gap-2 sm:flex-row">
          <Button
            onClick={handleQuickAdd}
            disabled={!channelSold}
            size="lg"
            title={channelSold
              ? undefined
              : orderType === 'digital'
                ? (isVi ? 'Người bán không mở bán kênh tệp số.' : 'The seller does not sell this product as a CAD file.')
                : (isVi ? 'Người bán không mở bán kênh in vật lý.' : 'The seller does not sell this product as a physical print.')}
            className="w-full sm:flex-1 font-mono text-xs uppercase tracking-wider"
            leadingIcon={<Icon name="shopping_bag" size={16} />}
          >
            <span>
              {orderType === 'digital'
                ? digitalPrice === null
                ? (isVi ? 'Không bán tệp số' : 'File not sold')
                : (isVi ? 'Thêm tệp CAD vào giỏ' : 'Add CAD to Cart')
                : physicalTotal === null
                ? (isVi ? 'Không bán bản in 3D' : 'Print not sold')
                : (isVi
                    ? `Đặt In 3D (${vnd(physicalTotal, locale)})`
                    : `Order 3D Print (${vnd(physicalTotal, locale)})`)}
            </span>
          </Button>

          {product.isCustomizable && (
            <Button
              variant="secondary"
              size="lg"
              onClick={() => {
                onClose();
                onNavigate('personalize', { product });
              }}
              className="font-mono text-xs uppercase tracking-wider"
              leadingIcon={<Icon name="tune" size={16} />}
              title={isVi ? 'Khắc tên / Tùy biến tham số' : 'Personalize dimensions'}
              /* A11Y-10: nhãn chữ bị `hidden sm:inline` ⇒ ở <640px tên chỉ còn từ `title`,
                 không đáng tin với AT/chạm. aria-label giữ tên ổn định ở mọi breakpoint. */
              aria-label={isVi ? 'Tuỳ biến 3D & khắc laser' : 'Customize 3D & laser engraving'}
            >
              <span className="hidden sm:inline">{isVi ? 'Tùy Biến' : 'Customize'}</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
