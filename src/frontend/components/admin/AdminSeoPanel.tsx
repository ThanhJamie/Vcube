import React, { useEffect, useState } from 'react';
import { SiteContentConfig } from '@/types';
import { Button, Field, Icon, InfoTip, Input } from '@frontend/ui';

interface AdminSeoPanelProps {
  siteContent: SiteContentConfig;
  onUpdateSiteContent: (content: SiteContentConfig) => Promise<{ success: boolean; error?: string }> | void;
  onShowToast: (message: string) => void;
}

export const AdminSeoPanel: React.FC<AdminSeoPanelProps> = ({
  siteContent,
  onUpdateSiteContent,
  onShowToast,
}) => {

  const [localContent, setLocalContent] = useState<SiteContentConfig>({ ...siteContent });
  const [activeTab, setActiveTab] = useState<'meta' | 'serp' | 'social' | 'schema'>('meta');
  const [devicePreview, setDevicePreview] = useState<'desktop' | 'mobile'>('desktop');
  const [isSaved, setIsSaved] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Đồng bộ khi prop đổi từ bên ngoài — chỉ khi form không có thay đổi dở.
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

  // data-honesty §3: CHỈ hiển thị đúng những gì admin đã cấu hình.
  //
  // VÌ SAO (bản cũ :26-34): mỗi trường rỗng bị thay bằng một giá trị BỊA (tiêu đề, mô tả,
  // từ khoá, canonical 'https://vcube.vn', ảnh OG Unsplash, JSON-LD "LocalBusiness"), mà các
  // giá trị đó lại được bind THẲNG vào ô nhập (`value={metaTitle}`…) nên admin thấy như thể
  // mình đã cấu hình; tab Social còn gọi ảnh Unsplash của bên thứ ba. Chưa cấu hình ⇒ để
  // TRỐNG và hiện trạng thái trống. KHÔNG hardcode default thay thế: nếu cần một giá trị mặc
  // định toàn site thì đó là quyết định sản phẩm ở tầng dữ liệu (`site_content`).
  const metaTitle = localContent.seoTitle?.trim() || '';
  const metaDesc = localContent.seoDescription?.trim() || '';
  const keywords = localContent.seoKeywords?.trim() || '';
  const ogImage = localContent.seoOgImage?.trim() || '';
  const canonicalUrl = localContent.seoCanonicalUrl?.trim() || '';
  /** `undefined` = CHƯA CẤU HÌNH — khác hẳn `false` ("đang chặn noindex"). */
  const robotsIndex = localContent.seoRobotsIndex;
  /** Chưa cấu hình ⇒ ô JSON-LD trống; KHÔNG dựng sẵn schema "LocalBusiness" bịa. */
  const structuredData = localContent.seoStructuredData?.trim() || '';

  const handleChange = <K extends keyof SiteContentConfig>(key: K, value: SiteContentConfig[K]) => {
    setLocalContent(prev => ({ ...prev, [key]: value }));
    setIsSaved(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await onUpdateSiteContent(localContent);
      if (!res || res.success) {
        setIsSaved(true);
        onShowToast('Đã lưu cấu hình SEO thành công!');
      } else {
        setIsSaved(false);
        onShowToast(`KHÔNG lưu được: ${res.error || 'lỗi không xác định'}`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Title & description character counts
  const titleLen = metaTitle.length;
  const descLen = metaDesc.length;

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="rounded-xl border border-line bg-surface p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-primary-tint text-fg font-mono text-xs font-semibold rounded-sm border border-line uppercase tracking-wider">
              CẤU HÌNH SEO // KẾT QUẢ TÌM KIẾM & THẺ MÔ TẢ
            </span>
            <span className="text-xs text-fg-subtle">Sẵn sàng cho tìm kiếm Google &amp; mạng xã hội</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-fg mt-2 flex items-center gap-2">
            <Icon name="search" size={24} className="text-primary" />
            Quản Trị SEO Toàn Diện
          </h2>
          <p className="text-xs text-fg-subtle mt-1 max-w-2xl">
            {'Tùy chỉnh thẻ tiêu đề & mô tả, xem trước kết quả tìm kiếm Google, cấu hình thẻ chia sẻ mạng xã hội và dữ liệu có cấu trúc Schema.org.'}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {!isSaved && !isSaving && (
            <span className="text-xs font-medium text-warning flex items-center gap-1">
              <Icon name="warning" size={14} />
              Chưa lưu
            </span>
          )}
          <Button
            variant={isSaved ? 'secondary' : 'primary'}
            loading={isSaving}
            loadingLabel="Đang lưu…"
            leadingIcon={<Icon name="save" size={16} />}
            onClick={handleSave}
            disabled={isSaved}
          >
            {isSaving
              ? ('Đang lưu…')
              : isSaved
              ? ('Đã Lưu SEO')
              : ('Lưu Cấu Hình SEO')}
          </Button>
        </div>
      </div>

      {/* Navigation Sub-Tabs — segmented §3.6 */}
      <div className="inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-md border border-line bg-surface-muted p-1">
        <button
          type="button"
          onClick={() => setActiveTab('meta')}
          aria-pressed={activeTab === 'meta'}
          className={`flex items-center gap-2 whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-colors duration-200 motion-reduce:transition-none max-md:min-h-11 ${
            activeTab === 'meta'
              ? 'bg-surface text-fg shadow-e1 font-semibold'
              : 'text-fg-muted hover:text-fg'
          }`}
        >
          <Icon name="title" size={16} />
          <span>{'Thẻ Tiêu Đề & Từ Khoá'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('serp')}
          aria-pressed={activeTab === 'serp'}
          className={`flex items-center gap-2 whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-colors duration-200 motion-reduce:transition-none max-md:min-h-11 ${
            activeTab === 'serp'
              ? 'bg-surface text-fg shadow-e1 font-semibold'
              : 'text-fg-muted hover:text-fg'
          }`}
        >
          <Icon name="travel_explore" size={16} />
          <span>Mô Phỏng Kết Quả Tìm Kiếm</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('social')}
          aria-pressed={activeTab === 'social'}
          className={`flex items-center gap-2 whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-colors duration-200 motion-reduce:transition-none max-md:min-h-11 ${
            activeTab === 'social'
              ? 'bg-surface text-fg shadow-e1 font-semibold'
              : 'text-fg-muted hover:text-fg'
          }`}
        >
          <Icon name="share" size={16} />
          <span>Thẻ Chia Sẻ Mạng Xã Hội</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('schema')}
          aria-pressed={activeTab === 'schema'}
          className={`flex items-center gap-2 whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-colors duration-200 motion-reduce:transition-none max-md:min-h-11 ${
            activeTab === 'schema'
              ? 'bg-surface text-fg shadow-e1 font-semibold'
              : 'text-fg-muted hover:text-fg'
          }`}
        >
          <Icon name="schema" size={16} />
          <span>{'Schema.org & Robots'}</span>
        </button>
      </div>

      {/* TAB 1: META TAGS & KEYWORDS */}
      {activeTab === 'meta' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Meta Title */}
            <div className="rounded-lg border border-line-subtle bg-surface p-6 space-y-3">
              <Field
                label={
                  <>
                    <span className="flex items-center gap-1.5">
                      <Icon name="badge" size={16} className="text-fg-muted" />
                      Tiêu Đề Trang
                    </span>
                    <span className={`rounded-sm px-2 py-0.5 font-mono text-xs font-medium tabular-nums ${
                      titleLen >= 50 && titleLen <= 65
                        ? 'bg-positive-tint text-positive'
                        : titleLen > 65
                        ? 'bg-warning-tint text-warning'
                        : 'bg-surface-muted text-fg-muted'
                    }`}>
                      {titleLen} / 60 ký tự (Khuyến nghị 50-60)
                    </span>
                  </>
                }
                labelClassName="flex w-full flex-wrap items-center justify-between gap-2"
                hint={
                  <InfoTip label="Tiêu đề trang xuất hiện ở đâu?">
                    Tiêu đề hiển thị trên thanh tab trình duyệt và dòng đầu tiên của kết quả tìm kiếm Google.
                  </InfoTip>
                }
                optionalLabel={null}
              >
                {(control) => (
                  <Input
                    {...control}
                    type="text"
                    value={metaTitle}
                    onChange={(e) => handleChange('seoTitle', e.target.value)}
                    placeholder="VD: VCUBE — Dịch Vụ In 3D Công Nghiệp & Báo Giá CAD Tức Thì"
                  />
                )}
              </Field>
            </div>

            {/* Meta Description */}
            <div className="rounded-lg border border-line-subtle bg-surface p-6 space-y-3">
              <Field
                label={
                  <>
                    <span className="flex items-center gap-1.5">
                      <Icon name="description" size={16} className="text-fg-muted" />
                      Mô Tả Tóm Tắt
                    </span>
                    <span className={`rounded-sm px-2 py-0.5 font-mono text-xs font-medium tabular-nums ${
                      descLen >= 140 && descLen <= 160
                        ? 'bg-positive-tint text-positive'
                        : descLen > 160
                        ? 'bg-warning-tint text-warning'
                        : 'bg-surface-muted text-fg-muted'
                    }`}>
                      {descLen} / 160 ký tự (Khuyến nghị 140-160)
                    </span>
                  </>
                }
                labelClassName="flex w-full flex-wrap items-center justify-between gap-2"
                hint={
                  <InfoTip label="Mô tả tóm tắt ảnh hưởng gì?">
                    Đoạn snippet xuất hiện dưới tiêu đề tìm kiếm, quyết định tỷ lệ click chuột (CTR) của khách hàng
                    tiềm năng.
                  </InfoTip>
                }
                optionalLabel={null}
              >
                {(control) => (
                  <textarea
                    {...control}
                    rows={3}
                    value={metaDesc}
                    onChange={(e) => handleChange('seoDescription', e.target.value)}
                    placeholder="Mô tả tóm tắt nội dung nền tảng và thế mạnh in 3D công nghiệp..."
                    className="w-full resize-none rounded-md border border-line-control bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:border-primary focus:ring-2 focus:ring-ring aria-invalid:border-danger"
                  />
                )}
              </Field>
            </div>

            {/* Keywords */}
            <div className="rounded-lg border border-line-subtle bg-surface p-6 space-y-3">
              <Field
                label={
                  <span className="flex items-center gap-1.5">
                    <Icon name="tag" size={16} className="text-fg-muted" />
                    Từ Khoá Tìm Kiếm
                  </span>
                }
                optionalLabel={null}
              >
                {(control) => (
                  <Input
                    {...control}
                    type="text"
                    value={keywords}
                    onChange={(e) => handleChange('seoKeywords', e.target.value)}
                    placeholder="in 3d, gia cong in 3d, bao gia stl, in resin, vcube..."
                  />
                )}
              </Field>
              <div className="flex flex-wrap gap-1.5">
                {keywords.split(',').map((k) => {
                  const trimmed = k.trim();
                  if (!trimmed) return null;
                  return (
                    <span key={trimmed} className="rounded-sm border border-line-subtle bg-surface-muted px-2 py-0.5 text-xs font-medium text-fg-muted">
                      #{trimmed}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Canonical URL & OG Image */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-lg border border-line-subtle bg-surface p-6 space-y-3">
                <Field
                  label={
                    <span className="flex items-center gap-1.5">
                      <Icon name="link" size={16} className="text-fg-muted" />
                      URL Chính Tắc
                    </span>
                  }
                  optionalLabel={null}
                >
                  {(control) => (
                    <Input
                      {...control}
                      type="text"
                      value={canonicalUrl}
                      onChange={(e) => handleChange('seoCanonicalUrl', e.target.value)}
                      placeholder="https://vcube.vn"
                      size="sm"
                    />
                  )}
                </Field>
              </div>

              <div className="rounded-lg border border-line-subtle bg-surface p-6 space-y-3">
                <Field
                  label={
                    <span className="flex items-center gap-1.5">
                      <Icon name="image" size={16} className="text-fg-muted" />
                      Ảnh Đại Diện Mạng Xã Hội
                    </span>
                  }
                  optionalLabel={null}
                >
                  {(control) => (
                    <Input
                      {...control}
                      type="text"
                      value={ogImage}
                      onChange={(e) => handleChange('seoOgImage', e.target.value)}
                      placeholder="https://... ảnh tỉ lệ 1200x630"
                      size="sm"
                    />
                  )}
                </Field>
              </div>
            </div>
          </div>

          {/* Quick Score Card */}
          <div className="space-y-4">
            <div className="rounded-lg border border-line-subtle bg-surface p-6 space-y-4">
              <div className="flex items-center justify-between gap-2 border-b border-line-subtle pb-3">
                <h3 className="text-base font-semibold tracking-tight text-fg flex items-center gap-2">
                  <Icon name="verified" size={20} className="text-positive" />
                  Chỉ Số Tối Ưu Hóa
                </h3>
                <span className="font-mono text-sm font-semibold text-fg-muted" title="Chưa có công cụ thu thập/đo chỉ số tối ưu">—</span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-fg-muted">Độ dài tiêu đề</span>
                  <span className={`text-right ${!metaTitle ? 'text-fg-muted' : titleLen >= 50 && titleLen <= 65 ? 'text-positive font-medium' : 'text-warning'}`}>
                    {!metaTitle ? '— Chưa cấu hình' : titleLen >= 50 && titleLen <= 65 ? (<><Icon name="check" size={12} aria-hidden="true" /> Chuẩn</>) : 'Cần tối ưu'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-fg-muted">Độ dài mô tả</span>
                  <span className={`text-right ${!metaDesc ? 'text-fg-muted' : descLen >= 140 && descLen <= 160 ? 'text-positive font-medium' : 'text-warning'}`}>
                    {!metaDesc ? '— Chưa cấu hình' : descLen >= 140 && descLen <= 160 ? (<><Icon name="check" size={12} aria-hidden="true" /> Chuẩn</>) : 'Cần tối ưu'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-fg-muted">Thẻ Ảnh Chia Sẻ</span>
                  <span className={`text-right ${ogImage ? 'text-positive font-medium' : 'text-danger'}`}>
                    {ogImage ? (<><Icon name="check" size={12} aria-hidden="true" /> Có sẵn</>) : (<><Icon name="close" size={12} aria-hidden="true" /> Thiếu</>)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-fg-muted">Thẻ URL Chính Tắc</span>
                  <span className={`text-right ${canonicalUrl ? 'text-positive font-medium' : 'text-danger'}`}>
                    {canonicalUrl ? (<><Icon name="check" size={12} aria-hidden="true" /> Hợp lệ</>) : (<><Icon name="close" size={12} aria-hidden="true" /> Thiếu</>)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-fg-muted">Dữ liệu Schema.org</span>
                  <span className={`text-right ${localContent.seoStructuredData ? 'text-positive font-medium' : 'text-fg-muted'}`}>{localContent.seoStructuredData ? (<><Icon name="check" size={12} aria-hidden="true" /> Có dữ liệu Schema.org</>) : '— Chưa cấu hình'}</span>
                </div>
              </div>
            </div>

            {/* OG Image Mini Preview — chưa cấu hình ⇒ trạng thái TRỐNG, không gọi ảnh bịa */}
            <div className="rounded-lg border border-line-subtle bg-surface p-6 space-y-3">
              <span className="text-xs font-semibold text-fg-muted block">Xem trước ảnh chia sẻ:</span>
              {ogImage ? (
                <div className="relative aspect-[1.91/1] overflow-hidden rounded-lg border border-line bg-surface-muted">
                  <img
                    src={ogImage}
                    alt="Ảnh xem trước chia sẻ"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <div className="absolute bottom-2 left-2 rounded-sm bg-surface-inverse/70 px-2 py-0.5 font-mono text-xs text-on-inverse backdrop-blur-sm">
                    1200 × 630 px
                  </div>
                </div>
              ) : (
                <div className="flex aspect-[1.91/1] items-center justify-center rounded-lg border border-line bg-surface-muted p-4 text-center">
                  <span className="text-xs text-fg-muted">Chưa cấu hình ảnh OG — hệ thống không hiển thị ảnh mẫu.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: GOOGLE SERP SIMULATOR */}
      {activeTab === 'serp' && (
        <div className="rounded-xl border border-line bg-surface p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line-subtle pb-4">
            <div>
              <h3 className="text-lg font-bold tracking-tight text-fg flex items-center gap-2">
                <Icon name="preview" size={22} className="text-fg-muted" />
                Trình Mô Phỏng Kết Quả Tìm Kiếm Google
              </h3>
              <p className="text-xs text-fg-subtle mt-1">
                Hiển thị chính xác diện mạo trang web của bạn trên trang nhất của Google khi người dùng tìm kiếm.
              </p>
            </div>

            {/* Device Switcher — segmented §3.6 */}
            <div className="inline-flex shrink-0 items-center gap-1 rounded-md border border-line bg-surface-muted p-1">
              <button
                type="button"
                onClick={() => setDevicePreview('desktop')}
                className={`flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors duration-200 motion-reduce:transition-none ${
                  devicePreview === 'desktop' ? 'bg-surface text-fg shadow-e1 font-semibold' : 'text-fg-muted hover:text-fg'
                }`}
              >
                <Icon name="desktop_windows" size={16} />
                Máy Tính
              </button>
              <button
                type="button"
                onClick={() => setDevicePreview('mobile')}
                className={`flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors duration-200 motion-reduce:transition-none ${
                  devicePreview === 'mobile' ? 'bg-surface text-fg shadow-e1 font-semibold' : 'text-fg-muted hover:text-fg'
                }`}
              >
                <Icon name="smartphone" size={16} />
                Di Động
              </button>
            </div>
          </div>

          {/* SERP Frame */}
          <div className={`rounded-lg border border-line bg-surface-muted p-5 sm:p-6 ${
            devicePreview === 'mobile' ? 'max-w-md mx-auto shadow-e2' : 'max-w-3xl'
          }`}>
            <div className="space-y-1.5 font-sans">
              {/* Site Icon & Domain */}
              <div className="flex items-center gap-2 text-xs text-fg">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-fg flex items-center justify-center font-bold text-xs">
                  V
                </div>
                <div className="leading-tight">
                  <div className="font-medium text-fg text-sm">VCUBE Việt Nam</div>
                  <div className="text-xs text-fg-muted truncate">
                    {canonicalUrl ? (
                      <>
                        {canonicalUrl} <span className="text-fg-muted">› quote › 3d-printing</span>
                      </>
                    ) : (
                      <span className="text-fg-muted">Chưa cấu hình URL chuẩn</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Title Link */}
              <div className="pt-1">
                <a
                  href="#preview"
                  onClick={(e) => e.preventDefault()}
                  className="text-info hover:underline text-lg sm:text-xl font-normal leading-snug cursor-pointer block"
                >
                  {metaTitle}
                </a>
              </div>

              {/* Snippet Description */}
              <p className="text-xs sm:text-sm text-fg-muted leading-relaxed pt-0.5 line-clamp-2 sm:line-clamp-3">
                <span className="text-fg-muted font-medium">Hà Nội &amp; TP.HCM — </span>
                {metaDesc}
              </p>

              {/* Sitelinks Mini Simulation */}
              <div className="grid grid-cols-2 gap-3 pt-3 mt-2 border-t border-line-subtle">
                <div>
                  <a href="#quote" onClick={(e) => e.preventDefault()} className="text-info hover:underline text-xs font-medium block">
                    Báo Giá CAD Trực Tuyến
                  </a>
                  <span className="text-xs text-fg-muted line-clamp-1">Tải tệp STL, chọn vật liệu, tính giá tự động.</span>
                </div>
                <div>
                  <a href="#materials" onClick={(e) => e.preventDefault()} className="text-info hover:underline text-xs font-medium block">
                    Danh Mục Vật Liệu FDM/SLA
                  </a>
                  <span className="text-xs text-fg-muted line-clamp-1">PLA, PETG-CF, ABS, Resin kỹ thuật cao.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SOCIAL MEDIA SHARING CARDS */}
      {activeTab === 'social' && (
        <div className="rounded-xl border border-line bg-surface p-6 sm:p-8 space-y-6">
          <div>
            <h3 className="text-lg font-bold tracking-tight text-fg flex items-center gap-2">
              <Icon name="share" size={22} className="text-fg-muted" />
              Mô Phỏng Thẻ Chia Sẻ Mạng Xã Hội (Facebook, Zalo, LinkedIn)
            </h3>
            <p className="text-xs text-fg-subtle mt-1">
              Hình ảnh và tiêu đề sẽ xuất hiện khi người dùng sao chép đường link VCUBE chia sẻ lên tin nhắn hoặc mạng xã hội.
            </p>
          </div>

          <div className="mx-auto max-w-xl overflow-hidden rounded-lg border border-line bg-surface shadow-e1">
            {/* Social Post Image */}
            <div className="relative aspect-[1.91/1] overflow-hidden border-b border-line-subtle bg-surface-muted">
              {/* Chưa cấu hình ⇒ trạng thái TRỐNG: KHÔNG gọi ảnh OG bịa của bên thứ ba. */}
              {ogImage ? (
                <img
                  src={ogImage}
                  alt="Thẻ chia sẻ mạng xã hội"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-xs text-fg-muted">Chưa cấu hình ảnh chia sẻ.</span>
                </div>
              )}
              <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full border border-line bg-surface/90 px-2.5 py-1 text-xs font-medium text-fg-muted backdrop-blur-sm">
                <span className="w-2 h-2 rounded-full bg-positive"></span>
                vcube.vn
              </div>
            </div>

            {/* Social Post Meta Body */}
            <div className="space-y-1.5 bg-surface-muted p-4">
              <span className="font-mono text-xs uppercase tracking-wider text-fg-subtle">
                VCUBE.VN // CHẾ TÁC CHÍNH XÁC
              </span>
              <h4 className="text-sm sm:text-base font-semibold tracking-tight text-fg line-clamp-2 leading-snug">
                {metaTitle}
              </h4>
              <p className="text-xs text-fg-muted line-clamp-2 leading-relaxed">
                {metaDesc}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SCHEMA.ORG & ROBOTS */}
      {activeTab === 'schema' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Robots Indexing Settings */}
          <div className="rounded-lg border border-line-subtle bg-surface p-6 space-y-5">
            <h3 className="text-base font-semibold tracking-tight text-fg flex items-center gap-2">
              <Icon name="smart_toy" size={22} className="text-fg-muted" />
              Cấu Hình Thu Thập Dữ Liệu (Bot &amp; Sơ đồ trang)
            </h3>

            <div className="flex items-center justify-between gap-4 rounded-lg border border-line-subtle bg-surface-muted p-4">
              <div>
                <span className="text-sm font-medium text-fg block">Cho phép Bot Tìm Kiếm Thu Thập (index, follow)</span>
                <span className="text-xs text-fg-subtle">
                  {robotsIndex === true
                    ? 'Đang kích hoạt: Googlebot được phép thu thập toàn bộ trang.'
                    : robotsIndex === false
                    ? 'Đang chặn (noindex): Trang không xuất hiện trên công cụ tìm kiếm.'
                    : 'Chưa cấu hình: hệ thống chưa khai báo index hay noindex cho bot tìm kiếm.'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleChange('seoRobotsIndex', !robotsIndex)}
                aria-label="Bật/tắt cho phép bot tìm kiếm index"
                aria-pressed={robotsIndex === true}
                className={`flex h-6 w-11 shrink-0 items-center rounded-full p-1 transition-colors duration-200 motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  robotsIndex ? 'bg-primary' : 'bg-line-control'
                }`}
              >
                <div
                  className={`h-4 w-4 rounded-full bg-surface shadow-e2 transform transition-transform ${
                    robotsIndex ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="rounded-lg border border-line-subtle bg-surface-muted p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-fg">Sơ Đồ Trang XML Tự Động</span>
                <span className="rounded-sm bg-surface px-2 py-0.5 font-mono text-xs font-medium text-fg-muted">
                  Chưa kiểm tra
                </span>
              </div>
              <div className="flex justify-end">
                <InfoTip label="Sitemap.xml chứa những trang nào?">
                  Sơ đồ trang web được tạo động tại{' '}
                  <code className="text-fg font-mono">/sitemap.xml</code> bao gồm toàn bộ trang sản phẩm và
                  trang công nghệ in.
                </InfoTip>
              </div>
            </div>
          </div>

          {/* Schema.org Structured Data */}
          <div className="rounded-lg border border-line-subtle bg-surface p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-semibold tracking-tight text-fg flex items-center gap-2">
                <Icon name="code" size={22} className="text-fg-muted" />
                Dữ Liệu Có Cấu Trúc (JSON-LD)
              </h3>
              <span className="rounded-sm bg-primary-tint px-2 py-0.5 font-mono text-xs font-medium text-fg">
                Schema.org
              </span>
            </div>
            <textarea
              rows={8}
              value={structuredData}
              onChange={(e) => handleChange('seoStructuredData', e.target.value)}
              aria-label="Dữ liệu có cấu trúc JSON-LD"
              className="w-full resize-none rounded-md border border-surface-inverse-raised bg-surface-inverse px-3 py-2 font-mono text-xs text-accent focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-xs text-fg-subtle">
              Dữ liệu JSON-LD giúp Google hiểu rõ thông tin xưởng in, địa chỉ văn phòng và tính năng báo giá 3D.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

