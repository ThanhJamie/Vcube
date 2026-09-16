import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
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
  const { language } = useLanguage();
  const isVi = language === 'vi';
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
      errs.clientName = isVi ? 'Vui lòng nhập họ và tên của bạn.' : 'Please enter your full name.';
    }

    if (!clientPhone.trim()) {
      errs.clientPhone = isVi ? 'Vui lòng nhập số điện thoại hoặc Zalo.' : 'Please enter your phone number.';
    } else if (!/^[0-9+ ]{8,15}$/.test(clientPhone.trim())) {
      errs.clientPhone = isVi ? 'Số điện thoại không hợp lệ (8 - 15 chữ số).' : 'Invalid phone number format.';
    }

    if (!clientEmail.trim()) {
      errs.clientEmail = isVi ? 'Vui lòng nhập email nhận báo giá.' : 'Please enter your email.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail.trim())) {
      errs.clientEmail = isVi ? 'Địa chỉ email không hợp lệ.' : 'Invalid email format.';
    }

    if (!title.trim()) {
      errs.title = isVi ? 'Vui lòng nhập tên dự án hoặc ý tưởng.' : 'Please enter a project title.';
    }

    if (!description.trim()) {
      errs.description = isVi
        ? 'Vui lòng mô tả sơ lược yêu cầu, công năng hoặc kích thước dự kiến.'
        : 'Please describe your idea, dimensions, or functional requirements.';
    } else if (description.trim().length < 10) {
      errs.description = isVi
        ? 'Mô tả cần ít nhất 10 ký tự để kỹ sư có đủ thông tin sơ bộ.'
        : 'Description must be at least 10 characters.';
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
        under_1m: isVi ? 'Dưới 1.000.000 đ' : '< 1,000,000 VND',
        '1m-3m': isVi ? '1.000.000 đ - 3.000.000 đ' : '1,000,000 - 3,000,000 VND',
        '3m-10m': isVi ? '3.000.000 đ - 10.000.000 đ' : '3,000,000 - 10,000,000 VND',
        above_10m: isVi ? 'Trên 10.000.000 đ' : '> 10,000,000 VND',
        flexible: isVi ? 'Cần kỹ sư ước tính' : 'To be estimated by engineer',
      };

      const deadlineLabels: Record<string, string> = {
        urgent: isVi ? 'Gấp (1 - 3 ngày làm việc)' : 'Urgent (1 - 3 business days)',
        standard: isVi ? 'Tiêu chuẩn (5 - 7 ngày làm việc)' : 'Standard (5 - 7 business days)',
        flexible: isVi ? 'Linh hoạt theo phương án' : 'Flexible timeline',
      };

      const materialLabels: Record<string, string> = {
        'pla-petg': 'PLA / PETG (Tiêu chuẩn kỹ thuật)',
        'abs-pc': 'ABS / PC (Chịu nhiệt & va đập)',
        'pa12-cf': 'Nylon PA12-CF (Sợi Carbon siêu bền)',
        'tough-resin': 'Tough Resin (Chi tiết siêu nét)',
        'tpu-95a': 'TPU 95A (Cao su đàn hồi chống va chạm)',
        consult: isVi ? 'Kỹ sư đề xuất vật liệu phù hợp' : 'Engineer to advise suitable material',
      };

      await customDesignService.createRequest({
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

      const successMsg = isVi
        ? 'Đã gửi yêu cầu tư vấn ý tưởng CAD 3D thành công! Kỹ sư VCUBE sẽ liên hệ lại sớm nhất.'
        : 'Custom 3D CAD request submitted successfully! A VCUBE engineer will reach out to you shortly.';

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
      const errMsg = isVi
        ? `Không thể gửi yêu cầu: ${err?.message || 'Vui lòng thử lại sau.'}`
        : `Failed to submit request: ${err?.message || 'Please try again later.'}`;
      if (onShowToast) {
        onShowToast(errMsg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const categoryOptions = [
    { value: 'jigs', label: isVi ? 'Đồ gá & Dụng cụ xưởng (Jigs & Fixtures)' : 'Jigs, Fixtures & Tooling' },
    { value: 'iot', label: isVi ? 'Vỏ hộp điện tử & Thiết bị IoT' : 'IoT & Electronics Enclosures' },
    { value: 'mechanical', label: isVi ? 'Cơ cấu truyền động & Bánh răng' : 'Motion Mechanisms & Gears' },
    { value: 'robotics', label: isVi ? 'Khung Drone & Tay gắp Robot' : 'Drone & Robotics Mechanisms' },
    { value: 'architecture', label: isVi ? 'Khớp nối Module & Sa bàn mô phỏng' : 'Modular Joints & Architectural Models' },
    { value: 'custom_cad', label: isVi ? 'Ứng dụng cơ khí tùy biến khác' : 'Other Custom Engineering CAD' },
  ];

  const materialOptions = [
    { value: 'pla-petg', label: isVi ? 'PLA / PETG (Tiêu chuẩn kỹ thuật)' : 'PLA / PETG (Standard Engineering)' },
    { value: 'abs-pc', label: isVi ? 'ABS / PC (Chịu nhiệt & va đập)' : 'ABS / PC (Heat & Impact Resistant)' },
    { value: 'pa12-cf', label: isVi ? 'Nylon PA12-CF (Gia cường sợi Carbon)' : 'Nylon PA12-CF (Carbon Fiber Reinforced)' },
    { value: 'tough-resin', label: isVi ? 'Tough Resin (Bề mặt siêu nét & mịn)' : 'Tough Resin (Ultra-smooth & Fine Detail)' },
    { value: 'tpu-95a', label: isVi ? 'TPU 95A (Cao su đàn hồi giảm chấn)' : 'TPU 95A (Elastomer & Shock Absorption)' },
    { value: 'consult', label: isVi ? 'Nhờ kỹ sư VCUBE đề xuất vật liệu tối ưu' : 'Advise optimal material for my use case' },
  ];

  const budgetOptions = [
    { value: 'under_1m', label: isVi ? 'Dưới 1.000.000 đ' : '< 1,000,000 VND' },
    { value: '1m-3m', label: isVi ? '1.000.000 đ - 3.000.000 đ' : '1,000,000 - 3,000,000 VND' },
    { value: '3m-10m', label: isVi ? '3.000.000 đ - 10.000.000 đ' : '3,000,000 - 10,000,000 VND' },
    { value: 'above_10m', label: isVi ? 'Trên 10.000.000 đ (Dự án công nghiệp)' : '> 10,000,000 VND (Industrial project)' },
    { value: 'flexible', label: isVi ? 'Linh hoạt / Kỹ sư báo giá phương án' : 'Flexible / Quoted by engineering brief' },
  ];

  const deadlineOptions = [
    { value: 'urgent', label: isVi ? 'Gấp (1 - 3 ngày làm việc)' : 'Urgent (1 - 3 business days)' },
    { value: 'standard', label: isVi ? 'Tiêu chuẩn (5 - 7 ngày làm việc)' : 'Standard (5 - 7 business days)' },
    { value: 'flexible', label: isVi ? 'Linh hoạt theo tiến độ dự án' : 'Flexible with project milestone' },
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
              {isVi ? 'Đăng Ký Dịch Vụ Dựng Mô Hình 3D Từ Ý Tưởng' : 'Custom 3D CAD Modeling by Idea Request'}
            </h3>
            <span className="text-xs text-fg-muted font-sans font-normal block mt-0.5">
              {isVi
                ? 'Tiếp nhận phác thảo sơ bộ, dựng CAD chuẩn kỹ thuật & in thử nghiệm 1:1'
                : 'Intake concept sketches, build parametric 3D CAD & rapid physical prototyping'}
            </span>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5 pt-2">
        {/* Info callout card */}
        <Card padding="md" className="bg-surface-muted border-line-subtle">
          <div className="flex items-start gap-3">
            <Icon name="info" size={18} className="text-primary shrink-0 mt-0.5" />
            <div className="text-xs text-fg-muted leading-relaxed">
              {isVi ? (
                <>
                  <strong className="text-fg font-semibold block mb-0.5">Quy trình tiếp nhận & bảo mật bản quyền:</strong>
                  Bạn có thể cung cấp bản vẽ tay, ảnh chụp hiện trạng hoặc kích thước sơ bộ. Đội ngũ kỹ sư VCUBE sẽ phân tích tính khả thi chế tạo (DFM), bảo mật 100% ý tưởng và liên hệ gửi báo giá dự toán trong vòng 24 giờ làm việc.
                </>
              ) : (
                <>
                  <strong className="text-fg font-semibold block mb-0.5">Ingestion & IP Confidentiality Protocol:</strong>
                  Provide hand sketches, reference photos, or functional constraints. VCUBE engineers will analyze manufacturing feasibility (DFAM), ensure strict NDA confidentiality, and respond with a formal quote within 24 business hours.
                </>
              )}
            </div>
          </div>
        </Card>

        {/* Section 1: Contact info */}
        <div>
          <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-primary mb-3">
            {isVi ? '01 // Thông Tin Người Đăng Ký' : '01 // Contact Information'}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field id="custom-idea-name" label={isVi ? 'Họ và tên' : 'Full Name'} required error={errors.clientName}>
              {(control) => (
                <Input
                  {...control}
                  value={clientName}
                  onChange={(e) => {
                    setClientName(e.target.value);
                    if (errors.clientName) setErrors((prev) => ({ ...prev, clientName: '' }));
                  }}
                  placeholder={isVi ? 'Nguyễn Văn A' : 'John Doe'}
                />
              )}
            </Field>

            <Field id="custom-idea-phone" label={isVi ? 'Số điện thoại / Zalo' : 'Phone / WhatsApp'} required error={errors.clientPhone}>
              {(control) => (
                <Input
                  {...control}
                  type="tel"
                  value={clientPhone}
                  onChange={(e) => {
                    setClientPhone(e.target.value);
                    if (errors.clientPhone) setErrors((prev) => ({ ...prev, clientPhone: '' }));
                  }}
                  placeholder={isVi ? '0912 345 678' : '+84 912 345 678'}
                />
              )}
            </Field>

            <Field id="custom-idea-email" label={isVi ? 'Email nhận báo giá & phương án' : 'Email Address'} required error={errors.clientEmail}>
              {(control) => (
                <Input
                  {...control}
                  type="email"
                  value={clientEmail}
                  onChange={(e) => {
                    setClientEmail(e.target.value);
                    if (errors.clientEmail) setErrors((prev) => ({ ...prev, clientEmail: '' }));
                  }}
                  placeholder="contact@company.com"
                />
              )}
            </Field>

            <Field id="custom-idea-company" label={isVi ? 'Đơn vị / Doanh nghiệp' : 'Company / Organization'} optionalLabel={isVi ? '(không bắt buộc)' : '(optional)'}>
              {(control) => (
                <Input
                  {...control}
                  value={clientCompany}
                  onChange={(e) => setClientCompany(e.target.value)}
                  placeholder={isVi ? 'Công ty TNHH Cơ Khí Kỹ Thuật' : 'Engineering Corp'}
                />
              )}
            </Field>
          </div>
        </div>

        {/* Section 2: Project specifications */}
        <div>
          <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-primary mb-3">
            {isVi ? '02 // Chi Tiết Dự Án & Ý Tưởng Cần Dựng' : '02 // Project & Concept Details'}
          </h4>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field id="custom-idea-title" label={isVi ? 'Tên dự án / Linh kiện ý tưởng' : 'Project / Component Title'} required error={errors.title}>
                {(control) => (
                  <Input
                    {...control}
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      if (errors.title) setErrors((prev) => ({ ...prev, title: '' }));
                    }}
                    placeholder={isVi ? 'Vỏ hộp điều khiển IoT chống nước' : 'Waterproof IoT Controller Enclosure'}
                  />
                )}
              </Field>

              <Field id="custom-idea-category" label={isVi ? 'Phân loại ứng dụng kỹ thuật' : 'Application Category'} required>
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
              label={isVi ? 'Mô tả chi tiết ý tưởng & yêu cầu kỹ thuật' : 'Detailed Concept Description & Criteria'}
              required
              error={errors.description}
              hint={
                isVi
                  ? 'Nêu rõ kích thước ước tính (D × R × C mm), môi trường làm việc (chịu nhiệt, chịu lực, ren vặn) hoặc liên kết bản vẽ sơ bộ.'
                  : 'Specify approximate dimensions (L × W × H mm), operating environment (heat, stress, fasteners), or preliminary links.'
              }
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
                  placeholder={
                    isVi
                      ? 'Ví dụ: Cần dựng mô hình vỏ hộp chứa mạch ESP32 kích thước ~100x60x35mm, có rãnh gioăng cao su, 4 lỗ ren cấy M3, chịu nhiệt độ làm việc ngoài trời khoảng 60°C...'
                      : 'E.g.: Need a custom enclosure for an ESP32 board (~100x60x35mm), sealing groove, 4x M3 brass threaded inserts, operating outdoors at ~60°C...'
                  }
                  className="w-full rounded-md border border-line-control bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                />
              )}
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field id="custom-idea-material" label={isVi ? 'Vật liệu dự kiến' : 'Target Material'}>
                {(control) => (
                  <Select
                    {...control}
                    value={material}
                    onChange={(e) => setMaterial(e.target.value)}
                    options={materialOptions}
                  />
                )}
              </Field>

              <Field id="custom-idea-budget" label={isVi ? 'Ngân sách dự kiến' : 'Target Budget'}>
                {(control) => (
                  <Select
                    {...control}
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    options={budgetOptions}
                  />
                )}
              </Field>

              <Field id="custom-idea-deadline" label={isVi ? 'Tiến độ mong muốn' : 'Target Timeline'}>
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
            {isVi ? 'Hủy bỏ' : 'Cancel'}
          </Button>

          <Button
            type="submit"
            loading={isSubmitting}
            leadingIcon={<Icon name="send" size={16} />}
            className="w-full sm:w-auto"
          >
            {isVi ? 'Gửi Yêu Cầu Tư Vấn Ý Tưởng' : 'Submit Concept Request'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
