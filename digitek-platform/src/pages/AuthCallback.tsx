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

    // detectSessionInUrl:true auto-exchanges the code.
    // Poll getSession every 500ms until it appears (max 10s).
    let attempts = 0
    const poll = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        clearInterval(poll)
        navigate('/', { replace: true })
      } else if (++attempts >= 20) {
        clearInterval(poll)
        navigate('/login', { replace: true })
      }
    }, 500)

    return () => clearInterval(poll)
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
