import React, { useEffect, useState } from 'react';
import { SiteContentConfig } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { Button, Field, Icon, InfoTip, Input } from '@frontend/ui';

interface AdminStorefrontPanelProps {
  siteContent: SiteContentConfig;
  onUpdateSiteContent: (content: SiteContentConfig) => Promise<{ success: boolean; error?: string }> | void;
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

/** Textarea chưa có primitive riêng — dùng đúng recipe §3.3 của `Input`. */
const TEXTAREA_CLASS = [
  'w-full rounded-md border border-line-control bg-surface px-3 py-2 text-sm text-fg leading-relaxed',
  'placeholder:text-fg-subtle transition-colors duration-200 ease-out motion-reduce:transition-none',
  'focus:outline-none focus:border-primary focus:ring-2 focus:ring-ring aria-invalid:border-danger',
].join(' ');

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
  const [isSaving, setIsSaving] = useState(false);

  // Đồng bộ khi prop đổi từ bên ngoài (realtime/reload) — chỉ khi form không có thay đổi dở.
  useEffect(() => {
    if (isSaved) setLocalContent({ ...siteContent });
  }, [siteContent, isSaved]);

  // Cảnh báo trình duyệt khi đóng tab/tải lại lúc còn thay đổi chưa lưu.
  useEffect(() => {
    if (isSaved) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isSaved]);

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

  const handleSave = async () => {
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

    setIsSaving(true);
    try {
      const res = await onUpdateSiteContent(localContent);
      if (!res || res.success) {
        setIsSaved(true);
        onShowToast(isVi ? 'Đã lưu cấu hình giao diện trang chủ & cửa hàng!' : 'Saved Landing Page & Storefront CMS settings!');
      } else {
        setIsSaved(false);
        onShowToast(isVi ? `KHÔNG lưu được: ${res.error || 'lỗi không xác định'}` : `Could not save: ${res.error || 'unknown error'}`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="rounded-xl border border-line bg-surface p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 bg-primary-tint text-fg font-mono text-xs font-semibold rounded-sm border border-line uppercase tracking-wider">
              CẤU HÌNH TRANG CHỦ // GIAO DIỆN CỬA HÀNG
            </span>
            <span className="text-xs text-fg-subtle">Quản lý 100% nội dung hiển thị trên trang chủ</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-fg mt-2 flex items-center gap-2">
            <Icon name="tune" size={24} className="text-primary" />
            {isVi ? 'Quản Trị Nội Dung Trang Chủ VCUBE' : 'Landing Page Dynamic Content CMS'}
          </h2>
          <div className="mt-1">
            <InfoTip label="Cấu hình trang chủ sửa được những gì?">
              Tùy chỉnh linh hoạt mọi văn bản, tiêu đề, thông số đo kiểm, quy trình xưởng và cam kết sản xuất trên
              trang chủ.
            </InfoTip>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {!isSaved && !isSaving && (
            <span className="text-xs font-medium text-warning flex items-center gap-1">
              <Icon name="warning" size={14} />
              {isVi ? 'Chưa lưu' : 'Unsaved'}
            </span>
          )}
          <Button
            variant={isSaved ? 'secondary' : 'primary'}
            loading={isSaving}
            loadingLabel={isVi ? 'Đang lưu…' : 'Saving…'}
            leadingIcon={<Icon name="save" size={16} />}
            onClick={handleSave}
            disabled={isSaved}
          >
            {isSaving
              ? (isVi ? 'Đang lưu…' : 'Saving…')
              : isSaved
              ? (isVi ? 'Đã Lưu Nội Dung' : 'All Changes Saved')
              : (isVi ? 'Lưu Thay Đổi Ngay' : 'Save Changes Now')}
          </Button>
        </div>
      </div>

      {/* Tab Navigation — segmented §3.6 */}
      <div className="inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-md border border-line bg-surface-muted p-1">
        <button
          type="button"
          onClick={() => setActiveTab('hero')}
          aria-pressed={activeTab === 'hero'}
          className={`flex items-center gap-2 whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-colors duration-200 motion-reduce:transition-none max-md:min-h-11 ${
            activeTab === 'hero'
              ? 'bg-surface text-fg shadow-e1 font-semibold'
              : 'text-fg-muted hover:text-fg'
          }`}
        >
          <Icon name="view_carousel" size={16} />
          <span>Khối Đầu Trang & Chỉ Số Đo Kiểm</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('announcement')}
          aria-pressed={activeTab === 'announcement'}
          className={`flex items-center gap-2 whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-colors duration-200 motion-reduce:transition-none max-md:min-h-11 ${
            activeTab === 'announcement'
              ? 'bg-surface text-fg shadow-e1 font-semibold'
              : 'text-fg-muted hover:text-fg'
          }`}
        >
          <Icon name="campaign" size={16} />
          <span>Dải Thông Báo Đầu Trang</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('workflow')}
          aria-pressed={activeTab === 'workflow'}
          className={`flex items-center gap-2 whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-colors duration-200 motion-reduce:transition-none max-md:min-h-11 ${
            activeTab === 'workflow'
              ? 'bg-surface text-fg shadow-e1 font-semibold'
              : 'text-fg-muted hover:text-fg'
          }`}
        >
          <Icon name="precision_manufacturing" size={16} />
          <span>Quy Trình Xưởng 3 Bước</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('estimator')}
          aria-pressed={activeTab === 'estimator'}
          className={`flex items-center gap-2 whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-colors duration-200 motion-reduce:transition-none max-md:min-h-11 ${
            activeTab === 'estimator'
              ? 'bg-surface text-fg shadow-e1 font-semibold'
              : 'text-fg-muted hover:text-fg'
          }`}
        >
          <Icon name="calculate" size={16} />
          <span>Bộ Tính Giá Nhanh</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('facilities')}
          aria-pressed={activeTab === 'facilities'}
          className={`flex items-center gap-2 whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-colors duration-200 motion-reduce:transition-none max-md:min-h-11 ${
            activeTab === 'facilities'
              ? 'bg-surface text-fg shadow-e1 font-semibold'
              : 'text-fg-muted hover:text-fg'
          }`}
        >
          <Icon name="domain" size={16} />
          <span>{isVi ? 'Đối Tác & Cơ Sở Xưởng' : 'Partners & Facilities'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('customIdea')}
          aria-pressed={activeTab === 'customIdea'}
          className={`flex items-center gap-2 whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-colors duration-200 motion-reduce:transition-none max-md:min-h-11 ${
            activeTab === 'customIdea'
              ? 'bg-surface text-fg shadow-e1 font-semibold'
              : 'text-fg-muted hover:text-fg'
          }`}
        >
          <Icon name="design_services" size={16} />
          <span>{isVi ? 'Dịch Vụ CAD Theo Yêu Cầu' : 'Custom 3D Service'}</span>
        </button>
      </div>

      {/* Tab 1: Hero Section */}
      {activeTab === 'hero' && (
        <div className="rounded-xl border border-line bg-surface p-6 sm:p-8 space-y-6">
          <div className="border-b border-line-subtle pb-4">
            <h3 className="text-lg font-bold tracking-tight text-fg flex items-center gap-2">
              <Icon name="view_carousel" size={22} className="text-fg-muted" />
              Cấu Hình Khối Đầu Trang Chính
            </h3>
            <p className="text-xs text-fg-subtle mt-1">
              Chỉnh sửa các câu thông điệp chủ đạo, nút hành động và 3 thẻ thông số chất lượng của nền tảng.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Huy Hiệu Trên Cùng Của Khối Đầu Trang" optionalLabel={null}>
              {(control) => (
                <Input
                  {...control}
                  type="text"
                  value={localContent.heroBadge || ''}
                  onChange={(e) => handleChange('heroBadge', e.target.value)}
                  className="font-mono"
                  placeholder="VD: TUYỂN TẬP CHẾ TÁC CHÍNH XÁC VCUBE 2026"
                />
              )}
            </Field>

            <Field label="Tiêu Đề Dòng 1" optionalLabel={null}>
              {(control) => (
                <Input
                  {...control}
                  type="text"
                  value={localContent.heroHeadlineLine1 || ''}
                  onChange={(e) => handleChange('heroHeadlineLine1', e.target.value)}
                  placeholder="VD: CHẾ TÁC CƠ KHÍ"
                />
              )}
            </Field>

            <Field label="Tiêu Đề Nhấn Mạnh (Màu Teal)" optionalLabel={null}>
              {(control) => (
                <Input
                  {...control}
                  type="text"
                  value={localContent.heroHeadlineHighlight || ''}
                  onChange={(e) => handleChange('heroHeadlineHighlight', e.target.value)}
                  placeholder="VD: IN 3D CÔNG NGHIỆP CHÍNH XÁC"
                />
              )}
            </Field>

            <Field label="Đoạn Văn Miêu Tả Phụ" className="md:col-span-2" optionalLabel={null}>
              {(control) => (
                <textarea
                  {...control}
                  rows={3}
                  value={localContent.heroSubheadline || ''}
                  onChange={(e) => handleChange('heroSubheadline', e.target.value)}
                  className={TEXTAREA_CLASS}
                  placeholder="Mô tả tóm tắt dịch vụ, năng lực sản xuất và tiêu chuẩn dung sai..."
                />
              )}
            </Field>

            <Field label="Nhãn Nút Chính" optionalLabel={null}>
              {(control) => (
                <Input
                  {...control}
                  type="text"
                  value={localContent.heroCtaQuoteText || ''}
                  onChange={(e) => handleChange('heroCtaQuoteText', e.target.value)}
                  placeholder="Báo Giá Tệp 3D Tức Thì"
                />
              )}
            </Field>

            <Field label="Nhãn Nút Phụ" optionalLabel={null}>
              {(control) => (
                <Input
                  {...control}
                  type="text"
                  value={localContent.heroCtaCatalogText || ''}
                  onChange={(e) => handleChange('heroCtaCatalogText', e.target.value)}
                  placeholder="Khám Phá Kho Mẫu CAD"
                />
              )}
            </Field>
          </div>

          <div className="border-t border-line-subtle pt-6">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-fg-muted mb-3 flex items-center gap-1.5">
              <Icon name="straighten" size={16} />
              3 Thẻ Thông Số Đo Kiểm Kỹ Thuật
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-lg border border-line-subtle bg-surface-muted p-4 space-y-3">
                <p className="text-sm font-medium text-fg">Chỉ số 1: Nhãn &amp; Giá trị</p>
                <Field label="Nhãn chỉ số 1" hideLabel optionalLabel={null}>
                  {(control) => (
                    <Input
                      {...control}
                      type="text"
                      value={localContent.heroMetric1Label || ''}
                      onChange={(e) => handleChange('heroMetric1Label', e.target.value)}
                      placeholder="Nhãn: Dung sai"
                    />
                  )}
                </Field>
                <Field label="Giá trị chỉ số 1" hideLabel optionalLabel={null}>
                  {(control) => (
                    <Input
                      {...control}
                      type="text"
                      value={localContent.heroMetric1Value || ''}
                      onChange={(e) => handleChange('heroMetric1Value', e.target.value)}
                      className="font-mono font-semibold"
                      placeholder="Giá trị: nhập mức dung sai đã cam kết"
                    />
                  )}
                </Field>
              </div>

              <div className="rounded-lg border border-line-subtle bg-surface-muted p-4 space-y-3">
                <p className="text-sm font-medium text-fg">Chỉ số 2: Nhãn &amp; Giá trị</p>
                <Field label="Nhãn chỉ số 2" hideLabel optionalLabel={null}>
                  {(control) => (
                    <Input
                      {...control}
                      type="text"
                      value={localContent.heroMetric2Label || ''}
                      onChange={(e) => handleChange('heroMetric2Label', e.target.value)}
                      placeholder="Nhãn: Thời gian giao"
                    />
                  )}
                </Field>
                <Field label="Giá trị chỉ số 2" hideLabel optionalLabel={null}>
                  {(control) => (
                    <Input
                      {...control}
                      type="text"
                      value={localContent.heroMetric2Value || ''}
                      onChange={(e) => handleChange('heroMetric2Value', e.target.value)}
                      className="font-mono font-semibold"
                      placeholder="Giá trị: nhập thời gian bàn giao thực tế"
                    />
                  )}
                </Field>
              </div>

              <div className="rounded-lg border border-line-subtle bg-surface-muted p-4 space-y-3">
                <p className="text-sm font-medium text-fg">Chỉ số 3: Nhãn &amp; Giá trị</p>
                <Field label="Nhãn chỉ số 3" hideLabel optionalLabel={null}>
                  {(control) => (
                    <Input
                      {...control}
                      type="text"
                      value={localContent.heroMetric3Label || ''}
                      onChange={(e) => handleChange('heroMetric3Label', e.target.value)}
                      placeholder="Nhãn: Tiêu chuẩn"
                    />
                  )}
                </Field>
                <Field label="Giá trị chỉ số 3" hideLabel optionalLabel={null}>
                  {(control) => (
                    <Input
                      {...control}
                      type="text"
                      value={localContent.heroMetric3Value || ''}
                      onChange={(e) => handleChange('heroMetric3Value', e.target.value)}
                      className="font-mono font-semibold"
                      placeholder="Giá trị: nhập tiêu chuẩn/quy trình đang áp dụng"
                    />
                  )}
                </Field>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <InfoTip label="Ô trống thì trang chủ hiện gì?">
                Để trống ⇒ trang chủ hiện &ldquo;Chưa cấu hình&rdquo;. Chỉ nhập số liệu đã đo hoặc đã cam kết với
                khách hàng — hệ thống không tự điền giá trị mẫu.
              </InfoTip>
            </div>
          </div>

          <div className="border-t border-line-subtle pt-6 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-fg-muted flex items-center gap-1.5">
              <Icon name="straighten" size={16} />
              Dải Dung Sai Cam Kết (toleranceSpec)
            </h4>
            <Field
              id="storefront-tolerance-spec"
              label="Dung sai cam kết — hiển thị ở dải dung sai trang chủ và chân trang"
              optionalLabel={null}
            >
              {(control) => (
                <Input
                  {...control}
                  type="text"
                  value={localContent.toleranceSpec || ''}
                  onChange={(e) => handleChange('toleranceSpec', e.target.value)}
                  placeholder="VD: Đo kiểm kích thước theo bản vẽ thoả thuận"
                />
              )}
            </Field>
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
        <div className="rounded-xl border border-line bg-surface p-6 sm:p-8 space-y-6">
          <div className="border-b border-line-subtle pb-4">
            <h3 className="text-lg font-bold tracking-tight text-fg flex items-center gap-2">
              <Icon name="campaign" size={22} className="text-fg-muted" />
              Thanh Thông Báo &amp; Chiến Dịch Đầu Trang
            </h3>
            <p className="text-xs text-fg-subtle mt-1">
              Cấu hình dải thông báo khuyến mại, sự kiện quốc khánh hoặc tin tức khẩn cấp hiển thị trên cùng website.
            </p>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-lg border border-line-subtle bg-surface-muted p-4">
            <div>
              <p className="text-sm font-medium text-fg">Bật / Tắt Thanh Thông Báo</p>
              <p className="text-xs text-fg-subtle mt-1">
                Cho phép dải thông báo xuất hiện trên đỉnh của mọi trang. CHƯA CẤU HÌNH ⇒ công tắc
                đang TẮT và dải thông báo KHÔNG hiển thị (phần đầu trang và trang chủ chỉ hiện khi giá trị này
                được bật).
              </p>
            </div>
            <label className="relative inline-flex shrink-0 cursor-pointer items-center">
              <input
                type="checkbox" checked={localContent.announcementActive === true}
                onChange={(e) => handleChange('announcementActive', e.target.checked)}
                aria-label={isVi ? 'Bật / Tắt Thanh Thông Báo' : 'Enable / disable announcement bar'}
                className="peer sr-only"
              />
              <div className="h-6 w-11 rounded-full bg-line-control transition-colors duration-200 peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring motion-reduce:transition-none after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-line after:bg-surface after:transition-all after:content-[''] peer-checked:after:translate-x-full motion-reduce:after:transition-none"></div>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Huy Hiệu Chiến Dịch" optionalLabel={null}>
              {(control) => (
                <Input
                  {...control}
                  type="text"
                  value={localContent.announcementBadge || ''}
                  onChange={(e) => handleChange('announcementBadge', e.target.value)}
                  placeholder="Nhập huy hiệu chiến dịch (để trống thì ẩn)"
                />
              )}
            </Field>

            <Field label="Nội Dung Nút Hành Động" optionalLabel={null}>
              {(control) => (
                <Input
                  {...control}
                  type="text"
                  value={localContent.announcementActionText || ''}
                  onChange={(e) => handleChange('announcementActionText', e.target.value)}
                  placeholder="VD: Xem sản phẩm trong bộ sưu tập"
                />
              )}
            </Field>

            <Field label="Nội Dung Thông Điệp Chi Tiết" className="md:col-span-2" optionalLabel={null}>
              {(control) => (
                <Input
                  {...control}
                  type="text"
                  value={localContent.announcementText || ''}
                  onChange={(e) => handleChange('announcementText', e.target.value)}
                  placeholder="Nhập thông điệp thông báo..."
                />
              )}
            </Field>
          </div>
        </div>
      )}

      {/* Tab 3: Workflow */}
      {activeTab === 'workflow' && (
        <div className="rounded-xl border border-line bg-surface p-6 sm:p-8 space-y-6">
          <div className="border-b border-line-subtle pb-4">
            <h3 className="text-lg font-bold tracking-tight text-fg flex items-center gap-2">
              <Icon name="precision_manufacturing" size={22} className="text-fg-muted" />
              Khối Quy Trình Chế Tác Xưởng 3 Bước
            </h3>
            <p className="text-xs text-fg-subtle mt-1">
              Giới thiệu quy trình sản xuất chuyên nghiệp từ khâu tải tệp, cắt lớp đến kiểm định chất lượng xuất xưởng.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Huy Hiệu Khối Quy Trình" optionalLabel={null}>
              {(control) => (
                <Input
                  {...control}
                  type="text"
                  value={localContent.workflowBadge || ''}
                  onChange={(e) => handleChange('workflowBadge', e.target.value)}
                  className="font-mono"
                  placeholder="QUY TRÌNH XƯỞNG"
                />
              )}
            </Field>

            <Field label="Tiêu Đề Khối Quy Trình" optionalLabel={null}>
              {(control) => (
                <Input
                  {...control}
                  type="text"
                  value={localContent.workflowTitle || ''}
                  onChange={(e) => handleChange('workflowTitle', e.target.value)}
                  placeholder="Quy Trình Gia Công 3 Bước Chuẩn Xác"
                />
              )}
            </Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Phase 1 */}
            <div className="rounded-lg border border-line-subtle bg-surface-muted p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-line-subtle pb-2">
                <span className="font-mono text-xs font-semibold uppercase text-fg-muted">GIAI ĐOẠN 01</span>
                <span className="font-mono text-xs font-medium text-fg-subtle">01</span>
              </div>
              <Field label="Tên Bước 1" optionalLabel={null}>
                {(control) => (
                  <Input
                    {...control}
                    type="text"
                    value={localContent.workflowStep1Title || ''}
                    onChange={(e) => handleChange('workflowStep1Title', e.target.value)}
                  />
                )}
              </Field>
              <Field label="Mô Tả Bước 1" optionalLabel={null}>
                {(control) => (
                  <textarea
                    {...control}
                    rows={3}
                    value={localContent.workflowStep1Desc || ''}
                    onChange={(e) => handleChange('workflowStep1Desc', e.target.value)}
                    className={TEXTAREA_CLASS}
                  />
                )}
              </Field>
            </div>

            {/* Phase 2 */}
            <div className="rounded-lg border border-line-subtle bg-surface-muted p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-line-subtle pb-2">
                <span className="font-mono text-xs font-semibold uppercase text-fg-muted">GIAI ĐOẠN 02</span>
                <span className="font-mono text-xs font-medium text-fg-subtle">02</span>
              </div>
              <Field label="Tên Bước 2" optionalLabel={null}>
                {(control) => (
                  <Input
                    {...control}
                    type="text"
                    value={localContent.workflowStep2Title || ''}
                    onChange={(e) => handleChange('workflowStep2Title', e.target.value)}
                  />
                )}
              </Field>
              <Field label="Mô Tả Bước 2" optionalLabel={null}>
                {(control) => (
                  <textarea
                    {...control}
                    rows={3}
                    value={localContent.workflowStep2Desc || ''}
                    onChange={(e) => handleChange('workflowStep2Desc', e.target.value)}
                    className={TEXTAREA_CLASS}
                  />
                )}
              </Field>
            </div>

            {/* Phase 3 */}
            <div className="rounded-lg border border-line-subtle bg-surface-muted p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-line-subtle pb-2">
                <span className="font-mono text-xs font-semibold uppercase text-fg-muted">GIAI ĐOẠN 03</span>
                <span className="font-mono text-xs font-medium text-fg-subtle">03</span>
              </div>
              <Field label="Tên Bước 3" optionalLabel={null}>
                {(control) => (
                  <Input
                    {...control}
                    type="text"
                    value={localContent.workflowStep3Title || ''}
                    onChange={(e) => handleChange('workflowStep3Title', e.target.value)}
                  />
                )}
              </Field>
              <Field label="Mô Tả Bước 3" optionalLabel={null}>
                {(control) => (
                  <textarea
                    {...control}
                    rows={3}
                    value={localContent.workflowStep3Desc || ''}
                    onChange={(e) => handleChange('workflowStep3Desc', e.target.value)}
                    className={TEXTAREA_CLASS}
                  />
                )}
              </Field>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Estimator */}
      {activeTab === 'estimator' && (
        <div className="rounded-xl border border-line bg-surface p-6 sm:p-8 space-y-6">
          <div className="border-b border-line-subtle pb-4">
            <h3 className="text-lg font-bold tracking-tight text-fg flex items-center gap-2">
              <Icon name="calculate" size={22} className="text-fg-muted" />
              Khối Ước Tính Giá &amp; Mô Phỏng Lát Cắt Trực Tiếp
            </h3>
            <p className="text-xs text-fg-subtle mt-1">
              Nội dung tiêu đề và các cam kết kỹ thuật hiển thị trên công cụ tính chi phí in nhanh.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Huy Hiệu Bộ Tính Giá" optionalLabel={null}>
              {(control) => (
                <Input
                  {...control}
                  type="text"
                  value={localContent.estimatorBadge || ''}
                  onChange={(e) => handleChange('estimatorBadge', e.target.value)}
                  className="font-mono"
                  placeholder="BỘ TÍNH GIÁ NHANH VCUBE // BÁO GIÁ TRỰC TIẾP"
                />
              )}
            </Field>

            <Field label="Tiêu Đề Khối Ước Tính" optionalLabel={null}>
              {(control) => (
                <Input
                  {...control}
                  type="text"
                  value={localContent.estimatorTitle || ''}
                  onChange={(e) => handleChange('estimatorTitle', e.target.value)}
                  placeholder="Mô Phỏng & Ước Tính Chi Phí In 3D Trực Tiếp"
                />
              )}
            </Field>

            <Field label="Mô Tả Phụ" className="md:col-span-2" optionalLabel={null}>
              {(control) => (
                <Input
                  {...control}
                  type="text"
                  value={localContent.estimatorSubtitle || ''}
                  onChange={(e) => handleChange('estimatorSubtitle', e.target.value)}
                  placeholder="Chọn vật liệu kỹ thuật, độ đặc và kích cỡ mẫu..."
                />
              )}
            </Field>

            <Field label="Quyền Lợi / Cam Kết 1" optionalLabel={null}>
              {(control) => (
                <Input
                  {...control}
                  type="text"
                  value={localContent.estimatorBenefit1 || ''}
                  onChange={(e) => handleChange('estimatorBenefit1', e.target.value)}
                  placeholder="Tự động tính toán theo tỉ trọng vật liệu g/cm³"
                />
              )}
            </Field>

            <Field label="Quyền Lợi / Cam Kết 2" optionalLabel={null}>
              {(control) => (
                <Input
                  {...control}
                  type="text"
                  value={localContent.estimatorBenefit2 || ''}
                  onChange={(e) => handleChange('estimatorBenefit2', e.target.value)}
                  placeholder="Miễn phí gọt vật liệu đỡ & rửa cồn siêu âm UV"
                />
              )}
            </Field>

            <Field label="Nút Kêu Gọi Hành Động" className="md:col-span-2" optionalLabel={null}>
              {(control) => (
                <Input
                  {...control}
                  type="text"
                  value={localContent.estimatorCtaText || ''}
                  onChange={(e) => handleChange('estimatorCtaText', e.target.value)}
                  placeholder="Tải Tệp STL Lên Để Báo Giá Chi Tiết →"
                />
              )}
            </Field>
          </div>
        </div>
      )}

      {/* Tab 5: Facilities, Partners & Shipping */}
      {activeTab === 'facilities' && (
        <div className="rounded-xl border border-line bg-surface p-6 sm:p-8 space-y-6">
          <div className="border-b border-line-subtle pb-4">
            <h3 className="text-lg font-bold tracking-tight text-fg flex items-center gap-2">
              <Icon name="domain" size={22} className="text-fg-muted" />
              Đối Tác Tin Cậy, Cơ Sở Xưởng &amp; Vận Chuyển
            </h3>
            <p className="text-xs text-fg-subtle mt-1">
              Cấu hình dải logo đối tác, địa chỉ xưởng và chính sách phí vận chuyển.
            </p>
          </div>

          <div className="space-y-4">
            <Field label="Tiêu Đề Dải Đối Tác" optionalLabel={null}>
              {(control) => (
                <Input
                  {...control}
                  type="text"
                  value={localContent.trustPartnersTitle || ''}
                  onChange={(e) => handleChange('trustPartnersTitle', e.target.value)}
                  placeholder="Được Tin Cậy Bởi Các Đơn Vị R&D & Xưởng Cơ Khí"
                />
              )}
            </Field>

            <Field label="Danh Sách Đối Tác (Cách nhau bằng dấu phẩy)"
              hint="Mỗi đơn vị sẽ được tự động hiển thị dưới dạng một chip công nghệ trên trang chủ."
              optionalLabel={null}
            >
              {(control) => (
                <Input
                  {...control}
                  type="text"
                  value={Array.isArray(localContent.trustPartnersList) ? localContent.trustPartnersList.join(', ') : ''}
                  onChange={(e) => handleChange('trustPartnersList', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                  className="font-mono"
                  placeholder="BK ROBOTICS LAB, FPT HI-TECH INNOVATION, VNU AEROSPACE LAB, ..."
                />
              )}
            </Field>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <Field label="Địa Chỉ Xưởng Hà Nội" optionalLabel={null}>
                {(control) => (
                  <Input
                    {...control}
                    type="text"
                    value={localContent.hanoiWorkshopAddress || ''}
                    onChange={(e) => handleChange('hanoiWorkshopAddress', e.target.value)}
                  />
                )}
              </Field>

              <Field label="Địa Chỉ Xưởng TP. Hồ Chí Minh" optionalLabel={null}>
                {(control) => (
                  <Input
                    {...control}
                    type="text"
                    value={localContent.hcmWorkshopAddress || ''}
                    onChange={(e) => handleChange('hcmWorkshopAddress', e.target.value)}
                  />
                )}
              </Field>

              <Field label="Đường Dây Nóng Kỹ Thuật" optionalLabel={null}>
                {(control) => (
                  <Input
                    {...control}
                    type="text"
                    value={localContent.hotline || ''}
                    onChange={(e) => handleChange('hotline', e.target.value)}
                    className="font-mono"
                  />
                )}
              </Field>

              <Field label="Email Tiếp Nhận Hồ Sơ CAD" optionalLabel={null}>
                {(control) => (
                  <Input
                    {...control}
                    type="email"
                    value={localContent.contactEmail || ''}
                    onChange={(e) => handleChange('contactEmail', e.target.value)}
                    className="font-mono"
                  />
                )}
              </Field>

              <Field label="Ngưỡng Miễn Phí Vận Chuyển (VNĐ)"
                hint="Để trống = CHƯA cấu hình (ô hiển thị trống, hệ thống không tự điền số mặc định). Nhập 0 nghĩa là mọi đơn đều được miễn phí vận chuyển."
                optionalLabel={null}
              >
                {(control) => (
                  <Input
                    {...control}
                    type="number"
                    min={0}
                    numeric
                    value={shippingInputValue(localContent.freeShippingThreshold)}
                    onChange={(e) => handleShippingChange('freeShippingThreshold', e.target.value)}
                    placeholder={isVi ? 'Chưa cấu hình' : 'Not configured'}
                    className="font-mono"
                  />
                )}
              </Field>

              <Field label="Phí Vận Chuyển Tiêu Chuẩn (VNĐ)"
                hint="Để trống = CHƯA cấu hình. Nhập 0 nghĩa là không thu phí vận chuyển."
                optionalLabel={null}
              >
                {(control) => (
                  <Input
                    {...control}
                    type="number"
                    min={0}
                    numeric
                    value={shippingInputValue(localContent.standardShippingFee)}
                    onChange={(e) => handleShippingChange('standardShippingFee', e.target.value)}
                    placeholder={isVi ? 'Chưa cấu hình' : 'Not configured'}
                    className="font-mono"
                  />
                )}
              </Field>
            </div>
          </div>
        </div>
      )}

      {/* Tab 6: Custom 3D Model by Idea Section */}
      {activeTab === 'customIdea' && (
        <div className="rounded-xl border border-line bg-surface p-6 sm:p-8 space-y-6">
          <div className="border-b border-line-subtle pb-4">
            <h3 className="text-lg font-bold tracking-tight text-fg flex items-center gap-2">
              <Icon name="design_services" size={22} className="text-fg-muted" />
              {isVi ? 'Cấu Hình Dịch Vụ CAD Theo Yêu Cầu & Dựng Mô Hình Từ Ý Tưởng' : 'Custom 3D CAD Modeling & Idea Service CMS'}
            </h3>
            <p className="text-xs text-fg-subtle mt-1">
              {isVi
                ? 'Tùy chỉnh tiêu đề, thông điệp, quy trình 3 giai đoạn và dải quảng cáo của khối dịch vụ thiết kế theo yêu cầu trên trang chủ.'
                : 'Customize headline, narrative, 3-stage process workflow, and promotional banner for the custom CAD modeling service on the Landing Page.'}
            </p>
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between gap-4 rounded-lg border border-line-subtle bg-surface-muted p-4">
            <div>
              <span className="text-sm font-medium text-fg block">
                {isVi ? 'Bật hiển thị khối trên trang chủ' : 'Enable Section on Landing Page'}
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
              aria-label={isVi ? 'Bật hiển thị khối trên trang chủ' : 'Enable Section on Landing Page'}
              className="size-5 shrink-0 cursor-pointer rounded-sm border border-line-control accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {/* Section Headlines */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label={isVi ? 'Huy Hiệu Trên Cùng' : 'Top Badge'} optionalLabel={null}>
              {(control) => (
                <Input
                  {...control}
                  type="text"
                  value={localContent.customIdeaBadge || ''}
                  onChange={(e) => handleChange('customIdeaBadge', e.target.value)}
                  placeholder="CAD THEO YÊU CẦU // THEO Ý TƯỞNG"
                  className="font-mono"
                />
              )}
            </Field>

            <Field label={isVi ? 'Nút Kêu Gọi Hành Động' : 'CTA Button Label'} optionalLabel={null}>
              {(control) => (
                <Input
                  {...control}
                  type="text"
                  value={localContent.customIdeaCtaText || ''}
                  onChange={(e) => handleChange('customIdeaCtaText', e.target.value)}
                  placeholder={isVi ? 'Đăng Ký Dịch Vụ Thiết Kế Từ Ý Tưởng' : 'Submit Custom 3D Idea'}
                />
              )}
            </Field>

            <Field label={isVi ? 'Tiêu Đề Chính Khối' : 'Main Section Headline'} className="md:col-span-2" optionalLabel={null}>
              {(control) => (
                <Input
                  {...control}
                  type="text"
                  value={localContent.customIdeaTitle || ''}
                  onChange={(e) => handleChange('customIdeaTitle', e.target.value)}
                  placeholder={isVi ? 'Biến Ý Tưởng Thành Bản Vẽ CAD 3D & Sản Phẩm Thực Tế' : 'Transform Concept Ideas into Precision 3D CAD & Physical Prototypes'}
                />
              )}
            </Field>

            <Field label={isVi ? 'Mô Tả Phụ' : 'Subtitle Description'} className="md:col-span-2" optionalLabel={null}>
              {(control) => (
                <textarea
                  {...control}
                  rows={2}
                  value={localContent.customIdeaSubtitle || ''}
                  onChange={(e) => handleChange('customIdeaSubtitle', e.target.value)}
                  placeholder={isVi ? 'Bạn chưa có tệp CAD 3D? Chỉ cần phác thảo sơ bộ hoặc bài toán thực tế, đội ngũ kỹ sư VCUBE sẽ dựng mô hình CAD chuẩn kỹ thuật và gia công mẫu thử nghiệm bàn giao tận tay.' : 'No 3D CAD file yet? Provide preliminary sketches or functional criteria, and VCUBE engineers will build engineering-grade CAD models and deliver physical prototypes.'}
                  className={TEXTAREA_CLASS}
                />
              )}
            </Field>

            <Field label={isVi ? 'Đường Dẫn Ảnh Đại Diện (URL)' : 'Banner Image URL'} className="md:col-span-2" optionalLabel={null}>
              {(control) => (
                <Input
                  {...control}
                  type="text"
                  value={localContent.customIdeaImageUrl || ''}
                  onChange={(e) => handleChange('customIdeaImageUrl', e.target.value)}
                  placeholder="Dán URL ảnh (https://…)"
                  className="font-mono"
                />
              )}
            </Field>
          </div>

          {/* 3-Stage Process Configuration */}
          <div className="border-t border-line-subtle pt-6 space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-fg-muted font-mono">
              {isVi ? 'CẤU HÌNH QUY TRÌNH 3 GIAI ĐOẠN' : '3-STAGE WORKFLOW CONFIGURATION'}
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Step 1 */}
              <div className="rounded-lg border border-line-subtle bg-surface-muted p-4 space-y-4">
                <div className="flex items-center gap-2 font-mono font-semibold text-fg">
                  <span className="rounded-sm border border-line bg-surface px-2 py-0.5">01</span>
                  <span>{isVi ? 'Giai Đoạn 1' : 'Stage 1'}</span>
                </div>
                <Field label={isVi ? 'Tiêu đề' : 'Title'} optionalLabel={null}>
                  {(control) => (
                    <Input
                      {...control}
                      type="text"
                      value={localContent.customIdeaStep1Title || ''}
                      onChange={(e) => handleChange('customIdeaStep1Title', e.target.value)}
                      placeholder={isVi ? 'Tiếp Nhận Ý Tưởng & Phác Thảo' : 'Idea Intake & Concept Sketching'}
                    />
                  )}
                </Field>
                <Field label={isVi ? 'Nội dung mô tả' : 'Description'} optionalLabel={null}>
                  {(control) => (
                    <textarea
                      {...control}
                      rows={3}
                      value={localContent.customIdeaStep1Desc || ''}
                      onChange={(e) => handleChange('customIdeaStep1Desc', e.target.value)}
                      placeholder={isVi ? 'Cung cấp bản vẽ tay, ảnh chụp mẫu vật hoặc mô tả bài toán công năng. Kỹ sư tiếp nhận, phân tích tính khả thi DFM và lập phương án sơ bộ.' : 'Submit preliminary hand sketches, physical photos, or functional criteria. Engineers assess DFM feasibility and establish design briefs.'}
                      className={TEXTAREA_CLASS}
                    />
                  )}
                </Field>
              </div>

              {/* Step 2 */}
              <div className="rounded-lg border border-line-subtle bg-surface-muted p-4 space-y-4">
                <div className="flex items-center gap-2 font-mono font-semibold text-fg">
                  <span className="rounded-sm border border-line bg-surface px-2 py-0.5">02</span>
                  <span>{isVi ? 'Giai Đoạn 2' : 'Stage 2'}</span>
                </div>
                <Field label={isVi ? 'Tiêu đề' : 'Title'} optionalLabel={null}>
                  {(control) => (
                    <Input
                      {...control}
                      type="text"
                      value={localContent.customIdeaStep2Title || ''}
                      onChange={(e) => handleChange('customIdeaStep2Title', e.target.value)}
                      placeholder={isVi ? 'Thiết Kế CAD 3D Chuẩn Kỹ Thuật' : 'Parametric 3D CAD Modeling'}
                    />
                  )}
                </Field>
                <Field label={isVi ? 'Nội dung mô tả' : 'Description'} optionalLabel={null}>
                  {(control) => (
                    <textarea
                      {...control}
                      rows={3}
                      value={localContent.customIdeaStep2Desc || ''}
                      onChange={(e) => handleChange('customIdeaStep2Desc', e.target.value)}
                      placeholder={isVi ? 'Mô hình hoá tham số B-Rep trên phần mềm cơ khí chuyên nghiệp, kiểm tra lắp ghép dung sai ren cấy và tối ưu cho công nghệ in 3D.' : 'Parametric B-Rep solid modeling, tolerance assembly fit checks, and Design for Additive Manufacturing (DFAM) optimization.'}
                      className={TEXTAREA_CLASS}
                    />
                  )}
                </Field>
              </div>

              {/* Step 3 */}
              <div className="rounded-lg border border-line-subtle bg-surface-muted p-4 space-y-4">
                <div className="flex items-center gap-2 font-mono font-semibold text-fg">
                  <span className="rounded-sm border border-line bg-surface px-2 py-0.5">03</span>
                  <span>{isVi ? 'Giai Đoạn 3' : 'Stage 3'}</span>
                </div>
                <Field label={isVi ? 'Tiêu đề' : 'Title'} optionalLabel={null}>
                  {(control) => (
                    <Input
                      {...control}
                      type="text"
                      value={localContent.customIdeaStep3Title || ''}
                      onChange={(e) => handleChange('customIdeaStep3Title', e.target.value)}
                      placeholder={isVi ? 'In Mẫu Thử Nghiệm & Bàn Giao' : 'Rapid Prototyping & Handover'}
                    />
                  )}
                </Field>
                <Field label={isVi ? 'Nội dung mô tả' : 'Description'} optionalLabel={null}>
                  {(control) => (
                    <textarea
                      {...control}
                      rows={3}
                      value={localContent.customIdeaStep3Desc || ''}
                      onChange={(e) => handleChange('customIdeaStep3Desc', e.target.value)}
                      placeholder={isVi ? 'Gia công mẫu thử 1:1 bằng vật liệu kỹ thuật thực tế, đo kiểm kích thước và bàn giao bộ tệp nguồn gốc kèm quyền sở hữu bản quyền.' : '1:1 rapid physical prototyping, precision dimensional validation, and complete handover of native CAD files with commercial IP rights.'}
                      className={TEXTAREA_CLASS}
                    />
                  )}
                </Field>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
