import React, { useState } from 'react';
import { Product, CartItem, MaterialProfile, InkiriCostFormulaConfig } from '../types';
import { MATERIALS_CATALOG, DEFAULT_INKIRI_FORMULA_CONFIG } from '../data/mockData';
import { ThreeModelViewer } from '../components/ThreeModelViewer';

interface ProductDetailViewProps {
  product: Product;
  materials?: MaterialProfile[];
  pricingConfig?: InkiriCostFormulaConfig;
  onAddToCart: (item: CartItem) => void;
  onNavigate: (screen: string, payload?: any) => void;
  onShowToast: (message: string) => void;
}

export const ProductDetailView: React.FC<ProductDetailViewProps> = ({
  product,
  materials = MATERIALS_CATALOG,
  pricingConfig = DEFAULT_INKIRI_FORMULA_CONFIG,
  onAddToCart,
  onNavigate,
  onShowToast
}) => {
  const materialsList = materials && materials.length > 0 ? materials : MATERIALS_CATALOG;
  const activeConfig = pricingConfig || DEFAULT_INKIRI_FORMULA_CONFIG;

  const [viewMode, setViewMode] = useState<'3d' | 'image'>('3d');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedMaterial, setSelectedMaterial] = useState<string>(product.supportedMaterials[0] || 'PLA Tough');
  const [selectedColor, setSelectedColor] = useState(product.colors[0] || { name: 'Xám Than Khoáng', hex: '#2A2A2A' });
  const [resolution, setResolution] = useState('0.16 mm (Tiêu chuẩn kỹ thuật)');
  const [customEngraving, setCustomEngraving] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'desc' | 'specs' | 'reviews'>('desc');
  const [isAdding, setIsAdding] = useState(false);

  // Calculate dynamic price based on material choice and volume discount from Admin Config
  const selectedMaterialObj = materialsList.find(
    m => m.name.toLowerCase().includes(selectedMaterial.toLowerCase()) || 
         m.id.toLowerCase() === selectedMaterial.toLowerCase()
  ) || materialsList[0];

  const applicableDiscountTier = (activeConfig.volumeDiscounts || []).find(
    d => quantity >= d.minQty && (d.maxQty === undefined || quantity <= d.maxQty)
  );
  const volumeDiscountPercent = applicableDiscountTier?.discountPercent || 0;
  
  const engravingFee = customEngraving.trim() ? (activeConfig.customEngravingFee ?? 50000) : 0;
  const unitBeforeDiscount = Math.round(product.pricePhysical * (selectedMaterialObj?.unitPriceMultiplier || 1)) + engravingFee;
  const dynamicPricePhysical = Math.round(unitBeforeDiscount * (1 - volumeDiscountPercent / 100));

  const handleAddPhysical = () => {
    setIsAdding(true);
    const item: CartItem = {
      id: `cart-${Date.now()}`,
      productId: product.id,
      type: 'physical',
      name: product.name,
      designer: product.designer,
      image: product.images[0],
      price: dynamicPricePhysical,
      quantity: quantity,
      material: selectedMaterial,
      color: selectedColor.name,
      colorHex: selectedColor.hex,
      dimensions: product.specs.dimensions,
      resolution: resolution,
      customText: customEngraving.trim() || undefined
    };

    onAddToCart(item);
    setTimeout(() => {
      setIsAdding(false);
      onShowToast(`Đã thêm ${quantity}x "${product.name}" vào đơn hàng!`);
    }, 200);
  };

  const handleAddDigital = () => {
    const item: CartItem = {
      id: `cart-${Date.now()}-stl`,
      productId: product.id,
      type: 'digital',
      name: `${product.name} (File STL + STEP)`,
      designer: product.designer,
      image: product.images[0],
      price: product.priceDigital,
      quantity: 1,
      fileFormat: 'STL + 3MF + STEP Nguồn',
      licenseType: 'Commercial License (Được phép sản xuất)'
    };

    onAddToCart(item);
    onShowToast(`Đã thêm File 3D "${product.name}" vào giỏ hàng!`);
  };

  return (
    <div className="min-h-screen bg-[#F7F6F2] text-[#1C1C1C] py-6 sm:py-8 px-4 sm:px-6 md:px-12">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Editorial Breadcrumb */}
        <nav className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-[11px] font-sans uppercase tracking-widest text-[#7D7565] overflow-x-auto pb-1">
          <button onClick={() => onNavigate('home')} className="hover:text-[#1C1C1C] whitespace-nowrap">
            VCUBE
          </button>
          <span>/</span>
          <button onClick={() => onNavigate('explore')} className="hover:text-[#1C1C1C] whitespace-nowrap">
            Curation
          </button>
          <span>/</span>
          <span className="text-[#1C1C1C] font-bold truncate max-w-[180px] sm:max-w-xs">{product.name}</span>
        </nav>

        {/* Product Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-10">
          {/* Left Column: 3D Viewport / Image Gallery */}
          <div className="lg:col-span-7 space-y-6">
            {/* View Mode Switcher */}
            <div className="flex items-center justify-between bg-white px-4 py-2 border border-black/10">
              <div className="flex items-center gap-4 font-sans text-[11px] uppercase tracking-wider">
                <button
                  onClick={() => setViewMode('3d')}
                  className={`pb-1 border-b transition-all ${
                    viewMode === '3d'
                      ? 'border-[#1C1C1C] text-[#1C1C1C] font-bold'
                      : 'border-transparent text-[#7D7565] hover:text-[#1C1C1C]'
                  }`}
                >
                  3D Interactive Canvas
                </button>
                <button
                  onClick={() => setViewMode('image')}
                  className={`pb-1 border-b transition-all ${
                    viewMode === 'image'
                      ? 'border-[#1C1C1C] text-[#1C1C1C] font-bold'
                      : 'border-transparent text-[#7D7565] hover:text-[#1C1C1C]'
                  }`}
                >
                  Gallery ({product.images.length})
                </button>
              </div>

              <span className="text-[10px] font-tech text-[#7D7565] hidden sm:inline uppercase">
                Tolerance: <strong className="text-[#1C1C1C]">±0.05mm</strong>
              </span>
            </div>

            {/* Viewer Display Frame */}
            {viewMode === '3d' ? (
              <div className="responsive-aspect-frame bg-[#1C1C1C] border border-black/20 shadow-2xl relative flex flex-col justify-between p-4 overflow-hidden">
                <div className="w-full flex items-center justify-between z-10 text-white/40 font-sans text-[9px] uppercase tracking-widest">
                  <span>Mesh Inspection Mode</span>
                  <span className="truncate ml-2">{selectedMaterial}</span>
                </div>
                <div className="flex-1 w-full h-full relative min-h-[220px]">
                  <ThreeModelViewer
                    modelType={product.id.includes('gear') ? 'gear' : product.id.includes('drone') ? 'drone' : product.id.includes('vase') ? 'vase' : 'box'}
                    color={selectedColor.hex}
                    className="h-full w-full"
                  />
                </div>
                <div className="w-full flex items-center justify-between z-10 text-white/40 font-sans text-[9px] uppercase tracking-widest">
                  <span>Rotate: Drag • Zoom: Scroll</span>
                  <span className="font-tech text-white/60">360° WebGL</span>
                </div>
              </div>
            ) : (
              <div className="relative responsive-aspect-frame bg-[#2A2A2A] border border-black/10 overflow-hidden flex items-center justify-center">
                <img
                  src={product.images[selectedImageIndex]}
                  alt={product.name}
                  className="responsive-img-cover"
                />
              </div>
            )}

            {/* Image Thumbnails Slider */}
            {viewMode === 'image' && (
              <div className="flex items-center gap-3 overflow-x-auto py-1">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`w-16 sm:w-20 h-16 sm:h-20 border shrink-0 transition-all ${
                      selectedImageIndex === idx ? 'border-[#1C1C1C] p-0.5' : 'border-black/10 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Batch Production Status Card */}
            {product.batchProgress && (
              <div className="bg-white border border-black/10 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#1C1C1C] animate-pulse"></span>
                    <span className="font-sans text-[10px] uppercase tracking-widest font-bold text-[#1C1C1C]">
                      Batch Production #04
                    </span>
                    <span className="px-2 py-0.5 bg-[#F7F6F2] border border-black/10 text-[#7D7565] text-[9px] font-sans uppercase tracking-wider">
                      Co-printing VCUBE
                    </span>
                  </div>
                  <p className="text-xs text-[#5A554C] font-serif">
                    Đã đăng ký <strong>{product.batchProgress.current}/{product.batchProgress.total}</strong> đơn. Bắt đầu bấm máy vào ngày <strong>{product.batchProgress.targetDate}</strong>.
                  </p>
                </div>
                <div className="w-full sm:w-32 bg-[#F7F6F2] h-2 overflow-hidden border border-black/10 shrink-0">
                  <div
                    className="bg-[#1C1C1C] h-full transition-all"
                    style={{ width: `${(product.batchProgress.current / product.batchProgress.total) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Technical Tabs: Description, Specs, Reviews */}
            <div className="bg-white border border-black/10 p-5 sm:p-8">
              <div className="flex border-b border-black/10 gap-4 sm:gap-8 text-xs font-sans uppercase tracking-widest mb-6 overflow-x-auto">
                <button
                  onClick={() => setActiveTab('desc')}
                  className={`pb-3 border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === 'desc' ? 'border-[#1C1C1C] text-[#1C1C1C] font-bold' : 'border-transparent text-[#7D7565] hover:text-[#1C1C1C]'
                  }`}
                >
                  Khái Niệm & Tính Năng
                </button>
                <button
                  onClick={() => setActiveTab('specs')}
                  className={`pb-3 border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === 'specs' ? 'border-[#1C1C1C] text-[#1C1C1C] font-bold' : 'border-transparent text-[#7D7565] hover:text-[#1C1C1C]'
                  }`}
                >
                  Thông Số Kỹ Thuật
                </button>
                <button
                  onClick={() => setActiveTab('reviews')}
                  className={`pb-3 border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === 'reviews' ? 'border-[#1C1C1C] text-[#1C1C1C] font-bold' : 'border-transparent text-[#7D7565] hover:text-[#1C1C1C]'
                  }`}
                >
                  Kiểm Định ({product.reviewsCount})
                </button>
              </div>

              {activeTab === 'desc' && (
                <div className="space-y-4 text-sm text-[#45474c] font-serif leading-relaxed">
                  <p className="text-sm sm:text-base text-[#1C1C1C] italic font-serif leading-relaxed">
                    "{product.description}"
                  </p>
                  <div className="pt-4 border-t border-black/10">
                    <span className="font-sans text-[10px] uppercase tracking-widest text-[#7D7565] block mb-3">
                      Đặc tính kết cấu:
                    </span>
                    <ul className="space-y-2.5 font-serif text-xs text-[#1C1C1C]">
                      {product.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <span className="font-tech text-xs text-[#7D7565]">0{i + 1}.</span>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {activeTab === 'specs' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs font-sans">
                  <div className="bg-[#F7F6F2] p-4 border border-black/10">
                    <span className="text-[9px] uppercase tracking-widest text-[#7D7565] block mb-1">Kích Thước Phủ Bì</span>
                    <span className="font-tech font-bold text-sm text-[#1C1C1C]">{product.specs.dimensions}</span>
                  </div>
                  <div className="bg-[#F7F6F2] p-4 border border-black/10">
                    <span className="text-[9px] uppercase tracking-widest text-[#7D7565] block mb-1">Khối Lượng Nhựa</span>
                    <span className="font-tech font-bold text-sm text-[#1C1C1C]">{product.specs.weight}</span>
                  </div>
                  <div className="bg-[#F7F6F2] p-4 border border-black/10">
                    <span className="text-[9px] uppercase tracking-widest text-[#7D7565] block mb-1">Độ Phân Giải Lớp</span>
                    <span className="font-tech font-bold text-sm text-[#1C1C1C]">{product.specs.resolution}</span>
                  </div>
                  <div className="bg-[#F7F6F2] p-4 border border-black/10">
                    <span className="text-[9px] uppercase tracking-widest text-[#7D7565] block mb-1">Công Nghệ Gia Công</span>
                    <span className="font-tech font-bold text-sm text-[#1C1C1C]">{product.specs.technology}</span>
                  </div>
                </div>
              )}

              {activeTab === 'reviews' && (
                <div className="space-y-4 font-serif">
                  <div className="flex items-center gap-4 sm:gap-6 bg-[#F7F6F2] p-4 sm:p-5 border border-black/10">
                    <div className="text-center pr-4 sm:pr-6 border-r border-black/10">
                      <span className="font-tech text-2xl sm:text-3xl font-bold text-[#1C1C1C]">{product.rating}</span>
                      <div className="flex text-amber-600 text-xs mt-0.5 justify-center">
                        <span className="material-symbols-outlined text-sm fill">star</span>
                        <span className="material-symbols-outlined text-sm fill">star</span>
                        <span className="material-symbols-outlined text-sm fill">star</span>
                        <span className="material-symbols-outlined text-sm fill">star</span>
                        <span className="material-symbols-outlined text-sm fill">star</span>
                      </div>
                      <span className="text-[9px] uppercase tracking-widest text-[#7D7565] font-sans">{product.reviewsCount} báo cáo</span>
                    </div>
                    <div className="text-xs text-[#5A554C]">
                      100% người dùng đánh giá dung sai cơ khí khớp chính xác với bản vẽ thiết kế nguyên mẫu.
                    </div>
                  </div>

                  {/* Sample Review */}
                  <div className="border-t border-black/10 pt-4">
                    <div className="flex items-center justify-between text-xs mb-1 font-sans">
                      <span className="font-bold text-[#1C1C1C]">Hoàng Đình Long — Kỹ sư R&D</span>
                      <span className="text-[#7D7565] text-[10px] font-tech">22/10/2026</span>
                    </div>
                    <p className="text-xs text-[#5A554C] italic font-serif">
                      "Khớp snap-fit đóng cực kỳ khít, in vật liệu PETG không bị giòn gãy. Khe tản nhiệt tổ ong rất đẹp và cứng cáp!"
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Customization Controls & Order Actions */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white border border-black/10 p-6 sm:p-8 space-y-6 lg:sticky lg:top-24">
              {/* Header Title & Designer */}
              <div>
                <div className="flex items-center justify-between text-xs mb-2 font-sans">
                  <div className="flex items-center gap-2">
                    <span className="font-sans text-[10px] uppercase tracking-widest text-[#7D7565]">{product.designer}</span>
                    <span className="px-1.5 py-0.5 bg-[#F7F6F2] border border-black/10 text-[9px] font-sans uppercase tracking-wider text-[#1C1C1C]">Verified Designer</span>
                  </div>
                  <span className="font-tech text-xs text-[#1C1C1C] font-bold">★ {product.rating}</span>
                </div>

                <h1 className="fluid-h2 text-[#1C1C1C] leading-tight">
                  {product.name}
                </h1>
              </div>

              {/* Price Banner */}
              <div className="bg-[#F7F6F2] p-4 sm:p-5 border border-black/10 flex items-baseline justify-between font-sans">
                <div>
                  <span className="text-[9px] uppercase tracking-widest text-[#7D7565] block">Đơn giá in thành phẩm:</span>
                  <span className="font-tech text-xl sm:text-2xl font-bold text-[#1C1C1C]">
                    {(dynamicPricePhysical * quantity).toLocaleString('vi-VN')} đ
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] uppercase tracking-widest text-[#7D7565] block">Bản quyền File 3D:</span>
                  <span className="font-tech text-xs sm:text-sm font-bold text-[#7D7565]">
                    {product.priceDigital.toLocaleString('vi-VN')} đ
                  </span>
                </div>
              </div>

              {/* 1. Material Selector */}
              <div>
                <label className="text-[10px] font-sans uppercase tracking-[0.2em] text-[#7D7565] block mb-2 flex items-center justify-between">
                  <span>1. Vật liệu chế tạo</span>
                  <span className="text-[10px] text-[#1C1C1C] font-mono">{selectedMaterialObj?.strength}</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {product.supportedMaterials.map((mat) => {
                    const isSelected = selectedMaterial === mat;
                    return (
                      <button
                        key={mat}
                        onClick={() => setSelectedMaterial(mat)}
                        className={`p-3 border text-left text-xs transition-all font-sans ${
                          isSelected
                            ? 'border-[#1C1C1C] bg-[#1C1C1C] text-white font-bold'
                            : 'border-black/10 bg-[#F7F6F2] text-[#1C1C1C] hover:border-black/30'
                        }`}
                      >
                        <p className="truncate">{mat}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Color Swatch Picker */}
              <div>
                <label className="text-[10px] font-sans uppercase tracking-[0.2em] text-[#7D7565] block mb-2">
                  2. Sắc thái hoàn thiện: <span className="font-bold text-[#1C1C1C]">{selectedColor.name}</span>
                </label>
                <div className="flex items-center gap-3">
                  {product.colors.map((c) => (
                    <button
                      key={c.name}
                      onClick={() => c.available && setSelectedColor(c)}
                      disabled={!c.available}
                      className={`relative w-8 h-8 border transition-transform touch-target-btn ${
                        selectedColor.name === c.name ? 'border-[#1C1C1C] scale-110 shadow-sm ring-1 ring-black' : 'border-black/20'
                      } ${!c.available ? 'opacity-25 cursor-not-allowed' : 'cursor-pointer'}`}
                      style={{ backgroundColor: c.hex }}
                      title={c.available ? c.name : `${c.name} (Tạm hết)`}
                    >
                      {selectedColor.name === c.name && (
                        <span className="material-symbols-outlined text-white text-xs absolute inset-0 flex items-center justify-center font-bold">
                          check
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Layer Height / Resolution */}
              <div>
                <label className="text-[10px] font-sans uppercase tracking-[0.2em] text-[#7D7565] block mb-2">
                  3. Độ phân giải lớp in (Layer Height)
                </label>
                <select
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  className="w-full bg-[#F7F6F2] border border-black/15 p-2.5 text-xs text-[#1C1C1C] focus:outline-none focus:border-black font-sans"
                >
                  <option value="0.12 mm (Chính xác vi mô)">0.12 mm (Chính xác vi mô - Bề mặt siêu mịn)</option>
                  <option value="0.16 mm (Tiêu chuẩn kỹ thuật)">0.16 mm (Tiêu chuẩn kỹ thuật - Đề xuất)</option>
                  <option value="0.20 mm (In nhanh tiêu chuẩn)">0.20 mm (In nhanh tiêu chuẩn)</option>
                </select>
              </div>

              {/* 4. Custom Engraving (If available) */}
              {product.isCustomizable && (
                <div>
                  <label className="text-[10px] font-sans uppercase tracking-[0.2em] text-[#7D7565] block mb-2 flex items-center justify-between">
                    <span>4. Khắc số hiệu / Tên dự án</span>
                    <span className="text-[9px] text-[#7D7565] font-tech">{customEngraving.length}/20</span>
                  </label>
                  <input
                    type="text"
                    maxLength={20}
                    placeholder="VD: LAB-ROBOT-01..."
                    value={customEngraving}
                    onChange={(e) => setCustomEngraving(e.target.value)}
                    className="w-full bg-[#F7F6F2] border border-black/15 px-3 py-2 text-xs text-[#1C1C1C] focus:outline-none focus:border-black font-tech"
                  />
                </div>
              )}

              {/* Quantity Counter */}
              <div className="space-y-1.5 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-sans uppercase tracking-[0.2em] text-[#7D7565]">Số lượng ấn bản:</span>
                  <div className="flex items-center border border-black/15 bg-white">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="px-3 py-2 hover:bg-black/5 text-[#1C1C1C] text-xs font-bold font-mono touch-target-btn"
                    >
                      -
                    </button>
                    <span className="px-4 py-2 font-tech text-xs font-bold text-[#1C1C1C] border-x border-black/15">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="px-3 py-2 hover:bg-black/5 text-[#1C1C1C] text-xs font-bold font-mono touch-target-btn"
                    >
                      +
                    </button>
                  </div>
                </div>

                {volumeDiscountPercent > 0 && (
                  <div className="flex items-center justify-end gap-1 text-[11px] font-tech text-emerald-700 font-bold">
                    <span className="material-symbols-outlined text-xs">savings</span>
                    <span>Chiết khấu sỉ: -{volumeDiscountPercent}% ({applicableDiscountTier?.label})</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-2">
                <button
                  onClick={handleAddPhysical}
                  disabled={isAdding}
                  className="w-full py-4 bg-[#1C1C1C] hover:bg-[#333] text-white font-sans font-bold text-[11px] uppercase tracking-widest shadow-md transition-colors flex items-center justify-center gap-2 touch-target-btn"
                >
                  <span className="material-symbols-outlined text-base">shopping_bag</span>
                  {isAdding ? 'ĐANG XỬ LÝ...' : `ĐẶT GIA CÔNG IN (${(dynamicPricePhysical * quantity).toLocaleString('vi-VN')} đ)`}
                </button>

                <button
                  onClick={handleAddDigital}
                  className="w-full py-3.5 border border-black/20 hover:bg-black/5 text-[#1C1C1C] font-sans font-bold text-[11px] uppercase tracking-widest transition-colors flex items-center justify-center gap-2 touch-target-btn"
                >
                  <span className="material-symbols-outlined text-base">download</span>
                  TẢI FILE 3D GỐC ({product.priceDigital.toLocaleString('vi-VN')} đ)
                </button>
              </div>

              {/* Editorial Guarantees */}
              <div className="pt-4 border-t border-black/10 grid grid-cols-2 gap-3 text-[10px] font-sans uppercase tracking-wider text-[#7D7565]">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-[#1C1C1C]">verified</span>
                  <span>VCUBE Tolerance</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-[#1C1C1C]">local_shipping</span>
                  <span>Giao hàng toàn quốc</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
