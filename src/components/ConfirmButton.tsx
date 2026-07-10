import { useEffect, useState } from 'react'
import { useT } from '../i18n'

/**
 * Two-tap inline confirmation: the first tap arms the button (it turns solid
 * red and shows "Confirm?"), the second tap within 3 s runs the action.
 * Replaces window.confirm dialogs.
 */
export default function ConfirmButton({
  className = 'btn danger',
  label,
  armedLabel,
  disabled,
  onConfirm,
}: {
  className?: string
  label: React.ReactNode
  armedLabel?: React.ReactNode
  disabled?: boolean
  onConfirm: () => void
}) {
  const t = useT()
  const [armed, setArmed] = useState(false)

  useEffect(() => {
    if (!armed) return
    const id = window.setTimeout(() => setArmed(false), 3000)
    return () => clearTimeout(id)
  }, [armed])

  return (
    <button
      className={className + (armed ? ' armed' : '')}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation()
        if (!armed) {
          setArmed(true)
        } else {
          setArmed(false)
          onConfirm()
        }
      }}
    >
      {armed ? armedLabel ?? t('tapToConfirm') : label}
    </button>
  )
}
