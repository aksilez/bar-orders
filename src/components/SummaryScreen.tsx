import { useMemo, useState, type ReactNode } from 'react'
import type { PaidOrder } from '../types'
import { fmtEur } from '../types'
import type { Action } from '../state'
import { localeOf, useLang, useT } from '../i18n'
import { CardIcon, CashIcon, TrashIcon } from '../icons'
import ConfirmButton from './ConfirmButton'
import PinModal from './PinModal'

interface Props {
  history: PaidOrder[]
  dispatch: React.Dispatch<Action>
}

function dayBounds(offset: number): { start: number; end: number; date: Date } {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + offset)
  const end = new Date(d)
  end.setDate(end.getDate() + 1)
  return { start: d.getTime(), end: end.getTime(), date: d }
}

function isoDay(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function isoDayBounds(iso: string): { start: number; end: number } {
  const [y, m, d] = iso.split('-').map(Number)
  return { start: new Date(y, m - 1, d).getTime(), end: new Date(y, m - 1, d + 1).getTime() }
}

export default function SummaryScreen({ history, dispatch }: Props) {
  const t = useT()
  const lang = useLang()
  const [offset, setOffset] = useState(0)
  const [pinOpen, setPinOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [pickedDays, setPickedDays] = useState<string[]>([])
  const [filter, setFilter] = useState<'all' | 'cash' | 'card'>('all')
  const [tableFilter, setTableFilter] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const { start, end, date } = dayBounds(offset)
  const locale = localeOf(lang)

  const dayOrders = history
    .filter((o) => o.paidAt >= start && o.paidAt < end)
    .sort((a, b) => b.paidAt - a.paidAt)
  const cashRevenue = dayOrders
    .filter((o) => o.method === 'cash')
    .reduce((sum, o) => sum + o.total, 0)
  const cardRevenue = dayOrders
    .filter((o) => o.method === 'card')
    .reduce((sum, o) => sum + o.total, 0)

  // Distinct table names present today, for the table filter dropdown.
  const tableNames = [...new Set(dayOrders.map((o) => o.tableName))].sort((a, b) =>
    a.localeCompare(b)
  )

  // The method and table filters narrow the visible list and the stat cards.
  const orders = dayOrders.filter(
    (o) =>
      (filter === 'all' || o.method === filter) &&
      (tableFilter === '' || o.tableName === tableFilter)
  )
  const revenue = orders.reduce((sum, o) => sum + o.total, 0)
  const tipsTotal = orders.reduce((sum, o) => sum + (o.tip ?? 0), 0)

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Days that actually have orders — only these are tappable in the calendar.
  const daysWithOrders = useMemo(() => {
    const byDay = new Map<string, number>()
    for (const o of history) {
      const key = isoDay(new Date(o.paidAt))
      byDay.set(key, (byDay.get(key) ?? 0) + 1)
    }
    return byDay
  }, [history])

  const dayLabel =
    offset === 0
      ? t('today')
      : offset === -1
        ? t('yesterday')
        : date.toLocaleDateString(locale, {
            weekday: 'short',
            day: 'numeric',
            month: 'numeric',
            year: 'numeric',
          })

  return (
    <div className="screen">
      <div className="screen-header">
        <div className="day-nav">
          <button className="btn" onClick={() => setOffset(offset - 1)} aria-label="Previous day">
            ‹
          </button>
          <h2 className="day-label">{dayLabel}</h2>
          <button
            className="btn"
            disabled={offset === 0}
            onClick={() => setOffset(offset + 1)}
            aria-label="Next day"
          >
            ›
          </button>
        </div>
        <button
          className="btn icon danger"
          aria-label={t('deleteHistory')}
          disabled={history.length === 0}
          onClick={() => {
            setPickedDays([])
            setPinOpen(true)
          }}
        >
          <TrashIcon />
        </button>
      </div>

      <div className="stats">
        <div className="stat-card">
          <div className="label">{t('revenue')}</div>
          <div className="value">{fmtEur(revenue)}</div>
          {filter === 'all' && tableFilter === '' && revenue > 0 && (cashRevenue > 0 || cardRevenue > 0) && (
            <div className="stat-split">
              <span>
                <CashIcon size={14} /> {fmtEur(cashRevenue)}
              </span>
              <span>
                <CardIcon size={14} /> {fmtEur(cardRevenue)}
              </span>
            </div>
          )}
        </div>
        <div className="stat-card">
          <div className="label">{t('paidOrders')}</div>
          <div className="value">{orders.length}</div>
          {tipsTotal > 0 && (
            <div className="stat-split">
              <span className="tip-stat">
                <CashIcon size={14} /> {t('tips')} {fmtEur(tipsTotal)}
              </span>
            </div>
          )}
        </div>
      </div>

      {dayOrders.length > 0 && (
        <div className="filter-row">
          <FilterDropdown
            value={tableFilter}
            onChange={setTableFilter}
            options={[
              { value: '', label: t('allTables') },
              ...tableNames.map((name) => ({ value: name, label: name })),
            ]}
          />
          <FilterDropdown
            value={filter}
            onChange={(v) => setFilter(v as 'all' | 'cash' | 'card')}
            options={[
              { value: 'all', label: t('allMethods') },
              {
                value: 'cash',
                label: (
                  <>
                    <CashIcon size={16} /> {t('payCash')}
                  </>
                ),
              },
              {
                value: 'card',
                label: (
                  <>
                    <CardIcon size={16} /> {t('payCard')}
                  </>
                ),
              },
            ]}
          />
        </div>
      )}

      {orders.length === 0 ? (
        <div className="empty">{t('noOrdersDay')}</div>
      ) : (
        orders.map((o) => {
          const isOpen = expanded.has(o.id)
          return (
            <div className={'history-item' + (isOpen ? ' open' : '')} key={o.id}>
              <div className="history-row" onClick={() => toggleExpanded(o.id)}>
                <span className="time">
                  {new Date(o.paidAt).toLocaleTimeString(locale, {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <span className="table">{o.tableName}</span>
                <span className="items">
                  {o.items.map((i) => `${i.qty}× ${i.name}`).join(', ')}
                </span>
                <span
                  className={'pay-badge' + (o.method ? ' ' + o.method : '')}
                  title={o.method ? t(o.method === 'cash' ? 'paidCash' : 'paidCard') : undefined}
                >
                  {o.method === 'cash' ? (
                    <CashIcon size={16} />
                  ) : o.method === 'card' ? (
                    <CardIcon size={16} />
                  ) : null}
                </span>
                <span className="total">{fmtEur(o.total)}</span>
                <span className="row-chev" aria-hidden="true">
                  ›
                </span>
              </div>
              {isOpen && (
                <div className="history-detail">
                  {o.items.map((i) => (
                    <div className="detail-line" key={i.productId}>
                      <span className="dl-qty">{i.qty}×</span>
                      <span className="dl-name">{i.name}</span>
                      <span className="dl-unit">{fmtEur(i.price)}</span>
                      <span className="dl-price">{fmtEur(i.price * i.qty)}</span>
                    </div>
                  ))}
                  {o.tip ? (
                    <div className="detail-line tip-line">
                      <span className="dl-qty" aria-hidden="true">
                        <CashIcon size={14} />
                      </span>
                      <span className="dl-name">{t('tip')}</span>
                      <span className="dl-price">{fmtEur(o.tip)}</span>
                    </div>
                  ) : null}
                  <div className="detail-actions">
                    <ConfirmButton
                      className="btn danger detail-del"
                      label={
                        <>
                          <TrashIcon size={16} /> {t('deleteOrder')}
                        </>
                      }
                      onConfirm={() => dispatch({ type: 'deleteHistoryOrder', id: o.id })}
                    />
                  </div>
                </div>
              )}
            </div>
          )
        })
      )}

      {pinOpen && (
        <PinModal
          onSuccess={() => {
            setPinOpen(false)
            setDeleteOpen(true)
          }}
          onClose={() => setPinOpen(false)}
        />
      )}

      {deleteOpen && (
        <div className="modal-backdrop" onClick={() => setDeleteOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{t('deleteHistory')}</h3>
            <ConfirmButton
              label={t('deleteShownDay', dayLabel)}
              disabled={orders.length === 0}
              onConfirm={() => {
                dispatch({ type: 'deleteHistoryRange', start, end })
                setDeleteOpen(false)
              }}
            />
            <div className="field">
              <label>{t('pickDay')}</label>
              <CalendarPicker
                daysWithOrders={daysWithOrders}
                selected={pickedDays}
                onToggle={(iso) =>
                  setPickedDays((prev) =>
                    prev.includes(iso) ? prev.filter((d) => d !== iso) : [...prev, iso]
                  )
                }
                locale={locale}
              />
            </div>
            <ConfirmButton
              label={
                pickedDays.length > 1
                  ? t('deletePickedDays', String(pickedDays.length))
                  : t('deletePickedDay')
              }
              disabled={pickedDays.length === 0}
              onConfirm={() => {
                for (const iso of pickedDays) {
                  const b = isoDayBounds(iso)
                  dispatch({ type: 'deleteHistoryRange', start: b.start, end: b.end })
                }
                setDeleteOpen(false)
              }}
            />
            <ConfirmButton
              label={t('deleteAllHistory')}
              onConfirm={() => {
                dispatch({ type: 'deleteHistoryAll' })
                setDeleteOpen(false)
              }}
            />
            <div className="modal-actions">
              <div className="spacer" />
              <button className="btn" onClick={() => setDeleteOpen(false)}>
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface Option {
  value: string
  label: ReactNode
}

/** Compact styled dropdown used for the Summary filters (table / method). */
function FilterDropdown({
  value,
  options,
  onChange,
}: {
  value: string
  options: Option[]
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const current = options.find((o) => o.value === value) ?? options[0]

  return (
    <div className="fdrop">
      <button className="fdrop-btn" onClick={() => setOpen((o) => !o)}>
        <span className="fdrop-label">{current.label}</span>
        <span className={'fdrop-chev' + (open ? ' open' : '')} aria-hidden="true">
          ›
        </span>
      </button>
      {open && (
        <>
          <div className="fdrop-backdrop" onClick={() => setOpen(false)} />
          <div className="fdrop-menu">
            {options.map((o) => (
              <button
                key={o.value}
                className={'fdrop-item' + (o.value === value ? ' active' : '')}
                onClick={() => {
                  onChange(o.value)
                  setOpen(false)
                }}
              >
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function CalendarPicker({
  daysWithOrders,
  selected,
  onToggle,
  locale,
}: {
  daysWithOrders: Map<string, number>
  selected: string[]
  onToggle: (iso: string) => void
  locale: string
}) {
  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())

  const first = new Date(viewYear, viewMonth, 1)
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const leadingBlanks = (first.getDay() + 6) % 7 // Monday-first
  const isCurrentYear = viewYear >= now.getFullYear()
  // don't let the month arrow jump into a future month within the current year
  const nextMonthInFuture = viewYear === now.getFullYear() && viewMonth >= now.getMonth()

  // Monday-first weekday labels in the active language (2024-01-01 was a Monday).
  const dowLabels = Array.from({ length: 7 }, (_, i) =>
    new Date(2024, 0, 1 + i).toLocaleDateString(locale, { weekday: 'short' })
  )

  function shiftMonth(delta: number) {
    const d = new Date(viewYear, viewMonth + delta, 1)
    setViewYear(d.getFullYear())
    setViewMonth(d.getMonth())
  }

  function shiftYear(delta: number) {
    let y = viewYear + delta
    let m = viewMonth
    // clamp so we never land in a future month
    if (y > now.getFullYear()) {
      y = now.getFullYear()
      m = now.getMonth()
    } else if (y === now.getFullYear() && m > now.getMonth()) {
      m = now.getMonth()
    }
    setViewYear(y)
    setViewMonth(m)
  }

  return (
    <div className="calendar">
      <div className="cal-header">
        <button className="btn small" onClick={() => shiftYear(-1)} aria-label="Previous year">
          ‹‹
        </button>
        <button className="btn small" onClick={() => shiftMonth(-1)} aria-label="Previous month">
          ‹
        </button>
        <span className="cal-title">
          {first.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
        </span>
        <button
          className="btn small"
          disabled={nextMonthInFuture}
          onClick={() => shiftMonth(1)}
          aria-label="Next month"
        >
          ›
        </button>
        <button
          className="btn small"
          disabled={isCurrentYear}
          onClick={() => shiftYear(1)}
          aria-label="Next year"
        >
          ››
        </button>
      </div>
      <div className="cal-grid">
        {dowLabels.map((label, i) => (
          <span key={'dow' + i} className="cal-dow">
            {label}
          </span>
        ))}
        {Array.from({ length: leadingBlanks }, (_, i) => (
          <span key={'blank' + i} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1
          const iso = isoDay(new Date(viewYear, viewMonth, day))
          const hasOrders = daysWithOrders.has(iso)
          return (
            <button
              key={iso}
              className={
                'cal-day' +
                (hasOrders ? ' has-orders' : '') +
                (selected.includes(iso) ? ' selected' : '')
              }
              disabled={!hasOrders}
              onClick={() => onToggle(iso)}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}

