import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { api, setToken } from '../api'

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const res = await api.login(username.trim(), password)
      setToken(res.token)
      onLogin()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login">
      <form className="box" onSubmit={submit}>
        <div className="row" style={{ marginBottom: 6 }}>
          <span style={{ background: 'var(--accent)', width: 38, height: 38, borderRadius: 10, display: 'grid', placeItems: 'center' }}><ShieldCheck size={20} color="#fff" /></span>
          <div><div style={{ fontWeight: 900, fontSize: 18 }}>Super Admin</div><div className="muted small">Manage all your hotels</div></div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 18 }}>
          <div><label className="label">Username</label><input className="input" autoFocus value={username} onChange={(e) => setUsername(e.target.value)} /></div>
          <div><label className="label">Password</label><input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
          {error && <div className="error">{error}</div>}
          <button className="btn dark" type="submit" disabled={busy || !username || !password} style={{ justifyContent: 'center', height: 42 }}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </div>
      </form>
    </div>
  )
}
