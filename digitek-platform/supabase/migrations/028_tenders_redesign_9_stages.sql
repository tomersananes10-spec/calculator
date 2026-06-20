-- 028_tenders_redesign_9_stages.sql
-- Replace the 12-stage FSM (S0..S12) with a 9-stage flow (T0..T8) that
-- matches the way LIBA tenders actually move through the organisation.
--
-- DB was empty (0 rows in every tender_* table except 3 stale audit rows)
-- so this is a clean wipe + redefine. No data migration needed.

-- 1. Clean state — defensive truncate. CASCADE clears foreign-key chains.
TRUNCATE TABLE
  public.tenders,
  public.tender_budgets,
  public.tender_proposals,
  public.tender_documents,
  public.tender_committees,
  public.tender_committee_meetings,
  public.tender_protocols,
  public.tender_contracts,
  public.tender_guarantees,
  public.tender_insurance,
  public.tender_purchase_orders,
  public.tender_milestones,
  public.tender_invoices,
  public.tender_vendor_evaluations,
  public.tender_approval_requests,
  public.tender_sla_events,
  public.tender_notifications_queue,
  public.tender_personas,
  public.tender_audit_log
RESTART IDENTITY CASCADE;

-- 2. Replace current_stage CHECK + default
ALTER TABLE public.tenders DROP CONSTRAINT IF EXISTS tenders_current_stage_check;
ALTER TABLE public.tenders
  ALTER COLUMN current_stage SET DEFAULT 'T0_brief_protocol';
ALTER TABLE public.tenders
  ADD CONSTRAINT tenders_current_stage_check CHECK (current_stage IN (
    'T0_brief_protocol',
    'T1_budget_approval',
    'T2_committee_outbound',
    'T3_signatures_outbound',
    'T4_minhal_rechesh',
    'T5_winner_protocol_upload',
    'T6_committee_winner',
    'T7_signatures_winner',
    'T8_engagement',
    'cancelled',
    'closed'
  ));

-- 3. Extend doc_type to include the new mandatory upload types
ALTER TABLE public.tender_documents DROP CONSTRAINT IF EXISTS tender_documents_doc_type_check;
ALTER TABLE public.tender_documents
  ADD CONSTRAINT tender_documents_doc_type_check CHECK (doc_type IN (
    'brief',
    'protocol_initial',
    'winner_protocol',
    'budget_approval',
    'olma_approval',
    'committee_request',
    'committee_protocol',
    'tender_publication',
    'qa_questions',
    'qa_answers',
    'proposal',
    'evaluation_score',
    'contract',
    'guarantee',
    'insurance',
    'purchase_order',
    'invoice',
    'milestone_deliverable',
    'vendor_evaluation',
    'other'
  ));

-- 4. Rewrite tender_advance with the new sequential FSM.
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
  v_order text[] := ARRAY[
    'T0_brief_protocol',
    'T1_budget_approval',
    'T2_committee_outbound',
    'T3_signatures_outbound',
    'T4_minhal_rechesh',
    'T5_winner_protocol_upload',
    'T6_committee_winner',
    'T7_signatures_winner',
    'T8_engagement'
  ];
  v_from_idx int;
  v_to_idx int;
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

  IF v_old_stage IN ('closed', 'cancelled') THEN
    RAISE EXCEPTION 'Tender already terminal (%): no further transitions allowed', v_old_stage;
  END IF;

  IF p_target_stage NOT IN ('closed', 'cancelled') THEN
    v_from_idx := array_position(v_order, v_old_stage);
    v_to_idx   := array_position(v_order, p_target_stage);

    IF v_from_idx IS NULL OR v_to_idx IS NULL THEN
      RAISE EXCEPTION 'Invalid stage code: %', p_target_stage;
    END IF;

    IF v_to_idx <> v_from_idx + 1 AND v_to_idx <> v_from_idx - 1 THEN
      RAISE EXCEPTION 'Illegal transition % -> % (only adjacent stages allowed)',
        v_old_stage, p_target_stage;
    END IF;
  END IF;

  UPDATE public.tenders
  SET current_stage = p_target_stage,
      actual_go_live_date = CASE WHEN p_target_stage = 'T8_engagement' THEN CURRENT_DATE ELSE actual_go_live_date END,
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

-- 5. tender_create: new default stage.
CREATE OR REPLACE FUNCTION public.tender_create(p_input jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tender_id uuid;
  v_amount numeric(14,2);
  v_amount_band text;
  v_selection_type text;
  v_owner uuid;
BEGIN
  v_owner := auth.uid();
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_amount := COALESCE((p_input->>'estimated_amount')::numeric, 0);
  v_selection_type := COALESCE(p_input->>'selection_type', 'quality_price');

  v_amount_band := CASE
    WHEN v_amount < 200000 THEN 'lt_200k'
    WHEN v_amount < 1000000 THEN '200k_1m'
    WHEN v_amount <= 5000000 THEN '1m_5m'
    ELSE 'gt_5m'
  END;

  INSERT INTO public.tenders (
    title, ministry, owner_id, brief_id, calculation_id,
    estimated_amount, amount_band, selection_type,
    service_cluster, requires_tender_editor,
    requires_olma, is_simple_path,
    baseline_start_date,
    current_stage
  ) VALUES (
    COALESCE(p_input->>'title', 'הליך חדש'),
    COALESCE(p_input->>'ministry', ''),
    v_owner,
    NULLIF(p_input->>'brief_id','')::uuid,
    NULLIF(p_input->>'calculation_id','')::uuid,
    v_amount,
    v_amount_band,
    v_selection_type,
    p_input->>'service_cluster',
    COALESCE((p_input->>'requires_tender_editor')::boolean, false),
    false,
    false,
    COALESCE((p_input->>'baseline_start_date')::date, CURRENT_DATE),
    'T0_brief_protocol'
  ) RETURNING id INTO v_tender_id;

  INSERT INTO public.tender_personas (tender_id, user_id, persona_role, assigned_by)
  VALUES (v_tender_id, v_owner, 'process_manager', v_owner);

  PERFORM public.tender_audit_log_write(
    v_tender_id, 'tender', v_tender_id, 'created',
    NULL,
    jsonb_build_object('amount', v_amount, 'amount_band', v_amount_band, 'selection_type', v_selection_type),
    'הליך נפתח'
  );

  RETURN v_tender_id;
END;
$$;
