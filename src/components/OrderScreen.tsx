import { useEffect, useState } from 'react'
import type { Category, Product, Table } from '../types'
import { CATEGORIES, fmtEur, orderTotal } from '../types'
import type { Action } from '../state'

interface Props {
  table: Table
  products: Product[]
  dispatch: React.Dispatch<Action>
  onClose: () => void
}

export default function OrderScreen({ table, products, dispatch, onClose }: Props) {
  const cats = CATEGORIES.filter((c) => products.some((p) => p.category === c))
  const [cat, setCat] = useState<Category>(cats[0] ?? CATEGORIES[0])
  const [confirmPay, setConfirmPay] = useState(false)

  // Two-tap confirmation for "Mark as paid" — resets itself after 3 s.
  useEffect(() => {
    if (!confirmPay) return
    const id = window.setTimeout(() => setConfirmPay(false), 3000)
    return () => clearTimeout(id)
  }, [confirmPay])

  const total = orderTotal(table.order)

  function onPay() {
    if (!confirmPay) {
      setConfirmPay(true)
      return
    }
    dispatch({ type: 'markPaid', tableId: table.id })
    onClose()
  }

  return (
    <div className="order-screen">
      <header className="order-header">
        <h2>{table.name}</h2>
        <button className="btn" onClick={onClose}>
          ✕ Close
        </button>
      </header>

      <div className="order-body">
        <section className="order-left">
          <div className="order-items">
            {table.order.length === 0 ? (
              <div className="empty">No items yet — tap a product on the right to add it.</div>
            ) : (
              table.order.map((item) => (
                <div className="order-item" key={item.productId}>
                  <div className="item-info">
                    <span className="item-name">{item.name}</span>
                    <span className="item-unit">{fmtEur(item.price)} each</span>
                  </div>
                  <button
                    className="qty-btn"
                    onClick={() =>
                      dispatch({ type: 'decItem', tableId: table.id, productId: item.productId })
                    }
                  >
                    −
                  </button>
                  <span className="qty">{item.qty}</span>
                  <button
                    className="qty-btn"
                    onClick={() =>
                      dispatch({ type: 'incItem', tableId: table.id, productId: item.productId })
                    }
                  >
                    +
                  </button>
                  <span className="line-total">{fmtEur(item.price * item.qty)}</span>
                  <button
                    className="remove-btn"
                    aria-label={`Remove ${item.name}`}
                    onClick={() =>
                      dispatch({ type: 'removeItem', tableId: table.id, productId: item.productId })
                    }
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
          <footer className="order-footer">
            <div className="order-total">
              <span>Total</span>
              <strong>{fmtEur(total)}</strong>
            </div>
            <button
              className={'btn pay' + (confirmPay ? ' confirm' : '')}
              disabled={table.order.length === 0}
              onClick={onPay}
            >
              {confirmPay ? 'Tap again to confirm payment' : 'Mark as paid'}
            </button>
          </footer>
        </section>

        <section className="product-picker">
          <div className="cat-tabs">
            {cats.map((c) => (
              <button
                key={c}
                className={'cat-tab' + (c === cat ? ' active' : '')}
                onClick={() => setCat(c)}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="product-grid">
            {products
              .filter((p) => p.category === cat)
              .map((p) => (
                <button
                  key={p.id}
                  className="product-btn"
                  onClick={() => dispatch({ type: 'addItem', tableId: table.id, product: p })}
                >
                  <span>{p.name}</span>
                  <span className="price">{fmtEur(p.price)}</span>
                </button>
              ))}
            {products.length === 0 && (
              <div className="empty">No products yet — add some in the Menu tab.</div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
