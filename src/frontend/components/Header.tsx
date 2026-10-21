/**
 * Header — chrome storefront v3 "Soft Studio" (D2 hybrid: storefront top nav).
 *
 * Chỉ đổi TRÌNH BÀY so với v2; IA/route/nhãn nav giữ nguyên (D6):
 * - cao 80px (`h-20`) trên canvas kem `bg-canvas/90` + blur, hairline `border-line`;
 * - brand mark = ô coral `bg-brand` + chữ `text-fg` (D3: coral CHỈ cho brand mark,
 *   không dùng làm CTA; tương phản đen trên coral = 5.23:1);
 * - nav desktop: mục active là **pill trắng `bg-surface` + `shadow-soft`**, mục thường
 *   `text-fg-muted` hover `bg-surface-muted`; nav mobile cùng ngôn ngữ trên panel trắng;
 * - ô tìm kiếm: pill (`rounded-full`) giữ nguyên chiều cao 40px và hành vi submit;
 * - nút CTA "Đăng ký" vẫn là **đen 12px** (`rounded-md`), không chuyển pill/coral.
 * Ngôn ngữ: VI-only — không còn nhánh hiển thị tiếng Anh trong file này (D0).
 */

import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CartItem, SiteContentConfig } from '@/types';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { UserAvatarMenu } from './auth/UserAvatarMenu';
import { Button, Icon, useBodyScrollLock } from '@frontend/ui';

interface HeaderProps {
  currentScreen: string;
  onNavigate: (screen: string, payload?: any) => void;
  cart: CartItem[];
  siteContent?: SiteContentConfig;
  onOpenSearch?: () => void;
  onOpenAuth?: (mode?: 'signin' | 'signup' | 'account') => void;
  onOpenCartDrawer?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentScreen,
  onNavigate,
  cart,
  siteContent,
  onOpenAuth,
  onOpenCartDrawer,
}) => {
  const { user, profile, role, isLoggedIn, logout } = useAuth();
  const { t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [quickSearchQuery, setQuickSearchQuery] = useState('');
  const navRef = useRef<HTMLElement | null>(null);

  const cartItemsCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  // `role` khai theo `UserRole` (chưa có 'workshop') nhưng DB CHECK cho phép cả 'workshop'
  // lẫn 'lab' (supabase/migrations/20260901_baseline_schema.sql:460) và vai trò được đọc
  // thẳng từ DB ⇒ so sánh qua `string` để không bỏ sót tài khoản xưởng.
  const roleName: string = role;

  // Navigation Items - dynamically filtered by login status and user role.
  // P1: KHÔNG gắn chip jargon `CREATOR`/`FORGE` lên nav storefront (Đợt 8, 16-dot8-briefs §P1.3).
  const navItems = [
    { id: 'explore', label: t('navExplore', 'Khám Phá'), icon: 'storefront' },
    { id: 'tool_3d', label: t('navLab3D', 'Báo Giá In 3D'), icon: 'view_in_ar' },
    ...(isLoggedIn ? [{ id: 'my_orders', label: t('navOrders', 'Đơn Hàng'), icon: 'receipt_long' }] : []),
    ...(isLoggedIn && (roleName === 'lab' || roleName === 'workshop' || roleName === 'admin') ? [{
      id: 'lab',
      label: t('navPrintLab', 'Xưởng in'),
      icon: 'precision_manufacturing',
    }] : []),
    ...(isLoggedIn && (role === 'designer' || role === 'admin') ? [{
      id: 'designer',
      label: t('navDesignerStudio', 'Xưởng thiết kế'),
      icon: 'design_services',
    }] : []),
    ...(isLoggedIn && role === 'admin' ? [{
      id: 'admin',
      label: t('navAdmin', 'Quản trị hệ thống'),
      icon: 'admin_panel_settings',
    }] : []),
  ];

  /**
   * P1: nav desktop co `overflow-x-auto` (không đẩy tràn trang ở bất kỳ bề rộng nào).
   * Khi nav phải cuộn, mục ĐANG ACTIVE phải luôn nằm trong tầm nhìn — nếu không thì
   * mục cuối (Quản trị hệ thống) bị cắt khỏi màn hình trên chính trang admin.
   */
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const active = nav.querySelector<HTMLElement>('[data-nav-active="true"]');
    if (!active) return;
    const delta = active.getBoundingClientRect().left - nav.getBoundingClientRect().left;
    if (delta < 0 || delta + active.offsetWidth > nav.clientWidth) {
      nav.scrollLeft = Math.max(0, nav.scrollLeft + delta - 12);
    }
  }, [currentScreen, isLoggedIn, role]);

  /** Drawer mobile: đóng bằng Escape (a11y — drawer trước đây không có đường thoát bàn phím). */
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileMenuOpen]);

  // Khoá cuộn nền + focus trap + trả focus về phần tử đã mở khi đóng.
  useBodyScrollLock(mobileMenuOpen);
  const mobilePanelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const panel = mobilePanelRef.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusables = () =>
      Array.from(
        panel?.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])'
        ) ?? []
      );
    focusables()[0]?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const els = focusables();
      if (els.length === 0) return;
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [mobileMenuOpen]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickSearchQuery.trim()) {
      onNavigate('explore', { search: quickSearchQuery.trim() });
      setMobileMenuOpen(false);
    }
  };

  const handleNavClick = (screenId: string, payload?: any) => {
    onNavigate(screenId, payload);
    setMobileMenuOpen(false);
  };

  const searchPlaceholder = t('searchPlaceholder', 'Tìm linh kiện, STL...');

  return (
    <>
      {siteContent?.announcementActive && siteContent?.announcementText && (
        <div className="bg-primary text-primary-fg py-2 px-4 text-center text-xs font-sans font-medium flex items-center justify-center gap-2">
          <span className="truncate">{siteContent.announcementText}</span>
          {/*
            CC-07/CC-09 (W5): CTA "Báo giá ngay →" đã bỏ khỏi announcement bar.
             - Trùng affordance: desktop đã có nav `Báo Giá In 3D` (cùng đích `/quote`) ⇒ 2 CTA/viewport.
             - Sai đích: bản cũ đá KHÁCH (chưa đăng nhập) về `/auth/login` dù `/quote` là route public.
            Giữ 1 CTA quote duy nhất trong nav; announcement chỉ còn thông điệp.
          */}
        </div>
      )}

      <header className="sticky top-0 z-header h-20 border-b border-line bg-canvas/90 backdrop-blur-md transition-colors motion-reduce:transition-none">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-4 px-4 sm:gap-6 sm:px-6 lg:px-8">
          <button
            onClick={() => handleNavClick('home')}
            className="group flex shrink-0 items-center gap-2.5 rounded-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Về trang chủ VCUBE"
          >
            <span className="grid size-10 place-items-center rounded-md bg-brand font-display text-lg font-bold uppercase leading-none text-fg shadow-soft">
              V
            </span>
            <span className="flex flex-col items-start leading-none">
              <span className="font-display text-xl font-bold uppercase tracking-tight text-fg">VCUBE</span>
              <span className="mt-1 text-xs font-semibold uppercase tracking-wider text-fg-muted">
                Việt Nam
              </span>
            </span>
          </button>

          {/*
            Zone 2: Navigation Links — desktop/tablet ngang (>= lg).
            `flex-1 min-w-0 overflow-x-auto`: nav là vùng DUY NHẤT được co lại, nên
            thanh header không bao giờ đẩy `scrollWidth` vượt `clientWidth` (P1 §1).
          */}
          <nav
            ref={navRef}
            aria-label="Điều hướng chính"
            className="nav-fade-right hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:none] lg:flex [&::-webkit-scrollbar]:hidden"
          >
            {navItems.map((item) => {
              const isActive = currentScreen === item.id;
              return (
                <button
                  key={item.id}
                  data-nav-active={isActive ? 'true' : undefined}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => handleNavClick(item.id)}
                  className={`relative flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-sm transition-colors duration-200 touch-target-btn cursor-pointer ${
                    isActive
                      ? 'bg-surface font-semibold text-fg shadow-soft'
                      : 'font-medium text-fg-muted hover:bg-surface-muted hover:text-fg'
                  }`}
                >
                  <Icon name={item.icon} size={18} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/*
              Quick Search — desktop ngang (>= lg), ẩn ở mobile/tablet (nằm trong drawer).
              P1 §2: `w-64` (256px) là bề rộng TỐI THIỂU để placeholder hiện đủ ở 12px
              (đo được: placeholder cần 254px, trước đây hộp chỉ 240px ở 1440px ⇒ bị cụt).
            */}
            {/* P1: dải lg–xl không đủ chỗ cho ô tìm kiếm inline (nav bị bóp còn ~16px)
                ⇒ dùng nút mở drawer (drawer đã có ô tìm kiếm thật). */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              /* CC-07: `hidden` gốc bắt buộc — trước đây thiếu nên nút này vẫn hiện dưới `lg`,
                 cạnh hamburger: 2 nút icon mở CÙNG một drawer. Nay mobile chỉ còn hamburger;
                 dải lg–2xl dùng nút này (nav ngang đã có, search inline chưa đủ chỗ). */
              className="hidden lg:flex 2xl:hidden size-10 min-w-11 items-center justify-center rounded-full text-fg-muted transition-colors duration-200 hover:bg-surface-muted hover:text-fg touch-target-btn cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              /* A11Y-04: MỘT tên duy nhất cho cùng một điều khiển ở mọi breakpoint
                 (trước đây dải lg–2xl là "Mở tìm kiếm & menu", mobile là "Mở menu điều hướng"). */
              aria-label="Mở menu & tìm kiếm"
              aria-expanded={mobileMenuOpen}
              /* A11Y-05: panel chỉ mount khi mở ⇒ chỉ khai báo IDREF lúc IDREF tồn tại.
                 Khi đóng, `aria-expanded=false` là đủ (không còn ARIA reference gãy). */
              aria-controls={mobileMenuOpen ? 'vcube-mobile-nav' : undefined}
            >
              <Icon name="search" size={20} />
            </button>

            <div className="relative hidden 2xl:block shrink-0">
              <form onSubmit={handleSearchSubmit}>
                <Icon
                  name="search"
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle"
                />
                <input
                  type="text"
                  aria-label="Tìm kiếm nhanh"
                  placeholder={searchPlaceholder}
                  value={quickSearchQuery}
                  onChange={(e) => setQuickSearchQuery(e.target.value)}
                  className="h-10 w-56 rounded-full border border-line-control bg-surface pl-10 pr-4 text-sm text-fg placeholder:text-fg-subtle transition-colors duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring 2xl:w-64 font-sans text-ellipsis"
                />
              </form>
            </div>

            <Button
              variant="ghost"
              iconOnly
              onClick={() => {
                if (onOpenCartDrawer) {
                  onOpenCartDrawer();
                } else {
                  handleNavClick('cart');
                }
              }}
              className="relative"
              /* A11Y-08: badge số lượng là span trang trí, không vào accessible name của nút
                 ⇒ đưa số lượng vào tên nút; badge `aria-hidden` để không đọc hai lần. */
              aria-label={cartItemsCount > 0 ? `Giỏ hàng, ${cartItemsCount} sản phẩm` : 'Giỏ hàng'}
            >
              <Icon name="shopping_cart" size={20} />
              {cartItemsCount > 0 && (
                <span aria-hidden="true" className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-0.5 font-tech text-xs font-bold text-primary-fg tabular-nums">
                  {cartItemsCount}
                </span>
              )}
            </Button>

            {/* Authentication / User Account — < lg nằm trong drawer (P1 §1) */}
            {isLoggedIn ? (
              <div className="hidden lg:block">
                <UserAvatarMenu
                  onNavigate={handleNavClick}
                  onOpenCart={onOpenCartDrawer || (() => handleNavClick('cart'))}
                />
              </div>
            ) : (
              <div className="hidden lg:flex items-center gap-2">
                <Link
                  to="/auth/login"
                  className="inline-flex h-10 items-center gap-1.5 rounded-md border border-line-control bg-surface px-4 text-sm font-medium text-fg transition-colors duration-200 hover:border-fg-subtle hover:bg-surface-muted cursor-pointer font-sans focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Icon name="login" size={16} />
                  <span>Đăng nhập</span>
                </Link>
                <Link
                  to="/auth/register"
                  className="inline-flex h-10 items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-semibold text-primary-fg shadow-e1 transition-colors duration-200 hover:bg-primary-hover cursor-pointer font-sans focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Icon name="person_add" size={16} />
                  <span>Đăng ký</span>
                </Link>
              </div>
            )}

            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden flex size-10 min-w-11 items-center justify-center rounded-full text-fg-muted transition-colors duration-200 hover:bg-surface-muted hover:text-fg touch-target-btn cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Mở menu & tìm kiếm"
              aria-expanded={mobileMenuOpen}
              aria-controls={mobileMenuOpen ? 'vcube-mobile-nav' : undefined}
            >
              <Icon name="menu" size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <>
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="mobile-nav-backdrop bg-fg/40 backdrop-blur-sm"
          />
          <div
            id="vcube-mobile-nav"
            ref={mobilePanelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menu & tìm kiếm"
            className="mobile-nav-panel bg-surface border-l border-line shadow-e3 p-6 space-y-6"
          >
            <div className="flex items-center justify-between pb-4 border-b border-line-subtle">
              <span className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-md bg-brand font-display text-base font-bold uppercase leading-none text-fg shadow-soft">
                  V
                </span>
                <span className="flex flex-col leading-none">
                  <span className="font-display text-lg font-bold uppercase tracking-tight text-fg">VCUBE</span>
                  <span className="mt-1 text-xs font-semibold uppercase tracking-wider text-fg-muted">Việt Nam</span>
                </span>
              </span>
              <Button
                iconOnly
                variant="ghost"
                size="sm"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Đóng menu"
              >
                <Icon name="close" size={20} />
              </Button>
            </div>

            {/* Quick Search (mobile/tablet — bản desktop bị ẩn dưới `lg`) */}
            <form onSubmit={handleSearchSubmit}>
              <div className="relative">
                <Icon
                  name="search"
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle"
                />
                <input
                  type="text"
                  aria-label="Tìm kiếm nhanh"
                  placeholder={searchPlaceholder}
                  value={quickSearchQuery}
                  onChange={(e) => setQuickSearchQuery(e.target.value)}
                  className="h-11 md:h-10 w-full rounded-full border border-line-control bg-surface pl-10 pr-4 text-sm text-fg placeholder:text-fg-subtle transition-colors duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring font-sans text-ellipsis"
                />
              </div>
            </form>

            <nav className="space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  aria-current={currentScreen === item.id ? 'page' : undefined}
                  onClick={() => handleNavClick(item.id)}
                  className={`flex w-full items-center gap-3 rounded-full px-3 py-2.5 max-md:min-h-11 text-sm transition-colors duration-200 cursor-pointer ${
                    currentScreen === item.id
                      ? 'bg-canvas font-semibold text-fg shadow-soft'
                      : 'font-medium text-fg-muted hover:bg-surface-muted hover:text-fg'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon name={item.icon} size={18} />
                    {item.label}
                  </span>
                </button>
              ))}
            </nav>

            <div className="pt-4 border-t border-line-subtle space-y-3">
              {isLoggedIn ? (
                <>
                  {/* User Profile Card for Mobile */}
                  <div className="p-4 bg-surface-muted rounded-lg border border-line-subtle space-y-2.5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary flex-shrink-0">
                        <div className="w-full h-full rounded-full flex items-center justify-center text-primary-fg font-bold text-sm">
                          {profile?.displayName ? profile.displayName.charAt(0).toUpperCase() : 'U'}
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm text-fg truncate">
                            {profile?.displayName || user?.email?.split('@')[0]}
                          </span>
                          <span className={`text-xs font-tech font-bold uppercase px-2 py-0.5 rounded-full border ${
                            role === 'admin'
                              ? 'bg-info-tint text-info border-info/20'
                              : role === 'designer'
                              ? 'bg-warning-tint text-warning border-warning/20'
                              : role === 'lab'
                              ? 'bg-positive-tint text-positive border-positive/20'
                              : 'bg-surface text-fg-muted border-line'
                          }`}>
                            {role === 'admin' ? 'Quản trị' : role === 'designer' ? 'Tác giả 3D' : role === 'lab' ? 'Xưởng in' : 'Khách hàng'}
                          </span>
                        </div>
                        <span className="text-xs text-fg-subtle truncate block font-mono">
                          {user?.email}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Button
                    fullWidth
                    onClick={() => {
                      setMobileMenuOpen(false);
                      if (onOpenAuth) onOpenAuth('account');
                    }}
                  >
                    {t('switchAccount', 'Tài Khoản & Thông Tin')}
                  </Button>
                  <Button
                    fullWidth
                    variant="danger-ghost"
                    leadingIcon={<Icon name="logout" size={16} />}
                    onClick={() => {
                      setMobileMenuOpen(false);
                      logout();
                    }}
                  >
                    {t('signOut', 'Đăng Xuất Khỏi Thiết Bị')}
                  </Button>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    to="/auth/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="inline-flex h-11 items-center justify-center gap-1.5 rounded-md border border-line-control bg-surface px-3 text-sm font-medium text-fg transition-colors duration-200 hover:border-fg-subtle hover:bg-surface-muted cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Icon name="login" size={16} />
                    <span>Đăng nhập</span>
                  </Link>
                  <Link
                    to="/auth/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="inline-flex h-11 items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-sm font-semibold text-primary-fg shadow-e1 transition-colors duration-200 hover:bg-primary-hover cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Icon name="person_add" size={16} />
                    <span>Đăng ký</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
};
