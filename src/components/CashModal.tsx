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

/** Euro banknotes up to 100 — tapping one adds it to the running total. */
const NOTES = [5, 10, 20, 50, 100]

/**
 * Cash payment: the staff taps the banknotes the customer handed over (each
 * tap adds up) and the modal shows the change to give back. Entering nothing
 * is fine — Confirm still finalises the payment.
 */
export default function CashModal({ total, onConfirm, onClose }: Props) {
  const t = useT()
  const [given, setGiven] = useState(0)

  const hasInput = given > 0
  const diff = given - total
  const short = hasInput && diff < 0

  const add = (n: number) => setGiven((g) => Math.round((g + n) * 100) / 100)

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal cash-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cash-total">
          <span>{t('total')}</span>
          <strong>{fmtEur(total)}</strong>
        </div>

        <div className="cash-given">
          <span className="cash-given-label">{t('customerGave')}</span>
          <span className="cash-given-value">{hasInput ? fmtEur(given) : '—'}</span>
          {hasInput && (
            <button className="cash-clear" onClick={() => setGiven(0)}>
              {t('clearAmount')}
            </button>
          )}
        </div>

        <div className="cash-notes">
          {NOTES.map((n) => (
            <button key={n} className="cash-note" onClick={() => add(n)}>
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
