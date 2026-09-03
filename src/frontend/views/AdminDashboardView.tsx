import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Product,
  Order,
  SiteContentConfig,
  MaterialProfile,
  PrinterProfile,
  InkiriCostFormulaConfig,
  AccessoryItem
} from '../types';
import { useLanguage } from '../context/LanguageContext';
import { AdminSidebar, AdminNavSection } from '../components/admin/AdminSidebar';
import { AdminOverviewPanel } from '../components/admin/AdminOverviewPanel';
import { AdminOrdersPanel } from '../components/admin/AdminOrdersPanel';
import { AdminProductsPanel } from '../components/admin/AdminProductsPanel';
import { AdminProductionQueuePanel } from '../components/admin/AdminProductionQueuePanel';
import { AdminMachinesPanel } from '../components/admin/AdminMachinesPanel';
import { WarehouseInventoryPanel } from '../components/admin/WarehouseInventoryPanel';
import { AdminStorefrontPanel } from '../components/admin/AdminStorefrontPanel';
import { AdminSettingsPanel } from '../components/admin/AdminSettingsPanel';
import { PricingConfigPanel } from '../components/admin/PricingConfigPanel';

interface AdminDashboardViewProps {
  products: Product[];
  orders: Order[];
  siteContent: SiteContentConfig;
  materials: MaterialProfile[];
  printers: PrinterProfile[];
  accessories: AccessoryItem[];
  pricingConfig: InkiriCostFormulaConfig;
  onUpdateProduct: (product: Product) => void;
  onAddProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onUpdateOrderStatus: (orderId: string, newStageIndex: number, newStatus: Order['status'], progress?: number) => void;
  onUpdateSiteContent: (content: SiteContentConfig) => void;
  onUpdateMaterials: (materials: MaterialProfile[]) => void;
  onUpdatePrinters: (printers: PrinterProfile[]) => void;
  onUpdateAccessories: (accessories: AccessoryItem[]) => void;
  onUpdatePricingConfig: (config: InkiriCostFormulaConfig) => void;
  onNavigate: (screen: string, payload?: any) => void;
  onShowToast: (message: string) => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  products,
  orders,
  siteContent,
  materials,
  printers,
  accessories,
  pricingConfig,
  onUpdateProduct,
  onAddProduct,
  onDeleteProduct,
  onUpdateOrderStatus,
  onUpdateSiteContent,
  onUpdateMaterials,
  onUpdatePrinters,
  onUpdateAccessories,
  onUpdatePricingConfig,
  onNavigate,
  onShowToast,
}) => {
  const { language } = useLanguage();
  const isVi = language === 'vi';
  const { section: routeSection } = useParams<{ section?: string }>();
  const navigate = useNavigate();

  // Navigation State - synced with URL route
  const validSections: AdminNavSection[] = [
    'overview', 'orders', 'products', 'queue', 'machines', 'inventory',
    'pricing-setup', 'cost-rules', 'materials', 'hardware', 'quote-calc', 'storefront', 'settings'
  ];

  const initialSec: AdminNavSection = (routeSection && validSections.includes(routeSection as AdminNavSection))
    ? (routeSection as AdminNavSection)
    : 'overview';

  const [activeSection, setActiveSection] = useState<AdminNavSection>(initialSec);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (routeSection && validSections.includes(routeSection as AdminNavSection)) {
      setActiveSection(routeSection as AdminNavSection);
    }
  }, [routeSection]);

  const handleSelectSection = (sec: AdminNavSection) => {
    setActiveSection(sec);
    navigate(`/admin/${sec}`);
  };

  // Counts for Badges
  const activeOrdersCount = orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length;
  const lowMaterialsCount = materials.filter(m => (m.stockRollsCount ?? 10) <= 5).length;
  const lowAccessoriesCount = accessories.filter(a => a.stockCount <= a.lowStockThreshold).length;
  const totalLowStock = lowMaterialsCount + lowAccessoriesCount;

  // Breadcrumb mapping
  const sectionBreadcrumbs: Record<AdminNavSection, { group: string; title: string; icon: string }> = {
    overview: {
      group: isVi ? 'TỔNG QUAN' : 'OVERVIEW',
      title: isVi ? 'Bảng Điều Khiển Trung Tâm' : 'Dashboard Overview',
      icon: 'dashboard'
    },
    orders: {
      group: isVi ? 'THƯƠNG MẠI' : 'COMMERCE',
      title: isVi ? 'Quản Lý Đơn Hàng' : 'Orders Management',
      icon: 'receipt_long'
    },
    products: {
      group: isVi ? 'THƯƠNG MẠI' : 'COMMERCE',
      title: isVi ? 'Sản Phẩm & Catalog CAD' : 'Products & Catalog',
      icon: 'inventory_2'
    },
    queue: {
      group: isVi ? 'VẬN HÀNH SẢN XUẤT' : 'PRODUCTION',
      title: isVi ? 'Hàng Đợi Chế Tác 8 Nấc' : 'Production Queue',
      icon: 'precision_manufacturing'
    },
    machines: {
      group: isVi ? 'VẬN HÀNH SẢN XUẤT' : 'PRODUCTION',
      title: isVi ? 'Đội Máy In 3D FDM / SLA' : '3D Printer Fleet',
      icon: 'print'
    },
    inventory: {
      group: isVi ? 'VẬN HÀNH SẢN XUẤT' : 'PRODUCTION',
      title: isVi ? 'Kho Vật Liệu & Sơ Đồ Kệ' : 'Warehouse Inventory & Bins',
      icon: 'shelves'
    },
    'pricing-setup': {
      group: isVi ? 'ĐỊNH GIÁ & TÍNH TOÁN' : 'PRICING & SETUP',
      title: isVi ? 'Cấu Hình Định Giá & Chi Phí Inkiri (Toàn Diện)' : 'Inkiri Pricing & Cost Engine Setup',
      icon: 'tune'
    },
    'cost-rules': {
      group: isVi ? 'ĐỊNH GIÁ & TÍNH TOÁN' : 'PRICING & SETUP',
      title: isVi ? 'Cấu Hình Định Giá Inkiri' : 'Inkiri Pricing Setup',
      icon: 'tune'
    },
    materials: {
      group: isVi ? 'ĐỊNH GIÁ & TÍNH TOÁN' : 'PRICING & SETUP',
      title: isVi ? 'Danh Mục Nhựa & Resin' : 'Filaments & Resins',
      icon: 'layers'
    },
    hardware: {
      group: isVi ? 'ĐỊNH GIÁ & TÍNH TOÁN' : 'PRICING & SETUP',
      title: isVi ? 'Phụ Kiện, Ốc Cấy & Nam Châm' : 'Hardware & Fasteners',
      icon: 'extension'
    },
    'quote-calc': {
      group: isVi ? 'ĐỊNH GIÁ & TÍNH TOÁN' : 'PRICING & SETUP',
      title: isVi ? 'Báo Giá Dự Toán BOM Kỹ Thuật' : 'BOM Quote Calculator',
      icon: 'request_quote'
    },
    storefront: {
      group: isVi ? 'HỆ THỐNG' : 'SYSTEM',
      title: isVi ? 'Cấu Hình Storefront & Banner' : 'Storefront & Banner CMS',
      icon: 'storefront'
    },
    settings: {
      group: isVi ? 'HỆ THỐNG' : 'SYSTEM',
      title: isVi ? 'Cài Đặt Xưởng In & Pháp Nhân' : 'Workshop Settings',
      icon: 'settings'
    }
  };

  const currentMeta = sectionBreadcrumbs[activeSection] || sectionBreadcrumbs.overview;

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex flex-col lg:flex-row text-[#091426] font-sans antialiased">
      {/* 1. SIDEBAR NAVIGATION */}
      <AdminSidebar
        activeSection={activeSection}
        onSelectSection={handleSelectSection}
        ordersCount={orders.length}
        activeJobsCount={activeOrdersCount}
        productsCount={products.length}
        printersCount={printers.length}
        materialsCount={materials.length}
        accessoriesCount={accessories.length}
        lowStockCount={totalLowStock}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onNavigateHome={() => onNavigate('home')}
      />

      {/* 2. MAIN ADMIN CONTENT WORKSPACE */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Top Navbar */}
        <header className="sticky top-0 bg-white border-b border-[#CBD5E1] z-30 px-4 sm:px-6 py-3.5 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-[#545F73] hover:bg-slate-100 cursor-pointer"
            >
              <span className="material-symbols-outlined text-xl">menu</span>
            </button>

            {/* Breadcrumbs */}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] font-tech font-bold uppercase tracking-wider text-[#64748B]">
                <span>VCUBE ADMIN</span>
                <span>/</span>
                <span>{currentMeta.group}</span>
              </div>
              <h1 className="text-base sm:text-lg font-bold text-[#091426] flex items-center gap-2 truncate">
                <span className="material-symbols-outlined text-[#00687A] text-lg sm:text-xl">
                  {currentMeta.icon}
                </span>
                <span className="truncate">{currentMeta.title}</span>
              </h1>
            </div>
          </div>

          {/* Top Right Status & Action Controls */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Quick Quote Button */}
            {activeSection !== 'quote-calc' && (
              <button
                onClick={() => handleSelectSection('quote-calc')}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-[#00687A]/10 hover:bg-[#00687A]/20 text-[#00687A] text-xs font-bold rounded-lg border border-[#00687A]/30 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">request_quote</span>
                {isVi ? 'Báo Giá Nhanh' : 'Quick Quote'}
              </button>
            )}

            {/* Switch to Storefront */}
            <button
              onClick={() => onNavigate('home')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#091426] hover:bg-[#1E293B] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
              title={isVi ? 'Trở về màn hình mua sắm của khách' : 'Go to client store'}
            >
              <span className="material-symbols-outlined text-sm text-[#57DFFE]">storefront</span>
              <span className="hidden sm:inline">{isVi ? 'Xem Cửa Hàng' : 'Storefront'}</span>
            </button>

            {/* Admin Avatar */}
            <div className="w-8 h-8 rounded-full bg-[#00687A] text-white font-bold text-xs flex items-center justify-center border-2 border-white shadow-xs">
              AD
            </div>
          </div>
        </header>

        {/* Content Body Area */}
        <main className="p-4 sm:p-6 md:p-8 flex-1 max-w-7xl w-full mx-auto">
          {activeSection === 'overview' && (
            <AdminOverviewPanel
              orders={orders}
              products={products}
              printers={printers}
              materials={materials}
              accessories={accessories}
              onNavigateSection={handleSelectSection}
              onNavigateTracking={(order) => onNavigate('tracking', { order })}
            />
          )}

          {activeSection === 'orders' && (
            <AdminOrdersPanel
              orders={orders}
              onUpdateOrderStatus={onUpdateOrderStatus}
              onNavigateTracking={(order) => onNavigate('tracking', { order })}
              onShowToast={onShowToast}
            />
          )}

          {activeSection === 'products' && (
            <AdminProductsPanel
              products={products}
              onAddProduct={onAddProduct}
              onUpdateProduct={onUpdateProduct}
              onDeleteProduct={onDeleteProduct}
              onShowToast={onShowToast}
            />
          )}

          {activeSection === 'queue' && (
            <AdminProductionQueuePanel
              orders={orders}
              onUpdateOrderStatus={onUpdateOrderStatus}
              onNavigateTracking={(order) => onNavigate('tracking', { order })}
              onShowToast={onShowToast}
            />
          )}

          {activeSection === 'machines' && (
            <AdminMachinesPanel
              printers={printers}
              onUpdatePrinters={onUpdatePrinters}
              onShowToast={onShowToast}
            />
          )}

          {activeSection === 'inventory' && (
            <WarehouseInventoryPanel
              materials={materials}
              accessories={accessories}
              onUpdateMaterials={onUpdateMaterials}
              onUpdateAccessories={onUpdateAccessories}
              onShowToast={onShowToast}
            />
          )}

          {(activeSection === 'pricing-setup' || activeSection === 'cost-rules' || activeSection === 'materials' || activeSection === 'hardware' || activeSection === 'quote-calc') && (
            <PricingConfigPanel
              initialSubTab={
                activeSection === 'materials' ? 'materials' :
                activeSection === 'hardware' ? 'accessories' :
                activeSection === 'quote-calc' ? 'estimator' : 'formula'
              }
              materials={materials}
              printers={printers}
              accessories={accessories}
              pricingConfig={pricingConfig}
              onUpdateMaterials={onUpdateMaterials}
              onUpdatePrinters={onUpdatePrinters}
              onUpdateAccessories={onUpdateAccessories}
              onUpdatePricingConfig={onUpdatePricingConfig}
              onShowToast={onShowToast}
            />
          )}

          {activeSection === 'storefront' && (
            <AdminStorefrontPanel
              siteContent={siteContent}
              onUpdateSiteContent={onUpdateSiteContent}
              onShowToast={onShowToast}
            />
          )}

          {activeSection === 'settings' && (
            <AdminSettingsPanel
              onShowToast={onShowToast}
            />
          )}
        </main>
      </div>
    </div>
  );
};
