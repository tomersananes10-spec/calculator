-- =====================================================
-- Migration 012: Tenders CRM — RPC Hardening
-- =====================================================
-- Addresses 2 findings from automated review of commit 001afe5:
--   1. tender_evaluate_gateway — read without auth check (MEDIUM, info disclosure)
--   2. EXECUTE granted to PUBLIC on all SECURITY DEFINER RPCs (HIGH suggestion)

-- =====================================================
-- 1. tender_evaluate_gateway — add auth gate
-- =====================================================
-- Previously read any tender. Now restricted to participants.
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
  IF NOT EXISTS (
    SELECT 1 FROM public.tenders t
    WHERE t.id = p_tender_id
      AND (
        t.owner_id = auth.uid()
        OR (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
        OR EXISTS (
          SELECT 1 FROM public.tender_personas tp
          WHERE tp.tender_id = p_tender_id AND tp.user_id = auth.uid() AND tp.active = true
        )
      )
  ) THEN
    RAISE EXCEPTION 'Permission denied on tender %', p_tender_id;
  END IF;

  SELECT * INTO v_tender FROM public.tenders WHERE id = p_tender_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tender % not found', p_tender_id;
  END IF;

  CASE p_gateway_code
    WHEN 'G1' THEN v_result := jsonb_build_object(
      'amount_band', v_tender.amount_band,
      'requires_olma', v_tender.estimated_amount > 5000000,
      'skip_committee', (v_tender.estimated_amount < 200000 AND v_tender.selection_type = 'price_only'),
      'is_simple_path', (v_tender.estimated_amount < 200000 AND v_tender.selection_type = 'price_only'));
    WHEN 'G2' THEN v_result := jsonb_build_object(
      'service_cluster', v_tender.service_cluster,
      'requires_tender_editor', v_tender.requires_tender_editor);
    WHEN 'G6' THEN v_result := jsonb_build_object(
      'selection_type', v_tender.selection_type,
      'needs_quality_committee', v_tender.selection_type = 'quality_price');
    WHEN 'G7' THEN v_result := jsonb_build_object(
      'requires_winner_committee', v_tender.estimated_amount >= 200000 OR v_tender.selection_type = 'quality_price');
    WHEN 'G9' THEN v_result := jsonb_build_object(
      'requires_guarantee', v_tender.estimated_amount > 1000000,
      'requires_insurance', v_tender.estimated_amount > 1000000,
      'amount_band', v_tender.amount_band);
    ELSE v_result := jsonb_build_object(
      'gateway', p_gateway_code,
      'note', 'Gateway evaluated client-side from tender state');
  END CASE;

  RETURN v_result;
END;
$$;

-- =====================================================
-- 2. Revoke PUBLIC, grant only to authenticated role
-- =====================================================
-- Default Postgres grants EXECUTE on functions to PUBLIC. For SECURITY DEFINER
-- functions this means any role (including anon when API is exposed) can call
-- them. Restrict to authenticated users only.

REVOKE EXECUTE ON FUNCTION public.tender_create(jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.tender_advance(uuid, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.tender_approval_decide(uuid, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.tender_committee_schedule(uuid, uuid, date) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.tender_evaluate_gateway(uuid, text) FROM PUBLIC;
-- audit_log_write is internal-only; revoke from PUBLIC, anon, AND authenticated
-- so it cannot be reached via PostgREST or any client role. It remains callable
-- from other SECURITY DEFINER functions (which run with the function owner's role).
REVOKE EXECUTE ON FUNCTION public.tender_audit_log_write(uuid, text, uuid, text, jsonb, jsonb, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tender_stats() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.tender_create(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tender_advance(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tender_approval_decide(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tender_committee_schedule(uuid, uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tender_evaluate_gateway(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tender_stats() TO authenticated;
-- tender_audit_log_write is internal — called only from other SECURITY DEFINER
-- functions, not exposed via PostgREST. No GRANT to authenticated.
