import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CartItem, SiteContentConfig } from '../types';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { UserAvatarMenu } from './auth/UserAvatarMenu';
import { Icon, useBodyScrollLock } from '@frontend/ui';

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
  const { language, t } = useLanguage();
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
    { id: 'explore', label: t('navExplore', 'Khám Phá', 'Marketplace'), icon: 'storefront' },
    { id: 'tool_3d', label: t('navLab3D', 'Báo Giá In 3D', '3D Quoting'), icon: 'view_in_ar' },
    ...(isLoggedIn ? [{ id: 'my_orders', label: t('navOrders', 'Đơn Hàng', 'Orders'), icon: 'receipt_long' }] : []),
    ...(isLoggedIn && (roleName === 'lab' || roleName === 'workshop' || roleName === 'admin') ? [{
      id: 'lab',
      label: t('navPrintLab', 'Xưởng in', 'Print Lab'),
      icon: 'precision_manufacturing',
    }] : []),
    ...(isLoggedIn && (role === 'designer' || role === 'admin') ? [{
      id: 'designer',
      label: t('navDesignerStudio', 'Studio Thiết Kế', 'Designer Studio'),
      icon: 'design_services',
    }] : []),
    ...(isLoggedIn && role === 'admin' ? [{
      id: 'admin',
      label: t('navAdmin', 'Quản Trị Admin', 'Admin Console'),
      icon: 'admin_panel_settings',
    }] : []),
  ];

  /**
   * P1: nav desktop co `overflow-x-auto` (không đẩy tràn trang ở bất kỳ bề rộng nào).
   * Khi nav phải cuộn, mục ĐANG ACTIVE phải luôn nằm trong tầm nhìn — nếu không thì
   * mục cuối (Quản Trị Admin) bị cắt khỏi màn hình trên chính trang admin.
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
  }, [currentScreen, language, isLoggedIn, role]);

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

  const searchPlaceholder = t('searchPlaceholder', 'Tìm linh kiện, STL...', 'Search parts, STL...');

  return (
    <>
      {siteContent?.announcementActive && siteContent?.announcementText && (
        <div className="bg-surface-inverse text-on-inverse py-1.5 px-4 text-center text-xs font-sans font-medium flex items-center justify-center gap-2 border-b border-line">
          <span className="truncate">{siteContent.announcementText}</span>
          <button
            onClick={() => onNavigate(isLoggedIn ? 'tool_3d' : 'login')}
            className="text-accent hover:underline font-bold text-xs uppercase font-tech shrink-0 hidden sm:inline ml-1 cursor-pointer"
          >
            {language === 'vi' ? 'Báo giá ngay →' : 'Get Quote →'}
          </button>
        </div>
      )}

      <header className="sticky top-0 z-header bg-surface-muted border-b border-line px-4 sm:px-6 md:px-10 py-2.5 transition-colors motion-reduce:transition-none">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-4 sm:gap-6">
          <button
            onClick={() => handleNavClick('home')}
            className="flex items-baseline gap-1.5 rounded-sm group shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="VCUBE Home"
          >
            <span className="font-display text-2xl sm:text-2xl font-bold tracking-tighter leading-none uppercase italic text-fg">
              VCUBE
            </span>
            <span className="text-primary font-semibold text-xs uppercase tracking-wider">
              Vietnam
            </span>
          </button>

          {/*
            Zone 2: Navigation Links — desktop/tablet ngang (>= lg).
            `flex-1 min-w-0 overflow-x-auto`: nav là vùng DUY NHẤT được co lại, nên
            thanh header không bao giờ đẩy `scrollWidth` vượt `clientWidth` (P1 §1).
          */}
          <nav
            ref={navRef}
            aria-label={language === 'vi' ? 'Điều hướng chính' : 'Main navigation'}
            className="hidden lg:flex flex-1 min-w-0 items-center gap-1 xl:gap-2 font-sans text-xs uppercase tracking-wider font-bold overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {navItems.map((item) => {
              const isActive = currentScreen === item.id;
              return (
                <button
                  key={item.id}
                  data-nav-active={isActive ? 'true' : undefined}
                  onClick={() => handleNavClick(item.id)}
                  className={`pb-1 px-2 transition-colors whitespace-nowrap shrink-0 border-b-2 flex items-center gap-1.5 touch-target-btn cursor-pointer ${
                    isActive
                      ? 'border-primary text-primary font-extrabold'
                      : 'border-transparent text-fg-muted hover:text-fg hover:border-line'
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
              className="lg:flex 2xl:hidden size-10 items-center justify-center text-fg hover:bg-surface rounded-md transition-colors touch-target-btn cursor-pointer"
              aria-label={language === 'vi' ? 'Mở tìm kiếm' : 'Open search'}
            >
              <Icon name="search" size={20} />
            </button>

            <div className="relative hidden 2xl:block shrink-0">
              <form onSubmit={handleSearchSubmit}>
                <div className="flex items-center bg-surface border border-line-control rounded-md px-3 py-1.5 focus-within:border-primary transition-colors">
                  <Icon name="search" size={18} className="text-fg-subtle mr-1.5" />
                  <input
                    type="text"
                    aria-label={language === 'vi' ? 'Tìm kiếm nhanh' : 'Quick search'}
                    placeholder={searchPlaceholder}
                    value={quickSearchQuery}
                    onChange={(e) => setQuickSearchQuery(e.target.value)}
                    className="bg-transparent text-xs text-fg placeholder-fg-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-ring w-56 2xl:w-64 font-sans text-ellipsis"
                  />
                </div>
              </form>
            </div>

            <button
              onClick={() => {
                if (onOpenCartDrawer) {
                  onOpenCartDrawer();
                } else {
                  handleNavClick('cart');
                }
              }}
              className="relative flex size-10 items-center justify-center text-fg hover:bg-surface rounded-md transition-colors touch-target-btn cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={t('cartTitle', 'Giỏ hàng VCUBE', 'VCUBE Cart')}
            >
              <Icon name="shopping_cart" size={20} />
              {cartItemsCount > 0 && (
                <span className="absolute top-1 right-1 min-w-4 h-4 px-0.5 bg-primary text-primary-fg text-xs font-tech font-bold rounded-full flex items-center justify-center">
                  {cartItemsCount}
                </span>
              )}
            </button>

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
                  className="h-9 px-3 text-xs font-bold text-fg hover:bg-surface border border-line-control rounded-md transition-colors inline-flex items-center gap-1.5 cursor-pointer font-sans focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Icon name="login" size={16} />
                  <span>{language === 'vi' ? 'Đăng nhập' : 'Sign In'}</span>
                </Link>
                <Link
                  to="/auth/register"
                  className="h-9 px-3 text-xs font-bold text-primary-fg bg-primary hover:bg-primary-hover rounded-md transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-e1 font-sans focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Icon name="person_add" size={16} />
                  <span>{language === 'vi' ? 'Đăng ký' : 'Sign Up'}</span>
                </Link>
              </div>
            )}

            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden flex size-10 items-center justify-center text-fg hover:bg-surface rounded-md transition-colors touch-target-btn cursor-pointer"
              aria-label="Mở menu điều hướng"
              aria-expanded={mobileMenuOpen}
              aria-controls="vcube-mobile-nav"
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
            className="mobile-nav-backdrop"
          />
          <div
            id="vcube-mobile-nav"
            ref={mobilePanelRef}
            role="dialog"
            aria-modal="true"
            aria-label={language === 'vi' ? 'Menu điều hướng' : 'Navigation menu'}
            className="mobile-nav-panel p-6 space-y-6 bg-surface"
          >
            <div className="flex items-center justify-between pb-4 border-b border-line-subtle">
              <span className="font-display text-xl font-bold tracking-tight text-fg italic">
                VCUBE <span className="font-sans text-xs not-italic text-primary">Vietnam</span>
              </span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="flex size-9 items-center justify-center text-fg hover:bg-surface-muted rounded-md cursor-pointer"
                aria-label="Đóng menu"
              >
                <Icon name="close" size={24} />
              </button>
            </div>

            {/* Quick Search (mobile/tablet — bản desktop bị ẩn dưới `lg`) */}
            <form onSubmit={handleSearchSubmit}>
              <div className="flex items-center bg-surface border border-line-control rounded-md px-3 py-2 focus-within:border-primary transition-colors">
                <Icon name="search" size={18} className="text-fg-subtle mr-1.5" />
                <input
                  type="text"
                  aria-label={language === 'vi' ? 'Tìm kiếm nhanh' : 'Quick search'}
                  placeholder={searchPlaceholder}
                  value={quickSearchQuery}
                  onChange={(e) => setQuickSearchQuery(e.target.value)}
                  className="bg-transparent text-xs text-fg placeholder-fg-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-ring w-full font-sans text-ellipsis"
                />
              </div>
            </form>

            <nav className="space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full text-left px-3 py-3 rounded-md text-xs font-sans uppercase tracking-wider font-bold flex items-center justify-between transition-colors cursor-pointer ${
                    currentScreen === item.id
                      ? 'bg-primary-tint text-primary'
                      : 'text-fg hover:bg-surface-muted'
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
                  <div className="p-3 bg-surface-muted rounded-lg space-y-2.5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-surface-inverse p-0.5 flex-shrink-0">
                        <div className="w-full h-full rounded-full flex items-center justify-center text-on-inverse font-bold text-sm">
                          {profile?.displayName ? profile.displayName.charAt(0).toUpperCase() : 'U'}
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-fg truncate">
                            {profile?.displayName || user?.email?.split('@')[0]}
                          </span>
                          <span className={`text-xs font-tech font-bold uppercase px-2 py-0.5 rounded-full ${
                            role === 'admin'
                              ? 'bg-info-tint text-info'
                              : role === 'designer'
                              ? 'bg-warning-tint text-warning'
                              : role === 'lab'
                              ? 'bg-positive-tint text-positive'
                              : 'bg-primary-tint text-primary'
                          }`}>
                            {role === 'admin' ? 'Admin' : role === 'designer' ? 'Creator' : role === 'lab' ? 'MES Hub' : 'Customer'}
                          </span>
                        </div>
                        <span className="text-xs text-fg-subtle truncate block font-mono">
                          {user?.email}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      if (onOpenAuth) onOpenAuth('account');
                    }}
                    className="w-full py-2.5 bg-primary hover:bg-primary-hover text-primary-fg text-xs font-bold uppercase rounded-md text-center block transition-colors cursor-pointer shadow-e1"
                  >
                    {t('switchAccount', 'Tài Khoản & Thông Tin', 'Account & Details')}
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      logout();
                    }}
                    className="w-full py-2.5 bg-danger-tint hover:bg-canvas text-danger text-xs font-bold uppercase rounded-md text-center flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Icon name="logout" size={18} />
                    <span>{t('signOut', 'Đăng Xuất Khỏi Thiết Bị', 'Sign Out')}</span>
                  </button>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    to="/auth/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-2.5 px-3 bg-surface border border-line-control hover:bg-canvas text-fg text-xs font-bold uppercase rounded-md text-center transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Icon name="login" size={18} />
                    <span>{language === 'vi' ? 'Đăng nhập' : 'Sign In'}</span>
                  </Link>
                  <Link
                    to="/auth/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-2.5 px-3 bg-primary hover:bg-primary-hover text-primary-fg text-xs font-bold uppercase rounded-md text-center transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-e1"
                  >
                    <Icon name="person_add" size={18} />
                    <span>{language === 'vi' ? 'Đăng ký' : 'Sign Up'}</span>
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
