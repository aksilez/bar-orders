import { useEffect, useReducer, useState } from 'react'
import type { Area, AppState } from './types'
import type { Action } from './state'
import { reducer, seedState } from './state'
import { loadState, saveState } from './storage'
import FloorPlan from './components/FloorPlan'
import OrderScreen from './components/OrderScreen'
import MenuScreen from './components/MenuScreen'
import SummaryScreen from './components/SummaryScreen'

type Screen = 'indoor' | 'outdoor' | 'menu' | 'summary'

const SCREENS: { id: Screen; label: string }[] = [
  { id: 'indoor', label: 'Indoor' },
  { id: 'outdoor', label: 'Outdoor' },
  { id: 'menu', label: 'Menu' },
  { id: 'summary', label: 'Summary' },
]

function rootReducer(state: AppState | null, action: Action): AppState | null {
  if (action.type === 'load') return action.state
  if (!state) return state
  return reducer(state, action)
}

export default function App() {
  const [state, dispatch] = useReducer(rootReducer, null)
  const [screen, setScreen] = useState<Screen>('indoor')
  const [editMode, setEditMode] = useState(false)
  const [openTableId, setOpenTableId] = useState<string | null>(null)

  useEffect(() => {
    loadState().then((saved) => dispatch({ type: 'load', state: saved ?? seedState() }))
  }, [])

  useEffect(() => {
    if (state) saveState(state)
  }, [state])

  if (!state) return <div className="loading">Loading…</div>

  const isFloor = screen === 'indoor' || screen === 'outdoor'
  const openTable = openTableId
    ? state.tables.find((t) => t.id === openTableId) ?? null
    : null

  return (
    <div className="app">
      <header className="topbar">
        <nav className="tabs">
          {SCREENS.map((s) => (
            <button
              key={s.id}
              className={'tab' + (screen === s.id ? ' active' : '')}
              onClick={() => {
                setScreen(s.id)
                if (s.id === 'menu' || s.id === 'summary') setEditMode(false)
              }}
            >
              {s.label}
            </button>
          ))}
        </nav>
        {isFloor && (
          <button
            className={'btn edit-toggle' + (editMode ? ' active' : '')}
            onClick={() => setEditMode(!editMode)}
          >
            {editMode ? '✓ Done' : 'Edit layout'}
          </button>
        )}
      </header>

      {isFloor && (
        <FloorPlan
          area={screen as Area}
          tables={state.tables.filter((t) => t.area === screen)}
          editMode={editMode}
          dispatch={dispatch}
          onOpenTable={setOpenTableId}
        />
      )}
      {screen === 'menu' && <MenuScreen products={state.products} dispatch={dispatch} />}
      {screen === 'summary' && <SummaryScreen history={state.history} />}

      {openTable && (
        <OrderScreen
          table={openTable}
          products={state.products}
          dispatch={dispatch}
          onClose={() => setOpenTableId(null)}
        />
      )}
    </div>
  )
}
