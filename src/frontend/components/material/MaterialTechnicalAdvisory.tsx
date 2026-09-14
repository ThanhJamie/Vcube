import React from 'react';
import { Icon, Badge, cn } from '@frontend/ui';

export type MaterialCategory = 'composite' | 'ultra-polymer' | 'polycarbonate' | 'elastomer' | 'resin';

export interface MaterialAdvisoryInfo {
  category: MaterialCategory;
  badgeLabel: string;
  materialDisplayName: string;
  equipmentRequirements: string[];
  costRationale: string[];
  shrinkageAndTolerance: {
    shrinkageRate: string;
    recommendedTolerance: string;
    notes: string;
  };
}

/**
 * Phân tích tên vật liệu và trả về cấu hình khuyến nghị kỹ thuật (R3).
 * Trả về null với các vật liệu tiêu chuẩn thông thường (PLA, PETG, ABS tiêu chuẩn...).
 *
 * TUÂN THỦ DỮ LIỆU & QUY ĐỊNH (scripts/check-fabricated.mjs & scripts/check-unitprice-multiplier.mjs):
 * - Tuyệt đối không dùng dung sai ±0.05 mm (bị chặn bởi rule tolerance-005).
 * - Sử dụng dung sai kỹ thuật thực tế tiêu chuẩn: ±0.1 mm.
 * - Không áp dụng unit_price_multiplier vào giá bán sản phẩm.
 */
export function getMaterialAdvisory(materialName: string, isVi: boolean): MaterialAdvisoryInfo | null {
  if (!materialName || typeof materialName !== 'string') return null;
  const norm = materialName.toLowerCase().trim();

  // 1. Carbon Fiber / Nylon Composites (Nylon-CF, PA12-CF, PA-CF, Carbon Fiber)
  // Lọc trừ trường hợp 'polycarbonate' vốn có chứa xâu con 'carbon'
  const isCf =
    /(?:^|[\s\-_/])cf(?:$|[\s\-_/])/i.test(norm) ||
    norm.includes('pa-cf') ||
    norm.includes('pa12') ||
    norm.includes('pa6') ||
    norm.includes('nylon') ||
    /\bcarbon\b/i.test(norm.replace(/polycarbonate/g, ''));

  if (isCf) {
    return {
      category: 'composite',
      badgeLabel: isVi ? 'YÊU CẦU KỸ THUẬT CAO' : 'HIGH TECHNICAL REQUIREMENT',
      materialDisplayName: isVi
        ? 'Vật liệu kỹ thuật gia cường (PA-CF / Nylon Carbon Fiber)'
        : 'High-Performance Composite (PA-CF / Nylon Carbon Fiber)',
      equipmentRequirements: isVi
        ? [
            'Buồng gia nhiệt chủ động kín ≥ 60°C chống cong mép và phân lớp.',
            'Đầu đùn thép tôi cứng (Hardened Steel Nozzle) chống mài mòn từ sợi carbon.',
            'Hộp sấy chống ẩm chủ động liên tục (độ ẩm < 10% RH) trong suốt chu kỳ in.',
          ]
        : [
            'Active enclosed heated chamber ≥ 60°C to prevent warping and delamination.',
            'Hardened steel nozzle to withstand abrasive carbon fiber reinforcement.',
            'Continuous active dry box (< 10% RH) maintained throughout extrusion.',
          ],
      costRationale: isVi
        ? [
            'Phôi sợi PA-CF/Nylon-CF kỹ thuật cao gấp 4–6 lần nhựa thông thường.',
            'Khấu hao nhanh cụm vòi phun thép tôi cứng và máy in buồng nhiệt.',
            'Quy trình tiền xử lý sấy phôi 6–8 giờ ở 80°C trước khi gia công.',
          ]
        : [
            'Engineering-grade PA-CF filament costs 4–6x standard polymers.',
            'Accelerated wear and depreciation of hardened nozzles and heated hardware.',
            'Strict 6–8 hour pre-drying protocol at 80°C prior to printing.',
          ],
      shrinkageAndTolerance: {
        shrinkageRate: '0.4% – 0.8%',
        recommendedTolerance: '±0.1 mm',
        notes: isVi
          ? 'Tỷ lệ co ngót thấp theo trục sợi; dung sai khuyến nghị ±0.1 mm cho đồ gá và linh kiện cơ khí chịu lực.'
          : 'Low shrinkage along fiber axis; ±0.1 mm tolerance recommended for functional jigs and load-bearing parts.',
      },
    };
  }

  // 2. PEEK / PEKK Ultra-Polymers
  const isPeek =
    norm.includes('peek') ||
    norm.includes('pekk') ||
    norm.includes('ultem') ||
    norm.includes('pei');

  if (isPeek) {
    return {
      category: 'ultra-polymer',
      badgeLabel: isVi ? 'YÊU CẦU KỸ THUẬT CAO' : 'HIGH TECHNICAL REQUIREMENT',
      materialDisplayName: isVi
        ? 'Siêu nhựa kỹ thuật đặc chủng (PEEK / PEKK)'
        : 'Ultra-Polymer (PEEK / PEKK)',
      equipmentRequirements: isVi
        ? [
            'Nhiệt độ đầu đùn ≥ 400°C và buồng gia nhiệt chủ động kín ≥ 90°C.',
            'Bàn in nhiệt độ cao (≥ 130°C) với bề mặt bám dính nhiệt độ cao chuyên dụng.',
            'Hệ thống điều nhiệt đẳng nhiệt buồng in để kiểm soát độ kết tinh bán tinh thể.',
          ]
        : [
            'Extruder temperature ≥ 400°C and active heated chamber ≥ 90°C.',
            'High-temperature heated bed (≥ 130°C) with specialized adhesion sheets.',
            'Isothermal chamber temperature control for precise semi-crystalline morphology.',
          ],
      costRationale: isVi
        ? [
            'Giá phôi PEEK nguyên sinh kỹ thuật cao gấp 8–15 lần sợi FDM tiêu chuẩn.',
            'Chi phí vận hành thiết bị công nghiệp công suất nhiệt lớn.',
            'Chu trình ủ nhiệt khử ứng suất dư (Annealing) sau in kéo dài nhiều giờ.',
          ]
        : [
            'Virgin PEEK ultra-polymer feedstock costs 8–15x standard FDM filaments.',
            'High power and operating overhead of industrial high-temp chambers.',
            'Extended post-process thermal annealing cycle to relieve internal stresses.',
          ],
      shrinkageAndTolerance: {
        shrinkageRate: '0.8% – 1.2%',
        recommendedTolerance: '±0.1 mm',
        notes: isVi
          ? 'Chịu nhiệt liên tục đến 250°C; dung sai khuyến nghị ±0.1 mm cho chi tiết chính xác cao.'
          : 'Continuous thermal stability up to 250°C; ±0.1 mm tolerance recommended for high-precision components.',
      },
    };
  }

  // 3. PC / Polycarbonate
  const isPc =
    /(?:^|[\s\-_/])pc(?:$|[\s\-_/])/i.test(norm) ||
    norm.includes('polycarbonate');

  if (isPc) {
    return {
      category: 'polycarbonate',
      badgeLabel: isVi ? 'YÊU CẦU KỸ THUẬT CAO' : 'HIGH TECHNICAL REQUIREMENT',
      materialDisplayName: isVi
        ? 'Polycarbonate kỹ thuật (PC)'
        : 'Engineering Polycarbonate (PC)',
      equipmentRequirements: isVi
        ? [
            'Buồng in kín có gia nhiệt giữ nhiệt độ ổn định ≥ 60°C tránh cong vênh mép.',
            'Nhiệt độ đầu đùn 260°C – 290°C, bàn nhiệt ≥ 100°C.',
            'Bắt buộc sấy phôi ở 75°C từ 6–8 giờ trước khi gia công tránh bọt khí ẩm.',
          ]
        : [
            'Enclosed heated chamber maintaining ≥ 60°C to prevent edge curling.',
            'Extruder temperature 260°C – 290°C, heated bed ≥ 100°C.',
            'Mandatory 6–8h pre-drying at 75°C to eliminate moisture and bubble defects.',
          ],
      costRationale: isVi
        ? [
            'Chi phí phôi PC nguyên sinh kỹ thuật và điện năng duy trì buồng sấy gia nhiệt cao.',
            'Khấu hao hệ thống máy in buồng kín và cụm đầu phun nhiệt độ cao.',
            'Quy trình sấy tiền chế 6–8 giờ ở 75°C và kiểm soát cong vênh nghiêm ngặt.',
          ]
        : [
            'Higher raw polycarbonate cost and elevated heated chamber power consumption.',
            'Depreciation of high-temperature enclosed industrial hardware.',
            'Strict 6–8h pre-drying protocol at 75°C and thermal warp oversight.',
          ],
      shrinkageAndTolerance: {
        shrinkageRate: '0.6% – 0.9%',
        recommendedTolerance: '±0.1 mm',
        notes: isVi
          ? 'Khả năng chịu va đập cơ học và nhiệt độ cao; dung sai khuyến nghị ±0.1 mm.'
          : 'Exceptional impact strength and heat resistance; ±0.1 mm tolerance recommended.',
      },
    };
  }

  // 4. TPU 95A / Flexible Elastomers
  const isTpu =
    norm.includes('tpu') ||
    norm.includes('elastomer') ||
    /(?:^|[\s\-_/])(tpe|flex)(?:$|[\s\-_/])/i.test(norm) ||
    norm.includes('flexible');

  if (isTpu) {
    return {
      category: 'elastomer',
      badgeLabel: isVi ? 'YÊU CẦU KỸ THUẬT CAO' : 'HIGH TECHNICAL REQUIREMENT',
      materialDisplayName: isVi
        ? 'Elastomer đàn hồi (TPU 95A / Flexible)'
        : 'Technical Elastomer (TPU 95A / Flexible)',
      equipmentRequirements: isVi
        ? [
            'Đầu đùn dẫn động trực tiếp (Direct Drive Extruder) chống kẹt và uốn sợi dẻo.',
            'Tốc độ đùn kiểm soát chậm 25–45 mm/s đảm bảo dòng chảy ổn định.',
            'Hạn chế các cấu trúc chống đỡ (supports) phức tạp khó bóc tách.',
          ]
        : [
            'Direct-drive extruder required to eliminate flexible filament buckling.',
            'Strictly controlled extrusion speed (25–45 mm/s) for consistent flow.',
            'Geometry should minimize complex support structures.',
          ],
      costRationale: isVi
        ? [
            'Thời gian chiếm dụng máy in tăng gấp 2–3 lần do tốc độ in giới hạn.',
            'Khấu hao cụm đầu đùn dẫn động trực tiếp và bánh răng tì phôi chống trượt.',
            'Quy trình nạp phôi chậm và cân chỉnh lực ép bánh răng đùn tỉ mỉ.',
          ]
        : [
            'Machine runtime extended 2–3x due to conservative extrusion velocity.',
            'Depreciation and maintenance of precision direct-drive feed assemblies.',
            'Meticulous spool tension calibration and direct feed setup.',
          ],
      shrinkageAndTolerance: {
        shrinkageRate: '0.5% – 1.0%',
        recommendedTolerance: '±0.1 mm',
        notes: isVi
          ? 'Độ đàn hồi và giảm chấn vượt trội; kích thước đo kiểm với dung sai khuyến nghị ±0.1 mm.'
          : 'High elasticity and vibration damping; inspection recommended with ±0.1 mm tolerance.',
      },
    };
  }

  // 5. Resin Kỹ Thuật / SLA/DLP Photopolymers
  const isResin =
    norm.includes('resin') ||
    norm.includes('photopolymer') ||
    /(?:^|[\s\-_/])(sla|dlp)(?:$|[\s\-_/])/i.test(norm);

  if (isResin) {
    return {
      category: 'resin',
      badgeLabel: isVi ? 'YÊU CẦU KỸ THUẬT CAO' : 'HIGH TECHNICAL REQUIREMENT',
      materialDisplayName: isVi
        ? 'Quang hóa độ phân giải cao (Resin Kỹ Thuật / SLA)'
        : 'High-Precision Photopolymer (Technical Resin / SLA)',
      equipmentRequirements: isVi
        ? [
            'Hệ thống máy in quang trùng hợp SLA/DLP 8K – 14K độ nét cao.',
            'Trạm rửa cồn siêu âm (Ultrasonic IPA Wash) làm sạch triệt để nhựa dư.',
            'Buồng sấy chiếu tia cực tím (UV Curing Chamber) đa bước sóng hoàn thiện cơ tính.',
          ]
        : [
            'High-resolution SLA/DLP 8K–14K photopolymer production system.',
            'Ultrasonic IPA washing station for thorough residual resin removal.',
            'Multi-wavelength UV curing chamber for final polymer cross-linking.',
          ],
      costRationale: isVi
        ? [
            'Chi phí dung môi cồn tẩy rửa, màng đáy quang học định kỳ và nhựa quang hóa.',
            'Khấu hao màn hình chiếu UV độ nét cao và buồng sấy đóng rắn tia cực tím.',
            'Nhân công kỹ thuật xử lý thủ công (tách support, ngâm rửa, sấy UV, mài hoàn thiện).',
          ]
        : [
            'Specialized photopolymer resin, vat release films, and solvent consumables.',
            'Depreciation of high-resolution exposure arrays and UV curing chambers.',
            'Manual finishing labor (support excision, IPA wash cycle, UV cure, polish).',
          ],
      shrinkageAndTolerance: {
        shrinkageRate: '0.4% – 0.6%',
        recommendedTolerance: '±0.1 mm',
        notes: isVi
          ? 'Chi tiết sắc nét đến từng đường nét vi mô, bề mặt láng mịn; dung sai khuyến nghị ±0.1 mm.'
          : 'Micron-level detail acuity with isotropic finish; ±0.1 mm tolerance recommended.',
      },
    };
  }

  return null;
}

export interface MaterialTechnicalAdvisoryProps {
  materialName: string;
  isVi: boolean;
  className?: string;
}

export const MaterialTechnicalAdvisory: React.FC<MaterialTechnicalAdvisoryProps> = ({
  materialName,
  isVi,
  className,
}) => {
  const advisory = getMaterialAdvisory(materialName, isVi);

  // Với vật liệu tiêu chuẩn (PLA, PETG...), không hiển thị cảnh báo
  if (!advisory) {
    return null;
  }

  return (
    <div
      className={cn(
        'rounded-lg border border-warning/30 bg-surface p-3.5 space-y-3 shadow-e0 transition-all',
        className
      )}
      aria-live="polite"
    >
      {/* Header: Badge & Category Name */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line-subtle pb-2.5">
        <div className="flex items-center gap-2">
          <Badge
            variant="warning"
            size="sm"
            icon={<Icon name="warning" size={14} className="text-warning" />}
          >
            {advisory.badgeLabel}
          </Badge>
          <span className="text-xs font-mono font-bold text-fg">
            {advisory.materialDisplayName}
          </span>
        </div>
      </div>

      {/* 3-Part Structured Callout */}
      <div className="space-y-3">
        {/* 1. Yêu cầu thiết bị gia công */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-fg">
            <Icon name="precision_manufacturing" size={15} className="text-primary shrink-0" />
            <span>{isVi ? '1. Yêu cầu thiết bị gia công:' : '1. Equipment Requirements:'}</span>
          </div>
          <ul className="pl-5 space-y-1 list-disc text-xs text-fg-muted leading-relaxed">
            {advisory.equipmentRequirements.map((req, idx) => (
              <li key={idx}>{req}</li>
            ))}
          </ul>
        </div>

        {/* 2. Lý do chênh lệch chi phí */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-fg">
            <Icon name="calculate" size={15} className="text-primary shrink-0" />
            <span>{isVi ? '2. Lý do cấu thành chi phí chế tạo:' : '2. Manufacturing Cost Rationale:'}</span>
          </div>
          <ul className="pl-5 space-y-1 list-disc text-xs text-fg-muted leading-relaxed">
            {advisory.costRationale.map((reason, idx) => (
              <li key={idx}>{reason}</li>
            ))}
          </ul>
        </div>

        {/* 3. Tỷ lệ co ngót và dung sai khuyến nghị */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-fg">
            <Icon name="straighten" size={15} className="text-primary shrink-0" />
            <span>{isVi ? '3. Tỷ lệ co ngót & Dung sai khuyến nghị:' : '3. Thermal Shrinkage & Recommended Tolerance:'}</span>
          </div>
          <div className="rounded-md border border-line-subtle bg-surface-muted p-2.5 space-y-1.5">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-xs font-mono text-fg-muted block uppercase">
                  {isVi ? 'Co ngót nhiệt' : 'Thermal shrinkage'}
                </span>
                <span className="text-xs font-mono font-bold text-fg tabular-nums">
                  {advisory.shrinkageAndTolerance.shrinkageRate}
                </span>
              </div>
              <div>
                <span className="text-xs font-mono text-fg-muted block uppercase">
                  {isVi ? 'Dung sai khuyến nghị' : 'Recommended tolerance'}
                </span>
                <span className="text-xs font-mono font-bold text-primary tabular-nums">
                  {advisory.shrinkageAndTolerance.recommendedTolerance}
                </span>
              </div>
            </div>
            <div className="border-t border-line-subtle pt-1 text-xs text-fg-muted leading-relaxed">
              {advisory.shrinkageAndTolerance.notes}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
