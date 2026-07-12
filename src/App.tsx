import { useEffect, useReducer, useState } from 'react'
import type { Area, AppState } from './types'
import { fmtEur } from './types'
import type { Action } from './state'
import { migrate, reducer, seedState } from './state'
import { loadState, saveState } from './storage'
import type { Lang } from './i18n'
import { I18nContext, tFor } from './i18n'
import { GearIcon, MoonIcon, SunIcon } from './icons'
import FloorPlan from './components/FloorPlan'
import type { PaidInfo } from './components/OrderScreen'
import OrderScreen from './components/OrderScreen'
import MenuScreen from './components/MenuScreen'
import SummaryScreen from './components/SummaryScreen'
import ChartScreen from './components/ChartScreen'
import ChangePinModal from './components/ChangePinModal'

type Screen = 'indoor' | 'outdoor' | 'menu' | 'chart' | 'summary'
type Theme = 'dark' | 'light'

const SCREEN_IDS: Screen[] = ['indoor', 'outdoor', 'menu', 'chart', 'summary']

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
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [changePinOpen, setChangePinOpen] = useState(false)
  const [toast, setToast] = useState<PaidInfo | null>(null)
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem('bar-orders-theme') as Theme | null) ?? 'dark'
  )
  const [lang, setLang] = useState<Lang>(
    () => (localStorage.getItem('bar-orders-lang') as Lang | null) ?? 'en'
  )

  useEffect(() => {
    loadState().then((saved) =>
      dispatch({ type: 'load', state: saved ? migrate(saved) : seedState() })
    )
  }, [])

  useEffect(() => {
    if (state) saveState(state)
  }, [state])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('bar-orders-theme', theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem('bar-orders-lang', lang)
  }, [lang])

  // The undo toast disappears after 6 s.
  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => setToast(null), 6000)
    return () => clearTimeout(id)
  }, [toast])

  const t = tFor(lang)

  if (!state) return <div className="loading">{t('loading')}</div>

  const isFloor = screen === 'indoor' || screen === 'outdoor'
  const openTable = openTableId
    ? state.tables.find((tb) => tb.id === openTableId) ?? null
    : null

  return (
    <I18nContext.Provider value={lang}>
      <div className="app">
        <header className="topbar">
          <nav className="tabs">
            {SCREEN_IDS.map((id) => (
              <button
                key={id}
                className={'tab' + (screen === id ? ' active' : '')}
                onClick={() => {
                  setScreen(id)
                  if (id === 'menu' || id === 'summary' || id === 'chart') setEditMode(false)
                }}
              >
                {t(id)}
              </button>
            ))}
          </nav>
          {isFloor && (
            <button
              className={'btn edit-toggle' + (editMode ? ' active' : '')}
              onClick={() => setEditMode(!editMode)}
            >
              {editMode ? t('done') : t('editLayout')}
            </button>
          )}
          <button
            className="btn icon"
            aria-label={t('settings')}
            onClick={() => setSettingsOpen(true)}
          >
            <GearIcon />
          </button>
          <button
            className="btn icon"
            aria-label={theme === 'dark' ? 'light mode' : 'dark mode'}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <MoonIcon /> : <SunIcon />}
          </button>
        </header>

        {isFloor && (
          <FloorPlan
            area={screen as Area}
            tables={state.tables.filter((tb) => tb.area === screen)}
            objects={state.objects.filter((o) => o.area === screen)}
            editMode={editMode}
            dispatch={dispatch}
            onOpenTable={setOpenTableId}
          />
        )}
        {screen === 'menu' && (
          <MenuScreen
            products={state.products}
            categories={state.categories}
            dispatch={dispatch}
          />
        )}
        {screen === 'chart' && <ChartScreen history={state.history} />}
        {screen === 'summary' && (
          <SummaryScreen history={state.history} dispatch={dispatch} />
        )}

        {openTable && (
          <OrderScreen
            table={openTable}
            allTables={state.tables}
            products={state.products}
            categories={state.categories}
            dispatch={dispatch}
            onClose={() => setOpenTableId(null)}
            onPaid={setToast}
          />
        )}

        {toast && (
          <div className="toast">
            <span className="toast-text">
              ✓ {t('paidToast', toast.tableName)} – {fmtEur(toast.total)}
            </span>
            <button
              className="btn small"
              onClick={() => {
                dispatch({ type: 'undoPaid', paidId: toast.paidId })
                setToast(null)
              }}
            >
              {t('undo')}
            </button>
          </div>
        )}

        {settingsOpen && (
          <div className="modal-backdrop" onClick={() => setSettingsOpen(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h3>{t('settings')}</h3>
              <div className="field">
                <label>{t('language')}</label>
                <div className="lang-row">
                  <button
                    className={'btn' + (lang === 'en' ? ' primary' : '')}
                    onClick={() => setLang('en')}
                  >
                    English
                  </button>
                  <button
                    className={'btn' + (lang === 'sk' ? ' primary' : '')}
                    onClick={() => setLang('sk')}
                  >
                    Slovenčina
                  </button>
                </div>
              </div>
              <div className="field">
                <label>{t('pinSection')}</label>
                <button className="btn" onClick={() => setChangePinOpen(true)}>
                  {t('changePin')}
                </button>
              </div>
              <div className="modal-actions">
                <div className="spacer" />
                <button className="btn" onClick={() => setSettingsOpen(false)}>
                  {t('close')}
                </button>
              </div>
            </div>
          </div>
        )}

        {changePinOpen && <ChangePinModal onClose={() => setChangePinOpen(false)} />}
      </div>
    </I18nContext.Provider>
  )
}
