-- =====================================================
-- Migration 011: Tenders CRM — Security Fixes
-- =====================================================
-- Addresses 3 HIGH findings from automated security review on
-- migrations 006 + 010 (phase 1 commit c99e70d).

-- =====================================================
-- 1. Tighten tenders SELECT — restrict to participants
-- =====================================================
-- Previously: any authenticated user could read every tender.
-- New rule: owner OR persona-assigned user OR admin.
DROP POLICY IF EXISTS "Authenticated users can read tenders" ON public.tenders;

CREATE POLICY "Participants and admins read tenders"
  ON public.tenders FOR SELECT
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.tender_personas tp
      WHERE tp.tender_id = id AND tp.user_id = auth.uid() AND tp.active = true
    )
    OR (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
  );

-- =====================================================
-- 2. tender_advance — enforce legal FSM transitions
-- =====================================================
-- Previously: owner could jump to any stage (e.g. S0 → closed), bypassing
-- committees, contracts and vendor evaluation.
-- New rule: only allow edges declared below. Skip rules from G1/G7 are
-- respected by adding the skip-edges explicitly in v_allowed.
CREATE OR REPLACE FUNCTION public.tender_advance(
  p_tender_id uuid,
  p_target_stage text,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tender public.tenders%ROWTYPE;
  v_old_stage text;
  v_is_legal boolean;
  v_evaluation_count integer;
BEGIN
  SELECT * INTO v_tender FROM public.tenders WHERE id = p_tender_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tender % not found', p_tender_id;
  END IF;

  IF v_tender.owner_id <> auth.uid()
     AND NOT (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  v_old_stage := v_tender.current_stage;

  -- Terminal state cannot be left except by admin
  IF v_old_stage IN ('closed', 'cancelled')
     AND NOT (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) THEN
    RAISE EXCEPTION 'Cannot transition out of terminal stage %', v_old_stage;
  END IF;

  -- Legal forward/return transitions mirror stateMachine.ts.
  -- Skip-paths (S1→S3 when amount ≤ 5M, S1→S4 simple path, S6→S8 when G7=false)
  -- require their gateway condition to hold.
  v_is_legal := CASE
    WHEN v_old_stage = 'S0_preconditions' AND p_target_stage = 'S1_initiation_budget' THEN true
    WHEN v_old_stage = 'S1_initiation_budget' AND p_target_stage = 'S2_olma_approval' THEN v_tender.requires_olma
    WHEN v_old_stage = 'S1_initiation_budget' AND p_target_stage = 'S3_committee_outbound' THEN NOT v_tender.requires_olma AND NOT v_tender.is_simple_path
    WHEN v_old_stage = 'S1_initiation_budget' AND p_target_stage = 'S4_system_input_review' THEN v_tender.is_simple_path
    WHEN v_old_stage = 'S2_olma_approval' AND p_target_stage = 'S3_committee_outbound' THEN true
    WHEN v_old_stage = 'S3_committee_outbound' AND p_target_stage = 'S4_system_input_review' THEN true
    WHEN v_old_stage = 'S3_committee_outbound' AND p_target_stage = 'S1_initiation_budget' THEN true  -- G3 return
    WHEN v_old_stage = 'S4_system_input_review' AND p_target_stage = 'S5_distribution_response' THEN true
    WHEN v_old_stage = 'S4_system_input_review' AND p_target_stage = 'S4_system_input_review' THEN true  -- G4 corrections
    WHEN v_old_stage = 'S5_distribution_response' AND p_target_stage = 'S6_proposal_evaluation' THEN true
    WHEN v_old_stage = 'S6_proposal_evaluation' AND p_target_stage = 'S7_committee_winner' THEN
      (v_tender.estimated_amount >= 200000 OR v_tender.selection_type = 'quality_price')
    WHEN v_old_stage = 'S6_proposal_evaluation' AND p_target_stage = 'S8_contract' THEN
      (v_tender.estimated_amount < 200000 AND v_tender.selection_type = 'price_only')
    WHEN v_old_stage = 'S7_committee_winner' AND p_target_stage = 'S8_contract' THEN true
    WHEN v_old_stage = 'S7_committee_winner' AND p_target_stage = 'S6_proposal_evaluation' THEN true  -- G8 reject
    WHEN v_old_stage = 'S8_contract' AND p_target_stage = 'S8_contract' THEN true  -- G10 guarantee/insurance loop
    WHEN v_old_stage = 'S8_contract' AND p_target_stage = 'S9_purchase_order' THEN true
    WHEN v_old_stage = 'S9_purchase_order' AND p_target_stage = 'S10_execution_m1' THEN true
    WHEN v_old_stage = 'S10_execution_m1' AND p_target_stage IN ('S11_execution_m2', 'S12_closure_evaluation') THEN true
    WHEN v_old_stage = 'S11_execution_m2' AND p_target_stage = 'S12_closure_evaluation' THEN true
    WHEN v_old_stage = 'S12_closure_evaluation' AND p_target_stage = 'closed' THEN true
    -- Cancellation is always allowed from non-terminal stages by owner/admin
    WHEN v_old_stage NOT IN ('closed', 'cancelled') AND p_target_stage = 'cancelled' THEN true
    ELSE false
  END;

  IF NOT v_is_legal THEN
    RAISE EXCEPTION 'Illegal stage transition: % → %', v_old_stage, p_target_stage;
  END IF;

  -- Closure blocker: vendor evaluation must exist before 'closed'
  IF p_target_stage = 'closed' THEN
    SELECT count(*) INTO v_evaluation_count
    FROM public.tender_vendor_evaluations
    WHERE tender_id = p_tender_id;
    IF v_evaluation_count = 0 THEN
      RAISE EXCEPTION 'Cannot close tender without at least one vendor evaluation';
    END IF;
  END IF;

  UPDATE public.tenders
  SET current_stage = p_target_stage,
      actual_go_live_date = CASE WHEN p_target_stage = 'S10_execution_m1' THEN CURRENT_DATE ELSE actual_go_live_date END,
      actual_closure_date = CASE WHEN p_target_stage = 'closed' THEN CURRENT_DATE ELSE actual_closure_date END
  WHERE id = p_tender_id;

  PERFORM public.tender_audit_log_write(
    p_tender_id, 'tender', p_tender_id, 'stage_change',
    jsonb_build_object('stage', v_old_stage),
    jsonb_build_object('stage', p_target_stage),
    p_notes
  );

  RETURN jsonb_build_object('ok', true, 'from', v_old_stage, 'to', p_target_stage);
END;
$$;

-- =====================================================
-- 3. tender_committee_schedule — authorize caller
-- =====================================================
-- Previously: any authenticated user could schedule any tender into any
-- committee. Now: caller must be owner/admin of the tender AND
-- member/admin of the committee.
CREATE OR REPLACE FUNCTION public.tender_committee_schedule(
  p_committee_id uuid,
  p_tender_id uuid,
  p_requested_date date DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_meeting_id uuid;
  v_cadence integer;
  v_next_date date;
  v_is_admin boolean;
BEGIN
  v_is_admin := (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true;

  -- Tender authorization
  IF NOT v_is_admin AND NOT EXISTS (
    SELECT 1 FROM public.tenders t WHERE t.id = p_tender_id AND t.owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Permission denied on tender %', p_tender_id;
  END IF;

  -- Committee authorization
  IF NOT v_is_admin AND NOT EXISTS (
    SELECT 1 FROM public.tender_committees c
    WHERE c.id = p_committee_id AND auth.uid() = ANY (c.members)
  ) THEN
    RAISE EXCEPTION 'Permission denied on committee %', p_committee_id;
  END IF;

  SELECT meeting_cadence_days INTO v_cadence
  FROM public.tender_committees WHERE id = p_committee_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Committee % not found', p_committee_id;
  END IF;

  SELECT id INTO v_meeting_id
  FROM public.tender_committee_meetings
  WHERE committee_id = p_committee_id
    AND status = 'scheduled'
    AND scheduled_at >= COALESCE(p_requested_date, CURRENT_DATE)
  ORDER BY scheduled_at ASC
  LIMIT 1;

  IF v_meeting_id IS NULL THEN
    v_next_date := COALESCE(p_requested_date, CURRENT_DATE) + v_cadence;
    INSERT INTO public.tender_committee_meetings
      (committee_id, scheduled_at, tender_refs)
    VALUES
      (p_committee_id, v_next_date::timestamptz, ARRAY[p_tender_id])
    RETURNING id INTO v_meeting_id;
  ELSE
    UPDATE public.tender_committee_meetings
    SET tender_refs = array_append(tender_refs, p_tender_id)
    WHERE id = v_meeting_id
      AND NOT (p_tender_id = ANY (tender_refs));
  END IF;

  PERFORM public.tender_audit_log_write(
    p_tender_id, 'committee_meeting', v_meeting_id, 'scheduled',
    NULL,
    jsonb_build_object('committee_id', p_committee_id),
    NULL
  );

  RETURN v_meeting_id;
END;
$$;
