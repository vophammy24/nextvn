import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import { Alerts } from '@/features/manager/AlertsPage';
import { Context } from '@/features/inventory/actions';
import type { InventorySnapshot } from '@/features/inventory/api';
import type { ManagerData } from '@/features/manager/types';

const data: ManagerData = {
  businessId: 'business',
  branchId: 'branch',
  asOf: '2026-10-14T03:00:00Z',
  ingredients: [],
  days: [],
  hours: [],
  recipes: [],
  bestSellers: [],
  transactions: [],
  staff: [],
  alerts: [
    {
      id: 'alert-1',
      category: 'OUT_OF_STOCK',
      ingredientId: 'ingredient-1',
      title: 'Đã hết cà phê',
      detail: 'Kiểm tra tồn kho',
      status: 'OPEN',
      at: '2026-10-14T03:00:00Z',
    },
  ],
};

it('keeps shortage severity separate from workflow status and preserves the alert update payload', async () => {
  const save = vi.fn(async () => undefined);
  render(
    <MemoryRouter>
      <Context.Provider value={{ pending: false, snapshot: {} as InventorySnapshot, save }}>
        <Alerts data={data} />
      </Context.Provider>
    </MemoryRouter>,
  );
  expect(screen.getByText('Hết hàng', { selector: '.manager-severity' })).toHaveClass(
    'category-out_of_stock',
  );
  expect(screen.getByText('Đã hết cà phê')).toBeInTheDocument();
  await userEvent.setup().click(screen.getByRole('button', { name: 'Xử lý xong: Đã hết cà phê' }));
  await waitFor(() =>
    expect(save).toHaveBeenCalledWith('/alerts/alert-1', 'PATCH', { status: 'RESOLVED' }),
  );
  expect(screen.getByRole('status')).toHaveTextContent('Đã cập nhật cảnh báo.');
});
