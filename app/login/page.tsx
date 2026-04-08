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
    const normalizedEmail = email.trim().toLowerCase()
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      const authedEmail = data.user?.email?.trim().toLowerCase() ?? normalizedEmail
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('project_id, role')
        .eq('email', authedEmail)
        .maybeSingle()

      if (profileError) {
        setError(profileError.message)
        setLoading(false)
        return
      }

      if (profile?.role === 'admin') {
        window.location.href = '/dashboard'
        return
      }
      const projectId =
        profile && typeof profile.project_id === 'string'
          ? profile.project_id.trim()
          : ''
      if (!projectId) {
        setError('No project assigned to this account.')
        setLoading(false)
        return
      }

      window.location.href = `/project/${projectId}`
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#080A0F',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'sans-serif'
    }}>
      <div style={{
        background: '#0F1219',
        border: '1px solid #1E2535',
        borderRadius: '16px',
        padding: '40px',
        width: '100%',
        maxWidth: '400px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            fontFamily: 'sans-serif',
            fontSize: '36px',
            fontWeight: '700',
            color: '#F4A623',
            letterSpacing: '4px'
          }}>NOOK</div>
          <div style={{
            fontSize: '36px',
            fontWeight: '700',
            color: '#E2E8F8',
            letterSpacing: '4px',
            marginTop: '-8px'
          }}>BUILD</div>
          <div style={{
            fontSize: '11px',
            color: '#4A5568',
            letterSpacing: '3px',
            marginTop: '4px'
          }}>CLIENT PORTAL</div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', color: '#4A5568', marginBottom: '6px', letterSpacing: '1px' }}>EMAIL</div>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            style={{
              width: '100%',
              background: '#080A0F',
              border: '1px solid #1E2535',
              borderRadius: '8px',
              padding: '10px 14px',
              color: '#E2E8F8',
              fontSize: '14px',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '11px', color: '#4A5568', marginBottom: '6px', letterSpacing: '1px' }}>PASSWORD</div>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            style={{
              width: '100%',
              background: '#080A0F',
              border: '1px solid #1E2535',
              borderRadius: '8px',
              padding: '10px 14px',
              color: '#E2E8F8',
              fontSize: '14px',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {error && (
          <div style={{
            background: 'rgba(255,61,87,.1)',
            border: '1px solid rgba(255,61,87,.3)',
            borderRadius: '6px',
            padding: '8px 12px',
            color: '#FF3D57',
            fontSize: '12px',
            marginBottom: '16px'
          }}>{error}</div>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: '100%',
            background: '#F4A623',
            color: '#000',
            border: 'none',
            borderRadius: '8px',
            padding: '12px',
            fontSize: '14px',
            fontWeight: '700',
            cursor: 'pointer',
            letterSpacing: '1px'
          }}
        >
          {loading ? 'SIGNING IN...' : 'SIGN IN →'}
        </button>

        <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '11px', color: '#4A5568' }}>
          Nook Build · Client Portal
        </div>
      </div>
    </div>
  )
}
