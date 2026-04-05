import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const search = new URLSearchParams(window.location.search)
    const hash = new URLSearchParams(window.location.hash.slice(1))

    const errorParam = search.get('error') || hash.get('error')
    const errorDesc = search.get('error_description') || hash.get('error_description')
    if (errorParam) {
      const msg = errorDesc ? `oauth_error:${errorParam}:${errorDesc}` : `oauth_error:${errorParam}`
      navigate(`/login?auth_error=${encodeURIComponent(msg)}`, { replace: true })
      return
    }

    // PKCE flow: Supabase returns ?code=...
    const code = search.get('code')
    if (code) {
      supabase.auth.exchangeCodeForSession(code)
        .then(({ error }) => navigate(error ? '/login' : '/', { replace: true }))
      return
    }

    // Implicit flow fallback: tokens arrive as #access_token=...
    const accessToken = hash.get('access_token')
    const refreshToken = hash.get('refresh_token') ?? ''
    if (accessToken) {
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error }) => navigate(error ? '/login' : '/', { replace: true }))
      return
    }

    // No params — maybe session was already set by detectSessionInUrl
    supabase.auth.getSession().then(({ data: { session } }) => {
      navigate(session ? '/' : '/login', { replace: true })
    })
  }, [navigate])

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--text3)',
      fontSize: '14px',
    }}>
      מתחבר...
    </div>
  )
}
