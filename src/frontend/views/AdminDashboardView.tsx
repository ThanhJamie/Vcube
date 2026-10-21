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
import {
  AdminNavSection,
  buildAdminNavGroups,
} from '../components/admin/AdminSidebar';
import { AppShell, Button, Field, Icon, Input, PanelErrorBoundary, SideNav, Topbar } from '@frontend/ui';

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
  <div className="space-y-6 animate-pulse motion-reduce:animate-none p-2 sm:p-4">
    <div className="space-y-3 rounded-lg border border-line-subtle bg-surface p-6">
      <div className="h-4 w-1/4 rounded-md bg-surface-muted"></div>
      <div className="h-8 w-1/2 rounded-md bg-surface-muted"></div>
      <div className="h-3 w-3/4 rounded-md bg-surface-muted"></div>
    </div>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-32 space-y-3 rounded-lg border border-line-subtle bg-surface p-5">
          <div className="h-3 w-1/2 rounded-sm bg-surface-muted"></div>
          <div className="h-7 w-3/4 rounded-sm bg-surface-muted"></div>
          <div className="h-2 w-full rounded-sm bg-surface-muted"></div>
        </div>
      ))}
    </div>
    <div className="flex h-80 items-center justify-center rounded-lg border border-line-subtle bg-surface p-6">
      <div className="flex flex-col items-center gap-2 font-mono text-xs uppercase tracking-wider text-fg-subtle">
        <Icon name="sync" size={28} className="animate-spin motion-reduce:animate-none text-fg-muted" />
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
      group: 'Tổng quan',
      title: 'Bảng Điều Khiển Trung Tâm',
      icon: 'dashboard'
    },
    'group0-overview': {
      group: 'Tổng quan',
      title: 'Bảng Điều Khiển Trung Tâm',
      icon: 'dashboard'
    },
    partners: {
      group: 'Xưởng in & Thiết bị',
      title: 'Mạng Lưới Xưởng In Đối Tác (MES)',
      icon: 'factory'
    },
    workshops: {
      group: 'Xưởng in & Thiết bị',
      title: 'Mạng Lưới Xưởng In Đối Tác (MES)',
      icon: 'factory'
    },
    machines: {
      group: 'Xưởng in & Thiết bị',
      title: 'Đội Máy In 3D FDM / SLA',
      icon: 'print'
    },
    designers: {
      group: 'Nhà thiết kế',
      title: 'Quản Trị Nhà Thiết Kế 3D & Bản Quyền',
      icon: 'draw'
    },
    users: {
      group: 'Khách hàng',
      title: 'Quản Trị Khách Hàng & Hồ Sơ KYC',
      icon: 'manage_accounts'
    },
    customers: {
      group: 'Khách hàng',
      title: 'Quản Trị Khách Hàng & Hồ Sơ KYC',
      icon: 'manage_accounts'
    },
    pricing: {
      group: 'Danh mục & Định giá',
      title: 'Cấu Hình Định Giá & Chi Phí Inkiri v3.4',
      icon: 'tune'
    },
    'pricing-engine': {
      group: 'Danh mục & Định giá',
      title: 'Cấu Hình Định Giá & Chi Phí Inkiri v3.4',
      icon: 'tune'
    },
    'pricing-setup': {
      group: 'Danh mục & Định giá',
      title: 'Cấu Hình Định Giá Inkiri',
      icon: 'tune'
    },
    'cost-rules': {
      group: 'Danh mục & Định giá',
      title: 'Quy Tắc Chi Phí Inkiri',
      icon: 'tune'
    },
    materials: {
      group: 'Danh mục & Định giá',
      title: 'Danh Mục Nhựa & Resin',
      icon: 'layers'
    },
    hardware: {
      group: 'Danh mục & Định giá',
      title: 'Phụ Kiện, Ốc Cấy & Nam Châm',
      icon: 'extension'
    },
    'quote-calc': {
      group: 'Danh mục & Định giá',
      title: 'Báo Giá Dự Toán BOM Kỹ Thuật',
      icon: 'calculate'
    },
    queue: {
      group: 'Vận hành sản xuất',
      title: 'Hàng Đợi Chế Tác & Kanban 8 Nấc',
      icon: 'precision_manufacturing'
    },
    orders: {
      group: 'Vận hành sản xuất',
      title: 'Đơn Hàng & Điều Phối Trạm In',
      icon: 'receipt_long'
    },
    inventory: {
      group: 'Vận hành sản xuất',
      title: 'Kho Vật Liệu & Vị Trí Kệ',
      icon: 'shelves'
    },
    products: {
      group: 'CỬA HÀNG & HỆ THỐNG',
      title: 'Sản Phẩm & Danh Mục 3D',
      icon: 'inventory_2'
    },
    storefront: {
      group: 'CỬA HÀNG & HỆ THỐNG',
      title: 'Cấu Hình Trang Chủ & Dải Quảng Cáo',
      icon: 'storefront'
    },
    seo: {
      group: 'CỬA HÀNG & HỆ THỐNG',
      title: 'Quản Trị SEO Toàn Diện',
      icon: 'travel_explore'
    },
    settings: {
      group: 'CỬA HÀNG & HỆ THỐNG',
      title: 'Cài Đặt Xưởng In & Pháp Nhân',
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
  const navGroups = buildAdminNavGroups(counts);
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
    <>
      {/*
        CC-06 (W5): console admin trước đây KHÔNG có heading cấp 1 nào (mọi panel tự dựng `<h2>`),
        nên cấu trúc heading khác `/designer` + `/lab` (dùng `PageHeader` có `h1`). Thêm MỘT `h1`
        `sr-only` theo đúng section đang mở (URL là nguồn sự thật, `currentMeta` đã bản địa hoá):
        đủ 1 h1/trang cho screen reader, không đổi layout/density/visual của console.
      */}
      <h1 className="sr-only">{currentMeta.title}</h1>
      <Suspense fallback={<AdminPanelLoadingSkeleton />}>
        {/* Mỗi panel được bọc riêng: một panel lỗi chỉ thay đúng panel đó, không trắng cả console. */}
        {(activeSection === 'overview' || activeSection === 'group0-overview') && (
          <PanelErrorBoundary
            label="Bảng điều khiển tổng quan"
            resetKey={activeSection}
          >
            <Group0OverviewPanel
              orders={orders}
              products={products}
              printers={printers}
              materials={materials}
              accessories={accessories}
              onNavigateSection={handleSelectSection}
              onNavigateTracking={(order) => onNavigate('tracking', { order })}
            />
          </PanelErrorBoundary>
        )}

        {/* Xưởng in & thiết bị */}
        {(activeSection === 'workshops' || activeSection === 'partners' || activeSection === 'machines') && (
          <PanelErrorBoundary
            label={'Xưởng in & thiết bị'}
            resetKey={activeSection}
          >
            <Group1WorkshopsPanel
              printers={printers}
              onUpdatePrinters={onUpdatePrinters}
              onShowToast={onShowToast}
              onNavigateSection={handleSelectSection}
              section={activeSection}
            />
          </PanelErrorBoundary>
        )}

        {/* Nhà thiết kế & bản quyền */}
        {activeSection === 'designers' && (
          <PanelErrorBoundary
            label={'Nhà thiết kế & bản quyền'}
            resetKey={activeSection}
          >
            <Group2DesignersPanel
              onShowToast={onShowToast}
              onNavigateSection={handleSelectSection}
            />
          </PanelErrorBoundary>
        )}

        {/* Khách hàng & KYC */}
        {(activeSection === 'users' || activeSection === 'customers') && (
          <PanelErrorBoundary
            label={'Khách hàng & hồ sơ KYC'}
            resetKey={activeSection}
          >
            <Group3CustomersPanel
              onShowToast={onShowToast}
              onNavigateSection={handleSelectSection}
            />
          </PanelErrorBoundary>
        )}

        {/* Danh mục & định giá (Inkiri) */}
        {(activeSection === 'pricing' ||
          activeSection === 'pricing-engine' ||
          activeSection === 'pricing-setup' ||
          activeSection === 'cost-rules' ||
          activeSection === 'materials' ||
          activeSection === 'hardware' ||
          activeSection === 'quote-calc') && (
          <PanelErrorBoundary
            label={'Danh mục & định giá'}
            resetKey={activeSection}
          >
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
          </PanelErrorBoundary>
        )}

        {/* Vận hành sản xuất — BA mục menu, BA màn KHÁC NHAU:
            queue  = Hàng Đợi & Kanban 8 nấc (tab mặc định: kanban)
            orders = Đơn Hàng & Điều Phối trạm in (tab mặc định: dispatcher)
            inventory = Kho Vật Liệu & Vị Trí Kệ (WarehouseInventoryPanel) */}
        {(activeSection === 'queue' || activeSection === 'orders') && (
          <PanelErrorBoundary
            label="Vận hành sản xuất"
            resetKey={activeSection}
          >
            <Group5ProductionPanel
              section={activeSection}
              onUpdateOrderStatus={onUpdateOrderStatus}
              onNavigateTracking={(order) => onNavigate('tracking', { order })}
              onShowToast={onShowToast}
              onNavigateSection={handleSelectSection}
            />
          </PanelErrorBoundary>
        )}

        {activeSection === 'inventory' && (
          <PanelErrorBoundary
            label="Kho vật liệu"
            resetKey={activeSection}
          >
            <WarehouseInventoryPanel
              materials={materials}
              accessories={accessories}
              onUpdateMaterials={onUpdateMaterials}
              onUpdateAccessories={onUpdateAccessories}
              onShowToast={onShowToast}
            />
          </PanelErrorBoundary>
        )}

        {/* STOREFRONT, CONTENT & SYSTEM CMS */}
        {activeSection === 'products' && (
          <PanelErrorBoundary
            label={'Sản phẩm & danh mục'}
            resetKey={activeSection}
          >
            <AdminProductsPanel
              products={products}
              onAddProduct={onAddProduct}
              onUpdateProduct={onUpdateProduct}
              onDeleteProduct={onDeleteProduct}
              onShowToast={onShowToast}
            />
          </PanelErrorBoundary>
        )}

        {activeSection === 'storefront' && (
          <PanelErrorBoundary
            label="Cấu hình cửa hàng"
            resetKey={activeSection}
          >
            <AdminStorefrontPanel
              siteContent={siteContent}
              onUpdateSiteContent={onUpdateSiteContent}
              onShowToast={onShowToast}
            />
          </PanelErrorBoundary>
        )}

        {activeSection === 'seo' && (
          <PanelErrorBoundary
            label="Quản trị SEO"
            resetKey={activeSection}
          >
            <AdminSeoPanel
              siteContent={siteContent}
              onUpdateSiteContent={onUpdateSiteContent}
              onShowToast={onShowToast}
            />
          </PanelErrorBoundary>
        )}

        {activeSection === 'settings' && (
          <PanelErrorBoundary
            label="Cài đặt xưởng in"
            resetKey={activeSection}
          >
            <AdminSettingsPanel
              onShowToast={onShowToast}
            />
          </PanelErrorBoundary>
        )}
      </Suspense>
    </>
  );

  return (
    <AppShell
      collapsed={isNavCollapsed}
      mobileOpen={isMobileNavOpen}
      onMobileOpenChange={setIsMobileNavOpen}
      navLabel="Điều hướng quản trị"
      sidebar={
        <div className="flex h-full min-h-0 flex-col bg-canvas">
          {/* Tìm nhanh mục điều hướng — giữ nguyên tính năng của AdminSidebar cũ. */}
          <div className="shrink-0 border-b border-line px-2 py-2">
            <Field
              id="admin-nav-search"
              label="Tìm mục điều hướng"
              hideLabel
            >
              {(control) => (
                <Input
                  {...control}
                  type="search"
                  size="sm"
                  // CC-11: ô tìm kiếm dùng search pill (`rounded-full`, §3.3) như search storefront,
                  // không còn 12px vuông như input thường. Chỉ search, không đổi control khác.
                  className="rounded-full"
                  value={navSearch}
                  onChange={(e) => setNavSearch(e.target.value)}
                  placeholder="Tìm mục (kho, máy in, giá…)"
                />
              )}
            </Field>
            {navQuery && filteredNavGroups.length === 0 ? (
              <p className="px-1 pt-2 text-xs text-fg-muted">
                Không có mục nào khớp từ khoá.
              </p>
            ) : null}
          </div>

          <SideNav
            variant="pill"
            className="min-h-0 flex-1"
            label="Điều hướng quản trị"
            collapsed={isNavCollapsed}
            onCollapsedChange={setIsNavCollapsed}
            activeId={activeSection}
            onSelect={(id) => handleSelectSection(id as AdminNavSection)}
            footer={
              <span className="block truncate px-1 text-center text-xs text-fg-muted">
                Bảng quản trị VCUBE
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
              aria-label="Mở điều hướng"
              aria-expanded={isMobileNavOpen}
              onClick={openNav}
              className="lg:hidden"
            >
              <Icon name="menu" size={16} />
            </Button>
          }
          brand={
            <span className="flex min-w-0 items-center gap-2">
              {/* CC-08: brand mark console = coral như mọi shell (`bg-brand text-fg`, D3), không
                  phải ô đen `bg-primary`; console giữ `shadow-e0` (không dùng `shadow-soft`). */}
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-brand text-fg shadow-e0">
                <Icon name="deployed_code" size={16} />
              </span>
              <span className="hidden min-w-0 flex-col leading-tight sm:flex">
                <span className="truncate text-sm font-semibold tracking-tight text-fg">VCUBE</span>
                <span className="truncate text-xs text-fg-subtle">
                  Hệ điều hành xưởng in
                </span>
              </span>
            </span>
          }
          breadcrumb={
            <span className="truncate text-xs text-fg-subtle">
              VCUBE / {currentMeta.group} /{' '}
              <span className="font-medium text-fg">{currentMeta.title}</span>
            </span>
          }
          actions={
            <>
              {activeSection !== 'quote-calc' ? (
                <span className="hidden sm:inline-flex">
                  <Button
                    variant="secondary"
                    size="sm"
                    leadingIcon={<Icon name="request_quote" size={16} />}
                    onClick={() => handleSelectSection('quote-calc')}
                  >
                    Báo giá BOM
                  </Button>
                </span>
              ) : null}
              <Button
                variant="secondary"
                size="sm"
                leadingIcon={<Icon name="storefront" size={16} />}
                onClick={() => onNavigate('home')}
              >
                Về cửa hàng
              </Button>
            </>
          }
          avatar={
            <span
              aria-hidden="true"
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-fg"
            >
              QT
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
