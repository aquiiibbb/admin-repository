import { useEffect, useMemo, useRef, useState } from 'react'
import { Database, Search, RefreshCw, Save, Trash2, Copy, X, Building2, Info } from 'lucide-react'
import { api, openHotel } from '../api'
import { humanizeKey, pickColumns, fmtBytes, fmtDate } from '../utils'
import DataTable from '../components/DataTable'
import JsonView from '../components/JsonView'

const PAGE = 25
const BIG = 3 * 1024 * 1024 // above this the whole value is not shown as one JSON text box

function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value)
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t) }, [value, ms])
  return v
}

// keep long image strings out of the search text
const clip = (k, v) => (typeof v === 'string' && v.startsWith('data:') ? '' : v)

function Pager({ page, pages, total, onPage, label = 'rows' }) {
  return (
    <div className="pager">
      <span>{total} {label}</span>
      <div className="row">
        <button className="btn sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>← Prev</button>
        <span>Page {page} / {pages}</span>
        <button className="btn sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next →</button>
      </div>
    </div>
  )
}

export default function DataExplorer({ initialHotel, onError }) {
  const [tenants, setTenants] = useState([])
  const [hotel, setHotel] = useState(initialHotel || '') // tenantId, '' = all hotels
  const [colls, setColls] = useState([])
  const [rawKeys, setRawKeys] = useState([])
  const [keyFilter, setKeyFilter] = useState('')
  const [sel, setSel] = useState({ kind: 'coll', name: 'bookings' })
  const [q, setQ] = useState('')
  const dq = useDebounced(q)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const [table, setTable] = useState({ rows: [], columns: [], total: 0, pages: 1 }) // collections (server paged)
  const [raw, setRaw] = useState(null) // { key, text, rev, parsed, isJson }
  const [mode, setMode] = useState('table') // raw: table | json
  const [jsonText, setJsonText] = useState('')
  const [drawer, setDrawer] = useState(null) // { title, value, rawIndex?, text? }
  const [saving, setSaving] = useState(false)
  const reqId = useRef(0)

  const hotelNames = useMemo(() => Object.fromEntries(tenants.map((t) => [t.tenantId, t.name])), [tenants])
  const fail = (e) => { if (!onError(e)) setErr(e.message) }

  useEffect(() => { api.tenants().then(setTenants).catch(fail) /* eslint-disable-next-line */ }, [])

  const loadSidebar = async () => {
    try {
      setColls(await api.collections(hotel))
      setRawKeys(hotel ? await api.storeKeys(hotel) : [])
    } catch (e) { fail(e) }
  }
  useEffect(() => { loadSidebar() /* eslint-disable-next-line */ }, [hotel])

  // load the selected collection page / saved-data key
  const loadMain = async () => {
    const id = ++reqId.current
    setLoading(true); setErr('')
    try {
      if (sel.kind === 'coll') {
        const r = await api.rows(sel.name, { tenantId: hotel, q: dq, page, limit: PAGE })
        if (id === reqId.current) setTable(r)
      } else {
        const r = await api.storeGet(hotel, sel.key)
        let parsed = null; let isJson = false
        try { parsed = JSON.parse(r.value); isJson = true } catch { /* plain text */ }
        if (id === reqId.current) {
          setRaw({ key: r.key, text: r.value, rev: r.rev, parsed, isJson, updatedAt: r.updatedAt })
          setJsonText(r.value.length > BIG ? '' : isJson ? JSON.stringify(parsed, null, 2) : r.value)
        }
      }
    } catch (e) { if (id === reqId.current) { fail(e); if (sel.kind === 'raw') setRaw(null) } } finally { if (id === reqId.current) setLoading(false) }
  }
  useEffect(() => { loadMain() /* eslint-disable-next-line */ }, [hotel, sel, dq, page])

  const pickHotel = (v) => { setHotel(v); setPage(1); setQ(''); setDrawer(null); if (!v && sel.kind === 'raw') setSel({ kind: 'coll', name: 'bookings' }) }
  const pickColl = (name) => { setSel({ kind: 'coll', name }); setPage(1); setQ(''); setDrawer(null); setMode('table') }
  const pickRaw = (key) => { setSel({ kind: 'raw', key }); setPage(1); setQ(''); setDrawer(null); setMode('table'); setRaw(null) }

  // ---------- saved-data (raw) as a table ----------
  const items = useMemo(() => (raw?.isJson && Array.isArray(raw.parsed) ? raw.parsed : null), [raw])
  const rawRows = useMemo(() => (items ? items.map((it, i) => ({ it, i, row: it && typeof it === 'object' && !Array.isArray(it) ? it : { value: it }, hay: JSON.stringify(it, clip).toLowerCase() })) : []), [items])
  const rawFiltered = useMemo(() => (dq ? rawRows.filter((r) => r.hay.includes(dq.toLowerCase())) : rawRows), [rawRows, dq])
  const rawPages = Math.max(Math.ceil(rawFiltered.length / PAGE), 1)
  const rawPageRows = rawFiltered.slice((page - 1) * PAGE, page * PAGE)
  const rawColumns = useMemo(() => pickColumns(rawRows.slice(0, 300).map((r) => r.row)), [rawRows])

  const putValue = async (text) => {
    setSaving(true); setErr('')
    try {
      await api.storePut(hotel, sel.key, text)
      setDrawer(null)
      await Promise.all([loadMain(), loadSidebar()])
    } catch (e) { fail(e); alert(e.message) } finally { setSaving(false) }
  }

  const openCollDoc = async (row) => {
    try { setDrawer({ title: `${table.label} • ${row._id}`, value: await api.doc(sel.name, row._id), readOnly: true }) } catch (e) { fail(e) }
  }
  const openRawRow = (r) => setDrawer({ title: `${humanizeKey(sel.key)} • item ${r.i + 1}`, value: r.it, rawIndex: r.i, text: JSON.stringify(r.it, null, 2) })

  const saveRow = async () => {
    let parsedRow
    try { parsedRow = JSON.parse(drawer.text) } catch { alert('This is not valid JSON. Nothing was saved.'); return }
    const next = [...raw.parsed]; next[drawer.rawIndex] = parsedRow
    await putValue(JSON.stringify(next))
  }
  const deleteRow = async () => {
    if (!window.confirm('Delete this item permanently from the hotel data?')) return
    const next = raw.parsed.filter((_, i) => i !== drawer.rawIndex)
    await putValue(JSON.stringify(next))
  }
  const saveWhole = async () => {
    if (raw.isJson) { try { JSON.parse(jsonText) } catch { alert('This is not valid JSON. Nothing was saved.'); return } }
    if (!window.confirm(`Save changes to "${humanizeKey(raw.key)}" for ${hotelNames[hotel] || hotel}? The hotel will see the change.`)) return
    await putValue(jsonText)
  }
  const clearKey = async () => {
    if (!window.confirm(`${items ? 'Empty' : 'Delete'} "${humanizeKey(raw.key)}" for ${hotelNames[hotel] || hotel}? This cannot be undone.`)) return
    setSaving(true)
    try { await api.storeDelete(hotel, raw.key); setDrawer(null); await Promise.all([loadMain(), loadSidebar()]) } catch (e) { fail(e); alert(e.message) } finally { setSaving(false) }
  }

  const copy = (text) => navigator.clipboard?.writeText(text).catch(() => {})
  const visibleKeys = rawKeys.filter((k) => !keyFilter || humanizeKey(k.key).toLowerCase().includes(keyFilter.toLowerCase()) || k.key.toLowerCase().includes(keyFilter.toLowerCase()))
  const selTenant = tenants.find((t) => t.tenantId === hotel)
  const title = sel.kind === 'coll' ? (table.label || colls.find((c) => c.name === sel.name)?.label || sel.name) : humanizeKey(sel.key)

  return (
    <>
      <div className="page-head">
        <div><h1>Data Explorer</h1><p>Browse everything saved in the database — like MongoDB, but per hotel. Pick a hotel on the left.</p></div>
        <div className="row">
          {selTenant && <button className="btn dark" onClick={() => openHotel(selTenant).catch(fail)}>Open this hotel</button>}
          <button className="btn" onClick={() => { loadSidebar(); loadMain() }}><RefreshCw size={15} /> Refresh</button>
        </div>
      </div>

      <div className="explorer">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="panel">
            <h4>Hotel</h4>
            <div style={{ padding: 12 }}>
              <select className="select" value={hotel} onChange={(e) => pickHotel(e.target.value)} aria-label="Hotel">
                <option value="">All hotels</option>
                {tenants.map((t) => <option key={t.tenantId} value={t.tenantId}>{t.name}</option>)}
              </select>
            </div>
          </div>

          <div className="panel">
            <h4>Database collections</h4>
            <div className="list">
              {colls.map((c) => (
                <button key={c.name} className={`${sel.kind === 'coll' && sel.name === c.name ? 'on' : ''}${c.count === 0 ? ' zero' : ''}`} onClick={() => pickColl(c.name)}>
                  <span>{c.label}</span><span className="cnt">{c.count}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="panel">
            <h4>Saved data (all modules, editable)</h4>
            {!hotel ? <div className="muted small" style={{ padding: 14 }}>Select a hotel to see everything it has saved (folios, payments, expenses, settings …).</div> : (
              <>
                <div style={{ padding: 10 }}><input className="input" style={{ height: 34 }} placeholder="Filter…" value={keyFilter} onChange={(e) => setKeyFilter(e.target.value)} /></div>
                <div className="list" style={{ maxHeight: 360, overflow: 'auto' }}>
                  {visibleKeys.length === 0 && <div className="muted small" style={{ padding: 14 }}>Nothing saved yet — this hotel is blank.</div>}
                  {visibleKeys.map((k) => (
                    <button key={k.key} title={k.key} className={`${sel.kind === 'raw' && sel.key === k.key ? 'on' : ''}${k.count === 0 ? ' zero' : ''}`} onClick={() => pickRaw(k.key)}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{humanizeKey(k.key)}</span>
                      <span className="cnt">{k.count ?? '·'}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div style={{ minWidth: 0 }}>
          <div className="card row between" style={{ marginBottom: 12 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16 }}><Database size={15} style={{ verticalAlign: -2 }} /> {title}</div>
              <div className="muted small"><Building2 size={12} style={{ verticalAlign: -1 }} /> {hotel ? hotelNames[hotel] || hotel : 'All hotels'}{sel.kind === 'raw' && raw ? ` • v${raw.rev} • ${fmtBytes(raw.text.length)} • changed ${fmtDate(raw.updatedAt)}` : ''}</div>
            </div>
            <div className="row">
              {sel.kind === 'raw' && items && <div className="tabs" style={{ margin: 0, border: 'none' }}>{[['table', 'Table'], ['json', 'JSON']].map(([k, l]) => <button key={k} className={mode === k ? 'on' : ''} onClick={() => setMode(k)}>{l}</button>)}</div>}
              {(mode === 'table' || sel.kind === 'coll') && (
                <div style={{ position: 'relative' }}>
                  <Search size={15} color="#64748b" style={{ position: 'absolute', left: 11, top: 12 }} />
                  <input className="input" style={{ width: 240, paddingLeft: 34 }} placeholder="Search…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} />
                </div>
              )}
            </div>
          </div>

          {err && <div className="error" style={{ marginBottom: 12 }}>{err}</div>}
          {sel.kind === 'raw' && !hotel && <div className="card muted">Select a hotel first.</div>}

          {sel.kind === 'coll' && (
            <>
              <DataTable columns={table.columns} rows={table.rows} hotelNames={hotelNames} onRowClick={openCollDoc} emptyText={loading ? 'Loading…' : q ? 'Nothing matches your search.' : 'No documents in this collection for this hotel.'} />
              <Pager page={table.page || page} pages={table.pages} total={table.total} label="documents" onPage={setPage} />
              <div className="muted small row" style={{ marginTop: 2 }}><Info size={13} /> This is a read-only view of the database collection. To change data, use "Saved data" on the left or "Open this hotel".</div>
            </>
          )}

          {sel.kind === 'raw' && hotel && raw && (
            <>
              {items && mode === 'table' && (
                <>
                  <DataTable columns={rawColumns} rows={rawPageRows.map((r) => ({ ...r.row, _id: `${r.i}` }))} onRowClick={(row, idx) => openRawRow(rawPageRows[idx])} emptyText={dq ? 'Nothing matches your search.' : 'This list is empty.'} />
                  <Pager page={page} pages={rawPages} total={rawFiltered.length} label="items" onPage={setPage} />
                </>
              )}
              {(!items || mode === 'json') && (
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {raw.text.length > BIG ? (
                    <div className="muted">This value is {fmtBytes(raw.text.length)} — too large to edit as one text box. {items ? 'Use the Table view and click a row to edit it.' : ''}</div>
                  ) : (
                    <textarea className="textarea" rows={22} spellCheck={false} value={jsonText} onChange={(e) => setJsonText(e.target.value)} />
                  )}
                  <div className="row between">
                    <button className="btn danger" onClick={clearKey} disabled={saving}><Trash2 size={14} /> {items ? 'Empty this list' : 'Delete this data'}</button>
                    {raw.text.length <= BIG && <button className="btn dark" onClick={saveWhole} disabled={saving}><Save size={14} /> {saving ? 'Saving…' : 'Save changes'}</button>}
                  </div>
                </div>
              )}
              {items && mode === 'table' && (
                <div className="row between" style={{ marginTop: 4 }}>
                  <div className="muted small row"><Info size={13} /> Click a row to view / edit / delete it. Changes are saved straight into the hotel's data.</div>
                  <button className="btn sm danger" onClick={clearKey} disabled={saving}><Trash2 size={13} /> Empty this list</button>
                </div>
              )}
            </>
          )}
          {sel.kind === 'raw' && hotel && !raw && !err && <div className="card muted">{loading ? 'Loading…' : ''}</div>}
        </div>
      </div>

      {drawer && (
        <>
          <div className="overlay" style={{ background: 'rgba(15,23,42,.35)' }} onClick={() => setDrawer(null)} />
          <div className="drawer">
            <div className="mhead">
              <h3 style={{ fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis' }}>{drawer.title}</h3>
              <div className="row">
                <button className="btn sm" onClick={() => copy(drawer.text ?? JSON.stringify(drawer.value, null, 2))}><Copy size={13} /> Copy</button>
                <button className="btn sm" onClick={() => setDrawer(null)} aria-label="Close"><X size={15} /></button>
              </div>
            </div>
            <div className="dbody">
              {drawer.readOnly ? <JsonView value={drawer.value} /> : (
                <textarea className="textarea" style={{ width: '100%', minHeight: '60vh' }} spellCheck={false} value={drawer.text} onChange={(e) => setDrawer({ ...drawer, text: e.target.value })} />
              )}
            </div>
            {!drawer.readOnly && (
              <div className="mhead" style={{ borderTop: '1px solid var(--line)', borderBottom: 'none' }}>
                <button className="btn danger" onClick={deleteRow} disabled={saving}><Trash2 size={14} /> Delete item</button>
                <button className="btn dark" onClick={saveRow} disabled={saving}><Save size={14} /> {saving ? 'Saving…' : 'Save item'}</button>
              </div>
            )}
          </div>
        </>
      )}
    </>
  )
}
