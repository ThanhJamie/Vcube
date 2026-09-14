import React, { useState } from 'react';
import { SiteContentConfig } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { Icon, InfoTip } from '@frontend/ui';

interface AdminStorefrontPanelProps {
  siteContent: SiteContentConfig;
  onUpdateSiteContent: (content: SiteContentConfig) => void;
  onShowToast: (message: string) => void;
}

/**
 * Ô cấu hình vận chuyển: CHƯA cấu hình ⇒ '' (trống), tuyệt đối không hiện số mặc định.
 *
 * VÌ SAO (data-honesty §3): bản cũ dùng `localContent.freeShippingThreshold || 300000`
 * nên một cấu hình chưa từng được đặt vẫn HIỆN "300.000" như thể admin đã nhập, và vì
 * `0 || 25000` mà không thể nhập 0 — mọi lần Lưu (dù chỉ sửa ô khác) đều ghi số bịa đó
 * vào `site_content`. Ở đây chỉ đọc ĐÚNG giá trị đang có (`??` / kiểm tra kiểu).
 */
const shippingInputValue = (value: number | null | undefined): number | '' =>
  typeof value === 'number' && Number.isFinite(value) ? value : '';

/** '' ⇒ `undefined` = CHƯA cấu hình (khoá này không được gửi xuống DB); 0 là giá trị THẬT. */
const parseShippingInput = (raw: string): number | undefined => {
  const trimmed = raw.trim();
  if (trimmed === '') return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const AdminStorefrontPanel: React.FC<AdminStorefrontPanelProps> = ({
  siteContent,
  onUpdateSiteContent,
  onShowToast,
}) => {
  const { language } = useLanguage();
  const isVi = language === 'vi';

  const [localContent, setLocalContent] = useState<SiteContentConfig>({ ...siteContent });
  const [activeTab, setActiveTab] = useState<'hero' | 'announcement' | 'workflow' | 'estimator' | 'facilities' | 'customIdea'>('hero');
  const [isSaved, setIsSaved] = useState(true);

  const handleChange = <K extends keyof SiteContentConfig>(key: K, value: SiteContentConfig[K]) => {
    setLocalContent(prev => ({ ...prev, [key]: value }));
    setIsSaved(false);
  };

  const handleShippingChange = (
    key: 'standardShippingFee' | 'freeShippingThreshold',
    raw: string
  ) => {
    const parsed = parseShippingInput(raw);
    setLocalContent((prev) => {
      const next: SiteContentConfig = { ...prev };
      if (parsed === undefined) {
        // "Chưa cấu hình" ⇒ BỎ khoá khỏi object gửi xuống DB (không ghi số bịa).
        delete (next as Partial<SiteContentConfig>)[key];
      } else {
        // 0 được giữ nguyên: `0` là cấu hình thật (miễn phí vận chuyển), không phải "trống".
        next[key] = parsed;
      }
      return next;
    });
    setIsSaved(false);
  };

  const handleSave = () => {
    // Bỏ trống là hợp lệ ("chưa cấu hình"), nhưng số âm là vô nghĩa ⇒ CHẶN lưu và nói rõ
    // trường nào, thay vì âm thầm thay bằng một con số mặc định.
    const invalidShippingKey = (['freeShippingThreshold', 'standardShippingFee'] as const).find((key) => {
      const value = localContent[key];
      return typeof value === 'number' && value < 0;
    });
    if (invalidShippingKey) {
      onShowToast(
        invalidShippingKey === 'freeShippingThreshold'
          ? (isVi ? 'Ngưỡng miễn phí vận chuyển không được là số âm' : 'Free-shipping threshold cannot be negative')
          : (isVi ? 'Phí vận chuyển tiêu chuẩn không được là số âm' : 'Standard shipping fee cannot be negative')
      );
      return;
    }

    onUpdateSiteContent(localContent);
    setIsSaved(true);
    onShowToast(isVi ? 'Đã lưu cấu hình giao diện Landing Page & Storefront!' : 'Saved Landing Page & Storefront CMS settings!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-surface p-5 sm:p-6 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-e1">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-primary/10 text-primary font-mono text-xs font-bold rounded-md border border-primary/30 uppercase tracking-widest">
              LANDING PAGE CMS // STOREFRONT
            </span>
            <span className="text-xs text-fg-subtle">Quản lý 100% nội dung hiển thị trên trang chủ</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-fg mt-1.5 flex items-center gap-2">
            <Icon name="tune" size={24} className="text-primary" />
            {isVi ? 'Quản Trị Nội Dung Landing Page VCUBE' : 'Landing Page Dynamic Content CMS'}
          </h2>
          <div className="mt-1">
            <InfoTip label="Landing Page CMS sửa được những gì?">
              Tùy chỉnh linh hoạt mọi văn bản, tiêu đề, thông số đo kiểm, quy trình xưởng và cam kết sản xuất trên
              trang chủ.
            </InfoTip>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleSave}
            disabled={isSaved}
            className={`px-5 py-2.5 text-xs font-bold rounded-lg uppercase tracking-wider transition-all flex items-center gap-2 shadow-e2 cursor-pointer ${
              isSaved
                ? 'bg-line-subtle text-fg-muted cursor-not-allowed shadow-none'
                : 'bg-gradient-to-r from-primary to-primary-hover hover:from-primary-hover hover:to-primary-hover text-primary-fg shadow-primary/25'
            }`}
          >
            <Icon name="save" size={18} />
            {isSaved ? (isVi ? 'Đã Lưu Nội Dung' : 'All Changes Saved') : (isVi ? 'Lưu Thay Đổi Ngay' : 'Save Changes Now')}
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-line">
        <button
          onClick={() => setActiveTab('hero')}
          className={`px-4 py-2.5 rounded-lg font-sans text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'hero'
              ? 'bg-surface-inverse text-on-inverse shadow-e1'
              : 'bg-surface text-fg-muted hover:bg-surface-muted border border-line'
          }`}
        >
          <Icon name="view_carousel" size={18} />
          <span>Hero & Chỉ Số Đo Kiểm</span>
        </button>

        <button
          onClick={() => setActiveTab('announcement')}
          className={`px-4 py-2.5 rounded-lg font-sans text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'announcement'
              ? 'bg-surface-inverse text-on-inverse shadow-e1'
              : 'bg-surface text-fg-muted hover:bg-surface-muted border border-line'
          }`}
        >
          <Icon name="campaign" size={18} />
          <span>Banner Đầu Trang</span>
        </button>

        <button
          onClick={() => setActiveTab('workflow')}
          className={`px-4 py-2.5 rounded-lg font-sans text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'workflow'
              ? 'bg-surface-inverse text-on-inverse shadow-e1'
              : 'bg-surface text-fg-muted hover:bg-surface-muted border border-line'
          }`}
        >
          <Icon name="precision_manufacturing" size={18} />
          <span>Quy Trình Xưởng 3 Bước</span>
        </button>

        <button
          onClick={() => setActiveTab('estimator')}
          className={`px-4 py-2.5 rounded-lg font-sans text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'estimator'
              ? 'bg-surface-inverse text-on-inverse shadow-e1'
              : 'bg-surface text-fg-muted hover:bg-surface-muted border border-line'
          }`}
        >
          <Icon name="calculate" size={18} />
          <span>Bộ Tính Giá Nhanh (Estimator)</span>
        </button>

        <button
          onClick={() => setActiveTab('facilities')}
          className={`px-4 py-2.5 rounded-lg font-sans text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'facilities'
              ? 'bg-surface-inverse text-on-inverse shadow-e1'
              : 'bg-surface text-fg-muted hover:bg-surface-muted border border-line'
          }`}
        >
          <Icon name="domain" size={18} />
          <span>{isVi ? 'Đối Tác & Cơ Sở Xưởng' : 'Partners & Facilities'}</span>
        </button>

        <button
          onClick={() => setActiveTab('customIdea')}
          className={`px-4 py-2.5 rounded-lg font-sans text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'customIdea'
              ? 'bg-surface-inverse text-on-inverse shadow-e1'
              : 'bg-surface text-fg-muted hover:bg-surface-muted border border-line'
          }`}
        >
          <Icon name="design_services" size={18} />
          <span>{isVi ? 'Dịch Vụ Custom 3D' : 'Custom 3D Service'}</span>
        </button>
      </div>

      {/* Tab 1: Hero Section */}
      {activeTab === 'hero' && (
        <div className="bg-surface rounded-lg p-6 shadow-e1 space-y-6 animate-in fade-in duration-200">
          <div className="border-b border-line-subtle pb-4">
            <h3 className="font-bold text-base text-fg flex items-center gap-2">
              <Icon name="view_carousel" size={24} className="text-primary" />
              Cấu Hình Khối Hero Section Chính
            </h3>
            <p className="text-xs text-fg-subtle mt-0.5">
              Chỉnh sửa các câu thông điệp chủ đạo, nút hành động và 3 thẻ thông số chất lượng của nền tảng.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
            <div className="space-y-1.5">
              <label className="font-bold text-fg">Badge Trên Cùng Của Hero</label>
              <input
                type="text"
                value={localContent.heroBadge || ''}
                onChange={(e) => handleChange('heroBadge', e.target.value)}
                className="w-full p-2.5 border border-line rounded-lg font-mono text-xs focus:outline-none focus:border-primary"
                placeholder="VD: VCUBE PRECISION ANTHOLOGY // 2026"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-fg">Tiêu Đề Dòng 1 (Headline Line 1)</label>
              <input
                type="text"
                value={localContent.heroHeadlineLine1 || ''}
                onChange={(e) => handleChange('heroHeadlineLine1', e.target.value)}
                className="w-full p-2.5 border border-line rounded-lg font-bold text-xs focus:outline-none focus:border-primary"
                placeholder="VD: CHẾ TÁC CƠ KHÍ"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-fg">Tiêu Đề Nhấn Mạnh (Headline Highlight - Màu Teal)</label>
              <input
                type="text"
                value={localContent.heroHeadlineHighlight || ''}
                onChange={(e) => handleChange('heroHeadlineHighlight', e.target.value)}
                className="w-full p-2.5 border border-line rounded-lg font-bold text-xs text-primary focus:outline-none focus:border-primary"
                placeholder="VD: IN 3D CÔNG NGHIỆP CHÍNH XÁC"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="font-bold text-fg">Đoạn Văn Miêu Tả Phụ (Hero Subheadline)</label>
              <textarea
                rows={3}
                value={localContent.heroSubheadline || ''}
                onChange={(e) => handleChange('heroSubheadline', e.target.value)}
                className="w-full p-2.5 border border-line rounded-lg text-xs focus:outline-none focus:border-primary leading-relaxed"
                placeholder="Mô tả tóm tắt dịch vụ, năng lực sản xuất và tiêu chuẩn dung sai..."
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-fg">Nút Bấm Chính (Primary CTA Text)</label>
              <input
                type="text"
                value={localContent.heroCtaQuoteText || ''}
                onChange={(e) => handleChange('heroCtaQuoteText', e.target.value)}
                className="w-full p-2.5 border border-line rounded-lg text-xs font-bold focus:outline-none focus:border-primary"
                placeholder="Báo Giá File 3D Tức Thì"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-fg">Nút Bấm Phụ (Secondary CTA Text)</label>
              <input
                type="text"
                value={localContent.heroCtaCatalogText || ''}
                onChange={(e) => handleChange('heroCtaCatalogText', e.target.value)}
                className="w-full p-2.5 border border-line rounded-lg text-xs font-bold focus:outline-none focus:border-primary"
                placeholder="Khám Phá Kho Mẫu CAD"
              />
            </div>
          </div>

          <div className="border-t border-line-subtle pt-4">
            <h4 className="font-bold text-xs uppercase tracking-wider text-primary mb-3 flex items-center gap-1.5">
              <Icon name="straighten" size={16} />
              3 Thẻ Thông Số Đo Kiểm Kỹ Thuật (Hero Metrics Strip)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-3 bg-canvas border border-line rounded-lg space-y-2">
                <label className="font-bold text-fg block">Chỉ số 1: Nhãn &amp; Giá trị</label>
                <input
                  type="text"
                  value={localContent.heroMetric1Label || ''}
                  onChange={(e) => handleChange('heroMetric1Label', e.target.value)}
                  className="w-full p-2 border border-line rounded-lg text-xs"
                  placeholder="Nhãn: Dung sai"
                />
                <input
                  type="text"
                  value={localContent.heroMetric1Value || ''}
                  onChange={(e) => handleChange('heroMetric1Value', e.target.value)}
                  className="w-full p-2 border border-line rounded-lg text-xs font-mono font-bold text-primary"
                  placeholder="Giá trị: nhập mức dung sai đã cam kết"
                />
              </div>

              <div className="p-3 bg-canvas border border-line rounded-lg space-y-2">
                <label className="font-bold text-fg block">Chỉ số 2: Nhãn &amp; Giá trị</label>
                <input
                  type="text"
                  value={localContent.heroMetric2Label || ''}
                  onChange={(e) => handleChange('heroMetric2Label', e.target.value)}
                  className="w-full p-2 border border-line rounded-lg text-xs"
                  placeholder="Nhãn: Thời gian giao"
                />
                <input
                  type="text"
                  value={localContent.heroMetric2Value || ''}
                  onChange={(e) => handleChange('heroMetric2Value', e.target.value)}
                  className="w-full p-2 border border-line rounded-lg text-xs font-mono font-bold text-fg"
                  placeholder="Giá trị: nhập thời gian bàn giao thực tế"
                />
              </div>

              <div className="p-3 bg-canvas border border-line rounded-lg space-y-2">
                <label className="font-bold text-fg block">Chỉ số 3: Nhãn &amp; Giá trị</label>
                <input
                  type="text"
                  value={localContent.heroMetric3Label || ''}
                  onChange={(e) => handleChange('heroMetric3Label', e.target.value)}
                  className="w-full p-2 border border-line rounded-lg text-xs"
                  placeholder="Nhãn: Tiêu chuẩn"
                />
                <input
                  type="text"
                  value={localContent.heroMetric3Value || ''}
                  onChange={(e) => handleChange('heroMetric3Value', e.target.value)}
                  className="w-full p-2 border border-line rounded-lg text-xs font-mono font-bold text-fg"
                  placeholder="Giá trị: nhập tiêu chuẩn/quy trình đang áp dụng"
                />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <InfoTip label="Ô trống thì trang chủ hiện gì?">
                Để trống ⇒ trang chủ hiện &ldquo;Chưa cấu hình&rdquo;. Chỉ nhập số liệu đã đo hoặc đã cam kết với
                khách hàng — hệ thống không tự điền giá trị mẫu.
              </InfoTip>
            </div>
          </div>

          <div className="border-t border-line-subtle pt-4 space-y-2">
            <h4 className="font-bold text-xs uppercase tracking-wider text-primary flex items-center gap-1.5">
              <Icon name="straighten" size={16} />
              Dải Dung Sai Cam Kết (toleranceSpec)
            </h4>
            <label className="font-bold text-fg block text-xs" htmlFor="storefront-tolerance-spec">
              Dung sai cam kết — hiển thị ở dải dung sai trang chủ và chân trang
            </label>
            <input
              id="storefront-tolerance-spec"
              type="text"
              value={localContent.toleranceSpec || ''}
              onChange={(e) => handleChange('toleranceSpec', e.target.value)}
              className="w-full p-2.5 border border-line rounded-lg text-xs"
              placeholder="VD: Đo kiểm kích thước theo bản vẽ thoả thuận"
            />
            <div className="flex justify-end">
              <InfoTip label="Để trống dung sai cam kết thì sao?">
                Để trống ⇒ trang chủ/chân trang hiện &ldquo;Chưa cấu hình&rdquo; và KHÔNG hiện một con số đoán.
              </InfoTip>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Top Announcement */}
      {activeTab === 'announcement' && (
        <div className="bg-surface rounded-lg p-6 shadow-e1 space-y-5 animate-in fade-in duration-200">
          <div className="border-b border-line-subtle pb-4">
            <h3 className="font-bold text-base text-fg flex items-center gap-2">
              <Icon name="campaign" size={24} className="text-primary" />
              Thanh Thông Báo &amp; Chiến Dịch Đầu Trang (Top Announcement Bar)
            </h3>
            <p className="text-xs text-fg-subtle mt-0.5">
              Cấu hình dải thông báo khuyến mại, sự kiện quốc khánh hoặc tin tức khẩn cấp hiển thị trên cùng website.
            </p>
          </div>

          <div className="flex items-center justify-between p-4 bg-canvas rounded-lg border border-line">
            <div>
              <p className="font-bold text-xs text-fg">Bật / Tắt Thanh Thông Báo</p>
              <p className="text-xs text-fg-subtle">
                Cho phép dải banner xuất hiện trên đỉnh của mọi trang. CHƯA CẤU HÌNH ⇒ công tắc
                đang TẮT và banner KHÔNG hiển thị (Header và trang chủ chỉ hiện khi giá trị này
                được bật).
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={localContent.announcementActive === true}
                onChange={(e) => handleChange('announcementActive', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-line-subtle peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-line after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface after:border-line after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-bold text-fg">Huy Hiệu (Badge Chiến Dịch)</label>
              <input
                type="text"
                value={localContent.announcementBadge || ''}
                onChange={(e) => handleChange('announcementBadge', e.target.value)}
                className="w-full p-2.5 border border-line rounded-lg text-xs font-bold text-primary"
                placeholder="Nhập huy hiệu chiến dịch (để trống thì ẩn)"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-fg">Nội Dung Nút Hành Động (CTA Button)</label>
              <input
                type="text"
                value={localContent.announcementActionText || ''}
                onChange={(e) => handleChange('announcementActionText', e.target.value)}
                className="w-full p-2.5 border border-line rounded-lg text-xs font-bold"
                placeholder="VD: Xem sản phẩm trong bộ sưu tập"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="font-bold text-fg">Nội Dung Thông Điệp Chi Tiết</label>
              <input
                type="text"
                value={localContent.announcementText || ''}
                onChange={(e) => handleChange('announcementText', e.target.value)}
                className="w-full p-2.5 border border-line rounded-lg text-xs"
                placeholder="Nhập thông điệp thông báo..."
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Workflow */}
      {activeTab === 'workflow' && (
        <div className="bg-surface rounded-lg p-6 shadow-e1 space-y-6 animate-in fade-in duration-200">
          <div className="border-b border-line-subtle pb-4">
            <h3 className="font-bold text-base text-fg flex items-center gap-2">
              <Icon name="precision_manufacturing" size={24} className="text-primary" />
              Khối Quy Trình Chế Tác Xưởng 3 Bước (3-Step Workshop Workflow)
            </h3>
            <p className="text-xs text-fg-subtle mt-0.5">
              Giới thiệu quy trình sản xuất chuyên nghiệp từ khâu tải file, cắt lớp đến kiểm định chất lượng xuất xưởng.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-bold text-fg">Badge Khối Quy Trình</label>
              <input
                type="text"
                value={localContent.workflowBadge || ''}
                onChange={(e) => handleChange('workflowBadge', e.target.value)}
                className="w-full p-2.5 border border-line rounded-lg font-mono text-xs text-primary"
                placeholder="CHRONICLE // QUY TRÌNH XƯỞNG"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-fg">Tiêu Đề Khối Quy Trình</label>
              <input
                type="text"
                value={localContent.workflowTitle || ''}
                onChange={(e) => handleChange('workflowTitle', e.target.value)}
                className="w-full p-2.5 border border-line rounded-lg font-bold text-xs"
                placeholder="Quy Trình Gia Công 3 Bước Chuẩn Xác"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {/* Phase 1 */}
            <div className="p-4 bg-canvas border border-line rounded-lg space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-line-subtle pb-2">
                <span className="font-mono text-xs font-bold text-primary uppercase">PHASE 01</span>
                <span className="font-bold text-fg-subtle font-mono">01</span>
              </div>
              <div className="space-y-1">
                <label className="font-bold text-fg">Tên Bước 1</label>
                <input
                  type="text"
                  value={localContent.workflowStep1Title || ''}
                  onChange={(e) => handleChange('workflowStep1Title', e.target.value)}
                  className="w-full p-2 border border-line rounded-lg text-xs font-bold"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-fg">Mô Tả Bước 1</label>
                <textarea
                  rows={3}
                  value={localContent.workflowStep1Desc || ''}
                  onChange={(e) => handleChange('workflowStep1Desc', e.target.value)}
                  className="w-full p-2 border border-line rounded-lg text-xs leading-relaxed"
                />
              </div>
            </div>

            {/* Phase 2 */}
            <div className="p-4 bg-canvas border border-line rounded-lg space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-line-subtle pb-2">
                <span className="font-mono text-xs font-bold text-primary uppercase">PHASE 02</span>
                <span className="font-bold text-fg-subtle font-mono">02</span>
              </div>
              <div className="space-y-1">
                <label className="font-bold text-fg">Tên Bước 2</label>
                <input
                  type="text"
                  value={localContent.workflowStep2Title || ''}
                  onChange={(e) => handleChange('workflowStep2Title', e.target.value)}
                  className="w-full p-2 border border-line rounded-lg text-xs font-bold"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-fg">Mô Tả Bước 2</label>
                <textarea
                  rows={3}
                  value={localContent.workflowStep2Desc || ''}
                  onChange={(e) => handleChange('workflowStep2Desc', e.target.value)}
                  className="w-full p-2 border border-line rounded-lg text-xs leading-relaxed"
                />
              </div>
            </div>

            {/* Phase 3 */}
            <div className="p-4 bg-canvas border border-line rounded-lg space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-line-subtle pb-2">
                <span className="font-mono text-xs font-bold text-primary uppercase">PHASE 03</span>
                <span className="font-bold text-fg-subtle font-mono">03</span>
              </div>
              <div className="space-y-1">
                <label className="font-bold text-fg">Tên Bước 3</label>
                <input
                  type="text"
                  value={localContent.workflowStep3Title || ''}
                  onChange={(e) => handleChange('workflowStep3Title', e.target.value)}
                  className="w-full p-2 border border-line rounded-lg text-xs font-bold"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-fg">Mô Tả Bước 3</label>
                <textarea
                  rows={3}
                  value={localContent.workflowStep3Desc || ''}
                  onChange={(e) => handleChange('workflowStep3Desc', e.target.value)}
                  className="w-full p-2 border border-line rounded-lg text-xs leading-relaxed"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Estimator */}
      {activeTab === 'estimator' && (
        <div className="bg-surface rounded-lg p-6 shadow-e1 space-y-5 animate-in fade-in duration-200">
          <div className="border-b border-line-subtle pb-4">
            <h3 className="font-bold text-base text-fg flex items-center gap-2">
              <Icon name="calculate" size={24} className="text-primary" />
              Khối Ước Tính Giá &amp; Mô Phỏng Lát Cắt Trực Tiếp (Live Estimator)
            </h3>
            <p className="text-xs text-fg-subtle mt-0.5">
              Nội dung tiêu đề và các cam kết kỹ thuật hiển thị trên công cụ tính chi phí in nhanh.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-bold text-fg">Badge Bộ Tính Giá</label>
              <input
                type="text"
                value={localContent.estimatorBadge || ''}
                onChange={(e) => handleChange('estimatorBadge', e.target.value)}
                className="w-full p-2.5 border border-line rounded-lg font-mono text-xs text-primary"
                placeholder="VCUBE FAST ESTIMATOR // LIVE QUOTE"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-fg">Tiêu Đề Khối Ước Tính</label>
              <input
                type="text"
                value={localContent.estimatorTitle || ''}
                onChange={(e) => handleChange('estimatorTitle', e.target.value)}
                className="w-full p-2.5 border border-line rounded-lg font-bold text-xs"
                placeholder="Mô Phỏng & Ước Tính Chi Phí In 3D Trực Tiếp"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="font-bold text-fg">Mô Tả Phụ</label>
              <input
                type="text"
                value={localContent.estimatorSubtitle || ''}
                onChange={(e) => handleChange('estimatorSubtitle', e.target.value)}
                className="w-full p-2.5 border border-line rounded-lg text-xs"
                placeholder="Chọn vật liệu kỹ thuật, độ đặc infill và kích cỡ mẫu..."
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-fg">Quyền Lợi / Cam Kết 1</label>
              <input
                type="text"
                value={localContent.estimatorBenefit1 || ''}
                onChange={(e) => handleChange('estimatorBenefit1', e.target.value)}
                className="w-full p-2.5 border border-line rounded-lg text-xs"
                placeholder="Tự động tính toán theo tỉ trọng vật liệu g/cm³"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-fg">Quyền Lợi / Cam Kết 2</label>
              <input
                type="text"
                value={localContent.estimatorBenefit2 || ''}
                onChange={(e) => handleChange('estimatorBenefit2', e.target.value)}
                className="w-full p-2.5 border border-line rounded-lg text-xs"
                placeholder="Miễn phí gọt support & rửa cồn siêu âm UV"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="font-bold text-fg">Nút Kêu Gọi Hành Động (CTA Button Text)</label>
              <input
                type="text"
                value={localContent.estimatorCtaText || ''}
                onChange={(e) => handleChange('estimatorCtaText', e.target.value)}
                className="w-full p-2.5 border border-line rounded-lg text-xs font-bold"
                placeholder="Tải File STL Lên Để Báo Giá Chi Tiết →"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Facilities, Partners & Shipping */}
      {activeTab === 'facilities' && (
        <div className="bg-surface rounded-lg p-6 shadow-e1 space-y-6 animate-in fade-in duration-200">
          <div className="border-b border-line-subtle pb-4">
            <h3 className="font-bold text-base text-fg flex items-center gap-2">
              <Icon name="domain" size={24} className="text-primary" />
              Đối Tác Tin Cậy, Cơ Sở Xưởng &amp; Vận Chuyển
            </h3>
            <p className="text-xs text-fg-subtle mt-0.5">
              Cấu hình dải logo đối tác, địa chỉ xưởng và chính sách phí ship.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-bold text-fg">Tiêu Đề Dải Đối Tác (Trust Partners Banner Title)</label>
              <input
                type="text"
                value={localContent.trustPartnersTitle || ''}
                onChange={(e) => handleChange('trustPartnersTitle', e.target.value)}
                className="w-full p-2.5 border border-line rounded-lg text-xs font-bold"
                placeholder="Được Tin Cậy Bởi Các Đơn Vị R&D & Xưởng Cơ Khí"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-fg">Danh Sách Đối Tác (Cách nhau bằng dấu phẩy)</label>
              <input
                type="text"
                value={Array.isArray(localContent.trustPartnersList) ? localContent.trustPartnersList.join(', ') : ''}
                onChange={(e) => handleChange('trustPartnersList', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                className="w-full p-2.5 border border-line rounded-lg text-xs font-mono"
                placeholder="BK ROBOTICS LAB, FPT HI-TECH INNOVATION, VNU AEROSPACE LAB, ..."
              />
              <p className="text-xs text-fg-subtle">Mỗi đơn vị sẽ được tự động hiển thị dưới dạng một chip công nghệ trên trang chủ.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <label className="font-bold text-fg">Địa Chỉ Xưởng Hà Nội</label>
                <input
                  type="text"
                  value={localContent.hanoiWorkshopAddress || ''}
                  onChange={(e) => handleChange('hanoiWorkshopAddress', e.target.value)}
                  className="w-full p-2.5 border border-line rounded-lg text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-fg">Địa Chỉ Xưởng TP. Hồ Chí Minh</label>
                <input
                  type="text"
                  value={localContent.hcmWorkshopAddress || ''}
                  onChange={(e) => handleChange('hcmWorkshopAddress', e.target.value)}
                  className="w-full p-2.5 border border-line rounded-lg text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-fg">Hotline Kỹ Thuật</label>
                <input
                  type="text"
                  value={localContent.hotline || ''}
                  onChange={(e) => handleChange('hotline', e.target.value)}
                  className="w-full p-2.5 border border-line rounded-lg text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-fg">Email Tiếp Nhận Hồ Sơ CAD</label>
                <input
                  type="email"
                  value={localContent.contactEmail || ''}
                  onChange={(e) => handleChange('contactEmail', e.target.value)}
                  className="w-full p-2.5 border border-line rounded-lg text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-fg">Ngưỡng Miễn Phí Vận Chuyển (VNĐ)</label>
                <input
                  type="number"
                  min={0}
                  value={shippingInputValue(localContent.freeShippingThreshold)}
                  onChange={(e) => handleShippingChange('freeShippingThreshold', e.target.value)}
                  placeholder={isVi ? 'Chưa cấu hình' : 'Not configured'}
                  className="w-full p-2.5 border border-line rounded-lg text-xs font-mono font-bold"
                />
                <p className="text-xs text-fg-muted">
                  Để trống = CHƯA cấu hình (ô hiển thị trống, hệ thống không tự điền số mặc định).
                  Nhập 0 nghĩa là mọi đơn đều được miễn phí vận chuyển.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-fg">Phí Vận Chuyển Tiêu Chuẩn (VNĐ)</label>
                <input
                  type="number"
                  min={0}
                  value={shippingInputValue(localContent.standardShippingFee)}
                  onChange={(e) => handleShippingChange('standardShippingFee', e.target.value)}
                  placeholder={isVi ? 'Chưa cấu hình' : 'Not configured'}
                  className="w-full p-2.5 border border-line rounded-lg text-xs font-mono font-bold"
                />
                <p className="text-xs text-fg-muted">
                  Để trống = CHƯA cấu hình. Nhập 0 nghĩa là không thu phí vận chuyển.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 6: Custom 3D Model by Idea Section */}
      {activeTab === 'customIdea' && (
        <div className="bg-surface rounded-lg p-6 shadow-e1 space-y-6 animate-in fade-in duration-200">
          <div className="border-b border-line-subtle pb-4">
            <h3 className="font-bold text-base text-fg flex items-center gap-2">
              <Icon name="design_services" size={24} className="text-primary" />
              {isVi ? 'Cấu Hình Dịch Vụ Custom 3D & Dựng Mô Hình Từ Ý Tưởng' : 'Custom 3D CAD Modeling & Idea Service CMS'}
            </h3>
            <p className="text-xs text-fg-subtle mt-0.5">
              {isVi
                ? 'Tùy chỉnh tiêu đề, thông điệp, quy trình 3 giai đoạn và banner của khối dịch vụ thiết kế theo yêu cầu trên Landing Page.'
                : 'Customize headline, narrative, 3-stage process workflow, and promotional banner for the custom CAD modeling service on the Landing Page.'}
            </p>
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between p-4 bg-surface-muted rounded-lg border border-line-subtle">
            <div>
              <span className="font-bold text-fg text-xs block">
                {isVi ? 'Bật hiển thị Section trên Trang chủ' : 'Enable Section on Landing Page'}
              </span>
              <span className="text-xs text-fg-muted">
                {isVi
                  ? 'Cho phép khách hàng xem quy trình và mở form đăng ký tư vấn ý tưởng'
                  : 'Allow visitors to view the 3-stage process and open the idea submission modal'}
              </span>
            </div>
            <input
              type="checkbox"
              checked={localContent.customIdeaActive !== false}
              onChange={(e) => handleChange('customIdeaActive', e.target.checked)}
              className="size-5 rounded border-line text-primary focus:ring-primary cursor-pointer"
            />
          </div>

          {/* Section Headlines */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
            <div className="space-y-1.5">
              <label className="font-bold text-fg">{isVi ? 'Badge Trên Cùng' : 'Top Badge'}</label>
              <input
                type="text"
                value={localContent.customIdeaBadge || ''}
                onChange={(e) => handleChange('customIdeaBadge', e.target.value)}
                placeholder="CUSTOM CAD // THEO Ý TƯỞNG"
                className="w-full p-2.5 border border-line rounded-lg font-mono text-xs focus:outline-none focus:border-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-fg">{isVi ? 'Nút Kêu Gọi Hành Động (CTA Text)' : 'CTA Button Label'}</label>
              <input
                type="text"
                value={localContent.customIdeaCtaText || ''}
                onChange={(e) => handleChange('customIdeaCtaText', e.target.value)}
                placeholder={isVi ? 'Đăng Ký Dịch Vụ Custom Từ Ý Tưởng' : 'Submit Custom 3D Idea'}
                className="w-full p-2.5 border border-line rounded-lg text-xs focus:outline-none focus:border-primary"
              />
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <label className="font-bold text-fg">{isVi ? 'Tiêu Đề Chính Section' : 'Main Section Headline'}</label>
              <input
                type="text"
                value={localContent.customIdeaTitle || ''}
                onChange={(e) => handleChange('customIdeaTitle', e.target.value)}
                placeholder={isVi ? 'Biến Ý Tưởng Thành Bản Vẽ CAD 3D & Sản Phẩm Thực Tế' : 'Transform Concept Ideas into Precision 3D CAD & Physical Prototypes'}
                className="w-full p-2.5 border border-line rounded-lg text-xs font-semibold focus:outline-none focus:border-primary"
              />
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <label className="font-bold text-fg">{isVi ? 'Mô Tả Phụ (Subtitle)' : 'Subtitle Description'}</label>
              <textarea
                rows={2}
                value={localContent.customIdeaSubtitle || ''}
                onChange={(e) => handleChange('customIdeaSubtitle', e.target.value)}
                placeholder={isVi ? 'Bạn chưa có file CAD 3D? Chỉ cần phác thảo sơ bộ hoặc bài toán thực tế, đội ngũ kỹ sư VCUBE sẽ dựng mô hình CAD chuẩn kỹ thuật và gia công mẫu thử nghiệm bàn giao tận tay.' : 'No 3D CAD file yet? Provide preliminary sketches or functional criteria, and VCUBE engineers will build engineering-grade CAD models and deliver physical prototypes.'}
                className="w-full p-2.5 border border-line rounded-lg text-xs focus:outline-none focus:border-primary"
              />
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <label className="font-bold text-fg">{isVi ? 'Đường Dẫn Ảnh Banner Đại Diện (Image URL)' : 'Banner Image URL'}</label>
              <input
                type="text"
                value={localContent.customIdeaImageUrl || ''}
                onChange={(e) => handleChange('customIdeaImageUrl', e.target.value)}
                placeholder="https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=1200&auto=format&fit=crop&q=80"
                className="w-full p-2.5 border border-line rounded-lg text-xs font-mono focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* 3-Stage Process Configuration */}
          <div className="border-t border-line-subtle pt-5 space-y-4">
            <h4 className="font-bold text-xs uppercase tracking-wider text-primary font-mono">
              {isVi ? 'CẤU HÌNH QUY TRÌNH 3 GIAI ĐOẠN' : '3-STAGE WORKFLOW CONFIGURATION'}
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
              {/* Step 1 */}
              <div className="p-4 rounded-lg bg-surface-muted border border-line space-y-3">
                <div className="flex items-center gap-2 text-primary font-mono font-bold">
                  <span className="px-2 py-0.5 rounded bg-primary-tint border border-primary/20">01</span>
                  <span>{isVi ? 'Giai Đoạn 1' : 'Stage 1'}</span>
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-fg block">{isVi ? 'Tiêu đề' : 'Title'}</label>
                  <input
                    type="text"
                    value={localContent.customIdeaStep1Title || ''}
                    onChange={(e) => handleChange('customIdeaStep1Title', e.target.value)}
                    placeholder={isVi ? 'Tiếp Nhận Ý Tưởng & Phác Thảo' : 'Idea Intake & Concept Sketching'}
                    className="w-full p-2 border border-line rounded bg-surface text-xs focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-fg block">{isVi ? 'Nội dung mô tả' : 'Description'}</label>
                  <textarea
                    rows={3}
                    value={localContent.customIdeaStep1Desc || ''}
                    onChange={(e) => handleChange('customIdeaStep1Desc', e.target.value)}
                    placeholder={isVi ? 'Cung cấp bản vẽ tay, ảnh chụp mẫu vật hoặc mô tả bài toán công năng. Kỹ sư tiếp nhận, phân tích tính khả thi DFM và lập phương án sơ bộ.' : 'Submit preliminary hand sketches, physical photos, or functional criteria. Engineers assess DFM feasibility and establish design briefs.'}
                    className="w-full p-2 border border-line rounded bg-surface text-xs focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Step 2 */}
              <div className="p-4 rounded-lg bg-surface-muted border border-line space-y-3">
                <div className="flex items-center gap-2 text-primary font-mono font-bold">
                  <span className="px-2 py-0.5 rounded bg-primary-tint border border-primary/20">02</span>
                  <span>{isVi ? 'Giai Đoạn 2' : 'Stage 2'}</span>
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-fg block">{isVi ? 'Tiêu đề' : 'Title'}</label>
                  <input
                    type="text"
                    value={localContent.customIdeaStep2Title || ''}
                    onChange={(e) => handleChange('customIdeaStep2Title', e.target.value)}
                    placeholder={isVi ? 'Thiết Kế CAD 3D Chuẩn Kỹ Thuật' : 'Parametric 3D CAD Modeling'}
                    className="w-full p-2 border border-line rounded bg-surface text-xs focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-fg block">{isVi ? 'Nội dung mô tả' : 'Description'}</label>
                  <textarea
                    rows={3}
                    value={localContent.customIdeaStep2Desc || ''}
                    onChange={(e) => handleChange('customIdeaStep2Desc', e.target.value)}
                    placeholder={isVi ? 'Mô hình hoá tham số B-Rep trên phần mềm cơ khí chuyên nghiệp, kiểm tra lắp ghép dung sai ren cấy và tối ưu cho công nghệ in 3D.' : 'Parametric B-Rep solid modeling, tolerance assembly fit checks, and Design for Additive Manufacturing (DFAM) optimization.'}
                    className="w-full p-2 border border-line rounded bg-surface text-xs focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Step 3 */}
              <div className="p-4 rounded-lg bg-surface-muted border border-line space-y-3">
                <div className="flex items-center gap-2 text-primary font-mono font-bold">
                  <span className="px-2 py-0.5 rounded bg-primary-tint border border-primary/20">03</span>
                  <span>{isVi ? 'Giai Đoạn 3' : 'Stage 3'}</span>
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-fg block">{isVi ? 'Tiêu đề' : 'Title'}</label>
                  <input
                    type="text"
                    value={localContent.customIdeaStep3Title || ''}
                    onChange={(e) => handleChange('customIdeaStep3Title', e.target.value)}
                    placeholder={isVi ? 'In Mẫu Thử Nghiệm & Bàn Giao' : 'Rapid Prototyping & Handover'}
                    className="w-full p-2 border border-line rounded bg-surface text-xs focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-fg block">{isVi ? 'Nội dung mô tả' : 'Description'}</label>
                  <textarea
                    rows={3}
                    value={localContent.customIdeaStep3Desc || ''}
                    onChange={(e) => handleChange('customIdeaStep3Desc', e.target.value)}
                    placeholder={isVi ? 'Gia công mẫu thử 1:1 bằng vật liệu kỹ thuật thực tế, đo kiểm kích thước và bàn giao bộ tệp nguồn gốc kèm quyền sở hữu bản quyền.' : '1:1 rapid physical prototyping, precision dimensional validation, and complete handover of native CAD files with commercial IP rights.'}
                    className="w-full p-2 border border-line rounded bg-surface text-xs focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
