import { AdminNavSection } from '@/types';

export type { AdminNavSection };

export interface AdminNavItem {
  id: AdminNavSection;
  label: string;
  /** Tên glyph Material Symbols (map sang lucide qua `ui/Icon`). */
  icon: string;
  /** Badge số — CHỈ truyền khi > 0 (xem `docs/design/data-honesty.md`). */
  badge?: string | null;
  badgeColor?: string;
}

export interface AdminNavGroup {
  group?: string;
  items: AdminNavItem[];
}

export interface AdminNavCounts {
  ordersCount: number;
  activeJobsCount: number;
  productsCount: number;
  materialsCount: number;
  accessoriesCount: number;
  lowStockCount: number;
  /** Badge số máy in; `null` = chưa khai máy nào ⇒ KHÔNG hiện badge. */
  fleetBadge: string | null;
}

export function buildAdminNavGroups(
  {
    ordersCount,
    activeJobsCount,
    productsCount,
    materialsCount,
    accessoriesCount,
    lowStockCount,
    fleetBadge,
  }: AdminNavCounts,
): AdminNavGroup[] {
  return [
    {
      group: 'Tổng quan',
      items: [
        {
          id: 'overview' as AdminNavSection,
          label: 'Tổng Quan Điều Hành',
          icon: 'dashboard',
          badge: null
        }
      ]
    },
    {
      group: 'Xưởng in & Thiết bị',
      items: [
        {
          id: 'partners' as AdminNavSection,
          label: 'Mạng Lưới Xưởng In MES',
          icon: 'factory',
          badge: null,
          badgeColor: 'bg-surface-muted text-fg-muted border border-line'
        },
        {
          id: 'machines' as AdminNavSection,
          label: 'Đội Máy In 3D',
          icon: 'print',
          badge: fleetBadge,
          badgeColor: 'bg-surface-muted text-fg-muted border border-line'
        }
      ]
    },
    {
      group: 'Nhà thiết kế',
      items: [
        {
          id: 'designers' as AdminNavSection,
          label: 'Nhà Thiết Kế & Bản Quyền',
          icon: 'draw',
          badge: null
        }
      ]
    },
    {
      group: 'Khách hàng',
      items: [
        {
          id: 'users' as AdminNavSection,
          label: 'Khách Hàng & Hồ Sơ KYC',
          icon: 'manage_accounts',
          badge: null
        }
      ]
    },
    {
      group: 'Danh mục & Định giá',
      items: [
        {
          id: 'pricing' as AdminNavSection,
          label: 'Công Thức Giá Inkiri v3.4',
          icon: 'tune',
          badge: null
        },
        {
          id: 'materials' as AdminNavSection,
          label: 'Danh Mục Nhựa & Resin',
          icon: 'layers',
          badge: materialsCount > 0 ? `${materialsCount}` : null,
          badgeColor: 'bg-surface-muted text-fg-muted border border-line'
        },
        {
          id: 'hardware' as AdminNavSection,
          label: 'Phụ Kiện, Ốc Cấy & Nam Châm',
          icon: 'extension',
          badge: accessoriesCount > 0 ? `${accessoriesCount}` : null,
          badgeColor: 'bg-surface-muted text-fg-muted border border-line'
        },
        {
          id: 'quote-calc' as AdminNavSection,
          label: 'Báo Giá Dự Toán BOM',
          icon: 'calculate',
          badge: null
        }
      ]
    },
    {
      group: 'Vận hành sản xuất',
      items: [
        {
          id: 'queue' as AdminNavSection,
          label: 'Hàng Đợi & Kanban 8 Nấc',
          icon: 'precision_manufacturing',
          badge: activeJobsCount > 0 ? `${activeJobsCount}` : null,
          badgeColor: 'bg-surface-muted text-fg-muted border border-line'
        },
        {
          id: 'orders' as AdminNavSection,
          label: 'Đơn Hàng & Điều Phối Trạm In',
          icon: 'receipt_long',
          badge: ordersCount > 0 ? `${ordersCount}` : null,
          badgeColor: 'bg-surface-muted text-fg-muted border border-line'
        },
        {
          id: 'inventory' as AdminNavSection,
          label: 'Kho Vật Liệu & Vị Trí Kệ',
          icon: 'shelves',
          badge: lowStockCount > 0 ? `${lowStockCount}` : null,
          badgeColor: 'bg-surface-muted text-fg-muted border border-line'
        }
      ]
    },
    {
      group: 'CỬA HÀNG & HỆ THỐNG',
      items: [
        {
          id: 'products' as AdminNavSection,
          label: 'Sản Phẩm & Danh Mục 3D',
          icon: 'inventory_2',
          badge: productsCount > 0 ? `${productsCount}` : null,
          badgeColor: 'bg-surface-muted text-fg-muted border border-line'
        },
        {
          id: 'storefront' as AdminNavSection,
          label: 'Cấu Hình Trang Chủ',
          icon: 'storefront',
          badge: null
        },
        {
          id: 'seo' as AdminNavSection,
          label: 'Quản Trị SEO & Thẻ Mô Tả',
          icon: 'travel_explore',
          badge: null
        },
        {
          id: 'settings' as AdminNavSection,
          label: 'Cài Đặt Xưởng & Hệ Thống',
          icon: 'settings',
          badge: null
        }
      ]
    }];
}
