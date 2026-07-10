import { useRef, useState } from 'react'
import type { Area, Table } from '../types'
import { GRID, fmtEur, orderTotal } from '../types'
import type { Action } from '../state'
import { useT } from '../i18n'

interface Props {
  area: Area
  tables: Table[]
  editMode: boolean
  dispatch: React.Dispatch<Action>
  onOpenTable: (id: string) => void
}

const TAP_SLOP_PX = 8
const MIN_W = GRID * 3
const MIN_H = GRID * 2

interface DragInfo {
  id: string
  startX: number
  startY: number
  origX: number
  origY: number
  w: number
  h: number
  moved: boolean
}

interface ResizeInfo {
  id: string
  startX: number
  startY: number
  origW: number
  origH: number
  maxW: number
  maxH: number
}

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), Math.max(min, max))
const snap = (v: number) => Math.round(v / GRID) * GRID

export default function FloorPlan({ area, tables, editMode, dispatch, onOpenTable }: Props) {
  const t = useT()
  const planRef = useRef<HTMLDivElement>(null)
  const drag = useRef<DragInfo | null>(null)
  const resize = useRef<ResizeInfo | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [resizingId, setResizingId] = useState<string | null>(null)

  const editingTable = editingId ? tables.find((tb) => tb.id === editingId) ?? null : null

  function capture(e: React.PointerEvent<HTMLDivElement>) {
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // pointer already released (e.g. very fast tap) — dragging still works via bubbling events
    }
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>, tb: Table) {
    if (!editMode) return
    capture(e)
    drag.current = {
      id: tb.id,
      startX: e.clientX,
      startY: e.clientY,
      origX: tb.x,
      origY: tb.y,
      w: tb.w,
      h: tb.h,
      moved: false,
    }
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
    const xPx = clamp(snap((d.origX / 100) * rect.width + dx), 0, rect.width - d.w)
    const yPx = clamp(snap((d.origY / 100) * rect.height + dy), 0, rect.height - d.h)
    dispatch({ type: 'moveTable', id: d.id, x: (xPx / rect.width) * 100, y: (yPx / rect.height) * 100 })
  }

  function onPointerUp(tb: Table) {
    const d = drag.current
    drag.current = null
    setDraggingId(null)
    if (editMode && d && !d.moved) setEditingId(tb.id)
  }

  function onResizeDown(e: React.PointerEvent<HTMLDivElement>, tb: Table) {
    e.stopPropagation()
    capture(e)
    const plan = planRef.current
    if (!plan) return
    const rect = plan.getBoundingClientRect()
    resize.current = {
      id: tb.id,
      startX: e.clientX,
      startY: e.clientY,
      origW: tb.w,
      origH: tb.h,
      maxW: rect.width - (tb.x / 100) * rect.width,
      maxH: rect.height - (tb.y / 100) * rect.height,
    }
    setResizingId(tb.id)
  }

  function onResizeMove(e: React.PointerEvent<HTMLDivElement>) {
    const r = resize.current
    if (!r) return
    const w = clamp(snap(r.origW + e.clientX - r.startX), MIN_W, Math.max(MIN_W, snap(r.maxW)))
    const h = clamp(snap(r.origH + e.clientY - r.startY), MIN_H, Math.max(MIN_H, snap(r.maxH)))
    dispatch({ type: 'resizeTable', id: r.id, w, h })
  }

  function onResizeUp() {
    resize.current = null
    setResizingId(null)
  }

  return (
    <div className="floor-wrap">
      {editMode && (
        <div className="edit-toolbar">
          <button
            className="btn primary"
            onClick={() => dispatch({ type: 'addTable', area, baseName: t('tableBase') })}
          >
            {t('addTable')}
          </button>
          <span className="hint">{t('floorHint')}</span>
        </div>
      )}

      <div className="floor" ref={planRef}>
        {tables.map((tb) => {
          const active = tb.order.length > 0
          return (
            <div
              key={tb.id}
              className={
                'table-card' +
                (active ? ' active' : ' free') +
                (editMode ? ' editing' : '') +
                (draggingId === tb.id ? ' dragging' : '') +
                (resizingId === tb.id ? ' resizing' : '')
              }
              style={{ left: tb.x + '%', top: tb.y + '%', width: tb.w, height: tb.h }}
              onPointerDown={(e) => onPointerDown(e, tb)}
              onPointerMove={onPointerMove}
              onPointerUp={() => onPointerUp(tb)}
              onPointerCancel={() => {
                drag.current = null
                setDraggingId(null)
              }}
              onClick={() => !editMode && onOpenTable(tb.id)}
            >
              <div className="table-name">{tb.name}</div>
              {active ? (
                <div className="table-total">{fmtEur(orderTotal(tb.order))}</div>
              ) : (
                <div className="table-free">{t('free')}</div>
              )}
              {editMode && (
                <div
                  className="resize-handle"
                  onPointerDown={(e) => onResizeDown(e, tb)}
                  onPointerMove={onResizeMove}
                  onPointerUp={onResizeUp}
                  onPointerCancel={onResizeUp}
                />
              )}
            </div>
          )
        })}
        {tables.length === 0 && (
          <div className="empty">
            {t('noTablesEmpty')} {editMode ? t('noTablesAddHint') : t('noTablesEditHint')}
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
  const t = useT()
  const [name, setName] = useState(table.name)
  const hasOrder = table.order.length > 0

  function save() {
    const trimmed = name.trim()
    if (trimmed) dispatch({ type: 'renameTable', id: table.id, name: trimmed })
    onClose()
  }

  function remove() {
    if (window.confirm(t('confirmDeleteTable', table.name))) {
      dispatch({ type: 'deleteTable', id: table.id })
      onClose()
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{t('editTable')}</h3>
        <div className="field">
          <label>{t('tableName')}</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && save()}
          />
        </div>
        {hasOrder && <p className="hint">{t('tableHasOrder')}</p>}
        <div className="modal-actions">
          <button className="btn danger" disabled={hasOrder} onClick={remove}>
            {t('delete')}
          </button>
          <div className="spacer" />
          <button className="btn" onClick={onClose}>
            {t('cancel')}
          </button>
          <button className="btn primary" disabled={!name.trim()} onClick={save}>
            {t('save')}
          </button>
        </div>
      </div>
    </div>
  )
}
