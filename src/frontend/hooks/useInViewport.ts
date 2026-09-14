import { useState, useEffect, RefObject } from 'react';

export interface InViewportOptions {
  rootMargin?: string;
  threshold?: number | number[];
}

/**
 * Custom hook wrapping IntersectionObserver to detect when an element enters
 * or leaves the viewport (by default within ±100px buffer).
 * Gracefully defaults to true in SSR or environments without IntersectionObserver.
 */
export function useInViewport<T extends HTMLElement>(
  targetRef: RefObject<T | null>,
  options: InViewportOptions = { rootMargin: '100px', threshold: 0 }
): boolean {
  const { rootMargin = '100px', threshold = 0 } = options;

  const [isInViewport, setIsInViewport] = useState<boolean>(() => {
    return typeof window === 'undefined' || typeof window.IntersectionObserver === 'undefined';
  });

  const thresholdKey = Array.isArray(threshold) ? threshold.join(',') : String(threshold);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.IntersectionObserver === 'undefined') {
      setIsInViewport(true);
      return;
    }

    const element = targetRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry) {
          setIsInViewport(entry.isIntersecting);
        }
      },
      { rootMargin, threshold }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [targetRef, rootMargin, thresholdKey]);

  return isInViewport;
}

