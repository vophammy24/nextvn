import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import POSPage from '@/pages/staff/POSPage';
import { useCartStore } from '@/stores/cartStore';
import { createOrder } from '@/services/salesApi';

vi.mock('@/services/salesApi', () => ({
  fetchCategories: vi.fn(async () => []),
  fetchMenuItems: vi.fn(async () => [{ id: 'coffee', name: 'Cà phê sữa', price: 35000 }]),
  fetchActiveShift: vi.fn(async () => ({ id: 'shift-test' })),
  createOrder: vi.fn(async () => ({ id: 'order-test' })),
}));
beforeEach(() => {
  useCartStore.getState().clearCart();
  vi.clearAllMocks();
});
afterEach(() => vi.restoreAllMocks());

it('adds once per Space/Enter activation and retains the existing checkout payload', async () => {
  vi.spyOn(window, 'alert').mockImplementation(() => undefined);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const user = userEvent.setup();
  render(
    <QueryClientProvider client={queryClient}>
      <POSPage />
    </QueryClientProvider>,
  );
  const product = await screen.findByRole('button', { name: /Cà phê sữa/ }, { timeout: 5000 });
  expect(product.tagName).toBe('BUTTON');
  expect(screen.getByLabelText('Tìm món')).toBeInTheDocument();
  product.focus();
  await user.keyboard(' ');
  expect(useCartStore.getState().getItemCount()).toBe(1);
  await user.keyboard('{Enter}');
  expect(useCartStore.getState().getItemCount()).toBe(2);
  expect(useCartStore.getState().getTotal()).toBe(70000);
  await user.click(screen.getByRole('button', { name: 'Mang đi' }));
  expect(screen.getByRole('button', { name: 'Mang đi' })).toHaveAttribute('aria-pressed', 'true');
  await user.click(screen.getByRole('button', { name: 'Xác nhận thanh toán' }));
  await waitFor(() => expect(createOrder).toHaveBeenCalledTimes(1));
  expect(vi.mocked(createOrder).mock.calls[0][0]).toEqual({
    orderType: 'TAKEAWAY',
    shiftId: 'shift-test',
    tableId: null,
    items: [{ menuItemId: 'coffee', quantity: 2, note: undefined }],
    paymentMethod: 'CASH',
    discount: 0,
    note: undefined,
  });
  await waitFor(() => expect(useCartStore.getState().getItemCount()).toBe(0));
  queryClient.clear();
});
