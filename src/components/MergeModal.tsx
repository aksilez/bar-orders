import type { Table } from '../types'
import { fmtEur, orderTotal } from '../types'
import type { Action } from '../state'
import { useT } from '../i18n'
import ConfirmButton from './ConfirmButton'

interface Props {
  /** A split table (parts guaranteed non-empty by the caller). */
  table: Table
  /** The part that survives — picked parts merge into it. */
  activePartId: string
  dispatch: React.Dispatch<Action>
  onClose: () => void
}

/** Picks which sibling part joins the active one, or dissolves the whole split. */
export default function MergeModal({ table, activePartId, dispatch, onClose }: Props) {
  const t = useT()
  const active = table.parts!.find((p) => p.id === activePartId) ?? table.parts![0]
  const others = table.parts!.filter((p) => p.id !== active.id)

  function mergeOne(fromPartId: string) {
    dispatch({ type: 'mergeParts', tableId: table.id, fromPartId, intoPartId: active.id })
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal table-picker" onClick={(e) => e.stopPropagation()}>
        <h3>{t('mergeTitle')}</h3>
        <p className="hint">{t('mergePickHint', active.name)}</p>

        <div className="table-pick-list">
          {others.map((p) => (
            <button key={p.id} className="table-pick-row" onClick={() => mergeOne(p.id)}>
              <span className="area-badge">{t('part')}</span>
              <span className="name">{p.name}</span>
              {p.order.length > 0 ? (
                <span className="pick-total">{fmtEur(orderTotal(p.order))}</span>
              ) : (
                <span className="pick-free">{t('free')}</span>
              )}
            </button>
          ))}
        </div>

        <div className="modal-actions">
          <ConfirmButton
            label={t('mergeAll')}
            onConfirm={() => {
              dispatch({ type: 'unsplitTable', tableId: table.id })
              onClose()
            }}
          />
          <div className="spacer" />
          <button className="btn" onClick={onClose}>
            {t('cancel')}
          </button>
        </div>
      </div>
    </div>
  )
}
