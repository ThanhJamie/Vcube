import React, { useState } from 'react';
import { SiteContentConfig } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { Icon, InfoTip } from '@frontend/ui';

interface AdminSeoPanelProps {
  siteContent: SiteContentConfig;
  onUpdateSiteContent: (content: SiteContentConfig) => void;
  onShowToast: (message: string) => void;
}

export const AdminSeoPanel: React.FC<AdminSeoPanelProps> = ({
  siteContent,
  onUpdateSiteContent,
  onShowToast,
}) => {
  const { language } = useLanguage();
  const isVi = language === 'vi';

  const [localContent, setLocalContent] = useState<SiteContentConfig>({ ...siteContent });
  const [activeTab, setActiveTab] = useState<'meta' | 'serp' | 'social' | 'schema'>('meta');
  const [devicePreview, setDevicePreview] = useState<'desktop' | 'mobile'>('desktop');
  const [isSaved, setIsSaved] = useState(true);

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

  const handleSave = () => {
    onUpdateSiteContent(localContent);
    setIsSaved(true);
    onShowToast(isVi ? 'Đã lưu cấu hình SEO & Metadata thành công!' : 'Saved SEO & Metadata settings successfully!');
  };

  // Title & description character counts
  const titleLen = metaTitle.length;
  const descLen = metaDesc.length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-surface p-5 sm:p-6 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-e1">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-primary/10 text-primary font-mono text-xs font-bold rounded-md border border-primary/30 uppercase tracking-widest">
              SEO CONSOLE // SERP & METADATA
            </span>
            <span className="text-xs text-fg-subtle">Google Search & Social Media Ready</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-fg mt-1.5 flex items-center gap-2">
            <Icon name="search" size={24} className="text-primary" />
            {isVi ? 'Quản Trị SEO & Metadata Toàn Diện' : 'Search Engine Optimization (SEO) & Metadata'}
          </h2>
          <p className="text-xs text-fg-subtle mt-1">
            {isVi
              ? 'Tùy chỉnh thẻ Meta, xem trước kết quả tìm kiếm Google (SERP Simulator), cấu hình thẻ chia sẻ mạng xã hội và dữ liệu có cấu trúc Schema.org.'
              : 'Configure Meta tags, live preview Google search snippets, customize social share cards, and validate Schema.org JSON-LD.'}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleSave}
            disabled={isSaved}
            className={`px-5 py-2.5 text-xs font-bold rounded-lg uppercase tracking-wider transition-all flex items-center gap-2 shadow-e1 cursor-pointer ${
              isSaved
                ? 'bg-line-subtle text-fg-muted cursor-not-allowed shadow-none'
                : 'bg-gradient-to-r from-primary to-primary-hover hover:from-primary-hover hover:to-primary-hover text-primary-fg'
            }`}
          >
            <Icon name="save" size={18} />
            {isSaved ? (isVi ? 'Đã Lưu SEO' : 'All Changes Saved') : (isVi ? 'Lưu Cấu Hình SEO' : 'Save SEO Config')}
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-line">
        <button
          onClick={() => setActiveTab('meta')}
          className={`px-4 py-2.5 rounded-lg font-sans text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'meta'
              ? 'bg-surface-inverse text-on-inverse shadow-e1'
              : 'bg-surface text-fg-muted hover:bg-surface-muted border border-line'
          }`}
        >
          <Icon name="title" size={18} />
          <span>{isVi ? 'Thẻ Meta & Keywords' : 'Meta Tags & Keywords'}</span>
        </button>

        <button
          onClick={() => setActiveTab('serp')}
          className={`px-4 py-2.5 rounded-lg font-sans text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'serp'
              ? 'bg-surface-inverse text-on-inverse shadow-e1'
              : 'bg-surface text-fg-muted hover:bg-surface-muted border border-line'
          }`}
        >
          <Icon name="travel_explore" size={18} />
          <span>{isVi ? 'Mô Phỏng Google SERP' : 'Google SERP Simulator'}</span>
        </button>

        <button
          onClick={() => setActiveTab('social')}
          className={`px-4 py-2.5 rounded-lg font-sans text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'social'
              ? 'bg-surface-inverse text-on-inverse shadow-e1'
              : 'bg-surface text-fg-muted hover:bg-surface-muted border border-line'
          }`}
        >
          <Icon name="share" size={18} />
          <span>{isVi ? 'Card Mạng Xã Hội (OpenGraph)' : 'Social Sharing Cards'}</span>
        </button>

        <button
          onClick={() => setActiveTab('schema')}
          className={`px-4 py-2.5 rounded-lg font-sans text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'schema'
              ? 'bg-surface-inverse text-on-inverse shadow-e1'
              : 'bg-surface text-fg-muted hover:bg-surface-muted border border-line'
          }`}
        >
          <Icon name="schema" size={18} />
          <span>{isVi ? 'Schema.org & Robots' : 'Schema & Robots'}</span>
        </button>
      </div>

      {/* TAB 1: META TAGS & KEYWORDS */}
      {activeTab === 'meta' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            {/* Meta Title */}
            <div className="bg-surface p-5 rounded-lg space-y-2 shadow-e0">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-fg flex items-center gap-1.5">
                  <Icon name="badge" size={16} className="text-primary" />
                  Tiêu Đề Trang (Meta Title)
                </label>
                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-sm ${
                  titleLen >= 50 && titleLen <= 65
                    ? 'bg-positive-tint text-positive'
                    : titleLen > 65
                    ? 'bg-warning-tint text-warning'
                    : 'bg-surface-muted text-fg-muted'
                }`}>
                  {titleLen} / 60 ký tự (Khuyến nghị 50-60)
                </span>
              </div>
              <input
                type="text"
                value={metaTitle}
                onChange={(e) => handleChange('seoTitle', e.target.value)}
                placeholder="VD: VCUBE — Dịch Vụ In 3D Công Nghiệp & Báo Giá CAD Tức Thì"
                className="w-full px-4 py-2.5 bg-canvas border border-line rounded-lg text-sm text-fg focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
              <div className="flex justify-end">
                <InfoTip label="Tiêu đề trang xuất hiện ở đâu?">
                  Tiêu đề hiển thị trên thanh tab trình duyệt và dòng đầu tiên của kết quả tìm kiếm Google.
                </InfoTip>
              </div>
            </div>

            {/* Meta Description */}
            <div className="bg-surface p-5 rounded-lg space-y-2 shadow-e0">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-fg flex items-center gap-1.5">
                  <Icon name="description" size={16} className="text-primary" />
                  Mô Tả Tóm Tắt (Meta Description)
                </label>
                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-sm ${
                  descLen >= 140 && descLen <= 160
                    ? 'bg-positive-tint text-positive'
                    : descLen > 160
                    ? 'bg-warning-tint text-warning'
                    : 'bg-surface-muted text-fg-muted'
                }`}>
                  {descLen} / 160 ký tự (Khuyến nghị 140-160)
                </span>
              </div>
              <textarea
                rows={3}
                value={metaDesc}
                onChange={(e) => handleChange('seoDescription', e.target.value)}
                placeholder="Mô tả tóm tắt nội dung nền tảng và thế mạnh in 3D công nghiệp..."
                className="w-full px-4 py-2.5 bg-canvas border border-line rounded-lg text-sm text-fg focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
              />
              <div className="flex justify-end">
                <InfoTip label="Mô tả tóm tắt ảnh hưởng gì?">
                  Đoạn snippet xuất hiện dưới tiêu đề tìm kiếm, quyết định tỷ lệ click chuột (CTR) của khách hàng
                  tiềm năng.
                </InfoTip>
              </div>
            </div>

            {/* Keywords */}
            <div className="bg-surface p-5 rounded-lg space-y-2 shadow-e0">
              <label className="text-xs font-bold uppercase tracking-wider text-fg flex items-center gap-1.5">
                <Icon name="tag" size={16} className="text-primary" />
                Từ Khóa Tìm Kiếm (SEO Keywords)
              </label>
              <input
                type="text"
                value={keywords}
                onChange={(e) => handleChange('seoKeywords', e.target.value)}
                placeholder="in 3d, gia cong in 3d, bao gia stl, in resin, vcube..."
                className="w-full px-4 py-2.5 bg-canvas border border-line rounded-lg text-sm text-fg focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {keywords.split(',').map((k, idx) => {
                  const trimmed = k.trim();
                  if (!trimmed) return null;
                  return (
                    <span key={idx} className="px-2 py-0.5 bg-surface-muted text-primary font-medium text-xs rounded-md border border-line-subtle">
                      #{trimmed}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Canonical URL & OG Image */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-surface p-4 rounded-lg space-y-2 shadow-e0">
                <label className="text-xs font-bold uppercase tracking-wider text-fg flex items-center gap-1.5">
                  <Icon name="link" size={16} className="text-primary" />
                  Canonical URL Chuẩn
                </label>
                <input
                  type="text"
                  value={canonicalUrl}
                  onChange={(e) => handleChange('seoCanonicalUrl', e.target.value)}
                  placeholder="https://vcube.vn"
                  className="w-full px-3 py-2 bg-canvas border border-line rounded-lg text-xs text-fg focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div className="bg-surface p-4 rounded-lg space-y-2 shadow-e0">
                <label className="text-xs font-bold uppercase tracking-wider text-fg flex items-center gap-1.5">
                  <Icon name="image" size={16} className="text-primary" />
                  Ảnh Đại Diện Mạng Xã Hội (OG Image)
                </label>
                <input
                  type="text"
                  value={ogImage}
                  onChange={(e) => handleChange('seoOgImage', e.target.value)}
                  placeholder="https://... ảnh tỉ lệ 1200x630"
                  className="w-full px-3 py-2 bg-canvas border border-line rounded-lg text-xs text-fg focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
          </div>

          {/* Quick Score Card */}
          <div className="space-y-4">
            <div className="bg-surface p-5 rounded-lg space-y-4 shadow-e0">
              <div className="flex items-center justify-between border-b border-line-subtle pb-3">
                <h3 className="text-sm font-bold text-fg flex items-center gap-2">
                  <Icon name="verified" size={20} className="text-positive" />
                  Chỉ Số Tối Ưu Hóa (On-Page Score)
                </h3>
                <span className="text-sm font-black text-fg-muted font-mono" title={isVi ? 'Chưa có công cụ crawl/đo chỉ số on-page' : 'No on-page crawler configured'}>—</span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-fg-muted">Độ dài tiêu đề</span>
                  <span className={!metaTitle ? 'text-fg-muted' : titleLen >= 50 && titleLen <= 65 ? 'text-positive font-bold' : 'text-warning'}>
                    {!metaTitle ? '— Chưa cấu hình' : titleLen >= 50 && titleLen <= 65 ? '✓ Chuẩn' : 'Cần tối ưu'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-fg-muted">Độ dài mô tả</span>
                  <span className={!metaDesc ? 'text-fg-muted' : descLen >= 140 && descLen <= 160 ? 'text-positive font-bold' : 'text-warning'}>
                    {!metaDesc ? '— Chưa cấu hình' : descLen >= 140 && descLen <= 160 ? '✓ Chuẩn' : 'Cần tối ưu'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-fg-muted">Thẻ OpenGraph Image</span>
                  <span className={ogImage ? 'text-positive font-bold' : 'text-danger'}>
                    {ogImage ? '✓ Có sẵn' : '✗ Thiếu'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-fg-muted">Canonical Tag</span>
                  <span className={canonicalUrl ? 'text-positive font-bold' : 'text-danger'}>
                    {canonicalUrl ? '✓ Hợp lệ' : '✗ Thiếu'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-fg-muted">Dữ liệu Schema.org</span>
                  <span className={localContent.seoStructuredData ? 'text-positive font-bold' : 'text-fg-muted'}>{localContent.seoStructuredData ? '✓ Có dữ liệu Schema.org' : '— Chưa cấu hình'}</span>
                </div>
              </div>
            </div>

            {/* OG Image Mini Preview — chưa cấu hình ⇒ trạng thái TRỐNG, không gọi ảnh bịa */}
            <div className="bg-surface p-4 rounded-lg space-y-2 shadow-e0">
              <span className="text-xs font-bold text-fg-muted block">Xem trước ảnh OG Image:</span>
              {ogImage ? (
                <div className="aspect-[1.91/1] rounded-lg overflow-hidden border border-line-subtle bg-surface-muted relative">
                  <img
                    src={ogImage}
                    alt="OG Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-surface-inverse/70 backdrop-blur-xs text-on-inverse text-xs font-mono rounded-sm">
                    1200 × 630 px
                  </div>
                </div>
              ) : (
                <div className="aspect-[1.91/1] rounded-lg border border-line-subtle bg-surface-muted flex items-center justify-center">
                  <span className="text-xs text-fg-muted">Chưa cấu hình ảnh OG — hệ thống không hiển thị ảnh mẫu.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: GOOGLE SERP SIMULATOR */}
      {activeTab === 'serp' && (
        <div className="bg-surface p-6 rounded-lg space-y-6 shadow-e1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line-subtle pb-4">
            <div>
              <h3 className="text-base font-bold text-fg flex items-center gap-2">
                <Icon name="preview" size={24} className="text-primary" />
                Trình Mô Phỏng Google Search Result (SERP Simulator)
              </h3>
              <p className="text-xs text-fg-subtle mt-0.5">
                Hiển thị chính xác diện mạo trang web của bạn trên trang nhất của Google khi người dùng tìm kiếm.
              </p>
            </div>

            {/* Device Switcher */}
            <div className="flex items-center gap-1 bg-surface-muted p-1 rounded-lg border border-line-subtle shrink-0">
              <button
                onClick={() => setDevicePreview('desktop')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  devicePreview === 'desktop' ? 'bg-surface text-fg shadow-e1' : 'text-fg-subtle hover:text-fg'
                }`}
              >
                <Icon name="desktop_windows" size={16} />
                Máy Tính (Desktop)
              </button>
              <button
                onClick={() => setDevicePreview('mobile')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  devicePreview === 'mobile' ? 'bg-surface text-fg shadow-e1' : 'text-fg-subtle hover:text-fg'
                }`}
              >
                <Icon name="smartphone" size={16} />
                Di Động (Mobile)
              </button>
            </div>
          </div>

          {/* SERP Frame */}
          <div className={`p-5 sm:p-6 bg-surface-muted border border-line-subtle rounded-lg ${
            devicePreview === 'mobile' ? 'max-w-md mx-auto shadow-e2' : 'max-w-3xl'
          }`}>
            <div className="space-y-1.5 font-sans">
              {/* Site Icon & Domain */}
              <div className="flex items-center gap-2 text-xs text-fg">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-fg flex items-center justify-center font-bold text-xs">
                  V
                </div>
                <div className="leading-tight">
                  <div className="font-medium text-fg text-sm">VCUBE Vietnam</div>
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
                  <span className="text-xs text-fg-muted line-clamp-1">Tải file STL, chọn vật liệu, tính giá tự động.</span>
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
        <div className="bg-surface p-6 rounded-lg space-y-6 shadow-e1">
          <div>
            <h3 className="text-base font-bold text-fg flex items-center gap-2">
              <Icon name="share" size={24} className="text-primary" />
              Mô Phỏng Thẻ Chia Sẻ Mạng Xã Hội (Facebook, Zalo, LinkedIn)
            </h3>
            <p className="text-xs text-fg-subtle mt-0.5">
              Hình ảnh và tiêu đề sẽ xuất hiện khi người dùng copy đường link VCUBE chia sẻ lên tin nhắn hoặc mạng xã hội.
            </p>
          </div>

          <div className="max-w-xl mx-auto border border-line rounded-lg overflow-hidden shadow-e1 bg-surface">
            {/* Social Post Image */}
            <div className="aspect-[1.91/1] bg-surface-muted relative overflow-hidden border-b border-line-subtle">
              {/* Chưa cấu hình ⇒ trạng thái TRỐNG: KHÔNG gọi ảnh OG bịa của bên thứ ba. */}
              {ogImage ? (
                <img
                  src={ogImage}
                  alt="Social Card"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-xs text-fg-muted">Chưa cấu hình ảnh OG (OpenGraph).</span>
                </div>
              )}
              <div className="absolute top-3 left-3 px-2.5 py-1 bg-surface-inverse/70 backdrop-blur-xs text-on-inverse text-xs font-bold rounded-lg flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-positive"></span>
                vcube.vn
              </div>
            </div>

            {/* Social Post Meta Body */}
            <div className="p-4 bg-canvas space-y-1.5">
              <span className="text-xs font-mono uppercase tracking-widest text-fg-subtle">
                VCUBE.VN // PRECISION MANUFACTURING
              </span>
              <h4 className="text-sm sm:text-base font-bold text-fg line-clamp-2 leading-snug">
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Robots Indexing Settings */}
          <div className="bg-surface p-5 rounded-lg space-y-4 shadow-e0">
            <h3 className="text-sm font-bold text-fg flex items-center gap-2">
              <Icon name="smart_toy" size={24} className="text-primary" />
              Cấu Hình Thu Thập Dữ Liệu (Robots &amp; Sitemap)
            </h3>

            <div className="flex items-center justify-between p-4 bg-canvas border border-line-subtle rounded-lg">
              <div>
                <span className="text-xs font-bold text-fg block">Cho phép Bot Tìm Kiếm Index (Index, Follow)</span>
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
                className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                  robotsIndex ? 'bg-primary' : 'bg-line'
                }`}
              >
                <div
                  className={`bg-surface w-4 h-4 rounded-full shadow-e2 transform transition-transform ${
                    robotsIndex ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="p-4 bg-canvas border border-line-subtle rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-fg">Sitemap XML Tự Động</span>
                <span className="text-xs font-mono font-bold text-fg-muted bg-surface-muted px-2 py-0.5 rounded-sm">
                  {isVi ? 'Chưa kiểm tra' : 'Not checked'}
                </span>
              </div>
              <div className="flex justify-end">
                <InfoTip label="Sitemap.xml chứa những trang nào?">
                  Sơ đồ trang web được tạo động tại{' '}
                  <code className="text-primary font-mono">/sitemap.xml</code> bao gồm toàn bộ trang sản phẩm và
                  trang công nghệ in.
                </InfoTip>
              </div>
            </div>
          </div>

          {/* Schema.org Structured Data */}
          <div className="bg-surface p-5 rounded-lg space-y-3 shadow-e0">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-fg flex items-center gap-2">
                <Icon name="code" size={24} className="text-primary" />
                Dữ Liệu Có Cấu Trúc (JSON-LD Schema)
              </h3>
              <span className="text-xs font-mono bg-primary-tint text-primary font-bold px-2 py-0.5 rounded-sm">
                Schema.org
              </span>
            </div>
            <textarea
              rows={8}
              value={structuredData}
              onChange={(e) => handleChange('seoStructuredData', e.target.value)}
              className="w-full px-3 py-2 bg-surface-inverse text-accent font-mono text-xs rounded-lg border border-surface-inverse-raised focus:outline-none focus:ring-2 focus:ring-primary resize-none"
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

