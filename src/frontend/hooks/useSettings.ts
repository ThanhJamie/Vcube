/**
 * useSettings — cầu nối React ↔ `settingsService` (4 kho cấu hình trong Supabase).
 *
 * VÌ SAO CẦN
 * -----------------------------------------------------------------------------
 * `settingsService` đã có cache + realtime + audit + validate, nhưng trước Đợt 6 nó có
 * **0 người gọi**: `bootstrapSettings()` không được gọi ở đâu và UI admin đọc hằng số
 * trong code. Hook này là đường ĐỌC cho component, để yêu cầu của chủ dự án — "mọi
 * thông tin đều chỉnh được trong admin" — có đường thực thi thật
 * (`docs/plans/09-admin-settings.md` §3.2 #2, `docs/plans/13-dot6-briefs.md` §N1).
 *
 * LUẬT TRUNG THỰC DỮ LIỆU (`docs/design/data-honesty.md`)
 * -----------------------------------------------------------------------------
 *   * `data === null` = CHƯA CẤU HÌNH. KHÔNG rơi về giá trị mặc định/đoán.
 *   * `loading = true` chỉ khi cache CHƯA từng được đọc (`peekSettings() !== undefined`
 *     mới là "đã đọc"; service phân biệt rõ `undefined` = chưa đọc với `null` = đã đọc
 *     nhưng chưa cấu hình).
 *   * Lỗi đọc DB trả nguyên trong `error`, KHÔNG nuốt im lặng.
 *   * Không gọi DB trong lúc render: đọc cache trước, chỉ nạp khi cache rỗng.
 */
import { useEffect, useState } from 'react';
import {
  getStore,
  peekSettings,
  settingsAccessors,
  subscribeSettings,
  type PricingGlobalSettings,
  type SettingsStore,
} from '@backend/services/settingsService';
import type { AppSettings } from '@backend/supabase/mappers';
import type { SiteContentConfig } from '../../types';

export interface UseSettingsResult<T> {
  /** `null` = CHƯA CẤU HÌNH (khác hẳn lỗi). Không có giá trị mặc định nào được bịa. */
  data: T | null;
  /** `true` khi cache chưa từng được đọc xong (lần nạp đầu). */
  loading: boolean;
  /** Lỗi đọc DB (nếu có) — UI phải nói thật, không hiển thị số đoán thay thế. */
  error: string | null;
}

interface SettingsState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Đọc MỘT kho. `accessor` là hàm đọc cache đồng bộ của `settingsService`
 * (`settingsAccessors.*`) nên phải là tham chiếu ổn định — không tạo closure mới mỗi render.
 */
function useSettingsStore<T>(store: SettingsStore, accessor: () => T | null): UseSettingsResult<T> {
  const [state, setState] = useState<SettingsState<T>>(() => ({
    data: accessor(),
    loading: peekSettings(store) === undefined,
    error: null,
  }));

  useEffect(() => {
    let alive = true;

    const syncFromCache = () => {
      if (!alive) return;
      setState((prev) => ({
        data: accessor(),
        loading: peekSettings(store) === undefined,
        error: prev.error,
      }));
    };

    // Gọi ngay 1 lần + tự cập nhật khi cache đổi (admin vừa ghi) hoặc realtime báo.
    const unsubscribe = subscribeSettings(syncFromCache);

    if (peekSettings(store) === undefined) {
      // Cache rỗng (bootstrap chưa chạy / vừa lỗi) ⇒ tự nạp một lần. Lỗi trả nguyên vẹn.
      void getStore(store).then((res) => {
        if (!alive) return;
        syncFromCache();
        if (res.error) setState((prev) => ({ ...prev, loading: false, error: res.error }));
      });
    }

    return () => {
      alive = false;
      unsubscribe();
    };
  }, [store, accessor]);

  return state;
}

/** `app_settings` — pháp lý & định danh. `data === null` ⇒ chưa có hàng cấu hình. */
export function useAppSettings(): UseSettingsResult<AppSettings> {
  return useSettingsStore<AppSettings>('app_settings', settingsAccessors.appSettings);
}

/** `pricing_global_settings` — VAT/điện/nhân công. TỪNG field có thể là `null`. */
export function usePricingGlobalSettings(): UseSettingsResult<PricingGlobalSettings> {
  return useSettingsStore<PricingGlobalSettings>('pricing_global_settings', settingsAccessors.pricingGlobal);
}

/** `site_content` — nội dung storefront. `null` ⇒ hàng chưa tồn tại. */
export function useSiteContent(): UseSettingsResult<SiteContentConfig> {
  return useSettingsStore<SiteContentConfig>('site_content', settingsAccessors.siteContent);
}
