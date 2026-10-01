import { useInventoryActions } from '@/features/inventory/actions';
import { RecipeEditor } from '@/features/inventory/RecipeEditor';
import { useState } from 'react';
import { CookingPot, Pencil } from 'lucide-react';
import { SearchInput, SectionCard, StatCard, EmptyState } from '@/components/common/Foundation';
import { DataTable } from '@/components/common/DataTable';
import { formatCurrency, formatNumber } from '@/lib/format';
import { recipeCost } from './model';
import type { ManagerData } from './types';
export function Recipes({ data }: { data: ManagerData }) {
  const actions = useInventoryActions();
  const [editor, setEditor] = useState<string | null | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(data.recipes[0]?.id);
  const [notice, setNotice] = useState('');
  const recipe = data.recipes.find((item) => item.id === selected) ?? data.recipes[0];
  if (actions && editor !== undefined)
    return <RecipeEditor id={editor ?? undefined} onClose={() => setEditor(undefined)} />;
  if (!recipe)
    return (
      <>
        <EmptyState title="Chưa có công thức" />
        {actions && (
          <button className="button" onClick={() => setEditor(null)}>
            Thêm công thức
          </button>
        )}
      </>
    );
  const cost = recipeCost(recipe, data);
  const rows = recipe.ingredients.map((part) => ({
    ...part,
    ingredient: data.ingredients.find((item) => item.id === part.ingredientId)!,
  }));
  const filtered = data.recipes.filter((item) =>
    item.name.toLocaleLowerCase('vi-VN').includes(search.trim().toLocaleLowerCase('vi-VN')),
  );
  return (
    <div className="manager-recipes">
      <aside className="manager-recipe-list" aria-label="Danh sách món">
        {actions && (
          <button className="button" onClick={() => setEditor(null)}>
            Thêm công thức
          </button>
        )}
        <SearchInput
          label="Tìm món trong công thức"
          placeholder="Tìm món..."
          value={search}
          onChange={setSearch}
        />
        {filtered.map((item) => (
          <button
            key={item.id}
            className="recipe-select"
            aria-pressed={selected === item.id}
            onClick={() => {
              setSelected(item.id);
              setNotice('');
            }}
          >
            <CookingPot size={21} aria-hidden="true" />
            <span>
              <strong>{item.name}</strong>
              <small>{item.category}</small>
            </span>
          </button>
        ))}
        {!filtered.length && <EmptyState title="Không tìm thấy món" />}
      </aside>
      <div className="manager-recipe-detail">
        <div className="manager-toolbar">
          <div>
            <span className="manager-muted">Tên món</span>
            <h2>{recipe.name}</h2>
          </div>
          <button
            className="button button-secondary"
            onClick={() =>
              actions
                ? setEditor(recipe.id)
                : setNotice(
                    'Chỉnh sửa công thức chưa khả dụng. Định lượng và tồn kho chưa thay đổi.',
                  )
            }
          >
            <Pencil size={16} aria-hidden="true" />
            Chỉnh sửa công thức
          </button>
        </div>
        {notice && (
          <p className="manager-notice" role="status">
            {notice}
          </p>
        )}
        <div className="manager-recipe-kpis">
          <StatCard label="Giá bán" value={formatCurrency(recipe.price)} />
          <StatCard label="Chi phí nguyên liệu" value={formatCurrency(cost)} />
          <StatCard
            label="Biên lợi nhuận"
            value={`${formatNumber(recipe.marginPercent ?? (recipe.price > 0 ? Math.round(((recipe.price - cost) / recipe.price) * 1000) / 10 : 0))}%`}
            detail="Ước tính trước chi phí vận hành"
          />
        </div>
        <SectionCard title="Định lượng nguyên liệu">
          <DataTable
            caption={`Công thức ${recipe.name}`}
            rows={rows}
            rowKey={(row) => row.ingredientId}
            columns={[
              { key: 'name', header: 'Nguyên liệu', render: (row) => row.ingredient.name },
              {
                key: 'quantity',
                header: 'Định lượng',
                numeric: true,
                render: (row) => formatNumber(row.quantity),
              },
              { key: 'unit', header: 'Đơn vị', render: (row) => row.ingredient.unit },
              {
                key: 'cost',
                header: 'Chi phí ước tính',
                numeric: true,
                render: (row) =>
                  formatCurrency(Math.round(row.quantity * row.ingredient.costPerUnit)),
              },
            ]}
          />
        </SectionCard>
        <SectionCard title="Điều chỉnh theo tùy chọn">
          {recipe.modifiers.length ? (
            recipe.modifiers.map((modifier) => {
              const item = data.ingredients.find((entry) => entry.id === modifier.ingredientId)!;
              return (
                <div className="manager-modifier" key={`${modifier.name}:${modifier.ingredientId}`}>
                  <strong>{modifier.name}</strong>
                  <span>
                    Thêm {formatNumber(modifier.quantity)} {item.unit}{' '}
                    {item.name.toLocaleLowerCase('vi-VN')}
                  </span>
                  <span>Giá bán thêm: {formatCurrency(modifier.priceExtra)}</span>
                  <span>
                    Chi phí thêm: {formatCurrency(Math.round(modifier.quantity * item.costPerUnit))}
                  </span>
                </div>
              );
            })
          ) : (
            <p>Món này chưa có tùy chọn bổ sung.</p>
          )}
          <p className="manager-muted">
            {actions
              ? 'Chi phí theo đơn giá bình quân di động. Tùy chọn cộng thêm định lượng vào công thức chính. Trừ kho khi hệ thống bán hàng xác nhận đơn qua dịch vụ kho.'
              : 'Định lượng minh họa; chưa thực hiện tự động trừ nguyên liệu.'}
          </p>
        </SectionCard>
      </div>
    </div>
  );
}
