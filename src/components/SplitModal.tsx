import { useState } from 'react'
import type { Table } from '../types'
import type { Action } from '../state'
import { useT } from '../i18n'

interface Props {
  table: Table
  dispatch: React.Dispatch<Action>
  onClose: () => void
  /** Called with the id-less new part name so the caller can focus it. */
  onSplit?: () => void
}

/** Letter suffix for a part: A, B, C … */
function letter(i: number): string {
  return String.fromCharCode(65 + i)
}

/**
 * Splits a table into named parts. The first split names both halves; further
 * splits just name the new part.
 */
export default function SplitModal({ table, dispatch, onClose, onSplit }: Props) {
  const t = useT()
  const isSplit = !!table.parts && table.parts.length > 0
  const partCount = table.parts?.length ?? 0

  const [firstName, setFirstName] = useState(`${table.name} – ${letter(0)}`)
  const [newName, setNewName] = useState(
    `${table.name} – ${letter(isSplit ? partCount : 1)}`
  )

  function confirm() {
    const first = firstName.trim() || `${table.name} – ${letter(0)}`
    const next = newName.trim() || `${table.name} – ${letter(isSplit ? partCount : 1)}`
    dispatch({ type: 'splitTable', tableId: table.id, firstName: first, newName: next })
    onSplit?.()
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{t('splitTitle')}</h3>

        {!isSplit && (
          <div className="field">
            <label>{t('firstPartName')}</label>
            <input
              value={firstName}
              autoFocus
              onFocus={(e) => e.target.select()}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
        )}

        <div className="field">
          <label>{isSplit ? t('newPartName') : t('secondPartName')}</label>
          <input
            value={newName}
            autoFocus={isSplit}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && confirm()}
          />
        </div>

        <div className="modal-actions">
          {isSplit && (
            <button
              className="btn danger"
              onClick={() => {
                dispatch({ type: 'unsplitTable', tableId: table.id })
                onClose()
              }}
            >
              {t('mergeSplit')}
            </button>
          )}
          <div className="spacer" />
          <button className="btn" onClick={onClose}>
            {t('cancel')}
          </button>
          <button className="btn primary" onClick={confirm}>
            {t('splitAction')}
          </button>
        </div>
      </div>
    </div>
  )
}
