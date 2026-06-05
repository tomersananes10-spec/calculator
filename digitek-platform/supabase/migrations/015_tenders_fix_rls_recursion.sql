-- =====================================================
-- Migration 015: Fix RLS infinite recursion on tenders ↔ tender_personas
-- =====================================================
-- Bug: SELECT on tenders triggered SELECT on tender_personas (via policy
-- "Participants and admins read tenders" from migration 011), which
-- triggered SELECT on tenders (via policy "Personas visible..."
-- from migration 006). Postgres detected the cycle and refused both.
--
-- Fix: introduce two SECURITY DEFINER helpers that bypass RLS, and have
-- each policy call its helper instead of doing a nested SELECT.

CREATE OR REPLACE FUNCTION public.tender_is_owner(p_tender_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenders
    WHERE id = p_tender_id AND owner_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.tender_is_participant(p_tender_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tender_personas
    WHERE tender_id = p_tender_id AND user_id = auth.uid() AND active = true
  );
$$;

-- Both helpers are called from RLS policies. They must be executable by
-- regular authenticated users but they themselves don't expose anything
-- the caller couldn't already learn from the policy outcome.
REVOKE EXECUTE ON FUNCTION public.tender_is_owner(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.tender_is_participant(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.tender_is_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tender_is_participant(uuid) TO authenticated;

-- =====================================================
-- Rebuild the two recursive policies using the helpers
-- =====================================================

DROP POLICY IF EXISTS "Participants and admins read tenders" ON public.tenders;
CREATE POLICY "Participants and admins read tenders"
  ON public.tenders FOR SELECT
  USING (
    owner_id = auth.uid()
    OR public.tender_is_participant(id)
    OR (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
  );

DROP POLICY IF EXISTS "Personas visible to tender owner + assigned user + admins" ON public.tender_personas;
CREATE POLICY "Personas visible to tender owner + assigned user + admins"
  ON public.tender_personas FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.tender_is_owner(tender_id)
    OR (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
  );
