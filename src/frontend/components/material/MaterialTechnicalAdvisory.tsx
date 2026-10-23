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
export function getMaterialAdvisory(materialName: string): MaterialAdvisoryInfo | null {
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
      badgeLabel: 'YÊU CẦU KỸ THUẬT CAO',
      materialDisplayName: 'Vật liệu kỹ thuật gia cường (PA-CF / Nylon Carbon Fiber)',
      equipmentRequirements: [
            'Buồng gia nhiệt chủ động kín ≥ 60°C chống cong mép và phân lớp.',
            'Đầu đùn thép tôi cứng (Hardened Steel Nozzle) chống mài mòn từ sợi carbon.',
            'Hộp sấy chống ẩm chủ động liên tục (độ ẩm < 10% RH) trong suốt chu kỳ in.',
          ],
      costRationale: [
            'Phôi sợi PA-CF/Nylon-CF kỹ thuật cao gấp 4–6 lần nhựa thông thường.',
            'Khấu hao nhanh cụm vòi phun thép tôi cứng và máy in buồng nhiệt.',
            'Quy trình tiền xử lý sấy phôi 6–8 giờ ở 80°C trước khi gia công.',
          ],
      shrinkageAndTolerance: {
        shrinkageRate: '0.4% – 0.8%',
        recommendedTolerance: '±0.1 mm',
        notes: 'Tỷ lệ co ngót thấp theo trục sợi; dung sai khuyến nghị ±0.1 mm cho đồ gá và linh kiện cơ khí chịu lực.',
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
      badgeLabel: 'YÊU CẦU KỸ THUẬT CAO',
      materialDisplayName: 'Siêu nhựa kỹ thuật đặc chủng (PEEK / PEKK)',
      equipmentRequirements: [
            'Nhiệt độ đầu đùn ≥ 400°C và buồng gia nhiệt chủ động kín ≥ 90°C.',
            'Bàn in nhiệt độ cao (≥ 130°C) với bề mặt bám dính nhiệt độ cao chuyên dụng.',
            'Hệ thống điều nhiệt đẳng nhiệt buồng in để kiểm soát độ kết tinh bán tinh thể.',
          ],
      costRationale: [
            'Giá phôi PEEK nguyên sinh kỹ thuật cao gấp 8–15 lần sợi FDM tiêu chuẩn.',
            'Chi phí vận hành thiết bị công nghiệp công suất nhiệt lớn.',
            'Chu trình ủ nhiệt khử ứng suất dư (Annealing) sau in kéo dài nhiều giờ.',
          ],
      shrinkageAndTolerance: {
        shrinkageRate: '0.8% – 1.2%',
        recommendedTolerance: '±0.1 mm',
        notes: 'Chịu nhiệt liên tục đến 250°C; dung sai khuyến nghị ±0.1 mm cho chi tiết chính xác cao.',
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
      badgeLabel: 'YÊU CẦU KỸ THUẬT CAO',
      materialDisplayName: 'Polycarbonate kỹ thuật (PC)',
      equipmentRequirements: [
            'Buồng in kín có gia nhiệt giữ nhiệt độ ổn định ≥ 60°C tránh cong vênh mép.',
            'Nhiệt độ đầu đùn 260°C – 290°C, bàn nhiệt ≥ 100°C.',
            'Bắt buộc sấy phôi ở 75°C từ 6–8 giờ trước khi gia công tránh bọt khí ẩm.',
          ],
      costRationale: [
            'Chi phí phôi PC nguyên sinh kỹ thuật và điện năng duy trì buồng sấy gia nhiệt cao.',
            'Khấu hao hệ thống máy in buồng kín và cụm đầu phun nhiệt độ cao.',
            'Quy trình sấy tiền chế 6–8 giờ ở 75°C và kiểm soát cong vênh nghiêm ngặt.',
          ],
      shrinkageAndTolerance: {
        shrinkageRate: '0.6% – 0.9%',
        recommendedTolerance: '±0.1 mm',
        notes: 'Khả năng chịu va đập cơ học và nhiệt độ cao; dung sai khuyến nghị ±0.1 mm.',
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
      badgeLabel: 'YÊU CẦU KỸ THUẬT CAO',
      materialDisplayName: 'Elastomer đàn hồi (TPU 95A / Flexible)',
      equipmentRequirements: [
            'Đầu đùn dẫn động trực tiếp (Direct Drive Extruder) chống kẹt và uốn sợi dẻo.',
            'Tốc độ đùn kiểm soát chậm 25–45 mm/s đảm bảo dòng chảy ổn định.',
            'Hạn chế các cấu trúc vật liệu đỡ phức tạp khó bóc tách.',
          ],
      costRationale: [
            'Thời gian chiếm dụng máy in tăng gấp 2–3 lần do tốc độ in giới hạn.',
            'Khấu hao cụm đầu đùn dẫn động trực tiếp và bánh răng tì phôi chống trượt.',
            'Quy trình nạp phôi chậm và cân chỉnh lực ép bánh răng đùn tỉ mỉ.',
          ],
      shrinkageAndTolerance: {
        shrinkageRate: '0.5% – 1.0%',
        recommendedTolerance: '±0.1 mm',
        notes: 'Độ đàn hồi và giảm chấn vượt trội; kích thước đo kiểm với dung sai khuyến nghị ±0.1 mm.',
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
      badgeLabel: 'YÊU CẦU KỸ THUẬT CAO',
      materialDisplayName: 'Quang hóa độ phân giải cao (Resin Kỹ Thuật / SLA)',
      equipmentRequirements: [
            'Hệ thống máy in quang trùng hợp SLA/DLP 8K – 14K độ nét cao.',
            'Trạm rửa cồn siêu âm (Ultrasonic IPA Wash) làm sạch triệt để nhựa dư.',
            'Buồng sấy chiếu tia cực tím (UV Curing Chamber) đa bước sóng hoàn thiện cơ tính.',
          ],
      costRationale: [
            'Chi phí dung môi cồn tẩy rửa, màng đáy quang học định kỳ và nhựa quang hóa.',
            'Khấu hao màn hình chiếu UV độ nét cao và buồng sấy đóng rắn tia cực tím.',
            'Nhân công kỹ thuật xử lý thủ công (tách support, ngâm rửa, sấy UV, mài hoàn thiện).',
          ],
      shrinkageAndTolerance: {
        shrinkageRate: '0.4% – 0.6%',
        recommendedTolerance: '±0.1 mm',
        notes: 'Chi tiết sắc nét đến từng đường nét vi mô, bề mặt láng mịn; dung sai khuyến nghị ±0.1 mm.',
      },
    };
  }

  return null;
}

export interface MaterialTechnicalAdvisoryProps {
  materialName: string;
  className?: string;
}

export const MaterialTechnicalAdvisory: React.FC<MaterialTechnicalAdvisoryProps> = ({
  materialName,
  className,
}) => {
  const advisory = getMaterialAdvisory(materialName);

  // Với vật liệu tiêu chuẩn (PLA, PETG...), không hiển thị cảnh báo
  if (!advisory) {
    return null;
  }

  return (
    <div
      className={cn(
        'rounded-lg bg-surface-muted p-4 space-y-3',
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
            dot
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
            <Icon name="precision_manufacturing" size={14} className="text-primary shrink-0" />
            <span>1. Yêu cầu thiết bị gia công:</span>
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
            <Icon name="calculate" size={14} className="text-primary shrink-0" />
            <span>2. Lý do cấu thành chi phí chế tạo:</span>
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
            <Icon name="straighten" size={14} className="text-primary shrink-0" />
            <span>{'3. Tỷ lệ co ngót & Dung sai khuyến nghị:'}</span>
          </div>
          <div className="rounded-md bg-surface p-2.5 space-y-1.5">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-xs font-mono text-fg-muted block uppercase">
                  Co ngót nhiệt
                </span>
                <span className="text-xs font-mono font-bold text-fg tabular-nums">
                  {advisory.shrinkageAndTolerance.shrinkageRate}
                </span>
              </div>
              <div>
                <span className="text-xs font-mono text-fg-muted block uppercase">
                  Dung sai khuyến nghị
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
