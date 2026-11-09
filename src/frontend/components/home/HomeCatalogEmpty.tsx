/**
 * Trạng thái RỖNG của khu "Kho bản vẽ CAD" trên Home — tách khỏi `HomeView` cho gọn JSX.
 *
 * Phân biệt hai nguyên nhân (F9), không gộp thành một câu chung chung:
 * - `HomeCatalogEmpty`: kho RỖNG THẬT (chưa đăng bản vẽ nào) ⇒ mời gửi tệp 3D để báo giá.
 * - `HomeCatalogFilterMiss`: kho CÓ dữ liệu nhưng bộ lọc hiện tại không khớp ⇒ mời xoá lọc.
 * - `HomeCatalogUpdatingBadge`: nhãn cạnh tiêu đề khi kho rỗng thật, nói thẳng trạng thái.
 *
 * Cả ba đều presentational: không đọc DB, không tự quyết định khi nào hiển thị.
 */

import { Badge, Button, Card, EmptyState, Icon } from '@frontend/ui';

export interface HomeCatalogEmptyProps {
  /** Điều hướng sang màn báo giá để khách gửi tệp 3D của mình. */
  onNavigate: (screen: string) => void;
}

/** Kho rỗng thật: 1 câu nêu nguyên nhân + 1 CTA gửi tệp 3D. */
export function HomeCatalogEmpty({ onNavigate }: HomeCatalogEmptyProps) {
  return (
    <Card variant="soft" padding="none">
      <EmptyState
        bordered={false}
        icon={<Icon name="inventory_2" size={20} />}
        title="Kho bản vẽ đang trống"
        description="Chưa có bản vẽ CAD nào được đăng trên VCUBE."
        action={
          <Button
            size="sm"
            leadingIcon={<Icon name="upload_file" size={16} />}
            onClick={() => onNavigate('quote')}
          >
            Gửi tệp 3D để báo giá
          </Button>
        }
      />
    </Card>
  );
}

/** Kho rỗng thật khi đang xem tiêu đề khu catalog (badge trạng thái). */
export function HomeCatalogUpdatingBadge() {
  return (
    <Badge variant="warning" size="sm" dot>
      Kho đang cập nhật
    </Badge>
  );
}

export interface HomeCatalogFilterMissProps {
  /** Xoá từ khoá + đưa danh mục/tag về "tất cả" (do HomeView giữ state). */
  onResetFilters: () => void;
}

/** Kho CÓ dữ liệu nhưng bộ lọc không khớp: 1 câu nêu nguyên nhân + 1 CTA xoá lọc. */
export function HomeCatalogFilterMiss({ onResetFilters }: HomeCatalogFilterMissProps) {
  return (
    <Card variant="soft" padding="none">
      <EmptyState
        bordered={false}
        icon={<Icon name="search_off" size={20} />}
        title="Không tìm thấy linh kiện CAD phù hợp"
        description="Bộ lọc hiện tại không khớp bản vẽ nào trong kho — thử xóa từ khóa hoặc đổi danh mục."
        action={
          <Button size="sm" variant="secondary" onClick={onResetFilters}>
            Hiển thị tất cả bản vẽ
          </Button>
        }
      />
    </Card>
  );
}
