import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import { Alerts } from '@/features/manager/AlertsPage';
import { Context } from '@/features/inventory/actions';
import type { InventorySnapshot } from '@/features/inventory/api';
import type { ManagerData } from '@/features/manager/types';
import { isExpired } from '@/features/manager/model';

it('distinguishes expired lots by the Vietnam calendar day, including the UTC midnight boundary', () => {
  expect(isExpired({ expiry: '2026-10-01' }, '2026-10-01T16:59:59Z')).toBe(false);
  expect(isExpired({ expiry: '2026-10-01' }, '2026-10-01T17:00:00Z')).toBe(true);
  expect(isExpired({ expiry: null }, '2026-10-01T17:00:00Z')).toBe(false);
});

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

it('filters alert status and category and links detail to the affected ingredient', async () => {
  const save = vi.fn();
  render(
    <MemoryRouter>
      <Context.Provider value={{ pending: false, snapshot: {} as InventorySnapshot, save }}>
        <Alerts data={data} />
      </Context.Provider>
    </MemoryRouter>,
  );
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Đã xử lý' }));
  expect(screen.getByText('Không có cảnh báo phù hợp')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Tất cả' }));
  await user.selectOptions(screen.getByLabelText('Loại cảnh báo'), 'NEAR_EXPIRY');
  expect(screen.getByText('Không có cảnh báo phù hợp')).toBeInTheDocument();
  await user.selectOptions(screen.getByLabelText('Loại cảnh báo'), 'OUT_OF_STOCK');
  await user.click(screen.getByRole('button', { name: 'Xem chi tiết: Đã hết cà phê' }));
  expect(screen.getByRole('link', { name: 'Kiểm tra kho hàng' })).toHaveAttribute(
    'href',
    '/app/inventory?ingredient=ingredient-1',
  );
});

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
