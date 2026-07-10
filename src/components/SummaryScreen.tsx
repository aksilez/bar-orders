import { useState } from 'react'
import type { PaidOrder } from '../types'
import { fmtEur } from '../types'
import type { Action } from '../state'
import { localeOf, useLang, useT } from '../i18n'
import { TrashIcon } from '../icons'

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
  const start = new Date(y, m - 1, d).getTime()
  const end = new Date(y, m - 1, d + 1).getTime()
  return { start, end }
}

export default function SummaryScreen({ history, dispatch }: Props) {
  const t = useT()
  const lang = useLang()
  const [offset, setOffset] = useState(0)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [pickedDay, setPickedDay] = useState('')

  const { start, end, date } = dayBounds(offset)

  const orders = history
    .filter((o) => o.paidAt >= start && o.paidAt < end)
    .sort((a, b) => b.paidAt - a.paidAt)
  const revenue = orders.reduce((sum, o) => sum + o.total, 0)

  const locale = localeOf(lang)
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

  function deleteShownDay() {
    if (window.confirm(t('confirmDeleteDay', dayLabel))) {
      dispatch({ type: 'deleteHistoryRange', start, end })
      setDeleteOpen(false)
    }
  }

  function deletePickedDay() {
    if (!pickedDay) return
    if (window.confirm(t('confirmDeleteDay', pickedDay))) {
      const b = isoDayBounds(pickedDay)
      dispatch({ type: 'deleteHistoryRange', start: b.start, end: b.end })
      setDeleteOpen(false)
    }
  }

  function deleteAll() {
    if (window.confirm(t('confirmDeleteAll'))) {
      dispatch({ type: 'deleteHistoryAll' })
      setDeleteOpen(false)
    }
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
            setPickedDay(isoDay(date))
            setDeleteOpen(true)
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

      {deleteOpen && (
        <div className="modal-backdrop" onClick={() => setDeleteOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{t('deleteHistory')}</h3>
            <button className="btn danger" disabled={orders.length === 0} onClick={deleteShownDay}>
              {t('deleteShownDay', dayLabel)}
            </button>
            <div className="field">
              <label>{t('pickDay')}</label>
              <input
                type="date"
                value={pickedDay}
                onChange={(e) => setPickedDay(e.target.value)}
              />
            </div>
            <button className="btn danger" disabled={!pickedDay} onClick={deletePickedDay}>
              {t('deletePickedDay')}
            </button>
            <button className="btn danger" onClick={deleteAll}>
              {t('deleteAllHistory')}
            </button>
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
