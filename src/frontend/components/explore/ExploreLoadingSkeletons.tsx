import React from 'react';
import { CATEGORIES } from '@/data/mockData';
import { Card, Skeleton } from '@frontend/ui';

/**
 * ExploreLoadingSkeletons — các khối xương (CLS) của `ExploreView` khi catalog đang nạp.
 *
 * Tách khỏi view để giữ file view dưới trần dòng. Markup/aria/class giữ nguyên bản cũ:
 * lưới thẻ, tile danh mục và group giá đều giữ đúng khung để trang không nhảy khi dữ liệu về.
 */

/** Skeleton khớp lưới 1/2/3 cột: 6 thẻ = 2 hàng đầy ở desktop. */
const SKELETON_CARD_COUNT = 6;

/**
 * Thẻ xương đúng layout thẻ thật (khung ảnh 4:3, tiêu đề, thông số, giá, CTA).
 *
 * CLS: phần thân mô phỏng ĐÚNG 3 khối của thẻ thật (tiêu đề → thông số → giá/CTA) thay vì
 * 4 thanh rời; nhờ vậy chiều cao thẻ lúc tải ≈ thẻ thật (đo: 475px vs 481px @1440,
 * 518px vs 513px @390) và lưới không "nở" khi catalog về.
 */
export const ProductCardSkeleton: React.FC = () => (
  <Card variant="soft" padding="none" className="flex flex-col overflow-hidden">
    <div className="aspect-[4/3] w-full overflow-hidden">
      <Skeleton variant="rect" rounded="lg" height="100%" className="block h-full w-full" />
    </div>
    <div className="flex flex-1 flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Skeleton variant="text" width="90%" />
          <Skeleton variant="text" width="55%" />
        </div>
        <Skeleton variant="text" width="4ch" className="shrink-0" />
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        <Skeleton variant="text" height="1rem" width="90%" />
        <Skeleton variant="text" height="1rem" width="80%" />
        <Skeleton variant="text" height="1rem" width="65%" className="col-span-2" />
      </div>
      <div className="mt-auto flex flex-col gap-2 border-t border-line-subtle pt-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <Skeleton variant="text" width="5ch" />
            <Skeleton variant="text" height="1.25rem" width="8ch" />
          </div>
          <div className="flex flex-col items-end gap-1">
            <Skeleton variant="text" width="4ch" />
            <Skeleton variant="text" height="1.25rem" width="7ch" />
          </div>
        </div>
        <Skeleton variant="text" height="1rem" width="70%" />
        <Skeleton variant="rect" rounded="md" height="2.75rem" className="w-full" />
      </div>
    </div>
  </Card>
);

/**
 * LOADING — skeleton đúng layout lưới thẻ.
 * CLS: sàn chiều cao (min-h-96 = 24rem) để vùng lưới không co lại về 0 trước khi thẻ đầu
 * tiên được vẽ; 6 thẻ xương phủ 2 hàng đầu ở desktop.
 */
export const CatalogGridSkeleton: React.FC = () => (
  <div
    role="status"
    aria-label="Đang tải kho bản vẽ"
    className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 min-h-96"
  >
    {Array.from({ length: SKELETON_CARD_COUNT }).map((_, index) => (
      <ProductCardSkeleton key={index} />
    ))}
  </div>
);

interface CategoryTilesSkeletonProps {
  /** Bảng tone pastel của tile thật — truyền vào để skeleton dùng đúng màu nền. */
  tones: readonly string[];
}

/**
 * CLS: giữ đúng lưới + chiều cao tile (min-h-[104px]) khi catalog đang tải để hàng
 * "Danh mục bản vẽ" không đổi kích thước lúc tile thật hiện ra.
 */
export const CategoryTilesSkeleton: React.FC<CategoryTilesSkeletonProps> = ({ tones }) => (
  <div
    aria-hidden="true"
    className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-6"
  >
    {CATEGORIES.filter((c) => c.id !== 'all').map((cat, index) => (
      <div
        key={cat.id}
        className={`flex min-h-[104px] flex-col justify-between gap-2 rounded-lg p-3 ${tones[index % tones.length]}`}
      >
        <Skeleton variant="rect" rounded="md" height="2.25rem" className="w-9" />
        <Skeleton variant="text" width="80%" />
      </div>
    ))}
  </div>
);

interface FilterPriceSkeletonProps {
  /** Preset giá thật — chỉ dùng `id` làm key, không đọc số liệu kho. */
  presets: readonly { id: string }[];
}

/**
 * CLS: dải giá chỉ suy ra được từ `pricePhysical` của sản phẩm nên trước khi catalog về,
 * group thật chưa thể dựng. Giữ ĐÚNG khung của group đó (head min-h-11 + 2 hàng preset +
 * slider) để card lọc desktop không cao thêm ~236px khi dữ liệu tới. Group "Vật Liệu Hỗ Trợ"
 * không cần bản xương: nó thu gọn mặc định và tự render khi `materials` có dữ liệu.
 */
export const FilterPriceSkeleton: React.FC<FilterPriceSkeletonProps> = ({ presets }) => (
  <>
    <div aria-hidden="true" className="grid grid-cols-2 gap-1.5 mb-3">
      {presets.map((preset) => (
        <Skeleton key={preset.id} variant="rect" rounded="full" height="2.75rem" />
      ))}
    </div>
    <div aria-hidden="true" className="pt-1">
      <div className="flex min-h-4 items-center justify-between gap-2 mb-1">
        <Skeleton variant="text" width="7ch" />
        <Skeleton variant="text" width="9ch" />
      </div>
      {/* input range THẬT (disabled + ẩn) chỉ để giữ đúng chiều cao của thanh trượt
          thật — không vẽ thumb giả như một giá trị đã có. */}
      <input type="range" disabled className="invisible w-full" />
      <div className="flex min-h-4 items-center justify-between gap-2 mt-0.5">
        <Skeleton variant="text" width="6ch" />
        <Skeleton variant="text" width="6ch" />
      </div>
    </div>
  </>
);
