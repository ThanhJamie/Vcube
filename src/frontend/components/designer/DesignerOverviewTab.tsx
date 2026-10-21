import React, { useEffect, useState } from 'react';
import { Product, CustomDesignRequest } from '../../../types';
import { Badge, Button, DataTable, Icon, StatCard } from '@frontend/ui';
import type { BadgeVariant, DataTableColumn } from '@frontend/ui';
import { formatCurrency, formatNumber } from '@frontend/lib/format';
import { customDesignService } from '../../../backend/services/customDesignService';

/** Trạng thái yêu cầu → biến thể badge §3.4 (giá trị enum vẫn chỉ sống trong code/DB). */
const REQUEST_STATUS_VARIANT: Record<CustomDesignRequest['status'], BadgeVariant> = {
  Pending: 'warning',
  'In Progress': 'info',
  Quoted: 'technical',
  Completed: 'success',
};

/** Nhãn hiển thị VI — không render thô `Pending`/`In Progress`/`Quoted`/`Completed` ra UI. */
const REQUEST_STATUS_LABELS: Record<CustomDesignRequest['status'], string> = {
  Pending: 'Chờ duyệt',
  'In Progress': 'Đang thực hiện',
  Quoted: 'Đã báo giá',
  Completed: 'Hoàn thành',
};

export interface DesignerOverviewTabProps {
  products: Product[];
  availableBalance?: number;
  /** uid tác giả — lọc yêu cầu CAD theo đúng người (RLS cũng đã siết). */
  currentDesignerId?: string;
  onNavigate: (screen: string, payload?: any) => void;
  onTabChange: (tab: 'overview' | 'models' | 'wizard' | 'payouts' | 'requests') => void;
  onSelectRequest?: (requestId: string) => void;
}

export const DesignerOverviewTab: React.FC<DesignerOverviewTabProps> = ({
  products,
  availableBalance,
  currentDesignerId,
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
        const reqs = await customDesignService.getRequests(currentDesignerId);
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
  }, [currentDesignerId]);

  const totalPrints = products.reduce((acc, p) => acc + (p.printsCount || 0), 0);
  const totalDownloads = products.reduce((acc, p) => acc + (p.salesCount || 0), 0);
  const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

  /** Bảng yêu cầu CAD gần đây — §3.5 (empty do `DataTable` render NGOÀI bảng). */
  const inquiryColumns: DataTableColumn<CustomDesignRequest>[] = [
    {
      key: 'title',
      header: 'Yêu cầu',
      value: (req) => req.title,
      render: (req) => (
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-tint text-xs font-semibold text-fg">
            {req.clientInitials}
          </span>
          <div className="min-w-0">
            <span className="block truncate font-semibold text-fg">{req.title}</span>
            <span className="block truncate text-xs text-fg-subtle">
              {req.previewMessage || 'Yêu cầu tùy chỉnh'}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'clientName',
      header: 'Khách hàng',
      value: (req) => req.clientName,
      render: (req) => <span className="text-sm text-fg-muted">{req.clientName}</span>,
    },
    {
      key: 'status',
      header: 'Trạng thái',
      value: (req) => req.status,
      render: (req) => (
        <Badge variant={REQUEST_STATUS_VARIANT[req.status] ?? 'neutral'} dot>
          {REQUEST_STATUS_LABELS[req.status] ?? req.status}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {/* 4 Metric Cards — chỉ hiển thị số THẬT; thiếu nguồn ⇒ `—` (không bịa). */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Doanh thu &amp; hoa hồng khả dụng"
          value={formatCurrency(availableBalance)}
          icon={<Icon name="payments" size={20} />}
          hint={
            isNum(availableBalance) ? 'Số dư khả dụng đã ghi nhận' : 'Chưa có nguồn số dư khả dụng'
          }
        />

        <StatCard
          label="Lượt tải tệp số STL / STEP"
          value={formatNumber(totalDownloads)}
          icon={<Icon name="download" size={20} />}
          hint="Tổng lượt tải ghi nhận trên ấn phẩm của bạn"
        />

        <StatCard
          label="Đơn in 3D vật lý đã xuất"
          value={formatNumber(totalPrints)}
          icon={<Icon name="precision_manufacturing" size={20} />}
          hint="Tổng số lần in ghi nhận trên ấn phẩm của bạn"
        />

        <StatCard
          label="Độ tin cậy QC &amp; in thành công"
          value={<span className="text-fg-muted">—</span>}
          icon={<Icon name="verified" size={20} />}
          hint="Chưa có dữ liệu QC gắn với tài khoản của bạn"
        />
      </div>

      {/* Recent Inquiries + CTA */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="flex flex-col gap-3 lg:col-span-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-fg">
              <Icon name="chat" size={20} className="text-fg-muted" />
              Yêu cầu CAD riêng từ khách hàng
            </h2>
            <button
              onClick={() => onTabChange('requests')}
              className="rounded-sm text-sm font-medium text-fg-muted underline-offset-4 transition-colors hover:text-fg hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Xem toàn bộ hộp thư →
            </button>
          </div>

          <DataTable<CustomDesignRequest>
            columns={inquiryColumns}
            rows={inquiries.slice(0, 5)}
            getRowId={(req) => req.id}
            caption="Yêu cầu CAD gần đây"
            tableLabel="Yêu cầu CAD gần đây"
            pagination={false}
            stickyHeader={false}
            loading={isLoadingInquiries}
            loadingLabel="Đang tải danh sách yêu cầu CAD"
            emptyTitle="Chưa có yêu cầu CAD nào từ khách hàng"
            emptyDescription="Yêu cầu thiết kế tuỳ chỉnh sẽ xuất hiện ở đây ngay khi khách hàng gửi."
            onRowClick={(req) => {
              onSelectRequest?.(req.id);
              onTabChange('requests');
            }}
          />
        </div>

        <div className="rounded-lg border border-line bg-surface p-6 lg:col-span-4">
          <div className="flex h-full flex-col justify-between gap-6">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
                CHÍNH SÁCH ĐỒNG BỘ ẤN PHẨM
              </p>
              <h3 className="text-lg font-bold tracking-tight text-fg">
                Đồng bộ trực tiếp vào cơ sở dữ liệu
              </h3>
              <p className="text-sm leading-relaxed text-fg-muted">
                Mọi ấn phẩm do bạn tạo mới hoặc điều chỉnh giá sẽ tự động được lưu vào cơ sở dữ
                liệu ấn phẩm chung của VCUBE, xuất hiện ngay trên sàn VCUBE và hệ thống báo giá in.
              </p>
            </div>
            <Button variant="primary" fullWidth onClick={() => onTabChange('wizard')}>
              Tải lên ấn phẩm mới ngay
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
