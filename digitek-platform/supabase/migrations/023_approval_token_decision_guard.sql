-- 023_approval_token_decision_guard.sql
-- Closes a decision-overwrite race in tender_approval_decide_by_token: the previous
-- version only verified that the token row was unused, so a sibling recipient's
-- token (still pending) could overwrite a request that another recipient had
-- already decided. Add a request-state precondition + invalidate every sibling
-- token for the same request once one decision is recorded.

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
AS $func$
DECLARE
  v_token_row public.tender_approval_tokens%ROWTYPE;
  v_request_id uuid;
  v_request_status text;
  v_request_decided_at timestamptz;
  v_meta jsonb;
BEGIN
  -- 1. Validate the token itself.
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

  -- 2. Verify the request itself is still decidable. Lock the row so concurrent
  --    token decisions can't both pass this check.
  SELECT status, decided_at
    INTO v_request_status, v_request_decided_at
    FROM public.tender_approval_requests
    WHERE id = v_request_id
    FOR UPDATE;

  IF v_request_status IS NULL THEN
    RAISE EXCEPTION 'Approval request not found';
  END IF;
  IF v_request_decided_at IS NOT NULL OR v_request_status NOT IN ('pending', 'in_review') THEN
    RAISE EXCEPTION 'Approval request is no longer open (status=%)', v_request_status;
  END IF;

  v_meta := jsonb_build_object(
    'signature_name',         p_signature_name,
    'signature_image_path',   p_signature_image_path,
    'attachment_paths',       p_attachment_paths,
    'decided_via_token',      true,
    'decided_token_id',       v_token_row.id,
    'decided_recipient',      v_token_row.recipient_email
  );

  -- 3. Record the decision.
  UPDATE public.tender_approval_requests
  SET status     = p_decision,
      decision   = p_decision,
      comments   = COALESCE(p_comments, comments),
      decided_at = now(),
      metadata   = COALESCE(metadata, '{}'::jsonb) || v_meta,
      updated_at = now()
  WHERE id = v_request_id;

  -- 4. Mark THIS token as used.
  UPDATE public.tender_approval_tokens
  SET used_at = now(),
      used_by = auth.uid()
  WHERE id = v_token_row.id;

  -- 5. Burn every sibling token for the same request so they cannot be replayed
  --    against the now-closed request. Recipients clicking after the fact will
  --    see the "already used" notice.
  UPDATE public.tender_approval_tokens
  SET used_at = now()
  WHERE request_id = v_request_id
    AND id <> v_token_row.id
    AND used_at IS NULL;

  RETURN v_request_id;
END;
$func$;

REVOKE EXECUTE ON FUNCTION public.tender_approval_decide_by_token(text, text, text, text, text, text[]) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.tender_approval_decide_by_token(text, text, text, text, text, text[]) TO anon, authenticated;
