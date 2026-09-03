import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';

interface AdminSettingsPanelProps {
  onShowToast: (message: string) => void;
}

export const AdminSettingsPanel: React.FC<AdminSettingsPanelProps> = ({
  onShowToast,
}) => {
  const { language } = useLanguage();
  const isVi = language === 'vi';

  const [workshopName, setWorkshopName] = useState('VCUBE 3D Fabrication Studio');
  const [workshopAddress, setWorkshopAddress] = useState('Khu Công Nghệ Cao TP. Thủ Đức, TP. Hồ Chí Minh');
  const [taxCode, setTaxCode] = useState('0318924011');
  const [autoInvoice, setAutoInvoice] = useState(true);
  const [telemetryLogging, setTelemetryLogging] = useState(true);

  const handleSave = () => {
    onShowToast(isVi ? 'Đã lưu cấu hình cài đặt xưởng in!' : 'Saved workshop settings!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-[#C5C6CD] p-5 sm:p-6 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-[#57DFFE]/20 text-[#00687A] font-tech text-[10px] font-bold rounded border border-[#57DFFE]/40 uppercase tracking-widest">
              WORKSHOP SYSTEM SETTINGS
            </span>
            <span className="text-xs text-[#545F73]">Cấu hình pháp lý, đơn vị đo & telemetry</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-[#091426] mt-1 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#00687A]">settings</span>
            {isVi ? 'Cài Đặt Hệ Thống Xưởng In VCUBE' : 'Workshop System & Operation Settings'}
          </h2>
          <p className="text-xs text-[#545F73] mt-0.5">
            Quản lý thông tin pháp nhân xưởng, mẫu xuất hóa đơn VAT, tiêu chuẩn đo lường và nhật ký giám sát máy.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="px-4 py-2 bg-[#00687A] hover:bg-[#005463] text-white text-xs font-bold uppercase rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
        >
          <span className="material-symbols-outlined text-sm">save</span>
          {isVi ? 'Lưu Cài Đặt' : 'Save Settings'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Workshop Profile */}
        <div className="bg-white border border-[#C5C6CD] rounded-xl p-5 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-[#091426] flex items-center gap-2 border-b border-[#C5C6CD] pb-3">
            <span className="material-symbols-outlined text-[#00687A]">domain</span>
            {isVi ? 'Thông Tin Pháp Nhân Xưởng In' : 'Workshop Profile'}
          </h3>

          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-[#091426]">Tên cơ sở gia công / Công ty</label>
              <input
                type="text"
                value={workshopName}
                onChange={(e) => setWorkshopName(e.target.value)}
                className="w-full p-2.5 border border-[#C5C6CD] rounded-lg text-xs font-bold"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-[#091426]">Mã số thuế doanh nghiệp (MST)</label>
              <input
                type="text"
                value={taxCode}
                onChange={(e) => setTaxCode(e.target.value)}
                className="w-full p-2.5 border border-[#C5C6CD] rounded-lg text-xs font-tech"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-[#091426]">Địa chỉ xưởng sản xuất</label>
              <input
                type="text"
                value={workshopAddress}
                onChange={(e) => setWorkshopAddress(e.target.value)}
                className="w-full p-2.5 border border-[#C5C6CD] rounded-lg text-xs"
              />
            </div>
          </div>
        </div>

        {/* Operational Policies & Units */}
        <div className="bg-white border border-[#C5C6CD] rounded-xl p-5 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-[#091426] flex items-center gap-2 border-b border-[#C5C6CD] pb-3">
            <span className="material-symbols-outlined text-[#00687A]">tune</span>
            {isVi ? 'Tiêu Chuẩn Đơn Vị & Tự Động Hóa' : 'Automation & Standards'}
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 bg-[#F8F9FF] rounded-lg border border-[#C5C6CD]/60">
              <div>
                <p className="font-bold text-[#091426]">Tự Động Xuất Hóa Đơn Điện Tử</p>
                <p className="text-[11px] text-[#545F73]">Tự động tạo file PDF invoice khi đơn hoàn tất bước 8</p>
              </div>
              <input
                type="checkbox"
                checked={autoInvoice}
                onChange={(e) => setAutoInvoice(e.target.checked)}
                className="w-4 h-4 text-[#00687A] rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-[#F8F9FF] rounded-lg border border-[#C5C6CD]/60">
              <div>
                <p className="font-bold text-[#091426]">Ghi Log Telemetry Đội Máy In</p>
                <p className="text-[11px] text-[#545F73]">Lưu trữ nhiệt độ đầu phun & tốc độ in vào máy chủ</p>
              </div>
              <input
                type="checkbox"
                checked={telemetryLogging}
                onChange={(e) => setTelemetryLogging(e.target.checked)}
                className="w-4 h-4 text-[#00687A] rounded cursor-pointer"
              />
            </div>

            <div className="p-3 bg-[#FAFBFD] rounded-lg border border-[#CBD5E1] space-y-1 text-xs font-tech">
              <div className="flex justify-between">
                <span className="font-sans text-[#545F73]">Đơn vị chiều dài:</span>
                <span className="font-bold text-[#091426]">Milimet (mm)</span>
              </div>
              <div className="flex justify-between">
                <span className="font-sans text-[#545F73]">Đơn vị trọng lượng:</span>
                <span className="font-bold text-[#091426]">Gram (g)</span>
              </div>
              <div className="flex justify-between">
                <span className="font-sans text-[#545F73]">Đơn vị tiền tệ:</span>
                <span className="font-bold text-[#00687A]">Việt Nam Đồng (VNĐ)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
