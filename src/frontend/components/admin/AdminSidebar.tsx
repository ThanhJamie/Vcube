import React, { useEffect, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { AdminNavSection } from '../../types';
import { Icon } from '@frontend/ui';
import { dbService } from '../../../backend/supabase/database';

export type { AdminNavSection };

interface AdminSidebarProps {
  activeSection: AdminNavSection;
  onSelectSection: (section: AdminNavSection) => void;
  ordersCount: number;
  activeJobsCount: number;
  productsCount: number;
  materialsCount: number;
  accessoriesCount: number;
  lowStockCount: number;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onNavigateHome: () => void;
}

/**
 * DỮ LIỆU điều hướng của `/admin` — MỘT nguồn sự thật cho cả `AdminSidebar` (bản cũ, vẫn
 * giữ nguyên hành vi) và shell `AppShell`+`SideNav` mới ở `AdminDashboardView`.
 * Lý do tách ra: trước đây mảng 16 mục nằm trong thân component nên nếu dựng thêm một
 * `SideNav` ở chỗ khác thì danh sách nhãn sẽ bị chép đôi và trôi lệch.
 */
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

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeSection,
  onSelectSection,
  ordersCount,
  activeJobsCount,
  productsCount,
  materialsCount,
  accessoriesCount,
  lowStockCount,
  isOpenMobile,
  onCloseMobile,
  onNavigateHome,
}) => {
  const { language } = useLanguage();
  const isVi = language === 'vi';
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [navSearch, setNavSearch] = useState<string>('');

  // ==========================================================================
  // SỐ MÁY IN TRÊN BADGE — đọc từ NGUỒN THẬT (bảng `printer_fleet`).
  // Không lấy từ state `printers` của App: state đó seed từ fixture `PRINTER_PROFILES`
  // + localStorage `vcube_printers`, nên đã từng hiện "8 máy" khi DB có 0 dòng.
  // Chưa tải xong / lỗi / bảng rỗng ⇒ `null` ⇒ ẨN badge: "chưa khai báo máy nào"
  // khác "0 máy đang chạy", nên không in "0 máy" (data-honesty.md AD-05/CI-05).
  // ==========================================================================
  const [fleetPrintersCount, setFleetPrintersCount] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    dbService
      .getPrinters()
      .then((rows) => {
        if (isMounted) setFleetPrintersCount(Array.isArray(rows) ? rows.length : 0);
      })
      .catch(() => {
        if (isMounted) setFleetPrintersCount(null);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const fleetBadge =
    fleetPrintersCount !== null && fleetPrintersCount > 0 ? `${fleetPrintersCount} máy` : null;

  // Nhãn điều hướng theo miền nghiệp vụ. `id` giữ nguyên để KHÔNG phá deep-link /admin/<id>.
  const navItems = buildAdminNavGroups(isVi, {
    ordersCount,
    activeJobsCount,
    productsCount,
    materialsCount,
    accessoriesCount,
    lowStockCount,
    fleetBadge,
  });

  // Filter items by navSearch if active
  const filteredNavGroups = navItems.map(group => {
    if (!navSearch.trim()) return group;
    const q = navSearch.toLowerCase().trim();
    const filteredItems = group.items.filter(item => 
      item.label.toLowerCase().includes(q) || 
      item.id.toLowerCase().includes(q) ||
      (group.group && group.group.toLowerCase().includes(q))
    );
    return { ...group, items: filteredItems };
  }).filter(group => group.items.length > 0);

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-surface-inverse/70 z-drawer lg:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-dvh bg-surface-inverse text-on-inverse flex flex-col z-drawer transition-all duration-300 ease-in-out border-r border-surface-inverse-raised shrink-0 ${
          isOpenMobile ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'lg:w-20' : 'lg:w-72'}`}
      >
        {/* Brand Header & Collapse Toggle */}
        <div className="p-3.5 sm:p-4 border-b border-surface-inverse-raised flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-md bg-primary flex items-center justify-center text-primary-fg font-bold shadow-e2 shrink-0">
              <Icon name="deployed_code" size={24} />
            </div>
            {!isCollapsed && (
              <div className="truncate">
                <div className="flex items-center gap-1.5">
                  <span className="font-tech font-bold text-sm tracking-wider text-on-inverse">VCUBE</span>
                </div>
                <p className="text-xs text-on-inverse/70 font-sans truncate">
                  {isVi ? 'Hệ Điều Hành Xưởng In' : 'Admin & Production OS'}
                </p>
              </div>
            )}
          </div>

          {/* Desktop Collapse Button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex p-1.5 text-on-inverse/70 hover:text-on-inverse hover:bg-surface-inverse-raised rounded-lg transition-colors cursor-pointer"
            title={isCollapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
          >
            <Icon name={isCollapsed ? 'chevron_right' : 'chevron_left'} size={20} />
          </button>

          {/* Mobile Close Button */}
          <button aria-label="Đóng"
            onClick={onCloseMobile}
            className="lg:hidden p-1 text-on-inverse/70 hover:text-on-inverse rounded-sm cursor-pointer"
          >
            <Icon name="close" size={24} />
          </button>
        </div>

        {/* Quick Search */}
        {!isCollapsed && (
          <div className="px-3 pt-3 pb-1">
            <div className="relative">
              <input
                type="text"
                value={navSearch}
                onChange={(e) => setNavSearch(e.target.value)}
                placeholder={isVi ? 'Tìm nhanh theo tên mục (kho, máy in, giá...)' : 'Find a section by name (warehouse, printer, pricing...)'}
                className="w-full pl-8 pr-7 py-1.5 bg-surface-inverse-raised border border-surface-inverse-raised rounded-lg text-xs text-on-inverse placeholder:text-on-inverse/70 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
              <Icon name="search" size={16} className="text-on-inverse/70 absolute left-2.5 top-2 pointer-events-none" />
              {navSearch && (
                <button aria-label="Xoá tìm kiếm"
                  onClick={() => setNavSearch('')}
                  className="absolute right-2 top-1.5 text-on-inverse/70 hover:text-on-inverse cursor-pointer p-0.5"
                >
                  <Icon name="close" size={18} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Navigation List with Group Headers */}
        <nav className="flex-1 overflow-y-auto px-2 sm:px-3 py-3 space-y-4 scrollbar-thin scrollbar-thumb-line">
          {filteredNavGroups.length === 0 && !isCollapsed && (
            <div className="p-4 text-center text-xs text-on-inverse/70 space-y-1">
              <Icon name="search_off" size={24} className="text-on-inverse/70 block" />
              <p>{isVi ? 'Không tìm thấy menu phù hợp' : 'No sections matched'}</p>
            </div>
          )}
          {filteredNavGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1">
              {group.group && !isCollapsed && (
                <div className="px-3 pb-1 pt-1.5">
                  <span className="text-xs font-tech font-bold uppercase tracking-widest text-accent">
                    {group.group}
                  </span>
                </div>
              )}

              {group.group && isCollapsed && (
                <div className="my-2 border-t border-surface-inverse-raised/60" />
              )}

              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = activeSection === item.id;
                  return (
                    <div key={item.id} className="relative group">
                      <button
                        onClick={() => {
                          onSelectSection(item.id);
                          onCloseMobile();
                        }}
                        className={`w-full flex items-center ${
                          isCollapsed ? 'justify-center px-2 py-2.5' : 'justify-between px-3 py-2'
                        } rounded-lg text-xs font-medium transition-all cursor-pointer ${
                          isActive
                            ? 'bg-primary text-primary-fg font-bold shadow-e1 ring-1 ring-accent/30'
                            : 'text-on-inverse/70 hover:text-on-inverse hover:bg-surface-inverse-raised/80'
                        }`}
                      >
                        <div className={`flex items-center gap-2.5 min-w-0 ${isCollapsed ? 'justify-center' : ''}`}>
                          <Icon name={item.icon} size={20} className={`shrink-0 transition-colors ${ isActive ? 'text-primary-fg' : 'text-on-inverse/70 group-hover:text-on-inverse' }`} />
                          {!isCollapsed && <span className="truncate">{item.label}</span>}
                        </div>

                        {!isCollapsed && item.badge && (
                          <span
                            className={`text-xs font-tech font-bold px-1.5 py-0.5 rounded-sm shrink-0 ${
                              isActive ? 'bg-primary-fg/20 text-primary-fg' : item.badgeColor || 'bg-on-inverse/10 text-on-inverse'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </button>

                      {/* Floating Tooltip in Collapsed Mode */}
                      {isCollapsed && (
                        <div className="hidden group-hover:flex absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-surface-inverse text-on-inverse text-xs font-bold rounded-lg border border-surface-inverse-raised shadow-e3 z-panel whitespace-nowrap items-center gap-2 pointer-events-none">
                          <span>{item.label}</span>
                          {item.badge && (
                            <span className="text-xs font-tech px-1.5 py-0.2 rounded-sm bg-on-inverse/20 text-on-inverse">
                              {item.badge}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Sidebar Footer: Quick Home Switch & System Telemetry */}
        <div className="p-3 border-t border-surface-inverse-raised space-y-2 bg-surface-inverse/50">
          <button
            onClick={onNavigateHome}
            className={`w-full flex items-center ${
              isCollapsed ? 'justify-center p-2' : 'justify-center gap-2 py-2 px-3'
            } bg-surface-inverse-raised hover:bg-surface-inverse-raised text-on-inverse text-xs font-bold rounded-lg transition-colors cursor-pointer`}
            title={isVi ? 'Xem Cửa Hàng (Client View)' : 'View Storefront'}
          >
            <Icon name="storefront" size={18} className="text-accent" />
            {!isCollapsed && <span>{isVi ? 'Xem Cửa Hàng' : 'Storefront'}</span>}
          </button>

          {!isCollapsed && (
            <div className="flex items-center justify-center px-2 pt-1 text-xs text-on-inverse/70">
              <span>{isVi ? 'Bảng quản trị VCUBE' : 'VCUBE admin console'}</span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;
