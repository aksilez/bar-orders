import { useEffect, useState } from 'react'
import type { Category, OrderItem, Product, Table } from '../types'
import { fmtEur, orderTotal, sortProducts, uid } from '../types'
import type { Action } from '../state'
import { useT } from '../i18n'
import { SelectIcon } from '../icons'
import ConfirmButton from './ConfirmButton'
import ScrollBox from './ScrollBox'
import TablePickerModal from './TablePickerModal'

export interface PaidInfo {
  paidId: string
  tableName: string
  total: number
}

interface Props {
  table: Table
  /** All tables (both areas) — used to pick a destination when moving items. */
  allTables: Table[]
  products: Product[]
  categories: Category[]
  dispatch: React.Dispatch<Action>
  onClose: () => void
  onPaid: (info: PaidInfo) => void
}

/** Sentinel tab id for the favorites tab in the product picker. */
const FAV = '__fav__'

export default function OrderScreen({
  table,
  allTables,
  products,
  categories,
  dispatch,
  onClose,
  onPaid,
}: Props) {
  const t = useT()
  const cats = categories.filter((c) => products.some((p) => p.category === c))
  const favorites = sortProducts(products.filter((p) => p.favorite))
  const [cat, setCat] = useState<Category>(() => (favorites.length > 0 ? FAV : cats[0] ?? ''))
  const [confirmPay, setConfirmPay] = useState(false)
  const [moveMode, setMoveMode] = useState(false)
  // productId -> quantity to move (0 = not present). Defaults to the full
  // quantity when a row is first selected — tap the stepper to move fewer.
  const [moveQty, setMoveQty] = useState<Map<string, number>>(new Map())
  const [confirmPaySel, setConfirmPaySel] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)

  // Two-tap confirm for "Pay selected" — resets after 3 s, or if the selection changes.
  useEffect(() => {
    if (!confirmPaySel) return
    const id = window.setTimeout(() => setConfirmPaySel(false), 3000)
    return () => clearTimeout(id)
  }, [confirmPaySel])
  useEffect(() => {
    setConfirmPaySel(false)
  }, [moveQty])

  // Keep a valid tab selected if the lists change.
  useEffect(() => {
    const valid = cat === FAV ? favorites.length > 0 : cats.includes(cat)
    if (!valid) setCat(favorites.length > 0 ? FAV : cats[0] ?? '')
  }, [cats, cat, favorites.length])

  const shownProducts =
    cat === FAV ? favorites : sortProducts(products.filter((p) => p.category === cat))

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

  function startMove() {
    setMoveMode(true)
    setMoveQty(new Map())
  }

  function cancelMove() {
    setMoveMode(false)
    setMoveQty(new Map())
    setPickerOpen(false)
  }

  function toggleSelect(item: OrderItem) {
    setMoveQty((prev) => {
      const next = new Map(prev)
      if (next.has(item.productId)) next.delete(item.productId)
      else next.set(item.productId, item.qty) // select the full line by default
      return next
    })
  }

  function adjustSelectedQty(item: OrderItem, delta: number) {
    setMoveQty((prev) => {
      const next = new Map(prev)
      const current = next.get(item.productId) ?? 0
      const clamped = Math.max(0, Math.min(current + delta, item.qty))
      if (clamped === 0) next.delete(item.productId)
      else next.set(item.productId, clamped)
      return next
    })
  }

  const fullySelected =
    table.order.length > 0 && table.order.every((i) => moveQty.get(i.productId) === i.qty)

  function toggleSelectAll() {
    setMoveQty(fullySelected ? new Map() : new Map(table.order.map((i) => [i.productId, i.qty])))
  }

  const totalSelectedUnits = [...moveQty.values()].reduce((sum, n) => sum + n, 0)
  const selectedTotal = table.order.reduce(
    (sum, i) => sum + (moveQty.get(i.productId) ?? 0) * i.price,
    0
  )

  function onPickDestination(toTableId: string) {
    dispatch({
      type: 'moveItems',
      fromTableId: table.id,
      toTableId,
      items: [...moveQty.entries()].map(([productId, qty]) => ({ productId, qty })),
    })
    cancelMove()
    onClose()
  }

  function paySelected() {
    if (!confirmPaySel) {
      setConfirmPaySel(true)
      return
    }
    const paidId = uid()
    dispatch({
      type: 'payItems',
      tableId: table.id,
      paidId,
      items: [...moveQty.entries()].map(([productId, qty]) => ({ productId, qty })),
    })
    onPaid({ paidId, tableName: table.name, total: selectedTotal })
    cancelMove()
    onClose()
  }

  const otherTables = allTables.filter((tb) => tb.id !== table.id)

  return (
    <div className="order-screen">
      <header className="order-header">
        <h2>{table.name}</h2>
        <div className="header-actions">
          {!moveMode && table.order.length > 0 && (
            <button className="btn" onClick={startMove}>
              <SelectIcon size={18} /> {t('moveItems')}
            </button>
          )}
          <button className="btn ok" onClick={onClose}>
            ✓ {t('confirm')}
          </button>
        </div>
      </header>

      <div className="order-body">
        <section className="order-left">
          {moveMode && <p className="hint move-hint">{t('moveHint')}</p>}
          <ScrollBox>
            {table.order.length === 0 ? (
              <div className="empty">{t('noItems')}</div>
            ) : moveMode ? (
              table.order.map((item) => {
                const sel = moveQty.get(item.productId) ?? 0
                const isSelected = sel > 0
                return (
                  <div
                    className={'order-item move-row' + (isSelected ? ' selected' : '')}
                    key={item.productId}
                    onClick={() => toggleSelect(item)}
                  >
                    <span className={'move-check' + (isSelected ? ' on' : '')}>
                      {isSelected && '✓'}
                    </span>
                    <div className="item-info">
                      <span className="item-name">{item.name}</span>
                      <span className="item-unit">
                        {item.qty} × {fmtEur(item.price)}
                      </span>
                    </div>
                    {isSelected && item.qty > 1 ? (
                      <div className="move-stepper" onClick={(e) => e.stopPropagation()}>
                        <button className="move-step-btn" onClick={() => adjustSelectedQty(item, -1)}>
                          −
                        </button>
                        <span className="move-step-val">{sel}</span>
                        <button className="move-step-btn" onClick={() => adjustSelectedQty(item, 1)}>
                          +
                        </button>
                      </div>
                    ) : (
                      <span className="line-total">{fmtEur(item.price * item.qty)}</span>
                    )}
                  </div>
                )
              })
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
          </ScrollBox>
          {moveMode ? (
            <footer className="order-footer move-footer">
              <button className="btn" onClick={toggleSelectAll}>
                {fullySelected ? t('clearSelection') : t('selectAll')}
              </button>
              <button
                className={'btn pay' + (confirmPaySel ? ' confirm' : '')}
                disabled={totalSelectedUnits === 0}
                onClick={paySelected}
              >
                {confirmPaySel ? t('tapAgainPay') : t('paySelected', fmtEur(selectedTotal))}
              </button>
              <div className="move-footer-actions">
                <button className="btn" onClick={cancelMove}>
                  {t('cancel')}
                </button>
                <button
                  className="btn primary"
                  disabled={totalSelectedUnits === 0}
                  onClick={() => setPickerOpen(true)}
                >
                  {t('moveSelected', String(totalSelectedUnits))}
                </button>
              </div>
            </footer>
          ) : (
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
          )}
        </section>

        <section className="product-picker">
          <div className="cat-tabs">
            {favorites.length > 0 && (
              <button
                className={'cat-tab fav' + (cat === FAV ? ' active' : '')}
                aria-label={t('favorites')}
                onClick={() => setCat(FAV)}
              >
                ★
              </button>
            )}
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
            {shownProducts.map((p) => (
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

      {pickerOpen && (
        <TablePickerModal
          tables={otherTables}
          onPick={onPickDestination}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  )
}
