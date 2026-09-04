import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem } from '../../types';

export interface CartState {
  cart: CartItem[];
  appliedDiscount: number;
  addToCart: (item: CartItem) => void;
  updateQuantity: (id: string, newQty: number) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  setAppliedDiscount: (discount: number) => void;
  mergeGuestCart: (serverCart: CartItem[]) => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      cart: [],
      appliedDiscount: 0,
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
      clearCart: () => set({ cart: [], appliedDiscount: 0 }),
      setAppliedDiscount: (discount) => set({ appliedDiscount: discount }),
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

