import type { Table, TablePart } from '../types'
import { fmtEur, orderTotal, tableTotal, tableActive } from '../types'
import { useT } from '../i18n'

interface Props {
  /** Candidate destination tables — the source table is already excluded. */
  tables: Table[]
  /** Sibling parts of the current split table (the active one excluded). */
  parts?: TablePart[]
  onPickTable: (tableId: string) => void
  onPickPart?: (partId: string) => void
  onClose: () => void
}

/** Picks a destination (a sibling part, or another table) for a "move items" action. */
export default function TablePickerModal({
  tables,
  parts = [],
  onPickTable,
  onPickPart,
  onClose,
}: Props) {
  const t = useT()
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal table-picker" onClick={(e) => e.stopPropagation()}>
        <h3>{t('moveToTable')}</h3>

        {parts.length > 0 && (
          <div className="table-pick-list">
            {parts.map((p) => (
              <button
                key={p.id}
                className="table-pick-row"
                onClick={() => onPickPart?.(p.id)}
              >
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
        )}

        {tables.length === 0 && parts.length === 0 ? (
          <p className="hint">{t('noOtherTables')}</p>
        ) : (
          <div className="table-pick-list">
            {tables.map((tb) => (
              <button key={tb.id} className="table-pick-row" onClick={() => onPickTable(tb.id)}>
                <span className="area-badge">{t(tb.area)}</span>
                <span className="name">{tb.name}</span>
                {tableActive(tb) ? (
                  <span className="pick-total">{fmtEur(tableTotal(tb))}</span>
                ) : (
                  <span className="pick-free">{t('free')}</span>
                )}
              </button>
            ))}
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
