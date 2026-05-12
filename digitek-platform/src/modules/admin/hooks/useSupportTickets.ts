import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import type { SupportTicket } from '../types'

export function useSupportTickets() {
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false })
    setTickets((data as SupportTicket[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const updateTicket = useCallback(
    async (id: string, updates: Partial<SupportTicket>) => {
      const { error } = await supabase
        .from('support_tickets')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (!error) {
        setTickets(prev =>
          prev.map(t => (t.id === id ? { ...t, ...updates } : t)),
        )
      }
    },
    [],
  )

  return { tickets, loading, refresh: load, updateTicket }
}
