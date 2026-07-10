import { useState } from 'react'
import type { PaidOrder } from '../types'
import { fmtEur } from '../types'
import { exportDayCsv } from '../csv'

interface Props {
  history: PaidOrder[]
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

export default function SummaryScreen({ history }: Props) {
  const [offset, setOffset] = useState(0)
  const { start, end, date } = dayBounds(offset)

  const orders = history
    .filter((o) => o.paidAt >= start && o.paidAt < end)
    .sort((a, b) => b.paidAt - a.paidAt)
  const revenue = orders.reduce((sum, o) => sum + o.total, 0)

  const dayLabel =
    offset === 0
      ? 'Today'
      : offset === -1
        ? 'Yesterday'
        : date.toLocaleDateString('sk-SK', { weekday: 'short', day: 'numeric', month: 'numeric', year: 'numeric' })

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
          className="btn"
          disabled={orders.length === 0}
          onClick={() => exportDayCsv([...orders].reverse(), isoDay(date))}
        >
          ⬇ Export CSV
        </button>
      </div>

      <div className="stats">
        <div className="stat-card">
          <div className="label">Revenue</div>
          <div className="value">{fmtEur(revenue)}</div>
        </div>
        <div className="stat-card">
          <div className="label">Paid orders</div>
          <div className="value">{orders.length}</div>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="empty">No paid orders on this day.</div>
      ) : (
        orders.map((o) => (
          <div className="history-row" key={o.id}>
            <span className="time">
              {new Date(o.paidAt).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="table">{o.tableName}</span>
            <span className="items">
              {o.items.map((i) => `${i.qty}× ${i.name}`).join(', ')}
            </span>
            <span className="total">{fmtEur(o.total)}</span>
          </div>
        ))
      )}
    </div>
  )
}
