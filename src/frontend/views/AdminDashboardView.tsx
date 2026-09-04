import React, { useState, useEffect, Suspense } from 'react';
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
import { seedService } from '../../backend';

// ==============================================================================
// LAZY-LOADED GROUP PANELS FOR OPTIMAL CODE SPLITTING & FAST INITIAL LOAD
// ==============================================================================
const Group0OverviewPanel = React.lazy(() => import('../components/admin/groups/Group0OverviewPanel'));
const Group1WorkshopsPanel = React.lazy(() => import('../components/admin/groups/Group1WorkshopsPanel'));
const Group2DesignersPanel = React.lazy(() => import('../components/admin/groups/Group2DesignersPanel'));
const Group3CustomersPanel = React.lazy(() => import('../components/admin/groups/Group3CustomersPanel'));
const Group4PricingEnginePanel = React.lazy(() => import('../components/admin/groups/Group4PricingEnginePanel'));
const Group5ProductionPanel = React.lazy(() => import('../components/admin/groups/Group5ProductionPanel'));

// Secondary CMS & System Panels Lazy-loaded
const AdminProductsPanel = React.lazy(() =>
  import('../components/admin/AdminProductsPanel').then((m) => ({ default: m.AdminProductsPanel }))
);
const AdminStorefrontPanel = React.lazy(() =>
  import('../components/admin/AdminStorefrontPanel').then((m) => ({ default: m.AdminStorefrontPanel }))
);
const AdminSeoPanel = React.lazy(() =>
  import('../components/admin/AdminSeoPanel').then((m) => ({ default: m.AdminSeoPanel }))
);
const AdminSettingsPanel = React.lazy(() =>
  import('../components/admin/AdminSettingsPanel').then((m) => ({ default: m.AdminSettingsPanel }))
);

// High-tech Suspense Loading Skeleton
const AdminPanelLoadingSkeleton: React.FC = () => (
  <div className="space-y-6 animate-pulse p-2 sm:p-4">
    <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs space-y-3">
      <div className="h-4 bg-slate-200 rounded-md w-1/4"></div>
      <div className="h-8 bg-slate-200 rounded-md w-1/2"></div>
      <div className="h-3 bg-slate-200 rounded-md w-3/4"></div>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white border border-slate-200 p-5 rounded-2xl h-32 space-y-3">
          <div className="h-3 bg-slate-200 rounded w-1/2"></div>
          <div className="h-7 bg-slate-200 rounded w-3/4"></div>
          <div className="h-2 bg-slate-200 rounded w-full"></div>
        </div>
      ))}
    </div>
    <div className="bg-white border border-slate-200 p-6 rounded-2xl h-80 flex items-center justify-center">
      <div className="flex flex-col items-center gap-2 text-slate-400 text-xs font-tech">
        <span className="material-symbols-outlined text-2xl animate-spin text-[#00687A]">sync</span>
        <span>ĐANG TẢI DỮ LIỆU BẢNG ĐIỀU KHIỂN...</span>
      </div>
    </div>
  </div>
);

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

  // Valid Navigation Sections
  const validSections: AdminNavSection[] = [
    'overview', 'group0-overview',
    'workshops', 'partners', 'machines',
    'designers',
    'users', 'customers',
    'pricing', 'pricing-engine', 'pricing-setup', 'cost-rules', 'materials', 'hardware', 'quote-calc',
    'queue', 'orders', 'inventory',
    'products', 'storefront', 'seo', 'settings'
  ];

  const initialSec: AdminNavSection = (routeSection && validSections.includes(routeSection as AdminNavSection))
    ? (routeSection as AdminNavSection)
    : 'overview';

  const [activeSection, setActiveSection] = useState<AdminNavSection>(initialSec);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);

  const handleTriggerCloudSync = async () => {
    setIsCloudSyncing(true);
    try {
      const result = await seedService.seedAllToSupabase();
      if (result.success) {
        onShowToast(isVi 
          ? `Đồng bộ Cloud hoàn tất (${result.counts.products} SP, ${result.counts.orders} đơn, ${result.counts.user_profiles} người dùng, ${result.counts.materials} vật liệu)`
          : `Cloud synced successfully (${result.counts.products} products, ${result.counts.orders} orders)`);
      } else {
        onShowToast(isVi ? `Đồng bộ xong với lưu ý: ${result.errors.join(', ')}` : `Sync notice: ${result.errors.join(', ')}`);
      }
    } catch (err: any) {
      onShowToast(isVi ? `Lỗi đồng bộ: ${err?.message || 'Không thể kết nối'}` : `Sync error: ${err?.message}`);
    } finally {
      setIsCloudSyncing(false);
    }
  };

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

  // Breadcrumb mapping grouped cleanly by GROUP 0 to GROUP 5 + Storefront
  const sectionBreadcrumbs: Record<string, { group: string; title: string; icon: string }> = {
    overview: {
      group: 'GROUP 0: TỔNG QUAN ĐIỀU HÀNH',
      title: isVi ? 'Bảng Điều Khiển Trung Tâm' : 'Dashboard Overview',
      icon: 'dashboard'
    },
    'group0-overview': {
      group: 'GROUP 0: TỔNG QUAN ĐIỀU HÀNH',
      title: isVi ? 'Bảng Điều Khiển Trung Tâm' : 'Dashboard Overview',
      icon: 'dashboard'
    },
    partners: {
      group: 'GROUP 1: QUẢN LÝ XƯỞNG IN (MES HUBS)',
      title: isVi ? 'Mạng Lưới Xưởng In Đối Tác (MES Network)' : 'Workshop Partner MES Network',
      icon: 'factory'
    },
    workshops: {
      group: 'GROUP 1: QUẢN LÝ XƯỞNG IN (MES HUBS)',
      title: isVi ? 'Mạng Lưới Xưởng In Đối Tác (MES Network)' : 'Workshop Partner MES Network',
      icon: 'factory'
    },
    machines: {
      group: 'GROUP 1: QUẢN LÝ XƯỞNG IN (MES HUBS)',
      title: isVi ? 'Đội Máy In 3D FDM / SLA (Fleet)' : '3D Printer Fleet',
      icon: 'print'
    },
    designers: {
      group: 'GROUP 2: QUẢN LÝ DESIGNER',
      title: isVi ? 'Quản Trị Nhà Thiết Kế 3D & Bản Quyền' : '3D Designers & Intellectual Property',
      icon: 'draw'
    },
    users: {
      group: 'GROUP 3: QUẢN LÝ KHÁCH HÀNG',
      title: isVi ? 'Quản Trị Khách Hàng & Hồ Sơ KYC' : 'Customer Profiles & KYC',
      icon: 'manage_accounts'
    },
    customers: {
      group: 'GROUP 3: QUẢN LÝ KHÁCH HÀNG',
      title: isVi ? 'Quản Trị Khách Hàng & Hồ Sơ KYC' : 'Customer Profiles & KYC',
      icon: 'manage_accounts'
    },
    pricing: {
      group: 'GROUP 4: CẤU HÌNH GIÁ INKIRI',
      title: isVi ? 'Cấu Hình Định Giá & Chi Phí Inkiri v3.4' : 'Inkiri Pricing & Cost Engine Setup',
      icon: 'tune'
    },
    'pricing-engine': {
      group: 'GROUP 4: CẤU HÌNH GIÁ INKIRI',
      title: isVi ? 'Cấu Hình Định Giá & Chi Phí Inkiri v3.4' : 'Inkiri Pricing & Cost Engine Setup',
      icon: 'tune'
    },
    'pricing-setup': {
      group: 'GROUP 4: CẤU HÌNH GIÁ INKIRI',
      title: isVi ? 'Cấu Hình Định Giá Inkiri' : 'Inkiri Pricing Setup',
      icon: 'tune'
    },
    'cost-rules': {
      group: 'GROUP 4: CẤU HÌNH GIÁ INKIRI',
      title: isVi ? 'Quy Tắc Chi Phí Inkiri' : 'Inkiri Cost Rules',
      icon: 'tune'
    },
    materials: {
      group: 'GROUP 4: CẤU HÌNH GIÁ INKIRI',
      title: isVi ? 'Danh Mục Nhựa & Resin' : 'Filaments & Resins',
      icon: 'layers'
    },
    hardware: {
      group: 'GROUP 4: CẤU HÌNH GIÁ INKIRI',
      title: isVi ? 'Phụ Kiện, Ốc Cấy & Nam Châm' : 'Hardware & Fasteners',
      icon: 'extension'
    },
    'quote-calc': {
      group: 'GROUP 4: CẤU HÌNH GIÁ INKIRI',
      title: isVi ? 'Báo Giá Dự Toán BOM Kỹ Thuật' : 'BOM Quote Calculator',
      icon: 'calculate'
    },
    queue: {
      group: 'GROUP 5: VẬN HÀNH SẢN XUẤT (MES)',
      title: isVi ? 'Hàng Đợi Chế Tác & Kanban 8 Nấc' : '8-Stage MES Production Queue',
      icon: 'precision_manufacturing'
    },
    orders: {
      group: 'GROUP 5: VẬN HÀNH SẢN XUẤT (MES)',
      title: isVi ? 'Đơn Hàng & Điều Phối Trạm In' : 'Orders & Workshop Dispatch',
      icon: 'receipt_long'
    },
    inventory: {
      group: 'GROUP 5: VẬN HÀNH SẢN XUẤT (MES)',
      title: isVi ? 'Kho Vật Liệu & Vị Trí Kệ' : 'Warehouse Inventory & Bins',
      icon: 'shelves'
    },
    products: {
      group: 'CỬA HÀNG & HỆ THỐNG',
      title: isVi ? 'Sản Phẩm & Catalog 3D' : 'Products & Catalog',
      icon: 'inventory_2'
    },
    storefront: {
      group: 'CỬA HÀNG & HỆ THỐNG',
      title: isVi ? 'Cấu Hình Storefront & Banner' : 'Storefront & Banner CMS',
      icon: 'storefront'
    },
    seo: {
      group: 'CỬA HÀNG & HỆ THỐNG',
      title: isVi ? 'Quản Trị SEO & Metadata Toàn Diện' : 'SEO & Search Engine Metadata',
      icon: 'travel_explore'
    },
    settings: {
      group: 'CỬA HÀNG & HỆ THỐNG',
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
              <div className="flex items-center gap-1.5 text-[10px] font-tech font-bold uppercase tracking-wider text-[#00687A]">
                <span>VCUBE FORGE</span>
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
            {/* Supabase Cloud DB Sync Button */}
            <button
              onClick={handleTriggerCloudSync}
              disabled={isCloudSyncing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg border border-emerald-300 transition-colors cursor-pointer shadow-2xs disabled:opacity-60"
              title={isVi ? 'Đồng bộ mock data lên Supabase Database' : 'Sync mock data to Supabase Database'}
            >
              <span className={`material-symbols-outlined text-sm text-emerald-600 ${isCloudSyncing ? 'animate-spin' : ''}`}>
                sync
              </span>
              <span className="hidden md:inline">
                {isCloudSyncing ? (isVi ? 'Đang đồng bộ...' : 'Syncing...') : (isVi ? 'Đồng Bộ DB' : 'Sync DB')}
              </span>
            </button>

            {/* Quick Quote Button */}
            {activeSection !== 'quote-calc' && (
              <button
                onClick={() => handleSelectSection('quote-calc')}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-[#00687A]/10 hover:bg-[#00687A]/20 text-[#00687A] text-xs font-bold rounded-lg border border-[#00687A]/30 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">request_quote</span>
                {isVi ? 'Báo Giá BOM' : 'Quick Quote'}
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

        {/* Content Body Area with Suspense Lazy Loading */}
        <main className="p-4 sm:p-6 md:p-8 flex-1 max-w-7xl w-full mx-auto">
          <Suspense fallback={<AdminPanelLoadingSkeleton />}>
            {/* GROUP 0: EXECUTIVE OVERVIEW */}
            {(activeSection === 'overview' || activeSection === 'group0-overview') && (
              <Group0OverviewPanel
                orders={orders}
                products={products}
                printers={printers}
                materials={materials}
                accessories={accessories}
                onNavigateSection={handleSelectSection}
                onNavigateTracking={(order) => onNavigate('tracking', { order })}
              />
            )}

            {/* GROUP 1: WORKSHOP HUBS & FLEET */}
            {(activeSection === 'workshops' || activeSection === 'partners' || activeSection === 'machines') && (
              <Group1WorkshopsPanel
                printers={printers}
                onUpdatePrinters={onUpdatePrinters}
                onShowToast={onShowToast}
                onNavigateSection={handleSelectSection}
              />
            )}

            {/* GROUP 2: 3D DESIGNERS & ROYALTIES */}
            {activeSection === 'designers' && (
              <Group2DesignersPanel
                onShowToast={onShowToast}
                onNavigateSection={handleSelectSection}
              />
            )}

            {/* GROUP 3: CUSTOMERS & KYC */}
            {(activeSection === 'users' || activeSection === 'customers') && (
              <Group3CustomersPanel
                onShowToast={onShowToast}
                onNavigateSection={handleSelectSection}
              />
            )}

            {/* GROUP 4: INKIRI PRICING ENGINE */}
            {(activeSection === 'pricing' ||
              activeSection === 'pricing-engine' ||
              activeSection === 'pricing-setup' ||
              activeSection === 'cost-rules' ||
              activeSection === 'materials' ||
              activeSection === 'hardware' ||
              activeSection === 'quote-calc') && (
              <Group4PricingEnginePanel
                initialSubTab={
                  activeSection === 'materials'
                    ? 'materials'
                    : activeSection === 'hardware'
                    ? 'accessories'
                    : activeSection === 'quote-calc'
                    ? 'estimator'
                    : 'formula'
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

            {/* GROUP 5: PRODUCTION OPERATIONS (MES KANBAN & GEO-DISPATCHER) */}
            {(activeSection === 'queue' || activeSection === 'orders' || activeSection === 'inventory') && (
              <Group5ProductionPanel
                orders={orders}
                printers={printers}
                onUpdateOrderStatus={onUpdateOrderStatus}
                onNavigateTracking={(order) => onNavigate('tracking', { order })}
                onShowToast={onShowToast}
              />
            )}

            {/* STOREFRONT, CONTENT & SYSTEM CMS */}
            {activeSection === 'products' && (
              <AdminProductsPanel
                products={products}
                onAddProduct={onAddProduct}
                onUpdateProduct={onUpdateProduct}
                onDeleteProduct={onDeleteProduct}
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

            {activeSection === 'seo' && (
              <AdminSeoPanel
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
          </Suspense>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboardView;
