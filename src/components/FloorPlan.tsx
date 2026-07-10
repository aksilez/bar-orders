import { useRef, useState } from 'react'
import type { Area, FloorObject, Table } from '../types'
import { GRID, LINE_THICKNESS, OBJECT_COLORS, fmtEur, orderTotal } from '../types'
import type { Action } from '../state'
import { useT } from '../i18n'
import ConfirmButton from './ConfirmButton'

interface Props {
  area: Area
  tables: Table[]
  objects: FloorObject[]
  editMode: boolean
  dispatch: React.Dispatch<Action>
  onOpenTable: (id: string) => void
}

type Kind = 'table' | 'object'

/** Common geometry of anything draggable on the floor. */
interface FloorItem {
  id: string
  x: number
  y: number
  w: number
  h: number
}

const TAP_SLOP_PX = 8
const MIN_W = GRID * 2
const MIN_H = GRID * 2

interface DragInfo {
  kind: Kind
  id: string
  startX: number
  startY: number
  origX: number
  origY: number
  w: number
  h: number
  moved: boolean
  /** Latest unsnapped position in px — source of truth for the release snap. */
  lastXPx: number
  lastYPx: number
}

interface ResizeInfo {
  kind: Kind
  id: string
  startX: number
  startY: number
  origW: number
  origH: number
  maxW: number
  maxH: number
  lastW: number
  lastH: number
  /** Lines may stay thin (LINE_THICKNESS) — boxes/tables snap to grid minimums. */
  line: boolean
}

/** Lines keep sub-grid thickness; anything close to a cell snaps to the grid. */
function snapLineDim(v: number): number {
  return v < GRID * 0.75 ? LINE_THICKNESS : Math.round(v / GRID) * GRID
}

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), Math.max(min, max))
const snap = (v: number) => Math.round(v / GRID) * GRID

export default function FloorPlan({ area, tables, objects, editMode, dispatch, onOpenTable }: Props) {
  const t = useT()
  const planRef = useRef<HTMLDivElement>(null)
  const drag = useRef<DragInfo | null>(null)
  const resize = useRef<ResizeInfo | null>(null)
  const [editingTableId, setEditingTableId] = useState<string | null>(null)
  const [editingObjectId, setEditingObjectId] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [resizingId, setResizingId] = useState<string | null>(null)

  const editingTable = editingTableId ? tables.find((tb) => tb.id === editingTableId) ?? null : null
  const editingObject = editingObjectId
    ? objects.find((o) => o.id === editingObjectId) ?? null
    : null

  function dispatchMove(kind: Kind, id: string, x: number, y: number) {
    dispatch(kind === 'table' ? { type: 'moveTable', id, x, y } : { type: 'moveObject', id, x, y })
  }

  function dispatchResize(kind: Kind, id: string, w: number, h: number) {
    dispatch(
      kind === 'table' ? { type: 'resizeTable', id, w, h } : { type: 'resizeObject', id, w, h }
    )
  }

  function capture(e: React.PointerEvent<HTMLDivElement>) {
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // pointer already released (e.g. very fast tap) — dragging still works via bubbling events
    }
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>, kind: Kind, item: FloorItem) {
    if (!editMode) return
    capture(e)
    const plan = planRef.current
    const rect = plan?.getBoundingClientRect()
    drag.current = {
      kind,
      id: item.id,
      startX: e.clientX,
      startY: e.clientY,
      origX: item.x,
      origY: item.y,
      w: item.w,
      h: item.h,
      moved: false,
      lastXPx: rect ? (item.x / 100) * rect.width : 0,
      lastYPx: rect ? (item.y / 100) * rect.height : 0,
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
    // follow the finger freely — snapping happens on release
    const rect = plan.getBoundingClientRect()
    const xPx = clamp((d.origX / 100) * rect.width + dx, 0, rect.width - d.w)
    const yPx = clamp((d.origY / 100) * rect.height + dy, 0, rect.height - d.h)
    d.lastXPx = xPx
    d.lastYPx = yPx
    dispatchMove(d.kind, d.id, (xPx / rect.width) * 100, (yPx / rect.height) * 100)
  }

  function onPointerUp(kind: Kind, item: FloorItem) {
    const d = drag.current
    const plan = planRef.current
    drag.current = null
    setDraggingId(null)
    if (!editMode || !d) return
    if (!d.moved) {
      if (kind === 'table') setEditingTableId(item.id)
      else setEditingObjectId(item.id)
      return
    }
    if (!plan) return
    // snap into the grid — the transition animates the card into place
    const rect = plan.getBoundingClientRect()
    const xPx = clamp(snap(d.lastXPx), 0, rect.width - d.w)
    const yPx = clamp(snap(d.lastYPx), 0, rect.height - d.h)
    dispatchMove(kind, item.id, (xPx / rect.width) * 100, (yPx / rect.height) * 100)
  }

  function onResizeDown(
    e: React.PointerEvent<HTMLDivElement>,
    kind: Kind,
    item: FloorItem,
    line: boolean
  ) {
    e.stopPropagation()
    capture(e)
    const plan = planRef.current
    if (!plan) return
    const rect = plan.getBoundingClientRect()
    resize.current = {
      kind,
      id: item.id,
      startX: e.clientX,
      startY: e.clientY,
      origW: item.w,
      origH: item.h,
      maxW: rect.width - (item.x / 100) * rect.width,
      maxH: rect.height - (item.y / 100) * rect.height,
      lastW: item.w,
      lastH: item.h,
      line,
    }
    setResizingId(item.id)
  }

  function onResizeMove(e: React.PointerEvent<HTMLDivElement>) {
    const r = resize.current
    if (!r) return
    // resize freely — snapping happens on release
    const minW = r.line ? LINE_THICKNESS : MIN_W
    const minH = r.line ? LINE_THICKNESS : MIN_H
    const w = clamp(r.origW + e.clientX - r.startX, minW, Math.max(minW, r.maxW))
    const h = clamp(r.origH + e.clientY - r.startY, minH, Math.max(minH, r.maxH))
    r.lastW = w
    r.lastH = h
    dispatchResize(r.kind, r.id, w, h)
  }

  function onResizeUp(kind: Kind, item: FloorItem) {
    const r = resize.current
    resize.current = null
    setResizingId(null)
    if (!r) return
    const w = r.line
      ? clamp(snapLineDim(r.lastW), LINE_THICKNESS, Math.max(LINE_THICKNESS, r.maxW))
      : clamp(snap(r.lastW), MIN_W, Math.max(MIN_W, snap(r.maxW)))
    const h = r.line
      ? clamp(snapLineDim(r.lastH), LINE_THICKNESS, Math.max(LINE_THICKNESS, r.maxH))
      : clamp(snap(r.lastH), MIN_H, Math.max(MIN_H, snap(r.maxH)))
    dispatchResize(kind, item.id, w, h)
  }

  function itemHandlers(kind: Kind, item: FloorItem) {
    return {
      onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => onPointerDown(e, kind, item),
      onPointerMove,
      onPointerUp: () => onPointerUp(kind, item),
      onPointerCancel: () => {
        drag.current = null
        setDraggingId(null)
      },
    }
  }

  function resizeHandle(kind: Kind, item: FloorItem, line = false) {
    return (
      <div
        className="resize-handle"
        onPointerDown={(e) => onResizeDown(e, kind, item, line)}
        onPointerMove={onResizeMove}
        onPointerUp={() => onResizeUp(kind, item)}
        onPointerCancel={() => onResizeUp(kind, item)}
      />
    )
  }

  return (
    <div className="floor-wrap">
      <div className="floor" ref={planRef}>
        {objects.map((o) => {
          const line = o.variant === 'line'
          return (
            <div
              key={o.id}
              className={
                'floor-object' +
                (line ? ' line' : '') +
                (editMode ? ' editing' : '') +
                (draggingId === o.id ? ' dragging' : '') +
                (resizingId === o.id ? ' resizing' : '')
              }
              style={{
                left: o.x + '%',
                top: o.y + '%',
                width: o.w,
                height: o.h,
                ...(line
                  ? { background: o.color, border: 'none' }
                  : { borderColor: o.color, background: o.color + '26' }),
              }}
              {...(editMode ? itemHandlers('object', o) : {})}
            >
              {!line && <span className="object-name">{o.name}</span>}
              {editMode && resizeHandle('object', o, line)}
            </div>
          )
        })}

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
              {...itemHandlers('table', tb)}
              onClick={() => !editMode && onOpenTable(tb.id)}
            >
              <div className="table-name">{tb.name}</div>
              {active ? (
                <div className="table-total">{fmtEur(orderTotal(tb.order))}</div>
              ) : (
                <div className="table-free">{t('free')}</div>
              )}
              {editMode && resizeHandle('table', tb)}
            </div>
          )
        })}

        {tables.length === 0 && (
          <div className="empty">
            {t('noTablesEmpty')} {editMode ? t('noTablesAddHint') : t('noTablesEditHint')}
          </div>
        )}
      </div>

      {editMode && (
        <div className="edit-toolbar">
          <button
            className="btn primary"
            onClick={() => dispatch({ type: 'addTable', area, baseName: t('tableBase') })}
          >
            {t('addTable')}
          </button>
          <button
            className="btn"
            onClick={() =>
              dispatch({ type: 'addObject', area, baseName: t('objectBase'), variant: 'box' })
            }
          >
            {t('addObject')}
          </button>
          <button
            className="btn"
            onClick={() =>
              dispatch({ type: 'addObject', area, baseName: t('objectBase'), variant: 'line' })
            }
          >
            {t('addLine')}
          </button>
        </div>
      )}

      {editingTable && (
        <EditTableModal
          table={editingTable}
          dispatch={dispatch}
          onClose={() => setEditingTableId(null)}
        />
      )}

      {editingObject && (
        <EditObjectModal
          object={editingObject}
          dispatch={dispatch}
          onClose={() => setEditingObjectId(null)}
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
          <ConfirmButton
            label={t('delete')}
            disabled={hasOrder}
            onConfirm={() => {
              dispatch({ type: 'deleteTable', id: table.id })
              onClose()
            }}
          />
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

function EditObjectModal({
  object,
  dispatch,
  onClose,
}: {
  object: FloorObject
  dispatch: React.Dispatch<Action>
  onClose: () => void
}) {
  const t = useT()
  const isLine = object.variant === 'line'
  const [name, setName] = useState(object.name)
  const [color, setColor] = useState(object.color)

  function save() {
    // lines have no name; boxes keep their old name if the field is emptied
    const trimmed = name.trim()
    const nextName = isLine ? '' : trimmed || object.name
    dispatch({ type: 'updateObject', id: object.id, name: nextName, color })
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{isLine ? t('editLine') : t('editObject')}</h3>
        {!isLine && (
          <div className="field">
            <label>{t('objectName')}</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && save()}
            />
          </div>
        )}
        <div className="field">
          <label>{t('color')}</label>
          <div className="color-row">
            {OBJECT_COLORS.map((c) => (
              <button
                key={c}
                className={'color-swatch' + (c === color ? ' selected' : '')}
                style={{ background: c }}
                aria-label={c}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
        </div>
        <div className="modal-actions">
          <ConfirmButton
            label={t('delete')}
            onConfirm={() => {
              dispatch({ type: 'deleteObject', id: object.id })
              onClose()
            }}
          />
          <div className="spacer" />
          <button className="btn" onClick={onClose}>
            {t('cancel')}
          </button>
          <button className="btn primary" disabled={!isLine && !name.trim()} onClick={save}>
            {t('save')}
          </button>
        </div>
      </div>
    </div>
  )
}
