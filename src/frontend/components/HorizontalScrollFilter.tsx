import React, { useRef, useState, useEffect } from 'react';
import { Button, Icon } from '@frontend/ui';

/**
 * HorizontalScrollFilter — dải chip lọc cuộn ngang (W2 storefront).
 *
 * v3 "Soft Studio":
 * - Bỏ 2 lớp gradient phủ `from-surface` (chúng giả định nền luôn là `surface`; trên `canvas`
 *   hoặc card soft sẽ lộ vệt màu) → thay bằng **mask-image** trên chính khung cuộn, cùng kỹ
 *   thuật `.nav-fade-right` mà W1 đã dùng. Mask không phải màu palette nên không phạm luật
 *   "không gradient" của DESIGN-LANGUAGE §1.
 * - Nút cuộn là `Button` icon-only (vùng bấm ≥44px dưới `md`), `aria-label` tiếng Việt (D0).
 * - VI-only: bỏ nhánh `isVi ? … : …` chết vì `LanguageContext` đã khoá `vi`.
 * - `prefers-reduced-motion`: bỏ cuộn mượt bằng `motion-reduce:scroll-auto`.
 */

interface HorizontalScrollFilterProps {
  children: React.ReactNode;
  className?: string;
  scrollStep?: number;
}

const FADE_LEFT = 'linear-gradient(to right, transparent 0, #000 40px)';
const FADE_RIGHT = 'linear-gradient(to left, transparent 0, #000 40px)';
const FADE_BOTH =
  'linear-gradient(to right, transparent 0, #000 40px, #000 calc(100% - 40px), transparent 100%)';

export const HorizontalScrollFilter: React.FC<HorizontalScrollFilterProps> = ({
  children,
  className = '',
  scrollStep = 260
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 4);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;

    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);

    const observer = new MutationObserver(checkScroll);
    observer.observe(el, { childList: true, subtree: true });

    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
      observer.disconnect();
    };
  }, [children]);

  const handleScroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const offset = direction === 'left' ? -scrollStep : scrollStep;
    scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
  };

  /** Mask chỉ bật ở phía còn nội dung — affordance thay cho thanh cuộn bị ẩn. */
  const fadeMask = !canScrollLeft && !canScrollRight
    ? undefined
    : canScrollLeft && canScrollRight
      ? FADE_BOTH
      : canScrollLeft
        ? FADE_LEFT
        : FADE_RIGHT;

  return (
    <div className={`relative group/scroll min-w-0 ${className}`}>
      {canScrollLeft && (
        <Button
          variant="secondary"
          iconOnly
          aria-label="Cuộn sang trái"
          onClick={() => handleScroll('left')}
          className="absolute left-1 top-1/2 z-panel -translate-y-1/2 shadow-e2"
        >
          <Icon name="chevron_left" size={20} className="leading-none" />
        </Button>
      )}

      <div
        ref={scrollRef}
        style={fadeMask ? { maskImage: fadeMask, WebkitMaskImage: fadeMask } : undefined}
        className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth px-1 py-1 flex-nowrap motion-reduce:scroll-auto"
      >
        {children}
      </div>

      {canScrollRight && (
        <Button
          variant="secondary"
          iconOnly
          aria-label="Cuộn sang phải"
          onClick={() => handleScroll('right')}
          className="absolute right-1 top-1/2 z-panel -translate-y-1/2 shadow-e2"
        >
          <Icon name="chevron_right" size={20} className="leading-none" />
        </Button>
      )}
    </div>
  );
};
