import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/services/api';
import { useWorkspaceStore } from '@/stores/workspace';
import { renderApp } from './renderApp';

afterEach(() => vi.restoreAllMocks());
const apiFailure = (status?: number) => ({
  isAxiosError: true,
  response: status
    ? { status, data: { message: 'Tài khoản email này tồn tại nhưng mật khẩu sai' } }
    : undefined,
  config: { data: 'sensitive-password' },
});
async function fillForm(password = 'test-password') {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Email'), 'owner@example.test');
  if (password) await user.type(screen.getByLabelText('Mật khẩu'), password);
  return user;
}

describe('Giao diện xác thực', () => {
  it('có nhãn tiếng Việt và các thuộc tính hỗ trợ trình quản lý mật khẩu', () => {
    renderApp('/login/business');
    expect(screen.getByLabelText('Email')).toHaveAttribute('autocomplete', 'username');
    expect(screen.getByLabelText('Mật khẩu')).toHaveAttribute('type', 'password');
    expect(screen.getByLabelText('Mật khẩu')).toHaveAttribute('autocomplete', 'current-password');
    expect(screen.getByRole('button', { name: 'Đăng nhập' })).toBeInTheDocument();
  });
  it('yêu cầu email và mật khẩu, chuyển focus đến trường lỗi và không gọi API', async () => {
    const post = vi.spyOn(api, 'post');
    renderApp('/login/business');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Đăng nhập' }));
    expect(screen.getByText('Vui lòng nhập email.')).toBeInTheDocument();
    expect(screen.getByText('Vui lòng nhập mật khẩu.')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveFocus();
    expect(screen.getByLabelText('Mật khẩu')).toHaveAccessibleDescription(
      'Vui lòng nhập mật khẩu.',
    );
    expect(post).not.toHaveBeenCalled();
  });
  it('từ chối email không đúng định dạng', async () => {
    const post = vi.spyOn(api, 'post');
    renderApp('/login/business');
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Email'), 'khong-phai-email');
    await user.type(screen.getByLabelText('Mật khẩu'), 'password');
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }));
    expect(screen.getByText('Email không đúng định dạng.')).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });
  it('từ chối mật khẩu rỗng dù email hợp lệ', async () => {
    renderApp('/login/business');
    const user = await fillForm('');
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }));
    expect(screen.getByLabelText('Mật khẩu')).toHaveFocus();
    expect(screen.getByText('Vui lòng nhập mật khẩu.')).toBeInTheDocument();
  });
  it('hiện và ẩn mật khẩu mà không gửi form', async () => {
    const post = vi.spyOn(api, 'post');
    renderApp('/login/business');
    const user = await fillForm();
    await user.click(screen.getByRole('button', { name: 'Hiện mật khẩu' }));
    expect(screen.getByLabelText('Mật khẩu')).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Ẩn mật khẩu' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await user.click(screen.getByRole('button', { name: 'Ẩn mật khẩu' }));
    expect(screen.getByLabelText('Mật khẩu')).toHaveAttribute('type', 'password');
    expect(post).not.toHaveBeenCalled();
  });
  it('hiển thị tải, chặn gửi lặp và không lưu mật khẩu trong mutation cache', async () => {
    let rejectRequest!: (error: unknown) => void;
    const post = vi.spyOn(api, 'post').mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          rejectRequest = reject;
        }),
    );
    const { queryClient } = renderApp('/login/business');
    const user = await fillForm('sensitive-password');
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }));
    expect(screen.getByRole('button', { name: 'Đang đăng nhập…' })).toBeDisabled();
    expect(screen.getByRole('form', { name: 'Đăng nhập doanh nghiệp' })).toHaveAttribute(
      'aria-busy',
      'true',
    );
    expect(screen.getByLabelText('Email')).toBeDisabled();
    expect(screen.getByLabelText('Mật khẩu')).toHaveValue('');
    await user.click(screen.getByRole('button', { name: 'Đang đăng nhập…' }));
    expect(post).toHaveBeenCalledTimes(1);
    expect(queryClient.getMutationCache().getAll()[0].state.variables).toBeUndefined();
    await act(async () => rejectRequest(apiFailure(401)));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Thông tin đăng nhập không chính xác.',
    );
    const error = queryClient.getMutationCache().getAll()[0].state.error;
    expect(error).not.toHaveProperty('config');
    expect(error).not.toHaveProperty('response');
  });
  it.each([
    [401, 'Thông tin đăng nhập không chính xác.'],
    [404, 'Đăng nhập doanh nghiệp chưa khả dụng trong môi trường này. Vui lòng thử lại sau.'],
    [429, 'Bạn đã thử đăng nhập quá nhiều lần. Vui lòng chờ một lát rồi thử lại.'],
    [500, 'Dịch vụ đăng nhập đang gặp sự cố. Vui lòng thử lại sau.'],
    [undefined, 'Không thể kết nối đến dịch vụ đăng nhập. Vui lòng thử lại.'],
  ])('xử lý lỗi API %s bằng thông báo an toàn', async (status, message) => {
    vi.spyOn(api, 'post').mockRejectedValue(apiFailure(status as number | undefined));
    renderApp('/login/business');
    const user = await fillForm();
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(message as string);
    expect(
      screen.queryByText('Tài khoản email này tồn tại nhưng mật khẩu sai'),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Đăng nhập' })).toBeEnabled();
  });
  it('không giả lập thành công dù API trả về 200 hoặc token chưa được xác minh', async () => {
    vi.spyOn(api, 'post').mockResolvedValue({
      status: 200,
      data: { accessToken: 'unverified-token' },
    });
    const storage = vi.spyOn(Storage.prototype, 'setItem');
    renderApp('/login/business');
    const user = await fillForm();
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Chưa thể xác nhận phiên đăng nhập. Vui lòng thử lại sau.',
    );
    expect(screen.getByRole('form', { name: 'Đăng nhập doanh nghiệp' })).toBeInTheDocument();
    expect(useWorkspaceStore.getState().context).toBeNull();
    expect(storage).not.toHaveBeenCalled();
  });
  it('Google bị vô hiệu hóa, điều hướng giữa hai trang và về trang chủ', async () => {
    const post = vi.spyOn(api, 'post');
    renderApp('/login');
    const user = userEvent.setup();
    expect(screen.getByRole('button', { name: 'Tiếp tục với Google' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Tiếp tục với Google' })).toHaveAccessibleDescription(
      'Đăng nhập Google chưa được cấu hình cho môi trường này.',
    );
    await user.click(screen.getByRole('link', { name: /Đăng nhập bằng tài khoản doanh nghiệp/ }));
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Các cách đăng nhập' }));
    expect(screen.getByRole('heading', { name: /Bắt đầu từ/ })).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Về trang chủ' }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Quản lý bán hàng');
    expect(post).not.toHaveBeenCalled();
  });
  it('quên mật khẩu chỉ giải thích chưa hỗ trợ, không gửi yêu cầu', async () => {
    const post = vi.spyOn(api, 'post');
    renderApp('/login/business');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Quên mật khẩu?' }));
    expect(screen.getByText(/Khôi phục mật khẩu chưa được hỗ trợ/)).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });
  it('hủy yêu cầu đang chạy khi rời trang', async () => {
    const post = vi.spyOn(api, 'post').mockImplementation(
      (_url, _data, config) =>
        new Promise((_resolve, reject) => {
          config?.signal?.addEventListener?.('abort', () => reject(apiFailure()));
        }),
    );
    const { unmount } = renderApp('/login/business');
    const user = await fillForm();
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }));
    const signal = post.mock.calls[0][2]?.signal;
    unmount();
    await waitFor(() => expect(signal?.aborted).toBe(true));
  });
});
