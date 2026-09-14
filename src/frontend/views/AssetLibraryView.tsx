import React, { useState } from 'react';
import { DigitalAsset } from '../types';
import { ThreeModelViewer } from '../components/ThreeModelViewer';
import { supabase } from '../../backend/supabase/client';
import { Icon } from '@frontend/ui';

interface AssetLibraryViewProps {
  assets: DigitalAsset[];
  onNavigate: (screen: string, payload?: any) => void;
  onShowToast: (message: string) => void;
}

/**
 * Tải file CAD đã mua.
 *
 * Bucket `cad-files` là PRIVATE (policy chỉ cho admin), nên phải đi qua
 * `createSignedUrl` — không thể dùng `getPublicUrl`.
 *
 * GIỚI HẠN ĐÃ BIẾT: hiện `DigitalAsset` không mang `storagePath`, và dữ liệu đơn
 * hàng (`orders.items`) cũng không lưu đường dẫn file. Không có bảng `order_files`
 * thì KHÔNG suy ra được vị trí object trong Storage — vì vậy ở đây KHÔNG bịa
 * đường dẫn và KHÔNG hiện link giả. Trạng thái là "chưa hỗ trợ tải trực tiếp".
 *
 * TODO(order_files): thêm bảng `order_files (order_id, product_id, storage_path,
 * license, created_at)` + policy SELECT cho người mua, map `storage_path` vào
 * `DigitalAsset.storagePath`, rồi hàm dưới sẽ chạy đúng như thiết kế.
 */
const CAD_BUCKET = 'cad-files';
const SIGNED_URL_TTL_SECONDS = 60;

export const AssetLibraryView: React.FC<AssetLibraryViewProps> = ({
  assets,
  onNavigate,
  onShowToast
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('all');
  const [previewAsset, setPreviewAsset] = useState<DigitalAsset | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

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

  /** true khi có đường dẫn Storage thật để cấp signed URL. */
  const canDownload = (asset: DigitalAsset): boolean =>
    typeof asset.storagePath === 'string' && asset.storagePath.trim().length > 0;

  const handleDownloadFile = async (asset: DigitalAsset) => {
    if (!canDownload(asset)) {
      // Không có đường dẫn thật ⇒ nói rõ, không tải giả, không toast "bắt đầu tải".
      onShowToast(
        `Chưa hỗ trợ tải trực tiếp cho "${asset.name}": hệ thống chưa lưu vị trí file trong kho. Vui lòng liên hệ hỗ trợ.`
      );
      return;
    }

    setDownloadingId(asset.id);
    try {
      const { data, error } = await supabase.storage
        .from(CAD_BUCKET)
        .createSignedUrl(asset.storagePath as string, SIGNED_URL_TTL_SECONDS);

      if (error || !data?.signedUrl) {
        onShowToast(`Không tạo được liên kết tải cho "${asset.name}": ${error?.message || 'không rõ nguyên nhân'}`);
        return;
      }

      const link = document.createElement('a');
      link.href = data.signedUrl;
      link.rel = 'noopener';
      link.download = asset.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      onShowToast(`Đã tạo liên kết tải (hiệu lực ${SIGNED_URL_TTL_SECONDS}s) cho "${asset.name}".`);
    } catch (err: any) {
      onShowToast(`Lỗi khi tải "${asset.name}": ${err?.message || 'không rõ nguyên nhân'}`);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-canvas text-fg py-6 sm:py-10 px-4 sm:px-6 md:px-12">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Title */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6 pb-6 border-b border-line">
          <div>
            <span className="font-mono text-xs uppercase tracking-widest text-fg-subtle block mb-1">
              Thư viện bản quyền kỹ thuật số
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-fg">
              Thư Viện File CAD Đã Sở Hữu
            </h1>
            <p className="text-xs sm:text-sm text-fg-muted mt-1">
              Danh sách file CAD thuộc quyền sử dụng của bạn theo từng đơn hàng đã mua.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-64 font-sans">
              <input
                type="text"
                placeholder="Tìm file theo tên..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-surface border border-line-control rounded-lg text-xs text-fg focus:outline-none focus:border-primary"
                aria-label="Tìm file theo tên"
              />
              <Icon name="search" size={18} className="absolute left-2.5 top-2.5 text-fg-muted" />
            </div>
          </div>
        </div>

        {/* Download availability notice — honest about the current limitation */}
        <div className="bg-warning-tint border border-warning/30 rounded-lg p-4 flex items-start gap-3 text-xs">
          <Icon name="info" size={24} className="text-warning shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-warning">Tải trực tiếp: chưa hỗ trợ</p>
            <p className="text-warning leading-relaxed">
              Hệ thống chưa lưu vị trí từng file trong kho lưu trữ, nên chưa thể cấp liên kết tải có chữ ký.
              Danh sách dưới đây là các bản quyền bạn đã mua. Vui lòng liên hệ hỗ trợ để nhận file trong thời gian này.
            </p>
          </div>
        </div>

        {/* Format Badges */}
        <div className="flex items-center gap-2 font-sans overflow-x-auto pb-1">
          {['all', 'STL', '3MF', 'STEP'].map((fmt) => (
            <button
              key={fmt}
              onClick={() => setSelectedFormat(fmt)}
              className={`px-3.5 sm:px-4 py-2 text-xs uppercase tracking-widest font-bold whitespace-nowrap transition-colors border rounded-full touch-target-btn cursor-pointer ${
                selectedFormat === fmt
                  ? 'bg-surface-inverse text-on-inverse border-line'
                  : 'bg-surface text-fg-muted hover:text-fg border-line'
              }`}
            >
              {fmt === 'all' ? 'Tất Cả Định Dạng' : fmt}
            </button>
          ))}
        </div>

        {/* Assets Grid */}
        {filteredAssets.length === 0 ? (
          <div className="bg-surface rounded-lg p-10 sm:p-16 text-center space-y-4 shadow-e1">
            <div className="w-14 h-14 bg-surface-muted rounded-full flex items-center justify-center mx-auto text-fg-subtle">
              <Icon name="folder_off" size={30} />
            </div>
            <div>
              <h3 className="font-bold text-base text-fg">
                {assets.length === 0 ? 'Bạn chưa sở hữu file CAD nào' : 'Không tìm thấy file phù hợp'}
              </h3>
              <p className="text-xs text-fg-subtle mt-1">
                {assets.length === 0
                  ? 'Mua bản quyền file CAD trên Marketplace, file sẽ xuất hiện tại đây.'
                  : 'Thử đổi bộ lọc định dạng hoặc từ khoá tìm kiếm.'}
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={() => onNavigate('explore')}
                className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-primary-fg text-xs font-mono font-bold uppercase tracking-wider rounded-full transition-all shadow-e1 cursor-pointer inline-flex items-center gap-2"
              >
                <Icon name="explore" size={18} />
                Khám phá kho bản vẽ
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {filteredAssets.map((asset) => {
              const downloadable = canDownload(asset);
              return (
                <div key={asset.id} className="bg-surface hover:border-primary/50 transition-all flex flex-col justify-between p-4 sm:p-5 space-y-4 rounded-lg shadow-e1" >
                  <div>
                    <div className="relative responsive-aspect-frame bg-surface-inverse overflow-hidden mb-3 rounded-lg">
                      <img src={asset.image} alt={asset.name} className="responsive-img-cover" />
                      <span className="absolute top-2.5 left-2.5 bg-surface-inverse text-on-inverse text-xs font-mono font-bold px-2 py-0.5 rounded-sm">
                        {asset.format}
                      </span>
                      {asset.hasUpdate && (
                        <span className="absolute top-2.5 right-2.5 bg-surface text-fg text-xs font-sans font-bold uppercase tracking-wider px-2 py-0.5 border border-line rounded-sm">
                          Update {asset.version}
                        </span>
                      )}
                      <button
                        onClick={() => setPreviewAsset(asset)}
                        className="absolute bottom-2.5 right-2.5 bg-surface-inverse/70 hover:bg-surface-inverse text-on-inverse text-xs font-sans uppercase tracking-wider px-2.5 py-1 flex items-center gap-1 touch-target-btn rounded-full cursor-pointer"
                      >
                        <Icon name="view_in_ar" size={18} />
                        Xem 3D
                      </button>
                    </div>

                    <div className="space-y-1 font-sans">
                      <div className="flex items-center justify-between text-xs text-fg-subtle font-mono">
                        <span>{asset.designer}</span>
                        <span>{asset.version}</span>
                      </div>
                      <h3 className="font-bold text-sm text-fg line-clamp-2">{asset.name}</h3>
                    </div>

                    <div className="mt-3 pt-3 border-t border-line space-y-1 text-xs font-mono text-fg-subtle">
                      <div className="flex items-center justify-between">
                        <span>Giấy phép:</span>
                        <span className="text-fg font-bold">{asset.license}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Mua ngày:</span>
                        <span className="text-fg">{asset.purchaseDate}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Dung lượng:</span>
                        <span className="text-fg">{asset.fileSize}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-3 border-t border-line font-sans">
                    {downloadable ? (
                      <button
                        onClick={() => handleDownloadFile(asset)}
                        disabled={downloadingId === asset.id}
                        className="w-full py-2.5 bg-surface-inverse hover:bg-surface-inverse-raised text-on-inverse text-xs uppercase tracking-widest font-bold transition-colors flex items-center justify-center gap-1.5 touch-target-btn rounded-full cursor-pointer disabled:opacity-60"
                      >
                        <Icon name="download" size={18} />
                        {downloadingId === asset.id ? 'Đang tạo liên kết...' : 'Tải Về Ngay'}
                      </button>
                    ) : (
                      <div className="w-full py-2.5 bg-surface-muted border border-line text-fg-subtle text-xs uppercase tracking-widest font-bold flex flex-col items-center justify-center gap-0.5 rounded-lg text-center px-2">
                        <span className="flex items-center gap-1.5">
                          <Icon name="link_off" size={16} />
                          Chưa hỗ trợ tải trực tiếp
                        </span>
                        <span className="text-xs normal-case tracking-normal font-normal">
                          Cần bảng order_files để cấp liên kết có chữ ký
                        </span>
                      </div>
                    )}

                    <button
                      onClick={() => onNavigate('tool_3d')}
                      className="w-full py-2 border border-line-control hover:bg-canvas text-fg text-xs uppercase tracking-widest font-bold transition-colors touch-target-btn rounded-full cursor-pointer"
                    >
                      Báo Giá Gia Công
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 3D Quick Inspect Modal */}
        {previewAsset && (
          <div className="fixed inset-0 bg-surface-inverse/70 z-modal flex items-center justify-center p-3 sm:p-6">
            <div className="bg-surface-inverse border border-surface-inverse-raised w-full max-w-2xl overflow-hidden shadow-e3 space-y-4 p-5 sm:p-8 text-on-inverse rounded-lg">
              <div className="flex items-center justify-between border-b border-line pb-4">
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-on-inverse">{previewAsset.name}</h3>
                  <p className="text-xs text-on-inverse/70 font-sans">
                    Xem trước dạng khối minh hoạ — không phải hình học thật của file.
                  </p>
                </div>
                <button
                  onClick={() => setPreviewAsset(null)}
                  className="p-1 hover:bg-on-inverse/10 text-on-inverse/70 hover:text-on-inverse touch-target-btn rounded-full cursor-pointer"
                  aria-label="Đóng xem trước"
                >
                  <Icon name="close" size={24} />
                </button>
              </div>

              <div className="bg-surface-inverse p-2 border border-line rounded-lg">
                <ThreeModelViewer
                  modelType={previewAsset.model3DType || 'gear'}
                  color="#E0DDD5"
                  className="h-[260px] sm:h-[340px] lg:h-[360px] w-full"
                />
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-3 font-sans">
                <button
                  onClick={() => setPreviewAsset(null)}
                  className="px-5 py-2.5 border border-line-control hover:bg-on-inverse/10 text-on-inverse text-xs uppercase tracking-widest font-bold touch-target-btn rounded-full cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  onClick={() => {
                    void handleDownloadFile(previewAsset);
                    setPreviewAsset(null);
                  }}
                  className="px-6 py-2.5 bg-surface text-fg hover:bg-line-subtle text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-1.5 touch-target-btn rounded-full cursor-pointer"
                >
                  <Icon name="download" size={18} />
                  {canDownload(previewAsset) ? `Tải Tập Tin ${previewAsset.format}` : 'Chưa hỗ trợ tải trực tiếp'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
