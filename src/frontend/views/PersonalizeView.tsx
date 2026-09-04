import React, { useState } from 'react';
import { Product, CartItem, MaterialProfile, InkiriCostFormulaConfig } from '../../types';
import { MATERIALS_CATALOG, DEFAULT_INKIRI_FORMULA_CONFIG } from '../../data/mockData';
import { PersonalizeModelViewer3D } from '../components/personalize/PersonalizeModelViewer3D';

interface PersonalizeViewProps {
  product?: Product;
  materials?: MaterialProfile[];
  pricingConfig?: InkiriCostFormulaConfig;
  onAddToCart: (item: CartItem) => void;
  onNavigate: (screen: string, payload?: any) => void;
  onShowToast: (message: string) => void;
}

export const PersonalizeView: React.FC<PersonalizeViewProps> = ({
  product,
  materials = MATERIALS_CATALOG,
  pricingConfig = DEFAULT_INKIRI_FORMULA_CONFIG,
  onAddToCart,
  onNavigate,
  onShowToast
}) => {
  const activeConfig = pricingConfig || DEFAULT_INKIRI_FORMULA_CONFIG;
  const materialsList = materials && materials.length > 0 ? materials : MATERIALS_CATALOG;

  const currentProduct = product || {
    id: 'prod-arduino-case',
    sku: 'IND-BRK-009A',
    name: 'Khung Đồ Gá & Vỏ Bọc Kỹ Thuật Arduino Tùy Chỉnh',
    category: 'mechanical',
    designer: 'TechLab VN',
    pricePhysical: 450000,
    priceDigital: 120000,
    images: ['https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80'],
    description: 'Chi tiết cơ khí dung sai cao cho phép khắc laser hoặc đùn nổi mã định danh, logo doanh nghiệp trực tiếp trong quá trình in.',
    features: ['Khắc laser / đùn nổi tùy chỉnh', 'Vật liệu cơ tính cao', 'Ngàm snap-fit 4 góc', 'Chân ốc M3 brass inserts'],
    specs: { dimensions: '120.0 x 85.5 x 45.2 mm', weight: '145g', resolution: '0.12 mm', infillDefault: '35%', technology: 'FDM Engineering' },
    supportedMaterials: ['PLA Pro (Standard)', 'PETG Technical Pro', 'Tough Resin (High Detail)', 'ABS Industrial'],
    colors: [
      { name: 'Xanh Teal Tooling', hex: '#00687a', available: true },
      { name: 'Đen Carbon', hex: '#0f172a', available: true },
      { name: 'Xám Titan', hex: '#64748b', available: true },
      { name: 'Cam Cảnh Báo', hex: '#ea580c', available: true },
      { name: 'Trắng Sứ Mịn', hex: '#f8f9ff', available: true }
    ],
    tags: ['Personalized', 'Custom Text', 'Engineering', 'IoT'],
    rating: 4.9,
    reviewsCount: 48,
    printsCount: 190
  };

  // State
  const [selectedMaterial, setSelectedMaterial] = useState('PETG Technical Pro');
  const [selectedColorHex, setSelectedColorHex] = useState('#00687a');
  const [selectedColorName, setSelectedColorName] = useState('Xanh Teal Tooling');
  const [engravingText, setEngravingText] = useState('PROTOTYPE-01');
  const [selectedFont, setSelectedFont] = useState('JetBrains Mono');
  const [fontSizeMm, setFontSizeMm] = useState(12);
  const [engravingDepth, setEngravingDepth] = useState<'laser' | 'embossed' | 'recessed'>('embossed');
  const [engravingPosition, setEngravingPosition] = useState<'center' | 'top-left' | 'bottom-right'>('center');
  const [lidExplodeDistance, setLidExplodeDistance] = useState<number>(0);
  const [uploadedLogoName, setUploadedLogoName] = useState<string | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [quantity, setQuantity] = useState<number>(1);
  const [selectedPackageTier, setSelectedPackageTier] = useState<'economy' | 'standard' | 'express'>('standard');

  // Model physical dimensions
  const parsedDimensions = { x: 120.0, y: 85.5, z: 45.2 };

  // Calculate live price dynamically from Admin Config & Material Multiplier
  const basePrice = currentProduct.pricePhysical || 450000;
  const matchingMaterial = materialsList.find(m =>
    selectedMaterial.toLowerCase().includes(m.name.toLowerCase()) ||
    m.name.toLowerCase().includes(selectedMaterial.toLowerCase()) ||
    selectedMaterial.toLowerCase().includes(m.id.toLowerCase())
  );
  const materialMultiplier = matchingMaterial?.unitPriceMultiplier || 1.0;
  const materialCostDiff = Math.round(basePrice * (materialMultiplier - 1));
  const engravingFee = activeConfig.customEngravingFee ?? 50000;
  const logoFee = activeConfig.customLogoUploadFee ?? 80000;
  const activeEngravingCost = engravingText.trim() ? engravingFee : 0;
  const activeLogoCost = uploadedLogoName ? logoFee : 0;

  // Batch Volume Discount & Delivery Package Tier multiplier
  const volumeDiscountPercent = quantity >= 20 ? 22 : quantity >= 10 ? 15 : quantity >= 5 ? 8 : 0;
  const packageMultiplier = selectedPackageTier === 'express' ? 1.3 : selectedPackageTier === 'economy' ? 0.9 : 1.0;
  const unitBasePrice = Math.round(
    (basePrice * materialMultiplier + activeEngravingCost + activeLogoCost) *
    (1 - volumeDiscountPercent / 100) *
    packageMultiplier
  );
  const totalCost = unitBasePrice * quantity;

  const isTextTooLong = engravingText.length > 20 || (fontSizeMm > 18 && engravingText.length > 12);

  // Quick preset options for materials
  const materialPresets = [
    {
      id: 'PETG Technical Pro',
      name: 'PETG Technical Pro',
      multiplier: 1.15,
      strength: 'Chống va đập • Chịu nhiệt 75°C',
      tag: 'Khuyên dùng cho đồ gá'
    },
    {
      id: 'PLA Pro (Standard)',
      name: 'PLA Tough Standard',
      multiplier: 1.0,
      strength: 'Độ chính xác cao • Dễ in',
      tag: 'Tối ưu chi phí'
    },
    {
      id: 'Tough Resin (High Detail)',
      name: 'Tough Resin 8K',
      multiplier: 1.45,
      strength: 'Dung sai ±0.05mm • Siêu mịn',
      tag: 'Chuẩn quang học 8K'
    },
    {
      id: 'ABS Industrial',
      name: 'ABS Industrial Grade',
      multiplier: 1.3,
      strength: 'Chịu nhiệt 95°C • Bền hóa chất',
      tag: 'Môi trường khắc nghiệt'
    }
  ];

  // Available colors
  const colorOptions = [
    { name: 'Xanh Teal Tooling', hex: '#00687a' },
    { name: 'Đen Carbon', hex: '#0f172a' },
    { name: 'Xám Titan', hex: '#64748b' },
    { name: 'Cam Cảnh Báo', hex: '#ea580c' },
    { name: 'Trắng Sứ Mịn', hex: '#f8f9ff' }
  ];

  const createCartPayload = (): CartItem => ({
    id: `custom-cart-${Date.now()}`,
    productId: currentProduct.id,
    type: 'physical',
    name: `${currentProduct.name} [Khắc: ${engravingText.trim() || 'Không'}] (${selectedPackageTier === 'express' ? 'HỎA TỐC' : selectedPackageTier === 'economy' ? 'TIẾT KIỆM' : 'TIÊU CHUẨN'})`,
    designer: currentProduct.designer,
    image: currentProduct.images[0],
    price: unitBasePrice,
    quantity: quantity,
    material: selectedMaterial,
    color: selectedColorName,
    colorHex: selectedColorHex,
    customText: engravingText.trim() || undefined,
    customFont: selectedFont,
    customFontSize: fontSizeMm,
    uploadedLogoName: uploadedLogoName || undefined
  });

  const handleAddToCart = () => {
    onAddToCart(createCartPayload());
    onShowToast('Đã thêm sản phẩm cá nhân hóa vào giỏ hàng!');
  };

  const handleOrderNow = () => {
    onAddToCart(createCartPayload());
    onShowToast('Đang chuyển đến giỏ hàng thanh toán...');
    onNavigate('cart');
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const fileName = e.target.files[0].name;
      setUploadedLogoName(fileName);
      onShowToast(`Đã nhận file logo: ${fileName}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#091426] py-6 sm:py-8 px-4 sm:px-6 md:px-12 pb-28 lg:pb-12 font-sans">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Breadcrumbs & Quick Action Bar (Matching ProductDetailView.tsx) */}
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
              Catalog
            </button>
            <span>/</span>
            <span className="text-[#00687A] font-bold uppercase truncate max-w-[120px] sm:max-w-[180px]">
              {currentProduct.category}
            </span>
            <span>/</span>
            <span className="text-[#091426] font-bold truncate max-w-[180px] sm:max-w-xs">
              {currentProduct.name}
            </span>
          </nav>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="font-mono text-[11px] text-[#00687A] font-bold bg-[#00687A]/10 px-2.5 py-1 rounded-lg border border-[#00687A]/20">
              SKU: {currentProduct.sku || 'IND-BRK-009A'}
            </span>

            <button
              onClick={() => {
                setIsBookmarked(!isBookmarked);
                onShowToast(isBookmarked ? 'Đã bỏ lưu bản vẽ' : 'Đã lưu cấu hình vào mục yêu thích!');
              }}
              className={`p-2 rounded-xl border text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                isBookmarked
                  ? 'bg-amber-50 text-amber-700 border-amber-300'
                  : 'bg-white text-[#64748B] border-[#CBD5E1] hover:text-[#091426]'
              }`}
              title="Lưu cấu hình"
            >
              <span className={`material-symbols-outlined text-base ${isBookmarked ? 'fill-1' : ''}`}>
                {isBookmarked ? 'bookmark' : 'bookmark_border'}
              </span>
              <span className="text-[11px] font-mono hidden sm:inline">
                {isBookmarked ? 'Đã lưu' : 'Lưu'}
              </span>
            </button>

            <button
              onClick={() => {
                navigator.clipboard?.writeText(window.location.href);
                onShowToast('Đã sao chép liên kết cấu hình!');
              }}
              className="p-2 rounded-xl border border-[#CBD5E1] bg-white text-[#64748B] hover:text-[#091426] text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Chia sẻ link"
            >
              <span className="material-symbols-outlined text-base">share</span>
              <span className="text-[11px] font-mono hidden sm:inline">Share</span>
            </button>

            <button
              onClick={() => onNavigate('explore')}
              className="p-2 rounded-xl border border-[#CBD5E1] bg-white text-[#64748B] hover:text-[#00687A] text-xs transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
              title="Trở về Catalog"
            >
              <span className="material-symbols-outlined text-base">arrow_back</span>
              <span className="text-[11px] font-mono hidden sm:inline">Catalog</span>
            </button>
          </div>
        </div>

        {/* Main 2-Column Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
          {/* Left Column: High-Tech 3D Personalization Viewport & Mechanical Specs */}
          <div className="lg:col-span-7 space-y-6">
            {/* 3D Canvas Frame */}
            <div className="bg-[#091426] border border-[#1e293b] rounded-2xl shadow-xl relative overflow-hidden flex flex-col h-[480px] sm:h-[560px] lg:h-[620px]">
              <PersonalizeModelViewer3D
                modelType="arduino-case"
                colorHex={selectedColorHex}
                materialName={selectedMaterial}
                engravingText={engravingText}
                fontFamily={selectedFont}
                fontSizeMm={fontSizeMm}
                engravingDepth={engravingDepth}
                engravingPosition={engravingPosition}
                logoName={uploadedLogoName}
                lidExplodeDistance={lidExplodeDistance}
                onLidExplodeChange={(distance) => setLidExplodeDistance(distance)}
                dimensions={parsedDimensions}
                className="w-full h-full"
              />
            </div>

            {/* Engineering & Tolerance Verification Tile */}
            <div className="bg-white border border-[#CBD5E1] rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#CBD5E1] pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#00687A] animate-pulse"></span>
                  <span className="font-mono text-xs uppercase font-bold text-[#091426] tracking-wider">
                    Đặc Tính Cơ Khí & Dung Sai Lắp Ghép (ISO-52900)
                  </span>
                </div>
                <span className="font-mono text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-bold">
                  ✓ Watertight Mesh 100%
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div className="bg-[#F8FAFC] p-3 rounded-xl border border-[#CBD5E1]">
                  <span className="text-[10px] uppercase text-[#64748B] block mb-0.5">Dung Sai Lắp</span>
                  <span className="font-bold text-[#091426]">±0.05 mm</span>
                </div>
                <div className="bg-[#F8FAFC] p-3 rounded-xl border border-[#CBD5E1]">
                  <span className="text-[10px] uppercase text-[#64748B] block mb-0.5">Khóa Khớp</span>
                  <span className="font-bold text-[#091426]">Snap-Fit 4 Góc</span>
                </div>
                <div className="bg-[#F8FAFC] p-3 rounded-xl border border-[#CBD5E1]">
                  <span className="text-[10px] uppercase text-[#64748B] block mb-0.5">Chân Ren</span>
                  <span className="font-bold text-[#091426]">4x M3 Brass</span>
                </div>
                <div className="bg-[#F8FAFC] p-3 rounded-xl border border-[#CBD5E1]">
                  <span className="text-[10px] uppercase text-[#64748B] block mb-0.5">Tản Nhiệt</span>
                  <span className="font-bold text-[#091426]">Tổ Ong Đối Lưu</span>
                </div>
              </div>

              <p className="text-xs text-[#64748B] leading-relaxed">
                Mô hình được tối ưu hóa biên dạng khuôn và rãnh trượt, đảm bảo lắp vừa vặn bo mạch vi điều khiển Arduino UNO / Mega và đai ốc tiêu chuẩn công nghiệp.
              </p>
            </div>
          </div>

          {/* Right Column: High-Tech Clean Industrial Configurator Panel */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white border border-[#CBD5E1] rounded-2xl p-5 sm:p-6 shadow-xs space-y-6">
              {/* Product Header */}
              <div className="border-b border-[#CBD5E1] pb-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase font-bold text-[#00687A] bg-[#00687A]/10 px-2 py-0.5 rounded">
                    VCUBE STUDIO // PERSONALIZATION
                  </span>
                  <span className="text-[10px] font-mono text-[#64748B]">
                    ★ {currentProduct.rating} ({currentProduct.reviewsCount} kiểm định)
                  </span>
                </div>
                <h1 className="text-xl font-bold text-[#091426] leading-snug">
                  {currentProduct.name}
                </h1>
                <p className="text-xs text-[#64748B]">
                  Thiết kế kỹ thuật bởi <strong className="text-[#091426]">{currentProduct.designer}</strong>
                </p>
              </div>

              {/* 1. Smart Material Selector with Mechanical Properties & Multipliers */}
              <div className="space-y-3">
                <label className="text-xs font-mono uppercase font-bold text-[#091426] flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-[#00687A]">science</span>
                    1. Vật Liệu Chế Tác Chuyên Dụng:
                  </span>
                  <span className="text-[10px] font-mono text-[#00687A] font-bold">
                    Hệ số x{materialMultiplier}
                  </span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {materialPresets.map((mat) => {
                    const isSelected = selectedMaterial.toLowerCase().includes(mat.id.toLowerCase()) || selectedMaterial === mat.name;
                    return (
                      <button
                        key={mat.id}
                        type="button"
                        onClick={() => setSelectedMaterial(mat.id)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                          isSelected
                            ? 'border-[#00687A] bg-[#00687A]/5 ring-2 ring-[#00687A]/30 shadow-2xs'
                            : 'border-[#CBD5E1] bg-[#F8FAFC] hover:border-[#00687A]/60'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`font-mono text-xs font-bold truncate ${isSelected ? 'text-[#00687A]' : 'text-[#091426]'}`}>
                            {mat.name}
                          </span>
                          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                            isSelected ? 'bg-[#00687A] text-white' : 'bg-slate-200 text-slate-700'
                          }`}>
                            x{mat.multiplier}
                          </span>
                        </div>
                        <span className="text-[10px] text-[#64748B] block leading-tight">
                          {mat.strength}
                        </span>
                        <span className="text-[9px] font-mono text-[#00687A] mt-1.5 block font-semibold">
                          {mat.tag}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Color Swatches with Realistic Preview */}
              <div className="space-y-3 pt-4 border-t border-[#CBD5E1]">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-mono uppercase font-bold text-[#091426] flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-[#00687A]">palette</span>
                    2. Sắc Thái Hoàn Thiện:
                  </label>
                  <span className="font-mono text-xs font-bold text-[#00687A]">
                    {selectedColorName}
                  </span>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  {colorOptions.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => {
                        setSelectedColorHex(c.hex);
                        setSelectedColorName(c.name);
                      }}
                      className={`relative w-9 h-9 rounded-full border-2 transition-all cursor-pointer ${
                        selectedColorHex === c.hex
                          ? 'border-[#00687A] scale-110 shadow-md ring-2 ring-[#00687A]/40'
                          : 'border-[#CBD5E1] hover:scale-105'
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.name}
                    >
                      {selectedColorHex === c.hex && (
                        <span className={`material-symbols-outlined text-sm absolute inset-0 flex items-center justify-center font-bold ${
                          c.hex === '#f8f9ff' ? 'text-slate-900' : 'text-white'
                        }`}>
                          check
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Surface Engraving & Personalization Customization Form */}
              <div className="space-y-4 pt-4 border-t border-[#CBD5E1]">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono uppercase font-bold text-[#091426] flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-[#00687A]">edit_note</span>
                    3. Khắc Tên / Số Hiệu / Logo Lên Mặt Vỏ:
                  </label>
                  <span className={`text-[10px] font-mono ${engravingText.length > 20 ? 'text-amber-600 font-bold' : 'text-[#64748B]'}`}>
                    {engravingText.length} / 24 ký tự
                  </span>
                </div>

                {/* Text input */}
                <div>
                  <input
                    type="text"
                    maxLength={24}
                    value={engravingText}
                    onChange={(e) => setEngravingText(e.target.value)}
                    placeholder="VD: VCUBE-LAB-01 hoặc Tên dự án..."
                    className="w-full bg-[#F8FAFC] border border-[#CBD5E1] p-3 text-xs font-mono font-bold rounded-xl focus:outline-none focus:border-[#00687A] text-[#091426]"
                  />
                  {isTextTooLong && (
                    <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-xs text-amber-800">
                      <span className="material-symbols-outlined text-sm text-amber-600 shrink-0">warning</span>
                      <p className="text-[11px] leading-tight">
                        Văn bản dài có thể vượt ra ngoài vùng phẳng nắp hộp. Khuyến nghị giảm cỡ chữ hoặc chọn in Tough Resin 8K để chữ nét nhất.
                      </p>
                    </div>
                  )}
                </div>

                {/* Engraving Depth & Finish Selector */}
                <div>
                  <label className="text-[11px] font-mono uppercase font-bold text-[#64748B] block mb-1.5">
                    Kiểu Hoàn Thiện Bề Mặt:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'embossed', label: 'Đùn Nổi 3D', sub: '+1.2mm', icon: 'layers' },
                      { id: 'laser', label: 'Khắc Laser', sub: 'Carbon Đen', icon: 'flare' },
                      { id: 'recessed', label: 'Khoét Âm', sub: '-0.8mm', icon: 'vertical_align_bottom' }
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setEngravingDepth(mode.id as any)}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                          engravingDepth === mode.id
                            ? 'border-[#00687A] bg-[#00687A]/10 text-[#00687A] font-bold shadow-2xs'
                            : 'border-[#CBD5E1] bg-[#F8FAFC] text-[#64748B] hover:text-[#091426]'
                        }`}
                      >
                        <span className="material-symbols-outlined text-base block mb-0.5">{mode.icon}</span>
                        <span className="font-mono text-[11px] block leading-tight">{mode.label}</span>
                        <span className="font-mono text-[9px] text-[#64748B] block mt-0.5">{mode.sub}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Alignment & Font Selector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-mono uppercase font-bold text-[#64748B] block mb-1">
                      Vị Trí Căn Lề:
                    </label>
                    <select
                      value={engravingPosition}
                      onChange={(e) => setEngravingPosition(e.target.value as any)}
                      className="w-full bg-[#F8FAFC] border border-[#CBD5E1] p-2.5 text-xs font-mono rounded-xl focus:outline-none focus:border-[#00687A] cursor-pointer"
                    >
                      <option value="center">Chính giữa nắp (Center)</option>
                      <option value="top-left">Góc trên bên trái</option>
                      <option value="bottom-right">Góc dưới bên phải</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-mono uppercase font-bold text-[#64748B] block mb-1">
                      Phông Chữ Kỹ Thuật:
                    </label>
                    <select
                      value={selectedFont}
                      onChange={(e) => setSelectedFont(e.target.value)}
                      className="w-full bg-[#F8FAFC] border border-[#CBD5E1] p-2.5 text-xs font-mono rounded-xl focus:outline-none focus:border-[#00687A] cursor-pointer"
                    >
                      <option value="JetBrains Mono">JetBrains Mono (Chuẩn Kỹ Thuật)</option>
                      <option value="Inter">Inter (Hiện Đại)</option>
                      <option value="Roboto Mono">Roboto Mono (Công Nghiệp)</option>
                    </select>
                  </div>
                </div>

                {/* Font Size Slider */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[11px] font-mono uppercase font-bold text-[#64748B]">
                      Cỡ Chữ Bề Mặt:
                    </span>
                    <span className="font-mono text-xs font-bold text-[#00687A]">
                      {fontSizeMm} mm
                    </span>
                  </div>
                  <input
                    type="range"
                    min={6}
                    max={24}
                    value={fontSizeMm}
                    onChange={(e) => setFontSizeMm(Number(e.target.value))}
                    className="w-full accent-[#00687A] cursor-pointer"
                  />
                </div>

                {/* Optional Logo Upload Box */}
                <div>
                  <label className="text-[11px] font-mono uppercase font-bold text-[#64748B] block mb-1.5">
                    Tải Lên File Vector / Logo (.SVG / .DXF / .PNG):
                  </label>
                  {uploadedLogoName ? (
                    <div className="p-3 bg-[#EFF4FF] border border-[#00687A]/30 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="material-symbols-outlined text-[#00687A] text-lg">attachment</span>
                        <div className="min-w-0">
                          <span className="font-mono text-xs font-bold text-[#091426] truncate block">
                            {uploadedLogoName}
                          </span>
                          <span className="text-[10px] font-mono text-[#00687A]">
                            +{(activeConfig.customLogoUploadFee ?? 80000).toLocaleString('vi-VN')} đ (Phí xử lý vector)
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setUploadedLogoName(null)}
                        className="text-xs font-mono text-rose-600 hover:underline ml-2 cursor-pointer shrink-0"
                      >
                        ✕ Xóa file
                      </button>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-[#CBD5E1] hover:border-[#00687A] p-4 rounded-xl text-center cursor-pointer block bg-[#F8FAFC] transition-colors">
                      <span className="material-symbols-outlined text-2xl text-[#64748B]">upload_file</span>
                      <span className="block text-xs font-mono font-bold text-[#091426] mt-1">
                        Kéo thả file vector hoặc nhấp để tải lên
                      </span>
                      <span className="block text-[10px] text-[#64748B] font-mono mt-0.5">
                        Hỗ trợ .SVG, .DXF, .PNG dưới 10MB (+{(activeConfig.customLogoUploadFee ?? 80000).toLocaleString('vi-VN')} đ)
                      </span>
                      <input type="file" accept=".svg,.dxf,.png" onChange={handleLogoUpload} className="sr-only" />
                    </label>
                  )}
                </div>
              </div>

              {/* 4. Lid Explosion Slider with Quick Presets */}
              <div className="space-y-3 pt-4 border-t border-[#CBD5E1]">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-mono uppercase font-bold text-[#091426] flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-[#00687A]">vertical_align_top</span>
                    4. Tách Nắp Hộp (Exploded View):
                  </label>
                  <span className="font-mono text-xs font-bold text-[#00687A]">
                    +{lidExplodeDistance} mm
                  </span>
                </div>

                <input
                  type="range"
                  min={0}
                  max={40}
                  value={lidExplodeDistance}
                  onChange={(e) => setLidExplodeDistance(Number(e.target.value))}
                  className="w-full accent-[#00687A] cursor-pointer"
                />

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Đóng 0mm', value: 0 },
                    { label: 'Mở 50% 20mm', value: 20 },
                    { label: 'Mở Hết 40mm', value: 40 }
                  ].map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setLidExplodeDistance(preset.value)}
                      className={`py-1.5 px-2 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                        lidExplodeDistance === preset.value
                          ? 'bg-[#00687A] text-white shadow-2xs'
                          : 'bg-[#F1F5F9] text-[#64748B] hover:text-[#091426]'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <p className="text-[11px] text-[#64748B] leading-relaxed">
                  Kéo trượt để nâng nắp hộp lên cao, cho phép soi rõ các chấu gắn bo mạch Arduino & cổng USB bên trong.
                </p>
              </div>

              {/* 5. Batch Quantity Selector & Volume Discounts */}
              <div className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#00687A] text-base">layers</span>
                    <span className="font-mono text-xs uppercase font-bold text-[#091426] tracking-wider">
                      Số Lượng Đặt In (Batch Quantity)
                    </span>
                  </div>
                  {volumeDiscountPercent > 0 && (
                    <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-teal-100 text-[#00687A] rounded-full border border-teal-300 animate-pulse">
                      Giảm {volumeDiscountPercent}% Sỉ
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-6 gap-2">
                  {[1, 2, 5, 10, 20, 50].map((qty) => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => setQuantity(qty)}
                      className={`py-2 text-xs font-mono font-bold rounded-xl border transition-all cursor-pointer ${
                        quantity === qty
                          ? 'bg-[#00687A] text-white border-[#00687A] shadow-xs'
                          : 'bg-white text-[#091426] border-[#CBD5E1] hover:border-[#00687A]'
                      }`}
                    >
                      x{qty}
                    </button>
                  ))}
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono text-[#64748B]">
                  <span>Chiết khấu sỉ tự động:</span>
                  <span>5+ (-8%) • 10+ (-15%) • 20+ (-22%)</span>
                </div>
              </div>

              {/* 6. Delivery Packages Selector (Economy, Standard, Express) */}
              <div className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#00687A] text-base">local_shipping</span>
                  <span className="font-mono text-xs uppercase font-bold text-[#091426] tracking-wider">
                    Gói Tiến Độ & Dung Sai QC
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'economy', label: 'Tiết Kiệm', sub: '5-7 ngày', discount: '-10%' },
                    { id: 'standard', label: 'Tiêu Chuẩn', sub: '2-3 ngày', discount: 'Chuẩn' },
                    { id: 'express', label: 'Hỏa Tốc 24H', sub: 'Trong 24h', discount: '+30%' }
                  ].map((pkg) => {
                    const isSelected = selectedPackageTier === pkg.id;
                    return (
                      <button
                        key={pkg.id}
                        type="button"
                        onClick={() => setSelectedPackageTier(pkg.id as any)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-[#00687A] bg-teal-50/50 ring-1 ring-[#00687A]'
                            : 'border-[#CBD5E1] bg-white hover:border-slate-400'
                        }`}
                      >
                        <div className="font-mono text-xs font-bold text-[#091426]">{pkg.label}</div>
                        <div className="text-[10px] font-mono text-[#64748B]">{pkg.sub}</div>
                        <div className={`text-[10px] font-mono font-bold mt-1 ${isSelected ? 'text-[#00687A]' : 'text-slate-500'}`}>
                          {pkg.discount}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 7. CAD Inspector Bridge Banner */}
              <div className="bg-slate-100/80 border border-[#CBD5E1] rounded-2xl p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[#00687A] text-lg">view_in_ar</span>
                  <div>
                    <div className="font-mono text-xs font-bold text-[#091426]">CAD Mesh Inspector 360°</div>
                    <div className="text-[10px] text-[#64748B]">Kiểm tra mặt cắt Stencil từng lớp, đo caliper và kiểm tra khép kín manifold</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('tool_3d')}
                  className="px-3 py-1.5 bg-[#091426] hover:bg-slate-800 text-white font-mono text-[10px] font-bold uppercase rounded-lg transition-all shrink-0 cursor-pointer"
                >
                  Mở CAD Slicer
                </button>
              </div>

              {/* 8. Sticky BOM Cost Summary Card with Transparent Calculation */}
              <div className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center gap-2 border-b border-[#CBD5E1] pb-2.5">
                  <span className="material-symbols-outlined text-[#00687A] text-base">receipt_long</span>
                  <span className="font-mono text-xs uppercase font-bold text-[#091426] tracking-wider">
                    Dự Toán Chi Phí Chi Tiết (BOM Breakdown)
                  </span>
                </div>

                <div className="space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between text-[#64748B]">
                    <span>Giá phôi cơ sở (Base Part):</span>
                    <span className="font-semibold text-[#091426]">{basePrice.toLocaleString('vi-VN')} đ</span>
                  </div>
                  <div className="flex justify-between text-[#64748B]">
                    <span>Vật liệu ({selectedMaterial}):</span>
                    <span className="font-semibold text-[#091426]">
                      x{materialMultiplier} {materialCostDiff > 0 ? `(+${materialCostDiff.toLocaleString('vi-VN')} đ)` : '(Chuẩn)'}
                    </span>
                  </div>
                  <div className="flex justify-between text-[#64748B]">
                    <span>Phí khắc chữ ({engravingDepth}):</span>
                    <span className="font-semibold text-[#091426]">
                      {engravingText.trim() ? `+${engravingFee.toLocaleString('vi-VN')} đ` : '0 đ'}
                    </span>
                  </div>
                  {uploadedLogoName && (
                    <div className="flex justify-between text-[#64748B]">
                      <span>Phí xử lý vector logo:</span>
                      <span className="font-semibold text-[#091426]">+{(activeConfig.customLogoUploadFee ?? 80000).toLocaleString('vi-VN')} đ</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[#64748B]">
                    <span>Số lượng & Tiến độ:</span>
                    <span className="font-semibold text-[#00687A]">
                      {quantity} cái {volumeDiscountPercent > 0 ? `(-${volumeDiscountPercent}%)` : ''} • {selectedPackageTier.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between text-[#64748B]">
                    <span>Đơn giá sau chiết khấu:</span>
                    <span className="font-semibold text-[#091426]">{unitBasePrice.toLocaleString('vi-VN')} đ/cái</span>
                  </div>

                  <div className="pt-2 border-t border-[#CBD5E1] flex justify-between items-baseline">
                    <span className="font-mono text-xs uppercase font-bold text-[#091426]">
                      TỔNG CHI PHÍ GIA CÔNG ({quantity} cái):
                    </span>
                    <span className="font-mono text-2xl font-extrabold text-[#00687A]">
                      {totalCost.toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                </div>

                <div className="pt-2 text-[10px] font-mono text-[#64748B] flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs text-[#00687A]">schedule</span>
                    Xuất xưởng: {selectedPackageTier === 'express' ? '24h hỏa tốc' : selectedPackageTier === 'economy' ? '5-7 ngày' : '48h kiểm định'}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs text-[#00687A]">verified</span>
                    Bảo hành cơ khí 12T
                  </span>
                </div>
              </div>

              {/* 6. High-Tech Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="py-3.5 px-4 border-2 border-[#091426] hover:bg-[#F8FAFC] text-[#091426] font-mono font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-95"
                >
                  <span className="material-symbols-outlined text-base">add_shopping_cart</span>
                  <span>Thêm Vào Giỏ Hàng</span>
                </button>

                <button
                  type="button"
                  onClick={handleOrderNow}
                  className="py-3.5 px-4 bg-[#00687A] hover:bg-[#005260] text-white font-mono font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <span className="material-symbols-outlined text-base">precision_manufacturing</span>
                  <span>Đặt In Ngay</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Order Bar (< lg screens) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#CBD5E1] p-3.5 pb-[calc(0.875rem+env(safe-area-inset-bottom,0px))] shadow-2xl flex items-center justify-between gap-3">
        <div>
          <span className="text-[10px] font-mono text-[#64748B] uppercase block">TỔNG GIA CÔNG:</span>
          <span className="font-mono text-base font-extrabold text-[#00687A]">
            {totalCost.toLocaleString('vi-VN')} đ
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAddToCart}
            className="p-2.5 border border-[#091426] rounded-xl text-[#091426] font-mono text-xs font-bold transition-all cursor-pointer"
            title="Thêm vào giỏ"
          >
            <span className="material-symbols-outlined text-base">add_shopping_cart</span>
          </button>
          <button
            type="button"
            onClick={handleOrderNow}
            className="py-2.5 px-4 bg-[#00687A] text-white rounded-xl font-mono text-xs font-bold uppercase transition-all shadow-md cursor-pointer"
          >
            Đặt In Ngay
          </button>
        </div>
      </div>
    </div>
  );
};
