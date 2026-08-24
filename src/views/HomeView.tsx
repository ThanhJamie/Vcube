import React, { useState, useMemo } from 'react';
import { Product } from '../types';
import { CATEGORIES, POPULAR_TAGS, MATERIALS_CATALOG } from '../data/mockData';
import { ThreeModelViewer } from '../components/ThreeModelViewer';
import { useLanguage } from '../context/LanguageContext';

interface HomeViewProps {
  products: Product[];
  onNavigate: (screen: string, payload?: any) => void;
  onSelectProduct: (product: Product) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  products,
  onNavigate,
  onSelectProduct
}) => {
  const { language, t } = useLanguage();
  const isVi = language === 'vi';

  // Active Model in Hero
  const [heroModel, setHeroModel] = useState<'gear' | 'drone' | 'box'>('gear');

  // Active Tag on Landing Page Showcase
  const [selectedTag, setSelectedTag] = useState<string>('all');

  // Quick Calculator State
  const [calcMaterialId, setCalcMaterialId] = useState<string>('pla-tough');
  const [calcInfill, setCalcInfill] = useState<number>(30);
  const [calcPartSize, setCalcPartSize] = useState<'small' | 'medium' | 'large'>('medium');

  // Filter products based on selected tag
  const displayedProducts = useMemo(() => {
    if (selectedTag === 'all') {
      return products.slice(0, 6);
    }
    const filtered = products.filter((p) => {
      const q = selectedTag.toLowerCase();
      if (q === '2/9') {
        return p.tags.some(t => t.includes('2/9') || t.toLowerCase().includes('đại lễ') || t.toLowerCase().includes('quốc khánh'));
      }
      if (q === 'mechanical') {
        return p.category === 'mechanical' || p.tags.some(t => t.toLowerCase().includes('cơ khí') || t.toLowerCase().includes('mechanical') || t.toLowerCase().includes('gears'));
      }
      if (q === 'iot') {
        return p.category === 'iot' || p.tags.some(t => t.toLowerCase().includes('iot') || t.toLowerCase().includes('arduino') || t.toLowerCase().includes('esp32'));
      }
      if (q === 'robotics') {
        return p.tags.some(t => t.toLowerCase().includes('robot') || t.toLowerCase().includes('nema') || t.toLowerCase().includes('drone'));
      }
      if (q === 'snap-fit') {
        return p.tags.some(t => t.toLowerCase().includes('snap-fit') || p.features.some(f => f.toLowerCase().includes('snap-fit')));
      }
      if (q === 'resin-8k') {
        return p.supportedMaterials.some(m => m.toLowerCase().includes('resin')) || p.tags.some(t => t.toLowerCase().includes('resin'));
      }
      if (q === 'decor') {
        return p.category === 'tabletop' || p.tags.some(t => t.toLowerCase().includes('decor') || t.toLowerCase().includes('parametric') || t.toLowerCase().includes('vase'));
      }
      if (q === 'bán-chạy') {
        return (p.salesCount && p.salesCount > 100) || p.badge === 'BÁN CHẠY' || p.tags.some(t => t.toLowerCase().includes('bán chạy'));
      }
      return p.tags.some(t => t.toLowerCase().includes(q));
    });
    return filtered.length > 0 ? filtered : products.slice(0, 4);
  }, [products, selectedTag]);

  // Fast calculations for simulator
  const activeMaterial = MATERIALS_CATALOG.find(m => m.id === calcMaterialId) || MATERIALS_CATALOG[0];
  const baseWeight = calcPartSize === 'small' ? 35 : calcPartSize === 'medium' ? 85 : 190;
  const estimatedGrams = Math.round(baseWeight * (0.5 + (calcInfill / 100) * 0.7) * (activeMaterial.density / 1.24));
  const estimatedPrice = Math.round(estimatedGrams * activeMaterial.pricePerGram * activeMaterial.unitPriceMultiplier + 45000);
  const estimatedHours = ((estimatedGrams / 35) + 0.8).toFixed(1);

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F6F2] text-[#1C1C1C]">
      {/* 1. Special 2/9 Event Campaign Banner */}
      <section className="bg-gradient-to-r from-[#990000] via-[#C00000] to-[#800000] text-white py-3 sm:py-4 px-4 sm:px-6 md:px-12 border-b border-black/20 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-center md:text-left">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
            <span className="bg-[#FFD700] text-[#990000] text-[10px] font-tech font-extrabold uppercase px-2.5 py-0.5 rounded shadow-xs tracking-wider shrink-0 flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">celebration</span>
              {t('campaign29Badge', '🇻🇳 ĐẠI LỄ QUỐC KHÁNH 2/9', '🇻🇳 NATIONAL DAY 2/9')}
            </span>
            <p className="text-xs sm:text-sm font-sans font-medium text-white/95 leading-snug">
              {isVi 
                ? 'Giảm 20% toàn bộ file thiết kế CAD & Miễn phí đo kiểm dung sai ±0.05mm cho các linh kiện gắn tag #2/9.'
                : '20% OFF all CAD engineering files & Free ±0.05mm metrology validation for items tagged #2/9.'}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                onNavigate('explore', { search: '2/9', tag: '2/9' });
              }}
              className="px-4 py-1.5 bg-[#FFD700] hover:bg-[#FFE44D] text-[#990000] font-sans font-bold text-[11px] uppercase tracking-wider rounded transition-all shadow-sm flex items-center gap-1.5 cursor-pointer touch-target-btn"
            >
              <span>{t('explore29TagBtn', 'Xem Sản Phẩm Tag 2/9', 'Browse 2/9 Tag Models')}</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. Hero Section with Interactive 3D Model Switcher */}
      <section className="relative overflow-hidden py-8 sm:py-12 lg:py-16 border-b border-black/10 px-4 sm:px-6 md:px-12 bg-[#F7F6F2]">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Content Column */}
            <div className="lg:col-span-7 flex flex-col justify-center">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-white border border-black/10 rounded-xs text-[10px] uppercase font-tech tracking-[0.2em] text-[#00687A] font-bold mb-4 w-fit shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00687A] animate-pulse"></span>
                <span>VCUBE PRECISION ANTHOLOGY // 2026</span>
              </div>

              <h1 className="fluid-hero-heading mb-4 text-[#1C1C1C] leading-[1.08] tracking-tight">
                {isVi ? (
                  <>
                    CHẾ TÁC CƠ KHÍ<br />
                    <span className="text-[#00687A]">IN 3D CHÍNH XÁC</span>
                  </>
                ) : (
                  <>
                    INDUSTRIAL<br />
                    <span className="text-[#00687A]">3D FABRICATION</span>
                  </>
                )}
              </h1>

              <div className="flex gap-4 sm:gap-6 items-start max-w-xl">
                <div className="w-8 sm:w-12 h-[2px] bg-[#00687A] mt-2.5 sm:mt-3 flex-shrink-0"></div>
                <p className="text-sm sm:text-base lg:text-lg leading-relaxed text-[#1C1C1C]/80 font-serif">
                  {t('heroDescription', 
                    'Nền tảng sản xuất bồi đắp linh kiện cơ khí, vỏ hộp IoT và khuôn mẫu kỹ thuật số. Kiểm tra hình học mesh tự động, nhận báo giá tức thì trong 3 giây với dung sai đo kiểm dưới ±0.05mm.',
                    'Additive manufacturing for mechanical components, IoT enclosures, and digital tooling. Automated mesh inspection and instant quoting in 3 seconds with tolerance under ±0.05mm.'
                  )}
                </p>
              </div>

              {/* Main CTAs */}
              <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 items-stretch sm:items-center">
                <button
                  onClick={() => onNavigate('tool_3d')}
                  className="bg-[#00687A] hover:bg-[#005463] text-white px-6 sm:px-8 py-3.5 sm:py-4 font-sans text-xs uppercase tracking-widest font-bold transition-all shadow-md flex items-center justify-center gap-2 touch-target-btn cursor-pointer rounded"
                >
                  <span className="material-symbols-outlined text-base">upload_file</span>
                  {t('btnInstantQuote', 'Báo Giá File 3D Tức Thì', 'Instant 3D File Quote')}
                </button>

                <button
                  onClick={() => onNavigate('explore')}
                  className="bg-white border border-black/20 hover:border-black/40 hover:bg-[#F1F5F9] px-6 sm:px-8 py-3.5 sm:py-4 font-sans text-xs uppercase tracking-widest font-bold transition-colors text-[#1C1C1C] flex items-center justify-center gap-2 touch-target-btn cursor-pointer rounded"
                >
                  <span className="material-symbols-outlined text-base">storefront</span>
                  {t('btnExploreCatalog', 'Khám Phá Kho Mẫu CAD', 'Browse CAD Catalog')}
                </button>
              </div>

              {/* Editorial Metadata Strip */}
              <div className="grid grid-cols-3 gap-2 sm:gap-6 pt-6 sm:pt-8 mt-6 sm:mt-8 border-t border-black/10 font-sans text-[10px] uppercase tracking-wider text-[#7D7565]">
                <div className="bg-white/70 p-2.5 rounded border border-black/5">
                  <span className="block opacity-70 text-[9px] mb-0.5">{t('statTolerance', 'Dung Sai', 'Tolerance')}</span>
                  <span className="font-tech text-xs sm:text-sm font-bold text-[#00687A]">{t('statToleranceVal', '±0.05 MM', '±0.05 MM')}</span>
                </div>
                <div className="bg-white/70 p-2.5 rounded border border-black/5">
                  <span className="block opacity-70 text-[9px] mb-0.5">{t('statLeadTime', 'Thời Gian Giao', 'Lead Time')}</span>
                  <span className="font-tech text-xs sm:text-sm font-bold text-[#1C1C1C]">{t('statLeadTimeVal', 'GIAO HÀNG 24H', '24H DISPATCH')}</span>
                </div>
                <div className="bg-white/70 p-2.5 rounded border border-black/5">
                  <span className="block opacity-70 text-[9px] mb-0.5">{t('statStandard', 'Tiêu Chuẩn', 'Standard')}</span>
                  <span className="font-tech text-xs sm:text-sm font-bold text-[#1C1C1C]">{t('statStandardVal', 'ISO/ASTM 52900', 'ISO/ASTM 52900')}</span>
                </div>
              </div>
            </div>

            {/* Right: Interactive 3D Showcase with Switcher */}
            <div className="lg:col-span-5 relative flex flex-col items-center justify-center pt-2 lg:pt-0">
              {/* Main 3D Canvas Box */}
              <div className="w-full responsive-aspect-hero bg-[#091426] shadow-2xl relative flex flex-col justify-between p-4 overflow-hidden rounded-md border border-white/10">
                {/* Top header on 3D Box */}
                <div className="w-full flex items-center justify-between z-10 text-white/70 font-sans text-[10px] uppercase tracking-wider">
                  <span className="font-tech text-[#57DFFE] font-bold">PLATE // 01</span>
                  <div className="flex items-center gap-1 bg-black/40 p-1 rounded">
                    <button
                      onClick={() => setHeroModel('gear')}
                      className={`px-2 py-0.5 text-[9px] rounded font-tech font-bold transition-all ${
                        heroModel === 'gear' ? 'bg-[#00687A] text-white' : 'text-white/60 hover:text-white'
                      }`}
                    >
                      Gear
                    </button>
                    <button
                      onClick={() => setHeroModel('drone')}
                      className={`px-2 py-0.5 text-[9px] rounded font-tech font-bold transition-all ${
                        heroModel === 'drone' ? 'bg-[#00687A] text-white' : 'text-white/60 hover:text-white'
                      }`}
                    >
                      Drone
                    </button>
                    <button
                      onClick={() => setHeroModel('box')}
                      className={`px-2 py-0.5 text-[9px] rounded font-tech font-bold transition-all ${
                        heroModel === 'box' ? 'bg-[#00687A] text-white' : 'text-white/60 hover:text-white'
                      }`}
                    >
                      IoT Case
                    </button>
                  </div>
                </div>

                {/* 3D Canvas Viewer */}
                <div className="flex-1 w-full h-full relative my-2 min-h-[240px]">
                  <ThreeModelViewer
                    modelType={heroModel}
                    color={heroModel === 'gear' ? '#00687a' : heroModel === 'drone' ? '#38bdf8' : '#e2e8f0'}
                    className="h-full w-full"
                  />
                </div>

                {/* Bottom Footer on 3D Box */}
                <div className="w-full flex items-end justify-between z-10 pt-2 border-t border-white/10">
                  <span className="font-tech text-[10px] text-[#57DFFE] flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs animate-spin">360</span>
                    360° INTERACTIVE MESH
                  </span>
                  <div className="text-right">
                    <span className="block font-sans text-[8px] text-white/50 uppercase tracking-widest">Facility</span>
                    <span className="block text-white text-xs font-serif italic">Hoa Lac Hi-Tech Farm, Hanoi</span>
                  </div>
                </div>
              </div>

              {/* Floating Metrology QC Note */}
              <div className="hidden sm:flex absolute -bottom-5 -left-4 bg-white p-3.5 shadow-xl border border-black/10 max-w-[260px] z-20 rounded gap-3 items-center">
                <div className="w-8 h-8 rounded-full bg-[#E5EEFF] text-[#00687A] flex items-center justify-center font-bold shrink-0">
                  <span className="material-symbols-outlined text-base">verified</span>
                </div>
                <div>
                  <span className="font-sans text-[9px] uppercase tracking-widest text-[#7D7565] block font-bold">
                    {isVi ? 'Kiểm định quang học' : 'Optical Metrology'}
                  </span>
                  <p className="text-[11px] leading-tight font-serif text-[#1C1C1C]">
                    {isVi ? 'Dung sai ±0.05mm xác thực bởi thước Mitutoyo' : '±0.05mm validated by Mitutoyo calibrated gauges'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Interactive Tag Filter Bar & Campaign Pill Matrix */}
      <section className="py-6 bg-white border-b border-black/10 px-4 sm:px-6 md:px-12 sticky top-[61px] z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-lg text-[#00687A]">sell</span>
              <span className="font-sans text-xs uppercase tracking-wider font-bold text-[#1C1C1C]">
                {t('filterByTag', 'Lọc nhanh theo Tag:', 'Filter by Tag:')}
              </span>
            </div>

            {/* Horizontal Scrollable Tag Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {POPULAR_TAGS.map((tag) => {
                const isActive = selectedTag === tag.id;
                const is29 = tag.id === '2/9';

                return (
                  <button
                    key={tag.id}
                    onClick={() => setSelectedTag(tag.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-sans whitespace-nowrap shrink-0 transition-all flex items-center gap-1.5 cursor-pointer touch-target-btn ${
                      isActive
                        ? is29
                          ? 'bg-[#990000] text-white font-extrabold shadow-sm'
                          : 'bg-[#00687A] text-white font-bold shadow-sm'
                        : is29
                        ? 'bg-red-50 text-[#990000] border border-red-200 hover:bg-red-100 font-bold'
                        : 'bg-[#F7F6F2] text-[#545F73] border border-black/10 hover:border-black/30 hover:text-[#1C1C1C]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-xs">{tag.icon}</span>
                    <span>{isVi ? tag.nameVi : tag.nameEn}</span>
                    {is29 && (
                      <span className="bg-[#FFD700] text-[#990000] text-[8px] font-bold px-1 rounded-full uppercase">
                        HOT
                      </span>
                    )}
                  </button>
                );
              })}

              <button
                onClick={() => onNavigate('explore')}
                className="px-3 py-1.5 text-xs text-[#00687A] hover:underline whitespace-nowrap font-bold shrink-0 flex items-center gap-0.5"
              >
                <span>{isVi ? 'Xem tất cả' : 'All'}</span>
                <span className="material-symbols-outlined text-xs">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Curated Works Grid based on Selected Tag */}
      <section className="py-10 sm:py-16 bg-[#FFFFFF] border-b border-black/10 px-4 sm:px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 sm:mb-8 pb-4 border-b border-black/10 gap-3">
            <div>
              <span className="font-sans text-[9px] sm:text-[10px] uppercase tracking-[0.25em] text-[#A69C8A] block mb-1">
                {t('sectionCuratedPre', 'Curated Works // Tuyển Tập', 'Curated Works // Selection')}
              </span>
              <h2 className="fluid-h2 text-[#1C1C1C] flex items-center gap-2">
                {selectedTag === '2/9' ? (
                  <span className="text-[#990000] flex items-center gap-2">
                    <span className="material-symbols-outlined text-2xl">celebration</span>
                    {isVi ? 'Tuyển Tập Ưu Đãi Đại Lễ 2/9' : 'Special National Day 2/9 Collection'}
                  </span>
                ) : (
                  t('sectionCuratedTitle', 'Sản Phẩm & Bản Vẽ Tiêu Biểu', 'Featured Mechanical & CAD Models')
                )}
              </h2>
              <p className="text-xs text-[#7D7565] mt-1 font-serif">
                {selectedTag === '2/9'
                  ? (isVi ? 'Các linh kiện đạt chuẩn công nghiệp được hưởng ưu đãi giảm giá và miễn phí vận chuyển trong tuần lễ 2/9.' : 'Industrial certified parts eligible for discounts and free shipping during the 2/9 campaign.')
                  : (isVi ? `Hiển thị các bản vẽ cơ khí chất lượng cao thuộc danh mục được chọn.` : `Showing top verified engineering designs in selected category.`)}
              </p>
            </div>

            <button
              onClick={() => onNavigate('explore', { tag: selectedTag !== 'all' ? selectedTag : undefined })}
              className="font-sans text-xs uppercase tracking-widest text-[#00687A] hover:underline font-bold flex items-center gap-1.5 self-start sm:self-auto touch-target-btn"
            >
              <span>{isVi ? `Xem kho bản vẽ đầy đủ (${products.length * 20}+)` : `Browse full catalog (${products.length * 20}+)`}</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {displayedProducts.map((product) => (
              <div
                key={product.id}
                className="bg-[#F8FAFC] border border-black/10 hover:border-[#00687A] transition-all flex flex-col group p-4 rounded shadow-2xs hover:shadow-md"
              >
                {/* Product Image Frame */}
                <div
                  className="responsive-aspect-frame cursor-pointer mb-4 rounded overflow-hidden relative"
                  onClick={() => {
                    onSelectProduct(product);
                    onNavigate('product_detail', { product });
                  }}
                >
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="responsive-img-cover group-hover:scale-105 transition-transform duration-300 opacity-95"
                  />
                  {product.badge && (
                    <span className={`absolute top-2 left-2 text-[9px] font-sans uppercase tracking-widest px-2 py-0.5 rounded font-bold ${
                      product.badge.includes('2/9') 
                        ? 'bg-[#990000] text-[#FFD700] shadow-sm'
                        : 'bg-[#091426] text-white'
                    }`}>
                      {product.badge}
                    </span>
                  )}
                  <span className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-xs text-[#1C1C1C] text-[9px] font-tech px-2 py-0.5 rounded font-bold">
                    {product.printTime}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-[11px] text-[#7D7565] mb-1.5 font-sans">
                      <span className="uppercase tracking-wider truncate font-semibold">{product.designer}</span>
                      <span className="font-tech text-xs text-[#00687A] font-bold">★ {product.rating}</span>
                    </div>

                    <h3
                      onClick={() => {
                        onSelectProduct(product);
                        onNavigate('product_detail', { product });
                      }}
                      className="font-serif font-bold text-base text-[#1C1C1C] hover:text-[#00687A] transition-colors cursor-pointer line-clamp-2"
                    >
                      {product.name}
                    </h3>

                    {/* Tag chips on product card */}
                    <div className="flex flex-wrap gap-1 mt-2.5 mb-1">
                      {product.tags.slice(0, 3).map((tg) => (
                        <button
                          key={tg}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTag(tg);
                          }}
                          className={`text-[9px] font-tech uppercase px-1.5 py-0.5 rounded border transition-colors ${
                            tg.includes('2/9') 
                              ? 'bg-red-50 text-[#990000] border-red-200 font-bold'
                              : 'bg-white text-[#545F73] border-black/10 hover:border-black/30'
                          }`}
                        >
                          #{tg}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3.5 border-t border-black/10 mt-3.5">
                    <div className="flex items-baseline justify-between mb-3.5 font-sans">
                      <div>
                        <span className="text-[9px] text-[#7D7565] uppercase tracking-wider block font-medium">
                          {t('physicalModel', 'Bản In Vật Lý', 'Physical Model')}
                        </span>
                        <span className="font-tech font-bold text-sm text-[#00687A]">
                          {product.pricePhysical.toLocaleString(isVi ? 'vi-VN' : 'en-US')} đ
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] text-[#7D7565] uppercase tracking-wider block font-medium">
                          {t('digitalAsset', 'File Số (STL)', 'Digital Asset')}
                        </span>
                        <span className="font-tech text-xs text-[#545F73] font-semibold">
                          {product.priceDigital.toLocaleString(isVi ? 'vi-VN' : 'en-US')} đ
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          onSelectProduct(product);
                          onNavigate('product_detail', { product });
                        }}
                        className="flex-1 py-2.5 bg-[#00687A] hover:bg-[#005463] text-white text-[10px] font-sans uppercase tracking-widest font-bold transition-colors flex items-center justify-center gap-1.5 touch-target-btn rounded cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm">visibility</span>
                        {t('details3D', 'Inspect 3D', 'Inspect 3D')}
                      </button>

                      {product.isCustomizable && (
                        <button
                          onClick={() => {
                            onSelectProduct(product);
                            onNavigate('personalize', { product });
                          }}
                          className="px-3 py-2.5 bg-white border border-black/20 hover:bg-black/5 text-[#1C1C1C] text-[10px] font-sans uppercase tracking-widest transition-colors rounded"
                          title={isVi ? 'Khắc tên / Tùy biến' : 'Customizer'}
                        >
                          <span className="material-symbols-outlined text-sm">tune</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Live 3D Quoting Cost Simulator Widget */}
      <section className="py-12 sm:py-16 bg-[#091426] text-white border-b border-black/20 px-4 sm:px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left: Info & Values */}
            <div className="lg:col-span-5 space-y-4">
              <span className="font-tech text-[10px] uppercase tracking-[0.25em] text-[#57DFFE] font-bold block">
                VCUBE FAST ESTIMATOR // LIVE QUOTE
              </span>
              <h2 className="fluid-h2 text-white">
                {t('calcTitle', 'Mô Phỏng & Ước Tính Chi Phí In 3D Trực Tiếp', 'Live 3D Print Cost Simulator')}
              </h2>
              <p className="text-xs sm:text-sm text-[#BCC7DE] font-serif leading-relaxed">
                {t('calcSubtitle', 
                  'Chọn vật liệu kỹ thuật, độ đặc infill và kích cỡ mẫu để mô phỏng tức thì chi phí gia công theo bảng giá xưởng VCUBE.',
                  'Select engineering materials, infill density, and part dimensions for real-time cost estimation.'
                )}
              </p>

              <div className="pt-2 space-y-2 text-xs text-[#8590A6] font-sans">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#57DFFE] text-sm">check_circle</span>
                  <span>{isVi ? 'Tự động tính toán theo tỉ trọng vật liệu g/cm³' : 'Automated density calculation based on g/cm³'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#57DFFE] text-sm">check_circle</span>
                  <span>{isVi ? 'Miễn phí gọt support & rửa cồn siêu âm UV' : 'Free support removal & ultrasonic UV curing'}</span>
                </div>
              </div>
            </div>

            {/* Right: Interactive Controls & Instant Price Display Card */}
            <div className="lg:col-span-7 bg-white text-[#1C1C1C] p-6 sm:p-8 rounded-lg shadow-xl border border-white/20">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
                {/* Material Selection */}
                <div>
                  <label className="text-[10px] font-sans uppercase font-bold text-[#545F73] block mb-2">
                    {t('calcMaterial', 'Loại vật liệu:', 'Material:')}
                  </label>
                  <select
                    value={calcMaterialId}
                    onChange={(e) => setCalcMaterialId(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-black/15 p-2.5 text-xs text-[#1C1C1C] font-bold rounded focus:outline-none focus:border-[#00687A] cursor-pointer"
                  >
                    {MATERIALS_CATALOG.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.strength})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-[#7D7565] mt-1 italic">
                    {activeMaterial.desc}
                  </p>
                </div>

                {/* Part Scale Selector */}
                <div>
                  <label className="text-[10px] font-sans uppercase font-bold text-[#545F73] block mb-2">
                    {isVi ? 'Kích thước linh kiện:' : 'Part scale:'}
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['small', 'medium', 'large'] as const).map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setCalcPartSize(sz)}
                        className={`py-2 text-xs font-bold rounded transition-all uppercase ${
                          calcPartSize === sz
                            ? 'bg-[#00687A] text-white'
                            : 'bg-[#F1F5F9] text-[#545F73] hover:bg-[#E2E8F0]'
                        }`}
                      >
                        {sz === 'small' ? (isVi ? 'Nhỏ (<5cm)' : 'Small') : sz === 'medium' ? (isVi ? 'Vừa (<10cm)' : 'Medium') : (isVi ? 'Lớn (<20cm)' : 'Large')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Infill Slider */}
                <div className="sm:col-span-2">
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-[10px] font-sans uppercase font-bold text-[#545F73]">
                      {t('calcInfill', 'Độ đặc Infill:', 'Infill Density:')}
                    </label>
                    <span className="font-tech font-bold text-xs text-[#00687A]">{calcInfill}%</span>
                  </div>
                  <input
                    type="range"
                    min="15"
                    max="100"
                    step="5"
                    value={calcInfill}
                    onChange={(e) => setCalcInfill(Number(e.target.value))}
                    className="w-full accent-[#00687A] cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] font-tech text-[#7D7565] mt-0.5">
                    <span>15% (Trưng bày/Vỏ)</span>
                    <span>50% (Cơ khí chịu lực)</span>
                    <span>100% (Đặc hoàn toàn)</span>
                  </div>
                </div>
              </div>

              {/* Dynamic Live Estimation Result Strip */}
              <div className="bg-[#F8FAFC] border border-[#CBD5E1] p-4 rounded flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
                <div className="grid grid-cols-2 sm:grid-cols-2 gap-4 text-center sm:text-left w-full sm:w-auto">
                  <div>
                    <span className="text-[10px] text-[#7D7565] uppercase block">{t('calcEstWeight', 'Trọng lượng:', 'Weight:')}</span>
                    <span className="font-tech text-sm font-bold text-[#1C1C1C]">~{estimatedGrams}g</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#7D7565] uppercase block">{t('calcEstTime', 'Thời gian in:', 'Print time:')}</span>
                    <span className="font-tech text-sm font-bold text-[#1C1C1C]">~{estimatedHours}h</span>
                  </div>
                </div>

                <div className="text-center sm:text-right w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-black/10">
                  <span className="text-[10px] text-[#7D7565] uppercase block">{t('calcEstPrice', 'Chi phí ước tính:', 'Estimated cost:')}</span>
                  <span className="font-tech text-xl font-bold text-[#00687A]">
                    {estimatedPrice.toLocaleString(isVi ? 'vi-VN' : 'en-US')} đ
                  </span>
                </div>
              </div>

              {/* Call to Action to full 3D Upload */}
              <button
                onClick={() => onNavigate('tool_3d')}
                className="w-full py-3 bg-[#091426] hover:bg-[#1E293B] text-white font-sans text-xs uppercase tracking-widest font-bold rounded transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <span className="material-symbols-outlined text-sm text-[#57DFFE]">upload_file</span>
                {t('calcUploadFullCTA', 'Tải File STL Lên Để Báo Giá Chi Tiết →', 'Upload STL File for Full Analysis →')}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Technical Taxonomy & Application Categories */}
      <section className="py-10 sm:py-16 bg-[#F7F6F2] border-b border-black/10 px-4 sm:px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 sm:mb-8 pb-4 border-b border-black/10 gap-3">
            <div>
              <span className="font-sans text-[9px] sm:text-[10px] uppercase tracking-[0.25em] text-[#A69C8A] block mb-1">
                {t('sectionTaxonomyPre', 'Taxonomy // Phân Loại', 'Taxonomy // Categories')}
              </span>
              <h2 className="fluid-h2 text-[#1C1C1C]">
                {t('sectionTaxonomyTitle', 'Danh Mục Ứng Dụng Kỹ Thuật', 'Engineering Application Categories')}
              </h2>
            </div>
            <button
              onClick={() => onNavigate('explore')}
              className="font-sans text-xs uppercase tracking-widest text-[#00687A] hover:underline font-bold flex items-center gap-1.5 self-start sm:self-auto"
            >
              <span>{isVi ? `Xem toàn bộ tuyển tập (${products.length * 20}+)` : `Browse full library (${products.length * 20}+)`}</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {CATEGORIES.filter(c => c.id !== 'all').map((cat, idx) => (
              <button
                key={cat.id}
                onClick={() => onNavigate('explore', { category: cat.id })}
                className="bg-white p-4 sm:p-5 border border-black/10 hover:border-[#00687A] hover:shadow-md transition-all text-left flex flex-col justify-between min-h-[140px] sm:h-40 group rounded cursor-pointer"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-tech text-[10px] text-[#A69C8A] font-bold">0{idx + 1}</span>
                  <span className="material-symbols-outlined text-2xl text-[#00687A] group-hover:scale-110 transition-transform">
                    {cat.icon}
                  </span>
                </div>
                <div>
                  <h3 className="font-serif font-bold text-xs sm:text-sm text-[#1C1C1C] group-hover:text-[#00687A] transition-colors leading-snug">
                    {isVi ? cat.name : (cat as any).nameEn || cat.name}
                  </h3>
                  <p className="font-sans text-[9px] sm:text-[10px] uppercase tracking-wider text-[#7D7565] mt-1 font-tech">
                    {cat.count} CAD files
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 7. 3-Step Precision Manufacturing Process Chronicle */}
      <section className="py-12 sm:py-16 bg-[#FFFFFF] px-4 sm:px-6 md:px-12 border-b border-black/10">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 sm:mb-12 text-center max-w-xl mx-auto">
            <span className="font-sans text-[9px] sm:text-[10px] uppercase tracking-[0.25em] text-[#A69C8A] block mb-2 font-bold">
              {t('sectionWorkflowPre', 'Chronicle // Quy Trình Xưởng', 'Chronicle // Fabrication Flow')}
            </span>
            <h2 className="fluid-h2 text-[#1C1C1C]">
              {t('sectionWorkflowTitle', 'Quy Trình Gia Công 3 Bước Chuẩn Xác', '3-Step Precision Manufacturing Workflow')}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            <div className="bg-[#F8FAFC] border border-black/10 p-6 sm:p-8 relative flex flex-col justify-between rounded shadow-2xs">
              <span className="font-serif text-4xl font-bold text-black/10 absolute top-6 right-6">01</span>
              <div>
                <span className="font-sans text-[9px] uppercase tracking-[0.25em] text-[#00687A] block mb-2 font-bold">Phase One</span>
                <h3 className="font-serif font-bold text-lg text-[#1C1C1C] mb-2">
                  {isVi ? 'Tải Lên & Khảo Sát Mesh STL' : 'Upload & Mesh Inspection'}
                </h3>
                <p className="text-xs text-[#545F73] leading-relaxed font-serif">
                  {isVi
                    ? 'Thuật toán quét hình học VCUBE kiểm tra cấu trúc watertight, định vị góc overhanging và tính toán thể tích vật liệu trong 3 giây.'
                    : 'VCUBE algorithms verify watertight geometry, analyze overhang angles, and calculate precise material volume in 3 seconds.'}
                </p>
              </div>
              <div className="w-8 h-[2px] bg-[#00687A] mt-4 sm:mt-6"></div>
            </div>

            <div className="bg-[#F8FAFC] border border-black/10 p-6 sm:p-8 relative flex flex-col justify-between rounded shadow-2xs">
              <span className="font-serif text-4xl font-bold text-black/10 absolute top-6 right-6">02</span>
              <div>
                <span className="font-sans text-[9px] uppercase tracking-[0.25em] text-[#00687A] block mb-2 font-bold">Phase Two</span>
                <h3 className="font-serif font-bold text-lg text-[#1C1C1C] mb-2">
                  {isVi ? 'Cắt Lớp & In Nhiệt Chuẩn Xác' : 'Slicing & Thermal Print'}
                </h3>
                <p className="text-xs text-[#545F73] leading-relaxed font-serif">
                  {isVi
                    ? 'Gia công trên hệ thống Bambu Lab X1C & Formlabs Form 4 với sợi carbon PETG-CF và nhựa Resin kỹ thuật cao cấp.'
                    : 'Fabricated on calibrated Bambu Lab X1C & Formlabs Form 4 arrays with engineering PETG-CF and high-temp resins.'}
                </p>
              </div>
              <div className="w-8 h-[2px] bg-[#00687A] mt-4 sm:mt-6"></div>
            </div>

            <div className="bg-[#F8FAFC] border border-black/10 p-6 sm:p-8 relative flex flex-col justify-between rounded shadow-2xs">
              <span className="font-serif text-4xl font-bold text-black/10 absolute top-6 right-6">03</span>
              <div>
                <span className="font-sans text-[9px] uppercase tracking-[0.25em] text-[#00687A] block mb-2 font-bold">Phase Three</span>
                <h3 className="font-serif font-bold text-lg text-[#1C1C1C] mb-2">
                  {isVi ? 'Kiểm Định QC & Bàn Giao' : 'QC Metrology & Dispatch'}
                </h3>
                <p className="text-xs text-[#545F73] leading-relaxed font-serif">
                  {isVi
                    ? 'Đo kiểm quang học và thước kẹp Mitutoyo xác thực dung sai ±0.05mm, đóng gói chống sốc và giao hàng toàn quốc.'
                    : 'Optical and Mitutoyo caliper validation confirms ±0.05mm tolerance, shockproof packaging, and express nationwide delivery.'}
                </p>
              </div>
              <div className="w-8 h-[2px] bg-[#00687A] mt-4 sm:mt-6"></div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Trust & Industrial Partners Banner */}
      <section className="py-10 bg-[#F8FAFC] px-4 sm:px-6 md:px-12">
        <div className="max-w-7xl mx-auto text-center space-y-4">
          <span className="text-[10px] uppercase font-tech font-bold text-[#7D7565] tracking-widest block">
            {t('sectionTrustTitle', 'Được Tin Cậy Bởi Các Đơn Vị R&D & Xưởng Cơ Khí', 'Trusted by R&D Labs & Engineering Facilities')}
          </span>
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-12 opacity-60 grayscale hover:grayscale-0 transition-all font-tech text-xs font-bold text-[#1C1C1C]">
            <span className="px-3 py-1 bg-white border border-black/10 rounded">BK ROBOTICS LAB</span>
            <span className="px-3 py-1 bg-white border border-black/10 rounded">FPT HI-TECH INNOVATION</span>
            <span className="px-3 py-1 bg-white border border-black/10 rounded">VNU AEROSPACE LAB</span>
            <span className="px-3 py-1 bg-white border border-black/10 rounded">VIET-CNC AUTOMATION</span>
            <span className="px-3 py-1 bg-white border border-black/10 rounded">ISO 9001:2015 CERTIFIED</span>
          </div>
        </div>
      </section>
    </div>
  );
};
