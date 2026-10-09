export const fmtDate = (d) => (d ? new Date(d).toLocaleString(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—')
export const fmtDay = (d) => (d ? new Date(d).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : '—')
export const dayInput = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '')
export const money = (n, c = '$') => `${c}${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
export const daysLeft = (d) => (d ? Math.ceil((new Date(d) - Date.now()) / 86400000) : null)
export const fmtBytes = (n) => (n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(1)} MB`)

// hotelpms_room_numbers_v3  ->  "Room Numbers"
export const humanizeKey = (key) =>
  String(key)
    .replace(/^(hotelpms_|pms_)/, '')
    .replace(/_v\d+$/, '')
    .split('_')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')

// Table-friendly version of one value (long text / images / nested data summarised)
export function short(v) {
  if (v === null || v === undefined) return ''
  if (typeof v === 'string') {
    if (v.startsWith('data:')) return `[file ${Math.round(v.length / 1024)} KB]`
    return v.length > 90 ? `${v.slice(0, 90)}…` : v
  }
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  if (Array.isArray(v)) return `[${v.length} items]`
  if (typeof v === 'object') {
    const s = JSON.stringify(v)
    return s.length <= 50 ? s : `{${Object.keys(v).length} fields}`
  }
  return String(v)
}

export function pickColumns(rows, max = 12) {
  const freq = new Map()
  rows.forEach((r) => Object.keys(r || {}).forEach((k) => freq.set(k, (freq.get(k) || 0) + 1)))
  const pref = ['id', 'no', 'roomNumber', 'name', 'guest', 'guestName', 'room', 'username', 'email', 'type', 'roomType', 'status', 'checkIn', 'checkOut', 'amount', 'totalAmount', 'date']
  return [...freq.keys()]
    .sort((a, b) => {
      const pa = pref.indexOf(a)
      const pb = pref.indexOf(b)
      if (pa !== -1 || pb !== -1) return (pa === -1 ? 99 : pa) - (pb === -1 ? 99 : pb)
      return freq.get(b) - freq.get(a)
    })
    .slice(0, max)
}
