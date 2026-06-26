import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../hooks/useAuth'
import { fetchAdvisorResponse } from '../lib/advisor'
import type { Journey, JourneyStep, JourneyWithSteps } from '../types'

export function useJourney(journeyId: string | null) {
  const [journey, setJourney] = useState<JourneyWithSteps | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!journeyId) {
      setJourney(null)
      return
    }
    setLoading(true)
    const [j, s] = await Promise.all([
      supabase.from('journeys').select('*').eq('id', journeyId).maybeSingle(),
      supabase.from('journey_steps').select('*').eq('journey_id', journeyId).order('order_index'),
    ])
    if (j.error) {
      setError(j.error.message)
      setJourney(null)
    } else if (!j.data) {
      setError('המסע לא נמצא')
      setJourney(null)
    } else {
      setError(null)
      setJourney({ ...(j.data as Journey), steps: (s.data ?? []) as JourneyStep[] })
    }
    setLoading(false)
  }, [journeyId])

  useEffect(() => { void refresh() }, [refresh])

  return { journey, loading, error, refresh }
}

/**
 * Create a new journey: call Gemini, then INSERT journey + steps.
 * Returns the new journey id.
 */
export function useCreateJourney() {
  const { user } = useAuth()
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const create = useCallback(async (wish: string, signal?: AbortSignal): Promise<string | null> => {
    if (!user) {
      setError('משתמש לא מחובר')
      return null
    }
    setCreating(true)
    setError(null)
    try {
      const advisor = await fetchAdvisorResponse(wish, signal)

      const { data: journey, error: jerr } = await supabase
        .from('journeys')
        .insert({
          user_id: user.id,
          wish_text: wish.trim(),
          ai_summary: advisor.summary,
          ai_tags: advisor.tags,
        })
        .select('id')
        .single()

      if (jerr || !journey) {
        throw new Error(jerr?.message ?? 'יצירת מסע נכשלה')
      }

      const stepsPayload = advisor.steps.map((s, idx) => ({
        journey_id: journey.id,
        order_index: idx,
        module_key: s.module_key,
        title: s.title,
        description: s.description,
        prefill_params: s.prefill_params,
        status: 'active' as const,
      }))

      const { error: serr } = await supabase.from('journey_steps').insert(stepsPayload)
      if (serr) {
        throw new Error(`יצירת שלבים נכשלה: ${serr.message}`)
      }

      return journey.id as string
    } catch (e) {
      const msg = (e as Error).message
      setError(msg)
      return null
    } finally {
      setCreating(false)
    }
  }, [user])

  return { create, creating, error }
}
