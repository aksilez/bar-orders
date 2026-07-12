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
} from './types'
import {
  DEFAULT_TABLE_H,
  DEFAULT_TABLE_W,
  GRID,
  LINE_THICKNESS,
  OBJECT_COLORS,
  orderTotal,
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
  | { type: 'addItem'; tableId: string; product: Product }
  | { type: 'incItem'; tableId: string; productId: string }
  | { type: 'decItem'; tableId: string; productId: string }
  | { type: 'removeItem'; tableId: string; productId: string }
  | {
      type: 'moveItems'
      fromTableId: string
      toTableId: string
      items: { productId: string; qty: number }[]
    }
  | { type: 'markPaid'; tableId: string; paidId: string; method: PaymentMethod }
  | {
      type: 'payItems'
      tableId: string
      paidId: string
      method: PaymentMethod
      items: { productId: string; qty: number }[]
    }
  | { type: 'undoPaid'; paidId: string }
  | { type: 'addProduct'; name: string; price: number; category: Category }
  | { type: 'updateProduct'; product: Product }
  | { type: 'deleteProduct'; id: string }
  | { type: 'addCategory'; name: string }
  | { type: 'renameCategory'; oldName: string; newName: string }
  | { type: 'deleteCategory'; name: string }
  | { type: 'deleteHistoryRange'; start: number; end: number }
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
      if (!table || table.order.length > 0) return state
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
      return mapTable(state, action.tableId, (t) => {
        const existing = t.order.find((i) => i.productId === action.product.id)
        const order = existing
          ? t.order.map((i) =>
              i.productId === action.product.id ? { ...i, qty: i.qty + 1 } : i
            )
          : [
              ...t.order,
              {
                productId: action.product.id,
                name: action.product.name,
                price: action.product.price,
                qty: 1,
              },
            ]
        return { ...t, order }
      })

    case 'incItem':
      return mapTable(state, action.tableId, (t) => ({
        ...t,
        order: t.order.map((i) =>
          i.productId === action.productId ? { ...i, qty: i.qty + 1 } : i
        ),
      }))

    case 'decItem':
      return mapTable(state, action.tableId, (t) => ({
        ...t,
        order: t.order
          .map((i) => (i.productId === action.productId ? { ...i, qty: i.qty - 1 } : i))
          .filter((i) => i.qty > 0),
      }))

    case 'removeItem':
      return mapTable(state, action.tableId, (t) => ({
        ...t,
        order: t.order.filter((i) => i.productId !== action.productId),
      }))

    case 'moveItems': {
      const from = state.tables.find((t) => t.id === action.fromTableId)
      const to = state.tables.find((t) => t.id === action.toTableId)
      if (!from || !to || from.id === to.id || action.items.length === 0) return state
      let fromOrder = [...from.order]
      const toOrder = [...to.order]
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
          if (t.id === from.id) return { ...t, order: fromOrder }
          if (t.id === to.id) return { ...t, order: toOrder }
          return t
        }),
      }
    }

    case 'markPaid': {
      const table = state.tables.find((t) => t.id === action.tableId)
      if (!table || table.order.length === 0) return state
      const paid: PaidOrder = {
        id: action.paidId,
        tableId: table.id,
        tableName: table.name,
        items: table.order,
        total: orderTotal(table.order),
        paidAt: Date.now(),
        method: action.method,
      }
      return {
        ...state,
        history: [...state.history, paid],
        tables: state.tables.map((t) =>
          t.id === table.id ? { ...t, order: [] } : t
        ),
      }
    }

    case 'payItems': {
      const table = state.tables.find((t) => t.id === action.tableId)
      if (!table || action.items.length === 0) return state
      const paidItems: OrderItem[] = []
      let remaining = [...table.order]
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
        tableName: table.name,
        items: paidItems,
        total: orderTotal(paidItems),
        paidAt: Date.now(),
        method: action.method,
      }
      return {
        ...state,
        history: [...state.history, paid],
        tables: state.tables.map((t) => (t.id === table.id ? { ...t, order: remaining } : t)),
      }
    }

    case 'undoPaid': {
      const order = state.history.find((o) => o.id === action.paidId)
      if (!order) return state
      const table = state.tables.find((t) => t.id === order.tableId)
      if (!table) return state
      // put the items back, merging with anything ordered in the meantime
      const merged = [...table.order]
      for (const item of order.items) {
        const idx = merged.findIndex((m) => m.productId === item.productId)
        if (idx >= 0) merged[idx] = { ...merged[idx], qty: merged[idx].qty + item.qty }
        else merged.push(item)
      }
      return {
        ...state,
        history: state.history.filter((o) => o.id !== action.paidId),
        tables: state.tables.map((t) => (t.id === table.id ? { ...t, order: merged } : t)),
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

    case 'deleteHistoryRange':
      return {
        ...state,
        history: state.history.filter(
          (o) => o.paidAt < action.start || o.paidAt >= action.end
        ),
      }

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
