import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function ScrollToTop() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    // Tôn trọng `prefers-reduced-motion`: người dùng nhạy cảm chuyển động nhận scroll tức thời
    // (đồng thời tránh chuỗi scroll event do smooth-scroll sinh ra trên mỗi lần đổi route).
    const prefersReducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: prefersReducedMotion ? 'auto' : 'smooth'
    });
  }, [pathname, search]);

  return null;
}
