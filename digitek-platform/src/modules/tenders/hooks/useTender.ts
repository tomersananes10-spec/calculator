// תיק הליך בודד — נתוני tender + ישויות קשורות

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import type {
  Tender,
  TenderApprovalRequest,
  TenderAuditLog,
  TenderBudget,
  TenderContract,
  TenderDocument,
  TenderGuarantee,
  TenderInsurance,
  TenderInvoice,
  TenderMilestone,
  TenderPersona,
  TenderProposal,
  TenderProtocol,
  TenderPurchaseOrder,
  TenderSigner,
  TenderVendor,
  TenderVendorEvaluation,
} from '../types'

export interface TenderDetailData {
  tender: Tender | null
  budget: TenderBudget | null
  documents: TenderDocument[]
  proposals: TenderProposal[]
  contracts: TenderContract[]
  milestones: TenderMilestone[]
  protocols: TenderProtocol[]
  personas: TenderPersona[]
  auditLog: TenderAuditLog[]
  approvalRequests: TenderApprovalRequest[]
  vendors: TenderVendor[]
  guarantees: TenderGuarantee[]
  insurance: TenderInsurance[]
  purchaseOrders: TenderPurchaseOrder[]
  invoices: TenderInvoice[]
  vendorEvaluations: TenderVendorEvaluation[]
  signers: TenderSigner[]
}

export interface UseTenderResult extends TenderDetailData {
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

const EMPTY: TenderDetailData = {
  tender: null,
  budget: null,
  documents: [],
  proposals: [],
  contracts: [],
  milestones: [],
  protocols: [],
  personas: [],
  auditLog: [],
  approvalRequests: [],
  vendors: [],
  guarantees: [],
  insurance: [],
  purchaseOrders: [],
  invoices: [],
  vendorEvaluations: [],
  signers: [],
}

export function useTender(tenderId: string | undefined): UseTenderResult {
  const [data, setData] = useState<TenderDetailData>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!tenderId) {
      setData(EMPTY)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)

    const [
      tenderRes,
      budgetRes,
      docsRes,
      proposalsRes,
      contractsRes,
      milestonesRes,
      protocolsRes,
      personasRes,
      auditRes,
      approvalsRes,
      vendorsRes,
      poRes,
      evalsRes,
      signersRes,
    ] = await Promise.all([
      supabase.from('tenders').select('*').eq('id', tenderId).maybeSingle(),
      supabase.from('tender_budgets').select('*').eq('tender_id', tenderId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('tender_documents').select('*').eq('tender_id', tenderId).order('created_at', { ascending: false }),
      supabase.from('tender_proposals').select('*').eq('tender_id', tenderId).order('rank', { ascending: true, nullsFirst: false }),
      supabase.from('tender_contracts').select('*').eq('tender_id', tenderId).order('created_at', { ascending: false }),
      supabase.from('tender_milestones').select('*').eq('tender_id', tenderId).order('sequence_no', { ascending: true }),
      supabase.from('tender_protocols').select('*').eq('tender_id', tenderId).order('created_at', { ascending: false }),
      supabase.from('tender_personas').select('*').eq('tender_id', tenderId).eq('active', true),
      supabase.from('tender_audit_log').select('*').eq('tender_id', tenderId).order('occurred_at', { ascending: false }).limit(100),
      supabase.from('tender_approval_requests').select('*').eq('tender_id', tenderId).order('created_at', { ascending: false }),
      supabase.from('tender_vendors').select('*').order('name', { ascending: true }),
      supabase.from('tender_purchase_orders').select('*').eq('tender_id', tenderId).order('created_at', { ascending: false }),
      supabase.from('tender_vendor_evaluations').select('*').eq('tender_id', tenderId),
      supabase.from('tender_signers').select('*').eq('tender_id', tenderId).order('added_at', { ascending: false }),
    ])

    const firstError = [tenderRes, budgetRes, docsRes, proposalsRes, contractsRes, milestonesRes, protocolsRes, personasRes, auditRes, approvalsRes, vendorsRes, poRes, evalsRes, signersRes]
      .find(r => r.error)?.error
    if (firstError) {
      setError(firstError.message)
      setLoading(false)
      return
    }

    // Fetch guarantees + insurance based on contract IDs (separate query)
    const contractIds = ((contractsRes.data ?? []) as TenderContract[]).map(c => c.id)
    const [guaranteesRes, insuranceRes, invoicesRes] = contractIds.length === 0
      ? [{ data: [], error: null }, { data: [], error: null }, { data: [], error: null }]
      : await Promise.all([
          supabase.from('tender_guarantees').select('*').in('contract_id', contractIds),
          supabase.from('tender_insurance').select('*').in('contract_id', contractIds),
          supabase.from('tender_invoices').select('*').in('milestone_id', ((milestonesRes.data ?? []) as TenderMilestone[]).map(m => m.id).concat(['00000000-0000-0000-0000-000000000000'])),
        ])

    setData({
      tender: (tenderRes.data as Tender | null) ?? null,
      budget: (budgetRes.data as TenderBudget | null) ?? null,
      documents: (docsRes.data ?? []) as TenderDocument[],
      proposals: (proposalsRes.data ?? []) as TenderProposal[],
      contracts: (contractsRes.data ?? []) as TenderContract[],
      milestones: (milestonesRes.data ?? []) as TenderMilestone[],
      protocols: (protocolsRes.data ?? []) as TenderProtocol[],
      personas: (personasRes.data ?? []) as TenderPersona[],
      auditLog: (auditRes.data ?? []) as TenderAuditLog[],
      approvalRequests: (approvalsRes.data ?? []) as TenderApprovalRequest[],
      vendors: (vendorsRes.data ?? []) as TenderVendor[],
      guarantees: (guaranteesRes.data ?? []) as TenderGuarantee[],
      insurance: (insuranceRes.data ?? []) as TenderInsurance[],
      purchaseOrders: (poRes.data ?? []) as TenderPurchaseOrder[],
      invoices: (invoicesRes.data ?? []) as TenderInvoice[],
      vendorEvaluations: (evalsRes.data ?? []) as TenderVendorEvaluation[],
      signers: (signersRes.data as TenderSigner[] | null) ?? [],
    })
    setLoading(false)
  }, [tenderId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { ...data, loading, error, refresh }
}

/** קריאת ה-RPC `tender_create` ליצירת הליך חדש. */
export async function createTender(input: {
  title: string
  ministry: string
  estimated_amount: number
  selection_type: 'price_only' | 'quality_price'
  service_cluster?: string | null
  requires_tender_editor?: boolean
  brief_id?: string | null
  calculation_id?: string | null
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const { data, error } = await supabase.rpc('tender_create', { p_input: input })
  if (error) return { ok: false, error: error.message }
  return { ok: true, id: data as string }
}

/** קריאת ה-RPC `tender_advance` למעבר בין שלבים. */
export async function advanceTender(
  tenderId: string,
  targetStage: string,
  notes?: string,
): Promise<{ ok: boolean; from?: string; to?: string; error?: string }> {
  const { data, error } = await supabase.rpc('tender_advance', {
    p_tender_id: tenderId,
    p_target_stage: targetStage,
    p_notes: notes ?? null,
  })
  if (error) return { ok: false, error: error.message }
  const result = data as { ok: boolean; from: string; to: string }
  return { ok: result.ok, from: result.from, to: result.to }
}

/** קריאת ה-RPC `tender_approval_decide` לאישור/דחיית בקשה. */
export async function decideApproval(
  approvalId: string,
  decision: 'approved' | 'rejected' | 'returned',
  comments?: string,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.rpc('tender_approval_decide', {
    p_approval_id: approvalId,
    p_decision: decision,
    p_comments: comments ?? null,
  })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
