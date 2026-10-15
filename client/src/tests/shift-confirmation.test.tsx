import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import ShiftSummaryPage from '@/pages/staff/ShiftSummaryPage';
import { endShift, fetchActiveShift, startShift } from '@/services/salesApi';

vi.mock('@/services/salesApi', () => ({
  fetchActiveShift: vi.fn(async () => ({ id: 'shift-1', startedAt: '2026-10-14T03:00:00Z' })),
  fetchShifts: vi.fn(async () => []),
  fetchShiftSummary: vi.fn(async () => null),
  startShift: vi.fn(async () => undefined),
  endShift: vi.fn(async () => undefined),
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

it('requires confirmation before ending the current shift', async () => {
  const user = userEvent.setup();
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <ShiftSummaryPage />
    </QueryClientProvider>,
  );
  const endButton = await screen.findByRole('button', { name: 'Kết thúc ca' });
  await user.click(endButton);
  const dialog = screen.getByRole('dialog', { name: 'Xác nhận kết thúc ca' });
  expect(endShift).not.toHaveBeenCalled();
  await user.click(within(dialog).getByRole('button', { name: 'Quay lại' }));
  expect(endShift).not.toHaveBeenCalled();
  await user.click(endButton);
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Kết thúc ca' }));
  await waitFor(() => expect(endShift).toHaveBeenCalledWith('shift-1'));
});

it('announces a failed start and retains the existing start action for retry', async () => {
  vi.mocked(fetchActiveShift).mockResolvedValueOnce(null);
  vi.mocked(startShift).mockRejectedValueOnce(new Error('network'));
  const alert = vi.spyOn(window, 'alert').mockImplementation(() => undefined);
  const user = userEvent.setup();
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <ShiftSummaryPage />
    </QueryClientProvider>,
  );
  const startButton = await screen.findByRole('button', { name: 'Bắt đầu ca' });
  await user.click(startButton);
  expect(await screen.findByRole('alert')).toHaveTextContent('Không thể bắt đầu ca');
  expect(alert).not.toHaveBeenCalled();
  await user.click(startButton);
  await waitFor(() => expect(startShift).toHaveBeenCalledTimes(2));
});
