import {
  Product,
  Order,
  DigitalAsset,
  AnalysisFile,
  CustomDesignRequest,
  PayoutTransaction,
  ModerationProductItem,
  DesignerApplication,
  DisputeRecord,
  DMCAReport,
  MaterialProfile,
  PrinterProfile,
  InkiriCostFormulaConfig,
  AccessoryItem,
  WorkshopPartner,
  AppUserProfile,
  OrderFinancialSplit
} from '../types';

export const CATEGORIES = [
  { id: 'all', name: 'Tất cả danh mục', nameEn: 'All Categories', icon: 'category' },
  { id: 'mechanical', name: 'Linh kiện cơ khí & Robot', nameEn: 'Mechanical & Robotics', icon: 'precision_manufacturing', count: 142 },
  { id: 'iot', name: 'Vỏ hộp IoT & Điện tử', nameEn: 'IoT & Enclosures', icon: 'developer_board', count: 88 },
  { id: 'architecture', name: 'Mô hình kiến trúc & Khớp nối', nameEn: 'Architecture & Joints', icon: 'apartment', count: 64 },
  { id: 'tabletop', name: 'Mô hình mỹ thuật & Decor', nameEn: 'Art & Parametric Decor', icon: 'view_in_ar', count: 119 },
  { id: 'tools', name: 'Đồ gá & Dụng cụ xưởng', nameEn: 'Jigs & Workshop Tools', icon: 'construction', count: 53 },
  { id: 'materials', name: 'Vật liệu & Phụ kiện máy', nameEn: 'Filaments & Resins', icon: 'layers', count: 37 },
];

// Nợ #39: entry chiến dịch `'2/9'` (kèm emoji cờ quốc kỳ) đã bị XOÁ — không có chiến dịch 2/9 nào
// tồn tại, và tag đó không trỏ tới bản ghi/sự kiện thật nào. Tag sự kiện thật phải do
// `site_content` (Banner Đầu Trang) khai báo. Không dựng lại entry giả ở đây.
export const POPULAR_TAGS = [
  { id: 'all', nameVi: 'Tất cả', nameEn: 'All', icon: 'grid_view' },
  { id: 'mechanical', nameVi: 'Cơ khí chính xác', nameEn: 'Precision Mechanics', icon: 'settings' },
  { id: 'iot', nameVi: 'Vỏ hộp IoT', nameEn: 'IoT Enclosures', icon: 'memory' },
  { id: 'robotics', nameVi: 'Robot & Tự động hóa', nameEn: 'Robotics', icon: 'smart_toy' },
  { id: 'snap-fit', nameVi: 'Khớp gài Snap-Fit', nameEn: 'Snap-Fit Joints', icon: 'join_inner' },
  { id: 'resin-8k', nameVi: 'Resin 8K Siêu Nét', nameEn: 'Resin 8K Ultra', icon: 'lens_blur' },
  { id: 'decor', nameVi: 'Parametric & Decor', nameEn: 'Parametric Decor', icon: 'palette' },
  { id: 'bán-chạy', nameVi: 'Bán chạy nhất', nameEn: 'Best Sellers', icon: 'local_fire_department' },
];

// ⚠️ RỖNG CÓ CHỦ Ý — dữ liệu bịa đã bị gỡ khỏi production.
// docs/design/data-honesty.md CI-05/MP-14: giá vật liệu (costPerKg/pricePerGram) và tồn kho
// là số bịa, lại chảy vào báo giá thật.
// Nguồn thật: bảng `materials` — nhập ở /admin (Vật liệu).
export const MATERIALS_CATALOG: MaterialProfile[] = [];

// ⚠️ RỖNG CÓ CHỦ Ý — dữ liệu bịa đã bị gỡ khỏi production.
// CI-05: tồn kho phụ kiện (450/180/1250…) là số bịa.
// Nguồn thật: bảng `accessories` — nhập ở /admin (Kho).
export const ACCESSORIES_CATALOG: AccessoryItem[] = [];

// ⚠️ RỖNG CÓ CHỦ Ý — dữ liệu bịa đã bị gỡ khỏi production.
// CI-01 (Critical): toàn bộ catalog, giá, badge, salesCount/reviewsCount là fixture;
// trước đây còn bị đẩy vào Supabase nên không phân biệt được với hàng thật.
// Nguồn thật: bảng `products` — nhập ở /admin (Sản phẩm).
export const PRODUCTS: Product[] = [];

// ⚠️ RỖNG CÓ CHỦ Ý — dữ liệu bịa đã bị gỡ khỏi production.
// Giỏ hàng mẫu không phải dữ liệu của người dùng: giỏ phải bắt đầu rỗng.
export const INITIAL_CART_ITEMS = [];

// ⚠️ RỖNG CÓ CHỦ Ý — dữ liệu bịa đã bị gỡ khỏi production.
// OT-02/OT-03 (Critical): đơn bịa kèm PII thật-của-người-khác (Nguyễn Văn Minh,
// 0987 654 321, địa chỉ FPT Tower) từng hiện như đơn của người đang đăng nhập.
// Nguồn thật: bảng `orders` (theo user) + RPC `get_order_by_guest_token`.
export const MOCK_ORDERS: Order[] = [];

// ⚠️ RỖNG CÓ CHỦ Ý — dữ liệu bịa đã bị gỡ khỏi production.
// CI-06: thư viện CAD đã mua (downloadsCount, purchaseDate, license) là bịa.
// Nguồn thật: quyền sở hữu trong DB — /assets chỉ hiện khi có hàng thật.
export const DIGITAL_ASSETS: DigitalAsset[] = [];

// ⚠️ RỖNG CÓ CHỦ Ý — dữ liệu bịa đã bị gỡ khỏi production.
// AD-05/CI-05: hạm đội máy và thông số/giá thuê máy là fixture.
// Nguồn thật: bảng `printer_fleet` — nhập ở /admin (Máy in).
export const PRINTER_PROFILES: PrinterProfile[] = [];

/**
 * ============================================================================
 * BỘ SỐ THAM KHẢO THEO INKIRI — NGUỒN DUY NHẤT của mọi giá trị "mẫu / gợi ý".
 * ============================================================================
 * Nguồn: công cụ tính giá in 3D công khai của Inkiri — https://inkiri.vn/3d-calc-cost/
 * Ngày ghi lại: 2026-09-13 (theo yêu cầu chủ dự án: "default giống như bên inkiri").
 *
 * ⚠️ ĐÂY KHÔNG PHẢI CẤU HÌNH CỦA VCUBE. Đây là số của MỘT bên khác, chỉ dùng để ĐIỀN SẴN
 * form trong /admin → Cấu hình giá cho admin XEM LẠI. KHÔNG có lệnh ghi DB nào chạy vì hằng
 * số này: admin phải bấm Lưu thì cấu hình mới thành của VCUBE (băng-rôn trong UI nói rõ).
 *
 * Ô mà Inkiri KHÔNG thể biết (mô hình 3 bên: nền tảng · xưởng · nhà thiết kế) thì KHÔNG có
 * mặt trong `formula` — UI để TRỐNG và gắn nhãn "cần anh quyết định" (xem `needsOwnerDecision`).
 */
export const INKIRI_REFERENCE_VALUES: {
  source: { label: string; url: string; capturedAt: string };
  /** Bảng `pricing_global_settings` — "mục 0" trong /admin (nguồn DUY NHẤT của điện · lương · VAT · phí nền tảng). */
  global: {
    vatPercent: number;
    electricityRateVnd: number;
    laborHourlyRateVnd: number;
    marketplaceFeePercent: number;
  };
  /**
   * Bảng `pricing_configs`. Kiểu `Omit` dưới đây CHÍNH LÀ danh sách ô để trống cho admin quyết:
   * 3 ô deprecated (`electricityRatePerKWh`, `laborHourlyRate`, `platformCommissionPercent`)
   * không được điền để khỏi dựng lại "hai nguồn sự thật" cho cùng một con số.
   */
  formula: Omit<
    InkiriCostFormulaConfig,
    | 'electricityRatePerKWh'
    | 'laborHourlyRate'
    | 'platformCommissionPercent'
    | 'noSupportRemovalMinutes'
    | 'bulkOrderQuantityThreshold'
    | 'bulkOrderAmountThresholdVnd'
  >;
  /** Nhãn cho các ô "cần anh quyết định" — Inkiri không có, KHÔNG được bịa số. */
  needsOwnerDecision: readonly string[];
} = {
  source: {
    label: 'Inkiri — công cụ tính giá in 3D',
    url: 'https://inkiri.vn/3d-calc-cost/',
    capturedAt: '2026-09-13',
  },
  global: {
    // ⚠️ VAT là con số PHÁP LÝ: điền mẫu nhưng admin phải tự xác nhận (UI nhắc).
    vatPercent: 8,
    electricityRateVnd: 2850,
    laborHourlyRateVnd: 65000,
    // Phí nền tảng là QUYẾT ĐỊNH KINH DOANH; mô hình VCUBE có 3 bên nên đây chỉ là điểm khởi đầu.
    marketplaceFeePercent: 8,
  },
  formula: {
    // 1. Nhân công kỹ thuật (đơn giá giờ nằm ở `global.laborHourlyRateVnd`)
    fileReviewLaborMinutes: 4,
    setupLaborMinutes: 5,
    supportRemovalMinutes: 8,
    postProcessingLaborMinutes: 6,
    qcLaborMinutes: 4,
    packagingLaborMinutes: 3,
    // 2. Đóng gói & vật tư phụ
    fixedPackagingCost: 12000,
    multiColorPackagingExtra: 5000,
    ipaSolventCost: 8000,
    defaultMachineDepreciationPerHour: 4375,
    // 3. Mặt bằng & quản lý
    overheadPerUnit: 15000,
    // 4. Dự phòng rủi ro in lỗi
    baseFailureReservePercent: 8,
    lowPrintabilityExtraPercent: 6,
    multiColorExtraPercent: 5,
    difficultMaterialExtraPercent: 4,
    // 5. Biên lợi nhuận & phí (markup / bản quyền là QUYẾT ĐỊNH KINH DOANH)
    profitMode: 'markup',
    defaultMarkupPercent: 35,
    paymentGatewayFeePercent: 2.5,
    designerRoyaltyPercent: 5,
    roundingRule: '1000',
    // 6. Chiết khấu theo số lượng
    volumeDiscounts: [
      { minQty: 1, maxQty: 4, discountPercent: 0, label: '1 - 4 chiếc (Giá gốc lẻ)' },
      { minQty: 5, maxQty: 9, discountPercent: 8, label: '5 - 9 chiếc (-8%)' },
      { minQty: 10, maxQty: 24, discountPercent: 15, label: '10 - 24 chiếc (-15% Tiết kiệm)' },
      { minQty: 25, maxQty: 49, discountPercent: 22, label: '25 - 49 chiếc (-22% Giá sỉ xưởng)' },
      { minQty: 50, discountPercent: 30, label: '50+ chiếc (-30% Sản xuất loạt lớn)' },
    ],
    // 7. Phí dịch vụ cá nhân hoá
    customEngravingFee: 50000,
    customLogoUploadFee: 80000,
    // 8. Gói giao hàng
    economyDiscountPercent: 10,
    expressRushSurchargePercent: 30,
    // 9. Hệ số tiêu hao phôi & tháp xả
    supportVolumeRatioPercent: 16,
    brimRaftGrams: 6,
    multiColorToolChangeMins: 1.5,
    multiColorPurgeWasteGrams: 28,
    fastEstimatorBaseOverhead: 45000,
  },
  needsOwnerDecision: [
    'default_workshop_commission_percent',
    'marketplace_fixed_fee_vnd',
    'noSupportRemovalMinutes',
    'bulkOrderQuantityThreshold',
    'bulkOrderAmountThresholdVnd',
    'freeShippingThreshold',
    'failureExtraPercent (theo từng vật liệu)',
  ],
};

/**
 * ⚠️ MẪU THAM KHẢO — **KHÔNG phải nguồn giá trị** (Đợt P, `docs/plans/27-pricing-parameters.md` §3.4).
 *
 * Lấy nguyên bộ số từ `INKIRI_REFERENCE_VALUES` (nguồn DUY NHẤT — không chép số ra đây lần nữa)
 * cộng 3 ô deprecated mà kiểu `InkiriCostFormulaConfig` buộc phải còn khai; engine KHÔNG đọc
 * 3 ô đó nữa (nguồn thật là `pricing_global_settings`, "mục 0" trong /admin).
 *
 * Engine đã bỏ MỌI số mặc định: thiếu thông số nào là **CHẶN tính giá** và nêu đích danh thông
 * số đó (`PricingUnavailableError`), không rơi về hằng số nào. Vì vậy hằng số này KHÔNG bao giờ
 * được dùng để quyết định giá của khách khi nó không được admin thật sự lưu.
 */
export const DEFAULT_INKIRI_FORMULA_CONFIG: InkiriCostFormulaConfig = {
  ...INKIRI_REFERENCE_VALUES.formula,
  electricityRatePerKWh: INKIRI_REFERENCE_VALUES.global.electricityRateVnd,
  laborHourlyRate: INKIRI_REFERENCE_VALUES.global.laborHourlyRateVnd,
  platformCommissionPercent: INKIRI_REFERENCE_VALUES.global.marketplaceFeePercent,
};

// ⚠️ RỖNG CÓ CHỦ Ý — dữ liệu bịa đã bị gỡ khỏi production.
// MP-11 + MP-01/MP-03 (Critical): 3 hash SHA-256 bịa và toàn bộ số đo DFM bịa
// (dimensions/volume/printabilityScore/slicer preset) từng được trình bày như tệp người dùng tải lên.
// /quote chỉ được hiển thị tệp do người dùng tải lên và số đo tính từ chính tệp đó.
export const SAMPLE_ANALYSIS_FILES: AnalysisFile[] = [];

// ⚠️ RỖNG CÓ CHỦ Ý — dữ liệu bịa đã bị gỡ khỏi production.
// AD-08: hàng đợi yêu cầu thiết kế là bịa.
// Nguồn thật: bảng riêng trong DB.
export const CUSTOM_REQUESTS: CustomDesignRequest[] = [];

// ⚠️ RỖNG CÓ CHỦ Ý — dữ liệu bịa đã bị gỡ khỏi production.
// AD-08/AD-06: lệnh chi trả royalty là bịa.
// Nguồn thật: bảng riêng trong DB.
export const PAYOUT_TRANSACTIONS: PayoutTransaction[] = [];

// ⚠️ RỖNG CÓ CHỦ Ý — dữ liệu bịa đã bị gỡ khỏi production.
// AD-08: hàng đợi kiểm duyệt là bịa.
// Nguồn thật: bảng riêng trong DB.
export const MODERATION_PRODUCTS: ModerationProductItem[] = [];

// ⚠️ RỖNG CÓ CHỦ Ý — dữ liệu bịa đã bị gỡ khỏi production.
// AD-08: hồ sơ đăng ký designer là bịa.
// Nguồn thật: bảng riêng trong DB.
export const DESIGNER_APPLICATIONS: DesignerApplication[] = [];

// ⚠️ RỖNG CÓ CHỦ Ý — dữ liệu bịa đã bị gỡ khỏi production.
// AD-08: hồ sơ tranh chấp là bịa.
// Nguồn thật: bảng riêng trong DB.
export const DISPUTES_LIST: DisputeRecord[] = [];

// ⚠️ RỖNG CÓ CHỦ Ý — dữ liệu bịa đã bị gỡ khỏi production.
// AD-08: báo cáo DMCA là bịa.
// Nguồn thật: bảng riêng trong DB.
export const DMCA_REPORTS: DMCAReport[] = [];

export const DEFAULT_SITE_CONTENT: import('../types').SiteContentConfig = {
  // Top Announcement / Campaign
  announcementText: '',
  announcementActive: false,
  announcementBadge: '',
  announcementActionText: '',
  announcementActionTag: '',

  // Hero Section
  heroBadge: 'VCUBE PRECISION ANTHOLOGY // 2026',
  heroHeadline: 'CHẾ TÁC CƠ KHÍ IN 3D CHÍNH XÁC',
  heroHeadlineLine1: 'CHẾ TÁC CƠ KHÍ',
  heroHeadlineHighlight: 'IN 3D CÔNG NGHIỆP CHÍNH XÁC',
  heroSubheadline: 'Nền tảng sản xuất bồi đắp linh kiện cơ khí, vỏ hộp IoT và khuôn mẫu kỹ thuật số.',
  heroCtaQuoteText: 'Báo Giá File 3D Tức Thì',
  heroCtaCatalogText: 'Khám Phá Kho Mẫu CAD',
  heroMetric1Label: 'Dung Sai Đo Kiểm',
  heroMetric1Value: '',
  heroMetric2Label: 'Thời Gian Bàn Giao',
  heroMetric2Value: '',
  heroMetric3Label: 'Tiêu Chuẩn Sản Xuất',
  heroMetric3Value: '',

  // 3-Step Workshop Workflow
  workflowBadge: 'CHRONICLE // QUY TRÌNH XƯỞNG',
  workflowTitle: 'Quy Trình Gia Công 3 Bước Chuẩn Xác',
  workflowStep1Title: 'Tải Lên & Khảo Sát Mesh STL',
  workflowStep1Desc: 'Thuật toán quét hình học của chính tệp bạn tải lên để đo kích thước, thể tích vật liệu và dựng mô hình 3D trong trình xem.',
  workflowStep2Title: 'Cắt Lớp & In Nhiệt Chuẩn Xác',
  workflowStep2Desc: 'Gia công trên hệ thống máy in của xưởng với các loại vật liệu kỹ thuật đã khai báo trong hệ thống.',
  workflowStep3Title: 'Kiểm Định QC & Bàn Giao',
  workflowStep3Desc: 'Đo kiểm theo quy trình và mục tiêu dung sai đã thoả thuận với khách hàng, đóng gói chống sốc và giao hàng toàn quốc.',

  // Live Fast Estimator
  estimatorBadge: 'VCUBE FAST ESTIMATOR // LIVE QUOTE',
  estimatorTitle: 'Mô Phỏng & Ước Tính Chi Phí In 3D Trực Tiếp',
  estimatorSubtitle: 'Chọn vật liệu kỹ thuật, độ đặc infill và kích cỡ mẫu để mô phỏng tức thì chi phí gia công theo bảng giá xưởng VCUBE.',
  estimatorBenefit1: '',
  estimatorBenefit2: '',
  estimatorCtaText: 'Tải File STL Lên Để Báo Giá Chi Tiết →',

  // Trust Partners & R&D Labs
  trustPartnersTitle: '',
  trustPartnersList: [],

  // Facilities, Specifications & Shipping
  toleranceSpec: '',
  // ⚠️ KHÔNG có `standardShippingFee` / `freeShippingThreshold` ở đây — CÓ CHỦ Ý
  // (data-honesty AT-06). VCUBE chưa từng công bố phí ship / ngưỡng freeship nào: hai số
  // 25.000 và 300.000 từng nằm ở đây là số BỊA. `getSiteContent()` dùng hằng này làm giá
  // trị dự phòng nên /admin → "Nội dung site" hiện chúng NHƯ THỂ admin đã cấu hình, rồi
  // lần Lưu kế tiếp ghi chúng vào `site_content.settings` thật.
  // Chưa cấu hình ⇒ khoá VẮNG MẶT (`SiteContentConfig.standardShippingFee?` /
  // `freeShippingThreshold?` là optional) và panel render ô TRỐNG đúng trạng thái thật.
  // ⚠️ KHÁC `DEFAULT_SALES_RULES` (database.ts): đó là default để TÍNH TIỀN khi không có
  // cấu hình — cố ý giữ nguyên, không liên quan tới việc màn admin hiện gì.
  // NHÓM A (data-honesty AT-06): kênh hỗ trợ do admin cấu hình
  // (/admin → Nội dung site → Hotline Kỹ Thuật). Rỗng ⇒ ẩn, KHÔNG bịa số hotline.
  hotline: '',
  contactEmail: 'contact@vcube.vn',
  hanoiWorkshopAddress: 'Xưởng In 3D VCUBE: Khu Công Nghệ Cao Hòa Lạc, Hà Nội',
  hcmWorkshopAddress: 'Chi Nhánh Nam: Khu Công Nghệ Cao TP. Thủ Đức, TP. Hồ Chí Minh',

  // SEO & Metadata — ⚠️ KHÔNG có giá trị mặc định nào ở đây (W3-A, data-honesty AT-06).
  // VÌ SAO: `seoTitle` / `seoDescription` / `seoKeywords` / `seoOgImage` /
  // `seoCanonicalUrl` / `seoStructuredData` từng được điền sẵn ở đây, còn
  // `getSiteContent()` (database.ts) dùng hằng này làm giá trị dự phòng ⇒ màn
  // /admin → "SEO" hiện chúng NHƯ THỂ chủ shop đã cấu hình: tiêu đề + mô tả chào hàng,
  // danh sách từ khoá có tên bên thứ ba ("bambu lab, formlabs"), ảnh OG lấy từ
  // images.unsplash.com, canonical https://vcube.vn, và một khối JSON-LD LocalBusiness
  // bịa hẳn tên/địa chỉ/email. Chưa cấu hình ⇒ khoá VẮNG MẶT (`SiteContentConfig.seo*`
  // đều optional) và panel render ô TRỐNG; tầng hiển thị phải tự nói "chưa cấu hình".
  //
  // `seoRobotsIndex` CỐ Ý giữ `true`: đây là CỜ CHÍNH SÁCH chứ không phải một giá trị
  // admin đã nhập — vắng `noindex` vốn là trạng thái mặc định của web, và `SEOHead.tsx`
  // hiện luôn phát `robots: index, follow` bất kể cờ này (đã báo lại ngoài phạm vi file).
  seoRobotsIndex: true,
};

// ⚠️ RỖNG CÓ CHỦ Ý — dữ liệu bịa đã bị gỡ khỏi production.
// CI-05: bản sao thứ hai của danh mục phụ kiện bịa.
// Đợt T: `App.tsx` nay nạp từ bảng `accessories` nên hằng số này KHÔNG còn nơi nào dùng.
// Nguồn thật: bảng `accessories`.
export const DEFAULT_ACCESSORIES: AccessoryItem[] = [];

// ⚠️ RỖNG CÓ CHỦ Ý — dữ liệu bịa đã bị gỡ khỏi production.
// CI-07: năng lực đối tác xưởng (inStockMaterials, SLA rating, công suất) là bịa.
// Nguồn thật: bảng `workshop_partners` — /admin (Xưởng).
export const WORKSHOP_PARTNERS: WorkshopPartner[] = [];

// ⚠️ RỖNG CÓ CHỦ Ý — dữ liệu bịa đã bị gỡ khỏi production.
// AT-05/CI-08 (Critical): hồ sơ người dùng bịa kèm số giấy tờ KYC và số tài khoản ngân hàng,
// từng được đẩy vào user_profiles/kyc_records của project thật.
// Nguồn thật: bảng `user_profiles` + `kyc_records` (RLS).
export const MOCK_APP_USERS: AppUserProfile[] = [];

// ⚠️ RỖNG CÓ CHỦ Ý — dữ liệu bịa đã bị gỡ khỏi production.
// AD-08/CI-08: phân chia doanh thu là bịa.
// Nguồn thật: bảng riêng trong DB.
export const MOCK_FINANCIAL_SPLITS: OrderFinancialSplit[] = [];

