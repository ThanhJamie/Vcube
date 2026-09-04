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
  authModalMode: 'signin' | 'signup' | 'role_select' | 'account';
  openAuthModal: (mode?: 'signin' | 'signup' | 'role_select' | 'account') => void;
  closeAuthModal: () => void;

  isChatOpen: boolean;
  setIsChatOpen: (open: boolean) => void;

  toastQueue: ToastItem[];
  toasts: ToastItem[];
  showToast: (message: string, type?: 'info' | 'success' | 'warning' | 'error', undoAction?: () => void, undoLabel?: string) => void;
  addToast: (toast: Omit<ToastItem, 'id'> & { id?: string }) => void;
  removeToast: (id: string) => void;
}

export const useUIStore = create<UIState>()((set) => ({
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

    setTimeout(() => {
      set((state) => ({
        toastQueue: state.toastQueue.filter((t) => t.id !== id),
        toasts: state.toasts.filter((t) => t.id !== id)
      }));
    }, 4000);
  },
  addToast: (toast) => {
    const id = toast.id || `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newToast: ToastItem = { id, ...toast };

    set((state) => ({
      toastQueue: [...state.toastQueue.slice(-4), newToast],
      toasts: [...state.toastQueue.slice(-4), newToast]
    }));

    setTimeout(() => {
      set((state) => ({
        toastQueue: state.toastQueue.filter((t) => t.id !== id),
        toasts: state.toasts.filter((t) => t.id !== id)
      }));
    }, 4000);
  },
  removeToast: (id) => {
    set((state) => ({
      toastQueue: state.toastQueue.filter((t) => t.id !== id),
      toasts: state.toasts.filter((t) => t.id !== id)
    }));
  }
}));
