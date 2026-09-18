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
import { useLanguage } from '../../context/LanguageContext';
import { Icon, InfoTip } from '@frontend/ui';
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
function validate(form: FormState, isVi: boolean): FormErrors {
  const errors: FormErrors = {};
  if (!isValidTaxCode(form.taxCode)) {
    errors.taxCode = isVi
      ? 'Mã số thuế phải là 10 chữ số, hoặc 10 chữ số + "-" + 3 chữ số.'
      : 'Tax code must be 10 digits, or 10 digits + "-" + 3 digits.';
  }
  if (!isValidHotline(form.hotline)) {
    errors.hotline = isVi
      ? 'Hotline không hợp lệ (8–20 ký tự, tối thiểu 8 chữ số).'
      : 'Invalid hotline (8–20 characters, at least 8 digits).';
  }
  if (!isValidEmail(form.contactEmail)) {
    errors.contactEmail = isVi ? 'Email liên hệ không hợp lệ.' : 'Invalid contact email.';
  }
  if (!isValidBankAccount(form.bankAccount)) {
    errors.bankAccount = isVi ? 'Số tài khoản chỉ được chứa chữ số.' : 'Bank account must contain digits only.';
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

const TextField: React.FC<TextFieldProps> = ({ id, label, value, onChange, error, hint, mono }) => (
  <div className="space-y-1">
    <label htmlFor={id} className="block font-bold text-fg">
      {label}
    </label>
    <input
      id={id}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? `${id}-error` : undefined}
      className={`w-full p-2.5 border rounded-lg text-xs bg-canvas text-fg ${
        error ? 'border-danger' : 'border-line-control'
      } ${mono ? 'font-tech' : ''}`}
    />
    {error ? (
      <p id={`${id}-error`} role="alert" className="text-xs font-bold text-danger">
        {error}
      </p>
    ) : hint ? (
      <p className="text-xs text-fg-muted">{hint}</p>
    ) : null}
  </div>
);

interface TextAreaFieldProps extends Omit<TextFieldProps, 'mono'> {
  rows?: number;
}

const TextAreaField: React.FC<TextAreaFieldProps> = ({ id, label, value, onChange, error, hint, rows = 3 }) => (
  <div className="space-y-1">
    <label htmlFor={id} className="block font-bold text-fg">
      {label}
    </label>
    <textarea
      id={id}
      rows={rows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? `${id}-error` : undefined}
      className={`w-full p-2.5 border rounded-lg text-xs bg-canvas text-fg ${
        error ? 'border-danger' : 'border-line-control'
      }`}
    />
    {error ? (
      <p id={`${id}-error`} role="alert" className="text-xs font-bold text-danger">
        {error}
      </p>
    ) : hint ? (
      <p className="text-xs text-fg-muted">{hint}</p>
    ) : null}
  </div>
);

export const AdminSettingsPanel: React.FC<AdminSettingsPanelProps> = ({ onShowToast }) => {
  const { language } = useLanguage();
  const isVi = language === 'vi';

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

  const clientErrors = useMemo(() => validate(form, isVi), [form, isVi]);
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
        isVi
          ? 'Chưa lưu: dữ liệu không hợp lệ — xem lỗi ngay cạnh ô nhập.'
          : 'Not saved: invalid data — see the error next to each field.'
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
        (isVi ? 'Lưu thất bại: ' : 'Save failed: ') + (result.error ?? (isVi ? 'lỗi không xác định' : 'unknown error'))
      );
      return;
    }

    setServerErrors({});
    setDirty(false);
    setForm(toForm(result.data));
    onShowToast(
      isVi
        ? 'Đã lưu cấu hình pháp lý vào Supabase (bảng app_settings).'
        : 'Legal settings saved to Supabase (app_settings table).'
    );
  };

  const statusText = loading
    ? isVi
      ? 'Đang nạp cấu hình từ bảng app_settings…'
      : 'Loading settings from the app_settings table…'
    : error
      ? (isVi ? 'Lỗi khi đọc app_settings: ' : 'Failed to read app_settings: ') + error
      : data
        ? (isVi ? 'Đã nạp từ app_settings.' : 'Loaded from app_settings.') +
          (data.updatedAt ? (isVi ? ' Cập nhật lần cuối: ' : ' Last updated: ') + data.updatedAt : '')
        : isVi
          ? 'Bảng app_settings chưa có hàng cấu hình — các ô dưới đang trống. Lưu để tạo cấu hình đầu tiên.'
          : 'app_settings has no configured row — the fields below are empty. Save to create the first configuration.';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-surface p-5 sm:p-6 rounded-lg flex flex-col md:flex-row md:items-start justify-between gap-4 shadow-e1">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 bg-accent/20 text-primary font-tech text-xs font-bold rounded-sm border border-accent/40 uppercase tracking-widest">
              APP_SETTINGS // PHÁP LÝ
            </span>
            <span className="text-xs text-fg-muted">
              {isVi ? 'Nguồn dữ liệu: Supabase · bảng app_settings' : 'Source: Supabase · app_settings table'}
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-fg mt-1 flex items-center gap-2">
            <Icon name="settings" size={24} className="text-primary" />
            {isVi ? 'Cài Đặt Pháp Lý & Định Danh' : 'Legal & Identity Settings'}
          </h2>
          <div className="mt-0.5">
            <InfoTip label={isVi ? 'Mục này gồm những trường nào?' : 'Which fields does this section hold?'}>
              {isVi
                ? 'Tên pháp nhân, mã số thuế, địa chỉ xuất hoá đơn, hotline, email, tài khoản ngân hàng, điều khoản bảo hành và chính sách đặt cọc. Ô để trống nghĩa là CHƯA CẤU HÌNH — hệ thống không tự điền giá trị đoán.'
                : 'Legal name, tax code, invoice address, hotline, email, bank account, warranty terms and deposit policy. An empty field means NOT CONFIGURED — the app never fills in a guessed value.'}
            </InfoTip>
          </div>
          <p
            id="app-settings-load-status"
            role="status"
            className={`text-xs mt-2 ${error ? 'font-bold text-danger' : 'text-fg-muted'}`}
          >
            {statusText}
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-primary hover:bg-primary-hover text-primary-fg text-xs font-bold uppercase rounded-lg transition-colors flex items-center gap-1.5 shadow-e1 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Icon name="save" size={16} />
          {saving ? (isVi ? 'Đang lưu…' : 'Saving…') : isVi ? 'Lưu Cài Đặt' : 'Save Settings'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Pháp nhân & xuất hoá đơn */}
        <div className="bg-surface rounded-lg p-5 shadow-e1 space-y-4">
          <h3 className="font-bold text-sm text-fg flex items-center gap-2 border-b border-line pb-3">
            <Icon name="domain" size={24} className="text-primary" />
            {isVi ? 'Pháp Nhân & Xuất Hoá Đơn' : 'Legal Entity & Invoicing'}
          </h3>

          <div className="space-y-3 text-xs">
            <TextField
              id="app-settings-legal-name"
              label={isVi ? 'Tên pháp nhân / công ty' : 'Legal entity / company name'}
              value={form.legalName}
              onChange={update('legalName')}
              hint={isVi ? 'In trên hoá đơn. Trống = chưa cấu hình.' : 'Printed on invoices. Empty = not configured.'}
            />
            <TextField
              id="app-settings-tax-code"
              label={isVi ? 'Mã số thuế (MST)' : 'Tax code'}
              value={form.taxCode}
              onChange={update('taxCode')}
              error={errors.taxCode}
              mono
              hint={
                isVi
                  ? 'Chưa khai báo — hoá đơn sẽ không in mã số thuế nào.'
                  : 'Not declared — invoices will print no tax code.'
              }
            />
            <TextField
              id="app-settings-invoice-address"
              label={isVi ? 'Địa chỉ xuất hoá đơn' : 'Invoice address'}
              value={form.invoiceAddress}
              onChange={update('invoiceAddress')}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <TextField
                id="app-settings-bank-account"
                label={isVi ? 'Số tài khoản ngân hàng' : 'Bank account number'}
                value={form.bankAccount}
                onChange={update('bankAccount')}
                error={errors.bankAccount}
                mono
              />
              <TextField
                id="app-settings-bank-name"
                label={isVi ? 'Ngân hàng' : 'Bank name'}
                value={form.bankName}
                onChange={update('bankName')}
              />
            </div>
          </div>
        </div>

        {/* Liên hệ & chính sách */}
        <div className="bg-surface rounded-lg p-5 shadow-e1 space-y-4">
          <h3 className="font-bold text-sm text-fg flex items-center gap-2 border-b border-line pb-3">
            <Icon name="receipt_long" size={24} className="text-primary" />
            {isVi ? 'Liên Hệ & Chính Sách' : 'Contact & Policies'}
          </h3>

          <div className="space-y-3 text-xs">
            <TextField
              id="app-settings-hotline"
              label={isVi ? 'Hotline' : 'Hotline'}
              value={form.hotline}
              onChange={update('hotline')}
              error={errors.hotline}
              mono
              hint={
                isVi
                  ? 'Chưa khai báo — mọi nơi hiển thị hotline sẽ ẩn dòng liên hệ.'
                  : 'Not declared — any hotline line will be hidden.'
              }
            />
            <TextField
              id="app-settings-contact-email"
              label={isVi ? 'Email liên hệ' : 'Contact email'}
              value={form.contactEmail}
              onChange={update('contactEmail')}
              error={errors.contactEmail}
              mono
            />
            <TextAreaField
              id="app-settings-warranty-terms"
              label={isVi ? 'Điều khoản bảo hành' : 'Warranty terms'}
              value={form.warrantyTerms}
              onChange={update('warrantyTerms')}
              rows={3}
              hint={
                isVi
                  ? 'Trống = chưa có cam kết bảo hành nào được in cho khách.'
                  : 'Empty = no warranty commitment is shown to customers.'
              }
            />
            <TextAreaField
              id="app-settings-deposit-policy"
              label={isVi ? 'Chính sách đặt cọc' : 'Deposit policy'}
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
