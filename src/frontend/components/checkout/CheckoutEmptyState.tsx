import React from 'react';
import { Button, EmptyState, Icon } from '@frontend/ui';

/**
 * Trạng thái `/checkout` khi giỏ rỗng.
 *
 * Tách khỏi `CheckoutView` (đã sát trần `check-max-lines`) — đây là một vùng render riêng,
 * cùng nguồn `onNavigate`. Căn đầu trang + cùng khổ `max-w-md` với `/cart` rỗng để hai màn
 * trống của luồng mua hàng nhất quán; hai CTA là lối đi tiếp thật (khám phá kho / báo giá tệp).
 */
export const CheckoutEmptyState: React.FC<{
  onNavigate: (screen: string, payload?: unknown) => void;
}> = ({ onNavigate }) => (
  <div className="bg-canvas px-4 py-10 text-fg sm:px-6 sm:py-14">
    <div className="mx-auto w-full max-w-md space-y-4">
      <h1 className="sr-only">Thanh Toán</h1>
      <EmptyState
        bordered
        className="w-full bg-surface"
        icon={<Icon name="shopping_cart" size={22} />}
        title="Giỏ hàng của bạn đang trống"
        description="Chưa có sản phẩm hoặc tệp CAD để tạo đơn. Chọn mẫu có sẵn hoặc gửi tệp 3D để nhận báo giá trước khi thanh toán."
        action={
          <div className="flex w-full flex-col gap-2">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              leadingIcon={<Icon name="explore" size={18} />}
              onClick={() => onNavigate('explore')}
            >
              Khám phá kho bản vẽ
            </Button>
            <Button
              variant="secondary"
              size="lg"
              fullWidth
              leadingIcon={<Icon name="upload_file" size={18} />}
              onClick={() => onNavigate('quote')}
            >
              Gửi tệp 3D để báo giá
            </Button>
          </div>
        }
      />
    </div>
  </div>
);
