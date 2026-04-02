import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { BriefRecord, WizardState } from '../modules/brief-generator/types'

export function useBriefs() {
  const [briefs, setBriefs] = useState<BriefRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBriefs()
  }, [])

  async function fetchBriefs() {
    setLoading(true)
    const { data } = await supabase
      .from('briefs')
      .select('*')
      .order('updated_at', { ascending: false })
    setBriefs((data as BriefRecord[]) ?? [])
    setLoading(false)
  }

  async function createBrief(): Promise<BriefRecord> {
    const { data, error } = await supabase
      .from('briefs')
      .insert({ title: 'טיוטה ללא שם', state: {}, user_id: (await supabase.auth.getUser()).data.user?.id })
      .select()
      .single()
    if (error) throw error
    const record = data as BriefRecord
    setBriefs(prev => [record, ...prev])
    return record
  }

  async function saveBrief(id: string, state: WizardState, title?: string): Promise<void> {
    const { error } = await supabase
      .from('briefs')
      .update({
        state,
        title: title || 'טיוטה ללא שם',
        cluster_id: state.identification.selectedCluster?.id ?? null,
        specialization_id: state.identification.selectedSpecialization?.id ?? null,
      })
      .eq('id', id)
    if (error) throw error
    setBriefs(prev =>
      prev.map(b =>
        b.id === id
          ? { ...b, state, title: title || b.title, updated_at: new Date().toISOString() }
          : b
      )
    )
  }

  async function loadBrief(id: string): Promise<BriefRecord | null> {
    const { data } = await supabase
      .from('briefs')
      .select('*')
      .eq('id', id)
      .single()
    return (data as BriefRecord) ?? null
  }

  async function deleteBrief(id: string): Promise<void> {
    const { error } = await supabase.from('briefs').delete().eq('id', id)
    if (error) throw error
    setBriefs(prev => prev.filter(b => b.id !== id))
  }

  return { briefs, loading, createBrief, saveBrief, loadBrief, deleteBrief, fetchBriefs }
}
