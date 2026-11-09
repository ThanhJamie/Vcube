import React from 'react';
import { Button, EmptyState, Icon, InfoTip } from '@frontend/ui';

/**
 * ExploreEmptyCatalog — các trạng thái rỗng của kho bản vẽ CAD.
 *
 * Tách khỏi `ExploreView` (presentational, không đọc state) để giữ file view dưới trần dòng.
 * Nội dung/aria/class giữ nguyên bản cũ.
 */

/**
 * Kho chưa có bản vẽ nào:
 * - `live` + `bordered`: empty state xuất hiện sau khi tải xong catalog.
 * - 3 việc gợi ý ngay dưới mô tả: báo giá tệp 3D, xem dịch vụ gia công, tra cứu đơn hàng.
 * - 2 CTA: gửi tệp 3D để nhận báo giá in (primary) và về trang chủ (secondary).
 */
interface ExploreEmptyCatalogProps {
  onNavigate: (screen: string) => void;
}

/** 3 hành động gợi ý — chỉ mô tả đường đi thật, không hứa hẹn dữ liệu chưa có. */
const QUICK_ACTIONS: ReadonlyArray<{
  screen: 'quote' | 'home' | 'tracking';
  icon: string;
  label: string;
  hint: string;
}> = [
  { screen: 'quote', icon: 'upload_file', label: 'Gửi tệp 3D để báo giá', hint: 'Tải STL/3MF/OBJ' },
  { screen: 'home', icon: 'precision_manufacturing', label: 'Xem dịch vụ gia công in 3D', hint: 'Quy trình, vật liệu, thời gian' },
  { screen: 'tracking', icon: 'receipt_long', label: 'Tra cứu đơn hàng', hint: 'Cần mã đơn + token' },
];

export const ExploreEmptyCatalog: React.FC<ExploreEmptyCatalogProps> = ({ onNavigate }) => (
  <EmptyState
    live
    bordered
    icon={<Icon name="inventory_2" size={20} />}
    title={'Kho bản vẽ đang cập nhật'}
    description={
      <>
        {'Hiện chưa có bản vẽ CAD nào được đăng trên VCUBE. Trong lúc chờ, bạn vẫn có thể gửi tệp 3D để nhận báo giá in.'}
        <span className="mt-4 flex w-full flex-col gap-2 text-left">
          <span className="text-xs font-semibold text-fg-subtle">{'3 việc có thể làm ngay'}</span>
          <span className="flex flex-col gap-2">
            {QUICK_ACTIONS.map((item) => (
              <button
                key={item.screen}
                type="button"
                onClick={() => onNavigate(item.screen)}
                className="group flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-md border border-line-subtle bg-surface px-3 py-2 text-left transition-colors duration-200 hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-sm bg-surface-muted text-fg-muted transition-colors duration-200 group-hover:text-fg motion-reduce:transition-none">
                  <Icon name={item.icon} size={18} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm font-medium text-fg">{item.label}</span>
                  <span className="text-xs text-fg-muted">{item.hint}</span>
                </span>
                <Icon name="chevron_right" size={16} className="shrink-0 text-fg-subtle" />
              </button>
            ))}
          </span>
        </span>
        <span className="mt-2 flex justify-center">
          <InfoTip label="Vì sao có thể không thấy bản vẽ nào?" title="Về trạng thái rỗng">
            {'Chưa có bản vẽ nào được đăng nên bộ lọc chưa có gì để lọc. Bạn vẫn gửi được tệp 3D của mình để nhận báo giá in.'}
          </InfoTip>
        </span>
      </>
    }
    action={
      <>
        <Button
          variant="primary"
          size="md"
          leadingIcon={<Icon name="request_quote" size={18} />}
          onClick={() => onNavigate('quote')}
        >
          Báo giá tệp 3D của bạn
        </Button>
        <Button
          variant="secondary"
          size="md"
          leadingIcon={<Icon name="home" size={18} />}
          onClick={() => onNavigate('home')}
        >
          Về trang chủ
        </Button>
      </>
    }
  />
);

interface ExploreEmptyFilterProps {
  /** Số bản vẽ khớp bộ lọc hiện tại. */
  resultCount: number;
  /** Tổng số bản vẽ trong catalog đang hiển thị với vai trò hiện tại. */
  totalCount: number;
  onQuote: () => void;
  onReset: () => void;
}

/**
 * Có bản vẽ trong kho nhưng bộ lọc không khớp — nêu nguyên nhân + đường thoát thật:
 * bỏ lọc hoặc gửi tệp 3D để nhận báo giá in.
 */
export const ExploreEmptyFilter: React.FC<ExploreEmptyFilterProps> = ({
  resultCount,
  totalCount,
  onQuote,
  onReset,
}) => (
  <EmptyState
    live
    bordered
    icon={<Icon name="search_off" size={20} />}
    title={'Không có bản vẽ nào khớp bộ lọc'}
    description={
      <>
        {'Hãy bỏ bớt điều kiện hoặc đổi từ khoá tìm kiếm.'}
        <span className="mt-2 block">
          <button
            type="button"
            onClick={onQuote}
            className="cursor-pointer rounded-sm text-sm font-medium text-fg underline underline-offset-4 transition-colors duration-200 hover:text-fg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Báo giá tệp 3D của bạn
          </button>
        </span>
        <span className="mt-2 flex justify-center">
          <InfoTip label="Vì sao có thể không thấy bản vẽ nào?" title="Về trạng thái rỗng">
            {`${resultCount} / ${totalCount} bản vẽ khớp bộ lọc đang chọn.`}
          </InfoTip>
        </span>
      </>
    }
    action={
      <Button variant="primary" size="md" leadingIcon={<Icon name="restart_alt" size={18} />} onClick={onReset}>
        Xóa toàn bộ bộ lọc
      </Button>
    }
  />
);
