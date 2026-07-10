export type Area = 'indoor' | 'outdoor'

/** Categories are user-editable, so they are plain strings stored in AppState. */
export type Category = string

/** Grid cell size (px) on the floor plan — table positions and sizes snap to it. */
export const GRID = 34
export const DEFAULT_TABLE_W = GRID * 4
export const DEFAULT_TABLE_H = GRID * 3

export interface Product {
  id: string
  name: string
  price: number
  category: Category
  favorite?: boolean
}

/** Favorites first, then alphabetical — the ordering used everywhere products are listed. */
export function sortProducts(products: Product[]): Product[] {
  return [...products].sort(
    (a, b) => (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0) || a.name.localeCompare(b.name)
  )
}

/** Snapshot of a product at the moment it was ordered — menu edits never change open tabs. */
export interface OrderItem {
  productId: string
  name: string
  price: number
  qty: number
}

/** Decorative floor-plan object (bar counter, door, plant…) — name + color only. */
export interface FloorObject {
  id: string
  name: string
  area: Area
  x: number
  y: number
  w: number
  h: number
  color: string
}

export const OBJECT_COLORS = [
  '#9b9b9b',
  '#4f8ef7',
  '#34c77b',
  '#f0a531',
  '#e5484d',
  '#a970ff',
  '#2bbac5',
  '#f36fa0',
]

export interface Table {
  id: string
  name: string
  area: Area
  /** Position as percentage of the floor-plan area (0–100), so layout survives viewport changes. */
  x: number
  y: number
  /** Size in px, snapped to GRID multiples. */
  w: number
  h: number
  order: OrderItem[]
}

export interface PaidOrder {
  id: string
  tableId: string
  tableName: string
  items: OrderItem[]
  total: number
  paidAt: number
}

export interface AppState {
  tables: Table[]
  objects: FloorObject[]
  products: Product[]
  categories: Category[]
  history: PaidOrder[]
}

export function orderTotal(items: OrderItem[]): number {
  return items.reduce((sum, i) => sum + i.price * i.qty, 0)
}

export function fmtEur(n: number): string {
  return n.toFixed(2) + ' €'
}

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9)
}
