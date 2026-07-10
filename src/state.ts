import type { Area, AppState, Category, PaidOrder, Product, Table } from './types'
import { DEFAULT_TABLE_H, DEFAULT_TABLE_W, orderTotal, uid } from './types'

export const DEFAULT_CATEGORIES: Category[] = ['Beer', 'Soft drinks', 'Spirits', 'Food', 'Other']

export type Action =
  | { type: 'load'; state: AppState }
  | { type: 'addTable'; area: Area; baseName: string }
  | { type: 'renameTable'; id: string; name: string }
  | { type: 'deleteTable'; id: string }
  | { type: 'moveTable'; id: string; x: number; y: number }
  | { type: 'resizeTable'; id: string; w: number; h: number }
  | { type: 'addItem'; tableId: string; product: Product }
  | { type: 'incItem'; tableId: string; productId: string }
  | { type: 'decItem'; tableId: string; productId: string }
  | { type: 'removeItem'; tableId: string; productId: string }
  | { type: 'markPaid'; tableId: string }
  | { type: 'addProduct'; name: string; price: number; category: Category }
  | { type: 'updateProduct'; product: Product }
  | { type: 'deleteProduct'; id: string }
  | { type: 'addCategory'; name: string }
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

    case 'markPaid': {
      const table = state.tables.find((t) => t.id === action.tableId)
      if (!table || table.order.length === 0) return state
      const paid: PaidOrder = {
        id: uid(),
        tableId: table.id,
        tableName: table.name,
        items: table.order,
        total: orderTotal(table.order),
        paidAt: Date.now(),
      }
      return {
        ...state,
        history: [...state.history, paid],
        tables: state.tables.map((t) =>
          t.id === table.id ? { ...t, order: [] } : t
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

    case 'deleteCategory': {
      if (state.products.some((p) => p.category === action.name)) return state
      return { ...state, categories: state.categories.filter((c) => c !== action.name) }
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
  return { products, categories, tables, history: saved.history ?? [] }
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
    history: [],
  }
}
