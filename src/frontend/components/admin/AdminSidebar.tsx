import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { AdminNavSection } from '../../types';

export type { AdminNavSection };

interface AdminSidebarProps {
  activeSection: AdminNavSection;
  onSelectSection: (section: AdminNavSection) => void;
  ordersCount: number;
  activeJobsCount: number;
  productsCount: number;
  printersCount: number;
  materialsCount: number;
  accessoriesCount: number;
  lowStockCount: number;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onNavigateHome: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeSection,
  onSelectSection,
  ordersCount,
  activeJobsCount,
  productsCount,
  printersCount,
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

  // Structured in 6 clearly numbered groups + storefront & settings
  const navItems = [
    {
      group: isVi ? 'GROUP 0: TỔNG QUAN ĐIỀU HÀNH' : 'GROUP 0: EXECUTIVE OVERVIEW',
      items: [
        {
          id: 'overview' as AdminNavSection,
          label: isVi ? 'Tổng Quan Điều Hành' : 'Executive Overview',
          icon: 'dashboard',
          badge: 'KPIs',
          badgeColor: 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
        }
      ]
    },
    {
      group: isVi ? 'GROUP 1: QUẢN LÝ XƯỞNG IN (MES HUBS)' : 'GROUP 1: WORKSHOP MES HUBS',
      items: [
        {
          id: 'partners' as AdminNavSection,
          label: isVi ? 'Mạng Lưới Xưởng In MES' : 'Workshop MES Network',
          icon: 'factory',
          badge: '3 Hubs',
          badgeColor: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
        },
        {
          id: 'machines' as AdminNavSection,
          label: isVi ? 'Đội Máy In 3D (Fleet)' : '3D Printer Fleet',
          icon: 'print',
          badge: `${printersCount} máy`,
          badgeColor: 'bg-slate-700 text-slate-300'
        }
      ]
    },
    {
      group: isVi ? 'GROUP 2: QUẢN LÝ DESIGNER' : 'GROUP 2: 3D DESIGNERS',
      items: [
        {
          id: 'designers' as AdminNavSection,
          label: isVi ? 'Nhà Thiết Kế & Bản Quyền' : 'Designers & IP Rights',
          icon: 'draw',
          badge: 'Bản Quyền',
          badgeColor: 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
        }
      ]
    },
    {
      group: isVi ? 'GROUP 3: QUẢN LÝ KHÁCH HÀNG' : 'GROUP 3: CUSTOMERS & KYC',
      items: [
        {
          id: 'users' as AdminNavSection,
          label: isVi ? 'Khách Hàng & Hồ Sơ KYC' : 'Customers & Accounts',
          icon: 'manage_accounts',
          badge: 'B2B/B2C',
          badgeColor: 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
        }
      ]
    },
    {
      group: isVi ? 'GROUP 4: CẤU HÌNH GIÁ INKIRI' : 'GROUP 4: INKIRI PRICING ENGINE',
      items: [
        {
          id: 'pricing' as AdminNavSection,
          label: isVi ? 'Công Thức Giá Inkiri v3.4' : 'Inkiri Pricing Engine',
          icon: 'tune',
          badge: 'v3.4 Inkiri',
          badgeColor: 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
        },
        {
          id: 'materials' as AdminNavSection,
          label: isVi ? 'Danh Mục Nhựa & Resin' : 'Filaments & Resins',
          icon: 'layers',
          badge: `${materialsCount}`,
          badgeColor: 'bg-slate-700 text-slate-300'
        },
        {
          id: 'hardware' as AdminNavSection,
          label: isVi ? 'Phụ Kiện, Ốc Cấy & Nam Châm' : 'Hardware & Fasteners',
          icon: 'extension',
          badge: `${accessoriesCount}`,
          badgeColor: 'bg-slate-700 text-slate-300'
        },
        {
          id: 'quote-calc' as AdminNavSection,
          label: isVi ? 'Báo Giá Dự Toán BOM' : 'BOM Quote Calculator',
          icon: 'calculate',
          badge: 'BOM',
          badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
        }
      ]
    },
    {
      group: isVi ? 'GROUP 5: VẬN HÀNH SẢN XUẤT (MES)' : 'GROUP 5: PRODUCTION OPERATIONS',
      items: [
        {
          id: 'queue' as AdminNavSection,
          label: isVi ? 'Hàng Đợi & Kanban 8 Nấc' : '8-Stage MES Kanban',
          icon: 'precision_manufacturing',
          badge: activeJobsCount > 0 ? `${activeJobsCount} in` : 'MES',
          badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
        },
        {
          id: 'orders' as AdminNavSection,
          label: isVi ? 'Đơn Hàng & Điều Phối Hub' : 'Orders & Dispatch',
          icon: 'receipt_long',
          badge: ordersCount > 0 ? `${ordersCount}` : null,
          badgeColor: 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
        },
        {
          id: 'inventory' as AdminNavSection,
          label: isVi ? 'Kho Vật Liệu & Vị Trí Kệ' : 'Warehouse Inventory',
          icon: 'shelves',
          badge: lowStockCount > 0 ? `⚠ ${lowStockCount}` : null,
          badgeColor: 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
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
          badge: `${productsCount}`,
          badgeColor: 'bg-slate-700 text-slate-300'
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
          badge: 'SERP',
          badgeColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
        },
        {
          id: 'settings' as AdminNavSection,
          label: isVi ? 'Cài Đặt Xưởng & Cloud' : 'Settings & Cloud',
          icon: 'settings',
          badge: null
        }
      ]
    }
  ];

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
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen bg-[#091426] text-white flex flex-col z-50 transition-all duration-300 ease-in-out border-r border-[#1E293B] shrink-0 ${
          isOpenMobile ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'lg:w-20' : 'lg:w-72'}`}
      >
        {/* Brand Header & Collapse Toggle */}
        <div className="p-3.5 sm:p-4 border-b border-[#1E293B] flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#00687A] to-[#57DFFE] flex items-center justify-center text-white font-bold shadow-md shrink-0">
              <span className="material-symbols-outlined text-xl">deployed_code</span>
            </div>
            {!isCollapsed && (
              <div className="truncate">
                <div className="flex items-center gap-1.5">
                  <span className="font-tech font-bold text-sm tracking-wider text-white">VCUBE</span>
                  <span className="text-[9px] font-tech font-bold px-1.5 py-0.2 rounded bg-[#57DFFE]/20 text-[#57DFFE] border border-[#57DFFE]/30">
                    FORGE MES
                  </span>
                </div>
                <p className="text-[11px] text-[#94A3B8] font-sans truncate">
                  {isVi ? 'Hệ Điều Hành Xưởng In' : 'Admin & Production OS'}
                </p>
              </div>
            )}
          </div>

          {/* Desktop Collapse Button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex p-1.5 text-[#94A3B8] hover:text-white hover:bg-[#1E293B] rounded-lg transition-colors cursor-pointer"
            title={isCollapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
          >
            <span className="material-symbols-outlined text-lg">
              {isCollapsed ? 'chevron_right' : 'chevron_left'}
            </span>
          </button>

          {/* Mobile Close Button */}
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1 text-[#94A3B8] hover:text-white rounded cursor-pointer"
          >
            <span className="material-symbols-outlined text-xl">close</span>
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
                placeholder={isVi ? 'Tìm nhanh (Group 0-5, máy in, kho...)...' : 'Quick find section...'}
                className="w-full pl-8 pr-7 py-1.5 bg-[#131F33] border border-[#1E293B] rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#00687A] focus:ring-1 focus:ring-[#00687A] transition-all"
              />
              <span className="material-symbols-outlined text-sm text-slate-400 absolute left-2.5 top-2 pointer-events-none">
                search
              </span>
              {navSearch && (
                <button
                  onClick={() => setNavSearch('')}
                  className="absolute right-2 top-1.5 text-slate-400 hover:text-white cursor-pointer p-0.5"
                >
                  <span className="material-symbols-outlined text-xs">close</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Navigation List with Group Headers */}
        <nav className="flex-1 overflow-y-auto px-2 sm:px-3 py-3 space-y-4 scrollbar-thin scrollbar-thumb-slate-700">
          {filteredNavGroups.length === 0 && !isCollapsed && (
            <div className="p-4 text-center text-xs text-slate-400 space-y-1">
              <span className="material-symbols-outlined text-xl text-slate-500 block">search_off</span>
              <p>{isVi ? 'Không tìm thấy menu phù hợp' : 'No sections matched'}</p>
            </div>
          )}
          {filteredNavGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1">
              {group.group && !isCollapsed && (
                <div className="px-3 pb-1 pt-1.5">
                  <span className="text-[9px] font-tech font-bold uppercase tracking-widest text-[#00A8C6]">
                    {group.group}
                  </span>
                </div>
              )}

              {group.group && isCollapsed && (
                <div className="my-2 border-t border-[#1E293B]/60" />
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
                        } rounded-xl text-xs font-medium transition-all cursor-pointer ${
                          isActive
                            ? 'bg-[#00687A] text-white font-bold shadow-sm ring-1 ring-[#57DFFE]/30'
                            : 'text-[#94A3B8] hover:text-white hover:bg-[#1E293B]/80'
                        }`}
                      >
                        <div className={`flex items-center gap-2.5 min-w-0 ${isCollapsed ? 'justify-center' : ''}`}>
                          <span
                            className={`material-symbols-outlined text-lg shrink-0 transition-colors ${
                              isActive ? 'text-white' : 'text-[#64748B] group-hover:text-white'
                            }`}
                          >
                            {item.icon}
                          </span>
                          {!isCollapsed && <span className="truncate">{item.label}</span>}
                        </div>

                        {!isCollapsed && item.badge && (
                          <span
                            className={`text-[10px] font-tech font-bold px-1.5 py-0.5 rounded shrink-0 ${
                              isActive ? 'bg-white/20 text-white' : item.badgeColor || 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </button>

                      {/* Floating Tooltip in Collapsed Mode */}
                      {isCollapsed && (
                        <div className="hidden group-hover:flex absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-[#091426] text-white text-xs font-bold rounded-lg border border-[#334155] shadow-xl z-50 whitespace-nowrap items-center gap-2 pointer-events-none">
                          <span>{item.label}</span>
                          {item.badge && (
                            <span className="text-[10px] font-tech px-1.5 py-0.2 rounded bg-white/20 text-white">
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
        <div className="p-3 border-t border-[#1E293B] space-y-2 bg-[#060D1A]/50">
          <button
            onClick={onNavigateHome}
            className={`w-full flex items-center ${
              isCollapsed ? 'justify-center p-2' : 'justify-center gap-2 py-2 px-3'
            } bg-[#1E293B] hover:bg-[#334155] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer`}
            title={isVi ? 'Xem Cửa Hàng (Client View)' : 'View Storefront'}
          >
            <span className="material-symbols-outlined text-sm text-[#57DFFE]">storefront</span>
            {!isCollapsed && <span>{isVi ? 'Xem Cửa Hàng' : 'Storefront'}</span>}
          </button>

          {!isCollapsed && (
            <div className="flex items-center justify-between px-2 pt-1 text-[11px] text-[#64748B]">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Node Asia-SE1
              </span>
              <span className="font-tech text-[10px]">v3.4.2 MES</span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;
