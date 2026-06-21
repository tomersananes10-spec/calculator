-- 034 — UNIQUE על signer_id במקום signer_email
-- בארגונים קטנים אדם אחד יכול לתפוס כמה תפקידים (לדוגמה: חשב + מנהלת ועדה).
-- ה-constraint הקודם UNIQUE(request_id, signer_email) חסם זאת ושבר את ה-insert.
-- מאפשרים כפילויות email — כשאדם אחד עם 2 תפקידים מקבל את הבקשה, ההחלטה
-- שלו תרשם על כל השורות עם המייל שלו במכה אחת ע"י helper שעודכן.

ALTER TABLE public.tender_approval_signatures
  DROP CONSTRAINT IF EXISTS tender_approval_signatures_request_id_signer_email_key;

CREATE UNIQUE INDEX IF NOT EXISTS tender_approval_signatures_request_signer_uq
  ON public.tender_approval_signatures(request_id, signer_id)
  WHERE signer_id IS NOT NULL;

-- helper מעדכן את כל השורות עם אותו מייל (אחד מחליט = כל התפקידים שלו נחתמים).
CREATE OR REPLACE FUNCTION public._tender_record_signature_decision(
  p_request_id uuid,
  p_signer_email text,
  p_decision text,
  p_comments text,
  p_signature_name text,
  p_signature_image_path text,
  p_attachment_paths text[]
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := lower(trim(p_signer_email));
  v_aggregate text;
  v_updated_count int;
BEGIN
  IF p_decision NOT IN ('approved', 'rejected', 'returned') THEN
    RAISE EXCEPTION 'Invalid decision: %', p_decision;
  END IF;

  UPDATE public.tender_approval_signatures
  SET status = p_decision,
      decision_comments = p_comments,
      signature_name = p_signature_name,
      signature_image_path = p_signature_image_path,
      attachment_paths = p_attachment_paths,
      decided_at = now()
  WHERE request_id = p_request_id
    AND lower(trim(signer_email)) = v_email
    AND status = 'pending';

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  IF v_updated_count = 0 THEN
    RAISE EXCEPTION 'No pending signature row for % on request %', v_email, p_request_id;
  END IF;

  v_aggregate := public._tender_aggregate_approval_status(p_request_id);
  RETURN v_aggregate;
END;
$$;
