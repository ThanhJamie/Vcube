/**
 * AdminSettingsPanel — cấu hình PHÁP LÝ & ĐỊNH DANH thật, nối bảng `app_settings`.
 *
 * TRƯỚC ĐỢT 6 (`docs/plans/13-dot6-briefs.md` §0, `docs/plans/09-admin-settings.md` §1):
 * đây là FORM CHẾT — 5 `useState` local, `handleSave()` chỉ hiện một toast nói rằng
 * chưa có nơi lưu cấu hình, **0 request ghi DB**. Admin tưởng đã lưu nhưng không có gì
 * được lưu (vi phạm `docs/design/data-honesty.md`).
 *
 * NAY:
 *   * Nạp thật 9 cột đã tồn tại của `app_settings` (`mappers.ts` §app_settings).
 *   * Lưu thật qua `settingsService.saveAppSettings()` — KHÔNG tự viết
 *     `.from('app_settings')` trong component; service đã lo validate + audit + cache.
 *   * Validate ngay cạnh ô nhập bằng validator có sẵn của service
 *     (`isValidTaxCode` / `isValidHotline` / `isValidEmail` / `isValidBankAccount`),
 *     chặn lưu khi sai. Lỗi do service/DB trả về cũng được gắn vào đúng ô nhập.
 *   * `''` ⇒ gửi `null` = CHƯA CẤU HÌNH (service cũng quy `''` → `null`), và ô MST
 *     rỗng nói rõ "chưa khai báo" thay vì để admin tưởng đã có mã.
 *   * ĐÃ XOÁ 2 công tắc `autoInvoice` / `telemetryLogging`: không có cột nào trong
 *     `app_settings` lưu chúng ⇒ giữ lại chỉ đẻ ra công tắc giả.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Button, Field, Icon, InfoTip, Input } from '@frontend/ui';
import { useAppSettings } from '../../hooks/useSettings';
import {
  isValidBankAccount,
  isValidEmail,
  isValidHotline,
  isValidTaxCode,
  saveAppSettings,
} from '@backend/services/settingsService';
import type { AppSettings } from '@backend/supabase/mappers';

interface AdminSettingsPanelProps {
  onShowToast: (message: string) => void;
}

interface FormState {
  legalName: string;
  taxCode: string;
  invoiceAddress: string;
  hotline: string;
  contactEmail: string;
  bankAccount: string;
  bankName: string;
  warrantyTerms: string;
  depositPolicy: string;
}

type FormErrors = Partial<Record<keyof FormState, string>>;

const EMPTY_FORM: FormState = {
  legalName: '',
  taxCode: '',
  invoiceAddress: '',
  hotline: '',
  contactEmail: '',
  bankAccount: '',
  bankName: '',
  warrantyTerms: '',
  depositPolicy: '',
};

/** `null` = chưa cấu hình (trung thực) — KHÔNG truyền chuỗi rỗng xuống DB. */
const blankToNull = (v: string): string | null => (v.trim() === '' ? null : v.trim());

const toForm = (d: AppSettings | null): FormState => ({
  legalName: d?.legalName ?? '',
  taxCode: d?.taxCode ?? '',
  invoiceAddress: d?.invoiceAddress ?? '',
  hotline: d?.hotline ?? '',
  contactEmail: d?.contactEmail ?? '',
  bankAccount: d?.bankAccount ?? '',
  bankName: d?.bankName ?? '',
  warrantyTerms: d?.warrantyTerms ?? '',
  depositPolicy: d?.depositPolicy ?? '',
});

/** Luật y hệt `settingsService.VALIDATORS['app_settings.*']` — bản client để báo sớm. */
function validate(form: FormState): FormErrors {
  const errors: FormErrors = {};
  if (!isValidTaxCode(form.taxCode)) {
    errors.taxCode = 'Mã số thuế phải là 10 chữ số, hoặc 10 chữ số + "-" + 3 chữ số.';
  }
  if (!isValidHotline(form.hotline)) {
    errors.hotline = 'Đường dây nóng không hợp lệ (8–20 ký tự, tối thiểu 8 chữ số).';
  }
  if (!isValidEmail(form.contactEmail)) {
    errors.contactEmail = 'Email liên hệ không hợp lệ.';
  }
  if (!isValidBankAccount(form.bankAccount)) {
    errors.bankAccount = 'Số tài khoản chỉ được chứa chữ số.';
  }
  return errors;
}

interface TextFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  mono?: boolean;
}

const TEXTAREA_CLASS = [
  'w-full rounded-md border border-line-control bg-surface px-3 py-2 text-sm text-fg',
  'placeholder:text-fg-subtle transition-colors duration-200 ease-out motion-reduce:transition-none',
  'focus:outline-none focus:border-primary focus:ring-2 focus:ring-ring aria-invalid:border-danger',
].join(' ');

const TextField: React.FC<TextFieldProps> = ({ id, label, value, onChange, error, hint, mono }) => (
  <Field id={id} label={label} error={error} hint={hint} optionalLabel={null}>
    {(control) => (
      <Input
        {...control}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={mono ? 'font-mono' : undefined}
      />
    )}
  </Field>
);

interface TextAreaFieldProps extends Omit<TextFieldProps, 'mono'> {
  rows?: number;
}

const TextAreaField: React.FC<TextAreaFieldProps> = ({ id, label, value, onChange, error, hint, rows = 3 }) => (
  <Field id={id} label={label} error={error} hint={hint} optionalLabel={null}>
    {(control) => (
      <textarea
        {...control}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={TEXTAREA_CLASS}
      />
    )}
  </Field>
);

export const AdminSettingsPanel: React.FC<AdminSettingsPanelProps> = ({ onShowToast }) => {

  const { data, loading, error } = useAppSettings();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverErrors, setServerErrors] = useState<FormErrors>({});

  // Nạp giá trị thật vào form. Không đè lên thay đổi admin đang gõ dở.
  useEffect(() => {
    if (dirty) return;
    setForm(toForm(data));
  }, [data, dirty]);

  const clientErrors = useMemo(() => validate(form), [form]);
  const errors: FormErrors = { ...clientErrors, ...serverErrors };

  const update = (key: keyof FormState) => (value: string) => {
    setDirty(true);
    setForm((prev) => ({ ...prev, [key]: value }));
    setServerErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSave = async () => {
    if (Object.keys(clientErrors).length > 0) {
      onShowToast(
        'Chưa lưu: dữ liệu không hợp lệ — xem lỗi ngay cạnh ô nhập.'
      );
      return;
    }

    setSaving(true);
    const patch: Partial<AppSettings> = {
      legalName: blankToNull(form.legalName),
      taxCode: blankToNull(form.taxCode),
      invoiceAddress: blankToNull(form.invoiceAddress),
      hotline: blankToNull(form.hotline),
      contactEmail: blankToNull(form.contactEmail),
      bankAccount: blankToNull(form.bankAccount),
      bankName: blankToNull(form.bankName),
      warrantyTerms: blankToNull(form.warrantyTerms),
      depositPolicy: blankToNull(form.depositPolicy),
    };

    const result = await saveAppSettings(patch);
    setSaving(false);

    if (!result.success || !result.data) {
      const mapped: FormErrors = {};
      for (const issue of result.issues ?? []) {
        mapped[issue.field as keyof FormState] = issue.message;
      }
      setServerErrors(mapped);
      onShowToast(
        ('Lưu thất bại: ') + (result.error ?? ('lỗi không xác định'))
      );
      return;
    }

    setServerErrors({});
    setDirty(false);
    setForm(toForm(result.data));
    onShowToast(
      'Đã lưu cấu hình pháp lý vào Supabase (bảng app_settings).'
    );
  };

  const statusText = loading
    ? 'Đang nạp cấu hình từ bảng app_settings…'
    : error
      ? ('Lỗi khi đọc app_settings: ') + error
      : data
        ? ('Đã nạp từ app_settings.') +
          (data.updatedAt ? (' Cập nhật lần cuối: ') + data.updatedAt : '')
        : 'Bảng app_settings chưa có hàng cấu hình — các ô dưới đang trống. Lưu để tạo cấu hình đầu tiên.';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="rounded-xl border border-line bg-surface p-6 sm:p-8 flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 bg-primary-tint text-fg font-mono text-xs font-semibold rounded-sm border border-line uppercase tracking-wider">
              CẤU HÌNH HỆ THỐNG // PHÁP LÝ
            </span>
            <span className="text-xs text-fg-subtle">
              Nguồn dữ liệu: Supabase · bảng app_settings
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-fg mt-2 flex items-center gap-2">
            <Icon name="settings" size={24} className="text-primary" />
            {'Cài Đặt Pháp Lý & Định Danh'}
          </h2>
          <div className="mt-0.5">
            <InfoTip label="Mục này gồm những trường nào?">
              Tên pháp nhân, mã số thuế, địa chỉ xuất hoá đơn, đường dây nóng, email, tài khoản ngân hàng, điều khoản bảo hành và chính sách đặt cọc. Ô để trống nghĩa là CHƯA CẤU HÌNH — hệ thống không tự điền giá trị đoán.
            </InfoTip>
          </div>
          <p
            id="app-settings-load-status"
            role="status"
            className={`text-xs mt-2 ${error ? 'font-medium text-danger' : 'text-fg-subtle'}`}
          >
            {statusText}
          </p>
        </div>

        <Button
          variant="primary"
          loading={saving}
          loadingLabel="Đang lưu…"
          leadingIcon={<Icon name="save" size={16} />}
          onClick={handleSave}
        >
          {saving ? ('Đang lưu…') : 'Lưu Cài Đặt'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Pháp nhân & xuất hoá đơn */}
        <div className="rounded-lg border border-line-subtle bg-surface p-6 space-y-5">
          <h3 className="text-base font-semibold tracking-tight text-fg flex items-center gap-2 border-b border-line-subtle pb-3">
            <Icon name="domain" size={20} className="text-fg-muted" />
            {'Pháp Nhân & Xuất Hoá Đơn'}
          </h3>

          <div className="space-y-4">
            <TextField
              id="app-settings-legal-name"
              label="Tên pháp nhân / công ty"
              value={form.legalName}
              onChange={update('legalName')}
              hint="In trên hoá đơn. Trống = chưa cấu hình."
            />
            <TextField
              id="app-settings-tax-code"
              label="Mã số thuế (MST)"
              value={form.taxCode}
              onChange={update('taxCode')}
              error={errors.taxCode}
              mono
              hint="Chưa khai báo — hoá đơn sẽ không in mã số thuế nào."
            />
            <TextField
              id="app-settings-invoice-address"
              label="Địa chỉ xuất hoá đơn"
              value={form.invoiceAddress}
              onChange={update('invoiceAddress')}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField
                id="app-settings-bank-account"
                label="Số tài khoản ngân hàng"
                value={form.bankAccount}
                onChange={update('bankAccount')}
                error={errors.bankAccount}
                mono
              />
              <TextField
                id="app-settings-bank-name"
                label="Ngân hàng"
                value={form.bankName}
                onChange={update('bankName')}
              />
            </div>
          </div>
        </div>

        {/* Liên hệ & chính sách */}
        <div className="rounded-lg border border-line-subtle bg-surface p-6 space-y-5">
          <h3 className="text-base font-semibold tracking-tight text-fg flex items-center gap-2 border-b border-line-subtle pb-3">
            <Icon name="receipt_long" size={20} className="text-fg-muted" />
            {'Liên Hệ & Chính Sách'}
          </h3>

          <div className="space-y-4">
            <TextField
              id="app-settings-hotline"
              label="Đường dây nóng"
              value={form.hotline}
              onChange={update('hotline')}
              error={errors.hotline}
              mono
              hint="Chưa khai báo — mọi nơi hiển thị đường dây nóng sẽ ẩn dòng liên hệ."
            />
            <TextField
              id="app-settings-contact-email"
              label="Email liên hệ"
              value={form.contactEmail}
              onChange={update('contactEmail')}
              error={errors.contactEmail}
              mono
            />
            <TextAreaField
              id="app-settings-warranty-terms"
              label="Điều khoản bảo hành"
              value={form.warrantyTerms}
              onChange={update('warrantyTerms')}
              rows={3}
              hint="Trống = chưa có cam kết bảo hành nào được in cho khách."
            />
            <TextAreaField
              id="app-settings-deposit-policy"
              label="Chính sách đặt cọc"
              value={form.depositPolicy}
              onChange={update('depositPolicy')}
              rows={3}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
