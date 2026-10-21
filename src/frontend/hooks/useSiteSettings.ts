/**
 * useSiteSettings — domain cấu hình site của `MainApp` (Phase 3c), tách NGUYÊN VĂN logic.
 *
 * Hợp đồng (hành vi giữ y nguyên):
 * - `siteContent` khởi tạo bằng `DEFAULT_SITE_CONTENT` (nhãn mặc định thật, không mock) rồi
 *   nạp DB qua `dbService.getSiteContent()`; lưu qua `dbService.saveSiteContent()` (trả
 *   `WriteResult` thật để panel chỉ báo "đã lưu" khi DB nhận).
 * - `pricingConfig` khởi tạo `null` (chưa cấu hình ⇒ views hiện `—`) rồi nạp DB; lưu qua
 *   `settingsService.savePricingConfig()` (validate + audit + cache + realtime).
 * - `marketplaceFeePercent` là MỘT nguồn phí nền tảng (đọc cache settings + subscribe);
 *   `effectivePricingConfig` chỉ bù ĐÚNG ô `platformCommissionPercent` khi có số thật.
 */

import { useEffect, useMemo, useState } from 'react';
import type { InkiriCostFormulaConfig, SiteContentConfig } from '@/types';
import { DEFAULT_SITE_CONTENT } from '@/data/mockData';
import type { WriteResult } from '@backend/lib/result';
import { dbService } from '@backend/supabase/database';
import { settingsAccessors, subscribeSettings, savePricingConfig as savePricingConfigAudited } from '@backend/services/settingsService';

export interface SiteSettings {
  siteContent: SiteContentConfig;
  pricingConfig: InkiriCostFormulaConfig | null;
  effectivePricingConfig: InkiriCostFormulaConfig | null;
  handleUpdateSiteContent: (newContent: SiteContentConfig) => Promise<WriteResult>;
  handleUpdatePricingConfig: (newConfig: InkiriCostFormulaConfig) => Promise<WriteResult<InkiriCostFormulaConfig>>;
}

export function useSiteSettings(): SiteSettings {
  // Chưa cấu hình/không đọc được DB ⇒ dùng bộ nhãn mặc định (config thật, không mock).
  const [siteContent, setSiteContent] = useState<SiteContentConfig>(DEFAULT_SITE_CONTENT);

  /**
   * `null` = CHƯA có cấu hình công thức giá thật.
   *
   * Trước đây state này khởi tạo bằng `DEFAULT_INKIRI_FORMULA_CONFIG` (bộ số của công cụ
   * Inkiri) và từng merge với bản lưu localStorage (cache đã bỏ ở Phase 3 — DB là nguồn duy
   * nhất). Hệ quả cũ: views nhận một bộ số KHÔNG ai
   * cấu hình nên HomeView cộng ra 15,5% phụ phí (8 + 2,5 + 5 của Inkiri) rồi hiển thị cho
   * khách, trong khi engine đọc `pricing_global_settings.marketplace_fee_percent` ⇒ số hiển
   * thị và số tính có thể KHÁC NHAU. Đó là lỗi TIỀN.
   *
   * Bỏ hẳn bộ số mẫu ở thượng nguồn: thiếu cấu hình ⇒ `null` ⇒ views hiện `—`.
   */
  const [pricingConfig, setPricingConfig] = useState<InkiriCostFormulaConfig | null>(null);

  /**
   * Phí nền tảng — MỘT nguồn duy nhất, đúng nguồn engine đọc
   * (`pricingEngine.ts:426-428`: `pricing_global_settings.marketplace_fee_percent`).
   * `null` = chưa cấu hình; KHÔNG rơi về 8.
   */
  const [marketplaceFeePercent, setMarketplaceFeePercent] = useState<number | null>(
    () => settingsAccessors.pricingGlobal()?.marketplaceFeePercent ?? null
  );

  /** Đọc lại cache settings (đồng bộ, không chạm DB) và chỉ set khi giá trị đổi. */
  const setMarketplaceFeeFromCache = () => {
    const next = settingsAccessors.pricingGlobal()?.marketplaceFeePercent ?? null;
    setMarketplaceFeePercent((prev) => (prev === next ? prev : next));
  };

  // Cache settings được nạp ở `main.tsx` (không `await`) và cập nhật qua realtime ⇒ đăng ký
  // nhận thay đổi để số hiển thị bám đúng nguồn của engine, không mở truy vấn mới.
  //
  // ⚠️ LỊCH SỆ: `bootstrapSettings()` từng KHÔNG gọi `notify()` nên subscription chỉ bắn một lần với
  // cache rỗng. Nay service đã báo cho subscriber khi nạp xong (W2-I); lời gọi
  // `setMarketplaceFeeFromCache()` ngay tại đây được giữ nguyên để render đầu tiên đọc cache
  // đồng bộ (không đợi effect), không đổi hành vi.
  useEffect(() => {
    setMarketplaceFeeFromCache();
    return subscribeSettings(setMarketplaceFeeFromCache);
  }, [pricingConfig]);

  // Fetch dynamic system parameters (Pricing Config & Site Content) from Supabase on mount.
  // (Materials/printers/accessories nằm ở `useCatalogData` — tách theo domain; deps `[]` +
  // cleanup `isMounted` giữ như bản gộp trước đây.)
  useEffect(() => {
    let isMounted = true;
    dbService.getPricingConfig().then((cfg) => {
      if (isMounted && cfg) setPricingConfig(cfg);
    }).catch((err) => console.warn('Could not load remote pricing config:', err));

    dbService.getSiteContent().then((content) => {
      if (isMounted && content) setSiteContent(content);
    }).catch((err) => console.warn('Could not load remote site content:', err));

    return () => {
      isMounted = false;
    };
  }, []);

  const handleUpdatePricingConfig = async (newConfig: InkiriCostFormulaConfig) => {
    setPricingConfig(newConfig);
    // Ghi qua service ĐÃ KIỂM SOÁT (validate + audit log + cache + realtime). Trả kết quả
    // thật để UI không báo "đã lưu" khi DB từ chối (trước đây luôn báo thành công).
    try {
      const res = await savePricingConfigAudited(newConfig);
      if (!res.success) {
        console.warn('Could not persist pricing config to Supabase:', res.error);
      }
      return res;
    } catch (e: any) {
      const error = e?.message || 'Lỗi không xác định khi lưu công thức.';
      console.warn('Could not persist pricing config to Supabase:', error);
      return { success: false as const, error };
    }
  };

  /**
   * Cấu hình đưa xuống views. KHÔNG bơm bộ số mặc định nào; chỉ bù ĐÚNG MỘT ô bằng giá trị
   * thật của nguồn phí nền tảng (nếu đã cấu hình) để số hiển thị = số engine tính.
   *
   * Vì sao phải bù: các view storefront vẫn tổng hợp phụ phí từ
   * `platformCommissionPercent + paymentGatewayFeePercent + designerRoyaltyPercent`, trong
   * khi ô `platformCommissionPercent` đã bị engine NGỪNG đọc và /admin cũng không còn ghi
   * (ô disabled "đã ngừng dùng") ⇒ trong DB nó là `undefined` ⇒ view hiện `—` cho phí nền
   * tảng trong lúc engine vẫn tính đủ phí đó ⇒ lệch số.
   *
   * Engine KHÔNG đọc `platformCommissionPercent` trong công thức nữa
   * (`pricingEngine.ts:426-428`), nên phép bù này không thể làm engine tính khác đi.
   */
  const effectivePricingConfig: InkiriCostFormulaConfig | null = useMemo(() => {
    if (!pricingConfig) return null;
    return {
      ...pricingConfig,
      platformCommissionPercent:
        marketplaceFeePercent !== null ? marketplaceFeePercent : pricingConfig.platformCommissionPercent ?? null,
    } as InkiriCostFormulaConfig;
  }, [pricingConfig, marketplaceFeePercent]);

  const handleUpdateSiteContent = async (newContent: SiteContentConfig) => {
    setSiteContent(newContent);
    // Trả kết quả THẬT cho panel để nó chỉ báo "đã lưu" khi DB nhận (trước đây panel tự báo
    // thành công trước khi hàm này chạy xong).
    const res = await dbService.saveSiteContent(newContent);
    if (!res.success) {
      console.warn('Could not save site content to Supabase:', res.error);
    }
    return res;
  };

  return {
    siteContent,
    pricingConfig,
    effectivePricingConfig,
    handleUpdateSiteContent,
    handleUpdatePricingConfig,
  };
}
