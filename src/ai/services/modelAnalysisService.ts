import { MeshGeometryMetrics, AiPrintabilityReport } from '../types';
import { getGeminiClient, GEMINI_MODEL_DEFAULT } from './geminiClient';

export class ModelAnalysisService {
  /**
   * Analyzes a 3D CAD mesh metrics and returns an intelligent printability report.
   * If Gemini API is available, enriches with deep LLM DFM reasoning.
   */
  static async analyzeMesh(metrics: MeshGeometryMetrics): Promise<AiPrintabilityReport> {
    const { x, y, z } = metrics.dimensionsMm;
    const maxDim = Math.max(x, y, z);
    const minDim = Math.min(x, y, z);
    const aspectRatio = maxDim / (minDim || 1);

    // Baseline algorithmic heuristic
    let score = 92;
    const warnings: AiPrintabilityReport['dfmWarnings'] = [];

    if (z > 220) {
      score -= 15;
      warnings.push({
        type: 'HIGH_ASPECT_RATIO',
        severity: 'WARNING',
        message: `Chiều cao Z (${z.toFixed(1)}mm) lớn, nguy cơ rung lắc trục Z ở các lớp trên cùng.`,
        recommendation: 'Giảm tốc độ in lớp trên hoặc xoay mẫu nằm ngang theo trục X/Y để tăng diện tích bám bàn.',
      });
    }

    if (aspectRatio > 8) {
      score -= 10;
      warnings.push({
        type: 'WARPING_RISK',
        severity: 'WARNING',
        message: 'Tỷ lệ hình học dài mảnh, dễ bị co ngót và cong vênh mép bàn (warping).',
        recommendation: 'Sử dụng tấm gia nhiệt PEI nhám và bật viền Brim 5-8mm.',
      });
    }

    if (metrics.hasOverhangs) {
      score -= 12;
      warnings.push({
        type: 'STEEP_OVERHANG',
        severity: 'WARNING',
        message: 'Phát hiện góc nhô quá 45° so với phương thẳng đứng.',
        recommendation: 'Bật Tree Supports (Hỗ trợ dạng cây) để tiết kiệm 40% vật liệu và dễ bóc tách.',
      });
    }

    const ai = getGeminiClient();
    if (ai) {
      try {
        const prompt = `Bạn là chuyên gia kỹ thuật in 3D công nghiệp FDM/SLA tại VCUBE.
Hãy đánh giá file 3D CAD với các thông số sau:
- Tên file: ${metrics.name}
- Kích thước: ${x.toFixed(1)} x ${y.toFixed(1)} x ${z.toFixed(1)} mm
- Thể tích: ${metrics.volumeCm3.toFixed(2)} cm3
- Số tam giác: ${metrics.triangleCount}
- Có góc nhô: ${metrics.hasOverhangs ? 'Có' : 'Không'}

Trả về định dạng JSON ngắn gọn với:
{
  "summary": "Đánh giá 1-2 câu",
  "orientation": "Gợi ý xoay trục (VD: Đặt mặt đáy phẳng xuống bàn in)",
  "savings": 25,
  "recommendedMaterial": "PETG / PLA-CF / PA12-Nylon"
}`;
        const response = await ai.models.generateContent({
          model: GEMINI_MODEL_DEFAULT,
          contents: prompt,
        });

        if (response.text) {
          const cleanText = response.text.replace(/```json|```/g, '').trim();
          const parsed = JSON.parse(cleanText);
          return {
            score: Math.max(50, Math.min(98, score)),
            rating: score >= 85 ? 'EXCELLENT' : score >= 70 ? 'GOOD' : 'NEEDS_SUPPORT',
            summary: parsed.summary || 'Chi tiết có cấu trúc hình học ổn định, sẵn sàng chuyển slicer.',
            suggestedOrientation: {
              rotationDeg: { x: 0, y: 0, z: 0 },
              supportSavingsPercent: parsed.savings || 20,
              explanation: parsed.orientation || 'Xoay mặt phẳng lớn nhất tiếp xúc với bàn in để bám dính tối đa.',
            },
            dfmWarnings: warnings,
            recommendedMaterial: parsed.recommendedMaterial || (maxDim > 150 ? 'PETG-CF' : 'PLA Pro'),
            recommendedInfill: {
              pattern: 'gyroid',
              densityPercent: 20,
              reason: 'Gyroid phân bố ứng suất đẳng hướng đều mọi phương, độ bền cơ học cao nhất.',
            },
          };
        }
      } catch (err) {
        console.warn('Gemini mesh analysis note (using heuristic fallback):', err);
      }
    }

    return {
      score: Math.max(50, Math.min(98, score)),
      rating: score >= 85 ? 'EXCELLENT' : score >= 70 ? 'GOOD' : 'NEEDS_SUPPORT',
      summary: `Mẫu ${metrics.name} có kích thước ${x.toFixed(0)}x${y.toFixed(0)}x${z.toFixed(0)}mm, thể tích ${metrics.volumeCm3.toFixed(1)}cm³. Hình học phù hợp in FDM công nghiệp.`,
      suggestedOrientation: {
        rotationDeg: { x: 0, y: 0, z: 0 },
        supportSavingsPercent: 25,
        explanation: 'Khuyến nghị đặt diện tích tiếp xúc lớn nhất vuông góc với trục Z để giảm thiểu cấu trúc đỡ.',
      },
      dfmWarnings: warnings,
      recommendedMaterial: maxDim > 150 ? 'PETG-CF' : 'PLA Matte Kỹ Thuật',
      recommendedInfill: {
        pattern: 'gyroid',
        densityPercent: 20,
        reason: 'Gyroid phân bố ứng suất đẳng hướng đa chiều, tối ưu cho chi tiết cơ khí chịu lực.',
      },
    };
  }
}
