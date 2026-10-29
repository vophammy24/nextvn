import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useWorkspace } from '@/features/auth/workspaceContext';
import { EmptyState, ErrorState, LoadingState } from '@/components/common/Foundation';
import { Modal } from '@/components/common/Modal';
import { IngredientEditor } from '@/features/manager/InventoryPage';
import { categories as ingredientCategories } from '@/features/manager/model';
import { z } from 'zod';
import { SectionCard } from '@/components/common/Foundation';
import { useInventoryActions } from './actions';
import { inventoryRequest, type RecipeDraft } from './api';
interface RecipeCatalog {
  branchName: string;
  categories: { id: string; name: string; isActive: boolean }[];
  menuItems: {
    id: string;
    name: string;
    price: number;
    categoryId: string;
    categoryName: string;
    description: string | null;
    isActive: boolean;
    recipeId: string | null;
  }[];
}
const positive = z
  .number({ error: 'Định lượng không hợp lệ.' })
  .finite('Định lượng không hợp lệ.')
  .positive('Định lượng phải lớn hơn 0.');
const part = z.object({
  ingredientId: z.string().min(1, 'Vui lòng chọn nguyên liệu.'),
  quantity: positive,
  unit: z.string(),
});
const recipeDraftSchema = z.object({
  menuItemId: z.string(),
  name: z.string().trim().min(1, 'Vui lòng nhập tên món.'),
  sellingPrice: z
    .number({ error: 'Giá bán không hợp lệ.' })
    .finite('Giá bán không hợp lệ.')
    .nonnegative('Giá bán không được âm.'),
  ingredients: z.array(part).min(1, 'Công thức cần ít nhất một nguyên liệu.'),
  modifiers: z.array(
    z.object({
      key: z.string().trim().min(1, 'Vui lòng nhập mã tùy chọn.'),
      name: z.string().trim().min(1, 'Vui lòng nhập tên tùy chọn.'),
      priceExtra: z
        .number({ error: 'Giá bán thêm không hợp lệ.' })
        .finite('Giá bán thêm không hợp lệ.')
        .nonnegative('Giá bán thêm không được âm.'),
      ingredients: z.array(part).min(1, 'Tùy chọn cần nguyên liệu.'),
    }),
  ),
});
export function RecipeEditor({
  id,
  onClose,
  onSaved,
}: {
  id?: string;
  onClose: () => void;
  onSaved?: (id: string) => void;
}) {
  const actions = useInventoryActions()!;
  const { context } = useWorkspace();
  const businessId = context.business.id;
  const branchId = context.branch?.id ?? '';
  const catalog = useQuery({
    queryKey: ['recipe-catalog', businessId, branchId],
    queryFn: ({ signal }) =>
      inventoryRequest<RecipeCatalog>(
        businessId,
        branchId,
        '/recipe-catalog',
        'GET',
        undefined,
        signal,
      ),
    enabled: !!businessId && !!branchId,
    retry: false,
  });
  const source = actions.snapshot.recipes.find((r) => r.id === id);
  const menuItems = catalog.data?.menuItems ?? [];
  const convert = (parts: { ingredientId: string; quantityMilli: number }[]) =>
    parts.map((p) => ({
      ingredientId: p.ingredientId,
      quantity: p.quantityMilli / 1000,
      unit: actions.snapshot.ingredients.find((i) => i.id === p.ingredientId)?.unit ?? 'g',
    }));
  const [draft, setDraft] = useState<RecipeDraft>(() =>
    source
      ? {
          menuItemId: source.menuItemId,
          name: source.name,
          sellingPrice: source.sellingPrice,
          ingredients: convert(source.ingredients),
          modifiers: source.modifiers.map((m) => ({ ...m, ingredients: convert(m.ingredients) })),
        }
      : { menuItemId: '', name: '', sellingPrice: 0, ingredients: [], modifiers: [] },
  );
  const [error, setError] = useState('');
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [search, setSearch] = useState('');
  const [ingredientSearch, setIngredientSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [requestKey] = useState(() => crypto.randomUUID());
  const [showIngredient, setShowIngredient] = useState(false);
  const [discard, setDiscard] = useState(false);
  const [saved, setSaved] = useState<{ id: string; posEligible: boolean } | null>(null);
  const selectedMenu = menuItems.find((item) => item.id === draft.menuItemId);
  const cost = draft.ingredients.reduce<number | null>(
    (total, part) => {
      const ingredient = actions.snapshot.ingredients.find((item) => item.id === part.ingredientId);
      if (
        total === null ||
        !ingredient ||
        !Number.isFinite(ingredient.unitCost) ||
        ingredient.unitCost <= 0 ||
        !Number.isFinite(part.quantity) ||
        part.quantity <= 0
      )
        return null;
      return (
        total +
        part.quantity * (part.unit === 'kg' || part.unit === 'L' ? 1000 : 1) * ingredient.unitCost
      );
    },
    draft.ingredients.length ? 0 : null,
  );
  const fresh = () => ({
    ingredientId: '',
    quantity: 1,
    unit: 'g',
  });
  const partsEditor = (
    parts: RecipeDraft['ingredients'],
    change: (parts: RecipeDraft['ingredients']) => void,
    label: string,
  ) => (
    <fieldset className="manager-full">
      <legend>{label}</legend>
      {parts.map((p, index) => (
        <div className="manager-form" key={index}>
          <label className="manager-field">
            Nguyên liệu
            <select
              value={p.ingredientId}
              onChange={(e) =>
                change(
                  parts.map((v, k) =>
                    k === index
                      ? {
                          ...v,
                          ingredientId: e.target.value,
                          unit:
                            actions.snapshot.ingredients.find((i) => i.id === e.target.value)
                              ?.unit ?? 'g',
                        }
                      : v,
                  ),
                )
              }
            >
              <option value="">Chọn nguyên liệu</option>
              {actions.snapshot.ingredients
                .filter(
                  (i) =>
                    i.name
                      .toLocaleLowerCase('vi-VN')
                      .includes(ingredientSearch.trim().toLocaleLowerCase('vi-VN')) ||
                    i.id === p.ingredientId,
                )
                .map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="manager-field">
            Định lượng
            <input
              type="number"
              min="0.001"
              step="any"
              value={p.quantity}
              onChange={(e) =>
                change(
                  parts.map((v, k) =>
                    k === index ? { ...v, quantity: Number(e.target.value) } : v,
                  ),
                )
              }
            />
          </label>
          <label className="manager-field">
            Đơn vị
            <select
              value={p.unit}
              onChange={(e) =>
                change(parts.map((v, k) => (k === index ? { ...v, unit: e.target.value } : v)))
              }
            >
              {(actions.snapshot.ingredients.find((i) => i.id === p.ingredientId)?.unit === 'g' ||
              actions.snapshot.ingredients.find((i) => i.id === p.ingredientId)?.unit === 'kg'
                ? ['g', 'kg']
                : actions.snapshot.ingredients.find((i) => i.id === p.ingredientId)?.unit ===
                      'ml' ||
                    actions.snapshot.ingredients.find((i) => i.id === p.ingredientId)?.unit === 'L'
                  ? ['ml', 'L']
                  : ['cái']
              ).map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="manager-text-button"
            aria-label={`Xóa nguyên liệu ${index + 1} trong ${label}`}
            onClick={() => change(parts.filter((_, k) => k !== index))}
          >
            Xóa nguyên liệu
          </button>
        </div>
      ))}
      <button
        type="button"
        className="manager-text-button"
        onClick={() => change([...parts, fresh()])}
      >
        Thêm định lượng
      </button>
    </fieldset>
  );
  const validateStep = (current: number) => {
    if (current === 0) {
      if (id && !source) return 'Không tìm thấy công thức.';
      if (mode === 'existing' || id) {
        if (!selectedMenu) return 'Vui lòng chọn món trong chi nhánh.';
        if (!id && selectedMenu.recipeId)
          return 'Món đã có công thức. Mở công thức hiện có để chỉnh sửa.';
        if (!id && !selectedMenu.isActive) return 'Món ngừng bán không thể tạo công thức mới.';
      } else {
        if (!draft.name.trim()) return 'Vui lòng nhập tên món.';
        if (
          !Number.isSafeInteger(draft.sellingPrice) ||
          draft.sellingPrice <= 0 ||
          draft.sellingPrice > 2147483647
        )
          return 'Giá bán phải là số nguyên dương hợp lệ.';
        if (!categoryId && !categoryName.trim()) return 'Chọn danh mục hoặc nhập danh mục mới.';
      }
    }
    if (current === 1) {
      const all = [draft.ingredients, ...draft.modifiers.map((m) => m.ingredients)];
      for (const parts of all) {
        if (!parts.length) return 'Công thức cần ít nhất một nguyên liệu.';
        if (new Set(parts.map((p) => p.ingredientId)).size !== parts.length)
          return 'Nguyên liệu không được lặp trong cùng định lượng.';
        for (const part of parts) {
          const ingredient = actions.snapshot.ingredients.find((i) => i.id === part.ingredientId);
          if (!ingredient) return 'Vui lòng chọn nguyên liệu trong chi nhánh.';
          if (!Number.isFinite(part.quantity) || part.quantity <= 0)
            return 'Định lượng phải lớn hơn 0.';
          const units =
            ingredient.unit === 'g' || ingredient.unit === 'kg'
              ? ['g', 'kg']
              : ingredient.unit === 'ml' || ingredient.unit === 'L'
                ? ['ml', 'L']
                : ['cái'];
          if (!units.includes(part.unit)) return 'Đơn vị không tương thích với nguyên liệu.';
          const scaled =
            part.quantity * (part.unit === 'kg' || part.unit === 'L' ? 1_000_000 : 1000);
          if (
            !Number.isFinite(scaled) ||
            scaled > 2_000_000_000 ||
            Math.abs(scaled - Math.round(scaled)) > 0.00001 ||
            Math.round(scaled) === 0
          )
            return 'Số lượng vượt giới hạn hoặc có quá nhiều chữ số thập phân.';
        }
      }
      if (new Set(draft.modifiers.map((m) => m.key.trim())).size !== draft.modifiers.length)
        return 'Mã tùy chọn không được trùng.';
      if (
        draft.modifiers.some(
          (m) =>
            !m.key.trim() || !m.name.trim() || !Number.isFinite(m.priceExtra) || m.priceExtra < 0,
        )
      )
        return 'Tùy chọn cần mã, tên và giá hợp lệ.';
    }
    return '';
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (actions.pending) return;
    const issue = validateStep(0) || validateStep(1);
    if (issue) {
      setError(issue);
      return;
    }
    const parsed = recipeDraftSchema.safeParse({
      ...draft,
      menuItemId: mode === 'new' && !id ? '' : draft.menuItemId,
      name: mode === 'new' && !id ? draft.name : (selectedMenu?.name ?? source?.name ?? ''),
      sellingPrice:
        mode === 'new' && !id
          ? draft.sellingPrice
          : (selectedMenu?.price ?? source?.sellingPrice ?? 0),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Dữ liệu công thức không hợp lệ.');
      return;
    }
    try {
      const body = { ingredients: parsed.data.ingredients, modifiers: parsed.data.modifiers };
      const result = id
        ? await actions.save(`/recipes/${id}`, 'PUT', { ...body, menuItemId: source!.menuItemId })
        : mode === 'new'
          ? await actions.save('/recipes/create-with-menu', 'POST', {
              requestKey,
              menu: {
                name: draft.name.trim(),
                price: draft.sellingPrice,
                description: description.trim(),
                isActive,
                ...(categoryId ? { categoryId } : { categoryName: categoryName.trim() }),
              },
              ...body,
            })
          : await actions.save('/recipes', 'POST', { ...body, menuItemId: draft.menuItemId });
      setSaved(result as { id: string; posEligible: boolean });
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <SectionCard
      title={id ? 'Chỉnh sửa công thức' : 'Thêm công thức'}
      actions={
        <button
          className="manager-text-button"
          onClick={() =>
            saved || (!draft.menuItemId && !draft.name && !draft.ingredients.length)
              ? onClose()
              : setDiscard(true)
          }
          disabled={actions.pending}
        >
          Đóng
        </button>
      }
    >
      {saved ? (
        <div role="status" className="manager-form">
          <h3>Đã lưu công thức</h3>
          <p>
            {saved.posEligible
              ? 'Món đang bật bán trong danh mục.'
              : 'Món đang ngừng bán; chưa xuất hiện trong POS.'}
          </p>
          <button
            className="button"
            type="button"
            onClick={() => (onSaved ? onSaved(saved.id) : onClose())}
          >
            Xem công thức
          </button>
        </div>
      ) : (
        <>
          <p role="status">
            Bước {step + 1}/3 — {['Chọn món', 'Định lượng', 'Xác nhận'][step]}
          </p>
          {catalog.isPending && <LoadingState label="Đang tải danh mục món..." />}
          {catalog.isError && (
            <ErrorState
              message={`Không thể tải danh mục món. ${catalog.error.message}`}
              onRetry={() => void catalog.refetch()}
            />
          )}
          {catalog.data && (
            <form
              className="manager-form"
              noValidate
              onSubmit={submit}
              aria-label="Thông tin công thức"
            >
              <fieldset
                disabled={actions.pending}
                className="manager-form manager-full manager-form-fields"
              >
                {step === 0 && (
                  <>
                    <p className="manager-full">
                      Chi nhánh: <strong>{catalog.data.branchName}</strong>
                    </p>
                    {!id && (
                      <div
                        className="manager-full manager-recipe-modes"
                        role="group"
                        aria-label="Cách tạo công thức"
                      >
                        <label>
                          <input
                            type="radio"
                            name="recipe-mode"
                            checked={mode === 'existing'}
                            onChange={() => {
                              setMode('existing');
                              setError('');
                            }}
                          />{' '}
                          Chọn món đã có
                        </label>{' '}
                        <label>
                          <input
                            type="radio"
                            name="recipe-mode"
                            checked={mode === 'new'}
                            onChange={() => {
                              setMode('new');
                              setError('');
                            }}
                          />{' '}
                          Tạo món mới kèm công thức
                        </label>
                      </div>
                    )}
                    {mode === 'existing' || id ? (
                      <>
                        {!id && (
                          <label className="manager-field">
                            Tìm món
                            <input
                              type="search"
                              value={search}
                              onChange={(event) => setSearch(event.target.value)}
                              placeholder="Tìm theo tên món"
                            />
                          </label>
                        )}
                        <label className="manager-field">
                          Món trong chi nhánh
                          <select
                            value={draft.menuItemId}
                            disabled={actions.pending || !!id}
                            onChange={(e) => {
                              const menu = menuItems.find((item) => item.id === e.target.value);
                              setDraft({
                                ...draft,
                                menuItemId: e.target.value,
                                ...(menu ? { name: menu.name, sellingPrice: menu.price } : {}),
                              });
                            }}
                          >
                            <option value="">Chọn món trong chi nhánh</option>
                            {menuItems
                              .filter(
                                (item) =>
                                  item.name
                                    .toLocaleLowerCase('vi-VN')
                                    .includes(search.trim().toLocaleLowerCase('vi-VN')) ||
                                  item.id === draft.menuItemId,
                              )
                              .map((menu) => (
                                <option
                                  key={menu.id}
                                  value={menu.id}
                                  disabled={!id && (!menu.isActive || !!menu.recipeId)}
                                >
                                  {menu.name}
                                  {menu.recipeId
                                    ? ' (đã có công thức)'
                                    : !menu.isActive
                                      ? ' (ngừng bán)'
                                      : ''}
                                </option>
                              ))}
                          </select>
                          <small>Chọn món đã có trong danh mục bán hàng của chi nhánh.</small>
                        </label>
                        {!menuItems.length && (
                          <EmptyState
                            title="Chưa có món nào trong thực đơn"
                            description="Tạo món mới để bắt đầu thiết lập công thức."
                            action={
                              <button
                                type="button"
                                className="button"
                                onClick={() => setMode('new')}
                              >
                                Tạo món mới
                              </button>
                            }
                          />
                        )}
                        {selectedMenu && (
                          <div className="manager-full">
                            <p>
                              Tên món: <strong>{selectedMenu.name}</strong>
                            </p>
                            <p>
                              Danh mục: {selectedMenu.categoryName || 'Chưa xác định'} · Giá bán:{' '}
                              {new Intl.NumberFormat('vi-VN').format(selectedMenu.price)} ₫ ·{' '}
                              {selectedMenu.isActive ? 'Đang bán' : 'Ngừng bán'}
                            </p>
                            <p>{selectedMenu.description}</p>
                            {selectedMenu.recipeId && !id && (
                              <button
                                type="button"
                                className="manager-text-button"
                                onClick={() => onSaved?.(selectedMenu.recipeId!)}
                              >
                                Xem / chỉnh sửa công thức
                              </button>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <label className="manager-field">
                          Tên món
                          <input
                            value={draft.name}
                            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                          />
                        </label>
                        <label className="manager-field">
                          Giá bán
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={draft.sellingPrice}
                            onChange={(e) =>
                              setDraft({ ...draft, sellingPrice: Number(e.target.value) })
                            }
                          />
                        </label>
                        <label className="manager-field">
                          Danh mục hiện có
                          <select
                            value={categoryId}
                            onChange={(event) => {
                              setCategoryId(event.target.value);
                              if (event.target.value) setCategoryName('');
                            }}
                          >
                            <option value="">Chọn danh mục</option>
                            {catalog.data.categories
                              .filter((item) => item.isActive)
                              .map((item) => (
                                <option key={item.id} value={item.id}>
                                  {item.name}
                                </option>
                              ))}
                          </select>
                        </label>
                        <label className="manager-field">
                          Hoặc tạo danh mục mới
                          <input
                            value={categoryName}
                            onChange={(event) => {
                              setCategoryName(event.target.value);
                              if (event.target.value) setCategoryId('');
                            }}
                          />
                        </label>
                        <label className="manager-field manager-full">
                          Mô tả món
                          <textarea
                            value={description}
                            maxLength={2000}
                            onChange={(event) => setDescription(event.target.value)}
                          />
                        </label>
                        <label className="manager-field manager-full manager-recipe-availability">
                          <span>
                            <input
                              type="checkbox"
                              checked={isActive}
                              onChange={(event) => setIsActive(event.target.checked)}
                            />{' '}
                            Bật bán sau khi lưu
                          </span>
                        </label>
                      </>
                    )}
                  </>
                )}
                {step === 1 && (
                  <>
                    <p className="manager-full">
                      Thiết lập lượng nguyên liệu cần dùng để tạo ra{' '}
                      <strong>một phần của món</strong>.
                    </p>
                    <label className="manager-field">
                      Tìm nguyên liệu
                      <input
                        type="search"
                        value={ingredientSearch}
                        onChange={(event) => setIngredientSearch(event.target.value)}
                      />
                    </label>
                    {partsEditor(
                      draft.ingredients,
                      (ingredients) => setDraft({ ...draft, ingredients }),
                      'Nguyên liệu chính',
                    )}
                    {!actions.snapshot.ingredients.length && (
                      <EmptyState
                        title="Chi nhánh chưa có nguyên liệu"
                        description="Hãy thêm nguyên liệu trước khi thiết lập công thức."
                      />
                    )}
                    <button
                      className="button button-secondary"
                      type="button"
                      onClick={() => setShowIngredient(true)}
                    >
                      Thêm nguyên liệu mới
                    </button>
                    <p className="manager-full">
                      Chi phí nguyên liệu dự tính:{' '}
                      {cost === null
                        ? 'Chưa đủ dữ liệu'
                        : `${new Intl.NumberFormat('vi-VN').format(cost)} ₫`}
                      . Đơn giá lấy từ tồn kho hiện tại.
                    </p>
                    {draft.modifiers.map((m, index) => (
                      <fieldset key={index} className="manager-full">
                        <legend>Tùy chọn {index + 1}</legend>
                        <div className="manager-form">
                          <label className="manager-field">
                            Mã tùy chọn
                            <input
                              value={m.key}
                              onChange={(e) =>
                                setDraft({
                                  ...draft,
                                  modifiers: draft.modifiers.map((v, k) =>
                                    k === index ? { ...v, key: e.target.value } : v,
                                  ),
                                })
                              }
                            />
                          </label>
                          <label className="manager-field">
                            Tên tùy chọn
                            <input
                              value={m.name}
                              onChange={(e) =>
                                setDraft({
                                  ...draft,
                                  modifiers: draft.modifiers.map((v, k) =>
                                    k === index ? { ...v, name: e.target.value } : v,
                                  ),
                                })
                              }
                            />
                          </label>
                          <label className="manager-field">
                            Giá bán thêm
                            <input
                              type="number"
                              min="0"
                              value={m.priceExtra}
                              onChange={(e) =>
                                setDraft({
                                  ...draft,
                                  modifiers: draft.modifiers.map((v, k) =>
                                    k === index ? { ...v, priceExtra: Number(e.target.value) } : v,
                                  ),
                                })
                              }
                            />
                          </label>
                          {partsEditor(
                            m.ingredients,
                            (ingredients) =>
                              setDraft({
                                ...draft,
                                modifiers: draft.modifiers.map((v, k) =>
                                  k === index ? { ...v, ingredients } : v,
                                ),
                              }),
                            `Nguyên liệu tùy chọn ${index + 1}`,
                          )}
                          <button
                            className="manager-text-button"
                            type="button"
                            onClick={() =>
                              setDraft({
                                ...draft,
                                modifiers: draft.modifiers.filter((_, k) => k !== index),
                              })
                            }
                          >
                            Xóa tùy chọn
                          </button>
                        </div>
                      </fieldset>
                    ))}
                    <button
                      className="button button-secondary"
                      type="button"
                      onClick={() =>
                        setDraft({
                          ...draft,
                          modifiers: [
                            ...draft.modifiers,
                            { key: '', name: '', priceExtra: 0, ingredients: [fresh()] },
                          ],
                        })
                      }
                    >
                      Thêm tùy chọn
                    </button>
                    {!!draft.modifiers.length && (
                      <p className="manager-full">
                        POS hiện chưa cho chọn tùy chọn khi bán. Tùy chọn được lưu trong công thức
                        để dùng qua API hỗ trợ.
                      </p>
                    )}
                  </>
                )}
                {step === 2 && (
                  <div className="manager-full">
                    <h3>Xác nhận công thức</h3>
                    <p>
                      Món:{' '}
                      <strong>{mode === 'new' && !id ? draft.name : selectedMenu?.name}</strong>
                    </p>
                    <p>
                      Danh mục:{' '}
                      {mode === 'new' && !id
                        ? (catalog.data.categories.find((item) => item.id === categoryId)?.name ??
                          categoryName)
                        : selectedMenu?.categoryName}
                    </p>
                    <p>
                      Giá bán:{' '}
                      {new Intl.NumberFormat('vi-VN').format(
                        mode === 'new' && !id ? draft.sellingPrice : (selectedMenu?.price ?? 0),
                      )}{' '}
                      ₫
                    </p>
                    <p>
                      Trạng thái:{' '}
                      {mode === 'new' && !id
                        ? isActive
                          ? 'Bật bán'
                          : 'Ngừng bán'
                        : selectedMenu?.isActive
                          ? 'Đang bán'
                          : 'Ngừng bán'}
                    </p>
                    <ul>
                      {draft.ingredients.map((part, index) => (
                        <li key={index}>
                          {
                            actions.snapshot.ingredients.find(
                              (item) => item.id === part.ingredientId,
                            )?.name
                          }
                          : {part.quantity} {part.unit} / phần
                        </li>
                      ))}
                    </ul>
                    <p>{draft.modifiers.length} tùy chọn</p>
                    <p>
                      Chi phí dự tính:{' '}
                      {cost === null
                        ? 'Chưa đủ dữ liệu'
                        : `${new Intl.NumberFormat('vi-VN').format(cost)} ₫`}
                    </p>
                    <p>
                      Biên lợi nhuận gộp ước tính:{' '}
                      {cost === null ||
                      !(mode === 'new' && !id ? draft.sellingPrice : selectedMenu?.price)
                        ? 'Chưa đủ dữ liệu'
                        : `${Math.round((((mode === 'new' && !id ? draft.sellingPrice : selectedMenu!.price) - cost) / (mode === 'new' && !id ? draft.sellingPrice : selectedMenu!.price)) * 10000) / 100}%`}
                    </p>
                  </div>
                )}
                {error && (
                  <p role="alert" className="manager-notice manager-full">
                    {error}
                  </p>
                )}
                <div className="manager-form-footer manager-full">
                  {step > 0 && (
                    <button
                      className="button button-secondary"
                      type="button"
                      onClick={() => {
                        setStep(step - 1);
                        setError('');
                      }}
                    >
                      Quay lại
                    </button>
                  )}
                  {step < 2 ? (
                    <button
                      key="recipe-next"
                      className="button"
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        const issue = validateStep(step);
                        if (issue) setError(issue);
                        else {
                          setError('');
                          setStep(step + 1);
                        }
                      }}
                    >
                      Tiếp tục
                    </button>
                  ) : (
                    <button
                      key="recipe-save"
                      className="button"
                      type="submit"
                      disabled={actions.pending}
                    >
                      {actions.pending
                        ? 'Đang lưu...'
                        : mode === 'new' && !id
                          ? 'Tạo món và lưu công thức'
                          : 'Lưu công thức'}
                    </button>
                  )}
                </div>
              </fieldset>
            </form>
          )}
        </>
      )}
      {showIngredient && (
        <IngredientEditor
          item={null}
          onClose={() => setShowIngredient(false)}
          categoryOptions={[
            ...new Set([
              ...ingredientCategories,
              ...actions.snapshot.ingredients.map((item) => item.category),
            ]),
          ]}
        />
      )}
      <Modal
        open={discard}
        onClose={() => setDiscard(false)}
        title="Bỏ thay đổi công thức?"
        footer={
          <>
            <button
              type="button"
              className="button button-secondary"
              onClick={() => setDiscard(false)}
            >
              Tiếp tục chỉnh sửa
            </button>
            <button type="button" className="button" onClick={onClose}>
              Bỏ thay đổi
            </button>
          </>
        }
      >
        <p>Những thông tin chưa lưu sẽ mất.</p>
      </Modal>
    </SectionCard>
  );
}
