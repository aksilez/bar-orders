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

type Corner = 'nw' | 'ne' | 'sw' | 'se'
const CORNERS: Corner[] = ['nw', 'ne', 'sw', 'se']

interface Geom {
  leftPx: number
  topPx: number
  w: number
  h: number
}

interface ResizeInfo {
  kind: Kind
  id: string
  /** 'corner' = box/table (opposite corner anchored); 'line' = pivot around the fixed end. */
  mode: 'corner' | 'line'
  corner: Corner
  line: boolean
  planW: number
  planH: number
  origLeft: number
  origTop: number
  origRight: number
  origBottom: number
  /** For line mode: the far end stays put while the grabbed end follows the finger. */
  fixedX: number
  fixedY: number
  last: Geom | null
}

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), Math.max(min, max))
const snap = (v: number) => Math.round(v / GRID) * GRID

/**
 * Live geometry while dragging a line's end. The opposite end is a fixed point;
 * the line snaps to whichever axis the finger favours, so it can point up, down,
 * left or right — all four directions — and always stays thin.
 */
function computeLineResize(r: ResizeInfo, pointerX: number, pointerY: number): Geom {
  const px = clamp(pointerX, 0, r.planW)
  const py = clamp(pointerY, 0, r.planH)
  const dx = px - r.fixedX
  const dy = py - r.fixedY
  const half = LINE_THICKNESS / 2
  if (Math.abs(dx) >= Math.abs(dy)) {
    // horizontal bar through fixedY
    const left = Math.min(r.fixedX, px)
    const right = Math.max(r.fixedX, px)
    return { leftPx: left, topPx: r.fixedY - half, w: Math.max(LINE_THICKNESS, right - left), h: LINE_THICKNESS }
  }
  // vertical bar through fixedX
  const top = Math.min(r.fixedY, py)
  const bottom = Math.max(r.fixedY, py)
  return { leftPx: r.fixedX - half, topPx: top, w: LINE_THICKNESS, h: Math.max(LINE_THICKNESS, bottom - top) }
}

/** Live geometry while dragging a corner; the opposite corner stays anchored. */
function computeResize(r: ResizeInfo, pointerX: number, pointerY: number): Geom {
  const dragEast = r.corner === 'ne' || r.corner === 'se'
  const dragSouth = r.corner === 'sw' || r.corner === 'se'
  const minW = r.line ? LINE_THICKNESS : MIN_W
  const minH = r.line ? LINE_THICKNESS : MIN_H
  const anchorX = dragEast ? r.origLeft : r.origRight
  const anchorY = dragSouth ? r.origTop : r.origBottom
  const px = clamp(pointerX, 0, r.planW)
  const py = clamp(pointerY, 0, r.planH)

  let left: number
  let right: number
  if (dragEast) {
    left = anchorX
    right = clamp(px, anchorX + minW, r.planW)
  } else {
    right = anchorX
    left = clamp(px, 0, anchorX - minW)
  }
  let top: number
  let bottom: number
  if (dragSouth) {
    top = anchorY
    bottom = clamp(py, anchorY + minH, r.planH)
  } else {
    bottom = anchorY
    top = clamp(py, 0, anchorY - minH)
  }

  let w = right - left
  let h = bottom - top
  // A line always collapses its shorter axis to a thin bar (orientation follows the drag).
  if (r.line) {
    if (w >= h) {
      h = LINE_THICKNESS
      top = dragSouth ? top : bottom - LINE_THICKNESS
    } else {
      w = LINE_THICKNESS
      left = dragEast ? left : right - LINE_THICKNESS
    }
  }
  return { leftPx: left, topPx: top, w, h }
}

/** Snap a finished resize to the grid; lines keep their thin axis. */
function snapGeom(g: Geom, line: boolean, planW: number, planH: number): Geom {
  let { w, h } = g
  if (line) {
    if (w >= h) {
      w = Math.max(GRID, snap(w))
      h = LINE_THICKNESS
    } else {
      h = Math.max(GRID, snap(h))
      w = LINE_THICKNESS
    }
  } else {
    w = Math.max(MIN_W, snap(w))
    h = Math.max(MIN_H, snap(h))
  }
  const leftPx = clamp(snap(g.leftPx), 0, Math.max(0, planW - w))
  const topPx = clamp(snap(g.topPx), 0, Math.max(0, planH - h))
  return { leftPx, topPx, w, h }
}

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

  function applyGeom(kind: Kind, id: string, g: Geom, planW: number, planH: number) {
    dispatchMove(kind, id, (g.leftPx / planW) * 100, (g.topPx / planH) * 100)
    dispatchResize(kind, id, g.w, g.h)
  }

  function onResizeDown(
    e: React.PointerEvent<HTMLDivElement>,
    kind: Kind,
    item: FloorItem,
    line: boolean,
    corner: Corner
  ) {
    e.stopPropagation()
    capture(e)
    const plan = planRef.current
    if (!plan) return
    const rect = plan.getBoundingClientRect()
    const left = (item.x / 100) * rect.width
    const top = (item.y / 100) * rect.height
    resize.current = {
      kind,
      id: item.id,
      mode: 'corner',
      corner,
      line,
      planW: rect.width,
      planH: rect.height,
      origLeft: left,
      origTop: top,
      origRight: left + item.w,
      origBottom: top + item.h,
      fixedX: 0,
      fixedY: 0,
      last: null,
    }
    setResizingId(item.id)
  }

  /** Grab one end of a line; the other end becomes the pivot. */
  function onLineResizeDown(e: React.PointerEvent<HTMLDivElement>, o: FloorObject, end: 'a' | 'b') {
    e.stopPropagation()
    capture(e)
    const plan = planRef.current
    if (!plan) return
    const rect = plan.getBoundingClientRect()
    const left = (o.x / 100) * rect.width
    const top = (o.y / 100) * rect.height
    const cx = left + o.w / 2
    const cy = top + o.h / 2
    const horizontal = o.w >= o.h
    // end 'a' = left/top end, 'b' = right/bottom end; the fixed point is the opposite end
    let fixedX: number
    let fixedY: number
    if (end === 'a') {
      fixedX = horizontal ? left + o.w : cx
      fixedY = horizontal ? cy : top + o.h
    } else {
      fixedX = horizontal ? left : cx
      fixedY = horizontal ? cy : top
    }
    resize.current = {
      kind: 'object',
      id: o.id,
      mode: 'line',
      corner: 'se',
      line: true,
      planW: rect.width,
      planH: rect.height,
      origLeft: left,
      origTop: top,
      origRight: left + o.w,
      origBottom: top + o.h,
      fixedX,
      fixedY,
      last: null,
    }
    setResizingId(o.id)
  }

  function onResizeMove(e: React.PointerEvent<HTMLDivElement>) {
    const r = resize.current
    const plan = planRef.current
    if (!r || !plan) return
    const rect = plan.getBoundingClientRect()
    const g =
      r.mode === 'line'
        ? computeLineResize(r, e.clientX - rect.left, e.clientY - rect.top)
        : computeResize(r, e.clientX - rect.left, e.clientY - rect.top)
    r.last = g
    applyGeom(r.kind, r.id, g, r.planW, r.planH)
  }

  function onResizeUp() {
    const r = resize.current
    resize.current = null
    setResizingId(null)
    if (!r || !r.last) return
    // snap into the grid — the transition animates the item into place
    applyGeom(r.kind, r.id, snapGeom(r.last, r.line, r.planW, r.planH), r.planW, r.planH)
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

  function resizeHandles(kind: Kind, item: FloorItem, line = false) {
    return CORNERS.map((corner) => (
      <div
        key={corner}
        className={'resize-handle rh-' + corner}
        onPointerDown={(e) => onResizeDown(e, kind, item, line, corner)}
        onPointerMove={onResizeMove}
        onPointerUp={onResizeUp}
        onPointerCancel={onResizeUp}
      />
    ))
  }

  return (
    <div className="floor-wrap">
      <div className="floor" ref={planRef}>
        {objects.map((o) => {
          const line = o.variant === 'line'
          const vertical = line && o.h > o.w
          return (
            <div
              key={o.id}
              className={
                'floor-object' +
                (line ? ' line' : '') +
                (vertical ? ' vertical' : '') +
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
              {editMode &&
                (line ? (
                  <>
                    <div
                      className="resize-handle lh-a"
                      onPointerDown={(e) => onLineResizeDown(e, o, 'a')}
                      onPointerMove={onResizeMove}
                      onPointerUp={onResizeUp}
                      onPointerCancel={onResizeUp}
                    />
                    <div
                      className="resize-handle lh-b"
                      onPointerDown={(e) => onLineResizeDown(e, o, 'b')}
                      onPointerMove={onResizeMove}
                      onPointerUp={onResizeUp}
                      onPointerCancel={onResizeUp}
                    />
                  </>
                ) : (
                  resizeHandles('object', o)
                ))}
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
              {editMode && resizeHandles('table', tb)}
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
