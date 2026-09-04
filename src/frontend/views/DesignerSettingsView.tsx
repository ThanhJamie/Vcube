import React, { useState, useEffect, useMemo } from 'react';
import {
  User,
  Sparkles,
  ShieldCheck,
  Award,
  Crown,
  Share2,
  Lock,
  Globe,
  DollarSign,
  CreditCard,
  Building2,
  CheckCircle2,
  ExternalLink,
  Layers,
  Save,
  HelpCircle,
  Eye,
  Info,
  Check,
  Palette,
  Image as ImageIcon
} from 'lucide-react';
import { DesignerProfile } from '../types';

export interface DesignerSettingsViewProps {
  onNavigate?: (screen: string, payload?: any) => void;
  onShowToast?: (message: string) => void;
}

const DEFAULT_DESIGNER_PROFILE: DesignerProfile = {
  id: 'des-creator-01',
  userId: 'usr-designer-lethang',
  displayName: 'Lê Thắng CAD/CAM Studio',
  bio: 'Kỹ sư thiết kế cơ khí chính xác & chế tác mô hình 3D công nghiệp. Hơn 8 năm kinh nghiệm thực chiến với SolidWorks, Fusion 360 và Blender.',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
  coverUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
  socialLinks: {
    artstation: 'https://artstation.com/lethangcad',
    thingiverse: 'https://thingiverse.com/lethang_3d',
    printables: 'https://printables.com/@lethang',
    facebook: 'https://facebook.com/lethang.designer',
    youtube: 'https://youtube.com/@lethangcad3d'
  },
  defaultRoyaltyPercent: 12,
  licenseMode: 'PrintOnly',
  badgeTier: 'VerifiedEngineer', // Standard | TopCreator | VerifiedEngineer | PioneerMaker
  payoutBankInfo: 'Ngân hàng TMCP Quân Đội (MB Bank) - STK: 0988889999 - CHỦ TK: LE THANG',
  totalSalesCount: 148,
  totalRoyaltiesEarned: 18450000,
  createdAt: '2026-02-10T09:00:00.000Z',
  updatedAt: new Date().toISOString()
};

// Preset avatar options for quick selection
const AVATAR_PRESETS = [
  { label: 'Kỹ Sư CAD Nam', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80' },
  { label: 'Nhà Sáng Tạo Nữ', url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80' },
  { label: 'Chuyên Gia 3D Art', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80' },
  { label: 'Robot Avatar Tech', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80' }
];

// Preset cover options
const COVER_PRESETS = [
  { label: 'Trừu tượng Công nghệ Xanh', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Lưới Không Gian CAD 3D', url: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Cyberpunk Neon Studio', url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80' }
];

export const DesignerSettingsView: React.FC<DesignerSettingsViewProps> = ({
  onNavigate,
  onShowToast
}) => {
  // Load profile from localStorage or default
  const [profile, setProfile] = useState<DesignerProfile>(() => {
    try {
      const saved = localStorage.getItem('vcube_designer_profile');
      return saved ? JSON.parse(saved) : DEFAULT_DESIGNER_PROFILE;
    } catch {
      return DEFAULT_DESIGNER_PROFILE;
    }
  });

  // Form states
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [bio, setBio] = useState(profile.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl || '');
  const [coverUrl, setCoverUrl] = useState(profile.coverUrl || '');
  const [licenseMode, setLicenseMode] = useState<DesignerProfile['licenseMode']>(profile.licenseMode);
  const [royaltyPercent, setRoyaltyPercent] = useState<number>(profile.defaultRoyaltyPercent || 10);
  const [socialArtstation, setSocialArtstation] = useState(profile.socialLinks?.artstation || '');
  const [socialPrintables, setSocialPrintables] = useState(profile.socialLinks?.printables || '');
  const [socialThingiverse, setSocialThingiverse] = useState(profile.socialLinks?.thingiverse || '');
  const [socialFacebook, setSocialFacebook] = useState(profile.socialLinks?.facebook || '');
  const [socialYoutube, setSocialYoutube] = useState(profile.socialLinks?.youtube || '');
  const [payoutBankInfo, setPayoutBankInfo] = useState(profile.payoutBankInfo || '');

  // Simulation of revenue
  const samplePrintOrderPrice = 250000; // 250k VND order
  const calculatedRoyaltyAmount = useMemo(() => {
    return Math.round((samplePrintOrderPrice * royaltyPercent) / 100);
  }, [royaltyPercent]);

  // Sync back to localStorage
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      onShowToast?.('Vui lòng nhập tên hiển thị của bạn!');
      return;
    }

    const updated: DesignerProfile = {
      ...profile,
      displayName: displayName.trim(),
      bio: bio.trim(),
      avatarUrl: avatarUrl.trim(),
      coverUrl: coverUrl.trim(),
      licenseMode,
      defaultRoyaltyPercent: Number(royaltyPercent),
      payoutBankInfo: payoutBankInfo.trim(),
      socialLinks: {
        artstation: socialArtstation.trim(),
        printables: socialPrintables.trim(),
        thingiverse: socialThingiverse.trim(),
        facebook: socialFacebook.trim(),
        youtube: socialYoutube.trim()
      },
      updatedAt: new Date().toISOString()
    };

    setProfile(updated);
    try {
      localStorage.setItem('vcube_designer_profile', JSON.stringify(updated));
    } catch (e) {
      console.warn(e);
    }
    onShowToast?.('Đã lưu thông tin hồ sơ và bản quyền Tác Giả thành công!');
  };

  // Badge tier configuration
  const currentTierConfig = useMemo(() => {
    const tier = profile.badgeTier || 'Standard';
    switch (tier) {
      case 'PioneerMaker':
        return {
          title: 'Pioneer Maker (Đối Tác Tiên Phong)',
          desc: 'Cấp độ cao nhất dành cho Kỹ sư và Studio sáng lập cộng đồng VCUBE. Hoa hồng ưu tiên cao nhất & quyền thẩm định file in 3D.',
          icon: Crown,
          gradient: 'from-amber-400 via-orange-500 to-rose-600',
          badgeStyle: 'bg-amber-100 text-amber-900 border-amber-300 ring-4 ring-amber-400/20',
          perks: ['Phí giao dịch nền tảng 0%', 'Được gắn thẻ Featured trên toàn bộ trang chủ', 'Duyệt bài đăng STL tức thì']
        };
      case 'VerifiedEngineer':
        return {
          title: 'Verified Engineer (Kỹ Sư Kiểm Định)',
          desc: 'Chứng nhận Kỹ sư thiết kế cơ khí & CAD đã thẩm định năng lực dung sai chính xác (< 0.05mm). File có độ tin cậy in thành công 99.8%.',
          icon: ShieldCheck,
          gradient: 'from-blue-600 via-[#00687A] to-teal-500',
          badgeStyle: 'bg-teal-100 text-[#00687A] border-teal-300 ring-4 ring-teal-400/20',
          perks: ['Huy hiệu tích xanh Verified Engineer', 'Ưu tiên kết nối đơn đặt hàng CAD theo yêu cầu', 'Nhận hoa hồng kỹ thuật cao']
        };
      case 'TopCreator':
        return {
          title: 'Top Creator (Tác Giả Xu Hướng)',
          desc: 'Dành cho các nhà thiết kế có sản phẩm bán chạy (> 100 lượt tải/in) và nhận đánh giá 5 sao từ khách hàng.',
          icon: Award,
          gradient: 'from-purple-600 via-pink-500 to-rose-500',
          badgeStyle: 'bg-purple-100 text-purple-900 border-purple-300 ring-4 ring-purple-400/20',
          perks: ['Được đề xuất trong Banner Marketplace', 'Tăng hạn mức tải lên 50 file/ngày', 'Hỗ trợ marketing qua Newsletter VCUBE']
        };
      case 'Standard':
      default:
        return {
          title: 'Standard Creator (Thành Viên Khởi Tạo)',
          desc: 'Hạng khởi đầu sau khi đăng ký tài khoản Tác Giả 3D. Cho phép chia sẻ mô hình và nhận hoa hồng khi khách hàng đặt in.',
          icon: Sparkles,
          gradient: 'from-slate-600 via-slate-700 to-slate-900',
          badgeStyle: 'bg-slate-100 text-slate-800 border-slate-300',
          perks: ['Tải lên tối đa 10 mô hình 3D/tháng', 'Nhận thanh toán hoa hồng tự động 2 lần/tháng', 'Quyền bảo hộ bản quyền PrintOnly']
        };
    }
  }, [profile.badgeTier]);

  const TierIcon = currentTierConfig.icon;

  return (
    <div className="w-full min-h-screen bg-[#F8F9FA] text-slate-800 pb-16 font-sans">
      {/* Header Banner */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">Cấu Hình Hồ Sơ Tác Giả (Designer Studio)</h1>
              <p className="text-xs text-slate-500">
                Tự thiết lập thương hiệu, bản quyền in ấn và phương thức nhận thanh toán hoa hồng
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigate?.('designer')}
              className="px-3.5 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Về Studio Quản Lý File
            </button>
            <button
              type="button"
              onClick={handleSaveProfile}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-sm transition-all"
            >
              <Save className="w-4 h-4" />
              Lưu Thay Đổi
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-6 space-y-6">
        {/* ========================================================================= */}
        {/* SECTION 1: BADGE TIER GRANTED BY ADMIN */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs overflow-hidden relative">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div
                className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${currentTierConfig.gradient} text-white flex items-center justify-center shadow-lg shrink-0`}
              >
                <TierIcon className="w-9 h-9 drop-shadow-md" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${currentTierConfig.badgeStyle}`}>
                    {currentTierConfig.title}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">Huy hiệu chính thức</span>
                </div>
                <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                  {currentTierConfig.desc}
                </p>
                <div className="pt-2 flex flex-wrap items-center gap-2">
                  {currentTierConfig.perks.map((perk, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg"
                    >
                      <Check className="w-3 h-3 text-emerald-600" />
                      {perk}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-right min-w-[200px] shrink-0 w-full md:w-auto">
              <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Tổng doanh thu hoa hồng</div>
              <div className="text-lg font-extrabold text-purple-700 mt-0.5">
                {(profile.totalRoyaltiesEarned || 18450000).toLocaleString('vi-VN')} đ
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Từ <strong>{profile.totalSalesCount || 148}</strong> lượt in 3D vật lý
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            Huy hiệu do Ban Quản Trị VCUBE thẩm định và cấp tự động dựa trên số lượt in thành công, phản hồi từ xưởng in và chứng nhận CAD.
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 2: PROFILE & BRANDING */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <User className="w-5 h-5 text-purple-600" />
            Hồ Sơ & Thương Hiệu Cá Nhân (Public Creator Profile)
          </h2>

          {/* Visual Preview Box */}
          <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            {/* Cover Banner */}
            <div
              className="h-36 sm:h-44 w-full bg-cover bg-center relative"
              style={{ backgroundImage: `url(${coverUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80'})` }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-3 right-3 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-lg text-white text-[11px] font-medium flex items-center gap-1">
                <ImageIcon className="w-3 h-3 text-cyan-300" />
                Xem trước ảnh bìa Profile
              </div>
            </div>

            {/* Profile Info Bar */}
            <div className="p-4 sm:p-6 bg-white flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 -mt-12 relative z-10">
              <div className="flex items-end gap-4">
                <img
                  src={avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'}
                  alt={displayName}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-4 border-white shadow-md bg-slate-200"
                />
                <div className="mb-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-extrabold text-slate-900">{displayName || 'Tên Tác Giả'}</h3>
                    <span className="px-2 py-0.5 rounded-md bg-teal-100 text-[#00687A] text-[10px] font-extrabold">
                      {profile.badgeTier}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-1 max-w-md">
                    {bio || 'Chưa cập nhật tiểu sử kỹ sư CAD...'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-3 py-1 rounded-lg border border-purple-200">
                  Royalty: {royaltyPercent}%
                </span>
                <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
                  Chế độ: {licenseMode === 'PrintOnly' ? 'Chỉ In 3D (PrintOnly)' : 'Thuê Bao Thương Mại'}
                </span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Tên hiển thị công khai (Display Name / Studio) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="VD: Lê Thắng CAD/CAM Studio"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 font-bold focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Liên kết ảnh đại diện (Avatar URL)
                </label>
                <input
                  type="text"
                  value={avatarUrl}
                  onChange={e => setAvatarUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 font-mono text-xs focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Quick Avatar Presets */}
            <div className="flex items-center gap-2 text-xs flex-wrap">
              <span className="text-[11px] font-semibold text-slate-500">Chọn nhanh avatar mẫu:</span>
              {AVATAR_PRESETS.map((p, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => setAvatarUrl(p.url)}
                  className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-purple-50 hover:text-purple-700 text-slate-600 text-[11px] font-medium transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Cover URL */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Liên kết ảnh bìa Banner (Cover URL)
              </label>
              <input
                type="text"
                value={coverUrl}
                onChange={e => setCoverUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 font-mono text-xs focus:ring-1 focus:ring-purple-500"
              />
            </div>

            {/* Quick Cover Presets */}
            <div className="flex items-center gap-2 text-xs flex-wrap">
              <span className="text-[11px] font-semibold text-slate-500">Chọn nhanh ảnh bìa mẫu:</span>
              {COVER_PRESETS.map((p, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => setCoverUrl(p.url)}
                  className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-purple-50 hover:text-purple-700 text-slate-600 text-[11px] font-medium transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Bio */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Tiểu sử & Chuyên môn kỹ thuật (Bio / CAD Skills)
              </label>
              <textarea
                rows={3}
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="Mô tả kinh nghiệm, phần mềm sử dụng (SolidWorks, Fusion 360, Blender...), phong cách thiết kế..."
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:ring-1 focus:ring-purple-500"
              />
            </div>

            {/* Social Links */}
            <div className="space-y-2 pt-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-purple-600" />
                Mạng xã hội & Kênh Portfolio chuyên ngành (Social Links)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-600">ArtStation URL</span>
                  <input
                    type="text"
                    value={socialArtstation}
                    onChange={e => setSocialArtstation(e.target.value)}
                    placeholder="https://artstation.com/..."
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-600">Printables URL</span>
                  <input
                    type="text"
                    value={socialPrintables}
                    onChange={e => setSocialPrintables(e.target.value)}
                    placeholder="https://printables.com/@..."
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-600">Thingiverse URL</span>
                  <input
                    type="text"
                    value={socialThingiverse}
                    onChange={e => setSocialThingiverse(e.target.value)}
                    placeholder="https://thingiverse.com/..."
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-600">Facebook Page / Profile</span>
                  <input
                    type="text"
                    value={socialFacebook}
                    onChange={e => setSocialFacebook(e.target.value)}
                    placeholder="https://facebook.com/..."
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-600">YouTube Kỹ Thuật CAD</span>
                  <input
                    type="text"
                    value={socialYoutube}
                    onChange={e => setSocialYoutube(e.target.value)}
                    placeholder="https://youtube.com/@..."
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300"
                  />
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 3: LICENSING MODE & ROYALTY PERCENTAGE */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Lock className="w-5 h-5 text-purple-600" />
              Cấu hình Bản Quyền & Tỷ Lệ Hoa Hồng Mặc Định
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Áp dụng tự động cho các mô hình 3D bạn đăng tải lên sàn giao dịch VCUBE.
            </p>
          </div>

          {/* License Mode Selection */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Chọn chế độ cấp phép mặc định (Default License Mode):
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Option 1: PrintOnly */}
              <button
                type="button"
                onClick={() => setLicenseMode('PrintOnly')}
                className={`p-5 rounded-2xl border-2 text-left transition-all relative ${
                  licenseMode === 'PrintOnly'
                    ? 'border-purple-600 bg-purple-50/50 shadow-sm ring-2 ring-purple-600/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[11px] font-bold">
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                    PrintOnly (Khuyên Dùng)
                  </div>
                  {licenseMode === 'PrintOnly' && (
                    <div className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
                <h3 className="font-bold text-sm text-slate-900">Chỉ Cho Phép In 3D (Không Tải STL Gốc)</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Bảo vệ tối đa bản quyền tài sản trí tuệ. Khách hàng chỉ có thể đặt in sản phẩm vật lý thông qua xưởng in được VCUBE ủy quyền. Mã G-code được mã hóa và xóa ngay sau khi in xong.
                </p>
              </button>

              {/* Option 2: CommercialSubscription */}
              <button
                type="button"
                onClick={() => setLicenseMode('CommercialSubscription')}
                className={`p-5 rounded-2xl border-2 text-left transition-all relative ${
                  licenseMode === 'CommercialSubscription'
                    ? 'border-purple-600 bg-purple-50/50 shadow-sm ring-2 ring-purple-600/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold">
                    <DollarSign className="w-3.5 h-3.5 text-blue-600" />
                    Commercial Subscription
                  </div>
                  {licenseMode === 'CommercialSubscription' && (
                    <div className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
                <h3 className="font-bold text-sm text-slate-900">Cấp Quyền Thương Mại / Bán Sản Phẩm In</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Cho phép các cá nhân và xưởng in mua gói thuê bao định kỳ để bán sản phẩm vật lý đúc từ mẫu thiết kế của bạn. Tạo nguồn thu nhập thụ động định kỳ hàng tháng.
                </p>
              </button>
            </div>
          </div>

          {/* Royalty Percentage Slider */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-purple-50/40 border border-purple-100 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Tỷ lệ hoa hồng mong muốn trên mỗi sản phẩm in (Royalty Rate)
                </span>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tỷ lệ trích thưởng trực tiếp từ giá trị đơn hàng khi khách hàng đặt in mẫu thiết kế của bạn.
                </p>
              </div>

              <div className="px-4 py-1.5 rounded-xl bg-purple-600 text-white font-extrabold text-base self-start sm:self-auto shadow-xs">
                {royaltyPercent}%
              </div>
            </div>

            <div className="space-y-2">
              <input
                type="range"
                min={5}
                max={30}
                step={1}
                value={royaltyPercent}
                onChange={e => setRoyaltyPercent(Number(e.target.value))}
                className="w-full accent-purple-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[11px] font-semibold text-slate-400">
                <span>5% (Khởi điểm)</span>
                <span>10% - 15% (Tiêu chuẩn đề xuất)</span>
                <span>20% (Kỹ thuật cao)</span>
                <span>30% (Tối đa)</span>
              </div>
            </div>

            {/* Live Simulation Box */}
            <div className="p-4 rounded-xl bg-white border border-purple-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-slate-900">Mô phỏng thu nhập thực tế:</div>
                  <div className="text-slate-500">
                    Với 1 đơn hàng in 3D mẫu của bạn trị giá <strong>{samplePrintOrderPrice.toLocaleString('vi-VN')} đ</strong>:
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-[10px] uppercase font-bold text-slate-400">Hoa hồng tác giả nhận ngay</div>
                <div className="text-base font-extrabold text-purple-700">
                  +{calculatedRoyaltyAmount.toLocaleString('vi-VN')} đ
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 4: PAYOUT BANK INFORMATION */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-purple-600" />
              Tài Khoản Ngân Hàng Nhận Quyết Toán Hoa Hồng (Payout Bank Account)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Hệ thống tự động chuyển khoản định kỳ vào ngày 05 và ngày 20 hàng tháng khi số dư đạt tối thiểu 200,000 đ.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Thông tin tài khoản ngân hàng thụ hưởng <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={payoutBankInfo}
              onChange={e => setPayoutBankInfo(e.target.value)}
              placeholder="VD: MB Bank - STK: 0988889999 - CHỦ TK: LE THANG"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 font-semibold focus:ring-1 focus:ring-purple-500"
            />
            <span className="text-[11px] text-slate-400">
              Vui lòng nhập chính xác Tên Ngân Hàng, Số Tài Khoản và Tên Chủ Tài Khoản (không dấu).
            </span>
          </div>

          {/* Action Save Button */}
          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="button"
              onClick={handleSaveProfile}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm shadow-sm transition-all"
            >
              <Save className="w-4 h-4" />
              Lưu Toàn Bộ Cấu Hình Tác Giả
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DesignerSettingsView;
