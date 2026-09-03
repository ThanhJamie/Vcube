import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

export type AdminNavSection =
  | 'overview'
  // Commerce
  | 'orders'
  | 'products'
  // Production
  | 'queue'
  | 'machines'
  | 'inventory'
  // Pricing (Unified Inkiri Setup Page)
  | 'pricing-setup'
  | 'cost-rules'
  | 'materials'
  | 'hardware'
  | 'quote-calc'
  // System
  | 'storefront'
  | 'settings';

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

  const navItems = [
    {
      group: null,
      items: [
        {
          id: 'overview' as AdminNavSection,
          label: isVi ? 'Tổng Quan Bảng Điều Khiển' : 'Dashboard Overview',
          icon: 'dashboard',
          badge: null
        }
      ]
    },
    {
      group: isVi ? 'THƯƠNG MẠI & BÁN HÀNG' : 'COMMERCE',
      items: [
        {
          id: 'orders' as AdminNavSection,
          label: isVi ? 'Đơn Hàng' : 'Orders',
          icon: 'receipt_long',
          badge: ordersCount > 0 ? `${ordersCount}` : null,
          badgeColor: 'bg-blue-100 text-blue-800'
        },
        {
          id: 'products' as AdminNavSection,
          label: isVi ? 'Sản Phẩm & Bản In' : 'Products & Catalog',
          icon: 'inventory_2',
          badge: `${productsCount}`,
          badgeColor: 'bg-slate-100 text-slate-700'
        }
      ]
    },
    {
      group: isVi ? 'VẬN HÀNH SẢN XUẤT' : 'PRODUCTION',
      items: [
        {
          id: 'queue' as AdminNavSection,
          label: isVi ? 'Hàng Đợi Sản Xuất' : 'Production Queue',
          icon: 'precision_manufacturing',
          badge: activeJobsCount > 0 ? `${activeJobsCount} đang in` : null,
          badgeColor: 'bg-amber-100 text-amber-900 animate-pulse'
        },
        {
          id: 'machines' as AdminNavSection,
          label: isVi ? 'Đội Máy In 3D' : 'Machines Fleet',
          icon: 'print',
          badge: `${printersCount}`,
          badgeColor: 'bg-slate-100 text-slate-700'
        },
        {
          id: 'inventory' as AdminNavSection,
          label: isVi ? 'Kho & Vị Trí Kệ' : 'Inventory & Bins',
          icon: 'shelves',
          badge: lowStockCount > 0 ? `⚠ ${lowStockCount}` : null,
          badgeColor: 'bg-rose-100 text-rose-800'
        }
      ]
    },
    {
      group: isVi ? 'ĐỊNH GIÁ & TÍNH TOÁN' : 'PRICING & SETUP',
      items: [
        {
          id: 'pricing-setup' as AdminNavSection,
          label: isVi ? 'Cấu Hình Định Giá Inkiri' : 'Inkiri Pricing Setup',
          icon: 'tune',
          badge: 'Inkiri v3.4',
          badgeColor: 'bg-teal-100 text-teal-800 font-tech font-bold'
        }
      ]
    },
    {
      group: isVi ? 'HỆ THỐNG & CẤU HÌNH' : 'SYSTEM',
      items: [
        {
          id: 'storefront' as AdminNavSection,
          label: isVi ? 'Giao Diện & Banner' : 'Storefront',
          icon: 'storefront',
          badge: null
        },
        {
          id: 'settings' as AdminNavSection,
          label: isVi ? 'Cài Đặt Xưởng In' : 'Settings',
          icon: 'settings',
          badge: null
        }
      ]
    }
  ];

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
        className={`fixed lg:sticky top-0 left-0 h-screen w-72 bg-[#091426] text-white flex flex-col z-50 transition-transform duration-200 ease-in-out border-r border-[#1E293B] shrink-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 sm:p-5 border-b border-[#1E293B] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#00687A] to-[#57DFFE] flex items-center justify-center text-white font-bold shadow-md">
              <span className="material-symbols-outlined text-xl">deployed_code</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-tech font-bold text-sm tracking-wider text-white">VCUBE</span>
                <span className="text-[9px] font-tech font-bold px-1.5 py-0.2 rounded bg-[#57DFFE]/20 text-[#57DFFE] border border-[#57DFFE]/30">
                  FORGE
                </span>
              </div>
              <p className="text-[11px] text-[#94A3B8] font-sans">
                {isVi ? 'Quản Trị Hệ Thống Xưởng' : 'Admin & Production OS'}
              </p>
            </div>
          </div>

          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1 text-[#94A3B8] hover:text-white rounded"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Navigation List with Group Headers */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-700">
          {navItems.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1">
              {group.group && (
                <div className="px-3 pb-1 pt-2">
                  <span className="text-[10px] font-tech font-bold uppercase tracking-widest text-[#64748B]">
                    {group.group}
                  </span>
                </div>
              )}

              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onSelectSection(item.id);
                        onCloseMobile();
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all group cursor-pointer ${
                        isActive
                          ? 'bg-[#00687A] text-white font-bold shadow-sm'
                          : 'text-[#94A3B8] hover:text-white hover:bg-[#1E293B]/70'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`material-symbols-outlined text-lg transition-colors ${
                            isActive ? 'text-white' : 'text-[#64748B] group-hover:text-white'
                          }`}
                        >
                          {item.icon}
                        </span>
                        <span className="truncate">{item.label}</span>
                      </div>

                      {item.badge && (
                        <span
                          className={`text-[10px] font-tech font-bold px-1.5 py-0.5 rounded shrink-0 ${
                            isActive ? 'bg-white/20 text-white' : item.badgeColor || 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
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
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-[#1E293B] hover:bg-[#334155] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm text-[#57DFFE]">storefront</span>
            {isVi ? 'Xem Cửa Hàng (Client View)' : 'View Storefront'}
          </button>

          <div className="flex items-center justify-between px-2 pt-1 text-[11px] text-[#64748B]">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Node Asia-SE1
            </span>
            <span className="font-tech text-[10px]">v3.4.2</span>
          </div>
        </div>
      </aside>
    </>
  );
};
