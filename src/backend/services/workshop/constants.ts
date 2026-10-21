// Nhãn/hằng số công khai — moved verbatim from workshopService.ts (Phase 4c).


/** Nhãn trạng thái đơn — khớp union `Order['status']` trong `src/types/index.ts`. */
export const MY_ORDER_STATUS_LABELS: Record<string, string> = {
  pending_payment: 'Chờ thanh toán',
  processing: 'Đang xử lý',
  printing: 'Đang in',
  post_processing: 'Hậu kỳ',
  packaging: 'Đóng gói',
  shipping: 'Đang giao',
  completed: 'Hoàn thành',
  cancelled: 'Đã huỷ',
};

/**
 * Nấc thứ i (0..7) ⇒ `orders.status` thô. Giữ `status` đồng bộ với `status_stage_index`
 * vì `MyOrdersView` suy nấc từ `status` khi `status_stage_index` rỗng.
 */
export const MY_ORDER_STATUS_BY_STAGE: string[] = [
  'processing',
  'processing',
  'processing',
  'printing',
  'printing',
  'post_processing',
  'post_processing',
  'shipping',
];

/** Trạng thái máy in xưởng tự đặt (`workshop_machines.status`, không có CHECK ở DB). */
export const MY_MACHINE_STATUSES = ['Free', 'Busy', 'Maintenance', 'Offline'] as const;

export const MY_MACHINE_STATUS_LABELS: Record<string, string> = {
  Free: 'Rảnh',
  Busy: 'Đang in',
  Maintenance: 'Bảo trì',
  Offline: 'Tắt máy',
};
