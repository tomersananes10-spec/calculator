import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import type { DevTask } from '../types'

export function useDevTasks() {
  const [tasks, setTasks] = useState<DevTask[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('dev_tasks')
      .select('*')
      .order('created_at', { ascending: false })
    setTasks((data as DevTask[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const addTask = useCallback(
    async (task: Omit<DevTask, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('dev_tasks')
        .insert(task)
        .select()
        .single()
      if (!error && data) {
        setTasks(prev => [data as DevTask, ...prev])
      }
    },
    [],
  )

  const updateTask = useCallback(
    async (id: string, updates: Partial<DevTask>) => {
      const { error } = await supabase
        .from('dev_tasks')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (!error) {
        setTasks(prev =>
          prev.map(t => (t.id === id ? { ...t, ...updates } : t)),
        )
      }
    },
    [],
  )

  const deleteTask = useCallback(async (id: string) => {
    const { error } = await supabase.from('dev_tasks').delete().eq('id', id)
    if (!error) {
      setTasks(prev => prev.filter(t => t.id !== id))
    }
  }, [])

  return { tasks, loading, refresh: load, addTask, updateTask, deleteTask }
}
