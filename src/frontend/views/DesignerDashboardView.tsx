import React, { useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Product, MaterialProfile, InkiriCostFormulaConfig } from '../types';
import { useAuth } from '../context/AuthContext';
import { Button, Icon, PageHeader } from '@frontend/ui';
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
            <span className="rounded-sm border border-warning/30 bg-warning-tint px-2 py-0.5 text-xs font-semibold text-warning">
              CREATOR LEVEL 3
            </span>
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
          <DesignerOverviewTab
            products={products}
            onNavigate={onNavigate}
            onTabChange={setActiveTab}
            onSelectRequest={(reqId) => setSelectedReqId(reqId)}
          />
        )}
        {activeTab === 'models' && (
          <DesignerModelsManagerTab
            products={products}
            onUpdateProduct={onUpdateProduct}
            onDeleteProduct={onDeleteProduct}
            onShowToast={onShowToast}
            onNavigateToUpload={() => setActiveTab('wizard')}
          />
        )}
        {activeTab === 'wizard' && (
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
        )}
        {activeTab === 'requests' && (
          <DesignerRequestsTab
            currentDesignerName={currentDesignerName}
            onShowToast={onShowToast}
            selectedRequestId={selectedReqId}
          />
        )}
        {activeTab === 'payouts' && (
          <DesignerPayoutsTab
            currentDesignerName={currentDesignerName}
            onShowToast={onShowToast}
          />
        )}
      </div>
    </div>
  );
};

export default DesignerDashboardView;
