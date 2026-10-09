import { useState } from 'react'
import { Copy, Mail } from 'lucide-react'
import { HOTEL_APP_URL } from '../api'

// Login details for the hotel owner: copy / email app / WhatsApp (no email server needed)
export default function CredentialsView({ creds, hotelName, ownerEmail, emailResult, onClose }) {
  const loginUrl = `${HOTEL_APP_URL}${creds.loginUrl || '/login'}`
  const loginId = creds.email || ownerEmail || creds.username
  const hotelCode = creds.hotelCode || creds.hotelId || ''
  const text = `Your hotel PMS login\n\nHotel: ${hotelName}\nHotel Code / ID: ${hotelCode}\nLogin page: ${loginUrl}\nEmail: ${loginId}\nPassword: ${creds.password}\n\nPlease change the password after your first login.`
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }
  return (
    <div className="mbody">
      {emailResult && (emailResult.sent
        ? <div className="notice ok" role="status">✅ Login details were emailed to <b>{emailResult.to}</b>. The owner can log in right away.</div>
        : emailResult.error === 'Not requested'
          ? <div className="notice">No email was sent (you turned it off). Copy the details below and send them yourself.</div>
          : <div className="notice warn" role="alert">⚠️ The email to <b>{emailResult.to}</b> could not be sent{emailResult.error ? `: ${emailResult.error}` : ''}. Copy the details below and send them to the owner yourself.</div>)}
      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: 14, lineHeight: 1.9, fontWeight: 600 }}>
        <div><b>Hotel:</b> {hotelName}</div>
        {hotelCode && <div><b>Hotel Code / ID:</b> <span style={{ fontFamily: 'monospace', background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: 6, border: '1px solid #bae6fd' }}>{hotelCode}</span></div>}
        <div><b>Login page:</b> <a href={loginUrl} target="_blank" rel="noreferrer">{loginUrl}</a></div>
        <div><b>Login (email):</b> {loginId}</div>
        <div><b>Password:</b> <span style={{ fontFamily: 'monospace', background: '#fff', padding: '2px 8px', borderRadius: 6, border: '1px solid #bbf7d0' }}>{creds.password}</span></div>
      </div>
      <div className="small" style={{ color: '#92400e' }}>⚠️ The password is shown only now (it is also in the email, if it was sent).</div>
      <div className="row">
        <button type="button" className="btn dark" onClick={copy}><Copy size={14} /> {copied ? 'Copied!' : 'Copy login details'}</button>
        <a className="btn" href={`mailto:${loginId}?subject=${encodeURIComponent(`Your ${hotelName} PMS login`)}&body=${encodeURIComponent(text)}`}><Mail size={14} /> Send by Email</a>
        <a className="btn" href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">Send on WhatsApp</a>
      </div>
      <div className="row between"><span /><button type="button" className="btn" onClick={onClose}>Done</button></div>
    </div>
  )
}
