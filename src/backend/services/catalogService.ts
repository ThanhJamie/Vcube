import { Product, DigitalAsset, AccessoryItem } from '../../types';

/**
 * CatalogService — lớp đọc catalog ĐỒNG BỘ cho code cũ.
 *
 * LUẬT TRUNG THỰC DỮ LIỆU (docs/design/data-honesty.md CI-01/CI-05/CI-06)
 * ----------------------------------------------------------------------
 * Trước đây mọi hàm ở đây trả thẳng fixture trong `src/data/mockData.ts`
 * (`PRODUCTS` / `DIGITAL_ASSETS` / `DEFAULT_ACCESSORIES`) và đọc thêm `localStorage`,
 * nên catalog bịa được trình bày như catalog thật của VCUBE.
 *
 * NAY: tầng này KHÔNG có nguồn dữ liệu thật (nguồn thật là Supabase, đọc bất đồng bộ
 * qua `dbService.getProducts()` / `dbService.getAccessories()`), nên trả mảng RỖNG để
 * caller hiển thị trạng thái rỗng. Giữ nguyên tên hàm + kiểu trả về để không phá import.
 */
export class CatalogService {
  static getProducts(): Product[] {
    // Không còn fixture và không còn localStorage ⇒ [] (nguồn thật: dbService.getProducts()).
    return [];
  }

  static getProductById(id: string): Product | undefined {
    return this.getProducts().find(p => p.id === id);
  }

  static getDigitalAssets(): DigitalAsset[] {
    // Thư viện CAD đã mua là dữ liệu theo người dùng trong DB (CI-06) ⇒ [] khi chưa nạp.
    return [];
  }

  static getAccessories(): AccessoryItem[] {
    return [];
  }
}
