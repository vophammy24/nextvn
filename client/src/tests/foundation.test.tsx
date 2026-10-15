import { StrictMode, createRef, useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import { Modal } from '@/components/common/Modal';
import { DataTable } from '@/components/common/DataTable';

const nativeDialogMethods = ['showModal', 'close'] as const;
const originalDialogMethods = nativeDialogMethods.map((key) =>
  Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, key),
);
afterEach(() => {
  vi.restoreAllMocks();
  nativeDialogMethods.forEach((key, index) => {
    const original = originalDialogMethods[index];
    if (original) Object.defineProperty(HTMLDialogElement.prototype, key, original);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, key);
  });
});

describe('shared controls', () => {
  it('does not submit implicitly and blocks loading actions without losing its name', async () => {
    const user = userEvent.setup(),
      submit = vi.fn((e) => e.preventDefault()),
      click = vi.fn();
    const { rerender } = render(
      <form onSubmit={submit}>
        <Button onClick={click}>Lưu</Button>
      </form>,
    );
    await user.click(screen.getByRole('button', { name: 'Lưu' }));
    expect(click).toHaveBeenCalledTimes(1);
    expect(submit).not.toHaveBeenCalled();
    rerender(
      <form onSubmit={submit}>
        <Button type="submit" loading onClick={click}>
          Lưu
        </Button>
      </form>,
    );
    const button = screen.getByRole('button', { name: 'Lưu' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    await user.click(button);
    expect(click).toHaveBeenCalledTimes(1);
    expect(submit).not.toHaveBeenCalled();
  });

  it('associates labels, hints and errors while preserving native input/ref and form values', async () => {
    const ref = createRef<HTMLInputElement>();
    const { container } = render(
      <form>
        <p id="external-help">Thông tin bổ sung</p>
        <Input
          ref={ref}
          label="Tên món"
          name="name"
          hint="Nhập tên tiếng Việt"
          error="Tên đã tồn tại"
          aria-describedby="external-help"
        />
        <Select label="Đơn vị" name="unit" defaultValue="g">
          <option value="g">Gam</option>
          <option value="kg">Kilôgam</option>
        </Select>
      </form>,
    );
    const input = screen.getByLabelText('Tên món');
    expect(ref.current).toBe(input);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription(
      'Thông tin bổ sung Nhập tên tiếng Việt Tên đã tồn tại',
    );
    await userEvent.type(input, 'Cà phê');
    await userEvent.selectOptions(screen.getByLabelText('Đơn vị'), 'kg');
    expect(Object.fromEntries(new FormData(container.querySelector('form')!))).toEqual({
      name: 'Cà phê',
      unit: 'kg',
    });
  });

  it('retains a named scroll region, headers and empty state in the existing table', () => {
    render(
      <DataTable
        caption="Kho hàng"
        columns={[
          { key: 'name', header: 'Nguyên liệu', render: (row: { name: string }) => row.name },
        ]}
        rows={[]}
        rowKey={(row) => row.name}
        emptyMessage="Chưa có nguyên liệu"
      />,
    );
    expect(screen.getByRole('region', { name: 'Kho hàng' })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('columnheader', { name: 'Nguyên liệu' })).toHaveAttribute(
      'scope',
      'col',
    );
    expect(screen.getByText('Chưa có nguyên liệu')).toBeVisible();
  });
});

describe('shared dialog lifecycle', () => {
  it('opens with a name, handles native cancel, and restores focus and scrolling', async () => {
    // jsdom does not implement top-layer modality. Browser checks cover native focus containment.
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
    function Example() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <Button onClick={() => setOpen(true)}>Chi tiết</Button>
          <Modal open={open} onClose={() => setOpen(false)} title="Hóa đơn">
            <Input label="Ghi chú" />
          </Modal>
        </>
      );
    }
    const user = userEvent.setup();
    render(
      <StrictMode>
        <Example />
      </StrictMode>,
    );
    const trigger = screen.getByRole('button', { name: 'Chi tiết' });
    await user.click(trigger);
    const dialog = screen.getByRole('dialog', { name: 'Hóa đơn' });
    expect(dialog).toHaveFocus();
    expect(document.body.style.overflow).toBe('hidden');
    fireEvent(dialog, new Event('cancel', { cancelable: true, bubbles: false }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).toBe('');
    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Đóng hộp thoại' }));
    expect(trigger).toHaveFocus();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
