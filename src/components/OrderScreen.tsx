import { useEffect, useState } from 'react'
import type { Category, Product, Table } from '../types'
import { fmtEur, orderTotal, sortProducts, uid } from '../types'
import type { Action } from '../state'
import { useT } from '../i18n'
import ConfirmButton from './ConfirmButton'

export interface PaidInfo {
  paidId: string
  tableName: string
  total: number
}

interface Props {
  table: Table
  products: Product[]
  categories: Category[]
  dispatch: React.Dispatch<Action>
  onClose: () => void
  onPaid: (info: PaidInfo) => void
}

export default function OrderScreen({ table, products, categories, dispatch, onClose, onPaid }: Props) {
  const t = useT()
  const cats = categories.filter((c) => products.some((p) => p.category === c))
  const [cat, setCat] = useState<Category>(cats[0] ?? '')
  const [confirmPay, setConfirmPay] = useState(false)

  // Keep a valid category selected if the list changes.
  useEffect(() => {
    if (!cats.includes(cat) && cats.length > 0) setCat(cats[0])
  }, [cats, cat])

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
    const paidId = uid()
    dispatch({ type: 'markPaid', tableId: table.id, paidId })
    onPaid({ paidId, tableName: table.name, total })
    onClose()
  }

  return (
    <div className="order-screen">
      <header className="order-header">
        <h2>{table.name}</h2>
        <button className="btn ok" onClick={onClose}>
          ✓ {t('confirm')}
        </button>
      </header>

      <div className="order-body">
        <section className="order-left">
          <div className="order-items">
            {table.order.length === 0 ? (
              <div className="empty">{t('noItems')}</div>
            ) : (
              table.order.map((item) => (
                <div className="order-item" key={item.productId}>
                  <div className="item-info">
                    <span className="item-name">{item.name}</span>
                    <span className="item-unit">
                      {fmtEur(item.price)} {t('each')}
                    </span>
                  </div>
                  {item.qty === 1 ? (
                    <ConfirmButton
                      className="qty-btn"
                      label="−"
                      armedLabel="✓"
                      onConfirm={() =>
                        dispatch({ type: 'removeItem', tableId: table.id, productId: item.productId })
                      }
                    />
                  ) : (
                    <button
                      className="qty-btn"
                      onClick={() =>
                        dispatch({ type: 'decItem', tableId: table.id, productId: item.productId })
                      }
                    >
                      −
                    </button>
                  )}
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
                  <ConfirmButton
                    className="remove-btn"
                    label="✕"
                    armedLabel="✓"
                    onConfirm={() =>
                      dispatch({ type: 'removeItem', tableId: table.id, productId: item.productId })
                    }
                  />
                </div>
              ))
            )}
          </div>
          <footer className="order-footer">
            <div className="order-total">
              <span>{t('total')}</span>
              <strong>{fmtEur(total)}</strong>
            </div>
            <button
              className={'btn pay' + (confirmPay ? ' confirm' : '')}
              disabled={table.order.length === 0}
              onClick={onPay}
            >
              {confirmPay ? t('tapAgainPay') : t('markPaid')}
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
            {sortProducts(products.filter((p) => p.category === cat)).map((p) => (
              <button
                key={p.id}
                className="product-btn"
                onClick={() => dispatch({ type: 'addItem', tableId: table.id, product: p })}
              >
                {p.favorite && <span className="fav-star">★</span>}
                <span>{p.name}</span>
                <span className="price">{fmtEur(p.price)}</span>
              </button>
            ))}
            {products.length === 0 && <div className="empty">{t('noProducts')}</div>}
          </div>
        </section>
      </div>
    </div>
  )
}
