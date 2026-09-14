import React, { useEffect, useState } from 'react';
import { Product, CustomDesignRequest } from '../../../types';
import { Icon } from '@frontend/ui';
import { customDesignService } from '../../../backend/services/customDesignService';

export interface DesignerOverviewTabProps {
  products: Product[];
  availableBalance?: number;
  onNavigate: (screen: string, payload?: any) => void;
  onTabChange: (tab: 'overview' | 'models' | 'wizard' | 'payouts' | 'requests') => void;
  onSelectRequest?: (requestId: string) => void;
}

export const DesignerOverviewTab: React.FC<DesignerOverviewTabProps> = ({
  products,
  availableBalance = 48500000,
  onNavigate,
  onTabChange,
  onSelectRequest,
}) => {
  const [inquiries, setInquiries] = useState<CustomDesignRequest[]>([]);
  const [isLoadingInquiries, setIsLoadingInquiries] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    const loadInquiries = async () => {
      try {
        const reqs = await customDesignService.getRequests();
        if (isMounted) {
          setInquiries(reqs);
        }
      } catch (err) {
        console.error('Lỗi khi tải yêu cầu CAD tại Overview:', err);
      } finally {
        if (isMounted) {
          setIsLoadingInquiries(false);
        }
      }
    };

    void loadInquiries();
    const unsubscribe = customDesignService.subscribe(() => {
      void loadInquiries();
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const totalPrints = products.reduce((acc, p) => acc + (p.printsCount || 0), 0);
  const totalDownloads = products.reduce((acc, p) => acc + (p.salesCount || 0), 0);

  return (
    <div className="space-y-6">
      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface p-5 rounded-sm flex flex-col justify-between hover:border-primary transition-colors shadow-e1">
          <div className="flex justify-between items-start mb-2">
            <span className="font-tech text-xs text-fg-muted uppercase tracking-wider">
              Doanh Thu &amp; Hoa Hồng Khả Dụng
            </span>
            <Icon name="payments" size={24} className="text-primary" />
          </div>
          <div className="text-2xl font-bold font-tech text-fg">
            {availableBalance.toLocaleString('vi-VN')} đ
          </div>
          <div className="text-xs text-primary font-tech mt-2 flex items-center gap-1">
            <Icon name="trending_up" size={16} /> +22.4% hoa hồng tháng này
          </div>
        </div>

        <div className="bg-surface p-5 rounded-sm flex flex-col justify-between hover:border-primary transition-colors shadow-e1">
          <div className="flex justify-between items-start mb-2">
            <span className="font-tech text-xs text-fg-muted uppercase tracking-wider">
              Lượt Tải File Số STL / STEP
            </span>
            <Icon name="download" size={24} className="text-fg-muted" />
          </div>
          <div className="text-2xl font-bold font-tech text-fg">
            {totalDownloads > 0 ? totalDownloads.toLocaleString('vi-VN') : '1.842'}
          </div>
          <div className="text-xs text-fg-muted mt-2 font-tech">Hưởng 90% giá bán file số</div>
        </div>

        <div className="bg-surface p-5 rounded-sm flex flex-col justify-between hover:border-primary transition-colors shadow-e1">
          <div className="flex justify-between items-start mb-2">
            <span className="font-tech text-xs text-fg-muted uppercase tracking-wider">
              Đơn In 3D Vật Lý Đã Xuất
            </span>
            <Icon name="precision_manufacturing" size={24} className="text-fg-muted" />
          </div>
          <div className="text-2xl font-bold font-tech text-fg">
            {totalPrints > 0 ? totalPrints.toLocaleString('vi-VN') : '529'}
          </div>
          <div className="text-xs text-primary font-tech mt-2">
            Hưởng 10% hoa hồng trên mỗi chi tiết
          </div>
        </div>

        <div className="bg-surface p-5 rounded-sm flex flex-col justify-between hover:border-primary transition-colors shadow-e1">
          <div className="flex justify-between items-start mb-2">
            <span className="font-tech text-xs text-fg-muted uppercase tracking-wider">
              Độ Tin Cậy QC &amp; In Thành Công
            </span>
            <Icon name="verified" size={24} className="text-primary" />
          </div>
          <div className="text-2xl font-bold font-tech text-fg">99.2%</div>
          <div className="w-full bg-line-subtle h-1.5 mt-2 rounded-sm overflow-hidden">
            <div className="bg-primary h-full" style={{ width: '99.2%' }}></div>
          </div>
        </div>
      </div>

      {/* Quick Actions & Recent Inquiries */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-surface p-6 rounded-sm space-y-4 shadow-e1">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <h3 className="font-bold text-sm uppercase tracking-wider text-fg flex items-center gap-2">
              <Icon name="chat" size={24} className="text-primary" />
              Yêu Cầu CAD Riêng Từ Khách Hàng
            </h3>
            <button
              onClick={() => onTabChange('requests')}
              className="text-xs text-primary font-bold hover:underline"
            >
              Xem Toàn Bộ Hộp Thư →
            </button>
          </div>

          {isLoadingInquiries ? (
            <div className="py-8 text-center text-xs text-fg-muted">
              Đang tải danh sách yêu cầu...
            </div>
          ) : inquiries.length === 0 ? (
            <div className="py-8 text-center text-xs text-fg-muted">
              Chưa có yêu cầu CAD nào từ khách hàng
            </div>
          ) : (
            <div className="divide-y divide-line-subtle">
              {inquiries.slice(0, 5).map((req) => (
                <div
                  key={req.id}
                  onClick={() => {
                    onSelectRequest?.(req.id);
                    onTabChange('requests');
                  }}
                  className="py-3 flex items-center justify-between hover:bg-surface-muted px-2 rounded-sm cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 text-fg font-bold flex items-center justify-center text-xs">
                      {req.clientInitials}
                    </div>
                    <div>
                      <p className="font-bold text-xs text-fg">{req.title}</p>
                      <p className="text-xs text-fg-muted">
                        {req.clientName} • {req.previewMessage || 'Yêu cầu tùy chỉnh'}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-tech font-bold px-2 py-0.5 bg-primary/10 text-primary rounded-sm">
                    {req.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-4 bg-surface-inverse text-on-inverse p-6 rounded-sm flex flex-col justify-between shadow-e2">
          <div>
            <span className="text-xs font-tech uppercase tracking-widest text-accent">
              CHÍNH SÁCH ĐỒNG BỘ CATALOG
            </span>
            <h3 className="text-lg font-bold mt-1">Đồng Bộ Trực Tiếp Vào Database</h3>
            <p className="text-xs text-fg-subtle mt-2 leading-relaxed">
              Mọi ấn phẩm do bạn tạo mới hoặc điều chỉnh giá sẽ tự động được lưu trữ vào Catalog DB
              chung của VCUBE, xuất hiện ngay lập tức trên Marketplace và hệ thống báo giá in.
            </p>
          </div>
          <button
            onClick={() => onTabChange('wizard')}
            className="w-full mt-6 py-3 bg-accent hover:bg-accent/80 text-surface-inverse font-bold text-xs uppercase tracking-wider rounded-full transition-colors touch-target-btn"
          >
            Tải Lên Ấn Phẩm Mới Ngay
          </button>
        </div>
      </div>
    </div>
  );
};
