import { useState } from 'react'
import { useT } from '../i18n'

interface Props {
  title: string
  initial?: string
  onConfirm: (value: string) => void
  onClose: () => void
}

/**
 * In-app numeric keypad for entering a money amount (with a decimal point).
 * Avoids the on-screen keyboard so staff can tap big buttons instead.
 */
export default function AmountPad({ title, initial = '', onConfirm, onClose }: Props) {
  const t = useT()
  const [value, setValue] = useState(initial)

  function press(k: string) {
    setValue((v) => {
      if (k === '.') {
        if (v.includes('.')) return v
        return v === '' ? '0.' : v + '.'
      }
      // at most two decimal places
      const dot = v.indexOf('.')
      if (dot >= 0 && v.length - dot - 1 >= 2) return v
      // no runaway leading zeros
      if (v === '0') return k
      return v + k
    })
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal amount-pad" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <div className="amount-display">{(value === '' ? '0' : value) + ' €'}</div>
        <div className="pin-pad">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button key={d} className="pin-key" onClick={() => press(d)}>
              {d}
            </button>
          ))}
          <button className="pin-key" onClick={() => press('.')}>
            .
          </button>
          <button className="pin-key" onClick={() => press('0')}>
            0
          </button>
          <button
            className="pin-key backspace"
            aria-label="backspace"
            onClick={() => setValue((v) => v.slice(0, -1))}
          >
            ⌫
          </button>
        </div>
        <div className="cash-actions">
          <button className="btn" onClick={onClose}>
            {t('cancel')}
          </button>
          <button className="btn pay" onClick={() => onConfirm(value)}>
            {t('done')}
          </button>
        </div>
      </div>
    </div>
  )
}
