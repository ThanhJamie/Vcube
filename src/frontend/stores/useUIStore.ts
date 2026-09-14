import { create } from 'zustand';

export interface ToastItem {
  id: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  undoAction?: () => void;
  undoLabel?: string;
  duration?: number;
}

export interface UIState {
  isCartDrawerOpen: boolean;
  setIsCartDrawerOpen: (open: boolean) => void;
  toggleCartDrawer: () => void;
  
  isAuthModalOpen: boolean;
  authModalMode: 'signin' | 'signup' | 'account';
  openAuthModal: (mode?: 'signin' | 'signup' | 'account') => void;
  closeAuthModal: () => void;

  isChatOpen: boolean;
  setIsChatOpen: (open: boolean) => void;

  toastQueue: ToastItem[];
  toasts: ToastItem[];
  showToast: (message: string, type?: 'info' | 'success' | 'warning' | 'error', undoAction?: () => void, undoLabel?: string) => void;
  addToast: (toast: Omit<ToastItem, 'id'> & { id?: string }) => void;
  removeToast: (id: string) => void;
}

/**
 * Tự động gỡ toast sau `duration` ms.
 *
 * Hai luật:
 *  1. **KHÔNG tự gỡ toast `error`.** Lỗi phải nằm lại cho tới khi người dùng đọc và
 *     bấm đóng — trước đây mọi toast kể cả lỗi bị xoá cứng sau 4000ms.
 *  2. Tôn trọng `ToastItem.duration` khi được truyền (trước đây tham số này bị bỏ qua).
 *
 * Khớp với `src/frontend/ui/ToastViewport.tsx` (`autoDismissErrors = false`).
 */
const DEFAULT_TOAST_DURATION = 4000;

function scheduleAutoDismiss(
  id: string,
  remove: (id: string) => void,
  type: ToastItem['type'],
  duration?: number
) {
  if (type === 'error') return;
  const ms = typeof duration === 'number' && duration > 0 ? duration : DEFAULT_TOAST_DURATION;
  setTimeout(() => remove(id), ms);
}

export const useUIStore = create<UIState>()((set, get) => ({
  isCartDrawerOpen: false,
  setIsCartDrawerOpen: (open) => set({ isCartDrawerOpen: open }),
  toggleCartDrawer: () => set((state) => ({ isCartDrawerOpen: !state.isCartDrawerOpen })),

  isAuthModalOpen: false,
  authModalMode: 'signin',
  openAuthModal: (mode = 'signin') => set({ isAuthModalOpen: true, authModalMode: mode }),
  closeAuthModal: () => set({ isAuthModalOpen: false }),

  isChatOpen: false,
  setIsChatOpen: (open) => set({ isChatOpen: open }),

  toastQueue: [],
  toasts: [],
  showToast: (message, type = 'info', undoAction, undoLabel = 'Hoàn tác') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newToast: ToastItem = { id, message, type, undoAction, undoLabel };
    
    set((state) => ({
      toastQueue: [...state.toastQueue.slice(-4), newToast],
      toasts: [...state.toastQueue.slice(-4), newToast]
    }));

    scheduleAutoDismiss(id, () => get().removeToast(id), type);
  },
  addToast: (toast) => {
    const id = toast.id || `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newToast: ToastItem = { id, ...toast };

    set((state) => ({
      toastQueue: [...state.toastQueue.slice(-4), newToast],
      toasts: [...state.toastQueue.slice(-4), newToast]
    }));

    scheduleAutoDismiss(id, () => get().removeToast(id), newToast.type, toast.duration);
  },
  removeToast: (id) => {
    set((state) => ({
      toastQueue: state.toastQueue.filter((t) => t.id !== id),
      toasts: state.toasts.filter((t) => t.id !== id)
    }));
  }
}));
