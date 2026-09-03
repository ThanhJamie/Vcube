import React, { useState, useMemo } from 'react';
import { Product, CartItem, MaterialProfile, InkiriCostFormulaConfig, SiteContentConfig } from '../types';
import { CATEGORIES, POPULAR_TAGS, MATERIALS_CATALOG, DEFAULT_INKIRI_FORMULA_CONFIG, DEFAULT_SITE_CONTENT } from '../data/mockData';
import { ThreeModelViewer } from '../components/ThreeModelViewer';
import { CadQuickViewModal } from '../components/CadQuickViewModal';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

interface HomeViewProps {
  products: Product[];
  materials?: MaterialProfile[];
  pricingConfig?: InkiriCostFormulaConfig;
  siteContent?: SiteContentConfig;
  onAddToCart?: (item: CartItem) => void;
  onNavigate: (screen: string, payload?: any) => void;
  onSelectProduct: (product: Product) => void;
  onShowToast?: (msg: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  products,
  materials = MATERIALS_CATALOG,
  pricingConfig = DEFAULT_INKIRI_FORMULA_CONFIG,
  siteContent,
  onAddToCart,
  onNavigate,
  onSelectProduct,
  onShowToast
}) => {
  const { language, t } = useLanguage();
  const { isLoggedIn } = useAuth();
  const isVi = language === 'vi';
  const materialsList = materials && materials.length > 0 ? materials : MATERIALS_CATALOG;
  const activeConfig = pricingConfig || DEFAULT_INKIRI_FORMULA_CONFIG;
  const activeContent = siteContent || DEFAULT_SITE_CONTENT;

  // Active Model in Hero
  const [heroModel, setHeroModel] = useState<'gear' | 'drone' | 'box'>('gear');

  // CAD Catalog Filter & Browse State
  const [cadSearch, setCadSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [pricingMode, setPricingMode] = useState<'all' | 'digital' | 'physical'>('all');
  const [catalogViewMode, setCatalogViewMode] = useState<'grid' | 'tech-table'>('grid');

  // 3D Quick-Inspect Modal State
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState<boolean>(false);

  // Quick Calculator State
  const [calcMaterialId, setCalcMaterialId] = useState<string>(materialsList[0]?.id || 'pla-tough');
  const [calcInfill, setCalcInfill] = useState<number>(30);
  const [calcPartSize, setCalcPartSize] = useState<'small' | 'medium' | 'large'>('medium');

  // Filter products based on Category, Tag, Search, and Pricing Mode
  const displayedProducts = useMemo(() => {
    return products.filter((p) => {
      // 1. Search Query Filter
      if (cadSearch.trim() !== '') {
        const q = cadSearch.toLowerCase().trim();
        const matchName = p.name.toLowerCase().includes(q);
        const matchDesigner = p.designer.toLowerCase().includes(q);
        const matchTags = p.tags.some(t => t.toLowerCase().includes(q));
        const matchSku = p.sku ? p.sku.toLowerCase().includes(q) : false;
        if (!matchName && !matchDesigner && !matchTags && !matchSku) return false;
      }

      // 2. Category Filter
      if (selectedCategory !== 'all' && p.category !== selectedCategory) {
        return false;
      }

      // 3. Tag Filter
      if (selectedTag !== 'all') {
        const q = selectedTag.toLowerCase();
        if (q === '2/9') {
          const match29 = p.tags.some(t => t.includes('2/9') || t.toLowerCase().includes('đại lễ') || t.toLowerCase().includes('quốc khánh'));
          if (!match29) return false;
        } else if (q === 'mechanical') {
          const matchMech = p.category === 'mechanical' || p.tags.some(t => t.toLowerCase().includes('cơ khí') || t.toLowerCase().includes('mechanical') || t.toLowerCase().includes('gears'));
          if (!matchMech) return false;
        } else if (q === 'iot') {
          const matchIot = p.category === 'iot' || p.tags.some(t => t.toLowerCase().includes('iot') || t.toLowerCase().includes('arduino') || t.toLowerCase().includes('esp32'));
          if (!matchIot) return false;
        } else if (q === 'robotics') {
          const matchRobo = p.tags.some(t => t.toLowerCase().includes('robot') || t.toLowerCase().includes('nema') || t.toLowerCase().includes('drone'));
          if (!matchRobo) return false;
        } else if (q === 'snap-fit') {
          const matchSnap = p.tags.some(t => t.toLowerCase().includes('snap-fit') || p.features.some(f => f.toLowerCase().includes('snap-fit')));
          if (!matchSnap) return false;
        } else if (q === 'resin-8k') {
          const matchResin = p.supportedMaterials.some(m => m.toLowerCase().includes('resin')) || p.tags.some(t => t.toLowerCase().includes('resin'));
          if (!matchResin) return false;
        } else if (q === 'decor') {
          const matchDecor = p.category === 'tabletop' || p.tags.some(t => t.toLowerCase().includes('decor') || t.toLowerCase().includes('parametric') || t.toLowerCase().includes('vase'));
          if (!matchDecor) return false;
        } else if (q === 'bán-chạy') {
          const matchBest = (p.salesCount && p.salesCount > 100) || p.badge === 'BÁN CHẠY' || p.tags.some(t => t.toLowerCase().includes('bán chạy'));
          if (!matchBest) return false;
        } else {
          const matchGen = p.tags.some(t => t.toLowerCase().includes(q));
          if (!matchGen) return false;
        }
      }

      return true;
    });
  }, [products, cadSearch, selectedCategory, selectedTag]);

  // Fast calculations for simulator from dynamic Admin config
  const activeMaterial = materialsList.find(m => m.id === calcMaterialId) || materialsList[0];
  const baseWeight = calcPartSize === 'small' ? 35 : calcPartSize === 'medium' ? 85 : 190;
  const estimatedGrams = Math.round(baseWeight * (0.5 + (calcInfill / 100) * 0.7) * (activeMaterial.density / 1.24));
  
  const baseFixedOverhead = activeConfig.fastEstimatorBaseOverhead ?? (activeConfig.fixedPackagingCost + activeConfig.overheadPerUnit + Math.round((activeConfig.laborHourlyRate * 20) / 60));
  const markupMultiplier = 1 + (activeConfig.defaultMarkupPercent / 100);
  const feeSurchargeMultiplier = 1 + (((activeConfig.platformCommissionPercent || 8) + (activeConfig.paymentGatewayFeePercent || 2.5) + (activeConfig.designerRoyaltyPercent || 5)) / 100);
  const estimatedRawCost = (estimatedGrams * activeMaterial.pricePerGram) + baseFixedOverhead;
  const estimatedPrice = Math.round((estimatedRawCost * markupMultiplier * feeSurchargeMultiplier) / 1000) * 1000;
  const estimatedHours = ((estimatedGrams / 35) + 0.8).toFixed(1);

  // Authentication gating helper: ensures clicking action buttons on the landing page redirects to login if unauthenticated
  const handleProtectedAction = (action: () => void) => {
    if (!isLoggedIn) {
      onNavigate('login');
      return;
    }
    action();
  };

  const handleSelectProductAction = (product: Product, targetScreen: string = 'product_detail') => {
    if (!isLoggedIn) {
      onNavigate('login');
      return;
    }
    onSelectProduct(product);
    onNavigate(targetScreen, { product });
  };

  const handleOpen3DPreview = (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isLoggedIn) {
      onNavigate('login');
      return;
    }
    setQuickViewProduct(product);
    setIsQuickViewOpen(true);
  };

  const handleQuickAddDigital = (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isLoggedIn) {
      onNavigate('login');
      return;
    }
    if (!onAddToCart) {
      onSelectProduct(product);
      onNavigate('product_detail', { product });
      return;
    }
    const item: CartItem = {
      id: `cart-digital-${Date.now()}-${Math.random()}`,
      productId: product.id,
      type: 'digital',
      name: product.name,
      designer: product.designer,
      image: product.images[0],
      price: product.priceDigital,
      quantity: 1,
      fileFormat: 'STL + STEP',
      licenseType: product.licenseType || 'Commercial'
    };
    onAddToCart(item);
    if (onShowToast) {
      onShowToast(isVi ? `Đã thêm File CAD "${product.name}" vào giỏ!` : `Added CAD File "${product.name}" to cart!`);
    }
  };

  const partnersList = activeContent.trustPartnersList && activeContent.trustPartnersList.length > 0
    ? activeContent.trustPartnersList
    : (DEFAULT_SITE_CONTENT.trustPartnersList || ['BK ROBOTICS LAB', 'FPT HI-TECH INNOVATION', 'VNU AEROSPACE LAB', 'VIET-CNC AUTOMATION', 'ISO 9001:2015 CERTIFIED', 'BAMBU LAB FLEET 24X']);

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#091426] font-sans relative selection:bg-[#00687A] selection:text-white">
      {/* Background Ambient Glowing Radiance (Aligned with Login & Register) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10 opacity-70">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#DCE9FF]/60 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-0 w-[500px] h-[500px] bg-[#57DFFE]/15 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-1/4 w-[400px] h-[400px] bg-[#DCE9FF]/40 rounded-full blur-3xl" />
      </div>

      {/* 1. Dynamic Top Campaign Banner */}
      {activeContent.announcementActive && (
        <section className="bg-gradient-to-r from-[#091426] via-[#11233B] to-[#091426] text-white py-2.5 sm:py-3 px-4 sm:px-6 md:px-12 border-b border-[#CBD5E1]/30 shadow-xs">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2.5 text-center md:text-left">
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
              <span className="bg-[#00687A] text-white text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-md shadow-xs tracking-wider shrink-0 flex items-center gap-1.5 border border-[#57DFFE]/30">
                <span className="w-1.5 h-1.5 rounded-full bg-[#57DFFE] animate-ping" />
                {activeContent.announcementBadge || '🇻🇳 ĐẠI LỄ QUỐC KHÁNH 2/9'}
              </span>
              <p className="text-xs sm:text-sm font-medium text-slate-200 leading-snug">
                {activeContent.announcementText}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  if (!isLoggedIn) {
                    onNavigate('login');
                    return;
                  }
                  if (activeContent.announcementActionTag) {
                    setSelectedTag(activeContent.announcementActionTag);
                  }
                  const el = document.getElementById('browse-cad-catalog');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-3.5 py-1.5 bg-gradient-to-r from-[#00687A] to-[#0E7490] hover:from-[#005260] hover:to-[#085F75] text-white font-bold text-[11px] uppercase tracking-wider rounded-lg transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <span>{activeContent.announcementActionText || 'Xem Sản Phẩm Tag 2/9'}</span>
                <span className="material-symbols-outlined text-sm">arrow_downward</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* 2. Hero Section with Interactive 3D Model Switcher */}
      <section className="relative overflow-hidden py-10 sm:py-16 lg:py-20 px-4 sm:px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Content Column */}
            <div className="lg:col-span-7 flex flex-col justify-center space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-[#CBD5E1] rounded-lg text-[10px] uppercase font-mono tracking-[0.2em] text-[#00687A] font-bold w-fit shadow-xs">
                <span className="w-2 h-2 rounded-full bg-[#00687A] animate-pulse" />
                <span>{activeContent.heroBadge || 'VCUBE PRECISION ANTHOLOGY // 2026'}</span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-[#091426] tracking-tight leading-[1.12]">
                {activeContent.heroHeadlineLine1 || 'CHẾ TÁC CƠ KHÍ'}
                <br />
                <span className="text-[#00687A] bg-gradient-to-r from-[#00687A] to-[#0E7490] bg-clip-text text-transparent">
                  {activeContent.heroHeadlineHighlight || 'IN 3D CÔNG NGHIỆP CHÍNH XÁC'}
                </span>
              </h1>

              <div className="flex gap-4 sm:gap-6 items-start max-w-xl">
                <div className="w-1.5 h-14 bg-gradient-to-b from-[#00687A] to-[#57DFFE] rounded-full flex-shrink-0 mt-1" />
                <p className="text-sm sm:text-base text-[#475569] leading-relaxed font-sans font-normal">
                  {activeContent.heroSubheadline}
                </p>
              </div>

              {/* Main CTAs */}
              <div className="pt-2 flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 items-stretch sm:items-center">
                <button
                  onClick={() => handleProtectedAction(() => onNavigate('tool_3d'))}
                  className="h-12 px-7 rounded-xl bg-gradient-to-r from-[#00687A] to-[#0E7490] hover:from-[#005260] hover:to-[#085F75] text-white text-xs sm:text-sm uppercase tracking-wider font-bold transition-all shadow-lg shadow-[#00687A]/25 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-lg">upload_file</span>
                  <span>{activeContent.heroCtaQuoteText || 'Báo Giá File 3D Tức Thì'}</span>
                </button>

                <button
                  onClick={() => {
                    if (!isLoggedIn) {
                      onNavigate('login');
                      return;
                    }
                    const el = document.getElementById('browse-cad-catalog');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="h-12 px-7 rounded-xl bg-white hover:bg-slate-50 border border-[#CBD5E1] hover:border-[#00687A] text-[#091426] text-xs sm:text-sm uppercase tracking-wider font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-lg text-[#00687A]">view_in_ar</span>
                  <span>{activeContent.heroCtaCatalogText || 'Khám Phá Kho Mẫu CAD'}</span>
                </button>
              </div>

              {/* 3 Technical Quality Spec Metrics Cards */}
              <div className="grid grid-cols-3 gap-3 pt-6 border-t border-[#CBD5E1] text-xs">
                <div className="bg-white p-3.5 rounded-xl border border-[#CBD5E1] shadow-xs">
                  <span className="block text-[10px] text-[#64748B] font-medium mb-0.5">
                    {activeContent.heroMetric1Label || 'Dung Sai Đo Kiểm'}
                  </span>
                  <span className="font-mono text-sm sm:text-base font-extrabold text-[#00687A]">
                    {activeContent.heroMetric1Value || '±0.05 MM'}
                  </span>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-[#CBD5E1] shadow-xs">
                  <span className="block text-[10px] text-[#64748B] font-medium mb-0.5">
                    {activeContent.heroMetric2Label || 'Thời Gian Bàn Giao'}
                  </span>
                  <span className="font-mono text-sm sm:text-base font-extrabold text-[#091426]">
                    {activeContent.heroMetric2Value || 'GIAO HÀNG 24H'}
                  </span>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-[#CBD5E1] shadow-xs">
                  <span className="block text-[10px] text-[#64748B] font-medium mb-0.5">
                    {activeContent.heroMetric3Label || 'Tiêu Chuẩn Sản Xuất'}
                  </span>
                  <span className="font-mono text-sm sm:text-base font-extrabold text-[#091426]">
                    {activeContent.heroMetric3Value || 'ISO/ASTM 52900'}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Interactive 3D Showcase with Modern Chassis */}
            <div className="lg:col-span-5 relative flex flex-col items-center justify-center pt-2 lg:pt-0">
              <div className="w-full bg-[#091426] shadow-2xl relative flex flex-col justify-between p-5 overflow-hidden rounded-2xl border border-slate-800">
                {/* Top header on 3D Box */}
                <div className="w-full flex items-center justify-between z-10 text-white/70 font-mono text-[10px] uppercase tracking-wider">
                  <span className="font-bold text-[#57DFFE] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#57DFFE] animate-pulse" />
                    CHASSIS // 3D VIEWER
                  </span>
                  <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/10">
                    <button
                      onClick={() => setHeroModel('gear')}
                      className={`px-2.5 py-1 text-[10px] rounded-md font-mono font-bold transition-all cursor-pointer ${
                        heroModel === 'gear' ? 'bg-[#00687A] text-white shadow-xs' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Bánh Răng
                    </button>
                    <button
                      onClick={() => setHeroModel('drone')}
                      className={`px-2.5 py-1 text-[10px] rounded-md font-mono font-bold transition-all cursor-pointer ${
                        heroModel === 'drone' ? 'bg-[#00687A] text-white shadow-xs' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Khung Drone
                    </button>
                    <button
                      onClick={() => setHeroModel('box')}
                      className={`px-2.5 py-1 text-[10px] rounded-md font-mono font-bold transition-all cursor-pointer ${
                        heroModel === 'box' ? 'bg-[#00687A] text-white shadow-xs' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Vỏ Hộp IoT
                    </button>
                  </div>
                </div>

                {/* 3D Canvas Viewer */}
                <div className="w-full h-[280px] sm:h-[320px] relative my-3">
                  <ThreeModelViewer
                    modelType={heroModel}
                    color={heroModel === 'gear' ? '#00687a' : heroModel === 'drone' ? '#38bdf8' : '#e2e8f0'}
                    className="h-full w-full"
                  />
                </div>

                {/* Bottom Footer on 3D Box */}
                <div className="w-full flex items-center justify-between z-10 pt-3 border-t border-white/10">
                  <span className="font-mono text-[10px] text-[#57DFFE] flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm animate-spin">360</span>
                    XOAY 3D 360° TƯƠNG TÁC
                  </span>
                  <div className="text-right">
                    <span className="block font-mono text-[9px] text-slate-400 uppercase tracking-widest">
                      {activeContent.hanoiWorkshopAddress.split(':')[0] || 'XƯỞNG VCUBE'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Floating Metrology QC Note */}
              <div className="hidden sm:flex absolute -bottom-5 -left-4 bg-white p-3.5 shadow-xl border border-[#CBD5E1] max-w-[280px] z-20 rounded-2xl gap-3 items-center">
                <div className="w-9 h-9 rounded-xl bg-[#00687A]/10 text-[#00687A] flex items-center justify-center font-bold shrink-0 border border-[#00687A]/20">
                  <span className="material-symbols-outlined text-lg">verified</span>
                </div>
                <div>
                  <span className="font-mono text-[9px] uppercase tracking-wider text-[#64748B] block font-bold">
                    QUANG HỌC MITUTOYO
                  </span>
                  <p className="text-[11px] font-medium text-[#091426] leading-tight">
                    {activeContent.toleranceSpec || 'Dung sai ±0.05mm xác thực bởi thước kẹp điện tử'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. BROWSE CAD CATALOG - MAIN SHOWCASE HUB (OPTIMIZED UI/UX) */}
      <section id="browse-cad-catalog" className="py-10 sm:py-16 bg-[#FFFFFF] border-b border-black/10 px-4 sm:px-6 md:px-12 scroll-mt-16">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Section Header with CAD Quality Value Props */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-black/10">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-2 h-2 rounded-full bg-[#00687A]"></span>
                <span className="font-tech text-[10px] uppercase tracking-[0.25em] text-[#00687A] font-bold block">
                  VCUBE CAD CATALOG // INDUSTRIAL ARCHIVE
                </span>
              </div>
              <h2 className="fluid-h2 text-[#1C1C1C]">
                {isVi ? 'Khám Phá Kho Mẫu & Bản Vẽ CAD Kỹ Thuật' : 'Browse Industrial CAD & 3D Engineering Catalog'}
              </h2>
              <p className="text-xs sm:text-sm text-[#7D7565] mt-1 font-serif max-w-2xl">
                {isVi
                  ? 'Tuyển tập bản vẽ kỹ thuật cơ khí chính xác, vỏ hộp bo mạch và linh kiện tự động hóa. Đầy đủ định dạng STEP/STL gốc, kiểm tra kín nước 100% (watertight) và sẵn sàng xuất xưởng.'
                  : 'Curated repository of precision mechanical models, IoT enclosures, and robotics parts. Formatted in STEP/STL, 100% watertight verified, and ready for instant fabrication.'}
              </p>
            </div>

            {/* 4 CAD Precision Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-tech text-[10px] text-[#545F73] shrink-0">
              <div className="bg-[#F8FAFC] border border-black/10 p-2 rounded flex items-center gap-1.5">
                <span className="material-symbols-outlined text-xs text-emerald-600">verified</span>
                <span>100% Watertight</span>
              </div>
              <div className="bg-[#F8FAFC] border border-black/10 p-2 rounded flex items-center gap-1.5">
                <span className="material-symbols-outlined text-xs text-[#00687A]">category</span>
                <span>STEP / STL / 3MF</span>
              </div>
              <div className="bg-[#F8FAFC] border border-black/10 p-2 rounded flex items-center gap-1.5">
                <span className="material-symbols-outlined text-xs text-amber-600">straighten</span>
                <span>±0.05mm QC</span>
              </div>
              <div className="bg-[#F8FAFC] border border-black/10 p-2 rounded flex items-center gap-1.5">
                <span className="material-symbols-outlined text-xs text-indigo-600">license</span>
                <span>Commercial Ready</span>
              </div>
            </div>
          </div>

          {/* Interactive Command & Filter Strip */}
          <div className="bg-[#F8FAFC] border border-[#CBD5E1] p-4 rounded-xl shadow-xs space-y-3.5">
            {/* Search Bar + View Toggles */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-3">
              {/* Live Search Input */}
              <div className="relative w-full md:w-96">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#7D7565] text-base">
                  search
                </span>
                <input
                  type="text"
                  placeholder={isVi ? 'Tìm linh kiện CAD (vd: Bánh răng, ESP32, Drone, NEMA)...' : 'Search CAD parts (e.g. Gear, ESP32, Drone, NEMA)...'}
                  value={cadSearch}
                  onChange={(e) => setCadSearch(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-white border border-[#CBD5E1] text-xs text-[#1C1C1C] placeholder-[#8C857B] focus:outline-none focus:border-[#00687A] rounded-lg shadow-2xs font-sans"
                />
                {cadSearch && (
                  <button
                    onClick={() => setCadSearch('')}
                    className="absolute right-2.5 top-2.5 text-[#7D7565] hover:text-[#1C1C1C] text-xs"
                    title="Xóa tìm kiếm"
                  >
                    <span className="material-symbols-outlined text-base">close</span>
                  </button>
                )}
              </div>

              {/* View Layout & Action Controls */}
              <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
                {/* Result count */}
                <span className="font-tech text-xs text-[#545F73]">
                  {isVi ? 'Tìm thấy' : 'Found'} <strong className="text-[#00687A] font-bold">{displayedProducts.length}</strong> {isVi ? 'bản vẽ CAD' : 'CAD designs'}
                </span>

                <div className="flex items-center gap-1 bg-white border border-[#CBD5E1] p-1 rounded-lg">
                  <button
                    onClick={() => setCatalogViewMode('grid')}
                    className={`p-1.5 rounded text-xs transition-colors flex items-center justify-center cursor-pointer ${
                      catalogViewMode === 'grid' ? 'bg-[#00687A] text-white shadow-xs' : 'text-[#545F73] hover:text-[#1C1C1C]'
                    }`}
                    title={isVi ? 'Xem dạng lưới thẻ' : 'Grid View'}
                  >
                    <span className="material-symbols-outlined text-base">grid_view</span>
                  </button>
                  <button
                    onClick={() => setCatalogViewMode('tech-table')}
                    className={`p-1.5 rounded text-xs transition-colors flex items-center justify-center cursor-pointer ${
                      catalogViewMode === 'tech-table' ? 'bg-[#00687A] text-white shadow-xs' : 'text-[#545F73] hover:text-[#1C1C1C]'
                    }`}
                    title={isVi ? 'Xem bảng thông số kỹ thuật' : 'Technical Spec List View'}
                  >
                    <span className="material-symbols-outlined text-base">view_list</span>
                  </button>
                </div>

                <button
                  onClick={() => handleProtectedAction(() => onNavigate('explore'))}
                  className="px-3 py-2 bg-[#00687A]/10 hover:bg-[#00687A]/20 text-[#00687A] text-xs font-bold rounded-lg border border-[#00687A]/30 transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap"
                >
                  <span>{isVi ? 'Toàn Bộ Kho Bản Vẽ' : 'Full Catalog'}</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>
            </div>

            {/* Category Filter Pills Matrix */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none pt-1 border-t border-[#CBD5E1]/60">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 rounded-full text-xs font-sans whitespace-nowrap shrink-0 transition-all flex items-center gap-1.5 cursor-pointer touch-target-btn ${
                  selectedCategory === 'all'
                    ? 'bg-[#00687A] text-white font-bold shadow-xs'
                    : 'bg-white text-[#545F73] border border-[#CBD5E1] hover:border-black/30 hover:text-[#1C1C1C]'
                }`}
              >
                <span className="material-symbols-outlined text-xs">select_all</span>
                <span>{isVi ? 'Tất cả danh mục' : 'All Categories'}</span>
                <span className="font-tech text-[10px] opacity-70">({products.length})</span>
              </button>

              {CATEGORIES.filter(c => c.id !== 'all').map((cat) => {
                const isActive = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-sans whitespace-nowrap shrink-0 transition-all flex items-center gap-1.5 cursor-pointer touch-target-btn ${
                      isActive
                        ? 'bg-[#00687A] text-white font-bold shadow-xs'
                        : 'bg-white text-[#545F73] border border-[#CBD5E1] hover:border-black/30 hover:text-[#1C1C1C]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-xs">{cat.icon}</span>
                    <span>{isVi ? cat.name : (cat as any).nameEn || cat.name}</span>
                    <span className="font-tech text-[10px] opacity-70">({cat.count})</span>
                  </button>
                );
              })}
            </div>

            {/* Quick Engineering Tag Pills */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] font-tech font-bold uppercase text-[#7D7565] shrink-0 flex items-center gap-1">
                <span className="material-symbols-outlined text-xs text-[#00687A]">sell</span>
                {isVi ? 'Tag nhanh:' : 'Tags:'}
              </span>

              {POPULAR_TAGS.map((tag) => {
                const isActive = selectedTag === tag.id;
                const is29 = tag.id === '2/9';

                return (
                  <button
                    key={tag.id}
                    onClick={() => setSelectedTag(isActive ? 'all' : tag.id)}
                    className={`px-2.5 py-1 rounded text-[11px] font-tech whitespace-nowrap shrink-0 transition-all flex items-center gap-1 cursor-pointer ${
                      isActive
                        ? is29
                          ? 'bg-[#990000] text-white font-extrabold shadow-xs'
                          : 'bg-[#00687A] text-white font-bold shadow-xs'
                        : is29
                        ? 'bg-red-50 text-[#990000] border border-red-200 hover:bg-red-100 font-bold'
                        : 'bg-white text-[#545F73] border border-[#CBD5E1] hover:border-black/30 hover:text-[#1C1C1C]'
                    }`}
                  >
                    <span>#{isVi ? tag.nameVi : tag.nameEn}</span>
                    {is29 && (
                      <span className="bg-[#FFD700] text-[#990000] text-[8px] font-bold px-1 rounded-full uppercase">
                        HOT
                      </span>
                    )}
                  </button>
                );
              })}

              {selectedTag !== 'all' && (
                <button
                  onClick={() => setSelectedTag('all')}
                  className="text-[10px] text-rose-600 hover:underline font-bold shrink-0 ml-1"
                >
                  {isVi ? 'Bỏ lọc tag' : 'Clear tag'}
                </button>
              )}
            </div>
          </div>

          {/* Empty State */}
          {displayedProducts.length === 0 ? (
            <div className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-2xl p-12 text-center space-y-4 shadow-xs">
              <div className="w-16 h-16 bg-[#E2E8F0] rounded-full flex items-center justify-center mx-auto text-[#545F73]">
                <span className="material-symbols-outlined text-3xl">search_off</span>
              </div>
              <h3 className="font-serif font-bold text-lg text-[#1C1C1C]">
                {isVi ? 'Không tìm thấy linh kiện CAD phù hợp' : 'No CAD parts match your criteria'}
              </h3>
              <p className="text-xs text-[#545F73] max-w-md mx-auto font-sans">
                {isVi
                  ? 'Hãy thử xóa từ khóa tìm kiếm hoặc chọn danh mục khác để duyệt kho bản vẽ đầy đủ của VCUBE.'
                  : 'Try clearing your search query or switching categories to explore the full library.'}
              </p>
              <button
                onClick={() => {
                  setCadSearch('');
                  setSelectedCategory('all');
                  setSelectedTag('all');
                }}
                className="px-5 py-2.5 bg-[#00687A] text-white text-xs font-tech font-bold uppercase rounded-lg hover:bg-[#005463] transition-colors cursor-pointer"
              >
                {isVi ? 'Hiển thị tất cả bản vẽ' : 'Reset All Filters'}
              </button>
            </div>
          ) : catalogViewMode === 'grid' ? (
            /* GRID VIEW MODE */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {displayedProducts.map((product) => (
                <div
                  key={product.id}
                  className="bg-white border border-[#CBD5E1] hover:border-[#00687A] transition-all flex flex-col group rounded-xl shadow-xs hover:shadow-lg overflow-hidden relative"
                >
                  {/* Card Image Area with Quick 3D Inspect Overlay */}
                  <div
                    className="relative aspect-4/3 bg-[#091426] cursor-pointer overflow-hidden"
                    onClick={() => handleSelectProductAction(product, 'product_detail')}
                  >
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                    />

                    {/* Badge */}
                    {product.badge && (
                      <span className={`absolute top-3 left-3 text-[9px] font-tech uppercase tracking-wider px-2 py-0.5 rounded font-bold shadow-md ${
                        product.badge.includes('2/9') 
                          ? 'bg-[#990000] text-[#FFD700]'
                          : 'bg-[#091426]/90 text-[#57DFFE] border border-[#57DFFE]/30'
                      }`}>
                        {product.badge}
                      </span>
                    )}

                    {/* Watertight QC Stamp */}
                    <span className="absolute top-3 right-3 bg-black/75 backdrop-blur-xs text-emerald-400 text-[9px] font-tech px-2 py-0.5 rounded font-bold flex items-center gap-1 border border-emerald-500/30">
                      <span className="material-symbols-outlined text-[11px]">verified</span>
                      WATERTIGHT
                    </span>

                    {/* Floating 3D Inspect Trigger on Hover */}
                    <button
                      onClick={(e) => handleOpen3DPreview(product, e)}
                      className="absolute inset-0 bg-[#091426]/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 text-white font-tech text-xs uppercase tracking-wider font-bold cursor-pointer"
                      title={isVi ? 'Xoay xem 3D ngay tại đây' : 'Instant 3D Mesh Inspection'}
                    >
                      <span className="w-10 h-10 rounded-full bg-[#00687A] text-white flex items-center justify-center shadow-lg border border-[#57DFFE]/50 animate-bounce">
                        <span className="material-symbols-outlined text-xl">3d_rotation</span>
                      </span>
                      <span className="bg-black/60 px-3 py-1 rounded-full border border-white/20 text-[#57DFFE]">
                        {isVi ? 'Soi 3D 360° Trực Tiếp' : 'Inspect 3D Mesh'}
                      </span>
                    </button>

                    {/* Print time & specs pill */}
                    <span className="absolute bottom-2.5 right-2.5 bg-white/95 text-[#091426] text-[10px] font-tech px-2 py-0.5 rounded font-bold shadow-sm flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs text-[#00687A]">timer</span>
                      {product.printTime}
                    </span>
                  </div>

                  {/* Card Metadata Body */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      {/* Designer & Rating */}
                      <div className="flex items-center justify-between text-[11px] text-[#545F73] mb-1 font-sans">
                        <span className="uppercase tracking-wider truncate font-semibold font-tech flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs text-[#00687A]">engineering</span>
                          {product.designer}
                        </span>
                        <span className="font-tech text-xs text-[#00687A] font-bold">★ {product.rating}</span>
                      </div>

                      {/* Title */}
                      <h3
                        onClick={() => handleSelectProductAction(product, 'product_detail')}
                        className="font-serif font-bold text-base text-[#1C1C1C] hover:text-[#00687A] transition-colors cursor-pointer line-clamp-2 leading-snug"
                      >
                        {product.name}
                      </h3>

                      {/* CAD Specs Micro Grid */}
                      <div className="grid grid-cols-2 gap-1.5 mt-2.5 pt-2.5 border-t border-black/5 font-tech text-[10px] text-[#545F73]">
                        <div className="bg-[#F8FAFC] p-1.5 rounded border border-black/5 flex items-center justify-between">
                          <span className="text-[9px] text-[#8C857B]">SIZE:</span>
                          <span className="font-bold text-[#1C1C1C] truncate max-w-[80px]">{product.specs.dimensions}</span>
                        </div>
                        <div className="bg-[#F8FAFC] p-1.5 rounded border border-black/5 flex items-center justify-between">
                          <span className="text-[9px] text-[#8C857B]">FORMAT:</span>
                          <span className="font-bold text-[#00687A]">STL • STEP</span>
                        </div>
                      </div>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1 mt-2.5">
                        {product.tags.slice(0, 3).map((tg) => (
                          <button
                            key={tg}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTag(tg);
                            }}
                            className={`text-[9px] font-tech uppercase px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                              tg.includes('2/9') 
                                ? 'bg-red-50 text-[#990000] border-red-200 font-bold'
                                : 'bg-[#F8FAFC] text-[#545F73] border-[#CBD5E1] hover:border-black/30'
                            }`}
                          >
                            #{tg}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Pricing Matrix & Quick Actions */}
                    <div className="pt-3 border-t border-black/10">
                      <div className="flex items-baseline justify-between mb-3 font-sans">
                        <div>
                          <span className="text-[9px] text-[#7D7565] uppercase tracking-wider block font-medium">
                            {t('digitalAsset', 'File Số (STL/STEP)', 'CAD File (STL)')}
                          </span>
                          <span className="font-tech font-bold text-sm text-[#00687A]">
                            {product.priceDigital.toLocaleString(isVi ? 'vi-VN' : 'en-US')} đ
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] text-[#7D7565] uppercase tracking-wider block font-medium">
                            {t('physicalModel', 'In Vật Lý (FDM/Resin)', 'Physical Part')}
                          </span>
                          <span className="font-tech text-xs text-[#1C1C1C] font-bold">
                            {product.pricePhysical.toLocaleString(isVi ? 'vi-VN' : 'en-US')} đ
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* 1-Click Buy CAD File */}
                        <button
                          onClick={(e) => handleQuickAddDigital(product, e)}
                          className="flex-1 py-2.5 bg-[#00687A] hover:bg-[#005463] text-white text-[11px] font-tech uppercase tracking-wider font-bold rounded-lg transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer touch-target-btn"
                          title={isVi ? 'Tải file CAD STL/STEP gốc' : 'Get original CAD file'}
                        >
                          <span className="material-symbols-outlined text-sm">download</span>
                          <span>{isVi ? 'Mua File CAD' : 'Buy CAD File'}</span>
                        </button>

                        {/* Order Physical / Inspect 3D */}
                        <button
                          onClick={() => handleSelectProductAction(product, 'product_detail')}
                          className="px-3 py-2.5 bg-white border border-[#CBD5E1] hover:border-[#00687A] hover:bg-[#F8FAFC] text-[#091426] text-[11px] font-tech uppercase tracking-wider font-bold rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer touch-target-btn"
                          title={isVi ? 'Xem chi tiết & Đặt in vật lý' : 'Inspect details & Order Physical'}
                        >
                          <span className="material-symbols-outlined text-sm text-[#00687A]">precision_manufacturing</span>
                          <span className="hidden xl:inline">{isVi ? 'Đặt In' : 'Order'}</span>
                        </button>

                        {/* Personalize if supported */}
                        {product.isCustomizable && (
                          <button
                            onClick={() => handleSelectProductAction(product, 'personalize')}
                            className="p-2.5 bg-white border border-[#CBD5E1] hover:bg-[#00687A]/10 text-[#091426] text-[10px] rounded-lg transition-colors cursor-pointer"
                            title={isVi ? 'Khắc tên / Tùy biến kích thước' : 'Custom engraving & resizing'}
                          >
                            <span className="material-symbols-outlined text-sm text-[#00687A]">tune</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* TECHNICAL TABLE VIEW MODE */
            <div className="bg-white border border-[#CBD5E1] rounded-xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-[#091426] text-white font-tech text-[10px] uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Linh Kiện CAD</th>
                      <th className="py-3 px-3">Danh Mục</th>
                      <th className="py-3 px-3">Kích Thước</th>
                      <th className="py-3 px-3">Thời Gian In</th>
                      <th className="py-3 px-3">Giá File Số</th>
                      <th className="py-3 px-3">Giá In Vật Lý</th>
                      <th className="py-3 px-4 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#CBD5E1]">
                    {displayedProducts.map((product) => (
                      <tr key={product.id} className="hover:bg-[#F8FAFC] transition-colors group">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={product.images[0]}
                              alt={product.name}
                              className="w-12 h-12 object-cover rounded-lg border border-[#CBD5E1] shrink-0"
                            />
                            <div>
                              <h4
                                onClick={() => handleSelectProductAction(product, 'product_detail')}
                                className="font-serif font-bold text-sm text-[#1C1C1C] hover:text-[#00687A] cursor-pointer"
                              >
                                {product.name}
                              </h4>
                              <span className="text-[10px] text-[#545F73] font-tech block">
                                By {product.designer} • SKU: {product.sku || 'VC-CAD-99'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-tech font-bold uppercase text-[11px] text-[#00687A]">
                          {product.category}
                        </td>
                        <td className="py-3 px-3 font-tech text-xs text-[#1C1C1C]">
                          {product.specs.dimensions}
                        </td>
                        <td className="py-3 px-3 font-tech text-xs text-[#545F73]">
                          {product.printTime}
                        </td>
                        <td className="py-3 px-3 font-tech font-bold text-[#00687A]">
                          {product.priceDigital.toLocaleString(isVi ? 'vi-VN' : 'en-US')} đ
                        </td>
                        <td className="py-3 px-3 font-tech font-bold text-[#1C1C1C]">
                          {product.pricePhysical.toLocaleString(isVi ? 'vi-VN' : 'en-US')} đ
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={(e) => handleOpen3DPreview(product, e)}
                              className="p-1.5 bg-[#091426] hover:bg-[#00687A] text-white rounded text-xs transition-colors cursor-pointer"
                              title="Soi 3D 360°"
                            >
                              <span className="material-symbols-outlined text-sm">3d_rotation</span>
                            </button>
                            <button
                              onClick={(e) => handleQuickAddDigital(product, e)}
                              className="px-3 py-1.5 bg-[#00687A] hover:bg-[#005463] text-white font-tech font-bold text-[11px] uppercase rounded transition-colors cursor-pointer"
                            >
                              {isVi ? 'Tải CAD' : 'Buy STL'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Footer Callout */}
          <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs gap-3">
            <span className="text-[#545F73] font-serif">
              {isVi
                ? 'Bạn có file 3D của riêng mình? Sử dụng công cụ phân tích lưới và báo giá tức thì của chúng tôi.'
                : 'Have your own CAD model? Upload to our automated mesh slicer and instant cost calculator.'}
            </span>
            <button
              onClick={() => handleProtectedAction(() => onNavigate('tool_3d'))}
              className="px-4 py-2 bg-[#091426] hover:bg-[#1E293B] text-white font-tech font-bold text-xs uppercase tracking-wider rounded-lg transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm text-[#57DFFE]">upload_file</span>
              <span>{isVi ? 'Tải File Của Bạn Lên' : 'Upload Your CAD File'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* 4. Live 3D Quoting Cost Simulator Widget */}
      <section className="py-14 sm:py-20 px-4 sm:px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="bg-[#091426] text-white rounded-3xl p-6 sm:p-10 lg:p-12 shadow-2xl border border-slate-800">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              {/* Left: Info & Values */}
              <div className="lg:col-span-5 space-y-4">
                <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#57DFFE] font-bold block">
                  {activeContent.estimatorBadge || 'VCUBE FAST ESTIMATOR // LIVE QUOTE'}
                </span>
                <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                  {activeContent.estimatorTitle || 'Mô Phỏng & Ước Tính Chi Phí In 3D Trực Tiếp'}
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
                  {activeContent.estimatorSubtitle || 'Chọn vật liệu kỹ thuật, độ đặc infill và kích cỡ mẫu để mô phỏng tức thì chi phí gia công theo bảng giá xưởng VCUBE.'}
                </p>

                <div className="pt-2 space-y-2.5 text-xs text-slate-300 font-sans">
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[#57DFFE] text-base">check_circle</span>
                    <span>{activeContent.estimatorBenefit1 || 'Tự động tính toán theo tỉ trọng vật liệu g/cm³ chuẩn xác'}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[#57DFFE] text-base">check_circle</span>
                    <span>{activeContent.estimatorBenefit2 || 'Miễn phí gọt support & rửa cồn siêu âm xử lý bề mặt UV'}</span>
                  </div>
                </div>
              </div>

              {/* Right: Interactive Controls & Instant Price Display Card */}
              <div className="lg:col-span-7 bg-white text-[#091426] p-6 sm:p-8 rounded-2xl shadow-xl border border-slate-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
                  {/* Material Selection */}
                  <div>
                    <label className="text-[10px] font-mono uppercase font-bold text-[#64748B] block mb-2">
                      {t('calcMaterial', 'Loại vật liệu:', 'Material:')}
                    </label>
                    <select
                      value={calcMaterialId}
                      onChange={(e) => setCalcMaterialId(e.target.value)}
                      className="w-full bg-[#F8FAFC] border border-[#CBD5E1] p-2.5 text-xs text-[#091426] font-bold rounded-xl focus:outline-none focus:border-[#00687A] cursor-pointer"
                    >
                      {MATERIALS_CATALOG.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.strength})
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-[#64748B] mt-1 italic">
                      {activeMaterial.desc}
                    </p>
                  </div>

                  {/* Part Scale Selector */}
                  <div>
                    <label className="text-[10px] font-mono uppercase font-bold text-[#64748B] block mb-2">
                      {isVi ? 'Kích thước linh kiện:' : 'Part scale:'}
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['small', 'medium', 'large'] as const).map((sz) => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => setCalcPartSize(sz)}
                          className={`py-2 text-xs font-bold rounded-xl transition-all uppercase cursor-pointer ${
                            calcPartSize === sz
                              ? 'bg-[#00687A] text-white shadow-xs'
                              : 'bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]'
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
                      <label className="text-[10px] font-mono uppercase font-bold text-[#64748B]">
                        {t('calcInfill', 'Độ đặc Infill:', 'Infill Density:')}
                      </label>
                      <span className="font-mono font-bold text-xs text-[#00687A]">{calcInfill}%</span>
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
                    <div className="flex justify-between text-[9px] font-mono text-[#64748B] mt-0.5">
                      <span>15% (Trưng bày/Vỏ)</span>
                      <span>50% (Cơ khí chịu lực)</span>
                      <span>100% (Đặc hoàn toàn)</span>
                    </div>
                  </div>
                </div>

                {/* Dynamic Live Estimation Result Strip */}
                <div className="bg-[#F8FAFC] border border-[#CBD5E1] p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
                  <div className="grid grid-cols-2 gap-4 text-center sm:text-left w-full sm:w-auto">
                    <div>
                      <span className="text-[10px] text-[#64748B] uppercase block font-medium">{t('calcEstWeight', 'Trọng lượng:', 'Weight:')}</span>
                      <span className="font-mono text-sm font-bold text-[#091426]">~{estimatedGrams}g</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#64748B] uppercase block font-medium">{t('calcEstTime', 'Thời gian in:', 'Print time:')}</span>
                      <span className="font-mono text-sm font-bold text-[#091426]">~{estimatedHours}h</span>
                    </div>
                  </div>

                  <div className="text-center sm:text-right w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-[#CBD5E1]">
                    <span className="text-[10px] text-[#64748B] uppercase block font-medium">{t('calcEstPrice', 'Chi phí ước tính:', 'Estimated cost:')}</span>
                    <span className="font-mono text-xl font-bold text-[#00687A]">
                      {estimatedPrice.toLocaleString(isVi ? 'vi-VN' : 'en-US')} đ
                    </span>
                  </div>
                </div>

                {/* Call to Action to full 3D Upload */}
                <button
                  onClick={() => handleProtectedAction(() => onNavigate('tool_3d'))}
                  className="w-full py-3.5 bg-gradient-to-r from-[#00687A] to-[#0E7490] hover:from-[#005260] hover:to-[#085F75] text-white font-sans text-xs uppercase tracking-wider font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">upload_file</span>
                  <span>{activeContent.estimatorCtaText || 'Tải File STL Lên Để Báo Giá Chi Tiết →'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Technical Taxonomy & Application Categories */}
      <section className="py-12 sm:py-16 bg-white border-y border-[#CBD5E1] px-4 sm:px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 pb-4 border-b border-[#CBD5E1] gap-3">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#00687A] block mb-1 font-bold">
                {t('sectionTaxonomyPre', 'TAXONOMY // PHÂN LOẠI', 'TAXONOMY // CATEGORIES')}
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#091426] tracking-tight">
                {t('sectionTaxonomyTitle', 'Danh Mục Ứng Dụng Kỹ Thuật', 'Engineering Application Categories')}
              </h2>
            </div>
            <button
              onClick={() => handleProtectedAction(() => onNavigate('explore'))}
              className="font-mono text-xs uppercase tracking-wider text-[#00687A] hover:underline font-bold flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
            >
              <span>{isVi ? `Xem toàn bộ kho bản vẽ (${products.length * 20}+)` : `Browse full library (${products.length * 20}+)`}</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {CATEGORIES.filter(c => c.id !== 'all').map((cat, idx) => (
              <button
                key={cat.id}
                onClick={() => {
                  if (!isLoggedIn) {
                    onNavigate('login');
                    return;
                  }
                  setSelectedCategory(cat.id);
                  const el = document.getElementById('browse-cad-catalog');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="bg-[#F8FAFC] p-5 border border-[#CBD5E1] hover:border-[#00687A] hover:shadow-md transition-all text-left flex flex-col justify-between min-h-[160px] group rounded-2xl cursor-pointer"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-mono text-[10px] text-[#64748B] font-bold">0{idx + 1}</span>
                  <span className="material-symbols-outlined text-2xl text-[#00687A] group-hover:scale-110 transition-transform">
                    {cat.icon}
                  </span>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#091426] group-hover:text-[#00687A] transition-colors leading-snug">
                    {isVi ? cat.name : (cat as any).nameEn || cat.name}
                  </h3>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#CBD5E1]/60 font-mono text-[10px]">
                    <span className="text-[#00687A] font-bold">{cat.count} files</span>
                    <span className="material-symbols-outlined text-xs text-[#64748B] group-hover:translate-x-1 transition-transform">arrow_forward</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 6. 3-Step Precision Manufacturing Process Chronicle */}
      <section className="py-14 sm:py-20 px-4 sm:px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="mb-10 sm:mb-14 text-center max-w-xl mx-auto space-y-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#00687A] block font-bold">
              {activeContent.workflowBadge || 'CHRONICLE // QUY TRÌNH XƯỞNG'}
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-[#091426] tracking-tight">
              {activeContent.workflowTitle || 'Quy Trình Gia Công 3 Bước Chuẩn Xác'}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {/* Step 1 */}
            <div className="bg-white border border-[#CBD5E1] p-6 sm:p-8 relative flex flex-col justify-between rounded-2xl shadow-xs hover:shadow-lg hover:border-[#00687A]/50 transition-all">
              <span className="font-mono text-5xl font-black text-slate-100 absolute top-6 right-6 select-none pointer-events-none">01</span>
              <div className="relative z-10 space-y-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#00687A] block font-bold">PHASE 01</span>
                <h3 className="font-bold text-lg text-[#091426]">
                  {activeContent.workflowStep1Title || 'Tải Lên & Khảo Sát Mesh STL'}
                </h3>
                <p className="text-xs text-[#64748B] leading-relaxed font-sans">
                  {activeContent.workflowStep1Desc || 'Thuật toán quét hình học VCUBE kiểm tra cấu trúc watertight, định vị góc overhanging và tính toán thể tích vật liệu trong 3 giây.'}
                </p>
              </div>
              <div className="w-10 h-1 bg-[#00687A] rounded-full mt-6" />
            </div>

            {/* Step 2 */}
            <div className="bg-white border border-[#CBD5E1] p-6 sm:p-8 relative flex flex-col justify-between rounded-2xl shadow-xs hover:shadow-lg hover:border-[#00687A]/50 transition-all">
              <span className="font-mono text-5xl font-black text-slate-100 absolute top-6 right-6 select-none pointer-events-none">02</span>
              <div className="relative z-10 space-y-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#00687A] block font-bold">PHASE 02</span>
                <h3 className="font-bold text-lg text-[#091426]">
                  {activeContent.workflowStep2Title || 'Cắt Lớp & In Nhiệt Chuẩn Xác'}
                </h3>
                <p className="text-xs text-[#64748B] leading-relaxed font-sans">
                  {activeContent.workflowStep2Desc || 'Gia công trên hệ thống máy Bambu Lab X1C & Formlabs Form 4 với sợi carbon PETG-CF và nhựa Resin kỹ thuật độ chính xác cao.'}
                </p>
              </div>
              <div className="w-10 h-1 bg-[#00687A] rounded-full mt-6" />
            </div>

            {/* Step 3 */}
            <div className="bg-white border border-[#CBD5E1] p-6 sm:p-8 relative flex flex-col justify-between rounded-2xl shadow-xs hover:shadow-lg hover:border-[#00687A]/50 transition-all">
              <span className="font-mono text-5xl font-black text-slate-100 absolute top-6 right-6 select-none pointer-events-none">03</span>
              <div className="relative z-10 space-y-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#00687A] block font-bold">PHASE 03</span>
                <h3 className="font-bold text-lg text-[#091426]">
                  {activeContent.workflowStep3Title || 'Kiểm Định QC & Bàn Giao'}
                </h3>
                <p className="text-xs text-[#64748B] leading-relaxed font-sans">
                  {activeContent.workflowStep3Desc || 'Đo kiểm quang học và thước kẹp Mitutoyo xác thực dung sai ±0.05mm, đóng gói chống sốc và giao hàng toàn quốc.'}
                </p>
              </div>
              <div className="w-10 h-1 bg-[#00687A] rounded-full mt-6" />
            </div>
          </div>
        </div>
      </section>

      {/* 7. Trust & Industrial Partners Banner */}
      <section className="py-12 bg-white border-t border-[#CBD5E1] px-4 sm:px-6 md:px-12">
        <div className="max-w-7xl mx-auto text-center space-y-5">
          <span className="text-[10px] uppercase font-mono font-bold text-[#64748B] tracking-widest block">
            {activeContent.trustPartnersTitle || 'Được Tin Cậy Bởi Các Đơn Vị R&D & Xưởng Cơ Khí'}
          </span>
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 font-mono text-xs font-bold text-[#091426]">
            {partnersList.map((partner, pIdx) => (
              <span
                key={pIdx}
                className="px-4 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl hover:border-[#00687A] hover:text-[#00687A] transition-all shadow-2xs"
              >
                {partner}
              </span>
            ))}
          </div>

          {/* Workshop Contact Details Strip */}
          <div className="pt-6 border-t border-[#E2E8F0] grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-[#64748B]">
            <div>
              <strong className="text-[#091426] block font-bold mb-0.5">Xưởng Bắc:</strong>
              <span>{activeContent.hanoiWorkshopAddress}</span>
            </div>
            <div>
              <strong className="text-[#091426] block font-bold mb-0.5">Xưởng Nam:</strong>
              <span>{activeContent.hcmWorkshopAddress}</span>
            </div>
            <div>
              <strong className="text-[#091426] block font-bold mb-0.5">Hỗ Trợ Kỹ Thuật:</strong>
              <span>Hotline: <strong className="text-[#00687A]">{activeContent.hotline}</strong> • Email: {activeContent.contactEmail}</span>
            </div>
          </div>
        </div>
      </section>

      {/* CAD Quick View 3D Modal */}
      <CadQuickViewModal
        product={quickViewProduct}
        isOpen={isQuickViewOpen}
        onClose={() => setIsQuickViewOpen(false)}
        onAddToCart={onAddToCart}
        onNavigate={onNavigate}
        onShowToast={onShowToast}
      />
    </div>
  );
};
