import React from 'react';
import { PricingConfigPanel } from '../PricingConfigPanel';
import {
  MaterialProfile,
  PrinterProfile,
  AccessoryItem,
  InkiriCostFormulaConfig
} from '../../../types';

export interface Group4PricingEnginePanelProps {
  initialSubTab?: 'formula' | 'materials' | 'accessories' | 'estimator';
  materials?: MaterialProfile[];
  printers?: PrinterProfile[];
  accessories?: AccessoryItem[];
  pricingConfig?: InkiriCostFormulaConfig;
  onUpdateMaterials?: (materials: MaterialProfile[]) => void;
  onUpdatePrinters?: (printers: PrinterProfile[]) => void;
  onUpdateAccessories?: (accessories: AccessoryItem[]) => void;
  onUpdatePricingConfig?: (config: InkiriCostFormulaConfig) => void;
  onShowToast?: (message: string) => void;
}

export const Group4PricingEnginePanel: React.FC<Group4PricingEnginePanelProps> = ({
  initialSubTab = 'formula',
  materials = [],
  printers = [],
  accessories = [],
  pricingConfig,
  onUpdateMaterials = () => {},
  onUpdatePrinters = () => {},
  onUpdateAccessories = () => {},
  onUpdatePricingConfig = () => {},
  onShowToast = () => {}
}) => {
  return (
    <div className="space-y-4">
      <div className="bg-surface p-4 rounded-lg shadow-e1 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 bg-primary-tint text-primary font-tech text-xs font-bold rounded-sm uppercase tracking-wider">
            DANH MỤC & ĐỊNH GIÁ
          </span>
          <span className="text-xs text-fg-subtle">Cấu hình tham số giá, khấu hao máy in, định mức nhựa & dự toán BOM</span>
        </div>
      </div>

      <PricingConfigPanel
        initialSubTab={initialSubTab}
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
    </div>
  );
};

export default Group4PricingEnginePanel;
