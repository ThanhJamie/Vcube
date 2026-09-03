import React, { useState } from 'react';
import { InkiriCostFormulaConfig } from '../../types';
import { useLanguage } from '../../context/LanguageContext';

interface AdminCostRulesPanelProps {
  config: InkiriCostFormulaConfig;
  onUpdateConfig: (config: InkiriCostFormulaConfig) => void;
  onShowToast: (message: string) => void;
}

export const AdminCostRulesPanel: React.FC<AdminCostRulesPanelProps> = ({
  config,
  onUpdateConfig,
  onShowToast,
}) => {
  const { language } = useLanguage();
  const isVi = language === 'vi';

  const [localConfig, setLocalConfig] = useState<InkiriCostFormulaConfig>({ ...config });
  const [isSaved, setIsSaved] = useState(true);

  const handleChange = <K extends keyof InkiriCostFormulaConfig>(key: K, value: InkiriCostFormulaConfig[K]) => {
    setLocalConfig(prev => ({ ...prev, [key]: value }));
    setIsSaved(false);
  };

  const handleSave = () => {
    onUpdateConfig(localConfig);
    setIsSaved(true);
    onShowToast(isVi ? 'Đã lưu cấu hình công thức Inkiri v3.4!' : 'Saved Inkiri v3.4 cost rules!');
  };

  const handleResetDefaults = () => {
    if (window.confirm(isVi ? 'Khôi phục công thức tính giá về mặc định VCUBE?' : 'Reset formula to default values?')) {
      const defaults: InkiriCostFormulaConfig = {
        electricityRatePerKWh: 2850,
        laborHourlyRate: 65000,
        fileReviewLaborMinutes: 4,
        setupLaborMinutes: 5,
        supportRemovalMinutes: 8,
        postProcessingLaborMinutes: 6,
        qcLaborMinutes: 4,
        packagingLaborMinutes: 3,
        fixedPackagingCost: 12000,
        multiColorPackagingExtra: 5000,
        overheadPerUnit: 15000,
        baseFailureReservePercent: 8,
        lowPrintabilityExtraPercent: 6,
        multiColorExtraPercent: 5,
        difficultMaterialExtraPercent: 4,
        defaultMarkupPercent: 35,
        platformCommissionPercent: 8,
        paymentGatewayFeePercent: 2.5,
        designerRoyaltyPercent: 5,
        roundingRule: '1000',
        volumeDiscounts: [
          { minQty: 5, discountPercent: 8, label: '5-9 pcs (-8%)' },
          { minQty: 10, discountPercent: 15, label: '10-49 pcs (-15%)' },
          { minQty: 50, discountPercent: 25, label: '50-99 pcs (-25%)' },
          { minQty: 100, discountPercent: 35, label: '100+ pcs (-35%)' }
        ]
      };
      setLocalConfig(defaults);
      onUpdateConfig(defaults);
      setIsSaved(true);
      onShowToast(isVi ? 'Đã khôi phục công thức mặc định' : 'Reset to default formula');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Save & Formula Info */}
      <div className="bg-white border border-[#C5C6CD] p-5 sm:p-6 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-[#00687A] text-white font-tech text-[10px] font-bold rounded uppercase tracking-widest">
              INKIRI PRICING ENGINE v3.4
            </span>
            <span className="text-xs text-[#545F73]">Thuật toán định giá gia công FDM & Resin</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-[#091426] mt-1 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#00687A]">calculate</span>
            {isVi ? 'Quy Tắc Định Giá & Chi Phí Vận Hành Xưởng' : 'Cost Rules & Inkiri Algorithmic Engine'}
          </h2>
          <p className="text-xs text-[#545F73] mt-0.5">
            Cấu hình các tham số chi phí độc lập. Giá thành sản phẩm được tính toán tự động qua: <code className="bg-slate-100 text-[#091426] px-1.5 py-0.5 rounded font-tech text-[11px]">Giá = (Vật liệu + Điện + Giờ máy + Nhân công + Hậu kỳ) × (1 + Rủi ro) × (1 + Biên LN)</code>
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleResetDefaults}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-[#091426] text-xs font-bold rounded-lg transition-colors cursor-pointer"
          >
            {isVi ? 'Mặc Định' : 'Reset'}
          </button>
          <button
            onClick={handleSave}
            disabled={isSaved}
            className={`px-4 py-2 text-xs font-bold rounded-lg uppercase transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
              isSaved
                ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                : 'bg-[#00687A] hover:bg-[#005463] text-white'
            }`}
          >
            <span className="material-symbols-outlined text-sm">save</span>
            {isSaved ? (isVi ? 'Đã Lưu Cấu Hình' : 'Saved') : (isVi ? 'Lưu Thay Đổi' : 'Save Changes')}
          </button>
        </div>
      </div>

      {/* 4 Independent Group Cards on Single Screen (Non-sequential) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* CARD 1: BASE COSTS (Electricity, Overhead, Packaging) */}
        <div className="bg-white border border-[#C5C6CD] rounded-xl p-5 shadow-xs space-y-4 hover:border-[#00687A]/50 transition-all">
          <div className="flex items-center gap-2.5 border-b border-[#C5C6CD] pb-3">
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-[#00687A] flex items-center justify-center">
              <span className="material-symbols-outlined text-base">bolt</span>
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#091426]">1. Chi Phí Cơ Sở & Vận Hành (Base Costs)</h3>
              <p className="text-[11px] text-[#545F73]">Điện năng, mặt bằng & chi phí đóng gói chuẩn</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <div className="flex justify-between">
                <label className="font-bold text-[#091426]">Giá điện lưới xưởng (VNĐ / kWh)</label>
                <span className="font-tech font-bold text-[#00687A]">{localConfig.electricityRatePerKWh.toLocaleString()} đ</span>
              </div>
              <input
                type="number"
                value={localConfig.electricityRatePerKWh}
                onChange={(e) => handleChange('electricityRatePerKWh', Number(e.target.value))}
                className="w-full p-2 border border-[#C5C6CD] rounded-lg text-xs font-tech"
              />
              <p className="text-[10px] text-[#75777D]">Khung giá điện sản xuất EVN trung bình xưởng in 3D.</p>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between">
                <label className="font-bold text-[#091426]">Chi phí quản lý chung & Mặt bằng (VNĐ / Sản phẩm)</label>
                <span className="font-tech font-bold text-[#00687A]">{localConfig.overheadPerUnit.toLocaleString()} đ</span>
              </div>
              <input
                type="number"
                value={localConfig.overheadPerUnit}
                onChange={(e) => handleChange('overheadPerUnit', Number(e.target.value))}
                className="w-full p-2 border border-[#C5C6CD] rounded-lg text-xs font-tech"
              />
              <p className="text-[10px] text-[#75777D]">Phân bổ tiền thuê nhà xưởng, phần mềm CAD bản quyền và khấu hao dụng cụ.</p>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between">
                <label className="font-bold text-[#091426]">Chi phí đóng gói hộp & xốp tiêu chuẩn (VNĐ / Đơn)</label>
                <span className="font-tech font-bold text-[#00687A]">{localConfig.fixedPackagingCost.toLocaleString()} đ</span>
              </div>
              <input
                type="number"
                value={localConfig.fixedPackagingCost}
                onChange={(e) => handleChange('fixedPackagingCost', Number(e.target.value))}
                className="w-full p-2 border border-[#C5C6CD] rounded-lg text-xs font-tech"
              />
            </div>
          </div>
        </div>

        {/* CARD 2: LABOR RATES (Setup, Post-process, Review) */}
        <div className="bg-white border border-[#C5C6CD] rounded-xl p-5 shadow-xs space-y-4 hover:border-[#00687A]/50 transition-all">
          <div className="flex items-center gap-2.5 border-b border-[#C5C6CD] pb-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <span className="material-symbols-outlined text-base">engineering</span>
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#091426]">2. Đơn Giá Nhân Công (Labor Rates)</h3>
              <p className="text-[11px] text-[#545F73]">Kỹ sư vận hành, bóc support & thẩm định file CAD</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <div className="flex justify-between">
                <label className="font-bold text-[#091426]">Đơn giá nhân công kỹ thuật (VNĐ / Giờ)</label>
                <span className="font-tech font-bold text-indigo-700">{localConfig.laborHourlyRate.toLocaleString()} đ/h</span>
              </div>
              <input
                type="number"
                value={localConfig.laborHourlyRate}
                onChange={(e) => handleChange('laborHourlyRate', Number(e.target.value))}
                className="w-full p-2 border border-[#C5C6CD] rounded-lg text-xs font-tech"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-[#091426]">Thời gian review CAD (Phút)</label>
                <input
                  type="number"
                  value={localConfig.fileReviewLaborMinutes}
                  onChange={(e) => handleChange('fileReviewLaborMinutes', Number(e.target.value))}
                  className="w-full p-2 border border-[#C5C6CD] rounded-lg text-xs font-tech"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-[#091426]">Thời gian Setup máy (Phút)</label>
                <input
                  type="number"
                  value={localConfig.setupLaborMinutes}
                  onChange={(e) => handleChange('setupLaborMinutes', Number(e.target.value))}
                  className="w-full p-2 border border-[#C5C6CD] rounded-lg text-xs font-tech"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-[#091426]">Tách Support & Gọt bavia (Phút)</label>
                <input
                  type="number"
                  value={localConfig.supportRemovalMinutes}
                  onChange={(e) => handleChange('supportRemovalMinutes', Number(e.target.value))}
                  className="w-full p-2 border border-[#C5C6CD] rounded-lg text-xs font-tech"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-[#091426]">Đo kiểm QC & Đóng gói (Phút)</label>
                <input
                  type="number"
                  value={(localConfig.qcLaborMinutes || 4) + (localConfig.packagingLaborMinutes || 3)}
                  onChange={(e) => handleChange('qcLaborMinutes', Number(e.target.value))}
                  className="w-full p-2 border border-[#C5C6CD] rounded-lg text-xs font-tech"
                />
              </div>
            </div>
          </div>
        </div>

        {/* CARD 3: MARGIN & RISK (Target Margin, Failure Risk) */}
        <div className="bg-white border border-[#C5C6CD] rounded-xl p-5 shadow-xs space-y-4 hover:border-[#00687A]/50 transition-all">
          <div className="flex items-center gap-2.5 border-b border-[#C5C6CD] pb-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <span className="material-symbols-outlined text-base">trending_up</span>
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#091426]">3. Biên Lợi Nhuận & Rủi Ro Hỏng (Margin & Risk)</h3>
              <p className="text-[11px] text-[#545F73]">Tỉ lệ bù hao hụt fail in & biên lợi nhuận kỳ vọng</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <div className="flex justify-between">
                <label className="font-bold text-[#091426]">Tỉ lệ bù rủi ro in lỗi cơ bản (%)</label>
                <span className="font-tech font-bold text-amber-700">{localConfig.baseFailureReservePercent}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="25"
                step="1"
                value={localConfig.baseFailureReservePercent}
                onChange={(e) => handleChange('baseFailureReservePercent', Number(e.target.value))}
                className="w-full accent-amber-600"
              />
              <p className="text-[10px] text-[#75777D]">Bù đắp vật liệu và thời gian máy khi in bị tuột đế hoặc kẹt nhựa.</p>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between">
                <label className="font-bold text-[#091426]">Biên lợi nhuận gộp mục tiêu / Markup (%)</label>
                <span className="font-tech font-bold text-emerald-700">{localConfig.defaultMarkupPercent}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="80"
                step="5"
                value={localConfig.defaultMarkupPercent}
                onChange={(e) => handleChange('defaultMarkupPercent', Number(e.target.value))}
                className="w-full accent-[#00687A]"
              />
              <p className="text-[10px] text-[#75777D]">Tỉ lệ cộng giá trên tổng chi phí sản xuất COGS.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-[#091426]">Phí cổng thanh toán (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={localConfig.paymentGatewayFeePercent}
                  onChange={(e) => handleChange('paymentGatewayFeePercent', Number(e.target.value))}
                  className="w-full p-2 border border-[#C5C6CD] rounded-lg text-xs font-tech"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-[#091426]">Hoa hồng Designer (%)</label>
                <input
                  type="number"
                  step="0.5"
                  value={localConfig.designerRoyaltyPercent}
                  onChange={(e) => handleChange('designerRoyaltyPercent', Number(e.target.value))}
                  className="w-full p-2 border border-[#C5C6CD] rounded-lg text-xs font-tech"
                />
              </div>
            </div>
          </div>
        </div>

        {/* CARD 4: VOLUME DISCOUNTS (Tiered discounts for B2B) */}
        <div className="bg-white border border-[#C5C6CD] rounded-xl p-5 shadow-xs space-y-4 hover:border-[#00687A]/50 transition-all">
          <div className="flex items-center gap-2.5 border-b border-[#C5C6CD] pb-3">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center">
              <span className="material-symbols-outlined text-base">percent</span>
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#091426]">4. Chiết Khấu Số Lượng Lớn (Volume Discounts)</h3>
              <p className="text-[11px] text-[#545F73]">Tự động áp dụng khi khách đặt số lượng nhiều</p>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            {localConfig.volumeDiscounts.map((tier, idx) => (
              <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-[#F8F9FF] border border-[#C5C6CD]/60 font-tech">
                <span className="font-bold text-[#091426] font-sans">
                  Từ {tier.minQty} sản phẩm trở lên:
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={tier.discountPercent}
                    onChange={(e) => {
                      const updated = [...localConfig.volumeDiscounts];
                      updated[idx] = { ...updated[idx], discountPercent: Number(e.target.value) };
                      handleChange('volumeDiscounts', updated);
                    }}
                    className="w-16 px-2 py-1 bg-white border border-[#C5C6CD] rounded text-right font-bold text-[#00687A]"
                  />
                  <span className="font-bold text-[#545F73]">% Giảm</span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-base text-emerald-700">verified</span>
            <span>Áp dụng tự động trên cả Báo Giá Nhanh và Đơn Hàng Thương Mại.</span>
          </div>
        </div>

      </div>
    </div>
  );
};
