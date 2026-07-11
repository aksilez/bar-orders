import { useState } from 'react'
import { useT } from '../i18n'
import { setPin } from '../pin'
import PinPad from './PinPad'

/** Set a new history PIN — entered twice and must match. */
export default function ChangePinModal({ onClose }: { onClose: () => void }) {
  const t = useT()
  const [step, setStep] = useState<'enter' | 'repeat'>('enter')
  const [first, setFirst] = useState('')
  const [wrong, setWrong] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [done, setDone] = useState(false)

  function onComplete(pin: string) {
    if (step === 'enter') {
      setFirst(pin)
      setStep('repeat')
      setResetKey((k) => k + 1)
      return
    }
    if (pin === first) {
      setPin(pin)
      setDone(true)
      window.setTimeout(onClose, 900)
    } else {
      setWrong(true)
      window.setTimeout(() => {
        setWrong(false)
        setStep('enter')
        setFirst('')
        setResetKey((k) => k + 1)
      }, 800)
    }
  }

  const hint = wrong ? t('pinMismatch') : undefined

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal pin-modal" onClick={(e) => e.stopPropagation()}>
        {done ? (
          <h3 className="pin-done">✓ {t('pinChanged')}</h3>
        ) : (
          <PinPad
            title={step === 'enter' ? t('enterNewPin') : t('repeatNewPin')}
            hint={hint}
            wrong={wrong}
            resetKey={resetKey}
            onComplete={onComplete}
          />
        )}
        {!done && (
          <div className="modal-actions">
            <div className="spacer" />
            <button className="btn" onClick={onClose}>
              {t('cancel')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
