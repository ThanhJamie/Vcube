// Hằng số trình bày + helper nhỏ của màn cấu hình xưởng — moved verbatim (Phase 4c).

/** Màu badge trạng thái máy in — §3.4 (tint + chữ đặc). */
export const MACHINE_STATUS_STYLE: Record<string, string> = {
  Free: 'border-positive/20 bg-positive-tint text-positive',
  Busy: 'border-info/20 bg-info-tint text-info',
  Maintenance: 'border-warning/20 bg-warning-tint text-warning',
  Offline: 'border-danger/20 bg-danger-tint text-danger',
};
export const MACHINE_STATUS_DOT: Record<string, string> = {
  Free: 'bg-positive',
  Busy: 'bg-info',
  Maintenance: 'bg-warning',
  Offline: 'bg-danger',
};

/**
 * 6 cột Kanban cho hàng đợi việc — vẫn gom từ ĐÚNG 8 nấc pipeline MES
 * (`statusStageIndex` 0–7), không thêm/bớt đơn nào.
 */
export const QUEUE_KANBAN_COLUMNS = [
  { id: 'new', label: 'Đơn mới', min: 0, max: 0, dot: 'bg-fg-subtle' },
  { id: 'prep', label: 'Chuẩn bị file', min: 1, max: 2, dot: 'bg-warning' },
  { id: 'queue', label: 'Chờ máy', min: 3, max: 3, dot: 'bg-warning' },
  { id: 'printing', label: 'Đang in', min: 4, max: 5, dot: 'bg-info' },
  { id: 'post', label: 'Hậu kỳ & Đóng gói', min: 6, max: 6, dot: 'bg-positive' },
  { id: 'done', label: 'Xuất xưởng', min: 7, max: 7, dot: 'bg-positive' },
] as const;

/** Ô số gắn nhãn CHƯA CẤU HÌNH khi rỗng — KHÔNG mặc định một con số nào. */
export function parseRateInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
}

export function digitsOnly(raw: string): string {
  return raw.replace(/[^\d]/g, '');
}

// Enum khu vực THỐNG NHẤT với wizard/types/stores: Bắc / Trung / Nam.
// ('Đông' là giá trị cũ không còn dùng; nếu profile còn 'Đông' thì select hiển thị giá trị đó
//  qua nhánh legacy bên dưới để không bị trắng.)
export const REGION_OPTIONS = [
  { value: 'Bắc', label: 'Miền Bắc (đầu mối Hà Nội & lân cận)' },
  { value: 'Trung', label: 'Miền Trung (đầu mối Đà Nẵng & lân cận)' },
  { value: 'Nam', label: 'Miền Nam (đầu mối TP.HCM & lân cận)' },
];
