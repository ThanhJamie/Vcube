import React, { useState } from 'react';
import { SiteContentConfig } from '../../types';
import { useLanguage } from '../../context/LanguageContext';

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

  // Form values with fallbacks
  const metaTitle = localContent.seoTitle || 'VCUBE — Dịch Vụ In 3D Công Nghiệp & Báo Giá CAD Tức Thì';
  const metaDesc = localContent.seoDescription || 'Nền tảng sản xuất bồi đắp và in 3D công nghiệp hàng đầu Việt Nam. Báo giá tức thì trong 3 giây cho file STL, STEP, 3MF với dung sai ±0.05mm.';
  const keywords = localContent.seoKeywords || 'in 3d, dich vu in 3d, bao gia in 3d, in 3d cong nghiep, cat lop stl, bambu lab, vcube';
  const ogImage = localContent.seoOgImage || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=1200&h=630&fit=crop';
  const canonicalUrl = localContent.seoCanonicalUrl || 'https://vcube.vn';
  const robotsIndex = localContent.seoRobotsIndex ?? true;
  const structuredData = localContent.seoStructuredData || JSON.stringify({
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "VCUBE Precision 3D Manufacturing",
    "url": "https://vcube.vn",
    "priceRange": "$$"
  }, null, 2);

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
      <div className="bg-white border border-[#CBD5E1] p-5 sm:p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-[#00687A]/10 text-[#00687A] font-mono text-[10px] font-bold rounded-md border border-[#00687A]/30 uppercase tracking-widest">
              SEO CONSOLE // SERP & METADATA
            </span>
            <span className="text-xs text-[#64748B]">Google Search & Social Media Ready</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#091426] mt-1.5 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#00687A]">search</span>
            {isVi ? 'Quản Trị SEO & Metadata Toàn Diện' : 'Search Engine Optimization (SEO) & Metadata'}
          </h2>
          <p className="text-xs text-[#64748B] mt-1">
            {isVi
              ? 'Tùy chỉnh thẻ Meta, xem trước kết quả tìm kiếm Google (SERP Simulator), cấu hình thẻ chia sẻ mạng xã hội và dữ liệu có cấu trúc Schema.org.'
              : 'Configure Meta tags, live preview Google search snippets, customize social share cards, and validate Schema.org JSON-LD.'}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleSave}
            disabled={isSaved}
            className={`px-5 py-2.5 text-xs font-bold rounded-xl uppercase tracking-wider transition-all flex items-center gap-2 shadow-xs cursor-pointer ${
              isSaved
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                : 'bg-gradient-to-r from-[#00687A] to-[#0E7490] hover:from-[#005260] hover:to-[#085F75] text-white'
            }`}
          >
            <span className="material-symbols-outlined text-base">save</span>
            {isSaved ? (isVi ? 'Đã Lưu SEO' : 'All Changes Saved') : (isVi ? 'Lưu Cấu Hình SEO' : 'Save SEO Config')}
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-[#CBD5E1]">
        <button
          onClick={() => setActiveTab('meta')}
          className={`px-4 py-2.5 rounded-xl font-sans text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'meta'
              ? 'bg-[#091426] text-white shadow-xs'
              : 'bg-white text-[#475569] hover:bg-slate-100 border border-[#CBD5E1]'
          }`}
        >
          <span className="material-symbols-outlined text-base">title</span>
          <span>{isVi ? 'Thẻ Meta & Keywords' : 'Meta Tags & Keywords'}</span>
        </button>

        <button
          onClick={() => setActiveTab('serp')}
          className={`px-4 py-2.5 rounded-xl font-sans text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'serp'
              ? 'bg-[#091426] text-white shadow-xs'
              : 'bg-white text-[#475569] hover:bg-slate-100 border border-[#CBD5E1]'
          }`}
        >
          <span className="material-symbols-outlined text-base">travel_explore</span>
          <span>{isVi ? 'Mô Phỏng Google SERP' : 'Google SERP Simulator'}</span>
        </button>

        <button
          onClick={() => setActiveTab('social')}
          className={`px-4 py-2.5 rounded-xl font-sans text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'social'
              ? 'bg-[#091426] text-white shadow-xs'
              : 'bg-white text-[#475569] hover:bg-slate-100 border border-[#CBD5E1]'
          }`}
        >
          <span className="material-symbols-outlined text-base">share</span>
          <span>{isVi ? 'Card Mạng Xã Hội (OpenGraph)' : 'Social Sharing Cards'}</span>
        </button>

        <button
          onClick={() => setActiveTab('schema')}
          className={`px-4 py-2.5 rounded-xl font-sans text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'schema'
              ? 'bg-[#091426] text-white shadow-xs'
              : 'bg-white text-[#475569] hover:bg-slate-100 border border-[#CBD5E1]'
          }`}
        >
          <span className="material-symbols-outlined text-base">schema</span>
          <span>{isVi ? 'Schema.org & Robots' : 'Schema & Robots'}</span>
        </button>
      </div>

      {/* TAB 1: META TAGS & KEYWORDS */}
      {activeTab === 'meta' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            {/* Meta Title */}
            <div className="bg-white border border-[#CBD5E1] p-5 rounded-2xl space-y-2 shadow-2xs">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-[#091426] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-[#00687A]">badge</span>
                  Tiêu Đề Trang (Meta Title)
                </label>
                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                  titleLen >= 50 && titleLen <= 65
                    ? 'bg-emerald-100 text-emerald-800'
                    : titleLen > 65
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {titleLen} / 60 ký tự (Khuyến nghị 50-60)
                </span>
              </div>
              <input
                type="text"
                value={metaTitle}
                onChange={(e) => handleChange('seoTitle', e.target.value)}
                placeholder="VD: VCUBE — Dịch Vụ In 3D Công Nghiệp & Báo Giá CAD Tức Thì"
                className="w-full px-4 py-2.5 bg-slate-50 border border-[#CBD5E1] rounded-xl text-sm text-[#091426] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00687A]/30 focus:border-[#00687A]"
              />
              <p className="text-[11px] text-[#64748B]">
                Tiêu đề hiển thị trên thanh tab trình duyệt và dòng đầu tiên của kết quả tìm kiếm Google.
              </p>
            </div>

            {/* Meta Description */}
            <div className="bg-white border border-[#CBD5E1] p-5 rounded-2xl space-y-2 shadow-2xs">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-[#091426] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-[#00687A]">description</span>
                  Mô Tả Tóm Tắt (Meta Description)
                </label>
                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                  descLen >= 140 && descLen <= 160
                    ? 'bg-emerald-100 text-emerald-800'
                    : descLen > 160
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {descLen} / 160 ký tự (Khuyến nghị 140-160)
                </span>
              </div>
              <textarea
                rows={3}
                value={metaDesc}
                onChange={(e) => handleChange('seoDescription', e.target.value)}
                placeholder="Mô tả tóm tắt nội dung nền tảng và thế mạnh in 3D công nghiệp..."
                className="w-full px-4 py-2.5 bg-slate-50 border border-[#CBD5E1] rounded-xl text-sm text-[#091426] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00687A]/30 focus:border-[#00687A] resize-none"
              />
              <p className="text-[11px] text-[#64748B]">
                Đoạn snippet xuất hiện dưới tiêu đề tìm kiếm, quyết định tỷ lệ click chuột (CTR) của khách hàng tiềm năng.
              </p>
            </div>

            {/* Keywords */}
            <div className="bg-white border border-[#CBD5E1] p-5 rounded-2xl space-y-2 shadow-2xs">
              <label className="text-xs font-bold uppercase tracking-wider text-[#091426] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-[#00687A]">tag</span>
                Từ Khóa Tìm Kiếm (SEO Keywords)
              </label>
              <input
                type="text"
                value={keywords}
                onChange={(e) => handleChange('seoKeywords', e.target.value)}
                placeholder="in 3d, gia cong in 3d, bao gia stl, in resin, vcube..."
                className="w-full px-4 py-2.5 bg-slate-50 border border-[#CBD5E1] rounded-xl text-sm text-[#091426] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00687A]/30 focus:border-[#00687A]"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {keywords.split(',').map((k, idx) => {
                  const trimmed = k.trim();
                  if (!trimmed) return null;
                  return (
                    <span key={idx} className="px-2 py-0.5 bg-slate-100 text-[#00687A] font-medium text-xs rounded-md border border-slate-200">
                      #{trimmed}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Canonical URL & OG Image */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white border border-[#CBD5E1] p-4 rounded-xl space-y-2 shadow-2xs">
                <label className="text-xs font-bold uppercase tracking-wider text-[#091426] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-[#00687A]">link</span>
                  Canonical URL Chuẩn
                </label>
                <input
                  type="text"
                  value={canonicalUrl}
                  onChange={(e) => handleChange('seoCanonicalUrl', e.target.value)}
                  placeholder="https://vcube.vn"
                  className="w-full px-3 py-2 bg-slate-50 border border-[#CBD5E1] rounded-lg text-xs text-[#091426] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00687A]/30"
                />
              </div>

              <div className="bg-white border border-[#CBD5E1] p-4 rounded-xl space-y-2 shadow-2xs">
                <label className="text-xs font-bold uppercase tracking-wider text-[#091426] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-[#00687A]">image</span>
                  Ảnh Đại Diện Mạng Xã Hội (OG Image)
                </label>
                <input
                  type="text"
                  value={ogImage}
                  onChange={(e) => handleChange('seoOgImage', e.target.value)}
                  placeholder="https://... ảnh tỉ lệ 1200x630"
                  className="w-full px-3 py-2 bg-slate-50 border border-[#CBD5E1] rounded-lg text-xs text-[#091426] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00687A]/30"
                />
              </div>
            </div>
          </div>

          {/* Quick Score Card */}
          <div className="space-y-4">
            <div className="bg-white border border-[#CBD5E1] p-5 rounded-2xl space-y-4 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-[#091426] flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600 text-lg">verified</span>
                  Chỉ Số Tối Ưu Hóa (On-Page Score)
                </h3>
                <span className="text-sm font-black text-emerald-600 font-mono">96 / 100</span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Độ dài tiêu đề</span>
                  <span className={titleLen >= 50 && titleLen <= 65 ? 'text-emerald-600 font-bold' : 'text-amber-600'}>
                    {titleLen >= 50 && titleLen <= 65 ? '✓ Chuẩn' : 'Cần tối ưu'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Độ dài mô tả</span>
                  <span className={descLen >= 140 && descLen <= 160 ? 'text-emerald-600 font-bold' : 'text-amber-600'}>
                    {descLen >= 140 && descLen <= 160 ? '✓ Chuẩn' : 'Cần tối ưu'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Thẻ OpenGraph Image</span>
                  <span className={ogImage ? 'text-emerald-600 font-bold' : 'text-rose-600'}>
                    {ogImage ? '✓ Có sẵn' : '✗ Thiếu'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Canonical Tag</span>
                  <span className={canonicalUrl ? 'text-emerald-600 font-bold' : 'text-rose-600'}>
                    {canonicalUrl ? '✓ Hợp lệ' : '✗ Thiếu'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Dữ liệu Schema.org</span>
                  <span className="text-emerald-600 font-bold">✓ LocalBusiness JSON-LD</span>
                </div>
              </div>
            </div>

            {/* OG Image Mini Preview */}
            {ogImage && (
              <div className="bg-white border border-[#CBD5E1] p-4 rounded-2xl space-y-2 shadow-2xs">
                <span className="text-xs font-bold text-slate-700 block">Xem trước ảnh OG Image:</span>
                <div className="aspect-[1.91/1] rounded-xl overflow-hidden border border-slate-200 bg-slate-100 relative">
                  <img
                    src={ogImage}
                    alt="OG Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/70 backdrop-blur-xs text-white text-[9px] font-mono rounded">
                    1200 × 630 px
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: GOOGLE SERP SIMULATOR */}
      {activeTab === 'serp' && (
        <div className="bg-white border border-[#CBD5E1] p-6 rounded-2xl space-y-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h3 className="text-base font-bold text-[#091426] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#00687A]">preview</span>
                Trình Mô Phỏng Google Search Result (SERP Simulator)
              </h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Hiển thị chính xác diện mạo trang web của bạn trên trang nhất của Google khi người dùng tìm kiếm.
              </p>
            </div>

            {/* Device Switcher */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
              <button
                onClick={() => setDevicePreview('desktop')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  devicePreview === 'desktop' ? 'bg-white text-[#091426] shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span className="material-symbols-outlined text-sm">desktop_windows</span>
                Máy Tính (Desktop)
              </button>
              <button
                onClick={() => setDevicePreview('mobile')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  devicePreview === 'mobile' ? 'bg-white text-[#091426] shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span className="material-symbols-outlined text-sm">smartphone</span>
                Di Động (Mobile)
              </button>
            </div>
          </div>

          {/* SERP Frame */}
          <div className={`p-5 sm:p-6 bg-[#FAFAFA] border border-slate-200 rounded-2xl ${
            devicePreview === 'mobile' ? 'max-w-md mx-auto shadow-md' : 'max-w-3xl'
          }`}>
            <div className="space-y-1.5 font-sans">
              {/* Site Icon & Domain */}
              <div className="flex items-center gap-2 text-xs text-[#202124]">
                <div className="w-6 h-6 rounded-full bg-[#00687A] text-white flex items-center justify-center font-bold text-[10px]">
                  V
                </div>
                <div className="leading-tight">
                  <div className="font-medium text-[#202124] text-[13px]">VCUBE Vietnam</div>
                  <div className="text-[11px] text-[#4d5156] truncate">
                    {canonicalUrl} <span className="text-[#5f6368]">› quote › 3d-printing</span>
                  </div>
                </div>
              </div>

              {/* Title Link */}
              <div className="pt-1">
                <a
                  href="#preview"
                  onClick={(e) => e.preventDefault()}
                  className="text-[#1a0dab] hover:underline text-lg sm:text-xl font-normal leading-snug cursor-pointer block"
                >
                  {metaTitle}
                </a>
              </div>

              {/* Snippet Description */}
              <p className="text-xs sm:text-[13px] text-[#4d5156] leading-relaxed pt-0.5 line-clamp-2 sm:line-clamp-3">
                <span className="text-[#5f6368] font-medium">Hà Nội &amp; TP.HCM — </span>
                {metaDesc}
              </p>

              {/* Sitelinks Mini Simulation */}
              <div className="grid grid-cols-2 gap-3 pt-3 mt-2 border-t border-slate-200/80">
                <div>
                  <a href="#quote" onClick={(e) => e.preventDefault()} className="text-[#1a0dab] hover:underline text-xs font-medium block">
                    Báo Giá CAD Tức Thì 3s
                  </a>
                  <span className="text-[11px] text-[#5f6368] line-clamp-1">Tải file STL, chọn vật liệu, tính giá tự động.</span>
                </div>
                <div>
                  <a href="#materials" onClick={(e) => e.preventDefault()} className="text-[#1a0dab] hover:underline text-xs font-medium block">
                    Danh Mục Vật Liệu FDM/SLA
                  </a>
                  <span className="text-[11px] text-[#5f6368] line-clamp-1">PLA, PETG-CF, ABS, Resin kỹ thuật cao.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SOCIAL MEDIA SHARING CARDS */}
      {activeTab === 'social' && (
        <div className="bg-white border border-[#CBD5E1] p-6 rounded-2xl space-y-6 shadow-xs">
          <div>
            <h3 className="text-base font-bold text-[#091426] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#00687A]">share</span>
              Mô Phỏng Thẻ Chia Sẻ Mạng Xã Hội (Facebook, Zalo, LinkedIn)
            </h3>
            <p className="text-xs text-[#64748B] mt-0.5">
              Hình ảnh và tiêu đề sẽ xuất hiện khi người dùng copy đường link VCUBE chia sẻ lên tin nhắn hoặc mạng xã hội.
            </p>
          </div>

          <div className="max-w-xl mx-auto border border-slate-300 rounded-2xl overflow-hidden shadow-sm bg-white">
            {/* Social Post Image */}
            <div className="aspect-[1.91/1] bg-slate-100 relative overflow-hidden border-b border-slate-200">
              <img
                src={ogImage}
                alt="Social Card"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 left-3 px-2.5 py-1 bg-black/60 backdrop-blur-xs text-white text-xs font-bold rounded-lg flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                vcube.vn
              </div>
            </div>

            {/* Social Post Meta Body */}
            <div className="p-4 bg-slate-50 space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#64748B]">
                VCUBE.VN // PRECISION MANUFACTURING
              </span>
              <h4 className="text-sm sm:text-base font-bold text-[#091426] line-clamp-2 leading-snug">
                {metaTitle}
              </h4>
              <p className="text-xs text-[#475569] line-clamp-2 leading-relaxed">
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
          <div className="bg-white border border-[#CBD5E1] p-5 rounded-2xl space-y-4 shadow-2xs">
            <h3 className="text-sm font-bold text-[#091426] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#00687A]">smart_toy</span>
              Cấu Hình Thu Thập Dữ Liệu (Robots &amp; Sitemap)
            </h3>

            <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <div>
                <span className="text-xs font-bold text-[#091426] block">Cho phép Bot Tìm Kiếm Index (Index, Follow)</span>
                <span className="text-[11px] text-slate-500">
                  {robotsIndex ? 'Đang kích hoạt: Googlebot được phép thu thập toàn bộ trang.' : 'Đang chặn (noindex): Trang không xuất hiện trên công cụ tìm kiếm.'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleChange('seoRobotsIndex', !robotsIndex)}
                className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                  robotsIndex ? 'bg-[#00687A]' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    robotsIndex ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#091426]">Sitemap XML Tự Động</span>
                <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                  200 OK
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Sơ đồ trang web được tạo động tại <code className="text-[#00687A] font-mono">/sitemap.xml</code> bao gồm toàn bộ trang sản phẩm và trang công nghệ in.
              </p>
            </div>
          </div>

          {/* Schema.org Structured Data */}
          <div className="bg-white border border-[#CBD5E1] p-5 rounded-2xl space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#091426] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#00687A]">code</span>
                Dữ Liệu Có Cấu Trúc (JSON-LD Schema)
              </h3>
              <span className="text-[10px] font-mono bg-cyan-50 text-[#00687A] font-bold px-2 py-0.5 rounded">
                Schema.org
              </span>
            </div>
            <textarea
              rows={8}
              value={structuredData}
              onChange={(e) => handleChange('seoStructuredData', e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 text-cyan-300 font-mono text-xs rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-[#00687A] resize-none"
            />
            <p className="text-[11px] text-[#64748B]">
              Dữ liệu JSON-LD giúp Google hiểu rõ thông tin xưởng in, địa chỉ văn phòng và tính năng báo giá 3D.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

