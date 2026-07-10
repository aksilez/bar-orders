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

  // Days that actually have orders — the native select pops the iOS wheel picker.
  const days = useMemo(() => {
    const byDay = new Map<string, number>()
    for (const o of history) {
      const key = isoDay(new Date(o.paidAt))
      byDay.set(key, (byDay.get(key) ?? 0) + 1)
    }
    return [...byDay.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1))
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

  function fmtIsoDay(iso: string): string {
    const [y, m, d] = iso.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString(locale, {
      weekday: 'short',
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    })
  }

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
            setPickedDay(days[0]?.[0] ?? '')
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
              <select value={pickedDay} onChange={(e) => setPickedDay(e.target.value)}>
                {days.map(([iso, count]) => (
                  <option key={iso} value={iso}>
                    {fmtIsoDay(iso)} · {t('ordersCount', String(count))}
                  </option>
                ))}
              </select>
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

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal pin-modal" onClick={(e) => e.stopPropagation()}>
        <h3>{t('enterPin')}</h3>
        <input
          className={'pin-input' + (wrong ? ' wrong' : '')}
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          autoFocus
          maxLength={4}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
        />
        <p className={'hint pin-hint' + (wrong ? ' wrong' : '')}>{wrong ? t('wrongPin') : ' '}</p>
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
