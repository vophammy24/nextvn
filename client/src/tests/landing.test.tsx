import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from './renderApp';

const renderLanding = () => renderApp('/');

describe('Trang giới thiệu nextvn', () => {
  it('có nội dung tiếng Việt và không hiển thị công cụ xem trước vai trò', () => {
    renderLanding();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Quản lý bán hàng và tồn kho F&B trên cùng một hệ thống.',
    );
    expect(
      screen.queryByRole('complementary', { name: 'Công cụ phát triển' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Kiểm soát chi phí và hạn chế thất thoát' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Ra quyết định dựa trên dữ liệu' }),
    ).toBeInTheDocument();
  });
  it('các liên kết điều hướng trỏ đến phần nội dung có thật', () => {
    renderLanding();
    for (const name of ['Điều hướng trang chủ', 'Điều hướng cuối trang']) {
      const nav = screen.getByRole('navigation', { name });
      for (const link of within(nav).getAllByRole('link')) {
        const href = link.getAttribute('href')!;
        if (href.startsWith('#'))
          expect(document.getElementById(href.slice(1))).toBeInTheDocument();
      }
    }
    expect(screen.getByRole('link', { name: 'Khám phá tính năng' })).toHaveAttribute(
      'href',
      '#tinh-nang',
    );
  });
  it('CTA dẫn đến luồng đăng nhập hiện có', async () => {
    renderLanding();
    const cta = within(screen.getByRole('region', { name: /Sẵn sàng quản lý cửa hàng/ }));
    expect(cta.getByRole('link', { name: 'Đăng nhập với Google' })).toHaveAttribute(
      'href',
      '/login',
    );
    expect(cta.getByRole('link', { name: 'Đăng nhập doanh nghiệp' })).toHaveAttribute(
      'href',
      '/login/business',
    );
    await userEvent.setup().click(screen.getByRole('link', { name: 'Bắt đầu với nextvn' }));
    expect(screen.getByRole('heading', { name: /Bắt đầu từ/ })).toBeInTheDocument();
  });
  it('có đủ tính năng, đối tượng và các bước vận hành theo thứ tự', () => {
    renderLanding();
    const featureSection = screen.getByRole('region', { name: /Từng tính năng/ });
    expect(within(featureSection).getAllByRole('article')).toHaveLength(8);
    const audienceSection = screen.getByRole('region', { name: 'Đồng hành cùng mô hình của bạn.' });
    expect(within(audienceSection).getAllByRole('listitem')).toHaveLength(5);
    const steps = within(screen.getByRole('region', { name: /Một món được gọi/ })).getAllByRole(
      'heading',
      { level: 3 },
    );
    expect(steps.map((step) => step.textContent)).toEqual([
      'Khách gọi món',
      'Bán hàng POS',
      'Công thức',
      'Trừ nguyên liệu',
      'Tồn kho',
      'Chi phí & lợi nhuận',
      'Phân tích',
    ]);
  });
  it('phân biệt minh họa sản phẩm và dữ liệu thực tế', () => {
    renderLanding();
    expect(
      screen.getByRole('figure', { name: /Không sử dụng dữ liệu khách hàng thực tế/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: /không thể hiện số liệu kinh doanh thực tế/ }),
    ).toBeInTheDocument();
    expect(screen.getByText('Đơn hàng minh họa')).toBeInTheDocument();
  });
  it('menu hỗ trợ mở, đóng bằng Escape và trả focus về nút mở', async () => {
    renderLanding();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Mở menu' }));
    expect(screen.getByRole('button', { name: 'Đóng menu' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    within(screen.getByRole('navigation', { name: 'Điều hướng trang chủ' }))
      .getByRole('link', { name: 'Sản phẩm' })
      .focus();
    await user.keyboard('{Escape}');
    expect(screen.getByRole('button', { name: 'Mở menu' })).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Mở menu' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });
  it('đóng menu khi chọn một phần nội dung', async () => {
    renderLanding();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Mở menu' }));
    await user.click(
      within(screen.getByRole('navigation', { name: 'Điều hướng trang chủ' })).getByRole('link', {
        name: 'Tính năng',
      }),
    );
    expect(screen.getByRole('button', { name: 'Mở menu' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });
});
