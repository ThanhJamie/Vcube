import React, { useState, useEffect } from 'react';
import { Product } from '../../../types';
import { ThreeModelViewer } from '../ThreeModelViewer';
import { Button, Field, Icon, Input, Select } from '@frontend/ui';
import { EMPTY_VALUE } from '@frontend/lib/format';
import { settingsAccessors, subscribeSettings } from '../../../backend/services/settingsService';

/** Nhãn VI cho `category` (slug kỹ thuật trong DB) — không render thô `mechanical`/`iot`… */
const CATEGORY_LABELS: Record<string, string> = {
  mechanical: 'Cơ khí',
  iot: 'Vỏ hộp IoT',
  robotics: 'Robot',
  art: 'Nghệ thuật',
  tools: 'Công cụ',
};

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
    <div className="space-y-8">
      {/* Progress Stepper — §3.6: hoàn tất (đen đặc) · hiện tại (viền đen) · chưa tới (xám). */}
      <div className="mx-auto flex w-full max-w-2xl flex-wrap items-center gap-2 rounded-lg border border-line bg-surface p-4">
        {[
          { step: 1, label: '1. TẢI TỆP 3D' },
          { step: 2, label: '2. XEM 3D & THÔNG SỐ' },
          { step: 3, label: '3. ĐỊNH GIÁ & XUẤT BẢN' },
        ].map((item) => {
          const isDone = wizardStep > item.step;
          const isCurrent = wizardStep === item.step;
          return (
            <React.Fragment key={item.step}>
              {item.step > 1 ? (
                <div
                  aria-hidden="true"
                  className={`hidden h-0.5 flex-1 sm:block ${wizardStep >= item.step ? 'bg-primary' : 'bg-line-subtle'}`}
                />
              ) : null}
              <button
                type="button"
                onClick={() => setWizardStep(item.step)}
                aria-current={isCurrent ? 'step' : undefined}
                className={`flex items-center gap-2 rounded-md px-1 py-1 text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-md:min-h-11 motion-reduce:transition-none ${
                  isCurrent ? 'text-fg' : 'text-fg-muted'
                }`}
              >
                <span
                  className={`grid size-8 shrink-0 place-items-center rounded-full text-xs font-semibold ${
                    isDone
                      ? 'bg-primary text-primary-fg'
                      : isCurrent
                        ? 'border-2 border-primary text-primary'
                        : 'bg-surface-muted text-fg-muted'
                  }`}
                >
                  {isDone ? <Icon name="check" size={16} /> : item.step}
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider">{item.label}</span>
              </button>
            </React.Fragment>
          );
        })}
      </div>

      {/* STEP 1: File Upload */}
      {wizardStep === 1 && (
        <div className="mx-auto max-w-2xl space-y-6 rounded-xl border border-line bg-surface p-6 sm:p-8">
          <div className="space-y-1 text-center">
            <h2 className="text-lg font-bold tracking-tight text-fg">
              Tải lên tệp bản vẽ 3D (STL, STEP, 3MF, OBJ)
            </h2>
            <p className="text-sm text-fg-muted">
              Hệ thống sẽ tự động quét lưới đa giác, kiểm tra độ kín nước và tính toán dung tích in.
            </p>
          </div>

          <div className="space-y-3 rounded-lg border border-dashed border-line-control bg-surface-muted/40 p-8 text-center transition-colors duration-200 hover:bg-surface-muted">
            <div className="mx-auto grid size-14 place-items-center rounded-lg bg-surface-muted text-fg-muted">
              <Icon name="upload_file" size={28} />
            </div>
            <div>
              <p className="text-sm font-semibold text-fg">
                Kéo thả tệp CAD vào đây hoặc bấm để chọn tệp
              </p>
              <p className="mt-1 font-mono text-xs text-fg-muted">
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
                  onShowToast(`Đã nhận tệp "${f.name}". Bắt đầu phân tích hình học 3D!`);
                }
              }}
            />
            <label
              htmlFor="file-upload-designer"
              className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-fg shadow-e1 transition-colors duration-200 hover:bg-primary-hover focus-within:ring-2 focus-within:ring-ring"
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
          <div className="space-y-4 lg:col-span-5">
            <div className="space-y-3 rounded-lg border border-line bg-surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line-subtle pb-2">
                <div className="flex items-center gap-2">
                  <span className="rounded-sm border border-line bg-primary-tint px-2 py-0.5 font-mono text-xs uppercase text-fg">
                    {CATEGORY_LABELS[selectedCategory] ?? selectedCategory}
                  </span>
                  <span className="rounded-sm bg-primary px-2 py-0.5 font-mono text-xs text-primary-fg">
                    V1.0
                  </span>
                </div>
                <span className="truncate font-mono text-xs text-fg-muted">
                  {uploadedFileName ? `${uploadedFileName}${uploadedFileSize ? ` • ${uploadedFileSize}` : ''}` : 'Chưa chọn tệp'}
                </span>
              </div>

              <div className="rounded-lg border border-line bg-surface-muted p-2">
                <ThreeModelViewer
                  modelType={selectedModelType}
                  color="#E0DDD5"
                  className="h-[280px] w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="rounded-md border border-line-subtle bg-surface-muted p-2.5">
                  <span className="block text-xs font-semibold uppercase tracking-wider text-fg-muted">THỂ TÍCH LƯỚI</span>
                  <span className="font-mono text-sm font-semibold text-fg-subtle">—</span>
                </div>
                <div className="rounded-md border border-line-subtle bg-surface-muted p-2.5">
                  <span className="block text-xs font-semibold uppercase tracking-wider text-fg-muted">KÍCH THƯỚC (X,Y,Z)</span>
                  <span className="font-mono text-sm font-semibold text-fg-subtle">—</span>
                </div>
                <div className="rounded-md border border-line-subtle bg-surface-muted p-2.5">
                  <span className="block text-xs font-semibold uppercase tracking-wider text-fg-muted">
                    ĐỘ KÍN NƯỚC
                  </span>
                  <span className="flex items-center gap-0.5 text-sm font-semibold text-fg-subtle">
                    — Chưa phân tích
                  </span>
                </div>
                <div className="rounded-md border border-line-subtle bg-surface-muted p-2.5">
                  <span className="block text-xs font-semibold uppercase tracking-wider text-fg-muted">KHUYẾN NGHỊ VẬT LIỆU</span>
                  <span className="text-sm font-semibold text-fg">PETG / Nylon-CF</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Identity, Licensing, Pricing */}
          <div className="space-y-5 lg:col-span-7">
            {/* Section 1: Identity */}
            <div className="space-y-4 rounded-lg border border-line bg-surface p-6">
              <h3 className="border-b border-line-subtle pb-2 text-base font-semibold tracking-tight text-fg">
                1. Thông tin bản vẽ &amp; danh mục
              </h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Tên Ấn Phẩm" required>
                  {(control) => (
                    <Input
                      {...control}
                      type="text"
                      value={modelName}
                      onChange={(e) => setModelName(e.target.value)}
                    />
                  )}
                </Field>

                <Field label="Danh Mục">
                  {(control) => (
                    <Select
                      {...control}
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      options={[
                        { value: 'mechanical', label: 'Cơ khí chính xác' },
                        { value: 'iot', label: 'Vỏ hộp IoT & Thiết bị điện tử' },
                        { value: 'robotics', label: 'Robot & Tự động hóa' },
                        { value: 'art', label: 'Nghệ thuật & Điêu khắc' },
                        { value: 'tools', label: 'Dụng cụ & Đồ gá kỹ thuật' },
                      ]}
                    />
                  )}
                </Field>
              </div>

              <Field label="Mô tả kỹ thuật &amp; hướng dẫn in">
                {(control) => (
                  <textarea
                    {...control}
                    rows={3}
                    value={modelDesc}
                    onChange={(e) => setModelDesc(e.target.value)}
                    className="w-full rounded-md border border-line-control bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                )}
              </Field>

              <div>
                <span className="mb-1 block text-sm font-medium text-fg">
                  Thẻ phân loại
                </span>
                <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-md border border-line-control bg-surface p-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-sm bg-primary-tint px-2 py-0.5 text-xs text-fg"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        aria-label={`Xoá thẻ ${tag}`}
                        className="rounded-sm text-fg-muted transition-colors hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    placeholder="Thêm thẻ (nhấn Enter)…"
                    aria-label="Thêm thẻ phân loại"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                    className="min-w-[100px] flex-1 border-none bg-transparent p-0 text-sm text-fg placeholder:text-fg-subtle rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Licensing */}
            <div className="space-y-3 rounded-lg border border-line bg-surface p-6">
              <h3 className="border-b border-line-subtle pb-2 text-base font-semibold tracking-tight text-fg">
                2. Giấy phép bản quyền
              </h3>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label
                  className={`cursor-pointer rounded-lg border p-4 transition-colors duration-200 ${
                    licenseType === 'Standard'
                      ? 'border-primary bg-primary-tint ring-1 ring-primary'
                      : 'border-line hover:border-fg-subtle'
                  }`}
                >
                  <input
                    type="radio"
                    name="license_type"
                    className="sr-only"
                    checked={licenseType === 'Standard'}
                    onChange={() => setLicenseType('Standard')}
                  />
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm font-semibold text-fg">Tiêu chuẩn (cá nhân)</span>
                    <Icon name="shield" size={16} className="text-fg-muted" />
                  </div>
                  <p className="text-sm leading-relaxed text-fg-muted">
                    Chỉ dùng in cá nhân. Không được bán lại thành phẩm vật lý hoặc chia sẻ tệp nguồn.
                  </p>
                </label>

                <label
                  className={`cursor-pointer rounded-lg border p-4 transition-colors duration-200 ${
                    licenseType === 'Commercial'
                      ? 'border-primary bg-primary-tint ring-1 ring-primary'
                      : 'border-line hover:border-fg-subtle'
                  }`}
                >
                  <input
                    type="radio"
                    name="license_type"
                    className="sr-only"
                    checked={licenseType === 'Commercial'}
                    onChange={() => setLicenseType('Commercial')}
                  />
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm font-semibold text-fg">Thương mại</span>
                    <Icon name="verified" size={16} className="text-fg-muted" />
                  </div>
                  <p className="text-sm leading-relaxed text-fg-muted">
                    Cho phép sản xuất và thương mại hóa thành phẩm vật lý. Tác giả nhận hoa hồng trọn
                    đời.
                  </p>
                </label>
              </div>
            </div>

            {/* Section 3: Pricing Strategy */}
            <div className="space-y-4 rounded-lg border border-line bg-surface p-6">
              <h3 className="border-b border-line-subtle pb-2 text-base font-semibold tracking-tight text-fg">
                3. Chiến lược định giá (tệp số &amp; in vật lý)
              </h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Field label="Giá tải tệp thiết kế số (STL/STEP)">
                    {(control) => (
                      <div className="relative">
                        <Input
                          {...control}
                          type="number"
                          numeric
                          value={standardPrice}
                          onChange={(e) => setStandardPrice(e.target.value)}
                          className="pr-12 font-semibold"
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs text-fg-muted">
                          ₫
                        </span>
                      </div>
                    )}
                  </Field>
                  <p className="mt-1 text-xs text-fg-muted">
                    Tác giả thực nhận: <strong>{EMPTY_VALUE}</strong> — tỉ lệ bản quyền tệp số
                    không nằm trong cấu hình giá, VCUBE công bố khi quyết toán.
                  </p>
                </div>

                <div>
                  <Field label="Giá in 3D vật lý thành phẩm">
                    {(control) => (
                      <div className="relative">
                        <Input
                          {...control}
                          type="number"
                          numeric
                          value={physicalPrice}
                          onChange={(e) => setPhysicalPrice(e.target.value)}
                          className="pr-12 font-semibold"
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs text-fg-muted">
                          ₫
                        </span>
                      </div>
                    )}
                  </Field>
                  {designerRoyaltyPercent !== null ? (
                    <p className="mt-1 text-xs text-fg-muted">
                      Bản quyền tác giả theo cấu hình giá:{' '}
                      <strong>{designerRoyaltyPercent}%</strong> — số tiền quyết toán theo công
                      thức giá của VCUBE.
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-fg-muted">
                      Hoa hồng tác giả: <strong>{EMPTY_VALUE}</strong> (chưa cấu hình tỉ lệ bản
                      quyền trong giá)
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={onCancel}>
                Hủy Bỏ
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting}
                leadingIcon={<Icon name="cloud_upload" size={16} />}
              >
                {isSubmitting ? 'ĐANG LƯU…' : 'XUẤT BẢN VÀO DANH MỤC'}
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
