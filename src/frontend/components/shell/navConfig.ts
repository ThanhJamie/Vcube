/**
 * navConfig — cấu hình điều hướng của 2 console (`/lab`, `/designer`), tách khỏi App.tsx
 * (Phase 3c). `id` của mỗi mục PHẢI khớp tab id trong view tương ứng:
 *   - `/lab`      -> `TabId` của `views/WorkshopSettingsView.tsx`
 *   - `/designer` -> `activeTab` của `views/DesignerDashboardView.tsx`
 */

import type { ElementType } from 'react';
import {
  Boxes,
  ClipboardList,
  History,
  Layers,
  LayoutDashboard,
  MessagesSquare,
  Package,
  Printer,
  Settings,
  UploadCloud,
  Wallet,
} from 'lucide-react';

export type DashboardNavItem = { id: string; label: string; icon: ElementType };
export type DashboardNavGroup = { label: string; items: DashboardNavItem[] };

export const LAB_NAV: DashboardNavGroup[] = [
  {
    label: 'Vận hành',
    items: [
      { id: 'queue', label: 'Hàng đợi việc', icon: ClipboardList },
      { id: 'machines', label: 'Máy in', icon: Printer },
      { id: 'materials', label: 'Vật liệu & kho', icon: Layers },
      { id: 'accessories', label: 'Phụ kiện', icon: Package },
    ],
  },
  {
    label: 'Quản trị',
    items: [
      { id: 'audit_trail', label: 'Sổ kho', icon: History },
      { id: 'preferences', label: 'Cấu hình xưởng', icon: Settings },
    ],
  },
];

export const DESIGNER_NAV: DashboardNavGroup[] = [
  {
    label: 'Ấn phẩm',
    items: [
      { id: 'overview', label: 'Tổng quan & doanh thu', icon: LayoutDashboard },
      { id: 'models', label: 'Quản lý ấn phẩm', icon: Boxes },
      { id: 'wizard', label: 'Đăng tải & cấu hình', icon: UploadCloud },
    ],
  },
  {
    label: 'Kinh doanh',
    items: [
      { id: 'requests', label: 'Yêu cầu CAD & chat', icon: MessagesSquare },
      { id: 'payouts', label: 'Quyết toán tiền mặt', icon: Wallet },
    ],
  },
];
