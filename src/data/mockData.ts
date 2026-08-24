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
  DMCAReport
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

export const MATERIALS_CATALOG = [
  {
    id: 'pla-tough',
    name: 'PLA Tough / PLA+',
    density: 1.24,
    strength: 'Cao',
    heatResistance: '55°C',
    flexibility: 'Thấp',
    pricePerGram: 850,
    unitPriceMultiplier: 1.0,
    colors: ['#1C1C1C', '#ffffff', '#00687a', '#ea580c', '#e2e8f0'],
    desc: 'Vật liệu phổ biến nhất, độ cứng tốt, chi tiết sắc nét, bề mặt láng mịn cho linh kiện kỹ thuật.',
    recommendedFor: 'Prototypes, đồ gá, vỏ hộp tiêu chuẩn'
  },
  {
    id: 'petg-pro',
    name: 'PETG Technical Pro',
    density: 1.27,
    strength: 'Rất cao',
    heatResistance: '75°C',
    flexibility: 'Trung bình',
    pricePerGram: 1150,
    unitPriceMultiplier: 1.25,
    colors: ['#1C1C1C', '#3b82f6', '#10b981', '#ffffff'],
    desc: 'Chống va đập mạnh, kháng hóa chất & tia UV nhẹ, chịu nhiệt tốt hơn PLA đáng kể.',
    recommendedFor: 'Linh kiện cơ khí ngoài trời, đồ gá chịu lực'
  },
  {
    id: 'abs-industrial',
    name: 'ABS Industrial Grade',
    density: 1.04,
    strength: 'Rất cao',
    heatResistance: '95°C',
    flexibility: 'Trung bình',
    pricePerGram: 1300,
    unitPriceMultiplier: 1.35,
    colors: ['#1C1C1C', '#64748b', '#ffffff'],
    desc: 'Độ bền cơ tính công nghiệp, dễ mài bóng bằng Acetone, chịu nhiệt độ cao trong buồng động cơ.',
    recommendedFor: 'Linh kiện ô tô, phụ tùng máy móc cơ khí'
  },
  {
    id: 'tpu-flex',
    name: 'TPU 95A Flexible',
    density: 1.21,
    strength: 'Đàn hồi cao',
    heatResistance: '60°C',
    flexibility: 'Rất dẻo',
    pricePerGram: 1600,
    unitPriceMultiplier: 1.5,
    colors: ['#1C1C1C', '#06b6d4', '#ea580c'],
    desc: 'Chất liệu cao su dẻo kỹ thuật, chống sốc, đàn hồi cực tốt và chống mài mòn cơ học.',
    recommendedFor: 'Đệm chống sốc, gioăng kín nước, bánh xe robot'
  },
  {
    id: 'resin-8k',
    name: 'Resin Engineering 8K (SLA)',
    density: 1.18,
    strength: 'Độ nét vi mô',
    heatResistance: '65°C',
    flexibility: 'Thấp',
    pricePerGram: 2200,
    unitPriceMultiplier: 1.85,
    colors: ['#64748b', '#00687a', '#ffffff'],
    desc: 'Công nghệ quang trùng hợp SLA/DLP, độ phân giải vi mô không thấy vân sọc từng lớp in.',
    recommendedFor: 'Khuôn đúc thu nhỏ, chi tiết kim hoàn, mô hình giải phẫu'
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

export const PRINTER_PROFILES: import('../types').PrinterProfile[] = [
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
    status: 'Idle'
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
    status: 'Idle'
  }
];

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
        extruderIndex: 1
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
        extruderIndex: 2
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
        extruderIndex: 3
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
        extruderIndex: 4
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
    tag: '3MF Chuẩn // Multi-Part & Multi-Material',
    status: 'Ready',
    modelType: 'gear',
    sha256Hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    isUnitConfirmed: true,
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
      estimatedPrintTimeFormatted: '2h 15m',
      estimatedPrintTimeSeconds: 8100,
      totalFilamentGrams: 78.4,
      totalFilamentMeters: 26.2,
      plateCount: 1,
      activePlateIndex: 1,
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

export const CUSTOM_REQUESTS: CustomDesignRequest[] = [];
export const PAYOUT_TRANSACTIONS: PayoutTransaction[] = [];
export const MODERATION_PRODUCTS: ModerationProductItem[] = [];
export const DESIGNER_APPLICATIONS: DesignerApplication[] = [];
export const DISPUTES_LIST: DisputeRecord[] = [];
export const DMCA_REPORTS: DMCAReport[] = [];

export const DEFAULT_SITE_CONTENT: import('../types').SiteContentConfig = {
  announcementText: '🇻🇳 ĐẠI LỄ 2/9: Giảm 20% toàn bộ file 3D & Miễn phí vận chuyển toàn quốc cho đơn từ 300.000đ • Báo giá tức thì trong 3s',
  announcementActive: true,
  heroHeadline: 'CHẾ TÁC & IN 3D CÔNG NGHIỆP CHÍNH XÁC',
  heroSubheadline: 'Nền tảng sản xuất bồi đắp và chế tác linh kiện cơ khí chính xác theo tiêu chuẩn công nghiệp ISO/ASTM 52900. Dung sai kiểm định ±0.05mm.',
  toleranceSpec: '±0.05mm (Mitutoyo Calibrated)',
  standardShippingFee: 25000,
  freeShippingThreshold: 300000,
  hotline: '1900 6833',
  contactEmail: 'contact@vcube.vn',
  hanoiWorkshopAddress: 'Xưởng In 3D VCUBE: Khu Công Nghệ Cao Hòa Lạc, Hà Nội',
  hcmWorkshopAddress: 'Chi Nhánh Nam: Khu Công Nghệ Cao TP. Thủ Đức, TP. Hồ Chí Minh'
};
