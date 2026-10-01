import { useInventoryActions } from '@/features/inventory/actions';
import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowDownToLine, ArrowUpFromLine, SlidersHorizontal, Trash2 } from 'lucide-react';
import { SectionCard, FilterTabs, EmptyState } from '@/components/common/Foundation';
import { formatDateTime, formatNumber } from '@/lib/format';
import { transactionLabels, transactionSchema } from './model';
import type { ManagerData, TransactionType } from './types';
export function Transactions({ data }: { data: ManagerData }) {
  const actions = useInventoryActions();
  const [unitCost, setUnitCost] = useState('');
  const [params] = useSearchParams();
  const preselected =
    data.ingredients.find((item) => item.id === params.get('ingredient'))?.id ?? '';
  const [type, setType] = useState<TransactionType>('IN');
  const [ingredientId, setIngredient] = useState(preselected);
  const [quantity, setQuantity] = useState('');
  const [supplier, setSupplier] = useState('');
  const [expiry, setExpiry] = useState('');
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('');
  const ingredient = data.ingredients.find((item) => item.id === ingredientId);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!quantity.trim()) {
      setMessage('Vui lòng nhập số lượng.');
      return;
    }
    const result = transactionSchema.safeParse({
      type,
      ingredientId,
      quantity,
      supplier,
      expiry,
      note,
    });
    if (!result.success) {
      setMessage(result.error.issues[0].message);
      return;
    }
    if ((type === 'OUT' || type === 'WASTE') && ingredient && Number(quantity) > ingredient.stock) {
      setMessage('Số lượng vượt quá tồn hiện tại. Vui lòng kiểm tra lại.');
      return;
    }
    if (actions && ingredient) {
      if (
        type === 'IN' &&
        (!unitCost.trim() || !Number.isFinite(Number(unitCost)) || Number(unitCost) < 0)
      ) {
        setMessage('Vui lòng nhập đơn giá hợp lệ.');
        return;
      }
      const types = {
        IN: 'IMPORT',
        OUT: 'EXPORT',
        ADJUST: 'ADJUSTMENT',
        WASTE: 'WASTE',
        SALE: 'SALE_CONSUMPTION',
      };
      try {
        await actions.save('/transactions', 'POST', {
          type: types[type],
          ingredientId,
          quantity: Number(quantity),
          unit: ingredient.unit,
          ...(type === 'IN' ? { unitCost: Number(unitCost) } : {}),
          supplier,
          expiry: expiry || null,
          reason: note,
        });
        setMessage('Đã ghi nhận giao dịch.');
        setQuantity('');
      } catch (error) {
        setMessage((error as Error).message);
      }
      return;
    }
    setMessage('Ghi nhận giao dịch chưa khả dụng. Tồn kho và lịch sử giao dịch chưa thay đổi.');
  };
  const icons = {
    SALE: ArrowUpFromLine,
    IN: ArrowDownToLine,
    OUT: ArrowUpFromLine,
    ADJUST: SlidersHorizontal,
    WASTE: Trash2,
  };
  return (
    <div className="manager-two-panel">
      <SectionCard title="Ghi nhận nhập / xuất kho">
        <FilterTabs
          label="Loại giao dịch"
          items={Object.entries(transactionLabels)
            .filter(([value]) => value !== 'SALE')
            .map(([value, label]) => ({ value, label }))}
          value={type}
          onChange={(value) => {
            setType(value as TransactionType);
            setMessage('');
          }}
        />
        <form
          className="manager-form transaction-form"
          noValidate
          onSubmit={submit}
          aria-label="Giao dịch kho"
        >
          <label className="manager-field manager-full">
            Nguyên liệu
            <select
              value={ingredientId}
              required
              onChange={(event) => {
                setIngredient(event.target.value);
                setMessage('');
              }}
            >
              <option value="">Chọn nguyên liệu</option>
              {data.ingredients.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.unit})
                </option>
              ))}
            </select>
          </label>
          <label className="manager-field">
            Số lượng
            <input
              type="number"
              min={type === 'ADJUST' ? 0 : 0.001}
              step="any"
              value={quantity}
              required
              onChange={(event) => setQuantity(event.target.value)}
            />
            {ingredient && (
              <small>
                Tồn hiện tại: {formatNumber(ingredient.stock)} {ingredient.unit}
              </small>
            )}
            {type === 'ADJUST' && (
              <small>Nhập số lượng tồn thực tế sau kiểm kê, không phải phần chênh lệch.</small>
            )}
          </label>
          <label className="manager-field">
            Nhà cung cấp
            <input
              value={supplier}
              required={type === 'IN'}
              onChange={(event) => setSupplier(event.target.value)}
              placeholder={type === 'IN' ? 'Nhập nhà cung cấp' : 'Không bắt buộc'}
            />
          </label>
          {type === 'IN' && (
            <label className="manager-field">
              Đơn giá mỗi đơn vị (₫)
              <input
                type="number"
                min="0"
                step="any"
                value={unitCost}
                onChange={(event) => setUnitCost(event.target.value)}
              />
            </label>
          )}
          <label className="manager-field manager-full">
            Hạn sử dụng
            <input type="date" value={expiry} onChange={(event) => setExpiry(event.target.value)} />
          </label>
          <label className="manager-field manager-full">
            Lý do / Ghi chú
            <textarea
              rows={3}
              value={note}
              required
              onChange={(event) => setNote(event.target.value)}
              placeholder="Nhập lý do giao dịch..."
            />
          </label>
          {message && (
            <p className="manager-notice manager-full" role="alert">
              {message}
            </p>
          )}
          <button type="submit" className="button manager-full" disabled={actions?.pending}>
            {actions?.pending ? 'Đang ghi nhận...' : 'Ghi nhận giao dịch'}
          </button>
        </form>
      </SectionCard>
      <SectionCard title="Giao dịch gần đây">
        <div className="manager-transactions">
          {!data.transactions.length && <EmptyState title="Chưa có giao dịch kho" />}
          {data.transactions.map((transaction) => {
            const Icon = icons[transaction.type];
            const item = data.ingredients.find((entry) => entry.id === transaction.ingredientId)!;
            return (
              <article key={transaction.id}>
                <span className="manager-transaction-icon">
                  <Icon size={20} aria-hidden="true" />
                </span>
                <div>
                  <strong>
                    {transactionLabels[transaction.type]} · {item.name}
                  </strong>
                  <p>
                    {formatNumber(transaction.quantity)} {item.unit} ·{' '}
                    {formatDateTime(transaction.at)}
                  </p>
                  <p>{transaction.note}</p>
                  {transaction.supplier && <small>{transaction.supplier}</small>}
                </div>
              </article>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}
