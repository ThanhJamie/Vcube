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
import {
  AdminNavSection,
  buildAdminNavGroups,
} from '../components/admin/AdminSidebar';
import { AppShell, Button, Field, Icon, Input, SideNav, Topbar } from '@frontend/ui';

// ==============================================================================
// LAZY-LOADED ADMIN PANELS FOR OPTIMAL CODE SPLITTING & FAST INITIAL LOAD
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
// Màn KHO VẬT LIỆU (`/admin/inventory`): trước đây mục menu này mở nhầm màn Kanban sản xuất,
// còn màn kho chỉ với tới được như một sub-tab trong cấu hình định giá (`PricingConfigPanel`).
const WarehouseInventoryPanel = React.lazy(() =>
  import('../components/admin/WarehouseInventoryPanel').then((m) => ({ default: m.WarehouseInventoryPanel }))
);

// High-tech Suspense Loading Skeleton
const AdminPanelLoadingSkeleton: React.FC = () => (
  <div className="space-y-6 animate-pulse p-2 sm:p-4">
    <div className="bg-surface p-6 rounded-lg shadow-e1 space-y-3">
      <div className="h-4 bg-line-subtle rounded-md w-1/4"></div>
      <div className="h-8 bg-line-subtle rounded-md w-1/2"></div>
      <div className="h-3 bg-line-subtle rounded-md w-3/4"></div>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-surface p-5 rounded-lg h-32 space-y-3">
          <div className="h-3 bg-line-subtle rounded-sm w-1/2"></div>
          <div className="h-7 bg-line-subtle rounded-sm w-3/4"></div>
          <div className="h-2 bg-line-subtle rounded-sm w-full"></div>
        </div>
      ))}
    </div>
    <div className="bg-surface p-6 rounded-lg h-80 flex items-center justify-center">
      <div className="flex flex-col items-center gap-2 text-fg-subtle text-xs font-tech">
        <Icon name="sync" size={28} className="animate-spin text-primary" />
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
  onUpdateSiteContent: (content: SiteContentConfig) => Promise<{ success: boolean; error?: string }> | void;
  onUpdateMaterials: (materials: MaterialProfile[]) => void;
  onUpdatePrinters: (printers: PrinterProfile[]) => void;
  onUpdateAccessories: (accessories: AccessoryItem[]) => void;
  onUpdatePricingConfig: (config: InkiriCostFormulaConfig) => Promise<{ success: boolean; error?: string }> | void;
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

  /**
   * URL là NGUỒN SỰ THẬT DUY NHẤT: `/admin/:section` quyết định mục đang mở, nên deep-link
   * hoạt động và `SideNav` (dựng ở dưới) highlight đúng mục — không còn state chạy song song
   * với URL như bản `AdminSidebar` cũ (state + useEffect sao chép từ route).
   */
  const activeSection: AdminNavSection =
    routeSection && validSections.includes(routeSection as AdminNavSection)
      ? (routeSection as AdminNavSection)
      : 'overview';

  const handleSelectSection = (sec: AdminNavSection) => {
    navigate(`/admin/${sec}`);
  };

  // Shell state (thu gọn sidebar / drawer mobile / tìm nhanh mục điều hướng).
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [navSearch, setNavSearch] = useState('');

  // Counts for Badges
  const activeOrdersCount = orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length;
  // Cùng ngưỡng với màn kho (`WarehouseInventoryPanel.MATERIAL_LOW_STOCK_THRESHOLD = 3`) và CHỈ
  // đếm vật liệu ĐÃ KHAI tồn: `?? 10` trước đây là số bịa, còn `5` thì lệch với chính màn kho.
  const lowMaterialsCount = materials.filter(m => typeof m.stockRollsCount === 'number' && m.stockRollsCount <= 3).length;
  // `lowStockThreshold: null` = CHƯA cấu hình ngưỡng ⇒ không kết luận "sắp hết"
  // (JS coi `null` là 0 nên bản cũ chỉ đếm được hàng đã hết sạch).
  const lowAccessoriesCount = accessories.filter(
    a => typeof a.lowStockThreshold === 'number' && a.stockCount <= a.lowStockThreshold
  ).length;
  const totalLowStock = lowMaterialsCount + lowAccessoriesCount;

  // Breadcrumb theo ĐÚNG nhóm điều hướng của `AdminSidebar` (nhãn nghiệp vụ, không còn jargon nội bộ).
  // `id`/route giữ nguyên — chỉ đổi chuỗi hiển thị nên deep-link `/admin/<id>` không đổi.
  const sectionBreadcrumbs: Record<string, { group: string; title: string; icon: string }> = {
    overview: {
      group: isVi ? 'Tổng quan' : 'Overview',
      title: isVi ? 'Bảng Điều Khiển Trung Tâm' : 'Dashboard Overview',
      icon: 'dashboard'
    },
    'group0-overview': {
      group: isVi ? 'Tổng quan' : 'Overview',
      title: isVi ? 'Bảng Điều Khiển Trung Tâm' : 'Dashboard Overview',
      icon: 'dashboard'
    },
    partners: {
      group: isVi ? 'Xưởng in & Thiết bị' : 'Workshops & Fleet',
      title: isVi ? 'Mạng Lưới Xưởng In Đối Tác (MES Network)' : 'Workshop Partner MES Network',
      icon: 'factory'
    },
    workshops: {
      group: isVi ? 'Xưởng in & Thiết bị' : 'Workshops & Fleet',
      title: isVi ? 'Mạng Lưới Xưởng In Đối Tác (MES Network)' : 'Workshop Partner MES Network',
      icon: 'factory'
    },
    machines: {
      group: isVi ? 'Xưởng in & Thiết bị' : 'Workshops & Fleet',
      title: isVi ? 'Đội Máy In 3D FDM / SLA (Fleet)' : '3D Printer Fleet',
      icon: 'print'
    },
    designers: {
      group: isVi ? 'Nhà thiết kế' : 'Designers',
      title: isVi ? 'Quản Trị Nhà Thiết Kế 3D & Bản Quyền' : '3D Designers & Intellectual Property',
      icon: 'draw'
    },
    users: {
      group: isVi ? 'Khách hàng' : 'Customers',
      title: isVi ? 'Quản Trị Khách Hàng & Hồ Sơ KYC' : 'Customer Profiles & KYC',
      icon: 'manage_accounts'
    },
    customers: {
      group: isVi ? 'Khách hàng' : 'Customers',
      title: isVi ? 'Quản Trị Khách Hàng & Hồ Sơ KYC' : 'Customer Profiles & KYC',
      icon: 'manage_accounts'
    },
    pricing: {
      group: isVi ? 'Danh mục & Định giá' : 'Catalog & Pricing',
      title: isVi ? 'Cấu Hình Định Giá & Chi Phí Inkiri v3.4' : 'Inkiri Pricing & Cost Engine Setup',
      icon: 'tune'
    },
    'pricing-engine': {
      group: isVi ? 'Danh mục & Định giá' : 'Catalog & Pricing',
      title: isVi ? 'Cấu Hình Định Giá & Chi Phí Inkiri v3.4' : 'Inkiri Pricing & Cost Engine Setup',
      icon: 'tune'
    },
    'pricing-setup': {
      group: isVi ? 'Danh mục & Định giá' : 'Catalog & Pricing',
      title: isVi ? 'Cấu Hình Định Giá Inkiri' : 'Inkiri Pricing Setup',
      icon: 'tune'
    },
    'cost-rules': {
      group: isVi ? 'Danh mục & Định giá' : 'Catalog & Pricing',
      title: isVi ? 'Quy Tắc Chi Phí Inkiri' : 'Inkiri Cost Rules',
      icon: 'tune'
    },
    materials: {
      group: isVi ? 'Danh mục & Định giá' : 'Catalog & Pricing',
      title: isVi ? 'Danh Mục Nhựa & Resin' : 'Filaments & Resins',
      icon: 'layers'
    },
    hardware: {
      group: isVi ? 'Danh mục & Định giá' : 'Catalog & Pricing',
      title: isVi ? 'Phụ Kiện, Ốc Cấy & Nam Châm' : 'Hardware & Fasteners',
      icon: 'extension'
    },
    'quote-calc': {
      group: isVi ? 'Danh mục & Định giá' : 'Catalog & Pricing',
      title: isVi ? 'Báo Giá Dự Toán BOM Kỹ Thuật' : 'BOM Quote Calculator',
      icon: 'calculate'
    },
    queue: {
      group: isVi ? 'Vận hành sản xuất' : 'Production Operations',
      title: isVi ? 'Hàng Đợi Chế Tác & Kanban 8 Nấc' : '8-Stage MES Production Queue',
      icon: 'precision_manufacturing'
    },
    orders: {
      group: isVi ? 'Vận hành sản xuất' : 'Production Operations',
      title: isVi ? 'Đơn Hàng & Điều Phối Trạm In' : 'Orders & Workshop Dispatch',
      icon: 'receipt_long'
    },
    inventory: {
      group: isVi ? 'Vận hành sản xuất' : 'Production Operations',
      title: isVi ? 'Kho Vật Liệu & Vị Trí Kệ' : 'Warehouse Inventory & Bins',
      icon: 'shelves'
    },
    products: {
      group: isVi ? 'CỬA HÀNG & HỆ THỐNG' : 'STOREFRONT & SYSTEM',
      title: isVi ? 'Sản Phẩm & Catalog 3D' : 'Products & Catalog',
      icon: 'inventory_2'
    },
    storefront: {
      group: isVi ? 'CỬA HÀNG & HỆ THỐNG' : 'STOREFRONT & SYSTEM',
      title: isVi ? 'Cấu Hình Storefront & Banner' : 'Storefront & Banner CMS',
      icon: 'storefront'
    },
    seo: {
      group: isVi ? 'CỬA HÀNG & HỆ THỐNG' : 'STOREFRONT & SYSTEM',
      title: isVi ? 'Quản Trị SEO & Metadata Toàn Diện' : 'SEO & Search Engine Metadata',
      icon: 'travel_explore'
    },
    settings: {
      group: isVi ? 'CỬA HÀNG & HỆ THỐNG' : 'STOREFRONT & SYSTEM',
      title: isVi ? 'Cài Đặt Xưởng In & Pháp Nhân' : 'Workshop Settings',
      icon: 'settings'
    }
  };

  const currentMeta = sectionBreadcrumbs[activeSection] || sectionBreadcrumbs.overview;

  /* Điều hướng: MỘT nguồn nhãn duy nhất (`buildAdminNavGroups`) dùng cho cả `SideNav` mới. */
  const counts = {
    ordersCount: orders.length,
    activeJobsCount: activeOrdersCount,
    productsCount: products.length,
    materialsCount: materials.length,
    accessoriesCount: accessories.length,
    lowStockCount: totalLowStock,
    // Badge máy in: cùng nguồn `printers` mà các panel admin đang dùng.
    fleetBadge: printers.length > 0 ? `${printers.length}` : null,
  };

  const navQuery = navSearch.trim().toLowerCase();
  const navGroups = buildAdminNavGroups(isVi, counts);
  const filteredNavGroups = navQuery
    ? navGroups
        .map((group) => ({
          ...group,
          items: group.items.filter(
            (item) =>
              item.label.toLowerCase().includes(navQuery) ||
              item.id.toLowerCase().includes(navQuery) ||
              (group.group || '').toLowerCase().includes(navQuery),
          ),
        }))
        .filter((group) => group.items.length > 0)
    : navGroups;

  const sideNavGroups = filteredNavGroups.map((group) => ({
    id: group.group || 'admin-group',
    label: group.group,
    items: group.items.map((item) => ({
      id: item.id,
      label: item.label,
      icon: <Icon name={item.icon} size={18} />,
      badge: item.badge ?? undefined,
    })),
  }));

  const panelContent = (
      <Suspense fallback={<AdminPanelLoadingSkeleton />}>
        {/* Tổng quan điều hành */}
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

        {/* Xưởng in & thiết bị */}
        {(activeSection === 'workshops' || activeSection === 'partners' || activeSection === 'machines') && (
          <Group1WorkshopsPanel
            printers={printers}
            onUpdatePrinters={onUpdatePrinters}
            onShowToast={onShowToast}
            onNavigateSection={handleSelectSection}
            section={activeSection}
          />
        )}

        {/* Nhà thiết kế & bản quyền */}
        {activeSection === 'designers' && (
          <Group2DesignersPanel
            onShowToast={onShowToast}
            onNavigateSection={handleSelectSection}
          />
        )}

        {/* Khách hàng & KYC */}
        {(activeSection === 'users' || activeSection === 'customers') && (
          <Group3CustomersPanel
            onShowToast={onShowToast}
            onNavigateSection={handleSelectSection}
          />
        )}

        {/* Danh mục & định giá (Inkiri) */}
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

        {/* Vận hành sản xuất — BA mục menu, BA màn KHÁC NHAU:
            queue  = Hàng Đợi & Kanban 8 nấc (tab mặc định: kanban)
            orders = Đơn Hàng & Điều Phối trạm in (tab mặc định: dispatcher)
            inventory = Kho Vật Liệu & Vị Trí Kệ (WarehouseInventoryPanel) */}
        {(activeSection === 'queue' || activeSection === 'orders') && (
          <Group5ProductionPanel
            section={activeSection}
            onUpdateOrderStatus={onUpdateOrderStatus}
            onNavigateTracking={(order) => onNavigate('tracking', { order })}
            onShowToast={onShowToast}
            onNavigateSection={handleSelectSection}
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
  );

  return (
    <AppShell
      collapsed={isNavCollapsed}
      mobileOpen={isMobileNavOpen}
      onMobileOpenChange={setIsMobileNavOpen}
      navLabel={isVi ? 'Điều hướng quản trị' : 'Admin navigation'}
      sidebar={
        <div className="flex h-full min-h-0 flex-col">
          {/* Tìm nhanh mục điều hướng — giữ nguyên tính năng của AdminSidebar cũ. */}
          <div className="shrink-0 px-2 pt-2">
            <Field
              id="admin-nav-search"
              label={isVi ? 'Tìm mục điều hướng' : 'Find a section'}
              hideLabel
            >
              {(control) => (
                <Input
                  {...control}
                  type="search"
                  size="sm"
                  value={navSearch}
                  onChange={(e) => setNavSearch(e.target.value)}
                  placeholder={isVi ? 'Tìm mục (kho, máy in, giá…)' : 'Find a section…'}
                />
              )}
            </Field>
            {navQuery && filteredNavGroups.length === 0 ? (
              <p className="px-1 pt-2 text-xs text-fg-subtle">
                {isVi ? 'Không có mục nào khớp từ khoá.' : 'No sections matched.'}
              </p>
            ) : null}
          </div>

          <SideNav
            className="min-h-0 flex-1"
            label={isVi ? 'Điều hướng quản trị' : 'Admin navigation'}
            collapsed={isNavCollapsed}
            onCollapsedChange={setIsNavCollapsed}
            activeId={activeSection}
            onSelect={(id) => handleSelectSection(id as AdminNavSection)}
            header={
              <span className="flex min-w-0 items-center gap-2">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-fg">
                  <Icon name="deployed_code" size={16} />
                </span>
                {isNavCollapsed ? null : (
                  <span className="flex min-w-0 flex-col leading-tight">
                    <span className="truncate text-sm font-semibold tracking-tight text-fg">
                      VCUBE
                    </span>
                    <span className="truncate text-xs text-fg-subtle">
                      {isVi ? 'Hệ điều hành xưởng in' : 'Admin & Production OS'}
                    </span>
                  </span>
                )}
              </span>
            }
            footer={
              <span className="block truncate px-1 text-center text-xs text-fg-subtle">
                {isVi ? 'Bảng quản trị VCUBE' : 'VCUBE admin console'}
              </span>
            }
            groups={sideNavGroups}
          />
        </div>
      }
      topbar={({ openNav }) => (
        <Topbar
          leading={
            <Button
              iconOnly
              variant="ghost"
              size="sm"
              aria-label={isVi ? 'Mở điều hướng' : 'Open navigation'}
              onClick={openNav}
              className="lg:hidden"
            >
              <Icon name="menu" size={16} />
            </Button>
          }
          breadcrumb={
            <span className="truncate text-xs text-fg-muted">
              VCUBE / {currentMeta.group} /{' '}
              <span className="font-medium text-fg">{currentMeta.title}</span>
            </span>
          }
          actions={
            <>
              {activeSection !== 'quote-calc' ? (
                <Button
                  variant="secondary"
                  size="sm"
                  leadingIcon={<Icon name="request_quote" size={16} />}
                  onClick={() => handleSelectSection('quote-calc')}
                  className="hidden sm:inline-flex"
                >
                  {isVi ? 'Báo giá BOM' : 'Quick quote'}
                </Button>
              ) : null}
              <Button
                variant="secondary"
                size="sm"
                leadingIcon={<Icon name="storefront" size={16} />}
                onClick={() => onNavigate('home')}
              >
                {isVi ? 'Về cửa hàng' : 'Storefront'}
              </Button>
            </>
          }
          avatar={
            <span
              aria-hidden="true"
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-fg"
            >
              AD
            </span>
          }
        />
      )}
    >
      {panelContent}
    </AppShell>
  );
};

export default AdminDashboardView;
