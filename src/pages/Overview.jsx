import { useEffect, useState } from 'react'
import { Building2, BedDouble, CalendarCheck, Users, DollarSign, AlertTriangle, RefreshCw } from 'lucide-react'
import { api } from '../api'
import { fmtDate, fmtDay, daysLeft } from '../utils'
import { StatusBadge } from '../components/Modal'
export default function Overview({ go, onError }) {
  const [stats, setStats] = useState({})
  const [tenants, setTenants] = useState([])
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const load = async () => {
    setLoading(true)
    try {
      const [s, t, l] = await Promise.all([api.stats(), api.tenants(), api.logs()])
      setStats(s); setTenants(t); setLogs(l.slice(0, 8))
    } catch (e) { if (!onError(e)) alert(e.message) } finally { setLoading(false) }
  }
  useEffect(() => { load() /* eslint-disable-next-line */ }, [])

  const cards = [
    ['Total Hotels', stats.totalTenants ?? 0, `${stats.activeTenants ?? 0} active • ${stats.trialingTenants ?? 0} trial • ${stats.suspendedTenants ?? 0} suspended`, Building2],
    ['Total Rooms', stats.totalRoomsCount ?? 0, 'Across all hotels', BedDouble],
    ['Bookings', stats.totalBookings ?? 0, `${stats.checkedInNow ?? 0} guests in-house now`, CalendarCheck],
    ['Staff Logins', stats.totalStaff ?? 0, 'Across all hotels', Users],
    ['Monthly Revenue (MRR)', `$${stats.mrr ?? 0}`, 'From active plans', DollarSign],
    ['Expiring in 7 days', stats.expiringSoon ?? 0, 'Subscriptions to renew', AlertTriangle, (stats.expiringSoon || 0) > 0],
  ]
  const attention = tenants.filter((t) => t.status === 'suspended' || t.status === 'canceled' || (t.subscriptionEnd && daysLeft(t.subscriptionEnd) <= 7))

  return (
    <>
      <div className="page-head">
        <div><h1>Overview</h1><p>Everything about all your hotels at a glance.</p></div>
        <button className="btn" onClick={load}><RefreshCw size={15} /> {loading ? 'Loading…' : 'Refresh'}</button>
      </div>
      <div className="grid stats">
        {cards.map(([label, val, sub, Icon, warn]) => (
          <div key={label} className={`card stat${warn ? ' warn' : ''}`}>
            <div className="lbl"><span>{label}</span><Icon size={19} /></div>
            <div className="val">{val}</div>
            <div className="sub">{sub}</div>
          </div>
        ))}
      </div>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))' }}>
        <div className="card">
          <div className="row between" style={{ marginBottom: 10 }}><b>Needs attention</b><button className="btn sm" onClick={() => go('hotels')}>All hotels</button></div>
          {attention.length === 0 ? <div className="muted">All hotels are fine ✅</div> : attention.map((t) => (
            <div key={t._id} className="row between" style={{ padding: '8px 0', borderTop: '1px solid var(--line)' }}>
              <div><b>{t.name}</b><div className="muted small">{t.subscriptionEnd ? `subscription ends ${fmtDay(t.subscriptionEnd)}` : t.ownerEmail}</div></div>
              <StatusBadge status={t.status} />
            </div>
          ))}
        </div>
        <div className="card">
          <div className="row between" style={{ marginBottom: 10 }}><b>Recent admin activity</b><button className="btn sm" onClick={() => go('logs')}>All activity</button></div>
          {logs.length === 0 ? <div className="muted">Nothing yet.</div> : logs.map((l) => (
            <div key={l._id} style={{ padding: '8px 0', borderTop: '1px solid var(--line)' }}>
              <b>{l.action}</b> <span className="muted">{l.hotelName ? `• ${l.hotelName}` : ''}</span>
              <div className="muted small">{fmtDate(l.createdAt)} {l.detail ? `• ${l.detail}` : ''}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
