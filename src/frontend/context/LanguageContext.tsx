import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { useAppSettings, useSiteContent } from '../hooks/useSettings';
import type { AppSettings } from '@backend/supabase/mappers';
import type { SiteContentConfig } from '../../types';

export type Language = 'vi' | 'en';

/**
 * Từ điển i18n tĩnh.
 *
 * 🔴 LUẬT TRUNG THỰC DỮ LIỆU (`docs/design/data-honesty.md` AT-06) — Đợt 7 / O3:
 * quyết định của chủ dự án cho file này là **phương án LAI**:
 *
 *   • NHÓM A — TUYÊN BỐ (dung sai chế tạo, thời gian bàn giao, tiêu chuẩn, chứng nhận,
 *     kênh hỗ trợ): **KHÔNG** viết giá trị ở đây. Giá trị đến từ cấu hình admin
 *     (`site_content`, `app_settings`) qua `configuredClaims()` bên dưới.
 *     **Chưa cấu hình ⇒ `''`** và component phải ẨN dòng đó (không in `—`, không đoán số).
 *
 *   • NHÓM B — CÂU VĂN quảng cáo có số bịa: đã viết lại TRUNG TÍNH, không còn
 *     hứa hẹn thời gian báo giá, tên thiết bị đo cụ thể, và tuyên bố tiêu chuẩn công nghiệp.
 *
 *   • NHÓM C — CHIẾN DỊCH không tồn tại (`campaign29*`, `explore29TagBtn`): đặt RỖNG (TẮT).
 *
 * ⚠️ `t()` trả về chuỗi RỖNG khi khoá rỗng (trước đây rơi về tên khoá ⇒ rò rỉ
 * "campaign29Desc" ra giao diện). Xem `LanguageProvider.t()`.
 *
 * Nhãn KHÔNG trùng lặp: nhãn "Dung sai chế tạo:" (`footerToleranceLabel`), "Đo kiểm theo
 * quy trình thoả thuận" (`footerQcPolicy`), "Trợ lý tự động" (`supportAssistant`) và
 * `footerAbout` đã có sẵn ở `src/App.tsx` (A22b) — file này KHÔNG tạo bản sao.
 */
export const DICTIONARY = {
  // Brand & Slogans
  brandSubtitle: {
    vi: 'Chế Tác & In 3D Công Nghiệp Chính Xác',
    en: 'Industrial 3D Printing & Fabrication',
  },
  // NHÓM A — giá trị do admin cấu hình (`site_content.toleranceSpec`). Rỗng ⇒ ẩn.
  industrialTolerance: {
    vi: '',
    en: '',
  },

  // Navigation
  navExplore: {
    vi: 'Kho Mẫu CAD',
    en: 'CAD Catalog',
  },
  navLab3D: {
    vi: 'Báo Giá In 3D',
    en: '3D Quoting',
  },
  navPersonalize: {
    vi: 'Cá Nhân Hóa',
    en: 'Customizer',
  },
  navOrders: {
    vi: 'Đơn Hàng',
    en: 'Orders',
  },
  navAdmin: {
    vi: 'Quản Trị Admin',
    en: 'Admin Console',
  },
  searchPlaceholder: {
    // Bỏ ví dụ tag '2/9': chiến dịch/tag đó không tồn tại (đã xoá khỏi POPULAR_TAGS, nợ #39).
    vi: 'Tìm linh kiện, tag (vd: IoT, Gear, Snap-Fit)...',
    en: 'Search parts, tags (e.g. IoT, Gear, Snap-Fit)...',
  },

  // NHÓM C — chiến dịch 2/9 & landing page: KHÔNG có chiến dịch nào tồn tại ⇒ TẮT (rỗng).
  // Banner đầu trang CHỈ bật bằng `site_content.announcementActive` (DB mặc định false;
  // admin bật ở /admin → Banner Đầu Trang). Không có đường nào ở đây bật cờ đó.
  campaign29Badge: {
    vi: '',
    en: '',
  },
  campaign29Headline: {
    vi: '',
    en: '',
  },
  campaign29Desc: {
    vi: '',
    en: '',
  },
  explore29TagBtn: {
    vi: '',
    en: '',
  },
  filterByTag: {
    vi: 'Lọc Theo Tag Sự Kiện & Chủ Đề',
    en: 'Filter by Event & Topic Tags',
  },
  allTags: {
    vi: 'Tất cả Tags',
    en: 'All Tags',
  },

  // Hero Section
  heroPreTitle: {
    vi: 'VCUBE // Nền Tảng Chế Tác Cơ Khí & In 3D Chuẩn Công Nghiệp',
    en: 'VCUBE // Industrial-Grade 3D Printing & Precision CAD Platform',
  },
  heroTitle: {
    vi: 'CHẾ TÁC CHÍNH XÁC\nCHUẨN CÔNG NGHIỆP',
    en: 'PRECISION\nFABRICATION\nANTHOLOGY',
  },
  heroDescription: {
    // NHÓM B — bỏ hứa hẹn thời gian báo giá và con số dung sai đo kiểm.
    vi: 'Gia công bồi đắp linh kiện cơ khí, vỏ hộp IoT và khuôn mẫu kỹ thuật số. Hình học của tệp bạn tải lên được phân tích và báo giá theo vật liệu, kích thước đo được từ chính tệp đó.',
    en: 'Additive fabrication for mechanical components, IoT enclosures, and digital tooling. The geometry you upload is analysed and quoted from the material and dimensions measured in that file.',
  },
  btnInstantQuote: {
    vi: 'Báo Giá File 3D Tức Thì',
    en: 'Instant 3D File Quote',
  },
  btnExploreCatalog: {
    vi: 'Khám Phá Kho Mẫu',
    en: 'Browse CAD Catalog',
  },
  statTolerance: {
    vi: 'Dung Sai',
    en: 'Tolerance',
  },
  statLeadTime: {
    vi: 'Thời Gian Giao',
    en: 'Lead Time',
  },
  statStandard: {
    vi: 'Tiêu Chuẩn',
    en: 'Standard',
  },
  // NHÓM A — 3 giá trị thẻ số liệu hero: lấy từ `site_content.heroMetric*Value`
  // (nhập ở /admin → Nội dung site → Hero). Rỗng ⇒ '' ⇒ hiện "Chưa cấu hình".
  statToleranceVal: {
    vi: '',
    en: '',
  },
  statLeadTimeVal: {
    vi: '',
    en: '',
  },
  statStandardVal: {
    vi: '',
    en: '',
  },

  // Quick Calculator Widget
  calcTitle: {
    vi: 'Mô Phỏng & Ước Tính Chi Phí In 3D Trực Tiếp',
    en: 'Live 3D Print Cost Simulator',
  },
  calcSubtitle: {
    vi: 'Chọn vật liệu, độ đặc infill và kích thước để ước tính ngay chi phí gia công',
    en: 'Select material, infill density, and dimensions for instant cost estimation',
  },
  calcMaterial: {
    vi: 'Loại vật liệu:',
    en: 'Material:',
  },
  calcInfill: {
    vi: 'Độ đặc Infill:',
    en: 'Infill Density:',
  },
  calcEstWeight: {
    vi: 'Trọng lượng ước tính:',
    en: 'Estimated weight:',
  },
  calcEstTime: {
    vi: 'Thời gian in:',
    en: 'Print duration:',
  },
  calcEstPrice: {
    vi: 'Giá gia công dự kiến:',
    en: 'Estimated price:',
  },
  calcUploadFullCTA: {
    vi: 'Tải File STL Lên Để Phân Tích Chi Tiết →',
    en: 'Upload STL File for Full Analysis →',
  },

  // Section Headers
  sectionTaxonomyPre: {
    vi: 'Taxonomy // Phân Loại',
    en: 'Taxonomy // Categories',
  },
  sectionTaxonomyTitle: {
    vi: 'Danh Mục Ứng Dụng Kỹ Thuật',
    en: 'Engineering Application Categories',
  },
  sectionCuratedPre: {
    vi: 'Curated Works // Tuyển Tập',
    en: 'Curated Works // Selection',
  },
  sectionCuratedTitle: {
    vi: 'Sản Phẩm & Bản Vẽ Tiêu Biểu',
    en: 'Featured Mechanical & CAD Models',
  },
  sectionWorkflowPre: {
    vi: 'Chronicle // Quy Trình Xưởng',
    en: 'Chronicle // Fabrication Flow',
  },
  sectionWorkflowTitle: {
    vi: 'Quy Trình Gia Công 3 Bước Chuẩn Xác',
    en: '3-Step Precision Manufacturing Workflow',
  },
  sectionTrustTitle: {
    vi: 'Được Tin Cậy Bởi Các Đơn Vị R&D & Xưởng Cơ Khí',
    en: 'Trusted by R&D Labs & Engineering Facilities',
  },

  // Product cards
  physicalModel: {
    vi: 'Bản In Vật Lý',
    en: 'Physical Model',
  },
  digitalAsset: {
    vi: 'File Số (STL/CAD)',
    en: 'Digital Asset (STL)',
  },
  details3D: {
    vi: 'Chi Tiết & Inspect 3D',
    en: 'Details & 3D Inspect',
  },
  customLaser: {
    vi: 'Cá Nhân Hóa / Khắc Tên',
    en: 'Customizer / Engraving',
  },
  viewAllArchive: {
    vi: 'Xem toàn bộ kho lưu trữ',
    en: 'View full CAD archive',
  },

  // Filters & Search
  filterOptions: {
    vi: 'Bộ Lọc Phân Loại',
    en: 'Filter Options',
  },
  clearAll: {
    vi: 'Xóa bộ lọc',
    en: 'Clear filters',
  },
  printMaterial: {
    vi: 'Vật Liệu In',
    en: 'Print Material',
  },
  allMaterials: {
    vi: 'Tất cả vật liệu',
    en: 'All materials',
  },
  maxPrice: {
    vi: 'Mức Giá Tối Đa',
    en: 'Max Price',
  },
  supportsCustom: {
    vi: 'Hỗ trợ khắc tên & tùy biến',
    en: 'Supports custom text & sizing',
  },
  sortBy: {
    vi: 'Sắp xếp theo:',
    en: 'Sort by:',
  },
  sortFeatured: {
    vi: 'Nổi bật nhất',
    en: 'Featured',
  },
  sortPriceAsc: {
    vi: 'Giá tăng dần',
    en: 'Price: Low to High',
  },
  sortPriceDesc: {
    vi: 'Giá giảm dần',
    en: 'Price: High to Low',
  },
  sortRating: {
    vi: 'Đánh giá cao nhất',
    en: 'Top Rated',
  },
  showingProducts: {
    vi: 'Hiển thị',
    en: 'Showing',
  },
  verifiedCadFiles: {
    vi: 'bản vẽ cơ khí đạt chuẩn',
    en: 'verified engineering CAD files',
  },
  noProductsFound: {
    vi: 'Không tìm thấy bản vẽ phù hợp với tiêu chí lọc',
    en: 'No matching models found for selected filters',
  },
  resetAllFilters: {
    vi: 'Xóa toàn bộ bộ lọc',
    en: 'Reset All Filters',
  },

  // Auth & Roles
  authenticatedAccount: {
    vi: 'TÀI KHOẢN ĐÃ XÁC THỰC',
    en: 'AUTHENTICATED ACCOUNT',
  },
  guestAccount: {
    vi: 'TÀI KHOẢN TRẢI NGHIỆM',
    en: 'DEMO ACCOUNT',
  },
  switchRoleQuick: {
    vi: 'Chuyển quyền nhanh (RBAC):',
    en: 'Quick Role Switch (RBAC):',
  },
  roleCustomer: {
    vi: 'Khách Hàng',
    en: 'Customer',
  },
  roleDesigner: {
    vi: 'Tác Giả 3D (Designer)',
    en: '3D Designer / Creator',
  },
  roleAdmin: {
    vi: 'Quản Trị Admin',
    en: 'Admin',
  },
  navDesignerStudio: {
    vi: 'Studio Thiết Kế',
    en: 'Designer Studio',
  },
  myOrdersTracking: {
    vi: 'Đơn hàng & Theo dõi in',
    en: 'Orders & Print Tracking',
  },
  signInSignUp: {
    vi: 'Đăng Nhập / Đăng Ký',
    en: 'Sign In / Register',
  },
  switchAccount: {
    vi: 'Đổi Tài Khoản',
    en: 'Switch Account',
  },
  signOut: {
    vi: 'Đăng Xuất',
    en: 'Sign Out',
  },

  // Support button
  // NHÓM A — KÊNH HỖ TRỢ: ghép từ hotline đã cấu hình (`app_settings.hotline` trước,
  // `site_content.hotline` sau). Rỗng ⇒ '' (ẩn). Bỏ nhãn "kỹ sư trực 24/7": không có
  // ca trực 24/7 nào được chứng minh.
  liveSupportEngineer: {
    vi: '',
    en: '',
  },
  liveSupportAria: {
    vi: 'Tư vấn kỹ thuật trực tuyến',
    en: 'Online technical consultation',
  },

  // Cart & Checkout
  cartTitle: {
    vi: 'Giỏ Hàng Kỹ Thuật',
    en: 'Engineering Cart',
  },
  checkoutTitle: {
    vi: 'Xác Nhận & Thanh Toán Đơn Hàng',
    en: 'Checkout & Order Confirmation',
  },
  orderSuccessTitle: {
    vi: 'Đặt Hàng Thành Công',
    en: 'Order Placed Successfully',
  },

  // Footer
  footerAboutText: {
    // NHÓM B — bỏ tuyên bố tiêu chuẩn công nghiệp (không có chứng nhận nào được lưu).
    vi: 'Nền tảng sản xuất bồi đắp và chế tác linh kiện cơ khí theo yêu cầu cho xưởng in và phòng R&D.',
    en: 'On-demand additive manufacturing and precision fabrication for print workshops and R&D teams.',
  },
  footerServices: {
    vi: 'Dịch Vụ & Mua Hàng',
    en: 'Services & Store',
  },
  footerInstantQuote: {
    vi: 'Báo giá file 3D trực tuyến',
    en: 'Instant 3D File Quoting',
  },
  footerMarketplace: {
    vi: 'Marketplace bản vẽ kỹ thuật',
    en: 'Engineering CAD Marketplace',
  },
  footerCreators: {
    vi: 'Quản Trị Hệ Thống',
    en: 'Administration',
  },
  footerLocationTitle: {
    vi: 'Trụ Sở & Xưởng Chế Tác',
    en: 'Headquarters & Facilities',
  },
  footerRights: {
    vi: '© 2026 VCUBE Vietnam Industrial Fabrication. Bảo lưu mọi quyền.',
    en: '© 2026 VCUBE Vietnam Industrial Fabrication. All rights reserved.',
  },
  footerCadSecurity: {
    vi: 'Bảo mật dữ liệu CAD/STL',
    en: 'CAD/STL Data Security',
  },
  // NHÓM A — CHỨNG NHẬN: chưa có trường cấu hình chứng nhận trong `site_content` /
  // `app_settings` ⇒ LUÔN rỗng (ẩn). Không được bịa chứng nhận chất lượng; muốn hiển thị
  // phải thêm trường cấu hình (ngoài phạm vi O3).
  footerIsoCert: {
    vi: '',
    en: '',
  },
};

/**
 * NHÓM A — TUYÊN BỐ lấy từ cấu hình admin.
 *
 * Nguồn dữ liệu (chỉ ĐỌC, qua `src/frontend/hooks/useSettings.ts`):
 *   • `site_content.toleranceSpec`  → `industrialTolerance`
 *   • `site_content.heroMetric1..3Value` → `statToleranceVal` / `statLeadTimeVal` / `statStandardVal`
 *   • hotline: `app_settings.hotline` trước, `site_content.hotline` sau → `liveSupportEngineer`
 *
 * LUẬT: chưa cấu hình ⇒ `''`. Component PHẢI ẨN — không rơi về số/kênh đoán và không in `—`.
 */
export function configuredClaims(
  language: Language,
  site: SiteContentConfig | null,
  app: AppSettings | null,
): Record<string, string> {
  const text = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
  const hotline = text(app?.hotline) || text(site?.hotline);
  return {
    industrialTolerance: text(site?.toleranceSpec),
    statToleranceVal: text(site?.heroMetric1Value),
    statLeadTimeVal: text(site?.heroMetric2Value),
    statStandardVal: text(site?.heroMetric3Value),
    liveSupportEngineer: hotline
      ? language === 'vi'
        ? `Hỗ trợ kỹ thuật: ${hotline}`
        : `Technical support: ${hotline}`
      : '',
    // Không có nguồn cấu hình chứng nhận ⇒ luôn ẩn (không bịa chứng nhận).
    footerIsoCert: '',
  };
}

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: keyof typeof DICTIONARY | string, fallbackVi?: string, fallbackEn?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // A7 — Vietnamese-only: UI không còn control đổi ngôn ngữ; trạng thái cũ trong
  // `localStorage` (kể cả `'en'`) không được phép kéo giao diện sang tiếng Anh.
  const [language, setLanguageState] = useState<Language>('vi');

  // NHÓM A: cấu hình admin (cache + realtime của `settingsService`, xem `useSettings`).
  // `data === null` = CHƯA CẤU HÌNH ⇒ mọi tuyên bố Nhóm A rỗng ⇒ ẩn.
  const { data: siteContent } = useSiteContent();
  const { data: appSettings } = useAppSettings();
  const claims = useMemo(
    () => configuredClaims(language, siteContent, appSettings),
    [language, siteContent, appSettings],
  );

  // A7: giữ API như cũ nhưng ép về `vi` — mọi giá trị khác (kể cả `'en'`) đều bị hạ cấp
  // để không tồn tại đường nào đưa UI về tiếng Anh.
  const setLanguage = (_lang: Language) => {
    setLanguageState('vi');
    try {
      localStorage.setItem('vcube_language', 'vi');
    } catch {
      /* localStorage có thể bị chặn — bỏ qua, state vẫn là `vi`. */
    }
  };

  const toggleLanguage = () => setLanguage('vi');

  const t = (key: string, fallbackVi?: string, fallbackEn?: string): string => {
    // NHÓM A thắng từ điển: giá trị đọc từ cấu hình admin — kể cả khi RỖNG
    // (`''` = chưa cấu hình ⇒ component phải ẩn, không rơi về chuỗi bịa).
    const claim = claims[key];
    if (claim !== undefined) return claim;

    const item = (DICTIONARY as any)[key];
    if (item) {
      const value = item[language] ?? item.vi;
      // Khoá rỗng là CÓ CHỦ Ý (NHÓM C: chiến dịch không tồn tại) ⇒ trả `''` để component ẩn.
      // Trước đây `'' || key` làm rò rỉ tên khoá ("campaign29Desc") ra giao diện.
      if (typeof value === 'string') return value;
    }
    if (language === 'en' && fallbackEn) return fallbackEn;
    if (language === 'vi' && fallbackVi) return fallbackVi;
    return fallbackVi || fallbackEn || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
};
