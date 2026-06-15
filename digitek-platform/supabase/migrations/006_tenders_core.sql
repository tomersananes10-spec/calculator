-- =====================================================
-- Migration 006: Tenders CRM — Core Entities
-- =====================================================
-- Foundation for the tender management CRM (Takam 16.2.19, digitek tenders)
-- 7 core entities: tenders, budgets, vendors, proposals, documents,
-- tender_personas (RBAC mapping), tender_audit_log

-- =====================================================
-- 1. TENDERS — main process entity (12-stage FSM)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.tenders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identification
  tender_number text UNIQUE,
  tender_number_external text,
  title text NOT NULL,
  ministry text NOT NULL,

  -- Owner / linkage
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  brief_id uuid REFERENCES public.briefs(id) ON DELETE SET NULL,
  calculation_id uuid REFERENCES public.calculations(id) ON DELETE SET NULL,

  -- Financial (Gateway G1)
  estimated_amount numeric(14,2) NOT NULL CHECK (estimated_amount >= 0),
  amount_band text NOT NULL CHECK (amount_band IN ('lt_200k', '200k_1m', '1m_5m', 'gt_5m')),

  -- Selection (Gateway G6)
  selection_type text NOT NULL DEFAULT 'quality_price'
    CHECK (selection_type IN ('price_only', 'quality_price')),

  -- Service classification (Gateway G2)
  service_cluster text,
  requires_tender_editor boolean DEFAULT false,

  -- FSM stage
  current_stage text NOT NULL DEFAULT 'S0_preconditions' CHECK (current_stage IN (
    'S0_preconditions', 'S1_initiation_budget', 'S2_olma_approval',
    'S3_committee_outbound', 'S4_system_input_review',
    'S5_distribution_response', 'S6_proposal_evaluation',
    'S7_committee_winner', 'S8_contract', 'S9_purchase_order',
    'S10_execution_m1', 'S11_execution_m2', 'S12_closure_evaluation',
    'cancelled', 'closed'
  )),

  -- Path flags (computed from Gateways)
  is_simple_path boolean DEFAULT false,
  requires_olma boolean DEFAULT false,

  -- Dates
  baseline_start_date date,
  planned_go_live_date date,
  actual_go_live_date date,
  actual_closure_date date,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tenders_owner_idx ON public.tenders(owner_id);
CREATE INDEX IF NOT EXISTS tenders_stage_idx ON public.tenders(current_stage);
CREATE INDEX IF NOT EXISTS tenders_ministry_idx ON public.tenders(ministry);
CREATE INDEX IF NOT EXISTS tenders_brief_idx ON public.tenders(brief_id);

ALTER TABLE public.tenders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tender owners full access"
  ON public.tenders FOR ALL
  USING (auth.uid() = owner_id);

CREATE POLICY "Admins full tender access"
  ON public.tenders FOR ALL
  USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true);

CREATE POLICY "Authenticated users can read tenders"
  ON public.tenders FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- =====================================================
-- 2. BUDGETS — budget approval per tender
-- =====================================================
CREATE TABLE IF NOT EXISTS public.tender_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id uuid NOT NULL REFERENCES public.tenders(id) ON DELETE CASCADE,
  amount numeric(14,2) NOT NULL CHECK (amount >= 0),
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'revised')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tender_budgets_tender_idx ON public.tender_budgets(tender_id);

ALTER TABLE public.tender_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Budgets visible to tender owner + admins"
  ON public.tender_budgets FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.tenders t WHERE t.id = tender_id AND t.owner_id = auth.uid())
    OR (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
  );

-- =====================================================
-- 3. VENDORS — supplier registry
-- =====================================================
CREATE TABLE IF NOT EXISTS public.tender_vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  tax_id text UNIQUE,
  contact jsonb NOT NULL DEFAULT '{}'::jsonb,
  avg_score numeric(5,2),
  active_guarantees integer DEFAULT 0,
  registration_status text NOT NULL DEFAULT 'active'
    CHECK (registration_status IN ('active', 'suspended', 'blacklisted', 'pending')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tender_vendors_tax_idx ON public.tender_vendors(tax_id);
CREATE INDEX IF NOT EXISTS tender_vendors_status_idx ON public.tender_vendors(registration_status);

ALTER TABLE public.tender_vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users read vendors"
  ON public.tender_vendors FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins manage vendors"
  ON public.tender_vendors FOR ALL
  USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true);

-- =====================================================
-- 4. PROPOSALS — vendor proposals per tender
-- =====================================================
CREATE TABLE IF NOT EXISTS public.tender_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id uuid NOT NULL REFERENCES public.tenders(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES public.tender_vendors(id) ON DELETE RESTRICT,
  submitted_at timestamptz,
  price numeric(14,2) CHECK (price IS NULL OR price >= 0),
  quality_score numeric(5,2) CHECK (quality_score IS NULL OR (quality_score >= 0 AND quality_score <= 100)),
  weighted_score numeric(7,4),
  rank integer,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitted', 'qualified', 'disqualified', 'shortlisted', 'winner', 'runner_up', 'rejected')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tender_id, vendor_id)
);

CREATE INDEX IF NOT EXISTS tender_proposals_tender_idx ON public.tender_proposals(tender_id);
CREATE INDEX IF NOT EXISTS tender_proposals_vendor_idx ON public.tender_proposals(vendor_id);

ALTER TABLE public.tender_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Proposals visible to tender owner + admins"
  ON public.tender_proposals FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.tenders t WHERE t.id = tender_id AND t.owner_id = auth.uid())
    OR (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
  );

-- =====================================================
-- 5. DOCUMENTS — tender attachments
-- =====================================================
CREATE TABLE IF NOT EXISTS public.tender_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id uuid NOT NULL REFERENCES public.tenders(id) ON DELETE CASCADE,
  doc_type text NOT NULL CHECK (doc_type IN (
    'brief', 'budget_approval', 'olma_approval',
    'committee_request', 'committee_protocol', 'tender_publication',
    'qa_questions', 'qa_answers',
    'proposal', 'evaluation_score',
    'contract', 'guarantee', 'insurance',
    'purchase_order', 'invoice',
    'milestone_deliverable', 'vendor_evaluation', 'other'
  )),
  title text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  file_ref text,
  file_size_bytes bigint,
  mime_type text,
  sensitivity text NOT NULL DEFAULT 'internal'
    CHECK (sensitivity IN ('public', 'internal', 'confidential', 'secret')),
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tender_documents_tender_idx ON public.tender_documents(tender_id);
CREATE INDEX IF NOT EXISTS tender_documents_type_idx ON public.tender_documents(doc_type);

ALTER TABLE public.tender_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Documents visible to tender owner + admins"
  ON public.tender_documents FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.tenders t WHERE t.id = tender_id AND t.owner_id = auth.uid())
    OR (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
  );

-- =====================================================
-- 6. TENDER_PERSONAS — RBAC mapping per tender
-- =====================================================
-- Maps users → personas for a specific tender (ABAC layer on top of RBAC)
CREATE TABLE IF NOT EXISTS public.tender_personas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id uuid NOT NULL REFERENCES public.tenders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  persona_role text NOT NULL CHECK (persona_role IN (
    'process_manager', 'budget_officer', 'procurement_professional',
    'procurement_manager', 'tender_committee_member', 'exceptions_committee_member',
    'subcommittee_member', 'legal_professional', 'procurement_team',
    'vendor', 'professional_manager', 'signatory', 'admin'
  )),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  active boolean NOT NULL DEFAULT true,
  UNIQUE (tender_id, user_id, persona_role)
);

CREATE INDEX IF NOT EXISTS tender_personas_tender_idx ON public.tender_personas(tender_id);
CREATE INDEX IF NOT EXISTS tender_personas_user_idx ON public.tender_personas(user_id);

ALTER TABLE public.tender_personas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Personas visible to tender owner + assigned user + admins"
  ON public.tender_personas FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.tenders t WHERE t.id = tender_id AND t.owner_id = auth.uid())
    OR user_id = auth.uid()
    OR (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
  );

CREATE POLICY "Owner + admins manage personas"
  ON public.tender_personas FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.tenders t WHERE t.id = tender_id AND t.owner_id = auth.uid())
    OR (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
  );

CREATE POLICY "Owner + admins update personas"
  ON public.tender_personas FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.tenders t WHERE t.id = tender_id AND t.owner_id = auth.uid())
    OR (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
  );

-- =====================================================
-- 7. TENDER_AUDIT_LOG — append-only audit trail
-- =====================================================
CREATE TABLE IF NOT EXISTS public.tender_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id uuid REFERENCES public.tenders(id) ON DELETE SET NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  action text NOT NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  before_state jsonb,
  after_state jsonb,
  notes text,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tender_audit_tender_idx ON public.tender_audit_log(tender_id);
CREATE INDEX IF NOT EXISTS tender_audit_entity_idx ON public.tender_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS tender_audit_occurred_idx ON public.tender_audit_log(occurred_at DESC);

ALTER TABLE public.tender_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Audit log visible to tender owner + admins"
  ON public.tender_audit_log FOR SELECT
  USING (
    tender_id IS NULL
    OR EXISTS (SELECT 1 FROM public.tenders t WHERE t.id = tender_id AND t.owner_id = auth.uid())
    OR (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
  );

-- Audit log inserts come only via the RPC (SECURITY DEFINER) — no direct insert policy.

-- =====================================================
-- 8. updated_at trigger helper
-- =====================================================
CREATE OR REPLACE FUNCTION public.tender_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tenders_touch_updated BEFORE UPDATE ON public.tenders
  FOR EACH ROW EXECUTE FUNCTION public.tender_touch_updated_at();

CREATE TRIGGER tender_budgets_touch_updated BEFORE UPDATE ON public.tender_budgets
  FOR EACH ROW EXECUTE FUNCTION public.tender_touch_updated_at();

CREATE TRIGGER tender_vendors_touch_updated BEFORE UPDATE ON public.tender_vendors
  FOR EACH ROW EXECUTE FUNCTION public.tender_touch_updated_at();

CREATE TRIGGER tender_proposals_touch_updated BEFORE UPDATE ON public.tender_proposals
  FOR EACH ROW EXECUTE FUNCTION public.tender_touch_updated_at();
