import { useState } from 'react'
import type { Table } from '../types'
import type { Action } from '../state'
import { useT } from '../i18n'
import { BookmarkIcon } from '../icons'

interface Props {
  table: Table
  dispatch: React.Dispatch<Action>
  onClose: () => void
}

/** Reserve a table and/or attach a note shown on the floor plan. */
export default function TableStatusModal({ table, dispatch, onClose }: Props) {
  const t = useT()
  const [reserved, setReserved] = useState(!!table.reserved)
  const [note, setNote] = useState(table.note ?? '')

  function save() {
    dispatch({ type: 'setTableStatus', id: table.id, reserved, note })
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{t('tableStatus')}</h3>

        <div className="field">
          <button
            className={'status-toggle' + (reserved ? ' on' : '')}
            onClick={() => setReserved((r) => !r)}
          >
            <BookmarkIcon size={20} /> {t('reserved')}
          </button>
        </div>

        <div className="field">
          <label>{t('tableNote')}</label>
          <input
            value={note}
            placeholder={t('notePlaceholder')}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()}
          />
        </div>

        <div className="modal-actions">
          <div className="spacer" />
          <button className="btn" onClick={onClose}>
            {t('cancel')}
          </button>
          <button className="btn primary" onClick={save}>
            {t('save')}
          </button>
        </div>
      </div>
    </div>
  )
}
