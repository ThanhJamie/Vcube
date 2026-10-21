import React, { useState } from 'react';
import { DigitalAsset } from '../types';
import { ThreeModelViewer } from '../components/ThreeModelViewer';
import { AssetService, SIGNED_URL_TTL_SECONDS } from '../../backend/services/assetService';
import { Icon, Button, Card, Modal, Field, Input, Select, EmptyState } from '@frontend/ui';

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
 * GIỚI HẠN ĐÃ BIẾT: bảng `order_files` CÓ trong schema (baseline) nhưng CHƯA
 * được nối (unwired) — chưa có luồng nào ghi/đọc bảng này. Hiện `DigitalAsset`
 * không mang `storagePath`, và dữ liệu đơn hàng (`orders.items`) cũng không lưu
 * đường dẫn file. Vì chưa suy ra được vị trí object trong Storage nên ở đây KHÔNG
 * bịa đường dẫn và KHÔNG hiện link giả. Trạng thái là "chưa hỗ trợ tải trực tiếp".
 *
 * TODO(order_files): nối luồng ghi/đọc `order_files (order_id, product_id,
 * storage_path, license, created_at)` + policy SELECT cho người mua, map
 * `storage_path` vào `DigitalAsset.storagePath`, rồi hàm dưới sẽ chạy đúng như thiết kế.
 */
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
        `Chưa hỗ trợ tải trực tiếp cho "${asset.name}": hệ thống chưa lưu vị trí tệp trong kho. Vui lòng liên hệ hỗ trợ.`
      );
      return;
    }

    setDownloadingId(asset.id);
    try {
      const signedUrl = await AssetService.createSignedUrl(asset.storagePath as string);

      const link = document.createElement('a');
      link.href = signedUrl;
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
    <div className="min-h-dvh bg-canvas text-fg py-6 sm:py-10 px-4 sm:px-6 md:px-12">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Title */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6 pb-6 border-b border-line">
          <div>
            <span className="font-mono text-xs uppercase tracking-wider text-fg-subtle block mb-1">
              Thư viện bản quyền kỹ thuật số
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-fg">
              Thư Viện Tệp CAD Đã Sở Hữu
            </h1>
            <p className="text-xs sm:text-sm text-fg-muted mt-1">
              Danh sách tệp CAD thuộc quyền sử dụng của bạn theo từng đơn hàng đã mua.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 w-full md:w-auto">
            <Field hideLabel label="Tìm tệp theo tên" className="relative w-full md:w-64">
              {(control) => (
                <>
                  <Input {...control} type="text" className="pl-9" placeholder="Tìm tệp theo tên..."
                    value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                  <Icon name="search" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
                </>
              )}
            </Field>
            <Field hideLabel label="Lọc theo định dạng tệp" className="w-full md:w-44">
              {(control) => (
                <Select {...control} value={selectedFormat} onChange={(e) => setSelectedFormat(e.target.value)}>
                  {['all', 'STL', '3MF', 'STEP'].map((fmt) => (
                    <option key={fmt} value={fmt}>{fmt === 'all' ? 'Tất Cả Định Dạng' : fmt}</option>
                  ))}
                </Select>
              )}
            </Field>
          </div>
        </div>

        {/* Download availability notice — honest about the current limitation */}
        <div className="rounded-lg border border-warning/20 bg-warning-tint p-4 flex items-start gap-3 text-xs">
          <Icon name="info" size={20} className="text-warning shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-warning">Tải trực tiếp: chưa hỗ trợ</p>
            <p className="text-warning leading-relaxed">
              Hệ thống chưa lưu vị trí từng tệp trong kho lưu trữ, nên chưa thể cấp liên kết tải có chữ ký.
              Danh sách dưới đây là các bản quyền bạn đã mua. Vui lòng liên hệ hỗ trợ để nhận tệp trong thời gian này.
            </p>
          </div>
        </div>

        {/* Assets Grid */}
        {filteredAssets.length === 0 ? (
          <EmptyState
            bordered
            live
            icon={<Icon name="folder_off" size={20} />}
            title={assets.length === 0 ? 'Bạn chưa sở hữu tệp CAD nào' : 'Không tìm thấy tệp phù hợp'}
            description={assets.length === 0
              ? 'Mua bản quyền tệp CAD trên sàn VCUBE, tệp sẽ xuất hiện tại đây.'
              : 'Thử đổi bộ lọc định dạng hoặc từ khoá tìm kiếm.'}
            action={(
              <Button
                variant="primary"
                size="md"
                onClick={() => onNavigate('explore')}
                leadingIcon={<Icon name="explore" size={18} />}
              >
                Khám phá kho bản vẽ
              </Button>
            )}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {filteredAssets.map((asset) => {
              const downloadable = canDownload(asset);
              return (
                <Card key={asset.id} variant="soft" padding="md" className="flex flex-col justify-between space-y-4">
                  <div>
                    <div className="relative responsive-aspect-frame bg-surface-muted overflow-hidden mb-3 rounded-lg border border-line">
                      <img src={asset.image} alt={asset.name} className="responsive-img-cover" />
                      <span className="absolute top-2.5 left-2.5 rounded-full bg-primary px-2.5 py-1 text-xs font-mono font-semibold text-primary-fg">
                        {asset.format}
                      </span>
                      {asset.hasUpdate && (
                        <span className="absolute top-2.5 right-2.5 rounded-full bg-surface px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-fg border border-line">
                          Cập nhật {asset.version}
                        </span>
                      )}
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="absolute bottom-2.5 right-2.5 bg-surface/95 shadow-e1"
                        onClick={() => setPreviewAsset(asset)}
                        leadingIcon={<Icon name="view_in_ar" size={16} className="text-fg-muted" />}
                      >
                        Xem 3D
                      </Button>
                    </div>

                    <div className="space-y-1 font-sans">
                      <div className="flex items-center justify-between text-xs text-fg-subtle font-mono">
                        <span>{asset.designer}</span>
                        <span className="tabular-nums">{asset.version}</span>
                      </div>
                      <h3 className="font-semibold text-sm text-fg line-clamp-2">{asset.name}</h3>
                    </div>

                    <div className="mt-3 pt-3 border-t border-line-subtle space-y-1 text-xs font-mono text-fg-subtle">
                      <div className="flex items-center justify-between">
                        <span>Giấy phép:</span>
                        <span className="text-fg font-semibold">{asset.license}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Mua ngày:</span>
                        <span className="text-fg tabular-nums">{asset.purchaseDate}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Dung lượng:</span>
                        <span className="text-fg tabular-nums">{asset.fileSize}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-3 border-t border-line-subtle font-sans">
                    {downloadable ? (
                      <Button
                        size="md"
                        variant="primary"
                        fullWidth
                        loading={downloadingId === asset.id}
                        loadingLabel="Đang tạo liên kết..."
                        onClick={() => handleDownloadFile(asset)}
                        leadingIcon={<Icon name="download" size={18} />}
                      >
                        {downloadingId === asset.id ? 'Đang tạo liên kết...' : 'Tải Về Ngay'}
                      </Button>
                    ) : (
                      <div className="w-full rounded-md border border-dashed border-line bg-surface-muted px-2 py-3 text-fg-muted text-xs font-medium flex flex-col items-center justify-center gap-1 text-center">
                        <span className="flex items-center gap-1.5">
                          <Icon name="link_off" size={16} />
                          Chưa hỗ trợ tải trực tiếp
                        </span>
                        <span className="text-xs normal-case tracking-normal font-normal">
                          Liên kết tải sẽ có khi hệ thống lưu vị trí từng tệp
                        </span>
                      </div>
                    )}

                    <Button
                      size="md"
                      variant="secondary"
                      fullWidth
                      onClick={() => onNavigate('quote')}
                      leadingIcon={<Icon name="precision_manufacturing" size={16} />}
                    >
                      Báo Giá Gia Công
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* 3D Quick Inspect Modal */}
        {previewAsset && (
          <Modal
            open
            onClose={() => setPreviewAsset(null)}
            size="lg"
            title={previewAsset.name}
            description="Xem trước dạng khối minh hoạ — không phải hình học thật của tệp."
          >
              <div className="bg-surface-muted p-2 border border-line rounded-lg">
                <ThreeModelViewer
                  modelType={previewAsset.model3DType || 'gear'}
                  color="#00687a"
                  className="h-[260px] sm:h-[340px] lg:h-[360px] w-full"
                />
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-3 font-sans">
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => setPreviewAsset(null)}
                >
                  Đóng
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  disabled={!canDownload(previewAsset)}
                  title={!canDownload(previewAsset) ? 'Kho tệp chưa hỗ trợ tải trực tiếp cho tệp này.' : undefined}
                  onClick={() => {
                    if (!canDownload(previewAsset)) return;
                    void handleDownloadFile(previewAsset);
                    setPreviewAsset(null);
                  }}
                  leadingIcon={<Icon name="download" size={18} />}
                >
                  {canDownload(previewAsset) ? `Tải Tập Tin ${previewAsset.format}` : 'Chưa hỗ trợ tải trực tiếp'}
                </Button>
              </div>
          </Modal>
        )}
      </div>
    </div>
  );
};
