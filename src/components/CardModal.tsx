import { useState } from 'react'
import { fmtEur } from '../types'
import { useT } from '../i18n'
import { CardIcon } from '../icons'
import AmountPad from './AmountPad'

interface Props {
  /** Amount that needs to be paid. */
  total: number
  onConfirm: (tip: number) => void
  onClose: () => void
}

/** Quick tip amounts to add on the card, in euros. */
const QUICK = [0.5, 1, 2, 5]

function round2(v: number): number {
  return Math.round(v * 100) / 100
}

/**
 * Card payment with an optional tip. Card doesn't need change, so this only
 * asks for a tip (default none) and the total charged is shown live.
 */
export default function CardModal({ total, onConfirm, onClose }: Props) {
  const t = useT()
  const [tip, setTip] = useState('')
  const [padOpen, setPadOpen] = useState(false)

  const tipNum = Math.max(0, isFinite(parseFloat(tip.replace(',', '.'))) ? parseFloat(tip.replace(',', '.')) : 0)

  const add = (v: number) => {
    const cur = parseFloat(tip.replace(',', '.'))
    setTip(round2((isFinite(cur) ? cur : 0) + v).toFixed(2))
  }

  function roundUp() {
    const up = Math.ceil(total + 0.001)
    setTip(round2(up - total).toFixed(2))
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal cash-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cash-total">
          <span>{t('total')}</span>
          <strong>{fmtEur(total)}</strong>
        </div>

        <div className="field">
          <label>{t('tip')}</label>
          <div className="cash-input-row">
            <button className="cash-input tip amount-field" onClick={() => setPadOpen(true)}>
              {tip === '' ? <span className="ph">0.00</span> : tip}
            </button>
            <button className="cash-tip-quick" onClick={roundUp}>
              {t('roundUp')}
            </button>
            {tip !== '' && (
              <button className="cash-clear" onClick={() => setTip('')}>
                {t('clearAmount')}
              </button>
            )}
          </div>
        </div>

        <div className="cash-notes card-tips">
          {QUICK.map((v) => (
            <button key={v} className="cash-note" onClick={() => add(v)}>
              +{fmtEur(v)}
            </button>
          ))}
        </div>

        <div className="cash-change">
          <span>{t('totalCharged')}</span>
          <strong>{fmtEur(total + tipNum)}</strong>
        </div>

        <div className="cash-actions">
          <button className="btn" onClick={onClose}>
            {t('cancel')}
          </button>
          <button className="btn pay-card" onClick={() => onConfirm(tipNum)}>
            <CardIcon size={18} /> {t('confirmPayment')}
          </button>
        </div>
      </div>

      {padOpen && (
        <AmountPad
          title={t('tip')}
          initial={tip}
          onConfirm={(v) => {
            setTip(v)
            setPadOpen(false)
          }}
          onClose={() => setPadOpen(false)}
        />
      )}
    </div>
  )
}
