import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

export const NotFoundView: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isVi = language === 'vi';

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6 bg-[#F8F9FF]">
      <div className="max-w-md w-full bg-white border border-[#CBD5E1] rounded-2xl shadow-xl p-8 text-center space-y-6">
        <div className="w-20 h-20 bg-rose-50 border border-rose-200 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
          <span className="material-symbols-outlined text-4xl">travel_explore</span>
        </div>

        <div className="space-y-2">
          <span className="font-tech text-xs text-rose-600 uppercase tracking-widest font-bold block">
            ERROR 404 • ROUTE NOT FOUND
          </span>
          <h2 className="font-display text-2xl font-bold text-[#091426]">
            {isVi ? 'Không Tìm Thấy Trang Yêu Cầu' : 'Page Not Found'}
          </h2>
          <p className="text-xs text-[#545F73] font-sans leading-relaxed">
            {isVi
              ? 'Đường dẫn bạn vừa truy cập không tồn tại hoặc đã được chuyển sang phân hệ khác trong hệ thống VCUBE.'
              : 'The URL or route you requested does not exist or has been relocated to another workspace in the VCUBE platform.'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => navigate('/')}
            className="flex-1 py-3 px-4 bg-[#00687A] hover:bg-[#005463] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">home</span>
            {isVi ? 'Về Trang Chủ' : 'Return Home'}
          </button>
          
          <button
            onClick={() => navigate('/explore')}
            className="py-3 px-4 border border-[#CBD5E1] hover:bg-slate-50 text-[#091426] text-xs font-bold uppercase tracking-wider rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">storefront</span>
            {isVi ? 'Khám Phá' : 'Marketplace'}
          </button>
        </div>
      </div>
    </div>
  );
};
