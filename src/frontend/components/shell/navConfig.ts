/**
 * navConfig — cấu hình điều hướng của 2 console (`/lab`, `/designer`), tách khỏi App.tsx
 * (Phase 3c). `id` của mỗi mục PHẢI khớp tab id trong view tương ứng:
 *   - `/lab`      -> `TabId` của `views/WorkshopSettingsView.tsx`
 *   - `/designer` -> `activeTab` của `views/DesignerDashboardView.tsx`
 */


export type DashboardNavItem = { id: string; label: string; icon: string };
export type DashboardNavGroup = { label: string; items: DashboardNavItem[] };

export const LAB_NAV: DashboardNavGroup[] = [
  {
    label: 'Vận hành',
    items: [
      { id: 'queue', label: 'Hàng đợi việc', icon: 'clipboard_list' },
      { id: 'machines', label: 'Máy in', icon: 'printer' },
      { id: 'materials', label: 'Vật liệu & kho', icon: 'layers' },
      { id: 'accessories', label: 'Phụ kiện', icon: 'package' },
    ],
  },
  {
    label: 'Quản trị',
    items: [
      { id: 'audit_trail', label: 'Sổ kho', icon: 'history' },
      { id: 'preferences', label: 'Cấu hình xưởng', icon: 'settings' },
    ],
  },
];

export const DESIGNER_NAV: DashboardNavGroup[] = [
  {
    label: 'Ấn phẩm',
    items: [
      { id: 'overview', label: 'Tổng quan & doanh thu', icon: 'dashboard' },
      { id: 'models', label: 'Quản lý ấn phẩm', icon: 'inventory_2' },
      { id: 'wizard', label: 'Đăng tải & cấu hình', icon: 'cloud_upload' },
    ],
  },
  {
    label: 'Kinh doanh',
    items: [
      { id: 'requests', label: 'Yêu cầu CAD & chat', icon: 'forum' },
      { id: 'payouts', label: 'Quyết toán tiền mặt', icon: 'account_balance_wallet' },
    ],
  },
];
