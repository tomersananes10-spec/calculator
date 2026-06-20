-- 030_tender_signers_hardening.sql
-- Defense-in-depth hardening of tender_signers:
-- 1. RLS policy expanded with WITH CHECK to match USING
-- 2. Anti-cycle CHECK on replaces_id to prevent self-references

-- 1. Replace policy to add WITH CHECK
DROP POLICY IF EXISTS "Owner + admin manage signers" ON public.tender_signers;

CREATE POLICY "Owner + admin manage signers"
  ON public.tender_signers FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.tenders t WHERE t.id = tender_id AND t.owner_id = auth.uid())
    OR (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.tenders t WHERE t.id = tender_id AND t.owner_id = auth.uid())
    OR (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
  );

-- 2. Anti-cycle CHECK on replaces_id
ALTER TABLE public.tender_signers
  ADD CONSTRAINT tender_signers_no_self_cycle
  CHECK (replaces_id IS NULL OR replaces_id <> id);
