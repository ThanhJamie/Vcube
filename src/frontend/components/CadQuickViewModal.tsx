import React, { useState, useEffect } from 'react';
import { Product, CartItem, MaterialProfile, InkiriCostFormulaConfig } from '../../types';
import { MATERIALS_CATALOG } from '../../data/mockData';
import { ThreeModelViewer } from './ThreeModelViewer';
import { useLanguage } from '../context/LanguageContext';

interface CadQuickViewModalProps {
  product: Product | null;
  isOpen: boolean;
  materials?: MaterialProfile[];
  pricingConfig?: InkiriCostFormulaConfig;
  onClose: () => void;
  onAddToCart?: (item: CartItem) => void;
  onNavigate: (screen: string, payload?: any) => void;
  onShowToast?: (msg: string) => void;
}

export const CadQuickViewModal: React.FC<CadQuickViewModalProps> = ({
  product,
  isOpen,
  materials = MATERIALS_CATALOG,
  pricingConfig,
  onClose,
  onAddToCart,
  onNavigate,
  onShowToast
}) => {
  const { language } = useLanguage();
  const isVi = language === 'vi';

  const [selectedMaterial, setSelectedMaterial] = useState<string>('PLA Tough');
  const [selectedColor, setSelectedColor] = useState<{ name: string; hex: string; available?: boolean }>({
    name: 'Xanh Teal Kỹ Thuật',
    hex: '#008099',
    available: true
  });
  const [orderType, setOrderType] = useState<'digital' | 'physical'>('digital');
  const [quantity, setQuantity] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Sync color & material when product changes
  useEffect(() => {
    if (product) {
      if (product.colors && product.colors.length > 0) {
        setSelectedColor(product.colors[0]);
      }
      if (product.supportedMaterials && product.supportedMaterials.length > 0) {
        setSelectedMaterial(product.supportedMaterials[0]);
      }
      setQuantity(1);
    }
  }, [product]);

  // Lock scroll & handle Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !product) return null;

  const currentMaterials = materials && materials.length > 0 ? materials : MATERIALS_CATALOG;
  const matchingMat = currentMaterials.find(
    m => m.name.toLowerCase() === selectedMaterial.toLowerCase() || 
         m.id.toLowerCase() === selectedMaterial.toLowerCase()
  );
  const physicalUnitPrice = Math.round(product.pricePhysical * (matchingMat?.unitPriceMultiplier || 1));

  // Determine geometry representation for 3D viewer
  const getModelType = (p: Product): string => {
    const cat = (p.category || '').toLowerCase();
    const name = (p.name || '').toLowerCase();
    if (name.includes('gear') || name.includes('bánh răng') || name.includes('trục') || name.includes('khớp')) return 'gear';
    if (name.includes('drone') || name.includes('cánh') || name.includes('robot')) return 'drone';
    if (name.includes('box') || name.includes('hộp') || name.includes('case') || name.includes('vỏ') || cat.includes('iot')) return 'box';
    if (name.includes('vase') || name.includes('bình') || name.includes('decor')) return 'vase';
    return 'gear';
  };

  const handleQuickAdd = () => {
    if (!onAddToCart) {
      onNavigate('product_detail', { product });
      onClose();
      return;
    }

    const item: CartItem = {
      id: `cart-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      productId: product.id,
      type: orderType,
      name: product.name,
      designer: product.designer,
      image: product.images[0],
      price: orderType === 'digital' ? product.priceDigital : physicalUnitPrice,
      quantity: quantity,
      material: orderType === 'physical' ? selectedMaterial : undefined,
      color: orderType === 'physical' ? selectedColor.name : undefined,
      colorHex: orderType === 'physical' ? selectedColor.hex : undefined,
      dimensions: product.specs?.dimensions,
      fileFormat: orderType === 'digital' ? (product.cadFormat || 'STL + STEP + 3MF') : undefined,
      licenseType: product.licenseType || 'Commercial'
    };

    onAddToCart(item);
    if (onShowToast) {
      onShowToast(
        isVi
          ? `Đã thêm ${quantity}x ${orderType === 'digital' ? 'File CAD' : 'Linh kiện in 3D'} "${product.name}" vào giỏ hàng!`
          : `Added ${quantity}x ${orderType === 'digital' ? 'CAD File' : 'Printed Part'} "${product.name}" to cart!`
      );
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className={`bg-[#091426] text-white border border-[#00687A]/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ${
          isFullscreen
            ? 'w-full max-w-7xl h-[95vh]'
            : 'w-full max-w-4xl max-h-[92vh]'
        }`}
      >
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between bg-[#0F1D32]">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#57DFFE] animate-pulse"></span>
            <span className="font-mono text-xs uppercase tracking-widest text-[#57DFFE] font-bold">
              CAD MESH INSPECTOR // 360° PREVIEW
            </span>
            <span className="hidden sm:inline text-white/30">•</span>
            <span className="hidden sm:inline font-mono text-[10px] text-white/60">
              SKU: {product.sku || 'VC-CAD-092'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                onClose();
                onNavigate('product_detail', { product });
              }}
              className="text-[11px] font-mono text-cyan-300 hover:text-white flex items-center gap-1 px-3 py-1 bg-white/10 hover:bg-white/20 rounded-xl transition-all cursor-pointer border border-white/10"
              title="Xem trang sản phẩm chi tiết"
            >
              <span>{isVi ? 'Chi tiết đầy đủ' : 'Full Page'}</span>
              <span className="material-symbols-outlined text-xs">open_in_new</span>
            </button>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="text-white/60 hover:text-white w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer"
              title={isFullscreen ? 'Thu nhỏ' : 'Mở rộng toàn màn hình'}
            >
              <span className="material-symbols-outlined text-base">
                {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
              </span>
            </button>

            <button
              onClick={onClose}
              className="text-white/60 hover:text-white w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Close CAD inspector"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        </div>

        {/* Modal Content Body */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-y-auto">
          {/* Left 3D Interactive WebGL Canvas */}
          <div className="lg:col-span-7 bg-[#070F1E] relative flex flex-col p-4 border-b lg:border-b-0 lg:border-r border-white/10 min-h-[360px] lg:min-h-[480px]">
            {/* Top Info Bar */}
            <div className="flex items-center justify-between z-10 mb-2 gap-2 text-xs font-mono">
              <span className="text-[10px] text-white/70 bg-[#0b1c30]/80 px-2.5 py-1 rounded-lg border border-white/10 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-xs text-[#57DFFE]">view_in_ar</span>
                <span>Màu vật liệu: <strong className="text-cyan-300">{selectedColor.name}</strong></span>
              </span>
              <span className="text-[9px] font-mono text-[#57DFFE] bg-[#00687A]/40 px-2 py-0.5 rounded border border-[#57DFFE]/30">
                ✓ WATERTIGHT 100%
              </span>
            </div>

            {/* 3D Canvas Viewport with Built-in Orientation and Slicing Controls */}
            <div className="flex-1 w-full relative min-h-[280px] rounded-xl overflow-hidden border border-white/10 shadow-inner">
              <ThreeModelViewer
                modelType={getModelType(product)}
                color={selectedColor.hex}
                className="h-full w-full"
                showGrid={true}
              />
            </div>

            {/* Bottom Metrology Stats Strip */}
            <div className="mt-2.5 pt-2.5 border-t border-white/10 grid grid-cols-4 gap-2 text-center font-mono text-[10px] text-white/70">
              <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                <span className="text-[8px] text-white/40 uppercase block mb-0.5">Dung Sai</span>
                <span className="text-[#57DFFE] font-bold">±0.05 MM</span>
              </div>
              <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                <span className="text-[8px] text-white/40 uppercase block mb-0.5">Kích Thước</span>
                <span className="text-white font-bold truncate block">{product.specs?.dimensions || '80x80x40mm'}</span>
              </div>
              <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                <span className="text-[8px] text-white/40 uppercase block mb-0.5">Thời Gian In</span>
                <span className="text-white font-bold">{product.printTime}</span>
              </div>
              <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                <span className="text-[8px] text-white/40 uppercase block mb-0.5">Định Dạng</span>
                <span className="text-cyan-300 font-bold">{product.cadFormat || 'STL / STEP'}</span>
              </div>
            </div>
          </div>

          {/* Right Product Specs & Purchase Options */}
          <div className="lg:col-span-5 p-5 sm:p-6 flex flex-col justify-between space-y-4 bg-[#091426]">
            <div>
              <div className="flex items-center gap-2 mb-1.5 font-mono">
                <span className="px-2 py-0.5 bg-[#00687A] text-white text-[9px] font-bold rounded uppercase">
                  {product.category}
                </span>
                <span className="text-[10px] text-[#57DFFE] font-bold flex items-center gap-1">
                  ★ {product.rating} ({product.reviewsCount} {isVi ? 'đánh giá' : 'reviews'})
                </span>
              </div>

              <h2 className="font-extrabold text-base sm:text-lg text-white leading-snug">
                {product.name}
              </h2>
              <p className="text-[11px] text-[#94A3B8] font-mono mt-0.5">
                {isVi ? 'Kỹ sư thiết kế:' : 'Designed by:'} <strong className="text-white">{product.designer}</strong>
              </p>

              <p className="text-xs text-[#CBD5E1] mt-2 line-clamp-2 leading-relaxed">
                {product.description}
              </p>

              {/* Order Mode Selector Toggle */}
              <div className="mt-4 p-1 bg-[#132238] rounded-xl border border-white/10 grid grid-cols-2 gap-1 font-mono">
                <button
                  type="button"
                  onClick={() => setOrderType('digital')}
                  className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex flex-col items-center justify-center cursor-pointer ${
                    orderType === 'digital'
                      ? 'bg-[#00687A] text-white shadow-sm'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">download</span>
                    <span className="text-[11px]">{isVi ? 'Tải File CAD' : 'Buy CAD'}</span>
                  </div>
                  <span className="text-xs mt-0.5 font-extrabold text-[#57DFFE]">
                    {product.priceDigital.toLocaleString(isVi ? 'vi-VN' : 'en-US')} đ
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setOrderType('physical')}
                  className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex flex-col items-center justify-center cursor-pointer ${
                    orderType === 'physical'
                      ? 'bg-[#00687A] text-white shadow-sm'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">precision_manufacturing</span>
                    <span className="text-[11px]">{isVi ? 'In 3D Vật Lý' : 'Print 3D'}</span>
                  </div>
                  <span className="text-xs mt-0.5 font-extrabold text-[#57DFFE]">
                    {(physicalUnitPrice * quantity).toLocaleString(isVi ? 'vi-VN' : 'en-US')} đ
                  </span>
                </button>
              </div>

              {/* Dynamic Options based on Selected Mode */}
              {orderType === 'digital' ? (
                <div className="mt-3.5 space-y-2 text-xs bg-[#0F1D32] p-3.5 rounded-xl border border-white/10 font-mono">
                  <div className="flex items-center justify-between text-[11px] text-white/70">
                    <span>Định dạng file:</span>
                    <strong className="text-white">{product.cadFormat || 'STL, STEP, 3MF'}</strong>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-white/70">
                    <span>Bản quyền:</span>
                    <strong className="text-[#57DFFE]">{product.licenseType || 'Commercial License'}</strong>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-white/70">
                    <span>Kiểm định hình học:</span>
                    <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-xs">verified</span>
                      100% Watertight
                    </span>
                  </div>
                </div>
              ) : (
                <div className="mt-3.5 space-y-3 bg-[#0F1D32] p-3.5 rounded-xl border border-white/10 font-mono text-xs">
                  {/* Material dropdown */}
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-white/70">Vật liệu:</span>
                    <select
                      value={selectedMaterial}
                      onChange={(e) => setSelectedMaterial(e.target.value)}
                      className="bg-[#1C2C45] border border-white/20 text-white text-xs px-2.5 py-1 rounded-lg focus:outline-none focus:border-[#57DFFE] cursor-pointer"
                    >
                      {product.supportedMaterials.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Color Swatches picker syncing to 3D Canvas */}
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-white/70">Màu sắc:</span>
                    <div className="flex items-center gap-1.5">
                      {(product.colors || [{ name: 'Đen Kỹ Thuật', hex: '#1C1C1C', available: true }]).map((c) => (
                        <button
                          key={c.name}
                          onClick={() => setSelectedColor(c)}
                          className={`w-6 h-6 rounded-full border-2 transition-all cursor-pointer ${
                            selectedColor.name === c.name
                              ? 'border-[#57DFFE] scale-115 ring-2 ring-[#57DFFE]/40 shadow-sm'
                              : 'border-white/30 hover:scale-105'
                          }`}
                          style={{ backgroundColor: c.hex }}
                          title={c.name}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Quantity Counter */}
                  <div className="flex items-center justify-between pt-1 border-t border-white/10">
                    <span className="text-[11px] text-white/70">Số lượng:</span>
                    <div className="flex items-center border border-white/20 rounded-lg bg-[#1C2C45] overflow-hidden">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="px-2.5 py-0.5 text-white hover:bg-white/10 font-bold touch-target-btn cursor-pointer"
                      >
                        -
                      </button>
                      <span className="px-3 py-0.5 text-xs font-bold text-white border-x border-white/10">
                        {quantity}
                      </span>
                      <button
                        onClick={() => setQuantity(quantity + 1)}
                        className="px-2.5 py-0.5 text-white hover:bg-white/10 font-bold touch-target-btn cursor-pointer"
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
                    className="text-[9px] font-mono px-2 py-0.5 rounded bg-white/5 text-white/60 border border-white/10"
                  >
                    #{tg}
                  </span>
                ))}
              </div>
            </div>

            {/* Action Buttons in Modal */}
            <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row gap-2">
              <button
                onClick={handleQuickAdd}
                className="flex-1 py-3 px-4 bg-[#00687A] hover:bg-[#00879E] text-white font-mono font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer touch-target-btn active:scale-95"
              >
                <span className="material-symbols-outlined text-base">shopping_bag</span>
                <span>
                  {orderType === 'digital'
                    ? (isVi ? 'Thêm File CAD Vào Giỏ' : 'Add CAD to Cart')
                    : (isVi ? `Đặt In 3D (${(physicalUnitPrice * quantity).toLocaleString('vi-VN')} đ)` : 'Order 3D Print')}
                </span>
              </button>

              {product.isCustomizable && (
                <button
                  onClick={() => {
                    onClose();
                    onNavigate('personalize', { product });
                  }}
                  className="py-3 px-3.5 bg-white/10 hover:bg-white/20 text-white font-mono font-bold text-xs uppercase tracking-wider rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer touch-target-btn active:scale-95"
                  title={isVi ? 'Khắc tên / Tùy biến tham số' : 'Personalize dimensions'}
                >
                  <span className="material-symbols-outlined text-base">tune</span>
                  <span className="hidden sm:inline">{isVi ? 'Tùy Biến' : 'Customize'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
