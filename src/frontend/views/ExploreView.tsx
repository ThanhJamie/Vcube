import React, { useState, useMemo, useEffect } from 'react';
import { Star } from 'lucide-react';
import { Product, CartItem, MaterialProfile, InkiriCostFormulaConfig } from '../types';
import { CATEGORIES, POPULAR_TAGS } from '../data/mockData';
import { CadQuickViewModal } from '../components/CadQuickViewModal';
import { SEOHead } from '../components/SEOHead';
import { HorizontalScrollFilter } from '../components/HorizontalScrollFilter';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { Icon, Badge, Button, Card, EmptyState, InfoTip, Sheet, Skeleton } from '@frontend/ui';
import { EMPTY_VALUE } from '@frontend/lib/format';

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

type PricePreset = 'all' | 'under100' | '100to250' | '250to500' | 'above500';

/**
 * Cửa sổ chờ catalog ngay sau lần vẽ đầu tiên.
 *
 * `App.tsx` đọc `products` từ Supabase rồi chỉ truyền xuống MẢNG kết quả — view không nhận
 * được cờ "đang tải". Nếu dựng empty state ngay lập tức, khách sẽ đọc thấy "kho trống" trong
 * lúc lượt đọc đầu còn đang bay. Vì vậy giữ skeleton trong một cửa sổ ngắn: có sản phẩm thật
 * ⇒ skeleton tắt ngay; hết cửa sổ mà vẫn rỗng ⇒ mới hiện empty state thật.
 */
const CATALOG_HYDRATION_WINDOW_MS = 1200;

/** Skeleton khớp lưới 1/2/3 cột: 6 thẻ = 2 hàng đầy ở desktop. */
const SKELETON_CARD_COUNT = 6;

/** Bậc giá nhanh — chỉ là tiêu chí lọc, không phải số liệu về kho. */
const PRICE_PRESETS: { id: PricePreset; vi: string; en: string }[] = [
  { id: 'under100', vi: '< 100k đ', en: '< 100k' },
  { id: '100to250', vi: '100k - 250k', en: '100k - 250k' },
  { id: '250to500', vi: '250k - 500k', en: '250k - 500k' },
  { id: 'above500', vi: '> 500k đ', en: '> 500k' },
];

/**
 * Nhận diện số hữu hạn do DB trả về. `NULL` được map thành 0 và chuỗi lạ KHÔNG phải giá.
 * Cùng quy ước với `HomeView`/`ProductDetailView`: chỉ giá kênh `> 0` mới là CÓ BÁN.
 */
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Giá chưa có/chưa cấu hình ⇒ `—`, KHÔNG in "0 đ" như một mức giá thật. */
const formatVnd = (value: number, locale: string): string =>
  Number.isFinite(value) && value > 0 ? `${value.toLocaleString(locale)} đ` : EMPTY_VALUE;

/**
 * `rating`/`reviewsCount` là dữ liệu THẬT của DB (cột đã gỡ default ⇒ có thể NULL).
 * Chỉ khi CÓ cả điểm > 0 và lượt đánh giá > 0 mới được hiện sao. Mọi trường hợp còn lại
 * (NULL, 0, NaN, chuỗi lạ) ⇒ "Chưa có đánh giá" — KHÔNG "★ 0", KHÔNG "NaN".
 */
const ratingOf = (product: Product): { value: number; count: number } | null => {
  const value = Number(product?.rating);
  const count = Number(product?.reviewsCount);
  if (!Number.isFinite(value) || value <= 0) return null;
  if (!Number.isFinite(count) || count <= 0) return null;
  return { value, count };
};

/**
 * `license_type` NULL ⇒ nói thẳng người bán chưa khai báo. KHÔNG đoán hộ "Commercial"
 * (gate `check-fabricated.mjs` mục `fake-license-fallback`).
 */
const licenseLabel = (license?: string | null): string => {
  const value = typeof license === 'string' ? license.trim() : '';
  return value ? value : `${EMPTY_VALUE} (người bán chưa khai báo)`;
};

/** Thẻ xương đúng layout thẻ thật (khung ảnh 4:3, 2 dòng tiêu đề, dòng giá, 2 nút). */
const ProductCardSkeleton: React.FC = () => (
  <Card padding="none" className="flex flex-col overflow-hidden">
    <div className="aspect-[4/3] w-full overflow-hidden">
      <Skeleton variant="rect" rounded="lg" height="100%" className="h-full w-full" />
    </div>
    <div className="flex flex-col gap-2.5 p-4">
      <Skeleton variant="text" width="45%" />
      <Skeleton variant="text" lines={2} />
      <Skeleton variant="text" width="70%" />
      <div className="flex items-center justify-between gap-3 pt-1">
        <Skeleton variant="text" width="6ch" />
        <Skeleton variant="text" width="7ch" />
      </div>
      <div className="flex items-center gap-2 pt-1">
        <Skeleton variant="rect" rounded="md" height="2.5rem" className="flex-1" />
        <Skeleton variant="rect" rounded="md" height="2.5rem" width="5.5rem" />
      </div>
    </div>
  </Card>
);

export const ExploreView: React.FC<ExploreViewProps> = ({
  products,
  materials = [],
  // KHÔNG mặc định về bộ số mẫu: thiếu cấu hình ⇒ view này không tự bịa thông số giá.
  // (`pricingConfig` chỉ được chuyển tiếp xuống `CadQuickViewModal`.)
  pricingConfig,
  initialCategory = 'all',
  initialSearch = '',
  initialTag = 'all',
  onAddToCart,
  onNavigate,
  onSelectProduct,
  onShowToast
}) => {
  const { language } = useLanguage();
  const { role } = useAuth();
  const isVi = language === 'vi';
  const isAdmin = role === 'admin';
  const numberLocale = isVi ? 'vi-VN' : 'en-US';

  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [searchQuery, setSearchQuery] = useState<string>(initialSearch);
  const [selectedTag, setSelectedTag] = useState<string>(initialTag);
  const [selectedMaterial, setSelectedMaterial] = useState<string>('all');
  const [pricePreset, setPricePreset] = useState<PricePreset>('all');
  /** `null` = chưa đặt trần giá; trần thật được suy từ giá sản phẩm (xem `priceRange`). */
  const [priceMax, setPriceMax] = useState<number | null>(null);
  const [onlyCustomizable, setOnlyCustomizable] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'rating' | 'popular'>('featured');
  // Không khởi tạo sẵn bản vẽ "đã lưu" nào — đó phải là dữ liệu của chính khách.
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [mobileFilterOpen, setMobileFilterOpen] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'grid' | 'tech-table'>('grid');
  const [visibleCount, setVisibleCount] = useState<number>(12);
  const [hydrationWindowOpen, setHydrationWindowOpen] = useState<boolean>(true);

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

  // Skeleton chỉ giữ trong cửa sổ chờ đầu tiên; có sản phẩm thật ⇒ tắt ngay.
  useEffect(() => {
    if (products.length > 0) {
      setHydrationWindowOpen(false);
      return;
    }
    const timer = window.setTimeout(() => setHydrationWindowOpen(false), CATALOG_HYDRATION_WINDOW_MS);
    return () => window.clearTimeout(timer);
  }, [products.length]);

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
    // Data-honesty: `price_digital` không lớn hơn 0 (0 hoặc NULL/NaN) nghĩa là người bán KHÔNG
    // bán kênh file số ⇒ KHÔNG được đẩy vào giỏ một dòng 0đ. Chỉ giá `> 0` mới là CÓ BÁN.
    if (!(isNum(product.priceDigital) && product.priceDigital > 0)) {
      onShowToast?.(isVi
        ? `Sản phẩm "${product.name}" không mở bán kênh file số (giá file số không lớn hơn 0) nên chưa thể mua.`
        : `"${product.name}" is not sold as a CAD file (its CAD price is not greater than 0), so it cannot be purchased.`);
      return;
    }
    const item: CartItem = {
      id: `cart-digital-${Date.now()}-${Math.random()}`,
      productId: product.id,
      type: 'digital',
      name: product.name,
      designer: product.designer,
      image: product.images?.[0] || product.thumbnailUrl || '',
      price: product.priceDigital,
      quantity: 1,
      // Data-honesty (P3b): KHONG doan ho giay phep/dinh dang tep khi san pham chua khai.
      fileFormat: product.cadFormat ?? undefined,
      licenseType: product.licenseType ?? undefined
    };
    onAddToCart(item);
    if (onShowToast) {
      onShowToast(isVi ? `Đã thêm File CAD "${product.name}" vào giỏ!` : `Added CAD File "${product.name}" to cart!`);
    }
  };

  /** Tập sản phẩm vai trò hiện tại thực sự được thấy — MỌI con số hiển thị tính trên tập này. */
  const catalogProducts = useMemo(
    () => (isAdmin ? products : products.filter((p) => (p.status || 'published').toLowerCase() === 'published')),
    [products, isAdmin]
  );

  // Số lượng theo danh mục: đếm từ sản phẩm thật. Danh mục không có bản vẽ ⇒ không hiện số.
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    catalogProducts.forEach((p) => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return counts;
  }, [catalogProducts]);

  // Vật liệu lấy từ bảng `materials` thật; rỗng ⇒ ẩn cả nhóm lọc.
  const materialOptions = useMemo(() => {
    const names = new Set<string>();
    materials.forEach((m) => {
      const name = (m?.name || '').trim();
      if (name) names.add(name);
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [materials]);

  // Khoảng giá suy từ giá sản phẩm; không có giá thật ⇒ không dựng thanh giá.
  const priceRange = useMemo(() => {
    const values = catalogProducts.map((p) => p.pricePhysical).filter((v) => Number.isFinite(v) && v > 0);
    if (values.length === 0) return null;
    const max = Math.max(...values);
    const step = max <= 200000 ? 25000 : max <= 1000000 ? 50000 : 100000;
    return {
      min: Math.max(0, Math.floor(Math.min(...values) / step) * step),
      ceiling: Math.max(step, Math.ceil(max / step) * step),
      step
    };
  }, [catalogProducts]);

  const handleSelectPricePreset = (preset: PricePreset) => {
    setPricePreset(preset);
    if (preset === 'all') setPriceMax(null);
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
        const tags = p.tags || [];
        const features = p.features || [];
        let matchTag = false;
        if (qTag === 'mechanical') {
          matchTag = p.category === 'mechanical' || tags.some(t => t.toLowerCase().includes('cơ khí') || t.toLowerCase().includes('mechanical'));
        } else if (qTag === 'iot') {
          matchTag = p.category === 'iot' || tags.some(t => t.toLowerCase().includes('iot') || t.toLowerCase().includes('arduino') || t.toLowerCase().includes('esp32'));
        } else if (qTag === 'robotics') {
          matchTag = tags.some(t => t.toLowerCase().includes('robot') || t.toLowerCase().includes('nema') || t.toLowerCase().includes('drone'));
        } else if (qTag === 'snap-fit') {
          matchTag = tags.some(t => t.toLowerCase().includes('snap-fit')) || features.some(f => f.toLowerCase().includes('snap-fit'));
        } else if (qTag === 'resin-8k') {
          matchTag = (p.supportedMaterials || []).some(m => m.toLowerCase().includes('resin')) || tags.some(t => t.toLowerCase().includes('resin'));
        } else if (qTag === 'decor') {
          matchTag = p.category === 'tabletop' || tags.some(t => t.toLowerCase().includes('decor') || t.toLowerCase().includes('parametric') || t.toLowerCase().includes('vase'));
        } else if (qTag === 'bán-chạy') {
          matchTag = (p.salesCount && p.salesCount > 100) || p.badge === 'BÁN CHẠY' || tags.some(t => t.toLowerCase().includes('bán chạy'));
        } else {
          matchTag = tags.some(t => t.toLowerCase().includes(qTag));
        }
        if (!matchTag) return false;
      }

      // Search filter
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim();
        const matchName = p.name.toLowerCase().includes(q);
        const matchDesigner = (p.designer || '').toLowerCase().includes(q);
        const matchTags = (p.tags || []).some(t => t.toLowerCase().includes(q));
        const matchSku = p.sku ? p.sku.toLowerCase().includes(q) : false;
        const matchMat = (p.supportedMaterials || []).some(m => m.toLowerCase().includes(q));
        if (!matchName && !matchDesigner && !matchTags && !matchSku && !matchMat) return false;
      }

      // Material filter — chỉ áp dụng khi có danh mục vật liệu thật để chọn
      if (selectedMaterial !== 'all' && materialOptions.length > 0) {
        const hasMat = (p.supportedMaterials || []).some(m => m.toLowerCase().includes(selectedMaterial.toLowerCase()));
        if (!hasMat) return false;
      }

      // Price preset & range filter
      if (pricePreset === 'under100' && p.pricePhysical > 100000) return false;
      if (pricePreset === '100to250' && (p.pricePhysical < 100000 || p.pricePhysical > 250000)) return false;
      if (pricePreset === '250to500' && (p.pricePhysical < 250000 || p.pricePhysical > 500000)) return false;
      if (pricePreset === 'above500' && p.pricePhysical < 500000) return false;
      if (pricePreset === 'all' && priceMax !== null && p.pricePhysical > priceMax) return false;

      // Customizable filter
      if (onlyCustomizable && !p.isCustomizable) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'price-asc') return a.pricePhysical - b.pricePhysical;
      if (sortBy === 'price-desc') return b.pricePhysical - a.pricePhysical;
      // D8: `rating` NULL/undefined coi như 0 (KHÔNG có đánh giá) nên luôn nằm CUỐI khi sắp
      // xếp giảm dần; tránh `undefined - number = NaN` làm thứ tự nhảy lung tung.
      if (sortBy === 'rating') return (Number(b.rating) || 0) - (Number(a.rating) || 0);
      if (sortBy === 'popular') return (b.printsCount || 0) - (a.printsCount || 0);
      return 0; // featured default
    });
  }, [products, selectedCategory, selectedTag, searchQuery, selectedMaterial, materialOptions, pricePreset, priceMax, onlyCustomizable, sortBy, isAdmin]);

  const resetFilters = () => {
    setSelectedCategory('all');
    setSelectedTag('all');
    setSelectedMaterial('all');
    setPricePreset('all');
    setPriceMax(null);
    setOnlyCustomizable(false);
    setSearchQuery('');
  };

  const renderedProducts = filteredProducts.slice(0, visibleCount);
  const isCatalogLoading = hydrationWindowOpen && products.length === 0;
  const catalogIsEmpty = catalogProducts.length === 0;
  const hasActiveFilters = selectedCategory !== 'all' || selectedTag !== 'all' || (selectedMaterial !== 'all' && materialOptions.length > 0) || pricePreset !== 'all' || priceMax !== null || onlyCustomizable || searchQuery.trim() !== '';
  const goToQuote = () => onNavigate('quote');

  /**
   * Bộ lọc dùng CHUNG cho cột trái (desktop) và bottom-sheet (mobile). Dựng bằng hàm để hai
   * bản không dùng lại cùng một cây element (tránh trùng `id`/`name` giữa 2 chỗ render).
   */
  const renderFilters = () => (
    <div className="space-y-6">
      {/* Category Filter with counts from real products */}
      <div>
        <p className="text-xs font-mono uppercase tracking-[0.2em] text-fg-subtle font-bold block mb-2.5">
          {isVi ? 'Danh Mục Bản Vẽ' : 'CAD Categories'}
        </p>
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`w-full text-left px-3 py-2 text-xs rounded-md transition-all flex items-center justify-between cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              selectedCategory === 'all'
                ? 'bg-primary text-primary-fg font-bold'
                : 'text-fg-muted hover:bg-canvas hover:text-fg'
            }`}
          >
            <span className="flex items-center gap-2 truncate">
              <Icon name="select_all" size={18} />
              <span>{isVi ? 'Tất cả danh mục' : 'All Categories'}</span>
            </span>
            {catalogProducts.length > 0 && (
              <span className="font-mono text-xs tabular-nums shrink-0 ml-2">({catalogProducts.length})</span>
            )}
          </button>

          {CATEGORIES.filter(c => c.id !== 'all').map((cat) => {
            const count = categoryCounts[cat.id] || 0;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`w-full text-left px-3 py-2 text-xs rounded-md transition-all flex items-center justify-between cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  selectedCategory === cat.id
                    ? 'bg-primary text-primary-fg font-bold'
                    : 'text-fg-muted hover:bg-canvas hover:text-fg'
                }`}
              >
                <span className="flex items-center gap-2 truncate">
                  <Icon name={cat.icon} size={18} className="opacity-80" />
                  <span>{isVi ? cat.name : (cat as any).nameEn || cat.name}</span>
                </span>
                {count > 0 && (
                  <span className="font-mono text-xs tabular-nums shrink-0 ml-2">({count})</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Price Filter — chỉ dựng khi kho có giá thật để suy khoảng */}
      {priceRange && (
        <div>
          <p className="text-xs font-mono uppercase tracking-[0.2em] text-fg-subtle font-bold mb-2 flex items-center gap-1">
            {isVi ? 'Khoảng Giá In Vật Lý' : 'Physical Price Range'}
            <InfoTip label={isVi ? 'Dải giá này lấy từ đâu?' : 'Where does this price range come from?'}>
              {isVi
                ? 'Dải giá được suy từ trường price_physical của các bản vẽ đang hiển thị. Bản vẽ chưa khai giá sẽ hiện — và không tham gia dải này.'
                : 'The range is derived from the price_physical field of the models currently shown. Models with no declared price render — and do not take part in the range.'}
            </InfoTip>
          </p>

          <div className="grid grid-cols-2 gap-1.5 mb-3">
            {PRICE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectPricePreset(preset.id)}
                className={`py-1.5 px-2 text-xs font-mono font-bold rounded-md border transition-all cursor-pointer text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  pricePreset === preset.id
                    ? 'bg-primary text-primary-fg border-primary'
                    : 'bg-canvas text-fg-muted border-line-control hover:border-primary'
                }`}
              >
                {isVi ? preset.vi : preset.en}
              </button>
            ))}
          </div>

          <div className="pt-1">
            <div className="flex justify-between items-baseline mb-1 text-xs font-mono gap-2">
              <span className="text-fg-subtle">{isVi ? 'Tối đa:' : 'Max:'}</span>
              <span className="font-bold text-primary tabular-nums">
                {priceMax === null
                  ? (isVi ? 'Không giới hạn' : 'No limit')
                  : `${priceMax.toLocaleString(numberLocale)} đ`}
              </span>
            </div>
            <input
              type="range"
              min={priceRange.min}
              max={priceRange.ceiling}
              step={priceRange.step}
              value={priceMax === null ? priceRange.ceiling : priceMax}
              onChange={(e) => {
                setPricePreset('all');
                const next = Number(e.target.value);
                setPriceMax(next >= priceRange.ceiling ? null : next);
              }}
              aria-label={isVi ? 'Giá in vật lý tối đa' : 'Maximum physical print price'}
              className="w-full accent-primary cursor-pointer"
            />
            <div className="flex justify-between text-xs font-mono text-fg-subtle mt-0.5 tabular-nums">
              <span>{priceRange.min.toLocaleString(numberLocale)} đ</span>
              <span>{priceRange.ceiling.toLocaleString(numberLocale)} đ</span>
            </div>
          </div>
        </div>
      )}

      {/* Material Filter — lấy từ bảng `materials` thật; rỗng ⇒ ẩn cả nhóm */}
      {materialOptions.length > 0 && (
        <div>
          <p className="text-xs font-mono uppercase tracking-[0.2em] text-fg-subtle font-bold mb-2 flex items-center gap-1">
            {isVi ? 'Vật Liệu Hỗ Trợ' : 'Supported Material'}
            <InfoTip label={isVi ? 'Danh mục vật liệu lấy từ đâu?' : 'Where does the material list come from?'}>
              {isVi
                ? 'Danh mục đọc từ bảng materials trong DB. Bảng rỗng thì cả nhóm lọc này ẩn — không dựng danh mục mẫu.'
                : 'Read from the materials table in the DB. When it is empty the whole group is hidden — no sample list is invented.'}
            </InfoTip>
          </p>
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => setSelectedMaterial('all')}
              className={`w-full text-left px-2.5 py-1.5 text-xs rounded-md transition-colors flex items-center justify-between cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                selectedMaterial === 'all'
                  ? 'bg-primary-tint text-primary font-bold'
                  : 'text-fg-muted hover:text-fg'
              }`}
            >
              <span>{isVi ? 'Tất cả vật liệu' : 'All materials'}</span>
              <Icon name="done" size={18} />
            </button>
            {materialOptions.map((mat) => (
              <button
                key={mat}
                type="button"
                onClick={() => setSelectedMaterial(mat)}
                className={`w-full text-left px-2.5 py-1.5 text-xs rounded-md transition-colors cursor-pointer truncate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  selectedMaterial === mat
                    ? 'bg-primary text-primary-fg font-bold'
                    : 'text-fg-muted hover:bg-canvas hover:text-fg'
                }`}
              >
                {mat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Feature filter */}
      <div className="pt-3 border-t border-line space-y-2.5">
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={onlyCustomizable}
            onChange={(e) => setOnlyCustomizable(e.target.checked)}
            className="w-4 h-4 accent-primary cursor-pointer rounded-sm"
          />
          <span className="text-xs text-fg font-medium">
            {isVi ? 'Hỗ trợ khắc tên & tùy biến' : 'Custom engraving & resize'}
          </span>
        </label>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-canvas text-fg py-6 sm:py-10 px-4 sm:px-6 md:px-12 font-sans relative selection:bg-primary selection:text-primary-fg">
      <SEOHead
        title={isVi ? 'Kho Bản Vẽ CAD & Linh Kiện 3D' : '3D CAD & Precision Parts Marketplace'}
        description={isVi
          ? (catalogProducts.length > 0
            ? `Kho ${catalogProducts.length} bản vẽ CAD & linh kiện 3D trên VCUBE — giá, vật liệu hỗ trợ và định dạng tệp lấy từ dữ liệu sản phẩm.`
            : 'Kho bản vẽ CAD & linh kiện 3D của VCUBE. Hiện chưa có bản vẽ nào được đăng — bạn vẫn có thể gửi file 3D để nhận báo giá in.')
          : (catalogProducts.length > 0
            ? `${catalogProducts.length} CAD models on VCUBE — prices, supported materials and file formats read from product data.`
            : 'VCUBE CAD catalogue. No model has been published yet — you can still send your own 3D file for a print quote.')}
        image={products[0]?.thumbnailUrl || (products[0]?.images && products[0]?.images[0])}
        url={typeof window !== 'undefined' ? window.location.href : undefined}
        type="website"
      />

      {/* Background Ambient Glowing Radiance (Aligned with Login & HomeView) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10 opacity-70">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-0 w-[500px] h-[500px] bg-accent/15 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-1/4 w-[400px] h-[400px] bg-primary/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Editorial Modern Header Title */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 sm:gap-6 pb-6 border-b border-line">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-surface border border-line-subtle text-xs uppercase font-mono tracking-[0.2em] text-primary font-bold mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" aria-hidden="true" />
              <span>{isVi ? 'Kho Bản Vẽ CAD VCUBE' : 'VCUBE CAD REPOSITORY'}</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-fg tracking-tight">
              {isVi ? 'Bộ Sưu Tập & Bản Vẽ Kỹ Thuật CAD' : 'Engineering CAD & Physical Catalog'}
            </h1>
            <p className="text-xs sm:text-sm text-fg-muted mt-1 font-sans max-w-2xl leading-relaxed flex items-center gap-1.5 flex-wrap">
              <span>
                {catalogProducts.length > 0
                  ? (isVi
                    ? `${catalogProducts.length} bản vẽ đang có — vật liệu hỗ trợ, định dạng tệp và giá lấy từ dữ liệu sản phẩm.`
                    : `${catalogProducts.length} models available — materials, file formats and prices read from product data.`)
                  : (isVi
                    ? 'Kho bản vẽ đang trống.'
                    : 'The catalogue is empty.')}
              </span>
              <InfoTip label={isVi ? 'Số bản vẽ này đếm gì?' : 'What does this count cover?'}>
                {isVi
                  ? 'Đếm theo các bản vẽ đang hiển thị với vai trò hiện tại. Trường nào người bán chưa khai (giá, giấy phép, thời gian in, tác giả) sẽ hiện — thay vì một giá trị đoán hộ. Kho trống thì bạn vẫn gửi được file 3D để nhận báo giá in.'
                  : 'Counted over the models visible to the current role. Any field the seller has not declared (price, licence, print time, designer) renders — instead of a guessed value. An empty catalogue still lets you send your own 3D file for a print quote.'}
              </InfoTip>
            </p>
          </div>

          {/* Quick Search Bar */}
          <div className="relative w-full md:w-88 shrink-0 space-y-3">
            <div className="relative">
              <input
                type="text"
                placeholder={isVi ? 'Tìm linh kiện CAD (vd: Bánh răng, ESP32, Drone)...' : 'Search CAD models (e.g. Gear, Drone, NEMA)...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label={isVi ? 'Tìm kiếm bản vẽ CAD' : 'Search CAD models'}
                className="w-full pl-9 pr-8 py-2.5 bg-surface border border-line-control text-xs text-fg placeholder-fg-subtle focus:outline-none focus:border-primary rounded-md"
              />
              <Icon name="search" size={18} className="absolute left-3 top-2.5 text-fg-subtle" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-fg-subtle hover:text-fg text-xs p-0.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
                  aria-label={isVi ? 'Xoá từ khoá tìm kiếm' : 'Clear search'}
                >
                  <Icon name="close" size={18} />
                </button>
              )}
            </div>
            {/* Đường thoát thật khi kho rỗng: khách vẫn gửi được file của mình */}
            <Button
              variant="secondary"
              size="md"
              fullWidth
              leadingIcon={<Icon name="request_quote" size={18} />}
              onClick={goToQuote}
            >
              {isVi ? 'Báo giá file 3D của bạn' : 'Quote your own 3D file'}
            </Button>
          </div>
        </div>

        {/* Popular Tag Filter Chips Bar */}
        <Card className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-mono font-bold text-fg-subtle flex items-center gap-1.5">
              <Icon name="sell" size={18} className="text-primary" />
              {isVi ? 'Lọc nhanh theo Tag kỹ thuật:' : 'Quick Filter by Engineering Tag:'}
            </span>
            {selectedTag !== 'all' && (
              <Button
                variant="danger-ghost"
                size="sm"
                leadingIcon={<Icon name="close" size={18} />}
                onClick={() => setSelectedTag('all')}
              >
                {isVi ? 'Bỏ lọc tag' : 'Clear tag'}
              </Button>
            )}
          </div>

          <div className="pt-1">
            <HorizontalScrollFilter>
              {POPULAR_TAGS.map((tag) => {
                const isActive = selectedTag === tag.id;

                return (
                  <button
                    key={tag.id}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setSelectedTag(isActive ? 'all' : tag.id)}
                    className={`px-3 py-1.5 rounded-sm text-xs font-mono whitespace-nowrap shrink-0 transition-all flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring border ${
                      isActive
                        ? 'bg-primary text-primary-fg border-primary font-bold'
                        : 'bg-canvas text-fg-muted border-line-control hover:border-primary hover:text-fg'
                    }`}
                  >
                    <Icon name={tag.icon} size={18} />
                    <span>{isVi ? tag.nameVi : tag.nameEn}</span>
                  </button>
                );
              })}
            </HorizontalScrollFilter>
          </div>
        </Card>

        {/* Active Filters Tray */}
        {hasActiveFilters && (
          <div className="bg-primary-tint p-3 rounded-lg flex flex-wrap items-center justify-between gap-2.5 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase text-primary flex items-center gap-1">
                <Icon name="filter_alt" size={18} />
                {isVi ? 'Đang lọc:' : 'Active filters:'}
              </span>

              {searchQuery && (
                <span className="inline-flex items-center gap-1 bg-surface border border-line px-2.5 py-1 rounded-sm text-xs font-medium text-fg">
                  <span>Tìm: "{searchQuery}"</span>
                  <Button iconOnly size="sm" variant="ghost" aria-label={isVi ? 'Xoá tìm kiếm' : 'Clear search'} onClick={() => setSearchQuery('')} className="-m-2 hover:text-danger" leadingIcon={<Icon name="close" size={18} />} />
                </span>
              )}

              {selectedCategory !== 'all' && (
                <span className="inline-flex items-center gap-1 bg-surface border border-line px-2.5 py-1 rounded-sm text-xs font-medium text-primary">
                  <span>Danh mục: {CATEGORIES.find(c => c.id === selectedCategory)?.name || selectedCategory}</span>
                  <Button iconOnly size="sm" variant="ghost" aria-label={isVi ? 'Bỏ lọc danh mục' : 'Clear category'} onClick={() => setSelectedCategory('all')} className="-m-2 hover:text-danger" leadingIcon={<Icon name="close" size={18} />} />
                </span>
              )}

              {selectedTag !== 'all' && (
                <span className="inline-flex items-center gap-1 bg-surface border border-line px-2.5 py-1 rounded-sm text-xs font-medium text-primary">
                  <span>Tag: #{selectedTag}</span>
                  <Button iconOnly size="sm" variant="ghost" aria-label={isVi ? 'Bỏ lọc thẻ' : 'Clear tag'} onClick={() => setSelectedTag('all')} className="-m-2 hover:text-danger" leadingIcon={<Icon name="close" size={18} />} />
                </span>
              )}

              {selectedMaterial !== 'all' && materialOptions.length > 0 && (
                <span className="inline-flex items-center gap-1 bg-surface border border-line px-2.5 py-1 rounded-sm text-xs font-medium text-fg">
                  <span>Vật liệu: {selectedMaterial}</span>
                  <Button iconOnly size="sm" variant="ghost" aria-label={isVi ? 'Bỏ lọc vật liệu' : 'Clear material'} onClick={() => setSelectedMaterial('all')} className="-m-2 hover:text-danger" leadingIcon={<Icon name="close" size={18} />} />
                </span>
              )}

              {pricePreset !== 'all' && (
                <span className="inline-flex items-center gap-1 bg-surface border border-line px-2.5 py-1 rounded-sm text-xs font-medium text-fg">
                  <span>
                    Giá: {pricePreset === 'under100' ? '< 100k' : pricePreset === '100to250' ? '100k - 250k' : pricePreset === '250to500' ? '250k - 500k' : '> 500k'}
                  </span>
                  <Button iconOnly size="sm" variant="ghost" aria-label={isVi ? 'Bỏ lọc khoảng giá' : 'Clear price range'} onClick={() => setPricePreset('all')} className="-m-2 hover:text-danger" leadingIcon={<Icon name="close" size={18} />} />
                </span>
              )}

              {priceMax !== null && (
                <span className="inline-flex items-center gap-1 bg-surface border border-line px-2.5 py-1 rounded-sm text-xs font-medium text-fg">
                  <span>Tối đa: {priceMax.toLocaleString(numberLocale)} đ</span>
                  <Button iconOnly size="sm" variant="ghost" aria-label={isVi ? 'Bỏ giới hạn giá' : 'Clear max price'} onClick={() => setPriceMax(null)} className="-m-2 hover:text-danger" leadingIcon={<Icon name="close" size={18} />} />
                </span>
              )}

              {onlyCustomizable && (
                <span className="inline-flex items-center gap-1 bg-surface border border-line px-2.5 py-1 rounded-sm text-xs font-medium text-fg">
                  <span>Hỗ trợ khắc tên & tùy biến</span>
                  <Button iconOnly size="sm" variant="ghost" aria-label={isVi ? 'Bỏ lọc tuỳ biến' : 'Clear customizable filter'} onClick={() => setOnlyCustomizable(false)} className="-m-2 hover:text-danger" leadingIcon={<Icon name="close" size={18} />} />
                </span>
              )}
            </div>

            <Button
              variant="danger-ghost"
              size="sm"
              leadingIcon={<Icon name="restart_alt" size={18} />}
              onClick={resetFilters}
            >
              {isVi ? 'Xóa toàn bộ bộ lọc' : 'Reset all filters'}
            </Button>
          </div>
        )}

        {/* Mobile Filter Toggle Button — cột lọc thành bottom-sheet dưới lg */}
        <div className="lg:hidden flex items-center gap-3">
          <Button
            variant="secondary"
            size="md"
            className="flex-1"
            leadingIcon={<Icon name="tune" size={18} className="text-primary" />}
            onClick={() => setMobileFilterOpen(true)}
          >
            {isVi ? `Bộ Lọc (${filteredProducts.length})` : `Filters (${filteredProducts.length})`}
          </Button>
          <Button variant="ghost" size="md" onClick={resetFilters}>
            {isVi ? 'Đặt lại' : 'Reset'}
          </Button>
        </div>

        {/* Main Grid: Filters Sidebar + Products */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
          {/* Left Sidebar Filters — desktop only; mobile dùng bottom-sheet bên dưới */}
          <aside className="hidden lg:block lg:col-span-3 space-y-5">
            <Card padding="lg" className="space-y-6">
              <div className="flex items-center justify-between pb-3.5 border-b border-line">
                <span className="font-bold text-sm text-fg flex items-center gap-1.5">
                  <Icon name="tune" size={18} className="text-primary" />
                  {isVi ? 'Bộ Lọc Phân Loại' : 'Filter Options'}
                </span>
                {hasActiveFilters && (
                  <Button variant="danger-ghost" size="sm" onClick={resetFilters}>
                    {isVi ? 'Xóa lọc' : 'Reset'}
                  </Button>
                )}
              </div>

              {renderFilters()}
            </Card>
          </aside>

          {/* Right Product Grid & Views */}
          {/*
            Thứ NGUYÊN là `<div>`, KHÔNG phải `<main>`: landmark `main` duy nhất của trang
            do `App.tsx` cung cấp. Để `<main>` ở đây thì `/explore` có 2 landmark
            (browser test đo `document.querySelectorAll('main').length === 2`).
          */}
          <div className="min-w-0 lg:col-span-9 space-y-6">
            {/* Sorting and Result Summary */}
            <Card className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-fg-subtle">
                  {isVi ? 'Hiển thị' : 'Showing'} <strong className="text-fg font-mono font-bold tabular-nums">{renderedProducts.length} / {filteredProducts.length}</strong> {isVi ? 'bản vẽ' : 'models'}
                </span>
                {selectedTag !== 'all' && (
                  <Badge variant="neutral">Tag: #{selectedTag}</Badge>
                )}
                {isAdmin && (
                  <Badge variant="warning">{isVi ? 'Chế độ admin (mọi trạng thái)' : 'Admin view (all status)'}</Badge>
                )}
              </div>

              <div className="flex items-center gap-3">
                {/* View Mode Switcher */}
                <div className="flex items-center gap-1 bg-canvas border border-line p-0.5 rounded-md">
                  <Button
                    iconOnly
                    size="sm"
                    variant={viewMode === 'grid' ? 'primary' : 'ghost'}
                    aria-label={isVi ? 'Xem dạng lưới' : 'Grid view'}
                    aria-pressed={viewMode === 'grid'}
                    onClick={() => setViewMode('grid')}
                    leadingIcon={<Icon name="grid_view" size={16} className="block" />}
                  />
                  <Button
                    iconOnly
                    size="sm"
                    variant={viewMode === 'tech-table' ? 'primary' : 'ghost'}
                    aria-label={isVi ? 'Xem dạng bảng' : 'Table view'}
                    aria-pressed={viewMode === 'tech-table'}
                    onClick={() => setViewMode('tech-table')}
                    leadingIcon={<Icon name="table_rows" size={16} className="block" />}
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs uppercase font-mono font-bold text-fg-subtle">{isVi ? 'Sắp xếp:' : 'Sort:'}</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    aria-label={isVi ? 'Sắp xếp danh sách bản vẽ' : 'Sort models'}
                    className="bg-surface border border-line-control py-1.5 px-2.5 text-xs text-fg font-bold focus:outline-none focus:border-primary cursor-pointer rounded-md"
                  >
                    <option value="featured">{isVi ? 'Nổi bật nhất' : 'Featured'}</option>
                    <option value="popular">{isVi ? 'Lượt in nhiều nhất' : 'Most Printed'}</option>
                    <option value="price-asc">{isVi ? 'Giá tăng dần' : 'Price: Low to High'}</option>
                    <option value="price-desc">{isVi ? 'Giá giảm dần' : 'Price: High to Low'}</option>
                    <option value="rating">{isVi ? 'Đánh giá cao nhất' : 'Top Rated'}</option>
                  </select>
                </div>
              </div>
            </Card>

            {isCatalogLoading ? (
              /* LOADING — skeleton đúng layout lưới thẻ */
              <div
                role="status"
                aria-label={isVi ? 'Đang tải kho bản vẽ' : 'Loading the catalogue'}
                className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6"
              >
                {Array.from({ length: SKELETON_CARD_COUNT }).map((_, index) => (
                  <ProductCardSkeleton key={index} />
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              /* EMPTY STATE — nêu đúng nguyên nhân + đường thoát thật */
              <EmptyState
                live
                bordered
                icon={<Icon name={catalogIsEmpty ? 'inventory_2' : 'search_off'} size={20} />}
                title={catalogIsEmpty
                  ? (isVi ? 'Kho bản vẽ đang trống' : 'The catalogue is empty')
                  : (isVi ? 'Không có bản vẽ nào khớp bộ lọc' : 'No CAD models match your filters')}
                description={catalogIsEmpty
                  ? (isVi
                    ? 'Chưa có bản vẽ CAD nào được đăng trên VCUBE.'
                    : 'No CAD model has been published on VCUBE yet.')
                  : (isVi
                    ? 'Hãy bỏ bớt điều kiện hoặc đổi từ khoá tìm kiếm.'
                    : 'Remove a condition or change the search term.')}
                action={
                  <>
                    {catalogIsEmpty ? (
                      <Button variant="primary" size="md" leadingIcon={<Icon name="request_quote" size={18} />} onClick={goToQuote}>
                        {isVi ? 'Báo giá file 3D của bạn' : 'Quote your own 3D file'}
                      </Button>
                    ) : (
                      <Button variant="primary" size="md" leadingIcon={<Icon name="restart_alt" size={18} />} onClick={resetFilters}>
                        {isVi ? 'Xóa toàn bộ bộ lọc' : 'Reset all filters'}
                      </Button>
                    )}
                    {catalogIsEmpty && hasActiveFilters && (
                      <Button variant="secondary" size="md" onClick={resetFilters}>
                        {isVi ? 'Xóa bộ lọc' : 'Clear filters'}
                      </Button>
                    )}
                    {!catalogIsEmpty && (
                      <Button variant="secondary" size="md" leadingIcon={<Icon name="request_quote" size={18} />} onClick={goToQuote}>
                        {isVi ? 'Báo giá file 3D của bạn' : 'Quote your own 3D file'}
                      </Button>
                    )}
                    <InfoTip
                      label={isVi ? 'Vì sao có thể không thấy bản vẽ nào?' : 'Why might no model be listed?'}
                      title={isVi ? 'Về trạng thái rỗng' : 'About this empty state'}
                    >
                      {catalogIsEmpty
                        ? (isVi
                          ? 'Chưa có bản vẽ nào được đăng nên bộ lọc chưa có gì để lọc. Bạn vẫn gửi được file 3D của mình để nhận báo giá in.'
                          : 'Nothing has been published yet, so there is nothing for the filters to match. You can still send your own 3D file to get a print quote.')
                        : (isVi
                          ? `${filteredProducts.length} / ${catalogProducts.length} bản vẽ khớp bộ lọc đang chọn.`
                          : `${filteredProducts.length} / ${catalogProducts.length} models match the current filters.`)}
                    </InfoTip>
                  </>
                }
              />
            ) : viewMode === 'grid' ? (
              /* GRID VIEW */
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {renderedProducts.map((product) => {
                    const isBookmarked = bookmarkedIds.includes(product.id);
                    const imageUrl = product.thumbnailUrl || product.images?.[0] || '';
                    const supported = product.supportedMaterials || [];
                    const materialsLabel = supported.slice(0, 2).join(' · ');
                    const rating = ratingOf(product);

                    return (
                      <Card
                        key={product.id}
                        as="article"
                        padding="none"
                        className="group relative flex flex-col overflow-hidden transition-shadow duration-300 hover:shadow-e1"
                      >
                        {/* Product Image Frame — tỉ lệ cố định 4:3 */}
                        <div className="responsive-aspect-frame">
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={product.name}
                              loading="lazy"
                              className="responsive-img-cover group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-fg-subtle">
                              <Icon name="image" size={24} />
                            </div>
                          )}

                          {/* Badges — chỉ dữ liệu DB trả về */}
                          <div className="absolute top-2 left-2 flex flex-col gap-1 items-start pointer-events-none">
                            {product.badge && (
                              <Badge variant="technical" size="sm">{product.badge}</Badge>
                            )}
                            {product.cadFormat && (
                              <span className="text-xs font-mono font-bold bg-primary text-primary-fg px-1.5 py-0.5 rounded-sm uppercase">
                                {product.cadFormat}
                              </span>
                            )}
                          </div>

                          {/* 3D Quick-Inspect Trigger */}
                          <button
                            type="button"
                            onClick={(e) => handleOpen3DPreview(product, e)}
                            className="absolute inset-0 bg-surface-inverse/70 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-opacity flex flex-col items-center justify-center gap-2 text-on-inverse font-mono text-xs uppercase tracking-wider font-bold cursor-pointer"
                            aria-label={isVi ? `Xem trước 3D: ${product.name}` : `3D preview: ${product.name}`}
                          >
                            <span className="w-11 h-11 rounded-md bg-primary text-primary-fg flex items-center justify-center shadow-e2 transform group-hover:scale-110 transition-transform">
                              <Icon name="3d_rotation" size={24} />
                            </span>
                            <span className="bg-surface-inverse/80 px-3 py-1 rounded-sm text-xs text-accent">
                              {isVi ? 'Xem trước 3D' : '3D preview'}
                            </span>
                          </button>

                          {product.printTime && (
                            <span className="absolute bottom-2 right-2">
                              <Badge variant="technical" size="sm" icon={<Icon name="schedule" size={16} className="shrink-0" />}>
                                {product.printTime}
                              </Badge>
                            </span>
                          )}

                          {/* Bookmark */}
                          <Button
                            iconOnly
                            variant="secondary"
                            size="sm"
                            className="absolute top-2 right-2 z-sticky shadow-e2"
                            aria-label={isBookmarked ? (isVi ? 'Bỏ lưu bản vẽ' : 'Remove bookmark') : (isVi ? 'Lưu bản vẽ' : 'Save model')}
                            aria-pressed={isBookmarked}
                            onClick={(e) => toggleBookmark(product.id, e)}
                            leadingIcon={<Icon name={isBookmarked ? 'bookmark' : 'bookmark_border'} size={20} fill={isBookmarked ? 'currentColor' : 'none'} className={isBookmarked ? 'text-warning-strong' : 'text-fg-subtle'} />}
                          />
                        </div>

                        {/* Info Section */}
                        <div className="flex-1 flex flex-col gap-2 p-4">
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span
                              className="uppercase tracking-wider truncate font-semibold font-mono text-xs text-primary"
                              title={product.designer ? product.designer : (isVi ? 'Người bán chưa khai báo tác giả' : 'Seller has not declared a designer')}
                            >
                              {product.designer || EMPTY_VALUE}
                            </span>
                            {rating ? (
                              <span className="shrink-0 inline-flex items-center gap-1 font-mono text-xs tabular-nums font-bold text-warning">
                                <Star aria-hidden="true" className="size-3.5 fill-current" />
                                {rating.value}
                                <span className="font-normal text-fg-subtle">
                                  ({rating.count} {isVi ? 'đánh giá' : 'reviews'})
                                </span>
                              </span>
                            ) : (
                              <span className="shrink-0 text-xs text-fg-subtle">
                                {isVi ? 'Chưa có đánh giá' : 'No reviews'}
                              </span>
                            )}
                          </div>

                          <h3
                            onClick={() => {
                              onSelectProduct(product);
                              onNavigate('product_detail', { product });
                            }}
                            className="font-bold text-sm text-fg hover:text-primary transition-colors cursor-pointer line-clamp-2 leading-snug"
                            title={product.name}
                          >
                            {product.name}
                          </h3>

                          {/* Thông số thật của sản phẩm; thiếu dữ liệu ⇒ không hiện */}
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono text-fg-muted">
                            {product.specs?.dimensions && (
                              <span className="inline-flex items-center gap-1">
                                <Icon name="straighten" size={18} />
                                {product.specs.dimensions}
                              </span>
                            )}
                            {materialsLabel && (
                              <span className="inline-flex items-center gap-1">
                                <Icon name="layers" size={18} />
                                {materialsLabel}
                                {supported.length > 2 ? ` +${supported.length - 2}` : ''}
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1">
                              <Icon name="license" size={18} />
                              {licenseLabel(product.licenseType)}
                            </span>
                          </div>

                          {/* Interactive Clickable Tags */}
                          {(product.tags || []).length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {product.tags.slice(0, 3).map((tg) => (
                                <button
                                  key={tg}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedTag(tg);
                                  }}
                                  className={`text-xs font-mono uppercase px-1.5 py-0.5 rounded-sm border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                                    selectedTag === tg
                                      ? 'bg-primary text-primary-fg border-primary font-bold'
                                      : 'bg-canvas text-fg-muted border-line hover:border-primary hover:text-fg'
                                  }`}
                                >
                                  #{tg}
                                </button>
                              ))}
                            </div>
                          )}

                          <div className="mt-auto pt-3 border-t border-line-subtle">
                            <div className="flex items-baseline justify-between gap-2 mb-3 font-sans">
                              <div className="min-w-0">
                                <span className="text-xs text-fg-subtle uppercase tracking-wider block font-medium">
                                  {isVi ? 'File số' : 'Digital file'}
                                </span>
                                <span className="font-mono text-xs text-primary font-bold tabular-nums">
                                  {formatVnd(product.priceDigital, numberLocale)}
                                </span>
                              </div>
                              <div className="text-right min-w-0">
                                <span className="text-xs text-fg-subtle uppercase tracking-wider block font-medium">
                                  {isVi ? 'Bản in vật lý' : 'Physical print'}
                                </span>
                                <span className="font-mono font-bold text-sm text-fg tabular-nums">
                                  {formatVnd(product.pricePhysical, numberLocale)}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <Button
                                variant="primary"
                                size="md"
                                className="flex-1"
                                leadingIcon={<Icon name="download" size={18} />}
                                onClick={(e) => handleQuickAddDigital(product, e)}
                                disabled={!(isNum(product.priceDigital) && product.priceDigital > 0)}
                                title={isNum(product.priceDigital) && product.priceDigital > 0
                                  ? (isVi ? 'Tải file CAD STL/STEP gốc' : 'Get original CAD file')
                                  : (isVi ? 'Người bán không mở bán kênh file số.' : 'The seller does not sell this product as a CAD file.')}
                              >
                                {isNum(product.priceDigital) && product.priceDigital > 0
                                  ? (isVi ? 'Tải File CAD' : 'Buy CAD')
                                  : (isVi ? 'Không bán file số' : 'File not sold')}
                              </Button>

                              <Button
                                variant="secondary"
                                size="md"
                                leadingIcon={<Icon name="precision_manufacturing" size={18} />}
                                onClick={() => {
                                  onSelectProduct(product);
                                  onNavigate('product_detail', { product });
                                }}
                              >
                                {isVi ? 'In 3D' : 'Print'}
                              </Button>

                              {product.isCustomizable && (
                                <Button
                                  iconOnly
                                  variant="secondary"
                                  size="md"
                                  aria-label={isVi ? `Khắc laser / Tùy biến: ${product.name}` : `Custom engraving: ${product.name}`}
                                  leadingIcon={<Icon name="tune" size={18} />}
                                  onClick={() => {
                                    onSelectProduct(product);
                                    onNavigate('personalize', { product });
                                  }}
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>

                {/* Load More Pagination Button */}
                {visibleCount < filteredProducts.length && (
                  <div className="text-center pt-4 pb-2">
                    <Button
                      variant="secondary"
                      size="md"
                      leadingIcon={<Icon name="expand_more" size={18} className="text-primary" />}
                      onClick={() => setVisibleCount((prev) => prev + 12)}
                    >
                      {isVi
                        ? `Xem thêm (${filteredProducts.length - visibleCount} bản vẽ CAD)`
                        : `Load More (${filteredProducts.length - visibleCount} CAD models)`}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              /* TECH TABLE VIEW */
              <Card padding="none" className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-sans">
                    <thead className="bg-surface-inverse text-on-inverse font-mono text-xs uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Linh Kiện CAD</th>
                        <th className="py-3 px-3">Danh Mục</th>
                        <th className="py-3 px-3">Kích Thước</th>
                        <th className="py-3 px-3">
                          <span className="inline-flex items-center gap-1">
                            Thời Gian In
                            <InfoTip label={isVi ? 'Ô "—" ở cột này nghĩa là gì?' : 'What does "—" in this column mean?'}>
                              {isVi
                                ? 'Người bán chưa khai thời gian in cho bản vẽ này. Ô để trống hiện — thay vì một con số đoán hộ.'
                                : 'The seller has not declared a print time for this model. The cell renders — instead of a guessed number.'}
                            </InfoTip>
                          </span>
                        </th>
                        <th className="py-3 px-3">
                          <span className="inline-flex items-center gap-1">
                            Giấy Phép
                            <InfoTip label={isVi ? 'Giấy phép hiển thị thế nào?' : 'How is the licence shown?'}>
                              {isVi
                                ? 'Giấy phép đọc từ trường license_type của sản phẩm. Người bán chưa khai thì ghi rõ "— (người bán chưa khai báo)" — không tự gán Commercial.'
                                : 'Read from the product license_type field. When the seller has not declared one it reads "— (seller has not declared)" — never defaulted to Commercial.'}
                            </InfoTip>
                          </span>
                        </th>
                        <th className="py-3 px-3">Giá File Số</th>
                        <th className="py-3 px-3">Giá In Vật Lý</th>
                        <th className="py-3 px-4 text-right">Thao Tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line-subtle">
                      {renderedProducts.map((product) => {
                        const imageUrl = product.thumbnailUrl || product.images?.[0] || '';
                        return (
                          <tr key={product.id} className="hover:bg-canvas transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                {imageUrl ? (
                                  <img
                                    src={imageUrl}
                                    alt={product.name}
                                    loading="lazy"
                                    className="w-12 h-12 object-cover rounded-md shrink-0"
                                  />
                                ) : (
                                  <span className="w-12 h-12 rounded-md bg-surface-muted flex items-center justify-center text-fg-subtle shrink-0">
                                    <Icon name="image" size={18} />
                                  </span>
                                )}
                                <div className="min-w-0">
                                  <h4
                                    onClick={() => {
                                      onSelectProduct(product);
                                      onNavigate('product_detail', { product });
                                    }}
                                    className="font-bold text-xs text-fg hover:text-primary cursor-pointer truncate"
                                  >
                                    {product.name}
                                  </h4>
                                  <span className="text-xs text-fg-subtle font-mono block truncate">
                                    {product.designer || EMPTY_VALUE}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-3 font-mono font-bold uppercase text-xs text-primary">
                              {product.category || EMPTY_VALUE}
                            </td>
                            <td className="py-3 px-3 font-mono text-xs text-fg tabular-nums">
                              {product.specs?.dimensions || EMPTY_VALUE}
                            </td>
                            <td className="py-3 px-3 font-mono text-xs text-fg-muted tabular-nums">
                              {product.printTime || EMPTY_VALUE}
                            </td>
                            <td className="py-3 px-3 font-mono text-xs text-fg-muted">
                              {licenseLabel(product.licenseType)}
                            </td>
                            <td className="py-3 px-3 font-mono font-bold text-primary tabular-nums">
                              {formatVnd(product.priceDigital, numberLocale)}
                            </td>
                            <td className="py-3 px-3 font-mono font-bold text-fg tabular-nums">
                              {formatVnd(product.pricePhysical, numberLocale)}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  iconOnly
                                  variant="secondary"
                                  size="sm"
                                  aria-label={isVi ? `Xem trước 3D: ${product.name}` : `3D preview: ${product.name}`}
                                  leadingIcon={<Icon name="3d_rotation" size={18} />}
                                  onClick={(e) => handleOpen3DPreview(product, e)}
                                />
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={(e) => handleQuickAddDigital(product, e)}
                                  disabled={!(isNum(product.priceDigital) && product.priceDigital > 0)}
                                  title={isNum(product.priceDigital) && product.priceDigital > 0
                                    ? (isVi ? 'Tải file CAD STL/STEP gốc' : 'Get original CAD file')
                                    : (isVi ? 'Người bán không mở bán kênh file số.' : 'The seller does not sell this product as a CAD file.')}
                                >
                                  {isNum(product.priceDigital) && product.priceDigital > 0
                                    ? (isVi ? 'Tải CAD' : 'Buy CAD')
                                    : (isVi ? 'Không bán file số' : 'File not sold')}
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Mobile filter bottom-sheet — cùng nội dung bộ lọc với cột trái */}
      {mobileFilterOpen && (
        <Sheet
          open
          side="bottom"
          onClose={() => setMobileFilterOpen(false)}
          title={isVi ? 'Bộ lọc bản vẽ' : 'Filter models'}
          description={isVi
            ? `Đang có ${filteredProducts.length} / ${catalogProducts.length} bản vẽ khớp điều kiện`
            : `${filteredProducts.length} / ${catalogProducts.length} models match`}
          footer={
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="md" className="flex-1" onClick={resetFilters}>
                {isVi ? 'Xóa lọc' : 'Reset'}
              </Button>
              <Button variant="primary" size="md" className="flex-1" onClick={() => setMobileFilterOpen(false)}>
                {isVi ? `Xem ${filteredProducts.length} kết quả` : `Show ${filteredProducts.length}`}
              </Button>
            </div>
          }
        >
          {renderFilters()}
        </Sheet>
      )}

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
