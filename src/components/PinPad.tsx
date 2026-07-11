import { useEffect, useState } from 'react'

interface Props {
  title: string
  hint?: string
  /** Shake + red dots when true (parent decides after a failed check). */
  wrong?: boolean
  /** Change this value to clear the entered digits (e.g. after a step or a mismatch). */
  resetKey?: unknown
  onComplete: (pin: string) => void
}

/**
 * In-app 4-digit number pad — no iOS keyboard, no keychain autofill.
 * Reports the code via onComplete once four digits are entered.
 */
export default function PinPad({ title, hint, wrong, resetKey, onComplete }: Props) {
  const [pin, setPin] = useState('')

  useEffect(() => {
    setPin('')
  }, [resetKey])

  // While the parent shows the "wrong" state, freeze input and keep the four
  // dots filled so the red flash stays visible; clear once it lifts.
  useEffect(() => {
    if (!wrong) setPin('')
  }, [wrong])

  function press(digit: string) {
    if (wrong || pin.length >= 4) return
    const next = pin + digit
    setPin(next)
    if (next.length === 4) onComplete(next)
  }

  return (
    <>
      <h3>{title}</h3>
      <div className={'pin-dots' + (wrong ? ' wrong' : '')}>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={'pin-dot' + (i < pin.length ? ' filled' : '')} />
        ))}
      </div>
      <p className={'hint pin-hint' + (wrong ? ' wrong' : '')}>{hint ?? ' '}</p>
      <div className="pin-pad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button key={d} className="pin-key" onClick={() => press(d)}>
            {d}
          </button>
        ))}
        <span />
        <button className="pin-key" onClick={() => press('0')}>
          0
        </button>
        <button
          className="pin-key backspace"
          aria-label="backspace"
          onClick={() => setPin(pin.slice(0, -1))}
        >
          ⌫
        </button>
      </div>
    </>
  )
}
