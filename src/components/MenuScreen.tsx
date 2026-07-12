import { useEffect, useRef, useState } from 'react'
import type { Category, Product } from '../types'
import { fmtEur, sortProducts } from '../types'
import type { Action } from '../state'
import { useT } from '../i18n'
import { GripIcon, TrashIcon } from '../icons'
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

/** Sentinel for the virtual "All products" category in the sidebar. */
const ALL = '__all__'

export default function MenuScreen({ products, categories, dispatch }: Props) {
  const t = useT()
  const [form, setForm] = useState<FormState | null>(null)
  const [editingCat, setEditingCat] = useState<Category | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [selected, setSelected] = useState<Category>(ALL)

  // Keep a valid category selected as the list changes.
  useEffect(() => {
    if (selected !== ALL && !categories.includes(selected) && categories.length > 0) {
      setSelected(categories[0])
    }
  }, [categories, selected])

  const isAll = selected === ALL
  const shown = isAll
    ? sortProducts(products)
    : sortProducts(products.filter((p) => p.category === selected))

  const parsedPrice = form ? parseFloat(form.price.replace(',', '.')) : NaN
  const formValid =
    form !== null && form.name.trim() !== '' && isFinite(parsedPrice) && parsedPrice >= 0

  function save() {
    if (!form || !formValid) return
    const name = form.name.trim()
    if (form.id) {
      dispatch({
        type: 'updateProduct',
        product: {
          id: form.id,
          name,
          price: parsedPrice,
          category: form.category,
        },
      })
    } else {
      dispatch({ type: 'addProduct', name, price: parsedPrice, category: form.category })
    }
    setForm(null)
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
          {categories.map((cat) => (
            <button
              key={cat}
              className={'menu-cat' + (cat === selected ? ' on' : '')}
              onClick={() => setSelected(cat)}
            >
              {cat}
            </button>
          ))}
          <button className="menu-cat add" onClick={() => setEditorOpen(true)}>
            {t('editCategories')}
          </button>
        </aside>

        <section className="menu-detail">
          {categories.length === 0 && !isAll ? (
            <div className="empty">{t('emptyCategory')}</div>
          ) : (
            <>
              <div className="detail-head">
                {isAll ? (
                  <h2>{t('allProducts')}</h2>
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
                {categories.length > 0 && (
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
                <div className="empty">{t('emptyCategory')}</div>
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

      {editorOpen && (
        <CategoryEditor
          categories={categories}
          products={products}
          dispatch={dispatch}
          onClose={() => setEditorOpen(false)}
        />
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

/** Drag-to-reorder, rename, delete and add categories in one place. */
function CategoryEditor({
  categories,
  products,
  dispatch,
  onClose,
}: {
  categories: Category[]
  products: Product[]
  dispatch: React.Dispatch<Action>
  onClose: () => void
}) {
  const t = useT()
  const [newName, setNewName] = useState('')
  const [dragCat, setDragCat] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  function add() {
    const name = newName.trim()
    if (name) dispatch({ type: 'addCategory', name })
    setNewName('')
  }

  function startDrag(cat: string, e: React.PointerEvent) {
    e.preventDefault()
    setDragCat(cat)
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  // While dragging, step the held category one slot toward the pointer.
  function onPointerMove(e: React.PointerEvent) {
    if (!dragCat || !listRef.current) return
    const rows = [...listRef.current.querySelectorAll<HTMLElement>('.cat-edit-row')]
    const idx = categories.indexOf(dragCat)
    if (idx < 0) return
    const y = e.clientY
    const below = rows[idx + 1]?.getBoundingClientRect()
    const above = rows[idx - 1]?.getBoundingClientRect()
    if (below && y > below.top + below.height / 2) {
      dispatch({ type: 'moveCategory', name: dragCat, dir: 1 })
    } else if (above && y < above.top + above.height / 2) {
      dispatch({ type: 'moveCategory', name: dragCat, dir: -1 })
    }
  }

  function endDrag(e: React.PointerEvent) {
    setDragCat(null)
    try {
      ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {
      /* pointer already released */
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{t('editCategories')}</h3>

        <div
          className="cat-edit-list"
          ref={listRef}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
        >
          {categories.length === 0 ? (
            <div className="empty">{t('emptyCategory')}</div>
          ) : (
            categories.map((cat) => (
              <CategoryRow
                key={cat}
                cat={cat}
                count={products.filter((p) => p.category === cat).length}
                dragging={dragCat === cat}
                onGrip={(e) => startDrag(cat, e)}
                dispatch={dispatch}
              />
            ))
          )}
        </div>

        <div className="field cat-add">
          <label>{t('newCategory')}</label>
          <div className="cat-add-row">
            <input
              value={newName}
              placeholder={t('categoryName')}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && add()}
            />
            <button className="btn primary cat-btn" disabled={!newName.trim()} onClick={add}>
              {t('add')}
            </button>
          </div>
        </div>

        <button className="btn cat-btn cat-close" onClick={onClose}>
          {t('close')}
        </button>
      </div>
    </div>
  )
}

function CategoryRow({
  cat,
  count,
  dragging,
  onGrip,
  dispatch,
}: {
  cat: Category
  count: number
  dragging: boolean
  onGrip: (e: React.PointerEvent) => void
  dispatch: React.Dispatch<Action>
}) {
  const t = useT()
  const [name, setName] = useState(cat)

  useEffect(() => setName(cat), [cat])

  function commit() {
    const n = name.trim()
    if (n && n !== cat) dispatch({ type: 'renameCategory', oldName: cat, newName: n })
    else setName(cat)
  }

  return (
    <div className={'cat-edit-row' + (dragging ? ' dragging' : '')}>
      <span
        className="cat-grip"
        aria-label={t('dragToReorder')}
        onPointerDown={onGrip}
      >
        <GripIcon size={22} />
      </span>
      <input
        className="cat-edit-name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      />
      {count > 0 && <span className="cat-count">{count}</span>}
      <ConfirmButton
        className="cat-del"
        label={<TrashIcon size={18} />}
        armedLabel="✓"
        onConfirm={() => dispatch({ type: 'deleteCategory', name: cat })}
      />
    </div>
  )
}
