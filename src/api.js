const env = (typeof import.meta !== 'undefined' && import.meta.env) || {}
const defaultBackendUrl = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:5000'
  : (typeof window !== 'undefined'
      ? (window.location.hostname.includes('ahaalo.com')
          ? `${window.location.protocol}//api.ahaalo.com`
          : `${window.location.protocol}//${window.location.hostname.replace(/^admin\./, 'api.')}`)
      : 'http://api.ahaalo.com')

const rawApiUrl = String(
  env.VITE_API_BASE_URL || env.REACT_APP_API_URL || env.VITE_API_URL || defaultBackendUrl
).replace(/\/+$/, '')
export const API_ROOT = rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl}/api`
export const HOTEL_APP_URL = String(
  env.VITE_HOTEL_APP_URL || (typeof window !== 'undefined'
    ? (window.location.hostname.includes('ahaalo.com')
        ? `${window.location.protocol}//app.ahaalo.com`
        : `${window.location.protocol}//${window.location.hostname.replace(/^admin\./, 'app.')}`)
    : 'http://app.ahaalo.com')
).replace(/\/+$/, '')
const SA = `${API_ROOT}/superadmin`

export const getToken = () => localStorage.getItem('superadmin_token')
export const setToken = (t) => localStorage.setItem('superadmin_token', t)
export const clearToken = () => localStorage.removeItem('superadmin_token')

async function call(path, { method = 'GET', body, auth = true } = {}) {
  const res = await fetch(`${SA}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(auth && getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await res.text()
  let data
  try { data = JSON.parse(text) } catch { throw Object.assign(new Error(`Server returned ${res.status}. Is the backend running?`), { status: res.status }) }
  if (!res.ok) throw Object.assign(new Error(data.error || data.message || `Request failed (${res.status})`), { status: res.status })
  return data
}

const qs = (o) => {
  const p = new URLSearchParams()
  Object.entries(o || {}).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') p.set(k, v) })
  const s = p.toString()
  return s ? `?${s}` : ''
}

export const api = {
  login: (username, password) => call('/login', { method: 'POST', body: { username, password }, auth: false }),
  stats: () => call('/stats'),
  tenants: () => call('/tenants'),
  tenantDetail: (id) => call(`/tenants/${id}/detail`),
  createTenant: (b) => call('/tenants', { method: 'POST', body: b }),
  updateTenant: (id, b) => call(`/tenants/${id}`, { method: 'PUT', body: b }),
  deactivate: (id) => call(`/tenants/${id}`, { method: 'DELETE' }),
  purge: (id, confirmName) => call(`/tenants/${id}/purge`, { method: 'POST', body: { confirmName } }),
  resetPassword: (id, b) => call(`/tenants/${id}/reset-password`, { method: 'POST', body: b }),
  impersonate: (id) => call(`/impersonate/${id}`, { method: 'POST' }),
  logs: () => call('/logs'),
  emailStatus: () => call('/email/status'),
  tenantEmails: (id) => call(`/tenants/${id}/emails`),
  async exportHotel(id, fileName) {
    const res = await fetch(`${SA}/tenants/${id}/export`, { headers: { Authorization: `Bearer ${getToken()}` } })
    if (!res.ok) throw new Error('Export failed')
    const blob = await res.blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(a.href)
  },
  // data explorer
  collections: (tenantId) => call(`/data/collections${qs({ tenantId })}`),
  rows: (name, params) => call(`/data/collections/${name}${qs(params)}`),
  doc: (name, id) => call(`/data/collections/${name}/${id}`),
  storeKeys: (tid) => call(`/data/store/${encodeURIComponent(tid)}`),
  storeGet: (tid, key) => call(`/data/store/${encodeURIComponent(tid)}/${encodeURIComponent(key)}`),
  storePut: (tid, key, value) => call(`/data/store/${encodeURIComponent(tid)}/${encodeURIComponent(key)}`, { method: 'PUT', body: { value } }),
  storeDelete: (tid, key) => call(`/data/store/${encodeURIComponent(tid)}/${encodeURIComponent(key)}`, { method: 'DELETE' }),
}

// "Open Hotel": the hotel app (other port) receives the one-time login in the URL #hash
export async function openHotel(tenant) {
  const w = window.open('', '_blank') // opened first so the browser does not block the popup
  try {
    const res = await api.impersonate(tenant._id)
    const payload = { token: res.token, tenantId: res.tenantId, user: res.user, hotelName: res.hotelName || tenant.name, adminUrl: window.location.origin }
    const hash = btoa(unescape(encodeURIComponent(JSON.stringify(payload))))
    const url = `${HOTEL_APP_URL}/impersonate#${hash}`
    if (w) w.location.href = url
    else window.location.href = url
  } catch (e) {
    if (w) w.close()
    throw e
  }
}
