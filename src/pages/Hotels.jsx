import { useEffect, useMemo, useState } from 'react'
import { Plus, RefreshCw, Search, ExternalLink, Edit, Eye, KeyRound, Download, Trash2, Clock, CheckCircle, Database, Building2 } from 'lucide-react'
import { api, openHotel } from '../api'
import { fmtDate, fmtDay, dayInput, money, daysLeft } from '../utils'
import Modal, { Field, StatusBadge } from '../components/Modal'
import CredentialsView from '../components/CredentialsView'

const emptyCreate = { name: '', ownerName: '', ownerEmail: '', phone: '', currency: '$', plan: 'Pro', maxRooms: '50', password: '', subscriptionEnd: '' }

export default function Hotels({ go, onError }) {
  const [tenants, setTenants] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [busy, setBusy] = useState(false)

  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState(emptyCreate)
  const [creds, setCreds] = useState(null)
  const [edit, setEdit] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [reset, setReset] = useState(null) // { tenant, staff }
  const [resetForm, setResetForm] = useState({ username: 'admin', password: '', sendEmail: true })
  const [purge, setPurge] = useState(null)
  const [purgeName, setPurgeName] = useState('')
  const [detail, setDetail] = useState(null) // { data, tab }
  const [emailSvc, setEmailSvc] = useState(null) // { configured, from }
  const [emailLog, setEmailLog] = useState(null)

  useEffect(() => { api.emailStatus().then(setEmailSvc).catch(() => {}) }, [])
  useEffect(() => {
    if (detail?.tab !== 'emails') { setEmailLog(null); return }
    api.tenantEmails(detail.data.tenant._id).then(setEmailLog).catch(() => setEmailLog({ error: true }))
  }, [detail?.tab, detail?.data?.tenant?._id])

  const fail = (e) => { if (!onError(e)) alert(e.message) }
  const load = async () => {
    setLoading(true)
    try { setTenants(await api.tenants()) } catch (e) { fail(e) } finally { setLoading(false) }
  }
  useEffect(() => { load() /* eslint-disable-next-line */ }, [])

  const filtered = useMemo(() => {
    const s = q.toLowerCase()
    return tenants.filter((t) => {
      const hit = [t.name, t.ownerEmail, t.tenantId, t.hotelCode, t.ownerName].some((v) => (v || '').toLowerCase().includes(s))
      return hit && (statusFilter === 'ALL' || t.status === statusFilter)
    })
  }, [tenants, q, statusFilter])

  const open = async (t) => { try { await openHotel(t) } catch (e) { fail(e) } }
  const openDetail = async (t, tab = 'overview') => {
    try { setDetail({ data: await api.tenantDetail(t._id), tab }) } catch (e) { fail(e) }
  }

  const submitCreate = async (e) => {
    e.preventDefault(); setBusy(true)
    try {
      const res = await api.createTenant(createForm)
      setShowCreate(false); setCreateForm(emptyCreate)
      setCreds({ title: '✅ Hotel created', creds: res.adminCredentials, hotelName: res.tenant.name, ownerEmail: res.tenant.ownerEmail, emailResult: res.email })
      load()
    } catch (err) { fail(err) } finally { setBusy(false) }
  }

  const startEdit = (t) => {
    setEdit(t)
    setEditForm({ name: t.name || '', ownerName: t.ownerName || '', ownerEmail: t.ownerEmail || '', phone: t.phone || '', status: t.status, plan: t.plan, maxRooms: String(t.maxRooms || 50), notes: t.notes || '', subscriptionEnd: dayInput(t.subscriptionEnd), emailDailyLimit: String(t.emailDailyLimit ?? 300), emailEnabled: t.emailEnabled !== false })
  }
  const submitEdit = async (e) => {
    e.preventDefault(); setBusy(true)
    try {
      await api.updateTenant(edit._id, editForm)
      const t = edit
      setEdit(null); await load()
      if (detail) openDetail(t, detail.tab)
    } catch (err) { fail(err) } finally { setBusy(false) }
  }
  const quickStatus = async (t, status) => {
    if (!window.confirm(`${status === 'active' ? 'Activate' : 'Suspend'} "${t.name}"?`)) return
    try { await api.updateTenant(t._id, { status }); await load(); if (detail) openDetail(t, detail.tab) } catch (err) { fail(err) }
  }
  const deactivate = async (t) => {
    if (!window.confirm(`Deactivate "${t.name}"? Data is kept; login is blocked. You can activate it again later.`)) return
    try { await api.deactivate(t._id); setDetail(null); load() } catch (err) { fail(err) }
  }
  const submitReset = async (e) => {
    e.preventDefault(); setBusy(true)
    try {
      const res = await api.resetPassword(reset.tenant._id, resetForm)
      setCreds({ title: '🔑 New password', creds: res.credentials, hotelName: reset.tenant.name, ownerEmail: reset.tenant.ownerEmail, emailResult: res.email })
      setReset(null); setResetForm({ username: 'admin', password: '', sendEmail: true })
    } catch (err) { fail(err) } finally { setBusy(false) }
  }
  const submitPurge = async (e) => {
    e.preventDefault(); setBusy(true)
    try { await api.purge(purge._id, purgeName); setPurge(null); setPurgeName(''); setDetail(null); load() } catch (err) { fail(err) } finally { setBusy(false) }
  }

  const d = detail?.data
  const dt = d?.tenant

  return (
    <>
      <div className="page-head">
        <div><h1>Hotels</h1><p>Create hotel accounts, open any hotel, reset logins. Every hotel's data is separate.</p></div>
        <div className="row">
          <button className="btn" onClick={load}><RefreshCw size={15} /> {loading ? 'Loading…' : 'Refresh'}</button>
          <button className="btn dark" onClick={() => { setCreateForm(emptyCreate); setShowCreate(true) }}><Plus size={16} /> New Hotel Account</button>
        </div>
      </div>

      {emailSvc && !emailSvc.configured && <div className="notice warn" role="alert">⚠️ Email service (AWS SES) is not set up in <b>backend/.env</b>. New hotel logins will NOT be emailed - you will have to copy and send them yourself.</div>}

      <div className="card row between" style={{ marginBottom: 14 }}>
        <div className="row">
          <div style={{ position: 'relative' }}>
            <Search size={15} color="#64748b" style={{ position: 'absolute', left: 11, top: 12 }} />
            <input className="input" style={{ width: 280, paddingLeft: 34 }} placeholder="Search hotel, owner, email, id…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select className="select" style={{ width: 'auto' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="ALL">All statuses</option><option value="active">Active</option><option value="trialing">Trialing</option><option value="suspended">Suspended</option><option value="canceled">Canceled</option>
          </select>
        </div>
        <span className="muted" style={{ fontWeight: 700 }}>{filtered.length} of {tenants.length} hotels</span>
      </div>

      <div className="tablewrap">
        <table>
          <thead><tr><th>Hotel</th><th>Owner / login email</th><th style={{ textAlign: 'center' }}>Plan</th><th style={{ textAlign: 'center' }}>Rooms</th><th style={{ textAlign: 'center' }}>Bookings</th><th>Last login</th><th style={{ textAlign: 'center' }}>Status</th><th style={{ textAlign: 'center' }}>Actions</th></tr></thead>
          <tbody>
            {loading && tenants.length === 0 ? <tr><td colSpan={8} className="empty">Loading hotels…</td></tr>
              : filtered.length === 0 ? <tr><td colSpan={8} className="empty">No hotels found.</td></tr>
              : filtered.map((t) => {
                const m = t.metrics || {}
                const left = daysLeft(t.subscriptionEnd)
                return (
                  <tr key={t._id}>
                    <td><div className="row" style={{ flexWrap: 'nowrap' }}><Building2 size={16} color="#64748b" /><div><b>{t.name}</b>{t.isDefault && <span className="tag">DEFAULT</span>}<div className="muted small">Hotel Code: <b>{t.hotelCode || t.tenantId}</b></div></div></div></td>
                    <td>{t.ownerName || '—'}<div className="muted small">{t.ownerEmail}</div></td>
                    <td style={{ textAlign: 'center', fontWeight: 800 }}>{t.plan}</td>
                    <td style={{ textAlign: 'center', fontWeight: 700 }}><span style={{ color: m.rooms > t.maxRooms ? '#b91c1c' : 'inherit' }}>{m.rooms || 0}</span> / {t.maxRooms}</td>
                    <td style={{ textAlign: 'center', fontWeight: 700 }}>{m.bookings || 0}<div className="muted small">{m.checkedIn || 0} in-house</div></td>
                    <td className="muted small" style={{ whiteSpace: 'nowrap' }}>{fmtDate(m.lastLoginAt)}</td>
                    <td style={{ textAlign: 'center' }}><StatusBadge status={t.status} />{t.subscriptionEnd && <div className="small" style={{ marginTop: 3, fontWeight: 700, color: left <= 7 ? '#b45309' : 'var(--muted)' }}>{left < 0 ? `expired ${fmtDay(t.subscriptionEnd)}` : `ends ${fmtDay(t.subscriptionEnd)}`}</div>}</td>
                    <td><div className="row" style={{ justifyContent: 'center' }}>
                      <button className="btn sm dark" onClick={() => open(t)}><ExternalLink size={13} /> Open Hotel</button>
                      <button className="btn sm accent" onClick={() => go('data', { hotel: t.tenantId })}><Database size={13} /> Data</button>
                      <button className="btn sm" onClick={() => openDetail(t)}><Eye size={13} /> Details</button>
                      <button className="btn sm" onClick={() => startEdit(t)}><Edit size={13} /> Edit</button>
                    </div></td>
                  </tr>
                )
              })}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <Modal title="⚡ New Hotel Account" onClose={() => setShowCreate(false)}>
          <form className="mbody" onSubmit={submitCreate}>
            <Field label="Hotel name *"><input className="input" required value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} placeholder="e.g. Grand Ocean Resort" /></Field>
            <div className="two">
              <Field label="Owner name"><input className="input" value={createForm.ownerName} onChange={(e) => setCreateForm({ ...createForm, ownerName: e.target.value })} /></Field>
              <Field label="Owner email (= login) *"><input className="input" type="email" required value={createForm.ownerEmail} onChange={(e) => setCreateForm({ ...createForm, ownerEmail: e.target.value })} /></Field>
            </div>
            <div className="two">
              <Field label="Phone"><input className="input" value={createForm.phone} onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })} /></Field>
              <Field label="Max rooms"><input className="input" type="number" min="1" value={createForm.maxRooms} onChange={(e) => setCreateForm({ ...createForm, maxRooms: e.target.value })} /></Field>
            </div>
            <div className="two">
              <Field label="Plan"><select className="select" value={createForm.plan} onChange={(e) => setCreateForm({ ...createForm, plan: e.target.value })}><option value="Starter">Starter ($49/mo)</option><option value="Pro">Pro ($99/mo)</option><option value="Enterprise">Enterprise ($199/mo)</option></select></Field>
              <Field label="Currency"><select className="select" value={createForm.currency} onChange={(e) => setCreateForm({ ...createForm, currency: e.target.value })}><option value="$">USD ($)</option><option value="₹">INR (₹)</option><option value="€">EUR (€)</option><option value="£">GBP (£)</option></select></Field>
            </div>
            <div className="two">
              <Field label="Password (blank = auto)"><input className="input" value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} placeholder="auto-generated" /></Field>
              <Field label="Subscription ends (optional)"><input className="input" type="date" value={createForm.subscriptionEnd} onChange={(e) => setCreateForm({ ...createForm, subscriptionEnd: e.target.value })} /></Field>
            </div>
            <div className="small muted">The hotel starts completely blank. The owner logs in with this email and sets up rooms, rates and staff.</div>
            <div className="row between"><span /><div className="row"><button type="button" className="btn" onClick={() => setShowCreate(false)}>Cancel</button><button type="submit" className="btn dark" disabled={busy}>{busy ? 'Creating…' : 'Create Hotel'}</button></div></div>
          </form>
        </Modal>
      )}

      {creds && <Modal title={creds.title} onClose={() => setCreds(null)}><CredentialsView {...creds} onClose={() => setCreds(null)} /></Modal>}

      {edit && (
        <Modal title={`Edit: ${edit.name}`} onClose={() => setEdit(null)}>
          <form className="mbody" onSubmit={submitEdit}>
            <Field label="Hotel name"><input className="input" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></Field>
            <div className="two">
              <Field label="Owner name"><input className="input" value={editForm.ownerName} onChange={(e) => setEditForm({ ...editForm, ownerName: e.target.value })} /></Field>
              <Field label="Owner email (= login)"><input className="input" type="email" value={editForm.ownerEmail} onChange={(e) => setEditForm({ ...editForm, ownerEmail: e.target.value })} /></Field>
            </div>
            <div className="two">
              <Field label="Status"><select className="select" value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}><option value="active">Active (full access)</option><option value="trialing">Trialing</option><option value="suspended">Suspended (login blocked)</option><option value="canceled">Canceled (login blocked)</option></select></Field>
              <Field label="Plan"><select className="select" value={editForm.plan} onChange={(e) => setEditForm({ ...editForm, plan: e.target.value })}><option value="Starter">Starter</option><option value="Pro">Pro</option><option value="Enterprise">Enterprise</option></select></Field>
            </div>
            <div className="two">
              <Field label="Max rooms"><input className="input" type="number" min="1" value={editForm.maxRooms} onChange={(e) => setEditForm({ ...editForm, maxRooms: e.target.value })} /></Field>
              <Field label="Subscription ends"><input className="input" type="date" value={editForm.subscriptionEnd} onChange={(e) => setEditForm({ ...editForm, subscriptionEnd: e.target.value })} /></Field>
            </div>
            <div className="two">
              <Field label="Emails allowed per day"><input className="input" type="number" min="0" max="5000" value={editForm.emailDailyLimit} onChange={(e) => setEditForm({ ...editForm, emailDailyLimit: e.target.value })} /></Field>
              <Field label="Emails from this hotel"><select className="select" value={editForm.emailEnabled ? 'on' : 'off'} onChange={(e) => setEditForm({ ...editForm, emailEnabled: e.target.value === 'on' })}><option value="on">On</option><option value="off">Off (blocked)</option></select></Field>
            </div>
            <Field label="Phone"><input className="input" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} /></Field>
            <Field label="Private notes (only you see this)"><textarea className="textarea" rows={3} value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} /></Field>
            <div className="row between"><span /><div className="row"><button type="button" className="btn" onClick={() => setEdit(null)}>Cancel</button><button type="submit" className="btn dark" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button></div></div>
          </form>
        </Modal>
      )}

      {reset && (
        <Modal title={`🔑 Reset password: ${reset.tenant.name}`} onClose={() => setReset(null)}>
          <form className="mbody" onSubmit={submitReset}>
            <Field label="Which login?"><select className="select" value={resetForm.username} onChange={(e) => setResetForm({ ...resetForm, username: e.target.value })}>
              {(reset.staff.length ? reset.staff : [{ username: 'admin', name: 'Owner / Admin' }]).map((u) => <option key={u.username} value={u.username}>{u.username} — {u.name || u.role}</option>)}
            </select></Field>
            <Field label="New password (blank = auto-generate)"><input className="input" value={resetForm.password} onChange={(e) => setResetForm({ ...resetForm, password: e.target.value })} placeholder="auto-generated" /></Field>
            <label className="row" style={{ gap: 8, fontWeight: 700 }}><input type="checkbox" checked={resetForm.sendEmail} onChange={(e) => setResetForm({ ...resetForm, sendEmail: e.target.checked })} /> Email the new password to the owner ({reset.tenant.ownerEmail})</label>
            <div className="small muted">The old password stops working immediately. You also see the new one here.</div>
            <div className="row between"><span /><div className="row"><button type="button" className="btn" onClick={() => setReset(null)}>Cancel</button><button type="submit" className="btn dark" disabled={busy}>{busy ? 'Resetting…' : 'Reset password'}</button></div></div>
          </form>
        </Modal>
      )}

      {purge && (
        <Modal title="🗑️ Delete hotel permanently" onClose={() => setPurge(null)}>
          <form className="mbody" onSubmit={submitPurge}>
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: 12, color: '#991b1b', fontWeight: 600 }}>This deletes <b>{purge.name}</b> and ALL its rooms, bookings, guests, staff and settings. It cannot be undone. Download a backup first if unsure.</div>
            <Field label={`Type the hotel name to confirm: ${purge.name}`}><input className="input" value={purgeName} onChange={(e) => setPurgeName(e.target.value)} /></Field>
            <div className="row between"><span /><div className="row"><button type="button" className="btn" onClick={() => setPurge(null)}>Cancel</button><button type="submit" className="btn danger" disabled={busy || purgeName.trim() !== purge.name}>Delete forever</button></div></div>
          </form>
        </Modal>
      )}

      {d && (
        <Modal wide title={`🏨 ${dt.name}`} onClose={() => setDetail(null)}>
          <div className="mbody">
            <div className="row">
              <button className="btn sm dark" onClick={() => open(dt)}><ExternalLink size={13} /> Open Hotel</button>
              <button className="btn sm accent" onClick={() => go('data', { hotel: dt.tenantId })}><Database size={13} /> Browse all data</button>
              <button className="btn sm" onClick={() => setReset({ tenant: dt, staff: d.staff })}><KeyRound size={13} /> Reset password</button>
              <button className="btn sm" onClick={() => startEdit(dt)}><Edit size={13} /> Edit</button>
              <button className="btn sm" onClick={() => api.exportHotel(dt._id, `${dt.tenantId}-backup.json`).catch(fail)}><Download size={13} /> Backup (JSON)</button>
              {(dt.status === 'active' || dt.status === 'trialing') ? (!dt.isDefault && <button className="btn sm" onClick={() => quickStatus(dt, 'suspended')}><Clock size={13} /> Suspend</button>) : <button className="btn sm" onClick={() => quickStatus(dt, 'active')}><CheckCircle size={13} /> Activate</button>}
              {!dt.isDefault && <button className="btn sm" style={{ color: '#b45309' }} onClick={() => deactivate(dt)}>Deactivate</button>}
              {!dt.isDefault && <button className="btn sm danger" onClick={() => { setPurgeName(''); setPurge(dt) }}><Trash2 size={13} /> Delete</button>}
            </div>
            <div className="tabs">
              {[['overview', 'Overview'], ['staff', `Staff logins (${d.staff.length})`], ['emails', 'Emails']].map(([k, l]) => <button key={k} className={detail.tab === k ? 'on' : ''} onClick={() => setDetail({ ...detail, tab: k })}>{l}</button>)}
            </div>
            {detail.tab === 'overview' && (
              <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
                {[
                  ['Status', <StatusBadge status={dt.status} />], ['Plan', `${dt.plan} (max ${dt.maxRooms} rooms)`], ['Hotel ID', dt.hotelCode || dt.tenantId], ['Owner', dt.ownerName || '—'],
                  ['Login email', dt.ownerEmail || '—'], ['Phone', dt.phone || '—'], ['Created', fmtDay(dt.createdAt)], ['Subscription ends', fmtDay(dt.subscriptionEnd)],
                  ['Rooms', `${d.metrics.rooms || 0} in ${d.metrics.roomTypes || 0} room types`], ['Bookings', `${d.metrics.bookings || 0} (${d.metrics.checkedIn || 0} in-house, ${d.metrics.upcoming || 0} upcoming)`],
                  ['Booking value', money(d.metrics.bookingValue, dt.currency)], ['Last login', fmtDate(d.metrics.lastLoginAt)], ['Last data change', fmtDate(d.metrics.lastActivityAt)], ['Data stored', `${d.metrics.storageKB || 0} KB`],
                  ['Hotel name (in PMS)', d.property?.propertyName || '—'], ['Location', [d.property?.location?.city, d.property?.location?.state, d.property?.location?.country].filter(Boolean).join(', ') || '—'],
                ].map(([k, v]) => <div key={k} className="card" style={{ padding: '12px 14px' }}><div className="label muted" style={{ marginBottom: 2 }}>{k}</div><div style={{ fontWeight: 700, wordBreak: 'break-word' }}>{v}</div></div>)}
                {dt.notes && <div className="card" style={{ gridColumn: '1 / -1' }}><div className="label muted">Private notes</div>{dt.notes}</div>}
              </div>
            )}
            {detail.tab === 'emails' && (
              <div>
                {!emailLog ? <div className="muted">Loading…</div> : emailLog.error ? <div className="muted">Could not load the email log.</div> : (
                  <>
                    <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', marginBottom: 12 }}>
                      {[['Sent today', `${emailLog.today} / ${emailLog.limit}`], ['Sent in total', emailLog.total], ['Failed', emailLog.failed], ['Emails', emailLog.enabled ? 'On' : 'Blocked']].map(([k, v]) => <div key={k} className="card" style={{ padding: '10px 14px' }}><div className="label muted">{k}</div><div style={{ fontWeight: 800, fontSize: 18 }}>{v}</div></div>)}
                    </div>
                    <div className="tablewrap"><table>
                      <thead><tr><th>When</th><th>Type</th><th>To</th><th>Subject</th><th>Result</th></tr></thead>
                      <tbody>
                        {emailLog.rows.length === 0 && <tr><td colSpan={5} className="muted" style={{ textAlign: 'center', padding: 22 }}>No emails sent yet.</td></tr>}
                        {emailLog.rows.map((r, i) => <tr key={i}><td className="small">{fmtDate(r.createdAt)}</td><td>{r.type}</td><td>{r.to}</td><td className="small">{r.subject}</td><td>{r.status === 'sent' ? '✅ sent' : <span title={r.error} style={{ color: '#b91c1c' }}>❌ failed</span>}</td></tr>)}
                      </tbody>
                    </table></div>
                  </>
                )}
              </div>
            )}
            {detail.tab === 'staff' && (
              <div className="tablewrap"><table>
                <thead><tr><th>Username</th><th>Name</th><th>Role</th><th>Status</th><th>Last login</th><th /></tr></thead>
                <tbody>{d.staff.map((u) => (
                  <tr key={u.username}><td><b>{u.username}</b></td><td>{u.name}<div className="muted small">{u.email}</div></td><td>{u.role}</td><td>{u.status}</td><td className="small">{fmtDate(u.lastLoginAt)}</td>
                    <td><button className="btn sm" onClick={() => { setReset({ tenant: dt, staff: d.staff }); setResetForm({ username: u.username, password: '', sendEmail: true }) }}><KeyRound size={12} /> Reset</button></td></tr>
                ))}</tbody>
              </table></div>
            )}
          </div>
        </Modal>
      )}
    </>
  )
}
