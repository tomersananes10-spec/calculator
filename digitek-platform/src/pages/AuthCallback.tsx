import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const hashParams = new URLSearchParams(window.location.hash.slice(1))

    const error = params.get('error') || hashParams.get('error')
    const errorDesc = params.get('error_description') || hashParams.get('error_description')
    if (error) {
      const msg = errorDesc ? `${error}: ${errorDesc}` : error
      navigate(`/login?auth_error=${encodeURIComponent(msg)}`, { replace: true })
      return
    }

    const code = params.get('code')
    if (!code) {
      navigate('/login', { replace: true })
      return
    }

    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        navigate(`/login?auth_error=${encodeURIComponent(error.message)}`, { replace: true })
      } else {
        navigate('/', { replace: true })
      }
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
