-- 031_approver_attachments_as_versions.sql
-- When the approver returns a request for revisions and uploads files,
-- register each uploaded file as a new tender_documents version chained
-- from the brief writer's original v1. This lets the brief writer see
-- the approver's edited file in the resubmit modal (it appears via the
-- existing previousDocs filter on approval_request_id).

-- Internal helper: insert approver attachments as new tender_documents
-- versions. Called only from the two decide RPCs.
CREATE OR REPLACE FUNCTION public._tender_register_approver_attachments(
  p_request_id uuid,
  p_attachment_paths text[],
  p_approver_email text,
  p_comments text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  v_parent_id uuid;
  v_parent_tender uuid;
  v_parent_doc_type text;
  v_parent_version int;
  v_path text;
  v_filename text;
  v_new_id uuid;
BEGIN
  IF p_attachment_paths IS NULL OR array_length(p_attachment_paths, 1) IS NULL THEN
    RETURN;
  END IF;

  -- Find the most recent existing version for this approval request.
  SELECT id, tender_id, doc_type, version
    INTO v_parent_id, v_parent_tender, v_parent_doc_type, v_parent_version
    FROM public.tender_documents
   WHERE (metadata->>'approval_request_id')::uuid = p_request_id
   ORDER BY version DESC
   LIMIT 1;

  IF NOT FOUND THEN
    -- No prior document for this approval request — nothing to chain from.
    -- The attachment_paths are still in tender_approval_requests.metadata as fallback.
    RETURN;
  END IF;

  -- Mark the current latest as superseded.
  UPDATE public.tender_documents
     SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('version_status', 'superseded')
   WHERE id = v_parent_id;

  -- Insert each attachment as a new version. Multiple attachments chain sequentially.
  FOREACH v_path IN ARRAY p_attachment_paths LOOP
    v_filename := regexp_replace(v_path, '^.*/', '');
    IF v_filename = '' OR v_filename IS NULL THEN
      v_filename := 'attachment';
    END IF;

    v_parent_version := v_parent_version + 1;

    INSERT INTO public.tender_documents (
      tender_id, doc_type, title, version, file_ref, author_id, metadata
    ) VALUES (
      v_parent_tender,
      v_parent_doc_type,
      v_filename,
      v_parent_version,
      v_path,
      NULL,
      jsonb_build_object(
        'approval_request_id', p_request_id,
        'parent_version_id',   v_parent_id,
        'version_status',      'revision_requested',
        'uploaded_by_email',   p_approver_email,
        'revision_comment',    p_comments,
        'source',              'approver_returned'
      )
    ) RETURNING id INTO v_new_id;

    -- Subsequent attachments chain from the one we just inserted.
    v_parent_id := v_new_id;
  END LOOP;
END;
$func$;

REVOKE EXECUTE ON FUNCTION public._tender_register_approver_attachments(uuid, text[], text, text)
  FROM PUBLIC, anon, authenticated;

-- Rewrite tender_approval_decide_by_token: same as 023 + call helper at end when decision='returned'.
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
  SELECT * INTO v_token_row FROM public.tender_approval_tokens WHERE token = p_token;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invalid token'; END IF;
  IF v_token_row.used_at IS NOT NULL THEN RAISE EXCEPTION 'Token already used'; END IF;
  IF v_token_row.expires_at < now() THEN RAISE EXCEPTION 'Token expired'; END IF;
  IF p_decision NOT IN ('approved', 'rejected', 'returned') THEN
    RAISE EXCEPTION 'Invalid decision: %', p_decision;
  END IF;

  v_request_id := v_token_row.request_id;

  SELECT status, decided_at
    INTO v_request_status, v_request_decided_at
    FROM public.tender_approval_requests
    WHERE id = v_request_id FOR UPDATE;

  IF v_request_status IS NULL THEN RAISE EXCEPTION 'Approval request not found'; END IF;
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

  UPDATE public.tender_approval_requests
  SET status     = p_decision,
      decision   = p_decision,
      comments   = COALESCE(p_comments, comments),
      decided_at = now(),
      metadata   = COALESCE(metadata, '{}'::jsonb) || v_meta,
      updated_at = now()
  WHERE id = v_request_id;

  UPDATE public.tender_approval_tokens
  SET used_at = now(), used_by = auth.uid()
  WHERE id = v_token_row.id;

  UPDATE public.tender_approval_tokens
  SET used_at = now()
  WHERE request_id = v_request_id
    AND id <> v_token_row.id
    AND used_at IS NULL;

  -- NEW: register approver attachments as new tender_documents versions.
  IF p_decision = 'returned' THEN
    PERFORM public._tender_register_approver_attachments(
      v_request_id,
      p_attachment_paths,
      v_token_row.recipient_email,
      p_comments
    );
  END IF;

  RETURN v_request_id;
END;
$func$;

REVOKE EXECUTE ON FUNCTION public.tender_approval_decide_by_token(text, text, text, text, text, text[]) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.tender_approval_decide_by_token(text, text, text, text, text, text[]) TO anon, authenticated;


-- Rewrite tender_approval_decide_as_recipient: same as 024 + call helper at end.
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
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT email INTO v_user_email FROM auth.users WHERE id = auth.uid();
  IF v_user_email IS NULL OR length(trim(v_user_email)) = 0 THEN
    RAISE EXCEPTION 'No email recorded for current user';
  END IF;

  SELECT * INTO v_request FROM public.tender_approval_requests
   WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Approval request not found'; END IF;
  IF v_request.decided_at IS NOT NULL
     OR v_request.status NOT IN ('pending', 'in_review') THEN
    RAISE EXCEPTION 'Approval request is no longer open (status=%)', v_request.status;
  END IF;
  IF p_decision NOT IN ('approved', 'rejected', 'returned') THEN
    RAISE EXCEPTION 'Invalid decision: %', p_decision;
  END IF;

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

  UPDATE public.tender_approval_tokens
     SET used_at = now(), used_by = auth.uid()
   WHERE request_id = p_request_id AND used_at IS NULL;

  -- NEW: register approver attachments as new tender_documents versions.
  IF p_decision = 'returned' THEN
    PERFORM public._tender_register_approver_attachments(
      p_request_id,
      p_attachment_paths,
      lower(trim(v_user_email)),
      p_comments
    );
  END IF;

  RETURN p_request_id;
END;
$func$;

REVOKE EXECUTE ON FUNCTION public.tender_approval_decide_as_recipient(uuid, text, text, text, text, text[]) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.tender_approval_decide_as_recipient(uuid, text, text, text, text, text[]) TO authenticated;
