import { useState } from 'react'
import type { Category, Product } from '../types'
import { fmtEur } from '../types'
import type { Action } from '../state'
import { useT } from '../i18n'

interface Props {
  products: Product[]
  categories: Category[]
  dispatch: React.Dispatch<Action>
}

interface FormState {
  id?: string
  name: string
  price: string
  category: Category
}

export default function MenuScreen({ products, categories, dispatch }: Props) {
  const t = useT()
  const [form, setForm] = useState<FormState | null>(null)
  const [catName, setCatName] = useState<string | null>(null)

  const parsedPrice = form ? parseFloat(form.price.replace(',', '.')) : NaN
  const formValid =
    form !== null && form.name.trim() !== '' && isFinite(parsedPrice) && parsedPrice >= 0

  function save() {
    if (!form || !formValid) return
    const name = form.name.trim()
    if (form.id) {
      dispatch({
        type: 'updateProduct',
        product: { id: form.id, name, price: parsedPrice, category: form.category },
      })
    } else {
      dispatch({ type: 'addProduct', name, price: parsedPrice, category: form.category })
    }
    setForm(null)
  }

  function remove(p: Product) {
    if (window.confirm(t('confirmDeleteProduct', p.name))) {
      dispatch({ type: 'deleteProduct', id: p.id })
    }
  }

  function saveCategory() {
    const name = (catName ?? '').trim()
    if (name) dispatch({ type: 'addCategory', name })
    setCatName(null)
  }

  function removeCategory(name: string) {
    if (window.confirm(t('confirmDeleteCategory', name))) {
      dispatch({ type: 'deleteCategory', name })
    }
  }

  return (
    <div className="screen">
      <div className="screen-header">
        <h2>{t('menu')}</h2>
        <div className="header-actions">
          <button className="btn" onClick={() => setCatName('')}>
            {t('addCategory')}
          </button>
          <button
            className="btn primary"
            onClick={() => setForm({ name: '', price: '', category: categories[0] ?? '' })}
          >
            {t('addProduct')}
          </button>
        </div>
      </div>

      {categories.map((cat) => {
        const inCat = products.filter((p) => p.category === cat)
        return (
          <section key={cat} className="cat-section">
            <div className="cat-head">
              <h3>{cat}</h3>
              {inCat.length === 0 && (
                <button className="btn danger small" onClick={() => removeCategory(cat)}>
                  {t('delete')}
                </button>
              )}
            </div>
            {inCat.length === 0 && <p className="hint">{t('emptyCategory')}</p>}
            {inCat.map((p) => (
              <div className="product-row" key={p.id}>
                <span className="name">{p.name}</span>
                <span className="price">{fmtEur(p.price)}</span>
                <button
                  className="btn"
                  onClick={() =>
                    setForm({ id: p.id, name: p.name, price: p.price.toFixed(2), category: p.category })
                  }
                >
                  {t('edit')}
                </button>
                <button className="btn danger" onClick={() => remove(p)}>
                  {t('delete')}
                </button>
              </div>
            ))}
          </section>
        )
      })}

      {form && (
        <div className="modal-backdrop" onClick={() => setForm(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{form.id ? t('editProduct') : t('newProduct')}</h3>
            <div className="field">
              <label>{t('name')}</label>
              <input
                value={form.name}
                autoFocus
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="field">
              <label>{t('priceEur')}</label>
              <input
                value={form.price}
                inputMode="decimal"
                placeholder="0.00"
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </div>
            <div className="field">
              <label>{t('category')}</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="modal-actions">
              <div className="spacer" />
              <button className="btn" onClick={() => setForm(null)}>
                {t('cancel')}
              </button>
              <button className="btn primary" disabled={!formValid} onClick={save}>
                {t('save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {catName !== null && (
        <div className="modal-backdrop" onClick={() => setCatName(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{t('newCategory')}</h3>
            <div className="field">
              <label>{t('categoryName')}</label>
              <input
                value={catName}
                autoFocus
                onChange={(e) => setCatName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveCategory()}
              />
            </div>
            <div className="modal-actions">
              <div className="spacer" />
              <button className="btn" onClick={() => setCatName(null)}>
                {t('cancel')}
              </button>
              <button className="btn primary" disabled={!catName.trim()} onClick={saveCategory}>
                {t('add')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
