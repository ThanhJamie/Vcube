/**
 * AppOverlays — nhóm lớp phủ luôn-mount tách NGUYÊN VĂN khỏi `src/App.tsx` (Phase 4d):
 * FAB "Trợ lý tự động", toast live-region, 3 modal (ChatSupport/Invoice/CartDrawer),
 * và footer storefront. JSX giữ **byte-identical** với bản trong App.tsx; component này chỉ
 * nhận props dữ liệu/handler từ `MainApp` và đọc state UI từ `useUIStore` (cùng store/selector).
 *
 * TECH-01: `AuthModal` (913 dòng) đã bị xoá — không còn luồng nào mở nó; auth canonical là
 * 2 route `/auth/login` + `/auth/register`.
 */

import type { RefObject } from 'react';
import type { CartItem, Order, SiteContentConfig } from '@/types';
import { useLanguage } from '@frontend/context/LanguageContext';
import { useUIStore } from '@frontend/stores/useUIStore';
import { ChatSupportModal } from '@frontend/components/ChatSupportModal';
import { InvoiceModal } from '@frontend/components/InvoiceModal';
import { CartDrawer } from '@frontend/components/CartDrawer';
import { Icon } from '@frontend/ui';
import type { AppNavigate } from '@frontend/hooks/useAppNavigation';
import { CHROMELESS_SCREENS, FAB_HIDDEN_SCREENS } from './screens';

export interface AppOverlaysProps {
  role: string;
  siteContent: SiteContentConfig;
  cart: CartItem[];
  invoiceOrder: Order | null;
  setInvoiceOrder: (order: Order | null) => void;
  handleUpdateQuantity: (id: string, newQty: number) => void;
  handleRemoveItem: (id: string) => void;
  handleNavigate: AppNavigate;
  showToast: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  fabRef: RefObject<HTMLButtonElement | null>;
  isFabHidden: boolean;
  currentScreen: string;
}

export function AppOverlays({
  role,
  siteContent,
  cart,
  invoiceOrder,
  setInvoiceOrder,
  handleUpdateQuantity,
  handleRemoveItem,
  handleNavigate,
  showToast,
  fabRef,
  isFabHidden,
  currentScreen,
}: AppOverlaysProps) {
  const { t } = useLanguage();

  // Zustand State Management for UI Drawers, Modals & Toast Queue
  const isChatOpen = useUIStore((s) => s.isChatOpen);
  const setIsChatOpen = useUIStore((s) => s.setIsChatOpen);
  const isCartDrawerOpen = useUIStore((s) => s.isCartDrawerOpen);
  const setIsCartDrawerOpen = useUIStore((s) => s.setIsCartDrawerOpen);
  const toastQueue = useUIStore((s) => s.toastQueue);
  const removeToast = useUIStore((s) => s.removeToast);

  // P1 §4: giữ nhãn nhưng BỎ phần rỗng; không còn gì để in thì ẩn cả dòng
  // (không bao giờ in "Hotline: •" hay "Hotline: —"). Lọc giá trị dummy nếu có dữ liệu mẫu.
  const isValidHotline = (phone?: string) => Boolean(phone && !/^0+$/.test(phone.trim()) && !phone.includes('[MẪU]'));
  // Data-honesty: chỉ in email khi admin đã cấu hình một địa chỉ THẬT. Giá trị placeholder
  // của seed (`mau@example.com`, nhãn `[MẪU]`) không phải kênh liên hệ ⇒ ẩn cả dòng.
  // Trước đây email placeholder bị thay bằng một địa chỉ VCUBE đoán — mailbox owner CHƯA xác nhận.
  const isDisplayableEmail = (email?: string) => {
    const value = (email ?? '').trim();
    if (!value || value.includes('[MẪU]')) return false;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return false;
    return !/@example\.(?:com|org|net)$/i.test(value);
  };
  const footerContactLine = [
    isValidHotline(siteContent.hotline) ? `Hotline: ${siteContent.hotline}` : '',
    isDisplayableEmail(siteContent.contactEmail) ? `Email: ${siteContent.contactEmail.trim()}` : '',
  ].filter(Boolean).join(' • ');

  // P1-B: footer link đạt vùng chạm ≥44px ở mobile (640px đổ xuống); desktop giữ nhịp cũ
  // (min-h/w-full chỉ bật ở mobile, từ `sm` trả về kích thước nội dung như trước).
  const footerLinkClass = 'inline-flex min-h-11 w-full items-center text-left transition-colors hover:text-on-inverse cursor-pointer sm:min-h-0 sm:w-auto';

  return (
    <>
      {/*
        Floating Quick Support Button — CHỈ storefront.
        U0-3: FAB là lớp nổi của storefront nhưng trước đây hiện ở MỌI màn, kể cả /admin
        (đè lên điều khiển của dashboard). `CHROMELESS_SCREENS` là các màn đã có khung
        riêng nên FAB bị loại hẳn khỏi cây (không chỉ ẩn bằng CSS).
        D-F/UI-016: ẩn thêm ở `FAB_HIDDEN_SCREENS` (PDP/Personalize có bottom-bar).
      */}
      {!CHROMELESS_SCREENS.includes(currentScreen) && !FAB_HIDDEN_SCREENS.includes(currentScreen) && (
      <button
        ref={fabRef}
        onClick={() => setIsChatOpen(true)}
        aria-hidden={isFabHidden || undefined}
        tabIndex={isFabHidden ? -1 : undefined}
        className={`fixed bottom-6 right-6 z-drawer flex items-center gap-2.5 rounded-md bg-primary hover:bg-primary-hover px-4 py-3 font-sans text-xs text-primary-fg shadow-e2 border border-transparent transition-all duration-200 motion-reduce:transition-none active:scale-[0.97] touch-target-btn cursor-pointer ${
          isFabHidden ? 'opacity-0 pointer-events-none invisible' : 'opacity-100'
        }`}
        aria-label={t('liveSupportAria', 'Tư vấn kỹ thuật trực tuyến')}
      >
        <span className="w-2 h-2 rounded-full bg-brand animate-pulse motion-reduce:animate-none"></span>
        <Icon name="support_agent" size={20} className="text-primary-fg" />
        <span className="font-bold text-xs uppercase tracking-widest hidden sm:inline font-tech">
          {t('supportAssistant', 'Trợ lý tự động')}
        </span>
      </button>
      )}

      {/* Interactive Toast Notification Queue via useUIStore.
          UI-012 (a11y): container là LIVE REGION thường trực — nếu chỉ gắn role khi có
          toast thì screen reader không kịp đăng ký vùng và bỏ qua thông báo. */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="false"
        className="fixed bottom-6 left-4 right-4 z-toast flex flex-col gap-2 pointer-events-none max-w-sm sm:left-6 sm:right-auto sm:w-full"
      >
        {toastQueue.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto px-4 py-3 border bg-surface text-fg shadow-soft flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200 rounded-lg ${
              toast.type === 'error'
                ? 'border-danger/20'
                : toast.type === 'warning'
                ? 'border-warning/20'
                : toast.type === 'success'
                ? 'border-positive/20'
                : 'border-line'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Icon
                name={toast.type === 'error' ? 'error' : toast.type === 'warning' ? 'warning' : toast.type === 'success' ? 'check_circle' : 'info'}
                size={20}
                className={
                  toast.type === 'error'
                    ? 'text-danger'
                    : toast.type === 'warning'
                    ? 'text-warning'
                    : toast.type === 'success'
                    ? 'text-positive'
                    : 'text-info'
                }
              />
              <span className="text-xs font-sans font-semibold">{toast.message}</span>
            </div>
            <div className="flex items-center gap-2">
              {toast.undoAction && (
                <button
                  onClick={toast.undoAction}
                  className="px-2 py-0.5 bg-surface-muted hover:bg-line text-xs font-mono rounded-md text-fg underline cursor-pointer"
                >
                  Hoàn tác
                </button>
              )}
              <button
                onClick={() => removeToast(toast.id)}
                className="text-fg-subtle hover:text-fg cursor-pointer"
                aria-label="Đóng thông báo"
              >
                <Icon name="close" size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Engineer Hotline & Support Modal */}
      <ChatSupportModal
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        contactHotline={siteContent.hotline}
        contactEmail={siteContent.contactEmail}
      />

      {/* Invoice Generator Modal */}
      <InvoiceModal
        order={invoiceOrder}
        isOpen={!!invoiceOrder}
        onClose={() => setInvoiceOrder(null)}
      />

      {/* Slide-over Cart Drawer */}
      <CartDrawer
        isOpen={isCartDrawerOpen}
        onClose={() => setIsCartDrawerOpen(false)}
        cart={cart}
        siteContent={siteContent}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onNavigate={handleNavigate}
      />

      {/*
        P1: /admin* có khung quản trị riêng (AdminDashboardView) ⇒ không render cả
        header lẫn footer storefront. Footer storefront là nội dung bán hàng
        (dịch vụ, địa chỉ xưởng, dung sai chế tạo) — vô nghĩa trong app quản trị.
      */}
      {/* Industrial Aesthetic Footer with Dynamic Admin Content */}
      {!CHROMELESS_SCREENS.includes(currentScreen) && (
        <footer className="bg-surface-inverse text-on-inverse border-t border-on-inverse/10 pt-12 pb-6 mt-auto">
          {/* CC-10 (W5): cùng container với header/hero/lưới sản phẩm (`max-w-7xl`) để gutter
              header = footer trên mọi trang; trước đây footer 1440px còn header 1280px. */}
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
            <div className={`grid grid-cols-1 sm:grid-cols-2 ${role === 'admin' ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-8`}>
              {/* Col 1: Brand & Bio */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="font-display font-black text-2xl tracking-tighter text-on-inverse uppercase italic">
                    VCUBE
                  </span>
                  <span className="text-xs font-sans uppercase tracking-[0.2em] text-accent border-l border-on-inverse/20 pl-2">
                    Việt Nam
                  </span>
                </div>
                <p className="text-xs text-on-inverse/70 leading-relaxed font-sans">
                  {t('footerAbout', 'Nền tảng sản xuất bồi đắp và chế tác linh kiện cơ khí chính xác cho xưởng và phòng R&D.')}
                </p>
                {siteContent.toleranceSpec ? (
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-surface-inverse-raised text-accent text-xs font-tech uppercase tracking-wider rounded-sm border border-on-inverse/15">
                    <span>{t('footerToleranceLabel', 'Dung sai chế tạo:')} {siteContent.toleranceSpec}</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-surface-inverse-raised text-on-inverse/80 text-xs font-mono tracking-wider rounded-sm border border-on-inverse/15">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                    <span>Tiêu chuẩn chế tạo công nghiệp</span>
                  </div>
                )}
              </div>

              {/* Col 2: Customer Navigation */}
              <div className="space-y-2.5 text-xs font-sans">
                <p className="font-bold uppercase tracking-widest text-on-inverse/70 text-xs font-tech">
                  {t('footerServices', 'Dịch Vụ & Mua Hàng')}
                </p>
                <ul className="space-y-2 text-on-inverse/70">
                  <li>
                    <button onClick={() => handleNavigate('explore')} className={footerLinkClass}>
                      {t('footerMarketplace', 'Sàn linh kiện 3D')}
                    </button>
                  </li>
                  <li>
                    <button onClick={() => handleNavigate('quote')} className={footerLinkClass}>
                      {t('footerInstantQuote', 'Báo giá in 3D trực tuyến')}
                    </button>
                  </li>
                  <li>
                    <button onClick={() => handleNavigate('cart')} className={footerLinkClass}>
                      {t('cartTitle', 'Giỏ hàng của bạn')}
                    </button>
                  </li>
                  <li>
                    <button onClick={() => handleNavigate('orders')} className={footerLinkClass}>
                      {t('myOrdersTracking', 'Theo dõi đơn hàng thời gian thực')}
                    </button>
                  </li>
                </ul>
              </div>

              {/* Col 3: Admin Console - Only visible for admin users */}
              {role === 'admin' && (
                <div className="space-y-2.5 text-xs font-sans">
                  <p className="font-bold uppercase tracking-widest text-on-inverse/70 text-xs font-tech">
                    {t('footerCreators', 'Quản Trị Hệ Thống')}
                  </p>
                  <ul className="space-y-2 text-on-inverse/70">
                    <li>
                      <button onClick={() => handleNavigate('admin')} className={`${footerLinkClass} font-bold text-accent`}>
                        Bảng điều khiển quản trị
                      </button>
                    </li>
                    <li>
                      <button onClick={() => handleNavigate('admin', { section: 'products' })} className={footerLinkClass}>
                        {'Quản lý sản phẩm & giá'}
                      </button>
                    </li>
                    <li>
                      <button onClick={() => handleNavigate('admin', { section: 'queue' })} className={footerLinkClass}>
                        {'Hàng đợi & tiến độ gia công'}
                      </button>
                    </li>
                    <li>
                      <button onClick={() => handleNavigate('admin', { section: 'storefront' })} className={footerLinkClass}>
                        {'Cấu hình phí ship & thông báo'}
                      </button>
                    </li>
                  </ul>
                </div>
              )}

              {/* Col 4: Dynamic Contact from Admin Content */}
              <div className="space-y-2.5 text-xs font-sans">
                <p className="font-bold uppercase tracking-widest text-on-inverse/70 text-xs font-tech">
                  {t('footerLocationTitle', 'Trụ Sở & Xưởng Chế Tác')}
                </p>
                {siteContent.hanoiWorkshopAddress && (
                  <p className="text-on-inverse/70">
                    {siteContent.hanoiWorkshopAddress.replace(/^\[MẪU\]\s*/, '')}
                  </p>
                )}
                {siteContent.hcmWorkshopAddress && (
                  <p className="text-on-inverse/70">
                    {siteContent.hcmWorkshopAddress.replace(/^\[MẪU\]\s*/, '')}
                  </p>
                )}
                {footerContactLine && (
                  <p className="text-on-inverse/70 font-tech">{footerContactLine.replace(/\[MẪU\]\s*/g, '')}</p>
                )}
              </div>
            </div>

            <div className="pt-8 border-t border-on-inverse/15 flex flex-col sm:flex-row items-center justify-between text-xs text-on-inverse/70 font-sans gap-4">
              <p>{t('footerRights', '© 2026 VCUBE Việt Nam. Bảo lưu mọi quyền.')}</p>
              <div className="flex items-center gap-4">
                <span>{t('footerCadSecurity', 'Bảo mật dữ liệu CAD/STL')}</span>
                <span>•</span>
                <span>{t('footerQcPolicy', 'Đo kiểm theo quy trình thoả thuận')}</span>
              </div>
            </div>

            {/*
              R3 — chừa chỗ cho FAB "Trợ lý tự động" (nút fixed bottom-6 right-6 ở dưới).
              Nằm bên trong footer tối để toàn bộ chân trang đồng nhất màu tối (bg-surface-inverse),
              loại bỏ triệt để dải trắng bên dưới chân trang mà vẫn đảm bảo FAB không che nút hay link.
            */}
            <div data-fab-spacer aria-hidden="true" className="h-16 sm:h-20 w-full shrink-0" />
          </div>
        </footer>
      )}
    </>
  );
}
