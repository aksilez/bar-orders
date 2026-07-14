import type {
  Area,
  AppState,
  Category,
  FloorObject,
  OrderItem,
  PaidOrder,
  PaymentMethod,
  Product,
  Table,
  TablePart,
} from './types'
import {
  DEFAULT_TABLE_H,
  DEFAULT_TABLE_W,
  GRID,
  LINE_THICKNESS,
  OBJECT_COLORS,
  orderTotal,
  tableItems,
  uid,
} from './types'

export const DEFAULT_CATEGORIES: Category[] = ['Beer', 'Soft drinks', 'Spirits', 'Food', 'Other']

export type Action =
  | { type: 'load'; state: AppState }
  | { type: 'addTable'; area: Area; baseName: string }
  | { type: 'renameTable'; id: string; name: string }
  | { type: 'deleteTable'; id: string }
  | { type: 'moveTable'; id: string; x: number; y: number }
  | { type: 'resizeTable'; id: string; w: number; h: number }
  | { type: 'addObject'; area: Area; baseName: string; variant: 'box' | 'line' }
  | { type: 'updateObject'; id: string; name: string; color: string }
  | { type: 'moveObject'; id: string; x: number; y: number }
  | { type: 'resizeObject'; id: string; w: number; h: number }
  | { type: 'deleteObject'; id: string }
  | { type: 'addItem'; tableId: string; product: Product; partId?: string }
  | { type: 'incItem'; tableId: string; productId: string; partId?: string }
  | { type: 'decItem'; tableId: string; productId: string; partId?: string }
  | { type: 'removeItem'; tableId: string; productId: string; partId?: string }
  | {
      type: 'moveItems'
      fromTableId: string
      fromPartId?: string
      toTableId: string
      toPartId?: string
      items: { productId: string; qty: number }[]
    }
  | { type: 'splitTable'; tableId: string; firstName: string; newName: string }
  | { type: 'unsplitTable'; tableId: string }
  | { type: 'mergeParts'; tableId: string; fromPartId: string; intoPartId: string }
  | { type: 'setTableStatus'; id: string; reserved: boolean; note: string }
  | {
      type: 'markPaid'
      tableId: string
      paidId: string
      method: PaymentMethod
      tip?: number
      partId?: string
    }
  | {
      type: 'payItems'
      tableId: string
      paidId: string
      method: PaymentMethod
      tip?: number
      partId?: string
      items: { productId: string; qty: number }[]
    }
  | { type: 'undoPaid'; paidId: string }
  | { type: 'addProduct'; name: string; price: number; category: Category }
  | { type: 'updateProduct'; product: Product }
  | { type: 'deleteProduct'; id: string }
  | { type: 'addCategory'; name: string }
  | { type: 'renameCategory'; oldName: string; newName: string }
  | { type: 'deleteCategory'; name: string }
  | { type: 'moveCategory'; name: string; dir: -1 | 1 }
  | { type: 'deleteHistoryRange'; start: number; end: number }
  | { type: 'deleteHistoryOrder'; id: string }
  | { type: 'deleteHistoryAll' }

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'load':
      return action.state

    case 'addTable': {
      const inArea = state.tables.filter((t) => t.area === action.area).length
      let n = 1
      while (state.tables.some((t) => t.name === `${action.baseName} ${n}`)) n++
      const table: Table = {
        id: uid(),
        name: `${action.baseName} ${n}`,
        area: action.area,
        x: 6 + (inArea % 4) * 23,
        y: 8 + Math.floor(inArea / 4) * 28,
        w: DEFAULT_TABLE_W,
        h: DEFAULT_TABLE_H,
        order: [],
      }
      return { ...state, tables: [...state.tables, table] }
    }

    case 'renameTable':
      return {
        ...state,
        tables: state.tables.map((t) =>
          t.id === action.id ? { ...t, name: action.name } : t
        ),
      }

    case 'deleteTable': {
      const table = state.tables.find((t) => t.id === action.id)
      if (!table || tableItems(table).length > 0) return state
      return { ...state, tables: state.tables.filter((t) => t.id !== action.id) }
    }

    case 'moveTable':
      return {
        ...state,
        tables: state.tables.map((t) =>
          t.id === action.id ? { ...t, x: action.x, y: action.y } : t
        ),
      }

    case 'resizeTable':
      return {
        ...state,
        tables: state.tables.map((t) =>
          t.id === action.id ? { ...t, w: action.w, h: action.h } : t
        ),
      }

    case 'addObject': {
      const inArea = state.objects.filter((o) => o.area === action.area).length
      let n = 1
      while (state.objects.some((o) => o.name === `${action.baseName} ${n}`)) n++
      const line = action.variant === 'line'
      const object: FloorObject = {
        id: uid(),
        name: line ? '' : `${action.baseName} ${n}`,
        area: action.area,
        x: 8 + (inArea % 4) * 20,
        y: 38 + (inArea % 3) * 8,
        w: line ? GRID * 6 : GRID * 4,
        h: line ? LINE_THICKNESS : GRID * 2,
        color: OBJECT_COLORS[0],
        variant: action.variant,
      }
      return { ...state, objects: [...state.objects, object] }
    }

    case 'updateObject':
      return {
        ...state,
        objects: state.objects.map((o) =>
          o.id === action.id ? { ...o, name: action.name, color: action.color } : o
        ),
      }

    case 'moveObject':
      return {
        ...state,
        objects: state.objects.map((o) =>
          o.id === action.id ? { ...o, x: action.x, y: action.y } : o
        ),
      }

    case 'resizeObject':
      return {
        ...state,
        objects: state.objects.map((o) =>
          o.id === action.id ? { ...o, w: action.w, h: action.h } : o
        ),
      }

    case 'deleteObject':
      return { ...state, objects: state.objects.filter((o) => o.id !== action.id) }

    case 'addItem':
      return mapTable(state, action.tableId, (t) =>
        // guests ordered — an empty reserved table stops being reserved
        clearReservedIfWasEmpty(
          t,
          updateOrder(t, action.partId, (order) => {
            const existing = order.find((i) => i.productId === action.product.id)
            return existing
              ? order.map((i) =>
                  i.productId === action.product.id ? { ...i, qty: i.qty + 1 } : i
                )
              : [
                  ...order,
                  {
                    productId: action.product.id,
                    name: action.product.name,
                    price: action.product.price,
                    qty: 1,
                  },
                ]
          })
        )
      )

    case 'incItem':
      return mapTable(state, action.tableId, (t) =>
        updateOrder(t, action.partId, (order) =>
          order.map((i) => (i.productId === action.productId ? { ...i, qty: i.qty + 1 } : i))
        )
      )

    case 'decItem':
      return mapTable(state, action.tableId, (t) =>
        updateOrder(t, action.partId, (order) =>
          order
            .map((i) => (i.productId === action.productId ? { ...i, qty: i.qty - 1 } : i))
            .filter((i) => i.qty > 0)
        )
      )

    case 'removeItem':
      return mapTable(state, action.tableId, (t) =>
        updateOrder(t, action.partId, (order) =>
          order.filter((i) => i.productId !== action.productId)
        )
      )

    case 'splitTable': {
      const table = state.tables.find((t) => t.id === action.tableId)
      if (!table) return state
      if (!table.parts || table.parts.length === 0) {
        const partA: TablePart = { id: uid(), name: action.firstName, order: table.order }
        const partB: TablePart = { id: uid(), name: action.newName, order: [] }
        return mapTable(state, action.tableId, (t) => ({ ...t, order: [], parts: [partA, partB] }))
      }
      const newPart: TablePart = { id: uid(), name: action.newName, order: [] }
      return mapTable(state, action.tableId, (t) => ({ ...t, parts: [...(t.parts ?? []), newPart] }))
    }

    case 'mergeParts': {
      const table = state.tables.find((t) => t.id === action.tableId)
      if (!table || !table.parts) return state
      const from = table.parts.find((p) => p.id === action.fromPartId)
      const into = table.parts.find((p) => p.id === action.intoPartId)
      if (!from || !into || from.id === into.id) return state
      const merged = [...into.order]
      for (const item of from.order) {
        const idx = merged.findIndex((m) => m.productId === item.productId)
        if (idx >= 0) merged[idx] = { ...merged[idx], qty: merged[idx].qty + item.qty }
        else merged.push({ ...item })
      }
      const remaining = table.parts
        .filter((p) => p.id !== from.id)
        .map((p) => (p.id === into.id ? { ...p, order: merged } : p))
      // a single leftover part collapses back to a plain table
      if (remaining.length <= 1) {
        return mapTable(state, table.id, (t) => ({
          ...t,
          parts: undefined,
          order: remaining[0]?.order ?? [],
        }))
      }
      return mapTable(state, table.id, (t) => ({ ...t, parts: remaining }))
    }

    case 'setTableStatus':
      return {
        ...state,
        tables: state.tables.map((t) =>
          t.id === action.id
            ? { ...t, reserved: action.reserved || undefined, note: action.note.trim() || undefined }
            : t
        ),
      }

    case 'unsplitTable': {
      const table = state.tables.find((t) => t.id === action.tableId)
      if (!table || !table.parts) return state
      const merged: OrderItem[] = []
      for (const part of table.parts) {
        for (const item of part.order) {
          const idx = merged.findIndex((m) => m.productId === item.productId)
          if (idx >= 0) merged[idx] = { ...merged[idx], qty: merged[idx].qty + item.qty }
          else merged.push({ ...item })
        }
      }
      return mapTable(state, action.tableId, (t) => ({ ...t, parts: undefined, order: merged }))
    }

    case 'moveItems': {
      const from = state.tables.find((t) => t.id === action.fromTableId)
      const to = state.tables.find((t) => t.id === action.toTableId)
      if (!from || !to || action.items.length === 0) return state
      const sameOrder = from.id === to.id && action.fromPartId === action.toPartId
      if (sameOrder) return state
      const sameTable = from.id === to.id

      let fromOrder = [...readOrder(from, action.fromPartId)]
      const toOrder = [...readOrder(sameTable ? from : to, action.toPartId)]
      for (const { productId, qty } of action.items) {
        const idx = fromOrder.findIndex((i) => i.productId === productId)
        if (idx < 0) continue
        const item = fromOrder[idx]
        const moveQty = Math.min(qty, item.qty)
        if (moveQty <= 0) continue
        fromOrder =
          moveQty >= item.qty
            ? fromOrder.filter((i) => i.productId !== productId)
            : fromOrder.map((i) => (i.productId === productId ? { ...i, qty: i.qty - moveQty } : i))
        const toIdx = toOrder.findIndex((i) => i.productId === productId)
        if (toIdx >= 0) toOrder[toIdx] = { ...toOrder[toIdx], qty: toOrder[toIdx].qty + moveQty }
        else toOrder.push({ ...item, qty: moveQty })
      }
      return {
        ...state,
        tables: state.tables.map((t) => {
          if (sameTable && t.id === from.id) {
            return writeOrder(writeOrder(t, action.fromPartId, fromOrder), action.toPartId, toOrder)
          }
          if (t.id === from.id) return writeOrder(t, action.fromPartId, fromOrder)
          if (t.id === to.id) return clearReservedIfWasEmpty(t, writeOrder(t, action.toPartId, toOrder))
          return t
        }),
      }
    }

    case 'markPaid': {
      const table = state.tables.find((t) => t.id === action.tableId)
      if (!table) return state
      const order = readOrder(table, action.partId)
      if (order.length === 0) return state
      const paid: PaidOrder = {
        id: action.paidId,
        tableId: table.id,
        tableName: orderName(table, action.partId),
        items: order,
        total: orderTotal(order),
        paidAt: Date.now(),
        method: action.method,
        tip: action.tip && action.tip > 0 ? action.tip : undefined,
      }
      return {
        ...state,
        history: [...state.history, paid],
        tables: state.tables.map((t) => (t.id === table.id ? clearOrder(table, action.partId) : t)),
      }
    }

    case 'payItems': {
      const table = state.tables.find((t) => t.id === action.tableId)
      if (!table || action.items.length === 0) return state
      const order = readOrder(table, action.partId)
      const paidItems: OrderItem[] = []
      let remaining = [...order]
      for (const { productId, qty } of action.items) {
        const item = remaining.find((i) => i.productId === productId)
        if (!item) continue
        const payQty = Math.min(qty, item.qty)
        if (payQty <= 0) continue
        paidItems.push({ ...item, qty: payQty })
        remaining =
          payQty >= item.qty
            ? remaining.filter((i) => i.productId !== productId)
            : remaining.map((i) => (i.productId === productId ? { ...i, qty: i.qty - payQty } : i))
      }
      if (paidItems.length === 0) return state
      const paid: PaidOrder = {
        id: action.paidId,
        tableId: table.id,
        tableName: orderName(table, action.partId),
        items: paidItems,
        total: orderTotal(paidItems),
        paidAt: Date.now(),
        method: action.method,
        tip: action.tip && action.tip > 0 ? action.tip : undefined,
      }
      // if paying the last of a split part empties it, remove the part too
      const newTable =
        action.partId && remaining.length === 0
          ? clearOrder(table, action.partId)
          : writeOrder(table, action.partId, remaining)
      return {
        ...state,
        history: [...state.history, paid],
        tables: state.tables.map((t) => (t.id === table.id ? newTable : t)),
      }
    }

    case 'undoPaid': {
      const order = state.history.find((o) => o.id === action.paidId)
      if (!order) return state
      const table = state.tables.find((t) => t.id === order.tableId)
      if (!table) return state
      // put the items back — into the first part if the table is now split
      const targetPartId = table.parts && table.parts.length ? table.parts[0].id : undefined
      const merged = [...readOrder(table, targetPartId)]
      for (const item of order.items) {
        const idx = merged.findIndex((m) => m.productId === item.productId)
        if (idx >= 0) merged[idx] = { ...merged[idx], qty: merged[idx].qty + item.qty }
        else merged.push(item)
      }
      return {
        ...state,
        history: state.history.filter((o) => o.id !== action.paidId),
        tables: state.tables.map((t) =>
          t.id === table.id ? writeOrder(t, targetPartId, merged) : t
        ),
      }
    }

    case 'addProduct':
      return {
        ...state,
        products: [
          ...state.products,
          { id: uid(), name: action.name, price: action.price, category: action.category },
        ],
      }

    case 'updateProduct':
      return {
        ...state,
        products: state.products.map((p) =>
          p.id === action.product.id ? action.product : p
        ),
      }

    case 'deleteProduct':
      return { ...state, products: state.products.filter((p) => p.id !== action.id) }

    case 'addCategory': {
      const name = action.name.trim()
      if (!name || state.categories.includes(name)) return state
      return { ...state, categories: [...state.categories, name] }
    }

    case 'renameCategory': {
      const newName = action.newName.trim()
      if (!newName || newName === action.oldName || state.categories.includes(newName)) return state
      return {
        ...state,
        categories: state.categories.map((c) => (c === action.oldName ? newName : c)),
        products: state.products.map((p) =>
          p.category === action.oldName ? { ...p, category: newName } : p
        ),
      }
    }

    case 'deleteCategory':
      // deletes the category together with all products in it
      return {
        ...state,
        categories: state.categories.filter((c) => c !== action.name),
        products: state.products.filter((p) => p.category !== action.name),
      }

    case 'moveCategory': {
      const idx = state.categories.indexOf(action.name)
      const j = idx + action.dir
      if (idx < 0 || j < 0 || j >= state.categories.length) return state
      const cats = [...state.categories]
      ;[cats[idx], cats[j]] = [cats[j], cats[idx]]
      return { ...state, categories: cats }
    }

    case 'deleteHistoryRange':
      return {
        ...state,
        history: state.history.filter(
          (o) => o.paidAt < action.start || o.paidAt >= action.end
        ),
      }

    case 'deleteHistoryOrder':
      return { ...state, history: state.history.filter((o) => o.id !== action.id) }

    case 'deleteHistoryAll':
      return { ...state, history: [] }
  }
}

function mapTable(state: AppState, tableId: string, fn: (t: Table) => Table): AppState {
  return {
    ...state,
    tables: state.tables.map((t) => (t.id === tableId ? fn(t) : t)),
  }
}

/** Reads the order of a part (if partId given) or the plain table order. */
function readOrder(t: Table, partId: string | undefined): OrderItem[] {
  if (partId && t.parts) return t.parts.find((p) => p.id === partId)?.order ?? []
  return t.order
}

/** Writes an order back to a part (if partId given) or the plain table order. */
function writeOrder(t: Table, partId: string | undefined, order: OrderItem[]): Table {
  if (partId && t.parts) {
    return { ...t, parts: t.parts.map((p) => (p.id === partId ? { ...p, order } : p)) }
  }
  return { ...t, order }
}

function updateOrder(
  t: Table,
  partId: string | undefined,
  fn: (order: OrderItem[]) => OrderItem[]
): Table {
  return writeOrder(t, partId, fn(readOrder(t, partId)))
}

/**
 * Empties an order after payment. For a part, removes it; if that leaves a
 * single part, collapses the table back to a plain (unsplit) table.
 */
function clearOrder(t: Table, partId: string | undefined): Table {
  if (partId && t.parts) {
    const remaining = t.parts.filter((p) => p.id !== partId)
    if (remaining.length <= 1) return { ...t, parts: undefined, order: remaining[0]?.order ?? [] }
    return { ...t, parts: remaining }
  }
  return { ...t, order: [] }
}

/** A reservation is fulfilled once items land on a previously empty table. */
function clearReservedIfWasEmpty(before: Table, after: Table): Table {
  return after.reserved && tableItems(before).length === 0
    ? { ...after, reserved: undefined }
    : after
}

/** Name to record in history for a paid order (part name when split). */
function orderName(t: Table, partId: string | undefined): string {
  if (partId && t.parts) return t.parts.find((p) => p.id === partId)?.name ?? t.name
  return t.name
}

/** Upgrades state saved by older app versions (no categories, no table sizes). */
export function migrate(saved: Partial<AppState>): AppState {
  const products = saved.products ?? []
  const categories = [...(saved.categories ?? DEFAULT_CATEGORIES)]
  for (const p of products) {
    if (!categories.includes(p.category)) categories.push(p.category)
  }
  const tables = (saved.tables ?? []).map((t) => ({
    ...t,
    w: t.w ?? DEFAULT_TABLE_W,
    h: t.h ?? DEFAULT_TABLE_H,
  }))
  const objects = (saved.objects ?? []).map((o) => ({ ...o, variant: o.variant ?? 'box' as const }))
  return {
    products,
    categories,
    tables,
    objects,
    history: saved.history ?? [],
  }
}

/** Starter data for the first launch so the app is usable immediately. */
export function seedState(): AppState {
  const p = (name: string, price: number, category: Category): Product => ({
    id: uid() + Math.random().toString(36).slice(2, 5),
    name,
    price,
    category,
  })
  const table = (name: string, area: Area, x: number, y: number): Table => ({
    id: uid() + Math.random().toString(36).slice(2, 5),
    name,
    area,
    x,
    y,
    w: DEFAULT_TABLE_W,
    h: DEFAULT_TABLE_H,
    order: [],
  })
  return {
    categories: [...DEFAULT_CATEGORIES],
    products: [
      p('Pilsner 0.5l', 2.2, 'Beer'),
      p('Pilsner 0.3l', 1.6, 'Beer'),
      p('Radler 0.5l', 2.0, 'Beer'),
      p('Kofola 0.3l', 1.5, 'Soft drinks'),
      p('Cola 0.33l', 1.8, 'Soft drinks'),
      p('Water 0.5l', 1.2, 'Soft drinks'),
      p('Borovička 4cl', 1.8, 'Spirits'),
      p('Slivovica 4cl', 2.5, 'Spirits'),
      p('Jägermeister 4cl', 2.9, 'Spirits'),
      p('Peanuts', 1.5, 'Food'),
      p('Chips', 1.8, 'Food'),
      p('Coffee', 1.6, 'Other'),
    ],
    tables: [
      table('Bar', 'indoor', 6, 8),
      table('Table 1', 'indoor', 32, 8),
      table('Table 2', 'indoor', 58, 8),
      table('Table 3', 'indoor', 32, 42),
      table('Terrace 1', 'outdoor', 6, 8),
      table('Terrace 2', 'outdoor', 32, 8),
    ],
    objects: [],
    history: [],
  }
}
