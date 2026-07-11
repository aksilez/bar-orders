import { useMemo, useState } from 'react'
import type { PaidOrder } from '../types'
import { fmtEur } from '../types'
import type { Action } from '../state'
import { localeOf, useLang, useT } from '../i18n'
import { TrashIcon } from '../icons'
import { getPin } from '../pin'
import ConfirmButton from './ConfirmButton'
import PinPad from './PinPad'

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
  const [pickedDay, setPickedDay] = useState('')

  const { start, end, date } = dayBounds(offset)
  const locale = localeOf(lang)

  const orders = history
    .filter((o) => o.paidAt >= start && o.paidAt < end)
    .sort((a, b) => b.paidAt - a.paidAt)
  const revenue = orders.reduce((sum, o) => sum + o.total, 0)

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
            setPickedDay('')
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
        </div>
        <div className="stat-card">
          <div className="label">{t('paidOrders')}</div>
          <div className="value">{orders.length}</div>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="empty">{t('noOrdersDay')}</div>
      ) : (
        orders.map((o) => (
          <div className="history-row" key={o.id}>
            <span className="time">
              {new Date(o.paidAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="table">{o.tableName}</span>
            <span className="items">{o.items.map((i) => `${i.qty}× ${i.name}`).join(', ')}</span>
            <span className="total">{fmtEur(o.total)}</span>
          </div>
        ))
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
                selected={pickedDay}
                onSelect={setPickedDay}
                locale={locale}
              />
            </div>
            <ConfirmButton
              label={t('deletePickedDay')}
              disabled={!pickedDay}
              onConfirm={() => {
                const b = isoDayBounds(pickedDay)
                dispatch({ type: 'deleteHistoryRange', start: b.start, end: b.end })
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

function CalendarPicker({
  daysWithOrders,
  selected,
  onSelect,
  locale,
}: {
  daysWithOrders: Map<string, number>
  selected: string
  onSelect: (iso: string) => void
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
                'cal-day' + (hasOrders ? ' has-orders' : '') + (iso === selected ? ' selected' : '')
              }
              disabled={!hasOrders}
              onClick={() => onSelect(iso === selected ? '' : iso)}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function PinModal({ onSuccess, onClose }: { onSuccess: () => void; onClose: () => void }) {
  const t = useT()
  const [wrong, setWrong] = useState(false)
  const [resetKey, setResetKey] = useState(0)

  function onComplete(pin: string) {
    if (pin === getPin()) {
      onSuccess()
    } else {
      setWrong(true)
      window.setTimeout(() => {
        setWrong(false)
        setResetKey((k) => k + 1)
      }, 700)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal pin-modal" onClick={(e) => e.stopPropagation()}>
        <PinPad
          title={t('enterPin')}
          hint={wrong ? t('wrongPin') : undefined}
          wrong={wrong}
          resetKey={resetKey}
          onComplete={onComplete}
        />
        <div className="modal-actions">
          <div className="spacer" />
          <button className="btn" onClick={onClose}>
            {t('cancel')}
          </button>
        </div>
      </div>
    </div>
  )
}
