'use client'
import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    setLoading(true)
    setError('')
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })
    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }
    const uid = data.user?.id
    if (!uid) {
      setError('Login failed.')
      setLoading(false)
      return
    }
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, project_id')
      .eq('id', uid)
      .maybeSingle()
    if (profile?.role === 'admin') {
      window.location.href = '/dashboard'
    } else if (profile?.project_id) {
      window.location.href = '/project/' + profile.project_id
    } else {
      setError('No project assigned to this account.')
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#080A0F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#0F1219', border: '1px solid #1E2535', borderRadius: '16px', padding: '40px', width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '36px', fontWeight: '700', color: '#F4A623', letterSpacing: '4px' }}>NOOK</div>
          <div style={{ fontSize: '36px', fontWeight: '700', color: '#E2E8F8', letterSpacing: '4px' }}>BUILD</div>
          <div style={{ fontSize: '11px', color: '#4A5568', letterSpacing: '3px', marginTop: '4px' }}>CLIENT PORTAL</div>
        </div>
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', color: '#4A5568', marginBottom: '6px' }}>EMAIL</div>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" style={{ width: '100%', background: '#080A0F', border: '1px solid #1E2535', borderRadius: '8px', padding: '10px 14px', color: '#E2E8F8', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '11px', color: '#4A5568', marginBottom: '6px' }}>PASSWORD</div>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && handleLogin()} style={{ width: '100%', background: '#080A0F', border: '1px solid #1E2535', borderRadius: '8px', padding: '10px 14px', color: '#E2E8F8', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        {error && <div style={{ background: 'rgba(255,61,87,.1)', border: '1px solid rgba(255,61,87,.3)', borderRadius: '6px', padding: '8px 12px', color: '#FF3D57', fontSize: '12px', marginBottom: '16px' }}>{error}</div>}
        <button onClick={handleLogin} disabled={loading} style={{ width: '100%', background: '#F4A623', color: '#000', border: 'none', borderRadius: '8px', padding: '12px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
          {loading ? 'SIGNING IN...' : 'SIGN IN'}
        </button>
      </div>
    </div>
  )
}
