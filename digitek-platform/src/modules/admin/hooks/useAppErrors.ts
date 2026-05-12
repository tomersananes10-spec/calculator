import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import type { AppErrorRecord } from '../types'

export function useAppErrors() {
  const [errors, setErrors] = useState<AppErrorRecord[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('app_errors')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
    setErrors((data as AppErrorRecord[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const clearOld = useCallback(async () => {
    const cutoff = new Date(Date.now() - 7 * 86400000).toISOString()
    await supabase.from('app_errors').delete().lt('created_at', cutoff)
    await load()
  }, [load])

  return { errors, loading, refresh: load, clearOld }
}
