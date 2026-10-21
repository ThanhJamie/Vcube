// TabId + nhãn segmented control của /lab — moved verbatim từ WorkshopSettingsView.tsx (Phase 4c).
export type TabId = 'queue' | 'machines' | 'materials' | 'accessories' | 'audit_trail' | 'preferences';

/**
 * Danh sách tab hợp lệ của `/lab` — PHẢI khớp `LAB_NAV` trong `src/App.tsx`
 * (`SideNav` dựng ở đó trỏ tới `/lab/<id>`).
 */
export const LAB_TAB_IDS: TabId[] = [
  'queue',
  'machines',
  'materials',
  'accessories',
  'audit_trail',
  'preferences',
];

/** Nhãn segmented control §3.6 — `setActiveTab` vẫn điều hướng `/lab/<id>`. */
export const LAB_TAB_LABELS: Record<TabId, string> = {
  queue: 'Hàng đợi',
  machines: 'Máy in',
  materials: 'Vật liệu',
  accessories: 'Phụ kiện',
  audit_trail: 'Sổ kho',
  preferences: 'Cấu hình',
};

