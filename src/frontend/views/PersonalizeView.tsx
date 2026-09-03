import React, { useState } from 'react';
import { Product, CartItem, MaterialProfile, InkiriCostFormulaConfig } from '../types';
import { MATERIALS_CATALOG, DEFAULT_INKIRI_FORMULA_CONFIG } from '../data/mockData';
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
    features: ['Khắc laser / đùn nổi tùy chỉnh', 'Vật liệu cơ tính cao'],
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

  // Parse dimensions
  const parsedDimensions = { x: 120.0, y: 85.5, z: 45.2 };

  // Calculate live price dynamically from Admin Config:
  const basePrice = currentProduct.pricePhysical || 450000;
  const matchingMaterial = materialsList.find(m => 
    selectedMaterial.toLowerCase().includes(m.name.toLowerCase()) || 
    m.name.toLowerCase().includes(selectedMaterial.toLowerCase()) ||
    selectedMaterial.toLowerCase().includes(m.id.toLowerCase())
  );
  const materialMultiplier = matchingMaterial?.unitPriceMultiplier || 1.0;
  const engravingFee = activeConfig.customEngravingFee ?? 50000;
  const logoFee = activeConfig.customLogoUploadFee ?? 80000;
  const customFee = (engravingText.trim() ? engravingFee : 0) + (uploadedLogoName ? logoFee : 0);
  const totalCost = Math.round(basePrice * materialMultiplier + customFee);

  const isTextTooLong = engravingText.length > 20 || (fontSizeMm > 18 && engravingText.length > 12);

  const handleAddToCart = () => {
    const item: CartItem = {
      id: `custom-cart-${Date.now()}`,
      productId: currentProduct.id,
      type: 'physical',
      name: `${currentProduct.name} [Khắc: ${engravingText || 'Không'}]`,
      designer: currentProduct.designer,
      image: currentProduct.images[0],
      price: totalCost,
      quantity: 1,
      material: selectedMaterial,
      color: selectedColorName,
      colorHex: selectedColorHex,
      customText: engravingText.trim() || undefined,
      customFont: selectedFont,
      customFontSize: fontSizeMm,
      uploadedLogoName: uploadedLogoName || undefined
    };

    onAddToCart(item);
    onShowToast('Đã thêm sản phẩm cá nhân hóa vào giỏ hàng!');
    onNavigate('cart');
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedLogoName(e.target.files[0].name);
      onShowToast(`Đã nhận file logo: ${e.target.files[0].name}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FF] text-[#0B1C30] font-sans flex flex-col">
      {/* Top Header Navigation Strip */}
      <div className="bg-white border-b border-[#C5C6CD] py-3 px-4 sm:px-6 md:px-12 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('explore')}
            className="text-xs text-[#545F73] hover:text-[#00687A] font-bold flex items-center gap-1 transition-colors touch-target-btn cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Trở lại Catalog
          </button>
          <span className="text-[#C5C6CD]">|</span>
          <span className="font-bold text-xs uppercase tracking-wider text-[#091426] flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm text-[#00687A]">precision_manufacturing</span>
            Bộ Công Cụ Cá Nhân Hóa Kỹ Thuật (Part Configurator)
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('quote')}
            className="hidden sm:flex items-center gap-1.5 text-xs text-[#00687A] hover:underline font-tech font-bold"
          >
            <span className="material-symbols-outlined text-sm">tune</span>
            Chuyển sang Báo Giá /Quote
          </button>
          <span className="font-tech text-[11px] text-[#00687A] font-bold bg-[#EFF4FF] px-2.5 py-1 rounded border border-[#C5C6CD]">
            SKU: {currentProduct.sku || 'IND-BRK-009A'}
          </span>
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-64px)] overflow-hidden">
        {/* Left Column: 3D Interactive Viewport with Realtime 3D Engine (Harmonized with /quote) */}
        <section className="flex-1 relative bg-[#070f1e] flex flex-col min-h-[420px] lg:min-h-full">
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
            dimensions={parsedDimensions}
            className="w-full h-full"
          />
        </section>

        {/* Right Column: Configuration & Parameters Sidebar */}
        <aside className="w-full lg:w-[490px] bg-white flex flex-col h-full overflow-y-auto border-l border-[#C5C6CD] shadow-lg z-20">
          <div className="p-5 sm:p-6 border-b border-[#C5C6CD] bg-[#F8FAFC]">
            <span className="text-[10px] font-tech uppercase tracking-widest text-[#00687A] font-bold block mb-1">
              CUSTOM ENGINEERING CONFIGURATOR
            </span>
            <h1 className="text-lg sm:text-xl font-bold text-[#091426] leading-tight">{currentProduct.name}</h1>
            <div className="flex items-center justify-between mt-2">
              <p className="font-tech text-xs text-[#545F73]">
                Thiết kế bởi <strong className="text-[#091426]">{currentProduct.designer}</strong>
              </p>
              <span className="font-tech text-xs text-[#00687A] font-bold">
                ★ {currentProduct.rating} ({currentProduct.reviewsCount} đánh giá)
              </span>
            </div>
          </div>

          <div className="flex-1 p-5 sm:p-6 space-y-6">
            {/* Group 1: Material & Color */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#091426] border-b border-[#C5C6CD] pb-1.5 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-[#00687A]">science</span>
                1. Thông Số Vật Liệu & Màu Sắc
              </h2>

              <div>
                <label className="text-[10px] uppercase font-bold text-[#545F73] block mb-1">Vật Liệu Chế Tác:</label>
                <select
                  value={selectedMaterial}
                  onChange={(e) => setSelectedMaterial(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#CBD5E1] p-2.5 text-xs rounded-lg focus:outline-none focus:border-[#00687A] text-[#091426] font-semibold cursor-pointer"
                >
                  <option value="PLA Pro (Standard)">PLA Pro (Chuẩn cơ khí tiêu chuẩn, giá tối ưu)</option>
                  <option value="PETG Technical Pro">PETG Technical Pro (Chống va đập, chịu nhiệt 75°C)</option>
                  <option value="Tough Resin (High Detail)">Tough Resin 8K (Bề mặt siêu mịn, dung sai ±0.05mm)</option>
                  <option value="ABS Industrial">ABS Industrial Grade (Chịu nhiệt 95°C, chống ăn mòn)</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[10px] uppercase font-bold text-[#545F73]">Màu Sắc Lớp Vỏ 3D:</label>
                  <span className="font-tech text-[11px] font-bold text-[#00687A]">{selectedColorName}</span>
                </div>
                <div className="flex items-center gap-3">
                  {[
                    { name: 'Xanh Teal Tooling', hex: '#00687a' },
                    { name: 'Đen Carbon', hex: '#0f172a' },
                    { name: 'Xám Titan', hex: '#64748b' },
                    { name: 'Cam Cảnh Báo', hex: '#ea580c' },
                    { name: 'Trắng Sứ Mịn', hex: '#f8f9ff' }
                  ].map(c => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => { setSelectedColorHex(c.hex); setSelectedColorName(c.name); }}
                      className={`w-9 h-9 rounded-full border-2 transition-all relative cursor-pointer ${
                        selectedColorHex === c.hex ? 'border-[#00687A] scale-110 shadow-md ring-2 ring-[#00687A]/30' : 'border-[#CBD5E1]'
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.name}
                    >
                      {selectedColorHex === c.hex && (
                        <span className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${
                          c.hex === '#f8f9ff' ? 'text-black' : 'text-white'
                        } drop-shadow`}>✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Group 2: Surface Engraving & Text */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#091426] border-b border-[#C5C6CD] pb-1.5 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-[#00687A]">edit_note</span>
                2. Khắc Chữ & Định Danh Lên Mặt 3D
              </h2>

              <div>
                <label className="text-[10px] uppercase font-bold text-[#545F73] block mb-1">
                  Nội Dung Khắc (Serial / Tên Thiết Bị / Lab):
                </label>
                <input
                  type="text"
                  value={engravingText}
                  onChange={(e) => setEngravingText(e.target.value)}
                  placeholder="Nhập mã định danh (VD: VCUBE-IOT-01)"
                  className="w-full bg-[#F8FAFC] border border-[#CBD5E1] p-2.5 text-xs font-tech font-bold rounded-lg focus:outline-none focus:border-[#00687A] text-[#091426]"
                />
              </div>

              {/* Engraving Technique & Alignment */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-[#545F73] block mb-1">Kiểu Hoàn Thiện:</label>
                  <select
                    value={engravingDepth}
                    onChange={(e) => setEngravingDepth(e.target.value as any)}
                    className="w-full bg-[#F8FAFC] border border-[#CBD5E1] p-2 text-xs rounded-lg focus:outline-none focus:border-[#00687A] cursor-pointer"
                  >
                    <option value="embossed">Đùn nổi 3D (Raised 1.2mm)</option>
                    <option value="laser">Khắc laser đen (Laser Dark)</option>
                    <option value="recessed">Khoét âm (Pocket 0.8mm)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-[#545F73] block mb-1">Vị Trí Căn Chỉnh:</label>
                  <select
                    value={engravingPosition}
                    onChange={(e) => setEngravingPosition(e.target.value as any)}
                    className="w-full bg-[#F8FAFC] border border-[#CBD5E1] p-2 text-xs rounded-lg focus:outline-none focus:border-[#00687A] cursor-pointer"
                  >
                    <option value="center">Chính giữa nắp (Center)</option>
                    <option value="top-left">Góc trên bên trái</option>
                    <option value="bottom-right">Góc dưới bên phải</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-[#545F73] block mb-1">Phông Chữ Kỹ Thuật:</label>
                  <select
                    value={selectedFont}
                    onChange={(e) => setSelectedFont(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-[#CBD5E1] p-2 text-xs rounded-lg focus:outline-none focus:border-[#00687A] cursor-pointer"
                  >
                    <option value="JetBrains Mono">JetBrains Mono (Kỹ thuật)</option>
                    <option value="Inter">Inter (Hiện đại)</option>
                    <option value="Roboto Mono">Roboto Mono (Công nghiệp)</option>
                  </select>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] uppercase font-bold text-[#545F73]">Cỡ Chữ (mm):</label>
                    <span className="font-tech text-xs font-bold text-[#00687A]">{fontSizeMm} mm</span>
                  </div>
                  <input
                    type="range"
                    min={6}
                    max={24}
                    value={fontSizeMm}
                    onChange={(e) => setFontSizeMm(Number(e.target.value))}
                    className="w-full accent-[#00687A] mt-1 cursor-pointer"
                  />
                </div>
              </div>

              {isTextTooLong && (
                <div className="p-3 bg-[#FFFBEB] border border-[#FEF08A] rounded-lg flex items-start gap-2 text-xs text-[#92400E]">
                  <span className="material-symbols-outlined text-base text-[#B45309]">warning</span>
                  <p>Kích thước chữ hoặc độ dài văn bản có thể vượt quá vùng phẳng in tối ưu. Khuyến nghị giảm cỡ chữ hoặc chọn in bằng Resin 8K.</p>
                </div>
              )}

              {/* Logo / SVG Upload */}
              <div>
                <label className="text-[10px] uppercase font-bold text-[#545F73] block mb-1">Tải Lên Logo / Vector (.SVG / .DXF / .PNG):</label>
                <label className="border-2 border-dashed border-[#CBD5E1] hover:border-[#00687A] p-4 rounded-xl text-center cursor-pointer block bg-[#F8FAFC] transition-colors">
                  <span className="material-symbols-outlined text-2xl text-[#545F73]">upload_file</span>
                  <span className="block text-xs font-semibold text-[#091426] mt-1">
                    {uploadedLogoName ? `Đã chọn: ${uploadedLogoName}` : 'Kéo thả file vector hoặc nhấp để duyệt file'}
                  </span>
                  <span className="block text-[10px] text-[#75777D] font-tech mt-0.5">Hỗ trợ .SVG, .DXF dưới 10MB</span>
                  <input type="file" accept=".svg,.dxf,.png" onChange={handleLogoUpload} className="sr-only" />
                </label>
              </div>

              {/* Exploded View Lid Slider Control */}
              <div className="p-3 bg-[#EFF4FF] border border-[#CBD5E1] rounded-xl space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-tech uppercase font-bold text-[#00687A] flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">vertical_align_top</span>
                    Mở Nắp Hộp (Exploded View):
                  </span>
                  <span className="font-tech text-xs font-bold text-[#091426]">
                    +{lidExplodeDistance} mm
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={35}
                  value={lidExplodeDistance}
                  onChange={(e) => setLidExplodeDistance(Number(e.target.value))}
                  className="w-full accent-[#00687A] cursor-pointer"
                />
                <span className="text-[9px] text-[#545F73] block">
                  Kéo trượt để nâng nắp hộp lên cao, cho phép soi rõ các chấu gắn bo mạch Arduino & cổng USB bên trong.
                </span>
              </div>
            </div>
          </div>

          {/* Sticky Summary & CTA Footer */}
          <div className="mt-auto bg-white border-t border-[#C5C6CD] p-5 space-y-3 sticky bottom-0 shadow-lg">
            <div className="flex justify-between items-baseline">
              <div>
                <span className="text-[10px] font-tech text-[#545F73] uppercase block">THỜI GIAN GIA CÔNG:</span>
                <span className="text-xs font-bold text-[#091426] flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm text-[#00687A]">schedule</span>
                  48 Giờ (Xuất xưởng kiểm định)
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-tech text-[#545F73] uppercase block">TỔNG CHI PHÍ HOÀN THIỆN:</span>
                <span className="text-xl font-bold font-tech text-[#00687A]">
                  {totalCost.toLocaleString('vi-VN')} đ
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  onShowToast('Đã lưu cấu hình cá nhân hóa vào bộ sưu tập của bạn!');
                }}
                className="py-3 border border-[#091426] text-[#091426] hover:bg-[#F8FAFC] text-xs font-bold uppercase rounded-lg transition-colors touch-target-btn cursor-pointer"
              >
                Lưu Cấu Hình
              </button>

              <button
                onClick={handleAddToCart}
                className="py-3 bg-[#00687A] hover:bg-[#004E5C] text-white text-xs font-bold uppercase rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm touch-target-btn cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">shopping_cart</span>
                Thêm Vào Giỏ Hàng
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
