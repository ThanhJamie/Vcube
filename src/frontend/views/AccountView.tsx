import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Badge, Button, Card, EmptyState, Field, Icon, Input } from '@frontend/ui';
import { dbService } from '@backend/supabase/database';
import type { SavedQuote } from '@backend/supabase/database';
import {
  getMyCustomerProfile,
  saveMyCustomerProfile,
  type CustomerProfile,
} from '@backend/services/customerProfileService';
import { claimGuestOrder } from '@backend/services/deliveryService';
import { formatCurrency, formatDate } from '../lib/format';
import type { UserRole } from '@/types';

/** Giá trị form cho khối "Địa chỉ & hoá đơn" (camelCase khớp service). */
interface BillingForm {
  displayName: string;
  company: string;
  taxId: string;
  businessAddress: string;
  phone: string;
}

const EMPTY_BILLING: BillingForm = {
  displayName: '',
  company: '',
  taxId: '',
  businessAddress: '',
  phone: '',
};

function billingToForm(profile: CustomerProfile | null): BillingForm {
  if (!profile) return EMPTY_BILLING;
  return {
    displayName: profile.displayName,
    company: profile.company,
    taxId: profile.taxId,
    businessAddress: profile.businessAddress,
    phone: profile.phone,
  };
}

function validateNewPassword(value: string): string | null {
  if (!value) return 'Vui lòng nhập mật khẩu mới.';
  if (value.length < 8) return 'Mật khẩu mới phải có ít nhất 8 ký tự.';
  return null;
}

/** Nhãn VI cho role — không render enum tiếng Anh ra UI. */
const ROLE_LABEL: Record<UserRole, { text: string; variant: 'info' | 'warning' | 'success' | 'technical' }> = {
  admin: { text: 'Quản trị', variant: 'info' },
  designer: { text: 'Tác giả 3D', variant: 'warning' },
  lab: { text: 'Xưởng in', variant: 'success' },
  customer: { text: 'Khách hàng', variant: 'technical' },
};

const QUICK_LINKS = [
  { to: '/orders', icon: 'receipt_long', title: 'Đơn hàng của tôi', desc: 'Lịch sử đơn, hoá đơn và tiến độ sản xuất' },
  { to: '/assets', icon: 'folder_open', title: 'Thư viện tệp số', desc: 'Tệp CAD đã mua và trạng thái tải' },
  { to: '/quote', icon: 'view_in_ar', title: 'Báo giá 3D', desc: 'Tải STL/3MF/OBJ/STEP để báo giá tức thì' },
];

/**
 * AccountView — trang tài khoản cơ bản (hồ sơ + điều hướng nhanh).
 *
 * Data-honesty: chỉ hiển thị/sửa những trường AuthContext thật sự hỗ trợ
 * (`displayName`, `phone`). Không bịa địa chỉ/KYC/thống kê khi chưa có dữ liệu.
 */
export const AccountView: React.FC = () => {
  const { user, profile, role, isLoggedIn, loading, updateUserProfile, changePassword, logout } = useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  // Báo giá đã lưu — đọc từ bảng `quotes` (RLS chỉ trả hàng của chính người dùng).
  // Ba trạng thái TRUNG THỰC: đang tải / lỗi thật / rỗng (không bịa số lượng).
  const [quotes, setQuotes] = useState<SavedQuote[]>([]);
  const [quotesLoading, setQuotesLoading] = useState(true);
  const [quotesError, setQuotesError] = useState<string | null>(null);
  const [quotesReloadKey, setQuotesReloadKey] = useState(0);

  // Hồ sơ khách hàng doanh nghiệp (`customer_profiles`) — địa chỉ & hoá đơn.
  // Ba trạng thái thật: đang tải / lỗi thật / chưa có dòng nào (không bịa địa chỉ).
  const [billing, setBilling] = useState<CustomerProfile | null>(null);
  const [billingForm, setBillingForm] = useState<BillingForm>(EMPTY_BILLING);
  const [billingLoading, setBillingLoading] = useState(true);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [billingReloadKey, setBillingReloadKey] = useState(0);
  const [billingSaving, setBillingSaving] = useState(false);
  const [billingMessage, setBillingMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  // Gắn đơn khách (`claim_guest_order`) — mã đơn + token truy cập.
  // Token CHỈ nằm trong state của form, KHÔNG lưu localStorage và bị xoá ngay sau khi gọi.
  const [claimOrderId, setClaimOrderId] = useState('');
  const [claimToken, setClaimToken] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimedOrderId, setClaimedOrderId] = useState<string | null>(null);

  // Đổi mật khẩu — supabase.auth.updateUser({ password }) qua AuthContext.
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<{ newPassword: string | null; confirmPassword: string | null }>({
    newPassword: null,
    confirmPassword: null,
  });
  const [passwordMessage, setPasswordMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!isLoggedIn) {
      setQuotes([]);
      setQuotesError(null);
      setQuotesLoading(false);
      return;
    }

    let cancelled = false;
    setQuotesLoading(true);
    setQuotesError(null);

    dbService
      .getMyQuotes()
      .then((rows) => {
        if (!cancelled) setQuotes(rows);
      })
      .catch((err) => {
        if (cancelled) return;
        setQuotes([]);
        setQuotesError(err instanceof Error ? err.message : 'Không tải được báo giá đã lưu.');
      })
      .finally(() => {
        if (!cancelled) setQuotesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, user?.id, quotesReloadKey]);

  useEffect(() => {
    if (!isLoggedIn) {
      setBilling(null);
      setBillingForm(EMPTY_BILLING);
      setBillingError(null);
      setBillingLoading(false);
      return;
    }

    let cancelled = false;
    setBillingLoading(true);
    setBillingError(null);

    getMyCustomerProfile()
      .then((row) => {
        if (cancelled) return;
        setBilling(row);
        setBillingForm(billingToForm(row));
      })
      .catch((err) => {
        if (cancelled) return;
        setBilling(null);
        setBillingForm(EMPTY_BILLING);
        setBillingError(err instanceof Error ? err.message : 'Không tải được thông tin địa chỉ & hoá đơn.');
      })
      .finally(() => {
        if (!cancelled) setBillingLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, user?.id, billingReloadKey]);

  useEffect(() => {
    setDisplayName(profile?.displayName ?? '');
    setPhone(profile?.phone ?? '');
  }, [profile?.displayName, profile?.phone]);

  if (loading) {
    return (
      <div className="min-h-dvh bg-canvas px-4 py-10 sm:px-6 md:px-12">
        <div className="mx-auto max-w-3xl animate-pulse space-y-4 motion-reduce:animate-none">
          <div className="h-10 w-48 rounded-md bg-surface-muted" />
          <div className="h-40 rounded-lg bg-surface-muted" />
        </div>
      </div>
    );
  }

  if (!isLoggedIn) return null;

  const roleInfo = ROLE_LABEL[role] ?? ROLE_LABEL.customer;
  const email = profile?.email || user?.email || '';
  const initial = (displayName || email || 'U').charAt(0).toUpperCase();
  const dirty = displayName !== (profile?.displayName ?? '') || phone !== (profile?.phone ?? '');

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await updateUserProfile({ displayName: displayName.trim(), phone: phone.trim() || undefined });
      setMessage({ kind: 'ok', text: 'Đã lưu thông tin tài khoản.' });
    } catch (err) {
      setMessage({ kind: 'error', text: err instanceof Error ? err.message : 'Không lưu được thông tin.' });
    } finally {
      setSaving(false);
    }
  };

  const billingBaseline = billingToForm(billing);
  const billingDirty = (Object.keys(billingForm) as Array<keyof BillingForm>).some(
    (key) => billingForm[key] !== billingBaseline[key]
  );

  const setBillingField = (key: keyof BillingForm, value: string) => {
    setBillingForm((prev) => ({ ...prev, [key]: value }));
    setBillingMessage(null);
  };

  const handleSaveBilling = async () => {
    setBillingSaving(true);
    setBillingMessage(null);
    try {
      const saved = await saveMyCustomerProfile({
        displayName: billingForm.displayName,
        company: billingForm.company,
        taxId: billingForm.taxId,
        businessAddress: billingForm.businessAddress,
        phone: billingForm.phone,
      });
      setBilling(saved);
      setBillingForm(billingToForm(saved));
      setBillingMessage({ kind: 'ok', text: 'Đã lưu thông tin địa chỉ & hoá đơn.' });
    } catch (err) {
      setBillingMessage({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Không lưu được thông tin địa chỉ & hoá đơn.',
      });
    } finally {
      setBillingSaving(false);
    }
  };

  const handleClaimGuestOrder = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const orderId = claimOrderId.trim();
    const token = claimToken.trim();

    if (!orderId) {
      setClaimError('Vui lòng nhập mã đơn hàng.');
      setClaimedOrderId(null);
      return;
    }
    if (token.length < 12) {
      setClaimError('Mã truy cập phải có ít nhất 12 ký tự.');
      setClaimedOrderId(null);
      return;
    }

    setClaiming(true);
    setClaimError(null);
    setClaimedOrderId(null);
    try {
      const claimed = await claimGuestOrder(orderId, token);
      // Xoá token khỏi bộ nhớ ngay sau khi dùng — không hiển thị lại.
      setClaimToken('');

      if (!claimed) {
        setClaimError(
          'Không tìm thấy đơn khớp mã đơn và mã truy cập, hoặc đơn đã thuộc tài khoản khác.'
        );
        return;
      }

      setClaimOrderId('');
      setClaimedOrderId(orderId);
    } catch (err) {
      setClaimError(
        err instanceof Error ? err.message : 'Không gắn được đơn khách vào tài khoản.'
      );
    } finally {
      setClaiming(false);
    }
  };

  const handleChangePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const newPasswordError = validateNewPassword(newPassword);
    const confirmPasswordError =
      confirmPassword !== newPassword ? 'Mật khẩu xác nhận không khớp.' : null;

    if (newPasswordError || confirmPasswordError) {
      setPasswordErrors({ newPassword: newPasswordError, confirmPassword: confirmPasswordError });
      setPasswordMessage(null);
      return;
    }

    setPasswordSaving(true);
    setPasswordMessage(null);
    try {
      await changePassword(newPassword);
      setNewPassword('');
      setConfirmPassword('');
      setPasswordErrors({ newPassword: null, confirmPassword: null });
      setPasswordMessage({ kind: 'ok', text: 'Đã đổi mật khẩu. Lần đăng nhập sau hãy dùng mật khẩu mới.' });
    } catch (err) {
      setPasswordMessage({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Không đổi được mật khẩu.',
      });
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div className="min-h-dvh bg-canvas px-4 py-8 font-sans text-fg sm:px-6 sm:py-10 md:px-12">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">Tài khoản của tôi</h1>
          <p className="mt-1 text-sm text-fg-muted">Thông tin hồ sơ và lối tắt tới các khu vực bạn dùng thường xuyên.</p>
        </div>

        <Card variant="soft" padding="lg" className="space-y-5">
          <div className="flex items-center gap-4">
            <span
              aria-hidden="true"
              className="grid size-14 shrink-0 place-items-center rounded-full bg-primary text-lg font-bold text-primary-fg"
            >
              {initial}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate text-base font-semibold text-fg">{displayName || email || 'Thành viên VCUBE'}</span>
                <Badge variant={roleInfo.variant} size="sm">{roleInfo.text}</Badge>
              </div>
              <p className="truncate font-mono text-xs text-fg-muted">{email || '—'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Tên hiển thị" id="account-display-name">
              {(control) => (
                <Input
                  {...control}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Tên bạn muốn hiển thị"
                  autoComplete="name"
                />
              )}
            </Field>
            <Field label="Số điện thoại" id="account-phone" hint="Dùng cho liên hệ giao hàng; có thể để trống.">
              {(control) => (
                <Input
                  {...control}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="09xx xxx xxx"
                  inputMode="tel"
                  autoComplete="tel"
                />
              )}
            </Field>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-subtle pt-4">
            <span className="text-xs text-fg-muted">Email đăng nhập không đổi được tại đây.</span>
            <Button onClick={handleSave} loading={saving} loadingLabel="Đang lưu…" disabled={!dirty}>
              Lưu thay đổi
            </Button>
          </div>

          {message && (
            <p
              role={message.kind === 'error' ? 'alert' : 'status'}
              className={`rounded-md px-3 py-2 text-xs ${message.kind === 'error' ? 'bg-danger-tint text-danger' : 'bg-positive-tint text-positive'}`}
            >
              {message.text}
            </p>
          )}
        </Card>

        <Card variant="soft" padding="lg" className="space-y-4">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-fg">
              <Icon name="business" size={18} className="text-primary" />
              Địa chỉ &amp; hoá đơn
            </h2>
            <p className="mt-0.5 text-xs text-fg-muted">
              Thông tin doanh nghiệp dùng khi xuất hoá đơn. Chỉ được ghi khi bạn bấm “Lưu thông tin”.
            </p>
          </div>

          {billingLoading ? (
            <div role="status" className="space-y-2">
              <div className="h-10 animate-pulse rounded-md bg-surface-muted motion-reduce:animate-none" />
              <div className="h-10 animate-pulse rounded-md bg-surface-muted motion-reduce:animate-none" />
              <span className="sr-only">Đang tải thông tin địa chỉ &amp; hoá đơn…</span>
            </div>
          ) : billingError ? (
            <div role="alert" className="space-y-3 rounded-md bg-danger-tint px-3 py-3">
              <p className="text-xs text-danger">{billingError}</p>
              <Button
                variant="secondary"
                size="sm"
                leadingIcon={<Icon name="refresh" size={16} />}
                onClick={() => setBillingReloadKey((key) => key + 1)}
              >
                Thử tải lại
              </Button>
            </div>
          ) : (
            <>
              {!billing && (
                <p className="rounded-md bg-surface-muted px-3 py-2 text-xs text-fg-muted">
                  Tài khoản này chưa có thông tin địa chỉ &amp; hoá đơn. Điền bên dưới nếu bạn cần xuất hoá đơn doanh nghiệp.
                </p>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Công ty" id="billing-company">
                  {(control) => (
                    <Input
                      {...control}
                      value={billingForm.company}
                      onChange={(e) => setBillingField('company', e.target.value)}
                      placeholder="Tên công ty trên hoá đơn"
                      autoComplete="organization"
                    />
                  )}
                </Field>
                <Field label="Mã số thuế" id="billing-tax-id" hint="Để trống nếu không xuất hoá đơn doanh nghiệp.">
                  {(control) => (
                    <Input
                      {...control}
                      value={billingForm.taxId}
                      onChange={(e) => setBillingField('taxId', e.target.value)}
                      placeholder="Mã số thuế"
                      inputMode="numeric"
                    />
                  )}
                </Field>
                <Field label="Số điện thoại" id="billing-phone" hint="Số liên hệ ghi trên hoá đơn; có thể để trống.">
                  {(control) => (
                    <Input
                      {...control}
                      value={billingForm.phone}
                      onChange={(e) => setBillingField('phone', e.target.value)}
                      placeholder="09xx xxx xxx"
                      inputMode="tel"
                      autoComplete="tel"
                    />
                  )}
                </Field>
                <Field label="Địa chỉ xuất hoá đơn" id="billing-address" className="sm:col-span-2">
                  {(control) => (
                    <Input
                      {...control}
                      value={billingForm.businessAddress}
                      onChange={(e) => setBillingField('businessAddress', e.target.value)}
                      placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố"
                      autoComplete="street-address"
                    />
                  )}
                </Field>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-subtle pt-4">
                <span className="text-xs text-fg-muted">
                  Thông tin này chỉ dùng cho hoá đơn, không thay đổi địa chỉ giao hàng của đơn đã đặt.
                </span>
                <Button
                  onClick={handleSaveBilling}
                  loading={billingSaving}
                  loadingLabel="Đang lưu…"
                  disabled={!billingDirty}
                >
                  Lưu thông tin
                </Button>
              </div>

              {billingMessage && (
                <p
                  role={billingMessage.kind === 'error' ? 'alert' : 'status'}
                  className={`rounded-md px-3 py-2 text-xs ${billingMessage.kind === 'error' ? 'bg-danger-tint text-danger' : 'bg-positive-tint text-positive'}`}
                >
                  {billingMessage.text}
                </p>
              )}
            </>
          )}
        </Card>

        <Card variant="soft" padding="lg" className="space-y-4">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-fg">
              <Icon name="link" size={18} className="text-primary" />
              Liên kết đơn khách
            </h2>
            <p className="mt-0.5 text-xs text-fg-muted">
              Đã đặt hàng với tư cách khách? Nhập mã đơn và mã truy cập trong email xác nhận để gắn đơn vào tài khoản này và xem/tải tệp đã mua.
            </p>
          </div>

          {claimedOrderId && (
            <div role="status" className="space-y-2 rounded-md bg-positive-tint px-3 py-3">
              <p className="text-xs text-positive">
                Đã liên kết đơn <span className="font-mono font-semibold">{claimedOrderId}</span> vào tài khoản của bạn.
              </p>
              <Link
                to="/orders"
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line bg-surface px-3 text-xs font-semibold text-fg transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Icon name="receipt_long" size={16} />
                Mở đơn hàng của tôi
              </Link>
            </div>
          )}

          <form onSubmit={handleClaimGuestOrder} className="space-y-4" noValidate>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Mã đơn hàng" id="claim-order-id" required>
                {(control) => (
                  <Input
                    {...control}
                    value={claimOrderId}
                    onChange={(e) => {
                      setClaimOrderId(e.target.value);
                      setClaimError(null);
                    }}
                    placeholder="VD: ORD-2026-000123"
                    autoComplete="off"
                    spellCheck={false}
                  />
                )}
              </Field>
              <Field
                label="Mã truy cập"
                id="claim-order-token"
                required
                hint="Chuỗi trong email xác nhận đơn; tối thiểu 12 ký tự."
              >
                {(control) => (
                  <Input
                    {...control}
                    type="password"
                    value={claimToken}
                    onChange={(e) => {
                      setClaimToken(e.target.value);
                      setClaimError(null);
                    }}
                    placeholder="Mã truy cập trong email"
                    autoComplete="off"
                    spellCheck={false}
                  />
                )}
              </Field>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-subtle pt-4">
              <span className="text-xs text-fg-muted">
                Mã truy cập chỉ dùng cho thao tác này và không được lưu lại trên thiết bị.
              </span>
              <Button type="submit" loading={claiming} loadingLabel="Đang liên kết…">
                Liên kết đơn
              </Button>
            </div>

            {claimError && (
              <p role="alert" className="rounded-md bg-danger-tint px-3 py-2 text-xs text-danger">
                {claimError}
              </p>
            )}
          </form>
        </Card>

        <Card variant="soft" padding="lg" className="space-y-4">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-fg">
              <Icon name="lock" size={18} className="text-primary" />
              Đổi mật khẩu
            </h2>
            <p className="mt-0.5 text-xs text-fg-muted">
              Mật khẩu mới cần ít nhất 8 ký tự. Nếu tài khoản chưa xác nhận email, hãy xác nhận trong hộp thư trước khi đổi mật khẩu.
            </p>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4" noValidate>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="Mật khẩu mới"
                id="account-new-password"
                required
                error={passwordErrors.newPassword}
                hint="Tối thiểu 8 ký tự."
              >
                {(control) => (
                  <Input
                    {...control}
                    type="password"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      setPasswordErrors((prev) => ({ ...prev, newPassword: null }));
                      setPasswordMessage(null);
                    }}
                    autoComplete="new-password"
                  />
                )}
              </Field>
              <Field
                label="Xác nhận mật khẩu mới"
                id="account-confirm-password"
                required
                error={passwordErrors.confirmPassword}
              >
                {(control) => (
                  <Input
                    {...control}
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setPasswordErrors((prev) => ({ ...prev, confirmPassword: null }));
                      setPasswordMessage(null);
                    }}
                    autoComplete="new-password"
                  />
                )}
              </Field>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-subtle pt-4">
              <span className="text-xs text-fg-muted">Mật khẩu mới có hiệu lực cho lần đăng nhập sau.</span>
              <Button type="submit" loading={passwordSaving} loadingLabel="Đang đổi…">
                Đổi mật khẩu
              </Button>
            </div>

            {passwordMessage && (
              <p
                role={passwordMessage.kind === 'error' ? 'alert' : 'status'}
                className={`rounded-md px-3 py-2 text-xs ${passwordMessage.kind === 'error' ? 'bg-danger-tint text-danger' : 'bg-positive-tint text-positive'}`}
              >
                {passwordMessage.text}
              </p>
            )}
          </form>
        </Card>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {QUICK_LINKS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="group flex items-start gap-3 rounded-lg border border-line-subtle bg-surface p-4 shadow-e0 transition-colors duration-200 hover:border-line hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-md bg-surface-muted text-fg-muted group-hover:text-fg">
                <Icon name={item.icon} size={18} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-fg">{item.title}</span>
                <span className="mt-0.5 block text-xs leading-snug text-fg-muted">{item.desc}</span>
              </span>
            </Link>
          ))}
        </div>

        <Card variant="soft" padding="lg" className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-base font-semibold text-fg">
                <Icon name="bookmark" size={18} className="text-primary" />
                Báo giá đã lưu
              </h2>
              <p className="mt-0.5 text-xs text-fg-muted">
                Các báo giá bạn đã lưu từ bộ tính giá 3D. Báo giá chỉ được ghi khi bạn bấm “Lưu báo giá”.
              </p>
            </div>
            <Link
              to="/quote"
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line bg-surface px-3 text-xs font-semibold text-fg transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Icon name="add" size={16} />
              Tạo báo giá mới
            </Link>
          </div>

          {quotesLoading ? (
            <div role="status" className="space-y-2">
              <div className="h-14 animate-pulse rounded-md bg-surface-muted motion-reduce:animate-none" />
              <div className="h-14 animate-pulse rounded-md bg-surface-muted motion-reduce:animate-none" />
              <span className="sr-only">Đang tải báo giá đã lưu…</span>
            </div>
          ) : quotesError ? (
            <div role="alert" className="space-y-3 rounded-md bg-danger-tint px-3 py-3">
              <p className="text-xs text-danger">{quotesError}</p>
              <Button
                variant="secondary"
                size="sm"
                leadingIcon={<Icon name="refresh" size={16} />}
                onClick={() => setQuotesReloadKey((key) => key + 1)}
              >
                Thử tải lại
              </Button>
            </div>
          ) : quotes.length === 0 ? (
            <EmptyState
              size="sm"
              icon={<Icon name="bookmark_border" size={20} />}
              title="Chưa có báo giá nào được lưu"
              description="Tài khoản này chưa lưu báo giá nào. Mở bộ tính giá 3D, tải tệp CAD lên, chọn cấu hình in rồi bấm “Lưu báo giá”."
              action={
                <Link
                  to="/quote"
                  className="inline-flex h-10 items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-semibold text-primary-fg shadow-e1 transition-colors hover:bg-primary-hover"
                >
                  <Icon name="view_in_ar" size={18} />
                  Mở bộ tính giá 3D
                </Link>
              }
            />
          ) : (
            <ul className="divide-y divide-line-subtle">
              {quotes.map((quote) => (
                <li
                  key={quote.id}
                  className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-fg">
                      <Icon name="view_in_ar" size={16} className="shrink-0 text-fg-muted" />
                      <span className="truncate">{quote.fileName || 'Báo giá 3D'}</span>
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-fg-muted">
                      <span>{formatDate(quote.createdAt)}</span>
                      <span aria-hidden="true">·</span>
                      <span>SL {quote.quantity}</span>
                      {quote.materialId && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono">Vật liệu: {quote.materialId}</span>
                        </>
                      )}
                      {quote.printerId && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono">Máy in: {quote.printerId}</span>
                        </>
                      )}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-mono text-sm font-semibold tabular-nums text-fg">
                      {formatCurrency(quote.totalPrice)}
                    </p>
                    {quote.unitPrice !== null && quote.quantity > 1 && (
                      <p className="font-mono text-xs tabular-nums text-fg-muted">
                        {formatCurrency(quote.unitPrice)}/cái
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card variant="soft" padding="lg" className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-fg">Đăng xuất khỏi thiết bị</p>
            <p className="mt-0.5 text-xs text-fg-muted">Bạn sẽ cần đăng nhập lại để xem đơn và tệp đã mua.</p>
          </div>
          <Button
            variant="danger-ghost"
            leadingIcon={<Icon name="logout" size={16} />}
            onClick={async () => {
              await logout();
              navigate('/auth/login', { replace: true });
            }}
          >
            Đăng xuất
          </Button>
        </Card>
      </div>
    </div>
  );
};
