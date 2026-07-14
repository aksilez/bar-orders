import { useEffect, useRef, useState } from 'react'
import type { Category, OrderItem, PaymentMethod, Product, Table } from '../types'
import { fmtEur, orderTotal, sortProducts, uid } from '../types'
import type { Action } from '../state'
import { useT } from '../i18n'
import { BookmarkIcon, CardIcon, CashIcon, SearchIcon, SelectIcon, SplitIcon } from '../icons'
import ConfirmButton from './ConfirmButton'
import ScrollBox from './ScrollBox'
import TablePickerModal from './TablePickerModal'
import CashModal from './CashModal'
import CardModal from './CardModal'
import SplitModal from './SplitModal'
import TableStatusModal from './TableStatusModal'

/** Which pay flow is active — the whole tab or just the selected items. */
type PayScope = 'all' | 'selected'

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

/** Sentinel tab id for the virtual "All products" tab in the product picker. */
const ALL = '__all__'

/** Lowercases and strips diacritics so "boro" matches "Borovička". */
function norm(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

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
  const [cat, setCat] = useState<Category>(ALL)
  const [query, setQuery] = useState('')
  const [moveMode, setMoveMode] = useState(false)
  // productId -> quantity to move (0 = not present). Defaults to the full
  // quantity when a row is first selected — tap the stepper to move fewer.
  const [moveQty, setMoveQty] = useState<Map<string, number>>(new Map())
  const [pickerOpen, setPickerOpen] = useState(false)
  // Payment flow: first tap opens the cash/card choice; cash opens the modal.
  const [payChoosing, setPayChoosing] = useState<PayScope | null>(null)
  const [cashFor, setCashFor] = useState<PayScope | null>(null)
  const [cardFor, setCardFor] = useState<PayScope | null>(null)
  const [splitOpen, setSplitOpen] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)

  // A split table has named parts; otherwise the table has a single order.
  const isSplit = !!table.parts && table.parts.length > 0
  const [activePartId, setActivePartId] = useState<string | null>(table.parts?.[0]?.id ?? null)
  const activePart = isSplit
    ? table.parts!.find((p) => p.id === activePartId) ?? table.parts![0]
    : null
  const partId = activePart?.id
  const order = activePart ? activePart.order : table.order

  // Jump to a newly created part; fall back to the first if the active one was paid.
  const prevPartCount = useRef(table.parts?.length ?? 0)
  useEffect(() => {
    const count = table.parts?.length ?? 0
    if (count > prevPartCount.current && table.parts) {
      setActivePartId(table.parts[count - 1].id)
    } else if (isSplit && !table.parts!.some((p) => p.id === activePartId)) {
      setActivePartId(table.parts![0].id)
    }
    prevPartCount.current = count
  }, [table.parts, isSplit, activePartId])

  // Reset the payment choice if the selection changes underneath it.
  useEffect(() => {
    setPayChoosing(null)
  }, [moveQty])

  // Leaving move mode when switching parts avoids a stale selection.
  useEffect(() => {
    setMoveMode(false)
    setMoveQty(new Map())
    setPickerOpen(false)
  }, [activePartId])

  // Keep a valid tab selected if the lists change.
  useEffect(() => {
    const valid = cat === ALL ? products.length > 0 : cats.includes(cat)
    if (!valid) setCat(ALL)
  }, [cats, cat, products.length])

  // Searching always spans all categories so nobody has to switch tabs first.
  const q = norm(query.trim())
  const shownProducts = q
    ? sortProducts(products.filter((p) => norm(p.name).includes(q)))
    : cat === ALL
      ? sortProducts(products)
      : sortProducts(products.filter((p) => p.category === cat))

  const total = orderTotal(order)

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
      // an unselected row starts from its full quantity, so tapping − or +
      // selects it (steppers stay active on every row, like normal mode)
      const current = next.get(item.productId) ?? item.qty
      const clamped = Math.max(0, Math.min(current + delta, item.qty))
      if (clamped === 0) next.delete(item.productId)
      else next.set(item.productId, clamped)
      return next
    })
  }

  const fullySelected =
    order.length > 0 && order.every((i) => moveQty.get(i.productId) === i.qty)

  function toggleSelectAll() {
    setMoveQty(fullySelected ? new Map() : new Map(order.map((i) => [i.productId, i.qty])))
  }

  const totalSelectedUnits = [...moveQty.values()].reduce((sum, n) => sum + n, 0)
  const selectedTotal = order.reduce((sum, i) => sum + (moveQty.get(i.productId) ?? 0) * i.price, 0)

  const moveItems = () => [...moveQty.entries()].map(([productId, qty]) => ({ productId, qty }))

  function onPickTable(toTableId: string) {
    dispatch({
      type: 'moveItems',
      fromTableId: table.id,
      fromPartId: partId,
      toTableId,
      items: moveItems(),
    })
    cancelMove()
    onClose()
  }

  function onPickPart(toPartId: string) {
    dispatch({
      type: 'moveItems',
      fromTableId: table.id,
      fromPartId: partId,
      toTableId: table.id,
      toPartId,
      items: moveItems(),
    })
    cancelMove()
  }

  // Both methods open a modal — cash for change/tip, card for an optional tip.
  function chooseMethod(scope: PayScope, method: PaymentMethod) {
    setPayChoosing(null)
    if (method === 'card') setCardFor(scope)
    else setCashFor(scope)
  }

  function doPay(scope: PayScope, method: PaymentMethod, tip = 0) {
    const paidId = uid()
    const name = activePart ? activePart.name : table.name
    if (scope === 'all') {
      dispatch({ type: 'markPaid', tableId: table.id, paidId, method, tip, partId })
      onPaid({ paidId, tableName: name, total })
    } else {
      dispatch({
        type: 'payItems',
        tableId: table.id,
        paidId,
        method,
        tip,
        partId,
        items: moveItems(),
      })
      onPaid({ paidId, tableName: name, total: selectedTotal })
      cancelMove()
    }
    setCashFor(null)
    setCardFor(null)
    // For split tables, stay open so the remaining parts can be handled.
    if (!isSplit) onClose()
  }

  const otherTables = allTables.filter((tb) => tb.id !== table.id)
  const siblingParts = isSplit ? table.parts!.filter((p) => p.id !== partId) : []

  // Idle pay button, or — once tapped — a Cash / Card split.
  function payControls(scope: PayScope, idleLabel: string, disabled: boolean) {
    if (payChoosing === scope) {
      return (
        <div className="pay-split">
          <button className="btn pay-x" aria-label={t('cancel')} onClick={() => setPayChoosing(null)}>
            ✕
          </button>
          <button className="btn pay-cash" onClick={() => chooseMethod(scope, 'cash')}>
            <CashIcon size={18} /> {t('payCash')}
          </button>
          <button className="btn pay-card" onClick={() => chooseMethod(scope, 'card')}>
            <CardIcon size={18} /> {t('payCard')}
          </button>
        </div>
      )
    }
    return (
      <button
        className="btn pay"
        disabled={disabled}
        onClick={() => setPayChoosing(scope)}
      >
        {idleLabel}
      </button>
    )
  }

  return (
    <div className="order-screen">
      <header className="order-header">
        <div className="order-title">
          <h2>{table.name}</h2>
          {table.note && <span className="order-note">{table.note}</span>}
        </div>
        <div className="header-actions">
          {!moveMode && (
            <button
              className={'btn' + (table.reserved ? ' status-active' : '')}
              onClick={() => setStatusOpen(true)}
            >
              <BookmarkIcon size={18} /> {t('statusAction')}
            </button>
          )}
          {!moveMode && (
            <button className="btn" onClick={() => setSplitOpen(true)}>
              <SplitIcon size={18} /> {t('splitAction')}
            </button>
          )}
          {order.length > 0 &&
            (moveMode ? (
              <button className="btn" onClick={cancelMove}>
                {t('cancel')}
              </button>
            ) : (
              <button className="btn" onClick={startMove}>
                <SelectIcon size={18} /> {t('moveItems')}
              </button>
            ))}
          <button className="btn ok" onClick={onClose}>
            ✓ {t('confirm')}
          </button>
        </div>
      </header>

      <div className="order-body">
        <section className="order-left">
          {isSplit && (
            <div className="part-bar">
              <div className="part-tabs">
                {table.parts!.map((p) => (
                  <button
                    key={p.id}
                    className={'part-tab' + (p.id === partId ? ' active' : '')}
                    onClick={() => setActivePartId(p.id)}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
              <ConfirmButton
                className="part-merge"
                label={
                  <>
                    <SplitIcon size={16} /> {t('mergeShort')}
                  </>
                }
                onConfirm={() => dispatch({ type: 'unsplitTable', tableId: table.id })}
              />
            </div>
          )}
          <ScrollBox>
            {order.length === 0 ? (
              <div className="empty">{t('noItems')}</div>
            ) : moveMode ? (
              order.map((item) => {
                const sel = moveQty.get(item.productId) ?? 0
                const isSelected = sel > 0
                const shownQty = isSelected ? sel : item.qty
                return (
                  <div
                    className={'order-item move-row' + (isSelected ? ' selected' : '')}
                    key={item.productId}
                    onClick={() => toggleSelect(item)}
                  >
                    <div className="item-info">
                      <span className="item-name">{item.name}</span>
                      <span className="item-unit">
                        {fmtEur(item.price)} {t('each')}
                      </span>
                    </div>
                    <button
                      className="qty-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        adjustSelectedQty(item, -1)
                      }}
                    >
                      −
                    </button>
                    <span className="qty">{shownQty}</span>
                    <button
                      className="qty-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        adjustSelectedQty(item, 1)
                      }}
                    >
                      +
                    </button>
                    <span className="line-total">{fmtEur(item.price * shownQty)}</span>
                    <span className="remove-btn-spacer" aria-hidden="true" />
                  </div>
                )
              })
            ) : (
              order.map((item) => (
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
                        dispatch({ type: 'removeItem', tableId: table.id, productId: item.productId, partId })
                      }
                    />
                  ) : (
                    <button
                      className="qty-btn"
                      onClick={() =>
                        dispatch({ type: 'decItem', tableId: table.id, productId: item.productId, partId })
                      }
                    >
                      −
                    </button>
                  )}
                  <span className="qty">{item.qty}</span>
                  <button
                    className="qty-btn"
                    onClick={() =>
                      dispatch({ type: 'incItem', tableId: table.id, productId: item.productId, partId })
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
                      dispatch({ type: 'removeItem', tableId: table.id, productId: item.productId, partId })
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
                className="btn primary"
                disabled={totalSelectedUnits === 0}
                onClick={() => setPickerOpen(true)}
              >
                {t('moveSelected', String(totalSelectedUnits))}
              </button>
              {payControls(
                'selected',
                t('paySelected', fmtEur(selectedTotal)),
                totalSelectedUnits === 0
              )}
            </footer>
          ) : (
            <footer className="order-footer">
              <div className="order-total">
                <span>{t('total')}</span>
                <strong>{fmtEur(total)}</strong>
              </div>
              {payControls('all', t('markPaid'), order.length === 0)}
            </footer>
          )}
        </section>

        <section className="product-picker">
          <div className="product-search">
            <SearchIcon size={18} />
            <input
              value={query}
              placeholder={t('searchProducts')}
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              enterKeyHint="done"
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            />
            {query && (
              <button
                className="search-clear"
                aria-label={t('clearAmount')}
                onClick={() => setQuery('')}
              >
                ✕
              </button>
            )}
          </div>
          <div className="cat-tabs">
            <button
              className={'cat-tab' + (cat === ALL ? ' active' : '')}
              onClick={() => setCat(ALL)}
            >
              {t('allProducts')}
            </button>
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
                onClick={() => {
                  dispatch({ type: 'addItem', tableId: table.id, product: p, partId })
                  if (q) setQuery('') // found it — next search starts clean
                }}
              >
                <span>{p.name}</span>
                <span className="price">{fmtEur(p.price)}</span>
              </button>
            ))}
            {products.length === 0 && <div className="empty">{t('noProducts')}</div>}
            {products.length > 0 && q && shownProducts.length === 0 && (
              <div className="empty">{t('noSearchResults', query.trim())}</div>
            )}
          </div>
        </section>
      </div>

      {pickerOpen && (
        <TablePickerModal
          tables={otherTables}
          parts={siblingParts}
          onPickTable={onPickTable}
          onPickPart={onPickPart}
          onClose={() => setPickerOpen(false)}
        />
      )}

      {splitOpen && (
        <SplitModal table={table} dispatch={dispatch} onClose={() => setSplitOpen(false)} />
      )}

      {statusOpen && (
        <TableStatusModal table={table} dispatch={dispatch} onClose={() => setStatusOpen(false)} />
      )}

      {cashFor && (
        <CashModal
          total={cashFor === 'all' ? total : selectedTotal}
          onConfirm={(tip) => doPay(cashFor, 'cash', tip)}
          onClose={() => setCashFor(null)}
        />
      )}

      {cardFor && (
        <CardModal
          total={cardFor === 'all' ? total : selectedTotal}
          onConfirm={(tip) => doPay(cardFor, 'card', tip)}
          onClose={() => setCardFor(null)}
        />
      )}
    </div>
  )
}
