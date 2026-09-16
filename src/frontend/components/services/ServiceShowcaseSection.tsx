import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Button, Card, Icon, Modal } from '@frontend/ui';
import { ThreeModelViewer } from '../ThreeModelViewer';
import { useLanguage } from '../../context/LanguageContext';

export interface ServiceItem {
  id: 'rapid_print' | 'custom_idea' | 'cad_catalog' | 'qc_advisory';
  nameVi: string;
  nameEn: string;
  badgeVi: string;
  badgeEn: string;
  shortDescVi: string;
  shortDescEn: string;
  fullDescVi: string;
  fullDescEn: string;
  modelType: 'gear' | 'drone' | 'box' | 'arch';
  color: string;
  iconName: string;
  featuresVi: string[];
  featuresEn: string[];
  specsVi: { label: string; value: string }[];
  specsEn: { label: string; value: string }[];
  ctaLabelVi: string;
  ctaLabelEn: string;
  actionType: 'quote' | 'custom_idea' | 'catalog' | 'support';
}

const SERVICES: ServiceItem[] = [
  {
    id: 'rapid_print',
    nameVi: 'Gia Công In 3D Công Nghiệp Tức Thì',
    nameEn: 'Rapid Industrial 3D Printing Service',
    badgeVi: 'ON-DEMAND MANUFACTURING',
    badgeEn: 'ON-DEMAND MANUFACTURING',
    shortDescVi: 'Tải file CAD, cắt lớp tự động và gia công chuẩn xác với công nghệ FDM, Resin và SLS chuyên nghiệp.',
    shortDescEn: 'Upload CAD files, slice automatically and manufacture with industrial-grade FDM, Resin & SLS.',
    fullDescVi: 'VCUBE kết nối hệ thống máy in 3D công nghiệp đa kích cỡ và vật liệu kỹ thuật cao. Hệ thống tự động phân tích lưới 3D STL/STEP, tính toán thể tích và đề xuất phương án gia công tối ưu chi phí và độ bền.',
    fullDescEn: 'VCUBE connects multi-capacity industrial 3D printing systems with high-performance engineering filaments and resins. Automatic mesh analysis calculates volume, wall thickness, and optimal production paths.',
    modelType: 'gear',
    color: '#00687A',
    iconName: 'precision_manufacturing',
    featuresVi: [
      'Hỗ trợ FDM, SLA Resin & SLS kỹ thuật',
      'Độ phân giải lớp in sắc nét theo yêu cầu',
      'Mô phỏng chi phí trực tiếp trên giao diện',
      'Vật liệu đa dạng: PLA, PETG, ABS, PA-CF'
    ],
    featuresEn: [
      'Supports FDM, SLA Resin & SLS technology',
      'Adaptive layer resolution tailored to specs',
      'Instant live quotation & slicing preview',
      'Filaments: PLA, PETG, ABS, PA-CF & more'
    ],
    specsVi: [
      { label: 'Dung sai tham chiếu', value: '±0.10 mm' },
      { label: 'Kích thước in tối đa', value: '450 × 450 × 450 mm' },
      { label: 'Thời gian hoàn thành', value: 'Từ 24h - 48h' },
      { label: 'Kiểm soát chất lượng', value: '100% kiểm tra trước xuất xưởng' }
    ],
    specsEn: [
      { label: 'Reference Tolerance', value: '±0.10 mm' },
      { label: 'Max Build Volume', value: '450 × 450 × 450 mm' },
      { label: 'Standard Lead Time', value: '24h - 48h' },
      { label: 'Quality Assurance', value: '100% Pre-dispatch Inspection' }
    ],
    ctaLabelVi: 'Báo Giá File 3D Của Bạn',
    ctaLabelEn: 'Quote Your 3D File',
    actionType: 'quote'
  },
  {
    id: 'custom_idea',
    nameVi: 'Thiết Kế CAD 3D & Hiện Thực Ý Tưởng',
    nameEn: 'Custom 3D CAD & Idea Engineering',
    badgeVi: 'CONCEPT TO PROTOTYPE',
    badgeEn: 'CONCEPT TO PROTOTYPE',
    shortDescVi: 'Bạn chỉ có ý tưởng hoặc bản vẽ phác thảo? Đội ngũ kỹ sư VCUBE sẽ dựng mô hình 3D và gia công mẫu thực tế.',
    shortDescEn: 'Have an idea or sketch? VCUBE engineering team creates parametric 3D CAD models and physical prototypes.',
    fullDescVi: 'Dịch vụ biến ý tưởng kinh doanh, phụ tùng thay thế hoặc mô hình tùy chỉnh thành bản vẽ CAD 3D chuẩn kỹ thuật cơ khí. Bao gồm tư vấn kết cấu chịu lực, tối ưu khả năng in 3D (DFAM) và cung cấp file số gốc.',
    fullDescEn: 'Turn product ideas, replacement parts or bespoke mechanisms into production-ready 3D CAD models. Includes structural engineering, Design for Additive Manufacturing (DFAM), and native file export.',
    modelType: 'drone',
    color: '#57DFFE',
    iconName: 'design_services',
    featuresVi: [
      'Dựng hình theo phác thảo 2D hoặc mô tả công năng',
      'Được hiệu chỉnh mô hình trước khi in',
      'Bàn giao đầy đủ file STEP, STL, OBJ',
      'In mẫu thử nghiệm (prototyping) xác minh khớp nối'
    ],
    featuresEn: [
      'CAD modeling from 2D sketches or functional criteria',
      'Revision rounds prior to fabrication',
      'Native CAD handoff: STEP, STL, OBJ formats',
      'Rapid prototype validation for mechanical fits'
    ],
    specsVi: [
      { label: 'Phần mềm sử dụng', value: 'SolidWorks, Inventor, Fusion' },
      { label: 'Hỗ trợ phác thảo', value: 'Ảnh chụp, file tay, mẫu vỡ' },
      { label: 'Quy trình', value: '3 bước chuẩn hóa' },
      { label: 'Bảo mật ý tưởng', value: 'Cam kết NDA bảo mật thiết kế' }
    ],
    specsEn: [
      { label: 'CAD Software', value: 'SolidWorks, Inventor, Fusion' },
      { label: 'Input Formats', value: 'Sketches, physical samples, photos' },
      { label: 'Process', value: '3-stage structured workflow' },
      { label: 'IP Protection', value: 'Strict Non-Disclosure Agreement' }
    ],
    ctaLabelVi: 'Đăng Ký Dịch Vụ Từ Ý Tưởng',
    ctaLabelEn: 'Submit Custom 3D Idea',
    actionType: 'custom_idea'
  },
  {
    id: 'cad_catalog',
    nameVi: 'Kho Bản Vẽ Kỹ Thuật Đạt Chuẩn',
    nameEn: 'Certified Engineering 3D Catalog',
    badgeVi: 'VERIFIED CAD ASSETS',
    badgeEn: 'VERIFIED CAD ASSETS',
    shortDescVi: 'Thư viện bản vẽ cơ khí, đồ gá, vỏ IoT và phụ tùng thay thế được kiểm duyệt kỹ lưỡng về hình học và độ khớp.',
    shortDescEn: 'Verified mechanical library: jigs, fixtures, IoT cases and spare parts verified for geometric integrity.',
    fullDescVi: 'Hệ sinh thái bản vẽ 3D được thiết kế bởi cộng đồng kỹ sư và nhà thiết kế được xác minh. Khách hàng có thể mua bản quyền file số gốc hoặc đặt in trực tiếp chỉ với 1 cú nhấp chuột.',
    fullDescEn: 'Ecosystem of premium 3D engineering designs crafted by verified industrial designers. Purchase original digital CAD files or order physical prints with a single click.',
    modelType: 'box',
    color: '#15803D',
    iconName: 'inventory_2',
    featuresVi: [
      '100% bản vẽ được kiểm định tính khép kín (manifold)',
      'Tải tức thì file STL & STEP bản quyền',
      'Minh bạch thông số kích thước, khối lượng và giờ in',
      'Bảo vệ quyền tác giả cho kỹ sư thiết kế'
    ],
    featuresEn: [
      '100% manifold mesh integrity guaranteed',
      'Instant download of licensed STL & STEP files',
      'Transparent dimensions, weight & print times',
      'Author copyright & royalty protection'
    ],
    specsVi: [
      { label: 'Định dạng file', value: 'STL, STEP, 3MF' },
      { label: 'Kiểm duyệt mô hình', value: 'Thuật toán quét lưới tự động' },
      { label: 'Cập nhật', value: 'Liên tục từ cộng đồng kỹ sư' },
      { label: 'Tùy biến', value: 'Hỗ trợ khắc tên & điều chỉnh kích thước' }
    ],
    specsEn: [
      { label: 'File Formats', value: 'STL, STEP, 3MF' },
      { label: 'Quality Verification', value: 'Automated mesh geometry check' },
      { label: 'Updates', value: 'Continuous community contributions' },
      { label: 'Customization', value: 'Engraving & parametric resizing' }
    ],
    ctaLabelVi: 'Khám Phá Toàn Bộ Kho Bản Vẽ',
    ctaLabelEn: 'Browse Full CAD Catalog',
    actionType: 'catalog'
  },
  {
    id: 'qc_advisory',
    nameVi: 'Đo Kiểm Dung Sai & Tư Vấn Kỹ Thuật',
    nameEn: 'Metrology QC & Technical Advisory',
    badgeVi: 'TOLERANCE & METROLOGY',
    badgeEn: 'TOLERANCE & METROLOGY',
    shortDescVi: 'Đo kiểm độ chính xác chi tiết in, kiểm tra ứng suất cơ tính và tư vấn giải pháp vật liệu cho môi trường khắc nghiệt.',
    shortDescEn: 'Dimensional accuracy measurement, mechanical stress analysis and material advisory for harsh environments.',
    fullDescVi: 'Dành cho các ứng dụng cơ khí chính xác đòi hỏi khả năng chịu nhiệt, kháng dầu mỡ hoặc tải trọng cao. Đội ngũ VCUBE đo kiểm mẫu in bằng thước cặp điện tử và máy quét quang học 3D để đảm bảo đúng dung sai bản vẽ.',
    fullDescEn: 'Tailored for precision applications requiring thermal stability, chemical resistance, or load-bearing strength. VCUBE verifies parts using digital metrology calipers and 3D optical scanning.',
    modelType: 'arch',
    color: '#B45309',
    iconName: 'verified',
    featuresVi: [
      'Đo kiểm kích thước dung sai theo yêu cầu kỹ thuật',
      'Tư vấn vật liệu chịu nhiệt cao (ABS, PA-CF, PEEK)',
      'Phân tích hướng in (print orientation) tối ưu cơ tính',
      'Báo cáo đo kiểm đi kèm kiện hàng'
    ],
    featuresEn: [
      'Dimensional tolerance inspection per engineering specs',
      'High-temp material consultation (ABS, PA-CF, PEEK)',
      'Optimal print orientation analysis for strength',
      'Inspection reports included with production runs'
    ],
    specsVi: [
      { label: 'Dụng cụ đo kiểm', value: 'Thước cặp điện tử & Máy quét quang học' },
      { label: 'Nhiệt độ chịu đựng', value: 'Đến 155°C với vật liệu chuyên dụng' },
      { label: 'Tư vấn kỹ thuật', value: 'Hỗ trợ 1:1 bởi kỹ sư xưởng' },
      { label: 'Bảo hành chất lượng', value: 'In lại miễn phí nếu sai dung sai cam kết' }
    ],
    specsEn: [
      { label: 'Metrology Tools', value: 'Digital Calipers & Optical Scanner' },
      { label: 'Heat Deflection', value: 'Up to 155°C with specialty polymers' },
      { label: 'Advisory', value: '1-on-1 engineer consultation' },
      { label: 'Quality Guarantee', value: 'Free re-print if tolerance breached' }
    ],
    ctaLabelVi: 'Xem Bảng So Sánh Vật Liệu',
    ctaLabelEn: 'View Material Matrix',
    actionType: 'support'
  }
];

interface ServiceShowcaseSectionProps {
  onNavigate: (view: string) => void;
  onOpenCustomIdeaModal: () => void;
}

export const ServiceShowcaseSection: React.FC<ServiceShowcaseSectionProps> = ({
  onNavigate,
  onOpenCustomIdeaModal
}) => {
  const { language } = useLanguage();
  const isVi = language === 'vi';

  const [selectedServiceId, setSelectedServiceId] = useState<string>('rapid_print');
  const [modalService, setModalService] = useState<ServiceItem | null>(null);

  // 3D Viewer live controls state
  const [wireframe, setWireframe] = useState<boolean>(false);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [viewerColor, setViewerColor] = useState<string>('#00687A');

  const activeService = SERVICES.find((s) => s.id === selectedServiceId) || SERVICES[0];

  const handleSelectService = (service: ServiceItem) => {
    setSelectedServiceId(service.id);
    setViewerColor(service.color);
  };

  const handleExecuteAction = (actionType: ServiceItem['actionType']) => {
    if (actionType === 'quote') {
      onNavigate('quote');
    } else if (actionType === 'custom_idea') {
      onOpenCustomIdeaModal();
    } else if (actionType === 'catalog') {
      onNavigate('explore');
    } else if (actionType === 'support') {
      const el = document.getElementById('material-comparison-matrix');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      } else {
        onNavigate('explore');
      }
    }
  };

  return (
    <section className="py-20 sm:py-24 bg-surface px-4 sm:px-6 md:px-12 border-b border-line">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-line">
          <div className="max-w-3xl space-y-2">
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary block font-bold">
              {isVi ? 'HỆ SINH THÁI DỊCH VỤ // VCUBE ENGINEERING SERVICES' : 'CORE SERVICES // VCUBE ENGINEERING'}
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-fg tracking-tight">
              {isVi ? 'Giải Pháp Gia Công & Thiết Kế 3D Chuẩn Công Nghiệp' : 'Industrial 3D Printing & Engineering Solutions'}
            </h2>
            <p className="text-sm sm:text-base text-fg-muted leading-relaxed">
              {isVi
                ? 'VCUBE kết hợp công nghệ in 3D hiện đại với dịch vụ kỹ thuật chuyên sâu: từ chế tác theo file CAD, hiện thực hóa ý tưởng đến kiểm định đo lường chuẩn xác.'
                : 'VCUBE integrates cutting-edge additive manufacturing with precision engineering: from instant CAD file quoting to custom idea prototyping and metrology inspection.'}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onNavigate('quote')}
              leadingIcon={<Icon name="upload_file" size={16} className="text-primary" />}
            >
              <span>{isVi ? 'Báo Giá Trực Tiếp' : 'Instant Slicer Quote'}</span>
            </Button>
            <Button
              size="sm"
              onClick={onOpenCustomIdeaModal}
              leadingIcon={<Icon name="design_services" size={16} />}
            >
              <span>{isVi ? 'Gửi Ý Tưởng Mới' : 'Submit Concept'}</span>
            </Button>
          </div>
        </div>

        {/* Dual Column Showcase: Interactive Cards Left + 3D Interactive Stage Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: 4 Interactive Service Cards (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {SERVICES.map((service, idx) => {
                const isSelected = service.id === selectedServiceId;
                return (
                  <motion.div
                    key={service.id}
                    whileHover={{ y: -3 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Card
                      padding="md"
                      className={`relative flex flex-col justify-between h-full transition-all duration-200 cursor-pointer text-left ${
                        isSelected
                          ? 'border-primary shadow-e2 bg-primary-tint/20 ring-1 ring-primary/40'
                          : 'hover:border-line-control hover:shadow-e1 bg-surface'
                      }`}
                      onClick={() => handleSelectService(service)}
                    >
                      {/* Top serial badge and icon */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-mono text-xs font-bold text-fg-muted px-2 py-0.5 rounded bg-surface-muted border border-line-subtle tabular-nums">
                            0{idx + 1}
                          </span>
                          <span
                            className={`p-2 rounded-md border transition-colors ${
                              isSelected
                                ? 'bg-primary text-primary-fg border-primary'
                                : 'bg-surface-muted text-primary border-line-subtle'
                            }`}
                          >
                            <Icon name={service.iconName} size={20} />
                          </span>
                        </div>

                        {/* Title & Badge */}
                        <div className="space-y-1">
                          <span className="font-mono text-xs uppercase tracking-wider text-primary font-bold block">
                            {isVi ? service.badgeVi : service.badgeEn}
                          </span>
                          <h3 className="font-bold text-base text-fg leading-snug">
                            {isVi ? service.nameVi : service.nameEn}
                          </h3>
                        </div>

                        <p className="text-xs text-fg-muted mt-2 line-clamp-2 leading-relaxed">
                          {isVi ? service.shortDescVi : service.shortDescEn}
                        </p>
                      </div>

                      {/* Card Footer: Quick Actions & Popup Trigger */}
                      <div className="pt-4 mt-4 border-t border-line-subtle flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setModalService(service);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-hover hover:underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                        >
                          <Icon name="info" size={14} />
                          <span>{isVi ? 'Chi tiết dịch vụ' : 'View specs'}</span>
                        </button>

                        <Button
                          size="sm"
                          variant={isSelected ? 'primary' : 'secondary'}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExecuteAction(service.actionType);
                          }}
                          leadingIcon={<Icon name="arrow_forward" size={14} />}
                        >
                          <span>{isVi ? 'Bắt đầu' : 'Start'}</span>
                        </Button>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>

            {/* Quick Helper Banner */}
            <div className="p-4 rounded-lg bg-surface-muted border border-line-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Icon name="support_agent" size={18} />
                </div>
                <div>
                  <span className="text-xs font-bold text-fg block">
                    {isVi ? 'Bạn cần tư vấn giải pháp kỹ thuật riêng?' : 'Need a custom engineering consultation?'}
                  </span>
                  <span className="text-xs text-fg-muted">
                    {isVi
                      ? 'Đội ngũ kỹ sư VCUBE sẵn sàng phân tích dung sai và báo giá gia công theo yêu cầu.'
                      : 'VCUBE engineers evaluate tolerance, assembly fit and material compatibility.'}
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-primary shrink-0 self-end sm:self-auto"
                onClick={onOpenCustomIdeaModal}
                trailingIcon={<Icon name="arrow_forward" size={14} />}
              >
                <span>{isVi ? 'Nhận tư vấn 1:1' : '1:1 Advisory'}</span>
              </Button>
            </div>
          </div>

          {/* Right: Live Interactive 3D Model Stage (5 cols) */}
          <div className="lg:col-span-5">
            <Card padding="none" className="overflow-hidden border-line shadow-e2 bg-surface">
              {/* 3D Header Bar */}
              <div className="p-3.5 bg-surface border-b border-line flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-positive animate-pulse" />
                  <span className="font-mono text-xs font-bold text-fg uppercase tracking-wider">
                    {isVi ? 'Mô Phỏng 3D // ' : 'LIVE 3D MESH // '}
                    <span className="text-primary">{activeService.modelType.toUpperCase()}</span>
                  </span>
                </div>

                <div className="flex items-center gap-1 text-xs font-mono text-fg-muted">
                  <span className="px-2 py-0.5 rounded bg-surface-muted border border-line-subtle">
                    {isVi ? activeService.badgeVi : activeService.badgeEn}
                  </span>
                </div>
              </div>

              {/* 3D Canvas Viewport */}
              <div className="relative bg-surface-inverse aspect-4/3 sm:aspect-square md:aspect-4/3 w-full">
                <ThreeModelViewer
                  modelType={activeService.modelType}
                  color={viewerColor}
                  wireframe={wireframe}
                  autoRotate={autoRotate}
                  showGrid={true}
                  className="w-full h-full"
                />

                {/* Floating Top Controls Pill */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
                  <span className="font-mono text-xs text-on-inverse/80 px-2 py-1 rounded bg-surface-inverse/80 backdrop-blur-sm border border-line/30 shadow-sm">
                    {isVi ? 'Kéo chuột để xoay 360°' : 'Drag to orbit 360°'}
                  </span>

                  {/* Wireframe & Auto-rotate triggers */}
                  <div className="pointer-events-auto flex items-center gap-1.5 bg-surface-inverse/80 backdrop-blur-sm p-1 rounded-md border border-line/30">
                    <button
                      type="button"
                      onClick={() => setWireframe(!wireframe)}
                      title={wireframe ? 'Tắt khung dây' : 'Bật khung dây (Wireframe)'}
                      className={`p-1.5 rounded transition-colors cursor-pointer text-xs font-mono ${
                        wireframe
                          ? 'bg-primary text-primary-fg font-bold'
                          : 'text-on-inverse/70 hover:text-on-inverse hover:bg-surface-inverse-raised'
                      }`}
                    >
                      <Icon name="grid_3x3" size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setAutoRotate(!autoRotate)}
                      title={autoRotate ? 'Dừng tự xoay' : 'Bật tự xoay'}
                      className={`p-1.5 rounded transition-colors cursor-pointer text-xs font-mono ${
                        autoRotate
                          ? 'bg-primary text-primary-fg font-bold'
                          : 'text-on-inverse/70 hover:text-on-inverse hover:bg-surface-inverse-raised'
                      }`}
                    >
                      <Icon name="sync" size={14} className={autoRotate ? 'animate-spin' : ''} />
                    </button>
                  </div>
                </div>

                {/* Floating Color Palette */}
                <div className="absolute bottom-3 left-3 pointer-events-auto flex items-center gap-1.5 bg-surface-inverse/80 backdrop-blur-sm px-2 py-1 rounded-md border border-line/30">
                  <span className="text-xs font-mono text-on-inverse/60 mr-1">
                    {isVi ? 'Màu:' : 'Color:'}
                  </span>
                  {['#00687A', '#57DFFE', '#15803D', '#B45309', '#B91C1C'].map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => setViewerColor(hex)}
                      className={`w-4 h-4 rounded-full transition-transform cursor-pointer border ${
                        viewerColor === hex ? 'scale-125 border-white ring-1 ring-primary' : 'border-line/40 hover:scale-110'
                      }`}
                      style={{ backgroundColor: hex }}
                      aria-label={`Chọn màu ${hex}`}
                    />
                  ))}
                </div>
              </div>

              {/* 3D Footer Panel */}
              <div className="p-4 bg-surface border-t border-line space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-fg-muted">
                    {isVi ? 'Đang mô phỏng mô hình:' : 'Simulated Model:'}
                  </span>
                  <span className="font-bold text-fg">
                    {isVi ? activeService.nameVi : activeService.nameEn}
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => handleExecuteAction(activeService.actionType)}
                    trailingIcon={<Icon name="arrow_forward" size={16} />}
                  >
                    <span>{isVi ? activeService.ctaLabelVi : activeService.ctaLabelEn}</span>
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setModalService(activeService)}
                    leadingIcon={<Icon name="visibility" size={16} className="text-primary" />}
                  >
                    <span>{isVi ? 'Chi Tiết' : 'Specs'}</span>
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Service Deep-Dive Popup Modal */}
      {modalService && (
        <Modal
          open={Boolean(modalService)}
          onClose={() => setModalService(null)}
          size="lg"
          title={
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-md bg-primary-tint text-primary border border-primary/20">
                <Icon name={modalService.iconName} size={20} />
              </span>
              <div>
                <h3 className="font-bold text-lg text-fg leading-tight">
                  {isVi ? modalService.nameVi : modalService.nameEn}
                </h3>
                <span className="font-mono text-xs text-primary font-semibold">
                  {isVi ? modalService.badgeVi : modalService.badgeEn}
                </span>
              </div>
            </div>
          }
          footer={
            <div className="flex items-center justify-between w-full">
              <Button variant="ghost" size="sm" onClick={() => setModalService(null)}>
                {isVi ? 'Đóng' : 'Close'}
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  const action = modalService.actionType;
                  setModalService(null);
                  handleExecuteAction(action);
                }}
                trailingIcon={<Icon name="arrow_forward" size={16} />}
              >
                <span>{isVi ? modalService.ctaLabelVi : modalService.ctaLabelEn}</span>
              </Button>
            </div>
          }
        >
          <div className="space-y-6">
            {/* Description */}
            <p className="text-sm text-fg-muted leading-relaxed">
              {isVi ? modalService.fullDescVi : modalService.fullDescEn}
            </p>

            {/* 3D Preview in Modal */}
            <div className="rounded-lg overflow-hidden border border-line bg-surface-inverse aspect-16/9 relative">
              <ThreeModelViewer
                modelType={modalService.modelType}
                color={modalService.color}
                wireframe={false}
                autoRotate={true}
                showGrid={true}
                className="w-full h-full"
              />
              <div className="absolute top-2.5 left-3 font-mono text-xs text-on-inverse/70 bg-surface-inverse/70 px-2 py-0.5 rounded border border-line/20">
                {isVi ? 'Mô hình minh họa dịch vụ (Xoay 360°)' : 'Service Interactive 3D Preview'}
              </div>
            </div>

            {/* Technical Specifications Grid */}
            <div>
              <h4 className="font-mono text-xs uppercase tracking-wider text-fg-muted font-bold mb-2.5">
                {isVi ? 'THÔNG SỐ KỸ THUẬT & CAM KẾT // TECHNICAL SPECIFICATIONS' : 'TECHNICAL SPECIFICATIONS & COMMITMENTS'}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 font-mono text-xs">
                {(isVi ? modalService.specsVi : modalService.specsEn).map((spec) => (
                  <div
                    key={spec.label}
                    className="p-2.5 rounded bg-surface-muted border border-line-subtle flex items-center justify-between"
                  >
                    <span className="text-fg-muted">{spec.label}:</span>
                    <span className="font-bold text-fg tabular-nums">{spec.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Feature Highlights */}
            <div>
              <h4 className="font-mono text-xs uppercase tracking-wider text-fg-muted font-bold mb-2.5">
                {isVi ? 'ĐẶC ĐIỂM NỔI BẬT // KEY CAPABILITIES' : 'KEY CAPABILITIES'}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {(isVi ? modalService.featuresVi : modalService.featuresEn).map((feat) => (
                  <div key={feat} className="flex items-start gap-2">
                    <span className="text-primary font-bold shrink-0">✓</span>
                    <span className="text-fg">{feat}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
};
