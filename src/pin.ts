const KEY = 'bar-orders-pin'

/** History-protection PIN, stored locally on the device. Defaults to 0000. */
export function getPin(): string {
  const p = localStorage.getItem(KEY)
  return p && /^\d{4}$/.test(p) ? p : '0000'
}

export function setPin(pin: string): void {
  localStorage.setItem(KEY, pin)
}
