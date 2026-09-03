import React, { useState } from 'react';
import { DesignerApplication } from '../types';

interface DesignerRegisterViewProps {
  onNavigate: (screen: string, payload?: any) => void;
  onShowToast: (message: string) => void;
  onAddApplication?: (app: DesignerApplication) => void;
}

export const DesignerRegisterView: React.FC<DesignerRegisterViewProps> = ({
  onNavigate,
  onShowToast,
  onAddApplication
}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [studioName, setStudioName] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [bio, setBio] = useState('');
  const [selectedSoftware, setSelectedSoftware] = useState<string[]>(['SolidWorks', 'Fusion 360']);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const SOFTWARE_OPTIONS = [
    'Blender',
    'SolidWorks',
    'Fusion 360',
    'AutoCAD',
    'ZBrush',
    'Rhino / Grasshopper'
  ];

  const handleToggleSoftware = (software: string) => {
    if (selectedSoftware.includes(software)) {
      setSelectedSoftware(selectedSoftware.filter(s => s !== software));
    } else {
      setSelectedSoftware([...selectedSoftware, software]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreedTerms) {
      onShowToast('Vui lòng đồng ý với Điều khoản Dịch vụ và Bản quyền');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const newApp: DesignerApplication = {
        id: `app-${Date.now()}`,
        name: studioName || `${firstName} ${lastName}`.trim() || 'Kỹ sư Thiết Kế',
        role: 'Kỹ sư cơ khí / Chuyên gia mô hình CAD',
        status: 'Pending',
        portfolioUrl: portfolioUrl || 'https://vcube.vn/portfolio',
        software: selectedSoftware,
        bio: bio || 'Chuyên gia thiết kế mô hình 3D và linh kiện kỹ thuật.',
        submissionDate: new Date().toLocaleDateString('vi-VN')
      };

      if (onAddApplication) onAddApplication(newApp);
      setIsSubmitting(false);
      onShowToast('Đã gửi hồ sơ đăng ký Tác Giả thành công! Ban kiểm duyệt VCUBE sẽ phản hồi trong 24h.');
      onNavigate('designer');
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FF] text-[#0B1C30] font-sans flex flex-col">
      {/* Top Wizard Sub-header */}
      <div className="bg-white border-b border-[#C5C6CD] py-3 px-4 sm:px-6 md:px-12 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#00687A] text-xl">hexagon</span>
          <span className="font-bold text-sm text-[#091426] tracking-tight">VCUBE Creator Network</span>
        </div>
        <button
          onClick={() => onNavigate('home')}
          className="text-xs text-[#545F73] hover:text-[#00687A] font-bold flex items-center gap-1 transition-colors touch-target-btn"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Quay lại Trang Chủ
        </button>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Left Column: Hero & Value Prop */}
        <div className="lg:w-1/2 bg-[#091426] text-white p-6 sm:p-10 md:p-14 flex flex-col justify-center relative overflow-hidden">
          <div className="max-w-xl mx-auto space-y-6">
            <span className="px-2 py-1 bg-[#57DFFE]/20 text-[#57DFFE] border border-[#57DFFE]/40 text-[10px] font-tech font-bold uppercase rounded">
              Gia Nhập Mạng Lưới Kỹ Sư Chế Tác
            </span>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight text-white">
              Kiếm Doanh Thu Từ Bản Vẽ <span className="text-[#57DFFE]">CAD & File 3D</span>
            </h1>
            <p className="text-sm text-[#BCC7DE] leading-relaxed font-serif">
              Tải lên các file STL, STEP chính xác cao, tiếp cận hàng nghìn khách hàng doanh nghiệp và nhận hoa hồng trên từng sản phẩm xuất xưởng tại xưởng in 3D VCUBE.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[#1E293B]">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded bg-[#1E293B] border border-[#545F73] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[#57DFFE]">payments</span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase">90% Doanh Thu File Số</h4>
                  <p className="text-[11px] text-[#BCC7DE]">Tự đặt giá bán và nhận thanh toán tự động hàng tháng.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded bg-[#1E293B] border border-[#545F73] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[#57DFFE]">precision_manufacturing</span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase">Hoa Hồng In Vật Lý</h4>
                  <p className="text-[11px] text-[#BCC7DE]">10% hoa hồng trọn đời trên mỗi đơn gia công hoàn thiện.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded bg-[#1E293B] border border-[#545F73] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[#57DFFE]">verified</span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase">Huy Hiệu Verified Creator</h4>
                  <p className="text-[11px] text-[#BCC7DE]">Xác nhận chuyên gia kỹ thuật và bảo hộ bản quyền.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded bg-[#1E293B] border border-[#545F73] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[#57DFFE]">chat</span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase">Nhận Dự Án CAD Riêng</h4>
                  <p className="text-[11px] text-[#BCC7DE]">Kênh chat và xuất báo giá tùy chỉnh trực tiếp cho khách hàng.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Application Form */}
        <div className="lg:w-1/2 bg-white p-6 sm:p-10 md:p-14 flex items-center justify-center">
          <form onSubmit={handleSubmit} className="w-full max-w-lg space-y-6">
            <div>
              <h2 className="text-xl font-bold text-[#091426]">Đăng Ký Hồ Sơ Tác Giả (Creator)</h2>
              <p className="text-xs text-[#545F73] mt-1">Hoàn thiện thông tin để ban kiểm định duyệt hồ sơ trong 24 giờ.</p>
            </div>

            {/* Name Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-[#091426] block mb-1">Họ & Tên Đệm:</label>
                <input
                  type="text"
                  required
                  placeholder="Nguyễn Văn"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#CBD5E1] p-2.5 text-xs rounded focus:outline-none focus:border-[#00687A]"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-[#091426] block mb-1">Tên:</label>
                <input
                  type="text"
                  required
                  placeholder="Minh"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#CBD5E1] p-2.5 text-xs rounded focus:outline-none focus:border-[#00687A]"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-[#091426] block mb-1">Tên Studio / Nghệ Danh Tác Giả:</label>
              <input
                type="text"
                required
                placeholder="VD: Vanguard Robotics Lab"
                value={studioName}
                onChange={(e) => setStudioName(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-[#CBD5E1] p-2.5 text-xs rounded focus:outline-none focus:border-[#00687A]"
              />
              <span className="text-[10px] text-[#75777D] font-tech mt-1 block">Tên này sẽ hiển thị công khai trên gian hàng bản vẽ</span>
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-[#091426] block mb-1">Liên Kết Portfolio / Behance / ArtStation / GrabCAD:</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-2.5 top-2 text-[#75777D] text-base">link</span>
                <input
                  type="url"
                  placeholder="https://grabcad.com/library/..."
                  value={portfolioUrl}
                  onChange={(e) => setPortfolioUrl(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#CBD5E1] pl-8 p-2.5 text-xs rounded focus:outline-none focus:border-[#00687A]"
                />
              </div>
            </div>

            {/* Software Proficiency */}
            <div>
              <label className="text-[10px] uppercase font-bold text-[#091426] block mb-2">Phần Mềm 3D / CAD Thành Thạo:</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {SOFTWARE_OPTIONS.map(soft => (
                  <label key={soft} className="flex items-center gap-2 p-2 border border-[#CBD5E1] rounded cursor-pointer hover:bg-[#F8FAFC] text-xs">
                    <input
                      type="checkbox"
                      checked={selectedSoftware.includes(soft)}
                      onChange={() => handleToggleSoftware(soft)}
                      className="w-4 h-4 accent-[#00687A]"
                    />
                    <span className="font-tech text-[11px]">{soft}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-[#091426] block mb-1">Giới Thiệu Kinh Nghiệm & Chuyên Môn:</label>
              <textarea
                rows={3}
                placeholder="Mô tả các lĩnh vực thế mạnh của bạn: đồ gá cơ khí, mô hình kiến trúc, linh kiện drone, vỏ hộp vi mạch..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-[#CBD5E1] p-2.5 text-xs rounded focus:outline-none focus:border-[#00687A]"
              />
            </div>

            <div className="pt-2 border-t border-[#C5C6CD]">
              <label className="flex items-start gap-2 text-xs text-[#545F73] cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedTerms}
                  onChange={(e) => setAgreedTerms(e.target.checked)}
                  className="w-4 h-4 mt-0.5 accent-[#00687A]"
                />
                <span>
                  Tôi cam kết sở hữu đầy đủ quyền tác giả đối với các mô hình 3D đăng tải và tuân thủ Điều khoản bản quyền của VCUBE Vietnam.
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 bg-[#00687A] hover:bg-[#004E5C] text-white font-bold text-xs uppercase tracking-wider rounded transition-colors flex items-center justify-center gap-2 shadow-md touch-target-btn"
            >
              <span className="material-symbols-outlined text-base">send</span>
              {isSubmitting ? 'ĐANG GỬI HỒ SƠ...' : 'NỘP HỒ SƠ TÁC GIẢ'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
