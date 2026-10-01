import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DataTable } from '@/components/common/DataTable';
import {
  FilterTabs,
  SearchInput,
  StatusBadge,
  LoadingState,
  ErrorState,
} from '@/components/common/Foundation';

describe('Thành phần giao diện dùng chung', () => {
  it('bảng có tên truy cập được, tiêu đề cột và vùng cuộn nhận focus', () => {
    render(
      <DataTable
        caption="Danh sách nguyên liệu"
        columns={[
          {
            key: 'name',
            header: 'Nguyên liệu',
            render: (row: { id: number; name: string }) => row.name,
          },
        ]}
        rows={[{ id: 1, name: 'Cà phê' }]}
        rowKey={(row) => row.id}
      />,
    );
    expect(screen.getByRole('table', { name: 'Danh sách nguyên liệu' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Nguyên liệu' })).toHaveAttribute(
      'scope',
      'col',
    );
    expect(screen.getByRole('region', { name: 'Danh sách nguyên liệu' })).toHaveAttribute(
      'tabindex',
      '0',
    );
    expect(screen.getByRole('cell', { name: 'Cà phê' })).toBeInTheDocument();
  });
  it('nhãn trạng thái, tải và lỗi đều là tiếng Việt', async () => {
    const retry = vi.fn();
    render(
      <>
        <StatusBadge status="NEED_PAYMENT" />
        <LoadingState />
        <ErrorState onRetry={retry} />
      </>,
    );
    expect(screen.getByText('Chờ thanh toán')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Đang tải dữ liệu…');
    expect(screen.getByRole('alert')).toHaveTextContent('Không thể tải dữ liệu');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(retry).toHaveBeenCalledOnce();
  });
  it('bộ lọc và tìm kiếm có nhãn và phát sự kiện từ bàn phím', async () => {
    const change = vi.fn();
    const search = vi.fn();
    render(
      <>
        <SearchInput label="Tìm đơn hàng" value="" onChange={search} />
        <FilterTabs
          label="Trạng thái đơn"
          items={[
            { value: 'all', label: 'Tất cả' },
            { value: 'paid', label: 'Đã thanh toán' },
          ]}
          value="all"
          onChange={change}
        />
      </>,
    );
    const user = userEvent.setup();
    await user.type(screen.getByRole('searchbox', { name: 'Tìm đơn hàng' }), 'a');
    expect(search).toHaveBeenCalledWith('a');
    const group = screen.getByRole('group', { name: 'Trạng thái đơn' });
    expect(within(group).getByRole('button', { name: 'Tất cả' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    within(group).getByRole('button', { name: 'Đã thanh toán' }).focus();
    await user.keyboard('{Enter}');
    expect(change).toHaveBeenCalledWith('paid');
  });
});
