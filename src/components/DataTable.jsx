import { short } from '../utils'

// Generic table: rows are objects, columns are keys. `hotelNames` maps tenantId -> hotel name.
export default function DataTable({ columns, rows, onRowClick, selectedIndex, hotelNames, emptyText = 'No data' }) {
  if (!rows.length) return <div className="tablewrap"><div className="empty">{emptyText}</div></div>
  return (
    <div className="tablewrap" style={{ maxHeight: 'calc(100vh - 290px)' }}>
      <table>
        <thead>
          <tr>{columns.map((c) => <th key={c}>{c === 'tenantId' ? 'hotel' : c}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r._id || i} className={`click${selectedIndex === i ? ' sel' : ''}`} onClick={() => onRowClick?.(r, i)}>
              {columns.map((c) => {
                const v = r[c]
                const text = c === 'tenantId' && hotelNames ? hotelNames[v] || v : short(v)
                return <td key={c} className="cell" title={typeof text === 'string' ? text : ''}>{text}</td>
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
