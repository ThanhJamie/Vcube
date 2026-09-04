import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface StlVs3mfComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StlVs3mfComparisonModal: React.FC<StlVs3mfComparisonModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const comparisonData = [
    {
      feature: 'Hình học mesh (Geometry Mesh)',
      stl: '✅ Hỗ trợ đầy đủ',
      threeMf: '✅ Hỗ trợ đầy đủ',
      stlAdv: false,
      note: 'Cả hai đều lưu tọa độ đỉnh và tam giác mesh'
    },
    {
      feature: 'Đơn vị đo chuẩn (Unit Measurement)',
      stl: '❌ Không có (Dễ sai lệch mm / inch)',
      threeMf: '✅ Chuẩn hóa milimet / micron / inch',
      stlAdv: false,
      note: '3MF quy định đơn vị rõ ràng trong XML header'
    },
    {
      feature: 'Phân cấp nhiều Part / Object (Multi-body)',
      stl: '❌ Hạn chế (1 mesh duy nhất hoặc vỏ rời rạc)',
      threeMf: '✅ Phân cấp Component & Assembly chuẩn',
      stlAdv: false,
      note: '3MF cho phép quản lý cụm lắp ghép nhiều chi tiết'
    },
    {
      feature: 'Màu sắc & Vật liệu theo chi tiết (Multi-color)',
      stl: '❌ Không chuẩn (chỉ có Magics mở rộng riêng)',
      threeMf: '✅ Base Material, Color groups, Face color',
      stlAdv: false,
      note: '3MF hỗ trợ in nhiều màu qua Bambu AMS / Prusa MMU'
    },
    {
      feature: 'Nhiều loại vật liệu (Multi-material)',
      stl: '❌ Không hỗ trợ',
      threeMf: '✅ Hỗ trợ gắn vật liệu riêng từng part',
      stlAdv: false,
      note: 'Kết hợp PLA + TPU hoặc PETG + Support PVA'
    },
    {
      feature: 'Thông số Slicer & Print Settings',
      stl: '❌ Không có',
      threeMf: '✅ Lưu cấu hình Infill, Layer, Support',
      stlAdv: false,
      note: 'Đồng bộ trực tiếp từ PrusaSlicer, Bambu Studio'
    },
    {
      feature: 'Metadata & Bản quyền tác giả',
      stl: '❌ Rất ít (chỉ header binary thô sơ)',
      threeMf: '✅ Tên, Tác giả, License, Thiết bị',
      stlAdv: false,
      note: 'Định dạng container nén chuẩn 3MF Consortium'
    }
  ];

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white border border-[#CBD5E1] rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden my-auto">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-[#CBD5E1] flex items-center justify-between bg-[#F8FAFC] shrink-0">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-widest text-[#00687A] font-bold block mb-1">
              Tiêu Chuẩn Sản Xuất Bồi Đắp // 3MF vs STL Benchmark
            </span>
            <h2 className="font-sans font-bold text-lg sm:text-xl text-[#091426]">
              So Sánh Kỹ Thuật: Định Dạng STL & 3MF
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200 text-[#64748B] hover:text-[#091426] transition-colors rounded-xl cursor-pointer"
            title="Đóng (ESC)"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Content Table */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
          <p className="text-xs text-[#5A554C] leading-relaxed">
            <strong className="text-[#1C1C1C]">3MF (3D Manufacturing Format)</strong> là định dạng chuẩn mở được phát triển bởi 
            <em className="text-[#00687a] font-semibold"> 3MF Consortium</em> (gồm Microsoft, Autodesk, HP, Prusa, Bambu Lab). 
            VCUBE khuyến nghị sử dụng 3MF để đảm bảo độ chính xác kích thước và giữ nguyên cấu hình đa màu sắc.
          </p>

          <div className="border border-black/10 rounded overflow-hidden">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-[#1C1C1C] text-white text-[10px] uppercase tracking-wider">
                <tr>
                  <th className="p-3">Tính Năng / Khả Năng</th>
                  <th className="p-3 w-32 sm:w-40 text-slate-300">File STL</th>
                  <th className="p-3 w-40 sm:w-52 text-cyan-300 bg-[#00687a]">File 3MF (Khuyên dùng)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/10">
                {comparisonData.map((row, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#F7F6F2]/60'}>
                    <td className="p-3 font-semibold text-[#1C1C1C]">
                      <div>{row.feature}</div>
                      <div className="text-[10px] text-[#7D7565] font-normal mt-0.5">{row.note}</div>
                    </td>
                    <td className="p-3 font-tech text-[#5A554C] text-[11px]">{row.stl}</td>
                    <td className="p-3 font-tech font-bold text-[#00687a] bg-cyan-50/50 text-[11px]">
                      {row.threeMf}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Slicer & Backend Architecture Note */}
          <div className="bg-[#F0F7FF] border border-[#B8D5FF] p-4 rounded text-xs space-y-1.5">
            <div className="font-bold text-[#004B87] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base">info</span>
              Quy trình chuẩn hóa tại VCUBE Workshop:
            </div>
            <p className="text-[#204060] leading-relaxed">
              Mọi file STL khi tải lên sẽ được quét kiểm tra đơn vị đo, sau đó hệ thống tự động chuẩn hóa sang định dạng 
              <strong> normalized.3mf</strong> và phân tích độ dày thành (thin-wall), góc nghiêng (overhang) bằng engine PrusaSlicer trước khi tạo mã G-code.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-[#CBD5E1] bg-[#F8FAFC] flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-[#091426] hover:bg-slate-800 text-white text-xs font-mono uppercase tracking-wider font-bold rounded-xl transition-all shadow-xs cursor-pointer"
          >
            Đã Hiểu Tiêu Chuẩn 3MF
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
