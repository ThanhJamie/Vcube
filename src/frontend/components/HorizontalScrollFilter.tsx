import React, { useRef, useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';

interface HorizontalScrollFilterProps {
  children: React.ReactNode;
  className?: string;
  scrollStep?: number;
}

export const HorizontalScrollFilter: React.FC<HorizontalScrollFilterProps> = ({
  children,
  className = '',
  scrollStep = 260
}) => {
  const { language } = useLanguage();
  const isVi = language === 'vi';
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

  return (
    <div className={`relative group/scroll ${className}`}>
      {/* Left Chevron Button - safely inset to prevent clipping on overflow wrappers */}
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => handleScroll('left')}
          className="absolute left-1 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/95 border border-[#CBD5E1] shadow-md hover:shadow-lg flex items-center justify-center text-[#091426] hover:bg-[#F8FAFC] transition-all cursor-pointer backdrop-blur-xs active:scale-95 shrink-0"
          aria-label={isVi ? "Cuộn sang trái" : "Scroll left"}
        >
          <span className="material-symbols-outlined text-lg leading-none">chevron_left</span>
        </button>
      )}

      {/* Left Gradient Fade Mask */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-white via-white/80 to-transparent pointer-events-none z-10 transition-opacity duration-200 ${
          canScrollLeft ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Main Horizontal Scrollable Container with adequate padding */}
      <div
        ref={scrollRef}
        className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth py-1 px-3 sm:px-4 flex-nowrap"
      >
        {children}
      </div>

      {/* Right Gradient Fade Mask */}
      <div
        className={`absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-white via-white/80 to-transparent pointer-events-none z-10 transition-opacity duration-200 ${
          canScrollRight ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Right Chevron Button - safely inset to prevent clipping on overflow wrappers */}
      {canScrollRight && (
        <button
          type="button"
          onClick={() => handleScroll('right')}
          className="absolute right-1 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/95 border border-[#CBD5E1] shadow-md hover:shadow-lg flex items-center justify-center text-[#091426] hover:bg-[#F8FAFC] transition-all cursor-pointer backdrop-blur-xs active:scale-95 shrink-0"
          aria-label={isVi ? "Cuộn sang phải" : "Scroll right"}
        >
          <span className="material-symbols-outlined text-lg leading-none">chevron_right</span>
        </button>
      )}
    </div>
  );
};

