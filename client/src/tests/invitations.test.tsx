import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AxiosError } from 'axios';
import OwnerWorkspace from '@/pages/owner/OwnerWorkspace';
import { WorkspaceSessionContext } from '@/features/auth/workspaceContext';
import {
  AcceptInvitationPage,
  invitationResumeKey,
} from '@/features/invitations/AcceptInvitationPage';
import { api } from '@/services/api';
let invitations: object[];
const error = () =>
  new AxiosError('unavailable', undefined, undefined, undefined, {
    status: 503,
    data: { message: 'Máy chủ thư chưa sẵn sàng. Vui lòng thử lại.' },
  } as never);
function show(accept = false) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/app/owner/users']}>
        <WorkspaceSessionContext.Provider
          value={{
            context: {
              user: { id: 'owner', fullName: 'Owner' },
              business: { id: 'business', name: 'Quán thử' },
              role: 'OWNER',
            },
            isPreview: false,
          }}
        >
          {accept ? <AcceptInvitationPage /> : <OwnerWorkspace />}
        </WorkspaceSessionContext.Provider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return client;
}
beforeEach(() => {
  localStorage.setItem('access_token', 'test');
  sessionStorage.clear();
  invitations = [];
  vi.spyOn(api, 'get').mockImplementation(async (url) => {
    if (url.endsWith('/invitations')) return { data: { data: { invitations, hasNext: false } } };
    if (url.endsWith('/branches'))
      return { data: { data: [{ id: 'branch', name: 'Chi nhánh A', isActive: true }] } };
    return {
      data: {
        data: [
          {
            id: 'staff',
            fullName: 'Nhân viên hiện có',
            email: 'staff@example.test',
            role: 'STAFF',
            branchId: 'branch',
            isActive: true,
            canManageAccess: true,
          },
        ],
      },
    };
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  sessionStorage.clear();
  localStorage.clear();
  window.history.replaceState(null, '', '/');
});
async function fill() {
  const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: 'Mời thành viên' }));
  await user.type(screen.getByLabelText('Họ tên'), 'Người mới');
  await user.type(screen.getByLabelText('Email'), 'new@example.test');
  await user.selectOptions(screen.getByLabelText('Chi nhánh của thành viên mới'), 'branch');
  return user;
}
describe('Owner invitation regressions', () => {
  it('keeps the visible member list and form values after a failed invitation instead of showing a data-load error', async () => {
    vi.spyOn(api, 'post').mockRejectedValue(error());
    show();
    const user = await fill();
    const field = screen.getByLabelText('Email');
    await user.click(screen.getByRole('button', { name: 'Gửi lời mời' }));
    expect(
      await screen.findByText('Máy chủ thư chưa sẵn sàng. Vui lòng thử lại.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Nhân viên hiện có')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBe(field);
    expect(field).toHaveValue('new@example.test');
    expect(screen.getByLabelText('Họ tên')).toHaveValue('Người mới');
    expect(screen.queryByText('Chưa thể hiển thị dữ liệu')).not.toBeInTheDocument();
  });
  it('disables the send button while pending, preserves the form and refreshes pending invitations on success', async () => {
    let resolve!: (value: unknown) => void;
    const post = vi.spyOn(api, 'post').mockImplementation(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    show();
    const user = await fill();
    await user.click(screen.getByRole('button', { name: 'Gửi lời mời' }));
    expect(screen.getByRole('button', { name: 'Gửi lời mời' })).toBeDisabled();
    expect(screen.getByText('Nhân viên hiện có')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Gửi lời mời' }));
    expect(post).toHaveBeenCalledTimes(1);
    invitations = [
      {
        id: 'invite',
        fullName: 'Người mới',
        email: 'new@example.test',
        role: 'STAFF',
        status: 'PENDING',
        deliveryStatus: 'SENT',
        expiresAt: '2099-01-01T00:00:00Z',
      },
    ];
    resolve({
      data: { data: { invitationId: 'invite', status: 'PENDING', deliveryStatus: 'SENT' } },
    });
    expect(await screen.findByText('Đã gửi — chờ chấp nhận')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('Email')).toHaveValue(''));
    expect(screen.getByText('Nhân viên hiện có')).toBeInTheDocument();
    expect(screen.getByText('1 tài khoản')).toBeInTheDocument();
  });
  it('refreshes persisted failed invitations without creating another member', async () => {
    vi.spyOn(api, 'post').mockImplementation(async () => {
      invitations = [
        {
          id: 'failed',
          fullName: 'Người mới',
          email: 'new@example.test',
          role: 'STAFF',
          status: 'PENDING',
          deliveryStatus: 'FAILED',
          expiresAt: '2099-01-01T00:00:00Z',
        },
      ];
      throw error();
    });
    show();
    const user = await fill();
    await user.click(screen.getByRole('button', { name: 'Gửi lời mời' }));
    expect(await screen.findByText('Chưa xác nhận gửi được')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Gửi lại' })).toBeInTheDocument();
    expect(screen.getByText('Nhân viên hiện có')).toBeInTheDocument();
  });
});
describe('acceptance link', () => {
  it('clears the invitation token and stale workspace cache after successful acceptance', async () => {
    sessionStorage.setItem(invitationResumeKey, 'a'.repeat(64));
    vi.spyOn(api, 'post').mockResolvedValue({ data: { role: 'STAFF' } });
    const client = show(true);
    client.setQueryData(['workspace'], { old: 'scope' });
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận tham gia doanh nghiệp' }));
    await waitFor(() => expect(sessionStorage.getItem(invitationResumeKey)).toBeNull());
    expect(client.getQueryData(['workspace'])).toBeUndefined();
  });
  it('retains a fragment token for the login/register roundtrip and requires login', async () => {
    localStorage.removeItem('access_token');
    window.history.replaceState(null, '', `/invitations/accept#token=${'a'.repeat(64)}`);
    show(true);
    expect(screen.getByRole('link', { name: 'Đăng nhập' })).toBeInTheDocument();
    expect(sessionStorage.getItem(invitationResumeKey)).toBe('a'.repeat(64));
    expect(window.location.hash).toBe('');
    expect(
      screen.queryByRole('button', { name: 'Xác nhận tham gia doanh nghiệp' }),
    ).not.toBeInTheDocument();
  });
  it('submits the token in an authenticated POST body and displays a mismatched-email error', async () => {
    sessionStorage.setItem(invitationResumeKey, 'a'.repeat(64));
    vi.spyOn(api, 'post').mockRejectedValue(
      new AxiosError('forbidden', undefined, undefined, undefined, {
        status: 403,
        data: { message: 'Hãy đăng nhập bằng đúng email nhận lời mời.' },
      } as never),
    );
    show(true);
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận tham gia doanh nghiệp' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('đúng email');
    expect(api.post).toHaveBeenCalledWith('/invitations/accept', { token: 'a'.repeat(64) });
    expect(sessionStorage.getItem(invitationResumeKey)).toBe('a'.repeat(64));
  });
});
