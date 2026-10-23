import React, { useMemo, useState } from 'react';
import { Button, Card, Icon, Modal } from '@frontend/ui';
import { readColorToken, type ColorTokenName } from '@frontend/theme/tokens';
import { ThreeModelViewer } from '../LazyThreeModelViewer';

/** Nhãn VI cho 4 mô hình minh hoạ của khung 3D (modelType chỉ là mã code, không render thô). */
const MODEL_LABEL_VI: Record<ServiceItem['modelType'], string> = {
  gear: 'BÁNH RĂNG',
  drone: 'CÁNH TAY DRONE',
  box: 'VỎ HỘP',
  arch: 'VÒM CHỊU LỰC',
};

/** Tone tile pastel v3 cho icon dịch vụ (class tĩnh để Tailwind phát ra utility). */
const SERVICE_TILE = ['bg-tile-mint', 'bg-tile-lilac', 'bg-tile-rose', 'bg-tile-amber'] as const;

/** Bảng màu chọn được cho khung xem 3D — tên token, KHÔNG hex cứng. */
const VIEWER_COLOR_TOKENS: ColorTokenName[] = ['primary', 'accent', 'positive', 'warning', 'danger'];

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
  colorToken: ColorTokenName;
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
    badgeVi: 'SẢN XUẤT THEO YÊU CẦU',
    badgeEn: 'ON-DEMAND MANUFACTURING',
    shortDescVi: 'Tải tệp CAD, cắt lớp tự động và gia công chuẩn xác với công nghệ FDM, Resin và SLS chuyên nghiệp.',
    shortDescEn: 'Upload CAD files, slice automatically and manufacture with industrial-grade FDM, Resin & SLS.',
    fullDescVi: 'VCUBE kết nối hệ thống máy in 3D công nghiệp đa kích cỡ và vật liệu kỹ thuật cao. Hệ thống tự động phân tích lưới 3D STL/STEP, tính toán thể tích và đề xuất phương án gia công tối ưu chi phí và độ bền.',
    fullDescEn: 'VCUBE connects multi-capacity industrial 3D printing systems with high-performance engineering filaments and resins. Automatic mesh analysis calculates volume, wall thickness, and optimal production paths.',
    modelType: 'gear',
    colorToken: 'primary',
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
      { label: 'Dung sai', value: 'Theo vật liệu & chi tiết — xác nhận khi báo giá' },
      { label: 'Kích thước in', value: 'Theo khổ bàn in của xưởng nhận đơn' },
      { label: 'Thời gian hoàn thành', value: 'Xưởng xác nhận theo từng đơn' },
      { label: 'Kiểm soát chất lượng', value: 'Quy trình QC theo từng xưởng' }
    ],
    specsEn: [
      { label: 'Tolerance', value: 'Depends on material & part — confirmed in the quote' },
      { label: 'Build volume', value: 'Depends on the assigned workshop’s printer' },
      { label: 'Lead time', value: 'Confirmed by the workshop per order' },
      { label: 'Quality assurance', value: 'QC process per workshop' }
    ],
    ctaLabelVi: 'Báo giá tệp 3D của bạn',
    ctaLabelEn: 'Quote Your 3D File',
    actionType: 'quote'
  },
  {
    id: 'custom_idea',
    nameVi: 'Thiết Kế CAD 3D & Hiện Thực Ý Tưởng',
    nameEn: 'Custom 3D CAD & Idea Engineering',
    badgeVi: 'TỪ Ý TƯỞNG ĐẾN MẪU',
    badgeEn: 'CONCEPT TO PROTOTYPE',
    shortDescVi: 'Bạn chỉ có ý tưởng hoặc bản vẽ phác thảo? Đội ngũ kỹ sư VCUBE sẽ dựng mô hình 3D và gia công mẫu thực tế.',
    shortDescEn: 'Have an idea or sketch? VCUBE engineering team creates parametric 3D CAD models and physical prototypes.',
    fullDescVi: 'Dịch vụ biến ý tưởng kinh doanh, phụ tùng thay thế hoặc mô hình tùy chỉnh thành bản vẽ CAD 3D chuẩn kỹ thuật cơ khí. Bao gồm tư vấn kết cấu chịu lực, tối ưu khả năng in 3D và cung cấp tệp số gốc.',
    fullDescEn: 'Turn product ideas, replacement parts or bespoke mechanisms into production-ready 3D CAD models. Includes structural engineering, Design for Additive Manufacturing (DFAM), and native file export.',
    modelType: 'drone',
    colorToken: 'accent',
    iconName: 'design_services',
    featuresVi: [
      'Dựng hình theo phác thảo 2D hoặc mô tả công năng',
      'Được hiệu chỉnh mô hình trước khi in',
      'Bàn giao đầy đủ tệp STEP, STL, OBJ',
      'In mẫu thử nghiệm xác minh khớp nối'
    ],
    featuresEn: [
      'CAD modeling from 2D sketches or functional criteria',
      'Revision rounds prior to fabrication',
      'Native CAD handoff: STEP, STL, OBJ formats',
      'Rapid prototype validation for mechanical fits'
    ],
    specsVi: [
      { label: 'Phần mềm sử dụng', value: 'SolidWorks, Inventor, Fusion' },
      { label: 'Hỗ trợ phác thảo', value: 'Ảnh chụp, bản vẽ tay, mẫu vỡ' },
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
    badgeVi: 'BẢN VẼ CAD ĐÃ KIỂM DUYỆT',
    badgeEn: 'VERIFIED CAD ASSETS',
    shortDescVi: 'Thư viện bản vẽ cơ khí, đồ gá, vỏ IoT và phụ tùng thay thế được kiểm duyệt kỹ lưỡng về hình học và độ khớp.',
    shortDescEn: 'Verified mechanical library: jigs, fixtures, IoT cases and spare parts verified for geometric integrity.',
    fullDescVi: 'Hệ sinh thái bản vẽ 3D được thiết kế bởi cộng đồng kỹ sư và nhà thiết kế được xác minh. Khách hàng có thể mua bản quyền tệp số gốc hoặc đặt in trực tiếp chỉ với 1 cú nhấp chuột.',
    fullDescEn: 'Ecosystem of premium 3D engineering designs crafted by verified industrial designers. Purchase original digital CAD files or order physical prints with a single click.',
    modelType: 'box',
    colorToken: 'positive',
    iconName: 'inventory_2',
    featuresVi: [
      'Kiểm tra tính khép kín của lưới khi đọc tệp',
      'Tải tức thì tệp STL & STEP bản quyền',
      'Minh bạch thông số kích thước, khối lượng và giờ in',
      'Bảo vệ quyền tác giả cho kỹ sư thiết kế'
    ],
    featuresEn: [
      'Mesh integrity checked when the file is read',
      'Instant download of licensed STL & STEP files',
      'Transparent dimensions, weight & print times',
      'Author copyright & royalty protection'
    ],
    specsVi: [
      { label: 'Định dạng tệp', value: 'STL, STEP, 3MF' },
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
    badgeVi: 'DUNG SAI & ĐO KIỂM',
    badgeEn: 'TOLERANCE & METROLOGY',
    shortDescVi: 'Đo kiểm độ chính xác chi tiết in, kiểm tra ứng suất cơ tính và tư vấn giải pháp vật liệu cho môi trường khắc nghiệt.',
    shortDescEn: 'Dimensional accuracy measurement, mechanical stress analysis and material advisory for harsh environments.',
    fullDescVi: 'Dành cho các ứng dụng cơ khí chính xác đòi hỏi khả năng chịu nhiệt, kháng dầu mỡ hoặc tải trọng cao. Đội ngũ VCUBE đo kiểm mẫu in bằng thước cặp điện tử và máy quét quang học 3D để đảm bảo đúng dung sai bản vẽ.',
    fullDescEn: 'Tailored for precision applications requiring thermal stability, chemical resistance, or load-bearing strength. VCUBE verifies parts using digital metrology calipers and 3D optical scanning.',
    modelType: 'arch',
    colorToken: 'warning',
    iconName: 'verified',
    featuresVi: [
      'Đo kiểm kích thước dung sai theo yêu cầu kỹ thuật',
      'Tư vấn vật liệu chịu nhiệt cao (ABS, PA-CF, PEEK)',
      'Phân tích hướng in tối ưu cơ tính',
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
      { label: 'Nhiệt độ chịu đựng', value: 'Theo vật liệu đã chọn (tra bảng vật liệu)' },
      { label: 'Tư vấn kỹ thuật', value: 'Hỗ trợ 1:1 bởi kỹ sư xưởng' },
      { label: 'Bảo hành', value: 'Theo chính sách của xưởng nhận đơn' }
    ],
    specsEn: [
      { label: 'Metrology Tools', value: 'Digital Calipers & Optical Scanner' },
      { label: 'Heat deflection', value: 'Depends on the selected material (see catalog)' },
      { label: 'Advisory', value: '1-on-1 engineer consultation' },
      { label: 'Warranty', value: 'Per the assigned workshop’s policy' }
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

  const [selectedServiceId, setSelectedServiceId] = useState<string>('rapid_print');
  const [modalService, setModalService] = useState<ServiceItem | null>(null);

  // Light-only token lookup cho màu vẽ trong Three.js (không dùng hex cứng).
  const colorOf = useMemo(() => (token: ColorTokenName) => readColorToken(token), []);

  // 3D Viewer live controls state
  const [wireframe, setWireframe] = useState<boolean>(false);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [viewerColorToken, setViewerColorToken] = useState<ColorTokenName>('primary');

  const activeService = SERVICES.find((s) => s.id === selectedServiceId) || SERVICES[0];

  const handleSelectService = (service: ServiceItem) => {
    setSelectedServiceId(service.id);
    setViewerColorToken(service.colorToken);
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
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-fg-muted block">
              HỆ SINH THÁI DỊCH VỤ VCUBE
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-fg tracking-tight">
              {'Giải Pháp Gia Công & Thiết Kế 3D Chuẩn Công Nghiệp'}
            </h2>
            <p className="text-sm sm:text-base text-fg-muted leading-relaxed">
              VCUBE kết hợp công nghệ in 3D hiện đại với dịch vụ kỹ thuật chuyên sâu: từ chế tác theo tệp CAD, hiện thực hóa ý tưởng đến kiểm định đo lường chuẩn xác.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onNavigate('quote')}
              leadingIcon={<Icon name="upload_file" size={16} className="text-primary" />}
            >
              <span>Báo Giá Trực Tiếp</span>
            </Button>
            <Button
              size="sm"
              onClick={onOpenCustomIdeaModal}
              leadingIcon={<Icon name="design_services" size={16} />}
            >
              <span>Gửi Ý Tưởng Mới</span>
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
                  <div
                    key={service.id}
                    className="h-full motion-reduce:transition-none"
                  >
                    <Card
                      variant="soft"
                      padding="md"
                      className={`relative flex h-full flex-col justify-between text-left transition-shadow duration-300 motion-reduce:transition-none cursor-pointer ${
                        isSelected ? 'shadow-e2 ring-2 ring-primary' : 'hover:shadow-e2'
                      }`}
                      onClick={() => handleSelectService(service)}
                    >
                      {/* Top serial badge and icon — tile pastel v3 (§1.5) */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-mono text-xs font-bold text-fg-muted px-2 py-0.5 rounded-sm bg-surface-muted tabular-nums">
                            0{idx + 1}
                          </span>
                          <span
                            className={`grid size-11 place-items-center rounded-md transition-colors ${
                              isSelected
                                ? 'bg-primary text-primary-fg'
                                : `${SERVICE_TILE[idx % SERVICE_TILE.length]} text-fg`
                            }`}
                          >
                            <Icon name={service.iconName} size={22} aria-hidden="true" />
                          </span>
                        </div>

                        {/* Title & Badge */}
                        <div className="space-y-1">
                          <span className="font-mono text-xs uppercase tracking-wider text-fg-muted font-bold block">
                            {service.badgeVi}
                          </span>
                          <h3 className="font-bold text-base text-fg leading-snug">
                            {service.nameVi}
                          </h3>
                        </div>

                        <p className="text-xs text-fg-muted mt-2 line-clamp-2 leading-relaxed">
                          {service.shortDescVi}
                        </p>
                      </div>

                      {/* Card Footer: Quick Actions & Popup Trigger */}
                      <div className="pt-4 mt-4 border-t border-line-subtle flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Chọn dịch vụ trước khi mở popup: bàn phím cũng đổi được khung 3D
                            // (card onClick chỉ dùng được bằng chuột).
                            handleSelectService(service);
                            setModalService(service);
                          }}
                          className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-fg hover:text-primary hover:underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                        >
                          <Icon name="info" size={14} aria-hidden="true" />
                          <span>Chi tiết dịch vụ</span>
                        </button>

                        <Button
                          size="sm"
                          variant={isSelected ? 'primary' : 'secondary'}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectService(service);
                            handleExecuteAction(service.actionType);
                          }}
                          leadingIcon={<Icon name="arrow_forward" size={14} />}
                        >
                          <span>Bắt đầu</span>
                        </Button>
                      </div>
                    </Card>
                  </div>
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
                    Bạn cần tư vấn giải pháp kỹ thuật riêng?
                  </span>
                  <span className="text-xs text-fg-muted">
                    Đội ngũ kỹ sư VCUBE sẵn sàng phân tích dung sai và báo giá gia công theo yêu cầu.
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
                <span>Nhận tư vấn 1:1</span>
              </Button>
            </div>
          </div>

          {/* Right: Live Interactive 3D Model Stage (5 cols) */}
          <div className="lg:col-span-5">
            <Card variant="soft" padding="none" className="overflow-hidden">
              {/* 3D Header Bar */}
              <div className="p-3.5 bg-surface border-b border-line flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-positive animate-pulse motion-reduce:animate-none" />
                  <span className="font-mono text-xs font-bold text-fg uppercase tracking-wider">
                    {'MÔ PHỎNG 3D · '}
                    <span className="text-primary">{MODEL_LABEL_VI[activeService.modelType]}</span>
                  </span>
                </div>

                <div className="flex items-center gap-1 text-xs font-mono text-fg-muted">
                  <span className="px-2 py-0.5 rounded-sm bg-surface-muted border border-line-subtle">
                    {activeService.badgeVi}
                  </span>
                </div>
              </div>

              {/* 3D Canvas Viewport */}
              <div className="relative bg-surface-inverse aspect-4/3 sm:aspect-square md:aspect-4/3 w-full">
                <ThreeModelViewer
                  modelType={activeService.modelType}
                  color={colorOf(viewerColorToken)}
                  wireframe={wireframe}
                  autoRotate={autoRotate}
                  showGrid={true}
                  className="w-full h-full"
                />

                {/* Floating Top Controls Pill — HUD sáng (§3.8) trên nền render tối */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-panel">
                  <span className="font-mono text-xs text-fg-muted px-3 py-1 rounded-full border border-line bg-surface/90 backdrop-blur-sm">
                    Kéo chuột để xoay 360°
                  </span>

                  {/* Wireframe & Auto-rotate triggers */}
                  <div className="pointer-events-auto flex items-center gap-1 rounded-md border border-line bg-surface/95 shadow-e2 backdrop-blur-md p-1.5">
                    <button
                      type="button"
                      onClick={() => setWireframe(!wireframe)}
                      aria-label={wireframe ? 'Tắt khung dây' : 'Bật khung dây (Wireframe)'}
                      aria-pressed={wireframe}
                      title={wireframe ? 'Tắt khung dây' : 'Bật khung dây (Wireframe)'}
                      className={`grid size-8 max-md:size-11 place-items-center rounded-md transition-colors duration-200 cursor-pointer text-xs font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        wireframe
                          ? 'bg-primary text-primary-fg font-bold'
                          : 'text-fg-muted hover:text-fg hover:bg-surface-muted'
                      }`}
                    >
                      <Icon name="grid_3x3" size={14} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setAutoRotate(!autoRotate)}
                      aria-label={autoRotate ? 'Dừng tự xoay' : 'Bật tự xoay'}
                      aria-pressed={autoRotate}
                      title={autoRotate ? 'Dừng tự xoay' : 'Bật tự xoay'}
                      className={`grid size-8 max-md:size-11 place-items-center rounded-md transition-colors duration-200 cursor-pointer text-xs font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        autoRotate
                          ? 'bg-primary text-primary-fg font-bold'
                          : 'text-fg-muted hover:text-fg hover:bg-surface-muted'
                      }`}
                    >
                      <Icon name="sync" size={14} aria-hidden="true" className={autoRotate ? 'animate-spin motion-reduce:animate-none' : ''} />
                    </button>
                  </div>
                </div>

                {/* Floating Color Palette — dock sáng (§3.8) */}
                <div className="absolute bottom-3 left-3 pointer-events-auto flex items-center gap-1 rounded-full border border-line bg-surface/95 shadow-e2 backdrop-blur-md px-2 py-1">
                  <span className="px-1 text-xs font-mono text-fg-muted">
                    Màu:
                  </span>
                  {VIEWER_COLOR_TOKENS.map((token) => {
                    const hex = colorOf(token);
                    const isActive = viewerColorToken === token;
                    return (
                      <button
                        key={token}
                        type="button"
                        onClick={() => setViewerColorToken(token)}
                        aria-pressed={isActive}
                        // Vùng bấm ≥44px dưới `md`: nút bọc chấm màu 16px (màu là dữ liệu token).
                        className="grid size-9 max-md:size-11 place-items-center rounded-full transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={`Chọn màu ${hex}`}
                        title={`Chọn màu ${hex}`}
                      >
                        <span
                          aria-hidden="true"
                          style={{ backgroundColor: hex }}
                          className={`block size-4 rounded-full border ${
                            isActive ? 'border-primary ring-2 ring-primary ring-offset-2' : 'border-line'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3D Footer Panel */}
              <div className="p-4 bg-surface border-t border-line space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-fg-muted">
                    Đang mô phỏng mô hình:
                  </span>
                  <span className="font-bold text-fg">
                    {activeService.nameVi}
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => handleExecuteAction(activeService.actionType)}
                    trailingIcon={<Icon name="arrow_forward" size={16} />}
                  >
                    <span>{activeService.ctaLabelVi}</span>
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setModalService(activeService)}
                    leadingIcon={<Icon name="visibility" size={16} className="text-primary" />}
                  >
                    <span>Chi Tiết</span>
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Service Deep-Dive Popup Modal — LUÔN mount (chỉ đổi `open`):
          mount có điều kiện + StrictMode làm effect Modal tự đóng ngay sau khi mở. */}
      <Modal
          open={Boolean(modalService)}
          onClose={() => setModalService(null)}
          size="lg"
          title={modalService ? (
            <div className="flex items-center gap-2.5">
              <span className="grid size-10 place-items-center rounded-md bg-tile-mint text-fg">
                <Icon name={modalService.iconName} size={20} aria-hidden="true" />
              </span>
              <div>
                <h3 className="font-bold text-lg text-fg leading-tight">
                  {modalService.nameVi}
                </h3>
                <span className="font-mono text-xs text-primary font-semibold">
                  {modalService.badgeVi}
                </span>
              </div>
            </div>
          ) : undefined}
          footer={
            modalService ? (<div className="flex items-center justify-between w-full">
              <Button variant="ghost" size="sm" onClick={() => setModalService(null)}>
                Đóng
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
                <span>{modalService.ctaLabelVi}</span>
              </Button>
            </div>) : undefined}
        >
          {modalService ? (<div className="space-y-6">
            {/* Description */}
            <p className="text-sm text-fg-muted leading-relaxed">
              {modalService.fullDescVi}
            </p>

            {/* 3D Preview in Modal */}
            <div className="rounded-lg overflow-hidden border border-line bg-surface-inverse aspect-16/9 relative">
              <ThreeModelViewer
                modelType={modalService.modelType}
                color={colorOf(modalService.colorToken)}
                wireframe={false}
                autoRotate={true}
                showGrid={true}
                className="w-full h-full"
              />
              <div className="pointer-events-none absolute bottom-2.5 left-3 max-w-[calc(100%-1.5rem)] truncate rounded-full border border-line bg-surface/90 px-3 py-1 font-mono text-xs text-fg-muted backdrop-blur-sm">
                Mô hình minh họa (xoay 360°)
              </div>
            </div>

            {/* Technical Specifications Grid */}
            <div>
              <h4 className="font-mono text-xs uppercase tracking-wider text-fg-muted font-bold mb-2.5">
                {'THÔNG SỐ KỸ THUẬT & CAM KẾT'}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 font-mono text-xs">
                {(modalService.specsVi).map((spec) => (
                  <div
                    key={spec.label}
                    className="flex items-start justify-between gap-3 rounded-md bg-surface-muted p-2.5"
                  >
                    <span className="shrink-0 text-fg-muted">{spec.label}:</span>
                    <span className="text-right font-bold text-fg tabular-nums">{spec.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Feature Highlights */}
            <div>
              <h4 className="font-mono text-xs uppercase tracking-wider text-fg-muted font-bold mb-2.5">
                ĐẶC ĐIỂM NỔI BẬT
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {(modalService.featuresVi).map((feat) => (
                  <div key={feat} className="flex items-start gap-2">
                    <span className="text-primary shrink-0"><Icon name="check" size={14} aria-hidden="true" /></span>
                    <span className="text-fg">{feat}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>) : null}
        </Modal>
    </section>
  );
};
