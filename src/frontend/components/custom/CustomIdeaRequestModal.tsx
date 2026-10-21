import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Modal, Input, Button, Field, Select, Card, Icon } from '@frontend/ui';
import { customDesignService } from '../../../backend/services/customDesignService';

export interface CustomIdeaRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast?: (message: string) => void;
}

export const CustomIdeaRequestModal: React.FC<CustomIdeaRequestModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
}) => {
  const { user, profile } = useAuth();

  // Form State
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientCompany, setClientCompany] = useState('');
  const [title, setTitle] = useState('');
  const [serviceType, setServiceType] = useState('custom_cad');
  const [description, setDescription] = useState('');
  const [material, setMaterial] = useState('pla-petg');
  const [budget, setBudget] = useState('1m-3m');
  const [deadline, setDeadline] = useState('standard');

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-fill from authenticated user profile if available
  useEffect(() => {
    if (isOpen) {
      const name = profile?.displayName || (user?.user_metadata?.full_name as string) || '';
      if (name) {
        setClientName(name);
      }
      if (profile?.phone) {
        setClientPhone(profile.phone);
      }
      if (user?.email) {
        setClientEmail(user.email);
      }
      if (profile?.company) {
        setClientCompany(profile.company);
      }
    }
  }, [isOpen, user, profile]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!clientName.trim()) {
      errs.clientName = 'Vui lòng nhập họ và tên của bạn.';
    }

    if (!clientPhone.trim()) {
      errs.clientPhone = 'Vui lòng nhập số điện thoại hoặc Zalo.';
    } else if (!/^[0-9+ ]{8,15}$/.test(clientPhone.trim())) {
      errs.clientPhone = 'Số điện thoại không hợp lệ (8 - 15 chữ số).';
    }

    if (!clientEmail.trim()) {
      errs.clientEmail = 'Vui lòng nhập email nhận báo giá.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail.trim())) {
      errs.clientEmail = 'Địa chỉ email không hợp lệ.';
    }

    if (!title.trim()) {
      errs.title = 'Vui lòng nhập tên dự án hoặc ý tưởng.';
    }

    if (!description.trim()) {
      errs.description = 'Vui lòng mô tả sơ lược yêu cầu, công năng hoặc kích thước dự kiến.';
    } else if (description.trim().length < 10) {
      errs.description = 'Mô tả cần ít nhất 10 ký tự để kỹ sư có đủ thông tin sơ bộ.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const budgetLabels: Record<string, string> = {
        under_1m: 'Dưới 1.000.000 ₫',
        '1m-3m': '1.000.000 ₫ – 3.000.000 ₫',
        '3m-10m': '3.000.000 ₫ – 10.000.000 ₫',
        above_10m: 'Trên 10.000.000 ₫',
        flexible: 'Cần kỹ sư ước tính',
      };

      const deadlineLabels: Record<string, string> = {
        urgent: 'Gấp (1 - 3 ngày làm việc)',
        standard: 'Tiêu chuẩn (5 - 7 ngày làm việc)',
        flexible: 'Linh hoạt theo phương án',
      };

      const materialLabels: Record<string, string> = {
        'pla-petg': 'PLA / PETG (Tiêu chuẩn kỹ thuật)',
        'abs-pc': 'ABS / PC (Chịu nhiệt & va đập)',
        'pa12-cf': 'Nylon PA12-CF (Sợi Carbon siêu bền)',
        'tough-resin': 'Tough Resin (Chi tiết siêu nét)',
        'tpu-95a': 'TPU 95A (Cao su đàn hồi chống va chạm)',
        consult: 'Kỹ sư đề xuất vật liệu phù hợp',
      };

      const res = await customDesignService.createRequest({
        clientName: clientName.trim(),
        clientInitials: clientName.trim().slice(0, 2).toUpperCase(),
        clientEmail: clientEmail.trim(),
        clientPhone: clientPhone.trim(),
        clientCompany: clientCompany.trim(),
        title: title.trim(),
        serviceType,
        description: description.trim(),
        budget: budgetLabels[budget] || budget,
        deadline: deadlineLabels[deadline] || deadline,
        targetSpecs: {
          material: materialLabels[material] || material,
        },
        customerId: user?.uid,
      });

      if (!res.success) {
        const errMsg = `Không thể gửi yêu cầu: ${res.error}`;
        if (onShowToast) {
          onShowToast(errMsg);
        }
        return;
      }

      const successMsg = 'Đã gửi yêu cầu tư vấn ý tưởng CAD 3D thành công! Kỹ sư VCUBE sẽ liên hệ lại sớm nhất.';

      if (onShowToast) {
        onShowToast(successMsg);
      }

      // Reset form fields
      setTitle('');
      setDescription('');
      setErrors({});
      onClose();
    } catch (err: any) {
      console.error('[CustomIdeaRequestModal] Lỗi gửi yêu cầu:', err);
      const errMsg = `Không thể gửi yêu cầu: ${err?.message || 'Vui lòng thử lại sau.'}`;
      if (onShowToast) {
        onShowToast(errMsg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const categoryOptions = [
    { value: 'jigs', label: 'Đồ gá & dụng cụ xưởng' },
    { value: 'iot', label: 'Vỏ hộp điện tử & thiết bị IoT' },
    { value: 'mechanical', label: 'Cơ cấu truyền động & bánh răng' },
    { value: 'robotics', label: 'Khung drone & tay gắp robot' },
    { value: 'architecture', label: 'Khớp nối module & sa bàn mô phỏng' },
    { value: 'custom_cad', label: 'Ứng dụng cơ khí tùy biến khác' },
  ];

  const materialOptions = [
    { value: 'pla-petg', label: 'PLA / PETG (tiêu chuẩn kỹ thuật)' },
    { value: 'abs-pc', label: 'ABS / PC (chịu nhiệt & va đập)' },
    { value: 'pa12-cf', label: 'Nylon PA12-CF (gia cường sợi carbon)' },
    { value: 'tough-resin', label: 'Resin dai (bề mặt siêu nét & mịn)' },
    { value: 'tpu-95a', label: 'TPU 95A (cao su đàn hồi giảm chấn)' },
    { value: 'consult', label: 'Nhờ kỹ sư VCUBE đề xuất vật liệu tối ưu' },
  ];

  const budgetOptions = [
    { value: 'under_1m', label: 'Dưới 1.000.000 ₫' },
    { value: '1m-3m', label: '1.000.000 ₫ – 3.000.000 ₫' },
    { value: '3m-10m', label: '3.000.000 ₫ – 10.000.000 ₫' },
    { value: 'above_10m', label: 'Trên 10.000.000 ₫ (dự án công nghiệp)' },
    { value: 'flexible', label: 'Linh hoạt / kỹ sư báo giá phương án' },
  ];

  const deadlineOptions = [
    { value: 'urgent', label: 'Gấp (1 – 3 ngày làm việc)' },
    { value: 'standard', label: 'Tiêu chuẩn (5 – 7 ngày làm việc)' },
    { value: 'flexible', label: 'Linh hoạt theo tiến độ dự án' },
  ];

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      size="lg"
      title={
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-md bg-primary-tint text-primary">
            <Icon name="design_services" size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-fg leading-tight">
              Đăng Ký Dịch Vụ Dựng Mô Hình 3D Từ Ý Tưởng
            </h3>
            <span className="mt-0.5 block font-sans text-xs font-normal text-fg-muted">
              Tiếp nhận phác thảo sơ bộ, dựng CAD chuẩn kỹ thuật & in thử nghiệm 1:1
            </span>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5 pt-2">
        {/* Info callout card */}
        <Card variant="soft" padding="md" className="bg-surface-muted">
          <div className="flex items-start gap-3">
            <Icon name="info" size={18} className="text-primary shrink-0 mt-0.5" />
            <div className="text-xs text-fg-muted leading-relaxed">
              {(
                <>
                  <strong className="text-fg font-semibold block mb-0.5">Quy trình tiếp nhận & bảo mật bản quyền:</strong>
                  Bạn có thể cung cấp bản vẽ tay, ảnh chụp hiện trạng hoặc kích thước sơ bộ. Đội ngũ kỹ sư VCUBE sẽ phân tích tính khả thi chế tạo (DFM), bảo mật 100% ý tưởng và liên hệ gửi báo giá dự toán trong vòng 24 giờ làm việc.
                </>
              )}
            </div>
          </div>
        </Card>

        {/* Section 1: Contact info */}
        <div className="rounded-lg bg-surface p-4 shadow-soft">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-fg-muted">
            01 · Thông tin người đăng ký
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field id="custom-idea-name" label="Họ và tên" required error={errors.clientName}>
              {(control) => (
                <Input
                  {...control}
                  value={clientName}
                  onChange={(e) => {
                    setClientName(e.target.value);
                    if (errors.clientName) setErrors((prev) => ({ ...prev, clientName: '' }));
                  }}
                  placeholder="Nguyễn Văn A"
                />
              )}
            </Field>

            <Field id="custom-idea-phone" label="Số điện thoại / Zalo" required error={errors.clientPhone}>
              {(control) => (
                <Input
                  {...control}
                  type="tel"
                  value={clientPhone}
                  onChange={(e) => {
                    setClientPhone(e.target.value);
                    if (errors.clientPhone) setErrors((prev) => ({ ...prev, clientPhone: '' }));
                  }}
                  placeholder="0912 345 678"
                />
              )}
            </Field>

            <Field id="custom-idea-email" label={'Email nhận báo giá & phương án'} required error={errors.clientEmail}>
              {(control) => (
                <Input
                  {...control}
                  type="email"
                  value={clientEmail}
                  onChange={(e) => {
                    setClientEmail(e.target.value);
                    if (errors.clientEmail) setErrors((prev) => ({ ...prev, clientEmail: '' }));
                  }}
                  placeholder="ban@congty.vn"
                />
              )}
            </Field>

            <Field id="custom-idea-company" label="Đơn vị / Doanh nghiệp" optionalLabel="(không bắt buộc)">
              {(control) => (
                <Input
                  {...control}
                  value={clientCompany}
                  onChange={(e) => setClientCompany(e.target.value)}
                  placeholder="Công ty TNHH Cơ Khí Kỹ Thuật"
                />
              )}
            </Field>
          </div>
        </div>

        {/* Section 2: Project specifications */}
        <div className="rounded-lg bg-surface p-4 shadow-soft">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-fg-muted">
            {'02 · Chi tiết dự án & ý tưởng cần dựng'}
          </h4>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field id="custom-idea-title" label="Tên dự án / Linh kiện ý tưởng" required error={errors.title}>
                {(control) => (
                  <Input
                    {...control}
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      if (errors.title) setErrors((prev) => ({ ...prev, title: '' }));
                    }}
                    placeholder="Vỏ hộp điều khiển IoT chống nước"
                  />
                )}
              </Field>

              <Field id="custom-idea-category" label="Phân loại ứng dụng kỹ thuật" required>
                {(control) => (
                  <Select
                    {...control}
                    value={serviceType}
                    onChange={(e) => setServiceType(e.target.value)}
                    options={categoryOptions}
                  />
                )}
              </Field>
            </div>

            <Field
              id="custom-idea-desc"
              label={'Mô tả chi tiết ý tưởng & yêu cầu kỹ thuật'}
              required
              error={errors.description}
              hint="Nêu rõ kích thước ước tính (D × R × C mm), môi trường làm việc (chịu nhiệt, chịu lực, ren vặn) hoặc liên kết bản vẽ sơ bộ."
            >
              {(control) => (
                <textarea
                  id={control.id}
                  required={control.required}
                  aria-invalid={control['aria-invalid']}
                  aria-describedby={control['aria-describedby']}
                  rows={4}
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    if (errors.description) setErrors((prev) => ({ ...prev, description: '' }));
                  }}
                  placeholder="Ví dụ: Cần dựng mô hình vỏ hộp chứa mạch ESP32 kích thước ~100x60x35mm, có rãnh gioăng cao su, 4 lỗ ren cấy M3, chịu nhiệt độ làm việc ngoài trời khoảng 60°C..."
                  className="w-full rounded-md border border-line-control bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-subtle transition-colors duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                />
              )}
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field id="custom-idea-material" label="Vật liệu dự kiến">
                {(control) => (
                  <Select
                    {...control}
                    value={material}
                    onChange={(e) => setMaterial(e.target.value)}
                    options={materialOptions}
                  />
                )}
              </Field>

              <Field id="custom-idea-budget" label="Ngân sách dự kiến">
                {(control) => (
                  <Select
                    {...control}
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    options={budgetOptions}
                  />
                )}
              </Field>

              <Field id="custom-idea-deadline" label="Tiến độ mong muốn">
                {(control) => (
                  <Select
                    {...control}
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    options={deadlineOptions}
                  />
                )}
              </Field>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-line-subtle">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            Hủy bỏ
          </Button>

          <Button
            type="submit"
            loading={isSubmitting}
            leadingIcon={<Icon name="send" size={16} />}
            className="w-full sm:w-auto"
          >
            Gửi Yêu Cầu Tư Vấn Ý Tưởng
          </Button>
        </div>
      </form>
    </Modal>
  );
};
