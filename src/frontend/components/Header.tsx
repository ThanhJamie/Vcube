import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CartItem, SiteContentConfig, UserRole } from '../types';
import { useAuth, DEMO_ROLE_SWITCHER_ENABLED } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { UserAvatarMenu } from './auth/UserAvatarMenu';
import { Icon } from '@frontend/ui';

interface HeaderProps {
  currentScreen: string;
  onNavigate: (screen: string, payload?: any) => void;
  cart: CartItem[];
  siteContent?: SiteContentConfig;
  onOpenSearch?: () => void;
  onOpenAuth?: (mode?: 'signin' | 'signup' | 'account') => void;
  onOpenCartDrawer?: () => void;
  onShowToast?: (message: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentScreen,
  onNavigate,
  cart,
  siteContent,
  onOpenAuth,
  onOpenCartDrawer,
  onShowToast,
}) => {
  const { user, profile, role, isLoggedIn, logout, switchDemoRole } = useAuth();
  const { language, setLanguage, t } = useLanguage();
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

  /**
   * P1: chỉ còn chạy khi bộ đổi góc nhìn KHẢ DỤNG (DEV). Bản phát hành không render
   * nút này, và nếu hàm ném lỗi thì toast chỉ báo lỗi — KHÔNG báo "đã đổi vai trò".
   */
  const handleDemoRoleSwitch = async (nextRole: UserRole) => {
    try {
      await switchDemoRole(nextRole);
      if (onShowToast) {
        onShowToast(
          nextRole === 'admin' ? 'Đã đổi: Super Admin' :
          nextRole === 'designer' ? 'Đã đổi: Designer Pro' :
          nextRole === 'lab' ? 'Đã đổi: Xưởng MES' : 'Đã đổi: Khách Hàng'
        );
      }
    } catch (err: any) {
      if (onShowToast) {
        onShowToast(err?.message || 'Không thể đổi góc nhìn vai trò.');
      }
    }
  };

  const searchPlaceholder = t('searchPlaceholder', 'Tìm linh kiện, STL...', 'Search parts, STL...');

  return (
    <>
      {/* Top Site Announcement Banner from Admin Content Config */}
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

      <header className="sticky top-0 z-header bg-surface-muted border-b border-line px-4 sm:px-6 md:px-12 py-3 transition-colors motion-reduce:transition-none">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-3 sm:gap-6">
          {/* Zone 1: Brand Title */}
          <button
            onClick={() => handleNavClick('home')}
            className="flex items-baseline gap-1.5 focus-visible:outline-none group shrink-0 cursor-pointer"
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
            className="hidden lg:flex flex-1 min-w-0 items-center gap-4 xl:gap-6 font-sans text-xs uppercase tracking-wider font-bold overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {navItems.map((item) => {
              const isActive = currentScreen === item.id;
              return (
                <button
                  key={item.id}
                  data-nav-active={isActive ? 'true' : undefined}
                  onClick={() => handleNavClick(item.id)}
                  className={`pb-1 transition-all whitespace-nowrap shrink-0 border-b-2 flex items-center gap-1.5 touch-target-btn cursor-pointer ${
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

          {/* Zone 3: Primary Actions */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Language Switcher — chữ VIE | ENG, không dùng emoji cờ (§2.5).
                < lg: nằm trong drawer (P1 §1). */}
            <div
              className="hidden lg:flex items-center bg-surface-muted p-0.5 rounded-full text-xs font-tech font-bold"
              role="group"
              aria-label="Language selector"
            >
              <button
                type="button"
                onClick={() => setLanguage('vi')}
                title="Chuyển sang Tiếng Việt"
                aria-pressed={language === 'vi'}
                className={`px-2.5 py-1 rounded-full transition-all leading-none cursor-pointer ${
                  language === 'vi'
                    ? 'bg-primary text-primary-fg shadow-e1'
                    : 'text-fg-muted hover:text-fg hover:bg-surface'
                }`}
              >
                VIE
              </button>
              <span aria-hidden="true" className="px-0.5 text-fg-subtle">|</span>
              <button
                type="button"
                onClick={() => setLanguage('en')}
                title="Switch to English"
                aria-pressed={language === 'en'}
                className={`px-2.5 py-1 rounded-full transition-all leading-none cursor-pointer ${
                  language === 'en'
                    ? 'bg-primary text-primary-fg shadow-e1'
                    : 'text-fg-muted hover:text-fg hover:bg-surface'
                }`}
              >
                ENG
              </button>
            </div>

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
              className="lg:flex xl:hidden p-2 text-fg hover:bg-surface rounded-full transition-colors touch-target-btn cursor-pointer"
              aria-label={language === 'vi' ? 'Mở tìm kiếm' : 'Open search'}
            >
              <Icon name="search" size={24} />
            </button>

            <div className="relative hidden xl:block shrink-0">
              <form onSubmit={handleSearchSubmit}>
                <div className="flex items-center bg-surface border border-line-subtle rounded-md px-3 py-1.5 focus-within:border-primary transition-all">
                  <Icon name="search" size={18} className="text-fg-subtle mr-1.5" />
                  <input
                    type="text"
                    aria-label={language === 'vi' ? 'Tìm kiếm nhanh' : 'Quick search'}
                    placeholder={searchPlaceholder}
                    value={quickSearchQuery}
                    onChange={(e) => setQuickSearchQuery(e.target.value)}
                    className="bg-transparent text-xs text-fg placeholder-fg-subtle focus:outline-none w-64 2xl:w-72 font-sans text-ellipsis"
                  />
                </div>
              </form>
            </div>

            {/* Cart Icon & Counter (visible to all visitors) */}
            <button
              onClick={() => {
                if (onOpenCartDrawer) {
                  onOpenCartDrawer();
                } else {
                  handleNavClick('cart');
                }
              }}
              className="relative p-2 text-fg hover:bg-surface rounded-full transition-colors focus-visible:outline-none touch-target-btn cursor-pointer"
              aria-label={t('cartTitle', 'Giỏ hàng VCUBE', 'VCUBE Cart')}
            >
              <Icon name="shopping_cart" size={28} />
              {cartItemsCount > 0 && (
                <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-primary text-primary-fg text-xs font-tech font-bold rounded-full flex items-center justify-center">
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
                  onShowToast={onShowToast}
                />
              </div>
            ) : (
              <div className="hidden lg:flex items-center gap-2">
                <Link
                  to="/auth/login"
                  className="px-3.5 py-1.5 text-xs font-bold text-fg hover:bg-surface border border-line-subtle rounded-full transition-all flex items-center gap-1.5 cursor-pointer font-sans"
                >
                  <Icon name="login" size={18} />
                  <span>{language === 'vi' ? 'Đăng nhập' : 'Sign In'}</span>
                </Link>
                {/* CTA chính duy nhất của header */}
                <Link
                  to="/auth/register"
                  className="px-3.5 py-1.5 text-xs font-bold text-primary-fg bg-primary hover:bg-primary-hover rounded-full transition-all flex items-center gap-1.5 cursor-pointer shadow-e1 font-sans"
                >
                  <Icon name="person_add" size={18} />
                  <span>{language === 'vi' ? 'Đăng ký' : 'Sign Up'}</span>
                </Link>
              </div>
            )}

            {/* Mobile Hamburger Toggle (< lg: nav + tìm kiếm + VIE|ENG + tài khoản) */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 text-fg hover:bg-surface rounded-full transition-colors touch-target-btn cursor-pointer"
              aria-label="Mở menu điều hướng"
              aria-expanded={mobileMenuOpen}
              aria-controls="vcube-mobile-nav"
            >
              <Icon name="menu" size={28} />
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
                className="p-1.5 text-fg hover:bg-surface-muted rounded-full cursor-pointer"
                aria-label="Đóng menu"
              >
                <Icon name="close" size={24} />
              </button>
            </div>

            {/* Quick Search (mobile/tablet — bản desktop bị ẩn dưới `lg`) */}
            <form onSubmit={handleSearchSubmit}>
              <div className="flex items-center bg-surface border border-line-subtle rounded-md px-3 py-2 focus-within:border-primary transition-all">
                <Icon name="search" size={18} className="text-fg-subtle mr-1.5" />
                <input
                  type="text"
                  aria-label={language === 'vi' ? 'Tìm kiếm nhanh' : 'Quick search'}
                  placeholder={searchPlaceholder}
                  value={quickSearchQuery}
                  onChange={(e) => setQuickSearchQuery(e.target.value)}
                  className="bg-transparent text-xs text-fg placeholder-fg-subtle focus:outline-none w-full font-sans text-ellipsis"
                />
              </div>
            </form>

            {/* Language Selector */}
            <div className="p-3 bg-surface-muted rounded-lg space-y-1.5">
              <span className="text-xs font-tech uppercase font-bold text-fg-muted block">
                Ngôn ngữ / Language:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setLanguage('vi')}
                  aria-pressed={language === 'vi'}
                  className={`py-2 px-3 rounded-full text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    language === 'vi'
                      ? 'bg-primary text-primary-fg shadow-e1'
                      : 'bg-surface text-fg hover:bg-canvas'
                  }`}
                >
                  <span>Tiếng Việt</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  aria-pressed={language === 'en'}
                  className={`py-2 px-3 rounded-full text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    language === 'en'
                      ? 'bg-primary text-primary-fg shadow-e1'
                      : 'bg-surface text-fg hover:bg-canvas'
                  }`}
                >
                  <span>English</span>
                </button>
              </div>
            </div>

            {/* Nav Items List - visible to all visitors */}
            <nav className="space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full text-left px-3 py-3 rounded-full text-xs font-sans uppercase tracking-wider font-bold flex items-center justify-between transition-colors cursor-pointer ${
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

                    {/* Mobile Quick Role Switcher — CHỈ tồn tại ở DEV (P1: bản phát hành không có) */}
                    {DEMO_ROLE_SWITCHER_ENABLED && (
                      <div className="pt-2 border-t border-line-subtle">
                        <span className="text-xs font-tech uppercase font-bold text-fg-subtle block mb-1.5">
                          {language === 'vi' ? 'Góc nhìn vai trò (Demo Switcher):' : 'Role Perspective (Demo):'}
                        </span>
                        <div className="grid grid-cols-4 gap-1">
                          {(['customer', 'designer', 'lab', 'admin'] as UserRole[]).map((r) => (
                            <button
                              key={r}
                              onClick={() => handleDemoRoleSwitch(r)}
                              className={`py-1.5 text-xs font-bold rounded-full uppercase tracking-wider transition-all ${
                                role === r
                                  ? 'bg-primary text-primary-fg shadow-e0'
                                  : 'bg-surface text-fg-muted hover:bg-canvas'
                              }`}
                            >
                              {r === 'customer' ? 'Khách' : r === 'designer' ? 'Design' : r === 'lab' ? 'MES' : 'Admin'}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      if (onOpenAuth) onOpenAuth('account');
                    }}
                    className="w-full py-2.5 bg-primary hover:bg-primary-hover text-primary-fg text-xs font-bold uppercase rounded-full text-center block transition-colors cursor-pointer shadow-e1"
                  >
                    {t('switchAccount', 'Tài Khoản & Thông Tin', 'Account & Details')}
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      logout();
                    }}
                    className="w-full py-2.5 bg-danger-tint hover:bg-canvas text-danger text-xs font-bold uppercase rounded-full text-center flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
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
                    className="py-2.5 px-3 bg-surface border border-line-subtle hover:bg-canvas text-fg text-xs font-bold uppercase rounded-full text-center transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Icon name="login" size={18} />
                    <span>{language === 'vi' ? 'Đăng nhập' : 'Sign In'}</span>
                  </Link>
                  <Link
                    to="/auth/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-2.5 px-3 bg-primary hover:bg-primary-hover text-primary-fg text-xs font-bold uppercase rounded-full text-center transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-e1"
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
