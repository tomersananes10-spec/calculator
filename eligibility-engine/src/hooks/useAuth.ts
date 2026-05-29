import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

const BYPASS_AUTH = import.meta.env.VITE_BYPASS_AUTH === 'true'

const MOCK_USER = {
  id: 'mock-user-001',
  email: 'reviewer@eligibility.local',
  user_metadata: { full_name: 'משתמש מקומי' },
} as unknown as User

export function useAuth() {
  const [user, setUser] = useState<User | null>(BYPASS_AUTH ? MOCK_USER : null)
  const [loading, setLoading] = useState(!BYPASS_AUTH)

  useEffect(() => {
    if (BYPASS_AUTH) return

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  }

  async function signInWithEmail(email: string, password: string) {
    return supabase.auth.signInWithPassword({ email, password })
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
  }

  return {
    user,
    loading,
    isAuthenticated: !!user,
    signInWithGoogle,
    signInWithEmail,
    signOut,
  }
}
