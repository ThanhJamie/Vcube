import React from 'react';
import { Button, Icon } from '@frontend/ui';
import { FormulaAddonSections } from './FormulaAddonSections';
import { FormulaCoreSections } from './FormulaCoreSections';
import { FormulaGlobalCard } from './FormulaGlobalCard';
import { FormulaVolumeDiscount } from './FormulaVolumeDiscount';
import type { FormulaTabProps } from './types';

export const FormulaTab: React.FC<FormulaTabProps> = (props) => {
  const { handleSaveFormula } = props;

  return (
        <form
          role="tabpanel"
          id="pricing-panel-formula"
          aria-labelledby="pricing-tab-formula"
          onSubmit={handleSaveFormula}
          className="space-y-6"
        >

          {/* KHO RIÊNG: pricing_global_settings — VAT · điện · nhân công (có audit log) */}
          <FormulaGlobalCard {...props} />

          <FormulaCoreSections {...props} />

          {/* Section 4: Volume Discount Tiers */}
          <FormulaVolumeDiscount {...props} />

          {/* Section 5: Customization & Service Addon Fees */}
          <FormulaAddonSections {...props} />

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="submit"
              variant="primary"
              leadingIcon={<Icon name="check_circle" size={18} />}
            >
              Lưu Toàn Bộ Cấu Hình Công Thức
            </Button>
          </div>
        </form>
  );
};
