import React, { useState } from 'react';
import { Product, CartItem, MaterialProfile, InkiriCostFormulaConfig } from '../types';
import { MATERIALS_CATALOG } from '../data/mockData';
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
  const { language, t } = useLanguage();
  const isVi = language === 'vi';

  const [activeTab, setActiveTab] = useState<'3d' | 'specs' | 'materials'>('3d');
  const [selectedMaterial, setSelectedMaterial] = useState<string>('PLA Tough');
  const [orderType, setOrderType] = useState<'digital' | 'physical'>('digital');

  if (!isOpen || !product) return null;

  const currentMaterials = materials && materials.length > 0 ? materials : MATERIALS_CATALOG;
  const matchingMat = currentMaterials.find(
    m => m.name.toLowerCase() === selectedMaterial.toLowerCase() || 
         m.id.toLowerCase() === selectedMaterial.toLowerCase()
  );
  const physicalUnitPrice = Math.round(product.pricePhysical * (matchingMat?.unitPriceMultiplier || 1));

  // Determine geometry representation for 3D viewer
  const getModelType = (p: Product): string => {
    const cat = p.category.toLowerCase();
    const name = p.name.toLowerCase();
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
      id: `cart-${Date.now()}-${Math.random()}`,
      productId: product.id,
      type: orderType,
      name: product.name,
      designer: product.designer,
      image: product.images[0],
      price: orderType === 'digital' ? product.priceDigital : physicalUnitPrice,
      quantity: 1,
      material: orderType === 'physical' ? selectedMaterial : undefined,
      color: orderType === 'physical' ? 'Industrial Black' : undefined,
      fileFormat: orderType === 'digital' ? 'STL + STEP' : undefined,
      licenseType: product.licenseType || 'Commercial'
    };

    onAddToCart(item);
    if (onShowToast) {
      onShowToast(
        isVi
          ? `Đã thêm ${orderType === 'digital' ? 'File CAD' : 'Linh kiện in'} "${product.name}" vào giỏ hàng!`
          : `Added ${orderType === 'digital' ? 'CAD File' : 'Printed Part'} "${product.name}" to cart!`
      );
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#091426] text-white border border-[#57DFFE]/30 w-full max-w-4xl max-h-[90vh] rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between bg-[#0F1D32]">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-[#57DFFE] animate-pulse"></span>
            <span className="font-tech text-xs uppercase tracking-widest text-[#57DFFE] font-bold">
              CAD MESH INSPECTOR // 360° PREVIEW
            </span>
            <span className="hidden sm:inline text-white/30">•</span>
            <span className="hidden sm:inline font-mono text-[10px] text-white/60">SKU: {product.sku || 'VC-CAD-092'}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onNavigate('product_detail', { product });
              }}
              className="text-[11px] font-sans text-white/80 hover:text-white flex items-center gap-1 px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded transition-colors cursor-pointer"
            >
              <span>{isVi ? 'Trang chi tiết đầy đủ' : 'Full Page'}</span>
              <span className="material-symbols-outlined text-xs">open_in_new</span>
            </button>

            <button
              onClick={onClose}
              className="text-white/60 hover:text-white w-8 h-8 rounded flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Close CAD inspector"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        </div>

        {/* Modal Content Body */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-y-auto">
          {/* Left 3D Interactive Canvas */}
          <div className="lg:col-span-7 bg-[#070F1E] relative flex flex-col p-4 border-b lg:border-b-0 lg:border-r border-white/10 min-h-[320px] lg:min-h-[440px]">
            {/* View controls pill */}
            <div className="flex items-center justify-between z-10 mb-2">
              <div className="flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded border border-white/10">
                <span className="material-symbols-outlined text-xs text-[#57DFFE]">3d_rotation</span>
                <span className="text-[10px] font-tech text-white/80 uppercase">
                  {isVi ? 'Kéo chuột để xoay 360°' : 'Drag to Rotate 360°'}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <span className="text-[9px] font-tech text-[#57DFFE] bg-[#00687A]/40 px-2 py-0.5 rounded border border-[#57DFFE]/30">
                  WATERTIGHT MANIFOLD OK
                </span>
              </div>
            </div>

            {/* Canvas */}
            <div className="flex-1 w-full relative min-h-[260px]">
              <ThreeModelViewer
                modelType={getModelType(product)}
                color="#008099"
                className="h-full w-full"
                showGrid={true}
                autoRotate={true}
              />
            </div>

            {/* Bottom metrology stats strip */}
            <div className="mt-2 pt-2 border-t border-white/10 grid grid-cols-3 gap-2 text-center font-mono text-[10px] text-white/70">
              <div className="bg-white/5 p-1.5 rounded">
                <span className="text-[8px] text-white/40 block">DUNG SAI</span>
                <span className="text-[#57DFFE] font-bold">±0.05 MM</span>
              </div>
              <div className="bg-white/5 p-1.5 rounded">
                <span className="text-[8px] text-white/40 block">KÍCH THƯỚC</span>
                <span className="text-white font-bold">{product.specs.dimensions}</span>
              </div>
              <div className="bg-white/5 p-1.5 rounded">
                <span className="text-[8px] text-white/40 block">THỜI GIAN IN</span>
                <span className="text-white font-bold">{product.printTime}</span>
              </div>
            </div>
          </div>

          {/* Right Product Specs & Purchase Options */}
          <div className="lg:col-span-5 p-5 flex flex-col justify-between space-y-4 bg-[#091426]">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2 py-0.5 bg-[#00687A] text-white font-tech text-[9px] font-bold rounded uppercase">
                  {product.category}
                </span>
                <span className="text-[10px] font-tech text-[#57DFFE] font-bold flex items-center gap-1">
                  ★ {product.rating} ({product.reviewsCount} {isVi ? 'đánh giá' : 'reviews'})
                </span>
              </div>

              <h2 className="font-serif font-bold text-lg text-white leading-snug">
                {product.name}
              </h2>
              <p className="text-[11px] text-[#8590A6] font-sans mt-0.5">
                {isVi ? 'Thiết kế bởi Kỹ Sư:' : 'Designed by:'} <strong className="text-white">{product.designer}</strong>
              </p>

              <p className="text-xs text-[#BCC7DE] font-serif mt-2.5 line-clamp-3 leading-relaxed">
                {product.description}
              </p>

              {/* Order Mode Selector Toggle */}
              <div className="mt-4 p-1 bg-[#132238] rounded-lg border border-white/10 grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => setOrderType('digital')}
                  className={`py-2 px-3 rounded-md text-xs font-bold transition-all flex flex-col items-center justify-center cursor-pointer ${
                    orderType === 'digital'
                      ? 'bg-[#00687A] text-white shadow-sm'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">download</span>
                    <span>{isVi ? 'Tải File Số (STL)' : 'CAD File (STL)'}</span>
                  </div>
                  <span className="font-tech text-xs mt-0.5 font-extrabold text-[#57DFFE]">
                    {product.priceDigital.toLocaleString(isVi ? 'vi-VN' : 'en-US')} đ
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setOrderType('physical')}
                  className={`py-2 px-3 rounded-md text-xs font-bold transition-all flex flex-col items-center justify-center cursor-pointer ${
                    orderType === 'physical'
                      ? 'bg-[#00687A] text-white shadow-sm'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">precision_manufacturing</span>
                    <span>{isVi ? 'In Linh Kiện Vật Lý' : 'Physical Part'}</span>
                  </div>
                  <span className="font-tech text-xs mt-0.5 font-extrabold text-[#57DFFE]">
                    {physicalUnitPrice.toLocaleString(isVi ? 'vi-VN' : 'en-US')} đ
                  </span>
                </button>
              </div>

              {/* Dynamic specs based on selected mode */}
              {orderType === 'digital' ? (
                <div className="mt-3.5 space-y-2 text-xs bg-[#0F1D32] p-3 rounded-lg border border-white/5 font-sans">
                  <div className="flex items-center justify-between text-[11px] text-white/70">
                    <span>{isVi ? 'Định dạng file kèm theo:' : 'Included Formats:'}</span>
                    <strong className="text-white font-mono">.STL, .STEP, .3MF</strong>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-white/70">
                    <span>{isVi ? 'Bản quyền sử dụng:' : 'License:'}</span>
                    <strong className="text-[#57DFFE] font-mono">{product.licenseType || 'Commercial Use'}</strong>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-white/70">
                    <span>{isVi ? 'Xác thực cấu trúc:' : 'Mesh Validation:'}</span>
                    <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-xs">verified</span>
                      100% Watertight
                    </span>
                  </div>
                </div>
              ) : (
                <div className="mt-3.5 space-y-2 text-xs bg-[#0F1D32] p-3 rounded-lg border border-white/5 font-sans">
                  <div className="flex items-center justify-between text-[11px] text-white/70 mb-1">
                    <span>{isVi ? 'Vật liệu in mặc định:' : 'Default Material:'}</span>
                    <select
                      value={selectedMaterial}
                      onChange={(e) => setSelectedMaterial(e.target.value)}
                      className="bg-[#1C2C45] border border-white/20 text-white text-xs px-2 py-1 rounded focus:outline-none focus:border-[#57DFFE] cursor-pointer"
                    >
                      {product.supportedMaterials.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-white/70">
                    <span>{isVi ? 'Độ phân giải lớp in:' : 'Layer Resolution:'}</span>
                    <strong className="text-white font-mono">{product.specs.resolution}</strong>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-white/70">
                    <span>{isVi ? 'Thời gian chế tác:' : 'Dispatch Time:'}</span>
                    <strong className="text-emerald-400 font-mono">24H Dispatch</strong>
                  </div>
                </div>
              )}

              {/* Tags */}
              <div className="flex flex-wrap gap-1 mt-3">
                {product.tags.map((tg) => (
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
                className="flex-1 py-3 px-4 bg-[#00687A] hover:bg-[#00879e] text-white font-tech font-bold text-xs uppercase tracking-wider rounded-lg transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer touch-target-btn"
              >
                <span className="material-symbols-outlined text-base">shopping_bag</span>
                <span>
                  {orderType === 'digital'
                    ? (isVi ? 'Thêm File CAD Vào Giỏ' : 'Add CAD File to Cart')
                    : (isVi ? 'Đặt In Linh Kiện Này' : 'Order Printed Part')}
                </span>
              </button>

              {product.isCustomizable && (
                <button
                  onClick={() => {
                    onClose();
                    onNavigate('personalize', { product });
                  }}
                  className="py-3 px-4 bg-white/10 hover:bg-white/20 text-white font-tech font-bold text-xs uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer touch-target-btn"
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
