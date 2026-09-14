import { calculateDetailedPricing, PricingEngineInput } from '../../utils/pricingEngine';
import { DEFAULT_INKIRI_FORMULA_CONFIG } from '../../data/mockData';
import { MaterialProfile, PrinterProfile, InkiriCostFormulaConfig } from '../../types';

/**
 * PricingService — lớp bọc ĐỒNG BỘ cho pricing engine.
 *
 * LUẬT TRUNG THỰC DỮ LIỆU (docs/design/data-honesty.md CI-05/MP-14)
 * ---------------------------------------------------------------
 * Trước đây `getMaterials()` / `getPrinters()` trả fixture `MATERIALS_CATALOG` /
 * `PRINTER_PROFILES` khi chưa có dữ liệu, nên báo giá được tính trên giá vật liệu và
 * thông số máy bịa. NAY trả [] — nguồn thật là bảng `materials` / `printer_fleet`.
 *
 * `getFormulaConfig()` trả `DEFAULT_INKIRI_FORMULA_CONFIG` — từ Đợt P nó chỉ còn là
 * **MẪU THAM KHẢO về cấu trúc** (`src/data/mockData.ts`), KHÔNG phải nguồn giá trị:
 *   * `getFormulaConfig()` KHÔNG được dùng làm fallback ở call site nào; nguồn thật là
 *     `settingsService.getPricingConfig()` (`pricing_configs`) — rỗng ⇒ `null`.
 *   * Engine đã bỏ mọi số mặc định: thiếu thông số ⇒ `PricingUnavailableError` nêu tên.
 * Hàm này giữ lại chỉ để tương thích chữ ký cũ; xem `docs/plans/27-pricing-parameters.md`.
 */
export class PricingService {
  static calculateQuote(input: PricingEngineInput) {
    // Guard ở tầng dữ liệu: `pricingEngine.ts:69-70` lấy phần tử đầu của
    // `customPrinters` / `customMaterials`, nên mảng rỗng sẽ làm engine crash bằng
    // TypeError khó hiểu. Chưa có vật liệu/máy in ⇒ ném lỗi THẬT nói rõ nguyên nhân.
    if (!input.customMaterials?.length || !input.customPrinters?.length) {
      throw new Error(
        'Chưa có vật liệu hoặc máy in trong hệ thống — không thể tính giá. Nhập ở /admin (Vật liệu / Máy in).'
      );
    }
    return calculateDetailedPricing(input);
  }

  static getMaterials(): MaterialProfile[] {
    // Không còn fixture và không còn localStorage ⇒ [].
    return [];
  }

  static getPrinters(): PrinterProfile[] {
    return [];
  }

  static getFormulaConfig(): InkiriCostFormulaConfig {
    return DEFAULT_INKIRI_FORMULA_CONFIG;
  }
}
