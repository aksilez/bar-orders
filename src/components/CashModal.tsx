import { useState } from 'react'
import { fmtEur } from '../types'
import { useT } from '../i18n'
import { CashIcon } from '../icons'

interface Props {
  /** Amount that needs to be paid. */
  total: number
  onConfirm: (tip: number) => void
  onClose: () => void
}

/** Denominations as quick-add buttons (euro values), smallest first. */
const DENOMS = [0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50]

function labelFor(v: number): string {
  return v >= 1 ? `${v} €` : `${v.toFixed(2)} €`
}

function round2(v: number): number {
  return Math.round(v * 100) / 100
}

/**
 * Cash payment. The staff enters how much the customer handed over and,
 * separately, a tip. Change to give = given − total − tip. The tip can be
 * typed, set by rounding the bill up, or set to the whole remaining change.
 */
export default function CashModal({ total, onConfirm, onClose }: Props) {
  const t = useT()
  const [given, setGiven] = useState('')
  const [tip, setTip] = useState('')

  const givenNum = parseFloat(given.replace(',', '.'))
  const hasGiven = given.trim() !== '' && isFinite(givenNum) && givenNum > 0
  const tipNum = Math.max(0, isFinite(parseFloat(tip.replace(',', '.'))) ? parseFloat(tip.replace(',', '.')) : 0)
  const change = (hasGiven ? givenNum : total) - total - tipNum
  const short = hasGiven && change < 0

  const addGiven = (v: number) => {
    const cur = parseFloat(given.replace(',', '.'))
    setGiven(round2((isFinite(cur) ? cur : 0) + v).toFixed(2))
  }

  // Round the bill up to the next whole euro → the difference becomes the tip.
  function roundUp() {
    const up = Math.ceil(total + 0.001)
    setTip(round2(up - total).toFixed(2))
  }

  // Leave all the change as a tip (nothing to give back).
  function keepAll() {
    if (!hasGiven) return
    setTip(round2(Math.max(0, givenNum - total)).toFixed(2))
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal cash-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cash-total">
          <span>{t('total')}</span>
          <strong>{fmtEur(total)}</strong>
        </div>

        <div className="field">
          <label>{t('customerGave')}</label>
          <div className="cash-input-row">
            <input
              className="cash-input"
              value={given}
              inputMode="decimal"
              placeholder="0.00"
              onChange={(e) => setGiven(e.target.value)}
            />
            {given !== '' && (
              <button className="cash-clear" onClick={() => setGiven('')}>
                {t('clearAmount')}
              </button>
            )}
          </div>
        </div>

        <div className="cash-notes">
          {DENOMS.map((v) => (
            <button key={v} className="cash-note" onClick={() => addGiven(v)}>
              {labelFor(v)}
            </button>
          ))}
        </div>

        <div className="field">
          <label>{t('tip')}</label>
          <div className="cash-input-row">
            <input
              className="cash-input tip"
              value={tip}
              inputMode="decimal"
              placeholder="0.00"
              onChange={(e) => setTip(e.target.value)}
            />
            <button className="cash-tip-quick" onClick={roundUp}>
              {t('roundUp')}
            </button>
            <button className="cash-tip-quick" disabled={!hasGiven} onClick={keepAll}>
              {t('keepAllChange')}
            </button>
          </div>
        </div>

        <div className={'cash-change' + (short ? ' short' : '')}>
          <span>{short ? t('amountShort') : t('changeDue')}</span>
          <strong>{hasGiven ? fmtEur(Math.abs(change)) : '—'}</strong>
        </div>

        <div className="cash-actions">
          <button className="btn" onClick={onClose}>
            {t('cancel')}
          </button>
          <button className="btn pay" disabled={short} onClick={() => onConfirm(tipNum)}>
            <CashIcon size={18} /> {t('confirmPayment')}
          </button>
        </div>
      </div>
    </div>
  )
}
