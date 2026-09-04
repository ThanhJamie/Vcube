import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CartItem, SiteContentConfig, UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { UserAvatarMenu } from './auth/UserAvatarMenu';

interface HeaderProps {
  currentScreen: string;
  onNavigate: (screen: string, payload?: any) => void;
  cart: CartItem[];
  siteContent?: SiteContentConfig;
  onOpenSearch?: () => void;
  onOpenAuth?: (mode?: 'signin' | 'signup' | 'role_select' | 'account') => void;
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

  const cartItemsCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  // Navigation Items - dynamically filtered by login status and user role
  const navItems = [
    { id: 'explore', label: t('navExplore', 'Khám Phá', 'Marketplace'), icon: 'storefront' },
    { id: 'tool_3d', label: t('navLab3D', 'Báo Giá In 3D', '3D Quoting'), icon: 'view_in_ar' },
    ...(isLoggedIn ? [{ id: 'my_orders', label: t('navOrders', 'Đơn Hàng', 'Orders'), icon: 'receipt_long' }] : []),
    ...(isLoggedIn && (role === 'designer' || role === 'admin') ? [{ 
      id: 'designer', 
      label: t('navDesignerStudio', 'Studio Thiết Kế', 'Designer Studio'), 
      icon: 'design_services',
      badge: 'CREATOR',
      badgeColor: 'bg-amber-100 text-amber-800'
    }] : []),
    ...(isLoggedIn && role === 'admin' ? [{ 
      id: 'admin', 
      label: t('navAdmin', 'Quản Trị Admin', 'Admin Console'), 
      icon: 'admin_panel_settings',
      badge: 'FORGE',
      badgeColor: 'bg-purple-100 text-purple-700'
    }] : []),
  ];

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

  return (
    <>
      {/* Top Site Announcement Banner from Admin Content Config */}
      {siteContent?.announcementActive && siteContent?.announcementText && (
        <div className="bg-[#091426] text-white py-1.5 px-4 text-center text-[11px] font-sans font-medium flex items-center justify-center gap-2 border-b border-black/20">
          <span className="truncate">{siteContent.announcementText}</span>
          <button
            onClick={() => onNavigate(isLoggedIn ? 'tool_3d' : 'login')}
            className="text-[#57DFFE] hover:underline font-bold text-[10px] uppercase font-tech shrink-0 hidden sm:inline ml-1 cursor-pointer"
          >
            {language === 'vi' ? 'Báo giá ngay →' : 'Get Quote →'}
          </button>
        </div>
      )}

      <header className="sticky top-0 z-40 bg-[#F8F9FF]/95 backdrop-blur-md border-b border-[#C5C6CD] px-4 sm:px-6 md:px-12 py-3 transition-all">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-3 sm:gap-6">
          {/* Zone 1: Brand Title */}
          <button
            onClick={() => handleNavClick('home')}
            className="flex items-baseline gap-1.5 focus-visible:outline-none group shrink-0 cursor-pointer"
            aria-label="VCUBE Home"
          >
            <span className="font-display text-2xl sm:text-[26px] font-bold tracking-tighter leading-none uppercase italic text-[#091426]">
              VCUBE
            </span>
            <span className="text-[#00687A] font-semibold text-xs uppercase tracking-wider">
              Vietnam
            </span>
          </button>

          {/* Zone 2: Navigation Links - visible to ALL visitors */}
          <nav className="hidden md:flex items-center gap-4 lg:gap-6 font-sans text-xs uppercase tracking-wider font-bold">
            {navItems.map((item) => {
              const isActive = currentScreen === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`pb-1 transition-all whitespace-nowrap shrink-0 border-b-2 flex items-center gap-1 touch-target-btn cursor-pointer ${
                    isActive
                      ? 'border-[#00687A] text-[#00687A] font-extrabold'
                      : 'border-transparent text-[#545F73] hover:text-[#091426] hover:border-black/30'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">{item.icon}</span>
                  {item.label}
                  {(item as any).badge && (
                    <span className={`text-[8px] px-1 py-0.2 rounded font-tech font-bold ml-0.5 ${(item as any).badgeColor || 'bg-slate-100 text-slate-700'}`}>
                      {(item as any).badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Primary Actions */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Language Switcher */}
            <div 
              className="flex items-center bg-[#E5EEFF] border border-[#CBD5E1] p-0.5 rounded text-[11px] font-tech font-bold"
              role="group"
              aria-label="Language selector"
            >
              <button
                type="button"
                onClick={() => setLanguage('vi')}
                title="Chuyển sang Tiếng Việt"
                className={`px-2 py-1 rounded-xs transition-all flex items-center gap-1 leading-none cursor-pointer ${
                  language === 'vi'
                    ? 'bg-[#091426] text-white shadow-xs'
                    : 'text-[#545F73] hover:text-[#091426] hover:bg-white/50'
                }`}
              >
                <span>🇻🇳</span>
                <span className="hidden sm:inline">VIE</span>
              </button>
              <button
                type="button"
                onClick={() => setLanguage('en')}
                title="Switch to English"
                className={`px-2 py-1 rounded-xs transition-all flex items-center gap-1 leading-none cursor-pointer ${
                  language === 'en'
                    ? 'bg-[#091426] text-white shadow-xs'
                    : 'text-[#545F73] hover:text-[#091426] hover:bg-white/50'
                }`}
              >
                <span>🇺🇸</span>
                <span className="hidden sm:inline">ENG</span>
              </button>
            </div>

            {/* Quick Search on Desktop (visible to all visitors) */}
            <div className="relative hidden lg:block">
              <form onSubmit={handleSearchSubmit}>
                <div className="flex items-center bg-white border border-[#CBD5E1] rounded px-3 py-1.5 focus-within:border-[#00687A] transition-all">
                  <span className="material-symbols-outlined text-[#75777D] text-base mr-1.5">search</span>
                  <input
                    type="text"
                    placeholder={t('searchPlaceholder', 'Tìm linh kiện, STL...', 'Search parts, STL...')}
                    value={quickSearchQuery}
                    onChange={(e) => setQuickSearchQuery(e.target.value)}
                    className="bg-transparent text-xs text-[#091426] placeholder-[#8590A6] focus:outline-none w-44 xl:w-60 font-sans"
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
              className="relative p-2 text-[#091426] hover:bg-black/5 rounded transition-colors focus-visible:outline-none touch-target-btn cursor-pointer"
              aria-label={t('cartTitle', 'Giỏ hàng VCUBE', 'VCUBE Cart')}
            >
              <span className="material-symbols-outlined text-2xl">shopping_cart</span>
              {cartItemsCount > 0 && (
                <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-[#00687A] text-white text-[9px] font-tech font-bold rounded-full flex items-center justify-center">
                  {cartItemsCount}
                </span>
              )}
            </button>

            {/* Authentication Buttons / User Account Dropdown */}
            {isLoggedIn ? (
              <UserAvatarMenu
                onNavigate={handleNavClick}
                onOpenCart={onOpenCartDrawer || (() => handleNavClick('cart'))}
                onShowToast={onShowToast}
              />
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Link
                  to="/auth/login"
                  className="px-3 sm:px-3.5 py-1.5 text-xs font-bold text-[#091426] hover:text-[#00687A] hover:bg-[#EFF4FF] rounded-lg border border-[#CBD5E1] transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs font-sans"
                >
                  <span className="material-symbols-outlined text-[16px]">login</span>
                  <span>{language === 'vi' ? 'Đăng nhập' : 'Sign In'}</span>
                </Link>
                <Link
                  to="/auth/register"
                  className="px-3 sm:px-3.5 py-1.5 text-xs font-bold text-white bg-[#00687A] hover:bg-[#005260] rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-xs font-sans"
                >
                  <span className="material-symbols-outlined text-[16px]">person_add</span>
                  <span>{language === 'vi' ? 'Đăng ký' : 'Sign Up'}</span>
                </Link>
              </div>
            )}

            {/* Mobile Hamburger Toggle (visible to all visitors) */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 text-[#091426] hover:bg-black/5 rounded transition-colors touch-target-btn cursor-pointer"
              aria-label="Mở menu điều hướng"
            >
              <span className="material-symbols-outlined text-2xl">menu</span>
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
          <div className="mobile-nav-panel p-6 space-y-6 bg-white">
            <div className="flex items-center justify-between pb-4 border-b border-[#C5C6CD]">
              <span className="font-display text-xl font-bold tracking-tight text-[#091426] italic">
                VCUBE <span className="font-sans text-xs not-italic text-[#00687A]">Vietnam</span>
              </span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-[#091426] hover:bg-black/10 rounded"
                aria-label="Đóng menu"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {/* Language Selector */}
            <div className="p-3 bg-[#F1F5F9] border border-[#CBD5E1] rounded space-y-1.5">
              <span className="text-[10px] font-tech uppercase font-bold text-[#545F73] block">
                Ngôn ngữ / Language:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setLanguage('vi')}
                  className={`py-2 px-3 rounded text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
                    language === 'vi'
                      ? 'bg-[#091426] text-white border-[#091426]'
                      : 'bg-white text-[#091426] border-[#CBD5E1]'
                  }`}
                >
                  <span>🇻🇳</span>
                  <span>Tiếng Việt</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  className={`py-2 px-3 rounded text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
                    language === 'en'
                      ? 'bg-[#091426] text-white border-[#091426]'
                      : 'bg-white text-[#091426] border-[#CBD5E1]'
                  }`}
                >
                  <span>🇺🇸</span>
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
                  className={`w-full text-left px-3 py-3 rounded text-xs font-sans uppercase tracking-wider font-bold flex items-center justify-between transition-colors ${
                    currentScreen === item.id
                      ? 'bg-[#00687A] text-white'
                      : 'text-[#091426] hover:bg-[#EFF4FF]'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-base">{item.icon}</span>
                    {item.label}
                  </span>
                </button>
              ))}
            </nav>

            <div className="pt-4 border-t border-[#C5C6CD] space-y-3">
              {isLoggedIn ? (
                <>
                  {/* User Profile Card for Mobile */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-linear-to-tr from-[#00687A] to-[#57DFFE] p-0.5 flex-shrink-0">
                        <div className="w-full h-full rounded-full bg-[#091426] flex items-center justify-center text-white font-bold text-sm">
                          {profile?.displayName ? profile.displayName.charAt(0).toUpperCase() : 'U'}
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-[#091426] truncate">
                            {profile?.displayName || user?.email?.split('@')[0]}
                          </span>
                          <span className={`text-[9px] font-tech font-bold uppercase px-1.5 py-0.5 rounded border ${
                            role === 'admin'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : role === 'designer'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : role === 'lab'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}>
                            {role === 'admin' ? 'Admin' : role === 'designer' ? 'Creator' : role === 'lab' ? 'MES Hub' : 'Customer'}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 truncate block font-mono">
                          {user?.email}
                        </span>
                      </div>
                    </div>

                    {/* Mobile Quick Role Switcher */}
                    <div className="pt-2 border-t border-slate-200">
                      <span className="text-[10px] font-tech uppercase font-bold text-slate-400 block mb-1.5">
                        {language === 'vi' ? 'Góc nhìn vai trò (Demo Switcher):' : 'Role Perspective (Demo):'}
                      </span>
                      <div className="grid grid-cols-4 gap-1">
                        {(['customer', 'designer', 'lab', 'admin'] as UserRole[]).map((r) => (
                          <button
                            key={r}
                            onClick={() => {
                              switchDemoRole(r);
                              if (onShowToast) {
                                onShowToast(
                                  r === 'admin' ? 'Đã đổi: Super Admin' :
                                  r === 'designer' ? 'Đã đổi: Designer Pro' :
                                  r === 'lab' ? 'Đã đổi: Xưởng MES' : 'Đã đổi: Khách Hàng'
                                );
                              }
                            }}
                            className={`py-1.5 text-[10px] font-bold rounded uppercase tracking-wider transition-all border ${
                              role === r
                                ? 'bg-[#091426] text-white border-[#091426] shadow-2xs'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {r === 'customer' ? 'Khách' : r === 'designer' ? 'Design' : r === 'lab' ? 'MES' : 'Admin'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      if (onOpenAuth) onOpenAuth('account');
                    }}
                    className="w-full py-2.5 bg-[#00687A] hover:bg-[#005463] text-white text-xs font-bold uppercase rounded-lg text-center block transition-colors cursor-pointer shadow-xs"
                  >
                    {t('switchAccount', 'Tài Khoản & Thông Tin', 'Account & Details')}
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      logout();
                    }}
                    className="w-full py-2.5 border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold uppercase rounded-lg text-center flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">logout</span>
                    <span>{t('signOut', 'Đăng Xuất Khỏi Thiết Bị', 'Sign Out')}</span>
                  </button>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    to="/auth/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-2.5 px-3 border border-[#C5C6CD] hover:border-[#00687A] text-[#091426] hover:bg-[#EFF4FF] text-xs font-bold uppercase rounded text-center transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <span className="material-symbols-outlined text-sm">login</span>
                    <span>{language === 'vi' ? 'Đăng nhập' : 'Sign In'}</span>
                  </Link>
                  <Link
                    to="/auth/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-2.5 px-3 bg-[#091426] hover:bg-[#00687A] text-white text-xs font-bold uppercase rounded text-center transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <span className="material-symbols-outlined text-sm">person_add</span>
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
