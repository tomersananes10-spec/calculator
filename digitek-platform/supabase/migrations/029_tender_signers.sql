-- 029_tender_signers.sql
-- צוות מורשי חתימה פר-הליך עם versioning (החלפה שומרת היסטוריה).

-- 1. Table
CREATE TABLE public.tender_signers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id uuid NOT NULL REFERENCES public.tenders(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN (
    'budget_officer',
    'legal_professional',
    'treasurer',
    'signatory',
    'committee_head'
  )),
  display_name text NOT NULL CHECK (length(display_name) >= 2),
  email text NOT NULL CHECK (email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  added_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  added_at timestamptz NOT NULL DEFAULT now(),
  replaced_at timestamptz NULL,
  replaced_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  replaces_id uuid REFERENCES public.tender_signers(id) ON DELETE SET NULL,
  active boolean GENERATED ALWAYS AS (replaced_at IS NULL) STORED
);

CREATE UNIQUE INDEX tender_signers_one_active_per_role
  ON public.tender_signers (tender_id, role)
  WHERE replaced_at IS NULL;

CREATE INDEX tender_signers_tender_idx ON public.tender_signers (tender_id);

-- 2. RLS
ALTER TABLE public.tender_signers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signers visible to tender owner + admins"
  ON public.tender_signers FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.tenders t WHERE t.id = tender_id AND t.owner_id = auth.uid())
    OR (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
  );

CREATE POLICY "Owner + admin manage signers"
  ON public.tender_signers FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.tenders t WHERE t.id = tender_id AND t.owner_id = auth.uid())
    OR (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
  );

-- 3. RPC: assign
CREATE OR REPLACE FUNCTION public.tender_signer_assign(
  p_tender_id uuid,
  p_role text,
  p_name text,
  p_email text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  -- אימות הרשאה
  IF NOT EXISTS (
    SELECT 1 FROM public.tenders t
    WHERE t.id = p_tender_id
      AND (t.owner_id = auth.uid()
           OR (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true)
  ) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- בדיקה שאין כבר active לתפקיד הזה (partial unique index היה זורק שגיאה מעורפלת)
  IF EXISTS (
    SELECT 1 FROM public.tender_signers
    WHERE tender_id = p_tender_id AND role = p_role AND replaced_at IS NULL
  ) THEN
    RAISE EXCEPTION 'תפקיד % כבר מוגדר. השתמש בעדכון או החלפה.', p_role;
  END IF;

  INSERT INTO public.tender_signers (tender_id, role, display_name, email, added_by)
  VALUES (p_tender_id, p_role, p_name, lower(p_email), auth.uid())
  RETURNING id INTO v_id;

  PERFORM public.tender_audit_log_write(
    p_tender_id, 'signer', v_id, 'assigned',
    NULL,
    jsonb_build_object('role', p_role, 'name', p_name, 'email', lower(p_email)),
    NULL
  );

  RETURN v_id;
END;
$$;

-- 4. RPC: replace
CREATE OR REPLACE FUNCTION public.tender_signer_replace(
  p_old_id uuid,
  p_new_name text,
  p_new_email text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old public.tender_signers%ROWTYPE;
  v_new_id uuid;
BEGIN
  SELECT * INTO v_old FROM public.tender_signers WHERE id = p_old_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'מורשה חתימה לא נמצא';
  END IF;
  IF v_old.replaced_at IS NOT NULL THEN
    RAISE EXCEPTION 'מורשה החתימה כבר הוחלף';
  END IF;

  -- אימות הרשאה
  IF NOT EXISTS (
    SELECT 1 FROM public.tenders t
    WHERE t.id = v_old.tender_id
      AND (t.owner_id = auth.uid()
           OR (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true)
  ) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- סמן את הישן כ-replaced
  UPDATE public.tender_signers
  SET replaced_at = now(), replaced_by = auth.uid()
  WHERE id = p_old_id;

  -- צור חדש
  INSERT INTO public.tender_signers
    (tender_id, role, display_name, email, added_by, replaces_id)
  VALUES
    (v_old.tender_id, v_old.role, p_new_name, lower(p_new_email), auth.uid(), p_old_id)
  RETURNING id INTO v_new_id;

  PERFORM public.tender_audit_log_write(
    v_old.tender_id, 'signer', v_new_id, 'replaced',
    jsonb_build_object('old_name', v_old.display_name, 'old_email', v_old.email),
    jsonb_build_object('new_name', p_new_name, 'new_email', lower(p_new_email), 'role', v_old.role),
    NULL
  );

  RETURN v_new_id;
END;
$$;

-- 5. RPC: update (תיקון פרטים בלי גרסה חדשה)
CREATE OR REPLACE FUNCTION public.tender_signer_update(
  p_id uuid,
  p_name text,
  p_email text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_signer public.tender_signers%ROWTYPE;
BEGIN
  SELECT * INTO v_signer FROM public.tender_signers WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'מורשה חתימה לא נמצא';
  END IF;
  IF v_signer.replaced_at IS NOT NULL THEN
    RAISE EXCEPTION 'לא ניתן לערוך מורשה שכבר הוחלף';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.tenders t
    WHERE t.id = v_signer.tender_id
      AND (t.owner_id = auth.uid()
           OR (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true)
  ) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  UPDATE public.tender_signers
  SET display_name = p_name, email = lower(p_email)
  WHERE id = p_id;

  PERFORM public.tender_audit_log_write(
    v_signer.tender_id, 'signer', p_id, 'updated',
    jsonb_build_object('name', v_signer.display_name, 'email', v_signer.email),
    jsonb_build_object('name', p_name, 'email', lower(p_email)),
    NULL
  );
END;
$$;

-- 6. RPC: remove (סמן replaced בלי שורה מחליפה)
CREATE OR REPLACE FUNCTION public.tender_signer_remove(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_signer public.tender_signers%ROWTYPE;
BEGIN
  SELECT * INTO v_signer FROM public.tender_signers WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'מורשה חתימה לא נמצא';
  END IF;
  IF v_signer.replaced_at IS NOT NULL THEN
    RAISE EXCEPTION 'מורשה החתימה כבר אינו פעיל';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.tenders t
    WHERE t.id = v_signer.tender_id
      AND (t.owner_id = auth.uid()
           OR (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true)
  ) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  UPDATE public.tender_signers
  SET replaced_at = now(), replaced_by = auth.uid()
  WHERE id = p_id;

  PERFORM public.tender_audit_log_write(
    v_signer.tender_id, 'signer', p_id, 'removed',
    jsonb_build_object('role', v_signer.role, 'name', v_signer.display_name),
    NULL, NULL
  );
END;
$$;

-- 7. REVOKE/GRANT
REVOKE EXECUTE ON FUNCTION public.tender_signer_assign(uuid, text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.tender_signer_replace(uuid, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.tender_signer_update(uuid, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.tender_signer_remove(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.tender_signer_assign(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tender_signer_replace(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tender_signer_update(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tender_signer_remove(uuid) TO authenticated;
