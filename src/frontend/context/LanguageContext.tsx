import React, { createContext, useContext, useMemo } from 'react';
import { useAppSettings, useSiteContent } from '../hooks/useSettings';
import type { AppSettings } from '@backend/supabase/mappers';
import type { SiteContentConfig } from '../../types';

/**
 * D0 — UI **tiếng Việt duy nhất** (Phase 2b, 2026-10-21).
 *
 * Hợp đồng còn lại: chỉ `t(key, fallbackVi?)` — KHÔNG còn đối số tiếng Anh. Đã xoá hẳn:
 * state ngôn ngữ, API đổi ngôn ngữ, khoá localStorage cũ, kiểu ngôn ngữ và mọi nhánh
 * tiếng Anh (kể cả 25 đối số EN chết ở call-site — xem 2b-followup).
 */

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
 *
 * Phase 2b (2026-10-21): đã xoá **85 giá trị tiếng Anh** (không bao giờ render vì UI chỉ
 * có một ngôn ngữ); mỗi entry chỉ còn `{ vi: string }`. `''` vẫn là "ẩn có chủ ý".
 */
export const DICTIONARY = {
  // Brand & Slogans
  brandSubtitle: {
    vi: 'Chế Tác & In 3D Công Nghiệp Chính Xác',
  },
  // NHÓM A — giá trị do admin cấu hình (`site_content.toleranceSpec`). Rỗng ⇒ ẩn.
  industrialTolerance: {
    vi: '',
  },

  // Navigation
  navExplore: {
    vi: 'Kho Mẫu CAD',
  },
  navLab3D: {
    vi: 'Báo Giá In 3D',
  },
  navPersonalize: {
    vi: 'Cá Nhân Hóa',
  },
  navOrders: {
    vi: 'Đơn Hàng',
  },
  navAdmin: {
    vi: 'Quản trị hệ thống',
  },
  searchPlaceholder: {
    // Bỏ ví dụ tag '2/9': chiến dịch/tag đó không tồn tại (đã xoá khỏi POPULAR_TAGS, nợ #39).
    vi: 'Tìm linh kiện, tag (vd: IoT, Gear, Snap-Fit)...',
  },

  // NHÓM C — chiến dịch 2/9 & landing page: KHÔNG có chiến dịch nào tồn tại ⇒ TẮT (rỗng).
  // Banner đầu trang CHỈ bật bằng `site_content.announcementActive` (DB mặc định false;
  // admin bật ở /admin → Banner Đầu Trang). Không có đường nào ở đây bật cờ đó.
  campaign29Badge: {
    vi: '',
  },
  campaign29Headline: {
    vi: '',
  },
  campaign29Desc: {
    vi: '',
  },
  explore29TagBtn: {
    vi: '',
  },
  filterByTag: {
    vi: 'Lọc Theo Tag Sự Kiện & Chủ Đề',
  },
  allTags: {
    vi: 'Tất cả Tags',
  },

  // Hero Section
  heroPreTitle: {
    vi: 'VCUBE // Nền Tảng Chế Tác Cơ Khí & In 3D Chuẩn Công Nghiệp',
  },
  heroTitle: {
    vi: 'CHẾ TÁC CHÍNH XÁC\nCHUẨN CÔNG NGHIỆP',
  },
  heroDescription: {
    // NHÓM B — bỏ hứa hẹn thời gian báo giá và con số dung sai đo kiểm.
    vi: 'Gia công bồi đắp linh kiện cơ khí, vỏ hộp IoT và khuôn mẫu kỹ thuật số. Hình học của tệp bạn tải lên được phân tích và báo giá theo vật liệu, kích thước đo được từ chính tệp đó.',
  },
  btnInstantQuote: {
    vi: 'Báo Giá File 3D Tức Thì',
  },
  btnExploreCatalog: {
    vi: 'Khám Phá Kho Mẫu',
  },
  statTolerance: {
    vi: 'Dung Sai',
  },
  statLeadTime: {
    vi: 'Thời Gian Giao',
  },
  statStandard: {
    vi: 'Tiêu Chuẩn',
  },
  // NHÓM A — 3 giá trị thẻ số liệu hero: lấy từ `site_content.heroMetric*Value`
  // (nhập ở /admin → Nội dung site → Hero). Rỗng ⇒ '' ⇒ hiện "Chưa cấu hình".
  statToleranceVal: {
    vi: '',
  },
  statLeadTimeVal: {
    vi: '',
  },
  statStandardVal: {
    vi: '',
  },

  // Quick Calculator Widget
  calcTitle: {
    vi: 'Mô Phỏng & Ước Tính Chi Phí In 3D Trực Tiếp',
  },
  calcSubtitle: {
    vi: 'Chọn vật liệu, độ đặc infill và kích thước để ước tính ngay chi phí gia công',
  },
  calcMaterial: {
    vi: 'Loại vật liệu:',
  },
  calcInfill: {
    vi: 'Độ đặc:',
  },
  calcEstWeight: {
    vi: 'Trọng lượng ước tính:',
  },
  calcEstTime: {
    vi: 'Thời gian in:',
  },
  calcEstPrice: {
    vi: 'Giá gia công dự kiến:',
  },
  calcUploadFullCTA: {
    vi: 'Tải File STL Lên Để Phân Tích Chi Tiết →',
  },

  // Section Headers
  sectionTaxonomyPre: {
    vi: 'Taxonomy // Phân Loại',
  },
  sectionTaxonomyTitle: {
    vi: 'Danh Mục Ứng Dụng Kỹ Thuật',
  },
  sectionCuratedPre: {
    vi: 'Curated Works // Tuyển Tập',
  },
  sectionCuratedTitle: {
    vi: 'Sản Phẩm & Bản Vẽ Tiêu Biểu',
  },
  sectionWorkflowPre: {
    vi: 'Chronicle // Quy Trình Xưởng',
  },
  sectionWorkflowTitle: {
    vi: 'Quy Trình Gia Công 3 Bước Chuẩn Xác',
  },
  sectionTrustTitle: {
    vi: 'Được Tin Cậy Bởi Các Đơn Vị R&D & Xưởng Cơ Khí',
  },

  // Product cards
  physicalModel: {
    vi: 'Bản In Vật Lý',
  },
  digitalAsset: {
    vi: 'File Số (STL/CAD)',
  },
  details3D: {
    vi: 'Chi Tiết & Inspect 3D',
  },
  customLaser: {
    vi: 'Cá Nhân Hóa / Khắc Tên',
  },
  viewAllArchive: {
    vi: 'Xem toàn bộ kho lưu trữ',
  },

  // Filters & Search
  filterOptions: {
    vi: 'Bộ Lọc Phân Loại',
  },
  clearAll: {
    vi: 'Xóa bộ lọc',
  },
  printMaterial: {
    vi: 'Vật Liệu In',
  },
  allMaterials: {
    vi: 'Tất cả vật liệu',
  },
  maxPrice: {
    vi: 'Mức Giá Tối Đa',
  },
  supportsCustom: {
    vi: 'Hỗ trợ khắc tên & tùy biến',
  },
  sortBy: {
    vi: 'Sắp xếp theo:',
  },
  sortFeatured: {
    vi: 'Nổi bật nhất',
  },
  sortPriceAsc: {
    vi: 'Giá tăng dần',
  },
  sortPriceDesc: {
    vi: 'Giá giảm dần',
  },
  sortRating: {
    vi: 'Đánh giá cao nhất',
  },
  showingProducts: {
    vi: 'Hiển thị',
  },
  verifiedCadFiles: {
    vi: 'bản vẽ cơ khí đạt chuẩn',
  },
  noProductsFound: {
    vi: 'Không tìm thấy bản vẽ phù hợp với tiêu chí lọc',
  },
  resetAllFilters: {
    vi: 'Xóa toàn bộ bộ lọc',
  },

  // Auth & Roles
  authenticatedAccount: {
    vi: 'TÀI KHOẢN ĐÃ XÁC THỰC',
  },
  guestAccount: {
    vi: 'TÀI KHOẢN TRẢI NGHIỆM',
  },
  switchRoleQuick: {
    vi: 'Chuyển quyền nhanh (RBAC):',
  },
  roleCustomer: {
    vi: 'Khách Hàng',
  },
  roleDesigner: {
    vi: 'Tác giả thiết kế 3D',
  },
  roleAdmin: {
    vi: 'Quản trị hệ thống',
  },
  navDesignerStudio: {
    vi: 'Xưởng thiết kế',
  },
  myOrdersTracking: {
    vi: 'Đơn hàng & Theo dõi in',
  },
  signInSignUp: {
    vi: 'Đăng Nhập / Đăng Ký',
  },
  switchAccount: {
    vi: 'Đổi Tài Khoản',
  },
  signOut: {
    vi: 'Đăng Xuất',
  },

  // Support button
  // NHÓM A — KÊNH HỖ TRỢ: ghép từ hotline đã cấu hình (`app_settings.hotline` trước,
  // `site_content.hotline` sau). Rỗng ⇒ '' (ẩn). Bỏ nhãn "kỹ sư trực 24/7": không có
  // ca trực 24/7 nào được chứng minh.
  liveSupportEngineer: {
    vi: '',
  },
  liveSupportAria: {
    vi: 'Tư vấn kỹ thuật trực tuyến',
  },

  // Cart & Checkout
  cartTitle: {
    vi: 'Giỏ Hàng Kỹ Thuật',
  },
  checkoutTitle: {
    vi: 'Xác Nhận & Thanh Toán Đơn Hàng',
  },
  orderSuccessTitle: {
    vi: 'Đặt Hàng Thành Công',
  },

  // Footer
  footerAboutText: {
    // NHÓM B — bỏ tuyên bố tiêu chuẩn công nghiệp (không có chứng nhận nào được lưu).
    vi: 'Nền tảng sản xuất bồi đắp và chế tác linh kiện cơ khí theo yêu cầu cho xưởng in và phòng R&D.',
  },
  footerServices: {
    vi: 'Dịch Vụ & Mua Hàng',
  },
  footerInstantQuote: {
    vi: 'Báo giá tệp 3D trực tuyến',
  },
  footerMarketplace: {
    vi: 'Sàn bản vẽ kỹ thuật',
  },
  footerCreators: {
    vi: 'Quản Trị Hệ Thống',
  },
  footerLocationTitle: {
    vi: 'Trụ Sở & Xưởng Chế Tác',
  },
  footerRights: {
    vi: '© 2026 VCUBE Việt Nam. Bảo lưu mọi quyền.',
  },
  footerCadSecurity: {
    vi: 'Bảo mật dữ liệu CAD/STL',
  },
  // NHÓM A — CHỨNG NHẬN: chưa có trường cấu hình chứng nhận trong `site_content` /
  // `app_settings` ⇒ LUÔN rỗng (ẩn). Không được bịa chứng nhận chất lượng; muốn hiển thị
  // phải thêm trường cấu hình (ngoài phạm vi O3).
  footerIsoCert: {
    vi: '',
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
    liveSupportEngineer: hotline ? `Hỗ trợ kỹ thuật: ${hotline}` : '',
    // Không có nguồn cấu hình chứng nhận ⇒ luôn ẩn (không bịa chứng nhận).
    footerIsoCert: '',
  };
}

/**
 * Hợp đồng context — D0: chỉ còn **một** ngôn ngữ, nên context KHÔNG còn trạng thái ngôn ngữ
 * và KHÔNG còn API đổi ngôn ngữ. UI không có bất kỳ đường nào đổi ngôn ngữ.
 */
interface LanguageContextType {
  /**
   * `t()` — LUÔN trả tiếng Việt; chỉ nhận `fallbackVi` (không còn đối số EN).
   */
  t: (key: keyof typeof DICTIONARY | string, fallbackVi?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  // NHÓM A: cấu hình admin (cache + realtime của `settingsService`, xem `useSettings`).
  // `data === null` = CHƯA CẤU HÌNH ⇒ mọi tuyên bố Nhóm A rỗng ⇒ ẩn.
  const { data: siteContent } = useSiteContent();
  const { data: appSettings } = useAppSettings();
  const claims = useMemo(
    () => configuredClaims(siteContent, appSettings),
    [siteContent, appSettings],
  );

  /**
   * `t()` — D0: LUÔN trả tiếng Việt. Thứ tự ưu tiên:
   *   claim admin (Nhóm A, kể cả `''`) → từ điển VI → `fallbackVi` → tên khoá.
   *
   * `''` trong từ điển là **CÓ CHỦ Ý** (NHÓM C / Nhóm A chưa cấu hình) ⇒ trả `''` để
   * component ẩn; KHÔNG rơi về tên khoá (trước đây `'' || key` từng rò rỉ "campaign29Desc").
   */
  const t = (key: string, fallbackVi?: string): string => {
    // NHÓM A thắng từ điển: giá trị đọc từ cấu hình admin — kể cả khi RỖNG.
    const claim = claims[key];
    if (claim !== undefined) return claim;

    const item = (DICTIONARY as any)[key];
    if (item && typeof item.vi === 'string') return item.vi;
    return fallbackVi ?? key;
  };

  return <LanguageContext.Provider value={{ t }}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
};
