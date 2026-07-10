import { useState } from 'react'
import type { Category, Product } from '../types'
import { CATEGORIES, fmtEur } from '../types'
import type { Action } from '../state'

interface Props {
  products: Product[]
  dispatch: React.Dispatch<Action>
}

interface FormState {
  id?: string
  name: string
  price: string
  category: Category
}

export default function MenuScreen({ products, dispatch }: Props) {
  const [form, setForm] = useState<FormState | null>(null)

  const parsedPrice = form ? parseFloat(form.price.replace(',', '.')) : NaN
  const formValid = form !== null && form.name.trim() !== '' && isFinite(parsedPrice) && parsedPrice >= 0

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
    if (window.confirm(`Delete “${p.name}” from the menu?`)) {
      dispatch({ type: 'deleteProduct', id: p.id })
    }
  }

  return (
    <div className="screen">
      <div className="screen-header">
        <h2>Menu</h2>
        <button
          className="btn primary"
          onClick={() => setForm({ name: '', price: '', category: 'Beer' })}
        >
          + Add product
        </button>
      </div>

      {products.length === 0 && <div className="empty">No products yet.</div>}

      {CATEGORIES.map((cat) => {
        const inCat = products.filter((p) => p.category === cat)
        if (inCat.length === 0) return null
        return (
          <section key={cat} className="cat-section">
            <h3>{cat}</h3>
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
                  Edit
                </button>
                <button className="btn danger" onClick={() => remove(p)}>
                  Delete
                </button>
              </div>
            ))}
          </section>
        )
      })}

      {form && (
        <div className="modal-backdrop" onClick={() => setForm(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{form.id ? 'Edit product' : 'New product'}</h3>
            <div className="field">
              <label>Name</label>
              <input
                value={form.name}
                autoFocus
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Price (€)</label>
              <input
                value={form.price}
                inputMode="decimal"
                placeholder="0.00"
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as Category })}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setForm(null)}>
                Cancel
              </button>
              <button className="btn primary" disabled={!formValid} onClick={save}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
