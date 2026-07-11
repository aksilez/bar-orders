import type { Table } from '../types'
import { fmtEur, orderTotal } from '../types'
import { useT } from '../i18n'

interface Props {
  /** Candidate destination tables — the source table is already excluded. */
  tables: Table[]
  onPick: (tableId: string) => void
  onClose: () => void
}

/** Picks a destination table for a "move items" action. */
export default function TablePickerModal({ tables, onPick, onClose }: Props) {
  const t = useT()
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal table-picker" onClick={(e) => e.stopPropagation()}>
        <h3>{t('moveToTable')}</h3>
        {tables.length === 0 ? (
          <p className="hint">{t('noOtherTables')}</p>
        ) : (
          <div className="table-pick-list">
            {tables.map((tb) => {
              const active = tb.order.length > 0
              return (
                <button key={tb.id} className="table-pick-row" onClick={() => onPick(tb.id)}>
                  <span className="area-badge">{t(tb.area)}</span>
                  <span className="name">{tb.name}</span>
                  {active ? (
                    <span className="pick-total">{fmtEur(orderTotal(tb.order))}</span>
                  ) : (
                    <span className="pick-free">{t('free')}</span>
                  )}
                </button>
              )
            })}
          </div>
        )}
        <div className="modal-actions">
          <div className="spacer" />
          <button className="btn" onClick={onClose}>
            {t('cancel')}
          </button>
        </div>
      </div>
    </div>
  )
}
