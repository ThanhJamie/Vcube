/**
 * NotificationBell — chuông cập nhật trạng thái đơn của PHIÊN HIỆN TẠI.
 *
 * Nguồn dữ liệu là `useOrdersData` (realtime `orders:me` + lưới an toàn visibilitychange):
 * component này KHÔNG tự mở channel, KHÔNG đọc DB và KHÔNG cache localStorage — chỉ render
 * danh sách `OrderNotification` đã sinh từ payload realtime thật.
 *
 * Hợp đồng UI:
 * - Trigger là `Button iconOnly` + `<Icon name="notifications_active" />`; badge số chưa đọc
 *   là span TRANG TRÍ (`aria-hidden`) nên accessible name do `aria-label` quyết định.
 * - Panel dùng `Sheet` (side panel desktop / trượt phải trên mobile) + `EmptyState` nói rõ
 *   nguyên nhân rỗng ("Chưa có cập nhật mới trong phiên này").
 * - Bấm một cập nhật ⇒ đánh dấu đã đọc (RAM) + điều hướng `my_orders`.
 */

import { useState } from 'react';
import type { OrderNotification } from '@frontend/hooks/useOrdersData';
import { Button, EmptyState, Icon, Sheet } from '@frontend/ui';
import { EMPTY_VALUE, formatDateTime } from '@frontend/lib/format';

export interface NotificationBellProps {
  notifications: OrderNotification[];
  unreadCount: number;
  /** Đánh dấu toàn bộ thông báo hiện có là đã đọc (state RAM của hook, không ghi DB). */
  onMarkRead: () => void;
  onNavigate: (screen: string, payload?: unknown) => void;
  className?: string;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  notifications,
  unreadCount,
  onMarkRead,
  onNavigate,
  className,
}) => {
  const [open, setOpen] = useState(false);
  const hasUnread = unreadCount > 0;
  const badgeText = unreadCount > 9 ? '9+' : String(unreadCount);

  const handleItemClick = () => {
    onMarkRead();
    setOpen(false);
    onNavigate('my_orders');
  };

  return (
    <>
      <Button
        variant="ghost"
        iconOnly
        onClick={() => setOpen(true)}
        className={['relative', className].filter(Boolean).join(' ')}
        aria-label={hasUnread ? `Thông báo, ${unreadCount} cập nhật chưa đọc` : 'Thông báo'}
      >
        <Icon name="notifications_active" size={20} />
        {hasUnread && (
          <span
            aria-hidden="true"
            className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-0.5 font-tech text-xs font-bold text-primary-fg tabular-nums"
          >
            {badgeText}
          </span>
        )}
      </Button>

      <Sheet
        open={open}
        side="right"
        onClose={() => setOpen(false)}
        title="Thông báo"
        description="Cập nhật trạng thái đơn trong phiên này"
      >
        {notifications.length === 0 ? (
          <EmptyState
            icon={<Icon name="notifications_active" size={20} />}
            title="Chưa có thông báo"
            description="Chưa có cập nhật mới trong phiên này"
          />
        ) : (
          <ul className="flex flex-col gap-1.5">
            {notifications.map((notification) => (
              <li key={notification.id}>
                <button
                  type="button"
                  onClick={handleItemClick}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors duration-200 hover:bg-surface-muted cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-tint text-primary">
                    <Icon name="receipt_long" size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-fg">{notification.label}</span>
                    <span className="block text-xs text-fg-muted">
                      Đơn {notification.orderNumber || EMPTY_VALUE}
                      {' · '}
                      <time dateTime={notification.at}>{formatDateTime(notification.at)}</time>
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Sheet>
    </>
  );
};
