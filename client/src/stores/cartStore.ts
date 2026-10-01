import { create } from 'zustand';
import type { CartItem, MenuItem, PaymentMethod, OrderType } from '@/types/sales';

interface CartState {
  items: CartItem[];
  orderType: OrderType;
  paymentMethod: PaymentMethod;
  tableId: string | null;
  discount: number;
  note: string;

  // Actions
  addItem: (menuItem: MenuItem) => void;
  removeItem: (menuItemId: string) => void;
  increaseQuantity: (menuItemId: string) => void;
  decreaseQuantity: (menuItemId: string) => void;
  setOrderType: (type: OrderType) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  setTableId: (tableId: string | null) => void;
  setDiscount: (discount: number) => void;
  setNote: (note: string) => void;
  clearCart: () => void;

  // Derived
  getSubtotal: () => number;
  getTotal: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  orderType: 'DINE_IN',
  paymentMethod: 'CASH',
  tableId: null,
  discount: 0,
  note: '',

  addItem: (menuItem: MenuItem) => {
    set((state) => {
      const existing = state.items.find((i) => i.menuItem.id === menuItem.id);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.menuItem.id === menuItem.id ? { ...i, quantity: i.quantity + 1 } : i,
          ),
        };
      }
      return { items: [...state.items, { menuItem, quantity: 1 }] };
    });
  },

  removeItem: (menuItemId: string) => {
    set((state) => ({
      items: state.items.filter((i) => i.menuItem.id !== menuItemId),
    }));
  },

  increaseQuantity: (menuItemId: string) => {
    set((state) => ({
      items: state.items.map((i) =>
        i.menuItem.id === menuItemId ? { ...i, quantity: i.quantity + 1 } : i,
      ),
    }));
  },

  decreaseQuantity: (menuItemId: string) => {
    set((state) => {
      const item = state.items.find((i) => i.menuItem.id === menuItemId);
      if (item && item.quantity <= 1) {
        return { items: state.items.filter((i) => i.menuItem.id !== menuItemId) };
      }
      return {
        items: state.items.map((i) =>
          i.menuItem.id === menuItemId ? { ...i, quantity: i.quantity - 1 } : i,
        ),
      };
    });
  },

  setOrderType: (orderType: OrderType) => set({ orderType }),
  setPaymentMethod: (paymentMethod: PaymentMethod) => set({ paymentMethod }),
  setTableId: (tableId: string | null) => set({ tableId }),
  setDiscount: (discount: number) => set({ discount }),
  setNote: (note: string) => set({ note }),

  clearCart: () =>
    set({
      items: [],
      orderType: 'DINE_IN',
      paymentMethod: 'CASH',
      tableId: null,
      discount: 0,
      note: '',
    }),

  getSubtotal: () => {
    return get().items.reduce((sum, i) => sum + i.menuItem.price * i.quantity, 0);
  },

  getTotal: () => {
    const subtotal = get().getSubtotal();
    return Math.max(0, subtotal - get().discount);
  },

  getItemCount: () => {
    return get().items.reduce((sum, i) => sum + i.quantity, 0);
  },
}));
