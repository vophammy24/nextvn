import { describe, expect, it, beforeEach } from 'vitest';
import { useCartStore } from '@/stores/cartStore';
import type { MenuItem } from '@/types/sales';

const mockItem: MenuItem = {
  id: 'item-1',
  branchId: 'branch-1',
  categoryId: 'cat-1',
  name: 'Phở bò',
  description: null,
  price: 50000,
  imageUrl: null,
  isActive: true,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
};

const mockItem2: MenuItem = {
  id: 'item-2',
  branchId: 'branch-1',
  categoryId: 'cat-1',
  name: 'Bún bò Huế',
  description: null,
  price: 55000,
  imageUrl: null,
  isActive: true,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
};

describe('Cart Store', () => {
  beforeEach(() => {
    useCartStore.getState().clearCart();
  });

  it('starts with empty cart', () => {
    const state = useCartStore.getState();
    expect(state.items).toHaveLength(0);
    expect(state.getItemCount()).toBe(0);
    expect(state.getSubtotal()).toBe(0);
    expect(state.getTotal()).toBe(0);
  });

  it('adds item to cart', () => {
    useCartStore.getState().addItem(mockItem);
    const state = useCartStore.getState();

    expect(state.items).toHaveLength(1);
    expect(state.items[0].menuItem.id).toBe('item-1');
    expect(state.items[0].quantity).toBe(1);
  });

  it('increases quantity when adding same item twice', () => {
    useCartStore.getState().addItem(mockItem);
    useCartStore.getState().addItem(mockItem);
    const state = useCartStore.getState();

    expect(state.items).toHaveLength(1);
    expect(state.items[0].quantity).toBe(2);
  });

  it('removes item from cart', () => {
    useCartStore.getState().addItem(mockItem);
    useCartStore.getState().removeItem('item-1');
    const state = useCartStore.getState();

    expect(state.items).toHaveLength(0);
  });

  it('increases quantity', () => {
    useCartStore.getState().addItem(mockItem);
    useCartStore.getState().increaseQuantity('item-1');
    const state = useCartStore.getState();

    expect(state.items[0].quantity).toBe(2);
  });

  it('decreases quantity', () => {
    useCartStore.getState().addItem(mockItem);
    useCartStore.getState().increaseQuantity('item-1');
    useCartStore.getState().decreaseQuantity('item-1');
    const state = useCartStore.getState();

    expect(state.items[0].quantity).toBe(1);
  });

  it('removes item when decreasing to 0', () => {
    useCartStore.getState().addItem(mockItem);
    useCartStore.getState().decreaseQuantity('item-1');
    const state = useCartStore.getState();

    expect(state.items).toHaveLength(0);
  });

  it('calculates subtotal correctly', () => {
    useCartStore.getState().addItem(mockItem); // 50000
    useCartStore.getState().addItem(mockItem); // 50000 x2
    useCartStore.getState().addItem(mockItem2); // 55000
    const state = useCartStore.getState();

    expect(state.getSubtotal()).toBe(50000 * 2 + 55000);
  });

  it('calculates total with discount', () => {
    useCartStore.getState().addItem(mockItem);
    useCartStore.getState().setDiscount(10000);
    const state = useCartStore.getState();

    expect(state.getTotal()).toBe(40000);
  });

  it('total cannot go below 0', () => {
    useCartStore.getState().addItem(mockItem); // 50000
    useCartStore.getState().setDiscount(100000);
    const state = useCartStore.getState();

    expect(state.getTotal()).toBe(0);
  });

  it('sets payment method', () => {
    useCartStore.getState().setPaymentMethod('BANK_TRANSFER');
    expect(useCartStore.getState().paymentMethod).toBe('BANK_TRANSFER');
  });

  it('sets order type', () => {
    useCartStore.getState().setOrderType('TAKEAWAY');
    expect(useCartStore.getState().orderType).toBe('TAKEAWAY');
  });

  it('clears cart completely', () => {
    useCartStore.getState().addItem(mockItem);
    useCartStore.getState().setPaymentMethod('BANK_TRANSFER');
    useCartStore.getState().setOrderType('TAKEAWAY');
    useCartStore.getState().setDiscount(5000);
    useCartStore.getState().clearCart();
    const state = useCartStore.getState();

    expect(state.items).toHaveLength(0);
    expect(state.paymentMethod).toBe('CASH');
    expect(state.orderType).toBe('DINE_IN');
    expect(state.discount).toBe(0);
  });

  it('counts total items including quantities', () => {
    useCartStore.getState().addItem(mockItem);
    useCartStore.getState().addItem(mockItem);
    useCartStore.getState().addItem(mockItem2);
    const state = useCartStore.getState();

    expect(state.getItemCount()).toBe(3);
  });
});
