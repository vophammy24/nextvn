import { useState, type FormEvent } from 'react';
import { z } from 'zod';
import { SectionCard } from '@/components/common/Foundation';
import { useInventoryActions } from './actions';
import type { RecipeDraft } from './api';
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
  menuItemId: z.string().trim().min(1, 'Vui lòng nhập mã món.'),
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
export function RecipeEditor({ id, onClose }: { id?: string; onClose: () => void }) {
  const actions = useInventoryActions()!;
  const source = actions.snapshot.recipes.find((r) => r.id === id);
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
  const fresh = () => ({
    ingredientId: actions.snapshot.ingredients[0]?.id ?? '',
    quantity: 1,
    unit: actions.snapshot.ingredients[0]?.unit ?? 'g',
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
              {actions.snapshot.ingredients.map((i) => (
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
              {['g', 'kg', 'ml', 'L', 'cái'].map((u) => (
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
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const parsed = recipeDraftSchema.safeParse(draft);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Dữ liệu công thức không hợp lệ.');
      return;
    }
    try {
      await actions.save(id ? `/recipes/${id}` : '/recipes', id ? 'PUT' : 'POST', parsed.data);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <SectionCard
      title={id ? 'Chỉnh sửa công thức' : 'Thêm công thức'}
      actions={
        <button className="manager-text-button" onClick={onClose}>
          Đóng
        </button>
      }
    >
      <form className="manager-form" noValidate onSubmit={submit} aria-label="Thông tin công thức">
        <label className="manager-field">
          Mã món
          <input
            value={draft.menuItemId}
            onChange={(e) => setDraft({ ...draft, menuItemId: e.target.value })}
          />
          <small>Mã món từ danh mục bán hàng của chi nhánh.</small>
        </label>
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
            min="0"
            value={draft.sellingPrice}
            onChange={(e) => setDraft({ ...draft, sellingPrice: Number(e.target.value) })}
          />
        </label>
        {partsEditor(
          draft.ingredients,
          (ingredients) => setDraft({ ...draft, ingredients }),
          'Nguyên liệu chính',
        )}
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
                  setDraft({ ...draft, modifiers: draft.modifiers.filter((_, k) => k !== index) })
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
        {error && (
          <p role="alert" className="manager-notice manager-full">
            {error}
          </p>
        )}
        <button className="button" disabled={actions.pending}>
          {actions.pending ? 'Đang lưu...' : 'Lưu công thức'}
        </button>
      </form>
    </SectionCard>
  );
}
