-- 033 — עדכון decide_* RPCs לתמיכה ב-multi-signer (AND)
--
-- אחרי 032 שיצר את tender_approval_signatures + helpers, כאן 2 ה-RPCs
-- שמטפלים בהחלטה (token-based ו-inline) עודכנו להשתמש ב-flow החדש:
-- 1. אם יש שורות signatures לבקשה — כל החלטה נרשמת ב-signatures row,
--    הסטטוס של ה-parent נגזר אגרגטיבית (AND).
-- 2. אם אין שורות — fallback להתנהגות הישנה (single decision מסיים מיד).

-- ───────── tender_approval_decide_by_token ─────────
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
  v_token public.tender_approval_tokens%ROWTYPE;
  v_request public.tender_approval_requests%ROWTYPE;
  v_meta jsonb;
  v_has_signatures boolean;
  v_aggregate text;
BEGIN
  SELECT * INTO v_token FROM public.tender_approval_tokens
   WHERE token = p_token FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Token not found';
  END IF;
  IF v_token.used_at IS NOT NULL THEN
    RAISE EXCEPTION 'Token already used';
  END IF;
  IF v_token.expires_at < now() THEN
    RAISE EXCEPTION 'Token expired';
  END IF;
  IF p_decision NOT IN ('approved', 'rejected', 'returned') THEN
    RAISE EXCEPTION 'Invalid decision: %', p_decision;
  END IF;

  SELECT * INTO v_request FROM public.tender_approval_requests
   WHERE id = v_token.request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Approval request not found';
  END IF;
  IF v_request.decided_at IS NOT NULL
     OR v_request.status NOT IN ('pending', 'in_review') THEN
    RAISE EXCEPTION 'Approval request is no longer open (status=%)', v_request.status;
  END IF;

  -- בדיקה: יש שורות signatures? (multi-signer mode)
  SELECT EXISTS(
    SELECT 1 FROM public.tender_approval_signatures WHERE request_id = v_request.id
  ) INTO v_has_signatures;

  IF v_has_signatures THEN
    -- ───── Multi-signer flow ─────
    -- רישום ההחלטה של החותם הספציפי. אם המייל לא ברשימת החותמים — שגיאה.
    v_aggregate := public._tender_record_signature_decision(
      v_request.id,
      v_token.recipient_email,
      p_decision,
      p_comments,
      p_signature_name,
      p_signature_image_path,
      p_attachment_paths
    );

    -- סימון הטוקן כמומש — תמיד, גם אם עוד חותמים נדרשים.
    UPDATE public.tender_approval_tokens
       SET used_at = now()
     WHERE token = p_token;

    -- אם הסטטוס המצרפי עוד pending → ה-parent לא נסגר.
    IF v_aggregate = 'pending' THEN
      RETURN v_request.id;
    END IF;

    -- אגרגציה סופית → עדכון ה-parent.
    UPDATE public.tender_approval_requests
       SET status = v_aggregate,
           decided_at = now(),
           decision = v_aggregate,
           comments = p_comments,
           metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
             'final_decided_via', 'multi_signer_aggregate',
             'final_decided_by', v_token.recipient_email
           )
     WHERE id = v_request.id;
    RETURN v_request.id;
  END IF;

  -- ───── Legacy single-signer flow (ללא שינוי מהמקור) ─────
  v_meta := jsonb_build_object(
    'signature_name',        p_signature_name,
    'signature_image_path',  p_signature_image_path,
    'attachment_paths',      p_attachment_paths,
    'decided_via_token',     true,
    'decided_recipient',     lower(trim(v_token.recipient_email))
  );

  UPDATE public.tender_approval_requests
     SET status = p_decision,
         decided_at = now(),
         decision = p_decision,
         comments = p_comments,
         metadata = COALESCE(metadata, '{}'::jsonb) || v_meta
   WHERE id = v_request.id;

  -- סימון הטוקן + כל הטוקנים האחרים של אותה בקשה.
  UPDATE public.tender_approval_tokens
     SET used_at = now()
   WHERE request_id = v_request.id AND used_at IS NULL;

  -- רישום קבצים מצורפים כגרסאות tender_documents (אם returned + יש קבצים)
  IF p_decision = 'returned' AND p_attachment_paths IS NOT NULL
     AND array_length(p_attachment_paths, 1) > 0 THEN
    PERFORM public._tender_register_approver_attachments(
      v_request.id, p_attachment_paths, lower(trim(v_token.recipient_email)),
      p_comments, p_signature_name
    );
  END IF;

  RETURN v_request.id;
END;
$func$;

REVOKE EXECUTE ON FUNCTION public.tender_approval_decide_by_token(text, text, text, text, text, text[]) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.tender_approval_decide_by_token(text, text, text, text, text, text[]) TO anon, authenticated;

-- ───────── tender_approval_decide_as_recipient ─────────
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
  v_has_signatures boolean;
  v_aggregate text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT email INTO v_user_email FROM auth.users WHERE id = auth.uid();
  IF v_user_email IS NULL OR length(trim(v_user_email)) = 0 THEN
    RAISE EXCEPTION 'No email recorded for current user';
  END IF;

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

  -- בדיקה: יש שורות signatures?
  SELECT EXISTS(
    SELECT 1 FROM public.tender_approval_signatures WHERE request_id = v_request.id
  ) INTO v_has_signatures;

  IF v_has_signatures THEN
    -- ───── Multi-signer flow ─────
    -- _tender_record_signature_decision כבר מוודא שהמייל ברשימה.
    v_aggregate := public._tender_record_signature_decision(
      v_request.id,
      v_user_email,
      p_decision,
      p_comments,
      p_signature_name,
      p_signature_image_path,
      p_attachment_paths
    );

    IF v_aggregate = 'pending' THEN
      RETURN v_request.id;
    END IF;

    UPDATE public.tender_approval_requests
       SET status = v_aggregate,
           decided_at = now(),
           decision = v_aggregate,
           comments = p_comments,
           metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
             'final_decided_via', 'multi_signer_aggregate',
             'final_decided_by', lower(trim(v_user_email))
           )
     WHERE id = v_request.id;
    RETURN v_request.id;
  END IF;

  -- ───── Legacy single-signer flow ─────
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
     SET status = p_decision,
         decided_at = now(),
         decision = p_decision,
         comments = p_comments,
         metadata = COALESCE(metadata, '{}'::jsonb) || v_meta
   WHERE id = p_request_id;

  UPDATE public.tender_approval_tokens
     SET used_at = now()
   WHERE request_id = p_request_id AND used_at IS NULL;

  IF p_decision = 'returned' AND p_attachment_paths IS NOT NULL
     AND array_length(p_attachment_paths, 1) > 0 THEN
    PERFORM public._tender_register_approver_attachments(
      p_request_id, p_attachment_paths, lower(trim(v_user_email)),
      p_comments, p_signature_name
    );
  END IF;

  RETURN p_request_id;
END;
$func$;

REVOKE EXECUTE ON FUNCTION public.tender_approval_decide_as_recipient(uuid, text, text, text, text, text[]) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.tender_approval_decide_as_recipient(uuid, text, text, text, text, text[]) TO authenticated;
