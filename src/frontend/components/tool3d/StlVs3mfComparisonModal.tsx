import React from 'react';
import { Icon, Modal } from '@frontend/ui';

interface StlVs3mfComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StlVs3mfComparisonModal: React.FC<StlVs3mfComparisonModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const comparisonData = [
    {
      feature: 'Hình học mesh (Geometry Mesh)',
      stl: 'Hỗ trợ đầy đủ',
      threeMf: 'Hỗ trợ đầy đủ',
      stlAdv: false,
      note: 'Cả hai đều lưu tọa độ đỉnh và tam giác mesh'
    },
    {
      feature: 'Đơn vị đo chuẩn (Unit Measurement)',
      stl: 'Không có (Dễ sai lệch mm / inch)',
      threeMf: 'Chuẩn hóa milimet / micron / inch',
      stlAdv: false,
      note: '3MF quy định đơn vị rõ ràng trong XML header'
    },
    {
      feature: 'Phân cấp nhiều Part / Object (Multi-body)',
      stl: 'Hạn chế (1 mesh duy nhất hoặc vỏ rời rạc)',
      threeMf: 'Phân cấp Component & Assembly chuẩn',
      stlAdv: false,
      note: '3MF cho phép quản lý cụm lắp ghép nhiều chi tiết'
    },
    {
      feature: 'Màu sắc & Vật liệu theo chi tiết (Multi-color)',
      stl: 'Không chuẩn (chỉ có Magics mở rộng riêng)',
      threeMf: 'Base Material, Color groups, Face color',
      stlAdv: false,
      note: '3MF hỗ trợ in nhiều màu qua Bambu AMS / Prusa MMU'
    },
    {
      feature: 'Nhiều loại vật liệu (Multi-material)',
      stl: 'Không hỗ trợ',
      threeMf: 'Hỗ trợ gắn vật liệu riêng từng part',
      stlAdv: false,
      note: 'Kết hợp PLA + TPU hoặc PETG + Support PVA'
    },
    {
      feature: 'Thông số Slicer & Print Settings',
      stl: 'Không có',
      threeMf: 'Lưu cấu hình Infill, Layer, Support',
      stlAdv: false,
      note: 'Đồng bộ trực tiếp từ PrusaSlicer, Bambu Studio'
    },
    {
      feature: 'Metadata & Bản quyền tác giả',
      stl: 'Rất ít (chỉ header binary thô sơ)',
      threeMf: 'Tên, Tác giả, License, Thiết bị',
      stlAdv: false,
      note: 'Định dạng container nén chuẩn 3MF Consortium'
    }
  ];

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      showCloseButton={false}
      title={
        <span>
          <span className="font-mono text-xs uppercase tracking-widest text-primary font-bold block mb-1">
            Tiêu Chuẩn Sản Xuất Bồi Đắp // 3MF vs STL Benchmark
          </span>
          <span className="block font-sans font-bold text-lg sm:text-xl text-fg">
            So Sánh Kỹ Thuật: Định Dạng STL &amp; 3MF
          </span>
        </span>
      }
    >
        {/* Content Table */}
        <div className="p-5 sm:p-6 space-y-4">
          <p className="text-xs text-fg-muted leading-relaxed">
            <strong className="text-fg">3MF (3D Manufacturing Format)</strong> là định dạng chuẩn mở được phát triển bởi 
            <em className="text-primary font-semibold"> 3MF Consortium</em> (gồm Microsoft, Autodesk, HP, Prusa, Bambu Lab). 
            VCUBE khuyến nghị sử dụng 3MF để đảm bảo độ chính xác kích thước và giữ nguyên cấu hình đa màu sắc.
          </p>

          <div className="border border-line-subtle rounded-sm overflow-hidden">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-surface-inverse text-on-inverse text-xs uppercase tracking-wider">
                <tr>
                  <th className="p-3">Tính Năng / Khả Năng</th>
                  <th className="p-3 w-32 sm:w-40 text-fg-subtle">File STL</th>
                  <th className="p-3 w-40 sm:w-52 text-primary-fg bg-primary">File 3MF (Khuyên dùng)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-subtle">
                {comparisonData.map((row, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-surface' : 'bg-surface-muted/60'}>
                    <td className="p-3 font-semibold text-fg">
                      <div>{row.feature}</div>
                      <div className="text-xs text-fg-muted font-normal mt-0.5">{row.note}</div>
                    </td>
                    <td className="p-3 font-tech text-fg-muted text-xs">{row.stl}</td>
                    <td className="p-3 font-tech font-bold text-primary bg-primary-tint/50 text-xs">
                      {row.threeMf}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Slicer & Backend Architecture Note */}
          <div className="bg-info/10 border border-info/30 p-4 rounded-sm text-xs space-y-1.5">
            <div className="font-bold text-info flex items-center gap-1.5">
              <Icon name="info" size={18} />
              Quy trình chuẩn hóa tại VCUBE Workshop:
            </div>
            <p className="text-fg-muted leading-relaxed">
              VCUBE <strong>không</strong> chạy PrusaSlicer trên máy chủ và không tự đổi tệp của bạn sang
              <strong> normalized.3mf</strong>. Tệp STL / 3MF / OBJ / STEP được đọc và đo trực tiếp ngay
              trên trình duyệt (Web Worker + nhân CAD WebAssembly): thể tích, diện tích bề mặt, số tam
              giác và kiểm tra lưới. Các chỉ số thin-wall/overhang chỉ hiện khi đo được từ chính tệp bạn
              tải lên — không suy diễn.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-line bg-canvas flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-surface-inverse hover:bg-surface-inverse-raised text-on-inverse text-xs font-mono uppercase tracking-wider font-bold rounded-lg transition-colors shadow-e1 cursor-pointer"
          >
            Đã Hiểu Tiêu Chuẩn 3MF
          </button>
        </div>
    </Modal>
  );
};
