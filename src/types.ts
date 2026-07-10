export type Area = 'indoor' | 'outdoor'

export const CATEGORIES = ['Beer', 'Soft drinks', 'Spirits', 'Food', 'Other'] as const
export type Category = (typeof CATEGORIES)[number]

export interface Product {
  id: string
  name: string
  price: number
  category: Category
}

/** Snapshot of a product at the moment it was ordered — menu edits never change open tabs. */
export interface OrderItem {
  productId: string
  name: string
  price: number
  qty: number
}

export interface Table {
  id: string
  name: string
  area: Area
  /** Position as percentage of the floor-plan area (0–100), so layout survives viewport changes. */
  x: number
  y: number
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
  products: Product[]
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
