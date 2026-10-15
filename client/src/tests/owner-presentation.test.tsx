import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import OwnerWorkspace from '@/pages/owner/OwnerWorkspace';
import { WorkspaceSessionContext } from '@/features/auth/workspaceContext';
import { api } from '@/services/api';

afterEach(() => vi.restoreAllMocks());

it('opens the branch form with visible labels and leaves creation to explicit submission', async () => {
  const get = vi.spyOn(api, 'get').mockResolvedValue({ data: { data: [] } });
  const post = vi.spyOn(api, 'post');
  const user = userEvent.setup();
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <WorkspaceSessionContext.Provider
        value={{
          isPreview: false,
          context: {
            user: { id: 'user', fullName: 'Nguyễn An' },
            business: { id: 'business', name: 'Quán Việt' },
            role: 'OWNER',
          },
        }}
      >
        <MemoryRouter initialEntries={['/app/owner/branches']}>
          <OwnerWorkspace />
        </MemoryRouter>
      </WorkspaceSessionContext.Provider>
    </QueryClientProvider>,
  );
  const disclosure = await screen.findByRole('button', { name: 'Thêm chi nhánh' });
  expect(get).toHaveBeenCalledWith(
    '/business/business/owner/branches',
    expect.objectContaining({ signal: expect.any(AbortSignal) }),
  );
  expect(disclosure).toHaveAttribute('aria-expanded', 'false');
  await user.click(disclosure);
  expect(disclosure).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByRole('textbox', { name: 'Tên chi nhánh' })).toHaveFocus();
  expect(screen.getByRole('textbox', { name: 'Địa chỉ' })).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: 'Số điện thoại' })).toBeInTheDocument();
  expect(screen.getByText('Chưa có chi nhánh')).toBeInTheDocument();
  expect(post).not.toHaveBeenCalled();
});
