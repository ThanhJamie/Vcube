import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { Icon } from '@frontend/ui';

export const NotFoundView: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isVi = language === 'vi';

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6 bg-surface-muted">
      <div className="max-w-md w-full bg-surface rounded-lg shadow-e3 p-8 text-center space-y-6">
        <div className="w-20 h-20 bg-danger-tint border border-danger/30 text-danger rounded-lg flex items-center justify-center mx-auto shadow-e0">
          <Icon name="travel_explore" size={36} />
        </div>

        <div className="space-y-2">
          <span className="font-tech text-xs text-danger uppercase tracking-widest font-bold block">
            ERROR 404 • ROUTE NOT FOUND
          </span>
          <h2 className="font-display text-2xl font-bold text-fg">
            {isVi ? 'Không Tìm Thấy Trang Yêu Cầu' : 'Page Not Found'}
          </h2>
          <p className="text-xs text-fg-muted font-sans leading-relaxed">
            {isVi
              ? 'Đường dẫn bạn vừa truy cập không tồn tại hoặc đã được chuyển sang phân hệ khác trong hệ thống VCUBE.'
              : 'The URL or route you requested does not exist or has been relocated to another workspace in the VCUBE platform.'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => navigate('/')}
            className="flex-1 py-3 px-4 bg-primary hover:bg-primary-hover text-primary-fg text-xs font-bold uppercase tracking-wider rounded-lg transition-all shadow-e2 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Icon name="home" size={18} />
            {isVi ? 'Về Trang Chủ' : 'Return Home'}
          </button>
          
          <button
            onClick={() => navigate('/explore')}
            className="py-3 px-4 border border-line hover:bg-canvas text-fg text-xs font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Icon name="storefront" size={18} />
            {isVi ? 'Khám Phá' : 'Marketplace'}
          </button>
        </div>
      </div>
    </div>
  );
};
