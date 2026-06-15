-- =====================================================
-- Migration 013: Tenders CRM — SLA + Audit Triggers (Phase 2)
-- =====================================================
-- Adds DB-level automation:
--   1. SLA event auto-created when approval_request is inserted
--   2. SLA event auto-resolved when approval is decided
--   3. Audit entries auto-written on key entity changes (signature_status,
--      guarantee.status, milestone.status)
--   4. Default SLA duration table (mirrors slaEngine.ts SLA_DEFINITIONS)

-- =====================================================
-- 1. Default SLA durations (in business days) per request type
-- =====================================================
CREATE TABLE IF NOT EXISTS public.tender_sla_defaults (
  request_type text PRIMARY KEY,
  business_days integer NOT NULL CHECK (business_days > 0),
  escalation_after_days integer NOT NULL,
  description text
);

ALTER TABLE public.tender_sla_defaults ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated read sla defaults"
  ON public.tender_sla_defaults FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins manage sla defaults"
  ON public.tender_sla_defaults FOR ALL
  USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true);

INSERT INTO public.tender_sla_defaults (request_type, business_days, escalation_after_days, description) VALUES
  ('budget_approval', 3, 5, 'אישור תקציבי מתקציבן המערך'),
  ('olma_approval', 7, 10, 'אישור אלמ"ה למכרזים מעל 5M'),
  ('committee_outbound', 14, 21, 'דיון ועדת מכרזים — יציאה לתיחור'),
  ('professional_review', 3, 5, 'בדיקת גורם מקצועי במינהל הרכש'),
  ('committee_winner', 14, 21, 'דיון ועדת מכרזים — אישור זוכה'),
  ('contract_signature', 10, 15, 'חתימת ספק על הסכם'),
  ('guarantee_verification', 3, 5, 'בדיקת ערבות'),
  ('insurance_verification', 3, 5, 'בדיקת ביטוח'),
  ('invoice_approval', 7, 10, 'אישור חשבונית לתשלום'),
  ('milestone_acceptance', 5, 7, 'בדיקת תוצרים ואישור אבן דרך'),
  ('vendor_evaluation', 7, 14, 'הערכת ספק'),
  ('other', 7, 10, 'אישור גנרי')
ON CONFLICT (request_type) DO UPDATE SET
  business_days = EXCLUDED.business_days,
  escalation_after_days = EXCLUDED.escalation_after_days,
  description = EXCLUDED.description;

-- =====================================================
-- 2. Trigger: auto-create SLA event when approval_request inserted
-- =====================================================
-- Note: due_at uses calendar days as fallback. Callers can pre-compute
-- business-day-accurate due_at in TS (via lib/slaCalc.ts) and pass it
-- explicitly in the INSERT; the trigger respects an existing sla_due_at.
CREATE OR REPLACE FUNCTION public.tender_trg_create_sla_on_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_days integer;
  v_due_at timestamptz;
BEGIN
  -- If caller already set sla_due_at, use it. Otherwise compute from defaults.
  IF NEW.sla_due_at IS NOT NULL THEN
    v_due_at := NEW.sla_due_at;
  ELSE
    SELECT business_days INTO v_days
    FROM public.tender_sla_defaults
    WHERE request_type = NEW.request_type;
    IF v_days IS NULL THEN v_days := 7; END IF;
    v_due_at := now() + (v_days || ' days')::interval;
    -- Backfill the column so UI can show countdown
    UPDATE public.tender_approval_requests SET sla_due_at = v_due_at WHERE id = NEW.id;
  END IF;

  INSERT INTO public.tender_sla_events (
    tender_id, entity_type, entity_id, sla_type, due_at, status
  ) VALUES (
    NEW.tender_id, 'approval_request', NEW.id, NEW.request_type, v_due_at, 'active'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tender_approvals_create_sla ON public.tender_approval_requests;
CREATE TRIGGER tender_approvals_create_sla
  AFTER INSERT ON public.tender_approval_requests
  FOR EACH ROW EXECUTE FUNCTION public.tender_trg_create_sla_on_approval();

-- Internal — only callable from trigger
REVOKE EXECUTE ON FUNCTION public.tender_trg_create_sla_on_approval() FROM PUBLIC, anon, authenticated;

-- =====================================================
-- 3. Trigger: auto-resolve SLA when approval is decided
-- =====================================================
-- (tender_approval_decide RPC already does this; this trigger covers
-- direct UPDATEs by admin or future code paths.)
CREATE OR REPLACE FUNCTION public.tender_trg_resolve_sla_on_decision()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only act on status transitions from pending/in_review to decided
  IF OLD.status IN ('pending', 'in_review')
     AND NEW.status IN ('approved', 'rejected', 'returned', 'cancelled') THEN
    UPDATE public.tender_sla_events
    SET status = 'resolved', resolved_at = now()
    WHERE entity_type = 'approval_request'
      AND entity_id = NEW.id
      AND status = 'active';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tender_approvals_resolve_sla ON public.tender_approval_requests;
CREATE TRIGGER tender_approvals_resolve_sla
  AFTER UPDATE OF status ON public.tender_approval_requests
  FOR EACH ROW EXECUTE FUNCTION public.tender_trg_resolve_sla_on_decision();

REVOKE EXECUTE ON FUNCTION public.tender_trg_resolve_sla_on_decision() FROM PUBLIC, anon, authenticated;

-- =====================================================
-- 4. Trigger: auto-audit on contract signature_status changes
-- =====================================================
CREATE OR REPLACE FUNCTION public.tender_trg_audit_contract_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.signature_status IS DISTINCT FROM NEW.signature_status THEN
    INSERT INTO public.tender_audit_log
      (tender_id, entity_type, entity_id, action, actor_id, before_state, after_state, notes)
    VALUES
      (NEW.tender_id, 'contract', NEW.id, 'signature_status_change', auth.uid(),
       jsonb_build_object('signature_status', OLD.signature_status),
       jsonb_build_object('signature_status', NEW.signature_status),
       NULL);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tender_contracts_audit_status ON public.tender_contracts;
CREATE TRIGGER tender_contracts_audit_status
  AFTER UPDATE OF signature_status ON public.tender_contracts
  FOR EACH ROW EXECUTE FUNCTION public.tender_trg_audit_contract_status();

REVOKE EXECUTE ON FUNCTION public.tender_trg_audit_contract_status() FROM PUBLIC, anon, authenticated;

-- =====================================================
-- 5. Trigger: auto-audit on guarantee status changes
-- =====================================================
CREATE OR REPLACE FUNCTION public.tender_trg_audit_guarantee_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tender_id uuid;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT tender_id INTO v_tender_id FROM public.tender_contracts WHERE id = NEW.contract_id;
    INSERT INTO public.tender_audit_log
      (tender_id, entity_type, entity_id, action, actor_id, before_state, after_state, notes)
    VALUES
      (v_tender_id, 'guarantee', NEW.id, 'status_change', auth.uid(),
       jsonb_build_object('status', OLD.status),
       jsonb_build_object('status', NEW.status),
       NULL);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tender_guarantees_audit_status ON public.tender_guarantees;
CREATE TRIGGER tender_guarantees_audit_status
  AFTER UPDATE OF status ON public.tender_guarantees
  FOR EACH ROW EXECUTE FUNCTION public.tender_trg_audit_guarantee_status();

REVOKE EXECUTE ON FUNCTION public.tender_trg_audit_guarantee_status() FROM PUBLIC, anon, authenticated;

-- =====================================================
-- 6. Trigger: auto-audit on milestone status changes
-- =====================================================
CREATE OR REPLACE FUNCTION public.tender_trg_audit_milestone_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.tender_audit_log
      (tender_id, entity_type, entity_id, action, actor_id, before_state, after_state, notes)
    VALUES
      (NEW.tender_id, 'milestone', NEW.id, 'status_change', auth.uid(),
       jsonb_build_object('status', OLD.status, 'sequence_no', NEW.sequence_no),
       jsonb_build_object('status', NEW.status),
       NULL);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tender_milestones_audit_status ON public.tender_milestones;
CREATE TRIGGER tender_milestones_audit_status
  AFTER UPDATE OF status ON public.tender_milestones
  FOR EACH ROW EXECUTE FUNCTION public.tender_trg_audit_milestone_status();

REVOKE EXECUTE ON FUNCTION public.tender_trg_audit_milestone_status() FROM PUBLIC, anon, authenticated;

-- =====================================================
-- 7. RPC: tender_check_sla_breaches — sweep for breached active SLAs
-- =====================================================
-- Called by a cron / Vercel function. Marks active SLAs whose due_at has
-- passed as 'breached', and escalates if escalation_after_days has elapsed.
CREATE OR REPLACE FUNCTION public.tender_check_sla_breaches()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_marked_breached integer := 0;
  v_escalated integer := 0;
BEGIN
  -- Only admins or service role can call
  IF NOT (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) THEN
    RAISE EXCEPTION 'Permission denied — admin only';
  END IF;

  UPDATE public.tender_sla_events
  SET status = 'breached', breached_at = now()
  WHERE status = 'active' AND due_at < now();
  GET DIAGNOSTICS v_marked_breached = ROW_COUNT;

  UPDATE public.tender_sla_events sla
  SET status = 'escalated', escalated_at = now()
  FROM public.tender_sla_defaults def
  WHERE sla.status = 'breached'
    AND sla.escalated_at IS NULL
    AND sla.sla_type = def.request_type
    AND sla.due_at + (def.escalation_after_days || ' days')::interval < now();
  GET DIAGNOSTICS v_escalated = ROW_COUNT;

  RETURN jsonb_build_object(
    'marked_breached', v_marked_breached,
    'escalated', v_escalated,
    'checked_at', now()
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.tender_check_sla_breaches() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.tender_check_sla_breaches() TO authenticated;
