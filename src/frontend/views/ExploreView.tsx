import React, { useState, useMemo, useEffect } from 'react';
import { Product, CartItem, MaterialProfile, InkiriCostFormulaConfig } from '@/types';
import { CATEGORIES, POPULAR_TAGS } from '@/data/mockData';
import { CadQuickViewModal } from '../components/CadQuickViewModal';
import { SEOHead } from '../components/SEOHead';
import { HorizontalScrollFilter } from '../components/HorizontalScrollFilter';
import { useAuth } from '../context/AuthContext';
import { useCartStore } from '@frontend/stores/useCartStore';
import { Icon, Badge, Button, Card, EmptyState, InfoTip, Sheet, Skeleton } from '@frontend/ui';
import { EMPTY_VALUE, formatCurrency, formatNumber } from '@frontend/lib/format';
import { realProductImageUrl } from '@frontend/lib/productImage';

/**
 * ExploreView — kho bản vẽ CAD, bề mặt storefront của v3 "Soft Studio".
 *
 * Recompose (W2):
 * - **Category tile pastel** (token `--color-tile-*`): lối vào nhanh theo danh mục; chữ
 *   `text-fg`/`text-fg-muted` (KHÔNG `text-fg-subtle` trên pastel — ledger contrast v3).
 * - **Card soft** (`Card variant="soft"` = borderless + `shadow-soft`): thẻ bản vẽ, sidebar
 *   lọc, toolbar, bảng kỹ thuật. Thứ tự thẻ theo contract: ảnh/3D → tiêu đề → vật liệu &
 *   định dạng → giá & giấy phép → CTA.
 * - Giữ NGUYÊN logic: bộ lọc (sidebar desktop + bottom-sheet mobile), density, grid/table,
 *   tìm kiếm, phân trang, empty/loading/error, data-honesty (giá `> 0`, license, rating).
 * - VI-only (D0): bỏ thuật ngữ hiển thị tiếng Anh ngoài allowlist ("File" → "Tệp", nhãn
 *   giấy phép chuẩn hoá VI). Nhánh EN chết đã được xoá bằng codemod Phase 2a.
 */

interface ExploreViewProps {
  products: Product[];
  /** true khi catalog đang nạp từ DB (giữ skeleton tới khi xong thay vì empty giả). */
  productsLoading?: boolean;
  /** Lỗi đọc catalog lần gần nhất — hiện error + retry, hoặc warning nếu còn cache. */
  productsError?: boolean;
  /** Gọi lại lượt đọc catalog (nút "Thử lại"). */
  onRetry?: () => void;
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

/** Skeleton khớp lưới 1/2/3 cột: 6 thẻ = 2 hàng đầy ở desktop. */
const SKELETON_CARD_COUNT = 6;

/** Bậc giá nhanh — chỉ là tiêu chí lọc, không phải số liệu về kho. */
const PRICE_PRESETS: { id: PricePreset; vi: string; en: string }[] = [
  { id: 'under100', vi: '< 100k ₫', en: '< 100k' },
  { id: '100to250', vi: '100k – 250k', en: '100k - 250k' },
  { id: '250to500', vi: '250k – 500k', en: '250k - 500k' },
  { id: 'above500', vi: '> 500k ₫', en: '> 500k' },
];

/**
 * Bảng màu tile pastel v3 (§1.5) — dùng cho category tile. Class viết đủ chuỗi tĩnh để
 * Tailwind phát ra utility; KHÔNG nội suy tên class.
 */
const TILE_TONE = ['bg-tile-mint', 'bg-tile-lilac', 'bg-tile-rose', 'bg-tile-amber'] as const;

/**
 * Nhận diện số hữu hạn do DB trả về. `NULL` được map thành 0 và chuỗi lạ KHÔNG phải giá.
 * Cùng quy ước với `HomeView`/`ProductDetailView`: chỉ giá kênh `> 0` mới là CÓ BÁN.
 */
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Giá chưa có/chưa cấu hình ⇒ `—`, KHÔNG in "0 đ" như một mức giá thật. */
const formatVnd = (value: number, locale: string): string =>
  Number.isFinite(value) && value > 0 ? `${formatNumber(value, { locale })} ₫` : EMPTY_VALUE;

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
 *
 * v3/D0: giá trị enum của DB (`Standard`/`Commercial`/`Exclusive`) là **nhãn hiển thị**
 * nên phải là tiếng Việt; giá trị lạ do DB trả về vẫn in nguyên (không dịch hộ dữ liệu).
 */
const LICENSE_VI: Record<string, string> = {
  standard: 'Tiêu chuẩn',
  commercial: 'Thương mại',
  exclusive: 'Độc quyền',
};
const licenseLabel = (license?: string | null): string => {
  const value = typeof license === 'string' ? license.trim() : '';
  if (!value) return `${EMPTY_VALUE} (người bán chưa khai báo)`;
  return LICENSE_VI[value.toLowerCase()] ?? value;
};

/** Vật liệu hỗ trợ — chỉ đọc từ dữ liệu sản phẩm, thiếu ⇒ `—` (không đoán). */
const materialLabel = (product: Product): string => {
  const names = (product.supportedMaterials || [])
    .map((m) => (typeof m === 'string' ? m.trim() : ''))
    .filter(Boolean);
  return names.length > 0 ? names.slice(0, 2).join(' · ') : EMPTY_VALUE;
};

/** Icon placeholder theo danh mục khi bản vẽ chưa có ảnh thật. */
const CATEGORY_ICON: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c.icon]),
);
const categoryIcon = (category?: string): string =>
  (category && CATEGORY_ICON[category]) || 'view_in_ar';

/** Nhóm lọc thu gọn/mở rộng được (accordion). */
const FilterGroup: React.FC<{ title: React.ReactNode; defaultOpen?: boolean; children: React.ReactNode }> = ({
  title,
  defaultOpen = true,
  children,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-line-subtle pb-3 last:border-b-0 last:pb-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex min-h-11 items-center justify-between gap-2 py-1 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
      >
        <span className="text-xs font-semibold uppercase tracking-wider text-fg-muted">{title}</span>
        <Icon name={open ? 'expand_less' : 'expand_more'} size={18} className="text-fg-muted shrink-0" />
      </button>
      {open ? <div className="mt-2.5">{children}</div> : null}
    </div>
  );
};

/** Mục lọc dạng danh sách (radio-like) — dùng chung cho danh mục & vật liệu. */
const FilterOption: React.FC<{
  active: boolean;
  onClick: () => void;
  icon?: string;
  label: React.ReactNode;
  count?: number | null;
}> = ({ active, onClick, icon, label, count }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={`w-full min-h-11 text-left px-3 py-2 text-sm rounded-md transition-colors duration-200 flex items-center justify-between cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
      active
        ? 'bg-primary-tint text-fg font-semibold'
        : 'text-fg-muted hover:bg-surface-muted hover:text-fg'
    }`}
  >
    <span className="flex items-center gap-2 truncate">
      {icon ? <Icon name={icon} size={18} className="shrink-0 opacity-80" aria-hidden="true" /> : null}
      <span className="truncate">{label}</span>
    </span>
    {typeof count === 'number' && count > 0 ? (
      <span className="font-mono text-xs tabular-nums shrink-0 ml-2">({count})</span>
    ) : null}
  </button>
);

/** Thẻ xương đúng layout thẻ thật (khung ảnh 4:3, tiêu đề, thông số, giá, CTA). */
const ProductCardSkeleton: React.FC = () => (
  <Card variant="soft" padding="none" className="flex flex-col overflow-hidden">
    <div className="aspect-[4/3] w-full overflow-hidden">
      <Skeleton variant="rect" rounded="lg" height="100%" className="h-full w-full" />
    </div>
    <div className="flex flex-col gap-2.5 p-4">
      <Skeleton variant="text" width="70%" />
      <Skeleton variant="text" width="45%" />
      <Skeleton variant="text" lines={2} />
      <div className="flex items-center justify-between gap-3 pt-1">
        <Skeleton variant="text" width="6ch" />
        <Skeleton variant="text" width="7ch" />
      </div>
      <Skeleton variant="rect" rounded="md" height="2.5rem" className="w-full" />
    </div>
  </Card>
);

export const ExploreView: React.FC<ExploreViewProps> = ({
  products,
  productsLoading,
  productsError,
  onRetry,
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
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  const numberLocale = 'vi-VN';

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

  const addToCartStore = useCartStore((s) => s.addToCart);

  // Quick 3D Preview Modal State
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [quickViewInitialOrderType, setQuickViewInitialOrderType] = useState<'digital' | 'physical'>('digital');
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
        onShowToast(isBookmarked ? 'Đã bỏ lưu bản vẽ' : 'Đã lưu bản vẽ vào mục yêu thích');
      }
      return next;
    });
  };

  const handleOpen3DPreview = (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    setQuickViewProduct(product);
    setQuickViewInitialOrderType('digital');
    setIsQuickViewOpen(true);
  };

  const handleOpenPhysicalConfig = (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!(isNum(product.pricePhysical) && product.pricePhysical > 0)) {
      onShowToast?.(
        `Sản phẩm "${product.name}" không mở bán kênh in vật lý (giá in không lớn hơn 0) nên chưa thể đặt in.`
      );
      return;
    }
    setQuickViewProduct(product);
    setQuickViewInitialOrderType('physical');
    setIsQuickViewOpen(true);
  };

  const handleQuickAddDigital = (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    // Data-honesty: `price_digital` không lớn hơn 0 (0 hoặc NULL/NaN) nghĩa là người bán KHÔNG
    // bán kênh file số ⇒ KHÔNG được đẩy vào giỏ một dòng 0đ. Chỉ giá `> 0` mới là CÓ BÁN.
    if (!(isNum(product.priceDigital) && product.priceDigital > 0)) {
      onShowToast?.(
        `Sản phẩm "${product.name}" không mở bán kênh tệp số (giá tệp số không lớn hơn 0) nên chưa thể mua.`
      );
      return;
    }
    const item: CartItem = {
      id: `cart-digital-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      productId: product.id,
      type: 'digital',
      name: product.name,
      designer: product.designer,
      image: realProductImageUrl(product.images, product.thumbnailUrl),
      price: product.priceDigital,
      quantity: 1,
      // Data-honesty (P3b): KHONG doan ho giay phep/dinh dang tep khi san pham chua khai.
      fileFormat: product.cadFormat ?? undefined,
      licenseType: product.licenseType ?? undefined
    };
    if (onAddToCart) {
      onAddToCart(item);
    } else {
      addToCartStore(item);
    }
    if (onShowToast) {
      onShowToast(`Đã thêm tệp CAD "${product.name}" vào giỏ!`);
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
  // Predicate tính trên `catalogProducts` (đã role-lọc) để dải cảnh báo không nói dối:
  // admin thấy cả bản nháp còn khách chỉ thấy published.
  const hasVisible = catalogProducts.length > 0;
  const isCatalogLoading = Boolean(productsLoading) && products.length === 0;
  const showError = Boolean(productsError) && !hasVisible && !isCatalogLoading;
  const showWarning = Boolean(productsError) && hasVisible;
  const catalogIsEmpty = catalogProducts.length === 0;
  const hasActiveFilters = selectedCategory !== 'all' || selectedTag !== 'all' || (selectedMaterial !== 'all' && materialOptions.length > 0) || pricePreset !== 'all' || priceMax !== null || onlyCustomizable || searchQuery.trim() !== '';
  const goToQuote = () => onNavigate('quote');

  /**
   * Bộ lọc dùng CHUNG cho cột trái (desktop) và bottom-sheet (mobile). Dựng bằng hàm để hai
   * bản không dùng lại cùng một cây element (tránh trùng `id`/`name` giữa 2 chỗ render).
   */
  const renderFilters = () => (
    <div className="space-y-4">
      <FilterGroup title="Danh Mục Bản Vẽ">
        <div className="space-y-1">
          <FilterOption
            active={selectedCategory === 'all'}
            onClick={() => setSelectedCategory('all')}
            icon="select_all"
            label="Tất cả danh mục"
            count={catalogProducts.length}
          />
          {CATEGORIES.filter(c => c.id !== 'all').map((cat) => (
            <FilterOption
              key={cat.id}
              active={selectedCategory === cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              icon={cat.icon}
              label={cat.name}
              count={categoryCounts[cat.id] || 0}
            />
          ))}
        </div>
      </FilterGroup>

      {priceRange && (
        <FilterGroup title="Khoảng Giá In Vật Lý">
          <div className="grid grid-cols-2 gap-1.5 mb-3">
            {PRICE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectPricePreset(preset.id)}
                aria-pressed={pricePreset === preset.id}
                className={`min-h-11 rounded-full border px-3 py-1.5 text-xs font-mono transition-colors duration-200 cursor-pointer text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  pricePreset === preset.id
                    ? 'bg-primary text-primary-fg border-primary font-semibold'
                    : 'bg-surface text-fg-muted border-line hover:border-line-control hover:text-fg'
                }`}
              >
                {preset.vi}
              </button>
            ))}
          </div>

          <div className="pt-1">
            <div className="flex justify-between items-baseline mb-1 text-xs font-mono gap-2">
              <span className="text-fg-muted">Tối đa:</span>
              <span className="font-bold text-fg tabular-nums">
                {priceMax === null
                  ? ('Không giới hạn')
                  : formatCurrency(priceMax)}
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
              aria-label="Giá in vật lý tối đa"
              className="w-full accent-primary cursor-pointer"
            />
            <div className="flex justify-between text-xs font-mono text-fg-muted mt-0.5 tabular-nums">
              <span>{formatCurrency(priceRange.min)}</span>
              <span>{formatCurrency(priceRange.ceiling)}</span>
            </div>
          </div>
        </FilterGroup>
      )}

      {/* Material Filter — lấy từ bảng `materials` thật; rỗng ⇒ ẩn cả nhóm */}
      {materialOptions.length > 0 && (
        <FilterGroup title="Vật Liệu Hỗ Trợ" defaultOpen={false}>
          <div className="space-y-1">
            <FilterOption
              active={selectedMaterial === 'all'}
              onClick={() => setSelectedMaterial('all')}
              label="Tất cả vật liệu"
              icon="done"
            />
            {materialOptions.map((mat) => (
              <FilterOption
                key={mat}
                active={selectedMaterial === mat}
                onClick={() => setSelectedMaterial(mat)}
                label={mat}
              />
            ))}
          </div>
        </FilterGroup>
      )}

      <FilterGroup title="Tính Năng" defaultOpen={false}>
        <label className="flex min-h-11 items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={onlyCustomizable}
            onChange={(e) => setOnlyCustomizable(e.target.checked)}
            className="size-4 accent-primary cursor-pointer"
          />
          <span className="text-sm text-fg font-medium">
            {'Hỗ trợ khắc tên & tùy biến'}
          </span>
        </label>
      </FilterGroup>
    </div>
  );

  return (
    <div className="min-h-dvh bg-canvas text-fg py-6 sm:py-10 px-4 sm:px-6 md:px-12 font-sans relative selection:bg-primary selection:text-primary-fg">
      <SEOHead
        title={'Kho Bản Vẽ CAD & Linh Kiện 3D'}
        description={(catalogProducts.length > 0
            ? `Kho ${catalogProducts.length} bản vẽ CAD & linh kiện 3D trên VCUBE — giá, vật liệu hỗ trợ và định dạng tệp lấy từ dữ liệu sản phẩm.`
            : 'Kho bản vẽ CAD & linh kiện 3D của VCUBE. Hiện chưa có bản vẽ nào được đăng — bạn vẫn có thể gửi tệp 3D để nhận báo giá in.')}
        image={realProductImageUrl(products[0]?.images, products[0]?.thumbnailUrl)}
        url={typeof window !== 'undefined' ? window.location.href : undefined}
        type="website"
      />

      <div className="mx-auto max-w-7xl space-y-8">
        {/* Editorial Modern Header Title */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5 pb-6 border-b border-line">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1 text-xs font-semibold uppercase tracking-wider text-fg-muted shadow-soft">
              <span className="size-1.5 rounded-full bg-brand" aria-hidden="true" />
              <span>Kho Bản Vẽ CAD VCUBE</span>
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight text-fg">
              {'Bộ Sưu Tập & Bản Vẽ Kỹ Thuật CAD'}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs sm:text-sm text-fg-muted font-sans max-w-2xl leading-relaxed">
              <span>
                {showError
                  ? ('Chưa tải được kho bản vẽ.')
                  : isCatalogLoading
                    ? ('Đang tải kho bản vẽ…')
                    : catalogProducts.length > 0
                      ? (`${catalogProducts.length} bản vẽ đang có — vật liệu hỗ trợ, định dạng tệp và giá lấy từ dữ liệu sản phẩm.`)
                      : ('Kho bản vẽ đang trống.')}
              </span>
              <InfoTip label="Số bản vẽ này đếm gì?">
                Đếm theo các bản vẽ đang hiển thị với vai trò hiện tại. Trường nào người bán chưa khai (giá, giấy phép, thời gian in, tác giả) sẽ hiện — thay vì một giá trị đoán hộ. Kho trống thì bạn vẫn gửi được tệp 3D để nhận báo giá in.
              </InfoTip>
            </p>
          </div>

          {/* Quick Search Bar — search pill (§3.3, ngoại lệ control duy nhất) */}
          <div className="relative w-full lg:w-96 shrink-0 space-y-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Tìm linh kiện CAD (vd: Bánh răng, ESP32, Drone)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Tìm kiếm bản vẽ CAD"
                className="h-11 w-full rounded-full border border-line-control bg-surface pl-10 pr-11 text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:border-primary focus:ring-2 focus:ring-ring"
              />
              <Icon name="search" size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-muted" />
              {searchQuery && (
                <Button
                  iconOnly
                  variant="ghost"
                  size="sm"
                  aria-label="Xoá từ khoá tìm kiếm"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-1 top-1/2 -translate-y-1/2"
                  leadingIcon={<Icon name="close" size={18} />}
                />
              )}
            </div>
            {/* Đường thoát thật khi kho rỗng: khách vẫn gửi được tệp của mình */}
            <Button
              variant="secondary"
              size="md"
              fullWidth
              leadingIcon={<Icon name="request_quote" size={18} />}
              onClick={goToQuote}
            >
              Báo giá tệp 3D của bạn
            </Button>
          </div>
        </div>

        {/* §4.2 v3 — Category tiles pastel: lối vào nhanh theo danh mục, không thay bộ lọc */}
        <section aria-labelledby="explore-categories" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="explore-categories" className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
              Danh mục bản vẽ
            </h2>
            {selectedCategory !== 'all' && (
              <Button variant="ghost" size="sm" leadingIcon={<Icon name="close" size={16} />} onClick={() => setSelectedCategory('all')}>
                Bỏ lọc danh mục
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-6">
            {CATEGORIES.filter((c) => c.id !== 'all').map((cat, index) => {
              const active = selectedCategory === cat.id;
              const count = categoryCounts[cat.id] || 0;
              return (
                <button
                  key={cat.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSelectedCategory(active ? 'all' : cat.id)}
                  className={`group/tile flex min-h-[104px] flex-col justify-between gap-2 rounded-lg p-3 text-left transition-shadow duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none ${TILE_TONE[index % TILE_TONE.length]} ${
                    active ? 'shadow-e2 ring-2 ring-primary' : 'shadow-soft hover:shadow-e2'
                  }`}
                >
                  <span className="flex items-start justify-between gap-2">
                    <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-md bg-surface/70 text-fg">
                      <Icon name={cat.icon} size={18} />
                    </span>
                    {count > 0 ? (
                      <span className="font-mono text-xs tabular-nums text-fg-muted">{count}</span>
                    ) : null}
                  </span>
                  <span className="text-xs font-semibold leading-snug text-fg">
                    {cat.name}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Popular tag chips — chip là pill (§2.1: pill chỉ cho nav/search/chip) */}
        <Card variant="soft" className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-fg-muted">
              <Icon name="sell" size={18} className="text-fg-muted" />
              Lọc nhanh theo thẻ kỹ thuật:
            </span>
            {selectedTag !== 'all' && (
              <Button
                variant="danger-ghost"
                size="sm"
                leadingIcon={<Icon name="close" size={18} />}
                onClick={() => setSelectedTag('all')}
              >
                Bỏ lọc thẻ
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
                    className={`flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-mono transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                      isActive
                        ? 'bg-primary text-primary-fg border-primary font-semibold'
                        : 'bg-surface text-fg-muted border-line hover:border-line-control hover:text-fg'
                    }`}
                  >
                    <Icon name={tag.icon} size={16} />
                    <span>{tag.nameVi}</span>
                  </button>
                );
              })}
            </HorizontalScrollFilter>
          </div>
        </Card>

        {/* Active Filters Tray */}
        {hasActiveFilters && (
          <Card variant="soft" padding="sm" className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-fg-muted">
                <Icon name="filter_alt" size={18} />
                Đang lọc:
              </span>

              {searchQuery && (
                <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-medium text-fg">
                  <span>Tìm: "{searchQuery}"</span>
                  <Button iconOnly size="sm" variant="ghost" aria-label="Xoá tìm kiếm" onClick={() => setSearchQuery('')} className="-m-2 hover:text-danger" leadingIcon={<Icon name="close" size={18} />} />
                </span>
              )}

              {selectedCategory !== 'all' && (
                <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-medium text-fg">
                  <span>Danh mục: {CATEGORIES.find(c => c.id === selectedCategory)?.name || selectedCategory}</span>
                  <Button iconOnly size="sm" variant="ghost" aria-label="Bỏ lọc danh mục" onClick={() => setSelectedCategory('all')} className="-m-2 hover:text-danger" leadingIcon={<Icon name="close" size={18} />} />
                </span>
              )}

              {selectedTag !== 'all' && (
                <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-medium text-fg">
                  <span>Thẻ: #{selectedTag}</span>
                  <Button iconOnly size="sm" variant="ghost" aria-label="Bỏ lọc thẻ" onClick={() => setSelectedTag('all')} className="-m-2 hover:text-danger" leadingIcon={<Icon name="close" size={18} />} />
                </span>
              )}

              {selectedMaterial !== 'all' && materialOptions.length > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-medium text-fg">
                  <span>Vật liệu: {selectedMaterial}</span>
                  <Button iconOnly size="sm" variant="ghost" aria-label="Bỏ lọc vật liệu" onClick={() => setSelectedMaterial('all')} className="-m-2 hover:text-danger" leadingIcon={<Icon name="close" size={18} />} />
                </span>
              )}

              {pricePreset !== 'all' && (
                <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-medium text-fg">
                  <span>
                    Giá: {pricePreset === 'under100' ? '< 100k' : pricePreset === '100to250' ? '100k – 250k' : pricePreset === '250to500' ? '250k – 500k' : '> 500k'}
                  </span>
                  <Button iconOnly size="sm" variant="ghost" aria-label="Bỏ lọc khoảng giá" onClick={() => setPricePreset('all')} className="-m-2 hover:text-danger" leadingIcon={<Icon name="close" size={18} />} />
                </span>
              )}

              {priceMax !== null && (
                <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-medium text-fg">
                  <span>Tối đa: {formatCurrency(priceMax)}</span>
                  <Button iconOnly size="sm" variant="ghost" aria-label="Bỏ giới hạn giá" onClick={() => setPriceMax(null)} className="-m-2 hover:text-danger" leadingIcon={<Icon name="close" size={18} />} />
                </span>
              )}

              {onlyCustomizable && (
                <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-medium text-fg">
                  <span>{'Hỗ trợ khắc tên & tùy biến'}</span>
                  <Button iconOnly size="sm" variant="ghost" aria-label="Bỏ lọc tuỳ biến" onClick={() => setOnlyCustomizable(false)} className="-m-2 hover:text-danger" leadingIcon={<Icon name="close" size={18} />} />
                </span>
              )}
            </div>

            <Button
              variant="danger-ghost"
              size="sm"
              leadingIcon={<Icon name="restart_alt" size={18} />}
              onClick={resetFilters}
            >
              Xóa toàn bộ bộ lọc
            </Button>
          </Card>
        )}

        {/* Mobile Filter Toggle Button — cột lọc thành bottom-sheet dưới lg */}
        <div className="flex items-center gap-3 lg:hidden">
          <Button
            variant="secondary"
            size="md"
            className="flex-1"
            leadingIcon={<Icon name="tune" size={18} className="text-fg-muted" />}
            onClick={() => setMobileFilterOpen(true)}
          >
            {`Bộ lọc (${filteredProducts.length})`}
          </Button>
          <Button variant="ghost" size="md" onClick={resetFilters}>
            Đặt lại
          </Button>
        </div>

        {/* Main Grid: Filters Sidebar + Products */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
          {/* Left Sidebar Filters — desktop only; mobile dùng bottom-sheet bên dưới */}
          <aside className="hidden lg:block lg:col-span-3 space-y-5">
            <Card variant="soft" padding="lg" className="space-y-6">
              <div className="flex items-center justify-between gap-2 pb-3.5 border-b border-line">
                <span className="flex items-center gap-1.5 text-sm font-bold text-fg">
                  <Icon name="tune" size={18} className="text-fg-muted" />
                  Bộ lọc phân loại
                </span>
                {hasActiveFilters && (
                  <Button variant="danger-ghost" size="sm" onClick={resetFilters}>
                    Xóa lọc
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
            <Card variant="soft" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-fg-muted">
                  Hiển thị <strong className="text-fg font-mono font-semibold tabular-nums">{renderedProducts.length} / {filteredProducts.length}</strong> bản vẽ
                </span>
                {selectedTag !== 'all' && (
                  <Badge variant="neutral">Thẻ: #{selectedTag}</Badge>
                )}
                {isAdmin && (
                  <Badge variant="warning">Chế độ quản trị (mọi trạng thái)</Badge>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* View Mode Switcher — segmented control §3.6 (track + item pill) */}
                <div className="inline-flex items-center gap-1 rounded-full border border-line bg-surface-muted p-1">
                  <button
                    type="button"
                    aria-label="Xem dạng lưới"
                    aria-pressed={viewMode === 'grid'}
                    onClick={() => setViewMode('grid')}
                    className={`grid size-10 max-md:size-12 place-items-center rounded-full transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      viewMode === 'grid'
                        ? 'bg-surface text-fg shadow-soft'
                        : 'text-fg-muted hover:text-fg'
                    }`}
                  >
                    <Icon name="grid_view" size={16} />
                  </button>
                  <button
                    type="button"
                    aria-label="Xem dạng bảng"
                    aria-pressed={viewMode === 'tech-table'}
                    onClick={() => setViewMode('tech-table')}
                    className={`grid size-10 max-md:size-12 place-items-center rounded-full transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      viewMode === 'tech-table'
                        ? 'bg-surface text-fg shadow-soft'
                        : 'text-fg-muted hover:text-fg'
                    }`}
                  >
                    <Icon name="table_rows" size={16} />
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Sắp xếp:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    aria-label="Sắp xếp danh sách bản vẽ"
                    className="h-10 max-md:min-h-11 rounded-md border border-line-control bg-surface px-3 text-sm font-medium text-fg cursor-pointer focus:outline-none focus:border-primary focus:ring-2 focus:ring-ring"
                  >
                    <option value="featured">Nổi bật nhất</option>
                    <option value="popular">Lượt in nhiều nhất</option>
                    <option value="price-asc">Giá tăng dần</option>
                    <option value="price-desc">Giá giảm dần</option>
                    <option value="rating">Đánh giá cao nhất</option>
                  </select>
                </div>
              </div>
            </Card>

            {/* CTA cố định — khách đã có tệp riêng muốn báo giá gia công ngay */}
            <div className="sticky top-20 z-panel">
              <Card variant="soft" padding="sm" className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate text-xs text-fg-muted">
                  Đã có tệp CAD riêng? Báo giá gia công ngay.
                </span>
                <Button
                  variant="primary"
                  size="sm"
                  className="shrink-0"
                  leadingIcon={<Icon name="request_quote" size={16} />}
                  onClick={goToQuote}
                >
                  Báo giá tệp 3D riêng
                </Button>
              </Card>
            </div>

            {/* Dải cảnh báo đặt TRÊN state switch: lỗi nhưng vẫn còn dữ liệu cũ để xem (R6). */}
            {showWarning && (
              <p
                role="status"
                className="flex items-center gap-2 rounded-md border border-warning/30 bg-warning-tint px-3 py-2 text-xs text-warning"
              >
                <Icon name="warning" size={16} />
                Không làm mới được kho — đang hiển thị dữ liệu lần trước.
              </p>
            )}

            {isCatalogLoading ? (
              /* LOADING — skeleton đúng layout lưới thẻ */
              <div
                role="status"
                aria-label="Đang tải kho bản vẽ"
                className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6"
              >
                {Array.from({ length: SKELETON_CARD_COUNT }).map((_, index) => (
                  <ProductCardSkeleton key={index} />
                ))}
              </div>
            ) : showError ? (
              /* ERROR — lỗi thật, bọc role="alert"; EmptyState KHÔNG truyền `live` (R7). */
              <div role="alert">
                <EmptyState
                  icon={<Icon name="error" size={20} />}
                  title="Không tải được kho bản vẽ"
                  description="Không kết nối được tới máy chủ dữ liệu. Kiểm tra kết nối mạng rồi thử lại."
                  action={
                    <>
                      <Button
                        variant="secondary"
                        size="md"
                        loading={Boolean(productsLoading)}
                        loadingLabel="Đang tải…"
                        leadingIcon={<Icon name="refresh" size={18} />}
                        onClick={() => onRetry?.()}
                      >
                        Thử lại
                      </Button>
                      <Button variant="primary" size="md" onClick={goToQuote} leadingIcon={<Icon name="request_quote" size={18} />}>
                        Báo giá tệp 3D của bạn
                      </Button>
                    </>
                  }
                />
              </div>
            ) : filteredProducts.length === 0 ? (
              /* EMPTY STATE — nêu đúng nguyên nhân + đường thoát thật */
              <EmptyState
                live
                bordered
                icon={<Icon name={catalogIsEmpty ? 'inventory_2' : 'search_off'} size={20} />}
                title={catalogIsEmpty
                  ? ('Kho bản vẽ đang trống')
                  : ('Không có bản vẽ nào khớp bộ lọc')}
                description={
                  <>
                    {catalogIsEmpty
                      ? ('Chưa có bản vẽ CAD nào được đăng trên VCUBE.')
                      : ('Hãy bỏ bớt điều kiện hoặc đổi từ khoá tìm kiếm.')}
                    {!catalogIsEmpty && (
                      <span className="mt-2 block">
                        <button
                          type="button"
                          onClick={goToQuote}
                          className="cursor-pointer rounded-sm text-sm font-medium text-fg underline underline-offset-4 transition-colors duration-200 hover:text-fg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          Báo giá tệp 3D của bạn
                        </button>
                      </span>
                    )}
                    {catalogIsEmpty && hasActiveFilters && (
                      <span className="mt-2 block">
                        <button
                          type="button"
                          onClick={resetFilters}
                          className="cursor-pointer rounded-sm text-sm font-medium text-fg underline underline-offset-4 transition-colors duration-200 hover:text-fg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          Xóa bộ lọc
                        </button>
                      </span>
                    )}
                    <span className="mt-2 flex justify-center">
                      <InfoTip
                        label="Vì sao có thể không thấy bản vẽ nào?"
                        title="Về trạng thái rỗng"
                      >
                        {catalogIsEmpty
                          ? ('Chưa có bản vẽ nào được đăng nên bộ lọc chưa có gì để lọc. Bạn vẫn gửi được tệp 3D của mình để nhận báo giá in.')
                          : (`${filteredProducts.length} / ${catalogProducts.length} bản vẽ khớp bộ lọc đang chọn.`)}
                      </InfoTip>
                    </span>
                  </>
                }
                action={
                  catalogIsEmpty ? (
                    <Button variant="primary" size="md" leadingIcon={<Icon name="request_quote" size={18} />} onClick={goToQuote}>
                      Báo giá tệp 3D của bạn
                    </Button>
                  ) : (
                    <Button variant="primary" size="md" leadingIcon={<Icon name="restart_alt" size={18} />} onClick={resetFilters}>
                      Xóa toàn bộ bộ lọc
                    </Button>
                  )
                }
              />
            ) : viewMode === 'grid' ? (
              /* GRID VIEW — card soft, thứ tự: ảnh/3D → tiêu đề → vật liệu/định dạng → giá/giấy phép → CTA */
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {renderedProducts.map((product) => {
                    const isBookmarked = bookmarkedIds.includes(product.id);
                    const imageUrl = realProductImageUrl(product.images, product.thumbnailUrl);
                    const rating = ratingOf(product);

                    return (
                      <Card
                        key={product.id}
                        as="article"
                        variant="soft"
                        padding="none"
                        className="content-auto group relative flex flex-col overflow-hidden transition-shadow duration-300 hover:shadow-e2 motion-reduce:transition-none"
                      >
                        {/* 1. Product Image / 3D thumb — tỉ lệ cố định 4:3 */}
                        <div className="responsive-aspect-frame">
                          {/* Placeholder nền: hiện khi chưa có ảnh thật hoặc ảnh lỗi */}
                          <div
                            aria-hidden="true"
                            className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-surface-muted text-fg-muted"
                          >
                            <Icon name={categoryIcon(product.category)} size={36} />
                            <span className="font-mono text-xs uppercase tracking-wider">
                              {product.cadFormat || 'CAD'}
                            </span>
                          </div>
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={product.name}
                              loading="lazy"
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              className="responsive-img-cover relative"
                            />
                          ) : null}

                          {/* Badges — chỉ dữ liệu DB trả về; trên ảnh nên dùng nền sáng mờ + viền */}
                          <div className="absolute top-2 left-2 flex flex-col gap-1 items-start pointer-events-none">
                            {product.badge && (
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface/90 px-2.5 py-1 text-xs font-medium text-fg-muted backdrop-blur-sm shadow-e1">
                                {product.badge}
                              </span>
                            )}
                            {product.cadFormat && (
                              <span className="inline-flex items-center rounded-full bg-primary px-2.5 py-1 text-xs font-mono font-medium uppercase text-primary-fg shadow-e1">
                                {product.cadFormat}
                              </span>
                            )}
                          </div>

                          {/* 3D Quick-Inspect Trigger */}
                          <button
                            type="button"
                            onClick={(e) => handleOpen3DPreview(product, e)}
                            className="absolute inset-0 bg-surface-inverse/70 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100 focus-visible:pointer-events-auto [@media(hover:none)]:opacity-100 [@media(hover:none)]:pointer-events-auto [@media(hover:none)]:bg-surface-inverse/40 transition-opacity flex flex-col items-center justify-center gap-2 text-on-inverse font-mono text-xs uppercase tracking-wider font-bold cursor-pointer"
                            aria-label={`Xem trước 3D: ${product.name}`}
                          >
                            <span className="grid size-11 place-items-center rounded-md bg-primary text-primary-fg shadow-e1">
                              <Icon name="3d_rotation" size={24} />
                            </span>
                            <span className="rounded-sm bg-surface-inverse/80 px-3 py-1 text-xs text-accent">
                              Xem trước 3D
                            </span>
                          </button>

                          {product.printTime && (
                            <span className="absolute bottom-2 right-2 inline-flex items-center gap-1.5 rounded-full border border-line bg-surface/90 px-2.5 py-1 text-xs font-mono text-fg-muted backdrop-blur-sm shadow-e1">
                              <Icon name="schedule" size={16} className="shrink-0" />
                              {product.printTime}
                            </span>
                          )}

                          {/* Bookmark */}
                          <Button
                            iconOnly
                            variant="secondary"
                            size="sm"
                            className="absolute top-2 right-2 z-sticky shadow-e1"
                            aria-label={isBookmarked ? ('Bỏ yêu thích') : ('Yêu thích bản vẽ')}
                            aria-pressed={isBookmarked}
                            onClick={(e) => toggleBookmark(product.id, e)}
                            leadingIcon={<Icon name={isBookmarked ? 'favorite' : 'favorite_border'} size={20} fill={isBookmarked ? 'currentColor' : 'none'} className={isBookmarked ? 'text-danger' : 'text-fg-muted'} />}
                          />
                        </div>

                        {/* Info — tiêu đề → vật liệu/định dạng/kích thước → giá + giấy phép → CTA */}
                        <div className="flex-1 flex flex-col gap-3 p-4">
                          {/* 2. Title */}
                          <div className="flex items-start justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                onSelectProduct(product);
                                onNavigate('product_detail', { product });
                              }}
                              className="min-w-0 rounded-sm text-left text-sm font-semibold leading-snug tracking-tight text-fg line-clamp-2 transition-colors duration-200 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              title={product.name}
                            >
                              {product.name}
                            </button>
                            {rating ? (
                              <span className="shrink-0 inline-flex items-center gap-1 font-mono text-xs tabular-nums font-semibold text-fg">
                                <Icon name="star" aria-hidden="true" className="size-3.5 fill-current text-warning-strong" />
                                {rating.value}
                                <span className="font-normal text-fg-muted">({rating.count})</span>
                              </span>
                            ) : (
                              <span className="shrink-0 text-xs text-fg-muted">
                                Chưa có đánh giá
                              </span>
                            )}
                          </div>

                          {/* 3. Material / format / dimensions — chỉ hiện dữ liệu thật, thiếu ⇒ — */}
                          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-fg-muted">
                            <span className="flex min-w-0 items-center gap-1.5">
                              <Icon name="layers" size={14} className="shrink-0" aria-hidden="true" />
                              <span className="truncate" title={`Vật liệu: ${materialLabel(product)}`}>
                                Vật liệu: {materialLabel(product)}
                              </span>
                            </span>
                            <span className="flex min-w-0 items-center gap-1.5">
                              <Icon name="category" size={14} className="shrink-0" aria-hidden="true" />
                              <span className="truncate">
                                Định dạng: {product.cadFormat || EMPTY_VALUE}
                              </span>
                            </span>
                            <span className="col-span-2 flex min-w-0 items-center gap-1.5">
                              <Icon name="straighten" size={14} className="shrink-0" aria-hidden="true" />
                              <span className="truncate">
                                Kích thước: {product.specs?.dimensions || EMPTY_VALUE}
                              </span>
                            </span>
                          </div>

                          {/* 4. Price + license */}
                          <div className="mt-auto space-y-2 border-t border-line-subtle pt-3">
                            <div className="flex items-baseline justify-between gap-2 font-sans">
                              <div className="min-w-0">
                                <span className="block text-xs font-semibold uppercase tracking-wider text-fg-muted">
                                  Tệp CAD
                                </span>
                                <span className="font-mono text-sm font-semibold text-fg tabular-nums">
                                  {formatVnd(product.priceDigital, numberLocale)}
                                </span>
                              </div>
                              <div className="min-w-0 text-right">
                                <span className="block text-xs font-semibold uppercase tracking-wider text-fg-muted">
                                  In từ
                                </span>
                                <span className="font-mono text-sm font-semibold text-fg tabular-nums">
                                  {formatVnd(product.pricePhysical, numberLocale)}
                                </span>
                              </div>
                            </div>

                            <p className="flex min-w-0 items-center gap-1.5 text-xs text-fg-muted" title={licenseLabel(product.licenseType)}>
                              <Icon name="license" size={14} className="shrink-0" aria-hidden="true" />
                              <span className="truncate">
                                Giấy phép: {licenseLabel(product.licenseType)}
                              </span>
                            </p>

                            {/* 5. CTA: 1 nút chính + 1 icon phụ */}
                            <div className="flex items-center gap-2 pt-1">
                              <Button
                                variant="primary"
                                size="md"
                                className="flex-1"
                                leadingIcon={<Icon name="download" size={18} />}
                                onClick={() => {
                                  onSelectProduct(product);
                                  onNavigate('product_detail', { product });
                                }}
                              >
                                {'Xem & tải tệp'}
                              </Button>

                              <Button
                                iconOnly
                                variant="secondary"
                                size="md"
                                aria-label={`Đặt in 3D: ${product.name}`}
                                onClick={(e) => handleOpenPhysicalConfig(product, e)}
                                disabled={!(isNum(product.pricePhysical) && product.pricePhysical > 0)}
                                title={isNum(product.pricePhysical) && product.pricePhysical > 0
                                  ? ('Cấu hình đặt in 3D nhanh')
                                  : ('Người bán không mở bán kênh in vật lý.')}
                                leadingIcon={<Icon name="precision_manufacturing" size={18} className="text-fg" />}
                              />
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
                      leadingIcon={<Icon name="expand_more" size={18} />}
                      onClick={() => setVisibleCount((prev) => prev + 12)}
                    >
                      {`Xem thêm (${filteredProducts.length - visibleCount} bản vẽ CAD)`}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              /* TECH TABLE VIEW — density bảng giữ nguyên §3.5 */
              <Card variant="soft" padding="none" className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm font-sans">
                    <thead className="bg-surface-muted text-xs uppercase tracking-wider text-fg-subtle border-b border-line">
                      <tr>
                        <th className="h-10 px-4 text-left font-semibold">Linh kiện CAD</th>
                        <th className="h-10 px-4 text-left font-semibold">Danh mục</th>
                        <th className="h-10 px-4 text-left font-semibold">Kích thước</th>
                        <th className="h-10 px-4 text-left font-semibold">
                          <span className="inline-flex items-center gap-1">
                            Thời gian in
                            <InfoTip label={'Ô "—" ở cột này nghĩa là gì?'}>
                              Người bán chưa khai thời gian in cho bản vẽ này. Ô để trống hiện — thay vì một con số đoán hộ.
                            </InfoTip>
                          </span>
                        </th>
                        <th className="h-10 px-4 text-left font-semibold">
                          <span className="inline-flex items-center gap-1">
                            Giấy phép
                            <InfoTip label="Giấy phép hiển thị thế nào?">
                              Giấy phép đọc từ trường license_type của sản phẩm. Người bán chưa khai thì ghi rõ "— (người bán chưa khai báo)" — không tự gán giấy phép Thương mại.
                            </InfoTip>
                          </span>
                        </th>
                        <th className="h-10 px-4 text-right font-semibold">Giá tệp CAD</th>
                        <th className="h-10 px-4 text-right font-semibold">Giá in từ...</th>
                        <th className="h-10 px-4 text-right font-semibold">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line-subtle">
                      {renderedProducts.map((product) => {
                        const imageUrl = realProductImageUrl(product.images, product.thumbnailUrl);
                        return (
                          <tr key={product.id} className="h-11 hover:bg-surface-muted/60 transition-colors">
                            <td className="px-4 py-2 text-sm text-fg">
                              <div className="flex items-center gap-3">
                                {imageUrl ? (
                                  <img
                                    src={imageUrl}
                                    alt={product.name}
                                    loading="lazy"
                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                    className="size-12 shrink-0 rounded-md object-cover"
                                  />
                                ) : (
                                  <span className="grid size-12 shrink-0 place-items-center rounded-md bg-surface-muted text-fg-muted">
                                    <Icon name={categoryIcon(product.category)} size={18} />
                                  </span>
                                )}
                                <div className="min-w-0">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onSelectProduct(product);
                                      onNavigate('product_detail', { product });
                                    }}
                                    className="max-w-[220px] truncate rounded-sm text-left text-sm font-semibold text-fg cursor-pointer hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                  >
                                    {product.name}
                                  </button>
                                  <span className="block truncate font-mono text-xs text-fg-muted">
                                    {product.designer || EMPTY_VALUE}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-2 text-sm font-mono font-semibold uppercase text-fg-muted">
                              {product.category || EMPTY_VALUE}
                            </td>
                            <td className="px-4 py-2 text-sm font-mono text-fg tabular-nums">
                              {product.specs?.dimensions || EMPTY_VALUE}
                            </td>
                            <td className="px-4 py-2 text-sm font-mono text-fg-muted tabular-nums">
                              {product.printTime || EMPTY_VALUE}
                            </td>
                            <td className="px-4 py-2 text-sm font-mono text-fg-muted">
                              {licenseLabel(product.licenseType)}
                            </td>
                            <td className="px-4 py-2 text-right text-sm font-mono font-semibold text-fg tabular-nums">
                              {formatVnd(product.priceDigital, numberLocale)}
                            </td>
                            <td className="px-4 py-2 text-right text-sm font-mono text-fg-muted tabular-nums">
                              {formatVnd(product.pricePhysical, numberLocale)}
                            </td>
                            <td className="px-4 py-2 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  iconOnly
                                  variant="secondary"
                                  size="sm"
                                  aria-label={`Xem trước 3D: ${product.name}`}
                                  leadingIcon={<Icon name="3d_rotation" size={18} />}
                                  onClick={(e) => handleOpen3DPreview(product, e)}
                                  title="Xem trước 3D"
                                />
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  leadingIcon={<Icon name="precision_manufacturing" size={16} />}
                                  onClick={(e) => handleOpenPhysicalConfig(product, e)}
                                  disabled={!(isNum(product.pricePhysical) && product.pricePhysical > 0)}
                                  title={isNum(product.pricePhysical) && product.pricePhysical > 0
                                    ? ('Cấu hình đặt in 3D nhanh')
                                    : ('Người bán không mở bán kênh in vật lý.')}
                                >
                                  Đặt in 3D
                                </Button>
                                <Button
                                  variant="primary"
                                  size="sm"
                                  leadingIcon={<Icon name="download" size={16} />}
                                  onClick={(e) => handleQuickAddDigital(product, e)}
                                  disabled={!(isNum(product.priceDigital) && product.priceDigital > 0)}
                                  title={isNum(product.priceDigital) && product.priceDigital > 0
                                    ? ('Thêm tệp CAD vào giỏ hàng')
                                    : ('Người bán không mở bán kênh tệp số.')}
                                >
                                  {isNum(product.priceDigital) && product.priceDigital > 0
                                    ? ('Tải CAD')
                                    : ('Không bán tệp số')}
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

      {/* Mobile filter bottom-sheet — cùng nội dung bộ lọc với cột trái.
          LUÔN mount (chỉ đổi prop `open`): mount có điều kiện + StrictMode làm effect của
          Modal chạy mount→cleanup→mount, `dialog.close()` trong cleanup đóng sheet vừa mở. */}
      <Sheet
          open={mobileFilterOpen}
          side="bottom"
          onClose={() => setMobileFilterOpen(false)}
          title="Bộ lọc bản vẽ"
          description={`Đang có ${filteredProducts.length} / ${catalogProducts.length} bản vẽ khớp điều kiện`}
          footer={
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="md" className="flex-1" onClick={resetFilters}>
                Xóa lọc
              </Button>
              <Button variant="primary" size="md" className="flex-1" onClick={() => setMobileFilterOpen(false)}>
                {`Xem ${filteredProducts.length} kết quả`}
              </Button>
            </div>
          }
        >
          {renderFilters()}
        </Sheet>

      {/* CAD Quick View 3D Modal */}
      <CadQuickViewModal
        product={quickViewProduct}
        isOpen={isQuickViewOpen}
        initialOrderType={quickViewInitialOrderType}
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
