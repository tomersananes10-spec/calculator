-- 025_document_versions.sql
-- Versioning workflow for tender_documents.
--
-- Versions live as separate rows in tender_documents linked via
-- metadata.approval_request_id (already in use) + a new
-- metadata.parent_version_id field. Per-version state is tracked in
-- metadata.version_status: pending_review | revision_requested | approved | rejected.
--
-- This migration adds two RPCs:
--   tender_document_request_revision — approver asks uploader to revise the
--     latest version. Marks the document as revision_requested with a comment.
--     Keeps the parent approval_request open in 'pending' so a new version
--     can be uploaded against it.
--   tender_document_upload_version — records a new version row pointing
--     to its parent. The file itself is uploaded by the client to Storage;
--     this RPC just records the row with the correct linkage + state.

CREATE OR REPLACE FUNCTION public.tender_document_request_revision(
  p_document_id uuid,
  p_comment text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  v_doc public.tender_documents%ROWTYPE;
  v_request public.tender_approval_requests%ROWTYPE;
  v_user_email text;
  v_recipients jsonb;
  v_match boolean := false;
  v_request_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT email INTO v_user_email FROM auth.users WHERE id = auth.uid();

  SELECT * INTO v_doc FROM public.tender_documents WHERE id = p_document_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Document not found';
  END IF;

  v_request_id := (v_doc.metadata ->> 'approval_request_id')::uuid;
  IF v_request_id IS NULL THEN
    RAISE EXCEPTION 'Document is not linked to an approval request';
  END IF;

  -- Lock the parent approval request and verify it's still open + caller is
  -- listed as a recipient (case-insensitive).
  SELECT * INTO v_request FROM public.tender_approval_requests
    WHERE id = v_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Linked approval request not found';
  END IF;
  IF v_request.decided_at IS NOT NULL
     OR v_request.status NOT IN ('pending', 'in_review') THEN
    RAISE EXCEPTION 'Approval request is no longer open (status=%)', v_request.status;
  END IF;

  v_recipients := COALESCE(v_request.metadata -> 'recipients', '[]'::jsonb);
  IF jsonb_typeof(v_recipients) = 'array' THEN
    SELECT EXISTS(
      SELECT 1 FROM jsonb_array_elements_text(v_recipients) AS r
      WHERE lower(trim(r)) = lower(trim(v_user_email))
    ) INTO v_match;
  END IF;
  IF NOT v_match THEN
    RAISE EXCEPTION 'Your email (%) is not authorised on this request', v_user_email;
  END IF;

  -- Stamp the document with revision_requested + comment + audit trail.
  UPDATE public.tender_documents
     SET metadata = COALESCE(metadata, '{}'::jsonb)
                    || jsonb_build_object(
                         'version_status',      'revision_requested',
                         'revision_comment',    p_comment,
                         'revision_requested_by_email', lower(trim(v_user_email)),
                         'revision_requested_at',       now()
                       )
   WHERE id = p_document_id;

  RETURN p_document_id;
END;
$func$;

REVOKE EXECUTE ON FUNCTION public.tender_document_request_revision(uuid, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.tender_document_request_revision(uuid, text) TO authenticated;


-- tender_document_upload_version: record a new version row. The file itself
-- is uploaded to Storage by the client; this RPC just creates the linked row.
-- Authorises: caller is owner of the tender, admin, OR is a recipient of the
-- linked approval request (so the uploader can be anyone authorised in context).
CREATE OR REPLACE FUNCTION public.tender_document_upload_version(
  p_request_id uuid,
  p_parent_document_id uuid,
  p_title text,
  p_file_ref text,
  p_file_size_bytes bigint,
  p_mime_type text,
  p_comment text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  v_request public.tender_approval_requests%ROWTYPE;
  v_parent  public.tender_documents%ROWTYPE;
  v_user_email text;
  v_recipients jsonb;
  v_match boolean := false;
  v_tender public.tenders%ROWTYPE;
  v_is_owner boolean := false;
  v_is_admin boolean := false;
  v_new_id uuid;
  v_next_version integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT email INTO v_user_email FROM auth.users WHERE id = auth.uid();

  SELECT * INTO v_request FROM public.tender_approval_requests WHERE id = p_request_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Approval request not found';
  END IF;
  IF v_request.decided_at IS NOT NULL
     OR v_request.status NOT IN ('pending', 'in_review') THEN
    RAISE EXCEPTION 'Cannot add versions — request is no longer open (%)', v_request.status;
  END IF;

  -- Authorisation: owner / admin / recipient.
  SELECT * INTO v_tender FROM public.tenders WHERE id = v_request.tender_id;
  v_is_owner := (v_tender.owner_id = auth.uid());
  v_is_admin := COALESCE((SELECT is_admin FROM public.profiles WHERE id = auth.uid()), false);

  IF NOT v_is_owner AND NOT v_is_admin THEN
    v_recipients := COALESCE(v_request.metadata -> 'recipients', '[]'::jsonb);
    IF jsonb_typeof(v_recipients) = 'array' THEN
      SELECT EXISTS(
        SELECT 1 FROM jsonb_array_elements_text(v_recipients) AS r
        WHERE lower(trim(r)) = lower(trim(v_user_email))
      ) INTO v_match;
    END IF;
    IF NOT v_match THEN
      RAISE EXCEPTION 'Not authorised to upload versions for this request';
    END IF;
  END IF;

  -- Compute next version number (max(version) + 1 among siblings).
  SELECT COALESCE(MAX(version), 0) + 1 INTO v_next_version
    FROM public.tender_documents
   WHERE tender_id = v_request.tender_id
     AND metadata->>'approval_request_id' = p_request_id::text;

  -- If we have a parent — its previous status becomes 'superseded' (so the
  -- table can render a clean "current version" highlight).
  IF p_parent_document_id IS NOT NULL THEN
    SELECT * INTO v_parent FROM public.tender_documents WHERE id = p_parent_document_id;
    IF FOUND THEN
      UPDATE public.tender_documents
         SET metadata = COALESCE(metadata, '{}'::jsonb)
                        || jsonb_build_object('version_status', 'superseded')
       WHERE id = p_parent_document_id;
    END IF;
  END IF;

  INSERT INTO public.tender_documents (
    tender_id, doc_type, title, version, file_ref, file_size_bytes, mime_type,
    author_id, metadata
  ) VALUES (
    v_request.tender_id,
    CASE v_request.request_type
      WHEN 'budget_approval'      THEN 'budget_approval'
      WHEN 'olma_approval'        THEN 'olma_approval'
      WHEN 'professional_review'  THEN 'other'
      WHEN 'committee_outbound'   THEN 'committee_request'
      WHEN 'committee_winner'     THEN 'committee_request'
      ELSE 'other'
    END,
    p_title,
    v_next_version,
    p_file_ref,
    p_file_size_bytes,
    p_mime_type,
    auth.uid(),
    jsonb_build_object(
      'approval_request_id', p_request_id,
      'parent_version_id',   p_parent_document_id,
      'version_status',      'pending_review',
      'version_comment',     p_comment,
      'uploaded_by_email',   lower(trim(coalesce(v_user_email, '')))
    )
  )
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$func$;

REVOKE EXECUTE ON FUNCTION public.tender_document_upload_version(uuid, uuid, text, text, bigint, text, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.tender_document_upload_version(uuid, uuid, text, text, bigint, text, text) TO authenticated;
