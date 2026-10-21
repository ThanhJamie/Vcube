import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Icon } from '@frontend/ui';

export const NotFoundView: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-dvh grid place-items-center bg-canvas p-6">
      <div className="w-full max-w-md rounded-xl border border-line bg-surface p-8 text-center space-y-6">
        <div className="mx-auto grid size-14 place-items-center rounded-md border border-danger/20 bg-danger-tint text-danger">
          <Icon name="travel_explore" size={28} />
        </div>

        <div className="space-y-2">
          <span className="font-tech text-xs text-danger uppercase tracking-wider font-semibold block">
            LỖI 404 • KHÔNG TÌM THẤY ĐƯỜNG DẪN
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-fg">
            Không Tìm Thấy Trang Yêu Cầu
          </h1>
          <p className="text-sm text-fg-muted font-sans leading-relaxed">
            Đường dẫn bạn vừa truy cập không tồn tại hoặc đã được chuyển sang phân hệ khác trong hệ thống VCUBE.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            size="lg"
            className="flex-1"
            onClick={() => navigate('/')}
            leadingIcon={<Icon name="home" size={16} />}
          >
            Về Trang Chủ
          </Button>

          <Button
            size="lg"
            variant="secondary"
            onClick={() => navigate('/explore')}
            leadingIcon={<Icon name="storefront" size={16} />}
          >
            Khám Phá
          </Button>
        </div>
      </div>
    </div>
  );
};
