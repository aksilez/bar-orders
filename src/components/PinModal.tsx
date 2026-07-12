import { useState } from 'react'
import { useT } from '../i18n'
import { getPin } from '../pin'
import PinPad from './PinPad'

/** Prompts for the history PIN and calls onSuccess when it matches. */
export default function PinModal({
  onSuccess,
  onClose,
}: {
  onSuccess: () => void
  onClose: () => void
}) {
  const t = useT()
  const [wrong, setWrong] = useState(false)
  const [resetKey, setResetKey] = useState(0)

  function onComplete(pin: string) {
    if (pin === getPin()) {
      onSuccess()
    } else {
      setWrong(true)
      window.setTimeout(() => {
        setWrong(false)
        setResetKey((k) => k + 1)
      }, 700)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal pin-modal" onClick={(e) => e.stopPropagation()}>
        <PinPad
          title={t('enterPin')}
          hint={wrong ? t('wrongPin') : undefined}
          wrong={wrong}
          resetKey={resetKey}
          onComplete={onComplete}
        />
        <div className="modal-actions pin-cancel">
          <button className="btn" onClick={onClose}>
            {t('cancel')}
          </button>
        </div>
      </div>
    </div>
  )
}
