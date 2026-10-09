import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { api } from '../api'
import { fmtDate } from '../utils'

export default function ActivityLog({ onError }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const load = async () => {
    setLoading(true)
    try { setLogs(await api.logs()) } catch (e) { if (!onError(e)) alert(e.message) } finally { setLoading(false) }
  }
  useEffect(() => { load() /* eslint-disable-next-line */ }, [])
  return (
    <>
      <div className="page-head">
        <div><h1>Activity Log</h1><p>Everything you did in the admin panel.</p></div>
        <button className="btn" onClick={load}><RefreshCw size={15} /> {loading ? 'Loading…' : 'Refresh'}</button>
      </div>
      <div className="tablewrap">
        <table>
          <thead><tr><th>When</th><th>Action</th><th>Hotel</th><th>Details</th></tr></thead>
          <tbody>
            {logs.length === 0 ? <tr><td colSpan={4} className="empty">No activity yet.</td></tr> : logs.map((l) => (
              <tr key={l._id}><td style={{ whiteSpace: 'nowrap' }} className="muted">{fmtDate(l.createdAt)}</td><td><b>{l.action}</b></td><td>{l.hotelName || '—'}</td><td className="muted">{l.detail}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
