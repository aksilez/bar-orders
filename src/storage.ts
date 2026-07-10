import type { AppState } from './types'

const DB_NAME = 'bar-orders'
const STORE = 'kv'
const KEY = 'state'

let dbPromise: Promise<IDBDatabase> | null = null

function getDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

export async function loadState(): Promise<AppState | null> {
  try {
    const db = await getDb()
    return await new Promise((resolve, reject) => {
      const req = db.transaction(STORE).objectStore(STORE).get(KEY)
      req.onsuccess = () => resolve(req.result ?? null)
      req.onerror = () => reject(req.error)
    })
  } catch (err) {
    console.error('Failed to load state', err)
    return null
  }
}

async function writeState(state: AppState): Promise<void> {
  const db = await getDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(state, KEY)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

let pending: AppState | null = null
let timer: number | undefined

/** Debounced persist — collapses bursts of changes (e.g. dragging a table) into one write. */
export function saveState(state: AppState): void {
  pending = state
  clearTimeout(timer)
  timer = window.setTimeout(flush, 300)
}

export function flush(): void {
  if (!pending) return
  const state = pending
  pending = null
  clearTimeout(timer)
  writeState(state).catch((err) => console.error('Failed to save state', err))
}

// Safari suspends home-screen PWAs aggressively — flush before the page is hidden.
window.addEventListener('pagehide', flush)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flush()
})
