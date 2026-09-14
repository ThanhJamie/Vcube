import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem } from '../../types';

export interface CartState {
  cart: CartItem[];
  /**
   * Tiền giảm giá đã áp dụng (VND).
   * P0 fix: trước đây `CartView` giữ con số này trong `useState` cục bộ nên khi
   * điều hướng sang `/checkout` là mất, tổng tiền tăng lại ở bước cuối. Store này
   * là NGUỒN DUY NHẤT; cart page, drawer và checkout đều đọc từ đây.
   */
  appliedDiscount: number;
  /** Mã giảm giá đã áp dụng, để hiển thị lại và tính nhất quán. '' = chưa áp dụng. */
  appliedPromoCode: string;
  addToCart: (item: CartItem) => void;
  updateQuantity: (id: string, newQty: number) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  setAppliedDiscount: (discount: number, code?: string) => void;
  clearAppliedDiscount: () => void;
  mergeGuestCart: (serverCart: CartItem[]) => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      cart: [],
      appliedDiscount: 0,
      appliedPromoCode: '',
      addToCart: (item) => {
        set((state) => {
          const existing = state.cart.find((i) => i.id === item.id);
          if (existing) {
            return {
              cart: state.cart.map((i) =>
                i.id === item.id ? { ...i, quantity: i.quantity + item.quantity } : i
              )
            };
          }
          return { cart: [...state.cart, item] };
        });
      },
      updateQuantity: (id, newQty) => {
        if (newQty <= 0) {
          get().removeItem(id);
          return;
        }
        set((state) => ({
          cart: state.cart.map((i) => (i.id === id ? { ...i, quantity: newQty } : i))
        }));
      },
      removeItem: (id) => {
        set((state) => ({
          cart: state.cart.filter((i) => i.id !== id)
        }));
      },
      clearCart: () => set({ cart: [], appliedDiscount: 0, appliedPromoCode: '' }),
      setAppliedDiscount: (discount, code) =>
        set({ appliedDiscount: discount, appliedPromoCode: code ?? '' }),
      clearAppliedDiscount: () => set({ appliedDiscount: 0, appliedPromoCode: '' }),
      mergeGuestCart: (serverCart) => {
        set((state) => {
          const merged = [...serverCart];
          state.cart.forEach((guestItem) => {
            const idx = merged.findIndex((m) => m.id === guestItem.id);
            if (idx >= 0) {
              merged[idx].quantity += guestItem.quantity;
            } else {
              merged.push(guestItem);
            }
          });
          return { cart: merged };
        });
      }
    }),
    {
      name: 'vcube_cart_store'
    }
  )
);

