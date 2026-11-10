import React from 'react';
import { Button, Icon } from '@frontend/ui';

/**
 * W2-Q2 — thanh "Tổng phải trả" + CTA cố định đáy màn hình, CHỈ mobile (`md:hidden`).
 *
 * Tách khỏi `QuoteSummaryPanel` (đã vượt ngưỡng ~800 dòng, gate `check-max-lines` ratchet
 * theo file): đây là một vùng render riêng của cùng một nguồn dữ liệu — gói khách đang chọn.
 * Component KHÔNG tự tính giá; cha truyền `totalLabel` đã format từ chính panel.
 *
 * - Cha chỉ render khi đã có `selectedPackage` ⇒ không bao giờ hiện tổng giả.
 * - Chừa làn bên phải (`pr`) đúng chỗ FAB "Trợ lý tự động" (`fixed bottom-6 right-6`,
 *   `z-drawer`) để FAB không đè CTA. Thanh ở `z-header` (30): trên chrome nổi của canvas 3D
 *   (`z-panel` 20 — cụm nút fullscreen của ModelViewer3D) nhưng dưới drawer/modal/FAB.
 * - Bù `env(safe-area-inset-bottom)` cho iPhone có home indicator.
 * - Cha đã thêm padding đáy trang (`max-md:pb-28`) để thanh không che nội dung cuối.
 */
interface QuoteMobileOrderBarProps {
  /** Tổng phải trả đã gồm VAT (hoặc giá gói khi VAT chưa cấu hình) — chuỗi từ panel. */
  totalLabel: string;
  onDirectOrder: () => void;
}

export const QuoteMobileOrderBar: React.FC<QuoteMobileOrderBarProps> = ({
  totalLabel,
  onDirectOrder
}) => (
  <div
    data-quote-mobile-order-bar
    className="fixed inset-x-0 bottom-0 z-header border-t border-line bg-surface/95 shadow-e2 backdrop-blur-md md:hidden"
  >
    <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 pb-[calc(0.875rem+env(safe-area-inset-bottom,0px))] pl-3.5 pr-[calc(0.875rem+5.5rem)] pt-3.5">
      <div className="min-w-0">
        <span className="block truncate font-mono text-xs uppercase tracking-wide text-fg-muted">
          Tổng phải trả
        </span>
        <span className="block truncate font-mono text-base font-bold tabular-nums text-fg">
          {totalLabel}
        </span>
      </div>
      <Button
        size="sm"
        onClick={onDirectOrder}
        leadingIcon={<Icon name="precision_manufacturing" size={16} />}
      >
        Đặt in ngay
      </Button>
    </div>
  </div>
);
