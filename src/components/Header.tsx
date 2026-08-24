import React, { useState } from 'react';
import { CartItem, SiteContentConfig } from '../types';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

interface HeaderProps {
  currentScreen: string;
  onNavigate: (screen: string, payload?: any) => void;
  cart: CartItem[];
  siteContent?: SiteContentConfig;
  onOpenSearch?: () => void;
  onOpenAuth?: (mode?: 'signin' | 'signup' | 'role_select') => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentScreen,
  onNavigate,
  cart,
  siteContent,
  onOpenAuth,
}) => {
  const { user, profile, role, switchDemoRole, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [quickSearchQuery, setQuickSearchQuery] = useState('');

  const cartItemsCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  // Streamlined MVP Navigation Items
  const navItems = [
    { id: 'explore', label: t('navExplore', 'Marketplace', 'Marketplace'), icon: 'storefront' },
    { id: 'tool_3d', label: t('navLab3D', 'Báo Giá In 3D', '3D Quoting'), icon: 'view_in_ar' },
    { id: 'my_orders', label: t('navOrders', 'Đơn Hàng', 'Orders'), icon: 'receipt_long' },
    { id: 'admin', label: t('navAdmin', 'Quản Trị Admin', 'Admin Console'), icon: 'admin_panel_settings' },
  ];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickSearchQuery.trim()) {
      onNavigate('explore', { search: quickSearchQuery.trim() });
      setMobileMenuOpen(false);
    }
  };

  const handleNavClick = (screenId: string) => {
    onNavigate(screenId);
    setMobileMenuOpen(false);
  };

  const getRoleBadge = () => {
    if (role === 'admin') {
      return { text: 'ADMIN', color: 'bg-purple-100 text-purple-800 border-purple-300' };
    }
    if (role === 'designer') {
      return { text: 'CREATOR', color: 'bg-amber-100 text-amber-800 border-amber-300' };
    }
    return { text: 'CUSTOMER', color: 'bg-blue-100 text-blue-800 border-blue-300' };
  };

  const badge = getRoleBadge();

  return (
    <>
      {/* Top Site Announcement Banner from Admin Content Config */}
      {siteContent?.announcementActive && siteContent?.announcementText && (
        <div className="bg-[#091426] text-white py-1.5 px-4 text-center text-[11px] font-sans font-medium flex items-center justify-center gap-2 border-b border-black/20">
          <span className="truncate">{siteContent.announcementText}</span>
          <button
            onClick={() => onNavigate('tool_3d')}
            className="text-[#57DFFE] hover:underline font-bold text-[10px] uppercase font-tech shrink-0 hidden sm:inline ml-1"
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
            className="flex items-baseline gap-1.5 focus-visible:outline-none group shrink-0"
            aria-label="VCUBE Home"
          >
            <span className="font-display text-2xl sm:text-[26px] font-bold tracking-tighter leading-none uppercase italic text-[#091426]">
              VCUBE
            </span>
            <span className="text-[#00687A] font-semibold text-xs uppercase tracking-wider">
              Vietnam
            </span>
          </button>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden md:flex items-center gap-4 lg:gap-6 font-sans text-xs uppercase tracking-wider font-bold">
            {navItems.map((item) => {
              const isActive = currentScreen === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`pb-1 transition-all whitespace-nowrap shrink-0 border-b-2 flex items-center gap-1 touch-target-btn ${
                    isActive
                      ? 'border-[#00687A] text-[#00687A] font-extrabold'
                      : 'border-transparent text-[#545F73] hover:text-[#091426] hover:border-black/30'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">{item.icon}</span>
                  {item.label}
                  {item.id === 'admin' && (
                    <span className="text-[8px] bg-purple-100 text-purple-700 px-1 py-0.2 rounded font-tech font-bold ml-0.5">
                      FORGE
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
                className={`px-2 py-1 rounded-xs transition-all flex items-center gap-1 leading-none ${
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
                className={`px-2 py-1 rounded-xs transition-all flex items-center gap-1 leading-none ${
                  language === 'en'
                    ? 'bg-[#091426] text-white shadow-xs'
                    : 'text-[#545F73] hover:text-[#091426] hover:bg-white/50'
                }`}
              >
                <span>🇺🇸</span>
                <span className="hidden sm:inline">ENG</span>
              </button>
            </div>

            {/* Quick Search on Desktop */}
            <div className="relative hidden lg:block">
              <form onSubmit={handleSearchSubmit}>
                <div className="flex items-center bg-white border border-[#C5C6CD] rounded px-3 py-1.5 focus-within:border-[#00687A] transition-all">
                  <span className="material-symbols-outlined text-[#75777D] text-base mr-1.5">search</span>
                  <input
                    type="text"
                    placeholder={t('searchPlaceholder', 'Tìm linh kiện, STL...', 'Search parts, STL...')}
                    value={quickSearchQuery}
                    onChange={(e) => setQuickSearchQuery(e.target.value)}
                    className="bg-transparent text-xs text-[#091426] placeholder-[#8590A6] focus:outline-none w-28 xl:w-36 font-sans"
                  />
                </div>
              </form>
            </div>

            {/* Cart Icon & Counter */}
            <button
              onClick={() => handleNavClick('cart')}
              className="relative p-2 text-[#091426] hover:bg-black/5 rounded transition-colors focus-visible:outline-none touch-target-btn"
              aria-label={t('cartTitle', 'Giỏ hàng VCUBE', 'VCUBE Cart')}
            >
              <span className="material-symbols-outlined text-2xl">shopping_cart</span>
              {cartItemsCount > 0 && (
                <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-[#00687A] text-white text-[9px] font-tech font-bold rounded-full flex items-center justify-center">
                  {cartItemsCount}
                </span>
              )}
            </button>

            {/* User Account / Guest Status */}
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-1.5 p-1 border border-[#C5C6CD] hover:border-[#00687A] rounded transition-all focus-visible:outline-none touch-target-btn"
                aria-label="User Account"
              >
                <div className={`w-7 h-7 flex items-center justify-center font-bold text-xs text-white rounded-xs ${
                  role === 'admin' ? 'bg-purple-900' : 'bg-[#091426]'
                }`}>
                  {profile?.displayName ? profile.displayName.charAt(0).toUpperCase() : 'V'}
                </div>
                <span className="material-symbols-outlined text-xs text-[#545F73]">arrow_drop_down</span>
              </button>

              {userDropdownOpen && (
                <div
                  onMouseLeave={() => setUserDropdownOpen(false)}
                  className="absolute right-0 mt-2 w-72 bg-white border border-[#C5C6CD] shadow-2xl py-3 z-50 animate-in fade-in duration-150 text-xs rounded"
                >
                  <div className="px-4 py-2 border-b border-[#E5EEFF] bg-[#F8FAFC]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-tech text-[9px] uppercase tracking-widest text-[#00687A] font-bold">
                        {user ? (language === 'vi' ? 'TÀI KHOẢN ĐÃ ĐĂNG NHẬP' : 'LOGGED IN') : (language === 'vi' ? 'KHÁCH VÃNG LAI (GUEST)' : 'GUEST SESSION')}
                      </span>
                      <span className={`text-[8px] font-tech font-bold px-1.5 py-0.5 rounded uppercase ${badge.color}`}>
                        {role}
                      </span>
                    </div>
                    <p className="font-bold text-sm text-[#091426] truncate">{profile?.displayName || 'Khách Mua Hàng'}</p>
                    <p className="text-[11px] font-tech text-[#545F73] truncate">{profile?.email || 'guest@vcube.vn'}</p>
                  </div>

                  {/* Fast role switcher inside dropdown */}
                  <div className="px-3 py-2 border-b border-[#E5EEFF] bg-[#EFF4FF]/50">
                    <p className="text-[10px] font-tech uppercase tracking-wider text-[#545F73] mb-1.5 font-bold">
                      {t('switchRoleQuick', 'Chuyển vai trò thử nghiệm:', 'Quick Role Switch:')}
                    </p>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => switchDemoRole('customer')}
                        className={`px-2 py-1 text-[10px] rounded font-bold transition-all ${
                          role === 'customer' ? 'bg-blue-600 text-white' : 'bg-white border border-[#C5C6CD] text-[#091426] hover:bg-black/5'
                        }`}
                      >
                        {t('roleCustomer', 'Khách Hàng', 'Customer')}
                      </button>
                      <button
                        onClick={() => switchDemoRole('admin')}
                        className={`px-2 py-1 text-[10px] rounded font-bold transition-all ${
                          role === 'admin' ? 'bg-purple-700 text-white' : 'bg-white border border-[#C5C6CD] text-[#091426] hover:bg-black/5'
                        }`}
                      >
                        {t('roleAdmin', 'Quản Trị Admin', 'Admin')}
                      </button>
                    </div>
                  </div>

                  <div className="py-1.5 divide-y divide-[#F8FAFC]">
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        handleNavClick('my_orders');
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-[#EFF4FF] flex items-center gap-2 text-[#091426]"
                    >
                      <span className="material-symbols-outlined text-base text-[#545F73]">receipt_long</span>
                      {t('myOrdersTracking', 'Đơn hàng & Theo dõi in', 'Orders & Print Tracking')}
                    </button>
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        handleNavClick('admin');
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-[#EFF4FF] flex items-center justify-between text-[#091426] font-bold"
                    >
                      <span className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-base text-purple-700">admin_panel_settings</span>
                        ForgeControl Admin
                      </span>
                    </button>
                  </div>

                  <div className="pt-2 border-t border-[#E5EEFF] px-4 space-y-1.5">
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        if (onOpenAuth) onOpenAuth('signin');
                      }}
                      className="w-full text-center py-1.5 bg-[#00687A] text-white text-xs font-bold uppercase rounded hover:bg-[#005463] transition-colors"
                    >
                      {user ? t('switchAccount', 'Đổi Tài Khoản', 'Switch Account') : t('signInSignUp', 'Đăng Nhập / Đăng Ký', 'Sign In / Register')}
                    </button>
                    {user && (
                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          logout();
                        }}
                        className="w-full text-center py-1 text-[11px] text-rose-600 hover:text-rose-800 font-bold"
                      >
                        {t('signOut', 'Đăng Xuất', 'Sign Out')}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 text-[#091426] hover:bg-black/5 rounded transition-colors touch-target-btn"
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

            {/* Nav Items List */}
            <nav className="space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full text-left px-3 py-3 rounded text-xs font-sans uppercase tracking-wider font-bold flex items-center justify-between transition-colors ${
                    currentScreen === item.id
                      ? 'bg-[#091426] text-white'
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

            <div className="pt-4 border-t border-[#C5C6CD]">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  if (onOpenAuth) onOpenAuth('signin');
                }}
                className="w-full py-2.5 bg-[#00687A] text-white text-xs font-bold uppercase rounded text-center block"
              >
                {user ? t('switchAccount', 'Tài Khoản & Đổi Vai Trò', 'Account & Role') : t('signInSignUp', 'Đăng Nhập / Đăng Ký', 'Sign In / Register')}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
};
