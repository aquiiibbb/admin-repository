import { useEffect, useState, useCallback } from 'react'
import { LayoutDashboard, Building2, Database, ScrollText, LogOut, ShieldCheck } from 'lucide-react'
import { getToken, clearToken } from './api'
import Login from './pages/Login'
import Overview from './pages/Overview'
import Hotels from './pages/Hotels'
import DataExplorer from './pages/DataExplorer'
import ActivityLog from './pages/ActivityLog'
function parseHash() {
  const h = window.location.hash.replace(/^#\/?/, '')
  const [path, query] = h.split('?')
  return { path: path || 'overview', params: Object.fromEntries(new URLSearchParams(query || '')) }
}
const NAV = [
  ['overview', 'Overview', LayoutDashboard],
  ['hotels', 'Hotels', Building2],
  ['data', 'Data Explorer', Database],
  ['logs', 'Activity Log', ScrollText],
]

export default function App() {
  const [authed, setAuthed] = useState(!!getToken())
  const [route, setRoute] = useState(parseHash)

  useEffect(() => {
    const on = () => setRoute(parseHash())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])

  const go = useCallback((path, params = {}) => {
    const q = new URLSearchParams(params).toString()
    window.location.hash = `/${path}${q ? `?${q}` : ''}`
  }, [])

  const logout = useCallback(() => {
    clearToken()
    setAuthed(false)
  }, [])

  // any page: a 401 from the server sends the owner back to the login screen
  const onError = useCallback((err) => {
    if (err?.status === 401) { logout(); return true }
    return false
  }, [logout])

  if (!authed) return <Login onLogin={() => setAuthed(true)} />

  const common = { go, onError }
  return (
    <div className="shell">
      <aside className="side">
        <div className="brand"><span className="logo"><ShieldCheck size={18} color="#fff" /></span> Super Admin</div>
        <nav className="nav">
          {NAV.map(([k, label, Icon]) => (
            <button key={k} type="button" className={route.path === k ? 'on' : ''} onClick={() => go(k)}><Icon size={17} /> {label}</button>
          ))}
        </nav>
        <div className="grow" />
        <nav className="nav"><button type="button" onClick={logout}><LogOut size={17} /> Logout</button></nav>
      </aside>
      <main className="main">
        {route.path === 'overview' && <Overview {...common} />}
        {route.path === 'hotels' && <Hotels {...common} />}
        {route.path === 'data' && <DataExplorer key={route.params.hotel || 'all'} {...common} initialHotel={route.params.hotel || ''} />}
        {route.path === 'logs' && <ActivityLog {...common} />}
      </main>
    </div>
  )
}
