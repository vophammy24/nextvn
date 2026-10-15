import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import TablesPage from '@/pages/staff/TablesPage';
import { updateTableStatus } from '@/services/salesApi';

vi.mock('@/services/salesApi', () => ({
  fetchAreas: vi.fn(async () => []),
  fetchTables: vi.fn(async () => [
    { id: 'table-1', name: 'Bàn 01', seats: 4, status: 'AVAILABLE' },
  ]),
  fetchTableBill: vi.fn(async () => null),
  updateTableStatus: vi.fn(async () => ({})),
}));

const originalShowModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal');
const originalClose = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close');
beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.removeAttribute('open');
    },
  });
});
afterEach(() => {
  if (originalShowModal)
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', originalShowModal);
  else Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
  if (originalClose) Object.defineProperty(HTMLDialogElement.prototype, 'close', originalClose);
  else Reflect.deleteProperty(HTMLDialogElement.prototype, 'close');
});

it('keeps table assignment scoped and reports a failed update inside the dialog', async () => {
  const user = userEvent.setup();
  const alert = vi.spyOn(window, 'alert').mockImplementation(() => undefined);
  vi.mocked(updateTableStatus).mockRejectedValueOnce(new Error('network'));
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <TablesPage />
    </QueryClientProvider>,
  );
  await user.click(await screen.findByRole('button', { name: /Bàn 01/ }));
  const dialog = screen.getByRole('dialog', { name: 'Bàn 01' });
  await user.click(within(dialog).getByRole('button', { name: 'Mở bàn' }));
  await waitFor(() => expect(updateTableStatus).toHaveBeenCalledWith('table-1', 'OCCUPIED'));
  expect(await within(dialog).findByRole('alert')).toHaveTextContent('Không thể cập nhật bàn');
  expect(alert).not.toHaveBeenCalled();
  await user.click(within(dialog).getByRole('button', { name: 'Mở bàn' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(updateTableStatus).toHaveBeenCalledTimes(2);
});
