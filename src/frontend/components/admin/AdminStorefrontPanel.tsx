import React, { useState } from 'react';
import { SiteContentConfig } from '../../types';
import { useLanguage } from '../../context/LanguageContext';

interface AdminStorefrontPanelProps {
  siteContent: SiteContentConfig;
  onUpdateSiteContent: (content: SiteContentConfig) => void;
  onShowToast: (message: string) => void;
}

export const AdminStorefrontPanel: React.FC<AdminStorefrontPanelProps> = ({
  siteContent,
  onUpdateSiteContent,
  onShowToast,
}) => {
  const { language } = useLanguage();
  const isVi = language === 'vi';

  const [localContent, setLocalContent] = useState<SiteContentConfig>({ ...siteContent });
  const [isSaved, setIsSaved] = useState(true);

  const handleChange = <K extends keyof SiteContentConfig>(key: K, value: SiteContentConfig[K]) => {
    setLocalContent(prev => ({ ...prev, [key]: value }));
    setIsSaved(false);
  };

  const handleSave = () => {
    onUpdateSiteContent(localContent);
    setIsSaved(true);
    onShowToast(isVi ? 'Đã lưu cấu hình giao diện Storefront!' : 'Saved storefront settings!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-[#C5C6CD] p-5 sm:p-6 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-[#57DFFE]/20 text-[#00687A] font-tech text-[10px] font-bold rounded border border-[#57DFFE]/40 uppercase tracking-widest">
              STOREFRONT & CMS
            </span>
            <span className="text-xs text-[#545F73]">Quản lý nội dung hiển thị cho khách hàng</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-[#091426] mt-1 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#00687A]">storefront</span>
            {isVi ? 'Giao Diện Storefront & Banner Thông Báo' : 'Storefront CMS & Announcement Banner'}
          </h2>
          <p className="text-xs text-[#545F73] mt-0.5">
            Tùy chỉnh thông điệp thanh thông báo đầu trang, mức miễn phí vận chuyển và thông tin liên hệ xưởng.
          </p>
        </div>

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
          {isSaved ? (isVi ? 'Đã Lưu Nội Dung' : 'Saved') : (isVi ? 'Lưu Thay Đổi' : 'Save Changes')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Banner Section */}
        <div className="bg-white border border-[#C5C6CD] rounded-xl p-5 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-[#091426] flex items-center gap-2 border-b border-[#C5C6CD] pb-3">
            <span className="material-symbols-outlined text-[#00687A]">campaign</span>
            {isVi ? 'Thanh Thông Báo Đầu Trang (Top Banner)' : 'Top Header Banner'}
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 bg-[#F8F9FF] rounded-lg border border-[#C5C6CD]/60">
              <div>
                <p className="font-bold text-[#091426]">Bật / Tắt Thanh Thông Báo</p>
                <p className="text-[11px] text-[#545F73]">Hiển thị dải banner màu đỏ/cam ở đỉnh trang</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={localContent.announcementActive ?? true}
                  onChange={(e) => handleChange('announcementActive', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#00687A]"></div>
              </label>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-[#091426]">Nội dung Thông Báo (Banner)</label>
              <input
                type="text"
                value={localContent.announcementText || ''}
                onChange={(e) => handleChange('announcementText', e.target.value)}
                className="w-full p-2.5 border border-[#C5C6CD] rounded-lg text-xs font-bold"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-[#091426]">Tiêu đề Hero chính (Headline)</label>
              <input
                type="text"
                value={localContent.heroHeadline || ''}
                onChange={(e) => handleChange('heroHeadline', e.target.value)}
                className="w-full p-2.5 border border-[#C5C6CD] rounded-lg text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-[#091426]">Tiêu đề phụ Hero (Subheadline)</label>
              <input
                type="text"
                value={localContent.heroSubheadline || ''}
                onChange={(e) => handleChange('heroSubheadline', e.target.value)}
                className="w-full p-2.5 border border-[#C5C6CD] rounded-lg text-xs"
              />
            </div>
          </div>
        </div>

        {/* Store Shipping & Contact */}
        <div className="bg-white border border-[#C5C6CD] rounded-xl p-5 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-[#091426] flex items-center gap-2 border-b border-[#C5C6CD] pb-3">
            <span className="material-symbols-outlined text-[#00687A]">local_shipping</span>
            {isVi ? 'Chính Sách Vận Chuyển & Liên Hệ' : 'Shipping & Contact'}
          </h3>

          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-[#091426]">Ngưỡng Miễn Phí Vận Chuyển (VNĐ)</label>
              <input
                type="number"
                value={localContent.freeShippingThreshold || 500000}
                onChange={(e) => handleChange('freeShippingThreshold', Number(e.target.value))}
                className="w-full p-2.5 border border-[#C5C6CD] rounded-lg text-xs font-tech font-bold"
              />
              <p className="text-[10px] text-[#75777D]">Đơn hàng có tổng tiền vật lý trên mức này sẽ được free ship toàn quốc.</p>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-[#091426]">Phí Vận Chuyển Tiêu Chuẩn (VNĐ)</label>
              <input
                type="number"
                value={localContent.standardShippingFee || 30000}
                onChange={(e) => handleChange('standardShippingFee', Number(e.target.value))}
                className="w-full p-2.5 border border-[#C5C6CD] rounded-lg text-xs font-tech font-bold"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-[#091426]">Hotline Hỗ Trợ Kỹ Thuật Xưởng</label>
              <input
                type="text"
                value={localContent.hotline || '1900 6833'}
                onChange={(e) => handleChange('hotline', e.target.value)}
                className="w-full p-2.5 border border-[#C5C6CD] rounded-lg text-xs font-tech"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-[#091426]">Email Tiếp Nhận File CAD</label>
              <input
                type="email"
                value={localContent.contactEmail || 'cad@vcube.vn'}
                onChange={(e) => handleChange('contactEmail', e.target.value)}
                className="w-full p-2.5 border border-[#C5C6CD] rounded-lg text-xs font-tech"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-[#091426]">Tiêu chuẩn dung sai đo kiểm</label>
              <input
                type="text"
                value={localContent.toleranceSpec || '±0.05 mm Mitutoyo QC'}
                onChange={(e) => handleChange('toleranceSpec', e.target.value)}
                className="w-full p-2.5 border border-[#C5C6CD] rounded-lg text-xs font-tech"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
