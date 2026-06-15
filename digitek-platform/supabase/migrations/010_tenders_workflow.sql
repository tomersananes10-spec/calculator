-- =====================================================
-- Migration 010: Tenders CRM — Workflow, SLA, Notifications, RPCs (M05, M11)
-- =====================================================
-- 3 entities + 6 RPCs

-- =====================================================
-- 1. APPROVAL_REQUESTS — workflow engine queue
-- =====================================================
CREATE TABLE IF NOT EXISTS public.tender_approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id uuid NOT NULL REFERENCES public.tenders(id) ON DELETE CASCADE,
  request_type text NOT NULL CHECK (request_type IN (
    'budget_approval', 'olma_approval', 'committee_outbound',
    'professional_review', 'committee_winner', 'contract_signature',
    'guarantee_verification', 'insurance_verification', 'invoice_approval',
    'milestone_acceptance', 'vendor_evaluation', 'other'
  )),
  requested_from uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  requested_role text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_review', 'approved', 'rejected', 'returned', 'cancelled', 'escalated')),
  decision text,
  comments text,
  sla_due_at timestamptz,
  decided_at timestamptz,
  decided_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  workflow_step integer NOT NULL DEFAULT 1,
  parent_request_id uuid REFERENCES public.tender_approval_requests(id) ON DELETE CASCADE,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tender_approvals_tender_idx ON public.tender_approval_requests(tender_id);
CREATE INDEX IF NOT EXISTS tender_approvals_status_idx ON public.tender_approval_requests(status);
CREATE INDEX IF NOT EXISTS tender_approvals_requested_from_idx ON public.tender_approval_requests(requested_from);
CREATE INDEX IF NOT EXISTS tender_approvals_sla_idx ON public.tender_approval_requests(sla_due_at) WHERE status = 'pending';

ALTER TABLE public.tender_approval_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approval requests visible to owner + assignee + admins"
  ON public.tender_approval_requests FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.tenders t WHERE t.id = tender_id AND t.owner_id = auth.uid())
    OR requested_from = auth.uid()
    OR (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
  );

CREATE POLICY "Owner can create approval requests"
  ON public.tender_approval_requests FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.tenders t WHERE t.id = tender_id AND t.owner_id = auth.uid())
    OR (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
  );

CREATE POLICY "Assignee + admins update approval requests"
  ON public.tender_approval_requests FOR UPDATE
  USING (
    requested_from = auth.uid()
    OR (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
  );

CREATE TRIGGER tender_approvals_touch_updated BEFORE UPDATE ON public.tender_approval_requests
  FOR EACH ROW EXECUTE FUNCTION public.tender_touch_updated_at();

-- =====================================================
-- 2. SLA_EVENTS — SLA tracking
-- =====================================================
CREATE TABLE IF NOT EXISTS public.tender_sla_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id uuid REFERENCES public.tenders(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  sla_type text NOT NULL,
  due_at timestamptz NOT NULL,
  breached_at timestamptz,
  resolved_at timestamptz,
  escalated_at timestamptz,
  escalated_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'resolved', 'breached', 'escalated', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tender_sla_tender_idx ON public.tender_sla_events(tender_id);
CREATE INDEX IF NOT EXISTS tender_sla_entity_idx ON public.tender_sla_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS tender_sla_due_idx ON public.tender_sla_events(due_at) WHERE status = 'active';

ALTER TABLE public.tender_sla_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SLA events visible to tender owner + admins"
  ON public.tender_sla_events FOR SELECT
  USING (
    tender_id IS NULL
    OR EXISTS (SELECT 1 FROM public.tenders t WHERE t.id = tender_id AND t.owner_id = auth.uid())
    OR (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
  );

-- =====================================================
-- 3. NOTIFICATIONS_QUEUE — outbox pattern
-- =====================================================
CREATE TABLE IF NOT EXISTS public.tender_notifications_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tender_id uuid REFERENCES public.tenders(id) ON DELETE CASCADE,
  notification_type text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('email', 'sms', 'push', 'in_app')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  scheduled_for timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  retry_count integer NOT NULL DEFAULT 0,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tender_notif_user_idx ON public.tender_notifications_queue(user_id);
CREATE INDEX IF NOT EXISTS tender_notif_pending_idx ON public.tender_notifications_queue(scheduled_for) WHERE status = 'pending';

ALTER TABLE public.tender_notifications_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own notifications"
  ON public.tender_notifications_queue FOR SELECT
  USING (user_id = auth.uid()
    OR (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true);

-- =====================================================
-- 4. RPC: tender_audit_log_write — internal audit helper
-- =====================================================
CREATE OR REPLACE FUNCTION public.tender_audit_log_write(
  p_tender_id uuid,
  p_entity_type text,
  p_entity_id uuid,
  p_action text,
  p_before jsonb,
  p_after jsonb,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO public.tender_audit_log
    (tender_id, entity_type, entity_id, action, actor_id, before_state, after_state, notes)
  VALUES
    (p_tender_id, p_entity_type, p_entity_id, p_action, auth.uid(), p_before, p_after, p_notes)
  RETURNING id INTO v_log_id;
  RETURN v_log_id;
END;
$$;

-- =====================================================
-- 5. RPC: tender_evaluate_gateway — pure-logic G1..G11 evaluator
-- =====================================================
CREATE OR REPLACE FUNCTION public.tender_evaluate_gateway(
  p_tender_id uuid,
  p_gateway_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tender public.tenders%ROWTYPE;
  v_result jsonb;
BEGIN
  SELECT * INTO v_tender FROM public.tenders WHERE id = p_tender_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tender % not found', p_tender_id;
  END IF;

  CASE p_gateway_code
    WHEN 'G1' THEN
      v_result := jsonb_build_object(
        'amount_band', v_tender.amount_band,
        'requires_olma', v_tender.estimated_amount > 5000000,
        'skip_committee', (v_tender.estimated_amount < 200000 AND v_tender.selection_type = 'price_only'),
        'is_simple_path', (v_tender.estimated_amount < 200000 AND v_tender.selection_type = 'price_only')
      );
    WHEN 'G2' THEN
      v_result := jsonb_build_object(
        'service_cluster', v_tender.service_cluster,
        'requires_tender_editor', v_tender.requires_tender_editor
      );
    WHEN 'G6' THEN
      v_result := jsonb_build_object(
        'selection_type', v_tender.selection_type,
        'needs_quality_committee', v_tender.selection_type = 'quality_price'
      );
    WHEN 'G7' THEN
      v_result := jsonb_build_object(
        'requires_winner_committee',
          v_tender.estimated_amount >= 200000 OR v_tender.selection_type = 'quality_price'
      );
    WHEN 'G9' THEN
      v_result := jsonb_build_object(
        'requires_guarantee', v_tender.estimated_amount > 1000000,
        'requires_insurance', v_tender.estimated_amount > 1000000,
        'amount_band', v_tender.amount_band
      );
    ELSE
      v_result := jsonb_build_object(
        'gateway', p_gateway_code,
        'note', 'Gateway evaluated client-side from tender state'
      );
  END CASE;

  RETURN v_result;
END;
$$;

-- =====================================================
-- 6. RPC: tender_create — open new tender + preconditions check
-- =====================================================
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

  v_amount := (p_input->>'estimated_amount')::numeric;
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
    baseline_start_date
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
    v_amount > 5000000,
    (v_amount < 200000 AND v_selection_type = 'price_only'),
    COALESCE((p_input->>'baseline_start_date')::date, CURRENT_DATE)
  ) RETURNING id INTO v_tender_id;

  -- Owner is the first persona
  INSERT INTO public.tender_personas (tender_id, user_id, persona_role, assigned_by)
  VALUES (v_tender_id, v_owner, 'process_manager', v_owner);

  -- Audit
  PERFORM public.tender_audit_log_write(
    v_tender_id, 'tender', v_tender_id, 'created',
    NULL,
    jsonb_build_object('amount', v_amount, 'amount_band', v_amount_band, 'selection_type', v_selection_type),
    'הליך נפתח'
  );

  RETURN v_tender_id;
END;
$$;

-- =====================================================
-- 7. RPC: tender_advance — FSM transition
-- =====================================================
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
-- 8. RPC: tender_approval_decide — approve/reject a queued request
-- =====================================================
CREATE OR REPLACE FUNCTION public.tender_approval_decide(
  p_approval_id uuid,
  p_decision text,
  p_comments text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req public.tender_approval_requests%ROWTYPE;
BEGIN
  SELECT * INTO v_req FROM public.tender_approval_requests WHERE id = p_approval_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Approval request % not found', p_approval_id;
  END IF;

  IF v_req.requested_from <> auth.uid()
     AND NOT (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  IF p_decision NOT IN ('approved', 'rejected', 'returned') THEN
    RAISE EXCEPTION 'Invalid decision: %', p_decision;
  END IF;

  UPDATE public.tender_approval_requests
  SET status = p_decision,
      decision = p_decision,
      comments = p_comments,
      decided_at = now(),
      decided_by = auth.uid()
  WHERE id = p_approval_id;

  -- Close matching SLA
  UPDATE public.tender_sla_events
  SET status = 'resolved', resolved_at = now()
  WHERE entity_type = 'approval_request' AND entity_id = p_approval_id AND status = 'active';

  PERFORM public.tender_audit_log_write(
    v_req.tender_id, 'approval_request', p_approval_id, 'decided',
    jsonb_build_object('previous_status', v_req.status),
    jsonb_build_object('decision', p_decision, 'comments', p_comments),
    NULL
  );

  RETURN jsonb_build_object('ok', true, 'decision', p_decision);
END;
$$;

-- =====================================================
-- 9. RPC: tender_committee_schedule — auto-assign to nearest slot
-- =====================================================
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
BEGIN
  SELECT meeting_cadence_days INTO v_cadence
  FROM public.tender_committees WHERE id = p_committee_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Committee % not found', p_committee_id;
  END IF;

  -- Find the next scheduled meeting or create one
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

-- =====================================================
-- 10. RPC: tender_stats — aggregate counts for /admin tab
-- =====================================================
CREATE OR REPLACE FUNCTION public.tender_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN jsonb_build_object(
    'tenders', (SELECT count(*) FROM public.tenders),
    'budgets', (SELECT count(*) FROM public.tender_budgets),
    'vendors', (SELECT count(*) FROM public.tender_vendors),
    'proposals', (SELECT count(*) FROM public.tender_proposals),
    'documents', (SELECT count(*) FROM public.tender_documents),
    'committees', (SELECT count(*) FROM public.tender_committees),
    'meetings', (SELECT count(*) FROM public.tender_committee_meetings),
    'protocols', (SELECT count(*) FROM public.tender_protocols),
    'contracts', (SELECT count(*) FROM public.tender_contracts),
    'guarantees', (SELECT count(*) FROM public.tender_guarantees),
    'insurance', (SELECT count(*) FROM public.tender_insurance),
    'purchase_orders', (SELECT count(*) FROM public.tender_purchase_orders),
    'milestones', (SELECT count(*) FROM public.tender_milestones),
    'invoices', (SELECT count(*) FROM public.tender_invoices),
    'vendor_evaluations', (SELECT count(*) FROM public.tender_vendor_evaluations),
    'approval_requests', (SELECT count(*) FROM public.tender_approval_requests),
    'sla_events', (SELECT count(*) FROM public.tender_sla_events),
    'notifications_queue', (SELECT count(*) FROM public.tender_notifications_queue),
    'audit_log', (SELECT count(*) FROM public.tender_audit_log)
  );
END;
$$;
