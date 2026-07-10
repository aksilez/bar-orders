import { useState } from 'react'
import type { Category, Product } from '../types'
import { fmtEur, sortProducts } from '../types'
import type { Action } from '../state'
import { useT } from '../i18n'
import ConfirmButton from './ConfirmButton'

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
  const [editingCat, setEditingCat] = useState<Category | null>(null)

  const parsedPrice = form ? parseFloat(form.price.replace(',', '.')) : NaN
  const formValid =
    form !== null && form.name.trim() !== '' && isFinite(parsedPrice) && parsedPrice >= 0

  function save() {
    if (!form || !formValid) return
    const name = form.name.trim()
    if (form.id) {
      const original = products.find((p) => p.id === form.id)
      dispatch({
        type: 'updateProduct',
        product: {
          id: form.id,
          name,
          price: parsedPrice,
          category: form.category,
          favorite: original?.favorite,
        },
      })
    } else {
      dispatch({ type: 'addProduct', name, price: parsedPrice, category: form.category })
    }
    setForm(null)
  }

  function saveCategory() {
    const name = (catName ?? '').trim()
    if (name) dispatch({ type: 'addCategory', name })
    setCatName(null)
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
        const inCat = sortProducts(products.filter((p) => p.category === cat))
        return (
          <section key={cat} className="cat-section">
            <button className="cat-head-btn" onClick={() => setEditingCat(cat)}>
              <h3>{cat}</h3>
              <span className="cat-chevron">›</span>
            </button>
            {inCat.length === 0 && <p className="hint">{t('emptyCategory')}</p>}
            {inCat.map((p) => (
              <div className="product-row" key={p.id}>
                <button
                  className={'star-btn' + (p.favorite ? ' on' : '')}
                  aria-label="favorite"
                  onClick={() => dispatch({ type: 'toggleFavorite', id: p.id })}
                >
                  {p.favorite ? '★' : '☆'}
                </button>
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
                <ConfirmButton
                  label={t('delete')}
                  onConfirm={() => dispatch({ type: 'deleteProduct', id: p.id })}
                />
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

      {editingCat !== null && (
        <EditCategoryModal
          category={editingCat}
          productCount={products.filter((p) => p.category === editingCat).length}
          dispatch={dispatch}
          onClose={() => setEditingCat(null)}
        />
      )}
    </div>
  )
}

function EditCategoryModal({
  category,
  productCount,
  dispatch,
  onClose,
}: {
  category: Category
  productCount: number
  dispatch: React.Dispatch<Action>
  onClose: () => void
}) {
  const t = useT()
  const [name, setName] = useState(category)

  function save() {
    const trimmed = name.trim()
    if (trimmed && trimmed !== category) {
      dispatch({ type: 'renameCategory', oldName: category, newName: trimmed })
    }
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{t('editCategory')}</h3>
        <div className="field">
          <label>{t('categoryName')}</label>
          <input
            value={name}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()}
          />
        </div>
        {productCount > 0 && <p className="hint">{t('deletesProductsToo', String(productCount))}</p>}
        <div className="modal-actions">
          <ConfirmButton
            label={t('delete')}
            onConfirm={() => {
              dispatch({ type: 'deleteCategory', name: category })
              onClose()
            }}
          />
          <div className="spacer" />
          <button className="btn" onClick={onClose}>
            {t('cancel')}
          </button>
          <button className="btn primary" disabled={!name.trim()} onClick={save}>
            {t('save')}
          </button>
        </div>
      </div>
    </div>
  )
}
