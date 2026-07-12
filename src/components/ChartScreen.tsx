import { useMemo, useState } from 'react'
import type { PaidOrder } from '../types'
import { fmtEur } from '../types'
import { localeOf, useLang, useT } from '../i18n'
import { CardIcon, CashIcon } from '../icons'

interface Props {
  history: PaidOrder[]
}

type Period = 'week' | 'month' | 'year'
type YearBy = 'months' | 'weeks'
type Filter = 'all' | 'cash' | 'card' | 'tip'

interface Bucket {
  label: string
  full: string
  start: number
  end: number
}

function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

/** Monday-first start of the week containing d. */
function startOfWeek(d: Date): Date {
  const x = startOfDay(d)
  const dow = (x.getDay() + 6) % 7
  x.setDate(x.getDate() - dow)
  return x
}

function buildBuckets(
  period: Period,
  yearBy: YearBy,
  offset: number,
  locale: string
): { buckets: Bucket[]; title: string } {
  const now = new Date()

  if (period === 'week') {
    const base = startOfWeek(now)
    base.setDate(base.getDate() + offset * 7)
    const buckets = Array.from({ length: 7 }, (_, i) => {
      const s = new Date(base)
      s.setDate(s.getDate() + i)
      const e = new Date(s)
      e.setDate(e.getDate() + 1)
      return {
        label: s.toLocaleDateString(locale, { weekday: 'short' }),
        full: s.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'short' }),
        start: s.getTime(),
        end: e.getTime(),
      }
    })
    const last = new Date(base)
    last.setDate(last.getDate() + 6)
    const title =
      base.toLocaleDateString(locale, { day: 'numeric', month: 'short' }) +
      ' – ' +
      last.toLocaleDateString(locale, { day: 'numeric', month: 'short' })
    return { buckets, title }
  }

  if (period === 'month') {
    const first = new Date(now.getFullYear(), now.getMonth() + offset, 1)
    const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
    const buckets = Array.from({ length: days }, (_, i) => {
      const s = new Date(first.getFullYear(), first.getMonth(), i + 1)
      const e = new Date(first.getFullYear(), first.getMonth(), i + 2)
      return {
        label: String(i + 1),
        full: s.toLocaleDateString(locale, { day: 'numeric', month: 'long' }),
        start: s.getTime(),
        end: e.getTime(),
      }
    })
    return { buckets, title: first.toLocaleDateString(locale, { month: 'long', year: 'numeric' }) }
  }

  // year
  const year = now.getFullYear() + offset
  if (yearBy === 'months') {
    const buckets = Array.from({ length: 12 }, (_, m) => {
      const s = new Date(year, m, 1)
      const e = new Date(year, m + 1, 1)
      return {
        label: s.toLocaleDateString(locale, { month: 'narrow' }),
        full: s.toLocaleDateString(locale, { month: 'long', year: 'numeric' }),
        start: s.getTime(),
        end: e.getTime(),
      }
    })
    return { buckets, title: String(year) }
  }

  // year by weeks
  const buckets: Bucket[] = []
  let cur = startOfWeek(new Date(year, 0, 1))
  const nextYear = new Date(year + 1, 0, 1).getTime()
  let idx = 1
  while (cur.getTime() < nextYear) {
    const e = new Date(cur)
    e.setDate(e.getDate() + 7)
    buckets.push({
      label: String(idx),
      full:
        cur.toLocaleDateString(locale, { day: 'numeric', month: 'short' }) +
        ' – ' +
        new Date(e.getTime() - 1).toLocaleDateString(locale, { day: 'numeric', month: 'short' }),
      start: cur.getTime(),
      end: e.getTime(),
    })
    cur = e
    idx++
  }
  return { buckets, title: String(year) }
}

export default function ChartScreen({ history }: Props) {
  const t = useT()
  const lang = useLang()
  const locale = localeOf(lang)
  const [period, setPeriod] = useState<Period>('week')
  const [yearBy, setYearBy] = useState<YearBy>('months')
  const [offset, setOffset] = useState(0)
  const [filter, setFilter] = useState<Filter>('all')
  const [sel, setSel] = useState<number | null>(null)

  const { buckets, title } = useMemo(
    () => buildBuckets(period, yearBy, offset, locale),
    [period, yearBy, offset, locale]
  )

  // Aggregate the day/week/month totals per bucket.
  const data = useMemo(
    () =>
      buckets.map((b) => {
        let cash = 0
        let card = 0
        let tip = 0
        for (const o of history) {
          if (o.paidAt < b.start || o.paidAt >= b.end) continue
          if (o.method === 'card') card += o.total
          else cash += o.total
          tip += o.tip ?? 0
        }
        return { cash, card, tip }
      }),
    [buckets, history]
  )

  const valueOf = (d: { cash: number; card: number; tip: number }) =>
    filter === 'all' ? d.cash + d.card : filter === 'cash' ? d.cash : filter === 'card' ? d.card : d.tip

  const max = Math.max(1, ...data.map(valueOf))
  const niceTop = niceCeil(max)
  const shownTotal = data.reduce((sum, d) => sum + valueOf(d), 0)

  // Sparse x-axis labels when there are many bars.
  const labelEvery = buckets.length <= 14 ? 1 : Math.ceil(buckets.length / 12)

  const selData = sel !== null ? data[sel] : null
  const cashTotal = data.reduce((s, d) => s + d.cash, 0)
  const cardTotal = data.reduce((s, d) => s + d.card, 0)
  const tipTotal = data.reduce((s, d) => s + d.tip, 0)

  function shift(dir: number) {
    setOffset(offset + dir)
    setSel(null)
  }

  return (
    <div className="screen chart-screen">
      <div className="chart-periods">
        {(['week', 'month', 'year'] as Period[]).map((p) => (
          <button
            key={p}
            className={'seg-btn' + (period === p ? ' active' : '')}
            onClick={() => {
              setPeriod(p)
              setOffset(0)
              setSel(null)
            }}
          >
            {t(p === 'week' ? 'periodWeek' : p === 'month' ? 'periodMonth' : 'periodYear')}
          </button>
        ))}
      </div>

      <div className="day-nav chart-nav">
        <button className="btn" onClick={() => shift(-1)} aria-label="Previous">
          ‹
        </button>
        <h2 className="day-label">{offset === 0 ? t(currentKey(period)) : title}</h2>
        <button className="btn" disabled={offset === 0} onClick={() => shift(1)} aria-label="Next">
          ›
        </button>
      </div>

      <div className="chart-readout">
        <div className="value">{fmtEur(selData ? valueOf(selData) : shownTotal)}</div>
        <div className="label">{selData ? buckets[sel!].full : title}</div>
      </div>

      {shownTotal === 0 ? (
        <div className="empty">{t('noSales')}</div>
      ) : (
        <>
          <div className="chart-plot">
            <div className="chart-grid">
              {[1, 0.75, 0.5, 0.25, 0].map((f) => (
                <div className="grid-line" key={f} style={{ bottom: `${f * 100}%` }}>
                  <span className="grid-label">{axisLabel(niceTop * f)}</span>
                </div>
              ))}
            </div>
            <div className="chart-bars">
              {data.map((d, i) => {
                const v = valueOf(d)
                const h = (v / niceTop) * 100
                const showV = buckets.length <= 12 && v > 0
                return (
                  <button
                    key={i}
                    className={'chart-col' + (sel === i ? ' sel' : '')}
                    onClick={() => setSel(sel === i ? null : i)}
                    title={buckets[i].full}
                  >
                    <div className="chart-bar" style={{ height: `${h}%` }}>
                      {showV && <span className="chart-v">{axisLabel(v)}</span>}
                      {filter === 'all' ? (
                        <>
                          {d.card > 0 && (
                            <div className="seg card" style={{ height: `${(d.card / v) * 100}%` }} />
                          )}
                          {d.cash > 0 && (
                            <div className="seg cash" style={{ height: `${(d.cash / v) * 100}%` }} />
                          )}
                        </>
                      ) : (
                        <div className={'seg ' + filter} style={{ height: '100%' }} />
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
          <div className="chart-xrow">
            {buckets.map((b, i) => (
              <span className="chart-x" key={i}>
                {i % labelEvery === 0 ? b.label : ''}
              </span>
            ))}
          </div>
        </>
      )}

      <div className="chart-filters">
        <button
          className={'filter-chip' + (filter === 'all' ? ' active' : '')}
          onClick={() => setFilter('all')}
        >
          {t('chartAll')}
        </button>
        <button
          className={'filter-chip cash' + (filter === 'cash' ? ' active' : '')}
          onClick={() => setFilter('cash')}
        >
          <CashIcon size={15} /> {t('payCash')}
        </button>
        <button
          className={'filter-chip card' + (filter === 'card' ? ' active' : '')}
          onClick={() => setFilter('card')}
        >
          <CardIcon size={15} /> {t('payCard')}
        </button>
        <button
          className={'filter-chip tip' + (filter === 'tip' ? ' active' : '')}
          onClick={() => setFilter('tip')}
        >
          {t('tips')}
        </button>
      </div>

      {filter === 'all' && (
        <div className="chart-legend">
          <span>
            <i className="dot cash" /> {t('payCash')} {fmtEur(cashTotal)}
          </span>
          <span>
            <i className="dot card" /> {t('payCard')} {fmtEur(cardTotal)}
          </span>
          {tipTotal > 0 && (
            <span>
              <i className="dot tip" /> {t('tips')} {fmtEur(tipTotal)}
            </span>
          )}
        </div>
      )}

      {period === 'year' && (
        <div className="chart-periods year-by">
          <button
            className={'seg-btn' + (yearBy === 'months' ? ' active' : '')}
            onClick={() => setYearBy('months')}
          >
            {t('byMonths')}
          </button>
          <button
            className={'seg-btn' + (yearBy === 'weeks' ? ' active' : '')}
            onClick={() => setYearBy('weeks')}
          >
            {t('byWeeks')}
          </button>
        </div>
      )}
    </div>
  )
}

function currentKey(period: Period): 'thisWeek' | 'thisMonth' | 'thisYear' {
  return period === 'week' ? 'thisWeek' : period === 'month' ? 'thisMonth' : 'thisYear'
}

/** Round a value up to a clean 1/2/5 × 10ⁿ so gridlines land on tidy numbers. */
function niceCeil(v: number): number {
  if (v <= 0) return 1
  const pow = Math.pow(10, Math.floor(Math.log10(v)))
  const n = v / pow
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10
  return step * pow
}

/** Compact euro label for axis ticks and bar tops. */
function axisLabel(v: number): string {
  if (v >= 1000) return Math.round(v / 100) / 10 + 'k €'
  return Math.round(v) + ' €'
}
