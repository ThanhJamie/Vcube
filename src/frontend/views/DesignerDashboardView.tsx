import React, { useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Product, MaterialProfile, InkiriCostFormulaConfig } from '@/types';
import { useAuth } from '../context/AuthContext';
import { Button, Icon, PageHeader } from '@frontend/ui';
import { DashboardPanelHost, DashboardTabNav } from '../components/dashboard/DashboardTabs';
import type { DashboardTab } from '../components/dashboard/DashboardTabs';
import { DesignerOverviewTab } from '../components/designer/DesignerOverviewTab';
import { DesignerModelsManagerTab } from '../components/designer/DesignerModelsManagerTab';
import { DesignerUploadWizardTab } from '../components/designer/DesignerUploadWizardTab';
import { DesignerPayoutsTab } from '../components/designer/DesignerPayoutsTab';
import { DesignerRequestsTab } from '../components/designer/DesignerRequestsTab';

type DesignerTabId = 'overview' | 'models' | 'wizard' | 'payouts' | 'requests';
const DESIGNER_TAB_IDS: DesignerTabId[] = ['overview', 'models', 'wizard', 'payouts', 'requests'];

/** Nhãn segmented control §3.6 — chỉ là trình bày, `setActiveTab` vẫn điều hướng `/designer/<id>`. */
const DESIGNER_TAB_LABELS: Record<DesignerTabId, string> = {
  overview: 'Tổng quan',
  models: 'Ấn phẩm',
  wizard: 'Đăng tải',
  payouts: 'Quyết toán',
  requests: 'Yêu cầu CAD',
};

interface DesignerDashboardViewProps {
  products: Product[];
  onAddNewProduct: (product: Product) => void | Promise<void>;
  onUpdateProduct?: (product: Product) => void;
  onDeleteProduct?: (productId: string) => void;
  materials?: MaterialProfile[];
  pricingConfig?: InkiriCostFormulaConfig;
  onNavigate: (screen: string, payload?: any) => void;
  onShowToast: (message: string) => void;
}

export const DesignerDashboardView: React.FC<DesignerDashboardViewProps> = ({
  products,
  onAddNewProduct,
  onUpdateProduct,
  onDeleteProduct,
  onNavigate,
  onShowToast,
}) => {
  const { user, profile } = useAuth();
  const currentDesignerName = profile?.displayName || user?.email || '—';

  const { tab: tabParam } = useParams<{ tab?: string }>();
  const navigate = useNavigate();
  const activeTab: DesignerTabId = DESIGNER_TAB_IDS.includes(tabParam as DesignerTabId)
    ? (tabParam as DesignerTabId)
    : 'overview';

  const [selectedReqId, setSelectedReqId] = useState<string | undefined>(undefined);

  const setActiveTab = useCallback(
    (next: DesignerTabId) => {
      navigate(`/designer/${next}`);
    },
    [navigate]
  );

  /**
   * Nội dung từng tab — giữ nguyên props của 5 panel cũ.
   * `keepAlive` mặc định true: đổi tab KHÔNG unmount panel ⇒ giữ bản nháp wizard,
   * filter danh sách và dữ liệu đã tải (không fetch lại).
   */
  const tabContent: Record<DesignerTabId, Pick<DashboardTab, 'element' | 'boundaryLabel'>> = {
    overview: {
      boundaryLabel: 'Tổng quan nhà thiết kế',
      element: (
        <DesignerOverviewTab
          products={products}
          currentDesignerId={user?.id}
          onNavigate={onNavigate}
          onTabChange={setActiveTab}
          onSelectRequest={(reqId) => setSelectedReqId(reqId)}
        />
      ),
    },
    models: {
      boundaryLabel: 'Quản lý ấn phẩm',
      element: (
        <DesignerModelsManagerTab
          products={products}
          currentDesignerName={currentDesignerName}
          onUpdateProduct={onUpdateProduct}
          onDeleteProduct={onDeleteProduct}
          onShowToast={onShowToast}
          onNavigateToUpload={() => setActiveTab('wizard')}
        />
      ),
    },
    wizard: {
      boundaryLabel: 'Đăng tải ấn phẩm',
      element: (
        <DesignerUploadWizardTab
          // OPS-19: wrapper trả promise — chỉ chuyển sang tab Ấn phẩm khi DB đã ghi xong.
          // `handleAddNewProduct` rollback + throw khi insert lỗi ⇒ wizard bắt lỗi, giữ tab,
          // không báo thành công giả.
          onAddNewProduct={async (prod) => {
            await onAddNewProduct(prod);
            setActiveTab('models');
          }}
          onShowToast={onShowToast}
          currentDesignerName={currentDesignerName}
          designerAvatar={profile?.avatarUrl}
          onCancel={() => setActiveTab('models')}
        />
      ),
    },
    payouts: {
      boundaryLabel: 'Quyết toán bản quyền',
      element: (
        <DesignerPayoutsTab currentDesignerName={currentDesignerName} onShowToast={onShowToast} />
      ),
    },
    requests: {
      boundaryLabel: 'Yêu cầu thiết kế',
      element: (
        <DesignerRequestsTab
          currentDesignerName={currentDesignerName}
          currentDesignerId={user?.id}
          onShowToast={onShowToast}
          selectedRequestId={selectedReqId}
        />
      ),
    },
  };

  // Thứ tự tab lấy từ DESIGNER_TAB_IDS để không lệch với nav cũ.
  const tabs: DashboardTab[] = DESIGNER_TAB_IDS.map((tabId) => ({
    id: tabId,
    label: DESIGNER_TAB_LABELS[tabId],
    keepAlive: true,
    ...tabContent[tabId],
  }));

  return (
    <div className="flex w-full flex-col gap-section font-sans text-fg">
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            <span>Quản Lý Ấn Phẩm &amp; Giá In 3D</span>
          </span>
        }
        description="Ấn phẩm số, giá bán và quyết toán bản quyền của tác giả."
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              leadingIcon={<Icon name="storefront" size={16} />}
              onClick={() => onNavigate('explore')}
            >
              Xem danh mục VCUBE
            </Button>
            <Button
              variant="primary"
              size="sm"
              leadingIcon={<Icon name="upload_file" size={16} />}
              onClick={() => setActiveTab('wizard')}
            >
              Đăng Tải Ấn Phẩm Mới
            </Button>
          </>
        }
      />

      <div className="flex w-full flex-col gap-block">
        <DashboardTabNav
          tabs={tabs}
          activeId={activeTab}
          onSelect={(id) => setActiveTab(id as DesignerTabId)}
          ariaLabel="Mục trong bảng điều khiển nhà thiết kế"
        />
        <DashboardPanelHost tabs={tabs} activeId={activeTab} maxKept={5} />
      </div>
    </div>
  );
};

export default DesignerDashboardView;
