import { useEffect, useMemo, useState } from 'react'
import type { PaidOrder } from '../types'
import { fmtEur } from '../types'
import type { Action } from '../state'
import { localeOf, useLang, useT } from '../i18n'
import { TrashIcon } from '../icons'
import ConfirmButton from './ConfirmButton'

const HISTORY_PIN = '0000'

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
  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth()

  // Monday-first weekday labels in the active language (2024-01-01 was a Monday).
  const dowLabels = Array.from({ length: 7 }, (_, i) =>
    new Date(2024, 0, 1 + i).toLocaleDateString(locale, { weekday: 'short' })
  )

  function shiftMonth(delta: number) {
    const d = new Date(viewYear, viewMonth + delta, 1)
    setViewYear(d.getFullYear())
    setViewMonth(d.getMonth())
  }

  return (
    <div className="calendar">
      <div className="cal-header">
        <button className="btn small" onClick={() => shiftMonth(-1)} aria-label="Previous month">
          ‹
        </button>
        <span className="cal-title">
          {first.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
        </span>
        <button
          className="btn small"
          disabled={isCurrentMonth}
          onClick={() => shiftMonth(1)}
          aria-label="Next month"
        >
          ›
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
  const [pin, setPin] = useState('')
  const [wrong, setWrong] = useState(false)

  useEffect(() => {
    if (pin.length !== 4) return
    if (pin === HISTORY_PIN) {
      onSuccess()
    } else {
      setWrong(true)
      const id = window.setTimeout(() => {
        setPin('')
        setWrong(false)
      }, 700)
      return () => clearTimeout(id)
    }
  }, [pin, onSuccess])

  // In-app number pad instead of a text input: no iOS keyboard, no keychain
  // key icon, no autofill — nothing for the browser to remember.
  function press(digit: string) {
    if (wrong || pin.length >= 4) return
    setPin(pin + digit)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal pin-modal" onClick={(e) => e.stopPropagation()}>
        <h3>{t('enterPin')}</h3>
        <div className={'pin-dots' + (wrong ? ' wrong' : '')}>
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={'pin-dot' + (i < pin.length ? ' filled' : '')} />
          ))}
        </div>
        <p className={'hint pin-hint' + (wrong ? ' wrong' : '')}>{wrong ? t('wrongPin') : ' '}</p>
        <div className="pin-pad">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button key={d} className="pin-key" onClick={() => press(d)}>
              {d}
            </button>
          ))}
          <span />
          <button className="pin-key" onClick={() => press('0')}>
            0
          </button>
          <button
            className="pin-key backspace"
            aria-label="backspace"
            onClick={() => {
              // backspace during the "wrong" flash clears everything — otherwise
              // it would cancel the auto-reset timer and lock the pad
              setPin(wrong ? '' : pin.slice(0, -1))
              setWrong(false)
            }}
          >
            ⌫
          </button>
        </div>
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
