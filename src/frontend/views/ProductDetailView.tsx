import React, { useState } from 'react';
import { Product, CartItem, MaterialProfile, InkiriCostFormulaConfig } from '../../types';
import { MATERIALS_CATALOG, DEFAULT_INKIRI_FORMULA_CONFIG } from '../../data/mockData';
import { ThreeModelViewer } from '../components/ThreeModelViewer';
import { SEOHead } from '../components/SEOHead';
import { useLanguage } from '../context/LanguageContext';

interface ProductDetailViewProps {
  product: Product;
  allProducts?: Product[];
  materials?: MaterialProfile[];
  pricingConfig?: InkiriCostFormulaConfig;
  onAddToCart: (item: CartItem) => void;
  onNavigate: (screen: string, payload?: any) => void;
  onShowToast: (message: string) => void;
}

export const ProductDetailView: React.FC<ProductDetailViewProps> = ({
  product,
  allProducts = [],
  materials = MATERIALS_CATALOG,
  pricingConfig = DEFAULT_INKIRI_FORMULA_CONFIG,
  onAddToCart,
  onNavigate,
  onShowToast
}) => {
  const { language } = useLanguage();
  const isVi = language === 'vi';

  const materialsList = materials && materials.length > 0 ? materials : MATERIALS_CATALOG;
  const activeConfig = pricingConfig || DEFAULT_INKIRI_FORMULA_CONFIG;

  const [viewMode, setViewMode] = useState<'3d' | 'image'>('3d');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedMaterial, setSelectedMaterial] = useState<string>(product.supportedMaterials[0] || 'PLA Tough');
  const [selectedColor, setSelectedColor] = useState(product.colors[0] || { name: 'Xám Than Khoáng', hex: '#2A2A2A', available: true });
  const [resolution, setResolution] = useState('0.16 mm (Tiêu chuẩn kỹ thuật)');
  const [customEngraving, setCustomEngraving] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'desc' | 'specs' | 'reviews' | 'slicing'>('desc');
  const [isAdding, setIsAdding] = useState(false);
  const [isWireframe, setIsWireframe] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  // Dynamic pricing calculation
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

  // Related compatible products
  const relatedProducts = (allProducts || [])
    .filter(p => p.id !== product.id && (p.category === product.category || p.tags?.some(t => product.tags?.includes(t))))
    .slice(0, 3);

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
      onShowToast(isVi ? `Đã thêm ${quantity}x "${product.name}" vào đơn hàng!` : `Added ${quantity}x "${product.name}" to cart!`);
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
    onShowToast(isVi ? `Đã thêm File 3D "${product.name}" vào giỏ hàng!` : `Added 3D CAD file "${product.name}" to cart!`);
  };

  const modelGeometryType = product.id.includes('gear')
    ? 'gear'
    : product.id.includes('drone')
    ? 'drone'
    : product.id.includes('vase')
    ? 'vase'
    : 'box';

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#091426] py-6 sm:py-8 px-4 sm:px-6 md:px-12 pb-24 lg:pb-12">
      <SEOHead
        title={product.name}
        description={product.description || (isVi ? `Chi tiết mô hình CAD và thông số in 3D ${product.name} tại VCUBE.` : `Specifications and 3D printing details for ${product.name} at VCUBE.`)}
        image={product.thumbnailUrl || (product.images && product.images[0]) || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=1200&h=630&fit=crop'}
        url={typeof window !== 'undefined' ? window.location.href : undefined}
        type="product"
        schema={{
          '@context': 'https://schema.org/',
          '@type': 'Product',
          name: product.name,
          image: product.thumbnailUrl || (product.images && product.images[0]),
          description: product.description,
          sku: product.sku || product.id,
          brand: {
            '@type': 'Brand',
            name: 'VCUBE Vietnam'
          },
          offers: {
            '@type': 'Offer',
            priceCurrency: 'VND',
            price: product.pricePhysical,
            availability: 'https://schema.org/InStock'
          }
        }}
      />

      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Breadcrumbs & Quick Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-[#CBD5E1] shadow-xs">
          <nav className="flex items-center gap-2 text-xs font-mono text-[#64748B] overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => onNavigate('home')}
              className="hover:text-[#00687A] transition-colors whitespace-nowrap font-bold cursor-pointer"
            >
              VCUBE 3D
            </button>
            <span>/</span>
            <button
              onClick={() => onNavigate('explore')}
              className="hover:text-[#00687A] transition-colors whitespace-nowrap cursor-pointer"
            >
              {isVi ? 'Khám phá CAD' : 'Catalog'}
            </button>
            <span>/</span>
            <span className="text-[#00687A] font-bold uppercase truncate max-w-[120px] sm:max-w-[180px]">
              {product.category}
            </span>
            <span>/</span>
            <span className="text-[#091426] font-bold truncate max-w-[180px] sm:max-w-xs">
              {product.name}
            </span>
          </nav>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => {
                setIsBookmarked(!isBookmarked);
                onShowToast(isBookmarked ? (isVi ? 'Đã bỏ lưu bản vẽ' : 'Removed from bookmarks') : (isVi ? 'Đã lưu bản vẽ vào mục yêu thích!' : 'Bookmarked!'));
              }}
              className={`p-2 rounded-xl border text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                isBookmarked
                  ? 'bg-amber-50 text-amber-700 border-amber-300'
                  : 'bg-white text-[#64748B] border-[#CBD5E1] hover:text-[#091426]'
              }`}
              title="Lưu bản vẽ"
            >
              <span className={`material-symbols-outlined text-base ${isBookmarked ? 'fill-1' : ''}`}>
                {isBookmarked ? 'bookmark' : 'bookmark_border'}
              </span>
              <span className="text-[11px] font-mono hidden sm:inline">
                {isBookmarked ? (isVi ? 'Đã lưu' : 'Saved') : (isVi ? 'Lưu' : 'Save')}
              </span>
            </button>

            <button
              onClick={() => {
                navigator.clipboard?.writeText(window.location.href);
                onShowToast(isVi ? 'Đã sao chép liên kết sản phẩm!' : 'Copied link to clipboard!');
              }}
              className="p-2 rounded-xl border border-[#CBD5E1] bg-white text-[#64748B] hover:text-[#091426] text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Chia sẻ link"
            >
              <span className="material-symbols-outlined text-base">share</span>
              <span className="text-[11px] font-mono hidden sm:inline">Share</span>
            </button>
          </div>
        </div>

        {/* Main Product Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
          {/* Left Column: 3D Viewport / Image Gallery & Detailed Technical Tabs */}
          <div className="lg:col-span-7 space-y-6">
            {/* View Mode Switcher Header */}
            <div className="flex items-center justify-between bg-white px-4 py-3 rounded-2xl border border-[#CBD5E1] shadow-xs">
              <div className="flex items-center gap-1 bg-[#F8FAFC] border border-[#CBD5E1] p-0.5 rounded-xl">
                <button
                  onClick={() => setViewMode('3d')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    viewMode === '3d'
                      ? 'bg-[#00687A] text-white shadow-2xs'
                      : 'text-[#64748B] hover:text-[#091426]'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">3d_rotation</span>
                  <span>3D Interactive Canvas</span>
                </button>
                <button
                  onClick={() => setViewMode('image')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    viewMode === 'image'
                      ? 'bg-[#00687A] text-white shadow-2xs'
                      : 'text-[#64748B] hover:text-[#091426]'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">photo_library</span>
                  <span>Gallery ({product.images.length})</span>
                </button>
              </div>

              {viewMode === '3d' ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsWireframe(!isWireframe)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold border transition-colors cursor-pointer ${
                      isWireframe
                        ? 'bg-cyan-500/10 text-[#00687A] border-[#00687A]'
                        : 'bg-white text-[#64748B] border-[#CBD5E1] hover:text-[#091426]'
                    }`}
                  >
                    Mesh Wireframe
                  </button>
                  <span className="text-[10px] font-mono text-[#00687A] font-bold hidden sm:inline bg-[#00687A]/10 px-2 py-1 rounded-md">
                    ±0.05mm
                  </span>
                </div>
              ) : (
                <span className="text-[11px] font-mono text-[#64748B]">
                  {product.images.length} góc chụp thực tế
                </span>
              )}
            </div>

            {/* Viewer Display Frame */}
            {viewMode === '3d' ? (
              <div className="bg-[#091426] border border-[#1e293b] rounded-2xl shadow-xl relative overflow-hidden flex flex-col justify-between p-4 h-[420px] sm:h-[480px]">
                {/* HUD Top Bar */}
                <div className="w-full flex items-center justify-between z-10 text-white/70 font-mono text-[10px] uppercase tracking-wider">
                  <span className="flex items-center gap-1.5 bg-[#0b1c30]/80 px-2.5 py-1 rounded-md border border-white/10">
                    <span className="w-2 h-2 rounded-full bg-[#57DFFE] animate-pulse"></span>
                    <span>WebGL 360° Inspection</span>
                  </span>
                  <span className="bg-[#0b1c30]/80 px-2.5 py-1 rounded-md border border-white/10 text-cyan-300 truncate ml-2">
                    Vật liệu: {selectedMaterial}
                  </span>
                </div>

                {/* 3D Model Rendering Canvas */}
                <div className="flex-1 w-full h-full relative">
                  <ThreeModelViewer
                    modelType={modelGeometryType}
                    color={selectedColor.hex}
                    wireframe={isWireframe}
                    className="h-full w-full"
                  />
                </div>

                {/* HUD Bottom Bar */}
                <div className="w-full flex items-center justify-between z-10 text-white/60 font-mono text-[9px] uppercase tracking-widest bg-[#0b1c30]/70 px-3 py-1.5 rounded-lg border border-white/10">
                  <span>Xoay: Kéo chuột • Zoom: Cuộn bánh xe</span>
                  <span className="text-[#57DFFE] font-bold">✓ Watertight Mesh 100%</span>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative aspect-4/3 bg-[#091426] border border-[#CBD5E1] rounded-2xl overflow-hidden flex items-center justify-center shadow-md">
                  <img
                    src={product.images[selectedImageIndex]}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-3 right-3 bg-[#091426]/80 text-white text-[10px] font-mono px-2.5 py-1 rounded-md border border-white/10 backdrop-blur-xs">
                    Ảnh {selectedImageIndex + 1} / {product.images.length}
                  </span>
                </div>

                {/* Image Thumbnails Strip */}
                <div className="flex items-center gap-2.5 overflow-x-auto py-1 scrollbar-none">
                  {product.images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImageIndex(idx)}
                      className={`w-18 h-18 rounded-xl border-2 shrink-0 transition-all overflow-hidden cursor-pointer ${
                        selectedImageIndex === idx
                          ? 'border-[#00687A] ring-2 ring-[#00687A]/30 scale-102'
                          : 'border-[#CBD5E1] opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Batch Production Co-Printing Progress Card */}
            {product.batchProgress && (
              <div className="bg-white border border-[#CBD5E1] p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="font-mono text-xs uppercase tracking-wider font-bold text-[#091426]">
                      Đợt Sản Xuất Gom Chung #04
                    </span>
                    <span className="px-2 py-0.5 bg-[#00687A]/10 text-[#00687A] text-[9px] font-mono font-bold rounded">
                      Co-printing VCUBE
                    </span>
                  </div>
                  <p className="text-xs text-[#64748B] leading-relaxed">
                    Đã đăng ký <strong className="text-[#091426]">{product.batchProgress.current}/{product.batchProgress.total}</strong> đơn. Dự kiến bấm máy xuất xưởng vào ngày <strong className="text-[#00687A]">{product.batchProgress.targetDate}</strong>.
                  </p>
                </div>
                <div className="w-full sm:w-40 bg-[#F1F5F9] h-2.5 rounded-full overflow-hidden border border-[#CBD5E1] shrink-0">
                  <div
                    className="bg-[#00687A] h-full rounded-full transition-all duration-500"
                    style={{ width: `${(product.batchProgress.current / product.batchProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Technical Detail Tabs: Overview, Specs & Tolerances, Reviews, Slicing */}
            <div className="bg-white border border-[#CBD5E1] rounded-2xl p-5 sm:p-7 shadow-xs">
              <div className="flex border-b border-[#CBD5E1] gap-4 sm:gap-6 text-xs font-mono uppercase tracking-wider mb-6 overflow-x-auto scrollbar-none">
                <button
                  onClick={() => setActiveTab('desc')}
                  className={`pb-3 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                    activeTab === 'desc'
                      ? 'border-[#00687A] text-[#00687A] font-bold'
                      : 'border-transparent text-[#64748B] hover:text-[#091426]'
                  }`}
                >
                  {isVi ? 'Tổng quan & Kết cấu' : 'Overview & Features'}
                </button>
                <button
                  onClick={() => setActiveTab('specs')}
                  className={`pb-3 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                    activeTab === 'specs'
                      ? 'border-[#00687A] text-[#00687A] font-bold'
                      : 'border-transparent text-[#64748B] hover:text-[#091426]'
                  }`}
                >
                  {isVi ? 'Thông số & Dung sai' : 'Specs & Tolerances'}
                </button>
                <button
                  onClick={() => setActiveTab('reviews')}
                  className={`pb-3 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                    activeTab === 'reviews'
                      ? 'border-[#00687A] text-[#00687A] font-bold'
                      : 'border-transparent text-[#64748B] hover:text-[#091426]'
                  }`}
                >
                  {isVi ? `Kiểm định (${product.reviewsCount})` : `Verified Tests (${product.reviewsCount})`}
                </button>
                <button
                  onClick={() => setActiveTab('slicing')}
                  className={`pb-3 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                    activeTab === 'slicing'
                      ? 'border-[#00687A] text-[#00687A] font-bold'
                      : 'border-transparent text-[#64748B] hover:text-[#091426]'
                  }`}
                >
                  {isVi ? 'Profile In & Slicing' : 'Slicing Profiles'}
                </button>
              </div>

              {/* Tab 1: Overview */}
              {activeTab === 'desc' && (
                <div className="space-y-4 text-sm text-[#475569] leading-relaxed">
                  <p className="text-base text-[#091426] font-medium leading-relaxed bg-[#F8FAFC] p-4 rounded-xl border border-[#CBD5E1]">
                    "{product.description}"
                  </p>
                  <div>
                    <span className="font-mono text-xs uppercase tracking-wider text-[#64748B] block mb-3 font-bold">
                      {isVi ? 'Đặc tính kết cấu kỹ thuật:' : 'Engineering Characteristics:'}
                    </span>
                    <ul className="space-y-2.5 text-xs text-[#091426]">
                      {product.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-2.5 bg-[#F8FAFC] p-2.5 rounded-lg border border-[#CBD5E1]/60">
                          <span className="font-mono text-xs text-[#00687A] font-bold">0{i + 1}.</span>
                          <span className="leading-snug">{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Tab 2: Technical Specs */}
              {activeTab === 'specs' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                  <div className="bg-[#F8FAFC] p-3.5 rounded-xl border border-[#CBD5E1]">
                    <span className="text-[10px] uppercase text-[#64748B] block mb-1">Kích Thước Phủ Bì</span>
                    <span className="font-bold text-sm text-[#091426]">{product.specs.dimensions}</span>
                  </div>
                  <div className="bg-[#F8FAFC] p-3.5 rounded-xl border border-[#CBD5E1]">
                    <span className="text-[10px] uppercase text-[#64748B] block mb-1">Khối Lượng Nhựa In</span>
                    <span className="font-bold text-sm text-[#091426]">{product.specs.weight}</span>
                  </div>
                  <div className="bg-[#F8FAFC] p-3.5 rounded-xl border border-[#CBD5E1]">
                    <span className="text-[10px] uppercase text-[#64748B] block mb-1">Độ Phân Giải Lớp In</span>
                    <span className="font-bold text-sm text-[#091426]">{product.specs.resolution}</span>
                  </div>
                  <div className="bg-[#F8FAFC] p-3.5 rounded-xl border border-[#CBD5E1]">
                    <span className="text-[10px] uppercase text-[#64748B] block mb-1">Công Nghệ Gia Công</span>
                    <span className="font-bold text-sm text-[#091426]">{product.specs.technology}</span>
                  </div>
                  <div className="bg-[#F8FAFC] p-3.5 rounded-xl border border-[#CBD5E1]">
                    <span className="text-[10px] uppercase text-[#64748B] block mb-1">Định Dạng File Nguồn</span>
                    <span className="font-bold text-sm text-[#00687A]">{product.cadFormat || 'STL + STEP + 3MF'}</span>
                  </div>
                  <div className="bg-[#F8FAFC] p-3.5 rounded-xl border border-[#CBD5E1]">
                    <span className="text-[10px] uppercase text-[#64748B] block mb-1">Dung Sai Lắp Ghép</span>
                    <span className="font-bold text-sm text-emerald-700">±0.05 mm (Chuẩn Cơ Khí)</span>
                  </div>
                </div>
              )}

              {/* Tab 3: Reviews */}
              {activeTab === 'reviews' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-5 bg-[#F8FAFC] p-4 rounded-xl border border-[#CBD5E1]">
                    <div className="text-center pr-5 border-r border-[#CBD5E1]">
                      <span className="font-mono text-3xl font-bold text-[#091426]">{product.rating}</span>
                      <div className="flex text-amber-500 text-xs mt-0.5 justify-center">
                        ★★★★★
                      </div>
                      <span className="text-[10px] uppercase text-[#64748B] font-mono block mt-1">
                        {product.reviewsCount} đánh giá
                      </span>
                    </div>
                    <div className="text-xs text-[#475569] leading-relaxed">
                      <strong className="text-[#091426] block mb-0.5">100% Khớp dung sai cơ khí</strong>
                      Toàn bộ người dùng xác nhận bản in lắp khít hoàn hảo với bo mạch và đai ốc tiêu chuẩn.
                    </div>
                  </div>

                  <div className="bg-[#F8FAFC] p-4 rounded-xl border border-[#CBD5E1] space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-bold text-[#091426]">Hoàng Đình Long — Kỹ sư R&D</span>
                      <span className="text-[#64748B] text-[10px]">22/10/2026</span>
                    </div>
                    <p className="text-xs text-[#475569] italic leading-relaxed">
                      "Khớp snap-fit đóng cực kỳ khít, in vật liệu PETG không bị giòn gãy. Khe tản nhiệt tổ ong rất đẹp và cứng cáp!"
                    </p>
                  </div>
                </div>
              )}

              {/* Tab 4: Slicing Profiles */}
              {activeTab === 'slicing' && (
                <div className="space-y-3 text-xs font-mono">
                  <div className="p-3.5 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-xl flex items-center justify-between">
                    <span>✓ Bambu Lab X1C / P1S / A1 Profile:</span>
                    <strong className="text-emerald-700">Verified Ready</strong>
                  </div>
                  <div className="p-3.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Nhiệt độ đùn khuyên dùng:</span>
                      <span className="font-bold text-[#091426]">215°C - 230°C</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Nhiệt độ bàn in (Heatbed):</span>
                      <span className="font-bold text-[#091426]">55°C - 65°C</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Kiểu Infill tối ưu:</span>
                      <span className="font-bold text-[#00687A]">Gyroid 35% (Chịu lực đa hướng)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Số vòng thành (Wall Loops):</span>
                      <span className="font-bold text-[#091426]">4 Loops (Độ bền tối đa)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Dual Persona Buying Box & Smart Configurator */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white border border-[#CBD5E1] p-6 sm:p-7 rounded-2xl space-y-6 shadow-md lg:sticky lg:top-24">
              {/* Product Header */}
              <div>
                <div className="flex items-center justify-between text-xs mb-2 font-mono">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[#00687A] font-bold uppercase">{product.designer}</span>
                    <span className="px-1.5 py-0.5 bg-[#00687A]/10 text-[#00687A] text-[9px] font-bold rounded">
                      Verified CAD
                    </span>
                  </div>
                  <span className="text-xs text-[#D97706] font-bold flex items-center gap-0.5">
                    ★ {product.rating} <span className="text-[#94A3B8]">({product.reviewsCount})</span>
                  </span>
                </div>

                <h1 className="text-xl sm:text-2xl font-extrabold text-[#091426] leading-snug">
                  {product.name}
                </h1>
                <span className="text-[11px] font-mono text-[#64748B] block mt-1">
                  SKU: {product.sku || 'VC-CAD-STD'}
                </span>
              </div>

              {/* DUAL PERSONA: DIGITAL CAD ASSET CARD */}
              <div className="p-4 rounded-xl border border-[#00687A]/30 bg-[#00687A]/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[#00687A] text-base">folder_zip</span>
                    <span className="font-mono text-xs uppercase font-bold text-[#00687A]">
                      Bản Quyền Tải File CAD Gốc
                    </span>
                  </div>
                  <span className="font-mono text-base font-bold text-[#00687A]">
                    {product.priceDigital.toLocaleString(isVi ? 'vi-VN' : 'en-US')} đ
                  </span>
                </div>

                <p className="text-[11px] text-[#475569] leading-relaxed">
                  Bao gồm file <strong>STL + STEP + 3MF</strong> kiểm định Watertight, đi kèm Commercial License cho phép chế tạo sản phẩm thương mại.
                </p>

                <button
                  onClick={handleAddDigital}
                  className="w-full py-2.5 bg-[#00687A] hover:bg-[#005260] text-white font-mono font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                >
                  <span className="material-symbols-outlined text-sm">download</span>
                  <span>{isVi ? 'Mua & Tải File CAD Ngay' : 'Buy CAD License'}</span>
                </button>
              </div>

              {/* DUAL PERSONA: PHYSICAL 3D PRINT CONFIGURATOR */}
              <div className="pt-2 border-t border-[#CBD5E1] space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-[#091426]">precision_manufacturing</span>
                    <span className="font-mono text-xs uppercase font-bold text-[#091426]">
                      Cấu Hình Đặt In 3D Hoàn Thiện
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-lg font-extrabold text-[#091426] block">
                      {(dynamicPricePhysical * quantity).toLocaleString(isVi ? 'vi-VN' : 'en-US')} đ
                    </span>
                    {volumeDiscountPercent > 0 && (
                      <span className="text-[10px] font-mono text-emerald-600 font-bold block">
                        Đã giảm {volumeDiscountPercent}% ({applicableDiscountTier?.label})
                      </span>
                    )}
                  </div>
                </div>

                {/* 1. Material Selector */}
                <div>
                  <label className="text-[11px] font-mono uppercase font-bold text-[#64748B] block mb-2 flex items-center justify-between">
                    <span>1. Vật liệu chế tạo:</span>
                    <span className="text-[#00687A] font-bold text-[10px]">{selectedMaterialObj?.strength}</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {product.supportedMaterials.map((mat) => {
                      const isSelected = selectedMaterial === mat;
                      return (
                        <button
                          key={mat}
                          onClick={() => setSelectedMaterial(mat)}
                          className={`p-2.5 rounded-xl border text-left text-xs font-mono transition-all cursor-pointer ${
                            isSelected
                              ? 'border-[#00687A] bg-[#00687A] text-white font-bold shadow-2xs'
                              : 'border-[#CBD5E1] bg-[#F8FAFC] text-[#091426] hover:border-[#00687A]'
                          }`}
                        >
                          <p className="truncate text-xs">{mat}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Color Swatches Picker */}
                <div>
                  <label className="text-[11px] font-mono uppercase font-bold text-[#64748B] block mb-2">
                    2. Sắc thái hoàn thiện: <span className="text-[#091426] font-bold">{selectedColor.name}</span>
                  </label>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {product.colors.map((c) => (
                      <button
                        key={c.name}
                        onClick={() => c.available && setSelectedColor(c)}
                        disabled={!c.available}
                        className={`relative w-8 h-8 rounded-full border-2 transition-all touch-target-btn cursor-pointer ${
                          selectedColor.name === c.name
                            ? 'border-[#00687A] scale-110 ring-2 ring-[#00687A]/30 shadow-sm'
                            : 'border-white hover:scale-105'
                        } ${!c.available ? 'opacity-30 cursor-not-allowed' : ''}`}
                        style={{ backgroundColor: c.hex }}
                        title={c.available ? c.name : `${c.name} (Hết hàng)`}
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

                {/* 3. Layer Resolution */}
                <div>
                  <label className="text-[11px] font-mono uppercase font-bold text-[#64748B] block mb-1.5">
                    3. Độ phân giải lớp in (Layer Height)
                  </label>
                  <select
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl p-2.5 text-xs text-[#091426] font-mono focus:outline-none focus:border-[#00687A] cursor-pointer"
                  >
                    <option value="0.12 mm (Chính xác vi mô)">0.12 mm — Bề mặt siêu mịn / Dung sai ngặt</option>
                    <option value="0.16 mm (Tiêu chuẩn kỹ thuật)">0.16 mm — Tiêu chuẩn kỹ thuật (Khuyên dùng)</option>
                    <option value="0.20 mm (In nhanh tiêu chuẩn)">0.20 mm — In nhanh tiết kiệm</option>
                  </select>
                </div>

                {/* 4. Custom Laser Engraving */}
                {product.isCustomizable && (
                  <div>
                    <label className="text-[11px] font-mono uppercase font-bold text-[#64748B] block mb-1.5 flex items-center justify-between">
                      <span>4. Khắc laser tên dự án / số hiệu:</span>
                      <span className="text-[10px] text-[#00687A] font-bold">+{engravingFee.toLocaleString('vi-VN')} đ</span>
                    </label>
                    <input
                      type="text"
                      maxLength={25}
                      placeholder="VD: VCUBE-LAB-01..."
                      value={customEngraving}
                      onChange={(e) => setCustomEngraving(e.target.value)}
                      className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs text-[#091426] font-mono focus:outline-none focus:border-[#00687A]"
                    />
                  </div>
                )}

                {/* 5. Quantity Counter & Volume Discount */}
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono uppercase font-bold text-[#64748B]">Số lượng:</span>
                    <div className="flex items-center border border-[#CBD5E1] rounded-xl bg-white overflow-hidden shadow-2xs">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="px-3 py-1.5 hover:bg-[#F8FAFC] text-[#091426] text-xs font-bold font-mono touch-target-btn cursor-pointer"
                      >
                        -
                      </button>
                      <span className="px-4 py-1.5 font-mono text-xs font-bold text-[#091426] border-x border-[#CBD5E1]">
                        {quantity}
                      </span>
                      <button
                        onClick={() => setQuantity(quantity + 1)}
                        className="px-3 py-1.5 hover:bg-[#F8FAFC] text-[#091426] text-xs font-bold font-mono touch-target-btn cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Primary Physical Order Action */}
                <button
                  onClick={handleAddPhysical}
                  disabled={isAdding}
                  className="w-full py-3.5 bg-[#091426] hover:bg-[#00687A] text-white font-mono font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer touch-target-btn active:scale-95"
                >
                  <span className="material-symbols-outlined text-base">shopping_bag</span>
                  <span>{isAdding ? 'ĐANG XỬ LÝ...' : `ĐẶT GIA CÔNG IN 3D (${(dynamicPricePhysical * quantity).toLocaleString('vi-VN')} đ)`}</span>
                </button>

                {/* 3D Personalization & Laser Engraving Action */}
                <button
                  onClick={() => onNavigate('personalize', { product })}
                  className="w-full py-3 bg-gradient-to-r from-teal-700 to-[#00687A] hover:from-teal-800 hover:to-[#005260] text-white font-mono font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer touch-target-btn active:scale-95 border border-[#57DFFE]/30"
                >
                  <span className="material-symbols-outlined text-base text-[#57DFFE]">draw</span>
                  <span>TÙY BIẾN 3D & KHẮC LASER RIÊNG</span>
                </button>
              </div>

              {/* Guarantees Badges */}
              <div className="pt-4 border-t border-[#CBD5E1] grid grid-cols-2 gap-3 text-[10px] font-mono text-[#64748B]">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-[#00687A]">verified</span>
                  <span>Dung sai ±0.05mm</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-[#00687A]">local_shipping</span>
                  <span>Giao toàn quốc 24-48h</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Compatible & Related CAD Models Section */}
        {relatedProducts.length > 0 && (
          <div className="pt-8 border-t border-[#CBD5E1] space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-lg text-[#091426]">
                  {isVi ? 'Linh Kiện Thường Được In Cùng' : 'Frequently Co-Printed Parts'}
                </h3>
                <p className="text-xs text-[#64748B] font-mono">
                  {isVi ? 'Các module cơ khí và phụ kiện cùng hệ sinh thái thiết kế' : 'Compatible mechanical modules & accessories'}
                </p>
              </div>
              <button
                onClick={() => onNavigate('explore')}
                className="text-xs font-mono font-bold text-[#00687A] hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>{isVi ? 'Xem tất cả' : 'View all'}</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {relatedProducts.map((rel) => (
                <div
                  key={rel.id}
                  onClick={() => onNavigate('product_detail', { product: rel })}
                  className="bg-white border border-[#CBD5E1] hover:border-[#00687A] rounded-2xl p-4 transition-all duration-300 hover:shadow-lg flex items-center gap-4 cursor-pointer group"
                >
                  <img
                    src={rel.thumbnailUrl || rel.images[0]}
                    alt={rel.name}
                    className="w-16 h-16 object-cover rounded-xl border border-[#CBD5E1] group-hover:scale-105 transition-transform shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-mono text-[#00687A] font-bold uppercase block truncate">
                      {rel.category}
                    </span>
                    <h4 className="font-bold text-xs text-[#091426] truncate group-hover:text-[#00687A] transition-colors">
                      {rel.name}
                    </h4>
                    <div className="flex items-center justify-between mt-1 text-[11px] font-mono">
                      <span className="text-[#64748B]">
                        CAD: {rel.priceDigital.toLocaleString('vi-VN')} đ
                      </span>
                      <span className="font-bold text-[#091426]">
                        {rel.pricePhysical.toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Mobile Sticky Order Bar (< lg screens) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#CBD5E1] p-3.5 pb-[calc(0.875rem+env(safe-area-inset-bottom,0px))] shadow-2xl flex items-center justify-between gap-3">
        <div>
          <span className="text-[9px] uppercase font-mono text-[#64748B] block">
            {isVi ? 'Đơn giá in 3D' : 'Print Price'}
          </span>
          <span className="text-base font-mono font-bold text-[#091426]">
            {(dynamicPricePhysical * quantity).toLocaleString(isVi ? 'vi-VN' : 'en-US')} đ
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleAddDigital}
            className="px-3 py-2.5 bg-white border border-[#CBD5E1] hover:border-[#00687A] text-[#091426] text-[10px] font-mono uppercase tracking-wider font-bold rounded-xl flex items-center gap-1 shadow-2xs cursor-pointer"
            title="Tải File CAD"
          >
            <span className="material-symbols-outlined text-xs">download</span>
            <span>CAD</span>
          </button>
          <button
            onClick={handleAddPhysical}
            disabled={isAdding}
            className="px-4 py-2.5 bg-[#00687A] hover:bg-[#005260] text-white text-[11px] font-mono uppercase tracking-wider font-bold rounded-xl shadow-xs flex items-center gap-1.5 touch-target-btn active:scale-95 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">precision_manufacturing</span>
            <span>{isAdding ? '...' : (isVi ? 'Đặt In 3D' : 'Order Print')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
