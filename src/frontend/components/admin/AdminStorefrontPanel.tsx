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
  const [activeTab, setActiveTab] = useState<'hero' | 'announcement' | 'workflow' | 'estimator' | 'facilities'>('hero');
  const [isSaved, setIsSaved] = useState(true);

  const handleChange = <K extends keyof SiteContentConfig>(key: K, value: SiteContentConfig[K]) => {
    setLocalContent(prev => ({ ...prev, [key]: value }));
    setIsSaved(false);
  };

  const handleSave = () => {
    onUpdateSiteContent(localContent);
    setIsSaved(true);
    onShowToast(isVi ? 'Đã lưu cấu hình giao diện Landing Page & Storefront!' : 'Saved Landing Page & Storefront CMS settings!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-[#CBD5E1] p-5 sm:p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-[#00687A]/10 text-[#00687A] font-mono text-[10px] font-bold rounded-md border border-[#00687A]/30 uppercase tracking-widest">
              LANDING PAGE CMS // STOREFRONT
            </span>
            <span className="text-xs text-[#64748B]">Quản lý 100% nội dung hiển thị trên trang chủ</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#091426] mt-1.5 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#00687A]">tune</span>
            {isVi ? 'Quản Trị Nội Dung Landing Page VCUBE' : 'Landing Page Dynamic Content CMS'}
          </h2>
          <p className="text-xs text-[#64748B] mt-1">
            Tùy chỉnh linh hoạt mọi văn bản, tiêu đề, thông số đo kiểm, quy trình xưởng và cam kết sản xuất trên trang chủ.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleSave}
            disabled={isSaved}
            className={`px-5 py-2.5 text-xs font-bold rounded-xl uppercase tracking-wider transition-all flex items-center gap-2 shadow-md cursor-pointer ${
              isSaved
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                : 'bg-gradient-to-r from-[#00687A] to-[#0E7490] hover:from-[#005260] hover:to-[#085F75] text-white shadow-[#00687A]/25'
            }`}
          >
            <span className="material-symbols-outlined text-base">save</span>
            {isSaved ? (isVi ? 'Đã Lưu Nội Dung' : 'All Changes Saved') : (isVi ? 'Lưu Thay Đổi Ngay' : 'Save Changes Now')}
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-[#CBD5E1]">
        <button
          onClick={() => setActiveTab('hero')}
          className={`px-4 py-2.5 rounded-xl font-sans text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'hero'
              ? 'bg-[#091426] text-white shadow-sm'
              : 'bg-white text-[#475569] hover:bg-slate-100 border border-[#CBD5E1]'
          }`}
        >
          <span className="material-symbols-outlined text-base">view_carousel</span>
          <span>Hero & Chỉ Số Đo Kiểm</span>
        </button>

        <button
          onClick={() => setActiveTab('announcement')}
          className={`px-4 py-2.5 rounded-xl font-sans text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'announcement'
              ? 'bg-[#091426] text-white shadow-sm'
              : 'bg-white text-[#475569] hover:bg-slate-100 border border-[#CBD5E1]'
          }`}
        >
          <span className="material-symbols-outlined text-base">campaign</span>
          <span>Banner Đầu Trang</span>
        </button>

        <button
          onClick={() => setActiveTab('workflow')}
          className={`px-4 py-2.5 rounded-xl font-sans text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'workflow'
              ? 'bg-[#091426] text-white shadow-sm'
              : 'bg-white text-[#475569] hover:bg-slate-100 border border-[#CBD5E1]'
          }`}
        >
          <span className="material-symbols-outlined text-base">precision_manufacturing</span>
          <span>Quy Trình Xưởng 3 Bước</span>
        </button>

        <button
          onClick={() => setActiveTab('estimator')}
          className={`px-4 py-2.5 rounded-xl font-sans text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'estimator'
              ? 'bg-[#091426] text-white shadow-sm'
              : 'bg-white text-[#475569] hover:bg-slate-100 border border-[#CBD5E1]'
          }`}
        >
          <span className="material-symbols-outlined text-base">calculate</span>
          <span>Bộ Tính Giá Nhanh (Estimator)</span>
        </button>

        <button
          onClick={() => setActiveTab('facilities')}
          className={`px-4 py-2.5 rounded-xl font-sans text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'facilities'
              ? 'bg-[#091426] text-white shadow-sm'
              : 'bg-white text-[#475569] hover:bg-slate-100 border border-[#CBD5E1]'
          }`}
        >
          <span className="material-symbols-outlined text-base">domain</span>
          <span>Đối Tác & Cơ Sở Xưởng</span>
        </button>
      </div>

      {/* Tab 1: Hero Section */}
      {activeTab === 'hero' && (
        <div className="bg-white border border-[#CBD5E1] rounded-2xl p-6 shadow-sm space-y-6 animate-in fade-in duration-200">
          <div className="border-b border-[#E2E8F0] pb-4">
            <h3 className="font-bold text-base text-[#091426] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#00687A]">view_carousel</span>
              Cấu Hình Khối Hero Section Chính
            </h3>
            <p className="text-xs text-[#64748B] mt-0.5">
              Chỉnh sửa các câu thông điệp chủ đạo, nút hành động và 3 thẻ thông số chất lượng của nền tảng.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
            <div className="space-y-1.5">
              <label className="font-bold text-[#1E293B]">Badge Trên Cùng Của Hero</label>
              <input
                type="text"
                value={localContent.heroBadge || ''}
                onChange={(e) => handleChange('heroBadge', e.target.value)}
                className="w-full p-2.5 border border-[#CBD5E1] rounded-xl font-mono text-xs focus:outline-none focus:border-[#00687A]"
                placeholder="VD: VCUBE PRECISION ANTHOLOGY // 2026"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-[#1E293B]">Tiêu Đề Dòng 1 (Headline Line 1)</label>
              <input
                type="text"
                value={localContent.heroHeadlineLine1 || ''}
                onChange={(e) => handleChange('heroHeadlineLine1', e.target.value)}
                className="w-full p-2.5 border border-[#CBD5E1] rounded-xl font-bold text-xs focus:outline-none focus:border-[#00687A]"
                placeholder="VD: CHẾ TÁC CƠ KHÍ"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-[#1E293B]">Tiêu Đề Nhấn Mạnh (Headline Highlight - Màu Teal)</label>
              <input
                type="text"
                value={localContent.heroHeadlineHighlight || ''}
                onChange={(e) => handleChange('heroHeadlineHighlight', e.target.value)}
                className="w-full p-2.5 border border-[#CBD5E1] rounded-xl font-bold text-xs text-[#00687A] focus:outline-none focus:border-[#00687A]"
                placeholder="VD: IN 3D CÔNG NGHIỆP CHÍNH XÁC"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="font-bold text-[#1E293B]">Đoạn Văn Miêu Tả Phụ (Hero Subheadline)</label>
              <textarea
                rows={3}
                value={localContent.heroSubheadline || ''}
                onChange={(e) => handleChange('heroSubheadline', e.target.value)}
                className="w-full p-2.5 border border-[#CBD5E1] rounded-xl text-xs focus:outline-none focus:border-[#00687A] leading-relaxed"
                placeholder="Mô tả tóm tắt dịch vụ, năng lực sản xuất và tiêu chuẩn dung sai..."
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-[#1E293B]">Nút Bấm Chính (Primary CTA Text)</label>
              <input
                type="text"
                value={localContent.heroCtaQuoteText || ''}
                onChange={(e) => handleChange('heroCtaQuoteText', e.target.value)}
                className="w-full p-2.5 border border-[#CBD5E1] rounded-xl text-xs font-bold focus:outline-none focus:border-[#00687A]"
                placeholder="Báo Giá File 3D Tức Thì"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-[#1E293B]">Nút Bấm Phụ (Secondary CTA Text)</label>
              <input
                type="text"
                value={localContent.heroCtaCatalogText || ''}
                onChange={(e) => handleChange('heroCtaCatalogText', e.target.value)}
                className="w-full p-2.5 border border-[#CBD5E1] rounded-xl text-xs font-bold focus:outline-none focus:border-[#00687A]"
                placeholder="Khám Phá Kho Mẫu CAD"
              />
            </div>
          </div>

          <div className="border-t border-[#E2E8F0] pt-4">
            <h4 className="font-bold text-xs uppercase tracking-wider text-[#00687A] mb-3 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">straighten</span>
              3 Thẻ Thông Số Đo Kiểm Kỹ Thuật (Hero Metrics Strip)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl space-y-2">
                <label className="font-bold text-[#1E293B] block">Chỉ số 1: Nhãn &amp; Giá trị</label>
                <input
                  type="text"
                  value={localContent.heroMetric1Label || ''}
                  onChange={(e) => handleChange('heroMetric1Label', e.target.value)}
                  className="w-full p-2 border border-[#CBD5E1] rounded-lg text-[11px]"
                  placeholder="Nhãn: Dung sai"
                />
                <input
                  type="text"
                  value={localContent.heroMetric1Value || ''}
                  onChange={(e) => handleChange('heroMetric1Value', e.target.value)}
                  className="w-full p-2 border border-[#CBD5E1] rounded-lg text-xs font-mono font-bold text-[#00687A]"
                  placeholder="Giá trị: ±0.05 MM"
                />
              </div>

              <div className="p-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl space-y-2">
                <label className="font-bold text-[#1E293B] block">Chỉ số 2: Nhãn &amp; Giá trị</label>
                <input
                  type="text"
                  value={localContent.heroMetric2Label || ''}
                  onChange={(e) => handleChange('heroMetric2Label', e.target.value)}
                  className="w-full p-2 border border-[#CBD5E1] rounded-lg text-[11px]"
                  placeholder="Nhãn: Thời gian giao"
                />
                <input
                  type="text"
                  value={localContent.heroMetric2Value || ''}
                  onChange={(e) => handleChange('heroMetric2Value', e.target.value)}
                  className="w-full p-2 border border-[#CBD5E1] rounded-lg text-xs font-mono font-bold text-[#091426]"
                  placeholder="Giá trị: GIAO HÀNG 24H"
                />
              </div>

              <div className="p-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl space-y-2">
                <label className="font-bold text-[#1E293B] block">Chỉ số 3: Nhãn &amp; Giá trị</label>
                <input
                  type="text"
                  value={localContent.heroMetric3Label || ''}
                  onChange={(e) => handleChange('heroMetric3Label', e.target.value)}
                  className="w-full p-2 border border-[#CBD5E1] rounded-lg text-[11px]"
                  placeholder="Nhãn: Tiêu chuẩn"
                />
                <input
                  type="text"
                  value={localContent.heroMetric3Value || ''}
                  onChange={(e) => handleChange('heroMetric3Value', e.target.value)}
                  className="w-full p-2 border border-[#CBD5E1] rounded-lg text-xs font-mono font-bold text-[#091426]"
                  placeholder="Giá trị: ISO/ASTM 52900"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Top Announcement */}
      {activeTab === 'announcement' && (
        <div className="bg-white border border-[#CBD5E1] rounded-2xl p-6 shadow-sm space-y-5 animate-in fade-in duration-200">
          <div className="border-b border-[#E2E8F0] pb-4">
            <h3 className="font-bold text-base text-[#091426] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#00687A]">campaign</span>
              Thanh Thông Báo &amp; Chiến Dịch Đầu Trang (Top Announcement Bar)
            </h3>
            <p className="text-xs text-[#64748B] mt-0.5">
              Cấu hình dải thông báo khuyến mại, sự kiện quốc khánh hoặc tin tức khẩn cấp hiển thị trên cùng website.
            </p>
          </div>

          <div className="flex items-center justify-between p-4 bg-[#F8FAFC] rounded-xl border border-[#CBD5E1]">
            <div>
              <p className="font-bold text-xs text-[#091426]">Bật / Tắt Thanh Thông Báo</p>
              <p className="text-[11px] text-[#64748B]">Cho phép dải banner xuất hiện trên đỉnh của mọi trang</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={localContent.announcementActive ?? true}
                onChange={(e) => handleChange('announcementActive', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00687A]"></div>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-bold text-[#1E293B]">Huy Hiệu (Badge Chiến Dịch)</label>
              <input
                type="text"
                value={localContent.announcementBadge || ''}
                onChange={(e) => handleChange('announcementBadge', e.target.value)}
                className="w-full p-2.5 border border-[#CBD5E1] rounded-xl text-xs font-bold text-[#00687A]"
                placeholder="VD: 🇻🇳 ĐẠI LỄ QUỐC KHÁNH 2/9"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-[#1E293B]">Nội Dung Nút Hành Động (CTA Button)</label>
              <input
                type="text"
                value={localContent.announcementActionText || ''}
                onChange={(e) => handleChange('announcementActionText', e.target.value)}
                className="w-full p-2.5 border border-[#CBD5E1] rounded-xl text-xs font-bold"
                placeholder="VD: Xem Sản Phẩm Tag 2/9"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="font-bold text-[#1E293B]">Nội Dung Thông Điệp Chi Tiết</label>
              <input
                type="text"
                value={localContent.announcementText || ''}
                onChange={(e) => handleChange('announcementText', e.target.value)}
                className="w-full p-2.5 border border-[#CBD5E1] rounded-xl text-xs"
                placeholder="Nhập thông điệp thông báo..."
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Workflow */}
      {activeTab === 'workflow' && (
        <div className="bg-white border border-[#CBD5E1] rounded-2xl p-6 shadow-sm space-y-6 animate-in fade-in duration-200">
          <div className="border-b border-[#E2E8F0] pb-4">
            <h3 className="font-bold text-base text-[#091426] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#00687A]">precision_manufacturing</span>
              Khối Quy Trình Chế Tác Xưởng 3 Bước (3-Step Workshop Workflow)
            </h3>
            <p className="text-xs text-[#64748B] mt-0.5">
              Giới thiệu quy trình sản xuất chuyên nghiệp từ khâu tải file, cắt lớp đến kiểm định chất lượng xuất xưởng.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-bold text-[#1E293B]">Badge Khối Quy Trình</label>
              <input
                type="text"
                value={localContent.workflowBadge || ''}
                onChange={(e) => handleChange('workflowBadge', e.target.value)}
                className="w-full p-2.5 border border-[#CBD5E1] rounded-xl font-mono text-xs text-[#00687A]"
                placeholder="CHRONICLE // QUY TRÌNH XƯỞNG"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-[#1E293B]">Tiêu Đề Khối Quy Trình</label>
              <input
                type="text"
                value={localContent.workflowTitle || ''}
                onChange={(e) => handleChange('workflowTitle', e.target.value)}
                className="w-full p-2.5 border border-[#CBD5E1] rounded-xl font-bold text-xs"
                placeholder="Quy Trình Gia Công 3 Bước Chuẩn Xác"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {/* Phase 1 */}
            <div className="p-4 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
                <span className="font-mono text-[10px] font-bold text-[#00687A] uppercase">PHASE 01</span>
                <span className="font-bold text-slate-400 font-mono">01</span>
              </div>
              <div className="space-y-1">
                <label className="font-bold text-[#1E293B]">Tên Bước 1</label>
                <input
                  type="text"
                  value={localContent.workflowStep1Title || ''}
                  onChange={(e) => handleChange('workflowStep1Title', e.target.value)}
                  className="w-full p-2 border border-[#CBD5E1] rounded-lg text-xs font-bold"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-[#1E293B]">Mô Tả Bước 1</label>
                <textarea
                  rows={3}
                  value={localContent.workflowStep1Desc || ''}
                  onChange={(e) => handleChange('workflowStep1Desc', e.target.value)}
                  className="w-full p-2 border border-[#CBD5E1] rounded-lg text-xs leading-relaxed"
                />
              </div>
            </div>

            {/* Phase 2 */}
            <div className="p-4 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
                <span className="font-mono text-[10px] font-bold text-[#00687A] uppercase">PHASE 02</span>
                <span className="font-bold text-slate-400 font-mono">02</span>
              </div>
              <div className="space-y-1">
                <label className="font-bold text-[#1E293B]">Tên Bước 2</label>
                <input
                  type="text"
                  value={localContent.workflowStep2Title || ''}
                  onChange={(e) => handleChange('workflowStep2Title', e.target.value)}
                  className="w-full p-2 border border-[#CBD5E1] rounded-lg text-xs font-bold"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-[#1E293B]">Mô Tả Bước 2</label>
                <textarea
                  rows={3}
                  value={localContent.workflowStep2Desc || ''}
                  onChange={(e) => handleChange('workflowStep2Desc', e.target.value)}
                  className="w-full p-2 border border-[#CBD5E1] rounded-lg text-xs leading-relaxed"
                />
              </div>
            </div>

            {/* Phase 3 */}
            <div className="p-4 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
                <span className="font-mono text-[10px] font-bold text-[#00687A] uppercase">PHASE 03</span>
                <span className="font-bold text-slate-400 font-mono">03</span>
              </div>
              <div className="space-y-1">
                <label className="font-bold text-[#1E293B]">Tên Bước 3</label>
                <input
                  type="text"
                  value={localContent.workflowStep3Title || ''}
                  onChange={(e) => handleChange('workflowStep3Title', e.target.value)}
                  className="w-full p-2 border border-[#CBD5E1] rounded-lg text-xs font-bold"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-[#1E293B]">Mô Tả Bước 3</label>
                <textarea
                  rows={3}
                  value={localContent.workflowStep3Desc || ''}
                  onChange={(e) => handleChange('workflowStep3Desc', e.target.value)}
                  className="w-full p-2 border border-[#CBD5E1] rounded-lg text-xs leading-relaxed"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Estimator */}
      {activeTab === 'estimator' && (
        <div className="bg-white border border-[#CBD5E1] rounded-2xl p-6 shadow-sm space-y-5 animate-in fade-in duration-200">
          <div className="border-b border-[#E2E8F0] pb-4">
            <h3 className="font-bold text-base text-[#091426] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#00687A]">calculate</span>
              Khối Ước Tính Giá &amp; Mô Phỏng Lát Cắt Trực Tiếp (Live Estimator)
            </h3>
            <p className="text-xs text-[#64748B] mt-0.5">
              Nội dung tiêu đề và các cam kết kỹ thuật hiển thị trên công cụ tính chi phí in nhanh.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-bold text-[#1E293B]">Badge Bộ Tính Giá</label>
              <input
                type="text"
                value={localContent.estimatorBadge || ''}
                onChange={(e) => handleChange('estimatorBadge', e.target.value)}
                className="w-full p-2.5 border border-[#CBD5E1] rounded-xl font-mono text-xs text-[#00687A]"
                placeholder="VCUBE FAST ESTIMATOR // LIVE QUOTE"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-[#1E293B]">Tiêu Đề Khối Ước Tính</label>
              <input
                type="text"
                value={localContent.estimatorTitle || ''}
                onChange={(e) => handleChange('estimatorTitle', e.target.value)}
                className="w-full p-2.5 border border-[#CBD5E1] rounded-xl font-bold text-xs"
                placeholder="Mô Phỏng & Ước Tính Chi Phí In 3D Trực Tiếp"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="font-bold text-[#1E293B]">Mô Tả Phụ</label>
              <input
                type="text"
                value={localContent.estimatorSubtitle || ''}
                onChange={(e) => handleChange('estimatorSubtitle', e.target.value)}
                className="w-full p-2.5 border border-[#CBD5E1] rounded-xl text-xs"
                placeholder="Chọn vật liệu kỹ thuật, độ đặc infill và kích cỡ mẫu..."
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-[#1E293B]">Quyền Lợi / Cam Kết 1</label>
              <input
                type="text"
                value={localContent.estimatorBenefit1 || ''}
                onChange={(e) => handleChange('estimatorBenefit1', e.target.value)}
                className="w-full p-2.5 border border-[#CBD5E1] rounded-xl text-xs"
                placeholder="Tự động tính toán theo tỉ trọng vật liệu g/cm³"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-[#1E293B]">Quyền Lợi / Cam Kết 2</label>
              <input
                type="text"
                value={localContent.estimatorBenefit2 || ''}
                onChange={(e) => handleChange('estimatorBenefit2', e.target.value)}
                className="w-full p-2.5 border border-[#CBD5E1] rounded-xl text-xs"
                placeholder="Miễn phí gọt support & rửa cồn siêu âm UV"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="font-bold text-[#1E293B]">Nút Kêu Gọi Hành Động (CTA Button Text)</label>
              <input
                type="text"
                value={localContent.estimatorCtaText || ''}
                onChange={(e) => handleChange('estimatorCtaText', e.target.value)}
                className="w-full p-2.5 border border-[#CBD5E1] rounded-xl text-xs font-bold"
                placeholder="Tải File STL Lên Để Báo Giá Chi Tiết →"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Facilities, Partners & Shipping */}
      {activeTab === 'facilities' && (
        <div className="bg-white border border-[#CBD5E1] rounded-2xl p-6 shadow-sm space-y-6 animate-in fade-in duration-200">
          <div className="border-b border-[#E2E8F0] pb-4">
            <h3 className="font-bold text-base text-[#091426] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#00687A]">domain</span>
              Đối Tác Tin Cậy, Cơ Sở Xưởng &amp; Vận Chuyển
            </h3>
            <p className="text-xs text-[#64748B] mt-0.5">
              Cấu hình dải logo đối tác, địa chỉ xưởng và chính sách phí ship.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-bold text-[#1E293B]">Tiêu Đề Dải Đối Tác (Trust Partners Banner Title)</label>
              <input
                type="text"
                value={localContent.trustPartnersTitle || ''}
                onChange={(e) => handleChange('trustPartnersTitle', e.target.value)}
                className="w-full p-2.5 border border-[#CBD5E1] rounded-xl text-xs font-bold"
                placeholder="Được Tin Cậy Bởi Các Đơn Vị R&D & Xưởng Cơ Khí"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-[#1E293B]">Danh Sách Đối Tác (Cách nhau bằng dấu phẩy)</label>
              <input
                type="text"
                value={Array.isArray(localContent.trustPartnersList) ? localContent.trustPartnersList.join(', ') : ''}
                onChange={(e) => handleChange('trustPartnersList', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                className="w-full p-2.5 border border-[#CBD5E1] rounded-xl text-xs font-mono"
                placeholder="BK ROBOTICS LAB, FPT HI-TECH INNOVATION, VNU AEROSPACE LAB, ..."
              />
              <p className="text-[10px] text-[#64748B]">Mỗi đơn vị sẽ được tự động hiển thị dưới dạng một chip công nghệ trên trang chủ.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <label className="font-bold text-[#1E293B]">Địa Chỉ Xưởng Hà Nội</label>
                <input
                  type="text"
                  value={localContent.hanoiWorkshopAddress || ''}
                  onChange={(e) => handleChange('hanoiWorkshopAddress', e.target.value)}
                  className="w-full p-2.5 border border-[#CBD5E1] rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-[#1E293B]">Địa Chỉ Xưởng TP. Hồ Chí Minh</label>
                <input
                  type="text"
                  value={localContent.hcmWorkshopAddress || ''}
                  onChange={(e) => handleChange('hcmWorkshopAddress', e.target.value)}
                  className="w-full p-2.5 border border-[#CBD5E1] rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-[#1E293B]">Hotline Kỹ Thuật</label>
                <input
                  type="text"
                  value={localContent.hotline || ''}
                  onChange={(e) => handleChange('hotline', e.target.value)}
                  className="w-full p-2.5 border border-[#CBD5E1] rounded-xl text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-[#1E293B]">Email Tiếp Nhận Hồ Sơ CAD</label>
                <input
                  type="email"
                  value={localContent.contactEmail || ''}
                  onChange={(e) => handleChange('contactEmail', e.target.value)}
                  className="w-full p-2.5 border border-[#CBD5E1] rounded-xl text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-[#1E293B]">Ngưỡng Miễn Phí Vận Chuyển (VNĐ)</label>
                <input
                  type="number"
                  value={localContent.freeShippingThreshold || 300000}
                  onChange={(e) => handleChange('freeShippingThreshold', Number(e.target.value))}
                  className="w-full p-2.5 border border-[#CBD5E1] rounded-xl text-xs font-mono font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-[#1E293B]">Phí Vận Chuyển Tiêu Chuẩn (VNĐ)</label>
                <input
                  type="number"
                  value={localContent.standardShippingFee || 25000}
                  onChange={(e) => handleChange('standardShippingFee', Number(e.target.value))}
                  className="w-full p-2.5 border border-[#CBD5E1] rounded-xl text-xs font-mono font-bold"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
