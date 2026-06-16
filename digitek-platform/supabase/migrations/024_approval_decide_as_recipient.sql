-- 024_approval_decide_as_recipient.sql
-- Inline approval: a logged-in user whose email is in metadata.recipients of
-- an approval request can decide it from inside LIBA, without needing the
-- email link / token. Same audit + state-guard logic as the token RPC.

CREATE OR REPLACE FUNCTION public.tender_approval_decide_as_recipient(
  p_request_id uuid,
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
  v_request public.tender_approval_requests%ROWTYPE;
  v_user_email text;
  v_recipients jsonb;
  v_match boolean := false;
  v_meta jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT email INTO v_user_email FROM auth.users WHERE id = auth.uid();
  IF v_user_email IS NULL OR length(trim(v_user_email)) = 0 THEN
    RAISE EXCEPTION 'No email recorded for current user';
  END IF;

  -- Lock the request row so concurrent decisions can't race past the
  -- state-guard.
  SELECT * INTO v_request FROM public.tender_approval_requests
   WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Approval request not found';
  END IF;
  IF v_request.decided_at IS NOT NULL
     OR v_request.status NOT IN ('pending', 'in_review') THEN
    RAISE EXCEPTION 'Approval request is no longer open (status=%)', v_request.status;
  END IF;
  IF p_decision NOT IN ('approved', 'rejected', 'returned') THEN
    RAISE EXCEPTION 'Invalid decision: %', p_decision;
  END IF;

  -- Verify the calling user is listed as a recipient (case-insensitive).
  v_recipients := COALESCE(v_request.metadata -> 'recipients', '[]'::jsonb);
  IF jsonb_typeof(v_recipients) = 'array' THEN
    SELECT EXISTS(
      SELECT 1 FROM jsonb_array_elements_text(v_recipients) AS r
      WHERE lower(trim(r)) = lower(trim(v_user_email))
    ) INTO v_match;
  END IF;
  IF NOT v_match THEN
    RAISE EXCEPTION 'Your email (%) is not authorised to decide this request', v_user_email;
  END IF;

  v_meta := jsonb_build_object(
    'signature_name',        p_signature_name,
    'signature_image_path',  p_signature_image_path,
    'attachment_paths',      p_attachment_paths,
    'decided_via_inline',    true,
    'decided_recipient',     lower(trim(v_user_email))
  );

  UPDATE public.tender_approval_requests
     SET status     = p_decision,
         decision   = p_decision,
         comments   = COALESCE(p_comments, comments),
         decided_at = now(),
         decided_by = auth.uid(),
         metadata   = COALESCE(metadata, '{}'::jsonb) || v_meta,
         updated_at = now()
   WHERE id = p_request_id;

  -- Burn any outstanding tokens for this request — once a decision is in,
  -- the email link should no longer let anyone act.
  UPDATE public.tender_approval_tokens
     SET used_at = now(), used_by = auth.uid()
   WHERE request_id = p_request_id AND used_at IS NULL;

  RETURN p_request_id;
END;
$func$;

REVOKE EXECUTE ON FUNCTION public.tender_approval_decide_as_recipient(uuid, text, text, text, text, text[]) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.tender_approval_decide_as_recipient(uuid, text, text, text, text, text[]) TO authenticated;
