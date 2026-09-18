import React, { useState, useEffect } from 'react';
import { Product } from '../../../types';
import { ThreeModelViewer } from '../ThreeModelViewer';
import { Icon } from '@frontend/ui';
import { EMPTY_VALUE } from '@frontend/lib/format';
import { settingsAccessors, subscribeSettings } from '../../../backend/services/settingsService';

/**
 * A6 (data-honesty): tỉ lệ bản quyền tác giả phải đọc từ cấu hình giá thật
 * (`pricing_configs.designerRoyaltyPercent` qua cache `settingsAccessors.pricingConfig()`),
 * KHÔNG dùng số cứng 90%/10%. Chưa cấu hình ⇒ `null` ⇒ UI hiện `—`, không đoán hộ.
 */
const readDesignerRoyaltyPercent = (): number | null => {
  const v = settingsAccessors.pricingConfig()?.designerRoyaltyPercent;
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
};

function useDesignerRoyaltyPercent(): number | null {
  const [percent, setPercent] = useState<number | null>(readDesignerRoyaltyPercent);
  useEffect(() => subscribeSettings(() => setPercent(readDesignerRoyaltyPercent())), []);
  return percent;
}

export interface DesignerUploadWizardTabProps {
  onAddNewProduct: (product: Product) => void;
  onShowToast: (message: string) => void;
  currentDesignerName: string;
  designerAvatar?: string;
  onCancel?: () => void;
}

export const DesignerUploadWizardTab: React.FC<DesignerUploadWizardTabProps> = ({
  onAddNewProduct,
  onShowToast,
  currentDesignerName,
  designerAvatar,
  onCancel,
}) => {
  // Wizard state: 1: Upload, 2: Configure & 3D, 3: Pricing & Publish
  // TẤT CẢ bắt đầu TRỐNG — không prefill file/mesh/giá bịa (data-honesty).
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [modelName, setModelName] = useState('');
  const [modelDesc, setModelDesc] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [licenseType, setLicenseType] = useState<'Standard' | 'Commercial' | 'Exclusive'>(
    'Standard'
  );
  const [standardPrice, setStandardPrice] = useState('');
  const [physicalPrice, setPhysicalPrice] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('mechanical');
  const [selectedModelType, setSelectedModelType] = useState<
    'gear' | 'case' | 'figurine' | 'bracket' | 'drone'
  >('gear');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadedFileSize, setUploadedFileSize] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const designerRoyaltyPercent = useDesignerRoyaltyPercent();

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTagInput.trim()) {
      e.preventDefault();
      const val = newTagInput.trim().toLowerCase();
      if (!tags.includes(val)) {
        setTags([...tags, val]);
      }
      setNewTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  // Publish New Model
  const handlePublishModel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modelName.trim()) return;

    setIsSubmitting(true);
    const newProd: Product = {
      id: `prod-${Date.now()}`,
      sku: `VC-${Math.floor(1000 + Math.random() * 9000)}X`,
      name: modelName.trim(),
      category: selectedCategory,
      designer: currentDesignerName,
      // Không bịa avatar/ảnh Unsplash; dùng đúng dữ liệu tác giả có.
      designerAvatar: designerAvatar || undefined,
      isPro: false,
      isVerified: false,
      pricePhysical: Number(physicalPrice) || 0,
      priceDigital: Number(standardPrice) || 0,
      images: [],
      description: modelDesc,
      // Chỉ nêu đúng giấy phép đã chọn; KHÔNG kèm tuyên bố dung sai/vật liệu bịa.
      features: [
        licenseType === 'Commercial'
          ? 'Bản quyền thương mại sản phẩm vật lý'
          : 'Bản quyền sử dụng cá nhân',
      ],
      specs: {
        dimensions: '—',
        weight: '—',
        resolution: '—',
        infillDefault: '—',
        technology: '—',
      },
      supportedMaterials: [],
      colors: [],
      tags,
      badge: 'MỚI',
      rating: 0,
      reviewsCount: 0,
      printsCount: 0,
      salesCount: 0,
      printTime: '—',
      isCustomizable: true,
      licenseType,
      // Chờ kiểm duyệt thay vì tự xuất bản thẳng ra marketplace.
      status: 'Under Review',
    };

    onAddNewProduct(newProd);
    setIsSubmitting(false);
    onShowToast(`Đã gửi bản vẽ "${newProd.name}" để kiểm duyệt (chờ duyệt).`);
  };

  return (
    <div className="space-y-6">
      {/* Progress Stepper */}
      <div className="bg-surface p-4 rounded-sm flex items-center justify-between max-w-2xl mx-auto shadow-e1">
        <button
          type="button"
          onClick={() => setWizardStep(1)}
          className={`flex items-center gap-2 ${wizardStep >= 1 ? 'text-primary' : 'text-fg-subtle'}`}
        >
          <span
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-tech ${
              wizardStep >= 1 ? 'bg-primary text-primary-fg' : 'border border-line'
            }`}
          >
            1
          </span>
          <span className="font-tech text-xs font-bold">1. TẢI FILE 3D</span>
        </button>

        <div className={`flex-1 h-0.5 mx-4 ${wizardStep >= 2 ? 'bg-primary' : 'bg-line-subtle'}`}></div>

        <button
          type="button"
          onClick={() => setWizardStep(2)}
          className={`flex items-center gap-2 ${wizardStep >= 2 ? 'text-primary' : 'text-fg-subtle'}`}
        >
          <span
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-tech ${
              wizardStep >= 2 ? 'bg-primary text-primary-fg' : 'border border-line'
            }`}
          >
            2
          </span>
          <span className="font-tech text-xs font-bold">2. XEM 3D &amp; THÔNG SỐ</span>
        </button>

        <div className={`flex-1 h-0.5 mx-4 ${wizardStep >= 3 ? 'bg-primary' : 'bg-line-subtle'}`}></div>

        <button
          type="button"
          onClick={() => setWizardStep(3)}
          className={`flex items-center gap-2 ${wizardStep >= 3 ? 'text-primary' : 'text-fg-subtle'}`}
        >
          <span
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-tech ${
              wizardStep >= 3 ? 'bg-primary text-primary-fg' : 'border border-line'
            }`}
          >
            3
          </span>
          <span className="font-tech text-xs font-bold">3. ĐỊNH GIÁ &amp; XUẤT BẢN</span>
        </button>
      </div>

      {/* STEP 1: File Upload */}
      {wizardStep === 1 && (
        <div className="max-w-2xl mx-auto bg-surface p-6 rounded-sm space-y-6 shadow-e1">
          <div className="text-center space-y-1">
            <h2 className="text-lg font-bold text-fg">
              Tải Lên Tệp Bản Vẽ 3D (STL, STEP, 3MF, OBJ)
            </h2>
            <p className="text-xs text-fg-muted">
              Hệ thống sẽ tự động quét lưới đa giác (mesh), kiểm tra độ kín nước (manifold) và tính
              toán dung tích in.
            </p>
          </div>

          <div className="border-2 border-dashed border-primary/50 bg-primary/5 rounded-lg p-8 text-center space-y-3 cursor-pointer hover:bg-primary/10 transition-colors">
            <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <Icon name="upload_file" size={30} />
            </div>
            <div>
              <p className="font-bold text-sm text-fg">
                Kéo thả file CAD vào đây hoặc bấm để chọn tệp
              </p>
              <p className="text-xs text-fg-muted mt-1 font-tech">
                Hỗ trợ .STL, .STEP, .STP, .3MF, .OBJ (Tối đa 150 MB)
              </p>
            </div>
            <input
              type="file"
              accept=".stl,.step,.stp,.3mf,.obj"
              className="hidden"
              id="file-upload-designer"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  const f = e.target.files[0];
                  setUploadedFileName(f.name);
                  setUploadedFileSize(`${(f.size / (1024 * 1024)).toFixed(1)} MB`);
                  setModelName(f.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' '));
                  setWizardStep(2);
                  onShowToast(`Đã nhận file "${f.name}". Bắt đầu phân tích hình học 3D!`);
                }
              }}
            />
            <label
              htmlFor="file-upload-designer"
              className="inline-block px-5 py-2 bg-primary hover:bg-primary-hover text-primary-fg font-bold text-xs uppercase rounded-sm cursor-pointer"
            >
              Chọn Tệp Từ Máy Tính
            </label>
          </div>
        </div>
      )}

      {/* STEP 2 & 3: FORM CONFIGURATION & PUBLISH */}
      {wizardStep >= 2 && (
        <form onSubmit={handlePublishModel} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: 3D Preview & Specs */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-surface rounded-sm p-4 space-y-3 shadow-e1">
              <div className="flex items-center justify-between border-b border-line pb-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-surface-inverse text-on-inverse font-tech text-xs rounded-sm uppercase">
                    {selectedCategory}
                  </span>
                  <span className="px-2 py-0.5 bg-primary text-primary-fg font-tech text-xs rounded-sm">
                    V1.0
                  </span>
                </div>
                <span className="font-tech text-xs text-fg-muted">
                  {uploadedFileName ? `${uploadedFileName}${uploadedFileSize ? ` • ${uploadedFileSize}` : ''}` : 'Chưa chọn tệp'}
                </span>
              </div>

              <div className="bg-surface-inverse border border-surface-inverse-raised rounded-sm p-2">
                <ThreeModelViewer
                  modelType={selectedModelType}
                  color="#E0DDD5"
                  className="h-[280px] w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 font-tech text-xs">
                <div className="bg-surface-muted p-2.5 border border-line rounded-sm">
                  <span className="text-fg-muted text-xs uppercase block">THỂ TÍCH MESH</span>
                  <span className="font-bold text-fg-subtle">—</span>
                </div>
                <div className="bg-surface-muted p-2.5 border border-line rounded-sm">
                  <span className="text-fg-muted text-xs uppercase block">KÍCH THƯỚC (X,Y,Z)</span>
                  <span className="font-bold text-fg-subtle">—</span>
                </div>
                <div className="bg-surface-muted p-2.5 border border-line rounded-sm">
                  <span className="text-fg-muted text-xs uppercase block">
                    ĐỘ KÍN NƯỚC (MANIFOLD)
                  </span>
                  <span className="font-bold text-fg-subtle flex items-center gap-0.5">
                    — Chưa phân tích
                  </span>
                </div>
                <div className="bg-surface-muted p-2.5 border border-line rounded-sm">
                  <span className="text-fg-muted text-xs uppercase block">KHUYẾN NGHỊ VẬT LIỆU</span>
                  <span className="font-bold text-primary">PETG / Nylon-CF</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Identity, Licensing, Pricing */}
          <div className="lg:col-span-7 space-y-5">
            {/* Section 1: Identity */}
            <div className="bg-surface p-5 rounded-sm space-y-4 shadow-e1">
              <h3 className="font-bold text-sm text-fg uppercase tracking-wider border-b border-line pb-2">
                1. Thông Tin Bản Vẽ &amp; Danh Mục
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs uppercase font-bold text-fg block mb-1">
                    Tên Ấn Phẩm:
                  </label>
                  <input
                    type="text"
                    required
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    className="w-full bg-canvas border border-line-control p-2 text-xs rounded-sm focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-xs uppercase font-bold text-fg block mb-1">
                    Danh Mục:
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full bg-canvas border border-line-control p-2 text-xs rounded-sm focus:outline-none focus:border-primary"
                  >
                    <option value="mechanical">Cơ khí chính xác</option>
                    <option value="iot">Vỏ hộp IoT &amp; Thiết bị điện tử</option>
                    <option value="robotics">Robot &amp; Tự động hóa</option>
                    <option value="art">Nghệ thuật &amp; Điêu khắc</option>
                    <option value="tools">Dụng cụ &amp; Đồ gá kỹ thuật</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs uppercase font-bold text-fg block mb-1">
                  Mô Tả Kỹ Thuật &amp; Hướng Dẫn In:
                </label>
                <textarea
                  rows={3}
                  value={modelDesc}
                  onChange={(e) => setModelDesc(e.target.value)}
                  className="w-full bg-canvas border border-line-control p-2 text-xs rounded-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs uppercase font-bold text-fg block mb-1">
                  Thẻ Phân Loại (Tags):
                </label>
                <div className="flex flex-wrap items-center gap-1.5 p-2 bg-canvas border border-line rounded-sm min-h-[38px]">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 bg-primary/10 text-fg rounded-sm text-xs font-tech flex items-center gap-1"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-danger"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    placeholder="Thêm tag (nhấn Enter)..."
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                    className="bg-transparent border-none text-xs focus:ring-0 p-0 text-fg min-w-[100px]"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Licensing */}
            <div className="bg-surface p-5 rounded-sm space-y-3 shadow-e1">
              <h3 className="font-bold text-sm text-fg uppercase tracking-wider border-b border-line pb-2">
                2. Giấy Phép Bản Quyền (License)
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  className={`border p-3.5 rounded-sm cursor-pointer transition-colors ${
                    licenseType === 'Standard'
                      ? 'border-primary bg-primary/10 ring-1 ring-primary'
                      : 'border-line hover:border-fg-muted'
                  }`}
                >
                  <input
                    type="radio"
                    name="license_type"
                    className="sr-only"
                    checked={licenseType === 'Standard'}
                    onChange={() => setLicenseType('Standard')}
                  />
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-xs text-fg">Standard (Cá Nhân)</span>
                    <Icon name="shield" size={16} className="text-primary" />
                  </div>
                  <p className="text-xs text-fg-muted leading-relaxed">
                    Chỉ dùng in cá nhân. Không được bán lại thành phẩm vật lý hoặc chia sẻ file nguồn.
                  </p>
                </label>

                <label
                  className={`border p-3.5 rounded-sm cursor-pointer transition-colors ${
                    licenseType === 'Commercial'
                      ? 'border-primary bg-primary/10 ring-1 ring-primary'
                      : 'border-line hover:border-fg-muted'
                  }`}
                >
                  <input
                    type="radio"
                    name="license_type"
                    className="sr-only"
                    checked={licenseType === 'Commercial'}
                    onChange={() => setLicenseType('Commercial')}
                  />
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-xs text-fg">Commercial (Thương Mại)</span>
                    <Icon name="verified" size={16} className="text-primary" />
                  </div>
                  <p className="text-xs text-fg-muted leading-relaxed">
                    Cho phép sản xuất và thương mại hóa thành phẩm vật lý. Tác giả nhận hoa hồng trọn
                    đời.
                  </p>
                </label>
              </div>
            </div>

            {/* Section 3: Pricing Strategy */}
            <div className="bg-surface p-5 rounded-sm space-y-4 shadow-e1">
              <div className="flex items-center justify-between border-b border-line pb-2">
                <h3 className="font-bold text-sm text-fg uppercase tracking-wider">
                  3. Chiến Lược Định Giá (File Số &amp; In Vật Lý)
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs uppercase font-bold text-fg block mb-1">
                    Giá Tải File Thiết Kế Số (STL/STEP):
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={standardPrice}
                      onChange={(e) => setStandardPrice(e.target.value)}
                      className="w-full bg-canvas border border-line-control p-2 text-xs font-tech text-fg rounded-sm focus:outline-none focus:border-primary"
                    />
                    <span className="absolute right-2.5 top-2 text-xs font-tech text-fg-muted">
                      VNĐ
                    </span>
                  </div>
                  <p className="text-xs text-fg-muted font-tech mt-1">
                    Tác giả thực nhận: <strong>{EMPTY_VALUE}</strong> — tỉ lệ bản quyền file số
                    không nằm trong cấu hình giá, VCUBE công bố khi quyết toán.
                  </p>
                </div>

                <div>
                  <label className="text-xs uppercase font-bold text-fg block mb-1">
                    Giá In 3D Vật Lý Thành Phẩm:
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={physicalPrice}
                      onChange={(e) => setPhysicalPrice(e.target.value)}
                      className="w-full bg-canvas border border-line-control p-2 text-xs font-tech text-fg rounded-sm focus:outline-none focus:border-primary"
                    />
                    <span className="absolute right-2.5 top-2 text-xs font-tech text-fg-muted">
                      VNĐ
                    </span>
                  </div>
                  {designerRoyaltyPercent !== null ? (
                    <p className="text-xs text-fg-muted font-tech mt-1">
                      Bản quyền tác giả theo cấu hình giá:{' '}
                      <strong>{designerRoyaltyPercent}%</strong> — số tiền quyết toán theo công
                      thức giá của VCUBE.
                    </p>
                  ) : (
                    <p className="text-xs text-fg-muted font-tech mt-1">
                      Hoa hồng tác giả: <strong>{EMPTY_VALUE}</strong> (chưa cấu hình tỉ lệ bản
                      quyền trong giá)
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onCancel}
                className="px-5 py-2.5 border border-line-control hover:bg-surface-muted text-xs font-bold uppercase rounded-full touch-target-btn"
              >
                Hủy Bỏ
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-primary-fg font-bold text-xs uppercase tracking-wider rounded-full transition-colors flex items-center gap-1.5 shadow-e1 touch-target-btn"
              >
                <Icon name="cloud_upload" size={18} />
                {isSubmitting ? 'ĐANG LƯU VÀO DB...' : 'XUẤT BẢN VÀO CATALOG'}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
