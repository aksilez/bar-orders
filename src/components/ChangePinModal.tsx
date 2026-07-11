import { useState } from 'react'
import { useT } from '../i18n'
import { getPin, setPin } from '../pin'
import PinPad from './PinPad'

type Step = 'verify' | 'enter' | 'repeat'

/** Change the history PIN: verify the current one first, then set + confirm a new one. */
export default function ChangePinModal({ onClose }: { onClose: () => void }) {
  const t = useT()
  const [step, setStep] = useState<Step>('verify')
  const [first, setFirst] = useState('')
  const [wrong, setWrong] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [done, setDone] = useState(false)

  function fail() {
    setWrong(true)
    window.setTimeout(() => {
      setWrong(false)
      setResetKey((k) => k + 1)
    }, 800)
  }

  function onComplete(pin: string) {
    if (step === 'verify') {
      if (pin === getPin()) {
        setStep('enter')
        setResetKey((k) => k + 1)
      } else {
        fail()
      }
      return
    }
    if (step === 'enter') {
      setFirst(pin)
      setStep('repeat')
      setResetKey((k) => k + 1)
      return
    }
    // step === 'repeat'
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

  const titles: Record<Step, string> = {
    verify: t('enterCurrentPin'),
    enter: t('enterNewPin'),
    repeat: t('repeatNewPin'),
  }
  const hint = wrong ? (step === 'verify' ? t('wrongPin') : t('pinMismatch')) : undefined

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal pin-modal" onClick={(e) => e.stopPropagation()}>
        {done ? (
          <h3 className="pin-done">✓ {t('pinChanged')}</h3>
        ) : (
          <PinPad
            title={titles[step]}
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
