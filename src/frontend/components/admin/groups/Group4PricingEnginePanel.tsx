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
      <div className="bg-white border border-[#CBD5E1] p-4 rounded-2xl shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 bg-teal-100 text-teal-800 font-tech text-[10px] font-bold rounded uppercase tracking-wider">
            GROUP 4: INKIRI PRICING ENGINE V3.4
          </span>
          <span className="text-xs text-slate-500">Cấu hình tham số giá, khấu hao máy in, định mức nhựa & dự toán BOM</span>
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
