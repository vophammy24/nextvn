import { useInventoryActions } from '@/features/inventory/actions';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { Download, Plus, Pencil } from 'lucide-react';
import { SearchInput, FilterTabs, StatusBadge, SectionCard } from '@/components/common/Foundation';
import { DataTable } from '@/components/common/DataTable';
import { formatDate, formatNumber } from '@/lib/format';
import { categories, inventoryStatus } from './model';
import { downloadDemoCsv } from './export';
import type { ManagerData, Ingredient } from './types';
const ingredientSchema = z.object({
  name: z.string().trim().min(1, 'Vui lòng nhập tên nguyên liệu.'),
  unit: z.string().trim().min(1, 'Vui lòng nhập đơn vị.'),
  minimum: z.coerce
    .number({ error: 'Tồn tối thiểu không hợp lệ.' })
    .finite()
    .nonnegative('Tồn tối thiểu không được âm.'),
});
function IngredientEditor({ item, onClose }: { item: Ingredient | null; onClose: () => void }) {
  const actions = useInventoryActions();
  const [unitCost, setUnitCost] = useState(String(item?.costPerUnit ?? 0));
  const [name, setName] = useState(item?.name ?? '');
  const [unit, setUnit] = useState(item?.unit ?? 'g');
  const [category, setCategory] = useState(item?.category ?? categories[0]);
  const [minimum, setMinimum] = useState(String(item?.minimum ?? 0));
  const [message, setMessage] = useState('');
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const result = ingredientSchema.safeParse({ name, unit, minimum });
    if (result.success && actions) {
      if (!unitCost.trim() || !Number.isFinite(Number(unitCost)) || Number(unitCost) < 0) {
        setMessage('Đơn giá không hợp lệ.');
        return;
      }
      try {
        await actions.save(
          item ? `/ingredients/${item.id}` : '/ingredients',
          item ? 'PATCH' : 'POST',
          { ...result.data, category, unitCost: Number(unitCost) },
        );
        onClose();
      } catch (error) {
        setMessage((error as Error).message);
      }
      return;
    }
    setMessage(
      result.success
        ? 'Lưu nguyên liệu chưa khả dụng. Chưa có thay đổi nào được ghi nhận.'
        : result.error.issues[0].message,
    );
  };
  return (
    <SectionCard
      title={item ? 'Chỉnh sửa nguyên liệu' : 'Thêm nguyên liệu'}
      actions={
        <button className="manager-text-button" onClick={onClose}>
          Đóng
        </button>
      }
    >
      <form
        className="manager-form"
        onSubmit={submit}
        noValidate
        aria-label="Thông tin nguyên liệu"
      >
        <label className="manager-field">
          Tên nguyên liệu
          <input value={name} onChange={(event) => setName(event.target.value)} required />
        </label>
        <label className="manager-field">
          Danh mục
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            {categories.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label className="manager-field">
          Đơn vị
          <select value={unit} disabled={!!item} onChange={(event) => setUnit(event.target.value)}>
            {['g', 'kg', 'ml', 'L', 'cái'].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label className="manager-field">
          Tồn tối thiểu
          <input
            type="number"
            min="0"
            step="any"
            value={minimum}
            onChange={(event) => setMinimum(event.target.value)}
          />
        </label>
        <label className="manager-field">
          Đơn giá mỗi đơn vị (₫)
          <input
            type="number"
            min="0"
            step="any"
            value={unitCost}
            disabled={!!item}
            onChange={(event) => setUnitCost(event.target.value)}
          />
        </label>
        <div className="manager-form-footer">
          <p>
            {actions
              ? 'Tồn kho và đơn giá được cập nhật qua giao dịch nhập / xuất kho.'
              : 'Biểu mẫu minh họa. Chưa lưu thay đổi lên máy chủ.'}
          </p>
          <button className="button" type="submit" disabled={actions?.pending}>
            Lưu nguyên liệu
          </button>
        </div>
        {message && (
          <p className="manager-notice" role="alert">
            {message}
          </p>
        )}
      </form>
    </SectionCard>
  );
}
export function Inventory({ data }: { data: ManagerData }) {
  const actions = useInventoryActions();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Tất cả');
  const [editor, setEditor] = useState<Ingredient | null | undefined>(undefined);
  const [notice, setNotice] = useState('');
  const rows = data.ingredients.filter(
    (item) =>
      (category === 'Tất cả' || item.category === category) &&
      item.name.toLocaleLowerCase('vi-VN').includes(search.trim().toLocaleLowerCase('vi-VN')),
  );
  const attention = data.ingredients.filter(
    (item) => inventoryStatus(item, data.asOf) !== 'IN_STOCK',
  ).length;
  return (
    <>
      <div className="manager-toolbar">
        <p>
          {data.ingredients.length} nguyên liệu · {attention} mục cần chú ý
        </p>
        <div className="manager-actions">
          <button
            className="button button-secondary"
            onClick={() => {
              downloadDemoCsv(actions ? 'nextvn-kho.csv' : 'nextvn-kho-minh-hoa.csv', [
                [actions ? 'TỒN KHO CHI NHÁNH' : 'TỒN KHO MINH HỌA — KHÔNG PHẢI SỐ LIỆU THỰC'],
                [
                  'Nguyên liệu',
                  'Danh mục',
                  'Đơn vị',
                  'Tồn hiện tại',
                  'Tồn tối thiểu',
                  'Hạn sử dụng',
                ],
                ...rows.map((item) => [
                  item.name,
                  item.category,
                  item.unit,
                  item.stock,
                  item.minimum,
                  item.expiry ? formatDate(item.expiry) : 'Chưa có',
                ]),
              ]);
              setNotice(
                actions
                  ? 'Đã xuất các nguyên liệu đang hiển thị.'
                  : 'Đã tạo tệp CSV từ các nguyên liệu minh họa đang hiển thị.',
              );
            }}
          >
            <Download size={16} aria-hidden="true" />
            Xuất dữ liệu
          </button>
          <button className="button" onClick={() => setEditor(null)}>
            <Plus size={17} aria-hidden="true" />
            Thêm nguyên liệu
          </button>
        </div>
      </div>
      {notice && (
        <p role="status" className="manager-notice">
          {notice}
        </p>
      )}
      <SearchInput
        label="Tìm nguyên liệu"
        placeholder="Tìm nguyên liệu..."
        value={search}
        onChange={setSearch}
      />
      <FilterTabs
        label="Danh mục nguyên liệu"
        items={['Tất cả', ...categories].map((value) => ({ value, label: value }))}
        value={category}
        onChange={setCategory}
      />
      {editor !== undefined && (
        <IngredientEditor
          key={editor?.id ?? 'new'}
          item={editor}
          onClose={() => setEditor(undefined)}
        />
      )}
      <DataTable
        caption="Danh sách nguyên liệu"
        rows={rows}
        rowKey={(item) => item.id}
        columns={[
          { key: 'name', header: 'Nguyên liệu', render: (item) => <strong>{item.name}</strong> },
          { key: 'category', header: 'Danh mục', render: (item) => item.category },
          { key: 'unit', header: 'Đơn vị', render: (item) => item.unit },
          {
            key: 'stock',
            header: 'Tồn hiện tại',
            numeric: true,
            render: (item) => formatNumber(item.stock),
          },
          {
            key: 'minimum',
            header: 'Tồn tối thiểu',
            numeric: true,
            render: (item) => formatNumber(item.minimum),
          },
          {
            key: 'expiry',
            header: 'Hạn sử dụng',
            render: (item) => (item.expiry ? formatDate(item.expiry) : 'Chưa có'),
          },
          {
            key: 'status',
            header: 'Trạng thái',
            render: (item) => <StatusBadge status={inventoryStatus(item, data.asOf)} />,
          },
          {
            key: 'actions',
            header: 'Thao tác',
            render: (item) => (
              <div className="manager-row-actions">
                <button
                  className="manager-text-button"
                  aria-label={`Chỉnh sửa ${item.name}`}
                  onClick={() => setEditor(item)}
                >
                  <Pencil size={14} aria-hidden="true" />
                  Chỉnh sửa
                </button>
                <Link to={`/app/stock-transactions?ingredient=${item.id}`}>Nhập thêm</Link>
              </div>
            ),
          },
        ]}
        emptyMessage="Không tìm thấy nguyên liệu"
      />
    </>
  );
}
