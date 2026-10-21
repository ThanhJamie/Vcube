import React, { Suspense } from 'react';
import type { ThreeModelViewerProps } from './ThreeModelViewer';

/**
 * LazyThreeModelViewer — wrapper tách `three` khỏi graph tải ban đầu.
 *
 * VÌ SAO CẦN: `ThreeModelViewer` import `* as THREE` (~531 KB raw / ~134 KB gzip). Vì nó được
 * render bởi các view eager (Home/PDP/Explore-quick-view…), Rollup đặt `three-vendor` vào
 * initial graph ⇒ mọi khách vào trang chủ đều tải three trước khi thấy hero. Wrapper này chỉ
 * import `React.lazy` (không import `three`, không import lucide) nên chunk lazy —
 * `ThreeModelViewer-*.js` — mới kéo `three-vendor` về, **sau** first paint và chỉ khi một
 * viewer thực sự được render.
 *
 * HỢP ĐỒNG:
 * - Cùng tên + cùng props với `ThreeModelViewer` gốc (`ThreeModelViewerProps` export từ file
 *   thật) và spread toàn bộ props — call site không phải đổi JSX/props.
 * - `Suspense` fallback dùng **đúng bộ class khung** của viewer thật (cùng `className` từ
 *   caller, cùng `h-96 w-full` mặc định) ⇒ không nhảy layout/CLS; nền tối graphite D7 bằng
 *   token `bg-surface-inverse`, không hex cứng.
 * - Fallback là live-region: `role="status"` + `aria-live="polite"` + nhãn VI `sr-only`;
 *   dấu hiệu thị giác chỉ là chấm `bg-accent` nhấp nháy (tôn trọng `prefers-reduced-motion`).
 * - Không đổi hành vi bên trong viewer (scene/lights/geometry/useInViewport giữ nguyên).
 */

const HeavyThreeModelViewer = React.lazy(() =>
  import('./ThreeModelViewer').then((m) => ({ default: m.ThreeModelViewer })),
);

/**
 * Sao đúng class khung của `ThreeModelViewer` để fallback chiếm đúng box (không CLS).
 * Giữ đồng bộ với root class trong `ThreeModelViewer.tsx` nếu file đó đổi khung.
 */
const VIEWER_FRAME =
  'relative bg-surface-inverse select-none rounded-lg overflow-hidden border border-line flex flex-col font-sans';

export const ThreeModelViewer: React.FC<ThreeModelViewerProps> = (props) => {
  // Cùng default với file thật (`h-96 w-full`) để fallback và viewer có cùng chiều cao.
  const { className = 'h-96 w-full' } = props;

  return (
    <Suspense
      fallback={
        <div
          role="status"
          aria-live="polite"
          aria-busy="true"
          className={`${VIEWER_FRAME} ${className}`}
        >
          <span className="sr-only">Đang tải trình xem 3D…</span>
          <div aria-hidden="true" className="flex flex-1 items-center justify-center">
            <span className="size-2.5 animate-pulse rounded-full bg-accent motion-reduce:animate-none" />
          </div>
        </div>
      }
    >
      <HeavyThreeModelViewer {...props} />
    </Suspense>
  );
};
