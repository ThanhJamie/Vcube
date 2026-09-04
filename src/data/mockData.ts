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

export const POPULAR_TAGS = [
  { id: 'all', nameVi: 'Tất cả', nameEn: 'All', icon: 'grid_view' },
  { id: '2/9', nameVi: '🇻🇳 Đại Lễ 2/9', nameEn: '🇻🇳 2/9 Event', icon: 'celebration', isCampaign: true },
  { id: 'mechanical', nameVi: 'Cơ khí chính xác', nameEn: 'Precision Mechanics', icon: 'settings' },
  { id: 'iot', nameVi: 'Vỏ hộp IoT', nameEn: 'IoT Enclosures', icon: 'memory' },
  { id: 'robotics', nameVi: 'Robot & Tự động hóa', nameEn: 'Robotics', icon: 'smart_toy' },
  { id: 'snap-fit', nameVi: 'Khớp gài Snap-Fit', nameEn: 'Snap-Fit Joints', icon: 'join_inner' },
  { id: 'resin-8k', nameVi: 'Resin 8K Siêu Nét', nameEn: 'Resin 8K Ultra', icon: 'lens_blur' },
  { id: 'decor', nameVi: 'Parametric & Decor', nameEn: 'Parametric Decor', icon: 'palette' },
  { id: 'bán-chạy', nameVi: 'Bán chạy nhất', nameEn: 'Best Sellers', icon: 'local_fire_department' },
];

export const MATERIALS_CATALOG: MaterialProfile[] = [
  {
    id: 'pla-tough',
    name: 'PLA Tough / PLA+',
    brand: 'Bambu Lab / eSUN',
    density: 1.24,
    strength: 'Cao',
    heatResistance: '55°C',
    flexibility: 'Thấp',
    costPerKg: 320000,
    pricePerGram: 850,
    unitPriceMultiplier: 1.0,
    spoolWeightGrams: 1000,
    extruderTempMin: 200,
    extruderTempMax: 220,
    bedTemp: 55,
    colors: ['#1C1C1C', '#ffffff', '#00687a', '#ea580c', '#e2e8f0', '#10b981'],
    desc: 'Vật liệu phổ biến nhất, độ cứng tốt, chi tiết sắc nét, bề mặt láng mịn cho linh kiện kỹ thuật.',
    recommendedFor: 'Prototypes, đồ gá, vỏ hộp tiêu chuẩn',
    inStock: true,
    stockRollsCount: 38
  },
  {
    id: 'petg-pro',
    name: 'PETG Technical Pro',
    brand: 'Bambu Lab / Sunlu',
    density: 1.27,
    strength: 'Rất cao',
    heatResistance: '75°C',
    flexibility: 'Trung bình',
    costPerKg: 380000,
    pricePerGram: 1150,
    unitPriceMultiplier: 1.25,
    spoolWeightGrams: 1000,
    extruderTempMin: 230,
    extruderTempMax: 250,
    bedTemp: 70,
    colors: ['#1C1C1C', '#3b82f6', '#10b981', '#ffffff', '#f59e0b'],
    desc: 'Chống va đập mạnh, kháng hóa chất & tia UV nhẹ, chịu nhiệt tốt hơn PLA đáng kể.',
    recommendedFor: 'Linh kiện cơ khí ngoài trời, đồ gá chịu lực',
    inStock: true,
    stockRollsCount: 24
  },
  {
    id: 'abs-industrial',
    name: 'ABS Industrial Grade',
    brand: 'PolyMaker PolyLite',
    density: 1.04,
    strength: 'Rất cao',
    heatResistance: '95°C',
    flexibility: 'Trung bình',
    costPerKg: 420000,
    pricePerGram: 1300,
    unitPriceMultiplier: 1.35,
    spoolWeightGrams: 1000,
    extruderTempMin: 245,
    extruderTempMax: 265,
    bedTemp: 95,
    colors: ['#1C1C1C', '#64748b', '#ffffff', '#dc2626'],
    desc: 'Độ bền cơ tính công nghiệp, dễ mài bóng bằng Acetone, chịu nhiệt độ cao trong buồng động cơ.',
    recommendedFor: 'Linh kiện ô tô, phụ tùng máy móc cơ khí',
    inStock: true,
    stockRollsCount: 16
  },
  {
    id: 'tpu-flex',
    name: 'TPU 95A Flexible High Speed',
    brand: 'Bambu Lab TPU-HF',
    density: 1.21,
    strength: 'Đàn hồi cao',
    heatResistance: '60°C',
    flexibility: 'Rất dẻo',
    costPerKg: 520000,
    pricePerGram: 1600,
    unitPriceMultiplier: 1.5,
    spoolWeightGrams: 1000,
    extruderTempMin: 215,
    extruderTempMax: 235,
    bedTemp: 45,
    colors: ['#1C1C1C', '#06b6d4', '#ea580c', '#84cc16'],
    desc: 'Chất liệu cao su dẻo kỹ thuật, chống sốc, đàn hồi cực tốt và chống mài mòn cơ học.',
    recommendedFor: 'Đệm chống sốc, gioăng kín nước, bánh xe robot',
    inStock: true,
    stockRollsCount: 12
  },
  {
    id: 'pa-cf',
    name: 'PA-CF (Nylon Carbon Fiber)',
    brand: 'Bambu Lab PAHT-CF',
    density: 1.15,
    strength: 'Siêu cứng cáp',
    heatResistance: '140°C',
    flexibility: 'Cực cứng',
    costPerKg: 1250000,
    pricePerGram: 2900,
    unitPriceMultiplier: 2.3,
    spoolWeightGrams: 1000,
    extruderTempMin: 280,
    extruderTempMax: 300,
    bedTemp: 100,
    colors: ['#18181b', '#3f3f46'],
    desc: 'Sợi Nylon gia cường hạt Carbon Fiber siêu nhẹ và cứng vững, dùng thay thế linh kiện nhôm CNC.',
    recommendedFor: 'Drone cánh tay chịu lực, đồ gá CNC, chi tiết máy chịu nhiệt',
    inStock: true,
    stockRollsCount: 8
  },
  {
    id: 'resin-8k',
    name: 'Resin Engineering 8K (SLA)',
    brand: 'Formlabs / Anycubic',
    density: 1.18,
    strength: 'Độ nét vi mô',
    heatResistance: '65°C',
    flexibility: 'Thấp',
    costPerKg: 780000,
    pricePerGram: 2200,
    unitPriceMultiplier: 1.85,
    spoolWeightGrams: 1000,
    extruderTempMin: 25,
    extruderTempMax: 35,
    bedTemp: 30,
    colors: ['#64748b', '#00687a', '#ffffff', '#1C1C1C'],
    desc: 'Công nghệ quang trùng hợp SLA/DLP, độ phân giải vi mô không thấy vân sọc từng lớp in.',
    recommendedFor: 'Khuôn đúc thu nhỏ, chi tiết kim hoàn, mô hình giải phẫu',
    inStock: true,
    stockRollsCount: 15
  }
];

export const ACCESSORIES_CATALOG: AccessoryItem[] = [
  {
    id: 'acc-keychain-ring-chain',
    name: 'Khoen móc khóa xoay Inox + Dây xích 25mm',
    nameEn: 'Stainless Steel Keyring with Swivel Chain (25mm)',
    category: 'keychain',
    unit: 'cái',
    costPrice: 1200,
    sellingPrice: 3000,
    sku: 'ACC-KC-RING01',
    stockCount: 450,
    lowStockThreshold: 50,
    warehouseLocation: 'Kệ A1 - Hộc 02',
    supplier: 'Xưởng Kim Khí Tân Bình',
    description: 'Khoen kim loại không gỉ mạ niken bóng, vòng xoay 360 độ, chịu lực kéo 5kg.',
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80',
    isActive: true,
    compatibleWith: ['Móc khóa', 'Thẻ tên', 'Quà lưu niệm', 'Charm balo']
  },
  {
    id: 'acc-paracord-lanyard',
    name: 'Dây dù Paracord 550 kèm Chốt khóa Mini EDC',
    nameEn: 'Paracord Lanyard with Mini Quick-Release Clasp',
    category: 'keychain',
    unit: 'sợi',
    costPrice: 2500,
    sellingPrice: 6000,
    sku: 'ACC-KC-PARA02',
    stockCount: 180,
    lowStockThreshold: 30,
    warehouseLocation: 'Kệ A1 - Hộc 05',
    supplier: 'Vật tư EDC Sài Gòn',
    description: 'Dây dù 7 lõi đan thủ công, chịu tải cao, gắn kèm chốt bấm kim loại tiện dụng.',
    imageUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=200&auto=format&fit=crop&q=80',
    isActive: true,
    compatibleWith: ['Móc khóa dao', 'Dụng cụ EDC', 'Thẻ nhân viên']
  },
  {
    id: 'acc-brass-insert-m3',
    name: 'Ốc cấy ren đồng nhiệt Brass Insert M3 x 4 x 5mm',
    nameEn: 'Threaded Heat-Set Brass Insert M3 (Pack/pc)',
    category: 'fastener',
    unit: 'con',
    costPrice: 800,
    sellingPrice: 2000,
    sku: 'HARD-INS-M3',
    stockCount: 1250,
    lowStockThreshold: 200,
    warehouseLocation: 'Kệ B2 - Ngăn 11',
    supplier: 'CNC Fasteners VN',
    description: 'Ốc ren đồng đúc vân kim cương chống tuột khi siết lực, ép nhiệt mỏ hàn 240°C.',
    imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=200&auto=format&fit=crop&q=80',
    isActive: true,
    compatibleWith: ['Vỏ hộp IoT', 'Khung drone', 'Đồ gá kỹ thuật', 'Linh kiện Robot']
  },
  {
    id: 'acc-brass-insert-m4',
    name: 'Ốc cấy ren đồng nhiệt Brass Insert M4 x 6 x 6mm',
    nameEn: 'Threaded Heat-Set Brass Insert M4',
    category: 'fastener',
    unit: 'con',
    costPrice: 1200,
    sellingPrice: 2500,
    sku: 'HARD-INS-M4',
    stockCount: 820,
    lowStockThreshold: 150,
    warehouseLocation: 'Kệ B2 - Ngăn 12',
    supplier: 'CNC Fasteners VN',
    description: 'Ốc ren đồng chịu lực xoắn cao, phù hợp lắp ghép vỏ máy công nghiệp.',
    imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=200&auto=format&fit=crop&q=80',
    isActive: true,
    compatibleWith: ['Vỏ máy tính', 'Khung xe robot', 'Chi tiết cơ khí']
  },
  {
    id: 'acc-bolt-m3-12',
    name: 'Bộ Bu lông lục giác chìm Inox 304 M3x12mm + Tán tự hãm',
    nameEn: 'Stainless Steel Hex Socket Bolt M3x12 + Lock Nut',
    category: 'hardware',
    unit: 'bộ',
    costPrice: 1500,
    sellingPrice: 3500,
    sku: 'HARD-BOLT-M312',
    stockCount: 650,
    lowStockThreshold: 100,
    warehouseLocation: 'Kệ B3 - Ngăn 04',
    supplier: 'Vật Tư Bu Lông Inox',
    description: 'Thép không gỉ 304 chuẩn A2-70, ren mịn màng, kèm tán nylon chống trượt.',
    imageUrl: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=200&auto=format&fit=crop&q=80',
    isActive: true,
    compatibleWith: ['Khớp nối cơ khí', 'Vỏ hộp Arduino', 'Hệ bánh răng']
  },
  {
    id: 'acc-magnet-neo-6x3',
    name: 'Nam châm vĩnh cửu Neodymium N52 tròn 6x3mm',
    nameEn: 'Neodymium N52 Disc Magnet 6x3mm (High Power)',
    category: 'magnet',
    unit: 'viên',
    costPrice: 2200,
    sellingPrice: 5000,
    sku: 'HARD-MAG-6X3',
    stockCount: 380,
    lowStockThreshold: 60,
    warehouseLocation: 'Kệ B4 - Ngăn 01',
    supplier: 'Nam Châm Từ Tính Hà Nội',
    description: 'Lực hút từ tính siêu mạnh N52, mạ Niken 3 lớp chống rỉ, phù hợp nắp đậy hít nam châm.',
    imageUrl: 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?w=200&auto=format&fit=crop&q=80',
    isActive: true,
    compatibleWith: ['Hộp quà nắp hít', 'Vỏ thiết bị cảm biến', 'Mô hình tháo lắp']
  },
  {
    id: 'acc-bearing-608',
    name: 'Vòng bi bạc đạn 608-2RS High Speed ABEC-7',
    nameEn: 'Ball Bearing 608-2RS High Precision ABEC-7',
    category: 'bearing',
    unit: 'cái',
    costPrice: 6500,
    sellingPrice: 15000,
    sku: 'HARD-BRG-608',
    stockCount: 140,
    lowStockThreshold: 25,
    warehouseLocation: 'Kệ B5 - Ngăn 08',
    supplier: 'Bạc Đạn Vòng Bi Công Nghiệp',
    description: 'Nắp cao su chống bụi 2 mặt, tra sẵn mỡ bôi trơn cao tốc, chạy siêu êm.',
    imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=200&auto=format&fit=crop&q=80',
    isActive: true,
    compatibleWith: ['Hộp số hành tinh', 'Con quay Fidget', 'Rulo cuốn dây', 'Bánh xe robot']
  },
  {
    id: 'acc-pack-box-kraft',
    name: 'Hộp Carton Kraft cứng quà tặng + Mút xốp EVA định hình',
    nameEn: 'Premium Kraft Gift Box with Custom EVA Foam Cushion',
    category: 'packaging',
    unit: 'hộp',
    costPrice: 8000,
    sellingPrice: 18000,
    sku: 'PACK-BOX-KRAFT01',
    stockCount: 220,
    lowStockThreshold: 40,
    warehouseLocation: 'Kệ C1 - Tầng 2',
    supplier: 'Bao Bì Giấy Sài Gòn Pro',
    description: 'Hộp cứng kraft nâu vintage 12x12x6cm, lót mút xốp chống sốc bảo vệ sản phẩm cao cấp.',
    imageUrl: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=200&auto=format&fit=crop&q=80',
    isActive: true,
    compatibleWith: ['Quà tặng doanh nghiệp', 'Mô hình mỹ thuật', 'Sản phẩm custom']
  },
  {
    id: 'acc-pack-zip-esd',
    name: 'Túi Zip mờ chống trầy ESD kèm gói hút ẩm Silica Gel 2g',
    nameEn: 'Frosted Matte Anti-Scratch Zip Bag + Desiccant Pouch',
    category: 'packaging',
    unit: 'túi',
    costPrice: 1800,
    sellingPrice: 4500,
    sku: 'PACK-ZIP-ESD02',
    stockCount: 620,
    lowStockThreshold: 100,
    warehouseLocation: 'Kệ C1 - Tầng 1',
    supplier: 'Bao Bì Công Nghiệp ESD',
    description: 'Túi nhựa mờ dẻo chống tĩnh điện, bảo vệ bề mặt in 3D không bị xước và ẩm mốc.',
    imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200&auto=format&fit=crop&q=80',
    isActive: true,
    compatibleWith: ['Móc khóa', 'Linh kiện nhỏ', 'Board mạch điện tử']
  },
  {
    id: 'acc-rubber-feet',
    name: 'Bộ chân đế Silicon chống trượt & giảm rung (4 chiếc)',
    nameEn: 'Anti-Vibration Silicon Rubber Feet Pads (Set of 4)',
    category: 'hardware',
    unit: 'bộ',
    costPrice: 2800,
    sellingPrice: 8000,
    sku: 'HARD-RUB-FEET4',
    stockCount: 260,
    lowStockThreshold: 35,
    warehouseLocation: 'Kệ B3 - Ngăn 09',
    supplier: 'Phụ Kiện Điện Tử 3M',
    description: 'Chân đế silicon dán keo 3M 9448A siêu dính, triệt tiêu rung động và chống trầy bàn.',
    imageUrl: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=200&auto=format&fit=crop&q=80',
    isActive: true,
    compatibleWith: ['Vỏ hộp Arduino', 'Đế loa', 'Vỏ thiết bị đo', 'Khung bàn in']
  }
];

export const PRODUCTS: Product[] = [
  {
    id: 'prod-planetary-gearbox',
    sku: 'MX-4011B',
    name: 'Hộp số hành tinh tỉ số 5:1 NEMA 17 (Planetary Gearbox)',
    category: 'mechanical',
    designer: 'MechanicMaster',
    designerAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    isPro: true,
    isVerified: true,
    pricePhysical: 285000,
    priceDigital: 89000,
    images: [
      'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80'
    ],
    description: 'Hệ bánh răng hành tinh chuẩn công nghiệp cho động cơ bước NEMA 17. Độ sai số dung sai dưới ±0.05mm, bánh răng xoắn êm ái, giảm tiếng ồn khi vận hành ở tốc độ cao. Nằm trong chiến dịch Đại Lễ 2/9 với file nguồn STEP hoàn chỉnh.',
    features: [
      'Tích hợp ổ bi 608ZZ giảm ma sát tối đa',
      'Cấu trúc bánh răng xoắn Helical Gear vận hành êm',
      'Tỉ số truyền chuẩn xác 5:1 không trượt bước',
      'Lỗ gắn chuẩn NEMA 17 PCD 31mm'
    ],
    specs: {
      dimensions: '60 x 60 x 45 mm',
      weight: '95g',
      resolution: '0.12 mm Precision',
      infillDefault: '50% Triangular',
      technology: 'FDM / SLA'
    },
    supportedMaterials: ['PETG Technical Pro', 'ABS Industrial Grade', 'Resin Engineering 8K (SLA)'],
    colors: [
      { name: 'Đen Mờ Kỹ Thuật', hex: '#1C1C1C', available: true },
      { name: 'Xám Titan', hex: '#64748b', available: true }
    ],
    tags: ['2/9', 'Đại lễ 2/9', 'cơ khí', 'mechanical', 'Robotics', 'NEMA 17', 'Gears', 'Reduction', 'bán chạy'],
    badge: 'ƯU ĐÃI 2/9',
    rating: 4.95,
    reviewsCount: 64,
    printsCount: 198,
    salesCount: 198,
    printTime: '4h 30m',
    isCustomizable: false,
    licenseType: 'Commercial',
    status: 'Published'
  },
  {
    id: 'prod-arduino-case',
    sku: 'MX-8921A',
    name: 'Vỏ bọc Arduino Pro Max Snap-Fit Modular',
    category: 'iot',
    designer: 'TechLab VN',
    designerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    isPro: true,
    isVerified: true,
    pricePhysical: 120000,
    priceDigital: 45000,
    images: [
      'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=800&auto=format&fit=crop&q=80'
    ],
    description: 'Vỏ bảo vệ kỹ thuật chính xác cho Arduino Uno R3 / R4 và phụ kiện module cảm biến. Thiết kế khe cắm dây thông minh, lỗ tản nhiệt tổ ong chuẩn luồng khí, khớp gài snap-fit không cần ốc vít phức tạp.',
    features: [
      'Tối ưu hóa khe tản nhiệt tổ ong giảm nhiệt 15%',
      'Cơ chế gài Snap-fit không lỏng lẻo sau 1000 lần tháo lắp',
      'Định tuyến cáp jumper gọn gàng không kẹt dây',
      'Đầy đủ khe nhìn đèn LED tín hiệu TX/RX/Power'
    ],
    specs: {
      dimensions: '85 x 65 x 28 mm',
      weight: '48g (Infill 25%)',
      resolution: '0.12 - 0.20 mm',
      infillDefault: '20% Gyroid',
      technology: 'FDM Industrial'
    },
    supportedMaterials: ['PLA Tough', 'PETG Technical Pro', 'ABS Industrial Grade'],
    colors: [
      { name: 'Xanh Teal Công Nghiệp', hex: '#00687a', available: true },
      { name: 'Đen Mờ Kỹ Thuật', hex: '#1C1C1C', available: true },
      { name: 'Xám Titan', hex: '#64748b', available: true },
      { name: 'Cam Cảnh Báo', hex: '#ea580c', available: false }
    ],
    tags: ['2/9', 'IoT', 'Arduino', 'Enclosure', 'Snap-Fit', 'Gyroid Infill', 'bán chạy'],
    badge: 'BÁN CHẠY',
    rating: 4.9,
    reviewsCount: 128,
    printsCount: 412,
    salesCount: 432,
    printTime: '2h 15m',
    batchProgress: { current: 18, total: 20, targetDate: '24/10' },
    isCustomizable: true,
    licenseType: 'Commercial',
    status: 'Published'
  },
  {
    id: 'prod-drone-frame-5in',
    sku: 'EL-1104X',
    name: 'Khung Drone FPV 5 Inch Aerodynamic Carbon-PETG V3',
    category: 'mechanical',
    designer: 'AeroDynamics Lab',
    designerAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    isPro: true,
    isVerified: true,
    pricePhysical: 350000,
    priceDigital: 110000,
    images: [
      'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=800&auto=format&fit=crop&q=80'
    ],
    description: 'Khung máy bay không người lái FPV tối ưu hóa luồng khí khí động học và độ cứng kháng va chạm. Tương thích camera Micro/Nano FPV và stack bay 20x20mm / 30.5x30.5mm.',
    features: [
      'Cánh tay tăng cứng chống rung động cơ',
      'Mount camera gập góc chỉnh được 0-50 độ',
      'Khoang chứa pin cân bằng trọng tâm',
      'Tương thích motor 2207 / 2306'
    ],
    specs: {
      dimensions: '220 x 220 x 40 mm',
      weight: '112g',
      resolution: '0.16 mm',
      infillDefault: '60% Solid',
      technology: 'FDM Engineering'
    },
    supportedMaterials: ['PETG Technical Pro', 'ABS Industrial Grade', 'TPU 95A Flexible'],
    colors: [
      { name: 'Xanh Teal Công Nghiệp', hex: '#00687a', available: true },
      { name: 'Đen Mờ Kỹ Thuật', hex: '#1C1C1C', available: true },
      { name: 'Cam Cảnh Báo', hex: '#ea580c', available: true }
    ],
    tags: ['2/9', 'cơ khí', 'Drone', 'FPV', 'Aerodynamics', 'robotics', 'Carbon-Blend', 'Racing'],
    badge: 'CHUYÊN GIA',
    rating: 4.88,
    reviewsCount: 42,
    printsCount: 145,
    salesCount: 88,
    printTime: '6h 10m',
    isCustomizable: true,
    licenseType: 'Commercial',
    status: 'Published'
  },
  {
    id: 'prod-esp32-industrial-hub',
    sku: 'IOT-8812C',
    name: 'Module Vỏ Hộp Gateway ESP32 Ray Din Công Nghiệp',
    category: 'iot',
    designer: 'AutomationPRO VN',
    designerAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    isPro: true,
    isVerified: true,
    pricePhysical: 165000,
    priceDigital: 50000,
    images: [
      'https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80'
    ],
    description: 'Hộp chuẩn gắn thanh ray Din 35mm cho module ESP32 NodeMCU, tích hợp khe cắm Domino 5.08mm, màn hình OLED 0.96 inch và đèn báo trạng thái Relay.',
    features: [
      'Ngàm gắn ray Din 35mm chuẩn tủ điện công nghiệp',
      'Khe cắm màn hình OLED 0.96 inch hiển thị thông số',
      'Chống cháy lan khi in bằng chất liệu ABS Industrial',
      'Cắt sẵn các cổng RS485 và cổng nạp Type-C'
    ],
    specs: {
      dimensions: '90 x 70 x 40 mm',
      weight: '55g',
      resolution: '0.16 mm',
      infillDefault: '30% Grid',
      technology: 'FDM Technical'
    },
    supportedMaterials: ['ABS Industrial Grade', 'PETG Technical Pro'],
    colors: [
      { name: 'Xám Titan', hex: '#64748b', available: true },
      { name: 'Đen Mờ Kỹ Thuật', hex: '#1C1C1C', available: true }
    ],
    tags: ['2/9', 'IoT', 'ESP32', 'Din-Rail', 'Enclosure', 'Automation', 'snap-fit'],
    badge: 'MỚI',
    rating: 4.93,
    reviewsCount: 38,
    printsCount: 160,
    salesCount: 110,
    printTime: '3h 20m',
    isCustomizable: true,
    licenseType: 'Commercial',
    status: 'Published'
  },
  {
    id: 'prod-structural-joint-t4',
    sku: 'AR-4011B',
    name: 'Khớp nối kết cấu giàn không gian Structural Joint T-4',
    category: 'architecture',
    designer: 'StructurDesign',
    designerAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    isPro: false,
    isVerified: true,
    pricePhysical: 150000,
    priceDigital: 35000,
    images: [
      'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&auto=format&fit=crop&q=80'
    ],
    description: 'Khớp nối 4 hướng cho kết cấu giàn không gian nhẹ, tính toán theo tải trọng uốn 1.2kN. Ứng dụng rộng rãi cho mô hình kiến trúc chịu lực và khung robot giáo dục.',
    features: ['Khớp gài đa hướng', 'Chịu lực giàn tam giác', 'Tối ưu cho PETG'],
    specs: {
      dimensions: '50 x 50 x 50 mm',
      weight: '35g',
      resolution: '0.2 mm',
      infillDefault: '40% Gyroid',
      technology: 'FDM'
    },
    supportedMaterials: ['PETG Technical Pro', 'PLA Tough'],
    colors: [
      { name: 'Trắng Sứ Mịn', hex: '#ffffff', available: true },
      { name: 'Đen Mờ Kỹ Thuật', hex: '#1C1C1C', available: true }
    ],
    tags: ['cơ khí', 'Truss', 'Architecture', 'Joint', 'Modular', 'mechanical'],
    badge: 'TIÊU CHUẨN',
    rating: 4.75,
    reviewsCount: 22,
    printsCount: 78,
    salesCount: 45,
    printTime: '1h 30m',
    isCustomizable: false,
    licenseType: 'Standard',
    status: 'Published'
  },
  {
    id: 'prod-parametric-vase',
    sku: 'DEC-9921',
    name: 'Bình hoa kiến trúc Parametric Voronoi Spiral',
    category: 'tabletop',
    designer: 'Studio Generative',
    designerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    isPro: false,
    isVerified: true,
    pricePhysical: 180000,
    priceDigital: 55000,
    images: [
      'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80'
    ],
    description: 'Bình hoa toán học tạo hình từ thuật toán phân rã Voronoi và xoắn ốc Fibonacci. Cấu trúc hai lớp kín nước 100% khi in ở chế độ Vase Mode đặc biệt.',
    features: [
      'Chế độ in Vase Mode liền mạch không đường nối',
      'Kín nước hoàn hảo khi in bằng PETG',
      'Hiệu ứng ánh sáng xuyên thấu tuyệt đẹp'
    ],
    specs: {
      dimensions: '110 x 110 x 210 mm',
      weight: '82g',
      resolution: '0.16 mm',
      infillDefault: 'Spiral Vase Mode (0% infill)',
      technology: 'FDM'
    },
    supportedMaterials: ['PETG Technical Pro', 'PLA Tough'],
    colors: [
      { name: 'Xanh Teal Công Nghiệp', hex: '#00687a', available: true },
      { name: 'Trắng Sứ Mịn', hex: '#ffffff', available: true }
    ],
    tags: ['2/9', 'decor', 'Parametric', 'Vase', 'Voronoi', 'Decor', 'VaseMode'],
    badge: 'CÁ NHÂN HÓA',
    rating: 4.92,
    reviewsCount: 51,
    printsCount: 210,
    salesCount: 142,
    printTime: '3h 10m',
    isCustomizable: true,
    licenseType: 'Standard',
    status: 'Published'
  },
  {
    id: 'prod-resin-mini-impeller',
    sku: 'RES-3301A',
    name: 'Cánh bơm ly tâm vi mô Resin 8K (Micro Impeller)',
    category: 'mechanical',
    designer: 'FluidDynamics VN',
    designerAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    isPro: true,
    isVerified: true,
    pricePhysical: 210000,
    priceDigital: 75000,
    images: [
      'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=800&auto=format&fit=crop&q=80'
    ],
    description: 'Cánh bơm vi mô cho hệ thống làm mát bằng chất lỏng tuần hoàn. In bằng Resin kỹ thuật 8K quang trùng hợp SLA với độ mịn 0.025mm, cân bằng động tối ưu.',
    features: [
      'Độ phân giải siêu nét 25 micron không lộ vân',
      'Đã cân bằng động chống rung ở 10.000 RPM',
      'Kháng nước làm mát và dầu bôi trơn kỹ thuật'
    ],
    specs: {
      dimensions: '35 x 35 x 18 mm',
      weight: '16g',
      resolution: '0.025 mm (Resin 8K)',
      infillDefault: '100% Solid',
      technology: 'SLA Resin High-Res'
    },
    supportedMaterials: ['Resin Engineering 8K (SLA)'],
    colors: [
      { name: 'Xám Titan', hex: '#64748b', available: true },
      { name: 'Xanh Teal Công Nghiệp', hex: '#00687a', available: true }
    ],
    tags: ['2/9', 'resin-8k', 'cơ khí', 'Impeller', 'Fluid', 'Micro-Part', 'Resin'],
    badge: 'ĐỘ NÉT CAO',
    rating: 4.96,
    reviewsCount: 33,
    printsCount: 95,
    salesCount: 62,
    printTime: '1h 45m',
    isCustomizable: false,
    licenseType: 'Commercial',
    status: 'Published'
  }
];

export const INITIAL_CART_ITEMS = [
  {
    id: 'cart-1',
    productId: 'prod-arduino-case',
    type: 'physical' as const,
    name: 'Vỏ bọc Arduino Pro Max Snap-Fit',
    designer: 'TechLab VN',
    image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80',
    price: 120000,
    quantity: 2,
    material: 'PLA Tough / PLA+',
    color: 'Xanh Teal Công Nghiệp',
    colorHex: '#00687a',
    dimensions: '85 x 65 x 28 mm',
    resolution: '0.16 mm (Tiêu chuẩn cơ khí)',
    customText: 'LAB-ROBOT-01'
  },
  {
    id: 'cart-2',
    productId: 'prod-planetary-gearbox',
    type: 'digital' as const,
    name: 'Hộp số hành tinh tỉ số 5:1 NEMA 17 (STL + STEP)',
    designer: 'MechanicMaster',
    image: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=800&auto=format&fit=crop&q=80',
    price: 89000,
    quantity: 1,
    fileFormat: 'STL + STEP (Bao gồm file thiết kế gốc)',
    licenseType: 'Commercial License (Thương mại hóa)'
  }
];

export const MOCK_ORDERS: Order[] = [
  {
    id: 'ord-8924',
    orderNumber: '#VCUBE-8924-A',
    date: '24/10/2026 09:15',
    estimatedDelivery: '26/10/2026',
    status: 'printing',
    statusStageIndex: 4,
    layerProgress: 64,
    timeRemaining: '04h 12m',
    items: [
      {
        id: 'ord-item-1',
        name: 'Vỏ bọc Arduino Pro Max Snap-Fit',
        designer: 'TechLab VN',
        type: 'physical',
        image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80',
        price: 120000,
        quantity: 2,
        material: 'PLA Tough / PLA+',
        color: 'Xanh Teal Công Nghiệp (#00687a)',
        resolution: '0.16 mm (Tiêu chuẩn)',
        infill: '25% Gyroid'
      },
      {
        id: 'ord-item-2',
        name: 'Hộp số hành tinh tỉ số 5:1 (File STL + STEP)',
        designer: 'MechanicMaster',
        type: 'digital',
        image: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=800&auto=format&fit=crop&q=80',
        price: 89000,
        quantity: 1,
        license: 'Commercial Use v2.1',
        version: 'v2.4 Final'
      }
    ],
    shippingAddress: {
      fullName: 'Nguyễn Văn Minh',
      phone: '0987 654 321',
      address: 'Tòa nhà FPT Tower, Tầng 8, Phạm Văn Bạch',
      city: 'Hà Nội',
      district: 'Cầu Giấy'
    },
    carrier: {
      name: 'VCUBE Logistics Express',
      trackingCode: 'VCUBE-VN-8892147X'
    },
    payment: {
      method: 'VNPAY QR (Đã thanh toán)',
      paidDate: '24/10/2026 09:16',
      subtotalPhysical: 240000,
      subtotalDigital: 89000,
      shippingFee: 25000,
      discount: 20000,
      tax: 0,
      total: 334000
    }
  }
];

export const DIGITAL_ASSETS: DigitalAsset[] = [
  {
    id: 'asset-1',
    name: 'Hộp số hành tinh tỉ số 5:1 (Planetary Gearbox)',
    designer: 'MechanicMaster',
    isVerified: true,
    format: 'STL',
    version: 'v2.4 Final',
    license: 'Commercial',
    purchaseDate: '24/10/2026',
    downloadsCount: 3,
    maxDownloads: 'Không giới hạn',
    fileSize: '14.2 MB',
    image: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=800&auto=format&fit=crop&q=80',
    hasUpdate: true,
    model3DType: 'gear'
  },
  {
    id: 'asset-2',
    name: 'Vỏ bọc Arduino Pro Max Modular',
    designer: 'TechLab VN',
    isVerified: true,
    format: '3MF',
    version: 'v1.8 Rev B',
    license: 'Personal',
    purchaseDate: '15/10/2026',
    downloadsCount: 12,
    maxDownloads: 'Không giới hạn',
    fileSize: '8.7 MB',
    image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80',
    hasUpdate: false,
    model3DType: 'box'
  }
];

export const PRINTER_PROFILES: PrinterProfile[] = [
  {
    id: 'bambu-x1c',
    name: 'Bambu Lab X1-Carbon AMS',
    brand: 'Bambu Lab',
    bedDimensions: { x: 256, y: 256, z: 256 },
    nozzleDiameter: 0.4,
    technology: 'FDM',
    powerKW: 0.18,
    acquisitionCost: 36000000,
    expectedLifetimeHours: 8000,
    consumablesHourlyRate: 2500,
    hourlyRate: 28000,
    maxPrintSpeedMmS: 500,
    heatedBedMaxTemp: 120,
    hasEnclosure: true,
    hasAMS: true,
    status: 'Idle'
  },
  {
    id: 'bambu-p1s',
    name: 'Bambu Lab P1S Combo AMS',
    brand: 'Bambu Lab',
    bedDimensions: { x: 256, y: 256, z: 256 },
    nozzleDiameter: 0.4,
    technology: 'FDM',
    powerKW: 0.16,
    acquisitionCost: 24500000,
    expectedLifetimeHours: 7500,
    consumablesHourlyRate: 2000,
    hourlyRate: 22000,
    maxPrintSpeedMmS: 500,
    heatedBedMaxTemp: 100,
    hasEnclosure: true,
    hasAMS: true,
    status: 'Idle'
  },
  {
    id: 'bambu-a1-mini',
    name: 'Bambu Lab A1 Mini Combo',
    brand: 'Bambu Lab',
    bedDimensions: { x: 180, y: 180, z: 180 },
    nozzleDiameter: 0.4,
    technology: 'FDM',
    powerKW: 0.11,
    acquisitionCost: 11500000,
    expectedLifetimeHours: 6000,
    consumablesHourlyRate: 1500,
    hourlyRate: 16000,
    maxPrintSpeedMmS: 500,
    heatedBedMaxTemp: 80,
    hasEnclosure: false,
    hasAMS: true,
    status: 'Idle'
  },
  {
    id: 'creality-k1-max',
    name: 'Creality K1 Max High-Speed',
    brand: 'Creality',
    bedDimensions: { x: 300, y: 300, z: 300 },
    nozzleDiameter: 0.4,
    technology: 'FDM',
    powerKW: 0.22,
    acquisitionCost: 19500000,
    expectedLifetimeHours: 6500,
    consumablesHourlyRate: 2200,
    hourlyRate: 24000,
    maxPrintSpeedMmS: 600,
    heatedBedMaxTemp: 120,
    hasEnclosure: true,
    hasAMS: false,
    status: 'Printing'
  },
  {
    id: 'anycubic-kobra-max',
    name: 'Anycubic Kobra 2 Max Pro',
    brand: 'Anycubic',
    bedDimensions: { x: 420, y: 420, z: 500 },
    nozzleDiameter: 0.4,
    technology: 'FDM',
    powerKW: 0.28,
    acquisitionCost: 22000000,
    expectedLifetimeHours: 6000,
    consumablesHourlyRate: 2000,
    hourlyRate: 35000,
    maxPrintSpeedMmS: 500,
    heatedBedMaxTemp: 90,
    hasEnclosure: false,
    hasAMS: false,
    status: 'Idle'
  },
  {
    id: 'formlabs-form-4',
    name: 'Formlabs Form 4 SLA 8K',
    brand: 'Formlabs',
    bedDimensions: { x: 200, y: 125, z: 210 },
    nozzleDiameter: 0.05,
    technology: 'SLA',
    powerKW: 0.12,
    acquisitionCost: 85000000,
    expectedLifetimeHours: 10000,
    consumablesHourlyRate: 6500,
    hourlyRate: 55000,
    maxPrintSpeedMmS: 100,
    heatedBedMaxTemp: 35,
    hasEnclosure: true,
    hasAMS: false,
    status: 'Idle'
  }
];

export const DEFAULT_INKIRI_FORMULA_CONFIG: InkiriCostFormulaConfig = {
  // 1. Electricity / Điện năng
  electricityRatePerKWh: 2850, // VND / kWh (Điện sản xuất kinh doanh bậc 2)

  // 2. Labor & Operations / Nhân công kỹ thuật (Đơn giá 65,000 VND / giờ)
  laborHourlyRate: 65000,
  fileReviewLaborMinutes: 4, // 4 phút kiểm tra slicing & mesh
  setupLaborMinutes: 5, // 5 phút chuẩn bị máy & xịt keo PEI
  supportRemovalMinutes: 8, // 8 phút bóc support
  postProcessingLaborMinutes: 6, // 6 phút mài nhẵn / deburring
  qcLaborMinutes: 4, // 4 phút đo kiểm thước kẹp Mitutoyo
  packagingLaborMinutes: 3, // 3 phút đóng gói xốp & hộp

  // 3. Packaging & Consumables / Đóng gói & Vật tư phụ
  fixedPackagingCost: 12000, // Hộp carton, mút xốp EVA, túi hút ẩm
  multiColorPackagingExtra: 5000, // Thêm phụ phí bảo vệ cho chi tiết màu
  ipaSolventCost: 8000, // Chi phí cồn IPA hoàn thiện & sấy UV rửa sạch (8,000 VNĐ/sp)
  defaultMachineDepreciationPerHour: 4375, // Khấu hao máy in tiêu chuẩn ~4,375 VNĐ/giờ (35tr / 8000h)

  // 4. Overhead & Management / Mặt bằng & Chi phí quản lý xưởng
  overheadPerUnit: 15000, // Tiền thuê xưởng, phần mềm CAD/Slicer, internet

  // 5. Failure Contingency / Dự phòng rủi ro in lỗi
  baseFailureReservePercent: 8, // 8% cơ bản
  lowPrintabilityExtraPercent: 6, // +6% nếu mô hình có điểm <80
  multiColorExtraPercent: 5, // +5% nếu in nhiều màu (AMS purge rủi ro)
  difficultMaterialExtraPercent: 4, // +4% cho vật liệu khó như Nylon, Resin

  // 6. Pricing & Margins / Biên lợi nhuận & Chiết khấu
  defaultMarkupPercent: 35, // Lợi nhuận gộp mong muốn 35%
  platformCommissionPercent: 8, // 8% Phí nền tảng
  paymentGatewayFeePercent: 2.5, // 2.5% Cổng thanh toán
  designerRoyaltyPercent: 5, // 5% Bản quyền thiết kế
  roundingRule: '1000', // Làm tròn lên 1,000đ

  // 7. Quantity Discounts / Chiết khấu theo số lượng (Tiers)
  volumeDiscounts: [
    { minQty: 1, maxQty: 4, discountPercent: 0, label: '1 - 4 chiếc (Giá gốc lẻ)' },
    { minQty: 5, maxQty: 9, discountPercent: 8, label: '5 - 9 chiếc (-8%)' },
    { minQty: 10, maxQty: 24, discountPercent: 15, label: '10 - 24 chiếc (-15% Tiết kiệm)' },
    { minQty: 25, maxQty: 49, discountPercent: 22, label: '25 - 49 chiếc (-22% Giá sỉ xưởng)' },
    { minQty: 50, discountPercent: 30, label: '50+ chiếc (-30% Sản xuất loạt lớn)' }
  ],

  // 8. Customization & Addon Fees
  customEngravingFee: 50000, // 50,000 VND
  customLogoUploadFee: 80000, // 80,000 VND

  // 9. Delivery Package Lead Time Adjustments
  economyDiscountPercent: 10, // -10% cho gói Tiết kiệm
  expressRushSurchargePercent: 30, // +30% cho gói Hỏa tốc 24H

  // 10. Slicing Model Constants
  supportVolumeRatioPercent: 16, // 16% khối lượng support
  brimRaftGrams: 6, // 6g brim
  multiColorToolChangeMins: 1.5, // 1.5 phút / lần thay màu
  multiColorPurgeWasteGrams: 28, // 28g / màu thêm
  fastEstimatorBaseOverhead: 45000 // 45,000 VND cơ bản
};

export const SAMPLE_ANALYSIS_FILES: AnalysisFile[] = [
  {
    id: 'ana-3mf-planetary',
    fileName: 'Planetary_Gearbox_Assembly_v3.3mf',
    fileSize: '6.4 MB',
    format: '3MF',
    uploadDate: '24/10/2026 10:15',
    dimensions: { x: 92.5, y: 92.5, z: 38.0 },
    volume: 64.8,
    surfaceArea: 210.5,
    triangleCount: 48200,
    partsCount: 4,
    parts: [
      {
        id: 'part-sun-gear',
        name: 'Sun Gear Central 16T',
        color: 'Xanh Teal Công Nghiệp',
        colorHex: '#00687a',
        materialId: 'petg-pro',
        visible: true,
        triangleCount: 12400,
        volumeCm3: 14.2,
        extruderIndex: 1,
        plateIndex: 1
      },
      {
        id: 'part-planet-gears',
        name: 'Planet Gears Triad (x3)',
        color: 'Cam Cảnh Báo Cơ Khí',
        colorHex: '#ea580c',
        materialId: 'petg-pro',
        visible: true,
        triangleCount: 18600,
        volumeCm3: 21.6,
        extruderIndex: 2,
        plateIndex: 1
      },
      {
        id: 'part-ring-housing',
        name: 'Outer Ring Gear Body',
        color: 'Đen Mờ Kỹ Thuật',
        colorHex: '#1C1C1C',
        materialId: 'pla-tough',
        visible: true,
        triangleCount: 11800,
        volumeCm3: 22.5,
        extruderIndex: 3,
        plateIndex: 2
      },
      {
        id: 'part-carrier-plate',
        name: 'Carrier Plate & Shaft Hub',
        color: 'Xám Titan Pro',
        colorHex: '#64748b',
        materialId: 'pla-tough',
        visible: true,
        triangleCount: 5400,
        volumeCm3: 6.5,
        extruderIndex: 4,
        plateIndex: 2
      }
    ],
    isWatertight: true,
    nonManifoldEdges: 0,
    invertedNormals: 0,
    minWallThickness: 1.8,
    recommendedTech: 'FDM Multi-Material (Bambu AMS) hoặc PETG Pro',
    requiresSupport: false,
    printability: {
      printabilityScore: 94,
      level: 'good',
      issues: [
        {
          code: 'OVERHANG',
          severity: 'low',
          message: '6.2% bề mặt góc nghiêng 48° nằm trong giới hạn tự đỡ không cần support.'
        }
      ],
      recommendedOrientation: 'Mặt đáy vòng răng tiếp xúc bàn in 0°',
      bedFit: true,
      overhangPercentage: 6.2
    },
    tag: '3MF Chuẩn // 2 Bàn In (Multi-Plate)',
    status: 'Ready',
    modelType: 'gear',
    sha256Hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    isUnitConfirmed: true,
    activePlateIndex: 1,
    plates: [
      {
        index: 1,
        name: 'Bàn 1: Cụm Bánh Răng Hành Tinh',
        predictionSeconds: 4500,
        predictionFormatted: '1h 15m',
        filamentGrams: 46.0,
        filamentMeters: 15.0,
        bedType: 'Textured PEI Plate',
        partCount: 2,
        partIds: ['part-sun-gear', 'part-planet-gears'],
        dimensions: { x: 74.0, y: 74.0, z: 28.0 }
      },
      {
        index: 2,
        name: 'Bàn 2: Vỏ Vòng Ngoài & Trục Đỡ',
        predictionSeconds: 3600,
        predictionFormatted: '1h 00m',
        filamentGrams: 32.4,
        filamentMeters: 11.2,
        bedType: 'Textured PEI Plate',
        partCount: 2,
        partIds: ['part-ring-housing', 'part-carrier-plate'],
        dimensions: { x: 92.5, y: 92.5, z: 38.0 }
      }
    ],
    slicerPreset: {
      software: 'Bambu Studio v1.9.3 (AMS Project)',
      printerModel: 'Bambu Lab X1-Carbon 0.4 nozzle',
      nozzleDiameter: 0.4,
      layerHeight: 0.16,
      initialLayerHeight: 0.20,
      infillDensity: '25%',
      infillPattern: 'gyroid',
      wallLoops: 3,
      topShellLayers: 4,
      bottomShellLayers: 3,
      printSpeed: 250,
      estimatedPrintTimeFormatted: '2h 15m (Tổng 2 bàn)',
      estimatedPrintTimeSeconds: 8100,
      totalFilamentGrams: 78.4,
      totalFilamentMeters: 26.2,
      plateCount: 2,
      activePlateIndex: 1,
      plates: [
        {
          index: 1,
          name: 'Bàn 1: Cụm Bánh Răng Hành Tinh',
          predictionSeconds: 4500,
          predictionFormatted: '1h 15m',
          filamentGrams: 46.0,
          filamentMeters: 15.0,
          bedType: 'Textured PEI Plate',
          partCount: 2,
          partIds: ['part-sun-gear', 'part-planet-gears'],
          dimensions: { x: 74.0, y: 74.0, z: 28.0 }
        },
        {
          index: 2,
          name: 'Bàn 2: Vỏ Vòng Ngoài & Trục Đỡ',
          predictionSeconds: 3600,
          predictionFormatted: '1h 00m',
          filamentGrams: 32.4,
          filamentMeters: 11.2,
          bedType: 'Textured PEI Plate',
          partCount: 2,
          partIds: ['part-ring-housing', 'part-carrier-plate'],
          dimensions: { x: 92.5, y: 92.5, z: 38.0 }
        }
      ],
      palettes: [
        {
          index: 1,
          colorHex: '#00687a',
          name: 'Bambu PETG Basic Cyan (AMS Slot 1)',
          materialType: 'PETG Basic',
          vendor: 'Bambu Lab',
          density: 1.27,
          usedGrams: 18.2,
          usedMeters: 5.9,
          costPerKg: 350000
        },
        {
          index: 2,
          colorHex: '#ea580c',
          name: 'Bambu PETG Basic Orange (AMS Slot 2)',
          materialType: 'PETG Basic',
          vendor: 'Bambu Lab',
          density: 1.27,
          usedGrams: 27.8,
          usedMeters: 9.1,
          costPerKg: 350000
        },
        {
          index: 3,
          colorHex: '#1C1C1C',
          name: 'Bambu PLA Tough Black (AMS Slot 3)',
          materialType: 'PLA Tough',
          vendor: 'Bambu Lab',
          density: 1.24,
          usedGrams: 24.1,
          usedMeters: 8.3,
          costPerKg: 320000
        },
        {
          index: 4,
          colorHex: '#64748b',
          name: 'Bambu PLA Tough Titan Gray (AMS Slot 4)',
          materialType: 'PLA Tough',
          vendor: 'Bambu Lab',
          density: 1.24,
          usedGrams: 8.3,
          usedMeters: 2.9,
          costPerKg: 320000
        }
      ]
    }
  },
  {
    id: 'ana-stl-arduino',
    fileName: 'Arduino_Uno_SnapFit_Enclosure.stl',
    fileSize: '14.8 MB',
    format: 'STL',
    uploadDate: '24/10/2026 09:45',
    dimensions: { x: 86.4, y: 64.0, z: 28.5 },
    volume: 42.1,
    surfaceArea: 154.2,
    triangleCount: 22400,
    partsCount: 1,
    parts: [
      {
        id: 'part-stl-single',
        name: 'Enclosure Mesh Shell',
        color: 'Xanh Teal Công Nghiệp',
        colorHex: '#00687a',
        materialId: 'pla-tough',
        visible: true,
        triangleCount: 22400,
        volumeCm3: 42.1,
        extruderIndex: 1
      }
    ],
    isWatertight: true,
    nonManifoldEdges: 0,
    invertedNormals: 0,
    minWallThickness: 1.5,
    recommendedTech: 'FDM Engineering (PLA Tough / PETG)',
    requiresSupport: true,
    printability: {
      printabilityScore: 88,
      level: 'good',
      issues: [
        {
          code: 'OVERHANG',
          severity: 'medium',
          message: 'Có 14.5% diện tích vòm cổng USB cần bật Tree Support.'
        }
      ],
      recommendedOrientation: 'Đặt mặt phẳng đáy nằm sát bàn in (Z=0)',
      bedFit: true,
      overhangPercentage: 14.5
    },
    tag: 'STL Đơn Mesh // Cần xác nhận đơn vị đo',
    status: 'Ready',
    modelType: 'box',
    sha256Hash: 'a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8',
    isUnitConfirmed: false
  },
  {
    id: 'ana-stl-drone',
    fileName: 'FPV_Drone_Lightweight_Arm.stl',
    fileSize: '18.2 MB',
    format: 'STL',
    uploadDate: '24/10/2026 08:30',
    dimensions: { x: 160.0, y: 160.0, z: 14.0 },
    volume: 54.6,
    surfaceArea: 198.0,
    triangleCount: 36800,
    partsCount: 1,
    parts: [
      {
        id: 'part-drone-stl',
        name: 'Carbon-Blend Drone Arm',
        color: 'Đen Mờ Kỹ Thuật',
        colorHex: '#1C1C1C',
        materialId: 'abs-industrial',
        visible: true,
        triangleCount: 36800,
        volumeCm3: 54.6,
        extruderIndex: 1
      }
    ],
    isWatertight: true,
    nonManifoldEdges: 0,
    invertedNormals: 0,
    minWallThickness: 0.75,
    recommendedTech: 'PETG Technical Pro / Nylon CF',
    requiresSupport: false,
    printability: {
      printabilityScore: 76,
      level: 'warning',
      issues: [
        {
          code: 'THIN_WALL',
          severity: 'high',
          message: 'Có vùng gân thành dày 0.75mm, nhỏ hơn ngưỡng an toàn 1.0mm cho Nozzle 0.4mm.'
        },
        {
          code: 'OVERHANG',
          severity: 'low',
          message: 'Khung tay có góc vát 35°, có thể in không cần support nếu in chậm.'
        }
      ],
      recommendedOrientation: 'Xoay 45° so với trục X để tăng liên kết lớp',
      bedFit: true,
      overhangPercentage: 8.0
    },
    tag: 'STL Cơ Khí // Cảnh báo thành mỏng',
    status: 'Ready',
    modelType: 'drone',
    sha256Hash: '9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e',
    isUnitConfirmed: true
  }
];

export const CUSTOM_REQUESTS: CustomDesignRequest[] = [
  {
    id: 'req-2026-001',
    clientName: 'Nguyễn Hải Phong (Robotics Lab)',
    clientInitials: 'HP',
    title: 'Thiết Kế Cụm Bánh Răng Hành Tinh Tỉ Số Truyền 5:1',
    previewMessage: 'Cần gân trợ lực chịu xoắn cho trục động cơ Nema 23...',
    time: '10:45',
    status: 'In Progress',
    unread: true,
    budget: '1.200.000 đ',
    deadline: '02/09/2026',
    serviceType: 'Tối ưu hóa thiết kế CAD & Dung sai in-place',
    targetSpecs: {
      material: 'Nylon PA12-CF / PETG Technical',
      infill: '60% Gyroid',
      nozzle: '0.4mm Hardened Steel'
    },
    referenceFiles: [
      { name: 'Nema23_Mount_Spec.pdf', type: 'image' },
      { name: 'Gear_Profile_Draft.step', type: 'stl' }
    ],
    messages: [
      {
        id: 'msg-001',
        sender: 'client',
        senderName: 'Nguyễn Hải Phong',
        senderInitials: 'HP',
        time: '10:30',
        text: 'Chào bạn, bên lab mình đang cần thiết kế lại cụm bánh răng hành tinh cho cánh tay robot mini. Mô-men xoắn đầu ra khoảng 4.5 N.m.'
      },
      {
        id: 'msg-002',
        sender: 'designer',
        senderName: 'Lê Thắng CAD/CAM (Bạn)',
        senderInitials: 'LT',
        time: '10:38',
        text: 'Chào anh Phong, với mô-men xoắn này em đề xuất dùng profile răng module 1.25, góc áp lực 20 độ và in bằng Nylon-CF để chống mòn răng.'
      },
      {
        id: 'msg-003',
        sender: 'client',
        senderName: 'Nguyễn Hải Phong',
        senderInitials: 'HP',
        time: '10:45',
        text: 'Cần gân trợ lực chịu xoắn cho trục động cơ Nema 23 và dung sai khe hở in-place khoảng 0.2mm để không bị dính răng nhé.'
      }
    ]
  },
  {
    id: 'req-2026-002',
    clientName: 'Trần Minh Trí (IoT Solution)',
    clientInitials: 'TT',
    title: 'Vỏ Hộp Cảm Biến Môi Trường IP67 Kèm Khớp Gài Snap-Fit',
    previewMessage: 'Bạn có thể tối ưu gioăng cao su O-ring chống nước không?',
    time: 'Hôm qua',
    status: 'Pending',
    unread: false,
    budget: '850.000 đ',
    deadline: '05/09/2026',
    serviceType: 'Thiết kế vỏ hộp thiết bị điện tử',
    targetSpecs: {
      material: 'ABS Kỹ Thuật / Resin Tough',
      infill: '100% Solid',
      nozzle: '0.4mm'
    },
    referenceFiles: [
      { name: 'PCB_Outline_Dimension.dxf', type: 'image' }
    ],
    messages: [
      {
        id: 'msg-101',
        sender: 'client',
        senderName: 'Trần Minh Trí',
        senderInitials: 'TT',
        time: 'Hôm qua 15:20',
        text: 'Chào Thắng, bên mình cần thiết kế vỏ bảo vệ module cảm biến bụi mịn PM2.5 lắp ngoài trời.'
      },
      {
        id: 'msg-102',
        sender: 'client',
        senderName: 'Trần Minh Trí',
        senderInitials: 'TT',
        time: 'Hôm qua 15:25',
        text: 'Bạn có thể tối ưu gioăng cao su O-ring chống nước và rãnh thoát nước ngưng tụ không?'
      }
    ]
  },
  {
    id: 'req-2026-003',
    clientName: 'TS. Vũ Đức Đam (VinFast Innovation)',
    clientInitials: 'VĐ',
    title: 'Đồ Gá Kiểm Tra Kích Thước Jig CMM Chống Trầy Xước',
    previewMessage: 'Đã nhận báo giá, đang chờ phòng tài chính duyệt PO.',
    time: '24/08/2026',
    status: 'Quoted',
    unread: false,
    budget: '2.500.000 đ',
    deadline: '30/08/2026',
    serviceType: 'Đồ gá sản xuất (Jigs & Fixtures)',
    targetSpecs: {
      material: 'PETG ESD Chống Tĩnh Điện',
      infill: '50% Triangular',
      nozzle: '0.6mm High Flow'
    },
    referenceFiles: [
      { name: 'CMM_Fixture_Base.step', type: 'stl' }
    ],
    messages: [
      {
        id: 'msg-201',
        sender: 'client',
        senderName: 'TS. Vũ Đức Đam',
        senderInitials: 'VĐ',
        time: '24/08 09:15',
        text: 'Chúng tôi cần 1 bộ đồ gá kiểm tra nhanh kích thước chi tiết dập kim loại bằng máy CMM.'
      },
      {
        id: 'msg-202',
        sender: 'designer',
        senderName: 'Lê Thắng CAD/CAM (Bạn)',
        senderInitials: 'LT',
        time: '24/08 11:30',
        text: 'Tôi đã gửi Báo Giá Kỹ Thuật chi tiết bao gồm mô hình 3D CAD, bản vẽ 2D dung sai GD&T và chi phí in thử mẫu.',
        quote: {
          amount: 2500000,
          currency: 'VND',
          description: 'Gói thiết kế đồ gá Jig CMM + hiệu chỉnh 3 lần + bàn giao file STEP/Parasolid.',
          status: 'sent'
        }
      },
      {
        id: 'msg-203',
        sender: 'client',
        senderName: 'TS. Vũ Đức Đam',
        senderInitials: 'VĐ',
        time: '24/08 14:00',
        text: 'Đã nhận báo giá, đang chờ phòng tài chính duyệt PO.'
      }
    ]
  }
];

export const PAYOUT_TRANSACTIONS: PayoutTransaction[] = [
  {
    id: 'TRX-94821-Z',
    date: '25/08/2026',
    reference: 'VCUBE-PAYOUT-8842',
    method: 'Vietcombank (*8892)',
    amount: 15400000,
    status: 'COMPLETED'
  },
  {
    id: 'TRX-83192-A',
    date: '10/08/2026',
    reference: 'VCUBE-PAYOUT-7921',
    method: 'Vietcombank (*8892)',
    amount: 22850000,
    status: 'COMPLETED'
  },
  {
    id: 'TRX-71044-K',
    date: '25/07/2026',
    reference: 'VCUBE-PAYOUT-6512',
    method: 'MB Bank (*1029)',
    amount: 18200000,
    status: 'COMPLETED'
  }
];

export const MODERATION_PRODUCTS: ModerationProductItem[] = [
  {
    id: 'mod-001',
    title: 'Hệ Thống Bánh Răng Hành Tinh Cycloid Đảo Chiều',
    format: 'STEP / STL',
    designer: 'Lê Thắng CAD/CAM',
    isVerifiedDesigner: true,
    license: 'Standard Commercial',
    scale: '1:1 True Scale',
    material: 'Nylon-CF / PETG',
    price: 180000,
    image: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=800&auto=format&fit=crop&q=80',
    status: 'APPROVED'
  },
  {
    id: 'mod-002',
    title: 'Vỏ Bảo Vệ Thiết Bị Định Vị GPS Tracker Chống Nước',
    format: '3MF / STL',
    designer: 'Đặng Tuấn Kiệt',
    isVerifiedDesigner: false,
    license: 'Standard Personal',
    scale: '1:1',
    material: 'ABS / ASA',
    price: 95000,
    image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80',
    status: 'PENDING'
  },
  {
    id: 'mod-003',
    title: 'Mô Hình Điêu Khắc Rồng Thời Lý Tham Số Hóa Parametric',
    format: 'OBJ / STL 8K',
    designer: 'Studio Điêu Khắc Đại Việt',
    isVerifiedDesigner: true,
    license: 'Extended Royalty-Free',
    scale: '150mm H',
    material: 'Resin Engineering 8K',
    price: 250000,
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
    status: 'APPROVED'
  }
];

export const DESIGNER_APPLICATIONS: DesignerApplication[] = [
  {
    id: 'app-001',
    name: 'Phạm Hoàng Long',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    role: 'Kỹ Sư Thiết Kế Cơ Khí Chính Xác',
    status: 'Pending',
    portfolioUrl: 'https://grabcad.com/long.pham.cad',
    software: ['SolidWorks', 'Autodesk Fusion 360', 'KeyShot'],
    bio: '5 năm kinh nghiệm thiết kế khuôn mẫu và tối ưu hóa chi tiết in 3D FDM/SLS công nghiệp.',
    submissionDate: '26/08/2026'
  },
  {
    id: 'app-002',
    name: 'Ngô Thanh Vân',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    role: '3D Character & Organic Sculptor',
    status: 'Verified',
    portfolioUrl: 'https://artstation.com/vanngo3d',
    software: ['ZBrush', 'Blender', 'Substance Painter'],
    bio: 'Chuyên gia điêu khắc mô hình mỹ thuật độ phân giải siêu cao 8K cho in Resin SLA/DLP.',
    submissionDate: '15/08/2026'
  }
];

export const DISPUTES_LIST: DisputeRecord[] = [
  {
    id: 'DISP-8821',
    customer: 'Công ty TNHH Cơ Khí An Phát',
    designer: 'Lê Thắng CAD/CAM',
    amount: 1450000,
    status: 'RESOLVED',
    isTopSeller: true,
    isVerified: true
  }
];

export const DMCA_REPORTS: DMCAReport[] = [
  {
    id: 'DMCA-001',
    modelName: 'Mô Hình Figure Iron Man Mark 85 Articulated',
    image: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=400&auto=format&fit=crop&q=80',
    reporter: 'Marvel Studios Legal Team (Vietnam Rep)',
    dateFiled: '18/08/2026',
    status: 'Takedown Issued'
  }
];

export const DEFAULT_SITE_CONTENT: import('../types').SiteContentConfig = {
  // Top Announcement / Campaign
  announcementText: 'Giảm 20% toàn bộ file thiết kế CAD & Miễn phí đo kiểm dung sai ±0.05mm cho các linh kiện gắn tag #2/9.',
  announcementActive: true,
  announcementBadge: '🇻🇳 ĐẠI LỄ QUỐC KHÁNH 2/9',
  announcementActionText: 'Xem Sản Phẩm Tag 2/9',
  announcementActionTag: '2/9',

  // Hero Section
  heroBadge: 'VCUBE PRECISION ANTHOLOGY // 2026',
  heroHeadline: 'CHẾ TÁC CƠ KHÍ IN 3D CHÍNH XÁC',
  heroHeadlineLine1: 'CHẾ TÁC CƠ KHÍ',
  heroHeadlineHighlight: 'IN 3D CÔNG NGHIỆP CHÍNH XÁC',
  heroSubheadline: 'Nền tảng sản xuất bồi đắp linh kiện cơ khí, vỏ hộp IoT và khuôn mẫu kỹ thuật số. Kiểm tra hình học mesh tự động, nhận báo giá tức thì trong 3 giây với dung sai đo kiểm dưới ±0.05mm.',
  heroCtaQuoteText: 'Báo Giá File 3D Tức Thì',
  heroCtaCatalogText: 'Khám Phá Kho Mẫu CAD',
  heroMetric1Label: 'Dung Sai Đo Kiểm',
  heroMetric1Value: '±0.05 MM',
  heroMetric2Label: 'Thời Gian Bàn Giao',
  heroMetric2Value: 'GIAO HÀNG 24H',
  heroMetric3Label: 'Tiêu Chuẩn Sản Xuất',
  heroMetric3Value: 'ISO/ASTM 52900',

  // 3-Step Workshop Workflow
  workflowBadge: 'CHRONICLE // QUY TRÌNH XƯỞNG',
  workflowTitle: 'Quy Trình Gia Công 3 Bước Chuẩn Xác',
  workflowStep1Title: 'Tải Lên & Khảo Sát Mesh STL',
  workflowStep1Desc: 'Thuật toán quét hình học VCUBE kiểm tra cấu trúc watertight, định vị góc overhanging và tính toán thể tích vật liệu trong 3 giây.',
  workflowStep2Title: 'Cắt Lớp & In Nhiệt Chuẩn Xác',
  workflowStep2Desc: 'Gia công trên hệ thống máy Bambu Lab X1C & Formlabs Form 4 với sợi carbon PETG-CF và nhựa Resin kỹ thuật độ chính xác cao.',
  workflowStep3Title: 'Kiểm Định QC & Bàn Giao',
  workflowStep3Desc: 'Đo kiểm quang học và thước kẹp Mitutoyo xác thực dung sai ±0.05mm, đóng gói chống sốc và giao hàng toàn quốc.',

  // Live Fast Estimator
  estimatorBadge: 'VCUBE FAST ESTIMATOR // LIVE QUOTE',
  estimatorTitle: 'Mô Phỏng & Ước Tính Chi Phí In 3D Trực Tiếp',
  estimatorSubtitle: 'Chọn vật liệu kỹ thuật, độ đặc infill và kích cỡ mẫu để mô phỏng tức thì chi phí gia công theo bảng giá xưởng VCUBE.',
  estimatorBenefit1: 'Tự động tính toán theo tỉ trọng vật liệu g/cm³ chuẩn xác',
  estimatorBenefit2: 'Miễn phí gọt support & rửa cồn siêu âm xử lý bề mặt UV',
  estimatorCtaText: 'Tải File STL Lên Để Báo Giá Chi Tiết →',

  // Trust Partners & R&D Labs
  trustPartnersTitle: 'Được Tin Cậy Bởi Các Đơn Vị R&D & Xưởng Cơ Khí',
  trustPartnersList: [
    'BK ROBOTICS LAB',
    'FPT HI-TECH INNOVATION',
    'VNU AEROSPACE LAB',
    'VIET-CNC AUTOMATION',
    'ISO 9001:2015 CERTIFIED',
    'BAMBU LAB FLEET 24X'
  ],

  // Facilities, Specifications & Shipping
  toleranceSpec: '±0.05mm (Mitutoyo Calibrated)',
  standardShippingFee: 25000,
  freeShippingThreshold: 300000,
  hotline: '1900 6833',
  contactEmail: 'contact@vcube.vn',
  hanoiWorkshopAddress: 'Xưởng In 3D VCUBE: Khu Công Nghệ Cao Hòa Lạc, Hà Nội',
  hcmWorkshopAddress: 'Chi Nhánh Nam: Khu Công Nghệ Cao TP. Thủ Đức, TP. Hồ Chí Minh',

  // SEO & Metadata Defaults
  seoTitle: 'VCUBE — Dịch Vụ In 3D Công Nghiệp & Báo Giá CAD Tức Thì',
  seoDescription: 'Nền tảng sản xuất bồi đắp và in 3D công nghiệp hàng đầu Việt Nam. Báo giá tức thì trong 3 giây cho file STL, STEP, 3MF với dung sai ±0.05mm, công nghệ FDM, SLA, SLS.',
  seoKeywords: 'in 3d, dich vu in 3d, bao gia in 3d, in 3d cong nghiep, cat lop stl, bambu lab, formlabs, in 3d ha noi, in 3d hcm, vcube',
  seoOgImage: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=1200&h=630&fit=crop',
  seoCanonicalUrl: 'https://vcube.vn',
  seoRobotsIndex: true,
  seoStructuredData: JSON.stringify({
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "VCUBE Precision 3D Manufacturing",
    "image": "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=1200&h=630&fit=crop",
    "telephone": "1900 6833",
    "email": "contact@vcube.vn",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Hà Nội & TP. Hồ Chí Minh",
      "addressCountry": "VN"
    },
    "priceRange": "$$"
  }, null, 2)
};

export const DEFAULT_ACCESSORIES: AccessoryItem[] = [
  {
    id: 'acc-keychain-swivel',
    name: 'Khoen Móc Khóa Xoay Kim Loại Inox 304 + Xích Nối 3cm',
    nameEn: 'Stainless Steel 304 Swivel Keychain Ring + 3cm Link Chain',
    category: 'keychain',
    unit: 'cái',
    costPrice: 1500,
    sellingPrice: 4000,
    sku: 'ACC-KEY-001',
    stockCount: 850,
    lowStockThreshold: 100,
    warehouseLocation: 'Kệ A1 - Hộc K01',
    supplier: 'Cơ khí & Phụ Kiện Nam Phát',
    description: 'Khoen móc khóa cao cấp không gỉ sét, khớp xoay 360 độ êm ái, thích hợp gắn mô hình in 3D quà lưu niệm.',
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80',
    isActive: true,
    compatibleWith: ['Móc khóa lưu niệm', 'Thẻ tên thú cưng', 'Charm balo', 'Phụ kiện decor']
  },
  {
    id: 'acc-split-ring-25',
    name: 'Vòng Khoen Tròn Dẹt Mạ Niken Bóng Ø25mm Kèm Khuyên Nối',
    nameEn: 'Flat Split Ring Nickel-Plated Ø25mm with Jump Ring',
    category: 'keychain',
    unit: 'cái',
    costPrice: 800,
    sellingPrice: 2500,
    sku: 'ACC-KEY-002',
    stockCount: 1200,
    lowStockThreshold: 200,
    warehouseLocation: 'Kệ A1 - Hộc K02',
    supplier: 'Xưởng Kim Khí Tân Bình',
    description: 'Vòng dẹt chịu lực đàn hồi tốt, bề mặt mạ niken sáng bóng chống xỉn màu.',
    imageUrl: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=200&auto=format&fit=crop&q=80',
    isActive: true,
    compatibleWith: ['Móc chìa khóa', 'Thẻ nhân viên', 'Mô hình mini']
  },
  {
    id: 'acc-heat-insert-m3',
    name: 'Ốc Cấy Nhiệt Đồng Thau M3 x 4mm x OD 5.0mm (Heat-set Inserts)',
    nameEn: 'Brass Heat-set Threaded Inserts M3 x 4.0mm OD 5.0mm',
    category: 'fastener',
    unit: 'cái',
    costPrice: 750,
    sellingPrice: 2000,
    sku: 'ACC-FST-M3-4',
    stockCount: 3400,
    lowStockThreshold: 500,
    warehouseLocation: 'Kệ B2 - Ngăn F01 (Tủ Khay Vàng)',
    supplier: 'CNC & Fastener Precision Co.',
    description: 'Ren đồng thau vân kim cương kép chống tuột xoắn, tối ưu cho chi tiết nhựa in 3D PLA, PETG, ABS, PA-CF.',
    imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=200&auto=format&fit=crop&q=80',
    isActive: true,
    compatibleWith: ['Vỏ hộp IoT', 'Đồ gá robot', 'Khung drone FPV', 'Cơ cấu lắp ghép']
  },
  {
    id: 'acc-heat-insert-m4',
    name: 'Ốc Cấy Nhiệt Đồng Thau M4 x 6mm x OD 6.0mm',
    nameEn: 'Brass Heat-set Threaded Inserts M4 x 6.0mm OD 6.0mm',
    category: 'fastener',
    unit: 'cái',
    costPrice: 1100,
    sellingPrice: 3000,
    sku: 'ACC-FST-M4-6',
    stockCount: 1800,
    lowStockThreshold: 300,
    warehouseLocation: 'Kệ B2 - Ngăn F02',
    supplier: 'CNC & Fastener Precision Co.',
    description: 'Ốc ren M4 chịu lực kéo cao, phù hợp lắp nắp vỏ máy công nghiệp và chi tiết chịu lực.',
    imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=200&auto=format&fit=crop&q=80',
    isActive: true,
    compatibleWith: ['Vỏ hộp điện tử công nghiệp', 'Khớp nối cơ khí', 'Gá máy in']
  },
  {
    id: 'acc-screw-m3-12-kit',
    name: 'Bộ Vít Lục Giác Chìm Inox 304 M3x12mm + Long Đền Đệm',
    nameEn: 'Stainless Steel 304 M3x12mm Socket Head Cap Screw + Washer Kit',
    category: 'hardware',
    unit: 'bộ',
    costPrice: 1200,
    sellingPrice: 3500,
    sku: 'ACC-HRD-M312',
    stockCount: 950,
    lowStockThreshold: 150,
    warehouseLocation: 'Kệ B3 - Ngăn H01',
    supplier: 'Bu Lông Ốc Vít Hòa Phát',
    description: 'Vít lục giác chìm DIN 912 thép không gỉ sáng bóng, độ cứng 8.8 tiêu chuẩn.',
    imageUrl: 'https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?w=200&auto=format&fit=crop&q=80',
    isActive: true,
    compatibleWith: ['Vỏ hộp', 'Cụm bánh răng', 'Khung lắp ráp']
  },
  {
    id: 'acc-magnet-n52-6x2',
    name: 'Nam Châm Neodymium N52 Tròn Ø6mm x Dày 2mm Siêu Hút',
    nameEn: 'Neodymium N52 Disc Magnet Ø6mm x 2mm High Power',
    category: 'magnet',
    unit: 'viên',
    costPrice: 2200,
    sellingPrice: 5000,
    sku: 'ACC-MAG-62',
    stockCount: 1450,
    lowStockThreshold: 200,
    warehouseLocation: 'Kệ C1 - Hộc M01 (Khu Khóa Từ)',
    supplier: 'Công ty Nam Châm Việt',
    description: 'Lực hút cực mạnh, mạ Niken 3 lớp Ni-Cu-Ni chống oxy hóa. Lý tưởng làm nắp hộp hít từ tính hoặc khóa gài mô hình.',
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80',
    isActive: true,
    compatibleWith: ['Nắp hộp đóng mở từ tính', 'Khớp nối mô hình figure', 'Gá cảm biến']
  },
  {
    id: 'acc-magnet-n52-10x3',
    name: 'Nam Châm Neodymium N52 Tròn Ø10mm x Dày 3mm',
    nameEn: 'Neodymium N52 Disc Magnet Ø10mm x 3mm',
    category: 'magnet',
    unit: 'viên',
    costPrice: 4500,
    sellingPrice: 9000,
    sku: 'ACC-MAG-103',
    stockCount: 620,
    lowStockThreshold: 100,
    warehouseLocation: 'Kệ C1 - Hộc M02',
    supplier: 'Công ty Nam Châm Việt',
    description: 'Lực giữ từ tính lên tới 2.5kg, phù hợp đế giữ điện thoại, gá dụng cụ xưởng.',
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80',
    isActive: true,
    compatibleWith: ['Đồ gá xưởng', 'Giá treo dụng cụ', 'Khớp nối tháo lắp nhanh']
  },
  {
    id: 'acc-bearing-608',
    name: 'Vòng Bi Bạc Đạn Tốc Độ Cao 608-2RS (8x22x7mm)',
    nameEn: 'High-Speed Precision Ball Bearing 608-2RS (8x22x7mm)',
    category: 'bearing',
    unit: 'cái',
    costPrice: 6500,
    sellingPrice: 15000,
    sku: 'ACC-BRG-608',
    stockCount: 380,
    lowStockThreshold: 50,
    warehouseLocation: 'Kệ C2 - Ngăn B01',
    supplier: 'Bạc Đạn Vòng Bi SKF & FAG Phân Phối',
    description: 'Vòng bi bọc cao su 2 mặt chống bụi, chạy êm ái với ma sát tối thiểu cho cụm bánh răng xoay, spinner, con lăn.',
    imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=200&auto=format&fit=crop&q=80',
    isActive: true,
    compatibleWith: ['Hộp số hành tinh', 'Con lăn dây tóc', 'Mô hình chuyển động cơ học']
  },
  {
    id: 'acc-rubber-feet-3m',
    name: 'Bộ 4 Đệm Chân Silicon Chống Trượt 3M Bán Cầu Ø10x3mm',
    nameEn: '3M Self-Adhesive Silicone Rubber Feet Bumper 4-Pack Ø10x3mm',
    category: 'hardware',
    unit: 'bộ',
    costPrice: 3000,
    sellingPrice: 8000,
    sku: 'ACC-PAD-3M4',
    stockCount: 520,
    lowStockThreshold: 80,
    warehouseLocation: 'Kệ B3 - Ngăn H04',
    supplier: 'Vật Liệu Keo Dán 3M Việt Nam',
    description: 'Keo dán siêu dính bám chắc vào nhựa in, chống trượt trên mặt bàn kính, giảm rung ồn cho thiết bị.',
    imageUrl: 'https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?w=200&auto=format&fit=crop&q=80',
    isActive: true,
    compatibleWith: ['Đế vỏ hộp IoT', 'Đế bàn phím cơ', 'Đồ gá xưởng']
  },
  {
    id: 'acc-box-kraft-gift',
    name: 'Hộp Carton Kraft Định Lượng Cao 3 Lớp + Mút Xốp EVA Định Hình',
    nameEn: 'Premium 3-Layer Kraft Gift Box with Custom EVA Foam Cushion',
    category: 'packaging',
    unit: 'hộp',
    costPrice: 8500,
    sellingPrice: 18000,
    sku: 'ACC-PKG-KFT1',
    stockCount: 410,
    lowStockThreshold: 75,
    warehouseLocation: 'Kho Đóng Gói - Kệ P1',
    supplier: 'Bao Bì Giấy Hưng Phát',
    description: 'Hộp nắp gài sang trọng chuyên dụng cho đơn hàng quà tặng in 3D cao cấp và linh kiện dễ vỡ.',
    imageUrl: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=200&auto=format&fit=crop&q=80',
    isActive: true,
    compatibleWith: ['Đơn hàng quà tặng', 'Mô hình sưu tầm Resin 8K', 'Hàng xuất khẩu']
  }
];

export const WORKSHOP_PARTNERS: WorkshopPartner[] = [
  {
    id: 'ws-hanoi-hub',
    name: 'VCUBE R&D & MES Farm Hà Nội',
    region: 'hanoi',
    address: 'Số 18 Hoàng Quốc Việt, Cầu Giấy, Hà Nội',
    contactPerson: 'Kỹ sư Vũ Mạnh Cường',
    phone: '0981.234.567',
    email: 'hanoi.hub@vcube.vn',
    supportedTechnologies: ['FDM', 'SLA', 'SLS'],
    maxBuildVolume: { x: 450, y: 450, z: 500 },
    activePrintersCount: 16,
    availablePrintersCount: 5,
    slaRating: 4.95,
    completedJobsCount: 1240,
    currentQueueLength: 14.5,
    inStockMaterials: ['PLA Pro (Standard)', 'PETG Technical Pro', 'ABS Industrial', 'Tough Resin (High Detail)', 'PA-CF Carbon Fiber'],
    status: 'active'
  },
  {
    id: 'ws-danang-lab',
    name: 'VCUBE Innovation Hub Đà Nẵng',
    region: 'danang',
    address: 'Khu Công Nghệ Cao Đà Nẵng, Hòa Vang, Đà Nẵng',
    contactPerson: 'Kỹ sư Nguyễn Lê Hoàng',
    phone: '0905.888.999',
    email: 'danang.hub@vcube.vn',
    supportedTechnologies: ['FDM', 'SLA'],
    maxBuildVolume: { x: 300, y: 300, z: 350 },
    activePrintersCount: 8,
    availablePrintersCount: 3,
    slaRating: 4.88,
    completedJobsCount: 560,
    currentQueueLength: 6.2,
    inStockMaterials: ['PLA Pro (Standard)', 'PETG Technical Pro', 'Tough Resin (High Detail)'],
    status: 'active'
  },
  {
    id: 'ws-hcm-mega',
    name: 'VCUBE Smart MES Hub TP. Hồ Chí Minh',
    region: 'hcm',
    address: 'Đường D1, Khu Công Nghệ Cao (SHTP), TP. Thủ Đức, TP.HCM',
    contactPerson: 'Trưởng xưởng Trần Đình Phong',
    phone: '0912.456.789',
    email: 'hcm.hub@vcube.vn',
    supportedTechnologies: ['FDM', 'SLA', 'SLS'],
    maxBuildVolume: { x: 500, y: 500, z: 600 },
    activePrintersCount: 28,
    availablePrintersCount: 9,
    slaRating: 4.98,
    completedJobsCount: 2890,
    currentQueueLength: 22.0,
    inStockMaterials: ['PLA Pro (Standard)', 'PETG Technical Pro', 'ABS Industrial', 'Tough Resin (High Detail)', 'TPU 95A Flexible', 'PA-CF Carbon Fiber', 'PEEK High Temp'],
    status: 'active'
  }
];

export const MOCK_APP_USERS: AppUserProfile[] = [
  // 1. Khách hàng (Buyers)
  {
    uid: 'usr-buy-001',
    email: 'khachhang@vcube.vn',
    displayName: 'Nguyễn Văn Minh',
    role: 'customer',
    phone: '0918.765.432',
    company: 'Cá nhân (Hà Nội)',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    createdAt: '2025-08-12T09:30:00Z',
    lastLoginAt: '2026-09-03T14:20:00Z',
    kycStatus: 'verified',
    kycDocumentType: 'id_card',
    kycDocumentNumber: '001094018291',
    kycSubmittedAt: '2025-08-13T10:00:00Z',
    kycVerifiedAt: '2025-08-14T08:30:00Z',
    accountStatus: 'active',
    totalOrders: 14,
    totalSpent: 12450000,
    notes: 'Khách hàng thân thiết, thường in mô hình đồ gá và linh kiện thay thế.'
  },
  {
    uid: 'usr-buy-002',
    email: 'vuhainam@vinatech.com',
    displayName: 'Vũ Hải Nam (VinaTech Robot)',
    role: 'customer',
    phone: '0903.112.233',
    company: 'VinaTech Robotics JSC',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    createdAt: '2025-10-05T11:00:00Z',
    lastLoginAt: '2026-09-02T16:45:00Z',
    kycStatus: 'verified',
    kycDocumentType: 'business_license',
    kycDocumentNumber: '0317829102',
    kycSubmittedAt: '2025-10-06T09:15:00Z',
    kycVerifiedAt: '2025-10-07T14:00:00Z',
    accountStatus: 'active',
    totalOrders: 28,
    totalSpent: 54200000,
    bankAccount: {
      bankName: 'Vietcombank',
      accountNumber: '0071001289912',
      accountHolder: 'CONG TY CP ROBOT VINATECH'
    },
    notes: 'Khách hàng doanh nghiệp B2B, xuất hóa đơn VAT đều đặn hàng tháng.'
  },
  {
    uid: 'usr-buy-003',
    email: 'linh.pham@hust.edu.vn',
    displayName: 'Phạm Thùy Linh',
    role: 'customer',
    phone: '0977.345.678',
    company: 'Đại Học Bách Khoa Hà Nội',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-02-18T14:10:00Z',
    lastLoginAt: '2026-08-28T09:00:00Z',
    kycStatus: 'unverified',
    accountStatus: 'active',
    totalOrders: 3,
    totalSpent: 1450000,
    notes: 'In bài tập lớn đồ án tốt nghiệp ngành Cơ điện tử.'
  },
  {
    uid: 'usr-buy-004',
    email: 'ductrong.danger@gmail.com',
    displayName: 'Hoàng Trọng Đức',
    role: 'customer',
    phone: '0938.999.001',
    company: 'Tự do',
    createdAt: '2026-01-10T08:00:00Z',
    lastLoginAt: '2026-07-15T11:00:00Z',
    kycStatus: 'rejected',
    kycDocumentType: 'id_card',
    kycDocumentNumber: '079090001234',
    kycRejectionReason: 'Ảnh chụp CCCD bị mờ, không khớp tên tài khoản đặt hàng',
    accountStatus: 'suspended',
    totalOrders: 2,
    totalSpent: 650000,
    notes: 'Tài khoản bị tạm khóa do từ chối nhận hàng COD không lý do 2 lần liên tiếp.'
  },

  // 2. Nhà thiết kế (Designers / Creators)
  {
    uid: 'usr-des-001',
    email: 'creator.lethang@vcube.vn',
    displayName: 'Lê Thắng CAD/CAM',
    role: 'designer',
    phone: '0912.888.777',
    company: 'Studio Thiết Kế Cơ Khí Thắng Pro',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    engineerRank: 'Senior CAD Engineer (SolidWorks Expert)',
    designerBio: 'Kỹ sư thiết kế máy hơn 8 năm kinh nghiệm. Chuyên khớp nối snap-fit, hộp số hành tinh và đồ gá in 3D không cần support.',
    specialties: ['Cơ khí chính xác', 'Bánh răng', 'Vỏ hộp IoT', 'Đồ gá Jigs'],
    createdAt: '2025-06-01T08:00:00Z',
    lastLoginAt: '2026-09-04T05:30:00Z',
    kycStatus: 'verified',
    kycDocumentType: 'id_card',
    kycDocumentNumber: '001088019922',
    kycSubmittedAt: '2025-06-02T10:00:00Z',
    kycVerifiedAt: '2025-06-03T16:00:00Z',
    accountStatus: 'active',
    totalOrders: 142,
    totalRevenue: 42800000,
    bankAccount: {
      bankName: 'MB Bank',
      accountNumber: '888899992222',
      accountHolder: 'LE VAN THANG'
    },
    notes: 'Creator Kim Cương, tác giả mẫu Hộp số hành tinh bán chạy nhất sàn.'
  },
  {
    uid: 'usr-des-002',
    email: 'maianh.sculpt@gmail.com',
    displayName: 'Trần Mai Anh',
    role: 'designer',
    phone: '0945.666.222',
    company: 'Artisan Figure Studio',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    engineerRank: 'ZBrush 3D Sculptor',
    designerBio: 'Tạo hình nhân vật văn hóa dân gian Việt Nam, mô hình decor phong cách tối giản.',
    specialties: ['Figure 3D', 'Decor nội thất', 'Resin 8K', 'Văn hóa dân gian'],
    createdAt: '2026-08-10T14:20:00Z',
    lastLoginAt: '2026-09-03T20:10:00Z',
    kycStatus: 'pending',
    kycDocumentType: 'id_card',
    kycDocumentNumber: '038195004455',
    kycSubmittedAt: '2026-08-29T15:30:00Z',
    accountStatus: 'under_review',
    totalOrders: 18,
    totalRevenue: 8600000,
    bankAccount: {
      bankName: 'Techcombank',
      accountNumber: '19034567890123',
      accountHolder: 'TRAN MAI ANH'
    },
    notes: 'Đang đợi admin duyệt hồ sơ KYC & Portfolio trước khi cấp huy hiệu Verified Creator.'
  },
  {
    uid: 'usr-des-003',
    email: 'khai.arch@vcube.vn',
    displayName: 'Đỗ Quang Khải',
    role: 'designer',
    phone: '0983.123.987',
    company: 'Parametric Lab HN',
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    engineerRank: 'Rhino / Grasshopper Architect',
    designerBio: 'Thiết kế kiến trúc tham số và đèn trang trí lồng ghép ánh sáng.',
    specialties: ['Parametric Design', 'Đèn Decor', 'Kiến trúc'],
    createdAt: '2025-11-20T10:00:00Z',
    lastLoginAt: '2026-09-01T12:00:00Z',
    kycStatus: 'verified',
    kycDocumentType: 'id_card',
    kycDocumentNumber: '025091002233',
    kycSubmittedAt: '2025-11-21T09:00:00Z',
    kycVerifiedAt: '2025-11-22T11:00:00Z',
    accountStatus: 'active',
    totalOrders: 86,
    totalRevenue: 25600000,
    bankAccount: {
      bankName: 'ACB',
      accountNumber: '284729101',
      accountHolder: 'DO QUANG KHAI'
    }
  },

  // 3. Xưởng in đối tác (Print Farms / MES / Labs)
  {
    uid: 'usr-lab-001',
    email: 'hanoi.hub@vcube.vn',
    displayName: 'Kỹ sư Vũ Mạnh Cường (MES Hà Nội)',
    role: 'lab',
    phone: '0981.234.567',
    company: 'VCUBE R&D & MES Farm Hà Nội',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    engineerRank: 'Xưởng Trưởng MES Miền Bắc',
    createdAt: '2025-05-10T08:00:00Z',
    lastLoginAt: '2026-09-04T06:00:00Z',
    kycStatus: 'verified',
    kycDocumentType: 'business_license',
    kycDocumentNumber: '0109928410',
    kycSubmittedAt: '2025-05-11T09:00:00Z',
    kycVerifiedAt: '2025-05-12T14:00:00Z',
    accountStatus: 'active',
    workshopPartnerId: 'ws-hanoi-hub',
    totalOrders: 1240,
    totalRevenue: 385000000,
    bankAccount: {
      bankName: 'VietinBank',
      accountNumber: '110002849102',
      accountHolder: 'XUONG CHE TAC 3D VCUBE HANOI'
    },
    notes: 'Quy mô 16 máy FDM/SLA, phụ trách toàn bộ đơn hàng khu vực phía Bắc.'
  },
  {
    uid: 'usr-lab-002',
    email: 'hcm.hub@vcube.vn',
    displayName: 'Trần Đình Phong (Mega MES SHTP HCM)',
    role: 'lab',
    phone: '0912.456.789',
    company: 'VCUBE Smart MES Hub TP. Hồ Chí Minh',
    avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80',
    engineerRank: 'Giám Đốc Vận Hành Cụm SHTP',
    createdAt: '2025-04-15T08:00:00Z',
    lastLoginAt: '2026-09-04T06:15:00Z',
    kycStatus: 'verified',
    kycDocumentType: 'business_license',
    kycDocumentNumber: '0318924011',
    kycSubmittedAt: '2025-04-16T10:00:00Z',
    kycVerifiedAt: '2025-04-17T11:00:00Z',
    accountStatus: 'active',
    workshopPartnerId: 'ws-hcm-mega',
    totalOrders: 2890,
    totalRevenue: 920000000,
    bankAccount: {
      bankName: 'BIDV',
      accountNumber: '31410002948192',
      accountHolder: 'CONG TY TNHH VCUBE INDUSTRIAL SHTP'
    },
    notes: 'Trung tâm gia công lớn nhất hệ thống với 28 máy FDM/SLA/SLS công nghiệp.'
  },
  {
    uid: 'usr-lab-003',
    email: 'danang.hub@vcube.vn',
    displayName: 'Kỹ sư Nguyễn Lê Hoàng (MES Đà Nẵng)',
    role: 'lab',
    phone: '0905.888.999',
    company: 'VCUBE Innovation Hub Đà Nẵng',
    avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
    engineerRank: 'Điều Phối Viên MES Miền Trung',
    createdAt: '2025-09-01T08:00:00Z',
    lastLoginAt: '2026-09-03T18:00:00Z',
    kycStatus: 'pending',
    kycDocumentType: 'business_license',
    kycDocumentNumber: '0402849102',
    kycSubmittedAt: '2026-08-25T11:00:00Z',
    accountStatus: 'under_review',
    workshopPartnerId: 'ws-danang-lab',
    totalOrders: 560,
    totalRevenue: 148000000,
    bankAccount: {
      bankName: 'Techcombank',
      accountNumber: '19139482910291',
      accountHolder: 'NGUYEN LE HOANG'
    },
    notes: 'Đang bổ sung kiểm định phòng cháy chữa cháy và hồ sơ 4 máy in mới.'
  },

  // 4. Quản trị viên (Admins / ForgeControl)
  {
    uid: 'usr-adm-001',
    email: 'admin.forge@vcube.vn',
    displayName: 'Kỹ Sư Trưởng Tuấn',
    role: 'admin',
    phone: '0909.001.002',
    company: 'VCUBE Headquarter Tech Team',
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    engineerRank: 'ForgeControl Master Architect',
    createdAt: '2025-01-01T00:00:00Z',
    lastLoginAt: '2026-09-04T06:30:00Z',
    kycStatus: 'verified',
    accountStatus: 'active',
    notes: 'Toàn quyền điều hành cấu hình hệ thống, thuật toán định giá và phân quyền.'
  },
  {
    uid: 'usr-adm-002',
    email: 'ngoc.ops@vcube.vn',
    displayName: 'Phạm Bích Ngọc (Admin Vận Hành)',
    role: 'admin',
    phone: '0915.222.333',
    company: 'VCUBE Marketplace Operations',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    engineerRank: 'Operations Specialist & KYC Manager',
    createdAt: '2025-03-15T08:00:00Z',
    lastLoginAt: '2026-09-04T06:10:00Z',
    kycStatus: 'verified',
    accountStatus: 'active',
    notes: 'Chuyên viên kiểm duyệt hồ sơ KYC, xử lý khiếu nại tranh chấp và đối soát ví Escrow.'
  }
];

export const MOCK_FINANCIAL_SPLITS: OrderFinancialSplit[] = [
  {
    orderId: 'ORD-2026-8801',
    orderNumber: 'VC-8801',
    grossAmount: 3850000,
    paymentGatewayFee: 77000, // 2%
    creatorRoyalty: 269500,   // 7%
    workshopPayout: 2890000,  // BOM + Machine + Labor
    platformTakeRate: 613500, // Margin sàn
    escrowStatus: 'holding',
    escrowReleaseDate: '2026-09-11T00:00:00Z'
  },
  {
    orderId: 'ORD-2026-8802',
    orderNumber: 'VC-8802',
    grossAmount: 850000,
    paymentGatewayFee: 17000, // 2%
    creatorRoyalty: 59500,
    workshopPayout: 612000,
    platformTakeRate: 161500,
    escrowStatus: 'holding',
    escrowReleaseDate: '2026-09-10T00:00:00Z'
  },
  {
    orderId: 'ORD-2026-8799',
    orderNumber: 'VC-8799',
    grossAmount: 14500000,
    paymentGatewayFee: 290000, // 2%
    creatorRoyalty: 1015000,
    workshopPayout: 10875000,
    platformTakeRate: 2320000,
    escrowStatus: 'released',
    escrowReleaseDate: '2026-09-02T00:00:00Z'
  },
  {
    orderId: 'ORD-2026-8795',
    orderNumber: 'VC-8795',
    grossAmount: 1200000,
    paymentGatewayFee: 24000,
    creatorRoyalty: 84000,
    workshopPayout: 880000,
    platformTakeRate: 212000,
    escrowStatus: 'disputed',
    escrowReleaseDate: '2026-09-08T00:00:00Z'
  }
];

