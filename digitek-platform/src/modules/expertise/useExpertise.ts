import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { ExpertiseCluster, ExpertiseSpec } from './types'

interface SpecRow {
  id: number
  cluster_id: number
  name: string
  description: string
  activities: string[] | null
  outputs: string[] | null
  scope: string
  start_date: string
  sort_order: number
}

interface ClusterRow {
  cluster_id: number
  name: string
  icon: string
  hue: number
  note: string
  sort_order: number
}

// טוען את כל האשכולות + ההתמחויות מ-Supabase וממזג אותם למבנה מקונן.
export function useExpertise() {
  const [clusters, setClusters] = useState<ExpertiseCluster[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      const [cRes, sRes] = await Promise.all([
        supabase
          .from('expertise_clusters')
          .select('*')
          .order('sort_order', { ascending: true }),
        supabase
          .from('expertise_specializations')
          .select('*')
          .order('sort_order', { ascending: true }),
      ])

      if (cancelled) return

      if (cRes.error || sRes.error) {
        setError(cRes.error?.message || sRes.error?.message || 'שגיאה בטעינת הנתונים')
        setLoading(false)
        return
      }

      const specsByCluster = new Map<number, ExpertiseSpec[]>()
      for (const r of (sRes.data ?? []) as SpecRow[]) {
        const spec: ExpertiseSpec = {
          id: r.id,
          cluster_id: r.cluster_id,
          name: r.name,
          description: r.description,
          activities: Array.isArray(r.activities) ? r.activities : [],
          outputs: Array.isArray(r.outputs) ? r.outputs : [],
          scope: r.scope,
          start_date: r.start_date,
          sort_order: r.sort_order,
        }
        const arr = specsByCluster.get(r.cluster_id) ?? []
        arr.push(spec)
        specsByCluster.set(r.cluster_id, arr)
      }

      const merged: ExpertiseCluster[] = ((cRes.data ?? []) as ClusterRow[]).map(c => ({
        cluster_id: c.cluster_id,
        name: c.name,
        icon: c.icon,
        hue: c.hue,
        note: c.note,
        sort_order: c.sort_order,
        specs: specsByCluster.get(c.cluster_id) ?? [],
      }))

      setClusters(merged)
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [])

  return { clusters, loading, error }
}
