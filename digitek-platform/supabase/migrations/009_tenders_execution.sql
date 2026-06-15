-- =====================================================
-- Migration 009: Tenders CRM — Execution (M09, M10)
-- =====================================================
-- 3 entities: milestones, invoices, vendor_evaluations

-- =====================================================
-- 1. MILESTONES — project deliverables
-- =====================================================
CREATE TABLE IF NOT EXISTS public.tender_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id uuid NOT NULL REFERENCES public.tenders(id) ON DELETE CASCADE,
  sequence_no integer NOT NULL,
  title text NOT NULL,
  description text,
  planned_amount numeric(14,2) CHECK (planned_amount IS NULL OR planned_amount >= 0),
  planned_date date,
  actual_date date,
  acceptance_criteria jsonb NOT NULL DEFAULT '[]'::jsonb,
  parallel_to_invoice boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN (
    'planned', 'in_progress', 'submitted', 'under_review',
    'partially_accepted', 'accepted', 'rejected', 'cancelled'
  )),
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  rejection_reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tender_id, sequence_no)
);

CREATE INDEX IF NOT EXISTS tender_milestones_tender_idx ON public.tender_milestones(tender_id);
CREATE INDEX IF NOT EXISTS tender_milestones_status_idx ON public.tender_milestones(status);

ALTER TABLE public.tender_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Milestones visible to tender owner + admins + professional manager"
  ON public.tender_milestones FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.tenders t WHERE t.id = tender_id AND t.owner_id = auth.uid())
    OR (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
    OR EXISTS (
      SELECT 1 FROM public.tender_personas tp
      WHERE tp.tender_id = tender_id
        AND tp.user_id = auth.uid()
        AND tp.persona_role IN ('professional_manager', 'procurement_team')
        AND tp.active = true
    )
  );

CREATE TRIGGER tender_milestones_touch_updated BEFORE UPDATE ON public.tender_milestones
  FOR EACH ROW EXECUTE FUNCTION public.tender_touch_updated_at();

-- =====================================================
-- 2. INVOICES — milestone invoices
-- =====================================================
CREATE TABLE IF NOT EXISTS public.tender_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id uuid NOT NULL REFERENCES public.tender_milestones(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES public.tender_vendors(id) ON DELETE RESTRICT,
  invoice_number text,
  amount numeric(14,2) NOT NULL CHECK (amount >= 0),
  vat_amount numeric(14,2) CHECK (vat_amount IS NULL OR vat_amount >= 0),
  submitted_at timestamptz,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  paid_at timestamptz,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN (
    'submitted', 'under_review', 'approved', 'rejected', 'paid', 'disputed'
  )),
  erp_ref text,
  file_ref text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tender_invoices_milestone_idx ON public.tender_invoices(milestone_id);
CREATE INDEX IF NOT EXISTS tender_invoices_vendor_idx ON public.tender_invoices(vendor_id);

ALTER TABLE public.tender_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Invoices visible via milestone"
  ON public.tender_invoices FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.tender_milestones m
      JOIN public.tenders t ON t.id = m.tender_id
      WHERE m.id = milestone_id
        AND (t.owner_id = auth.uid()
             OR (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true)
    )
  );

CREATE TRIGGER tender_invoices_touch_updated BEFORE UPDATE ON public.tender_invoices
  FOR EACH ROW EXECUTE FUNCTION public.tender_touch_updated_at();

-- =====================================================
-- 3. VENDOR_EVALUATIONS — closure-blocker assessment
-- =====================================================
CREATE TABLE IF NOT EXISTS public.tender_vendor_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id uuid NOT NULL REFERENCES public.tenders(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES public.tender_vendors(id) ON DELETE RESTRICT,
  evaluator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  -- Scores 1-100 (Q=quality, T=timeliness, C=communication, V=value)
  score_quality smallint NOT NULL CHECK (score_quality BETWEEN 0 AND 100),
  score_timeliness smallint NOT NULL CHECK (score_timeliness BETWEEN 0 AND 100),
  score_communication smallint NOT NULL CHECK (score_communication BETWEEN 0 AND 100),
  score_value smallint NOT NULL CHECK (score_value BETWEEN 0 AND 100),
  overall_score numeric(5,2) GENERATED ALWAYS AS (
    (score_quality + score_timeliness + score_communication + score_value)::numeric / 4
  ) STORED,
  notes text,
  recommended_for_future boolean,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tender_id, vendor_id, evaluator_id)
);

CREATE INDEX IF NOT EXISTS tender_vendor_evals_vendor_idx ON public.tender_vendor_evaluations(vendor_id);
CREATE INDEX IF NOT EXISTS tender_vendor_evals_tender_idx ON public.tender_vendor_evaluations(tender_id);

ALTER TABLE public.tender_vendor_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Evaluations visible to tender owner + admins"
  ON public.tender_vendor_evaluations FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.tenders t WHERE t.id = tender_id AND t.owner_id = auth.uid())
    OR evaluator_id = auth.uid()
    OR (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
  );

-- =====================================================
-- 4. Auto-update vendor avg_score when an evaluation is added
-- =====================================================
CREATE OR REPLACE FUNCTION public.tender_recompute_vendor_score()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.tender_vendors
  SET avg_score = (
    SELECT round(avg(overall_score)::numeric, 2)
    FROM public.tender_vendor_evaluations
    WHERE vendor_id = NEW.vendor_id
  )
  WHERE id = NEW.vendor_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tender_vendor_evals_update_score
  AFTER INSERT OR UPDATE ON public.tender_vendor_evaluations
  FOR EACH ROW EXECUTE FUNCTION public.tender_recompute_vendor_score();
