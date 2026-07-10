import { useRef, useState } from 'react'
import type { Area, Table } from '../types'
import { fmtEur, orderTotal } from '../types'
import type { Action } from '../state'

interface Props {
  area: Area
  tables: Table[]
  editMode: boolean
  dispatch: React.Dispatch<Action>
  onOpenTable: (id: string) => void
}

const CARD_W = 128
const CARD_H = 92
const TAP_SLOP_PX = 8

interface DragInfo {
  id: string
  startX: number
  startY: number
  origX: number
  origY: number
  moved: boolean
}

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), Math.max(min, max))

export default function FloorPlan({ area, tables, editMode, dispatch, onOpenTable }: Props) {
  const planRef = useRef<HTMLDivElement>(null)
  const drag = useRef<DragInfo | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)

  const editingTable = editingId ? tables.find((t) => t.id === editingId) ?? null : null

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>, t: Table) {
    if (!editMode) return
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // pointer already released (e.g. very fast tap) — dragging still works via bubbling events
    }
    drag.current = { id: t.id, startX: e.clientX, startY: e.clientY, origX: t.x, origY: t.y, moved: false }
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const d = drag.current
    const plan = planRef.current
    if (!d || !plan) return
    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY
    if (!d.moved && Math.hypot(dx, dy) < TAP_SLOP_PX) return
    if (!d.moved) setDraggingId(d.id)
    d.moved = true
    const rect = plan.getBoundingClientRect()
    const xPx = clamp((d.origX / 100) * rect.width + dx, 0, rect.width - CARD_W)
    const yPx = clamp((d.origY / 100) * rect.height + dy, 0, rect.height - CARD_H)
    dispatch({ type: 'moveTable', id: d.id, x: (xPx / rect.width) * 100, y: (yPx / rect.height) * 100 })
  }

  function onPointerUp(t: Table) {
    const d = drag.current
    drag.current = null
    setDraggingId(null)
    if (editMode && d && !d.moved) setEditingId(t.id)
  }

  return (
    <div className="floor-wrap">
      {editMode && (
        <div className="edit-toolbar">
          <button className="btn primary" onClick={() => dispatch({ type: 'addTable', area })}>
            + Add table
          </button>
          <span className="hint">Drag a table to move it · tap a table to rename or delete</span>
        </div>
      )}

      <div className="floor" ref={planRef}>
        {tables.map((t) => {
          const active = t.order.length > 0
          return (
            <div
              key={t.id}
              className={
                'table-card' +
                (active ? ' active' : ' free') +
                (editMode ? ' editing' : '') +
                (draggingId === t.id ? ' dragging' : '')
              }
              style={{ left: t.x + '%', top: t.y + '%' }}
              onPointerDown={(e) => onPointerDown(e, t)}
              onPointerMove={onPointerMove}
              onPointerUp={() => onPointerUp(t)}
              onPointerCancel={() => {
                drag.current = null
                setDraggingId(null)
              }}
              onClick={() => !editMode && onOpenTable(t.id)}
            >
              <div className="table-name">{t.name}</div>
              {active ? (
                <div className="table-total">{fmtEur(orderTotal(t.order))}</div>
              ) : (
                <div className="table-free">Free</div>
              )}
            </div>
          )
        })}
        {tables.length === 0 && (
          <div className="empty">
            No tables in this area yet.
            {editMode ? ' Tap “+ Add table”.' : ' Switch to “Edit layout” to add one.'}
          </div>
        )}
      </div>

      {editingTable && (
        <EditTableModal
          table={editingTable}
          dispatch={dispatch}
          onClose={() => setEditingId(null)}
        />
      )}
    </div>
  )
}

function EditTableModal({
  table,
  dispatch,
  onClose,
}: {
  table: Table
  dispatch: React.Dispatch<Action>
  onClose: () => void
}) {
  const [name, setName] = useState(table.name)
  const hasOrder = table.order.length > 0

  function save() {
    const trimmed = name.trim()
    if (trimmed) dispatch({ type: 'renameTable', id: table.id, name: trimmed })
    onClose()
  }

  function remove() {
    if (window.confirm(`Delete table “${table.name}”?`)) {
      dispatch({ type: 'deleteTable', id: table.id })
      onClose()
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Edit table</h3>
        <div className="field">
          <label>Table name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && save()}
          />
        </div>
        {hasOrder && <p className="hint">This table has an active order and can’t be deleted.</p>}
        <div className="modal-actions">
          <button className="btn danger" disabled={hasOrder} onClick={remove}>
            Delete
          </button>
          <div className="spacer" />
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" disabled={!name.trim()} onClick={save}>
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
