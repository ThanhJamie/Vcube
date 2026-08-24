import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'vi' | 'en';

export const DICTIONARY = {
  // Brand & Slogans
  brandSubtitle: {
    vi: 'Chế Tác & In 3D Công Nghiệp Chính Xác',
    en: 'Industrial 3D Printing & Fabrication',
  },
  industrialTolerance: {
    vi: 'Dung sai chế tạo: ±0.05mm',
    en: 'Fabrication tolerance: ±0.05mm',
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
    vi: 'Tìm linh kiện, tag (vd: 2/9, IoT, Gear)...',
    en: 'Search parts, tags (e.g. 2/9, IoT, Gear)...',
  },

  // Campaign 2/9 & Landing Page
  campaign29Badge: {
    vi: 'ĐẠI LỄ 2/9 - ƯU ĐÃI GIA CÔNG CÔNG NGHIỆP',
    en: 'NATIONAL DAY 2/9 CAMPAIGN - SPECIAL FABRICATION OFFER',
  },
  campaign29Headline: {
    vi: 'Tuần Lễ Cơ Khí Chính Xác // Đại Lễ 2/9',
    en: 'Precision Engineering Week // National Day 2/9',
  },
  campaign29Desc: {
    vi: 'Giảm 20% toàn bộ file thiết kế CAD và miễn phí kiểm định dung sai ±0.05mm cho tất cả đơn hàng gắn tag #2/9.',
    en: '20% off all CAD models and free ±0.05mm metrology validation for all products tagged #2/9.',
  },
  explore29TagBtn: {
    vi: 'Khám Phá Bộ Sưu Tập 2/9',
    en: 'Explore 2/9 Collection',
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
    vi: 'Gia công bồi đắp linh kiện cơ khí, vỏ hộp IoT và khuôn mẫu kỹ thuật số. Kiểm tra hình học mesh tự động, nhận báo giá tức thì trong 3 giây với dung sai đo kiểm dưới ±0.05mm.',
    en: 'Additive fabrication for mechanical components, IoT enclosures, and digital tooling. Instant automated mesh inspection and quoting in 3 seconds with tolerance validated under ±0.05mm.',
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
  statToleranceVal: {
    vi: '±0.05 MM (Mitutoyo)',
    en: '±0.05 MM (Mitutoyo)',
  },
  statLeadTimeVal: {
    vi: 'GIAO HÀNG 24H',
    en: '24H DISPATCH',
  },
  statStandardVal: {
    vi: 'ISO/ASTM 52900',
    en: 'ISO/ASTM 52900',
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
  roleAdmin: {
    vi: 'Quản Trị Admin',
    en: 'Admin',
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
  liveSupportEngineer: {
    vi: 'Kỹ Sư VCUBE 24/7',
    en: 'VCUBE Engineer 24/7',
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
    vi: 'Nền tảng sản xuất bồi đắp và chế tác linh kiện cơ khí chính xác theo tiêu chuẩn công nghiệp ISO/ASTM 52900.',
    en: 'Additive manufacturing and precision mechanical fabrication platform meeting ISO/ASTM 52900 industrial standards.',
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
  footerIsoCert: {
    vi: 'Chứng nhận ISO 9001:2015',
    en: 'ISO 9001:2015 Certified',
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: keyof typeof DICTIONARY | string, fallbackVi?: string, fallbackEn?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('vcube_language') as Language;
    return saved === 'en' || saved === 'vi' ? saved : 'vi';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('vcube_language', lang);
  };

  const toggleLanguage = () => {
    const nextLang: Language = language === 'vi' ? 'en' : 'vi';
    setLanguage(nextLang);
  };

  const t = (key: string, fallbackVi?: string, fallbackEn?: string): string => {
    const item = (DICTIONARY as any)[key];
    if (item) {
      return item[language] || item.vi || key;
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
