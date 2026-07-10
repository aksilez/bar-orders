import type { PaidOrder } from './types'

function esc(value: string): string {
  return /[",\n]/.test(value) ? '"' + value.replace(/"/g, '""') + '"' : value
}

export function exportDayCsv(orders: PaidOrder[], dayLabel: string): void {
  const rows: string[] = ['Date,Time,Table,Item,Qty,Unit price,Line total,Order total']
  for (const order of orders) {
    const d = new Date(order.paidAt)
    const date = d.toLocaleDateString('sk-SK')
    const time = d.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })
    order.items.forEach((item, idx) => {
      rows.push(
        [
          date,
          time,
          esc(order.tableName),
          esc(item.name),
          String(item.qty),
          item.price.toFixed(2),
          (item.price * item.qty).toFixed(2),
          idx === 0 ? order.total.toFixed(2) : '',
        ].join(',')
      )
    })
  }
  const blob = new Blob(['﻿' + rows.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `orders-${dayLabel}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}
