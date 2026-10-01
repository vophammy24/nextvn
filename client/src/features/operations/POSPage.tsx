import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Coffee,
  CupSoda,
  CakeSlice,
  Sandwich,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  Printer,
  Banknote,
  Landmark,
} from 'lucide-react';
import { PageHeader, SearchInput, FilterTabs, EmptyState } from '@/components/common/Foundation';
import { formatCurrency } from '@/lib/format';
import { OperationsBoundary } from './data';
import { ReceiptPreview } from './ReceiptPreview';
import type { OperationsData, CartLine, MenuItem } from './types';

export function POSPage() {
  return (
    <>
      <PageHeader title="Bán hàng" description="Chọn món và chuẩn bị đơn hàng tại quầy" />
      <OperationsBoundary>{(data) => <POSWorkspace data={data} />}</OperationsBoundary>
    </>
  );
}
function POSWorkspace({ data }: { data: OperationsData }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Tất cả');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [discount, setDiscount] = useState('');
  const [payment, setPayment] = useState('CASH');
  const [notice, setNotice] = useState('');
  const [receipt, setReceipt] = useState(false);
  const [params] = useSearchParams();
  const table = data.tables.find((item) => item.id === params.get('table'));
  const categories = ['Tất cả', 'Cà phê', 'Trà sữa', 'Đồ ăn', 'Bánh', 'Đồ uống'];
  const products = data.menu.filter(
    (item) =>
      (category === 'Tất cả' || item.category === category) &&
      item.name.toLocaleLowerCase('vi-VN').includes(search.trim().toLocaleLowerCase('vi-VN')),
  );
  const subtotal = cart.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const appliedDiscount = Math.min(subtotal, Math.max(0, Math.round(Number(discount) || 0)));
  const total = subtotal - appliedDiscount;
  const add = (item: MenuItem) => {
    setNotice('');
    setReceipt(false);
    setCart((lines) => {
      const existing = lines.find(
        (line) => line.item.id === item.id && line.size === item.sizes[0].name && !line.note,
      );
      return existing
        ? lines.map((line) =>
            line.key === existing.key
              ? { ...line, quantity: Math.min(99, line.quantity + 1) }
              : line,
          )
        : [
            ...lines,
            {
              key: crypto.randomUUID(),
              item,
              size: item.sizes[0].name,
              unitPrice: item.price,
              quantity: 1,
              note: '',
            },
          ];
    });
  };
  const update = (key: string, patch: Partial<CartLine>) => {
    setReceipt(false);
    setCart((lines) => lines.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  };
  return (
    <div className="pos-workspace">
      <section className="pos-catalog" aria-label="Thực đơn">
        <div className="ops-toolbar">
          <SearchInput
            label="Tìm món"
            placeholder="Tìm món..."
            value={search}
            onChange={setSearch}
          />
          <span className="ops-muted">{products.length} món minh họa</span>
        </div>
        <FilterTabs
          label="Danh mục món"
          items={categories.map((value) => ({ value, label: value }))}
          value={category}
          onChange={setCategory}
        />
        <div className="menu-grid">
          {products.map((item) => {
            const Icon =
              item.category === 'Bánh'
                ? CakeSlice
                : item.category === 'Đồ ăn'
                  ? Sandwich
                  : item.category === 'Cà phê'
                    ? Coffee
                    : CupSoda;
            return (
              <article className="menu-card" key={item.id}>
                <div
                  className={`menu-illustration menu-${item.category === 'Cà phê' ? 'coffee' : item.category === 'Bánh' ? 'cake' : 'drink'}`}
                  aria-hidden="true"
                >
                  <Icon size={50} strokeWidth={1.3} />
                </div>
                <div className="menu-card-content">
                  <span>{item.category}</span>
                  <h2>{item.name}</h2>
                  <p>{item.description}</p>
                  <div>
                    <strong>{formatCurrency(item.price)}</strong>
                    <button
                      type="button"
                      className="add-item-button"
                      aria-label={`Thêm ${item.name}`}
                      onClick={() => add(item)}
                    >
                      <Plus size={19} />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        {!products.length && (
          <EmptyState title="Không tìm thấy món" description="Thử tên món hoặc danh mục khác." />
        )}
        <aside className="pos-suggestion">
          <Coffee size={22} aria-hidden="true" />
          <div>
            <strong>Thêm lựa chọn cho khách</strong>
            <p>
              Khám phá bánh và đồ ăn trong thực đơn. Đây là gợi ý cố định để minh họa giao diện.
            </p>
          </div>
          <button className="button button-secondary" onClick={() => setCategory('Bánh')}>
            Xem bánh
          </button>
        </aside>
      </section>
      <aside className="order-panel" aria-label="Đơn hàng hiện tại">
        <div className="order-panel-heading">
          <div>
            <h2>Đơn hàng hiện tại</h2>
            <p>{table ? `${table.name} · ${table.area}` : 'Mang đi / tại quầy'}</p>
          </div>
          <ShoppingBag size={22} aria-hidden="true" />
        </div>
        {table && (
          <p className="ops-inline-note">
            Các món dưới đây là bản nháp mới, chưa cộng vào hóa đơn của bàn.
          </p>
        )}
        <div className="cart-lines">
          {!cart.length && (
            <EmptyState
              title="Chưa có món trong đơn"
              description="Chọn món từ thực đơn để bắt đầu."
            />
          )}
          {cart.map((line) => (
            <article className="cart-line" key={line.key}>
              <div className="cart-line-heading">
                <strong>{line.item.name}</strong>
                <button
                  className="icon-button"
                  type="button"
                  aria-label={`Xóa ${line.item.name}`}
                  onClick={() => {
                    setReceipt(false);
                    setCart(cart.filter((item) => item.key !== line.key));
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <label className="cart-size">
                Kích cỡ {line.item.name}
                <select
                  value={line.size}
                  onChange={(event) => {
                    const size = line.item.sizes.find(
                      (option) => option.name === event.target.value,
                    )!;
                    update(line.key, { size: size.name, unitPrice: line.item.price + size.extra });
                  }}
                >
                  {line.item.sizes.map((size) => (
                    <option key={size.name}>{size.name}</option>
                  ))}
                </select>
              </label>
              <label className="sr-only" htmlFor={`note-${line.key}`}>
                Ghi chú {line.item.name}
              </label>
              <input
                id={`note-${line.key}`}
                className="cart-note"
                value={line.note}
                maxLength={200}
                placeholder="Ghi chú: ít đường, ít đá..."
                onChange={(event) => update(line.key, { note: event.target.value })}
              />
              <div className="cart-line-bottom">
                <div className="quantity-control">
                  <button
                    type="button"
                    disabled={line.quantity <= 1}
                    aria-label={`Giảm số lượng ${line.item.name}`}
                    onClick={() => update(line.key, { quantity: line.quantity - 1 })}
                  >
                    <Minus size={14} />
                  </button>
                  <output aria-label={`Số lượng ${line.item.name}`}>{line.quantity}</output>
                  <button
                    type="button"
                    disabled={line.quantity >= 99}
                    aria-label={`Tăng số lượng ${line.item.name}`}
                    onClick={() => update(line.key, { quantity: line.quantity + 1 })}
                  >
                    <Plus size={14} />
                  </button>
                </div>
                <strong>{formatCurrency(line.unitPrice * line.quantity)}</strong>
              </div>
            </article>
          ))}
        </div>
        <div className="order-totals">
          <div>
            <span>Tạm tính</span>
            <strong>{formatCurrency(subtotal)}</strong>
          </div>
          <label htmlFor="order-discount">
            Giảm giá (₫)
            <input
              id="order-discount"
              inputMode="numeric"
              type="number"
              min="0"
              max={subtotal}
              step="1"
              value={discount}
              placeholder="0"
              onChange={(event) => {
                setDiscount(event.target.value);
                setReceipt(false);
              }}
            />
          </label>
          <div>
            <span>Giảm giá áp dụng</span>
            <span>−{formatCurrency(appliedDiscount)}</span>
          </div>
          <div className="order-grand-total">
            <span>Tổng cộng</span>
            <strong>{formatCurrency(total)}</strong>
          </div>
        </div>
        <fieldset className="payment-methods">
          <legend>Phương thức thanh toán</legend>
          <label>
            <input
              type="radio"
              name="payment-method"
              value="CASH"
              checked={payment === 'CASH'}
              onChange={() => setPayment('CASH')}
            />
            <Banknote size={18} aria-hidden="true" />
            Tiền mặt
          </label>
          <label>
            <input
              type="radio"
              name="payment-method"
              value="BANK"
              checked={payment === 'BANK'}
              onChange={() => setPayment('BANK')}
            />
            <Landmark size={18} aria-hidden="true" />
            Chuyển khoản ngân hàng
          </label>
        </fieldset>
        {payment === 'BANK' && (
          <p className="ops-inline-note">
            Chưa kết nối xác minh chuyển khoản. Không có giao dịch ngân hàng được thực hiện.
          </p>
        )}
        <button
          className="button"
          disabled={!cart.length}
          onClick={() =>
            setNotice('Thanh toán chưa được kết nối. Chưa có giao dịch nào được ghi nhận.')
          }
        >
          Xác nhận thanh toán
        </button>
        <button
          className="button button-secondary"
          disabled={!cart.length}
          onClick={() => setReceipt(true)}
        >
          <Printer size={17} aria-hidden="true" /> In phiếu tạm
        </button>
        {notice && (
          <p className="ops-inline-note" role="status">
            {notice}
          </p>
        )}
        {receipt && (
          <ReceiptPreview
            lines={cart.map((line) => ({
              name: `${line.item.name} (${line.size})${line.note ? ` — ${line.note}` : ''}`,
              quantity: line.quantity,
              price: line.unitPrice,
            }))}
            total={total}
            onClose={() => setReceipt(false)}
          />
        )}
      </aside>
    </div>
  );
}
