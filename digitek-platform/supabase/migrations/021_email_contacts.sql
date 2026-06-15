-- 021_email_contacts.sql
-- Shared email contacts pool (across all authenticated users).
-- Emails are auto-recorded when used in any form; autofill suggests from this pool.

CREATE TABLE IF NOT EXISTS public.email_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  display_name text,
  use_count integer NOT NULL DEFAULT 1,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  first_seen_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  last_used_at timestamptz NOT NULL DEFAULT now(),
  last_used_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS email_contacts_use_count_idx
  ON public.email_contacts (use_count DESC, last_used_at DESC);
CREATE INDEX IF NOT EXISTS email_contacts_email_ilike_idx
  ON public.email_contacts (lower(email) text_pattern_ops);

ALTER TABLE public.email_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth users can read contacts" ON public.email_contacts;
CREATE POLICY "auth users can read contacts" ON public.email_contacts
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "auth users can insert contacts" ON public.email_contacts;
CREATE POLICY "auth users can insert contacts" ON public.email_contacts
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth users can update contacts" ON public.email_contacts;
CREATE POLICY "auth users can update contacts" ON public.email_contacts
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admins can delete contacts" ON public.email_contacts;
CREATE POLICY "admins can delete contacts" ON public.email_contacts
  FOR DELETE TO authenticated USING (
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
  );

-- Atomic upsert: bumps use_count + refreshes last_used_*. Returns row id.
CREATE OR REPLACE FUNCTION public.record_email_contact(p_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_normalized text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_normalized := lower(trim(p_email));

  IF v_normalized = '' OR v_normalized !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    RAISE EXCEPTION 'Invalid email: %', p_email;
  END IF;

  INSERT INTO public.email_contacts (email, last_used_by, first_seen_by)
  VALUES (v_normalized, auth.uid(), auth.uid())
  ON CONFLICT (email) DO UPDATE
    SET use_count    = email_contacts.use_count + 1,
        last_used_at = now(),
        last_used_by = auth.uid()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_email_contact(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.record_email_contact(text) FROM anon;
GRANT  EXECUTE ON FUNCTION public.record_email_contact(text) TO authenticated;
