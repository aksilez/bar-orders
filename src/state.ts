import type { Area, AppState, Category, Product } from './types'
import { orderTotal, uid } from './types'

export type Action =
  | { type: 'load'; state: AppState }
  | { type: 'addTable'; area: Area }
  | { type: 'renameTable'; id: string; name: string }
  | { type: 'deleteTable'; id: string }
  | { type: 'moveTable'; id: string; x: number; y: number }
  | { type: 'addItem'; tableId: string; product: Product }
  | { type: 'incItem'; tableId: string; productId: string }
  | { type: 'decItem'; tableId: string; productId: string }
  | { type: 'removeItem'; tableId: string; productId: string }
  | { type: 'markPaid'; tableId: string }
  | { type: 'addProduct'; name: string; price: number; category: Category }
  | { type: 'updateProduct'; product: Product }
  | { type: 'deleteProduct'; id: string }

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'load':
      return action.state

    case 'addTable': {
      const inArea = state.tables.filter((t) => t.area === action.area).length
      let n = 1
      while (state.tables.some((t) => t.name === `Table ${n}`)) n++
      const table = {
        id: uid(),
        name: `Table ${n}`,
        area: action.area,
        x: 6 + (inArea % 4) * 23,
        y: 8 + Math.floor(inArea / 4) * 28,
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
      const paid = {
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
  }
}

function mapTable(
  state: AppState,
  tableId: string,
  fn: (t: AppState['tables'][number]) => AppState['tables'][number]
): AppState {
  return {
    ...state,
    tables: state.tables.map((t) => (t.id === tableId ? fn(t) : t)),
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
  const table = (name: string, area: Area, x: number, y: number) => ({
    id: uid() + Math.random().toString(36).slice(2, 5),
    name,
    area,
    x,
    y,
    order: [],
  })
  return {
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
