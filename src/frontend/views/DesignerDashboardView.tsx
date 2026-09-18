import React, { useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Product, MaterialProfile, InkiriCostFormulaConfig } from '../types';
import { useAuth } from '../context/AuthContext';
import { Button, Icon, PageHeader, PanelErrorBoundary } from '@frontend/ui';
import { DesignerOverviewTab } from '../components/designer/DesignerOverviewTab';
import { DesignerModelsManagerTab } from '../components/designer/DesignerModelsManagerTab';
import { DesignerUploadWizardTab } from '../components/designer/DesignerUploadWizardTab';
import { DesignerPayoutsTab } from '../components/designer/DesignerPayoutsTab';
import { DesignerRequestsTab } from '../components/designer/DesignerRequestsTab';

type DesignerTabId = 'overview' | 'models' | 'wizard' | 'payouts' | 'requests';
const DESIGNER_TAB_IDS: DesignerTabId[] = ['overview', 'models', 'wizard', 'payouts', 'requests'];

interface DesignerDashboardViewProps {
  products: Product[];
  onAddNewProduct: (product: Product) => void;
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
              Xem Catalog VCUBE
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
        {activeTab === 'overview' && (
          <PanelErrorBoundary label="Tổng quan nhà thiết kế" resetKey={activeTab}>
            <DesignerOverviewTab
              products={products}
              currentDesignerId={user?.id}
              onNavigate={onNavigate}
              onTabChange={setActiveTab}
              onSelectRequest={(reqId) => setSelectedReqId(reqId)}
            />
          </PanelErrorBoundary>
        )}
        {activeTab === 'models' && (
          <PanelErrorBoundary label="Quản lý ấn phẩm" resetKey={activeTab}>
            <DesignerModelsManagerTab
              products={products}
              currentDesignerName={currentDesignerName}
              onUpdateProduct={onUpdateProduct}
              onDeleteProduct={onDeleteProduct}
              onShowToast={onShowToast}
              onNavigateToUpload={() => setActiveTab('wizard')}
            />
          </PanelErrorBoundary>
        )}
        {activeTab === 'wizard' && (
          <PanelErrorBoundary label="Đăng tải ấn phẩm" resetKey={activeTab}>
            <DesignerUploadWizardTab
              onAddNewProduct={(prod) => {
                onAddNewProduct(prod);
                setActiveTab('models');
              }}
              onShowToast={onShowToast}
              currentDesignerName={currentDesignerName}
              designerAvatar={profile?.avatarUrl}
              onCancel={() => setActiveTab('models')}
            />
          </PanelErrorBoundary>
        )}
        {activeTab === 'requests' && (
          <PanelErrorBoundary label="Yêu cầu thiết kế" resetKey={activeTab}>
            <DesignerRequestsTab
              currentDesignerName={currentDesignerName}
              currentDesignerId={user?.id}
              onShowToast={onShowToast}
              selectedRequestId={selectedReqId}
            />
          </PanelErrorBoundary>
        )}
        {activeTab === 'payouts' && (
          <PanelErrorBoundary label="Quyết toán bản quyền" resetKey={activeTab}>
            <DesignerPayoutsTab
              currentDesignerName={currentDesignerName}
              onShowToast={onShowToast}
            />
          </PanelErrorBoundary>
        )}
      </div>
    </div>
  );
};

export default DesignerDashboardView;
