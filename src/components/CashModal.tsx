import { useState } from 'react'
import { fmtEur } from '../types'
import { useT } from '../i18n'
import { CashIcon } from '../icons'

interface Props {
  /** Amount that needs to be paid. */
  total: number
  onConfirm: () => void
  onClose: () => void
}

/** Denominations as quick-add buttons (euro values), smallest first. */
const DENOMS = [0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50]

function labelFor(v: number): string {
  return v >= 1 ? `${v} €` : `${v.toFixed(2)} €`
}

/**
 * Cash payment. The staff can type the amount the customer handed over, or
 * tap denomination buttons (each tap adds up). The change to give is shown
 * live. Confirming with nothing entered still finalises the payment.
 */
export default function CashModal({ total, onConfirm, onClose }: Props) {
  const t = useT()
  const [given, setGiven] = useState('')

  const num = parseFloat(given.replace(',', '.'))
  const hasInput = given.trim() !== '' && isFinite(num) && num > 0
  const givenNum = isFinite(num) ? num : 0
  const diff = givenNum - total
  const short = hasInput && diff < 0

  const add = (v: number) => {
    const cur = parseFloat(given.replace(',', '.'))
    const base = isFinite(cur) ? cur : 0
    setGiven((Math.round((base + v) * 100) / 100).toFixed(2))
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
            <button key={v} className="cash-note" onClick={() => add(v)}>
              {labelFor(v)}
            </button>
          ))}
        </div>

        <div className={'cash-change' + (short ? ' short' : '')}>
          <span>{short ? t('amountShort') : t('changeDue')}</span>
          <strong>{hasInput ? fmtEur(Math.abs(diff)) : '—'}</strong>
        </div>

        <div className="cash-actions">
          <button className="btn" onClick={onClose}>
            {t('cancel')}
          </button>
          <button className="btn pay" disabled={short} onClick={onConfirm}>
            <CashIcon size={18} /> {t('confirmPayment')}
          </button>
        </div>
      </div>
    </div>
  )
}
