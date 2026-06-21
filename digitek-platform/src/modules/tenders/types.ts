// =====================================================
// Tenders CRM — TypeScript types
// Mirrors public.tender_* tables (migrations 006-010)
// =====================================================

// ---------- Enums ----------

// 9-stage flow (T0..T8) — replaces the legacy 12-stage S-codes
// אנו שומרים על השם TenderStage כדי לא לשבור imports קיימים.
export type TenderStage =
  | 'T0_brief_protocol'
  | 'T1_budget_approval'
  | 'T2_committee_outbound'
  | 'T3_signatures_outbound'
  | 'T4_minhal_rechesh'
  | 'T5_winner_protocol_upload'
  | 'T6_committee_winner'
  | 'T7_signatures_winner'
  | 'T8_engagement'
  | 'cancelled'
  | 'closed'

export type AmountBand = 'lt_200k' | '200k_1m' | '1m_5m' | 'gt_5m'
export type SelectionType = 'price_only' | 'quality_price'

export type PersonaRole =
  | 'process_manager'
  | 'budget_officer'
  | 'procurement_professional'
  | 'procurement_manager'
  | 'tender_committee_member'
  | 'exceptions_committee_member'
  | 'subcommittee_member'
  | 'legal_professional'
  | 'procurement_team'
  | 'vendor'
  | 'professional_manager'
  | 'signatory'
  | 'treasurer'         // חדש — חשב (חתימה ב-T3/T7)
  | 'committee_head'    // חדש — מנהלת ועדת מכרזים
  | 'admin'

export type CommitteeType = 'tenders' | 'exceptions' | 'subcommittee_quality'
export type MeetingStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'postponed'
export type ProtocolType = 'outbound_request' | 'winner_approval' | 'exceptions' | 'subcommittee_scoring'
export type ProtocolDecision = 'approved' | 'rejected' | 'returned_for_correction' | 'completion_required'

export type BudgetStatus = 'pending' | 'approved' | 'rejected' | 'revised'
export type VendorRegistrationStatus = 'active' | 'suspended' | 'blacklisted' | 'pending'

export type ProposalStatus =
  | 'draft'
  | 'submitted'
  | 'qualified'
  | 'disqualified'
  | 'shortlisted'
  | 'winner'
  | 'runner_up'
  | 'rejected'

export type DocumentType =
  | 'brief'
  | 'protocol_initial'           // T0 — פרוטוקול ראשוני המוטען בפתיחת ההליך
  | 'winner_protocol'            // T5 — פרוטוקול זכייה שמועלה אחרי מינהל הרכש
  | 'budget_approval'
  | 'olma_approval'
  | 'committee_request'
  | 'committee_protocol'
  | 'tender_publication'
  | 'qa_questions'
  | 'qa_answers'
  | 'proposal'
  | 'evaluation_score'
  | 'contract'
  | 'guarantee'
  | 'insurance'
  | 'purchase_order'
  | 'invoice'
  | 'milestone_deliverable'
  | 'vendor_evaluation'
  | 'other'

export type DocumentSensitivity = 'public' | 'internal' | 'confidential' | 'secret'

export type ContractSignatureStatus =
  | 'draft'
  | 'sent_to_vendor'
  | 'vendor_signed'
  | 'pending_internal_review'
  | 'pending_signatory'
  | 'fully_signed'
  | 'cancelled'

export type GuaranteeType = 'performance' | 'bid' | 'advance_payment' | 'warranty'
export type GuaranteeStatus = 'pending' | 'verified' | 'expired' | 'released' | 'rejected'
export type InsuranceStatus = 'pending' | 'verified' | 'expired' | 'rejected'

export type PurchaseOrderStatus =
  | 'draft'
  | 'submitted_to_erp'
  | 'approved_in_erp'
  | 'sent_to_vendor'
  | 'acknowledged'
  | 'cancelled'

export type MilestoneStatus =
  | 'planned'
  | 'in_progress'
  | 'submitted'
  | 'under_review'
  | 'partially_accepted'
  | 'accepted'
  | 'rejected'
  | 'cancelled'

export type InvoiceStatus =
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'paid'
  | 'disputed'

export type ApprovalRequestType =
  | 'budget_approval'
  | 'olma_approval'
  | 'committee_outbound'
  | 'professional_review'
  | 'committee_winner'
  | 'contract_signature'
  | 'guarantee_verification'
  | 'insurance_verification'
  | 'invoice_approval'
  | 'milestone_acceptance'
  | 'vendor_evaluation'
  | 'other'

export type ApprovalStatus =
  | 'pending'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'returned'
  | 'cancelled'
  | 'escalated'

export type SlaStatus = 'active' | 'resolved' | 'breached' | 'escalated' | 'cancelled'
export type NotificationChannel = 'email' | 'sms' | 'push' | 'in_app'
export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'cancelled'

export type GatewayCode = 'G1' | 'G2' | 'G3' | 'G4' | 'G5' | 'G6' | 'G7' | 'G8' | 'G9' | 'G10' | 'G11'

// ---------- Entity types (mirror SQL columns) ----------

export interface Tender {
  id: string
  tender_number: string | null
  tender_number_external: string | null
  title: string
  ministry: string
  owner_id: string
  brief_id: string | null
  calculation_id: string | null
  estimated_amount: number
  amount_band: AmountBand
  selection_type: SelectionType
  service_cluster: string | null
  requires_tender_editor: boolean
  current_stage: TenderStage
  is_simple_path: boolean
  requires_olma: boolean
  baseline_start_date: string | null
  planned_go_live_date: string | null
  actual_go_live_date: string | null
  actual_closure_date: string | null
  created_at: string
  updated_at: string
}

export interface TenderBudget {
  id: string
  tender_id: string
  amount: number
  approved_by: string | null
  approved_at: string | null
  status: BudgetStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export interface TenderVendor {
  id: string
  name: string
  tax_id: string | null
  contact: Record<string, unknown>
  avg_score: number | null
  active_guarantees: number
  registration_status: VendorRegistrationStatus
  created_at: string
  updated_at: string
}

export interface TenderProposal {
  id: string
  tender_id: string
  vendor_id: string
  submitted_at: string | null
  price: number | null
  quality_score: number | null
  weighted_score: number | null
  rank: number | null
  status: ProposalStatus
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface TenderDocument {
  id: string
  tender_id: string
  doc_type: DocumentType
  title: string
  version: number
  file_ref: string | null
  file_size_bytes: number | null
  mime_type: string | null
  sensitivity: DocumentSensitivity
  author_id: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface TenderPersona {
  id: string
  tender_id: string
  user_id: string
  persona_role: PersonaRole
  assigned_at: string
  assigned_by: string | null
  active: boolean
}

export interface TenderAuditLog {
  id: string
  tender_id: string | null
  entity_type: string
  entity_id: string | null
  action: string
  actor_id: string | null
  before_state: Record<string, unknown> | null
  after_state: Record<string, unknown> | null
  notes: string | null
  occurred_at: string
}

export interface TenderCommittee {
  id: string
  name: string
  committee_type: CommitteeType
  ministry: string
  members: string[]
  meeting_cadence_days: number
  active: boolean
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface TenderCommitteeMeeting {
  id: string
  committee_id: string
  scheduled_at: string
  duration_minutes: number
  agenda: AgendaItem[]
  tender_refs: string[]
  status: MeetingStatus
  decision_summary: string | null
  attendees: string[]
  protocol_id: string | null
  created_at: string
  updated_at: string
}

export interface AgendaItem {
  tender_id: string
  topic: string
  duration_minutes?: number
  presenter_id?: string
}

export interface TenderProtocol {
  id: string
  tender_id: string
  committee_meeting_id: string | null
  protocol_type: ProtocolType
  decision: ProtocolDecision
  rationale: string | null
  votes: ProtocolVote[]
  dissents: ProtocolDissent[]
  signed_at: string | null
  signed_by: string[]
  file_ref: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface ProtocolVote {
  voter_id: string
  vote: 'yes' | 'no' | 'abstain'
  comment?: string
}

export interface ProtocolDissent {
  member_id: string
  reason: string
}

export interface TenderContractTemplate {
  id: string
  code: string
  name: string
  min_amount: number | null
  max_amount: number | null
  requires_guarantee: boolean
  requires_insurance: boolean
  file_ref: string | null
  version: number
  active: boolean
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface TenderContract {
  id: string
  tender_id: string
  vendor_id: string
  template_id: string | null
  contract_number: string | null
  total_amount: number
  effective_date: string | null
  expiry_date: string | null
  guarantee_required: boolean
  insurance_required: boolean
  signature_status: ContractSignatureStatus
  vendor_signed_at: string | null
  internal_signed_at: string | null
  file_ref: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface TenderGuarantee {
  id: string
  contract_id: string
  guarantee_number: string | null
  guarantee_type: GuaranteeType
  amount: number
  issuer: string
  valid_from: string
  valid_to: string
  status: GuaranteeStatus
  verified_by: string | null
  verified_at: string | null
  file_ref: string | null
  created_at: string
  updated_at: string
}

export interface TenderInsurance {
  id: string
  contract_id: string
  policy_number: string | null
  coverage: Record<string, unknown>
  insurer: string
  valid_from: string
  valid_to: string
  status: InsuranceStatus
  verified_by: string | null
  verified_at: string | null
  file_ref: string | null
  created_at: string
  updated_at: string
}

export interface TenderPurchaseOrder {
  id: string
  tender_id: string
  contract_id: string
  erp_ref: string | null
  po_number: string | null
  total_amount: number
  status: PurchaseOrderStatus
  issued_at: string | null
  sent_to_vendor_at: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface TenderMilestone {
  id: string
  tender_id: string
  sequence_no: number
  title: string
  description: string | null
  planned_amount: number | null
  planned_date: string | null
  actual_date: string | null
  acceptance_criteria: AcceptanceCriterion[]
  parallel_to_invoice: boolean
  status: MilestoneStatus
  approved_by: string | null
  approved_at: string | null
  rejection_reason: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface AcceptanceCriterion {
  criterion: string
  weight?: number
  met?: boolean
}

export interface TenderInvoice {
  id: string
  milestone_id: string
  vendor_id: string
  invoice_number: string | null
  amount: number
  vat_amount: number | null
  submitted_at: string | null
  approved_by: string | null
  approved_at: string | null
  paid_at: string | null
  status: InvoiceStatus
  erp_ref: string | null
  file_ref: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface TenderVendorEvaluation {
  id: string
  tender_id: string
  vendor_id: string
  evaluator_id: string
  score_quality: number
  score_timeliness: number
  score_communication: number
  score_value: number
  overall_score: number
  notes: string | null
  recommended_for_future: boolean | null
  created_at: string
}

export interface TenderApprovalRequest {
  id: string
  tender_id: string
  request_type: ApprovalRequestType
  requested_from: string | null
  requested_role: string | null
  status: ApprovalStatus
  decision: string | null
  comments: string | null
  sla_due_at: string | null
  decided_at: string | null
  decided_by: string | null
  workflow_step: number
  parent_request_id: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

/**
 * שורת חתימה פר-חותם נדרש לבקשת אישור. כשבקשה דורשת כמה חותמים (AND),
 * כל אחד מקבל שורה כזו ומחליט בנפרד. הסטטוס של ה-parent נגזר אגרגטיבית.
 */
export interface TenderApprovalSignature {
  id: string
  request_id: string
  signer_id: string | null
  signer_email: string
  signer_role: string
  signer_display_name: string
  status: 'pending' | 'approved' | 'rejected' | 'returned'
  decision_comments: string | null
  signature_name: string | null
  signature_image_path: string | null
  attachment_paths: string[] | null
  decided_at: string | null
  created_at: string
}

export interface TenderSlaEvent {
  id: string
  tender_id: string | null
  entity_type: string
  entity_id: string
  sla_type: string
  due_at: string
  breached_at: string | null
  resolved_at: string | null
  escalated_at: string | null
  escalated_to: string | null
  status: SlaStatus
  created_at: string
}

export interface TenderNotification {
  id: string
  user_id: string
  tender_id: string | null
  notification_type: string
  channel: NotificationChannel
  payload: Record<string, unknown>
  status: NotificationStatus
  scheduled_for: string
  sent_at: string | null
  retry_count: number
  error_message: string | null
  created_at: string
}

// ---------- RPC payload types ----------

export interface TenderCreateInput {
  title: string
  ministry: string
  estimated_amount: number
  selection_type: SelectionType
  brief_id?: string | null
  calculation_id?: string | null
  service_cluster?: string | null
  requires_tender_editor?: boolean
  baseline_start_date?: string
}

export interface TenderAdvanceResult {
  ok: boolean
  from: TenderStage
  to: TenderStage
}

export interface TenderStatsResult {
  tenders: number
  budgets: number
  vendors: number
  proposals: number
  documents: number
  committees: number
  meetings: number
  protocols: number
  contracts: number
  guarantees: number
  insurance: number
  purchase_orders: number
  milestones: number
  invoices: number
  vendor_evaluations: number
  approval_requests: number
  sla_events: number
  notifications_queue: number
  audit_log: number
}

export type GatewayResult = Record<string, unknown>

// ---------- Signers (מורשי חתימה פר-הליך) ----------

export type SignerRole =
  | 'budget_officer'      // תקציבן — T1
  | 'legal_professional'  // משפטן — T3/T7
  | 'treasurer'           // חשב — T3/T7 + ועדה
  | 'signatory'           // סמנכ"ל אחראי תורן — T3/T7
  | 'committee_head'      // מנהלת ועדת מכרזים — T2/T6

export interface TenderSigner {
  id: string
  tender_id: string
  role: SignerRole
  display_name: string
  email: string
  added_by: string | null
  added_at: string
  replaced_at: string | null
  replaced_by: string | null
  replaces_id: string | null
  active: boolean
}
