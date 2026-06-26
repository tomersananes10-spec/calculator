import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../hooks/useAuth'
import type { Journey } from '../types'

export function useJourneys() {
  const { user } = useAuth()
  const [journeys, setJourneys] = useState<Journey[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!user) {
      setJourneys([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error } = await supabase
      .from('journeys')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      setError(error.message)
      setJourneys([])
    } else {
      setError(null)
      setJourneys((data ?? []) as Journey[])
    }
    setLoading(false)
  }, [user])

  useEffect(() => { void refresh() }, [refresh])

  return { journeys, loading, error, refresh }
}
