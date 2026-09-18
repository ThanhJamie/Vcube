import { AdminNavSection } from '../../types';

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
  isVi: boolean,
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
      group: isVi ? 'Tổng quan' : 'Overview',
      items: [
        {
          id: 'overview' as AdminNavSection,
          label: isVi ? 'Tổng Quan Điều Hành' : 'Executive Overview',
          icon: 'dashboard',
          badge: null
        }
      ]
    },
    {
      group: isVi ? 'Xưởng in & Thiết bị' : 'Workshops & Fleet',
      items: [
        {
          id: 'partners' as AdminNavSection,
          label: isVi ? 'Mạng Lưới Xưởng In MES' : 'Workshop MES Network',
          icon: 'factory',
          badge: null,
          badgeColor: 'bg-on-inverse/10 text-on-inverse border border-on-inverse/15'
        },
        {
          id: 'machines' as AdminNavSection,
          label: isVi ? 'Đội Máy In 3D (Fleet)' : '3D Printer Fleet',
          icon: 'print',
          badge: fleetBadge,
          badgeColor: 'bg-on-inverse/10 text-on-inverse border border-on-inverse/15'
        }
      ]
    },
    {
      group: isVi ? 'Nhà thiết kế' : 'Designers',
      items: [
        {
          id: 'designers' as AdminNavSection,
          label: isVi ? 'Nhà Thiết Kế & Bản Quyền' : 'Designers & IP Rights',
          icon: 'draw',
          badge: null
        }
      ]
    },
    {
      group: isVi ? 'Khách hàng' : 'Customers',
      items: [
        {
          id: 'users' as AdminNavSection,
          label: isVi ? 'Khách Hàng & Hồ Sơ KYC' : 'Customers & Accounts',
          icon: 'manage_accounts',
          badge: null
        }
      ]
    },
    {
      group: isVi ? 'Danh mục & Định giá' : 'Catalog & Pricing',
      items: [
        {
          id: 'pricing' as AdminNavSection,
          label: isVi ? 'Công Thức Giá Inkiri v3.4' : 'Inkiri Pricing Engine',
          icon: 'tune',
          badge: null
        },
        {
          id: 'materials' as AdminNavSection,
          label: isVi ? 'Danh Mục Nhựa & Resin' : 'Filaments & Resins',
          icon: 'layers',
          badge: materialsCount > 0 ? `${materialsCount}` : null,
          badgeColor: 'bg-on-inverse/10 text-on-inverse border border-on-inverse/15'
        },
        {
          id: 'hardware' as AdminNavSection,
          label: isVi ? 'Phụ Kiện, Ốc Cấy & Nam Châm' : 'Hardware & Fasteners',
          icon: 'extension',
          badge: accessoriesCount > 0 ? `${accessoriesCount}` : null,
          badgeColor: 'bg-on-inverse/10 text-on-inverse border border-on-inverse/15'
        },
        {
          id: 'quote-calc' as AdminNavSection,
          label: isVi ? 'Báo Giá Dự Toán BOM' : 'BOM Quote Calculator',
          icon: 'calculate',
          badge: null
        }
      ]
    },
    {
      group: isVi ? 'Vận hành sản xuất' : 'Production Operations',
      items: [
        {
          id: 'queue' as AdminNavSection,
          label: isVi ? 'Hàng Đợi & Kanban 8 Nấc' : '8-Stage MES Kanban',
          icon: 'precision_manufacturing',
          badge: activeJobsCount > 0 ? `${activeJobsCount}` : null,
          badgeColor: 'bg-on-inverse/10 text-on-inverse border border-on-inverse/15'
        },
        {
          id: 'orders' as AdminNavSection,
          label: isVi ? 'Đơn Hàng & Điều Phối Hub' : 'Orders & Dispatch',
          icon: 'receipt_long',
          badge: ordersCount > 0 ? `${ordersCount}` : null,
          badgeColor: 'bg-on-inverse/10 text-on-inverse border border-on-inverse/15'
        },
        {
          id: 'inventory' as AdminNavSection,
          label: isVi ? 'Kho Vật Liệu & Vị Trí Kệ' : 'Warehouse Inventory',
          icon: 'shelves',
          badge: lowStockCount > 0 ? `${lowStockCount}` : null,
          badgeColor: 'bg-on-inverse/10 text-on-inverse border border-on-inverse/15'
        }
      ]
    },
    {
      group: isVi ? 'CỬA HÀNG & HỆ THỐNG' : 'STOREFRONT & SYSTEM',
      items: [
        {
          id: 'products' as AdminNavSection,
          label: isVi ? 'Sản Phẩm & Catalog 3D' : 'Products & Catalog',
          icon: 'inventory_2',
          badge: productsCount > 0 ? `${productsCount}` : null,
          badgeColor: 'bg-on-inverse/10 text-on-inverse border border-on-inverse/15'
        },
        {
          id: 'storefront' as AdminNavSection,
          label: isVi ? 'Landing Page & CMS' : 'Landing Page CMS',
          icon: 'storefront',
          badge: null
        },
        {
          id: 'seo' as AdminNavSection,
          label: isVi ? 'Quản Trị SEO & Metadata' : 'SEO & Metadata',
          icon: 'travel_explore',
          badge: null
        },
        {
          id: 'settings' as AdminNavSection,
          label: isVi ? 'Cài Đặt Xưởng & Cloud' : 'Settings & Cloud',
          icon: 'settings',
          badge: null
        }
      ]
    }];
}
