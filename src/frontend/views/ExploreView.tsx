import React, { useState, useMemo, useEffect } from 'react';
import { Product, CartItem, MaterialProfile, InkiriCostFormulaConfig } from '../types';
import { CATEGORIES, POPULAR_TAGS, MATERIALS_CATALOG, DEFAULT_INKIRI_FORMULA_CONFIG } from '../data/mockData';
import { CadQuickViewModal } from '../components/CadQuickViewModal';
import { useLanguage } from '../context/LanguageContext';

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
  const isVi = language === 'vi';

  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [searchQuery, setSearchQuery] = useState<string>(initialSearch);
  const [selectedTag, setSelectedTag] = useState<string>(initialTag);
  const [selectedMaterial, setSelectedMaterial] = useState<string>('all');
  const [priceMax, setPriceMax] = useState<number>(500000);
  const [onlyCustomizable, setOnlyCustomizable] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'rating'>('featured');
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>(['prod-arduino-case']);
  const [mobileFilterOpen, setMobileFilterOpen] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'grid' | 'tech-table'>('grid');

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
    setBookmarkedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
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

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
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

      // Search filter (searches in name, designer, description, and tags)
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim();
        const matchName = p.name.toLowerCase().includes(q);
        const matchDesigner = p.designer.toLowerCase().includes(q);
        const matchTags = p.tags.some(t => t.toLowerCase().includes(q));
        const matchSku = p.sku ? p.sku.toLowerCase().includes(q) : false;
        if (!matchName && !matchDesigner && !matchTags && !matchSku) return false;
      }

      // Material filter
      if (selectedMaterial !== 'all') {
        const hasMat = p.supportedMaterials.some(m => m.toLowerCase().includes(selectedMaterial.toLowerCase()));
        if (!hasMat) return false;
      }

      // Price filter
      if (p.pricePhysical > priceMax) {
        return false;
      }

      // Customizable filter
      if (onlyCustomizable && !p.isCustomizable) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'price-asc') return a.pricePhysical - b.pricePhysical;
      if (sortBy === 'price-desc') return b.pricePhysical - a.pricePhysical;
      if (sortBy === 'rating') return b.rating - a.rating;
      return 0; // featured default
    });
  }, [products, selectedCategory, selectedTag, searchQuery, selectedMaterial, priceMax, onlyCustomizable, sortBy]);

  const materialsList = ['PLA Tough', 'PETG', 'ABS', 'Resin 8K', 'TPU'];

  const resetFilters = () => {
    setSelectedCategory('all');
    setSelectedTag('all');
    setSelectedMaterial('all');
    setPriceMax(500000);
    setOnlyCustomizable(false);
    setSearchQuery('');
  };

  return (
    <div className="min-h-screen bg-[#F7F6F2] text-[#1C1C1C] py-6 sm:py-10 px-4 sm:px-6 md:px-12 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Editorial Header Title */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 sm:gap-6 pb-6 border-b border-black/10">
          <div>
            <span className="font-tech text-[10px] uppercase tracking-[0.25em] text-[#00687A] font-bold block mb-1">
              Curated Index // VCUBE Archive
            </span>
            <h1 className="fluid-h1 text-[#1C1C1C]">
              {isVi ? 'Bộ Sưu Tập & Bản Vẽ Kỹ Thuật CAD' : 'Engineering CAD & Physical Catalog'}
            </h1>
            <p className="text-xs sm:text-sm text-[#7D7565] mt-1 font-serif">
              {isVi
                ? `Hơn ${products.length * 20} thiết kế cơ khí chính xác được kiểm định ứng suất và cấp phép sản xuất bồi đắp.`
                : `Over ${products.length * 20} precision mechanical designs stress-tested and certified for fabrication.`}
            </p>
          </div>

          {/* Quick Search */}
          <div className="relative w-full md:w-80">
            <input
              type="text"
              placeholder={t('searchPlaceholder', 'Tìm theo tên, tag (vd: 2/9, IoT)...', 'Search by name, tag (e.g. 2/9, IoT)...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 bg-white border border-black/15 text-xs text-[#1C1C1C] placeholder-[#8C857B] focus:outline-none focus:border-[#00687A] rounded-lg shadow-2xs font-sans"
            />
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#7D7565] text-base">
              search
            </span>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-[#7D7565] hover:text-[#1C1C1C] text-xs p-0.5 cursor-pointer"
                aria-label="Clear search"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            )}
          </div>
        </div>

        {/* Popular Tag Filter Chips Bar */}
        <div className="bg-white p-3 sm:p-4 rounded-xl border border-black/10 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-tech font-bold text-[#545F73] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm text-[#00687A]">sell</span>
              {t('filterByTag', 'Lọc nhanh theo Tag:', 'Filter by Tag:')}
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

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {POPULAR_TAGS.map((tag) => {
              const isActive = selectedTag === tag.id;
              const is29 = tag.id === '2/9';

              return (
                <button
                  key={tag.id}
                  onClick={() => setSelectedTag(tag.id)}
                  className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap shrink-0 transition-all flex items-center gap-1.5 cursor-pointer touch-target-btn ${
                    isActive
                      ? is29
                        ? 'bg-[#990000] text-white font-extrabold shadow-sm'
                        : 'bg-[#00687A] text-white font-bold shadow-sm'
                      : is29
                      ? 'bg-red-50 text-[#990000] border border-red-200 hover:bg-red-100 font-bold'
                      : 'bg-[#F8FAFC] text-[#545F73] border border-black/10 hover:border-black/30 hover:text-[#1C1C1C]'
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

        {/* Mobile Filter Toggle Button */}
        <div className="lg:hidden flex items-center justify-between gap-3">
          <button
            onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
            className="flex-1 py-3 px-4 bg-white border border-black/15 text-xs uppercase tracking-wider font-bold flex items-center justify-center gap-2 shadow-2xs rounded-lg cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">tune</span>
            {mobileFilterOpen ? (isVi ? 'Đóng Bộ Lọc' : 'Close Filters') : (isVi ? 'Mở Bộ Lọc Nâng Cao' : 'Open Advanced Filters')}
          </button>
          <button
            onClick={resetFilters}
            className="py-3 px-4 bg-[#EFECE6] border border-black/10 text-xs uppercase tracking-wider text-[#7D7565] rounded-lg font-bold cursor-pointer"
          >
            {isVi ? 'Đặt lại' : 'Reset'}
          </button>
        </div>

        {/* Main Grid: Filters Sidebar + Products */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
          {/* Left Sidebar Filters */}
          <aside className={`lg:col-span-3 space-y-6 ${mobileFilterOpen ? 'block' : 'hidden lg:block'}`}>
            <div className="bg-white p-5 sm:p-6 border border-black/10 rounded-xl shadow-2xs space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-black/10">
                <span className="font-serif font-bold text-sm text-[#1C1C1C] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base text-[#00687A]">tune</span>
                  {t('filterOptions', 'Bộ Lọc Phân Loại', 'Filter Options')}
                </span>
                <button
                  onClick={resetFilters}
                  className="text-[10px] font-tech uppercase tracking-wider text-[#7D7565] hover:text-[#00687A] underline cursor-pointer"
                >
                  {t('clearAll', 'Xóa bộ lọc', 'Clear all')}
                </button>
              </div>

              {/* Category Filter */}
              <div>
                <label className="text-[10px] font-tech uppercase tracking-[0.2em] text-[#7D7565] font-bold block mb-3">
                  {isVi ? 'Danh Mục Bản Vẽ' : 'CAD Categories'}
                </label>
                <div className="space-y-1">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setSelectedCategory(cat.id);
                        if (window.innerWidth < 1024) setMobileFilterOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors flex items-center justify-between cursor-pointer ${
                        selectedCategory === cat.id
                          ? 'bg-[#00687A] text-white font-bold'
                          : 'text-[#1C1C1C] hover:bg-[#F8FAFC]'
                      }`}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <span className="material-symbols-outlined text-sm opacity-70">{cat.icon}</span>
                        {isVi ? cat.name : (cat as any).nameEn || cat.name}
                      </span>
                      <span className="font-tech text-[10px] opacity-70 shrink-0 ml-2">{cat.count}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Material Filter */}
              <div>
                <label className="text-[10px] font-tech uppercase tracking-[0.2em] text-[#7D7565] font-bold block mb-3">
                  {t('printMaterial', 'Vật Liệu In', 'Print Material')}
                </label>
                <div className="space-y-1.5">
                  <button
                    onClick={() => setSelectedMaterial('all')}
                    className={`w-full text-left px-3 py-1.5 text-xs rounded transition-colors ${
                      selectedMaterial === 'all'
                        ? 'bg-black/10 text-[#1C1C1C] font-bold'
                        : 'text-[#7D7565] hover:text-[#1C1C1C]'
                    }`}
                  >
                    {t('allMaterials', 'Tất cả vật liệu', 'All materials')}
                  </button>
                  {materialsList.map((mat) => (
                    <button
                      key={mat}
                      onClick={() => setSelectedMaterial(mat)}
                      className={`w-full text-left px-3 py-1.5 text-xs rounded transition-colors flex items-center justify-between cursor-pointer ${
                        selectedMaterial === mat
                          ? 'bg-[#00687A] text-white font-bold'
                          : 'text-[#7D7565] hover:text-[#1C1C1C] hover:bg-[#F8FAFC]'
                      }`}
                    >
                      <span>{mat}</span>
                      <span className="text-[10px] font-tech opacity-70">FDM/SLA</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Range Slider */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[10px] font-tech uppercase tracking-[0.2em] text-[#7D7565] font-bold">
                    {t('maxPrice', 'Mức Giá Tối Đa', 'Max Price')}
                  </label>
                  <span className="font-tech font-bold text-xs text-[#00687A]">
                    {priceMax.toLocaleString(isVi ? 'vi-VN' : 'en-US')} đ
                  </span>
                </div>
                <input
                  type="range"
                  min="50000"
                  max="500000"
                  step="10000"
                  value={priceMax}
                  onChange={(e) => setPriceMax(Number(e.target.value))}
                  className="w-full accent-[#00687A] cursor-pointer"
                />
                <div className="flex justify-between text-[9px] font-tech text-[#7D7565] mt-1">
                  <span>50k đ</span>
                  <span>500k đ</span>
                </div>
              </div>

              {/* Toggle Customizable Only */}
              <div className="pt-2 border-t border-black/10">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={onlyCustomizable}
                    onChange={(e) => setOnlyCustomizable(e.target.checked)}
                    className="w-4 h-4 accent-[#00687A] cursor-pointer rounded"
                  />
                  <span className="text-xs text-[#1C1C1C]">
                    {t('supportsCustom', 'Hỗ trợ khắc tên & tùy biến', 'Supports custom text & sizing')}
                  </span>
                </label>
              </div>
            </div>
          </aside>

          {/* Right Product Grid */}
          <main className="lg:col-span-9 space-y-6">
            {/* Sorting and Result Summary */}
            <div className="bg-white p-4 rounded-xl border border-black/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs shadow-2xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[#7D7565]">
                  {t('showingProducts', 'Hiển thị', 'Showing')} <strong className="text-[#1C1C1C] font-tech font-bold">{filteredProducts.length}</strong> {t('verifiedCadFiles', 'bản vẽ cơ khí đạt chuẩn', 'verified engineering CAD files')}
                </span>
                {selectedTag !== 'all' && (
                  <span className="bg-[#E5EEFF] text-[#00687A] px-2 py-0.5 rounded font-tech text-[10px] font-bold">
                    Tag: #{selectedTag}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                {/* View Mode Switcher */}
                <div className="flex items-center gap-1 bg-[#F8FAFC] border border-[#CBD5E1] p-0.5 rounded-lg">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1 rounded text-xs transition-colors ${
                      viewMode === 'grid' ? 'bg-[#00687A] text-white' : 'text-[#545F73] hover:text-[#1C1C1C]'
                    }`}
                    title="Grid View"
                  >
                    <span className="material-symbols-outlined text-sm">grid_view</span>
                  </button>
                  <button
                    onClick={() => setViewMode('tech-table')}
                    className={`p-1 rounded text-xs transition-colors ${
                      viewMode === 'tech-table' ? 'bg-[#00687A] text-white' : 'text-[#545F73] hover:text-[#1C1C1C]'
                    }`}
                    title="List View"
                  >
                    <span className="material-symbols-outlined text-sm">view_list</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-bold text-[#7D7565]">{t('sortBy', 'Sắp xếp:', 'Sort:')}</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-transparent border border-black/15 py-1.5 px-2.5 text-xs text-[#1C1C1C] font-bold focus:outline-none focus:border-[#00687A] cursor-pointer rounded-lg"
                  >
                    <option value="featured">{t('sortFeatured', 'Nổi bật nhất', 'Featured')}</option>
                    <option value="price-asc">{t('sortPriceAsc', 'Giá tăng dần', 'Price: Low to High')}</option>
                    <option value="price-desc">{t('sortPriceDesc', 'Giá giảm dần', 'Price: High to Low')}</option>
                    <option value="rating">{t('sortRating', 'Đánh giá cao nhất', 'Top Rated')}</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Empty State */}
            {filteredProducts.length === 0 ? (
              <div className="bg-white p-12 text-center border border-black/10 rounded-xl space-y-4 shadow-2xs">
                <span className="material-symbols-outlined text-4xl text-[#7D7565]">inventory_2</span>
                <h3 className="font-serif font-bold text-lg text-[#1C1C1C]">
                  {t('noProductsFound', 'Không tìm thấy bản vẽ phù hợp với tiêu chí lọc', 'No matching models found for selected filters')}
                </h3>
                <p className="text-xs text-[#7D7565] max-w-md mx-auto font-serif">
                  {isVi
                    ? 'Hãy thử điều chỉnh mức giá tối đa, chọn tag khác hoặc tìm kiếm với từ khóa khác (ví dụ: 2/9, IoT, Gear, NEMA).'
                    : 'Try adjusting the max price slider, picking a different tag, or searching with keywords like 2/9, IoT, Gear, NEMA.'}
                </p>
                <button
                  onClick={resetFilters}
                  className="px-6 py-2.5 bg-[#00687A] text-white text-xs uppercase font-bold tracking-widest hover:bg-[#005463] transition-colors rounded-lg cursor-pointer"
                >
                  {t('resetAllFilters', 'Xóa toàn bộ bộ lọc', 'Reset All Filters')}
                </button>
              </div>
            ) : viewMode === 'grid' ? (
              /* GRID VIEW */
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredProducts.map((product) => {
                  const isBookmarked = bookmarkedIds.includes(product.id);

                  return (
                    <div
                      key={product.id}
                      className="bg-white border border-[#CBD5E1] hover:border-[#00687A] transition-all flex flex-col group p-4 relative rounded-xl shadow-2xs hover:shadow-lg"
                    >
                      {/* Bookmark Icon Button */}
                      <button
                        onClick={(e) => toggleBookmark(product.id, e)}
                        className="absolute top-6 right-6 z-10 w-8 h-8 rounded-full bg-white/90 hover:bg-white shadow-sm flex items-center justify-center text-[#1C1C1C] transition-transform active:scale-90 cursor-pointer"
                        title={isBookmarked ? (isVi ? 'Bỏ lưu' : 'Unsave') : (isVi ? 'Lưu thiết kế' : 'Save')}
                      >
                        <span className={`material-symbols-outlined text-base ${isBookmarked ? 'text-[#C59B27] fill-1' : 'text-[#7D7565]'}`}>
                          {isBookmarked ? 'bookmark' : 'bookmark_border'}
                        </span>
                      </button>

                      {/* Product Image Frame */}
                      <div
                        className="responsive-aspect-frame cursor-pointer mb-4 rounded-lg overflow-hidden relative bg-[#091426]"
                        onClick={() => {
                          onSelectProduct(product);
                          onNavigate('product_detail', { product });
                        }}
                      >
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="responsive-img-cover group-hover:scale-105 opacity-95 transition-transform duration-300"
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

                        {/* 3D Quick-Inspect Trigger */}
                        <button
                          onClick={(e) => handleOpen3DPreview(product, e)}
                          className="absolute inset-0 bg-[#091426]/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 text-white font-tech text-xs uppercase tracking-wider font-bold cursor-pointer"
                          title="Soi 3D 360°"
                        >
                          <span className="w-9 h-9 rounded-full bg-[#00687A] text-white flex items-center justify-center shadow-md">
                            <span className="material-symbols-outlined text-lg">3d_rotation</span>
                          </span>
                          <span className="bg-black/50 px-2.5 py-0.5 rounded text-[11px] text-[#57DFFE]">
                            {isVi ? 'Xem 3D 360°' : '3D Preview'}
                          </span>
                        </button>

                        <span className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-xs text-[#1C1C1C] text-[9px] font-tech px-2 py-0.5 rounded font-bold">
                          {product.printTime}
                        </span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between text-[11px] text-[#7D7565] mb-1 font-sans">
                            <span className="uppercase tracking-wider truncate font-semibold font-tech">{product.designer}</span>
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
                        </div>

                        {/* Interactive Clickable Tags */}
                        <div className="flex flex-wrap gap-1 mt-2.5 mb-1">
                          {product.tags.map((tg) => (
                            <button
                              key={tg}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTag(tg);
                              }}
                              className={`text-[9px] font-tech uppercase px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                                tg.includes('2/9') 
                                  ? 'bg-red-50 text-[#990000] border-red-200 font-bold hover:bg-red-100'
                                  : selectedTag === tg
                                  ? 'bg-[#00687A] text-white border-[#00687A] font-bold'
                                  : 'bg-[#F8FAFC] text-[#545F73] border-black/10 hover:border-black/30 hover:text-[#1C1C1C]'
                              }`}
                            >
                              #{tg}
                            </button>
                          ))}
                        </div>

                        <div className="pt-3 border-t border-black/10 mt-3">
                          <div className="flex items-baseline justify-between mb-3 font-sans">
                            <div>
                              <span className="text-[9px] text-[#7D7565] uppercase tracking-wider block font-medium">
                                {t('digitalAsset', 'File Số (STL/STEP)', 'Digital Asset')}
                              </span>
                              <span className="font-tech text-xs text-[#00687A] font-bold">
                                {product.priceDigital.toLocaleString(isVi ? 'vi-VN' : 'en-US')} đ
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-[9px] text-[#7D7565] uppercase tracking-wider block font-medium">
                                {t('physicalModel', 'Bản In Vật Lý', 'Physical Model')}
                              </span>
                              <span className="font-tech font-bold text-sm text-[#1C1C1C]">
                                {product.pricePhysical.toLocaleString(isVi ? 'vi-VN' : 'en-US')} đ
                              </span>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={(e) => handleQuickAddDigital(product, e)}
                              className="flex-1 py-2.5 bg-[#00687A] hover:bg-[#005463] text-white text-[10px] font-tech uppercase tracking-widest font-bold transition-colors flex items-center justify-center gap-1.5 touch-target-btn rounded-lg cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-sm">download</span>
                              {t('buyDigital', 'Tải File CAD', 'Buy CAD')}
                            </button>

                            <button
                              onClick={() => {
                                onSelectProduct(product);
                                onNavigate('product_detail', { product });
                              }}
                              className="px-3 py-2.5 bg-white border border-[#CBD5E1] hover:bg-black/5 text-[#1C1C1C] text-[10px] font-tech uppercase tracking-widest font-bold transition-colors rounded-lg cursor-pointer flex items-center gap-1"
                              title="Xem chi tiết & Đặt in"
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
                                className="px-2.5 py-2.5 bg-white border border-black/20 hover:bg-black/5 text-[#1C1C1C] text-[10px] font-sans uppercase tracking-widest transition-colors rounded-lg cursor-pointer"
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
            ) : (
              /* TABLE VIEW */
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
                      {filteredProducts.map((product) => (
                        <tr key={product.id} className="hover:bg-[#F8FAFC] transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={product.images[0]}
                                alt={product.name}
                                className="w-12 h-12 object-cover rounded-lg border border-[#CBD5E1] shrink-0"
                              />
                              <div>
                                <h4
                                  onClick={() => {
                                    onSelectProduct(product);
                                    onNavigate('product_detail', { product });
                                  }}
                                  className="font-serif font-bold text-sm text-[#1C1C1C] hover:text-[#00687A] cursor-pointer"
                                >
                                  {product.name}
                                </h4>
                                <span className="text-[10px] text-[#545F73] font-tech block">
                                  By {product.designer}
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
