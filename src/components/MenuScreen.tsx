import { useEffect, useState } from 'react'
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

/** Sentinel for the virtual "Favorites" category in the sidebar. */
const FAV = '__fav__'
const ALL = '__all__'

export default function MenuScreen({ products, categories, dispatch }: Props) {
  const t = useT()
  const [form, setForm] = useState<FormState | null>(null)
  const [catName, setCatName] = useState<string | null>(null)
  const [editingCat, setEditingCat] = useState<Category | null>(null)
  const [selected, setSelected] = useState<Category>(ALL)

  // Keep a valid category selected as the list changes.
  useEffect(() => {
    if (
      selected !== FAV &&
      selected !== ALL &&
      !categories.includes(selected) &&
      categories.length > 0
    ) {
      setSelected(categories[0])
    }
  }, [categories, selected])

  const isFav = selected === FAV
  const isAll = selected === ALL
  const virtual = isFav || isAll
  const shown = isFav
    ? sortProducts(products.filter((p) => p.favorite))
    : isAll
      ? sortProducts(products)
      : sortProducts(products.filter((p) => p.category === selected))

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
    if (name) {
      dispatch({ type: 'addCategory', name })
      setSelected(name)
    }
    setCatName(null)
  }

  return (
    <div className="screen menu-screen">
      <div className="menu-layout">
        <aside className="menu-sidebar">
          <button
            className={'menu-cat all' + (isAll ? ' on' : '')}
            onClick={() => setSelected(ALL)}
          >
            {t('allProducts')}
          </button>
          <button
            className={'menu-cat' + (isFav ? ' on' : '')}
            onClick={() => setSelected(FAV)}
          >
            {t('favorites')}
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              className={'menu-cat' + (cat === selected ? ' on' : '')}
              onClick={() => setSelected(cat)}
            >
              {cat}
            </button>
          ))}
          <button className="menu-cat add" onClick={() => setCatName('')}>
            + {t('addCategory').replace(/^\+\s*/, '')}
          </button>
        </aside>

        <section className="menu-detail">
          {categories.length === 0 && !virtual ? (
            <div className="empty">{t('emptyCategory')}</div>
          ) : (
            <>
              <div className="detail-head">
                {virtual ? (
                  <h2>{isFav ? t('favorites') : t('allProducts')}</h2>
                ) : (
                  <button
                    className="cat-title-btn"
                    aria-label={t('editCategory')}
                    onClick={() => setEditingCat(selected)}
                  >
                    <h2>{selected}</h2>
                  </button>
                )}
                <div className="spacer" />
                {!isFav && categories.length > 0 && (
                  <button
                    className="btn primary"
                    onClick={() =>
                      setForm({
                        name: '',
                        price: '',
                        category: isAll ? categories[0] : selected,
                      })
                    }
                  >
                    {t('addProduct')}
                  </button>
                )}
              </div>

              {shown.length === 0 ? (
                <div className="empty">{isFav ? t('favEmpty') : t('emptyCategory')}</div>
              ) : (
                <div className="prod-list">
                  {shown.map((p) => (
                    <div
                      key={p.id}
                      className="prod-row"
                      onClick={() =>
                        setForm({
                          id: p.id,
                          name: p.name,
                          price: p.price.toFixed(2),
                          category: p.category,
                        })
                      }
                    >
                      <button
                        className={'star-btn' + (p.favorite ? ' on' : '')}
                        aria-label="favorite"
                        onClick={(e) => {
                          e.stopPropagation()
                          dispatch({ type: 'toggleFavorite', id: p.id })
                        }}
                      >
                        {p.favorite ? '★' : '☆'}
                      </button>
                      <span className="name">{p.name}</span>
                      <span className="price">{fmtEur(p.price)}</span>
                      <span className="chev">›</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      </div>

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
              {form.id && (
                <ConfirmButton
                  label={t('delete')}
                  onConfirm={() => {
                    dispatch({ type: 'deleteProduct', id: form.id! })
                    setForm(null)
                  }}
                />
              )}
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
