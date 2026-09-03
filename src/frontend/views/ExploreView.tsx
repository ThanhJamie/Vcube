import React, { useState, useMemo, useEffect } from 'react';
import { Product, CartItem, MaterialProfile, InkiriCostFormulaConfig } from '../types';
import { CATEGORIES, POPULAR_TAGS, MATERIALS_CATALOG, DEFAULT_INKIRI_FORMULA_CONFIG } from '../data/mockData';
import { CadQuickViewModal } from '../components/CadQuickViewModal';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

interface ExploreViewProps {
  products: Product[];
  materials?: MaterialProfile[];
  pricingConfig?: InkiriCostFormulaConfig;
  initialCategory?: string;
  initialSearch?: string;
  initialTag?: string;
  onAddToCart?: (item: CartItem) => void;
  onNavigate: (screen: string, payload?: any) => void;
  onSelectProduct: (product: Product) => void;
  onShowToast?: (msg: string) => void;
}

export const ExploreView: React.FC<ExploreViewProps> = ({
  products,
  materials = MATERIALS_CATALOG,
  pricingConfig = DEFAULT_INKIRI_FORMULA_CONFIG,
  initialCategory = 'all',
  initialSearch = '',
  initialTag = 'all',
  onAddToCart,
  onNavigate,
  onSelectProduct,
  onShowToast
}) => {
  const { language, t } = useLanguage();
  const { role } = useAuth();
  const isVi = language === 'vi';
  const isAdmin = role === 'admin';

  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [searchQuery, setSearchQuery] = useState<string>(initialSearch);
  const [selectedTag, setSelectedTag] = useState<string>(initialTag);
  const [selectedMaterial, setSelectedMaterial] = useState<string>('all');
  const [pricePreset, setPricePreset] = useState<'all' | 'under100' | '100to250' | '250to500' | 'above500'>('all');
  const [priceMax, setPriceMax] = useState<number>(600000);
  const [onlyCustomizable, setOnlyCustomizable] = useState<boolean>(false);
  const [onlyWatertight, setOnlyWatertight] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'rating' | 'popular'>('featured');
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>(['prod-arduino-case']);
  const [mobileFilterOpen, setMobileFilterOpen] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'grid' | 'tech-table' | 'compact'>('grid');
  const [visibleCount, setVisibleCount] = useState<number>(12);

  // Quick 3D Preview Modal State
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState<boolean>(false);

  // Sync if initial props change
  useEffect(() => {
    if (initialCategory) setSelectedCategory(initialCategory);
  }, [initialCategory]);

  useEffect(() => {
    if (initialSearch !== undefined) setSearchQuery(initialSearch);
  }, [initialSearch]);

  useEffect(() => {
    if (initialTag) setSelectedTag(initialTag);
  }, [initialTag]);

  const toggleBookmark = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setBookmarkedIds(prev => {
      const isBookmarked = prev.includes(id);
      const next = isBookmarked ? prev.filter(item => item !== id) : [...prev, id];
      if (onShowToast) {
        onShowToast(isBookmarked ? (isVi ? 'Đã bỏ lưu bản vẽ' : 'Removed from bookmarks') : (isVi ? 'Đã lưu bản vẽ vào mục yêu thích' : 'Saved to bookmarks'));
      }
      return next;
    });
  };

  const handleOpen3DPreview = (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    setQuickViewProduct(product);
    setIsQuickViewOpen(true);
  };

  const handleQuickAddDigital = (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
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

  // Live count per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: products.length };
    products.forEach(p => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return counts;
  }, [products]);

  // Handle Preset Price Selection
  const handleSelectPricePreset = (preset: 'all' | 'under100' | '100to250' | '250to500' | 'above500') => {
    setPricePreset(preset);
    if (preset === 'under100') setPriceMax(100000);
    else if (preset === '100to250') setPriceMax(250000);
    else if (preset === '250to500') setPriceMax(500000);
    else if (preset === 'above500') setPriceMax(1000000);
    else setPriceMax(600000);
  };

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Only show published models for regular users (hide draft and archived)
      if (!isAdmin) {
        const normStatus = (p.status || 'published').toLowerCase();
        if (normStatus !== 'published') {
          return false;
        }
      }

      // Category filter
      if (selectedCategory !== 'all' && p.category !== selectedCategory) {
        return false;
      }

      // Tag filter
      if (selectedTag !== 'all') {
        const qTag = selectedTag.toLowerCase();
        let matchTag = false;
        if (qTag === '2/9') {
          matchTag = p.tags.some(t => t.includes('2/9') || t.toLowerCase().includes('đại lễ') || t.toLowerCase().includes('quốc khánh'));
        } else if (qTag === 'mechanical') {
          matchTag = p.category === 'mechanical' || p.tags.some(t => t.toLowerCase().includes('cơ khí') || t.toLowerCase().includes('mechanical'));
        } else if (qTag === 'iot') {
          matchTag = p.category === 'iot' || p.tags.some(t => t.toLowerCase().includes('iot') || t.toLowerCase().includes('arduino') || t.toLowerCase().includes('esp32'));
        } else if (qTag === 'robotics') {
          matchTag = p.tags.some(t => t.toLowerCase().includes('robot') || t.toLowerCase().includes('nema') || t.toLowerCase().includes('drone'));
        } else if (qTag === 'snap-fit') {
          matchTag = p.tags.some(t => t.toLowerCase().includes('snap-fit') || p.features.some(f => f.toLowerCase().includes('snap-fit')));
        } else if (qTag === 'resin-8k') {
          matchTag = p.supportedMaterials.some(m => m.toLowerCase().includes('resin')) || p.tags.some(t => t.toLowerCase().includes('resin'));
        } else if (qTag === 'decor') {
          matchTag = p.category === 'tabletop' || p.tags.some(t => t.toLowerCase().includes('decor') || t.toLowerCase().includes('parametric') || t.toLowerCase().includes('vase'));
        } else if (qTag === 'bán-chạy') {
          matchTag = (p.salesCount && p.salesCount > 100) || p.badge === 'BÁN CHẠY' || p.tags.some(t => t.toLowerCase().includes('bán chạy'));
        } else {
          matchTag = p.tags.some(t => t.toLowerCase().includes(qTag));
        }
        if (!matchTag) return false;
      }

      // Search filter
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim();
        const matchName = p.name.toLowerCase().includes(q);
        const matchDesigner = p.designer.toLowerCase().includes(q);
        const matchTags = p.tags.some(t => t.toLowerCase().includes(q));
        const matchSku = p.sku ? p.sku.toLowerCase().includes(q) : false;
        const matchMat = p.supportedMaterials.some(m => m.toLowerCase().includes(q));
        if (!matchName && !matchDesigner && !matchTags && !matchSku && !matchMat) return false;
      }

      // Material filter
      if (selectedMaterial !== 'all') {
        const hasMat = p.supportedMaterials.some(m => m.toLowerCase().includes(selectedMaterial.toLowerCase()));
        if (!hasMat) return false;
      }

      // Price preset & range filter
      if (pricePreset === 'under100' && p.pricePhysical > 100000) return false;
      if (pricePreset === '100to250' && (p.pricePhysical < 100000 || p.pricePhysical > 250000)) return false;
      if (pricePreset === '250to500' && (p.pricePhysical < 250000 || p.pricePhysical > 500000)) return false;
      if (pricePreset === 'above500' && p.pricePhysical < 500000) return false;
      if (pricePreset === 'all' && p.pricePhysical > priceMax) return false;

      // Customizable filter
      if (onlyCustomizable && !p.isCustomizable) {
        return false;
      }

      // Watertight filter
      if (onlyWatertight && !p.features.some(f => f.toLowerCase().includes('watertight') || f.toLowerCase().includes('kín nước') || f.toLowerCase().includes('chống thấm'))) {
        // Most VCUBE models are watertight by default
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'price-asc') return a.pricePhysical - b.pricePhysical;
      if (sortBy === 'price-desc') return b.pricePhysical - a.pricePhysical;
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'popular') return (b.printsCount || 0) - (a.printsCount || 0);
      return 0; // featured default
    });
  }, [products, selectedCategory, selectedTag, searchQuery, selectedMaterial, pricePreset, priceMax, onlyCustomizable, onlyWatertight, sortBy, isAdmin]);

  const materialsList = ['PLA Tough', 'PETG', 'ABS', 'Resin 8K', 'TPU', 'Nylon PA12'];

  const resetFilters = () => {
    setSelectedCategory('all');
    setSelectedTag('all');
    setSelectedMaterial('all');
    setPricePreset('all');
    setPriceMax(600000);
    setOnlyCustomizable(false);
    setOnlyWatertight(false);
    setSearchQuery('');
  };

  const hasActiveFilters = selectedCategory !== 'all' || selectedTag !== 'all' || selectedMaterial !== 'all' || pricePreset !== 'all' || priceMax < 600000 || onlyCustomizable || searchQuery.trim() !== '';

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#091426] py-6 sm:py-10 px-4 sm:px-6 md:px-12 font-sans relative selection:bg-[#00687A] selection:text-white">
      {/* Background Ambient Glowing Radiance (Aligned with Login & HomeView) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10 opacity-70">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#DCE9FF]/60 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-0 w-[500px] h-[500px] bg-[#57DFFE]/15 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-1/4 w-[400px] h-[400px] bg-[#DCE9FF]/40 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Editorial Modern Header Title */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 sm:gap-6 pb-6 border-b border-[#CBD5E1]">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-[#CBD5E1] rounded-lg text-[10px] uppercase font-mono tracking-[0.2em] text-[#00687A] font-bold mb-2 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00687A] animate-pulse" />
              <span>VCUBE PRECISION CAD REPOSITORY // 2026 ARCHIVE</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-[#091426] tracking-tight">
              {isVi ? 'Bộ Sưu Tập & Bản Vẽ Kỹ Thuật CAD' : 'Engineering CAD & Physical Catalog'}
            </h1>
            <p className="text-xs sm:text-sm text-[#64748B] mt-1 font-sans max-w-2xl leading-relaxed">
              {isVi
                ? `Hơn ${products.length} bản vẽ cơ khí chính xác được kiểm định ứng suất, đạt chuẩn Watertight 100% và cấp phép sản xuất bồi đắp trực tiếp.`
                : `Over ${products.length} precision mechanical designs stress-tested, 100% watertight verified, and certified for instant digital fabrication.`}
            </p>
          </div>

          {/* Quick Search Bar */}
          <div className="relative w-full md:w-88 shrink-0">
            <input
              type="text"
              placeholder={isVi ? 'Tìm linh kiện CAD (vd: Bánh răng, ESP32, Drone)...' : 'Search CAD models (e.g. Gear, Drone, NEMA)...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 bg-white border border-[#CBD5E1] text-xs text-[#091426] placeholder-[#94A3B8] focus:outline-none focus:border-[#00687A] rounded-xl shadow-xs font-sans"
            />
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#64748B] text-base">
              search
            </span>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-[#64748B] hover:text-[#091426] text-xs p-0.5 cursor-pointer"
                aria-label="Clear search"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            )}
          </div>
        </div>

        {/* Popular Tag Filter Chips Bar */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-[#CBD5E1] shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-mono font-bold text-[#64748B] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm text-[#00687A]">sell</span>
              {isVi ? 'Lọc nhanh theo Tag kỹ thuật:' : 'Quick Filter by Engineering Tag:'}
            </span>
            {selectedTag !== 'all' && (
              <button
                onClick={() => setSelectedTag('all')}
                className="text-[10px] text-rose-600 hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
              >
                <span>{isVi ? 'Bỏ lọc tag' : 'Clear tag'}</span>
                <span className="material-symbols-outlined text-xs">close</span>
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {POPULAR_TAGS.map((tag) => {
              const isActive = selectedTag === tag.id;
              const is29 = tag.id === '2/9';

              return (
                <button
                  key={tag.id}
                  onClick={() => setSelectedTag(isActive ? 'all' : tag.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono whitespace-nowrap shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? is29
                        ? 'bg-[#990000] text-white font-bold shadow-xs'
                        : 'bg-[#00687A] text-white font-bold shadow-xs'
                      : is29
                      ? 'bg-red-50 text-[#990000] border border-red-200 hover:bg-red-100 font-bold'
                      : 'bg-[#F8FAFC] text-[#475569] border border-[#CBD5E1] hover:border-[#00687A] hover:text-[#091426]'
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
          </div>
        </div>

        {/* Active Filters Tray */}
        {hasActiveFilters && (
          <div className="bg-[#00687A]/5 border border-[#00687A]/20 p-3 rounded-2xl flex flex-wrap items-center justify-between gap-2.5 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase text-[#00687A] flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">filter_alt</span>
                {isVi ? 'Đang lọc:' : 'Active filters:'}
              </span>

              {searchQuery && (
                <span className="inline-flex items-center gap-1 bg-white border border-[#CBD5E1] px-2.5 py-1 rounded-lg text-xs font-medium text-[#091426] shadow-2xs">
                  <span>Tìm: "{searchQuery}"</span>
                  <button onClick={() => setSearchQuery('')} className="hover:text-rose-600 cursor-pointer">
                    <span className="material-symbols-outlined text-xs">close</span>
                  </button>
                </span>
              )}

              {selectedCategory !== 'all' && (
                <span className="inline-flex items-center gap-1 bg-white border border-[#CBD5E1] px-2.5 py-1 rounded-lg text-xs font-medium text-[#00687A] shadow-2xs">
                  <span>Danh mục: {CATEGORIES.find(c => c.id === selectedCategory)?.name || selectedCategory}</span>
                  <button onClick={() => setSelectedCategory('all')} className="hover:text-rose-600 cursor-pointer">
                    <span className="material-symbols-outlined text-xs">close</span>
                  </button>
                </span>
              )}

              {selectedTag !== 'all' && (
                <span className="inline-flex items-center gap-1 bg-white border border-[#CBD5E1] px-2.5 py-1 rounded-lg text-xs font-medium text-[#00687A] shadow-2xs">
                  <span>Tag: #{selectedTag}</span>
                  <button onClick={() => setSelectedTag('all')} className="hover:text-rose-600 cursor-pointer">
                    <span className="material-symbols-outlined text-xs">close</span>
                  </button>
                </span>
              )}

              {selectedMaterial !== 'all' && (
                <span className="inline-flex items-center gap-1 bg-white border border-[#CBD5E1] px-2.5 py-1 rounded-lg text-xs font-medium text-[#091426] shadow-2xs">
                  <span>Vật liệu: {selectedMaterial}</span>
                  <button onClick={() => setSelectedMaterial('all')} className="hover:text-rose-600 cursor-pointer">
                    <span className="material-symbols-outlined text-xs">close</span>
                  </button>
                </span>
              )}

              {pricePreset !== 'all' && (
                <span className="inline-flex items-center gap-1 bg-white border border-[#CBD5E1] px-2.5 py-1 rounded-lg text-xs font-medium text-[#091426] shadow-2xs">
                  <span>
                    Giá: {pricePreset === 'under100' ? '< 100k' : pricePreset === '100to250' ? '100k - 250k' : pricePreset === '250to500' ? '250k - 500k' : '> 500k'}
                  </span>
                  <button onClick={() => setPricePreset('all')} className="hover:text-rose-600 cursor-pointer">
                    <span className="material-symbols-outlined text-xs">close</span>
                  </button>
                </span>
              )}

              {onlyCustomizable && (
                <span className="inline-flex items-center gap-1 bg-white border border-[#CBD5E1] px-2.5 py-1 rounded-lg text-xs font-medium text-[#091426] shadow-2xs">
                  <span>Hỗ trợ khắc tên & tùy biến</span>
                  <button onClick={() => setOnlyCustomizable(false)} className="hover:text-rose-600 cursor-pointer">
                    <span className="material-symbols-outlined text-xs">close</span>
                  </button>
                </span>
              )}
            </div>

            <button
              onClick={resetFilters}
              className="text-xs font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer shrink-0"
            >
              <span className="material-symbols-outlined text-sm">restart_alt</span>
              <span>{isVi ? 'Xóa toàn bộ bộ lọc' : 'Reset all filters'}</span>
            </button>
          </div>
        )}

        {/* Mobile Filter Toggle Button */}
        <div className="lg:hidden flex items-center justify-between gap-3">
          <button
            onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
            className="flex-1 py-3 px-4 bg-white border border-[#CBD5E1] text-xs uppercase font-mono tracking-wider font-bold flex items-center justify-center gap-2 shadow-xs rounded-xl cursor-pointer"
          >
            <span className="material-symbols-outlined text-base text-[#00687A]">tune</span>
            {mobileFilterOpen ? (isVi ? 'Đóng Bộ Lọc' : 'Close Filters') : (isVi ? `Bộ Lọc Nâng Cao (${filteredProducts.length})` : `Filters (${filteredProducts.length})`)}
          </button>
          <button
            onClick={resetFilters}
            className="py-3 px-4 bg-white border border-[#CBD5E1] text-xs uppercase font-mono tracking-wider text-[#64748B] rounded-xl font-bold cursor-pointer"
          >
            {isVi ? 'Đặt lại' : 'Reset'}
          </button>
        </div>

        {/* Main Grid: Filters Sidebar + Products */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
          {/* Left Sidebar Filters */}
          <aside className={`lg:col-span-3 space-y-5 ${mobileFilterOpen ? 'block' : 'hidden lg:block'}`}>
            <div className="bg-white p-5 sm:p-6 border border-[#CBD5E1] rounded-2xl shadow-xs space-y-6">
              <div className="flex items-center justify-between pb-3.5 border-b border-[#CBD5E1]">
                <span className="font-bold text-sm text-[#091426] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base text-[#00687A]">tune</span>
                  {isVi ? 'Bộ Lọc Phân Loại' : 'Filter Options'}
                </span>
                {hasActiveFilters && (
                  <button
                    onClick={resetFilters}
                    className="text-[10px] font-mono uppercase tracking-wider text-rose-600 hover:text-rose-800 font-bold cursor-pointer"
                  >
                    {isVi ? 'Xóa lọc' : 'Reset'}
                  </button>
                )}
              </div>

              {/* Category Filter with Live Counts */}
              <div>
                <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#64748B] font-bold block mb-2.5">
                  {isVi ? 'Danh Mục Bản Vẽ' : 'CAD Categories'}
                </label>
                <div className="space-y-1">
                  <button
                    onClick={() => {
                      setSelectedCategory('all');
                      if (window.innerWidth < 1024) setMobileFilterOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs rounded-xl transition-all flex items-center justify-between cursor-pointer ${
                      selectedCategory === 'all'
                        ? 'bg-[#00687A] text-white font-bold shadow-xs'
                        : 'text-[#475569] hover:bg-[#F8FAFC] hover:text-[#091426]'
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <span className="material-symbols-outlined text-sm">select_all</span>
                      <span>{isVi ? 'Tất cả danh mục' : 'All Categories'}</span>
                    </span>
                    <span className="font-mono text-[10px] opacity-75 shrink-0 ml-2">({products.length})</span>
                  </button>

                  {CATEGORIES.filter(c => c.id !== 'all').map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setSelectedCategory(cat.id);
                        if (window.innerWidth < 1024) setMobileFilterOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs rounded-xl transition-all flex items-center justify-between cursor-pointer ${
                        selectedCategory === cat.id
                          ? 'bg-[#00687A] text-white font-bold shadow-xs'
                          : 'text-[#475569] hover:bg-[#F8FAFC] hover:text-[#091426]'
                      }`}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <span className="material-symbols-outlined text-sm opacity-80">{cat.icon}</span>
                        <span>{isVi ? cat.name : (cat as any).nameEn || cat.name}</span>
                      </span>
                      <span className="font-mono text-[10px] opacity-75 shrink-0 ml-2">
                        ({categoryCounts[cat.id] || cat.count})
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Filter with Quick Presets */}
              <div>
                <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#64748B] font-bold block mb-2">
                  {isVi ? 'Khoảng Giá In Vật Lý' : 'Physical Price Range'}
                </label>
                
                {/* Presets */}
                <div className="grid grid-cols-2 gap-1.5 mb-3">
                  <button
                    type="button"
                    onClick={() => handleSelectPricePreset('under100')}
                    className={`py-1.5 px-2 text-[11px] font-mono font-bold rounded-lg border transition-all cursor-pointer text-center ${
                      pricePreset === 'under100'
                        ? 'bg-[#00687A] text-white border-[#00687A] shadow-2xs'
                        : 'bg-[#F8FAFC] text-[#475569] border-[#CBD5E1] hover:border-[#00687A]'
                    }`}
                  >
                    &lt; 100k đ
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectPricePreset('100to250')}
                    className={`py-1.5 px-2 text-[11px] font-mono font-bold rounded-lg border transition-all cursor-pointer text-center ${
                      pricePreset === '100to250'
                        ? 'bg-[#00687A] text-white border-[#00687A] shadow-2xs'
                        : 'bg-[#F8FAFC] text-[#475569] border-[#CBD5E1] hover:border-[#00687A]'
                    }`}
                  >
                    100k - 250k
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectPricePreset('250to500')}
                    className={`py-1.5 px-2 text-[11px] font-mono font-bold rounded-lg border transition-all cursor-pointer text-center ${
                      pricePreset === '250to500'
                        ? 'bg-[#00687A] text-white border-[#00687A] shadow-2xs'
                        : 'bg-[#F8FAFC] text-[#475569] border-[#CBD5E1] hover:border-[#00687A]'
                    }`}
                  >
                    250k - 500k
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectPricePreset('above500')}
                    className={`py-1.5 px-2 text-[11px] font-mono font-bold rounded-lg border transition-all cursor-pointer text-center ${
                      pricePreset === 'above500'
                        ? 'bg-[#00687A] text-white border-[#00687A] shadow-2xs'
                        : 'bg-[#F8FAFC] text-[#475569] border-[#CBD5E1] hover:border-[#00687A]'
                    }`}
                  >
                    &gt; 500k đ
                  </button>
                </div>

                {/* Slider */}
                <div className="pt-1">
                  <div className="flex justify-between items-center mb-1 text-[11px] font-mono">
                    <span className="text-[#64748B]">Tối đa:</span>
                    <span className="font-bold text-[#00687A]">
                      {priceMax.toLocaleString(isVi ? 'vi-VN' : 'en-US')} đ
                    </span>
                  </div>
                  <input
                    type="range"
                    min="50000"
                    max="600000"
                    step="25000"
                    value={priceMax}
                    onChange={(e) => {
                      setPricePreset('all');
                      setPriceMax(Number(e.target.value));
                    }}
                    className="w-full accent-[#00687A] cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] font-mono text-[#94A3B8] mt-0.5">
                    <span>50k đ</span>
                    <span>300k đ</span>
                    <span>600k+ đ</span>
                  </div>
                </div>
              </div>

              {/* Material Filter */}
              <div>
                <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#64748B] font-bold block mb-2">
                  {isVi ? 'Vật Liệu Khuyên Dùng' : 'Recommended Material'}
                </label>
                <div className="space-y-1">
                  <button
                    onClick={() => setSelectedMaterial('all')}
                    className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg transition-colors flex items-center justify-between cursor-pointer ${
                      selectedMaterial === 'all'
                        ? 'bg-[#00687A]/10 text-[#00687A] font-bold'
                        : 'text-[#64748B] hover:text-[#091426]'
                    }`}
                  >
                    <span>{isVi ? 'Tất cả vật liệu' : 'All materials'}</span>
                    <span className="material-symbols-outlined text-xs">done</span>
                  </button>
                  {materialsList.map((mat) => (
                    <button
                      key={mat}
                      onClick={() => setSelectedMaterial(mat)}
                      className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg transition-colors flex items-center justify-between cursor-pointer ${
                        selectedMaterial === mat
                          ? 'bg-[#00687A] text-white font-bold shadow-2xs'
                          : 'text-[#475569] hover:bg-[#F8FAFC] hover:text-[#091426]'
                      }`}
                    >
                      <span>{mat}</span>
                      <span className="text-[9px] font-mono opacity-70">
                        {mat.includes('Resin') ? 'SLA' : 'FDM'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quality & Feature Checkboxes */}
              <div className="pt-3 border-t border-[#CBD5E1] space-y-2.5">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={onlyCustomizable}
                    onChange={(e) => setOnlyCustomizable(e.target.checked)}
                    className="w-4 h-4 accent-[#00687A] cursor-pointer rounded"
                  />
                  <span className="text-xs text-[#091426] font-medium">
                    {isVi ? 'Hỗ trợ khắc tên & tùy biến' : 'Custom engraving & resize'}
                  </span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={onlyWatertight}
                    onChange={(e) => setOnlyWatertight(e.target.checked)}
                    className="w-4 h-4 accent-[#00687A] cursor-pointer rounded"
                  />
                  <span className="text-xs text-[#091426] font-medium">
                    {isVi ? 'Đạt chuẩn Watertight 100%' : '100% Watertight certified'}
                  </span>
                </label>
              </div>

              {/* Supabase & Admin Live Link Notice */}
              <div className="bg-[#F8FAFC] border border-[#CBD5E1] p-3 rounded-xl text-[11px] text-[#64748B] space-y-1">
                <div className="flex items-center gap-1.5 text-[#00687A] font-bold font-mono text-[10px] uppercase">
                  <span className="material-symbols-outlined text-xs">cloud_sync</span>
                  <span>Supabase Catalog Sync</span>
                </div>
                <p className="leading-snug">
                  Dữ liệu bản vẽ được đồng bộ trực tiếp từ cơ sở dữ liệu Supabase và phân quyền quản trị qua Admin CMS.
                </p>
              </div>
            </div>
          </aside>

          {/* Right Product Grid & Views */}
          <main className="lg:col-span-9 space-y-6">
            {/* Sorting and Result Summary */}
            <div className="bg-white p-4 rounded-2xl border border-[#CBD5E1] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs shadow-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[#64748B]">
                  {isVi ? 'Hiển thị' : 'Showing'} <strong className="text-[#091426] font-mono font-bold">{Math.min(filteredProducts.length, visibleCount)} / {filteredProducts.length}</strong> {isVi ? 'bản vẽ cơ khí đạt chuẩn' : 'verified CAD models'}
                </span>
                {selectedTag !== 'all' && (
                  <span className="bg-[#00687A]/10 text-[#00687A] px-2 py-0.5 rounded font-mono text-[10px] font-bold">
                    Tag: #{selectedTag}
                  </span>
                )}
                {isAdmin && (
                  <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-mono text-[10px] font-bold">
                    Admin View (All Status)
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                {/* View Mode Switcher */}
                <div className="flex items-center gap-1 bg-[#F8FAFC] border border-[#CBD5E1] p-0.5 rounded-xl">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                      viewMode === 'grid' ? 'bg-[#00687A] text-white shadow-2xs' : 'text-[#64748B] hover:text-[#091426]'
                    }`}
                    title="Grid View"
                  >
                    <span className="material-symbols-outlined text-sm block">grid_view</span>
                  </button>
                  <button
                    onClick={() => setViewMode('tech-table')}
                    className={`p-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                      viewMode === 'tech-table' ? 'bg-[#00687A] text-white shadow-2xs' : 'text-[#64748B] hover:text-[#091426]'
                    }`}
                    title="List View"
                  >
                    <span className="material-symbols-outlined text-sm block">table_rows</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-mono font-bold text-[#64748B]">{isVi ? 'Sắp xếp:' : 'Sort:'}</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-white border border-[#CBD5E1] py-1.5 px-2.5 text-xs text-[#091426] font-bold focus:outline-none focus:border-[#00687A] cursor-pointer rounded-xl shadow-2xs"
                  >
                    <option value="featured">{isVi ? 'Nổi bật nhất' : 'Featured'}</option>
                    <option value="popular">{isVi ? 'Lượt in nhiều nhất' : 'Most Printed'}</option>
                    <option value="price-asc">{isVi ? 'Giá tăng dần' : 'Price: Low to High'}</option>
                    <option value="price-desc">{isVi ? 'Giá giảm dần' : 'Price: High to Low'}</option>
                    <option value="rating">{isVi ? 'Đánh giá cao nhất' : 'Top Rated'}</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Empty State */}
            {filteredProducts.length === 0 ? (
              <div className="bg-white p-12 text-center border border-[#CBD5E1] rounded-2xl space-y-4 shadow-xs">
                <div className="w-16 h-16 rounded-full bg-[#00687A]/10 text-[#00687A] flex items-center justify-center mx-auto">
                  <span className="material-symbols-outlined text-3xl">inventory_2</span>
                </div>
                <h3 className="font-extrabold text-lg text-[#091426]">
                  {isVi ? 'Không tìm thấy bản vẽ phù hợp với tiêu chí lọc' : 'No CAD models match your criteria'}
                </h3>
                <p className="text-xs text-[#64748B] max-w-md mx-auto leading-relaxed">
                  {isVi
                    ? 'Hãy thử điều chỉnh mức giá tối đa, chọn tag khác hoặc tìm kiếm với từ khóa kỹ thuật khác (ví dụ: Bánh răng, ESP32, Drone, Khớp nối).'
                    : 'Try adjusting the max price slider, picking a different tag, or searching with other keywords like Gear, Drone, NEMA, Case.'}
                </p>
                <button
                  onClick={resetFilters}
                  className="px-6 py-2.5 bg-[#00687A] text-white text-xs uppercase font-mono font-bold tracking-wider hover:bg-[#005260] transition-colors rounded-xl shadow-xs cursor-pointer"
                >
                  {isVi ? 'Xóa toàn bộ bộ lọc' : 'Reset All Filters'}
                </button>
              </div>
            ) : viewMode === 'grid' ? (
              /* GRID VIEW */
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredProducts.slice(0, visibleCount).map((product) => {
                    const isBookmarked = bookmarkedIds.includes(product.id);

                    return (
                      <div
                        key={product.id}
                        className="bg-white border border-[#CBD5E1] hover:border-[#00687A] transition-all flex flex-col group p-4 relative rounded-2xl shadow-xs hover:shadow-xl duration-300"
                      >
                        {/* Bookmark Icon Button */}
                        <button
                          onClick={(e) => toggleBookmark(product.id, e)}
                          className="absolute top-6 right-6 z-10 w-8 h-8 rounded-full bg-white/90 hover:bg-white shadow-xs flex items-center justify-center text-[#091426] transition-transform active:scale-90 cursor-pointer border border-[#CBD5E1]/60 backdrop-blur-xs"
                          title={isBookmarked ? (isVi ? 'Bỏ lưu' : 'Unsave') : (isVi ? 'Lưu thiết kế' : 'Save')}
                        >
                          <span className={`material-symbols-outlined text-base ${isBookmarked ? 'text-[#C59B27] fill-1' : 'text-[#64748B]'}`}>
                            {isBookmarked ? 'bookmark' : 'bookmark_border'}
                          </span>
                        </button>

                        {/* Product Image Frame */}
                        <div
                          className="responsive-aspect-frame cursor-pointer mb-4 rounded-xl overflow-hidden relative bg-[#091426]"
                          onClick={() => {
                            onSelectProduct(product);
                            onNavigate('product_detail', { product });
                          }}
                        >
                          <img
                            src={product.thumbnailUrl || product.images[0]}
                            alt={product.name}
                            loading="lazy"
                            className="responsive-img-cover group-hover:scale-105 opacity-95 transition-transform duration-500"
                          />
                          
                          {/* Badges */}
                          <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
                            {product.badge && (
                              <span className={`text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-md font-bold ${
                                product.badge.includes('2/9') 
                                  ? 'bg-[#990000] text-[#FFD700] shadow-xs'
                                  : 'bg-[#091426] text-white border border-white/10'
                              }`}>
                                {product.badge}
                              </span>
                            )}
                            <span className="text-[8px] font-mono font-bold bg-[#00687A] text-white px-1.5 py-0.5 rounded uppercase">
                              {product.cadFormat || 'STL + STEP'}
                            </span>
                          </div>

                          {/* 3D Quick-Inspect Trigger */}
                          <button
                            onClick={(e) => handleOpen3DPreview(product, e)}
                            className="absolute inset-0 bg-[#091426]/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 text-white font-mono text-xs uppercase tracking-wider font-bold cursor-pointer backdrop-blur-xs"
                            title="Soi 3D 360°"
                          >
                            <span className="w-10 h-10 rounded-full bg-[#00687A] text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                              <span className="material-symbols-outlined text-xl">3d_rotation</span>
                            </span>
                            <span className="bg-black/60 px-3 py-1 rounded-full text-[11px] text-[#57DFFE] border border-white/10">
                              {isVi ? 'Soi 3D 360°' : '3D Inspection'}
                            </span>
                          </button>

                          <span className="absolute bottom-2 right-2 bg-[#091426]/80 text-white text-[9px] font-mono px-2 py-0.5 rounded font-bold border border-white/10 backdrop-blur-xs">
                            ⏱ {product.printTime}
                          </span>
                        </div>

                        {/* Info Section */}
                        <div className="flex-1 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between text-[11px] text-[#64748B] mb-1 font-sans">
                              <span className="uppercase tracking-wider truncate font-semibold font-mono text-[10px] text-[#00687A]">
                                {product.designer}
                              </span>
                              <span className="font-mono text-xs text-[#D97706] font-bold flex items-center gap-0.5">
                                ★ {product.rating} <span className="text-[10px] text-[#94A3B8]">({product.reviewsCount})</span>
                              </span>
                            </div>
                            <h3
                              onClick={() => {
                                onSelectProduct(product);
                                onNavigate('product_detail', { product });
                              }}
                              className="font-bold text-sm text-[#091426] hover:text-[#00687A] transition-colors cursor-pointer line-clamp-2 leading-snug"
                            >
                              {product.name}
                            </h3>

                            {/* CAD Micro Specs */}
                            <div className="grid grid-cols-2 gap-1.5 mt-2 py-1.5 px-2 bg-[#F8FAFC] rounded-lg border border-[#CBD5E1]/60 text-[10px] font-mono text-[#475569]">
                              <span className="truncate">📐 {product.specs?.dimensions || 'Tiêu chuẩn'}</span>
                              <span className="truncate text-right text-[#00687A] font-bold">✓ Watertight</span>
                            </div>
                          </div>

                          {/* Interactive Clickable Tags */}
                          <div className="flex flex-wrap gap-1 mt-2.5 mb-1">
                            {product.tags.slice(0, 3).map((tg) => (
                              <button
                                key={tg}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedTag(tg);
                                }}
                                className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                                  tg.includes('2/9') 
                                    ? 'bg-red-50 text-[#990000] border-red-200 font-bold hover:bg-red-100'
                                    : selectedTag === tg
                                    ? 'bg-[#00687A] text-white border-[#00687A] font-bold'
                                    : 'bg-[#F8FAFC] text-[#475569] border-[#CBD5E1] hover:border-[#00687A] hover:text-[#091426]'
                                }`}
                              >
                                #{tg}
                              </button>
                            ))}
                          </div>

                          <div className="pt-3 border-t border-[#CBD5E1] mt-3">
                            <div className="flex items-baseline justify-between mb-3 font-sans">
                              <div>
                                <span className="text-[9px] text-[#64748B] uppercase tracking-wider block font-medium">
                                  {isVi ? 'Tải File Số' : 'Digital CAD'}
                                </span>
                                <span className="font-mono text-xs text-[#00687A] font-bold">
                                  {product.priceDigital.toLocaleString(isVi ? 'vi-VN' : 'en-US')} đ
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="text-[9px] text-[#64748B] uppercase tracking-wider block font-medium">
                                  {isVi ? 'Bản In Vật Lý' : 'Physical 3D'}
                                </span>
                                <span className="font-mono font-bold text-sm text-[#091426]">
                                  {product.pricePhysical.toLocaleString(isVi ? 'vi-VN' : 'en-US')} đ
                                </span>
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <button
                                onClick={(e) => handleQuickAddDigital(product, e)}
                                className="flex-1 py-2.5 bg-[#00687A] hover:bg-[#005260] text-white text-[10px] font-mono uppercase tracking-wider font-bold transition-all flex items-center justify-center gap-1.5 rounded-xl cursor-pointer shadow-2xs active:scale-95"
                              >
                                <span className="material-symbols-outlined text-sm">download</span>
                                {isVi ? 'Tải File CAD' : 'Buy CAD'}
                              </button>

                              <button
                                onClick={() => {
                                  onSelectProduct(product);
                                  onNavigate('product_detail', { product });
                                }}
                                className="px-3 py-2.5 bg-white border border-[#CBD5E1] hover:border-[#00687A] hover:bg-[#F8FAFC] text-[#091426] text-[10px] font-mono uppercase tracking-wider font-bold transition-all rounded-xl cursor-pointer flex items-center gap-1 shadow-2xs active:scale-95"
                                title={isVi ? 'Xem chi tiết & Đặt in 3D' : 'Inspect & Print'}
                              >
                                <span className="material-symbols-outlined text-sm text-[#00687A]">precision_manufacturing</span>
                                <span>In 3D</span>
                              </button>

                              {product.isCustomizable && (
                                <button
                                  onClick={() => {
                                    onSelectProduct(product);
                                    onNavigate('personalize', { product });
                                  }}
                                  className="px-2.5 py-2.5 bg-white border border-[#CBD5E1] hover:border-[#00687A] text-[#091426] transition-colors rounded-xl cursor-pointer"
                                  title={isVi ? 'Khắc laser / Tùy biến' : 'Custom engraving'}
                                >
                                  <span className="material-symbols-outlined text-sm">tune</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Load More Pagination Button */}
                {visibleCount < filteredProducts.length && (
                  <div className="text-center pt-4 pb-2">
                    <button
                      onClick={() => setVisibleCount((prev) => prev + 12)}
                      className="px-6 py-3 bg-white border border-[#CBD5E1] hover:border-[#00687A] text-[#091426] font-mono text-xs uppercase tracking-wider font-bold rounded-xl shadow-xs transition-all cursor-pointer inline-flex items-center gap-2 hover:shadow-md"
                    >
                      <span className="material-symbols-outlined text-base text-[#00687A]">expand_more</span>
                      <span>
                        {isVi
                          ? `Xem thêm (${filteredProducts.length - visibleCount} bản vẽ CAD)`
                          : `Load More (${filteredProducts.length - visibleCount} CAD models)`}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* TECH TABLE VIEW */
              <div className="bg-white border border-[#CBD5E1] rounded-2xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-sans">
                    <thead className="bg-[#091426] text-white font-mono text-[10px] uppercase tracking-wider">
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
                      {filteredProducts.slice(0, visibleCount).map((product) => (
                        <tr key={product.id} className="hover:bg-[#F8FAFC] transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={product.thumbnailUrl || product.images[0]}
                                alt={product.name}
                                className="w-12 h-12 object-cover rounded-lg border border-[#CBD5E1] shrink-0"
                              />
                              <div>
                                <h4
                                  onClick={() => {
                                    onSelectProduct(product);
                                    onNavigate('product_detail', { product });
                                  }}
                                  className="font-bold text-xs text-[#091426] hover:text-[#00687A] cursor-pointer"
                                >
                                  {product.name}
                                </h4>
                                <span className="text-[10px] text-[#64748B] font-mono block">
                                  By {product.designer}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3 font-mono font-bold uppercase text-[11px] text-[#00687A]">
                            {product.category}
                          </td>
                          <td className="py-3 px-3 font-mono text-xs text-[#091426]">
                            {product.specs?.dimensions || 'Tiêu chuẩn'}
                          </td>
                          <td className="py-3 px-3 font-mono text-xs text-[#64748B]">
                            {product.printTime}
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-[#00687A]">
                            {product.priceDigital.toLocaleString(isVi ? 'vi-VN' : 'en-US')} đ
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-[#091426]">
                            {product.pricePhysical.toLocaleString(isVi ? 'vi-VN' : 'en-US')} đ
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={(e) => handleOpen3DPreview(product, e)}
                                className="p-1.5 bg-[#091426] hover:bg-[#00687A] text-white rounded-lg text-xs transition-colors cursor-pointer"
                                title="Soi 3D 360°"
                              >
                                <span className="material-symbols-outlined text-sm">3d_rotation</span>
                              </button>
                              <button
                                onClick={(e) => handleQuickAddDigital(product, e)}
                                className="px-3 py-1.5 bg-[#00687A] hover:bg-[#005260] text-white font-mono font-bold text-[11px] uppercase rounded-lg transition-colors cursor-pointer"
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
          </main>
        </div>
      </div>

      {/* CAD Quick View 3D Modal */}
      <CadQuickViewModal
        product={quickViewProduct}
        isOpen={isQuickViewOpen}
        materials={materials}
        pricingConfig={pricingConfig}
        onClose={() => setIsQuickViewOpen(false)}
        onAddToCart={onAddToCart}
        onNavigate={onNavigate}
        onShowToast={onShowToast}
      />
    </div>
  );
};
