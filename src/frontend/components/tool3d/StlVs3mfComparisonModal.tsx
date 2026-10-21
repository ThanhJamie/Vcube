import React from 'react';
import { Icon, Modal } from '@frontend/ui';

interface StlVs3mfComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StlVs3mfComparisonModal: React.FC<StlVs3mfComparisonModalProps> = ({ isOpen, onClose }) => {
  // W2-NEW-1 (StrictMode): luôn mount <Modal>, chỉ đổi prop `open`; không return null.
  const comparisonData = [
    {
      feature: 'Hình học lưới',
      stl: 'Hỗ trợ đầy đủ',
      threeMf: 'Hỗ trợ đầy đủ',
      stlAdv: false,
      note: 'Cả hai đều lưu tọa độ đỉnh và tam giác mesh'
    },
    {
      feature: 'Đơn vị đo chuẩn',
      stl: 'Không có (Dễ sai lệch mm / inch)',
      threeMf: 'Chuẩn hóa milimet / micron / inch',
      stlAdv: false,
      note: '3MF quy định đơn vị rõ ràng trong XML header'
    },
    {
      feature: 'Phân cấp nhiều chi tiết / đối tượng',
      stl: 'Hạn chế (1 mesh duy nhất hoặc vỏ rời rạc)',
      threeMf: 'Phân cấp Component & Assembly chuẩn',
      stlAdv: false,
      note: '3MF cho phép quản lý cụm lắp ghép nhiều chi tiết'
    },
    {
      feature: 'Màu sắc &amp; vật liệu theo chi tiết',
      stl: 'Không chuẩn (chỉ có Magics mở rộng riêng)',
      threeMf: 'Vật liệu nền, nhóm màu, màu theo mặt',
      stlAdv: false,
      note: '3MF hỗ trợ in nhiều màu qua Bambu AMS / Prusa MMU'
    },
    {
      feature: 'Nhiều loại vật liệu',
      stl: 'Không hỗ trợ',
      threeMf: 'Hỗ trợ gắn vật liệu riêng từng part',
      stlAdv: false,
      note: 'Kết hợp PLA + TPU hoặc PETG + vật liệu đỡ PVA'
    },
    {
      feature: 'Thông số cắt lớp &amp; cài đặt in',
      stl: 'Không có',
      threeMf: 'Lưu cấu hình độ đặc, lớp in, vật liệu đỡ',
      stlAdv: false,
      note: 'Đồng bộ trực tiếp từ PrusaSlicer, Bambu Studio'
    },
    {
      feature: 'Siêu dữ liệu &amp; bản quyền tác giả',
      stl: 'Rất ít (chỉ header binary thô sơ)',
      threeMf: 'Tên, tác giả, giấy phép, thiết bị',
      stlAdv: false,
      note: 'Định dạng container nén chuẩn 3MF Consortium'
    }
  ];

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      size="xl"
      showCloseButton={false}
      title={
        <span>
          <span className="font-mono text-xs uppercase tracking-widest text-primary font-bold block mb-1">
            TIÊU CHUẨN SẢN XUẤT BỒI ĐẮP // SO SÁNH 3MF VÀ STL
          </span>
          <span className="block font-sans font-bold text-lg sm:text-xl text-fg">
            So sánh kỹ thuật: định dạng STL &amp; 3MF
          </span>
        </span>
      }
    >
        {/* Content Table */}
        <div className="p-5 sm:p-6 space-y-4">
          <p className="text-xs text-fg-muted leading-relaxed">
            <strong className="text-fg">3MF (định dạng sản xuất 3D)</strong> là định dạng chuẩn mở được phát triển bởi 
            <em className="text-primary font-semibold"> 3MF Consortium</em> (gồm Microsoft, Autodesk, HP, Prusa, Bambu Lab). 
            VCUBE khuyến nghị sử dụng 3MF để đảm bảo độ chính xác kích thước và giữ nguyên cấu hình đa màu sắc.
          </p>

          {/* 390: bảng 600px trong modal bị cắt — dưới md render danh sách card cùng dữ liệu. */}
          <div className="space-y-2 md:hidden">
            {comparisonData.map((row, idx) => (
              <div key={idx} className="rounded-md border border-line bg-surface p-3 space-y-1.5">
                <div>
                  <div className="break-words text-sm font-semibold text-fg">{row.feature}</div>
                  <div className="mt-0.5 break-words text-xs font-normal text-fg-muted">{row.note}</div>
                </div>
                <div className="grid grid-cols-1 gap-1.5 text-xs">
                  <div className="rounded-sm bg-surface-muted p-2">
                    <span className="block font-mono text-xs font-bold uppercase tracking-wider text-fg-muted">STL</span>
                    <span className="break-words text-fg-muted">{row.stl}</span>
                  </div>
                  <div className="rounded-sm bg-primary-tint p-2">
                    <span className="block font-mono text-xs font-bold uppercase tracking-wider text-fg">3MF — khuyên dùng</span>
                    <span className="break-words font-semibold text-fg">{row.threeMf}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden rounded-lg border border-line overflow-x-auto md:block">
            <table className="w-full text-left text-sm font-sans">
              <thead className="bg-surface-muted text-fg-subtle text-xs uppercase tracking-wider">
                <tr>
                  <th className="h-10 px-4 text-left font-semibold">Tính năng / Khả năng</th>
                  <th className="h-10 px-4 w-32 sm:w-40 text-left font-semibold">Tệp STL</th>
                  <th className="h-10 px-4 w-40 sm:w-52 text-left font-semibold bg-primary-tint text-fg">Tệp 3MF (khuyên dùng)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-subtle">
                {comparisonData.map((row, idx) => (
                  <tr key={idx} className="border-t border-line-subtle hover:bg-surface-muted/60">
                    <td className="px-4 py-3 font-semibold text-fg">
                      <div>{row.feature}</div>
                      <div className="text-xs text-fg-muted font-normal mt-0.5">{row.note}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-fg-muted text-xs">{row.stl}</td>
                    <td className="px-4 py-3 font-mono font-semibold text-fg bg-primary-tint text-xs">
                      {row.threeMf}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Slicer & Backend Architecture Note */}
          <div className="bg-info-tint border border-info/20 p-4 rounded-lg text-xs space-y-1.5">
            <div className="font-bold text-info flex items-center gap-1.5">
              <Icon name="info" size={18} />
              Quy trình chuẩn hoá tại xưởng VCUBE:
            </div>
            <p className="text-fg-muted leading-relaxed">
              VCUBE <strong>không</strong> chạy PrusaSlicer trên máy chủ và không tự đổi tệp của bạn sang
              <strong> normalized.3mf</strong>. Tệp STL / 3MF / OBJ / STEP được đọc và đo trực tiếp ngay
              trên trình duyệt (Web Worker + nhân CAD WebAssembly): thể tích, diện tích bề mặt, số tam
              giác và kiểm tra lưới. Các chỉ số thành mỏng/góc nhô chỉ hiện khi đo được từ chính tệp bạn
              tải lên — không suy diễn.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-line bg-surface-muted flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="h-10 max-md:min-h-11 px-4 bg-primary hover:bg-primary-hover text-primary-fg text-sm font-semibold rounded-md transition-colors shadow-e1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Đã hiểu tiêu chuẩn 3MF
          </button>
        </div>
    </Modal>
  );
};
