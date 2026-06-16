-- 027_skip_s0_preconditions.sql
-- Eliminate the "preconditions" stage from the per-tender flow.
--
-- Why: S0_preconditions was modelled as a "framework agreement / smart card /
-- training" gate that applies once per organisation, not per tender. In the
-- real LIBA flow these are handled outside the Tenders module entirely, so
-- every new tender appeared "stuck" in an empty S0 stage with no work to do.
-- The TenderWizard itself is the practical S0 — the moment the wizard
-- completes, the user is ready for S1 (ייזום ותקצוב).
--
-- This migration:
--   1. Bumps any tender still on S0_preconditions to S1_initiation_budget
--   2. Changes the column default so future tenders start at S1
--
-- The check-constraint enum keeps 'S0_preconditions' for backward
-- compatibility (older audit_log rows reference it).

-- 1. Migrate existing tenders
UPDATE public.tenders
   SET current_stage = 'S1_initiation_budget',
       updated_at    = now()
 WHERE current_stage = 'S0_preconditions';

-- 2. New default for future inserts
ALTER TABLE public.tenders
  ALTER COLUMN current_stage SET DEFAULT 'S1_initiation_budget';
