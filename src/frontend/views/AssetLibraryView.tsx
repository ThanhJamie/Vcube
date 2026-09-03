import React, { useState } from 'react';
import { DigitalAsset } from '../types';
import { ThreeModelViewer } from '../components/ThreeModelViewer';

interface AssetLibraryViewProps {
  assets: DigitalAsset[];
  onNavigate: (screen: string, payload?: any) => void;
  onShowToast: (message: string) => void;
}

export const AssetLibraryView: React.FC<AssetLibraryViewProps> = ({
  assets,
  onNavigate,
  onShowToast
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('all');
  const [previewAsset, setPreviewAsset] = useState<DigitalAsset | null>(null);

  const filteredAssets = assets.filter((asset) => {
    if (selectedFormat !== 'all' && asset.format !== selectedFormat) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchName = asset.name.toLowerCase().includes(q);
      const matchDesigner = asset.designer.toLowerCase().includes(q);
      if (!matchName && !matchDesigner) return false;
    }
    return true;
  });

  const handleDownloadFile = (asset: DigitalAsset) => {
    onShowToast(`Bắt đầu tải xuống file ${asset.name} (${asset.format} - ${asset.fileSize})...`);
  };

  return (
    <div className="min-h-screen bg-[#F7F6F2] text-[#1C1C1C] py-6 sm:py-10 px-4 sm:px-6 md:px-12">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Title */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6 pb-6 border-b border-black/10">
          <div>
            <span className="font-sans text-[9px] sm:text-[10px] uppercase tracking-[0.25em] sm:tracking-[0.3em] text-[#A69C8A] block mb-1">
              Vault // VCUBE Licensed Repository
            </span>
            <h1 className="fluid-h1 text-[#1C1C1C]">
              Thư Viện Bản Vẽ Kỹ Thuật Số
            </h1>
            <p className="text-xs sm:text-sm text-[#7D7565] mt-1 font-serif">
              Tất cả các file 3D (STL, STEP, 3MF) đã sở hữu bản quyền. Tải về không giới hạn số lần và tự động cập nhật bản sửa đổi.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-64 font-sans">
              <input
                type="text"
                placeholder="Tìm file theo tên..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-white border border-black/15 text-xs text-[#1C1C1C] focus:outline-none focus:border-black font-sans"
              />
              <span className="material-symbols-outlined absolute left-2.5 top-2.5 text-[#7D7565] text-base">
                search
              </span>
            </div>
          </div>
        </div>

        {/* Format Badges */}
        <div className="flex items-center gap-2 font-sans overflow-x-auto pb-1">
          {['all', 'STL', '3MF', 'STEP'].map((fmt) => (
            <button
              key={fmt}
              onClick={() => setSelectedFormat(fmt)}
              className={`px-3.5 sm:px-4 py-2 text-[10px] uppercase tracking-widest font-bold whitespace-nowrap transition-colors border touch-target-btn ${
                selectedFormat === fmt
                  ? 'bg-[#1C1C1C] text-white border-[#1C1C1C]'
                  : 'bg-white text-[#7D7565] hover:text-[#1C1C1C] border-black/10'
              }`}
            >
              {fmt === 'all' ? 'Tất Cả Định Dạng' : fmt}
            </button>
          ))}
        </div>

        {/* Assets Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {filteredAssets.map((asset) => (
            <div
              key={asset.id}
              className="bg-white border border-black/10 hover:border-black/30 transition-all flex flex-col justify-between p-4 sm:p-5 space-y-4"
            >
              <div>
                <div className="relative responsive-aspect-frame bg-[#1C1C1C] overflow-hidden mb-3">
                  <img src={asset.image} alt={asset.name} className="responsive-img-cover" />
                  <span className="absolute top-2.5 left-2.5 bg-[#1C1C1C] text-white text-[9px] font-tech font-bold px-2 py-0.5 shadow-sm">
                    {asset.format}
                  </span>
                  {asset.hasUpdate && (
                    <span className="absolute top-2.5 right-2.5 bg-white text-[#1C1C1C] text-[8px] font-sans font-bold uppercase tracking-wider px-2 py-0.5 border border-black/20">
                      Update v2
                    </span>
                  )}
                  <button
                    onClick={() => setPreviewAsset(asset)}
                    className="absolute bottom-2.5 right-2.5 bg-black/70 hover:bg-black text-white text-[9px] font-sans uppercase tracking-wider px-2.5 py-1 flex items-center gap-1 touch-target-btn"
                  >
                    <span className="material-symbols-outlined text-xs">view_in_ar</span>
                    Xem 3D
                  </button>
                </div>

                <div className="space-y-1 font-sans">
                  <div className="flex items-center justify-between text-[10px] text-[#7D7565] font-tech">
                    <span>{asset.designer}</span>
                    <span>{asset.version}</span>
                  </div>
                  <h3 className="font-serif font-bold text-sm text-[#1C1C1C] line-clamp-2">{asset.name}</h3>
                </div>

                <div className="mt-3 pt-3 border-t border-black/10 flex items-center justify-between text-[10px] font-tech text-[#7D7565]">
                  <span>Dung lượng: {asset.fileSize}</span>
                  <span>{asset.downloadsCount} lượt tải</span>
                </div>
              </div>

              <div className="space-y-2 pt-3 border-t border-black/10 font-sans">
                <button
                  onClick={() => handleDownloadFile(asset)}
                  className="w-full py-2.5 bg-[#1C1C1C] hover:bg-[#333] text-white text-[10px] uppercase tracking-widest font-bold transition-colors flex items-center justify-center gap-1.5 touch-target-btn"
                >
                  <span className="material-symbols-outlined text-sm">download</span>
                  Tải Về Ngay
                </button>

                <button
                  onClick={() => onNavigate('tool_3d')}
                  className="w-full py-2 border border-black/15 hover:bg-black/5 text-[#1C1C1C] text-[10px] uppercase tracking-widest font-bold transition-colors touch-target-btn"
                >
                  Báo Giá Gia Công
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* 3D Quick Inspect Modal */}
        {previewAsset && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-3 sm:p-6">
            <div className="bg-[#1C1C1C] border border-white/20 w-full max-w-2xl overflow-hidden shadow-2xl space-y-4 p-5 sm:p-8 text-white">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h3 className="font-serif font-bold text-base sm:text-lg text-white">{previewAsset.name}</h3>
                  <p className="text-xs text-[#D5CFC5] font-sans">{previewAsset.format} Model • {previewAsset.version}</p>
                </div>
                <button
                  onClick={() => setPreviewAsset(null)}
                  className="p-1 hover:bg-white/10 text-white/70 hover:text-white touch-target-btn"
                  aria-label="Đóng xem trước"
                >
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              </div>

              <div className="bg-[#111] p-2 border border-white/10">
                <ThreeModelViewer
                  modelType={previewAsset.model3DType || 'gear'}
                  color="#E0DDD5"
                  className="h-[260px] sm:h-[340px] lg:h-[360px] w-full"
                />
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-3 font-sans">
                <button
                  onClick={() => setPreviewAsset(null)}
                  className="px-5 py-2.5 border border-white/20 hover:bg-white/10 text-white text-[10px] uppercase tracking-widest font-bold touch-target-btn"
                >
                  Đóng
                </button>
                <button
                  onClick={() => {
                    handleDownloadFile(previewAsset);
                    setPreviewAsset(null);
                  }}
                  className="px-6 py-2.5 bg-white text-[#1C1C1C] hover:bg-[#E0DDD5] text-[10px] uppercase tracking-widest font-bold flex items-center justify-center gap-1.5 touch-target-btn"
                >
                  <span className="material-symbols-outlined text-sm">download</span>
                  Tải Tập Tin {previewAsset.format}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
