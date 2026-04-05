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
      const msg = errorDesc ? `${errorParam}: ${errorDesc}` : errorParam
      navigate(`/login?auth_error=${encodeURIComponent(msg)}`, { replace: true })
      return
    }

    // detectSessionInUrl:true handles code exchange automatically.
    // We just wait for the session to appear (SIGNED_IN / INITIAL_SESSION).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        subscription.unsubscribe()
        navigate('/', { replace: true })
      }
      // INITIAL_SESSION fires with session=null before code exchange completes — ignore it
    })

    // Fallback: if no event fires in 5s, check session directly
    const timeout = setTimeout(async () => {
      subscription.unsubscribe()
      const { data: { session } } = await supabase.auth.getSession()
      navigate(session ? '/' : '/login', { replace: true })
    }, 5000)

    return () => { subscription.unsubscribe(); clearTimeout(timeout) }
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
