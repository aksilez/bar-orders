import { useMemo, useState } from 'react'
import { fmtEur } from '../types'
import { useT } from '../i18n'
import { CashIcon } from '../icons'

interface Props {
  /** Amount that needs to be paid. */
  total: number
  onConfirm: () => void
  onClose: () => void
}

/** Quick-pick note values offered above the calculated change. */
const NOTES = [5, 10, 20, 50]

/**
 * Cash payment: the staff types how much the customer handed over and the
 * modal shows the change to give back. Confirm finalises the payment.
 */
export default function CashModal({ total, onConfirm, onClose }: Props) {
  const t = useT()
  const [given, setGiven] = useState('')

  const givenNum = useMemo(() => {
    const n = parseFloat(given.replace(',', '.'))
    return isFinite(n) ? n : NaN
  }, [given])

  const diff = givenNum - total
  const hasInput = !isNaN(givenNum)
  const short = hasInput && diff < 0

  // suggest round notes/amounts that actually cover the bill
  const suggestions = NOTES.filter((n) => n >= total)

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal cash-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cash-total">
          <span>{t('total')}</span>
          <strong>{fmtEur(total)}</strong>
        </div>

        <div className="field">
          <label>{t('customerGave')}</label>
          <input
            className="cash-input"
            value={given}
            autoFocus
            inputMode="decimal"
            placeholder="0.00"
            onChange={(e) => setGiven(e.target.value)}
          />
        </div>

        <div className="cash-chips">
          {suggestions.map((n) => (
            <button key={n} className="cash-chip" onClick={() => setGiven(String(n))}>
              {n} €
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
