-- 022_approval_tokens.sql
-- Single-use tokens that let an external (or internal) approver act on a
-- specific approval request via a tokenised public URL like
--   /approve/:request_id?t=<token>
-- without needing a LIBA login.
--
-- The token is stored in plaintext (random base32, ~192 bits entropy) since
-- (a) it's already an unguessable opaque string, (b) it has a 30-day expiry,
-- (c) it is single-use, and (d) the table is RLS-locked so no client can read
-- it. Hashing would add complexity without meaningful security benefit at our
-- scale and tier.

CREATE TABLE IF NOT EXISTS public.tender_approval_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.tender_approval_requests(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  recipient_email text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  used_at timestamptz,
  used_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS tender_approval_tokens_token_idx ON public.tender_approval_tokens(token);
CREATE INDEX IF NOT EXISTS tender_approval_tokens_request_idx ON public.tender_approval_tokens(request_id);

ALTER TABLE public.tender_approval_tokens ENABLE ROW LEVEL SECURITY;
-- No policies = direct access forbidden for all client roles. The RPCs below
-- run as SECURITY DEFINER and bypass RLS.

-- =====================================================
-- RPC: mint_approval_token
-- Returns plaintext token. Caller must own the tender or be admin.
-- =====================================================
CREATE OR REPLACE FUNCTION public.mint_approval_token(
  p_request_id uuid,
  p_recipient_email text
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token text;
  v_tender_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT tender_id INTO v_tender_id
  FROM public.tender_approval_requests
  WHERE id = p_request_id;

  IF v_tender_id IS NULL THEN
    RAISE EXCEPTION 'Approval request not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.tenders WHERE id = v_tender_id AND owner_id = auth.uid()
  ) AND NOT COALESCE((SELECT is_admin FROM public.profiles WHERE id = auth.uid()), false) THEN
    RAISE EXCEPTION 'Not authorized for this tender';
  END IF;

  -- 24 random bytes → 48 hex chars; URL-safe.
  v_token := encode(gen_random_bytes(24), 'hex');

  INSERT INTO public.tender_approval_tokens (request_id, token, recipient_email, created_by)
  VALUES (p_request_id, v_token, lower(trim(p_recipient_email)), auth.uid());

  RETURN v_token;
END;
$$;

-- =====================================================
-- RPC: redeem_approval_token
-- Public — any caller (incl. anon) can resolve a token to its request snapshot.
-- Returns the request details + token state. Does NOT mark used.
-- =====================================================
CREATE OR REPLACE FUNCTION public.redeem_approval_token(p_token text)
RETURNS TABLE (
  request_id        uuid,
  tender_id         uuid,
  tender_title      text,
  tender_number     text,
  request_type      text,
  status            text,
  requested_role    text,
  sla_due_at        timestamptz,
  metadata          jsonb,
  recipient_email   text,
  is_used           boolean,
  is_expired        boolean,
  used_at           timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    tar.id                            AS request_id,
    tar.tender_id                     AS tender_id,
    t.title                           AS tender_title,
    t.tender_number                   AS tender_number,
    tar.request_type                  AS request_type,
    tar.status                        AS status,
    tar.requested_role                AS requested_role,
    tar.sla_due_at                    AS sla_due_at,
    tar.metadata                      AS metadata,
    tat.recipient_email               AS recipient_email,
    (tat.used_at IS NOT NULL)         AS is_used,
    (tat.expires_at < now())          AS is_expired,
    tat.used_at                       AS used_at
  FROM public.tender_approval_tokens tat
  JOIN public.tender_approval_requests tar ON tar.id = tat.request_id
  JOIN public.tenders t ON t.id = tar.tender_id
  WHERE tat.token = p_token;
END;
$$;

-- =====================================================
-- RPC: tender_approval_decide_by_token
-- Decides an approval request using a token instead of user identity.
-- Stores signature data in the request metadata. Marks token as used.
-- =====================================================
CREATE OR REPLACE FUNCTION public.tender_approval_decide_by_token(
  p_token text,
  p_decision text,
  p_comments text DEFAULT NULL,
  p_signature_name text DEFAULT NULL,
  p_signature_image_path text DEFAULT NULL,
  p_attachment_paths text[] DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token_row public.tender_approval_tokens%ROWTYPE;
  v_request_id uuid;
  v_meta jsonb;
BEGIN
  SELECT * INTO v_token_row FROM public.tender_approval_tokens WHERE token = p_token;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid token';
  END IF;
  IF v_token_row.used_at IS NOT NULL THEN
    RAISE EXCEPTION 'Token already used';
  END IF;
  IF v_token_row.expires_at < now() THEN
    RAISE EXCEPTION 'Token expired';
  END IF;
  IF p_decision NOT IN ('approved', 'rejected', 'returned') THEN
    RAISE EXCEPTION 'Invalid decision: %', p_decision;
  END IF;

  v_request_id := v_token_row.request_id;
  v_meta := jsonb_build_object(
    'signature_name',         p_signature_name,
    'signature_image_path',   p_signature_image_path,
    'attachment_paths',       p_attachment_paths,
    'decided_via_token',      true,
    'decided_token_id',       v_token_row.id,
    'decided_recipient',      v_token_row.recipient_email
  );

  UPDATE public.tender_approval_requests
  SET status     = p_decision,
      decision   = p_decision,
      comments   = COALESCE(p_comments, comments),
      decided_at = now(),
      metadata   = COALESCE(metadata, '{}'::jsonb) || v_meta,
      updated_at = now()
  WHERE id = v_request_id;

  UPDATE public.tender_approval_tokens
  SET used_at = now(),
      used_by = auth.uid()
  WHERE id = v_token_row.id;

  RETURN v_request_id;
END;
$$;

-- Grants — redeem & decide must be reachable by anon (external approvers).
REVOKE EXECUTE ON FUNCTION public.mint_approval_token(uuid, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.mint_approval_token(uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.redeem_approval_token(text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.redeem_approval_token(text) TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.tender_approval_decide_by_token(text, text, text, text, text, text[]) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.tender_approval_decide_by_token(text, text, text, text, text, text[]) TO anon, authenticated;
