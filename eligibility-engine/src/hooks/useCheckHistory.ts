import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { CheckResult, HumanDecision } from '../modules/engine/types'

export interface SavedCheck {
  id: string
  candidate_name: string
  candidate_company: string | null
  role_template_id: string
  role_template_name: string
  cv_text: string
  overall_status: string
  overall_score: number
  estimated_years: number
  results: any
  status: string
  created_at: string
  decision?: {
    requirement_decisions: Record<string, HumanDecision>
    overall_decision: string
    decision_notes: string
  }
}

export function useCheckHistory() {
  const [checks, setChecks] = useState<SavedCheck[]>([])
  const [loading, setLoading] = useState(true)

  const fetchChecks = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('eligibility_checks')
      .select('*, decisions(*)')
      .order('created_at', { ascending: false })
      .limit(50)

    if (!error && data) {
      setChecks(data.map(row => ({
        ...row,
        decision: row.decisions?.[0] ?? undefined,
      })))
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchChecks() }, [fetchChecks])

  async function uploadCvFile(file: File, userId: string): Promise<string | null> {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
    const path = `${userId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage
      .from('cv-files')
      .upload(path, file, { contentType: file.type })
    if (error) {
      console.error('CV upload error:', error)
      return null
    }
    return path
  }

  async function saveCheck(params: {
    candidateName: string
    candidateCompany: string
    roleTemplateId: string
    roleTemplateName: string
    cvText: string
    checkResult: CheckResult
    cvFile?: File
  }) {
    const { data: candidate } = await supabase
      .from('candidates')
      .insert({
        full_name: params.candidateName,
        company: params.candidateCompany || null,
        created_by: (await supabase.auth.getUser()).data.user?.id,
      })
      .select('id')
      .single()

    const userId = (await supabase.auth.getUser()).data.user?.id
    let cvFilePath: string | null = null
    if (params.cvFile && userId) {
      cvFilePath = await uploadCvFile(params.cvFile, userId)
    }

    const { data, error } = await supabase
      .from('eligibility_checks')
      .insert({
        candidate_id: candidate?.id ?? null,
        candidate_name: params.candidateName,
        candidate_company: params.candidateCompany || null,
        role_template_id: params.roleTemplateId,
        role_template_name: params.roleTemplateName,
        cv_text: params.cvText,
        cv_file_path: cvFilePath,
        engine_version: params.checkResult.metadata.engineVersion,
        overall_status: params.checkResult.overallStatus,
        overall_score: params.checkResult.overallScore,
        estimated_years: params.checkResult.estimatedYears,
        results: params.checkResult.results,
        checked_by: userId,
      })
      .select('id')
      .single()

    if (error) throw error
    return data?.id
  }

  async function saveDecision(params: {
    checkId: string
    decisions: Record<string, HumanDecision>
    notes: string
  }) {
    const allApproved = Object.values(params.decisions).every(d => d === 'approved')
    const anyRejected = Object.values(params.decisions).some(d => d === 'rejected')
    const overallDecision = anyRejected ? 'rejected' : allApproved ? 'approved' : 'requires_docs'

    const { error } = await supabase
      .from('decisions')
      .insert({
        check_id: params.checkId,
        requirement_decisions: params.decisions,
        overall_decision: overallDecision,
        decision_notes: params.notes || null,
        decided_by: (await supabase.auth.getUser()).data.user?.id,
      })

    if (!error) {
      await supabase
        .from('eligibility_checks')
        .update({ status: 'decided' })
        .eq('id', params.checkId)
    }

    if (error) throw error
    await fetchChecks()
  }

  return { checks, loading, fetchChecks, saveCheck, saveDecision }
}
