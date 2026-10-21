import { useCallback, useEffect } from 'react';

/** Tham số cho hook fullscreen của viewer 3D. */
export interface UseModelViewerFullscreenParams {
  isFullscreen: boolean;
  setIsFullscreen: React.Dispatch<React.SetStateAction<boolean>>;
  rootWrapperRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Fullscreen API + fallback + ESC + body-lock của ModelViewer3D — block-move từ
 * `components/tool3d/ModelViewer3D.tsx` dòng 285–349 (Phase 4a). Thứ tự hook/effect giữ nguyên
 * vì hook được gọi đúng tại vị trí block cũ.
 */
export const useModelViewerFullscreen = ({
  isFullscreen,
  setIsFullscreen,
  rootWrapperRef
}: UseModelViewerFullscreenParams): (() => Promise<void>) => {
  // Fullscreen Management with HTML5 Fullscreen API + Fallback + Body Lock
  const handleToggleFullscreen = useCallback(async () => {
    try {
      const isCurrentlyFs = !!document.fullscreenElement || isFullscreen;
      if (!isCurrentlyFs) {
        if (rootWrapperRef.current?.requestFullscreen) {
          await rootWrapperRef.current.requestFullscreen();
        } else if ((rootWrapperRef.current as any)?.webkitRequestFullscreen) {
          await (rootWrapperRef.current as any).webkitRequestFullscreen();
        } else {
          setIsFullscreen(true);
        }
      } else {
        if (document.fullscreenElement) {
          if (document.exitFullscreen) {
            await document.exitFullscreen();
          } else if ((document as any).webkitExitFullscreen) {
            await (document as any).webkitExitFullscreen();
          }
        }
        setIsFullscreen(false);
      }
    } catch (err) {
      console.warn('Native requestFullscreen failed or blocked, falling back to CSS fullscreen:', err);
      setIsFullscreen(prev => !prev);
    }
  }, [isFullscreen]);

  // Synchronize fullscreen state with browser events and keyboard shortcuts (ESC)
  useEffect(() => {
    const handleFsChange = () => {
      const isFs = !!document.fullscreenElement;
      setIsFullscreen(isFs);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && (isFullscreen || !!document.fullscreenElement)) {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
        setIsFullscreen(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen]);

  // Lock body scroll when in fullscreen to prevent unwanted page scrolling behind CAD
  useEffect(() => {
    if (isFullscreen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isFullscreen]);
  return handleToggleFullscreen;
};
